// THE GROUND MUST REACH FURTHER THAN THE WATER.
//
// It did not. Measured on the shipped renderer:
//
//     sea plane      SIZE x 4   ->  +/- 52,000 m
//     abyss plane    SIZE x 6   ->  +/- 78,000 m
//     ground         x: +/- 19,500 m,  z: -21,450 .. +6,500 m
//
// The water was 2.7x wider than the ground in x and 8x in +z, and the ground's
// border carried a 175 m vertical bedrock skirt standing in water drawn at 62%
// opacity. From altitude that is a rectangular tray with the island sitting on
// it and two straight bright lines running off to either side, which is what was
// reported and what sent me looking.
//
// The fix is an apron: heightAt(x, z) has no bounds check and answers everywhere
// -- far out it returns about -122 m of noisy sea bed -- so the ground beyond the
// modelled rectangle was never missing, only untessellated.
//
// WHY THESE TESTS AND NOT A SCREENSHOT
//
// A screenshot of this would have to be taken from a specific altitude and
// bearing to show the defect at all; every image that judged this world was
// taken from lower down, which is precisely why it survived. The relationship
// between three numbers is the thing that was wrong, so the relationship is what
// is asserted. Ordering, not values -- a re-tune is allowed to move all three,
// and is not allowed to reorder them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { WORLD } from "../public/city-plan.js";

// TWO OPPOSING FAILURES. THE FIRST VERSION OF THIS FILE ASSERTED ONLY ONE OF
// THEM, AND THAT IS WHAT CAUSED THE OTHER.
//
//   A. water with no seabed under it -> the modelled rectangle reads as a tray
//   B. seabed with no water over it  -> a ring of sea floor standing in the air
//
// The original test said "the ground reaches further than the water", which
// prevents A and GUARANTEES B. It passed, the suite was green, and the world
// shipped with a 6,500 m ring of bare sea floor and a hard edge all the way
// round -- which Mark reported, correctly, as lines still being there.
//
// A test that names one side of a trade-off will hold the system against the
// other side of it. Both directions are asserted now.

test("no seabed is ever left standing in the air", () => {
  assert.ok(
    WORLD.SEA_SPAN >= WORLD.GROUND_SPAN,
    `sea span ${WORLD.SEA_SPAN} must be at least ground span ${WORLD.GROUND_SPAN}. ` +
    `Otherwise a ring of sea floor ${((WORLD.GROUND_SPAN - WORLD.SEA_SPAN) * WORLD.SIZE / 2).toFixed(0)} m ` +
    "wide sits above the waterline, with a hard straight edge where the water stops.",
  );
});

test("and no water is ever left with nothing beneath it", () => {
  assert.ok(
    WORLD.ABYSS_SPAN >= WORLD.SEA_SPAN,
    `abyss span ${WORLD.ABYSS_SPAN} must be at least sea span ${WORLD.SEA_SPAN}, ` +
    "or you look through the water at the sky, which is the tray defect.",
  );
});

test("and there is real modelled ground under the water, not just the abyss", () => {
  // The apron is the thing that stopped the tray: a painted lid at -175 read as
  // a lid, and real sea floor does not. If GROUND_SPAN ever collapsed back to
  // the bare modelled rectangle this would still pass the two tests above and
  // the original defect would be back.
  assert.ok(
    WORLD.GROUND_SPAN * WORLD.SIZE / 2 > 40000,
    `modelled ground reaches only ${(WORLD.GROUND_SPAN * WORLD.SIZE / 2).toFixed(0)} m; ` +
    "the sea bed has to be real out to a distance where it still reads, not painted",
  );
});

test("the spans are multiples of the world, not fixed metres", () => {
  // The predecessor of this whole family of bugs was a bare 40000 that stayed
  // 40 km however small the world became. Anything expressed as a multiple of
  // SIZE survives a rescale; anything expressed in metres does not.
  for (const [name, v] of Object.entries({
    SEA_SPAN: WORLD.SEA_SPAN, ABYSS_SPAN: WORLD.ABYSS_SPAN, GROUND_SPAN: WORLD.GROUND_SPAN,
  })) {
    assert.equal(typeof v, "number", `${name} is not a number`);
    assert.ok(v > 1 && v < 20, `${name} is ${v} -- that is not a plausible multiple of the world's size`);
  }
});

test("the apron grid lands exactly on the modelled rectangle's edges", () => {
  // Not a tolerance -- arithmetic. The apron is a coarse mesh with a hole cut to
  // the fine mesh's rectangle, and terrainMesh keeps a cell when its CENTRE is
  // outside the hole. So unless the rectangle's edges fall on apron grid lines,
  // the two meshes either gap (a hole in the world) or overlap (650 m land drawn
  // on top of 162.5 m land -- measured at 63.2 m of real ground along the
  // northern edge, which is why the overlap approach was abandoned).
  //
  // These are the design-space figures the renderer uses, scaled the same way it
  // scales them, so this fails if either the rectangle or the span is retuned
  // without redoing the arithmetic.
  const k = WORLD.SIZE / 40000;              // the world scale, from SIZE itself
  const wm = (v: number) => v * k;
  const rect = { x0: wm(-30000), x1: wm(30000), z0: wm(-33000), z1: wm(10000) };
  // From WORLD, not a second copy of the number. The first version of this line
  // was `wm(250) * 4` -- the test's own arithmetic, checked against itself, and
  // therefore green whatever the renderer actually used.
  const step = wm(250) * WORLD.APRON_STEP_MULTIPLE;
  const half = WORLD.SIZE * WORLD.GROUND_SPAN / 2;

  for (const [name, edge] of Object.entries(rect)) {
    const cells = (edge + half) / step;
    assert.ok(
      Math.abs(cells - Math.round(cells)) < 1e-9,
      `rectangle edge ${name} = ${edge} m sits ${cells} apron cells from the apron's own edge -- ` +
      "not a whole number, so the coarse mesh does not meet the fine one",
    );
  }
});

test("the ground's own edge is far enough out to be under fog, not in shot", () => {
  // The apron's outer wall drops from about -122 m to bedrock. That wall is
  // fine -- every finite world has an edge -- provided it is far enough away
  // and deep enough that nothing reads it. The old rectangle's edge was visible
  // precisely because it was only 19.5 km out, where the sea bed is still
  // legible through the water.
  //
  // This replaces an earlier assertion that the ground must clear the WATER by
  // 5 km, which was the requirement that put bare sea floor in the air. What
  // matters is the distance from the viewer, not the relationship to the sea.
  const edge = WORLD.GROUND_SPAN * WORLD.SIZE / 2;
  assert.ok(
    edge > 50000,
    `the ground's edge is ${Math.round(edge)} m from centre; at that range the ` +
    "sea bed still reads through the water and the edge shows as a line",
  );
});
