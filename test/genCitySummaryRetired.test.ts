// =============================================================================
// U1 (CLI) -- docs/briefs/CLI-2026-09-15-overnight.md, docs/specs/REBUILD-CHECKLIST.md
//
// scripts/gen-city-summary.mjs imports public/city-plan.js, quarantined by
// e3c355b in the Phase 1 takedown and then DELETED OUTRIGHT by this run's own
// item zero (the _TO-DELETE/ purge). The import can no longer resolve at all,
// which means `node scripts/gen-city-summary.mjs` throws an uncaught
// module-resolution error -- and scripts/gen-claims.mjs calls it FIRST, with
// no try/catch, so that crash kills the whole `npm run gen:claims` pipeline
// before it ever reaches scripts/gen-test-count.mjs, the actually
// load-bearing, currently-enforced claim (the published test count).
//
// DECISION, per the brief's own instruction ("decide whether it is retired
// or re-pointed... do not restore anything from the deleted quarantine"):
// RETIRED, not re-pointed. The procedural 40km city (public/city-plan.js's
// generateWorld()) is gone, deliberately, and rebuilding an equivalent
// against the NEW area-board.js world is a real feature, not a maintenance
// fix -- out of scope here. test/generatedClaimsAreCurrent.test.ts's own
// P4.6 gate already treats src/citySummary.generated.ts as an accepted-stale
// snapshot while index.html is a holding page; this item does not need to
// (and, per the brief, must not) make that snapshot fresh again.
//
// The fix: the script recognizes its own dependency is gone and refuses
// CLEANLY -- exit 0, an informative message, no write -- rather than
// crashing with a raw stack trace. exit 0, not a nonzero refusal code,
// because gen-claims.mjs calls it via execFileSync with no try/catch: a
// nonzero exit would ALSO kill the pipeline before gen-test-count.mjs runs,
// the exact defect this item exists to fix.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
function repoRoot(): string {
  let dir = HERE;
  for (let up = 0; up < 6; up++) {
    try { readFileSync(join(dir, "CLAUDE.md"), "utf8"); return dir; } catch { /* keep walking */ }
    dir = join(dir, "..");
  }
  throw new Error("could not locate the repo root");
}
const ROOT = repoRoot();
const SCRIPT = join(ROOT, "scripts", "gen-city-summary.mjs");
const CITY_SUMMARY_PATH = join(ROOT, "src", "citySummary.generated.ts");

function run(args: string[] = []) {
  // spawnSync, not execFileSync: execFileSync only returns stdout on a
  // SUCCESSFUL (0) exit -- the child's stderr goes to this process's own
  // stderr instead of being captured, which would silently lose the
  // retirement message this test exists to check, on exactly the exit code
  // (0) that message is printed on.
  const result = spawnSync("node", [SCRIPT, ...args], { cwd: ROOT, encoding: "utf8", timeout: 15000 });
  return { code: result.status ?? -1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

test("sanity: public/city-plan.js is genuinely absent -- this test's whole premise, not assumed", () => {
  assert.equal(existsSync(join(ROOT, "public", "city-plan.js")), false, "if city-plan.js exists again, this item's own decision (retire, not re-point) needs re-checking, not this test loosened");
});

test("GATE (U1): gen-city-summary.mjs exits 0 (not a crash) when its dependency is gone, so gen-claims.mjs's un-caught execFileSync call does not abort the whole pipeline", () => {
  const { code, stderr } = run();
  assert.equal(code, 0, `expected a clean exit, got code ${code}, stderr:\n${stderr}`);
});

test("GATE (U1): the refusal is INFORMATIVE, not a raw stack trace -- names city-plan.js and that this is a deliberate retirement, not a crash", () => {
  const { stderr, stdout } = run();
  const output = stderr + stdout;
  assert.match(output, /city-plan\.js/i);
  assert.doesNotMatch(output, /at Object\.<anonymous>|ERR_MODULE_NOT_FOUND stack/, "the message must be a deliberate refusal, not a passed-through Node stack trace");
});

test("GATE (U1): the retired script does NOT write src/citySummary.generated.ts -- the last real snapshot stays exactly as committed, not silently truncated or corrupted", () => {
  const before = readFileSync(CITY_SUMMARY_PATH, "utf8");
  run();
  const after = readFileSync(CITY_SUMMARY_PATH, "utf8");
  assert.equal(before, after);
});

test("GATE (U1): gen-claims.mjs REACHES gen-test-count.mjs -- gen-city-summary.mjs's own retirement does not crash the pipeline before it gets there", () => {
  // SCOPE, narrowed deliberately from an earlier version of this test: this
  // checks REACHABILITY (did the pipeline get past gen-city-summary.mjs
  // without crashing), not full completion of the whole suite gen-test-count.mjs
  // itself runs. Measured directly, twice: a full run takes ~600s clean and
  // did not finish inside 1200s under this machine's own current
  // contention (a second, unrelated Claude session sharing it, confirmed
  // by process inspection -- the same class of problem U2/U3 exist to fix,
  // not this item's to solve by out-waiting it in an automated test with a
  // bounded timeout). Full end-to-end completion of `npm run gen:claims`
  // was verified separately, once, by hand, with no test-imposed timeout
  // (see this item's own commit message for the real measured numbers) --
  // that is the brief's own literal gate; THIS test is the fast, reliable,
  // repeatable regression check that composes with it.
  //
  // 60s is generous for what this actually needs: gen-city-summary.mjs's
  // retirement is near-instant, and gen-test-count.mjs prints its own
  // opening line before it starts the (possibly slow) suite run inside it.
  const CLAIMS_SCRIPT = join(ROOT, "scripts", "gen-claims.mjs");
  // spawnSync, not execFileSync -- gen-claims.mjs spawns its own children
  // with stdio: "inherit", so a crash inside one of them (the exact failure
  // mode this gate exists to catch) surfaces on gen-claims.mjs's own
  // stderr, which execFileSync only captures on a NONZERO exit. This test
  // needs stderr on every outcome to actually prove the crash is gone, not
  // just that stdout looks fine.
  const result = spawnSync("node", [CLAIMS_SCRIPT], { cwd: ROOT, encoding: "utf8", timeout: 60000 });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  // A timeout-kill (signal === "SIGTERM") is EXPECTED here -- reaching
  // gen-test-count.mjs is what's asserted, not it finishing within 60s.
  // What would NOT be expected: a genuine crash (signal null, code !== 0,
  // no timeout) before ever reaching gen-test-count.mjs at all.
  assert.match(stdout, /Regenerating test\/testCount\.generated\.json/, `gen-claims.mjs never reached gen-test-count.mjs within 60s -- signal ${result.signal}, code ${result.status}, stdout:\n${stdout}\nstderr:\n${stderr}`);
  assert.doesNotMatch(stderr, /ERR_MODULE_NOT_FOUND/, `gen-city-summary.mjs must not crash the pipeline with an unresolved import -- stderr:\n${stderr}`);
});
