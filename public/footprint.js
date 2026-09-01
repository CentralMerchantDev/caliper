// =============================================================================
// A BUILDING KNOWS THE GROUND UNDER ALL OF ITSELF
//
// WHAT WAS WRONG
//
// A building used to be placed from five height samples: the centre of its
// buildable envelope, plus the four corners of the PLOT. Three separate defects
// lived in that sentence.
//
//   1. IT MIXED TWO RECTANGLES. The centre came from the envelope, the corners
//      from the outer plot. Those are different shapes -- the envelope is inset
//      by its setbacks -- so the "range across the footprint" was measured
//      across ground the building does not stand on, and the height it stood at
//      was measured somewhere else again.
//
//   2. CORNERS CANNOT SEE A RIDGE. Four corner samples miss anything between
//      them. A footprint with four level corners and a rock spine up the middle
//      reported a range of zero. So did one with a gully through it.
//
//   3. ONLY THE CENTRE WAS TESTED FOR WATER. `if (g < 0.6) continue` asked
//      whether the MIDDLE of the building was dry. A building whose centre was
//      on the beach and whose seaward half was in the sea passed that test.
//
// And the response to a slope was one crude branch: over 0.9 m of range, wrap
// the base in a grey box. That is a wall, not a foundation. It made no
// distinction between a building on a gentle rise and one hanging off a cliff,
// and it had no way to say no.
//
// WHAT HAPPENS NOW
//
// The envelope -- and only the envelope -- is sampled on a grid, and the ground
// gets to decide which of four things the building is:
//
//   SLAB     Near-level. Sits on the ground, as now.
//   PLINTH   A real slope. The base drops to the footprint's LOWEST point so no
//            corner hangs in the air, and the uphill side is cut into the hill.
//            This is what a house on a hillside actually does.
//   TERRACE  Steep. One plinth would be a retaining wall two storeys tall, so
//            the footprint is stepped down the slope instead.
//   REFUSE   A cliff, or any part of the footprint in water. Nothing is built.
//
// That last verdict is the point of the whole module. The old code had no way to
// decline: every plot got a building, and a plot on impossible ground got a
// building floating over it. Refusing is the honest answer, and it is the same
// principle the rest of this project runs on -- only say yes when yes is true.
// =============================================================================

/** Ground must be at least this high for a building to stand on it, in metres. */
export const DRY_ENOUGH = 0.6;

/**
 * Footprint response thresholds, in metres of height difference across the
 * building. These are BUILT dimensions and deliberately do not scale with
 * WORLD_SCALE: the relationship between a building and the ground it stands on
 * is a fact about buildings, not about how big the island is.
 */
export const STEP = {
  SLAB_MAX: 1.2,      // below this the ground is level enough to sit on
  PLINTH_MAX: 6.0,    // above this a single plinth is a retaining wall, not a base
  TERRACE_MAX: 15.0,  // above this it is a cliff and nothing should be built
};

/**
 * Sample the ground under a footprint and decide what the building does about it.
 *
 * @param {Function} heightAt  world-space height function
 * @param {{xMin,xMax,zMin,zMax}} env  the BUILDABLE envelope -- not the plot
 * @returns {{verdict, base, min, max, range, cut, steps, wet, reason}}
 */
export function assessFootprint(heightAt, env) {
  const w = env.xMax - env.xMin;
  const d = env.zMax - env.zMin;

  // Grid resolution follows footprint size: a 20 m house is well described by
  // 3x3, a 180 m civic block is not. Capped so a tower does not cost 100 height
  // lookups when the plot generator has already guaranteed it is on flat ground.
  const nx = Math.max(3, Math.min(5, Math.round(w / 25) + 1));
  const nz = Math.max(3, Math.min(5, Math.round(d / 25) + 1));

  let min = Infinity, max = -Infinity, sum = 0, count = 0, wet = 0;
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const x = env.xMin + (w * i) / (nx - 1);
      const z = env.zMin + (d * j) / (nz - 1);
      const h = heightAt(x, z);
      if (h < min) min = h;
      if (h > max) max = h;
      sum += h; count++;
      if (h < DRY_ENOUGH) wet++;
    }
  }

  const range = max - min;
  const mean = sum / count;

  // ANY part of the footprint in the water is a refusal. Not a majority, not the
  // centre -- any. A building half in the sea is not a building that is mostly
  // fine.
  if (wet > 0) {
    return {
      verdict: "refuse", reason: wet === count ? "underwater" : "partly in water",
      base: mean, min, max, range, cut: 0, steps: 0, wet,
    };
  }

  if (range > STEP.TERRACE_MAX) {
    return {
      verdict: "refuse", reason: "cliff",
      base: min, min, max, range, cut: 0, steps: 0, wet: 0,
    };
  }

  if (range <= STEP.SLAB_MAX) {
    return { verdict: "slab", base: mean, min, max, range, cut: 0, steps: 1, wet: 0 };
  }

  if (range <= STEP.PLINTH_MAX) {
    // Base at the LOWEST sample, so the downhill side meets its own foundation
    // rather than hanging. The cut is what has to come out of the uphill side.
    return { verdict: "plinth", base: min, min, max, range, cut: range, steps: 1, wet: 0 };
  }

  // Steep: step it down the hill. One terrace per PLINTH_MAX of fall, so each
  // individual retaining face stays a storey rather than a cliff of its own.
  const steps = Math.max(2, Math.ceil(range / STEP.PLINTH_MAX));
  return {
    verdict: "terrace", base: min, min, max, range,
    cut: range / steps, steps, wet: 0,
  };
}
