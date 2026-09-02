// =============================================================================
// RIVERS AND CANALS -- THE MANIFEST
//
// Moved out of terrain.js so this data has no dependency direction at all:
// terrain.js carves the height field with it, and city-plan.js registers its
// footprint in the world registry with it. Before this file existed, only
// terrain.js had it, and terrain.js already imports WORLD and
// landmassPolygonsDesign FROM city-plan.js -- so a city-plan.js import of
// WATERWAYS from terrain.js would have been a cycle: city-plan.js waiting on
// terrain.js waiting on city-plan.js, live-binding a `const` that had not
// finished initialising yet. A third, dependency-free module is the fix, not
// a workaround -- this data was never terrain.js's to own any more than it is
// city-plan.js's; both files consume it.
//
// Design-space metres, matching every other manifest in this codebase.
// world-scale.js's rule applies here too: a river's width and depth are BUILT
// metres and do not scale with the world; only its position does. Each
// consumer scales for itself with its own sm()/toDesign(), which is why this
// file stays a plain, unscaled export rather than shipping a pre-scaled copy
// that could disagree with either caller's.
// =============================================================================

/**
 * Each waterway is a polyline with a half-width and a depth. `kind` is
 * "river" (widens toward its mouth -- see waterwayAt/waterwayCut in
 * terrain.js, which taper a river's half-width by how far along the
 * polyline a point is) or "canal" (constant width the whole way, because
 * that is what a canal is).
 */
export const WATERWAYS = [
  // --- mainland rivers, running down out of the range to the coast ---
  { id: "river-west",  kind: "river", halfWidth: 95, depth: 7,
    points: [[-11700, -9200], [-11500, -7400], [-11350, -5600], [-11250, -4200], [-11200, -3050]] },
  { id: "river-mid",   kind: "river", halfWidth: 120, depth: 9,
    points: [[-5400, -10400], [-5500, -8200], [-5700, -6200], [-5800, -4400], [-5900, -3000]] },
  { id: "river-east",  kind: "river", halfWidth: 85, depth: 6,
    points: [[900, -9800], [800, -7600], [700, -5600], [640, -4000], [600, -2980]] },
  { id: "river-far-e", kind: "river", halfWidth: 70, depth: 5,
    points: [[11800, -8600], [11600, -6600], [11500, -4800], [11400, -3400], [11400, -2380]] },

  // --- island canals: narrow, straight-ish, cut for boats ------------------
  { id: "canal-kingsley", kind: "canal", halfWidth: 34, depth: 4,
    points: [[-6900, -900], [-6100, -600], [-5200, -420], [-4300, -350]] },
  { id: "canal-fairlight", kind: "canal", halfWidth: 30, depth: 4,
    points: [[3500, -600], [4400, -420], [5300, -380], [6200, -500]] },
  { id: "canal-cormorant", kind: "canal", halfWidth: 28, depth: 3.5,
    points: [[-14600, -900], [-13800, -700], [-13000, -620]] },
];
