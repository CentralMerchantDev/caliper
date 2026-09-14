# LANE BRIEF — CLI lane

**Terminal:** CLI lane (Claude Code)
**Repository:** `C:\Code\sandbox-spike`
**Branch:** `b1-land` — stay on it.
**Mode:** autonomous — Mark is away for a bounded period. Nothing waits;
decisions queue. **You have a declared stopping point** — this is not "keep
going as long as you can."

Written 2026-09-11 from Cowork, uncommitted. **Committing it is checklist item
0.** Read it critically and say if it is wrong about the code — `rule://escape-clause`.

---

## 1. THE OBJECTIVE

Land a plan correction written from outside this lane, push the branch for the
first time in two days, then establish whether a bug in the mutation harness
invalidates evidence this project already published.

## 2. THE PLAN

`docs/specs/COMPLETION-PLAN.md` is the checklist. Tick there.

Call `process_next_item` with that path rather than reading it by eye, per
`rule://queue-exhaustion`.

Tick an item only when its gate is green **and** the commit exists. Record
evidence with `process_record_gate`.

## 3. HOW WORK IS DONE

`rule://build-loop`. Every step, in order, none skipped.

## 4. THE GATE

Stated per checklist item below. Where an item has no gate, that item is
incomplete as written — say so before starting it rather than inventing one.

State what RED looks like, not only green — `rule://standard-of-proof`.

## 5. FILES

Not restricted. Prefer the smallest surface that satisfies the gate. Files
owned by the BLD lane (buildings, props, kitbash, interface) are not yours:
file a cross-lane request in `docs/CROSS-LANE-REQUESTS.md` and carry on.

## 6. REVIEW

`rule://reviewer-independence`. A blind subagent reviews the plan before you
implement, in every mode. Do not tell it what you suspect.

## 7. SUBAGENTS

`rule://subagent-contract`. Attempt budget: 3.

## 8. WHEN SOMETHING IS MARK'S TO DECIDE

`rule://decision-queue`. Never block.

## 9. WHEN YOU MAY STOP

`rule://stopping-authority`, and the declared stopping point in §11.

**Merge and deploy:** not on your own initiative. Merges and deploys are
executed in this lane when Mark hands it a merge prompt. He has not.
**Item 1 below contains an explicit push authorisation. That is not a merge.**

---

## 10. THIS RUN'S CHECKLIST

**0. Commit this brief — and first, confirm the rules you are being served are
the current ones.**

`C:\Code\process-mcp` changed on 2026-09-11: the merge guard was reworded in
three places and a new rule, `lane-brief`, was added and wired into
`session-start`. A session connected to a stale server gets the OLD rules and
will not know it.

Call `process_get_rule` for `lane-brief`. If it returns the rule, your server is
current — say so and carry on. **If it returns nothing, stop and tell Mark**
rather than working from rules that were superseded this morning. Do not restart
anything yourself.

**1. The uncommitted plan edit, then push.**
`docs/specs/COMPLETION-PLAN.md` carries an uncommitted edit written from
outside this lane: a new `R3.5` in PART 4 ("the board is the default render"),
a pointer to it from R4, and a correction to THE MINIMUM SENDABLE CUT, which
read "the archipelago renders" — a sentence B3 satisfies while the board stays
switched off for every visitor. Read the diff, check it against PART 1's own B3
line and the two perf-gate numbers it cites (culling 65.8% against <40%, 7,851
draw calls against <=900), say if it is wrong, then commit it.

Then **push `b1-land` to its origin. You are authorised to do so** — this is R6
in PART 4, "Push every branch. The whole rebuild lived on one disk for a full
day." It has now been two days and the largest night of work this project has
had. Push `b1-land` only. Not `main`.

*Gate:* the plan edit committed; `git log origin/b1-land` shows the push.

**2. Decision #10 — the regex bug in `scripts/mutate.mjs`.**
Read `docs/DECISIONS-FOR-MARK.md` #10 in full and verify its claims against the
code rather than carrying them forward.

**Answer this before fixing anything: does the bug affect mutation results
ALREADY TAKEN, or only future ones?** Answer from the artefact — read
`test/.mutate-results.json` and the manifest, find whether any RECORDED
mutation matches the buggy pattern. That is a file read and costs nothing, so
do it first. Report the count either way; zero is a real and welcome answer, an
assumed zero is not.

This matters more than the fix. `mutate.mjs` produces the evidence `README.md`
publishes and `src/generatedClaimChecks.ts` gates. If recorded results are
affected, the published mutation sentence is unsupported — a C4 published-claims
failure, not a tooling bug.

Then fix it through the full loop. Mutating the mutation harness is awkward and
not optional: `rule://build-loop` Step 10 says a new control is not exempt from
the standard it enforces.

If past results ARE affected, do **not** start re-running them — 15+ minutes
each, on the order of 129. Scope it: which mutations, how long, what README
must say meanwhile. Queue it with a recommendation.

*Gate:* RED is the fixed regex failing to catch a case the buggy one provably
could not. Prove CAUGHT.

**3. C1's two never-re-run mutations** — `wooded-exclusion` and
`mainland-boundary`, whose stale `expect` strings were corrected but never
re-run. Re-run them, record the real result, and say explicitly whether #10's
fix changes how they are scored. That interaction is why these are third.

*Gate:* the real recorded result for both, from a command run today.

**4. R3 — reconcile this branch's real red count.**
PART 4's R3 reads: "Full suite green, or every red named and justified in one
place." Nobody has done this on `b1-land` since the six road steps and the
regeneration landed. Two stale numbers are in circulation — 46 failures
measured earlier on `b1-land`, 7 on `codex-lane` — and they are from different
branches at different moments, so neither describes this tree.

Run the full suite once, output redirected straight to a file per
`gen-test-count.mjs`'s own double-buffering warning. Then name **every**
failure in one place, each classed as: already-decided-red with the decision
number, world-scale-dependent after the regeneration, genuinely new, or
unknown-and-untraced. "Unknown" is an acceptable class; an unexamined failure
silently folded into a known category is not.

This is on the minimum sendable cut and it is what any merge decision waits on.

*Gate:* RED is any failure in the file with no class beside it. Green is a
single document where every failure has one.

**5. C2 — the dead-export allowlist, broken down by real mechanism.**
Product, demo-only, test-only, unreachable, and the fifth class the plan names:
data-reachable, where a string key selects from a registry and the import graph
cannot see it. No number from this file may be published anywhere until it is
split this way — that is C2's own wording.

It grew to 2,771 entries at the 2026-09-11 merge and carries a provenance note
saying neither side was individually reviewed. The BLD lane's F3 work found a
third bucket worth expecting here: exports that look unreachable but are
load-bearing internal helpers, over-exported rather than dead.

*Gate:* every entry carries a mechanism, and the count per mechanism is
generated rather than asserted.

---

## 11. THE DECLARED STOPPING POINT

**Stop when item 5 is committed, even if time remains.** This is an autonomous
run, not an overnight one — it ends on its own terms rather than when Mark
returns.

**Write the handover BEFORE your budget gets close**, not after item 5. A run
cut off by the usage limit loses its handover, and the handover is the part
that survives. If the budget looks short, finish the current item's loop, write
up, and stop early — that is a success, not a shortfall.

---

## 12. IF AN ITEM IS ALREADY DONE OR BLOCKED

Do not stop and do not invent. Take the next written item from this list, in
this order, and say in the handover which you skipped and why:

1. C1's remaining unrun mutations — the SURVIVED one, and `b2-6-no-live-route`.
2. C3 — all seven standing gates green simultaneously. This has never happened;
   establishing **why** is the work, not forcing it green.
3. B2.8 — the ~30 old-world tests. `ca413a0` deferred them behind B4 because
   their import chain is what B4 replaces. B4 has moved since: `ROAD_WIDTH` is
   retired and roads carry real classes. **Re-check whether that deferral still
   holds** rather than assuming it does — if some of the 30 are now re-pinnable,
   say which and do those.
4. R3.5 — the two perf gates blocking the board from being the default render:
   culling 65.8% against a <40% ceiling, 7,851 draw calls against <=900. Both
   measured un-gated by B3 and never fixed. Investigating what drives them is
   real, written work; do not attempt to loosen either threshold.
5. `docs/WORLD-BUILD-PLAN.md` — a second ledger with its own open items. Its
   next two were reported blocked on Mark; read it yourself and confirm that is
   still true before skipping past it.

The declared stop in §11 still applies. This list exists so a finished or
blocked item does not end the run, which is what happened to the BLD lane on
2026-09-11 after twenty minutes.

---

## 13. HOST CONTENTION

The BLD lane runs concurrently. Before starting any mutation run or full suite,
check whether another `node test` process is live; if one is, do the cheap
file-reading work first and come back. **Never kill a process; record PIDs.**
Two concurrent suites produced a false regression-gate red on 2026-09-10.

## 14. THE HANDOVER

Write and commit as you go, after every item, so a crash costs one step.
