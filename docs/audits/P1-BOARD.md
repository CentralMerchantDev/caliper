# P1 — the board is a list of placed pieces

Evidence for `docs/specs/BOARD-CONVERSION-PLAN.md` PHASE P1. Every number
below has the command that produced it beside it.

## TWO mid-phase spec changes, and why the record below reflects both

**Change 1 — the record grew a dimension.** `BOARD-CONVERSION-PLAN.md`'s
P1.1 was rewritten by Mark while this phase was already underway — the
record grew from a 2D `cell: {i, j}` to a 3D `cell: {i, j, k}` with
`levels`/`standsOn`/`surface`, per his own quotes in the file ("the board
is a list of cubes, really"; the rooftop-bench example). The first working
version of `public/board.js` was built and fully verified against the
OLDER, 2D spec before this was noticed — caught by re-reading the plan
file before committing, not by being told.

**Change 2 — the addressing unit itself changed.** `PLACEMENT-CONTRACT.md`
Part 0 (Mark, 2026-09-07, arriving while this phase was STILL underway,
after Change 1's rework was already complete and verified) replaced the
8 m `CELL` grid with a 1 m `ATOM` as the real addressing unit — *"the board
is a list of cubes, really … 16x16 then subdivided into quadrants that are
4x4 with cells that are 1x1."* `grid.js` gained `ATOM`/`QUADRANT`/`BLOCK`
constants and `atomOf`/`atomOrigin`/`atomRect`/`atomCentre`/`atomsFor`
functions, added ALONGSIDE the existing `CELL`-based ones (not replacing
them — `test/grid.test.ts` depends on the 8 m semantics in detail and
still passes, unchanged). `board.js` and `board-adapter.js` were rewritten
a second time to address in atoms; P0.4's `snapCellsOutward` (which had
snapped `roadkit.js` footprints onto the 8 m grid) was reverted entirely
— see `docs/audits/P0-ROADKIT.md`'s own SUPERSEDED section.

Everything below describes the CURRENT (3D, atom-addressed)
implementation; neither earlier version was committed.

## P1.1 — the placed-piece record, and what it's built from

`public/board-adapter.js` converts `generateWorld()`'s current output into
`{ id, pieceType, cell: {i, j, k}, rotation, foot: {w, d}, levels,
clear: {w, d}, standsOn: [...], surface }` for the three categories the
generator actually returns: **plots**, **roads**, **bridges** — all
adapted honestly as `k: 0, levels: 1` (ground level, one storey), because
none of them carry real elevation/stacking data today.

**`standsOn` uses `land-use.js`'s own vocabulary**
(water/beach/cliff/steep/reserved/buildable), matched against its existing
rules rather than invented: plots get `["buildable"]` (`land-use.js`'s own
`buildAllowedAt` allows only `USE.BUILDABLE`); roads get
`["buildable","steep","reserved"]` (`roadAllowedAt` allows everything
except water/beach/cliff); bridges get `["water","buildable","beach"]`, a
documented judgment call — `PLACEMENT-CONTRACT.md` Part 2 states plainly
that no water-placement rule exists yet ("this part is not half-built; it
is absent"), and a bridge's one declared span crosses both open water and
its own land abutments, so one `standsOn` list has to cover both. **Not**
the same vocabulary as `roadkit.js`'s own `standsOn` convention
(open/water/rock/track/plot) — reconciling the two is named as P2's job,
not assumed done here.

**Trees and props are not adapted, on purpose.** A direct read of
`generateWorld()`'s return value (not the plan's prose) found neither
exists there today: trees are bare `[x, z, scale, variant]` tuples built
inside `city-render.js`'s render loop and discarded after one frame, with
no id and nothing persisted; props/street furniture are the same shape.
`prop-manifest.js` is a catalogue of prop *types*, not placed instances.
Building instance data here would be new generation, not adaptation —
explicitly P3.2's job ("Trees, street furniture and props become placed
pieces rather than loop output"). Named, not silently skipped.

**Bridges are merged, not duplicated.** Every physical bridge exists twice
in `generateWorld()`'s own output — once in the declarative `bridges[]`
array, once as a `roads[]` entry (`r.bridge` set) that actually joins the
network. Adapting both would reserve the same ground twice for one object.
Bridge pieces are taken from `bridges[]`; the matching `roads[]` entries are
excluded from the road category.

**Gate — every field present and integral, ids globally unique:**
Command: `node scripts/_board-adapter-probe.mjs` (also exercised via
`node test/run.mjs`, `test/boardAdapter.test.ts`).
- 16,935 pieces built from the current default-seed world (16,209 plots,
  707 non-bridge road spans, 19 bridges).
- `fieldViolationCount: 0` — every piece has a non-empty string
  id/pieceType, integral `cell.i`/`cell.j`/`cell.k`, rotation in
  {0,90,180,270}, integral positive `foot.w`/`foot.d`, integral `levels`
  >= 1, integral non-negative `clear.w`/`clear.d`, a non-empty `standsOn`
  array, a non-empty `surface` string.
- `duplicateIdCount: 0` — every id is globally unique across all three categories.

**Gate — cell values round-trip through `atomOf`/`atomOrigin` unchanged (the
1 m ATOM, `PLACEMENT-CONTRACT.md` Part 0 — not the 8 m CELL this was first
measured against), LED WITH THE NUMBER THAT CROSSES A LIMIT:**

> **16,009 of 16,209 plots (98.8%) do NOT round-trip, even at 1 m.**

Cheaper than the old 8 m CELL measurement (16,204/16,209 — i.e. almost
none round-tripped), confirming Mark's own prediction that the fix "gets
much cheaper" at the atom grid — but still real, not the "already whole"
claim `PLACEMENT-CONTRACT.md` makes. `PLACEMENT-CONTRACT.md` Part 1:
*"Plots carved on whole cells... This part of the original Part 1 was
right and survives unchanged."* Example: plot `block--1349-760-p0` has
`xMin: -1343.8, zMin: 768.9` — under the new atom check this misses by
0.2 m and 0.1 m respectively (not the multi-metre miss the old 8 m check
implied), which is exactly Mark's own point: *"the origin fix is now a
sub-half-metre correction, not a world rebuild."* This is the exact class
of gap the plan's own first rule exists to catch (P0's example was
`verifySocketMating`'s header vs. its body; this is the P1 one, in
`city-plan.js`'s plot-carving math vs. `PLACEMENT-CONTRACT.md`'s claim about
it). **Not fixed here** — P1 is representation only ("nothing renders
differently yet"); fixing `subdivideBlock`'s carving math is a `city-plan.js`
change with its own blast radius, out of this phase's scope. Reported
plainly for review, not silently passed or silently worked around.

Road span along-axis anchors are a plain measurement, not a gate (roads
carry no whole-cell claim to begin with): 334/707 are atom-aligned (up
from 49/707 at the old 8 m granularity).

**Gate — P1.5, determinism:** two independent builds of the default seed,
each in its own isolated child process (see "why two processes" below),
produce byte-identical piece lists — same count (16,935), same ids in the
same order, same SHA-256 digest of the full serialized list.

## P1.2 — occupancy index, built on world-registry.js

`public/board.js`'s `createBoard()` wraps `world-registry.js`'s existing
bucketed reservation store — no second spatial index. `whereIs(id)` is an
O(1) `Map` lookup; `inCells(i, j, w, d, k)` translates a cell rectangle
(and vertical level) to metres via `grid.js`'s `atomRect`/`heightOf` and
calls the registry's own `allOverlapping`.

**Gate:** `test/board.test.ts` — place a piece, find it by cell query and by
id; query a cell it does not occupy, get nothing; remove it, both queries
return nothing. Command: `node test/run.mjs`.

## P1.3 — canPlace: SPACE and GROUND, watched red before trusting green

Per the current spec: exactly two conditions. **SPACE** — a free box of
`foot + clear` cells, `levels` tall. **GROUND** — every foot cell's kind is
in the piece's `standsOn` list, where "kind" is `land-use.js`'s
`classifyAt` at k=0, or the `surface` of whatever piece occupies the cell
directly below at k>0 (Mark's stacking rule — a rooftop bench stands on the
roof below it, not the ground under the building).

**Two real bugs, watched red, not narrated as smooth:**

1. The FIRST version's terrain checks (built against the plan's original,
   simpler 2D spec, before the rewrite) failed both the water and the
   buried-in-rock test cases the first time they ran
   (`actual: true !== expected: false` on both). `world-registry.js`'s
   `WATER`/`ROCK` constants answer "is this **volume** entirely
   submerged/buried" — a piece standing on underwater ground and reaching
   into open air is never "entirely submerged" by that definition, and an
   unbounded `yMax` (the first draft used `1e9`) can never be "entirely
   below" any real surface either. This whole approach was superseded by
   the current `standsOn`/`classifyAt` design once the spec changed, which
   answers the right question directly instead of reusing a volumetric
   check built for something else.
2. After the rewrite to the 3D/stacking design, the new **stacking test
   itself failed**: a rooftop piece placed correctly above a 2-level
   building, on flat ground at **y=10** (not y=0), was refused as
   `{"ok":false,"reason":"ground","blockedBy":{"kind":null}}` — read as
   floating in mid-air with nothing beneath it, when a building was right
   there. Diagnosis: `k`'s vertical extent was computed from **absolute
   sea level** (`yMin: heightOf(k)`), not from the piece's own local ground
   height. On flat ground at y=0 this is invisible; at any other elevation,
   a piece's own k=0..levels sits at the WRONG absolute height, and a
   stacking query below it samples a y-coordinate that misses the piece
   entirely — or, on a hill, reads as buried inside the terrain. Fixed by
   threading a real `groundY` (sampled via `heightAt` at the piece's own
   cell) through every vertical-extent calculation. Watched green after,
   same test, same assertions, unedited — plus the pre-existing water/rock/
   off-map/clear/overlap cases, all still passing.

**Gate:** overlapping placement refused (`occupied`); adjacent, edge-touching
placement accepted; a piece that cannot stand on water is refused over open
water (`ground`, `blockedBy.kind: "water"`), a piece that CAN (a
pier/bridge, `standsOn: ["water"]`) is accepted there; a piece on a real
slope (not just a high but flat elevation — CLIFF is a slope property, not
an elevation one) is refused (`ground`, `blockedBy.kind: "cliff"`);
off-map refused (`off-map`); `clear` genuinely adds required margin beyond
the foot; a rooftop piece stacks correctly on the surface of the piece
below it, and refuses if nothing is there or the kind doesn't match.
Command: `node test/run.mjs`.

**One documented interpretation choice**: `PLACEMENT-CONTRACT.md` fixes the
*total* size required per axis (`foot + clear`) but not how the margin is
distributed. `board.js` splits it as evenly as possible around the foot
(floor west/south, ceil east/north). Flagged in the file's own header, not
assumed silently — a call Mark can overrule.

## P1.4 — place/remove/replace/move, each reversible

**The gate Mark named as the one he would not accept on a description.**
`test/board.test.ts`:
- place → remove → `board.list()` is byte-identical (`JSON.stringify`
  equality) to before either happened.
- place → replace (different footprint) → remove → byte-identical to before.
- move relocates a piece (old cell empties, new cell holds it); a move onto
  an occupied cell is refused **and leaves the board byte-identical to
  before the attempt** — not partially applied.
- replace refuses (and does not apply) a new shape that would not fit,
  leaving both the target piece and everything else byte-identical.

Command: `node test/run.mjs`.

## P1.5 — determinism, and why it required two separate processes

**Gate:** two builds of the same seed produce the same piece list, same
order, same ids. Command: `node test/run.mjs` /
`node scripts/_board-adapter-probe.mjs` (run twice).

**A real infrastructure problem, found and fixed along the way, not
narrated as smooth.** Building the world even *once* at module scope inside
`test/run.mjs`'s one shared process (~110 other bundled test files' own
world-builds already resident by the time this file's tests run) reliably
crashed the entire suite with a V8 out-of-memory error
(`Committing semi space failed`) — watched **three times**, with different
exit codes (134, 127, 127), across three different mitigation attempts
(shared build reused across tests; second build isolated to a child
process alone; first build still at module scope). The actual fix: **every**
`generateWorld()` call for this phase's tests now happens in
`scripts/_board-adapter-probe.mjs`, a separate `node` child process spawned
via `execFileSync`, which builds the world, runs every P1.1 check itself,
and returns a small JSON summary (piece count, violation counts, a SHA-256
digest, and the id list) over stdout — never the full world, never the full
piece list twice. Measured directly: two sequential `generateWorld()` calls
in an isolated process are fine (no crash); the problem was one process
holding a 26 km world's state for the remainder of a 110-file run, not the
generation itself.

## Full suite

`node test/run.mjs` and `npx tsc --noEmit` — command and result recorded in
the RECORD table below.
