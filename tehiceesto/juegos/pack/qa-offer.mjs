import {chromium} from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
await fs.mkdir("/tmp/pack-offer-audit",{recursive:true});
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const url="https://protectorrudo.github.io/tehiceesto/juegos/pack/";
try{
 for(const width of [320,360,390,430,1280]){
   const p=await browser.newPage({viewport:{width,height:850},isMobile:width<700,hasTouch:width<700});
   const errors=[];p.on("pageerror",e=>errors.push(e.message));
   const response=await p.goto(url,{waitUntil:"domcontentloaded",timeout:60000});
   assert.equal(response?.status(),200);
   const add=p.locator("#add-experience");
   assert.equal(await add.count(),1);
   assert.equal(await add.getAttribute("aria-pressed"),"false");
   assert.match(await p.locator(".pack-add-experience").innerText(),/60% OFF/);
   assert.match(await p.locator(".pack-add-experience").innerText(),/10\.000/);
   assert.match(await p.locator("#bundle-total").innerText(),/25\.000/);
   assert.equal(await p.locator("#extra-experience option").count(),9);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,"horizontal overflow");
   await p.locator("#extra-experience").selectOption("sticker-bomb-amistad");
   await add.click();
   assert.equal(await add.getAttribute("aria-pressed"),"true");
   assert.match(await p.locator("#bundle-total").innerText(),/35\.000/);
   if(width===390)await p.screenshot({path:"/tmp/pack-offer-audit/pack-offer-390.png",fullPage:true});
   await add.click();assert.match(await p.locator("#bundle-total").innerText(),/25\.000/);
   await add.click();
   let calls=0,payload;
   await p.route("**/api/checkout",async r=>{
     calls++;payload=JSON.parse(r.request().postData());
     await r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
       code:"0123456789abcdefab",priceMinor:3500000,currency:"ARS",checkoutReady:false
     })});
   });
   await p.locator("#email").fill("test@example.com");
   await p.locator("#whatsapp").fill("2215551234");
   await p.locator("#submit").click();
   await p.locator("#status:visible").waitFor({state:"visible",timeout:12000});
   assert.equal(calls,1,"only one combined checkout request");
   assert.equal(payload.experienceSlug,"pack-juegos");
   assert.equal(payload.addonExperienceSlug,"sticker-bomb-amistad");
   assert.deepEqual(errors,[],"browser JS errors");
   await p.close();
 }
 console.log("GAMES_TO_EXPERIENCE_60_OFF_PASS · 5 widths · one combined checkout · no real payments");
}finally{await browser.close()}
