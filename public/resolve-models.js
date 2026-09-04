// =============================================================================
// CALIPER — RESOLVE AN OVERRIDE AGAINST THE MODEL REGISTRY
//
// instance-groups.js already pulled every overridden placement out of its
// shared instance group. This is the next question: a "replace" override
// names a model id, and that id has to actually be a MODEL, registered and
// verified, or the placement has nothing to draw at all -- refused, by id,
// not silently drawn as a default box.
//
// A "retint" or "move" override never claims a model, so it never asks the
// registry anything; it draws the placement's own stock model with the
// tweak applied, which is a rendering concern for whoever calls this, not
// this function's.
// =============================================================================

export function resolveOverrideModels(overridden, registry) {
  const resolved = [];
  const refused = [];
  for (const p of overridden) {
    const replace = p.override && p.override.replace;
    if (!replace) {
      resolved.push(p);
      continue;
    }
    const modelId = replace.modelId;
    const model = registry.get(modelId);
    if (!model) {
      refused.push({ plotId: p.plotId, modelId, reason: `no model registered for id "${modelId}"` });
      continue;
    }
    resolved.push({ ...p, model });
  }
  return { resolved, refused };
}
