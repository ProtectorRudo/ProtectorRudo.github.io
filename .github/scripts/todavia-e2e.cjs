const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../../todavia');
const types = { '.js':'text/javascript', '.css':'text/css', '.html':'text/html', '.svg':'image/svg+xml' };
const server = http.createServer((req,res) => {
  const pathname = new URL(req.url,'http://localhost').pathname;
  const name = pathname === '/' ? 'index.html' : pathname.replace(/^\//,'');
  const requested = path.resolve(root, name);
  if (!requested.startsWith(root + path.sep) && requested !== path.join(root,'index.html')) {res.writeHead(403).end();return;}
  fs.readFile(requested,(err,bytes) => {
    if(err) { res.writeHead(404).end();return; }
    res.writeHead(200,{'content-type':types[path.extname(requested)]||'application/octet-stream','cache-control':'no-store'});
    res.end(bytes);
  });
});
const pause = ms => new Promise(resolve => setTimeout(resolve,ms));
async function auditBrowser(browser,base,viewport) {
  const page = await browser.newPage({ viewport, acceptDownloads:true, reducedMotion:'reduce' });
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on('pageerror',e => errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('.td-intro h1').waitFor();
  assert.match(await page.locator('.td-intro h1').innerText(),/TODAVÍA/);
  assert.equal(await page.locator('canvas.td-atmosphere').count(),1);
  assert.equal(await page.locator('.td-ticket').count(),1);
  await page.locator('.td-nav-actions button').first().click();
  await page.locator('.td-nav-actions button').first().click();
  await page.locator('.td-ticket').click();
  await page.locator('.td-gallery').waitFor();
  for(let i=0;i<3;i++) {
    await page.locator('.td-display').nth(i).click();
    await page.locator('.td-memory').waitFor();
    await page.locator('.td-memory-copy button').click();
    await page.locator('.td-gallery').waitFor();
  }
  assert.equal(await page.locator('.td-seen').count(),3);
  await page.locator('.td-text-button').click();
  await page.locator('.td-void').waitFor();
  if(viewport.width>600) {
    const orb=page.locator('.td-orb-btn');
    await orb.hover();await page.mouse.down();await pause(1750);await page.mouse.up();
  } else {
    await page.locator('.td-accessible-skip').click();
  }
  await page.locator('.td-final').waitFor();
  const dl=page.waitForEvent('download');
  await page.locator('.td-final-actions .td-gold-button').click();
  const download=await dl;
  assert.match(download.suggestedFilename(),/\.svg$/);
  await page.locator('.td-outline-button').click();
  await page.locator('.td-intro').waitFor();
  await page.locator('.td-edit-btn').click();
  await page.locator('.td-editor').waitFor();
  await page.locator('.td-editor input').first().fill('Lucía');
  await page.locator('.td-editor input').nth(1).fill('Tomás');
  await page.locator('.td-save').click();
  await page.locator('.td-intro').waitFor();
  assert.match(await page.locator('.td-script-line').innerText(),/Lucía/);
  const overflow=await page.evaluate(() => ({
    viewport:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth,
    body:document.body.scrollWidth,
  }));
  assert.ok(overflow.scroll <= overflow.viewport + 3,'Horizontal overflow: '+JSON.stringify(overflow));
  assert.deepEqual(errors,[],'React runtime errors: '+errors.join('; '));
  console.log('PASS viewport='+viewport.width+'x'+viewport.height+' | scenes=5 | memories=3 | download=SVG | personalization=OK | overflow=OK | JS errors=0');
  await page.close();
}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port+'/';
  let browser;
  try {
    browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    await auditBrowser(browser,base,{width:390,height:844});
    await auditBrowser(browser,base,{width:1440,height:900});
    await auditBrowser(browser,base,{width:360,height:740});
    console.log('TODAVIA E2E AUDIT PASSED');
  } finally { await browser?.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(e=>{console.error(e);process.exitCode=1});
