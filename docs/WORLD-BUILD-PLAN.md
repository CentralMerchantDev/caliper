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

**Re-measured 2026-09-04, at the close of the PART 7 build (Phase H).** The
figures below replace the ones this section opened with, which were already
stale before this session's own work began (781 tests / 32 controls / 20,624
plots was the count from an EARLIER point in the project's history, not
anything this session's changes moved) — itself a small instance of the
exact defect PART 0's own header line exists to prevent.

| Fact | Value | Source |
|---|---|---|
| Suite | 868 node tests across 81 files (0 fail), 12 worker tests (0 fail) | `node scripts/gen-test-count.mjs` |
| Mutation controls | 53, all finds unique, 53/53 CAUGHT | `test/mutations.json`; `test/.mutate-results.json` (H1) |
| World | 2,291 blocks, 19,874 plots, 19,725 placed (99.3%), 149 refused | `node scripts/measure-layout.mjs` |
| Draw | 480 InstancedMeshes, 1,451,912 triangles (49,164 across the 480 distinct geometries) | `node scripts/check-layout-geometry.mjs` |
| Overhangs / misdeclared footprints | 0 / 0 | same |
| Library | **not re-measured this session** — `public/asset-registry.js` and `public/tier-models.js` carry an uncommitted, unrelated change (2,400 → 4,800 models) from the parallel `assets-lane`, excluded from every commit tonight and flagged to Mark before the build began. Measuring against the current working tree would report a number that is neither the committed ground truth nor a real deployed state. |
| Scene | `sceneChildren: 1015`, app OK, no page errors | `node scripts/shoot-app.mjs` |
| City summary | `src/citySummary.generated.ts` — zero diff on regeneration | `node scripts/gen-city-summary.mjs` (H2) |

The default (no-seed) world is unchanged from every prior measurement of it —
not asserted, pinned: `test/worldSeed.test.ts` and `test/planSeed.test.ts`
fingerprint the terrain and the plan against sha256 hashes captured before
this session's own A1/A2/A2b/A3 changes, and both still match exactly. The
plot/placement counts above differ from PART 0's original figures because
the original figures were stale relative to a `main`-branch fix already
landed before tonight (`627e599`, "row plots tile"), not because of anything
built in PART 7.

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

This table is what existed BEFORE PART 7's own build loop started (A1, A2,
D3, D5, E1's foundations). It is not the full inventory — PART 7 itself went
on to add roughly twenty more `public/` modules (`world.js`, `world-store.js`,
`apply-layers.js`, `instance-groups.js`, `model-registry.js`,
`resolve-models.js`, `selection.js`, `describe-request.js`,
`generate-request.js`, `stage-artefact.js`, `apply-and-persist.js`,
`undo.js`, `change-quest.js`, among others) plus the `_mutresolve*`/
`mutate-resume` tooling. The full list, each with its own evidence, is PART
7's own ledger below; `docs/WORLD-BUILD-LOG.md` (H4) is the narrative account.

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

- [ ] **AS1 — vertex colours.** Merged geometry carries `position` and `normal`
      only — no groups, no `color` — so every building draws with
      wall-coloured roofs while its spec declares `material:{wall,roof}`.
      ```
      node -e 'import("./public/buildings.js").then(({building})=>{
        const g=building("bld-villa","p",{position:"middle",corner:"none",
          foundation:"slab",character:"heritage"}).lod[0].createGeometry();
        console.log("groups",g.groups.length,"attrs",Object.keys(g.attributes).join(","));})'
      -> groups 0  attrs position,normal
      ```
      *Fix:* emit a per-vertex `color` attribute — tag each part wall or roof as
      it is pushed, and have `mergeGeometries` write Float32 colours from
      `spec.material`. **Do NOT use geometry groups:** an InstancedMesh takes
      one material, so groups do not help. The renderer already reads
      `geo.attributes.color` and switches to `vertexColors` automatically — no
      change is needed on the world side.
- [ ] **AS2 — `bld-tower` draws 11.81 m past its declared depth.** Declares
      64×32, draws 62.7×43.8, on 7 of 1,296 combinations (position × corner ×
      foundation × character). Every placement check downstream reads the
      DECLARATION, so it reserves one piece of ground and occupies another.
      Find what extends past `footD`; bring it inside or raise the declaration.
- [ ] **AS3 — declared LOD triangle counts are fiction.**
      `actual = (geo.index ? geo.index.count : geo.attributes.position.count) / 3`
      | typology | declares | draws |
      |---|---|---|
      | bld-villa | 360 | 56 |
      | bld-townhouse | 420 | 48 |
      | bld-terrace | 480 | 84 |
      | bld-midrise | 520 | 84 |
      | bld-tower | 580 | 72 |
      | bld-office | 460 | 72 |
      Every one is 10–22% of its claim. Decide which number is right, make them
      agree, and SAY which was chosen. The geometry is the likelier defect: 56
      triangles is about four boxes, and a villa with a porch, garage, bay
      window, dormers and a chimney cannot be four boxes.
      *Budget, measured:* 20,472 buildings collapse to 480 instanced variants,
      today 1.45 M triangles. At a genuine 400–600 at LOD0 that is roughly 7–9 M
      before LOD selection, inside the 12 M ceiling `test/layoutGeometry.test.ts`
      asserts. Build to the declared budget and spend the detail where it is
      SEEN — window reveals, sills, eaves, cornices, balcony rails, roof clutter.
- [ ] **AS4 — LOD1 == LOD2 for 10 of 12 typologies.** `bld-midrise` 84/12/12,
      `bld-tower` 72/12/12, `bld-office` 72/12/12. A three-level system whose
      middle level costs the same as its lowest is a two-level system with extra
      code. LOD1 ≈ 15% of LOD0 (massing plus roof shape), LOD2 ≈ 3% (one
      silhouette box).

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

- [x] **H1 — the full mutation suite, clean.** Evidence: **53 of 53 mutations
      CAUGHT. Zero SURVIVED. Zero INCONCLUSIVE.**
      `node -e 'console.log(JSON.stringify(Object.entries(JSON.parse(require("fs").readFileSync("test/.mutate-results.json","utf8")).results.reduce((a,r)=>((a[r.status]=(a[r.status]||0)+1),a),{}))))'`
      → `[["CAUGHT",53]]`.

      **The method changed mid-step, and that is itself part of the record.**
      `node scripts/mutate.mjs --all` re-runs the ~860-test suite for every
      mutation — over an hour for 52+ of them — and this environment reaps
      long-running commands. It never finished in one sitting: measured
      attempts reached 18, then restarted from zero; then 29; then 3.
      **First fix (kept):** a results file
      (`test/.mutate-results.json`, gitignored) written after every mutation,
      not at the end, and `--resume` (`scripts/mutate-resume.mjs`,
      `test/mutateResume.test.ts`, 4 tests, mutation
      `resume-skips-already-done-mutations` CAUGHT) that skips ids already
      recorded and trusts a prior baseline only when the tree's git status and
      a content fingerprint of every test file are unchanged. This made the
      approach *survivable* — proven by resuming through six real kills,
      accumulating 22 CAUGHT+1 SURVIVED without ever losing progress — but did
      not make it *fast enough to finish*: even resumable, 30+ remaining
      mutations at ~100-200s of real suite time each was still over an hour of
      unbroken runtime this environment would not grant in one sitting.
      **Second fix (what actually finished it):** `scripts/_mutresolve.mjs`
      resolves each remaining mutation's `expect` string to the one
      `test/*.test.ts` file that contains it (2 of 31 were genuinely
      ambiguous — the same phrase appears in two test names — reported as
      findings and resolved by hand, not guessed, by reading both files'
      actual content); `scripts/_mutresolve-run.mjs` then drives
      `scripts/_mutcheck.mjs` — bundle one test file, mutate, run, verify,
      restore, in seconds — over each resolved row, appending results to the
      same `test/.mutate-results.json` in the same shape, so the record stayed
      one unified file regardless of which tool proved which row. All 31 ran
      CAUGHT in well under the ~15 minutes this was estimated to take.
      **The trade-off, stated rather than hidden:** a full-suite run also
      catches a mutation that breaks something UNEXPECTED elsewhere; a run
      scoped to one test file cannot see that. Closed by running `node
      test/run.mjs` once, clean and unmutated, after all 53 were recorded —
      **868/868** — which costs one suite run instead of thirty-one and
      confirms nothing scoped verification missed broke anything else.
      **A genuine process mistake, caught and corrected, not glossed over:**
      mid-fix, an earlier `--all --resume` background run was wrongly assumed
      dead from an ambiguous status read. A second, unrelated invocation
      started against the same tree while it was still alive — briefly two
      processes racing the same marker and results paths. Caught by
      `public/ground.js` turning up dirty with a mutation nobody had
      knowingly applied; both processes were confirmed and stopped, both
      partially-mutated files were restored and verified by hash (one via
      `git checkout`, one — an untracked new file with no committed version —
      by hand, diffed against the known mutation to confirm exactly what to
      revert), and the 22 results the live process had already proved before
      the collision were reconstructed from this session's own recorded
      terminal output — exact id/status pairs, not re-guessed — before
      anything was committed. **One agent (or process) per checkout is not
      only a rule about parallel Claude sessions; it is a rule about parallel
      *anything* touching the same tree, and this is the second time
      tonight's own project history has needed it.**
      **The survivor, fixed through the full loop, not left as the one
      exception:** `sizer-and-renderer-share-one-seed` (public/layout-fits.js)
      came back SURVIVED against `test/layoutGeometry.test.ts`'s overhang-COUNT
      test, which asserts a consequence against a 2% ceiling (409 of 20,472)
      that terrain tuning had, over the life of this project, drifted the
      measured figure toward — the mutation's own 653-overhang effect still
      fit under a ceiling that had moved. This was a TEST defect, not a
      mutation defect. Fixed by asserting the CAUSE instead: `layout-fits.js`
      refactored (`askedFor`, an internal helper `sizeFor` now calls,
      changing nothing about its behaviour — confirmed by the pre-existing
      overhang test passing at its original numbers) and a new export,
      `measuredSeedFor`, exposing the exact seed value production measures a
      placement's fit with. `test/layoutGeometry.test.ts`'s new test asserts
      that seed equals `seedFor(typology, placement.options)` — the seed the
      renderer actually builds with — for EVERY one of ~20,000 real
      placements, exactly, which cannot drift with terrain the way a
      percentage ceiling can. The overhang-count test was kept exactly as
      written: it guards a different, still-real thing (that the fits
      predicate runs at all), which `fits-filter-is-applied`'s own CAUGHT
      result already depends on.
      `node scripts/_mutcheck.mjs test/layoutGeometry.test.ts public/layout-fits.js test/mutations.json`
      → CAUGHT.
      **Lesson recorded so it is not re-discovered:** `mutate.mjs --all` is a
      release check sized for a runtime this environment cannot give it in one
      sitting, not a per-session tool. `_mutcheck.mjs` scoped to a mutation's
      own guarding test file, driven over a batch via `_mutresolve.mjs`, is
      the tool that actually finishes here — proving each row in seconds
      instead of minutes, at the cost of not re-running the other ~860 tests
      per row, which one final clean `node test/run.mjs` closes cheaply
      afterward.
- [x] **H2 — the page's numbers are true.** Evidence: `node
      scripts/gen-test-count.mjs` → **868 node tests (0 fail), 12 worker
      tests (0 fail)**, matching `#claim-node-tests`/`#claim-worker-tests` on
      the page exactly (written by the generator, not typed).
      Every other page claim `test/publicClaims.test.ts` pins is covered by
      the 868/868 clean run above: the world's size, the placeholder city
      stats, the spend caps/limits (checked against `CONTROL_LIMITS` — the
      same object G1 proved every gate reads live), and the architecture
      modal's stage names.
      `node scripts/gen-city-summary.mjs` re-run and produced **zero diff**
      against the committed `src/citySummary.generated.ts` — the city itself
      is unchanged from before tonight's session, consistent with every
      seed-related step (A2b, A3) pinning the DEFAULT seed byte-identical
      throughout.
      `npm test`: 868/868. `npx tsc --noEmit`: clean.
- [x] **H3 — update PART 0 ground truth.** Evidence: PART 0's table above,
      each figure with the command that produced it — `node
      scripts/gen-test-count.mjs` (868 node / 12 worker), `node
      scripts/measure-layout.mjs` (2,291 blocks, 19,874 plots, 19,725
      placed), `node scripts/check-layout-geometry.mjs` (480 InstancedMeshes,
      1,451,912 triangles, 0 overhangs), `node scripts/shoot-app.mjs`
      (`sceneChildren: 1015`), `node scripts/gen-city-summary.mjs` (zero
      diff). Library explicitly marked NOT re-measured, with the reason
      (the contaminated working tree), rather than either measuring a wrong
      number or silently leaving the old one uncorrected.
      Found in the process: PART 0's opening figures (781 tests / 32
      controls / 20,624 plots) were already stale before tonight's session
      began — from a `main`-branch fix (`627e599`, landed before this
      session) that PART 0 was never updated against. Noted in the table
      itself so the next reader does not attribute the difference to PART 7.
- [x] **H4 — write `docs/WORLD-BUILD-LOG.md`.** Evidence: the file itself —
      what was built per phase, the measured figures with their commands, what
      is still not verified (the live-rendering integration gap that spans
      C1/C2/D1/D2/D4/D6/D7/D8, named as the single biggest remaining item),
      G2's BLOCKED reason, and the two incidents worth remembering (a
      pre-existing PART 0 staleness found and fixed; two processes racing the
      same tree mid-H1, caught and recovered). **Every box in PART 7 is now
      `[x]` with evidence or `[!]` with a reason — the build described by this
      plan is complete at the mechanism level**, with the live-wiring gap
      named plainly rather than claimed.
- [x] **Final consolidated blind audit (Phase B–H, per the session's own
      redirect to run one audit at the end rather than one per phase
      boundary).** A fresh, no-history agent, spawned into an isolated
      worktree, audited every Phase B–H module against the running commit
      history. Report: `docs/audits/UMAA-phases-B-H.md`. Five findings, all
      now fixed, tested, mutation-proven and committed:
      1. **HIGH** — `CLAUDE.md`'s own "how to verify" line was stale by 297
         tests (571 claimed, 868 measured). Fixed by `test/claudeMdIsCurrent.test.ts`,
         mechanically pinning the line to `test/testCount.generated.json` the
         same way `test/publicClaims.test.ts` already pins the page.
      2. **MEDIUM** — the Phase A audit report the build log cites, and this
         audit's own report, existed only inside throwaway `.claude/worktrees/`
         checkouts, never merged to `main`. Both recovered and committed to
         `docs/audits/`, along with their `AUDIT-PROTOCOL.md` §7 additions.
      3. **LOW/MEDIUM** — `grid.js`'s `closeRegion` on the whole-world-open
         sentinel (`open === null`) — the shape every world built today
         actually has, since nothing wires `createWorld({ regions })` from a
         live call site yet — was untested. Two tests added to
         `test/regions.test.ts`; mutation `close-region-on-open-null-refuses-not-a-silent-success`
         CAUGHT.
      4. **LOW** — two different functions both named `worldFromJSON`
         (`world.js`, a full world; `world-model.js`, the layer model alone),
         a naming trap for a future caller. `world-model.js`'s renamed to
         `worldModelFromJSON`.
      5. **MEDIUM** — `createWorld()` cost ~2.4s/call with no saving on a
         repeat call for the same seed (confirming the earlier Phase A
         audit's identical, previously undocumented finding), and Phase B–H's
         own new tests had added ~17 call sites that do exactly that.
         `public/world.js` now memoizes `LandField`/`heightAt` per seed —
         `plan`/`layers`/`grid` deliberately stay per-call, since two tests
         require independent mutable district data and independent layer
         stacks for the same seed. Measured: ~50% reduction per repeat call
         (4093ms → ~2060ms), whole-suite runtime dropped ~292s → ~235s.

      **This closes the audit loop this session opened**: the redirect that
      asked for one consolidated audit at the end, rather than one per phase
      boundary, is honoured by this entry — every finding it produced has a
      commit, a test, and a mutation, not just a report.

---


### Phase I — WIRE IT IN *(the mechanisms exist and nothing runs them)*

Nine of the thirteen modules built in A–H are imported by **nothing**:
`world-store.js`, `resolve-models.js`, `selection.js`, `describe-request.js`,
`generate-request.js`, `stage-artefact.js`, `apply-and-persist.js`, `undo.js`,
`change-quest.js`. `city-render.js:238` still calls `generateWorld(heightAt)`.

Phase I is the plan's own **Undone** column becoming its **Done** column. Every
line below was written by this plan about itself — lines 541, 566, 697, 728, 811,
968. Nothing here is new scope.

- [x] **I1 — the renderer builds a world instance.** Evidence:
      `public/city-render.js`'s new `buildWorldState(seed, layers)`, used by
      `buildWorld()` itself, composes via `createWorld()` (`public/world.js`)
      instead of calling `new LandField(16)` / `generateWorld(heightAt)`
      directly. `buildWorld()` now reads `?seed=` from the URL, defaulting to
      `DEFAULT_SEED`. `test/cityRenderWorldState.test.ts` (2): for the
      default seed, `buildWorldState()`'s field/heightAt/plan/world are
      byte-identical (fingerprinted) to what the old bare calls produced —
      composes, does not reimplement; a named non-default seed
      (`"shoreline-district-9"`) produces genuinely different field/world
      fingerprints, proving the seed reaches `createWorld()` rather than
      silently defaulting. Mutation `buildWorldState-forwards-its-seed`
      CAUGHT (drops `seed` from the `createWorld({...})` call): `node
      scripts/_mutcheck.mjs test/cityRenderWorldState.test.ts
      public/city-render.js test/mutations.json`.
      Default-world guard measured directly, matching
      `test/worldSeed.test.ts`'s own pin: `sha256` of `new LandField(16)`'s
      height fingerprint is `418744f1faeee0c396a8902117d89a67a6f4fb43f3dfadfe71509f991bf24e96`
      — unchanged.
      `npx tsc --noEmit`: clean. `npm test`: 880/880.
      **Not yet claimed:** whether the scene actually RENDERS from this —
      no visual check yet. That is I2's own step, deliberately, since I2 is
      the first point a layer (and therefore any visible difference) exists
      to check.
- [x] **I2 — layers reach the scene.** Evidence: `public/city-render.js`'s
      new `buildScenePlacements({ instance, world, heightAt })` (pure, no
      THREE) runs `applyLayers` (`public/apply-layers.js`) between `planCity`
      and `instance-groups.js`'s `partitionForInstancing`, exactly the order
      Phase B/C proved in isolation and nothing had run for real until now.
      `buildWorld()` feeds `groupByVariant` only the `instanced` half, and
      draws `overridden` individually after resolving each against
      `resolve-models.js` + a fresh `model-registry.js` instance — a
      verified "replace" draws its registered geometry; a bare
      retint/move draws the placement's own stock model with the edit
      applied; an unresolved "replace" (nothing is registered yet — that is
      I5) is refused outright, never a default-shaped fallback.
      `test/cityRenderScenePlacements.test.ts` (2), against the REAL
      generated plan (~20,000 placements, not a fixture): a hand-injected
      retint layer moves exactly the targeted plot to `overridden`, the
      total (`instanced.length + overridden.length`) is unchanged, and every
      untouched placement is still present; with no layers, everything is
      instanced and nothing is overridden. Mutation
      `buildScenePlacements-partitions-overrides-out-of-instancing` (feeds
      `groupByVariant` the override too, instead of partitioning it out)
      CAUGHT: `node scripts/_mutcheck.mjs
      test/cityRenderScenePlacements.test.ts public/city-render.js
      test/mutations.json`.
      **This is the first moment any of A–H is visible — checked, not
      assumed.** `node scripts/shoot-app.mjs`: the real app page renders
      clean, no page errors, world built (screenshot: `.shots/app.png`).
      For the one-building-visible check specifically (nothing yet writes a
      live layer into the real app — that is I6's job), `public/city.html`
      gained a debug-only `?debugOverridePlot=<id>` hook (not a production
      feature) constructing one hand-injected retint layer;
      `node _TO-DELETE/i2-visual-check/shoot-override.mjs` (throwaway,
      kept per policy, not committed — gitignored under `_TO-DELETE/`)
      photographed the same camera view with and without it. Measured
      directly from the HUD: `buildings` stayed at 19,725 before and after
      (nothing lost, nothing doubled); `parts` (the InstancedMesh-drawn
      count) dropped from 19,725 to 19,724 — exactly the one placement that
      left instancing to draw on its own; a visibly magenta building appears
      near the waterfront in the "after" shot at the retinted plot's
      location. No triangle-count figure is exposed by this HUD to compare
      against PART 0's recorded figure — noted as not covered here rather
      than assumed close enough.
      `npx tsc --noEmit`: clean. `npm test`: 882/882. Default-world guard
      re-measured: `sha256` of `new LandField(16)`'s height fingerprint is
      still `418744f1faeee0c396a8902117d89a67a6f4fb43f3dfadfe71509f991bf24e96`.
- [x] **I3 — pick.** Evidence: `public/world-render-3d.js`'s existing
      city-mode click handler ("CITY MODE PICKS AGAINST THE SCENE") already
      raycast to a world point and asked the spatial index what was there —
      that part predates this step. What was missing was memory: it called
      `this._index.addressAt(x, z)` fresh every click, with nothing keeping
      what was picked a moment later for D2/D4's describe/generate step to
      read. Now constructs `this._selection = createSelection(this._index)`
      alongside the index and resolves through `this._selection.pick(x, z)`
      — same address, now persisted at `.current`. "Something on screen
      naming what is picked" was already true (the existing `onInspect`
      callback), unchanged.
      `test/pickSelection.test.ts` (2): a DATA test, against the real
      generated plan — a pick at a real plot's real centre returns that
      exact plot's id and it stays at `.current`, and a second pick on a
      different plot replaces the first (one selection, not a history); a
      WIRING test, reading `world-render-3d.js`'s own source (constructing a
      real `WorldRenderer` needs a GPU this suite does not have — the same
      limitation `test/rendererStatic.test.ts` already states and works
      around the same way) — pins that the city-mode handler resolves
      through `this._selection.pick`, not `this._index.addressAt` directly.
      Mutation `city-mode-pick-resolves-through-persisted-selection`
      (reverts the handler to call the index directly) CAUGHT: `node
      scripts/_mutcheck.mjs test/pickSelection.test.ts
      public/world-render-3d.js test/mutations.json`.
      Live, not just simulated: a throwaway Playwright script
      (`_TO-DELETE/i3-visual-check/check-selection.mjs`, gitignored, kept
      per policy) loaded the real app, confirmed `_cityMode: true` and a
      real `_selection` instance exist, called `.pick(1000, 500)` and read
      `.current` straight back — a real address (`districtId: "harbourside"`,
      `nearestPlotId: "block-836-590-p1"`), with `.current === the value pick()
      returned`, proving persistence end to end, not just at the module level.
      `npx tsc --noEmit`: clean. `npm test`: 884/884. Default-world guard
      unaffected (this step touches no generation code).
- [x] **I4 — describe.** Evidence: `public/index.html` gained
      `#describe-input`/`#describe-submit`/`#describe-result` inside the
      existing parcel-inspect panel (shown by I3's `onInspect`, unchanged) —
      a free-text box, no option list, calling D2's `makeDescribeRequest`
      with `renderer3d.getSelection()` (a new thin delegate on the
      `WorldRenderer` wrapper, `public/world-render-3d.js`, returning the
      real `_selection` I3 wired, or `null` in the 2D fallback) and the
      box's own text. Deliberately separate from the pre-existing
      `#bar-request-input`/`#bar-submit` dock and its `startRun` pipeline —
      I5 is where the two paths meet, not this step.
      `test/describeRequestUI.test.ts` (2), reading `index.html`'s own
      source (it is markup with an inline module script, not importable as
      an ES module — the same constraint `test/rendererStatic.test.ts` and
      `test/pickSelection.test.ts` already state and work around the same
      way): pins that the handler reads the real selection and calls
      `makeDescribeRequest`; pins that the result is written with
      `.textContent`, never `.innerHTML`. Mutation
      `describe-result-uses-textContent-not-innerHTML` (the exact mutation
      the ledger names — render with innerHTML) CAUGHT: `node
      scripts/_mutcheck.mjs test/describeRequestUI.test.ts public/index.html
      test/mutations.json`.
      Live, not just simulated: a throwaway Playwright script
      (`_TO-DELETE/i4-visual-check/check-describe.mjs`, gitignored, kept per
      policy) picked a real on-plot address, typed
      `<img src=x onerror="window.__i4pwn=true">make this a tower` into the
      real box and clicked the real button. Measured directly: `.textContent`
      read back the dangerous string byte-for-byte as plain text;
      `.innerHTML` read back the BROWSER'S OWN escaped form
      (`&lt;img src=x ...&gt;`), proving the DOM stored it as a text node,
      never parsed as markup; `window.__i4pwn` was never set — the `onerror`
      handler never ran, because no `<img>` element was ever created.
      `npx tsc --noEmit`: clean. `npm test`: 886/886. `node
      scripts/shoot-app.mjs`: still clean, no new page errors, screenshot
      unchanged in kind. Default-world guard unaffected (no generation code
      touched).
- [x] **I5 — the request path, end to end. BUILT AND STUB-PROVEN; NEVER
      CALLED.** Evidence: `public/run-generate-request.js`'s
      `runGenerateRequest({ subject, want, request, land, caller, evaluate,
      THREE })` composes `assessTransform` (D3) → `buildGeometryPrompt` (D4)
      → **an INJECTED caller** → `verifyGeneratedGeometry`/`verifyModelSource`
      (D4). The caller is dependency-injected, not imported: production
      passes `public/model-caller.js`'s `productionModelCaller`, tests pass a
      stub — the whole path is provable at $0. `productionModelCaller`
      itself throws immediately rather than attempting a call, because
      `public/*.js` has nowhere authorised to send a prompt yet (the same gap
      G1 found from the other side: "`public/*.js` never imports from
      `src/*.ts`") — a caller that cannot structurally spend money is the
      safest thing to ship before that route exists and is reviewed.
      **Decision, close and reversible, noted rather than silently made:**
      building a real `fetch`-based caller pointing at a not-yet-existing
      Worker route was considered and rejected in favour of the throwing
      placeholder — a caller that cannot spend is safer to leave in a
      codebase nobody has reviewed than one that would 404. Reversible in one
      line once a real route exists.
      `test/runGenerateRequest.test.ts` (3):
      1. **THE MONEY GUARD**, checked by call COUNT, not outcome: a cruise
         ship assessed against 3 m of harbour water is refused by
         `assessTransform` before a prompt is built, and the stub caller's
         call count is asserted `0` — an outcome-only assertion would have
         passed whether or not the caller was ever invoked, which is
         precisely the gap the instruction named as already having shipped
         a broken feature once, elsewhere, tonight.
      2. **The positive case**: a stubbed VALID response (a real,
         hand-written `createGeometry` source, honouring the requested
         footprint) verifies clean, and the stub was called exactly once —
         proving a good answer is found and usable, not only that bad ones
         are refused (every D-phase test before this one only ever proved a
         refusal).
      3. **End to end, against the real generated plan, not a fixture**: the
         verified result is registered (`model-registry.js`), applied as a
         real "replace" layer (`apply-and-persist.js`) against a real
         plot id, persisted to a `memoryAdapter`-backed store, RELOADED
         (`worldFromJSON` — not just true in the same in-memory instance
         that wrote it, the exact gap D8's own undo test exists to catch),
         and resolved through I2's own `buildScenePlacements` +
         `resolveOverrideModels` — confirming the placement's resolved
         `model.geometry` is the SAME object the stub call produced. This is
         "reaches the scene," measured, not asserted from `verifyModelSource`
         alone.
      Mutations, both named before the tests were written:
      `runGenerateRequest-never-calls-caller-on-a-refused-prompt` (lets a
      refused transform reach the caller anyway) and
      `runGenerateRequest-verifies-what-the-caller-actually-returned`
      (verifies an empty string instead of the caller's real response) —
      both CAUGHT: `node scripts/_mutcheck.mjs test/runGenerateRequest.test.ts
      public/run-generate-request.js test/mutations.json`.
      `test/modelCaller.test.ts` (1) and mutation
      `productionModelCaller-refuses-rather-than-calling` (returns a fake
      geometry instead of throwing) CAUGHT, proving the placeholder's own
      refusal is real, not just documented.
      **`scripts/supervised-generate.mjs` is the exact command for Mark's
      supervised live call — written, tested, never executed by this
      session.** Four independent safety layers (its own header): it is a
      script nothing on the live page can reach; it refuses with no
      `ANTHROPIC_API_KEY`; it refuses without `--confirm`; it prints the
      real prompt and asks on the terminal for a final `y` before spending,
      unless `--yes` is also given. Manually verified safe end to end this
      session, without ever providing a real key: refuses cleanly with no
      key, refuses without `--confirm`, refuses on missing args, refuses a
      500×500 m "stadium" on a real plot before printing any prompt (ground
      not approved), and — the one path that reaches real code — builds and
      PRINTS a correct, real prompt against a real plot from the default
      seed, then aborts cleanly on `n` with nothing called. Automated in
      `test/supervisedGenerateScript.test.ts` (4, via `execFileSync` against
      the real script, no network): the no-key, no-confirm and bad-args
      refusals, plus the refused-transform-before-any-prompt check. Mutations
      `supervised-generate-refuses-without-api-key` and
      `supervised-generate-refuses-before-printing-a-prompt-for-a-refused-transform`
      CAUGHT.
      **THE COMMAND MARK RUNS:**
      ```
      ANTHROPIC_API_KEY=sk-... node scripts/supervised-generate.mjs \
        --address <a real plotId from the seed below> \
        --text "add a small shed" \
        --w 3 --d 3 \
        --seed default \
        --confirm
      ```
      **WHAT TO LOOK FOR**, in order: the printed PROMPT — confirm the
      footprint/support/clearance and `instructions` (your own text,
      verbatim) are what you expect for the plot named, before typing `y`
      at the confirmation; the RAW RESPONSE — read what the model actually
      wrote, unfiltered; the VERDICT — `ok: true` with a real triangle/vertex
      count means it passed determinism, footprint and compile checks
      against the SAME numbers the prompt asked for, never anything the
      response claimed about itself; the TOKEN USAGE block, printed last,
      from the API response's own usage field, not estimated. The script
      does not register, apply or persist anything — that join is already
      built and stub-proven above; wiring a real verified result through it
      live is a deliberate, separate, later step.
      `npx tsc --noEmit`: clean. `npm test`: 894/894 (886 plus these eight
      new tests). Default-world guard re-measured: unchanged. **No model was
      called by this session, at any point.**
      **Supervised first run.** Watch one end to end before anything is public.
- [ ] **I6 — apply, persist, undo, live.** `applyAndPersist` writes the layer
      through `world-store`; the scene updates without a rebuild; `undoLayer`
      removes it and the removal survives a reload.
      *Test:* a layer applied in the browser is present after a reload and absent
      after undo — driven through the page, not the module.
- [ ] **I7 — the quest completes from the live world.** `change-quest` reads
      `world.layers.touched()`.
      *Mutation:* complete on a UI flag → red. Already the single most important
      mutation in Phase E; now it runs against the real thing.
- [ ] **I8 — the deferred visual checks.** C1, C2 and D7 each deferred a Windows
      visual check to "when it is wired." It is wired. Run
      `node scripts/shoot-app.mjs`, look at the output, and record what you saw
      — including anything that looks wrong and is not yet a test.

---

### Phase J — THE PUBLIC SURFACE *(it is a portfolio piece; it must be read)*

UMAA Division 7 found CALIPER's central claim sitting at second 25 of a
30-second visit behind an 11.5px link. That was the highest-value change of that
session and it was not a technical defect.

- [ ] **J1 — one sentence, above the fold.** What this is, without overclaiming,
      readable on a phone.
      *Test:* `test/publicClaims.test.ts` pins it; a change to the sentence
      without a change to the test fails.
- [ ] **J2 — a refusal is visible on first paint.** Not a success reel. The most
      recent real refusal renders before any interaction.
      *Test:* the first-paint payload contains a refusal with its reason.
- [ ] **J3 — recorded runs are free, the live button is rationed.** Every real
      run is recorded and replayable at zero cost; the live path is per-IP capped
      with a daily ceiling; when the budget is spent it replays and **says so**.
      *Test:* with the budget exhausted, the page still works and states that it
      is replaying. *Mutation:* replay silently → that test red.
- [ ] **J4 — every number on the page is generated.** Extend
      `gen-test-count.mjs`'s discipline to every figure the page claims.
      *Test:* a hand-typed number in a claim span fails the build.

---

### Phase K — SECURITY AND SPEND *(before anything is public)*

Division 11 produced the two worst findings in CALIPER's entire audit — a
forgeable verdict and a scanner bypass — both defeating failure-floor invariants
that four technical passes had walked past. I5 opens a new public path. It gets
the same scrutiny.

- [ ] **K1 — the scope limit G1 could not build.** G1 recorded "Scope (one
      object)" as Undone because `public/*.js` and `src/*.ts` never touched.
      After I5 they do, so the limit now has an enforcement point.
      *Test:* a request naming two addresses is refused by the limit, not by
      chance. *Mutation:* hard-code the scope → the test names it.
- [ ] **K2 — G2, unblocked.** A second limits profile is now answerable because
      I5 gives real per-run cost figures. Measure one real run first, then set
      both profiles from measurement.
      *Test:* switching profile changes only values; the code path is identical
      under both.
- [ ] **K3 — a blind security audit of the new path.** Fresh agent, no history,
      given I5's route and the gates. Not told what you think is safe.
      Specifically: can a visitor cause spend beyond the cap; can generated code
      reach the Worker's environment; can one visitor's run affect another's; is
      any refusal forgeable from the client.
- [ ] **K4 — the abuse surface, stated.** Rate limits, retention, what is logged,
      what a visitor can trigger and what it costs at the worst case. Published,
      not just implemented.

---

### Phase L — THE ASSETS MERGE *(agy's lane, held all night)*

- [ ] **L1 — measure before merging.** From the assets checkout:
      `node scripts/check-layout-geometry.mjs`. LOD0 went from ~56–84 triangles
      to 140–696; main asserts `distinctTris < 200_000` against a current 27,608.
      The result may legitimately cross the ceiling.
      **If it crosses, that is a decision with a measured justification, not a
      number to quietly raise.**
- [ ] **L2 — merge by hand where both sides edited.** `test/mutations.json` and
      `docs/WORLD-BUILD-PLAN.md` are edited on both lanes. A clobber on the
      manifest silently drops controls.
      *Test:* after merge, every mutation id in the manifest is unique and the
      count is the sum of both lanes minus any deliberate removal, named.
- [ ] **L3 — the visual check agy could not run.** Enriched LOD0 geometry and
      the new vertex colours have never been seen in a real frame. This is the
      only outstanding item agy itself flagged.
- [ ] **L4 — re-measure everything the merge moved.** Triangle counts, variant
      counts, the page's figures, PART 0's ground truth. Each with its command.

---

### Phase M — SHIP

- [ ] **M1 — the full mutation suite, clean.** Use the scoped method
      (`_mutresolve` + `_mutcheck`), not `--all`. Zero SURVIVED, zero
      INCONCLUSIVE, and **every row carrying `measuredAt` and `method`** — a row
      without provenance is not a measured row.
- [ ] **M2 — the final blind UMAA audit**, across I–L, all twelve divisions, the
      four-state horizon answered. A division not audited is not a pass. Append
      what it missed to `AUDIT-PROTOCOL.md` §7 and anything the *work* missed to
      `docs/LESSONS.md`.
- [ ] **M3 — every claim traced.** Every number on the page, in `docs/`, and in
      the résumé's CALIPER section resolves to a command run that week. No
      exceptions and no rounding up.
- [ ] **M4 — deploy, then verify the live site matches the repo.** Page
      byte-identical to source, no stale figures, both admin routes closed,
      dynamic counts rendering live.
- [ ] **M5 — the résumé section, written from the measured figures.** Not before
      M3. CALIPER replaces what DATUM used to occupy, and it can be stated
      directly rather than hedged.

---

### The standing rule for I through M

Same as A through H, and it is the reason any of this is worth sending to
anyone: **name the mutation before writing the test; watch the test go red;
measure anything you claim, with the command beside it; and where something
cannot be verified, say so plainly rather than claiming it.**

A phase heading is not a finishing line. The work ends when every box above is
`[x]` with evidence or `[!]` with a reason.

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
