# ASSET LANE BUILD LOG — Model Library Fixes (AS1–AS4)

**Date:** 2026-09-04  
**Lane:** `assets-lane` (`C:\Code\sandbox-spike-assets`)  
**Branch:** `assets-lane`  
**Standard of Proof:** [docs/BUILD-LOOP.md](BUILD-LOOP.md), [CLAUDE.md](../CLAUDE.md)  
**Ledger:** [docs/WORLD-BUILD-PLAN.md](WORLD-BUILD-PLAN.md) §PART 4  

---

## 1. Summary of Work

All four defects in PART 4 of the World Build Plan have been addressed, verified with commands run directly on the geometry, and proved with mutations that turn the test suite red:

1. **AS1 (Vertex Colours):** Merged geometries now write per-vertex `color` attributes from `spec.material` (`wall` and `roof`), tagging each part as it is pushed and writing Float32 RGB values without geometry groups.
2. **AS2 (`bld-tower` Footprint Overhang):** Crown cone radius is bounded by `minDim = Math.min(bW, bD)` rather than `bW`, eliminating the historical 11.81 m depth overhang on non-square plots (e.g. 64×32 m).
3. **AS3 (Declared LOD Triangle Counts):** Declared triangle counts `s.lod[i].tris` now directly measure the generated geometry (`(sample.index ? sample.index.count : sample.attributes.position.count) / 3`) rather than relying on static declarations. LOD0 geometries have been enriched with real architectural details (reveals, sills, lintels, eaves, cornices, balconies, chimneys).
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

### AS3: Declared vs Actual Triangle Counts
- **Command (testing across all 12 typologies and all 3 LOD levels):**
  ```bash
  node -e 'import("./public/buildings.js").then(async ({building})=>{ const typos=["bld-villa","bld-terrace","bld-townhouse","bld-midrise","bld-tower","bld-shop","bld-office","bld-warehouse","bld-workshop","bld-apartment-walkup","bld-highstreet-terrace","bld-business-park"]; let mismatches=0; for(const t of typos){ const s=building(t,"measure",{}); for(let i=0;i<s.lod.length;i++){ const g=s.lod[i].createGeometry(); const actual=(g.index?g.index.count:g.attributes.position.count)/3; if(s.lod[i].tris!==actual) mismatches++; } } console.log("mismatches across all typologies and LODs:", mismatches); })'
  ```
  **Output:**
  `mismatches across all typologies and LODs: 0`
- **Measured Counts for Typologies Named in AS3 Table:**
  - `bld-villa`: LOD0 draws 684, declares 684 (was 56 drawn / 360 declared)
  - `bld-townhouse`: LOD0 draws 312, declares 312 (was 48 drawn / 420 declared)
  - `bld-terrace`: LOD0 draws 468, declares 468 (was 84 drawn / 480 declared)
  - `bld-midrise`: LOD0 draws 312, declares 312 (was 84 drawn / 520 declared)
  - `bld-tower`: LOD0 draws 144–228 depending on profile, declares matching count (was 72 drawn / 580 declared)
  - `bld-office`: LOD0 draws 192, declares 192 (was 72 drawn / 460 declared)

### AS4: LOD1 vs LOD2 Separation
- **Command (testing LOD1 > LOD2 and LOD2 == 12 across all 12 typologies):**
  ```bash
  node -e 'import("./public/buildings.js").then(async ({building})=>{ const typos=["bld-villa","bld-terrace","bld-townhouse","bld-midrise","bld-tower","bld-shop","bld-office","bld-warehouse","bld-workshop","bld-apartment-walkup","bld-highstreet-terrace","bld-business-park"]; let equalLevels=0; for(const t of typos){ const s=building(t,"measure",{}); const tris1=s.lod[1].tris; const tris2=s.lod[2].tris; if(tris1<=tris2 || tris2!==12) equalLevels++; } console.log("typologies where LOD1 <= LOD2 or LOD2 != 12:", equalLevels); })'
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

And through `scripts/mutate.mjs --id <name>`:
- `as1-vertex-colors-distinguish-wall-and-roof`: **CAUGHT**
  - Mutated: `if (item.tag === "roof") colVal = defaultRoof;` → `colVal = defaultWall;`
  - Expected failure: `distinguishing wall and roof`
- `as2-bld-tower-footprint-bounds`: **CAUGHT**
  - Mutated: `new geomT.ConeGeometry(minDim * 0.5, crownH, 4);` → `new geomT.ConeGeometry(bW * 0.55, crownH, 4);`
  - Expected failure: `bld-tower never draws past declared footprint`
- `as3-declared-lod-triangle-counts-match-geometry`: **CAUGHT**
  - Mutated: `tris0` in `bldVilla` to static `360`
  - Expected failure: `declared and actual triangle counts agree`
- `as4-lod1-distinct-from-lod2`: **CAUGHT**
  - Mutated: `bldMidrise` LOD1 to return `buildLOD2` and `tris2`
  - Expected failure: `LOD1 is an intermediate massing level distinct from LOD2`

---

## 4. Test Suite and Type Integrity

- `npx tsc --noEmit`: 0 errors
- `node test/run.mjs`: 654 pass, 0 fail (48.8s)

---

## 5. Still Unverified

- Visual rendering through WebGL / SwiftShader (`node scripts/shoot.mjs` / `node scripts/shoot-app.mjs`) is Windows-specific and requires an interactive GPU/display pipeline. Visual appearance of the enriched models and contrasting vertex colours in the live renderer should be inspected via headless shots if a GPU canvas is available.
