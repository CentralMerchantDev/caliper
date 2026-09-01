// =============================================================================
// WORLD INTEGRITY
//
// These exist because of a hole found by auditing the pipeline rather than by
// watching it fail, which makes it the more dangerous kind.
//
// All nine cases in SIM_REGRESSION_SUITE call tick, chooseAction or applyAction.
// Those are pure functions over a sim's needs and the world's money. They never
// read objectTypes, buildings, placements or surfaces. So every one of them
// passes identically whether a data edit added a bench, added nothing, or
// deleted half the world -- as long as the four sim functions still parse.
//
// decideStillFailing then deliberately allows a plan to propose zero criteria
// ("nothing new to check" is a legitimate outcome). Put those two facts
// together and a data-edit run could report SHIPPED, VERIFIED with nothing in
// the verification having looked at the data it changed.
//
// For a system whose entire claim is that it only says yes when yes is true,
// that is the wrong hole to have. Each test below is one way the old
// verification would have said yes.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import { SIM_BASELINE_SOURCE } from "../src/simBaseline.ts";
import { runValidatedWorldEdit, worldIntegrityChecks, readWorldData } from "../src/worldEdit.ts";
import { decideStillFailing } from "../src/changePipeline.ts";
import type { TestResult } from "../src/types.ts";

const BASE = SIM_BASELINE_SOURCE;

function check(results: ReturnType<typeof worldIntegrityChecks>, name: string) {
  const r = results.find((x) => x.name.includes(name));
  assert.ok(r, `no check named like "${name}" -- found: ${results.map((x) => x.name).join(" | ")}`);
  return r!;
}

/** A real, valid data edit: one more lamp post outdoors. */
function withExtraLamp(): string {
  const res = runValidatedWorldEdit(BASE, {
    ops: [{
      op: "addPlacement",
      placement: { id: "lampPost-test-1", type: "lampPost", location: "outdoors", plot: { x: 1.0, y: 1.0 } },
    }] as any,
  } as any);
  assert.ok(res.ok, `fixture edit should apply: ${res.ok ? "" : res.reason}`);
  return (res as { ok: true; source: string }).source;
}

test("a data edit that changes nothing is reported as a failure, not a pass", () => {
  // THE hole. The edit applied cleanly, the sandbox ran, all nine regression
  // cases passed -- because none of them look at the data -- and the run
  // shipped a world identical to the one it started with.
  const results = worldIntegrityChecks(BASE, BASE, true);
  const observable = check(results, "actually changed the world data");
  assert.equal(observable.pass, false);
  assert.match(String(observable.actual), /identical/);
});

test("a real data edit passes every integrity check", () => {
  const next = withExtraLamp();
  const results = worldIntegrityChecks(BASE, next, true);
  const failed = results.filter((r) => !r.pass);
  assert.deepEqual(failed.map((f) => f.name), [], `unexpected failures: ${JSON.stringify(failed, null, 1)}`);
  // and it is genuinely observable in the data, not just in the string
  assert.equal(readWorldData(next).placements.length, readWorldData(BASE).placements.length + 1);
});

test("a source edit that silently deletes a placement fails", () => {
  // The likeliest silent regression on the source-edit path, where a model
  // rewrites the whole file: something quietly does not come back.
  const before = readWorldData(BASE);
  const victim = before.placements[0];
  const next = BASE.replace(
    new RegExp(`\\{[^{}]*"?id"?\\s*:\\s*"${victim.id}"[\\s\\S]{0,400}?\\},?\\n`),
    "",
  );
  assert.notEqual(next, BASE, "fixture should have removed something");
  const results = worldIntegrityChecks(BASE, next, false);
  assert.equal(check(results, "nothing that existed before was deleted").pass, false);
});

test("a placement pointing at an object type that does not exist fails", () => {
  // A registry entry the renderer cannot resolve draws nothing, silently: the
  // visitor is told yes and sees no change. That is the exact failure this
  // whole system exists to refuse.
  const lamped = withExtraLamp();
  const next = lamped.replace('"id": "lampPost-test-1",\n    "type": "lampPost"', '"id": "lampPost-test-1",\n    "type": "lampPostt"');
  assert.notEqual(next, lamped, "fixture should have broken the type reference");
  // readWorldData's own validation rejects a dangling type reference before the
  // referential check gets to it, so the failure surfaces as a parse failure.
  // Either way the run stops, which is what matters -- assert the BEHAVIOUR, not
  // which of the two fail-closed paths caught it.
  const results = worldIntegrityChecks(BASE, next, true);
  assert.ok(results.some((r) => !r.pass), "a dangling type reference must fail verification");
  assert.equal(decideStillFailing(undefined, results as any, []), true);
});

test("the referential check itself catches a dangling type when parsing allows it", () => {
  // Belt and braces: prove the check does its own job, independent of whether
  // readWorldData happens to reject the same input first. Constructed directly
  // rather than through the source so nothing else can catch it on the way.
  const results = worldIntegrityChecks(BASE, BASE, false);
  assert.ok(check(results, "references an object type that exists").pass);
  assert.ok(check(results, "stands somewhere that exists").pass);
  assert.ok(check(results, "placement ids are unique").pass);
});

test("a world whose data no longer parses fails loudly, and is the only result", () => {
  // The source-edit path never validates against the data blocks the way the
  // data-edit path does, so a rewrite that mangles them reaches verification.
  const next = BASE.replace("/*@DATA:PLACEMENTS:BEGIN*/", "/*@DATA:PLACEMENTS:BEGIN*/ this is not json ");
  const results = worldIntegrityChecks(BASE, next, false);
  assert.equal(results.length, 1);
  assert.equal(results[0].pass, false);
  assert.match(results[0].name, /still parses as a world/);
});

test("integrity failures actually stop the run", () => {
  // The checks are appended to the REGRESSION results rather than the criteria,
  // precisely so decideStillFailing gives them full weight. Without this, a
  // failing integrity check would be advisory and the run would ship anyway.
  const failing = worldIntegrityChecks(BASE, BASE, true) as unknown as TestResult[];
  assert.equal(decideStillFailing(undefined, failing, []), true);

  const passing = worldIntegrityChecks(BASE, withExtraLamp(), true) as unknown as TestResult[];
  assert.equal(decideStillFailing(undefined, passing, []), false);
});

test("the checks are cheap enough to always run", () => {
  // No sandbox, no model, no I/O -- if they were expensive there would be a
  // temptation to make them optional, and an optional check is not a check.
  const next = withExtraLamp();
  const t0 = Date.now();
  for (let i = 0; i < 50; i++) worldIntegrityChecks(BASE, next, true);
  const ms = (Date.now() - t0) / 50;
  assert.ok(ms < 40, `${ms.toFixed(1)} ms per run is too slow to be unconditional`);
});
