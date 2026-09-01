# CALIPER — the world

A 40 km coastal region generated from one plan. Terrain, coastline, road network,
block subdivision, plot classes, buildings, vegetation and props all derive from
data; the renderer draws whatever the plan says and owns no geometry of its own.

Open it at **`/city.html`**.

---

## Why it was rebuilt rather than patched

The previous world was a set of flat extruded plates with cones stood on them and
every road, kerb and seawall carrying its own hardcoded coordinate. Nothing could
reason about it: a visitor asking to "make that lot bigger" had nothing to change,
and every visual fix was a hand edit that drifted the numbers apart by metres.

Three things had to become true, and none of them was a tweak:

1. **The ground has to exist.** There is now one height function over the whole
   40 km. The shoreline is simply where it crosses y = 0, so beaches, shallows,
   headlands, hills and the range fall out of it instead of being drawn
   separately and lined up by hand.
2. **The city has to be a plan.** Roads have rights-of-way, blocks are what is
   left between them, plots have real minimum and maximum sizes per class, and a
   district declares the class its blocks are cut into.
3. **Buildings need silhouettes.** A box with a slightly larger box on top reads
   as a bar chart at any distance. Every class now has an archetype.

---

## The files

| file | what it owns |
|---|---|
| `public/city-plan.js` | The world as data. Land masses, coastline control points, road hierarchy, block grid, plot classes, districts, settlements, highways, causeways. Pure; no THREE, no DOM. |
| `public/terrain.js` | One height function. Deterministic noise, the land field (coast index), the relief tiers, ground colour bands. Pure. |
| `public/noise.js` | One deterministic value-noise implementation, shared by the terrain and the plan. Its own module because the plan needs it and terrain imports the plan — copying it would drift, importing it would cycle. |
| `public/buildings.js` | The archetype library: ten plot classes, each emitting real parts. Pure — data in, parts out. |
| `public/city-render.js` | Draws the plan. Terrain meshes, water, roads, instanced buildings, vegetation, props, sky and lighting. |
| `public/city.html` | The viewer: camera rig, named views, post-processing. |
| `scripts/shoot.mjs` | Renders the world headlessly and writes PNGs. |
| `scripts/check-parts.mjs` | Dumps building-part statistics without a GPU. |
| `test/cityWorld.test.ts` | The invariants. Every one is a defect that actually shipped. |

---

## The world, measured

```
world            40 km square
land             14 masses; the downtown island, the ocean barrier crescent,
                 the mainland with two peninsulas, the six-island Venetian
                 chain across the bay, and four outer keys
land areas       downtown island 13.41 km2 (4.2x its old size), barrier
                 crescent 27.12, North Key 5.04, West Key 4.86, the six
                 Venetian isles 0.32-0.44 each; mainland 1,854 km2
coast            two peninsulas -- Westhead and Eastpoint -- reaching 5.5 km
                 into the ocean, with Long Bay, the river mouth and the
                 harbour bitten into the shore between them
cliffs           declared on the ocean-facing headlands: 90 m of ramp
                 carrying a 75 m lift, which the mesh resolves as rock
harbour          1.68 km across (Victoria Harbour is ~1.5 km)
range            peaks to ~2,170 m, 12-20 km inland, snow above 1,480 m
settlements      30
parks            22 blocks, plus a stadium, a station, a cathedral and a mast
bridges          20, north-south and east-west -- every land mass reachable,
                 verified by a union-find over the crossing graph
blocks / roads   2,507 / 744
plots            31,510
buildings        ~31,600 placed, ~163,000 parts, 14 instanced meshes
trees            ~17,800, including garden trees on low-rise plots
traffic          26,000 vehicles, on every road including the bridges
people           15,800 on footways, promenades and beaches
marina           dredged basin, breakwater, 109 boats, clubhouse, hardstanding
terrain          ~198,000 vertices across two resolutions (40 m core, 200 m outer)
roads            ~245,000 triangles of terrain-following ribbon
build time       ~2.0 s
```

---

## Techniques that carried the most weight

**Aerial perspective.** Exponential-squared fog matched to the horizon, tuned so a
3 km city is untouched and a 15 km mountain is a third sky. This is the single
biggest difference between a render that looks like a model and one that looks
like a landscape.

**Storey banding.** One procedural texture, three repeat tiers by building height
so a storey stays about 3.5 m whether the building is 30 m or 260 m. Without it a
box has no scale at any size.

**Centrality.** Building height is scaled by distance from a settlement's centre.
A uniformly random skyline is a comb; a peak with shoulders is a city, and it is
what you read from ten kilometres away.

**Transparent water over a modelled sea bed.** Depth then comes for free and is
correct — sand shows through the shallows as turquoise, the shelf edge reads as a
line, the deep bay goes blue — instead of three hand-placed rings of coloured
plastic kept in register with a coastline they knew nothing about.

**Blend relief by max, not by sum.** Hills, the foothill swell and the alpine
range each dominate where they belong and hand over smoothly in between.

**A crescent, not a strip.** The barrier island bows seaward and its tips curl
back toward the mainland, enclosing a lagoon — a bay-mouth bar, which is how
these actually form. Both tips are bridged to the mainland, so the lagoon is a
ring you can drive around rather than a strip reachable only from downtown.

**Bridges are roads.** A crossing is entered in the road network like any other
road, so the carriageway, footways, markings, lamps and traffic run across it and
join the grid at both ends. The deck height is a profile along that road: the
greater of the ground plus a kerb, and a ramp between the shores plus an arch
over the measured water span. The span is measured from the terrain, so a bridge
cannot drift off its own shoreline when a coast is reshaped.

**Five tower forms.** Setback, taper, twist, slab and crown, chosen by hash.
A downtown of nothing but setback boxes is a bar chart with a haircut; it is the
mix of silhouettes that makes a skyline legible from across a bay.

**A coast, not a wall.** Two arms reach south into the ocean so the island chain
lies in the embayment between them. The shoreline is splined; the closing corners
thirty kilometres north are not, because a Catmull-Rom through those overshoots
and swallows the island.

**Cliffs where cliffs belong.** The shore profile varies along the coast: exposed
headlands climb out of the water in 90 m carrying a 75 m lift and read as rock,
sheltered bays ramp over 190 m and read as sand. Islands get 60% of the mainland
ramp — a continental beach around a 2 km island drowns most of its rim.

**Dredged basins.** A marina cut into a shore that ramps over 190 m fills with
sand, not water; the first attempt came out 2.5 cm deep. Basins are declared with
a depth and a hard lip, which is also what makes the quay wall sharp.

**A colour grade after tone mapping.** ACES protects highlights by desaturating
and lifting toward grey, which is right for photography and wrong for a stylised
city — the whole world came out chalky and no palette work upstream can fix what
the curve does downstream. Saturation, an S-curve about mid-grey, and a warm
highlight / cool shadow split put the colour back.

**The island is derived, not declared.** Its bounding box comes from the
coastline, and the eleven districts are fractions of that box rather than eleven
hardcoded rectangles. When the island was 2.9 x 1.3 km every district was written
against those numbers by hand, and twice a gap opened between two of them that
generated no blocks at all — the island had a bite out of it and nothing said so.
Fractions cover [0,1] by construction. That is what made it possible to quadruple
the island in one edit.

**A beach cannot be wider than its island.** One shore-ramp factor for every
non-mainland mass is right for a 4 km key and absurd for a 400 m one, where a
114 m beach drowns most of the interior. The factor now scales with the square
root of the mass's area.

**Density is a FIELD, not a rectangle.** A district used to be a rectangle and
every block inside it was cut into the same plot class — which is why the city
read as blocks of uniform stuff with hard seams: a wall of towers stopping dead
against a field of identical houses, along a line no real city has. Land value
now peaks at the CBD and four sub-centres, is bid up along the waterfront, falls
off with distance, and is jittered per block — so classes MIX at every boundary.
Towers with mid-rise between them, mid-rise thinning into terraces, and the odd
tall thing on its own where somebody paid too much for a site. Districts still
name the place, set its character and forbid what does not belong; they no longer
dictate every block. Measured: 1.8 different plot classes per 600 m cell.

**Thresholds, not equal bins.** Land value is not linear in built form — the step
from a house to a terrace is small and the step from mid-rise to a tower is
large. Equal bins put TOWER at v ≥ 0.8, which almost nothing reached: the whole
island came out with thirty towers in it.

**Colour runs in neighbourhoods.** A per-building hash spreads a fourteen-colour
palette evenly over every street, which is salt and pepper — statistically varied
and nothing like a city. The palette index comes from smooth noise over POSITION
with only a little per-building jitter, so streets are built in runs the way real
ones are.

**Parks, and things that are only there once.** Blocks the plan marks as PARK are
drawn as parks — lawn, pond, gravel paths, canopy, benches — and the island has a
stadium, a central station with a train shed and clock tower, a cathedral on the
civic square and a broadcast mast on the hill behind. A skyline of nothing but
commercial floorspace has nothing to navigate by.

**Highlight roll-off in the grade.** The contrast curve pushed the sky and the
specular glint on the water straight to white, and a blown horizon is the first
thing that reads as "render" rather than "place".

**An archipelago, not three ovals.** Six bay islands strung across the inner
harbour — Gull, North, East, West, Sandspit and Cormorant — each bridged to its
neighbours or to both shores, so the chain is a route you can drive rather than a
set of places you can only look at. Sandspit and Cormorant close the western end,
which turns the water behind them into a shallow lagoon.

**East-west bridges.** Half the gaps in an east-west archipelago are east-west,
and the bridge model only understood north-south, so the only way from one key to
the next was back via the mainland. A crossing now carries an axis.

**Two rows per block.** Blocks build from both streets and meet along a rear
boundary. A single front row left a 152 m deep block with 90 m of dead ground
behind it, which from street level read as a city standing in a field.

---

## Defects found and fixed in this pass

Each of these is now an assertion in `test/cityWorld.test.ts`.

| defect | symptom | cause |
|---|---|---|
| Argument order in `emitBuilding` | Renderer stopped returning frames entirely | The ground height was passed where `z` belongs, shifting every parameter by one. 77,760 of 94,629 parts got negative scales, down to −8,783 m. Nothing in the scene graph looked wrong. |
| Black environment map | The entire world rendered as an unlit silhouette | `PMREMGenerator.fromScene` captures with a near/far of 0.1–100 and the sky sphere is scaled to 312,000, so it saw nothing. three.js then multiplies that black map into every material — including `MeshBasicMaterial`. Every light, colour and normal was correct the whole time. |
| Sun placed relative to the camera | No shadows anywhere; flat, "flash photograph" lighting | The shadow frustum was made to follow the view, and the light position was moved with it. The sun ended up behind the camera on most views, so every shadow fell directly away from the viewer, hidden by the thing casting it. |
| Range and summits summed | A 4,040 m coastal wall, higher than anything in the Rockies | Ridge band and named peaks added instead of blended by max. |
| Sea bed composed as `min(shelf, deep)` | A submarine cliff one metre off the beach | Two curves minimised instead of one continuous one. |
| Harbour Isle inside the mainland | An island whose own centre was under water | Moving the mainland in to narrow the harbour swallowed it. Land masses must not intersect. |
| Height jitter below archetype minimum | A wall scaled to −0.30 m | Every archetype subtracts a podium or shopfront band from the total height; the floor was applied before the jitter, not after. |
| 16× anisotropy on window textures | Sixteen texel fetches per fragment on grazing tower faces | Capped at 4×, visually identical here. |
| `RoundedBoxGeometry` for every part | An 11-million-triangle scene | ~120 triangles per part where a box is 12, for a 5 cm bevel nobody can see. |
| Gantry cranes at a fixed z | Eight cranes standing in open water | The mainland coast has a bay at the port end; the shoreline there is hundreds of metres further north than the constant assumed. They now walk north to find the quay. |
| Settlements filled their bounding rectangle | From altitude the region read as a zoning map | 100% density edge to edge, hard rectangular boundaries. Density now falls off elliptically with a ragged, deterministic boundary. |
| Five roof colours, three of them red | Nine thousand suburban houses read as one red carpet | Palette widened to nine, with slate, metal and weathered grey. |
| ~3,000 loose meshes for ten bridges | Wide views stopped returning frames entirely | Built the obvious way — one Mesh per soffit box, parapet segment, pier, stay and arch segment. All bridge structure is now merged into two buffers. |
| Rectangular world edge | A green rectangle with square corners sitting in the ocean | The edge fade took `min(dx, dz)`, which fades inside a box. It is now a cubic superellipse with a low-frequency wobble, so the far coast has bays and headlands. |
| Islands placed by eye on top of each other | An island whose interior was 11% under water; a barrier vertex inside a key | Three separate collisions this pass — east-key on the barrier's arm, Sandspit on its west tip, Cormorant on the Long Bay shore. Each was found by the land-mass overlap test in seconds, not by looking. |
| Bridge anchors guessed at | Three crossings starting in open water | Every anchor is now scanned against the terrain before it is trusted, and a test asserts land at both ends and water between. |
| Land masses wound both ways | Surf ribbons offset inward, across the beach, on half the world | The masses were authored at different times; `offsetPolygon` derives its outward normal from the winding. Winding is now normalised in one place. |
| Hard colour bands on the sea bed | A jagged dark band lying across the bay | Where the 40 m core grid meets the 200 m outer grid the two disagree about depth by a couple of metres — nothing, except that it flipped whole 200 m triangles across the −11 m band threshold. Ground colour is now interpolated. |
| 240 m terrain skirt | A dark wall standing in the water at the edge of the modelled core | The skirt only has to cover the height discrepancy at a resolution seam, which is metres. |
| Coarse terrain casting shadows | Polygonal self-shadow patches on the sea bed | At 200 m a triangle is far larger than the shadow-map texels it lands in. The coarse grid no longer casts. |
| Three shades of teal for resort roofs | The entire beachfront read as blue | Plus pools sized like tarpaulins. Both fixed. |
| No vegetation inside any settlement | Every town a carpet of roofs | The landscape pass skipped settlement interiors to avoid planting through buildings. Low-rise plots now get a garden tree at the rear corner, where it cannot land on the street. |
| World ended in a 300 m cliff | The mainland visibly stopped | The polygon closed at z = −24,000. It now runs to −33,500, past where haze closes it. |

---

## Verification

- `node test/run.mjs` — **224 tests, 0 failures** (216 pre-existing, unmodified),
  including a graph test that proves every land mass is reachable by bridge.
- `npx tsc --noEmit` — clean.
- `node scripts/shoot.mjs` — renders 16 named views headlessly through Chromium
  and SwiftShader, so the world can be looked at before it ships rather than
  after someone deploys it.

The screenshot loop is the process change that matters most here. For a long
stretch the only way to judge a change was to ask someone to deploy it and look,
which is slow and spends someone else's attention on things a screenshot settles
in ten seconds. Two of the defects above — the black environment map and the
missing shadows — were invisible to every test and obvious in one image.

---

## Not done yet

- **The pipeline still edits the OLD world.** `world-render-3d.js` and
  `sim-baseline.generated.js` remain the model the change pipeline grounds
  against, edits and verifies. Fusing the two — making a visitor's request edit
  *this* plan — is the next phase and the one the whole thesis rests on. It
  touches the nine regression checks, so it wants its own pass.
- Environment map is off: the guard in `city-render.js` refuses an environment it
  cannot verify carries light, and the readback is unsupported under SwiftShader.
  Direct and hemisphere lighting carry the scene without it.
- Trees are spheres and cones, not species.
- The hinterland is still the weakest read at full-region scale: settlements are
  ragged patches on green rather than towns following roads and terrain.
- No night cycle; the lamps exist but are not lit.
