// THE FORGE — every way a generated builder could get something past us.
//
// A player says what they want, a model writes the code, and this is what
// stands between that code and the world. So the tests are not "does it work
// on a good input" -- they are the list of ways a wrong or hostile builder
// could be accepted, each one written as the thing that must be refused.
//
// The geometry is measured with the REAL three.js, not a stand-in, because the
// question is whether the thing that will be DRAWN is acceptable. A mock would
// verify a different object from the one the player ends up looking at, which
// is the exact defect class this project keeps finding.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";

import {
  verifyModelSource,
  scanSource,
  describeVerdict,
  FORGE_LIMITS,
  FORBIDDEN_TOKENS,
} from "../public/model-forge.js";

/**
 * A local evaluator, standing in for the Dynamic Worker isolate.
 *
 * The module under test does not evaluate anything itself -- the evaluator is
 * injected -- so this is the seam that lets the whole file run in node. In
 * production this is the isolate; the CHECKS are identical either way, which is
 * the point of injecting it.
 */
const evaluate = (src: string) => new Function(`"use strict"; return (${src});`)();

const BOX = `(THREE) => new THREE.BoxGeometry(4, 3, 8)`;

test("a plain, honest builder is accepted, and reports what it measured", () => {
  // The control. Without it, a verifier that refused EVERYTHING would pass
  // every refusal test in this file.
  const v = verifyModelSource(BOX, { w: 4, d: 8 }, evaluate, THREE);
  assert.equal(v.ok, true, `an honest builder was refused: ${describeVerdict(v)}`);
  assert.ok(v.measured.triangles > 0, "no triangles were counted");
  assert.ok(v.measured.vertices > 0);
  assert.equal(v.measured.declared.w, 4);
  assert.match(describeVerdict(v), /built \d+ triangles/);
});

// ---------------------------------------------------------------------------
// The cheap scan
// ---------------------------------------------------------------------------

test("a builder reaching for the page, the network or eval is refused before it runs", () => {
  // Not the security boundary -- the isolate and the AST scanners are -- but
  // the cases it does catch should never cost a run to discover.
  for (const token of ["document", "fetch", "eval", "localStorage", "process"]) {
    const bad = `(THREE) => { ${token}; return new THREE.BoxGeometry(1,1,1); }`;
    const v = verifyModelSource(bad, { w: 2, d: 2 }, evaluate, THREE);
    assert.equal(v.ok, false, `a builder mentioning ${token} was accepted`);
    assert.equal(v.stage, "scan");
    assert.match(v.reason!, new RegExp(token));
  }
});

test("every forbidden token is actually detected, so the list is not decoration", () => {
  // A list nobody checks is a list that drifts. If a token is added here but
  // scanSource stops looking, this fails rather than the list quietly meaning
  // nothing.
  for (const token of FORBIDDEN_TOKENS) {
    const probe = `(THREE) => { /* ${token} */ return null; }`;
    assert.ok(scanSource(probe), `"${token}" is in the list but scanSource does not find it`);
  }
});

test("empty, oversized and non-string sources are refused", () => {
  assert.ok(scanSource(""));
  assert.ok(scanSource("   "));
  assert.ok(scanSource(null as any));
  assert.ok(scanSource("x".repeat(FORGE_LIMITS.MAX_SOURCE_CHARS + 1)));
  assert.equal(scanSource(BOX), null, "an ordinary builder was refused by the scan");
});

// ---------------------------------------------------------------------------
// Did it actually build anything?
// ---------------------------------------------------------------------------

test("a builder that does not compile is refused, naming the syntax error", () => {
  const v = verifyModelSource(`(THREE) => { this is not javascript`, { w: 2, d: 2 }, evaluate, THREE);
  assert.equal(v.ok, false);
  assert.equal(v.stage, "compile");
});

test("source that is not a function is refused", () => {
  // A model returning a DESCRIPTION of a builder instead of a builder is a
  // realistic wrong answer, and one that would otherwise crash at draw time.
  const v = verifyModelSource(`({ shape: "box", size: [1,2,3] })`, { w: 2, d: 2 }, evaluate, THREE);
  assert.equal(v.ok, false);
  assert.equal(v.stage, "compile");
  assert.match(v.reason!, /not a function/);
});

test("a builder that throws is refused, carrying its own error", () => {
  const v = verifyModelSource(`(THREE) => { throw new Error("no hull"); }`, { w: 2, d: 2 }, evaluate, THREE);
  assert.equal(v.ok, false);
  assert.equal(v.stage, "build");
  assert.match(v.reason!, /no hull/);
});

test("a builder returning nothing, or something that is not geometry, is refused", () => {
  for (const src of [`(THREE) => null`, `(THREE) => 42`, `(THREE) => ({})`, `(THREE) => "a boat"`]) {
    const v = verifyModelSource(src, { w: 2, d: 2 }, evaluate, THREE);
    assert.equal(v.ok, false, `${src} was accepted`);
    assert.equal(v.stage, "build");
    assert.match(v.reason!, /no geometry/);
  }
});

// ---------------------------------------------------------------------------
// Budgets
// ---------------------------------------------------------------------------

test("a builder over the triangle budget is refused, with the count", () => {
  // A sphere with enough segments is the realistic version of this: a model
  // asked for "smooth" produces something that costs more than the visible
  // difference is worth.
  const heavy = `(THREE) => new THREE.SphereGeometry(1, 200, 200)`;
  const v = verifyModelSource(heavy, { w: 2, d: 2 }, evaluate, THREE);
  assert.equal(v.ok, false);
  assert.equal(v.stage, "budget");
  assert.match(v.reason!, /triangles/);
  assert.ok(v.triangles! > FORGE_LIMITS.MAX_TRIANGLES);
});

test("a builder just under the budget is still accepted", () => {
  // The paired control: the budget must be a threshold, not a blanket refusal
  // of anything with detail in it.
  const ok = `(THREE) => new THREE.SphereGeometry(1, 20, 20)`;
  const v = verifyModelSource(ok, { w: 2.1, d: 2.1 }, evaluate, THREE);
  assert.equal(v.ok, true, `a modest sphere was refused: ${describeVerdict(v)}`);
});

// ---------------------------------------------------------------------------
// Does it fit what it says it is?
// ---------------------------------------------------------------------------

test("geometry bigger than its declared footprint is refused, with both numbers", () => {
  // This is the check that found bld-tower drawing 11.81 m past its own
  // declared depth. Every placement decision downstream reads the DECLARATION,
  // so a model that draws outside it reserves one piece of ground and occupies
  // another.
  const v = verifyModelSource(`(THREE) => new THREE.BoxGeometry(40, 3, 40)`, { w: 4, d: 4 }, evaluate, THREE);
  assert.equal(v.ok, false);
  assert.equal(v.stage, "footprint");
  assert.match(v.reason!, /declares 4x4 m and draws 40\.0x40\.0 m/);
});

test("a small projection past the footprint is allowed, because chimneys are real", () => {
  // Refusing every overhang would refuse a door canopy and a chimney, which is
  // a verifier that makes the models worse. The tolerance is the same 0.6 m the
  // asset-lane check uses, so the two cannot disagree about the same object.
  const slight = `(THREE) => new THREE.BoxGeometry(4.4, 3, 8)`;
  const v = verifyModelSource(slight, { w: 4, d: 8 }, evaluate, THREE);
  assert.equal(v.ok, true, `a 0.4 m projection was refused: ${describeVerdict(v)}`);
});

test("a model that will not say how big it is gets no further", () => {
  for (const bad of [null, {}, { w: 0, d: 4 }, { w: 4, d: -1 }]) {
    const v = verifyModelSource(BOX, bad as any, evaluate, THREE);
    assert.equal(v.ok, false, `${JSON.stringify(bad)} was accepted as a footprint`);
    assert.equal(v.stage, "declaration");
  }
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

test("a builder that is different every time is refused", () => {
  // The thing that was reviewed and approved has to be the thing the player
  // gets. A builder reading Math.random produces a world that differs on every
  // reload, so no screenshot of it means anything and no approval covers it.
  const random = `(THREE) => new THREE.SphereGeometry(1, 8, Math.floor(Math.random() * 8) + 4)`;
  let sawRefusal = false;
  for (let i = 0; i < 12 && !sawRefusal; i++) {
    const v = verifyModelSource(random, { w: 2.1, d: 2.1 }, evaluate, THREE);
    if (!v.ok && v.stage === "determinism") sawRefusal = true;
  }
  assert.ok(sawRefusal, "a builder using Math.random was accepted as deterministic");
});

test("an ordinary builder passes the determinism check rather than being caught by it", () => {
  // Without this, a determinism check that refused everything would look like
  // it was working.
  for (let i = 0; i < 5; i++) {
    const v = verifyModelSource(BOX, { w: 4, d: 8 }, evaluate, THREE);
    assert.equal(v.ok, true, `a fixed builder was called non-deterministic: ${describeVerdict(v)}`);
  }
});

// ---------------------------------------------------------------------------
// The verdict is usable by a repair loop
// ---------------------------------------------------------------------------

test("every refusal names WHICH check refused it, not just that something did", () => {
  // "It did not work" makes every repair a guess. The stage is what tells the
  // model whether to shrink it, simplify it or fix its syntax -- the difference
  // between a loop that converges and one that wanders.
  const cases: [string, any, string][] = [
    [`(THREE) => { document; return 1; }`, { w: 2, d: 2 }, "scan"],
    [`(THREE) => {{{`, { w: 2, d: 2 }, "compile"],
    [`(THREE) => { throw new Error("x"); }`, { w: 2, d: 2 }, "build"],
    [`(THREE) => new THREE.SphereGeometry(1, 200, 200)`, { w: 2, d: 2 }, "budget"],
    [`(THREE) => new THREE.BoxGeometry(40, 3, 40)`, { w: 4, d: 4 }, "footprint"],
  ];
  const stages = new Set<string>();
  for (const [src, declared, expected] of cases) {
    const v = verifyModelSource(src, declared, evaluate, THREE);
    assert.equal(v.ok, false, `${src} was accepted`);
    assert.equal(v.stage, expected, `expected stage "${expected}", got "${v.stage}" for ${src}`);
    assert.ok(v.reason && v.reason.length > 10, "a refusal with no usable reason");
    stages.add(v.stage!);
  }
  assert.equal(stages.size, cases.length, "two different failures reported the same stage");
  assert.match(describeVerdict({ ok: false, stage: "budget", reason: "too big" } as any), /refused at budget/);
});
