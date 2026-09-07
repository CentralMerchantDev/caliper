# CALIPER — the visual roadmap

The full build, phase by phase, from "coloured blocks" to a world that reads as
a game. Companion to `docs/VISUAL-BUILD-PLAN.md` (the record you tick) and
`docs/visual-reference/README.md` (what good looks like).

**Mark is the visual judge.** No visual phase closes on a passing test. Tests
here protect budgets and correctness; appearance is decided by eye, by him.

**Ambition, stated plainly:** this is intended to become a real game, not a
portfolio demo. Build accordingly — every decision should survive someone
playing it for a hundred hours.

---

# HOW TO WORK

## The loop, every phase without exception

1. **Measure before.** Record the numbers and the command that produced them.
2. **Render before.** Fixed cameras, committed images.
3. **Build.**
4. **Measure after**, same commands.
5. **Render after**, same cameras.
6. **Show Mark both**, side by side. Wait for his verdict.
7. **Record** the verdict in `VISUAL-BUILD-PLAN.md`'s RECORD table.
8. **Commit**, one phase per branch. Mark merges.

A phase without a measured before/after has not been done, however good it
looks.

## When to stop and ask Mark

Stop and ask — do not decide alone — whenever:

- A **visual judgement** is required: colour, proportion, style, density,
  "is this enough". This is his job and he has asked for it.
- A phase's exit render is ready. **Always.**
- A budget in PART 1 would be exceeded. Bring the measurement and the reason.
- Two approaches are genuinely close and the difference is taste.
- Something in the reference images can't be reproduced within budget — say what
  you'd do instead before doing it.
- A phase turns out bigger than described, or its premise is wrong. Both have
  happened on this project; saying so early is cheap.
- You need real-world reference (a building type, a road layout, a material)
  that isn't in the images provided.

Ask with a **render attached** wherever the question is visual. A described
question about appearance wastes his time; a picture answers itself.

## When to keep going without asking

- Correctness fixes with an obvious right answer.
- Anything measurable against a stated budget.
- Refactors that leave appearance unchanged (prove it with a pixel diff).
- Work explicitly described in the phase you're on.

---

# THE BUDGET

Every phase works inside this. Exceeding a band is a decision with a written
justification and a re-measurement, never a quiet raise.

| Band | Distance | Tris per building | Notes |
|---|---|---|---|
| Near | 0–400 m | 1,500–3,000 | Full detail, modelled openings |
| Mid | 400 m–1.5 km | 300–800 | Massing + facade texture |
| Far | > 1.5 km | 40–150 | Silhouette; texture carries it |
| **Scene total** | — | **≤ 12M drawn** | Hard ceiling. Today 6.9M |
| Distinct geometries | — | ≤ 200,000 tris | Existing `distinctTris` check |
| Texture memory | — | ≤ 64 MB | Atlases, not per-instance |
| Frame rate | — | **60 fps @ 1440p** | Measured, not felt |

Measured baseline is PART 0 of `VISUAL-BUILD-PLAN.md`. Do not restate those
numbers from memory — re-run the commands.

---

# PHASE V0 — IS THE BOARD ACTUALLY RIGHT?

*Correctness before appearance. Do not polish a broken world.*
**Blocks every other phase.**

Mark's report from the deployed site — each is a claim to verify, not a fact:

- Old roads and features apparently still present from a previous world.
- "A crest that seems like a road but isn't."
- The main ocean island reads as empty; downtown and the tall buildings look
  gone.
- The layout doesn't read like the rules-driven world it should be.

### Tasks

**V0.1 — Render and look.** Six fixed cameras: downtown, main ocean island,
mainland, harbour, a beach settlement, whole-region overhead. Use
`scripts/shoot-app.mjs` and `scripts/shoot.mjs`. Commit the images. Describe
plainly what you see in each.

**V0.2 — Reconcile data against render.** `measure-layout.mjs` reports 19,725
placements across 54 settlements. Break that down per settlement and compare to
what each render shows. If downtown is dense in data and sparse on screen, the
defect is the renderer or LOD selection, **not** the layout. Say which, with
evidence.

**V0.3 — Identify the crest.** Terrain artefact, orphaned road, placement with a
missing model, or something else. If you can't identify it, say so rather than
guessing.

**V0.4 — Find leftovers.** Anything rendering that no current generator
produces. The layout was rebuilt from rules in an earlier phase; anything
predating that and still drawing is a real defect.

**V0.5 — Check LOD selection.** 480 distinct geometries across 19,725
placements. Confirm which LOD each placement receives at each camera distance.
A world that looks empty at range is often one drawing its far LOD everywhere.

**V0.6 — Verify the road kit reaches the screen.** `roadkit.js` defines
sidewalks (94), crossings (126), kerbs (51), markings (5). Whether any of it
renders is unmeasured.

### Exit
`docs/audits/V0-BOARD-AUDIT.md` with every claim marked CONFIRMED / REFUTED /
UNDETERMINED and the command or image that decided it. Fix only unambiguous
defects with obvious fixes; anything needing a design decision goes to Mark.
**Mark agrees the board is structurally sound before V1 starts.**

---

# PHASE V1 — FACADE TEXTURING

*Biggest visual return for the least effort. Zero triangles added.*
**Reference: ref-02 (background mid-rise), ref-09, ref-05.**

Those mid-rise blocks are simple masses. What sells them is surface.

### Tasks

**V1.1 — The facade generator.** Procedural `CanvasTexture` per
typology × variant × material family. Window grid at correct floor rhythm
(~3–3.5 m residential, ~4 m commercial), spandrel bands, distinct ground floor,
roof edge. Deterministic from the same seed the building uses, so a rebuild is
byte-identical.

**V1.2 — Normal and roughness maps** generated from the same source, so glass
reads as glass and brick as brick under existing lighting. Window recesses in
the normal map are what make a flat wall stop looking flat.

**V1.3 — Atlas them.** One atlas per material family, shared across instances.
Texture memory is paid once, not per building.

**V1.4 — Emissive windows** for night. Existing tone mapping and bloom do the
rest. Vary lit/unlit per instance so a tower isn't uniformly illuminated.

**V1.5 — UV the existing geometry** so textures land correctly on every
typology, including at LOD1.

### Budget
No triangle change. Texture memory ≤ 64 MB. Draw calls unchanged (atlasing
should reduce them).

### Exit
Before/after at street level, mid-range and overhead. **Mark's call.**

---

# PHASE V2 — THE ASSET LIBRARY STOPS BEING BOXES

*Median 12 triangles is the worst number in the project.*
**Reference: ref-09 (street furniture density), ref-08, ref-07.**

### Tasks

**V2.1 — Categorise by visible frequency.** All 2,400 models: what is it, how
often is it on screen. Street trees, lamps, cars, benches, signage are seen
constantly. A rooftop vent seen once is not. **Report the categorisation to Mark
before rebuilding anything** — the priority order is a judgement call.

**V2.2 — Rebuild the top ~200** at 150–800 triangles with real silhouettes.
Trees need canopy shape, not a sphere on a stick. Cars need a profile.

**V2.3 — Everything else** gets a proportionate lift inside the far-band budget.

**V2.4 — Per-instance variation:** colour, scale, rotation, slight geometry
variants. A row of identical trees reads as wallpaper.

**V2.5 — Placement density.** Count ref-09's distinct objects in one frame —
dozens. Compare to CALIPER's current street. Density may matter more than
individual quality.

### Budget
Far band 40–150 tris. Instanced throughout. Scene total stays ≤ 12M.

### Exit
Street-level render. The frame should be full of things that are not cubes.
**Mark's call.**

---

# PHASE V3 — BUILDING SILHOUETTES, NEAR BAND ONLY

*Where the triangles go.*
**Reference: ref-01 (sculptural form), ref-05 (podium/tower, height variation).**

### Tasks

**V3.1 — Massing moves:** podium and tower splits, setbacks, crowns, parapets.
The moves that make a skyline read as a skyline.

**V3.2 — Height variation within a district.** ref-05's downtown has towers at
many heights; uniform height reads as a bar chart. This may mean revisiting
generation parameters — **ask Mark before changing world generation**, since the
default world is pinned byte-identical.

**V3.3 — Depth on facades:** balcony bands, cornices, window reveals with real
depth. Depth catches light; flat facades read flat however good the texture.

**V3.4 — Roof detail:** plant, tanks, stair overruns, aerials. Half the
reference images are overhead views, and roofs are most of what they show.

**V3.5 — Entrances:** canopies, steps, glazing at ground level.

**V3.6 — Two or three landmark forms per district** — ref-01's sculptural
towers. A handful of distinctive buildings break up a horizon more than
enriching every building would.

### Budget
Near band only, 1,500–3,000 tris. Mid and far unchanged. Verify the near band
is genuinely distance-limited — this is where the 12M ceiling gets broken.

### Exit
Overhead, street-level, and distant skyline. **Mark's call.**

---

# PHASE V4 — THE GROUND PLANE

*ref-08 is almost entirely roads and reads unmistakably as a city.*
**Reference: ref-08 (the target), ref-03, ref-09.**

### Tasks

**V4.1 — Audit the road kit.** What does it actually draw versus define
(V0.6 may have answered this).

**V4.2 — Markings:** lane lines, crossings, stop lines, turn arrows, centre
lines by road class.

**V4.3 — Junction geometry:** kerb returns, corner radii, crossing placement.
Junctions are where cheap worlds show.

**V4.4 — The building-to-road seam:** sidewalks, driveways, plot edges, front
setbacks, garden planting. ref-08's suburbs are made of this.

**V4.5 — Ground cover variation:** grass, paving, dirt, gravel, plot
landscaping. Not one green.

**V4.6 — Parking**, where it belongs. Every reference image has it and CALIPER
has none.

### Budget
Ground geometry ≤ 1.5M tris. Textured heavily rather than modelled.

### Exit
Overhead district render beside ref-08. **Mark's call.**

---

# PHASE V5 — MATERIAL AND COLOUR IDENTITY

*Current world reads pastel and uniform. References have hard contrast.*
**Reference: ref-02 (contrast), ref-06 (grade), ref-07 (age/wear).**

### Tasks

**V5.1 — A real material palette:** brick, concrete, glass, metal, stucco,
timber, each with distinct roughness, colour range and normal character.

**V5.2 — Assign by typology and district** so neighbourhoods differ from each
other and from the air.

**V5.3 — Age and wear variation.** ref-07's street has buildings of visibly
different ages. Uniform newness reads as fake.

**V5.4 — The colour grade.** ref-06 is more saturated and higher contrast than
CALIPER's current render, with distance haze shifting blue. Fog and tone mapping
are already in the renderer. **Show Mark options rather than picking one.**

**V5.5 — Time of day.** Golden hour flatters everything; midday is honest.
Decide which is the default with Mark.

### Exit
District renders side by side; distant view for the grade. **Mark's call.**

---

# PHASE V6 — LIFE

*A still city is a diagram.*
**Reference: ref-09 (trams, cars, people), ref-07 (traffic), ref-08.**

### Tasks

**V6.1 — Vehicles on roads:** correctly oriented, sensibly spaced, following the
network. Instanced.

**V6.2 — Pedestrians** at street level, on sidewalks and crossings.

**V6.3 — Ambient motion:** water, foliage sway, flags, smoke, steam.

**V6.4 — Day/night cycle** with lights coming on. V1.4's emissive windows plus
existing bloom do most of it.

**V6.5 — Construction sites** — ref-04's cranes. A city being built reads as
alive, and CALIPER's player is literally building.

### Budget
Instanced, ≤ 500k tris total. Must not cost frame rate — measure.

### Exit
A moving render, not a still. **Mark's call on whether it feels alive.**

---

# PHASE V7 — PERFORMANCE

*Everything above costs. This is where it's paid for.*

### Tasks

**V7.1 — Measure frame time per band**, per phase, against PART 1.
**V7.2 — Frustum and occlusion culling.**
**V7.3 — Draw-call reduction:** atlas consolidation, instance batching.
**V7.4 — LOD transition smoothing** — no popping. Popping is more noticeable
than low detail.
**V7.5 — Memory:** texture and geometry budgets, mobile-viable if possible.

### Exit
60 fps at 1440p, measured. If a phase must be scaled back to hold that, **say
which and why** in `VISUAL-BUILD-PLAN.md`.

---

# PHASE V8 — THE VISUAL REGRESSION GATE

*So none of this quietly degrades later.*

### Tasks

**V8.1 — Reference renders** from fixed cameras, committed as baselines.
**V8.2 — Pixel-diff check** failing the build on unexplained visual change,
with a tolerance that survives driver noise but catches real regressions.
**V8.3 — Budget assertions** per band: triangles, draw calls, texture memory.
**V8.4 — Frame-time measurement** in the same gate.
**V8.5 — A documented way to update a baseline deliberately**, so an intended
change isn't blocked and an unintended one isn't waved through.

### Exit
Deliberately break something visual and watch the gate go red. Then fix it and
watch it go green.

---

# STANDING RULES

- **Mark judges appearance.** Never close a visual phase on a green suite.
- **Measure before and after**, command beside every number.
- Default world stays byte-identical unless a phase explicitly changes
  generation — pinned by `worldSeed.test.ts` and `planSeed.test.ts`. Changing
  generation needs Mark's agreement first.
- Do not touch `tick`, `chooseAction`, `applyAction`.
- The nine regression checks pass unedited.
- Nothing deleted — quarantine to `_TO-DELETE/<reason>/`.
- Zero API spend without authorisation.
- One phase per branch. Mark merges. No deploys.
- Commit messages say what was wrong and how it's known fixed. Write them to
  `docs/pending-commits/` and use `git commit -F`.
- Every correctness fix gets a test watched red before green.
- **When something turns out bigger or different than described, say so
  immediately.** Both have happened here; early is cheap, late is expensive.
