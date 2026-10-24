/**
 * RODEADOS 360 — Blackzone V25/V34 proven AR DOM-overlay compositor.
 *
 * Android/ARCore can report valid XR poses yet fail to display geometry in the
 * native immersive-ar framebuffer. Render Three.js world geometry through
 * an independently transparent WebGL canvas INSIDE the native XR DOM overlay.
 *
 * World, enemy and floor transforms stay absolute in XR reference-space meters.
 * A tracked XR eye supplies the same world/view/projection matrices used by the
 * native renderer. Never lock robots to the phone or DOM screen.
 */
export function createRodeadosArCompositor(THREE,host,maxPixelRatio=1.2){
 const renderer=new THREE.WebGLRenderer({
  alpha:true,antialias:false,premultipliedAlpha:true,powerPreference:'low-power'
 });
 renderer.setClearColor(0x000000,0);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.35;
 renderer.setPixelRatio(Math.min(maxPixelRatio,typeof devicePixelRatio==='number'?devicePixelRatio:1));
 renderer.setSize(innerWidth,innerHeight);
 renderer.domElement.classList.add('ar-composited-world');
 host.appendChild(renderer.domElement);
 const trackedCamera=new THREE.PerspectiveCamera();
 trackedCamera.matrixAutoUpdate=false;
 let frames=0,lastError=null,drawn=0;
 function render(world,xrCamera){
  const eye=xrCamera?.cameras?.[0]||xrCamera;
  if(!eye?.matrixWorld||!eye?.projectionMatrix)return false;
  trackedCamera.matrix.copy(eye.matrixWorld);
  trackedCamera.matrixWorld.copy(eye.matrixWorld);
  trackedCamera.matrixWorldInverse.copy(eye.matrixWorldInverse);
  trackedCamera.projectionMatrix.copy(eye.projectionMatrix);
  trackedCamera.projectionMatrixInverse.copy(eye.projectionMatrixInverse);
  trackedCamera.near=eye.near||.03;
  trackedCamera.far=eye.far||35;
  trackedCamera.layers.mask=eye.layers.mask;
  trackedCamera.matrixWorldNeedsUpdate=false;
  try{
   renderer.render(world,trackedCamera);
   frames++;
   drawn=renderer.info.render.calls;
   lastError=null;
   return true;
  }catch(err){
   lastError=err?.message||'AR compositor WebGL error';
   if(frames===0||frames%180===0)console.warn('RODEADOS AR compositor:',err);
   return false;
  }
 }
 function resize(w=innerWidth,h=innerHeight){if(w>0&&h>0)renderer.setSize(w,h)}
 function dispose(){renderer.dispose();renderer.domElement.remove()}
 return {
  render,resize,dispose,
  get frames(){return frames},
  get drawCalls(){return drawn},
  get error(){return lastError},
  get canvas(){return renderer.domElement}
 };
}
