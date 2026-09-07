# P2 — roads become pieces, and the layout changes

Evidence for `docs/specs/BOARD-CONVERSION-PLAN.md` PHASE P2. Every number
below has the command that produced it beside it.

**SCOPE, LED WITH RATHER THAN BURIED: this phase is NOT fully complete.**
`public/road-network.js` builds and fully verifies the **arterial layer**
— settlement/landmass centres connected to each other and to the
regional network, real junction pieces, connectivity guaranteed by
construction and independently measured. **Collectors and locals are not
converted** — the existing ~1,357 `{axis, at, from, to}` spans stay
exactly as they were. That means P2.4's full gate (one connected
component for the WHOLE network) and P2.5 (retire the span representation
everywhere) are **not met**, and are named as open below, not silently
counted as done because P2.1–P2.3's arterial-level work is real and
verified.

## P2.1 — the hierarchy, with sources

`docs/specs/ROAD-HIERARCHY.md`. Committed separately, `7cd7de6`, before
any P2 code.

## P2.2 — arterials as socket-verified piece chains

`public/road-network.js`'s `buildArterialNetwork()`. Widths from
`PLACEMENT-CONTRACT.md` Part 0's standard table (`STANDARD_WIDTH`), not
`ROAD_STANDARDS`' real values — a deliberate, documented departure from
reusing `roadkit.js`'s own `straight()`/`intersection4Way()` (see the
file's own header: those are locked to real ROW widths, which is correct
for THEM, and wrong for what Part 0 asks P2 to lay out with). New,
minimal standard-width pieces instead, verified through the SAME shared
`transformSocket`/`verifySocketMating` P0 built — not a second verifier.

**A real bug, watched red, not narrated as smooth.** The first version
chained each arterial edge centre-to-centre between two settlement
centres. Every junction verification failed with a position mismatch of
exactly the junction's own footprint radius (25.6 m for `BOULEVARD`) —
the straight run ran straight through where the junction's own socket
actually sits. Fixed by precomputing each node's junction radius BEFORE
building any edge (a node's degree, and therefore whether it needs a
junction at all, has to be known first — computing the radius after would
mean rebuilding edges already built), then trimming every edge's own
endpoint back to that radius. Watched green after, same assertions,
unedited.

**Gate:** command `node -e "...buildArterialNetwork()..."` (also
`test/roadNetwork.test.ts`) → **2,034 joins checked, 0 failures**, across
9 settlement-bearing landmasses plus `downtown` and `barrier` (neither
carries a `SETTLEMENTS` entry — confirmed directly, not assumed; centres
for both derived from their own landmass geometry, `ISLAND` bounds for
downtown, the traced crescent polygon's own perimeter for barrier — see
the file's own comment on why a polygon's perimeter, not its bounding
box, is used for a thin curved island).

## P2.3 — junctions, arterial level

Every node where 2+ arterial legs meet gets a real junction piece
(`standardJunction`), sized once (`standardJunctionRadius`, independent of
leg count) and verified against every one of its own legs' end sockets.

**Gate:** `node test/run.mjs` → **72 junctions, 72 fully verified against
every leg, 0 failures.**

**Not done: collector/local junctions**, and the fuller
`intersection4Way`/`intersection3Way`/`roundaboutModern`/`slipLane`/
`rampMerge`/`rampDiverge` piece SELECTION `docs/specs/ROAD-HIERARCHY.md`'s
own table describes — `road-network.js`'s `standardJunction()` builds one
uniform box-with-N-sockets shape for any degree, and records which KIND
the table would call it (`junctionKind()`) without building that specific
piece. Named, not hidden: closing this means either extending
`standardJunction()` per kind, or reconciling the standard-width and
real-ROW-width piece families so the real kit's own junction pieces can
be used directly — real, unresolved work.

## P2.4 — connectivity

**LED WITH THE NUMBER THAT CROSSES A LIMIT, TWICE — because this gate has
two different scopes and only one of them is met.**

**Today's FULL existing network, reconfirmed unchanged:**
Command: `node scripts/measure-roads.mjs` →
**52 connected components, 38 stranded roads, of 1,357 total** — the
exact figures Step 4 measured and this plan's own P2.4 text quotes. Not
improved by this phase, because collectors/locals (the vast majority of
those 1,357 roads) are untouched.

**The NEW arterial layer alone: the gate IS met.**
Command: `node test/run.mjs` (`test/roadNetwork.test.ts`) →
- Every landmass with 2+ centres: **exactly 1 connected component**,
  measured by union-find over the actual edge list, not assumed from "it's
  a spanning tree so of course it's connected."
- **Zero stranded arterial nodes** — every centre has at least one leg.

This is true by construction (`road-network.js` builds a minimum spanning
tree per landmass, which is connected by definition) — verified anyway,
because per this project's own rule, a gate is a measurement, not a
claim resting on the algorithm's own theory.

**What this does NOT prove:** that the WHOLE road network (arterials +
untouched collectors/locals) is one component per landmass. It is not —
the baseline number above is unchanged. Closing the full gate requires
converting collectors/locals, which this pass did not attempt.

## P2.5 — retire the span representation

**Not done. Blocked on collector/local conversion**, named rather than
silently skipped. `grep -rn "axis.*at.*from.*to" public/` still returns
~1,357 live uses across `city-plan.js`'s existing generators. Nothing was
quarantined or removed; the old representation is exactly as it was
before this phase, alongside the new arterial layer (which never used the
span shape at all — `road-network.js`'s pieces are `{id, footprint,
sockets, lod}` model objects, the same shape `roadkit.js`'s own pieces
use, from the start).

## P2.6 — rendering

**Partial.** `roadkit.js`/`road-network.js`'s pieces are not yet imported
by `city-render.js` — the existing ribbon-based road rendering for the
FULL network is unchanged. What exists instead: a dedicated top-down map
render of the ARTERIAL layer specifically —
`public/arterial-network-map.html` /
`scripts/shoot-arterial-network.mjs` — giving Mark something concrete to
judge the new layer's TOPOLOGY against (does the arterial spine between
real places look like something you could actually drive), separate from
the full renderer integration.

Command: `node scripts/_render-arterial-data.mjs && node scripts/shoot-arterial-network.mjs`
→ 0 page errors, `.shots/arterial-network-map.png`. Viewed directly: the
barrier crescent, mainland, downtown and every small island each read as
ONE connected arterial spine (matching P2.4's arterial-layer result
visually, not just numerically) — red segments mark the 30 grade-limit
findings below, concentrated on the barrier crescent and mainland's
hillier ground.

**A real, named limitation of this render and of `road-network.js`
itself: regional ties are drawn/routed as straight lines with no
awareness of water.** A small island's tie to the nearest highway point
can cross open water in a straight line — physically, that would need to
be a bridge, and nothing here checks or builds one. Visible in the render
as long thin lines leaving an island's own outline. Not fixed — named.

## Grade findings — LED WITH THE NUMBER

**30 of 80 arterial edges (37.5%) exceed `ROAD_GRADE.BOULEVARD.maxGrade`
(6%),** some by a large margin (barrier crescent edge 12→13: **100.7%**
average grade — effectively a cliff). Expected and scoped explicitly in
`docs/specs/ROAD-HIERARCHY.md` before any code: straight-line connections
between centres do not attempt terrain-following routing (switchbacks,
detours). Measured against the real limit, reported per-edge, not
silently accepted or silently rerouted. Command: `node -e
"...buildArterialNetwork({heightAt})..."`.

## Full suite

`node test/run.mjs` and `npx tsc --noEmit` — command and result recorded
in the RECORD table below.

## What is genuinely open for the next pass, named plainly

1. **Collector/local conversion** — the largest remaining piece of work;
   without it, P2.4's full gate and P2.5 cannot close.
2. **Real junction PIECE SELECTION** (not just labelling) per
   `docs/specs/ROAD-HIERARCHY.md`'s table.
3. **Reconciling standard-width pieces with the real kit's ROW widths** —
   two piece families exist now (`road-network.js`'s standard-width
   arterials, `roadkit.js`'s real-ROW-width kit), and nothing yet joins
   them.
4. **Terrain-aware arterial routing** for the 30 over-grade edges.
5. **Water-aware regional ties** (the bridge gap named above).
6. **`city-render.js` importing the kit** for the FULL network, not just
   the arterial layer's own dedicated map.
