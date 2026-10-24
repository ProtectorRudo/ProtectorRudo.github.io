'use strict';
/* RODEADOS 360 — local personal progress. Never represents online leaderboard. */
(function(root){
const prefix='mc-rodeados-progress-v1';
const achievements={
 first:'PRIMER ROBOT · Superaste tu primera invasión',
 hunter:'CAZADOR · Derrotaste 20 robots en total',
 sharp:'OJO DE ÁGUILA · 70% de precisión y 8 impactos',
 streak:'IMPARABLE · Combinación máxima de 10',
 survivor:'INQUEBRANTABLE · Sobreviviste 90 segundos',
 boss:'CAZAGIGANTES · Derrotaste al jefe final'
};
const missions=[
 {text:'Derribá 12 robots en una misma partida',prop:'kills',min:12},
 {text:'Conseguí al menos 2.000 puntos',prop:'score',min:2000},
 {text:'Alcanzá una racha de 8',prop:'bestCombo',min:8},
 {text:'Resistí al menos 60 segundos',prop:'elapsed',min:60}
];
function dateKey(d=new Date()){return d.getFullYear()+''+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0')}
function daily(d=new Date()){
 const k=dateKey(d),n=parseInt(k,10),q=missions[n%missions.length];
 return {date:k,...q};
}
function load(storage=root.localStorage){
 try{const data=JSON.parse(storage.getItem(prefix)||'null');
 if(data&&data.v===1&&Array.isArray(data.scores))return data;}catch(_){}
 return {v:1,plays:0,totalKills:0,totalShots:0,totalHits:0,scores:[],achievements:[],lastDaily:''};
}
function finish(g,storage=root.localStorage,d=new Date()){
 const progress=load(storage),date=daily(d);
 const shots=Math.max(0,Math.floor(g.shots||0)),hits=Math.max(0,Math.floor(g.hits||0));
 const kills=Math.max(0,Math.floor(g.kills||0)),score=Math.max(0,Math.round(g.score||0));
 progress.plays++;progress.totalKills+=kills;progress.totalShots+=shots;progress.totalHits+=hits;
 progress.scores.push({mode:g.mode||'survival',score,kills,accuracy:shots?Math.round(hits/shots*100):0,date:dateKey(d)});
 progress.scores.sort((a,b)=>b.score-a.score);progress.scores=progress.scores.slice(0,20);
 const unlock=(id)=>{if(!progress.achievements.includes(id))progress.achievements.push(id)};
 const before=new Set(progress.achievements);
 if(kills)unlock('first');
 if(progress.totalKills>=20)unlock('hunter');
 if(hits>=8&&shots&&hits/shots>=.70)unlock('sharp');
 if((g.bestCombo||0)>=10)unlock('streak');
 if((g.elapsed||0)>=90&&(g.lives||0)>0)unlock('survivor');
 if(g.mode==='boss'&&g.announcedBoss&&!g.enemies?.some(e=>e.type==='boss'))unlock('boss');
 const dailyWon=progress.lastDaily===date.date||(g[date.prop]||0)>=date.min;
 if(dailyWon)progress.lastDaily=date.date;
 try{storage.setItem(prefix,JSON.stringify(progress))}catch(_){}
 return {progress,unlocked:progress.achievements.filter(x=>!before.has(x)).map(x=>achievements[x]),daily:date,dailyWon,
 ranking:progress.scores.slice(0,5)};
}
root.RodeadosProgress={achievements,missions,dateKey,daily,load,finish};
if(typeof module!=='undefined'&&module.exports)module.exports=root.RodeadosProgress;
})(typeof globalThis!=='undefined'?globalThis:this);
