// THE LAYOUT ENGINE — tests for the decisions, not for the geometry.
//
// `public/layout.js` decides what stands on each plot. It has no three.js in it
// on purpose, so all of this runs as plain arithmetic over plain objects and can
// be mutation-tested rather than eyeballed in a screenshot.
//
// The tests that matter most here are the three ANTI-CLONE decisions, because
// those are the ones where the WRONG implementation is shorter, passes a naive
// test, and only shows up when you look at the city from the air. Each is tested
// with a control that would fail if the decision were reverted to the obvious
// version.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CHARACTERS,
  FOUNDATION_FOR_VERDICT,
  TYPOLOGIES_FOR_CLASS,
  hash01,
  weightedPick,
  rowPositionAt,
  cornerAt,
  characterFor,
  terraceUnitsFor,
  typologyFor,
  situationOf,
  planPlot,
  planBlock,
  planCity,
  variantKeyOf,
  groupByVariant,
} from "../public/layout.js";
import { generateWorld, PLOT_CLASSES } from "../public/city-plan.js";
import { assessFootprint } from "../public/footprint.js";
import { LandField, makeHeightAt } from "../public/terrain.js";

// ---------------------------------------------------------------------------
// Fixtures: plots shaped exactly as `subdivideBlock` emits them.
// ---------------------------------------------------------------------------

function plotAt(blockId: string, i: number, row = "", className = "TERRACE", x = 0) {
  const xMin = x + i * 12;
  return {
    id: `${blockId}-p${i}${row}`,
    blockId,
    districtId: "downtown",
    className,
    xMin,
    xMax: xMin + 12,
    zMin: 0,
    zMax: 30,
    width: 12,
    depth: 30,
    buildable: { xMin: xMin + 0, xMax: xMin + 12, zMin: 3, zMax: 26 },
  };
}

function rowOf(n: number, blockId = "block-0-0", row = "", className = "TERRACE") {
  return Array.from({ length: n }, (_, i) => plotAt(blockId, i, row, className));
}

const allSlab = () => "slab";

// ONE WORLD, BUILT ONCE, SHARED BY EVERY REAL-WORLD TEST BELOW.
//
// Each of these tests used to call generateWorld itself. Six builds at about
// 3.7 seconds each is 22 seconds of suite time spent re-proving determinism
// that cityWorld.test.ts already proves by sha256. The world is a pure function
// of its height field, so one is the same as six.
const realHeightAt = makeHeightAt(new LandField(16));
const realWorld = generateWorld(realHeightAt);
const realVerdictFor = (plot: any) => {
  const b = plot.buildable || plot;
  return assessFootprint(realHeightAt, { xMin: b.xMin, xMax: b.xMax, zMin: b.zMin, zMax: b.zMax }).verdict;
};


// ---------------------------------------------------------------------------
// Row position and corners
// ---------------------------------------------------------------------------

test("the ends of a row are ends, and the middle is middle", () => {
  assert.equal(rowPositionAt(0, 5), "end-left");
  assert.equal(rowPositionAt(1, 5), "middle");
  assert.equal(rowPositionAt(3, 5), "middle");
  assert.equal(rowPositionAt(4, 5), "end-right");
});

test("a row of one is DETACHED, not an end unit", () => {
  // The whole point of an end unit is that it has a party wall on one side. A
  // lone building given "end-left" would carry a blank party wall facing an
  // empty plot -- visible from the street as a windowless flank on a detached
  // house, which is the exact seam the row variants exist to remove.
  assert.equal(rowPositionAt(0, 1), "detached");
  assert.equal(cornerAt(0, 1), "none");
});

test("nonsense indices are detached rather than throwing or indexing off the end", () => {
  assert.equal(rowPositionAt(-1, 5), "detached");
  assert.equal(rowPositionAt(5, 5), "detached");
  assert.equal(rowPositionAt(0, 0), "detached");
  assert.equal(rowPositionAt(NaN, 5), "detached");
});

test("only the ends of a row turn a corner", () => {
  assert.equal(cornerAt(0, 4), "left");
  assert.equal(cornerAt(1, 4), "none");
  assert.equal(cornerAt(2, 4), "none");
  assert.equal(cornerAt(3, 4), "right");
});

// ---------------------------------------------------------------------------
// ANTI-CLONE 1 — character is per block
// ---------------------------------------------------------------------------

test("every building on a block shares one architectural character", () => {
  const block = "block-100-200";
  const chars = new Set(rowOf(12, block).map((p) => characterFor(p.blockId, p.districtId)));
  assert.equal(
    chars.size,
    1,
    "buildings on one block disagreed about their era -- character is being rolled per building, " +
      "which averages every street to the same mix and is the defect this is written against",
  );
});

test("but different blocks genuinely differ -- all four characters appear across a city", () => {
  // The failure mode on the other side is a hash so weak that every block lands
  // on one character. Measure the spread rather than asserting it exists.
  const seen: Record<string, number> = {};
  for (let x = 0; x < 40; x++) {
    for (let z = 0; z < 10; z++) {
      const c = characterFor(`block-${x * 130}-${z * 130}`, "downtown");
      seen[c] = (seen[c] || 0) + 1;
    }
  }
  assert.deepEqual(
    Object.keys(seen).sort(),
    [...CHARACTERS].sort(),
    `not every character appeared across 400 blocks: ${JSON.stringify(seen)}`,
  );
  // No character should take more than half the city. Four even buckets is 25%
  // each; 50% is a generous ceiling that still catches a badly skewed hash.
  for (const [c, n] of Object.entries(seen)) {
    assert.ok(n < 200, `character "${c}" took ${n} of 400 blocks -- the hash is skewed`);
  }
});

test("character is stable across reloads -- the same block is the same era forever", () => {
  const a = characterFor("block-42-42", "downtown");
  for (let i = 0; i < 50; i++) {
    assert.equal(characterFor("block-42-42", "downtown"), a);
  }
});

test("a district shifts the draw, so two districts are not the same street twice", () => {
  // Same block id, different district, should be free to differ -- otherwise the
  // districtId argument is decoration. Check across many ids that it changes at
  // least some of them.
  let differ = 0;
  for (let i = 0; i < 200; i++) {
    const id = `block-${i}-0`;
    if (characterFor(id, "downtown") !== characterFor(id, "seawall")) differ++;
  }
  assert.ok(differ > 0, "districtId never changed the character -- it is being ignored");
});

// ---------------------------------------------------------------------------
// The hash and the picker
// ---------------------------------------------------------------------------

test("hash01 is deterministic, bounded, and spread", () => {
  assert.equal(hash01("abc"), hash01("abc"));
  assert.notEqual(hash01("abc"), hash01("abd"));
  const xs = Array.from({ length: 2000 }, (_, i) => hash01(`k${i}`));
  for (const v of xs) assert.ok(v >= 0 && v < 1, `hash01 out of range: ${v}`);
  // Ten buckets over 2000 samples: every bucket should be occupied. A hash that
  // collapses to a few values passes the range check and fails this.
  const buckets = new Set(xs.map((v) => Math.floor(v * 10)));
  assert.equal(buckets.size, 10, `hash01 only reached ${buckets.size} of 10 buckets`);
});

test("weightedPick respects the weights and never returns undefined", () => {
  const opts = [{ typology: "a", weight: 9 }, { typology: "b", weight: 1 }];
  let a = 0;
  for (let i = 0; i < 1000; i++) if (weightedPick(opts, i / 1000).typology === "a") a++;
  assert.ok(a > 850 && a < 950, `9:1 weighting produced ${a}/1000 -- not the declared ratio`);

  // The boundaries, where an off-by-one in the accumulator shows up.
  assert.ok(weightedPick(opts, 0) !== undefined);
  assert.ok(weightedPick(opts, 0.999999) !== undefined);
  assert.ok(weightedPick(opts, 1) !== undefined, "roll of exactly 1 fell off the end of the table");
  assert.ok(weightedPick([{ typology: "z", weight: 0 }], 0.5) !== undefined, "an all-zero table returned nothing");
});

// ---------------------------------------------------------------------------
// The verdict/foundation vocabulary join
// ---------------------------------------------------------------------------

test('the "terrace" VERDICT maps to a stepped foundation, not to a terrace typology', () => {
  // The one genuinely dangerous word in this system: footprint.js's "terrace"
  // verdict means stepping ground, and "bld-terrace" means a row of houses.
  assert.equal(FOUNDATION_FOR_VERDICT.terrace, "stepped");
  assert.equal(FOUNDATION_FOR_VERDICT.slab, "slab");
  assert.equal(FOUNDATION_FOR_VERDICT.plinth, "plinth");
  assert.equal(FOUNDATION_FOR_VERDICT.refuse, undefined, "a refusal must not map to a foundation");
});

test("every foundation the table emits is one the asset lane builds", () => {
  // The asset lane's Group A3 built exactly three: slab, plinth, stepped.
  const built = new Set(["slab", "plinth", "stepped"]);
  for (const [verdict, foundation] of Object.entries(FOUNDATION_FOR_VERDICT)) {
    assert.ok(built.has(foundation), `verdict "${verdict}" asks for foundation "${foundation}", which nothing builds`);
  }
});

// ---------------------------------------------------------------------------
// ANTI-CLONE 2 — a class offers a set, and frontage gates the frontage types
// ---------------------------------------------------------------------------

test("no plot class maps to exactly one typology except where that is the point", () => {
  const single = Object.entries(TYPOLOGIES_FOR_CLASS)
    .filter(([, list]) => list.length === 1)
    .map(([cls]) => cls);
  // PARK carries no building; HANGAR is an airport shed and genuinely is one
  // thing. Anything else collapsing to a single entry is the clone defect.
  assert.deepEqual(single.sort(), ["HANGAR", "PARK"], `these classes collapsed to one typology: ${single}`);
});

test("a shop only appears where it has street frontage", () => {
  const interior = { plotId: "block-0-0-p3", corner: "none" };
  const onCorner = { plotId: "block-0-0-p3", corner: "left" };
  // Same plot id, so the same roll -- the ONLY difference is the frontage.
  assert.notEqual(typologyFor("VILLA", interior), "bld-shop");

  // And across a whole row of interior plots, no shop is ever chosen.
  for (let i = 0; i < 300; i++) {
    const t = typologyFor("TERRACE", { plotId: `block-0-0-p${i}`, corner: "none" });
    assert.notEqual(t, "bld-shop", `a corner shop was placed mid-row at index ${i}`);
  }
  // Guardrail: the frontage-only types ARE reachable, so the check above is not
  // passing because shops were never possible in the first place.
  let sawShop = false;
  for (let i = 0; i < 300 && !sawShop; i++) {
    if (typologyFor("TERRACE", { plotId: `block-0-0-p${i}`, corner: "left" }) === "bld-shop") sawShop = true;
  }
  assert.ok(sawShop, "no shop appeared on any corner -- the frontage branch is unreachable");
  assert.ok(onCorner);
});

test("an unknown plot class returns null rather than guessing a building", () => {
  assert.equal(typologyFor("NOT-A-CLASS", { plotId: "x", corner: "none" }), null);
});

// ---------------------------------------------------------------------------
// Terrace unit fitting
// ---------------------------------------------------------------------------

test("terrace units fill the plot without overhanging it", () => {
  assert.equal(terraceUnitsFor(8), 1);
  assert.equal(terraceUnitsFor(16), 2);
  // 23 m holds two whole 8 m units and 7 m of nothing. Rounding UP to 3 would be
  // 24 m of building on a 23 m plot -- refused by place.js, after the work of
  // building it.
  assert.equal(terraceUnitsFor(23), 2);
  assert.equal(terraceUnitsFor(0), 1, "a zero-width plot must still yield a legal unit count, not 0");
  assert.equal(terraceUnitsFor(-5), 1);
});

test("the unit count a plot gets actually fits that plot", () => {
  for (const w of [8, 12, 16, 23, 31, 40, 47]) {
    assert.ok(terraceUnitsFor(w) * 8 <= Math.max(8, w), `${w} m plot was given ${terraceUnitsFor(w) * 8} m of terrace`);
  }
});

// ---------------------------------------------------------------------------
// Planning a plot
// ---------------------------------------------------------------------------

test("a plot the ground refuses is refused, with a reason", () => {
  const r = planPlot(plotAt("block-0-0", 0), 0, 4, "refuse");
  assert.equal(r.refused, true);
  assert.match(r.reason, /ground refused/);
});

test("an unrecognised verdict is refused by name, not treated as buildable ground", () => {
  const r = planPlot(plotAt("block-0-0", 0), 0, 4, "swamp");
  assert.equal(r.refused, true);
  assert.match(r.reason, /unknown verdict: swamp/);
});

test("a park is refused as a park, and an unknown class is refused as unknown", () => {
  const park = planPlot(plotAt("block-0-0", 0, "", "PARK"), 0, 1, "slab");
  assert.equal(park.refused, true);
  assert.match(park.reason, /no building on this class/);

  const bogus = planPlot(plotAt("block-0-0", 0, "", "NOPE"), 0, 1, "slab");
  assert.equal(bogus.refused, true);
  assert.match(bogus.reason, /unknown plot class/);
});

test("a planned plot carries everything the asset lane needs to build it", () => {
  const p = plotAt("block-0-0", 2);
  const r = planPlot(p, 2, 5, "plinth");
  assert.equal(r.refused, false);
  assert.equal(r.seed, p.id);
  assert.equal(r.options.foundation, "plinth");
  assert.equal(r.options.position, "middle");
  assert.equal(r.options.corner, "none");
  assert.ok(CHARACTERS.includes(r.options.character));
  // base-centre is the model contract, so the point must be the centre of the
  // BUILDABLE rectangle, not of the plot -- the setbacks are real ground.
  assert.equal(r.x, (p.buildable.xMin + p.buildable.xMax) / 2);
  assert.equal(r.z, (p.buildable.zMin + p.buildable.zMax) / 2);
});

test("only the row typologies are handed a unit count", () => {
  // Handing `units` to a villa would be an option it ignores, which reads in a
  // debugger as though it were doing something.
  const villa = planPlot(plotAt("block-9-9", 0, "", "VILLA"), 0, 1, "slab");
  assert.equal(villa.options.units, undefined);

  let sawTerrace = false;
  for (let i = 0; i < 60 && !sawTerrace; i++) {
    const r = planPlot(plotAt("block-9-9", i, "", "TERRACE"), 1, 5, "slab");
    if (r.typology === "bld-terrace") {
      sawTerrace = true;
      assert.equal(typeof r.options.units, "number");
      assert.ok(r.options.units >= 1);
    }
  }
  assert.ok(sawTerrace, "no terrace was produced in 60 tries -- the fixture never reaches the branch");
});

// ---------------------------------------------------------------------------
// Planning a block: the two-row split
// ---------------------------------------------------------------------------

test("the two rows of a block are two rows, not one long one", () => {
  // subdivideBlock names the back row by suffixing "b". Reading a 10-plot block
  // as a single 10-long row would put an "end-right" unit in the middle of the
  // front street and give the back row no ends at all.
  const front = rowOf(5, "block-1-1", "");
  const back = rowOf(5, "block-1-1", "b");
  const out = planBlock({ id: "block-1-1" }, [...front, ...back], allSlab);

  const frontPos = out.filter((r) => !r.plotId.endsWith("b")).map((r) => r.situation.position);
  const backPos = out.filter((r) => r.plotId.endsWith("b")).map((r) => r.situation.position);

  assert.deepEqual(frontPos, ["end-left", "middle", "middle", "middle", "end-right"]);
  assert.deepEqual(backPos, ["end-left", "middle", "middle", "middle", "end-right"]);
  assert.equal(out.length, 10, "every plot in both rows should have been planned");
});

test("the back row faces the other way, so no building shows the street its garden", () => {
  // A block carries two rows fronting opposite streets. Models are built facing
  // +z, so a back-row building placed unrotated puts its front door, porch and
  // shopfront against the rear boundary and shows the street its back garden.
  // Half of every block in the city would be backwards, and from the air nothing
  // would look wrong at all.
  const front = rowOf(4, "block-3-3", "");
  const back = rowOf(4, "block-3-3", "b");
  const out = planBlock({ id: "block-3-3" }, [...front, ...back], allSlab);

  const f = out.filter((r) => !r.plotId.endsWith("b"));
  const b = out.filter((r) => r.plotId.endsWith("b"));
  assert.equal(f.length, 4);
  assert.equal(b.length, 4);
  assert.ok(f.every((r) => r.facing === 0), "a front-row building was rotated");
  assert.ok(b.every((r) => Math.abs(r.facing - Math.PI) < 1e-9), "a back-row building was not turned to face its own street");
});

test("ON THE REAL WORLD: every back-row building is turned, and every front-row one is not", () => {
  const verdictFor = realVerdictFor;
  const { placements } = planCity(realWorld.blocks, realWorld.plots, verdictFor);
  const back = placements.filter((p: any) => p.plotId.endsWith("b"));
  const front = placements.filter((p: any) => !p.plotId.endsWith("b"));
  assert.ok(back.length > 1000, `only ${back.length} back-row buildings -- too few to measure`);
  assert.ok(front.length > 1000, `only ${front.length} front-row buildings -- too few to measure`);
  assert.equal(back.filter((p: any) => Math.abs(p.facing - Math.PI) > 1e-9).length, 0);
  assert.equal(front.filter((p: any) => p.facing !== 0).length, 0);
});

test("end-left is the left-hand end on the ground, whatever order the plots arrived in", () => {
  const row = rowOf(4, "block-2-2", "");
  const shuffled = [row[2], row[0], row[3], row[1]];
  const out = planBlock({ id: "block-2-2" }, shuffled, allSlab);
  const leftmost = out.reduce((a, b) => (a.x < b.x ? a : b));
  assert.equal(leftmost.situation.position, "end-left");
});

// ---------------------------------------------------------------------------
// Planning a city
// ---------------------------------------------------------------------------

test("planCity places what it can and counts what it refuses, by reason", () => {
  const blocks = [{ id: "block-0-0" }, { id: "block-1-0" }];
  const plots = [...rowOf(6, "block-0-0"), ...rowOf(6, "block-1-0")];
  // Half of the second block is unbuildable ground.
  const verdictFor = (p: { id: string }) => (p.id.startsWith("block-1-0") && /p[0-2]$/.test(p.id) ? "refuse" : "slab");

  const { placements, refusals, stats } = planCity(blocks, plots, verdictFor);

  assert.equal(stats.plots, 12);
  assert.equal(placements.length + refusals.length, 12);
  assert.equal(stats.refused, 3);
  assert.equal(stats.refusedWhy["ground refused"], 3);
  assert.equal(stats.placed, 9);
  // Every placement names a typology and an era, so the stats are real counts
  // rather than a shape with zeroes in it.
  assert.equal(Object.values(stats.byTypology).reduce((a, b) => a + b, 0), 9);
  assert.equal(Object.values(stats.byCharacter).reduce((a, b) => a + b, 0), 9);
});

test("a block with no plots is skipped rather than producing an empty row", () => {
  const out = planCity([{ id: "block-0-0" }, { id: "block-empty" }], rowOf(3, "block-0-0"), allSlab);
  assert.equal(out.stats.plots, 3);
  assert.equal(out.placements.length, 3);
});

test("the whole plan is deterministic -- two runs agree exactly", () => {
  const blocks = [{ id: "block-0-0" }, { id: "block-1-0" }];
  const plots = [...rowOf(8, "block-0-0"), ...rowOf(8, "block-1-0")];
  const a = planCity(blocks, plots, allSlab);
  const b = planCity(blocks, plots, allSlab);
  assert.deepEqual(a.placements, b.placements);
  assert.deepEqual(a.stats, b.stats);
});

// ---------------------------------------------------------------------------
// THE REAL WORLD
//
// Everything above runs on eight fixture plots. These run the engine over the
// actual 26 km world against the actual terrain, because a layout that behaves
// on fixtures and collapses on the real map would pass every test above.
// ---------------------------------------------------------------------------

test("the layout plans the real world: nearly every plot is placed, and refusals are named", () => {
  const world = realWorld;
  const verdictFor = realVerdictFor;

  const { stats, placements } = planCity(world.blocks, world.plots, verdictFor);

  assert.ok(stats.plots > 10000, `only ${stats.plots} plots in the real world -- the fixture is being tested, not the map`);
  // Measured 99.1% placed. A floor of 90% catches the layout silently refusing
  // the city without pinning the number so tightly that terrain tuning breaks it.
  const placedFraction = stats.placed / stats.plots;
  assert.ok(placedFraction > 0.9, `only ${(100 * placedFraction).toFixed(1)}% of plots were placed`);
  // Every refusal must carry a reason. A refusal with no reason is the silent
  // drop this whole engine is written against.
  assert.equal(
    Object.values(stats.refusedWhy).reduce((a: number, b: any) => a + b, 0),
    stats.refused,
    "some refusals were not counted under any reason",
  );
  assert.equal(placements.length, stats.placed);
});

test("ON THE REAL WORLD: not one block carries two architectural characters", () => {
  // This is the anti-clone decision, measured rather than asserted. Rolling
  // character per building instead of per block leaves this at roughly the block
  // count rather than at zero, so the mutation is loud.
  const world = realWorld;
  const verdictFor = realVerdictFor;
  const { placements } = planCity(world.blocks, world.plots, verdictFor);

  const byBlock = new Map<string, Set<string>>();
  for (const p of placements) {
    if (!byBlock.has(p.blockId)) byBlock.set(p.blockId, new Set());
    byBlock.get(p.blockId)!.add(p.situation.character);
  }
  const mixed = [...byBlock.entries()].filter(([, s]) => s.size > 1);
  assert.equal(mixed.length, 0, `${mixed.length} of ${byBlock.size} blocks carry more than one era, e.g. ${mixed[0]?.[0]}`);

  // The other half of the claim: the city is not all one era either.
  const all = new Set([...byBlock.values()].flatMap((s) => [...s]));
  assert.equal(all.size, CHARACTERS.length, `only ${all.size} of ${CHARACTERS.length} characters appear across the whole city`);
  assert.ok(byBlock.size > 500, `only ${byBlock.size} blocks were built on -- too few to make this measurement mean anything`);
});

test("ON THE REAL WORLD: no single typology takes the city", () => {
  const world = realWorld;
  const verdictFor = realVerdictFor;
  const { stats } = planCity(world.blocks, world.plots, verdictFor);

  const counts = Object.values(stats.byTypology) as number[];
  const top = Math.max(...counts);
  // Measured: the largest share is bld-townhouse at 27.9%. A 45% ceiling is the
  // line between "a city with a dominant housing type", which is normal, and
  // "clones", which is the defect.
  assert.ok(top / stats.placed < 0.45, `one typology took ${(100 * top / stats.placed).toFixed(1)}% of the city`);
  assert.ok(counts.length >= 8, `only ${counts.length} distinct typologies were used across the whole world`);
});

test("ON THE REAL WORLD: the terrain actually drives the foundations", () => {
  // 100% slab would mean the ground is never being asked -- the exact defect
  // that made the first run of scripts/measure-layout.mjs print a flat world
  // under a heading claiming it was the real terrain.
  const world = realWorld;
  const verdictFor = realVerdictFor;
  const { placements } = planCity(world.blocks, world.plots, verdictFor);

  const byFoundation: Record<string, number> = {};
  for (const p of placements) byFoundation[p.options.foundation] = (byFoundation[p.options.foundation] || 0) + 1;

  assert.ok(byFoundation.slab > 0, "no slab foundations at all");
  assert.ok(byFoundation.plinth > 0, "not one plinth -- sloping ground is never reaching the foundation choice");
  assert.ok(
    byFoundation.slab / placements.length < 0.99,
    `${(100 * byFoundation.slab / placements.length).toFixed(1)}% slab -- the terrain query is answering flat for everything`,
  );
});

test("ON THE REAL WORLD: the whole city collapses to a few hundred instanceable variants", () => {
  // `building()` returns one merged geometry per building. 20,472 buildings
  // seeded per plot would be 20,472 geometries and 20,472 draw calls, against
  // the 14 instanced buckets the renderer uses now -- a different renderer, not
  // a tuning problem. Grouping by SITUATION rather than by plot id is what makes
  // the city drawable, and this is the measurement that says it still is.
  const world = realWorld;
  const verdictFor = realVerdictFor;
  const { placements } = planCity(world.blocks, world.plots, verdictFor);
  const groups = groupByVariant(placements);

  assert.ok(groups.size > 100, `only ${groups.size} variants -- the city is more repetitive than it looks`);
  assert.ok(groups.size < 900, `${groups.size} variants is ${groups.size} draw calls for buildings alone`);

  // Every placement lands in exactly one group, and no placement is lost.
  const total = [...groups.values()].reduce((n, g) => n + g.placements.length, 0);
  assert.equal(total, placements.length, "grouping dropped or duplicated placements");

  // The seed must be the KEY, not a plot id -- otherwise members of a group get
  // different geometry and cannot be instanced together.
  for (const g of groups.values()) {
    assert.equal(g.seed, g.key, "a variant group is seeded by something other than its own key");
  }
});

test("two placements in the same situation share a variant, and one difference splits them", () => {
  const base = planPlot(plotAt("block-5-5", 1), 1, 5, "slab");
  const same = planPlot(plotAt("block-5-5", 1), 1, 5, "slab");
  assert.equal(variantKeyOf(base), variantKeyOf(same));

  // Different ground under it is a different building, so a different variant.
  const onAPlinth = planPlot(plotAt("block-5-5", 1), 1, 5, "plinth");
  assert.notEqual(variantKeyOf(base), variantKeyOf(onAPlinth));

  // And the end of a row is not the middle of one.
  const atTheEnd = planPlot(plotAt("block-5-5", 1), 0, 5, "slab");
  assert.notEqual(variantKeyOf(base), variantKeyOf(atTheEnd));
});

test("ON THE REAL WORLD: every row-class plot is a whole number of 8 m cells", () => {
  // WITHOUT THIS THE ROW VARIANTS ARE POINTLESS.
  //
  // A terrace tiles: middle units carry blank party walls and butt against their
  // neighbours. That only works if the PLOTS line up on the same 8 m module the
  // buildings are built from. Measured before PLOT_CLASSES declared a module:
  // of 5,257 TERRACE plots, ZERO tiled -- mean plot width 12 m against an 8 m
  // unit left a 4.00 m gap between every pair of adjacent houses, so each one
  // presented a blank windowless flank across the gap to its neighbour's blank
  // windowless flank. The models were right and the subdivision defeated them.
  const world = realWorld;

  for (const [className, cls] of Object.entries(PLOT_CLASSES) as [string, any][]) {
    if (!cls.module) continue;
    const plots = world.plots.filter((p: any) => p.className === className);
    assert.ok(plots.length > 100, `only ${plots.length} ${className} plots -- too few to measure`);

    const offenders = plots.filter((p: any) => {
      const w = p.buildable.xMax - p.buildable.xMin;
      return Math.abs(w / cls.module - Math.round(w / cls.module)) > 1e-6;
    });
    assert.equal(
      offenders.length,
      0,
      `${offenders.length} of ${plots.length} ${className} plots are not a whole number of ${cls.module} m cells, ` +
        `e.g. ${offenders[0] && (offenders[0].buildable.xMax - offenders[0].buildable.xMin).toFixed(2)} m`,
    );
  }
});

test("ON THE REAL WORLD: every row-class plot STARTS on an 8 m cell, not just is one wide", () => {
  // Snapping the WIDTH makes a row tile against itself. It does not put the row
  // on the world's grid: measured, only 3 of 2,291 blocks begin on an 8 m
  // boundary (median offset 2.80 m), so every building sat at a fractional cell
  // address. Nothing looked wrong -- the streets hide it -- but WORLD-RULES
  // section 3.2 declares the 8 m CELL as the module the world is built on, and
  // grid.js hands out addresses on that basis. A module system that exists in
  // the documentation and not in the ground costs nothing until the first thing
  // that needs to address a cell: the AI edit path, or streaming a region.
  const world = realWorld;

  for (const [className, cls] of Object.entries(PLOT_CLASSES) as [string, any][]) {
    if (!cls.module) continue;
    const plots = world.plots.filter((p: any) => p.className === className);
    assert.ok(plots.length > 100, `only ${plots.length} ${className} plots -- too few to measure`);

    const offGrid = plots.filter((p: any) => {
      const r = Math.abs(p.xMin / cls.module - Math.round(p.xMin / cls.module));
      return r > 1e-6;
    });
    assert.equal(
      offGrid.length,
      0,
      `${offGrid.length} of ${plots.length} ${className} plots start off the ${cls.module} m grid, ` +
        `e.g. xMin ${offGrid[0] && offGrid[0].xMin}`,
    );
  }
});

test("guardrail: a class with NO module is left alone, so the snap is targeted", () => {
  // If the snap applied to everything, this test would fail -- and a villa
  // forced onto an 8 m grid is a different (and wrong) world, not a safer one.
  const world = realWorld;
  const villas = world.plots.filter((p: any) => p.className === "VILLA");
  assert.ok(villas.length > 100, "not enough VILLA plots to make this measurement");
  assert.equal((PLOT_CLASSES as any).VILLA.module, undefined, "VILLA should not declare a module");

  const offGrid = villas.filter((p: any) => {
    const w = p.buildable.xMax - p.buildable.xMin;
    return Math.abs(w / 8 - Math.round(w / 8)) > 1e-6;
  });
  assert.ok(
    offGrid.length > 0,
    "every VILLA plot happens to be a whole number of 8 m cells -- the snap is being applied to classes that did not ask for it",
  );
});

test("situationOf reports the plot's own ids back, so a placement can be traced to its ground", () => {
  const p = plotAt("block-7-7", 1);
  const s = situationOf(p, 1, 3, "slab");
  assert.equal(s.plotId, p.id);
  assert.equal(s.blockId, "block-7-7");
  assert.equal(s.districtId, "downtown");
  assert.equal(s.className, "TERRACE");
  assert.equal(s.verdict, "slab");
});
