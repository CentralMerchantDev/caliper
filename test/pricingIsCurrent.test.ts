// =============================================================================
// THE PRICES ARE ASSERTED, NOT ANNOTATED
//
// Every cost figure this project publishes -- the per-run ceilings, the daily
// cap, the benchmark's "36-41% of the cost per correct answer" -- is derived
// from PRICING in src/claude.ts. That table used to be governed by a COMMENT
// saying one row was introductory and would rise on 2026-09-01.
//
// Two ways that goes wrong, and one of them nearly happened:
//   * the price changes and nobody updates the table, so the ledger quietly
//     under-reports; or
//   * the price DOESN'T change, the comment is read as fact, and someone
//     helpfully "corrects" the table -- making every published figure 50% too
//     high. (Anthropic cancelled the increase; $2/$10 is now standard.)
//
// So the values are pinned here with the date they were checked. Changing a
// price now requires changing a test, which is a decision someone makes rather
// than a note someone misreads.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import { PRICING, MODELS } from "../src/claude";

/** Checked against Anthropic's published pricing page on this date. */
const CHECKED_ON = "2026-09-01";

const EXPECTED: Record<string, { input: number; output: number }> = {
  // $2/$10 is the STANDARD price. It was announced as introductory through
  // 2026-08-31, and the scheduled rise to $3/$15 was cancelled.
  "claude-sonnet-5": { input: 2.0, output: 10.0 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
  "claude-opus-4-8": { input: 5.0, output: 25.0 },
};

test(`published pricing matches what was verified on ${CHECKED_ON}`, () => {
  assert.deepEqual(PRICING, EXPECTED,
    "A price moved. Update EXPECTED and CHECKED_ON together, and re-derive " +
    "PER_RUN_CEILING_USD_* in controlLayer.ts -- the ceilings are arithmetic on these numbers.");
});

test("every model the benchmark runs has a price", () => {
  for (const m of MODELS) {
    assert.ok(PRICING[m], `${m} is benchmarked but has no PRICING row, so its cost would silently compute as NaN`);
  }
});
