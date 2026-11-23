import test from 'node:test';
import assert from 'node:assert/strict';
import { enrich } from '../src/score.js';
import { normalizeTikTok, normalizeInstagram } from '../src/normalize.js';
import { RadarStore } from '../src/storage.js';
import { collect } from '../src/apify.js';
const now=new Date('2026-11-23T12:00:00Z');
const video={id:'tiktok:1234567890123456789',platform:'tiktok',externalId:'1234567890123456789',url:'https://www.tiktok.com/@creator/video/1234567890123456789',postedAt:'2026-11-22T19:00:00Z',author:'creator',caption:'Mi video',views:200,likes:10,shares:2,comments:2,followers:1000,market:'AR'};
const snap=(at,views)=>({observedAt:at,views,likes:10,comments:2,shares:2});
test('TikTok normalization accepts known actor shape and rejects unsafe urls',()=>{
 const v=normalizeTikTok({id:'1234567890123456789',webVideoUrl:video.url,createTime:1795359600,playCount:1000,diggCount:120,authorMeta:{name:'creator',fans:5000}});
 assert.equal(v?.views,1000);assert.equal(v?.followers,5000);
 assert.equal(normalizeTikTok({id:'123',webVideoUrl:'https://evil.example/video/123',createTime:1795359600}),null);
});
test('Instagram filter includes reels and discards images',()=>{
 const a=normalizeInstagram({shortCode:'abcDEF',url:'https://www.instagram.com/reel/abcDEF/',type:'Video',timestamp:'2026-11-23T08:00:00Z',videoPlayCount:500,likesCount:20});
 assert.equal(a.platform,'instagram');assert.equal(a.views,500);
 assert.equal(normalizeInstagram({shortCode:'abcDEF',url:'https://www.instagram.com/p/abcDEF/',type:'Sidecar',timestamp:'2026-11-23T08:00:00Z'}),null);
});
test('one capture does not pretend to know 24h growth',()=>{
 const v=enrich(video,[snap('2026-11-23T10:00:00Z',200)],now);
 assert.equal(v.confidence,'inicial');assert.equal(v.acceleration,null);assert.equal(v.viewsGained,null);assert.equal(v.new24,true)
});
test('three captures measure actual acceleration',()=>{
 const v=enrich(video,[snap('2026-11-23T08:00:00Z',100),snap('2026-11-23T10:00:00Z',200),snap('2026-11-23T12:00:00Z',500)],now);
 assert.equal(v.viewsGained,400);assert.equal(v.observedHours,4);assert.equal(v.velocity,100);assert.equal(v.acceleration,200);assert.equal(v.confidence,'alta');
});
test('video older than 24 hours can be marked as accelerating',()=>{
 const v=enrich({...video,postedAt:'2026-11-20T12:00:00Z'},[snap('2026-11-23T08:00:00Z',100),snap('2026-11-23T10:00:00Z',200),snap('2026-11-23T12:00:00Z',500)],now);
 assert.equal(v.new24,false);assert.equal(v.accelerated24,true);
});
test('store does not duplicate videos and preserves history',()=>{
 const db=new RadarStore();
 db.add([video],'2026-11-23T08:00:00Z');
 db.add([{...video,views:320}],'2026-11-23T10:00:00Z');
 assert.equal(db.counts(now).total,1);assert.equal(db.list({mode:'all',now})[0].viewsGained,120);
 assert.deepEqual(db.trackedUrls().tiktok,[video.url]);db.close();
});
test('collect calls exact 24h TikTok filter and follows previously known URL',async()=>{
 const called=[];
 const fetchImpl=async(url,opts)=>{
   const body=JSON.parse(opts.body);called.push({url,body});
   return {ok:true,json:async()=>{
      if(url.includes('tiktok'))return [{id:'1234567890123456789',webVideoUrl:video.url,createTimeISO:video.postedAt,playCount:200,diggCount:10}];
      return [{shortCode:'reel1',url:'https://www.instagram.com/reel/reel1/',type:'Video',timestamp:'2026-11-23T09:00:00Z',videoViewCount:100}]
   }};
 };
 const cfg={apifyToken:'test',market:'AR',tiktokQueries:['argentina'],instagramTags:['argentina'],perQuery:3};
 const r=await collect(cfg,{tiktok:[video.url],instagram:[]},fetchImpl);
 assert.equal(r.errors.length,0);assert.equal(r.videos.length,2);
 assert.equal(called[0].body.videoSearchDateFilter,'PAST_24_HOURS');
 assert.ok(called.some(c=>c.body.postURLs?.includes(video.url)));
});

test('discovery searches multiple themes within last 24h by top likes, not latest',async()=>{
 const requests=[];
 const fetchImpl=async(url,options)=>{requests.push({url,input:JSON.parse(options.body)});return {ok:true,json:async()=>[]};};
 const cfg={apifyToken:'test',market:'AR',perQuery:20,tiktokQueries:['humor','curiosidades','trending','transformacion'],instagramTags:['reelsargentina','viralreels']};
 const r=await collect(cfg,{tiktok:[],instagram:[]},fetchImpl);
 assert.deepEqual(r.errors,[]);
 const tik=requests.filter(x=>x.url.includes('tiktok-scraper'));
 assert.equal(tik.length,1);
 assert.equal(tik[0].input.searchQueries.length,4);
 assert.equal(tik[0].input.videoSearchSorting,'MOST_LIKED');
 assert.equal(tik[0].input.videoSearchDateFilter,'PAST_24_HOURS');
 assert.equal(tik[0].input.resultsPerPage,20);
});
test('weak posts do not receive distinguished viral quality, high-reach posts can',()=>{
 const weak=enrich({...video,views:120,likes:8,shares:0},[snap('2026-11-23T12:00:00Z',120)],now);
 assert.equal(weak.quality,'en observación');
 const strong=enrich({...video,views:240000,likes:14000,shares:1200},[{...snap('2026-11-23T12:00:00Z',240000),likes:14000,shares:1200}],now);
 assert.equal(strong.quality,'destacado');
 assert.ok(strong.score>weak.score);
});

test('recovers from unsupported multi-query popularity filter without faking trends',async()=>{
 const requests=[];
 const fetchImpl=async(url,opts)=>{
   const input=JSON.parse(opts.body);requests.push(input);
   if(input.videoSearchSorting==='MOST_LIKED')return {ok:false,status:400,text:async()=>JSON.stringify({error:{message:'Invalid filter combination'}})};
   return {ok:true,json:async()=>[{id:'1234567890123456789',webVideoUrl:video.url,createTimeISO:video.postedAt,playCount:50000,diggCount:4000,authorMeta:{name:'creator'}}]};
 };
 const cfg={apifyToken:'dummy',market:'AR',perQuery:20,tiktokQueries:['humor','curiosidades'],instagramTags:[]};
 const r=await collect(cfg,{tiktok:[],instagram:[]},fetchImpl);
 assert.deepEqual(r.errors,[]);
 assert.equal(r.videos.length,1);
 assert.equal(requests[0].videoSearchSorting,'MOST_LIKED');
 assert.equal(requests[1].videoSearchSorting,'LATEST');
 assert.ok(r.diagnostics.some(x=>x.mode==='fallback latest'));
});
