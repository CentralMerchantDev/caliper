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

## PART 0 — THE GRID IS 1 METRE, GROUPED 4 AND 16

**Mark's decision, 2026-09-07.** This supersedes every "whole 8 m cell"
statement later in this document and in `BOARD-CONVERSION-PLAN.md`.

> a cell should be bigger and smaller if that makes sense … for example
> 16 × 16 then subdivided into quadrants that are 4 × 4 with cells that are
> 1 × 1. The cells then are actually 1 × 1 but grouped into larger cells that
> are large enough for say a road and a building — but also that you can build
> across more than one cell, so that the boundary of the larger cell doesn't
> stop a building. It can span both, as long as there is room for it and it
> matches the rules

### The three scales

| Name | Size | What it is for |
|---|---|---|
| **ATOM** | **1 × 1 m** | The real unit. Every footprint, every socket, every address is a whole number of these. |
| **QUADRANT** | 4 × 4 m | A lane, a parking bay, a footway. A convenient grouping. |
| **BLOCK** | 16 × 16 m | A small building, a two-lane street with footways. A convenient grouping. |

**The groupings organise and index. They do not constrain placement.** A
building spans as many blocks as it needs. Nothing refuses because a boundary
was crossed — only because there was not enough room, or the ground was wrong.

### Why this is right, and why 8 m was not

The 8 m cell forced every real-world dimension to be rounded. `ROAD_STANDARDS`
carries genuine widths — a STREET is 18 m, a FREEWAY 62 m — and neither is a
multiple of 8, so `P0.4` snapped them **outward**: an 18 m street reserving 24 m
of ground. Six metres wasted on every street in a world with streets every
hundred metres.

At 1 m, **an 18 m street is 18 atoms.** The standards keep their real values and
simply fit.

**It also closes the three findings P0 had to leave open.** `rampMerge`,
`rampDiverge` and `railSwitch` each carry a connector socket at a genuine
lane-width or track-gauge offset, which could not be forced onto an 8 m boundary
without falsifying `ROAD_STANDARDS` — dimensions that file's own header says
never scale. At 1 m they land exactly. **The finer grid is not a compromise; it
is the fix for a defect the coarser one created.**

### The cost, measured rather than feared

26 km at 1 m is 676 million atoms. That is free, for two reasons already true of
this codebase:

- **`grid.js` stores nothing.** Its own header: *"Nothing here stores a cell.
  Every function below is integer arithmetic on a coordinate, so the whole world
  is addressable at no cost and only the cells something actually occupies are
  ever recorded."*
- **`world-registry.js` answers by rectangle, not by cell.** `overlapsRect(xMin,
  xMax, zMin, zMax, …)` takes metres. Testing whether a 48 × 48 m tower fits is
  one rectangle query, not 2,304 lookups.

### What changes, and what does not

| | |
|---|---|
| `grid.js` `CELL = 8` | Stops being the atom. Becomes a named grouping alongside 4 and 16. The `DIVISION` ladder down to 0.5 m is replaced by the 1 / 4 / 16 hierarchy. |
| `buildings.js`'s 8 m module | **Unchanged.** A house is still 16 × 24 m — now expressed as 16 × 24 atoms rather than 2 × 3 cells. |
| `roadkit.js` `MODULE_M = 8` | Stays as a piece *length* module. Widths return to `ROAD_STANDARDS`' real values. |
| `P0.4`'s `snapCellsOutward` | **Reverted.** It was lossy and the need for it is gone. |
| Footprint sizes | **A standard set of 8 m module multiples, plus named exceptions.** See below. |

### STANDARD SIZES — Mark's decision, and why

> having standard sized building types and then some exceptions to it is the
> best way — means that you can lay out the world and know it's going to work
> out the best, the most stuff is going to fit. If it's all random then you can
> end up with a lot of weird empty spaces … if certain things need to not be
> exactly to real scale, but slightly mis-scaled to fit this, that's fine. It's
> going to be unnoticeable.

**Arbitrary footprints produce slivers.** A block interior of 82 m divides into
neither 16s nor 24s, and whatever is left over is a gap nothing fits. Standard
sizes are what make the board tile.

**TWO NUMBERS, DOING DIFFERENT JOBS.** These are not the same thing and
conflating them is what the old 8 m cell got wrong:

- **The ATOM is 1 m** — the addressing unit. Every position, socket and prop
  sits on a whole metre. This is what lets `rampMerge`'s angled connector land
  exactly, and it is why nothing is ever force-rounded.
- **The MODULE is 8 m** — the standard *increment* for footprints and road
  widths, chosen so everything tiles. A deliberate design decision, not a
  rounding imposed by the grid.

**Standard building footprints:**

| Metres | Modules | What |
|---|---|---|
| 8 × 8 | 1 × 1 | kiosk, garage, corner shop |
| 8 × 16 | 1 × 2 | terrace unit — matches `buildings.js`'s existing 8 m unit |
| 16 × 16 | 2 × 2 | house, small building |
| 16 × 24 | 2 × 3 | townhouse, villa |
| 24 × 32 | 3 × 4 | walk-up, small apartment |
| 32 × 32 | 4 × 4 | mid-rise |
| 48 × 48 | 6 × 6 | tower |
| 64 × 64 | 8 × 8 | large tower |

**Standard road widths** — also module multiples, so block interiors divide
evenly:

| Class | Real ROW | Standard |
|---|---|---|
| ALLEY / LANE | ~10 m | **8 m** |
| STREET | 18 m | **16 m** |
| AVENUE | ~26 m | **24 m** |
| BOULEVARD | ~34 m | **32 m** |
| FREEWAY | 62 m | **64 m** |

Mark: *"nobody's going to fault us for that. That's not the point of any of
this."* Correct — and a 16 m street reading as 16 rather than 18 is invisible,
while a world full of 2 m slivers is not.

**EXCEPTIONS ARE NAMED, NOT ARBITRARY.** Stadium, airport, convention centre,
cathedral, port sheds, rail platforms. Each declares its own footprint
individually, in whole metres. Rare by nature. A handful of named one-offs is
fine; an unbounded set of arbitrary sizes is what this rule exists to prevent.

**A design that wants a size not on the list rounds to the nearest standard.**
5 × 7 modules becomes 6 × 8. That is the slight mis-scaling Mark has explicitly
accepted, and it is what keeps every piece swappable for every other piece of
its size.

**Every "whole cell" in this document and in the board plan now means "whole
atom" — a whole metre.**

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
