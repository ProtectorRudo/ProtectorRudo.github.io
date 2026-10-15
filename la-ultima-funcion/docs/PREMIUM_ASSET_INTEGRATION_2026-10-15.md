# La Última Función — integración premium (15/10/2026)

Esta versión incorpora cinco modelos CC0 que ya constaban en la biblioteca compartida de `ProtectorRudo/viralio` (catálogo `public/viralio-3d/index.json`). Son recursos reales, no conceptos.

## Procedencia y permisos

| Archivo local | Modelo / fuente | Autor registrado en el catálogo | Licencia | Uso en la escena |
|---|---|---|---|---|
| `models/premium/premium-ph-crystal-chandelier.glb64` | [Crystal Chandelier — Poly Haven](https://polyhaven.com/a/Chandelier_03) | Poly Haven contributors | CC0 1.0 | Reemplaza la araña del vestíbulo, suspendida del techo (centro y=7.95) |
| `models/premium/industrial-wall-sconce.glb64` | [Industrial Wall Sconce — Innerscene](https://www.innerscene.com/tools/library/3d-parts/industrial-wall-sconce-9eabc872) | Poly Haven contributors (según manifiesto) | CC0 1.0 | Cuatro apliques reales PBR en paredes laterales |
| `models/premium/victorian-arched-mirror.glb64` | [Victorian Arched Mirror — Innerscene](https://www.innerscene.com/tools/library/3d-parts/victorian-arched-mirror-5172313e) | Poly Haven contributors (según manifiesto) | CC0 1.0 | Dos espejos victorianos, encastrados visualmente en muros laterales |
| `models/premium/premium-ph-wood-lantern.glb64` | [Wooden Lantern — Poly Haven](https://polyhaven.com/a/wooden_lantern_01) | Poly Haven contributors | CC0 1.0 | Farol encima de un mueble cercano al escenario |
| `models/premium/victorian-nightstand.glb64` | [Victorian Nightstand — Innerscene](https://www.innerscene.com/tools/library/3d-parts/victorian-nightstand-28fb8e24) | Poly Haven contributors (según manifiesto) | CC0 1.0 | Dos mesas victorianas detrás de los sillones laterales |

Licencias generales: [Poly Haven CC0](https://polyhaven.com/license) y ficha individual de la [biblioteca Innerscene](https://www.innerscene.com/tools/library). No se han comprado recursos ni realizado descargas por métodos no autorizados.

## Integración

- Escena existente **Three.js + React**. El juego mantiene sus mecánicas: butacas, fusible, proyector, código, telón, Acomodador y amenaza del palco.
- Se mantienen las hitboxes y puntos de interacción existentes; el decorado añadido no recibe acciones ni crea nuevos obstáculos físicos.
- El cargador GLTF ya existente usa caché de promesas y copias de escena. Para no depender de CDNs externos, los cinco GLB se publican en este repositorio como archivos ASCII `.glb64`, decodificados en memoria a GLB *cuando se solicitan*. Es una limitación temporal del canal de carga de binarios; el resultado final sigue siendo un modelo 3D GLB PBR nativo en Three.js.
- Geometría siempre normalizada por altura y centrada; se ajustó la altura de la araña central para evitar que flote en medio del recinto. Se evita sombra dinámica en adornos de pared o techo para reducir carga en teléfonos.
- Los modelos anteriores permanecen disponibles para una eventual reversión. `models/manifest.json` declara solamente los assets activos.
- Paquetes originales de la biblioteca: `ProtectorRudo/viralio/public/viralio-3d/models/`. Siempre obtener el GLB de allí o de los proveedores documentados.

## Control de calidad y límites

**Realizado:** comprobación estática de sintaxis JavaScript; validación de rutas del manifiesto; verificación de los modelos originales en la biblioteca y registro CC0.

**Pendiente:** confirmar la carga HTTP de cada `.glb64` tras propagación de GitHub Pages, inspeccionar capturas de Android vertical y escritorio, FPS, memoria y recorrido completo. No describir la revisión visual ni la publicación en Vercel como verificadas hasta disponer de evidencia.

### QA de la sala

1. Abrir `https://protectorrudo.github.io/la-ultima-funcion/` y comprobar modelos cargados (sin consola `Decorado glTF no disponible`).
2. Verificar la araña colgada cerca del techo, los apliques en ambos muros, mesas apoyadas y farol sobre la mesa, sin interferir con fusible ni butacas.
3. Completar el juego sin atascarse: butaca, fusible, interruptores, proyector, enfoque, código, telón, palcos y salida.
4. Probar Android en vertical y horizontal (movimiento, zoom, sonidos, 30 FPS objetivo).
5. Medir tiempo de descarga inicial y de modelos. Valorar migrar `.glb64` a archivos GLB binarios directos mediante un build de CI antes de producción masiva.
