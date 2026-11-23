import { normalizeInstagram, normalizeTikTok } from './normalize.js';
const BASE='https://api.apify.com/v2/actors/';
function chunk(a,size) { const out=[];for(let i=0;i<a.length;i+=size)out.push(a.slice(i,i+size));return out; }
async function runActor(actor,input,token,fetchImpl=fetch) {
  const timeout = AbortSignal.timeout(180000);
  const response = await fetchImpl(`${BASE}${actor}/run-sync-get-dataset-items?timeout=175`, {
    method:'POST',headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify(input),signal:timeout
  });
  if (!response.ok) throw new Error(`Proveedor ${actor}: HTTP ${response.status}`);
  const data=await response.json();
  if (!Array.isArray(data)) throw new Error(`Proveedor ${actor}: respuesta inesperada`);
  return data;
}
export async function collect(config,tracked={tiktok:[],instagram:[]},fetchImpl=fetch) {
  if (!config.apifyToken) throw new Error('Falta APIFY_TOKEN');
  const errors=[],videos=[];
  const market=config.market;
  // Exact 24-hour search is provided by the third-party TikTok actor; final date filtering also runs server-side.
  for (const query of config.tiktokQueries) {
    try {
      const data=await runActor('clockworks~tiktok-scraper',{
        searchQueries:[query], searchSection:'/video',videoSearchSorting:'LATEST',videoSearchDateFilter:'PAST_24_HOURS',
        resultsPerPage:config.perQuery,proxyCountryCode:market==='AR'?'AR':'None',
        shouldDownloadVideos:false, downloadSubtitlesOptions:'NEVER_DOWNLOAD_SUBTITLES'
      },config.apifyToken,fetchImpl);
      videos.push(...data.map(x=>normalizeTikTok(x,market)).filter(Boolean));
    } catch(e){errors.push(`TikTok (${query}): ${e.message}`);}
  }
  for(const tag of config.instagramTags){
    try {
      const data=await runActor('apify~instagram-scraper',{
        resultsType:'posts', search:'#'+tag,searchType:'hashtag',searchLimit:1,
        resultsLimit:config.perQuery, onlyPostsNewerThan:'1 day'
      },config.apifyToken,fetchImpl);
      videos.push(...data.map(x=>normalizeInstagram(x,market)).filter(Boolean));
    } catch(e){errors.push(`Instagram (#${tag}): ${e.message}`);}
  }
  // Recheck previously discovered videos, including those now older than 24h. This is
  // necessary to detect a fresh 24h growth surge on a previously published video.
  for (const group of chunk(tracked.tiktok || [], 10)) {
    try {
      const data=await runActor('clockworks~tiktok-scraper',{
        postURLs:group,resultsPerPage:1,shouldDownloadVideos:false,
      },config.apifyToken,fetchImpl);
      videos.push(...data.map(x=>normalizeTikTok(x,market)).filter(Boolean));
    } catch(e){errors.push(`Seguimiento TikTok: ${e.message}`);}
  }
  for (const group of chunk(tracked.instagram || [], 10)) {
    try {
      const data=await runActor('apify~instagram-scraper',{
        resultsType:'posts',directUrls:group,resultsLimit:1,
      },config.apifyToken,fetchImpl);
      videos.push(...data.map(x=>normalizeInstagram(x,market)).filter(Boolean));
    } catch(e){errors.push(`Seguimiento Instagram: ${e.message}`);}
  }
  const cutoff=Date.now()-24*3600*1000;
  const previouslyTracked=new Set([...(tracked.tiktok||[]),...(tracked.instagram||[])]);
  const valid=videos.filter(x=>Date.parse(x.postedAt)<=Date.now()+3600000 &&
    (Date.parse(x.postedAt)>=cutoff || previouslyTracked.has(x.url)));
  return {videos:[...new Map(valid.map(v=>[v.id,v])).values()],errors};
}
