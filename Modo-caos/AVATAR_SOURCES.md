# Territory Loop — animated humanoid avatars

The optional `paper-3d.mjs` browser renderer uses KayKit Adventurers by Kay Lousberg.

- Creator: Kay Lousberg / KayKit
- Project: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0
- Models: Knight, Barbarian, Mage and Rogue
- Model license: Creative Commons Zero (CC0 1.0)
- Animation: glTF animation clips included with the models
- Three.js: imported by pinned browser import map (three@0.170.0; MIT licensed)

The game does not embed or reproduce the user's screenshot as a game asset. It draws its own scenery, avatars and UI. Third-party models are fetched from the original public source at runtime; if the 3D renderer is unavailable, distinct original canvas chibi characters are rendered instead.

Costume purchases use earned in-game coins; there is no real-money checkout. The selected hero, equipped cosmetics and wallet are stored locally in the browser. This project does not claim that customizations are cross-device or server-synced.

## Asset loading
The GLB files are optional progressive-enhancement assets. Loading failures must not interrupt gameplay. If the source models change or CORS restrictions are introduced, the browser switches to the canvas character fallback.
