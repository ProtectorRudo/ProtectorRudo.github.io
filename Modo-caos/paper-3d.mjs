/*
  Territory Loop: humanoid 3D characters (progressive enhancement only).
  CC0 original model author: Kay Lousberg — KayKit Adventurers.
  Source: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0
  Primary models: Styloo Chibi Characters, CC0 1.0; locally hosted official GLB files.
  Fallback models: KayKit Adventurers, CC0 1.0; original screenshots not reused.
  If WebGL, 3D assets, or the CDN fail, the game keeps its custom chibi canvas sprites.
*/
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const canvas=document.getElementById('characterStage');
const getState=()=>typeof window.Paper3DState==='function'?window.Paper3DState():null;
const relative='./assets/styloo/';
const models=['archer.glb','merchant.glb','student.glb','ninja.glb'];
const backupBase='https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/main/addons/kaykit_character_pack_adventures/Characters/gltf/';
const backupModels=['Knight.glb','Barbarian.glb','Mage.glb','Rogue.glb'];
const palette=['#25d9ef','#ffae3c','#ad75f7','#5ad980'];
const RIG_HEIGHT=80;
const gltfLoader=new GLTFLoader();
const sourceAssets=new Array(models.length).fill(null),instances=new Map();
window.Paper3DReady=Object.create(null);
window.PaperVSReady=false;
let scene,camera,renderer,started=false,failed=false,last=0,activeHero=-1;
try{
 renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power',premultipliedAlpha:false});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
 renderer.setClearColor(0,0);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.25;
 scene=new THREE.Scene();
 camera=new THREE.OrthographicCamera(-200,200,350,-350,.1,3000);
 scene.add(new THREE.HemisphereLight(0xf1ffff,0x5e7aab,2.8));
 const key=new THREE.DirectionalLight(0xfff9e8,3.1);key.position.set(-250,350,700);scene.add(key);
 const fill=new THREE.DirectionalLight(0x86d9ff,1.3);fill.position.set(200,180,340);scene.add(fill);
}catch(e){failed=true;console.warn('3D not available, using original chibi fallback',e);}
const material=(color,metalness=0,roughness=.34)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
const addMesh=(group,geometry,mat,x,y,z=0)=>{const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);group.add(m);return m;};
function makeOutfit(itemId){
 const group=new THREE.Group();
 if(itemId==='outfit_base')return group;
 const navy=material('#29498c',.18),gold=material('#ffe081',.4),white=material('#f8ffff',.15),pink=material('#ff658c',.1);
 if(itemId==='outfit_cap'){
  addMesh(group,new THREE.SphereGeometry(16,16,10,0,Math.PI*2,0,Math.PI/2),pink,0,75,0);
  addMesh(group,new THREE.BoxGeometry(33,3,12),navy,0,73,11);
  addMesh(group,new THREE.SphereGeometry(4,10,8),gold,0,89,0);
 }else if(itemId==='outfit_shades'){
  for(const x of [-9,9]){
   addMesh(group,new THREE.BoxGeometry(15,9,3),navy,x,62,17);
   addMesh(group,new THREE.BoxGeometry(12,6,1),material('#54cfff',.8),x,62,19);
  }
  addMesh(group,new THREE.BoxGeometry(7,2,3),gold,0,64,17);
 }else if(itemId==='outfit_scarf'){
  const ring=addMesh(group,new THREE.TorusGeometry(12,4,9,24),pink,0,44,0);
  ring.rotation.x=Math.PI/2;
  addMesh(group,new THREE.BoxGeometry(6,25,3),pink,10,34,4);
 }else if(itemId==='outfit_armor'){
  addMesh(group,new THREE.BoxGeometry(34,32,18),gold,0,32,4);
  addMesh(group,new THREE.BoxGeometry(10,18,2),material('#4a89ff',.5),0,34,14);
  addMesh(group,new THREE.SphereGeometry(5,12,10),white,0,34,17);
 }else if(itemId==='outfit_ears'){
  for(const x of [-11,11]){
   const ear=addMesh(group,new THREE.CapsuleGeometry(5,20,6,10),white,x,88,0);ear.rotation.z=x<0?.22:-.22;
   const inner=addMesh(group,new THREE.CapsuleGeometry(2.4,16,5,8),material('#f6a1d2'),x,89,4);inner.rotation.z=x<0?.22:-.22;
  }
 }
 return group;
}
function destroyInstance(id){
 const item=instances.get(id);if(!item)return;
 if(item.mixer)item.mixer.stopAllAction();
 scene.remove(item.root);instances.delete(id);delete window.Paper3DReady[id];
}
function chooseAnimation(gltf,kind){
 const candidates=gltf.animations||[];
 if(!candidates.length)return null;
 if(kind==='idle')return candidates.find(a=>/idle|iddle|breath|stand/i.test(a.name)&&!/crouch/i.test(a.name))||candidates[0];
 if(kind==='emote')return candidates.find(a=>/dance|cheer|wave|celebrat|push/i.test(a.name))||candidates.find(a=>/jump|flip/i.test(a.name))||candidates[0];
 return candidates.find(a=>/run|walk|move|sprint/i.test(a.name))||candidates[0];
}
function findArmRig(mesh){
 const arms={left:null,right:null},forearms={left:null,right:null};
 mesh.traverse(n=>{
  if(!n.isBone)return;
  const name=n.name.toLowerCase().replace(/[^a-z0-9]/g,'');
  if(/upperarm/.test(name)){
   if(/l$/.test(name)&&!arms.left)arms.left=n;
   if(/r$/.test(name)&&!arms.right)arms.right=n;
  }
  if(/forearm/.test(name)){
   if(/l$/.test(name)&&!forearms.left)forearms.left=n;
   if(/r$/.test(name)&&!forearms.right)forearms.right=n;
  }
 });
 return{arms,forearms};
}

function instantiate(person){
 const hero=person.hero;
 const asset=sourceAssets[hero];if(!asset)return null;
 const root=new THREE.Group();root.name='Hero_'+person.id;
 const base=SkeletonUtils.clone(asset.scene);
 const bounds=new THREE.Box3().setFromObject(base),size=bounds.getSize(new THREE.Vector3());
 if(!size.y||!Number.isFinite(size.y))return null;
 const factor=RIG_HEIGHT/size.y;
 base.scale.setScalar(factor);
 base.position.set(-bounds.min.x*factor-size.x*factor/2,-bounds.min.y*factor,0);
 root.add(base);
 const clothes=new THREE.Group();root.add(clothes);
 const mixer=asset.animations?.length?new THREE.AnimationMixer(base):null;
 const run=chooseAnimation(asset,'run'),idle=chooseAnimation(asset,'idle'),emote=chooseAnimation(asset,'emote');
 const actions={};
 if(mixer)for(const [key,clip] of [['run',run],['idle',idle],['emote',emote]])if(clip){actions[key]=mixer.clipAction(clip);actions[key].setLoop(THREE.LoopRepeat);}
 const instance={root,base,mixer,actions,hero,outfit:'',lastEmote:0,phase:Math.random()*6,...findArmRig(base)};
 scene.add(root);instances.set(person.id,instance);
 window.Paper3DReady[person.id]=true;
 return instance;
}
function updateOutfit(instance,itemId){
 if(instance.outfit===itemId)return;
 instance.outfit=itemId;
 for(const child of [...instance.root.children])if(child.name==='PlayerClothes')instance.root.remove(child);
 const clothing=makeOutfit(itemId);clothing.name='PlayerClothes';
 instance.root.add(clothing);
}
function loadModel(index){
 return new Promise(resolve=>{
  gltfLoader.load(relative+models[index],gltf=>{sourceAssets[index]=gltf;resolve(true);},
   undefined,err=>{
    console.warn('Styloo GLB unavailable; checking KayKit CC0 fallback:',models[index]);
    gltfLoader.load(backupBase+backupModels[index],gltf=>{sourceAssets[index]=gltf;resolve(true);},
     undefined,error=>{console.warn('3D failed; canvas chibi stays available',index);resolve(false);});
   });
 });
}
function startLoading(){
 if(started||failed)return;started=true;
 // Four animated GLBs, loaded lazily once the user actually starts playing.
 for(let i=0;i<models.length;i++)loadModel(i).catch(()=>false);
}
function adjustSize(width,height){
 if(canvas.width!==Math.round(width*Math.min(devicePixelRatio||1,1.5))||canvas.height!==Math.round(height*Math.min(devicePixelRatio||1,1.5))){
  renderer.setSize(width,height,false);
 }
}
function sync(dt){
 if(failed)return;
 const state=getState();
 if(state&&(state.playing||state.previewing))startLoading();
 if(!state||!state.playing){
  for(const p of instances.values())p.root.visible=false;
  renderer.clear();return;
 }
 const w=state.screenW,h=state.screenH,zoom=Math.max(.5,state.zoom);
 adjustSize(w,h);
 camera.left=-w/(2*zoom);camera.right=w/(2*zoom);
 camera.top=h/(2*zoom);camera.bottom=-h/(2*zoom);
 camera.position.set(state.camX,-state.camY,1300);
 camera.lookAt(state.camX,-state.camY,0);
 camera.updateProjectionMatrix();
 const all=new Set();
 for(const p of state.people){
  all.add(p.id);let item=instances.get(p.id);
  if(!item||item.hero!==p.hero){if(item)destroyInstance(p.id);item=instantiate(p);}
  if(!item)continue;
  item.root.visible=!!p.alive;
  if(!p.alive)continue;
  item.root.position.set(p.x,-p.y+7,0);
  // Always show faces and outfit silhouettes while hinting at turning.
  item.root.rotation.y=Math.sin(p.angle)*.45;
  if(item.mixer){
   item.mixer.update(Math.min(.04,dt));
   const animate=p.emoting?'emote':'run';
   for(const [key,action] of Object.entries(item.actions)){
    if(key===animate){if(!action.isRunning())action.reset().play();action.enabled=true;action.weight=1;}
    else if(action.isRunning())action.stop();
   }
  }else{item.root.position.y+=Math.sin(state.clock*9+item.phase)*1.8;}
  if(p.id===0){updateOutfit(item,state.outfit);if(p.emoting&&p.emoteId==='emote_sixseven')danceBones(item,state.clock,false);}
 }
 for(const id of instances.keys())if(!all.has(id))destroyInstance(id);
 renderer.render(scene,camera);
}

/* Versus fighters use the same CC0 Styloo GLB as the game, without substituting a
   screenshot or copyrighted song. The alternating open-palmed 6/7 dance is generated
   by custom bone animation layered over the included idle cycle. */
const vsCanvas=document.getElementById('versus3dCanvas');
let vsRenderer=null,vsScene=null,vsCamera=null,vsCharacters=[],vsFailure=false,vsLastFrame=-1;
function vsCreate(){
 if(vsRenderer||vsFailure||!vsCanvas)return;
 try{
  vsRenderer=new THREE.WebGLRenderer({canvas:vsCanvas,alpha:true,antialias:true,powerPreference:'low-power',premultipliedAlpha:false});
  vsRenderer.setPixelRatio(Math.min(devicePixelRatio||1,1.25));
  vsRenderer.setClearColor(0,0,0);
  vsRenderer.outputColorSpace=THREE.SRGBColorSpace;
  vsRenderer.toneMapping=THREE.ACESFilmicToneMapping;
  vsRenderer.toneMappingExposure=1.45;
  vsScene=new THREE.Scene();vsCamera=new THREE.OrthographicCamera(-200,200,250,-250,.1,1200);
  vsCamera.position.set(0,0,750);vsCamera.lookAt(0,0,0);
  vsScene.add(new THREE.HemisphereLight(0xffffff,0x7f91cf,3.2));
  const key=new THREE.DirectionalLight(0xffffff,3.2);key.position.set(-120,210,420);vsScene.add(key);
  const rim=new THREE.DirectionalLight(0x9dcaff,1.6);rim.position.set(190,90,190);vsScene.add(rim);
 }catch(error){vsFailure=true;window.PaperVSReady=false;if(vsCanvas)vsCanvas.style.display='none';console.warn('VS WebGL unavailable, continuing with animated canvas dolls',error);}
}
function vsActor(hero){
 if(!sourceAssets[hero])return null;
 const asset=sourceAssets[hero],root=new THREE.Group(),mesh=SkeletonUtils.clone(asset.scene);
 const box=new THREE.Box3().setFromObject(mesh),size=box.getSize(new THREE.Vector3());
 if(size.y<=0||!Number.isFinite(size.y))return null;
 const factor=RIG_HEIGHT/size.y;mesh.scale.setScalar(factor);
 mesh.position.set(-(box.min.x+size.x*.5)*factor,-box.min.y*factor,0);
 root.add(mesh);vsScene.add(root);
 const mixer=asset.animations.length?new THREE.AnimationMixer(mesh):null;
 const clip=chooseAnimation(asset,'idle');
 const action=mixer&&clip?mixer.clipAction(clip):null;
 if(action)action.play();
 const {arms,forearms}=findArmRig(mesh);
 return {hero,root,mesh,mixer,action,arms,forearms,phase:Math.random()*6};
}
function clearVSActors(){
 for(const item of vsCharacters)if(item){if(item.mixer)item.mixer.stopAllAction();vsScene?.remove(item.root);}
 vsCharacters=[];
}
function danceBones(item,seconds,mirror){
 const {arms,forearms}=item;
 const tempo=item.hero===3?8.6:item.hero===1?6.3:7.1;
 const motion=seconds*tempo+(mirror?Math.PI*.6:0);
 const axis=new THREE.Vector3(0,0,1);
 for(const [key,bone] of Object.entries(arms)){
  if(!bone)continue;
  const side=key==='left'?-1:1;
  // Both palms balance as if weighing options: opposite rises and falls.
  const wave=Math.sin(motion+(side===1?Math.PI:0));
  const angle=side*(.90+wave*.40);
  // Pre-multiply to rotate in the visible screen plane, not along the bone axis.
  bone.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(axis,angle));
  const elbow=forearms[key];
  if(elbow){
   elbow.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(axis,-side*(.20+wave*.14)));
  }
 }
}
function syncVS(state,dt){
 if(!state?.previewing){window.PaperVSReady=false;if(vsCanvas)vsCanvas.style.opacity='0';return;}
 const wanted=[state.vsHero,state.vsRival];
 if(!wanted.every(i=>sourceAssets[i])){window.PaperVSReady=false;if(vsCanvas)vsCanvas.style.opacity='0';return;}
 vsCreate();if(vsFailure||!vsRenderer)return;
 try{
  if(vsCharacters.length!==2||vsCharacters.some((a,i)=>!a||a.hero!==wanted[i])){
   clearVSActors();vsCharacters=wanted.map(vsActor);
  }
  if(vsCharacters.some(a=>!a)){window.PaperVSReady=false;vsCanvas.style.opacity='0';return;}
  const width=Math.max(1,vsCanvas.clientWidth||350),height=Math.max(1,vsCanvas.clientHeight||480);
  const dpr=Math.min(devicePixelRatio||1,1.25);
  if(vsCanvas.width!==Math.round(width*dpr)||vsCanvas.height!==Math.round(height*dpr))vsRenderer.setSize(width,height,false);
  vsCamera.left=-width/2;vsCamera.right=width/2;vsCamera.top=height/2;vsCamera.bottom=-height/2;
  vsCamera.updateProjectionMatrix();
  const sizeFactor=(height*.61)/RIG_HEIGHT;
  const arrival=Math.max(0,1-state.vsSeconds/.6);
  for(let i=0;i<2;i++){
   const actor=vsCharacters[i];
   const side=i===0?-1:1;
   actor.root.scale.setScalar(sizeFactor);
   actor.root.position.set(side*(width*.27+arrival*width*.36),-height*.18+Math.sin(state.vsSeconds*7+i)*3,0);
   actor.root.rotation.y=(i===0?-.13:.13)+Math.sin(state.vsSeconds*3.5+i)*.12;
   actor.root.rotation.z=Math.sin(state.vsSeconds*(actor.hero===3?9:6.6)+i)*.045;
   if(actor.mixer)actor.mixer.update(Math.min(dt,.05));
   danceBones(actor,state.vsSeconds,i===1);
   if(i===0)updateOutfit(actor,state.outfit);
  }
  window.PaperVSReady=true;vsCanvas.style.opacity='1';
  // Skip frames where possible to avoid competing with the gameplay canvas on 4G devices.
  if(vsLastFrame<0||state.vsSeconds-vsLastFrame>.028){
   vsRenderer.render(vsScene,vsCamera);
   vsLastFrame=state.vsSeconds;
  }
 }catch(error){window.PaperVSReady=false;vsFailure=true;vsCanvas.style.display='none';console.warn('VS 3D failed; procedural Six-Seven dolls remain available',error);}
}

function frame(ms){
 requestAnimationFrame(frame);
 const dt=Math.min(.06,(ms-last)/1000||0);last=ms;
 if(!failed)try{const state=getState();sync(dt);syncVS(state,dt);}catch(e){console.warn('3D actor display disabled; chibi sprites stay available',e);failed=true;
  for(const k of Object.keys(window.Paper3DReady))delete window.Paper3DReady[k];
  canvas.style.display='none';}
}
if(!failed)requestAnimationFrame(frame);
