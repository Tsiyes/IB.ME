import type { BufferGeometry } from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'

// `useCDTClipping` is a real runtime setter on Evaluator but is missing from the
// shipped typings, so we widen the type where we set it.
type WithCDT = Evaluator & { useCDTClipping: boolean }

/**
 * Subtract the engraving text (and, if present, hairline counter "bridges")
 * from the front cover.
 *
 * The final subtraction uses CDT clipping — it's ~3.7x faster than the legacy
 * splitter and yields a cleaner, ~half-as-dense result. CDT's one weakness for
 * this content is that it leaves the isolated coplanar caps inside multi-counter
 * glyphs (the two holes in `B`) non-watertight, so the layer behind shows
 * through them. `bridges` is a set of thin boxes that slice each such counter
 * open to the surrounding surface *before* the CDT cut, removing the isolated
 * cap. That pre-cut is small and done with the robust legacy splitter.
 *
 * `uv` is dropped throughout — the cover metals are env-map/untextured.
 */
export function runEngrave(
  front: BufferGeometry,
  cutter: BufferGeometry,
  bridges: BufferGeometry | null,
): BufferGeometry {
  // three-bvh-csg needs welded, indexed geometry.
  let cutterGeo = mergeVertices(cutter)

  if (bridges) {
    const open = new Evaluator()
    open.useGroups = false
    open.attributes = ['position', 'normal']
    // Legacy splitter for the small counter slice — robust, and cheap here.
    const opened = open.evaluate(
      new Brush(cutterGeo),
      new Brush(mergeVertices(bridges)),
      SUBTRACTION,
    )
    cutterGeo = mergeVertices(opened.geometry)
  }

  const evaluator = new Evaluator()
  evaluator.useGroups = true
  evaluator.attributes = ['position', 'normal']
  ;(evaluator as WithCDT).useCDTClipping = true
  return evaluator.evaluate(new Brush(mergeVertices(front)), new Brush(cutterGeo), SUBTRACTION)
    .geometry
}
