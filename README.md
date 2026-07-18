# Multi-Tool CV — Isaac Bristow

An interactive CV presented as a **3D folding penknife**. At rest it sits assembled at
a canted 3/4 angle so the colored area inserts are visible between the scales. **Hover**
the model to gradually **explode** it along the pivot axis, then hover one of the
colored inserts to swing that area's tool open. Each insert maps to a specialist area:

1. **Development**
2. **Product**
3. **Management**
4. **Healthcare Sciences**

Built with **Vue 3 + Vite + TypeScript**; the tool is real 3D via **Three.js**
(WebGL) with a studio environment (`RoomEnvironment`) and clearcoat/chrome materials
for a high-res synthetic look. Full experience, education and accolades are in the
document below the interactive hero.

## Local development

Requires Node.js 22+.

```bash
npm install     # install dependencies
npm run dev     # dev server at http://localhost:5173
npm run lint    # ESLint (flat config)
npm run build   # type-check (vue-tsc) + production build to ./dist
npm run preview # preview the production build
```

## Editing the CV

All content lives in [`src/data/cv.ts`](src/data/cv.ts): profile/contact, the four
`areas` (each with its tool kind, skills and highlights), plus `employment`,
`education` and `accolades`. Each area's `tool`, `openAngle`, `spin` and `zOffset`
control how its implement is drawn and how it deploys in 3D.

## Structure

- `src/three/multitool.ts` — builds the Three.js penknife (scales, colored liners,
  pins, folding tools), owns pointer/hover interaction, explode↔assemble + deploy
  animation, and reports the active area via an `onAreaChange` callback.
- `src/components/ToolScene.vue` — canvas + Three.js lifecycle/resize; forwards area
  changes and accepts an optional `forceArea` (used by the accessible legend).
- `src/App.vue` — hero overlay (inspector card + legend) and the document sections
  (specialisms, experience, education, accolades).

## Deploying cheaply

`npm run build` emits a static `./dist`, so hosting is free:

- **Cloudflare Pages** / **Netlify** — connect the repo, build `npm run build`,
  output `dist`. Keep the default `base: '/'`.
- **GitHub Pages** — workflow at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml);
  enable Settings → Pages → Source = "GitHub Actions" (it sets `BASE_PATH` for
  project pages automatically).

### Custom domain

`me.com` is owned by Apple, so `isaac.me.com` isn't obtainable. Point a domain you
own (e.g. a short `.me` domain) at any of the hosts above. Served from a domain root,
keep `base: '/'`; only set `BASE_PATH` for GitHub project pages.
