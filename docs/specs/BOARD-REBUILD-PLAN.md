# BOARD REBUILD — the plan

Written 2026-09-08. Supersedes the earlier version of this file entirely.

## Why

Four measured facts. None is a matter of taste.

**Coverage is 3.82%.** 391.9 km² of dry land carries 17,586 plots totalling
14.98 km². Ninety-six percent of the land has nothing on it. For scale, borrowed
rather than invented: Paris proper is 105 km² with roughly 135,000 buildings.
This world has four times Paris's land and thirteen percent of its buildings.

**The world cannot be expanded.** The requirement was stated at the outset — 26 km
now, expandable later. Change `WORLD.SIZE` and every plot moves: plot[0] goes
from (-1343.8, 768.9) to (-1048.0, 684.9). `test/originStability.test.ts` reports
this, and its own title says it was "written to report this, not to fix it."

**Plots do not sit on the grid the contract claims.** `PLACEMENT-CONTRACT.md`
says plots are carved on whole cells. Measured: **305 of 17,586 round-trip
cleanly. 17,281 do not.**

**Nothing built in weeks is drawn.** `city-render.js` builds directly from
`planCity()` output, so every new system either replaces that path or sits beside
it. Nine chose to sit beside it: `roadkit`, `road-network`, `board.js`, the
kitbash kit, `propModel()`, `prop-placement.js`, `props.js`, the facade atlas,
the airport embankment. That is one architecture producing the same decision nine
times, not nine oversights.

## What dies, what lives

**Replaced outright — three files.** All four faults above live here.

- `public/city-plan.js` — the generator
- `public/city-render.js` — the render monolith
- `public/layout.js` — plot-to-building assignment

Repairing them would be slower than replacing them and would carry the
assumptions forward. They are quarantined to `_TO-DELETE/`, not deleted.

**Carried across as components — everything else.** These are correct, tested,
and rewriting them to arrive at the same place would be the waste.

- `terrain.js` — shore profiles, beach falloff, cliffiness, waterways, basins.
  Its *machinery* survives. Its *map* does not — see the new world below.
- `footprint.js`, `grid.js`, `board.js`, `world-registry.js`, `spatial-index.js`
- `roadkit.js` — thirty-plus pieces with real socket mating, never yet drawn
- `buildings.js`, `facade-textures.js`, `prop-models.js`, `props.js`, the kit
- 1,087 tests, `docs/AUDIT-PROTOCOL.md`, `docs/UMAA-CALIPER.md`,
  `docs/BUILD-LOOP.md`, and every gate that earned its place
- `board-region.js` — a `board.js` utility (imports only from `board.js`),
  extracted so `isolate.js`/`move-piece.js` did not each duplicate the same
  region query (Failure pattern E, named by its own header). No dependency
  on `city-plan.js` or the generator at all; ruled on directly (Mark,
  2026-09-08) rather than by category, alongside `board-adapter.js` below.

**`board-adapter.js` dies with `city-plan.js`, on a delay, not on the same
day.** Ruled on directly, not by category (Mark, 2026-09-08): its own
header says "`generateWorld()` -> a list of placed pieces," and it
`import`s `ROADS` from `city-plan.js` directly — it exists solely to
convert the OLD generator's output into board pieces, so the moment B2
emits pieces directly, its entire job disappears. **Sequencing matters**:
it is imported live today by `world-render-3d.js` (`boardPiecesById`, P4.1's
picking path) — quarantining it before B2 supplies real pieces of its own
would break live selection. It is quarantined to `_TO-DELETE/` only AFTER
B2's pieces are what `world-render-3d.js` reads, not before — B2.1's own
"what B2.1 is explicitly NOT deciding" list already named this as open;
this is that decision, made.

## The world

An archipelago. Water is the design, not the leftover.

- **~65% water** to start, exposed as a tunable parameter, not baked in.
- **One substantial mainland**, farmland behind it, a tall range framing rather
  than occupying.
- **A downtown island** — the largest, dense, the skyline.
- **A scatter of islands with honest reasons for their density**: suburb-sized,
  resort-sized, mountain-and-cliff, wooded, and two or three cottage islands
  carrying a single mansion each.
- **Bridges and boats** connecting them.

**Settled land targeted at 20–40 km², not 392.** A city of ~17,000 buildings
wants that much ground at real densities. The rest is deliberately countryside,
mountain and sea.

**Lots grow 1.5× to 2×** so a building commands ground rather than sitting in a
postage stamp.

## The architecture rule

**The board is the world. The renderer draws the board. Nothing else holds world
state, and nothing else is drawn.**

All nine failures are impossible under that rule: a system not in the board does
not appear, which is visible immediately rather than discovered weeks later.

The board is a spatial index — the same move as IVF or HNSW, one scale down.
Partition the space, query the partition, never scan the set. Picking, isolating,
neighbour queries, occupancy checks and culling all come from it.

## Architectural vocabulary

`CHARACTER_SETS` already carries exactly the four eras wanted, matched across
`buildings.js` and the facade atlas:

| in code | meaning |
|---|---|
| `heritage` | Georgian, Parisian |
| `interwar` | Art Deco, 1900–1930 |
| `postwar` | 1950–1980 |
| `contemporary` | modern, sculptural, greenery and water integrated |

**1980–2000 is excluded by construction** — it is the gap between `postwar` and
`contemporary` and nothing generates it. The vocabulary is right. What needs
depth is `contemporary`: planting, water, and the sculptural language the kit's
landmarks already speak (hyperboloid, helix, wave, diagrid).

## Phases

Each has a gate watched red before it is trusted. No phase starts before the
previous gate is green.

### B1 — the land
New landmass definitions in `terrain.js`. Archipelago, ~65% water, mainland,
downtown island, graded island sizes, range pushed back.
*Gate:* water fraction and dry-land area asserted against the stated targets.

### B2 — the generator
New file. Emits board pieces, not plot rectangles. Origin-stable and
grid-aligned **by construction**, not by later assertion.
*Gates:* `originStability` passes as a real assertion, not a todo. Grid
round-trip asserted. **Coverage measured inside settlement boundaries** — the
number nobody has ever measured, and the reason 3.82% went unnoticed.

### B3 — the render path
Draws board pieces. The old renderer is quarantined when this is green.
*Gate:* fails if the render path reads anything but the board.

### B4 — the kits wire by construction
Roads from `roadkit`. Buildings from the kit. Trees from `propModel`. Props from
the manifest. Not integration — the only way a piece can exist.
*Gate:* the dead-export check. Watched red: it must list `propModel` today.

### B5 — the visual pass
Judged by eye against the reference shots: junctions visible, buildings sitting
on ground, trees varied, ground not bare, islands reading as paradise.

### B6 — the interface
Mobile first — the world fills the screen, landscape works, the prompt box is
findable, touch works. Then middle-mouse pan, the inspector clearing the nav, the
navigation widget.

## Standing gates

1. **Dead exports** — nothing built and left unwired without a written reason.
2. **Generated claims** — one command regenerates, one gate names every stale one.
3. **Origin stability** — a passing assertion, never a todo.
4. **Grid alignment** — asserted, not printed.
5. **No world state outside the board.**
6. **The renderer reads only the board.**
7. **Coverage inside settlements** — 20–40%, the number that was never measured.

## How the work is done

`docs/BUILD-LOOP.md`, literally, by number, for every item. Step 2 — plan in
writing and stop for review — is mandatory and is the step my briefs have been
letting lanes skip. Step 6 — mutate and prove CAUGHT — is the one that has earned
its place most.

`docs/UMAA-CALIPER.md` is **canonical** for the audit: Phase 0 grounding, Step 0's
external anchor, the six triggers, and the rule that an audit records which
trigger fired. `docs/AUDIT-PROTOCOL.md` keeps the failure-pattern catalogue
(A–F) and defers to UMAA on the benchmark rule — that rule currently appears in
both, which is two sources of truth with nothing binding them, failure pattern B,
written into the documents about failure patterns.

Cross-model review where quota allows; otherwise cross-**lane** review. The
property that makes it work is a reviewer with no memory of the intent, not a
different vendor.

## The stack

Unchanged, deliberately. Three.js, vanilla ES modules, TypeScript on Cloudflare
Workers, Durable Objects, KV, Vectorize, Workers AI, the Node test runner, vitest
and Playwright. All free, all vendored, and every component being kept is written
against them. A framework migration would mean rewriting the parts this plan
exists to preserve, to fix a fault that was never technological.

---

## PART 7 — the ledger

One line per step, ticked with the command that proves it. `docs/BUILD-LOOP.md`
Step 9. `[x]` done with evidence, `[!]` blocked with a reason, unticked = not
started.

### B1 — the land

- [x] **B1 step A — break terrain.js's dependency on city-plan.js for
      LANDMASSES.** `landmassPolygonsDesign`/`LANDMASSES`/the spline helpers
      moved into `terrain.js`, copied verbatim (not yet redesigned).
      city-plan.js keeps its own copy for now (city-render.js and other
      not-yet-rebuilt consumers still read it; not touched this pass).
      Evidence: `node test/run.mjs test/terrainLandmassOwnership.test.ts`
      (3/3 pass, byte-identical polygon output proven, not assumed) and
      `node test/run.mjs test/worldSeed.test.ts` (the plan-specific guard —
      the default world's sha256 fingerprint is unchanged:
      `418744f1faeee0c396a8902117d89a67a6f4fb43f3dfadfe71509f991bf24e96`).
      All three mutations in this step watched red then reverted (import
      re-added, export removed, one coordinate corrupted).
- [x] **B1 step A.5 — the island-name reference check Mark asked for**,
      before finalising the name-to-character mapping. `grep`, each of the
      nine names, across `public/`, `src/`, `test/`, `docs/`, outside the
      landmass table. Real hits, not the landmass table itself:
        - `public/waterways.js` (**this pass's own routing**) — three canals
          keyed by name and positionally coupled to the current island
          shapes: `canal-kingsley`, `canal-fairlight`, `canal-cormorant`.
          Step B must re-derive or re-check these canals' coordinates
          against the NEW shapes, not just leave the old numbers standing
          under a name that still resolves.
        - `public/city-live-world.js` (not this pass's routing) — a
          hardcoded quest/spawn anchor keyed to `"cormorant-isle"`'s current
          centroid. Will need its own update once B1's redesign moves that
          centroid; named here so it is not silently missed at the B2/B3
          boundary, not fixed now (out of this pass's routing).
        - `public/ground.js` (routing unclear — not named in either list) —
          a comment citing `canal-cormorant` as "the narrowest water in the
          world," a claim about a specific number that will need
          re-measuring once the canal moves.
        - `docs/VISUAL-BUILD-PLAN.md` — planning prose, low risk, not code.
        - `src/citySummary.generated.ts` — regenerates from the real world;
          self-corrects, not a dependency.
      "gull" and "barrier" false-positived on unrelated substrings
      ("gully", "barrier" in road-network/roadkit's own generic vocabulary)
      once checked directly — not real references to the islands by those
      names outside the landmass table itself.
      **Conclusion: reusing the names is still correct** — nothing above
      breaks from the NAME staying the same; everything above breaks (or
      needs re-checking) from the SHAPE moving, which step B does regardless
      of naming. Evidence: the grep commands and their output, this entry.
- [x] **B1 step B — author the new archipelago shapes.** `LAND_SCALE`
      (`public/terrain.js`) defaults to 1.0, authored at target areas, not
      derived by scaling today's map down, per Mark's correction 1. Mainland
      west / archipelago east+south / downtown east-central — orientation
      unchanged, per Mark's review. Every non-downtown, non-mainland
      landmass is procedurally generated (`organicIsland`, hashed per-id
      jitter, radially area-corrected against its own real measured area —
      not an estimate) because none of them has a hand-drawn reference to
      trace, unlike today's islands; downtown keeps Mark's own COAST_DESIGN
      pen strokes, scaled around its own centroid to its new target.
      Mainland's own coastline is likewise procedural
      (`organicCoastlineDesign`), with `MAINLAND_ZONES` stating, as data,
      what each depth band from the coast inland IS (coastal-strip 12%
      settleable / farmland 55% / range 33%, summing to 1, asserted) — Mark's
      correction 3 ("every large empty area gets an identity"), and
      `RANGE_SPINE` repositioned to run behind the new mainland's own west
      edge rather than the old embayment's north arm.
      **DEVIATION FROM THE STEP A.5 PLAN, NAMED HONESTLY:** the nine old
      island names (fairlight/kingsley/cormorant/westbay/bayview/heron/
      redcliff/gull/barrier) were NOT reused. The redesign's own island
      count (15 named + 22 procedural skerries, of which 16 survive the
      mainland-exclusion filter) doesn't map cleanly 1:1 onto the old eight,
      and under this session's time pressure the fifteen new islands were
      named for their CHARACTER instead (suburb-isle, resort-isle,
      highland-isle, wooded-isle-a/b/c, fishing-isle, farm-isle,
      vineyard-isle, quarry-isle, cottage-isle-1/2/3, sandbar,
      lighthouse-rock). This was a real choice, not an oversight, but it was
      not the choice step A.5 said would be made, and step A.5's own
      downstream consequence — re-deriving `public/waterways.js`'s three
      named canals (canal-kingsley/canal-fairlight/canal-cormorant) against
      the new shapes — was **NOT done**; those canals still point at the OLD
      island positions, and test/ground.test.ts's two river/canal tests fail
      as a direct, measured consequence (see the blast-radius catalogue
      below). **Open, not fixed**: either remap old names onto a subset of
      the new islands for continuity, or re-author waterways.js's three
      canals against the new geometry — a real gap this pass shipped anyway,
      not a city-plan.js consequence, distinct from the catalogue below.
- [x] **B1 gate — GREEN, mutation-tested (`test/landCoverage.test.ts`, 9
      tests, `scripts/measure-land.mjs`).** Measured against the real height
      field (sampled 100 m grid over WORLD.SIZE, same instrument validated
      against today's own cited 391.9 km²/42% before trusting it — see step
      A's own verification): **68.2% water** (target ~65% — on the wet
      side, deliberately left there pending Mark's own eye, the knob exists
      for exactly this), **215.2 km² dry land** (down from 393.2 km²
      measured against the pre-redesign world), **32 islands** (up from 10
      — Mark's correction 1, "spend the headroom on more islands, not
      bigger ones," landing exactly as intended), **largest 22.04 km²
      (downtown, confirmed the largest)**, **smallest 0.08 km² (a rock)**,
      mainland's real in-world-bounds contribution **~108.9 km²** against
      its own stated 110 km² target, settleable fraction **0.12**, capped
      well under the 0.2 Mark's correction 2 asked for. Watched red first,
      twice, against the git history rather than memory: the test FILE
      refused to build against the committed step-A world (`MAINLAND_ZONES`
      does not exist there), and `scripts/measure-land.mjs` run standalone
      against that same world measured 41.8%/393.2 km²/10 islands — outside
      every band on every axis. Three real mutations watched red and
      reverted (`test/mutations.json`): SKERRY_COUNT to 0 (island-count gate
      catches it), the coastal-strip fraction raised to 0.45 (settleable-
      fraction cap catches it), and the ownership-list transformation below.
      **The plan-specific world-hash guard (docs/BUILD-LOOP.md Step 8,
      `test/worldSeed.test.ts`) was deliberately re-pinned**, not left red:
      the terrain moved on purpose. `docs/BUILD-LOOP.md` itself no longer
      quotes the hash directly (found stale the moment this redesign
      changed it — a data value duplicated into a process document, the
      same failure pattern this project's own docs name elsewhere) —
      re-pointed to read the live constant in `test/worldSeed.test.ts`
      instead.
      **`test/terrainLandmassOwnership.test.ts`'s byte-identity check was
      TRANSFORMED, not deleted, per Mark's explicit instruction** ("the
      property you actually want was never 'the two copies agree', it was
      'there is one source of truth'"): it now names the EXACT, current set
      of files still statically importing LANDMASSES/landmassPolygonsDesign
      from city-plan.js directly (public/road-network.js,
      scripts/_render-arterial-data.mjs, and four test files — plus
      scripts/gen-mainland.mjs's own dynamic import, checked separately,
      since a static regex cannot safely resolve a runtime-built import
      path) — a tripwire, not yet an empty-list assertion, since emptying
      that list is B2/B3's job. `npx tsc --noEmit` clean throughout.

## MAJOR FINDING — city-plan.js's own world generation is now incoherent
against the new terrain, exactly as the plan's own phase order predicts

Not a defect in this pass's own work — recorded as evidence, per Mark's own
instruction, not as damage. `city-plan.js`'s `generateWorld()` is untouched
(outside this pass's routing; it is replaced, not repaired, in B2) and still
lays plots out against its own old `COAST`/`LANDMASSES`. That geometry no
longer corresponds to where land actually is in the new height field.
Measured directly: **43,412 plots** (up from 17,586), **440 roads** (down
from 1,402/1,357).

**Blast-radius run**: the 30 test files that depend on `generateWorld`/
`LandField` (`NODE_OPTIONS=--max-old-space-size=2560 node test/run.mjs
<files>`, host memory checked first per this session's standing rule) —
**286 tests, 248 pass, 37 fail, 1 todo** (originStability, unaffected,
working as designed). Catalogue, not fixes, per Mark's own instruction:

**NOT an old-world pin — real findings, this pass's own gaps (3 tests):**
- `test/worldAliasing.test.ts` "two worlds with DIFFERENT seeds share only
  the declared allow-list": 442 objects now aliased across differently-
  seeded worlds. Plausible cause, not yet root-caused precisely: the new
  `MAINLAND_ZONES` field is a frozen, module-level, shared-by-reference
  table attached to the mainland's LANDMASSES entry, the same sharing
  pattern the rest of LANDMASSES already has and is already allow-listed
  for — `zones` itself is very likely simply missing from
  `allowedShared()`, not yet added.
- `test/ground.test.ts` "a river has a level surface, a sloping bed, and
  dry banks" and "a river's surface is its own, not the sea's": the
  DEVIATION named above — waterways.js's canals were not re-derived against
  the new island shapes.

**Old-world pins / cascading consequences of city-plan.js's unmodified
geometry (34 tests):** `test/cityConnectivity.test.ts` (2),
`test/cityJoin.test.ts` (3), `test/cityWorld.test.ts` (18),
`test/connectivityBridges.test.ts` (2), `test/ground.test.ts` (2, the
road-standing-on-a-slope pair, distinct from the river pair above),
`test/instanceGroups.test.ts` (1), `test/layout.test.ts` (1),
`test/planSeed.test.ts` (1), `test/roadNetwork.test.ts` (1),
`test/umaaFindings.test.ts` (1) — all trace to the same root cause: plots,
bridges, settlements, and the airport/railway/port sites are still placed
against the old geometry. Headline: **72.1% of plots fall in water**; no
airport, railway or port site resolves at all. Every one of these is a
correctly-red pin describing a world that no longer exists, not a defect to
chase — re-pinning is B2's job, once the new generator makes the world
coherent again, so it happens once rather than twice.

## B2.0 — the two self-identified gaps, closed before the generator

Both of B1's own open gaps (named above, not city-plan.js's) closed, red
first, on `b1-land`:

**Gap 1 — waterways.js's seven waterways re-derived against the real B1
archipelago**, not just the three named canals: the four mainland rivers
(river-west/mid/east/far-e) were ALSO authored against the old mainland
geometry and were self-identified as broken beyond Mark's own brief (a
point-in-polygon check showed them running through open sea). All seven
repositioned; every point verified inside its real target landmass's own
generated polygon (point-in-polygon), not assumed. Three canals renamed to
the B1 islands they now actually run through (canal-suburb/resort/vineyard —
kingsley/fairlight/cormorant no longer exist). River mouths' x is the real
generated mainland coastline's own x at that river's z (sampled from the
polygon, since the coastline is organic, not a hand-picked constant — three
of four rivers failed with a fixed constant, found by trying it and watching
it fail). `river-mid` alone took eight iterations against
`test/ground.test.ts`'s real-world cross-section test (walks +X from the
channel's own midpoint, asserts depth falls monotonically to a dry bank):
the first seven, at world z −2800, all sloped the wrong way in +X no matter
what x was tried at that same z — chasing "the least-bad x at that z" was
the wrong axis of freedom. Fixed by sweeping BOTH x and z with a clean
`heightAt` grid (off the cut-radius of every other waterway) for a spot
where elevation rises monotonically over +X; world z −4500, x −9200 does,
by 14.9 m over 100 m — verified against the actual test logic, and inside
the real mainland polygon, before being written down. `test/ground.test.ts`
and `test/waterwayGround.test.ts` both green on every waterway-specific
test; the two remaining failures in that file (a thing standing on a
road-defined slope) are the already-catalogued road-network.js old-world
pins, untouched by this gap.

**Gap 2 — `test/worldAliasing.test.ts`'s allow-list extended to
`public/terrain.js`'s own `LANDMASSES`**: root-caused, not just guessed.
`public/terrain.js`'s `LANDMASSES` was module-private; every `LandField`'s
`.masses` comes from `landmassPolygonsDesign()`'s `{ ...lm, polygon }`,
which shares each mass's `.points` (and, for the mainland entry, `.zones` —
`MAINLAND_ZONES` itself) by reference across every seed, same category as
the WORLD/HIGHWAYS entries already on the list — but the test only ever
imported the OLD `LANDMASSES` from `city-plan.js`, which no `LandField` has
read since Step A. Fixed: `LANDMASSES` exported from `terrain.js`; the test
imports it alongside `MAINLAND_ZONES` and adds both to `allowedShared()`
with the same reasoning already applied to the city-plan.js entries.

**Mutation-tested, both gaps** (`test/mutations.json`:
`b2-0-worldaliasing-terrain-landmasses-on-allowlist`,
`b2-0-worldaliasing-mainland-zones-on-allowlist`) — verified by hand: gutting
the new `TERRAIN_LANDMASSES` allow-list entry turned the different-seed test
red (438 unexplained shared objects, first one `array(22)`); separately
removing only the `MAINLAND_ZONES` entry (leaving `.points` allowed) also
turned it red on its own (4 unexplained, `array(3)` — proving `.zones` is a
genuinely distinct reachable field, not already covered by `.points`).
Both reverted, reconfirmed green. `npx tsc --noEmit` clean throughout.

**A THIRD thing moved as a direct consequence, caught by re-running the full
targeted set, not assumed unaffected**: `test/worldSeed.test.ts`'s own
`PRE_SEED` fingerprint hash. Waterways are cut into the height field
(`waterwayCut`), so repositioning all seven in gap 1 moved the ground under
that guard too — re-pinned a second time, same deliberate-redesign exception
already claimed for B1 step B, not a second one invented for convenience.

## B2.1 — the generator's contract. PLAN, NOT YET IMPLEMENTED. STOP FOR REVIEW.

BUILD-LOOP.md Step 2, mandatory. Nothing below is built yet.

### What already exists, that this brief's own wording could be read past

Read directly before writing this, because the brief's "New file. Emits
board pieces" describes B2's *task*, not a blank slate — `board.js` (388
lines), `board-adapter.js` (273 lines) and `board-region.js` (41 lines)
already exist, from an earlier phase (`BOARD-CONVERSION-PLAN.md` P1–P4,
predating this rebuild plan). **B2 does not invent the piece record.**
`board.js` already defines it, already validates it (`assertValidPiece`),
already does placement (`place`/`canPlace`/`replace`/`move`/`remove`) against
`world-registry.js`'s real reservation store, with real ground/space/
stacking checks (`standsOn`, `surface`, `k`-level stacking). That machinery
is exactly what "carried across as components" (this doc's own §"What dies,
what lives") already names for `board.js`. **B2's actual job is narrower and
more specific than "build the board machinery": generate the real pieces —
roads, plots, buildings, at real density, on the real B1 archipelago — and
call `board.js`'s existing `place()` with them, directly, procedurally, no
adapter in between.**

**RESOLVED, Mark, 2026-09-08** (see this doc's own §"What dies, what
lives" for the ruling in full): `board-adapter.js` converts `city-plan.js`'s
`generateWorld()` OLD output (plots/roads/bridges, continuous-float
positions) into board pieces — its own header says exactly this, and it
`import`s `ROADS` from `city-plan.js` directly. It dies with `city-plan.js`,
but on a delay: it is imported live today by `world-render-3d.js`
(`boardPiecesById`, P4.1's picking path), so it is quarantined only AFTER
B2 supplies real pieces of its own, not before — quarantining it early
would break live selection. `board-region.js` (P4.3/P4.4's
`isolate.js`/`move-piece.js`) imports only from `board.js`, has no
generator dependency at all, and lives — it reads whatever piece map it is
handed, and once that map is B2's real pieces instead of
`board-adapter.js`'s, it needs no change of its own.

### What B2 emits

Real `board.js` pieces (`{ id, pieceType, cell: {i,j,k}, rotation,
foot: {w,d}, levels, clear: {w,d}, standsOn, surface }`), placed by calling
the existing `createBoard().place()` directly — no intermediate plot/road
data structure that a later step converts. `pieceType` values: `road`
(carriageway segments + junction pieces), `plot` (an unbuilt, reserved lot —
kept, matching `board-adapter.js`'s own "an unbuilt plot still gets its own
piece" reasoning), `building` (one piece per building, `standsOn: ["plot"]`
is wrong per `board.js`'s own land-use vocabulary — real value is whichever
of water/beach/cliff/steep/reserved/buildable the plot's own ground
resolves to), `bridge`. Trees/props are explicitly OUT of B2's scope — this
doc's own phase table gives them to B4 (kit wiring) and P3.2 named the same
gap already; B2 does not invent instance data for a system that has no real
placed-piece precedent yet.

### Settlement boundaries and density follow each island's B1 character, not uniform-then-filtered

B1's own `LANDMASSES` (`public/terrain.js`) already carries a `kind` per
landmass — `mainland`, `city` (downtown), `suburb`, `resort`, `highland`,
`wooded` (×3), `fishing`, `farm`, `vineyard`, `quarry`, `cottage` (×3),
`sandbar`, `rock`, `skerry` — B1's own "honest reasons for density" as data,
already sitting there unused by any generator. B2.1's rule: **`kind` decides
whether an island is settled at all, and if so, at what density and which
`CHARACTER_SETS` era**, decided once, per island, before any road or plot is
laid — not a uniform grid generated everywhere and then thinned:

| `kind` | settled? | density | era (`CHARACTER_SETS`) |
|---|---|---|---|
| `city` (downtown) | yes, whole island | highest | `contemporary` + `heritage` mixed, the skyline |
| `suburb` | yes, whole island | medium-high | `postwar` + `contemporary` |
| `resort` | yes, whole island | medium | `contemporary` |
| `highland` | yes, partial (the brief's own "mountain-and-cliff") | low, cliffside estates | `heritage` + `interwar` |
| `fishing`/`farm`/`vineyard`/`quarry` | yes, one small working cluster | very low | `interwar` + `heritage` |
| `wooded` | no | — | — |
| `cottage` | yes, exactly one building | one house | `heritage` |
| `sandbar`/`rock`/`skerry` | no | — | — |
| `mainland` | yes, `coastal-strip` zone ONLY (12% of the mainland, per `MAINLAND_ZONES` — `farmland`/`range`, 88%, explicitly `settleable: false`) | low-medium, coastal | mixed |

For each settled island (or the mainland's `coastal-strip` band), B2
computes an explicit **settlement boundary** — a polygon inset from the
landmass's own real coastline (`landmassPolygonsDesign()`), not a bounding
box — before laying anything inside it. B2.2 owns the exact coverage
fraction (20–40% INSIDE the boundary) and total-settled-area target
(20–40 km²); B2.1 only commits to boundaries existing and being derived
from each island's own real generated shape, per landmass, so a suburb's
boundary cannot leak onto a neighbouring wooded island's ground.

### Roads, with real junctions

Per settled boundary: a deterministic block subdivision (a street grid
scaled to the island's own extent, block size a function of density tier —
tighter blocks for `city`/`suburb`, looser for `resort`/`highland`), where
**road centrelines and their crossings are computed as an explicit graph
first** (nodes = junctions, edges = carriageway spans between them), and
pieces are emitted FROM that graph: one `road` piece per edge span, one
`road` piece per junction node (a distinct piece, not an implicit
overlap of two crossing spans — matching `board.js`'s own "two pieces
cannot occupy the same ground" rule, which an implicit crossing would
violate). This is the concrete design choice this contract is asking Mark
to confirm before 17,000 buildings' worth of infrastructure gets built on
it — a simpler shape than a full road-network solver, chosen because it is
verifiable by construction (the graph IS the junction list; there is no
separate "did two segments cross" detection to get wrong later, the class
of bug `road-network.js`'s own history already has entries for).

### Grid alignment BY CONSTRUCTION, not by later assertion

The 43% placed-building drop from a prior snapping attempt (named in Mark's
own brief) was snapping CONTINUOUS float coordinates to the grid AFTER a
layout algorithm had already chosen them, in `board-adapter.js`'s own
style — the same defect `test/boardAdapter.test.ts` already measures
(305/17,586). B2's rule: **every position B2's own layout math produces is
already an integer atom index (`grid.js`'s `atomOf`/`i,j`), from the first
line of the block-subdivision algorithm, not a float later converted.**
World metres (`atomOrigin`/`atomCentre`) are computed FROM `(i, j)` only
when B2 needs to sample real terrain (`heightAt`, `classifyAt`) — never the
reverse. There is nothing to snap because nothing is ever produced off-grid.

### Origin stability BY CONSTRUCTION, not by later assertion

Root cause, read directly from `test/originStability.test.ts`'s own
comments, not assumed: `city-plan.js`'s `GRID.ORIGIN_X`/`ORIGIN_Z` are
`ISLAND.xMin`/`zMin` — an origin DERIVED from a landform extent, which
moves whenever `WORLD_SCALE` (and therefore the landform) does. `grid.js`'s
own `atomOf(x, z) = { i: floor(x/ATOM), j: floor(z/ATOM) }` has **zero**
dependency on `WORLD.SIZE` or any landmass bound — world `(0, 0)` is always
atom `(0, 0)`, however large the world grows. B2's rule: **never derive a
coordinate origin, offset, or anchor from island/mainland bounds, `WORLD.SIZE`,
or any landform extent — call `atomOf`/`atomOrigin`/`atomCentre` on absolute
world metres exclusively, for every piece, every road span, every junction.**
This is not new machinery B2 has to build; it is not repeating
`city-plan.js`'s one mistake. If honoured, `test/originStability.test.ts`'s
own assertion (today `todo`, a known-red report) should be able to move to a
real, passing assertion in B2.3 for B2's OWN pieces, and briefly
reintroducing an `ISLAND.xMin`-style offset is the mutation that proves it
still can fail.

### What B2.1 is explicitly NOT deciding (later steps' own scope, named so it is not silently assumed here)

- The exact coverage fraction and settled-area math — B2.2.
- Moving `originStability`/grid-round-trip from report to assertion, and the
  "no world state outside the board" check — B2.3.
- Re-pinning the 34 old-world-pin test failures — B2.4, last, not first.
- ~~Whether `board-adapter.js`/`board-region.js` are quarantined alongside
  `city-plan.js` or kept for some transition window~~ — **RESOLVED, Mark,
  2026-09-08, see "what dies, what lives" above**: they split.
  `board-region.js` lives (a `board.js` utility, no generator dependency).
  `board-adapter.js` dies, but only after B2 supplies real pieces of its
  own — it is imported live by `world-render-3d.js`'s picking path today.
- Whether `world.js`'s `.plan` field is replaced outright by B2's board, or
  a new `.board` field is added alongside it until B3 (the render path)
  is ready to read only the board — this contract assumes the latter (add
  `.board`, leave `.plan` alone until B3 flips the read side), since B3 is
  a separate, later gate ("fails if the render path reads anything but the
  board") and a big-bang cutover of `.plan` itself is not asked for by this
  brief. **Flagged for Mark's confirmation, not assumed silently.**

**STOP HERE.** Nothing above is implemented. Waiting for Mark's review
before Step 3 (test-first) starts.

## B2.2/B2.3 — implemented and gated. `public/board-generator.js`, `test/boardGenerator.test.ts`

APPROVED 2026-09-08 (Mark): board-adapter.js/board-region.js ruled on
directly (see "what dies, what lives" above); both B2.1 mechanisms
approved on the "construct what you want, do not filter for it and hope"
ground (docs/AUDIT-PROTOCOL.md's own new entry on that principle).

**WATCHED RED FIRST**: `test/boardGenerator.test.ts` and the new
`test/originStability.test.ts` case were written and run against a
nonexistent `public/board-generator.js` -- both refused to build ("Cannot
find module"), the same standing rule `test/landCoverage.test.ts` already
used.

**WHAT WAS BUILT**: `SETTLEMENT_TABLE`, a table keyed by
`terrain.js`'s own `LANDMASSES.kind` -- settled/density/era/boundary
size/block size/plot size/levels, decided once per island, before any road
or plot is laid. Settlement boundaries are a real inset of each island's
own generated coastline (`islandBoundary`, area ~ k²) or, for the mainland,
a strip along the real coastline at `MAINLAND_ZONES`' own coastal-strip
depth (`mainlandBoundary`). Roads are an explicit junction graph
(`junctionGraph`): nodes are atom-aligned grid intersections inside the
boundary on real, road-legal ground; edges are checked at their own
midpoint too; one road PIECE per node, one per edge span, non-overlapping
by construction (edges stop short of each junction's own footprint).
Blocks are subdivided into plots, each checked with `footprint.js`'s real
`assessFootprint` (real slope, real water, real waterway) before a building
piece is placed. Cottage islands bypass the whole road/block/plot
machinery -- one building at the island's own centroid, because it is a
cottage island, not because a road grid happened to leave one plot.

**MEASURED (default seed, `LandField(16)`, `public/board-generator.js`'s
own `generateBoard`)**:

- **16,193 buildings, 15,825 roads**, 32,018 pieces total.
- **Settled land: 28.2 km²** -- inside the 20-40 km² target
  (`docs/specs/BOARD-REBUILD-PLAN.md`'s own §"Why").
- **Coverage inside each settlement boundary: 24.0-39.0%** across every
  settled, non-`oneHouse` boundary (mainland 28.6%, downtown 37.2%,
  suburb 39.0%, resort 38.5%, highland 37.6%, fishing 24.0%, farm 37.2%,
  vineyard 36.2%, quarry 25.8%) -- inside the 20-40% target on every one,
  not merely on average. Cottage islands excluded from this gate on
  purpose: one house on a whole island is a design decision (`oneHouse`),
  not a density outcome, and the percentage does not describe it -- their
  own gate ("exactly one building") is the right one.
- **Grid round-trip: 100%**, by construction -- every piece's `cell.i/j/k`
  is an integer atom index from the first line of the layout math, never a
  continuous position rounded afterward (contrast `test/boardAdapter.test.ts`'s
  own measured 305/17,586 for the OLD adapted plots).
- **originStability: a real, passing assertion, not a todo** -- see
  below.

**TWO REAL BUGS FOUND BY THE GATE ITSELF, NOT BY INSPECTION, EACH FIXED AND
RE-VERIFIED**:

1. **The mainland boundary was constructed from the WRONG END of its own
   polygon array.** `landmassPolygonsDesign()`'s own `if (signedArea2(polygon) > 0) polygon.reverse()`
   (a winding-direction fix applied to every landmass) can reverse the
   whole coastline+corners array; a first version of this file sliced the
   array's first N points expecting the coastline and got the four raw
   inland corners instead -- a ~0 km² self-intersecting "boundary" with a
   46,800 m bounding box that produced 100,717 road pieces against 21
   buildings before this was caught. Fixed by selecting the coastline by
   its own known coordinate range instead of array position.
2. **The mainland's inland offset ran the wrong direction, out to sea.**
   `MAINLAND_INLAND_XW` (-13000) is LESS than `MAINLAND_COAST_X0W` (-8000)
   in `terrain.js`'s own construction -- inland is -X, not +X. A first
   version offset +X and built a boundary that was 1,397 of 1,402 sampled
   points WATER, measured directly by the gate's own real-ground check, not
   assumed. Fixed by reversing the offset sign.

**BLOCK SIZING WAS ALSO TUNED AGAINST MEASURED COVERAGE, NOT GUESSED**: an
early version picked `blockAtoms` close to `plotAtoms`, leaving almost no
room inside a block for even one plot (21 buildings against 100,717 roads).
Re-sized for 2-3 plots per block side; measured coverage then ran
38.5-46.5% (above the 20-40% band) at `CLEAR=2`; `CLEAR=3` (plus a small
nudge to `city`'s own `plotAtoms`, whose tier alone still ran 40.9%)
measured 24.0-39.0% -- inside the band on every settled boundary.

## originStability: a real, passing assertion for B2's own pieces

Also found by the gate, not assumed: a first version of this test compared
every PLACED PIECE between two `WORLD_SCALE` values and required zero to
move -- a stronger, and actually FALSE, claim. Measured directly:
`heightAt(-9244, -7972)` is 125.95 m at `WORLD_SCALE` 0.65 and 1,306.96 m
at 0.52. `WORLD_SCALE` reshapes the real terrain height field at a fixed
world position BY DESIGN (`world-scale.js`'s own header: the LAND shrinks,
not a camera zoom that leaves it identical) -- a road or building whose
placement depends on real slope cannot be expected to land the same way at
a different scale, and B2.1's contract never promised that; it promised no
coordinate ORIGIN is derived from landform bounds. The property that IS
true, and is what the contract actually promised: every settlement
BOUNDARY -- pure geometry, `atomOf`/`atomOrigin`, no `heightAt` dependency
at all -- is identical under both scales. `test/originStability.test.ts`'s
new case asserts this directly against `board-generator.js`'s own
`settlementBoundaries()`: **max vertex delta 0.000 m across all twelve
settled boundaries**, `WORLD_SCALE` 0.65 vs 0.52.

Finding it this cleanly it, `downtown` alone moved up to 328 m under the
FIRST version of this test, before the false-claim correction above --
root-caused, not patched around: every OTHER landmass positions itself from
a WORLD-space `cxWorld`/`czWorld` divided by `WORLD_SCALE` for its
design-space centre (`organicIsland`'s own pattern), which cancels out
exactly when multiplied back by `WORLD_SCALE` later, regardless of what
`WORLD_SCALE` is. `COAST_DESIGN` (downtown's hand-drawn outline) used its
own raw, uncompensated centroid instead -- a fix in `public/terrain.js`
itself (`DOWNTOWN_CX_WORLD`/`CZ_WORLD`, an explicit fixed world anchor,
computed once at this file's own default `WORLD_SCALE` so today's already-
gated 22 km²/6.67 km²-boundary result is byte-identical to before),
verified: downtown's own polygon area and first vertex are unchanged at the
default scale, and its own boundary now shows 0.000 m delta too.

## Still open, named rather than silently dropped

- **Performance**: `generateBoard()` measures ~100-110 s per call.
  `board.js`'s own `canPlace` checks EVERY foot cell of a placed piece
  individually (not a sample) -- correct, existing, tested behaviour this
  pass does not touch -- and a road span's foot (tens of metres by
  `ROAD_WIDTH`) can cost hundreds of `classifyAt` calls, each calling
  `slopeAt` for four more `heightAt` calls at distinct offsets that rarely
  repeat (a capped memoisation cache was tried; measured no material
  improvement, since most calls are genuinely unique -- kept anyway as a
  safety cap after an uncapped version hit V8's own ~16.7M-entry `Map`
  ceiling and crashed mid-run). NOT wired into `public/world.js`'s
  `createWorld()` because of this: every test calling `createWorld()`
  (dozens across the suite) would pay the cost. `.plan` is untouched, per
  B2.1's own stated assumption for exactly this case. A real, separate
  performance pass, not silently deferred.
- **Bridges connecting settled islands** (B2.1's own task list, item 4):
  not yet built. The brief's own "bridges AND BOATS" already allows some
  islands to be boat-only; which get a bridge is real, undone design work.
- **B2.4** (re-pinning the 34 old-world-pin failures): explicitly last,
  per Mark's own instruction, once the generator makes the world coherent
  end to end -- still not started, and should not be, until wiring and
  bridges land.

`npx tsc --noEmit` clean throughout. Full targeted regression
(`test/terrainLandmassOwnership`, `worldAliasing`, `landCoverage`,
`worldSeed`, `boardGenerator`, `originStability`, `ground`,
`waterwayGround`): 65 tests, 63 pass, 2 fail -- both the already-catalogued
`road-network.js` old-world pins, untouched by this pass.

## B2–B6

B2 (the generator) starts next, on this same branch (`b1-land`) — not
`main`. **main stays green, deployable and truthful while the rebuild is in
flight** (Mark's own instruction, given after this session found the
city-plan.js incoherence above): a world with new land and an old generator
is not a state anyone should be able to deploy by accident. B1 and B2 merge
to main together, as one coherent world, when B2's own gate is green.
