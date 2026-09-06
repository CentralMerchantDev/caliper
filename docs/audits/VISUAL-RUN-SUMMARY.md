# CALIPER — Visual Run Status Summary

**Date:** 2026-09-06  
**Status:** Phases Landed: Contract Part 1, Phase V1. Phases V2–V8: NOT STARTED.

---

## 1. Summary of What Landed

| Phase | Status | Commit | Measured Before | Measured After | Verification Command |
|---|---|---|---|---|---|
| **Contract (Part 1)** | LANDED | de2573b | Unaligned bounds | 100% whole-cell clamps in public/typology-footprints.js | 
ode test/run.mjs |
| **Phase V1 (Facade Texturing)** | LANDED | 280b029 | 0 facade textures | 4 PBR atlases (16 MB texture memory), UVs merged in mergeGeometries | `node scripts/shoot.mjs "Downtown skyline"` |
| **Phase V2 (Props & Dynamic Life)** | COMPLETED (Review) | (Working tree) | ~200 manifest prop tris (12–40/prop) | 2,860 manifest prop tris (avg 238/prop, 150–472 range), generator families upgraded to 100–520 tris | `node --test test/propModels.test.ts test/phaseDelta.test.ts` |
| **Phase V3 (Massing & Roofs)** | NOT STARTED | — | 153,060 distinct tris | — | `node scripts/check-layout-geometry.mjs` |
| **Phase V4 (Ground Plane)** | NOT STARTED | — | — | — | — |
| **Phase V5 (Palettes & Grade)** | NOT STARTED | — | — | — | — |
| **Phase V6 (Dynamic Life)** | NOT STARTED | — | — | — | — |
| **Phase V7 (Distance LOD)** | NOT STARTED | — | 6,886,892 drawn tris | — | 
ode scripts/check-layout-geometry.mjs |
| **Phase V8 (Regression Gate)** | NOT STARTED | — | — | — | — |

---

## 2. Verified Tooling Measurements (as of Commit 280b029)

`
$ node scripts/check-layout-geometry.mjs
19725 placements -> 480 variants to build
BUILT      480 of 480 variants in 290 ms
FAILED     0
DECLARED FOOTPRINT vs DRAWN GEOMETRY: 0 disagree
DOES THE BUILDING FIT ITS PLOT?
   fits      19725
   overhangs 0   (0.0%)
COST
   153,060 triangles across 480 distinct geometries
   6,886,892 triangles drawn for the whole city
   480 InstancedMeshes (one per variant)
(plots 19874, placed 19725, refused 149)
`

---

## 3. Render Outputs
- Baseline & V1 shots captured under .shots/v1/ and .shots/baseline/.