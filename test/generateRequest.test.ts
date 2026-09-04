// GENERATE: THE MODEL WRITES A createGeometry BUILDER, AGAINST REAL NUMBERS.
//
// This is the step where the agent genuinely codes -- and the one place a
// model's own confidence is worth nothing. The measured constraints come
// from D3 (assessTransform, against the real land) so the model is not
// guessing at a footprint; verification uses THOSE numbers, never anything
// the model's own response might claim about itself, so a response that
// ignores the ground it was actually given fails loudly instead of being
// clamped into looking fine.
//
// No model is called anywhere in this file. Zero API spend without explicit
// authorisation is a standing rule of this project, and it applies to test
// code as much as anything else -- these tests exercise the PROMPT and the
// VERIFICATION, both of which are pure functions that never make a network
// call, and the "response" in every test below is a hand-written string.

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildGeometryPrompt, verifyGeneratedGeometry } from "../public/generate-request.js";
import { assessTransform, requirements } from "../public/transform.js";
import { createGround } from "../public/ground.js";

const heightAt = (x: number) => (x < -100 ? 12 : x < 100 ? -3 : -14);
const land = createGround({ heightAt });
const boat = { id: "boat-1", label: "the fishing boat", x: 0, z: 0, footprint: { w: 4, d: 12 } };
// Dry land (heightAt < -100 => 12 m), for the ground-supported shed tests --
// the boat itself sits in 3 m of harbour water, where a support:"ground"
// thing correctly does not fit at all.
const shed = { id: "shed-1", label: "the old shed", x: -200, z: 0, footprint: { w: 3, d: 3 } };
const evaluate = (src: string) => new Function(`"use strict"; return (${src});`)();
const THREE = {
  BoxGeometry: class {
    constructor(w: number, h: number, d: number) {
      (this as any).attributes = { position: { count: 24 } };
      (this as any).__box = { w, d };
    }
    computeBoundingBox() {
      const { w, d } = (this as any).__box;
      (this as any).boundingBox = { min: { x: -w / 2, z: -d / 2 }, max: { x: w / 2, z: d / 2 } };
    }
  },
};

test("the prompt carries the measured constraints from D3 -- footprint, support, clearance", () => {
  const want = { label: "a slightly bigger boat", ...requirements({ footprint: { w: 5, d: 14 }, support: "float", category: "vessel", clearanceM: 2 }) };
  const assessment = assessTransform(boat, want, land);
  assert.equal(assessment.fits, true, "the fixture transform does not fit -- test setup is wrong");

  const prompt = buildGeometryPrompt(assessment, want, { address: "boat-1", text: "make it a bit bigger" });
  assert.equal(prompt.ok, true);
  assert.deepEqual(prompt.constraints.footprint, { w: 5, d: 14 });
  assert.equal(prompt.constraints.support, "float");
  assert.equal(prompt.constraints.clearanceM, 2);
  assert.equal(prompt.address, "boat-1");
  assert.equal(prompt.instructions, "make it a bit bigger");
});

test("generation is refused before anything is prompted when the ground has not approved the transform", () => {
  const want = { label: "cruise ship", ...requirements({ footprint: { w: 32, d: 210 }, draughtM: 9, support: "float", category: "vessel" }) };
  const assessment = assessTransform(boat, want, land);
  assert.equal(assessment.fits, false, "the fixture cruise ship unexpectedly fits -- test setup is wrong");

  const prompt = buildGeometryPrompt(assessment, want, { address: "boat-1", text: "make it a cruise ship" });
  assert.equal(prompt.ok, false, "a prompt was built for a transform the ground already refused");
  assert.match(prompt.reason, /not approved|refused|fit/i);
});

test("verification uses the REQUESTED footprint, never anything the response itself claims", () => {
  const want = { label: "a small shed", ...requirements({ footprint: { w: 3, d: 3 }, support: "ground" }) };
  const assessment = assessTransform(shed, want, land);
  assert.equal(assessment.fits, true, "the fixture shed does not fit on dry land -- test setup is wrong");
  const prompt = buildGeometryPrompt(assessment, want, { address: "shed-1", text: "add a small shed" });
  assert.equal(prompt.ok, true, (prompt as any).reason);

  // A response that ignores the 3x3 constraint and builds something 40x40 --
  // note it does NOT even attempt to claim its own footprint; there is no
  // field for that. The only footprint that exists anywhere in this call is
  // the one the request itself carried.
  const source = "(T) => new T.BoxGeometry(40, 3, 40)";
  const verdict = verifyGeneratedGeometry(source, prompt, evaluate, THREE);
  assert.equal(verdict.ok, false, "geometry that ignored the requested footprint was verified as fine");
  assert.equal(verdict.stage, "footprint");
});

test("a response that genuinely honours the constraints verifies clean", () => {
  const want = { label: "a small shed", ...requirements({ footprint: { w: 3, d: 3 }, support: "ground" }) };
  const assessment = assessTransform(shed, want, land);
  const prompt = buildGeometryPrompt(assessment, want, { address: "shed-1", text: "add a small shed" });
  assert.equal(prompt.ok, true, (prompt as any).reason);
  const source = "(T) => new T.BoxGeometry(2.5, 3, 2.5)";
  const verdict = verifyGeneratedGeometry(source, prompt, evaluate, THREE);
  assert.equal(verdict.ok, true, verdict.reason);
});
