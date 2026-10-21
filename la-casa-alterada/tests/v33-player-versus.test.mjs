import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const {createPvPHealth,playerRayHit}=await import('data:text/javascript;base64,'+
 Buffer.from(read('pvp-health.js')).toString('base64'));
test('two real players start with 100 HP and body shots cost 25',()=>{
 const engine=createPvPHealth();engine.reset(['host','guest']);
 for(let n=0;n<3;n++){
  const h=engine.hit('guest','host',25,1000+n*150,false);
  assert.equal(h.damage,25);
  assert.equal(h.lethal,false);
 }
 assert.equal(engine.view('guest',1400).hp,25);
 const fatal=engine.hit('guest','host',25,1500,false);
 assert.equal(fatal.lethal,true);
 assert.equal(fatal.state.hp,0);
 assert.equal(engine.view('host',1500).kills,1);
 assert.equal(engine.view('guest',1500).deaths,1);
});
test('eliminated player cannot take damage or shoot until respawn',()=>{
 const e=createPvPHealth();e.reset(['a','b']);
 assert.equal(e.hit('b','a',100,100).lethal,true);
 assert.equal(e.alive('b',4000),false);
 assert.equal(e.hit('b','a',25,250),null,'dead victims do not lose more HP');
 assert.equal(e.tick(4300),true);
 assert.equal(e.view('b',4300).hp,100);
 assert.equal(e.hit('b','a',45,4300),null,'respawn grace protects target');
 assert.equal(e.hit('b','a',45,5900).state.hp,55);
 assert.equal(e.view('a',5900).kills,1);
});
test('medkit restores real health but cannot resurrect dead players',()=>{
 const e=createPvPHealth();e.reset(['a','b']);
 e.hit('b','a',45,100);
 assert.equal(e.heal('b',22,200).hp,77);
 e.hit('b','a',100,300);
 assert.equal(e.heal('b',22,400),null);
});
test('bot damage does not register a bot as a real participant',()=>{
 const e=createPvPHealth();e.reset(['player']);
 e.hit('player','bot:3001',34,100);
 assert.equal(e.snapshot(300).length,1);
 assert.equal(e.view('player',300).hp,66);
});
test('head and torso hitboxes are distinct in actual camera coordinates',()=>{
 const from={x:0,y:1.64,z:0},target={x:0,y:1.64,z:-3.2};
 const head=playerRayHit(from,{x:0,y:0,z:-1},target);
 assert.ok(head);
 assert.equal(head.part,'head');
 assert.equal(head.damage,45);
 const body=playerRayHit(from,{x:0,y:-.70,z:-3.2},target);
 assert.ok(body);
 assert.equal(body.part,'body');
 assert.equal(body.damage,25);
 assert.equal(playerRayHit(from,{x:1,y:0,z:0},target),null);
 assert.equal(playerRayHit(from,{x:0,y:0,z:1},target),null);
});
test('PvP hit claims are decided by the host with team checks, sight occlusion and raycast',()=>{
 const main=read('main.js'),mission=read('missions.js');
 assert.match(main,/playerRayHit\(start,cast\.ray\.direction,person\.world\)/);
 assert.match(main,/spatialMap\.lineBlocked\(start,closest\.point,\.04\)/);
 assert.match(main,/mission\.damagePvPPlayer\?\.\(closest\.playerId,shooterId/);
 assert.match(mission,/teamOf\(id\)===teamOf\(attacker\)/);
 assert.match(mission,/o\.pvp\.hit\(id,attacker,amount,now,headshot\)/);
 assert.match(mission,/\(!isPvP\(\)\|\|o\.pvp\.alive\(conn\.peer,t\)\)/);
 assert.match(mission,/ctf\.tagPlayer\(id,at,now\)/);
});
test('Only Versus has PvP HP and cooperative rescue is unaffected',()=>{
 const mission=read('missions.js'),ctf=read('capture-flag.js');
 assert.match(mission,/function isPvP\(\)\{return isCapture\(\)&&ctf\.config\.versus;\}/);
 assert.match(ctf,/if\(S\.config\.versus\)api\.tagPlayer\?\./);
 assert.match(mission,/if\(isPvP\(\)\)\{/);
});
test('Multiplayer client UI shows life, deaths and respawn cooldown',()=>{
 const main=read('main.js'),html=read('index.html');
 assert.match(html,/id="pvpVitals"/);
 assert.match(main,/PVP '\+pvpState\.hp\+'\/100 HP/);
 assert.match(main,/pvpRespawnAt=performance\.now\(\)\+remaining/);
 assert.match(main,/mission\?\.canPvPFire\?\.\(\)===false/);
});
test('V33 project modules are valid ESM',()=>{
 for(const filename of ['pvp-health.js','main.js','missions.js','capture-flag.js']){
  const p=spawnSync(process.execPath,['--check','--input-type=module'],
   {input:read(filename),encoding:'utf8'});
  assert.equal(p.status,0,filename+': '+p.stderr);
 }
});
