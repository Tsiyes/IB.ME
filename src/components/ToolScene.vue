<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { whenBootVisualAtLeast } from '../lib/boot'
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
  /** When false, keep the canvas invisible so it can't flash under the boot/gate. */
  reveal?: boolean
}>()
const emit = defineEmits<{
  (e: 'area-change', id: string | null): void
  (e: 'expand-change', expanded: boolean): void
  (e: 'intro-complete'): void
  /** 3 = Three.js chunk loaded, 4 = multitool scene ready. */
  (e: 'boot-progress', stage: number): void
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
let tool: Multitool | null = null
let observer: ResizeObserver | null = null
let cancelled = false

onMounted(() => {
  if (!canvas.value) return
  const el = canvas.value

  void (async () => {
    // Start the Three download immediately so it overlaps App/Engine clicks.
    const pending = import('../three/multitool')

    // Don't run the heavy sync construct until the ring has reached Loading —
    // otherwise parse/CSG freezes the ring on an early segment.
    await whenBootVisualAtLeast(3, 2000)
    if (cancelled) return

    const { createMultitool } = await pending
    if (cancelled) return
    emit('boot-progress', 3)

    // Yield so the Loading segment can paint before CSG blocks the thread.
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
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

    emit('boot-progress', 4)
    if (props.runIntro) tool.playIntro()
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
