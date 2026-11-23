import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { enrich } from './score.js';
export class RadarStore {
  constructor(file = ':memory:') {
    if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS videos (
        id TEXT PRIMARY KEY, platform TEXT NOT NULL, external_id TEXT, url TEXT NOT NULL,
        posted_at TEXT NOT NULL, author TEXT, caption TEXT, thumbnail TEXT, market TEXT,
        followers INTEGER, first_seen_at TEXT NOT NULL, last_seen_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS snapshots (
        video_id TEXT NOT NULL REFERENCES videos(id), observed_at TEXT NOT NULL,
        views INTEGER NOT NULL, likes INTEGER NOT NULL, comments INTEGER NOT NULL, shares INTEGER NOT NULL,
        PRIMARY KEY(video_id, observed_at)
      );
      CREATE INDEX IF NOT EXISTS ix_snapshots_video_time ON snapshots(video_id,observed_at);
      CREATE TABLE IF NOT EXISTS runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT, started_at TEXT NOT NULL, completed_at TEXT,
        status TEXT NOT NULL, discovered INTEGER NOT NULL DEFAULT 0, error TEXT
      );
      CREATE TABLE IF NOT EXISTS insights (
        video_id TEXT PRIMARY KEY REFERENCES videos(id), analysis TEXT NOT NULL, created_at TEXT NOT NULL
      );`);
  }
  add(items, observedAt = new Date().toISOString()) {
    let accepted = 0;
    const stmt = this.db.prepare(`INSERT INTO videos(id,platform,external_id,url,posted_at,author,caption,thumbnail,market,followers,first_seen_at,last_seen_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
      author=excluded.author,caption=excluded.caption,thumbnail=COALESCE(excluded.thumbnail,videos.thumbnail),
      followers=CASE WHEN excluded.followers>0 THEN excluded.followers ELSE videos.followers END, last_seen_at=excluded.last_seen_at`);
    const snap = this.db.prepare(`INSERT OR REPLACE INTO snapshots(video_id,observed_at,views,likes,comments,shares) VALUES(?,?,?,?,?,?)`);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      for (const x of items) {
        if (!x?.id || !x.url || !x.postedAt || Date.parse(x.postedAt) > Date.parse(observedAt) + 3600000) continue;
        stmt.run(x.id,x.platform,x.externalId ?? null,x.url,x.postedAt,x.author ?? null,x.caption ?? null,x.thumbnail ?? null,x.market ?? null,x.followers ?? 0,observedAt,observedAt);
        snap.run(x.id,observedAt,x.views,x.likes,x.comments,x.shares);
        accepted++;
      }
      this.db.exec('COMMIT');
    } catch(e) { this.db.exec('ROLLBACK'); throw e; }
    return accepted;
  }
  list({mode='new24', platform='all', limit=100, now=new Date()}={}) {
    const rows = this.db.prepare(`SELECT *, (SELECT count(*) FROM snapshots s WHERE s.video_id=v.id) as observations FROM videos v ORDER BY last_seen_at DESC LIMIT 1000`).all();
    const load = this.db.prepare(`SELECT observed_at as observedAt,views,likes,comments,shares FROM snapshots WHERE video_id=? AND observed_at>=? ORDER BY observed_at`);
    const cutoff = new Date(now.getTime()-86400000).toISOString();
    return rows.map(r => {
      const snaps = load.all(r.id,cutoff);
      return enrich({id:r.id,platform:r.platform,url:r.url,externalId:r.external_id,postedAt:r.posted_at,author:r.author,
        caption:r.caption,thumbnail:r.thumbnail,market:r.market,followers:r.followers, views:snaps.at(-1)?.views??0,
        likes:snaps.at(-1)?.likes??0, comments:snaps.at(-1)?.comments??0, shares:snaps.at(-1)?.shares??0,
        observations:Number(r.observations)},snaps,now);
    }).filter(v=>(platform==='all'||v.platform===platform) && (mode==='all' || mode==='new24' && v.new24 || mode==='accelerated24' && v.accelerated24 || mode==='watchlist' && !v.new24)).sort((a,b)=> b.score-a.score).slice(0,Math.min(1000,Math.max(1,limit)));
  }
  trackedUrls(limit=30,now=new Date()) {
    const since=new Date(now.getTime()-8*86400000).toISOString();
    const rows=this.db.prepare('SELECT platform,url FROM videos WHERE posted_at>=? ORDER BY last_seen_at DESC LIMIT ?').all(since,limit);
    return { tiktok: rows.filter(r=>r.platform==='tiktok').map(r=>r.url),instagram: rows.filter(r=>r.platform==='instagram').map(r=>r.url) };
  }
  get(id) { return this.list({mode:'all',limit:1000}).find(v=>v.id===id) || null; }
  addRun(status, discovered=0, error=null, started=null) {
    const now = new Date().toISOString();
    this.db.prepare('INSERT INTO runs(started_at,completed_at,status,discovered,error) VALUES(?,?,?,?,?)').run(started||now,now,status,discovered,error);
  }
  lastRun() { return this.db.prepare('SELECT * FROM runs ORDER BY id DESC LIMIT 1').get()||null; }
  runsToday(now=new Date()) { return this.db.prepare('SELECT count(*) n FROM runs WHERE started_at>=?').get(new Date(now.getTime()-86400000).toISOString()).n; }
  counts(now=new Date()) { const all=this.list({mode:'all',limit:1000,now});return {total:all.length,new24:all.filter(v=>v.new24).length,accelerated24:all.filter(v=>v.accelerated24).length,tracked:all.filter(v=>v.observations>=2).length}; }
  snapshotHistory(id) {return this.db.prepare('SELECT observed_at as observedAt,views,likes,comments,shares FROM snapshots WHERE video_id=? ORDER BY observed_at DESC LIMIT 100').all(id).reverse();}
  getInsight(id) {return this.db.prepare('SELECT analysis,created_at as createdAt FROM insights WHERE video_id=?').get(id)||null;}
  saveInsight(id,analysis) {this.db.prepare('INSERT INTO insights(video_id,analysis,created_at) VALUES(?,?,?) ON CONFLICT(video_id) DO UPDATE SET analysis=excluded.analysis,created_at=excluded.created_at').run(id,analysis,new Date().toISOString());}
  close() {this.db.close();}
}
