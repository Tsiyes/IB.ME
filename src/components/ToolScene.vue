<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createMultitool, preloadEngraveFonts, type Multitool } from '../three/multitool'

const props = defineProps<{
  forceArea?: number | null
  /** When true, kick off the construct-on-load intro (scene may already be warm). */
  runIntro?: boolean
}>()
const emit = defineEmits<{
  (e: 'area-change', id: string | null): void
  (e: 'expand-change', expanded: boolean): void
  (e: 'intro-complete'): void
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
let tool: Multitool | null = null
let observer: ResizeObserver | null = null
let disposed = false
let building = false
let idleHandle: number | null = null
let warmTimer: ReturnType<typeof setTimeout> | null = null

function clearWarmSchedule() {
  if (idleHandle !== null && typeof cancelIdleCallback === 'function') {
    cancelIdleCallback(idleHandle)
    idleHandle = null
  }
  if (warmTimer !== null) {
    clearTimeout(warmTimer)
    warmTimer = null
  }
}

function beginBuild() {
  if (disposed || building || tool || !canvas.value) return
  building = true
  clearWarmSchedule()
  const el = canvas.value
  void createMultitool(el, {
    onAreaChange: (id) => emit('area-change', id),
    onExpandChange: (expanded) => emit('expand-change', expanded),
    onIntroComplete: () => emit('intro-complete'),
  }).then((instance) => {
    if (disposed) {
      instance.dispose()
      return
    }
    tool = instance
    observer = new ResizeObserver(() => tool?.resize())
    if (el.parentElement) observer.observe(el.parentElement)
    if (props.runIntro) tool.playIntro()
  })
}

/** Warm during idle so the bot-check gate stays clickable on first paint. */
function scheduleWarm() {
  if (disposed || building || tool) return
  // Minimum delay: let the gate paint and accept the first pointer events.
  warmTimer = setTimeout(() => {
    warmTimer = null
    if (disposed || building || tool) return
    if (typeof requestIdleCallback === 'function') {
      idleHandle = requestIdleCallback(() => {
        idleHandle = null
        beginBuild()
      }, { timeout: 1800 })
    } else {
      beginBuild()
    }
  }, 280)
}

onMounted(() => {
  if (!canvas.value) return
  // Fonts only — cheap compared to CSG; still deferred a tick to not contend
  // with BotCheck's first interactive frame.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      void preloadEngraveFonts()
      scheduleWarm()
    })
  })
})

watch(
  () => props.forceArea,
  (v) => tool?.setActiveArea(v ?? null),
)

watch(
  () => props.runIntro,
  (v) => {
    if (!v) return
    // Unlock wins over idle warm — start immediately if still pending.
    if (!tool) beginBuild()
    else tool.playIntro()
  },
)

onBeforeUnmount(() => {
  disposed = true
  clearWarmSchedule()
  observer?.disconnect()
  tool?.dispose()
  tool = null
})
</script>

<template>
  <div class="scene">
    <canvas ref="canvas" class="scene-canvas" />
  </div>
</template>

<style scoped>
.scene {
  position: absolute;
  inset: 0;
}
.scene-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
