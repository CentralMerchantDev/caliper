import { ASSET_REGISTRY } from "./asset-registry.js";

// =============================================================================
// CALIPER — THE LAYOUT ENGINE
//
// This module decides WHAT STANDS ON EACH PLOT. It is the missing middle of the
// world: the plan already knows where the roads, blocks and plots are, and the
// asset lane already knows how to build a villa or a terrace — but nothing has
// ever joined the two. Until now the city was hand-placed, which is why it read
// as scattered rather than laid out.
//
// WHY THIS IS A SEPARATE FILE, AND WHY IT HAS NO GEOMETRY IN IT
//
// Every decision here is a decision about a PLACE, not about a mesh: which
// typology suits this plot, whether this is the end of a terrace row or the
// middle of one, whether the ground under it wants a plinth. None of that needs
// three.js, a renderer, or a canvas. Keeping it separate means the whole thing
// runs in plain node, can be tested by value rather than by screenshot, and can
// be mutation-tested — which for a system whose entire claim is "it only says
// yes when yes is true" is not a nicety.
//
// It also means this file does not depend on `buildings.js`, which lives on the
// asset lane. This module emits a SPEC — a typology name, a seed and an options
// object — and the renderer feeds that spec to `building()`. The contract
// between the two is data, so either side can be worked on alone.
//
// `asset-registry.js` is the one exception to "no dependencies," and it is not
// really an exception: it is 2,400 lines of plain data (id, name, tier,
// category, footprint), zero imports, no three.js -- the model LIBRARY's
// equivalent of PLOT_CLASSES, not a piece of the renderer. See LIBRARY_MODEL_FOR
// below.
//
// THE DEFECT THIS FILE EXISTS TO PREVENT
//
// A rules-driven layout has one characteristic failure, and it is worse than
// the hand-placed city it replaces: every plot of a given class gets the same
// answer, and the result is correct, evenly spaced, and obviously machine-made.
// Clones on a grid. Three decisions below are aimed squarely at that, and each
// is marked ANTI-CLONE where it appears:
//
//   1. Architectural character is chosen PER BLOCK, not per building.
//   2. A plot class maps to a SET of typologies, not to one.
//   3. Row position and corner status are read from the plot's actual place in
//      its row, so the ends of a terrace are ends.
//
// The first is the one that matters most and is the least obvious, so it is
// argued where it is implemented rather than here.
// =============================================================================

/**
 * The four architectural characters the asset lane builds.
 *
 * Kept as a literal rather than imported from `buildings.js` on purpose: that
 * file is on the asset lane and pulls in three.js. `test/layout.test.ts` asserts
 * this list against the real `CHARACTER_SETS` once the lanes are merged, so the
 * duplication is checked rather than trusted — which is the standard this repo
 * applies to every other pair of tables that have to agree.
 */
export const CHARACTERS = ["heritage", "interwar", "postwar", "contemporary"];

/**
 * `assessFootprint` and the asset lane use DIFFERENT WORDS for the same three
 * outcomes, and one of the words is dangerously overloaded.
 *
 *   footprint.js verdict   asset-lane foundation
 *   --------------------   ---------------------
 *   "slab"              -> "slab"
 *   "plinth"            -> "plinth"
 *   "terrace"           -> "stepped"        <-- the overloaded one
 *   "refuse"            -> (nothing is built)
 *
 * "terrace" as a VERDICT means ground that steps down across the footprint.
 * "bld-terrace" as a TYPOLOGY means a row of houses sharing party walls. They
 * are unrelated, and a terrace-verdict plot is usually not a terrace-typology
 * plot. Mapping the verdict to "stepped" here means the ambiguous word never
 * travels further than this table, and no later reader has to work out which
 * sense was meant.
 */
export const FOUNDATION_FOR_VERDICT = {
  slab: "slab",
  plinth: "plinth",
  terrace: "stepped",
};

/**
 * ANTI-CLONE 2 — a plot class is a SIZE BAND, not a use.
 *
 * `PLOT_CLASSES` in city-plan.js says how big a plot is and how tall it may be.
 * It does not say what the building is for. Mapping each class to exactly one
 * typology would be the single fastest way to produce a city of clones: every
 * TERRACE plot in the world would carry the identical generator, and 5,700 of
 * them would carry it in rows.
 *
 * So each class offers a SET, and the choice within the set is made from the
 * plot's situation — see `typologyFor`. The weights are the mix along an
 * ordinary street of that class, not a uniform draw: a terrace street is mostly
 * houses with the occasional corner shop, and that ratio is the thing that makes
 * the corner shop read as a corner shop.
 *
 * `null` entries are plots that carry no building at all. A park is not an empty
 * plot that failed to get a building; it is a park, and saying so here stops a
 * later reader treating it as a gap to be filled.
 */
export const TYPOLOGIES_FOR_CLASS = {
  TERRACE: [
    { typology: "bld-terrace", weight: 8 },
    { typology: "bld-shop", weight: 1, prefersFrontage: true },
    { typology: "bld-apartment-walkup", weight: 1 },
  ],
  TOWNHOUSE: [
    { typology: "bld-townhouse", weight: 7 },
    { typology: "bld-apartment-walkup", weight: 2 },
    { typology: "bld-shop", weight: 1, prefersFrontage: true },
  ],
  MIDRISE: [
    { typology: "bld-midrise", weight: 6 },
    { typology: "bld-office", weight: 2 },
    { typology: "bld-highstreet-terrace", weight: 2, prefersFrontage: true },
  ],
  TOWER: [
    { typology: "bld-tower", weight: 7 },
    { typology: "bld-office", weight: 3 },
  ],
  CIVIC: [
    { typology: "bld-office", weight: 6 },
    { typology: "bld-business-park", weight: 4 },
  ],
  VILLA: [
    { typology: "bld-villa", weight: 9 },
    { typology: "bld-shop", weight: 1, prefersFrontage: true },
  ],
  RESORT: [
    { typology: "bld-midrise", weight: 6 },
    { typology: "bld-apartment-walkup", weight: 4 },
  ],
  WAREHOUSE: [
    { typology: "bld-warehouse", weight: 7 },
    { typology: "bld-workshop", weight: 3 },
  ],
  HANGAR: [
    { typology: "bld-warehouse", weight: 10 },
  ],
  FARM: [
    { typology: "bld-workshop", weight: 6 },
    { typology: "bld-villa", weight: 4 },
  ],
  PARK: [
    { typology: null, weight: 1 },
  ],
};

// -----------------------------------------------------------------------------
// A DETERMINISTIC HASH
//
// The whole world must rebuild identically from the same inputs -- `city-plan`
// already asserts determinism by sha256 over every plot, block and road, and a
// layout that drew from Math.random would break that on the first reload.
//
// FNV-1a, written out rather than imported, because the alternative (`rnd` in
// buildings.js) lives on the asset lane and would drag three.js into a module
// that deliberately has no graphics in it.
// -----------------------------------------------------------------------------

/** A stable number in [0, 1) for any string. Same string, same number, forever. */
export function hash01(str) {
  let h = 0x811c9dc5;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    // The FNV prime, by shift-and-add: `h * 16777619` overflows to a float and
    // stops being an integer hash. Math.imul would also work; this keeps the
    // whole function to bitwise ops so it cannot silently become approximate.
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h / 4294967296;
}

/** Pick from a weighted list with a stable roll. Never returns undefined. */
export function weightedPick(options, roll) {
  const total = options.reduce((sum, o) => sum + o.weight, 0);
  if (!(total > 0)) return options[0];
  let r = roll * total;
  for (const o of options) {
    r -= o.weight;
    if (r < 0) return o;
  }
  // Only reachable through float drift at roll ~= 1. Returning the last entry is
  // correct; returning undefined would be a crash three call frames later.
  return options[options.length - 1];
}

// -----------------------------------------------------------------------------
// SITUATION — what this plot IS, read from where it sits
// -----------------------------------------------------------------------------

/**
 * Where a plot sits in its row.
 *
 * ANTI-CLONE 3. A terrace is not ten identical houses in a row; it is two end
 * units and eight middles that share party walls. The asset lane builds exactly
 * that distinction ("end-left" / "middle" / "end-right", with blank party walls
 * on the middles) and it is worth nothing unless something tells it which is
 * which. This is that something, and the answer is already in the data: the
 * plot's index within its row.
 *
 * A row of one is NOT an end unit -- it is detached, and gets frontage on every
 * side. Calling it "end-left" would give it one blank party wall facing an empty
 * plot, which is the exact seam this is meant to avoid.
 */
export function rowPositionAt(index, count) {
  if (!(count > 0) || !(index >= 0) || index >= count) return "detached";
  if (count === 1) return "detached";
  if (index === 0) return "end-left";
  if (index === count - 1) return "end-right";
  return "middle";
}

/**
 * Whether this plot turns a corner, and which way.
 *
 * A corner unit presents a facade on BOTH streets. Only the two plots at the
 * ends of a row can be corners, because only they have a side that faces open
 * ground rather than a neighbour's party wall.
 *
 * A detached plot is not a corner: it has frontage everywhere, which the
 * typology handles as its ordinary case. Returning "left" for it would ask for
 * a two-street facade on a building that already has four.
 */
export function cornerAt(index, count) {
  const pos = rowPositionAt(index, count);
  if (pos === "end-left") return "left";
  if (pos === "end-right") return "right";
  return "none";
}

/**
 * ANTI-CLONE 1 — THE ONE THAT MATTERS.
 *
 * Architectural character is chosen per BLOCK, and every building on that block
 * shares it.
 *
 * The obvious implementation is to roll a character per building. It is one line
 * shorter and it is wrong, in a way that is invisible in a unit test and
 * unmissable from the air: every street becomes an even mix of all four eras,
 * so every street looks like every other street. Randomising per building
 * produces UNIFORMITY at the scale you actually view the city from. The noise
 * averages out and the whole map turns the same shade of mixed.
 *
 * Real streets do not look like that because real streets were built at once.
 * A block went up in one decade, so it shares a window rhythm, a roof line and a
 * material, and the next block over went up in a different decade and does not.
 * The variety a viewer perceives is BETWEEN blocks, not within them.
 *
 * So: hash the block id. Same block, same era, every reload. Neighbouring blocks
 * differ because their ids differ. This is the difference between two streets of
 * the same typology reading as two places rather than as one texture.
 *
 * The optional `districtId` shifts the whole district's draw, so a historic
 * quarter and a postwar suburb can lean different ways without either becoming
 * uniform.
 */
export function characterFor(blockId, districtId = "") {
  return CHARACTERS[Math.floor(hash01(`char|${districtId}|${blockId}`) * CHARACTERS.length)];
}

/**
 * How many 8 m units of terrace fit the buildable width of this plot.
 *
 * The asset lane builds terraces as `units * 8` metres so they tile against each
 * other with no seam. Handing it a unit count derived from the plot is what
 * makes a row fill its block instead of leaving gaps or overhanging.
 *
 * Floor, not round: a half unit that does not fit is a building hanging over the
 * plot boundary, and `place.js` would refuse it — correctly, but after the work
 * of building it.
 */
export function terraceUnitsFor(buildableWidthM) {
  const units = Math.floor(buildableWidthM / 8);
  return Math.max(1, units);
}

/**
 * Choose a typology for a plot from its class and its situation.
 *
 * `prefersFrontage` entries — shops, high-street terraces — are only reachable
 * on a plot that actually fronts a street corner. A corner shop in the middle of
 * a row is not a corner shop; it is a shop with no visible frontage, which is
 * both wrong and invisible, so the work of building it is wasted.
 */
export function typologyFor(className, situation, fits = null) {
  const table = TYPOLOGIES_FOR_CLASS[className];
  if (!table) return null;

  const onACorner = situation.corner !== "none";
  let eligible = table.filter((o) => !o.prefersFrontage || onACorner);

  // ASK WHETHER IT FITS BEFORE CHOOSING IT.
  //
  // A typology sizes itself: `cellW` inside buildings.js is derived from the
  // seed and cannot be driven from options, so bld-office can decide it is
  // 48 x 56 m and be placed on a 48 x 53 m plot. Measured without this filter:
  // 3,552 of 20,472 buildings -- 17.4% -- overhung the plot they were chosen
  // for. Every one of them would be refused by place.js, AFTER the work of
  // building it, or would visibly sit across its own boundary.
  //
  // `fits(typology, situation)` is supplied by the caller, NOT computed here.
  // The sizes live in buildings.js, which pulls in three.js; a copy of them in
  // this file would be a second table that has to agree with the first, which
  // is the defect class this repo keeps finding. So the layout asks the library
  // the question rather than keeping its own answer to it.
  if (typeof fits === "function") {
    const affordable = eligible.filter((o) => o.typology === null || fits(o.typology, situation) !== null);
    // If NOTHING fits, fall through to the unfiltered set rather than returning
    // null. A plot with no building is a refusal, and a refusal has to be a
    // decision the caller can see and count -- not a silent consequence of a
    // size table. planPlot reports the overhang instead.
    if (affordable.length) eligible = affordable;
  }

  // A class whose every entry prefers frontage would filter to nothing on an
  // interior plot. None currently does, but falling back to the full table is
  // the difference between a missing building and a crash if one ever does.
  const from = eligible.length ? eligible : table;

  return weightedPick(from, hash01(`typ|${situation.plotId}`)).typology;
}

// -----------------------------------------------------------------------------
// THE LIBRARY, AS A SECOND SOURCE -- docs/specs/LIBRARY-AS-SOURCE.md STEP 4
//
// "Today layout.js maps a plot to one of twelve typologies. It becomes: given
// the free space at this location, which library models fit -- foot + clear
// inside the available cells -- and which of those suits the district being
// seeded." That is this section. It was blocked on the registry being
// reachable at all (agy's I5, closed in 9d1693b, all 2,400 models resolve);
// unblocked now, so this reads the real registry and returns a real model id
// a real plot can actually carry, not a stub waiting for one.
//
// ADDITIVE, NOT A REPLACEMENT. `typologyFor` above, and everything that calls
// it (`planPlot`, `planBlock`, `planCity`), is UNCHANGED -- city-render.js's
// existing `planCity(..., makeFits())` call keeps building from the twelve
// typologies exactly as it does today. `libraryModelFor` below is a second,
// independent entry point a caller can use instead, or alongside, once
// something decides to ask it. LIBRARY-AS-SOURCE.md's own closing words are
// why: procedural and library models "can coexist... that is a decision for
// after step 4, made by looking at both on screen. It is not being made
// here." Wiring which of the two actually draws city-render.js's buildings
// is a one-line change in that file, which is agy's, not this commit's.
//
// WHY THIS CAN LIVE IN layout.js WITHOUT BREAKING "NO THREE.JS IN IT":
// `asset-registry.js` is 2,400 lines of plain data -- id, name, tier,
// category, footprint -- zero imports, no geometry. It is the library's own
// equivalent of PLOT_CLASSES, not a piece of the renderer, so importing it
// costs this file nothing it doesn't already pay for PLOT_CLASSES-shaped data.
// -----------------------------------------------------------------------------

/**
 * Which library tiers suit a plot class. PROPOSED, not decided -- Mark and
 * agy own these, the same way public/typology-footprints.js and docs/audits/
 * VISUAL-RUN-QUESTIONS.md §1a propose rather than decide `clear` for the
 * twelve typologies. Reasoned from what a place like that actually looks
 * like (a downtown core reads prestige, a beach village does not), not
 * measured -- there is nothing yet to measure it against.
 *
 * UPDATED to agy's own published table for these exact classes (docs/audits/
 * VISUAL-RUN-QUESTIONS.md §7.1, after docs/specs/LIBRARY-STRUCTURE.md's
 * six-to-four finish consolidation) rather than this file re-deriving one:
 * TERRACE and VILLA in particular land on f1/f2 there, not the f1/f3 and
 * f3/f1 an earlier translation of this file's own six-tier names produced
 * -- agy's is the one that actually reflects where "mid" and "midhigh"
 * ended up in the real four-tier census ({f1:400, f2:400, f3:400, f4:400}),
 * which this file has no independent way to verify. Still a proposal, not
 * a decision; adopted here because it is more authoritative than a
 * translation of this file's own retired six-tier guesses.
 *
 * Classes absent here (WAREHOUSE, HANGAR, FARM, PARK) are not an oversight:
 * the registry's only building categories are 'buildings' and 'civic' (240
 * each), and neither has an industrial or agricultural style in it yet --
 * the same gap CLASSES_WITH_NO_TYPOLOGY_LARGE_ENOUGH names in public/
 * typology-footprints.js for the twelve-typology system. Named here rather
 * than silently returning nothing for a reason nobody wrote down.
 */
export const LIBRARY_TIERS_FOR_CLASS = {
  TOWER:     ["f3", "f4"],
  CIVIC:     ["f3", "f4"],
  MIDRISE:   ["f2", "f3"],
  RESORT:    ["f2", "f3"],
  TOWNHOUSE: ["f2", "f3"],
  TERRACE:   ["f1", "f2"],
  VILLA:     ["f1", "f2"],
};

/** CIVIC plots draw from the registry's 'civic' category; every other
 *  mapped class draws from 'buildings' -- the registry has no finer-grained
 *  category than that split. */
function registryCategoryFor(className) {
  return className === "CIVIC" ? "civic" : "buildings";
}

/** The 8 m CELL of WORLD-RULES section 3.2 and of grid.js -- kept as a
 *  literal here rather than imported, the same choice public/typology-
 *  footprints.js made for the same reason: this file's job is to read the
 *  registry's own numbers, not add a dependency neither lane asked for. */
const CELL_M = 8;

/**
 * Does a library entry's footprint fit the free space available, in either
 * orientation -- a building can face either way along its plot, the same
 * rotation prop-manifest.js's `propFootprint` already accounts for.
 *
 * UPDATED: LIBRARY-AS-SOURCE.md step 2 landed since this was first written.
 * Entries now carry `foot: { w, d }` in WHOLE CELLS (PLACEMENT-CONTRACT.md's
 * own unit) and `clear: { w, d }`, also cells, per axis rather than one flat
 * number -- both converted to metres here (`* CELL_M`) to compare against
 * `situation.fits`, which is metric. `footprint` (the legacy metric size)
 * is the fallback for any entry that predates step 2 and has no `foot` yet,
 * with `clear` read as a flat number or 0 in that case, matching the
 * original assumption this function shipped with.
 */
function libraryEntryFits(entry, fits) {
  let w, d;
  if (entry.foot) {
    const clear = entry.clear || { w: 0, d: 0 };
    w = (entry.foot.w + (clear.w || 0) * 2) * CELL_M;
    d = (entry.foot.d + (clear.d || 0) * 2) * CELL_M;
  } else {
    const clear = typeof entry.clear === "number" ? entry.clear : 0;
    w = entry.footprint.w + clear * 2;
    d = entry.footprint.d + clear * 2;
  }
  return (w <= fits.w + 1e-6 && d <= fits.d + 1e-6) || (d <= fits.w + 1e-6 && w <= fits.d + 1e-6);
}

/**
 * Select a library model for a plot: which models fit the free space, and
 * which of those suit the class being seeded. Returns a real ASSET_REGISTRY
 * id, or null -- for a class with no library mapping yet (see
 * LIBRARY_TIERS_FOR_CLASS), or because nothing in the matching tiers and
 * category actually fits. Null is a real answer, the same way it is for
 * `typologyFor`: a plot the library cannot furnish is a fact about the plot,
 * not a bug to paper over with the nearest oversized model.
 *
 * `situation.fits` (set by `planPlot`) is the free space to fit inside, the
 * same value `typologyFor`'s injected `fits` predicate is asked about --
 * one notion of "the space here", not a second one invented for the library.
 */
export function libraryModelFor(className, situation) {
  const tiers = LIBRARY_TIERS_FOR_CLASS[className];
  if (!tiers || !situation.fits) return null;

  const category = registryCategoryFor(className);
  const candidates = Object.values(ASSET_REGISTRY).filter(
    (e) => e.category === category && tiers.includes(e.tier) && libraryEntryFits(e, situation.fits),
  );
  if (!candidates.length) return null;

  // Deterministic, uniform pick -- the registry carries no per-entry weight
  // (unlike TYPOLOGIES_FOR_CLASS's hand-tuned mix), so there is nothing yet
  // to weight by. A future pass that curates relative frequency by style
  // changes this to weightedPick; this is the honest baseline until then.
  const idx = Math.min(candidates.length - 1, Math.floor(hash01(`lib|${situation.plotId}`) * candidates.length));
  return candidates[idx].id;
}

// -----------------------------------------------------------------------------
// THE PLAN
// -----------------------------------------------------------------------------

/**
 * Read a plot's situation: everything the choice of building depends on.
 *
 * `verdict` is `assessFootprint(...).verdict` for this plot, supplied by the
 * caller rather than computed here — this module has no height function and
 * should not acquire one. Passing it in keeps the terrain query where the
 * terrain lives, and keeps this file testable with a plain object.
 */
export function situationOf(plot, index, count, verdict) {
  const position = rowPositionAt(index, count);
  return {
    plotId: plot.id,
    blockId: plot.blockId,
    districtId: plot.districtId,
    className: plot.className,
    position,
    corner: cornerAt(index, count),
    foundation: FOUNDATION_FOR_VERDICT[verdict] || null,
    verdict,
    character: characterFor(plot.blockId, plot.districtId),
  };
}

/**
 * Plan one plot: what stands here, and how.
 *
 * Returns either a placement spec or a refusal WITH A REASON. A refusal is a
 * real answer, not a failure — ground that cannot carry a building is a fact
 * about the world, and the count of refusals per reason is a measurement of it.
 * Silently dropping them is how the old world ended up with 89 buildings
 * standing in rivers.
 */
export function planPlot(plot, index, count, verdict, fits = null) {
  const situation = situationOf(plot, index, count, verdict);

  if (verdict === "refuse" || !situation.foundation) {
    return { plotId: plot.id, refused: true, reason: verdict === "refuse" ? "ground refused" : `unknown verdict: ${verdict}` };
  }

  const b0 = plot.buildable || plot;
  situation.fits = { w: Math.max(0, b0.xMax - b0.xMin), d: Math.max(0, b0.zMax - b0.zMin) };
  const typology = typologyFor(plot.className, situation, fits);
  if (typology === null) {
    // PARK is the designed case, and it is not a defect. An unknown class is.
    const known = Object.prototype.hasOwnProperty.call(TYPOLOGIES_FOR_CLASS, plot.className);
    return { plotId: plot.id, refused: true, reason: known ? "no building on this class" : `unknown plot class: ${plot.className}` };
  }

  const b = plot.buildable || plot;
  const buildableW = Math.max(0, b.xMax - b.xMin);
  const buildableD = Math.max(0, b.zMax - b.zMin);

  const options = {
    corner: situation.corner,
    position: situation.position,
    foundation: situation.foundation,
    character: situation.character,
  };

  // Only the row typologies take a unit count; handing `units` to a villa would
  // be an option it ignores, which reads as though it were doing something.
  if (typology === "bld-terrace") options.units = terraceUnitsFor(buildableW);

  // THE SIZER MAY ASK FOR A SPECIFIC SIZE.
  //
  // buildings.js now honours explicit cellW/cellD, so the bridge can request a
  // building that fits this plot rather than merely checking whether the
  // seed-derived one happens to. Those options come from the sizer because only
  // it knows which typologies read them -- a list here would be a third copy of
  // knowledge that already lives in buildings.js.
  if (typeof fits === "function") {
    const asked = fits(typology, situation);
    if (asked && typeof asked === "object") Object.assign(options, asked);
  }

  return {
    plotId: plot.id,
    blockId: plot.blockId,
    typology,
    // The seed is the plot id: stable, unique, and readable in a stack trace.
    seed: plot.id,
    options,
    situation,
    // Where it goes. `origin: "base-centre"` is the asset lane's model contract,
    // so the centre of the buildable rectangle is the point the building stands on.
    x: (b.xMin + b.xMax) / 2,
    z: (b.zMin + b.zMax) / 2,
    fits: { w: buildableW, d: buildableD },
    refused: false,
  };
}

/**
 * The key that decides which placements can share one piece of geometry.
 *
 * WHY THIS EXISTS AT ALL. `building()` returns ONE MERGED GEOMETRY per building
 * -- about 480 triangles for a terrace. There are 20,472 buildings in this
 * world. Calling it per plot would mean 20,472 distinct geometries and 20,472
 * draw calls, against the 14 instanced buckets the renderer uses today. That is
 * not a tuning problem, it is a different renderer.
 *
 * But two buildings with the same typology, the same row position, the same
 * corner, the same foundation, the same era and the same size ARE the same
 * building. They can share one geometry and be drawn as one InstancedMesh.
 *
 * MEASURED on the real world: the 20,472 placements collapse to 298 distinct
 * keys, median 10 instances each. So the whole city is 298 instanced meshes --
 * the same order as the 549 objects already in the scene -- while still being
 * 298 genuinely different buildings rather than one repeated.
 *
 * WHAT IS DELIBERATELY NOT IN THE KEY: the plot id. Seeding each building from
 * its own plot would make every one unique, which sounds like more variety and
 * is actually the thing that makes instancing impossible. The variety here comes
 * from the SITUATION -- where the building stands and what it stands on -- which
 * is both cheaper and more truthful than noise, because two houses in the same
 * position on the same kind of street SHOULD look alike.
 */
/**
 * The one place a (typology, options) pair is turned into a seed.
 *
 * EVERY OPTION, NOT A HAND-LISTED SUBSET. An earlier version named the six
 * options it knew about, which is a table that has to be kept in step with
 * whatever the sizer adds. The failure is silent and severe: an option that
 * changes the geometry but is missing from the key means two DIFFERENT
 * buildings share one key, so one of them is drawn with the other's mesh.
 *
 * AND IT IS SHARED, WHICH IS THE POINT. `layout-fits.js` measures a candidate
 * building to decide whether it fits; the renderer then builds the chosen one.
 * If those two used different seeds they would be asking about different
 * buildings, and the fit check would be a confident answer to the wrong
 * question. That is not hypothetical -- it happened: the sizer built with its
 * own seed while planPlot used the variant key, and because the seed drives the
 * fallback size, overhangs went from 269 to 556 while every test stayed green.
 * One function, used by both, is what makes the two agree by construction.
 */
export function seedFor(typology, options) {
  const keys = Object.keys(options).sort();
  return [typology, ...keys.map((k) => `${k}=${options[k]}`)].join("|");
}

export function variantKeyOf(placement) {
  return seedFor(placement.typology, placement.options);
}

/**
 * Group placements by the geometry they can share.
 *
 * Returns a Map of variant key -> { typology, options, seed, placements }. The
 * seed is the KEY, not a plot id, so every member of a group gets byte-identical
 * geometry -- which is what makes them instanceable rather than merely similar.
 */
export function groupByVariant(placements) {
  const groups = new Map();
  for (const p of placements) {
    const key = variantKeyOf(p);
    let g = groups.get(key);
    if (!g) {
      g = { key, typology: p.typology, options: p.options, seed: key, placements: [] };
      groups.set(key, g);
    }
    g.placements.push(p);
  }
  return groups;
}

/**
 * Plan every plot in a block.
 *
 * Row membership is what makes a terrace a terrace, so plots are grouped by the
 * row they belong to before their positions are read. `subdivideBlock` names the
 * back row by suffixing the id with "b" — two rows fronting opposite streets —
 * and reading a 20-plot block as one 20-long row would put an "end-right" unit
 * in the middle of the front street.
 */
export function planBlock(block, plots, verdictFor, fits = null) {
  const rows = new Map();
  for (const plot of plots) {
    // "block-1-2-p7b" -> row "b"; "block-1-2-p7" -> row "" (the front row).
    const m = /-p(\d+)([a-z]*)$/.exec(plot.id);
    const rowKey = m ? m[2] : "";
    if (!rows.has(rowKey)) rows.set(rowKey, []);
    rows.get(rowKey).push(plot);
  }

  const out = [];
  for (const [rowKey, row] of rows.entries()) {
    // Sort by x so "end-left" is genuinely the left-hand end on the ground, not
    // whichever plot happened to be pushed first.
    row.sort((a, b) => a.xMin - b.xMin);
    row.forEach((plot, i) => {
      const r = planPlot(plot, i, row.length, verdictFor(plot), fits);
      // WHICH WAY THE BUILDING FACES.
      //
      // subdivideBlock lays two rows back to back, fronting opposite streets --
      // the "b" row faces the far side. A building model is built facing +z, so
      // a back-row building placed unrotated has its front door, its porch and
      // its shopfront against the rear boundary, and shows the street its back
      // garden. Every block in the city would be half right and half backwards,
      // and from the air it would look like nothing at all was wrong.
      //
      // This belongs in the layout, not the renderer: which street a building
      // addresses is a fact about where it stands, not about how it is drawn.
      r.facing = rowKey ? Math.PI : 0;
      out.push(r);
    });
  }
  return out;
}

/**
 * Plan the whole city.
 *
 * `verdictFor(plot)` is supplied by the caller and is where the terrain gets
 * asked. Returns the placements, the refusals, and a count per reason — the
 * last of which is the measurement that says whether the layout is working or
 * quietly refusing half the world.
 */
export function planCity(blocks, plots, verdictFor, fits = null) {
  const byBlock = new Map();
  for (const plot of plots) {
    if (!byBlock.has(plot.blockId)) byBlock.set(plot.blockId, []);
    byBlock.get(plot.blockId).push(plot);
  }

  const placements = [];
  const refusals = [];
  for (const block of blocks) {
    const mine = byBlock.get(block.id);
    if (!mine || !mine.length) continue;
    for (const r of planBlock(block, mine, verdictFor, fits)) {
      (r.refused ? refusals : placements).push(r);
    }
  }

  const refusedWhy = {};
  for (const r of refusals) refusedWhy[r.reason] = (refusedWhy[r.reason] || 0) + 1;

  const byTypology = {};
  for (const p of placements) byTypology[p.typology] = (byTypology[p.typology] || 0) + 1;

  const byCharacter = {};
  for (const p of placements) byCharacter[p.situation.character] = (byCharacter[p.situation.character] || 0) + 1;

  return {
    placements,
    refusals,
    stats: {
      plots: plots.length,
      placed: placements.length,
      refused: refusals.length,
      refusedWhy,
      byTypology,
      byCharacter,
    },
  };
}
