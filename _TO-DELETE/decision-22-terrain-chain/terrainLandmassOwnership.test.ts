// =============================================================================
// B1 STEP A -- BREAK terrain.js's DEPENDENCY ON city-plan.js FOR LANDMASSES
//
// docs/specs/BOARD-REBUILD-PLAN.md: "terrain.js imports LANDMASSES from
// city-plan.js -- the file slated for deletion" (Mark, 2026-09-08) -- the
// most important finding in the B1 plan review, and the step to do FIRST,
// before any shape redesign, so a refactor bug and a design bug are never
// the same commit.
//
// THREE CLAIMS. The third one is a TRANSFORMATION, not the original test --
// recorded here per Mark's own instruction, so the diff shows a gate
// replaced rather than one removed (a deleted gate and a replaced gate look
// identical in a diff and mean opposite things):
//
//   1. terrain.js no longer imports landmassPolygonsDesign (or LANDMASSES)
//      from city-plan.js -- read from source, since constructing a real
//      module graph and checking it dynamically would need a bundler; the
//      import statement itself is the fact being asserted. UNCHANGED by B1
//      step B -- still true, still checked the same way.
//
//   2. terrain.js exports its own landmassPolygonsDesign. UNCHANGED.
//
//   3. WAS: "terrain.js's own copy currently produces the IDENTICAL polygon
//      set city-plan.js's original does" -- a byte-identity check, correct
//      while step A's copy was verbatim and step B had not yet landed.
//      B1 step B's archipelago redesign correctly broke it (watched red:
//      the real diff between the two polygon sets, confirmed before this
//      rewrite, not assumed).
//
//      NOW: the property that check was ever a PROXY for was never
//      "the two copies agree" -- it was "there is one source of truth."
//      Equality was how to check that while both copies were identical;
//      once terrain.js is authoritative, the real check is who still reads
//      city-plan.js's copy. That is NOT yet zero -- public/road-network.js,
//      scripts/_render-arterial-data.mjs, scripts/gen-mainland.mjs and four
//      test files still import LANDMASSES from city-plan.js directly, and
//      migrating them is B2/B3's job (city-plan.js itself, and
//      road-network.js, are outside this pass's own routing), not
//      something to fake finished here. So this cannot yet assert "zero
//      importers" without asserting something false. What it CAN assert,
//      honestly: the exact, current, named set of remaining importers,
//      checked against source the same way claim 1 is -- so the list is
//      visible, a new UNTRACKED importer is caught the moment it appears,
//      and shrinking the list to empty (as B2/B3 migrate their own
//      consumers) is exactly the "zero importers" property finally landing,
//      not a silent fact nobody wrote down.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { stripSourceComments } from "./stripSourceComments.ts";

function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let up = 0; up < 6; up++) {
    try { readFileSync(join(dir, "CLAUDE.md"), "utf8"); return dir; } catch { /* not this level */ }
    dir = join(dir, "..");
  }
  throw new Error("could not locate the repo root");
}
const ROOT = repoRoot();
const TERRAIN_SRC = stripSourceComments(readFileSync(join(ROOT, "public", "terrain.js"), "utf8"));

test("B1 (wiring): terrain.js no longer imports landmassPolygonsDesign, LANDMASSES, or anything else from city-plan.js", () => {
  // UPDATED, 2026-09-13, Phase 1 "take it all down"
  // (docs/specs/PHASE1-TAKEDOWN-PLAN-2026-09-13.md), per this test's OWN
  // prior comment ("if WORLD moved too, update this test to match, don't
  // just delete it"): WORLD moved out of city-plan.js to world-scale.js in
  // this same pass (city-plan.js itself is quarantined), so terrain.js's
  // import of city-plan.js is not merely narrowed, it is gone entirely.
  // A stronger, now-true assertion replaces the narrower one.
  const cityPlanImport = TERRAIN_SRC.match(/import\s*\{([^}]*)\}\s*from\s*"\.\/city-plan\.js"/);
  assert.equal(cityPlanImport, null, "terrain.js still imports from city-plan.js -- expected zero imports now that WORLD moved to world-scale.js and city-plan.js is quarantined");
});

test("B1 (wiring): terrain.js exports its own landmassPolygonsDesign, not a re-export of city-plan.js's", () => {
  assert.match(TERRAIN_SRC, /export function landmassPolygonsDesign\(/, "terrain.js no longer defines its own landmassPolygonsDesign");
});

// --- rawSourceScan's own gap, closed: the check above matched
// `export function landmassPolygonsDesign\(` against TERRAIN_SRC's raw
// text. See test/rawSourceScan.test.ts's own history (2026-09-11).

test("(synthetic) the vulnerability: a comment mentioning the export must not stand in for the real function being gone", () => {
  const fakeSrcWithRealExport = "export function landmassPolygonsDesign(seed) { return []; }\n";
  const fakeSrcWithOnlyComment = "// used to export function landmassPolygonsDesign(seed) here before it was reverted to a re-export\n";
  // Raw, unstripped: the comment alone satisfies the regex.
  assert.match(fakeSrcWithOnlyComment, /export function landmassPolygonsDesign\(/, "sanity: the raw fixture's comment does satisfy the naive regex, confirming the vulnerability is real");
  // Fixed: after stripping, a comment-only mention no longer matches, but a real export still does.
  assert.doesNotMatch(stripSourceComments(fakeSrcWithOnlyComment), /export function landmassPolygonsDesign\(/, "a comment-only mention of the export was wrongly treated as real after stripping");
  assert.match(stripSourceComments(fakeSrcWithRealExport), /export function landmassPolygonsDesign\(/, "stripping wrongly removed a genuinely real export");
});

/**
 * Every file (outside city-plan.js itself, and outside this test file's own
 * reference to the fact) that imports LANDMASSES or landmassPolygonsDesign
 * from "../public/city-plan.js" or "./city-plan.js" -- walked directly
 * against source, the same technique claim 1 above uses, not a bundler's
 * module graph. Returns relative paths, sorted, for a stable diff.
 *
 * STATIC imports only. scripts/gen-mainland.mjs reads LANDMASSES through a
 * dynamic `await import(path.join(...))` with a runtime-built path -- found
 * once, by a plain string grep, not by this function (a static regex has no
 * good way to resolve a dynamic import's target without actually running
 * the module graph, which is more machinery than this test's job justifies)
 * -- and is listed by hand in KNOWN_REMAINING_IMPORTERS below rather than
 * silently missed. If a NEW dynamic importer of city-plan.js's LANDMASSES
 * appears, this function will not catch it; that is a real, named
 * limitation, not an oversight.
 */
function findCityPlanLandmassImporters(): string[] {
  const found: string[] = [];
  const dirs = ["public", "src", "scripts", "test"];
  for (const dir of dirs) {
    const full = join(ROOT, dir);
    let entries: string[];
    try { entries = readdirSync(full); } catch { continue; }
    for (const f of entries) {
      if (!/\.(js|ts|mjs)$/.test(f)) continue;
      if (dir === "public" && f === "city-plan.js") continue; // does not import from itself
      if (dir === "test" && f === "terrainLandmassOwnership.test.ts") continue; // this file, naming the others in prose
      const path = join(full, f);
      let src: string;
      try { src = readFileSync(path, "utf8"); } catch { continue; }
      const m = src.match(/import\s*\{([^}]*)\}\s*from\s*["'][^"']*city-plan\.js["']/);
      if (!m) continue;
      if (/\bLANDMASSES\b/.test(m[1]) || /\blandmassPolygonsDesign\b/.test(m[1])) {
        found.push(`${dir}/${f}`);
      }
    }
  }
  return found.sort();
}

test("B1: the exact, current set of files still reading city-plan.js's LANDMASSES/landmassPolygonsDesign directly is named and tracked -- not silently zero, and not silently more than this", () => {
  // NOT an assertion that this list is empty -- it is not yet, and making it
  // empty is B2/B3's job (city-plan.js and public/road-network.js are both
  // outside this pass's own routing). This is a tripwire: if the list
  // changes -- shrinks as another lane migrates a consumer, or GROWS because
  // something new started reading the old copy instead of going through
  // terrain.js -- this test tells you which, by name, rather than staying
  // silently green either way.
  const KNOWN_STATIC_IMPORTERS = [
    // "public/road-network.js" migrated OUT -- quarantined to
    // _TO-DELETE/old-world/road-network.js, Phase 1 rebuild item 1
    // (docs/specs/PHASE1-SITE-INVENTORY.md), exactly the shrink this test's
    // own error message anticipates: "a file migrated to the real,
    // authoritative copy in terrain.js." It had zero live importers of its
    // own (public/ and test/ both checked) -- the file itself is gone from
    // findCityPlanLandmassImporters's public/ scan, not merely edited.
    //
    // "test/cityConnectivity.test.ts" and "test/worldSpec.test.ts" migrated
    // OUT -- retired, Phase 1 "take it all down" (docs/specs/PHASE1-TAKEDOWN-PLAN-2026-09-13.md):
    // both tested public/city-plan.js's own generated-plan behaviour
    // directly, and that file is quarantined. "test/cityWorld.test.ts" also
    // migrated out -- BLOCKED, not retired (most of its 57 tests exercise
    // surviving terrain.js/land-use.js/features.js code, but the file's
    // fixture and several tests need the same quarantined generator; see
    // _TO-DELETE/LEDGER.jsonl for the full reasoning). "test/worldAliasing.test.ts"
    // stayed in test/ but no longer imports city-plan.js at all -- its two
    // tests that needed WORLD/LANDMASSES/HIGHWAYS are individually blocked
    // in place, with the import itself removed.
    "scripts/_render-arterial-data.mjs",
  ].sort();
  const actual = findCityPlanLandmassImporters();
  assert.deepEqual(
    actual, KNOWN_STATIC_IMPORTERS,
    `the set of files STATICALLY reading city-plan.js's LANDMASSES/landmassPolygonsDesign has changed.\n` +
    `  now:  ${JSON.stringify(actual)}\n` +
    `  was:  ${JSON.stringify(KNOWN_STATIC_IMPORTERS)}\n` +
    `If this shrank (a file migrated to the real, authoritative copy in terrain.js), update KNOWN_STATIC_IMPORTERS to match and say so in the commit -- ` +
    `an empty list here is exactly the "one source of truth" property this test exists to reach. If it grew, something new started reading the OLD copy instead of terrain.js's -- fix that, don't update the list to hide it.`,
  );
});

test("B1: scripts/gen-mainland.mjs's known DYNAMIC import of city-plan.js's LANDMASSES still exists in the shape this test cannot detect automatically", () => {
  // Named explicitly, per this file's own header on findCityPlanLandmassImporters:
  // a dynamic `await import(...)` with a runtime-built path is not something
  // a static regex can safely resolve, so it is checked here by its own,
  // narrower, honest pattern instead of pretending the general function
  // covers it.
  const src = readFileSync(join(ROOT, "scripts", "gen-mainland.mjs"), "utf8");
  assert.match(src, /await import\(path\.join\([^)]*city-plan\.js[^)]*\)\)/, "scripts/gen-mainland.mjs no longer dynamically imports city-plan.js the way this test's own header describes -- if it now imports LANDMASSES statically instead, add it to the static list above and delete this test; if it stopped reading LANDMASSES at all, delete this test and say so in the commit");
  assert.match(src, /\bLANDMASSES\b/, "scripts/gen-mainland.mjs no longer references LANDMASSES at all");
});
