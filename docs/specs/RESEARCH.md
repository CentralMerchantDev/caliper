# RESEARCH — CALIPER

**Extracted 2026-09-16 from `docs/specs/REBUILD-PLAN.md` (now retired).** This
file holds the §R, §A, §L and §T findings, **lifted intact** — not re-derived,
not re-worded, not summarised. Section numbering is preserved exactly so
`docs/specs/PLAN.md`'s citations resolve. Everything else `REBUILD-PLAN.md`
carried (the phase-by-phase plan, the three layers of correction on top of it)
is superseded by `docs/specs/PLAN.md` and is not carried forward — per
`rule://reference-not-copy`, this document is research, not plan.

---

## RESEARCH FINDINGS — 2026-09-11, four parallel threads

Sourced before building, per Mark: *"this is where it fell apart the first time — we
didn't do that first."* Every number below carries a source. Where research found
none, it says so, and **no figure may be invented to fill the gap** (`rule://` Zero,
and the two unsourced thresholds retired today).

### R1. The look failure is LIGHTING, not geometry — the highest-leverage finding

A blockout is *defined* as "simple 3D shapes… not textured, not lit, not detailed,"
with flat prototyping colour on ground and walls. That is a literal description of
the current build.
https://book.leveldesignbook.com/process/blockout

Valve's *Illustrative Rendering in Team Fortress 2* (NPAR 2007, peer-reviewed,
first-party) gives the implementable fix: shadows shift **warm→cool, never to
black**; saturation **increases at the terminator**; silhouettes read via **rim
highlights, not dark outlines**; **Half Lambert — scale N·L by 0.5, bias by 0.5,
THEN SQUARE**; ambient bounce is "critical to truly grounding" objects.

**CORRECTED 2026-09-14. This line omitted the square since the day it was
written.** Verified against the paper: its own slides state Half Lambert
*"scales the -1 to 1 cosine term by ½, biases by ½ and squares to pull the light
all the way around,"* and the text calls out *"the scale, bias and squared
lobes."* So the term is `(0.5·(N·L) + 0.5)²`, not `0.5·(N·L) + 0.5`. Implemented
as written, the shadows come out flatter than intended on the one phase this
document says is won or lost — and nobody would ever trace it back to a missing
exponent.
https://steamcdn-a.akamaihd.net/apps/valve/2007/NPAR07_IllustrativeRenderingInTeamFortress2.pdf

Alba reached the same place from solid colours: they needed "more definition into
the shadowed areas" and used a gradient colour ramp, **no normal maps**.
https://medium.com/@ustwogames/the-environment-art-of-alba-a-wildlife-adventure-6bddd8b56955

**Four mechanisms, zero geometry change:** warm→cool terminator · rim/edge
separation · contact darkening (AO) · value difference between top and side faces.

### R2. Variation numbers are FAR lower than intuition — this answers Mark's Q2

- Firewatch shipped **23 unique tree models** for the entire game, ~4,600
  placements, trees filling half the screen. Jane Ng: *"if you can get away with
  23 trees, don't make 25."*
  https://www.gamedeveloper.com/design/environmental-artist-jane-ng-only-made-23-unique-trees-for-i-firewatch-i-
- Eastshade: *"I got really far with only four broadleaf variants (eight including
  dead versions)."* Advice: start with **one**, test it in a real scene first.
  https://www.gamedeveloper.com/art/art-tips-for-building-forests
- All of Caravan SandWitch's foliage is **39 props**.
  https://charlesboury.fr/projets/caravan-sandwitch.html

**Variation comes from placement and shader, not model count.** The current
problem is not "one cone" — it is one cone with no clustering, no scale or
rotation jitter, no dead variant, no colour variation.

**And the budget is inverted from intuition.** Bethesda, GDC 2013: *"players were
quicker to react negatively to repeated detail elements, as opposed to broad
architectural repetition… you're more likely to pick up on repeated clutter
first, then the repeated architecture."*
http://blog.joelburgess.com/2013/04/skyrims-modular-level-design-gdc-2013.html
→ **Spend variation on props, colour and ground-floor treatment before spending
it on more building meshes.**

### R3. Footprints — a published minimum, and the real cost driver

Cities: Skylines, official publisher wiki: *"To allow zone blocks of any shape to
be filled requires buildings of at least sizes **1x1, 2x2, and 3x2**. If any of
these is missing, parts of a zone block may never have buildings spawn… Other
sizes, such as 4x4, will add to the variety, but are not absolutely necessary."*
https://skylines.paradoxwikis.com/District_styles

The cost is not the footprint, it is that *"buildings can only upgrade to another
building of the exact same size"* — **every footprint needs a full variant set.**

Hard rule, Bethesda GDC 2013: **footprints must be multiples of each other.**
*"a 512x512x512 room will always tile nicely with a 256x256x256 hallway, but a
384x384x384 room will eventually create gaps."* And *"level designers tend to
build on a grid snap setting of one-half the size of the footprint."*
https://www.gamedeveloper.com/design/skyrim-s-modular-approach-to-level-design

Cities: Skylines II: cell **8×8 m**, min lot 1×2, max zoned 6×6.
https://cs2.paradoxwikis.com/Asset_Pipeline:_Buildings

### R4. Junctions are GENERATED, not authored — overturns PIECE-CATALOGUE-ROADS.md

Colossal Order's own deep-dive: roads are **nodes + segments**, geometry made from
a static mesh plus a vertex shader driven by spline data, and *"intersections are
created using a similar approach."*
https://www.gamedeveloper.com/design/game-design-deep-dive-traffic-systems-in-i-cities-skylines-i-

The modding side converged independently, and quantifies the alternative. SimCity
4's NAM: *"making new interchanges was an extremely difficult task, taking a team
of people several months to make just one"*; the third took **nearly two years**;
prefabs would have needed *"hundreds, if not thousands."* Their fix is overridable
FLEX pieces that conform to whatever connects into them.
https://simtarkus.wordpress.com/2013/10/13/the-philosophy-of-the-rhw-realhighway-system/

**Both the transition-tile rule and the enumerate-every-mixed-junction approach
debated on 2026-09-11 were wrong.** Junctions are generated from per-arm class
flags. `PIECE-CATALOGUE-ROADS.md` §5 must be rewritten.

### R5. The perf thresholds, finally sourced

| Old, invented | Sourced replacement |
|---|---|
| `draw calls <= 900`, "Hard assertion budgets" | **< 500 (OpenGL ES, which WebGL maps to)**, Arm GPU Best Practices Rev 3.4 §3.2 · < 100 mobile / < 1000 desktop, donmccurdy |
| `triangles <= 12000000` | **A no-op** — 2× above the only forum threshold, 23–58× above Arm's fragments-per-triangle rule at 1080p. Retire or replace. |

Arm: https://documentation-service.arm.com/static/67a62b17091bfc3e0a947695?token=
donmccurdy: https://discourse.threejs.org/t/bad-performance-when-loading-more-than-3500-meshes-into-the-scene/63960/4

### R6. InstancedMesh can be SLOWER than naive meshes — our exact symptom, measured

On a Quest 2, the official three.js instancing example ran **~85 FPS naive vs ~55
FPS instanced** with ~2,600 instances. Cause: naive mode frustum-culls per mesh;
instanced mode submits every instance.
https://vrmeup.com/devlog/devlog_10_threejs_instancedmesh_performance_optimizations.html

**Core three.js already solves this**: `BatchedMesh` has `perObjectFrustumCulled`
defaulting to **true**, plus per-geometry bounds.
https://threejs.org/docs/pages/BatchedMesh.html

The library alternative, `@three.ez/instanced-mesh`, uses an indirection buffer
plus a **BVH over per-instance AABBs** — notably, **nobody serious uses fixed-size
chunks**. Requires three.js r159+.
https://discourse.threejs.org/t/three-ez-instancedmesh2-enhanced-instancedmesh-with-frustum-culling-fast-raycasting-bvh-sorting-visibility-management-lod-skinning-and-more/69344

Caveats before adopting `BatchedMesh`: a known WebGL multidraw bottleneck, and
poor Firefox support as of mid-2025. Both cited in the thread above.

### R7. Placement — the minimum is small, and undo is not in it

Tier 1: palette → tool mode · ghost snapped to the cell showing the **footprint**
· binary validity evaluated continuously, click inert when invalid · commit ·
cancel · **remove**. Cities: Skylines sold millions with a bulldoze tool and **no
undo at all** — `Ctrl+Z` appears only under map-editor controls.
https://skylines.paradoxwikis.com/Controls

Highest-value single addition, Factorio's kovarex: *"The most frequent thing I'm
missing is the fast replace… Adding the feature for just this one case opens the
floodgates."* https://www.factorio.com/blog/post/fff-362

Touch: **the drag is the hover substitute and a checkmark is the click
substitute** (SimCity BuildIt, first-party). Or Townscaper's tap-to-place with a
deep undo stack. Pick one; one-finger drag cannot be both camera and piece.
https://help.ea.com/en/articles/simcity/simcity-buildit/beginner-guide/

**And the encouraging precedent:** *The Block* shipped a commercial city builder
in **four weeks** whose entire mechanic is placing blocks. The top complaint was
not feel — it was that placement lacked *consequence*.
https://www.gamedeveloper.com/design/postmortem-bitesized-city-builder-i-the-block-i-
Citystate II's postmortem, after two simulation-first failures: *"I start by
implementing construction and customization tools first."*

### R8. Joins — the named answer to the worst visible failure

Oskar Stålberg (Townscaper): *"interesting things happen where different things
meet… Where you want to put the details is where the wall meets the floor."*
https://mcvuk.com/business-news/when-we-made-townscaper/

The cheap version, Level Design Book: let modules intersect, then **cover the
intersection with another object** — a wall, pillar, rock, crate, car.

Three tiers, cheapest first, for every placed object: contact darkening baked into
the lower mesh → a ground decal sized to the footprint → a modelled skirt or
plinth. Every linear surface (road, path) is **three parts**: surface, an edge
strip wide enough to hold the transition noise, and edge decals — blended with a
height/noise mask, **never a plain lerp**. Water is four: deep colour, shallow
colour, a foam band driven by **world-Y-reconstructed depth (not raw camera
depth)**, and a modelled shoreline strip dressed with rocks.
https://www.cyanilux.com/tutorials/shoreline-shader-breakdown/

### R9. Building massing — three rules that survive any poly budget

**Base / middle / top**, three stacked masses, visible *especially in blockout*.
https://www.chrisalbeluhn.com/visually-appealing-building-guide

**The ground floor is its own piece class** — sourced twice, and the rule low-poly
city builders universally break. LA's adopted design code: *"An identifiable break
should be provided between a building's retail floors and upper floors."*
https://www.urbandesignla.com/resources/docs/DowntownDesignGuide/hi/DowntownDesignGuide-CH06.pdf

**Architecture is modelled, clutter is a prop.** Colossal Order, as policy:
windows, frames, doors, gutters and chimneys are modelled; *"air conditioning
units, fire-escapes, ventilation pipes, mailboxes etc. are best made as props…
Any detail that can be a prop, should be considered as a prop."* Plus the **5 cm
rule**: details under 5 cm of depth do not change the silhouette.
https://cs2.paradoxwikis.com/Asset_Pipeline:_Buildings

Real proportion numbers from adopted code: towers read best at **3.5 : 1** height
to width; low-rise < 6 storeys, mid-rise 7–20, high-rise > 20; a step-back of
**less than 15 ft reads as one mass**, more reads as two.

### R10. Density gradient — a real, numbered framework

The rural-to-urban **Transect**: six zones, T1 natural through T6 core, with T2/T4/T6
as deliberate **ecotones**. Duany: *"the richness is always at those overlapping
edges. The rest is close to monoculture."* Adopted code gives a storey ladder —
T3 max 2, T4 max 3, T5 max 4 or 6.
https://www.cnu.org/publicsquare/2017/04/13/great-idea-rural-urban-transect

→ Ship a **discrete band gradient with a deliberate T6 outlier**, put the visual
richness in the transition bands, and let core and fringe stay comparatively
uniform. And drive variation from **world position** (distance to water, to
centre, to district edge) rather than per-instance random — Horizon Zero Dawn's
approach. Same cost; reads as geography instead of noise.

### R11. What research explicitly could NOT source — do not invent these

A numeric repeat threshold ("how many buildings before it shows") · number of hues
in a limited palette · number of value steps · saturation ceilings · "±X% scale
randomisation" as an art rule · optimal block size in metres · floor-to-floor
height in a game context · a chunk-size heuristic for instanced scenes · a texture
count or memory budget.

---

## ARCHITECTURE DECISIONS — 2026-09-11, from research

Two more research threads, ~90 tool calls, on **how to build it** rather than how
to make it look right. These are decisions, not options. Each carries its source.

### A1. BUILD ORDER — sandbox first, simulation second. Not contested.

The only developer who wrote a postmortem specifically about this question
concluded *"I start by implementing construction and customization tools first"*
and that *"the hardest part in making a city builder is not the gameplay loop,
simulation systems, optimizations or graphics — it's the tools."* He shipped the
deepest economic simulation in the genre and reports players **disregarded its
central system entirely**; ten updates and hundreds of bug fixes did not move the
review score.
https://www.citystategame.com/post/citystate-ii-postmortem-a-lesson-in-game-design-for-city-building-games

Introversion spent **six years** on procedural world plus deep simulation and
produced no game — *"we had more fun making the game tech than players would ever
have playing it."* The pivot came from noticing he spent longer arranging a
prison in the **map editor** than playing the mission: the placement tool was the
game. Six weeks later they had more game than six years had produced.
https://www.pcgamer.com/introversions-chris-delay-on-shifting-from-subversion-to-prison-architect-i-wanted-to-build-alcatraz/

Stonehearth's own closing post names the same failure: technical focus distracted
from the design, producing a core loop they call uneven and clunky — and by the
time it was visible, fixing it *"would have taken a rewrite and maybe years."*
https://www.stonehearth.net/leaving-the-nest/

### A2. THE MINIMUM VERTICAL SLICE — five things, and the fifth is the one skipped

1. A **board addressable by cell**.
2. A **catalogue** of pieces with different footprints.
3. A **ghost that follows the cursor**, visibly legal or illegal.
4. **Commit** — the piece is in board state, permanently addressable.
5. **A reason one cell beats another.**

The Block shipped a commercial city builder in **four weeks** with placement
running on day one; ~7,000 units in month one. Its developer's own named regret
is exactly item 5: *"many players felt the positioning of buildings should hold
more meaning"* — and he says fixing it needs a **larger possibility space**, not
more mechanics.
https://www.gamedeveloper.com/design/postmortem-bitesized-city-builder-i-the-block-i-

Item 5 is cheap. Dorfromantik's entire legality rule is *place anywhere touching
one existing tile; water and rail may not dead-end at an edge*, and its entire
reward rule is *count matching edges*. That game won Best Game Design at the
Deutscher Computerspielpreis. Its core was complete after a **two-day** game jam.

### A3. THE BOARD DATA MODEL — RimWorld's double pattern

**Footprint is DERIVED, never stored.** `OccupiedRect(center, rot, size)` — three
fields, recomputed on demand. A dense occupancy grid is maintained as an **index**
into it, holding the building's integer ID in **every covered cell**, giving O(1)
reverse lookup.
https://github.com/josh-m/RW-Decompile/blob/master/RimWorld/GenConstruct.cs

Every shipped game surveyed runs a dense grid *and* an entity list, linked by an
integer index — OpenTTD, Factorio, RimWorld, Dwarf Fortress, Minecraft. It is not
a choice between them.

**Typed arrays, addressed `y*width+x`. No object per cell, no `Map` keyed by
`"x,y"`, no sparse arrays.** V8 documents the trap: *"once a hole is created in an
array, it's marked as holey forever, even when you fill it later"* — with a
measured **6× loop slowdown** from one off-by-one read.
https://v8.dev/blog/elements-kinds

**Validity is revalidated when the anchor or rotation changes, not per frame.**
Cities: Skylines precomputes into four `ulong` bitmasks per 8×8 block and consumes
them with one AND. RimWorld brute-forces the rect with early-out and gets away
with it because footprints are tiny.

### A4. SAVE = SEED + PLACEMENTS. This names the 7.5 MB JSON's actual defect.

Minecraft keeps the seed and generator in `level.dat` and the *edited* state in
region files — two files, two lifetimes: the recipe, and the exceptions to it.
Factorio's map costs nothing until a chunk is touched. Townscaper does not store
its grid at all; it is a pure function of `Hash(hex)`.

The research's verdict on what we built: **"a snapshot with no producer and no
consumer."** The generator was discarded, so the generated state had to ship
whole. Three properties every shipped format has that it lacked: the generator is
retained and rerunnable · the generated layer and the edited layer are separable
· the board is addressable by cell at runtime, not merely serialisable.

**No shipped tile builder in the corpus uses an event log as its save format.**
NO SOURCE FOUND for one — do not invent the pattern.

### A5. WHAT KILLS THESE PROJECTS — and one entry names us exactly

Ranked by how many independent projects state it in the developers' own words:

1. **Technical/correctness work substituting for design direction** — three
   independent first-person accounts (Radiant, Introversion, Gaslamp).
2. **The content pipeline is the real cost**, and it kills you later than the
   engine does. Radiant's third named mistake was that their own engine meant
   *designers and artists struggled to add content*.
3. **The restart window closes.** Inability to course-correct is the proximate
   cause of death, not the original decision.
4. **Additive development on a previous prototype** — but note the counter-case:
   Introversion carried *code* forward successfully. **Carrying direction forward
   is the failure, not carrying code.**
6. **Generator before edit loop — supported by exactly one project in the entire
   corpus: Subversion.** Quoting the research: *"It is the specific thing you did,
   and it has one named precedent. You do not need a second data point."*

### A6. FOOTPRINT GEOMETRY — axis-aligned rectangles on a regular grid. Locked.

Ostriv's solo developer enumerated what one step beyond that costs: going from
convex four-sided buildings to arbitrary concave polygons forced triangulation for
pavement, a full replacement of the selection-outline shader, refactors of **both**
picking and overlap-checking, new bounding-box pre-tests, **a new micro-level
pathfinding system**, and regeneration of construction-site flags.
https://ostrivgame.com/alpha-5-patch-9-hotfix-55/

**Decide it once, in the spec, and make it the narrowest thing that supports the
game.** No non-rectangular and no off-grid footprints in v1.

### A7. STACK — stay on three.js, and adopt the disciplines the other engines
give for free.

**The research ranked PlayCanvas first**, on the strength of being the only engine
that publishes a mobile draw-call budget in its own docs (**100–200 for low-end
mobile**), a 5-second load-time target, and ships Basis transcoding, staged
preloading and device-pixel-ratio control as documented first-class features.
https://developer.playcanvas.com/user-manual/optimization/guidelines/

**It ranked three.js + react-three-fiber second, and that ordering does not
survive contact with this project.** The agent did not know that the **shell is
being kept** — Orbit/Walk/Drive/Fly, the inspector, picking, the day-night clock,
the lighting and the panel system are all hand-rolled three.js and are the one
part of the world layer that works. Moving engines discards them. R3F is also a
rewrite of that shell, in a different paradigm.

**Decision: stay on hand-rolled three.js. Steal PlayCanvas's discipline
explicitly** — adopt its published budgets and its four pipeline features as
requirements rather than inheriting them from a framework:
- **< 200 draw calls** as the mobile target (PlayCanvas), against Arm's < 500 for
  OpenGL ES. Both sourced; use the stricter.
- **Load in under 5 seconds** or show a playable title screen while loading.
- **Basis/KTX2 texture compression** — measured 6× VRAM reduction, 202 KB → 46 KB
  download on a 512×512.
- **Device-pixel-ratio control** on mobile.

Explicitly rejected, both with dated evidence: **Godot web export** (~40 MB
uncompressed wasm for an *empty* 4.3 project, 5 MB Brotli, and a 2D clicker
crashing on every mobile browser tested from June through Sept 2025 including 4.5
beta) and **Unity WebGL** (no managed threads, no VS debugging for web builds, no
engine caching API, non-deterministic physics versus the Editor).

### A8. STYLE COHERENCE IS A SHADER PROBLEM — ten accounts, none fixed by geometry

This is the highest-leverage finding in the content half, and it is a negative
result against the obvious hypothesis.

> *"the first thing I did was to replace all of the shaders with the custom
> softlight shader I made for my game. **That made the assets a lot more cohesive
> just by itself.**"* — props from four different packs

Independently confirmed by an outside reviewer **before** the method was
disclosed: *"i am very impressed that you managed to use downloaded assets in such
a good way. Everything really blends together."* → *"I'm using the same Shader for
all assets. That's why they blend together even when they are from different
creators."*
https://discussions.unity.com/t/assets-packs/912238 · https://itch.io/post/4389212

**"One vendor equals consistent" is also false** — a measured texel-density audit
found a **22× spread inside a single pack**.

**Nobody in any of these accounts fixed a style clash by editing geometry.**
Material response, not triangle count, is what reads as "different artist."

### A9. THE ART COMES FROM CC0 PACKS, UNIFIED BY ONE MATERIAL

Roughly **1,000 city-relevant meshes, $0, no attribution required**:
Kenney's City Kits (roads 90 files, suburban 40, commercial 50, industrial 40),
Modular Buildings (100), Nature Kit (**330**) — all CC0 1.0.
Quaternius **Downtown City MegaKit, 315 models**, May 2026, *"all models share
optimized texture sets."*
https://kenney.nl/assets/city-kit-roads · https://quaternius.com/packs/downtowncitymegakit.html

**Kenney's own import guide contradicts the common belief that his packs share one
palette:** *"Each asset pack requires its own texture(s)."* Budget a one-off
Blender batch script remapping every pack's UVs onto **one shared palette atlas**
— roughly ten colours in a small PNG, **nearest-neighbour filtering**. That script
*is* the coherence fix.
https://kenney.nl/knowledge-base/game-assets-3d/importing-3d-models-into-game-engines

Use **GLB, not FBX** — same features, smaller, per Kenney. Disable "Recompute
Normals"; flat shading breaks if the engine re-derives them.

**Do not buy Synty** ($19.99, 331 assets) — it ships as Unity/Unreal/Godot
projects plus FBX, so you convert to GLB yourself and lose the shaders, which is
most of what you paid for.

### A10. AI MESH GENERATION — NO. The vendors' own docs are the evidence.

Meshy's own remesh guide: *"AI-generated models typically have excessive triangles
and irregular topology."* Independent teardown with side-by-side wireframes:
*"triangle soup… **It is actually faster to rebuild the entire model from scratch
than to try and fix the AI's topology**"* and *"**Consistency also appears to be a
myth in 3D generation.**"* Textures arrive with baked-in lighting — disqualifying
for flat shading specifically.
https://docs.meshy.ai/en/webapp/guides/3d-model/remesh · https://aircada.com/blog/ai-vs-human-3d-ecommerce

**The only documented batch-consistency success works by voxelising the output**
— that is, deleting the generated geometry and keeping only the silhouette idea.

Every requirement here — consistent scale, consistent style across dozens of
pieces, clean flat-shaded grid-snapping geometry — maps onto the three things the
2026 evidence says AI 3D is worst at.

### A11. WHERE AI *DOES* WORK — and it is Side B's mechanism, validated

**LLM-written procedural geometry behind a JSON schema and a validator.** The
documented loop: describe → model emits a JSON spec → validate against the real
catalogue → render headless → iterate.

> *"Because validation errors are structured… the LLM can parse them and
> self-correct without human intervention. **A broken graph rarely needs more than
> one correction pass.**"* · *"**Unknown node types are caught immediately — the
> LLM cannot invent a node name.**"*
https://hesioddoc.readthedocs.io/en/latest/guides/llm-procedural-generation/

**Build the validator before you write any prompt.** And hard-code the tile unit
as a constant — never let a model choose a scale. Documented failure: *"AI is
always very bad with scale and doesn't understand how real world scale works."*

**This is the strongest positive evidence in the whole research corpus, and it is
exactly what Side B already is.** The Build pipeline's five stages plus a schema
and validator is the architecture the evidence supports.

### A12. THE GRID ARITHMETIC — locked day one, versioned as a schema

Burgess, Bethesda GDC 2013: footprints must be **multiples of each other** —
*"a 512 room will always tile nicely with a 256 hallway, but a 384 room will
eventually create gaps."* Grid snap at **half the footprint**. Pivots at the
**ground plane and footprint centre** — *"Changing pivots later can be a huge
problem, requiring manual updates to hundreds of instances."*

**That warning applies literally to saved player cities**, which is why this is a
versioned schema and not a constant.

The trap a spatially-fluent non-artist falls into, from Polycount: letting a
**real-world dimension** set the module size. *"If you pick 2m as your major grid,
your options to divide are 1m not 1.5m. If you had picked 3m, 1.5 would work."*

And the process rule: **greybox the entire kit in flat boxes with correct
footprints and pivots, and prove every piece snaps, before modelling anything.**
That phase is where Mark's AutoCAD and Revit fluency is worth the most and where
not being a 3D artist costs nothing at all.

---

## CITY LAYOUT RULES — research 2026-09-13, run on Gemini to conserve limits

### L1. The network algorithm, and the first sourced GATES the world has ever had

Parish & Müller (SIGGRAPH 2001) split road generation in two: **highways seek and
connect population-density peaks; local streets fill the gaps to give access to
them.** Branch angles snap to 90° unless following elevation contours.
https://cgl.ethz.ch/Downloads/Publications/Papers/2001/p_Par01.pdf

Boeing's 100-city OSMnx study gives **measured** values from real cities.
**CORRECTED 2026-09-13 — the figures below were re-derived directly from the
paper's own Table 1 (`pdftotext -layout` on the arXiv PDF, every one of the
100 cities' rows read, not the Asia/Oceania block alone), because the
previous version of this table was exactly that block misread as the
global range.** See T4 for the full six-metric table and the grid/organic
split; this section keeps only the two the generator gate uses first:

| Metric | Real global range, verified against Table 1 | Old (wrong) figure |
|---|---|---|
| Average node degree (streets per intersection) | **2.348** (Helsinki) – **3.548** (Buenos Aires); Manhattan 3.508 | 2.38 (Bangkok) – 3.24 (Athens) |
| Average circuity (network distance ÷ straight line) | **1.011** (Buenos Aires) – **1.148** (Caracas) | 1.02 (Manila) – 1.13 (Hong Kong) |

https://arxiv.org/abs/1808.00600 (open-access; the ResearchGate mirror below
is the same paper, kept as the reader-facing citation)
https://www.researchgate.net/publication/327257959_Urban_Spatial_Order_Street_Network_Orientation_Configuration_and_Entropy

The paper's own text confirms the shape of the correction: *"Helsinki and
Bangkok have the lowest average node degrees... Buenos Aires and Manhattan
have the greatest average node degrees, both over 3.5 streets per node."*
Bangkok (2.385) and Athens (3.245) — the old table's endpoints — are both
real Table 1 values, just not the extremes; they were the extremes **of the
Asia/Oceania rows only.**

**These are acceptance tests, not inputs.** You cannot set node degree; it
emerges. So they become the generator's gate: generate, measure, compare against
the real-world band. **This is the first gate in this project's history that
carries a source rather than a round number** — set against the 4 GB memory
floor, the 900 draw calls and the 12,000,000 triangles, all retired this week for
having none.

### L2. The "100 m block" is a myth — with real numbers to replace it

Marshall et al. (2016) measured it: **Portland 60 × 60 m squares; Manhattan
256 × 60 m elongated.** **CORRECTED 2026-09-13** — the paper's own Table 1,
read directly, gives Manhattan's *existing block* row as `Existing block
width (m): 256` / `Existing block depth (m): 60`, not 80 × 274. The paper's
own prose (p.91) independently confirms the shape, if not this exact ratio:
*"The blocks in Portland are 60×60 m... Portland's blocks are perfectly
square whereas Manhattan's are elongated, with street sides three and a half
times longer than avenue sides"* — a separately-stated 3.5:1 description of
the same elongation, not identical arithmetic to 256:60 (≈4.3:1), and not
reconciled further here; both figures are the paper's own. The widely
repeated ~100 m figure traces to nothing.
https://media.voog.com/0000/0036/2451/files/Pedestrian%20accessibility%20in%20grid%20layouts-%20the%20role%20of%20block%2C%20plot%20and%20street%20dimensions.pdf

Blocks subdivide by **recursively splitting oriented bounding boxes** until each
polygon falls between a minimum and maximum lot area (Parish & Müller).

**These must be rounded to whole modules where they do not already divide
evenly — see G1 below. Manhattan's real 256 m (verified above) already is:
256 ÷ 4 = 64 modules exactly, no rounding needed. Where a future block size
does not divide evenly, round it deliberately and record that you did.**

### L3. Where the core goes — a named mechanism, not an observation

**Alonso's bid-rent theory (1964):** commercial density anchors at the point of
**maximum transport accessibility**, outbidding every other use. Industry is
pushed outward by land cost but **overrides that where transport geometry demands
it** — rail termini, deep-water dredging. Farmland occupies land where urban
bid-rent falls below agricultural yield.
https://archive.org/details/locationlanduse0000alon

### L4. The island-and-mainland pattern — directly this world's shape

**DOCUMENTED:** in New York and Hong Kong the deep-water port sits on the
**mainland** side. https://panynj.gov/port/en/index.html · https://www.mardep.gov.hk

**SYNTHESIS, and it is the most useful thing in this pass:**
- The crossing anchors the primary commercial spine.
- **The port is never at the crossing.** It needs flat acreage and would choke
  the commercial arterial — it sits **2–5 km away**.
- The mainland **directly behind the crossing** is secondary dense commercial —
  Downtown Brooklyn, Kowloon — transitioning rapidly to industrial logistics.

This matches Mark's description exactly: downtown on the island, a port city on
the mainland at the connection point. Both ends of the crossing are dense; the
working port sits along the coast from it.

### L5. What betrays a generated city

**DOCUMENTED:** Emilien et al. (2012) fault procedural cities for lacking
**temporal history**. https://hal.inria.fr/hal-00758477/document

**SYNTHESIS — the tells:** uniform density with no sign of accretion · perfectly
continuous grids that ignore topographic cost · **no negative space** — no
brownfields, no irregular unbuildable remnants.

Note this agrees independently with the art research (§1.2): *"the negative space
in a sea of detail is what actually draws the player in."* Two separate fields
arriving at the same requirement.

### L6. Reclaimed waterfront — for the built-out islands

Foster City deliberately isolates water access using **branching canal layouts**.
https://nickdelis.com/blog/foster-citys-median-price-hides-two-different-housing-markets

**SYNTHESIS:** finger canals · roads as single-loaded spines or long linear
cul-de-sacs · **blocks exactly two lot-depths wide plus one street**, maximising
rear water frontage · **gridded cross-streets actively avoided** because they
waste waterfront edge.

### L7. Set by eye, and labelled as such

No source found for: topographic deformation penalty (max highway slope before
branching) · the distance at which commercial bid-rent yields to industrial ·
minimum negative space per neighbourhood · corner-lot frontage multipliers.
**Set these by eye, write down that they were, and do not let them acquire false
provenance later.**

---

## TERRAIN — T1–T7, and T1 is the answer to "scattered blobs"

### T1. THE DROWNED RIVER VALLEY METHOD — generate one landmass, then flood it

**Do not generate islands. Generate a single solid landmass with a continuous
dendritic river network, then raise sea level until the valleys flood.** The
islands that remain nestle together **because they share a topological history** —
they are the high ground of one eroded landform, not independent shapes.

That is the mechanical answer to the failure: noise produces localised,
independent values, so islands generated from it have no shared history and read
as unrelated blobs. Which is precisely what was rejected.

**And the world's shape falls out of the method.** A ria coast produces sheltered
deep-water sounds — ideal for a port — while keeping landmasses close enough for a
bridge crossing. The downtown island beside a mainland with a working port is a
natural product of this generation method, not something imposed on it.

Labelled SYNTHESIS by the research, but it is mechanism rather than taste, and it
explains an observed failure rather than predicting an unobserved one.

### T2. ORDER OF OPERATIONS — coastline first. Elevation-first is a named failure.

Red Blob Games, documented: **define the coastline boundary first** (Voronoi
graph), **then derive pseudo-elevation from distance-to-coast**, **then** add noise
for ridges and valleys. Generating elevation first and letting the coast fall out
of it produces mismatched watersheds, accidental cliffs and disconnected
landmasses.
https://www.redblobgames.com/x/1725-procedural-elevation/

**Check that the old generator did not do this backwards. It is a strong
candidate for why the coast never read as a coast.**

### T3. HYDRAULIC EROSION — what it actually fixes

Thousands of simulated water drops dissolve terrain, carve continuous downhill
channels and deposit sediment in valleys, producing **sharp ridges and flat
coastal plains**. It is what removes the lumpiness noise leaves behind.
http://3dworldgen.blogspot.com/2017/12/terrain-erosion.html

Flat coastal plain is not incidental — it is where a city can go. This step
produces the buildable land.

### T4. THE STREET NETWORK'S SIX GATES, all measured across 100 real cities

**REWRITTEN 2026-09-13, per CORRECTIONS C-3.** The table below was the
Asia/Oceania rows of the paper's own Table 1 (20 of the 100 cities), read as
though they were the global range. Re-derived by reading every one of the
100 cities' rows directly (`pdftotext -layout` against the arXiv PDF,
https://arxiv.org/abs/1808.00600 — open access; the ResearchGate mirror
below is the same paper), not a secondary source and not the old subset:

| Metric | REAL global range (100 cities) | Old (wrong) range |
|---|---|---|
| Median street segment length | **23.2 m** (Venice) – **233.0 m** (Shanghai) | 42.0 (Helsinki) – 233.0 (Shanghai) |
| Average node degree | **2.348** (Helsinki) – **3.548** (Buenos Aires) | 2.38 (Bangkok) – 3.24 (Athens) |
| Four-way intersections | **6.1%** (Ulaanbaatar) – **57.6%** (Buenos Aires) | 8.7% (Sydney) – 36.3% (Athens) |
| Dead ends | **2.7%** (Manhattan) – **39.5%** (Helsinki) | 5.6% (Athens) – 39.5% (Helsinki) |
| Orientation-order φ | **0.002** (Charlotte, São Paulo) – **0.899** (Chicago) | 0.005 (Singapore) – 0.340 (Melbourne) |
| Average circuity | **1.011** (Buenos Aires) – **1.148** (Caracas) | 1.02 (Manila) – 1.13 (Hong Kong) |

https://www.researchgate.net/publication/327257959_Urban_Spatial_Order_Street_Network_Orientation_Configuration_and_Entropy

**Every old figure was a real Table 1 value — just not the extreme.** Bangkok
(k=2.385), Athens (k=3.245, P4w=36.3%, Pde=5.6%), Sydney (P4w=8.7%),
Singapore (φ=0.005), Melbourne (φ=0.340), Manila (circuity=1.023), Hong Kong
(circuity=1.137) are all genuine rows of the table. They are the extremes of
the **Asia/Oceania region alone** (20 of 100 cities), which is why the old
range would have rejected cities the paper's own global sample contains —
Chicago's φ=0.899 is more than double Melbourne's "maximum" of 0.340.

**Grid vs. organic typology, per C-3's own request — the paper's actual
regional aggregation (Table 2), not an invented split:**

| | **US/Canada — the grid archetype** | **Europe — the organic archetype** |
|---|---|---|
| Mean orientation-order φ | **0.427** | **0.033** |
| Mean median segment length | **98.8 m** | **78.7 m** |
| Mean circuity | **1.043** | **1.061** |

The paper states the direction in its own words: *"the US/Canadian cities
exhibit the lowest street orientation entropy, circuity, and proportions of
dead-ends as well as the highest median street segment lengths, average node
degrees, and proportions of four-way intersections. They are also by far the
most grid-like in terms of φ... the European cities exhibit the highest
street orientation entropy and proportion of dead-ends as well as the lowest
average node degrees. They are the least gridlike in terms of φ."*

**Table 2 does not aggregate node degree, four-way share or dead-end share by
region** — only φ, entropy, length and circuity. Rather than hand-averaging
those three from Table 1's 100 individual rows (a real error risk this
document does not need to take on), the paper's own named exemplars stand in,
quoted directly: *"Buenos Aires and Manhattan have the greatest average node
degrees, both over 3.5 streets per node... Buenos Aires and Manhattan
similarly have the largest proportions of four-way intersections and the
smallest proportions of dead-end nodes"* (grid archetype: Buenos Aires
k=3.548, P4w=57.6%, circuity=1.011; Manhattan k=3.508, P4w=57.2%, Pde=2.7%)
against *"Helsinki and Bangkok have the lowest average node degrees, each
with fewer than 2.4 streets per node"* (organic archetype: Helsinki k=2.348,
Pde=39.5%, l=42.0 m).

**A CITATION TO REJECT.** The first research pass offered "grid orientation
entropy 2.38 to 3.5" citing `donut.topology.rocks`, which is a persistent-homology
site and does not support the claim. **Use φ from the Boeing paper instead and
discard the entropy figure.** Recorded because catching a number whose URL does
not support it is the same discipline that retired the 4 GB floor.

### T5. GROWN VERSUS PLANNED — a measurable difference, not an impression

Planned grids skew heavily toward **four-way** intersections. Grown networks carry
many **three-way T-junctions**, because newer neighbourhood grids terminate
abruptly into older arterials. Boeing's ranges above make this testable in both
directions.

### T6. FAKING TEMPORAL HISTORY — cheap, and it produces the negative space too

**Seed several street grids from different origin nodes with slightly offset base
orientation angles.** Where the expanding grids collide they force T-junctions and
leave irregular triangular remnant parcels — flatiron lots. That collision zone
*is* the simulated history of independently platted developments meeting.
Grounded in tensor-field street modelling, Chen et al. 2008.
https://www.researchgate.net/publication/220183520_Interactive_Procedural_Street_Modeling

**Three independent research threads have now converged on the same requirement.**
The art research: *"the negative space in a sea of detail is what actually draws
the player into that part of the scene."* The layout research: lack of negative
space is a primary tell of procedural generation. And now: grid collisions produce
remnant parcels **for free**, as a by-product of faking history. One mechanism
satisfies all three.

### T7. REAL DIMENSIONS — and their rounding to the module

**Residential lot width/depth, VERIFIED 2026-09-13, per CORRECTIONS C-9.**
The old citation (`portland.gov/code/33/110`) 404s, exactly as flagged, and
the old 15.2 m/18.3 m figures cannot be traced to a current table. The real
code, read directly, gives no single figure — it varies by zone. Title
33.610, Table 610-2, "Lot Dimension Standards" (dated 6/30/22, the
post-Residential-Infill-Project revision, RF through R5 zones —
https://www.portland.gov/sites/default/files/code/610-rf-r5-lots.pdf):

| Zone | Min lot width (feet / metres) | Min lot depth (feet / metres) |
|---|---|---|
| RF | 60 ft / 18.29 m | 60 ft / 18.29 m |
| R20 | 60 ft / 18.29 m | 60 ft / 18.29 m |
| R10 | 50 ft / 15.24 m | 60 ft / 18.29 m |
| R7 | 40 ft / 12.19 m | 55 ft / 16.76 m |
| R5 | **36 ft / 10.97 m** | **50 ft / 15.24 m** |
| Attached house lots (R20–R5) | 15 ft / 4.57 m | — |

Title 33.110, Table 110-3 (dated 8/1/21,
https://www.portland.gov/sites/default/files/code/110-sd-zone.pdf) restates
the 36 ft figure directly for RF-through-R5 lots and gives the R2.5 zone's
standard as an area minimum instead (1,600 sq. ft.), not a width/depth pair.

**R5 is the anchor below** — the smallest-lot standard single-dwelling zone
and the one Residential Infill most directly targets for smaller/"missing
middle" lots — recorded as a choice, not the only real number:

| Thing | Sourced value (metric conversion labelled as a conversion) | At 4 m module | Rounded to |
|---|---|---|---|
| Residential min lot width (R5) | 36 ft = **10.97 m** | 2.74 | **12 m / 3 modules** |
| Residential min lot depth (R5) | 50 ft = **15.24 m** | 3.81 | **16 m / 4 modules** |
| Commercial min block dimension | 30.4 × 30.4 m (Portland) | 7.6 | **32 × 32 m / 8×8** |
| Reclaimed frond width | 75.0 m (Palm Jumeirah) | 18.75 | **76 m / 19 modules** |
| Lot depth : frontage ratio | 2:1 to 3:1 | — | holds at 16×20 to 16×48 |

https://www.portland.gov/sites/default/files/code/610-rf-r5-lots.pdf ·
https://www.portland.gov/sites/default/files/code/110-sd-zone.pdf ·
https://www.fibertex.com/business-areas/civil-engineering/case-stories/palm-islands

**Every rounding above is deliberate and recorded as a rounding, not a
measurement.** The frond is the interesting one: 75 m is two ~30 m lot depths plus
a 15 m single-loaded road spine, and **gridded cross-streets are strictly avoided
because they waste waterfront edge.**

### T8. SET BY EYE — with what failure looks like in both directions

The research gave starting values *and* the visual failure mode each way, which is
what makes an unsourced number usable:

| Parameter | Start | Too low looks like | Too high looks like |
|---|---|---|---|
| Flat buildable area | **40%** of landmass | an uninhabitable mountain peak | a pancake with no terrain character |
| Slope deformation penalty | **15% grade** | roads ignore terrain, painted on | grid shatters into spaghetti on gentle hills |
| Corner lot frontage multiplier | **1.25×** | corners clip into cross-street pavement | corner buildings look abnormally stretched |
| Interstitial band width | **2.5 km** | abrupt wall of towers against cornfields | endless warehouse sprawl eating the map |

**Write these into the code as named constants with the failure visuals in the
comment.** A number set by eye is defensible when the reader can see what wrong
looks like; it becomes a fabrication the moment that context is lost.

**Not yet applied: CORRECTIONS C-8 (`REBUILD-PLAN.md`, since retired) said to add
a relief-ratio row to this table** — flooding a young, steeply eroded landscape
leaves unbuildable knife-edge ridges; flooding a mature, low-relief one gives
broad islands with intricate coasts. That row was never added to the table
before this extraction; this file preserves the gap rather than silently
fixing it, per the instruction that this extraction is verbatim, not re-derived.
TER-3 (hydraulic erosion) is where this belongs if it is still open.

### T9. THE DENSITY GRADIENT IS NOT LINEAR

Barr & Cohen (2014) on Manhattan's FAR, following Clark's negative exponential
D(r) = D₀e^(−γr): density **drops steeply immediately outside the core, then
flattens into a long low-density tail.** A linear falloff is wrong and will read
as wrong.
https://ideas.repec.org/a/eee/regeco/v48y2014icp110-119.html

And farmland never borders the core directly. An **interstitial band** of uses that
outbid agriculture but cannot afford urban rent sits between: distribution
warehousing, big-box retail, nurseries, large-lot estates.
