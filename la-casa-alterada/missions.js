import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.181.0/build/three.module.js';
import { createTacticalActor } from './tactical.js';
import {calculateSharedFrame,checkSharedDistance} from './shared-calibration.js';
import {createCaptureFlag} from './capture-flag.js';
import {attachHuman,animateHuman,playHuman,disposeHuman} from './animated-humans.js';
import {makeHostageFallback,animateHostageFallback} from './hostage-fallback.js';
const $=id=>document.getElementById(id),clamp=(a,b,v)=>Math.max(a,Math.min(b,v));
const PHASES=[
{title:'01 / DESACTIVAR TRES CARGAS',detail:'Encontrá los dispositivos y desactivalos de cerca. Repartan las tareas.',target:3},
{title:'02 / DETENER A LOS INTRUSOS',detail:'Limpien la zona juntos. Usen la cobertura y el pulso EMP.',target:8},
{title:'03 / ASEGURAR EL PERÍMETRO',detail:'Defiendan la posición 40 segundos y eviten las ráfagas.',target:40},
{title:'04 / CAPTURAR AL JEFE',detail:'El líder armado es más resistente. Concentrá los disparos del equipo.',target:1}
];
const POSITION=[[-1.1,0,-.8],[1.1,0,-.8],[0,0,1.15]];
const maxPlayers=4;
function marker(id){
 // A compact original tactical charge device, not a magical rune.
 const g=new THREE.Group(),base=new THREE.MeshStandardMaterial({color:0x283039,metalness:.65,roughness:.53});
 const orange=new THREE.MeshStandardMaterial({color:0xf1a655,emissive:0xba5423,emissiveIntensity:.66});
 const screen=new THREE.MeshStandardMaterial({color:0x385f68,emissive:0x398792,emissiveIntensity:.47});
 const box=(w,h,d,x,y,z,m)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);g.add(o);return o};
 box(.42,.14,.33,0,.11,0,base);
 box(.35,.017,.26,0,.184,0,orange);
 box(.20,.015,.09,-.06,.194,-.035,screen);
 box(.08,.026,.065,.14,.204,.07,base);
 box(.055,.22,.035,.17,.30,-.095,base);
 const cap=box(.065,.055,.04,.17,.44,-.095,orange);
 const ring=new THREE.Mesh(new THREE.RingGeometry(.27,.28,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xf5ad6a,transparent:true,opacity:.73,side:THREE.DoubleSide}));
 ring.position.y=.02;g.add(ring);
 g.userData.cap=cap;return g;
}
function avatar(team='blue'){
 const holder=new THREE.Group(),soldier=createTacticalActor(THREE,0,'operator');
 holder.add(soldier.root);soldier.root.position.y=-1.65;holder.scale.setScalar(.92);
 const marker=new THREE.Mesh(new THREE.TorusGeometry(.23,.047,8,22),
    new THREE.MeshStandardMaterial({color:team==='red'?0xff655e:0x4cc6ff,
       emissive:team==='red'?0xff655e:0x4cc6ff,emissiveIntensity:.5}));
 marker.position.y=-.43;marker.rotation.x=Math.PI/2;holder.add(marker);
 holder.userData.teamMarker=marker;holder.userData.team=team;
 operatorModel().then(base=>{
  if(!base||!holder.parent)return;
  const obj=base.clone(true);obj.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(obj);
  const size=new THREE.Vector3();bounds.getSize(size);
  if(!Number.isFinite(size.y)||size.y<.05)return;
  const scale=Math.min(4,1.7/size.y);
  const center=new THREE.Vector3();bounds.getCenter(center);
  obj.scale.setScalar(scale);
  obj.position.set(-center.x*scale,-1.65-bounds.min.y*scale,-center.z*scale);
  obj.traverse(n=>{if(n.isMesh){n.frustumCulled=false;n.castShadow=false}});
  holder.add(obj);soldier.root.visible=false;
 });
 return holder;
}
function tintAvatar(group,team){
 if(!group?.userData?.teamMarker||group.userData.team===team)return;
 group.userData.team=team;
 const c=team==='red'?0xff655e:0x4cc6ff;
 group.userData.teamMarker.material.color.setHex(c);
 group.userData.teamMarker.material.emissive.setHex(c);
}
function visualWave(scene,origin,color=0x65d9ee){const m=new THREE.Mesh(new THREE.RingGeometry(.14,.18,48).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));m.position.copy(origin);m.position.y-=1.1;scene.add(m);return{mesh:m,t:0,duration:.7}}
export function createMission(api){
  const o={api,peer:null,room:null,role:'solo',conn:null,connections:new Map(),peers:new Map(),origin:null,angle:0,phase:-2,hostagePos:null,hostageRescued:false,hostageActor:null,escortPlayer:null,hostageHealth:100,hostageShieldUntil:0,rescueActionStartedAt:0,rescueRequestAt:0,rescueReinforcementAt:0,routeCache:null,routeCacheAt:0,routeTarget:null,mask:0,held:40,spawnAfter:0,lastSnap:0,lastMove:0,ready:false,running:false,finished:false,objects:[],remoteEnemy:new Map(),remoteAvatar:new Map(),remoteBullet:new Map(),effects:[],cd:{pulse:0,shield:0,heal:0},shields:new Map(),lastActions:new Map(),myId:'local',lastHostSnapshot:0,lastSnapshotSeq:-1,snapshotSeq:0,lastShotAt:new Map(),localPositions:new Map(),enemySeq:0,seed:0,startedByHost:false,joined:false,referenceReady:false,referenceLength:0,expectedLength:null,calibrationQuality:'waiting',calibrationSeen:new Map(),gameMode:'rescue',myTeam:'blue',teams:new Map(),ctf:null,lastMoveAt:new Map()};
  const info=$('missionInfo'),phaseEl=$('missionStage'),desc=$('missionText'),progress=$('missionProgress'),team=$('teamStatus'),interact=$('interact'),ability=$('abilities');
  function teamUpdate(){const count=1+(o.role==='host'?o.connections.size:o.role==='guest'&&o.conn?.open?1:0);team.textContent=o.role==='solo'?'SOLO / OPERACIÓN':o.role==='host'?'JEFE DE SALA / '+count+' JUGADOR'+(count===1?'':'ES'):o.conn?.open?'EQUIPO CONECTADO':'RECONECTANDO…';$('crew').textContent=count+' / '+maxPlayers}
  function lobby(msg){$('lobbyMsg').textContent=msg}
  const P=(v)=>[+v.x.toFixed(3),+v.y.toFixed(3),+v.z.toFixed(3)];
  function from(v){return new THREE.Vector3(v?.[0]||0,v?.[1]||0,v?.[2]||0)}
  function send(c,msg){try{if(c?.open)c.send(msg)}catch(e){}}
  function broadcast(msg){for(const c of o.connections.values())send(c,msg)}
  function position(){if(!o.origin)return null;const w=new THREE.Vector3();api.getCam().getWorldPosition(w);return o.origin.worldToLocal(w)}
  function isGuest(){return o.role==='guest'}
  function isHost(){return o.role!=='guest'}
  function localPositionOf(id){if(!o.origin)return null;return id===o.myId?position():o.localPositions.get(id)||null}

  const ctf=createCaptureFlag(THREE,{
    origin:()=>o.origin,isHost,
    players:()=>{
      const list=[],me=position(),now=performance.now();
      if(me)list.push({id:o.myId,team:o.myTeam,pos:me});
      for(const [id,p] of o.localPositions){
        if(!p)continue;
        if(isHost()&&now-(o.lastMoveAt.get(id)||0)>2600)continue;
        list.push({id,team:o.teams.get(id)||'blue',pos:p});
      }
      return list;
    },
    bots:()=>api.enemies(),spawnBot:(team,i,id,local)=>api.spawnCTFBot?.(team,i,id,local),
    canMove:(a,b,r)=>api.environmentCanMove?.(a,b,r),
    nextPoint:(a,b)=>api.environmentNextPoint?.(a,b),
    cover:(a,b)=>api.hasCover?.(a,b),
    animate:(e,dt,speed)=>{api.animateEnemy(e,dt,speed);api.animateHuman?.(e,dt,speed)},
    damageBot:(bot,power,shooter)=>api.damageEnemy(bot,power,false,shooter),
    tagPlayer:(id,power)=>{if(id===o.myId)api.ctfTag?.(power);
      else send(o.connections.get(id),{t:'ctfTag',power});},
    botShot:(a,b,team)=>api.ctfBotShot?.(a,b,team),
    event:msg=>{
      api.event(msg);
      if(isHost())broadcast({t:'ctfEvent',message:String(msg).slice(0,140)});
    },
    finish:(winner,state)=>{o.running=false;o.finished=true;
      broadcast({t:'ctfEnd',winner,state});
      api.ctfFinish?.(winner,o.myTeam,state);}
  });
  o.ctf=ctf;
  function isCapture(){return o.gameMode==='capture'}
  function teamOf(id){return id===o.myId?o.myTeam:o.teams.get(id)||'blue'}
  function lobbyConfig(){return{
    bots:Math.max(0,Math.min(6,Number($('ctfBots')?.value)||0)),
    difficulty:['facil','normal','dificil'].includes($('ctfDifficulty')?.value)?$('ctfDifficulty').value:'normal',
    versus:$('ctfTeamMode')?.value==='versus'
  }}
  function updateModeVisual(){
    $('gameSelect').value=o.gameMode;
    $('ctfSettings').classList.toggle('hidden',!isCapture());
    $('ctfTeamChoice').classList.toggle('hidden',!isCapture()||!ctf.config.versus||o.role==='host'||o.role==='solo');
    $('ctfTeamMode').value=ctf.config.versus?'versus':'coop';
    $('ctfBots').value=String(ctf.config.bots);
    $('ctfDifficulty').value=ctf.config.difficulty;
    $('ctfMyTeam').value=o.myTeam;
    $('ctfMyTeam').disabled=o.running;
    $('gameSelect').disabled=o.role==='guest'||o.running;
    for(const id of ['ctfBots','ctfDifficulty','ctfTeamMode'])$(id).disabled=o.role==='guest'||o.running;
    api.refreshHud?.();
  }
  function sendMode(){
    if(o.role==='host')broadcast({t:'gameConfig',gameMode:o.gameMode,ctf:ctf.config,
     teams:Object.fromEntries(o.teams)});
  }
  function configureLobby(){
    if(o.running||o.role==='guest')return false;
    o.gameMode=$('gameSelect').value==='capture'?'capture':'rescue';
    ctf.configure(lobbyConfig());o.myTeam='blue';
    for(const id of o.teams.keys())if(!ctf.config.versus)o.teams.set(id,'blue');
    updateModeVisual();sendMode();ui();return true;
  }
  function applyMode(msg){
    if(!msg||!['rescue','capture'].includes(msg.gameMode))return;
    o.gameMode=msg.gameMode;
    if(!ctf.running)ctf.configure(msg.ctf||{});
    if(msg.teams&&typeof msg.teams==='object')for(const [id,team] of Object.entries(msg.teams))
      if(team==='blue'||team==='red')o.teams.set(id,team);
    if(o.role==='guest'){
      // Blue squad for co-op; on versus default to red until the user selects.
      o.myTeam=ctf.config.versus?(o.teams.get(o.myId)||$('ctfMyTeam').value||'red'):'blue';
      if(o.conn?.open&&o.teams.get(o.myId)!==o.myTeam)send(o.conn,{t:'teamPick',team:o.myTeam});
    }
    updateModeVisual();ui();
  }
  function chooseMyTeam(){
    if(o.role!=='guest'||o.running||!isCapture()||!ctf.config.versus)return;
    o.myTeam=$('ctfMyTeam').value==='red'?'red':'blue';
    send(o.conn,{t:'teamPick',team:o.myTeam});
    updateModeVisual();
  }
  function placeFlag(team,world){
    if(!isCapture()||o.role==='guest'||!o.ready||!['blue','red'].includes(team))return false;
    const result=ctf.place(team,world);
    if(result){sendMode();broadcast({t:'ctfState',state:ctf.snapshot()});api.refreshHud?.()}
    return result;
  }
  function captureStatus(){
    const state=ctf.snapshot();
    return{...state,myTeam:o.myTeam,mode:o.gameMode,ready:ctf.ready(),
      objective:ctf.objective(o.myTeam,o.myId)?.label||null,
      pickup:ctf.pickupInfo(o.myTeam,position())};
  }
  function pickupFlag(){
    if(!isCapture()||!o.running||!o.ready)return false;
    const local=position(),info=ctf.pickupInfo(o.myTeam,local);
    if(!info){api.toast('BUSCÁ LA BANDERA ENEMIGA O UN COMPAÑERO QUE LA LLEVE');return false}
    if(!info.available){
      api.toast('ACERCATE '+Math.max(0,info.distance-1.55).toFixed(1)+' m MÁS PARA '+info.label);
      return false;
    }
    if(isGuest())send(o.conn,{t:'ctfPickup'});
    else if(!ctf.tryPickup(o.myId,o.myTeam,local)){api.toast('NO SE PUEDE RECOGER TODAVÍA');return false}
    api.toast('¡BANDERA ASEGURADA! · VOLVÉ A TU BASE');
    ui();api.refreshHud?.();return true;
  }
  function relayCTFBotShot(from,to,team){
    if(!isCapture()||!o.running||!isHost()||!o.origin)return;
    const a=o.origin.worldToLocal(from.clone()),b=o.origin.worldToLocal(to.clone());
    broadcast({t:'ctfBotShot',from:P(a),to:P(b),team});
  }
  function captureBotDown(bot){
    if(!isCapture()||!isHost()||!bot||!o.origin)return;
    const local=o.origin.worldToLocal(bot.root.getWorldPosition(new THREE.Vector3()));
    ctf.eliminateCarrier('bot:'+bot.id,local,performance.now());
  }
  function capturePlayersWorld(){
    if(!isCapture()||!o.origin)return [];
    const out=[];
    const local=position();
    if(local)out.push({id:o.myId,team:o.myTeam,world:originToWorld(local)});
    for(const [id,p] of o.localPositions){
      if(!p||performance.now()-(o.lastMoveAt.get(id)||0)>2600)continue;
      out.push({id,team:o.teams.get(id)||'blue',world:originToWorld(p)});
    }
    return out;
  }
  function tagEnemyPlayer(id,attacker){
    if(!isCapture()||!o.running||!isHost()||!id||teamOf(id)===teamOf(attacker))return false;
    const victim=localPositionOf(id);
    if(!victim||id!==o.myId&&performance.now()-(o.lastMoveAt.get(id)||0)>2600)return false;
    if(!ctf.tagPlayer(id,victim,performance.now()))return false;
    if(id===o.myId)api.ctfTag?.(1);else send(o.connections.get(id),{t:'ctfTag',power:1});
    return true;
  }
  function needsReference(){return o.role!=='solo'&&!o.referenceReady}
 function teamCalibration(){
  if(o.role!=='host')return{ready:true,done:0,total:0};
  let done=0;
  for(const id of o.connections.keys()){
   const distance=o.calibrationSeen.get(id);
   if(checkSharedDistance(distance,o.referenceLength).status==='aligned')done++;
  }
  return{ready:done===o.connections.size,done,total:o.connections.size};
 }
 function updateTrackedFrame(root,point){
  if(!o.referenceReady||!o.origin||!root||!point)return;
  const a=new THREE.Vector3();root.getWorldPosition(a);
  const frame=calculateSharedFrame(THREE,a,point);
  if(!frame)return;
  o.origin.position.copy(frame.position);
  o.origin.quaternion.slerp(frame.rotation,.18);
 }
 function alignmentStatus(){return {needsSecond:needsReference(),ready:o.ready,quality:o.calibrationQuality,expectedLength:o.expectedLength,referenceLength:o.referenceLength}}
 function setReferenceTarget(expected){
  if(!Number.isFinite(expected)||expected<.85||expected>7)return;
  o.expectedLength=expected;
  if(o.role!=='guest'||!o.referenceLength)return;
  const verdict=checkSharedDistance(o.referenceLength,expected);
  o.calibrationQuality=verdict.status;
  o.ready=o.referenceReady=verdict.status==='aligned';
  if(!o.ready)api.toast('LOS DOS PUNTOS NO COINCIDEN CON LA SALA · VOLVÉ A MARCAR B');
  else {api.toast('ESPACIO COMPARTIDO ALINEADO ✓');send(o.conn,{t:'syncRequest'});if(o.startedByHost)api.remoteStart()}
  ui();api.refreshHud?.();
 }
 function align(root){
  if(o.origin){api.scene.remove(o.origin)}
  const p=new THREE.Vector3();root.getWorldPosition(p);
  const view=api.getCam(),q=new THREE.Quaternion();view.getWorldQuaternion(q);
  const forward=new THREE.Vector3(0,0,-1).applyQuaternion(q);
  o.angle=Math.atan2(-forward.x,-forward.z);
  o.origin=new THREE.Group();o.origin.position.copy(p);
  o.origin.quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0),o.angle);
  api.scene.add(o.origin);
  o.referenceReady=false;o.referenceLength=0;
  o.ready=o.role==='solo';
  o.calibrationQuality=o.ready?'local':'waiting';
  makeMarkers();
  api.toast(o.ready?'PUNTO DE ENTRADA FIJADO ✓':'PUNTO A LISTO · AHORA TODOS MARQUEN EL MISMO PUNTO B');
  ui();api.refreshHud?.();
  if(isGuest()&&o.ready)send(o.conn,{t:'syncRequest'});
 }
 function alignSecond(root,worldPoint,detected=false){
  if(!o.origin||!worldPoint)return false;
  const a=new THREE.Vector3();root.getWorldPosition(a);
  const frame=calculateSharedFrame(THREE,a,worldPoint);
  if(!frame){api.toast('EL SEGUNDO PUNTO DEBE ESTAR A 1–7 METROS DE LA ENTRADA Y EN EL MISMO PISO');return false}
  if(isGuest()&&Number.isFinite(o.expectedLength)){
    const check=checkSharedDistance(frame.distance,o.expectedLength);
    if(check.status==='mismatch'){
      o.referenceReady=false;o.ready=false;o.calibrationQuality='mismatch';
      api.toast('DISTANCIA DISTINTA AL ANFITRIÓN · REVISÁ EL PUNTO B');
      ui();api.refreshHud?.();return false;
    }
  }
  o.origin.position.copy(frame.position);o.origin.quaternion.copy(frame.rotation);o.angle=frame.yaw;
  o.referenceLength=frame.distance;
  o.calibrationQuality=isGuest()&&!Number.isFinite(o.expectedLength)?'waiting':'aligned';
  o.referenceReady=o.calibrationQuality==='aligned';
  o.ready=o.referenceReady;
  if(isGuest()){
    send(o.conn,{t:'calibration',length:+frame.distance.toFixed(3),detected:!!detected});
    if(o.ready)send(o.conn,{t:'syncRequest'});
  }else{
    broadcast({t:'reference',length:+frame.distance.toFixed(3)});
    for(const [id,distance] of o.calibrationSeen){
      const result=checkSharedDistance(distance,frame.distance);
      send(o.connections.get(id),{t:'calibrationResult',status:result.status});
    }
    o.calibrationQuality='aligned';
    o.ready=o.referenceReady=true;
  }
  api.toast(o.ready?'DOS PUNTOS ALINEADOS ✓ · LOS ENEMIGOS COMPARTEN POSICIÓN':'PUNTO B CAPTURADO · ESPERANDO REFERENCIA');
  ui();api.refreshHud?.();
  if(isGuest()&&o.ready&&o.startedByHost)api.remoteStart();
  return true;
 }
 function makeMarkers(){if(!o.origin)return;for(const g of o.objects)g.parent?.remove(g);o.objects=POSITION.map((p,i)=>{let g=marker(i);g.position.set(p[0],p[1],p[2]);o.origin.add(g);return g})}
  function removeRemote(){for(const x of o.remoteEnemy.values())x.root?.parent?.remove(x.root);o.remoteEnemy.clear();for(const g of o.remoteAvatar.values())g.parent?.remove(g);o.remoteAvatar.clear();for(const v of o.remoteBullet.values())v.parent?.remove(v);o.remoteBullet.clear();for(const fx of o.effects){fx.mesh?.parent?.remove(fx.mesh)}o.effects=[]}

  function buildHostage(){
    if(!o.origin||!o.hostagePos)return;
    if(o.hostageActor)return;
    // Correctly proportioned, immediately visible while premium GLB downloads.
    const root=new THREE.Group(),fallback=makeHostageFallback(THREE),flesh=fallback.flesh;
    root.add(flesh);
    root.scale.setScalar(.96);
    root.rotation.y=Math.atan2(-o.hostagePos.x,-o.hostagePos.z);
    const marker=new THREE.Mesh(new THREE.RingGeometry(.34,.35,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x54d7d3,transparent:true,opacity:.88,side:THREE.DoubleSide}));
    marker.position.y=.019;root.add(marker);
 // Large emissive goal marker, part of the WebGL scene (not screen HUD).
 const glow=new THREE.Mesh(new THREE.SphereGeometry(.064,12,8),
   new THREE.MeshBasicMaterial({color:0x5affd5,depthTest:false,depthWrite:false,transparent:true,opacity:.68}));
 glow.position.set(0,1.85,0);glow.renderOrder=101;root.add(glow);
 const pole=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.32,8),
   new THREE.MeshBasicMaterial({color:0x65f5da,depthTest:false,depthWrite:false}));
 pole.position.set(0,2.12,0);pole.renderOrder=98;root.add(pole);
    const labelCanvas=document.createElement('canvas');labelCanvas.width=320;labelCanvas.height=80;
 const context=labelCanvas.getContext('2d');context.fillStyle='rgba(10,27,39,0.84)';context.fillRect(2,5,316,69);
 context.strokeStyle='#79dfcb';context.lineWidth=3;context.strokeRect(2,5,316,69);
 context.fillStyle='#c2fff2';context.font='bold 30px Arial';context.textAlign='center';context.fillText('OBJETIVO: REHÉN',160,50);
 const markerText=new THREE.Sprite(new THREE.SpriteMaterial({
 map:new THREE.CanvasTexture(labelCanvas),transparent:true,
 depthWrite:false,depthTest:false
}));
 markerText.position.set(0,1.91,0);
 markerText.scale.set(.82,.205,1);markerText.renderOrder=100;root.add(markerText);
 // Waypoint remains legible when the detailed 3D model cannot download.
 const beaconMat=new THREE.MeshBasicMaterial({
   color:0x5ee8d1,transparent:true,opacity:.62,depthWrite:false,depthTest:false
 });
 const beacon=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.28,8),beaconMat);
 beacon.position.set(0,2.12,0);beacon.renderOrder=99;root.add(beacon);
 const actor={root,flesh,hostage:true,alive:true,phase:0,marker,markerText,fallbackArms:fallback.arms,fallbackLegs:fallback.legs};
    o.origin.add(root);root.position.copy(o.hostagePos);o.hostageActor=actor;
    // V25 XR compositor now draws world meshes: restore the textured,
    // rigged Maya asset in AR, keeping the native fallback until ready.
    attachHuman(actor,'hostage').then(success=>{
      if(success&&o.hostageRescued){actor.hostage=false;playHuman(actor,'walk')}
    }).catch(err=>console.warn('Hostage fallback kept',err));
  }
  function placeHostage(worldPoint){
    if(isGuest()){api.toast('Solo el anfitrión coloca al rehén');return false}
    if(!o.origin){api.toast('Fijá primero el punto de calibración en el piso');return false}
    if(o.running){api.toast('La operación ya comenzó');return false}
    if(!worldPoint)return false;
    const relative=o.origin.worldToLocal(worldPoint.clone());
    if(Math.hypot(relative.x,relative.z)<1.15){api.toast('Ubicá al rehén más lejos del punto de entrada');return false}
    if(o.hostageActor){disposeHuman(o.hostageActor);o.hostageActor.root.parent?.remove(o.hostageActor.root);o.hostageActor=null}
    o.hostagePos=relative;o.hostageRescued=false;o.escortPlayer=null;o.hostageHealth=100;buildHostage();ui();
    api.event('REHÉN MARCADO · PREPARATE PARA EL RESCATE');
    broadcast({t:'hostage',pos:P(o.hostagePos),rescued:false});
    return true;
  }
  function syncHostage(payload,rescued=false){
    if(rescued)clearRescueButton();
    if(!Array.isArray(payload)||payload.length!==3||payload.some(v=>!Number.isFinite(v)))return;
    o.hostagePos=from(payload);o.hostageRescued=!!rescued;
    if(!o.hostageActor)buildHostage();
    else if(isGuest())o.hostageActor.root.position.lerp(o.hostagePos,.65);
    if(o.hostageActor&&o.hostageRescued){o.hostageActor.hostage=false;playHuman(o.hostageActor,'walk')}
  }
  function reset(){if(o.hostageActor){disposeHuman(o.hostageActor);o.hostageActor.root.parent?.remove(o.hostageActor.root)}o.hostageActor=null;o.hostagePos=null;o.lastEnvironment=null;o.routeCache=null;o.routeCacheAt=0;o.routeTarget=null;o.hostageHealth=100;o.hostageShieldUntil=0;o.rescueActionStartedAt=0;o.rescueRequestAt=0;o.rescueReinforcementAt=0;o.hostageRescued=false;o.escortPlayer=null;o.running=false;o.finished=false;o.phase=-2;o.mask=0;o.held=40;o.spawnAfter=0;o.ready=false;o.startedByHost=false;o.referenceReady=false;o.referenceLength=0;o.expectedLength=null;o.calibrationQuality='waiting';o.calibrationSeen.clear();o.localPositions.clear();o.lastMoveAt.clear();ctf.reset();o.shields.clear();o.lastSnap=0;o.lastSnapshotSeq=-1;o.snapshotSeq=0;o.lastShotAt.clear();o.enemySeq=0;o.origin?.parent?.remove(o.origin);o.origin=null;removeRemote();ui();}
  function start(){if(!o.ready){api.toast('Primero fijá un punto común en el piso');return false}
 if(isCapture()){
   if(isGuest()){
     if(!o.startedByHost){api.toast('ESPERÁ A QUE EL ANFITRIÓN COMIENCE');return false}
     o.running=true;ui();return true;
   }
   if(!ctf.ready()){api.toast('MARCÁ LAS DOS BANDERAS PRIMERO');return false}
   if(o.role==='host'&&!teamCalibration().ready){api.toast('ESPERÁ A QUE EL EQUIPO TERMINE DE CALIBRAR');return false}
   if(!ctf.start())return false;
   o.running=true;o.finished=false;
   broadcast({t:'start',mode:'capture'});
   ui();return true;
 }
 if(isGuest()){if(!o.ready){api.toast('MARQUEN LOS DOS PUNTOS DE REFERENCIA');return false}if(!o.startedByHost){api.toast('Esperá a que el anfitrión comience');return false}o.running=true;ui();return true}if(!o.hostagePos){api.toast('COLOCÁ UN REHÉN ANTES DE INICIAR');return false}
 if(o.role==='host'&&!teamCalibration().ready){api.toast('ESPERÁ A QUE TODOS MARQUEN LOS MISMOS PUNTOS A Y B');return false}o.running=true;o.finished=false;o.phase=-2;o.mask=0;o.held=40;o.spawnAfter=0;o.rescueReinforcementAt=0;
 o.hostageShieldUntil=performance.now()+17500;
 if(!o.hostageActor)buildHostage();
 broadcast({t:'start',hostage:P(o.hostagePos)});api.event('MISIÓN 01 · LOCALIZAR Y LIBERAR AL REHÉN');ui();return true;}
  function setPhase(n){if(isGuest())return;o.phase=n;o.spawnAfter=0;if(n===0)api.event('REHÉN EXTRAÍDO · DESACTIVEN LAS CARGAS');if(n===1){api.event('MISIÓN 02 · INTRUSOS LOCALIZADOS');api.spawn(8,false)}if(n===2){o.held=40;o.spawnAfter=performance.now()+6000;api.event('MISIÓN 03 · ASEGURAR PERÍMETRO')}if(n===3){api.event('MISIÓN FINAL · JEFE LOCALIZADO');api.spawn(1,true)}if(n===4){o.finished=true;api.event('REHÉN EVACUADO · EQUIPO GANADOR');api.victory(true)}broadcast({t:'phase',phase:n,mask:o.mask,held:o.held});ui()}
  function onKill(){if(o.running&&isHost()&&o.phase===1&&api.enemies().filter(e=>e.alive).length===0&&!api.spawnPending?.())setPhase(2);if(o.running&&isHost()&&o.phase===3&&api.enemies().filter(e=>e.alive).length===0)setPhase(4)}

  function hostageWorld(){
    if(!o.hostageActor||!o.origin||o.phase>=0||!o.running||o.hostageHealth<=0)return null;
    const p=new THREE.Vector3();o.hostageActor.root.getWorldPosition(p);p.y+=1.02;return p;
  }
  function damageHostage(amount){
    if(isGuest()||!o.running||o.phase>=0||o.hostageHealth<=0)return;
    if(performance.now()<o.hostageShieldUntil)return;
    o.hostageHealth=Math.max(0,o.hostageHealth-Math.max(0,Number(amount)||0));
    if(o.hostageActor?.markerText)o.hostageActor.markerText.material.color.setHex(0xff7b68);
    if(o.hostageHealth<35)api.toast('¡REHÉN HERIDO! PROTEGELO O USÁ EL BOTIQUÍN');
    if(o.hostageHealth<=0){api.event('REHÉN CAÍDO · OPERACIÓN FALLIDA');api.victory(false)}
    ui();
  }
  function healHostage(amount){
    if(isGuest()||o.hostageHealth<=0||!o.running||o.phase>=0)return;
    o.hostageHealth=Math.min(100,o.hostageHealth+Math.max(0,Number(amount)||0));
    o.hostageShieldUntil=performance.now()+1200;
    ui();
  }
  // V28: One tap commits the rescue. No XR frame time, percentage,
  // pointer hold, GIF/GLB, or animation callback can block this state.
  const RESCUE_RANGE=1.55;
  function clearRescueButton(){
    o.rescueActionStartedAt=0;o.rescueRequestAt=0;
    interact.classList.remove('rescuing');
    interact.style.removeProperty('--rescue-progress');
    interact.disabled=false;
  }
  function beginRescueTap(){
    if(!o.running||o.phase!==-2)return false;
    const p=position();
    if(!p||!o.hostagePos){api.toast('NO SE PUEDE LOCALIZAR AL REHÉN');return false}
    const distance=Math.hypot(p.x-o.hostagePos.x,p.z-o.hostagePos.z);
    if(distance>RESCUE_RANGE){api.toast('ACERCATE AL REHÉN PARA LIBERARLO');return false}
    if(isGuest()){
      if(!o.conn?.open){api.toast('ESPERÁ LA CONEXIÓN CON EL ANFITRIÓN');return false}
      if(o.rescueRequestAt&&performance.now()-o.rescueRequestAt<900)return false;
      o.rescueRequestAt=performance.now();
      interact.textContent='ESPERANDO CONFIRMACIÓN…';
      send(o.conn,{t:'interact'});
      return true;
    }
    return doInteract(o.myId);
  }
  function doInteract(id){
    if(!o.running)return false;
    const p=localPositionOf(id);if(!p)return false;
    if(o.phase===-2){
      if(!o.hostagePos)return false;
      const dist=Math.hypot(p.x-o.hostagePos.x,p.z-o.hostagePos.z);
      if(dist>RESCUE_RANGE){
        if(id===o.myId)api.toast('ACERCATE AL REHÉN PARA LIBERARLO');
        else send(o.connections.get(id),{t:'msg',text:'Acercate más al rehén'});
        return false;
      }
      // Check torso-to-torso; head-to-floor diagonal caused phantom blockers.
      const from=o.origin.localToWorld(p.clone()),to=o.origin.localToWorld(o.hostagePos.clone());
      from.y=to.y+1;to.y+=1;
      if(dist>.78&&api.hasCover?.(from,to)){
        if(id===o.myId)api.toast('HAY UN OBSTÁCULO ENTRE VOS Y EL REHÉN');
        else send(o.connections.get(id),{t:'msg',text:'Hay un obstáculo entre vos y el rehén'});
        return false;
      }
      // COMMIT FIRST: later effects and loading can't roll back a rescue.
      o.phase=-1;o.hostageRescued=true;o.escortPlayer=id;
      o.hostageShieldUntil=performance.now()+5000;
      clearRescueButton();interact.classList.add('hidden');
      try{broadcast({t:'phase',phase:-1,mask:o.mask,held:o.held,rescued:true})}
      catch(err){console.warn('Escort network',err)}
      try{if(o.hostageActor){o.hostageActor.hostage=false;playHuman(o.hostageActor,'walk')}}
      catch(err){console.warn('Escort animation',err)}
      try{api.event('¡REHÉN LIBERADO! ESCOLTALO A LA ENTRADA')}
      catch(err){console.warn('Escort event',err)}
      try{ui()}catch(err){console.error('Escort HUD',err)}
      o.rescueReinforcementAt=performance.now()+3000;
      return true;
    }
    if(o.phase!==0)return false;
    let best=-1,min=Infinity;
    POSITION.forEach((v,i)=>{
      if(o.mask&(1<<i))return;
      const d=Math.hypot(p.x-v[0],p.z-v[2]);
      if(d<min){min=d;best=i}
    });
    if(best<0||min>.93){
      if(id===o.myId)api.toast('ACERCATE A LA CARGA PARA DESACTIVARLA');
      else send(o.connections.get(id),{t:'msg',text:'Acercate a la carga'});
      return false;
    }
    o.mask|=1<<best;api.event('CARGA '+(best+1)+' DESACTIVADA');
    broadcast({t:'phase',phase:o.phase,mask:o.mask,held:o.held});
    if(o.mask===7)setPhase(1);ui();return true;
  }
  function shielded(id=o.myId){return (o.shields.get(id)||0)>performance.now()}
  function receiveAbility(id,kind,remote=false){const allowed=['pulse','shield','heal'];if(!allowed.includes(kind)||!o.running||o.finished)return;const t=performance.now(),key=id+':'+kind;const period={pulse:18000,shield:25000,heal:35000}[kind];if((o.lastActions.get(key)||0)>t)return;o.lastActions.set(key,t+period);if(kind==='shield'){if(o.hostageActor&&o.phase<0&&o.hostagePos){const p=localPositionOf(id);if(p&&Math.hypot(p.x-o.hostagePos.x,p.z-o.hostagePos.z)<2.5)o.hostageShieldUntil=t+6000}o.shields.set(id,t+6000);if(id!==o.myId)send(o.connections.get(id),{t:'shield',duration:6000});api.toast('ESCUDO ACTIVADO · 6 SEGUNDOS')}
    if(kind==='heal'){api.heal(22);healHostage(28);broadcast({t:'heal',amount:22});api.event('BOTIQUÍN DE EQUIPO +22 · REHÉN +28')}
    if(kind==='pulse'){let p=localPositionOf(id);if(!p)return;let hit=0;for(const e of api.enemies()){if(!e.alive)continue;const ep=new THREE.Vector3();e.root.getWorldPosition(ep);o.origin.worldToLocal(ep);if(Math.hypot(ep.x-p.x,ep.z-p.z)<2.35){api.damageEnemy(e,2);hit++}}if(!remote)api.toast('PULSO ELECTROMAGNÉTICO · '+hit+' IMPACTOS');spawnFX(P(p));broadcast({t:'fx',kind:'pulse',pos:P(p)})}
  }
  function abilityNow(kind){if(!o.running||!api.active())return;const t=performance.now(),period={pulse:18000,shield:25000,heal:35000}[kind],left=(o.cd[kind]||0)-t;if(left>0){api.toast('PODER DISPONIBLE EN '+Math.ceil(left/1000)+' S');return}o.cd[kind]=t+period;if(isGuest()){send(o.conn,{t:'ability',kind});if(kind==='shield')o.shields.set(o.myId,t+6000);if(kind==='pulse'){const p=position();if(p)spawnFX(P(p))}}else receiveAbility(o.myId,kind);ui()}
  function spawnFX(p){if(!o.origin)return;const at=from(p);o.origin.localToWorld(at);o.effects.push(visualWave(api.scene,at,0x54dff3))}
  function getEnemyState(){if(!o.origin)return[];return api.enemies().filter(e=>e.alive).map(e=>{const v=new THREE.Vector3();e.root.getWorldPosition(v);o.origin.worldToLocal(v);return{id:e.id,v:e.variant,team:e.team||'red',ctfBot:!!e.ctfBot,
    shield:e.ctfBot?Math.max(0,(e.ctfProtectedUntil||0)-performance.now()):0,
    skin:e.appearance||'raiderA',h:e.hp,p:P(v),yaw:e.root.rotation.y-o.origin.rotation.y,
    stance:e.ctfStance||'idle',boss:!!e.boss,floor:!!e.floor,scale:e.size}})}
  function receiveSnapshot(msg){
 if(!o.ready||!o.origin)return;
 if(Number.isInteger(msg.seq)){
   if(msg.seq<=o.lastSnapshotSeq)return;
   o.lastSnapshotSeq=msg.seq;
 }
 o.lastHostSnapshot=performance.now();
 if(msg.gameMode&&msg.gameMode!==o.gameMode)applyMode({gameMode:msg.gameMode,ctf:msg.ctf?.config,teams:msg.teams});
 if(isCapture()&&msg.ctf)ctf.applyState(msg.ctf);
 if(msg.teams&&typeof msg.teams==='object')for(const [id,team] of Object.entries(msg.teams))if(team==='blue'||team==='red')o.teams.set(id,team);
if(Array.isArray(msg.environment)){
 const signature=JSON.stringify(msg.environment);
 if(o.lastEnvironment!==signature){o.lastEnvironment=signature;api.importEnvironment?.(msg.environment,o.origin)}
}o.phase=msg.phase;o.mask=msg.mask;o.held=msg.held;if(Number.isFinite(msg.hostageHP))o.hostageHealth=msg.hostageHP;if(Array.isArray(msg.hostage))syncHostage(msg.hostage,msg.rescued);if(msg.running)o.startedByHost=true;o.running=msg.running;o.finished=msg.finished;api.setGuestStats(msg.clock,msg.wave,msg.kills);if(msg.running&&!api.active())api.remoteStart();const alive=new Set();for(const x of msg.enemies||[]){if(typeof x.id!=='number'||!Array.isArray(x.p))continue;alive.add(x.id);let e=o.remoteEnemy.get(x.id);if(!e){e=api.buildEnemy(x.v,x.boss,x.skin,x.team);e.team=x.team||'red';e.ctfBot=!!x.ctfBot;e.id=x.id;e.floor=!!x.floor;e.groundY=0;if(Number.isFinite(x.scale)&&x.scale>.05&&x.scale<4){const factor=x.scale/e.size;e.root.scale.multiplyScalar(factor);e.size=x.scale}e.hit.userData.enemy=e;if(e.headHit)e.headHit.userData.enemy=e;o.origin.add(e.root);api.enemies().push(e);o.remoteEnemy.set(x.id,e)}e.hp=x.h;e.alive=true;e.root.visible=true;
 if(e.ctfBot)e.ctfProtectedUntil=performance.now()+Math.min(1800,Math.max(0,Number(x.shield)||0));
 e.start.copy(from(x.p));e.remoteYaw=Number.isFinite(x.yaw)?x.yaw:0;
 e.ctfStance=['idle','crouch','aim','sprint','advance'].includes(x.stance)?x.stance:'idle';}for(const [id,e] of o.remoteEnemy)if(!alive.has(id)){
 e.alive=false;disposeHuman(e);e.root.parent?.remove(e.root);
 const pool=api.enemies(),j=pool.indexOf(e);if(j>=0)pool.splice(j,1);
 o.remoteEnemy.delete(id)
}
    const bullets=new Set();for(const shot of msg.bullets||[]){if(!Array.isArray(shot.p))continue;bullets.add(shot.id);let obj=o.remoteBullet.get(shot.id);if(!obj){obj=new THREE.Mesh(new THREE.CapsuleGeometry(.025,.18,2,5),new THREE.MeshBasicMaterial({color:0xffc17b,transparent:true,opacity:.96,depthWrite:false}));o.origin.add(obj);o.remoteBullet.set(shot.id,obj);const soundPos=from(shot.p);o.origin.localToWorld(soundPos);api.enemyShot?.(soundPos)}obj.userData.target=from(shot.p)}for(const [id,obj] of o.remoteBullet)if(!bullets.has(id)){obj.parent?.remove(obj);o.remoteBullet.delete(id)}
    if(isGuest()){
      o.localPositions.clear();
      for(const p of msg.players||[])if(p.id!==o.myId&&typeof p.id==='string'&&
          Array.isArray(p.pos)&&p.pos.length===3&&p.pos.every(n=>Number.isFinite(n)&&Math.abs(n)<40))
        o.localPositions.set(p.id,from(p.pos));
    }
    const known=new Set();for(const p of msg.players||[]){if(p.id===o.myId||!Array.isArray(p.pos))continue;known.add(p.id);let g=o.remoteAvatar.get(p.id);if(!g){g=avatar(p.team||o.teams.get(p.id)||'blue');o.origin.add(g);o.remoteAvatar.set(p.id,g)}
 tintAvatar(g,p.team||o.teams.get(p.id)||'blue');
 const target=from(p.pos);g.position.lerp(target,.5)}for(const [id,g] of o.remoteAvatar)if(!known.has(id)){g.parent?.remove(g);o.remoteAvatar.delete(id)}ui()}
  function makeSnapshot(){const players=[{id:o.myId,pos:P(position()||new THREE.Vector3()),team:o.myTeam}];
 for(const [id,p] of o.localPositions)if(p)players.push({id,pos:P(p),team:o.teams.get(id)||'blue'});return{t:'snapshot',seq:++o.snapshotSeq,gameMode:o.gameMode,teams:Object.fromEntries(o.teams),ctf:isCapture()?ctf.snapshot():null,phase:o.phase,mask:o.mask,held:Math.round(o.held),running:o.running,finished:o.finished,environment:api.exportEnvironment?.(o.origin)||[],hostage:o.hostagePos?P(o.hostagePos):null,hostageHP:o.hostageHealth,rescued:o.hostageRescued,enemies:getEnemyState(),bullets:api.projectiles().map((b,i)=>{const p=b.mesh.position.clone();o.origin.worldToLocal(p);return{id:b.id||i,p:P(p),power:b.power}}),players,clock:api.clock(),wave:api.wave(),kills:api.kills?.()||0}}

  function relayEnemyHit(id,headshot=false,hp=0){
    if(isHost()&&Number.isInteger(id))broadcast({t:'enemyHit',id,headshot:!!headshot,hp});
  }
  function relayEnemyDown(id,killerId=null,headshot=false,count=0){
    if(isHost()&&Number.isInteger(id))broadcast({t:'enemyDown',id,killer:killerId||o.myId,headshot:!!headshot,count});
  }
  function relayShot(worldOrigin,worldDirection){
    if(!o.running||!o.origin||!worldOrigin||!worldDirection)return;
    const shotPos=o.origin.worldToLocal(worldOrigin.clone());
    const shotDir=worldDirection.clone().applyQuaternion(o.origin.quaternion.clone().invert()).normalize();
    const payload={t:'teamShot',p:P(shotPos),d:P(shotDir),id:o.myId};
    if(isGuest())send(o.conn,payload);
    else broadcast(payload);
  }
  function playTeamShot(msg){
    if(msg.id===o.myId||!o.origin)return;
    if(!Array.isArray(msg.p)||!Array.isArray(msg.d)||msg.p.length!==3||msg.d.length!==3)return;
    if([...msg.p,...msg.d].some(n=>!Number.isFinite(n)||Math.abs(n)>50))return;
    const start=from(msg.p),direction=from(msg.d);
    if(direction.lengthSq()<.05)return;
    o.origin.localToWorld(start);
    direction.applyQuaternion(o.origin.quaternion).normalize();
    api.teammateShot?.(start,direction,msg.id);
  }
  function register(conn){if(o.connections.size>=maxPlayers-1){send(conn,{t:'full'});conn.close();return}conn.on('open',()=>{o.connections.set(conn.peer,conn);o.localPositions.set(conn.peer,null);api.refreshHud?.();o.teams.set(conn.peer,o.gameMode==='capture'&&ctf.config.versus?'red':'blue');
    send(conn,{t:'welcome',id:conn.peer,players:o.connections.size+1,gameMode:o.gameMode,ctf:ctf.config,teams:Object.fromEntries(o.teams)});if(o.referenceReady)send(conn,{t:'reference',length:+o.referenceLength.toFixed(3)});teamUpdate();api.toast('JUGADOR CONECTADO · '+(o.connections.size+1)+' EN EQUIPO')});conn.on('data',msg=>{if(!msg||typeof msg!=='object'||typeof msg.t!=='string')return;
    if(msg.t==='teamShot'&&o.running&&o.ready&&o.origin){
      const t=performance.now(),last=o.lastShotAt.get(conn.peer)||0;
      const valid=(v,n=3)=>Array.isArray(v)&&v.length===n&&v.every(x=>Number.isFinite(x)&&Math.abs(x)<40);
      if(valid(msg.p)&&valid(msg.d)&&t-last>=95){
        const location=from(msg.p),direction=from(msg.d),sender=o.localPositions.get(conn.peer);
        const length=direction.length();
        // Do not trust a hit ID or an arbitrary muzzle location from a client.
        if(sender&&location.distanceTo(sender)<1.65&&length>.85&&length<1.15){
          o.lastShotAt.set(conn.peer,t);
          direction.normalize();
          const packet={t:'teamShot',id:conn.peer,p:P(location),d:P(direction)};
          playTeamShot(packet);
          broadcast(packet);
          const shotStart=originToWorld(location);
          const shotDirection=direction.applyQuaternion(o.origin.quaternion).normalize();
          const result=api.resolveTeammateShot?.(shotStart,shotDirection,conn.peer);
          if(result)send(conn,{t:'shotResult',enemyId:result.id,headshot:!!result.headshot});
        }
      }
    }
    if(msg.t==='calibration'&&Number.isFinite(msg.length)&&msg.length>.85&&msg.length<7){
      o.calibrationSeen.set(conn.peer,msg.length);
      api.refreshHud?.();
      if(o.referenceReady){
        const check=checkSharedDistance(msg.length,o.referenceLength);
        send(conn,{t:'calibrationResult',status:check.status});
      }
    }
    if(msg.t==='teamPick'&&!o.running&&isCapture()&&ctf.config.versus){
      o.teams.set(conn.peer,msg.team==='red'?'red':'blue');sendMode();api.refreshHud?.();
    }
    if(msg.t==='syncRequest'&&o.origin&&o.ready){
      send(conn,makeSnapshot());
    }
    if(msg.t==='move'&&Array.isArray(msg.p)&&msg.p.length===3&&msg.p.every(v=>Number.isFinite(v)&&Math.abs(v)<50)){
       const p=from(msg.p),last=o.localPositions.get(conn.peer),now=performance.now();
       // Large instantaneous changes are not accepted as teleports onto flags.
       if(!last||p.distanceTo(last)<=Math.max(.95,(now-(o.lastMoveAt.get(conn.peer)||now))*.0045)){
          o.localPositions.set(conn.peer,p);o.lastMoveAt.set(conn.peer,now);
       }
     }
    if(msg.t==='interact'){
      const accepted=doInteract(conn.peer);
      if(!accepted&&o.phase===-2)send(conn,{t:'msg',text:'No se pudo liberar. Acercate y volvé a tocar.'});
    }
    if(msg.t==='ctfPickup'&&isCapture()&&o.running&&o.ready){
      const last=o.localPositions.get(conn.peer);
      const connected=o.connections.has(conn.peer)&&
        performance.now()-(o.lastMoveAt.get(conn.peer)||0)<1800;
      if(connected&&last&&ctf.tryPickup(conn.peer,o.teams.get(conn.peer)||'blue',last)){
        broadcast({t:'ctfState',state:ctf.snapshot()});
      }
    }
    if(msg.t==='ability'&&typeof msg.kind==='string')receiveAbility(conn.peer,msg.kind,true);
    // Direct client hit claims intentionally ignored; only host ballistics apply damage.
  });conn.on('close',()=>{
      ctf.removePlayer(conn.peer,o.localPositions.get(conn.peer));o.lastMoveAt.delete(conn.peer);
      o.connections.delete(conn.peer);o.localPositions.delete(conn.peer);o.teams.delete(conn.peer);
      o.calibrationSeen.delete(conn.peer);teamUpdate();api.refreshHud?.();
      api.toast('UN JUGADOR SALIÓ DEL EQUIPO');
    });
    conn.on('error',()=>{
      ctf.removePlayer(conn.peer,o.localPositions.get(conn.peer));o.lastMoveAt.delete(conn.peer);
      o.connections.delete(conn.peer);o.localPositions.delete(conn.peer);o.teams.delete(conn.peer);
      o.calibrationSeen.delete(conn.peer);teamUpdate();api.refreshHud?.();
    })}
  function joinConnection(conn){o.conn=conn;conn.on('open',()=>{o.joined=true;teamUpdate();lobby('Conectado al anfitrión. Marquen los mismos dos puntos A y B del piso, en el mismo orden.');api.toast('CONEXIÓN COOPERATIVA ESTABLECIDA')});conn.on('data',m=>{if(!m||typeof m!=='object')return;
    if(m.t==='welcome'){o.myId=m.id;teamUpdate();
      if(m.gameMode)applyMode(m);
    }
    if(m.t==='gameConfig')applyMode(m);
    if(m.t==='ctfState'&&m.state)ctf.applyState(m.state);
    if(m.t==='ctfTag')api.ctfTag?.(m.power||1);
    if(m.t==='ctfEvent'&&isCapture()&&typeof m.message==='string'&&m.message.length<=140)api.event(m.message);
    if(m.t==='ctfBotShot'&&isCapture()&&o.origin&&Array.isArray(m.from)&&Array.isArray(m.to)&&m.from.length===3&&m.to.length===3){
      const a=originToWorld(from(m.from)),b=originToWorld(from(m.to));
      if(a.distanceTo(b)<12)api.ctfBotShot?.(a,b,m.team);
    }
    if(m.t==='ctfEnd'){ctf.applyState(m.state);o.finished=true;o.running=false;api.ctfFinish?.(m.winner,o.myTeam,m.state)}

    if(m.t==='reference')setReferenceTarget(m.length);
    if(m.t==='calibrationResult'&&m.status==='mismatch'){o.ready=false;o.referenceReady=false;o.calibrationQuality='mismatch';api.toast('LOS PUNTOS NO COINCIDEN · VOLVÉ A MARCAR B');ui();api.refreshHud?.()}
    if(m.t==='snapshot')receiveSnapshot(m);
    if(m.t==='teamShot')playTeamShot(m);
    if(m.t==='shotResult'&&Number.isInteger(m.enemyId))api.confirmedRemoteShot?.(m.headshot===true);
    if(m.t==='enemyHit'&&Number.isInteger(m.id)){
      const e=o.remoteEnemy.get(m.id);
      if(e?.alive){if(Number.isFinite(m.hp))e.hp=m.hp;
        e.staggerUntil=performance.now()+170;e.hitStagger=m.headshot===true?.14:.08;
      }
    }
    if(m.t==='enemyDown'&&Number.isInteger(m.id)){
      const e=o.remoteEnemy.get(m.id);
      if(e){e.alive=false;e.root.visible=false}
      api.teamElimination?.(m.killer===o.myId,!!m.headshot,m.count);
    }
    if(m.t==='start'){o.startedByHost=true;if(Array.isArray(m.hostage))syncHostage(m.hostage,false);if(o.ready)api.remoteStart()}
    if(m.t==='phase'){o.phase=m.phase;o.mask=m.mask;o.held=m.held;if(m.rescued){o.hostageRescued=true;if(o.hostageActor){o.hostageActor.hostage=false;playHuman(o.hostageActor,'walk')}}ui()}
    if(m.t==='hostage'){syncHostage(m.pos,m.rescued);ui()}
    if(m.t==='heal'){api.heal(m.amount||22)}
    if(m.t==='shield'){o.shields.set(o.myId,performance.now()+m.duration)}
    if(m.t==='fx'&&Array.isArray(m.pos))spawnFX(m.pos);
    if(m.t==='hitPlayer'){
       if(!isCapture()&&api.rescueProtected?.())return;
       api.damage(m.amount||7)
     }
    if(m.t==='win'){api.setGuestStats?.(m.clock,m.wave,m.kills);api.victory(!!m.result)}
    if(m.t==='msg'){api.toast(m.text)}
    if(m.t==='full'){lobby('La sala está llena (máximo 4 jugadores).');conn.close()}
  });conn.on('close',()=>{o.joined=false;teamUpdate();api.toast('SE PERDIÓ LA CONEXIÓN CON EL EQUIPO');lobby('Se perdió la conexión con el anfitrión. Reiniciá para volver a unirte.')});conn.on('error',e=>{lobby('No fue posible conectar: '+e.message)})}
  function code(){return Math.random().toString(36).slice(2,8).toUpperCase()}
  function createRoom(){if(!window.Peer){lobby('No se cargó PeerJS. Revisá la conexión a internet.');return}if(o.peer){lobby('Ya existe una sesión iniciada.');return}o.room=code();o.role='host';o.myId='lca-'+o.room;configureLobby();if(o.origin&&!o.referenceReady){o.ready=false;o.calibrationQuality='waiting';api.refreshHud?.()}o.peer=new window.Peer(o.myId,{debug:1});o.peer.on('open',()=>{lobby('SALA '+o.room+' · Compartí el código y marquen los mismos puntos A y B.');$('roomCode').textContent=o.room;$('copyRoom').classList.remove('hidden');teamUpdate()});o.peer.on('connection',register);o.peer.on('error',e=>{lobby('Error de conexión: '+(e?.message||'Reintentá'));api.toast('NO SE PUDO CREAR LA SALA');});}
  function joinRoom(){if(!window.Peer){lobby('No se cargó PeerJS. Revisá la conexión a internet.');return}if(o.peer){lobby('Ya existe una sesión iniciada.');return}const value=$('joinCode').value.trim().toUpperCase();if(!/^[A-Z0-9]{6}$/.test(value)){lobby('Ingresá un código de 6 caracteres.');return}o.room=value;o.role='guest';updateModeVisual();if(o.origin&&!o.referenceReady){o.ready=false;o.calibrationQuality='waiting';api.refreshHud?.()}o.peer=new window.Peer({debug:1});o.peer.on('open',()=>{joinConnection(o.peer.connect('lca-'+value,{reliable:true,serialization:'json'}));lobby('Conectando con sala '+value+'…')});o.peer.on('error',e=>{lobby('Error de red: '+(e?.message||'Sala no encontrada'))});teamUpdate()}
  function copyCode(){const link=location.origin+location.pathname+'?sala='+o.room;try{navigator.clipboard.writeText(link).then(()=>api.toast('ENLACE DE EQUIPO COPIADO')).catch(()=>api.toast('CÓDIGO DE SALA: '+o.room))}catch(e){api.toast('CÓDIGO DE SALA: '+o.room)}}
  function requestHit(id,power){
  if(!isCapture()&&api.rescueProtected?.())return;
  if(id==='hostage'){damageHostage(power);return}if(id===o.myId){if(!shielded())api.damage(power)}else if(o.connections.has(id)&&!shielded(id))send(o.connections.get(id),{t:'hitPlayer',amount:power})}
  function targets(){const list=[{id:o.myId,pos:position()}];for(const [id,p] of o.localPositions)list.push({id,pos:p});return list.filter(x=>x.pos)}
  function chooseTarget(){const t=targets();if(!t.length)return null;return t[Math.floor(Math.random()*t.length)]}
  function originToWorld(pos){if(!o.origin)return null;return o.origin.localToWorld(pos.clone())}
  function tick(dt,time){
    if(isCapture()){
      if(o.origin&&api.firstNest())o.origin.position.copy(api.firstNest().root.position);
      const p=position();
      if(isGuest()&&o.conn?.open&&p&&time-o.lastMove>140){o.lastMove=time;send(o.conn,{t:'move',p:P(p)})}
      if(o.role==='host'&&o.running&&o.origin&&time-o.lastSnap>165){o.lastSnap=time;broadcast(makeSnapshot())}
      if(isHost()&&o.origin){
        const seen=new Set();
        for(const [id,at] of o.localPositions){if(!at)continue;seen.add(id);let g=o.remoteAvatar.get(id);
          if(!g){g=avatar(o.teams.get(id)||'blue');o.origin.add(g);o.remoteAvatar.set(id,g)}
 tintAvatar(g,o.teams.get(id)||'blue');if(at)g.position.lerp(at,.42)}
        for(const [id,g] of o.remoteAvatar)if(!seen.has(id)){g.parent?.remove(g);o.remoteAvatar.delete(id)}
      }
      if(isGuest()&&o.running){
        const cameraPoint=position();
        for(const e of o.remoteEnemy.values()){
          if(!e.alive)continue;
          const prev=e.root.position.clone();e.root.position.lerp(e.start,clamp(0,1,dt*9));
          if(Number.isFinite(e.remoteYaw)){let delta=(e.remoteYaw-e.root.rotation.y+Math.PI)%(Math.PI*2);if(delta<0)delta+=Math.PI*2;delta-=Math.PI;e.root.rotation.y+=delta*clamp(0,1,dt*9)}
          const speed=e.root.position.distanceTo(prev)/Math.max(.001,dt);
          e.lodFar=cameraPoint?e.root.position.distanceTo(cameraPoint)>5.2:false;
          api.animateEnemy(e,dt,speed);api.animateHuman?.(e,dt,speed);
        }
      }
      ctf.tick(dt,time);
      if(time-(o.lastHudUpdate||0)>160){o.lastHudUpdate=time;ui()}
      return;
    }
    // Host confirmations are networked; an unanswered guest request
    // becomes retryable, never a permanent 99% lock.
    if(o.rescueRequestAt&&o.phase===-2&&
       performance.now()-o.rescueRequestAt>1600){
      clearRescueButton();
      api.toast('NO HUBO CONFIRMACIÓN · VOLVÉ A TOCAR LIBERAR');
    }
    if(o.rescueReinforcementAt&&isHost()&&o.phase===-1&&
       performance.now()>=o.rescueReinforcementAt){
      o.rescueReinforcementAt=0;
      try{api.spawn(5,false)}
      catch(err){console.warn('Rescue reinforcements',err)}
    }
    if(o.running&&isHost()&&o.phase===-1&&o.hostageActor){
      const player=localPositionOf(o.escortPlayer)||position();
      if(player){
        const current=o.hostageActor.root.position,delta=player.clone().sub(current);delta.y=0;
        const dist=delta.length();
        const maxGap=1.55,minGap=.98;
        let desired=null,speed=0;
        if(dist>maxGap){desired=player.clone();desired.y=current.y;speed=dist>3?1.65:1.25}
        else if(dist<minGap&&dist>.01){desired=current.clone().addScaledVector(delta.normalize(),-.65);speed=.65}
        if(desired){
          let goal=desired;
          if(api.environmentNextPoint&&o.origin){
            const start=originToWorld(current.clone()),target=originToWorld(desired.clone());
            const change=!o.routeTarget||o.routeTarget.distanceToSquared(target)>.35;
            const arrived=o.routeCache&&o.routeCache.distanceToSquared(start)<.045;
            if(!o.routeCache||change||arrived||time-o.routeCacheAt>720){
              o.routeCache=api.environmentNextPoint(start,target);
              o.routeCacheAt=time;o.routeTarget=target.clone();
            }
            if(o.routeCache)goal=o.origin.worldToLocal(o.routeCache.clone());
            else goal=null;
          }
          if(goal){
            const movement=goal.clone().sub(current);movement.y=0;
            const distance=movement.length();
            if(distance>.07){
              const step=movement.normalize().multiplyScalar(Math.min(speed*dt,distance));
              const next=current.clone().add(step);
              const open=!api.environmentCanMove||api.environmentCanMove(originToWorld(current.clone()),originToWorld(next.clone()),.22);
              if(open){current.copy(next);o.hostageActor.root.rotation.y=Math.atan2(step.x,step.z)}
            }
          }
        }
        const playerDistance=Math.hypot(player.x,player.z);
        if(Math.hypot(current.x,current.z)<1.75&&playerDistance<1.2){
          // Counter-terrorist hostage round: extracting alive wins the shared round.
          o.hostageRescued=true;setPhase(4);
        }
        o.hostagePos.copy(current);
      }
    }
    if(o.hostageActor){
      if(!o.hostageActor.mixer)animateHostageFallback(o.hostageActor,dt,o.phase===-1);
      animateHuman(o.hostageActor,dt,o.phase===-1?.26:0);
    }
    if(o.origin&&api.firstNest()){o.origin.position.copy(api.firstNest().root.position)}const p=position();
    if(o.role==='guest'&&o.conn?.open&&p&&time-o.lastMove>140){o.lastMove=time;send(o.conn,{t:'move',p:P(p)})}
    if(o.role==='host'&&o.running&&o.origin&&time-o.lastSnap>165){o.lastSnap=time;broadcast(makeSnapshot())}
    if(isHost()&&o.running&&o.phase===2&&api.active()){o.held=Math.max(0,o.held-dt);if(time>o.spawnAfter){o.spawnAfter=time+13000;if(api.enemies().filter(e=>e.alive).length<13)api.spawn(4,false)}if(o.held===0)setPhase(3)}
    for(let i=o.effects.length-1;i>=0;i--){const e=o.effects[i];e.t+=dt;e.mesh.scale.setScalar(1+e.t*9);e.mesh.material.opacity=Math.max(0,1-e.t/e.duration);if(e.t>e.duration){e.mesh.parent?.remove(e.mesh);o.effects.splice(i,1)}}
    o.objects.forEach((g,i)=>{g.visible=o.running&&o.phase===0&&!(o.mask&(1<<i));if(g.visible){g.userData.cap.position.y=.31+Math.sin(time*.003+i*1.8)*.055;g.userData.cap.rotation.y+=dt*1.4}});
    if(isHost()&&o.origin){const seen=new Set();for(const [id,p] of o.localPositions){if(!p)continue;seen.add(id);let g=o.remoteAvatar.get(id);if(!g){g=avatar();o.origin.add(g);o.remoteAvatar.set(id,g)}g.position.lerp(p,.42)}for(const [id,g] of o.remoteAvatar)if(!seen.has(id)){g.parent?.remove(g);o.remoteAvatar.delete(id)}}
    if(isGuest()&&o.running){const at=position();if(at){let near=false;for(const e of o.remoteEnemy.values()){const prev=e.root.position.clone();e.root.position.lerp(e.start,clamp(0,1,dt*9));if(Number.isFinite(e.remoteYaw)){let delta=(e.remoteYaw-e.root.rotation.y+Math.PI)%(Math.PI*2);if(delta<0)delta+=Math.PI*2;delta-=Math.PI;e.root.rotation.y+=delta*clamp(0,1,dt*9)}const moved=e.root.position.distanceTo(prev)/Math.max(.001,dt);e.lodFar=Math.hypot(e.root.position.x-at.x,e.root.position.z-at.z)>5.2;api.animateEnemy(e,dt,moved);api.animateHuman?.(e,dt,moved);
 if(e.staggerUntil&&time<e.staggerUntil){
   e.root.rotation.x=Math.sin((e.staggerUntil-time)/170*Math.PI)*(e.hitStagger||.08);
 }else if(e.staggerUntil){e.root.rotation.x=0;e.staggerUntil=0}
 if(Math.hypot(e.root.position.x-at.x,e.root.position.z-at.z)<2.4)near=true;}const el=$('alert');el.classList.toggle('hidden',!near)}for(const obj of o.remoteBullet.values())if(obj.userData.target)obj.position.lerp(obj.userData.target,clamp(0,1,dt*13))}
    for(const [id,g] of o.remoteAvatar){g.rotation.y+=dt*.4}
    if(o.running&&p&&(o.phase===0||o.phase===-2)){
     const near=o.phase===-2?
       !!o.hostagePos&&Math.hypot(p.x-o.hostagePos.x,p.z-o.hostagePos.z)<RESCUE_RANGE+.10:
       POSITION.some((v,i)=>!(o.mask&(1<<i))&&Math.hypot(p.x-v[0],p.z-v[2])<.93);
     interact.classList.toggle('hidden',!near);
     if(o.phase===-2){
       interact.classList.remove('rescuing');
       interact.style.removeProperty('--rescue-progress');
       interact.disabled=false;
       interact.textContent=o.rescueRequestAt?'ESPERANDO CONFIRMACIÓN…':'LIBERAR REHÉN · 1 TOQUE';
     }else interact.textContent='DESACTIVAR CARGA';
    }else interact.classList.add('hidden');
    for(const name of ['pulse','shield','heal']){const element=$(name);if(!element)continue;const remain=Math.max(0,(o.cd[name]||0)-performance.now());element.disabled=!o.running||remain>0;element.querySelector('small').textContent=remain?Math.ceil(remain/1000)+' s':'LISTO'}
    $('hud')?.classList.toggle('shieldOn',shielded());if(o.running&&time-(o.lastHudUpdate||0)>110){o.lastHudUpdate=time;ui()}}
  function ui(){
    if(isCapture()){
      const st=ctf.snapshot();
      $('hostageMeter').classList.add('hidden');
      info.classList.toggle('hidden',!api.active()&&!o.running);
      ability.classList.toggle('hidden',!api.active()&&!o.running);
      phaseEl.textContent='CAPTURA LA BANDERA · '+(o.myTeam==='blue'?'EQUIPO AZUL':'EQUIPO ROJO');
      const objective=ctf.objective(o.myTeam,o.myId);
      desc.textContent=o.running?(objective?.label||'Protegé a tu equipo y conseguí tres capturas.'):
        'Marcá las dos banderas y prepará tu escuadrón.';
      progress.textContent='AZUL '+st.scores.blue+' — '+st.scores.red+' ROJO · '+ctf.config.bots+' BOTS/EQUIPO';
      const near=ctf.pickupInfo(o.myTeam,position());
      interact.classList.toggle('hidden',!o.running||!near||near.distance>2.6);
      interact.disabled=!near?.available;
      if(near)interact.textContent=near.available?
        (near.handoff?'RECIBIR BANDERA ✓':'ROBAR BANDERA ✓'):
        'ACERCATE '+Math.max(0,near.distance-1.55).toFixed(1)+' m';
      return;
    }
    $('hostageMeter').classList.toggle('hidden',!o.running||o.phase>=0);
    $('hostageHP').textContent=Math.ceil(o.hostageHealth)+'%';
    $('hostageBar').style.width=o.hostageHealth+'%';
    info.classList.toggle('hidden',!api.active()&&!o.running);ability.classList.toggle('hidden',!api.active()&&!o.running);if(!o.running){phaseEl.textContent=o.hostagePos?'OBJETIVO DE RESCATE LISTO':'CALIBRAR Y UBICAR REHÉN';desc.textContent=o.hostagePos?'Iniciá la operación para liberar al rehén.':'Primero fijá un nido; luego ubicá al rehén lejos de la entrada.';progress.textContent=o.hostagePos?'REHÉN POSICIONADO':o.ready?'FALTA UBICAR REHÉN':'SIN CALIBRAR';return}
    if(o.phase<0){phaseEl.textContent=o.phase===-2?'01 / LIBERAR AL REHÉN':'01 / ESCOLTAR AL REHÉN';desc.textContent=o.phase===-2?'Acercate al rehén sin quedar expuesto. Tocá LIBERAR cuando estés cerca.':'Llevalo al primer punto de entrada. El equipo debe cubrir la extracción.';progress.textContent=o.phase===-2?(position()&&o.hostagePos?Math.hypot(position().x-o.hostagePos.x,position().z-o.hostagePos.z).toFixed(1)+' m AL REHÉN':'REHÉN RETENIDO'):(position()&&o.hostagePos?Math.hypot(o.hostagePos.x,o.hostagePos.z).toFixed(1)+' m A ZONA SEGURA':'EXTRACCIÓN EN CURSO');return}
    const phase=PHASES[Math.min(o.phase,3)];phaseEl.textContent=phase.title;desc.textContent=phase.detail;if(o.phase===0)progress.textContent=[o.mask&1?1:0,o.mask&2?1:0,o.mask&4?1:0].reduce((a,b)=>a+b,0)+'/3 CARGAS';if(o.phase===1)progress.textContent=api.enemies().filter(e=>e.alive).length+' INTRUSOS';if(o.phase===2)progress.textContent=Math.ceil(o.held)+' S PARA RESISTIR';if(o.phase===3)progress.textContent='REDUCIR AL JEFE';teamUpdate()}
  const query=new URLSearchParams(location.search).get('sala');if(query&&/^[a-z0-9]{6}$/i.test(query)){$('joinCode').value=query.toUpperCase();lobby('Código recibido. Tocá UNIRME antes de iniciar la cámara.')}
  interact.addEventListener('click',event=>{
     event.preventDefault();if(isCapture())pickupFlag();else beginRescueTap();
   });
  $('createRoom').addEventListener('click',createRoom);$('joinRoom').addEventListener('click',joinRoom);$('copyRoom').addEventListener('click',copyCode);$('pulse').addEventListener('click',()=>abilityNow('pulse'));$('shield').addEventListener('click',()=>abilityNow('shield'));$('heal').addEventListener('click',()=>abilityNow('heal'));
  teamUpdate();ui();function navigationTarget(){
 if(isCapture()&&o.origin&&o.running){
   const objective=ctf.objective(o.myTeam,o.myId);
   return objective?{world:originToWorld(objective.position),label:objective.label}:null;
 }
 if(!o.origin||!o.running||o.finished||!o.hostagePos||o.phase>=0)return null;
 const target=o.phase===-2?o.hostagePos:new THREE.Vector3(0,0,0);
 return{world:originToWorld(target.clone()),label:o.phase===-2?'REHÉN':'EXTRACCIÓN'};
}
function networkState(){
 if(o.role!=='guest')return 'local';
 if(!o.conn?.open)return 'offline';
 if(o.calibrationQuality==='mismatch')return 'mismatch';
 if(!o.ready)return 'aligning';
 const delta=performance.now()-o.lastHostSnapshot;
 if(!o.lastHostSnapshot)return 'waiting';
 return delta>3100?'stale':'synced';
}
return{align,alignSecond,alignmentStatus,needsReference,teamCalibration,updateTrackedFrame,roomOrigin:()=>o.origin,configureLobby,chooseMyTeam,isCapture,teamOf,placeFlag,captureStatus,captureBotDown,capturePlayersWorld,relayCTFBotShot,tagEnemyPlayer,reset,start,navigationTarget,networkState,relayShot,relayEnemyHit,relayEnemyDown,placeHostage,hostageWorld,hostageExposed:()=>o.running&&o.phase<0&&o.hostageHealth>0,damageHostage,healHostage,hasHostage:()=>!!o.hostagePos,
 hostageRenderPoint:()=>{
  if(!o.hostageActor?.root?.parent)return null;
  const pos=new THREE.Vector3();
  o.hostageActor.root.getWorldPosition(pos);pos.y+=1.12;return pos;
 },
 isGuest,isHost,pickupFlag,ui,tick,onKill,shielded,abilityNow,requestHit,chooseTarget,originToWorld,broadcast,onVictory:(result)=>{if(isHost())broadcast({t:'win',result,clock:api.clock(),wave:api.wave(),kills:api.kills?.()||0})},localId:()=>o.myId,getPlayerWorld:id=>{if(id==='hostage')return hostageWorld();const p=localPositionOf(id);return p&&o.origin?originToWorld(p):null},playerPosition:id=>localPositionOf(id),room:()=>o.room,ready:()=>o.ready,running:()=>o.running,role:()=>o.role};
}