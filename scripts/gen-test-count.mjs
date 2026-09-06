// GENERATES test/testCount.generated.json
//
// The public page claims a number of tests. That claim went stale three times
// in a row, each time inside a sentence asserting it had been read from the
// runner -- because it had been, once, by a person, and then the suite grew.
//
// It cannot be counted statically: `test(` call sites are a LOWER bound, since
// tests defined inside loops expand at runtime (334 call sites, 416 tests). So
// the only honest source is the runner itself, and the only way to keep a
// number honest in this project has been to generate it.
//
// Same pattern as scripts/gen-city-summary.mjs: run the real thing, write the
// result, commit it, and let a test compare the page against it.
//
//   node scripts/gen-test-count.mjs
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let out = "";
try {
  out = execFileSync(process.execPath, [join(ROOT, "test", "run.mjs")], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: process.env,
  });
} catch (e) {
  // A failing suite still prints its totals, and we want them: the point is to
  // record what the runner observed, not to require a green run.
  out = String(e.stdout || "");
  if (!out) {
    console.error("the suite produced no output at all -- refusing to write a count");
    process.exit(1);
  }
}

// node:test's summary line is prefixed "# " under the tap reporter and "ℹ "
// under the spec reporter -- which one runs is Node-version-dependent, not
// something this script controls, so both are accepted rather than pinning
// to whichever one happened to be running when this was last touched.
const num = (label) => {
  const m = out.match(new RegExp(`^(?:#|\\u2139) ${label} (\\d+)$`, "m"));
  return m ? Number(m[1]) : null;
};

const tests = num("tests");
const pass = num("pass");
const fail = num("fail");
const filesMatch = out.match(/^# test files: (\d+)$/m);

if (tests === null || pass === null || fail === null) {
  console.error("could not read '# tests' / '# pass' / '# fail' from the runner output.");
  console.error("Refusing to write a count that was not measured.");
  process.exit(1);
}

// THE WORKER SUITE WAS EXEMPTED FROM THE RULE THIS FILE EXISTS TO ENFORCE.
//
// This said: "The 9 Cloudflare Worker tests run under vitest against workerd,
// not under this runner, so they are counted separately and by hand-checked
// file inspection." Every word of that is the practice this script was written
// to replace, and it went wrong in exactly the predicted way -- the comment
// said 9, the page said 12, and the page was right by luck rather than by
// measurement. Meanwhile the page's sentence reads "run against this
// repository", which is a claim about EXECUTION, and nothing here executed
// them. Two of the twelve were failing while that sentence was live.
//
// vitest runs under a different runner, which is a reason to invoke it
// differently, not a reason to take its numbers on trust.
let vout = "";
try {
  vout = execFileSync(process.execPath, [join(ROOT, "node_modules", "vitest", "vitest.mjs"), "run"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: process.env,
  });
} catch (e) {
  vout = String(e.stdout || "") + String(e.stderr || "");
}
// vitest colours its summary, so strip the escapes before matching.
const vplain = vout.replace(/\[[0-9;]*m/g, "");
const vline = vplain.match(/^\s*Tests\s+(.*?)\((\d+)\)\s*$/m);
if (!vline) {
  console.error("could not read vitest's '  Tests ... (N)' summary line.");
  console.error("Refusing to write a worker count that was not measured.");
  process.exit(1);
}
const workerTests = Number(vline[2]);
const workerFail = Number((vline[1].match(/(\d+)\s+failed/) || [, 0])[1]);
const workerFiles = [...vplain.matchAll(/^\s*[✓×❯]\s+(\S+\.workers\.test\.ts)\s/gm)].map((m) => m[1].replace(/^test\//, ""));

// M2 (final blind UMAA audit, 2026-09-06), HIGH: this file is generated,
// "do not edit by hand" -- and got hand-edited anyway, to record workerFail
// as 0 when the last real vitest run this session measured 3, because the
// tool itself could not run cleanly here (a sandbox limitation, not a code
// regression -- see docs/UMAA-CALIPER.md). The prose explaining that lived
// only in `_comment`, so nothing checked it was honest, and test/
// publicClaims.test.ts's own workerFail===0 assertion passed for a reason
// that had nothing to do with the suite actually passing.
//
// workerFailLastMeasured always carries the REAL number this run (or the
// last hand-recorded one) actually found -- it can diverge from workerFail
// (the number the PAGE is allowed to claim) only when workerFailDivergence
// is a real, specific reason, checked by test/publicClaims.test.ts. A tool
// run always writes them equal; only a hand-edit under a genuine tool
// failure can make them differ, and it can no longer do so silently.
const payload = {
  _comment:
    "GENERATED by scripts/gen-test-count.mjs -- do not edit by hand. " +
    "The public page's test-count claim is checked against this by test/publicClaims.test.ts. " +
    "Regenerate after adding or removing tests.",
  nodeTests: tests,
  nodePass: pass,
  nodeFail: fail,
  nodeTestFiles: filesMatch ? Number(filesMatch[1]) : null,
  workerTests,
  workerFail,
  workerFailLastMeasured: workerFail,
  workerFailDivergence: null,
  workerTestFiles: workerFiles,
  generatedAt: new Date().toISOString().slice(0, 10),
};

const target = join(ROOT, "test", "testCount.generated.json");
writeFileSync(target, JSON.stringify(payload, null, 2) + "\n");
console.log(
  `wrote test/testCount.generated.json: ${tests} node tests (${fail} fail), ` +
    `${workerTests} worker tests (${workerFail} fail)`,
);

// =============================================================================
// AND WRITE THE PAGE, WHICH IS THE HALF THAT KEPT GETTING FORGOTTEN
//
// This script recorded the measurement and stopped. The claim on the public page
// -- the thing publicClaims.test.ts actually guards -- was left to a human, and
// the failure message even says so: "Update #claim-node-tests in
// public/index.html, or run gen-test-count.mjs". Running it did not update the
// page, so it always took two steps and the second one was remembered by nobody.
//
// The result is a test that fails one run LATE, every time: you add tests, the
// suite goes green against the old recorded count, you regenerate, and the NEXT
// run is red for a reason that has nothing to do with what you were working on.
// That happened three times in one afternoon, and index.html's own copy already
// says this sentence "has now gone stale three times in a row while claiming it
// was read from the runner".
//
// A number that is measured in one file and asserted in another needs exactly
// one writer. This is it.
// =============================================================================
// A COUNT FROM A RED RUN IS NOT A VERIFICATION CLAIM.
//
// This script updated the page on a run that reported "(1 fail)", so the public
// sentence "Continuous Verification: 644 Node tests ... run against this
// repository" was published from a suite that was failing. The number was even
// correct. That is not the point: the sentence claims the tests PASS, and a
// script that writes it while they do not is manufacturing the exact kind of
// green-looking evidence this project exists to argue against -- and it was
// written, an hour earlier, to fix a different honesty defect in the same line.
//
// The record still gets written, because nodeFail is a measurement and hiding it
// would be worse. The PAGE does not, and the non-zero exit means a script run in
// a chain stops there rather than carrying on to a deploy.
// ...WITH ONE EXEMPTION, BECAUSE THE FIRST VERSION DEADLOCKED.
//
// The guard above was written, correctly, to stop a count being published from
// a red run. Then the suite went red for exactly one reason -- the page said
// 644 and the runner measured 645 -- and the only tool that can fix that is
// this one, which now refused to run because the suite was red. The recovery
// path for a stale count ran through a gate that a stale count held shut.
//
// So the guard distinguishes the two cases it could not tell apart before:
//
//   red for some OTHER reason   the claim would be false -> refuse, as before
//   red ONLY because the page   the claim is stale, this script's whole job,
//   disagrees with the runner   and updating it makes the suite green -> do it
//
// This is narrow on purpose. It matches ONE test by its exact name, and only
// when it is the sole failure. An exemption is how a guard grows a hole, and
// the way this one stays honest is that it cannot fire while anything else is
// wrong -- if a second test is failing, the count stays unpublished.
const COUNT_CLAIM_TEST = "the test counts on the page are the test counts";
// "✖ failing tests:" is the SUMMARY HEADER, not a test. The first version of
// this matched it too, so `every(name === COUNT_CLAIM_TEST)` was false on every
// possible run and the exemption below could never fire -- a guard that cannot
// trigger, which is the same defect as a test that cannot fail. Found by running
// the regex against the runner's real output instead of assuming its shape.
const failingNames = [...out.matchAll(/^(?:not ok \d+ - |✖ )(.+?)(?: \(\d|$)/gm)]
  .map((m) => m[1].trim())
  .filter((n) => n !== "failing tests:");
const onlyTheCountClaim =
  fail === 1 && workerFail === 0 &&
  failingNames.length > 0 &&
  failingNames.every((n) => n === COUNT_CLAIM_TEST);

if ((fail > 0 || workerFail > 0) && !onlyTheCountClaim) {
  console.error(
    `\n### NOT updating public/index.html: ${fail} node and ${workerFail} worker tests FAILED.\n` +
    "### The count was recorded, because a failure is a measurement. The public\n" +
    "### claim was not, because it says the suite passes. Fix the suite, then\n" +
    "### run this again.\n" +
    (failingNames.length ? "### failing: " + failingNames.join("; ") + "\n" : ""),
  );
  process.exit(1);
}
if (onlyTheCountClaim) {
  console.log(
    `the only failure is "${COUNT_CLAIM_TEST}" -- that is the staleness this ` +
    "script exists to fix, so the page is being updated and the suite should go green.",
  );
}

const page = join(ROOT, "public", "index.html");
let html = readFileSync(page, "utf8");
const before = html;
const claims = [
  ["claim-node-tests", tests],
  ["claim-worker-tests", workerTests],
];
const missing = [];
for (const [id, value] of claims) {
  // Anchored on the id, and it must already contain a number -- so if the markup
  // is restructured this reports it rather than silently writing nothing and
  // leaving the page stale, which is the failure mode it exists to end.
  const re = new RegExp(`(<span id="${id}">)\\d+(</span>)`);
  if (!re.test(html)) { missing.push(id); continue; }
  html = html.replace(re, `$1${value}$2`);
}
if (missing.length) {
  console.error(
    `\n### could not find ${missing.join(" or ")} in public/index.html.\n` +
    "### The count was recorded but the PAGE was not updated, which is exactly\n" +
    "### the stale claim publicClaims.test.ts will fail on. Fix the markup or\n" +
    "### this script -- do not just edit the number by hand.",
  );
  process.exit(1);
}
if (html !== before) {
  writeFileSync(page, html);
  console.log(`updated public/index.html: ${tests} node tests, ${workerTests} worker tests`);
} else {
  console.log("public/index.html already agreed with the measurement");
}
