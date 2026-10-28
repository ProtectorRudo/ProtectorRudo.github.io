'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const uri='https://protectorrudo.github.io/Modo-caos/cvdom.html?qa=1&vs=1';
 const errors=[],missing=[];let browser;
 try{
  const exe=process.env.CHROME_BIN;
  browser=await chromium.launch({headless:true,executablePath:exe||undefined,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()===404)missing.push(r.url());});
  await page.goto(uri,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#heroPicker [data-hero]').length===8,null,{timeout:15000});
  const cards=await page.evaluate(()=>({
   title:document.title,
   roster:[...document.querySelectorAll('#heroPicker .heroChoice b')].map(el=>el.textContent),
   menuName:document.querySelector('#menuCharacterLabel')?.textContent
  }));
  assert.deepEqual(cards.roster,['CAPY','RUBY','AXI','PINGO','ROCKY','BRINCO','FÉNIX','OSO']);
  await page.waitForFunction(()=>window.PaperMenuReady===true,null,{timeout:30000});
  const load=await page.evaluate(()=>window.PaperMascotQA());
  assert.equal(load.models,8);
  assert.equal(load.menuReady,true);
  await page.screenshot({path:'/tmp/cvdom-home-mobile.png',fullPage:true});
  await page.locator('[data-hero="2"]').click();
  await page.waitForFunction(()=>document.querySelector('#menuCharacterLabel')?.textContent==='AXI'&&window.PaperMenuReady===true,null,{timeout:12000});
  await page.screenshot({path:'/tmp/cvdom-axi-mobile.png'});
  await page.locator('#start').click();
  await page.waitForFunction(()=>window.territoryQA?.mode==='versus',null,{timeout:9000});
  await page.waitForFunction(()=>window.PaperVSReady===true,null,{timeout:10000});
  const names=await page.evaluate(()=>({you:document.querySelector('#vsPlayerName').textContent,rival:document.querySelector('#vsRivalName').textContent}));
  assert.equal(names.you,'AXI');assert.notEqual(names.rival,'AXI');
  const poses=[];
  for(let i=0;i<9;i++){
   poses.push(await page.evaluate(()=>window.PaperMascotQA().versus.map(a=>({left:a.left,right:a.right,hero:a.hero}))));
   await page.waitForTimeout(270);
  }
  for(let i=1;i<poses.length;i++)for(let j=0;j<2;j++){
   assert.ok(Math.abs(poses[i][j].left-poses[i-1][j].left)<.9,'Left arm flicked or accumulated transforms');
   assert.ok(Math.abs(poses[i][j].right-poses[i-1][j].right)<.9,'Right arm flicked or accumulated transforms');
   assert.ok(Math.abs(poses[i][j].left)<2.2&&Math.abs(poses[i][j].right)<2.2,'Arms exceed natural envelope');
  }
  const range=(joint)=>Math.max(...poses.map(x=>x[0][joint]))-Math.min(...poses.map(x=>x[0][joint]));
  assert.ok(range('left')+range('right')>.08,'Six-Seven animation never visibly changed over the 2.4-second test');
  await page.screenshot({path:'/tmp/cvdom-versus-mobile.png'});
  await page.evaluate(()=>document.getElementById('vsPlayNow').click());
  await page.waitForFunction(()=>window.territoryQA?.mode==='play',null,{timeout:9000});
  await page.waitForFunction(()=>window.Paper3DReady?.[0]===true,null,{timeout:9000});
  const play=await page.evaluate(()=>({players:window.territoryQA.players,playing:window.Paper3DState().playing,hero:window.Paper3DState().people[0].hero}));
  assert.equal(play.players,12);assert.equal(play.playing,true);assert.equal(play.hero,2);
  await page.screenshot({path:'/tmp/cvdom-game-mobile.png'});
  await page.locator('#pause').click();
  await page.locator('#restart').click();
  await page.waitForFunction(()=>window.territoryQA?.mode==='versus',null,{timeout:9000});
  const result={cards,load,names,poses,play,missing,errors};
  console.log('CVDOM_ANDROID_AUDIT',JSON.stringify(result));
  assert.equal(missing.filter(x=>/paper-|cvdom|mascots|animals/.test(x)).length,0,'One of the published modules or assets is missing');
  assert.equal(errors.length,0,'Unexpected JS runtime errors: '+errors.join(';'));
  console.log('PASS: eight CVDOM mascots visible, 3D preview, smoothly moving Six-Seven, game and rematch');
 }catch(e){console.error('CVDOM_BROWSER_FAIL',e.stack||e);process.exitCode=1;}
 finally{if(browser)await browser.close();}
})();