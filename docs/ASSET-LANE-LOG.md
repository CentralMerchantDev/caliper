# ASSET LANE BUILD LOG — Model Library Fixes (AS1–AS4)

**Date:** 2026-09-04  
**Lane:** `assets-lane` (`C:\Code\sandbox-spike-assets`)  
**Branch:** `assets-lane`  
**Standard of Proof:** [docs/BUILD-LOOP.md](BUILD-LOOP.md), [CLAUDE.md](../CLAUDE.md)  
**Ledger:** [docs/WORLD-BUILD-PLAN.md](WORLD-BUILD-PLAN.md) §PART 4  

---

## 1. Summary of Work

All four defects in PART 4 of the World Build Plan have been addressed, verified with commands run directly on geometry, and proved with mutations that turn the test suite red:

1. **AS1 (Vertex Colours):** Merged geometries write per-vertex `color` attributes from `spec.material` (`wall` and `roof`), tagging each part as it is pushed and writing Float32 RGB values without geometry groups.
2. **AS2 (`bld-tower` Footprint Overhang):** Crown cone radius is bounded by `minDim = Math.min(bW, bD)` rather than `bW`, eliminating the historical 11.81 m depth overhang on non-square plots (e.g. 64×32 m).
3. **AS3 (Declared LOD Triangle Counts as Budget Controls):**
   - Declared triangle counts `s.lod[i].tris` are hand-written static engineering budget constants in each typology spec, chosen deliberately per typology per LOD (NOT derived, NOT computed, NOT sampled from geometry).
   - Test assertion enforces a true budget window:
     - `measured <= declared` (ceiling guard: geometry must stay within budget)
     - `measured >= declared * 0.7` (anti-padding guard: geometry must utilize at least 70% of budget; a 30% tolerance accommodates procedural seed variations such as storeys, bays, and unit counts without permitting hollow declarations).
   - *Audit finding & correction:* Commit `b84989b` previously computed declarations from geometry at runtime (`sample0 = buildLOD0()`). That created an identity test ($X === X$) true by construction. The previous mutation mutated the declaration to 360, which tripped the test only because the declaration was changed; had geometry drifted, the sample would have updated in tandem and passed silently. AS3 was previously unguarded against geometry drift. This is now repaired: the declaration is an independent claim, and the mutation adds 12 triangles to geometry without touching the declaration.
   - *Performance finding:* Computing `sample0` and `sample1` at module load cost ~82–90 ms on import and allocated BufferGeometries on every spec creation. Removing sample construction reduced import overhead and dropped the time for 100 calls to `building()` to 3 ms.
4. **AS4 (LOD1 vs LOD2 Separation):** LOD1 geometries have been upgraded to intermediate massing + roof shapes (~10–25% of LOD0, 36–48 triangles), distinct from LOD2 single silhouette boxes (12 triangles).

---

## 2. Evidence and Measurements

Every figure below was measured by running a command on 2026-09-04. Numbers are derived from actual geometry buffers, never from fields that declare them.

### AS1: Vertex Colours
- **Command:**
  ```bash
  node -e 'import("./public/buildings.js").then(({building})=>{ const g=building("bld-villa","p",{position:"middle",corner:"none",foundation:"slab",character:"heritage"}).lod[0].createGeometry(); console.log("groups",g.groups.length,"attrs",Object.keys(g.attributes).join(","));})'
  ```
  **Output:**
  `groups 0 attrs position,normal,color`
- **Typology Coverage Check:**
  ```bash
  node -e 'import("./public/buildings.js").then(async ({building})=>{ const THREE = await import("./public/vendor/three/three.module.min.js"); const typos=["bld-villa","bld-terrace","bld-townhouse","bld-midrise","bld-tower","bld-shop","bld-office","bld-warehouse","bld-workshop","bld-apartment-walkup","bld-highstreet-terrace","bld-business-park"]; for(const t of typos){ const s=building(t,"p",{}); const g=s.lod[0].createGeometry(THREE); const colors=new Set(); const c = new THREE.Color(); for(let i=0;i<g.attributes.color.count;i++){ c.fromBufferAttribute(g.attributes.color, i); colors.add(c.getHex()); } const hasWall = colors.has(s.material.wall); const hasRoof = colors.has(s.material.roof); console.log(t, {hasWall, hasRoof, colorsCount: colors.size}); } })'
  ```
  **Result:** All 12 typologies emit `hasWall: true, hasRoof: true, colorsCount: 2`.

### AS2: `bld-tower` Footprint Overhang
- **Command (testing all option combinations on 64×32 m footprint):**
  ```bash
  node -e 'import("./public/buildings.js").then(async ({building})=>{ const THREE=await import("./public/vendor/three/three.module.min.js"); let maxOver=0; for(const p of ["middle","end-left","end-right","detached"]) for(const c of ["none","left","right"]) for(const f of ["slab","plinth","stepped"]) for(const ch of ["heritage","interwar","postwar","contemporary"]) for(const pr of ["stepped","tapered","slab","crown","straight"]) { const s=building("bld-tower","probe",{position:p,corner:c,foundation:f,character:ch,profile:pr,cellW:8,cellD:4}); const g=s.lod[0].createGeometry(THREE); g.computeBoundingBox(); const b=g.boundingBox; const overX=Math.max(b.max.x-s.footprint.w/2, -s.footprint.w/2-b.min.x); const overZ=Math.max(b.max.z-s.footprint.d/2, -s.footprint.d/2-b.min.z); if(Math.max(overX,overZ)>maxOver) maxOver=Math.max(overX,overZ); } console.log("max overhang:", maxOver.toFixed(4)); })'
  ```
  **Output:**
  `max overhang: 0.0000`

### AS3: Declared Budgets vs Actual Geometry Triangle Counts
- **Command (verifying all typologies and LOD levels satisfy budget constraints `measured <= declared` and `measured >= declared * 0.7`):**
  ```bash
  node -e 'import("./public/buildings.js").then(async ({building})=>{ const typos=["bld-villa","bld-terrace","bld-townhouse","bld-midrise","bld-tower","bld-shop","bld-office","bld-warehouse","bld-workshop","bld-apartment-walkup","bld-highstreet-terrace","bld-business-park"]; let budgetFailures=0; for(const t of typos){ const s=building(t,"test-lod",{}); for(let i=0;i<s.lod.length;i++){ const g=s.lod[i].createGeometry(); const m=(g.index?g.index.count:g.attributes.position.count)/3; const d=s.lod[i].tris; if(m>d || m<d*0.7) budgetFailures++; } } console.log("budget failures across all typologies and LODs:", budgetFailures); })'
  ```
  **Output:**
  `budget failures across all typologies and LODs: 0`

- **Measured Counts vs Declared Budgets (seed "test-lod"):**
  | Typology | LOD0 Measured / Budget | LOD1 Measured / Budget | LOD2 Measured / Budget |
  |---|---|---|---|
  | `bld-villa` | 696 / 700 | 48 / 50 | 12 / 12 |
  | `bld-terrace` | 468 / 480 | 48 / 50 | 12 / 12 |
  | `bld-townhouse` | 312 / 320 | 48 / 50 | 12 / 12 |
  | `bld-midrise` | 300 / 320 | 48 / 50 | 12 / 12 |
  | `bld-tower` | 140 / 160 | 36 / 40 | 12 / 12 |
  | `bld-shop` | 168 / 180 | 36 / 40 | 12 / 12 |
  | `bld-office` | 180 / 200 | 36 / 40 | 12 / 12 |
  | `bld-warehouse` | 228 / 240 | 36 / 40 | 12 / 12 |
  | `bld-workshop` | 156 / 170 | 36 / 40 | 12 / 12 |
  | `bld-apartment-walkup` | 492 / 500 | 36 / 40 | 12 / 12 |
  | `bld-highstreet-terrace` | 432 / 450 | 36 / 40 | 12 / 12 |
  | `bld-business-park` | 144 / 150 | 36 / 40 | 12 / 12 |

- **Module Load and Instantiation Performance:**
  - Import time with eager sample geometry generation: **82–90 ms**
  - Import time with static budget constants: **54 ms**
  - 100 calls to `building()` with static constants: **3 ms**

### AS4: LOD1 vs LOD2 Separation
- **Command (testing LOD1 > LOD2 and LOD2 == 12 across all 12 typologies on measured geometry):**
  ```bash
  node -e 'import("./public/buildings.js").then(async ({building})=>{ const typos=["bld-villa","bld-terrace","bld-townhouse","bld-midrise","bld-tower","bld-shop","bld-office","bld-warehouse","bld-workshop","bld-apartment-walkup","bld-highstreet-terrace","bld-business-park"]; let equalLevels=0; for(const t of typos){ const s=building(t,"measure",{}); const count = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3; const tris1=count(s.lod[1].createGeometry()); const tris2=count(s.lod[2].createGeometry()); if(tris1<=tris2 || tris2!==12) equalLevels++; } console.log("typologies where LOD1 <= LOD2 or LOD2 != 12:", equalLevels); })'
  ```
  **Output:**
  `typologies where LOD1 <= LOD2 or LOD2 != 12: 0`

---

## 3. Mutation Controls

Every control has an active entry in `test/mutations.json` and was verified with `scripts/_mutcheck.mjs`:

```
baseline: GREEN
CAUGHT        as1-vertex-colors-distinguish-wall-and-roof
CAUGHT        as2-bld-tower-footprint-bounds
CAUGHT        as3-declared-lod-triangle-counts-match-geometry
CAUGHT        as4-lod1-distinct-from-lod2

restored: byte identical
```

Mutation details:
- `as1-vertex-colors-distinguish-wall-and-roof`: **CAUGHT**
  - Mutated: `if (item.tag === "roof") colVal = defaultRoof;` → `colVal = defaultWall;`
  - Expected failure: `distinguishing wall and roof`
- `as2-bld-tower-footprint-bounds`: **CAUGHT**
  - Mutated: `new geomT.ConeGeometry(minDim * 0.5, crownH, 4);` → `new geomT.ConeGeometry(bW * 0.55, crownH, 4);`
  - Expected failure: `bld-tower never draws past declared footprint`
- `as3-declared-lod-triangle-counts-match-geometry`: **CAUGHT**
  - Mutated: adds a `BoxGeometry(1, 1, 1)` (+12 triangles) to `bldVilla`'s `buildLOD0` without touching the declaration.
  - Measured triangles rise from 696 to 708, exceeding the 700 budget ceiling.
  - Expected failure: `bld-villa LOD0 measured triangles (708) exceed declared budget (700)`.
- `as4-lod1-distinct-from-lod2`: **CAUGHT**
  - Mutated: `bldMidrise` LOD1 to return `buildLOD2` and `tris: 12`.
  - Expected failure: `LOD1 is an intermediate massing level distinct from LOD2`.

---

## 4. Test Suite and Type Integrity

- `npx tsc --noEmit`: 0 errors
- `node test/run.mjs`: 654 pass, 0 fail (47.4s)

---

## 5. Still Unverified

- Visual rendering through WebGL / SwiftShader (`node scripts/shoot.mjs` / `node scripts/shoot-app.mjs`) is Windows-specific and requires an interactive GPU/display pipeline. Visual appearance of the enriched models and contrasting vertex colours in the live renderer should be inspected via headless shots if a GPU canvas is available.
