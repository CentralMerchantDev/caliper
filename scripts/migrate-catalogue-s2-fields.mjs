#!/usr/bin/env node
// =============================================================================
// ONE-OFF MIGRATION — writes S2's baseValue/adjacency fields onto every entry
// in data/catalogue.json, under docs/specs/SCORING-MODEL-2026-09-14.md (which
// supersedes one sentence of REBUILD-PLAN.md §S2 and resolves
// docs/DECISIONS-FOR-MARK.md #12). Run once per table change
// (`node scripts/migrate-catalogue-s2-fields.mjs`); not part of any regular
// build/test pipeline. Idempotent -- it recomputes both fields fresh from
// each entry's own category/typeId/footprint/massing, never reading or
// preserving a prior value, so re-tuning a number here is a one-line change
// and a re-run, never a 50-entry hand edit.
//
// Also exports its tables/functions (AMENITY_CIVIC_TYPE_IDS in particular) so
// test/catalogueValidator.test.ts can assert against the SAME source of
// truth the migration used, rather than a second, hand-copied list that
// could drift from it.
//
// WHAT baseValue MEANS NOW, AND WHY IT CHANGED (SCORING-MODEL §3):
// S1's value(cell) formula never consumed baseValue -- it was a stored
// constant nothing read. SCORING-MODEL settles what it IS: not a worth
// number (that would swamp the location-driven ghost readout S4 depends on
// moving as the cursor moves), but the UNIT COUNT a piece represents --
// `totalWorth(type, cell) = perUnitWorth(type, cell) x units(type)`. The
// FORMULA SHAPE does not change (footprint area x a height signal for
// non-road; a flat 1 for road, one countable unit each) -- only what the
// number is FOR, and (FIX-2, PLAN.md §3.2) what the height signal IS:
// `storeysFor(entry)`, not the raw `massing.length` S0/S2 originally read.
// See storeysFor's own header below for why that was a defect and what
// replaces it.
//
// THE ADJACENCY TABLE (SCORING-MODEL §4), DIRECTION PER CATEGORY:
//   commercial (shops)   -> residential: +STRONG.  Was {}. The amenity engine.
//   civic (services)     -> residential: +STRONG, AMENITY ENTRIES ONLY. Was {}.
//   landmark (entertainment) -> residential: +STRONG. Was {}. The amenity engine.
//   residential           -> residential: -DILUTIVE, commercial: +.  Housing
//                            dilutes housing (scarcity), feeds shops.
//   industrial            -> residential: -STRONG.  §S2, unchanged.
//   road                  -> residential: +ACCESS, commercial: +ACCESS.  §S2, unchanged.
// A category/target pair the table marks "--" (not stated) gets no key at
// all -- absence, not an invented zero dressed as a decision.
//
// MAGNITUDES are still placeholders (SCORING-MODEL §7.1: "every number in §4
// is still a placeholder until a real board exists to tune against"). This
// script's own scale: STRONG=5, everything else named (dilutive/access/+)=2,
// so the qualitative words in the table above are at least ordinally
// consistent with each other. Reconsider by editing MAGNITUDE below.
//
// THE SUBSTATION PROBLEM, RESOLVED (SCORING-MODEL §4's own worked example):
// `substation-a` is category `civic`, same as a library -- a flat civic bonus
// would make a substation raise nearby housing value, which is wrong in a way
// anyone would feel. §S2 permits adjacency keys on category OR a specific
// typeId; resolved here by KEYING ON typeId for the civic category
// specifically, rather than splitting `civic` into two categories in the
// schema (a bigger, more structural change nothing else in this migration or
// REBUILD-PLAN.md's own C1 taxonomy calls for). AMENITY_CIVIC_TYPE_IDS below
// is the exact, disclosed list -- everything in `civic` NOT on it gets an
// empty adjacency, not a guessed negative:
//   small-civic-a, civic-6x6-a -- AMENITY. Their own names signal a genuine
//     civic SERVICE (SCORING-MODEL's own parenthetical), matching commercial/
//     landmark's role as the amenity engine.
//   kiosk-a -- NOT an amenity. Grouped with shed/substation in REBUILD-PLAN.md
//     C1.1's own "carries" list for the 1x1 footprint ("kiosk, shed,
//     substation, small civic") -- read as small utility/vendor
//     infrastructure, not a shopping or service draw, and the surrounding
//     company in that same list is unambiguously non-amenity.
//   substation-a -- NOT an amenity. Named directly in SCORING-MODEL §4 as the
//     worked counter-example this resolution exists for.
//   stadium-a -- NOT an amenity, left neutral rather than guessed either way.
//     A stadium's real effect on IMMEDIATELY adjacent residential value is
//     genuinely mixed in the literature (prestige/foot-traffic for the
//     district vs noise/event-day traffic for direct neighbours), and
//     nothing in SCORING-MODEL or REBUILD-PLAN.md resolves it -- an
//     unsourced number either direction would be exactly what
//     rule://published-claims exists to refuse. Named here as the one
//     civic-entry classification most worth Mark's own review.
// =============================================================================

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { basename, dirname, join } from "node:path";
import { AMENITY_CIVIC_TYPE_IDS, adjacencyFor, storeysFor, baseValueFor, unitQualityFor, migrateEntry } from "../public/catalogue-formulas.js";

// PLAN.md §6.5 ("two known defects, both CLI's", defect 1): the four
// formulas and AMENITY_CIVIC_TYPE_IDS used to be DEFINED here, and
// public/catalogue-registry.js imported them from this file -- which meant
// catalogue-registry.js's import graph reached `node:fs` below, and could
// not load anywhere without a Node-like filesystem (a real browser; and,
// before the lazy-repoRoot fix alongside this one, not even inside a
// Cloudflare Worker). They now live in public/catalogue-formulas.js, which
// imports nothing. Re-exported here so this file's OWN existing importers
// (test/catalogueValidator.test.ts, for AMENITY_CIVIC_TYPE_IDS and
// migrateEntry) see no change in shape -- this script is one of two callers
// of the real formulas now, not their owner.
export { AMENITY_CIVIC_TYPE_IDS, adjacencyFor, storeysFor, baseValueFor, unitQualityFor, migrateEntry };

// Walks up looking for CLAUDE.md, the same pattern
// test/catalogueValidator.test.ts's own repoRoot() uses -- NOT a fixed
// "one level up from scripts/". A fixed offset breaks the moment this
// module is bundled alongside something else (test/run.mjs and
// scripts/_mutcheck.mjs both esbuild-bundle every test file, inlining any
// local import into ONE output file two levels under test/.built/, not one
// level under scripts/) -- found for real when _mutcheck.mjs's own bundle
// resolved this to test/data/catalogue.json and crashed. Walking up until
// the real anchor is found is correct at any bundling depth.
function repoRoot() {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let up = 0; up < 6; up++) {
    try { readFileSync(join(dir, "CLAUDE.md"), "utf8"); return dir; } catch { /* not this level */ }
    dir = join(dir, "..");
  }
  throw new Error("migrate-catalogue-s2-fields: could not locate the repo root");
}

function main() {
  const catalogueLogPath = join(repoRoot(), "data", "catalogue.json");
  const catalogue = JSON.parse(readFileSync(catalogueLogPath, "utf8"));
  const migrated = catalogue.map(migrateEntry);
  writeFileSync(catalogueLogPath, JSON.stringify(migrated, null, 2) + "\n");
  console.log(`migrated ${migrated.length} entries -> ${catalogueLogPath}`);
}

// Only run the migration when executed directly -- importing this module
// (test/catalogueValidator.test.ts does, for AMENITY_CIVIC_TYPE_IDS and
// migrateEntry) must NEVER have the side effect of overwriting the real
// catalogue, and must be reliable even when this module is bundled
// alongside the importing test file into one esbuild output (test/run.mjs
// and scripts/_mutcheck.mjs both do this for every test).
//
// An import.meta.url === pathToFileURL(process.argv[1]) comparison
// (this file's own first version, and the standard idiom) is NOT safe
// under bundling: esbuild collapses every locally-imported module's
// import.meta.url to the BUNDLE's own url, so an inlined copy of THIS
// module looks, to that comparison, identical to the bundle actually
// being the entry point -- and the guard fires anyway. Caught for real
// (not hypothesised): a mutation test targeting data/catalogue.json
// triggered exactly this, and main() ran mid-test, first crashing (its
// OWN CATALOGUE_PATH was ALSO bundling-broken, one level short of the
// real root) and, had that crash not happened first, would have
// overwritten the very file the mutation had just edited, silently
// erasing the mutation before the test could see it.
//
// A basename check on process.argv[1] survives bundling: whatever the
// bundle's own output FILENAME is (catalogueValidator.test.mjs,
// _mutcheck.scratch.mjs, ...), it is never literally named
// "migrate-catalogue-s2-fields.mjs", so this only matches a real,
// direct `node scripts/migrate-catalogue-s2-fields.mjs` invocation.
if (process.argv[1] && basename(process.argv[1]) === "migrate-catalogue-s2-fields.mjs") {
  main();
}
