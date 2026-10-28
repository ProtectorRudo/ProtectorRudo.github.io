import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Isolated WebXR engine. It never reuses the DOM-based 3D preview's renderer or camera.
// Sequence: find horizontal real plane -> render GLB at the hit pose -> resize/rotate -> fix world position.
const $=id=>document.getElementById(id);
const BASE_WIDTH=.4;
const up=new THREE.Vector3(0,1,0);
const tmpQ=new THREE.Quaternion();
const tmpN=new THREE.Vector3();
const v3=new THREE.Vector3();
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const arGuide=$('arSurfaceGuide'),arPolygon=$('arSurfacePolygon'),arPoint=$('arSurfacePoint');
const viewMatrix=new THREE.Matrix4(),projectionMatrix=new THREE.Matrix4(),viewProjection=new THREE.Matrix4();
const clipPosition=new THREE.Vector4();
function clearFloorGuide(){if(arGuide)arGuide.hidden=true;}
export function projectSurfaceToScreen(view,position,screenWidth,screenHeight){
 if(!view?.projectionMatrix||!view?.transform?.inverse?.matrix)return null;
 viewMatrix.fromArray(view.transform.inverse.matrix);
 projectionMatrix.fromArray(view.projectionMatrix);
 viewProjection.multiplyMatrices(projectionMatrix,viewMatrix);
 clipPosition.set(position.x,position.y,position.z,1).applyMatrix4(viewProjection);
 if(clipPosition.w<=.015)return null;
 const x=clipPosition.x/clipPosition.w,y=clipPosition.y/clipPosition.w;
 if(!Number.isFinite(x)||!Number.isFinite(y))return null;
 return {x:(x+1)*screenWidth/2,y:(1-y)*screenHeight/2,visible:Math.abs(x)<1&&Math.abs(y)<1};
}
function drawFloorGuide(viewer,position,width){
 if(!arGuide||!viewer?.views?.length)return false;
 const w=window.innerWidth,h=window.innerHeight;
 arGuide.setAttribute('viewBox',`0 0 ${w} ${h}`);
 const view=viewer.views[0],r=width*.63,y=position.y+.012;
 const ps=[[-r,-r],[r,-r],[r,r],[-r,r]].map(([dx,dz])=>projectSurfaceToScreen(view,{x:position.x+dx,y,z:position.z+dz},w,h));
 const center=projectSurfaceToScreen(view,position,w,h);
 if(!center || !ps.every(Boolean)){clearFloorGuide();return false;}
 arPolygon.setAttribute('points',ps.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));
 arPoint.setAttribute('cx',center.x.toFixed(1));arPoint.setAttribute('cy',center.y.toFixed(1));
 arGuide.hidden=!center.visible;
 return center.visible;
}

export function horizontalPose(pose,minDot=.68){
 if(!pose?.transform?.orientation)return false;
 const q=pose.transform.orientation;
 tmpQ.set(q.x,q.y,q.z,q.w).normalize();
 // WebXR hit-test orientation Y+ is surface normal; reject walls and ceilings.
 return tmpN.set(0,1,0).applyQuaternion(tmpQ).dot(up)>minDot;
}
export function hitDistance(pose,viewer){
 const a=pose?.transform?.position,b=viewer?.transform?.position;
 return a&&b?Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z):Infinity;
}
export function chooseFloorHit(frame,source,reference,viewer){
 if(!frame||!source||!reference||!viewer)return null;
 const results=frame.getHitTestResults(source)||[];
 for(const item of results){
  const pose=item.getPose(reference);
  const d=hitDistance(pose,viewer);
  if(pose&&horizontalPose(pose)&&d>.15&&d<4.3)return {result:item,pose,d};
 }
 return null;
}

export class RelicarioSpatialAR {
 constructor({overlay,modelUrl,onState,onEnd}){
  this.overlay=overlay;this.modelUrl=modelUrl;this.onState=onState;this.onEnd=onEnd;
  this.stage='inactive';this.width=BASE_WIDTH;this.rotation=0;this.session=null;
  this.renderer=null;this.scene=null;this.root=null;this.camera=null;this.canvas=null;this.hitSource=null;
  this.anchor=null;this.latestHit=null;this.frames=0;this.drawCalls=0;clearFloorGuide();this.modelReady=false;
  this.hitSeenAt=0;this.worldPosition=new THREE.Vector3();this.initialMaterialCount=0;
  this.hitSourceDown=null;this.lastSource='none';this.previewReady=false;
  this.loadPromise=this.loadModel();this.loadPromise.catch(()=>{});this._statusTime=0;
 }
 async loadModel(){
  try{
   const loader=new GLTFLoader();
   const gltf=await loader.loadAsync(this.modelUrl);
   const model=gltf.scene;
   // The authored GLB has Z as the vertical axis (height 1.98 m), while WebXR uses Y up.
   model.rotation.x=-Math.PI/2;
   model.updateMatrixWorld(true);
   let bounds=new THREE.Box3().setFromObject(model);
   const size=bounds.getSize(new THREE.Vector3());
   const center=bounds.getCenter(new THREE.Vector3());
   const width=Math.max(size.x,size.z);
   if(!Number.isFinite(width)||width<.1||!Number.isFinite(size.y))throw Error('Invalid GLB geometry');
   // Move the base to Y=0; the root transform now sits exactly on the physical floor/table.
   model.position.x-=center.x;
   model.position.z-=center.z;
   model.position.y-=bounds.min.y;
   model.updateMatrixWorld(true);
   let meshes=0;
   model.traverse(node=>{if(node.isMesh){meshes++;node.frustumCulled=false;
     if(node.material){const materials=Array.isArray(node.material)?node.material:[node.material];
       for(const material of materials){material.side=THREE.DoubleSide; material.needsUpdate=true;}
     }
   }});
   if(meshes<15)throw Error('GLB model missing detailed geometry');
   this.asset={model,objectWidth:width,meshes,height:size.y};
   this.modelReady=true;
   return this.asset;
  }catch(err){this.assetError=err;this.modelReady=false;throw err;}
 }
 _status(stage,message,detail){
  this.stage=stage;
  this.onState?.({stage,message,detail,frames:this.frames,draws:this.drawCalls,modelReady:this.modelReady});
 }
 async start(){
  if(this.session)return true;
  if(!navigator.xr)throw Error('WebXR no está disponible');
  // MUST be the first asynchronous operation following the user's tap.
  const sessionRequest=navigator.xr.requestSession('immersive-ar',{
   requiredFeatures:['hit-test','dom-overlay'],optionalFeatures:['anchors','local-floor'],
   domOverlay:{root:this.overlay}
  });
  const session=await sessionRequest;
  this.session=session;
  session.addEventListener('end',()=>this.stopFromSession(),{once:true});
  try{
   this.canvas=document.createElement('canvas');
   this.canvas.setAttribute('aria-hidden','true');
   this.canvas.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';
   document.body.appendChild(this.canvas);
   const context=this.canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:true,depth:true,xrCompatible:true}) ||
     this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:true,depth:true,xrCompatible:true});
   if(!context)throw Error('No se pudo abrir el motor 3D XR');
   if(typeof context.makeXRCompatible==='function')await context.makeXRCompatible();
   this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,context,alpha:true,antialias:true,powerPreference:'high-performance',premultipliedAlpha:false});
   this.renderer.xr.enabled=true;
   this.renderer.xr.setReferenceSpaceType('local');
   this.renderer.outputColorSpace=THREE.SRGBColorSpace;
   this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
   this.renderer.toneMappingExposure=1.65;
   this.renderer.setClearColor(0x000000,0);
   this.renderer.autoClear=true;
   this.scene=new THREE.Scene();
   this.camera=new THREE.PerspectiveCamera(65,1,.015,30);
   const hemi=new THREE.HemisphereLight(0xffe6ca,0x6d5562,3.5);this.scene.add(hemi);
   const key=new THREE.DirectionalLight(0xffdfb0,5.2);key.position.set(-2,4,3);this.scene.add(key);
   const fill=new THREE.DirectionalLight(0xfff2e9,2.2);fill.position.set(3,2,-2);this.scene.add(fill);
   this.root=new THREE.Group();this.scene.add(this.root);this.root.visible=false;
   // A visible, lightweight preview means AR is never an empty camera while scanning.
   // It is explicitly NOT a physical placement; only a real XR hit enables fixing.
   this.previewKit=new THREE.Group();this.root.add(this.previewKit);
   const previewGold=new THREE.MeshStandardMaterial({color:0xe6bd82,metalness:.78,roughness:.25,emissive:0x6d3e19,emissiveIntensity:.28});
   const previewBase=new THREE.Mesh(new THREE.CylinderGeometry(1.03,1.12,.14,64),previewGold);
   previewBase.position.y=.07;this.previewKit.add(previewBase);
   const previewFrame=new THREE.Mesh(new THREE.TorusGeometry(.87,.065,12,80),previewGold);
   previewFrame.position.y=1.3;this.previewKit.add(previewFrame);
   const previewInner=new THREE.Mesh(new THREE.IcosahedronGeometry(.48,1),new THREE.MeshStandardMaterial({color:0xf9d7b0,metalness:.36,roughness:.2,emissive:0x633f28,emissiveIntensity:.3}));
   previewInner.position.y=1.32;this.previewKit.add(previewInner);
   const previewHalo=new THREE.Mesh(new THREE.TorusGeometry(1.15,.014,8,96),new THREE.MeshBasicMaterial({color:0xfce1ba,transparent:true,opacity:.83,side:THREE.DoubleSide,depthWrite:false}));
   previewHalo.rotation.x=-Math.PI/2;previewHalo.position.y=.16;this.previewKit.add(previewHalo);
   this.updateSize();
   this.marker=new THREE.Group();this.scene.add(this.marker);this.marker.visible=false;
   const ring=new THREE.Mesh(new THREE.RingGeometry(.16,.174,72),new THREE.MeshBasicMaterial({color:0xf0cdab,side:THREE.DoubleSide,transparent:true,opacity:.95,depthWrite:false}));
   ring.rotation.x=-Math.PI/2;ring.position.y=.006;this.marker.add(ring);
   const disk=new THREE.Mesh(new THREE.CircleGeometry(.16,72),new THREE.MeshBasicMaterial({color:0xc29c7e,side:THREE.DoubleSide,transparent:true,opacity:.19,depthWrite:false}));
   disk.rotation.x=-Math.PI/2;disk.position.y=.003;this.marker.add(disk);
   await this.renderer.xr.setSession(session);
   const ref=await session.requestReferenceSpace('viewer');
   this.hitSource=await session.requestHitTestSource({space:ref,entityTypes:['plane','point']}).catch(()=>session.requestHitTestSource({space:ref}));
   // A second, mildly downward ray improves discovery of tables and floors when the
   // camera is held naturally instead of pointed directly into the ground.
   try {
    if(typeof XRRay!=='undefined') {
     const ray=new XRRay({x:0,y:0,z:0,w:1},{x:0,y:-.38,z:-1,w:0});
     this.hitSourceDown=await session.requestHitTestSource({space:ref,offsetRay:ray,entityTypes:['plane','point']});
    }
   } catch(err){console.info('Supplemental XR floor ray unavailable',err)}
   this.previewReady=true;
   this._status('scan','01 · BUSCÁ UNA MESA O EL PISO','Mové lentamente el teléfono hasta que aparezca un anillo dorado sobre una superficie real.');
   this.renderer.setAnimationLoop((time,frame)=>this.onFrame(time,frame));
   this.loadPromise.then(asset=>{
    if(!this.session||!this.root)return;
    this.root.add(asset.model);
    this.previewKit.visible=false;
    this.updateSize();
    this._status('scan','01 · BUSCÁ UNA SUPERFICIE','La escultura está cargada. Apuntá hacia una mesa o el piso.');
   }).catch(err=>{this._status('error','NO SE PUDO CARGAR EL RELICARIO',String(err.message||err));});
   return true;
  }catch(err){
   this._status('error','EL VISOR ESPACIAL NO PUDO INICIARSE',String(err.message||err));
   try{await session.end()}catch{};
   throw err;
  }
 }
 updateSize(){
  if(!this.root)return;
  this.root.scale.setScalar(this.width/(this.asset?.objectWidth||2.3));
 }
 adjustSize(delta){this.width=clamp(this.width+delta,.2,.75);this.updateSize();return Math.round(this.width*100);}
 rotate(){this.rotation+=Math.PI/12;if(this.root)this.root.rotation.y=this.rotation;return Math.round(this.rotation*180/Math.PI)%360;}
 async fix(){
  // Unlike previous builds, user can only fix after an actual horizontal XR hit-test pose.
  const manual=this.stage==='manual-preview';
  if((this.stage!=='preview'&&!manual)||(!manual&&!this.latestHit)||!this.modelReady||!this.drawCalls)return false;
  const hit=this.latestHit;
  this.worldPosition.copy(this.root.position);
  this.marker.visible=false;clearFloorGuide();
  this._status('fixed',manual?'03 · RELICARIO FIJADO MANUALMENTE':'03 · RELICARIO FIJADO',manual?'Se mantiene en coordenadas AR, aunque el piso no fue detectado.':'La pieza permanecerá en este lugar. Podés caminar a su alrededor.');
  if(!manual&&hit&&typeof hit.createAnchor==='function'){
   try{const anchor=await hit.createAnchor();if(this.stage==='fixed'&&this.session){this.anchor=anchor;
    this._status('fixed','03 · RELICARIO FIJADO','Anclaje espacial activo. Caminá a su alrededor.');
   }else anchor.delete?.();}catch(err){console.info('AR spatial anchor not supported',err)}
  }
  return true;
 }
 reposition(){
  this.anchor?.delete?.();this.anchor=null;this.latestHit=null;this.marker&&(this.marker.visible=false);
  this.root&&(this.root.visible=false);clearFloorGuide();
  this._status('scan','01 · BUSCÁ UNA MESA O EL PISO','Apuntá el teléfono a una superficie real para volver a colocar la pieza.');
 }
 onFrame(time,frame){
  if(!this.session||!frame||!this.renderer)return;
  try{
   const space=this.renderer.xr.getReferenceSpace();
   const viewer=space&&frame.getViewerPose(space);
   if(!viewer)return;
   this.frames++;
   if(this.stage==='scan'||this.stage==='preview'||this.stage==='manual-preview'){
    const hit=chooseFloorHit(frame,this.hitSource,space,viewer)||chooseFloorHit(frame,this.hitSourceDown,space,viewer);
    if(hit){
     const p=hit.pose.transform.position;
     this.worldPosition.set(p.x,p.y,p.z);
     this.marker.position.copy(this.worldPosition);this.marker.visible=true;
     this.root.position.copy(this.worldPosition);
     this.root.rotation.y=this.rotation;
     this.root.visible=true;
     this.latestHit=hit.result;
     this.hitSeenAt=time;
     this.lastSource='real-plane';
     drawFloorGuide(viewer,this.worldPosition,this.width);
     if(this.modelReady&&this.stage!=='preview')this._status('preview','02 · SUPERFICIE REAL DETECTADA','Relicario sobre el piso o mesa. Ajustá el tamaño y tocá «Fijar».');
     if(!this.modelReady&&this.stage==='preview')this._status('scan','CARGANDO EL RELICARIO','Superficie detectada. Preparando la pieza original…');
    }else if(time-this.hitSeenAt>650){
     this.marker.visible=false;this.latestHit=null;clearFloorGuide();
     // AR preview follows the camera ONLY during scanning. It is never anchored
     // and cannot be confused with successful hit-testing or a fixed object.
     const pose=viewer.transform;
     const q=pose.orientation,p=pose.position;
     if(q&&p){
      tmpQ.set(q.x,q.y,q.z,q.w).normalize();
      const dir=v3.set(0,0,-1).applyQuaternion(tmpQ).normalize();
      const scale=this.root.scale.x||.2;
      const localHeight=this.asset?.height||2.5;
      this.root.position.set(p.x,p.y,p.z).addScaledVector(dir,1.25);
      this.root.position.y-=localHeight*scale*.5;
      this.root.rotation.y=this.rotation;
      this.root.visible=true;
     }
     this.lastSource='camera-preview';
     // No plane detected: still allow a tracked local-space placement with honest status.
     if(this.modelReady&&this.frames>30&&this.stage!=='manual-preview')this._status('manual-preview','02 · RELICARIO EN VISTA PREVIA','No se detectó el piso. Podés fijar la pieza manualmente o usar el visor nativo de ARCore.');
     else if(!this.modelReady&&this.stage!=='scan')this._status('scan','01 · BUSCÁ UNA MESA O EL PISO','Preparando el modelo mientras buscás una superficie.');
    }
   }else if(this.stage==='fixed'&&this.anchor){
    const pose=frame.getPose(this.anchor.anchorSpace,space);
    if(pose)this.root.position.set(pose.transform.position.x,pose.transform.position.y,pose.transform.position.z);
   }
   if(this.marker.visible){const pulse=1+.07*Math.sin(time/270);this.marker.scale.setScalar(pulse);}
   this.renderer.render(this.scene,this.camera);
   this.drawCalls=this.renderer.info.render.calls;
   if(time-this._statusTime>1600){
    const info=this.modelReady?`${this.asset.meshes} mallas · GPU ${this.drawCalls} dibujos · ${this.frames} frames · piso ${this.latestHit?'REAL ✓':'buscando'} · ${this.lastSource}`:`Vista de diagnóstico · GPU ${this.drawCalls} · modelo ${this.assetError?'ERROR':'cargando'} · piso ${this.latestHit?'REAL ✓':'buscando'}`;
    this.onState?.({stage:this.stage,message:null,detail:null,diagnostic:info,draws:this.drawCalls,frames:this.frames,modelReady:this.modelReady});
    this._statusTime=time;
   }
  }catch(err){
   if(this.frames%90===0){console.error('Relicario XR renderer error:',err);this._status('error','ERROR AL DIBUJAR EL OBJETO',String(err.message||err));}
  }
 }
 async end(){if(this.session){try{await this.session.end()}catch{this.stopFromSession()}}}
 stopFromSession(){
  this.renderer?.setAnimationLoop(null);
  this.hitSource?.cancel?.();this.hitSource=null;
  this.hitSourceDown?.cancel?.();this.hitSourceDown=null;this.previewReady=false;
  this.anchor?.delete?.();this.anchor=null;
  this.renderer?.dispose();this.renderer?.forceContextLoss?.();this.renderer=null;
  this.canvas?.remove();this.canvas=null;
  this.session=null;this.root=null;this.marker=null;this.previewKit=null;this.scene=null;this.camera=null;
  this.latestHit=null;this.frames=0;this.drawCalls=0;
  this._status('inactive','','');
  this.onEnd?.();
 }
}