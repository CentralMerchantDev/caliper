// "MAKE THIS BOAT A CRUISE SHIP" — and the world says why not.
//
// The refusal is the product here, not the failure case. A player picks
// something, asks for something bigger, and the world answers with the actual
// numbers under that actual object, plus somewhere it WOULD work.
//
// So the thing these tests defend is that the answer is MEASURED. An
// alternative that sounds plausible but was never checked is worse than no
// alternative at all: it is the system confidently telling a player to do
// something that will also fail. Every offer below has to come from the land
// having gone and looked.

import { test } from "node:test";
import assert from "node:assert/strict";

import { assessTransform, requirements, bearing, describeTransform } from "../public/transform.js";
import { createGround } from "../public/ground.js";

/**
 * A small hand-made world, so the numbers in these tests are ones a reader can
 * check by eye: land in the west, a shallow harbour, deep water in the east.
 */
const heightAt = (x: number) => {
  if (x < -100) return 12;      // dry land
  if (x < 100) return -3;       // shallow harbour, 3 m
  return -14;                   // deep water, 14 m
};
const land = createGround({ heightAt });

const boat = { id: "boat-1", label: "the fishing boat", x: 0, z: 0, footprint: { w: 4, d: 12 } };

// ---------------------------------------------------------------------------
// The happy case, which has to exist or every refusal below proves nothing
// ---------------------------------------------------------------------------

test("a transform that genuinely fits is allowed, with no invented objections", () => {
  const want = { label: "a slightly bigger boat", ...requirements({ footprint: { w: 5, d: 14 }, support: "float", category: "vessel" }) };
  const v = assessTransform(boat, want, land);
  assert.equal(v.premisesHold, true, `refused a transform that fits: ${JSON.stringify(v.falsePremises)}`);
  assert.deepEqual(v.falsePremises, []);
  assert.match(describeTransform(boat, want, v), /^Yes/);
});

// ---------------------------------------------------------------------------
// The refusal, which is the actual product
// ---------------------------------------------------------------------------

test("a cruise ship in a fishing harbour is refused, and the reason carries real numbers", () => {
  const want = { label: "cruise ship", ...requirements({ footprint: { w: 32, d: 210 }, draughtM: 9, support: "float", category: "vessel" }) };
  const v = assessTransform(boat, want, land);

  assert.equal(v.premisesHold, false, "a 210 m cruise ship was allowed in a 3 m harbour");
  assert.ok(v.falsePremises.length > 0, "refused with no stated reason");

  // The draught objection must quote the ACTUAL depth under that boat, not a
  // generic "not deep enough". 3 m of water is what heightAt says is there.
  const draught = v.falsePremises.find((p: string) => /draws 9 m/.test(p));
  assert.ok(draught, `no draught objection in: ${JSON.stringify(v.falsePremises)}`);
  assert.match(draught!, /3\.0 m of water/);
});

test("a refusal ALWAYS offers something, because a no with no way forward is not an answer", () => {
  // The grounding stage's own schema requires this -- there is a test in this
  // repo rejecting "premisesHold=false with a named premise but empty
  // alternatives". This is the same rule at the physical layer, so the two
  // cannot disagree.
  const want = { label: "cruise ship", ...requirements({ footprint: { w: 32, d: 210 }, draughtM: 9, support: "float", category: "vessel" }) };
  const v = assessTransform(boat, want, land);
  assert.ok(v.alternatives.length >= 2, `expected at least two ways forward, got ${JSON.stringify(v.alternatives)}`);
  // And one of them must not require moving, because a single option is a
  // corridor rather than a choice.
  assert.ok(
    v.alternatives.some((a: string) => /smaller/.test(a)),
    "every alternative required moving the object",
  );
});

test("the offer to move is MEASURED -- the land went and found that spot", () => {
  // This is the line between the product and a plausible sentence. "It would
  // fit 380 m north-east" is only worth saying if findGround actually found
  // somewhere, using the same canPlace the placement will use.
  const want = { label: "cruise ship", ...requirements({ footprint: { w: 32, d: 210 }, draughtM: 9, support: "float", category: "vessel" }) };
  const v = assessTransform(boat, want, land, { searchRadiusM: 3000 });

  if (v.measured.nearestFit) {
    const { x, z, movedM } = v.measured.nearestFit;
    // The claim has to survive being re-checked: ask the land directly whether
    // the thing it recommended actually works there.
    const recheck = land.canPlace(
      { footprint: { w: 32, d: 210 }, clearance: 0, support: "float", category: "vessel" },
      x,
      z,
    );
    assert.equal(recheck.ok, true, `the alternative it offered is refused by the land: ${recheck.detail}`);
    assert.ok(movedM > 0, "it offered to move the object nowhere");
    // And the sentence must quote the distance it actually walked.
    const moveOffer = v.alternatives.find((a: string) => /move it/.test(a));
    assert.ok(moveOffer, "measured a fit but never offered it");
    assert.match(moveOffer!, new RegExp(`move it ${Math.round(movedM)} m`));
  } else {
    // Nothing within range is a legitimate answer -- but then it must NOT be
    // offering to move anything.
    assert.ok(
      !v.alternatives.some((a: string) => /move it/.test(a)),
      "it offered to move the object without having found anywhere to move it to",
    );
  }
});

test("nothing selected is refused as nothing selected, not as a failed transform", () => {
  const want = { label: "cruise ship", ...requirements({ footprint: { w: 32, d: 210 } }) };
  const v = assessTransform(null as any, want, land);
  assert.equal(v.premisesHold, false);
  assert.match(v.falsePremises[0], /nothing was selected/);
  assert.ok(v.alternatives.length > 0, "even this refusal must say what to do instead");
});

test("a request that does not say how big it is is refused for that, specifically", () => {
  // A model that answers "make it a cruise ship" without a size has not
  // grounded the request. Guessing a size on its behalf would be the system
  // inventing the very fact it is supposed to be checking.
  const v = assessTransform(boat, { label: "cruise ship" } as any, land);
  assert.equal(v.premisesHold, false);
  assert.match(v.falsePremises[0], /did not say how big/);
});

// ---------------------------------------------------------------------------
// The words a player reads
// ---------------------------------------------------------------------------

test("the sentence carries the reason and the offer together", () => {
  // Split them and you get a screen that says "that did not work" while the
  // reason sits in an object nobody rendered.
  const want = { label: "cruise ship", ...requirements({ footprint: { w: 32, d: 210 }, draughtM: 9, support: "float", category: "vessel" }) };
  const v = assessTransform(boat, want, land, { searchRadiusM: 3000 });
  const said = describeTransform(boat, want, v);
  assert.match(said, /^No --/);
  assert.match(said, /draws 9 m/, "the sentence lost the reason");
  assert.ok(said.includes("?"), "the sentence lost the offer");
});

test("bearings are the eight points a player can act on, not degrees", () => {
  assert.equal(bearing({ x: 0, z: 0 }, { x: 0, z: -10 }), "north");
  assert.equal(bearing({ x: 0, z: 0 }, { x: 10, z: 0 }), "east");
  assert.equal(bearing({ x: 0, z: 0 }, { x: 0, z: 10 }), "south");
  assert.equal(bearing({ x: 0, z: 0 }, { x: -10, z: 0 }), "west");
  assert.equal(bearing({ x: 0, z: 0 }, { x: 10, z: -10 }), "north-east");
  assert.equal(bearing({ x: 0, z: 0 }, { x: 0, z: 0 }), "here");
});

// ---------------------------------------------------------------------------
// The property that makes this not-canned
// ---------------------------------------------------------------------------

test("the SAME request gets a different answer in a different place", () => {
  // If the answer did not depend on where the thing actually is, this would be
  // a lookup table with extra steps -- which is the one thing this whole
  // system exists to not be. The harbour refuses the cruise ship; deep water
  // does not.
  const want = { label: "cruise ship", ...requirements({ footprint: { w: 32, d: 210 }, draughtM: 9, support: "float", category: "vessel" }) };

  const inHarbour = assessTransform({ ...boat, x: 0 }, want, land);
  const inDeepWater = assessTransform({ ...boat, x: 3000 }, want, land);

  assert.equal(inHarbour.premisesHold, false, "the shallow harbour accepted a 9 m draught");
  assert.equal(
    inDeepWater.premisesHold,
    true,
    `deep water refused it too, so the answer is not coming from the world: ${JSON.stringify(inDeepWater.falsePremises)}`,
  );
});
