import assert from "node:assert/strict";
import {mkdir} from "node:fs/promises";
import {chromium} from "playwright";

const base="http://127.0.0.1:4173/la-ultima-funcion/";
const gallery="la-ultima-funcion/qa-artifacts";
const required=[
 "industrial-wall-sconce.glb",
 "premium-ph-crystal-chandelier.glb",
 "premium-ph-wood-lantern.glb",
 "victorian-arched-mirror.glb",
 "victorian-nightstand.glb"
];
await mkdir(gallery,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 "--enable-webgl","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader",
 "--disable-dev-shm-usage"
]});
try{
 for(const mode of [
  {name:"desktop",width:1280,height:720,isMobile:false,deviceScaleFactor:1},
  {name:"android-portrait",width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1}
 ]){
  const ctx=await browser.newContext({...mode,locale:"es-AR",reducedMotion:"reduce"});
  const page=await ctx.newPage();
  const failures=[];
  const loaded=new Set();
  const surfaces=new Set();
  page.on("pageerror",e=>failures.push("Page error: "+e.message));
  page.on("console",m=>{if(m.type()==="error"||/Decorado glTF no disponible|No se pudo cargar todo el decorado|Superficie PBR de teatro no disponible/.test(m.text()))failures.push("Console: "+m.text())});
  page.on("response",r=>{
   if(r.url().includes("/materials/premium/")){
    if(r.status()===200)surfaces.add(r.url().split("/").pop());
    else failures.push("PBR texture HTTP "+r.status()+": "+r.url());
   }
   if(r.url().includes("/models/premium/")){
    if(r.status()===200)loaded.add(r.url().split("/").pop());
    else failures.push("Premium HTTP "+r.status()+": "+r.url());
   }
  });
  const response=await page.goto(base,{waitUntil:"domcontentloaded",timeout:45000});
  assert.equal(response?.status(),200,"Theatre HTML response was not 200");
  await page.locator("canvas.three-canvas").waitFor({state:"attached",timeout:30000});
  for(let i=0;i<2;i++){
   const button=page.getByRole("button",{name:/ENTENDÍ MI MISIÓN|VOLVER AL TEATRO|ENTRAR/i}).first();
   if(await button.isVisible().catch(()=>false))await button.click({timeout:2000}).catch(()=>{});
   await page.waitForTimeout(500);
  }
  await page.waitForTimeout(22000);
  await page.screenshot({path:`${gallery}/${mode.name}.png`,fullPage:false});
  const canvas=await page.locator("canvas.three-canvas").evaluate(el=>{
   const b=el.getBoundingClientRect();return {width:b.width,height:b.height};
  });
  assert(canvas.width>150&&canvas.height>150,mode.name+": 3D canvas not visible");
  for(const item of required)assert(loaded.has(item),mode.name+": premium GLB not loaded: "+item);
  for(const mat of ["wood_floor","rough_plaster_broken"])for(const map of ["color","normal","arm"])assert(surfaces.has(mat+"-"+map+".webp"),mode.name+": PBR map not loaded: "+mat+"-"+map);
  
// Regression: the warning must never describe an empty VIP box.
// The spectral stand-in is created synchronously, then replaced by the animated human GLB.
await page.goto(base+"?diagnostico",{waitUntil:"domcontentloaded",timeout:45000});
await page.waitForFunction(()=>Boolean(window.__belladonnaSpecterQA?.status()?.ready),null,{timeout:30000});
const initialSpecter=await page.evaluate(()=>window.__belladonnaSpecterQA.status());
assert(initialSpecter.ready,mode.name+": missing fallback specter at room construction");
assert(!initialSpecter.visible,mode.name+": ghost appears before the announcement");
for(let attempt=0;attempt<2;attempt++){
 const enter=page.getByRole("button",{name:/ENTENDÍ MI MISIÓN|VOLVER AL TEATRO|ENTRAR/i}).first();
 if(await enter.isVisible().catch(()=>false))await enter.click({timeout:2500}).catch(()=>{});
 await page.waitForTimeout(500);
}
await page.evaluate(()=>window.__belladonnaSpecterQA.show());
const specter=await page.evaluate(()=>window.__belladonnaSpecterQA.status());
assert(specter.visible&&specter.cue,mode.name+": PALCO 1 is empty while the warning is active");
const cameraFocused=await page.evaluate(()=>window.__belladonnaSpecterQA.look());
assert(cameraFocused,mode.name+": user camera cannot focus on visible PALCO 1 figure");
await page.waitForTimeout(1200);
await page.screenshot({path:`${gallery}/${mode.name}-palco-1.png`,fullPage:false});
await page.waitForFunction(()=>window.__belladonnaSpecterQA?.status()?.professional,null,{timeout:30000});
assert((await page.evaluate(()=>window.__belladonnaSpecterQA.status())).visible,mode.name+": GLB upgrade hid ghost");

  assert.equal(failures.length,0,mode.name+": "+failures.join("\n"));
  console.log(mode.name+" PASS: 3D canvas, "+loaded.size+" premium GLBs, "+surfaces.size+" PBR textures, no page errors");
  await ctx.close();
 }
}finally{await browser.close()}
