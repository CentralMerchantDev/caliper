# LANE BRIEF — CLI, OVERNIGHT

**Terminal:** CLI · **Repository:** `C:\Code\sandbox-spike` · **Branch:** `scoring`
**Mode:** overnight. Mark is out. Nothing waits; decisions queue.

`docs/OVERNIGHT-RUN.md` is the operating manual — read it, and note its 4 GB
memory floor has been **corrected out**: memory pressure is a "what is holding
memory" question, never a "wait for more free memory" one, and **no process is
killed** to get it.

Policy is cited, never restated — `rule://lane-brief`.

---

## 0. START

`process_at("session-start")`, then again at every moment transition. Generate
this run's brief with the `lane_brief` prompt, mode `overnight`, and commit it.

## 1. ITEM ZERO — MERGE `scoring` INTO `main` AND PUSH. AUTHORISED.

**Mark authorised this explicitly before leaving.** ADR-020 makes the merge
decision his; execution happens in the lane on his prompt, and this is that
prompt. Close out in the lane that built it — that is this one.

**BLD is blocked on it and will stay blocked all night otherwise.** Its RC5 —
§S4's on-screen value readout, the payoff of everything scoring was built for —
needs `valueAt` and `valueIfPlaced`, which exist only on `origin/scoring`.

Merge, push, and **record a `pushed` and a `merged` event** so BLD can see where
it landed without guessing a ref. That guess has failed twice.

Then carry on. Do not wait for BLD.

## 2. THE ORDER

**U1, U2, U3, U4.** Gates are in `docs/specs/REBUILD-CHECKLIST.md`; not restated
here.

**T1–T3 (terrain) is suspended**, per your own decision #17 — it may be
land-lane's work in another repository. Stopping rather than risking throwaway
work was the right call. Do not resume it on your own initiative.

## 3. WHY U1–U3 COME BEFORE MORE FEATURES

**Three measuring instruments are broken, and every claim this project makes
rests on them.**

`gen:claims` cannot run, so the published test count cannot be regenerated —
`rule://published-claims` is unenforceable while its own generator is broken.
`cullingRatio.test.ts` blocks every full-suite run, five reproductions deep with
a cause nobody disputes. `mutate.mjs` has never once completed here, and the
manifest it writes is the formal evidence the project claims to keep.

A project whose entire discipline is standard-of-proof cannot keep failing to
measure itself. **This is not maintenance; it is the foundation the rest of the
evidence sits on.**

U1's trigger is also self-inflicted and worth knowing: item zero deleted
`_TO-DELETE/`, which held the last copy of `public/city-plan.js`.
`gen-city-summary.mjs` imported it. That import can no longer resolve at all.
**Do not restore anything from the deleted quarantine to fix it** — decide
whether that script is retired or re-pointed.

## 4. U4 IS THE ONE THAT IS NOT MAINTENANCE

Side B, §B1–B3. Step 10 of the revised build order, and the mechanic that makes
this CALIPER rather than a city builder: *a player-authored piece is a catalogue
entry. Full stop.*

Data and logic only. No interface. Read B1–B3 in full before planning, and read
§B4 — what stays out of scope there is load-bearing.

## 5. ATTEMPT BUDGET AND THE STOPPING POINT

Attempt budget: **2 per item.**

**Do not ask between items.** Finish, record the gate, commit, push, take the
next with `process_next_item`. Keep going.

**Stop only when:**

1. **U4 is committed** — the declared end.
2. **Budget is low**, with enough left to write the handover. **Reserve it.** A
   run killed by the limit loses its handover, and the handover is what
   survives the night.
3. **A genuine blocker** `rule://decision-queue` cannot route around. Wanting
   Mark's opinion is a queue entry, never a stop. Four decisions are already
   open from your last run; more is correct, not a problem.
4. **The escape clause fires** and the error is load-bearing.

Past U4 with budget left: `rule://queue-exhaustion` — descend to the next
written item. Running out of time is expected. Running out of work is a finding
about plan depth, and it is Mark's to fix, not yours to invent around.

## 6. FILES

`scripts/gen-city-summary.mjs`, `scripts/gen-test-count.mjs`,
`test/cullingRatio.test.ts`, `scripts/mutate.mjs`, the Side B modules and their
tests, `docs/specs/`.

**Not `public/board-renderer.js`, not `public/look-proof-*`, not
`public/pointer-interaction.js`** — BLD is live in those. Cross-lane needs go in
`docs/CROSS-LANE-REQUESTS.md`.

## 7. THE ONE THING NO RULE COVERS YET

The harness auto-promotes long commands to background tasks regardless of the
parameter. **The evidence is the runner's own `ℹ tests` / `ℹ pass` line; absent
it the run did not complete, whatever the exit code says.**

You drafted this as a rule in the decision queue last run rather than writing it
into the out-of-lane `process-mcp` repo. That was the right call and it stands.

**BLD is running concurrently and both lanes share one machine.** Your own S4
run traced a `mutate.mjs` stall to exactly that contention. If something stalls
at 0% CPU, check what else is running before concluding anything is broken.
