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
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { generateWorld as generateWorldReal } from "../public/city-plan.js";
import { LandField, makeHeightAt } from "../public/terrain.js";
import { WORLD_SCALE } from "../public/world-scale.js";
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
 *  world at a different WORLD.SIZE without editing the real source. */
function patchedWorldAt(scale: number) {
  const dir = mkdtempSync(join(tmpdir(), "origin-stability-"));
  cpSync(REPO_PUBLIC, dir, { recursive: true });
  const wsPath = join(dir, "world-scale.js");
  const patched = readFileSync(wsPath, "utf8")
    .replace(/export const WORLD_SCALE = [\d.]+;/, `export const WORLD_SCALE = ${scale};`);
  assert.notEqual(patched.indexOf(`WORLD_SCALE = ${scale};`), -1,
    "world-scale.js's WORLD_SCALE literal was not found to patch -- the file's shape changed");
  writeFileSync(wsPath, patched);
  return dir;
}

test("changing WORLD.SIZE moves the grid origin -- written to report this, not to fix it", {
  todo: "docs/audits/WORLD-DENSITY-FINDINGS.md §8 -- opening new land has no " +
    "operation that does not move the origin yet; this stays red on purpose " +
    "until one exists. Not skipped: it still runs and still prints the " +
    "measured drift every time the suite does.",
}, async () => {
  const dirSmaller = patchedWorldAt(WORLD_SCALE * 0.8);
  try {
    const { generateWorld: generateWorldSmaller, WORLD: WORLD_SMALLER } =
      await import(pathToFileURL(join(dirSmaller, "city-plan.js")).href);

    const heightAt = makeHeightAt(new LandField(16));
    const worldReal = generateWorldReal(heightAt);
    const worldSmaller = generateWorldSmaller(heightAt);

    // GRID.ORIGIN_X/ORIGIN_Z (city-plan.js) are `ISLAND.xMin`/`zMin` --
    // ISLAND is a landform extent, so it scales with WORLD_SCALE by
    // world-scale.js's own stated rule. There is no fixed, scale-
    // independent anchor a saved coordinate could be checked against.
    const plotReal = worldReal.plots[0], plotSmaller = worldSmaller.plots[0];

    // THE ACTUAL PROPERTY UNDER TEST: a known plot, same index, same seed,
    // before and after WORLD.SIZE changes. It is not expected to survive --
    // this assertion is written to go red and stay red until an "open new
    // land" operation exists that does not route through WORLD_SCALE. The
    // WORLD.SIZE values themselves (26,000 -> ~20,800 for a 0.8x change)
    // are reported for context, not asserted on separately -- of course a
    // deliberate WORLD_SCALE change moves SIZE; that is not the surprising
    // half of the finding, the moved PLOT COORDINATE is.
    assert.deepEqual(
      { xMin: plotReal.xMin, zMin: plotReal.zMin },
      { xMin: plotSmaller.xMin, zMin: plotSmaller.zMin },
      `plot[0] moved from (${plotReal.xMin.toFixed(1)}, ${plotReal.zMin.toFixed(1)}) to (${plotSmaller.xMin.toFixed(1)}, ${plotSmaller.zMin.toFixed(1)}) when WORLD.SIZE moved from ${worldReal.world.SIZE} to ${worldSmaller.world.SIZE} (WORLD_SCALE ${WORLD_SCALE} -> ${WORLD_SCALE * 0.8}) -- a saved build's coordinates would be silently wrong after opening new land, exactly the failure docs/audits/WORLD-DENSITY-FINDINGS.md §8 describes`,
    );
  } finally {
    rmSync(dirSmaller, { recursive: true, force: true });
  }
});

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
test("B2's own settlement boundaries: changing WORLD.SIZE does not move a single vertex -- a REAL passing assertion, not a todo", async () => {
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
