// =============================================================================
// THE LAND REGISTRY
//
// Every coordinate in the world knows what it is.
//
// Until now nothing did. Roads were laid on a grid and clipped afterwards by a
// height sample; blocks were tested for "is this dry"; and everything else --
// slope, beach, cliff, park, who owns this ground -- was nobody's job. That is
// how a street ended up running down a 40-degree hillside, across a beach, and
// into the water, and why the change pipeline cannot safely be pointed at the
// city: an agent asked to "add a street here" has no way to find out what
// "here" already is.
//
// So: one function, `classifyAt(x, z)`, that answers what a point IS, and a
// small set of rules built on it that say what may be put there. Both the
// generator and the pipeline use the same answer, which is the only way they
// can agree.
//
// Deliberately pure and dependency-light: it takes a height function and
// returns data. No THREE, no DOM, testable in Node.
// =============================================================================

/** What a piece of ground is. Ordered roughly from "cannot build" to "free". */
export const USE = {
  WATER: "water",         // sea, lagoon, river, canal
  BEACH: "beach",         // the shore ramp -- sand, walkable, never built on
  CLIFF: "cliff",         // too steep to stand a building on
  STEEP: "steep",         // buildable in principle, too steep for a road
  RESERVED: "reserved",   // deliberately kept open: park, foreshore, approach
  BUILDABLE: "buildable", // ordinary ground
};

/** Slope thresholds, as rise over run. */
export const SLOPE = {
  ROAD_MAX: 0.13,      // ~7.4 degrees. Steeper than most city streets climb.
  BUILD_MAX: 0.32,     // ~17.7 degrees. Terraced housing manages this.
  CLIFF: 0.62,         // ~32 degrees. Rock face; nothing goes here.
};

/** Ground below this is treated as shore rather than land you can build on. */
export const BEACH_ABOVE = 2.2;

/**
 * Local slope, as rise over run, from four samples around the point.
 *
 * Sampled at 24 m because that is about the width of a street: slope measured
 * over a metre is noise, and slope measured over 200 m misses the bank a road
 * would actually have to climb.
 */
export function slopeAt(heightAt, x, z, d = 24) {
  const hx = (heightAt(x + d, z) - heightAt(x - d, z)) / (2 * d);
  const hz = (heightAt(x, z + d) - heightAt(x, z - d)) / (2 * d);
  return Math.hypot(hx, hz);
}

/**
 * What is at this point?
 *
 * `reserved` is a caller-supplied predicate for ground that has been set aside
 * -- parks, foreshore, bridge approaches. It is a parameter rather than a
 * lookup so this file stays free of the plan's own data and can be tested on
 * its own.
 */
export function classifyAt(heightAt, x, z, reserved = null) {
  const h = heightAt(x, z);
  if (h < 0) return { use: USE.WATER, h, slope: 0 };
  if (h < BEACH_ABOVE) return { use: USE.BEACH, h, slope: 0 };

  const slope = slopeAt(heightAt, x, z);
  if (slope >= SLOPE.CLIFF) return { use: USE.CLIFF, h, slope };
  if (reserved && reserved(x, z)) return { use: USE.RESERVED, h, slope };
  if (slope >= SLOPE.BUILD_MAX) return { use: USE.STEEP, h, slope };
  return { use: USE.BUILDABLE, h, slope };
}

/**
 * May a road run through this point?
 *
 * A road is more demanding than a building: a building can sit on a terrace cut
 * into a slope, a road has to be driveable along its length. It also must not
 * cross a beach -- the foreshore is public, and a street running onto sand is
 * the single most obviously wrong thing in a coastal city.
 */
export function roadAllowedAt(heightAt, x, z, reserved = null) {
  const c = classifyAt(heightAt, x, z, reserved);
  if (c.use === USE.WATER || c.use === USE.BEACH) return { ok: false, reason: c.use, ...c };
  if (c.use === USE.CLIFF) return { ok: false, reason: "cliff", ...c };
  if (c.slope > SLOPE.ROAD_MAX) return { ok: false, reason: "too steep", ...c };
  return { ok: true, ...c };
}

/** May a building stand here? */
export function buildAllowedAt(heightAt, x, z, reserved = null) {
  const c = classifyAt(heightAt, x, z, reserved);
  if (c.use === USE.BUILDABLE) return { ok: true, ...c };
  return { ok: false, reason: c.use, ...c };
}

/**
 * Would a road along this line be driveable end to end?
 *
 * Checks the whole run rather than its ends, because the ends are exactly where
 * a road is most likely to be fine while the middle climbs a bank. Returns the
 * longest driveable sub-run, so a caller can shorten a road instead of losing
 * it -- which is what a city does: the street stops at the foot of the hill.
 */
export function driveableRun(heightAt, axis, at, from, to, reserved = null, step = 30) {
  let bestFrom = null, bestTo = null, bestLen = 0;
  let runFrom = null, last = null;
  for (let t = from; t <= to + step * 0.5; t += step) {
    const tt = Math.min(t, to);
    const x = axis === "ew" ? tt : at;
    const z = axis === "ew" ? at : tt;
    const ok = roadAllowedAt(heightAt, x, z, reserved).ok;
    if (ok && runFrom === null) runFrom = tt;
    if (!ok && runFrom !== null) {
      if (last - runFrom > bestLen) { bestLen = last - runFrom; bestFrom = runFrom; bestTo = last; }
      runFrom = null;
    }
    if (ok) last = tt;
  }
  if (runFrom !== null && last - runFrom > bestLen) { bestLen = last - runFrom; bestFrom = runFrom; bestTo = last; }
  return bestLen > 0 ? { from: bestFrom, to: bestTo, length: bestLen } : null;
}

// =============================================================================
// DEMAND
//
// Where a city is dense, and why.
//
// Real density is not a noise field: it is highest where the value is, and the
// value is at the water and at the places you can get to. So demand is built
// from three things a person would actually name --
//
//   1. THE WATER. Waterfront is the most sought-after land there is. Demand
//      falls off inland from the shore.
//   2. THE CORES. Downtown and each island's centre.
//   3. THE CONNECTIONS. Bridgeheads and interchanges -- the points where a
//      place joins the rest of the world. Density is high around them and fans
//      out, lighter and lower, with distance.
//
// -- and then thinned by a slow noise so the contours are not perfect ellipses.
// =============================================================================

const falloff = (d, r) => (d >= r ? 0 : Math.pow(1 - d / r, 1.7));

/**
 * @param {{x:number,z:number,weight:number,radius:number}[]} cores
 * @param {{x:number,z:number,weight:number,radius:number}[]} gateways
 * @param {(x:number,z:number)=>number} distToWater  metres to the nearest shore
 */
export function makeDemand({ cores = [], gateways = [], distToWater = null, noise = null }) {
  return function demandAt(x, z) {
    let d = 0;
    for (const c of cores) d = Math.max(d, c.weight * falloff(Math.hypot(x - c.x, z - c.z), c.radius));
    for (const g of gateways) d = Math.max(d, g.weight * falloff(Math.hypot(x - g.x, z - g.z), g.radius));

    // The waterfront premium. Additive rather than max: being near the water
    // makes a place more valuable wherever it already is, rather than replacing
    // the reason it was valuable.
    if (distToWater) {
      const w = distToWater(x, z);
      d += 0.34 * falloff(w, 900);
    }
    if (noise) d *= 0.78 + 0.44 * noise(x, z);
    return d < 0 ? 0 : d > 1 ? 1 : d;
  };
}
