'use strict';
/* RODEADOS 360 — predictable 360-degree spatial radar and UI events.
   Pure JS so angular directions and reduced-motion behavior can be tested in CI. */
(function(root){
 const PI=Math.PI,TAU=PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 function normalize(a){if(!Number.isFinite(a))return 0;return ((a+PI)%TAU+TAU)%TAU-PI;}
 // Opponent bearing relative to phone-forward: 0 front, +pi/2 right, pi behind.
 function bearing(forwardX,forwardZ,targetX,targetZ){
  const length=Math.hypot(forwardX,forwardZ),target=Math.hypot(targetX,targetZ);
  if(length<1e-8||target<1e-8)return 0;
  const fx=forwardX/length,fz=forwardZ/length,tx=targetX/target,tz=targetZ;
  const cross=fx*tz-fz*tx;
  return normalize(Math.atan2(cross,fx*tx+fz*tz));
 }
 function radar(enemies,player,angle,range=4){
  const px=player?.x||0,pz=player?.z||0;
  return (enemies||[]).filter(e=>e&&e.hp>0&&e.portal<=.4).map(e=>{
   const dx=e.x-px,dz=e.z-pz,dist=Math.hypot(dx,dz),direction=normalize(Math.atan2(dx,-dz)-angle);
   return {id:e.id,type:e.type,distance:dist,angle:direction,
    x:Math.sin(direction)*clamp(dist/range,0,1),
    y:-Math.cos(direction)*clamp(dist/range,0,1),
    dangerous:dist<1.15,near:dist<1.9};
  }).sort((a,b)=>a.distance-b.distance);
 }
 function statePulse(game,prev,stage){
  if(!game||stage!=='playing')return {wave:false,damaged:false,combo:false,finished:false};
  return {
   wave:!!prev&&game.wave>prev.wave,
   damaged:!!prev&&game.lives<prev.lives,
   combo:!!prev&&game.combo>prev.combo&&game.combo>0&&game.combo%5===0,
   finished:game.phase==='finished'
  };
 }
 function shouldShowDanger(enemies){return enemies?.some(e=>e.dangerous)??false;}
 const api={normalize,bearing,radar,statePulse,shouldShowDanger};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.RodeadosUX=api;
})(typeof globalThis!=='undefined'?globalThis:this);
