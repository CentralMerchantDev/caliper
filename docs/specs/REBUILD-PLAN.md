# REBUILD PLAN — CALIPER, from the board up

Written 2026-09-11, after Mark opened the world on a real device for the first
time and found it unacceptable. **This supersedes `COMPLETION-PLAN.md` as the
governing plan.** That file stays for its record of what was built and measured;
it stops being the checklist.

---

## CORRECTION — 2026-09-13. IT ALL COMES DOWN. THE LIVE PAGE GOES DARK.

A blind review found that `public/city-render.js` and its dependents are not a
dead demo path — they are what `index.html` renders today, via a dynamic
`import()` static analysis cannot see. Only `public/road-network.js` was moved;
the rest was left standing on the grounds that removing it would take the live
page down.

**That reasoning is rejected. Mark, 2026-09-13:**

> *"They should have taken the whole thing down. I've gone through this before…
> I want it all down. We talked about, yes, it would take down the live site,
> and I get that. That is fine so we can build it back up — that's what phase
> two was about. I don't want to go about the 'oh, we're gonna patch onto' —
> that's what we did. That's what we were trying to stop doing. It doesn't work.
> We ended up with a whole bunch of work that is garbage."*

**"It would take the live page down" is not an obstacle. It is the cost already
accepted** — *"I am willing to have it look worse for a stretch"* — and treating
an accepted cost as a blocker is how a workaround gets invented for a problem
nobody had. A "separate route, switch over later" scheme was drafted here and is
**withdrawn**: it is the same keep-both structure under a new name, and
keep-both is what produced doubled roads, 36 permanently red tests, a board of
three flat colours, and a month of work Mark calls garbage.

**This is the third time in one conversation the assistant defaulted to
preserving the old world. Do not do it a fourth.**

### What "all down" means, concretely

- **Quarantine `city-render.js`, `layout.js`, `instance-groups.js`,
  `city-plan.js`** and everything that serves only them. `rule://quarantine`
  Tier 2 — moved to `_TO-DELETE/<reason>/` with a ledger line, retained, never
  deleted.
- **`index.html` stops rendering a world.** A holding page until Phase 2.1
  produces the flat board.
- **Every test whose subject leaves, retires** — by name, with its reason, never
  swept.
- **The shell's world-dependent parts go dormant.** Picking has nothing to pick;
  the inspector reads `addr`/`districtId`/`className` that will no longer exist.
  The shell survives as code and waits for the new board. That is a consequence
  to plan for, **not a reason to keep the old world.**

### One consequence to know, not to weigh

The live URL goes dark until Phase 2.1. If a link is going out with a résumé this
week, a holding page is the fix, not a reprieve for the old world.

---

## CORRECTIONS — 2026-09-13, from a hostile blind review. READ FIRST.

The spec was reviewed cold by a reviewer given no context and told to be hostile.
It found eleven problems. Nine were real. **Where anything below contradicts a
later section, this section wins** — and where a later section has already been
rewritten, it says so in place.

**C-1. Roads are TILES, not generated junctions.** R4 describes spline-based
games; this is a tile board. Rewritten at C1.3. Mark's original instinct was
right and was overruled with evidence from the wrong architecture.

**C-2. Phase 2's order reproduced the exact failure this document diagnoses** —
generator at 2.3, placement at 2.5. Rewritten: placement first, generator last,
and the generator calls `place()`.

**C-3. The Boeing gate as written would REJECT a Manhattan-style grid.**
**VERIFIED 2026-09-13 — the ranges in L1 and T4 were worse than a regional
subset; they were the Asia/Oceania rows of Table 1 only, misread as the
paper's global range.** Full derivation and the corrected numbers are at L1
and T4 below, pulled directly from the paper's own Table 1 and Table 2
(`pdftotext -layout` against the arXiv PDF, not a secondary source). The
structure is right and the old values were not: there are **two typologies,
grid and organic**, with different bands for φ, four-way share, dead-end
share and node degree — a grid city has *high* orientation-order, *high*
four-way share and *low* dead ends. **This is now a measurement with a real
source, not a corrected guess** — see L1/T4 for the numbers and the exact
cities they come from.

**C-4. Instanced rendering must handle mutation from the first commit.** The
"21,007 pieces in 16 draws" figure came from a **prebaked static scene**.
Runtime add, remove and replace needs capacity pools and free lists, or
`BatchedMesh`. Chunk size is an **operational parameter to be measured**, not an
unsourced taboo (R11 over-applied) and not invented.

**C-5. Pivot moves to the ANCHOR CELL'S CORNER, not the footprint centre.**
Supersedes C1.2. A centre pivot puts every odd-dimension piece — 2×3, 3×3, and
the now-deleted 3-module street — at a half-module offset. A corner pivot fixes
all of them at once and matches the `{typeId, anchorCell, rotation}` model, where
the anchor already *is* a corner.
*(The review's claim that odd widths break grid alignment was wrong — a 3-cell
piece occupies 3 whole cells and its edges are integer. The pivot was the real
defect.)*

**C-6. The save format cannot record a deletion.** `{seed, generatorParams,
placements[]}` has no way to say "the player bulldozed a generated road."
Supersedes C2.5:
`{ seed, generatorParams, tombstones: number[], placements[] }` — tombstones
being cell indices where generated pieces were removed.

**C-7. Do not flatten every asset pack's UVs onto a ten-colour atlas.** Kenney
and Quaternius meshes carry road markings, window panes and signage in their
textures; collapsing them produces exactly the untextured blockout look that was
rejected. Supersedes part of A9/C1.6: **unify SURFACE COLOUR through one shared
shader and palette; keep texture detail that carries information.** And note
those packs ship **no vertex-colour masks, no baked AO and no separated window
meshes** — so Dorfromantik's "free variation" levers are not free on borrowed
assets. Budget that authoring or drop those levers for Phase 2.

**C-8. Erosion maturity is the missing parameter in T1.** Flooding a *young,
steeply eroded* landscape leaves knife-edge ridges — unbuildable, and the failure
already rejected. Flooding a *mature, low-relief* one gives broad islands with
intricate coasts: Chesapeake Bay, Sydney Harbour, the Galician rías. **Erode to
low relief before raising sea level.** Add relief ratio to T8's by-eye table:
too high reads as drowned mountains, too low reads as a flooded car park.
*(The review concluded the method was broken. It is not — it was missing a
parameter.)*

**C-9. Three citations are bad and are struck.**
- `<1000 desktop draw calls` attributed to don McCurdy in R5 — **he said under
  100, full stop.** The desktop figure was invented. Struck.
- Foster City canal layout (L6) cited a residential estate agent's blog about
  house prices. Struck; the finger-canal rule stands on the Palm Jumeirah source
  alone.
- Manhattan's 80 × 274 m attributed to Marshall et al. (L2, G1) — **VERIFIED
  WRONG, 2026-09-13.** The review's suspicion was correct: Marshall et al.
  (2016) Table 1, read directly (`pdftotext -layout` against the paper's own
  PDF), reports Manhattan's *existing block* as **256 × 60 m**, not 80 × 274.
  **The attribution is corrected, not stripped** — see L2 and G1 below. 256 m
  is exactly 64 modules at the 4 m grid; G1's 274→272 rounding note is
  removed as unnecessary, not merely unconfirmed.
- Portland's 15.2 m minimum lot width (T7) — **VERIFIED, 2026-09-13, and the
  URL is fixed.** The old URL (`portland.gov/code/33/110`) does 404, exactly
  as flagged. The current code (Title 33.110, Table 110-3, and Title 33.610,
  Table 610-2, both dated 6/30/22 — the post-Residential-Infill-Project
  revision) gives real, per-zone figures in feet, not one blanket metre
  figure. See T7 below for the table and the working URLs.

**C-10. C3's scoring is a simulation and the document said simulation stays
out.** A dirty-rect influence convolution with exponential decay is not "a reason
one cell beats another" — Dorfromantik's version is *count matching edges*.
**Phase 2 ships flat adjacency scoring: each piece has a base value and gives a
fixed bonus to neighbours.** The scalar-field model in C3.1–C3.2 moves to Phase 3.

**C-11. The vision material belongs in its own document.** **DONE, 2026-09-13
(Phase 1 item 4).** Multi-city unlocking, city-health gates, token economies,
player code uploads and the charitable-giving model — previously in MARK'S
ANSWERS below — are now `docs/specs/VISION.md`, verbatim, with a one-line
pointer left in their place.

---

## WHY THE OLD PLAN WAS AIMED WRONG

`COMPLETION-PLAN.md`'s "WHAT FINISHED MEANS" has five conditions. Not one
mentions placing a piece, a task, a character, or the two ways of playing. Every
lane item for a month inherited that definition. The work was real — the
correctness is genuine and the measurements hold — but it was aimed at an axis
nobody looks at, while the axis a visitor judges in three seconds was never
started.

**CALIPER is one game with two ways to play it. Mark, 2026-09-11:**

- **SIDE A — play it.** A board you place pieces on to build a city out, plus
  tasks, goals, achievements and NPCs. SimCity is shorthand for the genre, not
  the model.
- **SIDE B — build it.** The coding lane, itself a way of playing: create a new
  task, a new building type, a new land. Go past what the game allows by
  changing what the game is.

*"It's gotta be a board. You can place pieces on that board."* Placement is core
scope. Nothing in the old plan built it.

---

## WHAT STAYS, WHAT GOES

**Stays — these are the assets and they are not in question:**

- `C:\Code\process-mcp` — the rules, the build loop, the harness. Separate repo,
  untouched.
- **The Build pipeline** — Ground / Plan / Implement / Verify / Review, the
  sandbox, spend caps, cross-vendor review. This is Side B's gameplay and it
  works.
- **The shell** — Orbit/Walk/Drive/Fly, the inspector, picking, the day-night
  clock, lighting, the panel system. The interface around the world is not the
  weak part.
- **The knowledge** — every audit and measurement. **But not the 16-draws
  figure.** Corrected 2026-09-14, applying C-4: "21,007 pieces in 16 draws" was
  measured on a **prebaked static scene** and does not transfer to a board the
  player mutates. Phase 2 renders chunk-merged meshes with per-chunk culling
  (each chunk carries its own bounding volume, so the all-or-nothing instancing
  problem never arises) — the approach Pocket City 2 shipped on mobile after
  trying instancing and billboards and abandoning both.

**Goes — quarantined, never deleted, per `rule://quarantine`:**

- The old world: `layout.js`, `instance-groups.js`, `road-network.js`,
  `city-plan.js`, and `city-render.js`'s old-world path. **It cannot become
  Side A** — a board you place pieces on needs discrete slots with known
  footprints, and plots are not that. It is a dead end, not a fallback.
- The current board's generated output, and the parts of the generator encoding
  assumptions that produced a world Mark did not ask for.
- The models, and the process by which models are made.
- Every test and gate that only describes the above.

**Kept from the board, deliberately:** the piece data shape —
`{type, cell, footprint, rotation, levels}`. It is the one thing in the world
layer shaped right for placement. A rebuild would reproduce it.

---

## PHASE 1 — DEFINE AND CLEAR

Nothing is built in this phase. At its end the repository knows what to build,
how, and in what order, and contains nothing that describes the dead world.

**1.1 The piece catalogue.** Every piece: its footprint in module units **and
its visual specification**. Not a size table — a piece definition. This is the
answer to "the models, and the process by which models are made," and putting
the look in the catalogue is what stops Phase 2 producing boxes to be prettified
later.

Borrow from published practice; do not invent the set. `rule://standard-piece-sizes`
already requires this and it has never been done. Order: roads (a draft exists
in `PIECE-CATALOGUE-ROADS.md`, unreviewed), then buildings, then landscape, then
props.

*Gate:* every piece in the catalogue has a footprint, a visual reference, and a
source. A piece with an invented dimension and no reference fails.

**1.2 The terrain brief.** A mainland with an archipelago off its coast — what
was asked for and not delivered. Scale, land-to-water ratio, biomes, and how
terrain relates to the board's slots.

*Gate:* named reference images, not adjectives.

**1.3 The placement contract.** What a slot is. What "fits" means — trivially,
under a fixed catalogue, which is the point of having one. How a player adds,
removes and replaces a piece. What persists, where, and at whose cost.

*Gate:* a written contract a Phase 2 lane can implement without inventing
anything.

**1.4 The visual target.** Named reference shots per piece class, against which
Phase 2 is judged. B5 failed for a month partly because "the visual pass" had no
referent.

**1.5 Clear the site.** Quarantine everything in the "Goes" list. Retire the
tests that only describe it — roughly 37 old-world pins plus their dependants —
as a named list, not a sweep. Retire or re-source the gates that measure it: the
culling ratio is now a category error, the draw-call and triangle budgets are
unsourced round numbers, and most of C2's 2,771-entry allowlist describes
exports that are about to leave.

*Gate:* nothing in `src/`, `public/` or `test/` references the old world; the
suite is green or every red is named in one place; `_TO-DELETE/` holds the lot
with a ledger line each.

**1.6 Close the decision queue.** Decisions #3 through #9 are mostly about the
old world or measurements of it. Resolve, supersede or retire each with a
reason.

---

## PHASE 2 — BUILD THE BOARD

**REORDERED 2026-09-13 after a hostile review. The original order put the
generator at 2.3 and placement at 2.5 — which is the exact failure A1 and A5.6
diagnose, reproduced inside the document that diagnoses it. The generator now
runs LAST and calls the same API the player does.**

**2.1 A flat board and the slot contract.** A bounded grid of addressable cells,
rendered flat. No terrain, no generator, no art. Typed arrays, `y*width+x`.

**2.2 Tier-1 placement, on that flat board.** Palette → ghost → validity →
commit → cancel → remove, and it survives a reload. C2 is the contract.
**This is the vertical slice. If it is not satisfying here, nothing downstream
saves it.**

**2.3 Dynamic render batching.** Instanced rendering that handles **add, remove
and replace at runtime** — capacity pools and free lists, or `BatchedMesh`.
Built against a mutating board from the first commit, because a pipeline built
against static generated output gets rewritten the moment 2.2's output reaches
it. The old world's "21,007 pieces in 16 draws" was a **prebaked static scene**
and does not transfer unmodified.

**2.4 The scoring rule.** C3. A reason one cell beats another, visible on the
ghost before commit. A2's item five, and the research is unambiguous that this is
what separates a game from a toy.

**2.5 Terrain.** Heights, water, slope constraints on slots. The board gains a
third dimension and placement gains a terrain check. T1–T3.

**2.6 Models to the catalogue's visual specification.** **The phase is won or
lost here** — R1's four lighting mechanisms, R8's joins, R9's massing.

**2.7 The generator, LAST.** It produces terrain and then **emits its pieces
through the same `place()` the player calls.** If the generator cannot call
`place()`, the generator is wrong — that is the research's own test. Its output
is then hand-corrected in the game's editor and committed as the starting world.

**2.8 Re-point the shell at the new board.**

*Phase gate:* a person opens the page, sees a world matching 1.4's references,
clicks an empty slot, places a building, sees why that cell was worth choosing,
and it is still there on reload.

---

## PHASE 3 — PLAY IT, BOTH WAYS

**3.1** Tasks, goals, NPCs — a minimum real set, not a framework.
**3.2** Side B: the Build pipeline pointed at the new board, able to create a
new piece type, a new task, a new land.
**3.3** The demo cut — what a hiring manager does in two minutes, both sides,
inside a spend ceiling.
**3.4** Live, and opened on a phone. `npm run dev:lan` now exists; loopback-only
binding is why this was never possible.

*Phase gate:* a stranger opens a link on a phone, completes one task, describes
one change, and watches it build.

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
retained and rerunnable · the generated layer and the edited layer are separable ·
the board is addressable by cell at runtime, not merely serialisable.

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

## MARK'S ANSWERS — 2026-09-11

**The world.** It is a **world**, and we build **one city** in it. Multi-city
unlocking and the city-health gate are recorded intent, not this phase's
scope — moved to `docs/specs/VISION.md` per CORRECTIONS C-11.

**This first city:** a mix of the original world — the outer island and the inner
one the old city sat on, **combined** — plus a **large archipelago of islands big
enough to build on**. Not scattered floes.

**Catalogue.** He declined to give a number, explicitly: *"my prior attempts have
had consequence so I am hesitant to do it again."* **That is correct and R2/R3
answer it instead.** What he named wanting more of: houses, condos, commercial
across a size ladder (small through mega tower and skyscraper), bridges, roads,
trees, cars. Less of: benches.

**Money.** For now Mark pays, and it must be free or near-free — hence
Cloudflare. The later token economy, player code uploads and
charitable-giving model are recorded intent, not this phase's scope — moved
to `docs/specs/VISION.md` per CORRECTIONS C-11.

**Spend ceiling.** Unknown; keep it at zero where possible.

**Trees.** No answer — and R2 means one is no longer needed from him.

---

## THE TERRAIN BRIEF — Mark, 2026-09-11

**What went wrong, in his words, and it is a scale diagnosis not a shape one:**
the outer island was *"too large to build on"* — *"each square was too much."* But
shrinking the world so the same shape spanned 8 km instead of 13 km produced
*"lots of areas within it that became hard to build on, and hard to lay out a city
on."*

**So the constraint is not total area. It is CONTIGUOUS BUILDABLE AREA in legible
chunks.** A landmass that scores well on square kilometres and badly on usable
flat runs produces exactly what was rejected. This is the primary terrain
acceptance test, ahead of any water-ratio figure — and it is why the old spec's
68.2% water and 215.2 km² were both hit while the result failed.

**The form:**

- **One large island off a coast** — the primary build site, the old inner island
  and outer island read as one.
- **An archipelago around it**, of islands **big enough to build on**. Not floes.
  Each island should support a settlement, not a single piece.
- **The mainland behind it**, carrying farms, commercial and industry — and a
  city at the **main connection point** where mainland meets the island group.

**Open, needs one word from Mark:** whether the player's first city is on the
large island with the mainland as hinterland, or on the mainland at the
connection point. This brief assumes the former; correct it if wrong.

**Scale is set by the grid, not chosen for the map.** Per A12 the module is locked
first and the world is sized in modules. Do not pick a kilometre figure and derive
cells from it — that is the arithmetic that produced "each square was too much."

---

## THE VALUE MODEL — what makes one cell better than another

This is A2's item five, the one the research says separates the game from the toy,
and Mark's answer is richer than the genre default.

### V1. Value is a scalar field on the grid. This is GlassBox.

SimCity's GlassBox engine is the one outlier in the data-model survey: **the grid
holds only scalar fields** — land value, desirability, pollution, resources —
and **buildings are not on the grid at all**, they read the fields.
https://www.gamedeveloper.com/design/gdc-2012-breaking-down-em-simcity-em-s-glassbox-engine
https://www.andrewwillmott.com/talks/inside-glassbox

That is the architecture for what Mark described, and it composes cleanly with
A3's occupancy grid: one `Uint16Array` of piece IDs for *what is there*, plus
parallel scalar arrays for *what it is worth*. Both dense, both `y*width+x`.

### V2. The inputs, from Mark

- **Proximity to water.**
- **Services nearby.**
- **Geography as a modifier that cuts both ways.** A private island reachable only
  by boat is highly valuable *for a single complex* and poor for anything needing
  daily access. Remote land is low value **unless** it is productive farmland —
  so terrain type and isolation interact rather than stacking.
- **Ultimately: what can be built there, and what it yields.**

### V3. The mechanic that is actually unique — value is DEVELOPED, not discovered

Mark's own framing: *"it may be farmland for now, but you build a house on it, and
then you can subdivide that land and build a community and then start to build a
lake… you can add to that land to actually make it more valuable. You're really
becoming a developer."*

**The player raises the value of land by improving it**, rather than hunting for
land that is already good. And certain unlockable buildings **raise the value of
everything around them** — but cannot be placed on nothing; they require the
infrastructure to be built first.

**This is the direct answer to the failure The Block's developer named in his own
postmortem** — *"many players felt the positioning of buildings should hold more
meaning"* — and to his conclusion that the fix is a **larger possibility space**,
not more mechanics. Land you can improve is a possibility space.
https://www.gamedeveloper.com/design/postmortem-bitesized-city-builder-i-the-block-i-

### V4. The bridge to Side B — the central mechanic, not a feature

*"You build value by growing the city and laying out new infrastructure, and then
you gain more value by laying out UNIQUE infrastructure. As you code something
into the city that is different, that gains you more value in your city, because
it's something unique that isn't in another city."*

**Coding is a value multiplier inside the same economy.** Side A and Side B are not
two games sharing a world; they are one economy with two ways to raise the same
number. Mark's "ghost game behind a door" — enter a door, you are in a casino
someone coded — is structurally a piece whose contents are player-authored.

### V5. Two design cautions, recorded rather than decided

- **The milestone gate must not drag simulation into the first slice.** Mark's gate
  for unlocking a second city is city health — finance, schooling, healthcare.
  Those are simulation systems, and A1 puts simulation last. **Gate city two on
  something the sandbox already knows** — total value, or piece count — and swap
  in health systems when they exist. Otherwise the gate pulls the whole simulation
  forward and repeats the failure A1 documents.
- **If coding always beats building, the incentive is to code.** That may be
  exactly what is wanted, but it should be chosen rather than emerge. It also
  matters for the demo: a hiring manager may do neither well in two minutes, so
  both paths need a shallow entry.

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

### T9. THE DENSITY GRADIENT IS NOT LINEAR

Barr & Cohen (2014) on Manhattan's FAR, following Clark's negative exponential
D(r) = D₀e^(−γr): density **drops steeply immediately outside the core, then
flattens into a long low-density tail.** A linear falloff is wrong and will read
as wrong.
https://ideas.repec.org/a/eee/regeco/v48y2014icp110-119.html

And farmland never borders the core directly. An **interstitial band** of uses that
outbid agriculture but cannot afford urban rent sits between: distribution
warehousing, big-box retail, nurseries, large-lot estates.

---

## THE GRID — G1, locked, with its derivation shown

`rule://standard-piece-sizes` requires a fixed catalogue; A12 requires the
arithmetic be locked day one and versioned as a schema, because *"changing pivots
later… requires manual updates to hundreds of instances"* — and here that means
saved player cities.

**MODULE = 4 m. Submodules 2 m and 1 m. Detail snap 0.25 m. Snap is ONE CELL.
Pivot at the ANCHOR CELL'S CORNER, on the ground plane.**

**CORRECTED 2026-09-14.** This section read *"Snap at half the footprint. Pivot
at footprint centre"* — both superseded, and both were still stated here, in the
section headed "locked," long after the corrections that replaced them.
C1.2 corrects the snap: on a discrete cell grid **the cell is the snap**, always
one module; the half-footprint rule is for continuous-space editors and would put
odd-width pieces on half-cells. C-5 corrects the pivot: a centre pivot puts every
odd-dimension piece — 2×3, 3×3 — at a half-module offset, and the corner pivot
matches `{typeId, anchorCell, rotation}`, where the anchor already *is* a corner.

A12's warning applies literally to saved player cities: *"changing pivots
later… requires manual updates to hundreds of instances."* **This is the value
that must never change again.** It is stated here and nowhere else.

Why 4:

- **Burgess's rule, Bethesda GDC 2013:** footprints must be multiples of each
  other. *"A 512 room will always tile nicely with a 256 hallway, but a 384 room
  will eventually create gaps."* 4 → 2 → 1 halves cleanly twice.
- **Portland's 60 m block is exactly 15 modules.** Clean.
- **Cities: Skylines' published minimum footprints** — 1×1, 2×2, 3×2 — become
  4×4 m, 8×8 m and 12×8 m. A shed, a small house, a shop. Plausible at human
  scale, which is the test that matters.
- CS2 ships an 8 m cell; 4 m is one subdivision finer, which buys the 1×1.

**Where a rounding was believed necessary and turned out not to be, said
plainly:** this section previously rounded a supposed Manhattan block of
274 m to 272 m (68 modules), because 274 does not divide by 4. **VERIFIED
2026-09-13 (CORRECTIONS C-9): 274 m was never Marshall et al.'s real figure.**
Their Table 1 gives Manhattan's existing block as 256 × 60 m — see L2 — and
256 is already **exactly 64 modules** at 4 m. No rounding needed; the
rounding note is removed rather than corrected, since there is nothing left
to round.

**And the trap avoided.** Polycount's warning is that a spatially-fluent
non-artist will let a real-world dimension set the module: *"If you pick 2m as
your major grid, your options to divide are 1m not 1.5m. If you had picked 3m,
1.5 would work."* The old world did exactly this — `ROAD_WIDTH = 9`, a real road
width, which turned out to be **the only odd number in the entire system** and
matched nothing. **The module is chosen for its arithmetic. Road widths are
derived from it, not the reverse.**

---

## C1 — THE PIECE CATALOGUE

Supersedes `PIECE-CATALOGUE-ROADS.md`, whose §5 is wrong (see R4: junctions are
generated, not authored).

### C1.1 Footprints — eight, and that is the whole set

Every footprint is a whole number of 4 m modules. Rotation gives the transposes
free, so 2×3 also provides 3×2.

| Footprint | Metres | Carries |
|---|---|---|
| 1×1 | 4 × 4 | kiosk, shed, substation, small civic |
| 2×2 | 8 × 8 | small house, corner shop |
| 2×3 | 8 × 12 | house, terrace unit, small retail |
| 3×3 | 12 × 12 | large house, small commercial |
| 4×4 | 16 × 16 | apartment block, mid commercial |
| 4×6 | 16 × 24 | large commercial, small warehouse |
| 6×6 | 24 × 24 | tower base, large commercial, civic |
| 8×8 | 32 × 32 | mega tower, large warehouse, stadium |

**Why these.** Cities: Skylines publishes the minimum below which zone blocks
cannot fill: **1×1, 2×2, 3×2**. All three are present. 4×4 matches Portland's
minimum residential lot rounded to module (T7). 8×8 matches Portland's minimum
commercial block. The rest are the multiples between.

**The cost is not the footprint, it is the variant set.** CS's own rule: a
building can only upgrade to another building **of the exact same size**. Every
footprint added obliges a full set of pieces on it. Eight is already generous;
resist adding a ninth.

### C1.2 A correction to Burgess's snap rule, so nobody implements it wrongly

Burgess says snap at **half the footprint**. That is for continuous-space level
editors. **On a discrete cell grid the cell IS the snap** — snap is one module,
always. Applying the half-footprint rule here would put odd-width pieces on
half-cells and break the occupancy grid.

Pivot: **the ANCHOR CELL'S CORNER, on the ground plane.** Never change it —
A12's warning applies literally to saved player cities. The single authoritative
statement of the pivot is in G1; this line exists only so that reading C1.2 alone
cannot mislead.

**CORRECTED 2026-09-14, and found by the world-layer lane rather than by its
author.** This read *"Pivot: footprint centre, on the ground plane. Never change
it"* — which correction C-5 had already superseded, saying so by name. G1 was
corrected the same day and this was missed, so for several hours the document
stated both pivots in two places and told you never to change either. A lane
building from C1.2 alone would have implemented the wrong one and been right to.

### C1.3 Roads — FOUR widths, and roads are TILES

**REWRITTEN 2026-09-13. The previous version specified generated junctions, from
R4. R4 describes Cities: Skylines and SimCity 4 — both CONTINUOUS SPLINE road
systems. This is a DISCRETE TILE BOARD. Generated junction meshes cannot coexist
with `{typeId, anchorCell, rotation}`, a fixed catalogue, or instanced
rendering. R4 does not cross the architecture boundary and is withdrawn here.**

**Mark said enumerated junction types were right and was overruled with evidence
from the wrong kind of game. Mark was correct.**

Per `rule://standard-piece-sizes`, **a road tile is carriageway plus its own
footways in one piece.** Never a road with pavement added afterwards.

| Class | Modules | Metres | Carries |
|---|---|---|---|
| Lane | 2 | 8 | one lane each way, narrow footways |
| Street | 4 | 16 | two lanes, full footways, parking |
| Avenue | 6 | 24 | four lanes, or two plus median |
| Highway | 8 | 32 | grade-separated, no footways |

**Four, not five, and the 3-module street is gone.** All widths are now even
multiples, which keeps every road corridor symmetric about a cell boundary. The
old world's `ROAD_WIDTH = 9` was a real-world dimension and the only odd number
in the system (G1); a 12 m street would have been a quieter version of the same
mistake.

**Junctions are catalogue tiles, and the count is bounded by one rule.**

Per class: **straight · curve · T · cross · end**. That is 5 × 4 = 20 tiles.

Mixed-width junctions are bounded by an **adjacent-class-only rule**: a junction
may join the same class, or classes neighbouring in the hierarchy. A highway does
not T into a lane — not in this catalogue and not in a real city. That gives
three adjacent pairs × {T, cross} = 6 more, plus 3 width-transition tiles.

**Roughly 30 road tiles total.** Enumerable, authorable, instanceable, and
addressable as `{typeId, anchorCell, rotation}` like everything else.

**The junction tile is square and sized to its widest arm.** Narrower arms meet it
at their own width, handled inside the tile's own geometry.

### C1.4 Buildings — the shape of a piece

Every building piece carries, per R9:

- **Three stacked masses: base, middle, top.** Visible especially in blockout.
- **The ground floor is its own piece class**, separated from the upper floors by
  a material change, an awning or a dark trim. Sourced twice, and the rule
  low-poly city builders universally break.
- **Architecture is modelled; clutter is a prop.** Windows, frames, doors,
  gutters, chimneys → modelled. Air-conditioning units, fire escapes, pipes,
  mailboxes → props. The **5 cm rule**: detail under 5 cm of depth does not change
  the silhouette, so it is texture or prop, never geometry.
- **A `join_spec`** — how it meets the ground. Three tiers, cheapest first:
  contact darkening baked into the lower mesh → a ground decal sized to the
  footprint → a modelled skirt or plinth. R8: *"interesting things happen where
  different things meet."*
- **Proportion**, from adopted code: towers read best near **3.5 : 1** height to
  width; a step-back under **15 ft reads as one mass**, over as two.

### C1.5 How many pieces — start far lower than instinct says

**Firewatch shipped 23 unique tree models for an entire game**, ~4,600
placements, trees filling half the screen. Eastshade got "really far" on four
broadleaf variants. Caravan SandWitch's entire foliage is 39 props.

Eastshade's advice is the rule: **start with ONE variant and test it in a real
scene before building a second.**

And the budget inverts from instinct — Bethesda: *"players were quicker to react
negatively to repeated detail elements, as opposed to broad architectural
repetition."* **Spend variation on props, colour and ground-floor treatment
before spending it on more building meshes.**

Free variation that costs no new mesh: vertex-colour masks with per-theme palette
sets (≤5 channels, Dorfromantik's own cap, for noise reasons) · randomised window
states · re-propping the same mesh · position and rotation on the lot · mirroring
· scale and rotation jitter · world-space detail overlay.

### C1.6 Where the meshes come from

**~1,000 CC0 city meshes, $0, no attribution** — Kenney's City Kits and Modular
Buildings, Nature Kit (330 models), Quaternius Downtown City MegaKit (315).
**GLB, not FBX.** Disable "Recompute Normals" — flat shading breaks if the engine
re-derives them.

**One shared material, applied to everything. A8: style clash is a shader
problem** — ten first-hand accounts fixed it by unifying the shader, none by
editing geometry.

**CORRECTED 2026-09-14, applying C-7, which this section never absorbed and
which it still directly contradicted.** This read: remap every pack's UVs onto a
single ten-colour palette atlas, *"nearest-neighbour filtered, is the coherence
fix."* **Do not do that.** Kenney and Quaternius meshes carry real information in
their textures — road markings, lane lines, window panes, signage, door frames —
and flattening those onto ten colours produces precisely the untextured blockout
look this rebuild exists to correct. The spec instructed, as the remedy, the
exact failure being remedied.

**The method instead, converged on independently by two research passes:** keep
each pack's own albedo untouched; replace only the LIGHTING EQUATION, in one
shared shader; load every texture as a layer of a single `Texture2DArray` /
`DataArrayTexture`; pass the layer index as a per-instance attribute. Meshes from
different packs then render in one draw call, with one material, textures intact.

The cost, named by both passes: an array texture requires every layer to share
one resolution and format, so a build-time pass must normalise them. That is a
script, run once, offline — not a runtime cost and not a loss of detail.

**Greybox the entire kit in flat boxes with correct footprints and pivots, and
prove every piece snaps, before modelling anything.** That phase is where Mark's
AutoCAD and Revit fluency is worth most and where not being a 3D artist costs
nothing.

**Do not use AI mesh generation** (A10) and **do not buy Synty** — it ships as
engine projects, so you convert to GLB yourself and lose the shaders, which is
most of what was paid for.

---

## C2 — THE PLACEMENT CONTRACT

### C2.1 Representation

- **A piece is `{ typeId, anchorCell, rotation }`.** Nothing else.
- **The footprint is DERIVED** — `occupiedRect(anchor, rotation, catalogue[typeId].footprint)`
  *(the field is `footprint`; this line said `.size` until 2026-09-14, matching
  nothing in `data/catalogue.json` or the code)*
  — recomputed on demand, never stored. RimWorld's pattern, and the only
  representation that survives rotation without a bug class.
- **A dense occupancy grid is maintained as an index**, holding the piece's
  integer ID in **every covered cell**, giving O(1) reverse lookup. OpenTTD does
  this for multi-tile stations.
- **Typed arrays, addressed `y * width + x`.** No object per cell, no `Map` keyed
  on a string, no sparse arrays — V8 documents a permanent 6× slowdown from a
  single hole.
- **Axis-aligned rectangles only.** A6: Ostriv enumerated what one step beyond
  costs — triangulation, outline shader replacement, picking refactor, overlap
  refactor, and a new pathfinding system.

### C2.2 The interaction — Tier 1, and it is small

1. **Palette → tool mode.** Pick a piece; the cursor becomes a placer.
2. **Ghost snapped to the cell**, showing the true footprint, not an icon.
3. **Validity evaluated continuously and shown**, binary. Click is **inert** when
   invalid — no error dialog, nothing to dismiss.
4. **Commit** on click.
5. **Cancel** on Esc.
6. **Remove.** A bulldoze mode is Tier 1.

**Undo is NOT Tier 1.** Cities: Skylines shipped millions of copies with a
bulldoze tool and no undo at all — `Ctrl+Z` appears only in its map editor.

**Highest-value single addition once Tier 1 works: fast-replace.** Factorio's
kovarex: *"The most frequent thing I'm missing is the fast replace… Adding the
feature for just this one case opens the floodgates."*

### C2.3 Validity

**Revalidate when the anchor cell or the rotation changes — not every frame.**
One function, walked over the derived rect, early-out on first failure. Checks, in
order of cheapness: in bounds → terrain type permits this piece → no cell in the
rect is occupied → slope within tolerance.

**The ghost and the commit call the same function.** One code path. If they can
diverge, they will.

### C2.4 Touch

One-finger drag cannot be both camera and piece. Two shipped resolutions:

- **SimCity BuildIt** — the **drag itself is the hover substitute** and a
  **checkmark is the click substitute**.
- **Townscaper** — tap to place, with a deep undo stack instead.

**Pick one.** Given C2.2 has no undo, the drag-and-confirm model is the
consistent choice.

### C2.5 Save format

**`{ seed, generatorParams, tombstones: number[], placements[] }`.** Regenerate
the base board on load; store only what the player changed. A4: Minecraft keeps
the seed in `level.dat` and edits in region files — the recipe and the
exceptions to it.

**CORRECTED 2026-09-14, applying C-6, which this section never absorbed.**
Without `tombstones` the format cannot record a DELETION: there is no way to say
"the player bulldozed a generated road," so regenerating from the seed on load
silently puts it back. Tombstones are the cell indices where generated pieces
were removed. A save format that cannot represent removal fails 2.2's own gate,
which is that placement *and removal* survive a reload.

**Never a full board snapshot with no seed. That is the 7.5 MB JSON with extra
steps.**

---

## C3 — THE FIRST SCORING RULE

A2's item five: *a reason one cell beats another.* The research is unambiguous
that this is the item people skip and the one that decides whether it is a game
or a toy. It ships in the first slice.

### C3.1 The mechanism — scalar fields, per GlassBox

Parallel to the occupancy grid, dense, same addressing:

- `landValue` — the number that matters
- `desirability` — accumulated positive influence
- `nuisance` — accumulated negative influence

**Buildings are not on these grids. They read them and write into them.** That is
GlassBox's structure and it is what makes Mark's "develop the land and it becomes
more valuable" model cheap to compute.

### C3.2 Version one, deliberately small

**On placement, a piece writes an influence into cells within its radius, falling
off with distance.** Housing raises desirability nearby; industry raises nuisance;
parks and water raise desirability; roads raise access.

**`landValue` is recomputed for affected cells only** — the dirty set from the
influence radius, never the whole board.

**The ghost shows the target cell's current value and what placing there would
yield.** That single number, changing as the cursor moves, *is* the reason one
cell beats another. Everything else is elaboration.

**The falloff must not be linear.** T9: Clark's negative exponential — steep drop
immediately outside the core, then a long flat tail. A linear gradient will read
as wrong even to someone who cannot say why.

### C3.3 What comes later, and must not come now

Mark's full model — farmland becomes a house becomes a subdivision becomes a lake,
and unlockable buildings that raise value across a district — is the elaboration.
It sits directly on top of C3.2 and needs nothing C3.2 does not already have.

**Simulation stays out.** A1 is unambiguous, and the milestone gate has already
been deferred to a locked door with no systems behind it for exactly this reason.

---

## OPEN FOR MARK — none of these block Phase 1 starting

1. **Terrain scale and ratio.** The old spec was 68.2% water, 215.2 km², 32
   islands, and it produced what you rejected. What is the mainland's size
   relative to the archipelago?
2. **Catalogue breadth.** How many piece types at the start? Roughly 20–30 per
   class was your figure for variety; footprints must stay few.
3. **Persistence.** Where does a player's board live, and who pays for it?
4. **Demo spend ceiling**, and what stays gated behind it.
5. **Trees** — `caliper-bld #3`, open since before today: 12 species and age
   variants against 2 shapes. Now a catalogue question rather than a draw-call
   one.

---

## HOW THIS IS BUILT

`rule://build-loop` every step. `rule://lane-brief` — phases run from committed
briefs, not prompts. `rule://queue-exhaustion` — a lane descends to the next
written item and never invents. `rule://quarantine` — nothing is deleted.
`rule://reviewer-independence` — blind review before every implementation.

**Phase 1 produces no visible improvement and the page will look worse before it
looks better.** Mark accepted that explicitly on 2026-09-11. Do not shortcut
Phase 1 to get something on screen; that shortcut is the whole reason this file
exists.

---

# ADDED 2026-09-14 — THE THREE SYSTEMS THIS DOCUMENT NEVER SPECIFIED

Everything above describes a board. It does not describe the world the board
sits in, it no longer describes a scoring rule (C-10 deleted C3 and wrote no
replacement), and it gives Side B one line. Those three gaps are filled here.

**Where W, S or B below conflicts with anything above, these win** — they are
later and they were written against the corrections rather than before them.

---

## W — THE WORLD LAYER

### W1. Areas are GEOGRAPHIC, not a uniform grid

The world is the whole terrain: the downtown island, the archipelago, the
mainland with its port and farmland. It is generated once, deterministically,
from a seed, and **all of it exists from first load.**

The world is divided into **areas**, and an area is a piece of geography — one
island, one stretch of mainland coast, one valley — **not a tile of a uniform
grid.** The generator defines them and their boundaries are water or
impassable terrain.

This is not a cosmetic choice. It settles three problems at once:

- **Nothing straddles an area boundary**, because the boundary is water. A
  piece is at most 8×8 cells; an area boundary is a coastline. The
  straddling case that would otherwise force either a dead seam or
  multi-area loading simply cannot arise.
- **Locking is legible.** "This island is not open yet" is a thing a player
  understands. "Tile 7,3 is not open yet" is not.
- **The overview means something.** You pick an island, not a rectangle.

Mark, 2026-09-13: *"the board itself... the whole world should be made just not
opened, that will make sure that it is built right from the start and then we
can add on to it rather than having to build it and potentially messing with the
existing world."*

### W2. Area state, and exactly one is active

Every area is `LOCKED` or `OPEN`. Exactly one OPEN area is `ACTIVE` at a time —
the one being played. **Locked does not mean ungenerated.** Terrain exists
everywhere from the first frame; locking controls play, not existence.

Opening an area is a game action (Phase 3). One area is OPEN at the start.

### W3. Area size is the real board-size decision

**256 × 256 cells — 1,024 m at the 4 m module — is the working figure for a
typical area**, recorded as a choice rather than a measurement. It is a real
city site, it is fillable in a sitting rather than being an empty field, and
its occupancy grid is **256 KB**. Geography will make areas vary; this is the
target a generated island is sized toward, not a constraint on it.

*The figure was 128 KB here until 2026-09-14 and was wrong.* It assumed a
16-bit index — but a 256 × 256 area has 65,536 cells, so 65,536 distinct piece
ids plus an empty sentinel does not fit in a `Uint16Array`. The index is
`Int32Array`, so every occupancy figure in this document doubles. Nothing it
was used to argue changes; the numbers were never near a limit.

**The world's extent is NOT a performance number and must not be derived from
one.** It comes from the terrain design — how many islands, how much mainland.
A world of sixty-four such areas is 8 km square and costs roughly **17 MB** of
occupancy data, of which one area is live at a time. The cost of a large world
is storage, and storage is not the constraint.

*Recorded because it caused a real error:* an earlier pass proposed a
256 × 256 ceiling **for the whole world**, derived from the cost of sweeping
every cell each frame. This design never sweeps the board — scoring is
dirty-set only (S3), generation and save run once. The ceiling was real
arithmetic answering a question nobody had asked.

### W4. The overview is the real world, rendered coarsely

Mark, 2026-09-13: *"it should still be 3D and highest quality snapshot of our
actual world so that it shows you what it looks like and updates as you build
it."* And: *"having it look cheap will be the death of it as it will be what
you see first."*

So the overview is **not a separate map.** A hand-made map is a second artifact
that drifts out of sync with the first. The overview renders:

- **The same terrain heightfield**, at coarse LOD.
- **Built content as massing**, not as buildings — merged volumes whose height
  and footprint follow what is actually built there. Re-baked when the player
  leaves an area, so it always reflects the real city.
- **Locked areas** rendered, and visually distinct — desaturated, no built
  content, legible as dormant rather than as missing.

Zoom is bounded. You cannot zoom from the overview to street level; at a
threshold the camera descends into the area and the real content loads.

**A deliberate transition, not a mode switch.** True continuous geometric zoom
over player-built content requires runtime proxy generation and hierarchical
LOD, which two independent research passes agree is too expensive for one
person in a browser. The transition is placed where that breaks, on purpose,
and dressed as a descent rather than as a loading screen.

### W5. What loads, and when

| Always resident | On entering an area | Discarded on leaving |
|---|---|---|
| World heightfield (from seed) | That area's placements | That area's meshes and textures |
| The area list and their states | Its pieces' meshes, materials, impostors | Full-resolution terrain for it |
| Overview massing for every area | Full-resolution terrain for it | — |

Placements are never discarded; only their rendered form is. Leaving an area
re-bakes its overview massing.

### W6. Addressing

A cell is `{ areaId, x, y }`, local to its area. Areas are independently sized,
so there is no global cell grid and no global index arithmetic. A piece is
`{ typeId, anchorCell, rotation }` exactly as C2.1 says, where `anchorCell`
carries its `areaId`.

**Camera-relative rendering: the active area re-centres at the origin on
entry.** At 8 km from an origin, float32 gives roughly millimetre precision and
produces visible vertex jitter and Z-fighting. Because only one area is ever
active, this costs one translation on entry and removes the problem entirely —
but it must be designed in at the start, because retrofitting it means touching
every transform.

---

## S — THE SCORING RULE (replaces C3.1–C3.2, per C-10)

C-10 moved the scalar-field model to Phase 3 and specified "flat adjacency
scoring" without writing it. This is that specification.

### S1. Stateless, by construction

`value(cell) = terrainContribution(cell) + Σ contribution(piece, cell)` for
every placed piece within Chebyshev radius **R = 3** cells.

There is no tick. No agents, no pathfinding, no propagation beyond R, no state
that evolves between player actions. The value of the board at rest is a pure
function of what is on it. **If it needs a clock, it is out of scope.**

### S2. What a piece carries

Two new catalogue fields per piece type:

- `baseValue` — an integer.
- `adjacency` — a map from category (or specific `typeId`) to an integer
  bonus or penalty applied to cells within R.

Housing raises desirability nearby. Industry lowers it. Parks and water raise
it. Roads raise access. Terrain contributes directly — water adjacency and
buildable slope.

**CORRECTED 2026-09-14, per `docs/specs/SCORING-MODEL-2026-09-14.md` (Mark's
own decisions, folded in here as item A1).** This superseded ONE sentence
above: *"Housing raises desirability nearby"* is not wrong, but it is not the
whole rule — Mark's scarcity argument (a townhouse in Midtown beats an
equivalent condo purely through scarcity) means more housing nearby also
**dilutes** per-unit value, and both effects are real at once, resolved by
acting on different categories rather than by picking one:

| Piece category | → residential | → commercial |
|---|---|---|
| `commercial` (shops) | + strong | — |
| `civic` (services), **amenity entries only** | + strong | — |
| `landmark` (entertainment) | + strong | — |
| `residential` | − dilutive | + |
| `industrial` | − strong (unchanged) | — |
| `road` | + access (unchanged) | + access (unchanged) |

**`baseValue` no longer enters `value(cell)`.** §S1's formula never consumed
it — it was a stored constant nothing read. It survives as the **unit count**
a piece represents (footprint area × massing tiers, unchanged formula), used
by §S4's `totalWorth = perUnitWorth × units(type)` rather than by the ghost's
own location-only readout — SCORING-MODEL §3 has the full derivation.

**Amenity civic entries key on `typeId`, not on the bare category.**
`substation-a` is category `civic`, the same as a library — a flat civic
bonus would make a substation raise nearby housing value, which is wrong in a
way anyone would feel. `public/catalogue-validator.js`'s own
`AMENITY_CIVIC_TYPE_IDS` export (imported from
`scripts/migrate-catalogue-s2-fields.mjs`) is the authoritative, disclosed
list; everything in `civic` not on it carries no residential bonus.

**Compounding is non-recursive**, decided for the same reason §S1's own gate
already required it: a cell's value is computed from what pieces are within
R, never from neighbours' own computed values — a recursive version either
iterates to a fixed point or becomes order-dependent, and order-dependent
fails §S1's gate outright. True second-order lift (a neighbourhood raising
its own reputation beyond the sum of its parts) needs a fixed-point solve,
and a separate build-cost layer (land near the centre costing more because
there is less of it and because what is already built constrains what can
go on it) is a different mechanic again — both real, both Mark's, both
parked rather than built; `SCORING-MODEL-2026-09-14.md` §§5–6 has the full
account and a later checklist item writes them up as their own plan
sections.

**Falloff across R is not linear** (T9, Clark's negative exponential): steep
immediately outside, then a long flat tail. A linear gradient reads as wrong
to a player who could not say why.

### S3. Computed on change, for the dirty set only

On placement or removal, recompute only the cells inside the affected radius.
Never the whole board, never per frame. This is what makes a large world free.

### S4. What the player sees, and it is the whole point

**The ghost shows the target cell's current value and the value the piece would
have there.** That number, changing as the cursor moves, *is* the reason one
cell beats another. A2's item five, the one the research says is always
skipped, is this single readout.

### S5. Developed value sits on top, unchanged in mechanism

V3 — farmland becomes a house becomes a subdivision — needs nothing S1 does not
already have. Improving a cell changes what is placed there, which changes its
neighbours' contributions, which is already how the function works.

---

## B — SIDE B'S DATA MODEL

Side B is the differentiator, the pipeline behind it already works, and this
document has given it one line. The gap is not the pipeline. It is that nothing
says **what a player-authored piece IS.**

### B1. A player-authored piece is a catalogue entry. Full stop.

Same schema as every shipped piece — `id`, `footprint`, `category`,
`rotatable`, `terrainMask`, `baseValue`, `adjacency` — plus provenance:
`author`, `verifiedBy`, `createdAt`, `sourceRef`.

Its geometry comes from model-written procedural code, validated against the
schema and executed in the sandbox. That is A11's documented loop and it is
what the Build pipeline already does. **The board cannot tell the difference
between a shipped piece and an authored one, and must not be able to.**

### B2. THE DAY-ONE REQUIREMENT, and it is the same class as the pivot

**`data/catalogue.json` must support entries added at runtime, not only entries
shipped in the file.** The catalogue is a registry with a persisted overlay, not
a static asset.

If the catalogue is built as a fixed shipped file, Side B is not a feature that
gets added later — it is a rewrite of the piece system, the save format and the
validator. This belongs beside A12's grid arithmetic on the list of things
locked before anything depends on them.

### B3. Uniqueness is where coding becomes value

Mark, 2026-09-11: *"you gain more value by laying out UNIQUE infrastructure. As
you code something into the city that is different, that gains you more value in
your city, because it's something unique that isn't in another city."*

So: **a piece whose `typeId` is player-authored contributes a uniqueness
multiplier to `baseValue`.** Side A and Side B stop being two games sharing a
world and become one economy with two ways to raise the same number — which V4
already says, and which S2's `baseValue` now gives a place to live.

### B4. What stays out of scope here

Sharing authored pieces between players, a marketplace, moderation, and the
token economy are all in `VISION.md`. B1 and B2 are what Phase 2 must not
foreclose; the rest is later.

---

## REVISED BUILD ORDER — supersedes Phase 2 above

The ordering above is unchanged in its central rule (placement before
generator). Two things move.

**The world layer comes first**, because 2.1's "bounded grid of addressable
cells" is an *area* inside a world, and those are different objects. The board
cannot be built until the thing containing it exists.

**The look moves earlier — and is proven on a handful of pieces before the
catalogue is built.** The plan had models at 2.6, "the phase is won or lost
here." That is the third time the look has been scheduled last, and the
previous world was rejected for exactly that. Proving the shared material, the
four lighting mechanisms and one join treatment on five pieces costs days;
discovering they do not work after two hundred pieces exist costs the project.
R2 and C1.5 already say this — *"start with ONE variant and test it in a real
scene before building a second"* — and A12 says greybox the kit and prove every
piece snaps before modelling anything.

1. **The world layer.** Areas, state, the overview, the transition, addressing,
   camera-relative origin. W1–W6.
2. **The area board.** Grid, occupancy index, terrain fields. Data only.
3. **Placement.** C2's Tier 1, on one area. The vertical slice, real but ugly.
4. **The look, on five pieces.** One shared material, array texture with a
   per-instance layer index (C-7, not the palette atlas C1.6 still describes),
   the four R1 mechanisms with **Half Lambert squared**, one join treatment
   from R8. Judged against 1.4's references.
5. **Scoring.** S1–S5. Without it this is a toy, not a game.
6. **Terrain.** Heights, water, slope constraints. Coarse mesh with heightmap
   displacement, decoupled from the gameplay grid.
7. **The catalogue proper**, built to the look proven at step 4.
8. **Impostors and the overview.** Offline-baked multi-angle impostors for
   distance; the overview's massing bake.
9. **The generator, LAST**, emitting through the same `place()` the player
   calls.
10. **Side B**, pointed at the new board. B1–B3.
11. **Progression.** Tasks, goals, NPCs.

*Phase gate, unchanged in spirit:* a person opens the page, sees a world worth
looking at, picks an area, places a building, sees why that cell was worth
choosing, and it is still there on reload.
