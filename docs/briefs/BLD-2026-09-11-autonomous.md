# LANE BRIEF — BLD lane

**Terminal:** BLD lane (Claude Code)
**Repository:** `C:\Code\sandbox-spike-codex` — a **linked worktree**, so `.git`
is a FILE. Commit messages go to `$env:TEMP\COMMIT_MSG.txt`, never inside `.git`.
**Branch:** `codex-lane` — stay on it.
**Mode:** autonomous — Mark is away for a bounded period. Nothing waits;
decisions queue. **You have a declared stopping point** — this is not "keep
going as long as you can."

Written 2026-09-11 from Cowork, uncommitted. **Committing it is checklist item
0.** Read it critically and say if it is wrong about the code — `rule://escape-clause`.

---

## 1. THE OBJECTIVE

Push the branch, then close the comment-vulnerability instances this lane found
and named but time-boxed out of the last run — the ones whose own recorded
reasons say they mask a real bug rather than merely look risky.

## 2. THE PLAN

`docs/specs/COMPLETION-PLAN.md` PART 2 is this lane's checklist — **not**
`docs/audits/K6-BUILDINGS.md`, which is F2's own sub-checklist. Mistaking the
two ended a run early on 2026-09-11. COMPLETION-PLAN.md now exists on this
branch; the merge brought it.

Call `process_next_item` with that path rather than reading it by eye.

## 3. HOW WORK IS DONE

`rule://build-loop`. Every step, in order, none skipped.

## 4. THE GATE

Stated per checklist item. State what RED looks like, not only green —
`rule://standard-of-proof`.

## 5. FILES

This lane owns buildings, props, kitbash and interface. World files — the board,
the generator, roads, terrain, `city-render.js`'s world-building — belong to the
CLI lane even though the merge brought them here. File a cross-lane request in
`docs/CROSS-LANE-REQUESTS.md` and carry on.

## 6. REVIEW

`rule://reviewer-independence`. Blind subagent reviews the plan before you
implement, in every mode. Do not tell it what you suspect.

## 7. SUBAGENTS

`rule://subagent-contract`. Attempt budget: 3.

## 8. WHEN SOMETHING IS MARK'S TO DECIDE

`rule://decision-queue`. Never block.

## 9. WHEN YOU MAY STOP

`rule://stopping-authority`, and the declared stopping point in §11.

**Merge and deploy:** not on your own initiative. The `b1-land -> codex-lane`
merge landed at `5810c2f` under Mark's authorisation and is finished; that
authorises nothing further. **Item 1 contains an explicit push authorisation.
That is not a merge.**

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

**1. Push.** **You are authorised to push `codex-lane` to its origin** — R6 in
PART 4. It was 7 commits ahead before the merge and carries the whole merge now.
Push `codex-lane` only. Not `main`.

*Gate:* `git log origin/codex-lane` shows the push.

**2. Tick F1.** It measured **16** reachable facade materials post-merge against
a gate asking for "a floor well above 4". Tick it in `COMPLETION-PLAN.md` PART 2
with the command as evidence. Do not re-work it — it is done, and re-working
finished items is what cost the last run its time.

*Gate:* the tick carries the command that produced 16.

**3. The two priority `rawSourceScan.test.ts` exclusions.** Your own handover
named these as the ones whose reasons point at masking a real bug, in this
order: `generatedClaimsAreCurrent.test.ts`, then `reachability.test.ts`. Each
through the full loop, each with its own mutation watched red and proved
CAUGHT.

*Gate:* RED is the check passing against a source file where the real code was
removed and only a comment mentioning it remains. That is the defect shape —
`propManifest.test.ts` matched a historical comment for weeks and hid a measured
18% footprint discrepancy.

**4. The three lower-risk `rawSourceScan.test.ts` exclusions**, after the two
above, in the priority order their own recorded reasons imply. Same loop, same
standard, each with its own mutation.

**5. The two "must be present" checks named as real-but-unfixed** in the
exclusions added at the merge — `boardGenerator.test.ts`'s
`halfRoadFor(`/`roadWidthFor(` checks, and `terrainLandmassOwnership.test.ts`'s
exports check.

**These are world-domain test files.** If fixing one means editing world
*source*, stop and file a cross-lane request instead. If it only means wrapping
the test's own `readFileSync` in `stripSourceComments`, that is a gate this lane
owns and yours to fix. Say which of the two it turned out to be, per file.

*Gate:* the same shape as item 3 — the check must fail when the real code is
gone and only a comment remains.

**6. K7.1, the atlas gap — code-verified, never visually verified.**
**Check the host's free memory FIRST and record the number in the handover.**
It was 0.65 GB on 2026-09-10, which is why every browser-dependent item was
blocked. Both suites have since finished and the merge is done, so it may have
freed. If it is still near 0.65 GB, say so with the number and skip to §12 —
do not rediscover the same wall a third time.

If memory allows: verify the atlas visually, the way B3 was verified —
`scripts/shoot.mjs`, look at the output, and say what you saw. A code-verified
claim that has never been looked at is exactly the gap this item names.

*Gate:* a real shot on disk, described. "The code says it should work" is not
this item's gate and never was.

---

## 11. THE DECLARED STOPPING POINT

**Stop when item 6 is committed or explicitly skipped on the memory reading,
even if time remains.** This is an autonomous run, not an overnight one — it
ends on its own terms rather than when Mark returns.

**Write the handover BEFORE your budget gets close.** A run cut off by the
usage limit loses its handover, and the handover is the part that survives. If
the budget looks short, finish the current item's loop, write up, and stop
early — that is a success, not a shortfall.

---

## 12. IF AN ITEM IS ALREADY DONE OR BLOCKED

Do not stop and do not invent. Take the next written item from this list, in
order, and say in the handover which you skipped and why:

1. B6 — the interface. PART 2's own text: mobile is the open part, world fills
   the screen, landscape, prompt box findable, touch, and the `touch-action` gap
   on `#world-canvas` that was found and never fixed. Its gate is explicit:
   **measured on a real viewport, never a stylesheet substring.** Middle-mouse
   pan (`9d54d05`), the inspector clearing the nav, and the nav wheel are
   already done — do not rebuild them. If a real viewport needs a browser and
   memory refuses, the `touch-action` gap itself is a source-level finding you
   can still trace and record.
2. The wedge-wheel screenshot with panels closed, and U1's re-watch in
   `e2e/panelOverlap.spec.ts`.
3. F2's own K6 checklist — `docs/audits/K6-BUILDINGS.md`, reconciled on
   2026-09-11. Re-read it; if the reconciliation opened anything that was
   previously masked, that is written work, not invented.

The declared stop in §11 still applies. This list exists so a finished or
blocked item does not end the run, which is what happened to this lane on
2026-09-11 after twenty minutes.

---

## 13. HOST CONTENTION

The CLI lane runs concurrently and may start a mutation run. Before starting a
full suite, check whether another `node test` process is live; if one is, do
other work and come back. **Never kill a process; record PIDs.**

## 14. THE HANDOVER

Write and commit as you go, after every item, so a crash costs one step.
