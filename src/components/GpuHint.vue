<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  dismissGpuHint,
  isGpuHintDismissed,
  probeGpu,
  shouldShowGpuHint,
} from '../lib/gpu'

const visible = ref(false)
const renderer = ref<string | null>(null)

onMounted(() => {
  if (isGpuHintDismissed()) return
  const probe = probeGpu()
  if (!shouldShowGpuHint(probe)) return
  renderer.value = probe.renderer
  visible.value = true
})

function close() {
  dismissGpuHint()
  visible.value = false
}
</script>

<template>
  <Transition name="gpu">
    <aside v-if="visible" class="gpu-hint" role="status" aria-live="polite">
      <div class="gpu-copy">
        <p class="gpu-title mono">Enable GPU acceleration</p>
        <p class="gpu-body">
          This page is running on a software renderer
          <span v-if="renderer" class="gpu-renderer mono">({{ renderer }})</span>,
          which makes the 3D multi-tool much slower. Turn on hardware acceleration in
          your browser settings for a smoother experience.
        </p>
      </div>
      <button type="button" class="gpu-close mono" aria-label="Dismiss" @click="close">
        Dismiss
      </button>
    </aside>
  </Transition>
</template>

<style scoped>
.gpu-hint {
  position: fixed;
  left: 50%;
  bottom: clamp(16px, 3vh, 28px);
  transform: translateX(-50%);
  z-index: 50;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  width: min(520px, calc(100vw - 28px));
  padding: 14px 16px;
  border: 1px solid rgba(18, 24, 31, 0.12);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 12px 32px rgba(24, 33, 46, 0.14);
  backdrop-filter: blur(8px);
}

.gpu-title {
  margin: 0 0 4px;
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink);
}

.gpu-body {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--ink-soft);
}

.gpu-renderer {
  display: inline;
  font-size: 0.68rem;
  color: var(--muted);
  letter-spacing: 0;
  text-transform: none;
  word-break: break-word;
}

.gpu-close {
  flex: none;
  margin: 0;
  padding: 6px 10px;
  border: 1px solid rgba(18, 24, 31, 0.14);
  border-radius: 4px;
  background: #fff;
  font: inherit;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
  cursor: pointer;
}

.gpu-close:hover,
.gpu-close:focus-visible {
  color: var(--ink);
  outline: none;
  border-color: rgba(18, 24, 31, 0.28);
}

.gpu-enter-active,
.gpu-leave-active {
  transition: opacity 280ms ease, transform 280ms ease;
}
.gpu-enter-from,
.gpu-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}

@media (prefers-reduced-motion: reduce) {
  .gpu-enter-active,
  .gpu-leave-active {
    transition: none;
  }
}
</style>
