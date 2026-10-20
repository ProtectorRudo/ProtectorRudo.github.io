import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.181.0/build/three.module.js';
import { Spring } from './spring.js';
import { createMission } from './missions.js';
import { createTacticalActor } from './tactical.js';
import { createTacticalRifle } from './rifle.js';
import { steerEnemy, animateEnemy } from './walkers.js';
const $=id=>document.getElementById(id),rnd=(a,b)=>a+Math.random()*(b-a),clamp=THREE.MathUtils.clamp;
const world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.01,60);
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.48;renderer.setPixelRatio(Math.min(devicePixelRatio,1.55));renderer.setSize(innerWidth,innerHeight);$('world').append(renderer.domElement);
world.add(new THREE.HemisphereLight(0xd8e8f1,0x2c1c28,2.15));const key=new THREE.DirectionalLight(0xf3cbb3,1.95);key.position.set(2,4,1);world.add(key);const rim=new THREE.PointLight(0xa72636,8,6);rim.position.set(-1,1.7,-2);world.add(rim);
const geo={ball:new THREE.SphereGeometry(1,16,12),lo:new THREE.SphereGeometry(1,9,7),tube:new THREE.CylinderGeometry(1,1,1,8),fang:new THREE.ConeGeometry(1,1,8)};
function tex(){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#aaaaaa';ctx.fillRect(0,0,256,256);for(let i=0;i<11000;i++){let k=Math.floor(rnd(40,200));ctx.fillStyle='rgba('+k+','+k+','+k+','+rnd(.04,.27)+')';const s=rnd(.3,2.6);ctx.fillRect(rnd(0,256),rnd(0,256),s,s)}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,2);return t}
const rough=tex();const mat={skin:new THREE.MeshStandardMaterial({color:0x726663,roughness:.91,bumpMap:rough,bumpScale:.04}),dark:new THREE.MeshStandardMaterial({color:0x2a2b31,roughness:.96,bumpMap:rough,bumpScale:.055}),wet:new THREE.MeshStandardMaterial({color:0x783c42,roughness:.65,metalness:.06,bumpMap:rough,bumpScale:.026}),bone:new THREE.MeshStandardMaterial({color:0xc5b9a3,roughness:.8}),eye:new THREE.MeshStandardMaterial({color:0xff6848,emissive:0xdb3119,emissiveIntensity:2.1}),mouth:new THREE.MeshBasicMaterial({color:0x060405}),hit:new THREE.MeshBasicMaterial({visible:false}),blood:new THREE.MeshBasicMaterial({color:0xa23a3e,transparent:true,opacity:.94}),shot:new THREE.MeshBasicMaterial({color:0xffdfaf,transparent:true,depthTest:false}),sigil:new THREE.MeshBasicMaterial({color:0xb55e55,transparent:true,opacity:.9,side:THREE.DoubleSide})};
function node(root,g,m,p,s,rot){const o=new THREE.Mesh(g,m);o.position.set(...p);o.scale.set(...s);if(rot)o.rotation.set(...rot);root.add(o);return o}
function segment(root,m,a,b,r1,r2){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),v=q.clone().sub(p),o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,v.length(),8),m);o.position.copy(p.add(q).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());root.add(o);return o}
function creature(variant){return createTacticalActor(THREE,variant,'raider')}
const reticle=new THREE.Group();const ring=new THREE.Mesh(new THREE.RingGeometry(.11,.128,36).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x91e5be,side:THREE.DoubleSide,depthTest:false}));ring.renderOrder=10;reticle.add(ring);reticle.visible=false;world.add(reticle);
let ar=null,local=null,source=null,mode='idle',placing=true,active=false,ended=false,pose=null,hitResult=null,surfaces=[],nests=[],enemies=[],orbs=[],trails=[],splinters=[],life=100,round=0,ammo=28,reloading=false,kills=0,seconds=210,newRound=0,now=0,previous=0,lastTouch=0,lastShot=0,monsterId=0,projectileId=0,toastExpiry=0,eventExpiry=0,drag=false,yaw=0,pitch=0,audio,mission=null,joystick={x:0,y:0};
const ray=new THREE.Raycaster(),vec=new THREE.Vector3(),quat=new THREE.Quaternion(),getCam=()=>mode==='ar'?renderer.xr.getCamera(camera):camera;
function vibrate(a){try{navigator.vibrate?.(a)}catch(e){}}
function tone(type){try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),o2=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;o.type='sawtooth';o2.type='triangle';const f=type==='fire'?145:type==='hurt'?76:440;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(type==='fire'?36:55,t+.18);o2.frequency.setValueAtTime(f*1.6,t);o2.frequency.exponentialRampToValueAtTime(50,t+.16);g.gain.setValueAtTime(type==='fire'?.13:.055,t);g.gain.exponentialRampToValueAtTime(.0001,t+.2);o.connect(g);o2.connect(g);g.connect(audio.destination);o.start(t);o2.start(t);o.stop(t+.21);o2.stop(t+.20)}catch(e){}}
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');toastExpiry=performance.now()+2100}
function event(s){$('event').textContent=s;$('event').classList.remove('hidden');eventExpiry=performance.now()+2400;vibrate([60,30,75])}
function hud(){$('health').textContent=Math.ceil(life)+'%';$('healthBar').style.width=life+'%';$('wave').textContent=round?String(round).padStart(2,'0'):'—';$('clock').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(Math.max(0,Math.floor(seconds%60))).padStart(2,'0');$('ammo').innerHTML=ammo+'<span> / '+capacity()+'</span>';$('nestCount').textContent='NIDOS FIJADOS: '+nests.length;$('begin').disabled=nests.length===0;$('begin').textContent=active?'VOLVER AL COMBATE':'INICIAR INVASIÓN'}
function ui(){$('swapGun').classList.toggle('hidden',!active);$('setup').classList.toggle('hidden',!placing);$('fight').classList.toggle('hidden',placing);$('gunCanvas').classList.toggle('hidden',!active);$('hint').classList.toggle('hidden',!placing);$('sightText').textContent=placing?'RASTREANDO SUPERFICIE':'';hud()}
function cleanup(){for(const e of enemies)e.root.parent?.remove(e.root);for(const n of nests){try{n.anchor?.delete()}catch(e){}world.remove(n.root)}for(const i of [...orbs,...trails,...splinters])world.remove(i.mesh);nests=[];enemies=[];orbs=[];trails=[];splinters=[]}
function reset(){mission?.reset();triggerHeld=false;aiming=false;aimBlend=0;$('aimMode').classList.remove('aimed');$('aimMode').textContent='MIRA ◎';$('sight').classList.remove('ads');if(mode==='demo'){camera.fov=65;camera.updateProjectionMatrix()}cleanup();placing=true;active=false;ended=false;round=0;kills=0;currentWeapon='rifle';magazines={rifle:28,pistol:12};ammo=28;if(gunReady)syncWeapon();reloading=false;seconds=210;life=100;newRound=0;pose=null;hitResult=null;previous=0;ui();toast('Buscá una mesa, un sillón o el piso y fijá nidos.')}
function place(){if(!placing||nests.length>=7)return;let point,rotation;const old=hitResult;
if(mode==='demo'){ray.setFromCamera({x:0,y:0},camera);const h=ray.intersectObjects(surfaces,false)[0];if(!h){toast('Apuntá a un mueble o al piso');return}point=h.point.clone();rotation=new THREE.Quaternion()}
else{if(!pose){toast('No hay una superficie estable todavía');return}point=new THREE.Vector3().setFromMatrixPosition(pose);rotation=new THREE.Quaternion().setFromRotationMatrix(pose)}
const root=new THREE.Group();root.position.copy(point);root.quaternion.copy(rotation);world.add(root);const circle=new THREE.Mesh(new THREE.TorusGeometry(.16,.006,6,42).rotateX(-Math.PI/2),mat.sigil);circle.position.y=.012;root.add(circle);const eyeAtNest=new THREE.Vector3();getCam().getWorldPosition(eyeAtNest);const verticalGap=eyeAtNest.y-point.y;const isFloor=verticalGap>1.19;const n={root,anchor:null,radius:isFloor?.68:.27,floor:isFloor,surfaceScale:isFloor?1:verticalGap<.84?.34:.5};nests.push(n);if(mode==='ar'&&old&&typeof old.createAnchor==='function')Promise.resolve(old.createAnchor()).then(anchor=>{if(nests.includes(n))n.anchor=anchor}).catch(()=>{});if(nests.length===1)mission?.align(n.root);hud();tone('hit');toast('NIDO '+nests.length+' FIJADO AL ENTORNO')}
function wave(total=6,boss=false){if(mission?.isGuest())return;round++;total=Math.max(1,Math.min(18,total));for(let i=0;i<total;i++){const n=nests[(i+round)%nests.length],e=creature(boss?1:(i+round)%5===0?1:(i+round)%3===0?2:0),theta=(i/total)*Math.PI*2+rnd(-.25,.25),dist=Math.sqrt(Math.random())*n.radius;e.root.position.set(Math.cos(theta)*dist,.016,Math.sin(theta)*dist);e.id=++monsterId;e.boss=boss;e.floor=n.floor;e.roamRadius=n.floor?3:.27;e.next=now+rnd(1800,3500);e.hit.userData.enemy=e;n.root.add(e.root);n.root.updateMatrixWorld(true);world.updateMatrixWorld(true);world.attach(e.root);e.root.scale.multiplyScalar(n.surfaceScale);if(boss){e.hp=22;e.root.scale.multiplyScalar(1.85)}e.size*=n.surfaceScale*(boss?1.85:1);e.home=e.root.position.clone();e.groundY=e.root.position.y;e.start.copy(e.root.position);e.nextTarget=0;e.targetId=null;enemies.push(e)}event('OLEADA '+round+' / MOVIMIENTO HOSTIL');tone('hurt');hud()}
function begin(){if(!nests.length)return;if(!mission?.start())return;if(!gunReady)buildGun();if(!active){active=true;round=0;if(!mission?.isGuest())wave(3,false)}placing=false;ui();mission?.ui()}
function more(){placing=true;ui();toast('Localizá otra superficie; la amenaza sigue activa.')}
function trail(start,end){let d=end.clone().sub(start),o=new THREE.Mesh(new THREE.CylinderGeometry(.003,.006,d.length(),5),mat.shot.clone());o.position.copy(start).addScaledVector(d,.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());world.add(o);trails.push({mesh:o,until:now+120})}
function impact(p){for(let j=0;j<12;j++){let m=new THREE.Mesh(new THREE.TetrahedronGeometry(rnd(.01,.04)),mat.blood.clone());m.position.copy(p);world.add(m);splinters.push({mesh:m,velocity:new THREE.Vector3(rnd(-.8,.8),rnd(.2,1.3),rnd(-.8,.8)),until:now+rnd(300,850)})}}
function damageEnemy(e,amount=1){if(!e?.alive)return;e.hp-=amount;if(e.hp<=0){e.alive=false;e.root.visible=false;kills++;event('AMENAZA NEUTRALIZADA / '+kills);mission?.onKill(e)}else toast('IMPACTO / '+e.hp+' RESISTENCIA')}
function fire(){if(!active||ended||placing||reloading)return;if(ammo===0){reload();return}let t=performance.now();if(t-lastShot<(currentWeapon==='rifle'?105:170))return;lastShot=t;ammo--;gunShot();tone('fire');vibrate(35);hud();const c=getCam(),p=new THREE.Vector3(),q=new THREE.Quaternion();c.getWorldPosition(p);c.getWorldQuaternion(q);const forward=new THREE.Vector3(0,0,-1).applyQuaternion(q);ray.set(p,forward);ray.far=12;const hits=ray.intersectObjects(enemies.filter(e=>e.alive).map(e=>e.hit),false);let end=p.clone().addScaledVector(forward,7);if(hits.length){const h=hits[0],e=h.object.userData.enemy;end.copy(h.point);impact(end);tone('hit');if(mission?.isGuest())mission.remoteHit(e.id);else damageEnemy(e,1)}trail(weaponMuzzleOrigin(c),end);if(ammo===0)setTimeout(reload,240)}
function reload(){if(!active||ended||reloading||ammo===capacity())return;
 reloading=true;gunReload();tone('hit');toast('RECARGANDO '+(currentWeapon==='rifle'?'CARBINA':'PISTOLA')+'…');
 const type=currentWeapon;setTimeout(()=>{if(ended)return;magazines[type]=type==='rifle'?28:12;if(type===currentWeapon)ammo=magazines[type];reloading=false;hud()},currentWeapon==='rifle'?1600:1200);
}
function damage(value){if(mission?.shielded())return;life=Math.max(0,life-value);$('damage').classList.add('active');setTimeout(()=>$('damage').classList.remove('active'),180);tone('hurt');vibrate([90,35,90]);hud();if(life===0)finish(false)}
function finish(win){if(ended)return;mission?.onVictory(win);ended=true;active=false;placing=false;$('hud').classList.add('hidden');$('outro').classList.remove('hidden');$('status').textContent=win?'MISIÓN CUMPLIDA':'SEÑAL PERDIDA';$('outcome').innerHTML=win?'ZONA<br><em>ASEGURADA</em>':'CASA<br><em>INFECTADA</em>';$('outcomeText').textContent=(win?'Resististe las cinco oleadas. ':'La invasión tomó el control. ')+kills+' criaturas neutralizadas.'}
function updateXR(frame){if(!frame||!source||!local)return;pose=null;hitResult=null;reticle.visible=false;if(placing){for(const hit of frame.getHitTestResults(source)){const p=hit.getPose(local);if(!p)continue;const matrix=new THREE.Matrix4().fromArray(p.transform.matrix);const q=new THREE.Quaternion().setFromRotationMatrix(matrix);const up=new THREE.Vector3(0,1,0).applyQuaternion(q);if(up.y<.55)continue;pose=matrix;hitResult=hit;reticle.position.setFromMatrixPosition(matrix);reticle.quaternion.copy(q);reticle.visible=true;break}}$('place').disabled=!pose||nests.length>=7;$('surface').textContent=pose?'SUPERFICIE DETECTADA':'BUSCANDO SUPERFICIE';$('sight').classList.toggle('found',!!pose);if(placing)$('sightText').textContent=pose?'SUPERFICIE ESTABLE':'RASTREANDO SUPERFICIE';for(const n of nests)if(n.anchor){const p=frame.getPose(n.anchor.anchorSpace,local);if(p){n.root.position.set(p.transform.position.x,p.transform.position.y,p.transform.position.z);n.root.quaternion.set(p.transform.orientation.x,p.transform.orientation.y,p.transform.orientation.z,p.transform.orientation.w)}}}
function updateDemo(){if(!placing)return;ray.setFromCamera({x:0,y:0},camera);const hit=ray.intersectObjects(surfaces,false)[0];reticle.visible=!!hit;if(hit)reticle.position.copy(hit.point);$('place').disabled=!hit||nests.length>=7;$('sight').classList.toggle('found',!!hit);$('surface').textContent=hit?(hit.point.y>.75?'MESA DETECTADA':hit.point.y>.35?'SILLÓN DETECTADO':'PISO DETECTADO'):'BUSCANDO SUPERFICIE';$('sightText').textContent=hit?'SUPERFICIE ESTABLE':'RASTREANDO SUPERFICIE'}
function updateBattle(dt,t){
 if(!active||ended)return;
 if(mission?.isGuest()){hud();return}
 seconds=Math.max(0,seconds-dt);if(seconds===0){finish(false);return}
 const eye=new THREE.Vector3();getCam().getWorldPosition(eye);
 let threat=false;
 for(const e of enemies)if(e.alive){
  if(!e.targetId||t>e.nextTarget){const target=mission?.chooseTarget();e.targetId=target?.id||'local';e.nextTarget=t+rnd(1800,3200)}
  const targetWorld=mission?.getPlayerWorld(e.targetId)||eye;
  const moved=steerEnemy(e,dt,t,targetWorld,mode);
  animateEnemy(e,dt,moved);
  const wp=new THREE.Vector3();e.root.getWorldPosition(wp);
  if(wp.distanceTo(eye)<3.1)threat=true;
  if(t>e.next&&wp.distanceTo(targetWorld)<8){
   e.next=t+(e.variant===2?2400:3300)+rnd(0,1150);
   const m=new THREE.Mesh(new THREE.IcosahedronGeometry(e.variant===1?.105:.078,1),new THREE.MeshBasicMaterial({color:e.variant===2?0xee785c:0xaf3949,transparent:true,opacity:.93}));
   m.position.copy(wp).add(new THREE.Vector3(0,e.size*.73,0));
   const vel=targetWorld.clone().sub(m.position).normalize().multiplyScalar(e.variant===2?3.4:2.4);
   world.add(m);orbs.push({id:++projectileId,mesh:m,vel,targetId:e.targetId,until:t+3500,power:e.variant===1?12:7});
  }
 }
 $('alert').classList.toggle('hidden',!threat);
 for(let i=orbs.length-1;i>=0;i--){
  const a=orbs[i];a.mesh.position.addScaledVector(a.vel,dt);a.mesh.rotation.y+=dt*4;
  const victim=a.targetId?mission?.getPlayerWorld(a.targetId):eye;
  if(victim&&a.mesh.position.distanceTo(victim)<.43){mission?.requestHit(a.targetId||'local',a.power);world.remove(a.mesh);orbs.splice(i,1)}
  else if(t>a.until){world.remove(a.mesh);orbs.splice(i,1)}
 }
 const c=getCam();c.getWorldPosition(vec);c.getWorldQuaternion(quat);ray.set(vec,new THREE.Vector3(0,0,-1).applyQuaternion(quat));ray.far=12;
 $('sight').classList.toggle('hit',!placing&&ray.intersectObjects(enemies.filter(e=>e.alive).map(e=>e.hit),false).length>0);hud();
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
function updateFrame(t,frame){now=t;if(triggerHeld&&currentWeapon==='rifle'&&active&&!placing)fire();const dt=previous?Math.min(.052,(t-previous)/1000):0;previous=t;if(mode==='ar')updateXR(frame);if(mode==='demo'){moveDemo(dt);updateDemo()}updateBattle(dt,t);mission?.tick(dt,t);effects(dt,t);renderer.render(world,camera);updateGun(dt,t)}
renderer.setAnimationLoop(updateFrame);

function remoteStart(){if(!nests.length||active)return;begin()}
function heal(amount){life=Math.min(100,life+amount);hud();toast('ENERGÍA RESTAURADA +'+Math.floor(amount))}
const movementKeys={forward:false,back:false,left:false,right:false};
function moveDemo(dt){if(mode!=='demo'||!dt)return;const x=joystick.x+(movementKeys.right?1:0)-(movementKeys.left?1:0),y=joystick.y+(movementKeys.back?1:0)-(movementKeys.forward?1:0);if(Math.abs(x)+Math.abs(y)<.03)return;const forward=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);forward.y=0;forward.normalize();const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);right.y=0;right.normalize();const move=right.multiplyScalar(x).addScaledVector(forward,-y);if(move.length()>1)move.normalize();const next=camera.position.clone().addScaledVector(move,dt*1.55);next.x=clamp(next.x,-3.7,3.7);next.z=clamp(next.z,-2.55,4.4);const inTable=(next.x>-1.91&&next.x<-.09&&next.z>-1.54&&next.z<-.47),inSofa=(next.x>.07&&next.x<2.29&&next.z>-2.12&&next.z<-.92);if(!inTable&&!inSofa)camera.position.copy(next)}
const movementPad=$('joyTrack'),joyKnob=$('joyKnob');function joyZero(){joystick.x=0;joystick.y=0;joyKnob.style.transform='translate(0,0)'}
function joyMove(e){const r=movementPad.getBoundingClientRect(),dx=(e.clientX-r.left-r.width/2)/(r.width*.39),dy=(e.clientY-r.top-r.height/2)/(r.height*.39),length=Math.max(1,Math.hypot(dx,dy));joystick.x=dx/length;joystick.y=dy/length;joyKnob.style.transform='translate('+joystick.x*34+'px,'+joystick.y*34+'px)'}
movementPad.addEventListener('pointerdown',e=>{e.preventDefault();movementPad.setPointerCapture(e.pointerId);joyMove(e)});movementPad.addEventListener('pointermove',e=>{if(movementPad.hasPointerCapture(e.pointerId))joyMove(e)});movementPad.addEventListener('pointerup',joyZero);movementPad.addEventListener('pointercancel',joyZero);
window.addEventListener('keydown',e=>{if(['KeyW','ArrowUp'].includes(e.code))movementKeys.forward=true;if(['KeyS','ArrowDown'].includes(e.code))movementKeys.back=true;if(['KeyA','ArrowLeft'].includes(e.code))movementKeys.left=true;if(['KeyD','ArrowRight'].includes(e.code))movementKeys.right=true});
window.addEventListener('keyup',e=>{if(['KeyW','ArrowUp'].includes(e.code))movementKeys.forward=false;if(['KeyS','ArrowDown'].includes(e.code))movementKeys.back=false;if(['KeyA','ArrowLeft'].includes(e.code))movementKeys.left=false;if(['KeyD','ArrowRight'].includes(e.code))movementKeys.right=false});
mission=createMission({scene:world,getCam,toast,event,active:()=>active,firstNest:()=>nests[0],spawn:(n,boss)=>wave(n,boss),animateEnemy,projectiles:()=>orbs,enemies:()=>enemies,buildEnemy:(variant,boss)=>{const e=creature(variant);e.boss=boss;if(boss){e.root.scale.setScalar(1.85);e.hp=22;e.size*=1.85}return e},damageEnemy,damage,heal,remoteStart,clock:()=>seconds,wave:()=>round,setGuestStats:(clock,wave)=>{seconds=clock;round=wave},victory:finish});

async function startAR(){if(!navigator.xr){toast('Este navegador no admite WebXR');return}$('startAR').disabled=true;try{ar=await navigator.xr.requestSession('immersive-ar',{requiredFeatures:['hit-test'],optionalFeatures:['anchors','dom-overlay'],domOverlay:{root:$('ui')}});ar.addEventListener('end',()=>{ar=null;mode='idle';$('intro').classList.remove('hidden');$('hud').classList.add('hidden');$('outro').classList.add('hidden');world.background=null;cleanup();$('startAR').disabled=false});ar.addEventListener('select',()=>{const t=performance.now();if(t-lastTouch<310)return;lastTouch=t;if(placing)place();else fire()});await renderer.xr.setSession(ar);local=renderer.xr.getReferenceSpace();const viewer=await ar.requestReferenceSpace('viewer');source=await ar.requestHitTestSource({space:viewer});mode='ar';$('mode').textContent='OPERACIÓN SOMBRA / CÁMARA AR';$('intro').classList.add('hidden');$('hud').classList.remove('hidden');reset()}catch(e){$('startAR').disabled=false;$('compat').textContent='AR no disponible: '+(e.message||'sin permiso')+'. Usá Chrome en Android compatible con ARCore.'}}
function demo(){mode='demo';$('demoMovement').classList.remove('hidden');world.background=new THREE.Color(0x17191f);world.fog=new THREE.Fog(0x17191f,5,14);camera.position.set(0,1.55,3.45);camera.rotation.order='YXZ';const floor=new THREE.Mesh(new THREE.PlaneGeometry(12,12),new THREE.MeshStandardMaterial({color:0x333138,roughness:.98}));floor.rotation.x=-Math.PI/2;world.add(floor);const wall=new THREE.Mesh(new THREE.BoxGeometry(9,4,.16),new THREE.MeshStandardMaterial({color:0x29292b,roughness:1}));wall.position.set(0,1.8,-3);world.add(wall);
const box=(w,h,d,x,y,z,c)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:c,roughness:.92}));o.position.set(x,y,z);world.add(o)};
box(1.7,.13,.85,-1,.83,-1,0x523c34);for(const x of [-1.71,-.29])for(const z of [-1.35,-.65])box(.07,.81,.07,x,.41,z,0x33211f);
box(1.9,.4,.87,1.19,.22,-1.48,0x4c4448);box(1.9,.5,.2,1.19,.58,-1.91,0x3b363f);const plane=(x,y,z,w,h)=>{const o=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide}));o.rotation.x=-Math.PI/2;o.position.set(x,y,z);world.add(o);return o};surfaces=[floor,plane(-1,.91,-1,1.65,.82),plane(1.19,.47,-1.48,1.85,.82)];$('intro').classList.add('hidden');$('hud').classList.remove('hidden');$('mode').textContent='PRÁCTICA TÁCTICA 3D';reset();toast('Deslizá el dedo para mirar. Ubicá los nidos.')}
$('startAR').addEventListener('click',startAR);$('startDemo').addEventListener('click',demo);$('place').addEventListener('click',()=>{lastTouch=performance.now();place()});$('begin').addEventListener('click',()=>{lastTouch=performance.now();begin()});$('fire').addEventListener('pointerdown',e=>{e.preventDefault();lastTouch=performance.now();triggerHeld=true;try{$('fire').setPointerCapture(e.pointerId)}catch(_){}fire()});
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