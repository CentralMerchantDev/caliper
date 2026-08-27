# Before the page: a harder tier, and a reframe

The matrix run is good work. The methodology section in particular — flagging your own convergence
comparison as having wide error bars, and stating that the DW fee is modelled rather than invoiced —
is the standard. Keep writing that way.

Two things to fix before any UI gets built.

---

## 1 — The headline overclaims against your own methodology

"On this task set, at this difficulty level, the cheap model plus verification wins outright."

17 of 18 tasks are 100% final-pass for every model at every tier. So the three identical 98.1%
figures are not three models converging — they are one task carrying all the signal and seventeen
carrying none. Each model failed exactly one cycle of 54, on the same task, for the same reason.

The **cost** claim is solid and stands: Haiku costs 40% of Opus per correct answer.

The **quality equivalence** claim is untested, because capability was never stressed. Your own
"task difficulty ceiling" caveat says precisely this. The headline and the caveat contradict each
other, and the headline is what gets read.

**Fix it two ways:**

**(a) Add a harder task tier.** 6–8 tasks that require actual algorithmic reasoning rather than
edge-case handling — the kind of thing where a capability gap would show up if one exists. Same
3 models × 3 reps. Based on the last sweep that is roughly 72 cycles and about $0.25, so cost is
not a consideration.

This is the move that makes the cost claim carry weight. If Haiku still matches on hard tasks,
that is a strong result. If it does not, that is a *better* result — it locates where verification
stops substituting for capability, which is the actual question the app is asking. Either outcome
is publishable. There is no bad answer here, which is exactly why it should be run.

Select for difficulty, not for a particular model failing. Same rule as before.

**(b) Also raise `MAX_ATTEMPTS` from 2 to 3** on a re-run of the existing set. You named the
one-repair ceiling as a limitation; testing it costs almost nothing and turns a caveat into a
measurement.

---

## 2 — Promote the spec-ambiguity finding to a co-headline

`camel-to-snake` is currently filed as "the exception." It is the most interesting result in the
run and the only one that is not obvious in advance.

Every model, at every capability tier, defaulted to the same alternative reading of an
underspecified rule, and one repair round could not move them even when handed the exact failing
test. **Verification loops fix implementation slips, not spec disagreements.** That is a real,
quotable finding and it is not in anyone else's benchmark.

**And take the edge you are currently leaving on the table:** the models' interpretation
(`parse_http_response`) is arguably the *better* one. Your hidden test encodes
`parse_httpresponse` and is the opinionated party. Say so explicitly. A careful reader who spots
it and has not been told will conclude the benchmark is wrong rather than that the point is
deliberate — and stating it first is the difference between a finding and an error.

It also sharpens the conclusion: when the disagreement is about intent rather than correctness,
the verifier is asserting a preference, not catching a defect. That is a limitation of
verification as an idea, not of this implementation, and it is worth saying plainly.

---

## Then

Report the harder-tier table alongside the existing one, and the `MAX_ATTEMPTS = 3` numbers. Still
no UI — the page gets written once, from final data.
