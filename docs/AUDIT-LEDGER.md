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
| 1 | Known backlog | **15 of 16 done** — only 1.1 (generateWorld stall) open |
| 2 | Pipeline (`src/`) | AUDITED — 12 findings, 2 CRITICAL, all open |
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
| 2.2 | **Every spend estimate prices output tokens only.** `WORST_CASE.*` omits input tokens; `costUsd()` charges both. Real source-edit worst case $0.642 vs a $0.44 ceiling. Two stages' input cost alone exceeds their whole reservation. | **CRITICAL** | OPEN | Reconstructed prompts from call sites. Daily cap raced past $2.00 with the real DO logic. Deleting the ceiling entirely leaves the suite green — the pricing test re-derives from its own copy of the same wrong table. |
| 2.3 | Five retry sites spend real money that is never counted (openai ×2, grounding, claude ×2). The fix exists in exactly one of six places with the same shape. | high | OPEN | Forced the grounding parse retry: 2 HTTP calls, exactly half the spend recorded. |
| 2.4 | **9 of 14 gates can be deleted with all 380 tests still green** — oscillation guard, round cap, fix-attempt cap, per-run ceiling, Gate 2 reject flag, unresolved-blocks-ship, the QA pass, circuit breaker, per-IP limit, concurrency limit. `reviewLoop.test.ts` never touches the loop body. | high | OPEN | Each mutation applied to real source, full suite, reverted. |
| 2.5 | The CAS's empty-storage branch ignores `expectedSource`, and its comment says it does not. | high | OPEN | `publishSource` with a source that was never the baseline returns `{ok:true}` against empty storage. |
| 2.6 | A payload inside an exported function body defeats every server-side check: `topLevelSideEffects` only inspects module load, and the regression suite has no DOM so the guard branch is dead there and live in every visitor's browser. | high | OPEN | Injected a `document`-gated beacon into `tick()`: side effects `[]`, integrity all pass, 0 of 9 regressions fail. |
| 2.7 | `/security-check` executes the warm run and then ignores it (`judge(cold)` only). `attacks.ts` probes a harness shape the pipeline never uses; `network-egress` accepts any error as "held". | med | OPEN | |
| 2.8 | Gate 1's free-text reply loop is unbounded and outside the ceiling arithmetic — each reply re-runs ground + plan. | med | OPEN | 12 replies → 13 ground + 13 plan calls, no cap. |
| 2.9 | Lease bookkeeping disagrees with itself: DO grants 600 s, `ACTIVE_RUN_LEASE_TTL_SEC` is 330; `maxConcurrent` default 3 vs published 5. A *transient* renewal blip sets `leaseLost`, which skips release and leaks the slot for 600 s. | med | OPEN | |
| 2.10 | `setSurfaceField` accepts an unbounded free string — 500,000 chars accepted, then re-sent as input to every later stage. | med | OPEN | Sentinel smuggling through the same field IS correctly refused. |
| 2.11 | Dead code confirmed (6 previously reported) plus `CriterionKind`, `WorldAction`, and two functions referenced only by tests — including `decideGroundingOutcome`, tested in 4 places and used in 0. | low | OPEN | |
| 2.12 | `reviewFoundMaterial` counts all rounds, `reviewFoundNits` only the last. An `existence` criterion with `field: null` on `initialWorld` cannot fail. `pipelineAvailability` fails open (advisory only). The 9 worker tests did not execute — vitest could not boot here. | low | OPEN | |

**Verified sound, worth recording:** criterion `fn` injection is closed (regex +
allowlist); sentinel smuggling on a data edit fails closed; the TDZ comparator
snapshot in `simSandbox.ts` is real; `topLevelSideEffects` genuinely catches
module-load payloads (disabling it fails 5 tests); a no-op data edit is caught;
the oscillation guard works for findings that are *not* overruled; resume from
the review gate re-pays for nothing.
