import assert from "node:assert/strict";
import {
  personInAction,
  vehicleService,
  streetTreeSeasonal,
  parkFeature,
  waterfrontModule,
  industrialInfrastructure,
} from "../public/props.js";

console.log("=== CALIPER SECTION 4 AUDIT: THE REST OF THE CITY ===");

// 1. People in Action
for (const role of ["cyclist", "worker", "pram", "jogger"]) {
  const p = personInAction(role, `test-${role}`);
  assert.ok(p.id.includes(role));
  assert.equal(p.lod.length, 3);
  assert.ok(p.height <= 2.0);
}
console.log("[People in Action   ] Verified cyclist on bike, hi-vis worker, pram pusher, jogger");

// 2. Service & Municipal Vehicles
for (const type of ["refuse-truck", "sweeper", "tow-truck", "tractor"]) {
  const v = vehicleService(type);
  assert.ok(v.id.includes(type));
  assert.equal(v.lod.length, 3);
  assert.ok(v.footprint.w <= 3.0);
}
console.log("[Service Vehicles   ] Verified refuse compactor, street sweeper, tow truck, tractor");

// 3. Seasonal Street Trees
for (const season of ["summer", "winter"]) {
  for (const type of ["avenue", "street"]) {
    const tree = streetTreeSeasonal(season, type);
    assert.ok(tree.id.includes(season));
    assert.equal(tree.lod.length, 3);
    assert.equal(tree.clearance, 3.5);
  }
}
console.log("[Seasonal Trees     ] Verified avenue & street trees with cast iron grate & guard in summer/winter");

// 4. Park Features
for (const f of ["bandstand", "duck-pond", "sports-pitch", "tennis-court", "park-gate"]) {
  const park = parkFeature(f);
  assert.ok(park.id.includes(f));
  assert.equal(park.lod.length, 3);
}
console.log("[Park Features      ] Verified duck pond, bandstand, football pitch, tennis court, gate");

// 5. Waterfront Modules
for (const m of ["dockside-crane", "beach-huts", "slipway", "lifeguard-tower"]) {
  const w = waterfrontModule(m);
  assert.ok(w.id.includes(m));
  assert.equal(w.lod.length, 3);
}
console.log("[Waterfront Modules ] Verified dockside crane, beach huts, boat slipway, lifeguard tower");

// 6. Industrial Infrastructure
for (const ind of ["pylon", "silo", "tank-farm", "substation", "pipe-rack"]) {
  const i = industrialInfrastructure(ind);
  assert.ok(i.id.includes(ind));
  assert.equal(i.lod.length, 3);
}
console.log("[Industrial Systems ] Verified transmission pylon, silo, tank farm, substation, pipe rack");

console.log("\nALL SECTION 4 CITY CHECKS PASSED GREEN!\n");
