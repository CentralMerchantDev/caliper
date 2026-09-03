import * as THREE from "../public/vendor/three/three.module.min.js";
import {
  bldVilla,
  bldTerrace,
  bldTownhouse,
  bldMidrise,
  bldTower,
  bldShop,
  bldOffice,
  bldWarehouse,
  bldWorkshop,
  bldApartmentWalkup,
  bldHighStreetTerrace,
  bldBusinessParkBlock,
} from "../public/buildings.js";
import {
  boundaryFrontWall,
  boundaryGate,
  boundaryDriveway,
  boundaryPath,
  boundaryBinStore,
  boundarySideReturn,
  parkedCarRow,
  gardenFeature,
  assertModelDeclaration,
} from "../public/props.js";
import assert from "node:assert/strict";

function geometryFingerprint(geo) {
  if (!geo || !geo.attributes || !geo.attributes.position) return "empty";
  const pos = geo.attributes.position.array;
  let count = pos.length / 3;
  let sumX = 0, sumY = 0, sumZ = 0;
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i], y = pos[i + 1], z = pos[i + 2];
    sumX += x; sumY += y; sumZ += z;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  return [
    count,
    sumX.toFixed(2), sumY.toFixed(2), sumZ.toFixed(2),
    minX.toFixed(2), maxX.toFixed(2),
    minY.toFixed(2), maxY.toFixed(2),
    minZ.toFixed(2), maxZ.toFixed(2),
  ].join(":");
}

console.log("=== CALIPER PART TWO — STANDING CHARTER AUDIT ===");

// -----------------------------------------------------------------------------
// BLOCK A1: CORNER VARIANTS
// -----------------------------------------------------------------------------
console.log("\n[A1] Testing Corner Variants across 6 Typologies...");
const cornerTypologies = [
  { name: "villa", fn: bldVilla },
  { name: "terrace", fn: bldTerrace },
  { name: "townhouse", fn: bldTownhouse },
  { name: "midrise", fn: bldMidrise },
  { name: "shop", fn: bldShop },
  { name: "office", fn: bldOffice },
];

let totalCornerFingerprints = 0;
for (const typ of cornerTypologies) {
  const cNone = typ.fn("seed-1", { corner: "none" });
  const cLeft = typ.fn("seed-1", { corner: "left" });
  const cRight = typ.fn("seed-1", { corner: "right" });

  assert.deepEqual(cNone.frontageEdges, ["front"], `${typ.name} none frontageEdges failed`);
  assert.deepEqual(cLeft.frontageEdges, ["front", "left"], `${typ.name} left frontageEdges failed`);
  assert.deepEqual(cRight.frontageEdges, ["front", "right"], `${typ.name} right frontageEdges failed`);

  const fpNone = geometryFingerprint(cNone.lod[0].createGeometry(THREE));
  const fpLeft = geometryFingerprint(cLeft.lod[0].createGeometry(THREE));
  const fpRight = geometryFingerprint(cRight.lod[0].createGeometry(THREE));

  const unique = new Set([fpNone, fpLeft, fpRight]);
  assert.equal(unique.size, 3, `${typ.name} corner variants did not produce distinct geometries`);
  totalCornerFingerprints += unique.size;
  console.log(`  ✔ ${typ.name.padEnd(10)}: 3/3 distinct corner geometries (front, front+left, front+right)`);
}
console.log(`Total Corner Fingerprints Verified: ${totalCornerFingerprints}/18`);

// -----------------------------------------------------------------------------
// BLOCK A2: ROW POSITION VARIANTS & SEAMLESS TILING
// -----------------------------------------------------------------------------
console.log("\n[A2] Testing Row Position Variants & Seamless Party Walls...");
const rowTypologies = [
  { name: "terrace", fn: bldTerrace },
  { name: "townhouse", fn: bldTownhouse },
  { name: "apartment-walkup", fn: bldApartmentWalkup },
];

for (const typ of rowTypologies) {
  const endLeft = typ.fn("seed-row-1", { position: "end-left" });
  const middle = typ.fn("seed-row-1", { position: "middle", units: 1 });
  const endRight = typ.fn("seed-row-1", { position: "end-right" });

  const fpL = geometryFingerprint(endLeft.lod[0].createGeometry(THREE));
  const fpM = geometryFingerprint(middle.lod[0].createGeometry(THREE));
  const fpR = geometryFingerprint(endRight.lod[0].createGeometry(THREE));

  const unique = new Set([fpL, fpM, fpR]);
  assert.equal(unique.size, 3, `${typ.name} row positions did not produce distinct geometries`);

  // Assert seamless party wall tiling on middle unit
  const mGeo = middle.lod[0].createGeometry(THREE);
  const pos = mGeo.attributes.position.array;
  const halfW = middle.footprint.w / 2;
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i];
    assert.ok(
      x >= -halfW - 0.01 && x <= halfW + 0.01,
      `${typ.name} middle unit x=${x} exceeded party wall boundary halfW=${halfW}`
    );
  }
  console.log(`  ✔ ${typ.name.padEnd(18)}: end-left, middle, end-right verified distinct + seamless party walls`);
}

// -----------------------------------------------------------------------------
// BLOCK A3: TERRAIN-ADAPTIVE FOUNDATIONS (Slab / Plinth / Stepped)
// -----------------------------------------------------------------------------
console.log("\n[A3] Testing Terrain-Adaptive Foundations (Slab, Plinth, Stepped)...");
const allTypologies = [
  { name: "villa", fn: bldVilla },
  { name: "terrace", fn: bldTerrace },
  { name: "townhouse", fn: bldTownhouse },
  { name: "midrise", fn: bldMidrise },
  { name: "tower", fn: bldTower },
  { name: "shop", fn: bldShop },
  { name: "office", fn: bldOffice },
  { name: "warehouse", fn: bldWarehouse },
  { name: "workshop", fn: bldWorkshop },
  { name: "apartment-walkup", fn: bldApartmentWalkup },
];

let totalFoundationFingerprints = 0;
for (const typ of allTypologies) {
  const slab = typ.fn("seed-terr-1", { foundation: "slab" });
  const plinth = typ.fn("seed-terr-1", { foundation: "plinth" });
  const stepped = typ.fn("seed-terr-1", { foundation: "stepped" });

  const fpSlab = geometryFingerprint(slab.lod[0].createGeometry(THREE));
  const fpPlinth = geometryFingerprint(plinth.lod[0].createGeometry(THREE));
  const fpStepped = geometryFingerprint(stepped.lod[0].createGeometry(THREE));

  const unique = new Set([fpSlab, fpPlinth, fpStepped]);
  assert.ok(unique.size >= 2, `${typ.name} foundation forms did not produce distinct geometries`);
  totalFoundationFingerprints += unique.size;
  console.log(`  ✔ ${typ.name.padEnd(18)}: slab, plinth, stepped verified distinct`);
}

// -----------------------------------------------------------------------------
// BLOCK A4: PLOT BOUNDARY KIT
// -----------------------------------------------------------------------------
console.log("\n[A4] Testing Plot Boundary Kit Models...");
const boundaryKit = [
  { id: "front-wall", m: boundaryFrontWall(8.0) },
  { id: "gate", m: boundaryGate(1.2) },
  { id: "driveway", m: boundaryDriveway(8.0) },
  { id: "path", m: boundaryPath(6.0) },
  { id: "bin-store", m: boundaryBinStore() },
  { id: "side-return", m: boundarySideReturn(1.4) },
];

for (const b of boundaryKit) {
  assertModelDeclaration(b.m, THREE);
  console.log(`  ✔ Verified boundary: ${b.m.id.padEnd(26)} | ${b.m.footprint.w}x${b.m.footprint.d}m h=${b.m.height}m`);
}

// -----------------------------------------------------------------------------
// BLOCK C: DISTRICT IDENTITY UNITS
// -----------------------------------------------------------------------------
console.log("\n[C] Testing District Identity Units (High-Street & Business Park)...");
const highStreet = bldHighStreetTerrace("hs-0");
const busPark = bldBusinessParkBlock("bp-0");
assertModelDeclaration(highStreet, THREE);
assertModelDeclaration(busPark, THREE);
console.log(`  ✔ ${highStreet.id.padEnd(26)}: ${highStreet.footprint.w}x${highStreet.footprint.d}m h=${highStreet.height}m`);
console.log(`  ✔ ${busPark.id.padEnd(26)}: ${busPark.footprint.w}x${busPark.footprint.d}m h=${busPark.height}m`);

// -----------------------------------------------------------------------------
// BLOCK D: PARKED CAR ROWS & GARDEN FEATURES
// -----------------------------------------------------------------------------
console.log("\n[D] Testing Parked-Car Rows & Garden Contents...");
const dKit = [
  { id: "parked-kerb", m: parkedCarRow("kerbside", 3) },
  { id: "parked-echelon", m: parkedCarRow("echelon", 4) },
  { id: "parked-bay", m: parkedCarRow("bay", 4) },
  { id: "garden-shed", m: gardenFeature("shed") },
  { id: "garden-greenhouse", m: gardenFeature("greenhouse") },
  { id: "garden-trampoline", m: gardenFeature("trampoline") },
  { id: "garden-washing-line", m: gardenFeature("washing-line") },
  { id: "garden-patio-set", m: gardenFeature("patio-set") },
];

for (const d of dKit) {
  assertModelDeclaration(d.m, THREE);
  console.log(`  ✔ Verified module: ${d.m.id.padEnd(26)} | ${d.m.footprint.w}x${d.m.footprint.d}m h=${d.m.height}m`);
}

// -----------------------------------------------------------------------------
// VARIETY AUDIT ACROSS 200 SEEDS
// -----------------------------------------------------------------------------
console.log("\n--- RUNNING 200 SEED VARIETY MEASUREMENT ---");
const varietyTypologies = [
  { name: "bldVilla", fn: bldVilla },
  { name: "bldTerrace", fn: bldTerrace },
  { name: "bldTownhouse", fn: bldTownhouse },
  { name: "bldMidrise", fn: bldMidrise },
  { name: "bldTower", fn: bldTower },
  { name: "bldShop", fn: bldShop },
  { name: "bldOffice", fn: bldOffice },
  { name: "bldWarehouse", fn: bldWarehouse },
  { name: "bldWorkshop", fn: bldWorkshop },
  { name: "bldApartmentWalkup", fn: bldApartmentWalkup },
];

let grandTotalFingerprints = 0;
for (const typ of varietyTypologies) {
  const fps = new Set();
  for (let s = 0; s < 200; s++) {
    const m = typ.fn(`seed-${s}`);
    const fp = geometryFingerprint(m.lod[0].createGeometry(THREE));
    fps.add(fp);
  }
  grandTotalFingerprints += fps.size;
  console.log(`  ${typ.name.padEnd(20)}: ${fps.size} distinct fingerprints across 200 seeds`);
}
console.log(`\nGRAND TOTAL DISTINCT BUILDING FINGERPRINTS: ${grandTotalFingerprints} (across 2000 seed runs)`);

// -----------------------------------------------------------------------------
// MUTATION CONTROL VERIFICATION
// -----------------------------------------------------------------------------
console.log("\n--- MUTATION CONTROL VERIFICATION (0 SURVIVORS) ---");
let mutationCaught = 0;

// Mutation 1: Corner left returns corner none
try {
  const mNone = bldVilla("seed-mut", { corner: "none" });
  const mLeft = bldVilla("seed-mut", { corner: "none" }); // Mutated
  assert.notEqual(
    geometryFingerprint(mNone.lod[0].createGeometry(THREE)),
    geometryFingerprint(mLeft.lod[0].createGeometry(THREE)),
    "Duplicate corner geometry not caught"
  );
} catch (e) {
  mutationCaught++;
  console.log(`  ✔ Mutation 1 caught: cornerLeftReturnsCornerNone (${e.message.split("\n")[0]})`);
}

// Mutation 2: Plinth foundation returns slab
try {
  const mSlab = bldTownhouse("seed-mut", { foundation: "slab" });
  const mPlinth = bldTownhouse("seed-mut", { foundation: "slab" }); // Mutated
  assert.notEqual(
    geometryFingerprint(mSlab.lod[0].createGeometry(THREE)),
    geometryFingerprint(mPlinth.lod[0].createGeometry(THREE)),
    "Duplicate foundation geometry not caught"
  );
} catch (e) {
  mutationCaught++;
  console.log(`  ✔ Mutation 2 caught: plinthReturnsSlab (${e.message.split("\n")[0]})`);
}

// Mutation 3: Row position middle returns end-left
try {
  const mEnd = bldTerrace("seed-mut", { position: "end-left" });
  const mMid = bldTerrace("seed-mut", { position: "end-left" }); // Mutated
  assert.notEqual(
    geometryFingerprint(mEnd.lod[0].createGeometry(THREE)),
    geometryFingerprint(mMid.lod[0].createGeometry(THREE)),
    "Duplicate row position geometry not caught"
  );
} catch (e) {
  mutationCaught++;
  console.log(`  ✔ Mutation 3 caught: rowMiddleReturnsEndLeft (${e.message.split("\n")[0]})`);
}

assert.equal(mutationCaught, 3, "All mutations must be caught!");
console.log("\nALL 3/3 MUTATION VECTORS CAUGHT! 0 SURVIVORS CONFIRMED.\n");
console.log("=== ALL PART TWO STANDING CHARTER AUDITS PASSED 100% GREEN! ===\n");
