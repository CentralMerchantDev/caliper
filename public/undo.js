// =============================================================================
// CALIPER — UNDO IS DROPPING A LAYER
//
// world-model.js's remove() already does the actual work and is proven in
// isolation: drop exactly this layer's edits, leave every other author's
// standing. What isolation cannot prove is persistence -- a removal that
// only happens in the in-memory world and is never re-saved is undone right
// up until the next reload brings it straight back. So this always
// re-persists after a successful remove, in the same place D7's
// apply-and-persist does, using the same store.
// =============================================================================

export async function undoLayer(world, worldId, layerId, store) {
  const removed = world.layers.remove(layerId);
  if (!removed.ok) return removed;

  const saved = await store.save(worldId, world.toJSON());
  if (!saved.ok) return saved;

  return { ok: true };
}
