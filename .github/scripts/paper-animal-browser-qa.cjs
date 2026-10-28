'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const site='https://protectorrudo.github.io/Modo-caos/';
 const assets=['marmot','fox','platypus','penguin','seaotter','koala','corgi','tiger'];
 for(const a of assets){
  const r=await fetch(site+'assets/mascots/'+a+'.glb',{method:'HEAD'});
  assert.equal(r.status,200,a+' GLB must be public');
 }
 for(const f of ['paper-animals-royale.html','paper-animals.css','paper-animals-3d.mjs']){
  const r=await fetch(site+f,{method:'HEAD'});assert.equal(r.status,200,f);
 }
 const errors=[],failed=[];
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+r.url());});
  await page.goto(site+'paper-animals-royale.html?qa=1&vs=1',{waitUntil:'domcontentloaded',timeout:65000});
  await page.waitForFunction(()=>document.querySelectorAll('#heroPicker .heroChoice').length===8,null,{timeout:10000});
  await page.waitForFunction(()=>[...document.querySelectorAll('#heroPicker img')].every(im=>im.complete&&im.naturalWidth>0),null,{timeout:10000});
  const first=await page.evaluate(()=>({name:document.getElementById('menuCharacterLabel').textContent,cards:document.querySelectorAll('#heroPicker .heroChoice').length,css:getComputedStyle(document.getElementById('home')).backgroundColor,mode:window.territoryQA?.mode}));
  assert.equal(first.cards,8);assert.equal(first.name,'MOMO');
  const cards=await page.evaluate(()=>[...document.querySelectorAll('#heroPicker .heroChoice')].map(node=>{
   const img=node.querySelector('img').getBoundingClientRect(),name=node.querySelector('b').getBoundingClientRect();
   return {name:node.querySelector('b').textContent,portraitBottom:Math.round(img.bottom),labelTop:Math.round(name.top),overlap:Math.round(img.bottom-name.top)};
  }));
  console.log('ANIMAL_CARDS',JSON.stringify(cards));
  assert.equal(cards.length,8);
  assert.ok(cards.every(x=>x.overlap<=5),'Cards should not overlap portrait and name');
  await page.waitForTimeout(3200);
  const ready=await page.evaluate(()=>({ready:window.PaperMenuReady===true,stage:document.getElementById('versus3dCanvas').parentElement.id}));
  await page.screenshot({path:'/tmp/paper-animal-menu.png',fullPage:true});
  await page.locator('[data-hero="7"]').click();
  await page.waitForFunction(()=>window.Paper3DState().menuHero===7&&document.getElementById('menuCharacterLabel').textContent==='TORA',null,{timeout:10000});
  await page.waitForTimeout(800);
  await page.screenshot({path:'/tmp/paper-animal-tora.png'});
  await page.locator('#start').click();
  await page.waitForFunction(()=>window.territoryQA?.mode==='versus',null,{timeout:7000});
  await page.waitForTimeout(1600);
  const showdown=await page.evaluate(()=>({player:document.getElementById('vsPlayerName').textContent,opponent:document.getElementById('vsRivalName').textContent,ready:window.PaperVSReady===true}));
  const boxes=await page.evaluate(()=>({
    stage:(()=>{const r=document.getElementById('versusStage').getBoundingClientRect();return{width:r.width,height:r.height};})(),
    modelPresent:window.PaperVSReady===true,
    playerAvatar:document.getElementById('vsPortraitPlayer').naturalWidth,
    rivalAvatar:document.getElementById('vsPortraitOpponent').naturalWidth,
    caption:document.querySelector('.versusHeader h2').textContent
  }));
  console.log('ANIMAL_VS_FIT',JSON.stringify(boxes));
  assert.ok(boxes.stage.width>250&&boxes.playerAvatar>0&&boxes.rivalAvatar>0);
  await page.screenshot({path:'/tmp/paper-animal-vs.png'});
  assert.equal(showdown.player,'TORA');assert.notEqual(showdown.opponent,'TORA');
  const portraitLayer=await page.evaluate(()=>({
   opacity:getComputedStyle(document.getElementById('vsPortraits')).opacity,
   ready:window.PaperVSReady===true
  }));
  console.log('ANIMAL_VS_LAYER',JSON.stringify(portraitLayer));
  assert.equal(Number(portraitLayer.opacity),1,'Portraits must remain visible while 3D compositing is under repair');
  const before=await page.evaluate(()=>window.territoryQA?.mode);
  if(before==='versus')await page.evaluate(()=>document.getElementById('vsPlayNow').click());
  await page.waitForFunction(()=>window.territoryQA?.mode==='play',null,{timeout:10000});
  await page.waitForTimeout(1000);
  const game=await page.evaluate(()=>({players:window.territoryQA.players,hero:window.Paper3DState().people[0].hero,mode:window.territoryQA.mode}));
  assert.equal(game.players,12);assert.equal(game.hero,7);
  const view=await page.evaluate(()=>{
   const r=document.getElementById('characterStage').getBoundingClientRect();
   return {width:r.width,height:r.height,viewportWidth:innerWidth,viewportHeight:innerHeight};
  });
  console.log('ANIMAL_WEBGL_VIEWPORT',JSON.stringify(view));
  assert.ok(view.width>=view.viewportWidth-2&&view.height>=view.viewportHeight-3,'3D stage must cover full mobile viewport');
  await page.screenshot({path:'/tmp/paper-animal-game.png'});
  console.log('ANIMAL_E2E',JSON.stringify({first,ready,showdown,game,errors,failed}));
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error('ANIMAL_E2E_FAIL',e.stack||e);process.exitCode=1;});
