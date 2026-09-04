// =============================================================================
// CALIPER — A WORLD INSTANCE
//
// A1/A2/A2b seeded the noise, the terrain and the plan, one call site at a
// time. A3 made DISTRICTS/SETTLEMENTS/BRIDGES/GRID the frozen spec each world
// derives its own copy from. None of that is "a world is a value" on its own
// -- each was a parameter added to an existing function. This is the object
// that ties one seed to ITS plan, ITS land and ITS layers, so a world can
// finally be handed around, compared, stored and rebuilt as one thing.
//
// IT COMPOSES; IT GENERATES NOTHING ITSELF.
//
// generateWorld() already builds the plan, LandField already builds the
// ground, and createWorldModel() already owns the layer stack -- each proven
// and tested on its own. This file's only job is to call all three with the
// SAME seed and hand back one object. If it ever grows its own copy of any of
// that logic, the two copies will drift, which is the exact defect this
// project has already found four times in its own code.
// =============================================================================

import { generateWorld } from "./city-plan.js";
import { LandField, makeHeightAt } from "./terrain.js";
import { createWorldModel } from "./world-model.js";
import { createGrid } from "./grid.js";
import { DEFAULT_SEED } from "./noise.js";

// LAND, MEMOISED BY SEED -- NOT THE WHOLE WORLD.
//
// Found by docs/audits/UMAA-phases-B-H.md (Finding 5): createWorld() cost
// 2.3-2.7 s per call and a REPEAT call with the identical seed was not
// materially cheaper, because it built a fresh LandField/heightAt every
// time, and generateWorld's own internal caches (cityDemand, placeFeatures --
// see city-plan.js, features.js) are keyed on that heightAt object's
// IDENTITY, not the seed value. Building it once per seed and handing back
// the same object is what lets those existing caches actually hit on a
// repeat call (measured, isolated: 2657 ms fresh heightAt vs 1227 ms same
// heightAt object) -- this file was the one thing standing between that
// saving and a caller who asks for the same seed twice.
//
// This does NOT memoise `plan`, `layers` or `grid`. `plan` still comes from
// a fresh generateWorld() call every time, because test/worldSpec.test.ts
// pins that two calls (even with the identical heightAt) must return
// independently mutable district data -- caching the plan itself would
// silently violate that. `layers` and `grid` stay one-per-call on purpose:
// test/world.test.ts's "two instances with the same seed have... independent
// layers" would break the moment two callers of the same seed got handed the
// same mutable layer-model object. LandField itself has no caller-mutable
// state after construction (nothing in this codebase writes to a LandField
// instance once built), which is what makes sharing it safe.
const landCache = new Map();

function landFor(seed) {
  let entry = landCache.get(seed);
  if (!entry) {
    const land = new LandField(16, 420, 40, seed);
    entry = { land, heightAt: makeHeightAt(land) };
    landCache.set(seed, entry);
  }
  return entry;
}

/**
 * `{ seed, layers, regions }` in, `{ seed, plan, land, layers, grid,
 * resolve, toJSON }` out.
 *
 * `plan` and `land` are the real, live generateWorld/LandField results for
 * this seed -- not a summary of them. `layers` is the layer-model instance
 * itself (add/remove/resolve/touched/clone/toJSON), so B/D's persistence and
 * undo work have a real object to call rather than a second one this file
 * would have to keep in sync with it. `resolve` and `toJSON` are re-exposed
 * at the top level because a caller working with a world should not need to
 * know it is made of a separate layer model underneath.
 *
 * `grid` is createGrid()'s own object, over `regions` (F1) -- `regions`
 * defaults to `null`, createGrid's own "the whole world is open" default,
 * so a world built with no regions argument at all behaves exactly as
 * every world did before this parameter existed.
 */
export function createWorld({ seed = DEFAULT_SEED, layers = [], regions = null } = {}) {
  const { land, heightAt } = landFor(seed);
  const plan = generateWorld(heightAt, seed);
  const layerModel = createWorldModel({ seed, layers });
  const grid = createGrid({ openRegions: regions });

  return {
    seed,
    plan,
    land,
    layers: layerModel,
    grid,
    resolve: (address) => layerModel.resolve(address),
    toJSON: () => layerModel.toJSON(),
  };
}

/**
 * Read a world back from storage.
 *
 * Only the seed and the layers were ever serialised -- toJSON() does not
 * carry the plan or the land, because both regenerate byte-identically from
 * the seed alone (that determinism is what test/worldSeed.test.ts and
 * test/planSeed.test.ts exist to pin). Storing 19,874 plots and 37,668 height
 * samples to reload a world that rebuilds them for free would be the same
 * mistake public claims data made once: keeping a copy of a number instead of
 * the thing that produces it.
 */
export function worldFromJSON(json) {
  const data = typeof json === "string" ? JSON.parse(json) : json;
  if (!data || typeof data !== "object") throw new Error("a stored world must be an object");
  return createWorld({ seed: data.seed, layers: Array.isArray(data.layers) ? data.layers : [] });
}
