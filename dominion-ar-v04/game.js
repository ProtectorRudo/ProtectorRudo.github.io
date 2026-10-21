export function createBattle(THREE,field,getCamera,cloneSkeleton){
 const catalogue=[
  {name:'Asalto',icon:'🪖',cost:3,hp:110,dmg:16,speed:.052,range:.082,rate:.76,color:0x6dcfaf},
  {name:'Explorador',icon:'⚡',cost:2,hp:72,dmg:12,speed:.087,range:.073,rate:.65,color:0xb1dc79},
  {name:'Blindado',icon:'🛡️',cost:5,hp:255,dmg:24,speed:.028,range:.085,rate:1.05,color:0x83a8be},
  {name:'Tirador',icon:'🎯',cost:4,hp:70,dmg:38,speed:.037,range:.17,rate:1.55,color:0xdfc18b},
  {name:'Dron',icon:'🚁',cost:4,hp:94,dmg:17,speed:.070,range:.11,rate:.76,color:0x9dc8e8,air:true},
  {name:'Ingeniero',icon:'🔧',cost:3,hp:95,dmg:10,speed:.049,range:.078,rate:.85,color:0xb9abe0,heal:true},
  {name:'Artillería',icon:'💥',cost:5,spell:true,color:0xeeb178},
  {name:'Escudo',icon:'🧱',cost:3,shield:true,color:0x8fc5ef}
 ];
 const lanes=[-.20,0,.20],teamColors=[0x78eac0,0xff987b];
 const group=new THREE.Group();field.add(group);
 const style=document.createElement('style');
 style.textContent=[
  '#dbattle{display:none;position:absolute;inset:0;z-index:10;pointer-events:none;font-family:system-ui,-apple-system,sans-serif;color:#eefaf2}',
  '#dbattle.open{display:block}',
  '#dbattle .dbtop{position:absolute;top:calc(9px + env(safe-area-inset-top));left:9px;right:9px;display:flex;justify-content:space-between;gap:7px}',
  '#dbattle .dbstat{padding:8px 10px;text-align:center;min-width:73px;background:#0a1d27e8;border:1px solid #99e8c46b;border-radius:11px;backdrop-filter:blur(10px)}',
  '#dbattle .dbstat small{display:block;color:#a2cbc2;font-size:9px;letter-spacing:.06em}',
  '#dbattle .dbstat strong{display:block;font-size:16px;font-variant-numeric:tabular-nums}',
  '#dbattle .dbstat.opp strong{color:#ffa98a}',
  '#dbattle .dbprogress{width:100%;height:4px;background:#25433f;margin-top:6px;border-radius:4px;overflow:hidden}',
  '#dbattle .dbprogress i{display:block;width:100%;height:100%;background:#91efc3}',
  '#dbattle .dbbottom{position:absolute;bottom:calc(6px + env(safe-area-inset-bottom));left:5px;right:5px;pointer-events:auto;background:#071b24e9;backdrop-filter:blur(15px);border:1px solid #9fe7c366;border-radius:16px;padding:8px 7px}',
  '#dbattle .dbresource{display:flex;align-items:center;justify-content:space-between;color:#cdb6ff;font-size:11px;margin-bottom:5px}',
  '#dbattle .dbenergy{height:8px;background:#51445d;border-radius:8px;overflow:hidden;margin-bottom:8px}',
  '#dbattle .dbenergy i{display:block;height:100%;width:50%;background:linear-gradient(90deg,#a28cff,#dcc6ff)}',
  '#dbattle .dbdeck{display:flex;gap:5px}',
  '#dbattle .dbcard{position:relative;flex:1;min-width:0;min-height:82px;touch-action:none;user-select:none;background:linear-gradient(145deg,#264850,#0b232f);color:#e5fff0;border:1px solid #6f999f;border-radius:11px;padding:5px 2px;display:flex;align-items:center;flex-direction:column;justify-content:space-around}',
  '#dbattle .dbcard strong{font-size:22px}#dbattle .dbcard span{font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;font-weight:800}',
  '#dbattle .dbcard em{position:absolute;top:2px;left:3px;display:grid;place-items:center;width:17px;height:17px;font-style:normal;border-radius:50%;background:#d2bcff;color:#221832;font-weight:900;font-size:11px}',
  '#dbattle .dbcard.chosen{outline:2px solid #aaffd1;outline-offset:-2px;box-shadow:0 0 14px #5cf1a253}',
  '#dbattle .dbcard.locked{opacity:.48;filter:grayscale(.8)}',
  '#dbattle .dblanes{display:none;gap:7px;margin-bottom:7px}#dbattle .dblanes.on{display:flex}',
  '#dbattle .dblanes button{flex:1;padding:11px 3px;background:#1b5350;color:#f1fff8;border:1px solid #95e7bc;border-radius:10px;font-weight:750;font-size:10px}',
  '#dbattle .dbintro{position:absolute;left:10px;right:10px;top:50%;max-width:410px;margin:auto;transform:translateY(-50%);pointer-events:auto;text-align:center;background:#081b26f1;border:1px solid #a6ebc981;backdrop-filter:blur(20px);border-radius:19px;padding:20px 16px;box-shadow:0 16px 45px #000b}',
  '#dbattle .dbintro h2{font-size:23px;margin:6px 0 11px}#dbattle .dbintro p{font-size:12px;color:#c0d9d1;line-height:1.55;margin:0 0 15px}',
  '#dbattle button.dbprimary{background:#a5f0cb;color:#123725;border:0;border-radius:11px;font-size:13px;font-weight:850;padding:14px 18px}',
  '#dbattle button.dbaux{background:#203840;color:#d4eee2;border:1px solid #6a9288;border-radius:9px;font-size:10px;font-weight:700;padding:7px}',
  '#dbattle .dbtoast{position:absolute;top:48%;left:50%;transform:translate(-50%,-50%);border:1px solid #9af0cd70;background:#09212be6;padding:10px 16px;font-weight:780;font-size:13px;text-align:center;border-radius:11px;max-width:90vw;opacity:0;transition:opacity .2s}',
  '#dbattle .dbtoast.visible{opacity:1}',
  'body.dominion-match header,body.dominion-match footer{opacity:0;pointer-events:none!important}',
  '@media(max-height:650px){#dbattle .dbbottom{padding:4px 6px}#dbattle .dbcard{min-height:66px}#dbattle .dbcard strong{font-size:18px}#dbattle .dbtop{top:calc(2px + env(safe-area-inset-top))}}'
 ].join('');
 // HUD visual styles are in battle-ui.css, avoiding the old UI cascade.

 const hud=document.createElement('div');hud.id='dbattle';hud.innerHTML=[
  '<div class="dbtop"><div class="dbstat"><small>MI BASE</small><strong id="mybase">650</strong><div class="dbprogress"><i id="mybar"></i></div></div>',
  '<div class="dbstat"><small>TIEMPO</small><strong id="matchclock">3:00</strong><small id="phase">DUELO</small></div>',
  '<div class="dbstat opp"><small>IA RIVAL</small><strong id="enemybase">650</strong><div class="dbprogress"><i id="enemybar" style="background:#f3a189"></i></div></div></div>',
  '<div class="dbtoast" id="dbtoast"></div>',
  '<div class="dbintro" id="intro"><div class="dbtag">DOMINION / OPERACIÓN 01</div>',
  '<h2 id="introtitle">La mesa es tu campo de batalla.</h2><p id="introdesc">Elegí una carta, arrastrala sobre la mesa y soltala para desplegar. Destruí la base rival antes que la tuya.</p>',
  '<div class="dbsteps"><span><b>01</b> Elegí una carta</span><span><b>02</b> Arrastrá a la mesa</span><span><b>03</b> Atacá su base</span></div>',
  '<button id="launch" class="dbprimary">▶ INICIAR BATALLA</button><div><button id="close" class="dbaux" style="margin-top:10px">SOLO MIRAR LA ARENA</button></div></div>',
  '<div class="dbtaplayer" id="taplayer"></div><div class="dbghost" id="dragghost"></div><div class="dbguide" id="dragguide">Arrastrá la carta sobre tu mitad de la mesa</div>',
  '<div class="dbbottom" id="dbbottom" style="display:none"><div class="dbresource"><span>✦ ENERGÍA <b id="energyvalue">5 / 10</b></span>',
  '<span id="nextcard">PRÓXIMA: DRON</span><button id="sound" class="dbaux" aria-label="Activar sonido">🔇</button><button id="quit" class="dbaux">SALIR ×</button></div>',
  '<div class="dbenergy"><i id="energyfill"></i></div>',
  '<div class="dblanes" id="lanecontrols"><button data-lane="0">◀ IZQUIERDA</button><button data-lane="1">● CENTRO</button><button data-lane="2">DERECHA ▶</button></div>',
  '<div class="dbdeck" id="carddeck"></div><div class="dbtutorial" id="dbtip">DESLIZÁ UNA CARTA A LA ARENA · O TOCÁ UNA CARTA Y LA MESA</div></div>'
 ].join('');
 document.getElementById('ui').appendChild(hud);
 const el=s=>hud.querySelector('#'+s);
 const H={mine:el('mybase'),enemy:el('enemybase'),mybar:el('mybar'),enemybar:el('enemybar'),clock:el('matchclock'),phase:el('phase'),toast:el('dbtoast'),intro:el('intro'),title:el('introtitle'),desc:el('introdesc'),launch:el('launch'),bottom:el('dbbottom'),energy:el('energyvalue'),energyfill:el('energyfill'),next:el('nextcard'),deck:el('carddeck'),lanes:el('lanecontrols'),tap:el('taplayer'),ghost:el('dragghost'),guide:el('dragguide'),tip:el('dbtip'),sound:el('sound')};
 let status='idle',time=0,maxTime=150,overtime=false,energy=6,enemyEnergy=4,units=[],buildings=[],effects=[],hand=[0,1,2,3],next=4,selected=null,aiCooldown=3.8,unitSerial=0,finalNotice=false,notifyUntil=0,elapsedHud=0,deckRenderKey='',model=null,cloneFn=cloneSkeleton,modelAnimations=[];
 const rng=(a,b)=>a+(b-a)*Math.random();
 function signal(msg,duration=1.1){H.toast.textContent=msg;H.toast.classList.add('visible');notifyUntil=duration;}
 let soundOn=false,audioContext=null;
 function feedback(kind='deploy'){
  if(typeof navigator!=='undefined'&&typeof navigator.vibrate==='function'&&kind!=='shot')try{navigator.vibrate(kind==='hit'?25:12)}catch(e){}
  if(!soundOn)return;
  try{audioContext??=new (window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume();
   const osc=audioContext.createOscillator(),gain=audioContext.createGain(),t=audioContext.currentTime;
   osc.type=kind==='hit'?'sawtooth':'triangle';osc.frequency.setValueAtTime(kind==='hit'?130:kind==='win'?580:350,t);
   osc.frequency.exponentialRampToValueAtTime(kind==='hit'?60:200,t+.11);gain.gain.setValueAtTime(.018,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.14);osc.connect(gain);gain.connect(audioContext.destination);osc.start(t);osc.stop(t+.15);
  }catch(e){soundOn=false;}
 }
 function box(w,h,d,x,y,z,mat,parent){const g=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);g.position.set(x,y,z);g.castShadow=true;g.receiveShadow=true;parent.add(g);return g;}
 function cleanup(){for(const obj of [...units,...buildings])obj.mesh?.parent?.remove(obj.mesh);for(const effect of effects)effect.mesh.parent?.remove(effect.mesh);units=[];buildings=[];effects=[];}
 function healthBar(parent,team,height){
  const g=new THREE.Group();g.position.y=height;parent.add(g);
  const bg=new THREE.Mesh(new THREE.PlaneGeometry(.051,.007),new THREE.MeshBasicMaterial({color:0x0a2228,side:THREE.DoubleSide,depthTest:false}));g.add(bg);
  const fg=new THREE.Mesh(new THREE.PlaneGeometry(.049,.005),new THREE.MeshBasicMaterial({color:team?0xf28b78:0x6cefbc,side:THREE.DoubleSide,depthTest:false}));fg.position.z=.002;g.add(fg);
  return {g,fg,set(q){const r=Math.max(0,Math.min(1,q));fg.scale.x=r;fg.position.x=-.0245*(1-r);}};
 }
 function createBuilding(team,lane,main){
  const hp=main?650:245,x=main?0:lanes[lane],z=(team?1:-1)*(main?.225:.169);
  const b={team,lane,main,x,z,hp,max:hp,shield:0,alive:true,cooldown:0};
  const g=new THREE.Group();g.position.set(x,0,z);group.add(g);
  const concrete=new THREE.MeshStandardMaterial({color:0x4d5f61,roughness:.8});
  const accent=new THREE.MeshStandardMaterial({color:team?0xb76e60:0x4eaa8e,roughness:.52,metalness:.35});
  const foot=new THREE.Mesh(new THREE.CylinderGeometry(main?.046:.029,main?.052:.038,.015,8),concrete);foot.position.y=.012;g.add(foot);
  box(main?.06:.043,main?.051:.041,main?.039:.031,0,main?.046:.041,0,accent,g);
  box(main?.016:.012,.014,main?.035:.026,0,main?.079:.066,team?-.017:.017,concrete,g);
  b.bar=healthBar(g,team,main?.103:.082);b.mesh=g;buildings.push(b);
  return b;
 }
 function setup(){
  cleanup();time=0;maxTime=150;overtime=false;energy=6;enemyEnergy=4;selected=null;next=4;hand=[0,1,2,3];aiCooldown=3.8;elapsedHud=0;deckRenderKey='';finalNotice=false;
  H.tap.classList.remove('on');H.guide.classList.remove('on');H.ghost.classList.remove('on');
  for(const team of [0,1]){createBuilding(team,1,true);createBuilding(team,0,false);createBuilding(team,2,false);}
  drawHUD();
 }
 const enemyMain=team=>buildings.find(b=>b.team===team&&b.main);
 function spawnVisual(card,team){
  const g=new THREE.Group(),body=new THREE.Group();g.add(body);
  const fabric=new THREE.MeshStandardMaterial({color:team?0xb27866:card.color,metalness:.10,roughness:.72});
  const armor=new THREE.MeshStandardMaterial({color:0x243940,metalness:.4,roughness:.55});
  if(card.air){
   box(.041,.013,.043,0,.080,0,armor,body);box(.069,.005,.009,0,.087,0,fabric,body);
   for(const x of [-.036,.036])for(const z of [-.027,.027]){
    const disk=new THREE.Mesh(new THREE.TorusGeometry(.013,.002,4,12),fabric);
    disk.position.set(x,.09,z);disk.rotation.x=Math.PI/2;body.add(disk);
   }
  }else{
   box(card.name==='Blindado'?.043:.031,.040,.022,0,.05,0,fabric,body);
   box(.034,.020,.026,0,.06,0,armor,body);
   const face=new THREE.Mesh(new THREE.SphereGeometry(.012,10,8),fabric);face.position.y=.089;body.add(face);
   box(.028,.011,.025,0,.100,0,armor,body);
   const limbs=[];
   for(const s of [-1,1]){
    const a=new THREE.Group();a.position.set(s*.02,.070,0);body.add(a);box(.01,.031,.012,0,-.016,0,fabric,a);limbs.push(a);
    const leg=new THREE.Group();leg.position.set(s*.01,.035,0);body.add(leg);box(.013,.029,.015,0,-.014,0,fabric,leg);limbs.push(leg);
   }
   g.userData.limbs=limbs;
   box(.010,.009,card.name==='Tirador'?.074:.039,.008,.058,card.name==='Tirador'?.033:.02,armor,body);
   if(card.name==='Blindado'){box(.045,.034,.03,0,.058,0,armor,body);box(.055,.008,.040,0,.083,.004,fabric,body);}
   if(card.name==='Ingeniero')box(.029,.032,.015,0,.064,-.018,new THREE.MeshStandardMaterial({color:0x5b6995,metalness:.3,roughness:.6}),body);
   if(card.name==='Tirador')box(.012,.009,.014,.008,.068,.02,fabric,body);
   if(card.name==='Explorador')body.scale.setScalar(.84);
   if(model&&cloneFn&&(card.name==='Asalto'||card.name==='Explorador'||card.name==='Tirador')){
    try{
     const visual=cloneFn(model.scene),bounds=new THREE.Box3().setFromObject(visual),dims=bounds.getSize(new THREE.Vector3());
     if(dims.y>0){
      const k=.109/dims.y;visual.scale.setScalar(k);visual.position.y=-bounds.min.y*k;
      visual.traverse(o=>{if(o.isMesh||o.isSkinnedMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
      g.add(visual);body.visible=false;
      if(modelAnimations.length){g.userData.mixer=new THREE.AnimationMixer(visual);g.userData.mixer.clipAction(modelAnimations[0]).play();}
     }
    }catch(e){}
   }
  }
  const allegiance=new THREE.Mesh(new THREE.RingGeometry(.025,.030,24),new THREE.MeshBasicMaterial({color:team?0xe7a187:0x7aeac0,transparent:true,opacity:.43,side:THREE.DoubleSide,depthWrite:false}));
  allegiance.rotation.x=-Math.PI/2;allegiance.position.y=.008;g.add(allegiance);
  return g;
 }
 function deploy(team,index,lane,z){
  const c=catalogue[index];if(status!=='playing'||(team?enemyEnergy:energy)<c.cost)return false;
  if(!c.spell&&!c.shield&&units.length>=29){if(!team)signal('Demasiadas tropas. Esperá unos segundos.');return false;}
  if(team)enemyEnergy-=c.cost;else energy-=c.cost;
  if(c.shield){
   for(const b of buildings.filter(x=>x.team===team&&x.alive))b.shield=Math.min(185,b.shield+85);
   signal(team?'¡Escudo enemigo!':'¡Torres reforzadas!');
  }else if(c.spell){
   const laneX=lanes[lane];
   for(const u of units.filter(x=>x.team!==team&&Math.abs(x.x-laneX)<.13))dealUnit(u,115);
   const b=buildings.find(x=>x.team!==team&&!x.main&&x.lane===lane&&x.alive)||enemyMain(1-team);
   if(b)dealBuilding(b,85);
   blast(laneX,team?-.035:.035,0xffba79,.11);signal(team?'¡Bombardeo enemigo!':'¡Bombardeo realizado!');
  }else{
   // Assault and scouts deploy as 2-person squads for visual impact.
   const count=(index===0||index===1)&&units.length<27?2:1;
   for(let n=0;n<count;n++){
    const u={id:++unitSerial,team,card:c,lane,hp:c.hp,max:c.hp,x:lanes[lane]+(n?-.014:.014)+rng(-.008,.008),z:(z??(team?.128:-.128))+(n?-.012:.012),cooldown:rng(.08,.37),age:0};
    u.mesh=spawnVisual(c,team);u.mesh.position.set(u.x,0,u.z);group.add(u.mesh);u.bar=healthBar(u.mesh,team,c.air?.119:.117);units.push(u);blast(u.x,u.z,teamColors[team],.025);
   }
  }
  if(!team){
   const slot=hand.indexOf(index);if(slot!==-1){hand[slot]=next%catalogue.length;next++;selected=null;H.lanes.classList.remove('on');}
  }
  drawHUD();return true;
 }
 function blast(x,z,color,r=.04){
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(.011,8,6),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,depthWrite:false}));
  mesh.position.set(x,.055,z);mesh.scale.setScalar(r/.011);group.add(mesh);effects.push({mesh,ttl:.30,init:.30,kind:'flash'});
  if(effects.length>90){const old=effects.shift();old.mesh.parent?.remove(old.mesh);}
 }
 function tracer(source,target,team){
  const m=new THREE.Mesh(new THREE.SphereGeometry(.0045,8,6),new THREE.MeshBasicMaterial({color:team?0xffa589:0x9bffce}));
  const a=new THREE.Vector3(source.x,.064,source.z),b=new THREE.Vector3(target.x,.057,target.z);m.position.copy(a);group.add(m);
  effects.push({mesh:m,a,b,ttl:.19,init:.19,kind:'bullet'});
 }
 function dealBuilding(b,damage){
  if(!b.alive)return;
  const blocked=Math.min(b.shield,damage);b.shield-=blocked;b.hp=Math.max(0,b.hp-damage+blocked);b.bar.set(b.hp/b.max);
  if(b.main&&b.team===0&&b.hp<220&&!b.critical){b.critical=true;signal('⚠ ¡TU BASE ESTÁ EN PELIGRO!',2);feedback('hit');}
  if(b.hp<=0){b.alive=false;b.mesh.visible=false;blast(b.x,b.z,0xffb37c,.1);signal(b.main?(b.team?'¡BASE ENEMIGA DESTRUIDA!':'¡TU BASE HA CAÍDO!'):'¡TORRE DESTRUIDA!',1.7);}
 }
 function dealUnit(u,damage){u.hp=Math.max(0,u.hp-damage);u.bar.set(u.hp/u.max);if(!u.hp)blast(u.x,u.z,0xffad76,.045);}
 function dist(a,b){return Math.hypot(a.x-b.x,a.z-b.z)}
 function updateUnit(u,dt){
  u.cooldown-=dt;u.age+=dt;
  const foes=units.filter(x=>x.team!==u.team&&x.hp>0);
  const near=foes.filter(x=>dist(u,x)<=u.card.range+.025).sort((a,b)=>dist(u,a)-dist(u,b))[0];
  const tower=buildings.find(b=>b.team!==u.team&&!b.main&&b.lane===u.lane&&b.alive);
  const base=tower||enemyMain(1-u.team);
  const target=near||((base&&dist(u,base)<u.card.range+.018)?base:null);
  if(target&&u.cooldown<=0){
   if('card' in target)dealUnit(target,u.card.dmg);
   else dealBuilding(target,u.card.dmg);
   tracer(u,target,u.team);u.cooldown=u.card.rate;
  }else if(!target){
   const nearest=foes.filter(x=>Math.abs(x.x-u.x)<.1).sort((a,b)=>dist(u,a)-dist(u,b))[0];
   const targetMove=nearest&&dist(u,nearest)<u.card.range+.13?nearest:base;
   if(targetMove&&dist(u,targetMove)>u.card.range*.8){
    const dx=targetMove.x-u.x,dz=targetMove.z-u.z,d=Math.hypot(dx,dz)||1;
    u.x=THREE.MathUtils.clamp(u.x+dx/d*u.card.speed*dt,-.34,.34);
    u.z=THREE.MathUtils.clamp(u.z+dz/d*u.card.speed*dt,-.232,.232);
    u.mesh.position.x=u.x;u.mesh.position.z=u.z;u.mesh.rotation.y=Math.atan2(dx,dz);
   }
  }
  if(u.card.air)u.mesh.position.y=.035+Math.sin(u.age*6)*.009;
  if(u.mesh.userData.mixer)u.mesh.userData.mixer.update(dt);
  else if(u.mesh.userData.limbs)for(let i=0;i<u.mesh.userData.limbs.length;i++)u.mesh.userData.limbs[i].rotation.x=(i%2?-1:1)*Math.sin(u.age*7)*.3;
  if(u.card.heal&&u.cooldown<.1){
   const friend=units.filter(x=>x.team===u.team&&x.hp>0&&x.hp<x.max&&dist(x,u)<.085).sort((a,b)=>a.hp/a.max-b.hp/b.max)[0];
   if(friend){friend.hp=Math.min(friend.max,friend.hp+14);friend.bar.set(friend.hp/friend.max);u.cooldown=.9;blast(friend.x,friend.z,0xa6d5ff,.018);}
  }
 }
 function step(dt){
  time+=dt;const recharge=dt*(time>105?1.8:1)/1.85;
  if(!finalNotice&&maxTime-time<=30){finalNotice=true;signal('⚡ ÚLTIMOS 30 SEGUNDOS',2.2);}
  energy=Math.min(10,energy+recharge);enemyEnergy=Math.min(10,enemyEnergy+recharge);
  for(const u of units){if(u.hp>0)updateUnit(u,dt);}
  units=units.filter(x=>{if(x.hp>0)return true;x.mesh.parent?.remove(x.mesh);return false});
  for(const b of buildings){
   if(!b.alive)continue;b.cooldown-=dt;
   if(b.cooldown>0)continue;
   const enemy=units.filter(u=>u.team!==b.team&&u.hp>0&&dist(u,b)<(b.main?.147:.137)).sort((a,c)=>dist(a,b)-dist(c,b))[0];
   if(enemy){dealUnit(enemy,b.main?17:13);tracer(b,enemy,b.team);b.cooldown=b.main?.8:1.08;}
  }
  aiCooldown-=dt;
  if(aiCooldown<=0){
   aiCooldown=rng(2.6,3.9);
   const affordable=catalogue.map((c,i)=>i).filter(i=>catalogue[i].cost<=enemyEnergy);
   if(affordable.length){
    const i=affordable[Math.floor(Math.random()*affordable.length)];
    const pressure=lanes.map((x,l)=>units.filter(u=>u.team===0&&u.lane===l).reduce((sum,u)=>sum+u.hp,0));
    const lane=Math.random()<.56&&Math.max(...pressure)>0?pressure.indexOf(Math.max(...pressure)):Math.floor(Math.random()*3);
    deploy(1,i,lane);
   }
  }
  for(const e of effects){
   e.ttl-=dt;
   if(e.kind==='bullet')e.mesh.position.copy(e.a).lerp(e.b,Math.min(1,1-e.ttl/e.init));
   else{e.mesh.material.opacity=Math.max(0,e.ttl/e.init);e.mesh.scale.multiplyScalar(1+dt);}
  }
  effects=effects.filter(e=>{if(e.ttl>0)return true;e.mesh.parent?.remove(e.mesh);return false});
  if(notifyUntil>0){notifyUntil-=dt;if(notifyUntil<=0)H.toast.classList.remove('visible');}
  const a=enemyMain(0),b=enemyMain(1);
  if(!a.alive||!b.alive){finish(!b.alive?'win':'lose');return;}
  if(time>=maxTime){
   const aHP=buildings.filter(b=>b.team===0).reduce((s,b)=>s+b.hp,0);
   const bHP=buildings.filter(b=>b.team===1).reduce((s,b)=>s+b.hp,0);
   if(!overtime&&Math.abs(aHP-bHP)<1){overtime=true;maxTime+=25;signal('¡EMPATE! TIEMPO EXTRA',2);}
   else finish(aHP>bHP?'win':bHP>aHP?'lose':'draw');
  }
  elapsedHud+=dt;if(elapsedHud>.14){elapsedHud=0;drawHUD();}
 }
 function finish(result){
  status='ended';H.bottom.style.display='none';H.intro.style.display='block';
  H.tap.classList.remove('on');H.guide.classList.remove('on');H.ghost.classList.remove('on');targets.visible=false;
  feedback(result==='win'?'win':'hit');
  H.title.textContent=result==='win'?'🏆 ¡VICTORIA!':result==='lose'?'⚔️ DERROTA':'🤝 EMPATE';
  H.desc.textContent=result==='win'?'¡Destruiste las defensas enemigas!':result==='lose'?'La computadora ganó este duelo. Cambiá de cartas y buscá otra estrategia.':'¡Partida muy pareja!';
  H.launch.textContent='↻ JUGAR REVANCHA';H.lanes.classList.remove('on');
 }
 function drawHUD(){
  const my=enemyMain(0),other=enemyMain(1);
  if(!my||!other)return;
  H.mine.textContent=Math.ceil(my.hp);H.enemy.textContent=Math.ceil(other.hp);
  H.mybar.style.width=(100*my.hp/my.max)+'%';H.enemybar.style.width=(100*other.hp/other.max)+'%';
  const left=Math.max(0,Math.ceil(maxTime-time));H.clock.textContent=Math.floor(left/60)+':'+String(left%60).padStart(2,'0');
  H.phase.textContent=overtime?'PRÓRROGA':maxTime-time<=30?'DUELO FINAL':'DUELO';H.energy.textContent=energy.toFixed(1)+' / 10';
  H.energyfill.style.width=(energy*10)+'%';H.next.textContent='SIGUIENTE: '+catalogue[next%8].name;
  const renderKey=hand.join(',')+'|'+selected+'|'+hand.map(i=>energy>=catalogue[i].cost?'1':'0').join('');
  if(renderKey!==deckRenderKey){deckRenderKey=renderKey;H.deck.innerHTML=hand.map((index,slot)=>{
   const c=catalogue[index];
   return '<button type="button" class="dbcard '+(energy<c.cost?'locked ':'')+(selected===index?'selected':'')+'" style="--a:#'+c.color.toString(16).padStart(6,'0')+'" data-slot="'+slot+'" aria-label="'+c.name+' cuesta '+c.cost+' de energía"><em>'+c.cost+'</em><strong class="dbart">'+c.icon+'</strong><span class="dbname">'+c.name+'</span><span class="dbrole">'+(c.spell?'ÁREA':c.shield?'DEFENSA':c.air?'AÉREO':c.heal?'SOPORTE':c.speed>.07?'RÁPIDO':c.hp>200?'TANQUE':c.range>.14?'PRECISIÓN':'ASALTO')+'</span></button>';
  }).join('');}
 }
 function show(){
  if(status==='idle'){setup();status='ready';}
  hud.classList.add('open');document.body.classList.add('dominion-match');
  if(status==='ready'){H.intro.style.display='block';H.bottom.style.display='none';}
 }
 function stop(){
  status='idle';hud.classList.remove('open');document.body.classList.remove('dominion-match');selected=null;H.lanes.classList.remove('on');H.tap.classList.remove('on');H.guide.classList.remove('on');H.ghost.classList.remove('on');targets.visible=false;drag=null;H.toast.classList.remove('visible');cleanup();
 }
 function begin(){setup();status='playing';H.intro.style.display='none';H.bottom.style.display='block';signal('¡DEFENDÉ TU BASE!',1.5);feedback();}
 function playCard(index,lane,z){
  if(status!=='playing')return;
  if(energy<catalogue[index].cost){signal('Falta energía ⚡');return;}
  if(deploy(0,index,lane,z??-.135)){selected=null;H.lanes.classList.remove('on');H.tap.classList.remove('on');H.guide.classList.remove('on');H.ghost.classList.remove('on');targets.visible=false;feedback('deploy');drawHUD();}
 }

 const targets=new THREE.Group();group.add(targets);targets.visible=false;
 const drops=lanes.map((x,i)=>{
  const g=new THREE.Group();g.position.set(x,0,-.12);targets.add(g);
  const mat=new THREE.MeshBasicMaterial({color:0x7eebbe,transparent:true,opacity:.17,side:THREE.DoubleSide,depthWrite:false,depthTest:false});
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(.14,.16),mat);
  plane.rotation.x=-Math.PI/2;plane.position.y=.012;g.add(plane);
  const circle=new THREE.Mesh(new THREE.RingGeometry(.035,.043,36),new THREE.MeshBasicMaterial({color:0xb2ffd1,transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false,depthTest:false}));
  circle.rotation.x=-Math.PI/2;circle.position.y=.015;g.add(circle);
  return{g,mat,circle,i};
 });
 let drag=null,dragging=false,ignoreClickUntil=0;
 function showDrops(lane,enabled){
  targets.visible=enabled&&status==='playing';
  for(const t of drops){
   const active=t.i===lane;t.mat.opacity=active?.30:.08;t.circle.material.opacity=active?1:.48;
   t.g.scale.setScalar(active?1.15:1);
  }
 }
 function selectCard(index){
  selected=index;H.tap.classList.toggle('on',index!==null);
  H.guide.classList.toggle('on',index!==null);
  if(index!==null)H.guide.textContent=catalogue[index].name+' · tocá tu mitad de la mesa';
  showDrops(1,index!==null);drawHUD();
 }
 function mapDrop(x,y){
  let lane=x<innerWidth*.36?0:x>innerWidth*.64?2:1,z=-.12;
  try{
   const eyeCam=getCamera(),eye=eyeCam?.cameras?.[0]||eyeCam;
   const ray=new THREE.Raycaster();
   ray.setFromCamera(new THREE.Vector2(x/innerWidth*2-1,1-y/innerHeight*2),eye);
   field.updateWorldMatrix(true,false);
   const plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
   plane.applyMatrix4(field.matrixWorld);
   const hit=ray.ray.intersectPlane(plane,new THREE.Vector3());
   if(hit){
    const local=field.worldToLocal(hit.clone());
    if(Math.abs(local.x)<.65&&Math.abs(local.z)<.65){
     lane=Math.abs(local.x+.20)<.1?0:Math.abs(local.x-.20)<.1?2:1;
     z=THREE.MathUtils.clamp(local.z,-.18,-.06);
    }
   }
  }catch(err){}
  return{lane,z};
 }
 function dropValid(y){
  const height=H.bottom.getBoundingClientRect?.().height||152;
  return y<innerHeight-height-9;
 }
 H.deck.addEventListener('click',e=>{
  if(performance.now()<ignoreClickUntil||status!=='playing')return;
  const btn=e.target.closest('[data-slot]');if(!btn)return;
  const index=hand[Number(btn.dataset.slot)];
  if(energy+.001<catalogue[index].cost){signal('Esperá a recargar energía ⚡');return;}
  selectCard(selected===index?null:index);
 });
 H.deck.addEventListener('pointerdown',e=>{
  if(status!=='playing')return;
  const btn=e.target.closest('[data-slot]');if(!btn)return;
  const index=hand[Number(btn.dataset.slot)];
  if(energy+.001<catalogue[index].cost)return;
  drag={index,x:e.clientX,y:e.clientY,pointer:e.pointerId};dragging=false;
 });
 document.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.pointer||status!=='playing')return;
  if(!dragging&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>14)dragging=true;
  if(!dragging)return;
  if(e.cancelable)e.preventDefault();
  H.ghost.classList.add('on');H.ghost.style.left=e.clientX+'px';H.ghost.style.top=e.clientY+'px';
  H.ghost.innerHTML='<b>'+catalogue[drag.index].icon+'</b>'+catalogue[drag.index].name;
  const position=mapDrop(e.clientX,e.clientY);
  showDrops(position.lane,true);
  H.guide.classList.add('on');
  H.guide.textContent=dropValid(e.clientY)?'SOLTÁ PARA DESPLEGAR · '+['IZQUIERDA','CENTRO','DERECHA'][position.lane]:'ARRASTRÁ HACIA LA MESA';
 },{passive:false});
 document.addEventListener('pointerup',e=>{
  if(!drag||e.pointerId!==drag.pointer)return;
  const d=drag,wasDragging=dragging;drag=null;dragging=false;H.ghost.classList.remove('on');
  if(!wasDragging||status!=='playing')return;
  ignoreClickUntil=performance.now()+250;
  if(!dropValid(e.clientY)){selectCard(null);signal('Soltá sobre la arena para desplegar');return;}
  const target=mapDrop(e.clientX,e.clientY);
  playCard(d.index,target.lane,target.z);
 },{passive:false});
 document.addEventListener('pointercancel',()=>{
  drag=null;dragging=false;H.ghost.classList.remove('on');if(status==='playing')selectCard(null);
 });
 H.tap.addEventListener('pointerdown',e=>{
  if(status!=='playing'||selected===null)return;
  if(e.cancelable)e.preventDefault();
  const target=mapDrop(e.clientX,e.clientY);playCard(selected,target.lane,target.z);
 });
 H.lanes.addEventListener('click',e=>{
  const b=e.target.closest('[data-lane]');if(b&&selected!==null)playCard(selected,Number(b.dataset.lane));
 });
 H.launch.addEventListener('click',begin);
 H.sound.addEventListener('click',()=>{soundOn=!soundOn;H.sound.textContent=soundOn?'🔊':'🔇';H.sound.setAttribute('aria-label',soundOn?'Silenciar':'Activar sonido');if(soundOn)feedback('deploy');});
 for(const name of ['close','quit'])el(name).addEventListener('click',stop);
 return {show,stop,tick(dt){if(status==='playing')step(Math.min(dt,.06));},setModel(gltf){model=gltf;modelAnimations=(gltf.animations||[]).filter(a=>/walk|run|jog/i.test(a.name)).slice(0,1);if(!modelAnimations.length)modelAnimations=(gltf.animations||[]).slice(0,1);},get active(){return status!=='idle'},get state(){return status}};
}
