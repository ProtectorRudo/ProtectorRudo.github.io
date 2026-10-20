/**
 * La Casa Alterada — V7 tactical characters.
 * Original procedural meshes: no Valve/Counter-Strike models or textures.
 * Three.js passed explicitly to avoid bundling another engine copy.
 */
export function createTacticalActor(THREE,variant=0,team='raider'){
 const root=new THREE.Group(),flesh=new THREE.Group();root.add(flesh);
 const ally=team==='operator';
 const c=variant%4;
 const colors=ally?{jacket:[0x233748,0x29313b,0x26343c,0x33414c][c],pants:0x262c34,vest:0x1b222a,accent:0x587586}:
 {jacket:[0x49483e,0x3a3941,0x554d3f,0x353b34][c],pants:[0x282c2b,0x353234,0x35382d,0x343031][c],vest:[0x343129,0x282e2b,0x424036,0x262c30][c],accent:0x936d4b};
 const mat=(color,roughness=.85,metalness=.02)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const jacket=mat(colors.jacket),pants=mat(colors.pants),vest=mat(colors.vest,.92),detail=mat(colors.accent,.74),boots=mat(0x161a1c,.9),rubber=mat(0x202529,.91);
 const gunmetal=mat(0x2e3338,.37,.76),steel=mat(0x454b4b,.36,.66),skin=mat([0xa77b65,0xbc9481,0x88664e,0xb69985][c],.89),
 mask=mat(c===1?0x232b30:0x25282a),fabric=mat(0x55564a),glass=mat(0x131e26,.14,.55),lenses=mat(0x566d76,.23,.5);
 const boxGeo=new THREE.BoxGeometry(1,1,1),sphere=new THREE.SphereGeometry(1,14,10),cylinder=new THREE.CylinderGeometry(1,1,1,10);
 function mesh(p,g,m,pos,scale,rot){const o=new THREE.Mesh(g,m);o.position.set(...pos);o.scale.set(...scale);if(rot)o.rotation.set(...rot);p.add(o);return o}
 function b(p,m,pos,scale,rot){return mesh(p,boxGeo,m,pos,scale,rot)}
 function ell(p,m,pos,scale,rot){return mesh(p,sphere,m,pos,scale,rot)}
 function seg(p,m,a,z,r1,r2){
   const q=new THREE.Vector3(...a),end=new THREE.Vector3(...z),d=end.clone().sub(q);
   const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,d.length(),10),m);
   o.position.copy(q.add(end).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());p.add(o);return o;
 }
 // Human body with credible protective kit and articulated limbs.
 ell(flesh,jacket,[0,1.14,0],[.245,.36,.165]);
 b(flesh,vest,[0,1.15,.115],[.41,.42,.21]);b(flesh,vest,[0,1.18,-.155],[.39,.39,.09]);
 b(flesh,rubber,[0,.91,.13],[.39,.09,.22]);b(flesh,detail,[0,.935,.235],[.33,.045,.035]);
 for(let i=0;i<4;i++)for(let j=0;j<2;j++)b(flesh,i===3?rubber:vest,[(j-.5)*.19,1.01+i*.083,.238],[.155,.055,.046]);
 for(let i=0;i<3;i++){const x=(i-1)*.13;b(flesh,detail,[x,1.3,.243],[.09,.075,.037]);}
 b(flesh,vest,[-.255,1.32,.12],[.092,.18,.18]); // radio shoulder
 b(flesh,gunmetal,[-.257,1.45,.16],[.04,.18,.04]);
 ell(flesh,rubber,[0,.79,0],[.215,.14,.16]);b(flesh,detail,[0,.81,.153],[.39,.075,.035]);
 ell(flesh,skin,[0,1.52,.015],[.145,.185,.135]);
 // Mask: compact balaclava for raiders, tactical visor for operators.
 if(!ally){ell(flesh,mask,[0,1.56,.025],[.149,.188,.142]);b(flesh,rubber,[0,1.48,.148],[.26,.091,.045]);for(const s of [-1,1])b(flesh,skin,[s*.064,1.573,.16],[.045,.024,.014]);}
 else {ell(flesh,mask,[0,1.57,0],[.153,.174,.14]);b(flesh,glass,[0,1.57,.152],[.265,.08,.036]);b(flesh,lenses,[0,1.585,.178],[.24,.045,.017]);b(flesh,rubber,[0,1.46,.147],[.26,.092,.051]);}
 ell(flesh,ally?gunmetal:mask,[0,1.716,.001],[.182,.112,.173]);b(flesh,ally?gunmetal:mask,[0,1.693,.15],[.37,.057,.13]);b(flesh,rubber,[0,1.72,-.08],[.35,.075,.12]);
 for(const s of [-1,1]){b(flesh,rubber,[s*.175,1.56,.01],[.052,.15,.117]);b(flesh,detail,[s*.16,1.164,.065],[.07,.32,.22]);}
 if(ally){b(flesh,detail,[0,1.31,.285],[.085,.038,.012]);b(flesh,lenses,[-.10,1.64,.15],[.095,.045,.02]);}
 else {b(flesh,mask,[0,1.49,.143],[.26,.061,.025]);}
 const arms=[],legs=[];
 for(let i=0;i<2;i++){
   const s=i===0?-1:1;
   const arm=new THREE.Group();arm.position.set(s*.26,1.34,0);flesh.add(arm);arms.push(arm);
   ell(arm,jacket,[s*.04,-.115,0],[.105,.175,.105]);
   seg(arm,jacket,[s*.035,-.14,0],[s*.125,-.315,.105],.105,.082);
   ell(arm,rubber,[s*.125,-.34,.10],[.085,.088,.08]);
   seg(arm,jacket,[s*.128,-.345,.10],[s*.085,-.49,.24],.084,.07);
   ell(arm,boots,[s*.085,-.51,.24],[.09,.09,.075]);
   b(arm,rubber,[s*.135,-.235,.108],[.112,.075,.113]);
   const leg=new THREE.Group();leg.position.set(s*.124,.79,-.02);flesh.add(leg);legs.push(leg);
   ell(leg,pants,[0,-.155,.0],[.132,.23,.129]);
   seg(leg,pants,[0,-.1,0],[s*.015,-.37,.015],.124,.098);
   b(leg,vest,[s*.1,-.29,.1],[.085,.18,.075]);
   ell(leg,rubber,[s*.015,-.43,.04],[.125,.12,.128]);
   seg(leg,pants,[s*.015,-.43,.04],[s*.014,-.69,.075],.10,.084);
   b(leg,boots,[s*.014,-.72,.135],[.19,.15,.27]);
   b(leg,gunmetal,[s*.014,-.755,.175],[.20,.045,.28]);
 }
 // Character-carried rifle for readable hostile silhouette.
 const carried=new THREE.Group();carried.position.set(.05,1.16,.285);carried.rotation.set(-.19,-.18,.06);flesh.add(carried);
 b(carried,gunmetal,[0,0,-.14],[.10,.13,.54]);b(carried,steel,[0,.075,-.11],[.11,.055,.31]);
 b(carried,gunmetal,[0,-.12,.02],[.075,.26,.12],[.22,0,0]);b(carried,gunmetal,[0,0,.20],[.075,.12,.26]);
 b(carried,rubber,[0,.015,-.39],[.12,.13,.23]);
 const barrel=mesh(carried,new THREE.CylinderGeometry(.029,.029,.45,12),gunmetal,[0,.01,-.59],[1,1,1],[Math.PI/2,0,0]);
 b(carried,steel,[0,.09,-.14],[.045,.065,.17]);
 b(carried,glass,[0,.13,-.1],[.09,.055,.11]);
 const flash=new THREE.PointLight(0xffc58a,0,1.7);flash.position.set(0,.01,-.81);carried.add(flash);
 // Invisible shot collider covering head and torso.
 const hit=new THREE.Mesh(new THREE.SphereGeometry(.47,12,8),new THREE.MeshBasicMaterial({visible:false}));
 hit.position.set(0,.95,0);hit.scale.set(1,1.85,.95);flesh.add(hit);
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(.25,24).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x020507,transparent:true,opacity:.29,depthWrite:false}));shadow.position.y=.018;root.add(shadow);
 return {root,flesh,arms,legs,hit,jaw:null,shadow,variant,size:1,alive:true,hp:variant===1?5:variant===2?2:3,start:new THREE.Vector3(),next:0,phase:Math.random()*7,flash,team};
}
