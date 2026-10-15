import assert from "node:assert/strict";
import {readFileSync, statSync} from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";

const game=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>readFileSync(path.join(game,p));
const manifest=JSON.parse(read("models/manifest.json").toString("utf8"));
const html=read("index.html").toString("utf8");
const entry="assets/index-theatre-premium-v2-20261015.js";
const script=read(entry).toString("utf8");

assert(html.includes(entry), "The published HTML does not use premium JS");
for(const needle of ["buildSeats()","buildPanels()","buildStage()","buildUsher()","buildPrivateBoxes()","buildEntranceDoors()","loadDecorManifest()"]) {
 assert(script.includes(needle),"Existing puzzle/scene engine missing: "+needle);
}
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
assert(total<4.3*1024*1024,"Mobile premium asset budget exceeded: "+total);
assert(statSync(path.join(game,entry)).size<1.2*1024*1024,"Excessively heavy JavaScript bundle");
console.log(`OK: theatre 3D assets, source paths and legacy puzzle functions verified. ${(total/1024/1024).toFixed(2)} MiB premium GLB total.`);
