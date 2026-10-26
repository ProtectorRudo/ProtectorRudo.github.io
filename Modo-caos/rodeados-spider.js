/* RODEADOS 360 — WOLF SPIDER / Araña Lobo
 * Original procedural PBR art, no downloaded asset or dependency.
 * Eight segmented legs, frontal eye clusters and stalk/strike animations.
 * Purely visual; game core stays authoritative for all physics and hits.
 */
export function createWolfSpider(THREE,world,e){
 const M={
  shell:new THREE.MeshStandardMaterial({color:0x28231e,roughness:.92,metalness:.06,flatShading:false}),
  dark:new THREE.MeshStandardMaterial({color:0x111312,roughness:.95,metalness:.03}),
  fur:new THREE.MeshStandardMaterial({color:0x49372a,roughness:.99,metalness:0}),
  stripe:new THREE.MeshStandardMaterial({color:0x806247,roughness:.89,metalness:.05}),
  eyes:new THREE.MeshStandardMaterial({color:0xff8e3b,emissive:0xbb2705,emissiveIntensity:1.65,roughness:.3}),
  claw:new THREE.MeshStandardMaterial({color:0x0a0808,roughness:.55,metalness:.19})
 };
 const sphereG=new THREE.SphereGeometry(1,12,9),
  legGeo=new THREE.CylinderGeometry(1,1,1,6),
  spikeGeo=new THREE.ConeGeometry(1,1,4);
 const g=new THREE.Group();world.add(g);
 const trunk=new THREE.Group();g.add(trunk);
 function blob(parent,mat,xyz,size){
  const m=new THREE.Mesh(sphereG,mat);m.position.set(...xyz);m.scale.set(...size);parent.add(m);return m;
 }
 function tube(parent,mat,start,end,r1,r2){
  const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end),d=b.clone().sub(a);
  const m=new THREE.Mesh(legGeo,mat);m.position.copy(a).add(b).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());
  m.scale.set(r1,d.length(),r2||r1);parent.add(m);return m;
 }
 // Silhouette: ground crawling wolf spider with prominent hairy abdomen and
 // two stout forward pedipalps, not a cartoon ball or a floating robot.
 blob(trunk,M.dark,[0,.43,-.29],[.39,.32,.44]);
 blob(trunk,M.shell,[0,.47,-.31],[.36,.27,.40]);
 blob(trunk,M.fur,[0,.65,-.33],[.23,.06,.32]);
 blob(trunk,M.shell,[0,.46,.22],[.29,.22,.29]);
 blob(trunk,M.stripe,[0,.64,.22],[.18,.06,.19]);
 blob(trunk,M.dark,[0,.42,.42],[.25,.17,.15]);
 for(const side of [-1,1]){
  blob(trunk,M.claw,[side*.19,.37,.56],[.09,.12,.18]);
  blob(trunk,M.stripe,[side*.18,.41,.65],[.038,.06,.10]);
 }
 // Wolf spiders have two prominent anterior eyes and smaller peripheral eyes.
 for(const [x,y,z,r] of [
  [-.105,.555,.479,.054],[.105,.555,.479,.054],
  [-.20,.494,.44,.033],[.20,.494,.44,.033],
  [-.18,.60,.39,.026],[.18,.60,.39,.026],
  [-.052,.64,.42,.024],[.052,.64,.42,.024]
 ])blob(trunk,M.eyes,[x,y,z],[r,r*.82,r*.60]);
 // Fine paired chevrons on abdomen.
 for(let j=0;j<5;j++)for(const side of [-1,1]){
  const mark=blob(trunk,M.stripe,[side*(.06+j*.019),.69-j*.008,-.56+j*.11],
    [.018+j*.003,.012,.055]);
  mark.rotation.y=side*.37;
 }
 const legs=[];
 for(const side of [-1,1])for(let i=0;i<4;i++){
  const baseZ=.34-i*.23;
  const hip=new THREE.Group();hip.position.set(side*.24,.48,baseZ);trunk.add(hip);
  const spread=side*(.53+.05*(1-Math.abs(i-1.5)));
  const forward=.28-i*.16;
  const a=[0,0,0],knee=[spread,.17,forward],foot=[side*(.79+i*.021),-.46,forward*1.8];
  blob(hip,M.shell,a,[.10,.10,.10]);
  tube(hip,M.shell,a,knee,.075,.075);
  blob(hip,M.dark,knee,[.085,.085,.085]);
  tube(hip,M.fur,knee,foot,.047,.055);
  blob(hip,M.claw,foot,[.052,.045,.058]);
  legs.push({hip,side,i});
 }
 // Instanced bristles instead of hundreds of independent draw calls.
 const count=115,fur=new THREE.InstancedMesh(spikeGeo,M.fur,count),dummy=new THREE.Object3D();
 let seed=73421;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 for(let i=0;i<count;i++){
  const ang=rand()*Math.PI*2,phi=(.12+rand()*.64)*Math.PI;
  const head=i%5===0;
  const center=head?[0,.48,.22]:[0,.47,-.31];
  const rx=head?.29:.36,ry=head?.22:.27,rz=head?.29:.40;
  const v=new THREE.Vector3(Math.sin(phi)*Math.cos(ang),Math.cos(phi),Math.sin(phi)*Math.sin(ang));
  dummy.position.set(center[0]+v.x*rx,center[1]+v.y*ry,center[2]+v.z*rz);
  dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v);
  const scale=.028+rand()*.045;dummy.scale.set(scale,.058+rand()*.052,scale);
  dummy.updateMatrix();fur.setMatrixAt(i,dummy.matrix);
 }
 fur.instanceMatrix.needsUpdate=true;trunk.add(fur);
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(1,24),new THREE.MeshBasicMaterial({
  color:0x020b0f,transparent:true,opacity:.33,depthWrite:false}));
 shadow.rotation.x=-Math.PI/2;shadow.position.y=.015;shadow.scale.set(1.12,.78,1);g.add(shadow);
 const portal=new THREE.Mesh(new THREE.RingGeometry(.40,.50,24),new THREE.MeshBasicMaterial({
  color:0xff7138,transparent:true,opacity:.7,side:THREE.DoubleSide,depthWrite:false}));
 portal.rotation.x=-Math.PI/2;portal.position.y=.05;g.add(portal);
 const barBg=new THREE.Mesh(new THREE.BoxGeometry(.7,.04,.04),M.dark);
 barBg.position.set(0,1.05,0);g.add(barBg);
 const bar=new THREE.Mesh(new THREE.BoxGeometry(.66,.036,.05),M.stripe);
 bar.position.set(0,1.05,.035);g.add(bar);
 let blink=0;
 const actor={
  group:g,kind:'spider',portal,hpBack:barBg,hpBar:bar,shadow,external:null,
  update(enemy){
   const t=enemy.age,walking=['dash','advance','flank','dodge'].includes(enemy.state);
   const attacking=enemy.state==='attack',stunned=enemy.state==='stunned';
   trunk.position.y=(walking?.032:.012)*Math.sin(t*(walking?10:2.4));
   trunk.rotation.x=attacking?-.11-Math.sin(t*12)**2*.12:stunned?.11:0;
   trunk.rotation.z=enemy.lastHit>0?Math.sin(t*35)*.12:0;
   for(const l of legs){
    const phase=t*(walking?10.8:2.2)+l.i*Math.PI*.60+(l.side===-1?Math.PI:0);
    l.hip.rotation.y=l.side*.11+(walking?Math.sin(phase)*.20:Math.sin(phase)*.02);
    l.hip.rotation.z=l.side*(walking?Math.cos(phase)*.095:Math.sin(phase)*.02);
   }
   const health=Math.max(0,enemy.hp/enemy.maxHp);
   bar.scale.x=health;bar.position.x=-(1-health)*.33;
   barBg.visible=bar.visible=enemy.hp<enemy.maxHp;
   portal.visible=enemy.portal>0;
   portal.material.opacity=Math.max(0,enemy.portal/.72)*.6;
   trunk.visible=enemy.portal<.62;
   blink+=.016;
   M.eyes.emissiveIntensity=attacking?2.5+Math.sin(t*14)*.5:1.25+Math.sin(blink*3)*.3;
  },
  dispose(){world.remove(g);for(const mat of Object.values(M))mat.dispose();
   sphereG.dispose();legGeo.dispose();spikeGeo.dispose();fur.geometry.dispose();
   shadow.geometry.dispose();shadow.material.dispose();portal.geometry.dispose();portal.material.dispose();
   barBg.geometry.dispose();bar.geometry.dispose();}
 };
 actor.update(e);
 return actor;
}
