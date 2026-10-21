import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const {beginEscort,updateEscort}=await import('data:text/javascript;base64,'+
 Buffer.from(read('escort-rules.js')).toString('base64'));

test('small-room escort is achievable naturally without walking farther from exit',()=>{
 const tracker=beginEscort({x:1.45,z:0},1000);
 assert.ok(tracker.requiredDistance<1.2);
 assert.ok(tracker.requiredDistance>.45);
 let finished=false;
 for(let i=1;i<=24;i++){
  const pos={x:1.45-.028*i,z:0};
  const out=updateEscort(tracker,pos,pos,1000+i*250);
  if(i<=4)assert.equal(out.complete,false,'not an instant one-touch win');
  finished ||=out.complete;
 }
 assert.equal(finished,true,'slow safe walk back reaches extraction');
});
test('user cannot complete extraction by only tapping, waiting or teleporting',()=>{
 const state=beginEscort({x:.6,z:0},1200);
 assert.equal(updateEscort(state,{x:.6,z:0},{x:.6,z:0},10000).complete,false);
 const far=beginEscort({x:3.5,z:0},1200);
 assert.equal(updateEscort(far,{x:.8,z:0},{x:.8,z:0},10000).complete,false);
 assert.equal(far.travelled,0,'XR pose jump never counts as footsteps');
});
test('coaching directs the player back to the hostage when it is far behind',()=>{
 const s=read('missions.js');
 assert.match(s,/label:o\.phase===-2\?'REHÉN':separated\?'REHÉN ATRÁS':'EXTRACCIÓN'/);
 assert.match(s,/LA REHÉN QUEDÓ ATRÁS/);
 assert.match(s,/RECORRIDO '\+o\.escortState\.travelled\.toFixed\(1\)/);
 assert.match(s,/UBICÁ AL REHÉN A 1,4 M O MÁS/);
});
test('entry extraction ring exists only during active escort and is disposed',()=>{
 const s=read('missions.js');
 assert.match(s,/BLACKZONE_EXTRACT_ZONE/);
 assert.match(s,/o\.extractionRing\.visible=o\.running&&o\.phase===-1/);
 assert.match(s,/o\.extractionRing\.geometry\.dispose\(\)/);
 assert.match(s,/o\.extractionRing\.material\.dispose\(\)/);
});
test('V31 browser source files compile',()=>{
 for(const file of ['missions.js','escort-rules.js']){
  const p=spawnSync(process.execPath,['--check','--input-type=module'],
    {input:read(file),encoding:'utf8'});
  assert.equal(p.status,0,file+': '+p.stderr);
 }
});
