import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const load=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const main=load('main.js'),html=load('index.html'),css=load('style.css');

test('V25 separates native XR frame loop from composited world geometry',()=>{
 assert.ok(main.includes('renderer.render(nativeXRScene,camera);'));
 assert.ok(main.includes('arCompositor.render(world,renderer.xr.getCamera(camera))'));
 assert.ok(main.includes('openArCompositor()'));
 assert.ok(main.includes('closeArCompositor()'));
 assert.ok(main.includes('arCompositor?.resize()'));
 assert.ok(main.includes('world.background=null;world.fog=null;openArCompositor()'));
});
test('native DOM overlay contains a transparent WebGL scene layer beneath game HUD',()=>{
 assert.ok(html.includes('<div id="ui"><div id="arWorldOverlay"'));
 assert.ok(html.includes('id="activateCombat"'));
 assert.ok(css.includes('#arWorldOverlay canvas'));
 assert.ok(css.includes('#ui>#hud{z-index:2}'));
 assert.ok(css.includes('.activateCombat'));
});
test('Rescue and hostage remain invulnerable until users explicitly acknowledge visibility',()=>{
 assert.ok(main.includes('rescueCombatArmed=mode!==\'ar\''));
 assert.ok(main.includes('!rescueCombatArmed||rescueProtectionLeft()>0'));
 assert.ok(main.includes("if(rescueCombatArmed&&exposed&&onScreen"));
 assert.ok(main.includes("if(rescueCombatArmed)seconds=Math.max(0,seconds-dt)"));
 assert.ok(main.includes("rescueCombatArmed=true;"));
 assert.ok(load('missions.js').includes('api.rescueProtected?.()'));
});
test('independent WebGL canvas copies XR world and eye projection matrices',async()=>{
 const {createArCompositor}=await import('data:text/javascript;base64,'+
   Buffer.from(load('ar-compositor.js')).toString('base64'));
 const priorWidth=globalThis.innerWidth,priorHeight=globalThis.innerHeight;
 globalThis.innerWidth=380;globalThis.innerHeight=820;
 const record={};
 class Matrix{
   constructor(){this.id='empty'}
   copy(from){this.id=from.id;return this}
 }
 class FakeCamera{
   constructor(){
    this.matrix=new Matrix();this.matrixWorld=new Matrix();
    this.matrixWorldInverse=new Matrix();this.projectionMatrix=new Matrix();
    this.projectionMatrixInverse=new Matrix();this.layers={mask:1};this.matrixAutoUpdate=true;
   }
 }
 class FakeRenderer{
   constructor(){this.domElement={remove(){record.removed=true}}}
   setClearColor(color,alpha){record.alpha=alpha}
   setPixelRatio(ratio){record.ratio=ratio}
   setSize(w,h){record.size=[w,h]}
   render(scene,camera){record.scene=scene;record.camera=camera;record.calls=(record.calls||0)+1}
   dispose(){record.disposed=true}
 }
 try{
   const host={appendChild(el){record.appended=el}};
   const composer=createArCompositor({WebGLRenderer:FakeRenderer,PerspectiveCamera:FakeCamera,
    SRGBColorSpace:'srgb',ACESFilmicToneMapping:'aces'},host,1.1);
   const eye={matrixWorld:{id:'XR_POSE'},matrixWorldInverse:{id:'XR_INVERSE'},
     projectionMatrix:{id:'XR_PROJECTION'},projectionMatrixInverse:{id:'XR_P_INVERSE'},
     layers:{mask:1},near:.01,far:60};
   assert.equal(composer.render({id:'world'},{cameras:[eye]}),true);
   assert.equal(record.camera.matrixWorld.id,'XR_POSE');
   assert.equal(record.camera.matrix.id,'XR_POSE');
   assert.equal(record.camera.projectionMatrix.id,'XR_PROJECTION');
   assert.equal(record.camera.projectionMatrixInverse.id,'XR_P_INVERSE');
   assert.equal(record.camera.matrixAutoUpdate,false);
   assert.equal(record.scene.id,'world');
   assert.equal(record.calls,1);
   assert.equal(record.alpha,0);
   assert.equal(composer.frames,1);
   composer.resize(400,750);
   assert.deepEqual(record.size,[400,750]);
   composer.dispose();
   assert.equal(record.disposed,true);
   assert.equal(record.removed,true);
 }finally{globalThis.innerWidth=priorWidth;globalThis.innerHeight=priorHeight}
});
test('V25 browser sources remain syntactically valid',()=>{
 for(const name of ['main.js','ar-compositor.js','missions.js']){
   const r=spawnSync(process.execPath,['--check','--input-type=module'],
    {input:load(name),encoding:'utf8'});
   assert.equal(r.status,0,name+': '+r.stderr);
 }
});
