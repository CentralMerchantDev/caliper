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

export function createModelRegistry() {
  const models = new Map();
  return {
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
}
