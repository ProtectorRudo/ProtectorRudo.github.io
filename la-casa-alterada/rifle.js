/**
 * Original modular carbine viewmodel for La Casa Alterada V7.
 * Weapon is a decorative FPS prop; hit detection continues to use camera ray.
 * No third-party models, logos, or Counter-Strike content.
 */
export function createTacticalRifle(THREE,materials,flashMap){
 const {iron,steel,silver,polymer,handMat}=materials,model=new THREE.Group();
 const box=(parent,material,pos,size,rotation)=>{
  const o=new THREE.Mesh(new THREE.BoxGeometry(...size),material);o.position.set(...pos);if(rotation)o.rotation.set(...rotation);parent.add(o);return o;
 };
 const rod=(parent,material,a,b,r1,r2)=>{
  const x=new THREE.Vector3(...a),y=new THREE.Vector3(...b),d=y.clone().sub(x);
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,d.length(),12),material);
  m.position.copy(x.add(y).multiplyScalar(.5));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());parent.add(m);return m;
 };
 const rubber=new THREE.MeshStandardMaterial({color:0x141a1c,roughness:.82,metalness:.09});
 const rail=new THREE.MeshStandardMaterial({color:0x5c6163,metalness:.83,roughness:.33});
 const optic=new THREE.MeshStandardMaterial({color:0x19343c,metalness:.48,roughness:.12});
 const brass=new THREE.MeshStandardMaterial({color:0x9b8959,metalness:.72,roughness:.37});
 // Forged receiver, top charging rail and magazine well.
 box(model,iron,[0,.075,-.15],[.34,.29,.96]);
 box(model,steel,[0,.205,-.20],[.31,.095,.96]);
 box(model,polymer,[0,-.135,-.22],[.32,.19,.56]);
 box(model,steel,[0,-.16,-.45],[.30,.14,.40]);
 const charging=new THREE.Group();charging.position.set(0,.235,.08);model.add(charging);
 box(charging,rail,[0,0,0],[.24,.065,.18]);
 box(charging,polymer,[.19,-.045,0],[.075,.09,.14]);
 // Long vented handguard + muzzle brake.
 box(model,iron,[0,.04,-.91],[.29,.22,.86]);
 box(model,steel,[0,.153,-.89],[.32,.068,.94]);
 for(let i=0;i<9;i++)for(const s of [-1,1]){
   box(model,rubber,[s*.154,.065,-.58-i*.071],[.022,.035,.046]);
   if(i%2===0)box(model,rail,[s*.15,-.02,-.58-i*.071],[.025,.02,.065]);
 }
 rod(model,steel,[0,.09,-1.26],[0,.09,-1.79],.053,.053);
 rod(model,iron,[0,.09,-1.76],[0,.09,-1.91],.07,.071);
 for(const s of [-1,1])box(model,rubber,[s*.054,.09,-1.86],[.019,.058,.075]);
 const crown=new THREE.Mesh(new THREE.TorusGeometry(.045,.012,8,16),silver);
 crown.position.set(0,.09,-1.945);model.add(crown);
 // Stock and buffer tube.
 rod(model,iron,[0,.08,.29],[0,.08,.69],.075,.08);
 box(model,polymer,[0,.075,.67],[.31,.24,.44]);
 box(model,rubber,[0,.07,.94],[.32,.32,.12]);
 box(model,steel,[0,-.06,.57],[.09,.15,.20],[-.18,0,0]);
 // Extended magazine and angled pistol grip.
 const magazine=new THREE.Group();magazine.position.set(0,-.19,-.34);magazine.rotation.x=-.18;model.add(magazine);
 box(magazine,polymer,[0,-.19,0],[.25,.37,.23]);
 box(magazine,steel,[0,-.41,.02],[.27,.055,.26]);
 for(let i=0;i<7;i++)for(const s of [-1,1])box(magazine,rubber,[s*.127,-.07-i*.042,.0],[.008,.015,.19]);
 const grip=new THREE.Group();grip.position.set(0,-.19,.31);grip.rotation.x=-.26;model.add(grip);
 box(grip,polymer,[0,-.28,.02],[.23,.57,.26]);
 for(let i=0;i<7;i++)box(grip,rubber,[.123,-.10-i*.05,.02],[.012,.024,.18]);
 const trigger=new THREE.Mesh(new THREE.TorusGeometry(.16,.02,7,23),iron);
 trigger.rotation.y=Math.PI/2;trigger.position.set(0,-.245,.12);model.add(trigger);
 // Raised red-dot optic, both front and rear iron sights.
 box(model,rail,[0,.245,-.17],[.08,.047,.52]);
 for(let i=0;i<9;i++)box(model,rubber,[0,.27,-.42+i*.052],[.135,.019,.017]);
 box(model,polymer,[0,.36,-.18],[.19,.17,.30]);
 box(model,optic,[0,.398,-.34],[.17,.11,.045]);
 box(model,optic,[0,.398,-.018],[.17,.11,.045]);
 box(model,iron,[0,.27,-1.51],[.14,.20,.07]);
 box(model,silver,[0,.37,-1.51],[.045,.045,.045]);
 for(const s of [-1,1]){
  box(model,steel,[s*.177,.12,-.25],[.028,.085,.38]);
  box(model,brass,[s*.176,.116,.06],[.009,.024,.045]);
 }
 // Two tactical-glove hands: trigger and forward grip.
 const glove=new THREE.MeshStandardMaterial({color:0x343f43,roughness:.97});
 const skin=new THREE.MeshStandardMaterial({color:0x876e5d,roughness:.9});
 const hand=(x,y,z,angle)=>{
  const p=new THREE.Group();p.position.set(x,y,z);p.rotation.z=angle;model.add(p);
  const palm=new THREE.Mesh(new THREE.SphereGeometry(1,12,9),glove);
  palm.scale.set(.13,.18,.13);palm.position.set(0,0,.01);p.add(palm);
  for(let j=0;j<4;j++)rod(p,glove,[-.092+j*.061,.06,.02],[-.10+j*.061,-.1,-.065],.029,.023);
  box(p,rubber,[0,-.17,.04],[.24,.15,.21]);
 };
 hand(.13,-.39,.34,-.18);
 hand(-.12,-.15,-.94,.08);
 const flash=new THREE.Sprite(new THREE.SpriteMaterial({map:flashMap,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
 flash.position.set(0,.09,-2.03);flash.scale.set(.82,.82,1);flash.visible=false;model.add(flash);
 model.userData.weapon='VX-4';
 return {model,slide:charging,flash};
}