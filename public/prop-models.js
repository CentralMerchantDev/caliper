// =============================================================================
// THE JOIN BETWEEN THE MANIFEST AND THE MODEL LIBRARY
//
// Two id spaces exist, and they were built for different reasons:
//
//   prop-manifest.js  12 ids -- bench, bin, lampPost, tree, car, person ...
//                     Each states a FOOTPRINT and a CLEARANCE. This is the
//                     PLACEMENT layer: what claims ground, and how much.
//
//   props.js          67 static models plus 5 generator families. Each states
//                     geometry at three levels of detail. This is the SHAPE
//                     layer: what you actually see.
//
// city-render.js already uses the first for claiming and then builds the shape
// inline from primitives -- a bench is a BoxGeometry, a lamp is a cylinder and a
// box. So the model library was merged and nothing in the world drew from it.
//
// This module is the join, and it is written OUT IN FULL on purpose.
//
// WHY NOT MATCH THE NAMES AUTOMATICALLY
//
// Nine of the twelve nearly match by string ("bench" -> "bench-slat",
// "busShelter" -> "bus-shelter"), which is exactly the trap. A normaliser that
// gets eight right and one wrong puts a bin where a bench should be, silently,
// and the world still renders. Written out, a missing entry is a missing entry.
//
// THE THREE THAT ARE NOT STATIC MODELS
//
// tree, car and person are not entries in MODELS at all -- they are generator
// FAMILIES, because a street of identical trees is the defect this whole library
// exists to end. They resolve to a call, seeded per instance by the caller.
//
// FOOTPRINTS MUST AGREE, AND THAT IS THE LOAD-BEARING PROPERTY
//
// The manifest decides how much ground a prop claims; the model decides how big
// it looks. If those disagree, props overlap again -- which is the measured
// defect prop-manifest.js was written to fix in the first place ("27 lamp posts
// standing inside a bin or a bench, one pair 5 cm apart"). test/propModels.test.ts
// asserts they agree for every static id, which is the only reason swapping the
// geometry is safe.
// =============================================================================
import { PROPS } from "./prop-manifest.js";
import * as P from "./props.js";

/**
 * manifest id -> what draws it.
 *
 * `model` names a MODELS entry. `gen` is a function of the props.js module and a
 * per-instance seed, for the families that must vary. Exactly one of the two.
 */
export const MODEL_FOR = {
  // --- static: one manifest id, one model ---
  bench:      { model: "bench-slat" },
  bin:        { model: "bin-round" },
  busShelter: { model: "bus-shelter" },
  lampPost:   { model: "lamp-street" },
  container:  { model: "container" },
  mooring:    { model: "mooring" },
  beacon:     { model: "beacon" },
  railTie:    { model: "rail-tie" },
  parasol:    { model: "parasol" },

  // --- generated: the ones that must not repeat ---
  //
  // Mark, on the world as it stands: "the whole sectors with nothing but the
  // same buildings is not good". The same is true at street level, and these
  // three are the props a visitor sees hundreds of at once.
  tree: {
    gen: (p, seed) => {
      const species = ["broadleaf", "conifer", "palm", "cypress"][seed % 4];
      const age = ["sapling", "mature", "ancient"][(seed >> 2) % 3];
      return p.tree(species, age);
    },
    variants: 12,
  },
  car: {
    gen: (p, seed) => {
      const cls = ["car", "van", "taxi", "truck"][seed % 4];
      return p.vehicle(cls);
    },
    variants: 4,
  },
  person: {
    gen: (p, seed) => {
      const build = ["adult", "child", "tall"][seed % 3];
      const pose = ["standing", "walking", "sitting"][(seed >> 2) % 3];
      return p.person(build, pose);
    },
    variants: 9,
  },
};

/**
 * The model descriptor behind a manifest id.
 *
 * Throws rather than returning undefined. A prop that cannot be drawn is a
 * defect in this table, and the alternative -- a silent nothing where a bench
 * should be -- is the failure mode this file exists to make impossible.
 */
export function propModel(id, seed = 0) {
  const entry = MODEL_FOR[id];
  if (!entry) {
    throw new Error(
      `no model for prop "${id}". Every id in prop-manifest.js needs an entry in ` +
      `MODEL_FOR -- add one rather than letting it fall through to nothing.`,
    );
  }
  if (entry.gen) return entry.gen(P, seed >>> 0);
  const m = P.MODELS[entry.model];
  if (!m) {
    throw new Error(
      `MODEL_FOR["${id}"] names "${entry.model}", which is not in props.js MODELS. ` +
      `The library was renamed under this table.`,
    );
  }
  return m;
}

// Geometry is built once per (id, seed, lod) and shared. An InstancedMesh needs
// one geometry for thousands of instances, and rebuilding it per call would be
// the same waste the manifest's own header warns about.
const cache = new Map();

/**
 * Build (or reuse) the geometry for a prop.
 *
 * @param {string} id     a prop-manifest id
 * @param {object} THREE  the renderer's own three, so there is one copy of it
 * @param {object} opts   { lod = 0, seed = 0 }
 */
export function propGeometry(id, THREE, { lod = 0, seed = 0 } = {}) {
  const key = `${id}|${seed}|${lod}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const model = propModel(id, seed);
  const levels = model.lod || [];
  // Fall back DOWN to the coarsest available rather than throwing: a model with
  // only LOD0 asked for at LOD2 should draw, not vanish.
  const chosen = levels.find((l) => l.level === lod) || levels[levels.length - 1];
  if (!chosen || typeof chosen.createGeometry !== "function") {
    throw new Error(`prop "${id}" resolved to a model with no usable LOD ${lod} geometry`);
  }
  const g = chosen.createGeometry(THREE);
  cache.set(key, g);
  return g;
}

/** Drop every cached geometry. For teardown, and for tests that count builds. */
export function disposePropGeometry() {
  for (const g of cache.values()) g.dispose?.();
  cache.clear();
}

/**
 * How many manifest ids have a model, and which do not.
 *
 * Reported rather than asserted here, so a caller (or a test) can decide what to
 * do about a gap. Silence about a gap is what let the library sit merged and
 * unused.
 */
export function modelCoverage() {
  const ids = Object.keys(PROPS);
  const missing = ids.filter((id) => !MODEL_FOR[id]);
  const orphans = Object.keys(MODEL_FOR).filter((id) => !PROPS[id]);
  return { total: ids.length, covered: ids.length - missing.length, missing, orphans };
}
