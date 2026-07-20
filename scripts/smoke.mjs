/**
 * Post-build smoke checks for the static site.
 * Catches regressions that lint/typecheck miss (e.g. serving source HTML,
 * unbalanced script tags, trailing junk after </html>).
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const dist = 'dist'
const htmlPath = join(dist, 'index.html')
const errors = []

function fail(msg) {
  errors.push(msg)
}

if (!existsSync(htmlPath)) {
  fail(`missing ${htmlPath} — run build first`)
} else {
  const html = readFileSync(htmlPath, 'utf8')
  const openScripts = (html.match(/<script\b/gi) || []).length
  const closeScripts = (html.match(/<\/script>/gi) || []).length

  if (html.includes('/src/main.ts')) {
    fail('dist/index.html still references /src/main.ts (source entry, not production bundle)')
  }
  if (!/assets\/index-[A-Za-z0-9_-]+\.js/.test(html)) {
    fail('dist/index.html missing hashed JS entry under assets/')
  }
  if (!/assets\/index-[A-Za-z0-9_-]+\.css/.test(html)) {
    fail('dist/index.html missing hashed CSS under assets/')
  }
  if (!html.includes('id="app"')) {
    fail('dist/index.html missing #app mount')
  }
  if (!html.includes('>IB.ME</title>') && !html.includes('<title>IB.ME</title>')) {
    fail('dist/index.html title should be IB.ME')
  }
  if (html.includes('id="ib-boot"') || html.includes('__IB_BOOT')) {
    fail('dist/index.html still contains the removed boot splash')
  }
  if (!html.includes('favicon.svg')) {
    fail('dist/index.html missing favicon.svg link')
  }
  if (openScripts !== closeScripts) {
    fail(`unbalanced script tags (open=${openScripts}, close=${closeScripts})`)
  }

  const parts = html.split(/<\/html>/i)
  if (parts.length < 2) {
    fail('dist/index.html missing </html>')
  } else if (parts.slice(1).some((p) => p.trim().length > 0)) {
    fail('content found after </html> (browsers may render it as visible text)')
  }

  // Inline <script> bodies must not contain the literal sequence that ends HTML scripts.
  for (const body of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
    if (/<\/script/i.test(body[1])) {
      fail('inline script contains </script which would break HTML parsing')
    }
  }

  const assetsDir = join(dist, 'assets')
  if (!existsSync(assetsDir)) {
    fail('missing dist/assets/')
  } else {
    const files = readdirSync(assetsDir)
    const js = files.filter((f) => f.endsWith('.js'))
    if (!js.length) fail('no JS files in dist/assets/')
  }

  if (!existsSync(join(dist, 'cache-bust.js'))) {
    fail('missing dist/cache-bust.js (public boot check not copied)')
  }
  if (!html.includes('cache-bust.js')) {
    fail('dist/index.html does not link cache-bust.js')
  }
  if (!existsSync(join(dist, 'favicon.svg'))) {
    fail('missing dist/favicon.svg')
  } else {
    const fav = readFileSync(join(dist, 'favicon.svg'), 'utf8')
    if (!fav.includes('>IB</text>') && !fav.includes('>IB<')) {
      fail('favicon.svg should include IB initials')
    }
    if (!/#4d48fc/i.test(fav)) {
      fail('favicon.svg should use multi-tool polymer colour #4d48fc')
    }
  }
}

if (errors.length) {
  console.error('Smoke test failed:')
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}

console.log('Smoke test passed.')
