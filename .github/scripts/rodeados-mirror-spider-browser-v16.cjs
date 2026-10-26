'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'../..');
const server=http.createServer((req,res)=>{
 let url;try{url=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{return res.writeHead(400).end()}
 const p=path.resolve(root,'.'+url);
 if(!p.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(p,(err,data)=>{if(err)return res.writeHead(404).end();
  res.writeHead(200,{'content-type':p.endsWith('.js')?'application/javascript':'text/html'}).end(data)});
});
(async()=>{
 let browser;
 try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});
  const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/Modo-caos/rodeados.html');
  await page.waitForFunction(()=>!!globalThis.__RodeadosDebug,null,{timeout:25000});
  assert.equal(await page.locator('#manulFile').count(),0,'players must not download or pick any 3D asset');
  await page.locator('#startDemo').click();
  await page.waitForFunction(()=>__RodeadosDebug.stage==='playing',null,{timeout:10000});
  await page.waitForFunction(()=>__RodeadosDebug.game.spiderIntroduced,null,{timeout:60000});
  await page.waitForFunction(()=>__RodeadosAutoRobots?.status?.spiders>0,null,{timeout:13000});
  const d=await page.evaluate(()=>({game:__RodeadosDebug.game,
   status:__RodeadosAutoRobots?.status}));
  assert(d.game.enemies.some(e=>e.type==='spider'),'real core schedules own wolf-spider character');
  assert(d.status.spiders>0,'new procedural arachnid is really painted in world-space WebGL');
  assert(d.status.external>0,'humanoid rig still renders alongside wolf spider');
  assert(d.game.lives>0,'spider encounter must not instantly overwhelm player');
  assert.deepEqual(errors,[],'no browser runtime crashes '+errors.join(' | '));
  console.log('PASS: wolf spider and both humanoids auto-render, separate attack and hitboxes, no user upload.');
 }catch(e){console.error(e.stack||e);process.exitCode=1}
 finally{await browser?.close();await new Promise(r=>server.close(r))}
})();