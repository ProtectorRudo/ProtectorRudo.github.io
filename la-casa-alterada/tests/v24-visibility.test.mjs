import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const {targetVisibility,findSafeSpawnPoints}=await import('data:text/javascript;base64,'+
 Buffer.from(read('visibility-guard.js')).toString('base64'));

test('front targets are eligible, behind targets are not',()=>{
 const camera={position:{x:0,y:1.5,z:0},forward:{x:0,y:0,z:-1}};
 assert.equal(targetVisibility(camera,{x:0,y:1.5,z:-3}).visible,true);
 assert.equal(targetVisibility(camera,{x:0,y:1.5,z:3}).visible,false);
 assert.equal(targetVisibility(camera,{x:0,y:1,z:-3}).visible,true);
 assert.equal(targetVisibility(camera,{x:0,y:1.5,z:-14}).visible,false);
});
test('first five bots have distinct safe positions and correct floor height',()=>{
 const points=findSafeSpawnPoints({x:0,y:1.6,z:0},{x:0,y:-.2,z:-1},{floorY:0,max:5});
 assert.equal(points.length,5);
 assert.equal(new Set(points.map(p=>p.x.toFixed(2)+':'+p.z.toFixed(2))).size,5);
 assert.ok(points.every(p=>p.z < -3&&p.y===.016));
});
test('small room fails safely, no invisible guns outside the zone',()=>{
 assert.equal(findSafeSpawnPoints({x:0,y:1.6,z:0},{x:0,y:0,z:-1},
 {areaDistance:()=>-1,max:5}).length,0);
});
test('AR keeps native built-in characters rather than swapping unreliable rigs',()=>{
 const main=read('main.js'),missions=read('missions.js');
 assert.match(main,/if\(mode!=='ar'\)attachHuman\(e,e\.appearance\)/);
 assert.match(missions,/if\(api\.getMode\?\.\(\)!=='ar'\)/);
 assert.match(missions,/hostageRenderPoint:/);
 assert.match(main,/tacticalScale=n\.floor\?\.96:/);
 assert.match(main,/targetVisibility\(\{position:eye,forward:camForward\}/);
});
test('on-device visual probe and diagnostics are wired into scene and HUD',()=>{
 const main=read('main.js'),html=read('index.html');
 assert.match(html,/id="renderStatus"/);
 assert.match(html,/id="test3D"/);
 assert.match(main,/function verify3D\(/);
 assert.match(main,/new THREE\.IcosahedronGeometry/);
 assert.match(main,/rescueProtectedUntil=Math\.max\(/);
 assert.match(main,/updateRenderStatus\(t\)/);
});
test('V24 browser modules syntax is valid',()=>{
 for(const name of ['main.js','missions.js','visibility-guard.js','animated-humans.js']){
 const p=spawnSync(process.execPath,['--check','--input-type=module'],
  {input:read(name),encoding:'utf8'});
 assert.equal(p.status,0,name+' syntax: '+p.stderr);
 }
});
