# Overnight: finish the controls and clear the overlaps

Mark is asleep. Autonomous run. **Zero API spend** — all of this is front-end. If you think a paid
call is needed, stop and report.

Commit each item separately. **Verify by looking**, not by reading — take screenshots and compare
them. There are headless capture scripts already in use in this repo; reuse or rewrite one.

---

## Already done (verify, don't redo)

Landed just before you started, tests green at 199 Node + tsc clean:

- `ENV_MAP_INTENSITY` constant, raised `0.22` → `1.0`. **Found stacking with
  `scene.environmentIntensity` (0.45 day / 0.12 night), so effective daylight IBL was 0.099** — under
  a tenth of the HDRI's real energy. If day now looks too hot, `environmentIntensity` is the next
  knob, not this one. Change one, look, then decide.
- Anisotropic filtering on every texture, read from real hardware caps.
- The material-warning flood is fixed — optional recipe fields are no longer passed as `undefined`.
  Console should be quiet now. **If new warnings appear, that is a real signal, not noise.**
- `terrainHeightAt(x, z)` extracted to one shared function at the top of `world-render-3d.js`. The
  terrain mesh and walk/drive/fly cameras now all read it.
- Nav pad arrows are mode-aware press-and-hold, driving the same `_keysDown` the keyboard uses.
- `pressNavKey` / `releaseNavKey` / `releaseAllNavKeys` / `getNavigationMode` on both the renderer
  and the wrapper.
- A mode-aware control legend in the nav pad.

---

## 0 — THE VISUAL TARGET. This is the main work of this run.

Mark sent five references: one KitBash3D archviz render of a photoreal waterfront city, one Cities:
Skylines shot, and three SimCity BuildIt shots.

**Read this before starting, because the obvious interpretation is wrong.** The gap between our
scene and the KitBash3D image is **not lighting**. Every tower in that render is individually
modelled — balcony bands, mullion grids, expressed floor slabs, setbacks, rooftop mechanical plant,
parapets, signage. Ours are `RoundedBoxGeometry` primitives. No HDRI, AO, SSGI or path tracer turns
a box into that. **The detail is in the geometry.**

KitBash3D is a commercial store and there is no CC0 kit at that quality. Do not go looking for one.

### The split that makes this safe

The pipeline only edits **placements, object types and surfaces**. The skyline behind them is set
dressing and never needs to be pipeline-editable. So:

- **The editable world stays fully procedural** — recipe-driven, verifiable, unchanged.
- **The backdrop city may carry real façade detail**, because nothing has to reason about it.

**If you import any external mesh, `NOT_YET_PRESENT` in `src/worldStructure.ts` must be corrected in
the same commit.** It currently claims "no external glTF/FBX mesh imports". Shipping an import while
that line stands makes the grounding stage tell visitors something false — that exact bug has
already happened twice in this repo with textures and audio.

### In priority order — highest visual return first

**1. Façade detail as procedural rules.** Give the building generators: expressed floor slabs, a
mullion/window grid, balcony bands on residential, a parapet and rooftop plant, ground-floor
glazing distinct from the tower above. This is free, stays inside the recipe model, and is the
single largest step toward the reference. **Do this before touching materials or post.**

**2. Aerial perspective.** The far towers in the reference fade into atmospheric haze, and that one
effect carries more of the realism than anything else in the frame. Our renderer has none, and
there is a test asserting "no fog" as an invariant. **That invariant is wrong for this target —
remove or invert it, and say in the commit that you did.** Use exponential height-based fog tuned so
the near city stays crisp and the distant skyline and mountains recede. Overdone fog looks worse
than none; tune it against the reference.

**3. Real PBR materials.** CC0 sets from **ambientCG** (`ambientcg.com`) and **Poly Haven**:
architectural glass with correct roughness and reflection, concrete, weathered metal, wet asphalt.
Two of our four texture sets are still colour-only, which is why surfaces read flat.

**4. Screen-space reflection.** The reference road is wet. Reflective ground is a large, cheap-looking
win. `realism-effects` (github.com/0beqz/realism-effects, MIT) gives SSR and SSGI together.

**5. Ambient occlusion.** `N8AO` (github.com/N8python/n8ao, MIT). We still have none, and it is the
strongest single cue that objects sit in a scene rather than float above it.

**6. Depth of field and proper AA.** `pmndrs/postprocessing` (Zlib) — SMAA (we currently render
through a composer with *no* antialiasing at all), a real mip-chain bloom, and DOF. The reference
holds the foreground sharp and lets the city fall off; that is half of why it reads as a photograph.

**7. Cascaded shadow maps.** `three-csm` (MIT). One 2048 map over a 2400m world means the distant
city casts nothing.

### Honest scope

**Say so if you disagree with the target.** Real-time browser rasterization tops out at excellent
stylised realism — nearer the SimCity references than the archviz one, and for an
architecture-trained candidate a clean, correct, well-lit city that runs live is a stronger artifact
than a mediocre attempt at photoreal. If after items 1–3 the honest read is that further chasing
hurts, stop and report that.

Keep 60fps on integrated graphics, pixel ratio capped at 2, and keep the total texture payload
modest — this loads on a phone. Verify licences and record them as was done for the HDRI.

**Screenshot before and after from the same camera, and judge honestly.** If a change does not
clearly improve the frame, revert it and say so.

---

## 1 — Overlapping controls. Mark sent a screenshot; fix these too.

Confirmed overlaps in drive mode at desktop width:

- **The NAVIGATION pad sits on top of the DISTRICT info card**, bottom-left. The card's content is
  unreadable behind it.
- **The street HUD banner** ("WATERFRONT DRIVE · W/S to Accelerate…") **collides with the top bar**
  button row.
- The bottom-right Build panel and the top-right district buttons crowd each other.

Do a **full overlap sweep**, not just these three. Every floating panel, at desktop and at 375px,
in every navigation mode, with the district card open and closed, with the status card open and
closed. **Measure with `getBoundingClientRect()` and assert non-overlap** rather than eyeballing —
then screenshot to confirm.

The rule: **no floating panel may cover another panel's content or any interactive control.** If two
things want the same corner, one of them moves or they stack in a single flow container.

Add a test that computes the rects of every floating panel and fails on intersection. This has
recurred repeatedly; a test is the only thing that will stop it.

## 2 — Verify the terrain following actually works

Drive toward the east and west coastal cliffs and into the alpine range to the north. The camera
should ride up the slope. Screenshot at three points along a climb. Before this fix it went straight
through the hillside into open air — confirm that is gone, and that nothing now clips through the
ground on flat terrain either.

Check the marina and harbour too: `terrainHeightAt` returns negative values over water, so confirm
walk and drive do not sink below the seawall or the pontoon.

## 3 — Verify the nav pad drives movement

In walk, drive and fly: hold each of the four arrows with the mouse and confirm the camera moves,
and that releasing — including releasing off the edge of the button, or switching mode mid-hold —
stops it. A stuck key is a camera that never stops.

Confirm the legend text changes with the mode and is readable at 375px.

## 4 — Look at the lighting change

`ENV_MAP_INTENSITY` moved 0.22 → 1.0 and I could not see the result. Screenshot midday and midnight,
compare against the previous captures, and judge honestly. If it is blown out, lower
`scene.environmentIntensity` rather than reverting the constant — the per-material attenuation was
the wrong place for it. If it is clearly better, say so.

## 5 — Deploy

**The live site is many commits stale** — it has been for the whole of this work, and every fix in
it is invisible to a visitor. `npx wrangler deploy`, then verify against the deployed URL, not
localhost.

---

## Report

What you changed, what you verified and how, the before/after screenshots, and anything above that
turned out wrong once you were in the code. Say plainly if you disagree with any of it.

Standing rules: 199 Node tests plus the workerd suite must still pass, `tsc` clean, the nine
regression checks unedited, no internal identifiers or model names in any served asset, never
delete — move aside to `_TO-DELETE/`.
