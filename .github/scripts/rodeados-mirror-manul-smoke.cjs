'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'../..');
const {spawnSync}=require('node:child_process');
function officialLikeZip(){
 // Exercise Sketchfab's officially documented scene.gltf + scene.bin + textures layout.
 const glb=buildTestGlb(),jsonLen=glb.readUInt32LE(12),binStart=20+jsonLen;
 const dataLen=glb.readUInt32LE(binStart),raw=glb.subarray(binStart+8,binStart+8+dataLen);
 const desc=JSON.parse(glb.subarray(20,20+jsonLen).toString().trim());
 desc.buffers[0].uri='scene.bin';
 const payload=JSON.stringify({description:desc,buffer:raw.toString('base64')});
 const python=[
 'import sys,json,base64,io,zipfile',
 'p=json.loads(sys.stdin.read())',
 'buff=io.BytesIO()',
 "with zipfile.ZipFile(buff,'w',zipfile.ZIP_DEFLATED) as z:",
 "    z.writestr('gltf/scene.gltf',json.dumps(p['description']))",
 "    z.writestr('gltf/scene.bin',base64.b64decode(p['buffer']))",
 'sys.stdout.buffer.write(buff.getvalue())'
 ].join('\n');
 const out=spawnSync('python3',['-c',python],{input:payload,maxBuffer:2e6});
 if(out.status!==0)throw Error('zip generation '+out.stderr?.toString());
 return out.stdout;
}

function buildTestGlb(){
 // A tiny legal glTF 2.0 GLB with a triangular humanoid-shaped visual test.
 // Test-only geometry, NOT the real Sketchfab M.A.N.U.L. asset.
 const coords=new Float32Array([-.26,0,.0,.26,0,.0,0,1.75,.0]);
 const data=Buffer.from(coords.buffer);
 const json={
  asset:{version:'2.0',generator:'RODEADOS visual-adapter CI'},
  scene:0,scenes:[{nodes:[0]}],nodes:[{name:'TestSkeletonWrapper',mesh:0}],
  meshes:[{primitives:[{attributes:{POSITION:0},mode:4}]}],
  buffers:[{byteLength:data.length}],
  bufferViews:[{buffer:0,byteOffset:0,byteLength:data.length}],
  accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[-.26,0,0],max:[.26,1.75,0]}]
 };
 const jsonData=Buffer.from(JSON.stringify(json));
 const jsonPadded=Buffer.concat([jsonData,Buffer.alloc((4-jsonData.length%4)%4,0x20)]);
 const binPadded=Buffer.concat([data,Buffer.alloc((4-data.length%4)%4)]);
 const header=Buffer.alloc(12),jchunk=Buffer.alloc(8),bchunk=Buffer.alloc(8);
 header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);
 header.writeUInt32LE(12+8+jsonPadded.length+8+binPadded.length,8);
 jchunk.writeUInt32LE(jsonPadded.length,0);jchunk.writeUInt32LE(0x4e4f534a,4);
 bchunk.writeUInt32LE(binPadded.length,0);bchunk.writeUInt32LE(0x004e4942,4);
 return Buffer.concat([header,jchunk,jsonPadded,bchunk,binPadded]);
}
const server=http.createServer((req,res)=>{
 let url;try{url=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{return res.writeHead(400).end()}
 if(url==='/')url='/index.html';
 const file=path.resolve(root,'.'+url);
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(err,data)=>{if(err)return res.writeHead(404).end('Missing '+url);
 res.writeHead(200,{'content-type':file.endsWith('.html')?'text/html':file.endsWith('.js')?'application/javascript':'application/octet-stream'}).end(data)});
});
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-web-security']});
  const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error')errors.push('console: '+msg.text())});
  await page.goto('http://127.0.0.1:'+server.address().port+'/Modo-caos/rodeados-manul.html?dev=1',{waitUntil:'load'});
  await page.waitForFunction(()=>!!globalThis.__RodeadosDebug,null,{timeout:25000});
  await page.waitForFunction(()=>!!globalThis.__RodeadosManulPreview||
   document.getElementById('manulStatus')?.textContent.includes('⚠'),null,{timeout:20000});
  assert(await page.evaluate(()=>!!globalThis.__RodeadosManulPreview),
   'preview init must work: '+(await page.locator('#manulStatus').innerText())+'; errors: '+errors.join(' | '));
  assert(await page.locator('#manulFile').count(),'3D import field must appear in isolated lab');
  assert.equal(await page.locator('#manulStatus').isVisible(),true);
  assert.equal(await page.evaluate(()=>__RodeadosManulPreview.actorStatus.enabled),false,'default models untouched until user selects actual asset');
  // A minimal synthetic glTF is legal input to actual GLTFLoader. No scraping.
  await page.locator('#manulFile').setInputFiles({name:'test-preview.glb',mimeType:'model/gltf-binary',buffer:buildTestGlb()});
  await page.waitForFunction(()=>__RodeadosManulPreview.status.includes('MODELO CARGADO'),null,{timeout:18000});
  assert.equal(await page.evaluate(()=>__RodeadosManulPreview.actorStatus.enabled),true);
  // Official Sketchfab downloads ZIP a glTF + BIN, not a standalone GLB.
  // Verify the whole user-facing process with this compatible package.
  await page.locator('#manulFile').setInputFiles({name:'sketchfab-test-gltf.zip',
   mimeType:'application/zip',buffer:officialLikeZip()});
  await page.waitForFunction(()=>__RodeadosManulPreview.status.includes('sketchfab-test-gltf.zip')||
   __RodeadosManulPreview.status.startsWith('⚠'),null,{timeout:16000});
  assert((await page.evaluate(()=>__RodeadosManulPreview.status)).includes('MODELO CARGADO'),
   'ZIP must load real nested scene.gltf+scene.bin: '+
   (await page.evaluate(()=>__RodeadosManulPreview.status))+'; errors: '+errors.join(' | '));

  // One-time manual import must survive page reload WITHOUT uploading to a
  // server or asking the player to browse Android Downloads each round.
  await page.waitForFunction(()=>__RodeadosManulPreview.savedName==='sketchfab-test-gltf.zip',null,{timeout:5500});
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>!!globalThis.__RodeadosManulPreview &&
   __RodeadosManulPreview.status.includes('MODELO CARGADO'),null,{timeout:20000});
  assert.equal(await page.evaluate(()=>__RodeadosManulPreview.actorStatus.enabled),true,
    'saved GLTF should restore automatically from browser-local IndexedDB');
  assert.equal(await page.evaluate(()=>__RodeadosManulPreview.savedName),'sketchfab-test-gltf.zip');
  assert.equal(await page.evaluate(()=>__RodeadosManulPreview.countLimit),4,'max four imported enemies simultaneously for AR');
  await page.locator('#manulFacing').selectOption('180');
  assert.equal(await page.evaluate(()=>__RodeadosManulPreview.facing),180,
    'player can rotate imported model when Sketchfab rig faces backwards');
  await page.locator('#startDemo').click();
  await page.waitForFunction(()=>__RodeadosDebug.renderedRobots>=2,null,{timeout:11000});
  const loaded=await page.evaluate(()=>({visual:__RodeadosManulPreview.actorStatus,phase:__RodeadosDebug.stage}));
  assert.equal(loaded.phase,'playing');
  assert(loaded.visual.external>=2,'loaded GLB replaces visible robots without modifying the gameplay core: '+JSON.stringify(loaded));
  await page.locator('#fire').tap();
  assert((await page.evaluate(()=>__RodeadosDebug.game.shots))>=1,'hit system untouched with GLB model');
  assert.equal(await page.evaluate(()=>__RodeadosDebug.game.ammo),28,'unlimited ammo retained');
  await page.locator('#pause').tap();
  // Force eight visually distinct enemies while paused; test quality
  // fallback budget does NOT remove enemies or suppress hitboxes.
  const budget=await page.evaluate(()=>__RodeadosManulPreview.testVisualBudget(8));

  assert.equal(budget.external,4,'only 4 premium animated models can render on mobile: '+JSON.stringify(budget));
  assert(budget.fallback>=4,'remaining enemies use fast original visuals rather than becoming invisible');
  await page.locator('#manulFallback').evaluate(el=>el.click());
  const fallback=await page.evaluate(()=>__RodeadosManulPreview.actorStatus);
  assert.equal(fallback.enabled,false,'fallback instantly restores original enemy renderer');
  await page.waitForTimeout(450);
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>!!globalThis.__RodeadosManulPreview,null,{timeout:20000});
  assert.equal(await page.evaluate(()=>__RodeadosManulPreview.actorStatus.enabled),false,
   'reset deletes browser-local model cache as advertised');
  assert.equal(await page.evaluate(()=>__RodeadosManulPreview.savedName),null,
   'deleted file is never restored automatically');

  // A new page reload resets the preview to home, with original robots.
  assert.equal((await page.evaluate(()=>__RodeadosManulPreview.actorStatus)).external,0,
   'all avatars restored to default after reset and reload');
  assert.deepEqual(errors,[],'no Three.js/asset-loader browser errors: '+errors.join(' | '));
  console.log('PASS M.A.N.U.L. V13: GLB+ZIP, IndexedDB local restore/clear, 4-clone budget, facing rotation and unchanged gun');
 }catch(e){console.error(e.stack||e);process.exitCode=1}
 finally{await browser?.close();await new Promise(r=>server.close(r))}
})();