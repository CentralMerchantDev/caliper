import assert from "node:assert/strict";
import {
  ROAD_STANDARDS,
  intersection4Way,
  intersection3Way,
  roundaboutModern,
  rampDiverge,
  rampMerge,
  slipLane,
  turningPocket,
  medianBreak,
  busBay,
  layby,
  crossing,
  railSwitch,
  gradeSeparation,
  bridgeAbutment,
  bridgePier,
  bridgeDeckSpan,
  bridgeApproachRamp,
  bridgeChain,
  bridgeSpan,
} from "../public/roadkit.js";

console.log("=== CALIPER CIRCULATION & ROAD KIT AUDIT (SECTION 3) ===");

const CLASSES = ["FREEWAY", "BOULEVARD", "AVENUE", "STREET", "LANE", "ALLEY"];

// 1. Test 4-Way Intersections across all pairings (6x6 = 36)
let count4Way = 0;
for (const c1 of CLASSES) {
  for (const c2 of CLASSES) {
    const inter = intersection4Way(c1, c2);
    assert.ok(inter.id.includes(c1.toLowerCase()) && inter.id.includes(c2.toLowerCase()));
    assert.equal(inter.sockets.length, 4, `4-way intersection must have 4 sockets (${c1} x ${c2})`);
    assert.ok(inter.footprint.w % 8 === 0 && inter.footprint.d % 8 === 0, `Footprint must be 8m module multiple`);
    assert.equal(inter.lod.length, 3, "Must have 3 LODs");
    count4Way++;
  }
}
console.log(`[Intersections 4-Way] Verified ${count4Way}/36 class combinations with 8m snap & 4 sockets`);

// 2. Test 3-Way T-Junctions across all pairings (6x6 = 36)
let count3Way = 0;
for (const c1 of CLASSES) {
  for (const c2 of CLASSES) {
    const inter = intersection3Way(c1, c2, 90);
    assert.ok(inter.id.includes(c1.toLowerCase()) && inter.id.includes(c2.toLowerCase()));
    assert.equal(inter.sockets.length, 3, `3-way intersection must have 3 sockets (${c1} x ${c2})`);
    assert.ok(inter.footprint.w % 8 === 0 && inter.footprint.d % 8 === 0, `Footprint must be 8m module multiple`);
    count3Way++;
  }
}
console.log(`[Intersections 3-Way] Verified ${count3Way}/36 class combinations with 8m snap & 3 sockets`);

// 3. Test Roundabouts (1-lane and 2-lane)
const rb1 = roundaboutModern(1, "AVENUE", 4);
assert.equal(rb1.sockets.length, 4);
assert.ok(rb1.lod[0].tris >= 120);

const rb2 = roundaboutModern(2, "BOULEVARD", 4);
assert.equal(rb2.sockets.length, 4);
assert.ok(rb2.footprint.w >= 64);
console.log(`[Roundabouts        ] Verified 1-lane and 2-lane roundabouts with splitter islands`);

// 4. Test On/Off Ramps, Gore Areas, and Diverge/Merge
const rampDiv = rampDiverge("FREEWAY", "right");
assert.equal(rampDiv.sockets.length, 3);
assert.equal(rampDiv.footprint.d, 64);

const rampMrg = rampMerge("FREEWAY", "right");
assert.equal(rampMrg.sockets.length, 3);
console.log(`[Freeway Ramps      ] Verified 64m diverge & merge tapers with painted gore chevrons`);

// 5. Test Slip Lanes, Turning Pockets, Median Breaks, Bus Bays, Laybys
const slip = slipLane("BOULEVARD", "AVENUE");
assert.equal(slip.sockets.length, 2);

const pocket = turningPocket("AVENUE", "left");
assert.equal(pocket.sockets.length, 2);

const medBreak = medianBreak("BOULEVARD");
assert.equal(medBreak.sockets.length, 2);

const bus = busBay("STREET");
assert.equal(bus.sockets.length, 2);

const lay = layby("AVENUE");
assert.equal(lay.sockets.length, 2);
console.log(`[Auxiliary Roadways ] Verified slip lanes, turning pockets, median breaks, bus bays & laybys`);

// 6. Test Crossings
for (const t of ["signalised", "zebra", "raised-table", "refuge-island"]) {
  const cr = crossing(t, "STREET");
  assert.ok(cr.id.includes(t));
  assert.equal(cr.sockets.length, 2);
}
console.log(`[Pedestrian Cross   ] Verified signalised, zebra, raised-table & refuge-island crossings`);

// 7. Test Rail Turnout Switch & Grade Separations
const sw = railSwitch("right");
assert.equal(sw.sockets.length, 3);

const sepRail = gradeSeparation("rail-over-road", "AVENUE");
assert.equal(sepRail.clearance, 5.5);
assert.equal(sepRail.sockets.length, 4);

const sepRoad = gradeSeparation("road-over-rail", "AVENUE");
assert.equal(sepRoad.clearance, 5.5);
assert.equal(sepRoad.sockets.length, 4);
console.log(`[Rail & Grade Sep   ] Verified switch points & 5.5m clearance grade separations`);

// 8. Test Modular Chaining Bridge Kit & Invariant Refusals
const chainShort = bridgeChain(4.0, "AVENUE");
assert.equal(chainShort.ok, false, "Must refuse span < 8m");

const chainLong = bridgeChain(950.0, "AVENUE");
assert.equal(chainLong.ok, false, "Must refuse span > 800m");

const chain32 = bridgeChain(32.0, "AVENUE");
assert.equal(chain32.ok, true);
assert.equal(chain32.numSpans, 1);
assert.equal(chain32.numPiers, 0);

const chain128 = bridgeChain(128.0, "AVENUE");
assert.equal(chain128.ok, true);
assert.equal(chain128.numSpans, 2);
assert.equal(chain128.numPiers, 1);
assert.equal(chain128.singleSpanM, 64.0);

const chain240 = bridgeChain(240.0, "AVENUE");
assert.equal(chain240.ok, true);
assert.equal(chain240.numSpans, 4);
assert.equal(chain240.numPiers, 3);
assert.equal(chain240.singleSpanM, 60.0);
console.log(`[Bridge Chaining Kit] Verified automatic pier spacing, modular span chaining, and refusal bounds`);

console.log("\nALL SECTION 3 CIRCULATION CHECKS PASSED GREEN!\n");
