import { chromium, devices } from "playwright";
import fs from "node:fs/promises";

const url="http://127.0.0.1:8765/tehiceesto/ar-pareja-auditoria/";
const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream","--autoplay-policy=no-user-gesture-required"]});
await fs.mkdir("visual-smoke/relicario",{recursive:true});
let failures=0;
async function audit(label,callback){
 try{await callback();console.log("PASS",label)}
 catch(error){failures++;console.error("FAIL",label,error.message);}}
await audit("Mobile camera fallback visibly renders the real relicario",async()=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},permissions:["camera"],isMobile:true,hasTouch:true});
 const page=await ctx.newPage();
 const errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("console",msg=>{if(msg.type()==="error")errors.push(msg.text())});
 await page.addInitScript(()=>{Object.defineProperty(navigator,"xr",{configurable:true,value:undefined});});
 const response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:45000});
 if(response.status()!==200)throw Error("HTTP "+response.status());
 await page.locator("#sceneLoading.gone").waitFor({state:"attached",timeout:25000});
 await page.locator("#enterBtn").click();
 await page.locator("#entryOverlay").waitFor({state:"detached",timeout:6000});
 await page.locator("#arBtn").click();
 await page.locator("#arDialog:visible").waitFor();
 await page.locator("#launchAR").click();
 await page.locator("#cameraAR:visible").waitFor({timeout:13000});
 const props=await page.evaluate(()=>({
  canvas:document.querySelector("#cameraView canvas")!==null,
  visible:!document.getElementById("cameraAR").hidden,
  video:document.getElementById("cameraFeed").readyState,
  status:document.getElementById("cameraStatus").textContent,
  original:document.querySelector("#canvasHost canvas")!==null,
  horizontal:document.documentElement.scrollWidth-innerWidth
 }));
 if(!props.canvas||!props.visible||props.video<2)throw Error("No camera/object output: "+JSON.stringify(props));
 if(props.original)throw Error("Renderer still in the former grid container, object cannot appear over camera");
 if(props.horizontal>8)throw Error("Overflow "+props.horizontal);
 await page.screenshot({path:"visual-smoke/relicario/AR-camera-open-mobile.png",fullPage:true});
 await page.locator("#camBigger").click();
 const size=await page.locator("#camSizeLabel").textContent();
 if(!size.includes("CM"))throw Error("Scale controls not wired");
 await page.locator("#camRotate").click();
 await page.locator("#closeCamera").click();
 await page.locator("#cameraAR").waitFor({state:"hidden"});
 if(!await page.locator("#canvasHost canvas").count())throw Error("Closing camera left 3D experience blank");
 console.log("AR CAMERA QA",JSON.stringify({size,prop:props,errorCount:errors.length,errors:errors.slice(0,3)}));
 await ctx.close();
});
await audit("Manual XR placement control exists before hit-test",async()=>{
 const page=await browser.newPage();
 await page.goto(url,{waitUntil:"domcontentloaded",timeout:45000});
 const controls=await page.evaluate(()=>{
  const ids=["arPlace","arReposition","arSmaller","arBigger","arRotate","arTracking","arCenterMarker"];
  return ids.map(id=>[id,!!document.getElementById(id)]);
 });
 if(controls.some(([,exists])=>!exists))throw Error("Missing XR control: "+JSON.stringify(controls));
 await page.close();
});
await browser.close();
if(failures)process.exit(1);
console.log("RELICARIO_AR_FALLBACK_AUDIT_PASSED");
