'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),G=require('../../Modo-caos/rodeados-core.js');
const fireAt=(y,z=-3.2)=>({origin:{x:0,y,z:0},direction:{x:0,y:0,z:-1}});
function setup(){
 const g=G.create({seed:103,mode:'survival'});G.begin(g);g.spawnClock=900;
 const e=G.spawn(g,'spider');assert(e);
 e.x=0;e.z=-3.2;e.angle=0;e.portal=0;e.stun=0;e.state='advance';
 return {g,e};
}
test('wolf spider has own eight-legged low profile, fast but outside camera safety ring',()=>{
 const {g,e}=setup(),d=G.TYPES.spider;
 assert.equal(e.height,.90);assert(d.radius>=.40&&d.speed>.7);assert(d.range>2.45&&d.range<2.75);
 assert.equal(G.rayHit(g,fireAt(.68).origin,fireAt(.68).direction)?.type,'spider');
 assert.equal(G.rayHit(g,fireAt(.68).origin,fireAt(.68).direction)?.part,'head');
 assert.equal(G.rayHit(g,fireAt(1.52).origin,fireAt(1.52).direction),null,'a human-height headshot must miss the low spider');
 const before=Math.hypot(e.x-g.player.x,e.z-g.player.z);
 for(let i=0;i<38;i++)G.advance(g,.05);
 const after=Math.hypot(e.x-g.player.x,e.z-g.player.z);
 assert(before-after>.1,'spider must approach');
 assert(after>=2.45-.01,'AR safe distance still applies to creatures');
});
test('wolf spider gets headshot points, EMP stun, and area-bomb damage',()=>{
 const {g,e}=setup();let r=G.fire(g,fireAt(.68));
 assert(r.ok&&r.hit&&r.part==='head'&&r.points>=165);
 assert(e.hp<3);
 assert.equal(G.pulse(g),true);
 assert(e.stun>=2,'EMP should affect eight-legged enemy');
 // New encounter for grenade so it actually survives initially.
 const another=G.spawn(g,'spider');assert(another);
 another.x=.15;another.z=-3.1;another.portal=0;
 const bomb=G.throwBomb(g,{x:0,z:-3.2});assert(bomb.ok);
 for(let i=0;i<10;i++)G.advance(g,.06);
 assert(g.bombHits>=1);
 assert(g.floorDamage.some(v=>v>0),'spider explosion leaves scorch on war deck');
});
test('first spider appears predictably around twelve seconds without crowding player',()=>{
 const g=G.create({seed:13,mode:'survival'});G.begin(g);g.spawnClock=999;
 for(let i=0;i<238;i++)G.advance(g,.05);
 assert.equal(g.spiderIntroduced,false);
 for(let i=0;i<10;i++)G.advance(g,.05);
 assert(g.spiderIntroduced);
 assert(g.enemies.some(e=>e.type==='spider'));
 for(const e of g.enemies)assert(Math.hypot(e.x-g.player.x,e.z-g.player.z)>=2.45-.01);
 const fresh=G.reset(g);
 assert.equal(fresh.spiderIntroduced,false,'rematch begins with fresh encounter clock');
});
