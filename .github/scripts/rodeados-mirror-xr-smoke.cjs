'use strict';
/* Synthetic WebXR test for RODEADOS 360.
   Chrome and WebGL are real. XR viewer, plane, anchors and camera are mocked;
   this DOES NOT validate Android ARCore sensor tracking or a physical room. */
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const server=http.createServer((req,res)=>{
 let p;try{p=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{return res.writeHead(400).end()}
 if(p==='/')p='/index.html';const file=path.resolve(root,'.'+p);
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(err,data)=>{if(err)return res.writeHead(404).end('Not found');
  res.writeHead(200,{'content-type':p.endsWith('.html')?'text/html':'text/javascript'}).end(data)});
});
(async()=>{
 let browser;
 try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const matrix=(x=0,y=0,z=0)=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1]);
  window.__simPhone={x:0,y:1.54,z:0};
  window.__simDrawCalls=0;window.__simEmulated=false;window.__mockFrameActive=false;window.__strictXRFrame=false;
  const draw=WebGLRenderingContext.prototype.drawArrays;
  WebGLRenderingContext.prototype.drawArrays=function(...args){window.__simDrawCalls++;return draw.apply(this,args)};
  const draw2=WebGL2RenderingContext?.prototype.drawArrays;
  if(draw2)WebGL2RenderingContext.prototype.drawArrays=function(...args){window.__simDrawCalls++;return draw2.apply(this,args)};
  WebGLRenderingContext.prototype.makeXRCompatible=async()=>{};
  if(window.WebGL2RenderingContext)WebGL2RenderingContext.prototype.makeXRCompatible=async()=>{};
  const ori={x:0,y:0,z:0,w:1};
  const floorPose={transform:{matrix:matrix(0,0,-2.8),position:{x:0,y:0,z:-2.8},orientation:ori}};
  const hit={getPose:()=>floorPose,createAnchor:async()=>({anchorSpace:{name:'anchor'},delete(){}})};
  const proj=new Float32Array([3.1,0,0,0,0,1.58,0,0,0,0,-1.003,-1,0,0,-.10,0]);
  const frame={
   getViewerPose:()=>{
    if(window.__strictXRFrame&&!window.__mockFrameActive)throw new DOMException('XRFrame is no longer active','InvalidStateError');
    const p=window.__simPhone;
    return {emulatedPosition:!!window.__simEmulated,transform:{position:{...p},orientation:ori,matrix:matrix(p.x,p.y,p.z)},
     views:[{eye:'none',projectionMatrix:proj,transform:{position:{...p},orientation:ori,matrix:matrix(p.x,p.y,p.z),inverse:{matrix:matrix(-p.x,-p.y,-p.z)}}}]};
   },
   getHitTestResults:()=>[hit],
   getPose:()=>floorPose
  };
  const session={
   renderState:{baseLayer:null,depthNear:.03,depthFar:35},
   visibilityState:'visible',inputSources:[],listeners:{},
   updateRenderState(o){Object.assign(this.renderState,o)},
   async requestReferenceSpace(type){return{type}},
   async requestHitTestSource(){return{cancel(){}}},
   addEventListener(ev,cb){(this.listeners[ev]||=[]).push(cb)},
   removeEventListener(){},
   requestAnimationFrame(cb){return requestAnimationFrame(t=>{window.__mockFrameActive=true;try{cb(t,frame)}finally{window.__mockFrameActive=false}})},
   cancelAnimationFrame(id){cancelAnimationFrame(id)},
   async end(){for(const fn of this.listeners.end||[])fn()}
  };
  class Layer{
   constructor(s,gl){this.framebuffer=null;this.framebufferWidth=gl.drawingBufferWidth||393;this.framebufferHeight=gl.drawingBufferHeight||852;}
   getViewport(){return{x:0,y:0,width:this.framebufferWidth,height:this.framebufferHeight}}
  }
  Object.defineProperty(window,'XRWebGLLayer',{configurable:true,value:Layer});
  Object.defineProperty(navigator,'xr',{configurable:true,value:{isSessionSupported:async()=>true,requestSession:async()=>session}});
 });
 const url='http://127.0.0.1:'+server.address().port+'/Modo-caos/rodeados.html';
 await page.goto(url,{waitUntil:'load'});
 await page.waitForFunction(()=>!!window.__RodeadosDebug,null,{timeout:25000});
 await page.locator('#startAR').click();
 await page.waitForFunction(()=>window.__RodeadosDebug?.stage==='edit',null,{timeout:7000});
 assert(await page.locator('#touch').isVisible(),'touch editing surface visible');
 await page.waitForFunction(()=>__RodeadosDebug.compositorFrames>4,null,{timeout:6500});
 assert.equal(await page.locator('#arWorldOverlay canvas').count(),1,'separate WebGL world inside XR DOM overlay');
 assert(await page.locator('#arWorldOverlay').isVisible(),'AR world canvas is visible over camera passthrough');
 assert((await page.evaluate(()=>__RodeadosDebug.compositorCalls))>0,'actual floor geometry reaches Blackzone compositor draw call');
 assert.equal(await page.locator('#arWorldOverlay').evaluate(el=>getComputedStyle(el).pointerEvents),'none',
  'transparent 3D world does not steal taps from HUD and floor editor');
 await page.waitForFunction(()=>__RodeadosDebug.gridVisible>0,null,{timeout:4000});
 assert.equal(await page.locator('#cellsvg polygon').count(),25,'all 25 floor cells are visible as an anchored overlay DURING placement');
 assert(await page.locator('#cellsvg').isVisible(),'floor projection is visible before lock, not only after');
 await page.locator('#refreshFloor').click();
 assert.equal(await page.evaluate(()=>__RodeadosDebug.stage),'edit','recenter returns an editable visible floor');
 const before=await page.evaluate(()=>({size:__RodeadosDebug.floorSize,pose:__RodeadosDebug.floorTransform,yaw:__RodeadosDebug.yaw}));
 await page.locator('#larger').click();
 assert((await page.evaluate(()=>__RodeadosDebug.floorSize))>before.size+.10,'increase tile size');
 await page.locator('#smaller').click();
 assert(Math.abs((await page.evaluate(()=>__RodeadosDebug.floorSize))-before.size)<.01,'decrease tile size');
 await page.locator('#turn').click();
 assert((await page.evaluate(()=>__RodeadosDebug.yaw))>.22,'rotation applied');
 await page.mouse.move(150,375);await page.mouse.down();
 await page.mouse.move(197,410,{steps:4});await page.mouse.up();
 const moved=await page.evaluate(()=>__RodeadosDebug.editorShift);
 assert(Math.hypot(moved.x,moved.z)>.08,'finger drag changes physical floor origin');
 const pad=await page.locator('#touch').boundingBox();
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:130,y:350,id:1},{x:255,y:350,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:122,y:332,id:1},{x:263,y:375,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:110,y:315,id:1},{x:280,y:395,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.locator('#lock').click();
 await page.waitForFunction(()=>__RodeadosDebug.stage==='cell',null,{timeout:4000});
 await page.waitForFunction(()=>document.querySelectorAll('#cellsvg polygon').length===25,null,{timeout:3500});
 assert.equal(await page.locator('#cellsvg polygon').count(),25,'25 physical floor squares projected');
 assert(await page.locator('#begin').isDisabled(),'start blocked until manual cell pick');
 await page.evaluate(()=>{document.querySelectorAll('#cellsvg polygon')[6].dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));});
 await page.waitForFunction(()=>__RodeadosDebug.selectedCell===6,null,{timeout:2000});
 await page.waitForFunction(()=>__RodeadosDebug.calibrated,null,{timeout:7000});
 const fixed=await page.evaluate(()=>({pose:__RodeadosDebug.floorTransform,player:__RodeadosDebug.player,side:__RodeadosDebug.floorSize}));
 assert(Math.abs(fixed.player.x+fixed.side/5)<.03&&Math.abs(fixed.player.z+fixed.side/5)<.03,'noncentral 5x5 selected player placement');
 assert(await page.locator('#begin').isEnabled(),'calibration enables battle');
 assert(!await page.locator('#radarWrap').isVisible(),'radar does not obstruct calibration');
 await page.locator('#begin').click();
 await page.waitForFunction(()=>__RodeadosDebug.stage==='playing',null,{timeout:5500});
 await page.waitForFunction(()=>__RodeadosDebug.renderedRobots>=2,null,{timeout:3500});
 const start=await page.evaluate(()=>({game:__RodeadosDebug.game,meshes:__RodeadosDebug.renderedRobots}));
 assert(start.game.enemies.length>=2,'two robots exist at start');
 assert(start.meshes>=2,'both robots have live Three.js 3D meshes');
 assert(start.game.enemies.length===2,'intro launches exactly two robots');
 const eyeLocal=await page.evaluate(()=>__RodeadosDebug.openingEyePosition);
 assert(eyeLocal&&Number.isFinite(eyeLocal.x)&&Number.isFinite(eyeLocal.z),
  'opening robots reference the real tracked XR eye');
 for(const e of start.game.enemies){
  const distance=Math.hypot(e.x-eyeLocal.x,e.z-eyeLocal.z);
  assert(distance>=3.14,`robots must start 3m away from the PHYSICAL phone, distance=${distance}`);
 }
 // Emulate ARCore's real XRFrame lifecycle: DOM pointerdown cannot read an expired
 // XRFrame outside requestAnimationFrame. This previously silently left ammo at 28.
 await page.evaluate(()=>window.__strictXRFrame=true);
 await page.waitForTimeout(100);
 const aimFresh=await page.evaluate(()=>__RodeadosDebug.aimAge);
 assert(aimFresh!==null&&aimFresh<1000,'reticle must be sampled from active XRFrames');
 const shotsBefore=await page.evaluate(()=>__RodeadosDebug.game.shots);
 await page.locator('#fire').tap();
 await page.waitForFunction(v=>__RodeadosDebug.game.shots>v,shotsBefore,{timeout:2000});
 assert.equal(await page.evaluate(()=>__RodeadosDebug.game.ammo),28,'AR shooter never runs out of bullets');
 assert.equal(await page.evaluate(()=>__RodeadosDebug.game.shots),1,
  'Android XR touch dispatched pointerdown and fired once');
 assert.equal(await page.evaluate(()=>__RodeadosDebug.shotStatus),'IMPACTO',
  'shot must use the cached live XR ray, never silently abort due to stale XRFrame');
 assert.equal(await page.evaluate(()=>__RodeadosDebug.aimFailures),0,
  'no exception when sampling the active WebXR frame');
 assert((await page.evaluate(()=>__RodeadosDebug.game.hits))>=1,
  'center-screen reticle must really damage the first centered 3D robot');
 assert((await page.evaluate(()=>__RodeadosDebug.game.score))>0,
  'visible shot scores points instead of silently missing');


 assert((await page.evaluate(()=>__RodeadosDebug.compositorFrames))>8,
  'WebXR frames project actual world to separate DOM WebGL compositor');
 assert((await page.evaluate(()=>__RodeadosDebug.compositorCalls))>=2,
  'at least two physical 3D floor/robot objects reach compositor while playing');
 assert.equal(await page.evaluate(()=>__RodeadosDebug.compositorError),null,
  'overlay compositor produces no WebGL errors');
 // The arena can be rotated by the user's gesture; local -Z is not the XR eye's forward axis.
 await page.evaluate(()=>window.__simPhone.x=.18);
 await page.waitForTimeout(400);
 const now=await page.evaluate(()=>({pose:__RodeadosDebug.floorTransform,player:__RodeadosDebug.player}));
 assert(Math.abs(now.player.x-fixed.player.x)>.05,'tracked phone movement changes YOU marker');
 assert.deepEqual(now.pose,fixed.pose,'floor stays stable while physical phone moves');
 await page.evaluate(()=>window.__simEmulated=true);
 await page.waitForTimeout(1600);
 const degraded=await page.evaluate(()=>({stage:__RodeadosDebug.stage,tracking:__RodeadosDebug.tracking,meshes:__RodeadosDebug.renderedRobots}));
 assert.equal(degraded.stage,'playing','ARCore orientation-only estimated position MUST NOT false-pause active combat');
 assert(degraded.tracking.pose&&degraded.tracking.limited,'emulated position is reported as limited but the viewer pose stays usable');
 assert(degraded.meshes>=2,'real 3D robot models persist with ARCore emulated positioning');
 assert(await page.locator('#radarWrap').isVisible(),'360 radar still visible in limited positioning');
 const war=await page.evaluate(()=>__RodeadosDebug.floorRendering);
 assert.equal(war.darkPlates,25,'world-locked war floor is present in Android WebXR overlay');
 assert.equal(war.visible,25,'every armor plate appears in gameplay, not only in calibration');

 await page.evaluate(()=>window.__simEmulated=false);
 assert(await page.locator('#bomb').isVisible(),'area bomb button visible inside WebXR DOM overlay');
 await page.locator('#bomb').tap();
 assert.equal(await page.evaluate(()=>__RodeadosDebug.game.bombsUsed),1,
  'real Android pointerdown throws one world-space bomb, never two');
 assert(await page.locator('#bomb').isDisabled(),'team bomb limited by cooldown');
 await page.waitForFunction(()=>__RodeadosDebug.game.bombHits>0,null,{timeout:8500});
 assert((await page.evaluate(()=>__RodeadosDebug.game.fx.some(f=>f.type==='bombBlast')))||
  (await page.evaluate(()=>__RodeadosDebug.game.bombHits))>0,'spatial explosion damages nearby robots');
 assert.equal(errors.length,0,'no WebXR Javascript errors '+errors.join(' | '));
 console.log('PASS: simulated WebXR placement, gestures, 25 cells, noncenter calibration, real-pose movement and floor lock.');
 }catch(e){console.error(e.stack||e);process.exitCode=1}
 finally{await browser?.close();await new Promise(r=>server.close(r))}
})();
