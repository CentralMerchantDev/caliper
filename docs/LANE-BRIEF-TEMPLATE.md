# LANE BRIEF TEMPLATE

Every brief handed to a lane follows this order. A brief missing a section is
incomplete, and a lane receiving one should say so before doing any work.

This exists because for a week the briefs on this project were improvised. They
contained factual errors about the code four separate times, and the lanes that
refused to act on them cost less than the lanes that did. The process was already
in the repository; the briefs did not invoke it.

---

## 1. WHERE

Folder and branch, on their own line. Confirm you are on the right branch before
touching anything. Two terminals look identical.

## 2. READ FIRST — in this order, before any work

- **`docs/MODULE-MAP.md`** — what exists, what it exports, and who calls it.
  Read this **before proposing to build anything**. Nine capabilities were built
  in this repository that already existed or were never connected. Every one
  would have been caught by reading the map first.
- `CLAUDE.md` — the project's own rules.
- `docs/BUILD-LOOP.md` — the eleven numbered steps. Followed literally, not as
  advice.
- `docs/UMAA-CALIPER.md` — **canonical** for the audit: Phase 0 grounding,
  Step 0's external anchor, the six triggers, and the rule that an audit records
  which trigger fired.
- `docs/AUDIT-PROTOCOL.md` — the failure-pattern catalogue, A onward.
- The governing plan for the current phase.
- Anything specific to the task.

## 3. GROUND — and report before working

State what you found. Confirm or contradict the brief's claims about the code,
by checking rather than by trusting.

**A brief is a claim too.** It is written by someone who has not just read the
file. Treat its assertions the way Rule Zero treats a number: verify before
building on it.

## 4. ASSESS

What is actually true now. What has changed since the brief was written. What the
brief assumes that is no longer so, or never was. Name it plainly and stop if it
is load-bearing.

## 5. PLAN — write it, then STOP

BUILD-LOOP Step 2. Nothing is implemented until the plan is reviewed. State for
each item: what changes, why, the test, and the mutation that proves the test can
fail.

This is the step briefs on this project have most often let lanes skip, and it is
the step that would have prevented most of what went wrong.

## 6. ROUTING

What you own. What you must not touch, and who owns it instead. If you need a
change outside your routing, report and stop — do not edit across the line.

## 7. THE WORK

The items, in priority order, each with the gate it must satisfy.

## 8. GATES

What must be watched **red** before it is trusted. A control only ever seen green
is not known to be a control.

## 9. AUDIT

Which UMAA triggers to expect at the exit, and the requirement to record which
actually fired. An audit that cannot say why it ran was probably run from habit.

## 10. DISCIPLINE

- Commit at every BUILD-LOOP Step 9, not at the end of a phase. A dead run should
  cost one step, not an evening.
- Never retry into a failure. Commit what exists and report.
- Check free memory before any full suite or render; below the stated floor,
  wait.
- Do not merge, do not deploy, do not open a pull request.
- Nothing is deleted — quarantine to `_TO-DELETE/<reason>/`, git lock files
  included.
- `git commit -F`, explicit paths, never `git add -A`.
- Spell-check every word.

## 11. THE ESCAPE CLAUSE

If anything in the brief is wrong about the code, say so and stop. This has saved
the project four times. It is not insubordination; it is the most valuable thing
a lane does.
