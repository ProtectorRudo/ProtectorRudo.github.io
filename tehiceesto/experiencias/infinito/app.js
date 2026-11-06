/* TeHiceEsto · experimento de viaje cósmico. Vista previa HTML/JS sin servidor.
   Código canónico del modelo: ProtectorRudo/Tehiceesto, PR #91.
   Mantener cambios de diseño en la fuente y sincronizar esta vista previa después. */
(() => {
  "use strict";
  const COPY = {
    recipient: "vos",
    giver: "alguien que te quiere muchísimo",
    closing: "No importa cuánto crezca el universo. Siempre voy a encontrar una forma de quererte un poquito más.",
    signature: "Con todo mi amor",
  };
  const STAGES = [
    {
      name: "La Tierra", eyebrow: "MEDICIÓN 01 · PLANETA TIERRA",
      heading: "Empecemos por algo chiquito.", intro: "Bueno… chiquito, chiquito, no.",
      hint: "Tocá la Tierra para medir",
      reveal: "12.742 km de diámetro. Nada mal. Aunque mis ganas de verte ya dieron como cinco vueltas.",
      next: "Busquemos algo más grande"
    },
    {
      name: "El Sol", eyebrow: "MEDICIÓN 02 · EL SOL",
      heading: "Ah, bueno. Esto sí que es enorme.", intro: "Entra más de un millón de Tierras acá adentro.",
      hint: "Tocá el Sol (no quema, prometido)",
      reveal: "Igual se queda corto. Vos me hacés sonreír más fuerte que el Sol… y sin protector solar.",
      next: "Necesitamos algo gigante"
    },
    {
      name: "La galaxia", eyebrow: "MEDICIÓN 03 · VÍA LÁCTEA",
      heading: "Probemos con toda una galaxia.", intro: "Estrellas, planetas y un montón de espacio.",
      hint: "Tocá la galaxia para explorar",
      reveal: "Calculé millones de estrellas. Pero ninguna explica bien lo que me pasa cuando te reís.",
      next: "Creo que falta espacio"
    },
    {
      name: "El universo", eyebrow: "MEDICIÓN 04 · UNIVERSO",
      heading: "Ahora sí. Todo lo que existe.", intro: "Esto debería alcanzar. ¿No?",
      hint: "Tocá el universo para comprobar",
      reveal: "ERROR 404: medida del amor no encontrada. La calculadora renunció y Mercurio pidió vacaciones.",
      next: "Queda una última cosa…"
    },
    {
      name: "Lo nuestro", eyebrow: "MEDICIÓN 05 · RESULTADO FINAL",
      heading: "Encontré algo más grande.", intro: "Y no aparece en ningún telescopio.",
      hint: "Tocá el corazón para descubrirlo",
      reveal: "Mi amor por vos no entra en el universo. Y mirá que espacio le sobra.", next: ""
    },
  ];
  const starPoints = Array.from({ length: 55 }, (_, index) => ({
    left: ((index * 73 + 19) % 97) + "%",
    top: ((index * 41 + index * index * 7) % 96) + "%",
    delay: ((index * 13) % 29) / 10 + "s",
    size: index % 9 === 0 ? "3px" : index % 3 === 0 ? "2px" : "1px",
  }));
  const earthSVG = \`
    <svg class="gal-planet-svg" viewBox="0 0 240 240" role="img" aria-label="Ilustración animada de la Tierra">
      <defs>
        <radialGradient id="gal-ocean" cx="34%" cy="28%" r="78%">
          <stop offset="0" stop-color="#b4f0ff"/><stop offset=".40" stop-color="#328bc6"/><stop offset="1" stop-color="#0b285a"/>
        </radialGradient>
        <clipPath id="gal-earth-clip"><circle cx="120" cy="120" r="100"/></clipPath>
        <radialGradient id="gal-earth-highlight" cx="25%" cy="18%" r="85%">
          <stop offset="0" stop-color="#fff" stop-opacity=".53"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#050a3b" stop-opacity=".38"/>
        </radialGradient>
      </defs>
      <circle cx="120" cy="120" r="108" fill="#4fbbff" opacity=".12"/>
      <circle cx="120" cy="120" r="100" fill="url(#gal-ocean)" stroke="#9fe9ff" stroke-opacity=".48" stroke-width="2"/>
      <g clip-path="url(#gal-earth-clip)" fill="#7ece9f">
        <path d="M46 53 73 27l30 17 6 20 21 8 5 22-18 13-9 27-17 6-19-20-26-2-18-27Z"/>
        <path d="m100 152 34 12 9 27-10 21-17 32-18-6-1-31-15-20 8-22Z"/>
        <path d="m159 37 32 15 21 28-4 19-19 8-9 27-17-6-18-29-22-5-5-24 22-10Z"/>
        <path d="m189 159 26 2 17 20-9 27-36 9-12-19 7-24Z"/>
        <path d="m35 145 25 1 10 19-18 18-28-7Z"/>
      </g>
      <circle cx="120" cy="120" r="100" fill="url(#gal-earth-highlight)"/>
      <ellipse cx="88" cy="90" rx="23" ry="9" fill="#fff" opacity=".26" transform="rotate(-35 88 90)"/>
    </svg>\`;
  const sun = \`<div class="gal-sun-wrap" role="img" aria-label="Sol radiante y animado">
    <div class="gal-sun-rays"></div><div class="gal-sun-disc"></div>
    <div class="gal-sun-spark gal-sun-spark-a"></div><div class="gal-sun-spark gal-sun-spark-b"></div>
  </div>\`;
  function galaxy(small) {
    return \`<div class="gal-galaxy\${small ? " gal-galaxy-small" : ""}" role="img" aria-label="Galaxia espiral luminosa">
      <span class="gal-galaxy-arm gal-galaxy-arm-a"></span><span class="gal-galaxy-arm gal-galaxy-arm-b"></span>
      <span class="gal-galaxy-arm gal-galaxy-arm-c"></span><span class="gal-galaxy-core"></span>
      <span class="gal-galaxy-spark gal-galaxy-spark-1"></span><span class="gal-galaxy-spark gal-galaxy-spark-2"></span>
      <span class="gal-galaxy-spark gal-galaxy-spark-3"></span><span class="gal-galaxy-spark gal-galaxy-spark-4"></span>
    </div>\`;
  }
  function universe() {
    return \`<div class="gal-universe" role="img" aria-label="Universo con múltiples galaxias de colores">
      <span class="gal-universe-orbit gal-universe-orbit-1"></span>
      <span class="gal-universe-orbit gal-universe-orbit-2"></span>
      <span class="gal-universe-orbit gal-universe-orbit-3"></span>
      <div class="gal-universe-main">\${galaxy(false)}</div>
      <div class="gal-universe-mini gal-universe-mini-a">\${galaxy(true)}</div>
      <div class="gal-universe-mini gal-universe-mini-b">\${galaxy(true)}</div>
      <div class="gal-universe-mini gal-universe-mini-c">\${galaxy(true)}</div>
      <span class="gal-universe-star gal-universe-star-a">✦</span>
      <span class="gal-universe-star gal-universe-star-b">✧</span>
      <span class="gal-universe-star gal-universe-star-c">✦</span>
    </div>\`;
  }
  function heart(discovered) {
    return \`<div class="gal-heart-wrap\${discovered ? " gal-heart-wrap-open" : ""}">
      <svg viewBox="0 0 350 320" class="gal-heart-svg" role="img" aria-label="Corazón enorme que late">
        <defs>
          <radialGradient id="gal-heart-fill" cx="34%" cy="20%" r="92%">
            <stop offset="0" stop-color="#ffe5db"/><stop offset=".42" stop-color="#ff92a8"/><stop offset="1" stop-color="#ce477e"/>
          </radialGradient>
          <filter id="gal-heart-shadow" x="-35%" y="-35%" width="170%" height="170%"><feGaussianBlur stdDeviation="11"/></filter>
        </defs>
        <path d="M175 299C157 281 20 182 20 105 20 44 61 23 105 23c29 0 55 15 70 41 15-26 41-41 70-41 44 0 85 21 85 82 0 77-137 176-155 194Z" fill="#f75d99" opacity=".32" filter="url(#gal-heart-shadow)"/>
        <path d="M175 292C155 272 27 177 27 107 27 54 62 29 107 29c30 0 56 17 68 42 12-25 38-42 68-42 45 0 80 25 80 78 0 70-128 165-148 185Z" fill="url(#gal-heart-fill)" stroke="#ffd6df" stroke-width="3"/>
        <path d="M55 101c4-34 28-51 58-49" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" opacity=".52"/>
        <path d="M140 70c11 5 18 12 22 18" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".18"/>
        \${discovered ? \`<g fill="none" stroke="#76294d" stroke-width="5" stroke-linecap="round">
          <path d="M120 143q17-18 34 0"/><path d="M197 143q17-18 34 0"/><path d="M159 182q17 26 35 0"/>
        </g>\` : ""}
      </svg>
      <span class="gal-heart-spark gal-heart-spark-a">✦</span>
      <span class="gal-heart-spark gal-heart-spark-b">♡</span>
      <span class="gal-heart-spark gal-heart-spark-c">✧</span>
    </div>\`;
  }
  function object(stage, discovered) {
    return [null, earthSVG, sun, galaxy(false), universe(), heart(discovered)][stage];
  }
  let stage = 0, discovered = false, finished = false, transitioning = false, touch = null, finalTimer = 0;
  const app = document.querySelector("#cosmos-app");
  if (!app) throw Error("Falta el contenedor de la experiencia");
  const sky = \`<div class="gal-sky" aria-hidden="true">\${starPoints.map(p => \`<span class="gal-sky-star" style="left:\${p.left};top:\${p.top};width:\${p.size};height:\${p.size};animation-delay:\${p.delay}"></span>\`).join("")}
    <span class="gal-sky-haze gal-sky-haze-one"></span><span class="gal-sky-haze gal-sky-haze-two"></span>
  </div>\`;
  function intro() {
    return \`<section class="gal-intro">
      <p class="gal-eyebrow">UNA HISTORIA POCO CIENTÍFICA</p>
      <div class="gal-intro-orbit" aria-hidden="true"><span class="gal-orbit-a"></span><span class="gal-orbit-b"></span><span class="gal-intro-heart">♥</span></div>
      <h1>¿Cuánto <em>te quiero?</em></h1>
      <p class="gal-intro-description">Quise averiguarlo usando cosas enormes del espacio. La ciencia no estaba preparada.</p>
      <button class="gal-primary" data-action="begin">Empezar a medir <span aria-hidden="true">↗</span></button>
      <p class="gal-intro-small">5 descubrimientos · 1 final muy nuestro</p>
    </section>\`;
  }
  function chapter() {
    const c = STAGES[stage - 1];
    const feedback = discovered ? \`<div class="gal-reveal">
      \${stage === 4 ? '<span class="gal-error-label">ALERTA CÓSMICA · SIN ESCALA</span>' : ""}
      \${stage === 5 ? '<span class="gal-error-label">MEDIDOR DE AMOR: ∞</span>' : ""}
      <p>\${c.reveal}</p></div>\` : "";
    const card = stage === 5 && finished ? \`<div class="gal-final-note">
      <p>Para \${COPY.recipient}: \${COPY.closing}</p>
      <span>\${COPY.signature} · \${COPY.giver} ♡</span>
    </div>\` : "";
    return \`<section class="gal-chapter" aria-labelledby="gal-title">
      <div class="gal-chapter-copy"><p class="gal-eyebrow">\${c.eyebrow}</p><h1 id="gal-title">\${c.heading}</h1><p class="gal-chapter-intro">\${c.intro}</p></div>
      <div class="gal-object-stage gal-object-stage-\${stage}">
        <div class="gal-orbit-ambient" aria-hidden="true"></div>
        <button class="gal-discover-object gal-discover-object-\${stage}\${discovered ? " gal-object-discovered" : ""}" data-action="reveal"
          aria-label="\${c.hint}" aria-pressed="\${String(discovered)}">
          \${object(stage, discovered)}
        </button>
        \${!discovered ? \`<p class="gal-touch-hint"><span aria-hidden="true">✧</span> \${c.hint}</p>\` : ""}
      </div>
      <div class="gal-reveal-area" aria-live="polite">\${feedback}\${card}</div>
      <div class="gal-controls">
        \${stage > 1 ? '<button class="gal-back" data-action="back" aria-label="Volver al descubrimiento anterior">←</button>' : ""}
        \${discovered && stage < 5 ? \`<button class="gal-primary" data-action="next">\${c.next} <span aria-hidden="true">↗</span></button>\` : ""}
        \${finished && stage === 5 ? '<button class="gal-primary" data-action="restart">Volver a vivirlo <span aria-hidden="true">↺</span></button>' : ""}
      </div>
    </section>\`;
  }
  function render() {
    app.innerHTML = \`<main class="gal-experience">
      \${sky}
      <div class="gal-topbar">
        <a href="https://tehiceesto.com/" class="gal-brand" aria-label="Volver a Te Hice Esto">te hice esto <span>✳</span></a>
        <span class="gal-progress" aria-live="polite">\${stage === 0 ? "UNA HISTORIA PARA VOS" : String(stage).padStart(2, "0") + " / 05"}</span>
      </div>
      \${stage > 0 ? \`<div class="gal-step-trail" role="progressbar" aria-label="Progreso del viaje" aria-valuemin="0" aria-valuemax="5" aria-valuenow="\${stage}">
        \${STAGES.map((c, index) => \`<span class="gal-step-dot\${index + 1 <= stage ? " gal-step-dot-on" : ""}"></span>\`).join("")}
      </div>\` : ""}
      <div class="gal-frame">\${stage === 0 ? intro() : chapter()}</div>
      <div class="gal-bottom-brand">UN PEQUEÑO UNIVERSO HECHO PARA ALGUIEN <span>✦</span> TE HICE ESTO</div>
    </main>\`;
    app.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        if (action === "begin") changeStage(1);
        if (action === "reveal") reveal();
        if (action === "back") changeStage(stage - 1);
        if (action === "next") changeStage(stage + 1);
        if (action === "restart") changeStage(0);
      });
    });
    app.querySelector(".gal-experience").addEventListener("touchstart", e => {
      const t = e.changedTouches[0];
      touch = { x: t.clientX, y: t.clientY };
    }, { passive: true });
    app.querySelector(".gal-experience").addEventListener("touchend", e => {
      if (!touch) return;
      const t = e.changedTouches[0], dx = t.clientX - touch.x, dy = t.clientY - touch.y;
      touch = null;
      if (Math.abs(dx) < 95 || Math.abs(dy) > 65) return;
      if (dx < 0 && stage > 0 && stage < 5 && discovered) changeStage(stage + 1);
      if (dx > 0 && stage > 1) changeStage(stage - 1);
    }, { passive: true });
  }
  function changeStage(next) {
    if (transitioning || next < 0 || next > 5) return;
    transitioning = true;
    clearTimeout(finalTimer);
    const frame = app.querySelector(".gal-frame");
    if (frame) frame.classList.add("gal-frame-exit");
    setTimeout(() => {
      stage = next;
      discovered = false;
      finished = false;
      transitioning = false;
      render();
    }, 250);
  }
  function reveal() {
    if (discovered || transitioning) return;
    discovered = true;
    if (navigator.vibrate) navigator.vibrate(stage === 5 ? [35, 55, 35] : 24);
    render();
    if (stage === 5) {
      finalTimer = setTimeout(() => { finished = true; render(); }, 850);
    }
  }
  render();
})();
