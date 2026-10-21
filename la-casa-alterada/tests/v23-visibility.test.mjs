import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const main=read('main.js'),mission=read('missions.js');
const guard=await import('data:text/javascript;base64,'+Buffer.from(read('visibility-guard.js')).toString('base64'));

class Vector{
 constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z})}
 clone(){return new Vector(this.x,this.y,this.z)}
 addScaledVector(v,n){this.x+=v.x*n;this.y+=v.y*n;this.z+=v.z*n;return this}
 setY(y){this.y=y;return this}
 lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}
 normalize(){const r=Math.sqrt(this.lengthSq())||1;this.x/=r;this.y/=r;this.z/=r;return this}
 distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z)}
}
const begin=main.indexOf('function safeRescueSpawn('),end=main.indexOf('\nfunction wave(',begin);
assert.ok(begin>0&&end>begin,'safeRescueSpawn source exists');
const helper=main.slice(begin,end);
function makeSpawn(spatialMap={area:null,canMove:()=>true,areaDistance:()=>10}){
 const cam={getWorldPosition:p=>Object.assign(p,{x:0,y:1.55,z:0}),
   getWorldDirection:p=>Object.assign(p,{x:0,y:0,z:-1})};
 return new Function('THREE','getCam','spatialMap','nests','findSafeSpawnPoints',
   helper+'\nreturn safeRescueSpawn;')({Vector3:Vector},()=>cam,spatialMap,
     [{root:{position:{x:0,y:0,z:0}}}],guard.findSafeSpawnPoints);
}
test('V23 attackers spawn on the floor in the FRONT half-space',()=>{
 const spawn=makeSpawn();
 for(let i=0;i<5;i++){
  const p=spawn(i,8,{x:0,y:0,z:0});
  assert.ok(p,'must produce a position');
  assert.ok(p.z<-.9,'bot '+i+' must be ahead, not behind camera');
  assert.ok(Math.hypot(p.x,p.z)>1.4,'bot '+i+' not on top of the player');
  assert.ok(Math.abs(p.y-.016)<1e-5,'bots rest on the floor');
 }
});

test('V23 rejects positions outside a calibrated play zone',()=>{
 const spawn=makeSpawn({area:true,areaDistance:()=>-.5,canMove:()=>false});
 assert.equal(spawn(0,5,{x:0,y:0,z:0}),null);
});

test('Rescue starts with a grace period and a delayed, smaller wave',()=>{
 assert.match(main,/RESCUE_OPENING_MS=12500,RESCUE_FIRST_SPAWN_MS=7400/);
 assert.match(main,/wave\(5,false\)/);
 assert.doesNotMatch(main,/wave\(8,false\)/);
 assert.match(main,/nextSpawnTime=Math\.max\(nextSpawnTime,performance\.now\(\)\+RESCUE_FIRST_SPAWN_MS\)/);
 assert.match(main,/function damage\(value\)\{if\(!mission\?\.isCapture\?\.\(\)&&rescueProtectionLeft\(\)>0\)return/);
 assert.match(mission,/api\.rescueProtected\?\.\(\)/);
});

test('No enemies hidden by unverified AR depth while still attacking',()=>{
 assert.doesNotMatch(main,/depthInfo\.getDepthInMeters\(\(p\.x/);
 assert.match(main,/for\(const e of enemies\)if\(e\.alive\)e\.root\.visible=true/);
 assert.match(main,/const onScreen=targetVisibility\\(/);
 assert.match(main,/if\(exposed&&onScreen&&rescueProtectionLeft\(t\)===0/);
});

test('Hostage marker remains visible even if assets cannot load',()=>{
 assert.match(mission,/depthWrite:false,depthTest:false/);
 assert.match(mission,/markerText\.renderOrder=100/);
 assert.match(mission,/if\(!o\.hostageActor\)buildHostage\(\)/);
 assert.match(main,/e\.threatMarker=indicator/);
});
