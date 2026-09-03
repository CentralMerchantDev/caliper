// A BEACH HAS A WIDTH.
//
// The per-pixel shoreline decides sand from HEIGHT alone -- a 3.8 m window from
// the tide strip at -0.6 m to dune grass at +3.2 m. That is right on a steep
// shore, where the window is crossed in twenty metres. Where the land rises
// slowly it is not, and the same rule paints sand until the ground finally gets
// there. Mark: "on the front edge of the main island there is a weird sand bar
// ... it just isn't done well."
//
// WHY THE MEASUREMENT MATTERS MORE THAN THE FIX HERE.
//
// The diagnosis was nearly abandoned. Three transects across the front shelf
// came back at 75 m and 0 m of height-window width -- an ordinary beach -- and
// on that evidence the theory was wrong. A full scan of the modelled area then
// found an unbroken 975 m band at (6250, -1175). The spot checks had missed it.
//
// A sample that agrees with you is not a measurement, and three that disagree
// are not a refutation either. Both of those are recorded here because the next
// person to look at this will reach for a transect first, as I did.
//
// This file tests the POLICY -- beachWeight, which takes a distance and knows
// nothing about this world -- and then checks the policy against the real
// terrain. The first half could not exist at all while the logic was inline in
// city-render.js, which is the reason it was moved.
import { test } from "node:test";
import assert from "node:assert/strict";
import { beachWeight, BEACH_FULL_M, BEACH_FADE_M, LandField, makeHeightAt } from "../public/terrain.js";
import { sm, toDesign } from "../public/world-scale.js";

test("sand is full strength on the beach and gone inland", () => {
  assert.equal(beachWeight(0), 1, "at the waterline");
  assert.equal(beachWeight(BEACH_FULL_M), 1, "at the far edge of a generous beach");
  assert.equal(beachWeight(BEACH_FADE_M), 0, "beyond any real beach");
  assert.equal(beachWeight(10_000), 0, "ten kilometres inland is not a beach");
});

test("and it fades rather than stopping at a line", () => {
  // A hard cutoff would satisfy the test above and draw a visible edge across
  // the shore -- which is the defect being fixed, in a different costume.
  const mid = (BEACH_FULL_M + BEACH_FADE_M) / 2;
  const w = beachWeight(mid);
  assert.ok(w > 0.4 && w < 0.6, `halfway through the fade should be about half sand, got ${w}`);

  const steps = [0, 40, 70, 85, 100, 120, 140, 200].map(beachWeight);
  for (let i = 1; i < steps.length; i++) {
    assert.ok(steps[i] <= steps[i - 1] + 1e-9, `sand increased with distance inland: ${steps.join(", ")}`);
  }
  assert.ok(new Set(steps.map((v) => v.toFixed(3))).size >= 4,
    `only ${new Set(steps.map((v) => v.toFixed(3))).size} distinct values -- that is a cutoff, not a fade`);
});

test("nonsense is not beach", () => {
  // field.signed() can hand back a NaN on a degenerate polygon, and the failure
  // mode that matters is painting sand across the whole world rather than none.
  assert.equal(beachWeight(NaN), 0);
  assert.equal(beachWeight(-50), beachWeight(50), "sign is irrelevant; it is a distance");
});

test("the thresholds are BUILT metres, not a fraction of the world", () => {
  // A beach is 70 m of sand whatever size the world is. If these ever became
  // world-scaled, halving WORLD_SCALE would halve the beach, which is the class
  // of defect a whole earlier phase of this project was spent removing.
  assert.equal(BEACH_FULL_M, 70);
  assert.equal(BEACH_FADE_M, 140);
  assert.ok(BEACH_FADE_M > BEACH_FULL_M, "the fade must end after it begins");
});

// ---------------------------------------------------------------------------
// AGAINST THE REAL TERRAIN
// ---------------------------------------------------------------------------

test("the bound removes the sheets and keeps the actual shore", () => {
  // The property that matters is SELECTIVITY. A bound that killed all sand would
  // pass every test above and leave the world with no beaches at all.
  const field = new LandField(16);
  const heightAt = makeHeightAt(field);
  const LO = sm(-0.6), HI = sm(3.2);

  let inWindow = 0, keptSand = 0, farAndDropped = 0;
  for (let x = -19000; x <= 19000; x += 500) {
    for (let z = -21000; z <= 6000; z += 500) {
      const h = heightAt(x, z);
      if (!(h > LO && h < HI)) continue;
      inWindow++;
      const dDesign = toDesign(Math.abs(field.signed(x, z).d));
      if (beachWeight(dDesign) > 0.5) keptSand++;
      else if (dDesign > BEACH_FADE_M) farAndDropped++;
    }
  }

  assert.ok(inWindow > 20, `only ${inWindow} points fell in the beach height window -- this test is measuring nothing`);
  assert.ok(keptSand > 0, "every beach in the world was removed; the bound is too tight");
  assert.ok(keptSand < inWindow, "nothing was removed; the bound is not doing anything");
  assert.ok(farAndDropped > 0,
    "no point was dropped for being far from the coast, which is the whole reason this bound exists");
});

// ---------------------------------------------------------------------------
// WHAT THIS FILE DOES NOT COVER, WRITTEN DOWN RATHER THAN LEFT TO BE FOUND
//
// Everything above tests the POLICY. Nothing here tests that city-render.js
// actually APPLIES it. Delete `* beachW` from the shoreOK line and every
// assertion in this file still passes, because they all call beachWeight
// directly rather than going through the renderer.
//
// This was found while writing a mutation for it. The obvious break --
// tightening BEACH_FULL_M so the bound removes everything -- turns the
// selectivity test red, but it turns the THRESHOLD tests red too, so it would
// have been recorded as CAUGHT while proving only what was already proven. A
// mutation that goes red for the wrong reason is worth less than no mutation,
// because it is counted as evidence.
//
// The honest position: the policy is defended, its application is not. Closing
// it needs the renderer to be executable by the suite, which
// UMAA-CALIPER.md already records as Undone under Division 1 ("the renderer
// cannot be executed by the suite -- closed statically instead, which answers
// 'does this run at all' and not 'does it draw the right thing'"). This is one
// more thing waiting on the same headless-WebGL work, and it is listed here so
// the next person does not mistake a green file for a covered feature.
// ---------------------------------------------------------------------------
