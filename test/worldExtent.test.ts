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

test("the ground reaches further than the water -- the tray, as an invariant", () => {
  assert.ok(
    WORLD.GROUND_SPAN > WORLD.SEA_SPAN,
    `ground span ${WORLD.GROUND_SPAN} must exceed sea span ${WORLD.SEA_SPAN}, ` +
    "or the sea plane ends where there is no sea bed under it and the modelled " +
    "rectangle's edge is visible through the water as a tray.",
  );
});

test("and the abyss closes behind BOTH of them", () => {
  // The abyss is a backstop now rather than something you look at through
  // water, but it still has to be the outermost thing or there is a hole in the
  // world past the apron.
  assert.ok(WORLD.ABYSS_SPAN > WORLD.GROUND_SPAN, "the abyss plane must be wider than the ground");
  assert.ok(WORLD.ABYSS_SPAN > WORLD.SEA_SPAN, "the abyss plane must be wider than the sea");
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

test("the apron genuinely clears the water, with room to spare", () => {
  // Not merely greater: greater by enough that the apron's own outer wall is
  // well outside the drawn sea, rather than sitting a few metres past its edge
  // where the join would still be in shot.
  const clearance = (WORLD.GROUND_SPAN - WORLD.SEA_SPAN) * WORLD.SIZE / 2;
  assert.ok(
    clearance > 5000,
    `the ground clears the water's edge by only ${Math.round(clearance)} m; ` +
    "the apron's outer wall needs to be well outside the sea, not just outside it",
  );
});
