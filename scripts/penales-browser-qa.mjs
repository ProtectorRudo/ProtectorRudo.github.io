import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const url='http://127.0.0.1:4173/Modo-caos/penales.html';
const errors=[];
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
page.on('pageerror',e=>errors.push('PAGEERROR '+e.message));
page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE '+m.text())});
page.on('requestfailed',r=>errors.push('NETWORK '+r.url()+' '+r.failure()?.errorText));
mkdirSync('artifacts',{recursive:true});
try{
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
 await page.locator('#cpuMode').click();
 await page.locator('#play3D').click();
 await page.locator('#viewport canvas').waitFor({state:'visible',timeout:40000});
 const gl=await page.locator('#viewport canvas').evaluate(e=>Boolean(e.getContext('webgl2')||e.getContext('webgl')));
 if(!gl)throw Error('WebGL context unavailable');
 await page.screenshot({path:'artifacts/penales-3d-mobile.png'});
 await page.locator('#startButton').click();
 if(!await page.locator('#callout').innerText().then(s=>s.includes('PATEÁ')))throw Error('Shoot turn not active');
 const box=await page.locator('#gesture').boundingBox();
 const x=box.x+box.width*.44,y=box.y+box.height*.68;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+108,y-136,{steps:7});await page.mouse.up();
 await page.waitForTimeout(2850);
 const newScore=await page.locator('#numbers').innerText();
 if(!/^\d+ : \d+$/.test(newScore))throw Error('Invalid score '+newScore);
 const round=await page.locator('#round').innerText();
 if(!round.includes('PENAL'))throw Error('Round status missing');
 await page.screenshot({path:'artifacts/penales-after-first-kick.png'});
 console.log(JSON.stringify({status:'PASS',gl,score:newScore,round,errors},null,2));
 if(errors.length)throw Error('Browser diagnostics: '+errors.join(' | '));
}finally{
 writeFileSync('artifacts/diagnostics.json',JSON.stringify({errors,url},null,2));
 await browser.close();
}
