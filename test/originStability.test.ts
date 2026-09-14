// THE ORIGIN MUST NEVER MOVE -- WRITTEN, NOT FIXED, PER WORLD-REBALANCE-
// BRIEF.md STEP 5.
//
// docs/audits/WORLD-DENSITY-FINDINGS.md §8: "a saved build is a coordinate.
// If opening new land ever shifts the origin, every world anyone has ever
// built is silently wrong." Mark's requirement is that 26 km is the world
// NOW, not the world forever -- so WORLD.SIZE must someday be able to grow,
// and grid.js's own documented design is exactly this: "regions that are
// not open yet are LOCKED, which is a different thing from absent." The
// property that design depends on: opening more land must never re-centre,
// re-scale or re-index the ground that is already open.
//
// THE PROBLEM WRITING THIS TEST RAN INTO, NAMED RATHER THAN WORKED AROUND:
// WORLD.SIZE has exactly one lever today, WORLD_SCALE (public/world-scale.js,
// a hardcoded module constant, not a runtime parameter) -- and WORLD_SCALE
// is a LANDFORM rescale, not a boundary EXTENSION. Its own file is explicit:
// "SCALES: landform metres... coastlines, terrain heights..." Changing it
// does not open new land at a fixed origin; it redraws the whole world
// smaller or larger around whatever the island's own bounds resolve to.
// That is the only size change the current code can actually perform, so it
// is what this test performs -- not because it is the operation Mark's
// requirement describes, but because it is the closest real lever that
// exists, and the origin's dependency on it is exactly what needs to be
// known before a real "open new land" operation is designed.
//
// HOW: generateWorld() is regenerated from a SECOND, independent copy of
// public/, patched to a different WORLD_SCALE, rather than the real
// checkout -- so this test changes nothing in the actual source and cannot
// leave a stray edit behind if interrupted.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { WORLD_SCALE } from "../public/world-scale.js";
// public/city-plan.js is quarantined, 2026-09-13, Phase 1 "take it all down"
// (docs/specs/PHASE1-TAKEDOWN-PLAN-2026-09-13.md) -- generateWorld no longer
// exists, and a patched copy of public/ (this file's own technique, below)
// has nothing to copy either. See the BLOCKED test.
function findPublic(): string {
  let dir = fileURLToPath(import.meta.url);
  for (let i = 0; i < 5; i++) {
    dir = join(dir, "..");
    const candidate = join(dir, "public");
    try {
      if (readFileSync(join(candidate, "world-scale.js"))) return candidate;
    } catch {}
  }
  return join(process.cwd(), "public");
}
const REPO_PUBLIC = findPublic();

/** A second, disposable copy of public/, with world-scale.js's WORLD_SCALE
 *  patched to a different value -- the only way to actually regenerate the
 *  world at a different WORLD.SIZE without editing the real source.
 *
 *  Created UNDER THE REPO ROOT, not the OS tmpdir -- found while wiring
 *  decision-5 step 2 (board-generator.js gained a real import of
 *  roadkit.js, which itself imports the "three" npm package): Node's own
 *  module resolution for a bare specifier ("three") walks UP from the
 *  importing file looking for node_modules, and a copy placed in the OS
 *  tmpdir has no ancestor node_modules at all, so any module this copy
 *  transitively imports that needs an npm package fails with
 *  ERR_MODULE_NOT_FOUND -- a real, previously-undiscovered failure mode of
 *  this test's own copy-and-patch technique, not specific to roadkit.js.
 *  A copy placed directly under the repo root resolves "three" the same
 *  way the real public/ directory always has (repoRoot/node_modules), with
 *  no other change to the technique. */
function patchedWorldAt(scale: number) {
  const dir = mkdtempSync(join(REPO_PUBLIC, "..", "origin-stability-"));
  cpSync(REPO_PUBLIC, dir, { recursive: true });
  const wsPath = join(dir, "world-scale.js");
  const patched = readFileSync(wsPath, "utf8")
    .replace(/export const WORLD_SCALE = [\d.]+;/, `export const WORLD_SCALE = ${scale};`);
  assert.notEqual(patched.indexOf(`WORLD_SCALE = ${scale};`), -1,
    "world-scale.js's WORLD_SCALE literal was not found to patch -- the file's shape changed");
  writeFileSync(wsPath, patched);
  return dir;
}

test("changing WORLD.SIZE moves the grid origin -- written to report this, not to fix it", { skip: "BLOCKED: needs public/city-plan.js's generateWorld, quarantined 2026-09-13, Phase 1 'take it all down' (docs/specs/PHASE1-TAKEDOWN-PLAN-2026-09-13.md); the patched-copy technique above has nothing to copy either" }, async () => {});

// B2.3: THE SAME PROPERTY, AS A REAL PASSING ASSERTION FOR B2's OWN
// GENERATOR, NOT A TODO.
//
// docs/specs/BOARD-REBUILD-PLAN.md's B2.1 contract: never derive a
// coordinate origin from island/mainland bounds or WORLD.SIZE -- call
// grid.js's atomOf/atomOrigin/atomCentre on absolute world metres
// exclusively.
//
// WHAT THIS DOES NOT CLAIM, FOUND WHILE WRITING IT: a first version of
// this test compared every PLACED PIECE (roads, buildings) between the two
// scales and expected zero to move. That is a stronger, different, and
// actually FALSE claim -- measured directly: heightAt(-9244, -7972) is
// 125.95 m at WORLD_SCALE 0.65 and 1,306.96 m at 0.52. WORLD_SCALE reshapes
// the real terrain height field at a fixed world position by design
// (world-scale.js's own header: "the same city covers far more of it" by
// shrinking the LAND, not by a camera zoom that leaves it identical) --
// so a road or building whose placement depends on real slope/elevation
// CANNOT be expected to land the same way at a different scale, and
// promising that would contradict WORLD_SCALE's own documented purpose.
// That is not what B2.1's contract promised either: it promised no
// coordinate ORIGIN is derived from landform bounds, not that the whole
// generated city is scale-invariant.
//
// THE PROPERTY THAT IS TRUE, AND IS WHAT THE CONTRACT ACTUALLY PROMISED:
// every settlement BOUNDARY -- pure geometry (a landmass's own real
// coastline, grid.js's atomOf/atomOrigin, no heightAt dependency at all) --
// is identical whether WORLD_SCALE is 0.65 or 0.52. Checked directly
// against public/board-generator.js's own settlementBoundaries(), the
// function every piece's own atom grid is anchored against. This is not
// asserted for city-plan.js's own plots (the test above stays exactly as
// it is, still red-on-purpose, still describing a real, unfixed defect in
// a generator B2 replaces) -- only for B2's own boundaries.
//
// BLOCKED, 2026-09-13, board takedown (Mark's ruling: "the b1-board board
// code is not a foundation... it comes out"). public/board-generator.js is
// quarantined to _TO-DELETE/b1-board/, so the dynamic import below has
// nothing to load. Not retired: the property itself -- geometry anchored
// to grid.js's atomOf/atomOrigin must not drift when WORLD_SCALE changes --
// is not specific to the b1-board generator being torn out; Phase 2's own
// generator will need to satisfy the identical contract, and this is the
// one real, passing proof this codebase ever had of it.
test("B2's own settlement boundaries: changing WORLD.SIZE does not move a single vertex -- a REAL passing assertion, not a todo", { skip: "BLOCKED: public/board-generator.js is quarantined; nothing for the dynamic import below to load (see comment above)" }, async () => {
  const dirSmaller = patchedWorldAt(WORLD_SCALE * 0.8);
  try {
    const { settlementBoundaries: boundariesSmaller } =
      await import(pathToFileURL(join(dirSmaller, "board-generator.js")).href);
    const { settlementBoundaries: boundariesReal } = await import("../public/board-generator.js");

    const real = boundariesReal();
    const smaller = boundariesSmaller();
    assert.ok(real.length >= 5, `sanity: expected several settled landmasses, got ${real.length}`);
    assert.equal(real.length, smaller.length, "a different number of settlement boundaries exists at a different WORLD_SCALE");

    const smallerById = new Map(smaller.map((b) => [b.id, b]));
    let maxDelta = 0, worst = null;
    for (const b of real) {
      const other = smallerById.get(b.id);
      assert.ok(other, `boundary "${b.id}" does not exist at the smaller scale`);
      assert.equal(b.polygon.length, other.polygon.length, `"${b.id}" has a different vertex count at the smaller scale`);
      for (let i = 0; i < b.polygon.length; i++) {
        const d = Math.hypot(b.polygon[i][0] - other.polygon[i][0], b.polygon[i][1] - other.polygon[i][1]);
        if (d > maxDelta) { maxDelta = d; worst = { id: b.id, i, real: b.polygon[i], smaller: other.polygon[i] }; }
      }
    }
    assert.ok(maxDelta < 1e-6,
      `a settlement boundary vertex moved ${maxDelta.toFixed(3)} m when WORLD_SCALE changed ${WORLD_SCALE} -> ${WORLD_SCALE * 0.8}: ${JSON.stringify(worst)} -- ` +
      `a saved build's settlement geometry would be silently wrong after opening new land`);
  } finally {
    rmSync(dirSmaller, { recursive: true, force: true });
  }
});
