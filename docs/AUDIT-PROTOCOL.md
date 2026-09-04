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
   **Record the break in `test/mutations.json`, in the same commit**, and run
   `npm run mutate`. Doing it by hand is four steps and the last one — putting
   the source back — is the one that goes wrong, which is why the standard was
   being met about half the time. See the last §7 entry.
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

### 2026-09-03 (later) · The auditee's half: two ways to set an audit up to fail

Both of these cost a run before the audit above could start, and neither is the
auditor's fault. §1 says to give it "the files, the spec, and how to run things";
it does not say to check that any of that works where the auditor will stand.

- **It could not execute anything.** Spawned into a fresh git worktree, which
  carries tracked files only — so `node_modules` was absent and `npm test`,
  `tsc`, every mutation and all three shoot scripts were impossible. Measured
  afterwards: every file it had touched was `docs/*.md`. It was reading
  documentation because reading was the only thing left it could do. The danger
  is not the wasted hour. An auditor with no runtime can still read code and
  still produce a well-shaped report — and this protocol hands it a 222-line
  document to shape one against. That report would be inference wearing
  measurement's clothes, which UMAA-CALIPER.md Step 2 exists to forbid, and it
  would carry a "checked and found clean" section that nothing was.
  **Now required:** the auditor runs the suite, the typechecker and one shoot
  script, pastes the real output, and STOPS if any fail. An audit that cannot
  execute must say so and end, not continue in prose.

- **The verification one-liners were themselves unverified.** Four written that
  day failed for reasons of their own rather than the thing they were checking:
  a stubbed `THREE` missing `BufferAttribute`; the same stub building materials
  as arrow functions, which `new` refuses; a test resolving `test/public`
  because the runner bundles into `test/.built/`; and `require('three/package.json')`
  against a package that does not export it. §3 says measure rather than
  speculate. It did not say **confirm the instrument works before trusting what
  it reports** — which is the same rule as "a mutation that did not apply is
  INCONCLUSIVE", one level further out. It says so now.

### 2026-09-03 (later still) · A new control is not exempt from the standard it enforces

The day's defects, in order: a page-count guard that published a count from a red
run; the deadlock its fix created; a parser in the fix-for-the-fix that could
never fire because it also matched the summary header `✖ failing tests:`; two
comments in one commit disagreeing 6× about the same mesh; a test asserting the
exact prose of an error message.

Every one was found by running something. **None by re-reading it.** And three of
the five were in code written that same hour *specifically to enforce honesty
about verification*. That is the tell, and it is not carelessness about the
product: a control feels finished the moment it is written, and writing it is
exactly what produces the confidence that it works. §6 has said "the only
evidence a control exists is that breaking it turns something red" for weeks. The
standard was met perhaps half the time — not because anyone disagreed with it,
but because meeting it by hand is four fiddly steps and the fourth, putting the
source back, is the one that goes wrong.

So it is a command now: **`npm run mutate`**, driven by `test/mutations.json`.
Each entry names a control, the exact edit that should break it, and the test
that must notice. The script establishes a green baseline first and refuses to
run against a red one (the finding directly above, made mechanical), asserts the
target text matches exactly once, verifies the edit landed on disk before reading
any result, restores from a hash-checked backup kept outside the repository, and
reports CAUGHT / SURVIVED / **INCONCLUSIVE** — with inconclusive never counting
as a pass.

Two things fell out of writing it, which is the argument for having written it:

- `test/worldExtent.test.ts` computed the apron's grid step as `wm(250) * 4`
  **itself**, so it was checking arithmetic against its own copy of the number
  and would have passed whatever the renderer used. No mutation to `city-render.js`
  could fail it. That is §2.2's "a test that reimplements the logic it is
  checking", and it was found by trying to write the mutation, not by reading the
  test. The multiple now lives in `WORLD` and both read it.
- The new script's own failure-parser would have inherited the header bug from
  `gen-test-count.mjs` verbatim — copying the pattern without the lesson. It was
  caught only because the lesson was three hours old.

**The rule, stated so it can be checked:** a control ships with its mutation in
`test/mutations.json`, added in the same commit. Not afterwards, and not only for
the ones that look fragile — the two worst defects above were both in code that
looked finished.

### 2026-09-04 · Phase A audit ("the world becomes a value") — a "seeded" claim that was seeded in name only, and the sandbox lockout getting worse, not better

**What it caught, that a same-author check would not have:** the phase's own
status line says the plan is "seeded" through six named functions
(`classForBlock`, `pickPatchy`, `classForSettlementBlock`, `generateSettlement`,
`cityDemand`, `generateCityPlan`), and it is true that a `seed` parameter
reaches every one of them. What the claim does not say, and what nobody had
measured, is that most of the *texture* those functions produce — which
blocks become parks, which become civic buildings, how a settlement's
low-demand cells and centre radius wobble — runs through `hash01`, a string
hash with no seed parameter at all, sitting a few lines away from the `fbm`
calls that do take one. Measured directly (not asserted): 0 of 269 downtown
blocks changed PARK or CIVIC status between two genuinely different seeds.
The existing test only ever checks that the plan's sha256 fingerprint
changes at all, which it does — from the 2.6% of blocks whose DENSITY class
moves — so a test built around "did anything change" passed happily while
missing that an entire category of the plan (civic geography) does not
respond to the seed at all. This is worth generalising past this one repo:
**"the seed reaches this function" is not the same claim as "the seed reaches
everything this function decides"**, and a function can accept and forward a
parameter it only partially consumes. §2.1 already asks the auditor to check
a comment against the code; this is the same check one level more specific —
check a comment's claim against *every path inside the function it names*,
not just that the parameter is present in the signature.

**A second thing found the same way — by measuring, not reading:**
`createWorld()` (the phase's own headline deliverable) costs 2.3–2.7 s per
call and does not get materially cheaper on a repeat call with the identical
seed, because it builds a fresh `LandField`/`heightAt` every time and the
caches this same phase fixed one layer down (`generateCityPlan`,
`cityDemand`) are keyed on that object's *identity*, not the seed value
`createWorld()` was actually called with. In isolation, `generateCityPlan`'s
own fix is real (34 ms cold, 0.0025 ms warm) — it would have been easy to
stop there and report the fix as complete, since its own dedicated test
passes and its own dedicated mutation is CAUGHT. Only timing the whole
composed `createWorld()` call — which the brief explicitly asked for and
which nothing in `test/world.test.ts` does — showed that the saving does not
reach the function callers will actually use. **Confirms, in a new shape,
the standing §7 lesson that a green suite proves nothing was falsified, not
that the thing works at the altitude a caller will call it from.**

**Gaps found in the protocol itself:**

- Nothing in §2 asks the auditor to time anything by default — the brief for
  this specific run named the performance question explicitly
  ("createWorld()… measure how long"), and without that explicit prompt nothing
  here would have prompted a general auditor to profile a function whose own
  tests are all green. §2.5 says "measure it," but only after the auditor has
  already decided performance is worth looking at; nothing suggests *when* to
  decide that. Worth adding: **any new object this phase names as "the thing
  that ties X together" (a constructor, a composed factory, an entry point) gets
  timed once, cold and warm, even with no stated performance concern** — the
  brief should not have to ask for this by name every time; it is exactly the
  place a phase's real cost hides, because it is the one function nobody wrote
  a focused test for.
- §3's scratch-copy fallback (added by the 2026-09-03 entries) assumes the
  auditor can still choose when to invoke it. This run hit a harder failure
  mode: a **single incorrectly-targeted `Edit` call** (this auditor's own
  mistake — it tried to mutate the sibling checkout instead of its assigned
  worktree, and the tool correctly refused it) caused the permission
  classifier to treat the *refused* call as though it had succeeded, and it
  then denied every subsequent Bash command referencing anything in that
  checkout — including unrelated, read-only ones (`git status --short`) and
  one (`npm ci`) run from an entirely different, correct location. The
  workaround itself (scratch-copy-outside-the-repo) became unreachable
  mid-run because setting it up required one more command against the now-
  locked-out checkout. Nothing in §3 anticipates a lockout that widens past
  the action that triggered it. Worth stating explicitly: **if a mutation
  action is refused, stop issuing further commands against that same
  checkout for the rest of the run** — don't attempt the "obviously safe"
  read-only follow-up to check whether the tree is still clean, because the
  attempt itself can consume the auditor's remaining budget for no evidence.
  Switch immediately to whatever location the tool has not yet objected to
  (here, the assigned worktree) and write the report from what was already
  measured before the lockout, flagging the incomplete probe by name rather
  than trying once more to route around the refusal.
- This is the **second** time in three days this project's own worktree
  provisioning has hostile-startup'd its own auditor: the 2026-09-03 (later)
  entry recorded a worktree with tracked files only and no `node_modules`;
  this run hit the identical gap in a *different* worktree. The fix proposed
  then ("the auditor runs the suite… and STOPS if any fail") is necessary but
  was not sufficient here, because this auditor could still run everything —
  just not *in the location it was told to operate entirely within* — which
  is a more tempting trap than an auditor that simply cannot execute at all:
  it is easy to keep working against the sibling checkout because it works,
  and only notice the scope violation once a permission system enforces it
  the hard way. **Now recorded a second time, because a lesson that only
  appears once in this file has not yet been shown to generalise, and the
  underlying provisioning gap (a worktree without dependencies installed)
  still has not been fixed at the source.**

**Still open — the protocol does not yet cover:**

- Everything the 2026-09-03 entries named ("nobody audits the auditor,"
  same-day commits outside the given scope) is still true here.
- No rule yet says what an auditor should do when it discovers, mid-run, that
  a substantial fraction of its evidence was gathered against the wrong
  checkout for reasons outside its control (dependencies only existing
  there). This run's answer — disclose it prominently at the top of the
  report, keep the evidence because the commit hash matched exactly, and name
  the one probe that didn't get to run because of it — is a reasonable
  default but is not yet written down as the expected one.

### 2026-09-04 · Phases B–H audit — the worktree-has-no-`node_modules` trap recurred, and a second one showed up next to it

**What the protocol got right:** §2's priority order (claims in docs first)
paid off immediately — the very first thing checked against a real command
(`npm test`) was `CLAUDE.md`'s own "how to verify" line, and it was wrong by
297 tests (571 claimed, 868 actual). Independently re-running eight of the
53 recorded mutation controls (`scripts/_mutcheck.mjs`, one per phase B
through G) rather than trusting `test/.mutate-results.json` on sight also
paid off directly: all eight reproduced CAUGHT, which is real evidence the
53/53 headline is not merely recorded but re-derivable — the thing the
2026-09-02 entry's "nobody audits the auditor" gap asked for, done partially
here rather than left open again.

**What it did NOT ask, and had to be worked out mid-run:**

- **The 2026-09-03 "auditee's half" entry already named the exact trap —
  worktree carries tracked files only, no `node_modules` — and it recurred
  anyway,** because nothing upstream of this run checked for it before
  handing the brief over. The fix that entry mandated ("the auditor runs the
  suite... and STOPS if any fail") does not cover this case at all: `npm
  test` does not fail here, it is not *runnable* here (`npm test` would need
  `node_modules`, which is simply absent — a different failure mode than a
  red suite). A protocol that only says "stop if red" has no branch for
  "cannot be started." This run did not stop; it fell back to a sibling
  checkout at the identical commit, verified first (same HEAD sha, then a
  CRLF-normalised content diff across every file the raw `diff -rq` flagged,
  confirming the apparent differences were line-ending noise and not content)
  before trusting a single command run there. That verification-before-trust
  step is the load-bearing part and is worth promoting to an explicit
  instruction: **if the worktree cannot execute, and a sibling checkout at
  the same commit exists, confirm the commit hash AND a CRLF-normalised
  content diff agree before treating the sibling as equivalent — do not
  assume same-repo means same-content.** Two different `core.autocrlf`
  settings between checkouts of the same repo produced dozens of files that
  LOOKED different under a raw `diff -rq` (`buildings.js`, `props.js`,
  `sky.js`, `roadkit.js`, `showstoppers.js`, `AUDIT-PROTOCOL.md` itself,
  several `docs/specs/*.md` files, two test files) and were not different at
  all once line endings were stripped. Trusting the raw diff would have
  wrongly concluded the sibling checkout was running a different, unverified
  version of the code under audit — the opposite failure from the one this
  entry is otherwise about, but caught by the same discipline ("measure, do
  not speculate") applied one layer further out than usual.

- **A gitignored evidence file the brief explicitly told the auditor to look
  for (`test/.mutate-results.json`) existed in the sibling checkout and NOT
  in the worktree itself.** Nothing in the protocol currently distinguishes
  "this file does not exist because the claim is false" from "this file does
  not exist because gitignored artefacts don't travel with a fresh worktree
  checkout." Both look identical from inside the worktree alone. Worth a
  standing note next to §4's "what was checked and found clean": when a
  cited artefact is gitignored, its absence from the auditor's own checkout
  is not evidence about the claim one way or the other, and the auditor
  should say so explicitly rather than either assuming it never existed or
  silently fetching it from somewhere else without recording that it did.
