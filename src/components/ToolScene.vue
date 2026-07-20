<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Multitool } from '../three/multitool'

const props = defineProps<{
  forceArea?: number | null
  /** When true, kick off the construct-on-load intro (scene may already be warm). */
  runIntro?: boolean
  /**
   * Mobile: after intro, hold exploded and ignore hover/legend deploy so the
   * hero is a self-contained showcase.
   */
  showcaseMode?: boolean
  /** When false, keep the canvas invisible so it can't flash under the gate. */
  reveal?: boolean
}>()
const emit = defineEmits<{
  (e: 'area-change', id: string | null): void
  (e: 'expand-change', expanded: boolean): void
  (e: 'intro-complete'): void
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
let tool: Multitool | null = null
let observer: ResizeObserver | null = null
let cancelled = false

onMounted(() => {
  if (!canvas.value) return
  const el = canvas.value

  void (async () => {
    // Dynamic import keeps Three out of the first paint (human check + Vue shell).
    // createMultitool is a fast path — PMREM + CSG engraving are deferred.
    try {
      const { createMultitool } = await import('../three/multitool')
      if (cancelled) return

      tool = createMultitool(el, {
        showcaseMode: props.showcaseMode,
        onAreaChange: (id) => emit('area-change', id),
        onExpandChange: (expanded) => emit('expand-change', expanded),
        onIntroComplete: () => emit('intro-complete'),
      })
      if (cancelled) {
        tool.dispose()
        tool = null
        return
      }

      observer = new ResizeObserver(() => tool?.resize())
      if (el.parentElement) observer.observe(el.parentElement)

      if (props.runIntro) tool.playIntro()
    } catch (err) {
      // Document + human check must remain usable when WebGL is unavailable.
      console.warn('[ToolScene] multitool failed to start', err)
      emit('intro-complete')
    }
  })()
})

watch(
  () => props.forceArea,
  (v) => tool?.setActiveArea(v ?? null),
)

watch(
  () => props.runIntro,
  (v) => {
    if (v) tool?.playIntro()
  },
)

watch(
  () => props.showcaseMode,
  (v) => tool?.setShowcaseMode(!!v),
)

onBeforeUnmount(() => {
  cancelled = true
  observer?.disconnect()
  tool?.dispose()
  tool = null
})
</script>

<template>
  <div class="scene" :class="{ pending: !reveal }">
    <canvas ref="canvas" class="scene-canvas" />
  </div>
</template>

<style scoped>
.scene {
  position: absolute;
  inset: 0;
}
.scene.pending {
  opacity: 0;
  pointer-events: none;
}
.scene-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
