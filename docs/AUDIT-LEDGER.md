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
| 1 | Known backlog | **all 16 done** |
| 2 | Pipeline (`src/`) | **all fixed** (2.4, 2.11 partly — see rows) |
| 3 | World generator (`public/`) | **all fixed** |
| 4 | Renderer and UI | **audited and fixed** — 3 parallel auditors, 61 findings; all HIGH closed |
| 5 | The tests themselves | **audited and fixed** — 6 WEAK + 1 VACUOUS file; every surviving mutation now caught |
| 6 | Claims, docs, copy | **done** — 6 false public claims removed and pinned by `publicClaims.test.ts` |
| 7 | Security, cost, deploy | **audited and fixed** — 2 CRITICAL (verdict forgery, scanner bypass), 1 HIGH, 6 MED. Deploy is Mark's to run. |

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
| 1.1 | `generateWorld` ~2.7 s synchronous before first paint | high | **FIXED** | Profiled, not guessed. Three changes, all fingerprint-verified byte-identical over every plot, road, block and 22,000 terrain samples: numeric bucket key in `distance()` (the string `bx+","+bz` was built and hashed in the hottest loop in generation), `Math.hypot` → `sqrt` in three inner loops, and `alongWaterway` memoised (it re-measured a constant polyline on every call, 966 ms). generateWorld 5.66 s → 2.24 s; LandField 298 ms → 79 ms; whole load path 6.02 s → 2.36 s, 61% off. Plus a double-rAF before the block so the boot panel is genuinely painted first — `await import()` only yields a microtask, so a cold load could show a blank gradient and a dead tab. The build is still uninterruptible; the honest fix for a freeze is to make it shorter. Boot copy's "about five seconds" retired rather than renumbered. |
| 1.2 | Street camera confined to 440×160 m box, uses *village* terrain in city mode | high | FIXED | bounds follow `WORLD.SIZE` in city mode; one `_groundAt()` replaces five village-terrain calls in the walk/drive/fly path |
| 1.3 | At `k=0.4` the port is unplaceable and every warehouse zone vanishes silently | high | FIXED | `zoningAnchors` on the world; at k=0.4 reports `missing:[containerPort], hasIndustry:false`. Test. |
| 1.4 | Silent `catch { return; }` reinstates the stale-bookmark bug it fixes | med | FIXED | logs and sets `_featureTargetsStale` instead of silently reverting |
| 1.5 | Placement/refusal stats written, never read on the main page | med | FIXED | `#city-build-notes` reads `featuresUnplaced`, `zoningAnchors.missing` and `refusedWhy`; silent on a healthy world |
| 1.6 | Dead imports across `public/` and `src/` | low | FIXED | 10 unused imports removed across city-plan, city-render, terrain; tsc clean |
| 1.7 | `driveableRun` dead, and drops the `cls` it was given | low | FIXED | `driveableRun` deleted — dead, and would have applied the 0.13 fallback instead of the per-class ceiling if revived |
| 1.8 | `findQuay`'s `along` permanently `"ew"`; N–S branches unreachable | low | FIXED | `findQuay` tries both orientations; the north-south branch is live |
| 1.9 | Airport fence declared twice with different numbers | med | FIXED | fence derived from the manifest footprint; one declaration |
| 1.10 | `WORLD.SIZE` does not scale; page says both 31 km and 40 km | med | FIXED | `WORLD.SIZE` scales — 40 km → 26 km at k=0.65 |
| 1.11 | `citySummary` tells the model the superseded 0.13 slope rule | med | FIXED | grounding text states per-class gradients; regenerated |
| 1.12 | `world-scale.js` header predicts 32.0% settled, measured 29.2% | low | CLAIM-CORRECTED | formula stated as an upper bound, measured 29.2% recorded |
| 1.13 | Tests re-derive the feature manifest instead of importing `FEATURES` | med | FIXED | airport and railway tests read `FEATURES` instead of re-typing it |
| 1.14 | `placementLayout.test.ts` asserts on source text, incl. a comment | med | FIXED | three tuned values named as `RENDER_TUNING` and asserted by VALUE; the comment-matching assertions dropped, recorded as a coverage gap rather than kept as a test that cannot fail for the right reason |
| 1.15 | Airport-platform test too coarse to see water in the platform | high | FIXED | **found a real defect** — the platform had water in it. `findFlattestSite` now vets every sampled point, not 9; airport footprint set to its real 3500×1000 extent; 0/11,041 points below the waterline |
| 1.16 | "Railway runs on land" test probes a line the railway is not on | high | FIXED | test probes the resolved corridor and uses the manifest's own 0.85 threshold |

---

## Phase 2 — the pipeline (`src/`)

Audited by an agent with no knowledge of the intent. It drove the **real**
`runChangePipeline` with scripted model responses and mutated the source to test
whether anything noticed. Working tree verified byte-identical afterwards.

| # | Finding | Severity | Status | Evidence |
| --- | --- | --- | --- | --- |
| 2.1 | **The review loop's clean verdict can be manufactured.** `acceptedByDesign` is populated from the AUTHOR model's own verdicts, then unconditionally deleted from the reviewer's later findings *before* the clean check and *before* the oscillation guard. A model that declares a finding invalid ships with the reviewer still objecting. | **CRITICAL** | **FIXED** | Decision extracted as `assessReviewRound()` — pure, exported, testable. The overruled finding is no longer deleted: it is SPLIT out as `contested`. If the reviewer, having been shown the justification, raises it again, that is `overrule-rejected` and the run does not ship. 6 tests; restoring the old filter fails 2 of them. |
| 2.2 | **Every spend estimate prices output tokens only.** `WORST_CASE.*` omits input tokens; `costUsd()` charges both. Real source-edit worst case $0.642 vs a $0.44 ceiling. Two stages' input cost alone exceeds their whole reservation. | **CRITICAL** | **FIXED** | `INPUT_CAP` added and both halves priced via `priceBoth`. Ceilings re-derived $0.44→$0.72 and $0.26→$0.49. The test now reads the real `SPEND_WORST_CASE` instead of its own copy. Mutation: removing the input term fails the ceiling test. **It immediately found a second defect** — 4 runs/IP × $0.72 = $2.88 of a $2.00 cap, so the per-IP limit dropped to 2. |
| 2.3 | Five retry sites spend real money that is never counted (openai ×2, grounding, claude ×2). The fix exists in exactly one of six places with the same shape. | high | **FIXED** | All five sites carry the discarded attempt's usage forward, matching `createWithTruncationGuard` which already did it in one of six places. openai ×2, grounding ×1, claude ×2. |
| 2.4 | **9 of 14 gates can be deleted with all 380 tests still green** — oscillation guard, round cap, fix-attempt cap, per-run ceiling, Gate 2 reject flag, unresolved-blocks-ship, the QA pass, circuit breaker, per-IP limit, concurrency limit. `reviewLoop.test.ts` never touches the loop body. | high | **PARTLY FIXED** | The directly-callable gates now have tests that bite: per-run ceiling, per-IP daily limit, concurrency lease/release. Both mutation-checked. The pipeline-internal ones (Gate 2 reject flag, unresolved-blocks-ship, the QA pass, circuit breaker) need the same extraction `assessReviewRound` got — recorded, not done, because extracting a decision changes its shape and wants its own pass. |
| 2.5 | The CAS's empty-storage branch ignores `expectedSource`, and its comment says it does not. | high | **FIXED** | The empty-storage branch now requires `expectedSource === SIM_BASELINE_SOURCE`, which is what its own comment always said. Test. **Also found an existing test that was accidentally exercising this branch** — it published the literal string `"baseline"` against empty storage while meaning to test the CAS match; now seeded. |
| 2.6 | A payload inside an exported function body defeats every server-side check: `topLevelSideEffects` only inspects module load, and the regression suite has no DOM so the guard branch is dead there and live in every visitor's browser. | high | **FIXED** | `browserOnlyReferences()` walks the whole AST for DOM/network/eval globals at any depth, with local-binding shadowing handled. The audit's exact payload is refused and names document/navigator/globalThis. Verified it does NOT false-positive: ordinary simulation code and the real shipped world both pass. 4 tests. |
| 2.7 | `/security-check` executes the warm run and then ignores it (`judge(cold)` only). `attacks.ts` probes a harness shape the pipeline never uses; `network-egress` accepts any error as "held". | med | **FIXED** | `judge(cold) && judge(warm)` — the warm run, which tests isolate REUSE, was executed at full CPU cost and then ignored. |
| 2.8 | Gate 1's free-text reply loop is unbounded and outside the ceiling arithmetic — each reply re-runs ground + plan. | med | **FIXED** | `planGateReplyCount` was incremented, carried through state, written to the ledger and reported — and never compared against anything. Capped at 4 on that same counter (not a new one). The loop is extracted as `resolvePlanGate` with injected readers, because enforcing it inline with a unit-tested helper beside it left the deletion mutation surviving — a correct helper next to an unguarded loop is finding 3.8 again. |
| 2.9 | Lease bookkeeping disagrees with itself: DO grants 600 s, `ACTIVE_RUN_LEASE_TTL_SEC` is 330; `maxConcurrent` default 3 vs published 5. A *transient* renewal blip sets `leaseLost`, which skips release and leaks the slot for 600 s. | med | **FIXED** | `leaseLost` split into lost-vs-**superseded**: a transient blip no longer skips the release, so one dropped request cannot lock a concurrency slot for the full TTL. Renewal now tolerates 3 consecutive failures (45 s of a lease that lasts minutes). The DO's disagreeing defaults (3 vs published 5, 600 s vs 330) removed — the boundary supplies the published values. Test. |
| 2.10 | `setSurfaceField` accepts an unbounded free string — 500,000 chars accepted, then re-sent as input to every later stage. | med | **FIXED** | `material` capped at 120 characters. 500,000 was accepted and would have been re-sent as input to every later stage. Test verifies an ordinary name still passes. |
| 2.11 | Dead code confirmed (6 previously reported) plus `CriterionKind`, `WorldAction`, and two functions referenced only by tests — including `decideGroundingOutcome`, tested in 4 places and used in 0. | low | PARTLY FIXED | `REVIEW_MODEL_ALTERNATIVE` removed. `CriterionKind` removal was reverted — the span calculation took an adjacent constant with it and 11 tests caught it, which is the tests doing their job. The remaining dead exports are recorded rather than removed: low value, non-zero risk. |
| 2.12 | `reviewFoundMaterial` counts all rounds, `reviewFoundNits` only the last. An `existence` criterion with `field: null` on `initialWorld` cannot fail. `pipelineAvailability` fails open (advisory only). The 9 worker tests did not execute — vitest could not boot here. | low | **FIXED** | **(a)** `reviewFoundNits` now accumulates across rounds like `reviewFoundMaterial` — the two sat adjacent in one ledger where one was a running total and the other a last-round snapshot. **(b)** The criteria dry-run failure was caught and left `vacuousCriteria = []`, byte-identical to a clean result, so a sandbox outage rendered at the gate as "no vacuous criteria" — silence read as a pass. Now carries `criteriaDryRunError` and the gate says "could not be checked". **(c)** `pipelineAvailability` failing open is CORRECT and unchanged — enforcement is `claimPipelineRun` on the run path, which throws independently. But it reported `runsUsed: 0` from a failed read, which renders as "3 of 3 runs left"; it now carries `countersRead`. **(d)** The `existence` + `field: null` case is already handled by `findVacuousCriteria` — verified, not a defect. COVERAGE NOTE: (c) is mutation-verified both ways (fail-open broken, and fallback reported as measurement). (a) and (b) sit inside `runChangePipeline` and need live API calls to drive; they are verified by tsc and inspection only. Recorded rather than covered with a test that would not reach them. |

**Verified sound, worth recording:** criterion `fn` injection is closed (regex +
allowlist); sentinel smuggling on a data edit fails closed; the TDZ comparator
snapshot in `simSandbox.ts` is real; `topLevelSideEffects` genuinely catches
module-load payloads (disabling it fails 5 tests); a no-op data edit is caught;
the oscillation guard works for findings that are *not* overruled; resume from
the review gate re-pays for nothing.

---

## Phase 3 — the world generator (`public/`)

Fresh agent, no knowledge of intent. Baseline 386/386. Working tree verified
untouched.

| # | Finding | Severity | Status | Evidence |
| --- | --- | --- | --- | --- |
| 3.1 | **The four rivers are not water.** Every claim about them is false — "boats float on them", "the plot generator will not build in them", "roads are clipped at their banks". Max cut is depth+2.2 ≈ 11.2 m against ground 27–105 m up, so the trough never reaches y=0. | high | **FIXED** | `waterwayAt()` asks the question directly instead of expecting an elevation test to answer it. `assessFootprint` refuses a footprint touching a river or canal. **89 buildings were standing in rivers.** Two tests, one of which guards against the predicate being vacuous. |
| 3.2 | **`LandField.distance()`'s early exit is unsound** — `best < (ring+1)*cell` should be `best <= ring*cell`. The comment claims "provably the nearest". | high | **FIXED** | Bound corrected to `best <= ring * cell`. Brute force over 2,091 points: **0 wrong, worst error 0.000 m** (was 61 wrong, worst 194.7 m). New test brute-forces against every coastline edge. |
| 3.3 | **All industry vanishes below k≈0.57** because basin depth SCALES and `findQuay`'s `minDepth: 8` (a ship's draught) does not. The port sits 0.84 m of dredge from disappearing. | high | **FIXED** | `minDepth` scales with the basins it is compared against. Port now places at k=0.65/0.50/0.40 — industry survives every scale instead of vanishing below ~0.57. |
| 3.4 | **`generateWorld` returns module singletons.** `world.districts === DISTRICTS`; `world.bridges === world.causeways` (same array); downtown plots share `buildable` objects with the plan singleton — and those are the objects the edit path is handed. | high | **FIXED** | `districts`/`bridges`/`causeways`/`highways` returned as copies. Verified: `world.districts !== DISTRICTS`, `bridges !== causeways`, and mutating world 1 no longer reaches world 2. |
| 3.5 | **`spatial-index.js` has zero test coverage.** It produces the address string fed to grounding. | high | **FIXED** | 4 tests. Mutation to centre-cell-only registration — the exact bug its comment claims to avoid — now fails the edge test. |
| 3.6 | Two threshold tables over the same demand field disagree — `DENSITY_BANDS` (calibrated) vs `DEMAND_FOR` (not). `DEMAND_FOR.FARM = 0.0` always matches, so FARM/MIDRISE settlements never reach their corridor/centre logic; RESORT is absent from the ladder entirely (6 plots of 16,541). The derived character is largely inert. | med | **FIXED** | One table. `DEMAND_FOR` derived from the calibrated `DENSITY_BANDS`. The hand-typed VILLA rung at 0.16 vs 0.004 put 43.2% of blocks below the lowest reachable rung — the demand model was not running for nearly half the city. Plots 16,541 → 19,481; mix now TOWNHOUSE 33.3 / TERRACE 29.6 / VILLA 24.7 / MIDRISE 9.0 / TOWER 0.4. Test drives the shipped function; the old table fails it. |
| 3.7 | **Stale measured claims, several of them mine.** zoning percentiles all high by 8–67% and quoted against 18,775 plots when there are 16,541; spatial-index "31,414 rectangles"; "CELL larger than the biggest plot" (260 m vs a 392 m plot); settlement-fit "56 wet centres" (39); grade "1,615 roads" (1,382). **And `world-scale.js` contradicts `terrain.js` outright** on the mountains. | med | **FIXED** | Re-measured against the current world (19,481 plots): p40 0.137 / p50 0.188 / p60 0.232 / p75 0.382 / p85 0.492 / p92 0.575 / p97 0.702 / p99.5 0.869; bands land TOWER 1.2% MIDRISE 9.0% TERRACE 38.0% TOWNHOUSE 75.5% against an intent of ~1/10/35/70. Stale counts in spatial-index.js and CITY-PLANNING-SPEC.md corrected. The 16,541 figures left in city-plan.js are the BEFORE measurement and are correct as history. |
| 3.8 | Tests that do not test: the cliff refusal (its fixture actually triggers the WATER branch — `reason` is "partly in water"), the anchors reporter, the airport fence, `holdsGrade`, `rangeAt`, quay orientations, `roadAllowedAt` slope, and BOTH settlement-fit "guarantees". | med | **FIXED** | All eight. Cliff fixture was reaching the WATER branch (both refusals share a verdict string) — lifted clear of the sea and now asserts `reason`. `holdsGrade` was read as the code's own verdict — now measured. Five behaviours had NO test: per-class road slope, quay orientation, missing-anchor reporting, and both settlement-fit guarantees. Each written by mutating first. The settlement-fit fixture initially proved nothing (the area cap halted growth with both guards at 0 rejections) — it now lifts `maxGrowth` and asserts the guards fired. |
| 3.9 | `generateWorld()` with no height function reports `zoningAnchors: {missing: [], hasIndustry: false}` — zoning never ran, so the array whose purpose is to make an absent anchor visible looks identical to a fully-anchored world. The one genuinely silent path. | med | **FIXED** | `zoningAnchors.evaluated` distinguishes 'nothing missing' from 'the check never ran'. |
| 3.10 | 91.4 MB allocated eagerly per `generateWorld` (`.fill(NaN)` over 5700×4200), and the comment reads as though the scaling change fixed it. | med | **FIXED** | 64×64 chunked allocation. arrayBuffers 91.4 → 34.5 MB, RSS 134.7 → 80.6 MB, build time unchanged. 2.89% of the flat grid was ever touched. Smaller chunks measured and rejected (RSS rises). The 'memory does not change' claim corrected. |
| 3.11 | The `placeFeatures` memo **cannot fire for the call that matters** — `generateWorld` always passes a fresh `cachedHeight` wrapper. Cold cost 2,135 ms, not the "roughly 700 ms" claimed. Also resolves features against the 7.8 m-quantised height while the renderer uses the exact one. | med | **FIXED** | `generateWorld` passes the RAW height function, so the memo hits for the renderer and the bookmarks (both now 0 ms) and the world resolves features against the same exact height the renderer uses. Net page-load placement 4.52 s vs ~4.66 s, and correct. |
| 3.12 | Constant pairs in different files describing one thing: `onLand 0.85` ×2, `maxGrade 0.025` ×3, `maxDev 30` ×2, plot-bucket CELL ×3 with two conventions, `DRY_ENOUGH 0.6` vs `BEACH_ABOVE 2.2` (37 plots in the disputed band), `WORLD.SIZE` scales but `WORLD.HORIZON` does not. | low | **FIXED** | `RAIL_ALIGNMENT` (grade.js) — the search CHOOSES a line on these and the renderer BUILDS on them. `MIN_CORRIDOR_ON_LAND` (land-use.js). `PLOT_BUCKET` (spatial-index.js), which also stops scaling: a grid over plots is sized against plots, and plots are built objects. |
| 3.13 | `terrain.js` still carries `clamp`/`smooth`/`smoother` duplicated from `noise.js` — the file whose own comment says "THE DUPLICATE IS GONE" — plus an unused `const fade`. | low | **FIXED** | `clamp`/`smooth`/`smoother` imported from `noise.js` instead of re-declared; unused `fade` removed. |

**Verified sound:** determinism by value holds across three builds (sha256 of
plots/blocks/roads identical); the WeakMap caches do not collide; `nearestPlot`'s
ring exit IS sound, unlike `LandField`'s; `slopeAt`'s fixed 24 m baseline costs
0.6% on cliff counts; scale breakage below 0.65 is honest and named by the suite
everywhere except 3.9.


---

## Decision — the spend estimates are parked until they can be measured

**Mark, this session:** *"I am not sure that the way we are checking them is real,
and until we actually try and run them I am not sure we will. Let's not worry
about it just yet — we can come back to it once we can test it for real, but I
don't want to do that until we are sure it is done and ready, which it isn't
yet."*

So: the arithmetic bug is fixed (input tokens are priced, the test reads the real
table, the ceilings cover what the limits permit). What is NOT settled is whether
`INPUT_CAP` — the reconstructed prompt sizes — reflects what a real run actually
sends. Those numbers are derived from the call sites, not observed.

**Revisit when:** live runs exist and their real token counts can be read back
from `stageCosts`. Then `INPUT_CAP` becomes a measurement rather than an
estimate, and `DAILY_LIVE_RUNS_PER_IP` and the caps can be set from evidence.

Until then no further tuning: a second guess is not better than the first.
