# Territory Loop — source audit for real 3D chibi characters

## Primary source — Styloo Chibi Characters (CC0 1.0)

Author: Styloo (@Styl0o_). Official download: https://styloo.itch.io/chibi
Verified public mirror: https://store.godotengine.org/asset/styloo/chibi/

On October 27, 2026, a GitHub Actions installation retrieved the free official 17.19 MB archive from
`https://store.godotengine.org/asset/styloo/chibi/download/1373/` and validated each embedded GLB magic header, declared length and glTF animation list. The installed binaries are hosted in the user's static Pages repository:

- `Modo-caos/assets/styloo/archer.glb` — NOVA
- `Modo-caos/assets/styloo/merchant.glb` — BOMBO
- `Modo-caos/assets/styloo/student.glb` — KIRA
- `Modo-caos/assets/styloo/ninja.glb` — RAYO
- `Modo-caos/assets/styloo/knight.glb` — available for future character collections
- `Modo-caos/assets/styloo/asset-manifest.json` — exact sizes, SHA-256 digests, animation names and license

Models are licensed under Creative Commons Zero 1.0 Universal, including commercial use. Authors' original meshes and animation clips are not a basis for misrepresenting authorship.

Animations provided in the official GLBs include idle, run, walk, crouch, jump, flip, push and death. The Six-Seven hand motion is implemented through original procedural upper-arm bone rotations on top of the provided idle animation; it does **not** contain the original meme song or any protected recording.

## Fallback source — KayKit Adventurers (CC0 1.0)

https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0

Four KayKit GLBs are requested only if the locally hosted Styloo asset fails. If Three.js, WebGL or all models fail, the game automatically displays four distinct custom chibi canvas avatars while territory physics remain active.

## Rendering and mobile safeguards

- Three.js pinned to v0.170.0 (MIT license)
- Progressive loading during the 5.8-second pre-match VS screen
- Main game renders game physics on the independent 2D canvas
- VS skips automatically, and `ENTRAR A JUGAR` enters immediately even if asset loading is incomplete
- One active model asset shared by clones of the same hero, with a possible additional WebGL context for the VS presentation
- Players earn soft currency during play; no actual payment processing

## Audit limitations

Automated checks verify GLB headers, animation names, geometry presence and JavaScript runtime lifecycle. Mobile browser visual QA still needs to confirm real model appearance, clothing placement, gesture readability and frame-rate.
