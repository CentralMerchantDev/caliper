# PHASE 1 — "TAKE IT ALL DOWN," THE FULL PLAN

Written before executing, per Mark's own instruction (2026-09-13, quoted in
`docs/specs/REBUILD-PLAN.md`'s CORRECTION block) and `rule://reviewer-independence`
("blind review before you act on anything ambiguous"). This plan is what
gets reviewed.

## CORRECTIONS from blind review, before execution

A fresh, context-free review of this plan (dispatched before anything moved)
found three real gaps, verified independently afterward:

1. **`piecesFromWorld` does NOT have zero callers.** Three scratch probe
   scripts — `scripts/_move-piece-probe.mjs`, `scripts/_isolate-probe.mjs`,
   `scripts/_board-adapter-probe.mjs` — each import `generateWorld`
   (city-plan.js), `piecesFromWorld`/`boardPiecesById` (board-adapter.js) and
   `planCity` (layout.js) to build a one-off old-world fixture, and are run
   via `execFileSync` at MODULE LOAD TIME by `test/movePiece.test.ts` (9
   tests), `test/isolate.test.ts` (12 tests) and `test/boardAdapter.test.ts`
   (13 tests) — all three fixtures load once per file and every test in the
   file reads the result. `board-adapter.js` is quarantined regardless (its
   own test's subject leaves with it — retire `boardAdapter.test.ts`
   entirely). But `move-piece.js` and `isolate.js` are KEPT files with real,
   independent logic — their tests' SUBJECT survives, only the fixture that
   feeds it dies. These two test files are **blocked, not retired**: named
   red, with a reason, pending Phase 2 supplying a real board to fixture
   against again. The three probe scripts themselves are `scripts/`, not
   `public/` or `src/`, so leaving their now-dangling imports in place does
   not violate the stated "done" bar — but it is recorded here so it is not
   rediscovered as a surprise.

2. **The "eleven tests, named in full" claim below understated the true
   count.** At least 19 more currently-passing test files import a
   quarantine target directly, independent of `createWorld()`: `cityJoin`,
   `cityConnectivity`, `cityRenderScenePlacements`, `cityWorld`,
   `describeRequest`, `facadeVariants`, `layout`, `layoutGeometry`,
   `originStability`, `pickSelection`, `phaseDelta`, `planSeed`,
   `plotRoadOverlap`, `selection`, `setPieceRefusal`, `publicClaims`,
   `roadsFollowDensity`, `worldOccupancy`, `worldSpec`, `worldExtent`,
   `typologyFootprints`. Step 10 already retires every test whose subject
   left, so the PROCESS was never wrong — the claim to have named the full
   set in advance was. Corrected here rather than left standing.

3. **`test/terrainLandmassOwnership.test.ts`'s `KNOWN_STATIC_IMPORTERS`
   needs a second update**, the same shape as the one already made for
   `road-network.js` in the prior session: it hard-codes
   `test/cityConnectivity.test.ts`, `test/cityWorld.test.ts`,
   `test/worldAliasing.test.ts`, `test/worldSpec.test.ts` as known
   `LANDMASSES` importers. Once those test files are retired (their subject
   is `city-plan.js`/`city-render.js` behaviour), the scan shrinks and the
   list must shrink with it, in the same commit, exactly as that test's own
   error message instructs.

4. **`public/city-live-world.js`** (imported only by `city.html`) becomes
   orphaned once `city.html` quarantines. Added to the quarantine list below
   — it "serves only" the page that is leaving.

## What quarantines (Tier 2, `_TO-DELETE/old-world/`)

`public/city-render.js`, `public/layout.js`, `public/instance-groups.js`,
`public/layout-fits.js` (serves only city-render.js), `public/city-plan.js`,
`public/city.html` (its entire body is `buildWorld()` from city-render.js;
cannot function once that import fails), `public/city-live-world.js` (serves
only city.html), `public/board-adapter.js` (its one real call site inside
`world-render-3d.js`'s `_buildCityBase` uses `city.world` — old-world data;
its own test, `test/boardAdapter.test.ts`, retires with it).

`public/plan-preview.html` is not quarantined — it is a redirect stub whose
only job is forwarding a bookmarked URL. Its target (`/city.html`) is
leaving, so its redirect is repointed to `/` instead. Not "porting the old
renderer" — fixing a link so it does not 404.

## What does NOT quarantine, and needs a surgical edit instead

Four files import something from `city-plan.js` and are not old-world-only
themselves — each import is being cut, not the file:

1. **`public/terrain.js`** — imports `WORLD` (a pure constant object: `SIZE`,
   `HORIZON`, `SEA_SPAN`, `ABYSS_SPAN`, `GROUND_SPAN`,
   `APRON_STEP_MULTIPLE` — six literals, `SIZE` is `40000 * WORLD_SCALE`,
   nothing generated). Re-pointed to a new copy in `public/world-scale.js`
   (verbatim values, not reinvented — `world-scale.js` already owns
   `WORLD_SCALE` and is fully independent of the old world).

2. **`public/world-render-3d.js`** — imports `WORLD` the same way (repointed
   the same way) and `boardPiecesById` from `board-adapter.js` (removed
   entirely — its one call site is inside `_buildCityBase`, below). Also
   contains the dynamic `import("./city-render.js")` the original blind
   review found, and a second dynamic import of `spatial-index.js` — both
   inside `_buildCityBase`, both going with it.

3. **`public/buildings.js`** — imports `PLOT_CLASSES` (a pure static table:
   footprint min/max and max height per typology, no generated content).
   Moved verbatim into `buildings.js` itself as a local constant — it is the
   only remaining consumer.

4. **`public/world.js`** — imports `generateWorld`, and calls it
   unconditionally inside `createWorld()` to build the `plan` field. This is
   the one edit with real, wide consequences, below.

## The consequence that needs stating plainly, not discovering later

`createWorld()` composes four things: `generateWorld` (city-plan.js, leaving),
`LandField`/`makeHeightAt` (terrain.js, staying), `createWorldModel`
(world-model.js, staying), `createGrid` (grid.js, staying). It is Side B's
own "give me a world to edit" entry point, and it is not old-world-only
architecture — the layer/undo/apply-persist system it feeds is generic and
explicitly named as working, kept infrastructure.

**But its current fixture data is the old world, and nothing else produces
a `plan` today.** Once `generateWorld` is cut, `createWorld()` cannot build
a real `plan` — Phase 2.7 is what builds the next thing that can, and Phase 1
builds nothing. The honest fix is not a replacement generator (forbidden,
same reasoning as everything else here) — it is to stop calling
`generateWorld()` and return `plan: null`, documented as dormant.

**Eleven test files call `createWorld()` directly** (`applyAndPersist`,
`applyLayers`, `cityRenderWorldState`, `instanceGroups`, `questCompletion`,
`regions`, `runGenerateRequest`, `undo`, `world`, `worldAliasing`,
`worldStore`), **and at least 19 more import a quarantine target
independently** — the blind review caught this undercount before execution;
see the CORRECTIONS section above for the full second list. All thirty-plus
are Side B's and the shell's own test surface, not incidental collateral,
and are the single largest consequence of this takedown. Named as a set
here; each one gets its own name and reason at step 10, not assumed covered
by this paragraph.

This is offered as the plan, not decided unilaterally: `world.js` is edited
(the import cut, `plan: null` returned, dormant and documented), and every
one of the eleven tests is checked individually afterward — retired by name
if its entire subject was the old plan, kept if it asserts something that
survives `plan: null` (e.g. a pure layer-model property).

## What goes dormant in the shell (to record, not fix)

- `_buildCityBase` (world-render-3d.js) — the entire old-world city boot,
  including the parts that also built the shell's OWN picking spatial index
  (`this._index`) and selection (`this._selection`) via `city.world`, and the
  parts that drew the real committed board (`board.generated.json`) via
  `board-adapter.js`/`board-render.js`. None of it ran independently of the
  old world's data shape. Replaced with a documented stub that throws if
  ever called (it will not be — nothing sets `city: true` once `index.html`
  is a holding page).
- Every other `this._cityMode` branch in `world-render-3d.js` (~30 of them,
  camera distance/bounds, lighting exposure, fog, day-night) is left
  UNTOUCHED. `_cityMode` is now permanently `false` (nothing constructs the
  renderer with `city: true`), so each one already evaluates its non-city
  branch — which is the file's own pre-existing, independent "village"
  default, not old-world code. No edit needed or made.
- The inspector/describe-request UI in `index.html` reads `this._index` for
  an address to write a change request against. Gone with `_buildCityBase`.
  Recorded so Phase 2 knows a new board needs its own addressing wired the
  same way.

## `index.html`

Replaced entirely with a minimal, honest holding page: no `WorldRenderer`,
no panels, no inspector, no describe/apply UI. States that the world is
being rebuilt. Nothing from the old page is ported in, per the instruction.

## Order of execution (innermost first)

1. Extract `WORLD` into `world-scale.js`; extract `PLOT_CLASSES` into
   `buildings.js`. Repoint `terrain.js`, `world-render-3d.js`, `buildings.js`.
   Suite check.
2. Cut `world.js`'s `generateWorld` import; `plan: null`. Suite check —
   expect the `createWorld()`-dependent tests to go red, named individually
   afterward (retired or blocked, per each one's own subject).
3. Neutralize `world-render-3d.js`'s `_buildCityBase` and its
   `board-adapter.js` import. Suite check.
4. Quarantine `instance-groups.js`, `layout-fits.js`, `layout.js` (leaves
   first — nothing but `city-render.js` imports them). Suite check.
5. Quarantine `city-render.js`. Suite check.
6. Quarantine `city-plan.js`. Update `test/terrainLandmassOwnership.test.ts`'s
   `KNOWN_STATIC_IMPORTERS` in the SAME commit (per the CORRECTIONS section
   above) once the test files it names are retired, not before — the list
   must match the tree at each commit, not jump ahead of it. Suite check.
7. Quarantine `board-adapter.js` and `city-live-world.js`. Suite check.
8. Quarantine `city.html`; repoint `plan-preview.html`'s redirect to `/`.
   Suite check.
9. Replace `index.html` with the holding page. Suite check.
10. Retire every test whose SUBJECT left (by name, with its reason) and mark
    BLOCKED — not retired — every test whose subject survives but whose
    fixture died (`test/movePiece.test.ts`, `test/isolate.test.ts`, per the
    CORRECTIONS section). Full suite run. Record what is red and why in one
    place.

## Questions for the blind review

- Is any file above wrongly classified — something marked "quarantine" that
  a live, kept path still needs, or something marked "surgical edit only"
  that should actually be quarantined wholesale?
- Is the `world.js` fix (cut the import, `plan: null`) the right shape, or
  is there a better minimal fix that does not require inventing generation
  logic?
- Is there another dynamic-import edge, anywhere in `public/` or `src/`,
  reaching any of the six quarantine targets, that static analysis and this
  plan's own manual grep both missed?
