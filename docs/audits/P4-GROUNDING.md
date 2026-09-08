# P4 grounding — what exists, what doesn't, and the read/write split

Evidence for the P4 instruction. Written before any P4 feature code, per
Mark's own "ground first, report before building."

## Finding 1: board.js is not wired to the renderer — the same gap P3.5 found in prop-placement.js, one level up

`public/board.js` is a complete, correct, well-tested data model:
`place`/`remove`/`replace`/`move`/`whereIs`/`inCells`/`canPlace`, every
mutation byte-identical reversible (`test/board.test.ts`), refusals carry
a real `{ok:false, reason, blockedBy}`. `move()` is literally `replace()`
with a new cell — not a separate implementation of the same fit check.
`world-registry.js` carries a piece `id` on every reservation, so any hit
(`whatIsAt`, `overlapsReserved`) already resolves back to an owning piece.

**Nothing renders from it.** `city-render.js` and `world-render-3d.js`
import neither `board.js` nor `board-adapter.js` — zero references,
confirmed by direct grep across both files. The renderer builds directly
from `world.plots`/`planCity()` output. `board-adapter.js`'s own header
states plainly that trees and props "are thrown away after one frame, with
no id and nothing persisted" — they are never adapted into board pieces at
all, only plots/buildings/roads/bridges are.

This is P3.5.2 item 4's finding again, one level up. There, a real,
tested occupancy checker (`prop-placement.js`) existed and was never
wired into the renderer's own placement loops — refusing to force it in
on a stale premise was the right call (P3.5's own writeup). Here, a real,
tested PIECE MODEL exists and is never wired into the renderer's own
DRAW path. Same shape of gap, one architectural layer up: last time it was
"a check nobody calls"; this time it is "a data model nothing renders
from." Closing it — building a real board→scene render/sync path — is a
separate, larger job than P4's five features, not attempted here.

## Finding 2: "footprint class" (P4.5) does not exist as a concept

Searched the whole codebase for "footprint class" and "same footprint":
zero hits outside this instruction. The nearest existing thing,
`typology-footprints.js`'s per-typology size table, is buildings-only, in
8 m cells (not board.js's 1 m atoms), and keyed by typology name, not
grouped into interchangeable classes. `PLOT_CLASSES` is the wrong tool
too — `typology-footprints.js`'s own header (2026-09-06, Mark's own
correction) states a plot is not a slot for a kind of building and
`PLOT_CLASSES` is no longer a placement constraint at all.

Per Mark's own instruction: not invented under time pressure. **P4.5 is
cut**, not attempted, not stubbed. See "What's deferred" below.

## The decision: read from board, write through layers

Not "build a new render-sync architecture" and not "ignore board.js
entirely." Split by direction, per Mark's explicit instruction:

**READ from board.js.** `board-adapter.js` names building pieces
`bld-${plotId}` (`buildingPieces()`, `public/board-adapter.js:145`), a
pure, deterministic function of a plotId. The renderer's existing
raycast→plot-address path (`world-render-3d.js`'s `_inspectClick`,
resolving through `spatial-index.js`) already reaches a plotId; deriving
the board piece id from it is a lookup, not a new render path.
`board.js`'s own `whereIs`/`inCells` then answer with the real, correct
record — id, pieceType, cell (grid address), foot/clear, standsOn,
surface — not a renderer-local approximation of the same facts.

**WRITE through `world-model.js`'s layer stack.** Already wired
(`apply-layers.js` applies it before instancing), already has
`replace`/`retint`/`move`/`remove` ops, already has reload-surviving undo,
already tested. Critically: it is the SAME path a natural-language change
request takes through the D2 pipeline. One mutation pipeline, one
verification path, one undo — not a second, parallel mutation mechanism
against a model the renderer does not read. A drag-to-move and a typed
change request produce IDENTICAL downstream effects, which is a real
property worth having and a materially better demo than two disconnected
edit systems.

**Named plainly:** board.js is not yet the render source of truth, and
this pass does not make it one. P4.1 (Pick) reads the real board record
for DISPLAY. P4.4 (Move) writes through the layer stack, which is
buildings-only, addressed by plotId — not a general board-piece mutation.
Closing that gap (making board.js itself drive rendering, so ANY piece —
road, prop, bridge — can be moved through one real pipeline) is future
work, scoped larger than this pass.

## What's in this pass, in order, stopping when time runs out

1. **P4.1 Pick** — click a building, resolve to its board record via the
   existing raycast→plotId path plus `bld-${plotId}`/`board.whereIs`,
   display id/kind/grid-address/piece.
2. **P4.2 Highlight** — reuse `instance-groups.js`'s existing
   instanced/overridden split (the same mechanism `world.layers`
   overrides already use) so the selected piece draws as its own Mesh,
   not a material swap on the shared batch.
3. **P4.3 Isolate** — hide all but the selection and its neighbours,
   restore exactly, asserted against the real running world, not a
   fixture.
4. **P4.4 Move** — emit a `world-model.js` move op; `board.js`'s
   `canPlace` refusal (`{ok:false, reason, blockedBy}`) surfaces to the
   UI, not a log line. Wiring an existing refusal to a cursor, not writing
   a new one.

## What's deferred, and why

- **P4.5 Replace** — cut. "Footprint class" is undefined; defining one
  under a hard deadline is exactly how an invented number gets into this
  project. Needs its own pass: what counts as "the same footprint class,"
  sourced from real data (probably `typology-footprints.js`'s size ranges,
  generalised past buildings-only and past 8 m cells), not guessed.
- **board.js as the actual render source of truth** — the deeper fix
  Finding 1 names. Out of scope for a five-feature pass; a real project of
  its own.
- **Non-building pieces in P4.1/P4.4** — roads, props, bridges are not
  adapted into board pieces at all today (`board-adapter.js`'s own
  documented gap). Pick/Move in this pass covers buildings only, the same
  scope the write side (`world-model.js`) already has.

*(GREEN section — measured results, red-first test evidence, and the
P4-exit blind audit — appended below as each feature lands.)*
