'use strict';
/* PENAlES AR - isolated deterministic rules, no DOM or network dependencies. */
(function(root){
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(+n)?+n:0));
 const TEAMS=['RIO SUR','NOVA FC','ATLANTICO','MALVINAS','TOROS FC','ACERO','SOLARIS','NORTE','COSTA BRAVA','RAYOS','HALCONES','OMEGA','DRAGONES','PLATENSE','AURORA','PACIFICO','CENTAUROS','IMPERIO','CORONA','AZUL REAL','NEON FC','MONARCA','INVICTOS','METEORO','PUMAS','TITANES','ALPES','FENIX','TRUENO','OLIMPO','FORTALEZA','CIVIDOM'];
 function createMatch(mode='cpu',difficulty=1){return {mode,difficulty:clamp(difficulty,0,2),scores:[0,0],attempts:[0,0],history:[],turn:0,winner:null,sudden:false,done:false};}
 function activeSide(match){return match.turn%2;}
 function resolve(aim,save){
  const a={x:clamp(aim?.x,-1.3,1.3),y:clamp(aim?.y,-.2,1.3),power:clamp(aim?.power,.25,1)};
  const s={x:clamp(save?.x,-1,1),y:clamp(save?.y,0,1)};
  const out=Math.abs(a.x)>1.045||a.y>1.045||a.y<.035;
  const distance=Math.sqrt(((a.x-s.x)/.57)**2+((a.y-s.y)/.41)**2);
  return {goal:!out&&distance>1, saved:!out&&distance<=1,out,aim:a,save:s};
 }
 function apply(match,aim,save){
  if(match.done)throw Error('La tanda terminó');
  const r=resolve(aim,save),side=activeSide(match);
  const m={...match,scores:[...match.scores],attempts:[...match.attempts],history:[...match.history]};
  m.attempts[side]++;if(r.goal)m.scores[side]++;
  m.history.push({index:m.turn,side,...r});
  m.turn++;
  const [a,b]=m.attempts,[x,y]=m.scores;
  if(a<=5&&b<=5){
   if(x>y+(5-b)){m.done=true;m.winner=0;}
   else if(y>x+(5-a)){m.done=true;m.winner=1;}
   else if(a===5&&b===5){
     if(x!==y){m.done=true;m.winner=x>y?0:1;}
     else m.sudden=true;
   }
  }
  if(m.sudden&&!m.done&&m.attempts[0]===m.attempts[1]&&m.scores[0]!==m.scores[1]){
    m.done=true;m.winner=m.scores[0]>m.scores[1]?0:1;
  }
  return m;
 }
 function aiAim(rng=Math.random){
  const x=(rng()-.5)*1.93;const y=.13+rng()*.83;
  return {x,y,power:.68+rng()*.32};
 }
 function aiSave(aim,difficulty=1,rng=Math.random){
  const skill=[.30,.47,.62][Math.floor(clamp(difficulty,0,2))];
  if(rng()<skill)return {x:clamp(aim.x+(rng()-.5)*.42,-1,1),y:clamp(aim.y+(rng()-.5)*.30,0,1)};
  return {x:(rng()-.5)*2,y:.1+rng()*.84};
 }
 function seeded(seed){let n=(seed>>>0)||1;return ()=>{n=(Math.imul(1664525,n)+1013904223)>>>0;return n/4294967296;};}
 function makeCup(){
  const seed=(Date.now()^((Math.random()*4294967295)>>>0))>>>0,r=seeded(seed);
  const others=TEAMS.filter(x=>x!=='CIVIDOM').sort(()=>r()-.5);
  const opponents=others.slice(0,3);
  const knockout=['OCTAVOS','CUARTOS','SEMIFINAL','FINAL'].map((v,i)=>({stage:v,team:others[3+i*2]||'NOVA FC'}));
  return {v:1,seed,phase:0,cursor:0,points:0,played:0,goalDiff:0,opponents,knockout,records:[],status:'active',groupPosition:null,startedAt:Date.now()};
 }
 function cupStage(c){return c.phase===0?'FASE DE GRUPOS':c.phase===1?'OCTAVOS':c.phase===2?'CUARTOS':c.phase===3?'SEMIFINAL':'GRAN FINAL';}
 function cupOpponent(c){return c.phase===0?c.opponents[c.cursor]:c.knockout[c.phase-1]?.team||'NOVA FC';}
 function recordCup(c,won,scoreFor,scoreAgainst){
  if(c.status!=='active')throw Error('Copa ya terminada');
  const next={...c,records:[...c.records],knockout:[...c.knockout]};
  next.records.push({phase:c.phase,opponent:cupOpponent(c),won:!!won,for:scoreFor,against:scoreAgainst});
  next.played++;next.goalDiff+=scoreFor-scoreAgainst;
  if(c.phase===0){
   next.points+=won?3:0;next.cursor++;
   if(next.cursor===3){
    // Simulate the other three group fixtures with 0-3 points each; rank by points, GD and stable slot.
    const rng=seeded(c.seed),teams=[{name:'CIVIDOM',points:next.points,gd:next.goalDiff,slot:0},...c.opponents.map((name,i)=>({name,points:0,gd:0,slot:i+1}))];
    const pairs=[[1,2],[1,3],[2,3]];
    for(const [a,b] of pairs){
     let win=rng()<.5?a:b;
     teams[win].points+=3;teams[win].gd+=1;teams[win===a?b:a].gd-=1;
    }
    for(const rec of next.records){
     const t=teams.find(x=>x.name===rec.opponent);
     if(t){if(!rec.won)t.points+=3;t.gd+=rec.against-rec.for;}
    }
    const rank=teams.sort((a,b)=>b.points-a.points||b.gd-a.gd||a.slot-b.slot);
    next.groupPosition=rank.findIndex(x=>x.name==='CIVIDOM')+1;
    if(next.groupPosition>2)next.status='eliminated';
    else {next.phase=1;next.cursor=0;}
   }
  } else if(!won)next.status='eliminated';
  else if(c.phase===4)next.status='champion';
  else next.phase++;
  return next;
 }
 root.PenalesCore=Object.freeze({clamp,createMatch,activeSide,resolve,apply,aiAim,aiSave,seeded,makeCup,cupStage,cupOpponent,recordCup});
})(typeof window!=='undefined'?window:globalThis);
