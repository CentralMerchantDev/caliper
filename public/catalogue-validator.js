// =============================================================================
// THE CATALOGUE VALIDATOR — docs/specs/REBUILD-PLAN.md C1, Phase 1 item 5;
// rules 7-8 added for §S2 (docs/briefs/CLI-2026-09-14-scoring.md item 2.1);
// rule 9 added for §S4 (unitQuality); rule 10 added for §U4 (B1's own
// provenance fields on a player-authored entry); rule 11 added for BO7A
// (glb).
//
// Written before anything consumes data/catalogue.json, per the brief's own
// instruction. A11's own evidence is why: "Unknown node types are caught
// immediately — the LLM cannot invent a node name." This is what makes that
// true here — a model (or a person) can add a row, and this is what tells
// them, immediately and by name, when the row is wrong. Eleven rules:
//
//   1. every footprint is a whole number of modules
//   2. every footprint in C1.1's set of eight, or a rotation of one
//   3. every road width even, and one of 2 / 4 / 6 / 8
//   4. every junction's arms same-class or adjacent-class
//   5. every pivot at the anchor cell's corner (C-5), never the footprint centre
//   6. no duplicate ids
//   7. baseValue is present and an integer (S2)
//   8. adjacency is present, a plain object, and every value in it an integer (S2)
//   9. unitQuality is present, a finite number, in (0, 1] (S4)
//   10. provenance (author/verifiedBy/createdAt/sourceRef) is all-or-nothing (U4)
//   11. glb, if present, is a non-empty string (BO7A)
//   12. storeys is present and a positive integer (FIX-2, PLAN.md §3.2)
//   13. authoredClass, if present, is one of KNOWN_AUTHORED_CLASSES (SDB-2,
//       PLAN.md §6.6) -- and rule 10's provenance group now covers it too
//
// Returns a list of errors rather than throwing, so a caller (a test, a
// future LLM generation loop per A11) can report every problem in one pass
// instead of stopping at the first. An empty list is the only "valid".
//
// `glb` (BO7A, 2026-09-15) LINKS an entry to a real mesh in `public/look-
// proof-pieces.js` (L12) -- `null` on most entries, since most of the 50
// have no matching real mesh yet, and that is expected, not a defect.
// scripts/link-catalogue-meshes.mjs is the one place this field is ever
// written; hand-editing it here risks drifting from that script's own
// disclosed matching rule.
//
// PROPS ARE NOT CATALOGUE PIECES, RESOLVED DIRECTLY BY MARK (2026-09-15,
// scoping BO7A): a lamp, a dumpster, an awning are scene dressing. C1.3
// covers roads, C1.4 covers buildings; neither covers a prop, and this
// repo already keeps props in a separate system (`public/prop-manifest.js`,
// `public/prop-placement.js`). A prop's own typeId (e.g. "dumpster-1x1",
// an L12 mesh id) is deliberately absent from this catalogue -- attempting
// to PLACE one as a piece refuses via the ordinary "unknown-type" path
// (area-board.js's evaluatePlacement), the same as any other id this
// catalogue has never heard of. See scripts/link-catalogue-meshes.mjs's
// own PROP_MESH_IDS for the disclosed list of which L12 meshes this covers.
//
// WHAT `adjacency`'S KEYS MEAN, RESOLVED HERE BECAUSE S2 DOES NOT SAY —
// keyed by the CATEGORY OF THE NEIGHBOURING CELL a bonus applies to: for a
// piece P and a cell C within Chebyshev radius R of P, P's own
// `adjacency[categoryAtC]` (if present) is P's contribution to C's value.
// This composes with S4's own two-number framing ("the target cell's
// CURRENT value, and the value the piece WOULD have there") for the one
// case that would otherwise be undefined -- a vacant cell has no category
// to key on: `valueAt()` on empty ground is terrain-only (S1's
// `terrainContribution(cell)` term, no adjacency component, because
// nothing occupies the cell to receive one); `valueIfPlaced(typeId, cell,
// rotation)` supplies the missing category itself (the candidate's own)
// and is where adjacency actually applies. Neither function is built in
// this pass (S2's own catalogue migration only) -- recorded here so
// whoever builds them does not have to re-derive it.
//
// THE TABLE ITSELF — `docs/specs/SCORING-MODEL-2026-09-14.md` (Mark's own
// decisions, folded into REBUILD-PLAN.md §S2 as a Correction, item A1):
// commercial/civic(amenity-only, keyed on typeId)/landmark carry a strong
// positive bonus to `residential`; `residential` is DILUTIVE on itself
// (scarcity) and positive on `commercial`; `industrial` is strongly
// negative on `residential`; `road` is positive on both. Not a uniform
// bonus applied to all six categories -- that was S0's reading, corrected
// by A1 because it left three amenity categories (commercial/civic/
// landmark) at `{}`, switching off the model's own primary value driver.
// `scripts/migrate-catalogue-s2-fields.mjs`'s own `AMENITY_CIVIC_TYPE_IDS`
// is the authoritative list of which `civic` entries count as an amenity.
// =============================================================================

/** C1.1's eight canonical footprints, modules, each stored width-first,
 * width <= depth, so a rotation of one already IS the same entry here. */
export const CATALOGUE_FOOTPRINTS = [
  [1, 1], [2, 2], [2, 3], [3, 3], [4, 4], [4, 6], [6, 6], [8, 8],
];

/** C1.3's four road classes, in adjacency order. Index distance of 1 is
 * "adjacent"; the same index (or the same class twice) is "same-class". */
export const ROAD_CLASS_HIERARCHY = ["lane", "street", "avenue", "highway"];

/** C1.3's road widths, modules. Every one is even by construction; kept as
 * its own list (not derived from ROAD_CLASS_HIERARCHY's own width table)
 * so rule 3 checks a real constant, not a tautology against itself. */
export const ROAD_WIDTHS = [2, 4, 6, 8];

/** SDB-2 (PLAN.md §6.6): "Record the class of what each authoring run
 * produced — prop, house, condo. No mechanic attached." PLAN.md gives these
 * three as the illustrative starting set, not a field name or an exhaustive
 * spec -- both are disclosed judgement calls here, same rigor as B3's own
 * UNIQUENESS_MULTIPLIER: `authoredClass` (not `class`, which would read as
 * the JS keyword and collide in meaning with the existing `category` field
 * -- a piece's CATALOGUE category, e.g. "residential", is a different axis
 * entirely from what KIND of authoring run produced it). A closed set,
 * extended deliberately later -- same "add it, do not guess" pattern
 * adjacencyFor's category switch already uses -- not an open string, since
 * nothing reads this yet and an unbounded free-text field is exactly what
 * would make a future V2 reward-table LOOKUP impossible to build against.
 * Owned here, not catalogue-registry.js, so catalogue-registry.js can
 * import it without a circular dependency (catalogue-registry.js already
 * imports validateEntry from this file). */
export const KNOWN_AUTHORED_CLASSES = ["prop", "house", "condo"];

function isPositiveInteger(n) {
  return typeof n === "number" && Number.isInteger(n) && n > 0;
}

function footprintKey(footprint) {
  const [a, b] = footprint;
  return a <= b ? `${a}x${b}` : `${b}x${a}`;
}

const CANONICAL_FOOTPRINT_KEYS = new Set(CATALOGUE_FOOTPRINTS.map(footprintKey));

/**
 * Validate one catalogue entry against the rules that apply to it alone
 * (everything except the cross-entry duplicate-id check, which needs the
 * whole list). Returns an array of `{ id, rule, message }` errors, empty if
 * the entry is clean.
 */
export function validateEntry(entry) {
  const errors = [];
  const id = entry && typeof entry.id === "string" ? entry.id : "<missing id>";
  const push = (rule, message) => errors.push({ id, rule, message });

  const footprint = entry && entry.footprint;
  const hasWholeModuleFootprint =
    Array.isArray(footprint) &&
    footprint.length === 2 &&
    isPositiveInteger(footprint[0]) &&
    isPositiveInteger(footprint[1]);

  // Rule 1 — every footprint is a whole number of modules.
  if (!hasWholeModuleFootprint) {
    push("whole-module-footprint", `footprint ${JSON.stringify(footprint)} is not a pair of positive whole-module integers`);
  }

  if (hasWholeModuleFootprint) {
    if (entry.category === "road") {
      const [w, h] = footprint;
      // Rule 3 — every road width even, and one of 2/4/6/8. The junction
      // tile is square (C1.3): a road entry's own width is both dimensions
      // at once, so a non-square road footprint is rule 3's business, not a
      // silently-passed rule 2.
      if (w !== h) {
        push("road-width", `road footprint ${JSON.stringify(footprint)} is not square -- C1.3 requires the junction tile be square, sized to its widest arm`);
      } else if (w % 2 !== 0 || !ROAD_WIDTHS.includes(w)) {
        push("road-width", `road width ${w} is not even and one of ${ROAD_WIDTHS.join("/")}`);
      }
    } else {
      // Rule 2 — every footprint in C1.1's set of eight, or a rotation of one.
      if (!CANONICAL_FOOTPRINT_KEYS.has(footprintKey(footprint))) {
        push("catalogue-footprint-set", `footprint ${JSON.stringify(footprint)} is not one of C1.1's eight footprints or a rotation of one`);
      }
    }
  }

  // Rule 4 — every junction's arms same-class or adjacent-class.
  if (entry && entry.category === "road" && Array.isArray(entry.junctionArms)) {
    const indices = entry.junctionArms.map((cls) => ROAD_CLASS_HIERARCHY.indexOf(cls));
    if (indices.some((i) => i === -1)) {
      push("junction-class-adjacency", `junctionArms ${JSON.stringify(entry.junctionArms)} names a class outside ${JSON.stringify(ROAD_CLASS_HIERARCHY)}`);
    } else {
      const distinct = [...new Set(indices)];
      const maxIdx = Math.max(...distinct);
      const minIdx = Math.min(...distinct);
      if (distinct.length > 2 || maxIdx - minIdx > 1) {
        push("junction-class-adjacency", `junctionArms ${JSON.stringify(entry.junctionArms)} span more than one adjacent class pair`);
      }
    }
  }

  // Rule 5 — every pivot at the anchor cell's corner (C-5), never the
  // footprint centre.
  if (!entry || entry.pivot !== "corner") {
    push("pivot-corner", `pivot is ${JSON.stringify(entry && entry.pivot)}, not "corner" -- C-5 supersedes a centre pivot`);
  }

  // Rule 7 — S2: baseValue is present and an integer. No sign constraint
  // beyond that -- S2 says only "an integer".
  if (!entry || !Number.isInteger(entry.baseValue)) {
    push("has-base-value", `baseValue is ${JSON.stringify(entry && entry.baseValue)}, not an integer -- S2 requires one on every entry`);
  }

  // Rule 8 — S2: adjacency is present, a plain object (not an array, not
  // null -- both would pass a bare truthiness/typeof check), and every
  // value inside it is an integer. Keys are NOT restricted to a fixed
  // enum here: S2 explicitly allows "category (or specific typeId)", and
  // a future player-authored typeId (B1) cannot be enumerated in advance.
  {
    const adjacency = entry && entry.adjacency;
    const isPlainObject = typeof adjacency === "object" && adjacency !== null && !Array.isArray(adjacency);
    if (!isPlainObject) {
      push("has-adjacency", `adjacency is ${JSON.stringify(adjacency)}, not a plain object -- S2 requires a category/typeId -> integer map on every entry`);
    } else {
      for (const [key, value] of Object.entries(adjacency)) {
        if (!Number.isInteger(value)) {
          push("adjacency-values-are-integers", `adjacency["${key}"] is ${JSON.stringify(value)}, not an integer`);
        }
      }
    }
  }

  // Rule 9 — §S4: unitQuality is present, a finite number, and in (0, 1].
  // Not required to be an integer (S2's rule 7 requires that of baseValue;
  // unitQuality's own formula, 1/sqrt(tiers), is inherently fractional).
  // Bounded above by 1, not just "> 0": by construction the real formula
  // never exceeds 1 for tiers >= 1, so an upper bound catches a hand-typed
  // value outside that domain (e.g. unitQuality: 50) the same way rule 7's
  // integer check catches a fractional baseValue -- ">0" alone would not.
  if (!entry || !Number.isFinite(entry.unitQuality) || entry.unitQuality <= 0 || entry.unitQuality > 1) {
    push("has-unit-quality", `unitQuality is ${JSON.stringify(entry && entry.unitQuality)}, not a finite number in (0, 1] -- S4 requires one on every entry`);
  }

  // Rule 10 — §U4/B1, extended by SDB-2: provenance (author, verifiedBy,
  // createdAt, sourceRef, authoredClass) is ALL-OR-NOTHING. Every SHIPPED
  // entry has ZERO of these five -- that is legal, and must stay legal, or
  // this rule would break the entire shipped catalogue. It is deliberately
  // NOT the check that "an authored entry must actually have provenance"
  // (catalogue-registry.js's own addAuthoredEntry() enforces that,
  // separately and more strictly, before an entry ever reaches this shared
  // validator) -- this rule catches only the narrower, structural case: a
  // hand-corrupted or partially-filled-in entry with SOME but not all five
  // present, which is never a valid state for either a shipped or a
  // genuinely authored piece. authoredClass joined this group rather than
  // standing alone, matching the other four's own "no mechanic attached"
  // treatment -- it is provenance about the authoring run, not a game field.
  {
    const provenance = ["author", "verifiedBy", "createdAt", "sourceRef", "authoredClass"];
    const present = entry ? provenance.filter((k) => entry[k] !== undefined) : [];
    if (present.length > 0 && present.length < provenance.length) {
      const missing = provenance.filter((k) => !present.includes(k));
      push("provenance-all-or-nothing", `has ${present.join("/")} but is missing ${missing.join("/")} -- provenance is all five fields or none, never some`);
    }
  }

  // Rule 11 — BO7A: glb, if present, is a non-empty string. Most entries
  // have no mesh yet (glb: null), which is fine -- this rule only catches a
  // present-but-malformed value (an empty string, a number, an object).
  if (entry && "glb" in entry && entry.glb !== null) {
    if (typeof entry.glb !== "string" || entry.glb.length === 0) {
      push("glb-is-string-or-null", `glb is ${JSON.stringify(entry.glb)}, not a non-empty string or null`);
    }
  }

  // Rule 12 — FIX-2 (PLAN.md §3.2): storeys is present and a positive
  // integer, on every entry including road (storeysFor's own flat 1) --
  // the same "no exemption" treatment rule 7 already gives baseValue.
  // `massing.length` (2-4) was never a real storey count; this is the
  // field that replaced it as baseValue/unitQuality's own height signal.
  if (!entry || !isPositiveInteger(entry.storeys)) {
    push("has-storeys", `storeys is ${JSON.stringify(entry && entry.storeys)}, not a positive integer -- FIX-2 requires one on every entry`);
  }

  // Rule 13 — SDB-2: authoredClass, if present, is one of
  // KNOWN_AUTHORED_CLASSES. Most (shipped) entries have no authoredClass at
  // all, which is fine, same as glb's rule 11 -- this only catches a
  // present-but-malformed value.
  if (entry && "authoredClass" in entry && entry.authoredClass !== undefined) {
    if (!KNOWN_AUTHORED_CLASSES.includes(entry.authoredClass)) {
      push("known-authored-class", `authoredClass is ${JSON.stringify(entry.authoredClass)}, not one of ${KNOWN_AUTHORED_CLASSES.join("/")}`);
    }
  }

  return errors;
}

/**
 * Validate a whole catalogue: every entry's own rules, plus rule 6 (no
 * duplicate ids), which only makes sense across the full list. Returns the
 * combined error list; empty means the catalogue is valid.
 */
export function validateCatalogue(entries) {
  const errors = [];
  const seenIds = new Map(); // id -> count, so every duplicate is reported once per extra occurrence

  for (const entry of entries) {
    errors.push(...validateEntry(entry));
    const id = entry && entry.id;
    if (typeof id === "string") {
      seenIds.set(id, (seenIds.get(id) || 0) + 1);
    }
  }

  for (const [id, count] of seenIds) {
    if (count > 1) {
      errors.push({ id, rule: "no-duplicate-ids", message: `id "${id}" appears ${count} times` });
    }
  }

  return errors;
}
