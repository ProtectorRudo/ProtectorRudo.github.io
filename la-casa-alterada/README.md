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
