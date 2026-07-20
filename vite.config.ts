import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

/** Inject the public cache-bust boot script with the correct `base` prefix. */
function htmlCacheBust(): Plugin {
  return {
    name: 'html-cache-bust',
    transformIndexHtml(html) {
      if (html.includes('cache-bust.js')) return html
      const base = process.env.BASE_PATH || '/'
      const normalized = base.endsWith('/') ? base : `${base}/`
      return html.replace(
        /<\/body>/i,
        `    <script src="${normalized}cache-bust.js" defer></script>\n  </body>`,
      )
    },
  }
}

// https://vite.dev/config/
// `base` can be overridden at build time (e.g. for project-page hosting on
// GitHub Pages) via the BASE_PATH env var. Defaults to "/" which is correct
// for custom domains and Cloudflare Pages.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [vue(), htmlCacheBust()],
  build: {
    rollupOptions: {
      output: {
        // Keep Three (+ CSG helpers) in a dedicated async chunk so the shell /
        // BotCheck can paint while the WebGL stack downloads + parses.
        manualChunks(id) {
          if (
            id.includes('node_modules/three') ||
            id.includes('node_modules/three-bvh-csg') ||
            id.includes('node_modules/three-mesh-bvh')
          ) {
            return 'three'
          }
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
})
