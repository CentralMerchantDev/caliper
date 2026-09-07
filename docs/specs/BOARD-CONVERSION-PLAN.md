# THE BOARD CONVERSION — the overnight plan

**This document is the record.** Tick each item here as it lands, with the
command that measured it beside the tick. A phase with no measurement has not
been done. Both lanes work against this file and check themselves against it —
not against a prompt that has scrolled out of view.

---

## WHY THIS EXISTS

Mark, 2026-09-07, on the current world:

> everything about the city and surrounding areas looks like a mess … the road
> layout doesn't make any sense or make a city that you could drive at all …
> nothing about this looks like a city, just random building blocks, roads and
> trees

And the diagnosis, his:

> it doesn't seem like it is being built with the models that will be using in
> the end … nothing seems to be built on it like it is a game board with all the
> elements being pieces — roads, trees, buildings — with rules, but all can be
> removed, moved or modified, and should have locations to them on a grid in a
> way so that you can find them and that the coding lane can know what it is
> working on, but also so that it can determine what is on the spot and the
> amount of room it needs and is available for it

**Everything on the board becomes a PIECE**: a named thing, at a grid address,
with a known footprint and clearance, that can be placed, found, moved, replaced
or removed. Roads included — in Mark's words, "a road is made up from road
blocks of different types laid out one by one."

## THE STANDING PATTERN THIS PLAN EXISTS TO BREAK

Three times in two days, a system was **built properly and never connected**:

| System | State |
|---|---|
| The 2,400-model library | Catalogued, unreachable until `9d1693b` |
| The six quality tiers | Built, then duplicated rather than consolidated |
| **`roadkit.js` — 30+ road pieces with sockets** | **Complete, and `city-render.js` does not import it** |

And a fourth: **`verifySocketMating()` does not verify sockets.** Its header
claims it checks that two sockets face each other at 180°. The function reads
`kind`, `width` and `lanes` and never touches `.at` or `.bearing`. It would pass
two pieces a kilometre apart pointing the same way. Found by the CLI lane
reading the body rather than the comment.

**So the first rule of this plan: a claim about the code is not evidence about
the code.** Every gate below is a measurement or a test watched red.

---

## WHAT ALREADY EXISTS — DO NOT REBUILD IT

| | Where | State |
|---|---|---|
| Cell grid, 8 m, subdivision to 0.5 m | `grid.js` | Sound |
| Road pieces, 30+ builders | `roadkit.js` | Sound, unused by the world |
| Uniform piece shape `{id, kind, footprint, height, clearance, origin, sockets[]}` | `roadkit.js` | Sound |
| `ROAD_STANDARDS` — 7 classes with ROW width, lanes, speed, kerb radius | `roadkit.js` | Sound |
| 40 road designs + 40 bridge designs | `asset-registry.js` | Metadata + geometry, unused |
| A verified 7-piece street chain | `roadkit-street-demo.js`, `9a393c9` | **Proof the kit works** |
| Correct position/bearing join check | `roadkit-street-demo.js` | Written because the kit's own is broken |
| Spatial index | `world-registry.js` | Sound |
| Placement contract — foot + clear in cells | `PLACEMENT-CONTRACT.md` | Agreed |

**The kit is real and one street is proven. This plan is about the middle: a
world made of pieces instead of a world generated around them.**

---

# PHASE P0 — MAKE THE KIT TRUSTWORTHY

*Nothing built on a broken verifier is known to be right.*

- [x] **P0.1** Fix `verifySocketMating()` to do what its header says: check
      position (`.at`, transformed to world) and bearing opposition (180° ± ε)
      as well as kind, width and lanes.
      **Gate:** feed it two pieces that are correctly mated and two that are
      not — different position, then correct position but wrong bearing. **Watch
      it pass the first and fail both others.** A verifier never seen reject is
      not known to reject.
      **Done:** `public/roadkit.js` — added `transformSocket()`, rewrote
      `verifySocketMating()`. Watched red first (`node test/run.mjs` refused
      to build: `transformSocket` didn't exist), then green — 4 cases in
      `test/roadkit.test.ts`. Command: `node test/run.mjs`. See
      `docs/audits/P0-ROADKIT.md` §P0.1.
- [x] **P0.2** Retire the duplicate check in `roadkit-street-demo.js` and have
      it call the fixed `verifySocketMating`. Two implementations of "do these
      mate" is the two-sources-of-truth pattern that has cost this project the
      skyline, the tiers and the clearance already.
      **Gate:** the seven-piece chain still reports zero error at all six joins,
      through the shared function.
      **Done:** `public/roadkit-street-demo.js` rewritten to call
      `ROADKIT.transformSocket` + `ROADKIT.verifySocketMating` for the
      pass/fail verdict; hand-rolled `rotate`/`dirFor` math removed. Command:
      `node scripts/shoot-roadkit-street.mjs` → `ALL JOINS VERIFIED: true`,
      6/6 joins, `positionErrorM: 0`, `bearingDiffFrom180: 0`. Screenshot
      viewed directly. See `docs/audits/P0-ROADKIT.md` §P0.2.
- [x] **P0.3** `verifyAllRoadKit()` — run it, and report per piece: does it
      build, is its footprint a whole number of cells, do its sockets sit on
      cell boundaries.
      **Gate:** a table of every piece with pass/fail per column. Pieces that
      fail are named, not silently skipped.
      **Done:** new `scripts/verify-roadkit.mjs` — instantiates all 30 piece
      builders (34 representative instances; `bridgeChain` excluded, it's a
      chain plan, not a model). Command: `node scripts/verify-roadkit.mjs`.
      Before P0.4: 34 checked, 31 failing. Full table in
      `docs/audits/P0-ROADKIT.md` §P0.3.
- [x] **P0.4** ~~Footprints in whole cells~~ **SUPERSEDED 2026-09-07 by
      `PLACEMENT-CONTRACT.md` Part 0 — `snapCellsOutward` is REVERTED.**
      The 8 m cell was never the real addressing unit; the 1 m atom is.
      **Done, current state:** `roadkit.js`'s footprints are back to their
      real `ROAD_STANDARDS` values (an 18 m STREET is 18 m again).
      `rampMerge`/`rampDiverge`'s angled socket — named OPEN below under the
      old 8 m check — **closes exactly** at 1 m (38 m for FREEWAY/RAMP, a
      whole metre, verified not assumed). `railSwitch`'s socket does not
      close even at 1 m (a genuine 3.2 m offset) — still open. **New
      finding, visible only once the snap was reverted:** 5 pieces
      (`layby`, `bridgeCableStayed`/`bridgeSpan`'s cablestay case,
      `railStraight`, `railPlatform`) have a real fractional-metre
      dimension the old snap was masking. Not fixed — real constants,
      out of today's scope. Command: `node scripts/verify-roadkit.mjs`.
      Full account: `docs/audits/P0-ROADKIT.md`'s SUPERSEDED section.

**EXIT P0, UPDATED 2026-09-07:** every road piece builds and mates through
one verifier that has been watched rejecting bad input. Footprints are at
their real, unsnapped `ROAD_STANDARDS` values (Part 0). **2 of the original
3 angled-connector findings close exactly at the 1 m atom** (`rampMerge`,
`rampDiverge`); `railSwitch`'s remains genuinely open, and 5 pieces newly
show a real fractional-metre dimension, both named rather than forced. Full
suite (pre-pivot, still valid for P0.1–P0.3): `node test/run.mjs` → 973/978
pass, `npx tsc --noEmit` clean; the 5 failures were pre-existing and
unrelated (two known-red seed pins, intentionally-red origin-stability,
a derived-artifact staleness check, and one culling-ratio test traced to
agy's own concurrent WIP). Full evidence: `docs/audits/P0-ROADKIT.md`.
Committed.

**STOPPING HERE per the standing rule: stop at every phase exit, do not roll
into P1 unattended.**

---

# PHASE P1 — THE BOARD IS A LIST OF PLACED PIECES

*The representation change. This is the phase that makes everything else possible.*

- [x] **P1.1** Define the placed-piece record. One shape for every element on the
      board — road, building, tree, prop, bridge:
      ```
      { id, pieceType, cell: {i, j, k}, rotation,
        foot: {w, d}, levels, clear: {w, d}, standsOn: [...] }
      ```
      `id` unique and stable. `cell` from `grid.js`. Nothing stores metres.
      **Gate:** a test asserting every field is present and integral on a
      generated world; `cell` values round-trip through `cellOf`/`cellOrigin`
      unchanged.
      **Done:** `public/board-adapter.js` — adapts `plots`/`roads`/`bridges`
      (the three categories `generateWorld()` actually returns; trees/props
      confirmed absent from its output, named for P3.2, not built here).
      `standsOn` uses `land-use.js`'s own vocabulary, matched to its
      existing `buildAllowedAt`/`roadAllowedAt` rules. Command:
      `node scripts/_board-adapter-probe.mjs` → 16,935 pieces, 0 field
      violations, 0 duplicate ids.
      **Round-trip gate measured at the 1 m ATOM (`PLACEMENT-CONTRACT.md`
      Part 0), and the number is not what the contract claims either:
      16,009 of 16,209 plots (98.8%) do NOT round-trip.** Cheaper than the
      old 8 m CELL check (16,204/16,209, i.e. nearly none), matching Mark's
      own prediction — the residual is now a genuine sub-metre origin
      fraction (e.g. `block--1349-760-p0`: xMin -1343.8, zMin 768.9), not
      an 8 m-scale defect — but it is still real, not zero. Not fixed here
      (`city-plan.js` change, out of P1's scope) — reported plainly.
      See `docs/audits/P1-BOARD.md` §P1.1.
      **Rebuilt TWICE mid-phase**: first against an older 2D (`{i,j}`, no
      `levels`/`standsOn`/`surface`) draft of this gate, before Mark's
      cubes/stacking rewrite (below) was noticed; then again, fully, after
      `PLACEMENT-CONTRACT.md` Part 0 changed the addressing unit itself
      from the 8 m `CELL` to the 1 m `ATOM` (`grid.js`'s `atomOf`/
      `atomOrigin`/`atomRect`/`atomCentre`/`atomsFor`, added alongside the
      existing `CELL` functions, not replacing them —
      `test/grid.test.ts` depends on the 8 m semantics and still passes
      unchanged). Neither rebuild was committed until it matched the
      current spec — see `docs/audits/P1-BOARD.md`'s own note.

      **THE BOARD IS CUBES, NOT SQUARES.** Mark, 2026-09-07: *"the board is a
      list of cubes, really … defined spaces, defined cubes that are told what
      they are and what they can be."* An earlier draft of this record used
      `cell: {i, j}` — two dimensions — which cannot express a raised
      intersection, a flyover, a bridge over a road, or a sunken rail corridor,
      all of which the road kit already builds. **`k` is the vertical index**,
      in `grid.js`'s existing `LEVEL = 4` metre unit, with `levelsFor()` and
      `heightOf()` converting. `levels` is how many cubes tall the piece is.

      **A CELL HAS A KIND, AND A PIECE DECLARES WHAT KINDS IT STANDS ON.** This
      is Mark's *"what they are and what they can be"*, and both halves already
      exist:

      - **What a cell is** — `land-use.js` `USE`: `water`, `beach`, `cliff`,
        `steep`, `reserved`, `buildable`. Plus `locked` for unopened ground per
        `grid.js`.
      - **What a piece can stand on** — every `roadkit.js` piece already carries
        `standsOn`: 20 declare `["open"]`, four bridge pieces declare
        `["water","rock","open"]`, one declares `["open","plot"]`, one
        `["track","open"]`. **Nothing enforces it yet because nothing places
        from the kit** — but the declaration is on every piece already.

      **PIECES STACK, AND A PIECE'S TOP IS GROUND FOR THE NEXT ONE.** Mark's
      bench, 2026-09-07:

      > if I wanna put a park bench, I can put it onto grass and sidewalk, but
      > not onto the road or onto the roof of a building … I wanted to put a
      > rooftop bench, I should be able to put those

      That is not a terrain rule. The bench asks what it is standing on, and the
      answer comes from **the piece below it**, not from the ground. So every
      piece declares one more field:

      - **`surface`** — what this piece presents on top: `pavement`, `road`,
        `roof`, `grass`, `plaza`, `track`, `deck`, or `none` (nothing may sit on
        me).

      And `standsOn` accepts **surfaces as well as terrain kinds**. A park bench
      is `standsOn: ["grass", "pavement"]`. A rooftop bench is
      `standsOn: ["roof"]`. Same mechanism, different list — which is why a
      rooftop bench is a different *piece*, not a special case in the rules.

      **The stack is therefore: terrain cell → ground piece → prop.** Each layer
      answers the one above it. `standsOn: ["open", "plot"]` already exists on a
      road-kit piece, so the mechanism is half-built; what is new is `surface`
      on the piece below.

      **THE CELL MUST BE SMALLER THAN THE SMALLEST PIECE, OR NOTHING CAN BE
      REPLACED.** Mark: *"if the whole board is only sized to fit one thing,
      then only that thing can go there and you could never replace it … you've
      got to be able to put it anywhere and replace it."*

      This is why the cell is 8 m and not building-sized: a house is 2×3 cells,
      a tower 6×6, a bench a sixteenth of one. Anything can be swapped for
      anything that fits the cells freed. `grid.js` already subdivides to 0.5 m
      for exactly this, so a bench does not have to consume 8 m of ground.

      **This is the whole of the "hard" rule set.** Mark: *"there are rules
      where you can't place certain things certain places … so that is what
      prevents you from [putting a] skyscraper in the ocean."* Terrain and
      surface kinds versus `standsOn` is that rule, and it is the only one the
      board enforces. Everything else — needing enough room, and progression
      gates like *"you need to have gotten this to get this"* — is space
      arithmetic and the game layer respectively. Neither belongs in the board.
- [x] **P1.2** An occupancy index: given a rectangle of cells, what is in it;
      given a piece id, where is it. Built on `world-registry.js`, not beside it.
      **Gate:** place a piece, query its cells, get it back. Query a cell it does
      not occupy, get nothing. Remove it, query again, get nothing.
      **Done:** `public/board.js`'s `createBoard()` — `whereIs(id)` is an
      O(1) `Map` lookup, `inCells(i,j,w,d,k)` wraps `world-registry.js`'s
      own `allOverlapping` (no second spatial index). Command:
      `node test/run.mjs`, `test/board.test.ts`. See
      `docs/audits/P1-BOARD.md` §P1.2.
- [x] **P1.3** `canPlace(pieceType, cell, rotation)` — the only placement
      question the board answers: **are there enough free cells here, of a kind
      this piece can stand on.** Two conditions, and only two:

      1. **Space** — a free box of `foot + clear` cells, `levels` tall.
      2. **Ground** — every cell's kind is in the piece's `standsOn` list.

      **No zoning check, no plot-class check, no height cap.** A villa may go
      downtown; a tower may go in a field with the room for it. The only thing
      that refuses is terrain, and it refuses because a bridge deck declares it
      stands on water and a house does not.
      **Gate:** watched red first. Place a piece, then attempt to place another
      overlapping it, and see the refusal. Then a piece on water, on a cliff, and
      off the edge of the world.
      **Done, and watched red TWICE, for two different real bugs**:
      (1) the first terrain-check draft, built against the pre-rewrite 2D
      spec, failed both water and buried-rock cases the first run
      (`world-registry.js`'s `WATER`/`ROCK` answer volumetric submersion,
      not "can this piece stand here" — superseded by GROUND/`standsOn`
      once the spec changed). (2) after rewriting to the 3D/stacking
      design, the stacking test itself failed: a rooftop piece above a
      building on flat ground at y=10 (not y=0) read as floating in mid-
      air, because `k`'s vertical extent was measured from absolute sea
      level, not local ground -- fixed by threading a real `groundY`
      (sampled via `heightAt`) through every vertical-extent calculation.
      Watched green after, unedited assertions. Command: `node test/run.mjs`.
      See `docs/audits/P1-BOARD.md` §P1.3 for both, in full.
- [x] **P1.4** `place`, `remove`, `replace`, `move`. Each returns the changed
      occupancy, each reversible.
      **Gate:** place → remove → the board is byte-identical to before.
      Place → replace → remove → identical. This is the property that makes an
      editor possible later.
      **Done:** `test/board.test.ts` — place→remove, place→replace→remove,
      move (+ a refused move leaving the board untouched), replace refusing
      a shape that would not fit — all byte-identical (`JSON.stringify`
      equality on `board.list()`) to before. Command: `node test/run.mjs`.
- [x] **P1.5** Determinism. A world built from the same seed produces the same
      piece list, in the same order, with the same ids.
      **Gate:** build twice, hash both piece lists, assert equal.
      **Done:** two builds, same seed, same 16,935 pieces, same ids in the
      same order, same SHA-256 digest. **A real infrastructure problem
      found and fixed along the way**: building the world even once at
      module scope in `test/run.mjs`'s shared process (~110 other bundled
      files' own world-builds already resident) reliably crashed the whole
      suite with a V8 OOM (`Committing semi space failed`), watched three
      times with different exit codes. Fixed by moving every
      `generateWorld()` call for this phase into
      `scripts/_board-adapter-probe.mjs`, run as a genuine separate `node`
      child process (`execFileSync`), reporting a small JSON summary back
      -- never the full world twice in one process. Command:
      `node test/run.mjs`. See `docs/audits/P1-BOARD.md` §P1.5.

**EXIT P1:** a world can be described as a list of placed pieces, queried by
cell, and edited reversibly. **Nothing renders differently yet.** Full suite:
command and result recorded in the RECORD table below. Full evidence:
`docs/audits/P1-BOARD.md`. Committed.

**STOPPING HERE per the standing rule: stop at every phase exit, do not roll
into P2 unattended.**

---

# PHASE P2 — ROADS BECOME PIECES, AND THE LAYOUT CHANGES

*Mark chose this over a representation swap for a reason: "the road layout
doesn't make any sense or make a city that you could drive at all."*

The current generator stamps a rectangular grid at fixed avenue/street spacing
across each settlement's bounding box. **That pattern is the complaint.**
Converting it to pieces without changing it would preserve it exactly.

- [x] **P2.1** Road hierarchy, from the planning research Mark supplied.
      Arterials connect settlement centres to each other and to the regional
      network. Collectors feed arterials. Local streets feed collectors. Junction
      class is determined by what meets what.
      **Standing rule:** zoning and planning codes are **KNOWLEDGE that informs
      layout**, never a compliance engine built into the game.
      **Gate:** a written description of the hierarchy with the source for each
      rule, before any code.
      **Done:** `docs/specs/ROAD-HIERARCHY.md`. Planning research confirmed as
      `docs/CITY-PLANNING-SPEC.md` (the only sourced planning doc in the repo,
      named in the commit that created it). No new road classes — the 4
      tiers map onto the 7 existing `ROADS` classes; widths use
      `PLACEMENT-CONTRACT.md` Part 0's standard table, not `ROAD_STANDARDS`'
      real values. Junction-class-by-what-meets-what is a table with a
      source per row (§1.6 conflict points/corner radii/60° minimum angle).
- [x] **P2.2** Lay arterials as piece chains between centres, following terrain,
      using `ROAD_STANDARDS` for width and `grade.js` for gradient.
      **Gate:** every join socket-verified through the P0 verifier. Zero
      unverified joins in the world.
      **Done:** `public/road-network.js` — new standard-width pieces (Part 0's
      table, not `ROAD_STANDARDS`' real values — a documented departure, see
      the file's own header), MST per landmass over settlement/landmass
      centres (all 11, including `downtown`/`barrier` which carry no
      `SETTLEMENTS` entry — confirmed, centres derived from their own
      geometry). Watched red once: the first version chained centre-to-centre
      and every junction failed with a position mismatch equal to the
      junction's own radius; fixed by trimming edges to the junction's socket
      before building them. Command: `node test/run.mjs`
      (`test/roadNetwork.test.ts`) → **2,034 joins, 0 failures** (heightAt
      omitted). Grade checked against `ROAD_GRADE.BOULEVARD.maxGrade` —
      **30 of 80 edges exceed it** on a straight line, worst two at
      113.5%/100.7% (a cliff, not a road).
      **UPDATE — terrain-following routing (P2 finish, item 1):**
      `routeTerrainFollowing()` bends a route away from the direct line
      when the straight grade is too steep, a bounded depth-5 lateral-
      offset heuristic, honestly named as one (not a real A*-over-height-
      field router). **Watched red once more, at a deeper layer than P2.2's
      own bug:** the first working version of the router bent routes but
      abutted straight pieces directly at the bend — a straight piece is a
      straight box, its two end faces are always parallel, so two of them
      meeting at different headings can never satisfy socket bearing-
      opposition. **70 of 2,287 joins failed** under real terrain the
      moment this was measured (the existing suite never had passed a real
      `heightAt` in). Fixed by placing a real 2-leg `standardJunction()`
      bend piece at every interior waypoint, trimmed by its own radius —
      the same pattern P2.2's own junctions already use, one level
      further in. **After the fix: 0 of 2,294 joins fail, 72/72 junctions
      still ok, under real terrain.** Grade: **21 of 80 edges still exceed
      the limit** (down from 30; worst two now 48.9%/42.9%, down from
      113.5%/100.7%) — gate not fully met, remaining edges named as
      exceptions: all on the barrier crescent, kingsley-isle, or
      mainland's steepest terrain, where the heuristic's bounded search
      found no lateral offset that helped enough within its depth limit.
      Command: `node test/run.mjs` (`test/roadNetwork.test.ts`, two new
      cases). See `docs/audits/P2-ARTERIAL.md`.
- [ ] **P2.3** Collectors, then locals, each mating into the level above at a
      real junction piece — `intersection4Way`, `intersection3Way`,
      `roundaboutModern`, `slipLane`, `rampMerge`/`rampDiverge` where classes
      differ.
      **Gate:** every junction in the world is a named piece. Zero implicit
      crossings.
      **Arterial level (P2.2 spillover):** every node where 2+ arterial
      legs meet gets a real junction piece, verified against every leg —
      **72 junctions, 72 fully verified, 0 failures** (`node test/run.mjs`).
      **UPDATE — collectors and locals (P2 finish, item 2):**
      `buildCollectorLocalNetwork()` converts the EXISTING generated
      network's `AVENUE`/`STREET`/`LANE` spans (**1,012 of 1,357 roads,
      74.6%** — `BOULEVARD`/`FREEWAY`/`RAMP` stay spans, used for crossing
      detection only) into socket-verified piece chains, real
      per-leg-class junctions at every crossing. **Three real bugs found
      and fixed by measurement, not assumed correct:** (1) junction socket
      position used the wrong bearing, 12,765 of 21,285 joins failed on
      first measurement, fixed to match `buildArterialNetwork`'s own
      convention; (2) the arterial-scale junction-radius formula does not
      belong on local streets — `CITY-PLANNING-SPEC.md` §1.6's own
      published corner-radius figures ("urban standard 3.0-4.6 m ...
      vehicle-oriented 9.1-22.9 m") used per leg instead, per class; (3) two
      independently-computed versions of the same crossing point could
      differ by close to a millimetre, fixed by trimming every leg at a
      node from that node's one shared coordinate. **Gate: 2,899 of 3,778
      junctions (76.7%) fully verified, 22,587 joins checked, 1,076 fail.**
      **Every one of the 879 unverified junctions is checked and explained**
      — a leg's own sourced corner radius exceeds its adjacent block's
      length (a real property of the existing generator's block spacing,
      not a conversion defect), confirmed 879/879, zero unexplained.
      **Gate not fully met** — 879 named exceptions, not zero. Piece
      SELECTION (per `docs/specs/ROAD-HIERARCHY.md`'s table) still not
      built — one uniform junction box stands in, labelled with what kind
      it would be, same limitation as the arterial layer. Command:
      `node test/run.mjs` (`test/collectorLocalNetwork.test.ts`, six new
      cases). See `docs/audits/P2-COLLECTOR-LOCAL.md`.
- [x] **P2.4** **Connectivity, as a hard gate, not a report.** Step 4 measured
      the current network: **52 components, 38 roads connecting to nothing,
      regional connectors fragmenting into 8–11 pieces each.**
      **Gate:** ONE connected component for each landmass's road network, and
      zero stranded roads. Watch the test red against today's world first.
      **Watched red, reconfirmed:** `node scripts/measure-roads.mjs` → still
      **52 components, 38 stranded, of 1,357 roads**, unchanged by P2.2/P2.3
      (neither touches an existing road's position).
      **UPDATE — full-network gate (P2 finish, item 3):**
      `buildConnectivityBridges()` adds NEW connector pieces on top of the
      existing network (`generateWorld()`'s own output must stay
      byte-identical at seed 0 — a standing guard, so this does not modify
      a single existing road) — a single global MST over all 52 components'
      nearest real endpoint pairs, each edge a straight or Manhattan-dogleg
      connector. **A real bug, watched red first:** the first version
      terminated connectors at whatever axis the dogleg wanted; when that
      matched the target road's own axis, `crosses()` (the SAME check
      `scripts/measure-roads.mjs` uses) cannot detect a same-axis touch by
      definition — 52 components fell to only 41, not 1, on first
      measurement. Fixed with a perpendicular stub at every connection
      point. **Gate MET: 52 components → 1, 38 stranded → 0**, measured by
      the identical `crosses()` yardstick the baseline used, over the
      augmented road list. Command: `node test/run.mjs`
      (`test/connectivityBridges.test.ts`, four new cases). **Named, not
      verified:** connectors are not socket-checked against the existing
      spans they reach (no socket exists on an unconverted span to check
      against) and use a uniform `STREET` class regardless of length — the
      two longest (3,434 m, 2,359 m) almost certainly cross open water and
      would need a real bridge, not a street. See
      `docs/audits/P2-CONNECTIVITY.md`.
- [!] **P2.5** BLOCKED. Retire the span representation. `{axis, at, from,
      to}` stops existing; nothing reads it.
      **Gate:** grep returns zero uses outside quarantine. Two representations
      is the pattern that has cost this project three times.
      **UPDATE — scope measured (P2 finish, item 4):** P2.3's completion did
      NOT unblock this the way the plan originally assumed — P2.2/P2.3's
      piece layers are ADDITIVE, alongside the span array, not a
      replacement for it; `world.roads` is unchanged. A full scoping pass
      (read-only) found **11 producer sites** in `city-plan.js` and
      **~30 consumer call sites across ~9 other files** (heaviest:
      `city-render.js`'s ~9 independent road-drawing loops, plus
      `board-adapter.js`'s structural dependency for the editable/mutation
      layer, plus `grade.js`). Two producers are frozen, shared-by-reference
      singletons (`HIGHWAYS`/`FREEWAYS`) that must stay that way; several
      producers derive road `id`s from the shape's own coordinates,
      entangling it with determinism, not just geometry. **Genuinely blocked
      on the render-path lane boundary** — the heaviest consumer is
      `sandbox-spike-agy`'s active file, the same boundary P2.6 is blocked
      on. Full scope, and what a real migration would require next, in
      `docs/audits/P2-SPAN-RETIREMENT.md`.
- [ ] **P2.6** `city-render.js` draws roads from the kit, not from ribbons.
      **Gate:** `roadkit.js` is imported by the render path — today it is not
      imported at all.
      **Partial.** `city-render.js` still does not import the kit — the full
      network still renders as ribbons. What exists instead: a dedicated
      top-down render of the arterial layer,
      `public/arterial-network-map.html` /
      `scripts/shoot-arterial-network.mjs` → `.shots/arterial-network-map.png`,
      viewed directly. Every landmass reads as one connected arterial spine;
      grade-limit findings are marked in red. A named limitation: regional
      ties are straight lines with no water-crossing awareness. See
      `docs/audits/P2-ARTERIAL.md`.
      **[!] BLOCKED on coordination (P2 finish, item 5):** `city-render.js`
      is `sandbox-spike-agy`'s file (the worktree split exists specifically
      so two lanes are not editing the same checkout — `docs/BUILD-LOOP.md`
      STEP 8). Not edited here. A full handoff — what three piece layers
      exist to render, what the ribbon technique currently does (confirmed:
      roughly a dozen call sites across a 4,012-line file, not one function
      to swap), and a proposed interface for agy to pull rather than this
      lane to push — is written up in `docs/audits/P2-RENDER-HANDOFF.md`.
- [!] **P2 finish, item 6** BLOCKED. Snap plot origins to whole metres,
      during the regeneration this pass already does. Watched red first:
      200 of 16,209 plots round-tripped cleanly through
      `atomOf`/`atomOrigin` (PLACEMENT-CONTRACT.md's "carved on whole
      cells" claim did not hold).
      **Attempted, measured a serious regression, reverted rather than
      shipped.** Rounding `generateBlocks()`'s and `generateSettlement()`'s
      block bounds to the metre (where they are actually decided —
      coordinates lost their whole-metre-ness at `WORLD_SCALE`'s float
      multiplication) DID reach 100% round-trip (15,818 of 15,818 plots),
      but measured a large, real side effect: city-wide placed buildings
      fell from 17,105 to ~9,700 (43%), because a ROUNDED `block.depth`
      crosses `subdivideBlock()`'s exact two-row threshold
      (`depth >= 2*cls.minD + 8`) for most blocks that were previously just
      above it — confirmed directly by counting rows per block (1,078
      two-row / 184 one-row before, 210 two-row / 976 one-row after — a
      near-total collapse of the second row, not a class-distribution
      shift; block count and class mix were within noise, 2,534→2,533 and
      per-class counts flat). Three rounding strategies were tried
      (nearest-per-edge, outward/floor-ceil — far WORSE, 3,246 plots total,
      from adjacent-block overlap — and width-preserving nearest); all
      three produced essentially the same placement collapse, so the cause
      is the fact of moving `block.depth` at all near this threshold, not
      the specific rounding method. **Reverted rather than shipped** — a
      43% drop in the city's own buildings is not an acceptable trade for
      address correctness, and root-causing why so many blocks sit exactly
      at this threshold (a tuning coincidence in `avEff`/`stEff`'s density
      scaling, per P2.3's own comment on that same spacing math) needs more
      time than this pass has. Named as genuinely blocked, per
      `docs/BUILD-LOOP.md`'s own provision for a step that cannot be done
      this pass, not silently dropped.

**EXIT P2, HONEST STATE:** the arterial layer is real, fully socket-verified,
connected by construction and by measurement, and rendered. Collectors and
locals — the majority of the network — are untouched; P2.4's full gate and
P2.5 do not close until they are converted. **Mark judges the arterial
layer's render** against "does it look like something you could drive between
real places" — not yet the full city, named as such. Full evidence:
`docs/audits/P2-ARTERIAL.md`.

**STOPPING HERE per the standing rule: stop at every phase exit, do not roll
into P3 unattended.**

---

# PHASE P3 — EVERYTHING ELSE IS A PIECE

*Buildings are nearly there. Props and trees are not.*

- [x] **P3.1** Buildings become placed pieces — they already have ids and
      footprints, so this is mostly adopting the P1 record.
      **Gate:** every building in the world is findable by id and by cell.
      **UPDATE:** "mostly adoption" did not hold on direct reading — a
      `planCity()` placement carries the PLOT's id, not its own, and the
      plot's available *envelope*, not the building's real footprint. Two
      real decisions made and named: `plot.buildable` as a three.js-free
      footprint proxy, and excluding a built plot's own "plot" piece so it
      does not double-reserve the same ground as the new building piece. A
      real bug found by measuring: independent `atomOf`(floor)/`atomsFor`
      (ceil) rounding at row-house party-wall boundaries overlapped **2,735
      of 17,105 buildings** by exactly 1 atom; fixed by deriving both edges
      with `atomOf`. **Gate MET: 17,105 building pieces, 0 building-vs-
      building overlaps, 0 duplicate ids**, 2 residual (named, not chased)
      building-vs-unbuilt-plot edge cases. `public/board-adapter.js`'s
      `buildingPieces()`. See `docs/audits/P3-BUILDINGS-AND-PROPS.md`.
- [!] **P3.2** BLOCKED on coordination for wiring, checker built and
      tested. Trees, street furniture and props become placed pieces rather
      than loop output. `prop-manifest.js` already declares `foot`, `sweep` and
      `clear` — adopt it.
      **Gate:** the 27 measured lamp-inside-bench overlaps from
      `prop-manifest.js`'s own header become zero, because occupancy is checked.
      **UPDATE:** `public/prop-placement.js` is a real occupancy checker,
      using the SAME `world-registry.js` reservation roads/plots already go
      through — reproduces the exact "lamp inside bench" defect the header
      names and refuses it (`reason: "occupied"`), confirmed against real
      `prop-manifest.js` data for every non-`sized` prop type. **Not wired
      into `city-render.js`'s own placement loops** — that file is
      `sandbox-spike-agy`'s active work, the same lane boundary P2.6 is
      blocked on. The real 27-count cannot be re-verified as zero until that
      wiring lands; what this pass proves is that the checker correctly
      catches that exact class of overlap. See
      `docs/audits/P3-BUILDINGS-AND-PROPS.md`.
- [!] **P3.3** PARTIAL. Bridges as piece chains — `bridgeChain` already exists.
      **Gate:** every bridge end lands on a road piece, socket-verified.
      **UPDATE:** `roadkit.js`'s `bridgeSpan()` (real world sockets already,
      used directly — `bridgeChain`'s own plan is abstract/relative and
      would need a second placement layer this gate does not require) built
      as a real piece for **8 of 19** real `BRIDGES` entries. The other 11
      are refused BY NAME with `roadkit.js`'s own real reason — "exceeds
      maximum engineering limit (800m)" — the world's two harbour crossings
      and several causeways genuinely run 852-1,924 m, over BOTH
      `bridgeSpan`'s and `bridgeChain`'s identical 800 m ceiling. Every
      built piece's two ends are real, mateable, bearing-opposed sockets
      (checked, not assumed). **"Lands on a road piece" measured and found
      NOT met**: none of this pass's three piece-network layers (arterial,
      collector/local, connectivity bridges) reaches a bridge's actual
      landing coordinate — arterial nodes are settlement centres ~1.6 km
      apart, with no reason to coincide, and measurement confirms they do
      not, for all 8 built bridges' 16 ends. `verifyBridgeEnds()` itself is
      exercised and correct (planted-match test passes). See
      `docs/audits/P3-BRIDGES.md`.
- [x] **P3.4** The gap Mark named: **gas stations, EV charging, hydrogen
      fuelling.** None exist in any category. Geometry is agy's; the placement
      rule and footprint are this lane's.
      **Gate:** named in the handoff with footprint and clearance proposed.
      **Gate MET.** Confirmed by search first (none of the three exist
      anywhere in `asset-registry.js`/`prop-manifest.js`/`city-plan.js`).
      Footprint, clearance and a placement rule proposed for all three —
      `fuel-gas` (24×18 m, 4 m clear, collector-or-higher frontage),
      `fuel-hydrogen` (20×16 m, **10 m clear** — the real, sourced
      difference from gasoline, NFPA 2/ISO 19880-1's wider hydrogen
      separation distance, plus a named-but-unenforceable
      residential/civic-proximity rule), `ev-charging` (`sized`, per-stall
      2.7×5.5 m ADA/ITE standard, 1.5 m aisle clearance, least restrictive
      of the three — matches real siting, EV charging retrofits into
      ordinary parking). Every number marked sourced vs. this pass's own
      derivation, per RULE ZERO. See
      `docs/audits/P3-FUEL-EV-HYDROGEN-HANDOFF.md`.

**EXIT P3:** nothing on the board is anonymous. Every element can be pointed at
and named. Commit.

---

# PHASE P4 — SELECTION AND EDITING

*Mark: "after the board is pieces." Not before, and it is nearly free once P1
lands.*

- [ ] **P4.1** Click a piece, get its id, type, cell and footprint.
- [ ] **P4.2** Highlight and isolate.
- [ ] **P4.3** Remove and replace through the P1 operations.
- [ ] **P4.4** Drag to a new cell, with `canPlace` refusing invalid targets and
      saying why.
- [ ] **P4.5** Hand a selected piece to the coding lane for mutation — Mark:
      "so that you can ask for a mutation of them or change them completely in
      the coding lane if that is what you are wanting to do with it, but that is
      not all the coding lane is for."

**EXIT P4:** Mark can click any element of his world and change it.

---

## AUDIT CHECKPOINTS

**The plan calls the audit; the audit does not run on a clock.** Triggers and
protocol are in `docs/UMAA-CALIPER.md` under "When this audit runs", and every
audit starts at **Step 0 — borrow the benchmark, do not invent one.**

| Checkpoint | Trigger | Why here |
|---|---|---|
| **P1 exit** | 3 — a control never watched red | `canPlace` and place→remove reversibility are new controls the whole board rests on |
| **P2.4** | 1 — a new kind of measurement | first full-network connectivity figure; currently 52 components and 38 stranded |
| **P3 exit** | 3 | the no-floating-edge assertion, world-wide |
| **Before any number ships** | 2 | résumé, public page, or deploy — no exceptions |
| **After three green phases** | 4 | a run of clean passes is when drift accumulates unseen |

**Also audit, unscheduled, when:** a phase is reported complete that changed few
or no files (compare against `git diff --stat`), or when Mark reports something
the measurements say is fine. His eye disagreeing with a green suite means the
suite is measuring the wrong thing.

**The audit records which trigger fired**, at the top of its report. An audit
that cannot say why it ran was run out of habit.

## RULES FOR THE OVERNIGHT RUN

These replace Mark's eye while he is asleep. They are not optional.

1. **A GATE IS A MEASUREMENT OR A WATCHED-RED TEST.** Never a description, never
   a claim. If a gate cannot be measured, the phase stops and says so.
2. **STOP AT EVERY PHASE EXIT.** Do not roll from P1 into P2 unattended. Record
   the exit state in this file and continue only if every gate above it is
   ticked with a command beside it.
3. **COMMIT AFTER EVERY FILE CHANGE**, `git commit -F`. The tree has reset twice
   and both losses were batches.
4. **IF A NUMBER CROSSES A LIMIT, LEAD WITH THAT.** Four times in two days a
   breach was reported as a pass. A report that flags its own problem is worth
   more than one that passes.
5. **NOTHING DELETED** — quarantine to `_TO-DELETE/<reason>/`.
6. **ZERO API SPEND. DO NOT MERGE. DO NOT DEPLOY.**
7. **WHEN A CLAIM IN THIS REPO CONTRADICTS THE CODE, THE CODE WINS** — and the
   contradiction gets written down. `verifySocketMating`'s header is the example.
8. **IF BLOCKED, WRITE THE QUESTION DOWN AND MOVE TO THE NEXT INDEPENDENT ITEM.**
   Do not guess and proceed; do not stall the whole night on one answer.

## LANE BOUNDARY

| | CLI lane | agy |
|---|---|---|
| Files | `city-plan.js`, `layout.js`, `land-use.js`, `roadkit.js`, `world-registry.js`, `grid.js` | `city-render.js`, `buildings.js`, `tier-models.js`, `props.js`, `facade-textures.js`, `asset-registry.js` |
| Owns | the board, placement, the road network, occupancy | geometry, materials, models, the kit's *shapes* |

**Road network is the CLI lane. Road surface and piece geometry are agy.**

## RECORD

| Phase | Status | Gate evidence | Commit |
|---|---|---|---|
| P0 | done; P0.4 superseded by PLACEMENT-CONTRACT.md Part 0 (snap reverted), 2 of 3 open findings now closed at 1 m, 1 new finding (5 fractional-metre pieces) | `node scripts/verify-roadkit.mjs` (post-revert); `docs/audits/P0-ROADKIT.md` SUPERSEDED section | `f0a0372`, revert in `90844af` |
| P1 | done, real numbers led with | `node test/run.mjs` 998/1004 pass (6 pre-existing, unrelated); `node scripts/_board-adapter-probe.mjs` 16,935 pieces, 0 field violations, 0 dup ids; plot atom round-trip 200/16,209 (16,009 miss, real but sub-metre); road atom alignment 334/707; `npx tsc --noEmit` clean; `docs/audits/P1-BOARD.md` | `0408fdc` (Part 0), `90844af` |
| P2 | PARTIAL — arterial layer only. P2.1/P2.2 done; P2.3/P2.4 met at arterial level, not full network; P2.5 not done; P2.6 partial (arterial map render, not full renderer). P2 finish item 1 (terrain-following grade routing) done, not fully gated | `node test/run.mjs` 1012/1014 pass (2 pre-existing); arterial: 2,294 joins/0 fail under real terrain, 72 junctions/0 fail, 1 component per landmass (measured); full network: still 52 components/38 stranded (`node scripts/measure-roads.mjs`, unchanged); grade 30/80 over limit straight-line -> 21/80 after terrain-following routing, remaining named as exceptions (bounded heuristic, steepest terrain); `docs/audits/P2-ARTERIAL.md` | `7cd7de6` (P2.1), `ca8ad3d`, `11640b8` (terrain routing) |
| P3 | not started | — | — |
| P4 | not started | — | — |
