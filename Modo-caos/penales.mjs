import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const C=window.PenalesCore;
if(!C)throw Error('Faltan las reglas de PENALES AR');
const $=id=>document.getElementById(id),clamp=C.clamp;
let mode='cpu',difficulty=1,cup=null,match=null,scene=null,camera=null,renderer=null,world=null,keepers=null,shooter=null,ball=null,net=null,netRest=[],field=null;
let stage='home',viewMode='3d',session=null,refSpace=null,hitSource=null,hitPose=null,hitResult=null,anchor=null,anchored=false,rotation=0,size=.78,zoom=0;
let kick=null,lastTime=0,frameId=0,autoTimer=null,feedbackTimer=null,audio=null,sound=true;
let supabase=null,rooms=null,conn=null,room=null,me=null,roomCode='',mySide=0,online={},pollTimer=null,refreshing=false;
const params=new URLSearchParams(location.search);
const safeText=(id,t)=>$(id).textContent=t;
function toast(msg){const el=$('toast');el.textContent=msg;el.style.display='block';clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>el.style.display='none',3400);}
function label(a,b=''){safeText('callout',a);const s=document.createElement('small');s.textContent=b;$('callout').appendChild(s);}
function phase(s){stage=s;const playing=s==='play',placing=s==='place';$('gesture').style.display=playing||placing?'block':'none';$('guide').style.display=playing?'block':'none';$('placePanel').style.display=placing?'flex':'none';$('waiting').style.display=s==='wait'?'block':'none';$('startButton').style.display=s==='ready'?'block':'none';$('feedback').textContent='';}
function tone(kind){
 if(!sound)return;
 try{audio ||=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const t=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();
 osc.type=kind==='kick'?'triangle':'sine';osc.frequency.setValueAtTime(kind==='kick'?185:kind==='save'?440:660,t);osc.frequency.exponentialRampToValueAtTime(kind==='kick'?60:kind==='save'?220:390,t+.16);gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.16,t+.012);gain.gain.exponentialRampToValueAtTime(.0001,t+.27);
 osc.connect(gain).connect(audio.destination);osc.start(t);osc.stop(t+.3);}catch(e){}
}
function mat(color,metalness=0,roughness=.4){return new THREE.MeshStandardMaterial({color,metalness,roughness});}
const geometry={box:(x,y,z)=>new THREE.BoxGeometry(x,y,z),cyl:(a,b,h,n=14)=>new THREE.CylinderGeometry(a,b,h,n),sphere:(r,s=16)=>new THREE.SphereGeometry(r,s,Math.max(12,Math.floor(s*.67)))};
function mesh(geo,m,parent,x=0,y=0,z=0){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function rod(parent,a,b,r,m){const d=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),mid=new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5);const o=mesh(geometry.cyl(r,r,d.length(),12),m,parent,mid.x,mid.y,mid.z);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}
function player(color,shorts,skin,gloves=false){
 const root=new THREE.Group(),person=new THREE.Group();root.add(person);
 const cloth=mat(color,.13,.45),pants=mat(shorts),skinMat=mat(skin),shoeMat=mat('#101a30',.1,.2),white=mat('#ecfffb'),dark=mat('#18212c'),glove=mat(gloves?'#ffda69':'#e8af77');
 mesh(geometry.cyl(.29,.19,.48,12),cloth,person,0,1.04,0);
 mesh(geometry.cyl(.22,.23,.25,12),pants,person,0,.71,0);
 mesh(geometry.sphere(.19,20),skinMat,person,0,1.5,.01);
 mesh(geometry.sphere(.205,20),dark,person,0,1.635,-.045).scale.set(1,.25,1);
 mesh(geometry.sphere(.025,12),white,person,-.07,1.53,.173);
 mesh(geometry.sphere(.025,12),white,person,.07,1.53,.173);
 mesh(geometry.sphere(.009,8),dark,person,-.07,1.53,.198);
 mesh(geometry.sphere(.009,8),dark,person,.07,1.53,.198);
 // Player kit: shoulder discs, collar, side stripes, socks and articulated limbs.
 mesh(geometry.box(.12,.035,.07),white,person,0,1.25,.22);
 for(const side of [-1,1])mesh(geometry.box(.045,.35,.07),white,person,side*.222,1.025,.152);
 const arms=[],legs=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*.32,1.22,0);person.add(arm);
  mesh(geometry.cyl(.082,.073,.24),cloth,arm,0,-.10,0);
  mesh(geometry.cyl(.066,.052,.32),skinMat,arm,0,-.36,0);
  mesh(geometry.sphere(.077),glove,arm,0,-.54,.035);
  arm.rotation.z=side*.25;arms.push(arm);
  const leg=new THREE.Group();leg.position.set(side*.13,.67,0);person.add(leg);
  mesh(geometry.cyl(.095,.084,.38),pants,leg,0,-.16,0);
  mesh(geometry.cyl(.063,.063,.36),white,leg,0,-.48,0);
  const boot=mesh(geometry.box(.155,.105,.27),shoeMat,leg,0,-.68,.09);boot.rotation.x=-.05;
  legs.push(leg);
 }
 const shadowMat=new THREE.MeshBasicMaterial({color:'#001524',transparent:true,opacity:.29,depthWrite:false});
 const shadow=mesh(new THREE.CircleGeometry(.32,26),shadowMat,root,0,.015,0);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;
 return {root,person,arms,legs};
}
function buildScene(){
 if(renderer)return;
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(51,innerWidth/innerHeight,.01,100);
 camera.position.set(0,2.7,5.6);camera.lookAt(0,.7,-.4);
 scene.add(new THREE.HemisphereLight(0xb9f6ff,0x1d4b44,2.2));
 const sun=new THREE.DirectionalLight(0xfff4d9,3.15);sun.position.set(-2,5,4);scene.add(sun);
 const rim=new THREE.DirectionalLight(0x4fceff,1.5);rim.position.set(3,2,-4);scene.add(rim);
 renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.setSize(innerWidth,innerHeight);renderer.xr.enabled=true;
 $('viewport').appendChild(renderer.domElement);
 world=new THREE.Group();scene.add(world);
 const turf=mat('#257e63',.08,.95),lightLine=new THREE.MeshBasicMaterial({color:0xb9ffe6}),side=mat('#1c4851',.25,.6);
 field=mesh(geometry.box(3.7,.09,4.3),turf,world,0,-.04,.03);field.receiveShadow=true;
 for(let i=0;i<9;i++){const strip=mesh(geometry.box(3.7,.007,.26),mat(i%2?'#43936d':'#297458',0,.95),world,0,.013,-1.9+i*.49);strip.castShadow=false;}
 for(const x of [-1.61,1.61])mesh(geometry.box(.025,.01,3.5),lightLine,world,x,.03,.06);
 mesh(geometry.box(3.25,.01,.03),lightLine,world,0,.03,1.75);
 // Goal face, posts, crossbar and physically raised net.
 const post=mat('#edffff',.68,.23);
 rod(world,[-1.30,.02,-1.7],[-1.30,1.73,-1.7],.055,post);
 rod(world,[1.30,.02,-1.7],[1.30,1.73,-1.7],.055,post);
 rod(world,[-1.35,1.73,-1.7],[1.35,1.73,-1.7],.06,post);
 rod(world,[-1.30,1.73,-1.7],[-1.15,1.35,-2.14],.026,post);
 rod(world,[1.30,1.73,-1.7],[1.15,1.35,-2.14],.026,post);
 const netMat=new THREE.LineBasicMaterial({color:0xb6fff0,transparent:true,opacity:.52});
 net=new THREE.Group();world.add(net);
 for(let i=0;i<=26;i++){const x=-1.30+i*.10;const pts=[new THREE.Vector3(x,0,-1.71),new THREE.Vector3(x,1.70,-1.76),new THREE.Vector3(x*.9,1.32,-2.15),new THREE.Vector3(x*.9,0,-2.15)];net.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),netMat));}
 for(let i=0;i<=16;i++){const y=.02+i*.103;net.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1.3,y,-1.79),new THREE.Vector3(1.3,y,-1.79)]),netMat));}
 keepers=player('#ffb836','#091e44','#bb7856',true);keepers.root.position.set(0,0,-1.46);world.add(keepers.root);
 shooter=player('#36c8ed','#17314c','#ca916d');shooter.root.position.set(-.26,0,.75);shooter.root.rotation.y=Math.PI;world.add(shooter.root);
 ball=new THREE.Group();ball.position.set(0,.16,1.52);world.add(ball);
 mesh(geometry.sphere(.145,28),mat('#fffdf0',.03,.22),ball);
 const black=mat('#192a35',.1,.5);
 for(const v of [[0,0,1],[0,0,-1],[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[.66,.66,.37],[-.66,-.66,.37],[.66,-.66,-.37],[-.66,.66,-.37]]){
   const n=new THREE.Vector3(...v).normalize();
   const patch=mesh(new THREE.CircleGeometry(.054,5),black,ball,n.x*.148,n.y*.148,n.z*.148);
   patch.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),n);
 }
 const dot=mesh(new THREE.CircleGeometry(.22,20),new THREE.MeshBasicMaterial({color:'#041f22',transparent:true,opacity:.22,depthWrite:false}),world,0,.035,1.52);dot.rotation.x=-Math.PI/2;dot.castShadow=false;
 // Ambient flags and lightweight stadium light strips without obstructing real-world camera.
 for(const s of [-1,1]){mesh(geometry.box(.13,.24,.84),side,world,s*1.81,.23,-1.0);const led=mesh(geometry.box(.028,.10,.77),mat(s<0?'#53ffe2':'#ffca78',.3,.25),world,s*1.81,.38,-1);led.castShadow=false;}
 renderer.setAnimationLoop(render);
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
}
function resetPose(){
 ball.position.set(0,.16,1.52);ball.rotation.set(0,0,0);
 keepers.root.position.set(0,0,-1.46);keepers.person.rotation.set(0,0,0);keepers.arms[0].rotation.z=-.27;keepers.arms[1].rotation.z=.27;
 shooter.legs.forEach(o=>o.rotation.x=0);shooter.person.rotation.set(0,0,0);
}
function render(t,frame){
 const now=t*.001,dt=clamp(now-lastTime,0,.04);lastTime=now;frameId++;
 if(session&&frame&&refSpace){
  if(!anchored){
   if(!hitSource)return;
   const hits=frame.getHitTestResults(hitSource);
   if(hits.length){hitResult=hits[0];hitPose=hitResult.getPose(refSpace);$('fix').disabled=!hitPose;
     if(hitPose){const p=hitPose.transform.position;world.position.set(p.x,p.y,p.z);world.scale.setScalar(size);world.rotation.y=rotation;}}
   else {$('fix').disabled=true;hitPose=null;}
  } else if(anchor?.anchorSpace){const p=frame.getPose(anchor.anchorSpace,refSpace);if(p){const v=p.transform.position;world.position.set(v.x,v.y,v.z);}}
 }
 if(stage==='place'&&session){const d=Math.sin(now*3)*.025;field.material.emissive?.set('#052118');field.material.emissiveIntensity=.12+d;}
 if(stage==='play'&&keepers){keepers.person.position.y=Math.sin(now*4)*.012;keepers.arms[0].rotation.z=-.22+Math.sin(now*3.7)*.13;keepers.arms[1].rotation.z=.22-Math.sin(now*3.7)*.13;}
 if(kick){
  const a=clamp((now-kick.start)/kick.duration,0,1),f=1-Math.pow(1-a,2.4),aim=kick.aim,save=kick.save;
  const targetX=aim.x*1.3,targetY=.10+aim.y*1.63;
  ball.position.set(targetX*f,.16+(targetY-.16)*f+Math.sin(Math.PI*f)*.12,1.52-(3.38*f));
  ball.rotation.set(f*13,f*11,f*5);
  const launch=clamp(a*3,0,1);shooter.legs[0].rotation.x=-Math.sin(Math.PI*launch)*1.25;
  if(a>.22){
   const dive=clamp((a-.2)*2.6,0,1),ease=1-Math.pow(1-dive,2);
   keepers.root.position.x=save.x*1.06*ease;
   keepers.person.rotation.z=-save.x*.76*ease;
   keepers.person.position.y=save.y*.34*ease;
   keepers.arms[0].rotation.z=-1.0;keepers.arms[1].rotation.z=1.0;
  }
  if(a===1){kick=null;finishKick();}
 }
 renderer.render(scene,camera);
}
function scoreView(){
 if(!match)return;
 const [a,b]=match.scores,[n,m]=match.attempts;
 safeText('numbers',a+' : '+b);safeText('nameA',mode==='online'?'LOCAL':'VOS');safeText('nameB',mode==='online'?'VISITA':mode==='cup'?C.cupOpponent(cup):'CPU');
 const dots=(side)=>{let t='';for(let i=0;i<Math.max(5,match.attempts[side]);i++){const v=match.history.filter(h=>h.side===side)[i];t+=v?(v.goal?'●':'✕'):'○';}return t;};
 safeText('dotsA',dots(0));safeText('dotsB',dots(1));
 safeText('round',match.sudden?'MUERTE SÚBITA':'PENAL '+(Math.floor(match.turn/2)+1)+' DE 5');
}
function selectMode(value){
 mode=value==='friend'?'online':value;
 for(const m of ['cpu','friend','cup'])$(m==='cpu'?'cpuMode':m==='friend'?'friendMode':'cupMode').classList.toggle('selected',m===value);
 $('options').style.display=value==='friend'?'none':'block';$('onlineSetup').style.display=value==='friend'?'block':'none';
 if(value==='cup'){
  try{const saved=JSON.parse(localStorage.getItem('mc-penales-cup')||'null');cup=saved&&saved.v===1?saved:null;}catch(e){cup=null;}
  if(!cup||cup.status!=='active')cup=C.makeCup();
  safeText('choiceTitle',C.cupStage(cup));
  safeText('cupInfo',cup.played+' partidos jugados · '+(cup.phase===0?cup.points+' puntos':'Ronda de eliminación')+' · Próximo rival: '+C.cupOpponent(cup));
  $('difficultyWrap').style.display='none';
 }else{$('difficultyWrap').style.display='block';safeText('choiceTitle','PARTIDA RÁPIDA');safeText('cupInfo','');}
}
$('cpuMode').onclick=()=>selectMode('cpu');
$('cupMode').onclick=()=>selectMode('cup');
$('friendMode').onclick=()=>selectMode('friend');
function beginLocal(){match=C.createMatch(mode,mode==='cup'?Math.min(2,Math.floor(cup.played/3)):+$('difficulty').value);scoreView();beginTurn();}
async function openStage(kind){
 buildScene();viewMode=kind;anchored=false;anchor=null;hitPose=null;kick=null;rotation=0;size=.78;
 $('home').style.display='none';$('stage').style.display='block';$('gameOver').style.display='none';
 world.position.set(0,-.02,0);world.scale.setScalar(1.0);world.rotation.y=0;resetPose();
 if(kind==='ar'){
  const ok=await startXR();if(!ok){$('stage').style.display='none';$('home').style.display='block';return;}
  phase('place');label('ENCONTRÁ EL PISO','Apuntá hacia una superficie plana. Colocá el arco y fijalo.');
 }else{
  world.scale.setScalar(.91);phase('ready');label(mode==='online'?'PREPARÁ EL DUELO':'TODO LISTO','Deslizá para patear y para atajar.');enterReady();
 }
}
$('play3D').onclick=()=>{difficulty=+$('difficulty').value;openStage('3d')};
$('playAR').onclick=()=>{difficulty=+$('difficulty').value;openStage('ar')};
async function startXR(){
 if(!window.isSecureContext){toast('La realidad aumentada necesita HTTPS.');return false;}
 if(!navigator.xr){toast('No hay WebXR en este navegador. Podés jugar en 3D.');return false;}
 try{
  if(!await navigator.xr.isSessionSupported('immersive-ar'))throw Error('Tu equipo no admite AR inmersiva. Probá Chrome Android con ARCore.');
  session=await navigator.xr.requestSession('immersive-ar',{requiredFeatures:['hit-test','dom-overlay'],optionalFeatures:['anchors'],domOverlay:{root:$('overlay')}});
  renderer.xr.setReferenceSpaceType('local');
  await renderer.xr.setSession(session);
  refSpace=renderer.xr.getReferenceSpace();
  const viewer=await session.requestReferenceSpace('viewer');
  hitSource=await session.requestHitTestSource({space:viewer});
  session.addEventListener('end',()=>{session=null;refSpace=null;hitSource=null;anchored=false;anchor=null;phase('home');$('stage').style.display='none';$('home').style.display='block';});
  return true;
 }catch(e){toast(e.message||'No se pudo iniciar AR');if(session){try{await session.end()}catch(_){}}session=null;return false;}
}
$('smaller').onclick=()=>{size=clamp(size-.12,.38,1.7);world.scale.setScalar(size)};
$('larger').onclick=()=>{size=clamp(size+.12,.38,1.7);world.scale.setScalar(size)};
$('rotate').onclick=()=>{rotation+=Math.PI/12;world.rotation.y=rotation};
$('fix').onclick=async()=>{
 if(!hitPose)return;
 anchored=true;phase('ready');label('ARCO FIJADO','Podés quedarte en el mismo lugar para jugar.');
 try{if(hitResult?.createAnchor){anchor=await hitResult.createAnchor();}}catch(e){anchor=null;}
 enterReady();
};
function enterReady(){
 $('startButton').textContent=mode==='online'?'▶ PREPARAR DUELO':'▶ EMPEZAR PARTIDA';
 if(mode==='online'){startOnlineWhenReady();return;}
 phase('ready');label(mode==='cup'?C.cupStage(cup):'¡A PATEAR!','Cinco penales por lado. Si empatan, muerte súbita.');
}
$('startButton').onclick=async()=>{
 if(mode==='online'){
  try{
   await onlineStageStart();
  }catch(e){toast(e.message||'No se pudo iniciar');}return;
 }
 beginLocal();
};
function beginTurn(){
 if(!match||match.done)return;
 clearTimeout(autoTimer);kick=null;resetPose();phase('play');scoreView();
 const side=C.activeSide(match),localStriker=mode==='online'?side===mySide:side===0;
 if(localStriker){label('¡PATEÁ!','Deslizá desde cualquier parte de la cancha hacia donde querés colocar la pelota.');safeText('feedback','DESLIZÁ PARA APUNTAR Y DAR POTENCIA');}
 else {label('¡ATAJÁ!','El rival se prepara: deslizá hacia donde querés volar.');safeText('feedback','DESLIZÁ HACIA EL SECTOR DEL ARCO');}
 if(mode!=='online'&&side===1){autoTimer=setTimeout(()=>{if(stage==='play')localSave({x:0,y:.46})},2400);}
 if(mode==='online'&&!localStriker){phase('wait');label('EL RIVAL APUNTA','Esperando que confirme su penal…');}
}
function shootMotion(aim,save){
 if(stage==='anim'||!match)return;
 clearTimeout(autoTimer);phase('anim');label('¡DISPARO!','');
 tone('kick');kick={aim,save,start:performance.now()*.001,duration:.91};
}
let lastResult=null;
function finishKick(){
 const prev=match;match=C.apply(match,lastResult.aim,lastResult.save);
 tone(lastResult.expected.goal?'goal':lastResult.expected.saved?'save':'miss');
 const r=match.history.at(-1),message=r.goal?'¡GOOOOL!':r.saved?'¡ATAJADÓN!':'¡AFUERA!';
 label(message,r.goal?'Pelota al fondo de la red':r.saved?'El arquero llegó justo':'La pelota se fue por un costado.');
 try{navigator.vibrate?.(r.goal?[35,30,60]:[80])}catch(e){}
 scoreView();
 setTimeout(()=>{if(match!==null&&match.turn===prev.turn+1){if(match.done)gameOver();else beginTurn();}},1500);
}
function perform(aim,save){
 lastResult={aim,save,expected:C.resolve(aim,save)};
 shootMotion(aim,save);
}
function localShot(aim){const save=C.aiSave(aim,match.difficulty);perform(aim,save);}
function localSave(save){const aim=C.aiAim();perform(aim,save);}
function gameOver(){
 phase('done');$('gameOver').style.display='flex';
 const win=(mode==='online'?match.winner===mySide:match.winner===0);
 safeText('endTitle',win?'¡GANASTE!':'¡CASI! REVANCHA');
 let desc='Resultado '+match.scores.join(' – ')+'. '+(match.sudden?'Definición en muerte súbita.':'Cinco penales por lado o definición anticipada.');
 $('nextMatch').style.display='none';$('rematch').style.display=mode==='cup'?'none':'block';
 if(mode==='cup'){
  cup=C.recordCup(cup,win,match.scores[0],match.scores[1]);
  try{localStorage.setItem('mc-penales-cup',JSON.stringify(cup))}catch(e){}
  let t=cup.status==='champion'?'🏆 ¡CAMPEÓN DE LA COPA!':cup.status==='eliminated'?'ELIMINADO DE LA COPA':C.cupStage(cup)+' · '+C.cupOpponent(cup);
  safeText('cupProgress',t);
  if(cup.status==='active'){$('nextMatch').style.display='block';$('nextMatch').textContent='▶ '+C.cupStage(cup);}
  else{$('rematch').style.display='block';$('rematch').textContent='🏆 NUEVA COPA';}
  if(cup.status==='champion'){safeText('endTitle','🏆 ¡CAMPEÓN!');desc='Ganaste los siete partidos de la Copa. ¡Leyenda!';}
 }else safeText('cupProgress','');
 safeText('endText',desc);
}
$('nextMatch').onclick=()=>{if(mode!=='cup'||cup?.status!=='active')return;$('gameOver').style.display='none';beginLocal();};
$('rematch').onclick=()=>{
 $('gameOver').style.display='none';
 if(mode==='cup'){cup=C.makeCup();try{localStorage.setItem('mc-penales-cup',JSON.stringify(cup))}catch(e){};beginLocal();}
 else if(mode==='online'){toast('Para la revancha online, creá otra sala y compartí el enlace.');leaveGame();}
 else beginLocal();
};
async function leaveGame(){clearTimeout(autoTimer);kick=null;match=null;if(session){try{await session.end()}catch(e){}}else{$('stage').style.display='none';$('home').style.display='block';phase('home');}if(mode==='online')await teardownOnline();}
$('exit').onclick=leaveGame;$('leave').onclick=leaveGame;
$('mute').onclick=()=>{sound=!sound;$('mute').textContent=sound?'🔊':'🔇'};
let pointer=null;
$('gesture').addEventListener('pointerdown',e=>{e.preventDefault();pointer={x:e.clientX,y:e.clientY,t:performance.now(),id:e.pointerId};$('gesture').setPointerCapture(e.pointerId);});
$('gesture').addEventListener('pointerup',e=>{
 if(!pointer||e.pointerId!==pointer.id)return;e.preventDefault();
 const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer=null;
 if(stage!=='play'||!match||Math.hypot(dx,dy)<35)return;
 const shot={x:clamp(dx/(innerWidth*.41),-1.13,1.13),y:clamp(.45-dy/(innerHeight*.39),.04,1.13),power:clamp(.57+Math.hypot(dx,dy)/Math.max(innerWidth,innerHeight),.57,1)};
 const localStriker=mode==='online'?C.activeSide(match)===mySide:C.activeSide(match)===0;
 if(mode==='online'){if(localStriker)onlineShoot(shot);else onlineSave({x:shot.x,y:shot.y});}
 else if(localStriker)localShot(shot);else localSave({x:shot.x,y:shot.y});
});
$('gesture').addEventListener('pointercancel',()=>pointer=null);

let onlineState={isHost:false,ready:false,started:false,connected:false,channel:null};
async function setupOnline(){
 if(supabase)return;
 const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.91.0/+esm');
 const c=window.ModoCaosConfig;if(!c?.url||!c?.publishableKey)throw Error('Sin configuración Realtime');
 supabase=createClient(c.url,c.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 me=crypto.randomUUID();
}
function onlineName(){const s=$('playerName').value.trim();if(!s||s.length>24)throw Error('Ingresá un apodo de 1 a 24 letras');return s;}
function newRoomCode(){return Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();}
const roomCodeValid=s=>/^[A-F0-9]{32}$/.test(String(s||'').toUpperCase());
function getPeers(){
 if(!onlineState.channel)return [];
 const entries=Object.values(onlineState.channel.presenceState()).flat();
 const users=new Map();
 for(const item of entries){
  if(item&&/^[0-9a-f-]{36}$/i.test(item.id||'')&&['host','guest'].includes(item.role)&&typeof item.name==='string'){
   users.set(item.id,{userId:item.id,role:item.role,name:item.name.slice(0,24),ready:!!item.ready,started:!!item.started});
  }
 }
 return [...users.values()].sort((a,b)=>(a.role==='host'?-1:1)-(b.role==='host'?-1:1));
}
function refreshRoom(){
 if(!room)return;
 const peers=getPeers(),host=peers.find(x=>x.role==='host'),guest=peers.find(x=>x.role==='guest');
 room.players=[host,guest].filter(Boolean);
 room.hostUserId=host?.userId||null;
 if(!onlineState.isHost&&host?.started){onlineState.started=true;room.status='playing';}
 safeText('roomDetails',room.players.length+' / 2 jugadores · '+room.players.map(x=>x.name+(x.ready?' ✓':'')).join(' · ')+(onlineState.started?' · EN JUEGO':''));
 $('readyRoom').textContent=onlineState.ready?'✓ LISTO':'✓ ESTOY LISTO';
 $('beginRoom').style.display=onlineState.isHost?'block':'none';
 $('beginRoom').disabled=!(room.players.length===2&&room.players.every(p=>p.ready))||onlineState.started;
 if(stage==='ready'&&mode==='online')$('startButton').textContent=onlineState.isHost?'▶ INICIAR DUELO':'✓ ESTOY LISTO';
 if(onlineState.started)startOnlineMatch();
 else if(onlineState.isHost&&onlineState.ready&&stage==='wait'&&room.players.length===2&&room.players.every(p=>p.ready)&&!onlineState.starting){
  onlineState.starting=true;
  hostStart().catch(e=>toast(e.message||'No se pudo iniciar')).finally(()=>onlineState.starting=false);
 }
}
async function enterRoom(code,isHost){
 if(!roomCodeValid(code))throw Error('Necesitás el enlace completo del duelo.');
 if(conn)await conn.close();
 onlineState={isHost,ready:false,started:false,starting:false,connected:false,channel:null};
 roomCode=code;room={id:code,code,players:[],hostUserId:null,status:'lobby'};
 $('roomInvite').style.display='block';
 safeText('roomCode',code.slice(0,8)+'…'+code.slice(-4));
 safeText('onlineNote','Conectando al canal temporal…');
 const channel=supabase.channel('penales-duel:'+code,{config:{private:false,presence:{key:me},broadcast:{self:false,ack:true}}});
 onlineState.channel=channel;
 channel.on('presence',{event:'sync'},()=>refreshRoom())
 .on('broadcast',{event:'penales'},({payload})=>{
   if(!payload||payload.userId===me)return;
   const peer=room?.players?.find(p=>p.userId===payload.userId);
   if(!peer)return;
   if(payload.kind==='start'){
     if(peer.role!=='host'||onlineState.started)return;
     onlineState.started=true;room.status='playing';startOnlineMatch();refreshRoom();
   }else receiveOnline(payload).catch(e=>toast('Error de conexión: '+e.message));
 });
 let connected=false;
 conn={
  get connected(){return connected},
  async sendGameEvent(payload){
   if(!connected)throw Error('Esperando conexión de la sala');
   const resp=await channel.send({type:'broadcast',event:'penales',payload:{...payload,userId:me}});
   if(resp!=='ok')throw Error('No se entregó el mensaje: '+resp);
  },
  async notify(){refreshRoom()},
  async close(){connected=false;try{await channel.untrack();}catch(e){}await supabase.removeChannel(channel)}
 };
 channel.subscribe(async(status)=>{
   connected=status==='SUBSCRIBED';onlineState.connected=connected;
   safeText('onlineNote',connected?'🟢 Conectado · enlace de invitación temporal':'Estado de sala: '+status);
   if(connected){
     try{await channel.track({id:me,name:onlineName(),role:isHost?'host':'guest',ready:onlineState.ready,started:onlineState.started});}
     catch(e){safeText('onlineNote','No se pudo registrar presencia: '+e.message)}
     refreshRoom();
   }
 });
}
$('createRoom').onclick=async()=>{try{await setupOnline();onlineName();await enterRoom(newRoomCode(),true);}catch(e){showOnlineError(e)}};
$('joinRoom').onclick=()=>{$('joinBox').style.display='block';};
$('confirmJoin').onclick=async()=>{
 try{await setupOnline();onlineName();await enterRoom($('joinCode').value.trim().toUpperCase(),false);}
 catch(e){showOnlineError(e)}
};
function showOnlineError(e){safeText('onlineNote',e.message||String(e));toast(e.message||'No se pudo conectar');}
async function toggleReady(){
 if(!conn?.connected)throw Error('Esperá a que la sala se conecte');
 onlineState.ready=!onlineState.ready;
 const res=await onlineState.channel.track({id:me,name:onlineName(),role:onlineState.isHost?'host':'guest',ready:onlineState.ready,started:onlineState.started});
 if(res!=='ok')throw Error('No se pudo actualizar la presencia');
 refreshRoom();
}
$('readyRoom').onclick=async()=>{try{await toggleReady()}catch(e){showOnlineError(e)}};
async function hostStart(){
 refreshRoom();
 if(!onlineState.isHost||!onlineState.ready||room.players.length!==2||!room.players.every(p=>p.ready))throw Error('Los dos jugadores deben estar conectados y listos');
 await conn.sendGameEvent({game:'penales-ar',kind:'start',turn:0});
 onlineState.started=true;room.status='playing';
 await onlineState.channel.track({id:me,name:onlineName(),role:'host',ready:true,started:true});
 startOnlineMatch();refreshRoom();
}
$('beginRoom').onclick=async()=>{try{await hostStart()}catch(e){showOnlineError(e)}};
function startOnlineMatch(){
 if(!onlineState.started||stage==='home'||match)return;
 match=C.createMatch('online');scoreView();beginTurn();
}
async function onlineStageStart(){
 if(!onlineState.ready)await toggleReady();
 refreshRoom();
 if(onlineState.isHost&&room.players.length===2&&room.players.every(p=>p.ready)){
  await hostStart();
 }else{
  phase('wait');
  label(onlineState.isHost?'ESPERANDO AL AMIGO':'¡LISTO!','La tanda comienza cuando ambos estén preparados.');
 }
}
function startOnlineWhenReady(){
 if(onlineState.started){startOnlineMatch();return;}
 phase('ready');label('CANCHA PREPARADA','Dos jugadores conectados, sin registro.');
 $('startButton').textContent=onlineState.isHost?'▶ INICIAR DUELO':'✓ ESTOY LISTO';
 refreshRoom();
}
function roomLink(){return new URL('penales.html?room='+encodeURIComponent(roomCode),location.href).href;}
$('shareRoom').onclick=()=>window.open('https://wa.me/?text='+encodeURIComponent('¡Jugamos PENALES AR! Entrá desde este enlace: '+roomLink()),'_blank','noopener,noreferrer');
$('copyRoom').onclick=async()=>{try{await navigator.clipboard.writeText(roomLink());toast('¡Enlace copiado!')}catch(e){toast('Copiá este enlace: '+roomLink())}};
$('online3D').onclick=()=>openStage('3d');
$('onlineAR').onclick=()=>openStage('ar');
async function onlineSend(data){if(!conn?.connected)throw Error('Sala desconectada');await conn.sendGameEvent({game:'penales-ar',...data});}

function numericShot(a){return {x:Math.round(clamp(a.x,-1.3,1.3)*1000)/1000,y:Math.round(clamp(a.y,-.2,1.3)*1000)/1000,power:Math.round(clamp(a.power||.75,.25,1)*1000)/1000};}
async function hashShot(aim,nonce){const raw=[aim.x,aim.y,aim.power,nonce].join('|');const buff=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));return Array.from(new Uint8Array(buff),x=>x.toString(16).padStart(2,'0')).join('');}
async function onlineShoot(raw){
 if(stage!=='play'||online.pending)return;
 const aim=numericShot(raw),nonce=Array.from(crypto.getRandomValues(new Uint32Array(2))).join('-'),turn=match.turn;
 online.pending={aim,nonce,turn};phase('wait');label('PENAL PREPARADO','Esperando que tu amigo se tire…');
 try{await onlineSend({kind:'commit',turn,hash:await hashShot(aim,nonce)});}
 catch(e){online.pending=null;phase('play');toast(e.message);}
}
async function onlineSave(raw){
 if(!match||stage!=='play'||!online.commit||online.save)return;
 const save={x:clamp(raw.x,-1,1),y:clamp(raw.y,0,1)},turn=match.turn;
 online.save=save;phase('wait');label('¡TE LANZASTE!','Esperando el disparo…');
 try{await onlineSend({kind:'save',turn,save});}
 catch(e){online.save=null;phase('play');toast(e.message);}
}
async function receiveOnline(packet){
 if(!packet||packet.game!=='penales-ar'||packet.userId===me||!room||!match||match.done)return;
 if(!Number.isSafeInteger(packet.turn)||packet.turn!==match.turn)return;
 if(!room.players.some(p=>p.userId===packet.userId))return;
 const shooterSide=C.activeSide(match),myShot=shooterSide===mySide,kind=packet.kind;
 if(kind==='commit'&&!myShot&&typeof packet.hash==='string'&&/^[a-f0-9]{64}$/.test(packet.hash)){
  if(online.commit)return;
  online.commit=packet.hash;phase('play');label('¡EL RIVAL PATEA!','¡Deslizá ya para lanzarte!');
  clearTimeout(autoTimer);autoTimer=setTimeout(()=>{if(stage==='play'&&!online.save)onlineSave({x:0,y:.42});},2600);
 }else if(kind==='save'&&myShot&&online.pending&&packet.save&&Number.isFinite(packet.save.x)&&Number.isFinite(packet.save.y)){
  const {aim,nonce}=online.pending;
  const save={x:clamp(packet.save.x,-1,1),y:clamp(packet.save.y,0,1)};
  online.pending=null;
  try{await onlineSend({kind:'reveal',turn:match.turn,aim,nonce,save});perform(aim,save);}
  catch(e){toast('No se pudo entregar el tiro: '+e.message);}
 }else if(kind==='reveal'&&!myShot&&online.commit&&packet.aim&&packet.save&&typeof packet.nonce==='string'){
  const aim=numericShot(packet.aim),save={x:clamp(packet.save.x,-1,1),y:clamp(packet.save.y,0,1)};
  const verified=await hashShot(aim,packet.nonce);
  if(verified!==online.commit){toast('El tiro remoto no coincidió con el compromiso.');return;}
  if(!online.save||Math.abs(save.x-online.save.x)>.002||Math.abs(save.y-online.save.y)>.002){toast('Atajada remota inconsistente.');return;}
  clearTimeout(autoTimer);perform(aim,save);
 }
}
const baseBegin=beginTurn;
beginTurn=function(){
 online={commit:null,pending:null,save:null,revealed:false};baseBegin();
};
async function teardownOnline(){
 clearInterval(pollTimer);pollTimer=null;
 try{await conn?.close();}catch(e){}
 conn=null;room=null;match=null;
 $('roomInvite').style.display='none';
}
if(params.has('room')&&/^[a-f0-9]{32}$/i.test(params.get('room'))){
 selectMode('friend');$('joinBox').style.display='block';$('joinCode').value=params.get('room').toUpperCase();toast('Ingresá tu apodo y tocá ENTRAR para unirte al duelo.');
}
