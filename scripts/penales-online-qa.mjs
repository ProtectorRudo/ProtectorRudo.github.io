import {chromium} from 'playwright';
import {writeFileSync,mkdirSync} from 'node:fs';
const url='http://127.0.0.1:4173/Modo-caos/penales.html';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const c1=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),c2=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const host=await c1.newPage(),guest=await c2.newPage(),errors=[];
for(const [name,page] of [['host',host],['guest',guest]]){page.on('pageerror',e=>errors.push(name+': '+e.message));}
mkdirSync('artifacts',{recursive:true});
async function gesture(page,dx,dy){
 const b=await page.locator('#gesture').boundingBox();const x=b.x+b.width*.46,y=b.y+b.height*.64;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:9});await page.mouse.up();
}
try{
 await host.goto(url);await host.locator('#friendMode').click();await host.locator('#playerName').fill('QA HOST');
 await host.locator('#createRoom').click();
 try{await host.waitForFunction(()=>/^[A-F0-9]{8}$/.test(document.querySelector('#roomCode')?.textContent||''),null,{timeout:25000});}
 catch(e){throw Error('Create room failed: '+(await host.locator('#onlineNote').innerText()));}
 const code=await host.locator('#roomCode').innerText();console.log('ROOM_OK '+code);
 await guest.goto(url+'?room='+code);await guest.locator('#playerName').fill('QA GUEST');
 await guest.locator('#confirmJoin').click();
 await host.waitForFunction(()=>document.querySelector('#roomDetails')?.textContent.includes('2 / 2'),null,{timeout:22000});
 await guest.waitForFunction(()=>document.querySelector('#roomDetails')?.textContent.includes('2 / 2'),null,{timeout:22000});
 await host.locator('#readyRoom').click();await guest.locator('#readyRoom').click();
 await host.locator('#online3D').click();await guest.locator('#online3D').click();
 await host.locator('#startButton').click();
 await host.waitForFunction(()=>document.querySelector('#callout')?.textContent.includes('PATEÁ'),null,{timeout:20000});
 await guest.waitForFunction(()=>document.querySelector('#callout')?.textContent.includes('RIVAL APUNTA'),null,{timeout:20000});
 await gesture(host,100,-100);
 await guest.waitForFunction(()=>document.querySelector('#callout')?.textContent.includes('RIVAL PATEA'),null,{timeout:10000});
 await gesture(guest,-100,-90);
 await host.waitForFunction(()=>document.querySelector('#dotsA')?.textContent!=='○○○○○',null,{timeout:16000});
 await guest.waitForFunction(()=>document.querySelector('#dotsA')?.textContent!=='○○○○○',null,{timeout:16000});
 const marks=[await host.locator('#dotsA').innerText(),await guest.locator('#dotsA').innerText()];
 if(marks[0]!==marks[1])throw Error('Tanda divergente '+marks);
 if(errors.length)throw Error('Browser errors: '+errors.join(' | '));
 console.log(JSON.stringify({result:'PASS',code,marks,errors}));
}finally{
 await host.screenshot({path:'artifacts/penales-online-host.png'}).catch(()=>{});
 await guest.screenshot({path:'artifacts/penales-online-guest.png'}).catch(()=>{});
 writeFileSync('artifacts/penales-online-diagnostics.json',JSON.stringify({errors},null,2));
 await browser.close();
}
