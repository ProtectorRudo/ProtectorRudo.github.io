import assert from "node:assert/strict";
import {readFileSync, statSync} from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";

const game=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>readFileSync(path.join(game,p));
const manifest=JSON.parse(read("models/manifest.json").toString("utf8"));
const html=read("index.html").toString("utf8");
const entry="assets/index-theatre-grounded-20261015.js";
const script=read(entry).toString("utf8");

assert(html.includes(entry), "The published HTML does not use premium JS");
for(const needle of ["buildSeats()","buildPanels()","buildStage()","buildUsher()","buildPrivateBoxes()","buildEntranceDoors()","loadDecorManifest()"]) {
 assert(script.includes(needle),"Existing puzzle/scene engine missing: "+needle);
}
assert(script.includes("ensureBoxSpecter()"),"No guaranteed fallback specter: Palco 1 apparition could be empty");
assert(script.includes("getSpecterStatus()"),"Specter diagnostics missing");
assert(script.includes("Mesita apoyada en el suelo · fusible 1968"),"Fuse pedestal is not floor-mounted");
assert(script.includes("this.fuseCabinetFallback=h"),"Fuse table must remain separate from pickup");
assert(script.includes("this.loadDecorGLTF(n.assets.premiumNightstand,[-5.7,.36,-8.4],.72,0)"),"Missing premium replacement of fuse cabinet");
assert(script.includes("p:[-.36,.25,.28]")&&script.includes("p:[.36,.25,.28]"),"Audience seats require all four grounded legs");
assert(!script.includes("new Rt(.1,.012,37)"),"Floating floor strips should not be present");
assert(script.includes('["marbleBust",[7.8,1.06,-13.8]'),"Bust still floats above its side table");
assert(script.includes("this.triggerBoxSpecter(),this.events.onEvent(\"electricidad\")"),"Warning may fire before ghost exists");
assert(script.includes("n.current?.getSpecterStatus()?.visible"),"Whisper may claim a non-visible specter");
assert(script.includes("EXT_texture_webp"),"Bundled Three.js GLTFLoader lacks WebP texture support");
assert(script.includes("KHR_mesh_quantization"),"Bundled Three.js GLTFLoader lacks quantized mesh support");

const required={
 chandelier:"premium-ph-crystal-chandelier",
 premiumSconce:"industrial-wall-sconce",
 premiumMirror:"victorian-arched-mirror",
 premiumLantern:"premium-ph-wood-lantern",
 premiumNightstand:"victorian-nightstand"
};
const expectedExtensions=new Set(["EXT_texture_webp","KHR_mesh_quantization"]);
let total=0;
for(const [key,id] of Object.entries(required)){
 const url=manifest.assets[key];
 assert.equal(url,`/la-ultima-funcion/models/premium/${id}.glb`,"Incorrect runtime URL for "+key);
 assert(!url.includes(".glb64"),"Compressed GLB delivery must be native, not base64");
 const buffer=read(`models/premium/${id}.glb`);
 assert.equal(buffer.toString("utf8",0,4),"glTF","Invalid GLB magic: "+id);
 assert.equal(buffer.readUInt32LE(4),2,"GLB must be v2: "+id);
 assert.equal(buffer.readUInt32LE(8),buffer.length,"GLB byte count mismatch: "+id);
 assert.equal(buffer.toString("utf8",16,20),"JSON","Invalid glTF JSON chunk: "+id);
 const len=buffer.readUInt32LE(12);
 const json=JSON.parse(buffer.subarray(20,20+len).toString("utf8"));
 assert((json.meshes?.length||0)>0,"No visible geometry: "+id);
 assert((json.materials?.length||0)>0,"No PBR materials: "+id);
 assert((json.images||[]).every(i=>!i.uri||i.uri.startsWith("data:")),"External image dependency: "+id);
 assert((json.buffers||[]).every(b=>!b.uri),"External binary buffer dependency: "+id);
 for(const e of json.extensionsRequired||[])assert(expectedExtensions.has(e),"Unsupported required extension: "+e+" in "+id);
 total+=buffer.length;
 console.log(`OK ${id}: ${buffer.length} bytes, ${json.meshes.length} meshes, ${json.materials.length} materials`);
}
const pbrMaterials=["wood_floor","rough_plaster_broken"];
let pbrBytes=0;
for(const id of pbrMaterials){
 for(const part of ["color","normal","arm"]){
  const file=`materials/premium/${id}-${part}.webp`;
  const b=read(file);
  assert.equal(b.toString("ascii",0,4),"RIFF","Invalid WebP RIFF: "+file);
  assert.equal(b.toString("ascii",8,12),"WEBP","Invalid WebP format: "+file);
  pbrBytes+=b.length;
 }
 assert(script.includes(`applyPremiumSurface`),"PBR loader missing");
 assert(script.includes(id),"PBR material not used: "+id);
}
assert(pbrBytes<3.5*1024*1024,"Mobile PBR texture budget exceeded: "+pbrBytes);
assert(total<4.3*1024*1024,"Mobile premium asset budget exceeded: "+total);
assert(statSync(path.join(game,entry)).size<1.2*1024*1024,"Excessively heavy JavaScript bundle");
console.log(`OK: theatre 3D assets, source paths and legacy puzzle functions verified. ${(total/1024/1024).toFixed(2)} MiB premium GLB total.`);
