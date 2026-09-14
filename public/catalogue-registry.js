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
// asset." Built here as an in-memory Map, per-registry-instance --
// REGISTRY, yes; PERSISTED, disclosed as NOT yet true: a Cloudflare Worker
// isolate is ephemeral and per-request, so this overlay does not survive
// past one. A durable backing store (KV/D1/etc.) is a real, separate piece
// of work this item does not build -- named here so it is not mistaken for
// done. `.all()` returns a fresh snapshot on every call, not a live view:
// a board (or any other consumer) built from an OLDER snapshot will not
// see a piece authored afterward until it is rebuilt from a fresh one --
// tested directly in test/catalogueRegistry.test.ts, not silently assumed
// away.
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
import { baseValueFor, unitQualityFor, adjacencyFor } from "../scripts/migrate-catalogue-s2-fields.mjs";

/** B3's own placeholder. A player-authored piece's baseValue counts double
 * -- "uniqueness is part of what raises a city's value" is Mark's own
 * framing (V4), and a flat, disclosed 2x is the simplest curve that is
 * ordinally correct (authored > shipped) without inventing a shape the
 * spec never asked for. Kept as an integer specifically so a doubled
 * baseValue (itself always an integer, footprint area x massing tiers)
 * stays an integer too -- catalogue-validator.js's own rule 7 requires it. */
export const UNIQUENESS_MULTIPLIER = 2;

const KNOWN_CATEGORIES = ["residential", "commercial", "industrial", "civic", "landmark", "road"];

const PROVENANCE_FIELDS = ["author", "verifiedBy", "createdAt", "sourceRef"];

/**
 * A fresh registry over `baseCatalogue` (the shipped catalogue, typeId ->
 * entry). Returns a NEW instance every call, never a module-level
 * singleton -- matching public/city-score.js's own registry factory
 * pattern, for the same reason: isolated, test-safe state, and (here) a
 * real reflection of each Worker request getting its own fresh overlay
 * until a durable store exists.
 */
export function createCatalogueRegistry(baseCatalogue) {
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
    } else if (Object.prototype.hasOwnProperty.call(baseCatalogue, id) || overlay.has(id)) {
      errors.push({ id, rule: "no-collision", message: `id "${id}" already exists in the ${Object.prototype.hasOwnProperty.call(baseCatalogue, id) ? "shipped catalogue" : "overlay"} -- an authored piece cannot override an existing one` });
    }

    if (errors.length > 0) return { ok: false, errors };

    const forFormulas = { id, category, footprint, massing };
    const entry = {
      id, footprint, category, rotatable, terrainMask, massing,
      pivot: "corner", // C-5: universal, not a caller-supplied field.
      baseValue: baseValueFor(forFormulas) * UNIQUENESS_MULTIPLIER, // B3: the multiplier lives here.
      unitQuality: unitQualityFor(forFormulas), // B3: multiplier does NOT apply here.
      adjacency: adjacencyFor(forFormulas), // composes the SAME function the shipped catalogue's own migration uses -- one source of truth.
      author: fields.author, verifiedBy: fields.verifiedBy, createdAt: fields.createdAt, sourceRef: fields.sourceRef,
      uniquenessMultiplierApplied: UNIQUENESS_MULTIPLIER,
    };

    const validationErrors = validateEntry(entry);
    if (validationErrors.length > 0) return { ok: false, errors: validationErrors };

    overlay.set(id, entry);
    return { ok: true, entry };
  }

  return { get, all, addAuthoredEntry };
}
