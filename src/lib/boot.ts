/** Boot-progress bridge between the inline HTML splash and the Vue/Three app. */

import { playAccordionClick } from '../three/sfx'

export type BootStage = 'shell' | 'app' | 'engine' | 'scene'

const ORDER: BootStage[] = ['shell', 'app', 'engine', 'scene']

/** Minimum time between segment clicks so each tick reads clearly. */
const SEG_MS = 170

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

let target = 0
let shown = 0
let tickTimer: ReturnType<typeof setTimeout> | null = null
const catchUpWaiters: Array<() => void> = []

function api(): BootApi | undefined {
  return typeof window !== 'undefined' ? window.__IB_BOOT : undefined
}

function toIndex(stage: BootStage | number): number {
  if (typeof stage === 'number') return Math.max(0, Math.min(4, stage | 0))
  return ORDER.indexOf(stage) + 1
}

function preferReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function flushWaiters() {
  if (shown < target) return
  const waiters = catchUpWaiters.splice(0, catchUpWaiters.length)
  for (const w of waiters) w()
}

function tick() {
  tickTimer = null
  if (shown >= target) {
    flushWaiters()
    return
  }
  shown += 1
  api()?.set(shown)
  playAccordionClick(shown - 1, 0)
  scheduleTick()
}

function scheduleTick() {
  if (tickTimer != null) return
  if (shown >= target) {
    flushWaiters()
    return
  }
  // First segment snaps on immediately; later ones click in with a short gap.
  const delay = shown === 0 || preferReducedMotion() ? 0 : SEG_MS
  tickTimer = setTimeout(tick, delay)
}

/** Advance the 4-part boot ring (shell → app → engine → scene), clicking each new segment. */
export function bootStage(stage: BootStage | number) {
  target = Math.max(target, toIndex(stage))
  scheduleTick()
}

/** Resolves once the ring has clicked through every currently targeted segment. */
export function whenBootCaughtUp(): Promise<void> {
  return new Promise((resolve) => {
    if (shown >= target && target > 0) {
      resolve()
      return
    }
    catchUpWaiters.push(resolve)
    scheduleTick()
  })
}

/** Fade out and remove the inline splash. */
export function bootDone() {
  api()?.done()
}

export function bootIndex(stage: BootStage): number {
  return ORDER.indexOf(stage) + 1
}

export function currentBootStage(): number {
  return api()?.stage ?? shown
}
