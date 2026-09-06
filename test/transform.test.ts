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
import { createWorldRegistry } from "../public/world-registry.js";

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
  assert.ok(v.alternatives.length >= 1, `expected at least one way forward, got ${JSON.stringify(v.alternatives)}`);
  // NEVER "make it smaller" -- a different, smaller request is not an
  // alternative to the one asked for, it is a different request. This
  // scenario is a draught refusal (too little water, nothing to demolish),
  // so its only same-kind alternative is relocation.
  assert.ok(
    !v.alternatives.some((a: string) => /smaller/.test(a)),
    "offered to shrink the request instead of finding it room -- that is a different request, not an alternative",
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

// ---------------------------------------------------------------------------
// THE DESIGN CORRECTION: HEIGHT IS NOT A BUILD CONSTRAINT. SPACE IS.
//
// There is no height cap and no zoning on what a player may build -- only
// whether the footprint fits contiguous free ground. Typology classes
// (PLOT_CLASSES) remain generation parameters that shaped the DEFAULT world;
// they are never consulted here. A flat, registry-backed fixture is used
// (rather than the harbour fixture above) because the space check needs a
// real registered plot to be meaningful -- it is a physical fact about what
// else is standing on the ground, not about the ground's own class.
// ---------------------------------------------------------------------------

function flatRegisteredWorld() {
  const heightAt = () => 5; // flat, dry land everywhere
  const registry = createWorldRegistry(heightAt);
  return { heightAt, registry, land: createGround({ heightAt, registry }) };
}

test("a tall building on open ground WITH ROOM is accepted -- no height cap, no zoning", () => {
  const { registry, land } = flatRegisteredWorld();
  // A large plot with nothing else on it.
  registry.reserve({ kind: "plot", id: "open-lot", xMin: -50, xMax: 50, zMin: -50, zMax: 50, surface: "open" });
  const subject = { id: "open-lot", label: "open ground", x: 0, z: 0, footprint: { w: 100, d: 100 } };
  // A genuinely tall request -- storeys are a height, and there is
  // deliberately no way to express storeys/height in requirements() at all,
  // because this design has nothing that would refuse one.
  const want = { label: "a 30-storey tower", ...requirements({ footprint: { w: 60, d: 60 }, support: "ground", category: "building" }) };
  const v = assessTransform(subject, want, land);
  assert.equal(v.premisesHold, true, `a tower with genuine room was refused: ${JSON.stringify(v.falsePremises)}`);
  assert.equal(v.fits, true);
});

test("a building too large for its space is refused, and the message names the required and available dimensions", () => {
  const { registry, land } = flatRegisteredWorld();
  // A villa-class-sized plot -- small, matching Mark's own beach-e0-city example.
  registry.reserve({ kind: "plot", id: "beach-e0-city", xMin: -12, xMax: 12, zMin: -15, zMax: 15, surface: "open" });
  const subject = { id: "beach-e0-city", label: "villa plot", x: 0, z: 0, footprint: { w: 24, d: 30 } };
  const want = { label: "a 30-storey tower", ...requirements({ footprint: { w: 60, d: 60 }, support: "ground", category: "building" }) };
  const v = assessTransform(subject, want, land);
  assert.equal(v.premisesHold, false, "a 60x60 m tower was accepted on a 24x30 m plot");
  const reason = v.falsePremises.join(" ");
  // THE SPACE MATH, PLAINLY: what was needed, what is there.
  assert.match(reason, /needs 60\.0 x 60\.0 m/i);
  assert.match(reason, /24\.0 x 30\.0 m/);
  // NEVER a height/zoning word standing in for the real reason.
  assert.doesNotMatch(reason, /zon(e|ing)|height cap|too tall|storeys allowed|typology/i);
});

test("a refusal offers something of the SAME KIND -- a location with room, or a demolition list -- never a substitute", () => {
  const { registry, land } = flatRegisteredWorld();
  registry.reserve({ kind: "plot", id: "beach-e0-city", xMin: -12, xMax: 12, zMin: -15, zMax: 15, surface: "open" });
  const subject = { id: "beach-e0-city", label: "villa plot", x: 0, z: 0, footprint: { w: 24, d: 30 } };
  const want = { label: "a 30-storey tower", ...requirements({ footprint: { w: 60, d: 60 }, support: "ground", category: "building" }) };
  const v = assessTransform(subject, want, land, { searchRadiusM: 500 });
  assert.equal(v.premisesHold, false, "test setup is wrong -- expected this to be refused");
  assert.ok(v.alternatives.length > 0, "a refusal with nothing offered instead is not a usable answer");
  assert.ok(
    v.alternatives.some((a: string) => /^move it/.test(a) || /^demolish/.test(a)),
    `no same-kind alternative offered: ${JSON.stringify(v.alternatives)}`,
  );
  assert.ok(
    !v.alternatives.some((a: string) => /smaller|trees|planters/.test(a)),
    `offered a substitute instead of the same kind of thing: ${JSON.stringify(v.alternatives)}`,
  );
});

test("a demolition list is offered when something occupies the needed space, naming what and whether it can be cleared", () => {
  const { registry, land } = flatRegisteredWorld();
  registry.reserve({ kind: "plot", id: "p1", xMin: -30, xMax: 30, zMin: -30, zMax: 30, surface: "open" });
  // A shed straddling ground level (not just touching it), inside the plot.
  registry.reserve({ kind: "feature", id: "old-shed", xMin: 10, xMax: 16, zMin: 10, zMax: 16, yMin: 3, yMax: 9 });
  const subject = { id: "p1", label: "the plot", x: 10, z: 10, footprint: { w: 60, d: 60 } };
  const want = { label: "a garden pavilion", ...requirements({ footprint: { w: 20, d: 20 }, support: "ground", category: "building" }) };
  const v = assessTransform(subject, want, land, { searchRadiusM: 500 });
  assert.equal(v.premisesHold, false, "test setup is wrong -- the shed should block this exact spot");
  const demolish = v.alternatives.find((a: string) => /^demolish/.test(a));
  assert.ok(demolish, `no demolition alternative offered: ${JSON.stringify(v.alternatives)}`);
  assert.match(demolish!, /old-shed/);
});

test("a thing being transformed does not block its own replacement -- the self-collision that looked like a height/zoning refusal", () => {
  const { registry, land } = flatRegisteredWorld();
  registry.reserve({ kind: "plot", id: "beach-e0-city", xMin: -12, xMax: 12, zMin: -15, zMax: 15, surface: "open" });
  registry.reserve({ kind: "feature", id: "existing-villa", xMin: -9, xMax: 9, zMin: -12, zMax: 12, yMin: 0, yMax: 8 });
  const subject = { id: "existing-villa", label: "the villa", x: 0, z: 0, footprint: { w: 18, d: 24 } };
  // Same footprint the villa already occupies -- if this is refused, the
  // villa's own reservation is blocking its own replacement.
  const want = { label: "a 30-storey tower", ...requirements({ footprint: { w: 18, d: 24 }, support: "ground", category: "building" }) };
  const v = assessTransform(subject, want, land);
  assert.equal(v.premisesHold, true, `refused by its own existing footprint: ${JSON.stringify(v.falsePremises)}`);
});

test("water and cliff refusals still hold -- terrain facts, not zoning, and untouched by the space fix", () => {
  // WATER: the existing harbour fixture, unchanged and re-asserted here so a
  // future edit to the space-check code cannot silently also weaken this.
  const wantShip = { label: "cruise ship", ...requirements({ footprint: { w: 32, d: 210 }, draughtM: 9, support: "float", category: "vessel" }) };
  const shipVerdict = assessTransform(boat, wantShip, land);
  assert.equal(shipVerdict.premisesHold, false, "water depth stopped refusing draught");
  assert.equal(shipVerdict.measured.placement.reason, "draught");

  // CLIFF: a slope steep enough to classify as USE.CLIFF (>= 0.62 rise/run
  // over 24 m -- public/land-use.js's own SLOPE.CLIFF) refuses with
  // reason:"terrain", the same physical-fact category water refusals use,
  // never a zoning word.
  const cliffHeightAt = (x: number) => (x < 0 ? 0 : 30); // a sheer 30 m step at x=0
  const cliffLand = createGround({ heightAt: cliffHeightAt });
  const cliffSubject = { id: "cliff-1", label: "the ledge", x: 0, z: 0, footprint: { w: 6, d: 6 } };
  const wantHut = { label: "a small hut", ...requirements({ footprint: { w: 4, d: 4 }, support: "ground" }) };
  const cliffVerdict = assessTransform(cliffSubject, wantHut, cliffLand);
  assert.equal(cliffVerdict.premisesHold, false, "a sheer 30 m slope was accepted as buildable");
  assert.equal(cliffVerdict.measured.placement.reason, "terrain");
});
