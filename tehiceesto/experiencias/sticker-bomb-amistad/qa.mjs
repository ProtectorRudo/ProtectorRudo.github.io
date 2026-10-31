import {chromium} from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base=process.env.MODEL_URL||"https://tehiceesto.com/experiencias/sticker-bomb-amistad";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const ids=["confidente","familia","memes","audios","plans","rescue","chaos","moments","code","time","future"];
await fs.mkdir("/tmp/sticker-bomb-preview",{recursive:true});
const report=[];
try {
 for(const width of [320,360,390,430,1280]){
  const page=await browser.newPage({viewport:{width,height:850},isMobile:width<700,hasTouch:width<700,deviceScaleFactor:1});
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  const res=await page.goto(base,{waitUntil:"domcontentloaded",timeout:60000});
  assert.equal(res?.status(),200,"preview response");
  await page.getByRole("button",{name:/Abrir nuestro expediente/}).waitFor();
  if(width===390)await page.screenshot({path:"/tmp/sticker-bomb-preview/portada-movil.png",fullPage:true});
  await page.getByRole("button",{name:/Abrir nuestro expediente/}).click();
  assert.equal(await page.locator(".sticker").count(),12);
  if(width===390)await page.screenshot({path:"/tmp/sticker-bomb-preview/tablero-movil.png",fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,"overflow "+width);
  await page.locator('[data-id="letter"]').click();
  assert.equal(await page.locator("#scene").isVisible(),false,"letter should be locked");
  for(const id of ids){
    await page.locator('[data-id="'+id+'"]').click();
    await page.getByRole("dialog").waitFor({state:"visible"});
    assert.ok(await page.locator("#scene-title").innerText(),"scene title");
    if(id==="chaos"){
      for(let i=0;i<4;i++)await page.locator('[data-flip="'+i+'"]').click();
      assert.equal(await page.locator(".mini-note.back").count(),4,"four notes revealed");
    }
    if(id==="rescue"){
      const b=await page.locator("#hold-button").boundingBox();assert.ok(b);
      await page.mouse.move(b.x+b.width/2,b.y+b.height/2);
      await page.mouse.down();await page.waitForTimeout(1900);await page.mouse.up();
      assert.match(await page.locator("#hold-label").innerText(),/REVELADO/);
    }
    if(id==="time"){
      await page.getByRole("button",{name:/Revelar el mensaje sin raspar/}).click();
      assert.match(await page.locator("#scratch-status").innerText(),/YA ES TUYO/);
    }
    if(id==="future"){
      for(let i=0;i<4;i++)await page.locator('[data-check="'+i+'"]').click();
      assert.equal(await page.locator(".check-row.checked").count(),4);
    }
    await page.getByRole("button",{name:"Cerrar sticker"}).click();
  }
  assert.equal(await page.locator("#progress").getAttribute("aria-valuenow"),"11");
  await page.getByRole("button",{name:/Abrir la carta final/}).click();
  await page.locator("#envelope").click();
  assert.equal(await page.locator(".lettertext").isVisible(),true,"letter revealed");
  assert.match(await page.locator(".lettertext").innerText(),/Querida Luli/);
  if(width===390)await page.screenshot({path:"/tmp/sticker-bomb-preview/carta-final-movil.png",fullPage:false});
  await page.getByRole("button",{name:"Cerrar sticker"}).click();
  await page.getByRole("button",{name:/Volver a descubrir/}).click();
  assert.equal(await page.locator("#progress").getAttribute("aria-valuenow"),"0");
  assert.deepEqual(errors,[],"browser runtime errors "+width);
  report.push({width,scenes:12,letter:true,replay:true,overflow:false});
  await page.close();
 }
 console.log("STICKER_BOMB_QA_PASS",JSON.stringify(report));
} finally {await browser.close();}
