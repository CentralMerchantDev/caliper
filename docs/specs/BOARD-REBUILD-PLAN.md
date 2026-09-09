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

## B2–B6

B2 (the generator) starts next, on this same branch (`b1-land`) — not
`main`. **main stays green, deployable and truthful while the rebuild is in
flight** (Mark's own instruction, given after this session found the
city-plan.js incoherence above): a world with new land and an old generator
is not a state anyone should be able to deploy by accident. B1 and B2 merge
to main together, as one coherent world, when B2's own gate is green.
