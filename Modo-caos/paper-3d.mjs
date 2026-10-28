/*
  Territory Loop: humanoid 3D characters (progressive enhancement only).
  CC0 original model author: Kay Lousberg — KayKit Adventurers.
  Source: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0
  Model files are embedded GLB and loaded through public GitHub; original screenshots
  and third-party branded characters are not used.
  If WebGL, 3D assets, or the CDN fail, the game keeps its custom chibi canvas sprites.
*/
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const canvas=document.getElementById('characterStage');
const getState=()=>typeof window.Paper3DState==='function'?window.Paper3DState():null;
const relative='https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/main/addons/kaykit_character_pack_adventures/Characters/gltf/';
const models=['Knight.glb','Barbarian.glb','Mage.glb','Rogue.glb'];
const palette=['#25d9ef','#ffae3c','#ad75f7','#5ad980'];
const RIG_HEIGHT=80;
const gltfLoader=new GLTFLoader();
const sourceAssets=new Array(models.length).fill(null),instances=new Map();
window.Paper3DReady=Object.create(null);
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
 scene.remove(item.root);instances.delete(id);
}
function chooseAnimation(gltf,kind){
 const candidates=gltf.animations||[];
 if(!candidates.length)return null;
 const pattern=kind==='run'?/run|walk|move|sprint/i:kind==='emote'?/dance|cheer|wave|celebrat/i:/idle|breath|stand/i;
 return candidates.find(a=>pattern.test(a.name))||candidates[0];
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
 const instance={root,base,mixer,actions,hero,outfit:'',lastEmote:0,phase:Math.random()*6};
 scene.add(root);instances.set(person.id,instance);
 window.Paper3DReady[hero]=true;
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
   undefined,error=>{console.warn('KayKit asset not available:',models[index]);resolve(false)});
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
 if(!state||!state.playing){
  for(const p of instances.values())p.root.visible=false;
  renderer.clear();return;
 }
 startLoading();
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
  if(p.id===0)updateOutfit(item,state.outfit);
 }
 for(const id of instances.keys())if(!all.has(id))destroyInstance(id);
 renderer.render(scene,camera);
}
function frame(ms){
 requestAnimationFrame(frame);
 const dt=Math.min(.06,(ms-last)/1000||0);last=ms;
 if(!failed)try{sync(dt);}catch(e){console.warn('3D actor display disabled; chibi sprites stay available',e);failed=true;
  for(const k of Object.keys(window.Paper3DReady))delete window.Paper3DReady[k];
  canvas.style.display='none';}
}
if(!failed)requestAnimationFrame(frame);
