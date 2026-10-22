// CIERRE shadow-mode core. Pure functions; no network, storage or message sending.
export const VERSION = "0.4.0";
export const STATES = Object.freeze({
  candidate:"candidate", waiting:"waiting", review:"review",
  blocked:"blocked", superseded:"superseded"
});
export function normalise(s){return String(s??"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();}
export function classifyText(text,direction){
 const v=normalise(text).slice(0,1500);
 if(!v)return "unknown";
 if(direction==="out"){
   if(/(?:pudiste (?:ver|revisar|mirar)|alguna novedad (?:del|sobre)|seguimos en pie|como venis con (?:el|tu) presupuesto|te (?:escribo|consulto) (?:para saber|por el presupuesto)|seguimiento (?:de|del) presupuesto)/.test(v))return "human_followup";
   return "seller_message";
 }
 if(/(?:no me (?:escrib|contact|mand)|no (?:quiero|deseo) (?:mensajes|que me escriban)|dame de baja|sacame de (?:la )?lista|deja de escribirme|no me mandes mas)/.test(v))return "optout";
 if(/(?:no me interesa|no estoy interesad|no lo voy a comprar|no voy a comprar|ya resolvi|ya lo resolvi|compre en otro lado|lo compre en otro lado|no lo necesitamos)/.test(v))return "rejected";
 if(/(?:ya (?:lo )?(?:pague|compre)|te transferi|ya transferi|transferencia realizada|confirmo (?:el pedido|la compra)|paso a (?:pagar|retirar|buscar)|(?:manana|hoy) (?:paso a pagar|retiro)|lo pago (?:hoy|manana)|te confirmo (?:el pedido|la compra)|cerramos (?:el pedido|la compra)|listo,? lo llevo)/.test(v))return "purchased";
 if(/(?:te aviso|cualquier cosa (?:te )?aviso|lo voy a pensar|dejame pensarlo|lo estamos evaluando|lo estoy evaluando|despues te digo|lo converso|te escribo cuando|^(?:dale|listo|ok|oka|perfecto|joya|genial|de acuerdo|bueno)[.! ]*$)/.test(v))return "ambiguous";
 if(/[?¿]/.test(v)||/^(?:cuanto|cuando|como|donde|podes|podrias|incluye|tienen|hay|me confirmas|me averiguas)\b/.test(v))return "question";
 if(/^(?:gracias|muchas gracias|mil gracias|te agradezco|muchisimas gracias)(?:[!. ]|🙏|👍)*$/.test(v))return "ack";
 return "unknown";
}

/**
 * A signal is persisted instead of full message text.
 * Out-of-order and concurrent delivery must NEVER silently re-open a blocked case.
 */
export function extractEventSignal(event){
 if(event.direction==="out" && event.kind==="document"){
  if(event.filename && isQuoteFilename(event.filename))return "quote_pdf";
  return "unverified_document"; // includes invoices, receipts and unnamed attachments
 }
 if(event.kind!=="text")return "non_text";
 return classifyText(event.text,event.direction);
}
export function shouldForceSafetyHold(signal){
 return ["optout","rejected","purchased","human_followup","question","ambiguous","non_text","unverified_document"].includes(signal);
}
export function safetyStateForLateSignal(signal){
 if(["optout","rejected","purchased","human_followup"].includes(signal))return "blocked";
 return "review";
}

export function isQuoteFilename(filename){
 const v=normalise(filename);
 return /\.pdf$/.test(v) && /(?:presup|cotiza|proforma|quote|budget|oferta)/.test(v);
}
export function getFilename(message){
 if(message?.type!=="document")return null;
 const name=message.document?.filename;
 return typeof name==="string" && name.toLowerCase().endsWith(".pdf") ? name.slice(0,150) : null;
}
export function normaliseWebhook(body){
 if(body?.object!=="whatsapp_business_account")return [];
 const out=[];
 for(const entry of (Array.isArray(body.entry)?body.entry:[])){
  for(const change of (Array.isArray(entry.changes)?entry.changes:[])){
   const field=change?.field,value=change?.value??{},phoneId=String(value?.metadata?.phone_number_id??"");
   if(!phoneId)continue;
   const direction=field==="smb_message_echoes"?"out":field==="messages"?"in":null;
   if(!direction)continue; // history and state_sync are not real-time operational events
   const items=direction==="out"?value.message_echoes:value.messages;
   for(const message of (Array.isArray(items)?items:[])){
    if(!message?.id || !message?.timestamp)continue;
    const contact=String(direction==="out"?message.to:message.from??"");
    const createdAt=Number(message.timestamp)*1000;
    if(!contact || !Number.isFinite(createdAt) || createdAt<=0)continue;
    out.push({
      id:String(message.id),phoneId,wabaId:String(entry?.id??""),
      contact, direction, kind:String(message.type??"unknown"),
      filename:getFilename(message),
      text:message.type==="text"?String(message.text?.body??"").slice(0,1500):"",
      createdAt, field
    });
   }
  }
 }
 return out;
}
export function transition(current,event){
 const prior=current??null;
 const result={status:prior?.status??"review",reason:prior?.reason??"Sin información suficiente",control:prior?.control??null};
 if(prior?.control)return {...result,status:"blocked",reason:"Bloqueo manual"};
 if(prior && event.createdAt < prior.quoteAt) return result;
 const signal=event.direction==="in"?classifyText(event.text,"in"):classifyText(event.text,"out");
 const blocked=new Set(["blocked","superseded"]);
 if(prior && blocked.has(prior.status))return result;
 if(event.direction==="in"){
   if(signal==="optout"||signal==="rejected"||signal==="purchased"){
     result.status="blocked";
     result.reason={optout:"Baja solicitada",rejected:"Rechazo o resolución",purchased:"Compra o acuerdo detectado"}[signal];
   }else if(signal==="question"){
     result.status="waiting";result.reason="Pregunta del cliente sin responder";
   }else if(signal==="ambiguous"||signal==="unknown"){
     result.status="review";result.reason="Respuesta ambigua o sin clasificar";
   }else if(signal==="ack"){
     // A simple thanks must NEVER clear a previous hold or ambiguous statement.
     if(prior?.status==="candidate"){result.status="candidate";result.reason="Acuse de recibo; propuesta aún sin cierre confirmado";}
     else {result.status=prior?.status??"review";result.reason=prior?.reason??"Acuse de recibo sin contexto suficiente";}
   }
 }else if(event.direction==="out"){
   if(signal==="human_followup"){result.status="blocked";result.reason="Seguimiento del vendedor";}
   else if(prior?.status==="waiting"){result.status="review";result.reason="El vendedor respondió, pero falta comprobar si se cerró la consulta";}
   else if(prior?.status==="candidate"){result.status="review";result.reason="El vendedor volvió a escribir; evaluar contexto antes de cualquier seguimiento";}
 }
 return result;
}
