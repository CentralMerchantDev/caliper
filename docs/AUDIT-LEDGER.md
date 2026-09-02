# Audit ledger

Append-only. One row per finding. A finding is only CLOSED with evidence — a
test that fails when the fix is reverted, or a measurement.

**Status key:** `OPEN` · `FIXED` (with mutation evidence) · `CLAIM-CORRECTED`
(code was right, the claim drifted) · `WONTFIX` (with a reason) · `N/A` (verified
not actually a defect)

---

## Phase status

| Phase | Area | Status |
| --- | --- | --- |
| 1 | Known backlog | 11 of 16 done — 1.1, 1.2, 1.5, 1.8, 1.14 open |
| 2 | Pipeline (`src/`) | not started |
| 3 | World generator (`public/`) | not started |
| 4 | Renderer and UI | not started |
| 5 | The tests themselves | not started |
| 6 | Claims, docs, copy | not started |
| 7 | Security, cost, deploy | not started |

---

## Closed before this plan existed

Recorded so a later audit does not re-report them as new. All have tests.

| # | Finding | Status | Evidence |
| --- | --- | --- | --- |
| A1 | Block-ceiling test read the DECLARED class after zoning made it derived; 23 walkable 392 m blocks silently exempt | FIXED | test reads `world.settlements[].cls`; 0 offenders |
| A2 | Character derived without deriving SPACING — villas on 420 m farm grid | FIXED | `CHARACTER_SPACING`; spacing test |
| A3 | `gradeRun` returned after the earthworks pass — 222/1615 roads over class limit, freeway 13.55% | FIXED | ends on gradient pass; mutation fails the road test |
| A4 | Road grading had no test at all | FIXED | test over every real road; mutation-checked |
| A5 | `footprint.js` had no test; deleting its refusal left the suite green | FIXED | 4 tests; mutation fails 2 |
| A6 | `findSite` published `range: 0` for every feature (option never passed) | FIXED | measurement no longer skipped |
| A7 | Railway silently fell back to its literal instead of refusing | FIXED | `break railway` like every other feature |
| A8 | `placeFeatures` ran 3× per page load (~2.1 s of 3.3 s) | FIXED | memoised; 3.3 s → 2.68 s |
| A9 | Bridge-approach road ids carried unrounded floats | FIXED | 0 remain |
| A10 | Test count stale in 4 places with 4 different numbers | CLAIM-CORRECTED | all read 379 |
| A11 | "k=1 is a no-op and the whole suite passes" | CLAIM-CORRECTED | boundary identity still true; suite is not, and why |
| A12 | "No-overlap holds by construction" overstated at plot level | CLAIM-CORRECTED | 108 still dropped, 56 wet centres, stated |
| A13 | Footprint verdict table wrong in the brief | CLAIM-CORRECTED | measured: 67.0/29.1/2.3/1.6 |
| A14 | Test runner reported green on a suite that did not run | FIXED | builds all files first; verified by injected syntax error |

---

## Phase 1 — known backlog

| # | Finding | Severity | Status | Evidence |
| --- | --- | --- | --- | --- |
| 1.1 | `generateWorld` ~2.7 s synchronous before first paint | high | OPEN | |
| 1.2 | Street camera confined to 440×160 m box, uses *village* terrain in city mode | high | OPEN | |
| 1.3 | At `k=0.4` the port is unplaceable and every warehouse zone vanishes silently | high | FIXED | `zoningAnchors` on the world; at k=0.4 reports `missing:[containerPort], hasIndustry:false`. Test. |
| 1.4 | Silent `catch { return; }` reinstates the stale-bookmark bug it fixes | med | FIXED | logs and sets `_featureTargetsStale` instead of silently reverting |
| 1.5 | Placement/refusal stats written, never read on the main page | med | OPEN | |
| 1.6 | Dead imports across `public/` and `src/` | low | FIXED | 10 unused imports removed across city-plan, city-render, terrain; tsc clean |
| 1.7 | `driveableRun` dead, and drops the `cls` it was given | low | FIXED | `driveableRun` deleted — dead, and would have applied the 0.13 fallback instead of the per-class ceiling if revived |
| 1.8 | `findQuay`'s `along` permanently `"ew"`; N–S branches unreachable | low | OPEN | |
| 1.9 | Airport fence declared twice with different numbers | med | FIXED | fence derived from the manifest footprint; one declaration |
| 1.10 | `WORLD.SIZE` does not scale; page says both 31 km and 40 km | med | FIXED | `WORLD.SIZE` scales — 40 km → 26 km at k=0.65 |
| 1.11 | `citySummary` tells the model the superseded 0.13 slope rule | med | FIXED | grounding text states per-class gradients; regenerated |
| 1.12 | `world-scale.js` header predicts 32.0% settled, measured 29.2% | low | CLAIM-CORRECTED | formula stated as an upper bound, measured 29.2% recorded |
| 1.13 | Tests re-derive the feature manifest instead of importing `FEATURES` | med | FIXED | airport and railway tests read `FEATURES` instead of re-typing it |
| 1.14 | `placementLayout.test.ts` asserts on source text, incl. a comment | med | OPEN | |
| 1.15 | Airport-platform test too coarse to see water in the platform | high | FIXED | **found a real defect** — the platform had water in it. `findFlattestSite` now vets every sampled point, not 9; airport footprint set to its real 3500×1000 extent; 0/11,041 points below the waterline |
| 1.16 | "Railway runs on land" test probes a line the railway is not on | high | FIXED | test probes the resolved corridor and uses the manifest's own 0.85 threshold |
