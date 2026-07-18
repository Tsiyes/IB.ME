# AGENTS.md

## Project

Multi-Tool CV — Isaac Bristow's résumé as an interactive 3D multi-tool with a CAD /
graphic-realism aesthetic. Vue 3 + Vite + TypeScript SPA; the tool is real 3D via
Three.js (WebGL). Content lives in `src/data/cv.ts`, organised into four specialist
areas (Development, Product, Management, Healthcare Sciences).

## Cursor Cloud specific instructions

- Node.js 22 is used. Standard commands are in `package.json` scripts: `npm run dev`
  (Vite dev server on http://localhost:5173, host exposed), `npm run lint`,
  `npm run build` (runs `vue-tsc --noEmit` then `vite build`), `npm run preview`.
- This is a static frontend only — no backend, database, or auth. Testing = run
  `npm run dev` and interact in the browser. It is WebGL/Three.js, so verification
  needs a real browser (GPU/WebGL); it won't render via headless HTML checks.
- Scroll drives everything: `src/App.vue` converts scroll position into a 0–1
  `progress` (over `SECTION_COUNT` full-viewport sections) passed to
  `src/three/multitool.ts`, which eases toward it and computes each tool's fold
  angle + roll. If you add/remove sections, keep `SECTION_COUNT`, the per-tool
  `start` windows in `multitool.ts`, and `areas` in `cv.ts` in sync or tools will
  deploy out of step with their panels.
- 3D geometry: each tool is an `ExtrudeGeometry` from a 2D profile drawn pointing +X
  from the shared pivot; the pivot group's `rotation.z` folds it from `CLOSED_ANGLE`
  (π) to the area's `openAngle`. Metal only looks right because of the `RoomEnvironment`
  PMREM env map — without `scene.environment` the tools render near-black.
- Deployment is static (`./dist`). `vite.config.ts` reads `BASE_PATH` (defaults to `/`);
  set it only for GitHub Pages *project* pages. `.github/workflows/deploy.yml` publishes
  to GitHub Pages. The Three.js bundle pushes the JS chunk >500 kB (Vite warns); this is
  expected and harmless for this app.
