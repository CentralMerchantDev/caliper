# The remaining jobs, diagnosed

Written without a shell — bash access was withdrawn mid-session, so nothing here
has been run. That matters, and it is why this is a brief rather than a commit:
this project's one claim is that it does not report a pass it did not observe,
and that applies to me.

Everything below is diagnosis from reading the source, with line numbers, plus
the exact commands to verify each fix. Confidence is stated per item.

---

## The frame: 2D, 3D and 4D — and the world currently has only one of them

Mark's framing, and it is the correct one: *"you need to be building and
operating in 2d 3d and 4d for this to work."*

Written out, with what CALIPER has today:

| | The question it answers | CALIPER today |
|---|---|---|
| **2D** — the plan | *What is at (x, z)?* Footprints, occupancy, adjacency, zoning, roads, "is there room here" | **Partial.** `spatial-index.js` answers it for PLOTS only. Not features, roads, parks or water — which is why the stadium has houses in it |
| **3D** — the volume | *What is at (x, y, z)?* Solid earth, building volumes, airspace, what is above and below | **Absent.** `heightAt(x, z) -> y` is a single surface. No underside, no interior, no way to ask about a point in space |
| **4D** — the timeline | *What is at (x, y, z, **t**)?* When was it built, what was here before, step forward, rewind, undo | **Absent.** The world is generated once and never changes. Edits rewrite a source string |

**The fourth one is the one I would have missed, and it is the most interesting.**

CALIPER versions its world by **rewriting a JavaScript source string**
(`SIM_BASELINE_SOURCE`). That single decision is why so much of the machinery
around it is as complicated as it is:

- the CAS publish in `spendCounterDO.ts` exists to stop two runs clobbering one
  string
- the "read mirror" and the `warning` event exist because the string a visitor
  reads can lag the string that shipped
- `worldIntegrityChecks` diffs two source strings to work out what an edit did
- the spatial diff highlights "new" objects from a key set that is never pruned
- undo does not exist at all

Every one of those is a workaround for **not having time as a dimension**. If the
world were 4D — state plus a timeline of events — then:

- an edit is an **event at a timestamp**, not a rewritten file
- "what changed" is a **query between two times**, not a text diff
- **undo and revert are free**, because the previous state is still addressable
- the read mirror problem disappears: a reader asks for a time, not a file
- the pipeline's gates become **proposed events awaiting commit**, which is what
  they already are conceptually and are not structurally

And it makes it a **game**. Things get built at a time. They age. Traffic moves.
Population grows. You can rewind and watch it. None of that is expressible
against a world that is regenerated deterministically and then frozen.

### The one query the whole system should be built on

```
whatIsAt(x, y, z, t) -> { kind, id, owner, solid, since, until }
```

Everything Mark has asked for in the last hour falls out of that single signature:

| Ask | How this answers it |
|---|---|
| "the stadium has houses in it" | the stadium's volume is occupied from `t` onward; a plot cannot be created in occupied space |
| "you need a plot big enough, or remove what's there" | `findFree(w, d, h, near, t)` and a `remove` event that ends an occupancy at `t` |
| "land needs depth and a core" | below the surface is rock, and rock is **solid** at every `t` |
| "nothing knows what it is" | every point has an owner and a kind, at every time |
| "the views are not connected to where things are" | a bookmark names a thing and asks where it is **now** |

That is one architecture, not five features. It is also a real piece of work —
probably the largest single thing left in this project — and it is worth doing in
that order because building the 2D registry flat and extending it later means
building it twice.

---

## Zero: the world has no volume, and that is upstream of everything else

Mark's framing, which is correct and which I had not connected until he said it:
*"land needs depth... you have it as a map over nothing... everything needs depth
and volume."*

**The evidence, from the source.**

The entire world is `heightAt(x, z) -> y`. One number per column. That is a 2.5D
heightfield, not a solid — there is no underside, no interior, and no way to ask
what is at a point in space, only what the surface height is above a point on a
plan.

It shows in three places in `city-render.js`:

```js
// line 570 — the OUTER mesh, which is most of the visible world:
terrainMesh(wm(-30000), wm(30000), wm(-33000), wm(10000), LOOK.outerStep, hole, 0, false);
//                                                                          ^ skirtDepth = 0

// line 575 — only the core gets any thickness at all:
terrainMesh(hole.x0, hole.x1, hole.z0, hole.z1, LOOK.coreStep, null, 45);

// line 593-597 — and a flat lid to stop you seeing sky through the ocean:
const abyss = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.SIZE * 6, WORLD.SIZE * 6), ...);
abyss.position.y = -175;
```

So: an infinitely thin skin, with **no underside over most of its extent**, and a
flat blue plane 175 m below it to hide the fact that there is nothing there. The
comment at line 588 says this out loud — *"where the terrain grid ENDS you were
looking at the sky through the ocean."* That is the diagnosis, written by the
person who added the lid instead of the volume.

**What the missing volume actually costs.** Every one of these is a symptom of
the same absence:

| Symptom | Why no-volume causes it |
|---|---|
| The world reads as a map, not a place | A surface with no thickness has no silhouette from any angle but above |
| Cliffs look painted on | A cliff is currently a *steep bit of the same skin*, not a rock face with a body behind it |
| The batters I just built hang | They drop from the road to the surface — and the surface is the only thing there, so a cut has nothing to cut INTO |
| Coast blurs land-to-water | A zero-thickness sheet has no unambiguous inside or outside at the waterline |
| You cannot excavate, tunnel, or put in a basement | There is nothing to remove |
| "Cut and fill" is a number, not a thing | `maxCut` describes earth that does not exist |

**The fix, in three layers, cheapest first.**

1. **Close the solid.** Give the outer mesh a real skirt and a base cap so the
   terrain is a closed manifold: surface on top, walls at the boundary, a floor
   at some `BEDROCK_Y`. This is the same `skirtDepth` code that already exists
   at line 538 — it is passed `0`. Cost: one perimeter ring of quads plus two
   triangles. The abyss plane can then go, because the world closes itself.

2. **Give the interior strata.** The earth reads as real because a cut face shows
   layers. Colour the *side* faces by depth below the surface rather than by
   height: topsoil, subsoil, clay, rock, bedrock. Every cliff, every road cutting,
   every quarry and the world's own edge then show geology instead of a smear of
   the surface colour. This is a `onBeforeCompile` patch on the terrain material,
   and it is what makes the difference between "a solid" and "the earth".

3. **Make depth queryable.** `heightAt(x, z)` becomes one accessor on a world
   that can also answer `materialAt(x, y, z)` — air above the surface, topsoil to
   −2 m, subsoil to −8, rock below. That is a pure function of the existing height
   field, so it costs nothing to store and makes excavation, tunnels and basements
   expressible rather than impossible.

**And this is the same job as the occupancy registry.**

The registry I sketched below was 2D — footprints on a plan. That has exactly the
weakness Mark is describing about the terrain: it is another mask. The right
shape is one question:

```
whatIsAt(x, y, z) -> { kind, id, solid, owner }
```

where *below the surface is `rock`, and rock is solid*. Then "you cannot build a
house inside the stadium" and "you cannot build a house inside a hill" are the
same rule, checked the same way, instead of two separate special cases — and
"remove what is there first" becomes a real operation on a real volume rather
than deleting a record.

That is what makes it a game rather than a diagram, and it is why this item is
numbered zero: the occupancy work below should be built as the 3D version from
the start, not built flat and then extended.

---

## First: these are not four bugs. They are one.

Mark's four reports — the stadium with houses in it, the camera bookmarks that
point at nothing, the toolbar buttons that do nothing, the coastline that blurs —
are the same defect wearing four coats:

**Every subsystem keeps its own private copy of where things are, instead of
asking one registry.**

| Subsystem | What it believes | Where that belief came from |
|---|---|---|
| `features.js` | where the stadium, port, airport, golf are | asks the land — **correct** |
| `city-plan.js` | where the plots are | grows settlements into buildable ground — **does not know features exist** |
| `world-render-3d.js` | where the camera bookmarks point | six hardcoded literals; only two are refreshed from real positions |
| `city-render.js` `SETT` | where the settlements are | *was* a hardcoded table; now derived from the plots — **this is the pattern that works** |
| `spatial-index.js` | what is at a point | plots only. Not features, roads, parks or water |

So the stadium is placed correctly *and* plots are grown correctly *and* nothing
reconciles them. The bookmarks were written when this was a village and four of
the six still are. The buttons drive village machinery. None of these is a
mistake in the code that has it — each one is locally reasonable and globally
wrong, which is why they have survived so many passes.

You said it exactly: *"the only way this works as a game is if it knows
everything that is in the game, where it is, what it does, and how to work with
it or remove it."* That is the fix, and it is one piece of work, not four.

**The template already exists in the repo.** `SETT` used to be a hardcoded
downtown rectangle plus a 26-entry table, against a world with 54 settlements —
so `settAt()` returned null for every downtown plot and 10,282 beachfront plots
had no settlement at all. The fix was to stop keeping a table and derive it from
the plots themselves: *a settlement's extent IS the extent of its plots.* Nothing
left to go stale. Every item below is that same move applied to a different
subsystem.

I have been fixing these one at a time because that is what an audit finds —
symptoms. The audit was worth running and the 61 findings were real. But you are
right that the system is weak underneath them, and patching individual symptoms
has now hit its limit. The registry is the work.

---

## 1. The graphics: "land does not stay land, edges blur or flip to water"

**Two independent causes. Both real. Neither is a shader bug.**

### 1a. The outer terrain cannot resolve a coastline — HIGH confidence

`public/city-render.js:567-576` builds the world from two meshes:

```js
const hole = { x0: -LOOK.coreX, x1: LOOK.coreX, z0: LOOK.coreZ0, z1: LOOK.coreZ1 };
verts  = terrainMesh(wm(-30000), wm(30000), wm(-33000), wm(10000), LOOK.outerStep, hole, 0, false);
verts += terrainMesh(hole.x0, hole.x1, hole.z0, hole.z1, LOOK.coreStep, null, 45);
```

`LOOK.outerStep` is `wm(250)` = **162.5 m per vertex**. `coreStep` is 32.5 m.

The coastline is defined as the contour where `heightAt` crosses zero. At 162.5 m
sampling, the mesh puts that crossing wherever linear interpolation between two
samples 162 m apart happens to land — which can be a hundred metres or more from
the real coast.

And the colour is worse. `terrainMesh` (line 486-492) computes
`groundColor(h, slope)` **per vertex** and lets the GPU interpolate it across the
triangle:

```js
c.setHex(groundColor(h, slope));
```

So in the outer region — which is most of what a wide shot shows — the land/water
boundary is not an edge at all. It is a Gouraud gradient smeared across a 162 m
triangle. Perspective-correct interpolation then changes which colour lands on
which pixel **as the camera moves**, which is precisely "the pixels change,
nothing seems fixed in place."

The core region at 32.5 m does not have this problem, which is why the city
itself looks solid and the distance does not.

**Three ways to fix it, in increasing cost:**

| Fix | Effect | Cost |
|---|---|---|
| Lower `outerStep` to `wm(120)` | ~4× the outer vertices | measure first — see below |
| Colour the terrain in the FRAGMENT shader from interpolated height instead of per-vertex | crisp waterline at any resolution | a small `onBeforeCompile` patch |
| Adaptive step: fine near the coast, coarse inland | best result | a real change to `terrainMesh` |

The middle one is the right answer. The waterline becomes a threshold test on the
interpolated height rather than an interpolated colour, so it is sharp regardless
of mesh density, and it costs no extra vertices.

**Verify:**
```
node -e "import('./public/city-render.js')"      # no; use the measure script below
```
Measure the real vertex cost before changing `outerStep`:
```
node --input-type=module -e "
import { LOOK } from './public/city-render.js';
for (const step of [250, 200, 160, 120]) {
  const nx = Math.round(60000*0.65/(step*0.65)), nz = Math.round(43000*0.65/(step*0.65));
  console.log(step+'m ->', ((nx+1)*(nz+1)).toLocaleString(), 'verts');
}"
```

### 1b. Depth precision — MEDIUM-HIGH confidence, contributes to shimmer

`public/city.html:95` and `public/world-render-3d.js:1413`:

```js
new THREE.PerspectiveCamera(33, aspect, 3, 120000)
```

A **40,000:1 near/far ratio** with no logarithmic depth buffer. Resolvable depth
difference goes as `z²·(far−near) / (far·near·2^bits)`:

| distance | resolvable Δz (24-bit) |
|---|---|
| 500 m | 0.5 cm |
| 2 km | 8 cm |
| 10 km | **2.0 m** |

Roads sit **0.9 m** above the terrain (`ribbon(..., 0.9)`). At 10 km that is well
inside the noise floor, so roads and terrain trade places pixel by pixel as the
camera moves. The mountains at 15 km are worse.

**Fix:** `logarithmicDepthBuffer: true` on the `WebGLRenderer`, both in
`city.html:82` and `world-render-3d.js:1309`. One flag, standard for large-world
scenes.

**Caveat worth checking, and the reason I did not just apply it:** it interacts
with `EffectComposer`. The composer is set up in `city.html:104-117`. Verify bloom
and the vignette still render after the change, and that `logDepthBufFC` does not
break the custom `GradeShader` at `city.html:128`.

Raising `near` from 3 to ~15 would also help and costs nothing, but street and
walk modes put the camera close to geometry — check those first.

---

## 2. Occupancy: "the stadium has houses in it"

You are describing the right thing, and the diagnosis is simple: **features are
placed AFTER the plots are generated, and nothing reserves their ground.**

`public/features.js` resolves where the stadium, airport, golf course, port and
railway go, by asking the land. `public/city-plan.js` generates plots by growing
settlements into buildable ground. **Neither knows about the other.** So a
settlement grows across the stadium's footprint, plots are laid inside it, and
`city-render.js` then draws a stadium on top of the houses.

There is a spatial index (`public/spatial-index.js`) but it indexes **plots
only** — point → plot/block/district/settlement. It cannot answer "what is at
this point" for a feature, a road, a park, or the water.

### What it needs to become

One registry that every occupant writes to and every placement reads from:

```
occupancyAt(x, z) -> {
  kind: "plot" | "feature" | "road" | "water" | "cliff" | "beach" | "park" | "free",
  id, name, footprint, canBuildOn, whyNot
}
```

with `reserve(footprint, owner)` called **before** plots are generated, and
`findFree(w, d, near)` for "is there room for this" — which is the SimCity
behaviour you described.

**The order has to change.** Today:
`generateCityPlan → generateWorld(plots) → placeFeatures → render`
It has to become:
`placeFeatures → reserve footprints → generate plots (refusing reserved ground) → render`

### Why this is a brief and not a commit

Reserving that ground **removes plots** — the stadium alone is 320 × 260 m. That
changes the plot count, which cascades into `citySummary.generated.ts`, the
`publicClaims` test, the settlement counts on the page, and the `cityConnectivity`
and `cityJoin` budgets I just set to zero. Every one of those needs a run to
re-baseline, and a guess at the new numbers would be exactly the kind of
hand-typed figure this project spent an audit removing.

**First measurement to run** — this tells you the size of the problem:

```
node --input-type=module -e "
import { generateWorld } from './public/city-plan.js';
import { LandField, makeHeightAt } from './public/terrain.js';
import { placeFeatures, FEATURES } from './public/features.js';
const h = makeHeightAt(new LandField(16));
const w = generateWorld(h);
const { sites } = placeFeatures(h);
const foot = [];
for (const f of FEATURES) {
  const s = sites[f.id]; if (!s) continue;
  const n = f.need || {};
  const W = n.kind === 'flattest' ? n.w : (f.id === 'golf' ? 1520 : f.id === 'stadium' ? 320 : (n.radius || 200));
  const D = n.kind === 'flattest' ? n.d : (f.id === 'golf' ? 1520 : f.id === 'stadium' ? 260 : (n.radius || 200));
  foot.push({ id: f.id, x: s.x, z: s.z, w: W, d: D });
}
const by = {}; let hits = 0;
for (const p of w.plots) {
  const cx = (p.xMin+p.xMax)/2, cz = (p.zMin+p.zMax)/2;
  for (const f of foot) if (Math.abs(cx-f.x) < f.w/2 && Math.abs(cz-f.z) < f.d/2) { hits++; by[f.id]=(by[f.id]||0)+1; break; }
}
console.log('plots inside a feature footprint:', hits, 'of', w.plots.length);
console.log(by);
"
```

---

## 3. Mobile: the nav pad and the dock own the screen

Measured from the CSS, on a 390 × 844 viewport:

| element | where | height |
|---|---|---|
| top bar | `top: 8px`, scrollable | ~54 px |
| welcome card | `top: topbar+10`, `max-height: 44vh` | up to **371 px** |
| status card | below the welcome card | up to 220 px |
| nav pad | `bottom: dock-h + 16` | ~300 px (44 px targets, unscaled) |
| dock | `bottom: 8px`, full width | ~180 px |

That is over 1,100 px of chrome in an 844 px viewport. The canvas is functionally
invisible, and none of it collapses: `#dock-toggle-btn` exists
(`index.html:1282`, handler at `:1990`) but the nav pad has no equivalent, and
nothing starts collapsed.

**What it needs:**

1. **Both panels collapse, and both start collapsed on mobile.** The dock already
   has the mechanism; the nav pad needs the same. Default `dockMinimized = true`
   and nav pad hidden when `matchMedia('(max-width: 768px)').matches`.
2. **A single persistent affordance to bring each back** — a 44 px tab on the
   edge, not a control inside the panel it collapses.
3. **The welcome card's 44vh is the biggest single offender.** On mobile it
   should collapse to its heading plus one line, expanding on tap.
4. **`env(safe-area-inset-*)` is already used** on the top bar and dock — good,
   keep it on anything new.

This one I could have written blind with reasonable confidence, but it is
inseparable from the other two on the same page and wants one verified pass
rather than three unverified ones.

---

## 4. The camera bookmarks: six views, four of them pointing at nothing

`public/world-render-3d.js:1213-1220` is the entire city bookmark set:

```js
this._cityDistrictTargets = {
  town:        { pos: new THREE.Vector3(0, 60, 200 * K),           ... },
  forge:       { pos: new THREE.Vector3(-6200 * K, 30, -2700 * K), ... },
  residential: { pos: new THREE.Vector3(-8400 * K, 25, -5150 * K), ... },
  docks:       { pos: new THREE.Vector3(1100 * K, 20, 2400 * K),   ... },
  watchtower:  { pos: new THREE.Vector3(0, 300 * K, -6000 * K),    ... },
  datum:       { pos: new THREE.Vector3(12100 * K, 40, -4600 * K), ... },
};
```

Six entries, still keyed by the **village's** district names, and only two —
`datum` and `forge` — are refreshed from real feature positions by
`_refreshFeatureTargets()` (line 1704). The other four are literals: hand-typed
coordinates multiplied by `WORLD_SCALE`, aimed at wherever those places happened
to be when the numbers were written.

Meanwhile `public/city.html` carries roughly **forty** real views, and its own
comment at line 266 says they "were measured in the original 48 km world."

So: the standalone city page has forty bookmarks measured for a world that no
longer exists, and the main page has six, four of which point at literals. That
is the whole of "all the views are gone and the ones left are not connected to
where they actually are."

**The fix is the registry again.** A bookmark should name a THING —
`containerPort`, `airport`, `downtown`, `marina`, `theRange` — and resolve its
position at build time from the same source that placed it. `_refreshFeatureTargets`
already does this for two; it should do it for all of them, and the four that
have no feature to derive from (downtown, the western towns, the range) should
derive from `SETT_BY_ID` and the terrain, both of which now exist and are correct.

That also fixes the framing: `dist` is currently hand-tuned per bookmark, and can
instead be derived from the extent of the thing being framed — which is what the
`focusParcel` fix does for plots (`Math.max(120, span * 4)`).

**Verify:** every bookmark should resolve to somewhere the world actually has
something at:
```
node --input-type=module -e "
import { placeFeatures } from './public/features.js';
import { LandField, makeHeightAt } from './public/terrain.js';
const h = makeHeightAt(new LandField(16));
const { sites } = placeFeatures(h);
for (const [k, s] of Object.entries(sites)) console.log(k.padEnd(16), s.x.toFixed(0), s.z.toFixed(0), 'ground', h(s.x, s.z).toFixed(1)+'m');
"
```

---

## Suggested order

The registry is the spine. Everything else is either cosmetic or falls out of it.

1. **Mobile** — independent of all of this, highest value per unit of risk, and
   verifiable by eye on a phone. Do it first because it is the only one that does
   not touch the world model.
2. **Graphics 1b** (log depth buffer) — one flag, then look at the horizon.
3. **The occupancy registry** — the spine. `occupancyAt` / `reserve` / `findFree`,
   with feature footprints reserved before plots are generated.
4. **The bookmarks** — falls out of (3) almost for free, because once there is one
   registry of what is where, a bookmark is a lookup rather than a literal.
5. **Graphics 1a** (fragment-shader waterline) — independent, and the one that
   fixes what you actually see when you move the camera.

(2) and (5) can be done by anyone at any time. (3) and (4) want one lane and one
re-baselining pass, because reserving ground changes the plot count and every
generated artefact and budget downstream of it.
