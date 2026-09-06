// ONE-OFF: rebuild test/.mutate-results.json after it was accidentally reset
// by `mutate.mjs --id ...` run without --resume (which starts from an empty
// results file by design). Runs every (testFile, sourceFile) pair needed to
// re-cover all 80 manifest mutations via _mutcheck.mjs, parses each line of
// its output, and writes results with real measuredAt/method provenance.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const PAIRS = [
  ["test/worldExtent.test.ts", "public/city-plan.js"],
  ["test/layout.test.ts", "public/city-plan.js"],
  ["test/planSeed.test.ts", "public/city-plan.js"],
  ["test/worldSpec.test.ts", "public/city-plan.js"],
  ["test/worldAliasing.test.ts", "public/city-plan.js"],
  ["test/cloudDeck.test.ts", "public/sky.js"],
  ["test/beachWidth.test.ts", "public/terrain.js"],
  ["test/worldSeed.test.ts", "public/terrain.js"],
  ["test/world.test.ts", "public/terrain.js"],
  ["test/placementLayout.test.ts", "public/world-render-3d.js"],
  ["test/pickSelection.test.ts", "public/world-render-3d.js"],
  ["test/propModels.test.ts", "public/props.js"],
  ["test/layout.test.ts", "public/layout.js"],
  ["test/layoutGeometry.test.ts", "public/layout.js"],
  ["test/ground.test.ts", "public/ground.js"],
  ["test/layoutGeometry.test.ts", "public/layout-fits.js"],
  ["test/navPad.test.ts", "public/index.html"],
  ["test/reachability.test.ts", "public/index.html"],
  ["test/describeRequestUI.test.ts", "public/index.html"],
  ["test/claimSpansAreChecked.test.ts", "public/index.html"],
  ["test/repoHygiene.test.ts", ".gitattributes"],
  ["test/reachability.test.ts", "public/model-library.html"],
  ["test/worldModel.test.ts", "public/world-model.js"],
  ["test/noise.test.ts", "public/noise.js"],
  ["test/world.test.ts", "public/world.js"],
  ["test/worldStore.test.ts", "public/world-store.js"],
  ["test/applyLayers.test.ts", "public/apply-layers.js"],
  ["test/instanceGroups.test.ts", "public/instance-groups.js"],
  ["test/modelRegistry.test.ts", "public/resolve-models.js"],
  ["test/selection.test.ts", "public/selection.js"],
  ["test/describeRequest.test.ts", "public/describe-request.js"],
  ["test/generateRequest.test.ts", "public/generate-request.js"],
  ["test/stageArtefact.test.ts", "public/stage-artefact.js"],
  ["test/applyAndPersist.test.ts", "public/apply-and-persist.js"],
  ["test/undo.test.ts", "public/undo.js"],
  ["test/questCompletion.test.ts", "public/change-quest.js"],
  ["test/regions.test.ts", "public/grid.js"],
  ["test/controlLimitsAreLive.test.ts", "src/controlLayer.ts"],
  ["test/mutateResume.test.ts", "scripts/mutate-resume.mjs"],
  ["test/claudeMdIsCurrent.test.ts", "CLAUDE.md"],
  ["test/cityRenderWorldState.test.ts", "public/city-render.js"],
  ["test/cityRenderScenePlacements.test.ts", "public/city-render.js"],
  ["test/runGenerateRequest.test.ts", "public/run-generate-request.js"],
  ["test/modelCaller.test.ts", "public/model-caller.js"],
  ["test/supervisedGenerateScript.test.ts", "scripts/supervised-generate.mjs"],
  ["test/buildingLODAndColors.test.ts", "public/buildings.js"],
  ["test/verifyUntrustedGeometry.test.ts", "scripts/verify-untrusted-geometry-caller.mjs"],
  ["test/claimSpansAreChecked.test.ts", "test/claimSpansAreChecked.test.ts"],
  ["test/publicClaims.test.ts", "src/citySummary.generated.ts"],
];

const manifest = JSON.parse(readFileSync("test/mutations.json", "utf8")).mutations;
const byId = new Map(manifest.map((m) => [m.id, m]));
const RESULTS_PATH = "test/.mutate-results.json";
const state = existsSync(RESULTS_PATH)
  ? JSON.parse(readFileSync(RESULTS_PATH, "utf8"))
  : { results: [], baseline: null };
const already = new Set(state.results.map((r) => r.id));
const today = new Date().toISOString().slice(0, 10);

// THE PRECISE (id -> correct guarding test file) MAP, NOT "any pair sharing
// this source file". _mutcheck.mjs runs EVERY mutation for a given source
// file against WHATEVER test file it is handed, so an id's WRONG pairing
// (its own guarding test not yet reached in this loop) reports SURVIVED --
// correctly, for that pairing, since the wrong test does not exercise it.
// The first version of this script recorded the FIRST status seen per id and
// skipped every later one, so a SURVIVED from an incorrect early pairing
// permanently blocked the real CAUGHT from a correct later one. Found before
// it was trusted, by noticing "row-plots-are-whole-cells" reported SURVIVED
// under worldExtent.test.ts (wrong) one pair before layout.test.ts (right)
// would have caught it. Built by a one-time discovery pass: grep every
// test file for each mutation's own `expect` string.
const ID_TESTFILE = {
  "ground-edge-is-far-enough-out": "test/worldExtent.test.ts",
  "apron-grid-alignment": "test/worldExtent.test.ts",
  "cloud-decks-independent-materials": "test/cloudDeck.test.ts",
  "cloud-deck-hidden-from-above": "test/cloudDeck.test.ts",
  "beach-has-a-width": "test/beachWidth.test.ts",
  "bloom-is-shared-not-copied": "test/placementLayout.test.ts",
  "library-declares-the-prop-join": "test/propModels.test.ts",
  "character-is-per-block-not-per-building": "test/layout.test.ts",
  "row-ends-are-ends": "test/layout.test.ts",
  "terrace-units-do-not-overhang-the-plot": "test/layout.test.ts",
  "frontage-gates-the-frontage-typologies": "test/layout.test.ts",
  "terrace-verdict-is-a-stepped-foundation": "test/layout.test.ts",
  "large-footprints-cannot-step-over-water": "test/ground.test.ts",
  "row-plots-are-whole-cells": "test/layout.test.ts",
  "variant-seed-is-the-situation-not-the-plot": "test/layout.test.ts",
  "fits-filter-is-applied": "test/layoutGeometry.test.ts",
  "sizer-and-renderer-share-one-seed": "test/layoutGeometry.test.ts",
  "row-origin-is-on-the-cell-grid": "test/layout.test.ts",
  "back-row-faces-its-own-street": "test/layout.test.ts",
  "nav-rows-share-one-radius": "test/navPad.test.ts",
  "nav-rows-are-one-width": "test/navPad.test.ts",
  "ground-is-measured-only-when-needed": "test/ground.test.ts",
  "waterway-depth-is-local-not-declared": "test/ground.test.ts",
  "a-waterway-has-banks": "test/ground.test.ts",
  "line-endings-stay-lf": "test/repoHygiene.test.ts",
  "catalogue-has-a-door": "test/reachability.test.ts",
  "pages-have-a-way-back": "test/reachability.test.ts",
  "a-layer-must-be-plain-data": "test/worldModel.test.ts",
  "a-clone-is-independent": "test/worldModel.test.ts",
  "later-layers-win-per-op": "test/worldModel.test.ts",
  "rejected-layers-are-reported": "test/worldModel.test.ts",
  "a-removal-wins-outright": "test/worldModel.test.ts",
  "seed-zero-is-the-original-world": "test/noise.test.ts",
  "a-seeded-field-uses-its-seed": "test/noise.test.ts",
  "the-field-carries-its-seed": "test/worldSeed.test.ts",
  "the-height-function-reads-the-fields-seed": "test/worldSeed.test.ts",
  "generateWorld-forwards-its-seed": "test/planSeed.test.ts",
  "districts-copy-clones-its-bounds": "test/worldSpec.test.ts",
  "world-toJSON-carries-its-layers": "test/world.test.ts",
  "world-store-reports-corrupt-json": "test/worldStore.test.ts",
  "apply-layers-resolves-only-touched": "test/applyLayers.test.ts",
  "override-leaves-its-instance-group": "test/instanceGroups.test.ts",
  "resolve-models-refuses-unknown-id": "test/modelRegistry.test.ts",
  "pick-returns-the-plot-not-the-block": "test/selection.test.ts",
  "describe-request-carries-text-verbatim": "test/describeRequest.test.ts",
  "verify-generated-geometry-uses-real-constraint": "test/generateRequest.test.ts",
  "failed-verify-reads-as-failed": "test/stageArtefact.test.ts",
  "layer-references-model-by-id-not-source": "test/applyAndPersist.test.ts",
  "undo-persists-the-removal": "test/undo.test.ts",
  "quest-completes-on-a-real-edit-not-a-flag": "test/questCompletion.test.ts",
  "locked-region-refuses-with-a-reason-not-bare-false": "test/regions.test.ts",
  "checkInputGuard-reads-control-limits-not-a-literal": "test/controlLimitsAreLive.test.ts",
  "resume-skips-already-done-mutations": "test/mutateResume.test.ts",
  "claudeMd-test-count-matches-generated": "test/claudeMdIsCurrent.test.ts",
  "close-region-on-open-null-refuses-not-a-silent-success": "test/regions.test.ts",
  "createWorld-reuses-land-for-a-repeat-seed": "test/world.test.ts",
  "world-aliasing-districts-f-and-allow-stay-independent": "test/worldAliasing.test.ts",
  "world-aliasing-plot-buildable-stays-independent": "test/worldAliasing.test.ts",
  "landfield-freezes-itself": "test/world.test.ts",
  "world-freezes-itself": "test/worldSpec.test.ts",
  "landmasses-freezes-itself": "test/worldSpec.test.ts",
  "highways-freezes-itself": "test/worldSpec.test.ts",
  "buildWorldState-forwards-its-seed": "test/cityRenderWorldState.test.ts",
  "buildScenePlacements-partitions-overrides-out-of-instancing": "test/cityRenderScenePlacements.test.ts",
  "city-mode-pick-resolves-through-persisted-selection": "test/pickSelection.test.ts",
  "describe-result-uses-textContent-not-innerHTML": "test/describeRequestUI.test.ts",
  "runGenerateRequest-never-calls-caller-on-a-refused-prompt": "test/runGenerateRequest.test.ts",
  "runGenerateRequest-verifies-what-the-caller-actually-returned": "test/runGenerateRequest.test.ts",
  "productionModelCaller-refuses-rather-than-calling": "test/modelCaller.test.ts",
  "supervised-generate-refuses-without-api-key": "test/supervisedGenerateScript.test.ts",
  "supervised-generate-refuses-before-printing-a-prompt-for-a-refused-transform": "test/supervisedGenerateScript.test.ts",
  "as1-vertex-colors-distinguish-wall-and-roof": "test/buildingLODAndColors.test.ts",
  "as2-bld-tower-footprint-bounds": "test/buildingLODAndColors.test.ts",
  "as3-declared-lod-triangle-counts-match-geometry": "test/buildingLODAndColors.test.ts",
  "as4-lod1-distinct-from-lod2": "test/buildingLODAndColors.test.ts",
  "claim-span-added-without-a-check-is-caught": "test/claimSpansAreChecked.test.ts",
  "verify-untrusted-geometry-child-env-is-allowlisted-not-inherited": "test/verifyUntrustedGeometry.test.ts",
  "claimSpansAreChecked-strips-comments-before-searching": "test/claimSpansAreChecked.test.ts",
  "findUncheckedClaimSpans-scans-every-given-html-source": "test/claimSpansAreChecked.test.ts",
  "city-stat-buildings-is-pinned-by-equality-not-a-tolerance-band": "test/publicClaims.test.ts",
};

for (const [testFile, sourceFile] of PAIRS) {
  console.log(`\n=== ${testFile} vs ${sourceFile} ===`);
  let out;
  try {
    out = execFileSync(process.execPath, ["scripts/_mutcheck.mjs", testFile, sourceFile, "test/mutations.json"], { encoding: "utf8" });
  } catch (e) {
    out = String(e.stdout || "") + String(e.stderr || "");
  }
  console.log(out.trim());
  const lines = out.split("\n");
  for (const line of lines) {
    const m = line.match(/^(CAUGHT|SURVIVED|INCONCLUSIVE)\s+(\S+)/);
    if (!m) continue;
    const [, status, id] = m;
    const mut = byId.get(id);
    if (!mut || mut.file !== sourceFile) continue; // belongs to a different source file sharing this test bundle
    // ONLY record from this id's actual designated guarding test file --
    // never from an incidental pairing that happens to also touch sourceFile.
    if (ID_TESTFILE[id] !== testFile) continue;
    if (already.has(id)) continue; // already recorded (its correct pair, seen once)
    state.results.push({ ...mut, status, measuredAt: today, method: `_mutcheck.mjs ${testFile} ${sourceFile}` });
    already.add(id);
  }
  writeFileSync(RESULTS_PATH, JSON.stringify(state, null, 2));
}

const stillMissing = manifest.filter((m) => !already.has(m.id));
if (stillMissing.length) {
  console.log("\nSTILL MISSING (no designated pair ran, or it never printed a line for this id):");
  console.log(stillMissing.map((m) => m.id).join(", "));
}

console.log(`\ndone. ${state.results.length} of ${manifest.length} manifest ids now have a result.`);
const missing = manifest.filter((m) => !already.has(m.id)).map((m) => m.id);
if (missing.length) console.log("MISSING: " + missing.join(", "));
