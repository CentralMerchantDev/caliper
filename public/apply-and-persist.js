// =============================================================================
// CALIPER — APPLY AND PERSIST
//
// The join: a verified model (D4) becomes a layer, referencing the model BY
// ID -- never inlining the generated source, which is the difference
// between a layer that is data (storable, sendable, diffable) and one that
// is a closure with nowhere to live. Validated by world-model.js's own
// validateLayer -- not a second check that could disagree with it -- added
// to the world, and saved.
//
// AN UNVERIFIED MODEL NEVER REACHES ANY OF THIS. Registering it would throw
// (model-registry.js's own gate); this checks first and refuses with a
// reason, so the caller gets an answer rather than an exception.
// =============================================================================

import { layerFrom, validateLayer } from "./world-model.js";

export async function applyAndPersist({ world, worldId, registry, store, request, source, verdict, modelId, layerId, author }) {
  if (!verdict || verdict.ok !== true) {
    return { ok: false, reason: `cannot persist an unverified model: ${(verdict && verdict.reason) || "no verdict"}` };
  }

  // `source` is in scope here -- the caller has it, right after D4's verify
  // step -- so the omission below is deliberate, not incidental. The layer
  // carries `modelId` only; `source` is never read past the registry, which
  // already holds it (as the verdict's own `geometry`, keyed by this same
  // id) for whatever draws it later.
  registry.register(modelId, verdict);

  const layer = layerFrom({
    id: layerId,
    author,
    edits: [{ address: request.address, op: "replace", payload: { modelId } }],
  });
  const invalid = validateLayer(layer);
  if (invalid) return { ok: false, reason: invalid };

  const added = world.layers.add(layer);
  if (!added.ok) return added;

  const saved = await store.save(worldId, world.toJSON());
  if (!saved.ok) return saved;

  return { ok: true, layer };
}
