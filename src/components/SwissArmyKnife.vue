<script setup lang="ts">
import { computed, ref } from 'vue'
import { profile, tools } from '../data/cv'
import ToolShape from './ToolShape.vue'

// Which tools are currently folded open. Multiple can be open at once so the
// knife can be "fanned out" and fiddled with.
const openIds = ref<Set<string>>(new Set())
// The tool whose content is shown in the panel (last one activated).
const activeId = ref<string | null>(null)

const activeTool = computed(() => tools.find((t) => t.id === activeId.value) ?? null)

function isOpen(id: string) {
  return openIds.value.has(id)
}

// Rotation is applied via the CSS `transform` property (not the SVG transform
// attribute) so it animates smoothly. `transform-origin` is pinned to the pivot
// in view-box units via CSS below.
function styleFor(id: string, openAngle: number) {
  const angle = isOpen(id) ? openAngle : 0
  return { transform: `rotate(${angle}deg)` }
}

function toggle(id: string) {
  const next = new Set(openIds.value)
  if (next.has(id)) {
    next.delete(id)
    if (activeId.value === id) {
      // Fall back to another still-open tool, if any.
      activeId.value = next.size ? [...next][next.size - 1] : null
    }
  } else {
    next.add(id)
    activeId.value = id
  }
  openIds.value = next
}

function openAll() {
  openIds.value = new Set(tools.map((t) => t.id))
  activeId.value = tools[0].id
}

function foldAll() {
  openIds.value = new Set()
  activeId.value = null
}
</script>

<template>
  <div class="knife-wrap">
    <div class="stage">
      <svg
        class="knife"
        viewBox="0 0 900 600"
        role="group"
        aria-label="Swiss army knife CV. Fold out a tool to read that section."
      >
        <defs>
          <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#f4f7fb" />
            <stop offset="0.45" stop-color="#c3ccd8" />
            <stop offset="0.55" stop-color="#aeb8c6" />
            <stop offset="1" stop-color="#8b95a5" />
          </linearGradient>
          <linearGradient id="handle" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#ff5b52" />
            <stop offset="0.5" stop-color="#e01f18" />
            <stop offset="1" stop-color="#a50f0a" />
          </linearGradient>
          <radialGradient id="pin" cx="0.35" cy="0.35" r="0.8">
            <stop offset="0" stop-color="#f6f8fb" />
            <stop offset="1" stop-color="#7c8696" />
          </radialGradient>
          <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000" flood-opacity="0.35" />
          </filter>
        </defs>

        <!-- Tools live UNDER the handle so that, when closed (angle 0), they
             tuck inside it and are hidden; when open they swing out clear. -->
        <g class="tools">
          <g
            v-for="tool in tools"
            :key="tool.id"
            class="tool"
            :class="{ open: isOpen(tool.id), active: activeId === tool.id }"
            :style="styleFor(tool.id, tool.openAngle)"
            role="button"
            tabindex="0"
            :aria-pressed="isOpen(tool.id)"
            :aria-label="`${tool.label}: ${tool.tagline}`"
            @click="toggle(tool.id)"
            @keydown.enter.prevent="toggle(tool.id)"
            @keydown.space.prevent="toggle(tool.id)"
          >
            <title>{{ tool.label }} — {{ tool.tagline }}</title>
            <ToolShape :shape="tool.shape" />
          </g>
        </g>

        <!-- Red handle drawn on top of the tucked tools. -->
        <g filter="url(#soft)">
          <rect
            class="handle"
            x="490"
            y="232"
            width="345"
            height="136"
            rx="68"
            ry="68"
          />
          <rect class="handle-shine" x="505" y="246" width="315" height="26" rx="13" />
          <circle class="cross-bg" cx="662" cy="300" r="40" />
          <path
            class="cross"
            d="M654,278 h16 v14 h14 v16 h-14 v14 h-16 v-14 h-14 v-16 h14 z"
          />
        </g>

        <!-- Pivot pin sits on top of everything. -->
        <circle class="pin" cx="515" cy="300" r="15" fill="url(#pin)" />
      </svg>
    </div>

    <div class="panel" :style="activeTool ? { '--accent': activeTool.accent } : {}">
      <div class="controls">
        <button type="button" class="ghost" @click="openAll">Fan out all</button>
        <button type="button" class="ghost" @click="foldAll">Fold away</button>
      </div>

      <div class="tabs">
        <button
          v-for="tool in tools"
          :key="tool.id"
          type="button"
          class="tab"
          :class="{ on: isOpen(tool.id), active: activeId === tool.id }"
          @click="toggle(tool.id)"
        >
          {{ tool.label }}
        </button>
      </div>

      <Transition name="swap" mode="out-in">
        <div v-if="activeTool" :key="activeTool.id" class="content">
          <h2>{{ activeTool.label }}</h2>
          <p class="tagline">{{ activeTool.tagline }}</p>
          <div
            v-for="(item, i) in activeTool.items"
            :key="i"
            class="item"
          >
            <div class="item-head">
              <h3>{{ item.title }}</h3>
              <span v-if="item.period" class="period">{{ item.period }}</span>
            </div>
            <p v-if="item.subtitle" class="subtitle">{{ item.subtitle }}</p>
            <p v-if="item.detail" class="detail">{{ item.detail }}</p>
            <ul v-if="item.bullets" class="bullets">
              <li v-for="(b, bi) in item.bullets" :key="bi">{{ b }}</li>
            </ul>
          </div>
        </div>

        <div v-else class="content intro" key="intro">
          <h1>{{ profile.name }}</h1>
          <p class="role">{{ profile.title }}</p>
          <p class="loc">{{ profile.location }}</p>
          <p class="blurb">{{ profile.blurb }}</p>
          <p class="hint">Tip: click any tool on the knife (or a tab above) to fold it out.</p>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.knife-wrap {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(300px, 0.85fr);
  gap: clamp(16px, 3vw, 48px);
  align-items: center;
  width: min(1180px, 100%);
}

.stage {
  position: relative;
}

.knife {
  width: 100%;
  height: auto;
  overflow: visible;
}

.handle {
  fill: url(#handle);
  stroke: #7a0d09;
  stroke-width: 2;
}
.handle-shine {
  fill: rgba(255, 255, 255, 0.28);
}
.cross-bg {
  fill: #f4f7fb;
}
.cross {
  fill: #e01f18;
}
.pin {
  stroke: #6b7482;
  stroke-width: 1.5;
}

/* Tools */
.tool {
  cursor: pointer;
  transition: transform 620ms cubic-bezier(0.22, 1, 0.36, 1);
  transform-box: view-box;
  /* Pivot pin location in view-box units — all tools swing around this point. */
  transform-origin: 515px 300px;
}
.tool :deep(.steel) {
  fill: url(#steel);
  stroke: #6d7686;
  stroke-width: 1.5;
  stroke-linejoin: round;
}
.tool :deep(.steel-stroke) {
  stroke: url(#steel);
  stroke-width: 10;
  stroke-linecap: round;
}
.tool :deep(.steel-spine) {
  stroke: rgba(255, 255, 255, 0.65);
  stroke-width: 2;
}
.tool :deep(.rivet) {
  fill: #6d7686;
}
.tool:hover :deep(.steel),
.tool:focus-visible :deep(.steel) {
  fill: #eef2f7;
}
.tool:focus-visible {
  outline: none;
}
.tool.active :deep(.steel) {
  fill: #ffffff;
}
.tool.active :deep(.steel),
.tool.active :deep(.steel-stroke) {
  filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.85));
}

/* Panel */
.panel {
  --accent: #d7dde6;
  background: rgba(17, 22, 31, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: clamp(18px, 2.4vw, 30px);
  backdrop-filter: blur(8px);
  min-height: 360px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}
.ghost {
  font: inherit;
  font-size: 0.82rem;
  color: #cdd4de;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
  transition: background 160ms ease, transform 160ms ease;
}
.ghost:hover {
  background: rgba(255, 255, 255, 0.14);
  transform: translateY(-1px);
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}
.tab {
  font: inherit;
  font-size: 0.8rem;
  color: #aab2be;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.14);
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 160ms ease;
}
.tab.on {
  color: #10151d;
  background: var(--accent);
  border-color: transparent;
}
.tab.active {
  box-shadow: 0 0 0 2px rgba(224, 31, 24, 0.7);
}

.content h1 {
  font-size: clamp(2rem, 4vw, 2.8rem);
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}
.content h2 {
  font-size: 1.5rem;
  margin: 0 0 2px;
  color: #fff;
}
.tagline {
  color: var(--accent);
  margin: 0 0 18px;
  font-size: 0.9rem;
  letter-spacing: 0.02em;
}
.role {
  color: #e01f18;
  font-weight: 600;
  margin: 0 0 2px;
}
.loc {
  color: #8b93a0;
  margin: 0 0 16px;
  font-size: 0.85rem;
}
.blurb {
  color: #c6ccd5;
  line-height: 1.6;
}
.hint {
  margin-top: 20px;
  font-size: 0.82rem;
  color: #7f8896;
}

.item {
  padding: 12px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.item-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
}
.item h3 {
  margin: 0;
  font-size: 1.02rem;
}
.period {
  color: #8b93a0;
  font-size: 0.78rem;
  white-space: nowrap;
}
.subtitle {
  margin: 2px 0 6px;
  color: var(--accent);
  font-size: 0.9rem;
}
.detail {
  margin: 4px 0 0;
  color: #c6ccd5;
  line-height: 1.55;
  font-size: 0.92rem;
}
.bullets {
  margin: 8px 0 0;
  padding-left: 18px;
  color: #c6ccd5;
  line-height: 1.6;
  font-size: 0.92rem;
}

.swap-enter-active,
.swap-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
}
.swap-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.swap-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 900px) {
  .knife-wrap {
    grid-template-columns: 1fr;
  }
}
</style>
