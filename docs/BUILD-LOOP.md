# THE BUILD LOOP — the procedure for every task

**This is how work is done in this repository. Every step of every plan runs
through this loop, in this order, with no steps skipped and none reordered.**

It exists because the alternative is a procedure that lives in a prompt. A
prompt is written once, gets copied, and the copies drift — which is the exact
defect this project has found four times in its own code (two tables that must
agree, kept in two places). So the loop is a file. Prompts point AT it and do
not restate it. If the loop needs to change, it changes here, once.

It also exists because a long autonomous run compacts its own context several
times. Nothing in a session's memory survives that. **This file does.**

Referenced, not restated:

- [CLAUDE.md](../CLAUDE.md) — the standard of proof and the non-negotiables
- [AUDIT-PROTOCOL.md](AUDIT-PROTOCOL.md) — how review is run; the auditor is blind
- [WORLD-BUILD-PLAN.md](WORLD-BUILD-PLAN.md) — the current work, and PART 7, the ledger
- [WORLD-RULES.md](WORLD-RULES.md) — the specification for the land and the model contract

---

## STEP 0 — Orient

Run this at the start of a session, **and again every time context is cleared or
compacted.** You will not notice that you have forgotten; assume you have.

```
git status --short && git branch --show-current
node test/run.mjs 2>&1 | tail -5
```

Then read the ledger — PART 7 of the active plan — and take the first unticked
step. **Do not trust your memory of where you were. Read the file.**

If the tree is dirty from your own previous step, finish that step's loop
(verify → tick → commit) before starting a new one. Half a step and half of
another is how two changes get attributed to one commit and neither can be
reverted.

---

## STEP 1 — Re-ground before you begin

Before doing the step, verify the state the step assumes. The ledger says what
was true when it was written; the tree says what is true now.

- Does the file the step names still exist, with the function it names?
- Do the line numbers still point at what they claimed?
- Has the step already been done, in part, by an earlier one?

**If the ledger and the tree disagree, the tree wins.** Correct the ledger, say
so in the commit, and carry on. A plan quietly executed against a world that
moved is how the whole night's work goes wrong at 2am and is found at 9.

---

## STEP 2 — Plan the step, in writing, before touching code

State four things. Three lines is enough; the point is that they exist before
the edit, not after it, because after the edit you will describe what you did
rather than what was needed.

1. **What changes** — the file and the function.
2. **Why** — the behaviour that is missing or wrong.
3. **The test** — the property that will prove it, phrased as a property and
   not as an implementation detail.
4. **The mutation** — the single edit that will make that test go red.

**If you cannot name the mutation, you do not yet understand the step.** Stop
and work it out. A step whose mutation cannot be named is a step whose test will
assert something incidental.

---

## STEP 3 — Write the test first

Where the behaviour is new, the test goes first and is watched failing.

- Test the **property**, not the implementation. "The seed reaches the shaping
  functions" not "line 402 passes `seed`".
- Test the **awkward** case, not just the happy one. Every test that has missed
  a defect here tested the happy shape.
- Assert **which**, not **one of**. "Refused for draught" beats "refused".
- Probe boundaries **at** the boundary, not comfortably either side of it.
- Assert the value was **checked**, not merely **recorded**.

Those four bullets are the author's blind spot, written out. They come from
§1 of [AUDIT-PROTOCOL.md](AUDIT-PROTOCOL.md) and from real misses in this repo.

---

## STEP 4 — Implement

Smallest change that makes the test pass and does not break the guards in
STEP 8. New parameters go **last**, with a default that preserves today's
behaviour, so no existing call site changes.

---

## STEP 5 — Verify

```
npx tsc --noEmit          # clean
node test/run.mjs         # green
```

Green is not evidence the control exists. It is evidence that nothing currently
disagrees with it. STEP 6 is where the evidence comes from.

---

## STEP 6 — Mutate, and prove CAUGHT

```
node scripts/_mutcheck.mjs <testFile> <sourceFile> <spec.json>
```

Then add the entry to `test/mutations.json`.

Three rules, each of which has been paid for here:

- **A mutation that does not apply is INCONCLUSIVE, not a pass.** Twice a `sed`
  pattern silently matched nothing and the run reported "verified".
- **A red suite must name the EXPECTED test.** Red for another reason is a
  broken tree, not a caught mutation.
- **If a mutation SURVIVES, the TEST is wrong — fix the test, not the mutation.**
  This has happened repeatedly and the test was the weak part every single time.
  Before rewriting the mutation, check whether it was a *partial* mutation that
  left a second path intact. Target the one point the behaviour passes through.

**Nothing else touches the tree while `scripts/mutate.mjs --all` runs.** A
`git add` mid-run renormalised a 4 MB file, esbuild read it half-written, and 14
controls came back INCONCLUSIVE and were reported as "10 of 24 proved".

---

## STEP 7 — Measure anything you are about to claim

Every number that will appear in a comment, a commit, the ledger or on the page
comes from a command run **today**, and the command goes in beside the number.

Take numbers from the artefact, never from a field that declares them. Four of
the current model-library defects exist because a declared value was reported as
though it had been measured.

If it cannot be measured here — the visual checks — say so plainly and say what
to look for. **Never report unverified work as verified.** That is failure-floor
item 1 and everything else in this file is downstream of it.

---

## STEP 8 — Check the guards before committing

Standing, non-negotiable, from [CLAUDE.md](../CLAUDE.md):

- **Nothing is deleted.** Move to `_TO-DELETE/<reason>/`. This applies to
  commands written for Mark to run, and to git lock files.
- **Never bulk-delete.** Inventory, categorise, confirm the exact list, then act.
- **Zero API spend without explicit authorisation.**
- **The repo stays private.** No internal identifiers from other projects in the
  repo, on any served page, or in any commit message.
- **Never display visitor-typed text as HTML.**
- **Do not touch `tick`, `chooseAction`, `applyAction`.**
- **The nine regression checks pass unedited.**
- **One agent per checkout.** `sandbox-spike`/`main`, `sandbox-spike-land`/
  `land-lane`, `sandbox-spike-assets`/`assets-lane`. Two agents in one working
  tree caused overwritten commits and git lock contention.
- **The aesthetic is signed off** and is not changed as a side effect.
- **`src/` is extended, never rewritten.** The gates, spend caps, per-IP limits,
  circuit breaker and AST scanners are the part that works.

Plan-specific guards live with the plan — for the world build, the default world
must stay byte-identical at seed 0 across any change that is NOT a deliberate
terrain redesign, pinned in `test/worldSeed.test.ts`'s own `PRE_SEED` constant.

Not hardcoded here as a literal hash, on purpose, and found the hard way: this
line used to quote the value directly (`418744f1...`), and B1's own archipelago
redesign correctly changed the pinned hash in that test file while this
document's copy sat unedited — a declared value repeated in a second place,
the exact failure pattern this project's own docs (AUDIT-PROTOCOL.md's failure
pattern B) name elsewhere. A PROCESS document should not carry a DATA value
that a legitimate future phase is expected to change; read the real constant
from the test file, not from here. When a phase deliberately redesigns the
terrain, updating `PRE_SEED` (with the commit message stating why) is the
correct outcome, not a guard violation — the guard exists to catch
*accidental* drift from unrelated changes, not to freeze the terrain forever.

---

## STEP 9 — Tick the ledger, then commit

Tick the step in PART 7 of the plan with **one line of evidence: the command
that proves it.** A tick without a command is a claim.

Commit the code, the test, the mutation and the plan file together. Long
messages go to `docs/pending-commits/` and are committed with `git commit -F` —
they do not survive being pasted into a shell.

The message says what was wrong, how it is known to be fixed — the measurement
and the mutation — and what is still open. These are the project's memory of its
own defects and they are read.

---

## STEP 10 — At a phase boundary, audit blind, then replan

At the end of each phase, not each step.

1. **Audit.** Run [AUDIT-PROTOCOL.md](AUDIT-PROTOCOL.md). Spawn a **fresh agent
   with no conversation history.** Give it the changed files, the spec and how
   to run things. **Do not tell it what you were building or what you think is
   wrong.** Naming the suspicion is what stops it looking. If you catch yourself
   writing "check that X works", delete it — you have just told it where not to
   look.
2. **Fix**, each fix through STEPS 2–9, each with its own mutation. A new
   control is not exempt from the standard it enforces.
3. **Replan.** Findings change what the remaining steps should be. Update the
   ledger: add steps the audit revealed, mark steps it made unnecessary, correct
   steps whose assumptions it disproved. Commit that.
4. **Append what the audit MISSED to §7** of the audit protocol. A protocol that
   never gains entries is one nobody is checking.

---

## STEP 11 — Loop

Return to STEP 0 and take the next unticked step.

**A phase heading is not a finishing line.** The run ends when every box in the
ledger is `[x]` with evidence or `[!]` with a reason — not when a phase ends,
not when the context feels full, and not when there is enough done to write a
good summary. If you find yourself about to summarise, read the ledger first.

---

## WHEN A STEP CANNOT BE DONE

Tick it `[!] BLOCKED`, write **why** and the **command that produced the
finding**, commit, and take the next step.

Do not stall the run on one step. Do not widen the scope to get around it —
where the plan lists what is explicitly not being built, that list is the set of
things that will tempt you at 3am, and the reasons are already written down.

An honest gap costs an hour. A silent one costs the trust in every number on the
page, which is the only thing this project is actually selling.
