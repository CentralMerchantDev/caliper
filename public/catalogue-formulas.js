// =============================================================================
// THE CATALOGUE'S PURE VALUE FORMULAS -- storeysFor/baseValueFor/
// unitQualityFor/adjacencyFor/migrateEntry, and the AMENITY_CIVIC_TYPE_IDS
// table they read. Extracted from scripts/migrate-catalogue-s2-fields.mjs
// (PLAN.md §6.5, "two known defects, both CLI's" -- defect 1): that script
// is a Node CLI tool, importing `node:fs`/`node:path`/`node:url` to read and
// rewrite data/catalogue.json on disk. public/catalogue-registry.js used to
// import these formulas FROM that script -- fine in Node, but it means
// EVERY consumer of catalogue-registry.js (a Cloudflare Worker under
// workerd, and eventually a real browser page with no Node shims at all)
// transitively pulled in a filesystem-reading module it can never actually
// run. This file is the fix: the four formulas and the one table they need,
// with NO import of any kind -- no `node:*` built-in, nothing else in this
// repo -- so anything that can load a plain ES module can load this one.
//
// scripts/migrate-catalogue-s2-fields.mjs now imports FROM here and
// re-exports, so its own existing importers (test/catalogueValidator.test.ts,
// this file's own former self) see no change in shape. This file is the one
// source of truth for what each formula computes; the Node script is one of
// two callers now, not the owner.
// =============================================================================

const MAGNITUDE = { STRONG: 5, MODERATE: 2 };

/** The civic entries treated as a genuine amenity (positive residential
 * adjacency). Everything in category "civic" NOT on this list gets an empty
 * adjacency for the civic->residential effect -- see
 * scripts/migrate-catalogue-s2-fields.mjs's own header for why each one
 * landed where it did (the substation problem). */
export const AMENITY_CIVIC_TYPE_IDS = ["small-civic-a", "civic-6x6-a"];

/** public/catalogue-registry.js composes this directly rather than keeping a
 * second, hand-copied magnitude table -- one source of truth for "what does
 * each category's adjacency look like", shipped and authored entries alike.
 * Still throws on an unknown category, deliberately -- a caller with
 * untrusted input (an authored entry's own category) must check it is one
 * of the six known ones BEFORE calling this, exactly as
 * catalogue-registry.js does. */
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
      throw new Error(`catalogue-formulas: unknown category "${entry.category}" on entry "${entry.id}" -- add it to adjacencyFor deliberately, do not guess`);
  }
}

/** FIX-2 (PLAN.md §3.2): `massing` is a shape-segment array --
 * `["base","top"]`, two to four entries -- not a storey count, but
 * baseValue/unitQuality read `massing.length` as if it were one.
 *
 * `storeysFor` replaces `massing.length` as the input both formulas below
 * read. It is a pure function of an entry's own fields (category,
 * footprint, massing, and `proportion` when present) so it works
 * identically for the shipped catalogue AND a freshly-authored piece
 * (public/catalogue-registry.js's addAuthoredEntry supplies only
 * `{id, category, footprint, massing}` -- no `proportion` -- so its absence
 * must degrade gracefully, not throw).
 *
 * Composes three signals already real and disclosed in this catalogue,
 * multiplicatively, into a real-proportions-derived SCALE used as a
 * storey-count stand-in -- see scripts/migrate-catalogue-s2-fields.mjs's own
 * header for the full derivation and the Toronto-ratio verification. */
export function storeysFor(entry) {
  if (entry.category === "road") return 1;
  const proportion = typeof entry.proportion === "number" ? entry.proportion : 1;
  const tiers = entry.massing.length;
  const [width] = entry.footprint;
  return Math.max(1, Math.round(proportion * tiers * width));
}

/** SCORING-MODEL §3.3: "units" -- footprint area x storeys for anything
 * with massing (non-road); a flat 1 for road (one countable unit,
 * infrastructure rather than developed land). */
export function baseValueFor(entry) {
  if (entry.category === "road") return 1;
  const [w, d] = entry.footprint;
  return w * d * storeysFor(entry);
}

/** SCORING-MODEL §3.2: `1/sqrt(tiers)`, not the simpler `1/tiers` -- see
 * scripts/migrate-catalogue-s2-fields.mjs's own header for the cancellation
 * argument this curve avoids. Road gets a flat neutral 1, same as
 * baseValueFor. */
export function unitQualityFor(entry) {
  if (entry.category === "road") return 1;
  return 1 / Math.sqrt(storeysFor(entry));
}

export function migrateEntry(entry) {
  return { ...entry, storeys: storeysFor(entry), baseValue: baseValueFor(entry), adjacency: adjacencyFor(entry), unitQuality: unitQualityFor(entry) };
}
