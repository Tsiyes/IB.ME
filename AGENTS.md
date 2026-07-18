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
- Testing/evidence preference (owner request): do NOT record demo videos, and do NOT
  run the long manual browser evidence-gathering pass for this project. Lint + build
  output is sufficient; the owner reviews the running app post-merge.
- Interaction is HOVER-driven, not scroll-driven. `src/three/multitool.ts` owns the
  scene and attaches its own pointer listeners to the canvas. At REST the tool is
  ASSEMBLED; hovering the model gradually EXPLODES it (eases `explodeScalar` 0→1).
  Hovering a coloured liner (or `setActiveArea()` from the DOM legend in `App.vue`)
  swings that area's tool open — tools only deploy once exploded (`deploy = hover *
  explode`). Bare scales are pickable but carry no `areaIndex`, so hovering the casing
  explodes without deploying. Active area is reported via `onAreaChange`. Scroll only
  reads the document below the hero.
- The layers separate along the pin axis (Z). Because the camera looks nearly down Z,
  the whole assembly is kept at a canted 3/4 view at all times (see `assembly.rotation`
  in `applyFrame`, swinging slightly further as it explodes) so the coloured inserts
  read even when assembled and the separation is visible when exploded. Keep it canted
  if you touch the camera/explode.
- 3D geometry: it's a penknife — two `stadium` scales, colored per-area liner plates,
  end pins, and four folding tools. Each tool is an `ExtrudeGeometry` (2D profile with a
  rounded tang + pivot hole) pivoting on the end pin; `pivot.rotation.z` folds it from
  `CLOSED` (π) to `openAngle(i)`. Metal only looks right because of the `RoomEnvironment`
  PMREM env map — without `scene.environment` the tools render near-black.
- Deployment is static (`./dist`). `vite.config.ts` reads `BASE_PATH` (defaults to `/`);
  set it only for GitHub Pages *project* pages. `.github/workflows/deploy.yml` publishes
  to GitHub Pages. The Three.js bundle pushes the JS chunk >500 kB (Vite warns); this is
  expected and harmless for this app.
