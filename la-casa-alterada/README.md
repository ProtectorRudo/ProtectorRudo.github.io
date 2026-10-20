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
