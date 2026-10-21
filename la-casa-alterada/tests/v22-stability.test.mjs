import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const load=name=>import('data:text/javascript;base64,'+Buffer.from(read(name)).toString('base64'));
const bot=()=>({
 alive:true,id:13,variant:0,phase:0,floor:true,boss:false,
 root:{position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0}},
 home:{x:0,y:0,z:0},groundY:0,coverPlan:{},coverState:'peek',
 walkVX:0,walkVZ:0
});

test('all V22 browser modules remain syntax-valid',()=>{
 for(const name of ['main.js','walkers.js','spatial-map.js','capture-flag.js',
  'combat-fx.js','adaptive-quality.js','tactical-behavior.js','animated-humans.js']){
  const p=spawnSync(process.execPath,['--check','--input-type=module'],
    {input:read(name),encoding:'utf8'});
  assert.equal(p.status,0,name+' syntax: '+p.stderr);
 }
});

test('cover peek point is approached closely, not 1.58m away',async()=>{
 const {steerEnemy}=await load('walkers.js');
 const e=bot(),peek={x:1.1,y:0,z:0};
 for(let t=0;t<160;t++)steerEnemy(e,.05,t*50,peek,'ar',null,[e]);
 assert.ok(e.root.position.x>.85,'actor must enter the actual peek lane');
 assert.ok(e.root.position.x<1.25,'actor must stop at cover');
 assert.equal(e.root.position.y,0);
});

test('stalled cover route self-recovers rather than sticking forever',async()=>{
 const {steerEnemy}=await load('walkers.js');
 const e=bot(),peek={x:1.2,y:0,z:0};
 const blocked={walls:[],boxes:[],canMove:()=>false};
 for(let i=0;i<100;i++)steerEnemy(e,.05,i*50,peek,'ar',blocked,[e]);
 assert.equal(e.coverPlan,null);
 assert.equal(e.coverState,null);
 assert.ok(e.coverRetryAt>5000);
});

test('adaptive 3D quality degrades slowly, recovers slowly, and resets in XR',async()=>{
 const {createAdaptiveQuality}=await load('adaptive-quality.js');
 const q=createAdaptiveQuality(1.55);
 assert.equal(q.ratio,1.55);
 for(let i=0;i<35;i++)q.sample(.05,true);
 assert.equal(q.level,0,'a transient one-second hitch must not reduce quality');
 for(let i=0;i<175;i++)q.sample(.05,true);
 assert.equal(q.level,2,'sustained 20 FPS triggers two protective quality steps');
 assert.equal(q.ratio,1);
 for(let i=0;i<850;i++)q.sample(1/60,true);
 assert.equal(q.level,1,'sustained high FPS restores quality progressively');
 const change=q.sample(1/60,false);
 assert.equal(q.ratio,1.55,'switching away from demo restores full XR resolution');
 assert.equal(change?.level,0);
});

test('rescue and CTF suppress shots while bots hide behind cover',()=>{
 assert.match(read('main.js'),/if\(!exposed\)\{e\.burst=0/);
 assert.match(read('main.js'),/if\(rescueCombatArmed&&exposed&&onScreen&&e\.root\.visible&&rescueProtectionLeft\(t\)===0&&e\.burst>0/);
 assert.match(read('capture-flag.js'),/if\(e\.coverPlan&&e\.coverState!=='fire'\)continue/);
 assert.match(read('main.js'),/orbs\.length<42/);
 assert.match(read('main.js'),/new THREE\.Mesh\(enemyTracerGeometry,enemyTracerMaterial\)/);
 assert.doesNotMatch(read('main.js'),/shot\.mesh\.geometry\.dispose\(\)/);
});
