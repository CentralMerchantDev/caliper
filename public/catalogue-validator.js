// =============================================================================
// THE CATALOGUE VALIDATOR — docs/specs/REBUILD-PLAN.md C1, Phase 1 item 5.
//
// Written before anything consumes data/catalogue.json, per the brief's own
// instruction. A11's own evidence is why: "Unknown node types are caught
// immediately — the LLM cannot invent a node name." This is what makes that
// true here — a model (or a person) can add a row, and this is what tells
// them, immediately and by name, when the row is wrong. Six rules, each one
// named in docs/briefs/PHASE-1-rebuild.md's own checklist item 5, no more:
//
//   1. every footprint is a whole number of modules
//   2. every footprint in C1.1's set of eight, or a rotation of one
//   3. every road width even, and one of 2 / 4 / 6 / 8
//   4. every junction's arms same-class or adjacent-class
//   5. every pivot at the anchor cell's corner (C-5), never the footprint centre
//   6. no duplicate ids
//
// Returns a list of errors rather than throwing, so a caller (a test, a
// future LLM generation loop per A11) can report every problem in one pass
// instead of stopping at the first. An empty list is the only "valid".
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
