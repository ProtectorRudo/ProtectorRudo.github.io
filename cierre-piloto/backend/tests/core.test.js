import {test} from "node:test";
import assert from "node:assert/strict";
import {classifyText,isQuoteFilename,normaliseWebhook,transition} from "./core.js";
const messages=[
 ["Muchas gracias","in","ack"],
 ["No me interesa","in","rejected"],
 ["No me escribas más","in","optout"],
 ["Ya transferí","in","purchased"],
 ["¿Cuánto sale el flete?","in","question"],
 ["Lo voy a pensar","in","ambiguous"],
 ["Dale","in","ambiguous"],
 ["Pudiste revisar el presupuesto?","out","human_followup"],
 ["Hola, qué tal","in","unknown"],
 ["Me enviás el costo?","in","question"]
];
for(const [text,dir,expected] of messages){
 test("clasificación: "+text,()=>assert.equal(classifyText(text,dir),expected));
}
test("solo PDF comercial reconocible",()=>{
 assert.equal(isQuoteFilename("presupuesto-998.pdf"),true);
 assert.equal(isQuoteFilename("cotizacion v2.pdf"),true);
 assert.equal(isQuoteFilename("foto-vacaciones.pdf"),false);
 assert.equal(isQuoteFilename("factura.pdf"),false);
});
test("normalización de ecos + mensajes entrantes",()=>{
 const payload={object:"whatsapp_business_account",entry:[{id:"waba-1",changes:[
 {field:"smb_message_echoes",value:{metadata:{phone_number_id:"id-1"},message_echoes:[{id:"wa.1",from:"5490001",to:"5491234",timestamp:"1792500000",type:"document",document:{filename:"presupuesto 10.pdf"}}]}},
 {field:"messages",value:{metadata:{phone_number_id:"id-1"},messages:[{id:"wa.2",from:"5491234",timestamp:"1792500200",type:"text",text:{body:"Gracias!"}}]}}
 ]}]};
 const events=normaliseWebhook(payload);
 assert.equal(events.length,2);
 assert.equal(events[0].direction,"out");
 assert.equal(events[0].filename,"presupuesto 10.pdf");
 assert.equal(events[1].direction,"in");
 assert.equal(events[1].text,"Gracias!");
});
test("historial no se procesa como eventos en vivo",()=>{
 const payload={object:"whatsapp_business_account",entry:[{changes:[{field:"history",value:{metadata:{phone_number_id:"ph"},history:[{threads:[]}]}}]}]};
 assert.deepEqual(normaliseWebhook(payload),[]);
});
test("venta detectada bloquea seguimiento",()=>{
 assert.equal(transition({quoteAt:10,status:"candidate"},{direction:"in",text:"Te transferí",createdAt:20}).status,"blocked");
});
test("revisión de pregunta atendida, no recomendación directa",()=>{
 assert.equal(transition({quoteAt:10,status:"waiting"},{direction:"out",text:"Envío $2500",createdAt:20}).status,"review");
});
test("seguimiento manual cancela",()=>{
 assert.equal(transition({quoteAt:10,status:"candidate"},{direction:"out",text:"Pudiste revisar el presupuesto?",createdAt:20}).status,"blocked");
});
test("estado bloqueado permanece bloqueado aunque llegue gracias",()=>{
 assert.equal(transition({quoteAt:10,status:"blocked",reason:"Venta"},{direction:"in",text:"Gracias",createdAt:20}).status,"blocked");
});
test("actividad vieja no debe cambiar el estado",()=>{
 assert.equal(transition({quoteAt:20,status:"candidate",reason:"en curso"},{direction:"in",text:"No me interesa",createdAt:10}).status,"candidate");
});
