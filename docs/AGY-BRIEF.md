# Brief for agy — the CALIPER city

Repo: `C:\Code\sandbox-spike` · Live: https://caliper.markfrasertoronto.workers.dev

You built a lot of this. Then it changed underneath you — **substantially, and
again since the last version of this brief**. The world is now a different size.
Do not start from what you remember, and do not fully trust this document either.

---

## FIRST: audit before you build anything

Before writing a line, spend a pass finding out what is actually true, and report
what you find.

1. `git log --oneline -14` and read the messages. They are long on purpose and
   they explain *why*. The four most recent are the world rescale and rebuild.
2. Run `npm test` — **379 node tests across 26 files, + 9 Cloudflare Worker tests**. Confirm green
   before you touch anything, so anything red later is yours.
3. Run `node scripts/shoot.mjs` and look at the contact sheet. Judge the render
   yourself rather than trusting the priority list below. The camera bookmarks HAVE been
   re-tuned for the new scale, but only arithmetically — nobody has looked at all
   46 of them rendered. If a view is badly framed, say so; that is a finding, not
   a render defect.
4. Read `public/world-scale.js` first, before any other file. One constant
   decides how big the world is, and the rule about what scales and what does
   not is the thing most likely to trip you.
5. Say what you think is wrong that this brief does not mention. Every audit
   round so far has found something the previous round missed — including, last
   round, that the stadium had been standing in the water since the day it was
   built. Assume the same applies to you and to this document.

Then propose what you would do, in what order, before doing it.

---

## What this app is

A change pipeline that only says yes when yes is true. A visitor types a change
in plain English; it is grounded against the real source, planned, **parked at a
human gate**, implemented, executed in an isolated sandbox, reviewed by a
different vendor's model, **re-reviewed after the fix until clean or a guardrail
trips**, put through a final functional QA pass, and then shipped **or refused**.

**The city is the ground that pipeline builds on.** It is the thing the coding
agent edits. It is not a showcase page and not a backdrop. Anything that makes
the city harder to edit programmatically is a regression even if it looks better.

---

## THE BIG CHANGE: the world is 0.65 the size it was

The city covered 2.96% of its island with buildings. Inside the settlements
coverage was 21.9% — which is what a real dense city looks like, so the blocks
were never too sparse. There was simply far more island than city: **86.5% of the
land carried no settlement at all.** Filling it would have taken several hundred
thousand more buildings. Shrinking the ground took one number.

```
public/world-scale.js  ->  export const WORLD_SCALE = 0.65;
```

|                       | before      | now        |
| --------------------- | ----------- | ---------- |
| land across           | 48.3 km     | **31.3 km** |
| land area             | 1,301 km²   | **559 km²** |
| settled land          | 13.5%       | **29.3%**   |
| built coverage        | 2.96%       | **5.61%**   |
| plots                 | 31,308      | **21,096**  |
| buildings per km²     | 24.1        | **39.6**    |
| `generateWorld`       | 4.6 s       | **3.3 s**   |

### The rule you must hold in your head

- **Landform metres scale.** Coastlines, terrain heights, hills, sea depths,
  shore ramps, noise feature sizes, and the step sizes used to *walk* terrain.
- **Built metres do not.** Building footprints and heights, road widths, plot
  dimensions, setbacks, lamp spacing, cars, people. The runway is still 3,400 m
  because that is what a wide-body needs. The golf course's centre moved; its
  fairways are still the length of fairways.
- **Dimensionless things never scale.** Slope ratios, density fractions.

If you add a constant and cannot tell which group it is in: would a person in
the world measure it against the landscape, or against a building?

### How the terrain scaling works — do not "improve" this

`terrain.js` is untouched internally and works in **design metres** (the original
48 km world). One boundary at the bottom of the file converts:

```
heightAt_world(x, z) = heightAt_design(x / k, z / k) · k
```

Two guarantees that hand-scaling the constants could not give:

1. The coastline is the y = 0 contour, so it comes out as **exactly** Mark's
   traced pen strokes multiplied by k. Not re-derived, not re-noised.
2. Slope is `(dH/dX)(1/k)(k) = dH/dX` — **identical**. Every threshold in
   `land-use.js` stays valid untouched.

It is verified as a **bit-exact no-op at `WORLD_SCALE = 1`**. If you change
anything here, that property is the test: set it to 1 and the whole suite must
pass with measurements identical to the original world.

An earlier attempt hand-scaled ~28 landform constants instead. It had a real bug
within the hour. Don't go back to that.

**One deliberate exception:** the mountains are held at full drawn height
(1,620 m ridge, 2,320 m summit) rather than scaled, so the range still reads as a
range beside life-sized buildings. That makes its slopes 1/k steeper than drawn,
which was measured rather than argued: settlement ground is still **96.6%
buildable**, because the spine sits 6–10 km inland of anything built.

---

## The parts you must not break

### 1. The editable layer

`_reconcilePlacements(world)` in `world-render-3d.js` adds and removes meshes
**by id**, disposing GPU resources. That is what the pipeline's edits flow
through. It is generic and must stay generic.

- `placementToWorldXZ(plot, cx, cz, cityMode)` is the single answer to "where
  does this go". Keep one function; two call sites will drift.
- **Ids are addresses.** Every plot, block and road id is unique and rounded to
  the metre — there is a test. Do not build an id from an unrounded coordinate,
  and do not build one from a loop ordinal (that produced two roads sharing
  `link-0-0`, because the pass it counted within runs up to four times).

### 2. The land registry — `public/land-use.js`

Every coordinate knows what it is: `WATER`, `BEACH`, `CLIFF`, `STEEP`,
`RESERVED`, `BUILDABLE`, plus slope. Thresholds: road max 0.13, build max 0.32,
cliff 0.62, beach below 2.2 m. **These did not change with the world scale and
must not**, because uniform scaling preserves slope exactly.

Road gradient is now **per class** (`ROAD_SLOPE_MAX`): freeway 6%, arterial
9–11%, local street 15%, from AASHTO. That is the LEGAL CEILING. It is a
different thing from `ROAD_GRADE.maxGrade` in `grade.js`, which is the DESIGN
gradient the surveyed alignment holds. Both are needed and they are not the same
number — see docs/CITY-PLANNING-SPEC.md §1.4.

`findSite(heightAt, want, {w, d})` is new: it takes where you want something and
returns the nearest place it can actually stand, testing the whole footprint and
reporting how far it moved. It returns `null` rather than a guess.

**Use it instead of writing a coordinate.** The stadium, station and cathedral
were literals, and all three had been standing in water since the build began —
the rescale could not reveal it, because a wrong coordinate scales to a
proportionally wrong coordinate.

### 3. Settlements grow; they are not declared

`public/settlement-fit.js`. Each settlement starts at its scaled position and
grows one strip at a time, claiming a strip only if it is genuinely buildable and
no neighbour holds it. **No-overlap and no-water now hold by construction**, not
by later detection.

Edge density is lifted in proportion to how enclosed a settlement turned out to
be — a boundary against water, cliff or a neighbour is the densest ground in a
real city, not the sparsest.

### 4. Land use is derived, not declared

`public/zoning.js`. A settlement no longer states its own character. The
character is derived from the port, the freight line, the core, the water and the
slope — so moving the port moves the warehouses, because they were never anywhere
except "next to the port".

Honest note: the first version of these rules was **worse** than the hand-typed
values it replaced. Guessed thresholds turned towns into farms and an island
tower district into a resort. They were re-derived from the measured demand
distribution across the built plots. If you change a band, measure first.

Resulting mix: VILLA 49%, TERRACE 24%, TOWNHOUSE 14%, MIDRISE 8.5%, FARM 2%,
WAREHOUSE 0.9%, HANGAR 0.5%, TOWER 0.4%.

### 5. Built surfaces are graded, not draped

`public/grade.js`. Roads, and the railway, are surveyed alignments with a bounded
gradient and an earthworks budget, per class. Draping a road on fbm noise is why
the streets were never legible despite 385,000 road triangles. **Do not "simplify"
this back to `heightAt(x, z)`.**

### 6. Buildings respond to the ground they stand on

`public/footprint.js` samples the buildable envelope on a grid and returns one of
four verdicts:

| verdict | share | what it means |
| --- | --- | --- |
| `slab` | 56.9% | near-level, sits on the ground |
| `plinth` | 36.7% | base drops to the lowest point, cut into the uphill side |
| `terrace` | 5.0% | stepped down the slope, each face about a storey |
| `refuse` | 1.3% | a cliff, or **any** part in water — nothing is built |

The old code sampled the envelope centre plus the **plot** corners — two
different rectangles — and only tested the centre for water. 128 buildings that
passed that test would have stood partly in the sea or off a cliff.

### 5. The tests

`npm test` runs 361 node tests + 9 Worker tests, and type-checks first. Several
assert real world invariants. **If you change geometry and one goes red, the
world is wrong, not the test.**

Probe *coordinates* scale with the world. Judgements do not — the 0.06 dry-land
ratio, the zero-tolerance overlap assertions, `MAX_UNSERVED = 5`, and the
connectivity budgets are deliberately unscaled. Do not touch those.

---

## What we want you to do

The geography, layout and data are done. **The render is what's behind.**

### 1. Facades
Buildings are extruded slabs with horizontal stripe banding. No windows, no
depth, no articulation. At street level a wall is a flat striped plane. This is
the single biggest thing making a real city read as a massing model. Vary by
`className` — a TOWER and a TERRACE should not share a facade language.

### 2. The ground between buildings
Block interiors read as bright green grass. Carriageway, kerb, footway,
crossings, driveways — the surface treatment that makes a block look inhabited
rather than landscaped. **This matters more now**: the city is denser, so there
is proportionally more street frontage in view.

### 3. Plinths and terraces are new geometry and currently crude
37% of buildings now get a plinth and 5% get terraces, and they are grey boxes.
On a denser, hillier-reading world these are visible everywhere. Retaining walls,
steps, split levels, planting on the terraces — this is a real opportunity that
did not exist before.

### 4. Parks that look like parks
Green rectangles. They need paths that go somewhere, ponds, planting beds,
benches along the paths rather than scattered, trees in groups.

### 5. Environment and light
`scene.environment` is deliberately `null` in city mode — an HDRI flattened the
buildings to a bright average. If you want IBL, tune the materials for it rather
than switching it back on. Shadows are weak at distance.

### 6. Detail passes
Street furniture is uniform and evenly spaced. Cars do not respect lanes or
direction. People are static.

---

## How to check your work

```powershell
npm test                                   # 379 + 9, type-checks first
node scripts/shoot.mjs                     # full contact sheet to .shots/
node scripts/shoot.mjs "Downtown close"    # one view
```

`scripts/shoot.mjs` renders headlessly with SwiftShader and reads the WebGL
canvas directly (`page.screenshot` never returns on a scene this size).

Camera presets are **ground-relative**: `set(tx, ty, tz, d, az, pitch)` adds
terrain height at `(tx, tz)` to `ty`, and `apply()` clamps above real ground.
**They have not been re-tuned since the rescale** — expect some to be framed
wrongly and treat that as a finding, not a render defect.

---

## Known defects we have NOT fixed — yours if you want them

1. ~~`buildProps` bypasses the land registry~~ **FIXED.** Placement is now a
   manifest (`features.js`): every large feature states what ground it NEEDS and
   the land answers. The airport sits on a graded platform, the port on a
   resolved quay, the railway on a corridor that can actually hold 2.5%. What
   remains in `buildProps` are LOD culling bounds ("how far out do we draw
   detail"), which are not placements.
2. ~~`distanceToCoast` is a linear scan~~ **FIXED.** Bucketed on the same 400 m
   grid, ring search with early exit. `distanceToCoastExact` is kept and a test
   asserts the two agree exactly, sign included.
3. ~~`plotsOverlappingWithinSettlement` runs on every page load~~ **FIXED.** Now
   a getter, so the one test that reads it pays for it.
4. ~~`generateCityPlan()` runs twice~~ **FIXED.** Memoised, so the plan cannot
   exist as two independently generated objects.
5. ~~Main-thread waste~~ **FIXED.** The clock writes only on change. Audio now
   fades, clears its scheduler and suspends the context — it used to ramp the
   gain to zero and leave the whole graph running.
6. ~~`terrain.js` duplicates `valueNoise`/`fbm`~~ **FIXED.** noise.js imports
   nothing, so there was never a cycle. One implementation now.
7. ~~Mobile card overlap at 390 px~~ **FIXED.** The inspect card stacks below
   the status card's real measured height.
8. **`generateWorld` is ~3.3 s synchronous** on the main thread before first
   paint — still the largest remaining stall, and still worth moving to a worker
   or precomputing. **This one is genuinely open.**

9. **Camera bookmarks have been re-tuned** for the new scale, but only
   arithmetically — nobody has looked at all 46 of them rendered. Judge them.

---

## Ground rules

- **Do not touch `src/`** — that is the pipeline. Render work is `public/`.
- **Do not disable or loosen a test** to make a change pass.
- **Do not place objects at hand-picked coordinates.** Use `findSite`. Fixing
  the existing violations is welcome; adding more is not.
- **Do not change `WORLD_SCALE` casually.** If you do, `k = 1` must remain a
  bit-exact no-op — that is the property the whole scaling rests on.
- **Do not re-enable `scene.environment`** in city mode without retuning the
  materials.
- Keep the build deterministic. `generateWorld` is seeded and tests depend on it
  producing the same world twice.
- Comments here explain **why**, especially where something was wrong before.
  Several oddities you will find are deliberate and the comment says so — read
  it before "fixing" it.
- If you disagree with something in this brief, say so with a reason. Every audit
  round so far has overturned something the previous round was confident about.
