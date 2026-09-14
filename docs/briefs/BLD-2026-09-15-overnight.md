# LANE BRIEF — BLD, OVERNIGHT

**Terminal:** BLD · **Repository:** `C:\Code\sandbox-spike-codex` · **Branch:** `codex-lane`
**Mode:** overnight. Mark is out. Nothing waits; decisions queue.

Linked worktree — `.git` is a FILE. Commit messages to
`$env:TEMP\COMMIT_MSG_BLD.txt`.

`docs/OVERNIGHT-RUN.md` is the operating manual. Its 4 GB memory floor has been
**corrected out**: memory pressure is a "what is holding memory" question, never
a "wait for more free memory" one, and **no process is killed** to get it.

Policy is cited, never restated — `rule://lane-brief`.

---

## 0. START

`process_at("session-start")`, then again at every moment transition. Project id
`caliper-bld`. Generate this run's brief with the `lane_brief` prompt, mode
`overnight`, and commit it.

## 1. ITEM ZERO — CHECK FOR THE MERGE, THEN NEVER WAIT FOR IT AGAIN

CLI has been authorised by Mark to merge `scoring` into `main` and push as its
own item zero tonight. That carries **S4 — `valueAt` and `valueIfPlaced`** —
which is what RC5 needs and what has kept the value readout blocked.

**At the start, and again at each moment transition:** fetch, and check whether
S4 is on `origin/main` **by name**. CLI will also record `pushed` and `merged`
events, so `node scripts/query-event-log.mjs` can answer it without guessing a
ref — the guess has failed twice and the ref-by-name check has worked twice.

**If it is there:** merge `main` into `codex-lane`, push, and do **RC5 first**.
It is the highest-value item in this brief by a distance.

**If it is not:** carry on with CP1 and check again later. `rule://stopping-
authority` does not list "waiting for another lane" as a reason to stop. A lane
that waits is stalled; a lane that checks and moves on is working.

## 2. THE ORDER

**RC5 (when unblocked), then CP1, CP2, CP3.** Gates are in
`docs/specs/REBUILD-CHECKLIST.md`; not restated here.

## 3. RC5 — THE PAYOFF, AND WHAT TO DO IF IT LOOKS WRONG

§S4's readout is what §A2 says every project of this kind skips, and the only
reason scoring was built at all. RB3 already built the adapter, the wiring and
an honest "unavailable" state, and left a live test that fails the moment S4
exists. **That test is the signal.**

**Call CLI's functions. Do not reimplement scoring. Do not edit
`public/scoring.js`.** Its signature matched RB3's disclosed guess exactly, so
the adapter should drop in.

**If the numbers look wrong on a real board — everything reading weak, or
nothing distinguishable between good cells and bad — show them, do not tune
them.** There is an open question Mark has not answered: whether the falloff
curve should be anchored at distance 1 rather than 0, since as built the nearest
possible neighbour contributes only ~46% of its nominal value. **A real board
with real numbers on screen is exactly what that question was waiting for**, and
a screenshot of it is worth more to him than a tuned constant.

## 4. CP1–CP2 — THE CATALOGUE, AND THE LINE YOU DO NOT CROSS

38 of 50 entries have no mesh, so 38 pieces cannot be placed and seen.

**Bind meshes. Do not touch game data.** No new entries, no changed category,
footprint or adjacency — those are CLI's, and A1's discipline holds: a number
you cannot justify goes to the decision queue, never into the file. An entry
with no plausible CC0 match is a **finding**, not a licence to force a mesh that
does not fit its footprint class.

CP2's contact sheet is how a catalogue is actually judged. R2 and A8 both name
"does it read as one coherent kit" as what kills projects of this kind, and a
wall of thumbnails presented as a pass is the failure. **Say which pieces look
wrong beside the others.**

## 5. CP3 IS NOT CODE

Five before/after pairs are waiting on Mark's eye — N1a, N1b, N1c, RB5, RC4 —
scattered across `docs/look-proof-shots/`. Gather them into one short document:
each pair by path, what changed, your own honest read.

**Do not re-render. Do not re-tune.** The point is that one judgement can happen
in a single sitting instead of five.

## 6. ATTEMPT BUDGET AND THE STOPPING POINT

Attempt budget: **2 per item.**

**Do not ask between items.** Finish, record the gate, commit, push, take the
next. Keep going.

**Stop only when:**

1. **CP3 is committed** — the declared end.
2. **Budget is low**, with enough left for the handover. **Reserve it.** A run
   killed by the limit loses its handover, and the handover is what survives.
3. **A genuine blocker** `rule://decision-queue` cannot route around. Wanting
   Mark's opinion is a queue entry, never a stop.
4. **The escape clause fires** and the error is load-bearing.

Past CP3 with budget left: `rule://queue-exhaustion`, descend to the next
written item.

## 7. FILES

`public/board-renderer.js`, `public/pointer-interaction.js`, the overview page,
`public/look-proof-*`, `scripts/link-catalogue-meshes.mjs`,
`scripts/normalise-kit-textures.mjs`, `scripts/shoot-look-proof.mjs`, the asset
directories, `docs/look-proof-shots/`.

**Not `public/scoring.js`. Not `data/catalogue.json`'s game fields.** CLI is
live in those. Cross-lane needs go in `docs/CROSS-LANE-REQUESTS.md`.

## 8. STANDING GUARDS WORTH ONE LINE EACH

**`_TO-DELETE/` is gone, deleted on Mark's explicit instruction, with the purge
recorded in `LEDGER.jsonl`.** Do not restore it. If files reappear there, that
is a finding.

**Exit 0 is not evidence a shot exists — open the file and look at it.** Your
own first look-proof render was a blank white canvas with zero console errors
and `draw calls: 1`. You have caught that class twice.

**CLI is running concurrently on one machine.** A stall at 0% CPU may be
contention, not a hang — CLI's own S4 run traced exactly that. Check what else
is running before concluding anything is broken, and **kill nothing**.
