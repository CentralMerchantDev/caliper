// THE LIBRARY WAS MERGED AND NOTHING DREW FROM IT.
//
// 111 registered assets landed on main and the world carried on building a bench
// out of a BoxGeometry, because prop-manifest.js (which claims ground) and
// props.js (which has the shapes) are two id spaces with no join between them.
// prop-models.js is that join, and these are the tests that make swapping the
// geometry safe rather than hopeful.
//
// THE ONE THAT MATTERS IS THE FOOTPRINT AGREEMENT.
//
// The manifest decides how much ground a prop CLAIMS. The model decides how big
// it LOOKS. city-render.js claims with the first and will now draw with the
// second, so if the two disagree the props overlap again -- and overlapping
// props is the exact defect prop-manifest.js was written to fix: "27 lamp posts
// standing inside a bin or a bench, one pair 5 cm apart".
//
// A test that only checked "every id resolves to something" would pass with a
// bin drawn where a bench belongs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PROPS } from "../public/prop-manifest.js";
import { VARIED, propModel, propGeometry, modelCoverage, disposePropGeometry } from "../public/prop-models.js";
import { MODELS } from "../public/props.js";
import * as THREE from "three";

/** Every manifest id: the twelve things city-render can claim ground for. */
const MANIFEST_IDS = Object.keys(PROPS);

test("the LIBRARY declares the join, and still does", () => {
  // This is the load-bearing one, and it is the reason this file no longer
  // carries a hand-written mapping table.
  //
  // props.js ends with an alias block -- MODELS["bench"] = MODELS["bench-slat"]
  // and eight more -- so every manifest id resolves through the library by its
  // own name. The first version of prop-models.js wrote that mapping out again
  // by hand, which meant two tables that had to agree and no way to notice when
  // they stopped.
  //
  // If agy removes or renames an alias, resolution would silently fall through
  // to whatever the seeded path or a stale entry produced. This makes that a
  // failure with a name in it instead.
  const unresolvable = MANIFEST_IDS.filter((id) => !VARIED[id] && !MODELS[id]);
  assert.deepEqual(
    unresolvable, [],
    "props.js no longer resolves these manifest ids by name -- check the alias " +
    `block at the foot of props.js: ${unresolvable.join(", ")}`,
  );
});

test("every prop the world can place has a model to draw it", () => {
  const c = modelCoverage();
  assert.deepEqual(c.missing, [], `no model for: ${c.missing.join(", ")}`);
  assert.equal(c.covered, c.total, `${c.covered} of ${c.total} manifest props have a model`);
});

test("nothing is seeded that is not a prop", () => {
  // A VARIED entry for an id the manifest has never heard of is a rename that
  // half-landed. Harmless to render, and a lie about what varies.
  const c = modelCoverage();
  assert.deepEqual(
    c.variedButNotAProp, [],
    `VARIED names things that are not in prop-manifest.js: ${c.variedButNotAProp.join(", ")}`,
  );
});

test("what the model CLAIMS and what it DRAWS are the same size", () => {
  // Static ids only: the seeded families (tree, car, person) are declared
  // `sized: true` in the manifest, meaning the caller scales them per instance,
  // so there is no single footprint to compare against.
  const disagreements: string[] = [];
  for (const id of MANIFEST_IDS) {
    if (VARIED[id]) continue;
    const manifest = (PROPS as any)[id];
    if (!manifest || manifest.sized) continue;
    const model: any = propModel(id);
    if (!model.footprint) { disagreements.push(`${id}: the model declares no footprint`); continue; }
    // 5 cm. Tight enough that a bench cannot be drawn as a bus shelter, loose
    // enough that a model may round a dimension for its own geometry.
    const dw = Math.abs(model.footprint.w - manifest.foot.w);
    const dd = Math.abs(model.footprint.d - manifest.foot.d);
    if (dw > 0.05 || dd > 0.05) {
      disagreements.push(
        `${id}: manifest claims ${manifest.foot.w} x ${manifest.foot.d} m, ` +
        `model draws ${model.footprint.w} x ${model.footprint.d} m`,
      );
    }
  }
  assert.deepEqual(disagreements, [], "the claim layer and the shape layer disagree:\n  " + disagreements.join("\n  "));
});

test("every prop builds real geometry, with real triangles", () => {
  disposePropGeometry();
  for (const id of MANIFEST_IDS) {
    const g: any = propGeometry(id, THREE, { seed: 0 });
    assert.ok(g, `${id} produced no geometry`);
    const pos = g.getAttribute?.("position");
    assert.ok(pos && pos.count > 0, `${id} produced geometry with no vertices`);
    // Guardrail: a degenerate geometry -- every vertex at the origin -- has
    // vertices and no size, and would pass a bare count check while drawing
    // nothing.
    g.computeBoundingBox();
    const b = g.boundingBox;
    const size = Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z);
    assert.ok(size > 0.01, `${id} produced geometry with no extent (${size} m)`);
  }
});

test("the generated families genuinely vary with the seed", () => {
  // This is the whole reason tree, car and person are generators rather than one
  // model each. If seeding does not change the shape, a park is one tree copied
  // four hundred times, which is the thing being fixed.
  disposePropGeometry();
  for (const id of ["tree", "car", "person"]) {
    const seen = new Set<string>();
    for (let seed = 0; seed < 12; seed++) {
      const g: any = propGeometry(id, THREE, { seed });
      g.computeBoundingBox();
      const b = g.boundingBox;
      seen.add([
        g.getAttribute("position").count,
        (b.max.x - b.min.x).toFixed(3),
        (b.max.y - b.min.y).toFixed(3),
        (b.max.z - b.min.z).toFixed(3),
      ].join("/"));
    }
    assert.ok(seen.size >= 3, `${id} produced only ${seen.size} distinct shapes across 12 seeds`);
  }
});

test("geometry is built once and shared, not rebuilt per instance", () => {
  // An InstancedMesh draws thousands from one geometry. Rebuilding per call
  // would be both slow and a quiet memory leak.
  disposePropGeometry();
  const a = propGeometry("bench", THREE, { seed: 3 });
  const b = propGeometry("bench", THREE, { seed: 3 });
  assert.equal(a, b, "the same prop at the same seed built two geometries");
  const c = propGeometry("bench", THREE, { seed: 4 });
  assert.notEqual(a, c, "two different seeds shared one geometry -- the cache key ignores the seed");
});

test("an unknown prop is refused by name, not drawn as nothing", () => {
  assert.throws(
    () => propModel("wheelbarrow"),
    /no model for prop "wheelbarrow"/,
    "an id with no entry must say so rather than returning undefined",
  );
});

test("a lower level of detail falls back down rather than vanishing", () => {
  disposePropGeometry();
  const far: any = propGeometry("bench", THREE, { lod: 2 });
  assert.ok(far.getAttribute("position").count > 0, "LOD 2 produced nothing");
  const near: any = propGeometry("bench", THREE, { lod: 0 });
  assert.ok(
    near.getAttribute("position").count >= far.getAttribute("position").count,
    "LOD 0 is not more detailed than LOD 2 -- the levels are the wrong way round",
  );
});
