# AGENTS.md

## Project

Multi-Tool CV — Isaac Bristow's résumé as an interactive 3D folding penknife rendered
with synthetic/high-res materials. Vue 3 + Vite + TypeScript SPA; the tool is real 3D
via Three.js (WebGL). Content lives in `src/data/cv.ts`, organised into four specialist
areas (Development, Product, Management, Healthcare Sciences).

## Cursor Cloud specific instructions

- Node.js 22 is used. Standard commands are in `package.json` scripts: `npm run dev`
  (Vite dev server on http://localhost:5173, host exposed), `npm run lint`,
  `npm run build` (runs `vue-tsc --noEmit` then `vite build`), `npm run preview`.
- This is a static frontend only — no backend, database, or auth. Testing = run
  `npm run dev` and interact in the browser. It is WebGL/Three.js, so verification
  needs a real browser (GPU/WebGL); it won't render via headless HTML checks.
- Testing preference (owner request): do NOT record demo videos for this project —
  screenshots plus lint/build output are sufficient evidence.
- Interaction is HOVER-driven, not scroll-driven. `src/three/multitool.ts` owns the
  scene and attaches its own pointer listeners to the canvas: hovering the model
  assembles it (eases `assembleScalar` 0→1), hovering a handle zone/tool (raycast →
  area index, or `setActiveArea()` from the DOM legend in `App.vue`) swings that tool
  open. It reports the active area via the `onAreaChange` callback. Scroll only reads
  the document below the hero; it does not drive the 3D.
- The exploded (rest) view separates the layers along the pin axis (Z). Because the
  camera looks nearly down Z, the model is rotated to a 3/4 view when exploded and
  eased to face-on as it assembles (see the `lerp` on `assembly.rotation` keyed to the
  assemble factor) — otherwise the Z separation is invisible. Keep that coupling if you
  touch the camera/explode.
- 3D geometry: it's a penknife — two `stadium` scales, colored per-area liner plates,
  end pins, and four folding tools. Each tool is an `ExtrudeGeometry` (2D profile with a
  rounded tang + pivot hole) pivoting on the end pin; `pivot.rotation.z` folds it from
  `CLOSED` (π) to `openAngle(i)`. Metal only looks right because of the `RoomEnvironment`
  PMREM env map — without `scene.environment` the tools render near-black.
- Deployment is static (`./dist`). `vite.config.ts` reads `BASE_PATH` (defaults to `/`);
  set it only for GitHub Pages *project* pages. `.github/workflows/deploy.yml` publishes
  to GitHub Pages. The Three.js bundle pushes the JS chunk >500 kB (Vite warns); this is
  expected and harmless for this app.
