import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
const {LINK,sessionCode,retryDelay,timedOutConnect,lostHeartbeat,linkErrorMessage}=
 await import('data:text/javascript;base64,'+Buffer.from(read('multiplayer-link.js')).toString('base64'));
const mission=read('missions.js'),ui=read('index.html'),css=read('style.css');

test('room codes and auto-invite join are normalized and validated',()=>{
 assert.equal(sessionCode(' ab12cd '),'AB12CD');
 assert.equal(sessionCode('abc'),null); // not valid room code
});
test('retry schedule backs off without spamming PeerJS Cloud',()=>{
 assert.ok(retryDelay(1)>=1000);
 assert.ok(retryDelay(4)>retryDelay(2));
 assert.ok(retryDelay(16)<=14000);
 assert.equal(timedOutConnect(16001,1000,false),true);
 assert.equal(timedOutConnect(10000,1000,false),false);
 assert.equal(timedOutConnect(20000,1000,true),false);
});
test('disconnected WebRTC link is detected from missing pongs',()=>{
 assert.equal(lostHeartbeat(15000,1000,1000),true);
 assert.equal(lostHeartbeat(3000,2500,1000),false);
 assert.equal(lostHeartbeat(3000,0,2500),false);
 assert.match(linkErrorMessage('webrtc'),/MISMA WIFI/);
 assert.match(linkErrorMessage('peer-unavailable'),/SALA NO ENCONTRADA/);
});
test('host responds to heartbeat without waiting for mission start',()=>{
 assert.match(mission,/if\(msg\.t==='ping'&&Number\.isFinite\(msg\.at\)\)/);
 assert.match(mission,/send\(conn,\{t:'pong',at:msg\.at\}\)/);
 assert.match(mission,/if\(o\.referenceReady&&o\.referenceLength>\.85\)/);
 assert.match(mission,/if\(o\.referenceLength>\.85\)send\(o\.conn,\{/);
 assert.match(mission,/Math\.abs\(o\.expectedLength-expected\)<\.012/);
 assert.match(mission,/if\(m\.t==='pong'&&Number\.isFinite\(m\.at\)\)/);
 assert.match(mission,/function linkMaintenance\(\)/);
 assert.match(mission,/scheduleGuestRetry\('timeout'\)/);
 assert.match(mission,/peer\.on\('disconnected'/);
 assert.match(mission,/peer\.reconnect\(\)/);
});
test('connecting phones report online and can recover without reloading AR',()=>{
 assert.match(mission,/function scheduleGuestRetry\(reason='network'\)/);
 assert.match(mission,/function connectGuest\(\)/);
 assert.match(mission,/function manualRetry\(\)/);
 assert.match(mission,/setNetwork\('online','SALA '\+o\.room\)/);
 assert.match(mission,/if\(o\.ready\)send\(conn,\{t:'syncRequest'\}\)/);
 assert.match(mission,/if\(count>LINK\.maxRetries\)o\.net\.retryAt=0|count>LINK\.maxRetries\?0:/);
});
test('an invitation auto joins the recipient rather than stopping at manual CODE entry',()=>{
 assert.match(mission,/const query=sessionCode\(new URLSearchParams\(location\.search\)\.get\('sala'\)\)/);
 assert.match(mission,/if\(window\.Peer\)joinRoom\(\)/);
 assert.match(mission,/if\(m\.t==='welcome'\)\{o\.myId=m\.id/);
});
test('show clear network status on lobby and inside AR HUD',()=>{
 for(const key of ['netStatus','netStatusHud','retryRoom']){
  assert.match(ui,new RegExp('id="'+key+'"'));
 }
 assert.match(css,/#netStatusHud\{/);
 assert.match(mission,/setNetwork\('connecting','SALA '\+o\.room\)/);
 assert.match(mission,/function teamCalibration\(\)/);
});
test('do not duplicate or replace host authority and PvP hit validation',()=>{
 assert.match(mission,/const result=api\.resolveTeammateShot\?\./);
 assert.match(mission,/if\(result\)send\(conn,\{t:'shotResult'/);
 assert.match(mission,/o\.pvp\.hit\(id,attacker,amount,now,headshot\)/);
 assert.match(mission,/o\.teams\.set\(conn\.peer/);
});
test('all V34 ESM modules parse',()=>{
 for(const f of ['main.js','missions.js','multiplayer-link.js','pvp-health.js']){
  const p=spawnSync(process.execPath,['--check','--input-type=module'],
   {input:read(f),encoding:'utf8'});
  assert.equal(p.status,0,f+': '+p.stderr);
 }
});