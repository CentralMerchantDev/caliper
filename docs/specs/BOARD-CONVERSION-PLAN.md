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
- [x] **P0.4** Footprints in whole cells, per `PLACEMENT-CONTRACT.md`. Any piece
      whose footprint is not a whole cell count gets snapped **outward** and the
      before/after recorded.
      **Gate:** zero pieces with a fractional cell footprint.
      **Done:** `snapCellsOutward()` added to `roadkit.js`, applied to all 26
      affected pieces (footprint-only where sockets are unaffected; snapped at
      the source where a cardinal socket's position is derived from the same
      dimension). Command: `node scripts/verify-roadkit.mjs` → 34 checked,
      **0 failing**. **3 open findings, not silently forced**: `rampMerge`,
      `rampDiverge`, `railSwitch` each have one angled connector socket
      (merge taper / turnout) at a genuine lane/track-gauge offset, not a
      bounding-box edge — cell-aligning it would mean changing
      `ROAD_STANDARDS` real-world dimensions, which the file's own header
      says never scale. Named in-code and in
      `docs/audits/P0-ROADKIT.md` §P0.4, for Mark to decide.

**EXIT P0:** every road piece builds, mates through one verifier that has been
watched rejecting bad input, and occupies whole cells **except the 3 named
angled-connector sockets above, which remain open**. Full suite:
`node test/run.mjs` → 973/978 pass, `npx tsc --noEmit` clean. The 5 failures
are pre-existing and unrelated to this file: the two known-red seed pins
(`planSeed.test.ts`, the layout-fits seed-match check), the origin-stability
test (intentionally red, Step 5), a derived-artifact staleness check, and one
rendering culling-ratio test traced to agy's own uncommitted, in-progress
`city-render.js` edits (confirmed via a `mergeGeometries` undefined-reference
error in that file, gone in a later rerun once agy's WIP moved on) — none in
a CLI-lane file. Full evidence: `docs/audits/P0-ROADKIT.md`. Committed.

**STOPPING HERE per the standing rule: stop at every phase exit, do not roll
into P1 unattended.**

---

# PHASE P1 — THE BOARD IS A LIST OF PLACED PIECES

*The representation change. This is the phase that makes everything else possible.*

- [ ] **P1.1** Define the placed-piece record. One shape for every element on the
      board — road, building, tree, prop, bridge:
      ```
      { id, pieceType, cell: {i, j}, rotation, foot: {w, d}, clear: {w, d}, layer }
      ```
      `id` unique and stable. `cell` from `grid.js`. Nothing stores metres.
      **Gate:** a test asserting every field is present and integral on a
      generated world; `cell` values round-trip through `cellOf`/`cellOrigin`
      unchanged.
- [ ] **P1.2** An occupancy index: given a rectangle of cells, what is in it;
      given a piece id, where is it. Built on `world-registry.js`, not beside it.
      **Gate:** place a piece, query its cells, get it back. Query a cell it does
      not occupy, get nothing. Remove it, query again, get nothing.
- [ ] **P1.3** `canPlace(pieceType, cell, rotation)` — the only placement
      question the board answers: **is there a free rectangle of `foot + clear`
      buildable cells here.** No class check, no use check, no height cap.
      **Gate:** watched red first. Place a piece, then attempt to place another
      overlapping it, and see the refusal. Then a piece on water, on a cliff, and
      off the edge of the world.
- [ ] **P1.4** `place`, `remove`, `replace`, `move`. Each returns the changed
      occupancy, each reversible.
      **Gate:** place → remove → the board is byte-identical to before.
      Place → replace → remove → identical. This is the property that makes an
      editor possible later.
- [ ] **P1.5** Determinism. A world built from the same seed produces the same
      piece list, in the same order, with the same ids.
      **Gate:** build twice, hash both piece lists, assert equal.

**EXIT P1:** a world can be described as a list of placed pieces, queried by
cell, and edited reversibly. **Nothing renders differently yet.** Commit.

---

# PHASE P2 — ROADS BECOME PIECES, AND THE LAYOUT CHANGES

*Mark chose this over a representation swap for a reason: "the road layout
doesn't make any sense or make a city that you could drive at all."*

The current generator stamps a rectangular grid at fixed avenue/street spacing
across each settlement's bounding box. **That pattern is the complaint.**
Converting it to pieces without changing it would preserve it exactly.

- [ ] **P2.1** Road hierarchy, from the planning research Mark supplied.
      Arterials connect settlement centres to each other and to the regional
      network. Collectors feed arterials. Local streets feed collectors. Junction
      class is determined by what meets what.
      **Standing rule:** zoning and planning codes are **KNOWLEDGE that informs
      layout**, never a compliance engine built into the game.
      **Gate:** a written description of the hierarchy with the source for each
      rule, before any code.
- [ ] **P2.2** Lay arterials as piece chains between centres, following terrain,
      using `ROAD_STANDARDS` for width and `grade.js` for gradient.
      **Gate:** every join socket-verified through the P0 verifier. Zero
      unverified joins in the world.
- [ ] **P2.3** Collectors, then locals, each mating into the level above at a
      real junction piece — `intersection4Way`, `intersection3Way`,
      `roundaboutModern`, `slipLane`, `rampMerge`/`rampDiverge` where classes
      differ.
      **Gate:** every junction in the world is a named piece. Zero implicit
      crossings.
- [ ] **P2.4** **Connectivity, as a hard gate, not a report.** Step 4 measured
      the current network: **52 components, 38 roads connecting to nothing,
      regional connectors fragmenting into 8–11 pieces each.**
      **Gate:** ONE connected component for each landmass's road network, and
      zero stranded roads. Watch the test red against today's world first.
- [ ] **P2.5** Retire the span representation. `{axis, at, from, to}` stops
      existing; nothing reads it.
      **Gate:** grep returns zero uses outside quarantine. Two representations
      is the pattern that has cost this project three times.
- [ ] **P2.6** `city-render.js` draws roads from the kit, not from ribbons.
      **Gate:** `roadkit.js` is imported by the render path — today it is not
      imported at all.

**EXIT P2:** every road in the world is a named piece at a grid address, mated
by a verified socket, in a connected network, drawn from the kit. **Mark judges
whether it looks like a city you could drive.** Commit per sub-phase.

---

# PHASE P3 — EVERYTHING ELSE IS A PIECE

*Buildings are nearly there. Props and trees are not.*

- [ ] **P3.1** Buildings become placed pieces — they already have ids and
      footprints, so this is mostly adopting the P1 record.
      **Gate:** every building in the world is findable by id and by cell.
- [ ] **P3.2** Trees, street furniture and props become placed pieces rather
      than loop output. `prop-manifest.js` already declares `foot`, `sweep` and
      `clear` — adopt it.
      **Gate:** the 27 measured lamp-inside-bench overlaps from
      `prop-manifest.js`'s own header become zero, because occupancy is checked.
- [ ] **P3.3** Bridges as piece chains — `bridgeChain` already exists.
      **Gate:** every bridge end lands on a road piece, socket-verified.
- [ ] **P3.4** The gap Mark named: **gas stations, EV charging, hydrogen
      fuelling.** None exist in any category. Geometry is agy's; the placement
      rule and footprint are this lane's.
      **Gate:** named in the handoff with footprint and clearance proposed.

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
| P0 | done, 3 open findings named | `node test/run.mjs` 973/978 pass (5 pre-existing, unrelated); `node scripts/verify-roadkit.mjs` 34/34, 0 failing, 3 named open; `npx tsc --noEmit` clean; `docs/audits/P0-ROADKIT.md` | (filled in below after commit) |
| P1 | not started | — | — |
| P2 | not started | — | — |
| P3 | not started | — | — |
| P4 | not started | — | — |
