/* RODEADOS 360 — original stylized, articulated robot art.
   Techniques adapted from our Blackzone Three.js pipeline: real meter scale,
   MeshStandardMaterial, limb pivots, stable ground shadows and true 3-D objects. */
export function createRodeadosArt(THREE,scene,camera){
 const root=new THREE.Group();scene.add(root);
 const arena=new THREE.Group();root.add(arena);
 const actors=new Map(),sparks=[],tracers=[],waves=[];let recoil=0,bombProjectile=null,robotAdapter=null;
 const geo={box:new THREE.BoxGeometry(1,1,1),sphere:new THREE.SphereGeometry(1,16,12),
  cyl:new THREE.CylinderGeometry(1,1,1,12),disc:new THREE.CircleGeometry(1,34),
  ring:new THREE.TorusGeometry(1,.026,7,40),cone:new THREE.ConeGeometry(1,1,9)};
 const material=(col,metal=.4,rough=.36,emit=0)=>new THREE.MeshStandardMaterial({color:col,metalness:metal,roughness:rough,
   emissive:emit?col:0x000000,emissiveIntensity:emit});
 const M={
  steel:material(0x263645,.72,.48,.045),dark:material(0x07101d,.54,.55),edge:material(0x495968,.78,.31,.055),
  light:material(0xa7bcd1,.66,.24),gold:material(0xffbe4f,.63,.23,.46),
  cyan:material(0x46f8e9,.38,.23,1.4),red:material(0xff4766,.28,.3,1.3),
  violet:material(0xb47cfa,.45,.3,.8),black:material(0x050811,.1,.9),
  orange:material(0xff7733,.36,.3,1.2),green:material(0x7fffc5,.2,.3,.6)
 };
 const overlay=(color,opacity=.5)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide});
 const tileMat=[overlay(0x03c9d0,.9),overlay(0x08729f,.92)];
 const pickMat=overlay(0x8fffd3,.96),lowMat=overlay(0x167e87,.18);
 for(const mat of [...tileMat,pickMat,lowMat]){mat.depthWrite=false;mat.depthTest=false;mat.toneMapped=false;}
 const borderMat=new THREE.MeshBasicMaterial({color:0x65ffe6,depthTest:false,depthWrite:false,toneMapped:false});
 const box=(parent,mat,p,s,geometry=geo.box)=>{
  const v=new THREE.Mesh(geometry,mat);v.position.set(...p);v.scale.set(...s);parent.add(v);return v;
 };
 const part=(parent,mat,p,s)=>box(parent,mat,p,s);
 const sphere=(parent,mat,p,s)=>box(parent,mat,p,s,geo.sphere);
 const warMat=Array.from({length:25},()=>new THREE.MeshBasicMaterial({
  color:0x24343b,transparent:true,opacity:.76,depthTest:false,depthWrite:false,toneMapped:false,side:THREE.DoubleSide
 }));
 const warMarks=[],warBurn=[],warCracks=[],warScars=[];
 // One lightweight procedural scorch texture shared across all 25 cells.
 const burnCanvas=document.createElement('canvas');burnCanvas.width=128;burnCanvas.height=128;
 const burnCtx=burnCanvas.getContext('2d'),grad=burnCtx.createRadialGradient(64,64,3,64,64,62);
 grad.addColorStop(0,'rgba(10,4,2,.96)');grad.addColorStop(.38,'rgba(26,9,3,.75)');
 grad.addColorStop(.72,'rgba(78,25,6,.30)');grad.addColorStop(1,'rgba(80,26,4,0)');
 burnCtx.fillStyle=grad;burnCtx.fillRect(0,0,128,128);
 const burnTexture=new THREE.CanvasTexture(burnCanvas);burnTexture.colorSpace=THREE.SRGBColorSpace;
 const burnGeo=new THREE.PlaneGeometry(1,1);
 for(let i=0;i<25;i++){
  const deck=new THREE.Group();deck.position.y=.058;arena.add(deck);warMarks.push(deck);
  const coordinates=[
   -.42,0,-.42,-.23,0,-.42,.23,0,-.42,.42,0,-.42,
   -.42,0,.42,-.23,0,.42,.23,0,.42,.42,0,.42,
   -.42,0,-.42,-.42,0,-.23,.42,0,-.42,.42,0,-.23,
   -.42,0,.23,-.42,0,.42,.42,0,.23,.42,0,.42,
   -.14,0,0,-.045,0,0,.045,0,0,.14,0,0,
   -.36,0,-.30,-.28,0,-.22,.36,0,.30,.28,0,.22
  ];
  const seamGeometry=new THREE.BufferGeometry();
  seamGeometry.setAttribute('position',new THREE.Float32BufferAttribute(coordinates,3));
  const seams=new THREE.LineSegments(seamGeometry,new THREE.LineBasicMaterial({
   color:0x94b4a4,transparent:true,opacity:.55,depthTest:false,depthWrite:false,toneMapped:false}));
  deck.add(seams);
  const scorch=new THREE.Mesh(burnGeo,new THREE.MeshBasicMaterial({
   map:burnTexture,color:0xffffff,transparent:true,opacity:0,depthTest:false,depthWrite:false,toneMapped:false,
   side:THREE.DoubleSide}));
  scorch.rotation.x=-Math.PI/2;scorch.position.y=.006;deck.add(scorch);warBurn.push(scorch);
  const fractures=[];
  for(let k=0;k<3;k++){
   const seed=i*17+k*11,ax=((seed*7)%17-8)/27,az=((seed*13)%19-9)/28;
   const parts=[0,0,ax*.43,az*.6,ax*.43,az*.6,ax,az,
    ax*.43,az*.6,ax*.8-.08,az*.85+.1];
   for(let j=0;j<parts.length;j+=4)
    fractures.push(parts[j],.012,parts[j+1],parts[j+2],.012,parts[j+3]);
  }
  const fractureGeometry=new THREE.BufferGeometry();
  fractureGeometry.setAttribute('position',new THREE.Float32BufferAttribute(fractures,3));
  const crack=new THREE.LineSegments(fractureGeometry,new THREE.LineBasicMaterial({
   color:0xff7d45,transparent:true,opacity:0,depthTest:false,depthWrite:false,toneMapped:false}));
  deck.add(crack);warCracks.push(crack);warScars.push(-1);
 }
 const tiles=[],edges=[];
 const center=new THREE.Group();arena.add(center);
 for(let i=0;i<25;i++){
  const q=new THREE.Mesh(geo.box,tileMat[i%2]);q.userData.cell=i;q.userData.floor=true;
  q.position.y=.012;arena.add(q);tiles.push(q);
 }
 for(let i=0;i<4;i++){const e=new THREE.Mesh(geo.box,borderMat);e.position.y=.03;arena.add(e);edges.push(e)}
 const marker=new THREE.Mesh(new THREE.RingGeometry(.07,.115,26),new THREE.MeshBasicMaterial({color:0xeaffcb,side:THREE.DoubleSide}));
 marker.rotation.x=-Math.PI/2;marker.position.y=.055;center.add(marker);
 const markerDot=new THREE.Mesh(geo.sphere,M.cyan);markerDot.scale.set(.028,.028,.028);markerDot.position.y=.066;center.add(markerDot);
 const compass=new THREE.Group();arena.add(compass);
 part(compass,M.gold,[0,.06,-.14],[.048,.04,.18]);box(compass,M.cyan,[0,.07,-.27],[.07,.04,.08],geo.cone).rotation.x=-Math.PI/2;
 function setFloor(side,editing,cell=-1,player=null){
  const pitch=side/5,half=side*.5;
  for(let i=0;i<25;i++){const tile=tiles[i];
   tile.position.set((i%5-2)*pitch,.024,(Math.floor(i/5)-2)*pitch);
   tile.scale.set(pitch*.95,.012,pitch*.95);
   tile.material=editing&&i===cell?pickMat:(editing?tileMat[(i%5+Math.floor(i/5))%2]:warMat[i]);
    const deck=warMarks[i];deck.position.x=tile.position.x;deck.position.z=tile.position.z;
    deck.scale.set(pitch,1,pitch);deck.visible=!editing;
    warBurn[i].scale.set(.76,.76,.76);
  }
  for(let i=0;i<4;i++){const e=edges[i];const xx=i===0?-half:i===1?half:0,zz=i===2?-half:i===3?half:0;
   e.position.set(xx,.045,zz);e.scale.set(i<2?.034:side,.027,i<2?side:.034);
   e.material=borderMat;
  }
  // Cyan outline in editing; restrained amber hazard boundary in live combat.
  borderMat.color.set(editing?0x65ffe6:0xd8a55c);
  compass.position.set(0,.015,-half+.35);compass.visible=editing;
  center.visible=editing||!!player;
  if(player)center.position.set(player.x,.025,player.z);
  else if(cell>=0)center.position.set((cell%5-2)*pitch,.025,(Math.floor(cell/5)-2)*pitch);
  else center.position.set(0,.025,0);
  marker.material.color.set(editing?0xeaffcb:0x63ffc2);
 }
 function setFloorDamage(game,editing=false){
  for(let i=0;i<25;i++){
   const damage=game?.floorDamage?.[i]||0;
   const time=game?.floorHeat?.[i]??-100;
   const hot=Math.max(0,1-Math.max(0,(game?.elapsed??0)-time)/1.9);
   const step=Math.round(damage*25)/25,heat=Math.round(hot*6)/6;
   if(warScars[i]!==step+heat*10){
    warScars[i]=step+heat*10;
    warMat[i].color.set(0x24343b).lerp(new THREE.Color(0x271514),Math.min(1,step*.95));
    warMat[i].opacity=.76+step*.12;
    warBurn[i].material.opacity=Math.min(.7,damage*.58+heat*.12);
    warCracks[i].material.opacity=damage<.16?0:Math.min(.92,(damage-.16)*1.30+heat*.17);
    const border=warMarks[i].children[0].material;
    border.color.set(0x94b4a4).lerp(new THREE.Color(0xff7437),Math.min(1,step*1.3+heat*.38));
    border.opacity=.55+Math.min(.3,step*.2+heat*.22);
   }
   warMarks[i].visible=!editing;
  }
 }
 function createRobot(e){
  const kind=e.type,elite=kind==='boss'||kind==='tank',scale=e.height/1.75;
  const shell=kind==='boss'?M.red:kind==='tank'?M.edge:kind==='fast'?M.violet:kind==='flanker'?M.gold:kind==='joker'?M.orange:M.steel;
  const glow=kind==='boss'?M.orange:M.red;
  const visorMat=M.red.clone();visorMat.emissiveIntensity=1.85;
  const group=new THREE.Group();root.add(group);group.scale.setScalar(scale);
  const body=new THREE.Group();group.add(body);
  // Narrow athletic 1.75m humanoid silhouette. No giant 1m boxes or toy head.
  sphere(body,M.dark,[0,1.13,0],[.265,.36,.17]);
  sphere(body,shell,[0,1.20,.025],[.335,.36,.20]);
  sphere(body,M.edge,[0,1.30,.13],[.27,.21,.105]);
  part(body,M.dark,[0,1.08,.205],[.43,.13,.044]);
  part(body,M.black,[0,1.35,.238],[.29,.095,.025]);
  part(body,glow,[0,1.35,.259],[.16,.020,.015]);
  for(const side of [-1,1]){
   // Chest plates, titanium seam, and narrow armored collar.
   sphere(body,shell,[side*.155,1.23,.20],[.154,.215,.085]);
   part(body,M.dark,[side*.165,1.21,.272],[.021,.24,.017]);
   sphere(body,M.edge,[side*.27,1.40,.01],[.146,.12,.16]);
   part(body,glow,[side*.277,1.40,.156],[.024,.024,.016]);
  }
  sphere(body,M.black,[0,1.48,0],[.110,.10,.10]);
  // Compact helmet: eye line at 1.61m, physical height ~1.77m.
  const head=new THREE.Group();head.position.set(0,1.605,0);body.add(head);
  sphere(head,M.dark,[0,-.000,0],[.172,.185,.172]);
  sphere(head,shell,[0,.070,-.015],[.158,.09,.145]);
  sphere(head,M.black,[0,-.015,.112],[.145,.075,.086]);
  sphere(head,visorMat,[0,-.002,.177],[.126,.035,.023]);
  part(head,M.edge,[0,.099,.057],[.155,.025,.077]);
  // Threatening angular facial plates and a split crimson eye, no cute cartoon dots.
  for(const side of [-1,1]){
   const plate=part(head,M.dark,[side*.112,-.075,.142],[.12,.055,.06]);
   plate.rotation.z=side*.23;
   const spike=part(head,M.edge,[side*.10,.152,-.082],[.050,.10,.09]);
   spike.rotation.z=-side*.22;
  }
  for(const side of [-1,1]){
   sphere(head,M.black,[side*.17,-.008,0],[.034,.087,.080]);
   part(head,visorMat,[side*.134,-.025,.145],[.016,.034,.020]);
  }
  const arms=[],legs=[];
  for(const side of [-1,1]){
   const arm=new THREE.Group();arm.position.set(side*.335,1.35,0);body.add(arm);arms.push(arm);
   sphere(arm,M.dark,[0,-.015,0],[.074,.083,.085]);
   sphere(arm,shell,[side*.014,-.15,0],[.092,.17,.105]);
   sphere(arm,M.black,[0,-.305,.005],[.076,.075,.071]);
   sphere(arm,M.edge,[side*.014,-.44,.02],[.078,.16,.087]);
   part(arm,glow,[side*.015,-.435,.104],[.018,.11,.014]);
   sphere(arm,M.dark,[side*.017,-.595,.017],[.075,.09,.074]);
   // Narrow two-piece mechanical leg, articulated at hip and knee.
   const leg=new THREE.Group();leg.position.set(side*.136,.85,0);body.add(leg);legs.push(leg);
   sphere(leg,M.dark,[0,-.055,0],[.104,.14,.12]);
   sphere(leg,shell,[0,-.205,0],[.116,.25,.118]);
   sphere(leg,M.black,[0,-.420,.01],[.104,.075,.095]);
   sphere(leg,M.edge,[0,-.573,.015],[.105,.188,.11]);
   part(leg,glow,[0,-.554,.128],[.041,.130,.014]);
   sphere(leg,M.dark,[0,-.752,.085],[.121,.090,.196]);
   part(leg,shell,[0,-.760,.181],[.17,.050,.176]);
  }
  sphere(body,M.edge,[0,.86,0],[.22,.13,.15]);
  // Angular armored ribs / dorsal fins add an intimidating hunter silhouette
  // using cheap shared geometry (no heavyweight imported meshes).
  for(const side of [-1,1]){
   const shoulder=part(body,M.edge,[side*.37,1.42,-.08],[.095,.16,.22]);
   shoulder.rotation.z=-side*.21;
   const dorsal=part(body,M.black,[side*.20,1.35,-.195],[.07,.35,.14]);
   dorsal.rotation.z=side*.13;
   part(body,visorMat,[side*.245,1.23,.269],[.035,.09,.012]);
  }
  for(const side of [-1,1]){
   sphere(body,M.dark,[side*.21,1.01,-.09],[.070,.15,.13]);
   part(body,glow,[side*.192,1.06,-.231],[.030,.15,.017]);
  }
  // Silhouette extensions are reserved for stronger enemies, not generic blocks.
  if(elite)for(const side of [-1,1]){
   sphere(body,shell,[side*.35,1.38,-.08],[.12,.17,.18]);
   part(body,M.gold,[side*.346,1.43,.085],[.070,.038,.034]);
  }
  if(kind==='joker'){
   const crest=part(body,M.gold,[0,1.79,-.035],[.07,.12,.13]);crest.rotation.z=.19;
  }
  const shadow=new THREE.Mesh(geo.disc,overlay(0x061c24,.26));
  shadow.rotation.x=-Math.PI/2;shadow.scale.set(.5,.37,.42);shadow.position.set(0,.013,0);group.add(shadow);
  const portal=new THREE.Mesh(geo.ring,overlay(0x50e9ff,.65));
  portal.rotation.x=-Math.PI/2;portal.position.y=.10;portal.scale.setScalar(.4);group.add(portal);
  const hpBack=part(group,M.dark,[0,1.96,0],[.38,.028,.05]);
  const hpBar=part(group,M.green,[0,1.96,.031],[.35,.025,.035]);
  const weakSpot=new THREE.Mesh(geo.sphere,glow);
  weakSpot.position.set(0,1.34,.285);weakSpot.scale.set(.05,.045,.022);group.add(weakSpot);
  const actor={group,body,head,arms,legs,portal,shadow,hpBack,hpBar,weakSpot,shell,visorMat,phaseOffset:e.id*2.17,external:null};
  // The imported model is purely visual; head/body/leg hitboxes stay in core.
  if(robotAdapter){
   try{actor.external=robotAdapter.create({actor,enemy:e,THREE});
    actor.weakSpot.visible=false;
   }catch(err){console.warn('MANUL actor fallback',err);actor.external=null}
  }
  return actor;
 }
 function drawEnemies(game){
  const active=new Set();
  for(const e of game.enemies){
   active.add(e.id);
   let a=actors.get(e.id);if(!a){a=createRobot(e);actors.set(e.id,a)}
   a.group.position.set(e.x,0,e.z);a.group.rotation.y=e.angle;
   // Stalking rhythm differs per robot; sharp attack strike, head twitch,
   // staggered gait and ominous almost-still pauses. All visual offsets stay
   // under 6cm so actual hitboxes / world-anchored positioning remain fair.
   const t=e.age+a.phaseOffset;
   const moving=['advance','dash','flank','dodge'].includes(e.state);
   const attacking=e.state==='attack';
   const taunting=e.state==='taunt';
   const stunned=e.state==='stunned';
   const speed=e.state==='dash'?12:e.state==='flank'?8:6.5;
   const walk=moving?Math.sin(t*speed)*.39:Math.sin(t*1.8)*.04;
   const windup=attacking?Math.max(0,Math.sin(t*4.3))**5:0;
   const snap=attacking?Math.sin(t*11.5)*.22:0;
   const hitRecoil=e.lastHit>0?Math.sin((.31-e.lastHit)*31)*.13:0;
   a.legs[0].rotation.x=walk+(attacking?.13:0);
   a.legs[1].rotation.x=-walk-(attacking?.07:0);
   a.arms[0].rotation.x=-walk*.65-(attacking?.80+windup*.60:0);
   a.arms[1].rotation.x=walk*.65-(attacking?.62+windup*.38:0);
   a.arms[0].rotation.z=attacking?-.26:taunting?.65:0;
   a.arms[1].rotation.z=attacking?.26:taunting?-.65:0;
   a.body.position.y=moving?Math.abs(Math.sin(t*speed))*.026:attacking?-.035+windup*.025:0;
   a.body.rotation.z=hitRecoil+(moving?Math.sin(t*2.9)*.052:taunting?Math.sin(t*9)*.15:stunned?.10:0)+snap*.35;
   a.body.rotation.y=moving?Math.sin(t*2.0)*.12:attacking?Math.sin(t*3.1)*.17:taunting?Math.sin(t*8)*.20:0;
   a.body.rotation.x=attacking?-.15-windup*.12:stunned?.08:0;
   a.head.rotation.y=attacking?Math.sin(t*3.6)*.11:Math.sin(t*1.5)*.14;
   a.head.rotation.x=attacking?-.17:Math.sin(t*2.3)*.045;
   a.head.rotation.z=taunting?Math.sin(t*10)*.12:Math.sin(t*3.2)*.035;
   const blink=attacking?2.25+windup*1.4:stunned?.62:1.25+.36*Math.sin(t*5.9);
   a.visorMat.emissiveIntensity=blink;
   a.portal.visible=e.portal>0;a.portal.scale.setScalar(.35+(1-e.portal/.72)*.55);
   a.portal.material.opacity=e.portal/.72*.85;
   a.body.visible=e.portal<.62&&!a.external;
   if(a.external){try{a.external.update(e)}catch(err){console.warn('MANUL animation fallback',err);a.external.dispose();a.external=null;a.weakSpot.visible=true}}
   const health=Math.max(0,e.hp/e.maxHp);
   a.hpBar.scale.x=.35*health;a.hpBar.position.x=-.175*(1-health);
   a.hpBar.visible=e.hp<e.maxHp;a.hpBack.visible=a.hpBar.visible;
   a.weakSpot.material=e.lastHit>0?M.red:(e.type==='boss'?M.gold:M.cyan);
  }
  for(const [id,a] of actors)if(!active.has(id)){a.external?.dispose();root.remove(a.group);a.visorMat.dispose();actors.delete(id)}
 }
 function addSpark(pos,color,size=.045,ttl=.42){
  const mesh=new THREE.Mesh(geo.sphere,new THREE.MeshBasicMaterial({color,transparent:true,opacity:1,depthWrite:false}));
  mesh.position.set(pos.x,pos.y,pos.z);mesh.scale.setScalar(size);root.add(mesh);
  sparks.push({mesh,life:ttl,max:ttl,vx:(Math.random()-.5)*3,vy:.6+Math.random()*2,vz:(Math.random()-.5)*3});
 }
 // High-impact, world-anchored muzzle beam: calculated from the real XR reticle
 // ray, never a screen-space line or a fake hit. Short afterimage in WebGL.
 const tracerGeo=new THREE.CylinderGeometry(1,1,1,7);
 function drawShot(ray,distance=7,hit=false){
  if(!ray?.origin||!ray?.direction)return;
  const o=new THREE.Vector3(ray.origin.x,ray.origin.y,ray.origin.z);
  const d=new THREE.Vector3(ray.direction.x,ray.direction.y,ray.direction.z).normalize();
  const len=Math.max(.2,Math.min(distance,12)-.32);
  const end=o.clone().addScaledVector(d,.32+len);
  const mid=o.clone().addScaledVector(d,.32+len*.5);
  const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d);
  for(const halo of [false,true]){
   const mat=new THREE.MeshBasicMaterial({color:halo?0x4cffee:0xffedd0,transparent:true,opacity:halo?.28:.98,
    depthWrite:false,depthTest:!halo,blending:halo?THREE.AdditiveBlending:THREE.NormalBlending});
   const beam=new THREE.Mesh(tracerGeo,mat);
   beam.position.copy(mid);beam.quaternion.copy(q);
   const radius=halo?.045:.012;
   beam.scale.set(radius,len,radius);root.add(beam);
   tracers.push({mesh:beam,ttl:halo?.105:.075,max:halo?.105:.075});
  }
  if(hit){for(let i=0;i<12;i++)addSpark(end,i%3===0?0xffffff:0xffc858,.035+Math.random()*.025,.22+Math.random()*.32)}
  recoil=1;
 }
 function blastWave(x,z,radius=2.5){
  for(let i=0;i<2;i++){
   const mat=new THREE.MeshBasicMaterial({color:i?0xffc05a:0x7ffff1,transparent:true,opacity:i?.78:.94,
    depthWrite:false,depthTest:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
   const ring=new THREE.Mesh(new THREE.TorusGeometry(1,i?.026:.045,8,64),mat);
   ring.rotation.x=-Math.PI/2;ring.position.set(x,.13+i*.05,z);ring.scale.setScalar(.15);
   root.add(ring);waves.push({mesh:ring,maxRadius:radius,age:0,ttl:i?.63:.48,delay:i?.09:0});
  }
  const mat=new THREE.MeshBasicMaterial({color:0xffedaa,transparent:true,opacity:.38,depthWrite:false,depthTest:false,
   blending:THREE.AdditiveBlending});
  const dome=new THREE.Mesh(geo.sphere,mat);dome.position.set(x,.24,z);dome.scale.set(.18,.18,.18);root.add(dome);
  waves.push({mesh:dome,dome:true,age:0,ttl:.32,delay:0,maxRadius:radius*.85});
  for(let i=0;i<45;i++){
   const a=Math.PI*2*i/45,r=Math.random()*.65;
   addSpark({x:x+Math.sin(a)*r,y:.14+Math.random()*.6,z:z+Math.cos(a)*r},
    i%4===0?0xfff2ca:i%2?0xffb147:0x6afff2,.035+Math.random()*.075,.35+Math.random()*.48);
  }
 }
 function drawBombs(game){
  const bomb=game.bombs?.[0];
  if(!bomb){if(bombProjectile){root.remove(bombProjectile);bombProjectile=null}return}
  if(!bombProjectile){
   bombProjectile=new THREE.Group();
   const shell=new THREE.Mesh(new THREE.SphereGeometry(1,12,10),new THREE.MeshBasicMaterial({color:0xffd376}));
   shell.scale.setScalar(.16);bombProjectile.add(shell);
   const halo=new THREE.Mesh(new THREE.SphereGeometry(1,12,10),new THREE.MeshBasicMaterial({color:0x7bfff2,
    transparent:true,opacity:.34,depthWrite:false,blending:THREE.AdditiveBlending}));
   halo.scale.setScalar(.24);bombProjectile.add(halo);root.add(bombProjectile);
  }
  const progress=1-Math.min(1,Math.max(0,bomb.fuse/.48));
  bombProjectile.position.set(bomb.fromX+(bomb.x-bomb.fromX)*progress,
   .45+Math.sin(progress*Math.PI)*1.05,bomb.fromZ+(bomb.z-bomb.fromZ)*progress);
  bombProjectile.rotation.y+=.13;
 }
 function effect(game,lastFx){
  for(const f of game.fx||[]){const key=f.type+':'+f.id+':'+f.t;if(lastFx.has(key))continue;
   lastFx.add(key);
   if(f.type==='hit'||f.type==='destroy'){for(let i=0;i<(f.type==='destroy'?18:7);i++)addSpark({x:f.x,y:f.y,z:f.z},i%3?0xffd870:0x4cffee,.02+Math.random()*.04,.3+Math.random()*.45)}
   if(f.type==='pulse')for(let i=0;i<18;i++){const a=Math.PI*2*i/18;addSpark({x:game.player.x+Math.sin(a)*.6,y:.15,z:game.player.z+Math.cos(a)*.6},0x6fffd8,.06,.5)}
  }
  if(lastFx.size>120){const keep=[...lastFx].slice(-50);lastFx.clear();keep.forEach(x=>lastFx.add(x))}
 }
 function updateSparks(dt){
  recoil=Math.max(0,recoil-dt*6.5);
  for(let i=tracers.length-1;i>=0;i--){
   const tr=tracers[i];tr.ttl-=dt;
   tr.mesh.material.opacity=Math.max(0,tr.ttl/tr.max)*(tr.mesh.material.color.getHex()===0x4cffee?.28:.98);
   if(tr.ttl<=0){root.remove(tr.mesh);tr.mesh.material.dispose();tracers.splice(i,1)}
  }
  for(let i=waves.length-1;i>=0;i--){
   const w=waves[i];w.age+=dt;
   const p=Math.max(0,Math.min(1,(w.age-w.delay)/Math.max(.1,w.ttl-w.delay)));
   if(w.age>=w.delay){
    const size=.15+w.maxRadius*(1-Math.pow(1-p,2));
    w.mesh.scale.set(w.dome?size:size,w.dome?size*.55:size,w.dome?size:size);
    w.mesh.material.opacity=(w.dome?.36:.95)*(1-p);
   }
   if(w.age>=w.ttl){root.remove(w.mesh);w.mesh.material.dispose();w.mesh.geometry.dispose();waves.splice(i,1)}
  }

  for(let i=sparks.length-1;i>=0;i--){let s=sparks[i];s.life-=dt;
   s.mesh.position.x+=s.vx*dt;s.mesh.position.y+=s.vy*dt;s.mesh.position.z+=s.vz*dt;s.vy-=dt*3.9;
   s.mesh.material.opacity=Math.max(0,s.life/s.max);
   if(s.life<=0){root.remove(s.mesh);s.mesh.material.dispose();sparks.splice(i,1)}
  }
 }
 // 3D rifle follows camera only. Enemies and floor NEVER follow the camera.
 const rifle=new THREE.Group();scene.add(rifle);
 const gunM=material(0x202d3a,.8,.27),gunEdge=material(0x677c8f,.75,.24);
 part(rifle,gunM,[0,-.055,-.36],[.17,.16,.58]);
 part(rifle,gunEdge,[0,.022,-.42],[.18,.055,.29]);
 part(rifle,M.dark,[0,-.15,-.24],[.11,.25,.14]);
 part(rifle,gunM,[0,-.10,-.72],[.10,.10,.50]);
 part(rifle,gunEdge,[0,.02,-.85],[.075,.10,.19]);
 part(rifle,M.cyan,[0,.089,-.37],[.08,.045,.14]);
 const muzzle=new THREE.Mesh(geo.sphere,new THREE.MeshBasicMaterial({color:0xffedab,transparent:true,opacity:.95}));
 muzzle.position.set(0,-.02,-1.12);muzzle.scale.set(.13,.13,.30);rifle.add(muzzle);muzzle.visible=false;
 const camTemp=new THREE.Vector3(),quatTemp=new THREE.Quaternion(),offset=new THREE.Vector3(.23,-.28,-.40);
 function positionWeapon(viewCamera,flash){
  viewCamera.getWorldPosition(camTemp);viewCamera.getWorldQuaternion(quatTemp);
  rifle.position.copy(camTemp).add(offset.clone().add(new THREE.Vector3(0,0,recoil*.075)).applyQuaternion(quatTemp));
  rifle.quaternion.copy(quatTemp);rifle.rotateY(-.045);
  rifle.rotateX(-recoil*.15-(flash?.035:0));muzzle.visible=!!flash;
  muzzle.scale.set(.13+recoil*.07,.13+recoil*.07,.30+recoil*.18);
 }
 function clear(){
  if(bombProjectile){root.remove(bombProjectile);bombProjectile=null}
  for(const tr of tracers){root.remove(tr.mesh);tr.mesh.material.dispose()}tracers.length=0;
  for(const w of waves){root.remove(w.mesh);w.mesh.material.dispose();w.mesh.geometry.dispose()}waves.length=0;
  recoil=0;
  for(const a of actors.values()){a.external?.dispose();root.remove(a.group);a.visorMat.dispose()}actors.clear();
  for(const s of sparks){root.remove(s.mesh);s.mesh.material.dispose()}sparks.length=0;
 }
 function setRobotAdapter(adapter){
  if(adapter!==null&&typeof adapter?.create!=='function')throw Error('RODEADOS: adaptador visual inválido');
  for(const a of actors.values()){
   a.external?.dispose();
   root.remove(a.group);
   a.visorMat.dispose();
  }
  actors.clear();robotAdapter=adapter;
 }
 function getRobotAdapterStatus(){
  let external=0,fallback=0;
  for(const a of actors.values())if(a.external)external++;else fallback++;
  return {enabled:!!robotAdapter,name:robotAdapter?.name||'ORIGINAL',external,fallback,robots:actors.size};
 }
 return {root,arena,rifle,tiles,setFloor,setFloorDamage,setRobotAdapter,getRobotAdapterStatus,
  getFloorStatus:()=>({plates:warMat.length,visible:warMarks.filter(d=>d.visible).length,
   darkPlates:tiles.filter((t,i)=>t.material===warMat[i]).length,
   scars:warBurn.map(b=>b.material.opacity),cracks:warCracks.map(c=>c.material.opacity)}),
  drawEnemies,positionWeapon,drawShot,drawBombs,effect,updateSparks,clear,robotCount:()=>actors.size};
}
