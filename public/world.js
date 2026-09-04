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
  const land = new LandField(16, 420, 40, seed);
  const heightAt = makeHeightAt(land);
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
