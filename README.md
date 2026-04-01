# Pillars of Creation: Spectral Explorer 3D

An interactive real-time 3D rendering of the Eagle Nebula's Pillars of Creation, built with React, Three.js, and custom GLSL shaders. Fly through the gas columns in first-person and toggle between Hubble visible-light and Webb infrared color palettes.

---

## Stack

| | |
|---|---|
| React 18 + Vite | UI state, spectral toggle, hint overlay |
| Three.js r183 | WebGL renderer, scene graph, camera |
| GLSL | Vertex + fragment shaders embedded as JS template literals |
| Custom FlyControls | Free-fly 6DOF camera (Pointer Lock + touch) |

No backend. No external API. Runs entirely in the browser.

---

## Project Structure

```
src/
  components/
    SpectralToggle.jsx    — Hubble/Webb toggle UI (bottom center)
  scene/
    SceneManager.js       — WebGLRenderer, camera, resize handler
    FlyControls.js        — Free-fly 6DOF camera (pointer lock + touch)
    lights.js             — Ambient + key/fill/rim point lights
    StarField.js          — 6000 bg stars on shell r=280-330 + 200 hero stars
    NebulaBgShader.js     — Procedural shader nebula (r=480 sphere, renderOrder -100)
    Pillar1.js            — SDF ray march, mushroom cap, domain-warped trunk
    Pillar2.js            — SDF ray march, slender finger tip, leans left
    Pillar3.js            — SDF ray march, twin peaks with waist erosion
    JwstObserver.js       — Procedural JWST geometry (bonus feature)
  utils/
    makeCircleTexture.js  — Soft circular canvas texture for PointsMaterial
  App.jsx                 — Scene wiring, spectral toggle state, HUD overlays

public/
  textures/
    pillars_mask.png      — NASA Hubble PNG (Git LFS)
```

---

## Setup

```bash
npm install
npm run dev       # → http://localhost:5173
npm run build     # production bundle → dist/
npm run preview   # serve dist/ locally
```

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

## How the Rendering Works

### SDF Ray March (Pillar1/2/3)

Each pillar is a fully procedural signed distance field volume inside a BackSide sphere bounding box. The fragment shader sphere-marches from the camera position, evaluating the SDF at each step:

- **Shape**: Smooth-union (`smin`) of capsules + spheres
- **Domain warping**: Two-layer FBM warp before SDF evaluation — large structural ridges (scale 0.20, amp 3.5) + fine fibrous surface detail (scale 0.55, amp 0.9)
- **Density**: `exp(-max(sdf, 0) * k)` inner core + FBM-modulated outer gas wisps
- **Step size**: `max(|sdf| * 0.3, 0.22)` near surface, `max(|sdf| * 0.5, 0.55)` in empty space
- **Normals**: 6-sample finite difference on SDF for Fresnel rim lighting
- **Protostar glow**: Radial exponential falloff (`exp(-dist * k)`) at each pillar tip + soft halo

### NebulaBgShader.js — Procedural Nebula Background

A large BackSide sphere (r=480, renderOrder -100) runs 6-octave FBM with two-level domain warping to produce swirling filamentary structure:

- **Hubble palette**: Deep space dark → OIII teal → bright cyan knots → SII gold base
- **Webb palette**: Deep navy → dark blue filaments → medium navy → purple-navy accent

### FlyControls.js

Pointer Lock API for desktop mouse look. Orientation stored as `yaw`/`pitch` floats, applied as `THREE.Euler(pitch, yaw, 0, 'YXZ')` — no gimbal lock. Movement translates in camera-local space.

---

## Tech Decisions

- GLSL embedded as JS template literals — no external `.glsl` files
- SDF ray march for pillars — mesh geometry would look ceramic/hard-edged
- `smin()` smooth union for organic shapes where primitives blend
- Domain warping applied before SDF evaluation for fibrous/organic surface
- Free-fly camera replaces OrbitControls — matches Solar System Scope feel
- Pixel ratio capped at 1.0 for mobile performance
- Git LFS for NASA texture asset
