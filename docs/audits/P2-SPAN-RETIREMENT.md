# P2.5 — retiring the span representation: scoped, not attempted this pass

Evidence for `docs/specs/BOARD-CONVERSION-PLAN.md` P2 finish, item 4.

**Gate:** `{axis, at, from, to}` stops existing; `grep` returns zero uses
outside quarantine. **[!] BLOCKED — not attempted this pass, scope measured
first rather than guessed at.**

## Why this is named blocked rather than partially done

P2.2/P2.3's piece layers (`docs/audits/P2-ARTERIAL.md`,
`docs/audits/P2-COLLECTOR-LOCAL.md`) are ADDITIVE — new piece-shaped
networks built ALONGSIDE the existing `{axis,at,from,to}` array, not a
replacement for it. `world.roads` itself is exactly what it was before
this whole plan started. So "P2.3 is done, therefore P2.5 is unblocked"
(the reasoning `docs/specs/BOARD-CONVERSION-PLAN.md`'s original P2.5 text
assumed) does not actually hold — converting a SUBSET of roads to a second,
parallel representation is not the same as retiring the first one
everywhere it is read.

## The real scope, measured

A dedicated research pass (read-only, no changes made) enumerated every
producer and consumer of the shape:

**Producers — 11 distinct functions/declarations inside `city-plan.js`:**
`generateRoads()`, the `FREEWAYS` module-level array, `generateRamps()`,
the `HIGHWAYS` module-level array, `generateSettlement()`,
`clipRoadToLand()`, `generateBridgeApproaches()`, `barrierSpine()`,
`coastRoad()`, `connectStranded()`, and `generateWorld()`'s own final
assembly (7 separate pushes/spreads of the above into one array).

**Consumers — roughly 30 additional call sites across ~9 files outside
`city-plan.js`:**

| File | What it does with the shape |
|---|---|
| `public/city-render.js` | The heaviest consumer by far — ~9 separate loops (carriageway/footway/marking geometry, embankment "batter", street trees, lamps, street furniture, traffic, pedestrians), each independently re-deriving the same `ew ? … : …` axis idiom rather than sharing one helper. |
| `public/board-adapter.js` | `roadPieces(world)`/`bridgePieces(world)` — the EDITABLE board/mutation layer depends on this shape structurally, not just for rendering. |
| `public/grade.js` | `gradeRun(heightAt, run, …)` takes a road object directly and reads all four fields. |
| `public/features.js` | The `"corridor"` feature-site case reuses the identical field convention (independent data, same shape). |
| ~11 test files | `cityWorld.test.ts`, `cityRenderWorldState.test.ts`, `cityJoin.test.ts`, `cityConnectivity.test.ts`, `connectivityBridges.test.ts`, `plotRoadOverlap.test.ts`, `planSeed.test.ts`, `world.test.ts`, `worldOccupancy.test.ts`, `features.test.ts`, `collectorLocalNetwork.test.ts`. |
| 4 scripts | `measure-roads.mjs`, `gen-city-summary.mjs` (count only), `plan-map.mjs`, `_board-adapter-probe.mjs`. |

**What does NOT depend on it, confirmed rather than assumed:** plot and
block placement, land-use classification, and everything downstream of
plot placement (`world-registry.js`'s reservations, `board-adapter.js`'s
own plot pieces) — all of that consumes `xMin/xMax/zMin/zMax` rectangles
`city-plan.js` itself already derives from the road shape before handing
them onward. Retiring the span shape would NOT ripple into plot/building
generation, only into the road-topology consumers named above.

## Why this is a large, cross-file migration, not a contained one

- The `ew ? … : …` axis-branch idiom is duplicated at nearly every one of
  `city-render.js`'s ~9 call sites rather than centralised — a shape change
  means touching all nine, in a 4,000-line file that is `sandbox-spike-agy`'s
  active work (see `docs/audits/P2-RENDER-HANDOFF.md` — the SAME file P2.6
  is also blocked on, for the same worktree-boundary reason).
- Two producers (`HIGHWAYS`, and functionally `FREEWAYS`/`BRIDGES`) are
  `deepFreeze`d module-level singletons, spread BY REFERENCE across every
  world/seed (`city-plan.js`'s own comment at the freeze site documents
  fixing a cross-world-aliasing bug this exact pattern caused once already).
  Any migration has to preserve "safe to share by reference" or reintroduce
  that bug.
- Several producers derive road `id`s FROM the shape's own coordinates
  (`connectStranded`'s `link-${n}-${at}-${f}-${t}`, `clipRoadToLand`'s
  `${road.id}#${i}`, bridge-approach ids) — the shape is entangled with
  identity and determinism, not just geometry. Tests with a
  `[id, axis, class, at, from, to]` row-dump pattern
  (`worldSeed.test.ts`-style, `planSeed.test.ts`, `world.test.ts`,
  `cityRenderWorldState.test.ts`) would need updating for any restructuring.
- `generateWorld()`'s own pipeline — clip, join bridge approaches, repair
  connectivity — runs as an ORDERED sequence over the same array, each
  stage reading and re-emitting the shape. A migration has to be threaded
  through that whole pipeline consistently, not swapped at one boundary.

## What this pass did instead, honestly bounded

Converted the roads that could be converted additively and safely
(arterial MST layer, 74.6% of the network by road count for collector/
local) into real, socket-verified pieces — see `docs/audits/P2-ARTERIAL.md`
and `docs/audits/P2-COLLECTOR-LOCAL.md`. That is real progress toward
eventually retiring the span shape, but it is not the same claim as P2.5's
own gate, and is not presented as such.

## What full retirement would require, for the next pass

1. Centralise `city-render.js`'s repeated axis idiom into one helper before
   (or as part of) migrating it, so nine independent call sites do not each
   need their own bespoke conversion — coordinate with `sandbox-spike-agy`,
   the same boundary `docs/audits/P2-RENDER-HANDOFF.md` already names.
2. Decide the id-derivation question explicitly (keep coordinate-derived
   ids, or move to a different stable identity) before touching any
   producer, since it is entangled with several tests' own assertions.
3. Migrate `board-adapter.js`'s `roadPieces`/`bridgePieces` to read the new
   piece shape directly, since the editable/mutation layer is a structural
   dependent, not a cosmetic one.
4. Convert the regional network (`FREEWAY`/`RAMP`/`BOULEVARD`, 345 roads,
   untouched by any pass so far) — the piece layers built this pass
   deliberately left it alone as hand-authored, unchanged infrastructure.
5. Only once every consumer reads the new shape does retiring the producers
   in `city-plan.js` become safe — attempting it in the other order breaks
   every consumer at once.

Not attempted here because it crosses the render-path lane boundary
(item 1 above) and is a multi-file, multi-session migration by the measured
scope above — consistent with `docs/BUILD-LOOP.md`'s own provision for a
step that cannot be done this pass: named, with the measured reason, not
silently skipped.
