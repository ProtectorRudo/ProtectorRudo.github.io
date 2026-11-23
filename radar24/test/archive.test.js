import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RadarStore } from '../src/storage.js';
import { RadarArchive } from '../src/archive.js';

test('a cold start restores a real SQLite inventory from an external archive',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'radar24-archive-'));
  const path=join(directory,'radar.sqlite');
  let remote=null;
  class FakePool {
    async query(sql,args=[]) {
      if(sql.includes('CREATE TABLE'))return {rows:[]};
      if(sql.includes('SELECT payload'))return {rows:remote?[{payload:Buffer.from(remote),updated_at:new Date(Date.now()+5000)}]:[]};
      if(sql.includes('INSERT INTO')){remote=Buffer.from(args[1]);return {rows:[]};}
      throw new Error('Unexpected query');
    }
    async end(){}
  }
  let writer,reader,store,restored;
  try {
    writer=new RadarArchive(path,'postgresql://fake',FakePool);
    assert.equal(await writer.connectAndRestore(),true);
    assert.equal(writer.restored,false);
    store=new RadarStore(path);
    store.add([{
      id:'tiktok:1234567890',platform:'tiktok',externalId:'1234567890',
      url:'https://www.tiktok.com/@creator/video/1234567890',
      postedAt:'2026-11-23T08:00:00Z',views:44000,likes:2200,comments:200,
      shares:100,followers:11000,author:'creator',caption:'Original',market:'AR'
    }],'2026-11-23T09:00:00Z');
    store.addRun('ok',1);
    assert.equal(await writer.save(store),true);
    assert.ok(remote?.byteLength>0);
    store.close();store=null;
    await writer.close();writer=null;
    rmSync(path,{force:true});
    reader=new RadarArchive(path,'postgresql://fake',FakePool);
    assert.equal(await reader.connectAndRestore(),true);
    assert.equal(reader.restored,true);
    restored=new RadarStore(path);
    const items=restored.list({mode:'all'});
    assert.equal(items.length,1);
    assert.equal(items[0].views,44000);
    assert.equal(restored.runsToday(new Date('2026-11-23T11:00:00Z')),1);
  } finally {
    if(store)store.close();
    if(restored)restored.close();
    if(writer)await writer.close();
    if(reader)await reader.close();
    rmSync(directory,{recursive:true,force:true});
  }
});
test('missing database credentials do not interrupt read-only radar startup',async()=>{
  const a=new RadarArchive('/tmp/not-created-radar24.db','');
  assert.equal(await a.connectAndRestore(),false);
  assert.equal(a.ready,false);
  assert.equal(a.lastError,null);
});
