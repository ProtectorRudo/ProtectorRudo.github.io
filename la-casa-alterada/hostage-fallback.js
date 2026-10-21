/**
 * BLACKZONE V26: independent, anatomically proportioned hostage fallback.
 * Shown immediately before the high-detail GLB finishes loading.
 * Height 1.62m; replaces the oversized spheres of V25.
 */
export function makeHostageFallback(THREE){
 const body=new THREE.Group(),m=(hex,metalness=0)=>new THREE.MeshStandardMaterial({
   color:hex,roughness:metalness?.74:.92,metalness
 });
 const skin=m(0xb98268),skinDark=m(0x945e4a),top=m(0x6a5972),seam=m(0x92809e),
       jeans=m(0x2d3947),jeansEdge=m(0x4d5d67),shoes=m(0x22262d),
       hair=m(0x272026),hairShine=m(0x45333b),eyes=m(0x252025);
 const sphere=new THREE.SphereGeometry(1,16,12),
       cylinder=new THREE.CylinderGeometry(1,1,1,12);
 function part(parent,geometry,material,pos,scale,rot){
   const x=new THREE.Mesh(geometry,material);
   x.position.set(...pos);x.scale.set(...scale);
   if(rot)x.rotation.set(...rot);parent.add(x);return x;
 }
 const ball=(parent,material,pos,scale,rot)=>part(parent,sphere,material,pos,scale,rot);
 const block=(parent,material,pos,scale,rot)=>part(parent,cylinder,material,pos,scale,rot);
 // Clothes sit inside a 42cm-wide, realistic shoulder silhouette.
 ball(body,jeans,[0,.80,-.005],[.195,.17,.125]);
 block(body,top,[0,1.102,0],[.222,.275,.14]);
 ball(body,top,[0,1.28,0],[.227,.10,.143]);
 ball(body,skin,[0,1.371,.016],[.071,.095,.071]);
 const head=ball(body,skin,[0,1.515,.027],[.119,.158,.113]);
 ball(body,skinDark,[0,1.485,.135],[.035,.042,.034]); // nose
 for(const side of [-1,1]){
  ball(body,skin,[side*.116,1.497,.025],[.029,.053,.024]); // ears
  ball(body,eyes,[side*.047,1.535,.134],[.014,.009,.006]);
  ball(body,hair,[side*.047,1.565,.132],[.042,.009,.010]); // eyebrow
 }
 ball(body,skinDark,[0,1.438,.135],[.040,.009,.008]); // subtle lips
 // Hair cap is close to skull; long layered side locks do not enlarge face.
 ball(body,hair,[0,1.626,.0],[.128,.084,.117]);
 ball(body,hair,[0,1.579,-.077],[.113,.141,.060]);
 for(const side of [-1,1]){
   ball(body,hair,[side*.113,1.521,.008],[.039,.135,.075]);
   ball(body,hairShine,[side*.106,1.575,.060],[.013,.068,.030]);
 }
 const arms=[],legs=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*.226,1.276,0);body.add(arm);
  ball(arm,top,[side*.012,-.119,0],[.075,.181,.078]);
  ball(arm,skin,[side*.010,-.350,.003],[.053,.103,.055]);
  ball(arm,skin,[side*.01,-.438,.010],[.050,.071,.045]);
  arms.push(arm);
  const leg=new THREE.Group();leg.position.set(side*.111,.789,0);body.add(leg);
  ball(leg,jeans,[0,-.169,0],[.088,.210,.093]);
  block(leg,jeans,[0,-.391,0],[.078,.169,.079]);
  ball(leg,jeansEdge,[0,-.574,0],[.077,.042,.081]);
  ball(leg,shoes,[0,-.634,.075],[.093,.064,.156]);
  legs.push(leg);
 }
 // Belt and jacket details readable with phone-sized renders.
 block(body,jeansEdge,[0,.865,0],[.200,.027,.126]);
 ball(body,seam,[.122,1.095,.123],[.022,.082,.008]);
 ball(body,seam,[-.122,1.095,.123],[.022,.082,.008]);
 return{flesh:body,arms,legs,height:1.70};
}
export function animateHostageFallback(actor,dt,walking){
 if(!actor?.flesh?.visible||!actor.fallbackArms||!actor.fallbackLegs)return;
 actor.fallbackTime=(actor.fallbackTime||0)+Math.min(.05,Math.max(0,dt));
 const phase=actor.fallbackTime*6.8,amplitude=walking?.23:.016;
 for(let i=0;i<2;i++){
  const side=i===0?1:-1;
  actor.fallbackArms[i].rotation.x=Math.sin(phase)*side*amplitude*.8;
  actor.fallbackLegs[i].rotation.x=Math.sin(phase)*-side*amplitude;
 }
}
