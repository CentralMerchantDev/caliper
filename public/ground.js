// =============================================================================
// THE GROUND, THE VOLUME ABOVE AND BELOW IT, AND WHETHER A THING MAY STAND HERE
//
// WHAT THIS IS
//
// The land, as something that can be ASKED. No city, no objects, no layout --
// this is the ground that models get laid onto, and the rules for what may go
// where. docs/WORLD-RULES.md is the specification; this is its implementation.
//
// WHY IT EXISTS
//
// Every object in this world used to decide for itself where it could stand,
// inside the same statement that drew it. A lamp went every 52 m down both
// sides of every road because that loop said so; a bench went on the same
// footway because a different loop said so; and neither could see the other,
// because neither was asking anything. Measured: 27 lamp posts standing inside
// bins and benches, one pair 5 cm apart. Before that, a stadium at -7.0 m in
// the water and 389 plots inside feature footprints.
//
// The pattern is always the same. Placement and geometry were one statement, so
// there was no moment at which anyone could ask "is this ground free?" -- and a
// question nobody can ask has no wrong answer, which is why none of it ever
// looked broken.
//
// So the land answers, and the answer is the only way onto it.
//
// WHAT IT DELIBERATELY DOES NOT DO
//
// It does not place anything, know what a city is, or contain a single
// coordinate of anything built. Those belong to a layout engine that runs on
// top of this, with models from the asset lane. The land does not know a road
// from a runway; it knows that some ground is CARRIAGEWAY and that a lamp may
// not stand on it.
// =============================================================================

import { classifyAt, slopeAt, USE } from "./land-use.js";
import { WORLD_SCALE } from "./world-scale.js";

// -----------------------------------------------------------------------------
// GROUND TYPES
//
// Every square metre has exactly one. This is the rule that answers "a lamp
// cannot stand in the middle of a road": a lamp declares that it stands on
// SIDEWALK and VERGE, and a carriageway is neither. It is not moved out of the
// road afterwards -- it was never allowed there.
//
// A ROAD IS NOT ONE SURFACE. A boulevard is a carriageway with a verge, a
// sidewalk and parking on each side, and those are different ground with
// different rules. Treating a right-of-way as one slab is what made "on the
// road" and "on the pavement" the same fact, and therefore uncheckable.
// -----------------------------------------------------------------------------
export const SURFACE = {
  WATER: "water",
  BEACH: "beach",
  ROCK: "rock",
  CARRIAGEWAY: "carriageway",
  SIDEWALK: "sidewalk",
  VERGE: "verge",
  PARKING: "parking",
  TRACK: "track",
  PLOT: "plot",
  PARK: "park",
  FARM: "farm",
  OPEN: "open",
};

/**
 * What a registry entry means, as ground, when it does not say so itself.
 *
 * Reservations SHOULD carry an explicit `surface`. This maps the ones that do
 * not, so an older entry degrades to something sensible rather than to OPEN --
 * which would quietly say "build here" about a railway.
 */
const KIND_SURFACE = {
  road: SURFACE.CARRIAGEWAY,
  bridge: SURFACE.CARRIAGEWAY,
  rail: SURFACE.TRACK,
  waterway: SURFACE.WATER,
  park: SURFACE.PARK,
  farm: SURFACE.FARM,
  plot: SURFACE.PLOT,
};

// -----------------------------------------------------------------------------
// THE VOLUME
//
// The world is a solid mass with air above it, not a skin. Both are addressable,
// because "what is at this point" has to have an answer at any height.
// -----------------------------------------------------------------------------

/** Where the solid stops. Matches the abyss plane, so the two meet. */
export const BEDROCK_Y = -175;

/**
 * Strata, by depth below the surface in metres.
 *
 * OWNED HERE, NOT IN THE RENDERER. These were literals inside city-render.js,
 * which meant the only thing that knew what the ground was made of was the code
 * drawing a picture of it. A foundation, a basement, a cutting and a tunnel are
 * all dug into this; the renderer is one consumer of it, not its owner.
 */
export const STRATA = [
  { to: 2, name: "topsoil", colour: 0x6b5a41 },
  { to: 8, name: "subsoil", colour: 0x8a7355 },
  { to: 25, name: "clay and gravel", colour: 0xa08a63 },
  { to: 70, name: "weathered rock", colour: 0x8b8378 },
  { to: Infinity, name: "bedrock", colour: 0x5f5a55 },
];

/**
 * Height bands above local ground, in metres.
 *
 * Air is occupiable, which is not a technicality: a bridge deck holds air at
 * 2-55 m while the water beneath stays navigable, and a lamp head occupies air
 * that a bench may stand under. A world that only reserves footprints cannot
 * express either, and will either forbid the bench or allow a post through it.
 */
export const AIR_BANDS = [
  { to: 2, name: "pedestrian" },
  { to: 12, name: "street" },
  { to: 60, name: "building" },
  { to: 200, name: "tower" },
  { to: Infinity, name: "sky" },
];

/** The stratum at a given depth below the surface. */
export function strataAt(depth) {
  for (const s of STRATA) if (depth <= s.to) return s;
  return STRATA[STRATA.length - 1];
}

/** The band a height above local ground falls in. */
export function bandAt(heightAboveGround) {
  for (const b of AIR_BANDS) if (heightAboveGround <= b.to) return b;
  return AIR_BANDS[AIR_BANDS.length - 1];
}

// -----------------------------------------------------------------------------
// SAMPLING
//
// A footprint is not a point, and checking only its centre is how a building
// ends up with one corner over a cliff. But a 3,500 m runway sampled at the
// same density as a 0.6 m bollard is millions of probes, so the step adapts and
// the total is capped -- and the cap is REPORTED rather than hidden, because a
// check that silently coarsens is a check that silently stops working.
// -----------------------------------------------------------------------------
const MAX_SAMPLES_PER_AXIS = 21;

function sampleGrid(x, z, w, d) {
  const stepW = Math.max(w / MAX_SAMPLES_PER_AXIS, Math.min(w, d) / 2, 0.5);
  const stepD = Math.max(d / MAX_SAMPLES_PER_AXIS, Math.min(w, d) / 2, 0.5);
  const nx = Math.max(1, Math.round(w / stepW));
  const nz = Math.max(1, Math.round(d / stepD));
  const out = [];
  for (let i = 0; i <= nx; i++) {
    for (let j = 0; j <= nz; j++) {
      out.push([x - w / 2 + (w * i) / nx, z - d / 2 + (d * j) / nz]);
    }
  }
  return out;
}

// -----------------------------------------------------------------------------
// THE LAND
// -----------------------------------------------------------------------------

/**
 * Build the queryable land.
 *
 * @param {object} opts
 * @param {(x:number,z:number)=>number} opts.heightAt  world metres in and out
 * @param {object|null} opts.registry  a world registry, when one exists. The
 *   land works without it -- it simply reports bare terrain, which is exactly
 *   what the world is before anything has been placed.
 */
export function createGround({ heightAt, registry = null }) {
  if (typeof heightAt !== "function") {
    throw new Error("createGround needs a heightAt -- there is no land without one");
  }

  /**
   * The ground type at a point, at a time.
   *
   * Terrain first, then whatever has been placed on top of it. The order
   * matters: a quay is CARRIAGEWAY standing where the terrain says WATER, and
   * the built answer is the true one.
   */
  function surfaceAt(x, z, t = 0) {
    if (registry && registry.whatIsAt) {
      const h = heightAt(x, z);
      const here = registry.whatIsAt(x, h, z, t);
      if (here) {
        if (here.surface) return here.surface;
        const mapped = KIND_SURFACE[here.kind];
        if (mapped) return mapped;
      }
    }
    const c = classifyAt(heightAt, x, z);
    if (c.use === USE.WATER) return SURFACE.WATER;
    if (c.use === USE.BEACH) return SURFACE.BEACH;
    if (c.use === USE.CLIFF) return SURFACE.ROCK;
    return SURFACE.OPEN;
  }

  /**
   * Everything true about one vertical line through the world.
   *
   * This is the point system made concrete: an address, and what is above,
   * below and at it. Nothing is IN these points yet -- that is the point. They
   * exist so that when things arrive, each one can be found again.
   */
  function columnAt(x, z, t = 0) {
    const ground = heightAt(x, z);
    return {
      x, z, t,
      ground,
      surface: surfaceAt(x, z, t),
      slope: slopeAt(heightAt, x, z),
      underwater: ground < 0,
      waterDepth: ground < 0 ? -ground : 0,
      bedrock: BEDROCK_Y,
      // The solid column, top down, as real thicknesses rather than a table of
      // depths -- a caller digging a basement wants "how much subsoil", not a
      // boundary list it has to difference itself.
      strata: STRATA.map((s, i) => {
        const from = i === 0 ? 0 : STRATA[i - 1].to;
        const to = Math.min(s.to, ground - BEDROCK_Y);
        return { name: s.name, from, to, thickness: Math.max(0, to - from) };
      }).filter((s) => s.thickness > 0),
      occupant: registry && registry.whatIsAt ? registry.whatIsAt(x, ground, z, t) : null,
    };
  }

  /**
   * MAY THIS STAND HERE, AND IF NOT, WHY NOT.
   *
   * "No" is not an answer. A refusal names the surface it hit, how far the
   * ground moves under the footprint, or what is already there -- because a
   * caller that cannot tell "in a river" from "too steep" cannot do anything
   * useful about either, and because a refusal nobody can read gets deleted the
   * first time it is inconvenient.
   *
   * The three checks are deliberately separate and in this order: surface, then
   * fit, then occupancy. Conflating them is how objects end up inside each
   * other -- and asking the occupancy question when you meant the surface one
   * refuses an entire street, because a bench on a pavement is legitimately
   * INSIDE a road's rectangle.
   *
   * @param {object} spec   from a model's declaration:
   *   { footprint:{w,d}, height, clearance, standsOn:[SURFACE...], maxRange }
   * @returns {{ok:boolean, reason:string|null, detail:string|null, ground:number, range:number, samples:number}}
   */
  function canPlace(spec, x, z, opts = {}) {
    const { rotated = false, t = 0 } = opts;
    const f = spec.footprint;
    if (!f || !(f.w > 0) || !(f.d > 0)) {
      throw new Error("canPlace needs a footprint with a real width and depth");
    }
    const pad = (spec.clearance || 0) * 2;
    const w = (rotated ? f.d : f.w) + pad;
    const d = (rotated ? f.w : f.d) + pad;

    const pts = sampleGrid(x, z, w, d);
    let lo = Infinity, hi = -Infinity;

    // 1. SURFACE
    if (spec.standsOn && spec.standsOn.length) {
      const allowed = new Set(spec.standsOn);
      for (const [px, pz] of pts) {
        const s = surfaceAt(px, pz, t);
        if (!allowed.has(s)) {
          return {
            ok: false, reason: "surface",
            detail: `${s} at (${px.toFixed(1)}, ${pz.toFixed(1)}); this stands on ${spec.standsOn.join(", ")}`,
            ground: heightAt(x, z), range: 0, samples: pts.length,
          };
        }
      }
    }

    // 2. FIT -- how much the ground moves under it
    for (const [px, pz] of pts) {
      const h = heightAt(px, pz);
      if (h < lo) lo = h;
      if (h > hi) hi = h;
    }
    const range = hi - lo;
    // Landform metres, so this scales with the world; the footprint does not.
    const maxRange = spec.maxRange !== undefined ? spec.maxRange : 2 * WORLD_SCALE;
    if (range > maxRange) {
      return {
        ok: false, reason: "slope",
        detail: `ground moves ${range.toFixed(2)} m across the footprint, limit ${maxRange.toFixed(2)} m`,
        ground: lo, range, samples: pts.length,
      };
    }

    // 3. OCCUPANCY -- and only the part of the volume this thing actually fills
    if (registry && registry.overlapsReserved) {
      const yMin = opts.y !== undefined ? opts.y : hi;
      const yMax = yMin + (spec.height || 0);
      const hit = registry.overlapsReserved(
        x - w / 2, x + w / 2, z - d / 2, z + d / 2, t, { yMin, yMax },
      );
      if (hit) {
        return {
          ok: false, reason: "occupied",
          detail: typeof hit === "object" && hit.id ? `${hit.kind || "something"} ${hit.id} is already here` : "something is already here",
          ground: hi, range, samples: pts.length,
        };
      }
    }

    return { ok: true, reason: null, detail: null, ground: hi, range, samples: pts.length };
  }

  return { surfaceAt, columnAt, canPlace, strataAt, bandAt, SURFACE };
}
