<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Multitool } from '../three/multitool'

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

/**
 * Build the WebGL scene only after unlock.
 *
 * Idle warm-up (even delayed) still ran CSG / TTF work under the bot-check gate
 * and froze clicks. Dynamic-import keeps Three + three-bvh-csg out of the initial
 * parse path so the human check stays interactive.
 */
async function beginBuild() {
  if (disposed || building || tool || !canvas.value) return
  building = true
  const el = canvas.value
  try {
    const { createMultitool } = await import('../three/multitool')
    if (disposed) return
    const instance = await createMultitool(el, {
      onAreaChange: (id) => emit('area-change', id),
      onExpandChange: (expanded) => emit('expand-change', expanded),
      onIntroComplete: () => emit('intro-complete'),
    })
    if (disposed) {
      instance.dispose()
      return
    }
    tool = instance
    observer = new ResizeObserver(() => tool?.resize())
    if (el.parentElement) observer.observe(el.parentElement)
    if (props.runIntro) tool.playIntro()
  } catch (err) {
    building = false
    console.error('[ToolScene] failed to build multitool', err)
  }
}

onMounted(() => {
  if (!canvas.value) return
  // If the gate was already skipped/unlocked before mount, start immediately.
  if (props.runIntro) void beginBuild()
})

watch(
  () => props.forceArea,
  (v) => tool?.setActiveArea(v ?? null),
)

watch(
  () => props.runIntro,
  (v) => {
    if (!v) return
    if (!tool) void beginBuild()
    else tool.playIntro()
  },
)

onBeforeUnmount(() => {
  disposed = true
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
