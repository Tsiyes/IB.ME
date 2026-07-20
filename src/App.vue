<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BotCheck from './components/BotCheck.vue'
import GpuHint from './components/GpuHint.vue'
import ToolScene from './components/ToolScene.vue'
import { accolades, areas, contact, education, experience, profile } from './data/cv'
import { bootStage as setBootStage } from './lib/boot'
import { formatCount, getCachedCounters, loadCounters } from './lib/counters'

const MOBILE_MQ = '(max-width: 820px)'

const unlocked = ref(false)
const introDone = ref(false)
const expanded = ref(false)
const activeId = ref<string | null>(null)
const forceArea = ref<number | null>(null)
const visits = ref<number | null>(null)
const botsBounced = ref<number | null>(null)
/** Mirrors the 4-part boot ring: shell=1 … scene=4. */
const bootStage = ref(2)
const isMobile = ref(
  typeof window !== 'undefined' && window.matchMedia(MOBILE_MQ).matches,
)

const activeArea = computed(() => areas.find((a) => a.id === activeId.value) ?? null)
// Desktop: ABOUT ME waits for the construct intro; hides while expanded.
// Mobile: ABOUT ME lives in the document below the hero (not overlaid).
const showBlurb = computed(() => {
  if (isMobile.value) return !!activeArea.value
  return !!activeArea.value || (introDone.value && !expanded.value)
})
const heroLive = computed(() => unlocked.value && introDone.value)

let mobileMq: MediaQueryList | null = null
function syncMobile() {
  isMobile.value = !!mobileMq?.matches
}

onMounted(() => {
  mobileMq = window.matchMedia(MOBILE_MQ)
  syncMobile()
  mobileMq.addEventListener('change', syncMobile)
})
onBeforeUnmount(() => {
  mobileMq?.removeEventListener('change', syncMobile)
})

watch(isMobile, (mobile) => {
  // Drop any forced legend hover when entering showcase mode.
  if (mobile) forceArea.value = null
})

watch(
  unlocked,
  (ok) => {
    document.body.style.overflow = ok ? '' : 'hidden'
  },
  { immediate: true },
)

function syncCounters() {
  const snap = getCachedCounters()
  visits.value = snap.visits
  botsBounced.value = snap.botsBounced
}

function onUnlocked() {
  unlocked.value = true
  syncCounters()
  void loadCounters().then(syncCounters)
}
function onAreaChange(id: string | null) {
  activeId.value = id
}
function onExpandChange(isExpanded: boolean) {
  expanded.value = isExpanded
}
function onIntroComplete() {
  introDone.value = true
}
function onBootProgress(stage: number) {
  bootStage.value = Math.max(bootStage.value, stage)
  if (stage >= 3) setBootStage('engine')
  if (stage >= 4) setBootStage('scene')
}
function hoverLegend(index: number | null) {
  if (isMobile.value) return
  forceArea.value = index
}
function scrollToSpecialisms(areaId?: string) {
  const el = document.getElementById(areaId ? `area-${areaId}` : 'specialisms')
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
function scrollToAbout() {
  document.getElementById('about')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
function onLegendActivate(areaId: string, index: number) {
  if (!isMobile.value) forceArea.value = index
  scrollToSpecialisms(areaId)
}
function onScrollCue() {
  if (isMobile.value) scrollToAbout()
  else scrollToSpecialisms()
}
</script>

<template>
  <Transition name="gate">
    <BotCheck v-if="!unlocked" :boot-stage="bootStage" @passed="onUnlocked" />
  </Transition>

  <GpuHint v-if="unlocked" />

  <!-- Scene mounts immediately (under the gate) so WebGL warms during the check. -->
  <section
    class="hero"
    :class="{ showcase: isMobile }"
    :aria-hidden="!heroLive || undefined"
    :inert="!heroLive || undefined"
  >
    <ToolScene
      :force-area="forceArea"
      :run-intro="unlocked"
      :showcase-mode="isMobile"
      @area-change="onAreaChange"
      @expand-change="onExpandChange"
      @intro-complete="onIntroComplete"
      @boot-progress="onBootProgress"
    />

    <!-- Identity is engraved on the tool's face plate; this heading is for
         accessibility / SEO only. -->
    <h1 class="sr-only">{{ profile.name }} — {{ profile.title }}</h1>

    <div
      class="blurb-panel"
      :class="{ on: showBlurb }"
      :style="activeArea ? { '--accent': activeArea.accent } : {}"
    >
      <Transition name="swap" mode="out-in">
        <div v-if="activeArea" :key="activeArea.id">
          <p class="panel-title">{{ activeArea.label }}</p>
          <p class="blurb">{{ activeArea.blurb }}</p>
        </div>
        <div v-else-if="introDone && !expanded && !isMobile" key="idle">
          <p class="panel-title">ABOUT ME</p>
          <p class="blurb">{{ profile.statement }}</p>
        </div>
      </Transition>
    </div>

    <!-- Desktop hover journey legend — omitted on mobile showcase. -->
    <nav
      v-if="!isMobile"
      class="legend"
      :class="{ on: introDone }"
      aria-label="Specialist areas"
    >
      <button
        v-for="(area, i) in areas"
        :key="area.id"
        type="button"
        class="leg"
        :class="{ on: activeId === area.id }"
        :style="{ '--accent': area.accent }"
        @mouseenter="hoverLegend(i)"
        @mouseleave="hoverLegend(null)"
        @focus="hoverLegend(i)"
        @blur="hoverLegend(null)"
        @click="onLegendActivate(area.id, i)"
      >
        <span class="dot" />
        <span class="mono">{{ area.label }}</span>
      </button>
    </nav>

    <button
      type="button"
      class="scroll-cue"
      :class="{ on: introDone }"
      @click="onScrollCue"
    >
      <span class="mono">{{ isMobile ? 'About me' : 'Specialisms' }}</span>
      <span class="chev" aria-hidden="true" />
    </button>
  </section>

  <main class="doc" :aria-hidden="!unlocked || undefined" :inert="!unlocked || undefined">
    <section id="about" class="block about-block">
      <h3 class="mono section-title">About me</h3>
      <p class="blurb about-copy">{{ profile.statement }}</p>
    </section>

    <section id="specialisms" class="block">
      <h3 class="mono section-title">Specialisms</h3>
      <div class="grid areas-grid">
        <article
          v-for="area in areas"
          :key="area.id"
          :id="`area-${area.id}`"
          class="areacard"
          :style="{ '--accent': area.accent }"
        >
          <div class="ac-head">
            <span class="dot" />
            <span class="mono code">{{ area.code }}</span>
            <h4>{{ area.label }}</h4>
          </div>
          <p class="blurb">{{ area.blurb }}</p>
          <ul class="chips">
            <li v-for="s in area.skills" :key="s" class="mono">{{ s }}</li>
          </ul>
          <div class="hls">
            <div v-for="(h, hi) in area.highlights" :key="hi" class="hl">
              <strong>{{ h.title }}</strong>
              <span v-if="h.meta" class="mono muted">{{ h.meta }}</span>
              <p v-if="h.detail">{{ h.detail }}</p>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="block">
      <h3 class="mono section-title">Experience</h3>
      <div v-for="co in experience" :key="co.name" class="company">
        <div class="co-head">
          <h4>{{ co.name }}</h4>
          <span v-if="co.meta" class="mono muted">{{ co.meta }}</span>
        </div>
        <div v-for="(role, ri) in co.roles" :key="ri" class="role-item">
          <div class="role-head">
            <strong>{{ role.title }}</strong>
            <span class="mono muted">{{ role.period }}</span>
          </div>
          <p v-if="role.location" class="mono muted loc">{{ role.location }}</p>
          <p v-if="role.summary" class="blurb">{{ role.summary }}</p>
          <ul v-if="role.bullets" class="bullets">
            <li v-for="(b, bi) in role.bullets" :key="bi">{{ b }}</li>
          </ul>
          <ul v-if="role.skills" class="chips">
            <li v-for="s in role.skills" :key="s" class="mono">{{ s }}</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="block two">
      <div>
        <h3 class="mono section-title">Education</h3>
        <ul class="rows">
          <li v-for="ed in education" :key="ed.place">
            <strong>{{ ed.place }}</strong>
            <span class="mono muted">{{ ed.award }}</span>
          </li>
        </ul>
      </div>
      <div>
        <h3 class="mono section-title">Accolades</h3>
        <ul class="accolades">
          <li v-for="(a, ai) in accolades" :key="ai">{{ a }}</li>
        </ul>
      </div>
    </section>

    <footer class="foot mono">
      <p class="foot-contact">
        <span>{{ contact.email }}</span>
        <span>{{ contact.phone }}</span>
        <a :href="contact.linkedinUrl" target="_blank" rel="noopener">{{ contact.linkedin }}</a>
      </p>
      <p class="tally muted">
        <span>Visits {{ formatCount(visits) }}</span>
        <span class="sep" aria-hidden="true">·</span>
        <span>Bots bounced {{ formatCount(botsBounced) }}</span>
      </p>
      <p class="muted">Built with Vue 3 + Three.js · WebGL, static &amp; free to host.</p>
    </footer>
  </main>
</template>

<style scoped>
/* ---------- HERO ---------- */
.hero {
  position: relative;
  /* Short of a full viewport so the Specialisms heading peeks below. */
  height: 88svh;
  min-height: 520px;
  overflow: hidden;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.blurb-panel {
  --accent: #4d48fc;
  position: absolute;
  left: 50%;
  bottom: clamp(118px, 18vh, 168px);
  transform: translateX(-50%);
  z-index: 2;
  width: min(52ch, 86vw);
  text-align: center;
  padding-top: 12px;
  border-top: 2px solid transparent;
  pointer-events: none;
  opacity: 0;
  transition: opacity 180ms ease, border-color 180ms ease;
}
.blurb-panel.on {
  opacity: 1;
  border-top-color: var(--accent);
}
.panel-title {
  margin: 0 0 6px;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--ink);
}

.hovertip {
  position: absolute;
  left: 50%;
  top: clamp(120px, 20vh, 210px);
  transform: translateX(-50%);
  z-index: 2;
  margin: 0;
  font-size: 0.72rem;
  color: var(--muted);
  text-align: center;
  pointer-events: none;
}
.code {
  color: var(--accent);
  letter-spacing: 0.14em;
}

.legend {
  position: absolute;
  left: 50%;
  bottom: clamp(48px, 7vh, 72px);
  transform: translateX(-50%);
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  opacity: 0;
  transition: opacity 420ms ease;
}
.legend.on {
  opacity: 1;
}

.scroll-cue {
  position: absolute;
  left: 50%;
  bottom: clamp(10px, 2vh, 18px);
  transform: translateX(-50%);
  z-index: 2;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  opacity: 0;
  transition: opacity 420ms ease, color 160ms ease;
}
.scroll-cue.on {
  opacity: 1;
}
.scroll-cue:hover,
.scroll-cue:focus-visible {
  color: var(--ink);
  outline: none;
}
.scroll-cue .chev {
  width: 7px;
  height: 7px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg);
  animation: cue-bob 1.8s ease-in-out infinite;
}
@keyframes cue-bob {
  0%,
  100% {
    transform: rotate(45deg) translateY(0);
  }
  50% {
    transform: rotate(45deg) translateY(3px);
  }
}
.leg {
  --accent: #4d48fc;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font: inherit;
  font-size: 0.74rem;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.66);
  border: 1px solid rgba(18, 24, 31, 0.12);
  border-radius: 999px;
  padding: 7px 14px;
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
  backdrop-filter: blur(6px);
}
.leg:hover,
.leg.on,
.leg:focus-visible {
  transform: translateY(-2px);
  background: #fff;
  box-shadow: 0 8px 22px rgba(24, 33, 46, 0.16);
  outline: none;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 24%, transparent);
}

/* ---------- BLURBS / CHIPS shared ---------- */
.blurb {
  color: var(--ink-soft);
  line-height: 1.58;
  font-size: 0.92rem;
  margin: 0;
}
.chips {
  list-style: none;
  padding: 0;
  margin: 14px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chips li {
  border: 1px solid rgba(18, 24, 31, 0.16);
  border-radius: 3px;
  padding: 3px 8px;
  font-size: 0.68rem;
  background: rgba(255, 255, 255, 0.6);
}
.hint {
  margin-top: 16px;
  font-size: 0.72rem;
}

/* ---------- DOCUMENT ---------- */
.doc {
  position: relative;
  z-index: 2;
  max-width: 1080px;
  margin: 0 auto;
  padding: clamp(30px, 6vw, 90px) clamp(20px, 5vw, 48px) 60px;
}
.block {
  margin-bottom: clamp(40px, 7vw, 84px);
}
#about,
#specialisms,
.areacard {
  scroll-margin-top: 28px;
}
/* Desktop keeps ABOUT ME on the hero face; mobile reads it in the document. */
.about-block {
  display: none;
}
.about-copy {
  max-width: 62ch;
  font-size: 1rem;
}
.section-title {
  font-size: 0.74rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--muted);
  border-bottom: 1px solid var(--line-strong);
  padding-bottom: 10px;
  margin: 0 0 24px;
}
.grid {
  display: grid;
  gap: 18px;
}
.areas-grid {
  grid-template-columns: repeat(4, 1fr);
}
@media (max-width: 900px) {
  .areas-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 520px) {
  .areas-grid {
    grid-template-columns: 1fr;
  }
}
.areacard {
  --accent: #4d48fc;
  border: 1px solid rgba(18, 24, 31, 0.1);
  border-top: 3px solid var(--accent);
  border-radius: 6px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.6);
}
.ac-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.ac-head h4 {
  margin: 0;
  font-size: 1.05rem;
}
.ac-head .code {
  color: var(--muted);
  font-size: 0.72rem;
}
.hls {
  margin-top: 14px;
  display: grid;
  gap: 10px;
}
.hl {
  border-left: 2px solid var(--accent);
  padding-left: 10px;
}
.hl strong {
  font-size: 0.9rem;
}
.hl p {
  margin: 2px 0 0;
  color: var(--ink-soft);
  font-size: 0.84rem;
  line-height: 1.45;
}

.company {
  margin-bottom: 30px;
}
.co-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 14px;
}
.co-head h4 {
  margin: 0;
  font-size: 1.2rem;
}
.role-item {
  padding: 16px 0;
  border-top: 1px solid var(--line);
}
.role-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}
.role-head strong {
  font-size: 1rem;
}
.loc {
  margin: 2px 0 8px;
  font-size: 0.72rem;
}
.bullets {
  margin: 10px 0 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
  color: var(--ink-soft);
  font-size: 0.9rem;
  line-height: 1.5;
}

.two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
}
.rows {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 12px;
}
.rows li {
  display: flex;
  flex-direction: column;
  gap: 2px;
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
.foot {
  text-align: center;
  font-size: 0.72rem;
  padding-top: 20px;
  border-top: 1px solid var(--line);
}
.foot-contact {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 20px;
  justify-content: center;
  margin: 0 0 8px;
  color: var(--ink-soft);
}
.foot-contact a {
  color: var(--ink);
  text-decoration: none;
  border-bottom: 1px solid var(--line-strong);
}
.foot .tally {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  justify-content: center;
  margin: 0 0 8px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.foot .tally .sep {
  opacity: 0.55;
}

.swap-enter-active,
.swap-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}
.swap-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.swap-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.gate-enter-active,
.gate-leave-active {
  transition: opacity 380ms ease;
}
.gate-enter-from,
.gate-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .gate-enter-active,
  .gate-leave-active,
  .swap-enter-active,
  .swap-leave-active {
    transition: none;
  }
}

@media (max-width: 820px) {
  .two {
    grid-template-columns: 1fr;
  }

  .hero.showcase {
    /* Full first screen for the intro → explode showcase. */
    height: 100svh;
    min-height: 520px;
  }

  .hero.showcase .blurb-panel {
    display: none;
  }

  .about-block {
    display: block;
  }
}
</style>
