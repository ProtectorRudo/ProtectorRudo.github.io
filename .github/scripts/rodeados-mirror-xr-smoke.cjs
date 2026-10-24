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
  window.__simDrawCalls=0;window.__simEmulated=false;
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
   requestAnimationFrame(cb){return requestAnimationFrame(t=>cb(t,frame))},
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
 for(const e of start.game.enemies){
  const distance=Math.hypot(e.x-start.game.player.x,e.z-start.game.player.z);
  assert(distance>=3.1,`robots must start outside the camera, distance=${distance}`);
 }
 const ammoBefore=await page.evaluate(()=>__RodeadosDebug.game.ammo);
 await page.locator('#fire').tap();
 await page.waitForFunction(v=>__RodeadosDebug.game.ammo<v,ammoBefore,{timeout:2000});
 assert.equal(await page.evaluate(()=>__RodeadosDebug.game.shots),1,
  'Android XR touch dispatched pointerdown and fired exactly one bullet');

 assert((await page.evaluate(()=>__RodeadosDebug.compositorFrames))>8,
  'WebXR frames project actual world to separate DOM WebGL compositor');
 assert((await page.evaluate(()=>__RodeadosDebug.compositorCalls))>=2,
  'at least two physical 3D floor/robot objects reach compositor while playing');
 assert.equal(await page.evaluate(()=>__RodeadosDebug.compositorError),null,
  'overlay compositor produces no WebGL errors');
 assert(start.game.enemies.some(e=>e.z<start.game.player.z-.7),'at least one opening robot appears in front of forward-facing camera');
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
 await page.evaluate(()=>window.__simEmulated=false);
 assert.equal(errors.length,0,'no WebXR Javascript errors '+errors.join(' | '));
 console.log('PASS: simulated WebXR placement, gestures, 25 cells, noncenter calibration, real-pose movement and floor lock.');
 }catch(e){console.error(e.stack||e);process.exitCode=1}
 finally{await browser?.close();await new Promise(r=>server.close(r))}
})();
