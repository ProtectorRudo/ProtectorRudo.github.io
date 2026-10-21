import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const file=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const load=(name)=>import('data:text/javascript;base64,'+Buffer.from(file(name)).toString('base64'));

class Vector3{
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
}
class Mesh{constructor(geometry,material){
  this.geometry=geometry;this.material=material;this.position=new Vector3();
  this.rotation={y:0};this.visible=true;
}}
class Geometry{dispose(){}}
class Material{dispose(){}}
const THREE={Vector3,Mesh,BoxGeometry:Geometry,MeshBasicMaterial:Material,DoubleSide:2};

test('V21: tactical JS modules are parseable as browser ESM',()=>{
 for(const name of ['main.js','spatial-map.js','capture-flag.js','combat-fx.js',
  'walkers.js','tactical-behavior.js','animated-humans.js']){
  const result=spawnSync(process.execPath,['--check','--input-type=module'],
    {input:file(name),encoding:'utf8'});
  assert.equal(result.status,0,name+': '+result.stderr);
 }
});

test('V21: marked obstacles produce safe hide and exposed peek',async()=>{
 const {createSpatialMap}=await load('spatial-map.js');
 const map=createSpatialMap(THREE,{add(){}});
 const from=new Vector3(-1.5,0,.5),threat=new Vector3(3,0,.5);
 assert.equal(map.findCoverSpot(from,threat),null,'no map cannot invent cover');
 assert.ok(map.addBox(new Vector3(0,0,0),new Vector3(1,0,1),{height:1.2}));
 assert.equal(map.lineBlocked(new Vector3(-1,.8,.5),new Vector3(3,.8,.5)),true);
 assert.equal(map.lineBlocked(new Vector3(-1,1.9,.5),new Vector3(3,1.9,.5)),false);
 const cover=map.findCoverSpot(from,threat);
 assert.ok(cover,'has tactical position');
 assert.equal(map.lineBlocked(new Vector3(cover.hide.x,.77,cover.hide.z),new Vector3(3,.77,.5)),true);
 assert.equal(map.lineBlocked(new Vector3(cover.peek.x,.77,cover.peek.z),new Vector3(3,.77,.5)),false);
 assert.equal(map.touchesWall(cover.peek,.22),false,'peek cannot clip through mapped obstacles');
});

test('V21: retreating cover planner has bounded states and safe fallback',async()=>{
 const {tacticalDestination:decide}=await load('tactical-behavior.js');
 const actor={alive:true,id:2,root:{position:{x:0,z:0}}},
   goal={x:4,z:4},enemy={x:3,z:3},hide={x:1,z:0},peek={x:1,z:1};
 assert.equal(decide(actor,100,goal,enemy,()=>null),goal);
 actor.coverRetryAt=0;
 assert.equal(decide(actor,3100,goal,enemy,()=>({hide,peek})),hide);
 actor.root.position=hide;decide(actor,3200,goal,enemy,()=>null);
 assert.equal(actor.coverState,'hold');
 assert.equal(decide(actor,3700,goal,enemy,()=>null),peek);
 actor.root.position=peek;decide(actor,3800,goal,enemy,()=>null);
 assert.equal(actor.coverState,'fire');
 decide(actor,5500,goal,enemy,()=>null);
 assert.equal(actor.coverState,'retreat');
 assert.equal(decide(actor,5501,goal,enemy,()=>null,false),goal);
 assert.equal(actor.coverPlan,null);
});

test('V21: CTF route nodes and visual effects are wired safely',()=>{
 assert.match(file('capture-flag.js'),/new THREE\.Vector3\(routePoint\.x,routePoint\.y,routePoint\.z\)/);
 assert.match(file('main.js'),/findCover:\(from,to\)=>spatialMap\.findCoverSpot\(from,to\)/);
 assert.match(file('combat-fx.js'),/return\{shot,whizz,dust,impact,muzzle,tick/);
});
