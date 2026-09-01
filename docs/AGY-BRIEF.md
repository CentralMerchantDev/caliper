# Brief for agy — the CALIPER city

Repo: `C:\Code\sandbox-spike` · Live: https://caliper.markfrasertoronto.workers.dev

Read this before touching anything. The city is not decoration, and the
constraints below are not style preferences — breaking them breaks the app.

---

## What this app is

A change pipeline that only says yes when yes is true. A visitor types a change
in plain English; it is grounded against real source, planned, **parked at a
human gate**, implemented, executed in an isolated sandbox, reviewed by a
different vendor's model, re-reviewed after the fix, and then shipped **or
refused**.

**The city is the ground that pipeline builds on.** It is the thing the coding
agent edits. That is the whole point of it — it is not a showcase page, and it
is not a backdrop. Anything that makes the city harder to edit programmatically
is a regression even if it looks better.

---

## What changed recently (this is the catch-up)

The city used to live on its own page at `/city.html` while the main app edited
a four-house village. That is now reversed:

- **The main page renders the 40 km city.** `public/index.html` constructs
  `WorldRenderer` with `city: true`.
- **`city-render.js` is a scene BUILDER; `world-render-3d.js` is the SHELL.**
  The shell owns the camera, navigation modes, picking, sound, and the ~25
  methods the UI drives. Only the builder was ever village-specific, so the
  shell now hosts the city. `_buildCityBase()` in `world-render-3d.js` is the
  join.
- **`/city.html` still exists** as a bare-camera view of the same builder. It is
  useful for isolating render work from the app shell.

Numbers as built: 31,264 buildings across 10 classes, 1,955 roads, 19 bridges,
26 settlements, 5,713 lamps, 16,071 pieces of street furniture, 26,001 cars,
20,846 people, 20,005 trees, a golf course, a stadium, a station, an airport,
a container port, rivers and canals.

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

`npm test` runs 351 node tests plus 12 Cloudflare Worker tests, and type-checks
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
npm test                                   # 351 + 12, type-checks first
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
