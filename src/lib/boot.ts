/** Boot-progress bridge between the inline HTML splash and the Vue/Three app. */

import { playAccordionClick } from '../three/sfx'

/**
 * Visual order: App → Engine → Loading → Shell.
 * Shell always plays last and dwells before the splash dismisses.
 */
export type BootStage = 'app' | 'engine' | 'scene' | 'shell'

const ORDER: BootStage[] = ['app', 'engine', 'scene', 'shell']

/** Even cadence between segment clicks. */
const CADENCE_MS = 480
/** How long Shell stays lit before the splash may dismiss. */
const SHELL_DWELL_MS = 520

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
/** Segments lit on the splash (1–4). */
let visual = 0
let tickTimer: ReturnType<typeof setTimeout> | null = null
let claimed = false
const catchUpWaiters: Array<() => void> = []

function api(): BootApi | undefined {
  return typeof window !== 'undefined' ? window.__IB_BOOT : undefined
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
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

function claimSplash() {
  if (claimed) return
  claimed = true
  syncVisualFromDom()
  // Re-paint current stage so the inline interval stops without advancing.
  api()?.set(visual)
}

function lightSegment(n: number) {
  if (n <= visual) return
  visual = n
  api()?.set(visual)
  playAccordionClick(visual - 1, 0)
}

function lightNext() {
  tickTimer = null
  if (visual >= allowedMax()) {
    flushWaiters()
    return
  }
  lightSegment(visual + 1)
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
    while (visual < allowedMax()) lightSegment(visual + 1)
    flushWaiters()
    return
  }
  const delay = visual === 0 ? 60 : CADENCE_MS
  tickTimer = setTimeout(lightNext, delay)
}

/**
 * Report a real load milestone / kick the pacer.
 * Passing `'shell'` (or 4) means the multitool is ready — Shell may click.
 */
export function bootStage(stage: BootStage | number) {
  claimSplash()
  const n = toIndex(stage)
  if (stage === 'shell' || n >= 4) sceneReady = true
  scheduleTick()
}

/**
 * Ensure Shell is lit, click it if needed, and dwell so it reads before dismiss.
 * Call this when the multitool is ready — never skip straight to bootDone().
 */
export async function playShellAndDwell(): Promise<void> {
  claimSplash()
  sceneReady = true
  clearTick()
  syncVisualFromDom()

  // Catch up App/Engine/Loading quickly if we're behind, then Shell.
  if (preferReducedMotion()) {
    while (visual < 4) lightSegment(visual + 1)
    return
  }

  while (visual < 3) {
    lightSegment(visual + 1)
    await sleep(CADENCE_MS)
  }

  if (visual < 4) {
    lightSegment(4)
  }
  await sleep(SHELL_DWELL_MS)
  flushWaiters()
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
