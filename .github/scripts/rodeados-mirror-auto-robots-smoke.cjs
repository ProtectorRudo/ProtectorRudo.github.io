'use strict';
const assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
// A tiny synthetic glTF. This proves automatic model loading; it is not
// presented to consumers as the actual realistic licensed production asset.
function testGlb(){
 const vertices=new Float32Array([-.22,0,0,.22,0,0,0,1.75,0]);
 const bin=Buffer.alloc(16384);Buffer.from(vertices.buffer).copy(bin,0);
 const manifest={
  asset:{version:'2.0'},scenes:[{nodes:[0]}],scene:0,
  nodes:[{mesh:0,name:'SyntheticArmoredEnemy'}],
  meshes:[{primitives:[{attributes:{POSITION:0},mode:4}]}],
  buffers:[{byteLength:bin.length}],
  bufferViews:[{buffer:0,byteOffset:0,byteLength:bin.length}],
  accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[-.22,0,0],max:[.22,1.75,0]}]
 };
 const raw=Buffer.from(JSON.stringify(manifest));
 const jpad=Buffer.concat([raw,Buffer.alloc((4-raw.length%4)%4,32)]);
 const header=Buffer.alloc(12),j=Buffer.alloc(8),b=Buffer.alloc(8);
 header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);
 header.writeUInt32LE(12+8+jpad.length+8+bin.length,8);
 j.writeUInt32LE(jpad.length,0);j.writeUInt32LE(0x4e4f534a,4);
 b.writeUInt32LE(bin.length,0);b.writeUInt32LE(0x004e4942,4);
 return Buffer.concat([header,j,jpad,b,bin]);
}
const glb=testGlb();
const server=http.createServer((req,res)=>{
 let url;try{url=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{return res.writeHead(400).end()}
 if(url==='/Modo-caos/assets/rodeados/tactical-android.glb'){
  return res.writeHead(200,{'content-type':'model/gltf-binary','access-control-allow-origin':'*','content-length':glb.length}).end(glb);
 }
 const file=path.resolve(root,'.'+url);
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(err,data)=>{if(err)return res.writeHead(404).end();
  res.writeHead(200,{'content-type':file.endsWith('.html')?'text/html':file.endsWith('.js')?'application/javascript':'application/octet-stream'}).end(data)});
});
(async()=>{
 let browser;
 try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});
  const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base='http://127.0.0.1:'+server.address().port;
  // Even old LAB URLs open the game directly, not a requirement to download.
  await page.goto(base+'/Modo-caos/rodeados-manul.html?v=13',{waitUntil:'domcontentloaded'});
  await page.waitForURL('**/rodeados.html?v=14',{timeout:6500});
  assert.equal(await page.locator('#manulFile').count(),0,'no consumer-visible ZIP/GLB input');
  assert.equal(await page.locator('#manulPanel').count(),0,'manual integration panel cannot appear in arcade');
  await page.waitForFunction(()=>!!globalThis.__RodeadosAutoRobots,null,{timeout:20000});
  await page.waitForFunction(()=>['active','fallback'].includes(__RodeadosAutoRobots.status.phase),null,{timeout:20000});
  const ready=await page.evaluate(()=>__RodeadosAutoRobots.status);
  assert.equal(ready.phase,'active','automatic loader must actually install a 3D enemy without user action: '+JSON.stringify(ready));
  assert.equal(ready.maxExternal,4,'protect mobile WebXR by limiting simultaneous animated GLBs');
  await page.locator('#startDemo').click();
  await page.waitForFunction(()=>__RodeadosDebug.renderedRobots>=2,null,{timeout:11000});
  const shown=await page.evaluate(()=>__RodeadosAutoRobots.status);
  assert(shown.external>=2,'new imported models must replace original visuals at round start: '+JSON.stringify(shown));
  await page.locator('#fire').tap();
  assert((await page.evaluate(()=>__RodeadosDebug.game.shots))>0,'shot still works with automatic GLB');
  assert.equal(await page.evaluate(()=>__RodeadosDebug.game.ammo),28,'infinite bullets must stay unlimited');
  assert.deepEqual(errors,[],'no runtime errors when automatically loading GLB');
  console.log('PASS: legacy lab auto-redirects, no file picker; new 3D enemies spawn automatically with 4-avatar budget, shooter/AR core unaffected');
 }catch(e){console.error(e.stack||e);process.exitCode=1}
 finally{await browser?.close();await new Promise(r=>server.close(r))}
})();
