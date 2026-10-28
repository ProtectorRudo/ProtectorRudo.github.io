import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';

let loading=null;
function playClip(actor,name){
 const clip=actor?.rigClips?.find(a=>a.name.toLowerCase().endsWith('_'+name.toLowerCase()));
 if(!clip||!actor.mixer||actor.currentClip===clip)return;
 actor.action?.fadeOut(.11);
 const action=actor.mixer.clipAction(clip);
 action.enabled=true;action.reset().fadeIn(.11);
 action.setLoop(name==='Idle'?THREE.LoopRepeat:THREE.LoopOnce,name==='Idle'?Infinity:1);
 action.clampWhenFinished=name!=='Idle';action.play();
 actor.currentClip=clip;actor.action=action;
}
function materialFor(material,keeper){
 const out=material.clone(),name=String(material.name||'').toLowerCase();
 const color=name.startsWith('shirt')?(keeper?(name.endsWith('2')?'#d89440':'#ffc15b'):(name.endsWith('2')?'#187eaf':'#43daff')):name==='pants'?(keeper?'#112b51':'#142b46'):name==='socks'?'#e3fff9':name==='shoes'?'#101b25':null;
 if(color&&out.color)out.color.set(color);
 if('roughness' in out)out.roughness=.76;
 return out;
}
function attach(gltf,actor,keeper){
 const figure=cloneSkeleton(gltf.scene),b=new THREE.Box3();
 figure.updateMatrixWorld(true);
 figure.traverse(node=>{
  if(!node.isMesh)return;
  node.castShadow=true;node.receiveShadow=true;
  if(Array.isArray(node.material))node.material=node.material.map(x=>materialFor(x,keeper));
  else node.material=materialFor(node.material,keeper);
  if(node.isSkinnedMesh&&node.computeBoundingBox){
   node.computeBoundingBox();
   if(node.boundingBox)b.union(node.boundingBox.clone().applyMatrix4(node.matrixWorld));
  }
 });
 if(b.isEmpty())throw Error('Animated player has no skinned bounds');
 const h=b.max.y-b.min.y;
 if(!Number.isFinite(h)||h<.01||h>10000)throw Error('Unexpected character height');
 const scale=1.61/h;
 figure.scale.multiplyScalar(scale);
 figure.position.y=-b.min.y*scale;
 actor.root.add(figure);
 actor.rig=figure;actor.rigRestY=figure.position.y;actor.person.visible=false;
 actor.mixer=new THREE.AnimationMixer(figure);
 actor.rigClips=gltf.animations;
 playClip(actor,'Idle');
}
export function installPremiumRigs(keeper,shooter){
 if(loading)return loading;
 window.penalesRigStatus='loading';
 loading=(async()=>{
  const url=new URL('./assets/penales/player.glb',import.meta.url).href;
  const gltf=await new GLTFLoader().loadAsync(url);
  if(!gltf.scene||!gltf.animations?.length)throw Error('Empty humanoid rig');
  attach(gltf,keeper,true);
  attach(gltf,shooter,false);
  window.penalesRigStatus='loaded';
  return true;
 })().catch(err=>{
  window.penalesRigStatus='fallback';
  console.warn('PENALES AR premium rig unavailable; procedural characters preserved',err);
  return false;
 });
 return loading;
}
export function tickRigs(dt,keeper,shooter){
 keeper?.mixer?.update(dt);shooter?.mixer?.update(dt);
}
export function resetRigs(keeper,shooter){
 for(const actor of [keeper,shooter]){
  if(!actor?.rig)continue;
  actor.rig.rotation.set(0,0,0);actor.rig.position.y=actor.rigRestY;
  playClip(actor,'Idle');
 }
}
export function kickRigs(keeper,shooter){
 playClip(keeper,'Jump');playClip(shooter,'Run');
}
export function poseRigs(keeper,shooter,save,ease,launch){
 if(shooter?.rig)shooter.rig.rotation.x=-Math.sin(Math.PI*launch)*.12;
 if(keeper?.rig){
  keeper.rig.rotation.z=-save.x*.86*ease;
  keeper.rig.position.y=keeper.rigRestY+save.y*.30*ease;
 }
}
