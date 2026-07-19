/**
 * GitHub Pages caches index.html briefly. After redeploy, a stale HTML shell can
 * point at a superseded hashed JS file (404). This boot check lives outside the
 * hashed bundle so it still runs when the old entry 404s.
 *
 * Copied to dist/ via Vite `public/`; linked with the configured `base` path.
 */
;(() => {
  const FLAG = 'mtcv-html-bust'
  const params = new URLSearchParams(location.search)
  if (params.has('_r')) {
    params.delete('_r')
    const q = params.toString()
    history.replaceState(null, '', location.pathname + (q ? `?${q}` : '') + location.hash)
    try {
      sessionStorage.removeItem(FLAG)
    } catch {
      /* ignore */
    }
    return
  }

  const entry = document.querySelector('script[type="module"][src]')
  const localSrc = entry?.getAttribute('src') || ''
  // Vite dev serves /src/main.ts — nothing to reconcile.
  if (!localSrc || localSrc.includes('/src/')) return

  try {
    if (sessionStorage.getItem(FLAG)) {
      sessionStorage.removeItem(FLAG)
      return
    }
  } catch {
    /* ignore */
  }

  const probe = new URL(location.href)
  probe.hash = ''
  probe.search = ''
  probe.searchParams.set('_', String(Date.now()))

  fetch(probe.toString(), { cache: 'no-store', headers: { Pragma: 'no-cache' } })
    .then((r) => (r.ok ? r.text() : Promise.reject()))
    .then((html) => {
      const match = html.match(/assets\/index-[A-Za-z0-9_-]+\.js/)
      if (!match || localSrc.includes(match[0])) return
      try {
        sessionStorage.setItem(FLAG, '1')
      } catch {
        /* ignore */
      }
      const next = new URL(location.href)
      next.searchParams.set('_r', String(Date.now()))
      location.replace(next.toString())
    })
    .catch(() => {})
})()
