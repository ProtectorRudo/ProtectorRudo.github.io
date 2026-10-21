import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const rules=await import('data:text/javascript;base64,'+
 Buffer.from(read('escort-rules.js')).toString('base64'));
function step(tracker,x,t,playerX=x){
 return rules.updateEscort(tracker,{x,z:0},{x:playerX,z:0},t);
}
test('bug reproduction: near-entry hostage cannot end the match on first release',()=>{
 const tracker=rules.beginEscort({x:.6,z:0},1000);
 const first=step(tracker,.6,1001,.5);
 assert.equal(first.complete,false,'the same-frame release cannot trigger victory');
 assert.equal(first.reason,'leave-entry');
 const later=step(tracker,.6,9900,.5);
 assert.equal(later.complete,false,'waiting in place never counts as escort');
});
test('actual escort walk from remote hostage location unlocks extraction',()=>{
 const t=rules.beginEscort({x:3.8,z:0},1000);
 assert.equal(step(t,3.8,1001,3.6).complete,false);
 let result;
 for(let i=0;i<35;i++)result=step(t,3.7-i*.09,1200+i*230,3.7-i*.09);
 assert.ok(t.travelled>1.2);
 assert.ok(result.complete===true,'player and walking hostage return to the base after 5 seconds');
 assert.equal(result.reason,'evacuated');
});
test('teleporting or AR pose jumps do not artificially accumulate escort distance',()=>{
 const t=rules.beginEscort({x:3.0,z:0},100);
 const before=step(t,.7,6000,.7);
 assert.equal(before.complete,false);
 assert.equal(t.travelled,0);
 assert.equal(step(t,.7,9000,.6).complete,false);
});
test('player cannot extract a hostage remotely without standing at the entrance',()=>{
 const t=rules.beginEscort({x:3.4,z:0},100);
 let result;
 for(let i=0;i<31;i++)result=step(t,3.3-i*.09,1000+i*250,3.5);
 assert.equal(result.complete,false);
 assert.equal(result.reason,'return-to-entry');
});
test('escort is committed independently of winning, with clean human fighter skeletons',()=>{
 const mission=read('missions.js'),humans=read('animated-humans.js');
 assert.match(mission,/o\.escortState=beginEscort\(/);
 assert.match(mission,/const escort=updateEscort\(o\.escortState,current,player,performance\.now\(\)\)/);
 assert.match(mission,/if\(escort\.complete&&o\.hostageHealth>0\)/);
 assert.doesNotMatch(mission,/if\(Math\.hypot\(current\.x,current\.z\)<1\.75&&playerDistance<1\.2\)/);
 assert.doesNotMatch(mission,/else if\(dist<minGap/);
 assert.match(humans,/if\(actor\.flesh\)actor\.flesh\.visible=false/);
 assert.doesNotMatch(humans,/equipStudioHuman|V29_REALISTIC_KIT|bones\[0\]\.add\(rifle\)/);
 assert.match(humans,/raiderA:CDN\+'npc-jordan-locomotion\.glb'/);
});
test('all modified runtime JS is parseable',()=>{
 for(const name of ['main.js','missions.js','animated-humans.js','escort-rules.js']){
  const p=spawnSync(process.execPath,['--check','--input-type=module'],
   {input:read(name),encoding:'utf8'});
  assert.equal(p.status,0,name+': '+p.stderr);
 }
});
