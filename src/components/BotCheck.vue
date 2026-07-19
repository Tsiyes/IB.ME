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

const target = areas[Math.floor(Math.random() * areas.length)]
const choices = ref<Area[]>([])
const phase = ref<'ask' | 'wrong' | 'ok'>('ask')
const shake = ref(false)
const visits = ref<number | null>(null)
const botsBounced = ref<number | null>(null)

onMounted(() => {
  choices.value = shuffle(areas)
  void recordVisit().then((snap) => {
    visits.value = snap.visits
    botsBounced.value = snap.botsBounced
  })
})

function pick(area: Area) {
  if (phase.value === 'ok') return
  unlockAudio()
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
      <h2 id="gate-title">Deploy the {{ target.toolName }}</h2>
      <p class="prompt">
        Quick tool ID — pick the implement for
        <strong :style="{ color: target.accent }">{{ target.label }}</strong>
        to open the CV.
      </p>

      <div class="choices" role="group" aria-label="Tool choices">
        <button
          v-for="area in choices"
          :key="area.id"
          type="button"
          class="choice"
          :class="{ ok: phase === 'ok' && area.id === target.id }"
          :style="{ '--accent': area.accent }"
          :disabled="phase === 'ok'"
          @click="pick(area)"
        >
          <span class="dot" />
          <span class="choice-tool mono">{{ area.toolName }}</span>
          <span class="choice-area">{{ area.label }}</span>
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
  width: min(520px, 100%);
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
  margin: 0 0 12px;
  font-size: clamp(1.35rem, 3.5vw, 1.85rem);
  letter-spacing: -0.02em;
  font-weight: 700;
}

.prompt {
  margin: 0 auto 28px;
  max-width: 38ch;
  color: var(--ink-soft);
  font-size: 0.92rem;
  line-height: 1.55;
}

.choices {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.choice {
  --accent: #4d48fc;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  margin: 0;
  padding: 14px 14px 12px;
  border: 1px solid rgba(18, 24, 31, 0.12);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease,
    border-color 160ms ease;
}

.choice:hover,
.choice:focus-visible {
  transform: translateY(-2px);
  background: #fff;
  border-color: color-mix(in srgb, var(--accent) 45%, rgba(18, 24, 31, 0.12));
  box-shadow: 0 8px 22px rgba(24, 33, 46, 0.12);
  outline: none;
}

.choice.ok {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 28%, transparent);
}

.choice:disabled {
  cursor: default;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 24%, transparent);
  margin-bottom: 4px;
}

.choice-tool {
  font-size: 0.84rem;
  font-weight: 500;
}

.choice-area {
  font-size: 0.72rem;
  color: var(--muted);
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
  margin: 22px 0 0;
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
.tally .sep {
  opacity: 0.55;
}

@media (max-width: 520px) {
  .choices {
    grid-template-columns: 1fr;
  }
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
