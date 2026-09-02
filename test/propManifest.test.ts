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
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { PROPS, propFootprint, hardPropIds } from "../public/prop-manifest.js";

const HERE = dirname(fileURLToPath(import.meta.url));
function findPublic(): string {
  let dir = HERE;
  for (let up = 0; up < 6; up++) {
    const c = join(dir, "public");
    try { readFileSync(join(c, "world-scale.js"), "utf8"); return c; } catch { /* keep walking */ }
    dir = join(dir, "..");
  }
  throw new Error("could not locate public/ from " + HERE);
}
const RENDER = readFileSync(join(findPublic(), "city-render.js"), "utf8");

test("every fixed-size prop's footprint matches the geometry the renderer builds", () => {
  // Read the real constructor arguments out of city-render.js and compare. The
  // pairs below name the geometry call that DEFINES each prop; if that call
  // changes shape or disappears, this fails and says which.
  const CHECKS: Array<{ id: string; re: RegExp; foot: (n: number[]) => { w: number; d: number } }> = [
    // BoxGeometry(w, h, d) -> ground is w x d
    { id: "bench",      re: /BoxGeometry\(1\.8,\s*0\.45,\s*0\.55\)/,  foot: () => ({ w: 1.8, d: 0.55 }) },
    { id: "busShelter", re: /BoxGeometry\(3\.6,\s*2\.5,\s*1\.4\)/,    foot: () => ({ w: 3.6, d: 1.4 }) },
    { id: "container",  re: /BoxGeometry\(12,\s*2\.6,\s*2\.6\)/,      foot: () => ({ w: 12, d: 2.6 }) },
    { id: "railTie",    re: /BoxGeometry\(3\.2,\s*0\.35,\s*0\.42\)/,  foot: () => ({ w: 3.2, d: 0.42 }) },
    // CylinderGeometry(rTop, rBottom, h, ...) -> ground is the WIDER radius x2
    { id: "bin",        re: /CylinderGeometry\(0\.32,\s*0\.28,\s*1(?:\.0)?,/, foot: () => ({ w: 0.64, d: 0.64 }) },
    { id: "mooring",    re: /CylinderGeometry\(0\.22,\s*0\.28,\s*1,/,         foot: () => ({ w: 0.56, d: 0.56 }) },
    { id: "beacon",     re: /CylinderGeometry\(1\.4,\s*2\.0,\s*9,/,           foot: () => ({ w: 4.0, d: 4.0 }) },
    { id: "lampPost",   re: /CylinderGeometry\(0\.22,\s*0\.3,\s*9,/,          foot: () => ({ w: 0.6, d: 0.6 }) },
  ];

  const missing: string[] = [];
  const wrong: string[] = [];
  for (const c of CHECKS) {
    if (!c.re.test(RENDER)) {
      missing.push(
        `${c.id}: no geometry in city-render.js matches ${c.re}. Either the prop ` +
        `changed size and prop-manifest.js was not updated, or it moved and this ` +
        `check needs repointing. Do not "fix" this by deleting the check.`,
      );
      continue;
    }
    const want = c.foot([]);
    const got = PROPS[c.id].foot;
    if (!got || got.w !== want.w || got.d !== want.d) {
      wrong.push(`${c.id}: manifest says ${JSON.stringify(got)}, geometry says ${JSON.stringify(want)}`);
    }
  }
  assert.deepEqual(missing, [], missing.join("\n  "));
  assert.deepEqual(wrong, [], `prop-manifest.js disagrees with the geometry:\n  ${wrong.join("\n  ")}`);
});

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
