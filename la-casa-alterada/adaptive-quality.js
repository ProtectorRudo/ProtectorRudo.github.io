/**
 * BLACKZONE V22 — adaptive resolution for 3D practice only.
 * AR framebuffer sizing is owned by WebXR. No quality changes inside XR.
 */
export function createAdaptiveQuality(maxRatio=1.55){
 const top=Math.max(.75,Math.min(1.55,Number(maxRatio)||1));
 const ratios=[top,Math.min(top,1.18),Math.min(top,1)];
 let level=0,secs=0,frames=0,low=0,high=0,lastFps=0;
 function reset(){
  const changed=level!==0;
  level=0;secs=0;frames=0;low=0;high=0;lastFps=0;
  return changed?{ratio:ratios[level],fps:0,level}:null;
 }
 function sample(dt,enabled=true){
  if(!enabled)return reset();
  if(!Number.isFinite(dt)||dt<=0||dt>.15)return null;
  secs+=dt;frames++;
  if(secs<1.6)return null;
  const fps=frames/secs;
  lastFps=fps;
  const period=secs;
  frames=0;secs=0;
  low=fps<29?low+period:0;
  high=fps>53?high+period:0;
  if(low>=3.2&&level<ratios.length-1){
   level++;low=0;high=0;
   return{ratio:ratios[level],fps,level};
  }
  if(high>=12&&level>0){
   level--;high=0;low=0;
   return{ratio:ratios[level],fps,level};
  }
  return null;
 }
 return{sample,reset,get ratio(){return ratios[level]},get fps(){return lastFps},get level(){return level}};
}
