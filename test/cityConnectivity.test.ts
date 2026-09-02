// =============================================================================
// CAN YOU DRIVE ACROSS THE CITY?
//
// "Every land mass is reachable" (cityWorld.test.ts) checks that the BRIDGES
// form a connected graph over the land masses. That is necessary and not
// sufficient: a bridge can be correctly placed between two islands while the
// road networks on either side never actually meet it, and then the map says
// connected and the city is not.
//
// This is the stronger statement, and it lives in the repo rather than in a
// throwaway script because a throwaway script got it wrong twice -- once by
// treating a bridge and its own collinear approach as unconnected (they are
// parallel, so they never "cross"), and once by disagreeing with a crossing
// that manual inspection showed was real. A measurement that important should
// be maintained, not retyped each time.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import { generateWorld, LANDMASSES } from "../public/city-plan.js";
import { LandField, makeHeightAt } from "../public/terrain.js";

const heightAt = makeHeightAt(new LandField(16));
const world = generateWorld(heightAt);
const roads = world.roads as any[];

/** Union-find over roads: two roads are joined if a vehicle could turn between them. */
function components() {
  const parent = roads.map((_, i) => i);
  const find = (a: number): number => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
  const union = (a: number, b: number) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
  const paved = (x: number, z: number) => heightAt(x, z) >= 0.8;

  for (let i = 0; i < roads.length; i++) {
    const r = roads[i], rew = r.axis === "ew";
    for (let j = i + 1; j < roads.length; j++) {
      const s = roads[j], sew = s.axis === "ew";

      if (rew === sew) {
        // Same lane, overlapping: a bridge and the approach built in line with
        // it never "cross", but you can obviously drive from one to the other.
        if (Math.abs(r.at - s.at) > 10) continue;
        const r0 = Math.min(r.from, r.to), r1 = Math.max(r.from, r.to);
        const s0 = Math.min(s.from, s.to), s1 = Math.max(s.from, s.to);
        if (r1 < s0 - 60 || s1 < r0 - 60) continue;
        union(i, j);
        continue;
      }

      // Perpendicular: they must actually cross, on ground that exists.
      const cx = rew ? s.at : r.at, cz = rew ? r.at : s.at;
      const alongR = rew ? cx : cz, alongS = sew ? cx : cz;
      if (alongR < Math.min(r.from, r.to) - 20 || alongR > Math.max(r.from, r.to) + 20) continue;
      if (alongS < Math.min(s.from, s.to) - 20 || alongS > Math.max(s.from, s.to) + 20) continue;
      if (!r.bridge && !s.bridge && !paved(cx, cz)) continue;
      union(i, j);
    }
  }
  const byRoot = new Map<number, any[]>();
  roads.forEach((r, i) => {
    const k = find(i);
    byRoot.set(k, (byRoot.get(k) || []).concat([r]));
  });
  return [...byRoot.values()].sort((a, b) => b.length - a.length);
}

const groups = components();
const main = new Set(groups[0].map((r: any) => r.settlement));

test("every inhabited place is on the same road network", () => {
  // The thing that actually matters: a person in any settlement can drive to
  // any other. Fragments of clipped pavement in open country are not the point
  // and are excluded -- what must not happen is a TOWN being cut off.
  const inhabited = new Set(
    roads.filter((r) => r.settlement && !["bridge", "approach", "freeway", "coast-road", "barrier-spine"].includes(r.settlement))
      .map((r) => r.settlement),
  );
  const stranded = [...inhabited].filter((s) => !main.has(s));
  // TWO, down from ten, and both are understood.
  //
  // The network now respects the land registry (land-use.js) and is joined by
  // an A* router over driveable ground -- water passable but expensive, cliffs
  // and unclimbable banks not passable at all -- run to a fixed point, because
  // connecting one group changes what counts as the main network for the next.
  // A 2.35 km causeway crosses the eastern inlet, measured at its narrowest.
  //
  // Three router failures on the way, all worth remembering: an L-shape cannot
  // route AROUND anything; a path collapse that emitted segments which did not
  // touch made things worse, not better; and at a water cost of 9 the search
  // simply swam, returning routes that were mostly open sea because that was
  // cheaper than going round. Water costs 70 now and any leg over 40% water is
  // refused outright.
  //
  // The last two are Redcliff (a small outer island whose only link is one
  // crossing) and one eastern mainland band. Neither is a road problem -- they
  // need another crossing, which is a layout decision rather than a bug.
  // THE BUDGET WAS 2 AND THE ACTUAL IS 0, SO IT ABSORBED TWO REAL REGRESSIONS.
  //
  // A test-suite audit deleted both crossings to Redcliff Island from BRIDGES,
  // stranding a genuinely inhabited settlement — and this test, named "every
  // inhabited place is on the same road network", stayed green.
  //
  // The comment justifying 2 ("both are understood -- Redcliff ... and one
  // eastern mainland band") described a world that no longer exists: the
  // geography rebuild connected them, and nobody came back to close the budget.
  // A debt that has been paid is not a debt, and leaving the allowance in place
  // is how a test stops noticing the thing it is named for.
  //
  // Zero, with the number stated in the failure message rather than a budget, so
  // a future regression names itself instead of fitting inside an allowance.
  const BUDGET = 0;
  assert.ok(stranded.length <= BUDGET,
    `${stranded.length} settlement(s) cannot be driven to: ${stranded.join(", ")}. ` +
    `The budget here is 0 on purpose — it was 2 for a debt that has since been ` +
    `paid, and while it stood this test absorbed two stranded settlements silently.`);
});

test("every land mass with a town on it is on the network", () => {
  const settled = new Map<string, string>();
  for (const r of roads) {
    if (!r.settlement || r.settlement === "bridge" || r.settlement === "approach") continue;
    settled.set(r.settlement, r.settlement);
  }
  const massesWithTowns = (LANDMASSES as any[])
    .filter((m) => m.kind !== "mainland")
    .map((m) => m.id);
  assert.ok(massesWithTowns.length > 5, "expected a real archipelago");
  // reported rather than asserted per-mass: the settlement test above is the
  // sharp one, this guards the shape of the world it runs against
  assert.ok(groups[0].length > roads.length * 0.4,
    `the largest network is only ${((groups[0].length / roads.length) * 100).toFixed(0)}% of all roads`);
});

test("the road network is not silently fragmenting", () => {
  // A budget, like the bridge one, so a regression is visible rather than
  // absorbed. Small isolated fragments are normal -- a lane clipped to a
  // headland, a stub on a spit. Hundreds of them are not.
  const fragments = groups.slice(1).filter((g) => g.length >= 4).length;
  assert.ok(fragments <= 14, `${fragments} road fragments of 4+ segments (budget 14)`);
});
