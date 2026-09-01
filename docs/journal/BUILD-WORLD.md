# CALIPER — build spec: the world, the loop, the app

Mark is asleep. This is an overnight autonomous build. Work through the chunks in order, commit
each separately, and **stop at the paid boundary** rather than waking him to a bill.

---

## HARD RULE — the paid boundary

**Zero API spend on this run. No calls to Anthropic or OpenAI, from the Worker, from a script, or
from you.** Everything in chunks 1–8 is deterministic code, local tests, and UI. None of it needs a
model call to build or verify.

Chunk 9 is the first thing that costs money and **you do not start it.** Build up to it, report,
stop. If a chunk seems to need a paid call, park it, note it, move to the next.

---

## Why this design (read before building)

Sixteen pipeline runs refused. Root cause, established with evidence: the plan stage invented
**numeric mechanisms** and hand-computed expected values contradicting its own stated rules —
"expects hunger 100, correct answer 47." Eleven of sixteen were catchable by a human at the plan
gate, and that gate was auto-approved every time.

This build removes the failure mode structurally:

**1. Change requests become additive and visual, not mechanical.** "Add trees to the world" rather
than "add a pet whose hunger decays and restores." Criteria become **existence and
non-regression** — the style the real production process uses (*this command exits zero, this test
passes, this grep returns nothing*). No multi-step arithmetic to get wrong.

**2. The human gate becomes a conversation.** The system grounds itself in the real current code,
reports what it found, says what it can and cannot do **and why**, proposes alternatives. The
visitor argues, adds, redirects. Work starts only on an agreed plan.

**3. Refusals are earned, not declared.** No rule table. The system tries, hits a real wall in the
code or the budget, and says so citing the actual constraint.

What is being demonstrated: **a system that only says yes when yes is true.** Almost every AI demo
a hiring manager has seen says yes to everything.

---

## MODEL ROUTING — cheap by design, and no Opus anywhere

**Target: under $0.05 per full run.** Current measured is $0.127.

We are **not** demonstrating which model is better. We are demonstrating the build system. So every
stage uses the cheapest model that does its job properly:

| Stage | Model | Why |
|---|---|---|
| Ground | `claude-haiku-4-5` | Reading a structure summary and a short request |
| Plan + criteria | `claude-sonnet-5` | Judgement about feasibility and scope; short output |
| Implement | `claude-haiku-4-5` | Additive change; verified server-side either way |
| Review | `gpt-5.3-codex` | Cross-vendor, coding-specialised, ~⅓ the price of gpt-5.5 |
| Retrospective | `claude-haiku-4-5` | One short lesson or none |

**No Opus on any path.** Remove it from the routing table and from the worst-case cost estimates —
those estimates currently price every stage at Opus rates, which is why the per-run ceiling had to
be $0.90.

Criteria in the new format are far shorter than the numeric ones, and additive changes generate
less code, so output tokens drop on their own. Keep prompt caching on every repeated block.

**Re-derive `PER_RUN_CEILING_USD` from the new numbers** — it should land near $0.15, not $0.90.

The routing panel still shows each stage's model and the reasoning. It should now say plainly that
the routing targets cost, and cite the measured evidence.

---

## CHUNK 1 — Visual identity: architectural, not arcade

**This must not look like a retro game.** No pixel art, no 8-bit, no default shapes, no emoji.

**The world is drawn as a living architectural plan.** Warm paper ground, fine confident linework,
soft material fills, considered proportion — a beautifully drawn plan view that happens to be
alive. That reads as designed rather than programmed, it is distinctive against every other AI
demo, and it is achievable in canvas or SVG without asset pipelines.

- Palette and type from DATUM and the portfolio: `--paper`, `--card`, `--ink`, `--accent`, Source
  Serif and IBM Plex Mono. Carry every accessibility token (`--muted:#6E5E49`, `--line-strong`,
  `:focus-visible` on `--accent`).
- Soft directional light and long soft shadows that shift with the world clock.
- Characters as simple, well-proportioned geometric figures with real animation — not sprites.
- Materials suggested by subtle texture and tone, not by detail.

Spend real effort here. It is free, it is deterministic, and it is the first thing anyone judges.

---

## CHUNK 2 — The intro, tied to DATUM

DATUM opens with a full-screen three.js DNA sequence that then flies into the hero band and keeps
running behind the copy. **Build a sibling, not a copy** — same choreography, different subject:
a drawing that assembles itself from linework into the world, then seats into the page header and
keeps living there.

Carry over what was learned there, exactly:

- **~4 seconds**, not thirteen.
- **Skip button visible from the first frame** — 44px, real button, labelled "Skip intro", not a
  fade-in.
- **The reveal watchdog**: listen for the ready signal; if no painted frame is confirmed within ~1s,
  seat the intro immediately. A blocked CDN or dead WebGL context must never leave a frozen curtain
  over the page.
- `prefers-reduced-motion` skips the full-screen flight entirely.
- Repeat visits skip it via `sessionStorage`.

Two artifacts from the same person should read as one hand.

---

## CHUNK 3 — The world, rendered and alive

- Top-down plot with a room. Objects the sim already knows (bed, fridge, shower, desk) in place.
  One or two sims moving between them.
- **Interpolated motion.** Logic ticks discretely; rendering smooths between tick states so sims
  walk rather than teleport. This one detail separates prototyped from built.
- Readable without text: need levels, time of day, money, current action.
- Play / pause / speed. An event log.
- 60fps, no layout shift, reduced-motion honoured.

**Deliberately sparse.** One room, few object types, no outdoors, no second location. That
sparseness is what makes later refusals real — a portal needs two endpoints and there is only one
room.

**Acceptance:** the world renders, runs, and is watchable for two minutes without anything looking
broken. Regression suite still 9/9.

---

## CHUNK 4 — The world's structure, made legible to the pipeline

The "rules" are not a written list — they are the existing code. Make that inspectable:

- One source of truth for what entity types exist, what the renderer can draw, what the regression
  suite guards.
- A cheap deterministic summary the grounding stage can read: entity types, object types,
  locations, what `tick` touches, what the render loop understands.

No model call. A code-derived description of the world as it actually is.

---

## CHUNK 5 — The grounding stage

`PROCESS-ALIGNMENT.md` named this; it was never built. Before any planning:

- Read the **actual current source**, not an assumption about it.
- Establish whether the request's premises hold. A path existing is not a feature existing.
- Determine what the structure can carry and what it cannot.
- If a premise is false or the structure will not support it, **halt and report**, citing specific
  code, with concrete alternatives.

Build the stage and its plumbing now. It needs one model call to run — that happens in chunk 9, not
tonight. Structure it so prompt and response handling are testable with fixtures.

---

## CHUNK 6 — Criteria: existence and non-regression only

**The change that matters most. Enforce it in the schema, not the prompt.**

Permitted:

- **Existence** — a named entity type appears in world state; a function exists and is callable.
- **Structural** — a field present and correctly typed; a count at least N.
- **Non-regression** — every baseline regression check still passes, unchanged.
- **Render** — the renderer draws the new entity type without throwing.

**Forbidden: any criterion asserting a computed numeric value derived from a multi-step mechanism.**
That class produced all sixteen failures. Reject at schema validation with a clear reason, and say
so in the plan prompt.

Keep the dry-run validator — it kills vacuous criteria (measured 33%) for free. Add `repeat` to the
proposed-criterion schema; the model currently cannot express "tick N times, then check."

---

## CHUNK 7 — Gate 1 as a conversation

Before any code is written the visitor sees:

- What the system found when it grounded itself in the real code.
- What it proposes to build, and what it will not touch.
- The acceptance criteria it will be judged against.
- **What it cannot do, and why** — citing the actual constraint, with alternatives.
- Estimated cost against the per-run budget, and a smaller version if the request exceeds it.

The visitor can **approve, reject, or reply in free text** — adding, disagreeing, redirecting. A
reply re-grounds and re-plans. The gate never advances on silence, never times out into proceeding,
and persists so a run resumes cleanly.

The budget is a real constraint the system works within. "I could do that, but not within one run's
budget — here is what I can do" is one of the most credible moments this app can produce.

---

## CHUNK 8 — The app UI, and controls verified

**UI.** A workspace, not an article. The world large and running, central. A free-text request box
with framing copy that this is a shared world the visitor is adding to. The pipeline streaming
beside it without shifting anything already on screen. Diffs syntax-highlighted with changed lines
marked. Review findings anchored to the code they refer to. Gate 1 and Gate 2 as real decision
moments with weight. The ledger: what was caught, by which stage, what it cost.

Works at 375px. Meaningful content within a second. WCAG AA verified by computing ratios, not by
eye. Report findings grouped by **root cause** with the count of distinct causes as the headline —
never raw finding count, which rewards fragmenting one problem into four.

**Controls.** All already written and tested; wire them to the new paths and re-verify by forcing
each limit, not by reading code.

- Per-run cost ceiling, aborting mid-run, re-derived for the new routing.
- Per-stage token caps. Per-IP daily live-run limit (2), bypassed only by a valid `?k=` code.
- Global daily $2.00, weekly $7.00, monthly $20.00 across both vendors, checked before a run starts.
- Concurrency limit; input guard on the free-text request; circuit breaker.
- Generated code runs only in the Dynamic Workers sandbox — no network, no bindings, hard CPU cap.
  Rendered artifacts in `<iframe sandbox="allow-scripts">` without `allow-same-origin`.
- The spend counter must be **atomic** — KV is eventually consistent and can be raced; use a
  Durable Object.
- A cap being hit explains the design rather than erroring.

**Confidentiality:** no internal identifier from any other project enters this repo, the page, or a
commit message. Unsure — leave it out and flag it.

---

## CHUNK 9 — DO NOT START. Report and stop.

The first live run costs money. Build up to it and stop.

Mark should wake to: the intro and world running and looking genuinely good, grounding and Gate 1
built and fixture-tested, criteria constrained to existence and non-regression, the UI in place,
controls verified, routing re-costed with no Opus anywhere, everything committed — and a report
saying what a first live run would cost and what it would prove.

---

## How to work — operating rules

**Ground before acting.** Re-read the current source before each chunk. A path existing is not a
feature existing. If a premise in this spec is wrong, correcting it becomes the task — say so
rather than building on it.

**One chunk at a time.** Commit each separately with a real message. Do not start a chunk until the
previous one's acceptance holds.

**Verify by running, not by reading.** Show the command and its output.

**Every guardrail needs a test that plants a deliberate violation and asserts it fails.** A
guardrail with no failing test is decoration.

**Never stall.** Park a genuinely blocked chunk with a note and move on. Do not idle waiting for
someone asleep.

**Fail closed.** Anywhere a missing, empty or timed-out signal could read as a pass, it must read as
a failure. Eight instances of the opposite are already on record in this codebase.

**Never bulk-delete.** Move aside to a review folder.

**A weak version of a capability is worse than no version.** Cut scope, never quality within a
capability. Four things properly beats seven roughly.

---

## The report Mark reads in the morning

1. Chunks complete, with commit hashes.
2. Anything parked, and why.
3. Anything in this spec that turned out wrong once you were in the code.
4. The re-derived per-run cost estimate under the new routing, by stage.
5. What a first live run would cost and prove.
6. Total API spend: should be **$0.00**.
