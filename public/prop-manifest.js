// =============================================================================
// WHAT THE SMALL THINGS ARE, AND HOW MUCH GROUND THEY STAND ON
//
// WHY THIS FILE EXISTS
//
// Until now a bench was this, and only this:
//
//     put(new THREE.BoxGeometry(1.8, 0.45, 0.55), M(0xa9835a, 0.85), spots.bench, ...)
//
// There was no bench anywhere in the world. There was a call. Its dimensions
// existed as arguments to a constructor, on the same line as its colour and its
// placement list, and nothing outside that line could ask how big a bench is.
//
// That is not a tidiness complaint. The renderer places 2,407 lamps and 11,135
// pieces of street furniture in two separate loops that walk the SAME footways
// and cannot see each other, because neither has anything to see. Measured
// inside the real renderer, before this file existed: 27 lamp posts stand inside
// a bin or a bench, and one pair of centres is 5 cm apart. That is one pair of
// systems. Trees, cars, parasols, containers and boats are each placed by their
// own loop, and none of them can ask the question either -- so nobody knows the
// real total. 27 is what one cheap probe found, not a count of the problem.
//
// This is the same cut features.js already made for the big things: a feature
// states WHAT IT NEEDS and the land answers. Here a prop states WHAT IT IS and
// WHAT IT OCCUPIES, and something else decides where it goes.
//
// GROUND FOOTPRINT IS NOT THE SAME AS VISUAL EXTENT
//
// The lamp is the case that proves it needs two numbers, not one. Its post is
// CylinderGeometry(0.22, 0.3, 9) -- 0.6 m across where it meets the pavement.
// Its head is BoxGeometry(1.6, 0.5, 0.9), 1.6 m wide, sitting 9.1 m up. A bench
// under that head is fine and is what real streets look like. A bench through
// the post is not. One "size" per object cannot express that difference, so
// `foot` is what the object occupies AT GROUND LEVEL and `sweep` is how far it
// reaches at height. The registry cares about `foot`; a camera cares about
// `sweep`.
//
// BUILT METRES DO NOT SCALE
//
// Every number in this file is a real-world measurement of a manufactured
// object. A bench is 1.8 m long in a world of any size. Landform metres scale by
// WORLD_SCALE; these do not, and nothing here may be multiplied by it. That rule
// has already been broken once in this project, silently, and cost a working
// container port.
//
// PROVENANCE
//
// Every entry records the constructor it was read from, so that when the
// geometry changes and this file does not, the drift is findable rather than
// merely present. public/props.js (the asset lane) imports its dimensions FROM
// HERE rather than restating them, so there is one place a size is written down.
// =============================================================================

/**
 * `kind`
 *   "hard" -- nothing may be placed over it. Remove it first.
 *   "soft" -- may be built over; the thing that does so replaces it.
 *
 * `foot`  { w, d } ground occupancy in metres, before rotation.
 * `sweep` { w, d } widest extent at any height, when it differs from `foot`.
 * `h`     total height in metres.
 * `clear` extra free ground required around `foot`, in metres.
 * `sized` true when the object has no fixed size and is scaled per instance --
 *         the caller must supply `foot` at placement time. Declaring this
 *         explicitly is better than inventing an average: a tree is not one size.
 */
export const PROPS = {
  // --- street furniture: city-render.js, the STREET FURNITURE block ---------
  bin: {
    kind: "hard", cat: "furniture", h: 1.0, clear: 0.25,
    foot: { w: 0.64, d: 0.64 },
    from: "CylinderGeometry(0.32, 0.28, 1.0, 6) -- widest radius 0.32",
  },
  bench: {
    kind: "hard", cat: "furniture", h: 0.45, clear: 0.4,
    foot: { w: 1.8, d: 0.55 },
    from: "BoxGeometry(1.8, 0.45, 0.55)",
  },
  busShelter: {
    kind: "hard", cat: "furniture", h: 2.5, clear: 0.5,
    foot: { w: 3.6, d: 1.4 },
    from: "BoxGeometry(3.6, 2.5, 1.4)",
  },

  // --- lighting: city-render.js, the street lighting block -----------------
  lampPost: {
    // 9.35, NOT 9.1. The head is BoxGeometry(1.6, 0.5, 0.9) CENTRED at y+9.1,
    // so it spans 8.85 to 9.35 and the top of the lamp is 9.35. 9.1 was the
    // centre of the head read as if it were the top -- and `h` is what a
    // placement writes as the object's yMax, so every lamp in the world claimed
    // 25 cm less volume than it occupies. Nothing caught it because nothing
    // checked `h` against anything at all.
    kind: "hard", cat: "lamp", h: 9.35, clear: 0.3,
    foot: { w: 0.6, d: 0.6 },      // the post, where it meets the pavement
    sweep: { w: 1.6, d: 0.9 },     // the head, 9.1 m up -- may overhang
    from: "CylinderGeometry(0.22, 0.3, 9, 5) + head BoxGeometry(1.6, 0.5, 0.9) at y+9.1",
  },

  // --- port ----------------------------------------------------------------
  container: {
    kind: "hard", cat: "structure", h: 2.6, clear: 0.1,
    foot: { w: 12, d: 2.6 },
    from: "BoxGeometry(12, 2.6, 2.6)",
  },
  mooring: {
    kind: "hard", cat: "structure", h: 1.0, clear: 0.3,
    foot: { w: 0.56, d: 0.56 },
    from: "CylinderGeometry(0.22, 0.28, 1, 5) -- widest radius 0.28",
  },
  beacon: {
    kind: "hard", cat: "structure", h: 9.0, clear: 1.0,
    foot: { w: 4.0, d: 4.0 },
    from: "CylinderGeometry(1.4, 2.0, 9, 8) -- widest radius 2.0",
  },

  // --- railway -------------------------------------------------------------
  railTie: {
    // SOFT on purpose. A sleeper is not an obstruction to build around, it is
    // part of a corridor that is reserved as a whole by features.js. Marking it
    // hard would have every tie in a 22 km railway fight its own track.
    kind: "soft", cat: "structure", h: 0.35, clear: 0,
    foot: { w: 3.2, d: 0.42 },
    from: "BoxGeometry(3.2, 0.35, 0.42)",
  },

  // --- scaled per instance: no fixed size, and saying so is the honest answer -
  tree: {
    kind: "soft", cat: "vegetation", sized: true, clear: 0.5,
    from: "trunk CylinderGeometry(0.45, 0.8, 6, 4), canopy Sphere(1)/Cone(1, 2.4) scaled per instance",
  },
  car: {
    kind: "hard", cat: "vehicle", sized: true, clear: 0.2,
    from: "collector buckets -- unit primitives scaled at emit time",
  },
  person: {
    // Soft, and deliberately so: a person is not an obstruction to planning
    // permission. They are in the manifest because "know everything that is in
    // the world" includes them, not because anything must build around them.
    kind: "soft", cat: "pedestrian", sized: true, clear: 0,
    from: "collector buckets -- unit primitives scaled at emit time",
  },
  parasol: {
    kind: "soft", cat: "furniture", sized: true, clear: 0.3,
    from: "collector buckets -- unit primitives scaled at emit time",
  },
};

/**
 * The ground rectangle a prop occupies, ready for the world registry.
 *
 * ROTATION SWAPS THE AXES, AND FORGETTING THAT IS A REAL BUG WAITING. Benches
 * and shelters are rotated to face the road (`rotFromEw` in the renderer), so a
 * 1.8 x 0.55 bench on a north-south street occupies 0.55 x 1.8 of ground. A
 * footprint that ignored rotation would be wrong on half of every city.
 *
 * @param {string} id      key into PROPS
 * @param {number} x       world metres
 * @param {number} z       world metres
 * @param {object} [opts]  { rotated: boolean, foot: {w,d} for `sized` props }
 */
export function propFootprint(id, x, z, opts = {}) {
  const p = PROPS[id];
  if (!p) throw new Error(`unknown prop "${id}" -- add it to PROPS before placing it`);

  const foot = p.sized ? opts.foot : p.foot;
  if (!foot) {
    throw new Error(
      `prop "${id}" is scaled per instance, so its footprint must be supplied ` +
      `at placement. Passing no size would silently reserve nothing.`,
    );
  }

  const pad = p.clear || 0;
  const w = (opts.rotated ? foot.d : foot.w) + pad * 2;
  const d = (opts.rotated ? foot.w : foot.d) + pad * 2;
  return { xMin: x - w / 2, xMax: x + w / 2, zMin: z - d / 2, zMax: z + d / 2 };
}

/**
 * A prop, in the form the land layer speaks.
 *
 * THIS FILE AND THE MODEL CONTRACT WERE TWO SCHEMAS THAT COULD NOT MEET, and
 * nothing noticed because nothing ever joined them. The manifest says
 * { kind, h, clear, foot }; ground.canPlace wants { footprint, height,
 * clearance, category } -- so canPlace(PROPS.bench) threw "needs a footprint
 * with a real width and depth". Every prop in the world was undeclarable to the
 * only thing that can place it, while both files described the same benches.
 *
 * The manifest keeps its terse authoring form, because it is a table someone
 * reads and edits against geometry. This translates it, in one place, so there
 * is still exactly one number for a bench's width.
 *
 * `kind` in the manifest is HARD/SOFT. `kind` in the registry is
 * road/plot/feature. They are different vocabularies that were both called
 * kind; here the first becomes `occupancy` and the second becomes "prop".
 *
 * @param {string} id
 * @param {object} [opts] { foot } -- required for `sized` props, which have no
 *   size of their own and must be given one at placement.
 */
export function modelFor(id, opts = {}) {
  const p = PROPS[id];
  if (!p) throw new Error(`unknown prop "${id}" -- add it to PROPS before placing it`);

  const foot = p.sized ? opts.foot : p.foot;
  if (!foot) {
    throw new Error(
      `prop "${id}" is scaled per instance, so its footprint must be supplied ` +
      `at placement. Passing no size would silently reserve nothing.`,
    );
  }
  if (!p.cat) throw new Error(`prop "${id}" declares no category, so no surface can say whether it accepts one`);

  return {
    id,
    kind: "prop",
    category: p.cat,
    occupancy: p.kind,
    footprint: { w: foot.w, d: foot.d },
    height: p.sized ? (opts.height || 0) : p.h,
    clearance: p.clear || 0,
    sweep: p.sweep || null,
  };
}

/** Every prop that blocks ground. Soft props are placeable-over and excluded. */
export function hardPropIds() {
  return Object.keys(PROPS).filter((k) => PROPS[k].kind === "hard");
}
