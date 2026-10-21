/**
 * V5 original lightweight monster movement for La Casa Alterada.
 * Ground pursuit and elevated-surface skittering, with FPS-independent steering.
 * AR has no semantic furniture collision until a real depth map is available.
 */
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const furniture=[[-1.96,-.06,-1.55,-.43],[-.04,2.34,-2.2,-.88]];
function walkable(x,z){
  if(x<-3.7||x>3.7||z<-2.65||z>4.25)return false;
  for(const b of furniture)if(x>b[0]-.15&&x<b[1]+.15&&z>b[2]-.15&&z<b[3]+.15)return false;
  return true;
}
// Small visibility graph around the two known furniture obstacles in demo mode.
// Recomputed sparingly; no pathfinding is claimed for the unscanned real home.
function blockedSegment(a,b){
 for(const f of furniture){
  const x0=f[0]-.2,x1=f[1]+.2,z0=f[2]-.2,z1=f[3]+.2;
  let lo=0,hi=1;
  for(const [p,delta,min,max] of [[a.x,b.x-a.x,x0,x1],[a.z,b.z-a.z,z0,z1]]){
   if(Math.abs(delta)<.000001){if(p>=min&&p<=max){continue}else{lo=2;break}}
   const t0=(min-p)/delta,t1=(max-p)/delta;
   lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));
  }
  if(lo<=hi)return true;
 }
 return false;
}
function nextWaypoint(start,end){
 if(!blockedSegment(start,end))return end;
 const pts=[start,end];
 for(const f of furniture){
  const margin=.34;
  for(const x of [f[0]-margin,f[1]+margin])for(const z of [f[2]-margin,f[3]+margin])pts.push({x,z});
 }
 const n=pts.length,dist=new Array(n).fill(Infinity),prev=new Array(n).fill(-1),done=new Array(n).fill(false);
 dist[0]=0;
 for(let step=0;step<n;step++){
  let u=-1,best=Infinity;
  for(let i=0;i<n;i++)if(!done[i]&&dist[i]<best){u=i;best=dist[i]}
  if(u<0||u===1)break;
  done[u]=true;
  for(let v=1;v<n;v++)if(!done[v]&&!blockedSegment(pts[u],pts[v])){
   const d=Math.hypot(pts[u].x-pts[v].x,pts[u].z-pts[v].z),nd=dist[u]+d;
   if(nd<dist[v]){dist[v]=nd;prev[v]=u}
  }
 }
 if(!Number.isFinite(dist[1]))return end;
 let next=1;
 while(prev[next]>0)next=prev[next];
 return pts[next]||end;
}
export function steerEnemy(e,dt,time,target,mode,map,peers){
 if(!e?.alive||!dt)return 0;
 const p=e.root.position;
 let goal=target;
 if(e.floor&&target&&(mode==='demo'||map?.walls.length||map?.boxes.length)){
  const change=!e.lastGoal||Math.hypot(target.x-e.lastGoal.x,target.z-e.lastGoal.z)>.7;
  if(!e.waypoint||change||Math.hypot(p.x-e.waypoint.x,p.z-e.waypoint.z)<.15){
    e.waypoint=(map?.walls.length||map?.boxes.length)?(map.nearestWaypoint(p,target)||p):nextWaypoint(p,target);
    e.lastGoal={x:target.x,z:target.z};
  }
  goal=e.waypoint;
 }
 const dX=(goal?.x??e.home.x)-p.x,dZ=(goal?.z??e.home.z)-p.z,d=Math.hypot(dX,dZ);
 const speed=(e.floor?.39:.16)*(e.variant===2?1.55:e.variant===1?.8:1)*(e.boss?1.15:1);
 // Cover waypoints need centimetre-scale accuracy; the generic attack
 // stand-off distance previously prevented bots reaching their peek lane.
 const tactical=!!e.coverPlan&&!!e.coverState;
 const stop=tactical?.10:e.floor?(goal===target?(e.boss?1.75:1.58):.08):.14;
 let vx=0,vz=0;
 if(d>.0001){
  if(d>stop){vx=dX/d;vz=dZ/d}
  else if(!tactical&&e.floor&&goal===target&&d<1.1){vx=-dX/d*.6;vz=-dZ/d*.6}
  else if(!tactical&&e.floor&&goal===target){const side=Math.sin(time*.0007+e.phase)>0?1:-1;vx=-dZ/d*.2*side;vz=dX/d*.2*side}
 }
 if(!e.floor){vx+=Math.sin(time*.0008+e.phase)*.58;vz+=Math.cos(time*.0007+e.phase)*.55}
 else if(!tactical&&d>1){vx+=Math.sin(time*.001+e.phase)*.16;vz+=Math.cos(time*.0011+e.phase)*.16}
 // Squad spacing: enemies avoid occupying the same spot while they flank.
 if(e.floor&&Array.isArray(peers)){
   let awayX=0,awayZ=0,neighbors=0;
   for(const other of peers){
     if(other===e||!other?.alive||!other.floor)continue;
     const ox=p.x-other.root.position.x,oz=p.z-other.root.position.z;
     const distance=Math.hypot(ox,oz);
     if(distance>.03&&distance<.82){
       const force=(.82-distance)/.82;
       awayX+=(ox/distance)*force;awayZ+=(oz/distance)*force;neighbors++;
     }
   }
   if(neighbors){vx+=awayX*.78;vz+=awayZ*.78}
 }
 const len=Math.hypot(vx,vz);if(len>1){vx/=len;vz/=len}
 e.walkVX??=0;e.walkVZ??=0;
 const ease=1-Math.exp(-dt*3.8);
 e.walkVX+=(vx*speed-e.walkVX)*ease;
 e.walkVZ+=(vz*speed-e.walkVZ)*ease;
 const oldX=p.x,oldZ=p.z,newX=oldX+e.walkVX*dt,newZ=oldZ+e.walkVZ*dt;
 if(!e.floor){
  const radius=e.roamRadius||.25,h=e.home;
  const dx=newX-h.x,dz=newZ-h.z,dist=Math.hypot(dx,dz);
  p.x=dist>radius?h.x+dx/dist*radius:newX;
  p.z=dist>radius?h.z+dz/dist*radius:newZ;
  }else{
 const can=(x,z)=>(mode!=='demo'||walkable(x,z))&&(!map||map.canMove(p,{x,y:p.y,z},.18));
 if(can(newX,newZ)){p.x=newX;p.z=newZ}
 else if(can(newX,oldZ))p.x=newX;
 else if(can(oldX,newZ))p.z=newZ;
 }
 const moved=Math.hypot(p.x-oldX,p.z-oldZ)/Math.max(.001,dt);
 // Abort a permanently blocked cover approach rather than walking into a
 // mapped wall forever. Skip hold/fire because not moving is intentional.
 if(tactical&&['approach','peek','retreat'].includes(e.coverState)&&
    Math.hypot((target?.x??p.x)-p.x,(target?.z??p.z)-p.z)>.48){
   e.coverStall=moved<.025?(e.coverStall||0)+dt:0;
   if(e.coverStall>3.2){
     e.coverPlan=null;e.coverState=null;e.waypoint=null;e.lastGoal=null;
     e.coverRetryAt=time+5200;e.coverStall=0;
   }
 }else e.coverStall=0;
 const focus=(e.coverState==='hold'||e.coverState==='fire')&&e.tacticalThreat;
 const desiredX=focus?e.tacticalThreat.x-p.x:d>.2?dX:e.walkVX;
 const desiredZ=focus?e.tacticalThreat.z-p.z:d>.2?dZ:e.walkVZ;
 if(Math.hypot(desiredX,desiredZ)>.01){
  const targetYaw=Math.atan2(desiredX,desiredZ);
  let a=(targetYaw-e.root.rotation.y+Math.PI)%(Math.PI*2);
  if(a<0)a+=Math.PI*2;a-=Math.PI;
  e.root.rotation.y+=a*(1-Math.exp(-dt*6.8));
 }
 p.y=e.groundY;
 return moved;
}
export function animateEnemy(e,dt,speed){
 if(!e?.alive||!dt)return;
 const intensity=clamp(speed/(e.floor?.39:.16),0,1);
 e.walkTime=(e.walkTime||0)+dt*(2+intensity*7.5);
 const angle=e.walkTime;
 for(let i=0;i<(e.legs?.length||0);i++){
  const s=i===0?-1:1;
  e.legs[i].rotation.x=Math.sin(angle+i*Math.PI)*.42*intensity;
  e.legs[i].rotation.z=s*Math.sin(angle*.5)*.03*intensity;
 }
 for(let i=0;i<(e.arms?.length||0);i++){
  e.arms[i].rotation.x=Math.sin(angle+(i+1)*Math.PI)*.36*intensity;
  e.arms[i].rotation.z=(i===0?-.1:.1)*(1+intensity*.2);
 }
 e.flesh.rotation.x=.05+Math.sin(angle)*intensity*.06;
 e.flesh.rotation.z=Math.sin(angle*.53+e.phase)*(.025+intensity*.048)+(e.coverState==='fire'?.055:0);
 e.flesh.position.y=Math.abs(Math.sin(angle))*intensity*.015;
 // Procedural backup mimics prone-to-cover without sinking into the floor.
 // The head hit region tracks the height of the visible crouching figure.
 const crouching=e.ctfStance==='crouch'||e.coverState==='hold'||e.coverState==='retreat';
 const desired=crouching?.72:1;
 e.flesh.scale.y+=(desired-e.flesh.scale.y)*Math.min(1,dt*9);
 if(e.headHit){
   const targetHead=1.56-(1-desired)*.45;
   e.headHit.position.y+=(targetHead-e.headHit.position.y)*Math.min(1,dt*9);
 }
 if(e.jaw)e.jaw.scale.y=1+Math.max(0,Math.sin(angle*.65+e.phase))*.23;
 if(e.shadow)e.shadow.material.opacity=.29-.04*intensity;
}
