# K6: buildings reaching the world

<!-- cspell:words kitbash midrises midrise worktree -->

## World cameras

The seven fixed cameras are the deliverable. Captured with the unchanged
`scripts/shoot-reference-baselines.mjs`, at 1400 by 900, post-processing on,
2,000 m chunks, using the real world and its existing facade atlas.

| Camera | Before | After |
|---|---|---|
| Downtown skyline | [Before](../../.shots/k6-before/downtown-skyline.png) | [After](../../.shots/k6-after/downtown-skyline.png) |
| Downtown close | [Before](../../.shots/k6-before/downtown-close.png) | [After](../../.shots/k6-after/downtown-close.png) |
| Street level | [Before](../../.shots/k6-before/street-level.png) | [After](../../.shots/k6-after/street-level.png) |
| The harbour | [Before](../../.shots/k6-before/the-harbour.png) | [After](../../.shots/k6-after/the-harbour.png) |
| Waterfront | [Before](../../.shots/k6-before/waterfront.png) | [After](../../.shots/k6-after/waterfront.png) |
| Heritage quarter | [Before](../../.shots/k6-before/heritage-quarter.png) | [After](../../.shots/k6-after/heritage-quarter.png) |
| Container port | [Before](../../.shots/k6-before/container-port.png) | [After](../../.shots/k6-after/container-port.png) |

These are local, ignored artifacts, not published site URLs.

[Open all seven camera pairs](../../.shots/k6-world-comparison.html).
My judgment: **the city does not clear the tower reference at district distance**.
The added bases and roof edges are visible in Downtown close, Downtown skyline,
Waterfront, the harbour foreground, and Heritage quarter. The buildings now
have stronger terminations, but the same window grid and repeated roof trim
still dominate. The container-port view changes little; most of its visual
content is infrastructure and distant massing.

Street level remains wrong. The fixed camera was already pressed against a
facade; the new parapet makes a broad horizontal band in that view. Reducing
projection and contrast moderated it but did not make that frame better than
the baseline. I do not count that camera as a visual pass. The world also
retains conspicuous water banding, bright repeated trees, and very sparse
ground between buildings. Those existing defects remain visible in the
unmodified cameras and are not solved by facade depth.

The material references inspected were `kitbash-tower-air.png` and
`kitbash-tower-street.png` in `C:/Code/sandbox-spike/.shots/`. Their frames
show more convincing material contrast and finer depth than this city. They
are references, not matched lighting/camera controls.

## The disconnected capability

Candidate E has its most expensive instance so far: two lanes of geometry
work delivered to nobody. The kit reached its assembler and retrieval module,
but `public/city-render.js` has zero kitbash references. It imports
`building()` from `public/buildings.js`. Improving the kit did not improve
the buildings in the cameras Mark judges. Contact sheets concealed the missing
connection. The world already calls `getFacadeMaterial()` per variant; adding
another atlas integration would repeat the mistake.

K6.1 was verified with `git log`: `codex-lane` started at `52411b7`, including
main's P3.5 through P4.2 work and the merged kit work. No merge to main is part
of K6. The prohibited renderer, feature, land-use, and audit-protocol files
are outside this change.

## Measurements and priority

`scripts/measure-k6-buildings.mjs` calls the renderer's own `buildWorldState()`
and `buildScenePlacements()`, including real terrain, footprint assessment,
fit selection, and variant seeds. It measures actual index counts for every
placed variant, weighted by its placement count. There are twelve dynamic
typologies, not thirteen, and 17,108 placements. Terraces, townhouses, villas,
and midrises cover 92.74% of placements; these drive the treatment priority.

LOD0 triangles below are actual geometry, not declared budgets. Mean is
weighted by placements; range spans every variant used in this world.

| Typology | Placed | Share | Before range | Before mean | After range | After mean |
|---|---:|---:|---:|---:|---:|---:|
| Terrace | 8,499 | 49.68% | 240–324 | 274.24 | 384–468 | 418.24 |
| Townhouse | 4,460 | 26.07% | 300–384 | 333.93 | 444–528 | 477.93 |
| Villa | 1,480 | 8.65% | 500–696 | 587.76 | 644–840 | 731.76 |
| Midrise | 1,426 | 8.34% | 192–396 | 294.70 | 336–540 | 438.70 |
| Office | 497 | 2.91% | 120–240 | 178.41 | 264–384 | 322.41 |
| High-street terrace | 318 | 1.86% | 432 | 432 | 576 | 576 |
| Shop | 214 | 1.25% | 108–240 | 181.51 | 252–384 | 325.51 |
| Tower | 151 | 0.88% | 140–252 | 199.84 | 284–396 | 343.84 |
| Workshop | 31 | 0.18% | 168–180 | 170.32 | 312–324 | 314.32 |
| Business park | 14 | 0.08% | 144 | 144 | 288 | 288 |
| Warehouse | 11 | 0.06% | 348–492 | 387.27 | 492–636 | 531.27 |
| Apartment walk-up | 7 | 0.04% | 396–540 | 468 | 540–684 | 612 |

Each LOD0 gains 144 triangles and each LOD1 gains 84. LOD2 stays at 12.
Full placement-weighted LOD0 geometry therefore adds 2,463,552 triangles;
the cameras draw only their visible distance bands, measured separately below.

## Geometry treatment

The uncommitted pass inherited at the start of this turn is preserved in
`_TO-DELETE/k6-inherited/`. Its full-plot bands could float beside narrower
wall masses, and its cornices followed total height including roof furniture.
The replacement anchors trim to the actual largest wall box and its foundation
offset. Plot dimensions only clamp projections. Existing silhouettes, facade
UVs, and vertex colors remain. Trim uses the atlas's plain patch.

Contiguous terrace wall boxes are treated as one row. Their wall plane is
recessed 0.6 m at the outer ends so a plot-filling row still has an end-wall
reveal. Broad industrial halls receive deeper eaves; ordinary fabric receives
0.45 m projections. Trim color mixes the existing wall and roof colors.
Entrances attach to the lowest substantial wall, including a tower's podium.
The first camera pass exposed oversized pale trim at Street level. That pass
is preserved in `_TO-DELETE/k6-inherited/first-after/`; the final pass reduces
the projection and contrast instead of moving the camera.

LOD0 receives a base, ground-floor band, two string courses, a cornice,
entrance jambs and lintel, and either a hollow parapet or corner quoins for
pitched roofs. LOD1 carries the base, ground-floor band, cornice, and parapet
or quoins. AS4 explicitly requires LOD2 to remain one 12-triangle box. That
test blocks carrying architectural depth into the most distant representation;
it is a real limitation, not something this change works around.

## Frame time

The unchanged `scripts/probe-culling.mjs` uses SwiftShader at 1200 by 700,
with shadows and post-processing disabled. Its reported frame time times the
JavaScript render call; it does not synchronize GPU completion. It reads the
available samples when readiness is signaled, so sample counts and asynchronous
startup can vary. These are measured software-renderer submission times, not
a hardware-GPU frame-rate guarantee. Compare both 16.7 ms and 33.3 ms; neither
is replaced by an invented triangle ceiling.

At the 2,000 m chunk size used by the reference cameras:

| Camera | Calls before / after | Triangles before / after | Before min / median / max ms | After min / median / max ms | Median change |
|---|---:|---:|---|---|---:|
| Street level | 366 / 366 | 55,510 / 91,294 | 11.6 / 16.6 / 324.7 | 14.5 / 18.4 / 453.2 | +1.8 ms |
| Downtown skyline | 857 / 857 | 160,330 / 203,338 | 12.2 / 29.3 / 354.4 | 13.8 / 21.1 / 370.7 | -8.2 ms |
| The harbour | 664 / 664 | 285,888 / 332,004 | 10.8 / 19.6 / 341.8 | 10.2 / 21.0 / 361.9 | +1.4 ms |

The final medians all exceed **16.7 ms** and all remain below **33.3 ms**.
The baseline street median met 16.7 ms; the other two did not. Both before
and after have maxima far above both ceilings. This is not a clean frame-time
pass. The skyline's apparent improvement is not evidence that more geometry
made rendering faster: startup timing and shared-host load vary, and this
is one sweep per version. The observed costs are +1.8 ms at street level and
+1.4 ms at the harbour, with no additional draw calls in these three views.

Raw sweeps: [before](../../.shots/k6-before/frame-time.txt) and
[after](../../.shots/k6-after/frame-time.txt). The screenshot run uses
post-processing and shadows; the timing probe disables them. Its numbers
therefore do not certify the complete beauty-render workload against either
ceiling. No render or browser regression test ran alongside a full test suite.

## Four-azimuth gate

`scripts/shoot-buildings-self-shadow.mjs` compares shadow-disabled and
shadow-enabled renders at 45, 135, 225, and 315 degrees for every typology.
It requires at least one contiguous 2 by 2 patch darkened by 24 summed RGB
levels. Isolated edge pixels cannot pass. This is stronger than the kit's
nonzero-pixel gate; it is a minimal existence test, not an aesthetic score.
The committed baseline failed eight directions: terrace 225; shop 135 and
225; warehouse 45, 135, and 225; tower 135 and 315. Thresholds stay fixed
between the baseline and final geometry.

Counts below are contiguous shadow quads, ordered 45 / 135 / 225 / 315 degrees.
All twelve final typologies pass all four directions, with unchanged thresholds.
The probe uses one deterministic seed per typology; this does not establish
four-direction coverage for every procedural variant.

| Typology | Before quads | After quads |
|---|---|---|
| Villa | 1094 / 21 / 66 / 202 | 1576 / 27 / 73 / 76 |
| Terrace | 87 / 3 / **0** / 62 | 1261 / 18 / 51 / 104 |
| Townhouse | 1937 / 247 / 77 / 28 | 2666 / 116 / 101 / 26 |
| Midrise | 2984 / 86 / 50 / 185 | 3043 / 167 / 85 / 256 |
| Shop | 698 / **0** / **0** / 9 | 2845 / 21 / 35 / 11 |
| Office | 1275 / 392 / 75 / 84 | 1444 / 353 / 13 / 228 |
| Apartment walk-up | 2109 / 182 / 172 / 140 | 2795 / 159 / 156 / 128 |
| Warehouse | **0** / **0** / **0** / 23 | 519 / 5 / 23 / 10 |
| Workshop | 133 / 20 / 24 / 60 | 1000 / 25 / 86 / 37 |
| Tower | 361 / **0** / 1 / **0** | 1572 / 292 / 254 / 239 |
| High-street terrace | 396 / 19 / 23 / 19 | 2245 / 26 / 28 / 29 |
| Business park | 2766 / 102 / 62 / 38 | 2962 / 278 / 151 / 302 |

## Reproduction and preserved evidence

Validation: all 14 building/layout tests pass, including AS1 through AS4,
explicit cell width/depth clamping, footprint bounds, and the `options.cellW`
mutation guard. `npm run typecheck` passes. CSpell checks the new report,
scripts, and added building-code lines; project/API terms are explicitly
listed rather than treated as prose misspellings.

**The overall regression gate is red.** A5.1 confirms the reference files.
A5.2/A5.3 measures 366 / 857 / 664 draw calls and 91,294 / 203,338 / 332,004
triangles at street / skyline / harbour. Its call and triangle limits pass,
then its street-to-skyline triangle ratio fails: **44.90% against <40%**,
up from 34.62% in the baseline probe. The later environment assertion is not
reached after that failure. This is an assertion failure, not a host crash.

That ratio is sensitive to the relative complexity of near and distant LODs;
it is not itself a measurement of frame time or of how many objects the
frustum rejected. Adding real near detail while retaining the tested distant
box increases the ratio. I left the test unchanged and did not add distant
triangles to satisfy its denominator or reduce near detail to game it.
The measured timing costs and ceilings are reported above. This branch is
therefore not represented as passing every gate or ready for publication.

```text
node scripts/measure-k6-buildings.mjs .shots/k6-after/triangles.json
node scripts/shoot-buildings-self-shadow.mjs
node scripts/shoot-buildings-self-shadow.mjs --buildings=_TO-DELETE/k6-inherited/buildings-52411b7.js
node scripts/shoot-reference-baselines.mjs
node scripts/probe-culling.mjs
node test/run.mjs buildingLODAndColors.test.ts buildingExplicitSize.test.ts layoutGeometry.test.ts
node test/run.mjs regressionGate.test.ts
node scripts/build-k6-camera-comparison.mjs
```

Run the browser commands sequentially. The baseline source in quarantine is
an exact `git show 52411b7:public/buildings.js` export. The camera script writes
`.shots/baselines/`; copy its images to the appropriate before/after directory
after each completed run. The comparison builder validates the PNG signature,
1400 by 900 dimensions, and nontrivial file size of all fourteen captures.
Its HTML displays the actual world-camera files, with links to full resolution.

The initial uncommitted source and probe, earlier local camera directories,
and the first K6 after-pass are preserved in `_TO-DELETE/k6-inherited/`.
Nothing was deleted. The unrelated inherited `package.json` edit is excluded
from the K6 commit. The work is committed on `codex-lane`; these captures show
this worktree, not a deployment to the live site.
