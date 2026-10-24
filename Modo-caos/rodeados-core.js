'use strict';
/* RODEADOS 360 — gameplay core, independent of WebXR and rendering.
   All positions are expressed in meters in the fixed arena-local reference frame.
   A host can validate shot rays in the same coordinates; browser-host authority
   is not equivalent to a trusted server or anti-cheat. */
(function(root){
 const TAU=Math.PI*2, PI=Math.PI;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const TYPES={
  basic:{hp:2,speed:.31,range:2.70,damage:5,value:100,radius:.31,height:1.75},
  flanker:{hp:2,speed:.49,range:2.72,damage:5,value:170,radius:.29,height:1.70},
  tank:{hp:6,speed:.21,range:2.80,damage:9,value:350,radius:.45,height:2.0},
  fast:{hp:1,speed:.70,range:2.67,damage:5,value:190,radius:.26,height:1.60},
  joker:{hp:3,speed:.43,range:2.72,damage:4,value:320,radius:.30,height:1.75},
  boss:{hp:22,speed:.22,range:2.90,damage:12,value:1600,radius:.56,height:2.20}
 };
 const MODES={
  survival:{duration:90,label:'SUPERVIVENCIA 360'},
  infinite:{duration:Infinity,label:'CAOS INFINITO'},
  reflex:{duration:60,label:'REFLEJOS EXTREMOS'},
  joker:{duration:75,label:'EL BURLÓN'},
  boss:{duration:90,label:'JEFE FINAL'}
 };
 function prng(seed){
  let n=(seed>>>0)||0x9e3779b9;
  n=Math.imul(n^(n>>>16),0x85ebca6b)>>>0;
  n=Math.imul(n^(n>>>13),0xc2b2ae35)>>>0;
  n=(n^(n>>>16))>>>0;
  return ()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296};
 }
 function create(config={}){
  const mode=MODES[config.mode]?config.mode:'survival';
  const seed=(config.seed??Date.now())>>>0;
  const g={seed,mode,phase:'ready',elapsed:0,wave:0,lives:100,score:0,shots:0,hits:0,kills:0,combo:0,bestCombo:0,ammo:28,mag:28,reload:0,infiniteAmmo:true,skill:1,skillCooldown:0,bombCharges:1,bombCooldown:0,bombKillsAt:0,bombsUsed:0,bombHits:0,bombs:[],spawnClock:0,enemyId:0,
   enemies:[],fx:[],scores:{},peerWeapons:Object.create(null),ownerId:config.ownerId||null,player:{x:0,z:0},arena:clamp(config.arena||2.6,1.8,4),
   duration:MODES[mode].duration,paused:false,finishedReason:'',announcedBoss:false,lastDamage:0};
  Object.defineProperty(g,'rand',{value:prng(seed),enumerable:false});
  return g;
 }
 function reset(g,config={}){
  return create({...config,mode:config.mode||g.mode,arena:config.arena||g.arena,ownerId:config.ownerId??g.ownerId});
 }
 function begin(g){if(g.phase==='ready'){g.phase='playing';g.spawnClock=.5;}return g}
 function copy(g){
  return {seed:g.seed,mode:g.mode,phase:g.phase,paused:g.paused,elapsed:g.elapsed,wave:g.wave,lives:g.lives,score:g.score,shots:g.shots,hits:g.hits,kills:g.kills,combo:g.combo,bestCombo:g.bestCombo,ammo:g.ammo,mag:g.mag,reload:g.reload,infiniteAmmo:true,skill:g.skill,skillCooldown:g.skillCooldown,bombCharges:g.bombCharges,bombCooldown:g.bombCooldown,bombKillsAt:g.bombKillsAt,bombsUsed:g.bombsUsed,bombHits:g.bombHits,bombs:g.bombs.map(b=>({...b})),player:{...g.player},arena:g.arena,duration:Number.isFinite(g.duration)?g.duration:null,scores:{...g.scores},peerWeapons:{...g.peerWeapons},enemies:g.enemies.map(e=>({...e})),fx:g.fx.slice(-12),finishedReason:g.finishedReason};
 }
 function pickKind(g){
  if(g.mode==='joker')return g.rand()<.68?'joker':g.rand()<.55?'fast':'flanker';
  if(g.mode==='boss'&&g.elapsed>3&&!g.announcedBoss)return 'boss';
  if(g.mode==='reflex')return g.rand()<.68?'fast':'flanker';
  if(g.wave<2)return 'basic';
  const choices=['basic','basic','flanker','fast','tank','joker'];return choices[Math.floor(g.rand()*Math.min(choices.length,2+Math.floor(g.wave/2)))];
 }
 // The calibrated 5×5 board marks the human SAFE ZONE; full-scale robots
 // roam a separate virtual ring. Do not crowd the phone on a 2.6m floor.
 const SAFE_DISTANCE=2.45;
 function positionSpawn(g,radius){
  const base=Math.floor(g.rand()*8)*PI/4;
  const player=g.player,extent=Math.max(5.5,g.arena*.5+3.9);
  for(let k=0;k<28;k++){
   const a=(base+((k%8)*PI/4)+g.rand()*.22)%TAU;
   const r=2.95+g.rand()*1.20;
   const x=player.x+Math.sin(a)*r,z=player.z+Math.cos(a)*r;
   if(Math.abs(x)>extent||Math.abs(z)>extent)continue;
   if(g.enemies.some(e=>e.hp>0&&Math.hypot(x-e.x,z-e.z)<e.radius+.78))continue;
   return {x,z,a,sector:Math.floor((a+PI/8)/(PI/4))%8};
  }
  return null;
 }
 function spawn(g,type){
  const def=TYPES[type]||TYPES.basic,p=positionSpawn(g,g.arena*.65);
  if(!p)return null;
  const e={id:++g.enemyId,type,x:p.x,z:p.z,y:0,angle:Math.atan2(g.player.x-p.x,g.player.z-p.z),sector:p.sector,
   hp:def.hp,maxHp:def.hp,radius:def.radius,height:def.height,state:'enter',age:0,stun:0,attackCD:1+g.rand(),strafe:g.rand()<.5?-1:1,
   phase:g.rand()*TAU,taunt:0,lastHit:0,portal:.72};
  g.enemies.push(e);if(type==='boss')g.announcedBoss=true;return e;
 }
 function movePlayer(g,p){
  if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.z))return false;
  const bound=g.arena/2-.08;
  g.player.x=clamp(p.x,-bound,bound);g.player.z=clamp(p.z,-bound,bound);return true;
 }
 function advance(g,dt){
  if(g.phase!=='playing'||g.paused)return g;
  dt=clamp(Number(dt)||0,0,.07);if(dt<=0)return g;
  const prev=g.elapsed;g.elapsed+=dt;g.wave=1+Math.floor(g.elapsed/15);
  if(g.mode==='boss'&&g.elapsed>=2&&!g.announcedBoss)spawn(g,'boss');
  const cap=g.mode==='boss'?7:clamp(2+Math.floor(g.elapsed/18),2,8);
  g.spawnClock-=dt;
  if(g.spawnClock<=0&&g.enemies.length<cap){
   const kind=pickKind(g);const e=spawn(g,kind);
   g.spawnClock=clamp(2.7-g.elapsed*.019,.65,2.7)*(g.mode==='reflex'?.64:1);
   if(!e)g.spawnClock=.5;
  }
  // Infinite energy weapon: no bullet consumption or timed reloading in any mode.
  g.skillCooldown=Math.max(0,g.skillCooldown-dt);
  if(g.bombCharges===0){
   g.bombCooldown=Math.max(0,g.bombCooldown-dt);
   if(g.bombCooldown<=0||g.kills-g.bombKillsAt>=10){g.bombCharges=1;g.bombCooldown=0;}
  }
  for(let i=g.bombs.length-1;i>=0;i--){
   const b=g.bombs[i];b.fuse-=dt;
   if(b.fuse<=0){g.bombs.splice(i,1);detonateBomb(g,b);}
  }
  const P=g.player,half=Math.max(5.5,g.arena*.5+3.9);
  for(const e of g.enemies){
   e.age+=dt;e.lastHit=Math.max(0,e.lastHit-dt);e.stun=Math.max(0,e.stun-dt);
   const d=Math.hypot(P.x-e.x,P.z-e.z),nx=d>0.01?(P.x-e.x)/d:0,nz=d>.01?(P.z-e.z)/d:0;
   e.angle=Math.atan2(nx,nz);
   if(e.portal>0){e.portal=Math.max(0,e.portal-dt);e.state='enter';continue}
   if(e.stun){e.state='stunned';continue}
   const def=TYPES[e.type];
   if(e.type==='joker'&&e.age>1.5&&Math.sin(e.age*1.5+e.phase)>.7){e.state='taunt';e.taunt+=dt;}
   else if(d<def.range){e.state='attack';e.attackCD-=dt;
    if(e.attackCD<=0){e.attackCD=clamp(2.2-g.elapsed*.008,1.0,2.2);
     g.lives=Math.max(0,g.lives-def.damage);g.lastDamage=g.elapsed;g.combo=0;g.fx.push({type:'damage',id:e.id,t:g.elapsed});
    }
   }else{
    e.state=e.type==='flanker'?'flank':e.type==='fast'?'dash':e.type==='joker'?'dodge':'advance';
    const sign=e.strafe,zig=(e.type==='flanker'||e.type==='joker'||e.type==='fast')?Math.sin(e.age*(e.type==='fast'?7:3.5)+e.phase)*.68:0;
    const speed=def.speed*(1+Math.min(.42,g.elapsed/200));
    let vx=nx+zig*nz, vz=nz-zig*nx;
    if(e.type==='flanker'){vx=nx*.48+sign*nz*.9;vz=nz*.48-sign*nx*.9}
    const L=Math.hypot(vx,vz)||1;e.x+=vx/L*speed*dt;e.z+=vz/L*speed*dt;
   }
   // Always protect the XR eye with 2.45m of clear playable distance.
   const eyeDx=e.x-P.x,eyeDz=e.z-P.z,eyeDist=Math.hypot(eyeDx,eyeDz);
   if(eyeDist<SAFE_DISTANCE){
    const k=SAFE_DISTANCE/Math.max(.001,eyeDist);
    e.x=P.x+eyeDx*k;e.z=P.z+eyeDz*k;
   }
   e.x=clamp(e.x,-half,half);e.z=clamp(e.z,-half,half);
  }
  // Collision separation prevents humanoids intersecting, without shifting their floor height.
  for(let i=0;i<g.enemies.length;i++)for(let j=i+1;j<g.enemies.length;j++){
   const a=g.enemies[i],b=g.enemies[j];if(a.portal||b.portal)continue;
   const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz),min=a.radius+b.radius+.07;
   if(d<min){const nx=d<1e-5?1:dx/d,nz=d<1e-5?0:dz/d,p=(min-d)*.5;
    a.x=clamp(a.x-nx*p,-half,half);a.z=clamp(a.z-nz*p,-half,half);
    b.x=clamp(b.x+nx*p,-half,half);b.z=clamp(b.z+nz*p,-half,half);
   }
  }
  g.fx=g.fx.filter(f=>g.elapsed-f.t<1.1);
  if(g.lives<=0)finish(g,'sin_vida');
  if(g.elapsed>=g.duration)finish(g,'tiempo');
  return g;
 }
 function finish(g,reason){if(g.phase==='playing'){g.phase='finished';g.finishedReason=reason||'tiempo';}return g}
 function weaponOf(g,shooter){
  if(!g.ownerId||!shooter||shooter===g.ownerId)return null;
  const key=String(shooter);
  return g.peerWeapons[key]||(g.peerWeapons[key]={ammo:g.mag,reload:0,lastFire:-100});
 }
 function reload(g,shooter='vos'){
  // Legacy API kept so old clients cannot accidentally reintroduce an ammo pause.
  return false;
 }
 // Accurate oriented humanoid hitboxes aligned with actual 3D robot dimensions.
 // Slab ray/box intersection in robot-local meters, padded 6cm for phone jitter.
 function boxRay(ox,oy,oz,dx,dy,dz,box,maxDistance){
  let tmin=.05,tmax=maxDistance;
  for(const [o,d,low,high] of [[ox,dx,box[0],box[1]],[oy,dy,box[2],box[3]],[oz,dz,box[4],box[5]]]){
   if(Math.abs(d)<1e-8){if(o<low||o>high)return null;continue}
   let a=(low-o)/d,b=(high-o)/d;
   if(a>b)[a,b]=[b,a];
   tmin=Math.max(tmin,a);tmax=Math.min(tmax,b);
   if(tmax<tmin)return null;
  }
  return tmin;
 }
 function rayHit(g,origin,direction,maxDistance=14){
  if(!origin||!direction)return null;
  const vals=[origin.x,origin.y,origin.z,direction.x,direction.y,direction.z];
  const L=Math.hypot(direction.x,direction.y,direction.z);
  if(!vals.every(Number.isFinite)||L<.5)return null;
  const dx=direction.x/L,dy=direction.y/L,dz=direction.z/L;
  let hit=null;
  for(const e of g.enemies){
   if(e.hp<=0||e.portal>.05)continue;
   const sn=Math.sin(e.angle),cs=Math.cos(e.angle);
   const rx=origin.x-e.x,rz=origin.z-e.z;
   const ox=cs*rx-sn*rz,oy=origin.y,oz=sn*rx+cs*rz;
   const lx=cs*dx-sn*dz,lz=sn*dx+cs*dz;
   const scale=e.height/1.75,pad=e.type==='tank'||e.type==='boss'?.09:.06;
   const boxes=[
    ['head',[-.22-pad,.22+pad,1.43*scale,1.82*scale,-.24,.30]],
    ['body',[-.42-pad,.42+pad,.78*scale,1.48*scale,-.32,.35]],
    ['legs',[-.35-pad,.35+pad,.05*scale,.84*scale,-.27,.32]]
   ];
   for(const [part,box] of boxes){
    const t=boxRay(ox,oy,oz,lx,dy,lz,box,maxDistance);
    if(t===null)continue;
    if(!hit||t<hit.distance-.008||Math.abs(t-hit.distance)<.008&&part==='head')
     hit={id:e.id,type:e.type,part,distance:t};
   }
  }
  return hit;
 }
 function fire(g,ray,shooter='vos'){
  const w=weaponOf(g,shooter);
  if(g.phase!=='playing'||g.paused)return {ok:false,reason:'bloqueado'};
  // Keep host-enforced 160ms cadence against network burst cheats. Never run
  // out of bullets, even if reconnecting from an old room with 0 ammo.
  if(w&&g.elapsed-w.lastFire<.16)return {ok:false,reason:'cadencia'};
  if(w)w.lastFire=g.elapsed;
  g.shots++;
  let h=rayHit(g,ray.origin,ray.direction);
  if(!h){g.combo=0;g.fx.push({type:'miss',t:g.elapsed});return {ok:true,hit:false};}
  const e=g.enemies.find(x=>x.id===h.id);if(!e)return {ok:true,hit:false};
  const weak=e.type==='tank'||e.type==='boss';
  const damage=(h.part==='head'?2:1)+(weak&&h.part==='head'?1:0);
  e.hp=Math.max(0,e.hp-damage);e.stun=Math.max(e.stun,.20);
  e.lastHit=.30;g.hits++;g.combo++;g.bestCombo=Math.max(g.bestCombo,g.combo);
  const gained=25+(h.part==='head'?70:25)+(e.hp===0?TYPES[e.type].value:0);
  const pts=Math.round(gained*(1+Math.min(3,g.combo/9))*(g.mode==='reflex'?1.2:1));
  g.score+=pts;g.scores[String(shooter||'vos')]=(g.scores[String(shooter||'vos')]||0)+pts;
  g.fx.push({type:'hit',id:e.id,x:e.x,y:e.height*.75,z:e.z,t:g.elapsed,head:h.part==='head'});
  if(!e.hp){g.kills++;g.fx.push({type:'destroy',id:e.id,x:e.x,y:1,z:e.z,t:g.elapsed});g.enemies=g.enemies.filter(x=>x.id!==e.id)}
  return {ok:true,hit:true,enemy:h.id,part:h.part,damage,points:pts,killed:e.hp===0};
 }
 // Bomb Caos is a short-fuse AREA ability, not a firearm.
 // Shared 1 charge, refreshed every 32s OR after 10 fresh robot kills.
 const BOMB_RADIUS=2.5;
 function throwBomb(g,target,shooter='vos'){
  if(g.phase!=='playing'||g.paused)return {ok:false,reason:'bloqueado'};
  if(g.bombCharges<=0)return {ok:false,reason:'recargando'};
  if(!target||!Number.isFinite(target.x)||!Number.isFinite(target.z))return {ok:false,reason:'destino_invalido'};
  if(Math.abs(target.x)>9||Math.abs(target.z)>9||Math.hypot(target.x-g.player.x,target.z-g.player.z)>6.5)
   return {ok:false,reason:'fuera_de_alcance'};
  g.bombCharges=0;g.bombCooldown=32;g.bombKillsAt=g.kills;g.bombsUsed++;
  const bomb={x:target.x,z:target.z,fromX:g.player.x,fromZ:g.player.z,fuse:.48,owner:String(shooter||'vos'),radius:BOMB_RADIUS};
  g.bombs.push(bomb);
  g.fx.push({type:'bombThrow',x:bomb.x,z:bomb.z,t:g.elapsed});
  return {ok:true,target:{x:bomb.x,z:bomb.z},radius:BOMB_RADIUS,fuse:bomb.fuse};
 }
 function detonateBomb(g,bomb){
  const r=BOMB_RADIUS;
  let hits=0,kills=0,points=0;
  for(const e of g.enemies){
   if(e.hp<=0||e.portal>.6)continue;
   const dist=Math.hypot(e.x-bomb.x,e.z-bomb.z);
   if(dist>r+e.radius)continue;
   const tough=e.type==='tank'||e.type==='boss';
   const damage=tough?2:3;
   const oldHp=e.hp;
   e.hp=Math.max(0,e.hp-damage);
   e.lastHit=.55;e.stun=Math.max(e.stun,2.6);hits++;
   const dead=e.hp===0;
   if(dead){kills++;g.kills++;}
   const earned=30+(dead?TYPES[e.type].value:0);
   points+=earned;g.score+=earned;
   const owner=String(bomb.owner||'vos');
   g.scores[owner]=(g.scores[owner]||0)+earned;
   g.fx.push({type:dead?'destroy':'hit',id:e.id,x:e.x,y:e.height*.68,z:e.z,t:g.elapsed,head:false});
  }
  g.bombHits+=hits;
  g.enemies=g.enemies.filter(e=>e.hp>0);
  g.fx.push({type:'bombBlast',x:bomb.x,y:.12,z:bomb.z,radius:r,hits,kills,points,t:g.elapsed});
  // Kills by THIS bomb do not immediately regenerate another bomb.
  g.bombKillsAt=g.kills;
 }
 function pulse(g){
  if(g.phase!=='playing'||g.paused||g.skillCooldown>0)return false;
  g.skillCooldown=24;
  for(const e of g.enemies){e.stun=Math.max(e.stun,2.4);e.hp=Math.max(1,e.hp-1);}
  g.fx.push({type:'pulse',t:g.elapsed});return true;
 }
 const api={TYPES,MODES,create,reset,begin,advance,spawn,movePlayer,copy,rayHit,fire,reload,pulse,throwBomb,finish,BOMB_RADIUS};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.RodeadosCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
