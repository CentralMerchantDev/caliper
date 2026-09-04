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
import { waterwayAt, waterwayInfoAt } from "./terrain.js";
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
  // AND THE FAIL-DIRECTION IS NOW THE SAME AS ITS NEIGHBOURS'.
  //
  // The paragraph above criticises the previous version for asking about a field
  // no caller writes, so the rule was dead and its default was to ALLOW while
  // the water rule beside it defaults to refuse. The replacement asked for
  // `spec.category` -- also optional, and omitted by every spec in ground.test.js.
  // Measured on one beach point with one 6 x 6 x 8 m model:
  //
  //     { ..., category: "building" }  -> refused, "carries nothing permanent"
  //     { ... }                        -> ok: true
  //
  // The same inconsistency, one field later, in the paragraph criticising it.
  // So an UNSTATED category is now treated as permanent: a thing that will not
  // say what it is does not get the benefit of the doubt on a foreshore.
  [SURFACE.BEACH]: (spec) =>
    spec.permanent === false || ["pedestrian", "furniture", "vegetation", "vessel"].includes(spec.category)
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

/**
 * The kinds that are PARCELS — bounded ground with an edge that means something.
 *
 * A plot, a farm, a park: you build WITHIN one, and hanging over its edge is
 * trespass. A road, a railway, a bridge, a river: you travel ALONG one, and its
 * edge in the direction of travel is an artefact of how it was chunked, not a
 * boundary.
 *
 * THIS DISTINCTION IS THE FIX FOR A COLLISION THAT MADE THE LAYER REFUSE ITS
 * OWN PRIMARY OUTPUT. WORLD-RULES §3.2 says a road piece is one cell — 8 m. The
 * size check refused anything larger than its host and anything crossing a
 * host's edge. Both were individually correct, and together, on a road laid out
 * exactly as the specification mandates:
 *
 *   a 12 m bus      -> "too-big: needs 2.5 x 12.0 m; road st-1 is 18.0 x 8.0 m"
 *   a 4.4 m car,
 *     centred in a piece  -> ok
 *     over a piece JOIN    -> "overhangs: fits road st-0 but not at this position"
 *
 * Every bus, tram, lorry and articulated vehicle unplaceable, and roughly half
 * of all cars, because the road was built the way the grid says to build it.
 * Register the identical road as one 320 m strip and both are accepted — so the
 * land's answer to "may this vehicle stand on this road" depended on how the
 * road had been chunked.
 *
 * A vehicle is not too big for a road because the road was cut into 8 m pieces.
 */
const PARCEL_KINDS = ["plot", "farm", "park"];

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

/**
 * The widest a sample step is ever allowed to get, however large the footprint.
 *
 * WHY THERE HAS TO BE ONE. The per-axis sample cap is a budget, and above about
 * 100 m of width the budget -- not TARGET_SPACING -- is what sets the spacing.
 * Measured, before this constant existed:
 *
 *     200 m wide  ->   8 m step
 *     600 m wide  ->  24 m step
 *   3,500 m wide  -> 140 m step
 *
 * The comment above this function claimed "never coarser than TARGET_SPACING",
 * which was true only below ~100 m and false everywhere it mattered. At 140 m
 * the airport's own 3,500 m runway footprint could not see a 120 m river lying
 * across it: the grid simply stepped over the water.
 *
 * 56 is chosen against the world, not for tidiness. A uniform grid of step `s`
 * is guaranteed to land at least one sample inside any band of width `s` or
 * wider, so the ceiling has to be the width of the narrowest thing a footprint
 * must not step over. The narrowest water in the world is canal-cormorant at
 * halfWidth 28, so 56 m of full width -- and this is that number, read from
 * waterways.js rather than picked.
 *
 * WHAT IT DOES NOT GUARANTEE, stated because the previous comment's failure was
 * claiming a guarantee it did not have: rivers TAPER, so near a river's source
 * its width falls below 56 m and a large footprint can still step over that
 * last stretch. Terrain sampling is the wrong instrument for it. `assessFootprint`
 * asks `waterwayAt` directly for exactly this reason, and that query is the thing
 * that actually defends against building in a river -- not the density of this
 * grid. This ceiling closes the common case cheaply; it does not replace the
 * direct question.
 */
const MAX_SPACING = 56;

function sampleGrid(x, z, w, d) {
  // Never finer than 0.5 m, never coarser than MAX_SPACING, at TARGET_SPACING
  // wherever the sample budget allows it, and always at least a 3x3 so every
  // footprint is sampled at its centre as well as at its corners.
  //
  // Read outward: the budget term sets the floor on step size, the MAX_SPACING
  // term caps it, and TARGET_SPACING is what you get in between -- which is
  // every footprint under about 100 m, meaning every building in the world.
  const stepW = Math.min(MAX_SPACING, Math.max(w / MAX_SAMPLES_PER_AXIS, Math.min(TARGET_SPACING, w / 2), 0.5));
  const stepD = Math.min(MAX_SPACING, Math.max(d / MAX_SAMPLES_PER_AXIS, Math.min(TARGET_SPACING, d / 2), 0.5));
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
    // A RIVER IS WATER EVEN WHEN IT IS 40 METRES UP.
    //
    // classifyAt decides by ELEVATION, and this world's seven waterways run
    // between 27 and 105 m above sea level -- so every one of them classified as
    // dry land, and the land accepted a building in the middle of a river. 643
    // of 703 sampled in-waterway points did exactly that. terrain.js's own
    // docstring already said it: "the mistake was expecting an elevation test to
    // answer a question about waterways". The waterways are asked directly, and
    // asked FIRST, because they are a fact about the ground rather than an
    // inference from its height.
    if (waterwayAt(x, z)) return SURFACE.WATER;

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

    // THE GROUND IS MEASURED ONCE, BEFORE ANY CHECK NEEDS IT.
    //
    // These used to be accumulated in the FIT step, three checks later, while
    // the size check above already read `hi` to build its height range. `hi` was
    // still -Infinity there, so the range was (-Infinity, -Infinity), the host
    // query matched nothing, and a 30 m tower was accepted onto a 12 x 18 m
    // house lot. Caught within a minute because the sizing tests are PAIRED --
    // the bus that must place and the tower that must not — and only one of the
    // pair moved. An unpaired test would have called it a fix.
    //
    // Computing them here removes the ordering hazard rather than fixing this
    // instance of it: no later step can read a value that has not been taken.
    let lo = Infinity, hi = -Infinity;
    for (const [px, pz] of pts) {
      const h = heightAt(px, pz);
      if (h < lo) lo = h;
      if (h > hi) hi = h;
    }

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
    // A SPANNING STRUCTURE DOES NOT STAND ON WHAT IT CROSSES.
    //
    // Step 1 grants a bridge, pier or jetty the right to cross water and a
    // cliff -- that is what `support: "span"` means and TERRAIN_REFUSES returns
    // null for it. This step then took it straight back: ACCEPTS[water] is
    // ["vessel"], so the moment a bridge also declared `category: "structure"`
    // it was refused with "water carries vessel -- not a structure".
    //
    // Measured before the fix:
    //     bridge, span, category "structure"  ->  REFUSED
    //     bridge, span, NO category           ->  OK
    //     float platform, support "float"     ->  REFUSED with a category
    //
    // So the exception survived only for callers who happened to omit an
    // optional field -- and test/ground.test.ts's bridge case omits it, which is
    // why the test written to defend this passed while the behaviour was broken.
    // That is the same "an unstated optional field decides the answer" failure
    // the BEACH rule fourteen lines above spends a paragraph condemning.
    //
    // What a surface CARRIES is a question about things that rest on it. It is
    // not a question you can ask about a deck forty metres overhead, so it is
    // not asked.
    const spans = spec.support === "span" || spec.support === "float";
    if (spec.category) {
      for (const [px, pz] of pts) {
        const s = surfaceAt(px, pz, t);
        if (spans && (s === SURFACE.WATER || s === SURFACE.ROCK)) continue;
        const list = ACCEPTS[s];
        // null MEANS ANYTHING. undefined MEANS NOBODY KNOWS, AND THOSE ARE NOT
        // THE SAME ANSWER.
        //
        // They were treated identically, so an unrecognised surface permitted
        // everything. `reserve({ surface })` takes a free-form string, and one
        // transposed letter produced the most permissive ground in the world:
        //
        //     reserve({ surface: "sidwalk" })
        //     canPlace vehicle/lamp/building/vessel -> all true
        //
        // ACCEPTS["sidwalk"] is undefined, and so is TERRAIN_REFUSES["sidwalk"],
        // so neither table fired. In a module whose header argues that a silent
        // fallback is the defect this project keeps finding.
        if (list === null) continue;                          // null = anything
        if (list === undefined) {
          return {
            ok: false, reason: "unknown-surface",
            detail: `"${s}" is not a ground type this world knows, so nothing may be placed on it`,
            ground: heightAt(x, z), range: 0, samples: pts.length,
          };
        }
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
    //
    // THE HOST QUERY TAKES A HEIGHT RANGE, and it did not. Twelve lines below,
    // the occupancy check passes one and has a test defending it; this one did
    // not, so a bench standing under a bridge deck 30 m overhead was refused
    // "overhangs" — by a structure it could walk under. The registry gained
    // height ranges precisely because "a bridge blocked the channel it spans";
    // only half of canPlace was updated.
    if (registry && registry.overlapsReserved) {
      const hostY = opts.y !== undefined ? opts.y : hi;
      const yMin = hostY - (spec.depth || 0);
      const yMax = hostY + (spec.height || 0);
      // THE HOST IS FOUND BY THE WHOLE FOOTPRINT, NOT BY ITS CENTRE.
      //
      // This asked occupiedAt(x, z) -- one point. So a 200 m apron whose CENTRE
      // fell just outside a plot matched no host at all, neither the too-big
      // nor the overhang check ran, and it was accepted while overlapping that
      // plot by 85 m. Which is the airport apron overhanging its own vetted
      // platform, reproduced exactly by the check written to prevent it: the
      // rule was right and the sampling was a single point.
      const host = registry.overlapsReserved(
        x - w / 2, x + w / 2, z - d / 2, z + d / 2, t,
        // PARCELS only. A road's edge in the direction of travel is an artefact
        // of chunking; a plot's edge is a boundary. See PARCEL_KINDS.
        { onlyKinds: PARCEL_KINDS, yMin, yMax },
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

    // 4. FIT -- how much the ground moves under it. Measured above; judged here.
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
        // WHAT IS IN THE WAY, AND WHETHER IT CAN BE CLEARED.
        //
        // "If the condo is 10 x 10 and the space is 6 x 6 you cannot put the
        // condo -- unless you clear more space for it." A refusal that names
        // only the first obstruction, and says nothing about whether it can be
        // removed, is unusable by a builder: it is the difference between "no"
        // and "no, and here is what to do about it".
        //
        // Rock and open water are listed too, and are NOT clearable. That is
        // the honest answer -- you do not demolish a hillside by asking.
        const blockers = registry.allOverlapping
          ? registry.allOverlapping(
              x - w / 2, x + w / 2, z - d / 2, z + d / 2, t,
              { yMin, yMax, ignoreKinds: SURFACE_KINDS },
            )
          : [hit];
        const blockedBy = blockers.map((b) => ({
          id: b.id, kind: b.kind, owner: b.owner || null,
          // Terrain is not a thing somebody put there, so it cannot be taken
          // away. Everything else was placed and can be un-placed.
          clearable: b.kind !== "rock" && b.kind !== "water",
        }));
        const names = blockedBy.slice(0, 3).map((b) => `${b.kind}${b.id ? " " + b.id : ""}`).join(", ");
        const more = blockedBy.length > 3 ? ` and ${blockedBy.length - 3} more` : "";
        const clearable = blockedBy.filter((b) => b.clearable).length;
        return {
          ok: false, reason: "occupied",
          detail:
            `${w.toFixed(1)} x ${d.toFixed(1)} m needed; ${names}${more} ${blockedBy.length === 1 ? "is" : "are"} in the way` +
            (clearable === blockedBy.length
              ? ` — clear ${clearable === 1 ? "it" : "them"} and this fits`
              : clearable > 0
                ? ` — ${clearable} could be cleared, the rest cannot`
                : " — none of it can be cleared"),
          blockedBy,
          ground: hi, range, samples: pts.length,
        };
      }
    }

    return { ok: true, reason: null, detail: null, ground: hi, range, samples: pts.length };
  }

  // ---------------------------------------------------------------------------
  // THE REST OF THE INTERFACE WORLD-RULES §1.1 PROMISES
  //
  // That section calls its eight queries "the whole interface between the land
  // and anything that wants to stand on it", and this object exposed two of
  // them. The others existed as facts the land plainly knew and had no way to
  // be asked -- so every caller either reached around the land to terrain.js
  // directly, which is how two subsystems end up with private beliefs about the
  // same ground, or did without.
  // ---------------------------------------------------------------------------

  /**
   * What the ground is MADE OF here, as opposed to what is built on it.
   *
   * Distinct from surfaceAt on purpose: a car park and a lawn are different
   * surfaces and the same soil, and a foundation cares about the second.
   */
  function materialAt(x, z) {
    const h = heightAt(x, z);
    if (h < 0) return "seabed";
    const s = surfaceAt(x, z);
    if (s === SURFACE.ROCK) return "rock";
    if (s === SURFACE.BEACH) return "sand";
    return strataAt(0).name;   // topsoil, from the one strata table
  }

  /**
   * Water here, or null.
   *
   * Returns the KIND as well as the depth, because "2 m of water" means
   * something different in a canal and in the open sea -- one is dredged and
   * bounded, the other is not.
   */
  /**
   * What water is at a point, and how deep.
   *
   * THIS READ THREE FIELDS OFF A BOOLEAN. waterwayAt returns true or false, and
   * this asked it for `.kind`, `.surface` and `.id`. Every one is undefined on a
   * boolean, so the fallbacks always won: every waterway in the world reported
   * itself a "river" -- three of the seven are canals -- and the depth was
   * max(0, 0 - h), which is zero anywhere at or above sea level. Measured before
   * the fix: 703 of 703 sampled in-waterway points said "river", 653 of 703 said
   * depth 0. The code was confident and wrong in the same breath, which is the
   * failure this whole project is about.
   *
   * waterwayInfoAt returns the waterway itself. The surface is its bed plus its
   * depth -- computed HERE because this is where heightAt lives -- so a canal
   * 40 m up a valley reports a real depth instead of subtracting sea level from
   * something that is not at sea level.
   */
  function waterAt(x, z) {
    const way = waterwayInfoAt(x, z);
    const h = heightAt(x, z);
    if (way) {
      // The bed is cut `depth` below the surrounding ground, so the surface sits
      // at bed + depth and the water at this point is that much above the bed.
      return { kind: way.kind, depth: Math.max(0, way.depth), id: way.id };
    }
    if (h < 0) return { kind: "sea", depth: -h, id: null };
    return null;
  }

  /**
   * What occupies a point, at a height, at a time.
   *
   * Delegated to the registry rather than reimplemented -- there is one answer
   * to this question in the world and it lives there. Without a registry the
   * land can still speak for the earth itself, which is the honest answer for a
   * world where nothing has been built.
   */
  function whatIsAt(x, y, z, t = 0) {
    if (registry && registry.whatIsAt) return registry.whatIsAt(x, y, z, t);
    const h = heightAt(x, z);
    if (y < h) return { kind: "rock", id: null, owner: null, solid: true, since: -Infinity, until: Infinity };
    if (h < 0 && y <= 0) return { kind: "water", id: null, owner: null, solid: true, since: -Infinity, until: Infinity };
    return { kind: "free", id: null, owner: null, solid: false, since: -Infinity, until: Infinity };
  }

  /**
   * Somewhere this will fit, or nothing.
   *
   * The same spiral as findSite and findFree, and deliberately the SAME shape of
   * answer: where, and how far it had to move. A search that reports only a
   * position hides the difference between "exactly where you asked" and "3 km
   * away, which is somewhere else entirely".
   *
   * It asks canPlace, so it cannot disagree with the placement that follows --
   * a search using its own looser rules will confidently return ground that
   * placement then refuses, and the caller cannot tell the two disagreed.
   */
  function findGround(spec, near, { radius = 1500, step: ringStep = 20, t = 0, rotated = false } = {}) {
    const here = canPlace(spec, near.x, near.z, { t, rotated });
    if (here.ok) return { x: near.x, z: near.z, moved: 0 };
    for (let r = ringStep; r <= radius; r += ringStep) {
      const n = Math.max(8, Math.round((2 * Math.PI * r) / ringStep));
      for (let i = 0; i < n; i++) {
        const a = (2 * Math.PI * i) / n;
        const x = near.x + Math.cos(a) * r, z = near.z + Math.sin(a) * r;
        if (canPlace(spec, x, z, { t, rotated }).ok) return { x, z, moved: r };
      }
    }
    return null;
  }

  return {
    // WORLD-RULES §1.1, all eight
    heightAt,
    slopeAt: (x, z) => slopeAt(heightAt, x, z),
    materialAt,
    waterAt,
    surfaceAt,
    whatIsAt,
    canPlace,
    findGround,
    // and the volume
    columnAt, strataAt, bandAt, SURFACE,
  };
}
