// SHOW THE WORK: THE PLAYER SEES THE CODE THAT WAS WRITTEN FOR THEM.
//
// src/changePipeline.ts already streams stages over SSE and the page already
// renders grounding -> plan -> implement -> verify -> review -> fix -- both
// large, live, already-tested surfaces this step does not touch (src/ is
// extended, never rewritten, and this repo's own rule is that a session
// editing it alone, under time pressure, is exactly how a stray edit reaches
// the gates or the spend caps). What is missing is the ARTEFACT: nothing yet
// shapes what an "implement"/"verify" stage for the source-edit path (D4)
// actually shows a player -- the source it got, and the verdict, without
// ever letting a failed verify read as a success.
//
// This proves the shaping logic the pipeline will call, the same
// build-the-mechanism-defer-the-wiring pattern D1/D2/D4 already used.

import { test } from "node:test";
import assert from "node:assert/strict";

import { stageArtefact, describeStageOutcome } from "../public/stage-artefact.js";

const passVerdict = {
  ok: true, stage: null, reason: null,
  measured: { vertices: 24, triangles: 8, buildMs: 3, drawn: { w: 2.9, d: 2.9 }, declared: { w: 3, d: 3 }, totalMs: 4 },
};
const failVerdict = { ok: false, stage: "footprint", reason: "declares 3x3 m and draws 40.0x40.0 m", drawn: { w: 40, d: 40 } };

test("the stage artefact carries the source and the verdict, unaltered", () => {
  const source = "(T) => new T.BoxGeometry(2.9, 3, 2.9)";
  const a = stageArtefact("verify", source, passVerdict);
  assert.equal(a.stage, "verify");
  assert.equal(a.source, source);
  assert.deepEqual(a.verdict, passVerdict);
});

test("a failed verify is shown as a failed verify -- never smoothed into a success", () => {
  const a = stageArtefact("verify", "(T) => new T.BoxGeometry(40, 3, 40)", failVerdict);
  const outcome = describeStageOutcome(a);
  assert.equal(outcome.ok, false);
  assert.match(outcome.text, /fail|refus/i, `a failed verdict described itself as: "${outcome.text}"`);
  assert.doesNotMatch(outcome.text, /success|verified ok|passed/i, `a failed verdict's description reads as a success: "${outcome.text}"`);
});

test("a passing verify reads as a pass, and names what was measured", () => {
  const a = stageArtefact("verify", "(T) => new T.BoxGeometry(2.9, 3, 2.9)", passVerdict);
  const outcome = describeStageOutcome(a);
  assert.equal(outcome.ok, true);
  assert.match(outcome.text, /8 triangles|triangles/i);
});

test("an artefact with no verdict yet (mid-stream, before verify has run) is neither a pass nor a fail", () => {
  const a = stageArtefact("implement", "(T) => new T.BoxGeometry(2.9, 3, 2.9)", null);
  const outcome = describeStageOutcome(a);
  assert.equal(outcome.ok, null, "an unverified artefact must not read as a pass or a fail -- it has not been checked yet");
});
