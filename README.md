# Multi-Tool CV — Isaac Bristow

An interactive CV presented as a **3D multi-tool**, styled like a viewport in CAD
software (graphic-realism + minimalism). As you **scroll**, the tools deploy and
rotate out of the handle one by one, each mapping to one of four specialist areas:

1. **Development**
2. **Product**
3. **Management**
4. **Healthcare Sciences**

Built with **Vue 3 + Vite + TypeScript**; the tool is real 3D via **Three.js**
(WebGL) with a studio environment for realistic metal. The rest of the UI is a
minimalist CAD "heads-up display" (title block, section readout, deployment bar).

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

- `src/three/multitool.ts` — builds the Three.js scene (handle + extruded tools,
  materials, lighting, environment) and exposes `setProgress()` driven by scroll.
- `src/components/ToolScene.vue` — canvas + Three.js lifecycle/resize.
- `src/App.vue` — scroll → progress mapping, CAD HUD, and the content panels.

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
