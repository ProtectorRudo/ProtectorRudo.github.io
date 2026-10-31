
/* Trazo Cómplice — original, zero-backend, one-phone drawing game.
   Nothing is transmitted or saved. The game runs entirely in the current tab. */
(function () {
  'use strict';
  const isDemo=window.TRAZO_IS_DEMO===true;
  const wordBank=window.TRAZO_WORD_BANK||[];
  const categories=window.TRAZO_CATEGORIES||{};
  const root=document.getElementById('game-root');
  const toastElement=document.getElementById('trazo-toast');
  if (!root || wordBank.length < (isDemo?2:500)) {
    if(root)root.textContent='No pudimos cargar las palabras. Volvé a abrir el juego.';
    return;
  }
  const COLORS=[['#271121','Negro ciruela'],['#d73367','Rosa'],['#6c5dcc','Violeta'],['#398eb2','Azul'],['#e99c2c','Naranja'],['#36856b','Verde']];
  const DIFFICULTIES={easy:'Fácil',medium:'Intermedio',hard:'Desafío'};
  const SVG={
    pencil:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20l4.5-1 10-10-3.5-3.5-10 10L4 20Z"/><path d="m13.5 7 3.5 3.5"/></svg>',
    undo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h9c5 0 7 3 7 7s-3 5-7 5"/></svg>',
    erase:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m7 19-4-4L14 4a2 2 0 0 1 3 0l4 4a2 2 0 0 1 0 3L12 20H7Z"/><path d="m7 19 5-5"/></svg>',
  };
  const state={phase:'home',nameA:'',nameB:'',rounds:isDemo?2:6,time:90,category:'all',difficulty:'mixed',round:0,deck:[],scores:[0,0],successes:0,revealed:false,strokes:[],color:COLORS[0][0],width:6,eraser:false,secondsLeft:90,lastResult:null};
  let timerId=null,deadline=0,hiddenAt=0,resizeObserver=null,pointerId=null,activeStroke=null,canvas=null,ctx=null,toastTimer=null;
  function esc(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
  function haptic(value=12){try{if(navigator.vibrate)navigator.vibrate(value);}catch{/* optional */}}
  function toast(msg){if(!toastElement)return;toastElement.textContent=msg;toastElement.classList.add('is-showing');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastElement.classList.remove('is-showing'),2400);}
  function shuffle(arr){const a=arr.slice();for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function makeDeck(){
    if(isDemo)return [wordBank[0],wordBank[1]];
    const options=wordBank.filter(w=>(state.category==='all'||w.category===state.category)&&(state.difficulty==='mixed'||w.difficulty===state.difficulty));
    if(options.length<state.rounds)throw Error('Not enough original prompts');
    const picked=[],used=new Set(),difficultyCycle=['easy','medium','easy','medium','hard','easy','medium','hard','medium','easy','hard','medium','easy','hard','medium'];
    const available=shuffle(options);
    for(let i=0;i<state.rounds;i++){
      const pref=state.difficulty==='mixed'?difficultyCycle[i%difficultyCycle.length]:state.difficulty;
      const idx=available.findIndex(w=>!used.has(w.label)&&w.difficulty===pref);
      const alt=available.findIndex(w=>!used.has(w.label));
      const selected=available[idx>=0?idx:alt];
      if(!selected)throw Error('All original prompts already played');
      picked.push(selected);used.add(selected.label);
    }
    return picked;
  }
  function player(i){return state['name'+(i===0?'A':'B')]||'Jugador '+(i+1);}
  function drawerIndex(){return state.round%2;}
  function guesserIndex(){return 1-drawerIndex();}
  function prompt(){return state.deck[state.round];}
  function categoryLabel(id){const c=categories[id];return c?c.name:'Sorpresa';}
  function stopTimer(){if(timerId){clearInterval(timerId);timerId=null;}hiddenAt=0;}
  function stopDrawing(){if(resizeObserver){resizeObserver.disconnect();resizeObserver=null;}pointerId=null;activeStroke=null;ctx=null;canvas=null;stopTimer();}
  function transition(phase){stopDrawing();state.phase=phase;root.innerHTML=views[phase]();attach(phase);window.scrollTo({top:0,behavior:'instant'});}
  function button(text,action,kind='primary',extra=''){return '<button type="button" class="trazo-btn trazo-btn--'+kind+' '+extra+'" data-action="'+action+'">'+text+'</button>';}
  function flag(){return '<span class="trazo-round-flag">✦ RONDA '+(state.round+1)+' DE '+state.rounds+' ✦</span>';}
  function categoryBadge(){const c=categories[state.category];return state.category==='all'?'TODAS LAS CATEGORÍAS':(c?c.symbol+' '+c.name.toUpperCase():'TODAS LAS CATEGORÍAS');}
  function headerSubtitle(){return state.rounds+' rondas · '+(state.time===0?'Sin reloj':state.time+' segundos')+' · '+categoryBadge();}
  function scoreCards(){return '<div class="trazo-score-list">'+[0,1].map(i=>'<div class="trazo-score-item '+(state.scores[i]>state.scores[1-i]?'is-leading':'')+'"><div><strong>'+esc(player(i))+'</strong><small>'+(i===drawerIndex()?'Dibuja en esta ronda':'Adivina en esta ronda')+'</small></div><span>'+state.scores[i]+' pts</span></div>').join('')+'</div>';}
  const cardArt='<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M20 71c10-40 15-4 24-34 9-21 17 29 38-10" fill="none" stroke="#ef7092" stroke-linecap="round" stroke-width="8"/><path d="M72 67c7-6 10 6 2 10" fill="none" stroke="#553046" stroke-width="5"/><circle cx="22" cy="21" r="6" fill="#edbb68"/></svg>';
  const views={
    home:()=>'<section class="trazo-screen trazo-landing"><div class="trazo-landing-content"><span class="trazo-kicker">✳ UNA IDEA, MIL DIBUJOS</span><h1 class="trazo-headline"><span>Trazo</span><span><em>Cómplice.</em></span></h1><p class="trazo-lead">Una palabra secreta. Un dedo que dibuja. Dos personas tratando de no tentarse de risa.</p><div class="trazo-hero-badges"><span class="trazo-chip">📱 Un celular</span><span class="trazo-chip">👥 Dos personas</span><span class="trazo-chip">✏️ '+(isDemo?'2 de muestra · 1.274 en el completo':wordBank.length.toLocaleString('es-AR')+' palabras')+'</span></div></div><div class="trazo-deck" aria-hidden="true"><div class="trazo-art-card"><span>A</span>☀<small>A</small></div><div class="trazo-art-card"><span>♥</span><span class="trazo-heart-symbol">♡</span><small>♥</small></div><div class="trazo-art-card"><span>✳</span>✧<small>✳</small></div><div class="trazo-art-card"><span>9</span>'+cardArt+'<small>9</small></div></div><div class="trazo-landing-actions">'+button('Empezar a jugar ↗','setup','primary')+button('Cómo se juega','how','outline')+'</div><details class="trazo-section-detail"><summary>Sin cuentas, salas ni conexión entre jugadores</summary><p>El celular se pasa por turnos. Quien dibuja mira su palabra en secreto y después la oculta; su compañero adivina en voz alta. Solo ustedes deciden cuándo acertaron. No se envían dibujos ni nombres a ningún servidor.</p></details></section>',
    setup:()=>'<section class="trazo-screen trazo-form-screen"><span class="trazo-kicker">PRIMERO LO PRIMERO</span><h2 class="trazo-headline">¿Quiénes juegan?</h2><p class="trazo-lead">Dos personas, un teléfono, cero vergüenza.</p><div class="trazo-form-card"><h3>Presenten a la dupla</h3><p>Los turnos para dibujar se alternan automáticamente.</p><form id="trazo-setup" autocomplete="off"><div class="trazo-field"><label for="trazo-name-a">Primera persona</label><input id="trazo-name-a" maxlength="28" type="text" placeholder="Nombre 1" value="'+esc(state.nameA)+'" required /></div><div class="trazo-field"><label for="trazo-name-b">Segunda persona</label><input id="trazo-name-b" maxlength="28" type="text" placeholder="Nombre 2" value="'+esc(state.nameB)+'" required /></div><div class="trazo-settings"><div><div class="trazo-form-label">Rondas</div><div class="trazo-option-row" role="group" aria-label="Cantidad de rondas">'+(isDemo?[2]:[6,10,15]).map(n=>'<button type="button" data-setting="rounds" data-value="'+n+'" aria-pressed="'+(state.rounds===n)+'" class="trazo-option '+(state.rounds===n?'is-selected':'')+'">'+n+'</button>').join('')+'</div></div><div><div class="trazo-form-label">Tiempo para dibujar</div><div class="trazo-option-row" role="group" aria-label="Tiempo por ronda">'+[[60,'60 s'],[90,'90 s'],[120,'120 s'],[0,'Sin reloj']].map(([n,l])=>'<button type="button" data-setting="time" data-value="'+n+'" aria-pressed="'+(state.time===n)+'" class="trazo-option '+(state.time===n?'is-selected':'')+'">'+l+'</button>').join('')+'</div></div><div class="trazo-field"><label for="trazo-category">Categoría</label><select id="trazo-category"><option value="all">Todas las categorías ('+(isDemo?2:wordBank.length)+')</option>'+(isDemo?[]:Object.entries(categories)).map(([id,c])=>'<option value="'+id+'" '+(state.category===id?'selected':'')+'>'+c.symbol+' '+c.name+' ('+wordBank.filter(w=>w.category===id).length+')</option>').join('')+'</select></div><div class="trazo-field"><label for="trazo-difficulty">Dificultad</label><select id="trazo-difficulty"><option value="mixed" '+(state.difficulty==='mixed'?'selected':'')+'>Sorpresa: mezcladas</option><option value="easy" '+(state.difficulty==='easy'?'selected':'')+'>Fácil</option><option value="medium" '+(state.difficulty==='medium'?'selected':'')+'>Intermedia</option><option value="hard" '+(state.difficulty==='hard'?'selected':'')+'>Desafío</option></select></div></div><div class="trazo-form-actions"><button class="trazo-btn trazo-btn--primary" type="submit">Preparar nuestras cartas →</button></div></form></div><div class="trazo-form-footer">Un solo teléfono. Sin registros ni contraseñas.</div></section>',
    pass:()=>'<section class="trazo-screen trazo-stage-screen">'+flag()+'<h2 class="trazo-stage-headline">¡Le toca dibujar<br/>a <em>'+esc(player(drawerIndex()))+'!</em></h2><p class="trazo-stage-copy">Pasale el teléfono. <strong>'+esc(player(guesserIndex()))+'</strong> debe mirar hacia otro lado mientras aparece la palabra.</p><div class="trazo-pass-card" aria-hidden="true"><div class="trazo-pass-seal">♥</div><span>SOLO OJOS DEL ARTISTA</span></div><div class="trazo-stage-actions">'+button('Soy '+esc(player(drawerIndex()))+', ver mi palabra ↗','show-secret')+button('Ver los puntos','scores','text')+'</div><p class="trazo-small-print">'+esc(headerSubtitle())+'</p></section>',
    secret:()=>'<section class="trazo-screen trazo-stage-screen">'+flag()+'<h2 class="trazo-stage-headline">Tu palabra<br/>secreta.</h2><p class="trazo-stage-copy">Solo la persona que dibuja puede mirar esta carta.</p><div class="trazo-paper trazo-pick-card '+(state.revealed?'is-revealed':'')+'" aria-live="polite"><span class="trazo-card-corner">9 ♢</span><span class="trazo-secret-label">'+(state.revealed?'TE TOCÓ DIBUJAR':'MANTENELA EN SECRETO')+'</span><strong class="trazo-secret-word">'+(state.revealed?esc(prompt().label):'✧')+'</strong>'+(state.revealed?'<div class="trazo-difficulty">'+esc(categoryLabel(prompt().category))+' · '+DIFFICULTIES[prompt().difficulty]+'</div>':'<span class="trazo-secret-category">La palabra está debajo de esta carta</span>')+'<span class="trazo-card-corner trazo-card-corner--bottom">9 ♢</span></div><p class="trazo-secret-notice">🔒 La palabra desaparecerá antes de dibujar.</p><div class="trazo-stage-actions">'+(state.revealed?button('Ya la vi. ¡A dibujar! ↗','start-drawing','primary'):button('Revelar mi palabra','reveal','cream'))+(isDemo?'':button('Cambiar palabra (sin puntos)','reroll','text'))+'</div></section>',
    draw:()=>'<section class="trazo-screen trazo-drawing-screen"><div class="trazo-drawing-top"><div><span class="trazo-counter">RONDA '+(state.round+1)+' / '+state.rounds+'</span><h2>'+esc(player(drawerIndex()))+' dibuja</h2></div><span id="trazo-timer" class="trazo-timer" role="timer" aria-label="Tiempo restante">'+(state.time===0?'∞':formatTime(state.secondsLeft))+'</span></div><p class="trazo-drawing-copy">'+esc(player(guesserIndex()))+' adivina en voz alta. No se puede hablar, escribir letras ni números.</p><div class="trazo-canvas-shell" id="trazo-canvas-shell"><canvas id="trazo-canvas" class="trazo-drawing-canvas" aria-label="Lienzo para dibujar con el dedo">Tu navegador no admite dibujos táctiles.</canvas><div class="trazo-canvas-hint" id="trazo-canvas-hint"><i aria-hidden="true">✎</i><span>Tu lienzo está listo. ¡Dibujá!</span></div></div><div class="trazo-palette-shell"><div class="trazo-palette" role="group" aria-label="Colores">'+COLORS.map(([color,name])=>'<button type="button" class="trazo-color '+(!state.eraser&&state.color===color?'is-selected':'')+'" style="--swatch:'+color+'" data-color="'+color+'" aria-pressed="'+(!state.eraser&&state.color===color)+'" aria-label="Color '+name+'"></button>').join('')+'</div><div class="trazo-tool-panel"><button type="button" class="trazo-tool '+(state.eraser?'is-selected':'')+'" data-action="eraser" aria-label="Goma de borrar" title="Borrar con el dedo">'+SVG.erase+'</button><button type="button" class="trazo-tool" data-action="undo" aria-label="Deshacer último trazo" title="Deshacer">'+SVG.undo+'</button></div></div><div class="trazo-tool-row"><div class="trazo-widths"><span>GROSOR</span>'+[[4,'Fino'],[8,'Medio'],[16,'Grueso']].map(([width,label])=>'<button type="button" class="trazo-width '+(state.width===width?'is-selected':'')+'" data-width="'+width+'" aria-label="Trazo '+label+'" aria-pressed="'+(state.width===width)+'">'+(width===4?'●':width===8?'●●':'●●●')+'</button>').join('')+'</div><button type="button" class="trazo-tool" data-action="clear">Borrar todo</button></div><div class="trazo-drawing-actions">'+button('✓ ¡Lo adivinó!','correct','primary')+button('Rendirse','giveup','outline')+'</div><div class="trazo-fair-play">Solo ustedes deciden si acertaron. Sin trampas, ¿eh? ♡</div></section>',
    result:()=>'<section class="trazo-screen trazo-result-screen">'+(state.lastResult==='correct'?'<div class="trazo-confetti" aria-hidden="true">'+Array.from({length:14},(_,i)=>'<i style="--piece:'+i+'"></i>').join('')+'</div>':'')+flag()+'<div class="trazo-result-medallion '+(state.lastResult==='correct'?'':'is-skip')+'" aria-hidden="true">'+(state.lastResult==='correct'?'★':'↻')+'</div><h2>'+(state.lastResult==='correct'?'¡Lo sacaron!':state.lastResult==='timeout'?'¡Tiempo!':'¡Para la próxima!')+'</h2><p class="trazo-stage-copy">'+(state.lastResult==='correct'?esc(player(guesserIndex()))+' adivinó el dibujo de '+esc(player(drawerIndex()))+'. ¡Eso es complicidad!':'No pasa nada: algunos dibujos merecen permanecer como arte abstracto.')+'</p><div class="trazo-revealed-word"><span>LA PALABRA ERA</span><strong>'+esc(prompt().label)+'</strong></div><div class="trazo-points-reward">'+(state.lastResult==='correct'?'<strong>+2</strong> para quien adivina · <strong>+1</strong> para quien dibuja':'Esta vez no sumaron puntos')+'</div>'+scoreCards()+'<div class="trazo-stage-actions">'+button(state.round===state.rounds-1?'Ver resultados finales ↗':'Siguiente ronda →','next-round')+'</div></section>',
    final:()=>'<section class="trazo-screen trazo-result-screen"><div class="trazo-end-sparks" aria-hidden="true">✦ ✳ ✦</div><span class="trazo-kicker">PARTIDA TERMINADA</span><h2 class="trazo-final-title">Una obra de arte<br/><em>entre dos.</em></h2><p class="trazo-stage-copy">'+state.successes+' de '+state.rounds+' palabras adivinadas. '+(state.successes===state.rounds?'¡Con ustedes no hay misterio que dure!':state.successes>=Math.ceil(state.rounds/2)?'Si la vida fuera un museo, estos dibujos van directo a la pared.':'Quizás no sean artistas, pero las risas están aseguradas.')+'</p><div class="trazo-score-list trazo-final-score">'+[0,1].map(i=>'<div class="trazo-score-item '+(state.scores[i]>state.scores[1-i]?'is-leading':'')+'"><div><strong>'+esc(player(i))+'</strong><small>'+(state.scores[i]>state.scores[1-i]?'¡LÍDER DE LA DUPLA!':state.scores[i]===state.scores[1-i]?'EMPATE DE TALENTOS':'ARTE CON PERSONALIDAD')+'</small></div><span>'+state.scores[i]+' pts</span></div>').join('')+'</div><p class="trazo-final-note">Al final, los mejores dibujos son los que nos hacen reír juntos. ♡</p><div class="trazo-stage-actions">'+button('Jugar una revancha ↗','rematch')+button('Cambiar jugadores o reglas','change-setup','outline')+'</div>'+(isDemo?'<div class="trazo-demo-upsell"><span>✦ FIN DE LA DEMO</span><h3>¿Nos animamos a más?</h3><p>Desbloqueá 1.274 palabras, todas las categorías y partidas completas.</p><a class="trazo-btn trazo-btn--primary" href="/juegos/pack#comprar" target="_top">Desbloquear juego completo ↗</a></div>':'')+'<p class="trazo-small-print">'+(isDemo?'2 palabras fijas de muestra':wordBank.length.toLocaleString('es-AR')+' ideas originales')+'. Ningún dibujo se guarda ni se sube.</p></section>',
    scores:()=>'<section class="trazo-screen trazo-result-screen"><span class="trazo-kicker">PUNTOS HASTA AHORA</span><h2 class="trazo-headline">El tablero de<br/><em>los artistas.</em></h2><p class="trazo-stage-copy">'+esc(headerSubtitle())+'</p>'+scoreCards()+'<div class="trazo-stage-actions">'+button('Volver a la partida','back-to-pass')+'</div></section>'
  };
  function formatTime(seconds){const s=Math.max(0,seconds);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
  function setupEvents(){
    const form=document.getElementById('trazo-setup');
    form?.addEventListener('submit',event=>{
      event.preventDefault();
      const a=document.getElementById('trazo-name-a').value.trim().replace(/\s+/g,' ').slice(0,28);
      const b=document.getElementById('trazo-name-b').value.trim().replace(/\s+/g,' ').slice(0,28);
      if(!a||!b){toast('Necesitamos los nombres de los dos.');return;}
      if(a.toLocaleLowerCase('es')===b.toLocaleLowerCase('es')){toast('Elegí nombres distintos para reconocer los turnos.');return;}
      state.nameA=a;state.nameB=b;
      state.deck=makeDeck();state.round=0;state.scores=[0,0];state.successes=0;state.revealed=false;state.lastResult=null;
      transition('pass');haptic();
    });
    for(const b of root.querySelectorAll('[data-setting]'))b.addEventListener('click',()=>{
      if(isDemo&&b.dataset.setting==='rounds')return;
      state.nameA=document.getElementById('trazo-name-a')?.value||'';
      state.nameB=document.getElementById('trazo-name-b')?.value||'';
      state[b.dataset.setting]=Number(b.dataset.value);transition('setup');
    });
    document.getElementById('trazo-category')?.addEventListener('change',e=>{if(isDemo){e.target.value='all';return;}state.category=e.target.value;});
    document.getElementById('trazo-difficulty')?.addEventListener('change',e=>{if(isDemo){e.target.value='mixed';return;}state.difficulty=e.target.value;});
  }
  function beginRound(){state.revealed=false;state.strokes=[];state.eraser=false;state.color=COLORS[0][0];state.width=6;state.secondsLeft=state.time;transition('pass');}
  function finishRound(result){
    if(state.phase!=='draw')return;
    stopTimer();
    state.lastResult=result;
    if(result==='correct'){
      state.scores[guesserIndex()]+=2;
      state.scores[drawerIndex()]+=1;
      state.successes++;
      haptic([20,40,20]);
    }else haptic(8);
    transition('result');
  }
  function confirmGiveUp(){openModal('¿Se rinden con esta palabra?','Se revelará la respuesta y esta ronda no sumará puntos.','Sí, rendirse',()=>{finishRound('skip');});}
  function openModal(title,detail,confirm,callback){
    closeModal();
    const backdrop=document.createElement('div');backdrop.className='trazo-modal-backdrop';backdrop.id='trazo-dialog';
    backdrop.innerHTML='<section class="trazo-modal" role="dialog" aria-modal="true" aria-labelledby="trazo-modal-title"><h3 id="trazo-modal-title">'+esc(title)+'</h3><p>'+esc(detail)+'</p><div class="trazo-button-row"><button type="button" class="trazo-btn trazo-btn--outline" data-modal="cancel">Cancelar</button><button type="button" class="trazo-btn trazo-btn--primary" data-modal="confirm">'+esc(confirm)+'</button></div></section>';
    backdrop.addEventListener('click',e=>{if(e.target===backdrop)closeModal();});
    backdrop.querySelector('[data-modal=cancel]').addEventListener('click',closeModal);
    backdrop.querySelector('[data-modal=confirm]').addEventListener('click',()=>{closeModal();callback();});
    document.body.appendChild(backdrop);backdrop.querySelector('[data-modal=cancel]').focus();
  }
  function closeModal(){document.getElementById('trazo-dialog')?.remove();}
  function onAction(action){
    switch(action){
      case 'setup':transition('setup');break;
      case 'how':openModal('Así se juega','Eligen sus nombres. Quien dibuja mira una palabra sin mostrarla; la oculta y comienza a dibujar con el dedo. La otra persona adivina en voz alta. Si acierta, gana 2 puntos y quien dibuja gana 1. Después cambian los turnos.','Entendido',()=>{});break;
      case 'show-secret':state.revealed=false;transition('secret');break;
      case 'reveal':state.revealed=true;haptic();transition('secret');break;
      case 'reroll':{
        if(isDemo){toast('La demo tiene dos palabras fijas.');return;}
        const used=state.deck.filter((_,i)=>i!==state.round).map(w=>w.label);
        const options=wordBank.filter(w=>(state.category==='all'||w.category===state.category)&&(state.difficulty==='mixed'||w.difficulty===state.difficulty)&&!used.includes(w.label)&&w.label!==prompt().label);
        if(!options.length){toast('No hay más palabras en esta categoría.');return;}
        state.deck[state.round]=shuffle(options)[0];state.revealed=false;transition('secret');toast('Elegimos otra palabra.');break;
      }
      case 'start-drawing':if(!state.revealed){toast('Primero tenés que mirar la palabra.');break;}state.revealed=false;state.secondsLeft=state.time;state.strokes=[];transition('draw');break;
      case 'correct':finishRound('correct');break;
      case 'giveup':confirmGiveUp();break;
      case 'next-round':if(state.round>=state.rounds-1){transition('final');}else{state.round++;beginRound();}break;
      case 'scores':transition('scores');break;
      case 'back-to-pass':transition('pass');break;
      case 'rematch':state.deck=makeDeck();state.round=0;state.scores=[0,0];state.successes=0;beginRound();break;
      case 'change-setup':transition('setup');break;
      case 'eraser':state.eraser=!state.eraser;updateTools();haptic(5);break;
      case 'undo':if(state.strokes.length){state.strokes.pop();redraw();updateTools();}break;
      case 'clear':openModal('¿Borrar todo el dibujo?','Podés comenzar de nuevo, pero el tiempo sigue corriendo.','Borrar lienzo',()=>{state.strokes=[];redraw();updateTools();});break;
      default:break;
    }
  }
  function attach(phase){
    for(const el of root.querySelectorAll('[data-action]'))el.addEventListener('click',()=>onAction(el.dataset.action));
    if(phase==='setup')setupEvents();
    if(phase==='draw')setupDrawing();
  }
  function updateTools(){
    root.querySelectorAll('[data-color]').forEach(el=>{const selected=!state.eraser&&el.dataset.color===state.color;el.classList.toggle('is-selected',selected);el.setAttribute('aria-pressed',String(selected));});
    root.querySelectorAll('[data-width]').forEach(el=>{const selected=Number(el.dataset.width)===state.width;el.classList.toggle('is-selected',selected);el.setAttribute('aria-pressed',String(selected));});
    const erase=root.querySelector('[data-action=eraser]');erase?.classList.toggle('is-selected',state.eraser);
    const undo=root.querySelector('[data-action=undo]');if(undo)undo.disabled=!state.strokes.length;
    const hint=root.querySelector('#trazo-canvas-hint');if(hint)hint.style.opacity=state.strokes.length?0:1;
  }
  function resizeCanvas(){
    if(!canvas||!ctx)return;
    const rect=canvas.getBoundingClientRect();
    if(rect.width<10||rect.height<10)return;
    const dpr=Math.max(1,Math.min(window.devicePixelRatio||1,3));
    const w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    ctx.setTransform(dpr,0,0,dpr,0,0);
    redraw();
  }
  function paint(stroke,from=0){
    if(!ctx||!canvas||!stroke.points.length)return;
    const w=canvas.clientWidth,h=canvas.clientHeight,scale=w/400;
    ctx.save();
    if(stroke.color==='erase'){ctx.globalCompositeOperation='destination-out';ctx.strokeStyle='#000';ctx.fillStyle='#000';}else{ctx.globalCompositeOperation='source-over';ctx.strokeStyle=stroke.color;ctx.fillStyle=stroke.color;}
    ctx.lineWidth=Math.max(2,stroke.width*scale);ctx.lineCap='round';ctx.lineJoin='round';
    const p=stroke.points;
    if(p.length===1){ctx.beginPath();ctx.arc(p[0][0]*w,p[0][1]*h,ctx.lineWidth/2,0,2*Math.PI);ctx.fill();}
    else{ctx.beginPath();const prev=p[Math.max(0,from-1)];ctx.moveTo(prev[0]*w,prev[1]*h);
      for(let i=Math.max(1,from);i<p.length;i++)ctx.lineTo(p[i][0]*w,p[i][1]*h);
      ctx.stroke();
    }
    ctx.restore();
  }
  function redraw(){if(!ctx||!canvas)return;ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);for(const stroke of state.strokes)paint(stroke);const hint=root.querySelector('#trazo-canvas-hint');if(hint)hint.style.opacity=state.strokes.length?0:1;}
  function coords(e){const rect=canvas.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width)),Math.max(0,Math.min(1,(e.clientY-rect.top)/rect.height))];}
  function setupDrawing(){
    canvas=root.querySelector('#trazo-canvas');ctx=canvas.getContext('2d',{alpha:true});
    if(!ctx){toast('Tu navegador no permite dibujar.');return;}
    resizeObserver=new ResizeObserver(resizeCanvas);resizeObserver.observe(canvas);
    resizeCanvas();updateTools();
    canvas.addEventListener('pointerdown',e=>{
      if(state.phase!=='draw'||pointerId!==null||e.isPrimary===false)return;
      if(e.cancelable)e.preventDefault();
      pointerId=e.pointerId;try{canvas.setPointerCapture(pointerId);}catch{/* browser fallback */}
      activeStroke={color:state.eraser?'erase':state.color,width:state.eraser?26:state.width,points:[coords(e)]};state.strokes.push(activeStroke);
      paint(activeStroke);updateTools();
    });
    canvas.addEventListener('pointermove',e=>{
      if(pointerId!==e.pointerId||!activeStroke||state.phase!=='draw')return;
      if(e.cancelable)e.preventDefault();
      const next=coords(e),prev=activeStroke.points[activeStroke.points.length-1];
      if(Math.hypot((next[0]-prev[0])*canvas.clientWidth,(next[1]-prev[1])*canvas.clientHeight)<1.2)return;
      const before=activeStroke.points.length;activeStroke.points.push(next);
      paint(activeStroke,before);
    });
    const finish=e=>{if(pointerId!==e.pointerId)return;pointerId=null;activeStroke=null;};
    canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);canvas.addEventListener('lostpointercapture',finish);
    root.querySelectorAll('[data-color]').forEach(el=>el.addEventListener('click',()=>{state.color=el.dataset.color;state.eraser=false;updateTools();}));
    root.querySelectorAll('[data-width]').forEach(el=>el.addEventListener('click',()=>{state.width=Number(el.dataset.width);updateTools();}));
    if(state.time!==0){
      deadline=Date.now()+state.time*1000;
      timerId=setInterval(()=>{
        if(document.hidden)return;
        state.secondsLeft=Math.max(0,Math.ceil((deadline-Date.now())/1000));
        const el=document.getElementById('trazo-timer');if(el){el.textContent=formatTime(state.secondsLeft);el.classList.toggle('is-low',state.secondsLeft<=15);}
        if(state.secondsLeft<=0)finishRound('timeout');
      },190);
    }
  }
  document.addEventListener('visibilitychange',()=>{
    if(state.phase!=='draw'||state.time===0)return;
    if(document.hidden)hiddenAt=Date.now();
    else if(hiddenAt){deadline+=Date.now()-hiddenAt;hiddenAt=0;}
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
  transition('home');
  // Lightweight diagnostics for local audits; never touches the network.
  window.__TRAZO_QA__={isDemo,wordCount:wordBank.length,wordBank:wordBank.map(w=>({label:w.label,category:w.category,difficulty:w.difficulty})),getState:()=>({phase:state.phase,round:state.round,scores:[...state.scores],strokes:state.strokes.length,secondsLeft:state.secondsLeft,revealed:state.revealed})};
})();

