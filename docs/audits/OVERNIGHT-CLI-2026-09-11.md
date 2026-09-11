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

**Mutation NOT YET proven CAUGHT — blocked, not skipped:**
`scripts/_mutcheck.mjs` refused to score the named mutation
(`decision-5-step-2-block-carving-reads-road-standards`) because the
coverage gate above shares `test/boardGenerator.test.ts` with the new
controls, and the harness will not score against a red baseline (correct,
by design). The **same** "two correct controls disable each other" shape
as decision #10, now for a second pair. Will be run and proven CAUGHT
immediately after Step 3 restores a green baseline, before Step 4 starts.
