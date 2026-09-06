# Matrix results — does verification substitute for capability?

Per `BUILD.md` and `NEXT.md`. Runner built, 25-task set (18 core + 7 hard), matrix run
against production twice (once at `MAX_ATTEMPTS=2`, once at `MAX_ATTEMPTS=3`). Per
`NEXT-2-novel-tier.md`, a third tier of 7 fabricated business-rule specs was added and run
once. **Still no UI — the page gets written once, from final data.**

**Run date: 2026-08-26.** Models: `claude-haiku-4-5`, `claude-sonnet-5`, `claude-opus-4-8`.
Total across all sweeps: **450 stored cycles** (162 + 63 + 162 + 63 — core@2, hard,
core@3, novel), all completed (2 transient 502s on the core@3 sweep, both succeeded on
immediate retry). Total spend: **$1.6372** (against a $10 cap, summed directly from every
`totalCostUsd` in `GET /matrix-results` on 2026-09-05 — this document previously said
$1.118; that figure does not reconcile against any subset of the current 450 records
checked, core+hard included, so it is corrected here rather than explained, since the
actual reason for the discrepancy could not be established). Raw data: `GET /matrix-results`.

---

## Correcting the last headline

The previous version of this document said "the cheap model plus verification wins
outright" based on three identical 98.1% final-pass figures. That claim doesn't survive
its own methodology section, which is where it should have been caught:

**17 of the 18 core tasks hit 100% final pass for every model, every rep.** Each model
failed exactly one cycle out of 54, on the same task (`camel-to-snake`), for the same
reason. Three models "converging" to 98.1% is one task carrying all the signal and
seventeen carrying none — it is not evidence of quality equivalence, because capability was
never actually stressed. The **cost** half of the claim was, and remains, solid: cheaper
models cost less per correct answer. The **quality-equivalence** half was untested. Saying
both in one headline was the error.

---

## Fix 1: a harder tier, run for real

7 new tasks requiring actual algorithmic technique — not edge cases: Levenshtein edit
distance, longest increasing subsequence, coin change (minimum coins, chosen so greedy
provably fails and DP is required), bipartite graph check, word break, longest common
subsequence, minimum path sum through a grid. Ground truth verified against independent
reference implementations before running anything (same discipline as the core set).
21 cycles per model (7 tasks × 3 reps), run at `MAX_ATTEMPTS=3`.

| Model | n | First-pass | Final pass | Convergence* | Mean repair rounds | Cost/cycle |
|---|---|---|---|---|---|---|
| claude-haiku-4-5 | 21 | 95.2% | **100%** | 100% | 0.05 | $0.00345 |
| claude-sonnet-5 | 21 | 100% | **100%** | n/a | 0.00 | $0.00503 |
| claude-opus-4-8 | 21 | 100% | **100%** | n/a | 0.00 | $0.00908 |

*Convergence rate among cycles that failed attempt 1; "n/a" means zero failures to converge from.

**All three models solved every hard-tier task, on every rep, with only one first-attempt
miss total** (Haiku on `is-bipartite`, converged on repair). Per NEXT.md: this is a fully
publishable outcome, and it is not the one I expected going in.

**But read this the way NEXT.md asked to be read, not the easy way.** This tier does not
show "no capability gap on hard problems." It shows no capability gap on *this specific set
of hard problems* — and every one of them is a textbook algorithm (Levenshtein distance,
LCS, coin change, word break, bipartite coloring, grid DP) that appears in essentially
every algorithms course and interview-prep corpus on the internet. "Requires real
algorithmic technique" and "would expose a capability gap between these three models" are
not the same axis, and this tier conflated them. All three models most likely have these
patterns close to memorized. This result says the floor for *well-known* algorithms is
uniformly high across this price range — it says nothing about novel hard problems, and
should not be read as if it does.

---

## Fix 1b: `MAX_ATTEMPTS` raised from 2 to 3, core set re-run

Fresh reps (not the same generations re-scored) at `MAX_ATTEMPTS=3`:

| Model | First-pass | Final pass @2 attempts | Final pass @3 attempts | Mean repair @2 | Mean repair @3 |
|---|---|---|---|---|---|
| claude-haiku-4-5 | 79.6%† | 98.1% | **100%** | 0.13 | 0.24 |
| claude-sonnet-5 | 92.6% | 98.1% | 98.1% (unchanged) | 0.07 | 0.09 |
| claude-opus-4-8 | 92.6% | 98.1% | 98.1% (unchanged) | 0.07 | 0.11 |

†Different sample of reps than the original sweep, so this specific number moved on
resampling noise as much as anything else — the final-pass columns are the ones that
matter here.

**A third attempt closed the gap for Haiku but not for Sonnet or Opus.** Sonnet's and
Opus's failures are the same failure both times — `camel-to-snake` — and a second repair
round didn't fix it for one rep of each model even when given a full extra try. That is
the sharpest version yet of the finding below: more attempts help when the problem is an
implementation slip; they do not reliably help when the problem is that the model
disagrees with the test about what's correct.

Cost moved up modestly with the extra attempt budget (blended avg cost/cycle $0.00572 →
$0.00603), as expected — more repair rounds used, mostly by Haiku.

---

## Fix 2: `camel-to-snake` is a co-headline, not "the exception" — and the test is the opinionated party

Say this first, plainly, before getting to why it's interesting: **the models' answer is
arguably the better one.** The task asks for `parseHTTPResponse` → snake_case. Every model,
at every capability tier tested (Haiku through Opus), returned `parse_http_response`. The
hidden test insists on `parse_httpresponse`, encoding a specific, narrower rule (only split
before a capital that immediately follows a lowercase letter or digit — so an acronym run
like `HTTP` never gets internally separated). That rule is defensible, but
`parse_http_response` is at least as reasonable a reading of "convert camelCase to
snake_case," and arguably more useful. **This benchmark is the opinionated party here, not
the models.** A careful reader who noticed the disagreement and wasn't told this would
reasonably conclude the test was buggy rather than deliberate — so it's stated here first,
not left for them to find.

Given that, the finding is not "models fail at snake_case." It's sharper than that:

**Verification loops fix implementation slips. They do not fix spec disagreements — and
when they can't, more repair rounds mostly don't help either.** Across both sweeps
(`MAX_ATTEMPTS=2` and `=3`), every single cycle on this task failed its first attempt
(0% first-pass, 18 of 18 cycles across both runs), because the disagreement is
deterministic, not noise — every model reaches for the same alternative rule every time.
Repair fixed it most of the time (12/18 converged across both sweeps) simply because being
shown the exact expected string is often enough to get a model to comply even against its
own judgment — but not always: 2 of 9 cycles were still failing the identical test after a
second full repair round at `MAX_ATTEMPTS=3`.

That's the actual limitation being demonstrated, and it's a limitation of verification as
an idea, not of this implementation: **when a hidden test encodes a preference rather than
a correctness property, the verifier is asserting that preference, not catching a defect.**
A repair loop can browbeat a model into compliance some fraction of the time by being
extremely specific about what's expected, but it cannot make the disagreement go away, and
there's no signal available to the loop (or to a reader of just the pass/fail number) that
distinguishes "the model was wrong" from "the model disagreed with an opinionated test."
That ambiguity is invisible from the outside unless someone says so — which is the entire
reason this section exists.

---

## Everything else, unchanged and still true

The other three core-set tasks with real (repair-resolved) first-attempt weak spots are
still real: `most-frequent-word` (56% first-pass, apostrophe-stripping disagreement, 100%
final), `validate-record` (78% first-pass, the `NaN`-is-not-a-number trap, 100% final),
`normalize-phone` (89% first-pass, country-code-digit-count edge case, 100% final). These
are ordinary implementation gaps that repair genuinely fixes, which is the useful contrast
to `camel-to-snake` — most first-attempt misses in this whole exercise are the boring,
fixable kind. One is not.

## Fix 3: the novel tier, run for real

Per `NEXT-2-novel-tier.md`: the hard tier measured known-algorithm competence, not capability,
because textbook algorithms are very likely close to memorized. This tier tests what that
result couldn't: 7 fabricated business-rule specs, each with a one-line argument for why it
can't be recalled (invented scoring weights, invented fee/discount/proration formulas, one —
`inventory-reorder-flag` — deliberately changing a memorized textbook formula's safety-stock
term from additive to multiplicative, so reciting the standard formula instead of reading the
prompt gets it wrong). 9 cycles per model (7 tasks × 3 reps), run at `MAX_ATTEMPTS=3`, same date
and models as everything else. Ground truth verified against independent reference
implementations first, same discipline as the other two tiers.

| Model | n | First-pass | Final pass | Mean repair rounds | Cost/cycle |
|---|---|---|---|---|---|
| claude-haiku-4-5 | 21 | **100%** | **100%** | 0.00 | $0.00108 |
| claude-sonnet-5 | 21 | **100%** | **100%** | 0.00 | $0.00279 |
| claude-opus-4-8 | 21 | **100%** | **100%** | 0.00 | $0.00650 |

**Every one of 63 cycles across all three models passed on the first attempt — zero repairs,
zero failures.** That's a stronger result than the hard tier, not a weaker one: it rules out
memorization as the explanation (these specs don't exist anywhere to memorize) and the models
still didn't need a second try. But read this the way the hard tier's own result had to be read:
"can't be recalled" is not the same property as "hard enough to separate these models." Every
novel-tier task is still a single pure function with a fully specified rule set spelled out in
the prompt — holding several interacting constraints at once, not resolving ambiguity or
searching a large space. **The quality-equivalence question these three tiers were built to
answer is still open**, for a narrower and better-argued reason than when Fix 1 left it open:
memorization and difficulty have both now been ruled out as confounds, and the three models
still didn't diverge. Nothing built across any of the three tiers has actually been cognitively
hard.

## Methodology, updated

Everything in the previous version stands (small-n on convergence-rate comparisons,
single-vendor scope, hand-picked task selection, modeled vs. invoiced DW fee). Add:

- **The "hard tier" measures known-algorithm competence, not general hard-problem
  capability.** Don't cite the 100%-across-the-board hard-tier result as "no capability gap
  exists" without this qualifier — see Fix 1 above.
- **The `MAX_ATTEMPTS=2` vs `=3` comparison uses different reps, not a paired re-score of
  the same generations.** It's a fair before/after on the aggregate, not a controlled
  experiment on identical inputs.
- **The `camel-to-snake` "finding" is a statement about this benchmark's own test design as
  much as about the models.** That's disclosed above, not hidden in a footnote.
- **The novel tier rules out memorization, not difficulty.** A 100%-across-the-board result
  there means these three models handle unfamiliar-but-fully-specified rules as well as
  familiar ones — it says nothing about tasks that are ambiguous, multi-step, or genuinely
  hard to reason through, because none of the 32 tasks across all three tiers are that. See
  Fix 3 above.

## What would change the conclusion

Same three items as before. The novel tier (added in Fix 3) answered the specific question
raised at the end of Fix 1 — whether textbook-algorithm familiarity was propping up the
hard-tier result — and the answer is no, memorization was not the explanation; the models
converged anyway. What would still change the conclusion: a tier that is genuinely difficult
to reason through (ambiguous requirements, a large search space, multi-step composition) rather
than merely unfamiliar. Nothing run so far has been that.
