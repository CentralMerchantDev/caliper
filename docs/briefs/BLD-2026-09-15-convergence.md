# LANE BRIEF — BLD, THE CONVERGENCE. Long run.

**Terminal:** BLD · **Repository:** `C:\Code\sandbox-spike-codex` · **Branch:** `codex-lane`
**Mode:** autonomous, long run with a declared stopping point that spans items.

Linked worktree — `.git` is a FILE. Commit messages to
`$env:TEMP\COMMIT_MSG_BLD.txt`.

Policy is cited, never restated — `rule://lane-brief`.

---

## 0. START

`process_at("session-start")`, then again at every moment transition. Project id
`caliper-bld`. Generate this run's brief with the `lane_brief` prompt and commit
it.

`codex-lane` is current with `origin/main` as of `8c9b3a9`, so CLI's scoring work
— `value()`, the falloff, the dirty set — is in your tree. **CLI is running
concurrently on S4 onward.** It owns `public/scoring.js`, `data/catalogue.json`
and the migration script. You do not touch those three.

## 1. WHAT THIS RUN IS

**RB1, RB2, RB3, RB4, RB5** in `docs/specs/REBUILD-CHECKLIST.md`, which carries
each item's own gate. This brief does not restate them.

Everything both lanes have built for two weeks has never been in one view. The
board is data. Placement is data. Scoring is a pure function nothing displays.
The look is a hardcoded array of four to twenty pieces. **Nothing renders a
board.**

At the end of this run, the phase gate should be reachable:

> *A person opens the page, sees a world worth looking at, picks an area, places
> a building, sees why that cell was worth choosing, and it is still there on
> reload.*

RB1 through RB4 are that sentence, in order. RB5 is the part Mark has already
told us reads wrong.

## 2. THE GUARD THAT MATTERS MOST HERE

**BUILD FROM ZERO.** `_TO-DELETE/b1-board/` contains a board renderer, a
generator and a generated board. It is the **rejected** world. Nothing in
`_TO-DELETE/` is read, referenced, copied, or repaired — not for reference, not
to see how it handled instancing, not at all.

`REBUILD-PLAN.md`'s 2026-09-13 correction says *"Do not do it a fourth."* It then
did. **This is the item where the temptation is strongest**, because a board
renderer is exactly what is sitting in there. Do not do it a fifth.

What you compose instead is proven and current: `look-proof-material.js`,
`area-board.js`, `placement.js`, and the catalogue's `glb` field your own BO7A
just bound.

## 3. THE FAILURE CLASS THIS RUN IS MOST EXPOSED TO

Every gate in RB1–RB4 is a variant of one thing: **the render and the rule
disagreeing.**

A board that accepts a placement the render does not show. A ghost that looks
placeable where `place()` would refuse. A reload that drops a piece silently. In
each case both halves are individually green and the composition is broken —
which is `rule://failure-patterns`' "built beside, not built into", and it is
invisible to any test that exercises only one side.

**So assert the composition, not the parts.** Place through the real `place()`,
render through the real renderer, and check the actual output. A test that calls
the renderer with a hand-built fixture proves the renderer works on fixtures.

And your own standing trap, which you have caught twice: **a render returning
exit 0 is not evidence a shot exists.** Open the file and look at it.

## 4. RB3 IS THE ONE THAT MATTERS

§S4's readout is what §A2 says every project of this kind skips, and it is why
scoring was built at all. `valueAt` and `valueIfPlaced` are CLI's, landing in S4
— **call them, never reimplement them, and do not edit `public/scoring.js`.**

If S4 has not landed when you reach RB3, build the readout against the functions'
signatures and say plainly in the handover that it is unverified against the real
implementation. Do not stub scoring yourself.

**If the numbers look wrong on a real board, that is a finding, not a bug to
tune.** There is an open question Mark has not answered — whether the falloff
curve should be anchored at distance 1 rather than 0, since as built the nearest
possible neighbour contributes only ~46% of its nominal value. A real board is
exactly what that question was waiting for. Show the numbers; do not adjust them.

## 5. ATTEMPT BUDGET, AND THE STOPPING POINT

Attempt budget: **2 per item.**

**The stopping point spans items. Do not ask between them.** Earlier runs ended
after every single item because the lane finished one and asked whether to
continue — which is not on `rule://stopping-authority`'s list, and the fault was
the brief's for never declaring a stop covering more than one item.

Finish an item, record its gate, commit, push, take the next with
`process_next_item`. Keep going.

**Stop only when:**

1. **RB5 is committed** — the declared end.
2. **Budget is low**, with enough left to write the handover. A run killed by the
   limit loses its handover, and the handover is what survives.
3. **A genuine blocker** `rule://decision-queue` cannot route around — you cannot
   take the least irreversible path and continue. Wanting Mark's opinion is a
   queue entry, never a stop.
4. **The escape clause fires** and the error is load-bearing.

If you reach RB5 with budget left, `rule://queue-exhaustion` — descend to the
next written item rather than stopping. Running out of time is expected; running
out of work is a finding about plan depth.

**Decisions will stack up and that is correct.** A growing queue is the queue
working, not a reason to stop.

## 6. FILES

A new render module and its tests, `public/look-proof-scene.html`,
`scripts/shoot-look-proof.mjs`, `docs/look-proof-shots/`, and the ground assets
for RB5.

**Not `public/scoring.js`. Not `data/catalogue.json`. Not
`scripts/migrate-catalogue-s2-fields.mjs`.** Those are CLI's this run. Anything
else outside that surface, say so first. Cross-lane needs go in
`docs/CROSS-LANE-REQUESTS.md`.

## 7. THE ONE THING NO RULE COVERS YET

The harness auto-promotes long commands to background tasks regardless of the
parameter. **The evidence is the runner's own `ℹ tests` / `ℹ pass` line; absent
it the run did not complete, whatever the exit code says.** Targeted tests only.

`cullingRatio.test.ts` has now failed identically four times on its own internal
240-second `page.waitForFunction` timeout. It is pre-existing, documented, and
**not yours to chase** — do not let a fifth reproduction eat this run.
