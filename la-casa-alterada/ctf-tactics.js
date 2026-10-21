/** BLACKZONE V27 deterministic squad roles and dispersed safe spawns. */
export const SQUAD_ROLES=['sentinel','runner','flanker','support','scout','assault'];
export function squadRole(index){return SQUAD_ROLES[((index%SQUAD_ROLES.length)+SQUAD_ROLES.length)%SQUAD_ROLES.length]}
export function squadSpawn(base,enemy,index,team='blue'){
 const dx=enemy.x-base.x,dz=enemy.z-base.z,length=Math.hypot(dx,dz)||1;
 const fx=dx/length,fz=dz/length,rx=-fz,rz=fx;
 const slot=index%6,rank=Math.floor(index/6);
 // Sideways separation, alternating ranks and staggered team directions.
 const spread=[-1.05,1.08,-1.75,1.75,-.35,.4][slot];
 const depth=[-.64,-.95,.42,.60,-1.26,.32][slot]+rank*.54;
 return{x:base.x+fx*depth+rx*spread,y:base.y,z:base.z+fz*depth+rz*spread};
}
export function squadFlank(base,enemy,index,progress=.58){
 const dx=enemy.x-base.x,dz=enemy.z-base.z,length=Math.hypot(dx,dz)||1;
 const fx=dx/length,fz=dz/length,rx=-fz,rz=fx;
 const role=squadRole(index),side=index%2===0?-1:1;
 const offset=role==='flanker'?1.45:role==='scout'?.82:role==='support'?.65:.4;
 return{x:base.x+dx*progress+rx*side*offset,y:base.y,z:base.z+dz*progress+rz*side*offset};
}
export function squadSpeed(role,difficulty='normal',underFire=false){
 const baseline={facil:.66,normal:1.08,dificil:1.32}[difficulty]||1.08;
 const pace=role==='scout'?1.25:role==='runner'?1.17:role==='sentinel'?.74:
  role==='support'?.88:role==='flanker'?1.09:1;
 return baseline*pace*(underFire?.84:1);
}
export function squadStance(role,coverState,threatDistance,speed){
 // Run between objectives, crouch in cover, take standing peek shots.
 if(coverState==='hold'||coverState==='retreat'||coverState==='approach'&&speed<.18)
   return 'crouch';
 if(coverState==='fire')return 'aim';
 if(speed>.92&&threatDistance>2)return 'sprint';
 if(threatDistance<2.2&&role==='sentinel')return 'crouch';
 return speed>.12?'advance':'idle';
}
