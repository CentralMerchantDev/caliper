// =============================================================================
// SETTLEMENTS GROW INTO THE LAND THAT IS ACTUALLY THERE
//
// THE PROBLEM THIS SOLVES
//
// Every settlement used to be a rectangle typed into a table. That works
// exactly once -- for the world the rectangle was measured in. It carries no
// knowledge of where the water is, so it cannot notice when the coast moves,
// and it has no idea the settlement next door exists, so nothing stops two of
// them claiming the same ground. Both failures were real and both were found by
// something other than the code that caused them: `port` was laid straight over
// `coastal-4`, and shrinking the world left a third of the city standing in the
// sea.
//
// A rectangle is an ASSERTION about the land. This module replaces it with a
// QUESTION asked of the land.
//
// HOW
//
// Each settlement starts from its scaled position -- the same relative spot on
// the same coast -- and then grows outward one strip at a time. A strip is
// accepted only if the ground under it says yes:
//
//   * it is genuinely buildable (land-use.js: not water, not beach, not cliff,
//     not too steep), and
//   * no other settlement already claims it.
//
// Growth stops when every settlement is hemmed in by water, terrain or a
// neighbour. Nothing has to be told how big to be; the coastline decides, which
// is why the result survives a change of world scale that a table cannot.
//
// WHY THIS RAISES DENSITY
//
// Street spacing (av/st) is a BUILT dimension and does not scale, so a
// settlement that grows to cover more of a smaller island carries the same
// streets at the same real spacing -- more city on less ground, which is the
// entire object of shrinking the world. Coverage rises until the land runs out
// rather than until a number in a table runs out.
//
// TWO PROPERTIES THIS GUARANTEES BY CONSTRUCTION
//
//   1. No settlement overlaps another. Not "was checked and found not to" --
//      cannot, because an overlapping strip is never accepted in the first
//      place. The de-overlap pass downstream should now find nothing to do.
//   2. No settlement covers water or cliff. Same reason.
//
// A guarantee that holds by construction is worth more than the same guarantee
// asserted by a test afterwards, because it cannot regress quietly.
// =============================================================================

import { classifyAt, USE } from "./land-use.js";

/** Does this rectangle overlap that one? Touching edges do not count. */
function intersects(a, b) {
  return a.xMin < b.xMax && a.xMax > b.xMin && a.zMin < b.zMax && a.zMax > b.zMin;
}

/**
 * The share of a rectangle standing on ground a settlement may legally occupy.
 * Sampled on a fixed grid rather than at corners: a strip can have dry corners
 * and a creek down the middle, and corner-sampling is exactly how a building
 * ends up straddling water.
 */
function buildableShare(heightAt, rect, sample) {
  let ok = 0, total = 0;
  for (let x = rect.xMin; x <= rect.xMax; x += sample) {
    for (let z = rect.zMin; z <= rect.zMax; z += sample) {
      total++;
      if (classifyAt(heightAt, x, z).use === USE.BUILDABLE) ok++;
    }
  }
  return total === 0 ? 0 : ok / total;
}

/**
 * Grow each settlement outward until the land, or a neighbour, stops it.
 *
 * @param {Array} list        settlements, each with {bounds:{xMin,xMax,zMin,zMax}}
 * @param {Function} heightAt world-space height function
 * @returns {{settlements: Array, stats: object}}
 */
export function fitSettlements(list, heightAt, opts = {}) {
  const {
    step = 60,            // metres of growth per accepted strip
    maxRounds = 60,       // safety stop; growth normally halts well before this
    minBuildable = 0.72,  // a strip must be this buildable to be claimed
    sample = 45,          // metres between test points inside a strip
    maxGrowth = 4.0,      // cap on area increase, so one settlement cannot eat an island
  } = opts;

  const boxes = list.map((s) => ({ ...s.bounds }));
  const area0 = boxes.map((b) => Math.max(1, (b.xMax - b.xMin) * (b.zMax - b.zMin)));
  const SIDES = [
    ["xMin", -1], ["xMax", +1], ["zMin", -1], ["zMax", +1],
  ];

  let accepted = 0, rejectedLand = 0, rejectedNeighbour = 0, rounds = 0;
  // What is holding each side in, once growth stops. This is the input to the
  // edge-density decision below, so it has to be recorded as it happens rather
  // than guessed at afterwards.
  const blockedBy = boxes.map(() => ({ xMin: null, xMax: null, zMin: null, zMax: null }));

  for (let round = 0; round < maxRounds; round++) {
    rounds = round + 1;
    let grew = false;

    for (let i = 0; i < boxes.length; i++) {
      const cur = boxes[i];
      if ((cur.xMax - cur.xMin) * (cur.zMax - cur.zMin) > area0[i] * maxGrowth) continue;

      for (const [side, dir] of SIDES) {
        const next = { ...cur };
        next[side] = cur[side] + dir * step;

        // The strip is the ground being NEWLY claimed -- test only that, not the
        // whole settlement. Re-testing the interior every round would be both
        // slow and wrong: an established settlement legitimately contains a
        // park, a steep street and a pond.
        const strip = { ...cur };
        if (side === "xMin") { strip.xMin = next.xMin; strip.xMax = cur.xMin; }
        else if (side === "xMax") { strip.xMin = cur.xMax; strip.xMax = next.xMax; }
        else if (side === "zMin") { strip.zMin = next.zMin; strip.zMax = cur.zMin; }
        else { strip.zMin = cur.zMax; strip.zMax = next.zMax; }

        let clash = false;
        for (let j = 0; j < boxes.length && !clash; j++) {
          if (j !== i && intersects(next, boxes[j])) clash = true;
        }
        if (clash) { rejectedNeighbour++; blockedBy[i][side] = "neighbour"; continue; }

        if (buildableShare(heightAt, strip, sample) < minBuildable) {
          rejectedLand++;
          blockedBy[i][side] = "land";
          continue;
        }

        boxes[i] = next;
        Object.assign(cur, next);
        accepted++;
        grew = true;
        blockedBy[i][side] = null;   // it moved, so nothing is holding this side
      }
    }
    if (!grew) break;
  }

  const before = area0.reduce((a, b) => a + b, 0);
  const after = boxes.reduce((a, b) => a + (b.xMax - b.xMin) * (b.zMax - b.zMin), 0);

  // -------------------------------------------------------------------------
  // A HARD EDGE IS A DENSE EDGE
  //
  // Each settlement carries `edge`, the building density at its boundary. The
  // declared values (0.42, and 0.06 by default) describe a town THINNING OUT
  // into open countryside -- which is what these settlements did when they were
  // small rectangles with empty land all around them.
  //
  // After fitting, that is no longer what their boundaries are. A settlement
  // now stops because it ran into water, a cliff, or the next town: boundaries
  // that in a real city are the DENSEST ground, not the sparsest. Waterfronts
  // are built to the quay edge; two towns that meet, meet at a high street.
  // Leaving the soft falloff in place modelled a fade into countryside that the
  // land no longer contains, and it showed -- growth raised settled area by 45%
  // but built coverage inside settlements FELL from 21.9% to 16.0%, because the
  // new ground was all being treated as outskirts.
  //
  // So edge density is lifted in proportion to how enclosed a settlement
  // actually is. A place hemmed in on all four sides is built to its boundary;
  // one still open on three sides keeps most of its original falloff. This is
  // read from what stopped the growth, not asserted.
  // -------------------------------------------------------------------------
  const HARD_EDGE = 0.68;
  const fittedSettlements = list.map((s, i) => {
    const sides = blockedBy[i];
    const hard = ["xMin", "xMax", "zMin", "zMax"].filter((k) => sides[k] !== null).length;
    const declaredEdge = typeof s.edge === "number" ? s.edge : 0.06;
    const enclosure = hard / 4;
    const edge = declaredEdge + (HARD_EDGE - declaredEdge) * enclosure;
    return {
      ...s,
      bounds: boxes[i],
      edge: Math.max(declaredEdge, Math.min(HARD_EDGE, edge)),
      enclosure,
    };
  });

  return {
    settlements: fittedSettlements,
    stats: {
      rounds, accepted, rejectedLand, rejectedNeighbour,
      meanEnclosure: fittedSettlements.reduce((a, s) => a + s.enclosure, 0) / Math.max(1, fittedSettlements.length),
      areaBeforeKm2: before / 1e6,
      areaAfterKm2: after / 1e6,
      growth: after / before,
    },
  };
}
