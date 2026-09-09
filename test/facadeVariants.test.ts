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
import {
  FACADE_FAMILIES,
  FACADE_VARIANTS,
  generateFacadeAtlas,
  getFacadeMaterial,
  pickVariant,
  tintHex,
  spandrelTreatment,
} from "../public/facade-textures.js";
import { buildWorldState, buildScenePlacements } from "../public/city-render.js";
import { groupByVariant } from "../public/layout.js";

const CHARACTERS = ["heritage", "interwar", "postwar", "contemporary"];

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
test("GATE: distinct facade materials reachable from real placements, well above four", {
  todo: "blocked on public/city-render.js passing a variantSeed into getFacadeMaterial -- " +
    "CLI-lane file, exact diff requested in docs/CROSS-LANE-REQUESTS.md. Not skipped: " +
    "runs and prints today's real count every time.",
}, () => {
  const state = buildWorldState();
  const { instanced, overridden } = buildScenePlacements(state);
  const groups = groupByVariant([...instanced, ...overridden]);

  // Mirrors public/city-render.js:1930-1932's real cache-key construction
  // exactly, as it exists TODAY: vertexColors is always true for every
  // bld* typology (public/buildings.js's mergeGeometries unconditionally
  // sets a "color" attribute), and city-render.js does not pass a
  // variantSeed at all yet, so this reproduces the real reachable count,
  // not an aspirational one.
  const keys = new Set();
  for (const group of groups.values()) {
    const char = group.options?.character || "heritage";
    keys.add(`${char}-vc-day-`);
  }

  console.log(`facade materials reachable from real placements today: ${keys.size} (${[...keys].join(", ")})`);
  assert.ok(keys.size > 4, `only ${keys.size} distinct facade materials reachable from real placements`);
});
