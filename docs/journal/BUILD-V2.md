# CALIPER v2 — the pipeline modifies a working system, and learns from every run

This supersedes the preset-generation design. The pipeline, control layer, sandbox, cross-vendor
reviewer and cost experiment all carry over. What changes is what it works on, and what it does
afterwards.

---

## The change: modify existing code, don't generate from nothing

Generating a standalone artifact demonstrates an easier job than the one Mark actually does. His
process changes one part of a large working system under a brief, a review and a gate.

**So: a working game ships with the app. The visitor requests a change to it. The pipeline plans,
builds, verifies, reviews, gates and ships that change — and the game visibly changes.**

This gives us the strongest verification available: **regression.** There is a working baseline, so
"did this break something that already worked" is a real, server-side, answerable question. That is
the golden-set discipline from a real production build, and a reviewer catching a regression the
visitor never considered is the best single moment this app can produce.

### The base game: a minimal life simulation

**Build a small Sims-style life sim.** Not Snake, not a puzzle game — the deciding factor is that
a visitor must arrive with a change already in mind. Nobody looks at Snake and thinks of something
they want changed. Everybody looks at a little person with needs and immediately thinks "give them
a pet," "make them get sick," "add a job that pays more."

Baseline: one or two sims in a small room, with needs (hunger, energy, fun, social, hygiene) that
decay on a tick, objects that satisfy them, a clock, money, and a job. Each sim picks the action
that best addresses its most urgent need.

**All logic as pure functions** — `tick(world) → world`, `chooseAction(agent, world) → action`,
`applyAction(world, action) → world`. Rendering is a thin layer on top. That constraint is
load-bearing: pure logic means the regression suite runs server-side through the existing
`SandboxRunner` with real guarantees.

**Scope guardrails, non-negotiable — a life sim balloons:**

- Discrete tick-based time, never continuous.
- One small room. Two sims maximum at baseline.
- A fixed, small object set.
- Seeded RNG throughout, so every run is deterministic and regression tests are repeatable.
- If a feature is not needed to make change requests interesting, it does not ship.

**Why this beats a simpler game for our purposes:** the systems already interact. Needs drive
decisions, money constrains objects, sleep drives energy drives work drives money. So "add a pet"
genuinely risks breaking scheduling, because the pet competes for time and money. Real regressions
arise naturally instead of being manufactured — which is the whole point of having a baseline.

**The regression suite is the crown jewel.** Every claim rests on it. Genuine coverage of current
behaviour, verified against independently written references, built before anything else. The
rules here are explicit numeric relationships and should be tested as such: after N ticks without
food, hunger equals X; an agent below hunger 20 chooses eating over socialising.

**Preset change requests** should be things an ordinary visitor would actually think of, and at
least two should touch more than one system. Candidates: add a pet that needs feeding; add a
second sim who can socialise; add a night shift that pays more but drains energy faster; add
illness triggered by low hygiene; add a savings goal that buys a better bed.

---

## Plan mode is stage 1

Mark's real process is plan-mode → brief → implement. Plan mode is where underspecification gets
resolved *before* work starts, and it is a second human gate at the front.

The visitor states a change. **The system plans it back to them**: what it understood, what it will
build, how it will be judged (the machine-verifiable acceptance criteria, before any code), what it
will not touch, and anything it needs confirmed. The visitor approves or corrects.

**When the request is ambiguous or the system cannot independently verify part of it, it asks a
specific question about that specific thing.** Not a warning, not a category label — a question,
in context, that a person can answer. Then it proceeds and does exactly what it said it would.

---

## Tone: no pre-emptive disclaimers

A rule for all copy in this app.

**Report facts about a run.** What was checked, what was found, what was fixed, what a human
approved, what a check could not establish about *this specific artifact*. That is a result and it
belongs in the ledger.

**Do not pre-warn about categories.** No "this path has a weaker guarantee," no "this check is
self-reported," no advance apology for a limit the visitor has not hit and may never hit. Where
something genuinely cannot be verified, the answer is to have the system ask a question at the
time, not to label the whole feature as weak.

Set expectations positively and with examples — show what it does well, then let it do it.

---

## Logs are load-bearing, not a byproduct

Every run appends a durable record: the request, the plan and any questions asked, the criteria,
the routing decisions, the generated diff, verification results including regressions, every review
finding with its severity, the triage outcome, the gate decision, the fix, the final result, cost
and timing per stage.

That log then **feeds forward**:

- **A retrospective stage runs after each completed run.** It reads the log, extracts what was
  learned, and updates a persistent instructions file — the equivalent of a persistent
  agent-instructions file and memory directory in the real system. Those accumulated notes are
  given to the implementer and reviewer on subsequent runs.
- **Recurrence is measured.** Does the same defect class appear again after being recorded? Report
  the number when there is data behind it.
- **Routing is refined from the log.** Cost and outcome per model per stage accumulate, and the
  routing table is derived from them rather than asserted. The existing cost experiment is the
  starting evidence base — that is where the old work earns its place.

Show the accumulated instructions file in the UI. A visitor should be able to read what the system
has taught itself, and see it grow.

---

## Make the agentic part real, and visible

Agentic means the system decides, not that it has stages. Concretely, it must:

- **Choose its own next action from state** — proceed, ask, retry, escalate, stop — rather than
  running a fixed script.
- **Ask rather than guess** when it lacks what it needs, and carry the answer forward.
- **Route models per task**, using the accumulated data, and show the reasoning.
- **Read its own history** and behave differently because of it.
- **Refuse to close** when a fix does not hold, rather than shipping.

Surface each decision point in the UI with the reasoning behind it. The decisions are the demo.

---

## Cost — much lower than v1

This is a job-application artifact, not a product. Total lifetime budget in the tens of dollars.

- **Recorded runs are the default experience** and carry everything. Real captured runs, complete,
  instant, free.
- **Live runs are rare and tightly gated** — one per visitor per day.
- **Cheaper models everywhere a stage does not need a strong one.** Justify each choice from the
  cost data.
- **Controls exist and are documented in a short section**, not displayed as a live meter. Remove
  the budget counter from the UI entirely — it makes the reader think about the bill instead of the
  work.

Re-derive every limit for this design and report the numbers before running trials.

---

## Visual and interaction standard — F1, not "good enough"

Mark designs for a living and will judge this against professional work. Generic dashboard styling,
default browser controls, emoji-as-graphics or an unstyled canvas will be rejected. The bar is that
this looks deliberately designed, because a reader forms a judgement about the engineering from how
the surface looks — fairly or not.

**Design language.** Sits in the same family as DATUM and the portfolio: warm paper palette, Source
Serif headings, IBM Plex Mono for data. Carry every accessibility token already fixed
(`--muted:#6E5E49`, `--line-strong` on control borders, `:focus-visible` with `--accent`). Two
artifacts from the same person should read as one hand.

**The game renderer.**

- Canvas or SVG with actual art direction. Not ASCII, not emoji, not default shapes.
- **Interpolated motion.** Logic ticks discretely; rendering must smooth between tick states so
  sims walk rather than teleport. This is the single biggest difference between looking prototyped
  and looking built.
- 60fps, no jank, no layout shift.
- Sims rendered as simple geometric characters — but proportioned, animated and readable at a
  glance. Charm matters here.
- World state legible without reading text: need levels, time of day, money, current action.

**The pipeline view is the hard design problem — treat it as one.**

- Stages stream in without shifting anything already on screen.
- Diffs rendered properly: syntax highlighted, before and after, changed lines marked.
- Review findings anchored to the code they refer to, not listed separately from it.
- The human gate is a real decision moment with weight — not a toast or an inline button.
- The accumulated instructions file readable and visibly growing.

**Measurable bars, verified rather than assumed:**

- WCAG AA on every text and UI element — compute the contrast ratios, do not eyeball them.
- Every interactive element keyboard reachable, with a visible focus state.
- `prefers-reduced-motion` honoured throughout, including the game renderer.
- Works at 375px width. A hiring manager may open this on a phone.
- Something meaningful on screen within a second.

**Sequence:** logic and regression suite correct first — a beautiful shell over broken rules is
worthless. But build the renderer properly the first time rather than planning to polish later.

---

## Order of work

1. The base game, with its regression suite verified against independent references.
2. Plan mode, including the ask-a-question path.
3. The pipeline running end to end on one real change request.
4. Logs, retrospective stage, and the accumulated instructions file.
5. Trials: four or five preset change requests, several runs each. Report the clean rate, the gate
   rate, every finding for human calibration, and measured cost and wall-clock.
6. Recorded runs captured.
7. The app UI.

**Report after step 3 and again after step 5.** The UI gets written from real numbers.

State what you are about to spend before spending it.
