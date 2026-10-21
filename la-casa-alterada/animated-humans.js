/**
 * CC0 human locomotion: Innerscene / MakeHuman, already imported by studio
 * ProtectorRudo/viralio public/viralio-3d/models/npc-{jordan,sam,maya}-locomotion.glb
 * Independent SkinnedMesh skeletons via Three.js SkeletonUtils.clone.
 * Async loading has a procedural fallback (no loading gate).
 */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
const CDN='https://cdn.jsdelivr.net/gh/ProtectorRudo/viralio@main/public/viralio-3d/models/';
const MILITARY='https://cdn.jsdelivr.net/gh/cktang88/3d-fps@main/public/assets/models/characters/';
// All AR combatants now share the same photorealistic MakeHuman/Studio pipeline as Maya.
// Full military-uniform rigged soldier: BAMEN, CC BY 4.0.
const source={
 raiderA:MILITARY+'soldier.glb',raiderB:MILITARY+'soldier.glb',
 raiderC:MILITARY+'soldier.glb',raiderD:MILITARY+'soldier.glb',
 operator:MILITARY+'soldier.glb',operatorTac:MILITARY+'soldier.glb',
 hostage:CDN+'npc-maya-locomotion.glb'
};
const backUp={
 raiderA:MILITARY+'soldier.glb',raiderB:MILITARY+'soldier.glb',
 raiderC:MILITARY+'soldier.glb',raiderD:MILITARY+'soldier.glb',
 operator:MILITARY+'soldier.glb',operatorTac:MILITARY+'soldier.glb'
};
const TACTICAL=MILITARY+'soldier.glb';
const cache=new Map(),urlCache=new Map(),loader=new GLTFLoader();
const cloneQueue=[];let cloneBusy=false;
function staggerClone(work){
 return new Promise(resolve=>{
   cloneQueue.push({work,resolve});
   if(!cloneBusy)nextClone();
 });
}
function nextClone(){
 if(cloneBusy||!cloneQueue.length)return;
 cloneBusy=true;
 setTimeout(()=>{
   const job=cloneQueue.shift();
   try{job.resolve(job.work())}catch(e){console.warn('Animated actor failed',e);job.resolve(false)}
   cloneBusy=false;if(cloneQueue.length)nextClone();
 },95);
}
loader.setMeshoptDecoder(MeshoptDecoder);
function load(type){
 if(!cache.has(type)){
  const preferred=source[type];
  const fallback=backUp[type]||(type==='operatorTac'?source.operator:null);
  // Rigged original shooter characters: painted clothing, masks, cargo and kit.
  // Independent source asset (not any Valve/CS2 game files). Keep studio
  // humanoids as a fallback when a phone cannot fetch these models.
  // Multiple raid skins reuse 3 CC0 human sources; decode each GLB only once.
  const fetchOnce=url=>{
    if(!urlCache.has(url))urlCache.set(url,loader.loadAsync(url));
    return urlCache.get(url);
  };
  const get=async()=>{
    try{return await fetchOnce(preferred)}
    catch(err){
      if(!fallback)throw err;
      console.warn('Studio human unavailable; trying fallback',type,err);
      try{return await fetchOnce(fallback)}
      catch(err2){return fetchOnce(TACTICAL)}
    }
  };
  cache.set(type,get().then(g=>{
    const clips={};
    for(const clip of g.animations){let name=clip.name.toLowerCase();let key=name.includes('idle')||name.includes('stand')?'idle':name.includes('jog')||name.includes('sprint')||name.includes('run')?'run':name.includes('walk')||name.includes('move')?'walk':name.includes('sit')||name.includes('crouch')?'sit':'other';(clips[key]??=[]).push(clip)}
    return {scene:g.scene,clips,animations:g.animations};
  }).catch(err=>{console.warn('Human asset not loaded; tactical fallback active:',type,err);return null}))
 }
 return cache.get(type)
}
export function preloadHumans(){
 return Promise.allSettled([load('raiderA'),load('operator'),load('hostage')])
}
export async function attachHuman(actor,type='raiderA'){
 const key=type==='hostage'?'hostage':['raiderA','raiderB','raiderC','raiderD','operator','operatorTac'].includes(type)?type:'raiderA';
 const data=await load(key);
 if(!data||!actor?.root||!actor?.root.parent)return false;
 return staggerClone(()=>{
 if(!actor.alive||!actor.root.parent)return false;
 const visual=cloneSkeleton(data.scene);
 visual.traverse(n=>{
   if(n.isSkinnedMesh||n.isMesh){
     n.frustumCulled=false;
     n.castShadow=true;
     n.receiveShadow=false;
     if(n.material){
       for(const m of (Array.isArray(n.material)?n.material:[n.material])){
         if(m.map)m.map.anisotropy=Math.min(4,Math.max(1,m.map.anisotropy||1));
       }
     }
   }
 });
 const bounds=new THREE.Box3().setFromObject(visual);
 const size=new THREE.Vector3(),center=new THREE.Vector3();
 bounds.getSize(size);bounds.getCenter(center);
 if(!Number.isFinite(size.y)||size.y<.3||size.y>30)return false;
 const k=(type==='hostage'?1.62:1.73)/size.y;
 const rig=new THREE.Group();
 rig.position.set(-center.x*k,-bounds.min.y*k,-center.z*k);
 visual.scale.setScalar(k);
 // Put bounds inside a dedicated rig so the pelvis can animate independently.
 rig.add(visual);
 // Individual subdued uniform tinting, without attaching floating boxes
 // to a skeleton's incompatible coordinate system.
 if(key!=='hostage'){
   const palette={raiderA:0x7c8674,raiderB:0x6d7a79,raiderC:0x90816a,
      raiderD:0x717861,operator:0x84958c,operatorTac:0x7b9295};
   const tint=new THREE.Color(palette[key]||0xffffff);
   visual.traverse(mesh=>{
     if(!mesh.isMesh&&!mesh.isSkinnedMesh)return;
     const recolor=mat=>{
       if(!mat?.color)return mat;
       const copy=mat.clone();copy.color.lerp(copy.color.clone().multiply(tint),.20);
       return copy;
     };
     if(mesh.material)mesh.material=Array.isArray(mesh.material)?
       mesh.material.map(recolor):recolor(mesh.material);
   });
 }
 // Move hitbox to root before hiding procedural mesh.
 if(actor.hit&&actor.hit.parent!==actor.root){actor.root.updateMatrixWorld(true);actor.root.attach(actor.hit)}
 // V30: prohibit attaching a mesh authored in a different skeleton's
 // coordinate system. That caused colossal balloon-shaped tactical gear
 // and weapons hanging from shoulders in the live AR screenshots.
 // The source human body/clothing is now the only visible rig mesh.
 if(actor.flesh)actor.flesh.visible=false;
 actor.root.add(rig);
 // High-detail textured human skin, hair and limbs come from the SAME
 // library as the hostage, with lightweight tactical equipment layered on.
 // No procedural helmet/balloon packs overlay the studio human:
 // incompatible rig coordinates can cause oversized floating accessories.
 actor.rig=rig;actor.gltfRoot=visual;actor.mixer=new THREE.AnimationMixer(visual);actor.assetName=key;
 actor.clips=data.clips;actor.animMode='';
 actor.actions=new Map();actor.assetReady=true;
 playHuman(actor,type==='hostage'?'sit':'idle',true);
 return true;
 });
}

function bestClip(actor,kind){
 let clips=actor.clips?.[kind];if(!clips?.length&&kind==='sit')clips=actor.clips?.idle;
 if(!clips?.length&&kind==='run')clips=actor.clips?.walk;
 if(!clips?.length)clips=actor.clips?.idle;
 if(!clips?.length)clips=actor.clips?.other;
 if(!clips?.length)return null;
 if(kind==='sit')return clips.find(x=>/sit/i.test(x.name))||clips[0];
 return clips[0];
}
export function playHuman(actor,kind,instant=false){
 if(!actor?.mixer)return;
 if(actor.animMode===kind)return;
 const clip=bestClip(actor,kind);
 if(!clip)return;
 let next=actor.actions.get(clip.name);
 if(!next){next=actor.mixer.clipAction(clip);actor.actions.set(clip.name,next)}
 if(actor.currentAction&&actor.currentAction!==next){actor.currentAction.fadeOut(instant?0:.22)}
 next.reset().setEffectiveWeight(1).setEffectiveTimeScale(kind==='run'?1.13:1);
 next.fadeIn(instant?0:.22).play();
 actor.currentAction=next;actor.animMode=kind;
}
export function animateHuman(actor,dt,speed=0){
 if(!actor?.mixer||!actor.root.visible)return false;
 playHuman(actor,speed>.57?'run':speed>.07?'walk':actor.hostage?'sit':'idle');
 actor.animationAccum=(actor.animationAccum||0)+dt;
 // Keep expensive skeletal updates predictable on midrange phones.
 const step=actor.lodFar?.068:.034;
 if(actor.animationAccum<step)return true;
 actor.mixer.update(Math.min(actor.animationAccum,.11));
 // Subtle shoulder lean when an actor exposes itself from cover.
 if(actor.rig){
   const crouch=actor.ctfStance==='crouch'||actor.coverState==='hold'||
     actor.coverState==='retreat';
   const wantedHeight=crouch?.71:1;
   const smooth=Math.min(1,actor.animationAccum*8);
   actor.rig.scale.y+=(wantedHeight-actor.rig.scale.y)*smooth;
   const lean=actor.coverState==='fire'?(actor.id%2===0?.085:-.085):0;
   actor.rig.rotation.z+=(lean-actor.rig.rotation.z)*Math.min(1,actor.animationAccum*7);
 }
 actor.animationAccum=0;
 return true
}
export function disposeHuman(actor){
 if(actor?.mixer){actor.mixer.stopAllAction();if(actor.gltfRoot)actor.mixer.uncacheRoot(actor.gltfRoot)}
 actor.mixer=null;actor.actions?.clear();
}
