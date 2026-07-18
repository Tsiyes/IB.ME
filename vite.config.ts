import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
// `base` can be overridden at build time (e.g. for project-page hosting on
// GitHub Pages) via the BASE_PATH env var. Defaults to "/" which is correct
// for custom domains and Cloudflare Pages.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [vue()],
  server: {
    host: true,
    port: 5173,
  },
})
