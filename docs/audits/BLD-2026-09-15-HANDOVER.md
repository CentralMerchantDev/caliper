# BLD lane, 2026-09-15 -- handover

Brief: [docs/briefs/BLD-2026-09-15.md](../briefs/BLD-2026-09-15.md). N1
(all three parts) landed as three separate commits; BO7A checked, found
gated on a cross-lane merge decision it is not this lane's to make alone,
queued rather than acted on. Pushed to `origin/codex-lane` at `cbf3911`.

## §0 -- push first, then session-start

Local `codex-lane` was 78 commits ahead of `origin/codex-lane` (`d19ddf5`)
at session start. Pushed before anything else: `d19ddf5..aba191d`. This
run's own brief committed at `4d670a1`. `docs/specs/REBUILD-CHECKLIST.md`
was found already updated in the working tree (N1 for BLD, plus CLI's own
V1-V3/C1) -- committed as-received at `af29fc0`, per the file's own
"both lanes read this one file" convention, before working N1.

## N1 -- THE SCENE (not a shader task)

All three parts, each its own commit, each with a before/after from `08`'s
own fixed camera (`?hero=1`, added this run for exactly this continuity):

**a. Sky -- `5f72578`.** A `THREE.CanvasTexture` gradient as
`scene.background`. Measured, not assumed: +1 draw call, +2 triangles --
an earlier draft of the comment wrongly claimed free, corrected before
commit. Before/after: `08-cast-shadows.png` -> `11-sky.png`.

**b. Ground -- `3f0861e`.** Fog alone was tried first and rejected:
tuned twice (45,110 too weak; 20,65 fogged the buildings themselves out,
since they and the old ground's own edge occupy overlapping camera
distances in `?hero=1`). Fixed the actual cause instead -- a second,
much larger (400x400m), coarsely-subdivided plane merged into the same
draw call, fog retuned to (90,230) to hide only the now-much-further
edge. A second defect found by rendering, not assumed: the far plane's
single UV tile aliased into a visible checkerboard at grazing angles;
fixed with real mipmaps + anisotropic filtering on the array texture (512px
source, power-of-two, valid). `buildShadowPass` changed to take an
explicit bounding box (pieces + near ground only) rather than derive one
from the merged mesh, so the far ground's ~400m extent does not coarsen
the shadow map. Before/after: `11-sky.png` -> `12-ground.png`.

**c. Street level -- `09a9b23`.** R8's own join-decal logic (4.3),
extended from a building's own footprint edge to the road tile: a raised
curb (real geometry, not a decal -- lit top, shadowed side) plus a paved
path bridging the road-to-house gap, plus one prop (`dumpster-1x1`, an
already-licensed CC0 piece, no new sourcing). **Attempt 1 shipped nothing**
-- found two real defects by rendering: the road pack's own layer texture
on thin kerb boxes produced visible rainbow banding (`BoxGeometry` stretches
a whole sprite-sheet atlas per face regardless of face size); fixed by
reusing GROUND's own photographic-style layer instead, made distinct via
the already-tested join-decal darkening mechanism at full strength. The
second prop (`street-lamp-1x1`) rendered as an unlabelled white shape and
was dropped rather than debugged blind; `dumpster-1x1`'s own first anchor
placed it behind the tower in camera depth (occluded) -- moved in front,
confirmed visible. **Honest read, said plainly per the brief's own §2
instruction:** kerb and path are real but subtle at this camera distance,
a smaller improvement than a/b. Before/after: `12-ground.png` ->
`13-street-level.png`.

**Gate:** the pair of images, judged by Mark -- no numeric gate invented.
Recorded via `process_record_gate` (item `N1`, commit `f9530da`, red/green
evidence quoting all three sub-commits and both caught-before-shipping
regressions). `docs/specs/REBUILD-CHECKLIST.md`'s own `N1` ticked at
`f9530da` with a summary naming each commit and the one honest caveat.
**Not yet shown to Mark as of this run** -- the images exist; the judgment
does not yet.

Verification, all three parts: `test/lookProofScene.test.ts` gained 13
checks across the three commits (36/36 passing at the end), each new
mechanism mutation-verified (mutated, watched red, restored via `cp` from
an explicit backup -- never `git checkout --`, per this project's own
standing lesson -- and diff-confirmed byte-identical). `npx tsc --noEmit`
clean after each commit.

## The full-suite attempt -- a real, pre-existing, unrelated stall found and diagnosed, not chased

Three separate `node test/run.mjs` attempts (no filter, one with a
10-minute timeout to rule out a mere Bash-timeout artifact) all reached
the identical point -- 153 tests in, everything passing except the
already-stale `CLAUDE.md` test-count claim -- then stalled on
`test/cullingRatio.test.ts`. Isolated it: it is not actually a hang, it is
`page.waitForFunction: Timeout 240000ms exceeded` inside the test's own
internal ceiling, rendering `public/city.html`. Cross-checked against
`docs/DECISIONS-FOR-MARK.md` item 4: **already known, first ground-checked
2026-09-09, already confirmed there as pre-existing and unrelated to
whatever the active work touches.** Neither `city.html` nor
`cullingRatio.test.ts`/`regressionGate.test.ts` are in this run's own file
list. Not chased further. `npm run gen:claims` (to fix the stale
test-count claim) was also tried and also failed, for an unrelated,
also-pre-existing reason: `scripts/gen-city-summary.mjs` depends on
`public/city-plan.js`, quarantined by other work in `e3c355b` before this
session started; the generator was never updated to match. Neither fix
attempted -- both out of this run's own scope (a scene/material change),
both named here rather than silently worked around.

**A real environment condition, also named rather than acted on:** system
free memory sat at 1.3-1.8 GiB of 15.7 GiB for most of this run, and
~40 stale `chrome`/`chrome-headless-shell` processes from other, older
sessions (dates 9/10, 9/11, 9/13) were found still running. Not this
lane's to kill -- checked, named, PIDs and start times available if
wanted, per the standing process-killing rule. May be a contributing
factor to the memory pressure but was not the actual cause of the
`cullingRatio` stall (that stall is a real internal timeout, reproduced
identically at a 10-minute ceiling too).

## §3 -- BO7A, checked, found genuinely gated, queued rather than merged

`git fetch origin && git log origin/scoring --oneline` (by name, per the
brief's own correction of last night's ambiguous "on origin") confirms
A1 landed and pushed: `62650f4`, whose own message says "BLD's BO7A is
gated on this landing." `process_next_item` (with CLI's own items skipped)
confirms BO7A is next in plan order.

**But `git merge-base HEAD origin/scoring` shows A1 is not merged into
`codex-lane`.** `data/catalogue.json` here still carries the old 9-field
schema (`3c0dbbf`) -- no `baseValue`, no `adjacency`. Writing BO7A's new
entries now reproduces the exact "written wrong" failure the checklist's
own blocking text exists to prevent, just against a different stale
schema. Merging another lane's branch is a cross-lane action with a real
blast radius (this branch's own validator and everything already built
against the current schema would need reconciling in the same motion) --
queued as **Decision 12** in `docs/DECISIONS-FOR-MARK.md` (commit
`cbf3911`) rather than done unilaterally. `data/catalogue.json` untouched
this run.

## What is left, in plan order

`process_next_item` (CLI's items skipped): `BO7A` (blocked, see above),
then `BO9`/`BO10`/`BO11` -- all explicitly "LATER. NEITHER LANE STARTS
THESE WITHOUT SAYING SO FIRST." Not started this run; large, unscoped
items (the generator, side B, progression) with nothing in this brief
authorising them.

## Commits, in order

`4d670a1` brief, `af29fc0` checklist sync, `5f72578` N1a, `3f0861e` N1b,
`09a9b23` N1c, `f9530da` checklist tick, `cbf3911` Decision 12. All pushed:
`aba191d..cbf3911 codex-lane -> codex-lane`.

## For the next run

- Show Mark `11-sky.png` / `12-ground.png` / `13-street-level.png` against
  `08-cast-shadows.png` and get the real verdict N1's own gate needs.
- BO7A stays blocked until Decision 12 is answered (merge `origin/scoring`,
  or wait for a `main`-mediated sync -- Mark's call).
- The stale `CLAUDE.md` test-count claim and `gen-city-summary.mjs`'s
  broken `public/city-plan.js` dependency are both real, both pre-existing,
  both still open -- neither is BLD's own N1/BO7A scope, but both will keep
  failing `npm run gen:claims` / the count-claim test until someone fixes
  `gen-city-summary.mjs`'s dependency or `city-plan.js` is restored from
  `_TO-DELETE`.
- `test/cullingRatio.test.ts` / `test/regressionGate.test.ts`'s own
  culling-ratio measurement bug (`docs/DECISIONS-FOR-MARK.md` item 4) is
  still open and still blocks a clean `npm test` run end to end.
