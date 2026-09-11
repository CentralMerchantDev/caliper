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
