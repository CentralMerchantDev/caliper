// =============================================================================
// THE CITY SCORE — SCORING-MODEL-2026-09-14.md §4B. A SECOND DIMENSION, not
// an adjacency value, and must not be folded into public/scoring.js's own
// table. §S1's value() is strictly local at Chebyshev R = 3; this is
// global — computed differently, shown separately.
//
// It exists because of Mark's stadium ruling: "a stadium raises the overall
// city value and is neutral to the area it is built in." There was nowhere
// in the local model for "raises the city" to go. This is that place.
//
// A REGISTRY, not a formula (§4B.3): "this is and should be judged based on
// the buildings and not the players, but we may add in players' own lives
// at a later point, so do it in a way that would allow for upgrades."
// Mechanically that means a term takes the board and returns a number, and
// adding a term later must touch nothing but that term -- proven by
// test/cityScore.test.ts's own GATE, not merely asserted.
//
// MEDIAN, NOT MEAN, AND THIS IS LOAD-BEARING (§4B.2): "the city is ranked
// based on the median wealth, for now." A mean lets one spectacular tower
// carry a slum; median does not. The city that is good for the TYPICAL
// resident wins, not the city with one rich district.
//
// WHAT WAITS, AND WHY (§4B.4): amenity terms -- jobs, healthcare, education,
// parks -- are not built here. The catalogue cannot express them yet (a
// hospital, a school and a substation are all `civic` today); that taxonomy
// is BO7's work and a prerequisite, the same shape as the substation problem
// one level up. Ships now: the registry, and median wealth as its one term.
// =============================================================================

import { cellsOf } from "./area-board.js";
import { valueAt, perUnitWorth } from "./scoring.js";

/** The middle value of a sorted copy of `numbers` -- the true middle element
 * for an odd length, the average of the two middle elements for an even
 * one. `null` for an empty array, DELIBERATELY not 0: "no data yet" and "a
 * real score of exactly zero" are different facts, and collapsing them
 * would let an empty city silently outrank a real, badly-planned one that
 * legitimately scores negative (residential-on-residential adjacency is
 * dilutive, per SCORING-MODEL §4 -- a crammed, amenity-less city is a real,
 * reachable negative number, and null must never read as beating it). */
export function median(numbers) {
  if (numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * SCORING-MODEL §4B.2: median `perUnitWorth` across every RESIDENTIAL CELL
 * on the board -- read literally as per-CELL, not per-piece/building, since
 * `valueAt` genuinely varies cell to cell (each cell's own distance to
 * nearby pieces differs), and the checklist's own wording names cells
 * directly. A multi-cell building therefore casts one "vote" per cell it
 * occupies, an implicit weight by footprint size -- disclosed as a
 * judgement call in docs/DECISIONS-FOR-MARK.md #15, not hidden: the
 * alternative (one vote per building, weighted by `units(type)` instead of
 * raw cell count) is a real, different reading, and a large-footprint
 * building can still dominate a per-cell median somewhat the way a mean
 * lets one tower dominate -- a smaller effect, not the same failure mode,
 * but worth knowing plainly rather than assumed away.
 *
 * `null` when no residential cell exists at all -- see `median`'s own
 * comment for why this must not be 0.
 */
export function medianWealth(board, catalogue) {
  const catalogueOf = catalogue instanceof Map ? (id) => catalogue.get(id) : (id) => catalogue[id];
  const perUnitValues = [];
  for (const piece of board.pieces()) {
    const entry = catalogueOf(piece.typeId);
    if (entry.category !== "residential") continue;
    for (const { x, y } of cellsOf(board.rectFor(piece.id))) {
      perUnitValues.push(perUnitWorth(valueAt(board, catalogue, x, y), entry.unitQuality));
    }
  }
  return median(perUnitValues);
}

/** The one term §4B ships today. A term is `{ label, compute(board,
 * catalogue) => number|null }` -- registers itself into a registry rather
 * than being hard-coded into computeScore, per §4B.3's own requirement. */
export const MEDIAN_WEALTH_TERM = { label: "median wealth", compute: medianWealth };

/**
 * A fresh registry, empty of terms. Returns a NEW instance every call
 * (never a module-level singleton) specifically so a test can register a
 * throwaway term in isolation without leaking it into any other registry --
 * the mechanism the checklist's own gate test depends on.
 */
export function createCityScoreRegistry() {
  const terms = [];
  return {
    registerTerm(term) {
      terms.push(term);
    },
    /**
     * Every registered term's own `compute(board, catalogue)`, combined by
     * SUMMING the terms that returned real data (a term returning `null`
     * -- "no data for this term yet" -- is excluded from the sum rather
     * than poisoning it). `score` is `null` only when EVERY term has no
     * data, matching `median`'s own "no data is not zero" contract one
     * level up. Sum is this module's own choice, not specified by
     * SCORING-MODEL: correct today with exactly one term (score equals
     * that term's own value), and proven to compose correctly for a
     * second term by the checklist's own GATE test. NOT yet correct for
     * terms on genuinely different scales -- §4B.4's own amenity terms,
     * when they arrive, may need normalizing before a raw sum is
     * meaningful. Out of scope here; named so it is not lost.
     */
    computeScore(board, catalogue) {
      const breakdown = terms.map((term) => ({ label: term.label, value: term.compute(board, catalogue) }));
      const withData = breakdown.filter((t) => t.value !== null);
      const score = withData.length === 0 ? null : withData.reduce((sum, t) => sum + t.value, 0);
      return { score, terms: breakdown };
    },
  };
}

/** The registry as the live game actually ships it: median wealth, and
 * nothing else yet (§4B.4). */
export function defaultCityScoreRegistry() {
  const registry = createCityScoreRegistry();
  registry.registerTerm(MEDIAN_WEALTH_TERM);
  return registry;
}
