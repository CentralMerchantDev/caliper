# Ship it today

Mark sends résumés tomorrow. This is the last round. **Finish and deploy — do not leave anything
parked without saying so loudly.**

Budget: use your own Claude subscription for Anthropic calls. **You are authorised to spend
approximately $0.035 of Mark's OpenAI budget, once, for a single review call** — needed to capture
the recorded run in item 2. Nothing else.

---

## 1 — Abort and retry do not work. Fix them first.

Mark aborted a run. It stayed on screen. It offered retry. He retried. Nothing happened.

Reproduce it, find the real cause, fix it. Then verify by driving each of these against the
deployed URL and confirming the observed behaviour, not the intended one:

- **Abort mid-run** → the run stops, the UI says so, the state is terminal, and the bar returns to
  accepting a new request. It does not linger offering an action that does nothing.
- **Retry after a failure** → the run genuinely resumes from the last checkpoint and progresses.
  If retry cannot resume, it must not be offered.
- **Abandon** → state is cleared and the visitor can start fresh immediately.

**A control that appears and does nothing is worse than no control.** It has now happened to Mark
twice, and it is the single most damaging thing this app can do in front of a stranger, because the
page's whole claim is that it reports honestly what is happening.

---

## 2 — Record one genuine complete run and make it the default experience

**This restores the approved design in `REBUILD.md` item 2, which was dropped.** Right now every
visitor's first impression depends on a cold live pipeline completing perfectly. That is why this
has failed in front of Mark repeatedly, and it will fail in front of a hiring manager the same way.

**Capture one real, complete run, end to end**, for a request in the cheap class — a lamp post near
the workshop, or the ground into grass. Anthropic stages on your own subscription; the one OpenAI
review call on Mark's key, which is authorised above.

Store the complete transcript: the request, grounding, the plan and its criteria, the gate, the
edit that was applied, the verification results, the review findings, the outcome, and the real
cost and duration of every stage.

**On arrival, a visitor sees that run play back immediately.** Stage by stage, with the real
artifact and the world actually changed at the end.

**Label it honestly and prominently:** this is a recording of a real execution, captured on this
date, not a simulation and not a mock. That honesty is the whole point — a recorded real run
described accurately is credible; a live run that fails is not.

**Keep the live path**, clearly offered as "run it live yourself," rate-limited as it is now. That
is what makes the recording believable rather than a claim.

If the run you capture ends in a refusal rather than a ship, **that is a fine recording** — a
refusal with a specific reason is the thing this app is actually arguing for. Do not re-roll to get
a prettier outcome. Record what happens.

---

## 3 — Lay the site out. Mark is an architect and this is what he is seeing.

His words: *"the houses are all over the place, the sizes, the interiors, the world is a mess, it's
super basic."*

This is not an asset problem. Nobody composed the site.

- **A grid.** Buildings on a consistent module, aligned to a street, with real setbacks. Not
  scattered.
- **Consistent, deliberate footprints.** Buildings can differ in size, but by intent and by a
  sensible ratio — not arbitrarily.
- **Interiors arranged like rooms.** Furniture against walls, circulation space, a bed away from
  the door, a desk to a window, the fridge and counter grouped. A room where objects sit at
  plausible positions reads as designed even at low fidelity; scattered objects read as generated.
- **Consistent wall thickness, door openings, and floor levels** across every building.
- **The outdoor space composed too** — paths that go somewhere, trees and lamps placed with
  rhythm rather than randomly.

All of this is data in the placement list, so it is free and it does not touch the registry
architecture or the regression suite.

**This is the highest-value visual change available and it costs nothing.** Do it before touching
materials or assets.

---

## 4 — Real environment lighting, free and CC0

Add a **CC0 HDRI environment map from Poly Haven** (`polyhaven.com`) — an outdoor sky HDRI, loaded
with `RGBELoader`, driving the scene environment. This is the single largest free quality jump
available and it is a drop-in.

- Vendor the file into the repo. **Verify the licence is CC0** and record it in the repo.
- Keep the file small — a 1K or 2K HDRI is plenty at this scale. Do not ship a 40MB sky.
- Keep the existing day/night cycle driving exposure and the sun; the HDRI supplies ambient and
  reflections.

**Optional, only if items 1–4 are complete and verified:** CC0 low-poly props from Kenney.nl or
Quaternius could replace the primitive-built objects. Judge honestly whether that improves things
within the time available — a half-integrated asset pipeline is worse than well-proportioned
primitives. **If in doubt, skip it and say so.**

---

## 5 — Deploy and verify, then say plainly whether this is sendable

`wrangler deploy`. Then against the deployed URL:

- Abort, retry and abandon each driven and observed to behave correctly.
- The recorded run plays back on arrival, complete, correctly labelled.
- The live path still works and is clearly distinguished from the recording.
- Before and after screenshots of the site layout.
- Regression 9/9 unedited. Full suite passing. No console errors.
- 375px verified visually.
- No model names, no internal identifiers, on any served asset.
- HDRI licence recorded.

**Then give Mark a straight verdict**: is this in a state he can send to an employer tomorrow, or
is it not? He has two finished résumés, a finished portfolio and a finished DATUM. This is upside,
not a dependency, and he should not send something that undercuts the rest.

Say what you would still fix, and say whether any of it is disqualifying. **If your honest answer
is that it is not ready, say that** — it is more useful to him than an optimistic one.

---

## How to work

One item at a time, committed separately. Verify by running and observing, not by reading code.
Never stall — park and say so. Fail closed. Never bulk-delete.

Items 1 and 2 are the ones that decide whether this ships. If you run short, they are what must be
finished.
