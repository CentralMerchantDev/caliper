# The world is too rigid to build on. Fix the foundation.

**Zero API spend.** All of this is deterministic — stored state, world model, renderer, prompts.
If you believe a paid call is needed, stop and report first. Mark has runs parked at Gate 1; do not
consume or advance them.

---

## The finding, in Mark's words

He asked to add street lamps. **Street lamps already exist in that world.** The system said it
could not do it, and offered no alternative.

> "the base of what it built and the constraints around it are too basic to build off, so we can
> see what we need to improve to be able to have even a simple request actually go through"

He is right, and this is the most important defect found so far. The page argues that the system
says yes when yes is true. If adding a second instance of an object that already exists comes back
as no, then the system is not being principled — it is being incapable, and a visitor cannot tell
the difference. That is worse than not shipping.

---

## 0 — Establish why it refused, from the stored run

Free, and do it first. Find the street lamp run in stored state and report:

- The exact request text.
- What grounding found and what it concluded.
- The plan stage's stated reason for refusing.
- Which stage produced the refusal, and what it cost.

You may proceed to the rest of this brief regardless of the answer — the architectural fix below is
correct either way — but the finding goes in your report, because it tells us whether the block was
the world model, the prompt, or the criteria schema.

---

## 1 — The world becomes data, not hand-written scene code

**This is the core fix.** Right now every object is special-cased in `initialWorld()` and again in
the renderer, so any addition needs bespoke code in two places. That is why simple requests fail.

Restructure into two things:

**A type registry.** One entry per object type, declaring everything the system needs to know:
its geometry recipe from primitives, its material, its footprint, whether it emits light, whether
it is a station a person can use, and if so which action it provides.

**A placement list.** The world's contents as data — which type, where, in which building or
outdoors, with any per-instance overrides such as colour.

The renderer draws **whatever is in the placement list, using the registry** — it never names
individual objects. Add a placement, the object appears. No renderer change required.

**What this makes possible, and it is the whole point:**

- *Add another street lamp* → one entry appended to the placement list. Verifiable by existence.
  No new code.
- *Add a birdbath* → one new registry entry plus one placement. Small, bounded, verifiable.
- *Make the benches blue* → an override on existing placements.
- *Add a second bench by the shop* → one placement.

These are the requests a visitor actually makes, and every one of them becomes a small, checkable,
additive change instead of a rewrite.

**Constraints:**

- `tick`, `chooseAction` and `applyAction` stay untouched. **The nine regression checks must pass
  9/9, unedited.** If one cannot survive this, stop and report rather than editing it.
- `worldStructure.ts` regenerates from the registry and the placement list, so grounding reads the
  real, current capability — including, explicitly, that new instances of existing types are
  supported.
- Surfaces from the previous brief fold into the same model.

---

## 2 — Teach the plan stage what is genuinely cheap

Grounding and planning must know the difference between:

- **Adding a placement of an existing type** — trivial, always possible, no new code.
- **Adding a new type plus placements** — small and bounded.
- **Changing an existing object's properties** — small.
- **Adding a new kind of behaviour or subsystem** — the expensive case, and the honest place for a
  refusal.

Right now everything is treated as the expensive case. That is why it refuses. The world structure
summary must state the cheap operations plainly so the plan stage stops treating a data append as
though it were a feature build.

---

## 3 — A refusal must always carry the nearest thing it can do

This was in the original design and it is not happening. **A refusal with no alternative is a dead
end, and it reads as broken rather than principled.**

Every refusal, at every stage, must state:

1. What was asked.
2. The specific reason it cannot be done — citing the actual constraint in the code or the budget,
   not a general policy.
3. **The nearest thing it can do**, concretely, offered as something the visitor can accept with
   one click.

If it cannot name an alternative, that is itself a signal the refusal is wrong and it should try
again rather than stopping.

Enforce this structurally: a refusal without an alternative should not be a shape the system can
emit. Add a test that plants a refusal with no alternative and asserts it fails.

---

## 4 — The roofs are inconsistent

Two of the four buildings are open-topped so you can see inside; two are closed. It reads as a bug
because it is one.

**Make it consistent.** Every building open-topped in the same way, so the whole neighbourhood is
legible as a build view — that is the right choice for a world you are being asked to add to, and
it matches how the plan view reads. Walls, floors and contents visible everywhere, uniformly.

---

## 5 — Prove the request classes work, without spending anything

Before this ships, demonstrate mechanically — no model calls — that the architecture supports the
requests a visitor will actually make.

Write a test that, for each of these, applies the change as pure data and asserts the world state
updates, the renderer draws it without throwing, and the regression suite still passes:

- Add a second street lamp outdoors.
- Add a bench beside the shop.
- Add a new object type not currently in the registry, and place one.
- Change the colour of an existing object.
- Change a ground surface.

Then produce a short table in your report: **each request class, and whether the architecture now
supports it.** That table is the answer to Mark's question about what needed to improve, and it is
the acceptance test for this brief.

---

## 6 — Two carry-overs from the last report

**a) There may now be two fix-attempt limits.** You reported that `MAX_FIX_ATTEMPTS` did not exist
and added it at 2. There is a record of a `MAX_FIX_ATTEMPTS: 4` being added to `CONTROL_LIMITS`
earlier, alongside `MAX_IMPLEMENT_ATTEMPTS: 4`.

Check whether both now exist. If there are two bounds on the same thing, say which one the code
actually reads, remove the dead one, and confirm the surviving value is the one we want. **Two
sources of truth for one limit is a defect class that has already caused four separate bugs in this
codebase** — do not leave it ambiguous.

**b) The per-run ceiling moved $0.15 → $0.23** to price a pre-review fix loop stacking on the
post-review one. Show the worst-case arithmetic by stage. Then answer directly: can both fix loops
actually run within a single run, or does the structure make that unreachable? **If it is
unreachable, bring the ceiling back down** rather than pricing something that cannot happen.

---

## 7 — Deploy and verify

`wrangler deploy`. Then, against the deployed URL:

- The world renders from the registry and placement list, not from hand-written scene code.
- All buildings consistently open-topped.
- Plan and 3D views both still work.
- The request-class table, all passing.
- Regression suite 9/9, unedited. Full test suite passing. No console errors.
- Refusal-without-alternative test failing as designed.
- No model names, no internal identifiers, on any served asset.
- Mark's parked runs untouched and still resumable.

Paste the raw output.

---

## How to work

Ground before acting. One task at a time, committed separately. Verify by running, not by reading.
Never stall — park a blocked task and move on. Fail closed. Never bulk-delete; move aside.

**Say plainly if you disagree with any of this.** You were right to push back before, and the cost
of building the wrong foundation here is higher than the cost of an argument.

Report what you changed, what you verified and how, and anything in this brief that turned out
wrong once you were in the code.
