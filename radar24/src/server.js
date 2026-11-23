import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { RadarStore } from './storage.js';
import { config } from './config.js';
import { collect } from './apify.js';
import { createInsight } from './analysis.js';

const cfg=config();
const store=new RadarStore(cfg.dbPath);
const here=resolve(fileURLToPath(new URL('..',import.meta.url)),'public');
let running=false;
const json=(res,status,obj)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(obj));};
const isAdmin=req=>{
  if(!cfg.adminKey)return false;
  const supplied=String(req.headers['x-radar-key']||'');
  const a=Buffer.from(supplied),b=Buffer.from(cfg.adminKey);
  return a.length===b.length && timingSafeEqual(a,b);
};
const runRefresh=async()=>{
  if(running)return {status:'busy',error:'Ya hay una búsqueda en curso'};
  if(!cfg.apifyToken)return {status:'disabled',error:'Falta APIFY_TOKEN'};
  if(store.runsToday()>=cfg.maxRunsPerDay)return {status:'quota',error:'Se alcanzó el máximo de búsquedas de 24 horas'};
  running=true;
  const started=new Date().toISOString();
  try {
    const {videos,errors}=await collect(cfg,store.trackedUrls());
    const accepted=store.add(videos,new Date().toISOString());
    const sample=store.list({mode:'new24',limit:100});
    console.log('Radar: resumen de candidatos',JSON.stringify({
      tiktok:sample.filter(v=>v.platform==='tiktok').length,
      instagram:sample.filter(v=>v.platform==='instagram').length,
      destacados:sample.filter(v=>v.quality==='destacado').length,
      prometedores:sample.filter(v=>v.quality==='prometedor').length,
      maxViews:Math.max(0,...sample.map(v=>v.views)),
      highestScore:Math.max(0,...sample.map(v=>v.score))
    }));
    const status=errors.length ? (accepted?'partial':'error'):'ok';
    store.addRun(status,accepted,errors.length?errors.join(' | ').slice(0,1800):null,started);
    return {status,accepted,errors};
  }catch(e){store.addRun('error',0,e.message,started);return {status:'error',error:e.message};}
  finally{running=false;}
};
async function readJson(req){
  let data='';for await(const ch of req){data+=ch;if(data.length>8192)throw new Error('Solicitud demasiado grande');}
  return data?JSON.parse(data):{};
}
async function handler(req,res){
  try {
    const u=new URL(req.url,'http://localhost');
    res.setHeader('X-Frame-Options','SAMEORIGIN');
    res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    if(u.pathname==='/healthz')return json(res,200,{ok:true,module:'radar24'});
    if(u.pathname==='/api/status'&&req.method==='GET')return json(res,200,{
      configured:!!cfg.apifyToken,aiConfigured:!!cfg.openAiKey,autoScan:cfg.autoScan,
      runsLeft:Math.max(0,cfg.maxRunsPerDay-store.runsToday()), pollMinutes:cfg.pollMinutes,
      running, lastRun:store.lastRun(), counts:store.counts(), sources:['TikTok','Instagram'],
      market:cfg.market, notes:'24H mide fecha de publicación; aceleración exige mediciones históricas. La muestra no representa todo el contenido de cada plataforma.'
    });
    if(u.pathname==='/api/videos'&&req.method==='GET'){
      const platform=['all','tiktok','instagram'].includes(u.searchParams.get('platform'))?u.searchParams.get('platform'):'all';
      const mode=['all','new24','accelerated24','watchlist'].includes(u.searchParams.get('mode'))?u.searchParams.get('mode'):'new24';
      return json(res,200,{videos:store.list({mode,platform,limit:100})});
    }
    if(u.pathname==='/api/refresh'&&req.method==='POST'){
      if(!isAdmin(req))return json(res,401,{error:'Acceso restringido: RADAR_ADMIN_KEY'});
      if(running)return json(res,409,{error:'Búsqueda ya en ejecución'});
      if(!cfg.apifyToken)return json(res,422,{error:'Falta APIFY_TOKEN'});
      if(store.runsToday()>=cfg.maxRunsPerDay)return json(res,429,{error:'Límite diario de escaneos alcanzado'});
      void runRefresh().then(result=>console.log('Radar: exploración manual',result.status,'videos=',result.accepted ?? 0,'errores=',result.errors?.join(' | ')||result.error||'ninguno'));
      return json(res,202,{status:'queued',message:'Búsqueda iniciada. El estado se actualizará al finalizar.'});
    }
    const match=u.pathname.match(/^\/api\/videos\/(tiktok|instagram):([a-zA-Z0-9_-]+)(\/insight)?$/);
    if(match){
      const id=match[1]+':'+match[2];const video=store.get(id);
      if(!video)return json(res,404,{error:'Video no encontrado'});
      if(match[3]&&req.method==='GET')return json(res,200,{insight:store.getInsight(id)});
      if(match[3]&&req.method==='POST'){
        if(!isAdmin(req))return json(res,401,{error:'Se requiere clave de administrador'});
        if(!cfg.openAiKey)return json(res,503,{error:'Falta OPENAI_API_KEY'});
        const analysis=await createInsight(video,cfg);
        store.saveInsight(id,analysis);return json(res,200,{insight:{analysis,createdAt:new Date().toISOString()}});
      }
      if(!match[3]&&req.method==='GET')return json(res,200,{video,history:store.snapshotHistory(id)});
    }
    if(u.pathname.startsWith('/api/'))return json(res,404,{error:'Ruta inexistente'});
    if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Método no permitido'});
    const staticPaths={'/':'index.html','/app.js':'app.js','/styles.css':'styles.css'};
    const filename=staticPaths[u.pathname];
    if(!filename)return json(res,404,{error:'Página inexistente'});
    const file=await readFile(resolve(here,filename));
    const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'}[extname(filename)]||'application/octet-stream';
    res.writeHead(200,{'Content-Type':mime,'Cache-Control':filename==='index.html'?'no-store':'public, max-age=3600','X-Content-Type-Options':'nosniff',
      'Content-Security-Policy':"default-src 'self'; img-src 'self' https: data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'; object-src 'none'"});
    if(req.method==='HEAD')return res.end();res.end(file);
  }catch(e){json(res,500,{error:'No se pudo completar la solicitud',detail:process.env.NODE_ENV==='production'?undefined:e.message});}
}
const server=http.createServer(handler);
server.listen(cfg.port,'0.0.0.0',()=>console.log(`VIRAL LAB Radar 24H escuchando en puerto ${cfg.port}; autoscaneo=${cfg.autoScan && !!cfg.apifyToken}`));
if(cfg.autoScan&&cfg.apifyToken){
  setTimeout(()=>runRefresh().then(r=>console.log('Radar: primera exploración',r.status,'videos=',r.accepted ?? 0,'errores=',r.errors?.join(' | ')||r.error||'ninguno')),3000).unref();
  setInterval(()=>runRefresh().then(r=>console.log('Radar: exploración programada',r.status,'videos=',r.accepted ?? 0,'errores=',r.errors?.join(' | ')||r.error||'ninguno')),cfg.pollMinutes*60000).unref();
}
const shutdown=()=>{server.close();store.close();};
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
