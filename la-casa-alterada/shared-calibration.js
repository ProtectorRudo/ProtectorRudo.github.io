/**
 * Two-point, gravity-aligned registration for co-located WebXR players.
 * Original lightweight implementation; no external package required.
 *
 * A = common entrance marker on floor. B = second common physical marker.
 * Every phone uses world-A as its local origin and rotates so B is local -Z.
 * Never scale metres to hide bad tracking; report mismatches instead.
 */
export function calculateSharedFrame(THREE,a,b){
 if(!a||!b||![a.x,a.y,a.z,b.x,b.y,b.z].every(Number.isFinite))return null;
 const dx=b.x-a.x,dz=b.z-a.z;
 const distance=Math.hypot(dx,dz),heightDifference=Math.abs(b.y-a.y);
 if(distance<.85||distance>7||heightDifference>.6)return null;
 const yaw=Math.atan2(-dx,-dz);
 return {position:new THREE.Vector3(a.x,a.y,a.z),rotation:new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw),yaw,distance};
}
export function checkSharedDistance(localDistance,hostDistance){
 if(!Number.isFinite(localDistance)||localDistance<.85||localDistance>7)return {status:'invalid',difference:null};
 if(!Number.isFinite(hostDistance)||hostDistance<.85||hostDistance>7)return {status:'waiting',difference:null};
 const difference=Math.abs(localDistance-hostDistance);
 const tolerance=Math.max(.35,hostDistance*.16);
 return {status:difference<=tolerance?'aligned':'mismatch',difference,tolerance};
}
