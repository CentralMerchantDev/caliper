# CAT-1 — the terrain mesh contract

**CLI produces a height field. BLD displaces a mesh off it.** PLAN.md §1: "The
seam is data." This document is that seam — what BLD reads, so a coarse
terrain mesh can be built without reading CLI's generator internals.

Backing implementation: `public/terrain-field.js` (TER-1/TER-2/TER-3,
`docs/specs/RESEARCH.md` §T1–§T3). This document describes the **published
contract** that module exposes — read it here, not the generator's own
comments, if the two ever disagree that is a defect in the generator, not
in this document.

---

## 1. The field is a pure function, not a precomputed mesh

```js
import { createTerrainField } from "./terrain-field.js";

const field = createTerrainField({ seed });
field.heightAt(worldX, worldZ);   // -> metres, y-up, sea level = 0
field.isWater(worldX, worldZ);    // -> boolean, true at or below sea level
field.slopeAt(worldX, worldZ);    // -> dimensionless, rise/run, central-difference
```

**Why a function, not a baked grid.** CLI does not know what resolution BLD's
mesh needs, and baking one commits both lanes to it. `heightAt`/`isWater` are
callable at *any* `(worldX, worldZ)`, at whatever density a caller wants —
the gameplay board sampling once per 4 m cell and a coarse overview mesh
sampling once per 64 m read the identical field, never two.

## 2. Coordinate system and units

- **Horizontal**: world metres, the same frame `public/area-board.js` cells
  and `public/placement.js` anchors already use. `(0, 0)` is the world
  origin; no separate "design space" conversion exists in this system
  (unlike the retired `public/terrain.js`, which had one — see
  `docs/DECISIONS-FOR-MARK.md` #22).
- **Vertical**: metres, **y-up**, **sea level is exactly 0**. Land is
  `height > 0`; water is `height <= 0`. `isWater` is defined as
  `heightAt(x, z) <= 0`, not a second, separately-computed answer — the two
  can never disagree because one is derived from the other.
- **Horizontal module**: `public/board-renderer.js`'s own `MODULE_SIZE_M = 4`
  is the grid's real, live module (matching `data/catalogue.json`'s
  footprints, stored in modules of this size). The terrain field does not
  require callers to sample on this grid, but a gameplay-board population
  (TER-4) does, because that is the grid `area-board.js` addresses.

## 3. Determinism

Same `seed`, same `(worldX, worldZ)` in, same `heightAt`/`isWater`/`slopeAt`
out, always — no hidden global state, no `Date.now()`, no `Math.random()`.
Two calls to `createTerrainField({ seed: "x" })` from two different processes
produce byte-identical output for the same query. This is what lets CLI's
value model, BLD's mesh, and a screenshot taken a year later all agree on
where the ground is.

## 4. The coarse mesh is decoupled from the gameplay grid

PLAN.md §4's own wording. BLD's mesh does **not** need to align to the 4 m
module grid, and does not need to resolve every gameplay cell individually —
a mesh vertex every 32–64 m is enough to carry the coastline, slope and relief
`field.heightAt` produces; the gameplay grid (TER-4) samples the *same*
function far more densely, independently, for placement's own slope/terrain
checks. Neither caller needs to know the other's sample spacing.

## 5. What the field guarantees, and what it does not

**Guarantees:**
- One connected landmass per generated world, not scattered independent
  blobs (RESEARCH.md T1 — the drowned-river-valley method).
- The coastline is decided before elevation is derived from it, not the
  reverse (RESEARCH.md T2 — elevation-first is a named failure mode).
- `slopeAt` is a true numerical derivative of `heightAt` at that point — it
  is never a separately-authored field that could drift from the height it
  describes.

**Does not guarantee:**
- A specific coastline shape, count of islands, or named landmarks — this is
  a procedural field, not an authored map (contrast with the retired
  `public/terrain.js`, which was hand-placed).
- Real-time evaluation cost bounded for arbitrary query patterns.
  `heightAt`/`isWater`/`slopeAt` are cheap per call (no unbounded search) but
  BLD should cache results it will read more than once per frame, the same
  discipline any pure function deserves.

## 6. Versioning

This is a contract, not an implementation detail — a breaking change to
`heightAt`'s output for the same `(seed, worldX, worldZ)` is breaking for
BLD's own committed mesh output and needs a note in this file, not just a
commit message on the CLI side.
