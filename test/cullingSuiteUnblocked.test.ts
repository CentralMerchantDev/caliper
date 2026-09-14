// =============================================================================
// U2 (CLI) -- docs/briefs/CLI-2026-09-15-overnight.md, docs/specs/REBUILD-CHECKLIST.md
//
// test/cullingRatio.test.ts, test/regressionGate.test.ts's A5.2/A5.3, and
// test/envLuminance.test.ts all load public/city.html in a headless browser
// and wait on `window.__ready === true`. That page was quarantined in the
// Phase 1 takedown (e3c355b) and DELETED OUTRIGHT by this run's own item
// zero purge -- page.goto() against it 404s, __ready is never set, and each
// test hung its own full 240s page.waitForFunction timeout, every run.
// Confirmed directly: a chrome-headless-shell.exe child was still alive
// with its parent node process's CPU flat well past 30 minutes.
//
// DECISION, per the checklist's own instruction ("either fix the wait
// condition, or quarantine it out of the default suite with its reason
// recorded and a named owner"): QUARANTINED, not fixed. There is currently
// no live, correct rendered scene in public/ these tests COULD point to
// instead -- BLD's own look-proof-scene.html exists only on codex-lane, not
// merged here (the same "nothing real to re-point at yet" shape as U1's own
// decision for gen-city-summary.mjs). All three tests are annotated with
// node:test's own `{ skip: "..." }`, the same mechanism
// test/generatedClaimsAreCurrent.test.ts's P4.6 gate already uses for its
// own holding-page exemption -- excluded from execution, but still counted
// in the runner's own `ℹ tests` / `ℹ skipped` line, which is the evidence
// this item's own gate asks for.
//
// This file is the regression lock: it does not re-test culling, HDRI or
// the regression gate's own subject (there is nothing real to test right
// now) -- it proves the SUITE ITSELF no longer hangs on these three files,
// which is the actual, measurable property U2 exists to restore.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
const RUNNER = join(ROOT, "test", "run.mjs");

test("sanity: public/city.html is genuinely absent -- this item's whole premise, not assumed", () => {
  assert.equal(existsSync(join(ROOT, "public", "city.html")), false, "if city.html exists again, U2's own decision (quarantine, not fix) needs re-checking, not this test loosened");
});

test("GATE (U2): cullingRatio.test.ts, regressionGate.test.ts and envLuminance.test.ts together complete in well under their own 240s waitForFunction timeout -- the suite no longer hangs on them", () => {
  // 60s: generous headroom over the ~20ms these three files actually took
  // once quarantined, and a small fraction of the 240s EACH would have hung
  // for individually (720s combined) before this fix -- if this ever times
  // out, the quarantine itself has regressed, not merely gotten slow.
  const result = spawnSync(
    "node",
    [RUNNER, "cullingRatio.test.ts", "regressionGate.test.ts", "envLuminance.test.ts"],
    { cwd: ROOT, encoding: "utf8", timeout: 60000 },
  );
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  assert.equal(result.signal, null, `the suite was killed by this test's own 60s timeout (signal ${result.signal}) -- one of the three files is hanging again. stdout:\n${stdout}\nstderr:\n${stderr}`);
  assert.equal(result.status, 0, `the suite exited non-zero -- stdout:\n${stdout}\nstderr:\n${stderr}`);
  // Evidence per this item's own gate wording: the runner's own summary
  // line, not just "the process returned 0".
  assert.match(stdout, /ℹ skipped 3/, `expected exactly 3 skipped tests (the three quarantined ones), got:\n${stdout}`);
});

test("GATE (U2): all three quarantines name city.html as the cause, so a future reader (or an automated unblock check) can find them by grepping for it, not by memory", () => {
  const files = ["cullingRatio.test.ts", "regressionGate.test.ts", "envLuminance.test.ts"];
  for (const f of files) {
    const src = readFileSync(join(ROOT, "test", f), "utf8");
    assert.match(src, /skip:\s*"QUARANTINED \(U2,/, `${f} is missing its U2 quarantine annotation`);
    assert.match(src, /city\.html no longer exists/, `${f}'s quarantine reason must name city.html directly`);
  }
});
