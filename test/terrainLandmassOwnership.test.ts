// =============================================================================
// B1 STEP A -- BREAK terrain.js's DEPENDENCY ON city-plan.js FOR LANDMASSES
//
// docs/specs/BOARD-REBUILD-PLAN.md: "terrain.js imports LANDMASSES from
// city-plan.js -- the file slated for deletion" (Mark, 2026-09-08) -- the
// most important finding in the B1 plan review, and the step to do FIRST,
// before any shape redesign, so a refactor bug and a design bug are never
// the same commit.
//
// TWO CLAIMS:
//
//   1. terrain.js no longer imports landmassPolygonsDesign (or LANDMASSES)
//      from city-plan.js -- read from source, since constructing a real
//      module graph and checking it dynamically would need a bundler; the
//      import statement itself is the fact being asserted.
//
//   2. terrain.js's own copy currently produces the IDENTICAL polygon set
//      city-plan.js's original does -- this is a pure move, not yet a
//      redesign, and this assertion is the proof of that. IT WILL, AND
//      SHOULD, START FAILING the moment the next B1 step (the archipelago
//      redesign) lands new shapes in terrain.js -- at that point this test
//      should be deleted or rewritten to assert the NEW target shape
//      instead, not left red. Its only job is to prove today's move,
//      today.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

test("B1: terrain.js's own landmassPolygonsDesign() currently produces the IDENTICAL polygon set city-plan.js's original does -- a pure move, not yet a redesign (this assertion is EXPECTED to break, on purpose, the moment the archipelago redesign lands -- see this file's own header)", async () => {
  const terrain = await import(join(ROOT, "public", "terrain.js").replace(/\\/g, "/").replace(/^([A-Za-z]):/, "file:///$1:"));
  const cityPlan = await import(join(ROOT, "public", "city-plan.js").replace(/\\/g, "/").replace(/^([A-Za-z]):/, "file:///$1:"));
  const a = terrain.landmassPolygonsDesign(10);
  const b = cityPlan.landmassPolygonsDesign(10);
  assert.deepEqual(a, b, "terrain.js's own copy has already diverged from city-plan.js's -- expected once the redesign lands, but this test should have been updated or removed in that same commit, not left asserting the old identity");
});
