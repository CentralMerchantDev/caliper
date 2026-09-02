import { gradeRun } from "./grade.js";
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
// ONE LIMIT FOR EVERY ROAD WAS WRONG, AND IT DISAGREED WITH THE ALIGNMENT.
//
// ROAD_MAX was a single 0.13 applied to freeways, arterials and back lanes
// alike. Against AASHTO's actual table (see docs/CITY-PLANNING-SPEC.md §1.4)
// that is roughly right for a local street, far too permissive for an arterial,
// and three times too permissive for a freeway:
//
//     local residential      < 15%      (AASHTO, urban local streets)
//     local commercial       <  8%
//     urban arterial          5-11%     depending on terrain and design speed
//     urban freeway           3-6%      (+1% in mountainous or constrained urban)
//
// It also disagreed with grade.js, which already varies the DESIGN gradient by
// class. Placement said a freeway could climb 13%; its own alignment then tried
// to hold 4% and had to spend its whole earthworks budget fighting ground it
// should never have been put on.
//
// These two numbers are not the same thing and both are needed. ROAD_SLOPE_MAX
// is the LEGAL CEILING -- may a road of this class exist on this ground at all.
// ROAD_GRADE.maxGrade in grade.js is the DESIGN GRADIENT -- what the surveyed
// alignment actually holds. Real road building draws exactly this distinction.
export const ROAD_SLOPE_MAX = {
  FREEWAY:   0.06,   // AASHTO urban freeway, mountainous, with the +1% allowance
  RAMP:      0.08,
  BOULEVARD: 0.09,   // urban arterial, rolling terrain
  AVENUE:    0.11,   // urban arterial, mountainous
  STREET:    0.15,   // AASHTO local residential ceiling
  LANE:      0.15,
  ALLEY:     0.15,
};

export const SLOPE = {
  ROAD_MAX: 0.13,      // fallback where a class is not given; see ROAD_SLOPE_MAX
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
export function roadAllowedAt(heightAt, x, z, reserved = null, cls = null) {
  const c = classifyAt(heightAt, x, z, reserved);
  if (c.use === USE.WATER || c.use === USE.BEACH) return { ok: false, reason: c.use, ...c };
  if (c.use === USE.CLIFF) return { ok: false, reason: "cliff", ...c };
  const limit = (cls && ROAD_SLOPE_MAX[cls]) || SLOPE.ROAD_MAX;
  if (c.slope > limit) return { ok: false, reason: "too steep", ...c };
  return { ok: true, ...c };
}

/** May a building stand here? */
export function buildAllowedAt(heightAt, x, z, reserved = null) {
  const c = classifyAt(heightAt, x, z, reserved);
  if (c.use === USE.BUILDABLE) return { ok: true, ...c };
  return { ok: false, reason: c.use, ...c };
}

/*
 * driveableRun() was here. It walked a run and returned the longest contiguous
 * stretch a road could legally occupy -- a good idea that nothing ever called.
 * clipRoadToLand in city-plan.js reimplements the same notion with its own step
 * and minimum-run constants, which is the duplication driveableRun would have
 * prevented if it had been wired in.
 *
 * Deleted rather than kept, for a specific reason: it took a `cls` argument and
 * then called roadAllowedAt WITHOUT it, so it would silently have applied the
 * 0.13 global fallback instead of the per-class ceiling its caller asked for.
 * Dead code that would be wrong if revived is worse than no code.
 */


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

  /**
   * Height variation across a footprint, sampled along both axes.
   *
   * This used to short-circuit to 0 whenever maxRange was Infinity -- which is
   * the default and which no caller ever overrode -- and the result was then
   * RETURNED AS `range`, as though it had been measured. Every feature reported
   * range: 0. Golf actually spans 108 m of relief, farmWest 70.6 m. The number
   * the module published about its own placement was a constant.
   *
   * Now it is always measured. The maxRange short-circuit only skips the
   * CONSTRAINT, never the measurement, because a caller that does not constrain
   * flatness still deserves to be told what it got.
   */
  const rangeAt = (cx, cz) => {
    if (!w && !d) return 0;
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
    // NINE POINTS CANNOT SEE INSIDE A 3.6 KM FOOTPRINT.
    //
    // This tested the centre, four corners and four edge midpoints, then measured
    // flatness on a separate grid. For a building that is fine. For an airport
    // platform 3,600 x 1,200 m it is not: the nine points passed while a proper
    // sample of the same rectangle found 8 points below the waterline and 92 on
    // beach. The platform had water in it and neither the search nor the test
    // could see it.
    //
    // Legality is now checked on the SAME grid the flatness measurement walks,
    // so every point that contributes to the answer has also been vetted. One
    // pass, no second sampling density to drift out of step with the first.
    const hw = w / 2, hd = d / 2;
    let mn = Infinity, mx = -Infinity, sum = 0, n = 0;
    const nx = Math.max(2, Math.ceil(w / grade));
    const nz = Math.max(2, Math.ceil(d / grade));
    for (let i = 0; i <= nx; i++) {
      for (let j = 0; j <= nz; j++) {
        const px = x - hw + (w * i) / nx;
        const pz = z - hd + (d * j) / nz;
        if (classifyAt(heightAt, px, pz, reserved).use !== use) return;
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

/**
 * A QUAY: a run of shoreline where land meets water deep enough to berth in.
 *
 * The container port was six literals -- a stack area, a crane line, and a quay
 * found by marching north from a hard-coded z until the ground came up. The
 * comment on the crane loop openly concedes the previous hard-coded z "stood in
 * open water" and fixes it by searching, which is a private, worse
 * reimplementation of the question this answers properly.
 *
 * A port is not defined by its coordinates. It is defined by needing a straight
 * edge of dry land with navigable water against it, and that is what this looks
 * for: it walks candidate shorelines and returns the best run, or null.
 *
 * @returns {{x, z, along, landSide, depth, length} | null}
 *          `along` is the axis the quay edge runs along; `landSide` is +1 or -1,
 *          the direction from the quay into dry land.
 */
export function findQuay(heightAt, want, opts = {}) {
  const {
    length = 600,      // metres of berth needed
    minDepth = 8,      // metres of water a ship needs alongside
    reach = 120,       // how far out to look for that depth
    radius = 2500,
    step = 80,
    along = "ew",      // the quay edge runs east-west
  } = opts;

  const ew = along === "ew";
  let best = null;

  const score = (cx, cz) => {
    // For each landSide, test whether the whole run has dry land on one side and
    // deep water within reach on the other.
    for (const side of [1, -1]) {
      let ok = 0, total = 0, deepest = 0;
      for (let t = -length / 2; t <= length / 2; t += step) {
        total++;
        const x = ew ? cx + t : cx;
        const z = ew ? cz : cz + t;
        // dry, buildable land just inland
        const lx = ew ? x : x + side * 40;
        const lz = ew ? z + side * 40 : z;
        if (classifyAt(heightAt, lx, lz).use !== USE.BUILDABLE) continue;
        // navigable water just outside
        let depth = 0;
        for (let r = 30; r <= reach; r += 20) {
          const wx = ew ? x : x - side * r;
          const wz = ew ? z - side * r : z;
          const h = heightAt(wx, wz);
          if (h < -depth) depth = -h;
        }
        if (depth < minDepth) continue;
        ok++;
        if (depth > deepest) deepest = depth;
      }
      const frac = total ? ok / total : 0;
      if (frac < 0.8) continue;
      const dist = Math.hypot(cx - want.x, cz - want.z);
      const cand = { x: cx, z: cz, along, landSide: side, depth: deepest, length, frac, moved: dist };
      if (!best || dist < best.moved) best = cand;
    }
  };

  score(want.x, want.z);
  for (let r = step; r <= radius && !best; r += step) {
    const n = Math.max(8, Math.round((2 * Math.PI * r) / step));
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / n;
      score(want.x + Math.cos(a) * r, want.z + Math.sin(a) * r);
    }
  }
  return best;
}

/**
 * A CORRIDOR: a long run a railway could actually be built along.
 *
 * The first version of this scored candidate routes on how much of the line was
 * DRY. It approved the drawn route at 100% on land and handed back a profile
 * that still reached 11.2% -- four times the adhesion limit. A line can be
 * entirely on land and completely unbuildable, because rail is limited by
 * GRADIENT, not by wetness.
 *
 * The second version scored on the achievable gradient. That was right at the
 * time and is now redundant: gradeRun finishes on its gradient pass, so every
 * corridor holds the limit. What differs between them is what holding it COSTS.
 * A route needing 41 m of cutting and one needing 27 m are both buildable and
 * are not equally good -- the earthworks bill is the entire reason real
 * alignments are surveyed rather than drawn straight.
 *
 * So: reject what is wet, then choose on earthworks.
 */
export function findCorridor(heightAt, want, opts = {}) {
  const {
    axis = "ew", from, to,
    step = 60,
    search = 2400,
    searchStep = 160,
    maxGrade = 0.025,   // adhesion rail; docs/CITY-PLANNING-SPEC.md §4.1
    maxDev = 30,        // metres of embankment or cutting the budget allows
    gradeWindow = 900,
  } = opts;

  const ew = axis === "ew";
  let best = null;

  for (let off = 0; Math.abs(off) <= search; off = off <= 0 ? -off + searchStep : -off) {
    const at = (ew ? want.z : want.x) + off;

    let on = 0, total = 0;
    for (let t = from; t <= to; t += step) {
      total++;
      const h = heightAt(ew ? t : at, ew ? at : t);
      if (h >= 2 && h <= 240) on++;
    }
    const onLand = total ? on / total : 0;
    if (onLand < 0.85) continue;

    const g = gradeRun(heightAt, { axis, at, from, to },
                       { step: 40, window: gradeWindow, maxGrade, maxDev });
    const earthworks = Math.max(g.maxFill, g.maxCut);

    const cand = {
      at, axis, from, to, onLand,
      worstGrade: g.worstGrade,
      holdsGrade: g.holdsGrade,
      // A 35% overrun on the budget is still a railway. Past that it is a
      // viaduct or a tunnel, which this does not model, so it is not "buildable".
      buildable: g.holdsGrade && earthworks <= maxDev * 1.35,
      maxFill: g.maxFill, maxCut: g.maxCut, earthworks,
      moved: Math.abs(off),
    };

    if (!best) best = cand;
    else if (cand.buildable && !best.buildable) best = cand;
    else if (cand.buildable === best.buildable) {
      // Among buildable routes prefer the cheaper one, and break ties toward
      // where it was drawn. Among unbuildable ones, the least bad.
      const better = cand.earthworks < best.earthworks - 0.5
        || (Math.abs(cand.earthworks - best.earthworks) <= 0.5 && cand.moved < best.moved);
      if (better) best = cand;
    }
  }
  return best;
}
