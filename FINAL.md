# The last brief: converge before review, one place to act, surfaces, plan view, light

**Zero API spend.** Every task here is deterministic — control flow, UI, renderer, sim data. If you
believe a paid call is needed, stop and report before making it. Mark has a run parked at Gate 1
that already cost 5.3¢; do not consume or advance it.

Work in order. Commit each separately. Verify by running, not by reading.

---

## What the investigation established — do not re-litigate it

Your findings were correct and are the basis for this brief:

- Mark's grass run never reached review. It asked a clarifying question, he answered, it re-planned,
  and it is parked at `awaiting-plan-decision`. Normal Gate 1 behaviour.
- **But the control-flow gap is real**, independently confirmed on run `823decc7` — 2 of 8 criteria
  failing, review entered anyway. The only gate between verification and review is the `if (fatal)`
  sandbox check.

So two separate things need fixing: the pipeline order, and the fact that a visitor cannot tell
when it is his turn. He has now misread a Gate 1 halt as a stuck review stage twice. That is a UI
defect, not a user error, and copy alone has already failed to fix it once.

---

## 1 — Verification must converge before review

**The rule:** cross-model review runs once, at the end, on code that already passes its own
acceptance criteria and the full regression suite. This is how the real process works — the
reviewer reads a diff that has already passed CI. Sending failing code to a reviewer spends money
on an opinion about work that was never ready, and it demonstrates the opposite of what the page
claims.

Restructure `runChangePipeline`:

- **The implement → verify → fix loop runs to convergence first.** Fix attempts are already bounded
  by `MAX_FIX_ATTEMPTS`; that loop belongs *before* review, not after it.
- **Entry to `reviewing` requires**: every acceptance criterion passing, the full regression suite
  passing, and no fatal sandbox error. Assert this explicitly, in code, at the entry point.
- **If it cannot converge within the fix ceiling, refuse without calling the reviewer.** Report
  which criteria still fail and how many attempts were spent. A refusal that says "I could not make
  this pass, here is exactly what failed" is a better outcome than a review of broken code, and it
  costs less.
- Review findings may still trigger a fix round after review. That already exists — keep it, and
  keep the existing structural guarantee that review is entered at most once per run.

**Test it.** Add a test that plants deliberately failing verification results and asserts the
reviewer is never called. A guardrail with no failing test is decoration.

---

## 2 — One place to act. This is the most important change in this brief.

Mark's instruction, and it is the correct diagnosis of his own confusion:

> "the button to move the system or stop it should be always there at the bottom so that you can
> add, stop or approve from the same place and where it would make the most sense to do so, similar
> to how this system we are working on operates."

Build a **persistent action bar, fixed at the bottom of the workspace, always visible.** It is the
single place anything is ever asked of the visitor. Its contents change with the run's state; its
position never does.

- **Idle** — the request input, with its one quiet placeholder example, and the submit action.
- **Running** — what stage is active, the cost so far, and a **stop** action that actually halts the
  run. Stop must always be available while anything is running.
- **A question was asked** — the question, plainly worded, with the answer field right there.
- **A gate is parked** — the decision, and the actual choices as real buttons: approve, reject,
  reply. Plus a plain statement that nothing is being spent while it waits.
- **Finished or refused** — the outcome, and the way to start again.

**Requirements:**

- It must be **visible without scrolling**, at every viewport width, at every point in a run.
- When the state changes to one that needs the visitor, the bar must **change visibly** — not only
  in wording. A person who has looked away and glanced back should register it immediately.
- It never appears empty and it never disappears.
- Keyboard reachable, `:focus-visible` on every control, and it must not obscure content behind it
  at 375px.

The scattered per-stage controls elsewhere in the page come out, or become read-only summaries. **If
an action can be taken, it is taken from the bar.** Two places to approve is the bug that caused
this.

Verify by driving each state and screenshotting the bar in every one of them.

---

## 3 — Say what is being asked, plainly

Mark's note: *"the output needs to be clearer about what it is suggesting and asking."*

His grass run asked whether he wanted uniform grass or per-lot variation. That is a good question,
and he never saw that he had been asked one.

- **A question is a question.** Lead with it, in plain words, at the top of the bar. Not buried
  under the plan it came from.
- **A proposal states what will change, what it will not touch, and what it will be judged on** —
  in that order, in short sentences, before any technical detail.
- **Structure over prose.** What it wants to do. What it will not do. How it will know it worked.
- The reasoning stays available for anyone who wants it, below, but it is not the first thing read.

---

## 4 — Ground and surfaces should be things you can change

Mark asked to change the grass, and the world has no concept of a ground surface — so a natural,
obvious request had nowhere to land.

Give the world **named surfaces as real, addressable data**: the ground, paths, building floors,
roofs. Each with a material and a colour in world state, drawn by the renderer from that data, and
described in `worldStructure.ts` so grounding sees them.

This is not cosmetic. It turns a whole class of obvious request — change a surface, add a surface,
re-material something — into work the pipeline can actually do and verify by existence and
structure. That directly serves the goal that most requests a visitor thinks of should succeed.

Keep it honest: `worldStructure.ts` stays code-derived from the real data. And **the nine regression
checks must still pass 9/9, unedited.** If one cannot survive this, stop and report rather than
editing it.

---

## 5 — Light: brighter, in both states

Mark: *"it is too dark both day and at night."* The last pass overcorrected on my note about night
being muddy.

- **Day should be bright and warm** — clearly daylight, everything legible, materials reading their
  own colour. This is the first impression and it should be the strongest frame in the cycle.
- **Night should be dark but still readable** — a person should see the whole neighbourhood, with
  the lamp pools as the warm accents rather than the only light. Not black, not brown.
- Raise the base exposure across the cycle. Keep the day/night difference you achieved; move both
  ends up.

Verify by screenshotting midday and midnight and looking at them. If anything in either frame is
hard to make out, it is still too dark.

---

## 6 — Clock speed: find the middle

Mark: *"the run is too fast so it is annoying to use as it goes from night to day in seconds."*

It was far too slow before and is now far too fast. Target a **full day in roughly two to three
minutes** — slow enough that nothing strobes or flickers, fast enough that a visitor who watches
for a minute sees the light genuinely move.

Transitions between times of day must be smooth and continuous, never stepped. Time it and state
the measured seconds-per-day in your report.

---

## 7 — A 2D plan view alongside the 3D

Mark: *"there should be a 2d plan and 3d view, it will make it easier to add on to the game."*

He reads plans for a living, and he is right that a plan is the better view for deciding where
something should go.

- **A toggle between plan and 3D**, on the same world state, sharing one source of truth. Not a
  second world — a second view of the one world.
- **The plan view is a drawn architectural plan**, not a flattened 3D render: clean linework,
  correct proportion, walls and openings read as walls and openings, objects as recognisable plan
  symbols, labels where they help. Warm paper ground. It should look like something drawn, because
  that is the language he works in and it will read as designed rather than generated.
- People move in it, live, as they do in 3D.
- The toggle state persists across a run so a visitor is not thrown back to the other view.

**This one is optional in the sense that a weak version is worse than none.** If the plan view
cannot be made to look genuinely good, ship the 3D alone and say so in your report. Do not ship a
grey top-down wireframe and call it a plan.

---

## 8 — Deploy and verify

`wrangler deploy`. Then, against the deployed URL:

- The action bar is visible without scrolling in every run state, at desktop and 375px, with a
  screenshot of each state.
- A run with failing criteria refuses without calling the reviewer — proven by the planted test.
- Day and midnight screenshots, both legible.
- Measured seconds per world day.
- Plan and 3D views both render and both animate, or a statement of why the plan view was cut.
- Surfaces present in world state, in the renderer, and in the generated world structure.
- Regression suite 9/9, unedited. Full test suite passing. No console errors.
- No model names, no internal identifiers, on any served asset.
- Mark's parked run is untouched and still resumable.

Paste the raw output.

---

## How to work

Ground before acting. One task at a time, committed separately. Never stall — park a blocked task
and move on. Fail closed. Never bulk-delete; move aside.

Report what you changed, what you verified and how, and anything in this brief that turned out
wrong once you were in the code. Say plainly if you disagree with something here — you were right
to push back last time.
