// =============================================================================
// PROP OCCUPANCY -- BOARD-CONVERSION-PLAN.md P3.2
//
// prop-manifest.js's own header names the gap directly: "the renderer places
// 2,407 lamps and 11,135 pieces of street furniture in two separate loops
// that walk the SAME footways and cannot see each other... 27 lamp posts
// stand inside a bin or a bench." This file is the missing "something else
// to see" -- a real occupancy check, using the SAME registry road/plot
// pieces already go through (world-registry.js's reserve/overlapsReserved),
// not a second, prop-specific implementation.
//
// NOT WIRED INTO city-render.js'S OWN PLACEMENT LOOPS, ON PURPOSE.
//
// Those loops (lamps, street furniture, trees, cars, parasols, containers,
// boats -- prop-manifest.js's own list) live inside `public/city-render.js`,
// `sandbox-spike-agy`'s active file (the same lane boundary
// `docs/audits/P2-RENDER-HANDOFF.md` already names for P2.6). This file is
// the interface for that lane to call, not a rewrite of its loops --
// `docs/BUILD-LOOP.md` STEP 8's "one agent per checkout" guard, applied to
// props the same way it already was to roads.
// =============================================================================

import { createWorldRegistry } from "./world-registry.js";
import { PROPS } from "./prop-manifest.js";

/** A prop's ground footprint, rotated to world axes. `rotation` in degrees
 *  (any value; only the 0/90/180/270 cases swap w/d meaningfully for an
 *  axis-aligned box, which is what every declared `foot` is). */
function orientedFoot(foot, rotationDeg) {
  const swapped = Math.abs(((Math.round(rotationDeg / 90) * 90) % 180 + 180) % 180) === 90;
  return swapped ? { w: foot.d, d: foot.w } : { w: foot.w, d: foot.d };
}

/**
 * One shared occupancy registry for every prop placement in a world build --
 * the "something else to see" prop-manifest.js's header says did not exist.
 * `heightAt` is accepted and forwarded to `createWorldRegistry` for parity
 * with how roads/plots are registered elsewhere; props do not currently use
 * it for anything beyond that.
 */
export function createPropRegistry(heightAt = null) {
  return createWorldRegistry(heightAt);
}

/**
 * Try to place one prop instance. Refuses (does not reserve) if its
 * foot+clear rectangle overlaps anything already reserved -- a real check,
 * not a report: the caller gets an `ok: false` it can act on (skip, nudge,
 * or refuse), not just a number to log afterward.
 *
 * `kind` must name an entry in `PROPS` (prop-manifest.js). `x`/`z` are the
 * prop's own centre, in world metres -- prop placements are not grid-
 * addressed the way board.js's pieces are (a lamp does not sit on an atom
 * boundary), so this works in real metres throughout, not atoms.
 */
export function tryPlaceProp(registry, { kind, id, x, z, rotation = 0, foot: explicitFoot = null }) {
  const spec = PROPS[kind];
  if (!spec) return { ok: false, reason: "unknown-prop-kind", kind };
  if (spec.sized && !explicitFoot) return { ok: false, reason: "sized-prop-needs-explicit-foot", kind };
  const foot = spec.sized ? explicitFoot : spec.foot;
  const { w, d } = orientedFoot(foot, rotation);
  const clear = spec.clear || 0;
  const halfW = w / 2 + clear, halfD = d / 2 + clear;
  const xMin = x - halfW, xMax = x + halfW, zMin = z - halfD, zMax = z + halfD;

  const blocker = registry.overlapsReserved(xMin, xMax, zMin, zMax, 0, {});
  if (blocker) return { ok: false, reason: "occupied", blockedBy: blocker };

  registry.reserve({
    kind: `prop:${kind}`, id: id || null,
    xMin, xMax, zMin, zMax,
    solid: spec.kind === "hard",
  });
  return { ok: true };
}

/**
 * Place a batch of prop instances against ONE shared registry, in order,
 * and report which were placed vs. refused (and why) -- the concrete
 * measurement BOARD-CONVERSION-PLAN.md's P3.2 gate names: "its own header
 * records 27 measured lamp-inside-bench overlaps -- those go to zero once
 * occupancy is checked." `instances`: `[{kind, id, x, z, rotation, foot?}]`.
 */
export function placePropsChecked(instances, heightAt = null) {
  const registry = createPropRegistry(heightAt);
  const placed = [], refused = [];
  for (const inst of instances) {
    const result = tryPlaceProp(registry, inst);
    if (result.ok) placed.push(inst);
    else refused.push({ ...inst, reason: result.reason, blockedBy: result.blockedBy });
  }
  return { placed, refused, registry };
}
