const $=s=>document.querySelector(s);
const state={mode:'new24',platform:'all',videos:[],configured:false,ai:false};
const nf=new Intl.NumberFormat('es-AR',{notation:'compact',maximumFractionDigits:1});
const pretty=n=>n===null||n===undefined?'—':nf.format(n);
const date=iso=>iso?new Date(iso).toLocaleString('es-AR',{dateStyle:'short',timeStyle:'short'}):'Nunca';
const dom=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;};
async function api(path,opts){const r=await fetch(path,{cache:'no-store',...opts});let data={};try{data=await r.json()}catch{}if(!r.ok)throw new Error(data.error||'No se pudo conectar');return data}
function renderEmpty(message,detail){const wrap=dom('div','empty-state');wrap.append(dom('div','empty-circle','◎'),dom('h3','',message),dom('p','',detail));$('#results').replaceChildren(wrap)}
function metric(label,value,accent=false){const w=dom('div','metric');w.append(dom('label','',label),dom('strong',accent?'accent':'',value));return w}
function renderCards(){
  if(!state.videos.length){
    const map={new24:['Todavía no hay videos nuevos','Este espacio mostrará videos publicados en las últimas 24 horas. La búsqueda empieza cuando conectás el proveedor y se completa la primera exploración.'],accelerated24:['Aún no hay aceleraciones comprobadas','Se necesitan varias mediciones del mismo video para detectar cambios de velocidad. No confundimos reproducciones acumuladas con crecimiento reciente.'],all:['Todavía no hay datos reales','Una vez conectado el proveedor y realizada la primera búsqueda aparecerán videos verificables, sus métricas y el enlace original.']};
    renderEmpty(...map[state.mode]);return;
  }
  const target=$('#results');target.replaceChildren();
  for(const v of state.videos){
    const card=dom('article','result-card');const top=dom('div','card-top');
    const thumbnail=v.thumbnail?dom('img','thumb'):dom('div','thumb',v.platform==='tiktok'?'♪':'◎');
    if(v.thumbnail){thumbnail.src=v.thumbnail;thumbnail.loading='lazy';thumbnail.alt='Miniatura del video';thumbnail.referrerPolicy='no-referrer';thumbnail.onerror=()=>{thumbnail.replaceWith(dom('div','thumb','◉'))}};
    const info=dom('div','card-info');const line=dom('div','meta-line');const pl=dom('span','platform-pill '+v.platform,v.platform==='tiktok'?'TikTok':'Instagram');
    line.append(pl,dom('span','',`${pretty(v.ageHours)} h desde publicación`));info.append(line);
    info.append(dom('div','result-title',v.caption?.trim()||'Video sin descripción disponible'),dom('div','author','@'+v.author));
    info.append(dom('div','confidence '+(v.confidence!=='inicial'?'verified':''),`${v.status} · Confianza ${v.confidence}`));
    top.append(thumbnail,info);card.append(top);
    const metrics=dom('div','card-metrics');metrics.append(metric('Reproducciones',pretty(v.views)),metric('Vistas ganadas',v.viewsGained===null?'Sin historial':'+'+pretty(v.viewsGained),v.viewsGained>0),metric('Radar Score',v.score+'/100'));
    card.append(metrics);
    const bottom=dom('div','card-bottom');const btn=dom('button','btn btn-primary','Ver análisis');btn.type='button';btn.addEventListener('click',()=>showVideo(v));
    const link=dom('a','','Ver original ↗');link.href=v.url;link.target='_blank';link.rel='noopener noreferrer';
    bottom.append(btn,link);card.append(bottom);target.append(card);
  }
}
async function load(){try{const [status,data]=await Promise.all([api('/api/status'),api(`/api/videos?mode=${state.mode}&platform=${state.platform}`)]);
  state.configured=status.configured;state.ai=status.aiConfigured;state.videos=data.videos;
  $('#stat-new').textContent=pretty(status.counts.new24);$('#stat-accelerated').textContent=pretty(status.counts.accelerated24);
  $('#stat-tracked').textContent=pretty(status.counts.tracked);$('#stat-total').textContent=pretty(status.counts.total);
  $('#setup').hidden=status.configured;$('#last-sync').textContent='Último escaneo: '+date(status.lastRun?.completed_at);
  $('#sidebar-status').textContent=status.running?'Explorando tendencias…':status.configured?'Fuente conectada':'Fuente sin conectar';
  document.querySelector('.dot').classList.toggle('ok',status.configured);
  document.querySelector('.ping').classList.toggle('ok',status.configured);
  renderCards();
  }catch(e){renderEmpty('No pudimos cargar el radar',e.message);$('#last-sync').textContent='Error de conexión';}}
function chart(history){const wrap=dom('div','chart-box');wrap.append(dom('div','chart-label',`Historial de reproducciones · ${history.length} mediciones`));
  if(history.length<2){wrap.append(dom('p','modal-p','La curva aparecerá después de la segunda medición.'));return wrap}
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 400 115');svg.setAttribute('role','img');svg.setAttribute('aria-label','Evolución de vistas según las capturas del radar');
  const values=history.map(h=>h.views),lo=Math.min(...values),hi=Math.max(...values),spread=Math.max(1,hi-lo);
  const points=history.map((h,i)=>`${20+i*360/Math.max(1,history.length-1)},${99-(h.views-lo)/spread*85}`).join(' ');
  const line=document.createElementNS('http://www.w3.org/2000/svg','polyline');line.setAttribute('points',points);line.setAttribute('fill','none');line.setAttribute('stroke','#a990ff');line.setAttribute('stroke-width','3');line.setAttribute('stroke-linecap','round');line.setAttribute('stroke-linejoin','round');svg.append(line);
  for(const n of history){ /* historical chart is a line without fabricated intermediate points */ }
  wrap.append(svg);return wrap}
async function showVideo(v){
 const d=$('#video-dialog');const container=$('#dialog-content');container.replaceChildren(dom('h2','modal-h2',v.caption?.trim()||'Video sin descripción'),dom('div','author','@'+v.author+' · '+(v.platform==='tiktok'?'TikTok':'Instagram')+' · publicado '+date(v.postedAt)));
 const stats=dom('div','modal-stats');const stat=(label,val)=>{const c=dom('div','');c.append(dom('span','',label),dom('strong','',val));return c};
 stats.append(stat('Visualizaciones',pretty(v.views)),stat('Velocidad / h',v.velocity===null?'Sin datos':pretty(v.velocity)),stat('Aceleración',v.acceleration===null?'Sin datos':(v.acceleration>0?'+':'')+v.acceleration+'%'));container.append(stats);
 container.append(dom('p','modal-p',v.confidence==='inicial'?'Solo hay una observación suficiente para estimar un puntaje preliminar. Hace falta continuar monitoreando para verificar aceleración.':`Se registraron ${v.observations} observaciones. Las vistas ganadas desde la primera medición disponible de las últimas 24 horas son ${pretty(v.viewsGained)} durante ${v.observedHours} horas.`));
 d.showModal();
 try{const [detail,ins]=await Promise.all([api(`/api/videos/${encodeURIComponent(v.id)}`),api(`/api/videos/${encodeURIComponent(v.id)}/insight`)]);container.append(chart(detail.history));
   const panel=dom('div','insight-box');panel.append(dom('h3','','Idea original con IA'));
   const text=dom('p','',ins.insight?.analysis||'Este video todavía no fue analizado con IA.');panel.append(text);
   if(!ins.insight){const btn=dom('button','btn btn-primary','Generar análisis con IA');btn.type='button';btn.addEventListener('click',async()=>{
     const key=prompt('Clave de administración para ejecutar IA (no se almacena):');if(!key)return;
     btn.disabled=true;btn.textContent='Analizando…';try{const r=await api(`/api/videos/${encodeURIComponent(v.id)}/insight`,{method:'POST',headers:{'X-Radar-Key':key}});text.textContent=r.insight.analysis;btn.remove()}catch(e){text.textContent=e.message;btn.disabled=false;btn.textContent='Reintentar análisis'}});panel.append(btn)}
   container.append(panel);
 }catch(e){container.append(dom('p','modal-p',e.message))}
}
for(const el of document.querySelectorAll('[data-mode]'))el.addEventListener('click',()=>{state.mode=el.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>{x.classList.toggle('active',x===el);x.setAttribute('aria-selected',String(x===el))});load()});
for(const el of document.querySelectorAll('[data-platform]'))el.addEventListener('click',()=>{state.platform=el.dataset.platform;document.querySelectorAll('[data-platform]').forEach(x=>x.classList.toggle('active',x===el));load()});
$('#close-dialog').addEventListener('click',()=>$('#video-dialog').close());$('#refresh-btn').addEventListener('click',()=>$('#admin-dialog').showModal());$('#close-admin').addEventListener('click',()=>$('#admin-dialog').close());
$('#execute-refresh').addEventListener('click',async()=>{
 const key=$('#admin-key').value;$('#admin-key').value='';if(!key){$('#admin-result').textContent='Ingresá la clave.';return}
 const btn=$('#execute-refresh');btn.disabled=true;$('#admin-result').textContent='Consultando proveedores…';try{const r=await api('/api/refresh',{method:'POST',headers:{'X-Radar-Key':key}});$('#admin-result').textContent=r.message||'Búsqueda iniciada';await load()}catch(e){$('#admin-result').textContent=e.message}finally{btn.disabled=false}});
$('#csv-btn').addEventListener('click',()=>{if(!state.videos.length)return;const fields=['platform','url','postedAt','author','views','likes','comments','shares','viewsGained','velocity','acceleration','score','confidence'];const clean=v=>'"'+String(v??'').replace(/^[=+@-]/,'\u0027$&').replaceAll('"','""')+'"';
 const csv=[fields.join(','),...state.videos.map(v=>fields.map(k=>clean(v[k])).join(','))].join('\r\n');const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='viral-lab-radar24.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),500)});
$('#method-link').addEventListener('click',e=>{e.preventDefault();alert('Radar Score es una puntuación experimental calculada con velocidad, aceleración, repercusión respecto al tamaño de la cuenta, interacción y compartidos. No es una predicción certificada de viralidad. Los videos recién descubiertos tienen confianza inicial. La aceleración necesita tres observaciones, y el indicador de ganancia registra el período realmente observado, no una extrapolación ficticia de 24 horas.')});
load();setInterval(()=>{if(!document.hidden)load()},90000);
