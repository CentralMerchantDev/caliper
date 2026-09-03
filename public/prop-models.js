// =============================================================================
// THE JOIN BETWEEN THE MANIFEST AND THE MODEL LIBRARY
//
// prop-manifest.js  12 ids -- bench, bin, lampPost, tree, car, person ...
//                   Each states a FOOTPRINT and a CLEARANCE. The PLACEMENT
//                   layer: what claims ground, and how much.
//
// props.js          84 models plus 5 generator families, each with geometry at
//                   three levels of detail. The SHAPE layer: what you see.
//
// city-render.js used the first to claim and then built the shape inline from
// primitives -- a bench was a BoxGeometry -- so the library was merged and the
// world drew none of it.
//
// THE FIRST VERSION OF THIS FILE WROTE THE MAPPING OUT BY HAND. IT SHOULD NOT
// HAVE, AND MEASURING IS WHAT SAID SO.
//
// I wrote a nine-entry table mapping bench -> "bench-slat", bin -> "bin-round",
// busShelter -> "bus-shelter" and so on, with a long comment arguing that
// spelling it out beat matching names automatically. The argument was fine. The
// premise was wrong: props.js ALREADY DECLARES THE JOIN, at its foot --
//
//     MODELS["bench"]      = MODELS["bench-slat"];
//     MODELS["bin"]        = MODELS["bin-round"];
//     MODELS["busShelter"] = MODELS["bus-shelter"];
//     MODELS["lampPost"]   = MODELS["lamp-street"];
//     MODELS["railTie"]    = MODELS["rail-tie"];
//     ... and tree, car, person, boat
//
// -- as ALIASES named exactly for the manifest ids. Measured: all twelve
// manifest ids resolve through MODELS by their own name, either as an alias or
// as a model of that name. Every mapping in my table was a second copy of a
// fact the library already stated.
//
// Two hand-maintained tables that must agree is the exact failure this session
// has been writing tests against: the page's test count against the runner's,
// a prop's declared footprint against its geometry, a road's design gradient
// against the corridor search that approved it. It would have gone wrong the
// first time agy renamed a model, and it would have gone wrong silently,
// because both halves would still have been internally consistent.
//
// So the library resolves the name. This module adds exactly one thing the
// library cannot: SEEDING.
//
// WHY SEEDING IS STILL NEEDED
//
// MODELS["tree"] is an alias for tree-broadleaf-mature -- ONE tree. A park of
// four hundred of those is the defect the generator families exist to end, and
// the one Mark named first: "the whole sectors with nothing but the same
// buildings is not good". So tree, car and person resolve to a generator CALL
// seeded per instance, and everything else resolves straight through.
// =============================================================================
import { PROPS } from "./prop-manifest.js";
import * as P from "./props.js";

/**
 * The families that must not repeat, and how a seed picks a variant.
 *
 * Everything NOT listed here resolves through props.js MODELS by its own name.
 * Adding an entry is a decision that one fixed model is not good enough for how
 * many of them the world places at once.
 */
export const VARIED = {
  tree: {
    variants: 12,
    pick: (p, seed) => p.tree(
      ["broadleaf", "conifer", "palm", "cypress"][seed % 4],
      ["sapling", "mature", "ancient"][(seed >> 2) % 3],
    ),
  },
  car: {
    variants: 4,
    pick: (p, seed) => p.vehicle(["car", "van", "taxi", "truck"][seed % 4]),
  },
  person: {
    variants: 9,
    pick: (p, seed) => p.person(
      ["adult", "child", "tall"][seed % 3],
      ["standing", "walking", "sitting"][(seed >> 2) % 3],
    ),
  },
};

/**
 * The model behind a manifest id.
 *
 * Throws rather than returning undefined. A prop that cannot be drawn is a
 * defect in the library, and the alternative -- a silent nothing where a bench
 * should be -- is what this file exists to make impossible.
 */
export function propModel(id, seed = 0) {
  const varied = VARIED[id];
  if (varied) return varied.pick(P, seed >>> 0);
  const m = P.MODELS[id];
  if (!m) {
    throw new Error(
      `props.js has no model named "${id}". The library resolves manifest ids by ` +
      `their own name -- see the alias block at the foot of props.js -- so either ` +
      `the alias was removed or the id is not a prop.`,
    );
  }
  return m;
}

// Built once per (id, seed, lod) and shared: an InstancedMesh draws thousands
// from one geometry, and rebuilding per call would be both slow and a leak.
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
  // only LOD0, asked for at LOD2, should draw rather than vanish.
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
 * Which manifest ids the library can draw, and which it cannot.
 *
 * Reported rather than asserted here so a caller can decide what to do about a
 * gap. Silence about a gap is what let the library sit merged and unused.
 */
export function modelCoverage() {
  const ids = Object.keys(PROPS);
  const missing = ids.filter((id) => !VARIED[id] && !P.MODELS[id]);
  const varied = Object.keys(VARIED).filter((id) => !PROPS[id]);
  return { total: ids.length, covered: ids.length - missing.length, missing, variedButNotAProp: varied };
}
