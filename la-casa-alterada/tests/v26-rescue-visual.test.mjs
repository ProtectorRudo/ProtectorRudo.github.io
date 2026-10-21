import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const mission=read('missions.js'),main=read('main.js');
const start=mission.indexOf('  const RESCUE_RANGE=1.55;');
const end=mission.indexOf('  function shielded(',start);
assert.ok(start>0&&end>start);
const rescueCode=mission.slice(start,end);
function createSimulation(x=.6,{guest=false,throwAnimation=false,throwEvent=false,hasCover=false}={}){
 const Vector=class{
  constructor(a,b=0,c=0){this.x=a;this.y=b;this.z=c}
  clone(){return new Vector(this.x,this.y,this.z)}
 };
 const p=new Vector(x,0,0),o={
  running:true,phase:-2,hostagePos:new Vector(0,0,0),rescueActionStartedAt:0,
  rescueRequestAt:0,origin:{localToWorld:a=>a},hostageActor:{hostage:true}
 };
 const classes=new Set(),messages=[],events=[],sent=[];
 const interact={classList:{add:a=>classes.add(a),remove:a=>classes.delete(a)},
  style:{removeProperty(){}},disabled:false};
 const api={toast:a=>messages.push(a),hasCover:()=>hasCover,
  event:a=>{events.push(a);if(throwEvent)throw Error('audio problem')}};
 let animationCalls=0,spawnCalls=0;
 const deps=new Function('o','position','localPositionOf','api','interact','isGuest','send',
  'performance','broadcast','playHuman','ui','POSITION','setPhase',
  rescueCode+';return {beginRescueTap,doInteract,clearRescueButton};')
  (o,()=>p,()=>p,api,interact,()=>guest,
   (conn,msg)=>sent.push(msg),{now:()=>1200},
   msg=>sent.push(msg),()=>{animationCalls++;if(throwAnimation)throw Error('mixer problem')},
   ()=>{},[],()=>{});
 return{p,o,interact,deps,classes,messages,events,sent,
   get animationCalls(){return animationCalls},get spawnCalls(){return spawnCalls}};
}
test('single tap immediately changes hostage mission to escort; not 99%',()=>{
 const s=createSimulation();
 assert.equal(s.deps.beginRescueTap(),true);
 assert.equal(s.o.phase,-1);
 assert.equal(s.o.hostageRescued,true);
 assert.equal(s.o.escortPlayer,'local');
 assert.equal(s.o.rescueActionStartedAt,0);
 assert.equal(s.o.rescueRequestAt,0);
 assert.ok(s.o.rescueReinforcementAt>1200);
 assert.equal(s.classes.has('rescuing'),false);
 assert.equal(s.deps.beginRescueTap(),false,'does not release twice');
 assert.doesNotMatch(mission,/RESCUE_TAP_MS|LIBERANDO '\+progress/);
});
test('at 0.6m it succeeds even when an optional 3D animation throws',()=>{
 const s=createSimulation(.6,{throwAnimation:true,throwEvent:true});
 assert.equal(s.deps.beginRescueTap(),true);
 assert.equal(s.o.phase,-1);
 assert.equal(s.o.hostageRescued,true);
 assert.equal(s.animationCalls,1);
});
test('tap outside reach is rejected and never changes phase',()=>{
 const s=createSimulation(2.4);
 assert.equal(s.deps.beginRescueTap(),false);
 assert.equal(s.o.phase,-2);
 assert.ok(s.messages.some(m=>m.includes('ACERCATE')));
});
test('virtual cover blocks release unless player is actually close',()=>{
 const s=createSimulation(1.3,{hasCover:true});
 assert.equal(s.deps.beginRescueTap(),false);
 assert.equal(s.o.phase,-2);
 assert.ok(s.messages.some(m=>m.includes('OBSTÁCULO')));
});
test('rescue no longer depends on WebXR animation clock or on keeping pressed',()=>{
 assert.doesNotMatch(mission,/time-o\.rescueActionStartedAt>=/);
 assert.doesNotMatch(mission,/setPointerCapture\(e\.pointerId\)/);
 assert.match(mission,/o\.phase=-1;o\.hostageRescued=true;o\.escortPlayer=id/);
 assert.match(mission,/o\.rescueReinforcementAt=performance\.now\(\)\+3000/);
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
