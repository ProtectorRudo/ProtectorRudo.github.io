import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const main=read('main.js'),mission=read('missions.js'),asset=read('animated-humans.js');
const {escortMotion}=await import('data:text/javascript;base64,'+
 Buffer.from(read('escort-motion.js')).toString('base64'));
const {beginEscort,updateEscort}=await import('data:text/javascript;base64,'+
 Buffer.from(read('escort-rules.js')).toString('base64'));

test('the enemy GLB is an authentic military soldier, NOT the office-suit source',()=>{
 assert.match(asset,/raiderA:MILITARY\+'soldier\.glb'/);
 assert.match(asset,/raiderC:MILITARY\+'soldier\.glb'/);
 assert.match(asset,/operator:MILITARY\+'soldier\.glb'/);
 assert.match(asset,/hostage:CDN\+'npc-maya-locomotion\.glb'/);
 assert.doesNotMatch(asset,/raiderA:CDN\+'npc-jordan/);
 assert.doesNotMatch(asset,/raiderB:CDN\+'npc-sam/);
 assert.doesNotMatch(asset,/equipStudioHuman|V29_REALISTIC_KIT/);
 assert.match(asset,/urlCache=new Map\(\)/);
});
test('rescue combat begins without a special acknowledgment and remains safe 12.5s',()=>{
 assert.match(main,/RESCUE_OPENING_MS=12500/);
 assert.match(main,/rescueCombatArmed=true; \/\/ Automatic armed state/);
 assert.match(main,/const confirm=false/);
 assert.match(main,/if\(rescueCombatArmed&&rescueProtectionLeft\(t\)===0\)seconds=/);
 assert.match(main,/rescueCombatArmed&&exposed&&onScreen&&e\.root\.visible&&rescueProtectionLeft\(t\)===0/);
 assert.doesNotMatch(main,/COMBATE PAUSADO · PRIMERO COMPROBÁ/);
});
test('hostage starts on calibrated floor even when user raycast hit a countertop',()=>{
 assert.match(mission,/const relative=o\.origin\.worldToLocal\(worldPoint\.clone\(\)\);[\s\S]{0,200}relative\.y=0;/);
 assert.match(mission,/o\.hostagePos=from\(payload\);o\.hostagePos\.y=0;/);
 assert.match(mission,/current\.y=0;/);
});
function simulate(placed,seconds=8){
 const npc={x:placed,z:0},state=beginEscort(npc,1000);
 let last=null,moved=0;
 const dt=.05;
 for(let i=0;i<Math.round(seconds/dt);i++){
  const t=i*dt;
  const player={x:Math.max(.45,placed-t*.4),z:0};
  const p=escortMotion(npc,player);
  if(p.target){
   const dx=p.target.x-npc.x,dz=p.target.z-npc.z,len=Math.hypot(dx,dz);
   if(len>.07){
    const step=Math.min(len,p.speed*dt);
    npc.x+=dx/len*step;npc.z+=dz/len*step;moved+=step;
   }
  }
  last=updateEscort(state,npc,player,1000+1000*t);
 }
 return{npc,state,last,moved};
}
test('escort from 2.1m walks to extraction and completes after real steps',()=>{
 const r=simulate(2.1,8);
 assert.ok(r.moved>1.2,'hostage follows rather than standing still');
 assert.ok(r.state.travelled>=r.state.requiredDistance);
 assert.ok(r.last.complete,'hostage and escort reach entrance');
 assert.ok(r.npc.x<1.02);
});
test('small 1.45m room also completes a walking escort',()=>{
 const r=simulate(1.45,8);
 assert.ok(r.state.travelled>=r.state.requiredDistance);
 assert.ok(r.last.complete,'compact rooms must be winnable');
});
test('player behind NPC does not make it walk backward when close to extraction',()=>{
 const info=escortMotion({x:1.50,z:0},{x:1.7,z:0});
 assert.ok(info.target);
 assert.equal(info.target.x,0,'go towards the extraction, not backwards');
});
test('far-away player makes hostage catch up without teleport',()=>{
 const motion=escortMotion({x:2,z:0},{x:5.2,z:0});
 assert.equal(motion.status,'catching-up');
 assert.equal(motion.speed,1.55);
 assert.ok(motion.target.x<5.2);
});
test('all V32 modules parse as modern JavaScript',()=>{
 for(const name of ['main.js','missions.js','escort-motion.js','animated-humans.js']){
  const res=spawnSync(process.execPath,['--check','--input-type=module'],
    {input:read(name),encoding:'utf8'});
  assert.equal(res.status,0,name+' '+res.stderr);
 }
});