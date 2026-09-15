# BLD lane, overnight, 2026-09-14 -- handover

Brief: [docs/briefs/OVERNIGHT-BLD-2026-09-14.md](../briefs/OVERNIGHT-BLD-2026-09-14.md).
Worked the checklist in full (L11, L12, I1, I2, via `process_next_item` for
`caliper-bld`). The one remaining item, BO7A, stayed blocked all night on a
cross-lane dependency, checked repeatedly per the brief's own §5 instruction
rather than waited on.

## Item 0 (§0 of the brief)

`process_list_moments` and `process_at("session-start")` run first. The
brief itself (a committed file, per `rule://lane-brief`) already existed
uncommitted at session start -- committed at `1f6cae3`. `codex` confirmed
on PATH before it was needed.

## L11 -- cast shadows

`08dc08f`. A self-contained shadow map (not three.js's own automatic
system, which needs a real `THREE.Light` and a material this
`ShaderMaterial` deliberately does not use) -- an orthographic camera along
the shading's own `LIGHT_DIR`, a `DepthTexture`, PCF-sampled in the shader.
Before/after: `07-join-decal.png` -> `08-cast-shadows.png`. Measured, not
estimated: 4.00 MiB shadow-map texture (fixed, independent of piece
count), ~8.5-9.1ms shadow-pass render time.

## L12 -- the proof scene at a realistic piece count

`312fb7d`. Read C1.5 and R2 first, per the brief's own instruction:
Firewatch shipped 23 unique tree models for an entire game; Caravan
SandWitch's entire foliage is 39 props. Chose **20**, the same order of
magnitude, not 200. A third real CC0 pack (Kenney City Kit Commercial)
added for a genuine array-texture-layer scaling test, not two packs'
pieces repeated. Gate held: **1 draw call at 20 pieces**, same as at 4
(1,270 -> 32,355 triangles). Real bug found by rendering, not
inspection: the mega-tower's height scaled linearly with its own
footprint (~87 m) before being capped at 6x.

## I1 -- octahedral impostors

`b7f5e82`. Investigated under the real name against a real, fetched,
quoted primary source (the open-source `Godot-Octahedral-Impostors`
baker's own README) after the popularising industry article
(shaderbits.com, Ryan Brucks) returned only page metadata to `WebFetch`,
and the academic precursor (INRIA, CiteSeerX) was bot-blocked at every
mirror tried -- both named rather than silently substituted. An 8x8 = 64-
angle hemi-octahedral bake of one piece, colour+normal+depth. Measured:
4.00 MiB per atlas uncompressed, real on-disk PNG bytes read via
`fs.statSync`. Two real GPU-only defects found by looking at the actual
atlas images (a blank canvas, then a smeared one), both fixed.

## I2 -- the overview's massing bake

`3f8d54e` (extracted the shared piece list first) + `7f6633f` (the bake
itself). REBUILD-PLAN.md W4: "merged volumes whose height and footprint
follow what is actually built there." Each of the same 20 pieces' REAL
height is measured from its own loaded geometry, never guessed from
footprint class. **242 triangles versus L12's own 32,355 at full detail
-- a 99.25% reduction, still 1 draw call.** Does not implement
re-bake-on-leaving-an-area: no area system exists on this branch to leave
(BO1 merged to `origin/main` at `3d8c90a`, not into `codex-lane`).

## Phase-boundary audit, and what it found

`cf8471a`. `process_open_audit`, trigger `phase-boundary`, scope: every
file this run touched. **Ten findings, relayed verbatim per D7 in the
commit message, not summarised here.** Five were real defects and were
fixed, each verified (mutated where a test could check it, or re-rendered
and read by eye where it could not):

1. **Normal-space mismatch** -- `look-proof-material.js`'s vertex shader
   used three.js's own `normalMatrix` (view space, confirmed directly in
   `node_modules/three/src/renderers/WebGLRenderer.js:2129`) against
   world-space light math everywhere else. Invisible in every render
   this run produced, because each is one fixed-camera still shot, so the
   mismatch just reads as "some light direction." Fixed.
2. **Hemi-octahedral formula wrong at the corners** -- `y = 1 - |u| - |v|`
   over the full square goes negative at all four corners (40 of 64
   angles pointed below the piece). Fixed with the standard fold,
   extracted into `public/octahedral-mapping.js` so the test checks the
   REAL function numerically rather than a second copy of the formula.
3. **Shadow camera undersized for an oblique light** -- fitted from the
   object's own world-axis half-widths, not from what the light actually
   projects. Fixed: fit the frustum to the bounding box's 8 corners in
   the shadow camera's own view space.
4. **`stripHtmlComments` alone doesn't stop a JS `//` comment** from
   masking a real fix inside a `<script>` block. Fixed: both test files
   now also run `stripSourceComments`, the same double-strip this
   project's own `reachability.test.ts`/`rendererStatic.test.ts` use.
5. **No test opened the committed atlas PNGs themselves** -- every check
   read the script's own source, never the artefact. Added a real check:
   file exists, real PNG signature, IHDR matches `stats.json`'s claimed
   resolution, on-disk bytes match `stats.json`'s own recorded figure.

Five more were named, not fixed, each with why (full reasoning in
`cf8471a`'s own message): `dumpster.glb`'s two extra meshes are dropped
by the single-mesh loader; a few hardcoded/duplicated facts across files
(`detailedTriangleCount`, layer-index-to-pack ordering); the "one draw
call" claim's structural test is weaker than the runtime number the
shoot script actually reports (the runtime number is what's cited
everywhere else); reported timings are CPU-submission, not
GPU-synchronized; neither bake has a product consumer yet (expected --
both are investigation/measurement items, not wiring instructions).

**A real mistake made and caught during the audit-fix step:**
re-rendering `08-cast-shadows.png` to verify the fixes actually
overwrote that historical 4-piece image with the current 20-piece scene's
output (there is no "4-piece mode" left in `look-proof-scene.html` since
it now reads the shared 20-piece list unconditionally). Caught by
checking `git status` before trusting the render; restored via
`git checkout HEAD -- <file>`.

## BO7A -- checked repeatedly, never waited on

Checked at session start, after L12, after I1/I2, and again at the end of
the phase-boundary audit -- `git fetch origin` + `git log origin/main
origin/world-layer` each time. CLI's `A1` commit (the catalogue category
rewrite) was **not on origin at any check tonight**, most recently
confirmed absent at **2026-09-14T09:37:38Z**. `data/catalogue.json` was
never opened. This is a finding about `A1`'s own timeline, not about this
run.

## What's still open, carried from the prior handover and unchanged

All three predate this run and were not touched, per the brief's own §7:
`docs/specs/LOOK-UPGRADE.md` rejects the CC0 pipeline `REBUILD-PLAN.md`
now requires, unreconciled; `CLAUDE.md` still points at
`docs/WORLD-BUILD-PLAN.md` as "the current work"; `test/mutationEvidence.test.ts`'s
own summary is stale (was 133 against 149 real entries; now further stale
given this run's own new mutation-worthy fixes were verified by direct
mutation rather than added to `test/mutations.json`, since none of
tonight's fixes had a pre-existing dedicated mutation-tooling entry point
-- named here rather than silently left inconsistent).

## Guards held

`CALIPER_ALLOW_SPEND` unset throughout -- CC0 downloads (Kenney's three
packs) and the audit's own dispatch to `codex` (a local CLI tool, not a
billed API call this project's spend cap governs) are not API spend.
Nothing deleted -- one stale generated texture-array file was overwritten
in place (a regenerable build output, the same precedent
`scripts/gen-module-map.mjs` already sets for `docs/MODULE-MAP.md`), not
a `rule://quarantine` case. `git commit -F` with explicit paths, no
`git add -A`, for every commit above. `data/catalogue.json` never opened.
