// Lightweight procedural mechanical clicks via Web Audio — no asset files.
// Used for tool deploy and the stacked accordion plate-separation ticks.
//
// Browsers refuse to start AudioContext until a user gesture (autoplay policy).
// Create/resume only on unlock(); every play path no-ops until the context runs.

let ctx: AudioContext | null = null
let unlocked = false
let unlockPromise: Promise<boolean> | null = null

function getAudioCtor(): (typeof AudioContext) | null {
  if (typeof window === 'undefined') return null
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  )
}

/** True once a gesture has successfully started the shared AudioContext. */
export function isAudioUnlocked(): boolean {
  return unlocked && !!ctx && ctx.state === 'running'
}

/**
 * Create (if needed) and resume AudioContext. Must be called from a user gesture
 * (click / pointerdown / keydown). Returns whether audio is now runnable.
 */
export async function unlockAudio(): Promise<boolean> {
  if (isAudioUnlocked()) return true
  if (unlockPromise) return unlockPromise

  unlockPromise = (async () => {
    const AudioCtx = getAudioCtor()
    if (!AudioCtx) return false
    try {
      if (!ctx) ctx = new AudioCtx()
      if (ctx.state === 'suspended') await ctx.resume()
      unlocked = ctx.state === 'running'
      return unlocked
    } catch {
      unlocked = false
      return false
    } finally {
      unlockPromise = null
    }
  })()

  return unlockPromise
}

function ac(): AudioContext | null {
  if (!unlocked || !ctx || ctx.state !== 'running') return null
  return ctx
}

function noiseBuffer(acRef: AudioContext, seconds: number): AudioBuffer {
  const n = Math.max(1, Math.floor(acRef.sampleRate * seconds))
  const buf = acRef.createBuffer(1, n, acRef.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1
  return buf
}

function playBurst(opts: {
  when?: number
  freq: number
  gain: number
  noiseGain?: number
  dur?: number
  noiseDur?: number
  filterFreq?: number
}) {
  const audio = ac()
  if (!audio) return
  const t0 = audio.currentTime + (opts.when ?? 0)
  const dur = opts.dur ?? 0.045
  const noiseDur = opts.noiseDur ?? 0.028

  const osc = audio.createOscillator()
  osc.type = 'square'
  osc.frequency.setValueAtTime(opts.freq, t0)
  osc.frequency.exponentialRampToValueAtTime(opts.freq * 0.45, t0 + dur)

  const oscGain = audio.createGain()
  oscGain.gain.setValueAtTime(0.0001, t0)
  oscGain.gain.exponentialRampToValueAtTime(opts.gain, t0 + 0.004)
  oscGain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)

  const oscFilter = audio.createBiquadFilter()
  oscFilter.type = 'bandpass'
  oscFilter.frequency.value = opts.filterFreq ?? opts.freq * 1.2
  oscFilter.Q.value = 4

  osc.connect(oscFilter)
  oscFilter.connect(oscGain)
  oscGain.connect(audio.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.01)

  const src = audio.createBufferSource()
  src.buffer = noiseBuffer(audio, noiseDur)
  const noiseFilter = audio.createBiquadFilter()
  noiseFilter.type = 'highpass'
  noiseFilter.frequency.value = 1200
  const noiseGain = audio.createGain()
  noiseGain.gain.setValueAtTime(0.0001, t0)
  noiseGain.gain.exponentialRampToValueAtTime(opts.noiseGain ?? opts.gain * 0.55, t0 + 0.002)
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + noiseDur)
  src.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(audio.destination)
  src.start(t0)
  src.stop(t0 + noiseDur + 0.01)
}

/** Single satisfying mechanical click when a tool swings open. */
export function playToolClick() {
  playBurst({ freq: 2100, gain: 0.07, noiseGain: 0.045, dur: 0.05, filterFreq: 2400 })
  playBurst({ when: 0.012, freq: 900, gain: 0.035, noiseGain: 0.02, dur: 0.06, filterFreq: 1100 })
}

/** One tick in a stacked accordion sequence (pitch drops as plates spread). */
export function playAccordionClick(step: number, when = 0) {
  const freq = 1650 - step * 140
  playBurst({
    when,
    freq: Math.max(420, freq),
    gain: 0.028,
    noiseGain: 0.022,
    dur: 0.032,
    noiseDur: 0.02,
    filterFreq: Math.max(600, freq * 1.1),
  })
}
