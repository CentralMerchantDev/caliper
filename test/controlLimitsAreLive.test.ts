// G1: ONE LIMITS OBJECT, AND EVERY LIMIT IS READ FROM IT.
//
// CONTROL_LIMITS already exists as one object holding every cap this
// pipeline enforces -- budget, per-IP, daily, ops (MAX_FIX_ATTEMPTS,
// MAX_REVIEW_ROUNDS), the circuit breaker, the input guard. What had never
// been proven directly is that every gate actually READS it live, rather
// than a call site quietly holding its own copy of the number that would
// silently stop tracking CONTROL_LIMITS the moment someone typed a literal
// instead of a reference.
//
// The proof here is behavioural, not textual: change one field on the real,
// live CONTROL_LIMITS object and confirm the gate's actual behaviour moves
// with it. A hard-coded call site cannot pass this -- there is no way to
// "happen to" read a value that changed after the function was compiled.
// Restored after every test; CONTROL_LIMITS is `as const` only at the type
// level, not frozen at runtime, which is exactly what makes this provable
// without touching src/controlLayer.ts itself.

import { test } from "node:test";
import assert from "node:assert/strict";

import { CONTROL_LIMITS, checkInputGuard, assertCircuitClosed, recordProviderFailure, CircuitOpenError } from "../src/controlLayer.ts";

function mockKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => { store.set(key, value); },
    delete: async (key: string) => { store.delete(key); },
  } as unknown as KVNamespace;
}

test("checkInputGuard reads FREE_FORM_MAX_LENGTH live from CONTROL_LIMITS, not a captured copy", () => {
  const original = CONTROL_LIMITS.FREE_FORM_MAX_LENGTH;
  try {
    const probe = "x".repeat(original + 1);
    assert.equal(checkInputGuard(probe).ok, false, "a prompt one over today's limit was not refused -- test setup is wrong");

    (CONTROL_LIMITS as any).FREE_FORM_MAX_LENGTH = original + 100;
    assert.equal(
      checkInputGuard(probe).ok, true,
      "raising CONTROL_LIMITS.FREE_FORM_MAX_LENGTH did not change checkInputGuard's behaviour -- it is reading a hard-coded copy, not the live object",
    );
  } finally {
    (CONTROL_LIMITS as any).FREE_FORM_MAX_LENGTH = original;
  }
  assert.equal(CONTROL_LIMITS.FREE_FORM_MAX_LENGTH, original, "the limit was not restored");
});

test("the circuit breaker reads CIRCUIT_FAILURE_THRESHOLD live from CONTROL_LIMITS, not a captured copy", async () => {
  const original = CONTROL_LIMITS.CIRCUIT_FAILURE_THRESHOLD;
  try {
    const kv = mockKv();
    for (let i = 0; i < original; i++) await recordProviderFailure(kv, "anthropic");
    await assert.rejects(() => assertCircuitClosed(kv, "anthropic"), CircuitOpenError, "the circuit did not open at today's threshold -- test setup is wrong");

    (CONTROL_LIMITS as any).CIRCUIT_FAILURE_THRESHOLD = original + 10;
    const kv2 = mockKv();
    for (let i = 0; i < original; i++) await recordProviderFailure(kv2, "anthropic");
    await assert.doesNotReject(
      () => assertCircuitClosed(kv2, "anthropic"),
      "raising CONTROL_LIMITS.CIRCUIT_FAILURE_THRESHOLD did not change the circuit breaker's behaviour -- it is reading a hard-coded copy, not the live object",
    );
  } finally {
    (CONTROL_LIMITS as any).CIRCUIT_FAILURE_THRESHOLD = original;
  }
  assert.equal(CONTROL_LIMITS.CIRCUIT_FAILURE_THRESHOLD, original, "the limit was not restored");
});
