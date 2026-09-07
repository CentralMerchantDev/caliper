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

## P2 finish, item 1 — terrain-following routing (this update)

Mark's explicit instruction after accepting the arterial layer: route
arterials along the terrain rather than only report the violation, using
`grade.js`'s existing per-class design gradients as the limit. Gate:
zero edges over their class limit, or each remaining exception named
with the terrain reason.

**What was built.** `routeTerrainFollowing()` in `road-network.js`:
recursively displaces a segment's own midpoint sideways (perpendicular
to its direct line), tries lateral offsets at ±15/30/45% of the segment
length each side, keeps whichever most reduces the worst sampled grade
across the two resulting halves, recurses on each half up to depth 5.
Named honestly in its own doc comment as a bounded heuristic, not a real
shortest-feasible-path search (no A* over the height field) — a real
router is listed under "what is genuinely open," below.

**A real bug, watched red before being called fixed.** The first working
version of the router correctly bent routes and correctly lowered grade
findings — but broke socket verification the moment it was measured
against real terrain: **70 of 2,287 joins failed** with "bearing not
opposed." Root cause, not papered over: `standardStraight()` pieces are
literal boxes — their two end faces are always parallel. Two straight
pieces meeting at a bend can never satisfy `verifySocketMating`'s
bearing-opposition check by direct abutment, regardless of how the trim
math is done; a claim in an earlier pass of this same work that bent
joins "verify identically to same-bearing joins" was wrong, and this
measurement is what caught it. Fixed by placing a real 2-leg
`standardJunction()` bend piece at every interior waypoint the router
introduces, trimmed back by its own radius on each side — the exact same
pattern P2.2's own settlement-centre junctions already use
(`standardJunctionRadius`), applied one level further in, not a new
mechanism.

**A second, earlier bug, re-fixed here:** trimming a graph edge's own
endpoint along the DIRECT node-to-node bearing (P2.2's original fix)
stops matching where the junction's real socket sits once the router has
bent the first or last leg away from that direct line. Fixed by routing
first on the true, untrimmed node-to-node endpoints, then trimming the
resulting waypoint path's own first/last leg along ITS OWN actual
direction (`trimRouteForJunctions`) — route, then trim, not the other
order.

**Gate, measured, same command as the original grade finding
(`node -e "...buildArterialNetwork({heightAt})..."`, `heightAt` from
`terrain.js`'s `makeHeightAt(new LandField(16))`):**

| | before (straight line) | after (terrain-following) |
|---|---|---|
| edges over `BOULEVARD` 6% limit | 30 of 80 | **21 of 80** |
| worst edge | barrier 43→42, 113.5% | barrier 14→15, 48.9% |
| 2nd worst | barrier 12→13, 100.7% | barrier 43→42, 42.9% |
| joins verified (real terrain) | not previously measured this way | **0 of 2,294 fail** |
| junctions ok (real terrain) | not previously measured this way | **72/72** |

**Gate NOT fully met — 21 edges remain over limit, named as exceptions,
not hidden:** every one is on the barrier crescent, `kingsley-isle`, or
mainland's steepest ground (full list: `barrier 14→15`, `barrier 43→42`,
`barrier 12→13`, `barrier 45→44`, `kingsley-isle 0→2`, `barrier 46→45`,
`mainland 13→12`, `mainland 6→8`, `barrier 42→41`, `mainland 8→10`,
`mainland 7→6`, `mainland 9→23`, `barrier 11→12`, `mainland 5→4`,
`mainland 14→15`, `mainland 12→14`, `mainland 15→16`, `mainland 5→7`,
`mainland 8→9`, `barrier 44→43`, `mainland 22→21`). Terrain reason,
honestly bounded rather than individually re-derived per edge: the
router is a depth-5 heuristic over lateral offsets, not a true
shortest-feasible-path search, and the barrier landmass in particular is
a thin crescent with little lateral room for a longer detour to actually
find — the same geometry that produced the single worst finding in the
original measurement. A real fix needs true pathfinding over the height
field; not attempted here, listed below under what remains open.

**Tests.** `test/roadNetwork.test.ts` gained two cases exercising the
real-`heightAt` code path for the first time (the existing P2.2/P2.3/P2.4
cases all call `buildArterialNetwork({})`, which never reaches
`routeTerrainFollowing` at all): "real heightAt routing produces zero
unmated joins (the bend-junction fix)," and "terrain-following routing
reduces (does not merely report) over-grade edges" (asserted against the
30-edge baseline, so a future change that silently stops routing fails
loudly). `npx tsc --noEmit` clean.

**A third instance of the shared-worktree risk CLAUDE.md already names,
this time with a confirmed cause.** Mid-session, `public/road-network.js`
was found reverted to its exact last-committed state — `git diff --stat`
empty against HEAD — losing an uncommitted version of this same fix, for
the second time in this project's history. `git status` at the same time
showed `public/model-retrieval.js`, `src/index.ts`,
`src/modelRetrieval.ts`, and two retrieval test files modified,
uncommitted, in this exact checkout: agy's retrieval work
(`docs/specs/RETRIEVAL-PLAN.md`), actively in progress in the same
working tree at the same time, with no intervening commit that touched
`road-network.js`. Not a mystery — a second agent in one working tree,
exactly the class of risk the standing rule names. The fix was redone
and committed (`11640b8`) staging ONLY `public/road-network.js` and
`test/roadNetwork.test.ts` by explicit path — not `git add -A` — so as
not to sweep up or disturb agy's own uncommitted work.

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
4. **Terrain-aware arterial routing** — done for MST edges as a bounded
   heuristic (see "P2 finish, item 1" above), cutting over-grade edges
   from 30 to 21; a true shortest-feasible-path search (A* over the
   height field) would close the remaining 21. The regional-tie code
   path (`chainStraightRun` from each landmass's anchor node to the
   nearest highway point) does not attempt terrain-following at all —
   not measured, not claimed.
5. **Water-aware regional ties** (the bridge gap named above).
6. **`city-render.js` importing the kit** for the FULL network, not just
   the arterial layer's own dedicated map.
