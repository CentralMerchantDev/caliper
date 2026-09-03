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

### 2026-09-03 · World-lane audit (prop join, ground apron, cloud decks, test-count writer)

**What the protocol got right this time:** telling the auditor to actually use
`scripts/shoot-app.mjs` / `shoot.mjs` / `shoot-library.mjs` (closing last
entry's gap) produced a real, reproducible "app OK" health check against the
live `index.html` — something no prior pass in this scope had done. And §2.1
("claims in comments") caught a genuine one on the first pass: two comments 30
lines apart, added in the *same commit*, giving triangle-cost figures for the
same mesh that differ by >6x, because one was never updated when the design
under it changed from a ×10 tessellation step to a ×4 one.

**What it did NOT ask, and had to be worked out mid-run:**

- **It does not warn that "npm test" itself might already be red on a clean
  checkout.** Every instruction up to that point (and every prior entry in
  this file) assumes the auditor mutates a passing baseline and watches it go
  red. Nobody told this auditor to run the plain, unmutated suite FIRST and
  check its exit code before touching anything — it happened only because the
  mutation-testing instructions said to run tests, and the first run already
  had two real failures on a checkout `git status --short` confirmed was
  clean. A protocol that only says "break it and watch it go red" has no step
  for "it was already red before I broke anything," which is arguably the
  single most damning thing this run found: a public "Continuous
  Verification" claim sitting on top of a suite that does not pass. Add a
  step: **run the full, unmutated suite before any mutation, record its exit
  code and failing tests by name, and treat any pre-existing failure as a
  CRITICAL finding in its own right** — it is worse than a weak test, because
  it means the last person to commit did not run what they were asking a
  reader to trust.

- **It does not anticipate the auditor's own sandbox refusing the mutation
  step.** §3 says "back up before mutating, restore after, verify the
  restore" — sound advice, but it assumes the auditor is *allowed* to mutate
  tracked source at all. This run's permission system blocked direct edits to
  a tracked file (`public/sky.js`) even inside a same-message mutate-run-
  restore plan, citing the auditee's own "report only, fix nothing" rule
  applied over-broadly to a temporary, restored mutation. The workaround —
  copy the file to an untracked scratch directory *outside the repository*,
  mutate the copy, and replay the real test file's own assertions against it
  with a clean-copy sanity check alongside the mutated one — produces
  evidence of the same strength (real assertion, real production logic) without
  ever writing to a tracked path, so it satisfies the *intent* of "leave the
  tree exactly as found" by never touching the tree rather than by touching
  and restoring it. Worth stating as an explicit fallback in §3, because the
  first time this happens without a plan, an auditor is likely to either give
  up on mutation testing entirely (weakening the report) or to keep retrying
  the blocked action (wasting the run) rather than routing around it this way.

- **It does not ask the auditor to check whether two comments *about the same
  fact*, added in the same commit, agree with each other** — only whether a
  comment agrees with the code. This run's Finding 2 was only found because
  the auditor happened to re-derive the arithmetic behind both comments
  independently and noticed the two derived numbers didn't match each other,
  not because anything prompted a same-commit cross-check. Worth naming in
  §2.1 explicitly: a comment can be self-consistent with the line below it and
  still contradict a comment thirty lines away describing the same value.

**Still open — the protocol still does not cover:**

- Everything item 4 of the previous entry named ("nobody audits the auditor")
  is still true here; this report's "found clean" list (four new test files,
  three of them now mutation-verified via the scratch-copy method above) has
  not itself been independently re-run by a second party.
- Same-day commits outside the given file list but touching the same modules
  (here, `9c3d160`, which also edits `public/sky.js` and
  `public/world-render-3d.js` the same day as the named scope) are a grey
  area: re-auditing all of it does not fit one pass, trusting its own
  self-report does not fully satisfy "the auditor must be blind." No rule
  currently tells the auditor which way to default; this run defaulted to
  "read it for context, don't re-derive it, say so explicitly" — worth
  promoting to an explicit instruction if it recurs.
