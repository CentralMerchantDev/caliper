// =============================================================================
// WHAT A PLACE IS, DERIVED FROM WHERE IT IS
//
// THE ASSERTION THIS REPLACES
//
// Every settlement carried a literal character: `cls: "TOWER"`, `cls: "FARM"`,
// `cls: "WAREHOUSE"`. SETTLEMENT_MIX then expanded that into what fronts the
// arterial, what sits on the high street, and what fills the fabric behind.
//
// The expansion is good. The input was a guess. Nothing connected `port` being
// WAREHOUSE to there being a port there -- the two facts sat in different tables
// and agreed only because someone typed them to agree. Move the port (which this
// build did, 542 m, because its basin was on a hillside) and the warehouses stay
// where they were. Change the world scale and the farm belt is still a farm belt
// wherever it lands. The character was never a property of the ground.
//
// WHAT REAL CITIES DO
//
// Land use is not distributed at random and it is not decreed uniformly either.
// It follows a small number of forces that are all measurable here
// (docs/CITY-PLANNING-SPEC.md §5):
//
//   * HEAVY INDUSTRY GOES TO THE QUAY. Draught is the binding constraint and few
//     sites have it, so steel, ore, refining and grain must sit at the berth --
//     the alternative is transhipping the world's cheapest cargo. Everything
//     that serves the port then clusters behind it, because a single 20,000 TEU
//     call generates a land-transport queue 30 km long.
//   * FREIGHT RAIL JOINS THEM. The corridor is what carries that queue, so
//     warehousing follows the line where it passes near the port.
//   * DENSITY FALLS FROM THE CORE. The oldest and least controversial gradient
//     in urban form.
//   * THE WATERFRONT CARRIES A PREMIUM, until it is working waterfront, at which
//     point it carries cranes instead.
//   * THE EDGE IS AGRICULTURAL. Not because farms are pushed out, but because
//     nothing else outbids them there.
//
// So this asks the same question of every point -- what would be built here? --
// and answers it from the port, the rail, the core, the water and the ground.
// The character becomes a consequence. Move the port and the warehouses follow
// it, because they were never anywhere else: they were always "next to the port".
//
// ============================ READ THIS FIRST ================================
// THIS IS A LAYOUT HINT, NOT A PLANNING CODE. IT MUST NEVER GATE AN EDIT.
//
// The city exists to be edited by an AI coding agent. If zoning became a rule
// the agent had to satisfy, two bad things follow immediately: the game gets
// boring, because "put a tower on the beach" comes back refused for a policy
// reason rather than a physical one; and every interesting request turns into a
// constraint the agent has to work around rather than a change it can make.
//
// So this runs ONCE, at world generation, to decide what the initial city looks
// like. Nothing downstream consults it. Verified: zoning.js is imported only by
// city-plan.js and the tests -- src/ (the pipeline) and the edit path in
// world-render-3d.js never reference it.
//
// Refusals in this project are about PHYSICAL reality: that ground is
// underwater, that slope is a cliff, that footprint has no dry corner. Those
// come from land-use.js and footprint.js and they are worth refusing over,
// because they produce a building standing in the sea. "The zoning says
// residential" is not in that category and must not be added to it.
//
// If you find yourself importing this file into the pipeline, stop.
// =============================================================================
//
// This module imports no renderer and no terrain internals. It is a pure
// function of position and the resolved feature sites, so it can be tested
// without building a world.
// =============================================================================

import { classifyAt, USE, slopeAt } from "./land-use.js";

/**
 * Thresholds on the demand field, which already encodes distance to the core,
 * the waterfront premium and the bridge gateways. These are the density bands,
 * and they are dimensionless, so they do not scale with the world.
 */
// CALIBRATED AGAINST THE DEMAND FIELD, NOT GUESSED.
//
// The first version of these was invented, and it was worse than the hand-typed
// values it replaced: 45 of 55 settlements changed character, towns became
// farms, and a tower district became a resort. Guessing thresholds for a field
// whose distribution you have not looked at is how that happens.
//
// Measured across the 18,775 plots that are actually built on:
//
//     p40 0.082   p50 0.157   p60 0.202   p75 0.377
//     p85 0.503   p92 0.591   p97 0.698   p99.5 0.860
//
// So these bands are set from percentiles, to give the shape a real city has --
// a small dense core, a broad middle, and a low-rise majority:
//
//     TOWER      top ~1%     MIDRISE  top ~10%
//     TERRACE    top ~35%    TOWNHOUSE top ~70%
//
// Note the bottom 40% of built ground sits at essentially zero demand. That is
// the outer coast and the islands, and it is why the lowest band has to be near
// zero: set it at 0.08 and every genuine village outside the bay reads as
// farmland.
export const DENSITY_BANDS = [
  { above: 0.80, cls: "TOWER" },
  { above: 0.56, cls: "MIDRISE" },
  { above: 0.25, cls: "TERRACE" },
  { above: 0.06, cls: "TOWNHOUSE" },
  { above: 0.004, cls: "VILLA" },
];

// STREET SPACING FOLLOWS THE CHARACTER, BECAUSE THE BLOCK IS THE CHARACTER.
//
// This was the defect the zoning change introduced and the block test failed to
// catch. Deriving the character without deriving the SPACING left settlements
// whose content was re-zoned VILLA still laid out on the 420 m block grid their
// declared FARM character had given them -- 141 walkable blocks over the ITE
// 183 m ceiling, the worst at 432 m, while the test reported zero because it was
// reading the declared class the derivation had superseded.
//
// A block IS the character. Farm parcels are big because fields are big; a
// terrace street is close-grained because terraces are. So the two are derived
// together, from one place, and the walkable classes are all set inside the
// ceiling by construction rather than checked against it afterwards.
// (docs/CITY-PLANNING-SPEC.md §1.3: desirable 61-122 m, ceiling 183 m.)
export const CHARACTER_SPACING = {
  TOWER:     { av: 150, st: 110 },   // dense core, finest grain
  MIDRISE:   { av: 155, st: 115 },
  TERRACE:   { av: 165, st: 120 },
  TOWNHOUSE: { av: 175, st: 130 },
  VILLA:     { av: 180, st: 140 },
  RESORT:    { av: 180, st: 145 },
  // Not pedestrian fabric. A container yard and a field are legitimately coarse,
  // and the block test exempts exactly these three for that reason.
  WAREHOUSE: { av: 300, st: 220 },
  FARM:      { av: 420, st: 330 },
  HANGAR:    { av: 460, st: 340 },
};

/** How far the working land behind a quay reaches inland, in metres. */
export const PORT_BACKUP_DEPTH = 550;   // PIANC-derived median; spec §2.2

/** How close to the freight line warehousing clusters, and how near the port it must be. */
export const RAIL_INDUSTRY_BAND = 400;
export const RAIL_PORT_REACH = 3000;

/**
 * Build a zoning function for this world.
 *
 * @param {object} ctx  { heightAt, demandAt, sites }  sites from placeFeatures()
 * @returns {(x:number, z:number) => string}  a SETTLEMENT_MIX character key
 */
export function makeZoning({ heightAt, demandAt, sites = {} }) {
  const port = sites.containerPort || null;
  const airport = sites.airport || null;
  const rail = sites.railway || null;

  /** Metres from the working port, or Infinity if there is no port. */
  const distToPort = (x, z) => (port ? Math.hypot(x - port.x, z - port.z) : Infinity);

  return function zoneAt(x, z) {
    // ---- 1. SPECIAL-PURPOSE LAND, which outranks everything ----
    //
    // An airport is not a dense district that happens to be near a runway. It is
    // a use that excludes all others inside its fence, and it is derived from
    // the platform that was actually graded, not from a remembered coordinate.
    if (airport) {
      const dx = Math.abs(x - airport.x), dz = Math.abs(z - airport.z);
      if (dx < 2200 && dz < 900) return "HANGAR";
    }

    // ---- 2. THE PORT, AND THE LAND THAT SERVES IT ----
    //
    // Back-up land sits BEHIND the quay -- on the landward side -- because that
    // is the only place a container yard can be. Using distance alone would put
    // warehouses in the water.
    if (port) {
      const behind = (z - port.z) * port.landSide;    // positive = inland of the quay
      const along = Math.abs(x - port.x);
      if (behind > -60 && behind < PORT_BACKUP_DEPTH && along < 1100) return "WAREHOUSE";
    }

    // ---- 3. FREIGHT RAIL NEAR THE PORT ----
    //
    // Warehousing follows the line, but only where the line is near the port.
    // Rail passing through open country 15 km away is a railway, not an
    // industrial estate -- which is why RAIL_PORT_REACH exists.
    if (rail && port) {
      const toRail = Math.abs(z - rail.at);
      if (toRail < RAIL_INDUSTRY_BAND && distToPort(x, z) < RAIL_PORT_REACH) return "WAREHOUSE";
    }

    // ---- 4. GROUND THAT REFUSES DENSITY ----
    //
    // Steep land does not carry towers anywhere, whatever the demand says. This
    // is not a planning preference, it is what the slope allows.
    const c = classifyAt(heightAt, x, z);
    if (c.use === USE.WATER || c.use === USE.CLIFF) return "FARM";   // nothing is built
    const steep = c.slope > 0.16;

    // ---- 5. DENSITY FROM DEMAND ----
    const d = demandAt ? demandAt(x, z) : 0;
    let band = "FARM";
    for (const b of DENSITY_BANDS) {
      if (d > b.above) { band = b.cls; break; }
    }

    // ---- 6. THE BEACH EXCEPTION, NARROWLY ----
    //
    // A shoreline with little demand, well away from the working port, is where
    // hotels go: the one case where a city's edge outbids its middle.
    //
    // The first version of this tested `c.h < 6`, which is not "a beach" -- it is
    // "low ground", and most island ground in this world is low. It turned whole
    // islands into resorts, including one that had been a tower district. It now
    // requires ground the land registry actually classifies as BEACH, and a
    // demand band that excludes both dead country and real urban waterfront.
    // Requiring the ground to BE beach removed resorts from the world entirely,
    // and the reason is obvious in hindsight: settlement plots sit on BUILDABLE
    // ground by definition, so a test for USE.BEACH can never fire inside one. A
    // beachfront hotel does not stand on the sand -- it stands on dry land NEXT
    // to it. So the test is proximity: is there beach or water within a short
    // walk, in any direction?
    if (d > 0.05 && d < 0.45 && distToPort(x, z) > 2500 && c.h < 24) {
      const R = 150;
      for (const [dx, dz] of [[R, 0], [-R, 0], [0, R], [0, -R],
                              [R * 0.7, R * 0.7], [-R * 0.7, R * 0.7],
                              [R * 0.7, -R * 0.7], [-R * 0.7, -R * 0.7]]) {
        const near = classifyAt(heightAt, x + dx, z + dz).use;
        if (near === USE.BEACH || near === USE.WATER) return "RESORT";
      }
    }

    // Steep ground steps down one band rather than being excluded: hill suburbs
    // exist, they are just lower than the flat ground below them.
    if (steep) {
      const i = DENSITY_BANDS.findIndex((b) => b.cls === band);
      if (i >= 0 && i < DENSITY_BANDS.length - 1) band = DENSITY_BANDS[i + 1].cls;
    }
    return band;
  };
}

/**
 * The character of a whole settlement: what its centre would be zoned.
 *
 * Sampled at the centre and at the four quarter-points rather than the centre
 * alone, and the most common answer wins. A single sample at the middle of a
 * settlement that straddles a ridge or a shoreline can return something no
 * majority of its ground supports.
 */
export function zoneCharacter(zoneAt, bounds) {
  const cx = (bounds.xMin + bounds.xMax) / 2;
  const cz = (bounds.zMin + bounds.zMax) / 2;
  const qx = (bounds.xMax - bounds.xMin) / 4;
  const qz = (bounds.zMax - bounds.zMin) / 4;
  const votes = {};
  for (const [x, z] of [
    [cx, cz],
    [cx - qx, cz - qz], [cx + qx, cz - qz],
    [cx - qx, cz + qz], [cx + qx, cz + qz],
  ]) {
    const k = zoneAt(x, z);
    votes[k] = (votes[k] || 0) + 1;
  }
  let best = null, bestN = -1;
  for (const [k, n] of Object.entries(votes)) {
    if (n > bestN) { best = k; bestN = n; }
  }
  return best;
}
