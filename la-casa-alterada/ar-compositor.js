/**
 * BLACKZONE V25 — DOM-overlay world rendering fallback for handheld WebXR.
 *
 * Three's native XR framebuffer may fail to composite game geometry on some
 * Android ARCore/Chrome configurations even though XR hit testing, pose and
 * the independent weapon canvas work. Render the actual Three.js scene into
 * an alpha WebGL canvas inside the accepted XR DOM overlay, using the pose
 * AND projection matrix of the tracked XR eye. Nothing is screen-anchored.
 *
 * Native XR renderer still renders an empty scene to refresh XR camera pose;
 * avoiding native+DOM double images and retaining the browser's camera feed.
 */
export function createArCompositor(THREE,host,maxPixelRatio=1.25){
 const r=new THREE.WebGLRenderer({
  alpha:true,antialias:false,premultipliedAlpha:true,powerPreference:'low-power'
 });
 r.setClearColor(0x000000,0);
 r.outputColorSpace=THREE.SRGBColorSpace;
 r.toneMapping=THREE.ACESFilmicToneMapping;
 r.toneMappingExposure=1.28;
 r.setPixelRatio(Math.min(maxPixelRatio,typeof devicePixelRatio==='number'?devicePixelRatio:1));
 r.setSize(innerWidth,innerHeight);
 host.appendChild(r.domElement);
 const camera=new THREE.PerspectiveCamera();
 // Override all world transform fields so Three does not overwrite an XR pose.
 camera.matrixAutoUpdate=false;
 let frameCount=0,lastError=null;
 function render(scene,xrCamera){
  const eye=xrCamera?.cameras?.[0]||xrCamera;
  if(!eye?.matrixWorld||!eye?.projectionMatrix)return false;
  camera.matrix.copy(eye.matrixWorld);
  camera.matrixWorld.copy(eye.matrixWorld);
  camera.matrixWorldInverse.copy(eye.matrixWorldInverse);
  camera.projectionMatrix.copy(eye.projectionMatrix);
  camera.projectionMatrixInverse.copy(eye.projectionMatrixInverse);
  camera.near=eye.near||.01;
  camera.far=eye.far||60;
  camera.layers.mask=eye.layers.mask;
  camera.matrixWorldNeedsUpdate=false;
  try{
   r.render(scene,camera);
   frameCount++;
   lastError=null;
   return true;
  }catch(e){
   lastError=e?.message||'Error de renderizado';
   if(frameCount===0||frameCount%150===0)console.warn('BLACKZONE AR compositing:',e);
   return false;
  }
 }
 function resize(width=innerWidth,height=innerHeight){
  if(width>0&&height>0)r.setSize(width,height);
 }
 function dispose(){
  r.dispose();
  r.domElement.remove();
 }
 return{render,resize,dispose,get frames(){return frameCount},get error(){return lastError}};
}
