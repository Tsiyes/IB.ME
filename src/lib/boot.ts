/** Boot-progress bridge between the inline HTML splash and the Vue/Three app. */

import { playAccordionClick } from '../three/sfx'

/**
 * Real load milestones (reported by the app). Visual order is different:
 * App → Engine → Loading → Shell — Shell plays last so the long warm-up wait
 * isn't spent staring at the first segment. The third slot is labeled Loading
 * because that is where we hold while Three.js parses.
 */
export type BootStage = 'app' | 'engine' | 'scene' | 'shell'

const ORDER: BootStage[] = ['app', 'engine', 'scene', 'shell']

/** Equal cadence between segment clicks (feels even regardless of real I/O). */
const CADENCE_MS = 450
/** Slightly slower while the scene is still warming — keeps early clicks from dumping. */
const WARMUP_CADENCE_MS = 520

type BootApi = {
  set: (stage: BootStage | number) => void
  done: () => void
  stage?: number
}

declare global {
  interface Window {
    __IB_BOOT?: BootApi
  }
}

/** True once the multitool scene has finished constructing (unlocks Shell). */
let sceneReady = false
/** Segments lit on the splash (1–4). Driven by the pacer, not raw I/O. */
let visual = 0
let tickTimer: ReturnType<typeof setTimeout> | null = null
const catchUpWaiters: Array<() => void> = []

function api(): BootApi | undefined {
  return typeof window !== 'undefined' ? window.__IB_BOOT : undefined
}

/** Adopt progress the inline HTML pacer may have already painted. */
function syncVisualFromDom() {
  const dom = api()?.stage ?? 0
  if (dom > visual) visual = dom
}

function toIndex(stage: BootStage | number): number {
  if (typeof stage === 'number') return Math.max(0, Math.min(4, stage | 0))
  return ORDER.indexOf(stage) + 1
}

function preferReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function flushWaiters() {
  if (visual < 4) return
  const waiters = catchUpWaiters.splice(0, catchUpWaiters.length)
  for (const w of waiters) w()
}

/** First three can pace ahead of I/O; Shell (4) waits for the real scene. */
function allowedMax(): number {
  return sceneReady ? 4 : 3
}

function clearTick() {
  if (tickTimer != null) {
    clearTimeout(tickTimer)
    tickTimer = null
  }
}

function lightNext() {
  tickTimer = null
  if (visual >= allowedMax()) {
    flushWaiters()
    return
  }
  visual += 1
  api()?.set(visual)
  playAccordionClick(visual - 1, 0)
  if (visual >= 4) {
    flushWaiters()
    return
  }
  scheduleTick()
}

function scheduleTick() {
  syncVisualFromDom()
  if (tickTimer != null) return
  if (visual >= allowedMax()) {
    flushWaiters()
    return
  }
  if (preferReducedMotion()) {
    while (visual < allowedMax()) {
      visual += 1
      api()?.set(visual)
    }
    flushWaiters()
    return
  }
  // Even cadence: first click almost immediately, then steady gaps.
  // Warm-up cadence paces App/Engine/Scene; Shell uses the standard gap after ready.
  const delay = visual === 0 ? 50 : sceneReady ? CADENCE_MS : WARMUP_CADENCE_MS
  tickTimer = setTimeout(lightNext, delay)
}

/**
 * Report a real load milestone / kick the pacer.
 * Visual order is App → Engine → Scene → Shell. Passing `'shell'` (or 4)
 * means the multitool is ready and the final Shell click may play.
 */
export function bootStage(stage: BootStage | number) {
  syncVisualFromDom()
  // Claim the splash so the inline HTML interval stops (JS owns pacing now).
  api()?.set(visual)
  const n = toIndex(stage)
  if (stage === 'shell' || n >= 4) sceneReady = true
  scheduleTick()
}

/** Resolves once all four visual segments (ending on Shell) have clicked through. */
export function whenBootCaughtUp(): Promise<void> {
  return new Promise((resolve) => {
    if (visual >= 4) {
      resolve()
      return
    }
    catchUpWaiters.push(resolve)
    scheduleTick()
  })
}

/** Resolves once the splash has painted at least `n` segments (or `timeoutMs`). */
export function whenBootVisualAtLeast(n: number, timeoutMs = 2000): Promise<void> {
  return new Promise((resolve) => {
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const tick = () => {
      syncVisualFromDom()
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
      if (visual >= n || (api()?.stage ?? 0) >= n || now - t0 >= timeoutMs) {
        resolve()
        return
      }
      setTimeout(tick, 40)
    }
    tick()
  })
}

/** Fade out and remove the inline splash. */
export function bootDone() {
  clearTick()
  api()?.done()
}

export function bootIndex(stage: BootStage): number {
  return ORDER.indexOf(stage) + 1
}

export function currentBootStage(): number {
  return api()?.stage ?? visual
}
