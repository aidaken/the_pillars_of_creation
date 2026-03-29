# Pillars of Creation: Spectral Explorer 3D

An interactive 3D web experience of the Eagle Nebula's (M16) iconic “Pillars of Creation” — the towering columns of interstellar gas and dust first photographed by Hubble in 1995 and re-imaged by Webb in 2022. The app lets you orbit, zoom, and toggle between **Hubble-style visible-light** and **Webb-style near-infrared** color palettes, experiencing how the same structure looks in radically different parts of the electromagnetic spectrum.

The MVP uses approximated geometry and scientifically-inspired color palettes. No FITS astronomical data pipeline is involved — authenticity comes from careful shader design, not raw telescope data.

---

## What It Does

| Feature | Description |
|---|---|
| **3D Navigation** | Orbit, pan, zoom around three pillar columns using mouse / touch |
| **Spectral Toggle** | Switch between Hubble visible-light and Webb NIR palettes in real time via GLSL uniforms |
| **Pillar Hotspots** | Click a pillar to open an info panel with real science (EGGs, stellar nurseries, photoevaporation) |
| **Star Field** | Procedural background star field matched to Eagle Nebula's star density |
| **Responsive** | Renders at full viewport; canvas resizes cleanly without leaking GL resources |

---

## Stack

| Layer | Tool | Version | Role |
|---|---|---|---|
| **UI framework** | React | 18.3 | Component tree, state for spectral mode and open panel |
| **Build tool** | Vite | 8.x | Dev server with HMR, ESM-native bundling, sub-second rebuilds |
| **3D engine** | Three.js | 0.183 | WebGL scene graph, camera, render loop, raycasting |
| **Shader pipeline** | vite-plugin-glsl | 1.5 | Import `.vert`/`.frag` files as ES module strings; enables `#include` directives |
| **Language** | JavaScript (ESM) | — | No TypeScript for MVP; types via JSDoc where needed |
| **Linting** | ESLint 9 | flat config | React hooks rules + react-refresh rules |
| **Hosting target** | Vercel | — | Zero-config static deploy from `dist/` |

No backend. No database. No external API calls at runtime. Pure client-side.

---

## Folder Structure

```
the_pillars_of_creation/
├── index.html                  # Vite entry point — mounts <div id=”root”>
├── vite.config.js              # Vite config with React + GLSL plugins
├── eslint.config.js            # ESLint flat config (React hooks, react-refresh)
├── package.json
│
├── public/                     # Static assets served as-is (favicon, textures)
│
└── src/
    ├── main.jsx                # ReactDOM.createRoot → <App />
    ├── App.jsx                 # Root component — mounts scene + UI layers
    ├── App.css                 # App-level styles
    ├── index.css               # Global reset / body styles
    │
    ├── components/             # Pure React UI — no Three.js knowledge inside
    │   ├── SpectralToggle/     # Button to flip between Hubble ↔ Webb mode
    │   └── HotspotPanel/       # Side panel: pillar science content on click
    │
    ├── scene/                  # Three.js world — all WebGL lives here
    │   ├── SceneManager.js     # Creates renderer, scene, camera; owns rAF loop
    │   ├── controls.js         # OrbitControls setup and config
    │   ├── pillars.js          # Geometry + ShaderMaterial for the 3 pillars
    │   ├── starField.js        # Procedural star BufferGeometry + Points
    │   └── raycaster.js        # Click → pillar hit → fires React callback
    │
    ├── shaders/                # GLSL source (imported via vite-plugin-glsl)
    │   ├── pillar/
    │   │   ├── pillar.vert     # Pillar vertex shader
    │   │   └── pillar.frag     # Pillar fragment — spectral palette uniform
    │   ├── dust/
    │   │   ├── dust.vert       # Dust/haze vertex shader
    │   │   └── dust.frag       # Dust fragment — scattering approximation
    │   └── stars/
    │       ├── stars.vert      # Star point sprite vertex shader
    │       └── stars.frag      # Star fragment — glow, color temperature
    │
    ├── hooks/                  # Custom React hooks
    │   ├── useScene.js         # Mounts/unmounts SceneManager onto a canvas ref
    │   └── useSpectralMode.js  # State + setter for current spectral palette
    │
    ├── constants/              # Static config — data only, no logic
    │   ├── palettes.js         # Hubble and Webb color stops as Three.Color values
    │   └── scene.js            # Camera FOV, near/far, pillar positions/scales
    │
    └── utils/                  # Pure functions, no side effects
        ├── colorRamp.js        # Interpolate between palette color stops
        └── mapRange.js         # Generic linear remap (value, inMin, inMax, outMin, outMax)
```

Empty directories are tracked with `.gitkeep` until real files land.

---

## Setup

### Prerequisites

- Node.js ≥ 18 (LTS recommended)
- npm ≥ 9

### Install and run

```bash
npm install
npm run dev
# → http://localhost:5173
```

### All scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR — shader and component changes reload instantly |
| `npm run build` | Production bundle into `dist/` — tree-shaken, minified |
| `npm run preview` | Serve the production `dist/` locally to verify the build before deploy |
| `npm run lint` | ESLint across all `src/` files |

### Deploy to Vercel

```bash
npm run build
```

Push to GitHub and connect the repo to Vercel. It detects Vite automatically — no `vercel.json` needed. Every push to `main` triggers a deploy.

---

## How the Shader Pipeline Works

GLSL files are not bundled by Vite by default. `vite-plugin-glsl` intercepts imports of `.vert` and `.frag` files and returns their source as a plain JS string, which is passed directly to `THREE.ShaderMaterial`:

```js
// src/scene/pillars.js
import vertexShader   from '../shaders/pillar/pillar.vert'
import fragmentShader from '../shaders/pillar/pillar.frag'

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uSpectralMode: { value: 0.0 },  // 0.0 = Hubble, 1.0 = Webb
    uTime:         { value: 0.0 },
  },
})
```

The plugin also supports `#include “../../shaders/shared/noise.glsl”` — shared GLSL chunks can be composed into any shader without string concatenation.

In the render loop, uniforms are updated every frame:

```js
// src/scene/SceneManager.js
function tick(t) {
  material.uniforms.uTime.value = t * 0.001
  renderer.render(scene, camera)
  requestAnimationFrame(tick)
}
```

---

## Spectral Mode System

The core visual interaction is a single float uniform `uSpectralMode` (0.0 → 1.0) pushed to every material. Fragment shaders `mix()` between two hard-coded color ramps:

| Region | Hubble ACS (visible) | Webb NIRCam (infrared) |
|---|---|---|
| Dense gas / base | Deep red-brown | Gold / amber |
| Mid pillars | Orange / tan | Teal / cyan |
| Halo / tips | Blue-grey | Deep red |
| Stars | White / blue-white | Yellow-white |

A single `useSpectralMode` hook holds the value in React state and propagates it to the Three.js scene through a callback ref — no re-render cascade, no prop drilling to the canvas.

```js
// src/hooks/useSpectralMode.js
export function useSpectralMode() {
  const [mode, setMode] = useState(0)           // 0 = Hubble, 1 = Webb
  const sceneRef = useRef(null)

  const toggle = () => {
    const next = mode === 0 ? 1 : 0
    setMode(next)
    sceneRef.current?.setSpectralMode(next)     // direct uniform push, no re-render
  }

  return { mode, toggle, sceneRef }
}
```

---

## Tech Decisions Log

**Vite over CRA / Next.js**
Vite 8 starts in under 300 ms and rebuilds on save in under 50 ms. No SSR needed for a pure 3D canvas app — Next.js adds zero value and significant complexity.

**Three.js without React Three Fiber (R3F)**
R3F is excellent but adds an abstraction layer over Three.js that makes low-level shader uniform management and custom render loops harder to reason about. Direct Three.js keeps the GL layer explicit and fully debuggable via browser WebGL inspector tools.

**`vite-plugin-glsl` as devDependency**
The plugin transforms shader source at build time — the output is plain JS strings. Nothing in the browser bundle depends on the plugin at runtime.

**GLSL in separate files over template literals**
Separate `.vert` / `.frag` files get IDE syntax highlighting, WebGL compiler error messages that reference actual file line numbers, and can use `#include` for shared chunks. Template literals offer none of this.

**Shader subfolders by domain**
`pillar/`, `dust/`, `stars/` — each visual domain owns its shaders. When a pillar shader changes, the right file is immediately obvious. Avoids a flat `shaders/` directory that grows into an unorganised pile.

**Blank `App.jsx` as foundation**
The scene canvas and UI panels are added progressively. Starting from `return null` avoids accumulating Vite boilerplate that needs to be undone before real work can begin.

**No TypeScript for MVP**
Adding TS types for Three.js `Object3D` hierarchies and custom `ShaderMaterial` uniform interfaces is valuable but slows down exploratory phase iteration. JSDoc annotations cover the public API of each module. TS migration is a natural step once the scene architecture stabilises.

---

## Open Tasks

- [ ] Mount Three.js canvas from `src/scene/SceneManager.js` — resize observer, dispose on unmount
- [ ] Implement OrbitControls-style navigation — orbit + zoom, damped inertia, touch support
- [ ] Build the three pillar meshes with placeholder geometry (lathe curves from reference silhouettes)
- [ ] Author `pillar.frag` with two-palette `mix()` driven by `uSpectralMode`
- [ ] Add procedural star field (`THREE.Points` + `stars.frag` point-sprite glow)
- [ ] Wire `SpectralToggle` component → `useSpectralMode` → uniform update
- [ ] Implement raycaster click on pillars → open `HotspotPanel` with pillar data
- [ ] Fill `constants/palettes.js` with calibrated Hubble / Webb color stops
- [ ] Author `dust.frag` haze layer — additive blending, alpha falloff by height
- [ ] Performance pass: draw call audit, GPU timing on M3 integrated GPU
- [ ] Replace placeholder geometry with sculpted pillar meshes (Blender → glTF → Three.js)
