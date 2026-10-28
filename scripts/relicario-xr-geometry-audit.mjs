import {chromium} from "playwright";
const browser=await chromium.launch({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:390,height:844}});
try {
 await page.goto("http://127.0.0.1:8765/tehiceesto/ar-pareja-auditoria/",{waitUntil:"domcontentloaded",timeout:45000});
 await page.locator("#sceneLoading.gone").waitFor({state:"attached",timeout:25000});
 const report=await page.evaluate(()=>{
  const ar=window.__relicarioARGeometryTest;
  if(!ar)throw Error("XR math checks unavailable");
  const positions=[[0,1.55,0],[.4,1.7,-.8]];
  const degrees=[0,-20,-40,-60,-75];
  let checked=0;
  for(const p of positions)for(const degree of degrees){
   const angle=degree*Math.PI/180;
   const orientation={x:Math.sin(angle/2),y:0,z:0,w:Math.cos(angle/2)};
   const target=ar.compute({x:p[0],y:p[1],z:p[2]},orientation,.21);
   // Synthetic WebXR viewer pose with the same column-major layout as WebXR.
   const co=Math.cos(angle),si=Math.sin(angle);
   const inverseView=[
     1,0,0,0,
     0,co,-si,0,
     0,si,co,0,
     -p[0],-co*p[1]-si*p[2],si*p[1]-co*p[2],1
   ];
   const f=1/Math.tan(70*Math.PI/360),near=.05,far=30;
   const projection=[f/(390/844),0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0];
   const viewerPose={views:[{transform:{inverse:{matrix:inverseView}},projectionMatrix:projection}]};
   const canSee=ar.visible(viewerPose,target,.21);
   // In portrait, a target directly in front of the viewer must stay in view regardless of pitch.
   if(!canSee)throw Error("Relicario goes off-screen at tilt "+degree+"°, "+JSON.stringify(target));
   const distance=Math.hypot(target.x-p[0],target.centerY-p[1],target.z-p[2]);
   if(Math.abs(distance-.95)>.015)throw Error("Relicario center is not 95cm in front: "+distance);
   checked++;
  }
  return {checked,source:"XR viewer pose",tilts:degrees};
 });
 console.log("PASS visible world-space preview for all tilt angles and viewer heights",JSON.stringify(report));
 if(await page.locator("#arPlace").getAttribute("disabled")===null)throw Error("Placement must be disabled until real XR pose is acquired");
 console.log("PASS prevent false placement before XR tracking");
 const overlay=await page.locator("#arOverlay").evaluate(el=>({
   hasReposition:!!el.querySelector("#arReposition"),
   hasManualConfirm:!!el.querySelector("#arPlace"),
   hasResize:!!el.querySelector("#arBigger")
 }));
 if(Object.values(overlay).some(x=>!x))throw Error("Manual place controls not wired");
 console.log("PASS physical AR placement controls remain available");
}finally{await browser.close();}
console.log("RELICARIO_XR_GEOMETRY_AUDIT_PASSED");
