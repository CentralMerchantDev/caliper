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
import { stripSourceComments } from "./stripSourceComments.ts";
import {
  FACADE_FAMILIES,
  FACADE_VARIANTS,
  generateFacadeAtlas,
  getFacadeMaterial,
  pickVariant,
  tintHex,
  spandrelTreatment,
  floorLayout,
} from "../public/facade-textures.js";
import { buildWorldState, buildScenePlacements } from "../public/city-render.js";
import { groupByVariant } from "../public/layout.js";

const CHARACTERS = ["heritage", "interwar", "postwar", "contemporary"];

function repoRoot() {
  let dir = fileURLToPath(import.meta.url);
  for (let up = 0; up < 6; up++) {
    dir = join(dir, "..");
    try { readFileSync(join(dir, "CLAUDE.md"), "utf8"); return dir; } catch { /* not this level */ }
  }
  throw new Error("could not locate the repo root");
}
const ROOT = repoRoot();

test("exactly four architectural characters exist, in both tables -- the 1980-2000 gap stays excluded by construction", () => {
  assert.deepEqual(Object.keys(FACADE_FAMILIES).sort(), [...CHARACTERS].sort());
  assert.deepEqual(Object.keys(FACADE_VARIANTS).sort(), [...CHARACTERS].sort(),
    "FACADE_VARIANTS must cover exactly the four approved characters, not a fifth era filling the postwar/contemporary gap");
});

test("each character has real variety -- at least 4 variants, 16+ total, well above the 4 atlases this replaces", () => {
  let total = 0;
  for (const char of CHARACTERS) {
    assert.ok(FACADE_VARIANTS[char].length >= 4, `${char} has only ${FACADE_VARIANTS[char].length} variants`);
    total += FACADE_VARIANTS[char].length;
  }
  assert.ok(total >= 16, `only ${total} total variants across all characters`);
});

test("RUN3: tintHex scales an RGB colour and clamps to valid bytes", () => {
  assert.equal(tintHex("#804020", 1), "rgb(128, 64, 32)");
  assert.equal(tintHex("#804020", 0.5), "rgb(64, 32, 16)");
  assert.equal(tintHex("#804020", 2), "rgb(255, 128, 64)", "must clamp at 255, not overflow or wrap");
  assert.equal(tintHex("#000000", 5), "rgb(0, 0, 0)", "zero stays zero regardless of factor");
});

test("RUN3: spandrelTreatment gives metal variants real PBR values, not just a different diffuse colour", () => {
  const spec = { stoneTrim: "#d4cbbe", roughnessTrim: 0.75 };
  const stone = spandrelTreatment({ spandrelMaterial: "stone" }, spec, 10);
  assert.equal(stone.diffuse, spec.stoneTrim);
  assert.equal(stone.roughByte, Math.round(0.75 * 255));
  assert.equal(stone.metalByte, 10, "stone must pass through the wall's own metalness byte unchanged");

  const metal = spandrelTreatment({ spandrelMaterial: "metal" }, spec, 10);
  assert.notEqual(metal.diffuse, spec.stoneTrim, "metal must not reuse the stone diffuse colour");
  assert.ok(metal.roughByte < stone.roughByte, "metal must be smoother (lower roughness) than stone");
  assert.ok(metal.metalByte > stone.metalByte, "metal must be more metallic than the wall's own metalness byte");

  const omitted = spandrelTreatment({}, spec, 10);
  assert.deepEqual(omitted, stone, "omitting spandrelMaterial must default to stone -- every RUN2 variant relies on this");
});

test("RUN4: floorLayout gives every floor an equal share when groundFloorMult is omitted, matching this file's original size/floors behaviour", () => {
  const floors = 8, size = 1024;
  const { top, height } = floorLayout({}, floors, size);
  const expectedH = size / floors;
  for (let f = 0; f < floors; f++) {
    assert.equal(height(f), expectedH, `floor ${f} height should be size/floors when groundFloorMult is omitted`);
    assert.equal(top(f), f * expectedH, `floor ${f} top should be f * size/floors when groundFloorMult is omitted`);
  }
});

test("RUN4: floorLayout gives the ground floor (the last index) real extra height when groundFloorMult > 1, and every floor still tiles exactly to `size`", () => {
  const floors = 8, size = 1024, groundFloorMult = 1.6;
  const { top, height } = floorLayout({ groundFloorMult }, floors, size);
  const upperFloorH = height(0);
  const groundFloorH = height(floors - 1);
  assert.ok(groundFloorH > upperFloorH, `ground floor (${groundFloorH}) should be taller than an upper floor (${upperFloorH})`);
  assert.ok(Math.abs(groundFloorH / upperFloorH - groundFloorMult) < 1e-9, "ground floor should be exactly groundFloorMult times an upper floor's height");
  // Every floor's [top, top+height) span must tile the atlas exactly, no
  // gaps and no overlap -- the property that actually matters for
  // painting, not just that the ground floor number looks bigger.
  for (let f = 0; f < floors - 1; f++) {
    assert.ok(Math.abs((top(f) + height(f)) - top(f + 1)) < 1e-9, `floor ${f} must end exactly where floor ${f + 1} begins`);
  }
  assert.ok(Math.abs((top(floors - 1) + height(floors - 1)) - size) < 1e-9, "the ground floor must end exactly at the atlas edge");
});

test("RUN4: at least one variant per character has real storey-height variation (a taller ground floor), applied to an existing variant, not a new 17th one", () => {
  // Deliberately NOT adding a fifth variant per character here -- item 2's
  // own caution (a seventeenth variant is worth less than knowing whether
  // the existing ones read as variety at all) applies just as much to a
  // sixth. This adds depth to already-existing, already-counted variants.
  for (const char of CHARACTERS) {
    assert.equal(FACADE_VARIANTS[char].length, 4, `${char} should still have exactly 4 variants -- this axis extends existing ones, it does not add a new one`);
    const hasGroundFloorVariation = FACADE_VARIANTS[char].some((v) => (v.groundFloorMult ?? 1) !== 1);
    assert.ok(hasGroundFloorVariation, `${char} has no variant with a storey-height (groundFloorMult) variation`);
  }
});

test("RUN3: at least one variant per character varies glass/frame tint or spandrel material, not just floor count and mullion", () => {
  // RUN2 shipped floor count, window proportion, and mullion style. RUN3
  // closes docs/audits/K6-BUILDINGS.md item 2's own named remaining gap:
  // "no equivalent variety in window-frame colour or glass tint."
  for (const char of CHARACTERS) {
    const variesColour = FACADE_VARIANTS[char].some(
      (v) => v.spandrelMaterial === "metal" || (v.glassTint ?? 1) !== 1 || (v.frameTint ?? 1) !== 1,
    );
    assert.ok(variesColour, `${char} has no variant with spandrel material or glass/frame tint variety`);
  }
});

test("RUN3: glassTint/frameTint/spandrelMaterial default to unchanged on every RUN2 variant (variant 0-2), preserving RUN2's exact output", () => {
  for (const char of CHARACTERS) {
    for (const v of FACADE_VARIANTS[char].slice(0, 3)) {
      assert.equal(v.spandrelMaterial ?? "stone", "stone", `${char}/${v.name} should default to a stone spandrel`);
      assert.equal(v.glassTint ?? 1, 1, `${char}/${v.name} should default to no glass tint`);
      assert.equal(v.frameTint ?? 1, 1, `${char}/${v.name} should default to no frame tint`);
    }
  }
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
// a floor well above four. Un-marked from `todo` at the 2026-09-11
// b1-land -> codex-lane merge: public/city-render.js now passes a real
// variantSeed into getFacadeMaterial on this branch (see the static gate
// below), so this dynamic gate is expected to actually measure it.
//
// CORRECTED AT THE SAME MERGE (CLI lane, RUN3-CLI-2026-09-09, found by
// mutation-testing the gate itself): this test's own key construction had a
// real bug that would have kept it reporting 4 forever, even after
// city-render.js's fix landed. It hardcoded `${char}-vc-day-` with nothing
// after the trailing dash for every group, so every key collapsed to one of
// four fixed strings regardless of which variant a placement actually
// picked -- confirmed by running it against the fix and still getting 4,
// all four keys ending in the same empty dash. The real cache key
// (public/facade-textures.js's own getFacadeMaterial) is keyed on the raw
// variantSeed, which is unique per variant GROUP by construction
// (groupByVariant keys groups by seedFor(...)) -- "distinct raw keys" would
// trivially equal "number of groups" (thousands), not a meaningful
// measurement of "distinct facade MATERIALS" either. What the gate's own
// title actually asks is the number of distinct (character, picked-variant)
// pairs reached: pickVariant(character, group.seed) is the exact selection
// getFacadeMaterial's own atlas generation makes internally, so keying on
// that measures the real, reachable outcome, bounded by 4 characters times
// each character's own variant count -- well above four, per this file's
// own 16+ total.
test("GATE: distinct facade materials reachable from real placements, well above four", () => {
  const state = buildWorldState();
  const { instanced, overridden } = buildScenePlacements(state);
  const groups = groupByVariant([...instanced, ...overridden]);

  const keys = new Set();
  for (const group of groups.values()) {
    const char = group.options?.character || "heritage";
    const variant = pickVariant(char, group.seed);
    keys.add(`${char}-${variant.name}`);
  }

  console.log(`facade materials reachable from real placements today: ${keys.size} (${[...keys].join(", ")})`);
  assert.ok(keys.size > 4, `only ${keys.size} distinct facade materials reachable from real placements`);
});

// THE GATE ABOVE CANNOT SEE THIS LINE REGRESS (CLI lane, RUN3-CLI-2026-09-09,
// found while mutation-testing it): it recomputes pickVariant(char,
// group.seed) independently, using group.seed from groupByVariant -- NOT
// from reading what public/city-render.js's own real getFacadeMaterial call
// actually received. Removing `variantSeed: g.seed` from that real call
// SURVIVED against the gate above, because the gate's own measurement never
// touches that line at all. buildScenePlacements() does not reach deep
// enough to expose the real call (that closure lives inside buildWorld(),
// which needs a real THREE renderer and scene this harness does not build)
// -- so this is a static check instead, the same technique
// test/boardRender.test.ts's own B3 gate already uses for a forbidden
// import, aimed here at confirming a REQUIRED line is present rather than a
// forbidden one absent.
test("GATE (static): public/city-render.js's real getFacadeMaterial call still passes variantSeed -- the one-line cross-lane fix cannot silently regress unseen", () => {
  // Stripped before matching -- this checks a REQUIRED line is PRESENT
  // (the risky direction: a comment mentioning the call would satisfy the
  // regex too), not an absence check. test/rawSourceScan.test.ts's own
  // category gate (F4, 2026-09-11) caught this exact file for exactly this
  // reason when the merge carried the check over from b1-land.
  const src = stripSourceComments(readFileSync(join(ROOT, "public", "city-render.js"), "utf8"));
  assert.match(
    src,
    /getFacadeMaterial\(char,\s*\{[^}]*variantSeed:\s*g\.seed[^}]*\}\)/s,
    "public/city-render.js no longer passes variantSeed: g.seed into its real getFacadeMaterial call -- the dynamic gate above cannot see this regression, only this static check can",
  );
});
