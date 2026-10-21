# Créditos y licencias de terceros

## Sistema de resortes para animación del arma
- Proyecto: COD, de Delight Chukwu
- Fuente: https://github.com/delightc123/COD
- Archivo consultado: src/weapons/mathx.js
- Integración: adaptación de la clase Spring en spring.js para retroceso y corredera
- Licencia: MIT
- Copyright (c) 2026 Delight Chukwu

MIT License

Copyright (c) 2026 Delight Chukwu

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Referencia técnica
- Three.js, ejemplo WebXR Hit Test: https://github.com/mrdoob/three.js/blob/dev/examples/webxr_ar_hittest.html
- Se siguió el patrón de requestReferenceSpace, requestHitTestSource, getHitTestResults y XRFrame.
- El código propio de la aplicación conserva su autoría; se consumen módulos Three.js mediante CDN.

## Revisados, no copiados
- Blackwater: https://github.com/Hiraeth010/blackwater
- COD ballistics.js: https://github.com/delightc123/COD/blob/main/src/weapons/ballistics.js


## V8 — Soldier human model and attribution (CC BY 4.0)
- Military soldier file: https://github.com/cktang88/3d-fps (public/assets/models/characters/soldier.glb).
- Original rig/character artist: BAMEN, FREE [Military Soldier] RIGGED, https://sketchfab.com/3d-models/free-military-soldier-rigged-e9c56308a67d4a3db62e914fafa4d198
- Licensed Creative Commons Attribution 4.0 International (CC BY 4.0): https://creativecommons.org/licenses/by/4.0/
- Source project retargeted animation clips from Quaternius Universal Animation Library 1/2 (CC0) and 100STYLE motion dataset by Ian Mason, Sebastian Starke and Taku Komura (CC BY 4.0): https://zenodo.org/records/8127870
- Our adaptation scales, independently clones and animates the rig, retains first-person custom weapon model and hitboxes; no official Counter-Strike assets.
- Static soldier_tac.glb is not used or bundled here.

### CC0 humanoid fallbacks: Innerscene / MakeHuman
- Jordan: https://www.innerscene.com/tools/library/3d-parts/locomotion-collection-jordan-3d-person-animated-911f1584
- Sam: https://www.innerscene.com/tools/library/3d-parts/locomotion-collection-sam-3d-person-animated-dc23800f
- Maya (hostage): https://www.innerscene.com/tools/library/3d-parts/locomotion-collection-maya-3d-person-animated-1499b2fd


## V9 — Navegación y profundidad
- Los algoritmos y módulos de colisión/mapeo spatial-map.js fueron escritos para este proyecto; se consultaron conceptos de YUKA (MIT) y three-pathfinding (MIT), sin copiar su código.
- ARCore Depth y WebXR Depth son APIs del dispositivo/navegador usadas cuando están disponibles; no incorporan assets con licencia adicional.


## V14 — Enemigos humanos originales con estética de shooter táctico

**Fuente de las cuatro apariencias en formato GLB:**
- Autor/proyecto original: StarKnightt, *Counter-Strike in the browser*: https://github.com/StarKnightt/counter-strike-in-browser
- Revisión del proyecto utilizada (inmutable): `92f3e6ddee40c6b531c0788c2cf3db4c56853a37`
- Archivos utilizados bajo `public/models/`: `bot_mask.glb`, `bot_wrap.glb`, `bot_mask_cap.glb`, `bot_wrap_goggles.glb`.
- Los modelos se crearon de forma procedimental en Blender con cuerpos MPFB2/MakeHuman y un esqueleto/animaciones derivados del ejemplo `Soldier.glb` de Three.js. Los materiales del proyecto contienen geometría y texturas propias horneadas; el código del proyecto se declara MIT, pero los componentes de terceros conservan sus licencias originales. La licencia de los modelos y sus partes se debe verificar nuevamente antes de una comercialización amplia, especialmente las condiciones del rig/animaciones originales.
- Se consumen desde un CDN público con URL de revisión fijada; no son archivos de Valve, de CS:GO ni de Counter-Strike 2. Tampoco se utiliza nombre, emblemas, marcas o trajes oficiales.
- Diseño de apariencia usado como referencia: ropa civil de tonos naturales, pasamontañas, máscaras textiles, gorra, pañuelos, gafas de protección y chalecos con bolsillos. Este juego no está afiliado a Valve.

Código MIT del proyecto citado: Copyright (c) 2026 StarKnightt, sujeto a su archivo LICENSE: https://github.com/StarKnightt/counter-strike-in-browser/blob/main/LICENSE. No se copió ni adaptó su motor FPS; se consumen los recursos GLB.
