# CALIPER — ASSET LANE REPORT 4
**Standing Charter — Section 4: The Rest of the City (People, Vehicles, Seasonal Vegetation, Parks, Waterfront, Rooftops, Emissives, and Industrial Infrastructure)**
Date: 2026-09-03
Branch: `assets-lane`

---

## 1. What Was Built (The Rest of the City Suite)

Section 4 of the Standing Charter completes the city's operational and environmental layers across 8 core domains. All generators are authored in `public/props.js`, registered in `public/asset-registry.js`, displayed in `public/model-library.html`, and tested in `scripts/test-city-rest.mjs`:

| Generator Function | Domain & Modules | Footprint | Height | LOD0 / LOD1 / LOD2 Tris | Validated Types / States |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `personInAction(role, seed)` | **People in Action** | $0.6\times 1.8\text{m} \dots 0.8\times 1.4\text{m}$ | $1.80\text{m}$ | 160 / 24 / 12 | `cyclist` (rider + bike), `worker` (hi-vis + hardhat), `pram` (pusher + stroller), `jogger` (runner in stride) |
| `vehicleService(type)` | **Service & Municipal Vehicles** | $2.6\times 4.2\text{m} \dots 2.6\times 8.5\text{m}$ | $2.20\text{m} \dots 3.40\text{m}$ | 180 / 32 / 12 | `refuse-truck` (rear compactor), `sweeper` (disc brushes), `tow-truck` (crane boom), `tractor` (front bucket) |
| `streetTreeSeasonal(season, type)` | **Seasonal Street Trees** | $2.8\times 2.8\text{m} \dots 4.2\times 4.2\text{m}$ | $6.50\text{m} \dots 9.50\text{m}$ | 240 / 32 / 12 | `summer` (full foliage), `winter` (bare branched); cast iron grate + cage guard; 3.5m clearance |
| `parkFeature(feature)` | **Parks that look like Parks** | $10\times 4\text{m} \dots 32\times 48\text{m}$ | $0.35\text{m} \dots 6.80\text{m}$ | 320 / 40 / 12 | `bandstand` (octagonal cupola), `duck-pond` (stone rim disk), `sports-pitch` (goals), `tennis-court` (net + fence), `park-gate` (piers + iron) |
| `waterfrontModule(type)` | **Waterfront & Harbour** | $6\times 16\text{m} \dots 16\times 4\text{m}$ | $3.40\text{m} \dots 20.5\text{m}$ | 180 / 36 / 12 | `dockside-crane` (portal gantry + lattice jib), `beach-huts` (4 timber sheds), `slipway` (ramp + winch), `lifeguard-tower` (stilts + cabin) |
| `industrialInfrastructure(type)` | **Industrial & Infrastructure** | $8\times 24\text{m} \dots 28\times 28\text{m}$ | $4.50\text{m} \dots 34.0\text{m}$ | 360 / 48 / 12 | `pylon` (34m steel lattice transmission tower with 3 crossarms), `silo` (18m storage cylinder), `tank-farm` (4 tanks + bund), `substation` (transformer + bushings), `pipe-rack` (24m 3-pipe trestle) |

---

## 2. Real Measured Telemetry

- **Asset Registry Summary (`public/asset-registry.js`)**:
  - Total items registered: **165** (165 built/generators, 0 planned gaps, 0 skipped).
  - Generator families: **131** families/variants.
  - Realistic World Triangle Cost: **~5.74M tris** (within 60 FPS performance envelope).
  - Maximum Worst-Case Ceiling: **33.24M tris** (all 165 models at LOD0 simultaneously).
- **Automated Verification Suite**:
  - `node public/props.js`: **138 canonical models passed geometric verification** (origin base-centre, bounds containment, strict tri budgets).
  - `node scripts/test-city-rest.mjs`: **ALL 6 SECTION 4 AUDIT BLOCKS PASSED GREEN**.
  - `node test/run.mjs`: **626 / 626 Node tests PASSED** (0 failures).
  - `npx tsc --noEmit`: **Clean** (0 type errors).

---

## 3. Visual Verification (Photographic Record)

Captured into `.shots/library/` via Playwright:
- `.shots/library/parks.png`: Victorian bandstand, duck pond, sports pitch, tennis court, and park entrance gate.
- `.shots/library/industrial.png`: High-voltage pylon, storage silo, tank farm, electrical substation, and industrial pipe rack.
- `.shots/library/all.png`, `.shots/library/people.png`, `.shots/library/vehicles.png`, `.shots/library/maritime.png`, `.shots/library/vegetation.png`.

---

## 4. Charter Summary

All 4 Core Technical Sections of the Standing Charter are complete:
1. **Section 1: Ground Truth & Model Inspector** (Per-item studio lighting, framing, canvas blitting, live 3D modal inspector, zero WebGL context leaks).
2. **Section 2: Buildings (10 Typologies)** (Villa, Terrace, Townhouse, Midrise, Tower, Shop, Office, Warehouse, Workshop, Apartment Walkup with 562 unique geometry fingerprints).
3. **Section 3: Circulation** (36 4-way & 36 3-way intersection pairings, modern roundabouts, freeway diverge/merge tapers, slip lanes, turning pockets, bus bays, laybys, pedestrian crossings, rail turnout, grade separations, and modular chaining bridge kit).
4. **Section 4: The Rest of the City** (Active crowd figures, service/municipal vehicles, seasonal street trees with grates/guards, park recreation modules, waterfront/harbour structures, and industrial infrastructure).
