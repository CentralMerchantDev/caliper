# Phase 4 — Renderer and UI: audit findings

Produced by three context-free auditors run in parallel over `world-render-3d.js`
(7,240 lines), `city-render.js` + `buildings.js` (2,745), and `index.html` +
`city.html` (4,141). Each finding was required to carry line numbers, a
consequence, and evidence; several were verified by executing the real modules
in Node.

Status values: FIXED / WONTFIX (with reason) / OPEN.

**Ordering principle for the fixes:** anything that produces a FALSE CLAIM or a
FALSE SUCCESS outranks anything that is merely waste, because this project's one
claim is that it only says yes when yes is true.

---

## A. `world-render-3d.js`

| # | Finding | Sev | Status |
|---|---------|-----|--------|
| A1 | `parseHexColor` undefined — every colour change threw out of the reconcile loop | HIGH | **FIXED** |
| A2 | Recolour predicate `!emissiveIntensity` can never match (three.js defaults it to 1), and `record.colour` was written anyway — a no-op that cached success | HIGH | **FIXED** |
| A3 | `_reconcilePlacements` used the VILLAGE transform on city metres — every outdoor placement drawn at 6×/4.5× | HIGH | **FIXED** |
| A4 | An update moving a placement to an unresolvable `location` silently leaves the old mesh; indoor placements in city mode never render and report nothing | HIGH | OPEN |
| A5 | `window` `blur` listener never removed — holds scene + WebGL renderer after `destroy()` | HIGH | **FIXED** |
| A6 | `this.moonLight` typo (property is `_moonLight`) — village moon stays in the city scene | MED-HIGH | **FIXED** |
| A7 | Starfield, 18 cloud clusters, 28 fireflies, village smoke never removed in city mode; clouds intersect 220 m towers and the pick raycast can hit one and report a confident ground address | MED-HIGH | **FIXED** |
| A8 | `toggleGrid`, `toggleRoofs`, `startDroneTour` do nothing in city mode and each returns a success value | MED-HIGH | OPEN |
| A9 | Focus on a picked city plot falls through to `resetView()`; `focusDistrict` writes four village NPC names into the inspector | MED-HIGH | OPEN |
| A10 | `_featureTargetsStale` written by both branches, read by nothing | MED | OPEN |
| A11 | `_skyUniforms` still points at the removed village sky — city sky never responds to the day/night cycle | MED | OPEN |
| A12 | `_cityDefaultCamera` (scaled) is dead; Reset uses unscaled 4200/900 against an opening shot at 2730/585 | MED | OPEN |
| A13 | Fly-mode vertical dead over ground above ~278 m (village 280 m ceiling, 1,620 m range) | MED | OPEN |
| A14 | `updateSkyGradient` re-uploads a texture to the GPU every frame; unused in city mode | MED | OPEN |
| A15 | `_knownPlacementKeys` never pruned — re-added placement loses its "new" affordance and spatial diff mislabels it | MED | OPEN |
| A16 | Duplicate placement ids collapse two objects into one silently | MED | OPEN |
| A17 | `_triggerDustRing` shares one geometry across 16 meshes and disposes it 16× | LOW-MED | OPEN |
| A18 | Texture loads have no `onError` — a 404 degrades to untextured with no signal (village only) | LOW-MED | OPEN |
| A19 | Composer fallback drops bloom/vignette with no on-page label, unlike the WebGL fallback | LOW | OPEN |

## B. `city-render.js` / `buildings.js`

| # | Finding | Sev | Status |
|---|---------|-----|--------|
| B1 | `buildProps` read `stats` above its own `const` — TDZ ReferenceError on EVERY call, taking the whole world build down on every page load | HIGH | **FIXED** |
| B2 | Env-map guard reads a half-float target with a `Float32Array`, so `lum` is always 0 and the map is always discarded; `rt` leaked on the failure path | HIGH | OPEN |
| B3 | `bridgeProfile` is parameterised by the along-span coordinate but called with the cross-axis one — 7 EW bridge decks are flat at a wrong constant height, detached from their own piers. Same bug in traffic. | HIGH | OPEN |
| B4 | The hardcoded `downtown` entry in `SETT` describes ground downtown is not on (measured z [599,2571] vs literal [-720,575]) — 80 of 82 TOWER plots height-scaled to ~46%, no street furniture downtown | HIGH | OPEN |
| B5 | 28 `beach-*` settlements (10,282 plots, 53% of the world) are absent from `SETT` — no centrality taper, no ground tint, palms planted through buildings | HIGH | OPEN |
| B6 | `terrace` foundation stacks concentric boxes wider than the building and puts the body at the LOWEST step — 367 plots, grey stack taller than the building on 54 | HIGH | OPEN |
| B7 | `gradeRun` reports `maxFill`/`maxCut`/`overBudget`; nothing builds the earthworks and nothing reads the measurement. 167 roads over their own budget, worst 44.6 m of fill — tarmac in mid-air. Railway *publishes* the figures and draws no formation. | HIGH | OPEN |
| B8 | Golf course: one height sample, 1,520 m disc drawn flat — the airport's documented defect, unfixed, on a bigger footprint. Site carries `range: 107.59` and it is ignored. | HIGH | OPEN |
| B9 | Airport apron overhangs the vetted platform by 110 m; one aircraft row sits 70 m beyond it | MED | OPEN |
| B10 | 2 of 4 airport embankment skirts wound inside-out — invisible with `FrontSide` | MED | OPEN |
| B11 | `PLOT_CLASSES.maxHeight` applied, then multiplied by up to 1.36× — 1,362 buildings exceed their own class cap | MED | OPEN |
| B12 | Contact shadows drawn for 205 refused plots and 867 at >1 m from the real base; 90 garden trees on refused plots | MED | OPEN |
| B13 | Boardwalk, container yard, park lawns, marina, pier all still draped or flat-sampled; `GRADE.PLAZA`/`FOOTWAY` imported and unused | MED | OPEN |
| B14 | ~700 loose meshes against a header claiming "about thirty draw calls" and "nothing is a loose Mesh"; `M()` allocates a fresh material per call | MED | OPEN |
| B15 | Stale measured numbers in comments (185k vertices → 266,774; 64k parts → 87,546; core step 40 m → 32.5 m; pier 580 m → 377 m) | MED | OPEN |
| B16 | `PIER` half-scaled: length scales, width/pavilion/piling spacing do not. Same shape for `MARINA.r`. | MED | OPEN |
| B17 | Per-build waste: `occupied()` linear scan of 1,374 plots per candidate; `SETT.find()` per plot; trees sample terrain twice; unused instance capacity; dead `core` computation | MED | OPEN |
| B18 | Dead code + a false guarantee in a comment (`wm` IS shadowed at line 558); unreachable `quayZ` guard; empty conditional; mast literal fallback | LOW | OPEN |

## C. `index.html` / `city.html`

| # | Finding | Sev | Status |
|---|---------|-----|--------|
| C1 | The world is 26 km. The page says 40 km twice and 31 km once. | HIGH | **FIXED** |
| C2 | `WORLDKM()` returns a hardcoded 40 — a literal wearing a function call's costume | HIGH | **FIXED** |
| C3 | Hardcoded 57 settlements (real 54) and 31,000 buildings (unreachable — max is 19,481, one per plot). These stand as the final answer on the no-WebGL path. | HIGH | **FIXED** |
| C4 | "379 Node tests" — real number 416. Third consecutive staleness of a sentence that boasts about not going stale. | HIGH | **FIXED** |
| C5 | Architecture modal describes a four-stage pipeline with "Solve" and "Mutate" stages that do not exist, and omits Verify and Review — the two the thesis rests on | HIGH | **FIXED** |
| C6 | `verified` renders the bare word "Verified" when `fatalError` means verification did not run — the exact defect the server fixed, moved to the client | HIGH | **FIXED** |
| C7 | The `warning` event ("shipped, but the read mirror did not update") has no client listener — renders as "✓ Shipped — the change is live" | HIGH | **FIXED** |
| C8 | On a clean run the cross-vendor review is invisible: `reviewing`/`reviewed`/`fixing`/`fixed`/`stopped` have no listeners | HIGH | **FIXED** |
| C9 | No-WebGL path leaves the opaque "BUILDING THE CITY" panel over the viewport permanently | HIGH | **FIXED** |
| C10 | `city.html` context-loss handler writes into `#load`, which is unconditionally removed at boot — the black canvas it exists to explain still happens | HIGH | **FIXED** |
| C11 | All four live gate cards `innerHTML`-overwrite their own heading before paint; the replay keeps its titles, so the recording looks more complete than a real run | HIGH | **FIXED** |
| C12 | A failed gate decision uses `innerHTML +=`, re-parsing the card and destroying the Approve/Reject listeners — enabled buttons that do nothing | HIGH | **FIXED** |
| C13 | "Edge V8 Isolate Active" asserted from `/pipeline-budget`, which says nothing about the sandbox; `/live-status` computes `sandboxAvailable` and the client discards it | MED | **FIXED** |
| C14 | Stage tracker off by one during grounding; start/end semantics mixed across handlers | MED | OPEN |
| C15 | A refused run leaves a stage lit as still running | MED | **FIXED** |
| C16 | Mobile: status card lands exactly on the welcome card; the overlap suite cannot catch it (selector omitted + `dismissOverlays` closes it first) | MED | **FIXED** |
| C17 | `city.html`: `#tip` and `#home` pinned to the same corner | MED | **FIXED** |
| C18 | `city.html`: `#livequarter` has no position rule — renders over `#hud` | MED | **FIXED** |
| C19 | The three most important text inputs have no accessible name | MED | **FIXED** |
| C20 | Pipeline stage state is colour-only with no live region | MED | **FIXED** |
| C21 | Dead tour-mode selector; `#grid-cell-coords` at `z-index:900` draws over modals | LOW | OPEN |
| C22 | Three variables assigned and never read | LOW | OPEN |
| C23 | `#city-build-notes` is a `<div>` inside a `<span>`, mid-sentence | LOW | OPEN |
| C24 | Double-escaped stage titles | LOW | OPEN |

## Checked and CORRECT (recorded so they are not re-litigated)

- Spend caps $2/$7/$20, model names, `maxlength=500`, "32 benchmark tasks",
  "225 of the 387", Gate 2 never auto-approves, `MAX_PLAN_REPLIES = 4`.
- All 92 `getElementById` references resolve; no duplicate static ids.
- **No visitor-text XSS.** `esc()` is applied on every path carrying model or
  server text into `innerHTML`; visitor input is never echoed into HTML.
- `src/citySummary.generated.ts` is current, not stale.
- Modal focus management (inert, focus restore, Tab trap) works.
- No LOD system exists in `world-render-3d.js`, so there is no stale LOD distance.
