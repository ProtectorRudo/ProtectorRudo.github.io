/**
 * BLACKZONE V33: host-authoritative player-v-player health and respawn.
 * Called only by the host after validating a raycast against tracked poses.
 */
export function createPvPHealth(options={}){
 const maxHp=100,respawnMs=4200,graceMs=1550;
 const states=new Map();
 let nextSeq=0;
 const at=id=>{
   if(!states.has(id))states.set(id,{
     id,hp:maxHp,deaths:0,kills:0,deadUntil:0,protectedUntil:0,seq:0
   });
   return states.get(id);
 };
 function reset(ids=[],now=0){
   states.clear();nextSeq=0;
   for(const id of ids)if(typeof id==='string'&&id)at(id);
 }
 function alive(id,now){
   const p=at(id);return !p.deadUntil||now>=p.deadUntil;
 }
 function tick(now){
   let changed=false;
   for(const p of states.values()){
     if(p.deadUntil&&now>=p.deadUntil){
       p.hp=maxHp;p.deadUntil=0;p.protectedUntil=now+graceMs;
       p.seq=++nextSeq;changed=true;
     }
   }
   return changed;
 }
 function hit(id,attacker,amount,now,headshot=false){
   if(typeof id!=='string'||!id||id===attacker)return null;
   const p=at(id);
   if(p.deadUntil||p.protectedUntil>now)return null;
   if(!Number.isFinite(amount)||amount<=0)return null;
   const before=p.hp,damage=Math.min(100,Math.max(1,Math.round(amount)));
   p.hp=Math.max(0,p.hp-damage);
   const lethal=p.hp===0&&before>0;
   if(lethal){
     p.deaths++;p.deadUntil=now+respawnMs;
     if(typeof attacker==='string'&&attacker&&attacker!==id)
       at(attacker).kills++;
   }
   p.seq=++nextSeq;
   return{victim:id,attacker,damage:before-p.hp,headshot:!!headshot,
     lethal,state:view(id,now),seq:nextSeq};
 }
 function view(id,now=0){
   const p=at(id);
   return{id:p.id,hp:p.hp,kills:p.kills,deaths:p.deaths,seq:p.seq,
     dead:p.deadUntil>now,respawnIn:Math.max(0,p.deadUntil-now),
     invulnerableIn:Math.max(0,p.protectedUntil-now)};
 }
 function snapshot(now=0){return Array.from(states.keys()).map(id=>view(id,now))}
 function remove(id){states.delete(id)}
 return{at,reset,alive,tick,hit,view,snapshot,remove,maxHp,respawnMs,graceMs};
}
/** World-space ray hit on a tracked remote player's head or upper torso. */
export function playerRayHit(from,direction,head){
 if(!from||!direction||!head)return null;
 const dirLength=Math.hypot(direction.x,direction.y,direction.z);
 if(dirLength<.7)return null;
 const dx=direction.x/dirLength,dy=direction.y/dirLength,dz=direction.z/dirLength;
 const candidates=[
   {part:'head',x:head.x,y:head.y-.13,z:head.z,radius:.25,damage:45},
   {part:'body',x:head.x,y:head.y-.68,z:head.z,radius:.40,damage:25}
 ];
 let best=null;
 for(const c of candidates){
   const vx=c.x-from.x,vy=c.y-from.y,vz=c.z-from.z;
   const along=vx*dx+vy*dy+vz*dz;
   if(along<.15||along>12)continue;
   const perpendicular=Math.hypot(vx-dx*along,vy-dy*along,vz-dz*along);
   if(perpendicular>c.radius)continue;
   const entry=along-Math.sqrt(Math.max(0,c.radius*c.radius-perpendicular*perpendicular));
   if(!best||entry<best.distance)best={
     distance:entry,point:{x:from.x+dx*entry,y:from.y+dy*entry,z:from.z+dz*entry},
     part:c.part,headshot:c.part==='head',damage:c.damage};
 }
 return best;
}
