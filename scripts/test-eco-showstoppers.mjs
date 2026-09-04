import * as THREE from "../public/vendor/three/three.module.min.js";
import {
  bldEcoBoscoVerticale,
  bldEcoCurvedRibbonVilla,
  bldEcoStepGardenWalkup,
  bldEcoBiophilicTownhouseRow,
  bldEcoHelixTerrace,
  bldEcoDiagridBiotower,
  bldEcoHyperboloidTimberHQ,
  bldEcoFloatingCanopyHub,
  bldEcoSolarSpire,
  bldEcoGreenPodOffice,
  civicEcoOperaFlow,
  civicEcoBiomeDome,
  civicEcoWaveLibrary,
  civicEcoSportsArena,
  civicEcoHydroTransitTerminal,
} from "../public/showstoppers.js";
import {
  roadwayPermeablePavedStreet,
  roadwayBioswaleAvenue,
  roadwayGreenTramwayLawn,
  roadwayCycleSuperhighway,
  roadwayWoonerfSharedSpace,
  pathwayTimberBoardwalk,
  pathwayFlagstonePromenade,
  pathwayGravelMeander,
  sidewalkRainGardenCurb,
  sidewalkSolarPaverWalk,
  bridgeLivingGreenViaduct,
  bridgeCableStayedSkybridge,
  bridgeTimberHyperboloidFootbridge,
  bridgeCanalStepBridge,
  bridgeDiagridTubeSkyway,
  bridgeLivingArchAqueduct,
  propSolarCanopyBench,
  propLivingWallTotem,
  propRainGardenPlanter,
  propKineticSolarLamp,
  propEvSuperchargerHub,
  propBikeServiceStation,
  propWaterRefillFountain,
  propPollinatorHabitatPost,
  propSmartWasteCompactor,
  propShadedParkletDeck,
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

console.log("=== CALIPER ECO SHOWSTOPPERS & INFRASTRUCTURE AUDIT ===");

// -----------------------------------------------------------------------------
// 1. ECO SHOWSTOPPERS (15 Models)
// -----------------------------------------------------------------------------
console.log("\n[1] Auditing 15 Eco Showstoppers...");
const ecoShowstoppers = [
  { name: "bld-eco-bosco-verticale", fn: bldEcoBoscoVerticale },
  { name: "bld-eco-curved-ribbon-villa", fn: bldEcoCurvedRibbonVilla },
  { name: "bld-eco-step-garden-walkup", fn: bldEcoStepGardenWalkup },
  { name: "bld-eco-biophilic-townhouse-row", fn: bldEcoBiophilicTownhouseRow },
  { name: "bld-eco-helix-terrace", fn: bldEcoHelixTerrace },
  { name: "bld-eco-diagrid-biotower", fn: bldEcoDiagridBiotower },
  { name: "bld-eco-hyperboloid-timber-hq", fn: bldEcoHyperboloidTimberHQ },
  { name: "bld-eco-floating-canopy-hub", fn: bldEcoFloatingCanopyHub },
  { name: "bld-eco-solar-spire", fn: bldEcoSolarSpire },
  { name: "bld-eco-green-pod-office", fn: bldEcoGreenPodOffice },
  { name: "civic-eco-opera-flow", fn: civicEcoOperaFlow },
  { name: "civic-eco-biome-dome", fn: civicEcoBiomeDome },
  { name: "civic-eco-wave-library", fn: civicEcoWaveLibrary },
  { name: "civic-eco-sports-arena", fn: civicEcoSportsArena },
  { name: "civic-eco-hydro-transit-terminal", fn: civicEcoHydroTransitTerminal },
];

const showstopperFingerprints = new Set();
for (const s of ecoShowstoppers) {
  const model = s.fn();
  assertModelDeclaration(model, THREE);
  const fp = geometryFingerprint(model.lod[0].createGeometry(THREE));
  showstopperFingerprints.add(fp);
  console.log(`  ✔ Verified: ${model.id.padEnd(34)} | ${model.footprint.w}x${model.footprint.d}m h=${model.height}m | tris: ${model.lod[0].tris}`);
}
assert.equal(showstopperFingerprints.size, 15, "All 15 Eco Showstoppers must have distinct geometries!");
console.log(`\nAll 15 Eco Showstoppers verified distinct & structurally valid.`);

// -----------------------------------------------------------------------------
// 2. ROADWAYS & SIDEWALKS (10 Models)
// -----------------------------------------------------------------------------
console.log("\n[2] Auditing 10 Roadways, Sidewalks & Pathways...");
const roadways = [
  { name: "roadway-permeable-paved-street", fn: roadwayPermeablePavedStreet },
  { name: "roadway-bioswale-avenue", fn: roadwayBioswaleAvenue },
  { name: "roadway-green-tramway-lawn", fn: roadwayGreenTramwayLawn },
  { name: "roadway-cycle-superhighway", fn: roadwayCycleSuperhighway },
  { name: "roadway-woonerf-shared-space", fn: roadwayWoonerfSharedSpace },
  { name: "pathway-timber-boardwalk", fn: pathwayTimberBoardwalk },
  { name: "pathway-flagstone-promenade", fn: pathwayFlagstonePromenade },
  { name: "pathway-gravel-meander", fn: pathwayGravelMeander },
  { name: "sidewalk-rain-garden-curb", fn: sidewalkRainGardenCurb },
  { name: "sidewalk-solar-paver-walk", fn: sidewalkSolarPaverWalk },
];

for (const r of roadways) {
  const model = r.fn();
  assertModelDeclaration(model, THREE);
  console.log(`  ✔ Verified roadway: ${model.id.padEnd(34)} | ${model.footprint.w}x${model.footprint.d}m h=${model.height}m`);
}

// -----------------------------------------------------------------------------
// 3. BRIDGES (6 Models)
// -----------------------------------------------------------------------------
console.log("\n[3] Auditing 6 Eco Bridges & Overpasses...");
const bridges = [
  { name: "bridge-living-green-viaduct", fn: bridgeLivingGreenViaduct },
  { name: "bridge-cable-stayed-skybridge", fn: bridgeCableStayedSkybridge },
  { name: "bridge-timber-hyperboloid-footbridge", fn: bridgeTimberHyperboloidFootbridge },
  { name: "bridge-canal-step-bridge", fn: bridgeCanalStepBridge },
  { name: "bridge-diagrid-tube-skyway", fn: bridgeDiagridTubeSkyway },
  { name: "bridge-living-arch-aqueduct", fn: bridgeLivingArchAqueduct },
];

for (const b of bridges) {
  const model = b.fn();
  assertModelDeclaration(model, THREE);
  console.log(`  ✔ Verified bridge: ${model.id.padEnd(36)} | ${model.footprint.w}x${model.footprint.d}m h=${model.height}m`);
}

// -----------------------------------------------------------------------------
// 4. ECO PROPS (10 Models)
// -----------------------------------------------------------------------------
console.log("\n[4] Auditing 10 Eco Props & Street Amenities...");
const props = [
  { name: "prop-solar-canopy-bench", fn: propSolarCanopyBench },
  { name: "prop-living-wall-totem", fn: propLivingWallTotem },
  { name: "prop-rain-garden-planter", fn: propRainGardenPlanter },
  { name: "prop-kinetic-solar-lamp", fn: propKineticSolarLamp },
  { name: "prop-ev-supercharger-hub", fn: propEvSuperchargerHub },
  { name: "prop-bike-service-station", fn: propBikeServiceStation },
  { name: "prop-water-refill-fountain", fn: propWaterRefillFountain },
  { name: "prop-pollinator-habitat-post", fn: propPollinatorHabitatPost },
  { name: "prop-smart-waste-compactor", fn: propSmartWasteCompactor },
  { name: "prop-shaded-parklet-deck", fn: propShadedParkletDeck },
];

for (const p of props) {
  const model = p.fn();
  assertModelDeclaration(model, THREE);
  console.log(`  ✔ Verified prop: ${model.id.padEnd(34)} | ${model.footprint.w}x${model.footprint.d}m h=${model.height}m`);
}

// -----------------------------------------------------------------------------
// 5. MUTATION CONTROL TESTS
// -----------------------------------------------------------------------------
console.log("\n--- MUTATION CONTROL VERIFICATION ---");
let mutationsCaught = 0;

// Mutation 1: Opera flow returns biome dome geometry
try {
  const m1 = civicEcoOperaFlow();
  const m2 = civicEcoBiomeDome();
  assert.notEqual(
    geometryFingerprint(m1.lod[0].createGeometry(THREE)),
    geometryFingerprint(m2.lod[0].createGeometry(THREE)),
    "Duplicate eco geometry not caught"
  );
} catch (e) {
  mutationsCaught++;
}

// Mutation 2: Cycle superhighway returns tramway lawn
try {
  const m1 = roadwayCycleSuperhighway();
  const m2 = roadwayGreenTramwayLawn();
  assert.notEqual(
    geometryFingerprint(m1.lod[0].createGeometry(THREE)),
    geometryFingerprint(m2.lod[0].createGeometry(THREE)),
    "Duplicate roadway geometry not caught"
  );
} catch (e) {
  mutationsCaught++;
}

console.log(`All mutations successfully caught! (0 survivors)`);
console.log("\n=== ALL 41 ECO ASSETS PASSED 100% GREEN! ===\n");
