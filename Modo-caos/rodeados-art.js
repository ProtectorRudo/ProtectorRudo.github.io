/* RODEADOS 360 — original stylized, articulated robot art.
   Techniques adapted from our Blackzone Three.js pipeline: real meter scale,
   MeshStandardMaterial, limb pivots, stable ground shadows and true 3-D objects. */
export function createRodeadosArt(THREE,scene,camera){
 const root=new THREE.Group();scene.add(root);
 const arena=new THREE.Group();root.add(arena);
 const actors=new Map(),sparks=[];
 const geo={box:new THREE.BoxGeometry(1,1,1),sphere:new THREE.SphereGeometry(1,16,12),
  cyl:new THREE.CylinderGeometry(1,1,1,12),disc:new THREE.CircleGeometry(1,34),
  ring:new THREE.TorusGeometry(1,.026,7,40),cone:new THREE.ConeGeometry(1,1,9)};
 const material=(col,metal=.4,rough=.36,emit=0)=>new THREE.MeshStandardMaterial({color:col,metalness:metal,roughness:rough,
   emissive:emit?col:0x000000,emissiveIntensity:emit});
 const M={
  steel:material(0x43849c,.46,.31,.25),dark:material(0x07101d,.54,.55),edge:material(0x7993ad,.6,.30,.16),
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
   tile.material=i===cell?pickMat:(editing?tileMat[(i%5+Math.floor(i/5))%2]:lowMat);
  }
  for(let i=0;i<4;i++){const e=edges[i];const xx=i===0?-half:i===1?half:0,zz=i===2?-half:i===3?half:0;
   e.position.set(xx,.045,zz);e.scale.set(i<2?.034:side,.027,i<2?side:.034);
   e.material=borderMat;
  }
  compass.position.set(0,.015,-half+.35);compass.visible=editing;
  center.visible=editing||!!player;
  if(player)center.position.set(player.x,.025,player.z);
  else if(cell>=0)center.position.set((cell%5-2)*pitch,.025,(Math.floor(cell/5)-2)*pitch);
  else center.position.set(0,.025,0);
  marker.material.color.set(editing?0xeaffcb:0x63ffc2);
 }
 function createRobot(e){
  const kind=e.type,elite=kind==='boss'||kind==='tank',scale=e.height/1.75;
  const shell=kind==='boss'?M.red:kind==='tank'?M.edge:kind==='fast'?M.violet:kind==='flanker'?M.gold:kind==='joker'?M.orange:M.steel;
  const group=new THREE.Group();root.add(group);
  group.scale.setScalar(scale);
  const body=new THREE.Group();group.add(body);
  sphere(body,M.dark,[0,1.12,0],[.24,.34,.16]);
  part(body,shell,[0,1.13,.08],[.44,.40,.25]);
  part(body,M.steel,[0,1.20,.22],[.32,.23,.07]);
  sphere(body,M.light,[0,1.53,0],[.163,.185,.16]);
  part(body,M.dark,[0,1.56,.14],[.29,.12,.13]);
  part(body,kind==='joker'?M.orange:M.cyan,[0,1.57,.213],[.245,.056,.025]);
  for(const s of [-1,1]){
   part(body,M.dark,[s*.11,1.32,.247],[.08,.06,.033]);
   part(body,shell,[s*.23,1.34,0],[.19,.22,.23]);
   sphere(body,M.dark,[s*.24,1.34,.10],[.068,.09,.07]);
   part(body,shell,[s*.12,.84,.07],[.19,.16,.18]);
  }
  sphere(body,M.cyan,[0,1.22,.273],[.057,.055,.017]);
  const arms=[],legs=[];
  for(const s of [-1,1]){
   const arm=new THREE.Group();arm.position.set(s*.27,1.33,0);body.add(arm);arms.push(arm);
   part(arm,shell,[s*.025,-.15,0],[.14,.27,.16]);
   sphere(arm,M.dark,[0,-.28,.02],[.078,.08,.075]);
   part(arm,M.edge,[s*.04,-.39,.065],[.11,.26,.13]);
   part(arm,M.steel,[s*.03,-.53,.065],[.13,.11,.13]);
   const leg=new THREE.Group();leg.position.set(s*.115,.84,0);body.add(leg);legs.push(leg);
   part(leg,shell,[0,-.20,0],[.17,.39,.19]);
   sphere(leg,M.dark,[0,-.43,.02],[.085,.08,.086]);
   part(leg,M.edge,[0,-.56,.04],[.14,.29,.16]);
   part(leg,M.dark,[0,-.75,.095],[.19,.14,.31]);
  }
  for(const s of [-1,1]){part(body,M.dark,[s*.16,1.68,.01],[.115,.075,.22]);sphere(body,shell,[s*.20,1.68,.06],[.07,.07,.11])}
  // Back-pack silhouette & illuminated circuitry
  part(body,M.dark,[0,1.13,-.19],[.32,.31,.18]);
  for(const s of [-1,1])part(body,M.cyan,[s*.085,1.15,-.294],[.033,.19,.018]);
  if(elite){for(const s of [-1,1]){part(body,shell,[s*.32,1.30,-.04],[.17,.25,.25]);part(body,M.gold,[s*.31,1.43,.12],[.12,.05,.1])}}
  if(kind==='joker'){const crest=part(body,M.gold,[0,1.79,0],[.05,.18,.14]);crest.rotation.z=.14}
  const shadow=new THREE.Mesh(geo.disc,overlay(0x061c24,.37));shadow.rotation.x=-Math.PI/2;shadow.scale.set(.43,.35,.36);shadow.position.set(0,.018,0);group.add(shadow);
  const portal=new THREE.Mesh(geo.ring,overlay(0x50e9ff,.85));portal.rotation.x=-Math.PI/2;portal.position.y=.10;portal.scale.setScalar(.4);group.add(portal);
  const hpBack=part(group,M.dark,[0,1.90,0],[.38,.032,.05]);
  const hpBar=part(group,M.green,[0,1.90,.031],[.35,.024,.035]);
  const weakSpot=new THREE.Mesh(geo.sphere,kind==='boss'?M.gold:M.cyan);
  weakSpot.position.set(0,1.55,.21);weakSpot.scale.set(.065,.06,.025);group.add(weakSpot);
  return {group,body,arms,legs,portal,shadow,hpBack,hpBar,weakSpot,shell};
 }
 function drawEnemies(game){
  const active=new Set();
  for(const e of game.enemies){
   active.add(e.id);
   let a=actors.get(e.id);if(!a){a=createRobot(e);actors.set(e.id,a)}
   a.group.position.set(e.x,0,e.z);a.group.rotation.y=e.angle;
   const speed=e.state==='dash'?12:e.state==='flank'?8:e.state==='advance'?6:3;
   const walk=e.state==='advance'||e.state==='dash'||e.state==='flank'||e.state==='dodge';
   const swing=walk?Math.sin(e.age*speed)*.48:Math.sin(e.age*3)*.08;
   a.legs[0].rotation.x=swing;a.legs[1].rotation.x=-swing;
   a.arms[0].rotation.x=-swing*.66;a.arms[1].rotation.x=swing*.66;
   a.body.position.y=walk?Math.abs(Math.sin(e.age*speed))*.018:Math.sin(e.age*2)*.012;
   a.body.rotation.z=e.state==='taunt'?Math.sin(e.age*14)*.18:e.state==='stunned'?.19:0;
   a.body.rotation.y=e.state==='taunt'?Math.sin(e.age*8)*.3:0;
   if(e.type==='joker'&&e.state==='taunt'){a.arms[0].rotation.z=.9;a.arms[1].rotation.z=-.9}
   a.portal.visible=e.portal>0;a.portal.scale.setScalar(.35+(1-e.portal/.72)*.55);
   a.portal.material.opacity=e.portal/.72*.85;
   a.body.visible=e.portal<.62;
   const health=Math.max(0,e.hp/e.maxHp);
   a.hpBar.scale.x=.35*health;a.hpBar.position.x=-.175*(1-health);
   a.hpBar.visible=e.hp<e.maxHp;a.hpBack.visible=a.hpBar.visible;
   a.weakSpot.material=e.lastHit>0?M.red:(e.type==='boss'?M.gold:M.cyan);
  }
  for(const [id,a] of actors)if(!active.has(id)){root.remove(a.group);actors.delete(id)}
 }
 function addSpark(pos,color,size=.045,ttl=.42){
  const mesh=new THREE.Mesh(geo.sphere,new THREE.MeshBasicMaterial({color,transparent:true,opacity:1,depthWrite:false}));
  mesh.position.set(pos.x,pos.y,pos.z);mesh.scale.setScalar(size);root.add(mesh);
  sparks.push({mesh,life:ttl,max:ttl,vx:(Math.random()-.5)*3,vy:.6+Math.random()*2,vz:(Math.random()-.5)*3});
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
  rifle.position.copy(camTemp).add(offset.clone().applyQuaternion(quatTemp));
  rifle.quaternion.copy(quatTemp);rifle.rotateY(-.045);
  rifle.rotation.x+=flash?-.06:0;muzzle.visible=!!flash;
 }
 function clear(){
  for(const a of actors.values())root.remove(a.group);actors.clear();
  for(const s of sparks){root.remove(s.mesh);s.mesh.material.dispose()}sparks.length=0;
 }
 return {root,arena,rifle,tiles,setFloor,drawEnemies,positionWeapon,effect,updateSparks,clear,robotCount:()=>actors.size};
}
