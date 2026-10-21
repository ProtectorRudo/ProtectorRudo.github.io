import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const tactic=await import('data:text/javascript;base64,'+
  Buffer.from(read('ctf-tactics.js')).toString('base64'));

class V{
 constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z,isVector3:true})}
 clone(){return new V(this.x,this.y,this.z)}
 copy(p){Object.assign(this,{x:p.x,y:p.y,z:p.z});return this}
 add(p){this.x+=p.x;this.y+=p.y;this.z+=p.z;return this}
 sub(p){this.x-=p.x;this.y-=p.y;this.z-=p.z;return this}
 multiplyScalar(s){this.x*=s;this.y*=s;this.z*=s;return this}
 addScaledVector(p,s){return this.add(p.clone().multiplyScalar(s))}
 set(x,y,z){Object.assign(this,{x,y,z});return this}
 lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}
 normalize(){const l=Math.sqrt(this.lengthSq())||1;return this.multiplyScalar(1/l)}
 distanceTo(p){return Math.hypot(this.x-p.x,this.y-p.y,this.z-p.z)}
}
class G{
 constructor(){this.children=[];this.position=new V();this.rotation={x:0,y:0,z:0};this.userData={};this.visible=true}
 add(x){x.parent=this;this.children.push(x);return this}
 remove(x){this.children=this.children.filter(y=>y!==x);x.parent=null}
 traverse(cb){cb(this);for(const n of this.children)n.traverse?.(cb)}
}
class Geom{dispose(){} rotateX(){return this}}
class Mat{constructor(options={}){Object.assign(this,options)}dispose(){}}
class Mesh extends G{constructor(geo,mat){super();this.geometry=geo;this.material=mat}getWorldPosition(v){return v.copy(this.position)}}
const THREE={Vector3:V,Group:G,Mesh,MeshBasicMaterial:Mat,MeshStandardMaterial:Mat,
 BoxGeometry:Geom,CylinderGeometry:Geom,PlaneGeometry:Geom,TorusGeometry:Geom,
 CircleGeometry:Geom,DoubleSide:2};
function captureHarness(count=0){
 const code=read('capture-flag.js').replace(/^import .*$/gm,'').replace('export function createCaptureFlag','function createCaptureFlag');
 const factory=new Function('THREE','tacticalDestination','squadRole','squadSpawn',
 'squadFlank','squadSpeed','squadStance',code+';return createCaptureFlag;');
 const anchor=new G();anchor.worldToLocal=v=>v;anchor.localToWorld=v=>v;
 let player=new V(),spawns=[],bots=[],events=[];
 const api={origin:()=>anchor,isHost:()=>true,
  players:()=>[{id:'player',team:'blue',pos:player}],
  bots:()=>bots,
  spawnBot:(team,index,id,pos)=>{spawns.push({team,index,id,pos})},
  canMove:()=>true,event:e=>events.push(e),
  finish:()=>{},
  cover:()=>false,nextPoint:(a,b)=>b
 };
 const c=factory(THREE,()=>null,...[
  tactic.squadRole,tactic.squadSpawn,tactic.squadFlank,
  tactic.squadSpeed,tactic.squadStance])(THREE,api);
 c.configure({bots:count,difficulty:'normal'});
 assert.ok(c.place('blue',new V(0,0,0)));
 assert.ok(c.place('red',new V(3.6,0,0)));
 assert.equal(c.start(),true);
 return{c,spawns,events,move:(x,z=0)=>{player=new V(x,0,z)},tick:ms=>c.tick(.05,ms)};
}

test('capture bug: approaching within 1.1m automatically picks rival flag',()=>{
 const h=captureHarness();
 h.move(2.5);h.tick(1000);
 assert.equal(h.c.flags.red.carrier,'player');
 assert.equal(h.c.objective('blue','player').kind,'deliver');
 h.move(.85);h.tick(2000);
 assert.equal(h.c.scores.blue,1,'returning within 1.38m scores');
 assert.equal(h.c.flags.red.carrier,null);
});

test('explicit flag pickup is validated, not granted from across room',()=>{
 const h=captureHarness();
 assert.equal(h.c.tryPickup('player','blue',new V(.1,0,0)),false);
 assert.equal(h.c.tryPickup('player','blue',new V(2.15,0,0)),true);
 assert.equal(h.c.flags.red.carrier,'player');
});

test('bot squad roles and entry points are actually distributed',()=>{
 const h=captureHarness(6);
 const blue=h.spawns.filter(s=>s.team==='blue');
 assert.equal(blue.length,6);
 assert.equal(new Set(blue.map(s=>s.pos.x.toFixed(2)+':'+s.pos.z.toFixed(2))).size,6);
 assert.deepEqual([...new Set(Array.from({length:6},(_,i)=>tactic.squadRole(i)))],
 ['sentinel','runner','flanker','support','scout','assault']);
 assert.ok(tactic.squadSpeed('scout','dificil')>tactic.squadSpeed('sentinel','facil'));
 assert.equal(tactic.squadStance('sentinel','hold',2,0),'crouch');
 assert.equal(tactic.squadStance('flanker','fire',3,0),'aim');
});

test('placed virtual covers block paths and incoming bullets and remain visible',()=>{
 const code=read('spatial-map.js').replace('export function createSpatialMap','function createSpatialMap');
 const f=new Function('THREE',code+';return createSpatialMap');
 const scene=new G();
 const space=f(THREE)(THREE,scene);
 const cover=space.addCover(new V(0,0,0),{kind:'barricade',floorY:0,forward:{x:0,z:-1}});
 assert.ok(cover);
 assert.equal(space.boxes.length,1);
 assert.ok(space.lineBlocked(new V(0,1.05,2),new V(0,1.05,-2)));
 assert.equal(space.canMove(new V(0,0,1.4),new V(0,0,-1.4),.2),false);
 space.setVisible(false);
 assert.equal(cover.mesh.visible,true);
 assert.equal(space.addCover(new V(0,0,0),{kind:'crate',floorY:0}),false);
 const anchor={worldToLocal:p=>p,localToWorld:p=>p};
 const remote=space.exportData(anchor);
 assert.equal(remote[0].type,'cover');
 assert.equal(remote[0].kind,'barricade');
 const guest=f(THREE)(THREE,new G());
 guest.importData(remote,anchor);
 guest.setVisible(false);
 assert.equal(guest.boxes.length,1);
 assert.equal(guest.boxes[0].mesh.visible,true);
});
test('cover placement and flag controls are wired during combat',()=>{
 const main=read('main.js'),ui=read('index.html'),mission=read('missions.js');
 assert.ok(ui.includes('id="placeCover"'));
 assert.ok(ui.includes('id="coverPreset"'));
 assert.ok(main.includes('spatialMap.addCover(point'));
 assert.ok(main.includes("!active||ended||placing||mapping"));
 assert.ok(mission.includes("if(isCapture())pickupFlag();else beginRescueTap()"));
 assert.ok(mission.includes("if(msg.t==='ctfPickup'"));
 assert.ok(mission.includes("ctf.tryPickup(conn.peer"));
});
test('V27 modules have valid syntax',()=>{
 for(const name of ['main.js','missions.js','capture-flag.js','ctf-tactics.js',
  'animated-humans.js','walkers.js','spatial-map.js']){
  const p=spawnSync(process.execPath,['--check','--input-type=module'],
    {input:read(name),encoding:'utf8'});
  assert.equal(p.status,0,name+' syntax: '+p.stderr);
 }
});
