import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const url = "https://protectorrudo.github.io/tehiceesto/experiencias/sticker-bomb-amistad/v2/";
const browser = await chromium.launch({headless:true, args:["--no-sandbox"]});
await fs.mkdir("/tmp/sticker-bomb-preview",{recursive:true});
const results = [];
try {
 for (const width of [320,360,393,430,1024]) {
  const page = await browser.newPage({viewport:{width,height:880},isMobile:width<700,hasTouch:width<700,deviceScaleFactor:1});
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  const response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:60000});
  assert.equal(response?.status(),200);
  await page.getByRole("button",{name:/Abrir nuestro expediente/}).click();
  const stickers=page.locator(".sticker");
  assert.equal(await stickers.count(),12);
  const visual=await page.locator(".sticker-art").evaluateAll(images=>images.map(im=>({loaded:im.complete && im.naturalWidth>0,src:im.getAttribute("src")?.slice(0,24)})));
  assert.equal(visual.length,12);
  assert.ok(visual.every(x=>x.loaded),"At least one image didn't load");
  const broken=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
  assert.equal(broken,false,"Horizontal overflow "+width);
  const v=await page.locator(".sticker--moments .sticker-art").evaluate(e=>({width:e.naturalWidth,height:e.naturalHeight}));
  assert.ok(v.width>=100 && v.height>=80,"The old purple placeholder must be replaced by a real image");
  await page.locator(".sticker--moments").click();
  await page.getByRole("dialog").waitFor({state:"visible"});
  assert.match(await page.locator("#scene-title").innerText(),/galería/i);
  await page.getByRole("button",{name:"Cerrar sticker"}).click();
  assert.deepEqual(errors,[],"JavaScript errors width "+width);
  if (width===393)await page.screenshot({path:"/tmp/sticker-bomb-preview/stickers-v2-mobile-full.png",fullPage:true});
  if (width===1024)await page.screenshot({path:"/tmp/sticker-bomb-preview/stickers-v2-desktop.png",fullPage:true});
  results.push({width,stickers:12,loadedImages:12,letterLocked:true,overflow:false});
  await page.close();
 }
 console.log("PREMIUM_STICKER_VISUAL_PASS "+JSON.stringify(results));
} finally {await browser.close();}
