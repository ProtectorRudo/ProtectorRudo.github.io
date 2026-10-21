# BLACKZONE — Tactical AR (V29)

**Nombre actual del juego: BLACKZONE.** Anteriormente denominado *La Casa Alterada*, conservado en la ruta heredada del repositorio y en el enlace Vercel existente para evitar romper enlaces de versiones anteriores.

Shooter táctico web de realidad aumentada con dos modos: **Rescate de Rehenes (cooperativo)** y **Captura la Bandera (cooperativo o versus con bots configurables)**.

El historial técnico anterior se conserva debajo, con descripciones correspondientes a cada etapa del desarrollo.

## V29 — Entrada táctil AR dedicada y combatientes humanos texturizados

- **Liberación del rehén reparada en la interfaz**, no solo en la lógica de misión: botón independiente en el HUD, por encima de otros paneles; separado de las habilidades y de la selección de cobertura, con área táctil de al menos 53 px.
- El control procesa directamente `pointerdown` y `touchstart` en capturas reales de Android/WebXR; `click` queda para teclado y como respaldo. Debounce evita procesar más de una vez el mismo toque.
- Mensajes de diagnóstico **TOQUE DETECTADO** y **REHÉN LIBERADO**, o indicación de distancia/obstrucción si el motor rechaza el rescate. Sin barra ni temporizadores del 99 %.
- **Combatientes con la misma biblioteca 3D que Maya, la rehén**: fuentes masculinas realistas Jordan, Sam y Harper (studio MakeHuman / Innerscene, CC0), en lugar de los modelos estilizados de Counter-Strike-in-browser. Se les suma chaleco, correas, radio y armamento táctico en 3D, dejando piel, pelo y rostro humano visibles.
- Recursos GLB compartidos por URL para reducir descargas/decodificaciones duplicadas en móviles. Se conserva el personaje procedural como respaldo si falla la carga.
- Los cambios preservan AR V25, IA V27 y el rescate inmediato V28. Las pruebas automatizadas simulan la entrada táctil real, pero la apariencia y la interacción definitivas requieren una prueba en el teléfono.

## V28 — Rescate instantáneo: fin del bloqueo en 99 %

- **Un toque = rehén liberado inmediatamente.** Eliminada la espera de 1,55 segundos ligada al reloj WebXR. No hay barra de progreso ni existe el estado 99 %.
- El anfitrión valida cercanía y obstáculos, **confirma la fase de escolta antes de invocar animaciones y eventos**, y envía el cambio al equipo. Un fallo visual no deshace la liberación.
- El chequeo de obstáculos ahora usa altura torso-torso, evitando falsas obstrucciones entre la cámara y los pies del rehén. A menos de 78 cm se considera contacto directo.
- Los refuerzos aparecen 3 segundos después en un ciclo separado, no dentro de la interacción táctil.
- Los invitados pueden reintentar si el anfitrión no confirma en 1,6 segundos. No quedan trabados esperando eternamente.
- Nuevas pruebas validan transición completa a 60 cm, fallos de animación y sonido, distancia máxima y ausencia de dependencia del reloj AR.
- Falta validación en un teléfono real; las pruebas automáticas no certifican WebXR físico.

## V27 — Bandera, IA y coberturas tácticas

- **Captura de bandera funcional:** los jugadores pueden recoger la bandera rival a 1,55 m, automáticamente o usando el botón ROBAR BANDERA. Radio de retorno a base ampliado a 1,38 m; transferencia de portadores bots aliados. El anfitrión valida las solicitudes de invitados y sincroniza la partida.
- **Bots no idénticos:** seis roles (centinela, corredor, flanqueador, apoyo, explorador, asalto), velocidades por dificultad, puntos de entrada distribuidos, separación entre compañeros y flanqueo con destino lateral persistente.
- **Colocar obstáculos durante la partida:** cajón, barricada y hormigón. Estos objetos se mantienen visibles en 3D, bloquean proyectiles y movimiento, y pueden usarse para buscar protección y agacharse. Se sincronizan con el equipo. Límite de 10 coberturas virtuales y protección frente a solapamientos.
- **Posturas:** los enemigos se agachan detrás de las coberturas, se incorporan para disparar y usan animación de carrera al avanzar, con estado visible en los clientes cooperativos.
- **Personajes detallados:** segunda variante de operador GLB con equipamiento táctico.
- Los obstáculos son virtuales y colocados por el usuario. No detectan automáticamente muebles físicos ni habilitan a desplazarse sin mirar el entorno real.
- Sigue pendiente una validación física en Android ARCore y con varios celulares.

## V26 — Modelos de personaje detallados y rescate sin mantener presionado

- Restablecidos **modelos GLB animados de alta calidad también en WebXR**: la rehén Maya y los combatientes tácticos con equipamiento, máscaras y distintas apariencias. Se cargan progresivamente después del modelo de respaldo; si el archivo no está disponible, se conserva la figura básica.
- Nuevo **modelo de rehén de respaldo más humano**: torso, rostro, ojos, nariz, cabello, brazos articulados y piernas proporcionadas. Sustituye el conjunto de esferas sobredimensionadas.
- **Escala corporal** de la rehén normalizada; ahora la cámara puede acercarse sin ver una cabeza desproporcionada. Marcadores del objetivo reducidos para no distraer.
- **Liberación con un solo toque**: barra automática de 1,55 s, sin pointer capture, sin mantener presionado ni esperar al soltar el dedo. Se cancela únicamente si te alejás del radio de 1,55 m. El anfitrión confirma el rescate también en cooperativo.
- El ciclo de progreso no utiliza el antiguo máximo de 99 % ni la comprobación de 750 ms de pulsación; incluye regresiones de finalización, cancelación y multijugador.
- Mantiene el compositor AR V25 y la protección frente a ataques hasta confirmar que los jugadores enemigos son visibles.
- Modelos externos documentados en THIRD_PARTY_NOTICES.md. Su disponibilidad en teléfonos reales depende de conexión y decodificación GLB; CI no puede certificar la apariencia final en cada dispositivo.

## V25 — AR visible y combate con confirmación

**Problema reportado:** las capturas reales de Android mostraban cámara y rifle, mientras el HUD informaba un rehén a 1,8–2,2 metros y 2 bots dentro del cono de mirada, sin que ninguna figura 3D apareciera.

- **Nuevo compositor WebGL transparente dentro del DOM overlay de WebXR**, separado del framebuffer AR nativo. Copia la posición, matriz de cámara y proyección del ojo XR para dibujar los modelos reales anclados al espacio, no sprites fijos.
- El renderer nativo AR sigue activo para la pose y hit-test, pero dibuja una escena vacía. La capa DOM dibuja el mundo 3D y elimina el riesgo de mostrar dos veces la escena.
- Conserva el renderer de arma independiente. Se remueve depth-sensing optativo (no se usa para oclusión hasta validarlo).
- **Combate seguro por defecto en Rescate AR**: bots y rehén no reciben disparos dañinos mientras el jugador no confirme visualmente que los enemigos se ven; los segundos de misión no se descuentan antes de confirmar. El botón de confirmación solo aparece después de haber creado al menos un enemigo. Al activarlo hay 4 segundos adicionales de protección.
- HUD de AR reducido para dejar visible el centro de la cámara, y diagnóstico explícito de la capa 3D.
- Pruebas automatizadas del compositor con un renderer/cámara simulados. **Todavía requiere prueba física en Chrome Android**, porque CI no puede validar la composición ARCore.

## V24 — Emergencia: personajes AR visibles y diagnóstico verificable

- **AR independiente de GLB:** los personajes y el rehén mantienen la geometría táctica nativa (no se oculta el modelo básico para reemplazarlo por un archivo descargado). Las figuras animadas se conservan en práctica 3D; esto es temporal hasta validar renderizado real.
- **Tamaño:** enemigos de Rescate pasan de escala 0,68 a 0,96; mejor legibilidad desde la cámara. Bots de captura pasan de 0,92 a 1.
- **Aparición con distancia frontal:** posiciones no superpuestas a más de 3 metros en la dirección inicial de cámara, con rechazo en zonas mapeadas demasiado pequeñas (no se crean amenazas fuera del perímetro).
- **Disparos condicionados:** solo si el enemigo está en el cono de cámara, visible en el grafo 3D y sin protección de arranque; las posiciones fuera de cámara no pueden infligir daño.
- **Rehén:** conserva la figura propia y un marcador de objetivo brillante en la escena, independiente de internet.
- **Diagnóstico in situ:** el HUD muestra cantidad de objetos 3D creados y los que están geométricamente frente a la cámara; *no afirma que efectivamente se hayan dibujado en un celular*. Botón **VERIFICAR 3D** coloca un rombo verde a 1,8 m de la cámara por siete segundos, y prolonga el escudo en Rescate mientras se comprueba el renderizado. Si el rombo tampoco aparece, investigar WebXR/Three renderer/dispositivo, no la IA.
- Sin pruebas de cámara de un celular real todavía. Los tests cubren geometría y regresiones, pero la prueba de un dispositivo compatible continúa siendo necesaria.

## V23 — Hotfix visibilidad y arranque seguro del Rescate

- **Causa del fallo:** el inicio creaba ocho enemigos armados casi inmediatamente alrededor del punto de entrada, incluso detrás de la cámara. La muestra de profundidad AR también podía ocultar actores aunque siguieran disparando.
- **Inicio protegido:** 12,5 segundos sin recibir daño; primeras apariciones postergadas 7,4 segundos y una primera oleada de cinco enemigos.
- **Visibilidad:** enemigos posicionados delante de la cámara con puntos de advertencia anaranjados, y marcador de rehén de alto contraste visible con o sin descarga de modelos 3D.
- **Combate justo:** los enemigos de Rescate solo pueden comenzar/disparar ráfagas cuando están por delante, en campo visual y la protección inicial terminó.
- **AR:** desactivado temporalmente el enmascarado por datos de profundidad no verificados. Se conserva el escaneo espacial y los obstáculos definidos manualmente.
- **Multijugador:** los invitados también tienen protección inicial y el rehén recibe blindaje temporal al empezar.
- **Pendiente:** verificación visual en celular compatible con ARCore, distintos tamaños de habitación y dos teléfonos. Las pruebas automatizadas no sustituyen pruebas físicas.

## V22 — Estabilidad táctica, cobertura auténtica y FPS adaptativos

- Los bots **alcanzan el punto de asomarse** (ya no se frenan a 1,58 m de la cobertura).
- Rescate y Captura **bloquean disparos desde posiciones ocultas**, permitiendo ráfagas solo durante la exposición; mira roja solo ante objetivo no tapado por obstáculos mapeados.
- Los bots con rutas bloqueadas abandonan su plan tras 3,2 segundos sin avance y vuelven a intentar después, sin bucles infinitos.
- Máximo 68 proyectiles enemigos simultáneos; la geometría y el material se reutilizan para evitar asignaciones gráficas por disparo.
- Resolución **adaptativa solo en práctica 3D**: reduce calidad tras FPS bajos sostenidos y la recupera lentamente tras estabilidad alta. En modo AR la resolución queda a cargo de WebXR.
- Añadidos cinco tests de regresión Node y QA conjunta de V21/V22.
- **Pendiente para la próxima tanda:** prueba humana en Chrome Android + ARCore, calibración A/B entre dos móviles, banderas, colisiones y FPS reales. No se ha hecho una verificación física del entorno.

## V21 — IA táctica y efectos móviles
- En **Rescate de Rehenes**, los bots terrestres buscan cobertura marcada, se asoman para disparar y vuelven a resguardarse.
- En **Captura la Bandera**, defensores y atacantes heridos pueden aprovechar coberturas; las animaciones miden la velocidad real y no el deseo de caminar.
- Las coberturas se calculan a partir de paredes y cajas confirmadas por el anfitrión. Sin datos de obstáculos, los bots mantienen su comportamiento anterior.
- Fogonazos, polvo y chispas reutilizan geometrías y tienen un límite de partículas por escena.
- Se mantienen calibración, zona de dos esquinas, cooperativo, versus, práctica 3D y resolución de impactos del anfitrión.
- Pendiente: pruebas en celulares reales y verificación de latencia multijugador. No se detectan muebles reales automáticamente; el espacio debe estar despejado.



---

## Registro original (V3): La Casa Alterada — Protocolo Noche

Juego web de supervivencia AR orientado a Android Chrome/WebXR.

- Modo AR: el jugador busca superficies horizontales y coloca nidos mediante hit-test. Anclajes opcionales por XRAnchor.
- Modo práctica 3D: entorno de prueba con mesa, sillón y piso.
- Pistola 3D: material PBR, mano procedimental, fogonazo, corredera, retroceso físico por resortes de código MIT.
- Enemigos: tres tipos procedimentales, materiales orgánicos y huesos, olas y proyectiles.
- Rendimiento: resolución adaptable a móviles y conteo de enemigos limitado.
- Importante: no hay reconocimiento semántico automático de muebles ni sincronización multiusuario.

Código fuente basado en Three.js. Véase THIRD_PARTY_NOTICES.md.


## V4 — Misiones cooperativas y movimiento

- Operación cooperativa por código para hasta cuatro jugadores, usando PeerJS/WebRTC. El anfitrión sincroniza las fases, enemigos, proyectiles y salud/efectos.
- Cuatro etapas: activar tres sellos; eliminar infiltrados; defender el núcleo durante 40 segundos; derrotar al Alfa.
- Poderes con enfriamiento: pulso de área, escudo de seis segundos, curación del equipo.
- Desplazamiento: en AR se camina físicamente, en práctica 3D hay joystick circular o WASD. Los proyectiles se desplazan por el entorno y pueden esquivarse cambiando de posición.
- Pistola Vulture con mira alternable, retroceso por resortes, fogonazo, recarga y expulsión de casquillos.
- Para multiplayer AR: **todos deben marcar como primer nido el mismo punto del piso mirando hacia la misma pared**. Es calibración manual aproximada, NO un mapa espacial global certificado. Cada dispositivo debe ser compatible con WebXR/ARCore y mantener internet; las partidas dependen del servicio gratuito PeerJS Cloud.
- No hay reconocimiento semántico de muebles, persistencia de sala ni emparejamiento de anclajes de precisión.
- Seguridad: prestar atención a la habitación real; no correr, no jugar cerca de escaleras ni obstáculos. Juego para acompañamiento familiar con supervisión.
- Para iniciar: en la pantalla principal crear equipo y compartir el enlace/código, todos ingresar, seleccionar cámara AR o práctica, calibrar, y el anfitrión inicia la misión.


## V5 — Criaturas móviles

- Enemigos del piso persiguen en tiempo real a los jugadores, cambian de dirección, rodean muebles de la práctica 3D con colisiones sencillas y disparan en movimiento.
- En mesas y sillones, criaturas de tamaño reducido patrullan la superficie sin salir caminando del mueble.
- Animación procedural de brazos, piernas, mandíbula y torso sincronizada con la velocidad real de desplazamiento.
- En la partida cooperativa, el anfitrión decide la posición de los monstruos y los invitados reciben posición, giro y escala actualizados.
- **Límite AR:** no se conoce la geometría 3D completa de muebles y paredes reales; no se garantiza evitar objetos físicos. Caminar despacio sin correr y mirar el entorno real en todo momento.


## V6 — Apuntado del arma y mira corregidos

- El arma se dibuja con una cámara FPS centrada (sin perspectiva lateral falsa).
- Capa transparente a pantalla completa para que la mira ADS y el cañón compartan posición en pantalla.
- Dos poses de arma: cadera y apuntado ADS; transición suave sin balanceos excesivos.
- Los impactos se calculan desde el centro de la cámara. La trayectoria visual se proyecta desde el cañón en pantalla al punto de impacto.
- Reducción de la apariencia de arma recortada y oscura; el overlay conserva el entorno AR sin ocultarlo.
- Controles de mira y FOV actualizados; en AR no se altera la proyección física del dispositivo.

NOTA: el cañón es un modelo de vista en primera persona superpuesto (no está anclado a una pistola real). La alineación se aproxima según la proyección de cada cámara; sigue requiriendo validación visual en dispositivos AR.


## V7 — Operación Sombra / FPS táctico original
- SkillHub game-development / ship-web-games: estilos coherentes, modelos, hitboxes, optimización y publicación verificada.
- Intrusos con pasamontañas y equipo táctico, operadores aliados con casco, visor y chaleco.
- Dos armas 3D originales: carabina VX-4 (28 balas, disparos continuos al mantener presionado) y pistola P-9 (12 balas).
- Cambiar arma, mira ADS, cargadores separados, recarga, recoil, casquillos.
- Diseño FPS competitivo ámbar/pizarra sin logos ni mapas Valve.
- Modelo policial GLB opcional desde ProtectorRudo/viralio, con respaldo procedural. Modelo GLB estático, no locomoción skeletal.
- Misiones AR y multijugador conservados; calibración espacial aproximada.
- V7 requiere prueba visual y rendimiento real en Android/AR.
- SkillHub: https://www.skillhub.club/skills/bigc7292-lj-stone-surfaces-ltd-game-development
- SkillHub release: https://www.skillhub.club/skills/mengto-skills-ship-web-games
- GitHub MIT FPS referencia: https://github.com/R4e-Pi/threejs-fps


## V8 — Asalto y Rescate
- Marcar entrada en el piso, elegir con la cámara dónde colocar al rehén, comenzar el asalto, liberarlo al acercarse y escoltarlo al punto de entrada.
- Luego: desactivar cargas, detener a los intrusos, defender el perímetro y enfrentar al líder.
- Host co-op autoritativo para rehén, fases, enemigos y ataques; requiere calibración manual AR con el mismo punto físico.
- Animaciones de humanos reales CC0 y soldado militar CC BY 4.0 via GLTFLoader, SkeletonUtils.clone y AnimationMixer; respaldo procedural.
- Ráfagas, trazadoras, fogonazo, impacto y audio espacial WebAudio HRTF; balas esquivables caminando en AR o con joystick 3D.
- El rehén es una persona virtual ficticia colocada por el usuario, no se identifica ninguna persona real de la cámara.
- Requiere pruebas de rendimiento y AR multijugador en dispositivos físicos; no hay escaneo de profundidad semántico de muebles.
- Código técnico: https://threejs.org/docs/pages/module-SkeletonUtils y https://threejs.org/docs/pages/AnimationMixer.html


## V9 — Mapeo del entorno y rescate avanzado (beta)

### Mapeo asistido y profundidad WebXR

- En AR, se solicita hit-test y *opcionalmente* depth-sensing, con fallback si el teléfono/navegador no lo admite.
- El escaneo del navegador puede obtener puntos sobre planos verticales/horizontales y la distancia de la zona central mediante XRCPUDepthInformation; **no genera por sí mismo una malla completa de habitaciones o puertas**.
- El anfitrión fija primero la entrada sobre el piso, pulsa MAPEAR PAREDES Y MUEBLES, apunta a dos extremos por obstáculo y pulsa MARCAR PUNTO para confirmarlos. Para puertas se deben marcar tramos de pared separados dejando la abertura libre. Si la sesión ofrece profundidad, puede utilizarse para apuntar a la pared.
- Las paredes confirmadas bloquean línea de visión, disparos y caminos. Los muebles crean rectángulos de colisión. Los obstáculos se ocultan al salir del modo escaneo.
- El algoritmo de navegación usa vértices alrededor de los extremos de paredes y esquinas de muebles (grafo de visibilidad), con rutas limitadas y caché para evitar búsquedas constantes.
- Cuando el dispositivo ofrece profundidad WebXR CPU, se usa como oclusión parcial conservadora de enemigos. La cobertura de objetos no registrados **no está garantizada**.
- En Práctica 3D, mesa, sofá y pared posterior se registran como obstáculos automáticamente. El mapa de obstáculos del anfitrión se replica a invitados por coordenadas relativas a la entrada, con alineación manual aproximada.

### Rehén, jugabilidad y tensión

- Salud propia de rehén de 100 puntos, visible para el equipo; enemigos pueden elegir al rehén como blanco, las balas pueden dañarlo y si muere la misión termina en derrota.
- Liberar al rehén exige acercarse, permanecer visible y mantener el botón aproximadamente 1.75 segundos; soltarlo antes cancela. El anfitrión valida duración también para jugadores remotos.
- La rehén mantiene aproximadamente 1–1.6 m de distancia, retrocede cuando el jugador invade su espacio, intenta rodear obstáculos, y solo se extrae cuando los dos llegan a la entrada.
- Blindaje cercano puede proteger brevemente a la rehén, y el botiquín restaura parte de su salud.
- Después de liberarla aparece una emboscada y el equipo debe coordinar la cobertura.

### Fuentes técnicas

- ARCore Depth API: https://developers.google.com/ar/develop/depth
- MDN WebXR Depth: https://developer.mozilla.org/en-US/docs/Web/API/XRFrame/getDepthInformation
- ARCore hit-tests sobre planos verticales y horizontales: https://developers.google.com/ar/develop/hit-test
- YUKA AI (MIT; referencia de estrategias): https://github.com/Mugen87/yuka
- three-pathfinding (MIT; referencia de navegación): https://github.com/donmccurdy/three-pathfinding
- Motor, grafo y colisiones de V9 implementados con código original en spatial-map.js; no se copió código de los proyectos referenciados.

**Validación pendiente:** hace falta comprobar escaneo, alineación, rendimiento, y colisiones en teléfonos reales; el juego no es aún un sistema certificado de captura espacial, ni un producto listo para cobrar miles de dólares.

## V9.1 — Correcciones de jugabilidad, gráficos y mapeo (beta)

- Rescate: mantener LIBERAR alrededor de 1 segundo, completado automáticamente aunque el botón táctil no reciba el evento `pointerup`; también conserva captura de puntero, y el anfitrión valida que hubo pulsación real.
- Rendimiento: creación de enemigos escalonada (un enemigo cada ~145 ms) y creación de esqueletos animados escalonada (~95 ms). Mezcladores de animación a unos 29–30 fps para reducir tirones en Android.
- Enemigos: 8 aparecen durante el inicio de la operación, más 5 durante la emboscada; límite de 14 vivos simultáneos. Se distribuyen a mayor distancia, son aproximadamente un 32 % más pequeños en el piso y se mantienen a distancia para no bloquear la vista de cámara.
- Estética: humanos realistas originales Jordan/Sam (familia del modelo de rehén Maya) como opción principal; antiguo soldado militar como respaldo. Casco discreto y rifle unido al hueso de la mano si lo admite el personaje, en vez de un arma flotando rígidamente.
- Mapeo: la opción MARCAR PUNTO puede usarse sin profundidad ni planos AR detectados. Apunta a un punto estimado delante de la cámara; un control de 0,6 a 5 metros permite ajustar la distancia. El modo indica si el punto procede de un plano real, profundidad o estimación manual.
- En la Práctica 3D se reinstalan las colisiones de pared, sofá y mesa después del reinicio y se cierra correctamente el panel de mapeo al salir.
- LIMITACIÓN: la distancia manual es **una estimación**. No supone reconocimiento automático de paredes, ni garantiza colisiones de habitaciones no mapeadas. Verificar con calma en celulares compatibles antes de ofrecerlo comercialmente.


## V9.2 — Combate táctico y rendimiento

- Se distinguen zonas de impacto de cabeza y torso. Los disparos a la cabeza hacen más daño (3 frente a 1); el servidor anfitrión recibe esa distinción en partidas cooperativas.
- Reacción animada breve al recibir disparos y confirmación visual de impacto y golpe crítico sobre la mira.
- Los enemigos separan sus trayectorias para no amontonarse. En multijugador, los invitados actualizan sus animaciones esqueléticas, además del movimiento de posición.
- Se moderó la iluminación roja artificial a favor de una iluminación de operadores más neutra y matizada.
- La interfaz del escaneo se actualiza a una frecuencia limitada y el panel de misión no reescribe todo el DOM en cada fotograma.
- Balance de rescate: no más de dos intrusos eligen a la rehén como objetivo simultáneamente; menor daño recibido por disparo y protección inicial de unos 2,4 segundos, sin eliminar el riesgo de fallo.
- Estas son mejoras comprobadas a nivel de código. Animaciones, sincronización de varios celulares y AR de profundidad requieren pruebas físicas antes de considerar el juego comercialmente finalizado.


## V10 — Rescate táctico único y compartido (prototipo multijugador)
- Todas las personas son miembros del mismo equipo antiterrorista: una sola misión, objetivos, enemigos y rehenes compartidos.
- El anfitrión gestiona salud enemiga, estado del rehén, disparos hostiles y fases; los invitados reciben snapshots numerados, descartando actualizaciones antiguas.
- Los jugadores que se conectan o calibran tarde solicitan de inmediato una copia del estado al anfitrión, incluso antes de que comience la partida, para ver rehenes colocados y obstáculos.
- Cada disparo de un miembro del equipo produce una estela visual en los demás teléfonos. El anfitrión reenvía esos eventos, mientras sigue siendo autoridad en el cálculo de daño; no se duplica daño por mostrar un disparo.
- Requiere que cada teléfono calibre el mismo punto del piso y mire hacia la misma pared; PeerJS/P2P puede tener latencia o desajustes de anclas. No equivale aún a posicionamiento compartido a precisión centimétrica ni a un backend de servidor dedicado.


### V10 modo principal: una ronda, una extracción
- Objetivo de la ronda: liberar al rehén y escoltarlo vivo hasta la extracción común. Si llega a salvo, gana **todo el equipo**. Se omiten las fases secundarias de cargas y jefes posteriores a la extracción para acercar la misión al modo de rescate táctico solicitado.
- Todos los usuarios son miembros del mismo equipo antiterrorista, con las mismas armas, enemigos, rehén y riesgos. No hay reparto obligatorio de roles.
- Los cambios de salud del rehén y los terroristas son controlados por el anfitrión. Los derribos de enemigos se notifican al instante además de reproducirse en las instantáneas periódicas.
- Los disparos de compañeros se transmiten con coordenadas relativas al ancla inicial y se representan con estelas y sonido. Solo el anfitrión determina daño y bajas, por lo que el efecto visual no genera un segundo impacto.
- La calibración local del plano inicial de cada teléfono sigue siendo aproximada y puede derivar; para precisión comercial robusta se necesitará anclaje espacial compartido y un servidor autoritativo persistente. PeerJS funciona como prototipo entre teléfonos, pero no equivale a un servidor competitivo de baja latencia.


## V11 — Controles ultrafáciles y mapeo de un toque (20/10/2026)

**Objetivo:** todos los jugadores colaboran en una sola misión antiterrorista y ven los mismos enemigos y rehén. Cada participante solo necesita aprender a apuntar, disparar y sostener el botón de liberar.

### Primera partida en tres pasos

1. Apuntar al piso, presionar **MARCAR ENTRADA** una vez. Se priorizan intersecciones físicas con WebXR hit-test; si no se detecta un piso se permite una ubicación estimada, marcada explícitamente como aproximada. Todos en una misma habitación deben marcar el mismo punto físico.
2. Apuntar al lugar donde estará el rehén y pulsar **COLOCAR REHÉN**. El rehén se sitúa a altura del piso, no encima de mesas.
3. Pulsar **EMPEZAR RESCATE**. Mapear muebles y paredes es opcional, nunca condición para iniciar el juego.

### Mapeo en un toque

- Después de marcar la entrada, el anfitrión toca **MARCAR PAREDES O MUEBLES (OPCIONAL)**. Apunta al centro de una superficie, elige PARED o MUEBLE y presiona **AGREGAR** una vez.
- PARED genera un tramo de ancho ajustable (2 m predeterminado); MUEBLE genera una caja de cobertura horizontal (~0,9 m de altura). Una silueta translúcida sobre la cámara anticipa qué volumen será colisionable.
- Si necesita precisión, el anfitrión activa **AJUSTE FINO: 2 EXTREMOS** para delimitar el objeto manualmente.
- WebXR usa fuentes de hit-test reales y, cuando el navegador habilita la función opcional `plane-detection`, puede consultar los polígonos de planos detectados. Cuando está disponible el sensor `depth-sensing`, puede ayudar a elegir la distancia.
- Si ninguna tecnología espacial está disponible, un control de distancia permite estimar la posición delante de la cámara. El usuario ve claramente **ESTIMADO** en la pantalla y puede corregir la ubicación.
- El mapa del anfitrión se replica mediante coordenadas relativas para apoyar línea de visión, rutas y colisiones. Sin calibración compartida exacta, puede existir deriva entre celulares.

### Controles y rendimiento

- Un botón de acción grande y contextual antes de empezar; combate con botones amplios de **DISPARAR**, **MIRA** y **RECARGAR**, y joystick circular solo en Práctica 3D.
- Suprimido del HUD de combate el antiguo botón **+ NIDO**, innecesario para la partida actual.
- El toque sobre una interfaz WebXR no debería interpretarse también como un disparo o una marca en el mundo virtual: la UI filtra eventos táctiles superpuestos.
- Menos escrituras al DOM durante el combate; el contador de munición solo vuelve a dibujarse cuando cambia.

**Límites que hay que probar físicamente:** WebXR plane-detection, profundidad y anclas no están universalmente disponibles; el modo estimado no reconoce mágicamente toda la habitación. No está validada aún la precisión multijugador de posición ni los gestos en todos los modelos Android/iOS.

### Referencias de desarrollo

- Ejemplo oficial Three.js WebXR AR hit test: https://github.com/mrdoob/three.js/blob/dev/examples/webxr_ar_hittest.html
- Ejemplo WebXR de planos geométricos: https://github.com/immersive-web/webxr-samples/blob/main/proposals/plane-detection.html
- WebXR Plane Detection spec: https://immersive-web.github.io/plane-detection/
- Google ARCore/WebXR hit-test: https://developers.google.com/ar/develop/webxr/hello-webxr
- Implementación V11 original; se consultaron los ejemplos pero no se copiaron modelos ni activos propietarios.


## V12 — Objetivo guiado y mapas sin frustraciones

- HUD de navegación táctico: cuando empieza una ronda de rescate muestra distancia horizontal y orientación hacia el rehén. Después de liberarlo, indica dirección/distancia del punto de extracción común. Es una guía visual discreta; no obliga a girar físicamente o correr por una vivienda.
- HUD cooperativo: los invitados reciben avisos si todavía no calibraron, si esperan el primer snapshot del anfitrión, si su conexión se cortó o si los snapshots dejan de llegar durante más de ~3 segundos. No se afirma que haya sincronización si la red está desactualizada.
- Mapeo: el botón **DESHACER ÚLTIMO** retira únicamente el último segmento de pared o volumen de mueble, libera sus recursos gráficos y conserva el resto del mapa. Las colisiones de los demás obstáculos permanecen activas. La próxima instantánea envía el mapa actualizado a los compañeros.
- Rendimiento de interfaz: la guía del objetivo y el estado de conexión se calculan ~6 veces por segundo; se actualizan los textos solo cuando cambian.
- Pruebas unitarias de geometría realizadas: pared y mueble bloquean trayectorias; la IA calcula desvíos; al deshacer mueble y luego pared, las listas y colisiones restantes son coherentes.

**Importante:** no se ha validado todavía la precisión real compartida entre cuatro teléfonos ni se ha incorporado un sistema de Cloud Anchors. Los anclajes WebXR locales y la calibración mirando la misma pared pueden desalinearse entre dispositivos, y se seguirá informando claramente de esta limitación antes de afirmar calidad comercial final.


## V13 — Calibración compartida de dos puntos

**Meta:** un mismo enemigo y un mismo rehén colocados en posiciones físicas lo más consistentes posible para todos los celulares de una sala.

- Antes solo había una referencia (la entrada A) y cada teléfono utilizaba su dirección de cámara para decidir hacia dónde estaba el eje Z del mundo. Era posible ver al enemigo en paredes diferentes. Ahora las partidas multijugador requieren dos marcas comunes de piso A y B; el eje -Z del equipo apunta siempre desde A hacia B, independientemente de hacia dónde mire cada teléfono.
- En juego SOLO se mantiene el flujo rápido de una sola referencia. Con equipo, todos marcan A y luego B, a una separación entre ~1 y 7 metros. El anfitrión coloca después al rehén. Los invitados esperan a que el anfitrión confirme su referencia.
- La distancia A–B del anfitrión se transmite a los invitados. Diferencias superiores a 0,35 m o un 16 % (la mayor de las dos tolerancias) se marcan como calibración incorrecta y se permite volver a marcar B. No ajustamos artificialmente la escala en metros para esconder un escaneo inconsistente.
- El anfitrión muestra cuántos compañeros están calibrados y no permite comenzar la partida hasta que los conectados hayan comunicado una calibración compatible. La comprobación usa mensajes PeerJS y un estado único del anfitrión.
- Si WebXR ofrece anclas locales independientes para ambos puntos, la escena puede ajustar de manera gradual la orientación en función de los movimientos de seguimiento. Se utilizan dos vectores en el piso para definir un marco compartido, y cada anfitrión sigue siendo autoritativo para daños, enemigos, progreso y vida del rehén.
- Prueba matemática con cinco orientaciones y posiciones de dispositivo: un tercer punto físico da las mismas coordenadas locales en los cinco sistemas tras registrar A y B, con diferencias de coma flotante insignificantes.

**Limitación esencial:** estos son puntos calibrados manualmente, no una verdadera *Cloud Anchor*, ni un ARWorldMap/SLAM compartido. Si cada usuario marca físicamente puntos diferentes, los sensores derivan o falla la detección de superficie, habrá desplazamientos. Una garantía de alineación centimétrica, reconocimiento global del espacio y relocalización automática entre Android e iPhone no están disponibles de forma universal desde WebXR. Hace falta probar la V13 físicamente con varios teléfonos antes de venderla como experiencia profesional.

Fuentes: [WebXR Hit Test (W3C)](https://www.w3.org/TR/webxr-hit-test-1/), [WebXR Anchors (Immersive Web)](https://github.com/immersive-web/anchors/blob/main/explainer.md), [SharedSpheres (Unity/ARKit, estudio de referencia)](https://github.com/Unity-Technologies/SharedSpheres). Esta V13 utiliza una implementación geométrica original en `shared-calibration.js`.


## V14 — Terroristas de calidad superior y cuatro uniformes

- Investigación visual basada en el diseño de las facciones ficticias Phoenix Connexion, Elite Crew y Guerrilla Warfare del shooter *Counter-Strike*: siluetas humanas reconocibles, pasamontañas, tela, ropa de colores terrosos, guantes, chalecos, accesorios y armas con postura natural. No se usan recursos de Valve.
- Se actualizaron los enemigos a cuatro modelos originales riggeados de otro shooter independiente [StarKnightt/counter-strike-in-browser](https://github.com/StarKnightt/counter-strike-in-browser), con geometría realista/atlas de texturas horneadas, indumentaria diferenciada y animaciones Idle/Walk/Run. Versiones: pasamontañas, pañuelo de desierto, pasamontañas con gorra y pañuelo con gafas. Fuente fijada a commit inmutable para evitar cambios de arte imprevistos.
- El cargador mantiene respaldo de personajes 3D del estudio; si no se puede obtener el nuevo modelo se usa el humano antiguo y, si tampoco está disponible, un soldado de reserva. Por último queda el cuerpo procedimental mientras se espera la descarga. Ninguna de las variantes necesita instalar una aplicación.
- Host asigna el índice de vestimenta una vez por enemigo y lo comparte en cada snapshot; todos los compañeros ven la **misma variante** para cada terrorista. La selección se conserva estable durante la ronda.
- Se suprimieron los cascos primitivos superpuestos a la cabeza de los nuevos modelos y se conserva el rifle sujeto al hueso de la mano en rigs compatibles.
- Rendimiento móvil: modelos con descarga/caché por tipo, creación escalonada de esqueletos, animaciones aproximadamente 30 Hz de cerca y 15 Hz a distancia.
- El nuevo arte procedimentalmente generado pertenece a sus respectivos creadores. Consultar `THIRD_PARTY_NOTICES.md` y verificar condiciones de licencias de terceros antes de vender la experiencia a clientes.

**Validación pendiente:** comprobar descarga del CDN, texturas, escala, posturas de armas y FPS con 2–4 celulares reales. Las pruebas automáticas de código y presencia de archivos no reemplazan una revisión visual en dispositivos.


## V15 — Combate cooperativo validado por el anfitrión

- **Problema corregido:** antes un invitado podía enviar un mensaje directo `hit` indicando el enemigo y la zona del impacto. El anfitrión solo comprobaba distancia aproximada y cobertura, por lo que existían discrepancias o aciertos falsos.
- **Ahora:** cada disparo contiene un origen y dirección en coordenadas locales compartidas. El anfitrión valida que el origen corresponda aproximadamente a la posición reciente del jugador, que la dirección sea finita/unitaria y que hayan transcurrido al menos 95 ms desde el último disparo aceptado. No se confían IDs de enemigo ni afirmaciones de impacto enviadas por el cliente.
- El anfitrión reconstruye una trayectoria 3D hasta 12 m con `THREE.Raycaster`, analiza primero el objeto alcanzado y diferencia zona de cabeza/cuerpo. Comprueba obstáculos del mapa y, en práctica 3D, geometría de cobertura antes de aplicar daño. Solo el anfitrión reduce HP y elimina enemigos.
- Los invitados ven confirmación de impacto únicamente cuando el anfitrión confirma el daño. Si el anfitrión rechaza el disparo, el cliente no reproduce el sonido falso de impacto.
- Los enemigos vivos muestran reacciones al recibir disparos en **todos los celulares** mediante eventos de `enemyHit`, sincronizando HP y reacción breve. Las bajas se anuncian inmediatamente con `enemyDown` y atribución del jugador.
- Un pequeño indicador de bajas del equipo evita saturar la mira. El recuento de enemigos neutralizados se transmite en las instantáneas y al finalizar la partida, para que todos vean el mismo resultado.
- Se conservan los modelos tácticos V14, la calibración A/B V13 y los controles de mapeo móvil.

**Pruebas de código:** ocho casos del resolvedor de disparos (cuerpo, cabeza, pared, cobertura, enemigo eliminado, jugador no anfitrión, ronda cerrada, disparo fallido). Todos confirmaron una sola aplicación de daño o rechazo. También se comprobaron sintaxis de módulos y contratos de red antes de desplegar.

**Limitaciones pendientes:** la compensación de latencia todavía no rebobina posiciones históricas de los enemigos; sobre redes inestables pueden existir fallos de tiro que parezcan aciertos locales. PeerJS/P2P con anfitrión de celular no es un servidor competitivo con validación criptográfica o antitrampas completa. El mapeo espacial y el multijugador requieren pruebas físicas en Android/iPhone compatibles antes de declararse comercialmente terminados.


## V16 — Dos modos: rescatar al rehén o Captura la Bandera

### Pantalla de selección
- **Rescate de rehenes** conserva las reglas cooperativas de V15, con enemigos, rehén y daño sincronizados.
- **Captura la Bandera** se selecciona en la misma portada antes de entrar a la partida.
- Ajustes de Captura la Bandera (los define el anfitrión): **Cooperativo**, todos los jugadores humanos azules contra bots rojos; o **Versus**, jugadores humanos de equipos azul y rojo, con selector de equipo para invitados. El anfitrión juega siempre como azul.
- Bots **por equipo**: 0, 1, 2, 3, 4, 5 o 6 (hasta doce bots). Dificultad **Fácil / Normal / Difícil**, que afecta movimiento, cadencia de tiro, precisión y fuerza de los bots.
- Se puede crear o entrar a una sala compartida por código; se conserva la calibración espacial común A y B en multijugador. En solitario basta el punto A.

### Colocación y puntuación
- El anfitrión apunta al suelo y coloca **bandera azul**, luego **bandera roja** separadas por al menos 1,6 m; en solitario también elige ambas.
- Los jugadores y bots de un equipo intentan tomar la bandera rival, transportarla hasta **su propia base** y anotar si su propia bandera está en casa. La primera facción que logra **3 capturas** gana. Si expiran **8 minutos**, decide el marcador; empate si ambos sumaron igual.
- Las banderas robadas acompañan visualmente a quienes las llevan. Si el portador cae, la bandera queda en el piso; su equipo original puede recuperarla acercándose, o se devuelve automáticamente a su lugar tras 14 s.
- Los bots van a por las banderas y también persiguen a quien robó la de su equipo; vuelven a aparecer aproximadamente 4,2 segundos después de ser eliminados.
- Los jugadores alcanzados en Versus reciben un bloqueo de disparos de aproximadamente 2,7 segundos y sueltan la bandera. **No hay teletransporte físico** ni obligación de correr. La zona real debe estar despejada; los objetos virtuales no representan muebles o paredes que puedan atravesarse de forma segura.
- La interfaz muestra marcador azul/rojo, mensaje de bandera robada, flecha hacia el objetivo, fuego compartido de bots y un indicador de equipo en los personajes.

### Arquitectura
- Nuevo módulo \`capture-flag.js\`: estado de equipos, bases, banderas, bots, puntuación, cuenta regresiva, devolución de banderas y sincronización por instantáneas.
- \`missions.js\` mantiene la sala PeerJS existente y es **anfitrión autoritativo** para ambos modos: envía equipos, opciones, posiciones, bots, golpes y resultado final. Se conserva el control de disparos de V15; en CTF impide dañar a bots aliados y permite enfrentamientos con humanos del otro equipo.
- \`main.js\` selecciona dinámicamente la interfaz y la lógica de combate del modo activo. Los bots enemigos utilizan los cuatro modelos V14 y los aliados pueden usar un soldado de licencia CC BY 4.0 con distintivos de color. La escena sigue usando Three.js/WebXR, con práctica 3D sin cámara.
- Se evita que una selección de equipo provoque un ciclo de mensajes entre invitado y anfitrión. Un jugador sin una posición recibida todavía no aparece como personaje fantasma en la entrada. Se liberan actores remotos que mueren y reaparecen.
- El menú se puede desplazar en teléfonos compactos.

### Validación y límites actuales
- Tests simulados de lógica: colocar banderas, rechazar bases demasiado juntas, capturar tres veces, ganar, robar del equipo rojo incluso ante un defensor azul, puntuar rojo, transmitir marcador, soltar bandera y devolverla automáticamente.
- Las pruebas de sintaxis e integración no sustituyen jugar con dos o más teléfonos físicos. El juego conserva la limitación de precisión de WebXR entre celulares y no ofrece infraestructura de servidor dedicada ni compensación temporal avanzada de latencia.
- Con 6 bots por bando hay hasta 12 personajes animados y el rendimiento puede variar; se recomienda comenzar con 1–2 por equipo para las primeras pruebas.


## V17 — Equipos tácticos y estado de red más justo (21/10/2026)

- **Roles de bots en Captura la Bandera.** Con dos o más bots por equipo, aproximadamente uno de cada tres toma posiciones defensivas cerca de la bandera propia, mientras los otros atacan la base rival. Si la bandera propia es robada, los defensores la persiguen; si un aliado lleva la bandera enemiga, los atacantes lo escoltan. Cuando hay un solo bot, sale a atacar para evitar un empate permanente.
- **Zona de movimiento aproximada.** Los bots ya no pueden alejarse ilimitadamente de las bases que se marcaron en la habitación. El radio operativo, calculado a partir de la distancia entre banderas, complementa las paredes y muebles manualmente escaneados. **No sustituye la detección real de obstáculos ni prueba que el camino esté despejado.**
- **Flecha contextual de misión.** La guía muestra «CAPTURÁ LA BANDERA», «VOLVÉ A TU BASE» si el jugador la lleva, «ESCOLTÁ LA BANDERA» si la lleva un compañero, «RECUPERÁ TU BANDERA» si la roba el rival y «DEVOLVÉ TU BANDERA» si quedó abandonada. El marcador usa ese objetivo para que nunca se pierda la próxima tarea.
- **Evitar capturas fantasma.** El anfitrión verifica la antigüedad de las posiciones enviadas por los invitados y rechaza desplazamientos instantáneos improbables. Un jugador cuyo último dato supere aproximadamente 2,6 s no puede capturar una bandera ni recibir nuevos impactos como si siguiera allí.
- **Recuperación por desconexión.** Si alguien desaparece mientras transporta una bandera, esta se suelta en su última posición válida y puede recuperarse. Se liberan sus datos de equipo y movimiento.
- **Bandera portada sin teletransportes visuales.** Si todavía no se conoce la posición del portador en otro celular, el indicador se oculta temporalmente en lugar de reaparecer de manera engañosa sobre la base.
- **Corrección de daño.** Se evita modificar la salud de entidades ajenas al modo de banderas antes de validar que el objetivo es un bot válido.

### Validación
Se ejecutaron 14 pruebas independientes de las reglas V17: movimiento del bot único, separación defensa/ataque, robo azul, entrega azul, escolta, caída por impacto, bloqueo de impactos consecutivos, devolución automática, pérdida de conexión con bandera, robo rojo, puntuación roja y sincronización por instantánea. Todas pasaron. El módulo de rescate mantiene su ruta de código y no se modificaron sus objetivos.

La sincronización P2P mediante celulares y el registro espacial manual todavía requieren pruebas físicas reales con varios dispositivos. El filtro de movimiento es solo una validación básica, **no sustituye** un servidor dedicado con seguridad y compensación de latencia competitiva.


## V18 — Eventos compartidos, banderas persistentes y respawn equilibrado

### Captura la Bandera
- Los mensajes de **bandera robada, caída, recuperada y punto anotado** se publican desde el anfitrión a todos los integrantes de la sala PeerJS. Se reutiliza el aviso táctico existente sin tapar la mira. Las reglas permanecen autoritativas en el anfitrión y los clientes siguen recibiendo los snapshots.
- Si el portador pierde señal mientras está conectado, el anfitrión guarda la **última posición válida** de la bandera y la hace caer allí en lugar de devolverla súbitamente a su base. Si el jugador se desconecta, la bandera se deja en la última posición informada.
- Los bots tienen un **escudo de reaparición durante unos 1,1 segundos**; mientras está activo no pueden recibir daño ni disparar. Al principio de cada ronda tienen aproximadamente 1 segundo de protección. Un aro luminoso de color de equipo, visible para los jugadores conectados, informa esta condición.
- Los temporizadores de invulnerabilidad restantes se incluyen en la réplica de enemigos para que no parezcan inmunes sin ninguna explicación en los teléfonos invitados. Las reglas de disparo en PvP y las de ataque de bot a bot respetan este intervalo.
- Se mantienen las funciones de ataque, defensa y escolta de V17, los equipos cooperativos/versus, la configuración de 0 a 6 bots por bando, las tres dificultades y la victoria por tres capturas.

### Pruebas
- **20 de 20** comprobaciones simuladas de lógica CTF aprobadas: funciones tácticas de bots, capturas y puntos de ambos equipos, acompañamiento y retorno, reconexión / posiciones viejas, eventos de bandera, escudos y retraso de disparo al reaparecer.
- Se verificaron por separado el parseo de JavaScript, la correspondencia de módulos importados, los controles HTML utilizados y la versión de interfaz antes del despliegue.

**Importante:** estas pruebas son de lógica y no sustituyen una partida en varios teléfonos reales. WebXR y el seguimiento compartido pueden variar según dispositivo, navegador, permisos y condiciones de iluminación. La zona física debe permanecer despejada y el jugador debe poder pausar la partida.


## V19 — Rebranding BLACKZONE

- La marca visible se llama **BLACKZONE**, subtitulada **Tactical AR**. La pantalla inicial, menú de modos, HUD, final de operación, título del navegador, favicon SVG y metadatos de enlace utilizan el nuevo nombre.
- Emblema original **BZ** en `blackzone-mark.svg`: forma angular, acabado metalizado y acento táctico cálido. No utiliza marcas ni emblemas de otros shooters.
- Nuevo sistema visual oscuro de diseño táctico: paneles de acero, indicación de sistema activo, retícula de fondo sutil, tipografía condensada, estados de botones más visibles y respuestas al tacto.
- La página se adapta a pantallas pequeñas, manteniendo selección de modo y opciones de bots, dificultad y equipos con desplazamiento vertical cuando sea necesario.
- Se conservan los valores internos `rescue` y `capture` y no se alteran las reglas de calibración A/B, combate, rescate, captura y red de la V18.
- **Nueva URL de marca verificada y activa:** https://blackzone-tactical-ar.vercel.app/ (BLACKZONE Tactical AR). La URL heredada https://la-casa-alterada-invasion-jugable.vercel.app/ continúa operativa por compatibilidad y se mantiene el mismo proyecto Vercel.
- **Advertencia de marca:** ya existen otros juegos con el nombre BLACKZONE. Antes de un lanzamiento comercial hay que realizar una búsqueda registral y jurídica en las jurisdicciones relevantes. El rebranding del prototipo no implica exclusividad sobre la denominación.

Licencias de terceros conservadas en `THIRD_PARTY_NOTICES.md`.


## V20 — Delimitación espacial en dos toques y acabado visual mejorado

### Configuración de la habitación
- En cualquiera de los dos modos, después de fijar la entrada y completar la orientación A/B en multijugador, el anfitrión puede pulsar **DELIMITAR ZONA DE JUEGO (2 TOQUES)**. No depende del mobiliario real.
- Nuevo editor inicial **ZONA DE JUEGO**: apuntar a una esquina libre del piso, confirmar y apuntar a la esquina opuesta. El motor crea un rectángulo 3D usando las coordenadas calibradas del cuarto, con una vista previa verde y advertencia si todavía es demasiado estrecho.
- Zona permitida: al menos aproximadamente **1,4 m de ancho y largo**, hasta 9 m por lado y 58 m². La aplicación guarda dimensiones, perímetro 3D y coordenadas locales orientadas con la calibración. La zona se puede borrar y dibujar nuevamente.
- Si WebXR proporciona hit-test o un plano horizontal detectado, las marcas se sitúan en la superficie registrada. Si no hay medición fiable se utiliza una estimación de piso **claramente identificada como aproximada**. No se afirma detectar automáticamente paredes, obstáculos ni muebles reales.
- Las paredes individuales y cajas/muebles siguen disponibles como herramientas opcionales del editor, con mapeo en un toque o dos extremos; no son necesarias para delimitar la zona.
- Bots en ambos modos usan el área para limitar su movimiento, sin salir del perímetro virtual. Banderas y rehén, cuando existe una zona delimitada, deben ubicarse dentro de ella y a cierta distancia del borde.
- Durante AR aparece una advertencia visible al acercarse a menos de ~0,62 m del borde virtual y otra si se sale de la zona. **No son alarmas de proximidad a obstáculos reales**: el usuario debe despejar físicamente la habitación y no correr.
- En multijugador, la zona se serializa en las instantáneas del anfitrión en coordenadas de la misma referencia A/B para que todos vean un mismo perímetro aproximado. Los mapas idénticos ya no se destruyen y reconstruyen en cada actualización de red, reduciendo posibles tirones.
- El perímetro **no bloquea balas**, porque sería inventar paredes donde no existen. Las paredes confirmadas manualmente siguen siendo la fuente de las colisiones y la cobertura de disparos.

### Mejora visual y experiencia
- Añadidas **sombras suaves de contacto** bajo los personajes tácticos para que parezcan apoyados en el piso, mediante una única textura radial procedural reutilizada por múltiples enemigos, sin requerir costosos mapas de sombras reales en teléfonos.
- Vista previa semitransparente del espacio, perímetro iluminado de bajo contraste, controles de escaneo simplificados y mensajes de confianza del seguimiento AR.
- Revisado el contraste del piso y pared de práctica 3D, conservando los dos modos y los personajes existentes.

### Investigación técnica
- [WebXR Hit Test — Immersive Web](https://github.com/immersive-web/hit-test): posición de superficies; no permite inferir con certeza todos los límites del cuarto.
- [WebXR Device API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API): soporte limitado según navegador y dispositivo; mantenemos modo 3D sin AR.
- [three-mesh-bvh — Garrett Johnson, MIT](https://github.com/gkjohnson/three-mesh-bvh): evaluado para acelerar colisiones/raycast de mallas densas. **No integrado en esta versión** porque nuestro mapa actual usa segmentos simples y cajas, donde introducir una biblioteca grande para BVH sin mallas de alta complejidad no mejora materialmente la experiencia.
- Se utilizó la geometría existente de Three.js; no se importaron modelos, texturas ni marcas nuevas ajenas.

### Comprobaciones V20
- Pruebas matemáticas sobre zonas calibradas, rectángulos rotados entre dispositivos, restricciones de bots, área no considerada cobertura, sincronización y deduplicación de mapas, deshacer y limpiar.
- **Pendiente**: evaluación física en Android/iPhone compatibles, especialmente habitaciones pequeñas, superficies oscuras/brillantes y la precisión compartida de varios celulares. En iPhone Safari y otros navegadores donde no haya immersive-ar, la práctica 3D sigue siendo la alternativa, no una experiencia de cámara AR idéntica.
