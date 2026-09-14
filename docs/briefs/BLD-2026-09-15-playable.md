# LANE BRIEF — BLD, MAKE IT PLAYABLE. Long run.

**Terminal:** BLD · **Repository:** `C:\Code\sandbox-spike-codex` · **Branch:** `codex-lane`
**Mode:** autonomous, long run with a stopping point that spans items.

Linked worktree — `.git` is a FILE. Commit messages to
`$env:TEMP\COMMIT_MSG_BLD.txt`.

Policy is cited, never restated — `rule://lane-brief`.

---

## 0. START

`process_at("session-start")`, then again at every moment transition. Project id
`caliper-bld`. Generate this run's brief with the `lane_brief` prompt and commit
it.

**CLI is running concurrently.** It owns `public/scoring.js`,
`data/catalogue.json` and `scripts/migrate-catalogue-s2-fields.mjs`. You touch
none of those.

## 0.1 `_TO-DELETE/` — RESOLVED, AND YOUR RESTORE WAS RIGHT

Last run you found `_TO-DELETE/` empty, restored 56 files from HEAD, and flagged
the cause as unexplained. **The cause was Mark.** He moved them out deliberately
so they would stop affecting the process, and your restore — made in good faith
against an unexplained mass deletion — undid that.

**You did the right thing.** An unexplained deletion of the quarantine directory
is exactly what the standing rule says to stop on. Nothing to correct on your
side.

## 0.2 ITEM ZERO — REMOVE THEM. MARK HAS AUTHORISED IT EXPLICITLY.

**This supersedes `rule://quarantine`'s retention default for these files only,
and only because Mark has now named them.** The rule requires inventory →
categorise → Mark confirms the exact list → then delete. That has happened: the
inventory is the 56 files below, and Mark's instruction was *"remove the to
delete files they are causing issues."*

**Delete 55. KEEP `_TO-DELETE/LEDGER.jsonl`.**

| Path | Files | What |
|---|---|---|
| `_TO-DELETE/b1-board/` | 22 | The rejected board world — renderer, generator, `board.generated.json`, tests |
| `_TO-DELETE/old-world/` | 32 | The Phase 1 takedown — city plan, city render, layout, road network, tests |
| `_TO-DELETE/non-comparable-kitbash-fabric-shooter/` | 1 | One scratch shooter |
| `_TO-DELETE/LEDGER.jsonl` | 1 | **KEEP.** The record of everything already purged |

**Why the ledger stays:** it is the only audit trail of prior purges, and
`.gitignore` was deliberately shaped to keep it tracked while ignoring the
contents around it — commits `e5a80ac` and `7d1a9a0`, with a gate record each.
Deleting it would destroy the recovery record for everything removed before.

**Use `git rm`, in a commit.** A move or an unlink on disk does not stick: these
are tracked, so the next `git status` shows 56 deletions and the next lane
restores them — which is exactly what happened last run.

Before committing, append a `LEDGER.jsonl` line recording this purge: what, how
many, when, and that Mark authorised it by name. **The ledger is the mechanism
that makes a Tier 1 purge safe, and it is the last thing this directory does.**

Known and unaffected: `scripts/gen-city-summary.mjs` already fails on a missing
`public/city-plan.js`, quarantined by `e3c355b` long before this. Removing the
quarantined copy does not make that worse — it was already broken, and it is not
yours to fix in this run.

**If they vanish again with no commit whose message says Mark authorised it,
treat it exactly as you did last time.**

## 1. WHAT THIS RUN IS

**RC1 through RC5** in `docs/specs/REBUILD-CHECKLIST.md`, which carries each
item's own gate. This brief does not restate them.

Last run built the machinery: the board renders from real placements, the ghost
renders, reload round-trips byte-identically. **But no person can do any of
it.** Everything is driven by URL parameters. The overview and the board have
never been connected. I1's impostor atlas is baked and read by nothing.

The phase gate:

> *A person opens the page, sees a world worth looking at, **picks an area**,
> **places a building**, sees why that cell was worth choosing, and it is still
> there on reload.*

RB1–RB4 built the verbs. This run is the person.

## 2. THE GUARDS THAT MATTER HERE

**BUILD FROM ZERO.** `_TO-DELETE/` still contains a board renderer, a generator,
and — relevant to RC1 and RC2 specifically — old interaction and navigation code.
It is the **rejected** world. Nothing in there is read, referenced, copied or
repaired, not for reference, not to see how it handled picking. The plan records
this happening four times with an explicit *"do not do it a fourth"* that was
then ignored. **RC1 and RC2 are where the temptation peaks.** Do not.

**Tier 1 is Tier 1.** C2.2's interaction set is ghost, commit, cancel, remove.
**Undo is explicitly NOT in it** — R7 says the minimum is small and undo is not
part of it. Do not add it, do not add multi-select, do not add drag-to-place.
Widening scope here is how the vertical slice stops being a slice.

## 3. THE FAILURE CLASS THIS RUN IS MOST EXPOSED TO

Same as last run, one level up: **the input and the rule disagreeing.**

A click that places where the ghost read invalid. A commit the renderer shows and
the board does not contain. An area that opens when `area.js` would refuse it.
In every case both halves are individually green and the composition is broken.

**So assert against the real thing.** Piece counts come from the real board, not
the renderer. Area state comes from `area.js`, not from what was drawn. A test
that drives the renderer with a hand-built fixture proves the renderer works on
fixtures and nothing else.

And your own standing trap, caught twice and worth a third mention: **exit 0 is
not evidence a shot exists. Open the file and look at it.**

## 4. RC3 IS THE ONE WITH A NAMED DEFECT ALREADY

I1 baked a 64-angle impostor atlas, measured its texture cost honestly, and
**nothing reads it.** That is `rule://failure-patterns`' "a capability that is
built and unreachable from a real caller" — the same pattern the process
server's own orphan check exists to catch.

Its gate is deliberately a measurement, not a look: **triangle count measurably
lower with impostors on than off, at a distance where they are active.** No
measurable difference means they are not actually being used, whatever the code
says.

## 5. RC5 DEPENDS ON CLI AND MAY NOT UNBLOCK

RB3 is `[!]` with a live test that fails the moment `valueAt`/`valueIfPlaced`
exist. **That test is the signal** — when it goes red, finish the readout.

If S4 has not landed by the time you reach RC5, leave RB3 partial, say so, and
descend to the next written item. Do not stub scoring yourself.

If it has landed and the numbers look wrong on a real board — everything reading
weak, nothing distinguishable — **show them, do not tune them.** The falloff
anchor is an open question Mark has not answered, and a real board is exactly
what it was waiting for.

## 6. ATTEMPT BUDGET, AND THE STOPPING POINT

Attempt budget: **2 per item.**

**The stopping point spans items. Do not ask between them.** Finish an item,
record its gate, commit, push, take the next with `process_next_item`. Keep
going.

**Stop only when:**

1. **RC4 is committed** — the declared end. RC5 is taken if it unblocks.
2. **Budget is low**, with enough left for the handover. A run killed by the
   limit loses its handover, and the handover is what survives.
3. **A genuine blocker** `rule://decision-queue` cannot route around. Wanting
   Mark's opinion is a queue entry, never a stop.
4. **The escape clause fires** and the error is load-bearing.

Beyond RC4 with budget left: `rule://queue-exhaustion`, descend to the next
written item. Running out of time is expected; running out of work is a finding
about plan depth.

**Decisions will stack up and that is correct.**

## 7. FILES

A new interaction module and its tests, `public/board-renderer.js`,
`public/look-proof-scene.html`, the overview scene, the impostor sampling path,
`scripts/shoot-look-proof.mjs`, `docs/look-proof-shots/`.

**Not `public/scoring.js`. Not `data/catalogue.json`. Not the migration script.**
Cross-lane needs go in `docs/CROSS-LANE-REQUESTS.md`.

## 8. THE ONE THING NO RULE COVERS YET

The harness auto-promotes long commands to background tasks regardless of the
parameter. **The evidence is the runner's own `ℹ tests` / `ℹ pass` line; absent
it the run did not complete, whatever the exit code says.** Targeted tests only.

`cullingRatio.test.ts` has failed identically four times on its own internal
240-second timeout. Pre-existing, documented, **not yours to chase** — do not let
a fifth reproduction eat this run.
