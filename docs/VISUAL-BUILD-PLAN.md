# CALIPER — the visual build plan

Target: a city that reads like SimCity (2013) or Cities: Skylines at a glance.
Not a pixel match — a world a stranger would call a game rather than a diagram.

**Mark is the visual judge.** Every phase below ends at a screenshot he looks
at. No phase is closed on a passing test alone; tests here protect budgets and
correctness, not appearance. Appearance is judged by eye, by him, and the
verdict is recorded in this file.

**This plan is the record.** Tick items here as they land, with the command that
measured them. A phase without a measured before/after has not been done.

---

## PART 0 — MEASURED BASELINE, 2026-09-06

Everything below came from a command. Re-measure before claiming any of it
changed.

| Fact | Value | Source |
|---|---|---|
| Buildings placed | 19,725 of 19,874 plots (149 refused) | `node scripts/measure-layout.mjs` |
| Distinct geometries | 480 | `node scripts/check-layout-geometry.mjs` |
| Triangles across those 480 | 153,060 (avg **319** each) | same |
| Triangles drawn, whole scene | 6,886,892 | same |
| InstancedMeshes | 480 | same |
| Building typologies | 12, each with LOD0/1/2 | `public/buildings.js` |
| Building LOD0 range | ~140–696 tris | Phase L measurement |
| Asset library entries | 7,200 (2,400 models × 3 LODs) | `public/tier-models.js` |
| **Asset library tris** | **min 12, median 12, p90 36, max 180** | declared `tris` field |
| Materials | MeshStandardMaterial ×30, MeshBasic ×17 | grep |
| Lighting | directional, ambient, hemisphere, point | grep |
| Shadows | 190 castShadow, 98 receiveShadow, shadowMap on | grep |
| Post-processing | EffectComposer, UnrealBloom, tone mapping, colour space | grep |
| Textures | CanvasTexture ×16, normalMap ×8, roughnessMap ×5, aoMap ×1 | grep |
| Street kit | sidewalk ×94, crossing ×126, kerb ×51, markings ×5 | `public/roadkit.js` |

### What this baseline says

**The renderer is not the problem.** PBR materials, shadows, bloom, tone mapping
and colour management are all already in place. That is most of what makes the
reference screenshots look the way they do, and it is already built.

**The geometry is the problem, and unevenly.** Buildings average 319 triangles
— low, but they are genuinely composed from 252 primitive calls, so the system
is real and needs enriching rather than replacing. The 2,400-model asset library
is different: a median of 12 triangles is a cube, exactly. That library is what
fills the space between buildings, and it is boxes.

**Reference point:** a SimCity building is roughly 2,000–15,000 triangles with
modelled balconies, cornices, setbacks, window reveals and roof plant. So the
gap is roughly **10× on buildings and 250× on props.**

**The budget that makes this possible.** 19,725 buildings at 2,500 triangles is
49M triangles, which is not viable. It only works with distance-banded LOD: rich
near the camera, cheap far away. At 6.9M drawn today there is real headroom for
a much richer near field.

---

## PART 1 — THE BUDGET

> ### ⚠️ REWRITTEN 2026-09-07 — THREE OF THESE NUMBERS WERE INVENTED
>
> Mark: *"it created a whole bunch of ones that came out of nowhere and has
> caused us problems … especially ones that were just invented for no reason.
> Like, the twelve million ceiling has no source at all. So what is it that
> we're going against?"*
>
> He is right, and the audit trail is plain:
>
> | Number | Where it came from |
> |---|---|
> | **12M drawn triangles** | **no source anywhere.** Never derived, never cited. |
> | **200,000 distinct triangles** | 7× headroom over a single 27,608 measurement, justified only as "more than the GPU should hold for one city" |
> | **900 draw calls** | a comment inside `layoutGeometry.test.ts` |
> | 1,500–3,000 near-band triangles | chosen by eye against reference screenshots |
>
> **These caused real damage.** Chunking was removed to satisfy the 900, which
> broke culling entirely. The kitbash exemplar was reported "over budget" against
> a band nobody derived. Six times a number was declared a pass or a breach
> against a threshold that had no authority.
>
> ### THE ONLY REAL BUDGET IS FRAME TIME
>
> Triangles and draw calls are **proxies** for frame time. Measure the thing
> itself and the proxies stop being gates:
>
> | Budget | Value | Source |
> |---|---|---|
> | **Frame time, target** | **16.7 ms (60 fps)** | display refresh rate — physics, not preference |
> | **Frame time, floor** | **33.3 ms (30 fps)** | below this it is not playable |
> | **VRAM for distinct geometry** | **~56 MB at 2M triangles** | derived: ~500k vertices × 44 B + index. Arithmetic, and it is written down |
>
> **Drawn triangles, draw calls and distinct triangles are now DIAGNOSTICS, not
> gates.** Report them — they explain *why* frame time moved — but do not pass or
> fail a phase on them. A phase passes if frame time holds at the stated camera
> on stated hardware, and fails if it does not.
>
> **One caveat that matters:** every frame time measured so far is under
> SwiftShader software rasterisation, where medians of 60–120 ms are normal and
> mean nothing about a real GPU. **Until a frame time is measured on real
> hardware, this project has no verified performance figure at all** — and that
> should be stated rather than papered over with proxy numbers.
>
> The near-band 1,500–3,000 range stays as **guidance for authoring**, explicitly
> marked as chosen by eye rather than derived. That is honest. Treating it as a
> gate was not.

### The original table, kept for the record — no longer authoritative

Every phase works inside this. Exceeding a band is a decision with a written
justification and a re-measurement, never a quiet raise. Enforced by
`test/layoutGeometry.test.ts`.

| Band | Distance | Triangles per building | Notes |
|---|---|---|---|
| **Near** | 0–400 m | 1,500–3,000 | Full detail. Textured, modelled openings. |
| **Mid** | 400 m–1.5 km | 300–800 | Massing plus facade texture. Roughly today's LOD0. |
| **Far** | beyond 1.5 km | 40–150 | Silhouette only. Texture carries it. |
| **Whole scene** | — | **≤ 12M drawn** | Hard ceiling. Today 6.9M. |
| Distinct geometries | — | ≤ 200,000 tris | Existing `distinctTris` check. |

Frame budget: **60 fps at 1440p on the reference machine**, measured with
`scripts/shoot-app.mjs` timing, not by feel. A phase that ships below that is
not done regardless of how it looks.

---

## PHASE V0 — IS THE BOARD ACTUALLY RIGHT?
*Correctness before appearance. Do not polish a broken world.*

Mark's report, unverified and needing investigation before anything visual:

- Old roads and features apparently still present from a previous world.
- "A crest that seems like a road but isn't" — an artefact with no clear owner.
- The main ocean island reads as empty; the tall buildings and downtown appear
  to have gone.
- The layout generally does not look like the rules-driven world it should be.

**V0.1** Render the world from six fixed camera positions and inspect each.
Record what is there against what `measure-layout.mjs` says should be there.

**V0.2** Reconcile the counts by settlement. 19,725 placements exist somewhere —
find out where. If downtown is sparse in the render but dense in the data, the
defect is in the renderer or the LOD, not the layout.

**V0.3** Identify the "crest". Name what generates it and whether it is a
terrain artefact, an orphaned road, or a placement with no model.

**V0.4** Find anything rendering that no current generator produces — leftovers
from a previous world that were never cleared.

**Exit:** a written reconciliation of data against render, every discrepancy
either explained or fixed. Mark looks at the six renders and agrees the board is
structurally right. **No visual work starts before this passes.**

---

## PHASE V1 — FACADE TEXTURING
*Biggest visual return for the least work. Zero triangles added.*

The reference screenshots' mid-rise blocks are simple masses. What sells them is
surface: window grids, floor bands, spandrels, a material change at the podium.

**V1.1** A procedural facade generator producing a `CanvasTexture` per
typology × variant × material family: window grid at the right floor rhythm,
spandrel bands, ground-floor treatment, roof edge.

**V1.2** Generate matching `normalMap` and `roughnessMap` from the same source
so glass reads as glass and brick as brick under the existing lighting.

**V1.3** One texture atlas per material family, shared across instances, so this
costs texture memory once rather than per building.

**V1.4** Emissive windows for night lighting — the existing tone mapping and
bloom will do the rest.

**Budget:** no triangle change. Texture memory ≤ 64 MB total.
**Exit:** side-by-side render, before and after, at street level and mid-range.
Mark's call.

---

## PHASE V2 — THE ASSET LIBRARY STOPS BEING BOXES
*2,400 models at a median of 12 triangles is the single worst number here.*

**V2.1** Categorise the 2,400 by what they actually are and how often they are
seen. Street trees, lamps, cars, benches and signage are seen constantly and get
priority; a rooftop vent seen once does not.

**V2.2** Rebuild the top ~200 by visible frequency at 150–800 triangles with
real silhouettes.

**V2.3** Everything else gets a proportionate lift, still inside the far-band
budget.

**V2.4** Colour and material variation per instance so a row of the same tree
does not read as a row of the same tree.

**Exit:** street-level render. The frame should be full of things that are not
cubes.

---

## PHASE V3 — BUILDING SILHOUETTES, NEAR BAND ONLY
*Where the triangles go.*

**V3.1** Podium and tower split, setbacks, crowns, parapets — the massing moves
that make a skyline read.

**V3.2** Balcony bands, cornices, window reveals with real depth. Depth is what
catches the light; flat facades read flat however good the texture.

**V3.3** Roof detail: plant, tanks, stair overruns, aerials. Overhead views are
half the reference screenshots and roofs are most of what they show.

**V3.4** Entrance treatment at ground level — canopies, steps, glazing.

**Budget:** near band only, 1,500–3,000 triangles. Mid and far unchanged.
**Exit:** overhead and street-level renders. Skyline silhouette from distance.

---

## PHASE V4 — THE GROUND PLANE
*`roadkit.js` already has sidewalks, crossings, kerbs and markings. Verify they
render, then finish them.*

**V4.1** Confirm what the road kit actually draws today versus what it defines.
Its parts exist in code; whether they reach the screen is unmeasured.

**V4.2** Lane markings, crossings, stop lines, kerb returns at junctions.

**V4.3** Sidewalk texture, driveways, plot edges — the seam between road and
building is where cheap worlds show.

**V4.4** Ground-cover variation: grass, paving, dirt, plot landscaping.

**Exit:** overhead render at district scale. Compare against reference
screenshot 8, which is almost entirely roads and reads as a city because of it.

---

## PHASE V5 — MATERIAL AND COLOUR IDENTITY
*The current world reads pastel and uniform. The references have hard contrast.*

**V5.1** A real material palette: brick, concrete, glass, metal, stucco, timber
— each with distinct roughness and colour range.

**V5.2** Assign by typology and district so neighbourhoods differ from each
other.

**V5.3** Weathering and age variation so a street is not uniform.

**V5.4** Review the overall grade — the reference images are more saturated and
higher contrast than the current render.

**Exit:** district renders side by side. Neighbourhoods should be
distinguishable from the air.

---

## PHASE V6 — LIFE
*A still city is a diagram. The references move.*

**V6.1** Vehicles on roads, correctly oriented and spaced.
**V6.2** Pedestrians at street level.
**V6.3** Ambient motion: water, foliage, flags, smoke.
**V6.4** Day/night with lights coming on — the existing bloom already supports it.

**Budget:** instanced, ≤ 500k triangles total.
**Exit:** a moving render. Mark's call on whether it feels alive.

---

## PHASE V7 — PERFORMANCE PASS
*Everything above costs. This is where it gets paid for.*

**V7.1** Measure frame time at each band, per phase, against the PART 1 budget.
**V7.2** Frustum and occlusion culling.
**V7.3** Texture atlas consolidation, draw-call reduction.
**V7.4** LOD transition smoothing — no popping.

**Exit:** 60 fps at 1440p, measured. If a phase must be scaled back to hold
that, say which and why in this file.

---

## PHASE V8 — THE VISUAL REGRESSION GATE
*So none of this quietly degrades later.*

**V8.1** Fixed-camera reference renders committed as baselines.
**V8.2** A pixel-diff check that fails the build on unexplained visual change.
**V8.3** Triangle and draw-call budgets asserted per band.
**V8.4** The frame-time measurement wired into the same gate.

**Exit:** deliberately break something visual and watch the gate go red.

---

## RUNNING RULES

- **Mark judges appearance.** Tests protect budgets and correctness only. Never
  close a visual phase on a green suite.
- **Measure before and after, every phase**, with the command written beside the
  number. A phase without a before is not a phase.
- The default world stays byte-identical unless a phase explicitly changes
  generation — pinned by `test/worldSeed.test.ts` and `test/planSeed.test.ts`.
- Do not touch `tick`, `chooseAction`, `applyAction`. The nine regression checks
  pass unedited.
- Nothing deleted — quarantine to `_TO-DELETE/<reason>/`.
- Zero API spend without authorisation.
- One phase per branch. Mark merges.

## RECORD

| Phase | Status | Measured before | Measured after | Mark's verdict |
|---|---|---|---|---|
| V0 | **NOT PASSED — reopened, moved to the CLI lane** | 19,725 placed, 149 refused, 480 variants | docs/audits/V0-BOARD-AUDIT.md, then docs/audits/WORLD-DENSITY-FINDINGS.md | **Mark: the board is not structurally right.** See note below. |
| V1 | LANDED (`280b029`), **gate did not verify it** | 0 facade textures | 4 PBR atlases (16 MB tex mem) in `facade-textures.js` | **Mark, 2026-09-06: better than it was. Two defects — windows on roofs; repetition.** |
| V2 | **PARTIAL** (`4f80434`) — V2.1/V2.2 done, **V2.3 not** | props median 12 tris | 2,860 tris across manifest props + 5 generator families. `tier-models.js` (2,400 models) **untouched** | **Mark: better than it was, long way to go.** |
| V3 | not started | 153,060 distinct tris | — | — |
| V4 | not started | unmeasured | — | — |
| V5 | not started | — | — | — |
| V6 | not started | none | — | — |
| V7 | not started | 6,886,892 drawn tris | — | — |
| V8 | not started | no gate | — | — |

### V0 — why it was reopened, 2026-09-06

`docs/audits/V0-BOARD-AUDIT.md` refuted three of Mark's four reports and
recommended proceeding to V1. **Its own settlement table is the evidence against
that verdict.** Every settlement declared as a dense core is dominated by
terraces:

| Settlement | Declared class | agy's own dominant typology |
|---|---|---|
| `fairlight-isle-core` | **TOWER** | `bld-terrace`, 834 of 1,206 |
| `westbay-isle-core` | MIDRISE | `bld-terrace`, 499 of 706 |
| `kingsley-isle-core` | MIDRISE | `bld-terrace`, 321 of 452 |
| `cormorant-isle-core` | MIDRISE | `bld-terrace`, 345 of 481 |

Claim 4 was refuted on the grounds that "all 19,725 buildings strictly obey plot
classes." They do. The plot classes are what is wrong — only 4.19% of plots are
large enough to hold a tower, so a TOWER settlement produces terraces and no
rule is broken while it happens.

The audit also contradicts itself: the summary states "all 81 towers and 1,344
midrises are intact on the central estuary island", but 1,344 is the world-wide
MIDRISE plot count and the audit's own table gives downtown 308 midrises. The
summary overstates downtown roughly fourfold, and that is what carries the
REFUTED verdict.

**The lesson, for the ledger:** this audit knew what it was checking. It was
given Mark's four claims as claims to be adjudicated, and it adjudicated them —
which is a different activity from measuring the world and reporting what is
there. Naming the suspicion is what stops it looking. A board audit should
measure first and meet the reports afterwards.

**Two findings in it are real and were not otherwise known, and both stand:**

- **V0.3, the crest has a second cause.** `roadsWithBatter: 1,172`, cuts to
  38.0 m, fills to 44.6 m, 165 roads over the earthworks budget. A 38 m cut
  shelf across a hillside reads exactly as "a road that isn't". This is a
  better match for Mark's report than the barrier island's crescent, and both
  may be true at once.
- **V0.5, distance-based LOD is not active.** Every building in the world draws
  at LOD0. This had been assumed working.

**Board correctness now belongs to the CLI lane** — see
`docs/specs/WORLD-REBALANCE-BRIEF.md`. V0 stays open until the rebalance lands
and Mark says the board is right.

### LANE BOUNDARY, so the two lanes do not collide

| | agy | CLI lane |
|---|---|---|
| **Owns** | buildings, props, materials, textures, LOD, sidewalks, kerbs, crossings, markings, junction *geometry* | the world plan: which settlements exist, what class they are, how blocks subdivide, which roads exist and whether they connect |
| **Files** | `buildings.js`, `tier-models.js`, `props.js`, `roadkit.js`, the render and material path | `city-plan.js`, `layout.js`, `land-use.js` and their tests |
| **Phases** | V1, V2, V3, V5, V6, V7, V8 | V0, and the rebalance brief |

**Road surface is agy. Road network is CLI.** That is the one boundary that is
easy to cross by accident.

V1–V3 are not invalidated by the rebalance: facade textures and prop models are
per-typology, not per-placement, so a townhouse carries the same facade wherever
it ends up standing. **agy should keep going.**
