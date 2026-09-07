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

/** world.plots -> "plot" pieces. A plot is buildable SPACE, not a building
 *  -- PLACEMENT-CONTRACT.md Part 1, and confirmed directly: every plot's
 *  `occupant` field is always null in the current codebase, nothing ever
 *  writes to it. pieceType "plot" says exactly that, honestly. standsOn
 *  matches land-use.js's own buildAllowedAt(): strictly USE.BUILDABLE. */
function plotPieces(world) {
  const out = [];
  for (const p of world.plots) {
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

/** The full placed-piece list for a generated world: plots, roads, bridges.
 *  Trees and props are not included -- see the file header. */
export function piecesFromWorld(world) {
  return [...plotPieces(world), ...roadPieces(world), ...bridgePieces(world)];
}
