# CALIPER — Island Metropolis Masterplan

**This is the canonical plan. Approved by Mark. Every world change is measured against it.**

Any tool working on the 3D world reads this first and follows it end to end. If something in here
turns out to be wrong once you are in the code, **say so and correct the plan** — do not silently
build something else.

---

## THE METHOD — non-negotiable

Mark's instruction, and it is the reason previous rounds failed:

> Run the loop of **do → review → fix** until it works. When something isn't working, look for the
> error, find it, fix it — and that can mean doing it a different way. Find the A+ way that works
> not just for that fix but for the entire system.

Concretely:

1. **Ground first.** Read this plan. Measure the current state against it. Never start from an
   assumption about what the code does.
2. **Change one thing.** Then **look at it** — a real frame, not a claim. The scene is reachable
   live at `window.__worldRenderer`; mutate and screenshot before writing anything to a file.
3. **If it did not work, find out why.** Do not retry the same approach with a different number. A
   second failure means the approach is wrong, not the value.
4. **Fix the class, not the instance.** If a value is being overwritten every frame, the fix is to
   find the real control — not to set it harder. If a comment disagrees with the geometry, the fix
   is to derive the comment, not to reword it.
5. **Verify by looking, then by measuring.** Screenshot for appearance, `getBoundingClientRect` /
   computed extents for correctness. Both, not either.
6. **Never report a change as done without a frame that shows it.**

---

## 1. GEOGRAPHY — the approved zoning

South to north:

| Zone | Extent | Contents |
|---|---|---|
| **Vast Open Ocean** | z 30 → 1400+ | Deep azure, wave normals, sailing yachts, distant horizon |
| **Beach & Boardwalk** | z 22 → 30 | Golden sand meeting the surf line, hardwood boardwalk, balustrades, pergolas, cafés, beach pavilions, lifeguard towers, marina slips |
| **Waterfront Boulevard & Tram** | z 11 → 21 | Dual-track light rail, two-lane vehicular boulevard, parallel parking, tree-lined median, wide pedestrian sidewalks |
| **Downtown Island Core** | z −15 → 11, x −75 → +75 | Rectilinear city blocks, crosswalks, curb cuts, traffic lights, street trees |
| **Sheltered Inner Harbour** | z −60 → −15 | Ferry slips, houseboats, water taxis, mooring buoys, boathouses |
| **Mainland Coastal City** | z < −60 | Terraced residential hills, secondary commercial centre |
| **Mountain Ridge** | far north | Peaks rising to y ≈ 90m |
| **Flanking Coasts** | \|x\| > 75 | Rocky promontories, cliffs, pocket beaches, suspension bridges and viaducts to the mainland |

**Rule: no two zones may overlap.** Every zone boundary is a hard edge that geometry must respect.

---

## 2. CITY LAYOUT — infrastructure before buildings

The downtown is a real grid, laid out in this order. **Buildings are sited last, into blocks that
already exist.** This is the fix for "you can't navigate it."

**Layer 1 — Streets:** continuous paved sidewalks, granite curbs, marked crosswalks, bike
corridors, service alleys.
**Layer 2 — Transit:** boulevard carriageway, a *separated* tram corridor, legible walking and
driving routes.
**Layer 3 — Open space:** central tree-lined square, public fountain, reflecting pool, civic lawns.

### Blocks

- **Promenade Block** (z 5 → 11) — 2020s boutique hotel, glass dining pavilion, mixed-use retail
  condos with ground-floor café seating.
- **Central Civic & Heritage Block** (z −5 → 5) — Victorian/Edwardian masonry row (arched stone
  windows, dentil cornices, wrought iron, brick chimneys, awnings) facing a civic plaza with
  reflecting pool, fountain, benches, pavers, street trees.
- **Metropolitan Civic & Services Block** (z −15 → −5) — Neoclassical City Hall with limestone
  portico and copper-domed clock tower; Metro General Hospital with emergency bay and helipad;
  red-brick Engine Co. 1 firehouse; 2026 curtain-wall towers with articulated balconies and podium
  retail.

---

## 3. ARCHITECTURE — 1800s to 2026

All **procedural composite geometry**. No external glTF/FBX imports — that keeps load instant and
keeps `NOT_YET_PRESENT` in `src/worldStructure.ts` true.

- **Classical / Beaux-Arts:** fluted columns, entablatures, cornices, pediments, quoins, arched
  window surrounds, balustrades.
- **Historic brick / brownstone:** brick bonds, fire escapes, transom glass, fabric awnings, roof
  water towers.
- **2020–2026 contemporary:** double-glazed tinted curtain wall, aluminium louvres, cantilevered
  glass balconies, sky-gardens, rooftop mechanical enclosures.

## 4. VEHICLES, BOATS, STREET LIFE

Tri-deck motor yacht (flybridge, radar arch, teak swim platform), sailing catamaran (dual hulls,
rigging, furled boom), harbour launch, water taxi. Electric sedans and SUVs, 1960s convertible,
articulated low-floor bus, dual-car tram, fire engine, ambulance. Benches, kiosks, LED street lamps,
traffic signals, café tables with parasols.

## 5. ATMOSPHERE — crisp, not foggy

- **`scene.fog = null`.** Settled empirically: tested at 0.0011, 0.00022 and off. Off wins
  decisively — distant towers keep definition, hills read as hills. **Do not reintroduce scene fog.**
- Sun: strong directional definition, tight shadow frustum, correct normal bias.
- `ACESFilmicToneMapping` with exposure balanced — no washed skies, no muddy shadows.
- Bloom: high-intensity highlights and neon only. No bloom haze.
- Vignette: light or off. No heavy darkening.
- PBR materials with real roughness/metalness; water with visible depth gradient.

---

## 6. CURRENT STATE MEASURED AGAINST THIS PLAN

Verified against the live scene and the source. **This is the work list.**

### Already correct

- Fog removed (`scene.fog = null`).
- Daylight IBL: `scene.environmentIntensity = lerp(0.85, 0.14, nightAmt)` — this, **not**
  per-material `envMapIntensity`, is the real control; the draw loop overwrites the latter every
  frame.
- Anisotropic filtering on all textures, from real hardware caps.
- Terrain-following cameras in walk / drive / fly via one shared `terrainHeightAt(x, z)`.
- Nav pad arrows drive movement through the same key set as the keyboard.

### Zoning does not match the plan

| Element | Plan | Actual |
|---|---|---|
| Downtown core | z −15 → 11, x ±75 | z −28 → 22, x ±55 |
| Boulevard / tram | z 11 → 21, **separated** corridor | road plane z 9.4 → 13.8; tram at z 10.1 **inside the carriageway** |
| Beach / boardwalk | z 22 → 30 | beach plane at z 21.6 → 26.8, **overlapping the seawall** |
| Ocean | z 30+ | water plane starts **z 20** — north of the seawall |
| Inner harbour | z −60 → −15 | z −65 → −28 |

### Known defects, measured

1. **Tram runs inside the vehicular carriageway** and its body overhangs the north curb.
2. **The tram passes through a parked car** at (13.8, 10.5) on every cycle.
3. **Yacht Club and Townhouse terraces overlap the seawall body** by 0.80 m (both z 14 → 22 against
   a seawall at z 21.2 → 22.8).
4. **Two coplanar beach planes z-fight** across z 21.6 → 24.2 at identical y and colour.
5. **Terrain vertex pitch is 12.5 m**, so the "flat to z = 22" tableland actually ramps to
   y ≈ −0.29 under the promenade.
6. **`CITY_ZONING.WATERFRONT_SEAWALL.zMin = 22.0`** under-reserves by 1.0 m — the coping starts at
   21.0. This is how the terraces got to overlap it.
7. **Comment-vs-geometry drift is systemic** in `world-render-3d.js`. Several positional comments
   are wrong by metres. **Trust no positional comment; recompute from the size/position pair.**

### Fixed this session

- **Expressway viaduct moved z 72 → 262.** It was 50 m off the civic waterfront, 1100 m wide, with
  56 m towers and 94 m near-white stay cables crossing the entire frame — the white X.

### Still to decide

- Bloom threshold (currently 0.99 at strength 0.02) — the plan asks for 0.92. Lowering the
  threshold *increases* bloom; test before changing.
- Vignette (currently offset 1.45, darkness 0.45) — the plan asks for it off or light.

---

## 7. EXECUTION ORDER

Infrastructure before buildings. Each phase ends with a frame that proves it.

1. **Re-zone the ground.** Terrain, water, beach, seawall to the plan's boundaries. Raise terrain
   resolution so the tableland is genuinely flat. Fix the zoning constant.
2. **Lay the street grid.** Carriageway, separated tram corridor, sidewalks, curbs, crosswalks,
   alleys — as data on a grid, with no overlaps.
3. **Site the blocks.** Promenade / Civic & Heritage / Metropolitan, into the grid.
4. **Build the architecture** by era into those blocks.
5. **Populate** vehicles, boats, street furniture, people.
6. **Light and grade** — sun, tone mapping, bloom, vignette.

**No phase starts until the previous one is verified by a screenshot and a measured non-overlap
check.**

---

## 8. ACCEPTANCE

- Every zone boundary respected; **zero geometry overlaps across zones**, proven by computed extents.
- The tram corridor is physically separate from the carriageway.
- A visitor can walk or drive the grid without passing through anything.
- 199 Node tests + 9 workers tests pass; `tsc` clean; the nine regression checks unedited.
- No external mesh imports; `NOT_YET_PRESENT` stays true.
- Screenshots: ocean-to-beach-to-downtown vista; heritage row beside 2026 towers; civic plaza;
  inner harbour with bridges and mountains; street level; desktop and 375px.

---

## 9. THE LIVE LOOP — how to work on this fast

The deployed page exposes **`window.__worldRenderer`**. Through it the whole scene is readable and
mutable at runtime: 2,293 meshes, 1,322 materials, fog, environment, camera.

So the loop is: **mutate live → screenshot → judge → repeat**, and only when the value is right,
write it into the source and deploy once. This found the fog density, the viaduct, and the
environment-intensity override in a single session after two days of reading the source found none
of them.

Raycasting from screen coordinates identifies any object in frame exactly — use it instead of
guessing what something is.
