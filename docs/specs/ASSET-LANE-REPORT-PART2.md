# CALIPER — ASSET LIBRARY LANE: STANDING CHARTER (PART TWO) REPORT

## 1. Executive Summary & Verification Metrics

Under **Standing Charter Part Two**, the Caliper Asset Library has advanced from individual standalone massing models into a complete, modular, block-assembly architecture and urban amenity ecosystem.

- **Registry Status**: **191 Total Assets** (191 Built / Generators, **0 Planned Gaps**) across 16 categories.
- **Test Suite**: **645 / 645 tests passing green** (`node test/run.mjs`), `npx tsc --noEmit` clean.
- **Charter Audit (`scripts/test-part2-coverage.mjs`)**: **100% Green**, 0 survivors across all mutation vectors.
- **Total Measured Building Geometric Diversity**: **577 distinct geometric fingerprints** across 2,000 seed runs.

---

## 2. Measured Block-Assembly & Quality Systems

### Group A: Block Assembly Foundations
1. **A1 — Corner Variants (18/18 Fingerprints Measured)**:
   - Evaluated across 6 typologies: `villa`, `terrace`, `townhouse`, `midrise`, `shop`, `office`.
   - Generates dual-frontage fenestration, chamfered corner splays, and return window bays.
   - Declares explicit `frontageEdges`: `["front"]` (none), `["front", "left"]` (corner left), `["front", "right"]` (corner right).
2. **A2 — Row Position Variants & Seamless Party Wall Tiling**:
   - Evaluated across 3 row typologies: `terrace`, `townhouse`, `apartment-walkup`.
   - Variants: `end-left` (exposed left flank with decorative return), `middle` (strictly blank flat party walls at $x = \pm w/2$ with 0 overhang), `end-right` (exposed right flank with decorative return).
   - Multi-unit and single-unit middle configurations tile infinitely with **zero geometric collision or seam gap**.
3. **A3 — Terrain-Adaptive Foundations (30/30 Fingerprints Measured)**:
   - Evaluated across all 10 typologies: `slab` (flat grade), `plinth` ($1.2\text{m}$ rusticated masonry sub-wall base with front entry steps), `stepped` (split-level terraced base adapting to hillside contours).
4. **A4 — Plot Boundary Kit**:
   - `boundary-front-wall-8m`: $8\times 0.45\text{m}, h=0.9\text{m}$ (36 tris LOD0).
   - `boundary-gate-1.2m`: $1.2\times 0.4\text{m}, h=1.1\text{m}$ (48 tris LOD0).
   - `boundary-driveway-8m`: $3.6\times 8\text{m}, h=0.15\text{m}$ (36 tris LOD0).
   - `boundary-path-6m`: $1.4\times 6\text{m}, h=0.1\text{m}$ (18 tris LOD0).
   - `boundary-bin-store`: $1.6\times 0.9\text{m}, h=1.25\text{m}$ (48 tris LOD0).
   - `boundary-side-return-1.4m`: $1.4\times 0.35\text{m}, h=1.9\text{m}$ (36 tris LOD0).

---

### Group B: Architectural Character & Articulation
1. **B1 — Four Architectural Characters**: `heritage`, `interwar`, `postwar`, `contemporary` governing string courses, fenestration proportions, and material assignments.
2. **B2 — Roof Typologies & Clutter**: Full mathematical geometric generation for `hipped`, `gabled`, `mansard`, `parapet`, `sawtooth`, `barrel`, and `monopitch` roofs.
3. **B3 — Rear Elevations**: Back outriggers, service courtyards, delivery loading bays, and fire escapes.

---

### Group C: District Identity
1. **C1 — High-Street Chaining Terrace (`bld-highstreet-terrace`)**:
   - $16\times 24\text{m}, h=19.0\text{m}$ (460 tris LOD0).
   - Ground floor glazed commercial shopfronts with upper residential apartments and mansard roof.
2. **C2 — Business Park Commercial Block (`bld-business-park`)**:
   - $32\times 48\text{m}, h=14.5\text{m}$ (420 tris LOD0).
   - 3-storey curtain wall commercial block with brise-soleil sun louvers and landscaped entrance atrium.

---

### Group D: Urban Density & Life
1. **D1 — Parked-Car Instanced Rows**:
   - `parked-cars-kerbside-3`: $18\times 2.4\text{m}, h=1.6\text{m}$ (276 tris LOD0).
   - `parked-cars-echelon-4`: $11.2\times 5.8\text{m}, h=1.6\text{m}$ (356 tris LOD0).
   - `parked-cars-bay-4`: $11.2\times 5.2\text{m}, h=1.6\text{m}$ (356 tris LOD0).
2. **D2 — Garden & Yard Contents**:
   - `garden-shed`: $2.4\times 3\text{m}, h=2.2\text{m}$ (68 tris).
   - `garden-greenhouse`: $2.2\times 2.8\text{m}, h=2.3\text{m}$ (72 tris).
   - `garden-trampoline`: $3.2\times 3.2\text{m}, h=2.4\text{m}$ (64 tris).
   - `garden-washing-line`: $2.4\times 2.4\text{m}, h=1.9\text{m}$ (48 tris).
   - `garden-patio-set`: $2.2\times 2.2\text{m}, h=0.9\text{m}$ (84 tris).

---

## 3. Seed Variety Fingerprint Measurements

Measured via `scripts/test-part2-coverage.mjs` across 200 random seeds per typology:

| Typology | Cell Bounds | Storeys | Distinct Fingerprints / 200 Seeds |
| :--- | :--- | :--- | :--- |
| `bldVilla` | $2\times 3$ to $3\times 4$ ($16\times 24\text{m} - 24\times 32\text{m}$) | 2–3 | **69** |
| `bldTerrace` | 2–5 units ($16\times 24\text{m} - 40\times 24\text{m}$) | 2–3 | **48** |
| `bldTownhouse` | $2\times 3$ ($16\times 24\text{m}$) | 3–4 | **55** |
| `bldMidrise` | $3\times 4$ to $6\times 8$ ($24\times 32\text{m} - 48\times 64\text{m}$) | 4–8 | **63** |
| `bldTower` | $4\times 4$ to $8\times 8$ ($32\times 32\text{m} - 64\times 64\text{m}$) | 12–40 | **130** |
| `bldShop` | $2\times 2$ to $4\times 3$ ($16\times 16\text{m} - 32\times 24\text{m}$) | 1–3 | **31** |
| `bldOffice` | $4\times 6$ to $8\times 10$ ($32\times 48\text{m} - 64\times 80\text{m}$) | 3–10 | **63** |
| `bldWarehouse` | $6\times 10$ to $10\times 20$ ($48\times 80\text{m} - 80\times 160\text{m}$) | 1–2 | **43** |
| `bldWorkshop` | $3\times 4$ to $5\times 7$ ($24\times 32\text{m} - 40\times 56\text{m}$) | 1–2 | **12** |
| `bldApartmentWalkup` | $3\times 4$ to $5\times 7$ ($24\times 32\text{m} - 40\times 56\text{m}$) | 3–4 | **63** |
| **Total** | | | **577 Unique Geometries** |

---

## 4. Mutation Control Verifications (0 Survivors)

1. **Mutation Vector 1 (`cornerLeftReturnsCornerNone`)**: Mutated `corner: "left"` to produce base `corner: "none"` geometry.
   - *Result*: **CAUGHT**. AssertionError: `Duplicate corner geometry not caught`.
2. **Mutation Vector 2 (`plinthReturnsSlab`)**: Mutated `foundation: "plinth"` to return standard `foundation: "slab"`.
   - *Result*: **CAUGHT**. AssertionError: `Duplicate foundation geometry not caught`.
3. **Mutation Vector 3 (`rowMiddleReturnsEndLeft`)**: Mutated `position: "middle"` to return `position: "end-left"`.
   - *Result*: **CAUGHT**. AssertionError: `Duplicate row position geometry not caught`.

---

## 5. Visual Proofs & Contact Sheets

All camera passes rendered and captured to `.shots/`:
- `.shots/library/all.png`, `showstoppers.png`, `boundary.png`, `buildings.png`, `vehicles.png`, `furniture.png`
- `.shots/kit/all.png`, `buildings.png`, `furniture.png`, `roads.png`
