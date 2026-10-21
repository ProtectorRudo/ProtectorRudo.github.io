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
// All AR combatants now share the same photorealistic MakeHuman/Studio pipeline as Maya.
const source={
 raiderA:CDN+'npc-jordan-locomotion.glb',
 raiderB:CDN+'npc-sam-locomotion.glb',
 raiderC:CDN+'npc-harper-locomotion.glb',
 raiderD:CDN+'npc-jordan-locomotion.glb',
 operator:'https://cdn.jsdelivr.net/gh/cktang88/3d-fps@main/public/assets/models/characters/soldier.glb',
 operatorTac:'https://cdn.jsdelivr.net/gh/cktang88/3d-fps@main/public/assets/models/characters/soldier_tac.glb',
 hostage:CDN+'npc-maya-locomotion.glb'
};
const backUp={
 raiderA:CDN+'npc-sam-locomotion.glb',
 raiderB:CDN+'npc-harper-locomotion.glb',
 raiderC:CDN+'npc-jordan-locomotion.glb',
 raiderD:CDN+'npc-harper-locomotion.glb'
};
const TACTICAL='https://cdn.jsdelivr.net/gh/cktang88/3d-fps@main/public/assets/models/characters/soldier.glb';
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
 return Promise.allSettled([load('raiderA'),load('raiderB'),load('operator'),load('hostage')])
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
 // High-detail textured human skin, hair and limbs come from the SAME
 // library as the hostage, with lightweight tactical equipment layered on.
 if(key.startsWith('raider'))equipStudioHuman(actor,key,rig);
 actor.rig=rig;actor.gltfRoot=visual;actor.mixer=new THREE.AnimationMixer(visual);actor.assetName=key;
 actor.clips=data.clips;actor.animMode='';
 actor.actions=new Map();actor.assetReady=true;
 playHuman(actor,type==='hostage'?'sit':'idle',true);
 return true;
 });
}

// Tactical outfit intentionally does not replace skin textures or facial
// geometry from the studio rig. It is scaled in real-world meters and does
// not contain the enormous box/helmet of the old low-poly bot models.
function equipStudioHuman(actor,type,rig){
 const palette={
  raiderA:{plate:0x3f4a3c,cloth:0x353b34,trim:0x86856d},
  raiderB:{plate:0x444b54,cloth:0x303b45,trim:0x788390},
  raiderC:{plate:0x575043,cloth:0x3d4138,trim:0x9c8760},
  raiderD:{plate:0x313839,cloth:0x393d3f,trim:0x918f78}
 }[type]||{plate:0x454640,cloth:0x43443b,trim:0xaaa388};
 const dark=new THREE.MeshStandardMaterial({color:palette.plate,roughness:.89,metalness:.015});
 const cloth=new THREE.MeshStandardMaterial({color:palette.cloth,roughness:.98,metalness:0});
 const webbing=new THREE.MeshStandardMaterial({color:palette.trim,roughness:.84,metalness:.015});
 const gunmetal=new THREE.MeshStandardMaterial({color:0x25292b,roughness:.49,metalness:.41});
 const kit=new THREE.Group();
 kit.name='V29_REALISTIC_KIT';
 // Body armature model normalized to a ground-based height of 1.73m.
 // Slightly raised from the skin to avoid z-fighting, curved polygons rather
 // than opaque rectangular helmets. Keep face visible and identifiable.
 const ellipsoid=(material,x,y,z,sx,sy,sz)=>{
  const m=new THREE.Mesh(new THREE.SphereGeometry(1,18,14),material);
  m.position.set(x,y,z);m.scale.set(sx,sy,sz);kit.add(m);return m;
 };
 ellipsoid(dark,0,1.205,.137,.216,.258,.066); // front plate carrier
 ellipsoid(cloth,0,1.215,-.147,.206,.25,.049); // rear carrier
 ellipsoid(webbing,0,.989,.122,.190,.043,.067); // belt
 for(const side of [-1,1]){
   const strap=ellipsoid(cloth,side*.16,1.335,.025,.050,.188,.054);
   strap.rotation.z=side*.18;
   ellipsoid(dark,side*.109,1.014,.21,.076,.067,.037);
   ellipsoid(webbing,side*.173,1.214,.166,.047,.084,.038);
 }
 // Functional radio, side pouch and helmet strap without a geometric
 // face-hiding visor; human hair and facial features stay visible.
 ellipsoid(gunmetal,-.215,1.234,.067,.055,.11,.066);
 ellipsoid(webbing,-.215,1.372,.061,.013,.10,.018);
 ellipsoid(dark,.220,.898,.033,.078,.125,.058);
 // Small weapon with realistic proportions, carried across torso.
 // Weapon stays a static silhouette when skeleton has no compatible hand.
 // The old head-to-toe 'LEGO' mesh is never displayed once rig is ready.
 const rifle=new THREE.Group();
 rifle.name='LIGHT_TACTICAL_CARBINE';rifle.position.set(.08,1.126,.32);
 rifle.rotation.set(-.16,0,-.32);
 const part=(geo,mat,x,y,z)=>{
  const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);rifle.add(m);return m;
 };
 part(new THREE.BoxGeometry(.07,.10,.31),gunmetal,0,0,0);
 part(new THREE.CylinderGeometry(.018,.018,.38,10),gunmetal,0,0,-.31).rotation.x=Math.PI/2;
 part(new THREE.BoxGeometry(.086,.037,.20),webbing,0,.066,-.02);
 part(new THREE.BoxGeometry(.068,.16,.07),dark,0,-.115,.055);
 part(new THREE.BoxGeometry(.065,.05,.14),cloth,0,-.017,.205);
 kit.add(rifle);
 actor.root.add(kit);
 actor.tacticalKit=kit;
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
