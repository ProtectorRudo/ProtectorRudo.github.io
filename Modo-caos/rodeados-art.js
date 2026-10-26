import {createWolfSpider} from './rodeados-spider.js?v=16';
/* RODEADOS 360 — original stylized, articulated robot art.
   Techniques adapted from our Blackzone Three.js pipeline: real meter scale,
   MeshStandardMaterial, limb pivots, stable ground shadows and true 3-D objects. */
export function createRodeadosArt(THREE,scene,camera){
 const root=new THREE.Group();scene.add(root);
 const arena=new THREE.Group();root.add(arena);
 const actors=new Map(),sparks=[],tracers=[],waves=[];let recoil=0,bombProjectile=null,robotAdapter=null;
 // A 21k-triangle M.A.N.U.L. clone per enemy becomes expensive in WebXR.
 // Render four premium robots at once; all other enemies remain visible
 // as fast procedural robots, preserving real enemy count, shots and scoring.
 const MAX_EXTERNAL_ROBOTS=4;
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
 // Baked military armor plate: one procedural PBR atlas shared by all 25
 // world-locked cells. The AR camera remains visible through the floor.
 // Canvas art gives scratches, vents, warning paint, rivets and bevels without
 // requesting external textures or downloading textures at run time.
 function battlePlateTexture(){
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=384;
  const c=canvas.getContext('2d');if(!c)return null;
  let seed=0xCA05;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  c.fillStyle='#25323a';c.fillRect(0,0,384,384);
  const back=c.createLinearGradient(0,0,384,384);
  back.addColorStop(0,'#45535a');back.addColorStop(.3,'#2e3c43');
  back.addColorStop(.78,'#17232b');back.addColorStop(1,'#485254');
  c.fillStyle=back;c.fillRect(11,11,362,362);
  c.fillStyle='#101b23';c.fillRect(20,20,344,344);
  const steel=c.createLinearGradient(25,20,360,370);
  steel.addColorStop(0,'#45515a');steel.addColorStop(.2,'#34404a');
  steel.addColorStop(.55,'#242e36');steel.addColorStop(1,'#485258');
  c.fillStyle=steel;c.fillRect(25,25,334,334);
  // Three-tier physical bevel gives the tile some depth without geometry.
  c.strokeStyle='#77888d';c.lineWidth=3;c.strokeRect(25,25,334,334);
  c.strokeStyle='#0c141b';c.lineWidth=6;c.strokeRect(33,33,318,318);
  c.strokeStyle='#54636a';c.lineWidth=2;c.strokeRect(40,40,304,304);
  c.strokeStyle='rgba(166,186,190,.11)';c.lineWidth=1;
  for(let i=0;i<680;i++){
   const x=35+random()*315,y=35+random()*315,len=3+random()*44;
   c.beginPath();c.moveTo(x,y);c.lineTo(x+len,y-(random()-.5)*3);c.stroke();
  }
  for(let i=0;i<950;i++){
   const lum=random()>.56?'rgba(182,209,209,.10)':'rgba(5,12,18,.24)';
   c.fillStyle=lum;c.fillRect(40+random()*303,40+random()*303,1+random()*4,1+random()*2);
  }
  // Raised central anti-slip tread/maintenance hatch.
  c.fillStyle='rgba(11,19,26,.77)';c.fillRect(79,145,226,94);
  c.strokeStyle='#667b82';c.lineWidth=3;c.strokeRect(79,145,226,94);
  c.strokeStyle='rgba(171,203,204,.25)';c.lineWidth=2;
  for(let i=0;i<11;i++){
   const x=90+i*19;
   c.beginPath();c.moveTo(x,163);c.lineTo(x-8,187);c.lineTo(x+2,212);c.stroke();
  }
  // Orange danger chevrons look like stencilled industrial paint, not a toy.
  c.save();c.translate(192,192);c.rotate(-Math.PI/4);
  for(const y of [-190,190]){
   c.fillStyle='rgba(197,121,49,.86)';c.fillRect(-68,y-8,136,16);
   c.fillStyle='rgba(13,22,28,.85)';
   for(let k=-3;k<4;k++)c.fillRect(k*26,y-8,11,16);
  }
  c.restore();
  // Chunky dark bolt sockets with nickel highlights.
  for(const [x,y] of [[57,57],[327,57],[57,327],[327,327]]){
   c.fillStyle='#0c151c';c.beginPath();c.arc(x,y,10,0,Math.PI*2);c.fill();
   c.strokeStyle='#8c9b9b';c.lineWidth=2;c.beginPath();c.arc(x,y,7,0,Math.PI*2);c.stroke();
   c.strokeStyle='#1a2930';c.lineWidth=3;c.beginPath();c.moveTo(x-4,y+3);c.lineTo(x+4,y-3);c.stroke();
  }
  const map=new THREE.CanvasTexture(canvas);
  map.colorSpace=THREE.SRGBColorSpace;
  map.anisotropy=2;return map;
 }
 const warTexture=battlePlateTexture();
 const warMat=Array.from({length:25},(_,i)=>new THREE.MeshStandardMaterial({
  color:new THREE.Color(0xa3b4bd).multiplyScalar(.89+(i%7)*.018),
  map:warTexture,metalness:.67,roughness:.73,side:THREE.DoubleSide,
  transparent:true,opacity:.86,depthTest:false,depthWrite:false,
  emissive:0x0b151a,emissiveIntensity:.13
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
 // Physical-looking rubble and electrical rim are scenery only. Instancing
 // replaces 75 separate draw calls and never changes actual walkable surfaces.
 let battlefieldSide=2.6,battlefieldEditing=true,activeDebris=0,lastDebrisKey='';
 const fragmentCount=75;
 const fragments=new THREE.InstancedMesh(new THREE.TetrahedronGeometry(1,0),
  new THREE.MeshStandardMaterial({color:0x56616a,metalness:.45,roughness:.95,
   transparent:true,opacity:.92,depthTest:false,depthWrite:false}),fragmentCount);
 fragments.frustumCulled=false;
 arena.add(fragments);
 const fragmentDummy=new THREE.Object3D();
 const battlefieldCorners=new THREE.Group();arena.add(battlefieldCorners);
 const nodeMat=new THREE.MeshStandardMaterial({color:0x29363e,metalness:.73,roughness:.53,
  transparent:true,opacity:.82,depthWrite:false,depthTest:false});
 const beaconMat=new THREE.MeshBasicMaterial({color:0xd37945,transparent:true,opacity:.63,
  depthWrite:false,depthTest:false,toneMapped:false});
 for(const x of [-1,1])for(const z of [-1,1]){
  const g=new THREE.Group();battlefieldCorners.add(g);g.userData={x,z};
  const rim=new THREE.Mesh(geo.box,nodeMat);rim.scale.set(.13,.035,.13);rim.position.y=.044;g.add(rim);
  const signal=new THREE.Mesh(geo.box,beaconMat);signal.scale.set(.10,.010,.10);signal.position.y=.076;g.add(signal);
  const knee=new THREE.Mesh(geo.box,nodeMat);knee.scale.set(.075,.12,.075);knee.position.y=.11;g.add(knee);
  const eye=new THREE.Mesh(geo.box,beaconMat);eye.scale.set(.047,.018,.047);eye.position.y=.177;g.add(eye);
 }
 function updateBattlefieldRubble(game,editing=false){
  const key=battlefieldSide+':'+editing+':'+
   (game?.floorDamage||[]).map(v=>Math.round(v*8)/8).join(',');
  if(key===lastDebrisKey)return;
  lastDebrisKey=key;
  let visible=0;
  const side=(battlefieldSide||2.6)/5;
  for(let i=0;i<25;i++){
   const damage=editing?0:game?.floorDamage?.[i]||0;
   for(let j=0;j<3;j++){
    const n=i*3+j;
    const seed=i*11+j*17;
    const level=j===0?.31:j===1?.55:.78;
    if(damage>level){
     fragmentDummy.position.set(
      (i%5-2)*side+((seed*19)%23-11)/30*side,
      .08+j*.019,
      (Math.floor(i/5)-2)*side+((seed*7)%19-9)/27*side);
     fragmentDummy.rotation.set(.23+j*.2,seed*1.15,.25+j*.18);
     const scale=side*(.10+.09*damage);
     fragmentDummy.scale.set(scale,scale*(.65+j*.18),scale*.67);
     visible++;
    }else{
     fragmentDummy.position.set(0,-20,0);
     fragmentDummy.scale.setScalar(0);
    }
    fragmentDummy.updateMatrix();
    fragments.setMatrixAt(n,fragmentDummy.matrix);
   }
  }
  activeDebris=visible;
  fragments.instanceMatrix.needsUpdate=true;
  fragments.visible=visible>0&&!editing;
  battlefieldCorners.visible=!editing;
 }
 // Ambient ash is restrained: one GPU points draw call, not CPU-heavy sprites.
 const ashCount=26,ashGeometry=new THREE.BufferGeometry();
 const ashPositions=new Float32Array(ashCount*3),ashBase=new Float32Array(ashCount*3);
 for(let i=0;i<ashCount;i++){
  const theta=(i*.61803398875%1)*Math.PI*2;
  const radial=Math.sqrt(((i*71+17)%101)/101)*.42;
  ashBase[i*3]=Math.cos(theta)*radial;
  ashBase[i*3+1]=.12+((i*13)%17)/40;
  ashBase[i*3+2]=Math.sin(theta)*radial;
 }
 ashGeometry.setAttribute('position',new THREE.BufferAttribute(ashPositions,3));
 const ashCloud=new THREE.Points(ashGeometry,new THREE.PointsMaterial({
  size:.029,color:0xd2b9a2,transparent:true,opacity:.3,sizeAttenuation:true,
  depthTest:false,depthWrite:false}));
 ashCloud.frustumCulled=false;arena.add(ashCloud);
 let ashTime=0;
 function updateBattlefieldAtmosphere(dt){
  if(battlefieldEditing){ashCloud.visible=false;return}
  ashCloud.visible=true;ashTime+=dt;
  for(let i=0;i<ashCount;i++){
   const k=i*3,base=ashBase;
   ashPositions[k]=(base[k]+Math.sin(ashTime*.18+i*3)*.08)*battlefieldSide;
   ashPositions[k+1]=.09+((base[k+1]+ashTime*(.07+i%3*.025))%1.2);
   ashPositions[k+2]=(base[k+2]+Math.cos(ashTime*.15+i*2)*.06)*battlefieldSide;
  }
  ashGeometry.attributes.position.needsUpdate=true;
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
  battlefieldSide=side;battlefieldEditing=editing;
  // These four low metal marker posts are grounded on the four AR arena
  // corners. Never place a wall in front of the physical user's camera.
  for(const group of battlefieldCorners.children){
   group.position.set(group.userData.x*(half-.08),0,group.userData.z*(half-.08));
  }
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
  battlefieldCorners.visible=!editing;
  ashCloud.visible=!editing;
  compass.position.set(0,.015,-half+.35);compass.visible=editing;
  center.visible=editing||!!player;
  if(player)center.position.set(player.x,.025,player.z);
  else if(cell>=0)center.position.set((cell%5-2)*pitch,.025,(Math.floor(cell/5)-2)*pitch);
  else center.position.set(0,.025,0);
  marker.material.color.set(editing?0xeaffcb:0x63ffc2);
 }
 function setFloorDamage(game,editing=false){
  battlefieldEditing=editing;
  battlefieldCorners.visible=!editing;
  ashCloud.visible=!editing;
  for(let i=0;i<25;i++){
   const damage=game?.floorDamage?.[i]||0;
   const time=game?.floorHeat?.[i]??-100;
   const hot=Math.max(0,1-Math.max(0,(game?.elapsed??0)-time)/1.9);
   const step=Math.round(damage*25)/25,heat=Math.round(hot*6)/6;
   if(warScars[i]!==step+heat*10){
    warScars[i]=step+heat*10;
    warMat[i].color.setRGB(.84+(i%7)*.014,.91,.94)
      .lerp(new THREE.Color(0x8b6255),Math.min(1,step*.70));
    warMat[i].opacity=.84+step*.08;
    warMat[i].emissive.set(step>.3?0x622418:0x101e24);
    warMat[i].emissiveIntensity=.12+step*.16+heat*.35;
    warBurn[i].material.opacity=Math.min(.7,damage*.58+heat*.12);
    warCracks[i].material.opacity=damage<.16?0:Math.min(.92,(damage-.16)*1.30+heat*.17);
    const border=warMarks[i].children[0].material;
    border.color.set(0x94b4a4).lerp(new THREE.Color(0xff7437),Math.min(1,step*1.3+heat*.38));
    border.opacity=.55+Math.min(.3,step*.2+heat*.22);
   }
   warMarks[i].visible=!editing;
  }
  // Armor debris remains local to original damaged tiles, even after
  // camera moves or AR anchor recalibration. Zero extra physics/collision.
  updateBattlefieldRubble(game,editing);
 }
 function createRobot(e){
  if(e.type==='spider')return createWolfSpider(THREE,root,e);
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
  if(robotAdapter&&[...actors.values()].filter(a=>a.external).length<MAX_EXTERNAL_ROBOTS){
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
   if(a.kind==='spider'){
    a.update(e);
    continue;
   }
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
  for(const [id,a] of actors)if(!active.has(id)){
    if(a.kind==='spider')a.dispose();else{a.external?.dispose();root.remove(a.group);a.visorMat.dispose()}actors.delete(id)
   }
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
   if(f.type==='bombBlast')blastWave(f.x,f.z,f.radius||2.5);
   if(f.type==='damage'&&Number.isFinite(f.x)&&Number.isFinite(f.z)){
    // Low shockwave follows the collision tile, not the phone or camera.
    const mat=new THREE.MeshBasicMaterial({color:0xff6c34,transparent:true,opacity:.82,
     depthTest:false,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.035,6,30),mat);
    ring.position.set(f.x,.095,f.z);ring.rotation.x=-Math.PI/2;ring.scale.setScalar(.12);
    root.add(ring);waves.push({mesh:ring,maxRadius:.78,age:0,ttl:.4,delay:0});
    for(let i=0;i<11;i++)addSpark({x:f.x,y:.12,z:f.z},
     i%3?0xf7a354:0xb4c3ba,.018+Math.random()*.025,.2+Math.random()*.3);
   }
   if(f.type==='pulse')for(let i=0;i<18;i++){const a=Math.PI*2*i/18;addSpark({x:game.player.x+Math.sin(a)*.6,y:.15,z:game.player.z+Math.cos(a)*.6},0x6fffd8,.06,.5)}
  }
  if(lastFx.size>120){const keep=[...lastFx].slice(-50);lastFx.clear();keep.forEach(x=>lastFx.add(x))}
 }
 function updateSparks(dt){
  updateBattlefieldAtmosphere(dt);
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
  for(const a of actors.values()){if(a.kind==='spider')a.dispose();else{a.external?.dispose();root.remove(a.group);a.visorMat.dispose()}}actors.clear();
  for(const s of sparks){root.remove(s.mesh);s.mesh.material.dispose()}sparks.length=0;
 }
 function setRobotAdapter(adapter){
  if(adapter!==null&&typeof adapter?.create!=='function')throw Error('RODEADOS: adaptador visual inválido');
  for(const a of actors.values()){
   if(a.kind==='spider')a.dispose();else{a.external?.dispose();root.remove(a.group);a.visorMat.dispose()}
  }
  actors.clear();robotAdapter=adapter;
 }
 function getRobotAdapterStatus(){
  let external=0,fallback=0,spiders=0;const variants={standard:0,heavy:0};
  for(const a of actors.values()){
   if(a.kind==='spider'){spiders++;continue}
   if(a.external){external++;const v=a.external.variant||'standard';variants[v]=(variants[v]||0)+1}
   else fallback++;
  }
  return {enabled:!!robotAdapter,name:robotAdapter?.name||'ORIGINAL',external,fallback,spiders,variants,
   robots:actors.size,maxExternal:MAX_EXTERNAL_ROBOTS};
 }
 return {root,arena,rifle,tiles,setFloor,setFloorDamage,setRobotAdapter,getRobotAdapterStatus,
  getFloorStatus:()=>({plates:warMat.length,visible:warMarks.filter(d=>d.visible).length,
   darkPlates:tiles.filter((t,i)=>t.material===warMat[i]).length,
   scars:warBurn.map(b=>b.material.opacity),cracks:warCracks.map(c=>c.material.opacity),
   textured:warMat.every(m=>m.map===warTexture&&m.isMeshStandardMaterial),
   fragmentCount:activeDebris,ashCount:ashCloud.visible?ashCount:0,
   perimeterPosts:battlefieldCorners.visible?battlefieldCorners.children.length:0}),
  drawEnemies,positionWeapon,drawShot,drawBombs,effect,updateSparks,clear,robotCount:()=>actors.size};
}
