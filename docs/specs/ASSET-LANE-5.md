# CALIPER — ASSET LIBRARY LANE, BRIEF 5

## 0. THE DECISION THIS BRIEF EXISTS TO CORRECT

Mark: *"I think it maybe too much work... unless it can build them to an
extremely high quality quickly it seems like it is going to take a lot of work
to get all the models that we need."*

He is right, and the reason is not the one that looks obvious.

"Build everything procedurally" was applied as a BLANKET RULE. It is the correct
rule for most of this library and the wrong rule for a small part of it, and
applying it everywhere costs the most where it helps least.

**Where procedural is not a preference but a requirement.** 163,410 parts render
in 14 draw calls only because geometry is SHARED across instances. An imported
mesh brings its own geometry and its own material: import forty props and you add
forty draw calls and forty textures before anything is on screen. For anything
repeated at scale — buildings, trees, cars, people, road pieces, roof clutter —
importing is not a shortcut, it is an architectural regression. And repetition is
visible: 5,665 terraces drawn from a 35-model kit reads worse than what exists
now, because the eye catches a repeat instantly. That reasoning holds.

**Where it is wrong.** A statue, a fountain, a cathedral rose window or a
playground assembled from boxes and cylinders reads as boxes and cylinders. For
something seen ONCE and seen CLOSE, an artist's model wins on quality per hour by
a wide margin. CIVIC is twelve buildings carrying a cathedral, a central station
and a stadium between them. Those twelve deserve more hours than the other
16,605 combined.

**And the volume worry is real but misdiagnosed.** Importing does NOT remove the
work, because every asset still has to satisfy the contract: measured footprint
and sweep, re-origined to base-centre, decimated to three declared LODs, wrapped
in a declaration, and instanced. That is most of the cost of a simple procedural
model anyway. So importing a hundred props does not take a week off the schedule.

The weeks are not in the tail at all. They are in TERRACE and TOWNHOUSE — 12,157
of 16,617 buildings. That is not a model-count problem, it is a COMBINATION
problem, and it is solved by one good generator, not by a hundred models.

**So: the instinct to enumerate is the trap.** Thirty more one-off models is
weeks. Five more generators that produce those thirty categories is days. Stop
counting models. Count generators, and count the things a visitor will actually
look at.

## 1. FIRST, LOOK AT WHAT YOU ALREADY BUILT

Fifty-six models exist and **nobody has ever looked at one of them.** The contact
sheet renders them; it has not been opened. Every quality judgement in this brief,
including the one above, is therefore a guess.

Before building anything else:

    node scripts/shoot.mjs           # confirm the tooling works for you
    # then render the contact sheet itself to PNG, headless, the same way

Write `scripts/shoot-kit.mjs` — the same harness pointed at
`kit-contact-sheet.html`, one PNG per filter tab, into `.shots/kit/`. Then LOOK
at them, and write down, per category, whether it reads as the thing it is meant
to be at street distance.

That is the measurement that settles build-versus-import, and it does not exist
yet. If the fifty-six look good, the procedural path is proven and the rest of
this is scheduling. If they look like primitives, we have learned that early and
cheaply instead of after another thirty.

## 2. THE REGISTRY — WHAT EXISTS **AND WHAT IS NEEDED**

Mark: *"make sure there is a registry not just of what is there but also what is
needed."*

Right now the only inventory is the list of what happened to get built, so
"how many are left" cannot be answered without grepping the source. Create
`public/asset-registry.js` — data, not prose — with one entry per item the world
needs, built or not:

```js
{
  id: "traffic-light",
  category: "street",
  status: "built" | "planned" | "generator" | "skipped",
  source: "code" | "import",        // how it should be made
  seenAs: "close" | "mid" | "far",  // how a visitor actually encounters it
  count: 2400,                      // roughly how many the world places
  generator: "streetFurniture",     // if it comes from a family, which one
  note: "",                         // only when a decision needs explaining
}
```

`seenAs` and `count` together decide `source`, and the rule is written once here
rather than argued per item:

- `count` in the thousands → **code**, always. Shared geometry, no exceptions.
- `seenAs: "close"` and `count` under ~20 → hand-built with real effort, or
  import if a genuinely CC0 model exists that is better than what you would make.
- everything else → code, cheapest reasonable version.

Export `registrySummary()` returning built / planned / skipped counts per
category, and have the contact sheet render the GAPS as labelled empty cells
alongside the models. A registry that only lists what exists cannot tell you how
far along you are, which is the whole reason for asking for one.

## 3. STOP ENUMERATING. BUILD GENERATORS.

The thirty categories from brief 4 are one model each. Do not build thirty more
one-offs. Build the families that produce them:

1. `streetFurniture(kind, variant)` — bins, bollards, signs, cabinets, hydrants,
   racks, planters. One parameterised post-and-body generator covers most of it.
2. `roofClutter(kind, size)` — plant, chimneys, aerials, dishes, solar, AC.
   **Highest value in the whole library**: 18,758 roofs, and roof clutter is what
   a skyline is made of at the distances this camera sits at.
3. `facade(kind, width)` — shopfronts, awnings, shutters, balconies. Widths are
   driven by the bay rhythm `buildings.js` already computes.
4. `boundary(kind, length)` — fences, railings, hedges, walls, gates. All tiling
   pieces on the 8 m module.
5. `groundFurniture(kind)` — manholes, gratings, markings, stall frames.

Each declares how many distinct variants it can produce, and the contact sheet
renders the full matrix so the claim is visible rather than asserted.

## 4. THE CENTREPIECES GET THE HOURS

Twelve CIVIC buildings. Cathedral, central station, stadium, city hall, museum,
opera house, courthouse. These are the buildings a visitor flies to and looks at,
and they are the only ones where a one-off is the right shape of work.

Spend real effort per unit here — massing, a roofline that reads, openings with a
rhythm, a silhouette recognisable from a kilometre out. If a genuinely CC0 model
would be better than what you can build, say so and say which, and Mark will
decide. That is the one place in this library where importing is worth its
integration cost.

## 5. WHAT TO IMPORT, IF ANYTHING

After §1, if the render shows a category that plainly does not read, name it and
propose an import with a specific CC0 source. Do not import speculatively. The
policy in `LICENCES.md` stands and it is now honest — keep it that way.

## HOW WORK IS ACCEPTED — unchanged

`npm test` green and `npx tsc --noEmit` clean before every commit. A green suite
is not evidence a control works; mutate one control at a time, verify each
mutation landed before reading its result, and record any that survive. Nothing
is deleted — move it to `_TO-DELETE/<reason>/`. Commit to `assets-lane`; never
merge to main yourself.

Report what you MEASURED and what you did not get to.
