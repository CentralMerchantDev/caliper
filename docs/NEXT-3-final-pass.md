# Final pass — reframe to what was actually found, then commit

Good work on all three. The claim audit in particular found real errors in your own copy (the
12-of-18 convergence count, the stale caveat, the missing "one run is not a sample" line). That is
the check working.

**No fourth tier.** You are right that "not memorisable" is not the same as "hard enough to
separate models," but the answer is not more task variety. Multi-file and stateful work is a
different experiment — days of building — and it would abandon the tight, verifiable design that
makes this one worth reading. Three independent attempts is a stronger position than one.

---

## 1 — Reframe the page around the result you actually have

Right now the page is organised around a question it did not answer. Reorganise around what three
tiers established:

**The finding, stated as a finding:** across 32 tasks in three tiers — edge-case handling, textbook
algorithms, and business rules fabricated specifically so nothing could be recalled — no difference
in final correctness appeared between the cheapest and the most expensive model, at any tier. The
cheap model costs 36–41% as much per correct answer, replicated four times.

**Say plainly that you tried to find a gap and could not.** Three deliberate attempts, each
designed to stress something different, is the credibility of this result. Currently it reads as
three sweeps that happened; it should read as three attempts to falsify a claim.

**The practical takeaway, which is the useful part for a reader:** for single-function work with
clear specifications and executable tests, model choice is a cost decision, not a quality decision.
That is actionable, and it is what the page should leave someone with.

**Then the limit, in your own voice, not as a disclaimer:** every task at every tier is a single
pure function. Nothing here tests multi-file changes, stateful systems, or work where the
difficulty is conceptual rather than compositional. Whether verification substitutes for capability
there is untested and would be a different experiment.

**Keep the spec-disagreement finding at co-headline weight.** It remains the most novel thing in
the project — the one place where more verification demonstrably did not help.

---

## 2 — Commit

`git rev-list --all --count` returns 0. Nothing in this project has ever been committed. All of it
exists only in the working tree, which is the same exposure both lanes had yesterday.

Commit it, with a real message. Confirm `.dev.vars` is excluded by the ignore rules before you do,
not after.

---

## 3 — Report, then stop

Report the final page structure and the commit hash. Do not start anything new — the naming and
the public-repo decision are Mark's, and the next piece of work depends on both.
