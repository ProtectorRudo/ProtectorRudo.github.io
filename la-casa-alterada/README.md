# La Casa Alterada — Protocolo Noche V3

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
