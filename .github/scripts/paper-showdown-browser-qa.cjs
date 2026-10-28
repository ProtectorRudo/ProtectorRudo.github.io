'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const site='https://protectorrudo.github.io/Modo-caos/';
 const uri=site+'paper-menu-nuevo.html?qa=1&vs=1';
 const errors=[],glbs=[],missing=[];
 let browser;
 try{
  // Verify public assets before starting the browser. A source file in git alone is insufficient.
  for(const file of ['archer.glb','merchant.glb','student.glb','ninja.glb']){
   const r=await fetch(site+'assets/styloo/'+file,{method:'HEAD'});
   assert.equal(r.status,200,'3D asset inaccessible: '+file);
   glbs.push({file,size:Number(r.headers.get('content-length')||0)});
  }
  const exe=process.env.CHROME_BIN;
  browser=await chromium.launch({headless:true,executablePath:exe||undefined,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()===404)missing.push(r.url());});
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text().slice(0,200));});
  await page.goto(uri,{waitUntil:'domcontentloaded',timeout:70000});

  await page.waitForFunction(()=>window.PaperMenuReady===true,{timeout:18000});
  const menuDefault=await page.evaluate(()=>({
    hero:window.Paper3DState().menuHero,
    selected:document.getElementById('menuCharacterLabel').textContent,
    canvasParent:document.getElementById('versus3dCanvas').parentElement.id,
    oldAvatar:!!document.querySelector('.avatarDemo'),
    menu3d:window.PaperMenuReady===true
  }));
  assert.equal(menuDefault.canvasParent,'menuHeroStage');
  assert.equal(menuDefault.selected,'NOVA');
  assert.equal(menuDefault.oldAvatar,false);
  await page.screenshot({path:'/tmp/paper-menu-android.png'});
  await page.locator('[data-hero="2"]').click();
  await page.waitForFunction(()=>window.PaperMenuReady&&window.Paper3DState().menuHero===2,{timeout:12000});
  const menuChange=await page.evaluate(()=>({
    selected:document.getElementById('menuCharacterLabel').textContent,
    hero:window.Paper3DState().menuHero,
    modelReady:window.PaperMenuReady,
    originalRemoved:!document.querySelector('.avatarDemo')
  }));
  assert.equal(menuChange.selected,'KIRA');
  assert.equal(menuChange.hero,2);
  await page.screenshot({path:'/tmp/paper-menu-kira-android.png'});
  console.log('BROWSER_QA_MENU',JSON.stringify({menuDefault,menuChange}));
  await page.locator('#start').click();
  await page.waitForFunction(()=>window.territoryQA?.mode==='versus',{timeout:8000});
  const startNames=await page.evaluate(()=>({
   you:document.getElementById('vsPlayerName').textContent,
   opponent:document.getElementById('vsRivalName').textContent,
   emote:document.getElementById('vsCountdown').textContent
  }));
  assert.notEqual(startNames.you,startNames.opponent);
  await page.waitForTimeout(1700);
  const preview=await page.evaluate(()=>({
   ready:window.PaperVSReady===true,
   stageVisible:getComputedStyle(document.getElementById('versus')).display!=='none',
   threeLoaded:!!document.querySelector('script[src="./paper-3d.mjs"]'),
   countdown:document.getElementById('vsCountdown').textContent
  }));
  assert.equal(preview.stageVisible,true);
  assert.equal(preview.ready,true,'The real Styloo chibi model must render in the VS stage');
  assert.equal(await page.evaluate(()=>document.getElementById('versus3dCanvas').parentElement.id),'versusStage');
  await page.screenshot({path:'/tmp/paper-vs-android.png'});
  await page.waitForTimeout(850);
  if((await page.evaluate(()=>window.territoryQA?.mode))==='versus')await page.screenshot({path:'/tmp/paper-vs-dance-second-android.png'});
  console.log('BROWSER_QA_PREVIEW',JSON.stringify({startNames,preview,assetHeads:glbs}));
  const before=await page.evaluate(()=>window.territoryQA?.mode);
  if(before==='versus')await page.evaluate(()=>document.getElementById('vsPlayNow').click());
  else assert.equal(before,'play','The game should auto-start if VS has already finished');
  await page.waitForFunction(()=>window.territoryQA?.mode==='play',{timeout:15000});
  await page.waitForTimeout(1100);
  const state=await page.evaluate(()=>({
   mode:window.territoryQA.mode,
   players:window.territoryQA.players,
   playing:window.Paper3DState().playing,
   stage:!!document.getElementById('characterStage'),
   hero:window.Paper3DState().people[0].hero
  }));
  assert.equal(state.mode,'play');assert.equal(state.players,12);assert.equal(state.playing,true);
  await page.screenshot({path:'/tmp/paper-game-android.png'});
  // Paused restart is required to show the VS again.
  const beforeReplay=await page.evaluate(()=>window.territoryQA?.mode);
  if(beforeReplay==='play'){await page.locator('#pause').click();await page.locator('#restart').click();}
  else if(beforeReplay==='result')await page.locator('#again').click();
  else throw new Error('Unexpected state before restart: '+beforeReplay);
  await page.waitForFunction(()=>window.territoryQA?.mode==='versus',{timeout:8000});
  console.log('BROWSER_QA',JSON.stringify({menuDefault,menuChange,startNames,preview,state,assetHeads:glbs,missing,errors}));
  assert.equal(errors.filter(e=>!/WebGL|GPU|console:/.test(e)).length,0,'Unexpected gameplay page errors: '+errors.join('; '));
  console.log('PASS: real GLB hero appears on menu; selection changes the model; shared canvas moves to VS; game and restart function');
 }catch(e){console.error('BROWSER_QA_FAIL',e.stack||e);process.exitCode=1;}
 finally{if(browser)await browser.close();}
})();