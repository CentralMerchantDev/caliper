// =============================================================================
// THE MANIFEST HAS TO STAY TRUE TO THE GEOMETRY IT DESCRIBES
//
// A declaration file is only worth having if it cannot quietly disagree with the
// thing it declares. The risk here is specific and easy to picture: someone
// widens the bench in city-render.js from 1.8 to 2.2 and does not touch this
// manifest, so the registry keeps reserving 1.8 m of pavement for a 2.2 m bench
// and the overlap is back -- with a file in the repo asserting it is not.
//
// So these check the manifest against the SOURCE OF THE GEOMETRY, not against
// themselves. A test that only restates the table would pass forever and prove
// nothing, which is the failure this project keeps finding in its own work.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import { PROPS, propFootprint, hardPropIds } from "../public/prop-manifest.js";

// BLOCKED, 2026-09-14, Phase 1 "take it all down"
// (docs/specs/PHASE1-TAKEDOWN-PLAN-2026-09-13.md), discovered while merging
// main's takedown into this lane. This test's own subject was two files,
// both now quarantined: public/city-render.js (the source it read to find
// the real geometry calls) and public/prop-models.js (propGeometry(),
// checked against three props migrated to the shared registry). Neither
// survives. The other four tests below exercise public/prop-manifest.js
// alone -- unaffected by the takedown -- and stay live.
test("every fixed-size prop's footprint matches the geometry the renderer builds", { skip: "BLOCKED: public/city-render.js and public/prop-models.js are both quarantined (see comment above)" }, () => {});

test("a lamp's head may overhang, but its post may not pass through anything", () => {
  // The reason `foot` and `sweep` are separate fields. If someone collapses them
  // into one number, one of these two assertions has to break.
  const lamp = PROPS.lampPost;
  assert.ok(lamp.sweep, "the lamp lost its sweep -- the head is 1.6 m wide and that has to be recorded somewhere");
  assert.ok(
    lamp.sweep!.w > lamp.foot!.w,
    `a lamp head (${lamp.sweep!.w} m) is wider than its post (${lamp.foot!.w} m); ` +
    `if these are equal, either the geometry changed or the distinction was flattened`,
  );
  // The ground reservation must use the POST. Reserving the head's width would
  // forbid a bench under a lamp, which is what real streets are made of.
  const r = propFootprint("lampPost", 0, 0);
  const width = r.xMax - r.xMin;
  assert.ok(
    width < lamp.sweep!.w,
    `the lamp reserves ${width} m of ground, which is at least as wide as its ` +
    `head (${lamp.sweep!.w} m) -- it is reserving the overhang, not the post`,
  );
});

test("rotation swaps the axes, because half of every city runs the other way", () => {
  const flat = propFootprint("bench", 0, 0, { rotated: false });
  const turned = propFootprint("bench", 0, 0, { rotated: true });
  assert.ok(
    flat.xMax - flat.xMin > flat.zMax - flat.zMin,
    "an unrotated bench should be wider than it is deep",
  );
  assert.equal(
    (turned.zMax - turned.zMin).toFixed(4), (flat.xMax - flat.xMin).toFixed(4),
    "rotating a bench 90 degrees should put its length on the z axis",
  );
  assert.equal(
    (turned.xMax - turned.xMin).toFixed(4), (flat.zMax - flat.zMin).toFixed(4),
    "rotating a bench 90 degrees should put its depth on the x axis",
  );
});

test("a per-instance prop cannot be placed without being given a size", () => {
  // The dangerous version of this function returns a zero-area rectangle for a
  // tree and reserves nothing, which reads as success. It has to refuse.
  assert.throws(
    () => propFootprint("tree", 100, 100),
    /scaled per instance/,
    "placing a sized prop with no footprint must throw, not silently reserve nothing",
  );
  const given = propFootprint("tree", 100, 100, { foot: { w: 4, d: 4 } });
  assert.ok(given.xMax - given.xMin >= 4, "a tree given a size should reserve at least that size");
});

test("an unknown prop is refused rather than ignored", () => {
  assert.throws(() => propFootprint("hoverboard", 0, 0), /unknown prop/);
});

test("the hard/soft split is a decision, and every prop has made it", () => {
  for (const [id, p] of Object.entries(PROPS)) {
    assert.ok(p.kind === "hard" || p.kind === "soft", `${id} has no occupancy kind`);
    assert.ok(typeof p.from === "string" && p.from.length > 0,
      `${id} does not record where its dimensions came from, so drift would be untraceable`);
    if (!p.sized) {
      assert.ok(p.foot && p.foot.w > 0 && p.foot.d > 0, `${id} is fixed-size but declares no footprint`);
    }
  }
  assert.ok(hardPropIds().length > 0, "nothing blocks ground, which cannot be right");
});
