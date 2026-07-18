<script setup lang="ts">
import type { ToolShape } from '../data/cv'

defineProps<{
  shape: ToolShape
}>()
</script>

<template>
  <!--
    Every silhouette is drawn pointing to the right, emerging from the shared
    pivot at (515, 300). The parent <g> applies the fold-out rotation around
    that same pivot, so these coordinates are intentionally absolute.
  -->
  <g class="tool-shape">
    <template v-if="shape === 'blade'">
      <path class="steel" d="M515,285 L700,280 Q790,289 812,300 Q790,311 700,320 L515,315 Z" />
      <path class="steel-spine" fill="none" d="M527,289 L700,285 Q782,292 800,300" />
    </template>

    <template v-else-if="shape === 'screwdriver'">
      <path
        class="steel"
        d="M515,294 L772,294 L772,287 L808,287 L808,313 L772,313 L772,306 L515,306 Z"
      />
    </template>

    <template v-else-if="shape === 'corkscrew'">
      <path
        class="steel-stroke"
        fill="none"
        d="M515,300 q25,-24 50,0 t50,0 t50,0 t50,0 t50,0"
      />
      <circle class="steel" cx="775" cy="300" r="7" />
    </template>

    <template v-else-if="shape === 'canopener'">
      <path
        class="steel"
        d="M515,295 L740,295 L740,286 L792,286 L792,301 L770,301 L770,313 L742,313 L742,305 L515,305 Z"
      />
    </template>

    <template v-else-if="shape === 'scissors'">
      <circle class="steel-stroke" cx="524" cy="291" r="12" fill="none" />
      <circle class="steel-stroke" cx="524" cy="309" r="12" fill="none" />
      <path class="steel" d="M534,289 L804,298 Q812,300 804,301 L560,301 Z" />
      <path class="steel" d="M534,311 L804,302 Q812,300 804,299 L560,299 Z" />
      <circle class="rivet" cx="560" cy="300" r="4" />
    </template>

    <template v-else-if="shape === 'magnifier'">
      <rect class="steel" x="515" y="296" width="232" height="8" rx="4" />
      <circle class="steel-stroke" cx="775" cy="300" r="34" fill="none" />
    </template>
  </g>
</template>
