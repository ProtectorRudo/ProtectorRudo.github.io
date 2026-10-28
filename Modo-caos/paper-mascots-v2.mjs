/* Territory Loop / CVDOM: eight original, locally generated 3D animal champions.
 * Meshes and animations are constructed in Three.js. No unavailable URL assets,
 * no copied third-party IP, and no repeated bone quaternion multiplication.
 */
export const MASCOT_DATA=[
 {species:'capybara',name:'CAPY',fur:'#b78c60',dark:'#79533b',light:'#e3bf91',hoodie:'#72aa59',ear:'round'},
 {species:'redpanda',name:'RUBY',fur:'#cf642d',dark:'#763e2d',light:'#ffe0b5',hoodie:'#222731',ear:'point'},
 {species:'axolotl',name:'AXI',fur:'#ffa6c8',dark:'#d86c9e',light:'#ffcee4',hoodie:'#bfa4f3',ear:'gill'},
 {species:'penguin',name:'PINGO',fur:'#1e344f',dark:'#101e30',light:'#f8fcfd',hoodie:'#2f88e8',ear:'none'},
 {species:'raccoon',name:'ROCKY',fur:'#7b8190',dark:'#3a4253',light:'#f6f4ef',hoodie:'#874cae',ear:'round'},
 {species:'frog',name:'BRINCO',fur:'#78cf43',dark:'#43982c',light:'#c1f59f',hoodie:'#f0bc31',ear:'frog'},
 {species:'fox',name:'FENIX',fur:'#ed8639',dark:'#965333',light:'#fff0d2',hoodie:'#e65a36',ear:'point'},
 {species:'bear',name:'OSO',fur:'#aa7d52',dark:'#6c472d',light:'#e3c7a0',hoodie:'#ebad2f',ear:'round'}
];
const geometryCache=new WeakMap();
const materialCache=new WeakMap();
function getGeom(THREE,type){
 let c=geometryCache.get(THREE);if(!c){c={sphere:new THREE.SphereGeometry(1,16,12),cone:new THREE.ConeGeometry(1,1,5)};geometryCache.set(THREE,c);}
 return c[type];
}
function getMaterial(THREE,hex,rough=.62,metal=0){
 let m=materialCache.get(THREE);if(!m){m=new Map();materialCache.set(THREE,m);}
 const key=hex+'-'+rough+'-'+metal;
 if(!m.has(key))m.set(key,new THREE.MeshStandardMaterial({color:hex,roughness:rough,metalness:metal}));
 return m.get(key);
}
export function buildMascot(THREE,index){
 const d=MASCOT_DATA[index%MASCOT_DATA.length];
 const root=new THREE.Group();root.name='CVDOM_'+d.name;
 const rig={left:null,right:null,feet:[],eyes:[],head:null,body:null,tail:null};
 const mat=(hex,rough=.62,metal=0)=>getMaterial(THREE,hex,rough,metal);
 const m={
  fur:mat(d.fur),dark:mat(d.dark),light:mat(d.light),coat:mat(d.hoodie,.47),
  trim:mat('#faf9ef'),ink:mat('#1a2031',.19),eye:mat('#ffffff',.18),nose:mat('#493132'),
  sole:mat('#262e42'),shine:mat('#ffffff',.12),gold:mat('#f7d46c',.29,.22),
  mouth:mat('#7b353b')
 };
 function ellipse(parent,material,x,y,z,sx,sy,sz){
  const obj=new THREE.Mesh(getGeom(THREE,'sphere'),material);
  obj.position.set(x,y,z);obj.scale.set(sx,sy,sz);parent.add(obj);return obj;
 }
 function shape(parent,material,r1,r2,h,x,y,z){
  const obj=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,16),material);
  obj.position.set(x,y,z);parent.add(obj);return obj;
 }
 function cone(parent,material,x,y,z,sx,sy,sz){
  const obj=new THREE.Mesh(getGeom(THREE,'cone'),material);
  obj.position.set(x,y,z);obj.scale.set(sx,sy,sz);parent.add(obj);return obj;
 }
 // Distinctive tail, placed behind the hoodie and head.
 const tail=new THREE.Group();root.add(tail);tail.position.set(.56,1.4,-.85);rig.tail=tail;
 if(['redpanda','raccoon','fox'].includes(d.species)){
   const base=ellipse(tail,m.fur,0,-.05,-.08,.65,.32,.4);base.rotation.z=-.44;
   const tip=ellipse(tail,d.species==='fox'?m.light:m.dark,.45,.18,-.06,.4,.32,.36);
   tip.rotation.z=-.55;
   if(d.species==='redpanda'||d.species==='raccoon'){
    for(let i=0;i<3;i++)ellipse(tail,i%2?m.light:m.dark,-.19+i*.23,.15+i*.035,.25,.12,.29,.25);
   }
 }else if(d.species==='bear'||d.species==='capybara')ellipse(tail,m.dark,.15,-.15,0,.28,.26,.28);
 else if(d.species==='axolotl'){ellipse(tail,m.fur,.2,-.1,0,.47,.2,.33);}
 // Shoes and walk pivots.
 for(const side of [-1,1]){
  const leg=new THREE.Group();leg.position.set(side*.39,1.1,0);root.add(leg);
  ellipse(leg,m.dark,0,-.4,0,.28,.65,.32);
  ellipse(leg,m.sole,0,-.91,.2,.38,.24,.56);
  ellipse(leg,m.trim,0,-.8,.45,.3,.06,.35);
  rig.feet.push({node:leg,side});
 }
 // Padded clothing, hood, front pouch and zipper / badge.
 const body=new THREE.Group();body.position.set(0,2.05,0);root.add(body);rig.body=body;
 ellipse(body,m.coat,0,0,0,1.02,1.30,.76);
 ellipse(body,m.dark,0,.98,-.10,.68,.31,.58);
 ellipse(body,m.trim,0,-.24,.71,.62,.26,.09);
 ellipse(body,m.light,0,-.22,.79,.53,.19,.055);
 shape(body,m.gold,.05,.05,.55,0,.05,.82);
 ellipse(body,m.gold,.36,.65,.69,.22,.19,.09); // emblem
 // Arms are rigid independent shoulder groups, not bone quaternions. Six-Seven
 // is computed from time every frame => zero accumulation and zero violent flips.
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*.87,2.93,.03);root.add(arm);
  ellipse(arm,m.coat,side*.28,-.42,0,.32,.68,.35);
  // Separate wrist and bright palm: the Six-Seven gesture needs to read
  // as two hands comparing weights, not two arms flailing in a circle.
  const palm=new THREE.Group();palm.position.set(side*.34,-1.05,.10);arm.add(palm);
  ellipse(palm,m.fur,0,0,0,.33,.29,.27);
  ellipse(palm,m.light,0,-.04,.23,.26,.18,.055);
  rig[side<0?'left':'right']=arm;
  rig[side<0?'leftPalm':'rightPalm']=palm;
 }
 // Giant head, roughly 55% of total character height.
 const head=new THREE.Group();head.position.set(0,4.85,.22);root.add(head);rig.head=head;
 ellipse(head,m.fur,0,0,0,1.47,1.35,1.22);
 // Species-specific face outline and ears.
 if(d.ear==='round'){
  for(const side of [-1,1]){
   ellipse(head,m.dark,side*1.13,1.06,-.10,.39,.43,.29);
   ellipse(head,m.light,side*1.13,1.05,.09,.20,.24,.06);
  }
 }
 if(d.ear==='point'){
  for(const side of [-1,1]){
   const ear=cone(head,m.fur,side*1.0,1.30,-.1,.54,.96,.44);
   ear.rotation.z=-side*.2;
   cone(head,m.light,side*1.0,1.32,.2,.27,.57,.1);
  }
 }
 if(d.ear==='gill'){
  for(const side of [-1,1])for(let k=0;k<3;k++){
   const g=ellipse(head,m.dark,side*(1.40+k*.12),.58+(k-1)*.40,.12,.62,.16,.22);
   g.rotation.z=side*(k-1)*.47;
   ellipse(head,m.light,side*(1.8+k*.07),.58+(k-1)*.40,.24,.13,.15,.16);
  }
 }
 if(d.ear==='frog'){
  for(const side of [-1,1]){
   ellipse(head,m.fur,side*.91,1.08,.25,.50,.50,.45);
  }
 }
 if(d.species==='penguin'){
  ellipse(head,m.light,0,-.29,.93,1.15,.89,.34);
  ellipse(body,m.light,0,-.05,.72,.78,1,.16);
 }
 if(d.species==='redpanda'||d.species==='raccoon'){
  ellipse(head,m.light,-.83,-.15,.88,.52,.59,.36);
  ellipse(head,m.light,.83,-.15,.88,.52,.59,.36);
  if(d.species==='raccoon'){
   ellipse(head,m.dark,-.67,.15,1.04,.52,.44,.15);
   ellipse(head,m.dark,.67,.15,1.04,.52,.44,.15);
  }
 }
 if(d.species==='fox'){
  ellipse(head,m.light,-.55,-.62,.77,.69,.60,.42);
  ellipse(head,m.light,.55,-.62,.77,.69,.60,.42);
 }
 // Facial expression: eyes are deliberately large and glossy.
 for(const side of [-1,1]){
  const xx=side*.59,yy=d.species==='frog'?.48:.20,zz=d.species==='frog'?1.30:1.08;
  ellipse(head,m.eye,xx,yy,zz,.36,.46,.22);
  const pupil=ellipse(head,m.ink,xx+side*.035,yy-.025,zz+.205,.225,.29,.13);
  ellipse(head,m.shine,xx-.095,yy+.11,zz+.32,.085,.11,.06);
  rig.eyes.push({node:pupil,side});
 }
 // Muzzle gives each family a unique contour and keeps animal proportions.
 if(d.species==='penguin'){
  const beak=cone(head,mat('#ffb846'),0,-.43,1.26,.44,.34,.67);
  beak.rotation.x=Math.PI/2;
 }else if(d.species==='frog'){
  const smile=ellipse(head,m.mouth,0,-.54,1.07,.63,.15,.13);
  ellipse(head,m.light,0,-.48,1.20,.56,.09,.08);
 }else if(d.species==='axolotl'){
  ellipse(head,m.light,0,-.54,1.06,.62,.31,.18);
  ellipse(head,m.mouth,0,-.62,1.23,.39,.09,.045);
 }else{
  ellipse(head,m.light,0,-.52,1.06,.72,.48,.43);
  ellipse(head,m.nose,0,-.35,1.44,.26,.17,.14);
  ellipse(head,m.mouth,0,-.72,1.28,.25,.09,.055);
 }
 if(d.species==='capybara'){
  ellipse(head,m.light,-.85,-.49,.97,.21,.12,.07);
  ellipse(head,m.light,.85,-.49,.97,.21,.12,.07);
 }
 if(d.species==='bear'){
  ellipse(head,m.light,0,-.35,1.16,.76,.55,.33);
 }
 // Iconic headwear distinguishes the lineup in small mobile thumbnails.
 if(d.species==='capybara'){ellipse(head,mat('#ed9b39'),0,1.28,.22,.38,.34,.35);ellipse(head,mat('#50ad65'),.29,1.49,.32,.30,.08,.15);}
 if(d.species==='penguin'){
  ellipse(head,m.coat,0,1.1,-.09,1.45,.18,.82);
  ellipse(head,m.trim,0,1.07,.72,1.3,.10,.12);
 }
 if(d.species==='raccoon')ellipse(head,m.coat,0,1.24,-.22,1.17,.19,.67);
 return{root,rig,data:d,modelHeight:6.9};
}
export function animateMascot(actor,seconds,mode='idle',opponent=false){
 const rig=actor.mascotRig;if(!rig)return;
 // Absolute, time-derived poses. Nothing is multiplied onto last frame.
 const t=Math.max(0,Number.isFinite(seconds)?seconds:0);
 const speed=mode==='dance'?2*Math.PI*.76:mode==='run'?8.4:1.9;
 const phase=t*speed+(opponent?.30:0);
 if(mode==='dance'){
  // Six-Seven: alternating, open palms moving gently in opposite directions.
  // Shoulders stay above the waist and within safe anatomical rotation limits.
  const wave=Math.sin(phase);
  const raiseLeft=-wave,raiseRight=wave;
  const leadIn=Math.min(1,t/.32);
  const blend=leadIn*leadIn*(3-2*leadIn);
  rig.left.rotation.z=-.16+blend*(-1.11+.27*raiseLeft);
  rig.right.rotation.z=.16+blend*(1.11+.27*raiseRight);
  rig.left.rotation.x=blend*.10;
  rig.right.rotation.x=-blend*.10;
  if(rig.leftPalm){rig.leftPalm.rotation.z=blend*(-.18+.13*raiseLeft);rig.leftPalm.rotation.x=blend*.2;}
  if(rig.rightPalm){rig.rightPalm.rotation.z=blend*(.18+.13*raiseRight);rig.rightPalm.rotation.x=blend*-.2;}
  rig.head.rotation.z=Math.sin(phase*.5)*.028;
  rig.body.rotation.z=Math.sin(phase)*.038;
  rig.feet[0].node.rotation.x=Math.sin(phase*.5)*.055;
  rig.feet[1].node.rotation.x=Math.sin(phase*.5+Math.PI)*.055;
 }else if(mode==='run'){
  rig.left.rotation.z=-.12+Math.sin(phase)*.22;
  rig.right.rotation.z=.12+Math.sin(phase+Math.PI)*.22;
  rig.left.rotation.x=rig.right.rotation.x=0;
  rig.head.rotation.z=0;rig.body.rotation.z=0;
  for(const leg of rig.feet)leg.node.rotation.x=Math.sin(phase+(leg.side===1?Math.PI:0))*.43;
  if(rig.leftPalm){rig.leftPalm.rotation.z=0;rig.leftPalm.rotation.x=0;}
  if(rig.rightPalm){rig.rightPalm.rotation.z=0;rig.rightPalm.rotation.x=0;}
 }else{
  rig.left.rotation.z=-.10+Math.sin(phase)*.045;
  rig.right.rotation.z=.10-Math.sin(phase)*.045;
  rig.left.rotation.x=rig.right.rotation.x=0;
  rig.body.rotation.z=rig.head.rotation.z=0;
  rig.feet.forEach(l=>l.node.rotation.x=0);
  if(rig.leftPalm){rig.leftPalm.rotation.z=0;rig.leftPalm.rotation.x=0;}
  if(rig.rightPalm){rig.rightPalm.rotation.z=0;rig.rightPalm.rotation.x=0;}
 }
}
