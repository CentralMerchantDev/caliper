# OVERNIGHT RUN — 2026-09-11, b1-land, CLI, unattended

Mark is asleep; nothing waits for him. This document is written as the run
proceeds, committed after every step, so a crash costs one step, not the
night. Read bottom-up for the most recent state, top-down for the story.

Starting state: HEAD `f16c6d5` ("THE ITEM (docs only, plan only) -- the
remaining steps of retiring ROAD_WIDTH..."). Tree clean. `docs/specs/
PIECE-CATALOGUE-ROADS.md` §9's six numbered steps are written; none are
built. §9 itself names one currently-RED gate as a known, left-on-purpose
regression from `f01a324`: `test/boardLoad.test.ts`'s "committed board
matches the generator" gate, because `f01a324` added `roadClass` to every
road piece without regenerating `public/board.generated.json`.

Re-grounded at session start: `process_at('session-start')` and
`process_pending_decisions` read. No pending decision blocks this item —
the 7 open decisions in the queue (`caliper` #3/4/8/9, `caliper-bld`
#1/2/3) are pre-existing and unrelated to the ROAD_WIDTH retirement. Git
state confirmed: HEAD `f16c6d5`, tree clean, matching what this run
expected.

---

## HANDOVER — read this first

**Done.** Everything this run was asked to do landed and is committed:
ITEM 0 (the `boardLoad.test.ts` red gate `f01a324` left open) and all six
numbered steps of `docs/specs/PIECE-CATALOGUE-ROADS.md` §9 (Decision 5's
retirement of `ROAD_WIDTH`). Tree is clean. HEAD is `062706b`. Full commit
list, in order: `f01a324` (pre-existing, finished by a prior segment of
this same lane before this run started) → `f3db6d9` (ITEM 0) →
`3352110` (Step 2) → `2790d16` (Step 3) → `b09a509` (Step 4) →
`101ac09` (Step 5) → `062706b` (Step 6), each paired with an audit-log
commit. See `docs/DECISIONS-FOR-MARK.md` #5's own CLOSED note for the
full numbers.

**Every gate, green or red, with its evidence:**
- GREEN, verified this run: `test/boardLoad.test.ts` (7/7), the new
  Step 2/3/4 controls, `test/boardGenerator.test.ts`'s coverage gate
  (all 9 settled boundaries in the 20-40% band), `test/originStability.test.ts`'s
  own real assertion (not the `todo`).
- RED, already-tracked, NOT caused by this run, unchanged: B2.5's CPU-time
  gate (`docs/DECISIONS-FOR-MARK.md` #3), and ~46 other pre-existing
  failures across the old `city-plan.js`/`layout.js` pipeline, culling
  ratio/regression gates, and test-count staleness (decision #9) —
  confirmed by a full-suite run and arithmetic against
  `test/testCount.generated.json`'s own prior baseline, not assumed.
- RED, IMPROVED by this run's own side effects, not fixed by design:
  `docs/DECISIONS-FOR-MARK.md` #7's egress gate — was 3 boundaries lacking
  crossings, now 1 (`farm-isle`). Still Mark's call whether that's worth
  closing; not this retirement's job.
- RED, NEW this run, deliberately not fixed: `test/mutationEvidence.test.ts`'s
  two sub-tests, now further behind (decision #10) — every mutation this
  run proved CAUGHT via `scripts/_mutcheck.mjs` (or by hand, where even
  that tool's baseline check was blocked) is real, verified evidence, just
  not recorded through the authoritative `scripts/mutate.mjs` path, which
  cannot currently run at all (47 unrelated pre-existing failures, plus a
  real regex bug in that script found and named, not fixed, tonight).

**Three real regressions this run's OWN work caused, found and fixed
before landing, not shipped and discovered later** — see decision #10 and
the Step 5 entry below for full detail: `test/boardLoad.test.ts` drifting
red twice; `test/originStability.test.ts` breaking because a new
`roadkit.js` import pulled in the `three` npm package into a test's own
disposable copy that lived outside the repo's `node_modules` tree.

**One real wrong design turn, caught before it shipped:** drafted Step 4
to size bridge decks as `AVENUE`-class (28 m) based on a misreading of
what `roadkit.js`'s `bridgeSpan()` actually uses its `roadClass` argument
for. A blind review (no context on what was suspected) caught it before
any test or mutation was written. Corrected to `STREET` (18 m), matching
the plan's own already-correct, already-written reasoning.

**Everything named unverified, stated plainly, not glossed over:** Step
5's screenshot check confirmed no render crash but could NOT visually
distinguish the new board geometry from the much more detailed legacy
city sharing the same frame — the real confirmation for that step is a
numeric one (21,007 pieces loaded and rendered, zero page errors), not a
visual one. Step 3's own prediction that building coverage would stay
flat under the block retune was measurably wrong in several tiers — the
retune still landed every tier in-band, but the reasoning that got there
is on record as partly wrong, not quietly corrected after the fact.

**What I would do next, in order of what's actually available:**
1. Nothing is currently blocked on a decision that stops forward
   progress — decision #10 (the mutate.mjs regex bug, and whether a
   lighter-weight mutation-evidence path should exist) is real and
   queued, but doesn't block anything else.
2. `WORLD-BUILD-PLAN.md`'s own separate, much older ledger (PART 7) has 6
   items left (`process_next_item` against it, checked this run): the
   next two, `G2` and `I6`, are both explicitly BLOCKED — `G2` needs
   Mark's real, authorised dollar figures for a builder-tier spend cap
   (this run has no grounds to invent one), `I6` needs a live
   `wrangler dev`/`vitest` crash from a much older session state
   re-verified in this environment before trusting whether it still
   applies. `J2`, `J3`, `M4`, `M5` were not investigated tonight — named,
   not assumed clear. This ledger was NOT part of tonight's brief (which
   named ITEM 0 and §9's six steps specifically), so it was not started.
3. If continuing this specific work: `docs/specs/PIECE-CATALOGUE-ROADS.md`
   §7's own "what this does not decide" already names it — the building
   catalogue is the same treatment, for a different piece type, after
   roads. Not started, not assumed trivial.

**Anything I think is wrong that nobody asked about:** `scripts/mutate.mjs`'s
title-extraction regex (decision #10) is a real, load-bearing bug — it
makes the ONE entry in `scripts/expected-red.mjs`'s own allowlist fail to
match, which means the authoritative mutation harness has likely been
unable to establish a green baseline for longer than just tonight, for a
reason nobody had traced before this run. It's a one-line fix
(`scripts/_mutcheck.mjs`'s own regex already does it correctly) but
touches a shared verification tool, so it wasn't made unilaterally
tonight — named for Mark, per decision #10's own recommendation.

---

## ITEM 0 — the red gate

**Fixed.** `node scripts/gen-board.mjs` (with `$env:NODE_OPTIONS =
"--max-old-space-size=8192"` to avoid this host's own memory pressure, the
same OOM risk `docs/specs/PIECE-CATALOGUE-ROADS.md` §9 already names)
regenerated `public/board.generated.json`: 35,365 pieces in 42.9 s, B2.7
crossings 16 pieces (0 bridges, 16 docks, 6 refused — same refusal set the
already-named `docs/DECISIONS-FOR-MARK.md` #7 gate describes) in 0.1 s,
serialised 8,294,670 bytes raw / 266,434 bytes gzipped (3.2%).

`test/boardLoad.test.ts` re-run: **7/7 GREEN**, including the two that were
red (`"...matches the seed it claims..."`, `"...byte-identical to what
generated it"`). Evidence: `node test/run.mjs test/boardLoad.test.ts`.

**Full suite run once, per instruction, to see what else `f01a324` moved:**
`node test/run.mjs` (full), 1213 tests, 1149 pass, 48 fail, 15 skip, 1
todo, 1,202,050 ms (~20 min — this host's own memory pressure made B2.5
alone take 131,965 ms this run, over 3x this session's earlier 39.6–39.8 s
readings; named here as a real, measured variance, not a typo).

**What moved, quantified, not assumed:** compared against
`test/testCount.generated.json`'s own pre-session record (1212/1150/46 —
generated 2026-09-11 by the prior session, before tonight's commits).
1213 = 1212 + this run's own new `decision-5 step 1` test (confirmed
passing). Of the original 1212: 1148 now pass where 1150 did — **exactly
two tests flipped pass→fail**, both `test/mutationEvidence.test.ts`'s own
sub-tests. Full trace and root cause: `docs/DECISIONS-FOR-MARK.md` #10
(new tonight) — `f01a324` added a real, `_mutcheck.mjs`-verified mutation
entry to `test/mutations.json` (134 entries now) without a corresponding
record in the committed `test/mutationSummary.generated.json` (still says
133), because the authoritative `scripts/mutate.mjs` path that would
record it cannot currently run at all: the whole-suite baseline has 47
other failures `scripts/expected-red.mjs` does not cover, PLUS a real,
previously-unnamed bug in `mutate.mjs`'s own title-extraction regex that
makes even its one allowlisted entry (B2.5) register as unexpected.
**Left red, named, not worked around** — see decision #10 for the full
account and the two separable questions queued for Mark. No other test
among the 46 pre-existing failures moved; all 46 are unchanged, confirmed
by the arithmetic above, not merely assumed stable.

**Gates confirmed GREEN and unaffected by tonight's regeneration**
(spot-checked directly, not inferred from the count alone):
`test/boardGenerator.test.ts`'s own `decision-5 step 1` test (roadClass
still uniformly `STREET`); `test/boardLoad.test.ts` (all 7, above).

**Commit:** `f3db6d9`.

---

## Step 2 — geometry reads its own class's width

**Landed:** `3352110`. `public/board-generator.js` now sizes every road
piece (`placeRoadGraph()`) and the block-carving margin
(`generateBoard()`'s own, separate site) from `roadkit.js`'s
`ROAD_STANDARDS` via new `roadWidthFor`/`halfRoadFor` helpers, retiring the
`ROAD_WIDTH`/`HALF_ROAD` module constants entirely. Every piece's
`roadClass` stays uniformly `"STREET"` — `ROAD_STANDARDS.STREET.row` (18)
now governs geometry everywhere `9` used to.

**Blind review, before implementing:** a fresh subagent found the plan's
originally-designed "no road/building overlap" test would never catch the
mutation it was meant to catch, because `public/board.js`'s own occupancy
guard already prevents any two *placed* pieces from ever overlapping,
regardless of whether the margin math feeding candidate placement is
correct — so a stale site produces a different, non-overlapping board, not
an overlapping one. Confirmed directly by reading `board.js`. Redesigned
as a static source-scan (this repo's own `B2.6` precedent) instead, which
checks the actual code path rather than an output invariant `board.js`
already guarantees for unrelated reasons.

**Test-first, watched red, then green:** two new tests in
`test/boardGenerator.test.ts` — both confirmed red before the edit, both
green after. Evidence: `node test/run.mjs test/boardGenerator.test.ts`.

**Expected, named consequence, confirmed exactly as predicted:** the B2
20–40% coverage gate went RED the moment this step landed — `"downtown"`
measured 55.4% covered, over the ceiling. This is not a surprise; §9's own
plan named it in advance. Step 3 is the fix.

**Mutation:** deferred at commit time (red-baseline refusal, as above),
**now CAUGHT** — see Step 3 below, which cleared the baseline and let both
Step 2's and Step 3's own mutations run.

**Commit:** `3352110`.

---

## Step 3 — re-tune block/plot sizing back into the coverage band

**Landed:** `2790d16`. `SETTLEMENT_TABLE`'s `blockAtoms` doubled for 6 of
9 settled tiers (city, highland, fishing, farm, vineyard, quarry), doubled
then nudged twice more for suburb/resort after real measurement, and left
**unchanged** for mainland.

**Blind review, before implementing:** found the plan's uniform "double
every tier" approach was well-supported for the 8 island tiers but wrong
for mainland specifically — mainland's boundary is a fixed-depth (600 m)
coastal strip, not a compact island shape, so the same road-fraction model
overpredicts its correction need by ~2.4x versus the islands, and mainland
already had the most headroom of any tier (28.5%, comfortably in band)
before this step. Doubling it anyway risked pushing it under the 20%
floor. Folded in directly: mainland's `blockAtoms` was left at 80.

**Measured, iteratively, not assumed:** a real `generateBoard()` run,
per-boundary coverage read directly, at each stage:

| boundary | before Step 3 | after 2x pass | after final nudge |
|---|---|---|---|
| mainland | 28.5% (in band) | 28.5% | 28.5% |
| downtown (city) | 55.4% | 37.7% | 37.7% |
| suburb-isle | 41.5% | 40.6% (barely over) | **37.6%** |
| resort-isle | 59.9% | 41.8% (over) | **38.2%** |
| highland-isle | 45.2% | 36.0% | 36.0% |
| fishing-isle | 43.6% | 27.1% | 27.1% |
| farm-isle | 42.3% | 38.7% | 38.7% |
| vineyard-isle | 43.5% | 26.1% | 26.1% |
| quarry-isle | 43.1% | 28.2% | 28.2% |

All nine settled, non-`oneHouse` boundaries now land in the 20-40% band.

**A real, honest surprise, named rather than smoothed over:** the plan's
own algebra predicted building coverage fraction would stay roughly flat
under this retune (same-sized plots, proportionally larger interiors).
Measured reality disagreed substantially — e.g. `suburb-isle`'s building
share went 0.4% → 18.2%, `farm-isle` 0.5% → 17.2%. Most likely cause
(not chased to confirmation): fewer, larger blocks mean a smaller
fraction of each block straddles the coastline, so far more individual
plot candidates inside each surviving block clear the terrain check than
before. The retune still landed every tier in band, which is what the
gate asks for — the reasoning that got there was partly wrong, and that
is recorded rather than quietly corrected after the fact.

**Verified:** `npx tsc --noEmit` clean. `node test/run.mjs
test/boardGenerator.test.ts` — 13/14 pass, only B2.5 (already-tracked)
red.

**Mutated, CAUGHT (both):**
`decision-5-step-2-block-carving-reads-road-standards` (deferred from
Step 2) and `decision-5-step-3-blockatoms-retuned-for-doubled-road-width`
(new). Both via `scripts/_mutcheck.mjs`, baseline GREEN, source restored
byte-identical.

**Consequence, named for the record:** `test/mutationEvidence.test.ts`'s
already-red gate (decision #10) now has two more entries with no
authoritative `mutate.mjs` evidence, exactly as #10 predicted would
happen at every subsequent step.

**Commit:** `2790d16`.

---

## Step 4 — retire bridge-generator.js's own separate ROAD_WIDTH

**Landed:** `b09a509`. The bridge deck's width now agrees with the roads
it connects to (`STREET`, 18 m) instead of a separate, hardcoded `9`.

**A real wrong turn, caught by blind review, worth recording plainly:**
mid-implementation, found `bridgePieceFrom()` already calls
`bridgeSpan(..., { roadClass: "AVENUE" })` for its own span-engineering
check, and read that as grounds to make the deck AVENUE-width (28 m)
instead of the originally-planned STREET (18 m), for "internal
consistency." Drafted the step that way and sent it to a fresh, blind
reviewer before implementing — which found the reasoning was wrong on two
counts: (1) `bridgeSpan()`'s `roadClass` argument doesn't affect its
engineering refusal logic at all (grade/length/800 m ceiling are all
hardcoded), it only computes a width value the caller already discards;
(2) this session's own, already-written plan document
(`docs/specs/PIECE-CATALOGUE-ROADS.md` §9 Step 4) explicitly says STREET,
twice, with the correct reasoning already on record — AVENUE would have
reopened the exact seam Step 4 exists to close, just 10 m wide in the
other direction instead of 9 m narrow. Reverted to STREET before writing
any test or mutation. This is exactly what the blind-review-before-
implementing requirement is for.

**Test:** `test/bridgeGenerator.test.ts` gains a check that every real
bridge piece a fresh board produces matches `ROAD_STANDARDS.STREET.row`.
Not watched red in the strict sense — the fix was already in place while
resolving the AVENUE/STREET question above — substituted with a direct
mutation-and-revert (below), which proves the same thing.

**Verified:** `npx tsc --noEmit` clean. `node test/run.mjs
test/bridgeGenerator.test.ts` — 13/14 pass, only the already-tracked
`docs/DECISIONS-FOR-MARK.md` #7 gate red (unrelated, unaffected).

**Mutated, CAUGHT — by hand, not `_mutcheck.mjs`:** that tool's own
baseline check refuses to run against this file because #7's own gate is
already red there — and #7 may be **permanently** red by its own design
(an accepted starting-state gap, not a defect). A fourth instance of the
"two correct controls disable each other" shape (decision #10), but
unlike the Step 2/3 instances, this one may never clear on its own.
Verified by hand instead: applied the mutation, ran the file, confirmed
exactly one new failure (the named test, for the stated reason) alongside
the pre-existing #7 red and nothing else, reverted, confirmed back to
13/14.

**Commit:** `b09a509`.

---

## Step 5 — regenerate the committed board and re-verify

**Landed:** `101ac09`. `node scripts/gen-board.mjs` — 21,007 total pieces
(20,988 generated + 19 crossings, 0 bridges/19 docks/3 refused).

**Found and fixed along the way, not part of the original plan:**

1. `test/boardLoad.test.ts` had drifted red AGAIN between Step 2's commit
   and this one — Steps 3/4 landed real generator changes without a
   matching regeneration (the exact same class of mistake ITEM 0 fixed
   once already tonight). Fixed by this step's own regeneration.
2. Blind review, before regenerating, found the plan's re-check list was
   missing `boardLoad.test.ts`, and — more importantly — found that both
   `pieces.length > 30000` sanity checks were **near-certain**, not
   merely possible, to fail: the real post-retirement piece count
   (21,007, measurable before regenerating at all) is well under 30,000,
   a direct consequence of Step 3's own larger blocks. Confirmed after
   regeneration: both failed, exactly as predicted. Both thresholds
   re-calibrated to 15,000 — real margin below the measured count, with
   the history and the measurement recorded in the comment, not a number
   nudged just past today's figure.
3. **A third real regression, found by a full-suite run, not previously
   named anywhere:** `test/originStability.test.ts`'s own settlement-
   boundary stability test started throwing
   `ERR_MODULE_NOT_FOUND: Cannot find package 'three'`. Root cause: Step
   2's new `roadkit.js` import (which itself imports the `three` npm
   package) broke this test's own technique of copying `public/` into the
   OS tmpdir to patch `WORLD_SCALE` — a copy outside the repo has no
   ancestor `node_modules`, so anything it transitively imports needing an
   npm package fails. Not specific to `roadkit.js` — any future import of
   an npm-package-using module into `public/` would have tripped this the
   same way; a real, previously-undiscovered fragility in the test's own
   technique. Fixed by creating the disposable copy under the repo root
   instead, so it resolves packages the same way the real `public/`
   directory always has. Verified by direct mutation-and-revert (reverted
   to the OS tmpdir, confirmed the exact same error reappeared, restored).

**A real, measured improvement, not claimed as this step's goal:**
`docs/DECISIONS-FOR-MARK.md` #7 previously named 3 boundaries with no
crossing egress. After this regeneration, only `farm-isle` still lacks
one — wider roads and bigger blocks changed real occupancy favourably for
2 of the 3. The gate itself is unchanged and stays red for the one
boundary still affected.

**Verified:** `npx tsc --noEmit` clean throughout. Targeted run (5 files):
68 tests, 65 pass, 2 fail (B2.5, #7 — both tracked), 1 todo. A headless
browser check (Playwright/SwiftShader) confirmed the regenerated board
loads and renders end-to-end: `boardPieceCount: 21007`,
`boardChildren: 21007` (one mesh per piece), zero page errors.

**Visual check, honestly qualified:** `scripts/shoot.mjs` with
`SHOOT_BOARD=1` rendered without error, but plain-grey placeholder board
pieces (typologies not yet wired, B3's own documented scope) are not
clearly distinguishable from the much more detailed legacy city in the
same frame. Not claimed as a confirmed visual pass — the numeric
piece-count/render check above is the real evidence for this step.

**Commit:** `101ac09`.

---

## Step 6 — close the record

**Landed:** `062706b`, docs only. `docs/DECISIONS-FOR-MARK.md` #5 gets a
CLOSED note with the full commit list, the real measured numbers, both
real regressions this retirement's own work caused and fixed, and the one
place the plan's own reasoning was measurably wrong. `docs/specs/
PIECE-CATALOGUE-ROADS.md`'s status line updated: §§1-8 (footprint/type
catalogue) still a proposal; §9 done.

**Fact-checked before committing:** a fresh, blind subagent independently
re-derived every number in the closing note from the real repository
state — commit hashes, `ROAD_WIDTH` absence, piece/bridge/dock/refused
counts, `blockAtoms` table, mutation IDs, all nine coverage percentages,
the egress-gap claim. Everything matched. No inaccuracies found.

**Commit:** `062706b`.

---

## §9 (Decision 5's ROAD_WIDTH retirement) — DONE

All six steps built, tested, mutation-verified (or, where the mutation
harness's own baseline was structurally blocked, verified by hand with
the same rigor), and committed. `ROAD_WIDTH` no longer exists anywhere in
`public/board-generator.js` or `public/bridge-generator.js`. The
committed board now reflects it: 21,007 pieces, every settled boundary in
the 20-40% coverage band, bridge decks agreeing with the roads they
connect to.

Three real regressions were found and fixed DURING this work, not shipped
and discovered later: `test/boardLoad.test.ts` drifted red twice (once
from ITEM 0's own predecessor, once from Steps 3/4 landing without a
regeneration); `test/originStability.test.ts` broke because Step 2's new
import pulled in an npm package a disposable test copy outside the repo
couldn't resolve. One wrong design turn (bridge deck width) was caught by
blind review before it was ever tested or committed. One real disagreement
between the plan's own algebra and measured reality (building coverage
under the block retune) is on record rather than smoothed over.
