// =============================================================================
// NO PLOT STANDS IN A CARRIAGEWAY
//
// This is the property that should have existed from the beginning, and its
// absence hid a defect for the life of the build.
//
// generateSettlement promotes one road in roughly every 800 m to a wider class
// -- an avenue becomes a BOULEVARD, a street becomes an AVENUE -- but the blocks
// beside them were inset by FIXED constants taken from AVENUE and STREET. So a
// block next to a promoted road was set back for a road narrower than the one
// actually built:
//
//     north-south   inset 14 m (AVENUE/2),  BOULEVARD needs 22   ->  8 m into it
//     east-west     inset  9 m (STREET/2),  AVENUE needs 14      ->  5 m into it
//
// 328 of 1,399 roads are promoted, so this was most of the arterial network,
// not an edge case. Nothing caught it because a plot overlapping a road is
// invisible until something asks the ground whether it is free -- there was no
// picture in which it looked wrong, and no assertion that it was not happening.
//
// It only surfaced when roads were registered into whatIsAt and the plot
// generator began refusing reserved ground: plotsDroppedForReservedGround went
// from 406 to 6,190, and 30% of the city vanished. The registration did not
// cause the bug. It revealed one that had always been there.
//
// So the check is on the GEOMETRY, not on the drop count. A count can be made
// green by loosening a margin; an overlap cannot.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import { generateWorld, ROADS } from "../public/city-plan.js";
import { LandField, makeHeightAt } from "../public/terrain.js";

type Rect = { id: string; cls: string; xMin: number; xMax: number; zMin: number; zMax: number };

test("no plot overlaps the carriageway of any road", () => {
  const world = generateWorld(makeHeightAt(new LandField()));

  // A road's TRUE extent: its class's full right-of-way, which is the same
  // rectangle the registry reserves. Reading it from ROADS rather than from a
  // number typed here means a class getting wider cannot silently pass.
  const rects: Rect[] = [];
  for (const r of world.roads as any[]) {
    const spec = (ROADS as any)[r.class];
    if (!spec) continue;
    const half = spec.row / 2;
    const ew = r.axis === "ew";
    const f = Math.min(r.from, r.to), t = Math.max(r.from, r.to);
    rects.push({
      id: r.id, cls: r.class,
      xMin: ew ? f : r.at - half, xMax: ew ? t : r.at + half,
      zMin: ew ? r.at - half : f, zMax: ew ? r.at + half : t,
    });
  }
  assert.ok(rects.length > 100, `only ${rects.length} roads resolved a class — has ROADS changed shape?`);

  // Grid index: 16,770 plots against 1,399 roads is 23 million pairs otherwise.
  const CELL = 200;
  const grid = new Map<string, Rect[]>();
  const key = (i: number, j: number) => `${i},${j}`;
  for (const R of rects) {
    for (let i = Math.floor(R.xMin / CELL); i <= Math.floor(R.xMax / CELL); i++) {
      for (let j = Math.floor(R.zMin / CELL); j <= Math.floor(R.zMax / CELL); j++) {
        const k = key(i, j);
        let b = grid.get(k);
        if (!b) grid.set(k, (b = []));
        b.push(R);
      }
    }
  }

  // 1 cm, not 0: two rectangles designed to touch exactly can differ in the
  // last bit of a float, and calling that an overlap would fail on arithmetic
  // rather than on geometry.
  const TOUCH = 0.01;
  const offenders: string[] = [];
  let deepest = 0;

  for (const p of world.plots as any[]) {
    const seen = new Set<string>();
    for (let i = Math.floor(p.xMin / CELL); i <= Math.floor(p.xMax / CELL); i++) {
      for (let j = Math.floor(p.zMin / CELL); j <= Math.floor(p.zMax / CELL); j++) {
        for (const R of grid.get(key(i, j)) || []) {
          if (seen.has(R.id)) continue;
          seen.add(R.id);
          const ox = Math.min(p.xMax, R.xMax) - Math.max(p.xMin, R.xMin);
          const oz = Math.min(p.zMax, R.zMax) - Math.max(p.zMin, R.zMin);
          if (ox > TOUCH && oz > TOUCH) {
            deepest = Math.max(deepest, Math.min(ox, oz));
            if (offenders.length < 8) {
              offenders.push(
                `plot ${p.id} overlaps ${R.cls} ${R.id} by ${Math.min(ox, oz).toFixed(2)} m`,
              );
            }
          }
        }
      }
    }
  }

  assert.deepEqual(
    offenders, [],
    `plots are standing in carriageways (deepest ${deepest.toFixed(2)} m):\n  ` +
    offenders.join("\n  ") +
    `\n\nThe usual cause is a block inset by a fixed class half-width while the ` +
    `road beside it was promoted to a wider class. Set each block edge back by ` +
    `the road ON THAT EDGE, not by a constant.`,
  );
});

test("the promoted arterials this guards actually exist", () => {
  // A guardrail for the test above. If promotion stopped happening, the overlap
  // check would pass for the wrong reason -- green because there is nothing to
  // catch, which is the failure mode this project keeps finding in its own work.
  const world = generateWorld(makeHeightAt(new LandField()));
  const byClass: Record<string, number> = {};
  for (const r of world.roads as any[]) byClass[r.class] = (byClass[r.class] || 0) + 1;

  assert.ok(
    (byClass.BOULEVARD || 0) > 50,
    `only ${byClass.BOULEVARD || 0} BOULEVARDs — arterial promotion appears to have stopped, ` +
    `so the overlap test above is no longer exercising the case it was written for`,
  );
  assert.ok(
    (byClass.AVENUE || 0) > 50 && (byClass.STREET || 0) > 50,
    `the road hierarchy has collapsed: ${JSON.stringify(byClass)}`,
  );
});
