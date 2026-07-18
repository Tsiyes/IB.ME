<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createMultitool, type Multitool } from '../three/multitool'

const props = defineProps<{ progress: number }>()

const canvas = ref<HTMLCanvasElement | null>(null)
let tool: Multitool | null = null
let observer: ResizeObserver | null = null

onMounted(() => {
  if (!canvas.value) return
  tool = createMultitool(canvas.value)
  tool.setProgress(props.progress)

  observer = new ResizeObserver(() => tool?.resize())
  if (canvas.value.parentElement) observer.observe(canvas.value.parentElement)
})

watch(
  () => props.progress,
  (p) => tool?.setProgress(p),
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
  position: fixed;
  inset: 0;
  z-index: 0;
}
.scene-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
