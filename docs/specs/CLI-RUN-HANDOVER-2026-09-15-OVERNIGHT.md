# CLI LANE — OVERNIGHT HANDOVER, 2026-09-15

Branch `scoring`. Run started from `docs/briefs/CLI-2026-09-15-overnight.md`.
**Stopping point: U4 committed (the brief's own declared end), then checked
for further work per `rule://queue-exhaustion` — none remains un-gated.**
`process_next_item` with every other-lane/suspended/gated id skipped:
`all_remaining_skipped: true`, `remaining: 0`.

## What is done, item by item

**Item zero — merge `scoring` into `main`, authorised, and push.** Clean
merge (no conflicts), verified (136/136 targeted tests, tsc clean) before
pushing. Both `merged` and `pushed` events recorded so BLD's own RC5 (the
on-screen value readout, needing `valueAt`/`valueIfPlaced`) can find where
this landed without guessing a ref — the failure named directly in the
brief's own §1. Commits: `e8f40fc` (merge), `2049951` (event log), branch
`scoring` fast-forwarded to match. One process slip caught and fixed before
push: a `docs/GATE-LEDGER.jsonl` update got swept into an unrelated commit
by accident (staging persists across tool calls) — caught via `git status`,
fixed with `git reset --soft` and two correctly-scoped commits, nothing
pushed wrong.

**U1 — fix `npm run gen:claims`.** `scripts/gen-city-summary.mjs` retired
cleanly (exit 0, informative message, no write) rather than crashing on its
deleted dependency (`public/city-plan.js`, gone since item zero's own
purge). First pass (`b116279`) proved reachability only — full completion
was blocked by U2's own not-yet-fixed stall, disclosed honestly rather than
claimed. Once U2 landed, re-ran for real (`08d563c`): full 123-file suite,
fresh measurement, `619 node tests (8 fail, pre-existing) / 12 worker tests
(0 fail)`. `CLAUDE.md`'s stale `1087` line corrected to the real `619`.

**U2 — `cullingRatio.test.ts`, five reproductions, a named cause, a
decision.** Traced directly (process inspection, not guessed): the three
tests' own subject page, `public/city.html`, no longer exists — item
zero's purge deleted it. Scope widened honestly beyond the one named file:
`regressionGate.test.ts`'s A5.2/A5.3 and `envLuminance.test.ts` share the
byte-identical defect; leaving either unfixed would still fail this item's
own gate. All three quarantined (`node:test`'s own `{skip: "..."}`, naming
the cause and BLD as owner), not fixed — no live rendered scene exists to
re-point at yet. **The real default suite now completes in ~110 seconds**
(previously: never). New regression lock,
`test/cullingSuiteUnblocked.test.ts`. Commit `660929f`.

**U3 — decide the real mutation instrument.** A recommendation only, per
the brief's own explicit instruction not to unilaterally replace it. The
brief's own premise (`mutate.mjs` "has stalled on every attempt") was
checked directly rather than carried forward — and found partly outdated:
post-U2, `mutate.mjs --id <entry>` completes its own baseline in **1m49s**
and correctly refuses (7 genuine pre-existing suite failures, unrelated to
any mutation) rather than being structurally broken. Recommendation queued,
`DECISIONS-FOR-MARK.md` #18: keep both tools — `_mutcheck.mjs` for
day-to-day work (this session's own established practice throughout),
`mutate.mjs --all`/`--resume` as the stricter full audit once the 7
failures are fixed (now a bounded, cheap-to-retry task, not an open-ended
one). Neither retired. Commit `99a837f`.

**U4 — Side B's data model.** The one item that is not maintenance:
`public/catalogue-registry.js`, `createCatalogueRegistry()` with
`.get`/`.all`/`.addAuthoredEntry`, composing the shipped catalogue's own
`baseValueFor`/`unitQualityFor`/`adjacencyFor` (the last now exported, was
private) rather than reimplementing them. B1 ("the board cannot tell the
difference") proven directly — an authored piece places and scores through
`valueAt`/`perUnitWorth`/`totalWorth` with zero special-casing anywhere,
and a companion test proves a *stale* registry snapshot genuinely cannot
see a piece authored after it, making the re-fetch requirement tested
rather than silently assumed. B3's `UNIQUENESS_MULTIPLIER = 2` (a disclosed
placeholder) proven to actually apply to `baseValue` only. Blind review
before any code found and fixed three real defects (composing a function
that throws on untrusted input; a missing required field; an
under-strength provenance check) — full account in the commit message.
**Two real gaps disclosed, not hidden**, `DECISIONS-FOR-MARK.md` #19: the
overlay is in-memory only, not yet the durable store B2 calls "persisted"
(a Cloudflare Worker isolate does not survive past one request); the
multiplier is baked into each entry at authoring time with no re-tuning
path, mitigated with a recorded trail field. Commit `2737c3b`.

## State at handover

- Branch `scoring`, all commits pushed to `origin/scoring`. `main` carries
  the item-zero merge (`e8f40fc`/`2049951`) and is otherwise unchanged
  since — the rest of this run's work has not been merged back to `main`
  and was not asked to be.
- `npx tsc --noEmit` clean throughout, checked after every item.
- The real default suite (`node test/run.mjs`, no arguments) completes in
  ~110 seconds: `619` node tests, `579` pass, `8` fail (all pre-existing,
  individually checked and named in U2's own commit — `deadExports.test.ts`'s
  pre-existing ~162-entry allowlist gap, a `ground.test.mjs` slope-tolerance
  test, decision #10's own already-named `mutate.mjs` regex bug, and
  `test/mutationEvidence.test.ts`'s own manifest-staleness gap), `32`
  skipped (holding-page exemptions plus the three U2 quarantines).
- **Six new decisions queued this run**, #14–#19 (four carried from the
  prior run, two new: #18 the mutation-instrument recommendation, #19 the
  uniqueness multiplier and the persistence gap). None block further work;
  all name a recommendation and what was done in the meantime, per
  `rule://decision-queue`.
- `test/mutations.json` now carries 185 entries (was 180 at the start of
  this run); `test/mutationSummary.generated.json`'s own formal manifest
  (only `mutate.mjs --all`/`--resume` writes it) was not regenerated this
  run — U3's own finding names this as the practical unlock once the 7
  pre-existing suite failures are fixed, not this run's to force through.

## Why the run stops here

Per the brief's own §5: *"Past U4 with budget left: `rule://queue-exhaustion`
— descend to the next written item. Running out of time is expected.
Running out of work is a finding about plan depth, and it is Mark's to fix,
not yours to invent around."* `process_next_item` with every `(BLD)`-owned,
explicitly-gated (`BO9`/`BO10`/`BO11`, "NEITHER LANE STARTS THESE WITHOUT
SAYING SO FIRST"), and suspended (`T1`–`T3`, decision #17) id skipped
reports `all_remaining_skipped: true`, `remaining: 0`. There is no further
un-gated CLI work written down. This is that finding, not a shortfall.

## Recommended next step

Two independent, unblocking threads, either can go first:

1. **Answer decision #17** (T1–T3's lane ownership) — the one thing this
   repo's own file surface cannot check itself (whether `land-lane` already
   owns or is building this).
2. **Fix the 7 pre-existing suite failures** named above — bounded,
   individually small, and the practical unlock for both U3's own
   recommendation (a real `mutate.mjs --resume` run) and a fully green
   default suite. None were caused by this run; all were found and named
   by it.
