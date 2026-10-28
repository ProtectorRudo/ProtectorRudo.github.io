import { chromium } from "playwright";
import fs from "node:fs/promises";

const url="http://127.0.0.1:8765/tehiceesto/ar-pareja-auditoria/";
const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--disable-web-security","--autoplay-policy=no-user-gesture-required"]});
await fs.mkdir("visual-smoke/relicario",{recursive:true});
let failures=0;
async function test(name,job){try{await job();console.log("PASS",name)}catch(e){failures++;console.error("FAIL",name,String(e.message||e).slice(0,1400));}}
async function open(viewport,label){
 const ctx=await browser.newContext({viewport,deviceScaleFactor:1});
 const page=await ctx.newPage();
 page.on("pageerror",error=>console.error("PAGEERROR",label,error.message.slice(0,500)));
 page.on("console",message=>{if(message.type()==="error")console.error("CONSOLEERROR",label,message.text().slice(0,400))});
 const res=await page.goto(url,{waitUntil:"domcontentloaded",timeout:50000});
 if(res.status()!==200)throw Error("HTTP "+res.status());
 await page.locator("#sceneLoading.gone").waitFor({state:"attached",timeout:45000});
 const info=await page.evaluate(()=>({canvas:document.querySelectorAll("#canvasHost canvas").length,ready:!!window.WebGLRenderingContext,bytes:document.querySelector("#canvasHost canvas")?.width,ratio:document.documentElement.scrollWidth/innerWidth}));
 if(info.canvas!==1||!info.bytes)throw Error("3D renderer not ready "+JSON.stringify(info));
 console.log("3D",label,JSON.stringify(info));
 await page.screenshot({path:"visual-smoke/relicario/"+label+"-intro.png",fullPage:true});
 return {page,ctx};
}
await test("3D scene loads and GLB model served",async()=>{
 const glb=await fetch(url+"relicario.glb");
 if(glb.status!==200)throw Error("GLB HTTP "+glb.status);
 const buffer=await glb.arrayBuffer();
 const dv=new DataView(buffer);
 if(dv.getUint32(0,true)!==0x46546c67)throw Error("GLB magic bytes missing");
 if(buffer.byteLength<50000)throw Error("GLB file suspiciously small");
 console.log("GLB_SIZE",buffer.byteLength);
});
await test("Mobile narrative: open, three memories, final and AR integration",async()=>{
 const {page,ctx}=await open({width:390,height:844},"mobile");
 await page.locator("#enterBtn").click();
 await page.locator("#entryOverlay.closed").waitFor({timeout:5000});
 await page.locator("#primaryBtn").click();
 await page.locator("#memoryList:visible").waitFor({timeout:17000});
 await page.screenshot({path:"visual-smoke/relicario/mobile-open.png",fullPage:true});
 for(let i=0;i<3;i++){
  await page.locator('[data-memory="'+i+'"]').click();
  await page.locator("#memoryModal:visible").waitFor({timeout:3500});
  const text=await page.locator("#memoryHeading").textContent();
  if(!text?.length)throw Error("Missing memory "+i);
  await page.screenshot({path:"visual-smoke/relicario/mobile-memory-"+(i+1)+".png"});
  await page.locator("#closeMemory").click();
 }
 await page.locator("#primaryBtn").click();
 await page.locator("#finalOverlay:visible").waitFor({timeout:4000});
 await page.screenshot({path:"visual-smoke/relicario/mobile-finale.png"});
 await page.locator("#finalClose").click();
 await page.locator("#arBtn").click();
 await page.locator("#arDialog:visible").waitFor({timeout:4000});
 await page.screenshot({path:"visual-smoke/relicario/mobile-ar-intent.png"});
 const glb=await page.locator("#iosARModel").getAttribute("src");
 if(!glb?.endsWith("/relicario.glb"))throw Error("Native AR GLB not configured: "+glb);
 const h=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 if(h>6)throw Error("Mobile horizontal overflow "+h);
 console.log("MOBILE_AR_MODEL",glb);
 await ctx.close();
});
await test("Desktop editorial composition and accessible interaction",async()=>{
 const {page,ctx}=await open({width:1440,height:900},"desktop");
 await page.locator("#enterBtn").click();
 await page.locator("#primaryBtn").click();
 await page.locator("#memoryList:visible").waitFor({timeout:17000});
 await page.screenshot({path:"visual-smoke/relicario/desktop-open.png",fullPage:true});
 const overflowing=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 if(overflowing>8)throw Error("Desktop overflow "+overflowing);
 const buttons=await page.getByRole("button").count();
 if(buttons<8)throw Error("Missing interactive UI");
 await ctx.close();
});
await browser.close();
if(failures)process.exit(1);
console.log("RELICARIO_DEMO_BROWSER_AUDIT_PASSED");
