# Pillars of Creation — 3D Spectral Explorer

An interactive real-time 3D rendering of the Eagle Nebula's Pillars of Creation, built with React, Three.js, and custom GLSL shaders. Fly through the gas columns in first-person and toggle between Hubble visible-light and Webb infrared color palettes.

---

## What It Does

- **Free-fly camera** — click to lock pointer, WASD to fly, Space/Shift for vertical, Q/E/Z/C for diagonals, scroll to zoom, touch drag on mobile
- **Volumetric ray marching** — pillars rendered as real volumes, not meshes. A fragment shader casts rays through a density field, evaluating gas presence at each step
- **Spectral toggle** — switch between Hubble (brown-red pillars, teal nebula) and Webb infrared (orange-red pillars, warm background) in real time via a GLSL uniform
- **Dual nebula background** — two pre-built particle clouds swap on toggle, each color-matched to its palette
- **Procedural star field** — hero stars in a tight sphere + 6000 background stars on a large shell, all rendered as round-dot particles

---

## Stack

| | |
|---|---|
| React 18 | UI state, spectral toggle component |
| Three.js 0.183 | WebGL renderer, scene graph, camera |
| Vite 8 | Dev server, ESM bundling |
| GLSL | Vertex + fragment shaders embedded as template literals |

No backend. No external API. Runs entirely in the browser.

---

## Project Structure

```
src/
├── App.jsx                      # Root — wires scene, controls, toggle, hint UI
├── components/
│   └── SpectralToggle.jsx       # Hubble ↔ Webb toggle button
├── scene/
│   ├── SceneManager.js          # Renderer, camera, resize handler
│   ├── FlyControls.js           # First-person fly camera (pointer lock + touch)
│   ├── VolumetricPillars.js     # Texture-masked ray march - all 3 pillars as one volume
│   ├── Pillar1.js               # Pillar 1 (Elephant Trunk) - SDF ray march, domain warped
│   ├── NebulaBg.js              # Dual particle nebula background (Hubble + Webb sets)
│   ├── StarField.js             # Procedural star field
│   ├── lights.js                # Ambient + key/fill/rim directional lights
│   └── DustClouds.js            # Dust particles (available, not currently mounted)
└── utils/
    └── makeCircleTexture.js     # Canvas-generated circle texture for round PointsMaterial dots
```

---

## How the Rendering Works

### VolumetricPillars.js, texture-masked ray march

A large inverted sphere (`BackSide`, r=90) wraps the scene. The fragment shader casts a ray from the camera through each fragment and samples a NASA pillar photograph (`pillars_mask.png`) as a 2D density mask — image luminance determines whether gas exists at that world-space position. FBM noise warps the UV coordinates before sampling to break up linear banding.

Density at each sample point:
```
density = maskLuminance × FBM(pos) × yFade × xFade × zFade
```

Color is selected per-step based on height and density, with two branches driven by `uMode` (0.0 = Hubble, 1.0 = Webb).

### Pillar1.js - SDF ray march with domain warping

Pillar 1 (the Elephant Trunk, leftmost) is a fully procedural signed distance field volume:

**Shape primitives**
- `sdCapsule` - trunk body and three finger peaks
- `sdSphere` - mushroom cap, left-side bulge, EGG nodules at fingertips
- `smin(k)` - smooth union melts all shapes together. High k at cap/trunk junction for heavy blending, low k at EGG nodules to keep them sharp

**Domain warping**
Two-layer FBM warp applied to position before any SDF evaluation:
- Layer 1 (scale 0.20, amplitude 3.5) - large structural deformation, creates ridges and valleys
- Layer 2 (scale 0.60, amplitude 1.2) - fine surface detail, creates fibrous texture

**Density**
```
innerDensity = exp(-max(sdf, 0) * 0.5)
outerWisp    = exp(-max(sdf, 0) * 0.35) * fbm(pos * 0.13)
density      = max(innerDensity, outerWisp) * zFade * yFade
```

**Fresnel rim glow**
Surface normal estimated from SDF gradient via 6-sample finite difference. Rim intensity = `pow(1 - |dot(rayDir, normal)|, 2.0)` — teal in Hubble mode, orange in Webb.

**SDF-guided step size**
`t += max(abs(sdfVal) * 0.3, 0.22)` near the surface, `max(abs(sdfVal) * 0.5, 0.55)` in empty space — sphere-marching style, converges faster than fixed steps.

### FlyControls.js

Pointer Lock API for desktop mouse look. Camera orientation stored as `yaw` and `pitch` floats, applied each frame as `THREE.Euler(pitch, yaw, 0, 'YXZ')` — no gimbal lock. Movement translates in camera-local space so forward is always where you're looking.

---

## Controls

| Input | Action |
|---|---|
| Click canvas | Lock pointer |
| Mouse move | Look around |
| W / S | Fly forward / back |
| A / D | Strafe left / right |
| Space | Move up |
| Shift | Move down |
| Q / E | Diagonal up-left / up-right |
| Z / C | Diagonal down-left / down-right |
| Scroll | Zoom forward / back |
| Esc | Unlock pointer |
| One-finger drag | Look (mobile) |
| Two-finger pinch | Fly forward / back (mobile) |

---

## Setup

```bash
npm install
npm run dev       # → http://localhost:5173
npm run build     # production bundle → dist/
npm run preview   # serve dist/ locally
```

---

## Textures

`public/textures/pillars_mask.png` - NASA Hubble photograph used as a 2D density mask for the volumetric ray march. Tracked via Git LFS. The shader reads its luminance channel to determine gas density in world space, mapping image X to world X and image Y to world Y (portrait orientation, pillars run bottom to top).
