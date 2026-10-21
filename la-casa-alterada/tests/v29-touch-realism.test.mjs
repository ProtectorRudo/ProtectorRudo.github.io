import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const html=read('index.html'),css=read('style.css'),main=read('main.js');
const mission=read('missions.js'),humans=read('animated-humans.js');

function actionHarness(){
 const s=mission.indexOf("  let lastMissionTapAt=-10000;");
 const e=mission.indexOf("  teamUpdate();ui();",s);
 assert.ok(s>0&&e>s,'mobile rescue input code exists');
 const handlers=new Map(),receipts=[];
 const interact={addEventListener(name,callback,options){
  handlers.set(name,{callback,options});
 }};
 const api={toast:msg=>receipts.push(msg)};
 const o={phase:-2};let count=0,now=1000;
 const setup=new Function('interact','performance','api','o','isCapture','pickupFlag',
  'beginRescueTap',mission.slice(s,e));
 setup(interact,{now:()=>now},api,o,()=>false,()=>false,()=>{
  count++;o.phase=-1;return true;
 });
 return{handlers,receipts,get count(){return count},setNow:n=>now=n};
}
test('AR button is a dedicated HUD control outside overloaded skill bar',()=>{
 assert.match(html,/<button id="interact"[^>]*type="button"/);
 assert.doesNotMatch(html,/<div id="missionActions"><button id="interact"/);
 assert.match(html,/<button id="interact"[\s\S]{0,175}<div id="missionActions">/);
 assert.match(css,/#hud>#interact\{[^}]*z-index:28/);
 assert.match(css,/#hud>#interact\{[^}]*pointer-events:auto!important/);
 assert.match(css,/#hud>#interact\{[^}]*touch-action:none!important/);
});
test('physical pointerdown triggers exactly one rescue even if click follows',()=>{
 const h=actionHarness();
 const pointer=h.handlers.get('pointerdown'),click=h.handlers.get('click');
 assert.ok(pointer.options.capture);
 assert.equal(pointer.options.passive,false);
 let prevented=0,stopped=0;
 const evt={type:'pointerdown',pointerType:'touch',button:0,cancelable:true,
  preventDefault(){prevented++},stopPropagation(){stopped++}};
 pointer.callback(evt);
 click.callback({...evt,type:'click'});
 assert.equal(h.count,1);
 assert.ok(prevented>0&&stopped>0);
 assert.ok(h.receipts.some(v=>v.includes('TOQUE DETECTADO')));
 assert.ok(h.receipts.some(v=>v.includes('REHÉN LIBERADO')));
});
test('tap fallback works on mobile WebXR without pointer events',()=>{
 const h=actionHarness(),touch=h.handlers.get('touchstart');
 assert.equal(touch.options.passive,false);
 touch.callback({type:'touchstart',cancelable:true,preventDefault(){},stopPropagation(){}});
 assert.equal(h.count,1);
});
test('studio human fighters have the SAME realism pipeline as hostage Maya',()=>{
 assert.match(humans,/raiderA:CDN\+'npc-jordan-locomotion\.glb'/);
 assert.match(humans,/raiderB:CDN\+'npc-sam-locomotion\.glb'/);
 assert.match(humans,/raiderC:CDN\+'npc-harper-locomotion\.glb'/);
 assert.match(humans,/hostage:CDN\+'npc-maya-locomotion\.glb'/);
 assert.doesNotMatch(humans,/ORIGINAL_BOTS\+/);
 assert.match(humans,/equipStudioHuman\(actor,key,rig\)/);
 assert.match(humans,/urlCache=new Map\(\)/);
 assert.match(humans,/actor\.flesh\.visible=false/);
});
test('V29 source retains one-tap state transition and previous AR world renderer',()=>{
 assert.match(mission,/o\.phase=-1;o\.hostageRescued=true;o\.escortPlayer=id/);
 assert.match(main,/arCompositor\.render\(world,renderer\.xr\.getCamera\(camera\)\)/);
 assert.doesNotMatch(mission,/LIBERANDO '\+progress/);
 for(const file of ['main.js','missions.js','animated-humans.js','ctf-tactics.js']){
  const result=spawnSync(process.execPath,['--check','--input-type=module'],
   {input:read(file),encoding:'utf8'});
  assert.equal(result.status,0,file+': '+result.stderr);
 }
});
