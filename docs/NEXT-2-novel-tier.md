# Next: the question the hard tier didn't answer

The page is built and the framing corrections landed. Three things, in this order.

---

## 1 — Before anything else: is this repo actually safe to publish?

Mark will make this public. A `.dev.vars` containing a real key exists on disk. Confirm it was
never committed, at any point, in any branch:

```
git log --all --full-history -- .dev.vars
git log --all -p | grep -i "sk-ant" | head
```

Also check for the admin secret, the Cloudflare account id, and anything else that should not be
in a public repo. If anything is in history, say so and stop — do not rewrite history without
asking; that is Mark's decision, not yours.

Add a LICENSE (MIT unless there is a reason not to) and confirm `README.md` reads correctly for
someone who has never seen this project and has no context from us.

---

## 2 — The experiment still hasn't answered its own question

Both tiers are the same kind of problem. The easy tier is edge-case handling; the "hard" tier is
textbook algorithms — edit distance, LIS, coin change, LCS — which you correctly noted all three
models have very likely near-memorised. So the honest state is:

- **Cost claim: established.** Haiku ~40% of Opus per correct answer.
- **Does verification substitute for capability: still unanswered**, because capability has never
  been stressed. Recall is not capability.

Build a third tier of 6–8 tasks that require the model to *follow* a specification rather than
*recall* an algorithm. Ideas, not prescriptions:

- A precisely specified rule set invented for this experiment, with interacting edge cases — the
  kind of thing that cannot be retrieved because it does not exist anywhere.
- Composite requirements that combine two familiar operations under an unfamiliar constraint.
- Specifications long enough that the difficulty is holding all the constraints at once.

**State the basis on which you claim each task is not memorisable.** Do not assert novelty —
argue it, per task, in one line. If you cannot argue it for a task, drop the task. A reader who
suspects the "novel" tier is just obscure trivia will discard the whole page.

Same 3 models × 3 reps, `MAX_ATTEMPTS = 3`. Verify your hidden-test ground truth against
independently written reference implementations first, as you did before — that step has now paid
for itself twice.

**Report the table before touching the page.** If the gap appears here, that is the most valuable
result in the project: it locates where verification stops substituting for capability. If it
doesn't appear, that is a strong result too, and a much better-supported version of the current
claim.

---

## 3 — Audit the page's claims against the data

You wrote both the copy and the data. Every framing correction so far has come from outside, and
the pattern has been consistent: the first version claims slightly more than the evidence carries.

Go through the deployed page claim by claim. For each one, name the specific number or measurement
behind it, and mark any claim you cannot trace to data. Then fix or cut those.

Particular things to check honestly:

- Does anything imply the quality-equivalence result is established rather than untested?
- Is the sample size visible next to every rate, or only in the methodology section?
- Does the live-run section imply the live result is representative of the measured table? A
  single run is an illustration, not evidence, and it should say so.
- Is `parse_http_response` being the better answer stated *before* the finding, not after it?

Report the list of claims you changed and the ones you left, with the number behind each.
