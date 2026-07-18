# Swiss Army CV

An interactive résumé presented as a **Swiss army knife**. Each fold-out tool is a
section of the CV — click a tool (or its tab) and it swings out of the red handle
while the panel reveals that part of the story.

Built as a **Vue 3 + Vite + TypeScript** single-page app. The knife is pure **SVG +
CSS** (no 3D engine, no canvas), so the whole thing gzips to ~30 KB of JS and hosts
for free as static files.

## Why this stack

- The concept is 2D vector animation (folding blades), which SVG + CSS transforms do
  natively and cheaply — no WebGL/Three.js needed.
- Vite outputs static assets, so it deploys to any free static host.

## Local development

Requires Node.js 22+.

```bash
npm install     # install dependencies
npm run dev     # start the dev server at http://localhost:5173
npm run lint    # ESLint (flat config)
npm run build   # type-check (vue-tsc) + production build to ./dist
npm run preview # preview the production build
```

## Editing the CV

All content and the tool configuration live in [`src/data/cv.ts`](src/data/cv.ts).
Each entry becomes a fold-out tool: change `label`, `items`, the `shape`, the
`openAngle` (how far it swings out), and the `accent` colour.

## Deploying cheaply

The output of `npm run build` is a static `./dist` folder. Cheapest options:

- **Cloudflare Pages** / **Netlify** — connect the repo, build command `npm run build`,
  output dir `dist`. Free tier, custom domain supported. Use the default `base: '/'`.
- **GitHub Pages** — a workflow is included at
  [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Enable
  Settings → Pages → Source = "GitHub Actions". For a **project page**
  (`user.github.io/repo/`) the workflow sets `BASE_PATH` automatically.

### Custom domain

`me.com` is owned by Apple, so `isaac.me.com` isn't obtainable. Point a domain you own
(e.g. a short `.me` domain) at your static host. When served from a domain root, keep
`base: '/'` (the default) — only set `BASE_PATH` for GitHub project pages.
