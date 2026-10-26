/* RODEADOS 360 V14 — automatic game-ready enemy skins.
 * No file inputs, no Sketchfab login, no extra actions by the player.
 * Optional visual overlay ONLY; unchanged world XR anchor & combat headshots.
 * Attribution: "FREE [Military Soldier] RIGGED" by BAMEN,
 * https://sketchfab.com/3d-models/free-military-soldier-rigged-e9c56308a67d4a3db62e914fafa4d198
 * via https://github.com/cktang88/3d-fps (CC BY 4.0).
 * This is an armored tactical enemy, NOT Sketchfab M.A.N.U.L.
 */
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.181.0/examples/jsm/loaders/GLTFLoader.js';
import {buildAdapter} from './rodeados-manul.js?v=16';

const PRIMARY=new URL('./assets/rodeados/tactical-android.glb',import.meta.url).href;
// Version-pinned mirror for redundancy if project hosting has not synchronized yet.
const BACKUP='https://cdn.jsdelivr.net/gh/cktang88/3d-fps@130ac2a5c856401ec36e7d35afcfefe40c5801f4/public/assets/models/characters/soldier.glb';
const SECONDARY=new URL('./assets/rodeados/tactical-heavy.glb',import.meta.url).href;
const BACKUP_HEAVY='https://cdn.jsdelivr.net/gh/cktang88/3d-fps@130ac2a5c856401ec36e7d35afcfefe40c5801f4/public/assets/models/characters/soldier_tac.glb';
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

async function prepareOne({THREE,art,primary,backup,label,facing=0}){
 let buffer=null,source='';
 for(const url of [primary,backup]){
  try{buffer=await fetchValidatedGLB(url);source=url===primary?'bundled':'pinned-cdn';break}
  catch(e){console.warn('RODEADOS asset fallback',label,url,e)}
 }
 if(!buffer)throw Error('No se pudo cargar '+label);
 const gltf=await failAfter(new Promise((res,rej)=>new GLTFLoader().parse(buffer,'',res,rej)),8500);
 const render=upgradeAndroidMaterials(THREE,gltf.scene);
 const adapter=buildAdapter(THREE,gltf,{label,source});
 adapter.setFacing(facing);
 return {adapter,render,source,gltf};
}
export async function installAutoRobots({THREE,art,signal,debug}){
 const stats={phase:'loading',source:'',meshes:0,clips:0,triangles:0,models:[],external:0,reason:''};
 if(debug)Object.defineProperty(globalThis,'__RodeadosAutoRobots',{
  configurable:true,value:{get status(){return {...stats,...art.getRobotAdapterStatus()}}}
 });
 let standard=null,heavy=null;
 try{
  standard=await prepareOne({THREE,art,primary:PRIMARY,backup:BACKUP,label:'ANDROID TACTICAL'});
  if(signal?.aborted)return stats;
 }catch(e){stats.phase='fallback';stats.reason=e.message;return stats}
 // The two actual humanoid GLBs are separate, independently licensed
 // downloaded models. Heavy is optional if its URL is unavailable.
 try{
  heavy=await prepareOne({THREE,art,primary:SECONDARY,backup:BACKUP_HEAVY,label:'ARMORED GUARD'});
 }catch(e){console.warn('Second humanoid unavailable, using standard armored material fallback',e)}
 if(signal?.aborted)return stats;
 try{
  const adapter={
   name:'ANDROIDES DE COMBATE · 2 TIPOS',
   create({actor,enemy,THREE:engine}){
    const wantsHeavy=enemy.type==='tank'||enemy.type==='boss'||enemy.id%2===0;
    const variant=wantsHeavy&&heavy?heavy:standard;
    const anim=variant.adapter.create({actor,enemy,THREE:engine});
    anim.variant=wantsHeavy?'heavy':'standard';
    return anim;
   },
   setFacing(deg){standard.adapter.setFacing(deg);heavy?.adapter.setFacing(deg)}
  };
  art.setRobotAdapter(adapter);
  stats.phase='active';
  stats.source=standard.source;
  stats.models=[{name:'TACTICAL',source:standard.source,triangles:standard.adapter.summary.tris},
   {name:'HEAVY',source:heavy?.source||'fallback',triangles:heavy?.adapter.summary.tris||0}];
  stats.meshes=standard.render.meshes+(heavy?.render.meshes||0);
  stats.clips=standard.gltf.animations.length+(heavy?.gltf.animations.length||0);
  stats.triangles=standard.adapter.summary.tris;
  stats.facingDegrees=standard.adapter.summary.facingDegrees;
  stats.selectedClips=standard.adapter.summary.selectedClips;
  stats.reason=heavy?'':'Second 3D variant unavailable: same original robot with different states';
  return stats;
 }catch(e){
  stats.phase='fallback';stats.reason=e.message;
  console.warn('RODEADOS old enemy models kept',e);
  return stats;
 }
}
