import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const mission=read('missions.js'),main=read('main.js');
const start=mission.indexOf('  const RESCUE_TAP_MS=1550,RESCUE_RANGE=1.55;');
const end=mission.indexOf('  function doInteract(id){',start);
assert.ok(start>0&&end>start,'one-tap action definitions are present');
const functions=mission.slice(start,end);
const tickStart=mission.indexOf('    if(o.rescueActionStartedAt&&o.running&&o.phase===-2)');
const tickEnd=mission.indexOf('    if(o.running&&isHost()&&o.phase===-1',tickStart);
assert.ok(tickStart>0&&tickEnd>tickStart,'rescue action advances in game clock');
const advanceCode=mission.slice(tickStart,tickEnd);

function createSimulation(position={x:.7,z:0}){
 const o={running:true,phase:-2,rescueActionStartedAt:0,
  hostagePos:{x:0,z:0,clone(){return {...this}}},origin:{localToWorld:point=>point}};
 const style=new Map(),classes=new Set(),messages=[];
 const interact={classList:{add:s=>classes.add(s),remove:s=>classes.delete(s)},
  style:{setProperty:(a,b)=>style.set(a,b),removeProperty:a=>style.delete(a)}};
 let now=1000,completed=0,remoteSends=0;
 const p={...position,clone(){return {...this}}};
 const api={toast:t=>messages.push(t),hasCover:()=>false};
 const deps=new Function('o','position','api','interact','isGuest','send','performance',
  functions+'; return {beginRescueTap,cancelRescueTap,RESCUE_TAP_MS,RESCUE_RANGE};')
  (o,()=>p,api,interact,()=>false,()=>remoteSends++,{now:()=>now});
 const advance=new Function('o','position','time','RESCUE_TAP_MS','RESCUE_RANGE',
  'cancelRescueTap','isGuest','send','doInteract',advanceCode);
 const step=time=>advance(o,()=>p,time,deps.RESCUE_TAP_MS,deps.RESCUE_RANGE,
  deps.cancelRescueTap,()=>false,()=>remoteSends++,()=>completed++);
 return{o,deps,style,classes,messages,p,step,get completed(){return completed}};
}
test('one tap starts release; no pointer-up or held input is required',()=>{
 const s=createSimulation();
 s.deps.beginRescueTap();
 assert.equal(s.o.rescueActionStartedAt,1000);
 assert.ok(s.classes.has('rescuing'));
 s.step(1500);assert.equal(s.completed,0);
 s.step(2551);assert.equal(s.completed,1);
 assert.equal(s.o.rescueActionStartedAt,0);
 assert.equal(s.classes.has('rescuing'),false);
 s.step(3100);assert.equal(s.completed,1,'release finishes only once');
});
test('walking out of rescue range cancels without completing',()=>{
 const s=createSimulation();
 s.deps.beginRescueTap();
 s.p.x=2.0;
 s.step(2400);
 assert.equal(s.o.rescueActionStartedAt,0);
 assert.equal(s.completed,0);
 assert.ok(s.messages.some(msg=>msg.includes('TE ALEJASTE')));
});
test('tap never begins behind a wall, and remote completion is range checked',()=>{
 const s=createSimulation({x:2,z:0});
 s.deps.beginRescueTap();
 assert.equal(s.o.rescueActionStartedAt,0);
 assert.ok(s.messages.some(msg=>msg.includes('ACERCATE')));
 assert.match(mission,/if\(Math\.hypot\(p\.x-o\.hostagePos\.x,p\.z-o\.hostagePos\.z\)>RESCUE_RANGE\)/);
 assert.doesNotMatch(mission,/MANTENÉ PARA LIBERAR|setPointerCapture\(e\.pointerId\)/);
});
test('V26 restores textured GLB in both AR and demo, fallback remains visible',()=>{
 assert.match(mission,/attachHuman\(actor,'hostage'\)\.then/);
 assert.doesNotMatch(mission,/if\(api\.getMode\?\.\(\)!=='ar'\)/);
 assert.equal(main.match(/attachHuman\(e,e\.appearance\)\.catch/g)?.length,3);
 assert.match(mission,/makeHostageFallback\(THREE\)/);
 assert.match(mission,/animateHostageFallback/);
 assert.match(read('animated-humans.js'),/npc-maya-locomotion\.glb/);
 assert.match(read('hostage-fallback.js'),/return\{flesh:body,arms,legs,height/);
});
test('V26 validates JS module syntax and still contains AR compositor',()=>{
 for(const name of ['missions.js','main.js','hostage-fallback.js','animated-humans.js']){
  const p=spawnSync(process.execPath,['--check','--input-type=module'],
   {input:read(name),encoding:'utf8'});
  assert.equal(p.status,0,name+': '+p.stderr);
 }
 assert.match(main,/arCompositor\.render\(world,renderer\.xr\.getCamera\(camera\)\)/);
});
