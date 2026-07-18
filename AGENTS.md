# AGENTS.md

## Project

Swiss Army CV — an interactive résumé rendered as a Swiss army knife. Vue 3 + Vite +
TypeScript SPA; the knife is SVG + CSS only (no 3D). Content lives in `src/data/cv.ts`.

## Cursor Cloud specific instructions

- Node.js 22 is used. Standard commands are in `package.json` scripts: `npm run dev`
  (Vite dev server on http://localhost:5173, host exposed), `npm run lint`,
  `npm run build` (runs `vue-tsc --noEmit` then `vite build`), `npm run preview`.
- This is a static frontend only — there is no backend, database, or auth. Testing =
  run `npm run dev` and interact in the browser.
- SVG tool rotation gotcha: the fold-out tools rotate via the CSS `transform` property
  with `transform-box: view-box` and `transform-origin: 515px 300px` (the pivot pin, in
  view-box units) — see `src/components/SwissArmyKnife.vue`. Do NOT drive the rotation
  through the SVG `transform="rotate(...)"` attribute; mixing it with CSS
  `transform-origin` makes the tools rotate around the wrong point and fly off-screen.
  All tool silhouettes in `ToolShape.vue` are drawn pointing right from that same pivot.
- Deployment is static (`./dist`). `vite.config.ts` reads `BASE_PATH` (defaults to `/`);
  set it only for GitHub Pages *project* pages. The included
  `.github/workflows/deploy.yml` publishes to GitHub Pages.
