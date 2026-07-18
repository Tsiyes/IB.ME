import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { areas, type ToolKind } from '../data/cv'

// Pivot point (handle end) that every tool swings around.
const PIVOT = new THREE.Vector3(1.55, 0, 0)
const TOOL_DEPTH = 0.14
const CLOSED_ANGLE = Math.PI // tools stow pointing back along the handle

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// 2D profile for each implement, drawn pointing +X from the pivot at x = 0.
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

function addEdges(mesh: THREE.Mesh, color: number, opacity = 1) {
  const edges = new THREE.EdgesGeometry(mesh.geometry as THREE.BufferGeometry, 22)
  const line = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }),
  )
  mesh.add(line)
}

interface ToolNode {
  pivot: THREE.Group
  inner: THREE.Group
  openAngle: number
  spin: number
  start: number
}

export interface Multitool {
  setProgress: (p: number) => void
  resize: () => void
  dispose: () => void
}

export function createMultitool(canvas: HTMLCanvasElement): Multitool {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05

  const scene = new THREE.Scene()

  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
  camera.position.set(0, 0.35, 8.6)
  camera.lookAt(0.4, 0, 0)

  // Lighting — a soft studio setup for graphic-realistic metal.
  scene.add(new THREE.AmbientLight(0xffffff, 0.35))
  const key = new THREE.DirectionalLight(0xffffff, 2.1)
  key.position.set(5, 8, 6)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xdfe6ee, 0.8)
  fill.position.set(-6, 2, 4)
  scene.add(fill)
  const rim = new THREE.DirectionalLight(0xffffff, 1.1)
  rim.position.set(-2, -4, -6)
  scene.add(rim)

  const assembly = new THREE.Group()
  assembly.position.x = -0.8
  scene.add(assembly)

  const steel = new THREE.MeshStandardMaterial({
    color: 0xb9c1c9,
    metalness: 0.92,
    roughness: 0.34,
  })
  const graphite = new THREE.MeshStandardMaterial({
    color: 0x424b56,
    metalness: 0.68,
    roughness: 0.48,
  })
  const boltMat = new THREE.MeshStandardMaterial({
    color: 0x8b939c,
    metalness: 0.9,
    roughness: 0.3,
  })

  const disposables: Array<{ dispose: () => void }> = [steel, graphite, boltMat]

  // Handle body.
  const handleGeo = new THREE.ExtrudeGeometry(roundedRectShape(4, 1, 0.5), {
    depth: 0.55,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 3,
    steps: 1,
  })
  handleGeo.translate(0, 0, -0.325)
  disposables.push(handleGeo)
  const handle = new THREE.Mesh(handleGeo, graphite)
  addEdges(handle, 0x0d141d, 0.85)
  assembly.add(handle)

  // Decorative bolts on the handle face.
  for (const bx of [-1.15, 0.15]) {
    const boltGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.08, 20)
    boltGeo.rotateX(Math.PI / 2)
    boltGeo.translate(bx, 0, 0.34)
    disposables.push(boltGeo)
    assembly.add(new THREE.Mesh(boltGeo, boltMat))
  }

  // Pivot rivet the tools rotate on.
  const rivetGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.85, 24)
  rivetGeo.rotateX(Math.PI / 2)
  rivetGeo.translate(PIVOT.x, PIVOT.y, 0)
  disposables.push(rivetGeo)
  const rivet = new THREE.Mesh(rivetGeo, boltMat)
  addEdges(rivet, 0x0d141d, 0.6)
  assembly.add(rivet)

  // Tools.
  const tools: ToolNode[] = []
  areas.forEach((area, i) => {
    const geo = new THREE.ExtrudeGeometry(toolShape(area.tool), {
      depth: TOOL_DEPTH,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 2,
      steps: 1,
    })
    geo.translate(0, 0, -TOOL_DEPTH / 2)
    disposables.push(geo)

    const mesh = new THREE.Mesh(geo, steel)
    addEdges(mesh, 0x0d141d, 0.9)

    const inner = new THREE.Group()
    inner.add(mesh)

    const pivot = new THREE.Group()
    pivot.position.copy(PIVOT)
    pivot.position.z = area.zOffset
    pivot.rotation.z = CLOSED_ANGLE
    pivot.add(inner)
    assembly.add(pivot)

    tools.push({
      pivot,
      inner,
      openAngle: area.openAngle,
      spin: area.spin,
      start: 0.1 + i * 0.19,
    })
  })

  let targetProgress = 0
  let progress = 0
  const clock = new THREE.Clock()
  let running = true

  function applyProgress(p: number, t: number) {
    // Whole-assembly orientation drifts with scroll for an unmistakably 3D read.
    assembly.rotation.y = lerp(-0.4, 0.55, p) + Math.sin(t * 0.4) * 0.02
    assembly.rotation.x = lerp(0.2, -0.03, p) + Math.sin(t * 0.55) * 0.015
    assembly.rotation.z = lerp(0.04, -0.02, p)
    assembly.position.y = Math.sin(t * 0.5) * 0.04

    for (const tool of tools) {
      const open = smoothstep(tool.start, tool.start + 0.16, p)
      const eased = open * open * (3 - 2 * open)
      tool.pivot.rotation.z = lerp(CLOSED_ANGLE, tool.openAngle, eased)
      tool.inner.rotation.x = eased * tool.spin
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
    progress += (targetProgress - progress) * 0.08
    applyProgress(progress, clock.getElapsedTime())
    renderer.render(scene, camera)
  }

  resize()
  frame()

  return {
    setProgress(p: number) {
      targetProgress = Math.min(1, Math.max(0, p))
    },
    resize,
    dispose() {
      running = false
      pmrem.dispose()
      disposables.forEach((d) => d.dispose())
      renderer.dispose()
    },
  }
}
