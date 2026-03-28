# Pillars of Creation: Spectral Explorer 3D

Interactive 3D web experience of the Eagle Nebula (M16) “Pillars” — orbit, zoom, and switch between Hubble-style visible light and Webb-style near-infrared palettes. MVP uses approximated geometry and colors (no FITS pipeline yet).

## Stack

| Layer | Choice |
|--------|--------|
| UI | React 18 |
| Build | Vite 8 |
| 3D | three.js |
| Shaders | GLSL, imported via `vite-plugin-glsl` |
| Target dev | Localhost; deploy path: Vercel |

No backend, no extra runtime libraries beyond the above.

## Folder Structure

```
src/
  components/     # React UI (spectral toggle, pillar info panel)
  scene/          # Three.js scene, camera, render loop
  shaders/
    pillar/       # Pillar volumetric / surface shaders
    dust/         # Shared medium / haze
    stars/        # Star field
  hooks/          # Custom React hooks
  constants/      # Scene config, palettes per spectral mode
  utils/          # Pure helpers
```

Empty directories are tracked with `.gitkeep` until real files land.

## Setup

```bash
npm install
npm run dev
```

- **Develop:** `npm run dev` — Vite dev server (default `http://localhost:5173`).
- **Production build:** `npm run build` — output in `dist/` (suitable for Vercel static hosting).
- **Preview build:** `npm run preview`.

## Tech Decisions Log

- **Vite + React in-repo:** The folder already contained a Vite React app; configuration was aligned to this spec (React 18, `three`, `vite-plugin-glsl`) instead of re-running `create-vite` into a non-empty tree, which would clobber existing docs and git history.
- **`vite-plugin-glsl` as devDependency:** Build-time only; keeps `dependencies` limited to React and three.js for production bundles.
- **Blank `App`:** Scene and UI mount points are added in follow-up tasks; foundation stays minimal.
- **Shader subfolders:** Split by domain (pillar / dust / stars) so files stay small and ownership is obvious for split work (architecture vs UI).

## Open Tasks

- [ ] Mount a Three.js canvas from `src/scene/` (resize, dispose on unmount).
- [ ] Implement OrbitControls-style navigation (mouse + touch) with Solar System Scope–like feel.
- [ ] Add three pillar volumes/meshes and a star field; wire spectral uniforms to `src/constants/`.
- [ ] Spectral toggle UI in `src/components/` driving palette uniforms.
- [ ] Pillar raycast hit → science panel content.
- [ ] Performance pass on M3 MacBook Air (integrated GPU budget).
