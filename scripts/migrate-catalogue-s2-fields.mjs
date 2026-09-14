// =============================================================================
// ONE-OFF MIGRATION — adds S2's baseValue/adjacency fields to every entry in
// data/catalogue.json. Run once (docs/briefs/CLI-2026-09-14-scoring.md item
// 2.1); not part of any regular build/test pipeline. Re-running it is safe
// (idempotent -- it recomputes both fields fresh from each entry's own
// footprint/massing/category, it does not read or preserve prior values).
//
// THE FORMULA, AND WHAT IS AND IS NOT SOURCED (docs/DECISIONS-FOR-MARK.md
// #12 has the full account):
//
//   baseValue: footprint area x massing tier count, for every non-road
//   entry -- both are catalogue-native fields already, so this is a
//   transparent, reproducible rule applied uniformly to all 50 entries
//   rather than 50 hand-picked numbers. Road entries have no massing tier
//   (infrastructure, not developed land) and get a flat 1. THE SCALING
//   RELATIONSHIP ITSELF is not mandated by S2 -- S2 says only "an
//   integer" -- so this is a disclosed heuristic, not a citation.
//
//   adjacency: S2 states a DIRECTION for three of the six real catalogue
//   categories -- residential raises value nearby, industrial lowers it,
//   roads raise access -- with no stated per-neighbour-category
//   distinction, so each of those three categories applies ONE flat
//   bonus/penalty to all six real categories (residential, commercial,
//   industrial, civic, landmark, road). commercial/civic/landmark get an
//   EMPTY adjacency object: S2 does not state a direction for them (it
//   names only housing, industry, roads, and parks/water -- and parks/
//   water are not catalogue categories yet), so nothing is invented.
//   THE MAGNITUDE (3) is not sourced at all -- placeholder, logged as an
//   open decision.
// =============================================================================

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CATALOGUE_PATH = join(ROOT, "data", "catalogue.json");

/** The six real categories in data/catalogue.json today. Single source so
 * every generated adjacency map uses the identical key set -- no entry can
 * typo a key, because none are typed by hand. */
const CATEGORIES = ["residential", "commercial", "industrial", "civic", "landmark", "road"];

/** Unsourced placeholder magnitude -- docs/DECISIONS-FOR-MARK.md #12. */
const ADJACENCY_MAGNITUDE = 3;

function flatAdjacency(sign) {
  const map = {};
  for (const c of CATEGORIES) map[c] = sign * ADJACENCY_MAGNITUDE;
  return map;
}

const ADJACENCY_BY_CATEGORY = {
  residential: flatAdjacency(1), // S2: "housing raises desirability nearby"
  industrial: flatAdjacency(-1), // S2: "industry lowers it"
  road: flatAdjacency(1), // S2: "roads raise access"
  commercial: {}, // S2 states no direction for this category -- not invented
  civic: {}, // S2 states no direction for this category -- not invented
  landmark: {}, // S2 states no direction for this category -- not invented
};

function baseValueFor(entry) {
  if (entry.category === "road") return 1;
  const [w, d] = entry.footprint;
  return w * d * entry.massing.length;
}

function migrate(entry) {
  const adjacency = ADJACENCY_BY_CATEGORY[entry.category];
  if (adjacency === undefined) {
    throw new Error(`migrate-catalogue-s2-fields: unknown category "${entry.category}" on entry "${entry.id}" -- add it to ADJACENCY_BY_CATEGORY deliberately, do not guess`);
  }
  return { ...entry, baseValue: baseValueFor(entry), adjacency: { ...adjacency } };
}

const catalogue = JSON.parse(readFileSync(CATALOGUE_PATH, "utf8"));
const migrated = catalogue.map(migrate);
writeFileSync(CATALOGUE_PATH, JSON.stringify(migrated, null, 2) + "\n");
console.log(`migrated ${migrated.length} entries -> ${CATALOGUE_PATH}`);
