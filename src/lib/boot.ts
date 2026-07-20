/** Boot-progress bridge between the inline HTML splash and the Vue/Three app. */

export type BootStage = 'shell' | 'app' | 'engine' | 'scene'

const ORDER: BootStage[] = ['shell', 'app', 'engine', 'scene']

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

function api(): BootApi | undefined {
  return typeof window !== 'undefined' ? window.__IB_BOOT : undefined
}

/** Advance the 4-part boot ring (shell → app → engine → scene). */
export function bootStage(stage: BootStage | number) {
  api()?.set(stage)
}

/** Fade out and remove the inline splash once the gate (or app shell) is live. */
export function bootDone() {
  api()?.done()
}

export function bootIndex(stage: BootStage): number {
  return ORDER.indexOf(stage) + 1
}
