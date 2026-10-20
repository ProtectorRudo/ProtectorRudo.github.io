/**
 * Spring recoil adaptation from Delight Chukwu's open-source
 * COD procedural FPS (src/weapons/mathx.js).
 * Source: https://github.com/delightc123/COD
 * License: MIT, Copyright (c) 2026 Delight Chukwu.
 * Full license retained in THIRD_PARTY_NOTICES.md.
 */
const TAU = Math.PI*2;
export class Spring {
  constructor(f=12,z=1,value=0) { this.f=f;this.z=z;this.x=value;this.v=0;this.target=value; }
  kick(dv) {this.v+=dv;return this;}
  step(dt,target=this.target){
    this.target=target;
    const w=TAU*this.f;
    const denominator=1+2*this.z*w*dt+w*w*dt*dt;
    this.v=(this.v+w*w*dt*(target-this.x))/denominator;
    this.x+=this.v*dt;
    return this.x;
  }
  reset(){this.x=0;this.v=0;this.target=0;}
}