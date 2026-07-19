<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createMultitool, type Multitool } from '../three/multitool'

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

onMounted(() => {
  if (!canvas.value) return
  tool = createMultitool(canvas.value, {
    onAreaChange: (id) => emit('area-change', id),
    onExpandChange: (expanded) => emit('expand-change', expanded),
    onIntroComplete: () => emit('intro-complete'),
  })

  observer = new ResizeObserver(() => tool?.resize())
  if (canvas.value.parentElement) observer.observe(canvas.value.parentElement)

  if (props.runIntro) tool.playIntro()
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

onBeforeUnmount(() => {
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
