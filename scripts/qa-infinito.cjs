const assert=require("node:assert/strict");
const { chromium }=require("playwright");
(async()=>{
  const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  try {
    for(const viewport of [{width:390,height:844},{width:360,height:740}]){
      const page=await browser.newPage({viewport,isMobile:true,hasTouch:true});
      const errors=[];
      page.on("pageerror",e=>errors.push(String(e.message)));
      const res=await page.goto("http://127.0.0.1:8787/tehiceesto/experiencias/infinito/",{waitUntil:"domcontentloaded",timeout:20000});
      assert.equal(res.status(),200);
      await page.locator(".ii-intro").waitFor();
      await page.waitForTimeout(350);
      assert.match(await page.locator(".ii-intro-title").innerText(),/cuánto te quiero/i);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,"intro overflow "+viewport.width);
      if(viewport.width===390)await page.screenshot({path:"/tmp/infinito-premium-intro.png",fullPage:true});
      await page.locator('[data-action="begin"]').click();
      await page.locator('.ii-chapter-0').waitFor({timeout:10000});
      for(let i=0;i<5;i++){
        assert.equal(await page.locator(".ii-chapter-"+i).count(),1,"chapter "+i+" visible");
        await page.waitForTimeout(350);
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
        assert.equal(overflow,false,"chapter "+i+" overflow "+viewport.width);
        if(i===3){
          await page.locator('#ii-scale').evaluate(el=>{el.value="100";el.dispatchEvent(new Event("input",{bubbles:true}));});
        } else {
          await page.locator('[data-action="reveal"]').click({timeout:9000});
        }
        await page.locator('.ii-discovery').waitFor({timeout:9000});
        assert.equal(await page.locator('.ii-revealed').count(),1,"chapter "+i+" revealed");
        if(i===4){
          await page.waitForTimeout(1250);
          assert.match(await page.locator('.ii-letter-paper p').innerText(),/universo/i);
          assert.equal(await page.locator('[data-action="restart"]').count(),1);
          if(viewport.width===390)await page.screenshot({path:"/tmp/infinito-premium-final.png",fullPage:true});
        }else{
          await page.locator('[data-action="next"]').click({timeout:9000});
          await page.locator('.ii-chapter-'+(i+1)).waitFor({timeout:10000});
        }
      }
      await page.locator('[data-action="restart"]').click();
      await page.locator('.ii-intro').waitFor();
      assert.deepEqual(errors,[],"no JS errors on "+viewport.width);
      console.log("PASS "+viewport.width+"x"+viewport.height+" — 5 chapters/reveal/letter/restart/no overflow");
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});