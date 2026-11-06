const assert = require("node:assert/strict");
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const problems = [];
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    page.on("pageerror", error => problems.push(error.message));
    const response = await page.goto("http://127.0.0.1:8787/tehiceesto/experiencias/infinito/", { waitUntil: "networkidle" });
    assert.equal(response.status(), 200, "Static route must return 200");
    assert.match(await page.locator("h1").innerText(), /Cuánto/);
    await page.screenshot({ path: "/tmp/cosmos-entrada.png", fullPage: true });
    await page.getByRole("button", { name: /Empezar a medir/ }).click();
    await page.waitForTimeout(350);
    for (let chapter = 1; chapter <= 5; chapter++) {
      assert.match(await page.locator(".gal-progress").innerText(), new RegExp("0" + chapter + " / 05"));
      const target = page.locator(".gal-discover-object");
      await target.click({ timeout: 9000 });
      assert.equal(await page.locator(".gal-reveal").count(), 1, "Reveal must be shown for chapter " + chapter);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, "No horizontal overflow on chapter " + chapter);
      if (chapter < 5) {
        await page.locator(".gal-controls .gal-primary").click();
        await page.waitForTimeout(350);
      }
    }
    await page.waitForTimeout(1000);
    assert.equal(await page.locator(".gal-final-note").count(), 1);
    await page.screenshot({ path: "/tmp/cosmos-final.png", fullPage: true });
    await page.getByRole("button", { name: /Volver a vivirlo/ }).click();
    await page.waitForTimeout(350);
    assert.match(await page.locator("h1").innerText(), /Cuánto/);
    assert.deepEqual(problems, [], "No uncaught JavaScript errors allowed");
    console.log("PASS: 5 stages, tactile revelations, final, restart, mobile overflow, no JS errors");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
