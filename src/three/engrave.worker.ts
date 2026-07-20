/// <reference lib="webworker" />
// Off-main-thread front-cover engraving. The CSG subtraction (three-bvh-csg) is
// a ~1–3 s synchronous boolean; running it here keeps the human-check gate and
// the intro fully responsive. The main thread ships in the front-cover geometry
// and the text cutter; we run the boolean and ship the finished geometry back.
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'
import {
  deserializeGeometry,
  serializeGeometry,
  type SerializedGeometry,
} from './geometryTransfer'

interface EngraveRequest {
  front: SerializedGeometry
  cutter: SerializedGeometry
}

const ctx = self as unknown as DedicatedWorkerGlobalScope

ctx.onmessage = (event: MessageEvent<EngraveRequest>) => {
  try {
    // three-bvh-csg requires welded, indexed geometry — mirror the inline path.
    const front = mergeVertices(deserializeGeometry(event.data.front))
    const cutter = mergeVertices(deserializeGeometry(event.data.cutter))

    const evaluator = new Evaluator()
    evaluator.useGroups = true
    // Keep the default (legacy) triangle splitter: CDT clipping was ~3.7x
    // faster but left the coplanar caps of letter counters (the holes in B/R/O
    // etc.) non-watertight, so you could see the layer behind through them.
    // Correctness wins here — the boolean runs off the main thread, so its cost
    // no longer blocks anything. `uv` is dropped: the cover metals are untextured.
    evaluator.attributes = ['position', 'normal']
    const result = evaluator.evaluate(new Brush(front), new Brush(cutter), SUBTRACTION)

    const { data, transfer } = serializeGeometry(result.geometry)
    ctx.postMessage({ ok: true, geometry: data }, transfer)
  } catch (err) {
    ctx.postMessage({ ok: false, error: String(err) })
  }
}
