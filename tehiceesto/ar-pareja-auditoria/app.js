import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* TE HICE ESTO · EL LUGAR DONDE VIVE LO NUESTRO
 * Independent author concept. No data is written to production. 3D authored in code.
 * Three.js 0.180 / glTF 2.0 / optional immersive WebXR AR, native iOS Quick Look fallback.
 */
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const app={phase:'sealed',visited:new Set(),audio:false,ar:false,placed:false,cameraMode:false,revealAt:0,shimmer:0,glbUrl:null,xrSession:null,exporterBusy:false};
const mem=[
 {title:'El primer nosotros.',label:'EL DÍA QUE CAMBIÓ TODO',quote:'No sabía que ese día tan normal iba a convertirse en mi fecha favorita.',photo:'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1600&q=84'},
 {title:'Lo extraordinario en lo simple.',label:'NUESTRO MUNDO MÁS PEQUEÑO',quote:'Con vos aprendí que la felicidad a veces es un café, un silencio y saber que no tengo que estar en ningún otro lugar.',photo:'https://images.unsplash.com/photo-1474552226712-ac0f0961a954?auto=format&fit=crop&w=1600&q=84'},
 {title:'El lugar al que volver.',label:'TODO LO QUE FALTA POR VIVIR',quote:'Si el futuro pudiera elegirse en una sola imagen, elegiría una donde todavía estemos caminando juntos.',photo:'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1600&q=84'},
];
const EASE=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const prefersReduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function toast(s){const el=$('#toast');el.textContent=s;el.classList.add('visible');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('visible'),3800)}
function showAct(n){
 ['#actA','#actB','#actC'].forEach((s,i)=>$(s).hidden=i!==n);
 $$('[data-progress]').forEach((x,i)=>x.classList.toggle('active',i<=n));
 const headings=[
 ['Lo nuestro<br><em>no termina</em><br>en la pantalla<span class="period">.</span>','Hay recuerdos demasiado importantes para guardarlos en un teléfono. Este tiene un lugar reservado en el mundo.'],
 ['Todo lo que<br><em>fuimos</em><br>todavía florece<span class="period">.</span>','Tres instantes viven dentro de esta pieza. Cada uno guarda una forma distinta de decir: «Gracias por existir conmigo».'],
 ['Lo nuestro<br><em>tiene</em><br>un lugar aquí<span class="period">.</span>','Quizás el amor sea esto: seguir encontrando razones para elegir a la misma persona, incluso después de tantos días.'],
 ];
 $('#mainTitle').innerHTML=headings[n][0];$('#mainDescription').textContent=headings[n][1];
 $('#memoryList').hidden=n!==1;
 $('#primaryText').textContent=n===0?'ABRIR EL RELICARIO':n===1?(app.visited.size===3?'REVELAR NUESTRO PARA SIEMPRE':'DESCUBRIR LOS RECUERDOS'):'VOLVER A VIVIRLO';
 $('#primaryBtn').disabled=n===1&&app.visited.size===0;
 $('#flowNote').textContent=n===0?'LA PIEZA SE ABRE CUANDO ESTÉS LISTA.':n===1?`${app.visited.size} DE 3 INSTANTES DESCUBIERTOS · TOCÁ SUS LUCES`:'EL RECUERDO ES TUYO. EL MOMENTO TAMBIÉN.';
}
// SOUND: original generative ambience & gestures, no licensed melody.
class Soundscape {
 constructor(){this.ctx=null;this.master=null;this.timer=null;this.on=false;this.rot=0;}
 init(){if(this.ctx)return;const C=window.AudioContext||window.webkitAudioContext;if(!C)return;this.ctx=new C();this.master=this.ctx.createGain();this.master.gain.value=.0001;this.master.connect(this.ctx.destination);this.lowpass=this.ctx.createBiquadFilter();this.lowpass.type='lowpass';this.lowpass.frequency.value=1900;this.lowpass.connect(this.master);}
 tone(hz,at,dur=.7,vol=.055,type='sine'){
  if(!this.ctx||!this.on)return;const o=this.ctx.createOscillator();const g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(hz,at);o.frequency.exponentialRampToValueAtTime(hz*.998,at+dur);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(vol,at+.04);g.gain.exponentialRampToValueAtTime(.0001,at+dur);o.connect(g);g.connect(this.lowpass);o.start(at);o.stop(at+dur+.06);
 }
 chord(){if(!this.on||!this.ctx)return;const chords=[[196,246.94,293.66,392],[174.61,220,261.63,349.23],[164.81,196,261.63,329.63],[146.83,196,246.94,293.66]];const chord=chords[(this.rot++)%chords.length];const now=this.ctx.currentTime;chord.forEach((n,i)=>this.tone(n/2,now+i*.27,4.6,.011,'sine'));this.tone(chord[2]*2,now+1.25,3.4,.008,'sine');}
 async toggle(){this.init();if(!this.ctx){toast('Audio no disponible en este navegador');return}await this.ctx.resume();this.on=!this.on;app.audio=this.on;$('#audioBtn').classList.toggle('on',this.on);$('#audioBtnText').textContent=this.on?'SILENCIAR':'ACTIVAR SONIDO';if(this.on){this.master.gain.setTargetAtTime(.7,this.ctx.currentTime,.35);this.chord();this.timer=setInterval(()=>this.chord(),4600)}else{clearInterval(this.timer);this.master.gain.setTargetAtTime(.0001,this.ctx.currentTime,.24)}}
 sparkle(){if(!this.on||!this.ctx)return;const t=this.ctx.currentTime;[523.25,659.25,783.99,1046.5].forEach((f,i)=>this.tone(f,t+i*.14,1.8,.025,'sine'))}
 open(){if(!this.on||!this.ctx)return;const t=this.ctx.currentTime;[220,277.18,329.63,440,554.37].forEach((f,i)=>this.tone(f,t+i*.21,3.8,.035,'sine'))}
}
const score=new Soundscape();
$('#audioBtn').addEventListener('click',()=>score.toggle());

// 3D STAGE
const host=$('#canvasHost');const scene=new THREE.Scene();scene.background=null;
const camera=new THREE.PerspectiveCamera(33,1,.045,150);camera.position.set(innerWidth<=680?3.4:5.2,innerWidth<=680?2.65:3.85,innerWidth<=680?6.55:9.25);
let renderer,controls;const sculpt=new THREE.Group();scene.add(sculpt);sculpt.position.y=-.29;
const art=new THREE.Group();sculpt.add(art);const foliage=new THREE.Group();art.add(foliage);
const brass=new THREE.MeshPhysicalMaterial({color:0xc5a06d,metalness:.88,roughness:.22,clearcoat:.8,clearcoatRoughness:.13});
const brightBrass=new THREE.MeshPhysicalMaterial({color:0xf0d0a0,metalness:.87,roughness:.18,clearcoat:.7});
const antique=new THREE.MeshPhysicalMaterial({color:0x85735d,metalness:.72,roughness:.36});
const marble=new THREE.MeshPhysicalMaterial({color:0x25232c,metalness:.11,roughness:.24,clearcoat:.95,clearcoatRoughness:.1});
const innerMarble=new THREE.MeshStandardMaterial({color:0x393039,metalness:.3,roughness:.52});
const glass=new THREE.MeshPhysicalMaterial({color:0xe3dfd9,transmission:.97,ior:1.47,thickness:.32,metalness:0,roughness:.06,transparent:true,opacity:.42,depthWrite:false,side:THREE.DoubleSide,clearcoat:1});
const glassLine=new THREE.MeshPhysicalMaterial({color:0xffffff,metalness:.15,roughness:.06,transparent:true,opacity:.19,depthWrite:false});
const porcelain=new THREE.MeshPhysicalMaterial({color:0xffe5d7,metalness:0,roughness:.31,clearcoat:.49});
const rose=new THREE.MeshPhysicalMaterial({color:0xc48584,metalness:.05,roughness:.35,clearcoat:.6});
const sage=new THREE.MeshPhysicalMaterial({color:0x899b83,metalness:.25,roughness:.49,side:THREE.DoubleSide});
const glowMaterial=new THREE.MeshBasicMaterial({color:0xffddaf});
const shadowMat=new THREE.MeshBasicMaterial({color:0x1c131d,transparent:true,opacity:.5,depthWrite:false});
const goldDark=new THREE.MeshStandardMaterial({color:0x7d6550,metalness:.72,roughness:.36});
const scratch=new THREE.MeshBasicMaterial({color:0xf4cca2});
const sphere=new THREE.SphereGeometry(1,16,12);const petalGeo=new THREE.SphereGeometry(1,13,8);
const rg=new THREE.TorusGeometry(1,.02,10,100);
const pointLights=[];const motes=[];const memoryMarkers=[];
function add(parent,g,m,position=[0,0,0],rotation=[0,0,0],scale=[1,1,1]){const mesh=new THREE.Mesh(g,m);mesh.position.set(...position);mesh.rotation.set(...rotation);mesh.scale.set(...scale);parent.add(mesh);return mesh}
function goldRing(radius,y,tube=.018,material=brass){const mesh=add(art,new THREE.TorusGeometry(radius,tube,8,100),material,[0,y,0],[Math.PI/2,0,0]);return mesh;}
function drum(radius,height,y,material,segments=96){return add(art,new THREE.CylinderGeometry(radius,radius,height,segments),material,[0,y,0]);}
function glowTexture(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');const grad=x.createRadialGradient(64,64,1,64,64,63);grad.addColorStop(0,'rgba(255,244,219,1)');grad.addColorStop(.14,'rgba(255,223,171,.86)');grad.addColorStop(.39,'rgba(243,171,127,.36)');grad.addColorStop(1,'rgba(255,175,100,0)');x.fillStyle=grad;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c)}
const glowTex=glowTexture();function sprite(parent,pos,size=.19,opacity=.8){const mat=new THREE.SpriteMaterial({map:glowTex,transparent:true,depthWrite:false,opacity,blending:THREE.AdditiveBlending,color:0xffd4aa});const s=new THREE.Sprite(mat);s.position.set(...pos);s.scale.set(size,size,size);parent.add(s);return s}
function makeLabel(text,sub){const c=document.createElement('canvas');c.width=1024;c.height=220;const ctx=c.getContext('2d');ctx.clearRect(0,0,1024,220);ctx.fillStyle='#e8cba8';ctx.textAlign='center';ctx.font='600 70px Georgia';ctx.fillText(text,512,97);ctx.font='34px Georgia';ctx.letterSpacing='10px';ctx.fillStyle='#be9882';ctx.fillText(sub,512,160);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const mat=new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false});return add(art,new THREE.PlaneGeometry(1.7,.365),mat,[0,.33,1.18]);}
function buildPedestal(){
 drum(1.31,.08,.05,brightBrass);drum(1.25,.32,.24,marble);drum(1.29,.048,.413,brass);drum(1.20,.05,.464,innerMarble);
 goldRing(1.274,.124,.018,brass);goldRing(1.26,.356,.019,brass);goldRing(1.19,.495,.01,brightBrass);
 for(let i=0;i<38;i++){const a=i*Math.PI*2/38;add(art,new THREE.BoxGeometry(.012,.035,.018),brightBrass,[1.248*Math.cos(a),.248,1.248*Math.sin(a)],[0,-a,0])}
 for(let i=0;i<18;i++){const a=i*Math.PI*2/18;add(art,sphere,brightBrass,[1.2*Math.cos(a),.477,1.2*Math.sin(a)],[0,0,0],[.017,.017,.017]);}
 makeLabel('EMMA  ×  JULIÁN','14 · 02 · 2023');
 const ground=new THREE.Mesh(new THREE.CircleGeometry(4.1,80),new THREE.MeshBasicMaterial({color:0x483340,transparent:true,opacity:.22,depthWrite:false}));ground.rotation.x=-Math.PI/2;ground.position.y=-.01;sculpt.add(ground);
 for(let i=0;i<5;i++){const ring=add(sculpt,new THREE.TorusGeometry(1.4+i*.22,.003,3,90),goldDark,[0,.009,0],[Math.PI/2,0,0]);ring.material=ring.material.clone();ring.material.transparent=true;ring.material.opacity=.14*(1-i/6);}
}
let cloche,cap;
function makeCloche(){const points=[];const N=44;for(let i=0;i<=N;i++){const t=i/N;const r=1.12*(1-.965*Math.pow(t,3.9));points.push(new THREE.Vector2(r,.52+2.72*t))}
 cloche=new THREE.Group();art.add(cloche);
 add(cloche,new THREE.LatheGeometry(points,110),glass);
 add(cloche,new THREE.TorusGeometry(1.12,.032,12,128),brightBrass,[0,.55,0],[Math.PI/2,0,0]);
 add(cloche,new THREE.TorusGeometry(1.112,.012,8,128),glassLine,[0,.61,0],[Math.PI/2,0,0]);
 add(cloche,new THREE.SphereGeometry(.125,20,16),brightBrass,[0,3.28,0]);
 add(cloche,new THREE.SphereGeometry(.036,14,8),antique,[0,3.405,0]);
 cap=cloche;
}
function limb(parent,points,r,material,segments=55){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const line=new THREE.Mesh(new THREE.TubeGeometry(curve,segments,r,7,false),material);parent.add(line);return line;}
const random=(seed)=>{let x=Math.sin(seed*127.1+78.233)*43758.5453123;return x-Math.floor(x)};
function bloom(parent,x,y,z,scale=1,white=false){const group=new THREE.Group();group.position.set(x,y,z);parent.add(group);const count=5;for(let i=0;i<count;i++){const a=i*Math.PI*2/count;const petal=add(group,petalGeo,(white||i%2)?porcelain:rose,[Math.sin(a)*.069*scale,Math.cos(a)*.069*scale,0],[0,0,a],[.052*scale,.084*scale,.017*scale]);petal.rotation.z=-a;}
 add(group,sphere,brightBrass,[0,0,.012],[0,0,0],[.019*scale,.019*scale,.019*scale]);group.rotation.x=random(x*11+y*19)*.3-.15;group.rotation.y=random(y*17)*Math.PI*2;
 return group;}
function buildBotanical(){
 const left=new THREE.Group(),right=new THREE.Group();left.name='left';right.name='right';foliage.add(left,right);
 for(let side of [-1,1]){
  const branch=side===-1?left:right;
  const stem=[];
  for(let i=0;i<35;i++){let t=i/34;stem.push([side*(.36*(1-t)-.3*Math.sin(t*Math.PI)+.07*Math.sin(t*3*Math.PI)),.51+2.04*t,side*.08*Math.sin(t*Math.PI*2.7)]);}
  limb(branch,stem,.041,side<0?brass:brightBrass,74);
  for(let i=0;i<9;i++){
   const t=.21+i*.082,src=stem[Math.floor(t*34)];const a=i*2.39+side*.4;
   const len=.25+.18*random(i+side*23);const end=[src[0]+len*Math.cos(a),src[1]+len*.32,src[2]+len*Math.sin(a)];
   const mid=[src[0]+(end[0]-src[0])*.52,src[1]+len*.36,src[2]+(end[2]-src[2])*.50];
   limb(branch,[src,mid,end],.013,brass,18);
   const leaf=add(branch,petalGeo,sage,[...end],[0,0,a],[.045,.12,.017]);leaf.rotation.y=a;
   if(i%2===0){bloom(branch,end[0],end[1]+.045,end[2],.65,i%4===0);}
  }
 }
 // Halo of delicate botanical ornaments; individually built in high-poly ceramic.
 for(let i=0;i<32;i++){const a=i*2.39996,t=i/32,r=.29+.63*Math.sqrt(t);const x=r*Math.cos(a),z=r*Math.sin(a),y=2.18+.18*Math.sin(i*2.3)+.15*Math.cos(i*.7);
  if(i%3===0)bloom(foliage,x,y,z,.9+(i%4)*.12,i%4===0);
  else{const leaf=add(foliage,petalGeo,sage,[x,y,z],[0,a,i*.4],[.05,.14,.018]);leaf.rotation.y=a;}
 }
 // Tiny luminescent seeds inside the glass, held in real three-dimensional space.
 for(let i=0;i<31;i++){const a=i*2.39996;const r=.18+.72*random(i*71);const y=.65+2.2*random(i*29+30);
  const s=sprite(foliage,[r*Math.cos(a),y,r*Math.sin(a)],.11+.09*random(i),.32+.24*random(i+12));motes.push({obj:s,seed:i*1.27,baseY:y});
 }
 foliage.scale.set(1.22,.12,1.22);foliage.position.y=.45;
}
function buildMemoryMarkers(){
 const ps=[[-.76,1.70,.73],[.75,2.03,.44],[0,2.48,.7]];
 ps.forEach((p,i)=>{
  const g=new THREE.Group();g.position.set(...p);art.add(g);
  add(g,sphere,new THREE.MeshPhysicalMaterial({color:0xe6ba9f,metalness:.87,roughness:.16,emissive:0x5e3429,emissiveIntensity:.14}),[0,0,0],[0,0,0],[.085,.085,.085]);
  add(g,new THREE.TorusGeometry(.15,.009,8,64),brightBrass,[0,0,0],[0,0,0]);
  add(g,new THREE.TorusGeometry(.198,.003,6,80),brass,[0,0,0],[0,.24,0]);
  const portraitMat=new THREE.MeshBasicMaterial({color:0xe2b5a2,side:THREE.DoubleSide});
  const portrait=add(g,new THREE.CircleGeometry(.071,32),portraitMat,[0,0,.088]);
  const frameLip=add(g,new THREE.TorusGeometry(.105,.011,8,48),brightBrass,[0,0,.083]);
  const portraitTexture=new THREE.TextureLoader().load(mem[i].photo,tex=>{tex.colorSpace=THREE.SRGBColorSpace;portraitMat.map=tex;portraitMat.needsUpdate=true;},undefined,()=>{});
  const halo=sprite(g,[0,0,0],.69,.66);
  g.userData.index=i;g.userData.halo=halo;g.visible=false;
  memoryMarkers.push(g);
 });
}
let particleField;function buildParticles(){const geometry=new THREE.BufferGeometry();const positions=[];for(let i=0;i<150;i++){const a=random(i+42)*Math.PI*2,r=1.3+random(i*3)*3.6,y=.2+random(i*11)*3.3;positions.push(r*Math.cos(a),y,r*Math.sin(a))}geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));const mat=new THREE.PointsMaterial({color:0xe1b3a0,size:.028,transparent:true,opacity:.22,sizeAttenuation:true,depthWrite:false,blending:THREE.AdditiveBlending});particleField=new THREE.Points(geometry,mat);scene.add(particleField)}
let clock,reticle,xrHitSource=null,xrAsked=false;
function init3D(){
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance',preserveDrawingBuffer:false});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.75;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.xr.enabled=true;renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));host.appendChild(renderer.domElement);
 const hemisphere=new THREE.HemisphereLight(0xeed7c5,0x46303b,2.5);scene.add(hemisphere);
 const key=new THREE.DirectionalLight(0xffdfbf,5.1);key.position.set(-3,7,5);scene.add(key);
 const fill=new THREE.DirectionalLight(0xffd8bc,2.6);fill.position.set(5,3,1);scene.add(fill);
 const rim=new THREE.DirectionalLight(0x9ba7d8,3.7);rim.position.set(2,4,-5);scene.add(rim);
 for(const [p,color,intensity] of [[[0,2.2,0],0xf5b4a5,7],[[-2,3,-2],0xffdbb3,5],[[2,2,2],0xe9ada9,3]]) {const light=new THREE.PointLight(color,intensity,7,2);light.position.set(...p);scene.add(light)}
 buildPedestal();makeCloche();buildBotanical();buildMemoryMarkers();buildParticles();
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.055;controls.enablePan=false;controls.enableZoom=true;controls.autoRotate=false;controls.minDistance=5.7;controls.maxDistance=13;controls.minPolarAngle=.42;controls.maxPolarAngle=1.55;controls.target.set(0,1.58,0);controls.update();
 camera.lookAt(0,1.6,0);clock=new THREE.Clock();
 reticle=new THREE.Mesh(new THREE.RingGeometry(.11,.14,44),new THREE.MeshBasicMaterial({color:0xe8d3bd,side:THREE.DoubleSide}));reticle.rotation.x=-Math.PI/2;reticle.visible=false;scene.add(reticle);
 renderer.domElement.addEventListener('pointerup',handlePointer);
 resize();new ResizeObserver(resize).observe(host);
 renderer.setAnimationLoop(renderFrame);$('#sceneLoading').classList.add('gone');setTimeout(()=>{$('#sceneLoading').hidden=true},750);
 // Warm up glTF resources before a user invokes the native AR viewer.
 setTimeout(()=>{void prepareNativeAR()},1400);
}
function resize(){if(!renderer)return;const target=app.cameraMode?$('#cameraView'):host;const width=Math.max(target.clientWidth,320),height=Math.max(target.clientHeight,320);camera.aspect=width/height;camera.fov=app.cameraMode?47:(innerWidth<=680?40:innerWidth<1000?42:33);camera.updateProjectionMatrix();renderer.setSize(width,height,false)}
// Modo Caos's placement pattern: preview is *always visible*, even before hit-test finds a plane.
let xrHitResult=null,xrAnchor=null,xrTracking='booting',xrLastHit=0,arScale=.16,arYaw=0,arFrameCount=0;
const xrP=new THREE.Vector3(),xrD=new THREE.Vector3();
function arStatus(message,tracking){$('#arTip').textContent=message;if(tracking)$('#arTracking').textContent=tracking;}
function updateARScale(delta){
 arScale=THREE.MathUtils.clamp(arScale+delta,.085,.31);
 if(app.ar)sculpt.scale.setScalar(arScale);
 $('#arSizeLabel').textContent='TAMAÑO · '+Math.round(arScale/.16*40)+' CM';
}
function rotateAR(){
 arYaw+=Math.PI/8;if(app.ar)sculpt.rotation.y=arYaw;
}
async function placeInAR(){
 if(!app.ar||!app.xrSession||app.placed)return false;
 app.placed=true;reticle.visible=false;$('#arPlace').hidden=true;$('#arReposition').hidden=false;
 $('#arCenterMarker').hidden=true;
 arStatus('YA ESTÁ EN TU MUNDO · CAMINÁ A SU ALREDEDOR',xrTracking==='plane'?'SUPERFICIE DETECTADA · RELICARIO FIJO':'POSICIÓN ESPACIAL APROXIMADA · REUBICABLE');
 score.sparkle();
 // Capture a real XR anchor when the runtime offers one; otherwise keep world-space position.
 if(xrHitResult&&typeof xrHitResult.createAnchor==='function'){
   try{const anchor=await xrHitResult.createAnchor();if(app.ar&&app.placed){xrAnchor=anchor;$('#arTracking').textContent='ANCLAJE ESPACIAL ACTIVO'}else anchor.delete?.()}catch(err){console.info('XR anchor unavailable, retaining local-space pose',err)}
 }
 return true;
}
function rePlaceAR(){
 if(!app.ar)return;
 xrAnchor?.delete?.();xrAnchor=null;app.placed=false;
 $('#arPlace').hidden=false;$('#arReposition').hidden=true;$('#arCenterMarker').hidden=false;
 arStatus('MOVÉ EL TELÉFONO · FIJÁ EL RELICARIO SOBRE UNA MESA','BUSCANDO SUPERFICIE');
}
function updateARPreview(time,frame){
 if(!app.ar||!app.xrSession||!frame)return;
 arFrameCount++;
 const ref=renderer.xr.getReferenceSpace();
 if(!ref)return;
 if(app.placed){
   if(xrAnchor){
     const pose=frame.getPose(xrAnchor.anchorSpace,ref);
     if(pose){sculpt.position.set(pose.transform.position.x,pose.transform.position.y,pose.transform.position.z);}
   }
   return;
 }
 let found=false;
 if(xrHitSource){
   try{
     const results=frame.getHitTestResults(xrHitSource);
     if(results.length){
       const pose=results[0].getPose(ref);
       if(pose){
         sculpt.position.set(pose.transform.position.x,pose.transform.position.y,pose.transform.position.z);
         xrHitResult=results[0];xrTracking='plane';xrLastHit=time;found=true;
         reticle.visible=true;reticle.position.copy(sculpt.position);
       }
     }
   }catch(e){if(arFrameCount%180===1)console.info('AR plane search',e)}
 }
 if(!found){
   // Never hide the object! Camera-forward provisional pose if no floor/table is recognized.
   // This is real XR world space, not a screen-space sprite. The user can fix it manually.
   if(xrTracking!=='plane'||time-xrLastHit>900){
     xrHitResult=null;xrTracking='manual';reticle.visible=false;
     const cam=renderer.xr.getCamera();
     if(cam){
       cam.updateMatrixWorld(true);
       cam.getWorldPosition(xrP);cam.getWorldDirection(xrD);
       xrD.y=0;
       if(xrD.lengthSq()<.001)xrD.set(0,0,-1);
       xrD.normalize();
       sculpt.position.copy(xrP).addScaledVector(xrD,.85);
       sculpt.position.y=xrP.y-.34;
     }
   }
 }
 if(arFrameCount%18===0){
   arStatus(found?'SUPERFICIE DETECTADA · AJUSTÁ Y FIJÁ EL RELICARIO':'EL RELICARIO ESTÁ DELANTE TUYO · PODÉS FIJARLO AQUÍ',
     found?'SUPERFICIE REAL ✓ · POSICIÓN PRECISA':'SIN DETECCIÓN DE MESA · UBICACIÓN MANUAL');
 }
 sculpt.scale.setScalar(arScale);sculpt.rotation.y=arYaw;sculpt.visible=true;
}

function handlePointer(ev){if(app.ar){placeInAR();return}
 if(app.phase!=='memories'||app.ar)return;const b=renderer.domElement.getBoundingClientRect();const coord=new THREE.Vector2(((ev.clientX-b.left)/b.width)*2-1,-((ev.clientY-b.top)/b.height)*2+1);const ray=new THREE.Raycaster();ray.setFromCamera(coord,camera);const hits=ray.intersectObjects(memoryMarkers,true);if(hits.length){let group=hits[0].object;while(group&&!Number.isInteger(group.userData.index))group=group.parent;if(group){openMemory(group.userData.index);return}}}
let t=0;function renderFrame(timestamp,frame){const dt=clock.getDelta();t+=Math.min(dt,.07);if(app.phase==='opening'){
 const elapsed=(performance.now()-app.revealAt)/(prefersReduced?220:3700),v=clamp(elapsed,0,1);
 const cl=EASE(clamp(v/.66,0,1));cloche.position.y=cl*3.0;cloche.scale.setScalar(1+cl*.1);glass.opacity=.42*(1-cl)+.035;cloche.visible=v<.81;
 const grow=EASE(clamp((v-.18)/.72,0,1));foliage.scale.y=.12+grow*1.05;foliage.position.y=.45*(1-grow)-.07*grow;
 memoryMarkers.forEach((g,i)=>{g.visible=v>.63;g.scale.setScalar(clamp((v-.67)*6,0,1));});
 if(v>=1){cloche.visible=false;app.phase='memories';showAct(1);score.sparkle()}
 }
 if(app.phase==='sealed'){cloche.rotation.y=Math.sin(t*.19)*.03;foliage.scale.y=.49;foliage.position.y=.18}
 if(app.phase==='memories'||app.phase==='final'){memoryMarkers.forEach((g,i)=>{g.visible=true;g.position.y+=Math.sin(t*1.35+i*2)*.0009;g.quaternion.copy(camera.quaternion);g.userData.halo.material.opacity=(app.visited.has(i)?.22:.48)+.12*Math.sin(t*2+i)});}
 if(app.phase==='final'){art.rotation.y+=.00065;particleField.material.opacity=.26+.11*Math.sin(t*1.3)}
 else particleField.rotation.y+=.00008;
 motes.forEach(({obj,seed,baseY})=>{obj.position.y=baseY+Math.sin(t*.83+seed)*.025;obj.material.opacity=.32+.19*Math.sin(t+seed)});
 if(!app.ar){if(!app.cameraMode)controls?.update();}
 else updateARPreview(timestamp,frame);
 renderer.render(scene,camera);
}
// NARRATIVE
function enter(){const el=$('#entryOverlay');el.classList.add('closed');setTimeout(()=>el.remove(),1500);showAct(0);score.init();if(score.ctx&&!score.on)void score.toggle();score.sparkle();}
function openRelic(){if(app.phase!=='sealed')return;app.phase='opening';app.revealAt=performance.now();score.open();$('#primaryBtn').disabled=true;$('#primaryText').textContent='DESCUBRIENDO LO NUESTRO…';setTimeout(()=>{$('#primaryBtn').disabled=false},4300)}
function openMemory(i){if(app.phase!=='memories')return;const m=mem[i];app.visited.add(i);score.sparkle();const modal=$('#memoryModal');$('#memoryImage').style.backgroundImage=`url('${m.photo}')`;
 $('#memoryCaption').textContent=`ARCHIVO PERSONAL / 0${i+1} · ${m.label}`;$('#memoryHeading').textContent=m.title;$('#memoryText').textContent=m.quote;modal.hidden=false;$('#nextMemory').textContent=app.visited.size===3?'VOLVER · EL ÚLTIMO MENSAJE TE ESPERA ↗':'VOLVER AL RELICARIO ↗';
 $$('[data-memory]').forEach(e=>e.classList.toggle('seen',app.visited.has(Number(e.dataset.memory))));
 showAct(1);$('#primaryBtn').disabled=false;}
function closeMemory(){const modal=$('#memoryModal');modal.hidden=true;}
function reveal(){if(app.phase==='opening')return;if(app.phase==='memories'&&app.visited.size<3){let next=0;while(app.visited.has(next))next++;openMemory(Math.min(next,2));return}if(app.phase!=='memories'&&app.phase!=='final')return;if(app.phase==='memories'){app.phase='final';showAct(2);score.open();cloche.visible=false;}
 const overlay=$('#finalOverlay');overlay.hidden=false;
 let steps=['Si pudiera volver a aquel primer día…','volvería a buscarte entre todas las personas.','Volvería a aprender tus gestos, a reírme de las mismas cosas,','y volvería a elegirte.','Una y todas las veces.'];
 let i=0;const words=$('#finalWords');words.textContent=steps[0];let stamp=0;function next(){if(overlay.hidden)return;i++;if(i>=steps.length){words.textContent='Y si pudiera elegir de nuevo, volvería a encontrarte.';return}words.style.opacity='0';setTimeout(()=>{words.textContent=steps[i];words.style.opacity='1';if(i<steps.length)setTimeout(next,i===2?3600:2800)},550)};words.style.transition='opacity .5s';setTimeout(next,3700);
}
$('#enterBtn').addEventListener('click',enter);
$('#primaryBtn').addEventListener('click',()=>{if(app.phase==='sealed')openRelic();else if(app.phase==='memories')reveal();else if(app.phase==='final')reveal()});
$$('[data-memory]').forEach(x=>x.addEventListener('click',()=>openMemory(Number(x.dataset.memory))));
$('#closeMemory').addEventListener('click',closeMemory);$('#nextMemory').addEventListener('click',closeMemory);
$('#finalClose').addEventListener('click',()=>{$('#finalOverlay').hidden=true;score.sparkle()});
$('#resetView').addEventListener('click',()=>{controls.reset();camera.position.set(innerWidth<=680?3.4:5.2,innerWidth<=680?2.65:3.85,innerWidth<=680?6.55:9.25);controls.target.set(0,1.58,0);controls.update();toast('Vista centrada')});
window.addEventListener('keydown',ev=>{if(ev.key==='Escape'){closeMemory();$('#finalOverlay').hidden=true;$('#arDialog').hidden=true}});
// AR: Genuine immersive WebXR with hit testing on supporting Android devices.
// In iOS we prepare a glTF model for Quick Look with Google's model-viewer.
let nativeViewerReady=false;
async function prepareNativeAR(){
 // Pre-baked, optimized custom GLB under the same audit-only origin.
 // A publicly addressable GLB is required by external Android Scene Viewer
 // and by iOS Quick Look USDZ conversion; a blob URL cannot be shared reliably.
 if(app.glbUrl)return app.glbUrl;
 const resource=new URL('./relicario.glb',import.meta.url).href;
 app.glbUrl=resource;
 $('#iosARModel').setAttribute('src',resource);
 return resource;
}

let xrSupported=false;
(async()=>{try{xrSupported=!!(navigator.xr&&await navigator.xr.isSessionSupported('immersive-ar'))}catch{xrSupported=false}})();
function showArDialog(){
 $('#arMessage').textContent='El relicario aparece en cuanto se abre AR. Ajustá el tamaño y tocá «Fijar» cuando encuentres el lugar.';
 $('#arDialog').hidden=false;void prepareNativeAR();
}
$('#arBtn').addEventListener('click',showArDialog);
$('#closeArDialog').addEventListener('click',()=>$('#arDialog').hidden=true);
$('#keep3d').addEventListener('click',()=>$('#arDialog').hidden=true);
function resetARControls(){
 $('#arPlace').hidden=false;$('#arReposition').hidden=true;$('#arCenterMarker').hidden=false;
 updateARScale(0);
}
function resetXRState(){
 app.ar=false;app.placed=false;app.xrSession=null;
 xrHitSource?.cancel?.();xrHitSource=null;xrHitResult=null;
 xrAnchor?.delete?.();xrAnchor=null;
 xrTracking='booting';arFrameCount=0;reticle.visible=false;
 sculpt.visible=true;sculpt.position.set(0,-.29,0);sculpt.scale.setScalar(1);sculpt.rotation.y=0;
 $('#arOverlay').hidden=true;scene.background=null;controls.enabled=true;resetARControls();resize();
}
async function launchXR(){
 if(!navigator.xr||!xrSupported)return false;
 let session;
 try{
  // User activation MUST be used synchronously: don't await isSessionSupported here.
  session=await navigator.xr.requestSession('immersive-ar',{
    requiredFeatures:['hit-test'],
    optionalFeatures:['dom-overlay','anchors','local-floor'],
    domOverlay:{root:$('#arOverlay')}
  });
  app.ar=true;app.placed=false;app.xrSession=session;
  arScale=.16;arYaw=0;resetARControls();
  sculpt.visible=true;sculpt.scale.setScalar(arScale);
  reticle.visible=false;xrHitResult=null;xrAnchor=null;xrTracking='booting';arFrameCount=0;
  $('#arDialog').hidden=true;$('#arOverlay').hidden=false;controls.enabled=false;scene.background=null;
  renderer.xr.setReferenceSpaceType('local');
  await renderer.xr.setSession(session);
  // Show a provisional object before the FIRST hit-test pose.
  const cam=renderer.xr.getCamera();
  cam?.updateMatrixWorld?.(true);
  const viewerSpace=await session.requestReferenceSpace('viewer');
  try{xrHitSource=await session.requestHitTestSource({space:viewerSpace});}
  catch(err){xrHitSource=null;console.info('Hit-test unavailable: manual XR placement remains active',err)}
  session.addEventListener('select',()=>{if(!app.placed)void placeInAR()});
  session.addEventListener('end',resetXRState,{once:true});
  arStatus('MIRÁ HACIA UNA MESA · EL RELICARIO ESTÁ DELANTE TUYO','BUSCANDO SUPERFICIE…');
  return true;
 }catch(err){
  console.warn('Spatial AR startup',err);
  if(session){try{await session.end()}catch{}}
  resetXRState();
  return false;
 }
}
$('#arPlace').addEventListener('click',()=>void placeInAR());
$('#arReposition').addEventListener('click',rePlaceAR);
$('#arSmaller').addEventListener('click',()=>updateARScale(-.025));
$('#arBigger').addEventListener('click',()=>updateARScale(.025));
$('#arRotate').addEventListener('click',rotateAR);
$('#exitAR').addEventListener('click',()=>{if(app.xrSession)void app.xrSession.end()});
let cameraStream=null,cameraActiveBefore=null,cameraOriginalPos=null,cameraOriginalRot=null,cameraScale=1;
async function startCameraView(){
 if(!navigator.mediaDevices?.getUserMedia)return false;
 try{
  cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
  const video=$('#cameraFeed');video.srcObject=cameraStream;
  try{await video.play()}catch(e){console.info('Waiting for camera media',e)}
  app.cameraMode=true;$('#arDialog').hidden=true;$('#cameraAR').hidden=false;
  cameraActiveBefore=renderer.domElement.parentNode;
  cameraOriginalPos=camera.position.clone();cameraOriginalRot=camera.rotation.clone();
  $('#cameraView').appendChild(renderer.domElement);
  controls.enabled=false;sculpt.visible=true;
  cameraScale=.45;sculpt.position.set(0,-.36,0);sculpt.scale.setScalar(cameraScale);
  camera.position.set(2.0,1.85,4.45);camera.lookAt(0,1.45,0);
  $('#cameraStatus').textContent='RELICARIO VISIBLE · AJUSTÁ TAMAÑO Y GIRO';
  resize();return true;
 }catch(e){
  console.warn('Camera preview unavailable',e);
  stopCameraView();
  return false;
 }
}
function stopCameraView(){
 cameraStream?.getTracks?.().forEach(tr=>tr.stop());cameraStream=null;
 const vid=$('#cameraFeed');if(vid)vid.srcObject=null;
 if(app.cameraMode){
   (cameraActiveBefore||host).appendChild(renderer.domElement);
   app.cameraMode=false;$('#cameraAR').hidden=true;
   sculpt.position.set(0,-.29,0);sculpt.scale.setScalar(1);sculpt.rotation.y=0;
   if(cameraOriginalPos)camera.position.copy(cameraOriginalPos);
   if(cameraOriginalRot)camera.rotation.copy(cameraOriginalRot);
   controls.enabled=true;controls.target.set(0,1.58,0);controls.update();resize();
 }
}
$('#closeCamera').addEventListener('click',stopCameraView);
function cameraResize(delta){cameraScale=THREE.MathUtils.clamp(cameraScale+delta,.19,.9);sculpt.scale.setScalar(cameraScale);$('#camSizeLabel').textContent='TAMAÑO · '+Math.round(cameraScale/.45*40)+' CM'}
$('#camSmaller').addEventListener('click',()=>cameraResize(-.06));
$('#camBigger').addEventListener('click',()=>cameraResize(.06));
$('#camRotate').addEventListener('click',()=>{sculpt.rotation.y+=Math.PI/6});
async function showNativeViewer(){
 try{
  const mv=$('#iosARModel');const host=$('#nativeViewerHost');
  host.appendChild(mv);mv.hidden=false;$('#arDialog').hidden=true;$('#nativeAR').hidden=false;
  mv.setAttribute('src',prepareNativeAR());
  // Visible, full-size preview (not the former invisible 1px component).
  await import('https://cdn.jsdelivr.net/npm/@google/model-viewer@4.1.0/dist/model-viewer.min.js');
  await customElements.whenDefined('model-viewer');
  await mv.updateComplete;
  return true;
 }catch(e){console.warn('Native AR viewer load failed',e);$('#nativeAR').hidden=true;return false}
}
$('#closeNative').addEventListener('click',()=>{$('#nativeAR').hidden=true;$('#iosARModel').hidden=true});
$('#launchAR').addEventListener('click',async()=>{
 const btn=$('#launchAR');if(btn.disabled)return;
 btn.disabled=true;btn.textContent='PREPARANDO EL RELICARIO…';
 let started=false;
 // Android ARCore: the same WebXR hit-test and world anchoring technique as Modo Caos.
 // Chrome's transient user activation should be consumed by requestSession, not by a preflight await.
 if(xrSupported)started=await launchXR();
 // Safari/iOS: show an actual visible model-viewer with a native Quick Look launch action.
 if(!started){
   const ios=/iPhone|iPad|iPod/i.test(navigator.userAgent);
   if(ios)started=await showNativeViewer();
 }
 // Universal fallback: even a phone without WebXR shows the actual 3D relic over camera.
 if(!started)started=await startCameraView();
 if(!started){
  started=await showNativeViewer();
  if(!started){
    $('#arMessage').textContent='No pudimos abrir la cámara ni el visor nativo. Podés seguir recorriendo el relicario en 3D.';
    $('#arDisclaimer').textContent='Probá desde Chrome Android con Servicios de Google Play para RA, o Safari en iPhone compatible.';
    toast('Este navegador bloqueó el acceso a la cámara o al visor AR.');
  }
 }
 btn.disabled=false;btn.textContent='ENTRAR EN REALIDAD AUMENTADA ↗';
});
window.addEventListener('pagehide',()=>{stopCameraView();if(app.xrSession)void app.xrSession.end()});
// If WebGL cannot start, never trap visitors with a blank viewport.
try{init3D()}catch(e){console.error('WebGL scene error:',e);$('#sceneLoading').innerHTML='<strong>EL OBJETO NO PUDO CARGARSE</strong><small>Probá Chrome, Safari o activá la aceleración gráfica.</small>';$('#primaryBtn').disabled=true;toast('No se pudo iniciar el motor 3D en este navegador')}