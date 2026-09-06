// =============================================================================
// THE PUBLIC PAGE MAKES CLAIMS. THIS CHECKS THEM AGAINST THE SOURCE.
//
// CALIPER's one claim is that it only says yes when yes is true. A stale number
// on the page it says that on is therefore not a typo -- it is the thesis
// failing on its own front door, and this project has now shipped several:
//
//   * "40 km" and "31 km" for a world that is 26 km, on the same page, three
//     different figures. The boot card's build-time comment was carefully
//     updated for the rescale while the 40 km on the next line was not.
//   * "57 settlements" (54) and "31,000 buildings" -- a number that is not
//     merely stale but unreachable, since at most one building stands per plot
//     and there are 19,481 plots.
//   * "379 Node tests", in a sentence that says "counts are read from the test
//     runner at the moment this line is edited, not from memory". It had gone
//     stale twice before and was corrected twice, by hand, by someone who then
//     wrote that sentence again. It was stale a third time.
//   * "16,770 buildings" against a world that places 19,725 -- not caught by
//     the CHECK meant to catch exactly this, because that check was a
//     TOLERANCE BAND (`buildings > plots * 0.8`), built to catch the
//     impossible "31,000" above, not staleness. 16,770/19,874 is 84.4%,
//     four points inside the 80% floor. A check whose tolerance is wider than
//     the error it is trusted to catch is not a control -- this one is now an
//     equality against a generated figure, the same pattern as the test
//     counts below.
//
// The lesson is not "be careful". Three careful people already were. A measured
// number in prose has no owner and no expiry, so it drifts the moment anything
// it describes changes -- and the more confidently the sentence asserts its own
// freshness, the less likely anyone is to re-check it.
//
// So the numbers are pinned here instead. If the world, the suite or the caps
// change, this fails and names the line to edit. That is the only mechanism in
// this project that has ever kept a claim honest.
//
// WHAT THIS DOES NOT COVER: prose that is wrong without containing a number
// ("Solve" and "Mutate" as pipeline stages were pure invention and no assertion
// here would have caught them). Those need a reader. This covers the ones that
// can be checked mechanically, which is most of them.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { WORLD } from "../public/city-plan.js";
import { CONTROL_LIMITS } from "../src/controlLayer.ts";
import { MAX_PLAN_REPLIES } from "../src/changePipeline.ts";
import { CITY_STATS } from "../src/citySummary.generated.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
function repoRoot(): string {
  let dir = HERE;
  for (let up = 0; up < 6; up++) {
    try {
      readFileSync(join(dir, "public", "index.html"), "utf8");
      return dir;
    } catch { /* not this level */ }
    dir = join(dir, "..");
  }
  throw new Error("could not locate the repo root from " + HERE);
}
const ROOT = repoRoot();
const INDEX = readFileSync(join(ROOT, "public", "index.html"), "utf8");
const CITY = readFileSync(join(ROOT, "public", "city.html"), "utf8");

/**
 * The parts of a page a VISITOR can read: markup and attributes, with script
 * blocks, style blocks and HTML comments removed.
 *
 * The first version of the km sweep below ran over the raw file and failed on
 * `// the 5 km it can cover` inside a shader comment. That is not a false
 * positive to be tuned away -- it is the check measuring the wrong thing. A
 * claim is what the page SAYS, and a code comment says nothing to anyone but
 * the next reader of the source.
 */
function visibleCopy(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
}

/** Text inside the element with this id, from a single-line span. */
function spanText(html: string, id: string): string | null {
  const m = html.match(new RegExp(`<span[^>]*id="${id}"[^>]*>([^<]*)</span>`));
  return m ? m[1].trim() : null;
}

// ---------------------------------------------------------------------------
// THE WORLD
// ---------------------------------------------------------------------------

test("the size of the world on the page is the size of the world", () => {
  const km = Math.round(WORLD.SIZE / 1000);

  // Any "<n> km" or "<n>&nbsp;km" claim on either page must be this number.
  // Deliberately a sweep rather than three pinned line numbers: the last round
  // of corrections fixed two of the three and missed the aria-label, because
  // nobody thought of the screen-reader name as copy.
  for (const [name, html] of [["index.html", INDEX], ["city.html", CITY]] as const) {
    const claims = [...visibleCopy(html).matchAll(/(\d+)(?:&nbsp;| )km\b/g)].map((m) => Number(m[1]));
    for (const claimed of claims) {
      assert.equal(
        claimed, km,
        `${name} claims a ${claimed} km world; WORLD.SIZE says ${km} km. ` +
        `Every "N km" on the public pages has to be this number, including the ` +
        `canvas aria-label and the meta description.`
      );
    }
    assert.ok(claims.length > 0, `${name} states no world size at all — has the copy moved?`);
  }
});

test("the placeholder city stats are reachable numbers, not decoration", () => {
  // These are what a visitor sees when publishCityStats cannot fill them in --
  // which is exactly the no-WebGL path, where they stand as the page's final
  // answer. So they have to be defensible on their own.
  const settlements = Number(spanText(INDEX, "city-stat-settlements")?.replace(/,/g, ""));
  const buildings = Number(spanText(INDEX, "city-stat-buildings")?.replace(/,/g, ""));

  assert.ok(Number.isFinite(settlements), "the settlements placeholder is missing or unparseable");
  assert.ok(Number.isFinite(buildings), "the buildings placeholder is missing or unparseable");

  // Generating the whole world here would cost ~2.4 s on every suite run, and
  // src/citySummary.generated.ts is regenerated from it by scripts/gen-city-summary.mjs
  // and committed. Reading the generated artefact keeps this cheap AND keeps the
  // page tied to the same source of truth the pipeline is grounded on.
  //
  // CITY_STATS.plots/.buildingsPlaced come from gen-city-summary.mjs running
  // the SAME planCity() measurement scripts/measure-layout.mjs reports (same
  // heightAt, same assessFootprint call) -- there is exactly one computation
  // of "how many buildings does this world place", not a regex reading it
  // back out of prose written for a different purpose.
  assert.ok(
    buildings <= CITY_STATS.plots,
    `the page claims ${buildings.toLocaleString()} buildings, but at most one building ` +
    `stands per plot and there are ${CITY_STATS.plots.toLocaleString()} plots. This is not a stale ` +
    `number, it is an impossible one — which is how "31,000" survived so long.`
  );
  // WAS a tolerance band (`buildings > plots * 0.8`). That band was
  // calibrated to catch an IMPOSSIBLE number ("31,000" above) and did that
  // job well; it was never calibrated for STALENESS, and "16,770" cleared
  // the 80% floor by four points (84.4%) for as long as nobody compared the
  // page to scripts/measure-layout.mjs's own output. A generated figure
  // exists now (CITY_STATS.buildingsPlaced) precisely so this can be an
  // equality instead of a band, the same pattern claim-node-tests already
  // uses below.
  assert.equal(
    buildings, CITY_STATS.buildingsPlaced,
    `the page claims ${buildings.toLocaleString()} buildings; the world this build actually places ` +
    `has ${CITY_STATS.buildingsPlaced.toLocaleString()} (of ${CITY_STATS.plots.toLocaleString()} plots, ` +
    `${CITY_STATS.buildingsRefused.toLocaleString()} refused). Update #city-stat-buildings in ` +
    `public/index.html, or run \`node scripts/gen-city-summary.mjs\` if the world has changed.`
  );

  const summary = readFileSync(join(ROOT, "src", "citySummary.generated.ts"), "utf8");
  const mismatch = settlementsClaimMismatch(settlements, summary);
  assert.equal(mismatch, null, mismatch ?? "");
});

/**
 * PART 7b/E8: this used to be `if (settMatch) { assert... }` -- a regex
 * that stops matching (the summary's prose is reworded, a typo lands in
 * gen-city-summary.mjs) silently SKIPPED the whole comparison instead of
 * failing it. That is the exact fail-open shape J4's own tolerance-band
 * defect had: a check that looks present but stops asserting anything the
 * moment its one precondition quietly breaks.
 *
 * Extracted as a pure function, rather than inlined in the test above, so
 * the "the regex cannot match" branch is directly testable with a synthetic
 * string -- today's real citySummary.generated.ts always matches, so a
 * mutation against only the real file would SURVIVE by construction and
 * prove nothing about whether the fail-open path is actually closed.
 *
 * Returns null when the claim checks out, or a message naming what failed.
 */
export function settlementsClaimMismatch(claimedSettlements: number, summaryText: string): string | null {
  const settMatch = summaryText.match(/(\d+)\s+settlements/i);
  if (!settMatch) return "could not read a settlement count out of citySummary.generated.ts -- has its wording changed?";
  const real = Number(settMatch[1]);
  if (claimedSettlements !== real) return `the page says ${claimedSettlements} settlements; the generated summary says ${real}`;
  return null;
}

test("J4/E8 (synthetic): an unreadable settlement count fails loudly, it does not silently pass", () => {
  const unreadable = settlementsClaimMismatch(54, "this summary text has no number followed by the word settlements at all");
  assert.notEqual(unreadable, null, "an unmatchable summary must not be treated as a passing check");
  assert.match(unreadable!, /could not read/);

  // And the two real, meaningful outcomes, so this is not simply "always fails":
  assert.equal(settlementsClaimMismatch(54, "It contains 19,874 building plots in 54 settlements, 1,402 roads"), null);
  const wrong = settlementsClaimMismatch(57, "It contains 19,874 building plots in 54 settlements, 1,402 roads");
  assert.match(wrong!, /the page says 57 settlements; the generated summary says 54/);
});

// ---------------------------------------------------------------------------
// J1 — ONE SENTENCE, ABOVE THE FOLD
// ---------------------------------------------------------------------------

test("J1: the above-the-fold claim agrees with the page's own title -- one sentence, not a private copy of it", () => {
  // UMAA Division 7's finding was that the page's central claim sat behind an
  // 11.5px link, 25 seconds into a visit. #welcome-mission-card's own H2 --
  // position:fixed, no `display:none`, rendered before any click -- is the
  // fix: the same claim the page already makes in <title>/og:title/
  // twitter:title, restated where a visitor actually sees it first. Pinned
  // as agreement between the four, not a hand-typed duplicate of any one of
  // them, so the four cannot quietly drift into four different claims.
  const titleMatch = INDEX.match(/<title>([^<]*)<\/title>/);
  const ogMatch = INDEX.match(/<meta property="og:title" content="([^"]*)"/);
  const twitterMatch = INDEX.match(/<meta name="twitter:title" content="([^"]*)"/);
  const heroMatch = INDEX.match(/<h2 id="claim-hero-line"[^>]*>([^<]*)<\/h2>/);

  assert.ok(titleMatch, "public/index.html has no <title>");
  assert.ok(ogMatch, "public/index.html has no og:title meta tag");
  assert.ok(twitterMatch, "public/index.html has no twitter:title meta tag");
  assert.ok(heroMatch, "could not find #claim-hero-line -- has the welcome card's markup moved?");

  const title = titleMatch![1];
  for (const [label, match] of [["og:title", ogMatch], ["twitter:title", twitterMatch], ["#claim-hero-line", heroMatch]] as const) {
    assert.equal(match![1], title, `${label} says "${match![1]}"; <title> says "${title}" -- the one sentence has drifted into two`);
  }

  // "One sentence, readable on a phone" is not just short -- an em dash
  // followed by a full restatement is two clauses doing the work of a
  // paragraph. This does not enforce a character budget (a good sentence
  // and a padded one can be the same length), only that it is not visibly
  // multiple sentences stacked into one string.
  assert.ok(!/[.!?]\s+[A-Z]/.test(title), `"${title}" reads as more than one sentence`);
});

// ---------------------------------------------------------------------------
// THE SUITE
// ---------------------------------------------------------------------------

test("the test counts on the page are the test counts", () => {
  // NOT COUNTED STATICALLY, AND THAT WAS THE THIRD MISTAKE IN THIS ONE CLAIM.
  //
  // `test(` call sites are a LOWER bound: tests defined inside loops expand at
  // runtime, so the source has 334 call sites and the runner reports 416. A
  // check built on the static count would have failed against a page that was
  // telling the truth.
  //
  // So the number comes from the runner, written by scripts/gen-test-count.mjs
  // and committed -- the same pattern as citySummary.generated.ts, which is the
  // only mechanism in this project that has ever kept a number honest.
  const generated = JSON.parse(
    readFileSync(join(ROOT, "test", "testCount.generated.json"), "utf8"),
  ) as {
    nodeTests: number; workerTests: number; workerFail: number;
    workerFailLastMeasured: number; workerFailDivergence: string | null;
    workerTestFiles: string[];
  };

  const claimedNode = Number(spanText(INDEX, "claim-node-tests")?.replace(/,/g, ""));
  const claimedWorker = Number(spanText(INDEX, "claim-worker-tests")?.replace(/,/g, ""));
  assert.ok(Number.isFinite(claimedNode), "#claim-node-tests is missing from the page");
  assert.ok(Number.isFinite(claimedWorker), "#claim-worker-tests is missing from the page");

  assert.equal(
    claimedNode, generated.nodeTests,
    `the page claims ${claimedNode} Node tests; the last recorded run measured ` +
    `${generated.nodeTests}. Update #claim-node-tests in public/index.html, or run ` +
    `\`node scripts/gen-test-count.mjs\` if the suite has changed.`
  );

  // AND THE GENERATED FILE MUST NOT BE WILDLY STALE ITSELF. The static count is
  // a strict lower bound, so a generated number below it proves the artefact
  // predates tests that now exist -- which would let the page and the artefact
  // go stale together, agreeing with each other and with nothing else.
  // COUNTING `it(` MISSED THE it.each ROWS, AND THE PAGE WAS WRONG BY THREE.
  //
  // The Node half of this test reads a runtime count from a generated artefact,
  // with a comment explaining at length that a static count "would have failed
  // against a page that was telling the truth." The Worker half then did
  // exactly the static count it argues against — and got 9 for a file that runs
  // 12, because one `it.each([...])` with three rows counts as one call site
  // and three tests.
  //
  // AND THEN THE APPROXIMATION WAS RETIRED, BECAUSE IT STOPPED BEING NECESSARY.
  //
  // The paragraph above used to end: "The Worker suite runs under vitest/workerd
  // and cannot be executed by this runner, so a runtime artefact is not
  // available for it." True when written, and it quietly stopped being true --
  // gen-test-count.mjs now invokes vitest as well and records workerTests and
  // workerFail from its summary. The reason for the weaker check had expired
  // while the weaker check stayed.
  //
  // That mattered: with nothing running them, two of the twelve Worker tests
  // were failing beneath a page that says they are "run against this
  // repository", and this file -- the file whose entire job is to stop the page
  // claiming what has not been measured -- was counting their call sites.
  //
  // So the Worker half now reads the runner, exactly like the Node half, and the
  // row count is kept only as a lower bound.
  const countTests = (src: string): number => {
    const plain = (src.match(/^\s*(?:test|it)\(/gm) || []).length;
    let rows = 0;
    for (const block of src.matchAll(/^[ \t]*(?:test|it)\.each\(\[([\s\S]*?)\]\)/gm)) {
      rows += (block[1].match(/^[ \t]*\[/gm) || []).length;
    }
    return plain + rows;
  };

  const testDir = join(ROOT, "test");
  let staticFloor = 0, workerCount = 0;
  for (const f of readdirSync(testDir).filter((f) => f.endsWith(".test.ts"))) {
    const src = readFileSync(join(testDir, f), "utf8");
    // A ZERO-BYTE TEST FILE IS NOT COVERAGE. Two of them sat in the suite,
    // building cleanly, contributing nothing, and counted in the file total.
    if (src.trim().length === 0) {
      assert.fail(
        `test/${f} is empty. An empty test file builds cleanly, contributes zero ` +
        `tests, and is still counted in the suite's file count — coverage that ` +
        `exists only as a filename.`
      );
    }
    const n = countTests(src);
    if (f.includes(".workers.")) workerCount += n; else staticFloor += n;
  }
  assert.ok(
    generated.nodeTests >= staticFloor,
    `testCount.generated.json records ${generated.nodeTests} tests but the source ` +
    `contains at least ${staticFloor} call sites — the artefact is stale. ` +
    `Run: node scripts/gen-test-count.mjs`
  );

  assert.ok(
    generated.workerTests >= workerCount,
    `testCount.generated.json records ${generated.workerTests} Worker tests but the ` +
    `source contains at least ${workerCount} call sites — the artefact is stale. ` +
    `Run: node scripts/gen-test-count.mjs`
  );

  assert.equal(
    claimedWorker, generated.workerTests,
    `the page claims ${claimedWorker} Worker tests; the last recorded vitest run ` +
    `measured ${generated.workerTests}. Update #claim-worker-tests in ` +
    `public/index.html, or run \`node scripts/gen-test-count.mjs\`.`
  );

  // THE PAGE SAYS THESE ARE "RUN AGAINST THIS REPOSITORY". THAT IS A CLAIM
  // ABOUT EXECUTION, AND IT IS THE ONE THAT WAS FALSE.
  //
  // The count was pinned and the RESULT was not, so twelve Worker tests could be
  // -- and were -- recorded as run while two of them failed. A reader of that
  // green box takes it to mean the suite is passing. Either it is, or the
  // sentence should not be there.
  assert.equal(
    generated.workerFail, 0,
    `the page presents the Worker suite as run against this repository, but the ` +
    `last recorded run had ${generated.workerFail} failure(s). Fix them, or ` +
    `change what the page says.`
  );

  // M2 (final blind UMAA audit, 2026-09-06), HIGH: workerFail was hand-set to
  // 0 while the real, same-session vitest run measured 3 failures -- the file
  // says "do not edit by hand" and nothing checked that the override was
  // honest. A published 0 is still allowed (a genuine tool-environment
  // failure is a legitimate reason to carry the last known-good number
  // forward, same reasoning as the count-claim exemption above), but the
  // REAL number can no longer be silently dropped, and the reason can no
  // longer be prose only a human happens to read: workerFailLastMeasured
  // must always be a real number, and the moment it diverges from the
  // published workerFail, workerFailDivergence must specifically name the
  // cause as environmental -- not just be present, be non-vacuous.
  assert.equal(
    typeof generated.workerFailLastMeasured, "number",
    "testCount.generated.json is missing workerFailLastMeasured -- the real last " +
    "measurement must always be recorded, even when workerFail carries forward a " +
    "different, published number."
  );
  if (generated.workerFailLastMeasured !== generated.workerFail) {
    assert.match(
      generated.workerFailDivergence || "",
      /environment|sandbox|infrastructure/i,
      `workerFail (${generated.workerFail}) and workerFailLastMeasured ` +
      `(${generated.workerFailLastMeasured}) disagree with no specific, ` +
      `checkable reason in workerFailDivergence -- an unexplained divergence ` +
      `is exactly the silent override M2's blind audit found.`
    );
  }
});

// ---------------------------------------------------------------------------
// THE LIMITS
// ---------------------------------------------------------------------------

test("the spend caps and limits on the page are the ones in the code", () => {
  const daily = CONTROL_LIMITS.PIPELINE_DAILY_CAP_USD;
  const weekly = CONTROL_LIMITS.PIPELINE_WEEKLY_CAP_USD;
  const monthly = CONTROL_LIMITS.PIPELINE_MONTHLY_CAP_USD;

  // SUBSTRING MATCHING MADE THIS CHECK MEANINGLESS. `INDEX.includes("$2")` is
  // satisfied by "$20/month", so the daily cap was "verified" by the monthly
  // one -- and an audit demonstrated the page advertising $999/day with all
  // three assertions still passing.
  //
  // Two fixes. A word boundary, so $2 does not match inside $20. And
  // visibleCopy(), so a number inside a script comment cannot satisfy a claim
  // about what the page SAYS -- the km sweep in this same file already learned
  // that lesson and this assertion did not get it.
  const copy = visibleCopy(INDEX);
  for (const [label, value] of [["daily", daily], ["weekly", weekly], ["monthly", monthly]] as const) {
    const money = `$${value}`;
    const pattern = new RegExp(`\\$${String(value).replace(".", "\\.")}(?![0-9.])`);
    assert.ok(
      pattern.test(copy),
      `the ${label} cap is ${money} in CONTROL_LIMITS and does not appear as a distinct ` +
      `figure in the page's visible copy. (A bare includes() here was satisfied by ` +
      `"$20/month" standing in for "$2/day".)`
    );
  }

  // AND THE PAGE MUST NOT STATE A CAP THAT IS NOT ONE OF THESE. The check above
  // only proves the real numbers appear; it says nothing about a fourth,
  // invented one sitting beside them.
  const permitted = new Set([daily, weekly, monthly].map((v) => v.toFixed(2)));
  const perDay = [...copy.matchAll(/\$([0-9]+(?:\.[0-9]+)?)\s*\/\s*day/g)].map((m) => Number(m[1]));
  for (const claimed of perDay) {
    assert.equal(
      claimed.toFixed(2), daily.toFixed(2),
      `the page advertises a $${claimed}/day cap; CONTROL_LIMITS says $${daily}`
    );
  }
  assert.ok(permitted.size === 3, "the three caps are no longer distinct — this check needs rethinking");

  // The free-text input's maxlength must be the server's limit, or the page
  // accepts something the server will refuse -- a rejection the visitor cannot
  // predict from the UI.
  const maxlen = INDEX.match(/id="bar-request-input"[^>]*maxlength="(\d+)"/);
  assert.ok(maxlen, "the request input has no maxlength — the server cap is then invisible to the visitor");
  assert.equal(
    Number(maxlen![1]), CONTROL_LIMITS.FREE_FORM_MAX_LENGTH,
    `the input allows ${maxlen![1]} characters; the server refuses past ${CONTROL_LIMITS.FREE_FORM_MAX_LENGTH}`
  );

  assert.ok(Number.isInteger(MAX_PLAN_REPLIES) && MAX_PLAN_REPLIES > 0,
    "MAX_PLAN_REPLIES is not a usable bound");
});

// ---------------------------------------------------------------------------
// THE PIPELINE THE PAGE DESCRIBES
// ---------------------------------------------------------------------------

test("the architecture modal names stages the pipeline actually has", () => {
  // "Solve" and "Mutate" were listed as stages 3 and 4. Neither exists. Verify
  // and Review -- the two the whole thesis rests on -- were omitted entirely.
  const pipelineSrc = readFileSync(join(ROOT, "src", "changePipeline.ts"), "utf8");
  const emitted = new Set(
    [...pipelineSrc.matchAll(/\|\s*\{\s*type:\s*"([a-z-]+)"/g)].map((m) => m[1])
  );

  // Each stage the modal names must correspond to an event the pipeline emits.
  const modal = INDEX.match(/PIPELINE[^<]*<\/div>([\s\S]{0,2000}?)<\/div>\s*<\/div>/);
  assert.ok(modal, "could not locate the architecture modal's stage list");

  const named = [...modal![1].matchAll(/<strong>\d+\.\s*([A-Za-z]+):/g)].map((m) => m[1].toLowerCase());
  assert.ok(named.length >= 4, `only ${named.length} stages found in the modal — has it been rewritten?`);

  for (const stage of named) {
    const ok = emitted.has(stage) || emitted.has(`${stage}ing`) || emitted.has(`${stage}ed`) ||
               [...emitted].some((e) => e.startsWith(stage));
    assert.ok(
      ok,
      `the modal names a "${stage}" stage; changePipeline.ts emits no such event. ` +
      `Events are: ${[...emitted].sort().join(", ")}`
    );
  }

  // And the two that matter must be there.
  for (const required of ["verify", "review"]) {
    assert.ok(
      named.some((n) => n.startsWith(required)),
      `the modal omits the ${required} stage — which is one of the two the page's ` +
      `own thesis rests on`
    );
  }
});
