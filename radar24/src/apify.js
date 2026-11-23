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
  const errors=[],videos=[],jobs=[];
  const market=config.market;
  // Execute independent platform requests concurrently. Serial synchronous calls made
  // a two-platform attempt take up to six minutes and obscured which source failed.
  function schedule(source,actor,input,normalize) {
    jobs.push(runActor(actor,input,config.apifyToken,fetchImpl)
      .then(rows => { videos.push(...rows.map(x=>normalize(x,market)).filter(Boolean)); })
      .catch(error => { errors.push(`${source}: ${error.message}`); }));
  }
  for (const query of config.tiktokQueries) {
    schedule(`TikTok (${query})`,'clockworks~tiktok-scraper',{
      searchQueries:[query], searchSection:'/video',videoSearchSorting:'LATEST',videoSearchDateFilter:'PAST_24_HOURS',
      resultsPerPage:config.perQuery,proxyCountryCode:market==='AR'?'AR':'None',
      shouldDownloadVideos:false, downloadSubtitlesOptions:'NEVER_DOWNLOAD_SUBTITLES'
    },normalizeTikTok);
  }
  for(const tag of config.instagramTags){
    schedule(`Instagram (#${tag})`,'apify~instagram-scraper',{
      resultsType:'posts', search:'#'+tag,searchType:'hashtag',searchLimit:1,
      resultsLimit:config.perQuery, onlyPostsNewerThan:'1 day'
    },normalizeInstagram);
  }
  for (const group of chunk(tracked.tiktok || [], 10)) {
    schedule('Seguimiento TikTok','clockworks~tiktok-scraper',{
      postURLs:group,resultsPerPage:1,shouldDownloadVideos:false,
    },normalizeTikTok);
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
  return {videos:[...new Map(valid.map(v=>[v.id,v])).values()],errors};
}
