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
// top of this, with models from the asset lane.
//
// AND IT DOES NOT DECIDE WHAT THE WORLD IS FOR. The land holds no zoning and no
// plan. Any dry ground could become a road, a house, a park, or stay empty. What
// the land does is refuse the few things it genuinely knows are impossible --
// open water will not carry something that stands on the ground -- and then
// report what has been built, so that the thing already there can say what it
// will carry. The rule travels with the object, not with the earth.
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
// THE LAND FORBIDS. IT DOES NOT ASSIGN.
//
// THIS IS A CORRECTION TO HOW THIS FILE WAS FIRST WRITTEN, AND THE DIFFERENCE
// MATTERS MORE THAN IT LOOKS.
//
// The first version treated a ground type as a permission: this square metre IS
// carriageway, therefore only a car may be here. That reads as strict and is
// actually the wrong shape, because it makes the land decide the city. Any dry
// ground could become a road, a house, a park or nothing; the land has no
// opinion about which, and a world whose ground is pre-assigned cannot be built
// in by anyone.
//
// So the land only ever says NO, and only about the things it genuinely knows:
// open water will not carry a road (it will carry a bridge), a cliff will not
// carry anything with a footprint, a beach carries nothing permanent. Those are
// facts about the terrain, not zoning.
//
// Everything else is decided by WHAT IS ALREADY THERE. A sidewalk is not a
// permission the land granted; it is a thing somebody built, and having been
// built it accepts people, lamps, hydrants and signs, and refuses cars. Put a
// carriageway on the same ground instead and the same ground now accepts cars
// and refuses lamps. The rule travels with the object, not with the earth.
// -----------------------------------------------------------------------------

/**
 * What each surface will carry, once it exists.
 *
 * OPEN accepts anything, because unbuilt land is exactly that: unassigned. This
 * is the entry that makes the world buildable rather than a fixed plan.
 */
export const ACCEPTS = {
  [SURFACE.OPEN]: null,                    // null = anything; the land has no opinion
  [SURFACE.CARRIAGEWAY]: ["vehicle", "rail-vehicle", "marking"],
  [SURFACE.SIDEWALK]: ["pedestrian", "furniture", "lamp", "sign", "vegetation"],
  [SURFACE.VERGE]: ["vegetation", "lamp", "sign", "furniture"],
  [SURFACE.PARKING]: ["vehicle"],
  [SURFACE.TRACK]: ["rail-vehicle"],
  [SURFACE.PLOT]: ["building", "furniture", "vegetation", "structure"],
  [SURFACE.PARK]: ["pedestrian", "furniture", "vegetation", "structure", "lamp", "sign"],
  [SURFACE.FARM]: ["structure", "vegetation"],
  [SURFACE.BEACH]: ["pedestrian", "furniture", "vegetation"],
  [SURFACE.WATER]: ["vessel"],
  [SURFACE.ROCK]: [],                      // nothing stands on a cliff face
};

/**
 * Terrain refusals: the short list of things the LAND itself rules out, and what
 * would satisfy it instead.
 *
 * `support` is how a thing carries itself. Ordinary things say "ground" and need
 * ground under them. A bridge, a pier or a jetty says "span" and may cross water
 * -- which is the whole reason a road cannot go over a bay but a bridge can.
 */
const TERRAIN_REFUSES = {
  [SURFACE.WATER]: (spec) =>
    spec.support === "span" || spec.support === "float" || (spec.category === "vessel")
      ? null
      : "open water carries nothing that stands on the ground; this needs a bridge, a pier or a hull",
  // A CLIFF CARRIES NOTHING *WITH A FOOTPRINT* -- which is what WORLD-RULES says,
  // and this ignored the qualifier. A spanning structure has no footprint on the
  // ground it crosses, which is the entire point of one, so refusing it here
  // meant a bridge could cross a bay and not a gorge. The water rule below
  // already grants exactly this exception; the two now agree.
  [SURFACE.ROCK]: (spec) =>
    spec.support === "span" ? null : "a cliff face carries nothing with a footprint",
  // A FORESHORE CARRIES NOTHING PERMANENT, and the first version asked the spec
  // whether it was permanent -- a field no caller anywhere writes. So the rule
  // was dead and its default was to ALLOW, while the water rule beside it
  // defaults to refuse. Same table, opposite fail-direction, which is the worse
  // kind of inconsistency because only one of them is visible in testing.
  //
  // Permanence is now derived from what the thing IS. A building or a structure
  // on a beach is a sea wall waiting to happen; a person, a parasol or a boat
  // pulled up on the sand is what a beach is for.
  [SURFACE.BEACH]: (spec) =>
    spec.permanent === false || !["building", "structure"].includes(spec.category)
      ? null
      : "a foreshore carries nothing permanent",
};

/**
 * The kinds that DEFINE ground rather than OCCUPY it.
 *
 * A road, a park, a plot: these say what the ground here IS. They are answered
 * by the surface check, which decides whether a given thing may stand on that
 * kind of ground at all. They must not be answered a second time by the
 * occupancy check, because every prop on a pavement is inside a road's
 * rectangle by construction and would be refused.
 *
 * Derived from KIND_SURFACE rather than typed out again -- a kind that maps to
 * a surface is, by definition, one that defines ground.
 */
const SURFACE_KINDS = Object.keys(KIND_SURFACE);

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
const MAX_SAMPLES_PER_AXIS = 25;

/**
 * How far apart samples may be, in metres, before the check stops meaning
 * anything.
 *
 * THE FIRST VERSION WAS ALWAYS 3x3, WHATEVER THE SIZE. Its step was
 * `max(w/21, min(w,d)/2, 0.5)`, and for any square footprint the `min(w,d)/2`
 * term dominates every time -- so a 1 m bollard and a 400 m building were both
 * probed at exactly nine points. Measured:
 *
 *       1 x 1   ->  9 points, 0.5 m apart
 *     120 x 120 ->  9 points,  60 m apart
 *     400 x 400 ->  9 points, 200 m apart
 *
 * A 400 m footprint probed at nine points 200 m apart cannot see a river, a
 * cliff or an entire reserved plot 150 m across sitting inside it. The cap only
 * ever bound above an aspect ratio of about 10:1, so it never bound at all in
 * practice.
 *
 * 4 m is chosen against the world, not for tidiness: it is narrower than the
 * narrowest thing a footprint could straddle without noticing -- a LANE has a
 * 10 m right of way and a river is wider still.
 */
const TARGET_SPACING = 4;

function sampleGrid(x, z, w, d) {
  // Never coarser than TARGET_SPACING, never more than MAX_SAMPLES_PER_AXIS
  // probes, never finer than 0.5 m -- and always at least a 3x3, so every
  // footprint is sampled at its centre as well as its corners.
  const stepW = Math.max(w / MAX_SAMPLES_PER_AXIS, Math.min(TARGET_SPACING, w / 2), 0.5);
  const stepD = Math.max(d / MAX_SAMPLES_PER_AXIS, Math.min(TARGET_SPACING, d / 2), 0.5);
  const nx = Math.max(2, Math.round(w / stepW));
  const nz = Math.max(2, Math.round(d / stepD));
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

    // 1. DOES THE LAND ITSELF FORBID IT?
    //
    // The short list of things the terrain genuinely rules out. Not zoning --
    // open water will not carry something that stands on the ground, a cliff
    // face will not carry a footprint. Everything else the land permits, and
    // the question moves on to what has been built here.
    for (const [px, pz] of pts) {
      const s = surfaceAt(px, pz, t);
      const rule = TERRAIN_REFUSES[s];
      if (rule) {
        const why = rule(spec);
        if (why) {
          return {
            ok: false, reason: "terrain",
            detail: `${why} — ${s} at (${px.toFixed(1)}, ${pz.toFixed(1)})`,
            ground: heightAt(x, z), range: 0, samples: pts.length,
          };
        }
      }
    }

    // 2. DOES WHAT IS ALREADY HERE ACCEPT IT?
    //
    // The rule travels with the object, not with the earth. A sidewalk carries
    // people, lamps, hydrants and signs and refuses cars; put a carriageway on
    // the same ground and it carries cars and refuses lamps. Unbuilt land
    // (OPEN) accepts anything, which is what makes the world buildable rather
    // than a fixed plan.
    if (spec.category) {
      for (const [px, pz] of pts) {
        const s = surfaceAt(px, pz, t);
        const list = ACCEPTS[s];
        if (list === null || list === undefined) continue;   // null = anything
        if (!list.includes(spec.category)) {
          return {
            ok: false, reason: "not-accepted",
            detail: list.length
              ? `${s} carries ${list.join(", ")} — not a ${spec.category}`
              : `${s} carries nothing`,
            ground: heightAt(x, z), range: 0, samples: pts.length,
          };
        }
      }
    }

    // Kept for callers that genuinely want to name the ground they need rather
    // than describe themselves. Both routes end at the same answer.
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

    // 3. DOES IT FIT IN THE SPACE IT IS BEING PUT ON?
    //
    // "A parcel too small will not take a road; a house-sized plot will not take
    // a tower." Size is not a detail of placement, it is most of it -- and it is
    // the check that was missing everywhere in this project's history. The
    // stadium in the water, the airport apron overhanging its own platform by
    // 110 m, and the block set back for a narrower road than the one built are
    // all one question nobody asked: is there actually room.
    //
    // Only checked when the thing is going ONTO something with an extent. On
    // open land there is no host to overflow.
    if (registry && registry.overlapsReserved) {
      // THE HOST IS FOUND BY THE WHOLE FOOTPRINT, NOT BY ITS CENTRE.
      //
      // This asked occupiedAt(x, z) -- one point. So a 200 m apron whose CENTRE
      // fell just outside a plot matched no host at all, neither the too-big
      // nor the overhang check ran, and it was accepted while overlapping that
      // plot by 85 m. Which is the airport apron overhanging its own vetted
      // platform, reproduced exactly by the check written to prevent it: the
      // rule was right and the sampling was a single point.
      const host = registry.overlapsReserved(
        x - w / 2, x + w / 2, z - d / 2, z + d / 2, t, { onlyKinds: SURFACE_KINDS },
      );
      if (host && host.xMin !== undefined) {
        const hostW = host.xMax - host.xMin, hostD = host.zMax - host.zMin;
        if (w > hostW + 1e-6 || d > hostD + 1e-6) {
          return {
            ok: false, reason: "too-big",
            detail: `needs ${w.toFixed(1)} x ${d.toFixed(1)} m; ${host.kind} ${host.id} is ${hostW.toFixed(1)} x ${hostD.toFixed(1)} m`,
            ground: heightAt(x, z), range: 0, samples: pts.length,
          };
        }
        if (x - w / 2 < host.xMin - 1e-6 || x + w / 2 > host.xMax + 1e-6 ||
            z - d / 2 < host.zMin - 1e-6 || z + d / 2 > host.zMax + 1e-6) {
          return {
            ok: false, reason: "overhangs",
            detail: `fits ${host.kind} ${host.id} but not at this position — it would hang over the edge`,
            ground: heightAt(x, z), range: 0, samples: pts.length,
          };
        }
      }
    }

    // 4. FIT -- how much the ground moves under it
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

    // 5. OCCUPANCY -- and only the part of the volume this thing actually fills
    //
    // IGNORING THE SURFACE-DEFINING KINDS IS NOT A LOOPHOLE, IT IS THE WHOLE
    // DISTINCTION. A road is reserved across its full right of way, footway
    // included, so a lamp on a pavement is legitimately inside a road's
    // rectangle. Step 1 has already decided whether this thing may stand on
    // that ground. Asking again here, without the filter, refuses every lamp
    // and every bench in the city -- and looks like placement has broken rather
    // than like the wrong question was asked.
    //
    // What remains are the kinds that physically occupy the volume: a building,
    // a feature, another prop.
    if (registry && registry.overlapsReserved) {
      // THE VOLUME CHECKED MUST BE THE VOLUME RESERVED, INCLUDING THE HOLE.
      //
      // place() reserves from `surface - depth` upward, because a model carries
      // the foundation, basement or sub-base it digs. This checked from the
      // SURFACE upward and never read `depth`, so the decision volume and the
      // recorded volume were different volumes -- and two basements could be
      // dug into the same hole with both placements accepted, each looking
      // correct from above. The reservation had been fixed and the check had
      // not, which is the harder half to notice: the data was right and the
      // question was wrong.
      const surfaceY = opts.y !== undefined ? opts.y : hi;
      const yMin = surfaceY - (spec.depth || 0);
      const yMax = surfaceY + (spec.height || 0);
      const hit = registry.overlapsReserved(
        x - w / 2, x + w / 2, z - d / 2, z + d / 2, t,
        { yMin, yMax, ignoreKinds: SURFACE_KINDS },
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
