# The human gate was never exercised, and it cannot do triage. Test both for free.

**Zero API spend.** Sandbox, node and reading stored data only. If you believe a paid call is
needed, stop and report.

---

## What was confirmed against the real build

From the actual `cross-model-review` skill in the production repo:

```
[PAUSE] HUMAN GATE 1 — a second model reviews the diff; human triages material vs nit
[PAUSE] HUMAN GATE 2 — merge decision
```

> "The two human gates are non-negotiable and never automated. Gate 1 exists because
> 'material vs nit' and 'accepted-by-design' are judgment calls."

Two things follow, and neither is a theory:

**1. CALIPER's plan gate has never once been exercised.** Every sweep pre-authorised it on my
instruction. Sixteen refusals, and in not one of them did a human read the generated plan or its
criteria before implementation began.

**2. CALIPER's review gate cannot do triage.** It offers approve-the-fix or reject-the-run. The
real process's Gate 1 lets a human say **"that's a nit"** or **"that's accepted by design"** — and
"accepted by design" is precisely the verdict the 52-vs-55 criterion needed. That option does not
exist in CALIPER, so even when the gate fired, the judgment the design depends on was unavailable.

---

## The test — free, using stored data

### A. Would a human at the plan gate have caught it?

The plans and criteria from all stored runs are in KV. For each refused run, present the plan and
its criteria **as a human at Gate 1 would see them** — the stated mechanism, then each criterion
with its call, arguments and expected value.

For each, judge as a careful reviewer would:

- Is the expected value **consistent with the mechanism the plan itself just described**? (The
  52-vs-55 case: the plan says decay applies before an action's effect everywhere, then asserts a
  value that requires the opposite.)
- Is the criterion **vacuous** — already true on the baseline? You measured 33% of these.
- Is it **unexpressible** — needing `repeat`, which the schema lacks?

Report, per run: would a human reviewing this plan have rejected or corrected it before any code
was written? Count how many of the refusals were **preventable at Gate 1**.

### B. Would triage have saved the runs that reached the review gate?

For the runs that reached the review gate, look at the findings and the verification failures. Ask:
would a human with the real process's three options — **material / nit / accepted-by-design** —
have resolved it differently than CALIPER's approve-or-reject?

Specifically: were any refusals caused by a criterion that a human would have marked
"accepted-by-design" rather than a defect in the code?

### C. Report against this rule

**A meaningful share of the refusals were preventable at Gate 1, or resolvable by triage** (I'll
take 5 or more of the 16 as meaningful) → the pipeline was never broken; its human gates were
bypassed and under-specified. That is a design fix, not a debugging problem, and it is mostly free.

**Fewer than 5** → the gates would not have saved them and the problem is elsewhere. Say so
plainly and stop.

---

## Do not

- Do not change the pipeline. This is analysis of stored data.
- Do not make paid calls.
- Do not propose what to build next. Report the finding; Mark decides.

Show your reasoning per run, briefly, so Mark can disagree with your judgement calls. You are
standing in for the human at the gate here, which means your verdicts are exactly the thing he
should be able to check.
