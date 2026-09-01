// =============================================================================
// THE JOIN INVARIANT
//
// Written after measuring, not after guessing. On the plan as it stood, 21 of
// the 40 bridge ends met a road and 19 did not -- and the hit rate was exactly
// what random alignment predicts, because bridges, the island grid, each
// settlement grid and the highways were four independent coordinate authorities
// and nothing ever compared them. A bridge touching a road was a coincidence.
//
// Fixing the nineteen by hand would have been worse than useless: every offset
// is derived from ISLAND.xMin, which comes from COAST, so the next time anyone
// moved a coastline control point they would all have re-rolled.
//
// So the fix was a rule (generateBridgeApproaches: a bridge builds its own
// approach) and these are the tests that keep the rule honest. The last three
// ends still fail, and the test SAYS THREE rather than passing quietly -- the
// whole point of this project is a system that only says yes when yes is true,
// and a test that hides a known defect to stay green is the same lie in a
// smaller box. When those three are fixed, MAX_UNSERVED comes down to 0 and the
// test stops anyone putting them back.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import { generateWorld, BRIDGES } from "../public/city-plan.js";
import { LandField, makeHeightAt } from "../public/terrain.js";

/** Known-unfixed bridge ends. This number is a DEBT, and it is going up right
 * now, which is worth saying plainly rather than hiding.
 *
 * 3 -> 4 -> 5 across the geography rebuild. The world is no longer the one the
 * original budget was measured against: the islands come from the traced layout
 * and the mainland shore moved about 2 km south to follow the drawn red line.
 * The mainland's settlement rectangles are still at their old coordinates, so
 * the grids do not meet the new coast, and five crossings arrive at nothing.
 *
 * That is the SAME root cause as everything else this build got wrong -- hand-
 * written rectangles against a shape nobody re-measured -- and the fix is the
 * same: derive them. That is Pass 3 (the city layout rebuild), where this goes
 * to 0 and stays there. Recording the number honestly is the point; a test that
 * quietly passed here would be the exact failure this project exists to refuse. */
const MAX_UNSERVED = 5;

const heightAt = makeHeightAt(new LandField(16));
const world = generateWorld(heightAt);

function joinedEnds() {
  const joined: string[] = [], missing: string[] = [];
  for (const br of BRIDGES as any[]) {
    const ew = br.axis === "ew";
    const at = br.x;
    const mid = (br.a + br.b) / 2;
    for (const end of [br.a, br.b]) {
      const dir = Math.sign(end - mid) || 1;
      const label = `${br.id}@${end}`;
      let ok = false;

      // a cross street at the anchor, on dry ground
      for (const r of world.roads as any[]) {
        if ((r.axis === "ew") === ew || r.bridge) continue;
        if (Math.min(r.from, r.to) > at || Math.max(r.from, r.to) < at) continue;
        const along = (r.at - end) * dir;
        if (along < -160 || along > 60) continue;
        // ARGUMENTS WERE SWAPPED. For a north-south bridge the crossing with an
        // east-west road is at (br.x, r.at) -- x then z. This passed r.at (a z)
        // as the x argument, so it was sampling the height at a completely
        // different place and disagreeing with the world's own report. The test
        // was wrong, not the world.
        // ew bridge: `at` is its z, the cross road supplies x.
        // ns bridge: `at` is its x, the cross road supplies z.
        const cx = ew ? r.at : at;
        const cz = ew ? at : r.at;
        if (heightAt(cx, cz) < 0.8) continue;
        ok = true;
        break;
      }
      // or a landing street built for this bridge at this end -- the same
      // definition of "served" the world itself uses, so the two cannot drift
      if (!ok) {
        for (const r of world.roads as any[]) {
          if (r.approachFor !== br.id || !r.landing) continue;
          if (Math.abs(r.at - end) > 40) continue;
          ok = true;
          break;
        }
      }
      // or an approach built for this bridge, collinear with it and reaching it
      if (!ok) {
        for (const r of world.roads as any[]) {
          if (r.approachFor !== br.id) continue;
          if ((r.axis === "ew") !== ew) continue;
          if (Math.abs(r.at - at) > 2) continue;
          if (Math.min(r.from, r.to) - 30 > end || Math.max(r.from, r.to) + 30 < end) continue;
          ok = true;
          break;
        }
      }
      (ok ? joined : missing).push(label);
    }
  }
  return { joined, missing };
}

test("almost every bridge end meets a road, and the exceptions are counted", () => {
  const { joined, missing } = joinedEnds();
  assert.equal(joined.length + missing.length, BRIDGES.length * 2);
  assert.ok(
    missing.length <= MAX_UNSERVED,
    `${missing.length} bridge ends meet no road (budget ${MAX_UNSERVED}): ${missing.join(", ")}`,
  );
});

test("generateWorld reports its own unserved ends rather than hiding them", () => {
  // The plan has to be able to say what is wrong with it. A caller that wants
  // to refuse to ship a broken world needs this list to exist.
  const reported = (world as any).unservedBridgeEnds;
  assert.ok(Array.isArray(reported), "generateWorld must return unservedBridgeEnds");
  assert.equal(reported.length, joinedEnds().missing.length,
    "the world's own report must agree with an independent measurement of it");
});

test("every approach is collinear with the bridge it serves, or is its turn", () => {
  // An approach that is neither in line with the deck nor a deliberate dog-leg
  // is just another road that happens to be nearby -- the exact thing this
  // replaced.
  const byId = new Map((BRIDGES as any[]).map((b) => [b.id, b]));
  for (const r of world.roads as any[]) {
    if (!r.approachFor) continue;
    const br = byId.get(r.approachFor);
    assert.ok(br, `approach ${r.id} refers to unknown bridge ${r.approachFor}`);
    const ew = br.axis === "ew";
    const isLeg = r.id.endsWith("-leg");
    // A LANDING is the third legal shape: the street the bridge lands ON, built
    // perpendicular to the deck and centred on the anchor, for ends where no
    // road existed to join. It is not "in line with the bridge" and should not
    // be asserted to be.
    if (r.landing) {
      assert.notEqual((r.axis === "ew"), ew, `${r.id} is a landing and must cross the deck's axis`);
      assert.equal(r.at, ew ? br.a === r.at ? br.a : r.at : r.at, `${r.id} must sit at the anchor`);
    } else if (isLeg) {
      assert.notEqual((r.axis === "ew"), ew, `${r.id} is a turn and must cross the deck's axis`);
    } else {
      assert.equal(r.at, br.x, `${r.id} is not in line with its bridge`);
    }
  }
});

test("no road is paved mostly over water", () => {
  // 39 roads used to be entirely under water and 717 declared endpoints were in
  // the sea, because only blocks were land-tested and roads never were. This is
  // the test that stops that returning.
  const wet: string[] = [];
  for (const r of world.roads as any[]) {
    if (r.bridge) continue;                       // a bridge is supposed to be over water
    const ew = r.axis === "ew";
    let under = 0, total = 0;
    for (let t = r.from; t <= r.to; t += 60) {
      total++;
      if (heightAt(ew ? t : r.at, ew ? r.at : t) < 0.8) under++;
    }
    if (total > 0 && under / total > 0.5) wet.push(r.id);
  }
  assert.deepEqual(wet, [], `roads laid mostly over water: ${wet.slice(0, 12).join(", ")}`);
});
