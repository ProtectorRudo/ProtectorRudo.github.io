'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto('http://127.0.0.1:8765/Modo-caos/rodeados.html',{waitUntil:'load'});
 assert.equal(response.status(),200);
 await page.waitForFunction(()=>!!window.__RodeadosDebug,{timeout:18000});
 assert.equal(await page.locator('#refreshFloor').count(),1);
 assert.equal(await page.locator('#manualPlace').count(),1);
 const assets=await page.locator('script[src]').evaluateAll(elements=>elements.map(e=>e.getAttribute('src')));
 assert(assets.every(url=>url.startsWith('/Modo-caos/')),JSON.stringify(assets));
 await page.locator('#startDemo').click();
 await page.waitForFunction(()=>__RodeadosDebug.stage==='playing',{timeout:3000});
 await page.waitForTimeout(500);
 assert(await page.locator('#radarWrap').isVisible());
 const before=await page.evaluate(()=>__RodeadosDebug.game.shots);
 await page.locator('#fire').click();
 await page.waitForTimeout(140);
 assert((await page.evaluate(()=>__RodeadosDebug.game.shots))>before);
 assert.deepEqual(errors,[]);
 console.log('MODO CAOS PAGES MIRROR: PASS -- runtime loaded, 3D WebGL gameplay works, floor controls exist, shot works');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
