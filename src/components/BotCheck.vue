<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { areas, type Area } from '../data/cv'
import { formatCount, recordBotBounce, recordVisit } from '../lib/counters'
import { playToolClick, unlockAudio } from '../three/sfx'

const emit = defineEmits<{ passed: [] }>()

function shuffle<T>(list: T[]): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Opposite-hue ink that stays readable on a solid accent fill. */
function complementaryInk(hex: string): string {
  const raw = hex.replace('#', '')
  const n =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw
  const r = parseInt(n.slice(0, 2), 16) / 255
  const g = parseInt(n.slice(2, 4), 16) / 255
  const b = parseInt(n.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      default:
        h = ((r - g) / d + 4) / 6
    }
  }
  const ch = (h * 360 + 180) % 360
  // Light complementary on darker fills; deep complementary on lighter fills.
  const tl = l < 0.55 ? 0.94 : 0.16
  const ts = Math.min(0.4, s * 0.55 + 0.12)
  return hslToHex(ch, ts, tl)
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let rp = 0
  let gp = 0
  let bp = 0
  if (h < 60) [rp, gp, bp] = [c, x, 0]
  else if (h < 120) [rp, gp, bp] = [x, c, 0]
  else if (h < 180) [rp, gp, bp] = [0, c, x]
  else if (h < 240) [rp, gp, bp] = [0, x, c]
  else if (h < 300) [rp, gp, bp] = [x, 0, c]
  else [rp, gp, bp] = [c, 0, x]
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${to(rp)}${to(gp)}${to(bp)}`
}

const target = areas[Math.floor(Math.random() * areas.length)]
// Shuffle eagerly so the gate is interactable the instant it mounts.
const choices = ref<Area[]>(shuffle(areas))
const phase = ref<'ask' | 'wrong' | 'ok'>('ask')
const shake = ref(false)
const visits = ref<number | null>(null)
const botsBounced = ref<number | null>(null)

onMounted(() => {
  void recordVisit().then((snap) => {
    visits.value = snap.visits
    botsBounced.value = snap.botsBounced
  })
})

async function pick(area: Area) {
  if (phase.value === 'ok') return
  // Must unlock inside this click — browsers block AudioContext until a gesture.
  await unlockAudio()
  if (area.id === target.id) {
    phase.value = 'ok'
    playToolClick()
    window.setTimeout(() => emit('passed'), 520)
    return
  }
  phase.value = 'wrong'
  shake.value = true
  void recordBotBounce().then((snap) => {
    botsBounced.value = snap.botsBounced
  })
  window.setTimeout(() => {
    shake.value = false
    phase.value = 'ask'
  }, 420)
}
</script>

<template>
  <div class="gate" role="dialog" aria-modal="true" aria-labelledby="gate-title">
    <div class="gate-inner" :class="{ shake }">
      <p class="eyebrow mono">Human check</p>
      <h2 id="gate-title">
        Deploy the
        <span class="tool-name" :style="{ color: target.accent }">{{ target.toolName }}</span>
      </h2>

      <!-- Never render choice tiles until the full set is ready to click. -->
      <div
        v-if="choices.length === areas.length"
        class="choices"
        role="group"
        aria-label="Tool choices"
      >
        <button
          v-for="area in choices"
          :key="area.id"
          type="button"
          class="choice"
          :class="{ ok: phase === 'ok' && area.id === target.id }"
          :style="{
            '--accent': area.accent,
            '--ink': complementaryInk(area.accent),
          }"
          :aria-label="`${area.toolName} — ${area.label}`"
          :disabled="phase === 'ok'"
          @click="pick(area)"
        >
          <span class="choice-tool mono">{{ area.toolName }}</span>
        </button>
      </div>

      <p class="status mono" aria-live="polite">
        <span v-if="phase === 'wrong'">Wrong tool — try another.</span>
        <span v-else-if="phase === 'ok'">Unlocked. Welcome in.</span>
        <span v-else>&nbsp;</span>
      </p>

      <p class="tally mono" aria-live="polite">
        <span>Visits {{ formatCount(visits) }}</span>
        <span class="sep" aria-hidden="true">·</span>
        <span>Bots bounced {{ formatCount(botsBounced) }}</span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.gate {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: clamp(20px, 4vw, 40px);
  background:
    radial-gradient(900px 640px at 50% 28%, #fdfefe 0%, transparent 60%),
    linear-gradient(180deg, #eef1f5 0%, #e4e8ee 100%);
}

.gate-inner {
  width: min(420px, 100%);
  text-align: center;
}

.gate-inner.shake {
  animation: shake 420ms ease;
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-7px);
  }
  40% {
    transform: translateX(7px);
  }
  60% {
    transform: translateX(-4px);
  }
  80% {
    transform: translateX(4px);
  }
}

.eyebrow {
  margin: 0 0 10px;
  font-size: 0.68rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}

h2 {
  margin: 0 0 28px;
  font-size: clamp(1.35rem, 3.5vw, 1.85rem);
  letter-spacing: -0.02em;
  font-weight: 700;
}

.tool-name {
  font-weight: 700;
}

.choices {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.choice {
  --accent: #4d48fc;
  --ink: #fff8f0;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  margin: 0;
  padding: 12px;
  border: 0;
  border-radius: 4px;
  background: var(--accent);
  color: var(--ink);
  font: inherit;
  cursor: pointer;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    filter 160ms ease;
}

.choice:hover,
.choice:focus-visible {
  transform: translateY(-2px);
  filter: brightness(1.06);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--accent) 35%, transparent);
  outline: none;
}

.choice.ok {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ink) 55%, transparent);
}

.choice:disabled {
  cursor: default;
  transform: none;
  filter: none;
}

.choice-tool {
  font-size: clamp(0.95rem, 3.2vw, 1.15rem);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.status {
  min-height: 1.2em;
  margin: 18px 0 8px;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: var(--ink-soft);
}

.tally {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  justify-content: center;
  margin: 18px 0 0;
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
.tally .sep {
  opacity: 0.55;
}

@media (prefers-reduced-motion: reduce) {
  .gate-inner.shake {
    animation: none;
  }
  .choice {
    transition: none;
  }
}
</style>
