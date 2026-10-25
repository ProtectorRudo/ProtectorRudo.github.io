/* RODEADOS 360 — isolated 3D asset preview (only rodeados-manul.html).
 * The selected Sketchfab model is CC BY: credit Andrei Milin in the UI.
 * The official Sketchfab download requires account authentication. Never scrape.
 * Loading a model cannot mutate game rules, scoring or AR anchors.
 */
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.181.0/examples/jsm/loaders/GLTFLoader.js';
import {clone as cloneSkinned} from 'https://cdn.jsdelivr.net/npm/three@0.181.0/examples/jsm/utils/SkeletonUtils.js';
const MAX_ARCHIVE=55*1024*1024,MAX_TRIANGLES=90000,MAX_TEXTURE=1024;
const CDN_ZIP='https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm';
const DB_NAME='modo-caos-manul-local',DB_STORE='model-files';
function assetMemory(method,value){
 // Browser-local IndexedDB: the 3D file never goes to a server and isn't stored
 // in any GitHub repository or Supabase shared with other apps.
 return new Promise((resolve,reject)=>{
  if(!globalThis.indexedDB)return reject(Error('Almacenamiento local no disponible'));
  const open=indexedDB.open(DB_NAME,1);
  open.onupgradeneeded=()=>open.result.createObjectStore(DB_STORE);
  open.onerror=()=>reject(open.error||Error('No se puede abrir IndexedDB'));
  open.onsuccess=()=>{
   const db=open.result;
   let req;
   try{
    const tx=db.transaction(DB_STORE,method==='get'?'readonly':'readwrite');
    const store=tx.objectStore(DB_STORE);
    req=method==='put'?store.put(value,'current'):method==='delete'?store.delete('current'):store.get('current');
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||Error('Error del almacenamiento'));
    tx.oncomplete=()=>db.close();
    tx.onabort=()=>db.close();
   }catch(e){db.close();reject(e)}
  };
 });
}

const cleanPath=p=>{
 const result=[];
 for(const part of decodeURIComponent(String(p).replace(/\\/g,'/')).split('/')){
  if(part==='..')result.pop();
  else if(part&&part!=='.')result.push(part);
 }
 return result.join('/').toLowerCase();
};
function countTriangles(scene){
 let tris=0,meshes=0,skins=0,bones=0;
 scene.traverse(o=>{
  if(o.isMesh){
   meshes++;
   if(o.isSkinnedMesh)skins++;
   const g=o.geometry;
   if(g)tris+=Math.ceil((g.index?.count||g.attributes?.position?.count||0)/3);
  }
  if(o.isBone)bones++;
 });
 return {tris,meshes,skins,bones};
}
function optimizeTextures(scene,THREE){
 const seen=new Set();let reduced=0;
 scene.traverse(o=>{
  if(!o.isMesh)return;
  for(const m of (Array.isArray(o.material)?o.material:[o.material])){
   if(!m)continue;
   for(const field of ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap']){
    const tex=m[field],img=tex?.image;
    if(!tex||seen.has(tex)||!img?.width||!img?.height)continue;
    seen.add(tex);
    const big=Math.max(img.width,img.height);
    if(big<=MAX_TEXTURE)continue;
    const scale=MAX_TEXTURE/big;
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(img.width*scale));
    canvas.height=Math.max(1,Math.round(img.height*scale));
    const ctx=canvas.getContext('2d');
    if(!ctx)continue;
    try{ctx.drawImage(img,0,0,canvas.width,canvas.height);
     tex.image=canvas;tex.needsUpdate=true;reduced++;
    }catch(e){console.warn('MANUL texture kept at source resolution',e)}
   }
  }
 });
 return reduced;
}
function findAction(clips,kind){
 const rules={
  idle:/idle|breath|stand|wait|rest/i,
  walk:/walk|run|march|locomot|move|stride/i,
  dash:/run|sprint|charge|dash|walk/i,
  attack:/attack|punch|hit|swing|strike|melee|shoot/i,
  stun:/stun|stagger|hurt|damage|impact/i,
  taunt:/taunt|idle|wait/i
 };
 return clips.find(c=>rules[kind]?.test(c.name||''))||null;
}
function buildAdapter(THREE,gltf,meta){
 const stats=countTriangles(gltf.scene);
 if(stats.meshes===0||!stats.tris||stats.tris>MAX_TRIANGLES)
  throw Error('Modelo inválido o demasiado pesado ('+stats.tris+' triángulos; máximo '+MAX_TRIANGLES+')');
 const box=new THREE.Box3().setFromObject(gltf.scene);
 const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
 if(!Number.isFinite(size.y)||size.y<=.08||size.y>2000)throw Error('Modelo sin altura válida');
 const factor=Math.min(1.75/size.y,1.00/Math.max(.001,size.x,size.z));
 const texturesReduced=optimizeTextures(gltf.scene,THREE);
 const clips=gltf.animations||[];
 const bonesPrepared=stats.bones>0;
 let facingRadians=0;
 const adapter={
  name:'Robot M.A.N.U.L.',
  setFacing(degrees){facingRadians=THREE.MathUtils.degToRad(degrees);adapter.summary.facingDegrees=degrees},
  summary:{...stats,clips:clips.map(a=>a.name),texturesReduced,source:meta||''},
  create({actor,enemy}){
   // SkeletonUtils keeps bone/mesh bindings intact when several robots appear.
   const source=cloneSkinned(gltf.scene);
   const pivot=new THREE.Group();
   pivot.position.set(-center.x*factor,-box.min.y*factor,-center.z*factor);
   source.scale.setScalar(factor);pivot.add(source);
   actor.group.add(pivot);
   const mixer=clips.length?new THREE.AnimationMixer(source):null;
   const actions={};
   if(mixer)for(const kind of ['idle','walk','dash','attack','stun','taunt']){
    const clip=findAction(clips,kind);
    if(clip)actions[kind]=mixer.clipAction(clip);
   }
   // No Mixamo clips? The original rig still responds to procedural, subtle
   // joint motion. The native robot remains an emergency safety fallback.
   const joints=[];
   if(bonesPrepared)source.traverse(o=>{
    if(!o.isBone)return;
    const name=(o.name||'').toLowerCase();
    const axis=/upperarm|shoulder|humerus/.test(name)?'arm':
     /thigh|upleg|upperleg/.test(name)?'leg':
     /head|neck/.test(name)?'head':null;
    if(axis)joints.push({bone:o,base:o.rotation.clone(),axis,
      side:/left|_l\b|\.l$|\bl\b/.test(name)?-1:/right|_r\b|\.r$|\br\b/.test(name)?1:0});
   });
   let elapsed=enemy.age,active=null;
   return {
    root:pivot,
    update(e){
     const state=e.portal>.62?'idle':e.state==='dash'?'dash':
       e.state==='attack'?'attack':e.state==='stunned'?'stun':
       e.state==='taunt'?'taunt':['advance','flank','dodge'].includes(e.state)?'walk':'idle';
     pivot.visible=e.portal<.62;
     const now=e.age,delta=Math.max(0,Math.min(.07,now-elapsed));elapsed=now;
     const next=actions[state]||actions.walk||actions.idle||null;
     if(next!==active){
      active?.fadeOut(.12);
      next?.reset().fadeIn(.12).play();active=next;
     }
     mixer?.update(delta);
     // Non-animated rig: use actual skeleton joints, not a wobbling cube.
     if(!active){
      const t=now*7+e.id*.6,walking=state==='walk'||state==='dash';
      for(const j of joints){
       j.bone.rotation.copy(j.base);
       if(j.axis==='leg'&&walking)j.bone.rotation.x+=Math.sin(t+j.side*Math.PI)*.22;
       if(j.axis==='arm')j.bone.rotation.x+=state==='attack'?-.48:
        walking?Math.sin(t+j.side*Math.PI)*-.18:Math.sin(t*.24)*.035;
       if(j.axis==='head')j.bone.rotation.y+=Math.sin(t*.30)*.10;
      }
      pivot.rotation.y=facingRadians+Math.sin(t*.18)*.035;
      pivot.rotation.x=state==='attack'?-.11:0;
     }else{pivot.rotation.set(0,facingRadians,0)}
     if(e.lastHit>0)pivot.rotation.z=Math.sin(now*38)*Math.min(.10,e.lastHit*.4);
     else pivot.rotation.z=0;
    },
    dispose(){mixer?.stopAllAction();actor.group.remove(pivot)}
   };
  }
 };
 return adapter;
}
async function loadZip(file,THREE){
 const {default:JSZip}=await import(CDN_ZIP);
 const zip=await JSZip.loadAsync(await file.arrayBuffer());
 const files=Object.values(zip.files).filter(o=>!o.dir&&!o.name.startsWith('__MACOSX/'));
 // Reject ZIP bombs before materializing large images into memory.
 if(files.length>160)throw Error('Archivo con demasiados recursos (máximo 160)');
 const uncompressed=files.reduce((sum,x)=>sum+Math.max(0,Number(x._data?.uncompressedSize)||0),0);
 if(uncompressed>140*1024*1024)throw Error('ZIP descomprimido demasiado grande para Android (máximo 140 MB)');
 const entry=files.find(o=>/(^|\/)scene\.gltf$/i.test(o.name))||
  files.find(o=>/\.gltf$/i.test(o.name))||files.find(o=>/\.glb$/i.test(o.name));
 if(!entry)throw Error('El ZIP oficial no contiene scene.gltf ni ningún modelo GLB');
 const urls=new Map(),dispose=()=>{for(const url of urls.values())URL.revokeObjectURL(url)};
 const base=entry.name.slice(0,entry.name.lastIndexOf('/')+1);
 try{
  for(const v of files){
   if(v===entry)continue;
   const bytes=await v.async('blob');if(bytes.size>MAX_ARCHIVE)throw Error('Textura excesiva');
   const url=URL.createObjectURL(bytes);urls.set(cleanPath(v.name),url);
  }
  const manager=new THREE.LoadingManager();
  manager.setURLModifier(resource=>{
   if(resource.startsWith('data:')||resource.startsWith('blob:'))return resource;
   const key=cleanPath(base+resource),alt=cleanPath(resource);
   return urls.get(key)||urls.get(alt)||'data:,recurso-no-disponible';
  });
  const loader=new GLTFLoader(manager);
  const raw=await entry.async(entry.name.toLowerCase().endsWith('.glb')?'arraybuffer':'string');
  const gltf=await new Promise((resolve,reject)=>loader.parse(raw,'',resolve,reject));
  return {gltf,dispose};
 }catch(e){dispose();throw e}
}
export async function installManulPreview({THREE,art,notice}){
 const fileInput=document.getElementById('manulFile');
 const status=document.getElementById('manulStatus');
 const fallback=document.getElementById('manulFallback');
 const remember=document.getElementById('manulRemember');
 const facing=document.getElementById('manulFacing');
 if(!fileInput||!status||!fallback||!remember||!facing)return;
 const setStatus=(t,bad=false)=>{status.textContent=t;status.style.color=bad?'#ffb7aa':'#a9ffe6'};
 let release=null,adapter=null,loadVersion=0,savedName=null;
 async function parseLocal(file){
  if(!file||file.size>MAX_ARCHIVE||file.size<=0)throw Error('ZIP/GLB vacío o mayor de 55 MB');
  if(/\.zip$/i.test(file.name))return loadZip(file,THREE);
  if(!/\.glb$/i.test(file.name))throw Error('Solo ZIP glTF oficial o GLB');
  const bytes=await file.arrayBuffer();
  const gltf=await new Promise((resolve,reject)=>new GLTFLoader().parse(bytes,'',resolve,reject));
  return {gltf,dispose:()=>{}};
 }
 async function load(file,restored=false){
  const ticket=++loadVersion;
  setStatus(restored?'⏳ Restaurando modelo guardado en el celular…':
    '⏳ Verificando geometría, texturas y esqueleto…');
  let output=null;
  try{
   output=await parseLocal(file);
   if(ticket!==loadVersion){output.dispose();return}
   const next=buildAdapter(THREE,output.gltf,file.name);
   next.setFacing(Number(facing.value)||0);
   if(ticket!==loadVersion){output.dispose();return}
   art.setRobotAdapter(next);
   const oldRelease=release;
   adapter=next;release=output.dispose;oldRelease?.();
   const s=next.summary;
   const extra=s.skins===0?' · sin skin: verificá articulaciones':
    s.clips.length===0?' · sin clips: movimiento procedural':' · animaciones del modelo detectadas';
   setStatus('✅ MODELO CARGADO · '+file.name+' · '+s.tris.toLocaleString('es-AR')+
    ' triángulos · '+s.bones+' huesos · '+s.clips.length+' clips · '+
    s.texturesReduced+' texturas reducidas'+extra+'.');
   notice('🤖 Modelo 3D cargado en laboratorio · origen original: Andrei Milin',4);
   if(!restored){
    if(remember.checked){
     try{
      await assetMemory('put',{name:file.name,type:file.type||'',blob:file,savedAt:Date.now()});
      savedName=file.name;
      if(ticket===loadVersion)setStatus(status.textContent+' Guardado solo en este dispositivo.');
     }catch(err){
      console.warn('No se pudo guardar en el celular',err);
      if(ticket===loadVersion)setStatus(status.textContent+' No se pudo guardar para la próxima visita.');
     }
    }else{try{await assetMemory('delete');savedName=null}catch(_){}}
   }
  }catch(e){
   if(output)output.dispose();
   if(ticket!==loadVersion)return;
   console.error('MANUL import error',e);
   setStatus('⚠ '+(e.message||'No se pudo leer el modelo')+' · Seguí con los robots originales.',true);
  }
 }
 fileInput.addEventListener('change',()=>{const file=fileInput.files?.[0];if(file)void load(file)});
 facing.addEventListener('change',()=>{
  if(!adapter)return;
  const degrees=Number(facing.value)||0;
  adapter.setFacing(degrees);
  // Recreate the current visual actors with updated front direction; physics
  // remains authoritative and no player position or AR anchor is reset.
  art.setRobotAdapter(adapter);
  setStatus('🔄 Frente del robot corregido a '+degrees+'°. Entrá al entrenamiento para comprobarlo.');
 });
 fallback.addEventListener('click',()=>{
  ++loadVersion;
  art.setRobotAdapter(null);
  release?.();release=null;adapter=null;fileInput.value='';
  savedName=null;
  assetMemory('delete').catch(e=>console.warn('No se pudo borrar archivo local',e));
  setStatus('↩ Robots originales restaurados y archivo guardado borrado. La mira sigue igual.');
 });
 const baseStatus='Descargá el ZIP glTF desde Sketchfab e importalo una sola vez. El juego normal sigue intacto.';
 setStatus(baseStatus);
 globalThis.__RodeadosManulPreview={
  get status(){return status.textContent},
  get actorStatus(){return art.getRobotAdapterStatus()},
  get savedName(){return savedName},
  get facing(){return adapter?.summary.facingDegrees??0},
  get countLimit(){return art.getRobotAdapterStatus().maxExternal}
 };
 // Reuse user-supplied file on future visits. This is local and opt-outable;
 // do not silently fetch model content from Sketchfab or use external storage.
 try{
  const cached=await assetMemory('get');
  if(loadVersion===0&&cached?.blob&&cached?.name&&/\.(zip|glb)$/i.test(cached.name)){
   remember.checked=true;savedName=cached.name;
   const file=new File([cached.blob],cached.name,{type:cached.type||''});
   await load(file,true);
  }
 }catch(e){console.warn('MANUL sin almacenamiento persistente',e);setStatus(baseStatus)}
}
