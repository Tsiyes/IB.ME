# AGENTS.md

## Project

Multi-Tool CV — Isaac Bristow's résumé as an interactive 3D folding penknife rendered
with synthetic/high-res materials. Vue 3 + Vite + TypeScript SPA; the tool is real 3D
via Three.js (WebGL). Content lives in `src/data/cv.ts`, organised into four specialist
areas (Development, Product, Management, Healthcare Sciences).

## Cursor Cloud specific instructions

- Node.js 22 is used. Standard commands are in `package.json` scripts: `npm run dev`
  (Vite dev server on http://localhost:5173, host exposed), `npm run lint`,
  `npm run build` (runs `vue-tsc --noEmit`, `vite build`, then `scripts/smoke.mjs`),
  `npm run test` (smoke only; expects `dist/` already built), `npm run preview`.
- This is a static frontend only — no backend, database, or auth. Full WebGL/Three.js
  verification needs a real browser (GPU); smoke tests cover the static shell
  (`dist/index.html` hashed assets, balanced scripts, no junk after `</html>`,
  cache-bust boot file present). Always run `npm run lint` and `npm run build`
  (smoke included) before considering work done. Do NOT record demo videos or run
  long manual browser evidence-gathering passes; the owner reviews the running app
  post-merge.
- GitHub Pages **must** use Source = "GitHub Actions". "Deploy from a branch"
  serves the raw Vue `index.html` (`/src/main.ts`) and breaks the live site.
- Interaction is HOVER-driven on desktop, not scroll-driven. `src/three/multitool.ts`
  owns the scene and attaches its own pointer listeners to the canvas. At REST the
  tool is ASSEMBLED; the model only starts to EXPLODE once the pointer is within
  `PROXIMITY` (screen-space) of it. The explosion is an accordion — layer gaps are
  largest nearest the pointer (`ACCORDION`/`ACCORDION_SIGMA`, focus computed by
  projecting each layer). Hovering a coloured liner (or `setActiveArea()` from the
  DOM legend in `App.vue`) swings that area's tool open — tools only deploy once
  exploded (`deploy = hover * explode`). Bare scales are pickable but carry no
  `areaIndex`, so hovering the casing explodes without deploying. Active area is
  reported via `onAreaChange`. Scroll only reads the document below the hero.
  On narrow viewports (`max-width: 820px`) the hero runs in showcase mode: intro
  then hold exploded, disconnected from hover/legend; ABOUT ME is in the document.
- The active-area metadata is engraved onto the front cover via a `CanvasTexture`
  ("face plate", `drawPlate()` in `multitool.ts`) rather than a floating HTML card.
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
