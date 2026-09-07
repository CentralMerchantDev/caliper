# THE PLACEMENT CONTRACT

**Both lanes build to this file. Neither lane may change it alone.**

Mark, 2026-09-06:

> shouldn't everything be built up from the models […] otherwise roads and such
> that it lays out won't actually work with the game, you won't be able to
> change them as they aren't built the same way or correctly […] so that what it
> builds you can use and vice versa

He is right, and this file is the answer to it.

---

## THE PRINCIPLE

**A model declares what it needs. The board is carved to fit models. Never the
other way round.**

A thing that states its own requirements can be swapped for any other thing that
states the same requirements. That is what makes a game board a game board
rather than a picture of one: the player can demolish a shop and put a tower
there, because both are describable in the same units and the ground can answer
whether it fits.

Everything below exists so that sentence stays true.

---

## THE BUG THIS FIXES, MEASURED

`buildings.js` **already builds in cells.** Every typology takes `cellW`/`cellD`
and computes `footW = cellW * 8`:

| Typology | cellW range | Metres |
|---|---|---|
| villa / house | 2–3 | 16–24 |
| shop | 2–4 | 16–32 |
| walk-up | 3–5 | 24–40 |
| mid-rise | 3–6 | 24–48 |
| (largest) | 4–8 | 32–64 |

`PLOT_CLASSES` in `city-plan.js` **does not**:

```js
TERRACE:   { minW: 8,  maxW: 16, minD: 22, maxD: 34, module: 8 },
TOWNHOUSE: { minW: 14, maxW: 26, minD: 26, maxD: 40, module: 8 },
MIDRISE:   { minW: 26, maxW: 52, minD: 32, maxD: 60 },   // no module
TOWER:     { minW: 45, maxW: 90, minD: 45, maxD: 90 },   // no module
CIVIC:     { minW: 60, maxW: 180, ... },                  // no module
```

The two smallest classes declare the 8 m module. **Every larger class omits it**,
and `TOWER`'s minimum of 45 m is not a whole number of cells — 45 ÷ 8 = 5.625.

So a model says *"I am six cells wide"* and a plot says *"I am 47.3 metres
wide"*, and nothing reconciles those two statements. That is the same failure
pattern as the class-binding bug in `WORLD-DENSITY-FINDINGS.md` §3 — two sources
of truth with nothing between them — one level further down, and it is why only
4.19% of plots can hold a tower.

---

## PART 1 — SPACE, NOT TYPE

**Superseded 2026-09-06, by Mark, before the first version was built on.** The
original Part 1 asked which plot classes could hold which typologies, and
proposed narrowing the TOWER plot bracket to fit the tower model. Mark rejected
the framing, not the answer:

> the plots should not be made to suit a single type of building — you should be
> able to put any building you want anywhere you want. Buildings just require a
> set amount of space open to be able to build them / place them […] it just
> needs to be known the amount of open space that is needed for it
>
> over time we can grow restrictions about what is needed in an area before a
> certain type of building can be put there — that is more about the game than
> it is about the board

This is the same correction he gave on height caps, one level up. **A plot is
not a slot for a kind of building. It is space.**

### The model

**A plot is an area of free, buildable cells. That is its only property.** Not a
class, not a type, not a permitted use.

**A building declares what space it needs.** Two numbers, both in whole cells:

- **`foot: { w, d }`** — the ground the building itself stands on.
- **`clear: { w, d }`** — free space required *around* the foot. Mark:
  *"towers need room around them for walking and driveways and such."* A tower
  is not just its plate.

**The placement question is arithmetic, and it is the only one the board asks:**

> Is there a rectangle of free, buildable cells at least `foot + clear` in both
> directions, at this location?

Yes → it can be built. That is the whole rule. No class check, no use check, no
height cap. A villa may go downtown. A tower may go in a field, if the field has
the room.

### Why this is also the correct engineering answer

It removes the two-sources-of-truth problem instead of reconciling it. There is
no longer a declared class to disagree with carved geometry, because there is no
declared class. The 4.19% figure stops being a defect and becomes a plain fact
about how much of the world has 45 m of clear space in it.

It is also what makes the game a game. A board where each plot admits one kind
of building is a diorama with swappable parts. A board where space is the only
currency is something a player can reason about — the SimCity rule, and the
reason Mark keeps arriving back at it.

### Where building types still live

**World generation.** Something must decide what to put on each plot when the
world is first built, and that is where "downtown gets towers, the shore gets
villas" belongs. It is a **seeding** decision, not a property of the ground, and
it must not become one. `PLOT_CLASSES` survives only in that role — a record of
what the generator chose, never a constraint on what a player may later choose.

**Game rules, later and deliberately.** Mark: *"over time we can grow
restrictions about what is needed in an area."* Those are game design — a
zoning mechanic, a services requirement, a progression gate — and they are added
on top, where they can be tuned or turned off. They are never baked into the
board, because a rule baked into the board cannot be changed by a designer or
overruled by a player.

### What this means for the size tables

`public/typology-footprints.js` is **correct and stays.** Every one of its ten
entries was verified against the `cellW`/`cellD` clamps in `buildings.js` —
including `bldTownhouse`, which is a hardcoded `footW = 16`, and `bldTerrace`,
which is `units * 8` with no ceiling. Nothing in it was invented.

What changes is what it is *for*. It is no longer a table to reconcile against
plot classes. It is **the space requirement each building states about itself.**

**Two things it still needs:**

1. **`clear` for every typology, in whole cells.** This does not exist yet and
   is the new work. `prop-manifest.js` already carries exactly this concept for
   small objects — `clear`, "extra free ground required around `foot`" — so
   there is a precedent in the repo to follow rather than a pattern to invent.
   **The values are Mark's and agy's call, not a lane's.** Derive them from what
   each building actually needs to be approached and entered, and propose them;
   do not guess and proceed.
2. **Plots carved on whole cells.** This part of the original Part 1 was right
   and survives unchanged: `module: 8` on every class, all bounds whole
   multiples of `CELL`. Space measured in cells is space that can be checked
   with integers, and that is the entire reason the grid exists.

**The `bld-tower` question is now void.** It only existed because plots were
typed. A 9-cell space is not "a TOWER plot with no tower that fits" — it is nine
cells of space, and anything needing nine or fewer will go there.

---

## PART 2 — GROUND RELATIONSHIP IS DECLARED, NOT ASSUMED

Every placeable thing declares how it meets the ground. Three kinds, and the
board enforces each.

### `LAND` — the default

Every cell of the footprint must be buildable ground.

**The no-floating-edge rule, in Mark's words:**

> if a house or building is placed on a cliff the building will extend a section
> down to just below the points that it touch as in that all sides are
> surrounded by ground

So the foundation base sits at **the lowest ground height sampled anywhere on
the footprint perimeter, minus a bury depth**, and the building extends a skirt
down to meet it. No edge of any building, anywhere in the world, shows daylight
underneath it.

`footprint.js` already returns `slab` / `plinth` / `terrace` / `refuse`, so it
knows the ground varies across a footprint. **What it does not do is guarantee
the result is fully supported.** That guarantee is the new part, and it is
testable:

> Sample ground height at every perimeter cell of every placed building.
> Assert the foundation base is at or below the minimum. **Zero exceptions,
> world-wide.** Watch it red before fixing it — on a world with 2,904 plinth and
> 295 stepped foundations, some of them are almost certainly floating today.

### `SHORE` — piers, jetties, boathouses, slipways

May stand over water. **Must have at least one footprint cell on land**, and that
cell must be contiguous with the rest of the footprint — a pier is attached to
the shore or it is a raft.

### `SPAN` — bridges, causeways, walkways

**Both ends on land**, and each end must connect to circulation of a compatible
kind:

| Bridge carries | Must connect at both ends to |
|---|---|
| vehicles | a road |
| pedestrians | a walkway, path or shared way |
| bicycles | a bike lane, shared way or path |

A bridge that lands on nothing is the defect this rule exists to make
impossible. The plan already reports `unservedBridgeEnds: 0`, so the check
exists for the 19 authored bridges — **it does not exist as a placement rule a
player's bridge would have to satisfy.** That is the gap.

### What exists today

A search of `public/` found **no water placement rule of any kind** — no pier
predicate, no over-water test, no span rule. The only matches for "pier" are
asset names (brick piers, a harbour pier palace). This part is not half-built;
it is absent.

---

## PART 3 — CIRCULATION IS A KIT, NOT A RIBBON

`roadkit.js` defines sidewalks, kerbs, crossings, junctions and
`intersection4Way`. `V0-BOARD-AUDIT.md` §V0.6 records that the roads actually
drawn are **"continuous procedural ribbon meshes"** in `city-render.js`, with
`roadTris: 233,092`.

So the kit is registered and the world is drawn by something else.

A ribbon cannot be edited by a player. It has no pieces, so there is no unit to
remove, replace or reconnect — which is exactly Mark's point about roads that
"won't actually work with the game."

**The rule:** a road is a run of kit pieces, each **N cells long**, joined at
junctions that are themselves pieces. What is drawn and what could be edited are
the same objects.

This is a larger change than the rest of this file and it is **not** in the
current rebalance or the current visual run. It is written here so both lanes
build toward it rather than further from it. **Do not start it without asking.**

---

## PART 4 — WHO OWNS WHAT

| | agy | CLI lane |
|---|---|---|
| Declares footprints in cells, builds models to them | ✅ | |
| Makes `PLOT_CLASSES` conform to the same table | | ✅ |
| Builds the skirt geometry that reaches the ground | ✅ | |
| Asserts no building floats, world-wide | | ✅ |
| Road, sidewalk, kerb, crossing, junction **geometry** | ✅ | |
| Which roads exist, where they run, whether they connect | | ✅ |
| `SHORE` / `SPAN` placement rules | | ✅ |

**Neither lane changes this file alone.** A contract one side can edit is not a
contract. Propose the change, say why, and Mark decides.

---

## THE ORDER, AND WHY IT IS NOT "BLANK THE BOARD FIRST"

Mark asked whether the board should be blank until the models exist. The answer
is that **the contract must come first, not the models** — because the models
already declare their sizes in cells. What was missing was anything on the board
side reading that declaration.

Publishing the contract decouples the lanes: agy builds to it, the plan carves
to it, and the pieces fit when they meet, without either lane waiting for the
other. Blanking the board would stall both for weeks and buy nothing the
contract does not already buy.

**But nothing else should start until Part 1 exists as a committed, exported
constant with a test that both tables agree.** Both lanes are currently guessing
at sizes, and every hour spent guessing is an hour of work that will not fit.
