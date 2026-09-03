# CALIPER — ASSET LANE REPORT 3
**Standing Charter — Section 3: Circulation (The Joints, Junctions, Rail, & Bridge Kit)**
Date: 2026-09-03
Branch: `assets-lane`

---

## 1. What Was Built (The Circulation Suite)

Section 3 of the Standing Charter establishes the complete joint network for the 6 road classes declared in `WORLD-RULES.md §3.1` (`FREEWAY` 62m, `BOULEVARD` 44m, `AVENUE` 28m, `STREET` 18m, `LANE` 10m, `ALLEY` 6m), auxiliary turning and transit roadways, pedestrian crossings, rail switch/grade separations, and the modular chaining bridge kit.

All circulation generators have been authored in `public/roadkit.js`, registered in `public/asset-registry.js` under the `roads` category, integrated into `public/props.js` (under `MODELS`), and rendered in `public/model-library.html`:

| Generator Function | Typology & Description | Footprint ($W \times D$, 8m mod) | Height ($H$) | LOD0 / LOD1 / LOD2 Tris | Sockets | Tested Combinations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `intersection4Way(cNS, cEW)` | 4-Way Cross Intersection with kerb returns, tactile blister pads & zebra crossings | $24\text{m}\times 24\text{m} \dots 80\text{m}\times 80\text{m}$ | $0.45\text{m}$ | 128 / 32 / 12 | 4 sockets | **36 / 36** pairings |
| `intersection3Way(cMain, cBr, deg)` | 3-Way T-Junction with continuous main carriageway and flared kerb radius | $24\text{m}\times 24\text{m} \dots 80\text{m}\times 80\text{m}$ | $0.40\text{m}$ | 96 / 24 / 12 | 3 sockets | **36 / 36** pairings |
| `roundaboutModern(lanes, class, arms)` | Modern Roundabout (1-lane or 2-lane) with landscaped island, truck apron & splitters | $56\text{m}\times 56\text{m} \dots 72\text{m}\times 72\text{m}$ | $1.50\text{m}$ | 260 / 80 / 16 | 3 or 4 sockets | 1 & 2 lanes verified |
| `rampDiverge(freeway, side)` | Freeway Off-Ramp Diverge Taper with painted chevron gore island | $76\text{m}\times 64\text{m}$ ($8\times 8$ cells) | $0.35\text{m}$ | 80 / 24 / 12 | 3 sockets | left & right verified |
| `rampMerge(freeway, side)` | Freeway On-Ramp Merge Taper with acceleration lane | $76\text{m}\times 64\text{m}$ ($8\times 8$ cells) | $0.35\text{m}$ | 80 / 24 / 12 | 3 sockets | left & right verified |
| `slipLane(main, cross)` | Channelized Corner Right-Turn Bypass with triangular raised pedestrian refuge island | $32\text{m}\times 32\text{m}$ ($4\times 4$ cells) | $1.15\text{m}$ | 88 / 24 / 12 | 2 sockets | verified |
| `turningPocket(class, side)` | Median-Recessed Protected Turning Bay | $28\text{m}\times 32\text{m}$ ($3.5\times 4$ cells)| $0.35\text{m}$ | 64 / 24 / 12 | 2 sockets | left & right verified |
| `medianBreak(class)` | Median Crossover for U-turns and emergency vehicle access | $44\text{m}\times 16\text{m}$ | $0.35\text{m}$ | 48 / 24 / 12 | 2 sockets | verified |
| `busBay(class)` | Indented Roadside Transit Pull-In Bay with bus shelter and tactile boarding area | $21\text{m}\times 24\text{m}$ | $2.80\text{m}$ | 112 / 32 / 12 | 2 sockets | verified |
| `layby(class)` | Highway Emergency / Rest Stop Shoulder Widening | $31.5\text{m}\times 32\text{m}$ | $0.35\text{m}$ | 48 / 24 / 12 | 2 sockets | verified |
| `crossing(type, class)` | Pedestrian Crossings (Signalised, Zebra, Raised Speed Table, Central Refuge Island) | $18\text{m}\times 16\text{m}$ | $0.45\text{m} \dots 4.80\text{m}$ | 80–380 / 32 / 12 | 2 sockets | 4 types verified |
| `railSwitch(side)` | Railway Turnout Points Switch with mechanism motor box | $10\text{m}\times 32\text{m}$ | $0.45\text{m}$ | 160 / 40 / 12 | 3 sockets | left & right verified |
| `gradeSeparation(type, class)` | Rail-over-Road / Road-over-Rail Overpass with 5.5m vertical clearance | $36\text{m}\times 32\text{m}$ | $8.50\text{m}$ | 220 / 48 / 16 | 4 sockets | 2 types verified |
| `bridgeAbutment(class, h)` | Reinforced Concrete Bank Abutment with wing walls and bearing pads | $32\text{m}\times 16\text{m}$ | $7.50\text{m}$ | 96 / 32 / 12 | 2 sockets | verified |
| `bridgePier(h, class)` | Reinforced Concrete Pier Column with crosshead cap | $30\text{m}\times 6\text{m}$ | $12.0\text{m}$ | 240 / 32 / 12 | 1 socket | verified |
| `bridgeDeckSpan(len, class)` | Modular Girder Deck Span (16, 32, 48, 64m) with parapets | $28\text{m}\times 32\text{m}$ | $3.30\text{m}$ | 128 / 32 / 12 | 2 sockets | 4 lengths verified |
| `bridgeApproachRamp(h, class)` | 5% Grade Approach Embankment Ramp | $28\text{m}\times 120\text{m}$ | $7.20\text{m}$ | 96 / 32 / 12 | 2 sockets | verified |
| `bridgeChain(len, class, opts)` | Automatic Chaining Engine with Pier Spacing & Refusal Invariants | Arbitrary length | Variable | Composite | Chain | Verified (8m–800m) |

---

## 2. Junction of Unlike Classes Rule

Where unlike classes intersect (e.g. `ALLEY` 6m ROW meets `BOULEVARD` 44m ROW):
1. **Carriageway Continuity**: The primary higher-order roadway maintains its uninterrupted through-lanes and lane hierarchy.
2. **Tangent Kerb Returns**: The intersecting minor road transitions via smooth corner fillets whose radius matches the minor road's design vehicle turning envelope (`ROAD_STANDARDS[minor].kerbRadiusM`).
3. **Pedestrian Ramps & Tactile Slabs**: Yellow $0.8\text{m} \times 0.8\text{m}$ blister paving pads are embedded on all pedestrian-accessible curb corners.
4. **Traffic Priority & Stop Lines**: Minor approach legs receive stop line markings and crossing setback bars prior to entry into the major ROW.

---

## 3. Chaining Bridge Kit & Refusal Invariants

The client requested: *"bridges that you can pick two points of land and they will connect automatically."*
`bridgeChain(spanTotalM, roadClass, elevationM)` implements this contract with automatic structural decomposition:
- **Maximum Unsupported Span**: Maximum single span between supports is **64.0m**. When total span $> 64.0\text{m}$, intermediate piers (`bridgePier`) are automatically calculated and inserted at equal sub-span intervals.
- **Minimum Span Refusal**: Refuses any span $< 8.0\text{m}$ (`Span distance < 8.0m is too short for bridge structure`).
- **Maximum Structural Length Refusal**: Refuses any total span $> 800.0\text{m}$ (`Bridge span > 800m exceeds maximum supported structural length`).
- **Maximum Grade Refusal**: Refuses any approach ramp with vertical slope $> 8.0\%$.

---

## 4. Real Measured Telemetry

- **Asset Registry Summary (`public/asset-registry.js`)**:
  - Total items registered: **141** (141 built/generators, 0 planned gaps, 0 skipped).
  - Generator families: **107** families/variants.
  - Realistic World Triangle Cost: **~5.48M tris** (60 FPS budget safe).
  - Maximum Worst-Case Ceiling: **31.12M tris** (all 141 models at LOD0 simultaneously).
- **Automated Verification Suite**:
  - `node scripts/test-circulation.mjs`: **ALL 8 CIRCULATION BLOCKS PASSED GREEN** (36 4-way, 36 3-way, roundabouts, ramps, slip lanes, crossings, rail switch, grade separations, and bridge chaining).
  - `node test/run.mjs`: **626 / 626 Node tests PASSED** (0 failures).
  - `npx tsc --noEmit`: **Clean** (0 type errors).

---

## 5. Visual Verification (Photographic Record)

Captured into `.shots/library/` via Playwright:
- `.shots/library/roads.png`: Studio-lit 3D cards for all circulation generators, intersections, roundabouts, ramps, crossings, and bridge kit modules.

---

## 6. Next: Section 4 (The Rest of the City)

Proceeding immediately to Section 4 of the Standing Charter:
- People in Action (joggers, cyclists, workers, diners, seated groups).
- Service & Municipal Vehicles (street sweeper, refuse truck, postal van, cherry picker, tow truck).
- Park & Recreation Modules (duck pond, Victorian bandstand, sports pitches with floodlights).
- Waterfront & Harbour Modules (slipways, harbour cranes, beach huts, promenade railings).
- Rooftop Clutter (HVAC chillers, water towers, satellite dishes, antenna arrays).
- Night Emissive Profiles (interior window glows, sodium/LED streetlamp cones, neon shop signs).
- Industrial Infrastructure (silos, fuel tanks, transformer substations, pipe racks).
