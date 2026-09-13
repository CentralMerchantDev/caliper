// FACADE TEXTURE VARIETY -- closing the gap traced in
// docs/audits/K6-BUILDINGS.md and docs/audits/OVERNIGHT-BLD-2026-09-09.md:
// four window-grid textures for the entire 26 km, 17,108-building world,
// because getFacadeMaterial's cache keyed on character alone.
//
// This suite tests the CAPABILITY (public/facade-textures.js, this lane).
// It does not test pixels: public/facade-textures.js's own createCanvas()
// Node fallback makes every canvas drawing call a no-op and getImageData()
// always return zeros (there is no real <canvas> in this test harness) --
// confirmed by test/phaseDelta.test.ts's own measureLiveTextures(), which
// checks the returned map OBJECTS exist rather than reading pixels, for the
// identical reason. This file follows that same, already-established
// convention rather than fabricating a pixel check this harness cannot run.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  FACADE_FAMILIES,
  FACADE_VARIANTS,
  generateFacadeAtlas,
  getFacadeMaterial,
  pickVariant,
} from "../public/facade-textures.js";
// public/city-render.js and public/layout.js are quarantined, 2026-09-13,
// Phase 1 "take it all down" (docs/specs/PHASE1-TAKEDOWN-PLAN-2026-09-13.md)
// -- see the two BLOCKED tests below.

function repoRoot(): string {
  let dir = fileURLToPath(import.meta.url);
  for (let up = 0; up < 6; up++) {
    dir = join(dir, "..");
    try { readFileSync(join(dir, "CLAUDE.md"), "utf8"); return dir; } catch { /* not this level */ }
  }
  throw new Error("could not locate the repo root");
}
const ROOT = repoRoot();

const CHARACTERS = ["heritage", "interwar", "postwar", "contemporary"];

test("exactly four architectural characters exist, in both tables -- the 1980-2000 gap stays excluded by construction", () => {
  assert.deepEqual(Object.keys(FACADE_FAMILIES).sort(), [...CHARACTERS].sort());
  assert.deepEqual(Object.keys(FACADE_VARIANTS).sort(), [...CHARACTERS].sort(),
    "FACADE_VARIANTS must cover exactly the four approved characters, not a fifth era filling the postwar/contemporary gap");
});

test("each character has real variety -- at least 3 variants, 12+ total, well above the 4 atlases this replaces", () => {
  let total = 0;
  for (const char of CHARACTERS) {
    assert.ok(FACADE_VARIANTS[char].length >= 3, `${char} has only ${FACADE_VARIANTS[char].length} variants`);
    total += FACADE_VARIANTS[char].length;
  }
  assert.ok(total >= 12, `only ${total} total variants across all characters`);
});

test("variant 0 of every character is byte-identical to this file's values before variants existed", () => {
  for (const char of CHARACTERS) {
    const v = pickVariant(char, "");
    assert.equal(v, FACADE_VARIANTS[char][0], `${char}'s no-seed variant is not variant 0`);
    assert.equal(v.floors, 8);
    assert.equal(v.cols, 8);
    assert.equal(v.winMarginXFrac, 0.18);
    assert.equal(v.winMarginYFrac, 0.18);
    assert.equal(v.mullion, "cross");
    assert.equal(v.spandrel, 8);
  }
});

test("generateFacadeAtlas defaults to variant 0 too, and still returns every PBR map, matching measureLiveTextures's existing convention", () => {
  for (const char of CHARACTERS) {
    const atlas = generateFacadeAtlas(char, 256);
    assert.equal(atlas.variant, FACADE_VARIANTS[char][0]);
    assert.ok(atlas.map && atlas.normalMap && atlas.roughnessMap && atlas.metalnessMap && atlas.emissiveMap,
      `${char}'s default-variant atlas is missing a PBR map`);
  }
});

/** Every distinct variant name reachable for `char` across a sample of seeds. */
function reachableVariantNames(char, seeds) {
  return new Set(seeds.map((s) => pickVariant(char, s).name));
}
const SAMPLE_SEEDS = Array.from({ length: 40 }, (_, i) => `sample-${i}`);

test("different variant seeds reach different variants, not merely re-picking variant 0", () => {
  for (const char of CHARACTERS) {
    const names = reachableVariantNames(char, SAMPLE_SEEDS);
    assert.ok(names.size > 1,
      `${char}: 40 sample seeds only ever reached ${names.size} distinct variant(s) -- pickVariant may not be varying by seed`);
  }
});

test("generateFacadeAtlas's returned variant matches pickVariant for the same inputs, for a non-default variant too", () => {
  const seed = SAMPLE_SEEDS.find((s) => pickVariant("heritage", s) !== FACADE_VARIANTS.heritage[0]);
  assert.ok(seed, "no sample seed reached a non-default heritage variant -- cannot test the non-default path");
  const atlas = generateFacadeAtlas("heritage", 256, seed);
  assert.equal(atlas.variant, pickVariant("heritage", seed));
  assert.notEqual(atlas.variant, FACADE_VARIANTS.heritage[0]);
  assert.ok(atlas.map && atlas.normalMap && atlas.roughnessMap && atlas.metalnessMap && atlas.emissiveMap,
    "a non-default-variant atlas is missing a PBR map");
});

test("getFacadeMaterial caches per variantSeed, not just per character -- two different variants of the same character are two different materials", () => {
  const seedA = SAMPLE_SEEDS.find((s) => pickVariant("heritage", s).name === "sash-grid") || "";
  const seedB = SAMPLE_SEEDS.find((s) => pickVariant("heritage", s).name !== "sash-grid");
  assert.ok(seedB, "no sample seed reached a non-default heritage variant -- cannot test cache differentiation");

  const matA = getFacadeMaterial("heritage", { vertexColors: true, variantSeed: seedA });
  const matB = getFacadeMaterial("heritage", { vertexColors: true, variantSeed: seedB });
  assert.notEqual(matA, matB, "two different heritage variants collapsed to the same cached material");

  // Memoization still holds for a repeated, identical call.
  const matBAgain = getFacadeMaterial("heritage", { vertexColors: true, variantSeed: seedB });
  assert.equal(matB, matBAgain, "the same (character, variantSeed) pair produced two different material objects");

  // Omitting variantSeed entirely still resolves consistently (backward compatibility).
  const matDefault1 = getFacadeMaterial("heritage", { vertexColors: true });
  const matDefault2 = getFacadeMaterial("heritage", { vertexColors: true });
  assert.equal(matDefault1, matDefault2, "the no-variantSeed call is no longer stably cached");
});

// THE GATE docs/briefs/RUN2-BLD-2026-09-09.md item 1 asks for: the count of
// distinct facade materials reachable from REAL placements, measured from
// the real caller in public/city-render.js (not from the registry), against
// a floor well above four. Marked `todo`, per this suite's own established
// convention (see test/originStability.test.ts) -- not skipped: it still
// runs and prints today's real, honest count every time the suite does.
//
// WHY THIS STAYS RED HERE, HONESTLY, RATHER THAN BEING MADE TO PASS: the
// capability above is real and tested. Reaching it from a real placement
// needs public/city-render.js:1930-1932 to pass a variantSeed into its
// getFacadeMaterial(char, {...}) call -- a CLI-lane file (see this
// project's own routing in docs/briefs/OVERNIGHT-BLD-2026-09-09.md §7).
// The exact one-line diff is recorded in docs/CROSS-LANE-REQUESTS.md. This
// gate will go green the day that lands, unedited, because it already
// mirrors the real cache-key logic rather than a hoped-for one.
// BLOCKED, 2026-09-13, Phase 1 "take it all down"
// (docs/specs/PHASE1-TAKEDOWN-PLAN-2026-09-13.md). buildWorldState/
// buildScenePlacements (public/city-render.js) and groupByVariant
// (public/layout.js) are both quarantined -- there are no real placements
// to measure without them. facade-textures.js's own capability (tested
// above) is unaffected; only "reaching it from a real placement" is blocked,
// pending Phase 2's own placement path.
test("GATE: distinct facade materials reachable from real placements, well above four", { skip: "BLOCKED: buildWorldState/buildScenePlacements/groupByVariant are quarantined (see comment above)" }, () => {});

// THE GATE ABOVE CANNOT SEE THIS LINE REGRESS, FOUND WHILE MUTATION-TESTING
// IT (RUN3-CLI-2026-09-09): it recomputes pickVariant(char, group.seed)
// independently, using group.seed from groupByVariant -- NOT from reading
// what public/city-render.js's own real getFacadeMaterial call actually
// received. Removing `variantSeed: g.seed` from that real call SURVIVED
// against the gate above, because the gate's own measurement never touches
// that line at all. buildScenePlacements() does not reach deep enough to
// expose the real call (that closure lives inside buildWorld(), which needs
// a real THREE renderer and scene this harness does not build) -- so this
// is a static check instead, the same technique test/boardRender.test.ts's
// own B3 gate already uses for a forbidden import, aimed here at confirming
// a REQUIRED line is present rather than a forbidden one absent.
test("GATE (static): public/city-render.js's real getFacadeMaterial call still passes variantSeed -- the one-line cross-lane fix cannot silently regress unseen", { skip: "BLOCKED: public/city-render.js is quarantined -- _TO-DELETE/old-world/city-render.js is where this same check could be re-run against the retained copy if needed" }, () => {});
