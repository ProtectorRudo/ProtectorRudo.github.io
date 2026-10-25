/* RODEADOS 360 V14 — automatic game-ready enemy skins.
 * No file inputs, no Sketchfab login, no extra actions by the player.
 * Optional visual overlay ONLY; unchanged world XR anchor & combat headshots.
 * Attribution: "FREE [Military Soldier] RIGGED" by BAMEN,
 * https://sketchfab.com/3d-models/free-military-soldier-rigged-e9c56308a67d4a3db62e914fafa4d198
 * via https://github.com/cktang88/3d-fps (CC BY 4.0).
 * This is an armored tactical enemy, NOT Sketchfab M.A.N.U.L.
 */
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.181.0/examples/jsm/loaders/GLTFLoader.js';
import {buildAdapter} from './rodeados-manul.js?v=15';

const PRIMARY=new URL('./assets/rodeados/tactical-android.glb',import.meta.url).href;
// Version-pinned mirror for redundancy if project hosting has not synchronized yet.
const BACKUP='https://cdn.jsdelivr.net/gh/cktang88/3d-fps@130ac2a5c856401ec36e7d35afcfefe40c5801f4/public/assets/models/characters/soldier.glb';
const TIMEOUT_MS=11500;
const failAfter=(promise,timeout)=>Promise.race([promise,new Promise((_,reject)=>{
 const id=setTimeout(()=>reject(Error('timeout')),timeout);
 promise.finally(()=>clearTimeout(id)).catch(()=>{});
})]);

async function fetchValidatedGLB(url){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
 try{
  const response=await fetch(url,{signal:controller.signal,mode:'cors'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const length=Number(response.headers.get('content-length')||0);
  if(length>8000000)throw Error('Modelo demasiado grande');
  const buffer=await response.arrayBuffer();
  if(buffer.byteLength<10000||buffer.byteLength>8000000)throw Error('Archivo incompleto/pesado');
  const header=new DataView(buffer);
  if(header.getUint32(0,true)!==0x46546c67||header.getUint32(4,true)!==2||
     header.getUint32(8,true)!==buffer.byteLength)throw Error('GLB inválido');
  return buffer;
 }finally{clearTimeout(timer)}
}

function upgradeAndroidMaterials(THREE,scene){
 let meshes=0,materials=0;
 const seen=new Set();
 scene.traverse(node=>{
  if(!node.isMesh)return;
  meshes++;node.castShadow=false;node.receiveShadow=false;
  const items=Array.isArray(node.material)?node.material:[node.material];
  node.material=items.map(m=>{
   if(!m)return m;
   const replacement=m.clone();
   if(!seen.has(replacement)){
    materials++;seen.add(replacement);
    // Dark tactical plating, not garish toy colors. Preserve original
    // realistic PBR texture maps and normal microdetail.
    replacement.roughness=.63;replacement.metalness=.28;
    replacement.color.multiply(new THREE.Color(0xa1bdc8));
    replacement.needsUpdate=true;
   }
   return replacement;
  });
  if(!Array.isArray(node.userData?.originalMaterial))node.userData.originalMaterial=items;
  if(!Array.isArray(node.material)||node.material.length===1)node.material=node.material[0];
 });
 return {meshes,materials};
}

export async function installAutoRobots({THREE,art,signal,debug}){
 const stats={phase:'loading',source:'',meshes:0,clips:0,triangles:0,external:0,reason:''};
 if(debug)Object.defineProperty(globalThis,'__RodeadosAutoRobots',{
  configurable:true,value:{get status(){return {...stats,...art.getRobotAdapterStatus()}}}
 });
 let buffer,source='';
 for(const url of [PRIMARY,BACKUP]){
  if(signal?.aborted)return stats;
  try{buffer=await fetchValidatedGLB(url);source=url===PRIMARY?'bundled':'pinned-cdn';break}
  catch(e){stats.reason=String(e?.message||e);console.warn('Tactical enemy asset unavailable:',source||url,e)}
 }
 if(!buffer){stats.phase='fallback';return stats}
 if(signal?.aborted)return stats;
 try{
  const gltf=await failAfter(new Promise((res,rej)=>new GLTFLoader().parse(buffer,'',res,rej)),8000);
  if(signal?.aborted)return stats;
  const render=upgradeAndroidMaterials(THREE,gltf.scene);
  const adapter=buildAdapter(THREE,gltf,{label:'ANDROIDES TÁCTICOS',source});
  // Rig front already aligns with +Z, exactly matching e.angle in the core.
  // A forced 180° turn had displayed every enemy's back on Android.
  adapter.setFacing(0);
  art.setRobotAdapter(adapter);
  stats.phase='active';stats.source=source;
  stats.meshes=render.meshes;stats.clips=gltf.animations.length;
  stats.triangles=adapter.summary.tris;stats.facingDegrees=adapter.summary.facingDegrees;stats.selectedClips=adapter.summary.selectedClips;stats.reason='';
  return stats;
 }catch(e){
  stats.phase='fallback';stats.reason=String(e?.message||e);
  console.warn('RODEADOS native enemies preserved after GLB failure',e);
  return stats;
 }
}
