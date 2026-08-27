# Cost control and model routing — both are FEATURES, not plumbing

Two additions to the approved design, from Mark. Read alongside `REBUILD.md`.

The principle: a visitor must not be able to burn the credits, **and the controls that stop them
must be visible on the page.** Cost discipline is part of what was built and part of why — it
should be demonstrated, not hidden. This is a production build's control-layer practice made
concrete: validate-before-consume, retry-with-correction, circuit breaker, input guard, audit
trail.

---

## Model choice for the reviewer: gpt-5.5

Use **gpt-5.5** ($5/$30 per 1M). The real process names GPT-5.5 as the reviewer model,
and fidelity to the real pipeline is the point.

**But surface `gpt-5.3-codex` ($1.75/$14) in the routing panel as the road not taken**, with the
measured cost difference. "We chose the more expensive general model over the cheaper
coding-specialised one, for this reason, at this cost" is the routing argument demonstrated rather
than asserted. Do not silently pick the cheap one, and do not hide that it exists.

---

## Model routing must be visible

Stage 2 is currently "deterministic, templated." That undersells it. Build a routing panel the
visitor can actually read:

- Which model runs each stage, and **why that one** — the fit-for-purpose reasoning behind that
  choice, in plain language.
- The **cost of each stage, live, as it runs**, accumulating into the run total.
- Where a cheaper model was considered and rejected, and what it would have saved.

Point at the existing cost experiment as the evidence base for the routing decisions. That is the
old work earning its place: the routing is not a guess, it is derived from 32 tasks across three
tiers.

---

## Spend controls — implement all of these

**1. Per-run ceiling.** Abort a run that exceeds a set cost, mid-run. This catches the case token
caps miss — a run that legitimately fires every stage plus a fix round and still runs long. Show
the ceiling in the UI.

**2. Per-stage token caps.** `max_tokens` on every call, sized from your measured numbers.

**3. Per-IP daily limit on LIVE runs.** Recordings are free and unlimited; only live runs count.
Derive the number from the per-run cost, do not inherit the old constant.

**4. Global daily spend cap, across both vendors.** Anthropic and OpenAI are separate budgets and
both must count toward one ceiling. Check before starting a run, not after.

**5. Global monthly cap** as a backstop, so a single bad day cannot take the month.

**6. Concurrency limit.** Cap simultaneous live runs globally. Queue or refuse beyond it — an
unbounded fan-out is the fastest way to spend everything at once.

**7. Input guard on free-form.** Length limit on the prompt, and reject input that is transparently
an attempt to force enormous output. This is the one path where a visitor controls the input, so it
is the one that will be attacked.

**8. Circuit breaker.** Consecutive failures from a provider stop calls to it rather than retrying
into a wall.

---

## Make the controls visible — this is the part that matters

- **Show today's remaining live-run budget on the page**, always, not only when exhausted.
- **When a limit is hit, explain the design rather than erroring.** "This demo runs on a fixed
  daily budget — here is the cap, here is what a run costs, here is why the limit exists. The
  recorded runs below are complete and free." A cap hit should teach something, not look broken.
- **Show the per-run cost as it accrues**, stage by stage, in real time.
- Give the control layer **its own short section**: every limit, its value, and what it protects
  against. An engineer reading it should see a system designed by someone who has paid an AI bill.

---

## And the honest note

State plainly that the recorded runs exist partly because a public demo running four real model
calls per visitor is not affordable, and that this is itself a real product constraint — the same
kind of decision the routing table encodes. Do not present the recordings as a UX choice when the
primary driver was cost.

---

## Where this sits in the order of work

Controls land with step 2 (pipeline working end to end), not bolted on afterwards. The trials in
step 3 will themselves consume budget, so the caps need to be real before you run fifteen live
pipelines.
