# BLD lane, MAKE IT PLAYABLE, 2026-09-15 -- handover

Brief: [docs/briefs/BLD-2026-09-15-playable.md](../briefs/BLD-2026-09-15-playable.md).
RC1-RC4 all landed this run, in order, without stopping between them per
the brief's own §6. RC5 checked and correctly not taken -- CLI's S4 has
not landed anywhere this run can reach without a cross-lane merge it is
not authorised to make (see below). RB3 stays honestly `[!]`. Pushed to
`origin/codex-lane` through `09ace9b`.

## §0 -- start

`_TO-DELETE/`'s 56 files confirmed present and intact, matching the
brief's own §0.1 claim (last run's restore was Mark's own confirmed
correct call, nothing to redo). This run's own brief and
`docs/specs/REBUILD-CHECKLIST.md`'s new "MAKE IT PLAYABLE" section
(RC1-RC5) were found already in the working tree -- committed as-received
at `43ec1a4`.

## RC1 -- real pointer interaction

`472cb27`. New module `public/pointer-interaction.js` -- pure, no THREE,
no DOM: `cellFromWorldXZ` (the inverse of board-renderer.js's own
`anchorForCell`), and `handleClick`, the one genuinely new decision rule
this item adds: a real piece at the clicked cell (`board.pieceIdAt`)
wins over any ghost showing there and routes to `session.remove()`;
otherwise routes to `session.commit()` (already inert on an invalid/
absent ghost -- placement.js's own contract, not re-decided here).
`look-proof-scene.html`'s `?board=1&interactive=1` wires real
pointermove/pointerdown/contextmenu/keydown listeners: a
`THREE.Raycaster` against the ground plane converts screen pixel to
world (x,z), then calls straight into the tested module.

A real race, found by running the actual interaction script, not
assumed: two clicks close enough together that the first one's async
rebuild (a new piece's glb fetch) was still in flight when the second
started raced on `mesh.geometry` -- whichever finished last won, even
from an older board snapshot. Fixed with a promise chain
(`queueRebuild`) serializing rebuilds.

`scripts/interact-look-proof.mjs` drives REAL `page.mouse.move`/`click`
DOM events and reads back `window.__board.pieces().length` -- the real
board, not the renderer's claims. `22-interactive.png`.
`test/pointerInteraction.test.ts` (7 tests, mutation-verified: the
routing rule's `pieceIdAt` branch removed, 2 tests went red on
`'commit' !== 'remove'`, reverted via `cp`, diff-confirmed).

## RC2 -- pick an area from the overview and enter it

`3ce6a34`. New `public/overview-scene.html` (I2's own
`overview-massing-scene.html` left untouched). Three real demo areas via
`createWorldLayer()`: downtown/hills (OPEN), harbor (LOCKED). Every
decision runs through the real `worldLayer.enter()`/`leave()` -- no
second `activeAreaId`, no hand-rolled state check (a static test asserts
both absences). "At most one ACTIVE, structurally impossible for two" is
true for free (area.js's own single slot); a refused LOCKED entry is
shown on a real DOM element, not only logged.

A real bug deliberately introduced and caught: mutated `leaveBoardView`
to skip the real `worldLayer.leave()` call, simulating a residency
assumption at the integration level (not the already-tested
world-layer.js unit level) -- `scripts/interact-overview-scene.mjs`'s own
re-entry assertions went genuinely red ("no area is active after
leaving: expected null, got downtown's own record", "loadCount still 1,
not 2"). Reverted via `cp`, diff-confirmed, re-ran green.
`23-overview-refused.png` / `23-area-entered.png`.
`test/overviewScene.test.ts` (9 tests).

## RC3 -- wire the impostor atlas to something real

`bbb35f9`. New `public/impostor-overview-scene.html`. `?impostors=1`
renders 12 distant instances of house-2x3 (the one piece I1's own bake
has real data for) as camera-facing textured quads, each quad's own UV
rect selected by a real nearest-angle search against the REAL
`hemiOctahedralDirection` (imported from `octahedral-mapping.js`, the
SAME function the bake used -- never a second, hand-typed angle table).
No `?impostors=1` renders the same 12 instances at full detail.

A real bug found by looking at the render, not assumed: the first render
was 12 solid black rectangles, zero console errors -- `TextureLoader
.load()` returns before the image decodes; render() ran against a 1x1
placeholder. Fixed with `loadAsync()`. `scripts/measure-impostor-
triangles.mjs` renders both configurations and asserts the comparison
itself: off=4488 triangles, on=24, a 99.5% reduction. Mutated the
impostor branch to silently fall back to full detail -- the script
correctly failed "no measurable triangle reduction -- off=4488,
on=4488", proving the gate catches its own named RED case. Reverted,
diff-confirmed. `24-impostors-off.png` / `24-impostors-on.png` (visually:
correctly-angled billboard cards on an opaque black card -- the atlas was
never baked with alpha, named honestly, not hidden; re-baking with alpha
would touch I1's own already-gated pipeline and is a separate,
later improvement). `test/impostorOverviewScene.test.ts` (7 tests).

## RC4 -- the board camera's own scene pass

`2936b7e`. No numeric gate by the checklist's own design ("judged by
Mark... inventing one would be a check that cannot fail"). Measured, not
guessed: the board camera's own real distances to BOARD_GROUND's near/
far corners are ~134-212m -- already past HERO_MODE's own uFogNear=90,
so fog was already blending; the actual cause of the "dust bowl" read is
that the fog colour and the earth ground colour are both warm-toned, so
fading between them only pales the dust, it doesn't change it.

`BOARD_PAVING_RADIUS = 20` (board-camera-only; HERO_MODE's own
`PAVING_RADIUS = 6` untouched) closes the gaps between
`BOARD_DEMO_PLACEMENTS`' own four pieces into one continuous paved
plaza. `uFogNear`/`uFogFar` overridden to 100/220 via a caller-side
uniform write, only when `BOARD_MODE` -- never an edit to
`look-proof-material.js`'s own construction-time defaults (asserted
absent there by test), so HERO_MODE's already-judged fog is untouched.

`25-board-scene-pass.png` is the fresh after shot, same camera as
`14-board.png` (deliberately untouched -- confirmed via `git status`
before rendering). Honest read: the paved plaza is a large, clearly
visible change -- four small grey islands in a sea of dust became one
continuous paved area connecting all four pieces; the fog retune is the
more subtle of the two, present in the same pair.

RB1-RB4's own already-gated board-camera shots needed refreshing to
match, per RB5's own established precedent -- their own structural
evidence re-confirmed, not just re-rendered blind: `15-board-removed.png`
still `BOARD-REMOVE id=2 ok=true`, resolved 4->3; `19-reload.png` still
byte-identical to `25-board-scene-pass.png` (`cmp`, RB4's own gate still
holds); `20-reload-failure.png` still names `mega-tower-a(out-of-bounds)`,
resolved 4->3; `22-interactive.png` re-generated via RC1's own
interaction script, `RC1 GATE: pass`, unchanged.

## RC5 -- checked, correctly not taken

CLI's S4 (`valueAt`/`valueIfPlaced`) **has landed on `origin/scoring`**
(confirmed directly: `git show origin/scoring:public/scoring.js` --
both functions present, signatures `valueAt(board, catalogue, x, y)` and
`valueIfPlaced(board, catalogue, typeId, x, y, rotation)`, matching
`resolveReadout`'s own DISCLOSED guess exactly, byte for byte). **It has
not landed on `origin/main`**, and codex-lane's own local
`public/scoring.js` still has neither.

**Not merged.** This run's own earlier turn carried an explicit standing
instruction from Mark, in this exact shape: "Do NOT merge origin/scoring
into codex-lane as a workaround -- that would create a second
integration path, and the problem would be that CLI's merge never
landed, which is mine to chase." That instruction is honoured here:
"landed," for the purpose of the brief's own "RC5 is taken if it
unblocks," is read as reachable in codex-lane without an unauthorised
cross-lane merge -- not merely present somewhere in the org's git
history. By that reading, RC5 does not unblock this run. RB3 stays
`[!]`; the live test in `test/boardRenderer.test.ts` ("GATE (RB3): the
REAL public/scoring.js...") is still the correct signal for whoever picks
this up once the merge to `main` (or to `codex-lane`, with real
authorisation) actually happens.

## Commits, in order

`43ec1a4` brief+checklist, `472cb27` RC1, `13c53bb` RC1 tick, `3ce6a34`
RC2, `462269d` RC2 tick (also carries RC1's own gate-ledger entry, missed
in the prior commit and caught via routine `git status`), `bbb35f9` RC3,
`11254f4` RC3 tick, `2936b7e` RC4, `09ace9b` RC4 tick. All pushed:
`8944b1b..09ace9b codex-lane -> codex-lane`.

## Verification, this run overall

`node test/run.mjs test/lookProofScene.test.ts test/boardRenderer.test.ts
test/pointerInteraction.test.ts test/overviewScene.test.ts
test/impostorOverviewScene.test.ts test/worldLayer.test.ts
test/area.test.ts test/areaBoard.test.ts test/placement.test.ts`:
119/119 pass at the final check (individual items' own targeted runs
totalled higher as each suite grew). `npx tsc --noEmit` clean throughout.
Every new mechanism mutation-verified: mutated, watched red, restored via
`cp` from an explicit backup (never `git checkout --`) and diff-confirmed
byte-identical. Did not attempt a full, unfiltered `npm test` run --
`test/cullingRatio.test.ts`'s own pre-existing internal-timeout stall is
documented and not this run's own brief's to chase (§8).

## For the next run

- **Show Mark four pairs now, not one.** `25-board-scene-pass.png` (vs
  `14-board.png`) joins N1's own three pairs (11/12/13) and RB5's own
  pair (13/21), all still waiting on a real verdict.
- **RC5 stays blocked on a cross-lane merge, not on missing work.** S4 is
  real and correct on `origin/scoring`, signature-compatible with what
  RB3 already guessed. The moment it reaches `codex-lane` (via `main`, or
  an explicitly authorised merge), `test/boardRenderer.test.ts`'s own
  live RB3 gate goes red -- that is the signal to finish the readout for
  real and re-verify its actual visual gate before re-ticking it `[x]`.
- **The phase gate sentence is now fully reachable, mechanically.** "A
  person opens the page, sees a world worth looking at, picks an area,
  places a building, sees why that cell was worth choosing, and it is
  still there on reload" -- RC1-RC4 together cover every clause except
  "sees why" (still blocked on RB3/S4, per above). This is still two
  separate pages (`overview-scene.html`, `look-proof-scene.html`) linked
  by nothing but a person typing a URL -- BO9/BO10/BO11 ("later") are
  presumably the work that makes it one continuous page.
- The impostor atlas's own opaque-black background (no alpha captured at
  bake time) is a real, honestly-disclosed visual limitation of RC3's own
  billboards, not a bug in the wiring. Re-baking with alpha would touch
  I1's own already-gated pipeline -- worth a queue entry if the impostor
  look needs to be production-usable rather than a proof.
