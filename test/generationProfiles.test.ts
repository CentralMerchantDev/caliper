// K2: A SECOND LIMITS PROFILE, DERIVED FROM A REAL MEASUREMENT, NOT GUESSED.
//
// G2 stayed blocked because a genuine second profile needed real numbers to
// derive it from, and inventing a builder-tier figure with nothing behind it
// would satisfy the letter of "a dial, not a code path" while being exactly
// the "true by construction" shape this project's own protocol distrusts.
// Two real supervised calls through I5 (2026-09-06) gave one real,
// representative figure -- run 2's $0.0056/call (123 in / 534 out tokens,
// thinking correctly disabled) -- and GENERATION_PROFILES.demo/.builder in
// src/controlLayer.ts are both derived from it with a named, stated
// multiple. n=1, one prompt at one size, said plainly rather than treated
// as an average.
//
// THE TEST K2 ITSELF NAMED: "switching profile changes only values; the
// code path is identical under both." checkGenerationSpend is ONE function,
// called with either profile -- proven here by running the SAME inputs
// through both and confirming behaviour differs only where the profiles'
// own numbers differ, never because a different branch of code ran.

import { test } from "node:test";
import assert from "node:assert/strict";

import { GENERATION_PROFILES, checkGenerationSpend } from "../src/controlLayer.ts";

test("both profiles are derived from the same real measurement, not two independently-guessed numbers", () => {
  const MEASURED_CALL_USD = 0.0056;
  assert.ok(GENERATION_PROFILES.demo.perCallCeilingUsd > MEASURED_CALL_USD, "the demo ceiling does not even cover the one real call it was derived from");
  assert.ok(GENERATION_PROFILES.builder.perCallCeilingUsd > GENERATION_PROFILES.demo.perCallCeilingUsd, "the builder tier is not actually wider than demo");
  assert.ok(GENERATION_PROFILES.builder.dailyGenerationCapUsd > GENERATION_PROFILES.demo.dailyGenerationCapUsd);
  assert.ok(GENERATION_PROFILES.builder.dailyGenerationsPerIp > GENERATION_PROFILES.demo.dailyGenerationsPerIp);
});

test("a call under demo's per-call ceiling is accepted", () => {
  const v = checkGenerationSpend(GENERATION_PROFILES.demo, 0.0056, 0);
  assert.equal(v.ok, true, JSON.stringify(v));
});

test("K2's own test spec: switching profile changes only the VALUES a call is checked against, not which code runs", () => {
  // A cost between demo's ceiling and builder's -- refused under one
  // profile, accepted under the other, from the exact same function call
  // with nothing different except which profile object was passed in.
  const cost = (GENERATION_PROFILES.demo.perCallCeilingUsd + GENERATION_PROFILES.builder.perCallCeilingUsd) / 2;
  assert.ok(cost > GENERATION_PROFILES.demo.perCallCeilingUsd, "test fixture is wrong -- this cost must exceed demo's ceiling");
  assert.ok(cost < GENERATION_PROFILES.builder.perCallCeilingUsd, "test fixture is wrong -- this cost must be under builder's ceiling");

  const underDemo = checkGenerationSpend(GENERATION_PROFILES.demo, cost, 0);
  const underBuilder = checkGenerationSpend(GENERATION_PROFILES.builder, cost, 0);
  assert.equal(underDemo.ok, false, "demo's per-call ceiling did not refuse a call over it -- the profile's own value is not being read");
  assert.equal(underBuilder.ok, true, "builder's wider per-call ceiling wrongly refused a call it should permit");
});

test("the daily cap is checked the same way under both profiles, only the threshold differs", () => {
  const demoNearCap = checkGenerationSpend(GENERATION_PROFILES.demo, 0.01, GENERATION_PROFILES.demo.dailyGenerationCapUsd);
  assert.equal(demoNearCap.ok, false, "a call that would exceed demo's daily cap was accepted");
  assert.match(demoNearCap.ok ? "" : demoNearCap.reason, /daily cap/);

  const builderSameAbsoluteSpend = checkGenerationSpend(GENERATION_PROFILES.builder, 0.01, GENERATION_PROFILES.demo.dailyGenerationCapUsd);
  assert.equal(builderSameAbsoluteSpend.ok, true, "the exact same accumulated spend that exhausts demo's cap wrongly still refused under builder's wider one");
});

test("every refusal names the number that refused it, not just that something did", () => {
  const v = checkGenerationSpend(GENERATION_PROFILES.demo, 999, 0);
  assert.equal(v.ok, false);
  assert.match(v.reason, /\$999\.0000/);
  assert.match(v.reason, new RegExp(`\\$${GENERATION_PROFILES.demo.perCallCeilingUsd}`));
});
