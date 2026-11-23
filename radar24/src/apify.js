import { normalizeInstagram, normalizeTikTok } from './normalize.js';
const BASE='https://api.apify.com/v2/actors/';
function chunk(a,size) { const out=[];for(let i=0;i<a.length;i+=size)out.push(a.slice(i,i+size));return out; }
async function runActor(actor,input,token,fetchImpl=fetch) {
  const timeout = AbortSignal.timeout(180000);
  const response = await fetchImpl(`${BASE}${actor}/run-sync-get-dataset-items?timeout=175`, {
    method:'POST',headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify(input),signal:timeout
  });
  if (!response.ok) {
    let reason='';
    try {
      const payload=await response.text();
      const body=JSON.parse(payload);
      reason=String(body?.error?.message||body?.message||'').slice(0,320);
    } catch { reason='Respuesta no interpretable'; }
    reason=reason.replaceAll(token,'[REDACTED]').replace(/token=[^&\\s]+/ig,'token=[REDACTED]');
    throw new Error(`Proveedor ${actor}: HTTP ${response.status}${reason?' — '+reason:''}`);
  }
  const data=await response.json();
  if (!Array.isArray(data)) throw new Error(`Proveedor ${actor}: respuesta inesperada`);
  return data;
}
export async function collect(config,tracked={tiktok:[],instagram:[]},fetchImpl=fetch) {
  if (!config.apifyToken) throw new Error('Falta APIFY_TOKEN');
  const errors=[],videos=[],jobs=[],diagnostics=[];
  const market=config.market;
  function schedule(source,actor,input,normalize,{fallback=false,marketOverride=null}={}) {
    async function requestRows(){
      try { return await runActor(actor,input,config.apifyToken,fetchImpl); }
      catch(error) {
        if (!fallback || !error.message.includes('HTTP 400')) throw error;
        // Some scraper versions reject combined sorting + date filters.
        // Fall back to latest search, then split queries if the batch is unsupported.
        diagnostics.push({source,mode:'fallback latest',reason:error.message.slice(0,140)});
        const latest={...input,videoSearchSorting:'LATEST'};
        try { return await runActor(actor,latest,config.apifyToken,fetchImpl); }
        catch(second){
          if(!second.message.includes('HTTP 400') || !(input.searchQueries?.length>1)) throw second;
          const settled=[];
          for(const query of input.searchQueries){
            try { settled.push({status:'fulfilled',value:await runActor(actor,{...latest,searchQueries:[query]},config.apifyToken,fetchImpl)}); }
            catch(reason){ settled.push({status:'rejected',reason}); }
          }
          const successful=settled.filter(x=>x.status==='fulfilled').flatMap(x=>x.value);
          const failed=settled.filter(x=>x.status==='rejected');
          if(!successful.length && failed.length) throw failed[0].reason;
          diagnostics.push({source,mode:'individual queries',failed:failed.length});
          return successful;
        }
      }
    }
    jobs.push(requestRows().then(rows=>{
      const normalized=rows.map(x=>normalize(x,marketOverride||market)).filter(Boolean);
      diagnostics.push({source,fetched:rows.length,normalized:normalized.length});
      videos.push(...normalized);
    }).catch(error=>{errors.push(`${source}: ${error.message}`);}));
  }
  // TikTok Explore is a curated topic feed, independent from keyword search.
  // Its category keys are documented by the provider. Limit volume to manage cost;
  // source dates are verified against the same 24-hour cutoff below.
  if(config.exploreEnabled){
    schedule('TikTok Explore','clockworks~tiktok-explore-scraper',{
      exploreCategoryTypes:[
        'pc_web_explorePage_all',
        'pc_web_explorePage_topics_comedy',
        'pc_web_explorePage_topics_daily_life'
      ],
      resultsPerPage:config.explorePerCategory||20,
      shouldDownloadVideos:false,shouldDownloadCovers:false,
      shouldDownloadSubtitles:false,proxyCountryCode:'None'
    },normalizeTikTok,{marketOverride:'GLOBAL'});
  }
  // A single actor run can search several topics. Prefer the highest-liked
  // videos in the last 24h, not merely the latest low-performing uploads.
  // This increases candidate quality while avoiding one paid actor per keyword.
  if (config.tiktokQueries.length) {
    if(config.tiktokProvider==='clockworks') {
      schedule('TikTok destacados 24H','clockworks~tiktok-scraper',{
      searchQueries:config.tiktokQueries, searchSection:'/video',
      videoSearchSorting:'MOST_LIKED', videoSearchDateFilter:'PAST_24_HOURS',
      resultsPerPage:config.perQuery,
      proxyCountryCode:market==='AR'?'AR':'None',
      shouldDownloadVideos:false, downloadSubtitlesOptions:'NEVER_DOWNLOAD_SUBTITLES'
    },normalizeTikTok,{fallback:true});
    } else {
      schedule('TikTok viral 24H','deepmine~tiktok-scraper',{
        searchQueries:config.tiktokQueries,
        resultsPerInput:config.perQuery,
        sortOrder:'mostViews',
        datePosted:'thisWeek',
        postedAfter:'1 day'
      },normalizeTikTok);
    }
  }
  for(const tag of config.instagramTags){
    schedule(`Instagram (#${tag})`,'apify~instagram-scraper',{
      resultsType:'posts', search:'#'+tag,searchType:'hashtag',searchLimit:1,
      resultsLimit:config.perQuery, onlyPostsNewerThan:'1 day'
    },normalizeInstagram);
  }
  for (const group of chunk(tracked.tiktok || [], 10)) {
    if(config.tiktokProvider==='clockworks'){
      schedule('Seguimiento TikTok','clockworks~tiktok-scraper',{
        postURLs:group,resultsPerPage:1,shouldDownloadVideos:false,
      },normalizeTikTok);
    } else {
      schedule('Seguimiento TikTok','deepmine~tiktok-scraper',{
        startUrls:group,resultsPerInput:1
      },normalizeTikTok);
    }
  }
  for (const group of chunk(tracked.instagram || [], 10)) {
    schedule('Seguimiento Instagram','apify~instagram-scraper',{
      resultsType:'posts',directUrls:group,resultsLimit:1,
    },normalizeInstagram);
  }
  await Promise.all(jobs);
  const cutoff=Date.now()-24*3600*1000;
  const previouslyTracked=new Set([...(tracked.tiktok||[]),...(tracked.instagram||[])]);
  const valid=videos.filter(x=>Date.parse(x.postedAt)<=Date.now()+3600000 &&
    (Date.parse(x.postedAt)>=cutoff || previouslyTracked.has(x.url)));
  return {videos:[...new Map(valid.map(v=>[v.id,v])).values()],errors,diagnostics};
}
