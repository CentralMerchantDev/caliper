# CALIPER — ASSET LANE REPORT 2
**Standing Charter — Section 2: Buildings (The 99% City)**
Date: 2026-09-03
Branch: `assets-lane`

---

## 1. What Was Built (The Ten Typologies)

Prior to Section 2, `public/asset-registry.js` contained 111 assets across 13 categories, 12 civic landmarks, and **zero ordinary buildings**.
According to `CITY-PLANNING-SPEC.md §8` and `WORLD-RULES.md §3.2`, ordinary buildings (Villa, Terrace, Townhouse, Midrise, Tower) constitute **99% of all structures** in the 26 km world.

All ten parameterized generators have now been authored in `public/buildings.js`, registered in `public/asset-registry.js`, integrated into `public/props.js` (under `MODELS`), and rendered in `public/model-library.html`:

| ID | Typology | Footprint ($W \times D$, 8m mod) | Levels ($H$, 4m mod) | LOD0 / LOD1 / LOD2 Tris | Distinct Fingerprints (200 seeds) | Real World Count |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bld-villa` | Detached Suburban Villa | $16\text{m}\times 16\text{m} \dots 32\text{m}\times 32\text{m}$ (9 variants) | 1–2 storeys ($4.8\text{m}\dots 13.4\text{m}$) | 360 / 48 / 12 | **80 / 200** | 9,500 |
| `bld-terrace` | Urban Repeating Terrace Row | $16\text{m}\times 24\text{m} \dots 48\text{m}\times 24\text{m}$ (5 variants) | 2–3 storeys ($10.2\text{m}\dots 16.8\text{m}$) | 480 / 64 / 12 | **35 / 200** | 4,600 |
| `bld-townhouse` | Victorian / Georgian Townhouse | $16\text{m}\times 24\text{m}$ ($2\times 3$ cells) | 3–4 storeys ($12.6\text{m}\dots 18.4\text{m}$) | 420 / 54 / 12 | **15 / 200** | 2,700 |
| `bld-midrise` | Commercial / Residential Midrise | $24\text{m}\times 32\text{m} \dots 48\text{m}\times 64\text{m}$ (20 variants) | 4–8 storeys ($19.2\text{m}\dots 35.2\text{m}$) | 520 / 64 / 12 | **64 / 200** | 1,600 |
| `bld-tower` | Downtown Skyscraper | $32\text{m}\times 32\text{m} \dots 64\text{m}\times 64\text{m}$ (20 variants) | 12–40 storeys ($52.0\text{m}\dots 170.0\text{m}$) | 580 / 80 / 12 | **121 / 200** | 80 |
| `bld-shop` | High Street Shop / Retail | $16\text{m}\times 16\text{m} \dots 32\text{m}\times 24\text{m}$ (6 variants) | 1–3 storeys ($5.0\text{m}\dots 13.0\text{m}$) | 360 / 48 / 12 | **28 / 200** | 800 |
| `bld-office` | Corporate Office Building | $32\text{m}\times 48\text{m} \dots 64\text{m}\times 80\text{m}$ (20 variants) | 3–10 storeys ($14.5\text{m}\dots 43.0\text{m}$) | 460 / 60 / 12 | **56 / 200** | 400 |
| `bld-warehouse` | Industrial Logistics Warehouse | $48\text{m}\times 80\text{m} \dots 96\text{m}\times 160\text{m}$ (45 variants) | 1 storey ($8.0\text{m}\dots 15.5\text{m}$) | 380 / 60 / 12 | **94 / 200** | 250 |
| `bld-workshop` | Light Industrial Workshop | $24\text{m}\times 32\text{m} \dots 40\text{m}\times 48\text{m}$ (9 variants) | 1–2 storeys ($7.8\text{m}\dots 11.8\text{m}$) | 340 / 50 / 12 | **16 / 200** | 350 |
| `bld-apartment-walkup` | Multi-Family Walk-Up Block | $24\text{m}\times 32\text{m} \dots 32\text{m}\times 48\text{m}$ (6 variants) | 3–4 storeys ($13.2\text{m}\dots 19.5\text{m}$) | 480 / 60 / 12 | **53 / 200** | 600 |

Total distinct geometric shapes measured across 2,000 randomized seed samples: **562 unique fingerprints** (28.1% unique geometry rate across 200 seeds without color variations).

---

## 2. World Rules & Module Compliance

- **8m Cell Module**: All footprints ($w, d$) are exact integer multiples of 8m ($16\text{m}, 24\text{m}, 32\text{m}, 40\text{m}, 48\text{m}, 64\text{m}, 80\text{m}, 96\text{m}, 160\text{m}$).
- **4m Level Module**: Storey bodies are integer multiples of 4m plus articulated roof features (dormers, chimneys, mansards, pediments, lift overruns, HVAC plant screens).
- **LOD Hierarchy**:
  - **LOD0**: Full architectural massing (cornices, string courses, bay windows, stoops, loading docks, roof structures, porches, roller doors).
  - **LOD1**: Simplified primary blocks + roof prism (48–80 tris).
  - **LOD2**: Outer bounding massing prism (12 tris).
- **Palette Binding**: Integrated with curated palettes (`WALLS.VILLA`, `WALLS.TERRACE`, `WALLS.TOWNHOUSE`, `WALLS.MIDRISE`, `WALLS.TOWER`, `WALLS.WAREHOUSE`, etc.) matching `WORLD-RULES.md §4`.

---

## 3. Real Measured Telemetry

- **Asset Registry Summary (`public/asset-registry.js`)**:
  - Total items registered: **121** (121 built/generators, 0 planned gaps, 0 skipped).
  - Generator families: **87** families/variants.
  - Realistic World Triangle Cost: **~5.06M tris** (comfortably within realistic 60 FPS budgets).
  - Maximum Worst-Case Ceiling: **28.40M tris** (if all 121 models existed simultaneously at LOD0).
- **Automated Verification Suite**:
  - `node scripts/test-buildings-variety.mjs`: **10 / 10 typologies PASSED** with high distinct seed counts.
  - `node scripts/variant-coverage.mjs`: **116 / 116 prop variants PASSED** with 0 collisions.
  - `node scripts/test-variant-mutations.mjs`: **4 / 4 mutation controls CAUGHT** as expected.
  - `node test/run.mjs`: **626 / 626 Node tests PASSED** (0 failures).
  - `npx tsc --noEmit`: **Clean** (0 type errors).

---

## 4. Visual Verification (Photographic Record)

All plates generated via Playwright (`node scripts/shoot-library.mjs`) into `.shots/library/`:
- `.shots/library/buildings.png`: Studio-lit 3D cards for all 10 building typologies showing individual auto-framing, LOD budgets, and live inspector bindings.
- `.shots/library/modal-inspect.png`: Live interactive 3D modal with wireframe toggle and clay mode.

---

## 5. Next: Section 3 (Circulation)

Proceeding immediately to Section 3 of the Standing Charter:
- Multi-way intersections at every pairing of the 6 road classes.
- 1-lane and 2-lane roundabouts with splitter islands.
- On/off freeway ramps, gore areas, tapers.
- Slip lanes, bus bays, refuge islands.
- Rail level crossings, switch points, station platforms.
- Chaining bridge kit (abutments, piers, modular deck spans, socket refusal rules).
