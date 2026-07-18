import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'
import helvetiker from '../assets/helvetiker_bold.typeface.json'
import { areas, contact, profile, type ToolKind } from '../data/cv'

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
const N = areas.length
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

const CLOSED = Math.PI // tools point back into the handle when stowed
// Deploy angles fan the tools upward out of the end.
const openAngle = (i: number) => Math.PI * (0.5 + (i - (N - 1) / 2) * 0.1)

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
// origin and a recognizable working end pointing +X.
function toolShape(kind: ToolKind): THREE.Shape {
  const s = new THREE.Shape()
  s.moveTo(0, TOOL_TANG)
  switch (kind) {
    case 'screwdriver': // flat driver
      s.lineTo(1.7, 0.11)
      s.lineTo(1.74, 0.2)
      s.lineTo(2.2, 0.16)
      s.lineTo(2.2, -0.16)
      s.lineTo(1.74, -0.2)
      s.lineTo(1.7, -0.11)
      s.lineTo(0, -TOOL_TANG)
      break
    case 'magnifier': {
      // shaft out to a lens ring
      const cx = 2.25
      const R = 0.52
      const a0 = THREE.MathUtils.degToRad(158)
      const a1 = THREE.MathUtils.degToRad(-158)
      s.lineTo(1.45, 0.18)
      s.lineTo(cx + R * Math.cos(a0), R * Math.sin(a0))
      s.absarc(cx, 0, R, a0, a1, true)
      s.lineTo(1.45, -0.18)
      s.lineTo(0, -TOOL_TANG)
      break
    }
    case 'pencil': // uniform shaft to a sharpened conical point
      s.lineTo(2.0, 0.16)
      s.lineTo(2.62, 0.0)
      s.lineTo(2.0, -0.16)
      s.lineTo(0, -TOOL_TANG)
      break
    case 'scalpel': // fine pointed blade
      s.lineTo(1.6, 0.18)
      s.lineTo(2.55, 0.03)
      s.lineTo(2.5, -0.05)
      s.lineTo(1.3, -0.2)
      s.lineTo(0, -TOOL_TANG)
      break
  }
  // rounded tang (left semicircle) back to the start point
  s.absarc(0, 0, TOOL_TANG, -Math.PI / 2, Math.PI / 2, true)

  // pivot hole
  const hole = new THREE.Path()
  hole.absarc(0, 0, TOOL_HOLE, 0, Math.PI * 2, true)
  s.holes.push(hole)

  // magnifier lens cut-out
  if (kind === 'magnifier') {
    const lens = new THREE.Path()
    lens.absarc(2.25, 0, 0.34, 0, Math.PI * 2, true)
    s.holes.push(lens)
  }
  return s
}

interface ToolNode {
  layer: THREE.Group // holds liner + pivot; explodes along Z
  pivot: THREE.Group // rotates to deploy the tool
  toolMat: THREE.MeshPhysicalMaterial
  linerMat: THREE.MeshPhysicalMaterial
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
}

export interface MultitoolOptions {
  onAreaChange?: (id: string | null) => void
}

export function createMultitool(
  canvas: HTMLCanvasElement,
  options: MultitoolOptions = {},
): Multitool {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.12

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.02).texture

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
  // Frame the tool in the upper-centre of the hero; look slightly below it so
  // the blurb + legend can sit in the lower half without overlapping.
  camera.position.set(0.55, 0.75, 12)
  camera.lookAt(0, 0.05, 0)

  scene.add(new THREE.AmbientLight(0xffffff, 0.45))
  const key = new THREE.DirectionalLight(0xffffff, 2.5)
  key.position.set(4, 8, 7)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xcfe0ff, 0.9)
  fill.position.set(-6, 2, 5)
  scene.add(fill)
  const rim = new THREE.DirectionalLight(0xffffff, 1.5)
  rim.position.set(-3, -5, -7)
  scene.add(rim)

  const assembly = new THREE.Group()
  assembly.scale.setScalar(0.9) // ~10% smaller
  assembly.position.y = 1.15 // top-centre of the hero viewport
  scene.add(assembly)

  const disposables: Array<{ dispose: () => void }> = []
  const explodeLayers: ExplodeLayer[] = []
  const pickTargets: THREE.Object3D[] = []
  const tools: ToolNode[] = []

  const scaleMat = new THREE.MeshPhysicalMaterial({
    color: 0x4a515a,
    metalness: 0.92,
    roughness: 0.34,
    clearcoat: 0.5,
    clearcoatRoughness: 0.25,
    envMapIntensity: 1.4,
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

  // ---- front cover with identity CUT INTO it, then filled with enamel ----
  // CSG only excavates the pocket (metal cavity walls). A separate, slightly
  // shallower glyph mesh sits in that pocket as the white enamel inlay — so
  // increasing RECESS deepens a real filled recess rather than hollow white walls.
  // Static, and kept clear of the bored rod holes at ±PIVOT_X.
  const inlayMat = new THREE.MeshPhysicalMaterial({
    color: 0xf3f1ec,
    metalness: 0.08,
    roughness: 0.42,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
    envMapIntensity: 0.85,
  })
  disposables.push(inlayMat)
  const RECESS = 0.05
  // Leave a hair of metal lip so the inlay reads as seated in the pocket.
  const INLAY_CLEARANCE = 0.006

  const font = new FontLoader().parse(helvetiker as unknown as Parameters<FontLoader['parse']>[0])
  const glyphs = (font.data as { glyphs: Record<string, unknown> }).glyphs
  const sanitize = (text: string) =>
    Array.from(text)
      .map((c) => (c === ' ' || glyphs[c] ? c : glyphs[c.toUpperCase()] ? c.toUpperCase() : '-'))
      .join('')

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
  // Actual front surface of the cover (accounts for the bevel), so the cut is
  // guaranteed to open at the surface and recess RECESS deep.
  const surfaceZ = frontGeo.boundingBox!.max.z
  const cutterDepth = RECESS + 0.08 // extends a little proud so it fully crosses the surface
  const fillDepth = Math.max(RECESS - INLAY_CLEARANCE, 0.004)

  const lines: Array<{ text: string; size: number; y: number }> = [
    { text: sanitize(profile.name), size: 0.28, y: 0.1 },
    { text: sanitize('IMPLEMENTATION/PRODUCT/QA/HEALTHCARE'), size: 0.078, y: -0.16 },
    { text: sanitize(contact.email), size: 0.078, y: -0.34 },
  ].filter((line) => line.text.length > 0)

  // Layout helpers: centre each line on X, then centre the whole block on Y so the
  // lettering sits optically in the middle of the plate between the rods.
  function layoutTextGeos(depth: number, z: number): THREE.BufferGeometry[] {
    return lines.map((line) => {
      const geo = new TextGeometry(line.text, {
        font,
        size: line.size,
        depth,
        curveSegments: 4,
        bevelEnabled: false,
      })
      geo.computeBoundingBox()
      const bb = geo.boundingBox!
      const cx = (bb.max.x + bb.min.x) / 2
      geo.translate(-cx, line.y, z)
      return geo
    })
  }

  function centreBlockY(geos: THREE.BufferGeometry[]) {
    let minY = Infinity
    let maxY = -Infinity
    for (const geo of geos) {
      geo.computeBoundingBox()
      const bb = geo.boundingBox!
      minY = Math.min(minY, bb.min.y)
      maxY = Math.max(maxY, bb.max.y)
    }
    const cy = (minY + maxY) / 2
    for (const geo of geos) geo.translate(0, -cy, 0)
  }

  const cutterGeos = layoutTextGeos(cutterDepth, surfaceZ - RECESS)
  centreBlockY(cutterGeos)
  const cutterGeo = mergeGeometries(cutterGeos, false)!
  cutterGeos.forEach((g) => g.dispose())

  const fillGeos = layoutTextGeos(fillDepth, surfaceZ - RECESS)
  centreBlockY(fillGeos)
  const fillGeo = mergeGeometries(fillGeos, false)!
  fillGeos.forEach((g) => g.dispose())

  // CSG requires indexed geometry. If anything goes wrong, fall back to a plain
  // cover with the enamel glyphs still present so the scene still renders.
  let frontMesh: THREE.Mesh
  try {
    const scaleBrush = new Brush(mergeVertices(frontGeo), scaleMat)
    const textBrush = new Brush(mergeVertices(cutterGeo), scaleMat)
    const evaluator = new Evaluator()
    evaluator.useGroups = true
    const result = evaluator.evaluate(scaleBrush, textBrush, SUBTRACTION)
    // Both groups stay metal — the pocket walls are the scale, not the enamel.
    result.material = [scaleMat, scaleMat]
    frontMesh = result
  } catch (err) {
    console.warn('[multitool] engraving CSG failed, using plain cover', err)
    frontMesh = new THREE.Mesh(frontGeo.clone(), scaleMat)
  }
  frontGeo.dispose()
  cutterGeo.dispose()
  disposables.push(frontMesh.geometry)

  const inlayMesh = new THREE.Mesh(fillGeo, inlayMat)
  disposables.push(fillGeo)

  const frontGroup = new THREE.Group()
  frontGroup.position.z = 0.52
  frontGroup.add(frontMesh)
  frontGroup.add(inlayMesh)
  assembly.add(frontGroup)
  explodeLayers.push({ obj: frontGroup, baseZ: 0.52 })
  pickTargets.push(frontMesh, inlayMesh)

  // ---- pivot + end pins (rods) ----
  const pins: THREE.Mesh[] = []
  function makePin(x: number) {
    const geo = new THREE.CylinderGeometry(PIN_R, PIN_R, 1.2, 24)
    geo.rotateX(Math.PI / 2)
    geo.translate(x, 0, 0)
    disposables.push(geo)
    const mesh = new THREE.Mesh(geo, boltMat)
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

    // steel tool on a pivot
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
    pivot.position.set(PIVOT_X, 0, 0)
    pivot.rotation.z = CLOSED
    pivot.add(toolMesh)
    layer.add(pivot)

    tools.push({
      layer,
      pivot,
      toolMat,
      linerMat,
      hover: 0,
    })
  })

  // Layers ordered back→front along the pin axis. Ascending baseZ keeps the
  // engraved front cover frontmost when exploded (previously it inverted, so the
  // engraving ended up on the back plate).
  const ordered = [...explodeLayers].sort((a, b) => a.baseZ - b.baseZ)
  const M = ordered.length
  const center = (M - 1) / 2

  // ---- interaction ----
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const parallax = new THREE.Vector2()
  const parallaxTarget = new THREE.Vector2()
  let stageHover = false
  let rayIndex = -1
  let externalIndex: number | null = null
  let reported: string | null = null
  let explodeScalar = 0

  const activeIndex = () => (externalIndex !== null ? externalIndex : rayIndex)

  function report() {
    const idx = activeIndex()
    const id = idx >= 0 ? areas[idx].id : null
    if (id !== reported) {
      reported = id
      options.onAreaChange?.(id)
    }
  }

  function onMove(e: PointerEvent) {
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
    rayIndex = typeof ai === 'number' ? ai : -1
    report()
  }
  function onEnter() {
    stageHover = true
  }
  function onLeave() {
    stageHover = false
    rayIndex = -1
    parallaxTarget.set(0, 0)
    report()
  }

  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerenter', onEnter)
  canvas.addEventListener('pointerleave', onLeave)

  const start = performance.now()
  let running = true

  const tmp = new THREE.Vector3()

  function applyFrame(t: number) {
    const idx = activeIndex()

    parallax.lerp(parallaxTarget, 0.06)
    // Canted (3/4) at all times; swings a little further as it explodes.
    assembly.rotation.y = 0.0 + 0.0 * explodeScalar + parallax.x * 0.26 + 0.05 * Math.sin(t * 0.3)
    assembly.rotation.x = 0.3 + 0.12 * explodeScalar - parallax.y * 0.13 + 0.02 * Math.sin(t * 0.35)
    assembly.rotation.z = 0
    assembly.updateMatrixWorld(true)

    // Proximity: only explode once the pointer is close to the model on screen.
    tmp.set(0, 0, 0).applyMatrix4(assembly.matrixWorld).project(camera)
    const cdx = (pointer.x - tmp.x) * camera.aspect
    const cdy = pointer.y - tmp.y
    const near = Math.sqrt(cdx * cdx + cdy * cdy) < PROXIMITY
    const wantExplode = (stageHover && near) || externalIndex !== null
    explodeScalar += ((wantExplode ? 1 : 0) - explodeScalar) * 0.06
    const a = ease(explodeScalar)

    // Focus: which layer is nearest the pointer (drives the accordion).
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
    const focus = fwsum > 0 ? fw / fwsum : center

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
      ordered[o].obj.position.z = lerp(ordered[o].baseZ, target, a)
    }

    // Rods lengthen as the plates spread so they keep threading through the holes.
    for (const p of pins) p.scale.z = 1 + a * 2.6

    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i]
      const target = idx === i ? 1 : 0
      tool.hover += (target - tool.hover) * 0.14
      const h = ease(tool.hover)
      const deploy = h * a // deploy the tool once the casing has opened up

      tool.pivot.rotation.z = lerp(CLOSED, openAngle(i), deploy)
      tool.toolMat.envMapIntensity = 1.7 + h * 0.6
      tool.linerMat.emissiveIntensity = 0.06 + h * 0.5
    }
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

  return {
    resize,
    setActiveArea(index: number | null) {
      externalIndex = index
      report()
    },
    dispose() {
      running = false
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerenter', onEnter)
      canvas.removeEventListener('pointerleave', onLeave)
      pmrem.dispose()
      disposables.forEach((d) => d.dispose())
      renderer.dispose()
    },
  }
}
