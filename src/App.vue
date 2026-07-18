<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import ToolScene from './components/ToolScene.vue'
import { accolades, areas, contact, education, employment, profile } from './data/cv'

const SECTION_COUNT = areas.length + 2 // hero + areas + dossier

const scrollY = ref(0)
const vh = ref(typeof window !== 'undefined' ? window.innerHeight : 800)

const sectionMeta = [
  { code: '00', label: 'Overview' },
  ...areas.map((a) => ({ code: a.code, label: a.label })),
  { code: '05', label: 'Dossier' },
]

const progress = computed(() => {
  const max = (SECTION_COUNT - 1) * vh.value
  return max > 0 ? Math.min(1, Math.max(0, scrollY.value / max)) : 0
})

const active = computed(() => {
  const idx = Math.round(scrollY.value / vh.value)
  return Math.min(SECTION_COUNT - 1, Math.max(0, idx))
})

// Per-panel focus (1 when centred in the viewport, fading to 0 either side).
// The 0.62 window keeps only one card prominent at a time so adjacent panels
// don't visibly overlap during the cross-fade.
function focus(index: number): number {
  const dist = Math.abs(scrollY.value - index * vh.value) / vh.value
  return Math.min(1, Math.max(0, 1 - dist / 0.62))
}

function panelStyle(index: number) {
  const f = focus(index)
  const eased = f * f * (3 - 2 * f)
  return {
    opacity: String(eased),
    transform: `translateY(${(1 - eased) * 26}px)`,
    pointerEvents: (eased > 0.6 ? 'auto' : 'none') as 'auto' | 'none',
  }
}

let raf = 0
function onScroll() {
  if (raf) return
  raf = requestAnimationFrame(() => {
    scrollY.value = window.scrollY || document.documentElement.scrollTop || 0
    raf = 0
  })
}
function onResize() {
  vh.value = window.innerHeight
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize)
  onResize()
  onScroll()
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <ToolScene :progress="progress" />

  <!-- CAD heads-up display -->
  <div class="hud" aria-hidden="true">
    <span class="crop tl" />
    <span class="crop tr" />
    <span class="crop bl" />
    <span class="crop br" />

    <div class="titleblock">
      <div class="mono small muted">DRAWING&nbsp;// IB-2026-01 · REV C</div>
      <div class="mono big">MULTI-TOOL // PERSONNEL SPEC</div>
      <div class="mono muted">SHEET 1 OF 1 · SCALE 1:1 · UNITS mm</div>
    </div>

    <div class="readout">
      <div class="mono small muted">SECTION</div>
      <div class="mono big accent">{{ sectionMeta[active].code }}</div>
      <div class="mono">{{ sectionMeta[active].label }}</div>
    </div>

    <div class="progress">
      <div class="mono small muted">DEPLOYMENT</div>
      <div class="bar"><span :style="{ width: progress * 100 + '%' }" /></div>
      <div class="mono small">{{ Math.round(progress * 100) }}%</div>
    </div>
  </div>

  <!-- Scroll-driven content -->
  <main class="scroll">
    <section class="panel hero" :style="panelStyle(0)">
      <div class="card">
        <p class="mono small accent">// CV · IMPLEMENTATION / PM / PRODUCT / DEVELOPMENT / QA</p>
        <h1>{{ profile.name }}<span class="creds">{{ profile.creds }}</span></h1>
        <p class="role mono">{{ profile.title }}</p>
        <p class="statement">{{ profile.statement }}</p>
        <ul class="contact mono small">
          <li>{{ contact.email }}</li>
          <li>{{ contact.phone }}</li>
          <li>
            <a :href="contact.linkedinUrl" target="_blank" rel="noopener">{{ contact.linkedin }}</a>
          </li>
        </ul>
        <p class="mono small muted scrollhint">SCROLL TO DEPLOY TOOLS ↓</p>
      </div>
    </section>

    <section
      v-for="(area, i) in areas"
      :key="area.id"
      class="panel"
      :style="panelStyle(i + 1)"
    >
      <div class="card">
        <div class="card-head">
          <span class="mono code accent">TOOL {{ area.code }}</span>
          <span class="mono muted tool-name">{{ area.toolName }}</span>
        </div>
        <h2>{{ area.label }}</h2>
        <p class="tagline mono">{{ area.tagline }}</p>
        <p class="blurb">{{ area.blurb }}</p>

        <ul class="chips">
          <li v-for="skill in area.skills" :key="skill" class="mono small">{{ skill }}</li>
        </ul>

        <div class="highlights">
          <div v-for="(h, hi) in area.highlights" :key="hi" class="hl">
            <div class="hl-head">
              <span class="hl-title">{{ h.title }}</span>
              <span v-if="h.meta" class="mono small muted">{{ h.meta }}</span>
            </div>
            <p v-if="h.detail" class="hl-detail">{{ h.detail }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="panel" :style="panelStyle(SECTION_COUNT - 1)">
      <div class="card dossier">
        <div class="card-head">
          <span class="mono code accent">SHEET 05</span>
          <span class="mono muted tool-name">Full assembly</span>
        </div>
        <h2>Dossier</h2>

        <div class="dossier-grid">
          <div>
            <h3 class="mono">Employment</h3>
            <ul class="rows">
              <li v-for="role in employment" :key="role.title">
                <span class="row-title">{{ role.title }}</span>
                <span class="mono small muted">{{ role.period }}</span>
              </li>
            </ul>

            <h3 class="mono">Education</h3>
            <ul class="rows">
              <li v-for="ed in education" :key="ed.place">
                <span class="row-title">{{ ed.place }}</span>
                <span class="mono small muted">{{ ed.award }}</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 class="mono">Accolades</h3>
            <ul class="accolades">
              <li v-for="(a, ai) in accolades" :key="ai">{{ a }}</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* ---- CAD heads-up display ---- */
.hud {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}
.crop {
  position: absolute;
  width: 16px;
  height: 16px;
  border: 1.5px solid var(--line-strong);
}
.crop.tl {
  top: 16px;
  left: 16px;
  border-right: none;
  border-bottom: none;
}
.crop.tr {
  top: 16px;
  right: 16px;
  border-left: none;
  border-bottom: none;
}
.crop.bl {
  bottom: 16px;
  left: 16px;
  border-right: none;
  border-top: none;
}
.crop.br {
  bottom: 16px;
  right: 16px;
  border-left: none;
  border-top: none;
}
.titleblock {
  position: absolute;
  top: 30px;
  left: 34px;
  display: grid;
  gap: 3px;
}
.titleblock .big {
  color: var(--ink);
}
.readout {
  position: absolute;
  left: 34px;
  top: 50%;
  transform: translateY(-50%);
  display: grid;
  gap: 2px;
  border-left: 2px solid var(--accent);
  padding-left: 12px;
}
.readout .big {
  font-size: 2.4rem;
  line-height: 1;
}
.progress {
  position: absolute;
  left: 34px;
  right: 34px;
  bottom: 34px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 14px;
}
.bar {
  height: 3px;
  background: var(--line-strong);
  position: relative;
}
.bar span {
  position: absolute;
  inset: 0 auto 0 0;
  background: var(--accent);
}

.scroll {
  position: relative;
  z-index: 2;
}
.panel {
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: clamp(20px, 5vw, 80px);
  padding-right: clamp(20px, 6vw, 120px);
}
.panel .card {
  width: min(46ch, 92vw);
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(18, 24, 31, 0.14);
  border-radius: 4px;
  padding: clamp(20px, 2.4vw, 34px);
  backdrop-filter: blur(9px) saturate(1.05);
  box-shadow: 0 20px 50px rgba(31, 41, 55, 0.14);
  will-change: opacity, transform;
}
.hero .card {
  width: min(52ch, 94vw);
}

h1 {
  font-size: clamp(2.1rem, 5vw, 3.4rem);
  line-height: 1.02;
  letter-spacing: -0.02em;
  margin: 10px 0 6px;
}
.creds {
  display: inline-block;
  margin-left: 10px;
  font-size: 0.34em;
  font-family: var(--mono);
  color: var(--muted);
  vertical-align: middle;
  letter-spacing: 0.02em;
}
h2 {
  font-size: clamp(1.7rem, 4vw, 2.6rem);
  letter-spacing: -0.02em;
  margin: 4px 0 6px;
}
h3 {
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 20px 0 8px;
}
.role {
  color: var(--ink);
  font-size: 0.82rem;
  letter-spacing: 0.04em;
  margin: 0 0 16px;
}
.statement {
  color: var(--ink-soft);
  line-height: 1.6;
  font-size: 0.98rem;
}
.contact {
  list-style: none;
  padding: 0;
  margin: 20px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  color: var(--ink-soft);
}
.contact a {
  color: var(--accent);
  text-decoration: none;
}
.contact a:hover {
  text-decoration: underline;
}
.scrollhint {
  margin-top: 22px;
  animation: pulse 2.4s ease-in-out infinite;
}
@keyframes pulse {
  50% {
    opacity: 0.4;
  }
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(18, 24, 31, 0.14);
}
.code {
  letter-spacing: 0.16em;
  font-size: 0.78rem;
}
.tool-name {
  font-size: 0.76rem;
}
.tagline {
  color: var(--muted);
  font-size: 0.78rem;
  letter-spacing: 0.03em;
  margin: 8px 0 14px;
}
.blurb {
  color: var(--ink-soft);
  line-height: 1.6;
  font-size: 0.95rem;
}

.chips {
  list-style: none;
  padding: 0;
  margin: 18px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.chips li {
  border: 1px solid rgba(18, 24, 31, 0.2);
  border-radius: 2px;
  padding: 4px 9px;
  font-size: 0.72rem;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.5);
}

.highlights {
  margin-top: 18px;
  display: grid;
  gap: 12px;
}
.hl {
  border-left: 2px solid var(--accent);
  padding-left: 12px;
}
.hl-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: baseline;
}
.hl-title {
  font-weight: 600;
  font-size: 0.95rem;
}
.hl-detail {
  margin: 3px 0 0;
  color: var(--ink-soft);
  font-size: 0.88rem;
  line-height: 1.5;
}

.dossier {
  width: min(64ch, 94vw);
}
.dossier-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 26px;
}
.rows {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
}
.rows li {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.row-title {
  font-weight: 600;
  font-size: 0.92rem;
}
.accolades {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
  color: var(--ink-soft);
  font-size: 0.9rem;
  line-height: 1.45;
}

@media (max-width: 720px) {
  .panel {
    justify-content: center;
    padding-right: clamp(20px, 5vw, 80px);
  }
  .dossier-grid {
    grid-template-columns: 1fr;
  }
}
</style>
