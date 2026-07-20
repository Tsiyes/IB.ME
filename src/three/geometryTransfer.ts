// Structured-clone friendly (de)serialisation of a BufferGeometry so the heavy
// CSG boolean can run in a Web Worker and the finished mesh can be shipped back
// to the main thread. Only the flat, non-interleaved attribute layout produced
// by ExtrudeGeometry / three-bvh-csg is supported (position/normal/uv + index +
// material groups) — that's all the engraving pipeline uses.
import { BufferAttribute, BufferGeometry } from 'three'

type ArrayKind = 'f32' | 'u16' | 'u32'

interface SerializedAttribute {
  buffer: ArrayBuffer
  itemSize: number
  kind: ArrayKind
  normalized: boolean
}

export interface SerializedGeometry {
  attributes: Record<string, SerializedAttribute>
  index: SerializedAttribute | null
  groups: Array<{ start: number; count: number; materialIndex: number }>
}

function kindOf(array: ArrayLike<number>): ArrayKind {
  if (array instanceof Uint16Array) return 'u16'
  if (array instanceof Uint32Array) return 'u32'
  return 'f32'
}

function makeTyped(kind: ArrayKind, buffer: ArrayBuffer) {
  if (kind === 'u16') return new Uint16Array(buffer)
  if (kind === 'u32') return new Uint32Array(buffer)
  return new Float32Array(buffer)
}

/**
 * Copy a geometry's buffers into standalone ArrayBuffers. Returns the plain
 * payload plus the list of buffers to hand to `postMessage` as transferables.
 */
export function serializeGeometry(geometry: BufferGeometry): {
  data: SerializedGeometry
  transfer: ArrayBuffer[]
} {
  const attributes: Record<string, SerializedAttribute> = {}
  const transfer: ArrayBuffer[] = []

  for (const name of Object.keys(geometry.attributes)) {
    const attr = geometry.attributes[name] as BufferAttribute
    // `.slice()` yields a fresh, standalone buffer (safe to transfer even if the
    // source aliased a larger/shared buffer).
    const copy = (attr.array as Float32Array).slice()
    attributes[name] = {
      buffer: copy.buffer,
      itemSize: attr.itemSize,
      kind: kindOf(copy),
      normalized: attr.normalized,
    }
    transfer.push(copy.buffer)
  }

  let index: SerializedAttribute | null = null
  if (geometry.index) {
    const copy = (geometry.index.array as Uint32Array).slice()
    index = { buffer: copy.buffer, itemSize: 1, kind: kindOf(copy), normalized: false }
    transfer.push(copy.buffer)
  }

  const groups = geometry.groups.map((g) => ({
    start: g.start,
    count: g.count,
    materialIndex: g.materialIndex ?? 0,
  }))

  return { data: { attributes, index, groups }, transfer }
}

/** Rebuild a BufferGeometry from a {@link serializeGeometry} payload. */
export function deserializeGeometry(data: SerializedGeometry): BufferGeometry {
  const geometry = new BufferGeometry()

  for (const name of Object.keys(data.attributes)) {
    const s = data.attributes[name]
    geometry.setAttribute(
      name,
      new BufferAttribute(makeTyped(s.kind, s.buffer), s.itemSize, s.normalized),
    )
  }

  if (data.index) {
    geometry.setIndex(new BufferAttribute(makeTyped(data.index.kind, data.index.buffer), 1))
  }

  for (const g of data.groups) geometry.addGroup(g.start, g.count, g.materialIndex)

  return geometry
}
