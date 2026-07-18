import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { areas, type ToolKind } from '../data/cv'

// Handle segment geometry.
const SEG_W = 1.1
const SEG_H = 1.0
const SEG_D = 0.6
const PITCH = 1.16
const N = areas.length
const TOOL_SCALE = 0.68
const TOOL_DEPTH = 0.16

function ease(t: number) {
  return t * t * (3 - 2 * t)
}
function segX(i: number) {
  return -((N - 1) / 2) * PITCH + i * PITCH
}

// Tool profiles are drawn pointing +X from the origin; the mesh is later rotated
// so the tool points -Y (downward) out of the bottom of its segment.
function toolShape(kind: ToolKind): THREE.Shape {
  const s = new THREE.Shape()
  switch (kind) {
    case 'screwdriver':
      s.moveTo(0, -0.1)
      s.lineTo(1.55, -0.1)
      s.lineTo(1.62, -0.17)
      s.lineTo(2.08, -0.13)
      s.lineTo(2.08, 0.13)
      s.lineTo(1.62, 0.17)
      s.lineTo(1.55, 0.1)
      s.lineTo(0, 0.1)
      break
    case 'blade':
      s.moveTo(0, -0.13)
      s.lineTo(1.5, -0.15)
      s.lineTo(2.45, 0)
      s.lineTo(1.3, 0.17)
      s.lineTo(0, 0.13)
      break
    case 'wrench':
      s.moveTo(0, -0.11)
      s.lineTo(1.45, -0.11)
      s.lineTo(1.45, -0.3)
      s.lineTo(2.15, -0.3)
      s.lineTo(2.15, -0.11)
      s.lineTo(1.82, -0.11)
      s.lineTo(1.82, 0.11)
      s.lineTo(2.15, 0.11)
      s.lineTo(2.15, 0.3)
      s.lineTo(1.45, 0.3)
      s.lineTo(1.45, 0.11)
      s.lineTo(0, 0.11)
      break
    case 'scalpel':
      s.moveTo(0, -0.09)
      s.lineTo(1.35, -0.09)
      s.lineTo(1.55, -0.17)
      s.lineTo(2.2, -0.05)
      s.lineTo(2.1, 0.05)
      s.lineTo(1.5, 0.14)
      s.lineTo(1.35, 0.09)
      s.lineTo(0, 0.09)
      break
  }
  s.closePath()
  return s
}

function roundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

interface Part {
  group: THREE.Group // the segment group (moves during explode/assemble)
  toolPivot: THREE.Group // folds to extrude the tool
  segMat: THREE.MeshPhysicalMaterial
  toolMat: THREE.MeshPhysicalMaterial
  accent: THREE.Color
  segExplode: THREE.Vector3
  toolExplode: THREE.Vector3
  hover: number
}

export interface Multitool {
  resize: () => void
  dispose: () => void
  /** Drive a segment from outside the canvas (e.g. keyboard/legend). null clears. */
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
  renderer.toneMappingExposure = 1.15

  const scene = new THREE.Scene()

  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.02).texture

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
  camera.position.set(0, 0.2, 10)
  camera.lookAt(0, -0.45, 0)

  scene.add(new THREE.AmbientLight(0xffffff, 0.5))
  const key = new THREE.DirectionalLight(0xffffff, 2.4)
  key.position.set(4, 7, 6)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xcfe0ff, 0.9)
  fill.position.set(-6, 1, 4)
  scene.add(fill)
  const rim = new THREE.DirectionalLight(0xffffff, 1.4)
  rim.position.set(-3, -5, -6)
  scene.add(rim)

  const assembly = new THREE.Group()
  scene.add(assembly)

  const disposables: Array<{ dispose: () => void }> = []
  const pickTargets: THREE.Object3D[] = []
  const parts: Part[] = []

  const toolMatBase = {
    color: new THREE.Color(0xe6ecf3),
    metalness: 1.0,
    roughness: 0.13,
    clearcoat: 0.7,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.7,
  }

  areas.forEach((area, i) => {
    const accent = new THREE.Color(area.accent)

    const group = new THREE.Group()
    group.position.set(segX(i), 0, 0)
    assembly.add(group)

    // Segment body — glossy synthetic plastic.
    const segGeo = new THREE.ExtrudeGeometry(roundedRectShape(SEG_W, SEG_H, 0.16), {
      depth: SEG_D,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 4,
      curveSegments: 14,
      steps: 1,
    })
    segGeo.translate(0, 0, -SEG_D / 2)
    disposables.push(segGeo)

    const segMat = new THREE.MeshPhysicalMaterial({
      color: accent,
      metalness: 0.0,
      roughness: 0.26,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.25,
      emissive: accent,
      emissiveIntensity: 0,
    })
    disposables.push(segMat)
    const segMesh = new THREE.Mesh(segGeo, segMat)
    segMesh.userData.areaIndex = i
    group.add(segMesh)
    pickTargets.push(segMesh)

    // Bolt detail.
    const boltGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.06, 20)
    boltGeo.rotateX(Math.PI / 2)
    boltGeo.translate(0, 0, SEG_D / 2 + 0.02)
    disposables.push(boltGeo)
    const boltMat = new THREE.MeshPhysicalMaterial({
      color: 0xaab2bd,
      metalness: 1,
      roughness: 0.22,
      envMapIntensity: 1.6,
    })
    disposables.push(boltMat)
    group.add(new THREE.Mesh(boltGeo, boltMat))

    // Tool — chrome, folds out of the bottom of the segment.
    const toolGeo = new THREE.ExtrudeGeometry(toolShape(area.tool), {
      depth: TOOL_DEPTH,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 3,
      curveSegments: 12,
      steps: 1,
    })
    toolGeo.translate(0, 0, -TOOL_DEPTH / 2)
    toolGeo.scale(TOOL_SCALE, TOOL_SCALE, 1)
    toolGeo.rotateZ(-Math.PI / 2) // point -Y (downward)
    disposables.push(toolGeo)

    const toolMat = new THREE.MeshPhysicalMaterial(toolMatBase)
    disposables.push(toolMat)
    const toolMesh = new THREE.Mesh(toolGeo, toolMat)
    toolMesh.userData.areaIndex = i

    const toolPivot = new THREE.Group()
    toolPivot.position.set(0, -SEG_H / 2, 0)
    toolPivot.add(toolMesh)
    group.add(toolPivot)
    pickTargets.push(toolMesh)

    parts.push({
      group,
      toolPivot,
      segMat,
      toolMat,
      accent,
      segExplode: new THREE.Vector3(segX(i) * 0.55, 0.85, (i - (N - 1) / 2) * 0.55),
      toolExplode: new THREE.Vector3(0, -0.95, 0.5),
      hover: 0,
    })
  })

  // ---- interaction state ----
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2(0, 0)
  const parallax = new THREE.Vector2(0, 0)
  const parallaxTarget = new THREE.Vector2(0, 0)
  let stageHover = false
  let rayIndex = -1
  let externalIndex: number | null = null
  let reported: string | null = null
  let assembleScalar = 0

  function activeIndex() {
    return externalIndex !== null ? externalIndex : rayIndex
  }

  function report() {
    const idx = activeIndex()
    const id = idx >= 0 ? areas[idx].id : null
    if (id !== reported) {
      reported = id
      options.onAreaChange?.(id)
    }
  }

  function updatePointer(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    pointer.set(x, y)
    parallaxTarget.set(x, y)
  }

  function onMove(e: PointerEvent) {
    stageHover = true
    updatePointer(e)
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects(pickTargets, false)
    rayIndex = hits.length ? (hits[0].object.userData.areaIndex as number) : -1
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

  function applyFrame(t: number) {
    const idx = activeIndex()
    const wantAssembled = stageHover || externalIndex !== null

    // Global assemble factor is derived from how assembled the parts are; we ease
    // a single scalar and reuse it for every part.
    assembleScalar += ((wantAssembled ? 1 : 0) - assembleScalar) * 0.08
    const a = ease(assembleScalar)

    parallax.lerp(parallaxTarget, 0.06)
    assembly.rotation.y = 0.26 * Math.sin(t * 0.25) + parallax.x * 0.32
    assembly.rotation.x = 0.13 + 0.035 * Math.sin(t * 0.3) - parallax.y * 0.18
    assembly.rotation.z = (1 - a) * 0.12 * Math.sin(t * 0.2)

    for (let i = 0; i < parts.length; i++) {
      const p = parts[i]
      const target = idx === i ? 1 : 0
      p.hover += (target - p.hover) * 0.14
      const h = ease(p.hover)

      // Explode ↔ assemble (translation only).
      p.group.position.set(
        segX(i) + p.segExplode.x * (1 - a),
        p.segExplode.y * (1 - a),
        p.segExplode.z * (1 - a) + h * 0.18 * a,
      )
      p.toolPivot.position.set(
        p.toolExplode.x * (1 - a),
        -SEG_H / 2 + p.toolExplode.y * (1 - a) - h * 0.12 * a,
        p.toolExplode.z * (1 - a) + h * 0.2 * a,
      )

      // Stow factor: deployed when exploded OR when hovered while assembled.
      const stow = a * (1 - h)
      p.toolPivot.rotation.z = Math.PI * stow

      p.segMat.emissiveIntensity = h * 0.28
      p.toolMat.envMapIntensity = 1.7 + h * 0.6
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
