/* TeHiceEsto — Hasta el infinito v2. A portable model: visuals and behavior do not change with client data. */
(() => {
  "use strict";
  const root = document.getElementById("infinito-app");
  if (!root || root.dataset.loaded === "yes") return;
  root.dataset.loaded = "yes";
  const DEFAULTS = Object.freeze({
    recipient: "vos",
    giver: "alguien que te quiere hasta lo imposible",
    finalLetter: "Si el universo tiene millones de lugares increíbles, yo igual volvería a elegir el mismo: ese ratito en el que estamos juntos. Sos mi lugar favorito.",
    signoff: "Con un amor que no entra en ningún mapa",
    photoUrl: "",
    audioUrl: ""
  });
  const config = Object.assign({}, DEFAULTS, window.THI_INFINITO_CONFIG || {});
  const SCENES = [
    {name:"LA TIERRA", eyebrow:"CAPÍTULO I · EL PUNTO DE PARTIDA", title:"Arranquemos por<br><i>algo enorme.</i>", description:"O eso creía yo.", tag:"12.742 km de diámetro", funny:"Bastante espacio para perder las llaves. Poquísimo para guardar todo lo que te quiero.", hint:"Tocá nuestro planeta", button:"Necesitamos algo más grande", action:"earth"},
    {name:"EL SOL", eyebrow:"CAPÍTULO II · SUBIMOS LA APUESTA", title:"Bueno, esto<br><i>ya es otra cosa.</i>", description:"Una estrella que lo ilumina todo.", tag:"Más de un millón de Tierras", funny:"Con esto podríamos iluminar todas nuestras charlas de madrugada. Aunque tus ojos ya hacen bastante.", hint:"Mantené presionado para encenderlo", button:"¿Más grande todavía?", action:"sun"},
    {name:"LA GALAXIA", eyebrow:"CAPÍTULO III · SIN MEDIAS TINTAS", title:"Probemos con<br><i>una galaxia.</i>", description:"Miles de millones de estrellas. Una oportunidad.", tag:"Escala: absurdamente grande", funny:"Busqué entre miles de millones de estrellas y sigo pensando que la suerte me sonrió cuando te encontré.", hint:"Deslizá la galaxia o tocala", button:"Me parece que falta espacio", action:"galaxy"},
    {name:"EL UNIVERSO", eyebrow:"CAPÍTULO IV · ÚLTIMO INTENTO", title:"Traje todo<br><i>el universo.</i>", description:"En serio, todo. No dejé ni una estrella.", tag:"CÁLCULO EN PROCESO", funny:"ERROR CÓSMICO: el medidor se quedó sin números. El universo pidió hablar con el encargado.", hint:"Deslizá la escala hasta el final", button:"Hay una última medida", action:"universe"},
    {name:"ALGO MÁS GRANDE", eyebrow:"CAPÍTULO V · LA VERDADERA MEDIDA", title:"Hay algo que<br><i>no tiene medida.</i>", description:"Y no aparece en ningún telescopio.", tag:"RESULTADO FINAL · INFINITO", funny:"Después de medir la Tierra, el Sol y todo lo que existe, descubrí que el amor no se calcula. Se siente.", hint:"Tocá el sello y abrí tu carta", button:"", action:"letter"}
  ];
  const ART = {
    earth:"https://assets.science.nasa.gov/content/dam/science/psd/solar/2023/09/1/1-bluemarble_west.jpg/jcr:content/renditions/cq5dam.web.1280.1280.jpeg",
    sun:"https://d2pn8kiwq2w21t.cloudfront.net/original_images/contentdamsciencepsdphotojournalpiapia26pia26681PIA26681.jpg",
    galaxy:"https://science.nasa.gov/wp-content/uploads/2023/04/hubble_m51-jpg-e1688472875538.webp"
  };
  let index=-1, revealed=false, done=false, busy=false, startTouch=null, holdTimer=0, doneTimer=0, ctx=null, stars=[], warpUntil=0, animationGeneration=0, voice=null;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function esc(s){return String(s||"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function extraPhoto(){
    if (!config.photoUrl || !/^https?:|^data:image\//.test(config.photoUrl)) return '<div class="ii-photo-constellation">✧<b>vos + yo</b><small>un universo entero</small></div>';
    return '<img src="'+esc(config.photoUrl)+'" alt="Recuerdo especial" loading="lazy">';
  }
  function meta(){
    return '<div class="ii-top"><a class="ii-logo" href="https://tehiceesto.com/" aria-label="Ir a Te Hice Esto">te hice esto <span>✳</span></a><div class="ii-top-right"><span>EDICIÓN <strong>∞</strong></span><span class="ii-top-divider">/</span><span>PARA ALGUIEN ESPECIAL</span></div></div>';
  }
  function orbitScene(){
    return '<div class="ii-artwork ii-artwork-earth" aria-label="La Tierra fotografiada desde el espacio"><span class="ii-planet-aura"></span><span class="ii-planet-circle"><img src="'+ART.earth+'" alt="" draggable="false"></span><span class="ii-orbital ii-orbital-1"></span><span class="ii-orbital ii-orbital-2"></span><span class="ii-orbital-point">✦</span><span class="ii-art-caption">TERCER PLANETA DESDE EL SOL <b>✦</b> 01/05</span><span class="ii-measure ii-measure-earth">12.742 KM <small>DIÁMETRO</small></span></div>';
  }
  function sunScene(){
    return '<div class="ii-artwork ii-artwork-sun" aria-label="Imagen solar de NASA"><span class="ii-corona ii-corona-a"></span><span class="ii-corona ii-corona-b"></span><span class="ii-solar-disc"><img src="'+ART.sun+'" alt="" draggable="false"></span><span class="ii-solar-glimmer"></span><span class="ii-art-caption">UNA ESTRELLA, MUCHAS GANAS <b>✦</b> 02/05</span><span class="ii-measure ii-measure-sun">1.392.700 KM <small>APROX. DIÁMETRO</small></span></div>';
  }
  function galaxyScene(){
    return '<div class="ii-artwork ii-artwork-galaxy" aria-label="Galaxia en espiral fotografiada por el telescopio Hubble"><span class="ii-galaxy-halo"></span><span class="ii-galaxy-disc"><img src="'+ART.galaxy+'" alt="" draggable="false"></span><span class="ii-galaxy-wisp ii-galaxy-wisp-a">✦</span><span class="ii-galaxy-wisp ii-galaxy-wisp-b">✧</span><span class="ii-galaxy-wisp ii-galaxy-wisp-c">✦</span><span class="ii-art-caption">NADA DE ESTO ME ALCANZA <b>✦</b> 03/05</span><span class="ii-measure ii-measure-galaxy">MIL MILLONES DE HISTORIAS <small>Y UNA FAVORITA</small></span></div>';
  }
  function universeScene(){
    const positions=[["-21%","-30%","-22deg",".5"],["60%","-27%","23deg",".32"],["-43%","44%","15deg",".22"],["74%","56%","-26deg",".34"],["19%","78%","49deg",".30"]];
    const galaxyTiles=positions.map((p,i)=>'<span class="ii-universe-galaxy ii-universe-galaxy-'+i+'" style="left:'+p[0]+';top:'+p[1]+';--rot:'+p[2]+';opacity:'+p[3]+'"><img src="'+ART.galaxy+'" alt=""></span>').join("");
    return '<div class="ii-artwork ii-artwork-universe" aria-label="Un universo inmenso de galaxias"><span class="ii-universe-nebula"></span>'+galaxyTiles+'<span class="ii-universe-center"><img src="'+ART.galaxy+'" alt="" draggable="false"></span><span class="ii-universe-scope"></span><span class="ii-universe-coordinate">∞ <small>FUERA DE ESCALA</small></span><span class="ii-art-caption">TODOS LOS CIELOS JUNTOS <b>✦</b> 04/05</span></div>';
  }
  function letterScene(){
    return '<div class="ii-artwork ii-artwork-letter" aria-label="Carta romántica con sello de cera">'+
      '<div class="ii-envelope-shadow"></div>'+
      '<div class="ii-letter-paper"><span>DEL UNIVERSO PARA</span><h3>'+esc(config.recipient)+'</h3><p>'+esc(config.finalLetter)+'</p><small>'+esc(config.signoff)+'</small></div>'+
      '<div class="ii-envelope"><div class="ii-flap"></div><div class="ii-envelope-front"></div><span class="ii-seal">♡</span></div>'+ (config.photoUrl ? '<div class="ii-polaroid"><div class="ii-polaroid-image">'+extraPhoto()+'</div><span>UN RECUERDO NUESTRO</span></div>' : '')+
      '<span class="ii-letter-dust ii-letter-dust-1">✦</span><span class="ii-letter-dust ii-letter-dust-2">✧</span><span class="ii-letter-dust ii-letter-dust-3">✦</span></div>';
  }
  function sceneArt(){return [orbitScene,sunScene,galaxyScene,universeScene,letterScene][index]();}
  function intro(){
    return '<div class="ii-intro">'+
      '<p class="ii-overline">TE HICE ESTO PRESENTA · UN PEQUEÑO VIAJE</p>'+
      '<div class="ii-seal-large" aria-hidden="true"><span class="ii-seal-line ii-line-a"></span><span class="ii-seal-line ii-line-b"></span><span>∞</span></div>'+
      '<div class="ii-intro-title">Quise medir<br><em>cuánto te quiero.</em></div>'+
      '<p class="ii-intro-description">Empecé por la Tierra. Después me fui un poquito de tema.</p>'+
      '<div class="ii-intro-ticket"><span>ADMISIÓN PARA UNO</span><span>DESTINO · ALGO INMENSO</span></div>'+
      '<button type="button" class="ii-cta ii-cta-intro" data-action="begin">Abrir nuestro universo <span aria-hidden="true">↗</span></button>'+
      '<span class="ii-footnote">CINCO PARADAS, UNA VERDAD EXTRAORDINARIA</span>'+
    '</div>';
  }
  function scene(){
    const s=SCENES[index];
    let controls='';
    if(!revealed){
      if(index===3)controls='<div class="ii-slider-wrap"><input aria-label="Expandir la escala" id="ii-scale" type="range" min="0" max="100" value="0"><div class="ii-slider-labels"><span>PLANETA</span><span>UNIVERSO ENTERO</span></div></div><button type="button" data-action="reveal" class="ii-quiet-link">O descubrilo con un toque ↗</button>';
      else controls='<button type="button" class="ii-touch-button" data-action="reveal"><span class="ii-touch-icon">'+(index===1?'◎':index===2?'↔':index===4?'♡':'✧')+'</span><span>'+s.hint+'</span><span class="ii-touch-pulse"></span></button>';
    } else if(index<4){
      controls='<button type="button" class="ii-cta" data-action="next">'+s.button+'<span aria-hidden="true">↗</span></button>';
    } else if(done){
      controls='<div class="ii-final-controls"><button type="button" class="ii-cta" data-action="restart">Volver a vivirlo <span aria-hidden="true">↺</span></button><button type="button" class="ii-share" data-action="share">Compartir esta sorpresa ↗</button>'+(config.audioUrl?'<button type="button" class="ii-share" data-action="voice">Escuchar tu voz ♡</button>':'')+'</div>';
    }
    return '<article class="ii-chapter ii-chapter-'+index+(revealed?' ii-revealed':'')+'">'+
      '<div class="ii-chapter-top"><span class="ii-chapter-eyebrow">'+s.eyebrow+'</span><h1>'+s.title+'</h1><p>'+s.description+'</p></div>'+
      '<div class="ii-art-wrapper">'+sceneArt()+'</div>'+
      '<div class="ii-chapter-bottom">'+(revealed?'<div class="ii-discovery"><div class="ii-discovery-label"><span>✧</span> '+s.tag+'</div><p>'+s.funny+'</p></div>':'<div class="ii-waiting"><span>UNA PEQUEÑA PISTA</span><p>'+s.hint+'</p></div>')+
      '<div class="ii-actions">'+(index>0?'<button type="button" class="ii-back" data-action="back" aria-label="Volver a la etapa anterior">←</button>':'')+controls+'</div>'+
      '</div></article>';
  }
  function footer(){
    return '<footer class="ii-footer"><span>TE HICE ESTO</span><div class="ii-progress" role="progressbar" aria-label="Progreso del recorrido" aria-valuemin="0" aria-valuemax="5" aria-valuenow="'+(index+1)+'">'+SCENES.map((s,i)=>'<span class="'+(i<=index?'is-active':'')+'"></span>').join('')+'</div><span>'+(index<0?'PRÓXIMO DESTINO: LA TIERRA':index===4?'FIN DEL UNIVERSO · INICIO DE TODO':String(index+1).padStart(2,'0')+' / 05')+'</span></footer>';
  }
  function render(){
    document.title="Hasta el infinito · Te Hice Esto";
    root.innerHTML='<main class="ii-experience" data-scene="'+index+'" data-revealed="'+(revealed?'yes':'no')+'"><canvas class="ii-starfield" aria-hidden="true"></canvas><div class="ii-lightgrain" aria-hidden="true"></div><div class="ii-edges" aria-hidden="true"></div><div class="ii-page">'+meta()+(index<0?intro():scene())+footer()+'</div><div class="ii-warp" aria-hidden="true"></div></main>';
    root.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',()=> {
      const a=btn.dataset.action;
      if(a==="begin")go(0);
      if(a==="back")go(index-1);
      if(a==="next")go(index+1);
      if(a==="reveal")discover();
      if(a==="restart")go(-1);
      if(a==="share")share();
      if(a==="voice")playVoice();
    }));
    const body=root.querySelector('.ii-experience');
    if(index>=0&&!revealed){const object=root.querySelector('.ii-artwork');if(object){object.tabIndex=0;object.setAttribute('role','button');object.setAttribute('aria-label',SCENES[index].hint);object.addEventListener('click',()=>discover());object.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();discover();}});}}
    if(index===1&&!revealed){
      const b=root.querySelector('.ii-touch-button');let triggered=false;
      const start=()=>{triggered=false;b.classList.add('is-holding');holdTimer=setTimeout(()=>{triggered=true;discover();},700);};
      const stop=()=>{clearTimeout(holdTimer);if(b.isConnected)b.classList.remove('is-holding');};
      b.addEventListener('pointerdown',start);["pointerup","pointercancel","pointerleave"].forEach(e=>b.addEventListener(e,stop));
      b.addEventListener('click',()=>{if(!triggered)discover();});
    }
    if(index===2&&!revealed){
      const art=root.querySelector('.ii-galaxy-disc');
      art.addEventListener('pointerdown',e=>{startTouch=e.clientX;});
      art.addEventListener('pointerup',e=>{if(startTouch!==null&&Math.abs(e.clientX-startTouch)>50)discover();startTouch=null;});
    }
    if(index===3&&!revealed){
      const slider=root.querySelector('#ii-scale');
      slider.addEventListener('input',()=>{body.style.setProperty('--universe-zoom',slider.value/100);if(+slider.value>=88)discover();});
    }
    if(index===4&&revealed){
      doneTimer=setTimeout(()=>{done=true;root.querySelector('.ii-experience')?.classList.add('ii-letter-finished');const actions=root.querySelector('.ii-actions');if(actions&&actions.childElementCount<=1){actions.insertAdjacentHTML('beforeend','<div class="ii-final-controls"><button type="button" class="ii-cta" data-action="restart">Volver a vivirlo <span aria-hidden="true">↺</span></button><button type="button" class="ii-share" data-action="share">Compartir esta sorpresa ↗</button></div>');actions.querySelector('[data-action="restart"]').addEventListener('click',()=>go(-1));actions.querySelector('[data-action="share"]').addEventListener('click',share);if(config.audioUrl){actions.querySelector('[data-action="voice"]').addEventListener('click',playVoice);}}},1050);
    }
    paintStars();
  }
  function playVoice(){
    if(!config.audioUrl||!/^https?:/.test(config.audioUrl))return;
    if(!voice)voice=new Audio(config.audioUrl);
    const b=root.querySelector('[data-action="voice"]');
    if(voice.paused){voice.play().then(()=>{if(b)b.textContent='Pausar tu voz Ⅱ';}).catch(()=>{if(b)b.textContent='No se pudo reproducir';});}
    else{voice.pause();if(b)b.textContent='Escuchar tu voz ♡';}
  }
  async function share(){
    const url=window.location.href;
    try{if(navigator.share)await navigator.share({title:document.title,url});else if(navigator.clipboard){await navigator.clipboard.writeText(url);const b=root.querySelector('.ii-share');if(b)b.textContent="Enlace copiado ✓";}}catch{}
  }
  function discover(){
    if(busy||revealed||index<0)return;
    clearTimeout(holdTimer);revealed=true;warpUntil=performance.now()+650;
    if(navigator.vibrate)navigator.vibrate(index===4?[25,55,45]:24);
    const currentY=window.scrollY;
    render();
    if(currentY>0)window.scrollTo({top:0,behavior:'smooth'});
  }
  function go(n){
    if(busy||n<-1||n>4)return;
    busy=true;clearTimeout(holdTimer);clearTimeout(doneTimer);
    const scene=root.querySelector('.ii-experience');if(scene)scene.classList.add('ii-departing');
    warpUntil=performance.now()+1150;
    window.setTimeout(()=>{index=n;revealed=false;done=false;busy=false;render();window.scrollTo({top:0,behavior:"instant"});},reducedMotion?0:530);
  }
  function paintStars(){
    const c=root.querySelector('canvas');
    if(!c)return;const generation=++animationGeneration;const dpr=Math.min(2,window.devicePixelRatio||1);
    const w=window.innerWidth,h=Math.max(window.innerHeight,root.getBoundingClientRect().height);
    c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);c.style.width=w+'px';c.style.height=h+'px';
    ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
    let seed=1729;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    stars=Array.from({length:w<500?135:240},()=>({x:rand()*w,y:rand()*h,r:.35+rand()*1.2,z:.1+rand()*.9,phase:rand()*6.28,hue:rand()>.88?36:rand()>.82?210:0}));
    drawStars(performance.now(),generation);
  }
  function drawStars(ts,generation){
    if(!ctx||generation!==animationGeneration)return;const w=window.innerWidth,h=ctx.canvas.height/(Math.min(2,window.devicePixelRatio||1));
    ctx.clearRect(0,0,w,h);
    const warp=ts<warpUntil;
    stars.forEach(s=>{let opacity=reducedMotion?.65:(.28+Math.sin(ts*.0014*s.z+s.phase)*.23+.25*s.z);
      ctx.fillStyle=s.hue===36?'rgba(255,212,163,'+opacity+')':s.hue===210?'rgba(157,197,255,'+opacity+')':'rgba(250,242,230,'+opacity+')';
      const yy=(s.y+(warp?(warpUntil-ts)*s.z*.06:0))%h;
      if(warp){ctx.fillRect(s.x,yy,s.r,Math.max(2,s.z*15));}
      else{ctx.beginPath();ctx.arc(s.x,yy,s.r,0,Math.PI*2);ctx.fill();}
    });
    if(!reducedMotion)requestAnimationFrame(t=>drawStars(t,generation));
  }
  render();
  window.addEventListener('resize',()=>{if(root.querySelector('.ii-experience'))paintStars();},{passive:true});
})();