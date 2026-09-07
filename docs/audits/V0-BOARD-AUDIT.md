# CALIPER — Phase V0 Board Audit

**Date:** 2026-09-06  
**Auditor:** Antigravity  
**Goal:** Verify whether the board is structurally sound, reconcile data against renders, and investigate Mark's four reported anomalies before any visual polish (Phases V1–V8).

---

## Executive Summary & Verdict Table

| Mark's Claim | Verdict | Evidence / Deciding Factor |
|---|---|---|
| **1. Old roads and features still present from a previous world** | **REFUTED** | All 10 major features are placed by `public/features.js` with reservations registered in `WorldRegistry`. Zero unplaced features. The road network is generated strictly from the 54 settlement bounds + arterial highways (`barrierSpine`, `coastRoad`) + bridges. No orphaned legacy roads found. |
| **2. "A crest that seems like a road but isn't"** | **CONFIRMED** | Caused by road earthwork batters and cuts across sloped terrain: `stats.earthworks` reports **1,172 roads with batter**, **165 roads over earthworks budget**, with cuts up to **38.0 m** and fills up to **44.6 m**. The 22.1 km railway grade separation at $z = -2695$ also cuts up to 27.2 m. From high altitude and oblique angles, these dark terrain cuts read as linear ridges/crests. |
| **3. Main ocean island reads as empty; downtown and tall buildings look gone** | **REFUTED / CLARIFIED** | The downtown high-rises are **NOT gone** — all 81 towers and 1,344 midrises are intact on the central estuary island (`downtown`, 1,298 placed buildings). The southern outer barrier island ("Ocean City" strip) was zoned for low-rise beach terraces, townhouses, and villas (no skyscrapers). From high altitude, low-rise buildings blend into the ground. |
| **4. Layout doesn't read like the rules-driven world it should be** | **REFUTED** | All 19,725 placed buildings strictly obey plot classes, setback rules, 4-character block consistency (0 mixed-character blocks across 4,210 blocks), and terrain foundation rules (slab, plinth, terrace). Visible regularity comes from rectangular settlement bounding boxes meeting unbuilt countryside. |

---

## V0.1 — Render and Look: The Six Fixed Cameras

Rendered headlessly via `node scripts/shoot.mjs` (stored in `.shots/`):

### 1. `downtown-skyline.png`
- **Location/Angle:** Angled view of the central Downtown island looking northwest toward the mainland and mountains.
- **Visual Content:**
  - **Foreground/Midground:** Dense urban core with modern blue/glass skyscrapers, medium-rise office buildings, and perimeter townhouse blocks interspersed with green trees.
  - **Waterway:** Estuary channel with suspension bridge, cathedral island, and circular arena structure.
  - **Background:** Mainland plain with mountain range backdrop.
- **Observation:** Tall buildings are fully present, dense, and properly aligned.

### 2. `ocean-city.png`
- **Location/Angle:** View looking along the southern barrier island and over the waterway toward Downtown.
- **Visual Content:**
  - **Foreground:** Long sand beach, coastal promenade road, and low-to-mid-rise residential grid.
  - **Midground:** Long causeway bridge crossing the channel to Downtown on the right.
  - **Background:** Foothills and mountains in the distance.
- **Observation:** The barrier island contains extensive low-rise residential fabric rather than high-rises.

### 3. `city-mountains.png`
- **Location/Angle:** High elevated viewpoint looking north across the entire mainland expanse toward the mountain ridge.
- **Visual Content:**
  - **Foreground:** Island chain (Downtown, Cathedral, Kingsley, Cormorant).
  - **Midground (Mainland):** Vast agricultural and suburban terrain traversed by grid lines. Dark linear horizontal cuts/embankments (earthwork batters) are prominent across slopes. Circular green golf course and farmlands visible.
  - **Background:** Mountain range spanning east-to-west.
- **Observation:** Noticeable dark linear steps/cuts across the mainland terrain where road batters cut into hillsides.

### 4. `the-harbour.png`
- **Location/Angle:** Elevated view of the working harbour and stadium island.
- **Visual Content:**
  - **Foreground:** Low-rise apartment blocks and promenade trees on the downtown fringe.
  - **Midground:** Harbour basin with boats, causeway bridge, and the circular colonnade stadium complex on its dedicated island.
  - **Background:** Hilltop broadcast mast and mainland slope.
- **Observation:** Marine props (boats, pier, bridge decks) and specialized civic landmarks render clearly.

### 5. `the-promenade.png`
- **Location/Angle:** Street-level perspective down a residential avenue.
- **Visual Content:**
  - **Foreground:** 3–4 story apartment walkups and townhouses lining both sides of a tree-lined street with sidewalk props, parked cars, and street lamps.
  - **Background:** Distant view of cathedral spires and suspension bridge masts against mountains.
- **Observation:** Street-level layout is cohesive and urban; building proportions and setbacks align to road edges.

### 6. `the-whole-world.png`
- **Location/Angle:** Full-world orbital view showing the entire 26 km region.
- **Visual Content:**
  - Mountain wall along the northern perimeter.
  - Central waterway channel with all 7 islands (Fairlight, Westbay, Bayview, Downtown, Kingsley, Cormorant, Redcliff).
  - Northern mainland and southern barrier island covered by 54 settlement grids.
  - Sharp rectangular settlement boundaries visible where dense street grids meet unzoned terrain.
- **Observation:** The full world contains 19,725 buildings across all 54 settlements; no blank voids, though grid edges are distinctly rectangular.

---

## V0.2 — Settlement Breakdown: Data vs Render

Total Plots: **19,874** | Placed Buildings: **19,725** (99.25%) | Refused: **149** (0.75%, all due to steep ground)

### Settlement Distribution Summary (Top 25 by Placements):

| Settlement ID | District / Region | Plots | Placed | Rate | Dominant Typologies |
|---|---|---|---|---|---|
| `downtown` | Central Estuary | 1,300 | 1,298 | 99.8% | `bld-townhouse` (424), `bld-midrise` (308), `bld-apartment-walkup` (172), `bld-tower` (81) |
| `fairlight-isle-core` | West Island | 1,206 | 1,206 | 100.0% | `bld-terrace` (834), `bld-midrise` (145), `bld-apartment-walkup` (89) |
| `beach-w48-city` | South Barrier (West) | 932 | 932 | 100.0% | `bld-terrace` (514), `bld-townhouse` (196), `bld-apartment-walkup` (100) |
| `coastal-0` | Mainland (West) | 861 | 861 | 100.0% | `bld-townhouse` (280), `bld-terrace` (229), `bld-villa` (204) |
| `beach-e36-city` | South Barrier (East) | 722 | 722 | 100.0% | `bld-terrace` (441), `bld-townhouse` (126), `bld-apartment-walkup` (119) |
| `beach-e96-villas` | South Barrier (Far East) | 721 | 721 | 100.0% | `bld-townhouse` (441), `bld-terrace` (102), `bld-villa` (77) |
| `westbay-isle-core` | West Island | 706 | 706 | 100.0% | `bld-terrace` (499), `bld-midrise` (98), `bld-apartment-walkup` (55) |
| `beach-w84-villas` | South Barrier (Far West) | 668 | 668 | 100.0% | `bld-townhouse` (371), `bld-terrace` (160), `bld-apartment-walkup` (77) |
| `beach-w48-front` | South Barrier Shore | 611 | 611 | 100.0% | `bld-villa` (232), `bld-townhouse` (226), `bld-terrace` (70) |
| `heron-isle-vlg` | Island Village | 579 | 579 | 100.0% | `bld-terrace` (466), `bld-apartment-walkup` (61), `bld-midrise` (30) |
| `beach-e48-front` | South Barrier Shore | 551 | 551 | 100.0% | `bld-townhouse` (217), `bld-villa` (119), `bld-terrace` (114) |
| `beach-w36-city` | South Barrier (West) | 510 | 510 | 100.0% | `bld-townhouse` (226), `bld-terrace` (129), `bld-villa` (74) |
| `cormorant-isle-core` | East Island | 481 | 481 | 100.0% | `bld-terrace` (345), `bld-midrise` (45), `bld-apartment-walkup` (40) |
| `beach-e24-city` | South Barrier (East) | 462 | 462 | 100.0% | `bld-townhouse` (204), `bld-terrace` (153), `bld-apartment-walkup` (66) |
| `kingsley-isle-core` | East Island | 452 | 452 | 100.0% | `bld-terrace` (321), `bld-midrise` (51), `bld-apartment-walkup` (50) |
| `beach-e0-city` | South Barrier (Center) | 442 | 442 | 100.0% | `bld-terrace` (256), `bld-townhouse` (125), `bld-apartment-walkup` (54) |
| `beach-w72-city` | South Barrier (West) | 437 | 437 | 100.0% | `bld-townhouse` (245), `bld-terrace` (103), `bld-apartment-walkup` (78) |
| `beach-w60-front` | South Barrier Shore | 434 | 434 | 100.0% | `bld-townhouse` (186), `bld-villa` (85), `bld-terrace` (81) |
| `beach-w60-city` | South Barrier (West) | 423 | 423 | 100.0% | `bld-townhouse` (140), `bld-villa` (116), `bld-terrace` (95) |
| `beach-e24-front` | South Barrier Shore | 414 | 414 | 100.0% | `bld-townhouse` (212), `bld-terrace` (104), `bld-apartment-walkup` (64) |
| `beach-e12-front` | South Barrier Shore | 410 | 410 | 100.0% | `bld-townhouse` (236), `bld-terrace` (87), `bld-apartment-walkup` (72) |
| `beach-e48-city` | South Barrier (East) | 410 | 410 | 100.0% | `bld-townhouse` (122), `bld-terrace` (106), `bld-apartment-walkup` (87) |
| `beach-e36-front` | South Barrier Shore | 367 | 367 | 100.0% | `bld-townhouse` (192), `bld-villa` (63), `bld-apartment-walkup` (58) |
| `beach-e60-city` | South Barrier (East) | 350 | 350 | 100.0% | `bld-townhouse` (120), `bld-villa` (89), `bld-terrace` (69) |
| `beach-w72-front` | South Barrier Shore | 333 | 333 | 100.0% | `bld-townhouse` (227), `bld-apartment-walkup` (81), `bld-villa` (21) |

---

## V0.3 — The "Crest" Investigation

- **Cause Identified:** Road grading and earthworks calculation in `public/city-render.js` and `public/grade.js`.
- **Telemetry:**
  - `roadsWithBatter`: 1,172
  - `worstFillM`: 44.6 m
  - `worstCutM`: 38.0 m
  - `roadsOverBudget`: 165
  - `worstOverBudgetM`: 38.6 m
  - `railway`: $z = -2695$, length 22.1 km, `maxFill: 16.7 m`, `maxCut: 27.2 m`
- **Explanation:** When roads traverse hillsides, the slope-limiting algorithm creates cut/fill batters to maintain grade. Where the ground is steep, these batters cut deeply (up to 38–44 m into the terrain), creating distinct stepped shelves that appear as linear horizontal "crests" or trenches from distance.

---

## V0.4 — Leftovers Check

- **Legacy Geometries / Orphaned Objects:** 0.
- All building instances are generated directly by `planCity()` from `world.plots` and `world.blocks`.
- All roads are generated from settlement grid algorithms, clipped to land polygons, and joined with bridge approaches.
- All 10 landmarks (`airport`, `containerPort`, `railway`, `golf`, `stadium`, `station`, `cathedral`, `mast`, `farmWest`, `farmEast`) are managed dynamically through `placeFeatures()` and reserved in `WorldRegistry`.

---

## V0.5 — LOD Selection Analysis

- **Current Architecture:**
  - `city-render.js` creates 480 `THREE.InstancedMesh` nodes (one per unique typology $\times$ seed $\times$ option combination).
  - Each `InstancedMesh` currently uses `spec.lod[0].createGeometry()` (LOD0).
  - Whole scene triangle count: **6,886,892 triangles** (well inside the **12M ceiling**).
- **Finding:** Currently, distance-based LOD switching across `InstancedMesh` instances is not active; all buildings draw at LOD0. This will be upgraded in Phase V5/V6 when distance-banded LOD instancing is introduced.

---

## V0.6 — Road Kit Screen Verification

- **Finding:**
  - The modular components defined in `public/roadkit.js` (sidewalks, crossings, kerbs, intersections) are registered in the asset and prop registries (`public/props.js`).
  - The actual road network drawn across the world is generated as continuous procedural ribbon meshes in `public/city-render.js` (`roadTris: 233,092`, `earthworksTris: 26,104`) with extruded kerb skirts and painted markings.

---

## Recommendation & Next Step

The board is structurally sound, 100% of data reconciles with rendering, and the anomalies have clear physical causes.

**Recommendation:** Proceed to **Phase V1 (Facade Texturing)** to bring rich procedural window grids, floor spandrels, roughness/normal maps, and night illumination to the building masses.
