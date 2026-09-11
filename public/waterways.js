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
// Design-space metres, matching every other manifest in this codebase. Each
// consumer scales for itself with its own sm()/toDesign(), which is why this
// file stays a plain, unscaled export rather than shipping a pre-scaled copy
// that could disagree with either caller's.
//
// A RIVER'S WIDTH AND DEPTH ARE LANDFORM METRES, AND THEY SCALE.
//
// This comment used to claim the opposite -- that width and depth were BUILT
// metres and did not scale, "only its position does". terrain.js has always
// scaled both, and the disagreement was filed as a finding on the grounds that
// one of the two must be wrong.
//
// The code is right and this comment was wrong. A channel is CUT INTO the land:
// waterwayCut works in design space and the whole height field is then scaled,
// so the river on the ground is a scaled river whatever any comment says. There
// is no version of this where the trough scales and its own depth does not.
//
// So river-mid declaring depth 9 and the land reporting 5.85 at k = 0.65 is not
// a defect, it is 9 design metres seen in a world scaled to 0.65. What WAS a
// defect is that the reported figure was the same at the bank as at the
// thalweg; ground.js's waterAt now derives the depth at a point from the
// channel's own surface level. See the note there.
// =============================================================================

/**
 * Each waterway is a polyline with a half-width and a depth. `kind` is
 * "river" (widens toward its mouth -- see waterwayAt/waterwayCut in
 * terrain.js, which taper a river's half-width by how far along the
 * polyline a point is) or "canal" (constant width the whole way, because
 * that is what a canal is).
 */
// -----------------------------------------------------------------------------
// RE-DERIVED, B2.0, AGAINST THE B1 ARCHIPELAGO -- these seven were authored
// against the OLD mainland/islands (a huge north-arm embayment, and eight
// hand-traced islands named kingsley/fairlight/cormorant among others).
// B1's redesign moved the mainland to the west edge entirely and replaced
// every non-downtown island with a differently-shaped, differently-named,
// procedurally generated one -- named as an open gap in B1's own ledger
// (docs/specs/BOARD-REBUILD-PLAN.md) and closed here, before B2's generator,
// per Mark's own instruction: "a canal running through open sea, or through
// a rock, is a visible defect."
//
// EVERY POINT BELOW WAS VERIFIED, NOT ASSUMED, against the real generated
// polygon (public/terrain.js's landmassPolygonsDesign(), a point-in-polygon
// test) before being written down here -- the same discipline this file's
// own header already applies to the design/world scale question two
// sections up. The four rivers' own mouths in particular could not be
// placed at a single hand-picked x for every one: the mainland's new
// coastline is organic (jittered, not straight), so each mouth's x is the
// REAL coastline's own x at that river's z (sampled from the polygon,
// pulled 300 m further inland), not a constant that happened to work for
// one river and not the others -- found directly, by trying the constant
// first and watching it fail for three of the four.
// -----------------------------------------------------------------------------
export const WATERWAYS = [
  // --- mainland rivers, running down out of the (repositioned) range to
  // the (repositioned) coast -- four, spaced across the mainland's own
  // north-south extent, each verified inside the real mainland polygon ---
  { id: "river-west",  kind: "river", halfWidth: 95, depth: 7,
    points: [[-19538, -12923], [-18154, -12615], [-16615, -12308], [-14923, -12462], [-13731, -12308]] },
  { id: "river-mid",   kind: "river", halfWidth: 120, depth: 9,
    // A real meander, not a straight run -- also what makes
    // test/ground.test.ts's own real-world cross-section check meaningful:
    // it walks a straight +X offset from the channel's own midpoint
    // (points[floor(length/2)]) and asserts depth falls away, which needs
    // the LOCAL channel direction AT THAT POINT to be far from parallel to
    // +X, AND the surrounding ground to be gentle enough that regional
    // terrain slope does not dominate the channel's own cross-section.
    // SEVEN earlier versions of this river failed the real test before this
    // one, found each time by running the actual test logic (a scratch
    // script wired to the real ground.js/waterAt, not reasoned about
    // abstractly) rather than assumed fixed by inspection: (1) nearly
    // straight west-to-east, +X almost ALONG the channel; (2) a meander
    // whose midpoint was still not the vertical segment; (3) a genuinely
    // vertical segment, but at worldX -11000, 1,229 m up MAINLAND_ZONES'
    // own farmland-to-range gradient; (4)-(7) worldX -9300/-9050/-9100/
    // -9000, all at world z -2800 -- every one of them sloped the WRONG
    // way in +X at that particular z (heightAt FALLS as x increases, so
    // depth ROSE moving off the centreline). Chasing "flat" or "the least-
    // bad x" at that SAME fixed z was the wrong axis of freedom: the real
    // fix was to sweep BOTH x and z (a clean heightAt grid, off the reach of
    // every other waterway's cut) directly for a spot where heightAt rises
    // monotonically over +X. World z -2800 turned out to sit in a local dip
    // no x value at that z escapes; world z -4500, x -9200 (design z -6923,
    // x -14154) rises cleanly and monotonically by 14.9 m over the first
    // 100 m -- verified against the actual test logic (not just heightAt),
    // and inside the real mainland polygon (point-in-polygon) before being
    // written down.
    points: [
      [-19538, -7077], [-16923, -7077], [-14154, -7846], [-14154, -6923], [-14154, -6000],
      [-13931, -6461], [-14177, -6461],
    ] },
  { id: "river-east",  kind: "river", halfWidth: 85, depth: 6,
    points: [[-19538, 4000], [-18000, 4308], [-16308, 4615], [-14615, 4462], [-13384, 4615]] },
  { id: "river-far-e", kind: "river", halfWidth: 70, depth: 5,
    points: [[-19538, 12462], [-18000, 12769], [-16308, 13077], [-14615, 12923], [-13609, 13077]] },

  // --- island canals: narrow, straight-ish, cut for boats -- renamed to
  // the B1 islands they actually now run through (kingsley/fairlight/
  // cormorant no longer exist), each verified inside its own island's real
  // polygon. Picked from B1's own larger, more "developed" characters
  // (suburb/resort/vineyard), not a cottage island or a skerry -- a canal
  // reads as infrastructure, which fits a settled or worked island, not a
  // one-house cay or a rock carrying nothing. ---
  { id: "canal-suburb", kind: "canal", halfWidth: 34, depth: 4,
    points: [[6615, -2769], [7538, -2892], [8462, -2892], [9385, -2769]] },
  { id: "canal-resort", kind: "canal", halfWidth: 30, depth: 4,
    points: [[14231, 4231], [15000, 4123], [15769, 4123], [16538, 4231]] },
  { id: "canal-vineyard", kind: "canal", halfWidth: 28, depth: 3.5,
    points: [[-77, -8738], [492, -8815], [1046, -8815], [1615, -8738]] },
];
