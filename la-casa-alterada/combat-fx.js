/**
 * Original lightweight mobile FPS combat effects.
 * Procedural transient gunfire, spatialized enemy reports, supersonic whizz and dust.
 * All audio synthesized in WebAudio; no copyrighted samples or downloads.
 */
import * as THREE from 'three';
export function createCombatFX(scene,getCamera){
 let ctx=null,noise=null,lastWhiz=0;
 const live=[];
 const flashGeo=new THREE.ConeGeometry(.072,.27,6);
 const sparkGeo=new THREE.TetrahedronGeometry(.023,0);
 const forwardY=new THREE.Vector3(0,1,0);
 const sharedGeo=new THREE.TetrahedronGeometry(.035,0);
 const colors=[0xc3b39b,0xd5d1c9,0x9b8c77,0xcba482];
 function audio(){try{
   ctx??=new (window.AudioContext||window.webkitAudioContext)();
   if(ctx.state==='suspended')ctx.resume();
   if(!noise){const duration=.37,len=Math.round(ctx.sampleRate*duration),buffer=ctx.createBuffer(1,len,ctx.sampleRate),data=buffer.getChannelData(0);
     for(let i=0;i<len;i++){const t=i/len;data[i]=(Math.random()*2-1)*Math.exp(-8.4*t);}
     noise=buffer;
   }return ctx;
 }catch(e){return null}}
 function shot(source,isEnemy=false,gun='rifle'){
   const a=audio();if(!a)return;
   try{
    const when=a.currentTime;
    const vol=a.createGain();vol.gain.setValueAtTime(isEnemy?.0005:.001,when);vol.gain.exponentialRampToValueAtTime(isEnemy?.18:.23,when+.006);vol.gain.exponentialRampToValueAtTime(.001,when+(isEnemy?.24:.29));
    let output=vol;
    if(isEnemy&&source){
      const p=a.createPanner();p.panningModel='HRTF';p.distanceModel='inverse';p.refDistance=1.7;p.maxDistance=18;p.rolloffFactor=1.4;
      p.positionX.value=source.x;p.positionY.value=source.y;p.positionZ.value=source.z;
      const ear=new THREE.Vector3();getCamera().getWorldPosition(ear);
      if(a.listener.positionX){a.listener.positionX.value=ear.x;a.listener.positionY.value=ear.y;a.listener.positionZ.value=ear.z}
      vol.connect(p);output=p;
    }
    output.connect(a.destination);
    const punch=a.createBufferSource();punch.buffer=noise;const filter=a.createBiquadFilter();filter.type='lowpass';filter.frequency.value=gun==='rifle'?3600:2650;
    punch.connect(filter).connect(vol);punch.start(when);punch.stop(when+.32);
    const low=a.createOscillator(),g=a.createGain();low.type='triangle';low.frequency.setValueAtTime(gun==='rifle'?118:96,when);low.frequency.exponentialRampToValueAtTime(45,when+.12);g.gain.setValueAtTime(.12,when);g.gain.exponentialRampToValueAtTime(.001,when+.13);
    low.connect(g).connect(vol);low.start(when);low.stop(when+.14);
   }catch(e){}
 }
 function whizz(point){
  const now=performance.now();
  if(now-lastWhiz<600)return;lastWhiz=now;
  const a=audio();if(!a)return;
  const osc=a.createOscillator(),gain=a.createGain(),t=a.currentTime;
  osc.type='sawtooth';osc.frequency.setValueAtTime(1550,t);osc.frequency.exponentialRampToValueAtTime(320,t+.18);
  gain.gain.setValueAtTime(.0004,t);gain.gain.exponentialRampToValueAtTime(.027,t+.03);gain.gain.exponentialRampToValueAtTime(.001,t+.19);
  osc.connect(gain).connect(a.destination);osc.start(t);osc.stop(t+.2)
 }
 function dust(position,count=10){
  for(let i=0;i<count&&live.length<125;i++){
   const obj=new THREE.Mesh(sharedGeo,new THREE.MeshBasicMaterial({color:colors[Math.floor(Math.random()*colors.length)],transparent:true,opacity:.9,depthWrite:false}));
   obj.position.copy(position);scene.add(obj);
   live.push({obj,vel:new THREE.Vector3((Math.random()-.5)*1.35,Math.random()*.94,(Math.random()-.5)*1.35),left:.5+Math.random()*.43});
  }
 }
 // Minimal 3D bloom, no costly postprocessing on mobile.
 function muzzle(position,direction,isEnemy=true){
  if(!position||!direction||live.length>115)return;
  const axis=direction.clone().normalize();
  if(axis.lengthSq()<.5)return;
  const obj=new THREE.Mesh(flashGeo,new THREE.MeshBasicMaterial({
    color:isEnemy?0xffbb72:0xffe3a5,transparent:true,opacity:.96,
    blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  obj.quaternion.setFromUnitVectors(forwardY,axis);
  obj.position.copy(position).addScaledVector(axis,.105);
  scene.add(obj);
  live.push({obj,vel:new THREE.Vector3(),left:.105,ttl:.105});
 }
 // Surface collision sparks and debris with bounded lifetime and particle count.
 function impact(position,incoming,count=6){
  if(!position)return;
  dust(position,Math.min(7,count));
  if(live.length>110)return;
  const dir=incoming?.clone?.().normalize()||new THREE.Vector3(0,0,-1);
  for(let i=0;i<Math.min(5,Math.ceil(count/2))&&live.length<125;i++){
    const obj=new THREE.Mesh(sparkGeo,new THREE.MeshBasicMaterial({
      color:i%3===0?0xffe8b4:0xff9d54,transparent:true,opacity:.96,
      blending:THREE.AdditiveBlending,depthWrite:false}));
    obj.position.copy(position);
    const vel=new THREE.Vector3((Math.random()-.5)*2,.5+Math.random()*1.5,(Math.random()-.5)*2)
      .addScaledVector(dir,-.45);
    const ttl=.14+Math.random()*.22;
    scene.add(obj);live.push({obj,vel,left:ttl,ttl});
  }
 }
 function tick(dt){
  for(let i=live.length-1;i>=0;i--){
   const s=live[i];s.left-=dt;s.obj.position.addScaledVector(s.vel,dt);
   s.vel.y-=3.4*dt;s.obj.material.opacity=Math.min(1,s.ttl?s.left/s.ttl*.96:s.left*1.7);
   if(s.left<=0){scene.remove(s.obj);s.obj.material.dispose();live.splice(i,1)}
  }
 }
 return{shot,whizz,dust,impact,muzzle,tick,unlock:audio};
}
