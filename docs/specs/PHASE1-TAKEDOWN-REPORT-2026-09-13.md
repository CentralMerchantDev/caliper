# PHASE 1 — "TAKE IT ALL DOWN" — REPORT

Branch `rebuild`. Executes Mark's instruction, 2026-09-13, rejecting the
prior session's decision to leave `city-render.js` standing. Full plan:
`docs/specs/PHASE1-TAKEDOWN-PLAN-2026-09-13.md` (written and blind-reviewed
before anything moved, per `rule://reviewer-independence`).

## What was quarantined

All Tier 2 (`rule://quarantine`) — moved to `_TO-DELETE/old-world/`, ledger
line each in `_TO-DELETE/LEDGER.jsonl`, retained, never deleted.

**Source files (8):** `city-render.js`, `layout.js`, `instance-groups.js`,
`layout-fits.js` (not in Mark's four-name list — found by the dependency
graph), `city-plan.js`, `board-adapter.js`, `city-live-world.js` (also not
named — found while confirming `city.html`'s own dependents), `city.html`.

**index.html's old content** — not moved (the live URL stays), but its old
~5,070-line body is preserved as `_TO-DELETE/old-world/index.html.pre-holding-page`
before being overwritten with a 62-line static holding page.

**Test files, RETIRED (subject entirely gone) — 19:** `boardAdapter`,
`cityConnectivity`, `cityJoin`, `cityRenderScenePlacements`,
`cityRenderWorldState`, `claimSpansAreChecked`, `describeRequestUI`,
`instanceGroups`, `layout`, `layoutGeometry`, `navPad`, `planSeed`,
`plotRoadOverlap`, `publicClaims`, `roadsFollowDensity`, `setPieceRefusal`,
`worldOccupancy`, `worldSpec` (18 from the first pass) plus `cityWorld` —
**this last one is BLOCKED, not retired** (see below); listed here only for
the file-move count, not the reason.

## What broke, and whether it was expected

**Every break was expected — none surprised this pass**, because each was
predicted in the plan before the corresponding move and confirmed
immediately after it:

- Quarantining the four render-cluster files broke exactly the 12 test
  files that import them directly — named in the plan, confirmed by a full
  `node test/run.mjs` build scan immediately after, nothing else.
- Quarantining `city-plan.js` broke exactly one thing in all of `public/` —
  `board-adapter.js`'s own import — confirmed by scanning every `public/*.js`
  file's own import specifiers against the real filesystem, not assumed.
- Cutting `world.js`'s `generateWorld` call (so `plan` is `null`) was named
  in the plan as "the single edit with the widest consequences" before it
  was made, and the plan's own blind review corrected an undercount in how
  many tests that would touch (11 known, at least 19 more found).
- Quarantining `city.html` broke its two real inbound links
  (`plan-preview.html`'s redirect, `scripts/shoot.mjs`'s hardcoded URL) —
  both repointed in the same commit, not left 404ing.
- Replacing `index.html` broke every test that scanned its old structure
  (nav pad CSS, Build menu, importmap, SSE math, page reachability) — all
  individually confirmed and disposed of, not assumed from a sample.

**One thing was NOT anticipated by the instruction and is worth naming
plainly**: `world-render-3d.js`'s `_buildCityBase` — the method the dynamic
import lived in — did more than boot the old renderer. It also built this
shell's own picking spatial index (`this._index`), selection state
(`this._selection`), AND drew the real, committed board
(`board.generated.json`, via `board-adapter.js` + `board-render.js`). All
three died with it. The instruction correctly predicted "picking has
nothing to pick, the inspector reads fields that no longer exist" — it did
not name that the CURRENT board-rendering path (the thing Phase 2.1/2.2 is
about to rebuild anyway) was, itself, only ever reachable through the old
world's boot sequence. There is no code path left, anywhere in this
repository, that draws board pieces on screen today. That is very likely
fine — Phase 2 rebuilds this from scratch — but it is a materially bigger
dormancy than "picking" alone, and is named here so nobody discovers it by
surprise.

## Every retired test, by name, with its reason

Full detail with commands and sha256 hashes: `_TO-DELETE/LEDGER.jsonl`
(19 test-file entries this pass, `tier2-old-world-test` class). Summary:

| File | Reason |
|---|---|
| `boardAdapter.test.ts` | subject is `board-adapter.js`, quarantined |
| `cityConnectivity.test.ts`, `cityJoin.test.ts`, `planSeed.test.ts`, `plotRoadOverlap.test.ts`, `roadsFollowDensity.test.ts`, `worldOccupancy.test.ts`, `worldSpec.test.ts` | test `city-plan.js`'s own generated-plan behaviour directly |
| `cityRenderScenePlacements.test.ts`, `cityRenderWorldState.test.ts`, `setPieceRefusal.test.ts` | test `city-render.js`'s own composition directly |
| `instanceGroups.test.ts`, `layout.test.ts`, `layoutGeometry.test.ts` | test `instance-groups.js`/`layout.js`/`layout-fits.js` directly |
| `publicClaims.test.ts`, `claimSpansAreChecked.test.ts` | check numeric/UI claims on the OLD `index.html`/`city.html`; both gone |
| `describeRequestUI.test.ts`, `navPad.test.ts` | regex-check the OLD `index.html`'s specific UI structure, entirely replaced |

## Every BLOCKED test, by name, with its reason

Subject survives; fixture used a quarantined import, or the property under
test is real but the holding page has nothing to exercise it against.
`node:test`'s own `{ skip: "reason" }` used throughout, so the reason
prints with the test on every run — this is not silent.

| File | Blocked (of total) | Why |
|---|---|---|
| `cityWorld.test.ts` | ALL 57, whole file quarantined | Deeply intermixed: tests using only surviving `terrain.js`/`land-use.js` code sit interleaved with tests calling `generateWorld`/`BRIDGES`/`LANDMASSES`/`PLOT_CLASSES`/`gradeGroundBands` directly. Triaging 57 tests individually under this pass's time budget risked the exact misclassification the blind review already caught once — named as a whole rather than guessed at test-by-test. |
| `describeRequest.test.ts` | 3 of 4 | needs a real plot from `generateWorld` |
| `selection.test.ts` | 2 of 3 | same |
| `worldAliasing.test.ts` | 2 of 2 | walks `world.plan` (null) and needs `city-plan.js`'s `WORLD`/`LANDMASSES`/`HIGHWAYS` directly |
| `questCompletion.test.ts` | 1 of 5 | the real-production-world case needs `buildWorldState` |
| `pickSelection.test.ts` | 2 of 3 | needs `buildWorldState`, and `this._selection` (no longer constructed) |
| `facadeVariants.test.ts` | 2 of 9 | both "GATE" tests read real placements from `city-render.js` |
| `phaseDelta.test.ts` | 1 of 4 | `measureLiveLayoutGeometry` called `generateWorld`/`planCity`/`groupByVariant` |
| `runGenerateRequest.test.ts` | 1 of 3 | end-to-end case needs a real plot |
| `originStability.test.ts` | 1 of 2 | the `city-plan.js`-based measurement; the `board-generator.js`-based one survives |
| `world.test.ts` | 3 of 6 | read `.plan.plots` via `planFingerprint`, now null |
| `movePiece.test.ts` | 6 of 9 | probe script (`scripts/_move-piece-probe.mjs`) imports quarantined `city-plan.js`/`board-adapter.js`/`layout.js`; the probe's own `execFileSync` call was guarded (it threw `ERR_MODULE_NOT_FOUND` unguarded at module scope, which crashed the whole test process, not just this file — caught and fixed, not just skipped) |
| `isolate.test.ts` | 7 of 9 | same probe pattern (`scripts/_isolate-probe.mjs`), same crash found and fixed the same way |
| `reachability.test.ts` | 2 of 4 | the holding page has zero navigation and zero menus, by design |
| `generatedClaimsAreCurrent.test.ts` | 2 of 7 | the holding page carries none of the four claim spans this gate checks |
| `threeIsSingle.test.ts` | 1 of 3 | the holding page loads no three.js |
| `evidence-forwarding.test.ts` | 1 of 5 | no SSE verification UI on the holding page |
| `lookPipeline.test.ts` | 1 of 6 | `city.html` (the comparison target) is quarantined |

## What went dormant in the shell (for Phase 2 to reconnect)

- **`_buildCityBase`** (`world-render-3d.js`) — replaced with a documented,
  named-error stub. Unreachable: nothing constructs the renderer with
  `city: true` any more.
- **The picking → address → describe-request chain.** `this._index`
  (spatial index) and `this._selection` are never built. A visitor cannot
  pick anything to write a change request against.
- **The real board render.** `board-adapter.js`'s conversion of a generated
  world into board pieces, and `board-render.js`'s instanced draw of
  `board.generated.json`, are both still present as files (kept, not
  quarantined) but have no remaining caller anywhere in this repository.
- **`createWorld()`'s `.plan`** (`world.js`) is `null`. `.land`, `.layers`,
  `.grid` are untouched and real. Side B's layer/undo/apply-persist
  architecture is unaffected in its own right; it simply has no real plan
  to point at yet.
- **`index.html` itself** — the shell's boot sequence, panel system,
  inspector, and describe/apply UI are not deleted (they live in
  `world-render-3d.js`, `menus.js`, `navigate.js`, `workbench.js`,
  `describe-request.js`, etc., all untouched) but nothing on the new holding
  page invokes any of it.

## What is still open

- **Item 6 and REBUILD-PLAN 1.6** (closing decision queue #3–#9) — outside
  this instruction's own scope, not attempted, per `rule://queue-exhaustion`.
- **A clean, authoritative full-suite run** (`node scripts/gen-test-count.mjs`)
  — attempted multiple times this session; each run either was contaminated
  by concurrent edits or did not return output within five minutes, matching
  this project's own documented history of host contention on long full-suite
  runs. Every individual file touched this pass was verified in isolation
  instead (typecheck clean throughout; a full-suite `node test/run.mjs`
  *build* scan — not a full run, just import resolution — found zero
  failures after the last edit). Named here as a real gap: the last mile of
  "the tree builds" is confirmed at the build level, not yet at the full
  run-and-report level.

## What I believe is wrong with the instruction, or would ask about if I could

Nothing in the instruction itself was wrong. One thing is worth surfacing
rather than silently acting on: **the board-rendering dormancy (above) is a
bigger gap than "picking has nothing to pick" named.** Not a reason to have
done anything differently — Phase 2.1/2.2 rebuilds this regardless — but
worth Mark knowing explicitly that the live site, right now, has no path to
drawing a board piece at all, not even behind a flag.

A second thing, found rather than anticipated: two of the probe scripts
`movePiece.test.ts`/`isolate.test.ts` depend on (`scripts/_move-piece-probe.mjs`,
`scripts/_isolate-probe.mjs`) threw an unguarded, module-scope exception
once their imports broke — the kind of failure that crashes the whole test
runner process, not just one file, if it is ever hit by a full-suite run
rather than a single-file one. Guarded in both files (`try`/`catch` around
the `execFileSync` call, tests skipped with a named reason on failure) as
part of this same pass, since leaving a process-crashing exception in the
tree would have been a worse state than the takedown found it in.
