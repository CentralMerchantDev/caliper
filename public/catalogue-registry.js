// =============================================================================
// SIDE B'S DATA MODEL — REBUILD-PLAN.md B1-B4 ("the mechanic that makes
// CALIPER itself rather than a city builder"). Data and logic only, per
// docs/briefs/CLI-2026-09-15-overnight.md §4 -- no interface, no real
// generation pipeline (A11's own, already-documented loop owns that), no
// persistence backend, no sharing/marketplace/moderation/token economy
// (B4 -- those are VISION.md's, explicitly out of scope here).
//
// B1: "A player-authored piece is a catalogue entry. Full stop... The board
// cannot tell the difference between a shipped piece and an authored one,
// and must not be able to." Cashed out here as: `.all()` returns ONE plain
// object, base entries and authored entries side by side, in exactly the
// shape `createAreaBoard`/`scoring.js` already consume for the shipped
// catalogue -- no branch anywhere checks "is this piece authored" before
// placing or scoring it. The only place that distinction is ever visible
// is the entry's own optional provenance fields, which nothing in the
// scoring or placement path reads.
//
// B2: "The catalogue is a registry with a persisted overlay, not a static
// asset." Two backings, same public shape (`get`/`all`/`addAuthoredEntry`):
//
//   NO `db` PASSED -- an in-memory Map, per-registry-instance. REGISTRY,
//   yes; PERSISTED, no -- a Cloudflare Worker isolate is ephemeral and
//   per-request, so this overlay does not survive past one. Kept, unchanged,
//   for every existing caller and test that never had a D1 binding to give
//   it -- "new parameters go last, with a default that preserves today's
//   behaviour."
//
//   `db` PASSED (a D1Database binding) -- SDB-1 (PLAN.md §6): Mark's
//   ruling, D1, surviving a full REDEPLOY, not just an isolate. An authored
//   entry is a record with validated, queried fields, not a blob (D1 over
//   KV) -- schema in migrations/0001_create_authored_pieces.sql. Every
//   read and write goes straight to D1, every time -- no in-memory cache to
//   go stale, drift from another isolate's writes, or need invalidating.
//   The unavoidable cost: `get`/`all`/`addAuthoredEntry` become
//   Promise-returning when `db` is supplied (D1 access cannot be
//   synchronous) -- the three method NAMES and what each one MEANS do not
//   change; this is the minimal adaptation a durable backing store forces,
//   not a redesign.
//
// `.all()` (either backing) returns a fresh snapshot on every call, not a
// live view: a board (or any other consumer) built from an OLDER snapshot
// will not see a piece authored afterward until it is rebuilt from a fresh
// one -- tested directly in test/catalogueRegistry.test.ts, not silently
// assumed away.
//
// B3: "a piece whose typeId is player-authored contributes a uniqueness
// multiplier to baseValue." UNIQUENESS_MULTIPLIER below is a disclosed
// placeholder (DECISIONS-FOR-MARK.md), same rigor as S2's adjacency
// magnitudes and S4's unitQuality curve -- applied to baseValue ONLY,
// never unitQuality, matching B3's own wording exactly. Baked into the
// stored entry at authoring time (unlike the shipped catalogue's own
// re-derivable baseValueFor/unitQualityFor, which a migration script can
// re-run after retuning) BECAUSE an authored entry has no equivalent
// re-run path -- there is no second copy of "what fields it was built
// from" to regenerate against. `uniquenessMultiplierApplied` is recorded
// on the entry as a disclosed trail for a future re-tuning pass to read,
// even though nothing reads it today.
// =============================================================================

import { validateEntry } from "./catalogue-validator.js";
import { baseValueFor, unitQualityFor, adjacencyFor, storeysFor } from "./catalogue-formulas.js";

/** B3's own placeholder. A player-authored piece's baseValue counts double
 * -- "uniqueness is part of what raises a city's value" is Mark's own
 * framing (V4), and a flat, disclosed 2x is the simplest curve that is
 * ordinally correct (authored > shipped) without inventing a shape the
 * spec never asked for. Kept as an integer specifically so a doubled
 * baseValue (itself always an integer, footprint area x storeys -- FIX-2,
 * PLAN.md §3.2) stays an integer too -- catalogue-validator.js's own rule 7
 * requires it. */
export const UNIQUENESS_MULTIPLIER = 2;

const KNOWN_CATEGORIES = ["residential", "commercial", "industrial", "civic", "landmark", "road"];

const PROVENANCE_FIELDS = ["author", "verifiedBy", "createdAt", "sourceRef"];

/**
 * Validates `fields` and builds the entry object addAuthoredEntry would
 * store -- everything BOTH backings need, shared so the rules (provenance,
 * category, id shape) and the derived fields (storeys/baseValue/unitQuality/
 * adjacency, B3's multiplier) can only ever be computed one way. Does NOT
 * check collision against an existing overlay/table -- that check needs a
 * `has(id)` the caller supplies, since one backing checks a Map synchronously
 * and the other checks D1 with an awaited query.
 */
function buildAuthoredEntry(fields, idExists) {
  const { id, footprint, category, rotatable, terrainMask, massing } = fields;
  const errors = [];

  // Provenance: addAuthoredEntry's OWN check, deliberately separate from
  // catalogue-validator.js's own rule 10. Rule 10 enforces "all four or
  // none" so it can keep accepting the shipped catalogue's every entry
  // (zero of four, always) -- it CANNOT also mean "an authored entry
  // must actually have provenance", since 0-of-4 legally satisfies it.
  // This is that stricter check.
  for (const key of PROVENANCE_FIELDS) {
    const value = fields[key];
    if (typeof value !== "string" || value.trim() === "") {
      errors.push({ id: id ?? "<missing id>", rule: "authored-entry-requires-provenance", message: `${key} must be a non-empty string, got ${JSON.stringify(value)}` });
    }
  }

  // Category must be checked BEFORE adjacencyFor() is ever reached --
  // that function THROWS on an unrecognized category, by design
  // (migrate-catalogue-s2-fields.mjs's own "add it deliberately, do not
  // guess"), which is exactly right for a hand-typed SHIPPED entry but
  // wrong for authored input: an unrecognized category here is a real,
  // expected REFUSAL case, not a crash. This check is what makes calling
  // the real, throwing adjacencyFor() below safe.
  if (!KNOWN_CATEGORIES.includes(category)) {
    errors.push({ id: id ?? "<missing id>", rule: "known-category", message: `category ${JSON.stringify(category)} is not one of ${KNOWN_CATEGORIES.join("/")}` });
  }

  if (typeof id !== "string" || id === "") {
    errors.push({ id: "<missing id>", rule: "has-id", message: "id must be a non-empty string" });
  } else if (idExists) {
    errors.push({ id, rule: "no-collision", message: `id "${id}" already exists -- an authored piece cannot override an existing one` });
  }

  if (errors.length > 0) return { ok: false, errors };

  const forFormulas = { id, category, footprint, massing };
  const entry = {
    id, footprint, category, rotatable, terrainMask, massing,
    pivot: "corner", // C-5: universal, not a caller-supplied field.
    // FIX-2 (PLAN.md §3.2): storeysFor has no `proportion` to read on an
    // authored entry (this registry never collects one) and defaults to a
    // square massing (proportion 1) in that case -- see storeysFor's own
    // header in migrate-catalogue-s2-fields.mjs. Stored so catalogue-
    // validator.js's rule 12 (storeys present) passes on authored pieces
    // exactly as it does on shipped ones.
    storeys: storeysFor(forFormulas),
    baseValue: baseValueFor(forFormulas) * UNIQUENESS_MULTIPLIER, // B3: the multiplier lives here.
    unitQuality: unitQualityFor(forFormulas), // B3: multiplier does NOT apply here.
    adjacency: adjacencyFor(forFormulas), // composes the SAME function the shipped catalogue's own migration uses -- one source of truth.
    author: fields.author, verifiedBy: fields.verifiedBy, createdAt: fields.createdAt, sourceRef: fields.sourceRef,
    uniquenessMultiplierApplied: UNIQUENESS_MULTIPLIER,
  };

  const validationErrors = validateEntry(entry);
  if (validationErrors.length > 0) return { ok: false, errors: validationErrors };

  return { ok: true, entry };
}

/** entry (camelCase, arrays/objects) -> the row shape
 * migrations/0001_create_authored_pieces.sql expects (snake_case, JSON text
 * for the array/object fields) -- and back. Two directions kept next to each
 * other so a column added on one side is immediately visibly missing on the
 * other. */
function entryToRow(entry) {
  return {
    id: entry.id,
    footprint_w: entry.footprint[0],
    footprint_d: entry.footprint[1],
    category: entry.category,
    rotatable: entry.rotatable ? 1 : 0,
    terrain_mask: JSON.stringify(entry.terrainMask),
    massing: JSON.stringify(entry.massing),
    pivot: entry.pivot,
    storeys: entry.storeys,
    base_value: entry.baseValue,
    unit_quality: entry.unitQuality,
    adjacency: JSON.stringify(entry.adjacency),
    author: entry.author,
    verified_by: entry.verifiedBy,
    created_at: entry.createdAt,
    source_ref: entry.sourceRef,
    uniqueness_multiplier_applied: entry.uniquenessMultiplierApplied,
  };
}

function rowToEntry(row) {
  return {
    id: row.id,
    footprint: [row.footprint_w, row.footprint_d],
    category: row.category,
    rotatable: !!row.rotatable,
    terrainMask: JSON.parse(row.terrain_mask),
    massing: JSON.parse(row.massing),
    pivot: row.pivot,
    storeys: row.storeys,
    baseValue: row.base_value,
    unitQuality: row.unit_quality,
    adjacency: JSON.parse(row.adjacency),
    author: row.author,
    verifiedBy: row.verified_by,
    createdAt: row.created_at,
    sourceRef: row.source_ref,
    uniquenessMultiplierApplied: row.uniqueness_multiplier_applied,
  };
}

/**
 * A fresh registry over `baseCatalogue` (the shipped catalogue, typeId ->
 * entry).
 *
 * NO `db`: an in-memory Map, per-registry-instance -- unchanged from before
 * SDB-1, byte-for-byte, so every existing (synchronous) caller and test
 * keeps working with no change. Returns a NEW instance every call, never a
 * module-level singleton -- matching public/city-score.js's own registry
 * factory pattern, for the same reason: isolated, test-safe state.
 *
 * `db` (a D1Database binding): SDB-1. `get`/`all`/`addAuthoredEntry` become
 * async and read/write `authored_pieces` directly, every call -- no cache,
 * so a second registry instance built against the SAME `db` (a fresh
 * isolate, e.g. after a redeploy) sees every previously authored piece.
 */
export function createCatalogueRegistry(baseCatalogue, { db } = {}) {
  if (!db) {
    const overlay = new Map();

    function get(typeId) {
      return overlay.has(typeId) ? overlay.get(typeId) : baseCatalogue[typeId];
    }

    /** A fresh snapshot, not a live view -- see this module's own header for
     * why, and why that is a real, tested requirement rather than a silent
     * assumption. */
    function all() {
      const merged = { ...baseCatalogue };
      for (const [typeId, entry] of overlay) merged[typeId] = entry;
      return merged;
    }

    function addAuthoredEntry(fields) {
      const idExists = Object.prototype.hasOwnProperty.call(baseCatalogue, fields.id) || overlay.has(fields.id);
      const result = buildAuthoredEntry(fields, idExists);
      if (!result.ok) return result;
      overlay.set(result.entry.id, result.entry);
      return result;
    }

    return { get, all, addAuthoredEntry };
  }

  async function get(typeId) {
    const row = await db.prepare("SELECT * FROM authored_pieces WHERE id = ?").bind(typeId).first();
    return row ? rowToEntry(row) : baseCatalogue[typeId];
  }

  /** A fresh snapshot, not a live view -- same requirement as the in-memory
   * backing, read straight from D1 every call. */
  async function all() {
    const merged = { ...baseCatalogue };
    const { results } = await db.prepare("SELECT * FROM authored_pieces").all();
    for (const row of results) merged[row.id] = rowToEntry(row);
    return merged;
  }

  async function addAuthoredEntry(fields) {
    const idExists = Object.prototype.hasOwnProperty.call(baseCatalogue, fields.id)
      || (await db.prepare("SELECT 1 FROM authored_pieces WHERE id = ?").bind(fields.id).first()) != null;
    const result = buildAuthoredEntry(fields, idExists);
    if (!result.ok) return result;

    const row = entryToRow(result.entry);
    const columns = Object.keys(row);
    await db
      .prepare(`INSERT INTO authored_pieces (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`)
      .bind(...columns.map((c) => row[c]))
      .run();

    return result;
  }

  return { get, all, addAuthoredEntry };
}
