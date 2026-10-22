import {test} from "node:test";
import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import {__test} from "../worker.js";
if(!globalThis.crypto)globalThis.crypto=webcrypto;

class FakeD1{
 constructor(){this.events=new Map();this.opps=new Map();this.blocks=new Map();}
 prepare(sql){
  const db=this,statement=sql.replace(/\s+/g," ").trim().toLowerCase();
  return {bind(...args){return {
   async run(){return db.run(statement,args)},
   async first(){return db.first(statement,args)},
   async all(){return db.all(statement,args)}
  }}};
 }
 async run(q,a){
  let changes=0;
  if(q.startsWith("insert or ignore into inbound_events")){
   if(!this.events.has(a[0])){
    this.events.set(a[0],{id:a[0],phone_id:a[1],contact_key:a[2],field:a[3],direction:a[4],kind:a[5],signal:a[6],created_at:a[7],received_at:a[8],processed_at:null});
    changes=1;
   }
  }else if(q.startsWith("update inbound_events set processed_at")){
   const row=this.events.get(a[1]);
   if(q.includes("processed_at is null or")){
    if(row&&(row.processed_at===null||(row.processed_at<0&&row.processed_at>a[2]))){row.processed_at=a[0];changes=1;}
   }else if(row&&row.processed_at===a[2]){row.processed_at=a[0];changes=1;}
  }else if(q.startsWith("insert or ignore into contact_blocks")){
   const id=a[0]+"|"+a[1];
   if(!this.blocks.has(id)){this.blocks.set(id,{phone_id:a[0],contact_key:a[1],reason:a[2]});changes=1;}
  }else if(q.includes("set status='blocked',reason='solicitud de no contacto'")){
   for(const row of this.opps.values())if(row.phone_id===a[1]&&row.contact_key===a[2]&&!["blocked","superseded"].includes(row.status)){row.status="blocked";row.reason="Solicitud de no contacto";changes++;}
  }else if(q.includes("set status='review',reason='documento enviado")){
   for(const row of this.opps.values())if(row.phone_id===a[2]&&row.contact_key===a[3]&&row.quote_at<=a[4]&&["candidate","waiting","review"].includes(row.status)){
     row.status="review";row.reason="Documento enviado que requiere revisión";row.last_activity_at=Math.max(row.last_activity_at,a[0]);changes++;
   }
  }else if(q.includes("set status='superseded'")){
   for(const row of this.opps.values())if(row.phone_id===a[1]&&row.contact_key===a[2]&&row.quote_at<=a[3]&&!["blocked","superseded"].includes(row.status)){
     row.status="superseded";changes++;
   }
  }else if(q.startsWith("insert or ignore into opportunities")){
   if(!this.opps.has(a[0])){
    this.opps.set(a[0],{quote_id:a[0],phone_id:a[1],contact_key:a[2],quote_at:a[3],last_activity_at:a[4],status:a[5],reason:a[6],pdf_detected:a[7],manual_control:null,updated_at:a[8]});changes=1;
   }
  }else if(q.includes("last_activity_at=max(last_activity_at")){
   const row=this.opps.get(a[4]);
   if(row&&!row.manual_control&&!["blocked","superseded"].includes(row.status)){row.status=a[0];row.reason=a[1];row.last_activity_at=Math.max(row.last_activity_at,a[2]);changes++;}
  }else if(q.includes("quote_at<=?")&&q.includes("set status=?,reason=?,updated_at=?")){
   const row=this.opps.get(a[3]);
   if(row&&row.quote_at<=a[4]&&!row.manual_control&&!["blocked","superseded"].includes(row.status)){row.status=a[0];row.reason=a[1];changes++;}
  }else if(q.includes("last_activity_at<=?")&&q.includes("set status=?,reason=?,last_activity_at=?,updated_at=?")){
   const row=this.opps.get(a[4]);
   if(row&&row.last_activity_at<=a[5]&&!row.manual_control&&!["blocked","superseded"].includes(row.status)){row.status=a[0];row.reason=a[1];row.last_activity_at=a[2];changes++;}
  }else throw Error("Fake D1 run missing query: "+q.slice(0,140));
  return {meta:{changes}};
 }
 async first(q,a){
  if(q.startsWith("select processed_at from inbound_events"))return this.events.get(a[0])??null;
  if(q.startsWith("select 1 as found from contact_blocks"))return this.blocks.has(a[0]+"|"+a[1])?{found:1}:null;
  if(q.startsWith("select quote_at from opportunities")){
   return [...this.opps.values()].filter(r=>r.phone_id===a[0]&&r.contact_key===a[1]).sort((x,y)=>y.quote_at-x.quote_at)[0]??null;
  }
  if(q.startsWith("select * from opportunities")){
   return [...this.opps.values()].filter(r=>r.phone_id===a[0]&&r.contact_key===a[1]).sort((x,y)=>y.quote_at-x.quote_at)[0]??null;
  }
  throw Error("Fake D1 first missing query: "+q.slice(0,130));
 }
 async all(q,a){
  if(q.startsWith("select signal,created_at from inbound_events")){
   return {results:[...this.events.values()].filter(r=>r.phone_id===a[0]&&r.contact_key===a[1]&&r.created_at>=a[2]&&r.id!==a[3]).sort((x,y)=>x.created_at-y.created_at).slice(0,501)};
  }
  throw Error("Fake D1 all missing query: "+q.slice(0,130));
 }
}
function testEnv(){
 return {DB:new FakeD1(),ALLOWED_PHONE_NUMBER_ID:"ph_1",DATA_HASH_KEY:"test-only-key-with-enough-entropy"};
}
function ev(id,t,kind,text="",direction="in",filename=null){
 return {id,phoneId:"ph_1",wabaId:"waba_1",contact:"5492210000000",direction,kind,filename,text,createdAt:t,field:direction==="out"?"smb_message_echoes":"messages"};
}
async function current(env){
 return [...env.DB.opps.values()].sort((a,b)=>b.quote_at-a.quote_at)[0]??null;
}
test("PDF comercial seguido de agradecimiento conserva una sola oportunidad",async()=>{
 const e=testEnv();
 await __test.receiveMessage(e,ev("p1",100,"document","","out","presupuesto 101.pdf"));
 await __test.receiveMessage(e,ev("m1",110,"text","Gracias!"));
 assert.equal((await current(e)).status,"candidate");
 assert.equal(e.DB.opps.size,1);
 assert.equal(e.DB.events.size,2);
});
test("un webhook duplicado no repite el procesamiento",async()=>{
 const e=testEnv();const x=ev("p1",100,"document","","out","presupuesto 101.pdf");
 await __test.receiveMessage(e,x);
 const again=await __test.receiveMessage(e,x);
 assert.equal(again.reason,"duplicate");
 assert.equal(e.DB.opps.size,1);
 assert.equal(e.DB.events.size,1);
});
test("un pago entregado tarde bloquea una oportunidad que parecía vigente",async()=>{
 const e=testEnv();
 await __test.receiveMessage(e,ev("p1",100,"document","","out","presupuesto 101.pdf"));
 await __test.receiveMessage(e,ev("m2",200,"text","Muchas gracias"));
 assert.equal((await current(e)).status,"candidate");
 await __test.receiveMessage(e,ev("m1",150,"text","Ya pagué"));
 assert.equal((await current(e)).status,"blocked");
});
test("una factura posterior no se confunde con un presupuesto nuevo",async()=>{
 const e=testEnv();
 await __test.receiveMessage(e,ev("p1",100,"document","","out","presupuesto 101.pdf"));
 await __test.receiveMessage(e,ev("f1",150,"document","","out","factura 101.pdf"));
 assert.equal(e.DB.opps.size,1);
 assert.equal((await current(e)).status,"review");
});
test("un documento sin nombre no crea un presupuesto",async()=>{
 const e=testEnv();await __test.receiveMessage(e,ev("a1",100,"document","","out",null));
 assert.equal(e.DB.opps.size,0);
});
test("compra entregada antes del PDF, pero posterior cronológicamente, bloquea el presupuesto",async()=>{
 const e=testEnv();
 await __test.receiveMessage(e,ev("m1",150,"text","Te transferí"));
 assert.equal(e.DB.opps.size,0);
 await __test.receiveMessage(e,ev("p1",100,"document","","out","presupuesto 102.pdf"));
 assert.equal((await current(e)).status,"blocked");
});
test("un audio o captura posterior requiere revisión, sin asumir que no pagó",async()=>{
 const e=testEnv();
 await __test.receiveMessage(e,ev("p1",100,"document","","out","presupuesto 103.pdf"));
 await __test.receiveMessage(e,ev("m1",150,"image","","in",null));
 assert.equal((await current(e)).status,"review");
});
test("baja solicitada sigue bloqueada incluso tras un nuevo presupuesto",async()=>{
 const e=testEnv();
 await __test.receiveMessage(e,ev("m1",90,"text","No me escribas más"));
 await __test.receiveMessage(e,ev("p1",100,"document","","out","presupuesto 104.pdf"));
 assert.equal((await current(e)).status,"blocked");
 assert.equal(e.DB.blocks.size,1);
});
test("un presupuesto posterior sustituye al anterior y no genera 2 candidatos",async()=>{
 const e=testEnv();
 await __test.receiveMessage(e,ev("p1",100,"document","","out","presupuesto 105.pdf"));
 await __test.receiveMessage(e,ev("p2",200,"document","","out","presupuesto 105 corregido.pdf"));
 assert.equal(e.DB.opps.size,2);
 assert.equal([...e.DB.opps.values()].filter(x=>x.status==="superseded").length,1);
});
test("un presupuesto antiguo llegado después del nuevo no reemplaza al nuevo",async()=>{
 const e=testEnv();
 await __test.receiveMessage(e,ev("p2",200,"document","","out","presupuesto nuevo.pdf"));
 await __test.receiveMessage(e,ev("p1",100,"document","","out","presupuesto viejo.pdf"));
 assert.equal(e.DB.opps.size,1);
 assert.equal((await current(e)).status,"candidate");
});
test("no quedan textos, teléfonos en claro ni contenido PDF en la tabla de eventos",async()=>{
 const e=testEnv();
 await __test.receiveMessage(e,ev("p1",100,"document","","out","presupuesto 105.pdf"));
 await __test.receiveMessage(e,ev("m1",150,"text","Te transferí"));
 const data=JSON.stringify([...e.DB.events.values(),...e.DB.opps.values()]);
 assert.equal(data.includes("5492210000000"),false);
 assert.equal(data.includes("Te transferí"),false);
 assert.equal(data.includes("presupuesto 105.pdf"),false);
});
