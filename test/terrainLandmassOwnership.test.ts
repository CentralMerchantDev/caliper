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

function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let up = 0; up < 6; up++) {
    try { readFileSync(join(dir, "CLAUDE.md"), "utf8"); return dir; } catch { /* not this level */ }
    dir = join(dir, "..");
  }
  throw new Error("could not locate the repo root");
}
const ROOT = repoRoot();
const TERRAIN_SRC = readFileSync(join(ROOT, "public", "terrain.js"), "utf8");

test("B1 (wiring): terrain.js no longer imports landmassPolygonsDesign or LANDMASSES from city-plan.js", () => {
  // Matches the exact shape of the dependency being broken -- a name pulled
  // OUT of a `from "./city-plan.js"` import specifier -- not just "does the
  // string city-plan.js appear anywhere" (terrain.js still legitimately
  // imports WORLD from there, out of scope for this step per Mark's own
  // instruction, since WORLD is shared far more broadly than LANDMASSES).
  const cityPlanImport = TERRAIN_SRC.match(/import\s*\{([^}]*)\}\s*from\s*"\.\/city-plan\.js"/);
  assert.ok(cityPlanImport, "terrain.js no longer imports from city-plan.js at all -- if WORLD moved too, update this test to match, don't just delete it");
  const importClause = cityPlanImport![1];
  // Substring match on the whole clause, not an exact-name array membership
  // check: an aliased import (`landmassPolygonsDesign as _x`) reads as a
  // single comma-separated entry that is not exactly "landmassPolygonsDesign",
  // and an exact-match check against split names would miss it entirely --
  // found by mutating exactly that shape and watching this test wrongly stay
  // green before this fix.
  assert.ok(!/\blandmassPolygonsDesign\b/.test(importClause), `terrain.js still imports landmassPolygonsDesign from city-plan.js (import clause: "${importClause}") -- the dependency this step exists to break`);
  assert.ok(!/\bLANDMASSES\b/.test(importClause), `terrain.js still imports LANDMASSES from city-plan.js (import clause: "${importClause}") -- the dependency this step exists to break`);
});

test("B1 (wiring): terrain.js exports its own landmassPolygonsDesign, not a re-export of city-plan.js's", () => {
  assert.match(TERRAIN_SRC, /export function landmassPolygonsDesign\(/, "terrain.js no longer defines its own landmassPolygonsDesign");
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
    "public/road-network.js",
    "scripts/_render-arterial-data.mjs",
    "test/cityConnectivity.test.ts",
    "test/cityWorld.test.ts",
    "test/worldAliasing.test.ts",
    "test/worldSpec.test.ts",
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
