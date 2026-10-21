# MICROCAOS — Party Rush (V0.3)

Prototipo jugable para móviles y escritorio. El archivo `index.html` es un vertical slice WebGL y WebXR experimental, no una aplicación iOS/Android nativa.

## Contenido

- Carrera 3D de seis competidores, con carrera automática hacia meta y joystick para esquivar
- Personajes 3D con esqueleto y animaciones de movimiento, salto y festejo
- Personajes procedurales como respaldo si la descarga de modelos falla
- Estadio en miniatura, iluminación PBR, elementos de espectadores y superficie en madera en la vista previa
- Obstáculos: barras giratorias, barreras laterales, plataformas de salto y pistones de tres carriles
- Estrellas coleccionables que aceleran la recuperación del turbo
- Podio, récord personal, audio, vibración y resultado compartible
- WebXR hit-test en dispositivos Android compatibles; no se presenta una cámara sin anclaje como AR real
- En iPhone se puede jugar la versión 3D; AR espacial nativa todavía requiere ARKit/Unity

## Dependencias en tiempo de ejecución

- Three.js 0.180 vía jsDelivr
- GLTFLoader, SkeletonUtils, RoundedBoxGeometry y RoomEnvironment del mismo Three.js
- Fuente CC0 RobotExpressive.glb, descargada mediante CDN y reutilizada con seis variantes
- Google Fonts, con tipografía de respaldo cuando no está disponible

## Licencia de modelos de terceros

**RobotExpressive.glb**: modelo original creado por **Tomás Laulhé / Quaternius**, modificado por **Don McCurdy** para Three.js. Licencia **CC0 1.0 Universal** según el README original:

https://github.com/mrdoob/three.js/blob/r180/examples/models/gltf/RobotExpressive/README.md

Ruta usada en el prototipo:
https://cdn.jsdelivr.net/gh/mrdoob/three.js@r180/examples/models/gltf/RobotExpressive/RobotExpressive.glb

El modelo es un recurso de demostración para validar mecánica y animación. No debe confundirse con una mascota exclusiva diseñada para MICROCAOS.

## Cómo probar

Abrí `https://microcaos-party-rush.vercel.app/` en navegador moderno y pulsá **JUGAR**.

- Celular: joystick virtual, SALTAR y TURBO.
- Teclado: A/D o flechas izquierda/derecha, espacio y Shift.
- AR: aparece únicamente si WebXR immersive-ar está soportado.
- Las carreras se ejecutan localmente, **no son multijugador online real**.

## Estado y próximos criterios de aceptación

Validado: parseo JavaScript, referencias DOM estáticas, publicación de archivos y estado READY en Vercel.

Pendiente antes de etiquetar como versión premium comercial:
1. Test visual real de Android e iOS, FPS, carga de asset GLB y tamaños por dispositivo.
2. Branding de personajes originales, animaciones propias y pruebas de dirección de arte.
3. Tests de jugabilidad/rejuego con personas reales.
4. Motor AR nativo con AR Foundation + ARKit/ARCore y sincronización multijugador futura.
5. Corrección de errores que aparezcan en las pruebas físicas y telemetría de rendimiento.
