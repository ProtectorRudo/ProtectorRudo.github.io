# La Última Función — integración premium (15/10/2026)

Esta versión incorpora cinco modelos CC0 que ya constaban en la biblioteca compartida de `ProtectorRudo/viralio` (catálogo `public/viralio-3d/index.json`). Son recursos reales, no conceptos.

## Procedencia y permisos

| Archivo local | Modelo / fuente | Autor registrado en el catálogo | Licencia | Uso en la escena |
|---|---|---|---|---|
| `models/premium/premium-ph-crystal-chandelier.glb` | [Crystal Chandelier — Poly Haven](https://polyhaven.com/a/Chandelier_03) | Poly Haven contributors | CC0 1.0 | Reemplaza la araña del vestíbulo, suspendida del techo (centro y=7.95) |
| `models/premium/industrial-wall-sconce.glb` | [Industrial Wall Sconce — Innerscene](https://www.innerscene.com/tools/library/3d-parts/industrial-wall-sconce-9eabc872) | Poly Haven contributors (según manifiesto) | CC0 1.0 | Cuatro apliques reales PBR en paredes laterales |
| `models/premium/victorian-arched-mirror.glb` | [Victorian Arched Mirror — Innerscene](https://www.innerscene.com/tools/library/3d-parts/victorian-arched-mirror-5172313e) | Poly Haven contributors (según manifiesto) | CC0 1.0 | Dos espejos victorianos, encastrados visualmente en muros laterales |
| `models/premium/premium-ph-wood-lantern.glb` | [Wooden Lantern — Poly Haven](https://polyhaven.com/a/wooden_lantern_01) | Poly Haven contributors | CC0 1.0 | Farol encima de un mueble cercano al escenario |
| `models/premium/victorian-nightstand.glb` | [Victorian Nightstand — Innerscene](https://www.innerscene.com/tools/library/3d-parts/victorian-nightstand-28fb8e24) | Poly Haven contributors (según manifiesto) | CC0 1.0 | Dos mesas victorianas detrás de los sillones laterales |

Licencias generales: [Poly Haven CC0](https://polyhaven.com/license) y ficha individual de la [biblioteca Innerscene](https://www.innerscene.com/tools/library). No se han comprado recursos ni realizado descargas por métodos no autorizados.

## Integración

- Escena existente **Three.js + React**. El juego mantiene sus mecánicas: butacas, fusible, proyector, código, telón, Acomodador y amenaza del palco.
- Se mantienen las hitboxes y puntos de interacción existentes; el decorado añadido no recibe acciones ni crea nuevos obstáculos físicos.
- El cargador GLTF ya existente usa caché de promesas y copias de escena. Para no depender de CDNs externos, los cinco GLB se publican en este repositorio como archivos ASCII `.glb`, decodificados en memoria a GLB *cuando se solicitan*. Es una limitación temporal del canal de carga de binarios; el resultado final sigue siendo un modelo 3D GLB PBR nativo en Three.js.
- Geometría siempre normalizada por altura y centrada; se ajustó la altura de la araña central para evitar que flote en medio del recinto. Se evita sombra dinámica en adornos de pared o techo para reducir carga en teléfonos.
- Los modelos anteriores permanecen disponibles para una eventual reversión. `models/manifest.json` declara solamente los assets activos.
- Paquetes originales de la biblioteca: `ProtectorRudo/viralio/public/viralio-3d/models/`. Siempre obtener el GLB de allí o de los proveedores documentados.

## Control de calidad y límites

**Realizado:** comprobación estática de sintaxis JavaScript; validación de rutas del manifiesto; verificación de los modelos originales en la biblioteca y registro CC0.

**Pendiente:** confirmar la carga HTTP de cada `.glb` tras propagación de GitHub Pages, inspeccionar capturas de Android vertical y escritorio, FPS, memoria y recorrido completo. No describir la revisión visual ni la publicación en Vercel como verificadas hasta disponer de evidencia.

### QA de la sala

1. Abrir `https://protectorrudo.github.io/la-ultima-funcion/` y comprobar modelos cargados (sin consola `Decorado glTF no disponible`).
2. Verificar la araña colgada cerca del techo, los apliques en ambos muros, mesas apoyadas y farol sobre la mesa, sin interferir con fusible ni butacas.
3. Completar el juego sin atascarse: butaca, fusible, interruptores, proyector, enfoque, código, telón, palcos y salida.
4. Probar Android en vertical y horizontal (movimiento, zoom, sonidos, 30 FPS objetivo).
5. Medir tiempo de descarga inicial y de modelos. Los cinco modelos ya están en GLB binario nativo. La prueba de navegador se ejecuta mediante GitHub Actions y captura escritorio/Android vertical.

## Segunda fase: superficies PBR y QA automatizado

- **Piso:** material [Poly Haven wood_floor (CC0)](https://polyhaven.com/a/wood_floor), con color, normal OpenGL y rugosidad ARM en WebP 1K. Copias locales: `materials/premium/wood_floor-{color,normal,arm}.webp`.
- **Paredes y techo:** material [Poly Haven rough_plaster_broken (CC0)](https://polyhaven.com/a/rough_plaster_broken), color, relieve y ARM, copias locales en `materials/premium/rough_plaster_broken-{color,normal,arm}.webp`.
- **Integración:** `assets/index-theatre-premium-v2-20261015.js`; carga asíncrona con TextureLoader, wrapping RepeatWrapping, roughnessMap y normalMap. Los materiales previos quedan como reserva si falla el recurso. Se ajusta el tono de madera y yeso para legibilidad en un recinto oscuro.
- **Luz práctica:** dos PointLight cálidas sin proyección de sombras extra, para acentuar la arquitectura en lugar de saturar el escenario.
- **Verificación:** `tests/premium-integrity.mjs` inspecciona GLB2, rutas, geometrías, imágenes incrustadas, mapas WebP, límites de descarga y mecánicas conservadas. `tests/premium-browser-smoke.mjs` abre un servidor local y usa Chromium WebGL en escritorio y Android vertical, captura pantallas y detecta errores de carga. La acción `.github/workflows/theatre-premium-qa.yml` los ejecuta cuando hay cambios.
- **Validación directa del repositorio 15/10/2026:** cinco GLB nativos válidos y seis archivos WebP válidos; peso total de archivos PBR + GLB nuevos **5.71 MB**. Sintaxis JavaScript revisada. La prueba visual Chromium y el recorrido completo son requisitos de aceptación independientes: no afirmar sus resultados sin ejecutar y leer sus informes.


## Corrección de la aparición del palco 1 — 15/10/2026

**Fallo real diagnosticado:** `boxSpecter` se creaba solamente dentro de `useUsherGLB()`. La advertencia `palco_aparicion` y el susurro se emitían aunque el modelo 3D del Acomodador no hubiera terminado de cargar o hubiera fallado. Así, el jugador recibía mensajes de peligro con el palco vacío.

**Correcciones en `assets/index-theatre-specter-fix-20261015.js`:**

- `buildUsher()` crea de manera sincrónica una figura espectral visible solo después de la señal correspondiente, reutilizando el modelo del Acomodador inicial; se mantiene como recurso de respaldo si la descarga falla.
- Al terminar `useUsherGLB()`, la figura provisional se sustituye por el personaje GLB esquelético profesional, sin duplicar fantasmas ni interferir con las colisiones y acertijos.
- Se reajusta la ubicación frente a los cortinajes del palco 1, la iluminación sin sombras adicionales, el contraste del traje y su movimiento sutil; el personaje ya no depende de una URL externa en el momento de lanzar el susto.
- `triggerBoxSpecter()` corre antes del evento `electricidad`, no después: el aviso llega cuando existe un personaje visible.
- Los susurros solo dicen `No levantes la vista al PALCO 1` si la figura está realmente visible. Antes de eso se escucha un aviso general del teatro.
- `getSpecterStatus()` informa `ready`, `visible`, `professional`, `cue`, `chasing`. Con `?diagnostico` se dispone de una interfaz de QA limitada para disparar la fase de la aparición, enfocar el palco y observar el estado, sin revelar ni modificar combinaciones de acertijos.
- `tests/premium-integrity.mjs` comprueba la inicialización, sincronización y el enlace a la nueva versión. `tests/premium-browser-smoke.mjs` dispone de casos para Android vertical y escritorio que comprueban la aparición provisional, el reemplazo GLB y capturan una imagen del palco al estar enfocado.

**Verificación realizada:** cambios integrados en GitHub `main`, sintaxis de JS válida y referencias verificadas en HTML. **Pendiente de certificación:** ejecutar QA con Chromium, confirmar capturas reales y completar prueba en celular, sin inventar FPS o afirmar resultados visuales no comprobados.

## Tercera fase: corrección de objetos flotantes (captura Android 15/10/2026)

La captura de una persona jugando a 2:05 restantes mostró un fusible gigante sobre una base que flotaba, butacas sin apoyo completo y rayas geométricas antinaturales en el suelo. Se aplicaron correcciones a la escena real en `assets/index-theatre-grounded-20261015.js`.

- **Fusible:** pasó de 53 cm de largo a un cuerpo de porcelana de 30 cm, con dos terminales metálicos y soporte físico. La pieza clicable tiene un volumen transparente de toque más amplio; recogerla no elimina su mesa.
- **Mesita:** reemplazo profesional `victorian-nightstand.glb` ya local y CC0, colocado con la base tocando el suelo. Mientras el modelo carga existe un mueble provisional con cuatro patas y superficie. El mueble permanece al retirar el fusible.
- **Butacas:** cada una ahora tiene cuatro patas físicas y un travesaño de arriostramiento, manteniendo `InstancedMesh` para limitar llamadas a GPU.
- **Muebles decorativos:** se bajaron a ras del suelo los sillones y las mesas victorianas; el busto descansa sobre su mesa. Apliques y espejos se acercaron al muro al que pertenecen.
- **Piso:** retiradas 32 rayas procedurales elevadas que interferían con la textura PBR de madera.
- **Lógica del juego:** sin cambios al orden de acertijos, códigos, temporizador, sonidos ni recolectar/instalar fusible. Se preservó la mejora previa del fantasma del palco 1 y su aviso sincronizado.
- **Pruebas:** syntax check JavaScript + verificaciones de integridad del repositorio en `tests/premium-integrity.mjs` y navegador desktop/Android mediante `theatre-premium-qa.yml`. Los tests automatizados de navegador y revisión humana de capturas siguen siendo criterios de aceptación, no deben darse por exitosos sin su reporte.
