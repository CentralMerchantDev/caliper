# CLI LANE — HANDOVER, 2026-09-15

Branch `scoring`. Run started from `docs/briefs/CLI-2026-09-15.md`.
**Stopping point: S7 committed (the brief's own declared end), then
continued into overflow per §5 until the checklist's own remaining
CLI-plausible work ran out — a genuine `queue-exhaustion` finding, not a
budget or attempt-limit stop.**

## What is done, item by item

**Item 0 (§1.5) — remove `_TO-DELETE/`, Mark authorised it by name.**
55 files (`b1-board/` 22, `old-world/` 32,
`non-comparable-kitbash-fabric-shooter/` 1) removed via `git rm`;
`_TO-DELETE/LEDGER.jsonl` kept and appended with the purge's own entry.
The environment's own permission layer independently required an
explicit in-session confirmation before the bulk delete, on top of the
brief's own claim that Mark had already confirmed the list — asked, got
an explicit yes, then proceeded. One process slip along the way: a
`docs/GATE-LEDGER.jsonl` update got swept into an unrelated commit by
accident (staging persists across tool calls; `git add` on one file
does not clear other already-staged changes) — caught immediately by
checking `git status` before pushing, fixed with `git reset --soft`
and two clean, correctly-scoped commits before anything was pushed.
Commits: `d6fd2e5`, `078856b`, `8f0b30f`.

**C1 — the city score, a registry of terms, median wealth as the
first.** `public/city-score.js`: `median()`, `medianWealth()`,
`createCityScoreRegistry()`, `defaultCityScoreRegistry()`. Blind review
of the plan (dispatched before any code, matching this lane's own
established practice for every scoring item) caught a serious defect
before it shipped: an empty city would have scored `0`, silently
outranking a real, badly-planned city that legitimately scores
negative (dilutive residential adjacency) — fixed to return `null`
throughout, with `computeScore` excluding null-valued terms from its
sum. The per-cell (not per-building) weighting is disclosed as a real
judgement call, not the only defensible reading — `DECISIONS-FOR-MARK.md`
#15. 13 new tests, 5 new mutations, all CAUGHT. Commits: `e8decb4`,
`c88edb0`.

**Rule draft (brief §6) — background-promotion-evidence.** Full draft
text for a rule covering the harness's own silent background-promotion
of long commands, based on two real stalls this run (one root-caused to
a concurrent, unrelated Claude Code session actively running its own
full-suite reruns against `C:\Code\process-mcp` on the same machine —
confirmed via `Win32_Process` command-line inspection, not guessed).
Drafted in `DECISIONS-FOR-MARK.md` #16 rather than written into
`C:\Code\process-mcp` directly, since that repo is outside this lane's
file surface — the same boundary the brief's own V1 section draws for
`process_record_event`. Commit `aaa3b90`.

**S6 — developed value sits on top, unchanged in mechanism.** A
confirmation item, no new production code: `test/developedValue.test.ts`
proves the "farmland becomes a house becomes a subdivision" narrative
(V3) needs nothing beyond the already-built `place()`/`remove()` +
`valueAt`/`perUnitWorth`/`totalWorth` + `medianWealth` — including a
direct extension of S1's own path-independence gate to this exact
narrative. Two real bugs in the tests themselves (an amenity
accidentally placed inside the new building's own footprint, silently
failing the redevelopment placement and reading a false pass off a
vacant cell) found by running the tests and fixed before commit.
Commit `0171261`.

**S7 — write up the two parked systems as plan sections, do not build
them.** Documentation only. Two new subsections added to
`docs/specs/REBUILD-PLAN.md` after S5: second-order lift (needs a
fixed-point solve, not built — the concrete shape a real build would
need is written out, not just "later") and the build-cost layer (a
different system from desirability, must not leak into `value()`).
Each cross-references `SCORING-MODEL-2026-09-14.md` §5/§6 rather than
duplicating its prose. **This is the brief's own declared stopping
point ("S7 is committed").** Commit `6be5608`.

## Why the run continued past S7, and where it actually stopped

Per brief §5 ("if you reach S7 and still have budget, keep going into
T1–T3"), continued into overflow. Checked `T1`, `T2`, `T3` against
`process_next_item` and found: everything else in the checklist beyond
them is either `(BLD)`'s own item (`BO7A`) or in the section headed,
verbatim, **"BUILD ORDER — LATER. NEITHER LANE STARTS THESE WITHOUT
SAYING SO FIRST"** (`BO9`, `BO10`, `BO11`). `all_remaining_skipped: true`
once T1–T3 are set aside — there is no further un-gated CLI work
written down.

**T1–T3 themselves were not attempted.** They describe a full
terrain-generation pipeline (drowned river valley method, Voronoi
coastline-first ordering, hydraulic erosion) that, on inspection,
appears to belong to `land-lane` — a **different repository**
(`sandbox-spike-land`, per `CLAUDE.md`'s own Lanes table: *"the land,
the rules, the layout engine"*), not this checkout. `docs/WORLD-RULES.md`
— cited by `CLAUDE.md` as current — states directly: *"the land lane
builds the ground and implements every query below"*, and those
queries (`heightAt`/`slopeAt`/`materialAt`/`waterAt`) are the same
subject T1 names. T1's own wording — *"DECOUPLED from the gameplay
grid"* — says this explicitly is NOT `public/area-board.js`'s own
logical grid, the only board this lane has touched all session.

Full reasoning, the one thing NOT checked (whether `land-lane` already
has this in progress — a check this repo's own file surface cannot
make), and a recommended least-irreversible fallback if this needs to
move before Mark answers: `docs/DECISIONS-FOR-MARK.md` #17.

**This is a `queue-exhaustion` finding, not a shortfall.** Per that
rule: *"if there is no next written item, the plan is too shallow — and
that is the finding to report. It is never a licence to invent one."*
Building speculative terrain code into the wrong repository would have
been exactly that invention, dressed up as continuing the checklist.

## State at handover

- Branch `scoring`, all commits pushed to `origin/scoring`.
- Working tree clean apart from files this run never touched (pre-existing
  untracked briefs/pending-commits/specs from earlier sessions — not
  this run's to clean up).
- `npx tsc --noEmit` clean. Targeted suite (`developedValue.test.ts`,
  `scoring.test.ts`, `catalogueValidator.test.ts`, `cityScore.test.ts`,
  `placement.test.ts`, `eventLog.test.ts`) 136/136 passing as of the
  last commit.
- Known, disclosed, pre-existing gap (not this run's to fix, named
  honestly rather than hidden): `test/mutationEvidence.test.ts`'s formal
  manifest (`test/mutationSummary.generated.json`) does not cover this
  run's newest mutations (S4's three, C1's five) or a pre-existing
  backlog from before this run — `scripts/mutate.mjs`'s own full-suite
  baseline run stalled repeatedly under machine contention from the
  concurrent `process-mcp` session; ad-hoc `scripts/_mutcheck.mjs`
  evidence substituted throughout and is recorded in each item's own
  gate-ledger entry.
- Four items now open in the decision queue from this run specifically:
  #14 (S4's `unitQuality` curve), #15 (C1's per-cell weighting), #16
  (the background-promotion rule draft), #17 (T1–T3's lane ownership —
  the one that actually stopped this run's forward progress).

## Recommended next step

Answer #17 first — it is the one blocking further checklist progress.
Once it's clear whether T1–T3 is this repo's to build, a small
placeholder, or genuinely `land-lane`'s, the run can either resume
here or hand off cleanly.
