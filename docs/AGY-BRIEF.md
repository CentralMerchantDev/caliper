# Brief for agy — the CALIPER city

Repo: `C:\Code\sandbox-spike` · Live: https://caliper.markfrasertoronto.workers.dev

You built a lot of this. Then it changed underneath you, substantially, over
several days while you were paused. **Do not start from what you remember.**

---

## FIRST: audit before you build anything

Before writing a line, spend a pass finding out what is actually true now, and
report what you find. Specifically:

1. `git log --oneline -15` and read the commit messages. They are long on
   purpose and they explain *why*, not just what.
2. Run `npm test` (358 node + 9 worker tests). Confirm green before you touch
   anything, so that anything red later is yours.
3. Run `node scripts/shoot.mjs` and look at the contact sheet. Judge the render
   yourself rather than trusting the priority list below.
4. Read `public/city-render.js`'s `buildProps` against `public/land-use.js` and
   tell us how much of it places geometry at hand-picked coordinates. (Answer
   from a recent audit: most of it. The airport is a 3400 m runway placed on a
   *single* height sample.) That is a real defect and you may find more.
5. Say what you think is wrong that this brief does not mention. The last two
   audits each found things four previous rounds had missed. Assume the same
   applies to you and to this document.

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
the city harder to edit programmatically is a regression even if it looks
better.

---

## What changed while you were away

The city used to live on its own page at `/city.html` while the main app edited
a four-house village. That is now reversed, and a lot followed from it:

- **The main page renders the 40 km city.** `public/index.html` constructs
  `WorldRenderer` with `city: true`. `_buildCityBase()` in
  `public/world-render-3d.js` is the join.
- **`city-render.js` is a scene BUILDER; `world-render-3d.js` is the SHELL.**
  The shell owns camera, navigation, picking, sound and the ~25 methods the UI
  drives. Only the builder was ever village-specific.
- **`scene.environment` is `null` in city mode, gated at the HDRI loader.** An
  environment map flattened 31,000 buildings to a bright average. If you want
  IBL, tune the city's materials for it rather than switching it back on.
- **A spatial index** (`public/spatial-index.js`) answers what any point belongs
  to — plot, block, district, settlement. Clicking a building returns a real
  address. It found a real defect on the day it was built: `port` had been laid
  over `coastal-4`, two settlements on the same ground.
- **Camera presets are ground-relative** and clamped above terrain. Downtown
  sits on a shelf ~44 m up; absolute heights put the camera inside a hill.
- **A boot screen** covers the ~5 s synchronous `generateWorld`, and reports the
  error if the build throws instead of leaving a black canvas.
- **Tour mode** is a top-bar toggle that hides the dashboard chrome. `/city.html`
  still exists for isolating render work, but is not linked.

Numbers, read from the build at runtime (the page used to claim 39,000 and was
25% wrong): **31,158 buildings** across 10 classes, 31,308 plots, 1,955 roads,
19 bridges, 57 settlements, 5,713 lamps, 16,071 pieces of street furniture,
26,001 cars, 20,846 people, 20,005 trees, a golf course, stadium, station,
airport, container port, rivers and canals.

---

## The parts you must not break

### 1. The editable layer

`_reconcilePlacements(world)` in `world-render-3d.js` takes
`world.placements` + `world.objectTypes` and adds or removes meshes **by id**,
disposing GPU resources. That is what the pipeline's edits flow through. It is
generic and it must stay generic.

- Do not couple it to the city's internals.
- Do not rebuild the whole scene where an incremental update would do.
- `placementToWorldXZ(plot, cx, cz, cityMode)` is the single answer to "where
  does this go". In city mode `plot.x` / `plot.y` are **metres**. Keep one
  function; two call sites will drift.

### 2. The land registry — `public/land-use.js`

Every coordinate knows what it is: `WATER`, `BEACH`, `CLIFF`, `STEEP`,
`RESERVED`, `BUILDABLE`, plus slope. Roads and buildings are placed through it
(`roadAllowedAt`, `buildAllowedAt`, `driveableRun`).

This is what stops a road running down a 40° hillside into the sea, and it is
what will let the pipeline refuse "put a tower there" when the ground won't take
it. **Do not place anything visual by hand-picked coordinate that bypasses it.**
If you need somewhere to put a thing, ask the registry.

Thresholds, if you need them: road max slope 0.13, build max 0.32, cliff 0.62,
beach below 2.2 m.

### 3. The plan is data, and it is rich

`generateWorld(heightAt)` in `city-plan.js` returns `plots`, `blocks`, `roads`,
`districts`, `settlements`, `bridges`, `causeways`, `highways`. Every plot
carries:

```js
{ id: "block--2022-1156-p0", blockId, districtId, settlement,
  className: "MIDRISE",           // 10 classes
  xMin, xMax, zMin, zMax, width, depth, maxHeight,
  buildable: { xMin, xMax, zMin, zMax },   // the envelope, inset from the plot
  occupant: null }
```

Height distribution is real: FARM 11 m, VILLA 14, TERRACE 18, WAREHOUSE 22,
TOWNHOUSE 24, HANGAR 26, MIDRISE 55, CIVIC/RESORT 70, TOWER 220.

**The data is not the problem. The render is.** Use `className`, `districtId`
and `maxHeight` rather than inventing new categories.

### 4. The tests

`npm test` runs 358 node tests plus 9 Cloudflare Worker tests, and type-checks
first. Several assert real world invariants — buildings on dry land, no road
mostly over water, no two land masses overlapping, every land mass reachable,
plot classes inside their legal size range. If you change geometry and one goes
red, **the world is wrong, not the test**. Come back rather than adjusting the
budget.

---

## What we want you to do

The geography, layout and data are done. The render is what's behind. In rough
priority:

### 1. Facades

Buildings are extruded slabs with horizontal stripe banding. No windows, no
depth, no articulation, no footprint variation. At street level a wall is a
flat striped plane. This is the single biggest thing making a genuinely large
city read as a massing model.

Vary by `className` — a TOWER and a TERRACE should not share a facade language.

### 2. The ground between buildings

Block interiors read as bright green grass with buildings sitting on it. There
are 385,000 road triangles but in the near field the streets do not read.
Carriageway, kerb, footway, crossings, driveways, service lanes — the surface
treatment that makes a block look inhabited rather than landscaped.

### 3. Parks that look like parks

Currently 22 parks that are green rectangles. They need paths that go somewhere,
ponds, planting beds, benches placed along the paths rather than scattered,
trees in groups, a bandstand or courts or a playground where the size allows.
Small features at the scale a person would notice.

### 4. Environment and light

`scene.environment` is deliberately `null` in city mode — an HDRI flattened
31,000 buildings to a bright average, which is why it is gated at the loader in
`world-render-3d.js`. If you want image-based lighting, tune the city's
materials for it rather than switching it back on. Exposure is anchored to
`LOOK.exposure` (0.78) in `city-render.js`; fog is `FogExp2` at 0.0000092, tuned
so 20 km still reads.

Shadows are weak at distance and the scene wants more directional contrast.

### 5. Detail passes

Street furniture exists in quantity but is uniform and evenly spaced. Cars sit
on roads but do not respect lanes or direction. People are instanced but static.
Anything that rewards looking closely.

---

## How to check your work

```powershell
npm test                                   # 358 + 9, type-checks first
node scripts/shoot.mjs                     # full contact sheet to .shots/
node scripts/shoot.mjs "Downtown close"    # one view
```

`scripts/shoot.mjs` renders headlessly with SwiftShader and reads the WebGL
canvas directly (`page.screenshot` never returns on a scene this size). Named
views live in `VIEWS` in `public/city.html`.

Camera presets are **ground-relative**: `set(tx, ty, tz, d, az, pitch)` adds the
terrain height at `(tx, tz)` to `ty`, and `apply()` clamps the camera above the
real ground. Absolute heights put the camera inside a hill — downtown sits on a
shelf about 44 m up, and "Street level" written as `ty = 12` used to look out
through the terrain at open water.

---

## Ground rules

- **Do not touch** `src/` — that is the pipeline. Render work is `public/`.
- **Do not** disable a test to make a change pass.
- **Do not** place objects at hand-picked coordinates that bypass `land-use.js`.
- Keep the build deterministic. `generateWorld` is seeded and several tests
  depend on it producing the same world twice.
- `generateWorld` currently takes about 4.8 s synchronously on the main thread
  before first paint. Don't make it worse; if you can move it to a worker or
  precompute it, that is a genuine win.
- Comments in this codebase explain **why**, especially where something was
  wrong before. Keep that convention — several of the oddities you'll find are
  deliberate and the comment says so.

---

## Known defects we have NOT fixed — yours if you want them

Found by audit, verified, deliberately left because they are render work:

1. **`buildProps` bypasses the land registry almost entirely.** `city-render.js`
   does not import `land-use.js`. The airport (runways, taxiway, apron,
   terminal, tower, 16 aircraft) sits at literal coordinates around
   `(12100, -4600)` on a **single** height sample — a 3400 m runway plane on one
   sample will float or clip wherever the terrain moves. Container port, cranes,
   farm belts, golf, marina, stadium, station and rail ties are the same
   pattern, each with its own ad-hoc `heightAt(x,z) > k` test. The crane comment
   openly concedes the previous hard-coded `z` "stood in open water" and fixes it
   by marching north until the height is right — a private reimplementation of
   what `classifyAt` already answers.

2. **`distanceToCoast` is 1,700 ms of the ~5 s build** (`city-plan.js`), a linear
   scan over the whole coastline polygon, called four times per candidate rect.
   The file already uses a 400 m bucketing grid elsewhere; the same trick applies.
   Cheap second win: it calls `isOnLand` unconditionally — for a non-negative
   margin it can return early once `best <= margin`.

3. **`plotsOverlappingWithinSettlement`** in `city-plan.js` is an O(n²)-per-bucket
   diagnostic that runs on every page load and is read only by a Node test.

4. **`generateCityPlan()` runs twice** — once in `city-render.js`, once inside
   `generateWorld`. Only ~69 ms, but it means two independently generated objects
   that a future change could desynchronise.

5. **Small main-thread waste**: the world clock writes `textContent` every rAF
   frame (~60/s for a string that changes every 6.25 s); `_musicInterval` and the
   white-noise source are never cleared when audio is toggled off.

6. **`terrain.js` duplicates `valueNoise`/`fbm`** from `noise.js`, which
   `city-plan.js` and `buildings.js` import instead. Two implementations of one
   primitive.

7. **Mobile at 390 px**: the pipeline card and the overview card use the same
   `top` and both render on load, so they overlap. The inspector makes it three.

---

## Ground rules

- **Do not touch `src/`** — that is the pipeline. Render work is `public/`.
- **Do not disable or loosen a test** to make a change pass. Several assert real
  world invariants; if one goes red the world is wrong, not the test.
- **Do not place objects at hand-picked coordinates that bypass `land-use.js`.**
  Fixing the existing violations is welcome; adding more is not.
- **Do not re-enable `scene.environment` in city mode** without retuning the
  materials — there is a comment at the loader explaining what happened.
- Keep the build deterministic. `generateWorld` is seeded and several tests
  depend on it producing the same world twice.
- Comments here explain **why**, especially where something was wrong before.
  Keep that convention. Several oddities you will find are deliberate and the
  comment says so — read it before "fixing" it.
- If you disagree with something in this brief, say so with a reason. The last
  four audit rounds each overturned something the previous round was confident
  about.
