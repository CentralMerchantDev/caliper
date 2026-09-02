// =============================================================================
// THIS FILE WAS ZERO BYTES, AND WAS COUNTED AS COVERAGE
//
// `test/attacks.test.ts` existed, built cleanly, contributed no tests, and was
// counted in the runner's file total and in testCount.generated.json. So the
// suite reported a file's worth of coverage for src/attacks.ts — 5 KB of
// deliberate sandbox-escape probes, one of the four things in this project's
// failure floor — and there was nothing behind the filename.
//
// A test-suite audit found it by reading the directory rather than the report.
// publicClaims.test.ts now fails on any empty *.test.ts, so an empty file cannot
// quietly stand in for a test again.
//
// WHAT THIS FILE CAN AND CANNOT DO. The probes are only meaningful when EXECUTED
// inside a Dynamic Worker isolate, and that needs workerd — which this runner
// does not have. Asserting that they "would hold" without running them would be
// exactly the kind of coverage-shaped nothing this file replaced.
//
// So what is tested here is the part that IS decidable in Node: that each probe
// is well-formed, that its judge() is a real discriminator rather than a
// constant, and — the one that matters — that a judge cannot be satisfied by a
// probe that never ran. A probe suite where "the isolate refused to start"
// scores the same as "the sandbox held" is a suite that reports a pass for an
// outage, and that is the failure mode this project exists to refuse.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import { ATTACK_PROBES } from "../src/attacks.ts";

test("every probe is well-formed and describes what holding looks like", () => {
  assert.ok(ATTACK_PROBES.length >= 4, `only ${ATTACK_PROBES.length} probes — the suite has shrunk`);

  const ids = new Set<string>();
  for (const p of ATTACK_PROBES) {
    assert.ok(p.id && typeof p.id === "string", "a probe has no id");
    assert.ok(!ids.has(p.id), `duplicate probe id "${p.id}" — one would silently mask the other`);
    ids.add(p.id);

    assert.ok(p.description?.length > 10, `${p.id}: no usable description`);
    assert.ok(p.code?.trim().length > 0, `${p.id}: no code to run — an empty probe always "holds"`);
    assert.ok(
      p.expectedOutcome?.length > 10,
      `${p.id}: no stated expected outcome. A probe that does not say what holding ` +
      `looks like cannot be reviewed, only trusted.`
    );
    assert.equal(typeof p.judge, "function", `${p.id}: no judge`);
    // 15 s, not 5. The first version of this assertion capped at 5,000 and
    // failed memory-balloon, which uses 10,000 deliberately and says why:
    // "generous CPU budget so the CPU limit isn't what stops this -- the point
    // is to see the memory ceiling, not re-confirm the CPU one." The bound was
    // mine and arbitrary; the probe's number is reasoned. Checking that a
    // deadline EXISTS and is finite is the real property here.
    assert.ok(
      Number.isFinite(p.cpuMs) && p.cpuMs > 0 && p.cpuMs <= 15000,
      `${p.id}: cpuMs is ${p.cpuMs}, which is not a usable deadline`
    );
  }
});

test("no judge counts a probe that never ran as the sandbox holding", () => {
  // THE ONE THAT MATTERS. If a judge returns true for `{ invoked: false }`,
  // then an isolate that failed to start — a binding outage, a deploy without
  // LOADER, a platform error — scores identically to a sandbox that repelled a
  // real attack. /security-check would report green for an outage.
  const offenders: string[] = [];
  for (const p of ATTACK_PROBES) {
    if (p.judge({ invoked: false })) offenders.push(p.id);
    if (p.judge({ invoked: false, error: "isolate failed to start" })) {
      if (!offenders.includes(p.id)) offenders.push(p.id);
    }
  }
  assert.deepEqual(
    offenders, [],
    `these probes report the sandbox as holding when the probe never ran: ` +
    `${offenders.join(", ")}. That makes an outage indistinguishable from a defence.`
  );
});

test("every judge is a discriminator, not a constant", () => {
  // A judge that always returns true is a probe that can never fail; one that
  // always returns false is a probe that can never pass. Both are dead weight
  // being counted as a security control.
  //
  // Each probe is fed a spread of plausible outcomes. A real judge must not
  // answer the same way to all of them.
  // THE FIRST VERSION OF THIS FIXTURE WAS TOO NARROW AND OVER-REPORTED.
  //
  // It fed five outcomes, none of which was a memory or allocation error, so
  // memory-balloon's judge answered false to all of them and this test called
  // it "a constant wearing a predicate's costume". The judge is a real
  // discriminator; the fixture just never produced the input it discriminates
  // on. A test that declares a working control dead is worse than one that
  // misses a dead one, because it invites deleting the control.
  //
  // The spread now covers the error vocabulary every probe's judge actually
  // reads: network, CPU, memory, stack, and a clean return.
  const outcomes = [
    { invoked: true, result: { leaked: true } },
    { invoked: true, result: undefined },
    { invoked: true, error: "TypeError: fetch failed" },
    { invoked: true, error: "Script exceeded CPU time limit" },
    { invoked: true, error: "RangeError: Maximum call stack size exceeded" },
    { invoked: true, error: "Array buffer allocation failed: out of memory" },
    { invoked: false },
  ];

  for (const p of ATTACK_PROBES) {
    const verdicts = outcomes.map((o) => p.judge(o));
    const distinct = new Set(verdicts);
    assert.ok(
      distinct.size > 1,
      `${p.id}: judge() returned ${verdicts[0]} for every outcome shape, including ` +
      `"never ran", "threw" and "returned a leak". It is a constant wearing a ` +
      `predicate's costume, and it is counted as one of the sandbox's controls.`
    );
  }
});

test("a probe that leaks is judged as a failure, not a pass", () => {
  // The network probe's whole point is that fetch() must throw. If it RETURNS,
  // data left the isolate, and the judge must say so. This is the positive
  // control for the test above: it checks the direction of the discrimination,
  // not just that it discriminates.
  const network = ATTACK_PROBES.find((p) => p.id === "network-egress");
  assert.ok(network, "the network-egress probe is gone — that is the headline claim");

  assert.equal(
    network!.judge({ invoked: true, result: { leaked: true, status: 200 } }), false,
    "the network probe returned a live HTTP status and the judge called it a pass"
  );
  assert.equal(
    network!.judge({ invoked: true, error: "fetch is not defined" }), true,
    "the network probe threw — which is the sandbox holding — and the judge called it a failure"
  );
});
