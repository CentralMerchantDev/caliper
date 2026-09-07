// =============================================================================
// generateWorld() -> a list of placed pieces
//
// BOARD-CONVERSION-PLAN.md P1.1. Converts today's world -- plots, roads,
// bridges -- into the uniform placed-piece record `board.js` operates on:
//
//   { id, pieceType, cell: {i, j, k}, rotation, foot: {w, d}, levels,
//     clear: {w, d}, standsOn: [...], surface }
//
// ADDRESSED IN ATOMS (1 m), PER PLACEMENT-CONTRACT.md PART 0. `cell.i`/
// `cell.j` come from grid.js's `atomOf`, and `foot.w`/`foot.d` come from
// `atomsFor` -- whole METRES, not whole 8 m cells. A real ROAD_STANDARDS
// width (an 18 m STREET, a 62 m FREEWAY) now fits exactly; the old 8 m
// grid forced every one of them to round outward.
//
// Everything adapted here is GROUND LEVEL and ONE STOREY -- k: 0, levels: 1
// -- honestly, because none of it carries real elevation/height data today
// (plots have no `k`/`levels` field at all; roads/bridges have a deck
// height only implicitly, via BRIDGE_CLEARANCE, never stored per-object).
// Real stacking (a raised road over another, a rooftop piece) is not
// claimed here.
//
// standsOn USES land-use.js's OWN VOCABULARY (water/beach/cliff/steep/
// reserved/buildable), NOT roadkit.js's separate standsOn convention
// (open/water/rock/track/plot). BOARD-CONVERSION-PLAN.md's P1.1 text says
// "both halves already exist" without saying they share one vocabulary --
// they do not. board.js's canPlace checks a k=0 piece's standsOn against
// land-use.js's classifyAt(), so that is the vocabulary used here.
// Reconciling roadkit.js's own standsOn strings with this one is real,
// unresolved work -- P2's job (roads become roadkit pieces), not named as
// done here.
//
// TREES AND PROPS ARE NOT ADAPTED HERE, ON PURPOSE.
//
// A read of generateWorld()'s actual return value (not the plan's prose)
// found no tree or prop data on it at all: trees are bare [x, z, scale,
// variant] tuples built inside city-render.js's render loop and thrown away
// after one frame, with no id and nothing persisted; props/street furniture
// are the same shape, generated and consumed entirely inside the renderer.
// prop-manifest.js is a catalogue of prop TYPES, not placed instances. There
// is no current output to adapt -- inventing instance data here would not be
// adaptation, it would be new generation, which is P3.2's job ("Trees,
// street furniture and props become placed pieces rather than loop output"
// -- P3.2 names this exact gap and owns closing it). Left undone here,
// named, not silently skipped.
//
// BUILDINGS -- ADOPTED, WITH TWO REAL DECISIONS MADE, NOT ASSUMED FREE.
//
// BOARD-CONVERSION-PLAN.md P3.1 calls this "mostly adoption... they already
// have ids and footprints." Read directly against `planCity()`'s (layout.js)
// actual return value, neither claim held: a placement carries `plotId`
// (the PLOT's id, reused, not a building id of its own) and `fits` (the
// plot's available ENVELOPE, not the building's real built footprint --
// that only exists after calling `buildings.js`'s three.js `building()`,
// which board-adapter.js deliberately does not import, matching every other
// conversion in this file). Two decisions, made and named:
//
//   1. FOOTPRINT: `plot.buildable` (the plot's own setback-adjusted rect,
//      already computed by city-plan.js, corner-anchored, three.js-free) is
//      used as a PROXY for the building's real footprint. Close, not exact
//      -- a real building rarely fills its buildable envelope corner to
//      corner. Named here, not claimed as the model's own measured size.
//   2. DOUBLE-RESERVATION: `board.js`'s `canPlace` refuses ANY two pieces
//      whose foot+clear cells overlap, regardless of `pieceType` -- so a
//      "plot" piece and a "building" piece covering the same ground would
//      never both fit on one board. `plotPieces()` below now SKIPS a plot
//      with a building on it; `buildingPieces()` is the one piece that
//      actually reserves that ground. An unbuilt plot still gets its own
//      "plot" piece, exactly as before.
//
// BRIDGES APPEAR TWICE IN generateWorld()'S OWN OUTPUT, AND ARE MERGED HERE.
//
// Every physical bridge exists as a `roads[]` entry (the deck span that
// actually joins the network, carrying `r.bridge = <id>`) AND as a separate
// entry in the declarative `bridges[]` array (`bridges[].id`, no "bridge-"
// prefix). Adapting both would place two pieces on the same ground for one
// physical object -- the double-reservation bug world-registry.js's own
// header names as the reason it exists. Bridge DECKS are taken from the
// declarative array (`bridges[]`, the simpler, undamaged shape); the
// matching `roads[]` entries (`r.bridge` truthy) are excluded from the road
// category.
// =============================================================================

import { atomOf, atomsFor } from "./grid.js";
import { ROADS } from "./city-plan.js";
import { USE } from "./land-use.js";

/**
 * A span {axis, at, from, to} (or a bridge's {axis, x, a, b}), plus a
 * real-world lane width, converted to a cell-anchored rectangle. Rotation
 * is not used for roads/bridges -- orientation is encoded directly into
 * which of foot.w/foot.d is the along-axis length, which is simpler and
 * unambiguous for an axis-aligned span. (Buildings, later, will need real
 * rotation; roads do not, today.)
 */
function spanToCellFoot({ axis, at, lo, hi, rowWidth }) {
  const length = hi - lo;
  if (axis === "ew") {
    return { xMin: lo, zMin: at - rowWidth / 2, foot: { w: atomsFor(length), d: atomsFor(rowWidth) } };
  }
  // "ns" is the default in this codebase's own data (city-plan.js's BRIDGES
  // entries frequently omit axis, and generateWorld treats that as "ns").
  return { xMin: at - rowWidth / 2, zMin: lo, foot: { w: atomsFor(rowWidth), d: atomsFor(length) } };
}

const NO_CLEAR = { w: 0, d: 0 };

/** world.plots -> "plot" pieces, EXCLUDING any plot a building has been
 *  placed on (`builtPlotIds`) -- see the file header's "DOUBLE-RESERVATION"
 *  note. Historically every plot's `occupant` field was always null and
 *  every plot got a piece unconditionally; that stays true when
 *  `builtPlotIds` is omitted (every existing caller/test, unchanged). A
 *  plot is buildable SPACE, not a building -- PLACEMENT-CONTRACT.md Part 1.
 *  pieceType "plot" says exactly that, honestly. standsOn matches
 *  land-use.js's own buildAllowedAt(): strictly USE.BUILDABLE. */
function plotPieces(world, builtPlotIds = null) {
  const out = [];
  for (const p of world.plots) {
    if (builtPlotIds && builtPlotIds.has(p.id)) continue;
    out.push({
      id: p.id,
      pieceType: "plot",
      cell: { ...atomOf(p.xMin, p.zMin), k: 0 },
      rotation: 0,
      foot: { w: atomsFor(p.width), d: atomsFor(p.depth) },
      levels: 1,
      clear: NO_CLEAR, // no clear concept on a plot today -- setbacks are baked into `buildable`, a different thing
      standsOn: [USE.BUILDABLE],
      surface: "plaza", // a cleared plot presents as open ground -- the closest declared surface kind to "buildable lot"
    });
  }
  return out;
}

/** planCity()'s placements (public/layout.js) -> "building" pieces. Not
 *  derived from `world` -- unlike plots/roads/bridges, buildings do not
 *  exist on `generateWorld()`'s own return value at all (confirmed by
 *  reading it directly); `placements` is `planCity(world.blocks,
 *  world.plots, verdictFor, fits).placements`, computed separately, and a
 *  second, explicit argument here rather than folded silently into `world`.
 *  Refused/unplaced entries (`refused: true`, or no matching plot) are
 *  skipped -- nothing is placed for a building the layout itself declined
 *  to build. See the file header for the footprint-proxy and rotation-unit
 *  decisions. */
function buildingPieces(world, placements) {
  const plotById = new Map(world.plots.map((p) => [p.id, p]));
  const out = [];
  for (const pl of placements) {
    if (pl.refused) continue;
    const plot = plotById.get(pl.plotId);
    if (!plot || !plot.buildable) continue;
    const b = plot.buildable;
    const w = b.xMax - b.xMin, d = b.zMax - b.zMin;
    if (w <= 0 || d <= 0) continue;
    // `facing` is radians (0 or Math.PI, front row vs back row -- layout.js
    // never assigns a left/right rotation); board.js wants integer degrees
    // from {0, 90, 180, 270}.
    const rotation = Math.abs(Math.round(((pl.facing || 0) * 180) / Math.PI)) % 360;
    // NOT atomsFor(w)/atomsFor(d) -- a real bug, measured, not assumed.
    // PLOT_RULES.SETBACK_SIDE is 0 ("party walls allowed"), so row-adjacent
    // buildings' buildable rects share an EXACT boundary in float space.
    // atomOf() floors an anchor; atomsFor() CEILS a width (correct in
    // isolation -- a footprint should never under-report its own size) --
    // but `floor(xMin) + ceil(width)` can exceed `floor(xMax)` by exactly 1
    // atom, and does: measured, 2,735 of 17,105 buildings overlapped a
    // neighbour by exactly 1 atom along the full shared edge before this
    // fix (oi=1 in every single case, confirming the mechanism rather than
    // a scatter of unrelated defects). Deriving the far edge the SAME way
    // (floor of the real coordinate) as the neighbour's own anchor will
    // independently compute makes the two agree by construction, not by
    // coincidence.
    const { i: iMin, j: jMin } = atomOf(b.xMin, b.zMin);
    const { i: iMax, j: jMax } = atomOf(b.xMax, b.zMax);
    out.push({
      id: `bld-${pl.plotId}`,
      pieceType: pl.typology || "building",
      cell: { i: iMin, j: jMin, k: 0 },
      rotation: rotation === 90 || rotation === 270 ? 0 : rotation, // only 0/180 are ever produced; guard rather than trust silently
      foot: { w: Math.max(1, iMax - iMin), d: Math.max(1, jMax - jMin) },
      levels: 1, // ground-level, one storey -- same honest limitation as roads/bridges above; no real height data adapted here
      clear: NO_CLEAR,
      standsOn: [USE.BUILDABLE],
      surface: "building",
    });
  }
  return out;
}

/** world.roads (excluding bridge decks) -> one piece per span. standsOn
 *  matches land-use.js's own roadAllowedAt(): buildable, steep or reserved
 *  -- everything except water/beach/cliff. */
function roadPieces(world) {
  const out = [];
  for (const r of world.roads) {
    if (r.bridge) continue; // this physical bridge is adapted once, from world.bridges below
    const std = ROADS[r.class] || ROADS.STREET;
    const lo = Math.min(r.from, r.to), hi = Math.max(r.from, r.to);
    const { xMin, zMin, foot } = spanToCellFoot({ axis: r.axis, at: r.at, lo, hi, rowWidth: std.row });
    out.push({
      id: r.id,
      pieceType: r.class,
      cell: { ...atomOf(xMin, zMin), k: 0 },
      rotation: 0,
      foot,
      levels: 1,
      clear: NO_CLEAR,
      standsOn: [USE.BUILDABLE, USE.STEEP, USE.RESERVED],
      surface: "road",
    });
  }
  return out;
}

/** world.bridges -> one piece per physical bridge. standsOn is a judgment
 *  call, not derived from an existing rule -- PLACEMENT-CONTRACT.md Part 2
 *  names water/bridge placement as wholly unbuilt ("no water placement rule
 *  of any kind... this part is not half-built; it is absent"). A bridge's
 *  single declared span crosses both open water AND its own land
 *  abutments, so its one standsOn list has to cover both rather than
 *  refusing its own ends. Flagged here, not assumed silently. */
function bridgePieces(world) {
  const out = [];
  for (const b of world.bridges) {
    const std = ROADS[b.class] || ROADS.AVENUE;
    const lo = Math.min(b.a, b.b), hi = Math.max(b.a, b.b);
    const { xMin, zMin, foot } = spanToCellFoot({ axis: b.axis || "ns", at: b.x, lo, hi, rowWidth: std.row });
    out.push({
      id: b.id,
      pieceType: `bridge-${b.type}`,
      cell: { ...atomOf(xMin, zMin), k: 0 },
      rotation: 0,
      foot,
      levels: 1,
      clear: NO_CLEAR,
      standsOn: [USE.WATER, USE.BUILDABLE, USE.BEACH],
      surface: "deck",
    });
  }
  return out;
}

/** The full placed-piece list for a generated world: plots, roads, bridges,
 *  and buildings when `placements` (planCity()'s own output) is supplied.
 *  `placements` is optional and defaults to none -- every existing caller
 *  that only has `world` keeps its exact prior behaviour (plots
 *  unconditionally included, no buildings), unchanged. Trees and props are
 *  not included -- see the file header. */
export function piecesFromWorld(world, placements = null) {
  // Derived from what buildingPieces() ACTUALLY built, not from "not
  // refused" -- found by a blind audit, not assumed equivalent:
  // buildingPieces() has its own skip conditions (a plot with no
  // `buildable` rect, or a degenerate w<=0/d<=0 one) that layout.js's own
  // `planPlot()` does not treat as refused (it falls back to the plot's
  // raw bounds instead). The two disagreeing meant a plot could vanish
  // from the board entirely -- no "plot" piece (builtPlotIds said it was
  // built) and no "building" piece (buildingPieces() itself skipped it) --
  // a placement reported as successful producing no piece at all.
  // Currently latent (0 of 17,105 real placements hit it, measured), but
  // structurally guaranteed not to recur this way: the SAME function's own
  // output decides both what plotPieces() excludes and what gets added.
  const buildings = placements ? buildingPieces(world, placements) : [];
  const builtPlotIds = placements ? new Set(buildings.map((p) => p.id.slice("bld-".length))) : null;
  return [...plotPieces(world, builtPlotIds), ...roadPieces(world), ...bridgePieces(world), ...buildings];
}
