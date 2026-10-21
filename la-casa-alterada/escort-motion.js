/** Escort movement decisions in calibrated LOCAL floor coordinates. */
export function escortMotion(current,operator){
 if(!current||!operator)return{target:null,speed:0,status:'waiting'};
 const dx=operator.x-current.x,dz=operator.z-current.z;
 const dist=Math.hypot(dx,dz);
 const entryDist=Math.hypot(current.x,current.z);
 const operatorDist=Math.hypot(operator.x,operator.z);
 if(entryDist>.74&&dist<2.35&&operatorDist<=entryDist+.45){
   return{target:{x:0,z:0},speed:.72,status:'extracting'};
 }
 if(dist>1.02){
   const scale=Math.max(0,dist-.70)/Math.max(.0001,dist);
   return{target:{x:current.x+dx*scale,z:current.z+dz*scale},
      speed:dist>2.2?1.55:1.20,status:'catching-up'};
 }
 return{target:null,speed:0,status:'waiting'};
}