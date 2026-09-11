# LANE BRIEF — BLD lane, second autonomous run, 2026-09-11

**Terminal:** BLD lane (Claude Code)
**Repository:** `C:\Code\sandbox-spike-codex` — a **linked worktree**, so `.git`
is a FILE. Commit messages go to `$env:TEMP\COMMIT_MSG.txt`.
**Branch:** `codex-lane` — stay on it.
**Mode:** autonomous — Mark is out for roughly three hours. Nothing waits;
decisions queue. **Declared stopping point in §11** — this is not "keep going as
long as you can."

Written from Cowork, uncommitted. **Committing it is checklist item 0.** Read it
critically and say if it is wrong about the code — `rule://escape-clause`.

---

## 1. THE OBJECTIVE

Everything this lane has been blocked on for days is now open. The 4 GB memory
floor was retired earlier today after being tested for the first time: renders
completed at **0.02 GB free**, needing about **400 MB**, against a gate
demanding 4,000. K7.1, B6 and the wedge-wheel screenshot were all blocked by
that number and nothing else.

This run is the visual and interface work that was never possible before.

## 2. THE PLAN

`docs/specs/COMPLETION-PLAN.md` PART 2 is this lane's checklist — **not**
`docs/audits/K6-BUILDINGS.md`, which is F2's own sub-checklist. Mistaking the
two ended a run early on 2026-09-11.

Call `process_next_item` with that path rather than reading it by eye.

## 3. HOW WORK IS DONE

`rule://build-loop`. Every step, in order, none skipped.

## 4. THE GATE

Stated per item in §10. State what RED looks like, not only green —
`rule://standard-of-proof`.

## 5. FILES

Buildings, props, kitbash and interface are this lane's. The world — the board,
the generator, roads, terrain, `board-render.js` — belongs to the CLI lane, **and
it is actively editing `board-render.js` this run.** Do not touch it. File a
cross-lane request in `docs/CROSS-LANE-REQUESTS.md`.

## 6. REVIEW

`rule://reviewer-independence`. Blind subagent reviews each plan before you
implement. Do not tell it what you suspect.

## 7. SUBAGENTS

`rule://subagent-contract`. Attempt budget: 3.

## 8. WHEN SOMETHING IS MARK'S TO DECIDE

`rule://decision-queue`. Never block.

## 9. WHEN YOU MAY STOP

`rule://stopping-authority`, and §11.

**Merge and deploy:** not on your own initiative. `codex-lane` is already
pushed; nothing further is authorised this run.

---

## 10. THIS RUN'S CHECKLIST

**0. Commit this brief — and first confirm your rules are current.**
`C:\Code\process-mcp` changed today. Call `process_get_rule` for `lane-brief`.
If it returns the rule, your server is current. If not, say so and carry on —
the run does not depend on it, but a stale server should be known.

**Then read `docs/OVERNIGHT-RUN.md`'s memory line before anything visual.** It
was rewritten today with a measured figure replacing the unsourced 4 GB. Confirm
for yourself that it no longer blocks you, rather than acting on this brief's
summary of it.

**1. K7.1 — the atlas gap. Code-verified, never visually verified.**

This item has existed unclosed because looking at it was impossible. It is now
possible. Verify it the way B3 was finally verified: `scripts/shoot.mjs`, a real
image on disk, and **say what you actually saw**.

*Gate:* a shot on disk, described in the commit. "The code says it should work"
is not this item's gate and never was — that is precisely the gap K7.1 names.

**2. B6 — the interface, starting with the defect that is already named.**

PART 2's own text: *"Mobile is the open part: world fills the screen, landscape,
prompt box findable, touch, and the touch-action gap on `#world-canvas` found
and never fixed."* Its gate is explicit: **measured on a real viewport, never a
stylesheet substring.**

Middle-mouse pan (`9d54d05`), the inspector clearing the nav, and the nav wheel
are **already done — do not rebuild them.**

Take the `touch-action` gap first. It is already found; what is missing is the
fix and a gate that would catch it regressing.

*Gate:* RED is the check passing against a stylesheet where the rule is absent
but a comment mentions it — the `rawSourceScan` defect shape this lane spent
yesterday eliminating. Measure on a real viewport.

Then the rest of B6's mobile list in its own order: world fills the screen,
landscape, prompt box findable, touch.

**3. The wedge-wheel screenshot with panels closed, and U1's re-watch in
`e2e/panelOverlap.spec.ts`.**

Also memory-blocked until today. Same standard: a real shot, looked at.

---

## 11. THE DECLARED STOPPING POINT

**Stop when item 3 is committed, or when item 2's mobile list is exhausted,
whichever comes first.** B6 is large; finishing part of it well beats starting
all of it.

**Write the handover BEFORE the budget gets close.** A run cut off by the limit
loses it, and the handover is the part that survives.

---

## 12. IF AN ITEM IS ALREADY DONE OR BLOCKED

Take the next written item, in order, and say which you skipped and why:

1. **F2's K6 checklist** — `docs/audits/K6-BUILDINGS.md`, reconciled on
   2026-09-11. Re-read it; if the reconciliation exposed anything previously
   masked, that is written work, not invented.
2. **The remaining `rawSourceScan.test.ts` exclusions**, if any are still open
   after yesterday's seven-file sweep. Check rather than assume — the sweep
   closed more than was scoped.
3. **F3's finding, recorded not acted on:** 0 of 62 kitbash parts and 0 of 40
   designs are reachable from the product world. **Do not start wiring the kit
   — that is not written work and `rule://queue-exhaustion` forbids inventing
   it.** If you reach this point, write up what wiring it would involve as a
   proposal for Mark and stop there.

---

## 13. HOST CONTENTION — READ THIS, IT HAS COST REAL TIME

The CLI lane is running concurrently and is **editing `board-render.js`** —
replacing 21,007 per-piece meshes with instanced ones. Two consequences:

- **Do not touch that file**, and expect the board's render behaviour to change
  under you mid-run. If a visual result looks wrong in a way that involves the
  board rather than the atlas or the interface, check whether CLI has landed
  something before treating it as your defect.
- Its gate measurement is a render, late in its run. Yours are renders, early.
  **Before starting any render, full suite or browser run, check whether another
  `node test`, `shoot.mjs` or headless Chromium process is live.** If one is, do
  other work and come back. Two concurrent suites produced a false
  regression-gate red on 2026-09-10.

**Never kill a process. Record PIDs.**

## 14. THE HANDOVER

Write and commit as you go, after every item, so a crash costs one step.
