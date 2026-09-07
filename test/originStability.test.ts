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

test("changing WORLD.SIZE moves the grid origin -- written to report this, not to fix it", async () => {
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
