# BUILD — the experiment, not the demo

The spike is complete and every question it was set has an answer. Read `README.md` first; do not
re-derive any of it.

**What the spike settled:** Dynamic Workers is the execution layer. Network and env isolation are
proven adversarially. Runaway CPU, memory and recursion are all catchable by the parent. `cpuMs`
has a ~2s enforcement floor, so the parent imposes its own wall-clock abort and rate limiting is
the real cost control. Cost is ~$0.0064 per cycle, of which the Dynamic Worker fee is ~31%.

**What the spike killed:** the build-demo framing. Sonnet 5 passed 17/17 first attempt, including
the traps written to catch it. An app whose premise is watching a model get caught and corrected
has nothing to show when the model doesn't fail — and any version that leans on a deliberately
weak model to manufacture drama is theatre.

---

## What we are building instead

**A published experiment: does a verification loop substitute for model capability, and what does
it cost?**

Same tasks, several models, measured end to end. The output is a results table anyone can read,
backed by per-run detail anyone can inspect, plus the ability to trigger one live run.

The reason this is the right shape: it does not depend on models being bad. If a frontier model
passes everything, that is the result — verification added nothing at this difficulty, and here is
the price you paid for it anyway. The artifact stays honest and stays interesting as models
improve. The demo framing decays; this does not.

---

## What to measure, per (model × task × repetition)

- First-attempt pass / fail
- Number of repair rounds needed to reach passing, or failure to converge
- Final pass / fail
- Generation cost, Dynamic Worker fee, total cost
- Wall time
- Which hidden test failed first, and the failure text fed back

Aggregate into: **first-pass rate, convergence rate, mean repair rounds, and total cost per
correct answer.** That last one is the headline — it is the number that decides whether the loop
earns its keep, and it is not a number anyone else's demo reports.

---

## Task set

The three seed tasks are not enough and are too easy. Build out to **15–20 tasks** with real range
— string and date parsing, interval and graph work, numeric edge cases, stateful reducers,
tolerant parsing of malformed input, and a few with genuinely ambiguous specs.

**Select tasks for coverage, not for failure.** Do not go hunting for prompts that break models.
If several tasks come back at 100% across every model, publish that. A task set curated to produce
failures is a rigged experiment and would be the same defect we have spent two days removing from
DATUM.

Every task needs hidden tests the generating model never sees, and each test needs a one-line
plain description so a reader can see what was actually being checked.

---

## Models

At least three across a real capability and price range. Include the cheapest credible option and
a frontier model. Record the exact model ID and the date of every run — results expire, and a
table without a date on it is worthless in six months.

---

## Architecture decisions, already made — do not relitigate

- **Results are precomputed and stored.** This solves the per-visitor cost problem: the matrix is
  run by us, not by visitors, so cost scales with the experiment rather than with traffic.
- **One live run available on demand**, rate-limited per IP and behind the daily spend cap, so the
  page is not just static claims. A visitor can pick a task and model and watch one real cycle.
- **Parent Worker imposes a wall-clock abort** (~3s) on every sandbox call. Do not rely on `cpuMs`
  for latency bounding — see the measured floor in `README.md`.
- **Keep `SandboxRunner` as the single execution interface.** Dynamic Workers is beta; the swap to
  dispatch namespaces must stay a config change.
- Spend cap and per-IP rate limit stay from the first commit.

---

## The page

Lead with the question and the table. Not with architecture, not with a diagram of the agent loop.

Then, in order: the results table; cost per correct answer; a methodology section stating sample
size, task selection, what is not controlled, and what would change the conclusion; the live run;
and only then how the sandbox works.

Write the methodology section as if a skeptical reader will look for the flaw — because they
will, and finding it stated already is the difference between careful and lucky.

**If the result is that verification does not pay for itself, publish that.** It is the more
interesting finding and it is the one you actually have evidence for.

---

## First step

Do not build the page. Build the matrix runner and the expanded task set, run it, and report the
table. The numbers decide what the page says. Report back before writing any UI.
