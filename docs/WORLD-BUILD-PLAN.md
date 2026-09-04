# The world, rebuilt properly — the build plan

Written 2026-09-04. This is the plan we execute against, step by step. It is
deliberately over-specified: the point of the detail is that nothing is left to
be remembered later, and that any step can be picked up cold.

**Scope.** The GAME BOARD — the world and the worlds this game runs in — and the
coding agent's path into it. NOT the whole app. NOT the aesthetic: the look is
signed off and is not to be changed.

**Method.** Every step below states: what it changes, why, the test that proves
it, and the mutation that proves the test. A step is not done until its mutation
is CAUGHT. That is the same standard the rest of this repo already holds, and it
is the reason the repo can be trusted at 781 tests rather than merely large.

---

## PART 0 — Ground truth

Everything here came from a command. Nothing is remembered.

| Fact | Value | Source |
|---|---|---|
| Suite | 781 tests, 62 files, 0 fail | `node test/run.mjs` |
| Mutation controls | 32, all finds unique | `test/mutations.json` |
| World | 20,624 plots, 20,472 buildings placed | `scripts/measure-layout.mjs` |
| Draw | 480 InstancedMeshes, 1.45 M triangles | `scripts/check-layout-geometry.mjs` |
| Overhangs / misdeclarations | 0 / 0 | same |
| Library | 2,400 registry entries, 2,403 builders | `public/asset-registry.js`, `tier-models.js` |
| Scene | `sceneChildren: 1015`, app OK | `scripts/shoot-app.mjs` |

### What is already right and is NOT being rebuilt

- **Generation is deterministic and proven.** `relief is deterministic`, `the
  whole plan is deterministic — two runs agree exactly`, sha256 over every plot,
  block and road. This is the precondition for everything below and it is done.
- **The layout engine.** Situation → typology → variant, 0 overhangs, measured.
- **The land answers questions with reasons.** `canPlace` returns
  `terrain|size|occupied` plus detail; `waterAt` gives a real cross-section.
- **Addressing exists.** The spatial index resolves a click to plot, block,
  district and settlement — its own comment says that is "an address a change
  request can be written against."
- **The pipeline.** Gates, spend caps, per-IP limits, circuit breaker, AST
  scanners, cross-model review. Do not destabilise this.

### What is actually missing — the whole reason for this plan

1. **The world is a singleton, not an instance.** `generateWorld()` and
   `new LandField(16)` take no seed; `DISTRICTS`, `SETTLEMENTS`, `BRIDGES`,
   `GRID` are module constants. There is one world shape, baked into module
   scope. No clone worlds, no player worlds, no worlds inside worlds.
2. **Nothing can persist a change to the city.** `localStorage` holds UI
   preferences only. The pipeline persists to `sim/current-source` — the parcel,
   not the city the player is looking at.
3. **The pipeline edits a world the player cannot see.**
   `grep -cE "city-plan|cityMode|generateWorld" src/simBaseline.ts` → **0**.
4. **Regions exist and are unused.** `grid.js` models open/LOCKED regions.
   Nothing streams.
5. **The agent cannot produce behaviour.** `station.action` must name an action
   that already exists; `tick`/`chooseAction`/`applyAction` are never model-
   written on the data path.

### Already built tonight, toward this plan

| File | What it does | Tests |
|---|---|---|
| `public/world-model.js` | a world = seed + ordered authored layers | 17 |
| `public/model-forge.js` | verifies generated geometry: scan, compile, build, budget, footprint, determinism | 16 |
| `public/transform.js` | "can this become that, here?" — refusals and MEASURED alternatives | 9 |
| `public/quest.js` | a quest is a function over world state; may only say done when done is true | 16 |

---

## PART 1 — The architecture

**A world is a seed plus an ordered stack of layers.**

```
world = generate(seed)  →  layers.reduce(apply)  →  what you see
```

- **seed** — a string. A name, a player id, a share code. Regenerates the base
  identically, forever. This is only sound because generation is deterministic.
- **layer** — plain JSON: `{ id, author, createdAt, scope, note, edits[] }`.
- **edit** — `{ address, op, payload }`, addressed at one object by the id the
  plan already gives it.

Everything the product needs falls out of that one shape: persistence (a layer
is JSON), undo (drop a layer), clone worlds (same seed, copied stack), worlds
inside worlds (a layer scoped to a region), attribution and monetisation (a
layer has an author), multiplayer later (merge stacks).

**The rule that makes it safe:** a layer holds DATA, never behaviour. Generated
code lives in a verified model store and is referenced BY ID from a layer. A
layer carrying a closure could not be stored, sent, cloned or attributed, and
`validateLayer` refuses it.

---

## STATUS — updated 2026-09-04, read this first

| Step | State | Evidence |
|---|---|---|
| **A1** seed the noise | **DONE** | `createNoise(seed)`; seed 0 bit-identical to the pre-seed field over 5,000+ samples; a named seed differs at 200/200. `test/noise.test.ts` (7). Mutations `seed-zero-is-the-original-world`, `a-seeded-field-uses-its-seed` CAUGHT. |
| **A2** seed the terrain | **DONE** | Seed threaded through `edgeFalloff`, `cliffiness`, `shoreRampAt`, `reliefAt`; carried on `LandField`; read once in `makeHeightAt`. **Default world byte-identical** — sha256 `418744f1…` over 37,668 height samples, before and after. `test/worldSeed.test.ts` (6). Mutations `the-field-carries-its-seed`, `the-height-function-reads-the-fields-seed` CAUGHT. |
| **A2b** seed the PLAN | **DONE** | Seed threaded through `intensityAt`, `classForBlock`, `pickPatchy`, `classForSettlementBlock`, `generateSettlement`, `cityDemand`, `generateCityPlan`, `generateWorld`. **Default plan byte-identical** — sha256 `a88cfd03…` over 19,874 plots + 2,291 blocks + 1,402 roads, before and after. Root-cause fix alongside it: `hash2` was mixing the seed with `Math.imul(seed, …)` directly, and `Math.imul` coerces via `ToInt32` — a STRING seed silently became 0, colliding with the default seed for every named world. `hash2` now runs `seedToInt(seed)` first, closing the hole for every caller, present and future. Also found and fixed while re-grounding: `generateCityPlan` was memoised in a single unkeyed singleton and `cityDemand` in a `WeakMap` keyed only on `heightAt` — a second seed would have silently returned the first seed's cached plan. Both are now keyed on seed. `test/planSeed.test.ts` (5). Mutation `generateWorld-forwards-its-seed` CAUGHT. Two pre-existing A1 mutations (`seed-zero-is-the-original-world`, `a-seeded-field-uses-its-seed`) had their `find` strings broken by the `hash2` edit — repaired and reverified CAUGHT. `scripts/_mutcheck.mjs` was also broken on Windows (three separate bugs: `npx` needs `shell:true`, didn't unwrap `{mutations:[...]}`, and its reporter regex was TAP-shaped against a runner that prints `✖ name (Nms)`) — fixed, since every remaining step tonight needs it. |
| **A3** districts/settlements per-world | **DONE** | `DISTRICTS`, `SETTLEMENTS`, `BRIDGES`, `GRID` deep-frozen as the spec — writing any field, top-level or nested, throws. Real bug found and fixed: `generateWorld`'s returned `districts` copy was shallow (`{ ...d }`), so every world's `districts[i].bounds` was the SAME object `DISTRICTS[i].bounds` — mutating one world's district bounds silently moved every other world's, and the (now-frozen) spec. `test/worldSpec.test.ts` (5). Mutation `districts-copy-clones-its-bounds` CAUGHT. |
| **A4** the world instance | **DONE** | `public/world.js`. `createWorld({ seed, layers })` → `{ seed, plan, land, layers, resolve, toJSON }`, composing `generateWorld`/`LandField`/`createWorldModel` — generates nothing itself. `test/world.test.ts` (4): composes rather than reimplements (fingerprint-equal to calling the three directly); two same-seed instances share plan/land but have independent layer stacks; JSON round-trip rebuilds to the same fingerprint with layers intact; `resolve`/`toJSON` are the layer model's own. Mutation `world-toJSON-carries-its-layers` CAUGHT. **Phase A complete — audit next.** |
| **B–G** | TODO | As specified below. |

**Built and tested, waiting to be wired in (B–G use these):**

| File | Purpose | Tests |
|---|---|---|
| `public/world-model.js` | world = seed + ordered authored layers | 17 |
| `public/model-forge.js` | verifies generated geometry through six stages | 16 |
| `public/transform.js` | "can this become that, here?" — measured refusals and alternatives | 9 |
| `public/quest.js` | a quest is a function over world state; may only say done when done is true | 16 |

**Known gap, stated rather than hidden:** A2's mutation pins that the seed reaches
the shaping functions *collectively*, not that each one's seed is individually
load-bearing. Four separate mutations would close it.

**Housekeeping:** after adding test files, run `node scripts/gen-test-count.mjs`
or `the test counts on the page are the test counts` fails — by design.

---

## HOW TO RESUME — read this before anything else

This plan is built to be picked up cold, by a session that remembers nothing —
which includes your own session after it compacts, several times, overnight.

**The work is [PART 7 — the step ledger](#part-7--the-step-ledger) at the bottom
of this file. The procedure is [docs/BUILD-LOOP.md](BUILD-LOOP.md).**

Read the loop, then take the first unticked step in PART 7. Do not trust your
memory of where you were; read the ledger. Never re-do a ticked step — verify
its evidence still holds if you doubt it, but do not rebuild it.

---

## PART 2 — The build

Ordered by dependency. Each step: change → why → test → mutation.

### PHASE A — The world becomes a value

**A1. Seed the terrain.**
`LandField` and `makeHeightAt` take a seed; the noise field derives from it.
*Test:* two worlds with the same seed are byte-identical by fingerprint; two
worlds with different seeds are not.
*Mutation:* ignore the seed → the different-seeds test goes red.

**A2. Seed the plan.** `generateWorld({ seed, heightAt })`.
*Test:* plot/block/road sha256 differs across seeds and is stable within one.
*Mutation:* drop the seed from the plan → stability test red.

**A3. Districts, settlements, bridges become per-world.**
Module constants become the SPEC; the instance derives its own copy.
*Test:* mutating one world's districts does not reach another's.
*Mutation:* return the module array → cross-contamination test red.
*Note:* ledger 3.4 already fixed a version of this for `generateWorld`'s return.
This extends it to the source tables.

**A4. A world instance ties it together.**
`createWorld({ seed, layers })` → `{ seed, plan, land, layers, resolve, toJSON }`.
*Test:* a world round-trips through JSON and rebuilds identically.

### PHASE B — Persistence

**B1. A layer store.** Save/load a world's layer stack. Browser: IndexedDB with
a localStorage fallback. Server: the existing KV.
*Test:* a saved world reloads with its edits; a corrupt record is REPORTED, not
silently dropped (the `rejected()` path already exists and is tested).
*Mutation:* swallow the load error → the reporting test red.

**B2. Applying layers to the plan.** After `planCity`, before the renderer:
`resolve(address)` per touched address only — never all 20,000.
*Test:* an edit changes exactly its own object and nothing else.
*Mutation:* re-resolve everything → the "touched only" performance test red.

### PHASE C — The renderer consumes layers

**C1. Instanced draw honours overrides.** The 480 variant meshes already group
by situation; an overridden object leaves its instance group and is drawn from
its own model.
*Test:* an overridden plot is not in its original variant's instance count.

**C2. Generated models render.** A verified model from the forge is registered
by id and drawn when a layer references it.
*Test:* a layer referencing an unknown model id is refused at load, with the id.

*Verification for C is visual and cannot be done in this sandbox: `node
scripts/shoot-app.mjs` on Windows. Every C step lists what to look for.*

### PHASE D — The agent's path into the world

**D1. Pick.** Click resolves to an address. Wire the existing spatial index to a
selection state. *Test:* a pick returns a real plot id present in the plan.

**D2. Describe.** A plain-English box, scoped to the selection. No option list —
that is the whole point.

**D3. Ground it physically.** `assessTransform` runs against the real land:
refusals carry the actual numbers under that object; alternatives are found by
search, never invented. **Already built and tested.**

**D4. Generate.** Source-edit path. The model writes a `createGeometry` builder.
This is the step where the agent genuinely codes.

**D5. Verify.** `verifyModelSource`: scan → compile → build → triangle budget →
build time → footprint → determinism. **Already built and tested.**

**D6. Show the work.** Stages already stream over SSE; the page already renders
`grounding → plan → implement → verify → review → fix`. Add the artefact: the
player sees the code that was written for them.

**D7. Apply and persist.** A layer, authored, stored. Visible immediately.

**D8. Undo.** Drop the layer.

### PHASE E — Quests

**E1. Quests as the way in.** "Select a building and alter it." The quest hands
the player to the agent; it does not say how. `quest.js` is built and tested.
**E2. Quest completion from world state**, including layers — so "change
something" completes because something changed.

### PHASE F — Regions

**F1. A world is bigger than the part you are in.** `grid.js` already models
open/LOCKED regions and refuses with a reason rather than reporting emptiness.
**F2. Load and unload by region.** *Test:* an unloaded region refuses placement
with a reason; a loaded one does not.

### PHASE G — Guardrails as dials

**G1. One limits object.** Scope (one object), ops, budget, per-IP, daily. All
in `controlLayer.ts` where the existing caps already live.
*Test:* every limit is read from that object, none hard-coded at a call site.
*Mutation:* hard-code one → the test names it.
**G2. Demo profile vs builder profile.** Numbers, not code paths.

---

## PART 3 — The verification protocol, per step

**[docs/BUILD-LOOP.md](BUILD-LOOP.md) is the procedure. Every step in PART 7
runs through it, in order, with nothing skipped.**

It is not restated here. It used to be, and a procedure kept in two places is
the same defect this project has found four times in its own code: two tables
that must agree, kept apart, drifting. One copy, and this points at it.

The only additions specific to this plan:

- **The default world must not move.** Seed 0 / no seed stays byte-identical,
  pinned at sha256
  `418744f1faeee0c396a8902117d89a67a6f4fb43f3dfadfe71509f991bf24e96` over
  37,668 height samples. Every measured figure in `docs/` describes that exact
  ground. Fingerprint before and after any change to terrain or plan generation.
- **New parameters go last**, defaulting to `DEFAULT_SEED`, so no existing call
  site changes — there are dozens.
- **Phase C cannot be verified headlessly.** Each C step names what to look for
  in `node scripts/shoot-app.mjs` on Windows.

---

## PART 4 — agy's parallel lane — THE ASSET LEDGER

agy works only in `C:\Code\sandbox-spike-assets` on `assets-lane`, never merges
to main, and runs the same [BUILD-LOOP.md](BUILD-LOOP.md) as everyone else. This
is agy's ledger; tick it the same way, with the command as evidence.

All four of these exist because **a declared value was reported as though it had
been measured.** Take every number from the geometry, never from the `tris` or
footprint field that declares it.

- [x] **AS1 — vertex colours.** Emits per-vertex `color` attribute tagging wall
      and roof from `spec.material` with no geometry groups (`groups.length === 0`).
      Evidence: `node -e 'import("./public/buildings.js").then(({building})=>{ const g=building("bld-villa","p",{position:"middle",corner:"none",foundation:"slab",character:"heritage"}).lod[0].createGeometry(); console.log("groups",g.groups.length,"attrs",Object.keys(g.attributes).join(","));})'`
      -> `groups 0 attrs position,normal,color`.
      Mutation `as1-vertex-colors-distinguish-wall-and-roof` CAUGHT.
- [x] **AS2 — `bld-tower` draws 11.81 m past its declared depth.** Bounded crown
      pyramid radius by `minDim` (`Math.min(bW, bD)`) rather than `bW`, ensuring
      no overhang past `footD` or `footW` across all combinations.
      Evidence: `node -e 'import("./public/buildings.js").then(async ({building})=>{ const THREE=await import("./public/vendor/three/three.module.min.js"); let maxOver=0; for(const p of ["middle","end-left","end-right","detached"]) for(const c of ["none","left","right"]) for(const f of ["slab","plinth","stepped"]) for(const ch of ["heritage","interwar","postwar","contemporary"]) for(const pr of ["stepped","tapered","slab","crown","straight"]) { const s=building("bld-tower","probe",{position:p,corner:c,foundation:f,character:ch,profile:pr,cellW:8,cellD:4}); const g=s.lod[0].createGeometry(THREE); g.computeBoundingBox(); const b=g.boundingBox; const overX=Math.max(b.max.x-s.footprint.w/2, -s.footprint.w/2-b.min.x); const overZ=Math.max(b.max.z-s.footprint.d/2, -s.footprint.d/2-b.min.z); if(Math.max(overX,overZ)>maxOver) maxOver=Math.max(overX,overZ); } console.log("max overhang:", maxOver.toFixed(4)); })'`
      -> `max overhang: 0.0000`.
      Mutation `as2-bld-tower-footprint-bounds` CAUGHT.
- [x] **AS3 — declared LOD triangle counts are fiction.** Declared counts now
      directly measure generated geometry: `(sample.index ? sample.index.count : sample.attributes.position.count) / 3`.
      LOD0 geometries enriched with architectural details (reveals, sills, eaves, cornices, balconies, chimneys).
      Evidence: `node -e 'import("./public/buildings.js").then(async ({building})=>{ const typos=["bld-villa","bld-terrace","bld-townhouse","bld-midrise","bld-tower","bld-shop","bld-office","bld-warehouse","bld-workshop","bld-apartment-walkup","bld-highstreet-terrace","bld-business-park"]; let mismatches=0; for(const t of typos){ const s=building(t,"measure",{}); for(let i=0;i<s.lod.length;i++){ const g=s.lod[i].createGeometry(); const actual=(g.index?g.index.count:g.attributes.position.count)/3; if(s.lod[i].tris!==actual) mismatches++; } } console.log("mismatches across all typologies and LODs:", mismatches); })'`
      -> `mismatches across all typologies and LODs: 0`.
      Mutation `as3-declared-lod-triangle-counts-match-geometry` CAUGHT.
- [x] **AS4 — LOD1 == LOD2 for 10 of 12 typologies.** LOD1 authoring upgraded to
      intermediate massing + roof shapes (~10-25% of LOD0 tris, 36-48 tris);
      LOD2 is a single bounding silhouette box (12 tris). `tris1 > tris2` for all 12 typologies.
      Evidence: `node -e 'import("./public/buildings.js").then(async ({building})=>{ const typos=["bld-villa","bld-terrace","bld-townhouse","bld-midrise","bld-tower","bld-shop","bld-office","bld-warehouse","bld-workshop","bld-apartment-walkup","bld-highstreet-terrace","bld-business-park"]; let equalLevels=0; for(const t of typos){ const s=building(t,"measure",{}); const tris1=s.lod[1].tris; const tris2=s.lod[2].tris; if(tris1<=tris2 || tris2!==12) equalLevels++; } console.log("typologies where LOD1 <= LOD2 or LOD2 != 12:", equalLevels); })'`
      -> `typologies where LOD1 <= LOD2 or LOD2 != 12: 0`.
      Mutation `as4-lod1-distinct-from-lod2` CAUGHT.

---

## PART 5 — Explicitly not doing, with reasons

- **Rebuilding generation.** Measured: it produces 20,472 buildings, 0
  overhangs, 0 misdeclarations, and is provably deterministic. The one real
  defect found in it — row plots that could not tile — was three lines. A
  rebuild discards 781 tests and 40-plus ledger findings, each one a mistake
  already paid for.
- **Changing the aesthetic.** Signed off. Out of scope.
- **More models.** 2,400 is not the constraint.
- **Real-money features, subscriptions, multiplayer.** The layer model is built
  so these are possible later; none is built now.

---

## PART 6 — Order and dependencies

```
A1 → A2 → A3 → A4        the world becomes a value
       ↓
B1 → B2                  it persists
       ↓
C1 → C2                  it draws              [visual check on Windows]
       ↓
D1 → D2 → D3* → D4 → D5* → D6 → D7 → D8      the agent's path
       ↓
E1* → E2                 quests
       ↓
F1 → F2                  regions
       ↓
G1 → G2                  guardrails as dials

* already built and tested tonight
```

**A is the gate.** Nothing in B–G is sound until the world is a value, because
every one of them assumes an addressable, reproducible base. That is why A is
first and why it is worth doing before anything writes to the world.

---

## PART 7 — THE STEP LEDGER

**This is the checklist. Work top to bottom. Tick with evidence. Do not stop at
a phase boundary.** Each step names its change, its test and its mutation, so it
can be started by a session that has read nothing but this table.

Legend: `[ ]` not started · `[~]` in progress · `[x]` done, evidence given ·
`[!]` BLOCKED, reason given.

### Phase A — the world becomes a value

- [x] **A1 — seed the noise.** `createNoise(seed)`, seed last in every
      signature. Evidence: seed 0 bit-identical over 5,000+ samples;
      `test/noise.test.ts` (7); mutations `seed-zero-is-the-original-world`,
      `a-seeded-field-uses-its-seed` CAUGHT.
- [x] **A2 — seed the terrain.** Evidence: default world sha256
      `418744f1faeee0c396a8902117d89a67a6f4fb43f3dfadfe71509f991bf24e96` over
      37,668 samples, unchanged; `test/worldSeed.test.ts` (6); mutations
      `the-field-carries-its-seed`, `the-height-function-reads-the-fields-seed`
      CAUGHT.
- [x] **A2b — seed the PLAN.** Evidence: default plan sha256
      `a88cfd0397e923e71eeb59b06b6448dc1f0749032ddca161702dbe8deb20b1a1` over
      19,874 plots + 2,291 blocks + 1,402 roads, unchanged (measured by a
      one-off script before any edit, pinned in `test/planSeed.test.ts`).
      `test/planSeed.test.ts` (5): default plan matches the pin; a named seed
      changes the street/zoning mix, not just the ground; the same seed agrees
      with itself twice, in either call order (kills a memo bug, not just an
      unseeded path). Mutation `generateWorld-forwards-its-seed` CAUGHT —
      `node scripts/_mutcheck.mjs test/planSeed.test.ts public/city-plan.js
      test/mutations.json`.
      Root-cause fix found while re-grounding (STEP 1): `hash2` mixed the seed
      via `Math.imul(seed, …)` directly, and `Math.imul` coerces with
      `ToInt32` — a STRING seed silently became 0, colliding with the default
      seed. Fixed at the root (`hash2` now runs `seedToInt(seed)` first), not
      patched per call site. Also found: `generateCityPlan`'s memo was one
      unkeyed singleton and `cityDemand`'s was a `WeakMap` keyed only on
      `heightAt` — a second seed would have silently returned the first
      seed's cached plan. Both now keyed on seed.
      `scripts/_mutcheck.mjs` was broken on this platform (three bugs: `npx`
      needs `shell:true` on Windows, it didn't unwrap `test/mutations.json`'s
      `{mutations:[...]}` shape, and its failure-name regex was TAP-shaped
      against a runner that prints `✖ name (Nms)`) — fixed, verified against
      the two pre-existing A1 mutations whose `find` strings the `hash2` edit
      also broke (both repaired and reverified CAUGHT).
- [x] **A3 — districts, settlements, bridges, grid become per-world.**
      Evidence: `DISTRICTS`, `SETTLEMENTS`, `BRIDGES`, `GRID` deep-frozen (a
      new `deepFreeze` helper, applied to each array, each element, and each
      nested `bounds`/`exclude`) — `test/worldSpec.test.ts`'s "cannot be
      written through" tests assert every level throws.
      Real defect found while implementing, not hypothetical: `generateWorld`'s
      returned `districts` copy was `DISTRICTS.map((d) => ({ ...d }))` — a
      shallow spread, so every copy's `bounds` property still pointed at the
      SAME object `DISTRICTS[i].bounds` owns. Two worlds built in the same
      process shared one `bounds` object per district; mutating world A's
      moved world B's, and (before freezing) the spec itself. Fixed by cloning
      `bounds` too: `{ ...d, bounds: { ...d.bounds } }`.
      `test/worldSpec.test.ts` (5). Mutation `districts-copy-clones-its-bounds`
      CAUGHT — `node scripts/_mutcheck.mjs test/worldSpec.test.ts
      public/city-plan.js test/mutations.json`.
      *Note:* ledger 3.4 fixed a version of this for `generateWorld`'s RETURN
      once before. This was the same defect one level up, in the source
      tables — and it turned out the fix at that level was ALSO shallow, one
      level down again, in the object the copy pointed at.
- [x] **A4 — the world instance.** Evidence: `public/world.js`, `createWorld({
      seed, layers })` → `{ seed, plan, land, layers, resolve, toJSON }`.
      Composes `generateWorld`, `LandField`/`makeHeightAt` and
      `createWorldModel` — verified fingerprint-equal to calling all three
      directly, not just "produces something". `test/world.test.ts` (4): the
      composition check above; two same-seed instances have equal plan/land
      but independent layer stacks (adding a layer to one does not appear in
      the other's); a JSON round-trip rebuilds to the same plan/land
      fingerprint with its layers intact; `resolve`/`toJSON` are the layer
      model's own methods, not a second implementation of them. Mutation
      `world-toJSON-carries-its-layers` CAUGHT — `node scripts/_mutcheck.mjs
      test/world.test.ts public/world.js test/mutations.json`.
      **Phase A (the world becomes a value) is complete.**

### Phase B — it persists

- [x] **B1 — the layer store.** Evidence: `public/world-store.js`. One
      adapter-agnostic core (`createWorldStore`) over `save`/`load`/`list`,
      with four adapters — `memoryAdapter` (real, used directly as the
      Node/no-storage default and as the reference implementation the tests
      are proven against), `localStorageAdapter` (browser fallback, takes the
      storage object explicitly so a throw-on-write fake can stand in for
      Safari private mode without needing a real browser), `kvAdapter`
      (server-side, same `{get,put,delete,list}` shape this repo's own fake
      KV in `test/changePipelineErrorRecovery.test.ts` already uses),
      `browserAdapter` (selects IndexedDB then localStorage; `indexedDBAdapter`
      itself is UNVERIFIED IN THIS SANDBOX — no IndexedDB in Node, kept
      deliberately small since nothing here can exercise it).
      `test/worldStore.test.ts` (8): round-trip with layers intact; loading a
      never-saved id is reported, not returned empty; a stored blob that is
      not valid JSON, or is valid JSON but not a world shape, is REPORTED —
      not silently treated as a fresh empty world; an adapter that THROWS on
      write (the private-mode/quota case) is reported as a failed save, not
      swallowed as success; `localStorageAdapter`/`kvAdapter` each round-trip
      through a real fake matching their backend's actual interface, prefixed
      correctly; `list()` names exactly what was saved.
      Mutation `world-store-reports-corrupt-json` CAUGHT — deliberately
      replaces the reported failure with a fabricated VALID-shaped result
      (real string seed, empty layers), not a malformed one, so the mutation
      cannot be caught by the next validation check for an unrelated reason:
      `node scripts/_mutcheck.mjs test/worldStore.test.ts public/world-store.js test/mutations.json`.
- [x] **B2 — apply layers to the plan.** Evidence: `public/apply-layers.js`,
      `applyLayers(placements, world)`. Resolves only `world.layers.touched()`
      — not a top-level `world.touched()`, since the ledger's own A4 return
      shape (`{ seed, plan, land, layers, resolve, toJSON }`) does not list
      one; caught by the first test run (`world.touched is not a function`)
      and fixed in the caller rather than by silently widening world.js's
      already-committed, already-mutation-tested surface.
      `test/applyLayers.test.ts` (5): an edit changes exactly its own
      placement — every OTHER placement in the output is the exact same
      object reference as the input, not a copy that happens to be
      unchanged; `world.resolve` is called exactly once for one touched
      address out of 1,000 placements, never once per placement; a removed
      address is marked removed rather than silently kept; an edit
      addressing something outside this placement set (a road, a park) does
      not throw; zero touched addresses returns the identical array, not an
      allocated copy.
      Mutation `apply-layers-resolves-only-touched` CAUGHT — re-resolving
      every placement instead of only the touched ones still produces a
      visually correct result (an unedited address resolves to an unedited
      state), so only counting `resolve()` calls catches it, never a
      happy-path visibility check:
      `node scripts/_mutcheck.mjs test/applyLayers.test.ts public/apply-layers.js test/mutations.json`.
      **Phase B (it persists) complete.**

### Phase C — it draws  *(visual verification is Windows-only — see note)*

- [x] **C1 — instanced draw honours overrides.** Evidence: `public/instance-
      groups.js`, `partitionForInstancing(placements)`. Runs on
      `apply-layers.js`'s output, before `groupByVariant` ever sees the
      placements, so the existing shared-InstancedMesh path in
      `city-render.js` needs no edits — it simply never receives a placement
      this has already pulled out. `test/instanceGroups.test.ts` (3): an
      overridden plot is absent from its group and a removed one from
      everywhere, with conservation checked (nothing lost, nothing
      duplicated); a world with no edits leaves every placement
      REFERENCE-EQUAL, never even inspected; and — not a fixture — the same
      property proven against the REAL generated plan (`generateWorld` +
      `planCity`, ~19,800 real placements), overriding one real plot and
      confirming it is absent from its real instance group. Mutation
      `override-leaves-its-instance-group` CAUGHT — `node
      scripts/_mutcheck.mjs test/instanceGroups.test.ts
      public/instance-groups.js test/mutations.json`.
      **Undone, named rather than skipped:** `city-render.js` itself is not
      yet wired to build its world via `createWorld({ seed, layers })` — it
      still calls `generateWorld(heightAt)` directly, with no layer stack to
      partition. The mechanism is built and proven at real scale; the live
      integration (and the "one building visibly different" Windows check
      this step originally asked for) is deferred to **D7 — apply and
      persist**, which is where a layer becomes visible in the running app
      at all. Checking it here would have nothing yet to check.
- [x] **C2 — generated models render.** Evidence: `public/model-registry.js`
      (`register`/`get`/`has`/`ids`, gated on `verdict.ok === true` from
      `model-forge.js`'s `verifyModelSource` — an unverified model is refused
      registration outright, not merely unregistered) and
      `public/resolve-models.js` (`resolveOverrideModels(overridden,
      registry)` — a "replace" override resolves against the registry or is
      refused BY MODEL ID; a "retint"/"move" override never asks the
      registry anything, since it never claimed a model).
      `test/modelRegistry.test.ts` (5): a verified model registers and
      fetches back; registering a FAILED verdict is refused outright; an
      unknown model id is refused at resolve, naming the id; a registered
      model resolves carrying its verified geometry; a bare retint/move is
      never sent through the registry at all. Mutation
      `resolve-models-refuses-unknown-id` CAUGHT — falls back to a
      default-shaped model on an unknown id, the exact temptation the ledger
      names: `node scripts/_mutcheck.mjs test/modelRegistry.test.ts
      public/resolve-models.js test/mutations.json`.
      **Undone, same reason as C1:** not yet wired into `city-render.js`,
      which has no layer stack to resolve models against until it builds its
      world via `createWorld`. Deferred to **D7**. **Phase C (it draws)
      complete** at the mechanism level; the Windows visual check on both C1
      and C2 is deferred with it.

### Phase D — the agent's path into the world *(this is the product)*

- [x] **D1 — pick.** Evidence: `public/selection.js`, `createSelection(index)`
      — a thin stateful wrapper over `spatial-index.js`'s `addressAt`, the
      same "compose, do not reimplement" discipline `world.js` and
      `apply-layers.js` already follow. `test/selection.test.ts` (3), run
      against the REAL generated plan (not a fixture): a pick at a real
      plot's centre returns that exact plot's real id, present in
      `plan.plots`; the selection persists as `.current` until picked again
      or `clear()`ed; a pick far outside any built land resolves with
      `onPlot: false` rather than throwing. Mutation
      `pick-returns-the-plot-not-the-block` CAUGHT — swaps `plotId` for
      `blockId`, the exact failure the ledger names: `node
      scripts/_mutcheck.mjs test/selection.test.ts public/selection.js
      test/mutations.json`.
      **Undone:** not wired to an actual click handler or shown in the page
      — that is a DOM/UI concern this Node-testable layer intentionally does
      not reach into; a real pointer event calling `.pick(x, z)` with a
      raycast hit is a small, mechanical follow-on once the renderer itself
      is live-wired (D7).
- [x] **D2 — describe.** Evidence: `public/describe-request.js`,
      `makeDescribeRequest(selection, text)`. Every existing display path in
      `index.html` already uses `.textContent` for visitor-typed text (grepped
      across the whole file — never `.innerHTML` for it), which cannot execute
      markup by construction of the DOM API. The one way that defense breaks
      is something UPSTREAM templating the text into an HTML string first, so
      this module's contract is narrower than escaping: the text is carried
      VERBATIM, never touched, never concatenated into markup — there is
      nothing here for an escaping bug to hide in, because there is no
      string-building of it at all.
      `test/describeRequest.test.ts` (4): the request carries the selected
      address and the typed text; text containing real HTML metacharacters
      (`<img src=x onerror=...>`) passes through byte-identical, not escaped,
      not stripped, not wrapped; nothing selected is refused rather than
      silently addressing nothing; empty/whitespace-only text is refused
      rather than sent as an empty request.
      Mutation `describe-request-carries-text-verbatim` CAUGHT — wraps the
      text in `<span>...</span>`, the literal anti-pattern this module exists
      to never do: `node scripts/_mutcheck.mjs
      test/describeRequest.test.ts public/describe-request.js
      test/mutations.json`.
      **Undone:** the actual `<textarea>`/box in the page and its submit
      handler are not built — this is the request-construction logic a real
      box will call, following D1's same "prove the mechanism, defer the DOM
      wiring" pattern.
- [x] **D3 — ground it physically.** `assessTransform` against the real land.
      Built and tested: `public/transform.js`, `test/transform.test.ts` (9).
      Refusals carry the actual depth/size under that object; alternatives come
      from `findGround`, never invented.
- [x] **D4 — generate.** Evidence: `public/generate-request.js`.
      `buildGeometryPrompt(assessment, want, request)` carries D3's measured
      constraints (footprint, support, clearance) verbatim, and refuses
      before anything is prompted when `assessTransform` has not approved
      the transform — which also means nothing is ever sent anywhere for a
      request that cannot work, in keeping with zero spend without
      authorisation. `verifyGeneratedGeometry(source, prompt, evaluate,
      THREE)` is a thin wrapper over D5's already-proven
      `verifyModelSource`, passing `prompt.constraints.footprint` as
      `declared` — there is no field anywhere a response could use to
      declare its own footprint instead; the only footprint that exists in
      the call is the one the request itself carried.
      **No model is called anywhere in this step or its tests** — every
      "response" is a hand-written source string, honouring zero API spend
      without explicit authorisation.
      `test/generateRequest.test.ts` (4): the prompt carries D3's exact
      footprint/support/clearance; generation is refused before any prompt
      exists when the ground has not approved the transform; a response that
      ignores the requested footprint (asked for 3×3, source builds 40×40)
      fails verification at the `footprint` stage; a response that genuinely
      honours the constraint verifies clean. Mutation
      `verify-generated-geometry-uses-real-constraint` CAUGHT — inflates the
      declared footprint by 1000 m before checking, the exact "repaired
      silently" failure mode the ledger names: `node
      scripts/_mutcheck.mjs test/generateRequest.test.ts
      public/generate-request.js test/mutations.json`.
- [x] **D5 — verify.** `verifyModelSource`: scan → compile → build → triangle
      budget → build time → footprint → determinism. Built and tested:
      `public/model-forge.js`, 16 tests.
- [x] **D6 — show the work.** Evidence: `public/stage-artefact.js`.
      `stageArtefact(stage, source, verdict)` shapes what one stream event
      carries; `describeStageOutcome(artefact)` returns `ok: true | false |
      null` — deliberately never collapsed to a boolean, because "not yet
      checked" (an `implement` event before `verify` has run) is a real
      state distinct from either a pass or a fail, and losing that
      distinction is the exact failure-floor shape this project keeps
      finding elsewhere.
      **Deliberately did not touch `src/changePipeline.ts`** (2,000+ lines,
      live, already carries real spend/gates) or `index.html`'s existing
      stage rendering — same "prove the mechanism, defer the wiring"
      pattern as D1/D2/D4, doubly warranted here since `src/` is extended,
      never rewritten, and this step's own source-edit path (D4) is not
      wired into that pipeline yet either.
      `test/stageArtefact.test.ts` (4): the artefact carries the source and
      verdict unaltered; a FAILED verify's description text matches
      `/fail|refus/i` and explicitly does NOT match `/success|verified ok|
      passed/i`; a passing verify's text names what was actually measured
      (triangle count), not a generic "ok"; an artefact with no verdict yet
      reads as `ok: null`, neither a pass nor a fail. Mutation
      `failed-verify-reads-as-failed` CAUGHT — reports "verified ok" for a
      failed verdict regardless of what actually failed, which is precisely
      failure-floor item 1 (shipping unverified work reported as verified),
      applied to one stage's own display text: `node
      scripts/_mutcheck.mjs test/stageArtefact.test.ts
      public/stage-artefact.js test/mutations.json`.
- [x] **D7 — apply and persist.** Evidence: `public/apply-and-persist.js`,
      `applyAndPersist({ world, worldId, registry, store, request, source,
      verdict, modelId, layerId, author })` — the join across everything
      built tonight: an unverified model is refused before anything happens
      (never registered, never becomes a layer, never persisted); a verified
      one registers, becomes a layer via `world-model.js`'s own
      `layerFrom`/`validateLayer` (not a second check that could disagree
      with them), is added to the world, and is saved through B1's store.
      `test/applyAndPersist.test.ts` (4): a verified model becomes a layer
      referencing the model BY ID — `source` is genuinely in scope in this
      function (the realistic calling context, right after D4's verify
      step) and the test proves the serialised layer never contains it, not
      a vacuous check against a function that was never given the source at
      all; the produced layer is valid per the real `validateLayer`; the
      layer survives store → `worldFromJSON` → resolve, matching what was
      persisted; an unverified model touches none of world/registry/store.
      Mutation `layer-references-model-by-id-not-source` CAUGHT — inlines
      `source` into the payload alongside `modelId`, the accident this
      module exists to prevent: `node scripts/_mutcheck.mjs
      test/applyAndPersist.test.ts public/apply-and-persist.js
      test/mutations.json`.
      **"Visible immediately" is Undone, named plainly rather than claimed:**
      C1/C2/D7 together are a complete, tested MECHANISM — override
      partitioning, model registry, apply-and-persist — but nothing
      tonight wired `city-render.js` to build its scene from a
      `createWorld({ seed, layers })` instead of a bare
      `generateWorld(heightAt)`, and no click handler, text box, or API
      route exists yet to drive D1/D2/D4 live. That is a materially larger
      task than this ledger line captures — real DOM wiring, a real request
      to a real model under the pipeline's existing spend gates — and
      belongs to its own step with its own plan, not squeezed into D7's
      evidence by generous interpretation.
- [x] **D8 — undo.** Evidence: `public/undo.js`, `undoLayer(world, worldId,
      layerId, store)`. `world-model.js`'s `remove()` already does the real
      work and is proven in isolation; the gap isolation cannot see is
      persistence — a removal that only happens in the in-memory world and
      is never re-saved would look like undo worked right up until the next
      reload brought the "removed" layer straight back. This always
      re-persists after a successful remove, through the same store D7
      uses.
      `test/undo.test.ts` (3), end to end through the real stack (two
      authors, three layers, a real memory-backed store): undoing one of
      Mark's two layers removes exactly its own edit — his other layer and
      Jess's are both untouched; the undo SURVIVES A RELOAD (store → load →
      `worldFromJSON`), not just proven true in the same in-memory world
      that removed it; undoing a layer id that does not exist is refused,
      not a silent no-op success. Mutation `undo-persists-the-removal`
      CAUGHT — drops the re-save, so the removal exists only in memory and
      the undone layer comes back after a reload, exactly the gap
      isolation-level proof cannot see: `node scripts/_mutcheck.mjs
      test/undo.test.ts public/undo.js test/mutations.json`.
      **Phase D (the agent's path into the world) is complete** at the
      mechanism level, with the live-wiring gap named honestly at D7.

### Phase E — quests

- [x] **E1 — quests as the way in.** `public/quest.js` built and tested (16). A
      quest is a function over world state and may only say done when done is
      true. It hands the player to the agent; it does not say how.
- [x] **E2 — completion from world state, including layers.** Evidence:
      `public/quest.js`'s `questState` gets a 5th parameter, `layers = null`
      (new, last, default preserves every existing call site exactly —
      verified directly: a call with no 5th argument gets `changed:
      {touchedAddresses: [], layerCount: 0}`), sourced from the live layer
      model's own `touched()`/`layers()` — the same calls
      `test/worldModel.test.ts` already proves correct, not a second
      tracking mechanism that could disagree with them.
      `public/change-quest.js`, new: `changeSomethingQuest.check` reads
      `state.changed.touchedAddresses.length > 0` — nothing else.
      `test/questCompletion.test.ts` (4): the new field is empty by default
      for pre-existing callers; a snapshot carrying a UI-shaped signal
      (`player.mode: "editing"`) but no real edit does NOT complete the
      quest; a REAL layer added to a real world DOES complete it; the
      check function's own source is grepped and contains neither `flag`
      nor `player.mode` — so a reviewer, or a future generated quest
      copying this one, cannot even see a flag-shaped field to complete on.
      Mutation `quest-completes-on-a-real-edit-not-a-flag` CAUGHT — the
      single most important mutation in Phase E, exactly as named: `node
      scripts/_mutcheck.mjs test/questCompletion.test.ts
      public/change-quest.js test/mutations.json`.
      **Phase E (quests) complete.**

### Phase F — regions

- [x] **F1 — a world is bigger than the part you are in.** Evidence:
      `public/world.js`'s `createWorld` gets a new `regions = null`
      parameter (last, default `null` is `createGrid`'s own "the whole
      world is open" default) and exposes `grid` — `createGrid({
      openRegions: regions })` — on the returned world.
      `test/regions.test.ts`'s first two tests: a world's grid, built with
      no `regions` argument, behaves EXACTLY like a bare `createGrid()` (not
      just "similarly" — `deepEqual` against the real thing, both `.check()`
      and `.regions()`); a world built with explicit regions is genuinely
      locked outside them.
- [x] **F2 — load and unload by region.** Evidence: `public/grid.js` gets
      `closeRegion(name)` — the missing half of "load and unload"; only
      `openRegion` (load) existed before. Refuses (not a silent no-op) when
      the whole world is open (nothing region-tracked to close) or the name
      is not currently open.
      `test/regions.test.ts` (6 total): a region that was never opened
      refuses placement WITH A REASON, not a bare failure; the same region,
      opened, no longer refuses; the same region, opened THEN CLOSED,
      refuses AGAIN — proving close genuinely reverses open, not merely
      "does nothing"; closing an unknown region name is refused and leaves
      the region list unchanged.
      Mutation `locked-region-refuses-with-a-reason-not-bare-false` CAUGHT
      — the exact mutation the ledger names, "refuse with a bare false":
      `node scripts/_mutcheck.mjs test/regions.test.ts public/grid.js
      test/mutations.json`.
      **Phase F (regions) complete.**

### Phase G — guardrails as dials

- [x] **G1 — one limits object.** Evidence: `src/controlLayer.ts` already has
      exactly one limits object, `CONTROL_LIMITS` — budget (three spend
      ceilings), per-IP (`DAILY_LIVE_RUNS_PER_IP`), daily (the same three
      ceilings), ops (`MAX_FIX_ATTEMPTS`, `MAX_REVIEW_ROUNDS`, token caps),
      concurrency and the circuit breaker. **Nothing in `src/` was changed
      for this step** — the file already satisfied the property; what did
      not exist was a test proving it, so that is what this step adds.
      `test/controlLimitsAreLive.test.ts` (2), behavioural rather than
      textual: monkey-patch `CONTROL_LIMITS.FREE_FORM_MAX_LENGTH` (and
      separately `CIRCUIT_FAILURE_THRESHOLD`) on the REAL, live imported
      object and confirm `checkInputGuard`/the circuit breaker's actual
      behaviour moves with it — a hard-coded call site cannot pass this,
      because there is no way to "happen to" read a value that changed
      after the function was compiled. Restored after every test, verified
      by re-reading `CONTROL_LIMITS` back to its original value.
      Mutation `checkInputGuard-reads-control-limits-not-a-literal` CAUGHT
      — the exact mutation the ledger names, hard-coding one to a bare
      `500` — against `src/controlLayer.ts` itself, restored and
      independently reverified clean via `git diff --stat` (empty) after
      `_mutcheck.mjs`'s own restore, given how protected this file is:
      `node scripts/_mutcheck.mjs test/controlLimitsAreLive.test.ts
      src/controlLayer.ts test/mutations.json`.
      **"Scope (one object)" is Undone, named plainly rather than
      fabricated:** nothing today caps how many addresses one layer/request
      may touch, and no enforcement point exists to wire it to —
      `public/*.js` never imports from `src/*.ts` (confirmed by search; the
      game/world and the pipeline are genuinely separate today), so adding
      an unenforced constant would have been a number with nothing reading
      it, which is the exact "true by construction" shape this project's
      own protocol warns against.
- [!] **G2 — demo profile vs builder profile. BLOCKED.**
      A genuine second profile needs two things this session does not have:
      real, authorised numbers for a "builder" tier's spend caps (this
      touches `CONTROL_LIMITS`, the file governing actual dollar limits on
      a live pipeline — CLAUDE.md's "zero API spend without explicit
      authorisation" applies to inventing a business number here as much as
      to spending one), and a live selection mechanism to make the second
      profile reachable at all. Neither exists tonight.
      Restructuring `CONTROL_LIMITS` into a `CONTROL_PROFILES.demo /
      .builder` shape with FABRICATED builder numbers, and no code path
      that ever selects `builder`, would satisfy the letter of "numbers,
      not code paths" while producing exactly the shape
      `AUDIT-PROTOCOL.md` §2 asks an auditor to distrust: a test that is
      true by construction, proving a structure nothing uses. G1 declined
      the equivalent temptation for "scope (one object)" for the same
      reason; this is the same call, made explicitly rather than by
      omission.
      *What would unblock it:* Mark supplies the actual builder-tier caps
      (or confirms doubling/some stated multiple of `CONTROL_LIMITS` is the
      real answer), and a real call site (a header, an env var, an
      authenticated route) that selects which profile is active. Until
      then this is honestly Undone, not silently skipped.

### Phase H — close-out *(do these; the build is not finished without them)*

- [ ] **H1 — the full mutation suite, clean.** `node scripts/mutate.mjs --all`.
      Every control CAUGHT. **Zero INCONCLUSIVE** — an inconclusive result is a
      broken harness, not a pass, and must be chased down rather than reported.
      Nothing else touches the tree while it runs.
- [ ] **H2 — the page's numbers are true.** `node scripts/gen-test-count.mjs`,
      then re-read every count claimed on the page and confirm it was measured
      today. The page states its own test count; a stale one is the exact defect
      this project exists to argue against.
- [ ] **H3 — update PART 0 ground truth** with the new measured figures, each
      with the command that produced it.
- [ ] **H4 — write `docs/WORLD-BUILD-LOG.md`**: what was built, what was
      measured, what is still not verified (the visual checks), and every step
      marked BLOCKED with its reason. Honest, specific, no rounding up.

---

## PART 8 — Beyond H, and why it is not being built tonight

These are real and the layer model exists so they are cheap later. None is in
scope now, and adding one early is how the sound parts get destabilised:

- **Player-built worlds and clone worlds** — already possible the moment A4
  lands: same seed, copied stack.
- **Worlds inside worlds** — a layer scoped to a region; `scope` is already in
  the layer shape and F gives it regions to point at.
- **Player-authored quests** — `quest.js` validates a quest as a function over
  world state, so a player-written quest is verified the same way a
  player-written model is.
- **Multiplayer** — merging two layer stacks. The ordering and authorship needed
  for it are in the model already.
- **Monetisation and real-world impact funding** — a layer has an author, which
  is the whole prerequisite. Everything else is commerce, not architecture.

If a step in PART 7 tempts you to build one of these to make it easier, that is
the signal to stop and leave a note in PART 7, not to widen the scope at 3am.
