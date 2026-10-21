/**
 * Capture the Flag V16 — shared, host-authoritative game rules.
 * Uses the A/B calibrated world; positions stored relative to the shared anchor.
 */
export function createCaptureFlag(THREE,api){
 const TEAMS=['blue','red'],COLORS={blue:0x51caff,red:0xff6c66};
 const fresh=()=>({carrier:null,dropped:null,stamp:0});
 const S={config:{bots:2,difficulty:'normal',versus:false},bases:{blue:null,red:null},
  scores:{blue:0,red:0},flags:{blue:fresh(),red:fresh()},visuals:{},running:false,
  finished:false,winner:null,clock:480,spawned:false,tagged:{}};
 const other=t=>t==='blue'?'red':'blue';
 const point=v=>Array.isArray(v)&&v.length===3&&v.every(n=>Number.isFinite(n)&&Math.abs(n)<35)?new THREE.Vector3(...v):null;
 const arr=v=>v?[+v.x.toFixed(3),+v.y.toFixed(3),+v.z.toFixed(3)]:null;
 const gap=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.z-b.z):Infinity;
 const origin=()=>api.origin();
 const players=()=>api.players()||[];
 const bots=()=>api.bots().filter(e=>e.ctfBot);
 const botPosition=e=>origin()?.worldToLocal(e.root.getWorldPosition(new THREE.Vector3()))||null;
 function configure(input={}){
   if(S.running)return false;
   const bots=Math.min(6,Math.max(0,Math.round(Number(input.bots)||0)));
   S.config={bots,difficulty:['facil','normal','dificil'].includes(input.difficulty)?input.difficulty:'normal',versus:input.versus===true};
   return true;
 }
 function model(team){
   const group=new THREE.Group(),color=COLORS[team];
   const mat=new THREE.MeshStandardMaterial({color,roughness:.6,side:THREE.DoubleSide});
   const metal=new THREE.MeshStandardMaterial({color:0xb9c6ce,metalness:.75,roughness:.3});
   const base=new THREE.Mesh(new THREE.CylinderGeometry(.24,.26,.06,18),new THREE.MeshStandardMaterial({color:0x27313d,metalness:.3,roughness:.6}));
   base.position.y=.03;group.add(base);
   const pole=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,1.04,10),metal);pole.position.y=.54;group.add(pole);
   const cloth=new THREE.Mesh(new THREE.PlaneGeometry(.48,.3),mat);cloth.position.set(.23,.91,0);group.add(cloth);
   const halo=new THREE.Mesh(new THREE.TorusGeometry(.34,.017,6,40).rotateX(-Math.PI/2),
    new THREE.MeshBasicMaterial({color,transparent:true,opacity:.7}));
   halo.position.y=.035;group.add(halo);
   group.userData.cloth=cloth;return group;
 }
 function refresh(time=0){
   if(!origin())return;
   for(const t of TEAMS){
     const flag=S.flags[t],at=flag.dropped||S.bases[t];
     if(!S.visuals[t]){S.visuals[t]=model(t);origin().add(S.visuals[t])}
     const m=S.visuals[t];if(m.parent!==origin())origin().add(m);
     m.visible=!!at&&!flag.carrier;
     if(at){m.position.copy(at);m.rotation.y=Math.sin(time*.001)*.13;m.userData.cloth.rotation.y=Math.sin(time*.002)*.12}
   }
 }
 function place(team,worldPoint){
   if(!TEAMS.includes(team)||S.running||!origin()||!worldPoint)return false;
   const at=origin().worldToLocal(worldPoint.clone());at.y=0;
   if(!Number.isFinite(at.x)||!Number.isFinite(at.z)||Math.abs(at.x)>35||Math.abs(at.z)>35)return false;
   if(gap(at,S.bases[other(team)])<1.6)return false;
   S.bases[team]=at;S.flags[team]=fresh();refresh();return true;
 }
 const ready=()=>!!S.bases.blue&&!!S.bases.red;
 const flagLocation=t=>S.flags[t].dropped||S.bases[t];
 function roster(){
   const everyone=players().filter(x=>TEAMS.includes(x.team)&&x.pos).map(x=>({...x,bot:false}));
   for(const e of bots())if(e.alive){const pos=botPosition(e);if(pos)everyone.push({id:'bot:'+e.id,team:e.team,pos,bot:true})}
   return everyone.filter(x=>!S.tagged[x.id]);
 }
 function ownerPosition(id){
   if(id?.startsWith('bot:')){const e=bots().find(e=>e.id===Number(id.slice(4))&&e.alive);return e?botPosition(e):null}
   return players().find(p=>p.id===id)?.pos||null;
 }
 function returnHome(t){S.flags[t]=fresh();api.event?.('BANDERA '+(t==='blue'?'AZUL':'ROJA')+' RECUPERADA')}
 function drop(t,pos,time){
   S.flags[t]={carrier:null,dropped:pos?.clone?.()||S.bases[t]?.clone()||null,stamp:time};
 }
 function eliminateCarrier(id,pos,time){
   for(const t of TEAMS)if(S.flags[t].carrier===id)drop(t,pos,time);
 }
 function end(winner){
   if(S.finished)return;S.finished=true;S.running=false;S.winner=winner;
   api.finish?.(winner,snapshot());
 }
 function score(team){
   S.scores[team]++;
   S.flags={blue:fresh(),red:fresh()};
   api.event?.('¡PUNTO '+(team==='blue'?'AZUL':'ROJO')+'! '+S.scores.blue+' — '+S.scores.red);
   if(S.scores[team]>=3)end(team);
 }
 function flagsStep(time){
   const members=roster();
   for(const t of TEAMS){
     const f=S.flags[t],base=S.bases[t];if(!base)continue;
     if(f.carrier&&!ownerPosition(f.carrier))drop(t,f.dropped||base,time);
     if(f.dropped&&time-f.stamp>=14000){returnHome(t);continue}
     if(f.carrier)continue;
     const at=flagLocation(t);
     for(const p of members){
       if(gap(p.pos,at)>.73)continue;
       if(p.team===t){if(f.dropped)returnHome(t)}
       else{f.carrier=p.id;f.dropped=null;api.event?.('BANDERA '+(t==='blue'?'AZUL':'ROJA')+' ROBADA')}
       break;
     }
   }
   for(const p of members){
     const stolen=other(p.team);
     if(S.flags[stolen].carrier===p.id&&!S.flags[p.team].carrier&&!S.flags[p.team].dropped&&
         gap(p.pos,S.bases[p.team])<.83){score(p.team);break}
   }
 }
 function spawn(){
   if(S.spawned)return;S.spawned=true;
   for(const team of TEAMS)for(let i=0;i<S.config.bots;i++){
     const p=S.bases[team].clone().add(new THREE.Vector3(((i%3)-1)*.42,0,-Math.floor(i/3)*.42));
     api.spawnBot?.(team,i,30000+(team==='blue'?0:100)+i,p);
   }
 }
 function botsStep(dt,time){
   const specs={facil:[.52,1900,.22,1],normal:[.82,1400,.43,1],dificil:[1.1,900,.61,2]}[S.config.difficulty];
   for(const e of bots()){
     if(!e.alive){
       if(!e.ctfRespawnAt)e.ctfRespawnAt=time+4200;
       if(time<e.ctfRespawnAt)continue;
       e.ctfRespawnAt=0;e.alive=true;e.hp=3;e.root.visible=true;
       e.root.position.copy(origin().localToWorld(S.bases[e.team].clone()));
     }
     const carrying=TEAMS.some(t=>S.flags[t].carrier==='bot:'+e.id);
     const targetLocal=carrying?S.bases[e.team]:flagLocation(other(e.team));
     if(!targetLocal)continue;
     const at=e.root.position,to=origin().localToWorld(targetLocal.clone());
     const dist=gap(at,to);
     if(dist>.35){
       const waypoint=api.nextPoint?.(at,to)||to;
       const delta=waypoint.clone().sub(at);delta.y=0;
       if(delta.lengthSq()>.001){
         delta.normalize();
         const next=at.clone().addScaledVector(delta,Math.min(specs[0]*dt,dist));
         if(api.canMove?.(at,next,.21)!==false)at.copy(next);
         e.root.rotation.y=Math.atan2(delta.x,delta.z);
       }
     }
     api.animate?.(e,dt,dist>.4?specs[0]:0);
     if(time<(e.ctfShotAt||0))continue;
     const self=botPosition(e);
     const rival=roster().filter(p=>p.team!==e.team&&gap(p.pos,self)<5)
       .sort((a,b)=>gap(a.pos,self)-gap(b.pos,self))[0];
     e.ctfShotAt=time+specs[1]+Math.random()*420;
     if(!rival)continue;
     const from=at.clone().add(new THREE.Vector3(0,1.1,0));
     const dest=origin().localToWorld(rival.pos.clone()).add(new THREE.Vector3(0,.9,0));
     if(api.cover?.(from,dest))continue;
     api.botShot?.(from,dest,e.team);
     if(Math.random()>specs[2])continue;
     if(rival.bot){
       const victim=bots().find(b=>b.id===Number(rival.id.slice(4)));
       if(victim?.alive)api.damageBot?.(victim,specs[3],'bot:'+e.id);
     }else{
       S.tagged[rival.id]=time+2700;
       eliminateCarrier(rival.id,rival.pos,time);
       api.tagPlayer?.(rival.id,specs[3]);
     }
   }
 }
 function start(){
   if(!ready()||S.running)return false;
   S.scores={blue:0,red:0};S.flags={blue:fresh(),red:fresh()};
   S.running=true;S.finished=false;S.winner=null;S.clock=480;S.tagged={};S.spawned=false;
   if(api.isHost())spawn();
   api.event?.('CAPTURÁ LA BANDERA RIVAL Y REGRESÁ A TU BASE');
   return true;
 }
 function tick(dt,time){
   refresh(time);if(!S.running||!api.isHost())return;
   S.clock=Math.max(0,S.clock-dt);
   for(const id of Object.keys(S.tagged))if(time>S.tagged[id])delete S.tagged[id];
   botsStep(dt,time);flagsStep(time);
   if(S.clock===0&&!S.finished)end(S.scores.blue===S.scores.red?'draw':S.scores.blue>S.scores.red?'blue':'red');
 }
 function snapshot(){
   const flagData=t=>({carrier:S.flags[t].carrier,dropped:arr(S.flags[t].dropped),stamp:S.flags[t].stamp});
   return{config:{...S.config},bases:{blue:arr(S.bases.blue),red:arr(S.bases.red)},scores:{...S.scores},
     flags:{blue:flagData('blue'),red:flagData('red')},running:S.running,finished:S.finished,
     winner:S.winner,clock:+S.clock.toFixed(2)};
 }
 function applyState(state){
   if(!state||typeof state!=='object')return;
   if(!S.running)configure(state.config);
   for(const t of TEAMS){
     const p=point(state.bases?.[t]);if(p)S.bases[t]=p;
     const f=state.flags?.[t];if(f)S.flags[t]={carrier:typeof f.carrier==='string'?f.carrier:null,dropped:point(f.dropped),stamp:Number(f.stamp)||0};
     if(Number.isFinite(state.scores?.[t]))S.scores[t]=Math.max(0,Math.min(99,Math.trunc(state.scores[t])));
   }
   S.running=!!state.running;S.finished=!!state.finished;S.winner=state.winner||null;
   S.clock=Number.isFinite(state.clock)?state.clock:S.clock;refresh();
 }
 function target(team){
   const enemy=other(team);
   const pos=S.flags[enemy].carrier?S.bases[team]:flagLocation(enemy);
   return pos?.clone()||null;
 }
 function reset(){
   for(const g of Object.values(S.visuals)){
     g.parent?.remove(g);
     g.traverse(n=>{n.geometry?.dispose?.();if(n.material)for(const m of Array.isArray(n.material)?n.material:[n.material])m.dispose?.()});
   }
   S.visuals={};S.bases={blue:null,red:null};S.scores={blue:0,red:0};
   S.flags={blue:fresh(),red:fresh()};S.running=false;S.finished=false;S.winner=null;S.clock=480;
   S.spawned=false;S.tagged={};
 }
 return{configure,place,ready,start,tick,snapshot,applyState,reset,flagLocation,target,eliminateCarrier,
   get config(){return S.config},get bases(){return S.bases},get scores(){return S.scores},
   get running(){return S.running},get flags(){return S.flags},get clock(){return S.clock},get winner(){return S.winner}};
}
