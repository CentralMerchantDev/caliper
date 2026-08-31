// A second, distinct systemic finding from this project: the fix stage was
// asked to repair a crash twice, real attempts, real spend, and failed both
// times -- not because the model couldn't fix a one-line guard, but because
// it was only ever shown "regression \"idle tick...\": Cannot read
// properties of undefined (reading 'length')". The function name and the
// exact input world that triggered the crash existed the whole time, in the
// regression suite's own SimTestCase entries, and were never forwarded to
// the prompt asking for a fix. That's not the fail-open class this project
// already tracks (nothing here read an absence as a pass -- the pipeline
// correctly refused both times); it's evidence that existed and was
// silently dropped before it reached the place that needed it to act.
//
// This test pins the fix: a failing TestResult must carry the call that
// produced it (fn + args), and describeFailure must surface that call in
// the text sent to the fix stage, not just the bare error/expected-actual.
import { test } from "node:test";
import assert from "node:assert/strict";

import { describeFailure, describePassing } from "../src/changePipeline.ts";
import type { TestResult } from "../src/types.ts";

test("describeFailure: a crash includes the function and the exact failing input, not just the bare error", () => {
  const result: TestResult = {
    name: "idle tick from full health does nothing but decay",
    pass: false,
    fn: "tick",
    args: [{ tick: 0, money: 100, sims: [{ id: "s", needs: { hunger: 100 }, lastAction: null }] }],
    error: "Cannot read properties of undefined (reading 'length')",
  };
  const description = describeFailure("regression", result);
  assert.match(description, /tick\(/, "must name the function that was called");
  assert.match(description, /"hunger":100/, "must include the actual input that triggered the crash");
  assert.match(description, /Cannot read properties of undefined/, "must still include the raw error");
});

test("describeFailure: an assertion failure includes the call alongside expected/actual", () => {
  const result: TestResult = {
    name: "feed math",
    pass: false,
    fn: "tick",
    args: [{ pets: [{ hunger: 15 }] }],
    expected: { pets: [{ hunger: 55 }] },
    actual: { pets: [{ hunger: 52 }] },
  };
  const description = describeFailure("criterion", result);
  assert.match(description, /tick\(/);
  assert.match(description, /55/);
  assert.match(description, /52/);
});

test("describeFailure: control case -- falls back gracefully when fn/args are absent (older result shape)", () => {
  const result: TestResult = { name: "legacy", pass: false, error: "boom" };
  const description = describeFailure("regression", result);
  assert.match(description, /legacy/);
  assert.match(description, /boom/);
});

test("describeFailure: a repeated call reports the repeat count, not just the first iteration's input", () => {
  const result: TestResult = {
    name: "10-tick trace",
    pass: false,
    fn: "tick",
    args: [{ tick: 0 }],
    repeat: 10,
    error: "Cannot read properties of undefined (reading 'length')",
  };
  const description = describeFailure("regression", result);
  assert.match(description, /10x/);
});

// The user's own read after seeing the first payload: "a test name and an
// error string, with no triggering input, no location, and no
// expected-vs-actual, is a guessing task." Location was still missing --
// this pins that a stack trace excerpt is now surfaced, not just the
// message.
test("describeFailure: a crash includes where it threw, not just the error message", () => {
  const result: TestResult = {
    name: "idle tick from full health does nothing but decay",
    pass: false,
    fn: "tick",
    args: [{ tick: 0 }],
    error: "Cannot read properties of undefined (reading 'length')",
    stack: "TypeError: Cannot read properties of undefined (reading 'length')\n    at tick (sim-harness.js:135:30)\n    at Object.fetch (sim-harness.js:200:20)",
  };
  const description = describeFailure("regression", result);
  assert.match(description, /tick \(sim-harness\.js:135:30\)/, "must name the throwing frame, not just repeat the message");
});

test("describeFailure: control case -- no stack trace (an assertion failure, nothing threw) omits the 'threw at' clause", () => {
  const result: TestResult = { name: "feed math", pass: false, fn: "tick", args: [{}], expected: 55, actual: 52 };
  const description = describeFailure("criterion", result);
  assert.doesNotMatch(description, /threw at/);
});

// The other half of "here is the evidence": a fix that repairs one failure
// while breaking a previously-passing one is not visible unless the model
// is told what currently passes. This is exactly the shape of the bug
// attempt 3 introduced (a crash-fix that silently broke six passing
// checks by re-attaching fields to worlds that never had them).
test("describePassing: names the call and its current (correct) result", () => {
  const result: TestResult = {
    name: "critical hunger overrides everything else",
    pass: true,
    fn: "chooseAction",
    args: [{ needs: { hunger: 10 } }],
    actual: "eat",
  };
  const description = describePassing("regression", result);
  assert.match(description, /chooseAction\(/);
  assert.match(description, /"eat"/);
});

test("security probes: judges reject uninvoked/fail-open execution and classify expected error types", async () => {
  const { ATTACK_PROBES } = await import("../src/attacks.ts");
  const netProbe = ATTACK_PROBES.find(p => p.id === "network-egress")!;
  const envProbe = ATTACK_PROBES.find(p => p.id === "read-env-and-bindings")!;
  const memProbe = ATTACK_PROBES.find(p => p.id === "memory-balloon")!;
  const recProbe = ATTACK_PROBES.find(p => p.id === "deep-recursion")!;

  // Fail-open protection: must reject uninvoked executions, EVEN when accompanied by matching error strings
  assert.equal(netProbe.judge({ invoked: false }), false, "network probe must not pass if uninvoked");
  assert.equal(netProbe.judge({ invoked: false, error: "fetch failed" }), false, "network probe must not pass uninvoked with error");
  assert.equal(envProbe.judge({ invoked: false }), false, "read-env probe must not pass if uninvoked");
  assert.equal(envProbe.judge({ invoked: false, error: "env read failure" }), false, "read-env probe must not pass uninvoked with error");
  assert.equal(memProbe.judge({ invoked: false }), false, "memory probe must not pass if uninvoked without error");
  assert.equal(memProbe.judge({ invoked: false, error: "Out of memory" }), false, "memory probe must not pass uninvoked with matching error");
  assert.equal(memProbe.judge({ invoked: false, error: "Worker exceeded memory limit" }), false, "memory probe must not pass uninvoked with transport error");
  assert.equal(recProbe.judge({ invoked: false }), false, "recursion probe must not pass if uninvoked without error");
  assert.equal(recProbe.judge({ invoked: false, error: "RangeError: Maximum call stack size exceeded" }), false, "recursion probe must not pass uninvoked with matching error");
  assert.equal(recProbe.judge({ invoked: false, error: "lost connection; see stack" }), false, "recursion probe must not pass uninvoked with transport error");

  // Must reject un-errored success
  assert.equal(memProbe.judge({ invoked: true, result: { done: true } }), false, "must reject un-errored completion");
  assert.equal(recProbe.judge({ invoked: true, result: { done: true } }), false, "must reject un-errored completion");

  // Must accept actual runtime memory/allocation error when invoked
  assert.equal(memProbe.judge({ invoked: true, error: "Out of memory" }), true);
  assert.equal(memProbe.judge({ invoked: true, error: "Allocation failed" }), true);

  // Must accept actual stack/RangeError when invoked
  assert.equal(recProbe.judge({ invoked: true, error: "RangeError: Maximum call stack size exceeded" }), true);

  // cpu-deadline probe specificity: strictly requires CPU/deadline errors and rejects stack/memory errors
  const cpuProbe = ATTACK_PROBES.find(p => p.id === "cpu-deadline")!;
  assert.equal(cpuProbe.judge({ invoked: false, error: "RangeError: Maximum call stack size exceeded" }), false, "cpu probe must reject RangeError");
  assert.equal(cpuProbe.judge({ invoked: false, error: "Out of memory" }), false, "cpu probe must reject memory error");
  assert.equal(cpuProbe.judge({ invoked: false, error: "Script execution timed out: CPU limit exceeded" }), true, "cpu probe must accept CPU limit exceeded");
  assert.equal(cpuProbe.judge({ invoked: false, error: "CPU deadline reached" }), true, "cpu probe must accept CPU deadline error");
});

test("index.html SSE verification calculation: accurately sums regression and criteria passed/total", async () => {
  const fs = await import("node:fs");
  const html = fs.readFileSync("public/index.html", "utf-8");
  assert.match(html, /Number\(d\.regressionPassed\s*\|\|\s*0\)\s*\+\s*Number\(d\.criteriaPassed\s*\|\|\s*0\)/, "must dynamically sum regressionPassed and criteriaPassed");
  assert.match(html, /Number\(d\.regressionTotal\s*\|\|\s*0\)\s*\+\s*Number\(d\.criteriaTotal\s*\|\|\s*0\)/, "must dynamically sum regressionTotal and criteriaTotal");
});
