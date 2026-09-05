// I5 SECURITY FIX (Finding 1, HIGH, docs/audits/UMAA-I5-L-J4.md) -- THE MODEL'S
// OWN RESPONSE NEVER RUNS IN THE PROCESS THAT HOLDS THE API KEY.
//
// A blind audit found scripts/supervised-generate.mjs ran a real model's
// response through `new Function` in the SAME process that had just read
// process.env.ANTHROPIC_API_KEY, defended only by public/model-forge.js's
// own scanSource() denylist -- which its own comment already says is not
// real protection, and which the audit demonstrated a working bypass of
// (a standard JS unicode-escaped identifier: `process` parses as the
// identifier `process` but never contains the literal substring "process").
//
// THIS TEST DOES NOT CLAIM THE DENYLIST IS FIXED. It is not, and cannot be,
// by adding more substrings to check for -- that is exactly the arms race
// the project's own comment already names as a losing one. What changed is
// architectural: verifyUntrustedGeometry() spawns a CHILD process with an
// ALLOWLISTED environment (PATH/SystemRoot/windir/TEMP/TMP only) that never
// had ANTHROPIC_API_KEY in it at all. So the bypass still executes -- proven
// below, using the audit's own exact technique -- and still finds nothing to
// steal, because the secret was never there.

import { test } from "node:test";
import assert from "node:assert/strict";

import { verifyUntrustedGeometry } from "../scripts/verify-untrusted-geometry-caller.mjs";

test("I5 security: a genuinely valid geometry response verifies correctly through the child process", () => {
  process.env.ANTHROPIC_API_KEY = "sk-test-fixture-not-a-real-key";
  try {
    const verdict = verifyUntrustedGeometry("(T) => new T.BoxGeometry(2.5, 3, 2.5)", { w: 3, d: 3 });
    assert.equal(verdict.ok, true, JSON.stringify(verdict));
    assert.equal(verdict.measured.triangles, 12);
    assert.equal(verdict.geometry, undefined, "the live THREE geometry object crossed the process boundary -- it cannot, and should not need to, since this script never applies or persists a model");
  } finally {
    delete process.env.ANTHROPIC_API_KEY;
  }
});

test("I5 security: geometry that ignores the requested footprint still fails verification through the child process", () => {
  process.env.ANTHROPIC_API_KEY = "sk-test-fixture-not-a-real-key";
  try {
    const verdict = verifyUntrustedGeometry("(T) => new T.BoxGeometry(40, 3, 40)", { w: 3, d: 3 });
    assert.equal(verdict.ok, false);
    assert.equal(verdict.stage, "footprint");
  } finally {
    delete process.env.ANTHROPIC_API_KEY;
  }
});

// THE ACTUAL SECURITY PROPERTY: run the audit's own demonstrated exploit
// (the unicode-escape bypass) and prove it EXECUTES (the denylist is not
// fixed -- claiming otherwise would be lying about what this fix does) but
// finds nothing, using a real child process and a real environment
// variable named exactly like the real secret. Reports what it found via
// a thrown Error's own message -- the one string channel available without
// needing any Node API (like `require`) that a real Worker isolate would
// not grant either.
test("I5 security: the audit's own unicode-escape exploit executes (the denylist is NOT fixed) but the child process has no secret to steal", () => {
  process.env.ANTHROPIC_API_KEY = "sk-demo-secret-DO-NOT-LEAK";
  try {
    // process parses as the identifier `process` but the source string
    // handed to scanSource() never contains the literal substring "process".
    const maliciousSource =
      `(T) => { const p = \\u0070rocess; ` +
      `throw new Error("EXFILTRATED:" + JSON.stringify(p.env.ANTHROPIC_API_KEY)); }`;
    assert.equal(maliciousSource.includes("process"), false, "test setup is wrong -- the payload must not contain the literal denylisted substring");

    const verdict = verifyUntrustedGeometry(maliciousSource, { w: 1, d: 1 });
    // The bypass DOES execute and DOES reach `p.env` -- ok:false at the
    // "build" stage (the builder threw) is the honest, expected outcome:
    // the exploit ran, exactly as the audit found. Asserting it never ran
    // at all would be lying about what this fix does.
    assert.equal(verdict.ok, false);
    assert.equal(verdict.stage, "build", `expected the payload to run and throw from inside the builder; got: ${JSON.stringify(verdict)}`);
    assert.match(verdict.reason, /EXFILTRATED:/, "the payload never reached process.env at all -- re-check the bypass still works before trusting this test");

    // The payload REACHED process.env.ANTHROPIC_API_KEY -- and found nothing,
    // because the child's own environment never had it. JSON.stringify(undefined)
    // is not itself valid JSON (it coerces to the literal word "undefined"
    // once concatenated into the message string), so this compares the raw
    // string directly rather than parsing it.
    const leaked = verdict.reason.split("EXFILTRATED:")[1];
    assert.equal(leaked, "undefined", `the child process leaked a real value for ANTHROPIC_API_KEY: ${leaked}`);
  } finally {
    delete process.env.ANTHROPIC_API_KEY;
  }
});

// THE PART THAT WOULD MATTER MOST IF `require` HAD BEEN AVAILABLE: even a
// payload that successfully reads process.env finds no secret, because the
// child's OWN environment never had one. Verified directly against the
// actual spawn call's environment construction, not against application
// logic that merely claims to filter it.
test("I5 security: the child process environment genuinely does not include ANTHROPIC_API_KEY, verified via a real spawned process reading its own env", () => {
  process.env.ANTHROPIC_API_KEY = "sk-demo-secret-DO-NOT-LEAK";
  try {
    // A source that reports back the CHILD's own process.env keys via the
    // verdict's own error-reason channel (the only string round-trip this
    // API exposes) -- forces a compile-stage failure so the exact message
    // (built from Object.keys(process.env) inside the child) comes back.
    const introspect =
      `(T) => { const p = \\u0070rocess; throw new Error("ENV_KEYS:" + Object.keys(p.env).join(",")); }`;
    const verdict = verifyUntrustedGeometry(introspect, { w: 1, d: 1 });
    assert.equal(verdict.ok, false);
    assert.match(verdict.reason, /ENV_KEYS:/);
    const keysReported = verdict.reason.split("ENV_KEYS:")[1] || "";
    const keys = keysReported.split(",").map((k: string) => k.toUpperCase());
    assert.ok(!keys.includes("ANTHROPIC_API_KEY"), `the child process's own environment included ANTHROPIC_API_KEY: ${keysReported}`);
  } finally {
    delete process.env.ANTHROPIC_API_KEY;
  }
});
