/**
 * CIERRE Shadow API 0.3
 * Cloudflare Worker + D1; ingest verified Meta webhooks and display anonymized states.
 * Important: there is NO Graph API send call, template sender, cron sender or outbound bot.
 */
import {VERSION, normaliseWebhook, transition, extractEventSignal, shouldForceSafetyHold, safetyStateForLateSignal} from "./core.js";
const MAX_BYTES=512000;
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...extra}});
const forbidden=()=>json({error:"forbidden"},403);
const now=()=>Date.now();
function equalString(a,b){
 const x=new TextEncoder().encode(String(a??"")),y=new TextEncoder().encode(String(b??""));
 let diff=x.length^y.length;
 for(let i=0;i<Math.max(x.length,y.length);i++)diff|=(x[i]??0)^(y[i]??0);
 return diff===0;
}
function isConfigured(env){
 return Boolean(env?.DB&&env?.META_VERIFY_TOKEN&&env?.META_APP_SECRET&&env?.DATA_HASH_KEY&&env?.ADMIN_API_KEY&&env?.ALLOWED_PHONE_NUMBER_ID);
}
function safeOrigin(request,env){
 const origin=request.headers.get("Origin");
 if(!origin)return {};
 if(origin!==String(env.ALLOWED_ORIGIN??""))return null;
 return {"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"Authorization, Content-Type","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Vary":"Origin"};
}
async function hmac(input,secret){
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const signature=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(input));
 return Array.from(new Uint8Array(signature),b=>b.toString(16).padStart(2,"0")).join("");
}
async function hashContact(env,phoneId,contact){return hmac(phoneId+"|"+contact,env.DATA_HASH_KEY);}
async function verifyMeta(body,signature,secret){
 if(!/^sha256=[0-9a-f]{64}$/.test(signature??""))return false;
 const calculated="sha256="+await hmac(body,secret);
 return equalString(calculated,signature);
}
async function recordCoverage(env,field){
 await env.DB.prepare(
  "INSERT INTO webhook_coverage(field,count,last_received_at) VALUES (?,1,?) ON CONFLICT(field) DO UPDATE SET count=count+1,last_received_at=excluded.last_received_at"
 ).bind(field,now()).run();
}
async function receiveMessage(env,event){
 if(event.phoneId!==env.ALLOWED_PHONE_NUMBER_ID)return {skip:true,reason:"phone_not_allowed"};
 const key=await hashContact(env,event.phoneId,event.contact);
 const signal=extractEventSignal(event);
 const uniqueId=event.phoneId+":"+event.id;

 await env.DB.prepare(
  "INSERT OR IGNORE INTO inbound_events(id,phone_id,contact_key,field,direction,kind,signal,created_at,received_at,processed_at) VALUES (?,?,?,?,?,?,?,?,?,NULL)"
 ).bind(uniqueId,event.phoneId,key,event.field,event.direction,event.kind,signal,event.createdAt,now()).run();
 // Claim each message atomically. Negative timestamp = in progress; positive = completed.
 // A crashed claim becomes reclaimable after 2 minutes. Meta receives 503 on a
 // simultaneous in-progress delivery so it will retry instead of silently losing it.
 const stamp=now();
 const claimed=await env.DB.prepare(
  "UPDATE inbound_events SET processed_at=? WHERE id=? AND (processed_at IS NULL OR (processed_at<0 AND processed_at>?))"
 ).bind(-stamp,uniqueId,-(stamp-120000)).run();
 if(Number(claimed?.meta?.changes??0)!==1){
  const previous=await env.DB.prepare("SELECT processed_at FROM inbound_events WHERE id=?").bind(uniqueId).first();
  if(Number(previous?.processed_at??0)>0)return {skip:true,reason:"duplicate"};
  throw Error("webhook_event_processing_in_progress");
 }
 const result=await applyMessageState(env,event,key,signal);
 await env.DB.prepare("UPDATE inbound_events SET processed_at=? WHERE id=? AND processed_at=?").bind(now(),uniqueId,-stamp).run();
 return result;
}
async function applyMessageState(env,event,key,signal){
 if(signal==="optout"){
  await env.DB.prepare("INSERT OR IGNORE INTO contact_blocks(phone_id,contact_key,reason,blocked_at) VALUES (?,?,?,?)").bind(event.phoneId,key,"Solicitó no recibir mensajes",now()).run();
  await env.DB.prepare("UPDATE opportunities SET status='blocked',reason='Solicitud de no contacto',updated_at=? WHERE phone_id=? AND contact_key=? AND status NOT IN ('blocked','superseded')").bind(now(),event.phoneId,key).run();
  return {ok:true,signal};
 }
 // Do not invent a new quote from a PDF without commercial name or a missing filename.
 // It could be a remito, invoice, receipt or an edited attachment.
 if(event.direction==="out"&&event.kind==="document"&&signal!=="quote_pdf"){
  await env.DB.prepare(
   "UPDATE opportunities SET status='review',reason='Documento enviado que requiere revisión',last_activity_at=max(last_activity_at,?),updated_at=? WHERE phone_id=? AND contact_key=? AND quote_at<=? AND status IN ('candidate','waiting','review')"
  ).bind(event.createdAt,now(),event.phoneId,key,event.createdAt).run();
  return {ok:true,signal:"document_to_review"};
 }
 if(signal==="quote_pdf"){
  const previous=await env.DB.prepare("SELECT 1 AS found FROM contact_blocks WHERE phone_id=? AND contact_key=?").bind(event.phoneId,key).first();
  const newest=await env.DB.prepare(
   "SELECT quote_at FROM opportunities WHERE phone_id=? AND contact_key=? ORDER BY quote_at DESC LIMIT 1"
  ).bind(event.phoneId,key).first();
  if(newest && Number(newest.quote_at)>event.createdAt)return {ok:true,signal:"older_pdf_ignored"};
  await env.DB.prepare(
   "UPDATE opportunities SET status='superseded',reason='Presupuesto posterior en la conversación',updated_at=? WHERE phone_id=? AND contact_key=? AND quote_at<=? AND status NOT IN ('blocked','superseded')"
  ).bind(now(),event.phoneId,key,event.createdAt).run();
  await env.DB.prepare(
   "INSERT OR IGNORE INTO opportunities(quote_id,phone_id,contact_key,quote_at,last_activity_at,status,reason,pdf_detected,manual_control,updated_at) VALUES (?,?,?,?,?,?,?,?,NULL,?)"
  ).bind(event.phoneId+":"+event.id,event.phoneId,key,event.createdAt,event.createdAt,previous?"blocked":"candidate",previous?"Baja registrada":"Presupuesto detectado, falta validar contexto",1,now()).run();
  if(!previous){
   // Some callbacks are delivered out of order. Analyze stored *signals* even
   // when they arrived before the PDF event; no plaintext or raw numbers needed.
   const replay=await env.DB.prepare(
    "SELECT signal,created_at FROM inbound_events WHERE phone_id=? AND contact_key=? AND created_at>=? AND id<>? ORDER BY created_at ASC LIMIT 501"
   ).bind(event.phoneId,key,event.createdAt,event.phoneId+":"+event.id).all();
   const rows=replay?.results??[];
   let status="candidate",reason="PDF detectado; no constan impedimentos en señales recibidas";
   if(rows.length>500){status="review";reason="Más de 500 eventos posteriores; revisión obligatoria";}
   else{
    let blockers=rows.filter(r=>["optout","rejected","purchased","human_followup"].includes(r.signal));
    if(blockers.length){
     status="blocked";reason="Señal de compra, rechazo, baja o seguimiento humano detectada en eventos anteriores";
    }else if(rows.some(r=>shouldForceSafetyHold(r.signal)||r.signal==="unknown"||r.signal==="seller_message")){
     status="review";reason="Hay actividad posterior que requiere revisión; no se autoriza mensaje";
    }
   }
   const maxAt=rows.reduce((a,r)=>Math.max(a,Number(r.created_at)),event.createdAt);
   await env.DB.prepare(
    "UPDATE opportunities SET status=?,reason=?,last_activity_at=max(last_activity_at,?),updated_at=? WHERE quote_id=? AND manual_control IS NULL AND status NOT IN ('blocked','superseded')"
   ).bind(status,reason,maxAt,now(),event.phoneId+":"+event.id).run();
  }
  return {ok:true,signal:"quote"};
 }
 const caseRow=await env.DB.prepare(
  "SELECT * FROM opportunities WHERE phone_id=? AND contact_key=? ORDER BY quote_at DESC LIMIT 1"
 ).bind(event.phoneId,key).first();
 if(!caseRow)return {ok:true,signal:"before_quote"};
 if(event.createdAt<caseRow.quote_at)return {ok:true,signal:"before_current_quote"};
 // Older webhook deliveries must not reactivate/erase a newer decision.
 if(event.createdAt<caseRow.last_activity_at){
  if(shouldForceSafetyHold(signal)||signal==="unknown"||signal==="seller_message"){
   const state=safetyStateForLateSignal(signal);
   await env.DB.prepare(
    "UPDATE opportunities SET status=?,reason=?,updated_at=? WHERE quote_id=? AND quote_at<=? AND status NOT IN ('blocked','superseded') AND manual_control IS NULL"
   ).bind(state,state==="blocked"?"Evento atrasado de compra, rechazo, baja o seguimiento humano":"Evento atrasado que necesita revisión",now(),caseRow.quote_id,event.createdAt).run();
  }
  return {ok:true,signal:"out_of_order_safe_hold"};
 }
 const decision=transition({
  status:caseRow.status,reason:caseRow.reason,control:caseRow.manual_control,quoteAt:caseRow.quote_at
 },event);
 await env.DB.prepare(
  "UPDATE opportunities SET status=?,reason=?,last_activity_at=?,updated_at=? WHERE quote_id=? AND last_activity_at<=? AND status NOT IN ('blocked','superseded') AND manual_control IS NULL"
 ).bind(decision.status,decision.reason,event.createdAt,now(),caseRow.quote_id,event.createdAt).run();
 return {ok:true,signal,decision:decision.status};
}
async function ingest(env,body){
 const events=normaliseWebhook(body);
 for(const entry of (body.entry??[])){
  for(const change of (entry.changes??[])){
   const name=String(change.field??"unknown").slice(0,50);
   await recordCoverage(env,name);
  }
 }
 const report={accepted:0,ignored:0};
 for(const event of events){
  const result=await receiveMessage(env,event);
  if(result.skip)report.ignored++;else report.accepted++;
 }
 return report;
}
async function admin(request,env,url,cors){
 if(!equalString(request.headers.get("Authorization"),"Bearer "+env.ADMIN_API_KEY))return json({error:"unauthorized"},401,cors);
 if(request.method==="GET"&&url.pathname==="/api/overview"){
  const [groups,coverage,recent]=await Promise.all([
   env.DB.prepare("SELECT status,count(*) AS count FROM opportunities GROUP BY status").all(),
   env.DB.prepare("SELECT field,count,last_received_at FROM webhook_coverage ORDER BY last_received_at DESC LIMIT 12").all(),
   env.DB.prepare("SELECT count(*) AS count FROM inbound_events").first()
  ]);
  return json({mode:"shadow",version:VERSION,events:Number(recent?.count??0),statuses:groups?.results??[],coverage:coverage?.results??[],can_send:false},200,cors);
 }
 if(request.method==="GET"&&url.pathname==="/api/opportunities"){
  const rows=await env.DB.prepare(
   "SELECT quote_id,phone_id,substr(contact_key,1,10) AS contact_ref,quote_at,last_activity_at,status,reason,pdf_detected,manual_control,updated_at FROM opportunities ORDER BY updated_at DESC LIMIT 100"
  ).all();
  return json({mode:"shadow",can_send:false,items:(rows?.results??[]).map(r=>({
   ...r,shadow_due:r.status==="candidate"&&now()-r.last_activity_at>=Math.max(24,Math.min(168,Number(env.FOLLOWUP_HOURS)||36))*3600000,
   warning:"No se verificó consentimiento, ventas presenciales ni cobertura completa del chat"
  }))},200,cors);
 }
 if(request.method==="POST"&&url.pathname==="/api/block"){
  const payload=await request.json().catch(()=>null);
  const quoteId=typeof payload?.quote_id==="string"?payload.quote_id:"";
  const reason=payload?.reason;
  if(!quoteId||quoteId.length>300||!["sale","human","optout","sent","other"].includes(reason))return json({error:"invalid_input"},400,cors);
  const result=await env.DB.prepare(
   "UPDATE opportunities SET status='blocked',reason=?,manual_control=?,updated_at=? WHERE quote_id=? AND status!='superseded'"
  ).bind({sale:"Venta verificada por responsable",human:"Seguimiento humano realizado",optout:"Baja manual",sent:"Ya contactado",other:"Cierre manual"}[reason],reason,now(),quoteId).run();
  if(Number(result?.meta?.changes??0)>0 && reason==="optout"){
    const row=await env.DB.prepare("SELECT phone_id,contact_key FROM opportunities WHERE quote_id=?").bind(quoteId).first();
    if(row){
      await env.DB.prepare("INSERT OR IGNORE INTO contact_blocks(phone_id,contact_key,reason,blocked_at) VALUES (?,?,?,?)").bind(row.phone_id,row.contact_key,"Baja manual",now()).run();
      await env.DB.prepare("UPDATE opportunities SET status='blocked',reason='Solicitud de no contacto',updated_at=? WHERE phone_id=? AND contact_key=? AND status NOT IN ('blocked','superseded')").bind(now(),row.phone_id,row.contact_key).run();
    }
  }
  return json({ok:Number(result?.meta?.changes??0)>0,can_send:false},200,cors);
 }
 return json({error:"not_found"},404,cors);
}
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==="/health"&&request.method==="GET")return json({ok:true,version:VERSION,mode:"shadow",configured:isConfigured(env),can_send:false});
  if(!isConfigured(env))return json({error:"service_not_configured",mode:"shadow"},503);
  if(url.pathname==="/webhook"){
   if(request.method==="GET"){
    const params=url.searchParams;
    return params.get("hub.mode")==="subscribe"&&equalString(params.get("hub.verify_token"),env.META_VERIFY_TOKEN)?
      new Response(params.get("hub.challenge")??"",{status:200,headers:{"Content-Type":"text/plain"}}):forbidden();
   }
   if(request.method!=="POST")return json({error:"method_not_allowed"},405);
   if(Number(request.headers.get("Content-Length")??0)>MAX_BYTES)return json({error:"too_large"},413);
   const body=await request.text();
   if(new TextEncoder().encode(body).length>MAX_BYTES)return json({error:"too_large"},413);
   if(!await verifyMeta(body,request.headers.get("X-Hub-Signature-256"),env.META_APP_SECRET))return json({error:"invalid_signature"},401);
   let data;
   try{data=JSON.parse(body)}catch{return json({error:"invalid_json"},400);}
   if(data.object!=="whatsapp_business_account")return json({error:"invalid_object"},400);
   try{
    await ingest(env,data);
    // Respond without message data; Meta retries if DB is unavailable.
    return new Response("EVENT_RECEIVED",{status:200});
   }catch{
    return json({error:"temporary_processing_error"},503);
   }
  }
  if(url.pathname.startsWith("/api/")){
   const cors=safeOrigin(request,env);if(cors===null)return forbidden();
   if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
   try{return await admin(request,env,url,cors);}
   catch{return json({error:"internal_error"},500,cors);}
  }
  return json({error:"not_found"},404);
 },
 async scheduled(_event,env){
  if(!env?.DB)return;
  const day=24*60*60*1000;
  // Keep only the minimum operational history needed for the shadow pilot.
  await env.DB.prepare("DELETE FROM inbound_events WHERE received_at<?").bind(now()-30*day).run();
  await env.DB.prepare("DELETE FROM opportunities WHERE updated_at<?").bind(now()-90*day).run();
  // Contact opt-out hashes are intentionally retained so we don't contact opted-out people.
 }
};
