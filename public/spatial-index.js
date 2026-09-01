// =============================================================================
// WHAT IS HERE, AND WHAT IS IT PART OF?
//
// land-use.js answers what a coordinate IS -- water, beach, cliff, buildable.
// This answers what it BELONGS TO: which plot, which block, which district,
// which settlement. Both questions have to be answerable at any point in a
// 40 km world or nothing else works:
//
//   * A visitor clicks a building. "You clicked at (1240, -380)" is useless;
//     "the midrise on block 1156 in the port district" is an address the
//     pipeline can act on.
//   * A request says "near the workshop". Something has to turn that into a
//     coordinate, and a coordinate back into a place, or the model is guessing.
//   * A placement has to land somewhere legal. Knowing the plot means knowing
//     its buildable envelope, its class, its height limit, and what is already
//     on it -- rather than dropping an object at a number and hoping.
//   * Grounding has to be able to say "there is no such thing there", which
//     requires knowing what IS there.
//
// The plan already carries the hierarchy: every plot has a blockId, districtId
// and settlement. What was missing was the reverse -- point to plot -- because
// nothing had built an index over 31,414 rectangles. A linear scan is 31,414
// comparisons per query and the renderer would do it on every mouse move.
//
// So: a uniform grid. Plots are small relative to the world, so bucketing them
// by cell and searching only the cell under the query turns the scan into a
// handful of comparisons. Built once, from the same generated plan everything
// else uses, so it cannot describe a world that is not there.
// =============================================================================

import { sm } from "./world-scale.js";

/** Grid cell size in metres. Larger than the biggest plot, small enough that a
 *  cell holds a handful of them. Plots run from about 20 m to a few hundred. */
const CELL = sm(400);

/**
 * @param {{plots: any[], blocks?: any[], districts?: any[], settlements?: any[]}} world
 *        the output of generateWorld
 */
export function buildSpatialIndex(world) {
  const plots = world.plots || [];
  const cells = new Map();
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;

  const key = (cx, cz) => cx + "," + cz;

  for (let i = 0; i < plots.length; i++) {
    const p = plots[i];
    if (p.xMin < minX) minX = p.xMin;
    if (p.zMin < minZ) minZ = p.zMin;
    if (p.xMax > maxX) maxX = p.xMax;
    if (p.zMax > maxZ) maxZ = p.zMax;
    // A plot can straddle cell boundaries, so it is registered in every cell it
    // touches. Registering only its centre cell is the classic version of this
    // bug: queries near a plot's edge silently find nothing.
    const c0 = Math.floor(p.xMin / CELL), c1 = Math.floor(p.xMax / CELL);
    const r0 = Math.floor(p.zMin / CELL), r1 = Math.floor(p.zMax / CELL);
    for (let cx = c0; cx <= c1; cx++) {
      for (let cz = r0; cz <= r1; cz++) {
        const k = key(cx, cz);
        let bucket = cells.get(k);
        if (!bucket) cells.set(k, (bucket = []));
        bucket.push(i);
      }
    }
  }

  const byId = new Map(plots.map((p) => [p.id, p]));

  /** Which plot contains this point? Null if the point is between plots -- a
   *  street, a park, open ground. That is a real answer, not a failure. */
  function plotAt(x, z) {
    const bucket = cells.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));
    if (!bucket) return null;
    for (const i of bucket) {
      const p = plots[i];
      if (x >= p.xMin && x <= p.xMax && z >= p.zMin && z <= p.zMax) return p;
    }
    return null;
  }

  /**
   * The full address of a point: what it is part of, at every level.
   *
   * Returns the plot when the point is on one, and the settlement either way --
   * a street corner still belongs to a district even though it is on no plot,
   * and "which part of the city is this" is answerable when "which building is
   * this" is not.
   */
  function addressAt(x, z) {
    const plot = plotAt(x, z);
    if (plot) {
      return {
        onPlot: true,
        plotId: plot.id,
        blockId: plot.blockId,
        districtId: plot.districtId,
        settlement: plot.settlement,
        className: plot.className,
        maxHeight: plot.maxHeight,
        buildable: plot.buildable,
        bounds: { xMin: plot.xMin, xMax: plot.xMax, zMin: plot.zMin, zMax: plot.zMax },
      };
    }
    // Not on a plot. Fall back to the nearest one within a block's reach, so
    // "the street outside the tower on Harbour Row" still has an address.
    const near = nearestPlot(x, z, CELL);
    return {
      onPlot: false,
      plotId: null,
      blockId: near ? near.plot.blockId : null,
      districtId: near ? near.plot.districtId : null,
      settlement: near ? near.plot.settlement : null,
      nearestPlotId: near ? near.plot.id : null,
      nearestDistance: near ? Math.round(near.distance) : null,
    };
  }

  /** The closest plot within `radius` metres, or null. Searches outward by
   *  ring so it stops as soon as it can, rather than scanning the world. */
  function nearestPlot(x, z, radius = 1200) {
    const cx0 = Math.floor(x / CELL), cz0 = Math.floor(z / CELL);
    const rings = Math.max(1, Math.ceil(radius / CELL));
    let best = null, bestD = Infinity;
    for (let r = 0; r <= rings; r++) {
      for (let cx = cx0 - r; cx <= cx0 + r; cx++) {
        for (let cz = cz0 - r; cz <= cz0 + r; cz++) {
          // only the ring's perimeter -- the interior was covered by r-1
          if (r > 0 && Math.abs(cx - cx0) !== r && Math.abs(cz - cz0) !== r) continue;
          const bucket = cells.get(key(cx, cz));
          if (!bucket) continue;
          for (const i of bucket) {
            const p = plots[i];
            const dx = x < p.xMin ? p.xMin - x : x > p.xMax ? x - p.xMax : 0;
            const dz = z < p.zMin ? p.zMin - z : z > p.zMax ? z - p.zMax : 0;
            const d = Math.hypot(dx, dz);
            if (d < bestD) { bestD = d; best = p; }
          }
        }
      }
      // A hit inside ring r can still be beaten by one in ring r+1 only if it
      // is further than the ring's inner edge, so stopping early is safe once
      // the best distance is inside the ring already searched.
      if (best && bestD <= r * CELL) break;
    }
    return best && bestD <= radius ? { plot: best, distance: bestD } : null;
  }

  /** Every plot overlapping a rectangle -- what a district-wide change acts on. */
  function plotsIn(bounds) {
    const out = [];
    const c0 = Math.floor(bounds.xMin / CELL), c1 = Math.floor(bounds.xMax / CELL);
    const r0 = Math.floor(bounds.zMin / CELL), r1 = Math.floor(bounds.zMax / CELL);
    const seen = new Set();
    for (let cx = c0; cx <= c1; cx++) {
      for (let cz = r0; cz <= r1; cz++) {
        const bucket = cells.get(key(cx, cz));
        if (!bucket) continue;
        for (const i of bucket) {
          if (seen.has(i)) continue;
          seen.add(i);
          const p = plots[i];
          if (p.xMax < bounds.xMin || p.xMin > bounds.xMax) continue;
          if (p.zMax < bounds.zMin || p.zMin > bounds.zMax) continue;
          out.push(p);
        }
      }
    }
    return out;
  }

  /** A human-readable address, for the inspect card and for grounding. */
  function describeAt(x, z) {
    const a = addressAt(x, z);
    const place = a.settlement ? a.settlement.replace(/-/g, " ") : "open country";
    if (a.onPlot) {
      return `a ${a.className.toLowerCase()} plot (${a.plotId}) on block ${a.blockId}, in the ${a.districtId} district of ${place}`;
    }
    if (a.nearestPlotId) {
      return `open ground in the ${a.districtId} district of ${place}, about ${a.nearestDistance} m from ${a.nearestPlotId}`;
    }
    return "open country, outside any settlement";
  }

  /** What the pipeline needs to know before it puts something somewhere. */
  function plotById(id) {
    return byId.get(id) ?? null;
  }

  return {
    plotAt,
    addressAt,
    nearestPlot,
    plotsIn,
    describeAt,
    plotById,
    stats: {
      plots: plots.length,
      cells: cells.size,
      cellSize: CELL,
      bounds: { minX, minZ, maxX, maxZ },
    },
  };
}
