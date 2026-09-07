// =============================================================================
// CALIPER — THE MODEL REGISTRY
//
// model-forge.js's verifyModelSource already proves a generated model is
// real: it scans, compiles, builds, fits its declared triangle budget and
// footprint, and is deterministic. This is what happens to a model AFTER
// that -- it gets a name a layer's "replace" edit can reference by id.
//
// ONLY A VERIFIED MODEL GETS IN.
//
// register() refuses anything whose verdict is not ok:true. Without that
// gate, this registry is exactly the hole the rest of this project spends
// its effort closing elsewhere: a place an unverified thing could sit next
// to a verified one, indistinguishable once it's in the map.
// =============================================================================

import { TIER_MODELS } from "./tier-models.js";
import * as THREE from "three";

/**
 * Populates a model registry with all 2,400 procedural tier models from tier-models.js.
 * Models are registered with lazy geometry evaluation so memory is allocated only when drawn.
 */
export function populateRegistryFromTierModels(registry, T = THREE) {
  for (const [id, fn] of Object.entries(TIER_MODELS)) {
    if (registry.has(id)) continue;
    let specCache = null;
    let geoCache = null;

    const entry = {
      ok: true,
      stage: null,
      reason: null,
      id,
      get spec() {
        if (!specCache) specCache = fn();
        return specCache;
      },
      get footprint() {
        return this.spec.footprint;
      },
      get name() {
        return this.spec.name;
      },
      get tier() {
        return this.spec.tier;
      },
      get category() {
        return this.spec.category;
      },
      get geometry() {
        if (!geoCache) {
          const s = this.spec;
          const lod0 = s.lod && s.lod[0];
          geoCache = lod0 ? lod0.createGeometry(T) : null;
        }
        return geoCache;
      },
      get lod() {
        return this.spec.lod;
      },
    };
    registry.register(id, entry);
  }
}

export function createModelRegistry(options = {}) {
  const models = new Map();
  const reg = {
    register(id, verdict) {
      if (!id || typeof id !== "string") throw new Error("a model needs a string id to register under");
      if (!verdict || verdict.ok !== true) {
        throw new Error(`model "${id}" is not a verified model -- ${(verdict && verdict.reason) || "no verdict given"}`);
      }
      models.set(id, verdict);
      return { ok: true };
    },
    get(id) { return models.has(id) ? models.get(id) : null; },
    has(id) { return models.has(id); },
    ids() { return [...models.keys()]; },
  };

  if (options && options.populateTierModels) {
    populateRegistryFromTierModels(reg, options.THREE || THREE);
  }

  return reg;
}

