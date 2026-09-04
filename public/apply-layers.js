// =============================================================================
// CALIPER — LAYERS APPLY TO THE PLAN, TOUCHING ONLY WHAT THEY TOUCH
//
// planCity can produce close to 20,000 placements. A world's layer stack
// might touch one of them, or a few thousand -- but re-resolving EVERY
// placement against the layer stack on every build would make the cost of
// having layers at all scale with the size of the WORLD instead of the size
// of the EDIT. world.touched() already names exactly the addresses any layer
// has ever mentioned; this only ever calls resolve() for those.
// =============================================================================

/**
 * Apply a world's layers to a plan's placements.
 *
 * Untouched placements are not copied and not looked at -- the output array
 * holds the EXACT SAME OBJECT for every address no layer mentions, so a
 * caller (or a test) can tell "not resolved" from "resolved and happened to
 * come back unchanged" by reference equality.
 *
 * A touched address that is not among these placements (a road, a park, a
 * feature this particular slice does not cover) is not an error -- a layer's
 * edits and one call's placements are two different scopes and neither is
 * required to be a subset of the other.
 */
export function applyLayers(placements, world) {
  const touched = world.layers.touched();
  if (touched.length === 0) return placements;

  const indexById = new Map();
  for (let i = 0; i < placements.length; i++) indexById.set(placements[i].plotId, i);

  const out = placements.slice();
  for (const address of touched) {
    const i = indexById.get(address);
    if (i === undefined) continue;
    const resolved = world.resolve(address);
    out[i] = resolved.removed
      ? { ...out[i], removed: true }
      : { ...out[i], override: resolved };
  }
  return out;
}
