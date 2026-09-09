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
- [ ] **B1 step B — author the new archipelago shapes**, `LAND_SCALE`
      defaulting to 1.0, in `terrain.js`, replacing the copied-verbatim data
      from step A. Mainland west / archipelago east+south / downtown
      east-central (unchanged orientation, per Mark's review). Island names
      reused, remapped to the new characters (fairlight/kingsley/cormorant/
      westbay/bayview/heron/redcliff/gull). Re-derive `public/waterways.js`'s
      three named canals (kingsley/fairlight/cormorant) against the new
      shapes as part of this step, per the reference check above — not a
      separate, later fix.
- [ ] **B1 gate** — water fraction and dry-land area asserted against
      ~65% / ~237 km², watched red against today's 42% / 391.9 km² first.
      Island count and size distribution asserted (a largest that can carry
      downtown, a smallest that carries one house, meaningful sizes
      between) — area alone would pass with one big island and nine specks.
      Settled-mainland-fraction gate, per Mark's correction 2.

### B2–B6

Not started. Each gets its own ledger entries when B1's gate is green.
