/** Detect software / major-performance-caveat WebGL so we can tip the user. */

export type GpuProbe = {
  /** True when WebGL is available at all. */
  supported: boolean
  /** True when the browser reports a major performance caveat (often software GL). */
  majorCaveat: boolean
  /** Heuristic: SwiftShader / llvmpipe / Basic Render Driver / etc. */
  softwareLikely: boolean
  vendor: string | null
  renderer: string | null
}

const SOFTWARE_RE =
  /swiftshader|llvmpipe|softpipe|software|microsoft basic render|apple software|cpu rast|mesa offscreen/i

let cached: GpuProbe | null = null

function readRenderer(gl: WebGLRenderingContext): { vendor: string | null; renderer: string | null } {
  const ext = gl.getExtension('WEBGL_debug_renderer_info') as {
    UNMASKED_VENDOR_WEBGL: number
    UNMASKED_RENDERER_WEBGL: number
  } | null
  if (!ext) return { vendor: null, renderer: null }
  return {
    vendor: String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || '') || null,
    renderer: String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '') || null,
  }
}

/** Probe once; cheap (off-DOM canvases). Safe to call from UI or Three setup. */
export function probeGpu(): GpuProbe {
  if (cached) return cached
  if (typeof document === 'undefined') {
    cached = {
      supported: false,
      majorCaveat: true,
      softwareLikely: true,
      vendor: null,
      renderer: null,
    }
    return cached
  }

  const soft = document.createElement('canvas')
  const gl =
    (soft.getContext('webgl') as WebGLRenderingContext | null) ||
    (soft.getContext('experimental-webgl') as WebGLRenderingContext | null)

  if (!gl) {
    cached = {
      supported: false,
      majorCaveat: true,
      softwareLikely: true,
      vendor: null,
      renderer: null,
    }
    return cached
  }

  const hw = document.createElement('canvas')
  const glHw = hw.getContext('webgl', { failIfMajorPerformanceCaveat: true })
  const { vendor, renderer } = readRenderer(gl)
  const softwareLikely = SOFTWARE_RE.test(renderer || '') || SOFTWARE_RE.test(vendor || '')

  cached = {
    supported: true,
    majorCaveat: !glHw,
    softwareLikely,
    vendor,
    renderer,
  }
  return cached
}

/** Recommend the GPU tip when WebGL is software-backed or flagged as slow. */
export function shouldShowGpuHint(probe: GpuProbe = probeGpu()): boolean {
  return probe.supported && (probe.softwareLikely || probe.majorCaveat)
}

const DISMISS_KEY = 'ibme-gpu-hint-dismissed'

export function isGpuHintDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissGpuHint() {
  try {
    sessionStorage.setItem(DISMISS_KEY, '1')
  } catch {
    /* ignore */
  }
}
