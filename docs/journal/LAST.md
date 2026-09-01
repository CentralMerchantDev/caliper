# The last run: fix the blocker, then make it read and look like finished work

Mark is asleep. Overnight autonomous. **Zero spend from his API budget.** Where real model calls
are needed to prove something, use your own Claude subscription through the CLI. Do not consume or
advance his parked runs.

Work in order. Item 1 is the blocker and everything else is worthless until it is fixed.

---

## 1 — The schema bug that killed his run. This is a repeat.

His run reached implement and died four times on the same error:

```
400 invalid_request_error
output_config.format.schema: Invalid schema:
Enum value 'material' does not match declared type '['string', 'null']'
```

**This exact defect was found and fixed earlier in this build.** The Anthropic structured-output
validator rejects `enum` combined with a nullable type array (`type: ["string","null"]`),
regardless of what the enum contains. The fix is:

```
anyOf: [ { type: "string", enum: [...] }, { type: "null" } ]
```

The `WorldEdit` schema written this round reintroduced it.

**Do three things, not one:**

**a)** Fix it in the `WorldEdit` schema.

**b) Audit every schema in the codebase for the same pattern** — not just this one. It has now
appeared twice, in two different schemas, which means finding it by hand does not work.

**c) Add a test that makes it structurally impossible to reappear.** Walk every JSON schema the
codebase sends to a model and assert that no property combines `enum` with a nullable type array.
Plant a deliberate violation and assert the test fails. A guardrail with no failing test is
decoration, and this is the second time this bug has cost Mark a paid run.

**Also: stop retrying permanent errors.** A 400 `invalid_request_error` is not transient. It
retried four times identically. Classify 4xx request errors as permanent — fail once, park the run
with the real reason, and do not burn the clock re-sending a request the API has already rejected.

---

## 2 — Prove it completes, on your own subscription

Drive the full pipeline for **"make the ground into grass"** — the exact request that just failed —
from grounding through implement and verification. Report every stage with its duration, cost and
output.

The review stage still cannot be exercised without OpenAI access. That is fine and expected. Get it
as far as review and report the state it reaches.

Mark should wake to evidence that his request now completes, not to an invitation to try again.

---

## 3 — The run output is hard to read, and the action bar is in the wrong place

His words: *"it is hard to read the prompt outputs and the button you put across the whole bottom
of the page — I thought it would go at the bottom of the output."*

He is right on both, and the second one is my specification error, not yours.

**Move the action bar to the foot of the run output**, not spanning the whole page. It should sit
directly beneath the stage log, sticky within that column so it stays reachable as the log grows,
and visually belong to the output it acts on. The model is a chat composer: it lives under the
transcript, not across the browser. It must still always be visible and never require hunting.

**Fix the readability of the stage output.** Right now every stage is a dense block of prose and
numbers with no hierarchy. Give each stage:

- A clear heading and outcome, readable at a glance.
- **What it wants to do** and **what it will not touch** as distinct, visually separated blocks.
- The acceptance criteria as a real list, with their type as a quiet label, not inline brackets.
- The token counts, cost and duration as a small, secondary footer row — present, not shouting.

**Remove the duplication.** The plan block and the Gate 1 block currently print the same content
twice, verbatim, one after the other. It reads like a bug because it is one. The gate should
present the decision and reference the plan above it, not reprint it.

---

## 4 — The layout

The page is a single column with the world, then a wall of run output, then the bar. It does not
read as a workspace.

Restructure the workspace section: **the world persistent and visible while a run streams beside
it**, so a visitor can watch the thing being changed and the process changing it at the same time.
The run log scrolls; the world does not disappear. The action bar sits at the foot of the log.

Below 900px this collapses to one column with the world sticky at the top. **Verify at 375px in a
real narrow viewport, visually.**

Keep every accessibility token and `:focus-visible` behaviour. No layout shift once anything is on
screen.

---

## 5 — The 3D still reads as mid-grade. Push it.

Mark: *"the 3d and graphics are still kind of weak — at minimum a tweak to make them more high-end
would be good."*

Most of the remaining gap is finish, not geometry:

- **Bevelled or rounded edges on every form.** Verify this actually happened — a hard 90-degree
  edge catching no highlight is the single biggest tell of programmer art.
- **Material variety with intent** — the surfaces data now exists, so use it. Distinct roughness
  and colour response for plaster, wood, fabric, metal and ground. Nothing should share a material
  by accident.
- **Shadow quality up** — higher shadow-map resolution with the shadow camera fitted tightly, so
  contact edges are crisp rather than soft mush.
- **Ambient occlusion in the corners and where objects meet ground.** This is what makes a render
  read as lit rather than coloured.
- **Colour grading** — a considered response curve rather than raw tone mapping. Slightly richer
  shadows, controlled highlights.
- **Restrained bloom on emissives only**, and a subtle vignette.
- **Proportion pass on the props.** Several read as stacked primitives. Better proportion costs
  nothing and reads as designed.

Keep 60fps on integrated graphics, pixel ratio capped at 2. **Screenshot before and after and
compare them yourself.** If the after is not obviously better, say so rather than claiming it.

---

## 6 — Deploy and verify

`wrangler deploy`. Then against the deployed URL:

- The schema audit test passing, with its planted violation failing as designed.
- The completed "grass" run report from item 2.
- The action bar at the foot of the run output, visible at desktop and 375px, screenshotted.
- No duplicated plan/gate content.
- Before and after screenshots of the 3D.
- Regression 9/9 unedited. Full suite passing. No console errors.
- No model names, no internal identifiers, on any served asset.
- Mark's parked runs untouched.

Paste the raw output.

---

## How to work

One item at a time, committed separately. Verify by running, not by reading. Never stall — park a
blocked item and move on. Fail closed. Never bulk-delete; move aside.

**A weak version of a capability is worse than no version.** If the visual pass does not clearly
improve on what is there, keep what is there and say so.

Report what you changed, what you verified and how, and anything here that turned out wrong once
you were in the code.
