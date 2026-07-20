import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { Font, FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
// Pre-converted typeface JSON (subset of engraving glyphs) — same cheap path as
// Helvetiker. Runtime TTFLoader + CDN opentype.js was the bot-check freeze.
import robotoBold from '../assets/fonts/RobotoMono-Bold.typeface.json'
import robotoMedium from '../assets/fonts/RobotoMono-Medium.typeface.json'
import { areas, contact, profile, type ToolKind } from '../data/cv'
import { probeGpu } from '../lib/gpu'
import { runEngrave } from './engraveCsg'
import {
  deserializeGeometry,
  serializeGeometry,
  type SerializedGeometry,
} from './geometryTransfer'
import { playAccordionClick, playToolClick, unlockAudio } from './sfx'

interface EngraveResponse {
  ok: boolean
  geometry?: SerializedGeometry
  error?: string
}

// -----------------------------------------------------------------------------
// A realistic folding penknife multi-tool.
//
// The handle is a rounded "stadium" of two scales; between them sit four steel
// tools that pivot on the end pin. At rest the whole thing is exploded along the
// pin axis (Z) — like a CAD exploded assembly. Hovering the model collapses it
// together; hovering a zone/segment swings that area's tool open.
// -----------------------------------------------------------------------------

const HANDLE_L = 5.0
const HANDLE_H = 1.5
// Pins sit nearer the ends so the face lettering has clear clearance.
const PIVOT_X = HANDLE_L / 2 - 0.55 // end pin the tools rotate on
const PIN_R = 0.12
// Accordion explosion + proximity gating.
const GAP = 0.52 // base spacing between layers when exploded
const ACCORDION = 1.7 // extra gap near the pointer focus
const ACCORDION_SIGMA = 1.15
const PROXIMITY = 0.62 // how close (screen units) the pointer must be to explode

const TOOL_TANG = 0.28
const TOOL_HOLE = 0.1
const TOOL_DEPTH = 0.12
const SCALE_D = 0.14
const LINER_D = 0.06

// Per-tool deploy rig: Swiss-army variety — opposite pivot ends and distinct
// swing angles so the fan doesn't read as four identical arcs.
interface ToolRig {
  pivotX: number
  closed: number
  open: number
}

function toolRig(kind: ToolKind): ToolRig {
  switch (kind) {
    case 'driver':
      // Right pin → swings out and slightly up (bottle-opener / flat driver).
      return { pivotX: PIVOT_X, closed: Math.PI, open: 0.38 }
    case 'wrench':
      // Left pin → unfolds the other way so the fan reads from both ends.
      return { pivotX: -PIVOT_X, closed: 0, open: Math.PI * 0.78 }
    case 'ruler':
      // Right pin → long outboard swing, distinct from the scalpel.
      return { pivotX: PIVOT_X, closed: Math.PI, open: 0.62 }
    case 'scalpel':
      // Right pin → full extension, slightly past flat for a fine-blade fan.
      return { pivotX: PIVOT_X, closed: Math.PI, open: -0.28 }
  }
}

function ease(t: number) {
  return t * t * (3 - 2 * t)
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

// Squared-off rounded rectangle used for scales and liners (only a small corner
// radius, so the casing reads as a rectangular multi-tool rather than a stadium).
const CORNER = 0.26
function panelShape(l: number, h: number, inset = 0): THREE.Shape {
  const s = new THREE.Shape()
  const w = l - inset * 2
  const hh = h - inset * 2
  const r = Math.min(CORNER, hh / 2)
  const x = -w / 2
  const y = -hh / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + hh - r)
  s.quadraticCurveTo(x + w, y + hh, x + w - r, y + hh)
  s.lineTo(x + r, y + hh)
  s.quadraticCurveTo(x, y + hh, x, y + hh - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

// Bore clearance holes for the two rods through a plate outline.
function addPinHoles(shape: THREE.Shape) {
  for (const px of [PIVOT_X, -PIVOT_X]) {
    const h = new THREE.Path()
    h.absarc(px, 0, PIN_R + 0.03, 0, Math.PI * 2, true)
    shape.holes.push(h)
  }
}

// Each tool is a folding implement with a rounded tang + pivot hole at the
// origin and a recognizable working end pointing +X (local space).
function toolShape(kind: ToolKind): THREE.Shape {
  const s = new THREE.Shape()

  switch (kind) {
    case 'driver': {
      // Bottle-opener notch + flat screwdriver tip — classic SAK combo tool.
      s.moveTo(0, TOOL_TANG)
      s.lineTo(1.15, 0.17)
      s.lineTo(1.45, 0.17)
      s.lineTo(1.62, 0.4)
      s.lineTo(2.02, 0.4)
      s.lineTo(1.78, 0.12)
      s.lineTo(2.2, 0.11)
      s.lineTo(2.48, 0.15)
      s.lineTo(2.48, -0.15)
      s.lineTo(2.2, -0.11)
      s.lineTo(1.55, -0.2)
      s.lineTo(0, -TOOL_TANG)
      break
    }
    case 'wrench': {
      // Open-ended spanner: slim shaft into a C-jaw head.
      s.moveTo(0, TOOL_TANG)
      s.lineTo(0.45, 0.13)
      s.lineTo(1.85, 0.13)
      // Upper jaw
      s.lineTo(2.1, 0.36)
      s.lineTo(2.52, 0.4)
      s.lineTo(2.68, 0.22)
      s.lineTo(2.42, 0.07)
      // Mouth of the wrench
      s.lineTo(2.28, 0.07)
      s.lineTo(2.28, -0.07)
      s.lineTo(2.42, -0.07)
      // Lower jaw
      s.lineTo(2.68, -0.22)
      s.lineTo(2.52, -0.4)
      s.lineTo(2.1, -0.36)
      s.lineTo(1.85, -0.13)
      s.lineTo(0.45, -0.13)
      s.lineTo(0, -TOOL_TANG)
      break
    }
    case 'ruler': {
      // Straight scale with major/minor tick notches on the measuring edge.
      s.moveTo(0, TOOL_TANG)
      s.lineTo(0.4, 0.11)
      s.lineTo(2.55, 0.11)
      s.lineTo(2.72, 0)
      s.lineTo(2.55, -0.11)
      {
        const xStart = 2.48
        const xEnd = 0.48
        const ticks = 10
        const step = (xStart - xEnd) / ticks
        for (let i = 0; i < ticks; i++) {
          const x = xStart - i * step
          const depth = i % 3 === 0 ? -0.22 : -0.155
          const w = 0.035
          s.lineTo(x, -0.11)
          s.lineTo(x, depth)
          s.lineTo(x - w, depth)
          s.lineTo(x - w, -0.11)
        }
      }
      s.lineTo(0.4, -0.11)
      s.lineTo(0, -TOOL_TANG)
      break
    }
    case 'scalpel': {
      // Refined surgical blade: slim grip, tapered neck, fine point.
      s.moveTo(0, TOOL_TANG * 0.85)
      s.lineTo(0.55, 0.12)
      s.lineTo(1.05, 0.11)
      // Slight waist before the blade
      s.lineTo(1.35, 0.07)
      s.lineTo(1.7, 0.13)
      s.lineTo(2.25, 0.1)
      s.quadraticCurveTo(2.55, 0.06, 2.78, 0.01)
      // Fine cutting edge back along a shallow belly
      s.quadraticCurveTo(2.4, -0.04, 1.85, -0.05)
      s.lineTo(1.4, -0.04)
      s.lineTo(1.05, -0.1)
      s.lineTo(0.55, -0.12)
      s.lineTo(0, -TOOL_TANG * 0.85)
      break
    }
  }

  // Rounded tang (left semicircle) back to the start point.
  s.absarc(0, 0, TOOL_TANG, -Math.PI / 2, Math.PI / 2, true)

  const hole = new THREE.Path()
  hole.absarc(0, 0, TOOL_HOLE, 0, Math.PI * 2, true)
  s.holes.push(hole)

  if (kind === 'scalpel') {
    // Small grip fenestration on the handle
    const grip = new THREE.Path()
    grip.absellipse(0.78, 0, 0.14, 0.045, 0, Math.PI * 2, true, 0)
    s.holes.push(grip)
  }

  return s
}

interface ToolNode {
  layer: THREE.Group // holds liner + pivot; explodes along Z
  pivot: THREE.Group // rotates to deploy the tool
  toolMat: THREE.MeshPhysicalMaterial
  linerMat: THREE.MeshPhysicalMaterial
  closed: number
  open: number
  hover: number
}

interface ExplodeLayer {
  obj: THREE.Object3D
  baseZ: number
}

export interface Multitool {
  resize: () => void
  dispose: () => void
  setActiveArea: (index: number | null) => void
  playIntro: () => void
  /** Mobile showcase: hold exploded after intro; ignore hover/legend deploy. */
  setShowcaseMode: (on: boolean) => void
}

export interface MultitoolOptions {
  onAreaChange?: (id: string | null) => void
  /** Fires when the accordion crosses the expanded / collapsed threshold. */
  onExpandChange?: (expanded: boolean) => void
  /** Fires once the construct-on-load intro finishes (or is skipped). */
  onIntroComplete?: () => void
  /**
   * After intro, keep the tool exploded and ignore pointer/legend interaction.
   * Used on mobile so the hero is a self-contained showcase.
   */
  showcaseMode?: boolean
}

export function createMultitool(
  canvas: HTMLCanvasElement,
  options: MultitoolOptions = {},
): Multitool {
  const gpu = probeGpu()
  const softGl = gpu.softwareLikely || gpu.majorCaveat

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !softGl,
    alpha: true,
    powerPreference: softGl ? 'low-power' : 'high-performance',
  })
  // Software GL pays dearly for HiDPI + MSAA; keep the frame budget for motion.
  renderer.setPixelRatio(softGl ? 1 : Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  // Slightly lower exposure so raking keys can keep contrast on the frontal face.
  renderer.toneMappingExposure = 1.05

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  // Defer PMREM — sync fromScene() was a multi-hundred-ms hitch on first paint.
  // Canvas stays hidden until unlock, so metals can enrich before the user sees them.
  let envReady = false
  function bakeEnvironment() {
    if (!running || envReady) return
    scene.environment = pmrem.fromScene(new RoomEnvironment(), softGl ? 0.08 : 0.015).texture
    envReady = true
  }

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
  // Frame the tool in the upper-centre of the hero; look slightly below it so
  // the blurb + legend can sit in the lower half without overlapping.
  camera.position.set(0.55, 0.75, 12)
  camera.lookAt(0, 0.05, 0)

  // Rest view is full-frontal — flat ambient washed the face. Use a soft
  // sky/ground gradient plus raking keys so bevels and the engraved recess read.
  scene.add(new THREE.HemisphereLight(0xf4f7ff, 0x9aa3b0, 0.1))

  // Warm key from camera-right / high — main shape light, not head-on.
  const key = new THREE.DirectionalLight(0xfff4e8, 2.05)
  key.position.set(7.2, 5.8, 2.8)
  scene.add(key)

  // Cool fill from the opposite side — keeps shadows soft but present.
  const fill = new THREE.DirectionalLight(0xc9dcff, 0.5)
  fill.position.set(-6.8, 1.4, 4.2)
  scene.add(fill)

  // Skim nearly in the face plane — grazes polymer + lettering for micro-relief.
  const skim = new THREE.DirectionalLight(0xffffff, 0.9)
  skim.position.set(-1.8, 9.2, 1.1)
  scene.add(skim)

  // Rim from behind — edge separation when exploded; slight catch on pin heads.
  const rim = new THREE.DirectionalLight(0xe8f0ff, 1.25)
  rim.position.set(-4.2, 1.8, -7.5)
  scene.add(rim)

  // Soft bounce from below so underside faces aren't dead when the stack cants.
  const bounce = new THREE.DirectionalLight(0xfff1e6, 0.32)
  bounce.position.set(1.2, -6.5, 3.5)
  scene.add(bounce)

  const assembly = new THREE.Group()
  // Desktop rest scale; mobile showcase is 25% smaller so the exploded fan fits.
  const DESKTOP_SCALE = 0.65
  const MOBILE_SCALE = DESKTOP_SCALE * 0.75
  let showcaseMode = !!options.showcaseMode
  const restScale = () => (showcaseMode ? MOBILE_SCALE : DESKTOP_SCALE)
  assembly.scale.setScalar(restScale()) // intro may tween this
  assembly.position.y = 0.82 // slightly lower so extended tools don't clip the top
  scene.add(assembly)

  const disposables: Array<{ dispose: () => void }> = []
  const explodeLayers: ExplodeLayer[] = []
  const pickTargets: THREE.Object3D[] = []
  const tools: ToolNode[] = []

  // Polymer scales — colour left for the owner to tune; rods stay steel.
  // Clearcoat + env nudged so the new raking rig can shape the frontal face.
  const scaleMat = new THREE.MeshPhysicalMaterial({
    color: 0x4d48fc,
    metalness: 0.06,
    roughness: 0.48,
    clearcoat: 0.25,
    clearcoatRoughness: 0.28,
    sheen: 0.22,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color(0x4d48fc),
    envMapIntensity: 0.3,
  })
  const boltMat = new THREE.MeshPhysicalMaterial({
    color: 0x9aa2ad,
    metalness: 1,
    roughness: 0.2,
    envMapIntensity: 1.6,
  })
  disposables.push(scaleMat, boltMat)

  // ---- scales (front/back covers) ----
  function makeScale(z: number) {
    const shape = panelShape(HANDLE_L, HANDLE_H)
    addPinHoles(shape)
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: SCALE_D,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.06,
      bevelSegments: 5,
      curveSegments: 22,
      steps: 1,
    })
    geo.translate(0, 0, -SCALE_D / 2)
    disposables.push(geo)
    const mesh = new THREE.Mesh(geo, scaleMat)
    const group = new THREE.Group()
    group.position.z = z
    group.add(mesh)
    assembly.add(group)
    explodeLayers.push({ obj: group, baseZ: z })
    return { group, mesh }
  }

  const back = makeScale(-0.52)
  pickTargets.push(back.mesh)

  // ---- front cover: plain polymer first; CSG engrave deferred off the create path ----
  const inkMat = new THREE.MeshStandardMaterial({
    color: 0xfdcb93,
    metalness: 0.12,
    roughness: 0.78,
    envMapIntensity: 0.2,
  })
  disposables.push(inkMat)
  const RECESS = 0.07

  const frontShape = panelShape(HANDLE_L, HANDLE_H)
  addPinHoles(frontShape)
  const frontGeo = new THREE.ExtrudeGeometry(frontShape, {
    depth: SCALE_D,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.06,
    bevelSegments: 5,
    curveSegments: 22,
    steps: 1,
  })
  frontGeo.translate(0, 0, -SCALE_D / 2)
  frontGeo.computeBoundingBox()
  const surfaceZ = frontGeo.boundingBox!.max.z
  const cutterDepth = RECESS + 0.06

  // Instant plain cover so createMultitool can return before the CSG hit.
  let frontMesh: THREE.Mesh = new THREE.Mesh(frontGeo, scaleMat)
  const frontGroup = new THREE.Group()
  frontGroup.position.z = 0.52
  frontGroup.add(frontMesh)
  assembly.add(frontGroup)
  explodeLayers.push({ obj: frontGroup, baseZ: 0.52 })
  pickTargets.push(frontMesh)

  // Half-width of the hairline slice used to open multi-counter glyphs (see
  // buildCutterGeo). Validated watertight for the "B" at the top-line size;
  // thin enough to read as a stencil hairline.
  const BRIDGE_HALF_W = 0.004

  interface CutterBuild {
    cutter: THREE.BufferGeometry
    /** Thin boxes that slice enclosed counters open before the CDT cut. */
    bridges: THREE.BufferGeometry | null
  }

  function xyBounds(points: THREE.Vector2[]) {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const p of points) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
    return { minX, minY, maxX, maxY }
  }

  // Build the merged text "cutter" whose recess is booleaned out of the cover,
  // plus hairline "bridge" boxes that open enclosed counters of multi-counter
  // glyphs (only "B"/"8" here). Cheap (~15ms); the booleans run off-thread.
  function buildCutterGeo(): CutterBuild | null {
    const loader = new FontLoader()
    const boldFont = loader.parse(robotoBold as unknown as Parameters<FontLoader['parse']>[0])
    const mediumFont = loader.parse(robotoMedium as unknown as Parameters<FontLoader['parse']>[0])
    const boldGlyphs = (boldFont.data as { glyphs: Record<string, unknown> }).glyphs
    const mediumGlyphs = (mediumFont.data as { glyphs: Record<string, unknown> }).glyphs
    const sanitize = (text: string, glyphs: Record<string, unknown>) =>
      Array.from(text)
        .map((c) => (c === ' ' || glyphs[c] ? c : glyphs[c.toUpperCase()] ? c.toUpperCase() : '-'))
        .join('')

    const lines: Array<{ text: string; size: number; y: number; font: Font }> = [
      { text: sanitize(profile.name, boldGlyphs), size: 0.26, y: 0.12, font: boldFont },
      { text: sanitize(profile.creds, boldGlyphs), size: 0.092, y: -0.14, font: boldFont },
      {
        text: sanitize('IMPLEMENTATION / PRODUCT / QA / HEALTHCARE', mediumGlyphs),
        size: 0.092,
        y: -0.32,
        font: mediumFont,
      },
      {
        text: sanitize(contact.email, mediumGlyphs),
        size: 0.07,
        y: -0.46,
        font: mediumFont,
      },
    ].filter((line) => line.text.length > 0)

    const z = surfaceZ - RECESS
    const cutterGeos: THREE.BufferGeometry[] = []
    const bridgeGeos: THREE.BufferGeometry[] = []

    for (const line of lines) {
      const shapes = line.font.generateShapes(line.text, line.size)
      // ExtrudeGeometry of the glyph shapes is exactly what TextGeometry builds;
      // we do it directly so we can also read each glyph's counters (holes).
      const geo = new THREE.ExtrudeGeometry(shapes, {
        depth: cutterDepth,
        curveSegments: 2,
        bevelEnabled: false,
      })
      geo.computeBoundingBox()
      const bb = geo.boundingBox!
      const cx = (bb.max.x + bb.min.x) / 2
      geo.translate(-cx, line.y, z)
      cutterGeos.push(geo)

      // Only multi-counter glyphs (B/8) trip CDT. Slice a single full-height
      // hairline down the glyph at the mean counter x: it exits both the top and
      // bottom into cutter-free space, so every counter connects to the surface
      // across a single stroke (robust at any glyph size).
      for (const shape of shapes) {
        if (!shape.holes || shape.holes.length < 2) continue
        const outer = xyBounds(shape.getPoints(24))
        let sx = 0
        for (const hole of shape.holes) {
          const hb = xyBounds(hole.getPoints(24))
          sx += (hb.minX + hb.maxX) / 2
        }
        const hx = sx / shape.holes.length
        const margin = line.size * 0.12
        const yBot = outer.minY - margin
        const yTop = outer.maxY + margin
        const box = new THREE.BoxGeometry(BRIDGE_HALF_W * 2, yTop - yBot, cutterDepth + 0.2)
        box.translate(hx, (yTop + yBot) / 2, cutterDepth / 2)
        box.translate(-cx, line.y, z)
        bridgeGeos.push(box)
      }
    }

    // Vertically centre the block; keep the bridges locked to the cutter.
    let minY = Infinity
    let maxY = -Infinity
    for (const geo of cutterGeos) {
      geo.computeBoundingBox()
      minY = Math.min(minY, geo.boundingBox!.min.y)
      maxY = Math.max(maxY, geo.boundingBox!.max.y)
    }
    const cy = (minY + maxY) / 2
    for (const geo of cutterGeos) geo.translate(0, -cy, 0)
    for (const geo of bridgeGeos) geo.translate(0, -cy, 0)

    const cutter = mergeGeometries(cutterGeos, false)
    cutterGeos.forEach((g) => g.dispose())
    if (!cutter) return null

    let bridges: THREE.BufferGeometry | null = null
    if (bridgeGeos.length) {
      bridges = mergeGeometries(bridgeGeos, false)
      bridgeGeos.forEach((g) => g.dispose())
    }
    return { cutter, bridges }
  }

  // Swap the plain cover for the engraved result (from the worker or inline CSG).
  function applyEngraveResult(resultGeo: THREE.BufferGeometry) {
    if (!running) {
      resultGeo.dispose()
      return
    }
    const mesh = new THREE.Mesh(resultGeo, [scaleMat, inkMat])
    const pickIdx = pickTargets.indexOf(frontMesh)
    frontGroup.remove(frontMesh)
    // frontGeo (plain cover) is still held for disposal on teardown.
    frontMesh = mesh
    frontGroup.add(frontMesh)
    if (pickIdx >= 0) pickTargets[pickIdx] = frontMesh
    else pickTargets.push(frontMesh)
    disposables.push(frontMesh.geometry)
  }

  // Inline boolean — fallback for when Web Workers are unavailable / fail.
  function engraveInline(build: CutterBuild) {
    try {
      applyEngraveResult(runEngrave(frontGeo.clone(), build.cutter, build.bridges))
    } catch (err) {
      console.warn('[multitool] engraving CSG failed, keeping plain cover', err)
    } finally {
      build.cutter.dispose()
      build.bridges?.dispose()
    }
  }

  let engraved = false
  let engraveWorker: Worker | null = null
  function engraveFront() {
    if (!running || engraved) return
    engraved = true

    const build = buildCutterGeo()
    if (!build) return

    // No worker support → inline (blocks, but rare).
    if (typeof Worker === 'undefined') {
      engraveInline(build)
      return
    }

    // Preferred path: run the CSG boolean(s) in a worker so the human-check gate
    // and the intro never freeze. Falls back to inline on any failure.
    try {
      const worker = new Worker(new URL('./engrave.worker.ts', import.meta.url), {
        type: 'module',
      })
      engraveWorker = worker
      const front = serializeGeometry(frontGeo.clone())
      const cutter = serializeGeometry(build.cutter)
      const bridges = build.bridges ? serializeGeometry(build.bridges) : null
      build.cutter.dispose()
      build.bridges?.dispose()

      const clear = () => {
        worker.terminate()
        if (engraveWorker === worker) engraveWorker = null
      }
      worker.onmessage = (e: MessageEvent<EngraveResponse>) => {
        clear()
        const msg = e.data
        if (msg?.ok && msg.geometry) applyEngraveResult(deserializeGeometry(msg.geometry))
        else console.warn('[multitool] engrave worker failed, keeping plain cover', msg?.error)
      }
      worker.onerror = (err) => {
        console.warn('[multitool] engrave worker error, running inline', err)
        clear()
        const retry = buildCutterGeo()
        if (retry) engraveInline(retry)
      }
      worker.postMessage(
        { front: front.data, cutter: cutter.data, bridges: bridges ? bridges.data : null },
        [...front.transfer, ...cutter.transfer, ...(bridges ? bridges.transfer : [])],
      )
    } catch (err) {
      console.warn('[multitool] engrave worker unavailable, running inline', err)
      // build may be disposed mid-setup; rebuild for the inline fallback.
      const retry = buildCutterGeo()
      if (retry) engraveInline(retry)
    }
  }

  // ---- pivot + end pins (rods) ----
  // Position via mesh.position (not baked geo translate) so the intro can
  // fly them in from off-screen.
  const pins: THREE.Mesh[] = []
  const pinRestX = [PIVOT_X, -PIVOT_X]
  function makePin(x: number) {
    const geo = new THREE.CylinderGeometry(PIN_R, PIN_R, 1.2, 24)
    geo.rotateX(Math.PI / 2)
    disposables.push(geo)
    const mesh = new THREE.Mesh(geo, boltMat)
    mesh.position.set(x, 0, 0)
    pins.push(mesh)
    assembly.add(mesh)
  }
  makePin(PIVOT_X)
  makePin(-PIVOT_X)

  // ---- tools + colored liners ----
  const toolMatParams = {
    color: new THREE.Color(0xe8eef4),
    metalness: 1.0,
    roughness: 0.12,
    clearcoat: 0.7,
    clearcoatRoughness: 0.1,
    envMapIntensity: 1.7,
  }

  const baseZs = [0.3, 0.12, -0.12, -0.3]

  areas.forEach((area, i) => {
    const accent = new THREE.Color(area.accent)
    const layer = new THREE.Group()
    layer.position.z = baseZs[i]
    assembly.add(layer)
    explodeLayers.push({ obj: layer, baseZ: baseZs[i] })

    // colored liner — a full handle-shaped plate whose coloured rim is visible
    // between the scales (canted view) and which is the hover target that deploys
    // this area's tool.
    const linerShape = panelShape(HANDLE_L, HANDLE_H, 0.02)
    addPinHoles(linerShape)
    const linerGeo = new THREE.ExtrudeGeometry(linerShape, {
      depth: LINER_D,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
      curveSegments: 20,
      steps: 1,
    })
    linerGeo.translate(0, 0, -LINER_D / 2 - 0.05)
    disposables.push(linerGeo)
    const linerMat = new THREE.MeshPhysicalMaterial({
      color: accent,
      metalness: 0.5,
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.15,
      emissive: accent,
      emissiveIntensity: 0.06,
      envMapIntensity: 1.1,
    })
    disposables.push(linerMat)
    const linerMesh = new THREE.Mesh(linerGeo, linerMat)
    linerMesh.userData.areaIndex = i
    layer.add(linerMesh)
    pickTargets.push(linerMesh)

    // Steel tool on a per-kind pivot / swing path.
    const rig = toolRig(area.tool)
    const toolGeo = new THREE.ExtrudeGeometry(toolShape(area.tool), {
      depth: TOOL_DEPTH,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 3,
      curveSegments: 14,
      steps: 1,
    })
    toolGeo.translate(0, 0, -TOOL_DEPTH / 2)
    disposables.push(toolGeo)
    const toolMat = new THREE.MeshPhysicalMaterial(toolMatParams)
    disposables.push(toolMat)
    const toolMesh = new THREE.Mesh(toolGeo, toolMat)
    toolMesh.userData.areaIndex = i
    pickTargets.push(toolMesh)

    const pivot = new THREE.Group()
    pivot.position.set(rig.pivotX, 0, 0)
    pivot.rotation.z = rig.closed
    pivot.add(toolMesh)
    layer.add(pivot)

    tools.push({
      layer,
      pivot,
      toolMat,
      linerMat,
      closed: rig.closed,
      open: rig.open,
      hover: 0,
    })
  })

  // Layers ordered back→front along the pin axis. Ascending baseZ keeps the
  // engraved front cover frontmost when exploded (previously it inverted, so the
  // engraving ended up on the back plate).
  const ordered = [...explodeLayers].sort((a, b) => a.baseZ - b.baseZ)
  const M = ordered.length
  const center = (M - 1) / 2

  // ---- construct-on-load intro (parts fly in from off-screen) ----
  const INTRO_MS = 1750
  const INTRO_START_RATIO = 0.42 / DESKTOP_SCALE // keep intro grow-in proportional to rest scale
  type IntroActor = {
    delay: number
    span: number
    apply: (u: number) => void
    docked: boolean
  }
  const introActors: IntroActor[] = []

  ordered.forEach((layer, i) => {
    const side = i % 2 === 0 ? -1 : 1
    const fromX = side * (8.5 + (i % 3) * 0.6)
    const fromY = 3.2 - i * 0.4
    const fromZ = layer.baseZ + side * 4.2
    const fromRotY = side * 1.15
    const fromRotX = 0.55 + (i % 2) * 0.15
    introActors.push({
      delay: 0.04 + i * 0.065,
      span: 0.42,
      docked: false,
      apply: (u) => {
        const e = ease(u)
        layer.obj.position.set(lerp(fromX, 0, e), lerp(fromY, 0, e), lerp(fromZ, layer.baseZ, e))
        layer.obj.rotation.x = lerp(fromRotX, 0, e)
        layer.obj.rotation.y = lerp(fromRotY, 0, e)
        layer.obj.rotation.z = lerp(side * 0.25, 0, e)
      },
    })
  })

  pins.forEach((pin, i) => {
    const restX = pinRestX[i]
    const fromX = i === 0 ? 12 : -12
    introActors.push({
      delay: 0.38 + i * 0.06,
      span: 0.36,
      docked: false,
      apply: (u) => {
        const e = ease(u)
        pin.position.set(lerp(fromX, restX, e), lerp(3.4, 0, e), lerp(i === 0 ? 2 : -2, 0, e))
        pin.rotation.y = lerp(i === 0 ? 1.2 : -1.2, 0, e)
      },
    })
  })

  tools.forEach((tool, i) => {
    introActors.push({
      delay: 0.1 + i * 0.07,
      span: 0.48,
      docked: false,
      apply: (u) => {
        // Showcase open while flying, then fold shut as the layer docks.
        tool.pivot.rotation.z = lerp(tool.open, tool.closed, ease(u))
        tool.hover = 0
        tool.linerMat.emissiveIntensity = 0.06 + (1 - ease(u)) * 0.35
      },
    })
  })

  let introT = 0
  let introPlaying = false
  let introDone = false
  let introStartedAt = 0
  let introCompleteReported = false
  /** Once intro finishes in showcase mode, drive explode toward fully open. */
  let showcaseExplode = false

  function preferReducedMotion() {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  function finishIntro() {
    introT = 1
    introPlaying = false
    introDone = true
    for (const actor of introActors) {
      actor.apply(1)
      actor.docked = true
    }
    for (const layer of ordered) {
      layer.obj.position.set(0, 0, layer.baseZ)
      layer.obj.rotation.set(0, 0, 0)
    }
    pins.forEach((pin, i) => {
      pin.position.set(pinRestX[i], 0, 0)
      pin.rotation.set(0, 0, 0)
      pin.scale.z = 1
    })
    for (const tool of tools) {
      tool.pivot.rotation.z = tool.closed
      tool.hover = 0
      tool.linerMat.emissiveIntensity = 0.06
    }
    assembly.scale.setScalar(restScale())
    if (showcaseMode) showcaseExplode = true
    if (!introCompleteReported) {
      introCompleteReported = true
      playToolClick()
      options.onIntroComplete?.()
    }
  }

  function playIntro() {
    if (introDone || introPlaying) return
    // Audio must already be unlocked by the human-check click — browsers will
    // not start AudioContext from this deferred path.
    if (preferReducedMotion()) {
      finishIntro()
      return
    }
    introPlaying = true
    introStartedAt = performance.now()
  }

  function applyIntro(now: number) {
    if (!introPlaying && !introDone) {
      // Parked off-screen while the bot check / warm-up runs.
      introT = 0
    } else if (introPlaying) {
      introT = Math.min(1, (now - introStartedAt) / INTRO_MS)
    }

    const t = introT
    // Whole assembly settles from a dramatic cant into frontal rest.
    const settle = ease(Math.min(1, t * 1.15))
    const target = restScale()
    assembly.scale.setScalar(lerp(target * INTRO_START_RATIO, target, settle))
    assembly.rotation.y = lerp(1.25, 0, settle)
    assembly.rotation.x = lerp(0.85, 0, settle)
    assembly.rotation.z = lerp(-0.15, 0, settle)

    for (let i = 0; i < introActors.length; i++) {
      const actor = introActors[i]
      const local = (t - actor.delay) / actor.span
      const u = THREE.MathUtils.clamp(local, 0, 1)
      actor.apply(u)
      if (!actor.docked && u >= 0.92) {
        actor.docked = true
        playAccordionClick(i % 6, 0)
      }
    }

    if (introPlaying && t >= 1) finishIntro()
  }

  // ---- interaction ----
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const parallax = new THREE.Vector2()
  const parallaxTarget = new THREE.Vector2()
  let stageHover = false
  // Desired pick vs committed deploy — a short dwell + cooldown stops tools
  // thrashing open/closed as the pointer grazes neighbouring liners.
  let desiredIndex = -1
  let pendingIndex = -1
  let committedIndex = -1
  let commitAt = 0
  let lastDeployAt = -Infinity
  let externalIndex: number | null = null
  let reported: string | null = null
  let explodeScalar = 0
  let lastAccordionStep = -1
  let armedToolClick = false
  let reportedExpanded = false

  const HOVER_DELAY_MS = 70 // was 140; ~25% snappier dwell before commit
  const DEPLOY_COOLDOWN_MS = 240 // was 320; matching 25% reduction
  const ACCORDION_CLICK_STEPS = Math.max(4, M - 1)
  const EXPAND_ON = 0.22
  const EXPAND_OFF = 0.1

  const activeIndex = () => (externalIndex !== null ? externalIndex : committedIndex)

  function report() {
    const idx = activeIndex()
    const id = idx >= 0 ? areas[idx].id : null
    if (id !== reported) {
      reported = id
      options.onAreaChange?.(id)
    }
  }

  function requestIndex(next: number) {
    desiredIndex = next
  }

  function onMove(e: PointerEvent) {
    if (showcaseMode) return
    stageHover = true
    const rect = canvas.getBoundingClientRect()
    pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    )
    parallaxTarget.copy(pointer)
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects(pickTargets, false)
    // Only coloured liners / tools carry an areaIndex; hitting a bare scale
    // explodes the tool but deploys nothing.
    const ai = hits.length ? hits[0].object.userData.areaIndex : undefined
    requestIndex(typeof ai === 'number' ? ai : -1)
  }
  function onEnter() {
    if (showcaseMode) return
    stageHover = true
  }
  function onLeave() {
    if (showcaseMode) return
    stageHover = false
    requestIndex(-1)
    parallaxTarget.set(0, 0)
  }
  function onPointerDown() {
    // pointerdown is a real user gesture; pointermove is not.
    void unlockAudio()
  }

  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerenter', onEnter)
  canvas.addEventListener('pointerleave', onLeave)
  canvas.addEventListener('pointerdown', onPointerDown)

  const start = performance.now()
  let running = true

  const tmp = new THREE.Vector3()

  function settleCommitted(now: number) {
    if (externalIndex !== null) {
      // Legend / forced area bypasses dwell — intentional selection.
      if (committedIndex !== externalIndex) {
        committedIndex = externalIndex
        pendingIndex = externalIndex
        if (externalIndex >= 0) {
          lastDeployAt = now
          armedToolClick = true
        }
        report()
      }
      return
    }

    if (desiredIndex === committedIndex) {
      pendingIndex = desiredIndex
      return
    }

    if (desiredIndex !== pendingIndex) {
      pendingIndex = desiredIndex
      commitAt = now + HOVER_DELAY_MS
      return
    }

    if (now < commitAt) return

    // Opening (or switching to) a tool is rate-limited; closing is free after dwell.
    if (desiredIndex >= 0 && now - lastDeployAt < DEPLOY_COOLDOWN_MS) {
      commitAt = lastDeployAt + DEPLOY_COOLDOWN_MS
      return
    }

    if (desiredIndex >= 0) {
      lastDeployAt = now
      armedToolClick = true
    }
    committedIndex = desiredIndex
    report()
  }

  function applyFrame(t: number) {
    const now = performance.now()

    // Construct intro (or parked off-screen warm-up) runs before interaction.
    if (!introDone) {
      applyIntro(now)
      assembly.updateMatrixWorld(true)
      return
    }

    settleCommitted(now)
    const idx = showcaseMode ? -1 : activeIndex()

    parallax.lerp(parallaxTarget, 0.06)

    // Proximity probe uses last frame's assembly pose (updated at end of prior tick).
    tmp.set(0, 0, 0).applyMatrix4(assembly.matrixWorld).project(camera)
    const cdx = (pointer.x - tmp.x) * camera.aspect
    const cdy = pointer.y - tmp.y
    const near = Math.sqrt(cdx * cdx + cdy * cdy) < PROXIMITY
    // Showcase (mobile): hold exploded after intro — no hover journey.
    const wantExplode = showcaseMode
      ? showcaseExplode
      : (stageHover && near) || externalIndex !== null
    explodeScalar += ((wantExplode ? 1 : 0) - explodeScalar) * 0.06
    const a = ease(explodeScalar)

    // Hysteresis so the ABOUT ME panel doesn't flicker at the proximity edge.
    const nextExpanded = reportedExpanded ? a > EXPAND_OFF : a > EXPAND_ON
    if (nextExpanded !== reportedExpanded) {
      reportedExpanded = nextExpanded
      options.onExpandChange?.(reportedExpanded)
    }

    // Full-frontal at rest; cants open with the explode so coloured liners
    // present toward the camera. Light cursor parallax is always allowed
    // (showcase keeps a gentle idle sway instead of pointer parallax).
    const px = showcaseMode ? 0.08 * Math.sin(t * 0.35) : parallax.x * 0.14
    const py = showcaseMode ? 0.04 * Math.sin(t * 0.28) : parallax.y * 0.1
    assembly.rotation.y = 0.92 * a + px + 0.03 * a * Math.sin(t * 0.3)
    assembly.rotation.x = 0.48 * a - py + 0.015 * a * Math.sin(t * 0.35)
    assembly.rotation.z = 0
    assembly.updateMatrixWorld(true)

    // Stacked mechanical ticks as the accordion opens (and reset when closed).
    if (!wantExplode && a < 0.04) {
      lastAccordionStep = -1
    } else if (wantExplode) {
      const step = Math.min(ACCORDION_CLICK_STEPS - 1, Math.floor(a * ACCORDION_CLICK_STEPS))
      if (step > lastAccordionStep) {
        for (let s = lastAccordionStep + 1; s <= step; s++) {
          playAccordionClick(s, (s - lastAccordionStep - 1) * 0.028)
        }
        lastAccordionStep = step
      }
    }

    // Focus: which layer is nearest the pointer (drives the accordion).
    // Showcase uses a fixed mid focus so the fan reads evenly.
    let focus = center
    if (!showcaseMode) {
      let fw = 0
      let fwsum = 0
      for (let o = 0; o < M; o++) {
        ordered[o].obj.getWorldPosition(tmp).project(camera)
        const dx = (pointer.x - tmp.x) * camera.aspect
        const dy = pointer.y - tmp.y
        const w = 1 / (dx * dx + dy * dy + 0.05)
        fw += o * w
        fwsum += w
      }
      focus = fwsum > 0 ? fw / fwsum : center
    }

    // Accordion positions: cumulative gaps, larger near the focus.
    let pos = 0
    const positions: number[] = [0]
    for (let k = 1; k < M; k++) {
      const d = k - 0.5 - focus
      const bump = ACCORDION * Math.exp(-(d * d) / (2 * ACCORDION_SIGMA * ACCORDION_SIGMA))
      pos += GAP * (1 + bump)
      positions.push(pos)
    }
    const mean = positions.reduce((s, v) => s + v, 0) / M
    for (let o = 0; o < M; o++) {
      const target = positions[o] - mean
      ordered[o].obj.position.set(0, 0, lerp(ordered[o].baseZ, target, a))
      ordered[o].obj.rotation.set(0, 0, 0)
    }

    // Rods lengthen as the plates spread so they keep threading through the holes.
    for (let p = 0; p < pins.length; p++) {
      pins[p].position.set(pinRestX[p], 0, 0)
      pins[p].rotation.set(0, 0, 0)
      pins[p].scale.z = 1 + a * 2.6
    }

    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i]
      const target = idx === i ? 1 : 0
      const prev = tool.hover
      // Slightly slower deploy eases the motion once dwell commits.
      tool.hover += (target - tool.hover) * 0.1
      const h = ease(tool.hover)
      const deploy = h * a // deploy the tool once the casing has opened up

      // Click when a committed tool actually starts swinging open.
      if (armedToolClick && i === idx && prev < 0.15 && tool.hover >= 0.15 && a > 0.35) {
        playToolClick()
        armedToolClick = false
      }

      tool.pivot.rotation.z = lerp(tool.closed, tool.open, deploy)
      tool.toolMat.envMapIntensity = 1.7 + h * 0.6
      tool.linerMat.emissiveIntensity = 0.06 + h * 0.5
    }

    // If the open never got far enough to click (e.g. aborted), clear the arm.
    if (armedToolClick && idx < 0) armedToolClick = false
  }

  function resize() {
    const w = canvas.clientWidth || canvas.parentElement?.clientWidth || window.innerWidth
    const h = canvas.clientHeight || canvas.parentElement?.clientHeight || window.innerHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }

  function frame() {
    if (!running) return
    requestAnimationFrame(frame)
    applyFrame((performance.now() - start) / 1000)
    renderer.render(scene, camera)
  }

  resize()
  frame()

  // Park parts off-screen immediately so the first painted frame isn't a flash
  // of the assembled tool under the bot-check gate.
  applyIntro(performance.now())

  // Heavy enrichment after create returns — human check stays responsive while
  // PMREM + CSG finish under the gate (canvas still hidden until unlock).
  disposables.push(frontGeo)
  let enrichTimer = 0
  const enrichDetails = () => {
    if (!running) return
    bakeEnvironment()
    engraveFront()
  }
  enrichTimer = window.setTimeout(() => {
    // Kick the engraving straight away: its heavy CSG boolean now runs in a
    // worker, so it overlaps the user's human-check time without blocking the
    // main thread. Only the PMREM bake (main-thread GPU work) waits for idle.
    engraveFront()
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    }
    if (w.requestIdleCallback) w.requestIdleCallback(() => bakeEnvironment(), { timeout: 900 })
    else bakeEnvironment()
  }, 0)

  return {
    resize,
    playIntro: () => {
      // Guarantee materials/engraving before the user-facing intro — usually
      // already done while they completed the human check.
      enrichDetails()
      playIntro()
    },
    setShowcaseMode(on: boolean) {
      showcaseMode = on
      if (on) {
        stageHover = false
        requestIndex(-1)
        externalIndex = null
        committedIndex = -1
        pendingIndex = -1
        desiredIndex = -1
        parallaxTarget.set(0, 0)
        report()
        if (introDone) showcaseExplode = true
      } else {
        showcaseExplode = false
      }
      // Apply mobile/desktop rest scale immediately when the viewport mode flips.
      if (introDone || !introPlaying) assembly.scale.setScalar(restScale())
    },
    setActiveArea(index: number | null) {
      if (!introDone || showcaseMode) return
      void unlockAudio()
      externalIndex = index
      if (index === null) requestIndex(-1)
      report()
    },
    dispose() {
      running = false
      window.clearTimeout(enrichTimer)
      engraveWorker?.terminate()
      engraveWorker = null
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerenter', onEnter)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('pointerdown', onPointerDown)
      pmrem.dispose()
      disposables.forEach((d) => d.dispose())
      renderer.dispose()
    },
  }
}
