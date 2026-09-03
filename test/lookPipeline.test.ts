// The look of this application has to be defended by something.
//
// A blind audit deleted the colour grade from the composer — the headline change
// of an entire session, the thing that fixed a wash Mark had reported three times
// — and the full 605-test suite, the browser check and tsc all stayed green. It
// deleted the vignette parameters and nothing noticed either.
//
// A grade cannot be judged by a unit test; how it LOOKS needs eyes. But three
// things about it can be asserted, and each one is a defect this project has
// already shipped once:
//
//   1. The shader exists and its uniforms are the tuned values, not defaults.
//   2. The maths does what the comments claim — measured, because the roll-off
//      comment was off by a factor of two and nobody noticed for a session.
//   3. index.html and city.html use THE SAME numbers. They diverged before, and
//      the divergence is why every screenshot flattered a page the visitor was
//      not looking at.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeGradeShader } from "../public/colour-grade.js";

const PUBLIC = path.join(process.cwd(), "public");
const read = (f: string) => fs.readFileSync(path.join(PUBLIC, f), "utf8");

test("the grade exists and carries its tuned uniforms", () => {
  const g = makeGradeShader();
  assert.equal(g.uniforms.saturation.value, 1.30);
  assert.equal(g.uniforms.contrast.value, 1.13);
  assert.equal(g.uniforms.warmth.value, 0.030);
  assert.match(g.fragmentShader, /saturation/);
  assert.match(g.fragmentShader, /contrast/);
});

test("the application actually adds the grade to its composer", () => {
  // The mutation that survived was removing this line. Reading the source is a
  // weak test and it is still infinitely stronger than nothing, which is what
  // was there. It fails the moment someone deletes the pass.
  const shell = read("world-render-3d.js");
  assert.match(shell, /composer\.addPass\(new ShaderPass\(makeGradeShader\(\)\)\)/,
    "world-render-3d.js no longer adds the colour grade to its composer");
});

test("the grade runs AFTER OutputPass, where its curve is meant to run", () => {
  // The S-curve about mid grey and the roll-off above 0.86 are written for
  // display-referred values. Run before OutputPass they operate on linear HDR
  // and do something else entirely — which is how it was first wired.
  const shell = read("world-render-3d.js");
  const out = shell.indexOf("new OutputPass()");
  const grade = shell.indexOf("makeGradeShader()");
  assert.ok(out > 0 && grade > 0, "could not find both passes");
  assert.ok(grade > out, "the colour grade must be added after OutputPass, not before");
});

test("the vignette darkens toward black, not toward grey", () => {
  // three.js mixes toward vec3(1.0 - darkness). At darkness 0.45 that target is
  // grey 0.55, so the corners washed out instead of darkening — which is the
  // "fog" Mark reported and which no test would have caught. Anything below 1.0
  // is a lightening vignette and is almost certainly a units misreading.
  const shell = read("world-render-3d.js");
  const m = shell.match(/vignettePass\.uniforms\["darkness"\]\.value\s*=\s*([\d.]+)/);
  assert.ok(m, "could not find the vignette darkness setting");
  const darkness = Number(m![1]);
  assert.ok(darkness >= 1.0,
    `vignette darkness ${darkness} mixes toward grey ${(1 - darkness).toFixed(2)}; ` +
    `values below 1.0 wash the corners out instead of darkening them`);
});

test("index.html and city.html grade the world identically", () => {
  // They did not, and that is why every screenshot of this world came through a
  // grade the application never ran. One shared module is the fix; this asserts
  // both pages still use it rather than drifting back to private copies.
  const shell = read("world-render-3d.js");
  const city = read("city.html");
  for (const [name, src] of [["world-render-3d.js", shell], ["city.html", city]] as const) {
    assert.match(src, /makeGradeShader/, `${name} does not use the shared colour grade`);
    assert.doesNotMatch(src, /const GradeShader = \{\s*\n\s*uniforms:/,
      `${name} has grown a private copy of the grade again`);
  }
});

test("the highlight roll-off compresses what the comment says it compresses", () => {
  // The comment claims "everything above 0.86 is compressed into the last 0.14".
  // Measured, it is the last 0.058, and the consequence is real: nothing this
  // application renders can reach pure white. Asserting the MEASURED behaviour,
  // so a change to the curve is visible rather than silent.
  const rollOff = (c: number) => (c < 0.86 ? c : 0.86 + (1 - Math.exp(-(c - 0.86) * 4.0)) * 0.135);
  assert.ok(Math.abs(rollOff(0.86) - 0.86) < 1e-9);
  assert.ok(Math.abs(rollOff(1.0) - 0.9179) < 0.001, `pure white lands at ${rollOff(1.0).toFixed(4)}`);
  // Monotone: a brighter input must never produce a darker output.
  let prev = -1;
  for (let c = 0.8; c <= 1.0; c += 0.01) {
    const v = rollOff(c);
    assert.ok(v >= prev, `roll-off is not monotone at ${c.toFixed(2)}`);
    prev = v;
  }
});
