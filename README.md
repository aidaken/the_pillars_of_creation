## Pillars of Creation: Spectral Explorer 3D
Pillars of Creation: Spectral Explorer 3D is an interactive web application that places you inside a 3D representation of the Eagle Nebula’s Pillars of Creation, inspired by Hubble and James Webb imagery. It runs entirely in the browser and lets you freely explore the pillars, orbit or fly around them, and switch between visible-light and near‑infrared–inspired color palettes to feel how different wavelengths reveal different structures.
This is a **personal / learning project**, more of a “what if we could fly through the Pillars in the browser?” experiment.
The goal of this project is a focused, scientifically grounded visualization of just this one object: the Pillars of Creation. (Right now we still need to work on scientific part and better visualizaion)
---
## Why this exists
Most NASA resources around the Pillars are either:
- Static images (Hubble 1995/2014, Webb 2022), or  
- Pre-rendered fly-through videos (NASA’s 2023 3D visualization).
These are beautiful, but they don’t let you *freely* explore or build spatial intuition. The pillars can feel flat, the scale is hard to grasp, and the difference between visible light and infrared is often explained only in text.
This project is an attempt to fill that gap: a **free, browser-based 3D experience** that a student, hobbyist, or teacher can open on a laptop or phone and explore with familiar gestures, without installing anything.

## **Note on scientific accuracy and 3D modeling**
The app is a best‑effort approximation based on public Hubble/JWST imagery, NASA visualizations, and available documentation. The true 3D structure of the Pillars is still an active research topic, and my own astrophysics knowledge is limited, so the geometry, depth, and colors are intentionally **illustrative rather than scientifically exact**.
---
## What you can do
- **Explore the 3D pillars**
  - Move around the nebula with mouse + keyboard or touch.
  - Get a sense of the shape, depth, and relative size of each pillar.
- **Toggle between “Hubble” and “Webb” inspired views**
  - Switch between a visible-light color palette and an infrared‑inspired palette.
  - In the IR mode, additional structures and protostar regions are emphasized to mimic what JWST reveals beyond dust.
- **See a living nebula context**
  - A star field and procedural nebula background provide spatial context so the pillars don’t float in a void.
  - Dust and gas structures are represented with volumetric shaders and particles rather than just flat billboards.
- **Learn through interaction (planned)**
  - Click/tap pillar regions to bring up short science blurbs that connect what you’re seeing to the underlying astrophysics.
  - These are meant to be “teacher-friendly”: short, accurate, and viewable without leaving the 3D scene.
---
## Who this is for (informally)
- **Curious students**: want space to feel real and 3D, not just like wallpaper.  
- **Space hobbyists**: follow JWST/Hubble news and want to *see* the difference between wavelengths instead of just reading about it.  
- **Educators**: want a browser-based thing they can drop into a lesson with zero install/setup.  
- **Graphics / WebGL folks**: interested in SDFs, ray marching, and shader-based nebula effects.
---
## Tech stack
- **Frontend**: React 18 + Vite  
- **3D**: Three.js (WebGL renderer, cameras, scene graph)  
- **Shaders**: GLSL, integrated directly via JS template literals  
- **Camera / controls**:
  - Custom `FlyControls` for free-fly, 6DOF pointer-lock navigation
  - Touch gestures for mobile exploration (I havent checked)
- **Assets / content**:
  - Procedural nebula background shader
  - Procedural pillar volumes via SDF ray marching
  - Star field generated in code
  - NASA Hubble texture mask (via Git LFS)
- **Dev tools**: Git + GitHub, plus AI coding tools for boilerplate and shader iteration  
There is **no backend and no external API**. Everything runs client-side in the browser.
---
## Project structure
```text
src/
  components/
    SpectralToggle.jsx    — Hubble/Webb toggle UI (bottom center)
  scene/
    SceneManager.js       — WebGLRenderer, camera, resize handler
    FlyControls.js        — Free-fly 6DOF camera (pointer lock + touch)
    lights.js             — Ambient + key/fill/rim point lights
    StarField.js          — 6000 bg stars on shell r=280–330 + 200 hero stars
    NebulaBgShader.js     — Procedural shader nebula (r=480 sphere, renderOrder -100)
    Pillar1.js            — SDF ray march, mushroom cap, domain-warped trunk
    Pillar2.js            — SDF ray march, slender finger tip, leans left
    Pillar3.js            — SDF ray march, twin peaks with waist erosion
    JwstObserver.js       — Procedural JWST-inspired geometry (bonus feature)
  utils/
    makeCircleTexture.js  — Soft circular canvas texture for PointsMaterial
  App.jsx                 — Scene wiring, spectral toggle state, HUD overlays
public/
  textures/
    pillars_mask.png      — NASA Hubble PNG (Git LFS)

## How the rendering works 
Pillars (volumetric SDF ray marching)
Each pillar is defined as a signed distance field (SDF) volume inside a bounding sphere. The fragment shader ray-marches from the camera through this volume:

Shapes are built from capsules and spheres blended with smooth-union (smin) to create organic forms.
Domain-warped FBM noise is applied before SDF evaluation to add ridges, erosion, and fibrous surface detail.
Density is computed from the SDF and modulated by noise to produce a bright inner core and softer gas wisps.
Lighting and rim highlights are derived from finite-difference SDF normals and simple scattering approximations.
Protostar regions near pillar tips use exponential falloff for a soft volumetric glow.

## Nebula background
A large, inverted sphere runs a multi-octave FBM + domain-warp shader to create swirling filamentary structures.
Two color palettes approximate:
A Hubble-style visible-light mapping (teal/cyan + golden regions), and
A Webb-inspired near‑infrared palette (deep blues, purples, reddish highlights).
Camera and controls
Desktop
Pointer Lock API for mouse look (yaw / pitch stored and applied via THREE.Euler(pitch, yaw, 0, 'YXZ')).
Movement is done in camera-local space for a “spaceflight” feel.
Mobile
One-finger drag to look around.
Two-finger pinch to move forward/backward through the scene.
Pixel ratio is capped on some devices to keep performance acceptable on mid-range hardware.

## Getting started
npm install
npm run dev       # → http://localhost:5173
npm run build     # Production bundle → dist/
npm run preview   # Serve dist/ locally
Requirements:

Node.js (recent LTS)
A browser with WebGL2 support (Chrome, Firefox, Safari, Edge; modern mobile browsers work too)
Controls
Input	Action
Click canvas	Lock pointer
Mouse move	Look around
W / S	Fly forward / back
A / D	Strafe left / right
Space	Move up
Shift	Move down
Q / E	Diagonal up-left / up-right
Z / C	Diagonal down-left / down-right
Scroll	Fly forward / back (speed adjust)
Esc	Unlock pointer
One-finger drag	Look (mobile)
Two-finger pinch	Fly forward / back (mobile)
The spectral toggle UI is rendered as a React component overlay at the bottom center of the screen.

## What this project focuses on
In scope (for now):

A single, high-quality 3D experience of the Pillars of Creation.
Reasonable performance on mid-range ~2022 hardware (laptops + phones).
A clear, visual feel for how different wavelengths change what you see.
Not trying to be (on purpose):

A fully accurate, data-driven scientific visualization.
A game with missions, scoring, or progression.
A general-purpose space simulator or multi-object “universe”.
A production-grade app with accounts, saved sessions, or dashboards.
What I originally planned to explore
This was the rough exploration plan for the project:

## Setup
Vite + React scaffold, Three.js integration, GitHub repo, basic README.
Base scene
Star field, placeholder pillar, camera + controls wired up.
Pillars and nebula
Three full pillars via SDFs, dust particles, fog, lighting.
Spectral toggle
Hubble/Webb-inspired palettes, smooth animated transitions, protostar markers for the IR view.
Hotspots
Clickable pillar regions with short science descriptions (desktop + mobile).
Polish and deployment
Performance passes, visual tuning, cross-browser checks, deploy to a static host.
Collaboration notes
The project was sketched for two people:

Aidar — architecture, shaders, performance, scene composition.
Akmatbek — UI, hotspot content, testing, and polish.


Status
This repository is an experimental, in‑progress exploration of the ideas above. Some parts of the original plan are implemented, others are still only partially explored or sketched out. Please feel free to develop this project!

P.S. Right now I’ve paused work on this project.