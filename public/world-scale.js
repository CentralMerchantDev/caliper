// =============================================================================
// ONE NUMBER DECIDES HOW BIG THE WORLD IS
//
// The city was laid out on 1,301 km2 of land and covers 2.96% of it with
// buildings. Inside the settlements the coverage is 21.9%, which is what a real
// dense city looks like -- so the blocks were never the problem. There was
// simply far more island than there was city, and 86.5% of the land carried no
// settlement at all.
//
// Filling it would take several hundred thousand more buildings. Shrinking the
// ground takes one number. The buildings keep their real size; the land they
// stand on gets smaller, so the same city covers far more of it.
//
//   settled share = 13.5% / WORLD_SCALE^2
//
//   0.65 -> 32.0%    0.60 -> 37.5%    0.55 -> 44.6%    0.50 -> 54.0%
//
// -----------------------------------------------------------------------------
// WHY THE SCALE IS UNIFORM, AND NOT JUST HORIZONTAL
//
// The tempting version squeezes x and z and leaves height alone. It is wrong.
// Slope is rise over run, so squeezing only the run makes the entire world
// steeper by 1/WORLD_SCALE -- at 0.65 that is 1.54x. Every slope threshold in
// land-use.js (ROAD_MAX 0.13, BUILD_MAX 0.32, CLIFF 0.62) would then be
// measuring a landscape it was never calibrated for: more cliffs, more STEEP,
// less buildable ground. That fights the density this change exists to create,
// and it is no longer the land that was drawn -- it is a stretched version of it.
//
// Scaling all three axes together keeps every rise/run ratio EXACTLY as it was.
// Not one slope threshold has to be touched or re-justified. The world becomes a
// smaller copy of itself rather than a distorted one.
//
// The visible consequence, stated plainly: the range drops from 1,620 m to
// 1,053 m at 0.65, and the snow line scales with it so the peaks still hold snow
// in the same relative band. That is a Cape Breton coastal range rather than a
// Rockies one. It is deliberate, and it is this constant away from being
// something else.
//
// -----------------------------------------------------------------------------
// WHAT SCALES AND WHAT DOES NOT -- the rule this whole change rests on
//
//   SCALES:  landform metres. Coastlines, terrain heights, hills, peaks, sea
//            depths, shore ramps, noise feature sizes, and the step sizes used
//            to WALK terrain (so the coast is still sampled at the same relative
//            fidelity).
//
//   DOES NOT SCALE: built-object metres. Building footprints and heights, road
//            widths, plot dimensions, setbacks, lamp spacing, car and person
//            sizes. This is the entire point -- they stay life-sized while the
//            ground beneath them shrinks.
//
//   NEVER NEEDS TO SCALE: anything dimensionless. Slope ratios, density
//            fractions, colour ramps keyed to slope.
//
// If you are adding a constant and cannot tell which group it is in, ask whether
// a person standing in the world would measure it against the landscape or
// against a building. That is the answer.
// =============================================================================

/**
 * The single scale factor. 1 reproduces the original 48 km world exactly, so
 * setting it to 1 is a genuine no-op and any test that fails at 1 is failing for
 * a reason unrelated to scale.
 */
export const WORLD_SCALE = 0.65;

/** Scale a landform distance (metres of terrain) from design space to world. */
export function sm(v) {
  return v * WORLD_SCALE;
}

/** Map a world coordinate back into design space, where terrain.js does its work. */
export function toDesign(v) {
  return v / WORLD_SCALE;
}

/** Scale an {x, z} point, leaving any other fields untouched. */
export function sPoint(p) {
  if (Array.isArray(p)) return [p[0] * WORLD_SCALE, p[1] * WORLD_SCALE];
  return { ...p, x: p.x * WORLD_SCALE, z: p.z * WORLD_SCALE };
}

/**
 * Scale the named metre-valued fields of an object, copying the rest.
 * Explicit field lists beat a blanket "scale every number", because a blanket
 * rule silently scales counts, weights and fractions too -- and a density of
 * 0.66 quietly becoming 0.43 is exactly the kind of defect that survives review.
 */
export function sFields(obj, fields) {
  const out = { ...obj };
  for (const f of fields) if (typeof out[f] === "number") out[f] = out[f] * WORLD_SCALE;
  return out;
}

/** Scale a bounds rectangle. */
export function sBounds(b) {
  if (!b) return b;
  return {
    xMin: b.xMin * WORLD_SCALE, xMax: b.xMax * WORLD_SCALE,
    zMin: b.zMin * WORLD_SCALE, zMax: b.zMax * WORLD_SCALE,
  };
}
