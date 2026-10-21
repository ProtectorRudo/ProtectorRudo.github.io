import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.181.0/build/three.module.js';
import { Spring } from './spring.js';
import { createMission } from './missions.js';
import { createTacticalActor } from './tactical.js';
import {attachHuman,animateHuman,preloadHumans,disposeHuman} from './animated-humans.js';
import {createCombatFX} from './combat-fx.js';
import {createSpatialMap} from './spatial-map.js';
import { createTacticalRifle } from './rifle.js';
import { steerEnemy, animateEnemy } from './walkers.js';
import { tacticalDestination } from './tactical-behavior.js';
const $=id=>document.getElementById(id),rnd=(a,b)=>a+Math.random()*(b-a),clamp=THREE.MathUtils.clamp;
const world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.01,60);
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.28;renderer.setPixelRatio(Math.min(devicePixelRatio,1.55));renderer.setSize(innerWidth,innerHeight);$('world').append(renderer.domElement);
world.add(new THREE.HemisphereLight(0xd8e8f1,0x2c1c28,2.15));const key=new THREE.DirectionalLight(0xf3cbb3,1.95);key.position.set(2,4,1);world.add(key);const rim=new THREE.PointLight(0x86a5b3,2.9,6);rim.position.set(-1,1.7,-2);world.add(rim);
const geo={ball:new THREE.SphereGeometry(1,16,12),lo:new THREE.SphereGeometry(1,9,7),tube:new THREE.CylinderGeometry(1,1,1,8),fang:new THREE.ConeGeometry(1,1,8)};
function tex(){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#aaaaaa';ctx.fillRect(0,0,256,256);for(let i=0;i<11000;i++){let k=Math.floor(rnd(40,200));ctx.fillStyle='rgba('+k+','+k+','+k+','+rnd(.04,.27)+')';const s=rnd(.3,2.6);ctx.fillRect(rnd(0,256),rnd(0,256),s,s)}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,2);return t}
const rough=tex();const mat={skin:new THREE.MeshStandardMaterial({color:0x726663,roughness:.91,bumpMap:rough,bumpScale:.04}),dark:new THREE.MeshStandardMaterial({color:0x2a2b31,roughness:.96,bumpMap:rough,bumpScale:.055}),wet:new THREE.MeshStandardMaterial({color:0x783c42,roughness:.65,metalness:.06,bumpMap:rough,bumpScale:.026}),bone:new THREE.MeshStandardMaterial({color:0xc5b9a3,roughness:.8}),eye:new THREE.MeshStandardMaterial({color:0xff6848,emissive:0xdb3119,emissiveIntensity:2.1}),mouth:new THREE.MeshBasicMaterial({color:0x060405}),hit:new THREE.MeshBasicMaterial({visible:false}),blood:new THREE.MeshBasicMaterial({color:0xa23a3e,transparent:true,opacity:.94}),shot:new THREE.MeshBasicMaterial({color:0xffdfaf,transparent:true,depthTest:false}),sigil:new THREE.MeshBasicMaterial({color:0xb55e55,transparent:true,opacity:.9,side:THREE.DoubleSide})};
function node(root,g,m,p,s,rot){const o=new THREE.Mesh(g,m);o.position.set(...p);o.scale.set(...s);if(rot)o.rotation.set(...rot);root.add(o);return o}
function segment(root,m,a,b,r1,r2){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),v=q.clone().sub(p),o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,v.length(),8),m);o.position.copy(p.add(q).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());root.add(o);return o}
function creature(variant){return createTacticalActor(THREE,variant,'raider')}
const reticle=new THREE.Group();const ring=new THREE.Mesh(new THREE.RingGeometry(.11,.128,36).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x91e5be,side:THREE.DoubleSide,depthTest:false}));ring.renderOrder=10;reticle.add(ring);reticle.visible=false;world.add(reticle);
let ar=null,local=null,source=null,mode='idle',placing=true,active=false,ended=false,pose=null,hitResult=null,surfaces=[],occluders=[],nests=[],enemies=[],orbs=[],trails=[],splinters=[],life=100,round=0,ammo=28,reloading=false,kills=0,seconds=480,newRound=0,now=0,previous=0,lastTouch=0,lastShot=0,monsterId=0,projectileId=0,toastExpiry=0,eventExpiry=0,drag=false,yaw=0,pitch=0,audio,mission=null,joystick={x:0,y:0};
const ray=new THREE.Raycaster(),vec=new THREE.Vector3(),quat=new THREE.Quaternion(),getCam=()=>mode==='ar'?renderer.xr.getCamera(camera):camera;
const combatFX=createCombatFX(world,getCam);
const spatialMap=createSpatialMap(THREE,world);
let mapping=false,mapKind='area',mapFirst=null,mapPoint=null,mapDepth=null,mapDepthSource='none',mapManualDistance=1.8,mapPointQuality='manual',lastMapUI=0,mapFastSpan=2,mapPrecise=false,mapGhost=null,mapFirstGhost=null,mapManualOverride=false;
const mapHint=$('mapInstruction');
function mapStatus(){
 const zone=spatialMap.area;
 const value=(zone?'ZONA '+zone.width.toFixed(1)+' × '+zone.depth.toFixed(1)+' m · ':'ZONA PENDIENTE · ')+
  spatialMap.walls.length+' PAREDES / '+spatialMap.boxes.length+' MUEBLES · '+
  (mapDepthSource==='cpu'?'PROFUNDIDAD':mapPointQuality==='manual'?'ESTIMADO':'PLANO DETECTADO');
 if($('environmentStatus').textContent!==value)$('environmentStatus').textContent=value;
}
// The guided scanner works with a single tap. Two-endpoint mode is opt-in.
function mapSizeAt(point){
 const c=getCam(),q=new THREE.Quaternion();c.getWorldQuaternion(q);
 const right=new THREE.Vector3(1,0,0).applyQuaternion(q),forward=new THREE.Vector3(0,0,-1).applyQuaternion(q);
 right.y=0;forward.y=0;
 if(right.lengthSq()<.02)right.set(1,0,0);else right.normalize();
 if(forward.lengthSq()<.02)forward.set(0,0,-1);else forward.normalize();
 const floorY=nests[0]?.root.position.y??point.y;
 if(mapKind==='wall'){
  const half=mapFastSpan/2;
  const a=point.clone().addScaledVector(right,-half),b=point.clone().addScaledVector(right,half);
  return {a,b,options:{floorY,height:2.4}};
 }
 // An axis-aligned box is conservative: slight extra width catches sofa corners.
 const halfX=Math.max(.35,Math.abs(right.x)*mapFastSpan*.5+Math.abs(forward.x)*.43);
 const halfZ=Math.max(.35,Math.abs(right.z)*mapFastSpan*.5+Math.abs(forward.z)*.43);
 return {a:new THREE.Vector3(point.x-halfX,floorY,point.z-halfZ),b:new THREE.Vector3(point.x+halfX,floorY,point.z+halfZ),options:{floorY,height:.93}};
}
function mapPreview(){
 if(!mapGhost){
  mapGhost=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:0x79d5c9,transparent:true,opacity:.24,depthWrite:false,side:THREE.DoubleSide}));
  mapGhost.renderOrder=7;world.add(mapGhost);
 }
 if(!mapFirstGhost){
  mapFirstGhost=new THREE.Mesh(new THREE.SphereGeometry(.08,12,8),new THREE.MeshBasicMaterial({color:0xffda82,transparent:true,opacity:.9,depthTest:false}));
  world.add(mapFirstGhost);
 }
 mapGhost.visible=!!mapping&&!!mapPoint&&(mapKind!=='area'||!!mapFirst);
 mapFirstGhost.visible=!!mapping&&!!mapFirst&&(mapKind==='area'||mapPrecise);
 if(mapFirstGhost.visible)mapFirstGhost.position.copy(mapFirst);
 if(!mapGhost.visible)return;
 if(mapKind==='area'){
   const room=mission?.roomOrigin?.();
   if(!room||!mapFirst){mapGhost.visible=false;return}
   const a=room.worldToLocal(mapFirst.clone()),b=room.worldToLocal(mapPoint.clone());
   const dx=Math.abs(b.x-a.x),dz=Math.abs(b.z-a.z);
   const mid=room.localToWorld(new THREE.Vector3((a.x+b.x)/2,Math.min(a.y,b.y)+.024,(a.z+b.z)/2));
   mapGhost.position.copy(mid);mapGhost.quaternion.copy(room.quaternion);
   mapGhost.scale.set(Math.max(.02,dx),.017,Math.max(.02,dz));
   mapGhost.material.color.setHex(dx>=1.4&&dz>=1.4?0x6ef5c0:0xffa06c);
   return;
 }
 const zone=mapSizeAt(mapPoint),floorY=zone.options.floorY;
 if(mapPrecise&&mapFirst){
   const dx=mapPoint.x-mapFirst.x,dz=mapPoint.z-mapFirst.z,length=Math.max(.05,Math.hypot(dx,dz));
   const mid=mapFirst.clone().add(mapPoint).multiplyScalar(.5);
   mapGhost.position.set(mid.x,floorY+(mapKind==='wall'?1.2:.465),mid.z);
   if(mapKind==='wall'){
     mapGhost.scale.set(.14,2.4,length);
     mapGhost.rotation.y=Math.atan2(dx,dz);
   }else{
     mapGhost.scale.set(Math.max(.3,Math.abs(dx)),.93,Math.max(.3,Math.abs(dz)));
     mapGhost.rotation.y=0;
   }
 }else if(mapKind==='wall'){
   const dx=zone.b.x-zone.a.x,dz=zone.b.z-zone.a.z;
   mapGhost.position.set(mapPoint.x,floorY+1.2,mapPoint.z);
   mapGhost.scale.set(.13,2.4,Math.hypot(dx,dz));
   mapGhost.rotation.y=Math.atan2(dx,dz);
 }else{
   mapGhost.position.set(mapPoint.x,floorY+.465,mapPoint.z);
   mapGhost.scale.set(zone.b.x-zone.a.x,.93,zone.b.z-zone.a.z);
   mapGhost.rotation.y=0;
 }
 mapGhost.material.color.setHex(mapKind==='wall'?0x65ddcc:0xe7b870);
}
function mapControls(force=false){
 if(mapping&&!mapPoint){
  const c=getCam(),at=new THREE.Vector3(),dir=new THREE.Vector3();
  c.getWorldPosition(at);c.getWorldDirection(dir);
  mapPoint=mapKind==='area'?
    estimateFloorPoint(nests[0]?.root.position.y??null):
    at.addScaledVector(dir,mapManualOverride?mapManualDistance:(mapDepth||mapManualDistance));
  mapPointQuality=mapKind==='area'?'manual':mapDepth&&!mapManualOverride?'depth':'manual';
  reticle.position.copy(mapPoint);reticle.visible=true;
 }
 mapPreview();
 const time=performance.now();if(!force&&time-lastMapUI<135)return;lastMapUI=time;
 $('mapMethod').textContent=mapPointQuality==='plane'?'✓ PISO O SUPERFICIE DETECTADA':
  mapKind==='area'?'≈ PISO ESTIMADO · COMPROBÁ LOS BORDES VISUALMENTE':
  mapPointQuality==='depth'?'✓ PROFUNDIDAD MEDIDA':
  '≈ POSICIÓN ESTIMADA: AJUSTÁ LA DISTANCIA SI HACE FALTA';
 $('mapPanel').classList.toggle('hidden',!mapping);
 $('mapWall').classList.toggle('active',mapKind==='wall');
 $('mapFurniture').classList.toggle('active',mapKind==='box');
 $('mapArea').classList.toggle('active',mapKind==='area');
 $('mapSize').classList.toggle('hidden',mapKind==='area');
 $('mapDistance').classList.toggle('hidden',mapKind==='area');
 $('mapPrecision').classList.toggle('hidden',mapKind==='area');
 document.querySelector('label[for="mapSize"]')?.classList.toggle('hidden',mapKind==='area');
 document.querySelector('label[for="mapDistance"]')?.classList.toggle('hidden',mapKind==='area');
 $('mapMark').disabled=!mapping;
 $('mapMark').textContent=mapKind==='area'?
  (mapFirst?'◎ MARCAR ESQUINA 2 · CERRAR ZONA':'◎ MARCAR ESQUINA 1'):
  mapPrecise?(mapFirst?'◎ MARCAR SEGUNDO EXTREMO':'◎ MARCAR PRIMER EXTREMO'):
  '◎ AGREGAR '+(mapKind==='wall'?'PARED':'MUEBLE');
 $('mapPrecision').textContent=mapPrecise?'✓ AJUSTE FINO ACTIVADO · 2 TOQUES':'AJUSTE FINO: 2 EXTREMOS';
 $('mapInstruction').textContent=mapKind==='area'?
  (mapFirst?'Paso 2/2 · Apuntá a la esquina opuesta del piso y tocá CERRAR ZONA.':
    'Paso 1/2 · Apuntá a una esquina libre del piso. Después marcá la opuesta.'):
  mapPrecise?(mapFirst?'Apuntá al otro extremo y tocá MARCAR.':
    'Marcá el primer extremo de la '+(mapKind==='wall'?'pared.':'zona del mueble.')):
    'Apuntá al centro del '+(mapKind==='wall'?'muro.':'mueble.')+' Tocá AGREGAR una vez.';
 mapStatus();
}
function toggleMap(enabled){
 if(!nests.length&&enabled){toast('PRIMERO MARCÁ LA ENTRADA EN EL PISO');return}
 if(!!mission?.isGuest()&&enabled){toast('EL ANFITRIÓN CONFIGURA EL ESPACIO');return}
 mapping=enabled;mapFirst=null;mapPoint=null;lastMapUI=0;mapManualOverride=false;
 if(enabled){mapKind='area';mapPrecise=true}
 spatialMap.setVisible(enabled);
 if(!mapping){$('mapPanel').classList.add('hidden');toast(spatialMap.area?
  'ZONA DELIMITADA · RECORDÁ QUE LOS OBSTÁCULOS REALES SIGUEN AHÍ':
  'ZONA SIN DELIMITAR · PODÉS VOLVER A CONFIGURARLA')}
 else toast('MARCÁ DOS ESQUINAS OPUESTAS DEL PISO · NO HACE FALTA MAPEAR MUEBLES');
 mapControls(true);
}
function markMapPoint(){
 if(!mapping){toast('PRIMERO ACTIVÁ EL MAPEO');return}
 if(!mapPoint)mapControls(true);
 if(!mapPoint)return toast('MOVÉ LENTAMENTE EL TELÉFONO');
 if(mapKind==='area'){
   const room=mission?.roomOrigin?.();
   if(!room)return toast('PRIMERO TERMINÁ LA CALIBRACIÓN DE ENTRADA');
   const point=mapPoint.clone();point.y=nests[0]?.root.position.y??point.y;
   if(!mapFirst){
     mapFirst=point;tone('hit');vibrate(25);
     toast('ESQUINA 1 ✓ · MARCÁ LA ESQUINA OPUESTA');mapControls(true);return;
   }
   const a=mapFirst.clone(),created=spatialMap.setArea(a,point,room);
   if(!created)return toast('ZONA MUY ANGOSTA O MUY GRANDE · ELEGÍ ESQUINAS MÁS SEPARADAS');
   mapFirst=null;tone('hit');vibrate([30,35,30]);
   toast('ZONA DE JUEGO LISTA ✓ · LOS BORDES LIMITAN A LOS BOTS');
   mapControls(true);return;
 }
 let result=null;
 const floor=nests[0]?.root.position.y??mapPoint.y;
 if(!mapPrecise){
  const zone=mapSizeAt(mapPoint);
  result=mapKind==='wall'?spatialMap.addWall(zone.a,zone.b,zone.options):spatialMap.addBox(zone.a,zone.b,zone.options);
 }else if(!mapFirst){
  mapFirst=mapPoint.clone();tone('hit');toast('PRIMER EXTREMO MARCADO');
  mapControls(true);return;
 }else{
  result=mapKind==='wall'?spatialMap.addWall(mapFirst,mapPoint,{floorY:floor,height:2.4}):spatialMap.addBox(mapFirst,mapPoint,{floorY:floor,height:.93});
  mapFirst=null;
 }
 if(!result)return toast('ESE OBJETO NO SE PUDO MARCAR · PROBÁ DESDE MÁS CERCA');
 tone('hit');vibrate(30);
 toast((mapKind==='wall'?'PARED':'MUEBLE')+' AGREGADO ✓'+(mapPointQuality==='manual'?' · POSICIÓN APROXIMADA':''));
 mapControls(true);
}
function vibrate(a){try{navigator.vibrate?.(a)}catch(e){}}
function tone(type){try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),o2=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;o.type='sawtooth';o2.type='triangle';const f=type==='fire'?145:type==='hurt'?76:440;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(type==='fire'?36:55,t+.18);o2.frequency.setValueAtTime(f*1.6,t);o2.frequency.exponentialRampToValueAtTime(50,t+.16);g.gain.setValueAtTime(type==='fire'?.13:.055,t);g.gain.exponentialRampToValueAtTime(.0001,t+.2);o.connect(g);o2.connect(g);g.connect(audio.destination);o.start(t);o2.start(t);o.stop(t+.21);o2.stop(t+.20)}catch(e){}}
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');toastExpiry=performance.now()+2100}
function event(s){$('event').textContent=s;$('event').classList.remove('hidden');eventExpiry=performance.now()+2400;vibrate([60,30,75])}

let lastHudRefresh=0,referenceMarker=null,referenceAnchor=null,lastReferenceUpdate=0,ctfTaggedUntil=0;
function hud(force=false){
 const t=performance.now();if(!force&&t-lastHudRefresh<85)return;lastHudRefresh=t;
 const guest=!!mission?.isGuest(),alignment=mission?.alignmentStatus?.(),needsB=!!alignment?.needsSecond;
 const hasEntrance=nests.length>0,hostageReady=!!mission?.hasHostage();
 const team=mission?.captureStatus?.(),ctf=mission?.isCapture?.();
 const teamReady=mission?.teamCalibration?.();
 let stage,stepText,guide,detail,action;
 if(ctf){
   const bases=team?.bases||{};
   stage=!hasEntrance?0:needsB?1:!bases.blue?2:!bases.red?3:4;
   const labels=['◎ MARCAR PUNTO A','◎ MARCAR PUNTO B','◎ COLOCAR BANDERA AZUL','◎ COLOCAR BANDERA ROJA','✓ BANDERAS LISTAS'];
   action=labels[stage];
   stepText=['PASO 1 · ENTRADA','PASO 2 · ORIENTACIÓN','PASO 3 · BASE AZUL','PASO 4 · BASE ROJA','LISTOS PARA CAPTURAR'][stage];
   guide=stage===0?'Apuntá al piso para marcar el punto A':stage===1?'Marcá el mismo punto B que tu equipo':
     stage===2?'Colocá la bandera de tu equipo':stage===3?'Colocá la bandera enemiga':'Dos bases confirmadas';
   detail=stage===0?'Todos marquen exactamente el mismo punto físico.':
    stage===1?'Punto B a 1–7 metros de A. Todos usan los mismos puntos.':
    stage===2?'Apuntá al piso y elegí dónde defenderás tu bandera azul.':
    stage===3?'Elegí la base roja, separada al menos 1,6 metros.':
    teamReady?.ready===false?'Esperando: '+teamReady.done+' de '+teamReady.total+' compañeros calibrados.':
    'Capturá la bandera rival y regresá a la tuya. ¡Primero en llegar a 3 puntos gana!';
   const sc=team?.scores||{blue:0,red:0};
   $('ctfScoreboard').classList.remove('hidden');
   $('ctfBlueScore').textContent='AZUL '+sc.blue;
   $('ctfRedScore').textContent=sc.red+' ROJO';
   const flags=team?.flags||{};
   const holder=Object.keys(flags).find(t=>flags[t]?.carrier);
   $('ctfFlagStatus').textContent=team?.winner?'RONDA TERMINADA':
     (team?.objective||(holder?'BANDERA '+(holder==='blue'?'AZUL':'ROJA')+' ROBADA':
     'PRIMERO EN LLEGAR A 3 CAPTURAS'));
 }else{
   $('ctfScoreboard').classList.add('hidden');
   stage=!hasEntrance?0:needsB?1:!hostageReady?2:3;
   const awaitingHost=guest&&needsB&&alignment?.referenceLength>0&&alignment?.quality==='waiting';
   action=['◎ MARCAR PUNTO A','◎ MARCAR PUNTO B','◎ COLOCAR REHÉN','✓ POSICIÓN LISTA'][stage];
   stepText=['PASO 1 · ENTRADA','PASO 2 · ORIENTACIÓN','PASO 3 · REHÉN','LISTOS PARA RESCATAR'][stage];
   guide=stage===0?'Todos apunten al mismo lugar del piso':stage===1?(awaitingHost?'Punto B marcado · esperando al anfitrión':'Apunten al MISMO segundo punto del piso'):stage===2?(guest?'Esperá que el anfitrión coloque al rehén':'Elegí dónde estará el rehén'):(guest?'El anfitrión comienza la partida':'Posiciones compartidas configuradas');
   detail=stage===0?'Marcá el punto A, por ejemplo junto a una esquina. Todos usan el mismo.':
    stage===1?(alignment?.quality==='mismatch'?'La separación no coincide. Repetí B.':'Elegí un punto B a 1–7 metros del A, el mismo para todos.'):
    stage===2?'Podés mapear paredes o muebles antes de empezar; es opcional.':
    teamReady?.ready===false?'Esperando al equipo: '+teamReady.done+' de '+teamReady.total+' compañeros calibrados.':
    'Todos verán los mismos enemigos y al mismo rehén.';
 }
 const waiting=guest&&needsB&&alignment?.referenceLength>0&&alignment?.quality==='waiting';
 const stageDone=ctf?stage===4:stage===3;
 $('smartPlace').classList.toggle('hidden',stageDone||guest&&stage>=2||waiting);
 $('smartPlace').disabled=active;
 $('smartPlace').textContent=action;
 $('mapToggle').classList.toggle('hidden',!hasEntrance||needsB||guest||active);
 $('begin').classList.toggle('hidden',!stageDone||guest);
 $('setupStep').textContent=stepText;
 $('setupGuide').textContent=guide;
 $('setupDetail').textContent=detail;
 $('hostage').disabled=!hasEntrance||needsB||guest||active;
 $('begin').disabled=!stageDone||guest||teamReady?.ready===false;
 $('health').textContent=Math.ceil(life)+'%';$('healthBar').style.width=life+'%';
 $('wave').textContent=ctf?'CTF':round?String(round).padStart(2,'0'):'—';
 const clock=ctf?(team?.clock??480):seconds;
 $('clock').textContent=String(Math.floor(clock/60)).padStart(2,'0')+':'+String(Math.max(0,Math.floor(clock%60))).padStart(2,'0');
 const ammoHtml=ammo+'<span> / '+capacity()+'</span>';
 if($('ammo').innerHTML!==ammoHtml)$('ammo').innerHTML=ammoHtml;
 $('nestCount').textContent=!hasEntrance?'PUNTO A PENDIENTE':needsB?'A ✓ · FALTA B':
  ctf?stage===2?'A ✓ · B ✓ · FALTA BANDERA AZUL':stage===3?'AZUL ✓ · FALTA BANDERA ROJA':'AMBAS BANDERAS ✓':
  hostageReady?'A ✓ · B ✓ · REHÉN ✓':'ALINEACIÓN ✓';
 $('begin').textContent=ctf?'▶ EMPEZAR CAPTURA':'▶ EMPEZAR RESCATE';
}
function ui(){if(mapping){$('mapPanel').classList.remove('hidden')}$('swapGun').classList.toggle('hidden',!active);$('setup').classList.toggle('hidden',!placing);$('fight').classList.toggle('hidden',placing);$('gunCanvas').classList.toggle('hidden',!active);$('hint').classList.toggle('hidden',!placing);$('sightText').textContent=placing?'APUNTÁ AL PISO':'';hud(true)}
function cleanup(){
 killFeedUntil=0;$('killFeed').classList.add('hidden');
 if(referenceAnchor){try{referenceAnchor.delete()}catch(_){}}referenceAnchor=null;
 if(referenceMarker){referenceMarker.parent?.remove(referenceMarker);referenceMarker.traverse(x=>{x.geometry?.dispose?.();if(x.material&&!Array.isArray(x.material))x.material.dispose?.()});referenceMarker=null}
 ctfTaggedUntil=0;spawnQueue.length=0;nextSpawnTime=0;$('zoneProximity').classList.add('hidden');$('ctfScoreboard').classList.add('hidden');$('navGuide').classList.add('hidden');$('netSignal').classList.add('hidden');spatialMap.clear();mapping=false;if(mapGhost)mapGhost.visible=false;if(mapFirstGhost)mapFirstGhost.visible=false;$('mapPanel').classList.add('hidden');mapFirst=null;mapPoint=null;mapStatus();for(const e of enemies){disposeHuman(e);e.root.parent?.remove(e.root)}for(const n of nests){try{n.anchor?.delete()}catch(e){}world.remove(n.root)}for(const i of [...orbs,...trails,...splinters])world.remove(i.mesh);nests=[];enemies=[];orbs=[];trails=[];splinters=[]}
function reset(){mission?.reset();triggerHeld=false;aiming=false;aimBlend=0;$('aimMode').classList.remove('aimed');$('aimMode').textContent='MIRA ◎';$('sight').classList.remove('ads');if(mode==='demo'){camera.fov=65;camera.updateProjectionMatrix()}cleanup();placing=true;active=false;ended=false;round=0;kills=0;currentWeapon='rifle';magazines={rifle:28,pistol:12};ammo=28;if(gunReady)syncWeapon();reloading=false;seconds=480;life=100;newRound=0;pose=null;hitResult=null;previous=0;lastHudRefresh=0;lastReferenceUpdate=0;ui();toast('APUNTÁ AL PISO Y TOCÁ MARCAR ENTRADA')}
function estimateFloorPoint(floorY=null){
 const c=getCam(),eye=new THREE.Vector3(),forward=new THREE.Vector3();
 c.getWorldPosition(eye);c.getWorldDirection(forward);
 const y=Number.isFinite(floorY)?floorY:eye.y-1.36;
 let p=null;
 if(forward.y<-.13){const t=(y-eye.y)/forward.y;if(t>=.65&&t<=5)p=eye.clone().addScaledVector(forward,t)}
 if(!p){forward.y=0;if(forward.lengthSq()<.02)forward.set(0,0,-1);forward.normalize();p=eye.clone().addScaledVector(forward,1.85)}
 p.y=y;return p;
}
function currentFloorTarget(){
 let point=null,detected=false,anchor=null;
 const eye=new THREE.Vector3();getCam().getWorldPosition(eye);
 if(mode==='ar'&&pose){
  const found=new THREE.Vector3().setFromMatrixPosition(pose);
  if(eye.y-found.y>.85&&eye.y-found.y<2.7){point=found;detected=true;anchor=hitResult}
 }
 if(mode==='demo'){
  ray.setFromCamera({x:0,y:0},camera);
  const floor=ray.intersectObjects(surfaces,false).find(h=>Math.abs(h.point.y)<.18);
  if(floor){point=floor.point.clone();detected=true}
 }
 if(!point)point=estimateFloorPoint(nests[0]?.root.position.y??(mode==='demo'?0:null));
 return{point,detected,anchor};
}
function place(){
 if(mapping||!placing||nests.length>=7)return;
 const target=currentFloorTarget(),point=target.point;
 if(!point)return toast('APUNTÁ HACIA EL PISO');
 const root=new THREE.Group();root.position.copy(point);world.add(root);
 const circle=new THREE.Mesh(new THREE.TorusGeometry(.16,.006,6,42).rotateX(-Math.PI/2),mat.sigil);circle.position.y=.012;root.add(circle);
 const n={root,anchor:null,radius:.68,floor:true,surfaceScale:1};nests.push(n);
 if(mode==='ar'&&target.detected&&target.anchor&&typeof target.anchor.createAnchor==='function')Promise.resolve(target.anchor.createAnchor()).then(anchor=>{if(nests.includes(n))n.anchor=anchor}).catch(()=>{});
 if(nests.length===1)mission?.align(n.root);hud(true);tone('hit');vibrate(30);
 toast(target.detected?'ENTRADA FIJADA EN EL PISO ✓':'ENTRADA APROXIMADA ✓ · VOLVÉ A MARCAR SI NO COINCIDE');
}
function markReferenceB(){
 if(!nests.length||!mission?.needsReference?.())return;
 const chosen=currentFloorTarget(),b=chosen.point.clone();
 const ok=mission?.alignSecond?.(nests[0].root,b,chosen.detected);
 if(!ok){hud(true);return}
 if(referenceMarker)referenceMarker.parent?.remove(referenceMarker);
 referenceMarker=new THREE.Group();referenceMarker.position.copy(b);
 const line=new THREE.Mesh(new THREE.TorusGeometry(.19,.009,7,42).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x80f5c8,transparent:true,opacity:.94}));
 line.position.y=.015;referenceMarker.add(line);
 world.add(referenceMarker);
 if(mode==='ar'&&chosen.detected&&chosen.anchor?.createAnchor){
   Promise.resolve(chosen.anchor.createAnchor()).then(a=>{if(referenceMarker){referenceAnchor=a}else a.delete?.()}).catch(()=>{});
 }
 tone('hit');vibrate(35);hud(true);
}
function placeFlag(team){
 if(mapping||!placing||!nests.length)return;
 if(mission?.isGuest()){toast('EL ANFITRIÓN ELIGE LAS BANDERAS');return}
 const target=currentFloorTarget(),at=target.point.clone();
 at.y=nests[0].root.position.y;
 if(spatialMap.area&&spatialMap.areaDistance(at)<.38)
   return toast('BANDERA FUERA DE LA ZONA SEGURA · APUNTÁ DENTRO DEL PERÍMETRO');
 if(mission?.placeFlag?.(team,at)){hud(true);tone('hit');vibrate(40);toast('BANDERA '+(team==='blue'?'AZUL':'ROJA')+' COLOCADA ✓')}
 else toast('COLOCÁ LA BANDERA MÁS LEJOS DE LA OTRA · MÍNIMO 1,6 m');
}
function smartAction(){
 if(!nests.length){place();return}
 if(mission?.needsReference?.()){markReferenceB();return}
 if(mission?.isCapture?.()){
  const bases=mission.captureStatus()?.bases||{};
  if(!bases.blue)placeFlag('blue');else if(!bases.red)placeFlag('red');
  return;
 }
 placeHostage();
}
function placeHostage(){
 if(mapping)return toast('TERMINÁ EL MAPEO PRIMERO');
 if(!placing||!nests.length)return toast('PRIMERO MARCÁ LA ENTRADA');
 if(mission?.needsReference?.())return toast('PRIMERO MARCÁ TAMBIÉN EL PUNTO B');
 if(mission?.isGuest())return toast('EL ANFITRIÓN COLOCA AL REHÉN');
 const where=currentFloorTarget().point;where.y=nests[0].root.position.y;
 if(spatialMap.area&&spatialMap.areaDistance(where)<.45)
   return toast('REHÉN FUERA DE LA ZONA · UBICALO DENTRO DEL PERÍMETRO');
 const distance=Math.hypot(where.x-nests[0].root.position.x,where.z-nests[0].root.position.z);
 if(distance<1.25)return toast('APUNTÁ MÁS LEJOS DE LA ENTRADA');
 if(mission?.placeHostage(where)){hud(true);tone('hit');toast('REHÉN UBICADO ✓ · EMPEZÁ EL RESCATE')}
}
const spawnQueue=[];let nextSpawnTime=0;
function wave(total=6,boss=false){
 if(mission?.isGuest())return;
 round++;total=Math.max(1,Math.min(13,total));
 for(let i=0;i<total;i++)spawnQueue.push({index:i,total,boss,waveNo:round});
 event('OLEADA '+round+' / MOVIMIENTO HOSTIL');
 tone('hurt');hud();
}
function processSpawns(t){
 if(!active||ended||!spawnQueue.length||t<nextSpawnTime)return;
 nextSpawnTime=t+145;
 const task=spawnQueue.shift();
 if(!nests.length||enemies.filter(e=>e.alive).length>=14)return;
 const {index:i,total,boss,waveNo}=task;
 const n=nests[(i+waveNo)%nests.length];
 if(!n)return;
 const variant=boss?1:(i+waveNo)%5===0?1:(i+waveNo)%3===0?2:0;
 const e=creature(variant);
 const theta=(i/total)*Math.PI*2+rnd(-.35,.35);
 const distance=n.floor?rnd(1.15,2.8):Math.sqrt(Math.random())*n.radius;
 e.root.position.set(Math.cos(theta)*distance,.016,Math.sin(theta)*distance);
 e.id=++monsterId;e.boss=boss;e.floor=n.floor;
 e.roamRadius=n.floor?3:.27;e.next=t+rnd(1500,3200);
 e.hit.userData.enemy=e;if(e.headHit)e.headHit.userData.enemy=e;
 n.root.add(e.root);
 n.root.updateMatrixWorld(true);world.updateMatrixWorld(true);world.attach(e.root);
 const tacticalScale=n.floor?.68:.84;
 e.root.scale.multiplyScalar(n.surfaceScale*tacticalScale);
 if(boss){e.hp=22;e.root.scale.multiplyScalar(1.48)}
 e.size*=n.surfaceScale*tacticalScale*(boss?1.48:1);
 e.home=e.root.position.clone();e.groundY=e.root.position.y;e.start.copy(e.root.position);
 e.nextTarget=0;e.targetId=null;e.burst=0;e.flashUntil=0;
 // Four original high-detail looks: tactical balaclava, desert wrap, cap,
 // and wrap+goggles. Appearance remains stable across all player screens.
 e.appearance=['raiderA','raiderB','raiderC','raiderD'][(i+waveNo*3)%4];
 if(boss)e.appearance='raiderD';
 attachContactShadow(e);
 enemies.push(e);
 attachHuman(e,e.appearance);
}
function begin(){
 if(mapping)toggleMap(false);
 if(!nests.length||!mission?.start())return;
 if(!gunReady)buildGun();combatFX.unlock();
 if(!active){active=true;round=0;if(!mission?.isGuest()&&!mission?.isCapture?.())wave(8,false)}
 placing=false;ui();mission?.ui();
}
function more(){placing=true;ui();toast('Localizá otra superficie; la amenaza sigue activa.')}
function attachRespawnShield(actor){
 if(!actor?.ctfBot||actor.ctfShieldFX)return;
 const group=new THREE.Group();
 const mat=new THREE.MeshBasicMaterial({
   color:actor.team==='blue'?0x82deff:0xffb27c,
   transparent:true,opacity:.78,depthWrite:false,side:THREE.DoubleSide
 });
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.37,.012,6,42).rotateX(-Math.PI/2),mat);
 const second=new THREE.Mesh(new THREE.TorusGeometry(.43,.008,6,42).rotateX(-Math.PI/2),mat.clone());
 ring.position.y=.08;second.position.y=.17;group.add(ring,second);
 group.visible=false;actor.root.add(group);actor.ctfShieldFX=group;
}
function updateRespawnShields(t){
 if(!mission?.isCapture?.()||!active)return;
 for(const e of enemies){
   if(!e.ctfShieldFX)continue;
   const visible=e.alive&&t<(e.ctfProtectedUntil||0);
   e.ctfShieldFX.visible=visible;
   if(visible)e.ctfShieldFX.rotation.y=t*.0012;
 }
}
// Soft contact shadow: one small procedurally generated texture shared by all
// actors, so expensive dynamic shadow maps are not required on mobile AR.
const contactDecal=(()=>{
 const canvas=document.createElement('canvas');canvas.width=canvas.height=96;
 const ctx=canvas.getContext('2d');
 if(!ctx)return null;
 const g=ctx.createRadialGradient(48,48,3,48,48,48);
 g.addColorStop(0,'rgba(0,0,0,.70)');
 g.addColorStop(.42,'rgba(0,0,0,.37)');
 g.addColorStop(1,'rgba(0,0,0,0)');
 ctx.fillStyle=g;ctx.fillRect(0,0,96,96);
 return new THREE.CanvasTexture(canvas);
})();
const contactGeometry=new THREE.PlaneGeometry(.92,.66);
const contactMaterial=new THREE.MeshBasicMaterial({
 color:0x061019,map:contactDecal,transparent:true,opacity:.46,
 depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,side:THREE.DoubleSide
});
function attachContactShadow(actor){
 if(!actor?.root||actor.contactShadow||!contactDecal)return;
 const decal=new THREE.Mesh(contactGeometry,contactMaterial);
 decal.rotation.x=-Math.PI/2;decal.position.y=.017;
 decal.renderOrder=2;actor.root.add(decal);
 actor.contactShadow=decal;
}
function spawnCTFBot(team,index,id,localPos){
 if(!mission?.isCapture?.()||!localPos||enemies.some(e=>e.id===id))return null;
 const e=createTacticalActor(THREE,index%4,team==='blue'?'operator':'raider');
 e.id=id;e.ctfBot=true;e.ctfIndex=index;e.team=team;e.floor=true;e.alive=true;e.hp=3;e.size=.94;
 e.ctfProtectedUntil=performance.now()+1000;
 e.ctfShotAt=e.ctfProtectedUntil+60;
 e.home=mission.originToWorld(localPos.clone());e.root.position.copy(e.home);e.groundY=e.root.position.y;
 e.root.scale.setScalar(.92);e.start.copy(e.root.position);e.next=0;e.nextTarget=0;
 e.hit.userData.enemy=e;if(e.headHit)e.headHit.userData.enemy=e;
 // Colored shoulder ID stays visible even when the detailed GLB hides
 // the fallback model; allows rapid friend/foe recognition on phone.
 const color=team==='blue'?0x46c7ff:0xff6158;
 const band=new THREE.Mesh(new THREE.TorusGeometry(.15,.032,8,18),
   new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.37}));
 band.position.set(.05,1.33,.03);band.rotation.x=Math.PI/2;e.root.add(band);
 attachRespawnShield(e);attachContactShadow(e);
 world.add(e.root);enemies.push(e);
 e.appearance=team==='blue'?'operator':['raiderA','raiderB','raiderC','raiderD'][index%4];
 attachHuman(e,e.appearance);
 return e;
}
function ctfBotShot(from,to,team){
 if(!active||ended)return;
 combatFX.shot(from,true,'rifle');combatFX.muzzle(from,to.clone().sub(from),true);trail(from,to);
 if(!mission?.isGuest?.())mission?.relayCTFBotShot?.(from,to,team);
}
function resolveFlagShot(start,direction,shooterId){
 if(!mission?.isCapture?.()||!mission?.isHost?.()||!active||ended)return null;
 const shooterTeam=mission.teamOf(shooterId);
 const cast=new THREE.Raycaster(start,direction.clone().normalize(),0,12);
 world.updateMatrixWorld(true);
 const eligible=enemies.filter(e=>e.alive&&e.ctfBot&&e.team!==shooterTeam);
 const objects=eligible.flatMap(e=>e.headHit?[e.hit,e.headHit]:[e.hit]);
 const hitBot=cast.intersectObjects(objects,false)[0]||null;
 const cover=mode==='demo'?cast.intersectObjects(occluders,false)[0]:null;
 let closest=hitBot?{distance:hitBot.distance,point:hitBot.point,bot:hitBot.object.userData.enemy,
   headshot:hitBot.object.userData.part==='head'}:null;
 for(const person of mission.capturePlayersWorld?.()||[]){
   if(person.id===shooterId||person.team===shooterTeam||!person.world)continue;
   const to=person.world.clone().sub(start),forward=cast.ray.direction;
   const t=to.dot(forward);
   if(t<.1||t>12||closest&&t>=closest.distance)continue;
   const closestPoint=start.clone().addScaledVector(forward,t);
   if(closestPoint.distanceTo(person.world)>.47)continue;
   closest={distance:t,point:closestPoint,playerId:person.id,headshot:false};
 }
 if(!closest)return null;
 if(cover&&cover.distance+.04<closest.distance)return null;
 if(spatialMap.lineBlocked(start,closest.point,.04))return null;
 if(closest.bot){
   if(performance.now()<(closest.bot.ctfProtectedUntil||0))return null;
   damageEnemy(closest.bot,closest.headshot?3:1,closest.headshot,shooterId);
 }
 else if(!mission.tagEnemyPlayer?.(closest.playerId,shooterId))return null;
 combatFX.dust(closest.point,6);
 return{id:closest.bot?.id||0,headshot:closest.headshot};
}
function teammateShot(start,direction,id){
  if(!active||ended)return;
  const end=start.clone().addScaledVector(direction,Math.min(3.9,ray.far||3.9));
  trail(start,end);
  // Teammate fire is visual; the host alone resolves collisions and HP.
  if(start.distanceTo(camera.position)<4)combatFX.shot(start,true,'rifle');
   combatFX.muzzle(start,direction,true);
}
function trail(start,end){let d=end.clone().sub(start),o=new THREE.Mesh(new THREE.CylinderGeometry(.003,.006,d.length(),5),mat.shot.clone());o.position.copy(start).addScaledVector(d,.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());world.add(o);trails.push({mesh:o,until:now+120})}
function impact(p){for(let j=0;j<12;j++){let m=new THREE.Mesh(new THREE.TetrahedronGeometry(rnd(.01,.04)),mat.blood.clone());m.position.copy(p);world.add(m);splinters.push({mesh:m,velocity:new THREE.Vector3(rnd(-.8,.8),rnd(.2,1.3),rnd(-.8,.8)),until:now+rnd(300,850)})}}
let killFeedUntil=0;
function teamElimination(byYou=false,headshot=false,count=null){
 if(Number.isInteger(count)&&count>=0)kills=Math.max(kills,count);
 const feed=$('killFeed');
 feed.textContent=(byYou?'BAJA CONFIRMADA · VOS':'BAJA CONFIRMADA · EQUIPO')+(headshot?' · CABEZA':'');
 feed.classList.toggle('critical',!!headshot);
 feed.classList.remove('hidden');killFeedUntil=performance.now()+2300;
}
function hitConfirm(headshot=false){
 const el=$('hitConfirm');if(!el)return;
 el.textContent=headshot?'CABEZA +':'IMPACTO +';
 el.classList.toggle('critical',headshot);
 el.classList.add('visible');hitConfirmUntil=performance.now()+350;
}
let hitConfirmUntil=0;
/**
 * Host-authoritative hit test for players connected via PeerJS.
 * The client sends only the muzzle position + shot direction.
 * The host reconstructs the ray in its own coordinate system and applies
 * enemy damage once; the 3D hit location is never trusted from the client.
 */
function resolveTeammateShot(start,direction,shooterId){
 if(!active||ended||placing||!mission?.isHost?.())return null;
 if(mission?.isCapture?.())return resolveFlagShot(start,direction,shooterId);
 if(!start||!direction||!Number.isFinite(direction.lengthSq())||direction.lengthSq()<.7)return null;
 const cast=new THREE.Raycaster(start,direction.clone().normalize(),0,12);
 world.updateMatrixWorld(true);
 const objects=enemies.filter(e=>e.alive).flatMap(e=>e.headHit?[e.hit,e.headHit]:[e.hit]);
 const hits=cast.intersectObjects(objects,false);
 if(!hits.length)return null;
 const cover=mode==='demo'?cast.intersectObjects(occluders,false)[0]:null;
 for(const hit of hits){
   if(hit.distance>12)break;
   if(cover&&cover.distance+0.045<hit.distance)return null;
   if(spatialMap.lineBlocked(start,hit.point,.035))return null;
   const e=hit.object.userData.enemy;
   if(!e?.alive)continue;
   const headshot=hit.object.userData.part==='head';
   damageEnemy(e,headshot?3:1,headshot,shooterId);
   combatFX.dust(hit.point,4);
   return{id:e.id,headshot};
 }
 return null;
}
function confirmedRemoteShot(headshot){
 hitConfirm(!!headshot);
 tone('hit');
}
function damageEnemy(e,amount=1,headshot=false,shooterId=null){
 if(!e?.alive||mission?.isCapture?.()&&!e.ctfBot||
   e.ctfBot&&performance.now()<(e.ctfProtectedUntil||0))return;
 e.hp-=amount;
 e.staggerUntil=performance.now()+170;
 e.hitStagger=amount>1?.14:.08;if(e.hp<=0){e.alive=false;e.root.visible=false;if(e.ctfBot)mission?.captureBotDown?.(e);kills++;teamElimination(!shooterId||shooterId===mission?.localId?.(),headshot,kills);
 mission?.relayEnemyDown(e.id,shooterId,headshot,kills);if(!mission?.isCapture?.())mission?.onKill(e)}else {mission?.relayEnemyHit?.(e.id,headshot,e.hp);
 if(!shooterId||shooterId===mission?.localId?.())toast('IMPACTO / '+e.hp+' RESISTENCIA')}}
function fire(){if(mapping||!active||ended||placing||reloading||performance.now()<ctfTaggedUntil)return;if(ammo===0){reload();return}let t=performance.now();if(t-lastShot<(currentWeapon==='rifle'?105:170))return;lastShot=t;ammo--;gunShot();combatFX.shot(null,false,currentWeapon);vibrate(35);hud();const c=getCam(),p=new THREE.Vector3(),q=new THREE.Quaternion();c.getWorldPosition(p);c.getWorldQuaternion(q);const forward=new THREE.Vector3(0,0,-1).applyQuaternion(q);ray.set(p,forward);ray.far=12;mission?.relayShot(p,forward);
 if(mission?.isCapture?.()){
  if(!mission?.isGuest())resolveFlagShot(p,forward,mission.localId());
  trail(weaponMuzzleOrigin(c),p.clone().addScaledVector(forward,5.5));
  if(ammo===0)setTimeout(reload,240);
  return;
 }
 const hits=ray.intersectObjects(enemies.filter(e=>e.alive).flatMap(e=>e.headHit?[e.hit,e.headHit]:[e.hit]),false);const cover=mode==='demo'?ray.intersectObjects(occluders,false)[0]:null;let end=p.clone().addScaledVector(forward,7);const geometryHit=spatialMap.lineBlocked(p,hits[0]?.point||end,.03);
 if(geometryHit||cover&&(!hits.length||cover.distance<hits[0].distance)){
   if(cover)end.copy(cover.point);combatFX.impact(end,forward,9);
 }else if(hits.length){const h=hits[0],e=h.object.userData.enemy;end.copy(h.point);if(!mission?.isGuest()){impact(end);combatFX.dust(end,5);tone('hit')}const headshot=h.object.userData.part==='head';
 // Guests receive hit confirmation only after the host validates the shot.
 if(!mission?.isGuest()){hitConfirm(headshot);damageEnemy(e,headshot?3:1,headshot)}}trail(weaponMuzzleOrigin(c),end);if(ammo===0)setTimeout(reload,240)}
function reload(){if(!active||ended||reloading||ammo===capacity())return;
 reloading=true;gunReload();tone('hit');toast('RECARGANDO '+(currentWeapon==='rifle'?'CARBINA':'PISTOLA')+'…');
 const type=currentWeapon;setTimeout(()=>{if(ended)return;magazines[type]=type==='rifle'?28:12;if(type===currentWeapon)ammo=magazines[type];reloading=false;hud()},currentWeapon==='rifle'?1600:1200);
}
function damage(value){if(mission?.shielded())return;life=Math.max(0,life-value);$('damage').classList.add('active');setTimeout(()=>$('damage').classList.remove('active'),180);tone('hurt');vibrate([90,35,90]);hud();if(life===0)finish(false)}
function finishCTF(winner,myTeam,state){
 if(ended)return;
 ended=true;active=false;placing=false;triggerHeld=false;
 $('hud').classList.add('hidden');$('outro').classList.remove('hidden');
 const won=winner===myTeam,draw=winner==='draw';
 $('status').textContent=draw?'TIEMPO TERMINADO':won?'¡TU EQUIPO GANÓ!':'EQUIPO RIVAL GANADOR';
 $('outcome').innerHTML=draw?'EMPATE<br><em>TÁCTICO</em>':won?'BANDERA<br><em>CAPTURADA</em>':'MISIÓN<br><em>TERMINADA</em>';
 $('outcomeText').textContent='AZULES '+(state?.scores?.blue||0)+' — '+(state?.scores?.red||0)+' ROJOS · '+kills+' bajas del equipo.';
}
function applyCTFTag(power=1){
 if(ended||!active)return;
 ctfTaggedUntil=performance.now()+2700;
 $('damage').classList.add('active');
 setTimeout(()=>$('damage').classList.remove('active'),350);
 tone('hurt');vibrate([80,50,80]);toast('TOCADO · 3 SEGUNDOS SIN DISPARAR');
}
function finish(win){if(ended)return;mission?.onVictory(win);ended=true;active=false;placing=false;$('hud').classList.add('hidden');$('outro').classList.remove('hidden');$('status').textContent=win?'MISIÓN CUMPLIDA':'SEÑAL PERDIDA';$('outcome').innerHTML=win?'ZONA<br><em>ASEGURADA</em>':'MISIÓN<br><em>FALLIDA</em>';$('outcomeText').textContent=(win?'El equipo evacuó al rehén con vida. ':'El rescate del rehén fracasó. ')+kills+' intrusos neutralizados.'}
// WebXR plane-detection (when available): use bounded plane geometry as a
// secondary source if normal hit-test cannot find the floor or a wall.
function xrPlaneProbe(frame,orientation){
 if(!local)return null;
 let planes;try{planes=frame.detectedPlanes}catch(_){return null}
 if(!planes)return null;
 const cam=getCam(),eye=new THREE.Vector3(),dir=new THREE.Vector3();
 cam.getWorldPosition(eye);cam.getWorldDirection(dir);
 let best=null,nearest=Infinity,count=0;
 try{
 for(const plane of planes){
  if(++count>22)break;
  if(plane.orientation!==orientation||!plane.polygon?.length)continue;
  const pp=frame.getPose(plane.planeSpace,local);
  if(!pp)continue;
  const matrix=new THREE.Matrix4().fromArray(pp.transform.matrix),q=new THREE.Quaternion().setFromRotationMatrix(matrix);
  const normal=new THREE.Vector3(0,1,0).applyQuaternion(q);
  const denom=normal.dot(dir);
  if(Math.abs(denom)<.08)continue;
  const origin=new THREE.Vector3().setFromMatrixPosition(matrix);
  const t=normal.dot(origin.clone().sub(eye))/denom;
  if(t<.45||t>5.3||t>=nearest)continue;
  const point=eye.clone().addScaledVector(dir,t),localHit=point.clone().applyMatrix4(matrix.clone().invert());
  // Check the real tracked polygon, rather than its infinite support plane.
  const poly=plane.polygon;
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[i],b=poly[j],cross=((a.z>localHit.z)!==(b.z>localHit.z)) &&
      localHit.x<(b.x-a.x)*(localHit.z-a.z)/(b.z-a.z)+a.x;
    if(cross)inside=!inside;
  }
  if(!inside)continue;
  best={matrix:new THREE.Matrix4().makeTranslation(point.x,point.y,point.z),q,hit:null,source:'plane'};
  nearest=t;
 }
 }catch(_){}
 return best;
}
function updateXR(frame){
 if(!frame||!source||!local)return;
 pose=null;hitResult=null;reticle.visible=false;mapPoint=null;mapPointQuality='manual';mapDepth=null;mapDepthSource='none';
 const xrPose=frame.getViewerPose(local),view=xrPose?.views?.[0];
 let depthInfo=null;
 if(view&&typeof frame.getDepthInformation==='function'){
   try{depthInfo=frame.getDepthInformation(view);const d=depthInfo?.getDepthInMeters?.(.5,.5);if(Number.isFinite(d)&&d>.3&&d<7){mapDepth=d;mapDepthSource='cpu'}}catch(_){}
 }
 if(placing||mapping){
   let flat=null,vertical=null;
   for(const hit of frame.getHitTestResults(source)){
     const p=hit.getPose(local);if(!p)continue;
     const matrix=new THREE.Matrix4().fromArray(p.transform.matrix);
     const q=new THREE.Quaternion().setFromRotationMatrix(matrix);
     const up=new THREE.Vector3(0,1,0).applyQuaternion(q);
     if(up.y>.6&&!flat)flat={matrix,q,hit};
     if(Math.abs(up.y)<.5&&!vertical)vertical={matrix,q,hit};
   }
   if(!flat)flat=xrPlaneProbe(frame,'horizontal');
   if(mapping&&mapKind==='wall'&&!vertical)vertical=xrPlaneProbe(frame,'vertical');
   if(mapping){
     const selected=mapKind==='wall'?vertical:flat;
     if(selected&&!mapManualOverride){
       mapPoint=new THREE.Vector3().setFromMatrixPosition(selected.matrix);mapPointQuality='plane';
       reticle.position.copy(mapPoint);reticle.quaternion.copy(selected.q);reticle.visible=true;
     }else if(mapKind==='wall'&&mapDepth&&!mapManualOverride){
       const c=getCam(),origin=new THREE.Vector3(),forward=new THREE.Vector3();
       c.getWorldPosition(origin);c.getWorldDirection(forward);
       mapPoint=origin.addScaledVector(forward,mapDepth);mapPointQuality='depth';
       reticle.position.copy(mapPoint);reticle.quaternion.identity();reticle.visible=true;
     }
     mapControls();
   }else{
     if(flat){pose=flat.matrix;hitResult=flat.hit;reticle.position.setFromMatrixPosition(pose);reticle.quaternion.copy(flat.q);reticle.visible=true}
     $('place').disabled=!pose||nests.length>=7;
     if(!pose&&(nests.length===0||mission?.needsReference?.())){
       const candidate=estimateFloorPoint();
       reticle.position.copy(candidate);reticle.quaternion.identity();reticle.visible=true;
     }
     ring.material.color.setHex(pose?0x91e5be:0xeec17c);
     $('place').disabled=nests.length>=7;
     $('surface').textContent=pose?'PISO DETECTADO ✓':'PISO ESTIMADO';
     $('sight').classList.toggle('found',!!pose);
     $('sightText').textContent=pose?'PISO DETECTADO':'PISO ESTIMADO · TOCÁ MARCAR';
   }
 }
 for(const n of nests)if(n.anchor){const p=frame.getPose(n.anchor.anchorSpace,local);if(p){n.root.position.set(p.transform.position.x,p.transform.position.y,p.transform.position.z);n.root.quaternion.set(p.transform.orientation.x,p.transform.orientation.y,p.transform.orientation.z,p.transform.orientation.w)}}
 if(referenceAnchor&&referenceMarker){
   const p=frame.getPose(referenceAnchor.anchorSpace,local);
   if(p)referenceMarker.position.set(p.transform.position.x,p.transform.position.y,p.transform.position.z);
 }
 if(referenceAnchor&&nests[0]?.anchor&&referenceMarker&&performance.now()-lastReferenceUpdate>280){
   lastReferenceUpdate=performance.now();
   mission?.updateTrackedFrame?.(nests[0].root,referenceMarker.position);
 }
 if(depthInfo&&view&&mapDepthSource==='cpu'&&!mapping){
   const c=getCam(),eye=new THREE.Vector3();c.getWorldPosition(eye);
   for(const e of enemies)if(e.alive){
     const center=new THREE.Vector3();e.hit.getWorldPosition(center);
     const p=center.clone().project(c);
     if(p.z<0||p.z>1||Math.abs(p.x)>.92||Math.abs(p.y)>.92){e.root.visible=true;continue}
     try{const d=depthInfo.getDepthInMeters((p.x+1)/2,(1-p.y)/2);e.root.visible=!(Number.isFinite(d)&&d>.25&&d<eye.distanceTo(center)-.36)}catch(_){e.root.visible=true}
   }
 }else for(const e of enemies)if(e.alive)e.root.visible=true;
}
function updateDemo(){if(mapping){
 ray.setFromCamera({x:0,y:0},camera);
 const targets=mapKind==='area'?[surfaces[0]]:occluders;
 const pick=ray.intersectObjects(targets,false)[0];
 mapPoint=pick?.point?.clone()||null;mapPointQuality=mapPoint?'plane':'manual';
 mapControls();return
 }if(!placing)return;ray.setFromCamera({x:0,y:0},camera);const hit=ray.intersectObjects(surfaces,false)[0];reticle.visible=!!hit;if(hit)reticle.position.copy(hit.point);
 else if(!nests.length||mission?.needsReference?.()){reticle.position.copy(estimateFloorPoint(0));reticle.visible=true}
 ring.material.color.setHex(hit?0x91e5be:0xeec17c);
 $('place').disabled=nests.length>=7;$('sight').classList.toggle('found',!!hit);$('surface').textContent=hit?'PISO DETECTADO':'PISO ESTIMADO';$('sightText').textContent=hit?'PISO DETECTADO':'PISO ESTIMADO · TOCÁ MARCAR'}
function updateBattle(dt,t){
 if(!active||ended)return;
 if(mission?.isCapture?.()){hud();return}
 if(mission?.isGuest()){hud();return}
 seconds=Math.max(0,seconds-dt);
 if(!seconds){finish(false);return}
 const eye=new THREE.Vector3();getCam().getWorldPosition(eye);
 let near=false,shooting=0;
 for(const e of enemies){
  if(!e.alive)continue;
  if(!e.targetId||t>e.nextTarget){
   const hostageAvailable=mission?.hostageExposed()&&mission?.hostageWorld();
   const target=mission?.chooseTarget();
   const escortTargets=enemies.filter(peer=>peer.alive&&peer!==e&&peer.targetId==='hostage').length;
   e.targetId=hostageAvailable&&escortTargets<2&&Math.random()<.34?'hostage':target?.id||'local';
   e.nextTarget=t+rnd(1750,3100)
  }
  const target=mission?.getPlayerWorld(e.targetId)||eye;
  // Keep enemies from crowding the mobile camera.
  if(target===eye&&e.floor){
    e.screenDistance=Math.hypot(target.x-e.root.position.x,target.z-e.root.position.z);
  }
  const tacticalTarget=tacticalDestination(e,t,target,target,
    (from,threat)=>spatialMap.findCoverSpot(from,threat),
    !!e.floor&&!e.boss&&(spatialMap.walls.length+spatialMap.boxes.length)>0);
   const moved=steerEnemy(e,dt,t,tacticalTarget,mode,spatialMap,enemies);
  animateEnemy(e,dt,moved);
  const worldPosition=new THREE.Vector3();e.root.getWorldPosition(worldPosition);
  const dist=worldPosition.distanceTo(eye);
  e.lodFar=dist>5.2;
  animateHuman(e,dt,moved);
  if(dist<4)near=true;
  if(e.flash)e.flash.intensity=(t<(e.flashUntil||0))?9:0;
  if(e.staggerUntil&&t<e.staggerUntil){
   e.root.rotation.x=Math.sin((e.staggerUntil-t)/170*Math.PI)*(e.hitStagger||.08);
  }else if(e.staggerUntil){e.root.rotation.x=0;e.staggerUntil=0}
  // The enemies fire tactical bursts, not slow fantasy projectiles.
  if(t>e.next&&worldPosition.distanceTo(target)<8.5&&!spatialMap.lineBlocked(worldPosition,target,.05)){
   e.burst=3+(e.boss?1:0);
   e.burstAt=t;
   e.next=t+rnd(3800,5900);
  }
  if(e.burst>0&&t>=(e.burstAt||0)&&shooting<6){
   e.burst--;
   e.burstAt=t+rnd(160,235);
   shooting++;
   const from=new THREE.Vector3();
   if(e.flash)e.flash.getWorldPosition(from);
   else from.copy(worldPosition).add(new THREE.Vector3(0,e.size*1.13,.20));
   const playerTarget=mission?.getPlayerWorld(e.targetId)||eye;
   const spread=e.variant===2?.31:.23;
   const aim=playerTarget.clone().add(new THREE.Vector3(rnd(-spread,spread),rnd(-.2,.2),rnd(-spread,spread)));
   const direction=aim.sub(from).normalize();
   const velocity=direction.multiplyScalar(e.variant===2?6.8:5.6);
   const tracer=new THREE.Mesh(new THREE.CapsuleGeometry(.025,.19,2,5),new THREE.MeshBasicMaterial({color:0xffc27d,transparent:true,opacity:.94,depthWrite:false}));
   tracer.position.copy(from);tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),velocity.clone().normalize());
   world.add(tracer);
   orbs.push({id:++projectileId,mesh:tracer,vel:velocity,targetId:e.targetId,until:t+2250,power:e.boss?6:e.targetId==='hostage'?3.2:4.6,whizzed:false});
   if(e.flash){e.flash.intensity=9;e.flashUntil=t+95}
    combatFX.muzzle(from,velocity,true);
   combatFX.shot(from,true,'rifle');
  }
 }
 $('alert').classList.toggle('hidden',!near);
 for(let i=orbs.length-1;i>=0;i--){
  const shot=orbs[i];
  const before=shot.mesh.position.clone();
  const step=shot.vel.clone().multiplyScalar(dt);
  if(spatialMap.lineBlocked(before,before.clone().add(step),.025)){
    combatFX.impact(before,shot.vel,6);world.remove(shot.mesh);shot.mesh.geometry.dispose();shot.mesh.material.dispose();orbs.splice(i,1);continue;
  }
  if(mode==='demo'&&occluders.length&&step.length()>0){
   const obstructionRay=new THREE.Raycaster(before,step.clone().normalize(),0,step.length());
   if(obstructionRay.intersectObjects(occluders,false).length){
    combatFX.impact(before.addScaledVector(step,.7),shot.vel,7);
    world.remove(shot.mesh);shot.mesh.geometry.dispose();shot.mesh.material.dispose();orbs.splice(i,1);continue;
   }
  }
  shot.mesh.position.add(step);
  const victim=shot.targetId?mission?.getPlayerWorld(shot.targetId):eye;
  if(victim){
   const distance=shot.mesh.position.distanceTo(victim);
   if(distance<.48){
    mission?.requestHit(shot.targetId||'local',shot.power);
    world.remove(shot.mesh);shot.mesh.geometry.dispose();shot.mesh.material.dispose();orbs.splice(i,1);continue;
   }
   if(!shot.whizzed&&distance<1.25){
    shot.whizzed=true;
    if(shot.targetId===undefined||shot.targetId===mission?.localId())combatFX.whizz(shot.mesh.position);
   }
  }
  if(t>shot.until){
   combatFX.impact(shot.mesh.position,shot.vel,4);
   world.remove(shot.mesh);shot.mesh.geometry.dispose();shot.mesh.material.dispose();orbs.splice(i,1);
  }
 }
 const c=getCam();c.getWorldPosition(vec);c.getWorldQuaternion(quat);
 ray.set(vec,new THREE.Vector3(0,0,-1).applyQuaternion(quat));ray.far=12;
 $('sight').classList.toggle('hit',!placing&&ray.intersectObjects(enemies.filter(e=>e.alive).flatMap(e=>e.headHit?[e.hit,e.headHit]:[e.hit]),false).length>0);
 hud();
}
function effects(dt,t){for(let i=trails.length-1;i>=0;i--){const a=trails[i];if(t>a.until){world.remove(a.mesh);a.mesh.material.dispose();trails.splice(i,1)}else a.mesh.material.opacity=Math.max(0,(a.until-t)/130)}for(let i=splinters.length-1;i>=0;i--){const s=splinters[i];s.mesh.position.addScaledVector(s.velocity,dt);s.velocity.y-=dt*3;s.mesh.material.opacity=Math.max(0,(s.until-t)/400);if(t>s.until){world.remove(s.mesh);s.mesh.material.dispose();s.mesh.geometry.dispose();splinters.splice(i,1)}}if(toastExpiry&&t>toastExpiry){$('toast').classList.remove('show');toastExpiry=0}if(eventExpiry&&t>eventExpiry){$('event').classList.add('hidden');eventExpiry=0}}
let currentWeapon='rifle',magazines={rifle:28,pistol:12},pistolModel,rifleModel,pistolSlide,rifleSlide,pistolFlash,rifleFlash,triggerHeld=false;
function capacity(){return currentWeapon==='rifle'?28:12}
function syncWeapon(){
 if(!gunReady||!pistolModel||!rifleModel)return;
 pistolModel.visible=currentWeapon==='pistol';rifleModel.visible=currentWeapon==='rifle';
 slide=currentWeapon==='pistol'?pistolSlide:rifleSlide;
 muzzle=currentWeapon==='pistol'?pistolFlash:rifleFlash;
 $('weaponName').textContent=currentWeapon==='rifle'?'CARBINA VX-4':'PISTOLA P-9';
 $('swapGun').innerHTML=currentWeapon==='rifle'?'P-9 PISTOLA <b>↻</b>':'VX-4 RIFLE <b>↻</b>';
 hud();
}
function switchWeapon(){
 if(reloading||!gunReady)return;
 magazines[currentWeapon]=ammo;
 currentWeapon=currentWeapon==='rifle'?'pistol':'rifle';
 ammo=magazines[currentWeapon];
 aiming=false;$('aimMode').classList.remove('aimed');$('aimMode').textContent='MIRA ◎';$('sight').classList.remove('ads');
 if(mode==='demo'){camera.fov=65;camera.updateProjectionMatrix()}
 aimBlend=0;gunRecoil.reset();gunSlide.reset();syncWeapon();toast(currentWeapon==='rifle'?'CARBINA VX-4 EQUIPADA':'PISTOLA P-9 EQUIPADA');
}
let gunReady=false,gunRenderer,gunScene,gunCamera,gun,slide,muzzle,mag,gunRecoil=new Spring(12,.68),gunSlide=new Spring(22,.82),reloadProgress=0,muzzleUntil=0,aiming=false,aimBlend=0,casings=[],gunCanvasWidth=0,gunCanvasHeight=0;
const HIP_POSE={position:new THREE.Vector3(.27,-.66,-2.18),rotation:new THREE.Euler(-.09,-.15,-.08)};
const AIM_POSE={position:new THREE.Vector3(-.02,-.16,-2.12),rotation:new THREE.Euler(-.025,-.01,-.012)};
const rigPoint=new THREE.Vector3();
function weaponMuzzleOrigin(cameraTransform){
 // The world-space projectile is computed from the muzzle's 2D projection.
 // The hit ray remains exactly at the centre of the AR/XR camera.
 const eye=new THREE.Vector3(),q=new THREE.Quaternion();
 cameraTransform.getWorldPosition(eye);cameraTransform.getWorldQuaternion(q);
 if(!gunReady||!muzzle)return eye.add(new THREE.Vector3(0,0,-.42).applyQuaternion(q));
 gunScene.updateMatrixWorld(true);
 gunCamera.updateMatrixWorld(true);
 const ndc=muzzle.getWorldPosition(rigPoint).project(gunCamera);
 if(!Number.isFinite(ndc.x)||!Number.isFinite(ndc.y))return eye.add(new THREE.Vector3(0,0,-.42).applyQuaternion(q));
 const t=Math.tan(THREE.MathUtils.degToRad(camera.fov)*.5);
 const u=THREE.MathUtils.clamp(ndc.x,-.94,.94),v=THREE.MathUtils.clamp(ndc.y,-.94,.94);
 const projected=new THREE.Vector3(u*t*(innerWidth/innerHeight),v*t,-1).normalize().applyQuaternion(q);
 return eye.addScaledVector(projected,.52);
}
function buildGun(){if(gunReady)return;gunReady=true;gunScene=new THREE.Scene();gunCamera=new THREE.PerspectiveCamera(48,1,.025,20);
gunCamera.position.set(0,0,0);
gunCamera.lookAt(0,0,-1);gunScene.add(new THREE.HemisphereLight(0xc7d9e4,0x241e22,2.6));const a=new THREE.DirectionalLight(0xffe5cb,4);a.position.set(-3,5,3);gunScene.add(a);const b=new THREE.PointLight(0x528bb0,2,4);b.position.set(2,2,0);gunScene.add(b);
const iron=new THREE.MeshStandardMaterial({color:0x464b4f,metalness:.92,roughness:.27}),steel=new THREE.MeshStandardMaterial({color:0x1c232a,metalness:.78,roughness:.3}),silver=new THREE.MeshStandardMaterial({color:0x9faab0,metalness:1,roughness:.18}),polymer=new THREE.MeshStandardMaterial({color:0x20262a,roughness:.89,bumpMap:rough,bumpScale:.015}),handMat=new THREE.MeshStandardMaterial({color:0x6a5a52,roughness:.92,bumpMap:rough,bumpScale:.025});
gun=new THREE.Group();gunScene.add(gun);function box(p,x,y,z,w,h,d,m){return node(p,new THREE.BoxGeometry(w,h,d),m,[x,y,z],[1,1,1])}
box(gun,0,-.08,.07,.37,.28,1.11,iron);box(gun,0,-.21,.3,.33,.13,.7,steel);
slide=new THREE.Group();gun.add(slide);box(slide,0,.195,-.32,.41,.28,1.42,iron);box(slide,0,.354,-.31,.36,.04,1.16,steel);box(slide,0,.371,-.96,.055,.055,.075,silver);box(slide,0,.361,.25,.12,.07,.1,silver);
for(let s of [-1,1]){box(slide,s*.21,.18,-.15,.026,.15,.91,steel);for(let i=0;i<8;i++)box(slide,s*.212,.26,.16+i*.046,.033,.16,.013,silver);}
const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.076,.076,.36,20),steel);barrel.rotation.x=Math.PI/2;barrel.position.set(0,.19,-1.03);slide.add(barrel);const lip=new THREE.Mesh(new THREE.TorusGeometry(.064,.008,6,22),silver);lip.position.set(0,.19,-1.215);slide.add(lip);box(gun,0,-.005,-.65,.21,.1,.47,steel);box(gun,0,-.14,-.16,.31,.14,.36,iron);
const grip=new THREE.Group();grip.position.set(0,-.3,.41);grip.rotation.x=-.23;gun.add(grip);box(grip,0,-.36,.07,.315,.79,.43,polymer);box(grip,0,-.76,.07,.355,.08,.45,iron);for(let i=0;i<10;i++)box(grip,.161,-.61+i*.05,.07,.009,.015,.3,steel);
const guard=new THREE.Mesh(new THREE.TorusGeometry(.19,.024,7,28),iron);guard.rotation.y=Math.PI/2;guard.position.set(0,-.255,-.02);gun.add(guard);
const palm=new THREE.Group();palm.position.set(.135,-.56,.51);palm.rotation.x=-.2;gun.add(palm);node(palm,geo.ball,handMat,[0,-.22,.13],[.33,.3,.29]);for(let i=0;i<4;i++){const x=-.19+i*.125;segment(palm,handMat,[x,-.04,.1],[x+.04,-.24,-.04],.064,.07)}segment(palm,handMat,[.21,-.21,.19],[.24,-.02,-.03],.09,.065);
const cv=document.createElement('canvas');cv.width=cv.height=128;const ctx=cv.getContext('2d'),grad=ctx.createRadialGradient(64,64,0,64,64,64);grad.addColorStop(0,'#fff');grad.addColorStop(.12,'#ffe8bc');grad.addColorStop(.34,'#fc933f');grad.addColorStop(1,'rgba(235,57,8,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);muzzle=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));muzzle.position.set(0,.2,-1.28);muzzle.scale.set(.8,.8,1);muzzle.visible=false;slide.add(muzzle);
pistolModel=new THREE.Group();pistolModel.name='P-9 pistol';
 for(const child of [...gun.children])pistolModel.add(child);
 gun.add(pistolModel);pistolSlide=slide;pistolFlash=muzzle;
 const vx4=createTacticalRifle(THREE,{iron,steel,silver,polymer,handMat},muzzle.material.map);
 rifleModel=vx4.model;rifleSlide=vx4.slide;rifleFlash=vx4.flash;gun.add(rifleModel);
 syncWeapon();gun.position.copy(HIP_POSE.position);gun.rotation.copy(HIP_POSE.rotation);gunRenderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});gunRenderer.outputColorSpace=THREE.SRGBColorSpace;gunRenderer.toneMapping=THREE.ACESFilmicToneMapping;gunRenderer.toneMappingExposure=1.4;gunRenderer.setPixelRatio(Math.min(devicePixelRatio,1.1));gunRenderer.setClearColor(0x000000,0);$('gunCanvas').append(gunRenderer.domElement);resizeGun()}
function resizeGun(){
 if(!gunReady)return;
 const w=$('gunCanvas').clientWidth,h=$('gunCanvas').clientHeight;
 if(!w||!h)return;
 if(gunCanvasWidth===w&&gunCanvasHeight===h)return;
 gunCanvasWidth=w;gunCanvasHeight=h;
 gunRenderer.setSize(w,h,false);
 gunCamera.aspect=w/h;gunCamera.updateProjectionMatrix();
}
function gunShot(){if(!gunReady)return;gunRecoil.kick(aiming?(currentWeapon==='rifle'?8:11):(currentWeapon==='rifle'?13:16));gunSlide.kick(currentWeapon==='rifle'?-10:-21);muzzleUntil=performance.now()+(currentWeapon==='rifle'?48:88);
const brass=new THREE.Mesh(new THREE.CylinderGeometry(.019,.019,.076,9),new THREE.MeshStandardMaterial({color:0xb98a43,metalness:.92,roughness:.25}));brass.rotation.x=Math.PI/2;brass.position.set(.28,.25,-.3);gun.add(brass);casings.push({mesh:brass,velocity:new THREE.Vector3(.8,.95,.15),life:1.0});}
function gunReload(){reloadProgress=1.25}
function updateGun(dt,t){
 if(!gunReady||!active||ended)return;
 resizeGun();
 const recoil=gunRecoil.step(dt),slideKick=gunSlide.step(dt);
 reloadProgress=Math.max(0,reloadProgress-dt);
 const r=reloadProgress>0?Math.sin(Math.PI*THREE.MathUtils.clamp((1.25-reloadProgress)/1.25,0,1)):0;
 aimBlend=THREE.MathUtils.damp(aimBlend,aiming?1:0,13,dt);
 const blend=aimBlend*aimBlend*(3-2*aimBlend);
 const x=THREE.MathUtils.lerp(HIP_POSE.position.x,AIM_POSE.position.x,blend);
 const y=THREE.MathUtils.lerp(HIP_POSE.position.y,AIM_POSE.position.y+(currentWeapon==='rifle'?.07:0),blend);
 const z=THREE.MathUtils.lerp(HIP_POSE.position.z,AIM_POSE.position.z,blend);
 const sway=1-.84*blend;
 const breathingX=Math.sin(t*.0013)*.007*sway;
 const breathingY=Math.sin(t*.0017)*.010*sway;
 gun.position.set(x+breathingX,y+breathingY-recoil*.034-r*.27,z+recoil*.025);
 gun.rotation.set(
   THREE.MathUtils.lerp(HIP_POSE.rotation.x,AIM_POSE.rotation.x,blend)+recoil*.037+r*.62,
   THREE.MathUtils.lerp(HIP_POSE.rotation.y,AIM_POSE.rotation.y,blend),
   THREE.MathUtils.lerp(HIP_POSE.rotation.z,AIM_POSE.rotation.z,blend)-recoil*.022+r*.20
 );
 slide.position.z=slideKick*.014;
 muzzle.visible=t<muzzleUntil;
 for(let i=casings.length-1;i>=0;i--){
   const c=casings[i];c.life-=dt;
   c.mesh.position.addScaledVector(c.velocity,dt);c.velocity.y-=dt*4;
   c.mesh.rotation.x+=dt*13;c.mesh.rotation.y+=dt*11;
   if(c.life<=0){gun.remove(c.mesh);c.mesh.geometry.dispose();c.mesh.material.dispose();casings.splice(i,1)}
 }
 gunRenderer.render(gunScene,gunCamera);
}
let lastGuidanceUI=0;
function updateGuidance(t){
 if(t-lastGuidanceUI<160)return;lastGuidanceUI=t;
 const item=active&&!ended?mission?.navigationTarget?.():null;
 const el=$('navGuide');
 el.classList.toggle('hidden',!item);
 if(item){
  const cam=getCam(),eye=new THREE.Vector3(),forward=new THREE.Vector3();
  cam.getWorldPosition(eye);cam.getWorldDirection(forward);
  const dx=item.world.x-eye.x,dz=item.world.z-eye.z;
  const distance=Math.hypot(dx,dz);
  const length=Math.hypot(forward.x,forward.z)||1;
  const fX=forward.x/length,fZ=forward.z/length;
  const angle=-Math.atan2(fZ*dx-fX*dz,fX*dx+fZ*dz);
  $('navArrow').style.transform='rotate('+angle+'rad)';
  const readable=distance<1?'YA ESTÁS CERCA':distance.toFixed(1).replace('.',',')+' m';
  if($('navLabel').textContent!==item.label)$('navLabel').textContent=item.label;
  if($('navDistance').textContent!==readable)$('navDistance').textContent=readable;
 }
 const state=mission?.networkState?.()||'local',status=$('netSignal');
 const show=state!=='local'&&state!=='synced';
 status.classList.toggle('hidden',!show);
 if(show){
  const message=state==='offline'?'SIN CONEXIÓN':state==='stale'?'SINCRONIZACIÓN LENTA':state==='mismatch'?'REPETÍ PUNTO B':state==='aligning'?'MARQUEN PUNTOS A Y B':'ESPERANDO AL ANFITRIÓN';
  if(status.textContent!==message)status.textContent=message;
 }
}
let lastZoneCheck=0;
function updateZoneProximity(t){
 if(t-lastZoneCheck<240)return;
 lastZoneCheck=t;
 const warning=$('zoneProximity'),zone=spatialMap.area;
 const visible=active&&!ended&&mode==='ar'&&!!zone;
 if(!visible){warning.classList.add('hidden');return}
 const eye=new THREE.Vector3();getCam().getWorldPosition(eye);
 const remaining=spatialMap.areaDistance(eye);
 const near=remaining!==null&&remaining<.62;
 warning.classList.toggle('hidden',!near);
 if(near){
   warning.classList.toggle('outside',remaining<0);
   const text=remaining<0?'FUERA DE ZONA VIRTUAL · DETENETE':
     'BORDE VIRTUAL CERCA · MIRÁ EL ENTORNO REAL';
   if(warning.textContent!==text)warning.textContent=text;
 }
}
function updateFrame(t,frame){now=t;
 if(hitConfirmUntil&&t>=hitConfirmUntil){hitConfirmUntil=0;$('hitConfirm').classList.remove('visible')}
 if(killFeedUntil&&t>=killFeedUntil){killFeedUntil=0;$('killFeed').classList.add('hidden')}if(triggerHeld&&currentWeapon==='rifle'&&active&&!placing)fire();const dt=previous?Math.min(.052,(t-previous)/1000):0;previous=t;if(mode==='ar')updateXR(frame);if(mode==='demo'){moveDemo(dt);updateDemo()}processSpawns(t);updateBattle(dt,t);mission?.tick(dt,t);updateRespawnShields(t);updateGuidance(t);updateZoneProximity(t);effects(dt,t);combatFX.tick(dt);renderer.render(world,camera);updateGun(dt,t)}
renderer.setAnimationLoop(updateFrame);preloadHumans();

function remoteStart(){if(!nests.length||active)return;begin()}
function heal(amount){life=Math.min(100,life+amount);hud();toast('ENERGÍA RESTAURADA +'+Math.floor(amount))}
const movementKeys={forward:false,back:false,left:false,right:false};
function moveDemo(dt){if(mode!=='demo'||!dt)return;const x=joystick.x+(movementKeys.right?1:0)-(movementKeys.left?1:0),y=joystick.y+(movementKeys.back?1:0)-(movementKeys.forward?1:0);if(Math.abs(x)+Math.abs(y)<.03)return;const forward=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);forward.y=0;forward.normalize();const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);right.y=0;right.normalize();const move=right.multiplyScalar(x).addScaledVector(forward,-y);if(move.length()>1)move.normalize();const next=camera.position.clone().addScaledVector(move,dt*1.55);next.x=clamp(next.x,-3.7,3.7);next.z=clamp(next.z,-2.55,4.4);const inTable=(next.x>-1.91&&next.x<-.09&&next.z>-1.54&&next.z<-.47),inSofa=(next.x>.07&&next.x<2.29&&next.z>-2.12&&next.z<-.92);if(!inTable&&!inSofa&&spatialMap.canMove(camera.position,next,.23))camera.position.copy(next)}
const movementPad=$('joyTrack'),joyKnob=$('joyKnob');function joyZero(){joystick.x=0;joystick.y=0;joyKnob.style.transform='translate(0,0)'}
function joyMove(e){const r=movementPad.getBoundingClientRect(),dx=(e.clientX-r.left-r.width/2)/(r.width*.39),dy=(e.clientY-r.top-r.height/2)/(r.height*.39),length=Math.max(1,Math.hypot(dx,dy));joystick.x=dx/length;joystick.y=dy/length;joyKnob.style.transform='translate('+joystick.x*34+'px,'+joystick.y*34+'px)'}
movementPad.addEventListener('pointerdown',e=>{e.preventDefault();movementPad.setPointerCapture(e.pointerId);joyMove(e)});movementPad.addEventListener('pointermove',e=>{if(movementPad.hasPointerCapture(e.pointerId))joyMove(e)});movementPad.addEventListener('pointerup',joyZero);movementPad.addEventListener('pointercancel',joyZero);
window.addEventListener('keydown',e=>{if(['KeyW','ArrowUp'].includes(e.code))movementKeys.forward=true;if(['KeyS','ArrowDown'].includes(e.code))movementKeys.back=true;if(['KeyA','ArrowLeft'].includes(e.code))movementKeys.left=true;if(['KeyD','ArrowRight'].includes(e.code))movementKeys.right=true});
window.addEventListener('keyup',e=>{if(['KeyW','ArrowUp'].includes(e.code))movementKeys.forward=false;if(['KeyS','ArrowDown'].includes(e.code))movementKeys.back=false;if(['KeyA','ArrowLeft'].includes(e.code))movementKeys.left=false;if(['KeyD','ArrowRight'].includes(e.code))movementKeys.right=false});
mission=createMission({scene:world,getCam,toast,event,teammateShot,resolveTeammateShot,confirmedRemoteShot,teamElimination,kills:()=>kills,active:()=>active,firstNest:()=>nests[0],refreshHud:()=>hud(true),
 exportEnvironment:origin=>spatialMap.exportData(origin),
 importEnvironment:(items,origin)=>{if(!mission?.isGuest())return;spatialMap.importData(items,origin);spatialMap.setVisible(false);mapStatus()},
 environmentCanMove:(from,to,radius)=>spatialMap.canMove(from,to,radius),
 environmentNextPoint:(from,to)=>spatialMap.nearestWaypoint(from,to),
  findCover:(from,to)=>spatialMap.findCoverSpot(from,to),
 hasCover:(from,to)=>spatialMap.lineBlocked(from,to,.11),
 spawn:(n,boss)=>wave(n,boss),spawnPending:()=>spawnQueue.length,animateEnemy,animateHuman,projectiles:()=>orbs,enemies:()=>enemies,enemyShot:pos=>combatFX.shot(pos,true,'rifle'),spawnCTFBot,ctfBotShot,ctfTag:applyCTFTag,ctfFinish:finishCTF,
 buildEnemy:(variant,boss,appearance,team)=>{const e=createTacticalActor(THREE,variant,team==='blue'?'operator':'raider');e.team=team||'red';e.ctfBot=!!team;e.boss=boss;if(boss){e.root.scale.setScalar(1.85);e.hp=22;e.size*=1.85}
 e.appearance=['raiderA','raiderB','raiderC','raiderD','operator'].includes(appearance)?appearance:'raiderA';
 if(e.ctfBot){
   e.floor=true;e.root.scale.setScalar(.92);e.hp=3;e.size=.94;
   const teamColor=e.team==='blue'?0x46c7ff:0xff6158;
   const band=new THREE.Mesh(new THREE.TorusGeometry(.15,.032,8,18),new THREE.MeshStandardMaterial({color:teamColor,emissive:teamColor,emissiveIntensity:.37}));
   band.position.set(.05,1.33,.03);band.rotation.x=Math.PI/2;e.root.add(band);
   attachRespawnShield(e);
 }
 attachContactShadow(e);
 attachHuman(e,e.appearance);return e},damageEnemy,damage,heal,remoteStart,clock:()=>seconds,wave:()=>round,setGuestStats:(clock,wave,teamKills)=>{if(Number.isFinite(clock))seconds=clock;if(Number.isFinite(wave))round=wave;if(Number.isInteger(teamKills)&&teamKills>=0)kills=Math.max(kills,teamKills)},victory:finish});
mission.configureLobby();
for(const id of ['gameSelect','ctfTeamMode','ctfBots','ctfDifficulty']){
 $(id).addEventListener('change',()=>{mission.configureLobby();hud(true)});
}
$('ctfMyTeam').addEventListener('change',()=>{mission.chooseMyTeam();hud(true)});

async function startAR(){if(!navigator.xr){toast('Este navegador no admite WebXR');return}$('startAR').disabled=true;try{ar=await navigator.xr.requestSession('immersive-ar',{
 requiredFeatures:['hit-test'],optionalFeatures:['anchors','dom-overlay','depth-sensing','plane-detection'],domOverlay:{root:$('ui')},
 depthSensing:{usagePreference:['cpu-optimized'],dataFormatPreference:['luminance-alpha','float32']}
}).catch(()=>navigator.xr.requestSession('immersive-ar',{requiredFeatures:['hit-test'],optionalFeatures:['anchors','dom-overlay'],domOverlay:{root:$('ui')}}));ar.addEventListener('end',()=>{ar=null;mode='idle';$('intro').classList.remove('hidden');$('hud').classList.add('hidden');$('outro').classList.add('hidden');world.background=null;cleanup();$('startAR').disabled=false});ar.addEventListener('select',()=>{const t=performance.now();if(t-lastTouch<310)return;lastTouch=t;if(mapping)markMapPoint();else if(placing)smartAction();else fire()});await renderer.xr.setSession(ar);local=renderer.xr.getReferenceSpace();const viewer=await ar.requestReferenceSpace('viewer');source=await ar.requestHitTestSource({space:viewer});mode='ar';$('mode').textContent=mission?.isCapture?.()?'CAPTURA LA BANDERA / CÁMARA AR':'RESCATE DE REHENES / CÁMARA AR';$('intro').classList.add('hidden');$('hud').classList.remove('hidden');reset()}catch(e){$('startAR').disabled=false;$('compat').textContent='AR no disponible: '+(e.message||'sin permiso')+'. Usá Chrome en Android compatible con ARCore.'}}
function demo(){mode='demo';occluders=[];$('demoMovement').classList.remove('hidden');world.background=new THREE.Color(0x17191f);world.fog=new THREE.Fog(0x17191f,5,14);camera.position.set(0,1.55,3.45);camera.rotation.order='YXZ';const floor=new THREE.Mesh(new THREE.PlaneGeometry(12,12),new THREE.MeshStandardMaterial({color:0x303a42,roughness:.91,metalness:.05}));floor.rotation.x=-Math.PI/2;world.add(floor);const wall=new THREE.Mesh(new THREE.BoxGeometry(9,4,.16),new THREE.MeshStandardMaterial({color:0x23303b,roughness:.95,metalness:.08}));wall.position.set(0,1.8,-3);world.add(wall);occluders.push(wall);

const box=(w,h,d,x,y,z,c)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:c,roughness:.92}));o.position.set(x,y,z);world.add(o);occluders.push(o)};
box(1.7,.13,.85,-1,.83,-1,0x523c34);for(const x of [-1.71,-.29])for(const z of [-1.35,-.65])box(.07,.81,.07,x,.41,z,0x33211f);
box(1.9,.4,.87,1.19,.22,-1.48,0x4c4448);box(1.9,.5,.2,1.19,.58,-1.91,0x3b363f);const plane=(x,y,z,w,h)=>{const o=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide}));o.rotation.x=-Math.PI/2;o.position.set(x,y,z);world.add(o);return o};surfaces=[floor,plane(-1,.91,-1,1.65,.82),plane(1.19,.47,-1.48,1.85,.82)];$('intro').classList.add('hidden');$('hud').classList.remove('hidden');$('mode').textContent='PRÁCTICA TÁCTICA 3D';reset();
spatialMap.addWall({x:-4.3,y:0,z:-2.92},{x:4.3,y:0,z:-2.92},{floorY:0,height:3.5});
spatialMap.addBox({x:-1.87,y:0,z:-1.48},{x:-.14,y:0,z:-.52},{floorY:0,height:.95});
spatialMap.addBox({x:.19,y:0,z:-2.20},{x:2.22,y:0,z:-.92},{floorY:0,height:.7});
spatialMap.setVisible(false);mapStatus();
toast('Deslizá para mirar. Marcá la entrada. Delimitá la zona en 2 toques si querés.')}
$('startAR').addEventListener('click',startAR);$('startDemo').addEventListener('click',demo);$('place').addEventListener('click',()=>{lastTouch=performance.now();place()});$('hostage').addEventListener('click',()=>{lastTouch=performance.now();placeHostage()});$('begin').addEventListener('click',()=>{lastTouch=performance.now();begin()});
// DOM Overlay touches must not generate a second XR select action.
for(const kind of ['pointerdown','pointerup','pointercancel']){
 $('hud').addEventListener(kind,e=>{
  if(e.target?.closest?.('button,input,#mapPanel,#setup,#interact'))lastTouch=performance.now();
 },true);
}
$('mapToggle').addEventListener('click',()=>{lastTouch=performance.now();toggleMap(true)});
$('mapArea').addEventListener('click',()=>{mapKind='area';mapFirst=null;mapPrecise=true;mapManualOverride=false;mapControls(true)});
$('mapWall').addEventListener('click',()=>{mapKind='wall';mapPrecise=false;mapFirst=null;mapControls(true)});
$('mapSize').addEventListener('input',e=>{mapFastSpan=Math.max(.7,Math.min(4.5,Number(e.target.value)||2));$('mapSizeText').textContent=mapFastSpan.toFixed(1).replace('.',',')+' m';mapControls(true)});
$('mapPrecision').addEventListener('click',()=>{mapPrecise=!mapPrecise;mapFirst=null;mapControls(true)});
$('smartPlace').addEventListener('click',()=>{lastTouch=performance.now();smartAction()});
$('mapFurniture').addEventListener('click',()=>{mapKind='box';mapPrecise=false;mapFirst=null;mapControls(true)});
$('mapMark').addEventListener('click',()=>{lastTouch=performance.now();markMapPoint()});
$('mapDistance').addEventListener('input',e=>{
 mapManualDistance=Math.max(.6,Math.min(5,Number(e.target.value)||1.8));mapManualOverride=true;
 $('mapDistanceText').textContent=mapManualDistance.toFixed(1)+' m';
 mapPoint=null;mapPointQuality='manual';mapControls(true);
});
$('mapUndo').addEventListener('click',()=>{
 if(mapFirst){mapFirst=null;mapControls(true);toast('ESQUINA PENDIENTE DESCARTADA');return}
 if(mapKind==='area'&&spatialMap.area){
   spatialMap.clearArea();mapControls(true);toast('ZONA BORRADA · PODÉS MARCARLA DE NUEVO');return
 }
 const removed=spatialMap.removeLast();mapControls(true);
 toast(removed?'ÚLTIMA MARCA DESHECHA ↶':'TODAVÍA NO HAY OBJETOS PARA DESHACER')
});
$('mapFinish').addEventListener('click',()=>toggleMap(false));$('fire').addEventListener('pointerdown',e=>{e.preventDefault();lastTouch=performance.now();triggerHeld=true;try{$('fire').setPointerCapture(e.pointerId)}catch(_){}fire()});
$('fire').addEventListener('pointerup',()=>triggerHeld=false);
$('fire').addEventListener('pointercancel',()=>triggerHeld=false);
window.addEventListener('blur',()=>triggerHeld=false);
$('swapGun').addEventListener('click',switchWeapon);$('reload').addEventListener('click',reload);$('aimMode').addEventListener('click',()=>{
 aiming=!aiming;
 $('aimMode').classList.toggle('aimed',aiming);
 $('aimMode').textContent=aiming?'SALIR MIRA':'MIRA ◎';
 $('sight').classList.toggle('ads',aiming);
 if(mode==='demo'){camera.fov=aiming?58:65;camera.updateProjectionMatrix()}
});$('placeMore').addEventListener('click',more);$('quit').addEventListener('click',()=>ar?ar.end():location.reload());$('restart').addEventListener('click',()=>{if(mode==='ar'){$('outro').classList.add('hidden');$('hud').classList.remove('hidden');reset()}else location.reload()});
renderer.domElement.addEventListener('pointerdown',e=>{if(mode==='demo'){drag=true;renderer.domElement.setPointerCapture(e.pointerId)}});renderer.domElement.addEventListener('pointerup',()=>drag=false);renderer.domElement.addEventListener('pointermove',e=>{if(mode==='demo'&&drag){yaw-=e.movementX*.005;pitch=clamp(pitch-e.movementY*.005,-1.18,1.18);camera.rotation.set(pitch,yaw,0)}});renderer.domElement.addEventListener('click',()=>{if(mode==='demo'){if(placing)place();else fire()}});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);resizeGun()});
(async()=>{try{if(navigator.xr&&await navigator.xr.isSessionSupported('immersive-ar'))$('compat').textContent='AR disponible. Abrí desde Chrome Android y buscá superficies reales.';else{$('compat').textContent='AR no disponible en este dispositivo/navegador. Probá PRÁCTICA 3D.';$('startAR').disabled=true}}catch(e){$('compat').textContent='No se pudo comprobar AR. Podés intentar activarlo.'}})();hud();