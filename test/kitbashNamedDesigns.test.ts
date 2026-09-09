// RUN2 item 3: DESIGN_RECIPE_MAP's `recipe` field (40 canonical designs) was
// structurally validated by test/kitbashRecipeMap.test.ts and imported into
// public/kitbash-district.html, and then never actually executed by
// anything -- assembleBuilding() picks parts at random by socket
// compatibility and never reads a design's curated recipe. Measured
// directly: across 60,000 assembleBuilding trials spanning every style/foot
// combination, the entire "connector" category (8 of 62 registered parts)
// was never reached, because assembleBuilding never looks at that category
// at all. assembleNamedDesign() (public/kitbash-assembler.js) closes the
// execution gap generically -- it stacks a design's `recipe` array in
// order, whatever its length or part order, the same accumulate-Y-by-height
// mechanism assembleBuilding already used per fixed slot.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { assembleBuilding, assembleNamedDesign } from "../public/kitbash-assembler.js";
import { DESIGN_RECIPE_MAP } from "../public/kitbash-recipe-map.js";
import { KITBASH_PARTS } from "../public/kitbash-parts.js";

test("every one of the 40 canonical designs assembles real, non-empty geometry from its own recipe -- not a spot check", () => {
  for (const designId of Object.keys(DESIGN_RECIPE_MAP)) {
    const built = assembleNamedDesign(designId, {}, THREE);
    assert.ok(built.parts.length > 0, `${designId} assembled zero parts`);
    assert.ok(built.triangleCount > 0, `${designId} assembled zero triangles`);
    assert.ok(built.height > 0, `${designId} has zero total height`);
    assert.equal(built.recipe, DESIGN_RECIPE_MAP[designId].recipe);
  }
});

test("an unknown design id is refused loudly, not silently built as something else", () => {
  assert.throws(
    () => assembleNamedDesign("not-a-real-design", {}, THREE),
    /not a canonical design/,
  );
});

test("a design referencing a part that no longer exists in the registry is refused loudly, not silently skipped", () => {
  // Watched red first: without the guard this reproduces, part.buildGeometry
  // would be called on `undefined` and throw a much less useful TypeError
  // instead of naming the actual defect (a stale recipe reference).
  const planted = {
    'planted-design': { design: 'planted-design', name: 'Planted', rarity: 'fabric', category: 'residential', foot: { w: 16, d: 16 }, recipe: ['this-part-id-does-not-exist'] },
  };
  const real = DESIGN_RECIPE_MAP['planted-design'];
  assert.equal(real, undefined, "test fixture collides with a real design id -- pick a different planted name");
  Object.assign(DESIGN_RECIPE_MAP, planted);
  try {
    assert.throws(
      () => assembleNamedDesign('planted-design', {}, THREE),
      /references unknown part/,
    );
  } finally {
    delete DESIGN_RECIPE_MAP['planted-design'];
  }
});

test("canopy-hub and waterfall-atrium's newly-added connectors are genuinely included, not just named in the recipe", () => {
  // Both designs share podium+shaft-twin-atrium+crown; only the connector
  // in the middle differs between them and the pre-fix version of each.
  // Building WITHOUT the connector (the original 3-part recipe) and
  // comparing triangle counts proves the 4th part's geometry actually
  // entered the assembly, not just the recipe array's length.
  for (const [designId, withoutConnector] of [
    ['canopy-hub', ['podium-entrance-plaza', 'shaft-twin-atrium', 'crown-open-pergola']],
    ['waterfall-atrium', ['podium-waterfront-base', 'shaft-twin-atrium', 'crown-sunburst-arch']],
  ]) {
    const design = DESIGN_RECIPE_MAP[designId];
    const original = design.recipe;
    const withConnectorTris = assembleNamedDesign(designId, {}, THREE).triangleCount;
    design.recipe = withoutConnector;
    const withoutConnectorTris = assembleNamedDesign(designId, {}, THREE).triangleCount;
    design.recipe = original;
    assert.ok(withConnectorTris > withoutConnectorTris,
      `${designId}: the connector in the recipe did not add any triangles (${withConnectorTris} vs ${withoutConnectorTris})`);
  }
});

test("GATE: registry coverage across both real paths -- assembleBuilding's random assembly and the 40 named-design recipes together", () => {
  // Mirrors scripts/measure-k6-buildings.mjs's own pattern: use the real
  // code paths, not a hand-maintained list, to measure what actually
  // reaches something that builds geometry.
  const reached = new Set();
  const styles = ["commercial", "residential", "artdeco", "eco", "landmark", "fabric"];
  const feet = [{ w: 16, d: 16 }, { w: 24, d: 32 }, { w: 32, d: 32 }, { w: 32, d: 24 }, { w: 48, d: 48 }];
  for (let seed = 0; seed < 300; seed++) {
    for (const style of styles) {
      for (const foot of feet) {
        try {
          const b = assembleBuilding({ foot, style, seed, lod: 0 }, THREE);
          for (const id of b.recipe) reached.add(id);
        } catch { /* not every style/foot combination is expected to build */ }
      }
    }
  }
  for (const designId of Object.keys(DESIGN_RECIPE_MAP)) {
    for (const id of assembleNamedDesign(designId, {}, THREE).recipe) reached.add(id);
  }

  const all = Object.keys(KITBASH_PARTS);
  const unreached = all.filter((id) => !reached.has(id));
  console.log(`kitbash parts reachable via a real executed path: ${reached.size} / ${all.length}`);
  if (unreached.length) console.log(`still unreached: ${unreached.join(", ")}`);

  // Before assembleNamedDesign existed, the connector category (8 parts)
  // was entirely unreached by anything executable. This does not assert
  // 100% coverage -- 5 connector variants remain genuinely unused because
  // no OTHER design has a second structural volume to connect, named
  // honestly in docs/audits rather than forced into an arbitrary design.
  assert.ok(reached.size >= 57, `only ${reached.size}/${all.length} parts reachable via an executed path -- expected the fix to raise this from the pre-fix 54`);
});
