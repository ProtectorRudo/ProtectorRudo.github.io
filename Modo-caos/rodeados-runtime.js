import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.181.0/build/three.module.js';
import {createRodeadosArt} from './rodeados-art.js?v=11';
import {createRodeadosArCompositor} from './rodeados-ar-compositor.js';
/* RODEADOS 360 — Native WebXR first-person game runtime.
   Floor and bots are WORLD-LOCKED. Only the weapon is camera-attached.
   The selected 5x5 cell is a manual baseline; WebXR follows the phone, never feet.
   Shared AR origin is manual approximation, not real collaborative anchors. */
const $=id=>document.getElementById(id),G=globalThis.RodeadosCore,UX=globalThis.RodeadosUX,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),TAU=Math.PI*2;
if(!G)throw Error('RODEADOS: falta el núcleo de juego');
const scene=new THREE.Scene(),nativeXRScene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(69,innerWidth/innerHeight,.03,35);
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local');
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight);
$('world').appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xbbfcff,0x142c46,2));
const key=new THREE.DirectionalLight(0xfff0ce,2.2);key.position.set(-2.5,5,1.8);scene.add(key);
const cool=new THREE.PointLight(0x44fce0,1.7,7);cool.position.set(1,2,-1);scene.add(cool);
if(!UX)throw Error('RODEADOS: falta el radar 360');
const art=createRodeadosArt(THREE,scene,camera);
 // Opt-in isolated M.A.N.U.L. importer: public RODEADOS V11 never loads any 3D
 // model or extra library. Nothing in the shooter/AR core depends on this test.
 if(location.pathname.endsWith('/rodeados-manul.html')){
  import('./rodeados-manul.js?v=12')
   .then(({installManulPreview})=>installManulPreview({
    THREE,art,notice:(msg,sec)=>{const n=document.getElementById('manulStatus');if(n)n.title=msg;console.info('MANUL',msg)}
   }))
   .catch(e=>{
    console.error('RODEADOS MANUL TEST LOADER',e);
    const status=document.getElementById('manulStatus');
    if(status)status.textContent='⚠ No se cargó la herramienta 3D: '+(e.message||'error');
   });
 }
let game=G.create({mode:$('mode').value}),stage='home',xrSession=null,space=null,hitSource=null,hit=null,anchor=null,anchorOffset=null,arCompositor=null;
let lastTime=0,lastHud=0,lastSnapshot=0,lastPing=0,lastRadar=0,anchorPending=false,feedbackLife=100,feedbackWave=0,feedbackCombo=0,waveUntil=0,damageUntil=0,crossUntil=0,comboUntil=0,basePos=new THREE.Vector3(),baseQ=new THREE.Quaternion(),yaw=0,shift=new THREE.Vector3(),floorSize=2.6;
let fixedPos=new THREE.Vector3(),fixedQ=new THREE.Quaternion(),gridVisible=0,searchSince=0,lastVisibleAt=0,trackingValid=false,lastTracked=0,selected=-1,calStart=0,calSamples=[],calibrated=false,calOffset=new THREE.Vector3(),playerPos=new THREE.Vector3();
let trackingLostSince=0,pausedByTracking=false,limitedTrackingSince=0,initialBotsSpawned=false,openingEyePosition=null;let countdown=0,pausedForCalibration=false,demo=false,aimYaw=0,aimPitch=0,fireFlash=0,toastDeadline=0,missStreak=0;
let sounds=true,vibration=true,ctx=null,lastLaugh=0,lastMenaceAt=0,lastBlastSignal='',fxShown=new Set(),lastHitRay=null,performanceFrames=0,performanceTotal=0;
let online=null,onlineBusy=false,onlineRoomCode=new URLSearchParams(location.search).get('room')?.toUpperCase()||'',roomTimer=0;
const pointer=new Map();let lastPinch=null;
const THREEVec=(x,y,z)=>new THREE.Vector3(x,y,z);
const raycaster=new THREE.Raycaster(),quaternionY=new THREE.Quaternion(),tempQ=new THREE.Quaternion(),tempPos=new THREE.Vector3(),tmpVec=new THREE.Vector3(),centerRay=new THREE.Vector3(),localDir=new THREE.Vector3();
function openArWorld(){
 if(arCompositor)return true;
 try{arCompositor=createRodeadosArCompositor(THREE,$('arWorldOverlay'),1.2);visible('arWorldOverlay',true,'block');return true}
 catch(e){console.error('RODEADOS: error compositor AR',e);notice('ERROR AL MOSTRAR ROBOTS · '+(e?.message||'WEBGL'),7);return false}
}
function closeArWorld(){arCompositor?.dispose();arCompositor=null;visible('arWorldOverlay',false)}
function notice(text,sec=2){$('notice').textContent=text;toastDeadline=performance.now()+sec*1000}
function hint(text){$('hint').textContent=text}
function visible(id,show,style='flex'){$(id).style.display=show?style:'none'}
function vib(ms=20){if(vibration)try{navigator.vibrate?.(ms)}catch(_){}}
function audio(type='shot',position=null){
 if(!sounds)return;
 try{
  ctx??=new (window.AudioContext||window.webkitAudioContext)();
  if(ctx.state==='suspended')ctx.resume();
  const time=ctx.currentTime,o=ctx.createOscillator(),env=ctx.createGain();
  let f=380,d=.12,vol=.09,wave='sawtooth',end=.34;
  if(type==='shot'){f=165;d=.16;vol=.18;end=.16}
  if(type==='hit'){f=590;d=.11;vol=.13;wave='square';end=.22}
  if(type==='reload'){f=490;d=.27;vol=.055;wave='triangle';end=.70}
  if(type==='danger'){f=450;d=.24;vol=.11;wave='triangle';end=.60}
  if(type==='menace'){f=88;d=.64;vol=.045;wave='sawtooth';end=.58}
  if(type==='laugh'){f=270;d=.30;vol=.085;end=1.8;wave='triangle'}
  if(type==='finish'){f=660;d=.6;vol=.10;end=.36}
  if(type==='blast'){f=105;d=.57;vol=.30;wave='sawtooth';end=.30}
  if(type==='throw'){f=380;d=.17;vol=.09;wave='triangle';end=.55}
  o.type=wave;o.frequency.setValueAtTime(f,time);o.frequency.exponentialRampToValueAtTime(Math.max(50,f*end),time+d);
  env.gain.setValueAtTime(.001,time);env.gain.exponentialRampToValueAtTime(vol,time+.012);env.gain.exponentialRampToValueAtTime(.001,time+d+.02);
  o.connect(env);
  if(position&&ctx.createStereoPanner){
   const pan=ctx.createStereoPanner(),dir=relativeAngle(position);
   pan.pan.value=clamp(Math.sin(dir),-1,1);env.connect(pan);pan.connect(ctx.destination);
  }else env.connect(ctx.destination);
  o.start(time);o.stop(time+d+.03);
  // A noise transient plus falling bass supplies weight missing from a
  // bare toy-like sine wave. Offline buffer; no assets/network required.
  if(type==='shot'||type==='hit'||type==='blast'){
   const length=Math.max(256,Math.round(ctx.sampleRate*(type==='blast'?.33:.105)));
   const buffer=ctx.createBuffer(1,length,ctx.sampleRate),data=buffer.getChannelData(0);
   for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
   const noise=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
   noise.buffer=buffer;filter.type='lowpass';filter.frequency.value=type==='blast'?640:1800;
   gain.gain.setValueAtTime(type==='blast'?.18:.12,time);
   gain.gain.exponentialRampToValueAtTime(.001,time+length/ctx.sampleRate);
   noise.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
   noise.start(time);noise.stop(time+length/ctx.sampleRate);
  }
 }catch(e){/* Audio is optional, gameplay stays available. */}
}
function relativeAngle(p){
 const target=new THREE.Vector3(p.x,0,p.z).applyQuaternion(art.root.quaternion).add(art.root.position);
 const viewCam=demo?camera:renderer.xr.getCamera(camera);
 viewCam.getWorldPosition(tempPos);viewCam.getWorldQuaternion(tempQ);
 const toward=target.sub(tempPos);toward.y=0;toward.normalize();
 const forward=new THREE.Vector3(0,0,-1).applyQuaternion(tempQ);forward.y=0;forward.normalize();
 return Math.atan2(forward.x*toward.z-forward.z*toward.x,forward.x*toward.x+forward.z*toward.z);
}
function drawRadar(t){
 if(t-lastRadar<160||(stage!=='playing'&&stage!=='paused'))return;
 lastRadar=t;
 const canvas=$('radar'),ctx=canvas.getContext('2d');if(!ctx)return;
 const c=108,R=82;
 ctx.clearRect(0,0,216,216);
 ctx.strokeStyle='rgba(126,253,223,.25)';ctx.lineWidth=1.5;
 for(const r of [R*.5,R]){ctx.beginPath();ctx.arc(c,c,r,0,TAU);ctx.stroke()}
 ctx.beginPath();ctx.moveTo(c,22);ctx.lineTo(c,194);ctx.moveTo(22,c);ctx.lineTo(194,c);ctx.stroke();
 const view=demo?camera:renderer.xr.getCamera(camera);
 view.getWorldDirection(centerRay);
 const forward=centerRay.clone().applyQuaternion(art.root.quaternion.clone().invert());
 const heading=Math.atan2(forward.x,-forward.z);
 const targets=UX.radar(game.enemies,game.player,heading,Math.max(floorSize*1.4,3.5));
 for(const e of targets){
  const x=c+e.x*R,y=c+e.y*R,radius=e.type==='boss'?9:e.type==='tank'?7:5;
  ctx.beginPath();ctx.arc(x,y,radius,0,TAU);
  ctx.fillStyle=e.dangerous?'#ff536c':e.type==='boss'?'#ffca64':e.type==='joker'?'#ffc47f':'#71eddf';
  ctx.shadowBlur=e.dangerous?15:5;ctx.shadowColor=ctx.fillStyle;ctx.fill();ctx.shadowBlur=0;
 }
 ctx.save();ctx.translate(c,c);ctx.rotate(0);
 ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(8,8);ctx.lineTo(0,4);ctx.lineTo(-8,8);ctx.closePath();
 ctx.fillStyle='#f4fff6';ctx.fill();ctx.restore();
}
function updateBattleFeedback(t){
 if(stage!=='playing')return;
 if(feedbackWave&&game.wave>feedbackWave){
  $('waveBanner').textContent='⚡ OLEADA '+game.wave+' · ¡TE ESTÁN RODEANDO!';
  waveUntil=t+1600;audio('danger');vib(35);
 }
 feedbackWave=Math.max(feedbackWave,game.wave);
 if(game.lives<feedbackLife){damageUntil=t+360;vib(80);if(!demo)audio('danger')}
 feedbackLife=game.lives;
 if(game.combo>feedbackCombo&&game.combo>0&&game.combo%5===0){
  $('waveBanner').textContent='🔥 ¡COMBO X'+game.combo+'!';
  waveUntil=t+1000;vib(30);
 }
 feedbackCombo=game.combo;
 $('damageFlash').style.opacity=t<damageUntil?'1':'0';
 $('waveBanner').style.opacity=t<waveUntil?'1':'0';
 $('waveBanner').style.transform=t<waveUntil?'scale(1)':'scale(.9)';
 $('hitCross').style.opacity=t<crossUntil?'1':'0';
 $('combo').textContent=game.combo>=2?'×'+game.combo+' IMPACTOS CONSECUTIVOS':'';
 $('combo').style.opacity=game.combo>=2?'1':'0';
 drawRadar(t);
}
function showBotDirection(){
 if(stage!=='playing'&&stage!=='paused')return;
 const cue=$('botGuide'),targets=game.enemies.filter(e=>e.hp>0&&e.portal<.3);
 if(!targets.length){cue.textContent='🤖 ROBOTS ENTRANDO A LA PISTA';return}
 const target=targets.slice().sort((a,b)=>
  Math.hypot(a.x-game.player.x,a.z-game.player.z)-Math.hypot(b.x-game.player.x,b.z-game.player.z))[0];
 const angle=relativeAngle(target);
 if(angle>.66)cue.textContent='🤖 ROBOTS A TU DERECHA → GIRÁ EL CELULAR';
 else if(angle<-.66)cue.textContent='← 🤖 ROBOTS A TU IZQUIERDA · GIRÁ EL CELULAR';
 else{
  const cam=demo?camera:renderer.xr.getCamera(camera);
  cam.getWorldDirection(centerRay);
  cue.textContent=centerRay.y<-.42?'⬆ LEVANTÁ EL CELULAR · ROBOT AL FRENTE':'🎯 ROBOT FRENTE A VOS · ¡APUNTÁ Y DISPARÁ!';
 }
}
function renderThreats(){
 const war=$('warning');war.replaceChildren();
 if(stage!=='playing'||!game.enemies.length){war.style.display='none';return}
 const threats=game.enemies.filter(e=>e.portal<.4).sort((a,b)=>Math.hypot(a.x-game.player.x,a.z-game.player.z)-Math.hypot(b.x-game.player.x,b.z-game.player.z)).slice(0,3);
 war.style.display='block';
 for(const e of threats){
  const a=relativeAngle(e);
  if(Math.abs(a)<.68)continue;
  const i=document.createElement('i');war.appendChild(i);
  const screenX=Math.sin(a)>0?'90%':'10%';
  i.style.left=screenX;i.style.top=(20+Math.min(57,Math.abs(a)*18))+'%';
  i.style.transform='translate(-50%,-50%) rotate('+(Math.sin(a)>0?90:-90)+'deg)';
 }
}
function setupGame(keepCalibration=false){
 const keepArena=floorSize;
 game=G.create({mode:$('mode').value,arena:keepArena,ownerId:online?.isHost?online.id:null,seed:online?.seed??Math.floor(Math.random()*2**32)});
 if(!keepCalibration){selected=-1;calibrated=false;calSamples=[];calOffset.set(0,0,0)}
 fxShown.clear();lastBlastSignal='';lastMenaceAt=0;initialBotsSpawned=false;openingEyePosition=null;latestAim=null;lastAimStamp=0;lastShotStatus='';pausedByTracking=false;trackingLostSince=0;limitedTrackingSince=0;fireFlash=0;missStreak=0;lastHud=0;feedbackLife=100;feedbackWave=0;feedbackCombo=0;waveUntil=damageUntil=crossUntil=comboUntil=0;
 $('result').style.display='none';visible('healthTrack',false);visible('topHud',false);
 updateHud(true);
}
function updateHud(force=false){
 if(stage!=='playing'&&stage!=='ready'&&stage!=='countdown'&&stage!=='paused'&&!force)return;
 $('life').textContent=Math.round(game.lives);
 $('points').textContent=Math.round(game.score).toLocaleString('es-AR');
 $('wave').textContent=game.wave||1;
 $('clock').textContent=Number.isFinite(game.duration)?Math.max(0,Math.ceil(game.duration-game.elapsed)):'∞';
 $('healthFill').style.width=Math.max(0,game.lives)+'%';
 $('ammo').textContent='∞  BALAS';
 $('special').disabled=game.skillCooldown>0;
 $('special').textContent=game.skillCooldown>0?'EMP '+Math.ceil(game.skillCooldown)+'s':'⚡ EMP';
 $('bomb').disabled=game.bombCharges<=0;
 $('bomb').textContent=game.bombCharges>0?'💣 BOMBA CAOS':'💣 '+Math.ceil(game.bombCooldown)+'s';
 if(online)$('online').textContent=online.status+' · '+(online.isHost?'ANFITRIÓN':'INVITADO')+' · '+online.mode;
}
function result(){
 if(stage==='finished')return;
 stage='finished';game.phase='finished';visible('combat',false);visible('pause',false);visible('ammo',false);visible('warning',false);
 const accuracy=game.shots?Math.round(100*game.hits/game.shots):0;
 let record=0;try{record=Number(localStorage.getItem('mc-rodeados-record'))||0}catch(_){}
 const improved=game.score>record;
 if(improved)try{localStorage.setItem('mc-rodeados-record',String(game.score))}catch(_){}
 const report=globalThis.RodeadosProgress?.finish(game);
 if(report){
  $('achievements').textContent=report.unlocked.length?'🏅 LOGROS DESBLOQUEADOS: '+report.unlocked.join(' · '):'🏅 LOGROS: '+report.progress.achievements.length+' / 6';
  $('localRank').textContent='🏆 TOP PERSONAL: '+report.ranking.map((x,i)=>(i+1)+'º '+x.score+' pts').join(' · ')+(report.dailyWon?' · ✨ DESAFÍO DIARIO COMPLETADO':'');
 }
 const title=game.lives<=0?'¡CAÍSTE EN COMBATE!':'¡INVASIÓN CONTENIDA!';
 $('outcome').textContent=title;
 $('summary').textContent=(improved?'🏆 ¡NUEVO RÉCORD! · ':'')+G.MODES[game.mode].label+' · '+Math.round(game.elapsed)+' s'+(online?' · SALA BETA':'');
 $('resultStats').replaceChildren();
 for(const [name,value] of [['PUNTUACIÓN',game.score],['ROBOTS',game.kills],['PRECISIÓN',accuracy+'%'],['MEJOR RACHA',game.bestCombo],['OLEADA',game.wave],['RÉCORD ANTERIOR',record]]){
  const div=document.createElement('div');const label=document.createTextNode(name);const b=document.createElement('strong');b.textContent=value;div.append(label,b);$('resultStats').append(div);
 }
 visible('result',true);audio('finish');
}
function setPhase(next){
 stage=next;
 visible('calControls',next==='edit');visible('touch',next==='edit','block');
 visible('cellControls',next==='cell'||next==='sample'||next==='ready');
 visible('cellsvg',next==='edit'||next==='cell'||next==='sample','block');
 visible('manualPlace',next==='search'&&performance.now()-searchSince>1800,'block');
 visible('placementHelp',false);visible('healthTrack',['ready','countdown','playing','paused'].includes(next),'block');
 visible('combat',next==='playing');visible('reticle',next==='playing'||next==='countdown','block');
 visible('radarWrap',next==='playing'||next==='paused','block');visible('botGuide',next==='playing'||next==='paused','block');
 visible('pause',next==='playing'||next==='paused','block');visible('ammo',next==='playing','block');
 visible('actions',next==='paused');$('pause').textContent=next==='paused'?'▶ CONTINUAR':'Ⅱ PAUSA';
 $('topHud').style.display=['ready','countdown','playing','paused','finished'].includes(next)?'flex':'none';
 $('hint').style.display=['playing','finished'].includes(next)?'none':'block';
 if(next!=='playing')visible('warning',false);
}
function cameraXRView(frame){
 if(!frame||!space)return null;
 const pose=frame.getViewerPose(space);
 // Android ARCore may keep a valid orientation while position is EMULATED.
 // Treat it as limited tracking instead of losing the entire camera/view.
 return pose||null;
}
function getHit(frame){
 if(!hitSource||!space)return null;
 const hits=frame.getHitTestResults(hitSource);
 if(!hits?.length)return null;
 for(const result of hits){
  const pose=result.getPose(space);if(!pose)continue;
  const normal=new THREE.Vector3(0,1,0).applyQuaternion(new THREE.Quaternion(
   pose.transform.orientation.x,pose.transform.orientation.y,pose.transform.orientation.z,pose.transform.orientation.w));
  if(normal.y<.65)continue;
  return {pose,result};
 }
 return null;
}
function newPreview(pose){
 const p=pose.transform.position,q=pose.transform.orientation;
 basePos.set(p.x,p.y,p.z);
 // The hit-test rotation may contain pitch/roll; force the square HORIZONTAL.
 // Copy yaw only, never tilt the floor along with the camera/plane estimate.
 const orientation=new THREE.Quaternion(q.x,q.y,q.z,q.w).normalize();
 const facing=new THREE.Vector3(0,0,-1).applyQuaternion(orientation);facing.y=0;
 const heading=facing.lengthSq()>.001?Math.atan2(-facing.x,-facing.z):0;
 baseQ.setFromAxisAngle(THREEVec(0,1,0),heading);
 shift.set(0,0,0);yaw=0;stage='edit';
 $('size').textContent=floorSize.toFixed(2).replace('.',',')+' m';
 setPhase('edit');worldForEditor();hint('MIRÁ LA CUADRÍCULA TURQUESA · ARRASTRÁ, PELLIZCÁ Y GIRÁ');
}
function placeFromCurrentView(){
 if(!xrSession||!lastXRFrame)return false;
 const h=getHit(lastXRFrame);
 if(h){hit=h.result;newPreview(h.pose);notice('✅ PISO DETECTADO · AJUSTÁ LA PISTA',2);return true}
 const pose=cameraXRView(lastXRFrame);
 if(!pose)return false;
 const p=pose.transform.position,q=pose.transform.orientation;
 const aim=THREEVec(0,0,-1).applyQuaternion(new THREE.Quaternion(q.x,q.y,q.z,q.w));
 const floorY=p.y-1.45;
 // Manual approximation when ARCore hit-test does not deliver a floor.
 // Intersect a downward-looking ray; otherwise use a short forward offset.
 const dist=aim.y<-.15?clamp((floorY-p.y)/aim.y,.65,2.3):1.4;
 let dx=aim.x*dist,dz=aim.z*dist;
 if(Math.hypot(dx,dz)<.45){const forward=THREEVec(aim.x,0,aim.z).normalize();dx=forward.x*.75;dz=forward.z*.75}
 hit=null;
 newPreview({transform:{position:{x:p.x+dx,y:floorY,z:p.z+dz},orientation:q}});
 notice('📍 POSICIÓN APROXIMADA · AJUSTÁ Y CENTRÁ EL PISO',3);
 return true;
}
function worldForEditor(){
 art.root.position.copy(basePos).add(shift.clone().applyQuaternion(baseQ));
 art.root.quaternion.copy(baseQ).multiply(quaternionY.setFromAxisAngle(new THREE.Vector3(0,1,0),yaw));
}
function freezeEditor(){
 if(stage!=='edit')return;
 fixedPos.copy(art.root.position);fixedQ.copy(art.root.quaternion);art.root.updateMatrixWorld(true);
 setPhase('cell');selected=-1;calibrated=false;
 art.setFloor(floorSize,true,-1);
 hint('👣 TOCÁ EN EL PISO LA CELDA DONDE ESTÁS PARADO');
 $('begin').disabled=true;
 // Spatial anchoring must be requested during an active XRFrame.
 anchorPending=true;
}
function resetEditor(fromGame=false){
 if(!xrSession)return;
 if(fromGame){pausedForCalibration=game.phase==='playing';game.paused=true;}
 anchor?.delete?.();anchor=null;anchorOffset=null;anchorPending=false;
 basePos.copy(art.root.position);baseQ.copy(art.root.quaternion);shift.set(0,0,0);yaw=0;
 selected=-1;calibrated=false;calSamples=[];setPhase('edit');
 $('result').style.display='none';
 hint('REUBICÁ LA PISTA · EL JUEGO ESTÁ PAUSADO');
}
function prepareCell(){
 selected=-1;calibrated=false;calSamples=[];calStart=0;
 setPhase('cell');$('begin').disabled=true;$('calfill').style.width='0%';
 hint('👣 ELEGÍ LA CELDA REAL BAJO TUS PIES');
}
function chooseCell(i){
 if(stage!=='cell'||i<0||i>24)return;
 selected=i;calibrated=false;calStart=0;calSamples=[];
 setPhase('sample');
 hint('📍 CELDA '+(Math.floor(i/5)+1)+'-'+(i%5+1)+' · SOSTENÉ EL CELULAR QUIETO 1 SEGUNDO');
 $('begin').disabled=true;$('calfill').style.width='0%';vib(24);
}
function samplePose(t,pose){
 if(stage!=='sample'||selected<0||!pose)return;
 const p=pose.transform.position;
 const local=art.root.worldToLocal(THREEVec(p.x,p.y,p.z));
 if(!calStart)calStart=t;
 calSamples.push({x:local.x,z:local.z});
 if(calSamples.length>70)calSamples.shift();
 const minX=Math.min(...calSamples.map(x=>x.x)),maxX=Math.max(...calSamples.map(x=>x.x));
 const minZ=Math.min(...calSamples.map(x=>x.z)),maxZ=Math.max(...calSamples.map(x=>x.z));
 if(maxX-minX>.075||maxZ-minZ>.075){calStart=t;calSamples=calSamples.slice(-3)}
 $('calfill').style.width=(clamp((t-calStart)/1000,0,1)*100).toFixed(0)+'%';
 if(t-calStart<1000||calSamples.length<10)return;
 const px=calSamples.reduce((s,p)=>s+p.x,0)/calSamples.length;
 const pz=calSamples.reduce((s,p)=>s+p.z,0)/calSamples.length;
 const pitch=floorSize/5;
 const chosen=THREEVec((selected%5-2)*pitch,0,(Math.floor(selected/5)-2)*pitch);
 calOffset.set(chosen.x-px,0,chosen.z-pz);playerPos.copy(chosen);
 G.movePlayer(game,{x:chosen.x,z:chosen.z});
 calibrated=true;
 setPhase('ready');$('begin').disabled=false;
 hint('✅ LISTO · EL PUNTO YO SIGUE LA POSICIÓN DEL CELULAR');
 notice('📍 CELDA CALIBRADA',1.5);vib(45);
 if(pausedForCalibration){game.paused=true;$('begin').textContent='▶ REANUDAR COMBATE'}else $('begin').textContent='▶ ¡DEFENDERME!';
}
function drawCells(frame){
 const svg=$('cellsvg'),edit=stage==='edit',choosing=stage==='cell'||stage==='sample';
 if(!edit&&!choosing){svg.replaceChildren();gridVisible=0;return}
 // XRView's own projection/view matrices are authoritative in immersive AR.
 // renderer.xr.getCamera can be one frame behind renderer.render().
 const view=frame&&space?frame.getViewerPose(space)?.views?.[0]:null;
 let viewProjection=null;
 if(view?.projectionMatrix&&view.transform?.inverse?.matrix){
  const projection=new THREE.Matrix4().fromArray(view.projectionMatrix);
  const viewMatrix=new THREE.Matrix4().fromArray(view.transform.inverse.matrix);
  viewProjection=projection.multiply(viewMatrix);
 }
 const xrCam=renderer.xr.getCamera(camera),eye=xrCam?.cameras?.[0]||xrCam;
 if(!viewProjection&&!eye)return;
 art.root.updateMatrixWorld(true);
 if(!viewProjection)eye.updateMatrixWorld(true);
 svg.setAttribute('viewBox','0 0 '+innerWidth+' '+innerHeight);
 if(svg.children.length!==25){
  svg.replaceChildren();
  for(let i=0;i<25;i++){
   const poly=document.createElementNS('http://www.w3.org/2000/svg','polygon');
   poly.setAttribute('stroke','#bbffef');poly.setAttribute('stroke-width','2.4');
   poly.setAttribute('stroke-linejoin','round');
   poly.style.cursor='pointer';poly.style.pointerEvents='all';
   poly.addEventListener('pointerdown',ev=>{ev.preventDefault();ev.stopPropagation();chooseCell(i)});
   svg.appendChild(poly);
  }
 }
 const pitch=floorSize/5,half=pitch*.46;
 let seen=0;
 for(let i=0;i<25;i++){
  const x=(i%5-2)*pitch,z=(Math.floor(i/5)-2)*pitch;
  const corners=[[x-half,.06,z-half],[x+half,.06,z-half],[x+half,.06,z+half],[x-half,.06,z+half]];
  let inside=0;
  const coords=corners.map(([a,b,c])=>{
   const w=THREEVec(a,b,c).applyMatrix4(art.root.matrixWorld);
   const v=viewProjection?w.applyMatrix4(viewProjection):w.project(eye);
   if(!Number.isFinite(v.x)||!Number.isFinite(v.y)||!Number.isFinite(v.z)||v.z<=-1||v.z>=1)return null;
   if(Math.abs(v.x)<=1&&Math.abs(v.y)<=1)inside++;
   return ((v.x+1)*innerWidth/2).toFixed(1)+','+((1-v.y)*innerHeight/2).toFixed(1);
  });
  const poly=svg.children[i],projected=coords.every(Boolean);
  poly.style.display=projected?'block':'none';
  if(projected){
   poly.setAttribute('points',coords.join(' '));
   if(inside)seen++;
  }
  poly.setAttribute('fill',i===selected?'#9effe6e8':(edit?(i%2?'#20c8f09c':'#14ffcf91'):'#50ffe87d'));
  poly.setAttribute('stroke',i===selected?'#fff5b7':'#c7fff2');
  poly.style.pointerEvents=stage==='cell'?'all':'none';
 }
 gridVisible=seen;
 svg.style.pointerEvents=stage==='cell'?'auto':'none';
 const help=$('placementHelp');
 if(edit&&seen===0){
  help.textContent='⚠ NO SE VE LA PISTA · APUNTÁ MÁS ABAJO O TOCÁ «CENTRAR EN EL PISO»';
  visible('placementHelp',true,'block');
 }else visible('placementHelp',false);
}
function updateMotion(t,pose){
 if(!calibrated||!pose||pose.emulatedPosition===true)return;
 const p=pose.transform.position;
 const local=art.root.worldToLocal(THREEVec(p.x,p.y,p.z));
 const next=THREEVec(local.x+calOffset.x,0,local.z+calOffset.z);
 if(!Number.isFinite(next.x)||!Number.isFinite(next.z))return;
 if(Math.hypot(next.x-game.player.x,next.z-game.player.z)>1.45&&stage==='playing'){
  game.paused=true;setPhase('paused');notice('CAMBIO BRUSCO DE POSICIÓN · RECALIBRÁ',3);return;
 }
 if(stage==='playing'&&(Math.abs(next.x)>floorSize*.5+.35||Math.abs(next.z)>floorSize*.5+.35)){
   game.paused=true;setPhase('paused');hint('VOLVÉ A LA ZONA DESPEJADA · SIN CORRER');
   notice('⚠ FUERA DE LA ARENA SEGURA · RECALIBRÁ',3);return;
  }
  playerPos.lerp(next,.32);
 G.movePlayer(game,{x:playerPos.x,z:playerPos.z});lastTracked=t;
}
function countdownBegin(){
 if(stage!=='ready'||!calibrated)return;
 if(pausedForCalibration){pausedForCalibration=false;game.paused=false;setPhase('playing');return}
 if(online&&online.room?.status!=='playing'){notice('LA SALA AÚN NO COMENZÓ · INICIÁ DESDE SALAS',3);return}
 countdown=3;setPhase('countdown');audio('reload');hint('PREPARATE · ROBOTS EN 360°');
}
function spawnOpeningEnemies(){
 if(initialBotsSpawned||online&&!online.isHost)return;
 initialBotsSpawned=true;
 // Begin with actual life-size Three.js robots directly in front of the player's
 // physical phone instead of random 360-degree sectors. All subsequent waves
 // spawn normally; robots stay in arena/world space, NOT fixed to the HUD.
 const pose=xrSession&&lastXRFrame&&space?lastXRFrame.getViewerPose(space):null;
 let direction=THREEVec(0,0,-1);
 if(pose?.transform?.orientation){
  const q=pose.transform.orientation;
  direction.applyQuaternion(new THREE.Quaternion(q.x,q.y,q.z,q.w));
 }else if(demo){camera.getWorldDirection(direction)}
 direction.y=0;
 if(direction.lengthSq()<.01)direction.set(0,0,-1);
 direction.normalize().applyQuaternion(art.root.quaternion.clone().invert());
 direction.y=0;direction.normalize();
 // Calibration maps the LOGICAL player to their selected tile, but it can
 // differ from the actual physical XR eye by 0.5–1m. Always stage opening
 // robots from the real phone pose, so they appear centered at 3.15m, not
 // 3.15m from a virtual cell that might be behind the camera.
 art.root.updateMatrixWorld(true);
 const eyeWorld=pose?.transform?.position?
  THREEVec(pose.transform.position.x,pose.transform.position.y,pose.transform.position.z):
  demo?camera.getWorldPosition(new THREE.Vector3()):art.root.localToWorld(THREEVec(game.player.x,1.55,game.player.z));
 const eyeLocal=art.root.worldToLocal(eyeWorld);
 openingEyePosition={x:eyeLocal.x,z:eyeLocal.z};
 const sideways=THREEVec(-direction.z,0,direction.x);
 // The first 1.75m humanoid is 3.15m ahead, not 1.65m inside the phone.
 // The second starts diagonal 3.65m away; neither follows the screen.
 for(const slot of [{distance:3.15,lateral:0},{distance:3.65,lateral:.86}]){
  const e=G.spawn(game,'basic');
  if(!e)continue;
  e.x=eyeLocal.x+direction.x*slot.distance+sideways.x*slot.lateral;
  e.z=eyeLocal.z+direction.z*slot.distance+sideways.z*slot.lateral;
  e.angle=Math.atan2(eyeLocal.x-e.x,eyeLocal.z-e.z);
  e.portal=0;e.age=.72;e.stun=2;e.state='stunned';
 }
 art.drawEnemies(game);
}
function startRound(){
 G.begin(game);game.paused=false;
 spawnOpeningEnemies();
 trackingLostSince=0;lastTracked=performance.now();
 setPhase('playing');hint('');
 notice('🤖 ROBOTS A 3 METROS · ¡APUNTÁ A LA CABEZA O AL PECHO!',3);audio('danger');vib(70);
}
function pause(){
 if(stage==='playing'){game.paused=true;setPhase('paused');hint('PAUSA · RECALIBRAR O CONTINUAR')}
 else if(stage==='paused'){if(!calibrated)return;game.paused=false;setPhase('playing')}
}
// XRFrame#getViewerPose() is legal ONLY during the native XR animation frame.
 // Android ARCore invalidates XRFrame as soon as requestAnimationFrame returns.
 // Pointer/click handlers MUST consume a cloned world-space aim ray instead.
 let latestAim=null,lastAimStamp=0,aimFailures=0,lastShotStatus='';
 function cacheLiveAim(frame,t){
  if(!xrSession||!frame||!space)return;
  try{
   const pose=frame.getViewerPose(space);
   if(!pose)return;
   art.root.updateMatrixWorld(true);
   const p=pose.transform.position,q=pose.transform.orientation;
   const origin=THREEVec(p.x,p.y,p.z);
   const dir=THREEVec(0,0,-1).applyQuaternion(new THREE.Quaternion(q.x,q.y,q.z,q.w));
   const localOrigin=art.root.worldToLocal(origin);
   const localDirection=dir.applyQuaternion(art.root.quaternion.clone().invert()).normalize();
   if([localOrigin.x,localOrigin.y,localOrigin.z,localDirection.x,localDirection.y,localDirection.z].every(Number.isFinite)){
    latestAim={
     origin:{x:localOrigin.x,y:localOrigin.y,z:localOrigin.z},
     direction:{x:localDirection.x,y:localDirection.y,z:localDirection.z}
    };
    lastAimStamp=performance.now();
   }
  }catch(err){
   aimFailures++;
   if(aimFailures%180===1)console.warn('RODEADOS: no se pudo muestrear mira XR en fotograma activo',err);
  }
 }
 function activeRay(){
 if(stage!=='playing')return null;
 art.root.updateMatrixWorld(true);
 if(demo){
  camera.updateMatrixWorld(true);
  const pos=new THREE.Vector3(),dir=new THREE.Vector3();
  camera.getWorldPosition(pos);camera.getWorldDirection(dir);
  return {origin:art.root.worldToLocal(pos),direction:dir.applyQuaternion(art.root.quaternion.clone().invert()).normalize()};
 }
 // An XRFrame is ONLY valid during XRAnimationFrame, never inside pointerdown.
 if(!latestAim||performance.now()-lastAimStamp>1200)return null;
 return {
  origin:THREEVec(latestAim.origin.x,latestAim.origin.y,latestAim.origin.z),
  direction:THREEVec(latestAim.direction.x,latestAim.direction.y,latestAim.direction.z)
 };
}
let lastXRFrame=null,lastShot=0,shotSeq=0;
async function shoot(){
 if(stage!=='playing'||game.paused||performance.now()-lastShot<175)return;
const ray=activeRay();
 if(!ray){
  lastShotStatus='SIN MIRA XR';
  notice('🎯 RECUPERANDO MIRA · MOVÉ LENTAMENTE EL CELULAR',1.6);
  vib(25);return;
 }
 lastShot=performance.now();
 const packet={origin:{x:ray.origin.x,y:ray.origin.y,z:ray.origin.z},direction:{x:ray.direction.x,y:ray.direction.y,z:ray.direction.z}};
 // A guest sends a ray to the host; only the host's simulation mutates damage/score.
 if(online&&!online.isHost){if(!online.conn?.connected){notice('SIN CONEXIÓN · DISPARO NO CONFIRMADO',1);return}
  try{await online.conn.sendGameEvent({kind:'shot',ray:packet,seq:++shotSeq})}catch(e){notice('DISPARO NO SINCRONIZADO',1)}
  art.drawShot(packet,7,false);
 fireFlash=.09;audio('shot');vib(20);return;
 }
 const preHit=G.rayHit(game,packet.origin,packet.direction);
 const r=G.fire(game,packet,online?.id||'vos');
 if(!r.ok){
  lastShotStatus='BLOQUEADO: '+(r.reason||'');
  if(r.reason==='sin_municion')notice('MUNICIÓN ILIMITADA · REINTENTÁ',1);
  else notice('DISPARO BLOQUEADO · '+(r.reason||'REINTENTÁ'),1);
  return;
 }
 lastShotStatus=r.hit?'IMPACTO':'DISPARO';
 art.drawShot(packet,preHit?.distance??7,r.hit);
 const shotPulse=$('shotPulse');
 shotPulse.classList.remove('boom');void shotPulse.offsetWidth;shotPulse.classList.add('boom');
 updateHud();
 fireFlash=.09;crossUntil=r.hit?performance.now()+190:0;audio(r.hit?'hit':'shot');vib(r.hit?35:19);
 if(r.hit){
  missStreak=0;
  if(r.part==='head'){
   const streak=r.headshotStreak>=3?' · RACHA x'+r.headshotStreak:'';
   notice((r.killed?'💥 HEADSHOT LETAL':'🎯 HEADSHOT')+streak+' · +'+r.points+' PTS',1.05);
   $('waveBanner').textContent=r.killed?'🎯 ¡PRECISIÓN LETAL! +'+r.points:'🎯 HEADSHOT +'+r.points;
   waveUntil=performance.now()+850;vib([24,12,35]);
  }else notice('⚡ '+(r.part==='legs'?'PIERNAS':'CUERPO')+' · +'+r.points,0.6);
 }
 else{missStreak++;if(missStreak>=3&&performance.now()-lastLaugh>2300){lastLaugh=performance.now();
  const joker=game.enemies.find(e=>e.type==='joker');
  if(joker){joker.taunt+=1;audio('laugh',{x:joker.x,z:joker.z});notice('🤖 EL BURLÓN SE ESTÁ RIENDO DE VOS',1.3)}
 }}
 if(online)sendSnapshot(true);
}
function reload(){/* Sin cargadores: arma de energía infinita. */}
function bombCaos(){
 if(stage!=='playing'||game.paused)return;
 if(game.bombCharges<=0){notice('💣 BOMBA CARGANDO · '+Math.ceil(game.bombCooldown)+'s',1.2);return}
 const ray=activeRay();
 if(!ray){notice('🎯 APUNTÁ CON LA CÁMARA PARA LANZAR',1.4);return}
 // Three meters forward in the plane of the CALIBRATED arena, not at the sky.
 const flat=Math.hypot(ray.direction.x,ray.direction.z);
 if(flat<.12){notice('🎯 APUNTÁ AL FRENTE PARA LANZAR',1);return}
 const center={x:ray.origin.x+ray.direction.x/flat*3.35,
  z:ray.origin.z+ray.direction.z/flat*3.35};
 if(online&&!online.isHost){
  if(!online.conn?.connected){notice('BOMBA SIN CONEXIÓN · INTENTÁ DE NUEVO',1.8);return}
  online.conn.sendGameEvent({kind:'bomb',target:center,seq:++shotSeq}).catch(()=>notice('BOMBA NO SINCRONIZADA',1.5));
  notice('💣 BOMBA PEDIDA AL ANFITRIÓN',1.2);return;
 }
 const out=G.throwBomb(game,center,online?.id||'vos');
 if(!out.ok){notice('BOMBA: '+out.reason,1);return}
 audio('throw');vib([35,25,35]);updateHud();
 notice('💣 BOMBA CAOS · ¡CUBRÍ LA ZONA!',.9);
 if(online)sendSnapshot(true);
}
function special(){if(stage!=='playing')return;
 if(online&&!online.isHost){online.conn?.sendGameEvent({kind:'pulse',seq:++shotSeq}).catch(()=>{});return}
 if(G.pulse(game)){audio('danger');vib(75);notice('⚡ PULSO ELECTROMAGNÉTICO',1);if(online)sendSnapshot(true)}}
function snapshot(){
 return {kind:'state',stamp:++online.seq,seed:game.seed,mode:game.mode,arena:game.arena,
  at:game.elapsed,hp:Math.round(game.lives*10)/10,wave:game.wave,score:game.score,
  ammo:game.mag,reload:0,infiniteAmmo:true,special:+game.skillCooldown.toFixed(1),
  bomb:[game.bombCharges,+game.bombCooldown.toFixed(2),game.bombKillsAt,game.bombsUsed,game.bombHits],
  pendingBombs:game.bombs.map(b=>[+b.x.toFixed(2),+b.z.toFixed(2),+b.fromX.toFixed(2),+b.fromZ.toFixed(2),+b.fuse.toFixed(2)]),
  bombBlast:game.fx.filter(f=>f.type==='bombBlast').slice(-1).map(f=>[f.x,f.z,f.radius,f.hits,f.kills,f.points,f.t]),
  kills:game.kills,hits:game.hits,shots:game.shots,combo:game.combo,best:game.bestCombo,
  headshots:game.headshots,headshotStreak:game.headshotStreak,bestHeadshotStreak:game.bestHeadshotStreak,
  floorDamage:game.floorDamage.map(v=>Math.round(v*100)/100),
  floorHeat:game.floorHeat.map(t=>t<0?-100:Math.round(t*10)/10),
  phase:game.phase,
  scores:game.scores,peers:Object.entries(game.peerWeapons).map(([id,w])=>[id,game.mag,0]),
  e:game.enemies.map(e=>[e.id,e.type,+e.x.toFixed(2),+e.z.toFixed(2),e.hp,e.maxHp,+e.age.toFixed(1),e.state,+e.portal.toFixed(2),+e.angle.toFixed(2),+e.stun.toFixed(2),+e.lastHit.toFixed(1)])};
}
async function sendSnapshot(urgent=false){
 if(!online?.isHost||!online.conn?.connected)return;
 if(!urgent&&performance.now()-lastSnapshot<280)return;
 lastSnapshot=performance.now();try{await online.conn.sendGameEvent(snapshot())}catch(e){online.status='RECONECTANDO';}
}
function applySnapshot(data){
 if(!data||!Array.isArray(data.e)||data.e.length>16||data.stamp<=online.seq)return;
 online.seq=data.stamp;
 const validNumber=n=>typeof n==='number'&&Number.isFinite(n);
 if(![data.at,data.hp,data.score,data.arena].every(validNumber))return;
 if(data.seed!==game.seed||data.mode!==game.mode)game=G.create({seed:data.seed,mode:data.mode,arena:data.arena,ownerId:online.room.hostUserId});
 game.elapsed=clamp(data.at,0,999999);game.lives=clamp(data.hp,0,100);game.wave=data.wave||1;
 game.score=Math.max(0,data.score||0);game.ammo=game.mag;
 game.reload=0;game.ammo=game.mag;game.infiniteAmmo=true;game.skillCooldown=data.special||0;game.kills=data.kills||0;
 if(Array.isArray(data.bomb)&&data.bomb.length===5&&data.bomb.every(Number.isFinite)){
  game.bombCharges=clamp(data.bomb[0],0,1);game.bombCooldown=clamp(data.bomb[1],0,32);
  game.bombKillsAt=data.bomb[2];game.bombsUsed=data.bomb[3];game.bombHits=data.bomb[4];
 }
 game.bombs=Array.isArray(data.pendingBombs)?data.pendingBombs.slice(0,1).filter(a=>Array.isArray(a)&&a.length===5&&a.every(Number.isFinite))
  .map(a=>({x:a[0],z:a[1],fromX:a[2],fromZ:a[3],fuse:a[4]})):[];
 if(Array.isArray(data.bombBlast))for(const a of data.bombBlast){
  if(Array.isArray(a)&&a.length===7&&a.every(Number.isFinite)&&Math.abs(a[0])<10&&Math.abs(a[1])<10
   &&!game.fx.some(f=>f.type==='bombBlast'&&f.t===a[6])){
   game.fx.push({type:'bombBlast',x:a[0],z:a[1],radius:a[2],hits:a[3],kills:a[4],points:a[5],t:a[6]});
  }
 }
 game.fx=game.fx.filter(f=>game.elapsed-f.t<1.1);
 game.shots=data.shots||0;game.hits=data.hits||0;game.combo=data.combo||0;game.bestCombo=data.best||0;
 game.headshots=Math.max(0,Math.floor(data.headshots||0));
 game.headshotStreak=Math.max(0,Math.floor(data.headshotStreak||0));
 game.bestHeadshotStreak=Math.max(0,Math.floor(data.bestHeadshotStreak||0));
 if(Array.isArray(data.floorDamage)&&data.floorDamage.length===25&&data.floorDamage.every(validNumber))
  game.floorDamage=data.floorDamage.map(v=>clamp(v,0,1));
 if(Array.isArray(data.floorHeat)&&data.floorHeat.length===25&&data.floorHeat.every(validNumber))
  game.floorHeat=data.floorHeat.map(v=>clamp(v,-100,game.elapsed));
 game.phase=data.phase||'ready';game.scores=data.scores&&typeof data.scores==='object'?data.scores:{};
 if(Array.isArray(data.peers)){
  game.peerWeapons=Object.create(null);
  for(const p of data.peers){
   if(!Array.isArray(p)||p.length!==3||typeof p[0]!=='string'||!(/^[0-9a-f-]{36}$/i.test(p[0]))||!Number.isFinite(p[1])||!Number.isFinite(p[2]))continue;
   game.peerWeapons[p[0]]={ammo:game.mag,reload:0,lastFire:-100};
  }
 }
 game.enemies=data.e.filter(a=>Array.isArray(a)&&a.length>=12&&G.TYPES[a[1]]&&a.slice(2).every(validNumberOrString))
  .map(a=>({id:a[0],type:a[1],x:a[2],z:a[3],hp:a[4],maxHp:a[5],age:a[6],state:a[7],
   portal:a[8],angle:a[9],stun:a[10],lastHit:a[11],radius:G.TYPES[a[1]].radius,height:G.TYPES[a[1]].height,taunt:0,phase:0}));
 if(data.phase==='finished'&&stage==='playing')result();
}
function validNumberOrString(n){return typeof n==='string'||Number.isFinite(n)}
function onOnlineEvent(payload){
 if(!online||!payload||!online.room?.players?.some(p=>p.userId===payload.userId))return;
 if(payload.kind==='state'){
  if(payload.userId!==online.room.hostUserId||online.isHost)return;
  applySnapshot(payload);
  online.status='SINCRONIZADO';return;
 }
 if(!online.isHost||payload.userId===online.id||game.phase!=='playing')return;
 const peer=payload.userId;
 const seq=Number(payload.seq);
 if(!Number.isSafeInteger(seq)||seq<1||seq<=(online.lastPeerSeq[peer]||0))return;
 online.lastPeerSeq[peer]=seq;
 if(payload.kind==='shot'){
  const ray=payload.ray;
  if(!ray?.origin||!ray?.direction)return;
  const p=ray.origin;if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(p.z))return;
  if(Math.abs(p.x)>game.arena||Math.abs(p.z)>game.arena||p.y<.7||p.y>2.4)return;
  G.fire(game,ray,peer);sendSnapshot(true);
 }
 else if(payload.kind==='pulse'){G.pulse(game);sendSnapshot(true)}
 else if(payload.kind==='bomb'){
  const target=payload.target;
  if(target&&Number.isFinite(target.x)&&Number.isFinite(target.z))G.throwBomb(game,target,peer);
  sendSnapshot(true);
 }
}
async function connectOnline(){
 if(onlineBusy||!(/^[A-F0-9]{8}$/.test(onlineRoomCode)))return;
 onlineBusy=true;
 visible('online',true,'block');$('online').textContent='SALA · CONECTANDO';
 try{
  const config=globalThis.ModoCaosConfig;
  if(!config?.url||!config.publishableKey||!globalThis.ModoCaosRooms)throw Error('Configuración de sala ausente');
  const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.91.0/+esm');
  const supabase=createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const mc=globalThis.ModoCaosRooms.createClient(supabase);
  const resumed=await mc.resumeRoom(onlineRoomCode);
  if(!resumed?.room_id)throw Error('Esta sesión no pertenece a la sala · entrá desde el lobby');
  const room=await mc.getRoom(resumed.room_id);
  if(room.game!=='rodeados-360')throw Error('La sala pertenece a otro juego');
  const id=await mc.userId(),isHost=id===room.hostUserId;
  game.ownerId=room.hostUserId;
  online={mc,id,room,isHost,status:'CONECTANDO',mode:'COOP/PUNTOS',seq:0,lastPeerSeq:{},seed:game.seed,conn:null};
  online.conn=await mc.connectRoom(room.id,{onGameEvent:onOnlineEvent,
   onStatus:(s)=>{online.status=s==='SUBSCRIBED'?'CONECTADO':s},
   onRefresh:async()=>{try{online.room=await mc.getRoom(room.id)}catch(_){}}
  });
  // Members follow the host's timeline; joining never fabricates a locally authoritative match.
  roomTimer=setInterval(async()=>{
   if(!online||document.hidden)return;
   try{online.room=await mc.getRoom(room.id);if(online.room.status==='finished'&&stage==='playing')G.finish(game,'sala_finalizada');}
   catch(e){online.status='SIN RED';}
  },3700);
  notice('SALA '+onlineRoomCode+' · '+(isHost?'CONTROL DEL ANFITRIÓN':'ESPERANDO HOST'),2);
 }catch(e){
  $('online').textContent='SALA NO DISPONIBLE · VOLVÉ AL LOBBY';
  notice('ONLINE: '+(e?.message||e),6);
 }finally{onlineBusy=false}
}
function updateOnlineStart(){
 if(!online||stage!=='ready')return;
 if(online.room?.status==='playing')$('begin').disabled=!calibrated;
}
function tickGame(dt,t){
 if(stage==='countdown'){
  countdown-=dt;hint('¡EMPEZAMOS EN '+Math.max(1,Math.ceil(countdown))+'!');
  if(countdown<=0)startRound();
 }
 if(stage!=='playing')return;
 if(demo||!online||online.isHost){
  G.advance(game,dt);
 } // guests render only host snapshots (no locally simulated hits, score or spawns)
 fireFlash=Math.max(0,fireFlash-dt);
 if(game.phase==='finished'){result();return}
 updateBattleFeedback(t);
 const blast=game.fx.findLast?.(f=>f.type==='bombBlast');
 if(blast){
  const key=blast.t+':'+blast.x+':'+blast.z;
  if(key!==lastBlastSignal){
   lastBlastSignal=key;audio('blast');vib([95,45,95]);
   $('waveBanner').textContent='💥 BOMBA CAOS · '+blast.hits+' ALCANZADOS · '+blast.kills+' DESTRUIDOS';
   waveUntil=performance.now()+1650;
   updateHud();
  }
 }
 art.effect(game,fxShown);art.drawBombs(game);art.updateSparks(dt);
 if(online?.isHost)sendSnapshot();
 if(game.lastDamage>0&&game.elapsed-game.lastDamage<.13){vib(38)}
 if(t-lastHud>110){lastHud=t;updateHud()}
 if(t-lastPing>1100){
  lastPing=t;
  const closest=game.enemies.filter(e=>e.portal<.05).sort((a,b)=>Math.hypot(a.x-game.player.x,a.z-game.player.z)-Math.hypot(b.x-game.player.x,b.z-game.player.z))[0];
  if(closest&&Math.hypot(closest.x-game.player.x,closest.z-game.player.z)<3.3&&t-lastMenaceAt>6100){
   lastMenaceAt=t;audio('menace',closest);
  }
  renderThreats();showBotDirection();
 }
}
function animate(t,frame){
 const dt=Math.min(.05,lastTime?Math.max(0,(t-lastTime)/1000):.016);lastTime=t;
 if(xrSession){
  lastXRFrame=frame;
  const pose=cameraXRView(frame);
  trackingValid=!!pose;
  if(anchorPending){
    anchorPending=false;
    const position=fixedPos.clone(),rotation=fixedQ.clone();
    let pending=null;
    if(typeof frame.createAnchor==='function'&&typeof XRRigidTransform!=='undefined'){
     try{pending=frame.createAnchor(new XRRigidTransform(
      {x:position.x,y:position.y,z:position.z},
      {x:rotation.x,y:rotation.y,z:rotation.z,w:rotation.w}
     ),renderer.xr.getReferenceSpace())}catch(_){}
    }
    if(!pending){
     const currentHit=getHit(frame)?.result;
     if(typeof currentHit?.createAnchor==='function')pending=currentHit.createAnchor();
    }
    if(pending)Promise.resolve(pending).then(a=>{
     if(!xrSession||stage==='home'||stage==='search'||stage==='edit'){a.delete?.();return}
     anchor?.delete?.();anchor=a;anchorOffset=null;
    }).catch(()=>{});
   }
   if(stage==='search'||stage==='edit'){
   if(stage==='search'){
    const h=getHit(frame);
    if(h){hit=h.result;newPreview(h.pose)}
    else if(t-searchSince>1800)visible('manualPlace',true,'block');
   }else{
    const h=getHit(frame);if(h)hit=h.result;
    worldForEditor();
   }
  }else if(anchor){
   const a=frame.getPose(anchor.anchorSpace,renderer.xr.getReferenceSpace());
   if(a){
    const mat=new THREE.Matrix4().fromArray(a.transform.matrix);
    if(!anchorOffset){art.root.updateMatrixWorld(true);anchorOffset=mat.clone().invert().multiply(art.root.matrixWorld)}
    const world=mat.multiply(anchorOffset);
    world.decompose(art.root.position,art.root.quaternion,tmpVec);
    fixedPos.copy(art.root.position);fixedQ.copy(art.root.quaternion);
   }
  }
  if(['edit','cell','sample','ready','playing','paused'].includes(stage)){
   if(stage==='sample')samplePose(t,pose);
   if(stage==='playing'||stage==='paused'||stage==='ready')updateMotion(t,pose);
   if(stage==='cell'||stage==='sample'||stage==='edit')drawCells(frame);
  }
  // Only a truly missing XR viewer pose blocks aiming. Position estimation alone
  // may degrade while the headset retains orientation; don't false-pause combat.
  if(stage==='playing'&&!pose){
   trackingLostSince||=t;
   if(t-trackingLostSince>4200){
    pausedByTracking=true;game.paused=true;setPhase('paused');
    hint('📡 SEGUIMIENTO TEMPORALMENTE PERDIDO · APUNTÁ A UNA SUPERFICIE ILUMINADA');
    notice('CÁMARA SIN SEGUIMIENTO · MOVER LENTAMENTE',3);
   }
  }else if(pose){
   trackingLostSince=0;
   if(pose.emulatedPosition===true&&stage==='playing'){
    limitedTrackingSince||=t;
    if(t-limitedTrackingSince>2000&&t-lastPing>1000)notice('📡 POSICIÓN LIMITADA · GIRÁ DESPACIO PARA RECUPERARLA',1.5);
   }else limitedTrackingSince=0;
   if(pausedByTracking&&stage==='paused'){
    pausedByTracking=false;game.paused=false;setPhase('playing');
    notice('✅ SEGUIMIENTO RECUPERADO · ¡CONTINUÁ DEFENDIÉNDOTE!',2);
   }
  }
 }else if(demo){
  camera.rotation.order='YXZ';camera.rotation.set(aimPitch,aimYaw,0,'YXZ');
  camera.position.set(0,1.59,0);
 }
 if(stage==='edit')art.setFloor(floorSize,true,selected);
 else art.setFloor(floorSize,stage==='cell'||stage==='sample',selected,calibrated?game.player:null);
 if(stage==='playing'||stage==='paused'||stage==='countdown'||stage==='ready')art.drawEnemies(game);
 if(stage==='paused'){drawRadar(t);if(t-lastPing>1200){lastPing=t;showBotDirection();}}
 // Sample the XR eye and reticle while XRFrame is active, after floor anchor updates.
 if(xrSession&&frame)cacheLiveAim(frame,t);
 tickGame(dt,t);
 art.setFloorDamage(game,stage==='edit'||stage==='cell'||stage==='sample'||stage==='search');
 if(stage==='playing')art.positionWeapon(xrSession?renderer.xr.getCamera(camera):camera,fireFlash>0);
 art.rifle.visible=stage==='playing';
 // Blackzone's Android fix: the native WebXR scene is intentionally EMPTY.
 // The world is drawn with tracked eye matrices into transparent DOM overlay.
 if(xrSession){
  renderer.render(nativeXRScene,camera);
  if(arCompositor){
   const ok=arCompositor.render(scene,renderer.xr.getCamera(camera));
   if(!ok&&stage==='playing'){game.paused=true;pausedByTracking=true;setPhase('paused');notice('ERROR DE RENDER 3D · RECALIBRÁ',3)}
  }
 }else renderer.render(scene,camera);
 if(stage==='search'&&t-lastHud>600){lastHud=t;hint('🔎 APUNTÁ AL PISO Y MOVÉ LENTAMENTE LA CÁMARA')}
 performanceFrames++;performanceTotal+=dt;
 if(performanceFrames>=150&&performanceTotal>0){
  const fps=performanceFrames/performanceTotal;
  // ARCore owns the immersive framebuffer; adapt resolution in demo only.
   if(!xrSession)renderer.setPixelRatio(Math.min(devicePixelRatio||1,fps<35?1.0:fps<48?1.2:1.5));
  performanceFrames=0;performanceTotal=0;
 }
 if(toastDeadline&&performance.now()>toastDeadline){$('notice').textContent='';toastDeadline=0}
}
renderer.setAnimationLoop(animate);
function adjustSize(amount){if(stage!=='edit')return;floorSize=clamp(floorSize+amount,1.8,3.7);$('size').textContent=floorSize.toFixed(2).replace('.',',')+' m'}
$('smaller').onclick=()=>adjustSize(-.15);$('larger').onclick=()=>adjustSize(.15);
$('turn').onclick=()=>{if(stage==='edit')yaw+=Math.PI/12};
$('touch').addEventListener('pointerdown',e=>{if(stage!=='edit')return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);
 pointer.set(e.pointerId,{x:e.clientX,y:e.clientY});lastPinch=null});
$('touch').addEventListener('pointermove',e=>{
 if(stage!=='edit'||!pointer.has(e.pointerId))return;e.preventDefault();
 const old=pointer.get(e.pointerId),dx=e.clientX-old.x,dy=e.clientY-old.y;
 pointer.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pointer.size===1){shift.x=clamp(shift.x+dx*.004,-3,3);shift.z=clamp(shift.z+dy*.004,-3,3)}
 else{
  const [a,b]=[...pointer.values()],dist=Math.hypot(a.x-b.x,a.y-b.y);
  const angle=Math.atan2(b.y-a.y,b.x-a.x);
  if(lastPinch){floorSize=clamp(floorSize*dist/Math.max(5,lastPinch.dist),1.8,3.7);
   let delta=angle-lastPinch.angle;if(delta>Math.PI)delta-=TAU;if(delta< -Math.PI)delta+=TAU;
   yaw+=delta;$('size').textContent=floorSize.toFixed(2).replace('.',',')+' m';
  }lastPinch={dist,angle};
 }
});
for(const name of ['pointerup','pointercancel','lostpointercapture'])$('touch').addEventListener(name,e=>{pointer.delete(e.pointerId);lastPinch=null});
$('overlay').addEventListener('beforexrselect',e=>e.preventDefault());
$('lock').onclick=freezeEditor;
$('refreshFloor').onclick=()=>{
 if(stage!=='edit')return;
 if(!placeFromCurrentView())notice('MOVÉ LA CÁMARA LENTAMENTE PARA RECUPERAR SEGUIMIENTO',2);
};
$('manualPlace').onclick=()=>{
 if(stage!=='search')return;
 if(!placeFromCurrentView())notice('NO HAY SEGUIMIENTO DEL CELULAR · MOVÉ LENTAMENTE',2);
};
$('center').onclick=()=>chooseCell(12);
$('changeCell').onclick=prepareCell;
$('begin').onclick=countdownBegin;
$('recal').onclick=()=>{resetEditor(true)};
$('pause').onclick=pause;
$('resume').onclick=pause;
// Blackzone Android: XR DOM Overlay can dispatch pointerdown without a
 // synthesized click. Fire from pointerdown, with click only as a fallback.
 $('fire').addEventListener('pointerdown',ev=>{
  ev.preventDefault();ev.stopPropagation();shoot();
 });
 $('fire').addEventListener('click',ev=>{ev.preventDefault();shoot()});

$('special').onclick=special;
$('bomb').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();bombCaos()});
$('bomb').addEventListener('click',e=>{e.preventDefault();bombCaos()});
$('sound').onclick=()=>{sounds=!sounds;$('sound').textContent=sounds?'🔊':'🔇'};
$('close').onclick=()=>{xrSession?.end?.().catch(()=>{});location.href='https://modo-caos-eta.vercel.app/'};
$('menu').onclick=()=>{xrSession?.end?.().catch(()=>{});location.href='https://modo-caos-eta.vercel.app/'};
$('reposition').onclick=()=>{if(demo){stage='home';$('overlay').style.display='none';$('home').style.display='block';return}
  resetEditor(false);$('result').style.display='none';setupGame(false);};
$('rematch').onclick=()=>{
 if(!calibrated&&!demo){resetEditor(false);return}
 setupGame(true);G.movePlayer(game,{x:playerPos.x,z:playerPos.z});
 game.phase='ready';
 if(demo){G.begin(game);setPhase('playing')}else{setPhase('ready');hint('✅ PISTA CONSERVADA · ¡REVANCHA!')}
};
$('share').onclick=async()=>{
 const title='¡RODEADOS 360! '+game.score+' puntos y '+game.kills+' robots derrotados. ¿Superás mi récord? '+location.origin+location.pathname;
 if(navigator.share)try{await navigator.share({text:title})}catch(_){}
 else if(navigator.clipboard)try{await navigator.clipboard.writeText(title);notice('¡RESULTADO COPIADO!',2)}catch(_){}
};
function beginDemo(){
 demo=true;setupGame(false);floorSize=2.6;game.arena=2.6;
 $('home').style.display='none';$('overlay').style.display='block';$('world').style.pointerEvents='auto';
 art.root.position.set(0,0,0);art.root.quaternion.identity();selected=12;
 calibrated=true;calOffset.set(0,0,0);G.movePlayer(game,{x:0,z:0});
 camera.position.set(0,1.59,0);aimYaw=0;aimPitch=0;camera.updateMatrixWorld(true);G.begin(game);spawnOpeningEnemies();setPhase('playing');
 notice('ARRASTRÁ PARA GIRAR LA CÁMARA Y APUNTAR · DISPARÁ',4);
}
$('startDemo').onclick=beginDemo;
let demoDown=null;
renderer.domElement.addEventListener('pointerdown',e=>{if(!demo)return;demoDown={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId)});
renderer.domElement.addEventListener('pointermove',e=>{if(!demo||!demoDown)return;
 aimYaw-=(e.clientX-demoDown.x)*.006;aimPitch=clamp(aimPitch-(e.clientY-demoDown.y)*.004,-.8,.65);
 demoDown={x:e.clientX,y:e.clientY};
});
for(const ev of ['pointerup','pointercancel'])renderer.domElement.addEventListener(ev,()=>{demoDown=null});
document.addEventListener('keydown',e=>{if(!demo)return;if(e.code==='Space'){e.preventDefault();shoot()}else if(e.key==='r')reload();else if(e.key==='Escape')pause()});
async function startXR(){
 if(!navigator.xr||!window.isSecureContext){$('support').textContent='Este navegador no ofrece WebXR. Usá Chrome Android con ARCore y HTTPS.';return}
 // requestSession must originate directly from the button event, before awaits.
 $('overlay').style.display='block';
 const pending=navigator.xr.requestSession('immersive-ar',{
  requiredFeatures:['hit-test','dom-overlay'],optionalFeatures:['anchors','local-floor'],domOverlay:{root:$('overlay')}});
 try{
  const session=await pending;xrSession=session;demo=false;
  $('home').style.display='none';$('overlay').style.display='block';
  await renderer.xr.setSession(session);
  space=renderer.xr.getReferenceSpace()||await session.requestReferenceSpace('local');
  const viewerSpace=await session.requestReferenceSpace('viewer');
  hitSource=await session.requestHitTestSource({space:viewerSpace});
  if(!openArWorld())throw Error('No se pudo crear el renderizador transparente de Blackzone');
  session.addEventListener('end',()=>{closeArWorld();xrSession=null;anchor?.delete?.();anchor=null;hitSource?.cancel?.();hitSource=null;space=null;
   setPhase('home');$('overlay').style.display='none';$('home').style.display='block';});
  setupGame(false);
  searchSince=performance.now();setPhase('search');hint('BUSCÁ EL PISO PARA COLOCAR LA ARENA');
  if(/^[A-F0-9]{8}$/.test(onlineRoomCode))connectOnline();
 }catch(e){
  $('support').textContent='No se pudo iniciar AR: '+(e?.message||e)+'. Probá el entrenamiento 3D.';
  $('overlay').style.display='none';$('home').style.display='block';
  closeArWorld();if(xrSession)try{await xrSession.end()}catch(_){}
 }
}
$('startAR').addEventListener('click',startXR);
if(navigator.xr&&window.isSecureContext){
 navigator.xr.isSessionSupported('immersive-ar').then(ok=>{$('support').textContent=ok?
 '✅ REALIDAD AUMENTADA DETECTADA · Despejá el espacio. No corras: el teléfono sigue al teléfono, no a tus pies.':
 '⚠ Este dispositivo no anuncia ARCore WebXR. Podés jugar el entrenamiento 3D.'}).catch(()=>{});
}
const old=Number(localStorage.getItem('mc-rodeados-record'))||0;
$('record').textContent='🏆 TU RÉCORD: '+old.toLocaleString('es-AR')+' PUNTOS';
const daily=globalThis.RodeadosProgress?.daily();
if(daily)$('daily').textContent='🎯 DESAFÍO DEL DÍA: '+daily.text;
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);arCompositor?.resize(innerWidth,innerHeight)});
globalThis.__RodeadosDebug={get stage(){return stage},get game(){return G.copy(game)},get floorSize(){return floorSize},
 get yaw(){return yaw},get editorShift(){return {x:shift.x,z:shift.z}},
 get floorTransform(){return {x:art.root.position.x,y:art.root.position.y,z:art.root.position.z,q:art.root.quaternion.toArray()}},
 get player(){return {x:game.player.x,z:game.player.z}},get enemyCount(){return game.enemies.length},get renderedRobots(){return art.robotCount()},get floorRendering(){return art.getFloorStatus()},get tracking(){return {pose:trackingValid,limited:limitedTrackingSince>0,pausedByTracking}},get initialBotsSpawned(){return initialBotsSpawned},get openingEyePosition(){return openingEyePosition},get lastShotAt(){return lastShot},get shotStatus(){return lastShotStatus},get aimAge(){return latestAim?performance.now()-lastAimStamp:null},get aim(){return latestAim},get aimFailures(){return aimFailures},
 get compositorFrames(){return arCompositor?.frames??0},get compositorCalls(){return arCompositor?.drawCalls??0},get compositorError(){return arCompositor?.error??null},get gridVisible(){return gridVisible},get selectedCell(){return selected},get calibrated(){return calibrated},get xr(){return !!xrSession},get online(){return online?.status||'off'}};
