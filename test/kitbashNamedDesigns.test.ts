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
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as THREE from "three";
import { assembleBuilding, assembleNamedDesign } from "../public/kitbash-assembler.js";
import { DESIGN_RECIPE_MAP } from "../public/kitbash-recipe-map.js";
import { KITBASH_PARTS } from "../public/kitbash-parts.js";
import { classifyRepoReachability, displayPath } from "../scripts/lib/module-graph.mjs";

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

test("RUN3 item 3: the 5 remaining unused connectors have no design that could sensibly use them -- checked mechanically, not asserted from memory", () => {
  // A connector joins two structural volumes. The only mechanical signal
  // in this registry for "this design has two volumes" is a shaft-category
  // part with a plural/paired name, or a recipe naming more than one shaft.
  // Both checked directly: exactly one shaft name implies a paired form
  // (shaft-twin-atrium), no recipe uses more than one shaft part at all,
  // and every design using shaft-twin-atrium (canopy-hub, skybridge-complex,
  // waterfall-atrium) already has a connector (RUN2, RUN3). If a future
  // design changes this -- a new twin-form shaft, or two shafts in one
  // recipe -- this test goes red and names it as new, real candidate
  // content, rather than the finding staying true by nobody re-checking it.
  const twinShaftIds = Object.values(KITBASH_PARTS)
    .filter((p) => p.category === "shaft" && /twin|paired|dual/i.test(p.name))
    .map((p) => p.id);
  assert.deepEqual(twinShaftIds, ["shaft-twin-atrium"],
    "a new paired-volume shaft exists -- the design(s) using it are new candidates for an unused connector");

  const multiShaftDesigns = Object.values(DESIGN_RECIPE_MAP).filter(
    (d) => d.recipe.filter((id) => KITBASH_PARTS[id]?.category === "shaft").length > 1,
  );
  assert.deepEqual(multiShaftDesigns.map((d) => d.design), [],
    "a design now has more than one shaft part -- it is a new candidate for an unused connector");

  const twinAtriumDesigns = Object.values(DESIGN_RECIPE_MAP)
    .filter((d) => d.recipe.includes("shaft-twin-atrium"))
    .map((d) => d.design)
    .sort();
  assert.deepEqual(twinAtriumDesigns, ["canopy-hub", "skybridge-complex", "waterfall-atrium"]);
  for (const designId of twinAtriumDesigns) {
    const connectorCount = DESIGN_RECIPE_MAP[designId].recipe.filter(
      (id) => KITBASH_PARTS[id]?.category === "connector",
    ).length;
    assert.equal(connectorCount, 1, `${designId} has a paired volume but ${connectorCount} connectors`);
  }
});

// F3 (2026-09-11): the GATE above answers "does the kit reach ITS OWN
// internal harness" -- assembleBuilding's random assembly plus the 40
// named designs, exercised together. It does not, and was never meant to,
// answer a different question: does the kit reach the real PRODUCT world,
// the one a visitor's browser actually loads. Those are the same two
// questions F1 already asked of facade-textures.js's variant system, asked
// here of the whole kit. Measured directly, not assumed: `public/city-
// render.js` -- the only file that builds what index.html/city.html
// actually render -- has zero references to any `public/kitbash-*.js`
// export, confirmed by grep on this branch AND on `b1-land`
// (`git show b1-land:public/city-render.js`, read-only, no checkout). This
// is NOT the F1 pattern (wired on the other branch, just not merged) -- it
// is unwired everywhere, a whole disconnected subsystem, first named in
// docs/audits/K6-BUILDINGS.md's own "disconnected capability" section.
//
// Reuses the SAME reachability machinery test/deadExports.test.ts already
// uses (a real import-graph walk from three declared entry-point classes:
// PRODUCT/DEMO/TEST), rather than a second, bespoke text-grep -- the two
// gates should never be able to disagree about what "product-reachable"
// means.
function repoRoot() {
  const here = dirname(fileURLToPath(import.meta.url));
  let dir = here;
  for (let up = 0; up < 6; up++) {
    try { readFileSync(join(dir, "CLAUDE.md"), "utf8"); return dir; } catch { /* keep walking */ }
    dir = join(dir, "..");
  }
  throw new Error("could not locate the repo root from " + here);
}

test("GATE: kitbash reachable from the real PRODUCT world, not just its own demo/test harness -- registry vs both real callers, side by side", {
  todo: "blocked on public/city-render.js importing something from any public/kitbash-*.js " +
    "file -- none do, on codex-lane or b1-land. Not the F1 pattern (wired elsewhere, unmerged): " +
    "unwired everywhere. Not skipped: runs and prints the real breakdown every time.",
}, () => {
  const ROOT = repoRoot();
  const wranglerText = readFileSync(join(ROOT, "wrangler.jsonc"), "utf8");
  const { classified } = classifyRepoReachability({
    publicDir: join(ROOT, "public"),
    srcDir: join(ROOT, "src"),
    testDir: join(ROOT, "test"),
    repoRoot: ROOT,
    wranglerText,
  });

  const kitbashExports = [];
  for (const [filePath, exportsByName] of classified) {
    const relFile = displayPath(ROOT, filePath);
    if (!/^public\/kitbash-/.test(relFile)) continue;
    for (const [exportName, entry] of exportsByName) {
      kitbashExports.push({ file: relFile, name: exportName, state: entry.state });
    }
  }

  const byState = { product: [], "demo-only": [], "test-only": [], unreachable: [] };
  for (const e of kitbashExports) (byState[e.state] ??= []).push(`${e.file}:${e.name}`);

  const registryPartCount = Object.keys(KITBASH_PARTS).length;
  const registryDesignCount = Object.keys(DESIGN_RECIPE_MAP).length;
  console.log(`kitbash registry: ${registryPartCount} parts, ${registryDesignCount} named designs`);
  console.log(`kitbash exports reachable from PRODUCT: ${byState.product.length} / ${kitbashExports.length}`);
  console.log(`  demo-only (${byState["demo-only"].length}): ${byState["demo-only"].join(", ")}`);
  console.log(`  test-only (${byState["test-only"].length}): ${byState["test-only"].join(", ")}`);
  console.log(`  unreachable, i.e. no importer anywhere (${byState.unreachable.length}): ${byState.unreachable.join(", ")}`);

  // The goal state, not today's state -- see the { todo } reason above.
  // This is deliberately the INVERSE of "assert nothing is product" (which
  // is true today and would pass vacuously, proving nothing): asserting
  // the aspiration and watching it fail is what makes the gate visible
  // (shows as a real ⚠ in the failing-tests recap, not a silent pass) and
  // is what will make it go green, unedited, the day city-render.js
  // imports something real from the kit -- the same shape as
  // test/facadeVariants.test.ts's own F1 gate.
  assert.ok(byState.product.length > 0,
    `0 of ${kitbashExports.length} kitbash exports are product-reachable -- the entire kit ` +
    `(${registryPartCount} parts, ${registryDesignCount} designs) is unreached from the real world`);
});
