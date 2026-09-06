# The world is not sparse. It is inverted.

**Measured 2026-09-06.** Every number below came from a command, named beside it.
Re-measure before claiming any of it changed.

This supersedes an earlier claim of mine that the layout data was sound and the
defect was in the renderer. That claim was wrong. It rested on proving the
placements are not *stale* — `buildScenePlacements` re-plans from the rules on
every build, and there is no legacy placement source. That is true and it is not
the same as the rules being *right*. Mark said "it refreshes with the same wrong
information, that doesn't make it any better." He was correct.

No texture, LOD or material work fixes anything below. This is the plan.

**RE-VERIFIED 2026-09-06, brief step 1, `node scripts/measure-density.mjs`**
(committed, replacing the throwaway scripts this doc was originally taken
with): every number below reproduced exactly, with one correction. Section
3's "45 m — the TOWER minimum" row read **833 plots (4.19%)**; the committed
script measures **845 plots (4.25%)**, using the identical `width >= minW
AND depth >= minD` logic that reproduces the MIDRISE row (2,122, 10.68%)
exactly. Total plots (19,874), roads (1,402), the landmass table, and
downtown's exact class breakdown (627/515/80/66/12) all matched without
adjustment. No alternate reading of the threshold (strict `>`, within
`[min,max]` both dims, area-based, shorter-side-only) reproduces 833, so
845/4.25% is treated as the corrected figure going forward — a difference of
12 plots that does not change the finding: both numbers say almost nothing
in the world qualifies as a tower.

---

## 1. THE MAJORITY OF THE CITY IS ON A SANDBAR

`city-plan.js:198` defines a landmass:

```js
id: "barrier", name: "Ocean Barrier Island", kind: "beach-strip", baseHeight: 9,
points: [ /* 46 points, 108.3 km2, a crescent */ ]
```

It is a barrier island — a sandbar. It carries **11,137 of 19,874 plots, 56.0%**
of every building in the world, in strips generated at `city-plan.js:2497-2508`
and named `beach-w48-city`, `beach-e36-front`, "The Points", "Ocean City",
"Beachfront".

Mark, without having seen the code: *"there's a weird crescent shape that seems
to just be a sandbar road loop, it's impossible to figure out what the hell it
is."* It is a sandbar road loop. It is also where the city went.

**PLOTS BY LANDMASS** — `node /tmp/b.mjs` (recorded below)

| Plots | Share | Landmass |
|---|---|---|
| 11,137 | 56.0% | barrier (the sandbar) |
| 2,774 | 14.0% | mainland |
| 1,518 | 7.6% | fairlight-isle |
| **1,300** | **6.5%** | **downtown** |
| 895 | 4.5% | westbay-isle |
| 811 | 4.1% | cormorant-isle |
| 621 | 3.1% | kingsley-isle |
| 579 | 2.9% | heron-isle |
| 205 | 1.0% | bayview-isle |
| 34 | 0.2% | redcliff-isle |
| 0 | 0.0% | gull-isle |

---

## 2. THE DOWNTOWN ISLAND IS A TOWNHOUSE SUBURB

The one landmass whose entire purpose is a dense high-rise core:

| Plots | Class |
|---|---|
| **627** | **TOWNHOUSE** |
| 515 | MIDRISE |
| **80** | **TOWER** |
| 66 | TERRACE |
| 12 | CIVIC |

48% of downtown is townhouses. There are **81 TOWER-class plots in the entire
26 km world**, and 80 of them are here. The other one is somewhere else.

---

## 3. THE ROOT CAUSE: NO PLOT IS EVER BIG ENOUGH TO BE A TOWER

`PLOT_CLASSES` (`city-plan.js`) sets the tower minimum:

```js
TOWER: { minW: 45, maxW: 90, minD: 45, maxD: 90, maxHeight: 220 },
```

Measured against the plots the subdivision actually carves:

| Plots at least this size in **both** directions | Count | Share |
|---|---|---|
| 45 m — the TOWER minimum | 833 | **4.19%** |
| 26 m — the MIDRISE minimum | 2,122 | 10.68% |

**A settlement's declared class is advisory. The carved plot geometry is what
decides.** `SETTLEMENTS` declares `fairlight-isle-core` as `cls:"TOWER"` and
`coastal-6`/`coastal-7` ("Harbour City") likewise. Their avenue and street
spacing is 185–210 m by 146–165 m, which subdivides into narrow frontages. Not
one of those settlements produced a single TOWER plot.

This is failure pattern (B) from `docs/LESSONS.md`: two sources of truth — the
settlement's intent and the subdivision's geometry — with nothing binding them.
Intent loses silently, every time, and the only visible symptom is that the
skyline never arrives.

**Resulting typology mix** — `node scripts/measure-layout.mjs`

| Count | Share | Typology |
|---|---|---|
| 6,521 | 33.1% | bld-terrace |
| 5,342 | 27.1% | bld-townhouse |
| 3,710 | 18.8% | bld-villa |
| 2,256 | 11.4% | bld-apartment-walkup |
| 857 | 4.3% | bld-midrise |
| **55** | **0.3%** | **bld-tower** |

90.4% of the world is terrace, townhouse, villa or walk-up. Mark: *"a bunch of
tiny row houses."*

---

## 4. DENSITY IS RURAL EVERYWHERE THAT MATTERS

`WORLD.SIZE` = 26,000 m → **676 km²**. Built extent 25.7 × 12.0 km. 19,725
buildings across that is **29 per km²**.

For scale: a SimCity 2013 city tile is 2 × 2 km. Cities: Skylines starts on
1.92 × 1.92 km. CALIPER's world is roughly **169 SimCity tiles** holding one
small town.

Worst offenders, all declared as city:

| Settlement | Class | Plots | km² | Per km² |
|---|---|---|---|---|
| coastal-6 Harbour City | TOWER | 127 | 4.4 | **29** |
| coastal-7 Harbour City | TOWER | 327 | 4.4 | 74 |
| coastal-5 Westgate | MIDRISE | 90 | 4.4 | **20** |
| coastal-4 Marchmont | TOWNHOUSE | 34 | 4.4 | **8** |
| coastal-9 Ridgeway | VILLA | 32 | 4.4 | **7** |
| airport | HANGAR | 11 | 4.5 | 2 |

Mark: *"the main island, the one on the ocean, is almost vacant."* At 8 to 29
buildings per square kilometre, it is.

---

## 5. THE ROADS HAVE NO CONNECTIONS

All 1,402 roads are stored as axis-aligned spans:

```json
{"id":"little-x-1349","axis":"ns","class":"LANE","at":-1348.8,
 "from":859.9,"to":1079.9,"settlement":"downtown"}
```

There is no junction list, no adjacency, no connected-component check anywhere
in the plan. `roadkit.js` can draw `junction()` and `intersection4Way()`, but
nothing in the data ever states that two roads meet. Connectivity is not
represented, so it cannot be verified, and a road that reaches nothing looks
exactly like one that does.

Mark: *"random roads that are not connected, have no interconnectivity."*
Correct, at the level of the data model.

---

## 6. WHAT IS SOUND, AND SHOULD NOT BE TOUCHED

- `grid.js` — an 8 m cell grid with exact binary subdivision to 0.5 m. This is
  already the squares-and-cubes addressing Mark described wanting. It is right.
- `terrain.js`, `footprint.js` — the ground and its verdicts.
- `layout.js` — the engine. Its anti-clone decisions work: 0 of 1,379 blocks are
  internally mixed, all four characters spread 24–26%, row positions are read
  from real rows. It is being fed a broken plan.
- The renderer — PBR, shadows, bloom, tone mapping, colour management, LOD,
  instancing all present and working.

**The world DEFINITION is what is wrong**: `WORLD.SIZE` usage, the `SETTLEMENTS`
table, the subdivision parameters, and the barrier island's share. That is data
and parameters, not architecture. Rebuilding it does not mean rebuilding the
engine.

---

## 7. MARK'S DIRECTION, GIVEN 2026-09-06

Recorded verbatim in intent, as the brief for the rebalance:

1. **Keep the 26 km extent.** Build out the downtown, the islands, and some of
   the mainland. Leave land undeveloped *between* them — "like a major city and
   its surrounding suburbs". Empty ground is fine when it reads as countryside;
   it is not fine when it reads as a city that failed to generate.
2. **Keep all the geography.** Coastline, nine islands, barrier island — all
   stay. Rebalance the density across them.
3. **All three city shapes.** Start with a real downtown, real island
   settlements and real suburbs; players grow and redefine it over time.

4. **26 km is the world NOW, not the world forever.** Land must be openable —
   built or discovered — as the game grows, so new levels, new cities and
   adventures not yet defined can be added later.

---

## 8. EXPANSION: THE ORIGIN MUST NEVER MOVE

Mark's fourth requirement is an architectural constraint, not a feature, and it
has one rule that everything else follows from.

**A saved build is a coordinate. If opening new land ever shifts the origin,
every world anyone has ever built is silently wrong.** So the world may grow at
its edges and must never re-centre, re-scale or re-index. Anything that computes
a position from "the size of the world" is a latent version of that bug.

`grid.js` was designed for this and says so:

> The grid covers the entire 26 km, not the built area. Regions that are not
> open yet are LOCKED, which is a different thing from absent: a locked region
> has coordinates, terrain and a place in the world, and refuses placement with
> a reason. Making unopened land simply not exist would mean the map ends at the
> edge of the town, and opening more later would move everything.

That reasoning is right and already written. What is missing is that the extent
itself is fixed:

```js
SIZE: 40000 * WORLD_SCALE,   // the modelled square; 26 km at k = 0.65
```

`WORLD.SIZE` is a constant, and it is read by the terrain apron, the sea and
abyss planes, the scatter regions and the sky dome. Growing the world means
`SIZE` becomes the extent *currently open*, with the addressable grid unbounded
beneath it — which is what `grid.js` already assumes.

**Three properties to hold, each of which is a test:**

- **Origin stability.** Generate the world, record a plot's coordinates, open
  new land, regenerate: that plot is at the identical coordinate. This is the
  one that protects saved games and it should be written before any expansion
  work starts.
- **Locked is not absent.** Unopened ground has terrain, height and an address,
  and refuses placement with a stated reason. A player at the boundary sees land
  continuing, not a void.
- **Determinism survives growth.** Opening region N must not alter what region
  N-1 generates. Region seeds derive from region coordinates, never from a
  counter or from the world's current size.

This is not work for now. It is a constraint on how the rebalance in §7 is
built, so the rebalance does not have to be undone to allow it.

---

## RECORDED COMMANDS

```
node scripts/measure-layout.mjs           # typology mix, refusals, characters
node scripts/check-layout-geometry.mjs    # geometry and triangle counts
```

The per-settlement, per-landmass, plot-class and plot-size measurements in
sections 1–4 were taken with throwaway scripts against `generateWorld(heightAt)`
and `makeHeightAt(new LandField(16))`. **They should be committed as
`scripts/measure-density.mjs` so these numbers can be re-taken rather than
re-invented.** That is the first task in the rebalance.
