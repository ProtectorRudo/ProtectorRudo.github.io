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
export function steerEnemy(e,dt,time,target,mode){
 if(!e?.alive||!dt)return 0;
 const p=e.root.position,dX=(target?.x??e.home.x)-p.x,dZ=(target?.z??e.home.z)-p.z,d=Math.hypot(dX,dZ);
 const speed=(e.floor?.39:.16)*(e.variant===2?1.55:e.variant===1?.8:1)*(e.boss?1.15:1);
 const stop=e.floor?(e.boss?1.35:.82):.1;
 let vx=0,vz=0;
 if(d>.0001){
  if(d>stop){vx=dX/d;vz=dZ/d}
  else if(e.floor&&d<.48){vx=-dX/d*.55;vz=-dZ/d*.55}
  else if(e.floor){const side=Math.sin(time*.0007+e.phase)>0?1:-1;vx=-dZ/d*.2*side;vz=dX/d*.2*side}
 }
 if(!e.floor){vx+=Math.sin(time*.0008+e.phase)*.58;vz+=Math.cos(time*.0007+e.phase)*.55}
 else if(d>1){vx+=Math.sin(time*.001+e.phase)*.16;vz+=Math.cos(time*.0011+e.phase)*.16}
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
 }else if(mode!=='demo'||walkable(newX,newZ)){p.x=newX;p.z=newZ}
 else if(walkable(newX,oldZ))p.x=newX;
 else if(walkable(oldX,newZ))p.z=newZ;
 const moved=Math.hypot(p.x-oldX,p.z-oldZ)/Math.max(.001,dt);
 const desiredX=d>.2?dX:e.walkVX,desiredZ=d>.2?dZ:e.walkVZ;
 if(Math.hypot(desiredX,desiredZ)>.01){
  const targetYaw=Math.atan2(desiredX,desiredZ);
  let a=(targetYaw-p.rotation.y+Math.PI)%(Math.PI*2);
  if(a<0)a+=Math.PI*2;a-=Math.PI;
  p.rotation.y+=a*(1-Math.exp(-dt*6.8));
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
 e.flesh.rotation.z=Math.sin(angle*.53+e.phase)*(.025+intensity*.048);
 e.flesh.position.y=Math.abs(Math.sin(angle))*intensity*.015;
 if(e.jaw)e.jaw.scale.y=1+Math.max(0,Math.sin(angle*.65+e.phase))*.23;
 if(e.shadow)e.shadow.material.opacity=.29-.04*intensity;
}
