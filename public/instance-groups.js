// =============================================================================
// CALIPER — AN OVERRIDDEN OBJECT LEAVES ITS INSTANCE GROUP
//
// The renderer shares one geometry and one InstancedMesh across every
// placement in the same situation -- that is what collapses ~20,000
// buildings into ~480 draw calls. An InstancedMesh draws every instance from
// the SAME geometry, so a placement a layer has overridden cannot stay in
// its group: either the override never shows (the group still draws the old
// model at that slot) or, if something else draws the override on top, the
// building doubles.
//
// This runs on the OUTPUT of apply-layers.js, before groupByVariant ever
// sees the placements -- the existing instancing path in city-render.js
// needs no changes, because it simply never receives a placement this has
// already pulled out.
// =============================================================================

/**
 * Splits placements into what still shares an instance group (`instanced`)
 * and what must be drawn on its own (`overridden`). A removed placement is
 * dropped from both -- there is nothing to draw.
 */
export function partitionForInstancing(placements) {
  const instanced = [];
  const overridden = [];
  for (const p of placements) {
    if (p.removed) continue;
    if (p.override) overridden.push(p);
    else instanced.push(p);
  }
  return { instanced, overridden };
}
