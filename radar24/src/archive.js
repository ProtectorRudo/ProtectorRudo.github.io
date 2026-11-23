import { mkdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { dirname } from 'node:path';

// One dedicated PostgreSQL table stores a consistent SQLite snapshot so free
// Render web instances can restore their inventory after sleeping or restarting.
export class RadarArchive {
  constructor(dbPath, databaseUrl = '', poolFactory = null) {
    this.dbPath = dbPath;
    this.databaseUrl = databaseUrl;
    this.poolFactory = poolFactory;
    this.pool = null;
    this.ready = false;
    this.restored = false;
    this.lastError = null;
  }
  async connectAndRestore() {
    if (!this.databaseUrl) return false;
    try {
      const Pool = this.poolFactory || (await import('pg')).Pool;
      this.pool = new Pool({ connectionString: this.databaseUrl, max: 1, connectionTimeoutMillis: 8000, idleTimeoutMillis: 20000 });
      await this.pool.query(`CREATE TABLE IF NOT EXISTS viral_radar_archive (
        archive_id TEXT PRIMARY KEY, payload BYTEA NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
      const result = await this.pool.query('SELECT payload, updated_at FROM viral_radar_archive WHERE archive_id = $1', ['radar24']);
      const snapshot = result.rows[0];
      if (snapshot?.payload) {
        let localMtime = 0;
        try { localMtime = (await stat(this.dbPath)).mtimeMs; } catch { /* initial deployment */ }
        if (localMtime < new Date(snapshot.updated_at).getTime()) {
          await mkdir(dirname(this.dbPath), { recursive: true });
          await rm(this.dbPath + '-wal', { force: true });
          await rm(this.dbPath + '-shm', { force: true });
          await writeFile(this.dbPath, snapshot.payload);
          this.restored = true;
        }
      }
      this.ready = true;
      this.lastError = null;
      return true;
    } catch (e) {
      this.ready = false;
      this.lastError = e.code || e.name || 'connection_failed';
      console.error('Radar archive: unavailable (no credential values logged)', this.lastError);
      if (this.pool) { try { await this.pool.end(); } catch {} this.pool = null; }
      return false;
    }
  }
  async save(store) {
    if (!this.ready || !this.pool) return false;
    try {
      store.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
      const payload = await readFile(this.dbPath);
      await this.pool.query(`INSERT INTO viral_radar_archive(archive_id,payload,updated_at)
        VALUES ($1,$2,now()) ON CONFLICT (archive_id) DO UPDATE
        SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at`, ['radar24', payload]);
      this.lastError = null;
      return true;
    } catch (e) {
      this.lastError = e.code || e.name || 'backup_failed';
      console.error('Radar archive: backup failed', this.lastError);
      return false;
    }
  }
  async close() { if (this.pool) await this.pool.end(); }
}
