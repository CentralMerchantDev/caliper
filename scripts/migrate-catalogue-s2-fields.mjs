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
// FORMULA does not change (footprint area x massing tiers for non-road; a
// flat 1 for road, one countable unit each) -- only what the number is FOR.
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

export const CATALOGUE_PATH = join(repoRoot(), "data", "catalogue.json");

const MAGNITUDE = { STRONG: 5, MODERATE: 2 };

/** The civic entries treated as a genuine amenity (positive residential
 * adjacency). Everything in category "civic" NOT on this list gets an empty
 * adjacency for the civic->residential effect -- see the header for why each
 * one landed where it did. */
export const AMENITY_CIVIC_TYPE_IDS = ["small-civic-a", "civic-6x6-a"];

/** Exported (was private) for §U4: public/catalogue-registry.js composes
 * this directly rather than keeping a second, hand-copied magnitude table
 * -- one source of truth for "what does each category's adjacency look
 * like", shipped and authored entries alike. Still throws on an unknown
 * category, deliberately (see below) -- a caller with untrusted input
 * (an authored entry's own category) must check it is one of the six
 * known ones BEFORE calling this, exactly as catalogue-registry.js does. */
export function adjacencyFor(entry) {
  switch (entry.category) {
    case "commercial":
      return { residential: MAGNITUDE.STRONG };
    case "civic":
      return AMENITY_CIVIC_TYPE_IDS.includes(entry.id) ? { residential: MAGNITUDE.STRONG } : {};
    case "landmark":
      return { residential: MAGNITUDE.STRONG };
    case "residential":
      return { residential: -MAGNITUDE.MODERATE, commercial: MAGNITUDE.MODERATE };
    case "industrial":
      return { residential: -MAGNITUDE.STRONG };
    case "road":
      return { residential: MAGNITUDE.MODERATE, commercial: MAGNITUDE.MODERATE };
    default:
      throw new Error(`migrate-catalogue-s2-fields: unknown category "${entry.category}" on entry "${entry.id}" -- add it to adjacencyFor deliberately, do not guess`);
  }
}

/** SCORING-MODEL §3.3: "units" -- footprint area x massing tiers for
 * anything with massing (non-road); a flat 1 for road (one countable unit,
 * infrastructure rather than developed land). Same formula S0 used; only
 * its ROLE in the model changed (S1's readout no longer reads it as worth). */
export function baseValueFor(entry) {
  if (entry.category === "road") return 1;
  const [w, d] = entry.footprint;
  return w * d * entry.massing.length;
}

/** SCORING-MODEL §3.2: a THIRD generated field, alongside baseValue/
 * adjacency -- never hand-authored per entry, never folded into baseValue
 * (Mark's own instruction, item S4). "A calculating factor per housing
 * type, determined by its size and its niceness" -- §3.2 gives no formula.
 * Mark's own scarcity framing ("fewer units sharing the same amenity
 * access are worth more each") and "density is already in the catalogue
 * as massing tiers" together fix the INPUT (massing.length) and the
 * DIRECTION (decreasing); the exact CURVE is a disclosed judgement call,
 * docs/DECISIONS-FOR-MARK.md #14, same rigor as #13's EDGE_FRACTION for
 * S2's falloff.
 *
 * `1/sqrt(tiers)`, not the simpler `1/tiers` -- because `baseValue` IS
 * "units" (footprint x tiers, above), `1/tiers` would cancel the tiers
 * term EXACTLY inside totalWorth = (value x unitQuality) x baseValue =
 * value x footprint x (tiers/tiers) = value x footprint, making massing
 * irrelevant to total worth -- a condo BUILDING's height would count for
 * nothing beyond its footprint. `1/sqrt(tiers)` avoids the cancellation
 * (totalWorth = value x footprint x sqrt(tiers)): more tiers still
 * genuinely raises total worth, not just footprint, while still diluting
 * PER-UNIT worth (the scarcity effect Mark asked for) more gently than
 * 1/tiers would.
 *
 * Road gets a flat neutral 1 (no massing field exists on road entries at
 * all, and "scarcity of housing units" has no meaning for infrastructure)
 * -- the same treatment road already gets for baseValue. */
export function unitQualityFor(entry) {
  if (entry.category === "road") return 1;
  return 1 / Math.sqrt(entry.massing.length);
}

export function migrateEntry(entry) {
  return { ...entry, baseValue: baseValueFor(entry), adjacency: adjacencyFor(entry), unitQuality: unitQualityFor(entry) };
}

function main() {
  const catalogue = JSON.parse(readFileSync(CATALOGUE_PATH, "utf8"));
  const migrated = catalogue.map(migrateEntry);
  writeFileSync(CATALOGUE_PATH, JSON.stringify(migrated, null, 2) + "\n");
  console.log(`migrated ${migrated.length} entries -> ${CATALOGUE_PATH}`);
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
