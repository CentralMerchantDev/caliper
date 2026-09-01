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

// =============================================================================
// ASK THE LAND WHERE SOMETHING GOES
//
// Landmarks were placed at literal coordinates: the stadium at (1700, 250), the
// cathedral at (-100, -40). A literal cannot be wrong in an obvious way -- it is
// just a number, and it looks equally plausible whether the ground under it is a
// hill or the harbour. So nobody noticed that in the shipped world the stadium
// stood at -7.0 m and the cathedral at -4.1 m. Both were, and had always been,
// in the water.
//
// That is not a scaling bug -- it survived the scaling perfectly, because a
// wrong coordinate scales to a proportionally wrong coordinate. It is the cost
// of asserting a position instead of requesting one.
//
// findSite() takes where you WANT a thing and returns the nearest place it can
// actually go, searching outward in rings. It reports how far it had to move, so
// a caller can tell the difference between "as drawn" and "nudged 300 m", and it
// returns null rather than a guess when there is nowhere suitable -- which the
// caller must then handle, instead of building over water.
// =============================================================================

/**
 * The nearest point to `want` where a footprint of `w` x `d` metres is entirely
 * on ground that satisfies `use`.
 *
 * @returns {{x, z, moved, h} | null}
 */
export function findSite(heightAt, want, opts = {}) {
  const {
    w = 0, d = 0,
    radius = 1500,
    step = 40,
    use = USE.BUILDABLE,
    reserved = null,
    // Maximum height variation tolerated across the footprint, in metres.
    // Some things need level ground in a way that "not too steep" does not
    // capture: a runway is a 3.4 km FLAT PLANE, and slope-per-metre can be
    // gentle the whole way while the two ends still differ by 40 m.
    maxRange = Infinity,
    // Sampling interval for the flatness test. Corners alone cannot see a rise
    // in the middle of a 3 km footprint.
    grade = 120,
  } = opts;

  /** Height variation across a footprint, sampled along both axes. */
  const rangeAt = (cx, cz) => {
    if (maxRange === Infinity || (!w && !d)) return 0;
    let mn = Infinity, mx = -Infinity;
    const nx = Math.max(2, Math.ceil(w / grade));
    const nz = Math.max(2, Math.ceil(d / grade));
    for (let i = 0; i <= nx; i++) {
      for (let j = 0; j <= nz; j++) {
        const x = cx - w / 2 + (w * i) / nx;
        const z = cz - d / 2 + (d * j) / nz;
        const h = heightAt(x, z);
        if (h < mn) mn = h;
        if (h > mx) mx = h;
      }
    }
    return mx - mn;
  };

  const fits = (cx, cz) => {
    // Corners AND centre. A centre-only test is how a stadium ends up with two
    // stands on the beach; corner-only misses a creek up the middle.
    const hw = w / 2, hd = d / 2;
    const pts = w || d
      ? [[cx, cz], [cx - hw, cz - hd], [cx + hw, cz - hd], [cx - hw, cz + hd], [cx + hw, cz + hd],
         [cx, cz - hd], [cx, cz + hd], [cx - hw, cz], [cx + hw, cz]]
      : [[cx, cz]];
    for (const [x, z] of pts) {
      if (classifyAt(heightAt, x, z, reserved).use !== use) return false;
    }
    return rangeAt(cx, cz) <= maxRange;
  };

  if (fits(want.x, want.z)) {
    return { x: want.x, z: want.z, moved: 0, h: heightAt(want.x, want.z), range: rangeAt(want.x, want.z) };
  }

  // Ring search outward, so the first hit is the closest legal site rather than
  // whichever direction happened to be tested first.
  for (let r = step; r <= radius; r += step) {
    const n = Math.max(8, Math.round((2 * Math.PI * r) / step));
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / n;
      const x = want.x + Math.cos(a) * r;
      const z = want.z + Math.sin(a) * r;
      if (fits(x, z)) return { x, z, moved: r, h: heightAt(x, z), range: rangeAt(x, z) };
    }
  }
  return null;   // nowhere within radius: the caller must not build
}


/**
 * The FLATTEST legal site within range, rather than the nearest.
 *
 * findSite() returns the first site that satisfies its constraints, which is
 * right for a building that simply has to be on dry land. It is wrong for
 * anything that needs level ground, because "first acceptable" and "best
 * available" are different questions and there may be no acceptable site at all.
 *
 * Measured on this world: a 3.4 km runway needs a flat plane, and the flattest
 * dry 3.4 km run ANYWHERE varies by 11.3 m. There is no site that satisfies a
 * hard flatness constraint, so asking for one returns null and builds nothing --
 * which is honest but leaves the world without an airport.
 *
 * Real airports answer this with earthworks: they are enormous graded platforms
 * cut into and built out of the landscape. So this returns the best available
 * site AND the height variation it will have to absorb, and the caller grades a
 * platform to swallow it.
 */
export function findFlattestSite(heightAt, want, opts = {}) {
  const { radius = 6000, step = 150, w = 0, d = 0, grade = 150, use = USE.BUILDABLE, reserved = null } = opts;
  let best = null;

  const consider = (x, z) => {
    // every corner and edge must be legal ground before flatness matters
    const hw = w / 2, hd = d / 2;
    for (const [px, pz] of [[x, z], [x - hw, z - hd], [x + hw, z - hd],
                            [x - hw, z + hd], [x + hw, z + hd],
                            [x, z - hd], [x, z + hd], [x - hw, z], [x + hw, z]]) {
      if (classifyAt(heightAt, px, pz, reserved).use !== use) return;
    }
    let mn = Infinity, mx = -Infinity, sum = 0, n = 0;
    const nx = Math.max(2, Math.ceil(w / grade));
    const nz = Math.max(2, Math.ceil(d / grade));
    for (let i = 0; i <= nx; i++) {
      for (let j = 0; j <= nz; j++) {
        const px = x - hw + (w * i) / nx;
        const pz = z - hd + (d * j) / nz;
        const h = heightAt(px, pz);
        if (h < mn) mn = h;
        if (h > mx) mx = h;
        sum += h; n++;
      }
    }
    const range = mx - mn;
    if (!best || range < best.range) {
      best = { x, z, range, min: mn, max: mx, mean: sum / n,
               moved: Math.hypot(x - want.x, z - want.z) };
    }
  };

  consider(want.x, want.z);
  for (let r = step; r <= radius; r += step) {
    const n = Math.max(8, Math.round((2 * Math.PI * r) / step));
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / n;
      consider(want.x + Math.cos(a) * r, want.z + Math.sin(a) * r);
    }
  }
  return best;
}
