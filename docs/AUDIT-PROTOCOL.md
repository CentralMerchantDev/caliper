# The audit protocol

**This is the default audit. Run it this way unless there is a reason not to,
and if there is, write the reason in §7.**

It exists because an audit that is improvised each time gets better at finding
whatever the auditor happened to think of that day, and never gets better at
finding the rest. This one is written down so its *gaps* can be written down too
— §7 is the point of the document as much as §2 is.

Grounding is in [UMAA-CALIPER.md](UMAA-CALIPER.md) — the epistemic anchor, the
artifact topology, the failure floor. Read it first; do not restate it here.
Standing phase order and ledger are in [AUDIT-PLAN.md](AUDIT-PLAN.md) and
[AUDIT-LEDGER.md](AUDIT-LEDGER.md).

---

## 1. The auditor must be blind

**The auditor does not know what the code was supposed to do.**

This is the single highest-value rule in the document and it is not about
independence or second opinions. It is that *knowing the intent is what stops
you looking*. Every test that missed a defect in this project was written by
someone who already knew the answer:

- they tested the happy shape of a case and never its awkward one
- they asserted a value was *recorded*, never that it was *checked*
- they probed a boundary from far away on both sides, never at it
- they asserted a field was one of a set, never which one

None of that is laziness. It is the predictable blind spot of an author.

So: spawn a fresh agent with no conversation history. Give it the files, the
spec, and how to run things. **Do not tell it what you were trying to build, and
do not tell it what you think is wrong.** If you catch yourself writing "check
that X works", delete it — you have just told it where to look and, worse, where
not to.

## 2. What the auditor is asked for, in priority order

1. **Claims in comments or docs that are not true of the code.** This codebase
   argues in its comments. A comment saying a check is volumetric while the code
   is 2D is a defect of the same rank as the code being wrong, because everyone
   downstream believes it.
2. **Tests that cannot fail, or pass for a reason other than the one stated.**
   Break the thing a test claims to guard, run it, confirm it goes red, revert.
   Report every control that survives its own mutation. *This is the highest
   value thing an auditor can do here.*
3. **Logic defects** — off-by-one, float comparison, `<` vs `<=`, sign, axis
   confusion, silent fallbacks, functions returning a plausible value where they
   should refuse.
4. **Gaps between the spec and the implementation, in either direction.** A spec
   promising eight functions where two exist is a defect. So is an
   implementation doing something the spec never sanctioned.
5. **Performance traps** — anything O(n²), or O(n) at a scale that will grow.
   Measure it; do not assert it.

## 3. Rules the auditor works under

- **Measure, do not speculate.** Claiming something is slow requires a number.
  Claiming a test is weak requires breaking the code and showing it still passes.
- **Report only. Fix nothing.** An auditor that fixes things starts defending
  its own work halfway through.
- **Leave the tree exactly as found.** Back up before mutating, restore after,
  and *verify the restore* — `cmp` or a hash, not a hope.
- **Nothing is deleted.** Quarantine to `_TO-DELETE/<reason>/`.
- **If a category is clean, say so plainly.** Do not invent findings to fill it.
  A short honest report beats a padded one.

## 4. What it must hand back

Per finding: **severity** (CRITICAL / HIGH / MEDIUM / LOW), **file and line**,
what is wrong, **the evidence** (command output, measured numbers), and why it
matters.

Then two sections that are as important as the findings:

- **What was checked and found clean** — including which mutations correctly
  went red, so the next auditor knows which guarantees are genuinely defended
  and need not be re-derived.
- **What was not covered.**

## 5. What the auditee does with it

1. **Fix, do not summarise.** A finding acknowledged and not fixed is a finding
   that will be found again.
2. **Every fix gets a test that fails without it.** Then break the fix on
   purpose and confirm the test goes red. A fix without that is a hope.
3. **A mutation that does not apply is INCONCLUSIVE, not a pass.** Assert the
   edit landed before trusting the result. This has produced a false "verified"
   twice in this project — both times with `sed` patterns that silently matched
   nothing.
4. **Findings not fixed get written down, with why.** In the commit message and
   in the ledger. "Not wrong today, wrong the moment X is real" is a legitimate
   answer; silence is not.

## 6. The standard of proof, restated

**A green suite is not evidence a control exists.** It is evidence that nothing
currently disagrees with it. The only evidence a control exists is that breaking
it turns something red.

And the corollary that this project keeps re-learning: **mutation testing proves
a control catches the failure you thought of, and says nothing about the one you
did not.** That is why §1 exists. The two techniques cover different halves and
neither substitutes for the other.

---

## 7. Notes and gaps — where this protocol has failed

*Append here whenever an audit misses something, or a run teaches the protocol a
lesson. Newest last. This section is how the audit gets better; a protocol that
never gains entries is one nobody is checking.*

### 2026-09-02 · Audit of the land layer (first run of this shape)

**What it caught:** 23 defects, two CRITICAL, seven HIGH, in five modules that
were *already mutation-tested* with 545 tests green. Both criticals were written
that same session by the author, and both were in code whose comments correctly
described the defect being prevented.

**Gaps found in the protocol itself, and now fixed above:**

- The first version of the auditor prompt did not ask it to check
  **claims in comments**. It found them anyway; a weaker auditor would not
  have. Now §2.1, and ranked first.
- It did not ask for **"what was checked and found clean"**. Without it, the
  next audit re-derives the same ground. Now §4.
- It did not say **verify the restore**. The auditor did it unprompted (`md5sum`
  + `git status`). Now §3.

**Still open — the protocol does not yet cover:**

- **Concurrency and re-entrancy.** Nothing asks the auditor what happens if two
  callers interleave. The registry's `close()` is non-atomic (it mutates as it
  walks and can throw mid-loop leaving earlier entries already closed) and that
  was found by reading, not by the protocol asking.
- **The auditor cannot see the renderer.** Everything visual is out of its reach
  because it cannot run WebGL. `scripts/shoot.mjs` exists and the protocol does
  not tell it to use it.
- **No adversarial input.** The auditor probes for *mistakes*, not for someone
  deliberately attacking. See the security note below.
- **Nobody audits the auditor.** Its "found clean" list is taken on trust. One
  cheap improvement: re-run two of its claimed-clean mutations independently.

### (next entry goes here)
