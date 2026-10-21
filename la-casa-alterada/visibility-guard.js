/**
 * BLACKZONE V24 — honest visibility test in XR and flat 3D.
 * Only use a camera's WORLD direction/position. WebXR ArrayCamera
 * projectionMatrix is not a reliable monocular screen projector.
 */
export function targetVisibility(camera,worldPoint,{distance=12,cone=0.76}={}){
 if(!camera||!worldPoint)return {visible:false,distance:Infinity,ahead:false};
 const eye=camera.position||{x:0,y:0,z:0};
 const forward=camera.forward||{x:0,y:0,z:-1};
 const dx=worldPoint.x-eye.x,dy=worldPoint.y-eye.y,dz=worldPoint.z-eye.z;
 const length=Math.hypot(dx,dy,dz);
 if(!Number.isFinite(length)||length<.05)return {visible:false,distance:length,ahead:false};
 const len=Math.hypot(forward.x,forward.y,forward.z)||1;
 const dot=(dx*forward.x+dy*forward.y+dz*forward.z)/(length*len);
 return {visible:length<=distance&&dot>=cone,distance:length,ahead:dot>0,dot};
}
export function findSafeSpawnPoints(eye,forward,{floorY=0,areaDistance=null,canMove=null,max=5}={}){
 const fx=forward.x,fz=forward.z,len=Math.hypot(fx,fz)||1;
 const ux=fx/len,uz=fz/len;
 const sideX=-uz,sideZ=ux;
 const out=[];
 // Gradual wave, farther from the phone than the old 2.1m circle.
 // Avoid the head-height camera looking over the actors' heads.
 const slots=[[-.75,3.15],[.75,3.15],[0,3.75],[-1.25,4.0],[1.25,4.0],[-.45,4.55],[.45,4.55]];
 for(const [side,front] of slots){
  if(out.length>=max)break;
  const p={x:eye.x+ux*front+sideX*side,y:floorY+.016,z:eye.z+uz*front+sideZ*side};
  if(Math.hypot(p.x-eye.x,p.z-eye.z)<2.25)continue;
  if(areaDistance&&areaDistance(p)<.3)continue;
  if(canMove&&!canMove({x:eye.x,y:floorY,z:eye.z},p))continue;
  out.push(p);
 }
 return out;
}
