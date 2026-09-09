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

## B2.5 — the 100 seconds. Profiled first, per Mark's own instruction not to optimise on his hypothesis

Mark, 2026-09-08: "Ground it before fixing: profile and report WHERE the
time goes... do not optimise on my hypothesis. If the road spans are not
the cost, that is a finding and my paragraph above is wrong."

**MEASURED, `public/board-generator.js`'s own `.stats`, default seed:**

| phase | ms | share |
|---|---|---|
| road span placement | 39,406 | 35% |
| **building placement** | **66,679** | **60%** |
| road junction-node placement | 3,882 | 3.5% |
| assessFootprint pre-check | 704 | 0.6% |
| boundary + junction-graph construction | 197 | 0.2% |
| **total** | **111,022** | |

`heightAt` called 77,105,992 times (1,293,394 cache hits). **The
hypothesis was half right**: road spans are a real, substantial cost
(35%), exactly the mechanism Mark named -- but building placement is
LARGER (60%), even though each building footprint (~150-300 cells) is far
smaller than a road span (up to ~700 cells), because there are far more
of them and `board.js`'s exhaustive per-cell check runs identically for
both. A naive memoisation cache does not help either: measured directly,
tracking every queried `(x, z)` pair, unique coordinates alone exceeded
16.7M (a `Set` hit the same V8 ceiling the earlier cache did) against
77.1M total calls -- most calls are for genuinely distinct points, so
there is little redundancy to cache away.

**THE FIX, in order of Mark's own three directions:**

1. `public/board.js` gained one additive, opt-in option:
   `canPlace`/`place(piece, { groundVerified: true })` skips the
   exhaustive per-foot-cell ground loop, trusting a caller that has
   already verified ground by a different, proven-equivalent method.
   Default `false` -- every existing caller is unaffected; `board.test.ts`
   and `boardAdapter.test.ts` (27 + tests) pass unchanged, none of them
   pass the new option. SPACE (occupancy) is NEVER skipped, only ever the
   GROUND half of the check.
2. `public/board-generator.js` gained `sampledGroundOk()`: the FULL
   PERIMETER of a foot rectangle at native (1-atom) resolution, plus a
   stride-spaced interior grid -- not every interior cell. The perimeter
   is never sampled: a cliff or water edge cutting through a footprint is
   a connected boundary, and a convex rectangle's own edge is where such a
   boundary is caught with certainty; only a feature small enough to sit
   entirely inside the interior, between stride points, could be missed.
3. **Proven equivalent BEFORE being adopted, per Mark's own explicit
   requirement**: `generateBoard(..., { verifySampling: true })` runs
   BOTH checks for every real road-span and building candidate this
   generator actually produces and records agreement. Measured on the
   real archipelago: **100% agreement, zero disagreements in either
   direction, across 11,538 road candidates and 39,118 building
   candidates (50,656 total), at both stride 3 and stride 5.** Only then
   was `useSampling: true` adopted for production use.

**MUTATION-TESTED, both controls**: removing `board.js`'s `groundVerified`
guard (so the exhaustive loop always runs) made timing regress to ~167.6 s
-- invisible to every correctness test (`board.test.ts` stayed green,
since none of its own tests pass the option), caught only by timing,
which is why it is measured, not assumed. Removing `sampledGroundOk`'s
own i-edge perimeter scan produced a REAL disagreement: 1 of 39,118
building candidates went from agreeing to a dangerous mismatch (sampled
approved, exhaustive would refuse) -- proof the full perimeter is load-
bearing, not decoration. Both reverted, reconfirmed.

**MEASURED RESULT** (paired, same-process, controlling for this
development host's own memory-pressure noise -- see below): exhaustive
~111-113 s, sampled ~40-41 s. **A real, reproducible ~2.7x speedup**,
identical output (same 35,365 pieces, same coverage, same everything --
sampling changes HOW ground is verified, never WHAT gets built).

**THE CEILING, derived and sourced, not picked to pass** (Mark: "derive
it and say from what"): `wrangler.jsonc`'s own bindings (Durable Objects,
KV, Vectorize, Workers AI) require a paid Cloudflare Workers account,
whose documented default CPU-time limit for a single Worker invocation is
**30,000 ms** -- not overridden anywhere in this repo (no `limits.cpu_ms`
block exists). This is the harder, more directly relevant constraint
underneath "what a visitor will wait for": a request exceeding it is
killed by the platform outright, not merely abandoned slowly. A
visitor-patience number, if wanted instead, would have to be SMALLER, not
larger -- so 30 s is the outer bound either way.

**THIS GATE IS ASSERTED HONESTLY, AND IT IS RED.** `test/boardGenerator.test.ts`'s
new B2.5 case asserts `< 30,000 ms` against Cloudflare's own ceiling and
currently fails -- measured ~35-46 s on this development host (noise
discussed below), above the ceiling more often than not, even after the
~2.7x fix. **This is reported as a real, open finding, not hidden by
loosening the assertion.** The honest conclusion: this generator is not
yet fast enough to run synchronously inside one live request, and the
architecturally correct fix is what `public/world.js`'s own `LandField`
memoisation already does for the height field, for the same reason --
generate once per seed, persist, never regenerate live per visitor --
not a further round of micro-optimising the hot path in search of a
synchronous per-request budget this measurement suggests may not be
reachable there at all.

**MEASUREMENT NOISE, NAMED**: single standalone measurements on this
development host varied enormously for IDENTICAL code (35 s to 172 s
across separate process invocations), correlating with this host's own
documented low/fluctuating free memory (observed 3.2-3.7 GB throughout
this session, below the project's own 4 GB standing floor). A paired,
same-process comparison (baseline then sampled, twice each, one process)
was used instead to control for this and produced the consistent ~111 s
-> ~40 s figures above. Absolute single-run numbers on this host should
not be trusted in isolation; the ~2.7x ratio is the trustworthy result.

## B2.6 — persist the board. The architecture that makes any of it reachable

Approved 2026-09-08 (Mark): "The board is a pure function of the seed --
already a stated property, pinned by SHA-256. Recomputing a pure function
per visitor is doing work whose answer is already known." Same move as
`scripts/gen-city-summary.mjs` already makes for `generateWorld()`
("The city cannot be generated inside the Worker... it is DETERMINISTIC,
so it can be summarised once, here, and checked in") -- applied to the
real board this time, not a summary. B0.1's own origin-stability work
(B2.1/B2.3) is what makes this safe: a persisted board's coordinates stay
valid when the world grows, because they were never derived from landform
bounds in the first place. Persisting would have been unsafe before that.

**WHAT WAS BUILT:**

- `scripts/gen-board.mjs` -- the offline generation step. Calls
  `generateBoard(heightAt, DEFAULT_SEED, { useSampling: true })` (B2.5's
  proven-equivalent fast path) and writes `public/board.generated.json`.
  Not a Worker, not a request -- a build step, run by hand or CI, matching
  `gen-city-summary.mjs`'s own precedent exactly.
- `public/board-load.js` -- the load path. `loadBoard(payload, heightAt)`
  reconstructs a real `board.js` instance by replaying every persisted
  piece through `place(piece, { groundVerified: true })` (B2.5's own
  opt-in), paying only the SPACE check (measured well under a second for
  the whole board during generation itself) -- the ground question was
  already answered once, by the generation that produced this file, and is
  not re-asked. `fetchBoard(heightAt, url)` is the real client entry point:
  `fetch()` the static asset, parse, load.
- `npm run gen:board` -- one command, cannot drift from the seed it
  claims to represent (the script reads `noise.js`'s own `DEFAULT_SEED`,
  not a hand-typed number).

**SIZE MEASURED BEFORE THE TRANSPORT WAS CHOSEN, PER MARK'S OWN
INSTRUCTION**: 35,365 pieces serialise to **7,915,668 bytes raw,
263,598 bytes gzipped (3.3%)**. **Static asset, through the existing
`ASSETS` binding, chosen over KV**: `wrangler.jsonc`'s own `assets` block
already serves `public/` directly, with `"/"` and everything not
explicitly routed to the Worker going to the Asset Worker -- a static
`board.generated.json` there is served edge-cached, gzipped, with ZERO
Worker invocation at all, not even the 30 s CPU-time question applies.
263 KB gzipped loads fast on a phone; KV's ~25 MB per-value ceiling was
never the binding constraint, and KV would need a Worker route to serve
it (adding latency and putting the file back through a CPU-time-limited
request path for no reason a static asset does not already solve).

**GATE, WATCHED RED (`test/boardLoad.test.ts`):** the committed
`board.generated.json` is asserted byte-identical to a fresh
`generateBoard()` call (drift detection, the same discipline
`test/publicClaims.test.ts` already applies to the public page's own
numbers); `loadBoard()`'s own reconstructed board is asserted to answer
real queries (`whereIs`) identically to the fresh generation; and a THIRD
test deliberately corrupts one persisted piece's `cell.i` and asserts the
loaded board now DISAGREES with the fresh one -- the equivalence check
proven to have teeth, not just measured to currently pass. All three
green.

**THE RED CPU GATE KEPT, NOT DELETED, PER MARK'S OWN INSTRUCTION -- AND A
STRONGER ONE ADDED BESIDE IT**: B2.5's own timing assertion
(`generateBoard()` < 30,000 ms) is unchanged and still honestly red (this
session, ~35-291 s depending on this host's own memory pressure -- see
B2.5's own section). A new, second gate does not depend on a clock at
all: `test/boardGenerator.test.ts`'s new case reads `src/` (the Worker's
own live request-handling code -- `public/` is client-side and not
subject to Cloudflare's CPU-time limit at all, so out of scope for what
this specifically protects) and asserts NO file there imports
`generateBoard` from `board-generator.js`, by source, the same static
technique `terrainLandmassOwnership.test.ts` already uses. Mutation-tested
by hand: a scratch file importing `generateBoard` was added to `src/`,
confirmed caught by name, deleted (never committed). Mark's own words:
"a stronger gate than a time limit, and it cannot be satisfied by a
faster machine." Currently green -- `src/` has never called
`generateBoard` at all (B2.1's own decision not to wire it there).

**NOT DONE, ON PURPOSE, LEFT FOR B3**: wiring `public/world.js`'s
`createWorld()` (or the actual page bootstrap) to call `fetchBoard()`.
`world.js`'s only real consumer is `public/city-render.js`, explicitly
outside this pass's own routing (listed under "replaced outright" in this
doc's own "what dies, what lives") -- `createWorld()` is also a
SYNCHRONOUS API today, used by dozens of tests, and `fetchBoard()` is
inherently async (`fetch()`); changing that contract is a real design
decision for whoever builds B3's actual bootstrap, not something to guess
at here. What B2.6 delivers is the proven, tested, fast (~200 ms)
machinery B3 needs to make that decision from, not the decision itself.

## Still open, named rather than silently dropped

- **The 30 s ceiling is not yet met** by `generateBoard()` itself (B2.5) --
  now moot for the live path (B2.6 means nothing in `src/` ever calls it),
  but still real for the offline build step, and still asserted honestly.
- **`world.js`/the page bootstrap is not yet wired to `fetchBoard()`**
  (B2.6, above) -- real, undone integration work, B3's own job.
- **Bridges connecting settled islands** (B2.7, next): not yet built.
- **B2.4** (re-pinning the 34 old-world-pin failures): explicitly last,
  per Mark's own instruction, once the generator makes the world coherent
  end to end -- still not started, and should not be, until bridges land.

`npx tsc --noEmit` clean throughout. Full targeted regression
(`test/terrainLandmassOwnership`, `worldAliasing`, `landCoverage`,
`worldSeed`, `boardGenerator`, `originStability`, `ground`,
`waterwayGround`, `board`, `boardAdapter`, `boardLoad`): 97 tests, 93
pass, 3 fail, 1 todo -- 2 already-catalogued `road-network.js` old-world
pins, plus B2.5's own honest red; the 1 `todo` is `originStability`'s own
pre-existing, unchanged, deliberately-red city-plan.js finding (not
counted as a failure by `node:test` itself). 0 unexplained.

## B2.7 — bridges and boat routes. PLAN, NOT YET IMPLEMENTED. STOP FOR REVIEW.

BUILD-LOOP.md Step 2, mandatory. Written by the CLI lane, overnight,
2026-09-09, following `docs/briefs/OVERNIGHT-CLI-2026-09-09.md`'s
instruction to plan in writing and hand the plan to a blind reviewer before
any code changes. Nothing below is built yet.

**REVISED after a blind subagent review of the first draft, same night.**
The review found four real defects in that draft, all corrected below, not
patched over: (1) the draft's 9000 m "too far to bridge" threshold answers
"is this gap geographically plausible", not "can `roadkit.js` actually
build across it" — the real, already-measured, in-repo buildable ceiling
is **800 m single-span** (`public/road-network.js`'s own comment: "11 of
19 real bridges exceed it" in the OLD world), and reusing 9000 m was
reusing the answer to the wrong question. (2) the draft's `grep -rin
"boat\|ferry\|dock" public/` claim of "no hits" was false — the review
ran the same command and found real boat/dock-named kit entries in
`public/asset-registry.js` (`av-f1-amphibious-flying-boat`,
`mar-f1-floating-drydock`, etc.); corrected below. (3) `bridgeChain`
was mischaracterized as composing `bridgeAbutment`/`bridgePier`/
`bridgeDeckSpan` into real pieces — it does not; it returns a numeric
layout PLAN, and `scripts/verify-roadkit.mjs` says so directly. Only
`bridgeSpan` is exercised by any file under `test/`. (4) the boat
route's "route record… carried alongside the board's pieces, not inside
one" broke this document's own Standing Gate 5 ("no world state outside
the board"), unflagged. Corrected below by keeping the relationship as a
field on the dock piece itself, inside the board.

### What already exists, read directly before writing this

Two DIFFERENT mechanisms already carry the word "bridge" in this
repository, and B2.7 is neither of them unmodified:

1. **`scripts/gen-bridges.mjs`** (tracked, committed, `350d25e`) — a
   standalone generator, never imported by anything (`grep -rn
   "gen-bridges"` outside itself: no hits). It derives landmass-to-landmass
   crossings from the geometry itself: nearest-point gap between every pair
   of landmass polygons, a minimum spanning tree over those gaps so every
   mass is reachable, then a second pass adding redundant SHORT crossings
   (gap ≤ 3000 m, degree cap 5 per mass) "so the network is a grid rather
   than a chain hanging off one crossing." Gaps over **9000 m are skipped
   outright as "too far to bridge"** — a real, reasoned threshold already
   chosen for this exact problem, not one this plan needs to invent. Each
   chosen crossing is anchored by walking inland from the gap until the
   ground is dry (`heightAt >= 4.0`), road-legal
   (`landUse.roadAllowedAt(...).ok`), AND provably inside the polygon of
   the mass the bridge is FOR (not merely inside *some* dry mass — the
   file's own comment records a real defect this caught: a crossing
   between two islands that touched neither, both ends having wandered
   onto the mainland instead). Its output is a printed `BRIDGES` array
   (`{id, axis, x, a, b, type, class}`), meant to be hand-pasted into
   `city-plan.js` — it generates DATA for the old, straight-line world,
   not board pieces, and reads `plan.landmassPolygons`, the OLD
   generator's polygons, not `terrain.js`'s new `landmassPolygonsDesign()`.
   Also confirmed this revision: `buildBridgePieces` (same file, line
   1095) converts a `BRIDGES`-shaped entry into `{id, class, spanM,
   typology, model}` — `model` is `bridgeSpan`'s own raw socket-geometry
   result, NOT a `board.js` piece (`cell`/`foot`/`clear`/`levels`/
   `standsOn`/`surface` are absent). B2.7 can reuse this file's
   built/refused reporting SHAPE, but still has to write its own
   socket-result → board-piece conversion; nothing existing does that
   conversion today.
2. **`public/road-network.js`'s `buildConnectivityBridges`** (tested by
   `test/connectivityBridges.test.ts`, currently one of B2.8's old-world
   pins: "52 components, 38 stranded") — operates on an already-built ROAD
   graph, finding disconnected road components and stitching STUBS between
   them. This is the wrong shape for B2: B2's roads are built per
   settlement boundary, independently, from an explicit junction graph
   (`board-generator.js`'s own `junctionGraph`) — there is no single
   partially-connected road graph with dangling stubs to stitch, there are
   N wholly separate island road grids that were never told about each
   other. Reusing `buildConnectivityBridges` here would be Failure pattern
   E in the other direction: forcing a mechanism built for one shape
   (stub-stitching within one graph) onto a different shape (connecting N
   independent graphs) rather than adapting the mechanism that already
   fits (mechanism 1's landmass-gap approach).

**On "B2.8's old-world pins" and its count:** this document's own B2.0
catalogue above states "34 tests" for the old-world-pin set but its own
listed per-file breakdown there sums to 32, and does not include
`worldOccupancy`, `isolate`, or `supervisedGenerateScript` at all — both
counts are now stale. The overnight brief's fresh count, run and verified
against a real `node test/run.mjs` execution tonight (2026-09-09, 1,141
tests: 1,084 pass / 41 fail / 1 todo / 15 skipped), is **38** old-world
pins, itemised per file, plus 2 `mutationEvidence` failures and B2.5's
own honest-red gate (38 + 2 + 1 = 41, the real, current total). **38,
and the name B2.8** (matching `docs/OVERNIGHT-RUN.md`'s own checklist),
are what the rest of this section uses; the plan's own earlier "34"/"B2.4"
text is left as written above rather than silently edited to agree — the
same "correct the ledger, say so in the commit" rule `docs/BUILD-LOOP.md`
Step 1 states, not a retroactive rewrite of what B2.0 actually measured
at the time.

**REAL GAPS MEASURED, not carried over unmeasured** (this revision, using
`board-generator.js`'s own `settlementBoundaries()` against the actual B1
archipelago): nearest-point distance between every one of the 12 settled
boundaries' own polygons, all 66 pairs. **Only 1 of 66 pairs (suburb-isle
↔ cottage-isle-2, 358 m) falls inside the real, measured 800 m
single-span buildable ceiling.** 42 of 66 fall inside the OLD world's
9000 m "plausible" cutoff — a number that was never a buildability limit
to begin with, which is exactly why the old world's own bridge output
violated its own piece library's real ceiling 11 of 19 times (recorded
directly above, in `road-network.js`'s own comment). Reusing 9000 m here
would have repeated that exact defect one level up.

**B2.7's actual job, corrected: adapt mechanism 1's algorithm — nearest-gap,
MST over the 12 settled boundaries, a redundant-short-edge pass, the
dry-AND-correct-boundary anchor walk — to read B1's real
`landmassPolygonsDesign()` output and B2's real settled boundaries
(`settlementBoundaries()`), classify each resulting edge by the REAL
buildable ceiling (≤ 800 m: bridge; > 800 m: boat route), and EMIT REAL
`board.js` PIECES via `place()`, not a printed table for hand-pasting.**
The MST guarantees full reachability by construction regardless of how
any individual edge is classified — bridge-vs-boat is a rendering/
mechanism choice made AFTER the graph already connects everything, not a
precondition for connectivity. Given the real gap distribution above,
**boat routes will be the common case, not the exception** — the
opposite of the first draft's assumption, and worth stating plainly
rather than letting the "bridge" framing imply otherwise.

### What counts as "connected" for B2.7's purposes

Not every landmass — only the **12 settled boundaries**
`board-generator.js`'s `settlementBoundaries()` already produces
(mainland, downtown, suburb, resort, highland, fishing, farm, vineyard,
quarry, cottage×3). Wooded/sandbar/rock/skerry landmasses are
deliberately unsettled (B2.1's own `SETTLEMENT_TABLE`) and connecting them
would build infrastructure serving nobody — the same "construct what you
want" principle B2.1 was approved on, applied here: the node set for the
MST is the settled-boundary list, not every polygon in `LANDMASSES`.

### Bridge vs. boat: the real buildable ceiling, not the old "plausible" number

**Gaps ≤ 800 m between two settled boundaries: a bridge**, via
`bridgeSpan` (the one function this codebase actually tests end to end).
**Gaps > 800 m: a boat route.** 800 m is not invented for this plan — it
is `road-network.js`'s own already-measured single-piece ceiling, the
exact number that already told this project 11 of the OLD world's 19
bridges could not really be built the way they were declared. The
redundant-short-edge pass mechanism 1 also ran (originally ≤ 3000 m) is
re-thresholded to the same ≤ 800 m bridge-buildability limit here, for
the same reason: a "redundant" edge that cannot actually be built is not
redundancy, it is a second copy of the same defect.

### What B2.7 emits for a bridge

A **new `board.js` pieceType, `"bridge"`** (already named as a valid value
in B2.1's own contract above, never yet emitted by anything).
`board.js`'s own piece validation (`assertValidPiece`) does not enumerate
allowed `pieceType` strings — confirmed by reading `board.js` directly,
not assumed — so this needs no schema change, only a real caller.
Anchors are found the same way mechanism 1 already proves out: walk
inland from the gap's nearest points until the ground is dry, road-legal,
and inside the correct settled boundary's own polygon (not merely inside
*a* boundary) — mechanism 1's own dry-anchor bug (both ends landing on the
mainland) is exactly the failure this reused check already guards
against, so it is carried across, not re-derived from nothing. The deck
geometry comes from `public/roadkit.js`'s `bridgeSpan` **only** — the one
bridge function any test file actually exercises
(`test/bridgePieces.test.ts` → `buildBridgePieces`, both in
`public/road-network.js`). `bridgeChain` is NOT reused: it returns a
numeric layout PLAN of abutment/pier/span entries, not composed pieces
(`scripts/verify-roadkit.mjs`'s own comment: "`bridgeChain()` is excluded
— it returns a chain PLAN"), and `bridgeAbutment`/`bridgePier`/
`bridgeDeckSpan`/`bridgeApproachRamp`/`bridgeArch`/`bridgeCableStayed`
are exercised by no file under `test/` at all — reusing them here would
be building on an untested foundation while calling it "existing and
tested." Converting `bridgeSpan`'s own socket-geometry result
(world-metre positions) into a real board piece (`cell`/`foot` as
integer atoms) is new code B2.7 has to write — `buildBridgePieces` does
not do this conversion (checked directly: its own return shape carries
`spanM`/`typology`/`model`, no `cell` or `foot` at all) — but the
CONVERSION is the only new geometry code, not the span-building itself.

### What B2.7 emits for a boat route — kept deliberately minimal, and said so

**Correction from the first draft:** `grep -rin "boat\|ferry\|dock"
public/` does NOT return zero hits — `public/asset-registry.js` already
carries boat-and-dock-NAMED kit models (`av-f1-amphibious-flying-boat`,
`mar-f1-floating-drydock`, `mar-f1-floating-fuel-dock`, and others). These
are aviation/marine PROP models for the existing kit library, not transit
infrastructure, and none of them is wired to any board-placement or
route-generation logic — `grep` for a board piece, a route generator, or
a dock-as-infrastructure concept (as opposed to a dock-as-decorative-prop
kit entry) still returns nothing. The correct, narrower claim: no
GENERATION or CONNECTIVITY capability for boats/docks exists yet, but B3
or B4 should check this registry before modelling a boat from scratch,
because a real asset may already fit.

Kept to the smallest thing that is honestly useful, matching B2's own
precedent of separating "the real static data" (B2) from "render/animate
it" (B3): B2.7 emits, per boat-route pair, **two `board.js` pieces of a
new pieceType `"dock"`**, one per settled boundary. Unlike a bridge
anchor, a dock's own purpose is to sit AT the water's edge, not set back
from it — so the anchor walk for a dock is NOT identical to the bridge
case, despite the first draft's claim that it was: it starts at the
boundary's own nearest-shoreline point and walks the SHORTEST distance
inland needed to find ground that is dry, road-legal, and inside the
correct boundary (a walk bounded much tighter than a bridge anchor's,
since a dock that ends up far from the shore it is meant to serve has
failed its one job). **The route relationship lives ON the dock piece
itself, not beside the board**: `board.js`'s `assertValidPiece` (checked
directly, `public/board.js:72-97`) validates only the required fields
and does not reject extra ones, so each dock piece carries its own
`routeTo` field (the id of the dock piece at the other end) and a shared
`routeId` — inside the board, satisfying Standing Gate 5 ("no world
state outside the board"), where the first draft's separate "route
record… carried alongside the board's pieces" did not. **Dock ids are
per-pair, not per-boundary** (`dock-{boundaryId}-{partnerBoundaryId}`):
a boundary with boat routes to two different partners gets two distinct
dock pieces, since `board.js` refuses a duplicate id outright and nothing
requires a boundary to have only one waterfront connection.
**Explicitly OUT of B2.7's scope, named so it is not silently assumed
built:** the boat itself (a rendered, animated vessel — `asset-registry.js`'s
existing boat/dock-named kit entries are a real starting point for
whoever builds this, named above so it is not rediscovered from zero),
any travel-time or scheduling logic, and any gameplay hook for boarding
one. B3 (the render path) or a later phase decides whether a boat is
drawn as a moving prop, an instanced animation, or something else — B2.7
only proves the two ends exist, are real, and are the right distance
apart.

### What happens to a gap the MST or redundancy pass chooses that later refuses to build

Named because the first draft left it silent: since bridge-vs-boat is
decided by measured distance BEFORE any geometry is attempted, and
`bridgeSpan` itself can still refuse a ≤ 800 m gap for a reason distance
alone does not predict (no dry-and-correctly-owned anchor on one side, a
road-legality refusal, an occupied-cell collision) — a refused "bridge"
candidate becomes a boat route instead, using the same dock-anchor logic,
rather than silently dropping the connection or blocking the whole gate.
This keeps the MST's own reachability guarantee intact regardless of
which individual edges `bridgeSpan` accepts, and it is reported (built
vs. redirected vs. refused-with-no-fallback, the same three-way split
`buildBridgePieces` already uses as a reporting SHAPE, reused for its
shape only, not its piece format, per the correction above).

### Grid alignment and origin stability, by the same construction B2 already uses

No new risk here if built the same way B2.1/B2.3 already were: dock and
bridge-anchor positions come from `atomOf` on absolute world metres
(never from `ISLAND.xMin`-style bounds), exactly as B2.1's own rule
requires of every other piece. This is not new machinery to design; it is
the existing rule applied to two new pieceTypes.

### The gate, each line with the mutation that gives it teeth

- **Connectivity**: after B2.7, every one of the 12 settled boundaries
  reaches every other one via bridges and/or boat routes — a graph
  reachability check over the union of (accepted bridge edges, redirected
  and pure boat-route edges), asserted as ONE connected component,
  the direct successor to `test/connectivityBridges.test.ts`'s old-world
  "one connected component, zero stranded" property, re-expressed for
  settled boundaries instead of road components. Distinct from "a bridge
  was placed somewhere" (which the vacuous-pass concern below names) —
  this checks the graph, not the piece count. **Mutation**: drop the MST
  edge for one boundary entirely from the emitted edge list (simulating
  the algorithm silently skipping a node) — the reachability check must
  go from 1 component to 2 and name the stranded boundary; if it stays
  green, the check is not really walking the graph.
- **Every bridge and every dock lands on dry, road-legal ground belonging
  to the boundary it serves** — mechanism 1's own hard-won anchor check,
  asserted directly against the new pieces, not re-discovered by trial.
  **Mutation**: remove the `massOf(sa) === wantId` / correct-boundary
  check from the anchor walk (mechanism 1's own historically real bug —
  "barrier-redcliff came back with both ends on the mainland") — the
  check must catch at least one anchor landing on the wrong boundary
  on the real archipelago, not merely on a synthetic fixture.
- **The connectivity gate cannot pass vacuously**: because a "bridge" can
  legitimately redirect to a boat route (the fallback named above), a
  gate that only counts "connectivity achieved" without also asserting
  the RIGHT NUMBER of bridge pieces exist could pass even if every single
  bridge candidate silently redirected to a boat and zero bridges were
  ever actually built — same shape as this project's own §7 2026-09-07
  `componentsBefore` lesson (an intermediate value the final gate cannot
  see past). **Assert the intermediate count directly**: given the
  measured real distribution above (1 of 66 pairs ≤ 800 m), the gate
  pins the exact expected bridge-vs-boat split for the default seed
  (measured when this is implemented, not guessed here) — a change that
  makes every candidate redirect to boats must be visible as "0 bridges
  built" failing that pinned count, not hidden inside a passing
  connectivity check.
- **Grid/origin**: bridge and dock pieces pass the same
  `test/originStability.test.ts`-style check B2's other pieces already
  pass (boundary geometry identical across `WORLD_SCALE`, never checked
  against `heightAt`-dependent placement — the same distinction B2.3
  already drew). **Mutation**: derive a dock or bridge anchor's atom
  index from `ISLAND.xMin`-style landform bounds instead of `atomOf` on
  absolute world metres (B2.1's own named mutation, applied to the two
  new pieceTypes) — must reproduce a nonzero vertex delta across two
  `WORLD_SCALE` values.
- **No boat pieces on land, no bridge anchors in water** — the inverse of
  the dry-anchor check, asserted as its own case since B2.5's own history
  (100,717 road pieces from a mis-sliced boundary) shows a boundary bug
  can pass every OTHER check while still being wrong. **Mutation**: skip
  the dry-ground check specifically for dock anchors (leave it intact for
  bridges) — must be caught by this case specifically, distinguishing it
  from the bridge-side anchor check above.
- **No duplicate dock ids**: a boundary with boat routes to more than one
  partner produces one dock piece per pair (`dock-{boundaryId}-
  {partnerBoundaryId}`), not one shared dock reused across routes.
  **Mutation**: key dock ids by boundary alone, dropping the partner
  suffix — `board.js`'s own duplicate-id refusal (`place()`) must fire on
  the second route touching a boundary that already has one, and the
  gate must name which boundary and which two routes collided.

### What B2.7 is explicitly NOT deciding

- Whether a boat route ever gets a third or fourth waypoint (a real ferry
  route that stops at more than two docks) — this plan's route data
  (a `routeTo`/`routeId` pair of fields on two dock pieces) is pairwise
  only; a multi-stop route is a real future need, not decided here.
- How `bridgeSpan`'s own continuous world-metre socket output is
  decomposed into one-or-more atom-grid-aligned `board.js` pieces beyond
  the two anchors — B2.1's grid-alignment rule ("every position is
  already an integer atom index from the first line of the layout math")
  applies, but the exact decomposition (one piece for the whole span vs.
  one per some fixed atom length) is an implementation decision for
  whoever writes the conversion code, not fixed here.
- The rendering/animation of either bridges (already partially covered by
  `roadkit.js`'s own tested `bridgeSpan` geometry, so lower risk) or
  boats (entirely undecided, though `asset-registry.js`'s existing
  boat/dock-named kit models are a real starting point, named above) —
  B3's job.
- Whether `test/connectivityBridges.test.ts` itself is retired,
  rewritten to target the new settled-boundary graph, or left as a named,
  dated old-world pin until B2.8 — B2.8's own job, explicitly sequenced
  AFTER B2.7 per this document's own phase order.

**STOP HERE.** Nothing above is implemented. Waiting for blind subagent
review (this run's stand-in for Mark's own review, per
`docs/OVERNIGHT-RUN.md`) before BUILD-LOOP Step 3 (test-first) starts.

## B2–B6

B2 (the generator) starts next, on this same branch (`b1-land`) — not
`main`. **main stays green, deployable and truthful while the rebuild is in
flight** (Mark's own instruction, given after this session found the
city-plan.js incoherence above): a world with new land and an old generator
is not a state anyone should be able to deploy by accident. B1 and B2 merge
to main together, as one coherent world, when B2's own gate is green.
