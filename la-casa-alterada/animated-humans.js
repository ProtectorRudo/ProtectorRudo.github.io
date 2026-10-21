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
const ORIGINAL_BOTS='https://cdn.jsdelivr.net/gh/StarKnightt/counter-strike-in-browser@92f3e6ddee40c6b531c0788c2cf3db4c56853a37/public/models/';
const source={
 raiderA:ORIGINAL_BOTS+'bot_mask.glb',
 raiderB:ORIGINAL_BOTS+'bot_wrap.glb',
 raiderC:ORIGINAL_BOTS+'bot_mask_cap.glb',
 raiderD:ORIGINAL_BOTS+'bot_wrap_goggles.glb',
 operator:'https://cdn.jsdelivr.net/gh/cktang88/3d-fps@main/public/assets/models/characters/soldier.glb',
 hostage:CDN+'npc-maya-locomotion.glb'
};
const backUp={
 raiderA:CDN+'npc-jordan-locomotion.glb',
 raiderB:CDN+'npc-sam-locomotion.glb',
 raiderC:CDN+'npc-jordan-locomotion.glb',
 raiderD:CDN+'npc-sam-locomotion.glb'
};
const TACTICAL='https://cdn.jsdelivr.net/gh/cktang88/3d-fps@main/public/assets/models/characters/soldier.glb';
const cache=new Map(),loader=new GLTFLoader();
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
  const fallback=backUp[type];
  // Rigged original shooter characters: painted clothing, masks, cargo and kit.
  // Independent source asset (not any Valve/CS2 game files). Keep studio
  // humanoids as a fallback when a phone cannot fetch these models.
  const get=async()=>{
    try{return await loader.loadAsync(preferred)}
    catch(err){
      if(!fallback)throw err;
      console.warn('Tactical character unavailable; loading studio fallback',type,err);
      try{return await loader.loadAsync(fallback)}
      catch(err2){return loader.loadAsync(TACTICAL)}
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
 return Promise.allSettled([load('raiderA'),load('raiderB'),load('operator'),load('hostage')])
}
export async function attachHuman(actor,type='raiderA'){
 const key=type==='hostage'?'hostage':['raiderA','raiderB','raiderC','raiderD','operator'].includes(type)?type:'raiderA';
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
 // Move hitbox to root before hiding procedural mesh.
 if(actor.hit&&actor.hit.parent!==actor.root){actor.root.updateMatrixWorld(true);actor.root.attach(actor.hit)}
 if(actor.flesh){
   const rifle=actor.flesh.getObjectByName('RIFLE_HELD');
   // A weapon attached to the pelvis/root looks like a floating robot arm.
   // Place it on the right-hand bone if possible so it follows locomotion.
   if(rifle){
     const bones=[];const allNames=[];
     visual.traverse(n=>{allNames.push(n.name.toLowerCase());if(n.isBone&&/right.*hand|hand.*right|hand_r|r_hand|mixamorig.*righthand/i.test(n.name))bones.push(n)});
     const integratedWeapon=allNames.some(n=>/(rifle|firearm|gun|weapon)/i.test(n));
     // Headgear and plate carriers are already authored and skinned in the source GLBs.
     // Do not overlay low-poly helmets: that made the earlier enemies look artificial.
     if(!integratedWeapon&&bones.length){
       bones[0].add(rifle);
       rifle.position.set(.04,-.08,-.04);
       rifle.rotation.set(-.06,Math.PI*.75,-.12);
       rifle.scale.setScalar(.54);
     }else{
       rifle.parent?.remove(rifle); // no unsupported rigid weapon overlay
     }
   }
   actor.flesh.visible=false;
 }
 actor.root.add(rig);
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
   const lean=actor.coverState==='fire'?(actor.id%2===0?.055:-.055):0;
   actor.rig.rotation.z+=(lean-actor.rig.rotation.z)*Math.min(1,actor.animationAccum*7);
 }
 actor.animationAccum=0;
 return true
}
export function disposeHuman(actor){
 if(actor?.mixer){actor.mixer.stopAllAction();if(actor.gltfRoot)actor.mixer.uncacheRoot(actor.gltfRoot)}
 actor.mixer=null;actor.actions?.clear();
}
