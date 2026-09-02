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
  const summary = readFileSync(join(ROOT, "src", "citySummary.generated.ts"), "utf8");
  // "building plots", not "plots" -- the summary lists every settlement's own
  // plot count too, and a bare /plots/ match grabbed downtown's 1,374 and then
  // reported the page's correct figure as impossible. A regex that matches the
  // wrong occurrence fails loudly here, but the same mistake in a threshold
  // would have passed quietly.
  const plotMatch = summary.match(/([\d,]+)\s+building plots/i);
  assert.ok(plotMatch, "could not read the total plot count out of citySummary.generated.ts");
  const plots = Number(plotMatch![1].replace(/,/g, ""));

  assert.ok(
    buildings <= plots,
    `the page claims ${buildings.toLocaleString()} buildings, but at most one building ` +
    `stands per plot and there are ${plots.toLocaleString()} plots. This is not a stale ` +
    `number, it is an impossible one — which is how "31,000" survived so long.`
  );
  assert.ok(
    buildings > plots * 0.8,
    `the page claims only ${buildings.toLocaleString()} buildings against ${plots.toLocaleString()} plots; ` +
    `if the world really lost that many, say so deliberately rather than leaving a stale figure`
  );

  const settMatch = summary.match(/(\d+)\s+settlements/i);
  if (settMatch) {
    assert.equal(
      settlements, Number(settMatch[1]),
      `the page says ${settlements} settlements; the generated summary says ${settMatch[1]}`
    );
  }
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
  ) as { nodeTests: number; workerTestFiles: string[] };

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
  const testDir = join(ROOT, "test");
  let staticFloor = 0, workerCount = 0;
  for (const f of readdirSync(testDir).filter((f) => f.endsWith(".test.ts"))) {
    const n = (readFileSync(join(testDir, f), "utf8").match(/^\s*(?:test|it)\(/gm) || []).length;
    if (f.includes(".workers.")) workerCount += n; else staticFloor += n;
  }
  assert.ok(
    generated.nodeTests >= staticFloor,
    `testCount.generated.json records ${generated.nodeTests} tests but the source ` +
    `contains at least ${staticFloor} call sites — the artefact is stale. ` +
    `Run: node scripts/gen-test-count.mjs`
  );

  assert.equal(
    claimedWorker, workerCount,
    `the page claims ${claimedWorker} Worker tests; test/*.workers.test.ts contains ${workerCount}`
  );
});

// ---------------------------------------------------------------------------
// THE LIMITS
// ---------------------------------------------------------------------------

test("the spend caps and limits on the page are the ones in the code", () => {
  const daily = CONTROL_LIMITS.PIPELINE_DAILY_CAP_USD;
  const weekly = CONTROL_LIMITS.PIPELINE_WEEKLY_CAP_USD;
  const monthly = CONTROL_LIMITS.PIPELINE_MONTHLY_CAP_USD;

  for (const [label, value] of [["daily", daily], ["weekly", weekly], ["monthly", monthly]] as const) {
    const money = `$${value}`;
    assert.ok(
      INDEX.includes(money) || INDEX.includes(`$${value.toFixed(2)}`),
      `the ${label} cap is ${money} in CONTROL_LIMITS and does not appear on the page`
    );
  }

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
