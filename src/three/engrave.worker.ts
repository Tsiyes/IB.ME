/// <reference lib="webworker" />
// Off-main-thread front-cover engraving. The CSG subtraction (three-bvh-csg) is
// a ~1–3 s synchronous boolean; running it here keeps the human-check gate and
// the intro fully responsive. The main thread ships in the front-cover geometry,
// the text cutter, and (optionally) hairline counter "bridges"; we run the
// boolean(s) and ship the finished geometry back.
import { runEngrave } from './engraveCsg'
import {
  deserializeGeometry,
  serializeGeometry,
  type SerializedGeometry,
} from './geometryTransfer'

interface EngraveRequest {
  front: SerializedGeometry
  cutter: SerializedGeometry
  bridges: SerializedGeometry | null
}

const ctx = self as unknown as DedicatedWorkerGlobalScope

ctx.onmessage = (event: MessageEvent<EngraveRequest>) => {
  try {
    const front = deserializeGeometry(event.data.front)
    const cutter = deserializeGeometry(event.data.cutter)
    const bridges = event.data.bridges ? deserializeGeometry(event.data.bridges) : null

    const geometry = runEngrave(front, cutter, bridges)

    const { data, transfer } = serializeGeometry(geometry)
    ctx.postMessage({ ok: true, geometry: data }, transfer)
  } catch (err) {
    ctx.postMessage({ ok: false, error: String(err) })
  }
}
