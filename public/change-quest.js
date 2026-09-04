// =============================================================================
// CALIPER — "CHANGE SOMETHING IN THE WORLD"
//
// The quest hands the player to the agent; it does not say how (E1). This
// says when it is DONE, and the single most important property of that
// answer is that it can only be earned by an actual edit. A UI flag is free
// to set and proves nothing; `state.changed.touchedAddresses` comes from
// world-model.js's own touched(), which only ever grows when a real layer
// with a real edit was added and validated.
// =============================================================================

export const changeSomethingQuest = {
  id: "change-something",
  title: "Make your mark",
  brief: "Select something in the world and change it.",
  check(state) {
    const touched = (state.changed && state.changed.touchedAddresses) || [];
    return {
      done: touched.length > 0,
      progress: touched.length > 0 ? 1 : 0,
      note: touched.length > 0 ? `changed ${touched.length} thing${touched.length === 1 ? "" : "s"}` : null,
    };
  },
};
