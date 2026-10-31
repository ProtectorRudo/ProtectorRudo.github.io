import {chromium} from "playwright";
import assert from "node:assert/strict";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const URL="https://protectorrudo.github.io/tehiceesto/experiencias/sticker-bomb-amistad/comprar/";
try{
 for(const width of [320,360,393,430]){
  const page=await browser.newPage({viewport:{width,height:850},isMobile:true,hasTouch:true});
  const errors=[];page.on("pageerror",err=>errors.push(err.message));
  const response=await page.goto(URL,{waitUntil:"domcontentloaded",timeout:60000});
  assert.equal(response.status(),200);
  const add=page.locator("#add-letter");
  assert.equal(await add.getAttribute("aria-pressed"),"false","optional addon must be off by default");
  assert.match(await page.locator("#total-price").innerText(),/25\\.000/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,"horizontal overflow");
  await add.click();
  assert.equal(await add.getAttribute("aria-pressed"),"true");
  assert.match(await page.locator("#total-price").innerText(),/35\\.000/);
  await add.click();assert.equal(await add.getAttribute("aria-pressed"),"false");
  assert.match(await page.locator("#total-price").innerText(),/25\\.000/);
  await add.click();
  let payload=null,calls=0;
  await page.route("**/api/checkout",async route=>{
   calls++;payload=JSON.parse(route.request().postData());
   await route.fulfill({status:200,contentType:"application/json",
    body:JSON.stringify({code:"000000000000000000",currency:"ARS",priceMinor:3500000,checkoutReady:false})});
  });
  await page.locator("#email").fill("test@example.com");
  await page.locator("#phone").fill("2215551234");
  await page.locator("#pay").click();
  await page.locator("#msg:visible").waitFor({state:"visible",timeout:10000});
  assert.equal(calls,1,"must create exactly one consolidated checkout");
  assert.equal(payload.addSecretLetter,true,"selection must reach the backend");
  assert.equal(payload.experienceSlug,"sticker-bomb-amistad");
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  assert.deepEqual(errors,[],"browser JavaScript errors");
  await page.close();
 }
 console.log("STICKER_PRECHECKOUT_ADDON_PASS: option unselected by default, +10k, reversible, one consolidated request, mobile 320-430");
}finally{await browser.close()}
