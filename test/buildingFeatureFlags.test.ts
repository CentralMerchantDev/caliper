// RUN2 item 2 (lead item, per docs/audits/K6-BUILDINGS.md's correction):
// several genuinely-randomized style flags across bldVilla, bldTerrace,
// bldTownhouse, and bldMidrise were computed, reported in the returned
// spec's `params`, and never consulted by the geometry that builds LOD0 --
// every building of a typology had the identical feature set present
// regardless of the roll. Each flag is now also overridable via `options`
// (consistent with every other parameter these functions already support,
// e.g. `options.roofStyle`), which is what makes it possible to test the
// property directly rather than searching for a seed that happens to roll
// a particular combination.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { building } from "../public/buildings.js";

function triangleCount(typology, options) {
  const spec = building(typology, "flag-test-seed", options, THREE);
  const g = spec.lod[0].createGeometry(THREE);
  const count = (g.index ? g.index.count : g.attributes.position.count) / 3;
  g.dispose();
  return count;
}

/** Sum of every vertex coordinate -- distinguishes shapes with the SAME
 * triangle count but different positions/dimensions (e.g. "full" vs
 * "cantilever" bay styles, both 3 boxes), which triangle count alone cannot. */
function positionFingerprint(typology, options) {
  const spec = building(typology, "flag-test-seed", options, THREE);
  const g = spec.lod[0].createGeometry(THREE);
  const pos = g.attributes.position;
  let sum = 0;
  for (let i = 0; i < pos.count; i++) sum += pos.getX(i) + pos.getY(i) + pos.getZ(i);
  g.dispose();
  return sum;
}

const CASES = [
  { typology: "bld-villa", flag: "hasPorch", holdConstant: { hasBay: false, hasDormers: false, hasChimney: false } },
  { typology: "bld-villa", flag: "hasBay", holdConstant: { hasPorch: false, hasDormers: false, hasChimney: false } },
  { typology: "bld-villa", flag: "hasDormers", holdConstant: { hasPorch: false, hasBay: false, hasChimney: false } },
  { typology: "bld-villa", flag: "hasChimney", holdConstant: { hasPorch: false, hasBay: false, hasDormers: false } },
  { typology: "bld-terrace", flag: "hasBasement", holdConstant: { units: 1, hasStringCourse: false, hasDormers: false } },
  { typology: "bld-terrace", flag: "hasStringCourse", holdConstant: { units: 1, hasBasement: false, hasDormers: false } },
  { typology: "bld-terrace", flag: "hasDormers", holdConstant: { units: 1, hasBasement: false, hasStringCourse: false } },
  { typology: "bld-townhouse", flag: "hasRoofDeck", holdConstant: { bayStyle: "none", hasRearExtension: false } },
  { typology: "bld-townhouse", flag: "hasRearExtension", holdConstant: { bayStyle: "none", hasRoofDeck: false } },
  { typology: "bld-midrise", flag: "podiumType", values: ["flush", "retail"], holdConstant: { cornerTreatment: "square" } },
  { typology: "bld-midrise", flag: "cornerTreatment", values: ["square", "chamfer"], holdConstant: { corner: "left", podiumType: "flush" } },
];

for (const c of CASES) {
  const [offValue, onValue] = c.values || [false, true];
  test(`${c.typology}'s ${c.flag} changes the built geometry, not just the reported params`, () => {
    const off = triangleCount(c.typology, { ...c.holdConstant, [c.flag]: offValue });
    const on = triangleCount(c.typology, { ...c.holdConstant, [c.flag]: onValue });
    assert.notEqual(off, on,
      `${c.typology}: ${c.flag}=${JSON.stringify(offValue)} and ${c.flag}=${JSON.stringify(onValue)} produced identical triangle counts (${off}) -- the flag is not reaching the geometry`);
    assert.ok(on > off,
      `${c.typology}: ${c.flag}=${JSON.stringify(onValue)} (${on} tris) should add geometry over ${c.flag}=${JSON.stringify(offValue)} (${off} tris)`);
  });
}

test("bldTownhouse's three bayStyle values (none/full/cantilever) are three genuinely different shapes, not two", () => {
  // Triangle count alone cannot distinguish "full" from "cantilever" -- both
  // are 3 boxes, same triangle count, different positions/dimensions. A
  // position fingerprint catches what triangle count structurally cannot.
  const none = positionFingerprint("bld-townhouse", { bayStyle: "none" });
  const full = positionFingerprint("bld-townhouse", { bayStyle: "full" });
  const cantilever = positionFingerprint("bld-townhouse", { bayStyle: "cantilever" });
  const fingerprints = new Set([none, full, cantilever]);
  assert.equal(fingerprints.size, 3, `bayStyle none/full/cantilever produced only ${fingerprints.size} distinct geometry fingerprint(s)`);
  // And triangle count still confirms "none" genuinely omits the bay's mass.
  assert.ok(triangleCount("bld-townhouse", { bayStyle: "full" }) > triangleCount("bld-townhouse", { bayStyle: "none" }),
    "bayStyle=full should add triangles over bayStyle=none");
});

test("new shapes (cantilever bay, curved corner, arcade podium) stay strictly inside the declared footprint", () => {
  const cases = [
    ["bld-townhouse", { bayStyle: "cantilever", corner: "left" }],
    ["bld-townhouse", { bayStyle: "cantilever", corner: "right" }],
    ["bld-midrise", { cornerTreatment: "curved", corner: "left", cellW: 3, cellD: 4 }],
    ["bld-midrise", { cornerTreatment: "curved", corner: "right", cellW: 6, cellD: 8 }],
    ["bld-midrise", { podiumType: "arcade", cellW: 3, cellD: 4 }],
    ["bld-midrise", { podiumType: "arcade", cellW: 6, cellD: 8 }],
  ];
  for (const [typology, options] of cases) {
    const spec = building(typology, "bounds-check-seed", options, THREE);
    const { w: footW, d: footD } = spec.footprint;
    const g = spec.lod[0].createGeometry(THREE);
    g.computeBoundingBox();
    const bb = g.boundingBox;
    g.dispose();
    assert.ok(bb.min.x >= -footW / 2 - 0.05 && bb.max.x <= footW / 2 + 0.05,
      `${typology} ${JSON.stringify(options)}: x extent [${bb.min.x}, ${bb.max.x}] outside footprint width ${footW}`);
    assert.ok(bb.min.z >= -footD / 2 - 0.05 && bb.max.z <= footD / 2 + 0.05,
      `${typology} ${JSON.stringify(options)}: z extent [${bb.min.z}, ${bb.max.z}] outside footprint depth ${footD}`);
    assert.ok(bb.min.y >= -0.05, `${typology} ${JSON.stringify(options)}: geometry dips below ground (${bb.min.y})`);
  }
});
