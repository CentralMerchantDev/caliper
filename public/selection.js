// =============================================================================
// CALIPER — SELECTION
//
// spatial-index.js already answers "what is at this point" -- plot, block,
// district, settlement. What was missing was the STATE: a click resolves to
// an address, and then the player asks D2's plain-English box to change
// THAT thing, which means something has to remember what was picked between
// the click and the request. This is that memory, and nothing else --
// addressing itself stays exactly where it is, in spatial-index.js.
// =============================================================================

export function createSelection(index) {
  let current = null;
  return {
    get current() { return current; },
    /** A click at world (x, z) resolves to an address and becomes selected. */
    pick(x, z) {
      current = index.addressAt(x, z);
      return current;
    },
    clear() { current = null; },
  };
}
