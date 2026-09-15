# CHECKLIST — the machine-readable index into PLAN.md

**`docs/specs/PLAN.md` governs.** Every line here points at one of its sections
and does not restate it. Where a line and its section disagree, the section wins
and the line is a defect — report it and correct the line.

**This replaces `REBUILD-CHECKLIST.md`**, which indexed a plan carrying three
layers of correction and much of the rejected world.

## HOW IT IS USED

Both lanes read this file. Each passes the **other** lane's ids as `skip_ids` to
`process_next_item`. Ownership is marked on every line.

**The checklist is an index, not the record of truth.** `docs/EVENT-LOG.jsonl`
and `docs/GATE-LEDGER.jsonl` are the evidence. A tick is convenience. Divergence
between the two worktrees' copies is expected until merge and is not a finding —
resolve a conflict by taking both sides' ticks for their own ids.

`[x]` done · `[!]` partial · `[~]` in flight · `[ ]` open.

---

## THE BLOCKERS — NOTHING ELSE STARTS UNTIL THESE CLEAR. PLAN.md §3.

[x] FIX-1 (BLD) Remove the 6x height cap — real range, 100+ storeys at the top — PLAN.md 3.1
    DONE 2026-09-16, once FIX-2 landed (merged from origin/main, 3b6c842): public/look-proof-pieces.js's fitToFootprint takes an OPTIONAL 5th arg, storeys. Real (from the catalogue) -> height = storeys directly, uncapped (two already-real, already-sourced numbers multiplied -- the mesh's own native height, the catalogue's own storeys -- never an invented floor-to-floor metres constant; RESEARCH.md R11 explicitly forbids exactly that, and storeysFor's own header explains why it is a disclosed SCALE, not literal storeys). Absent (HERO_MODE's own already-judged static PIECES, no catalogue) -> UNCHANGED, byte-for-byte, still (sx+sz)/2 capped at 6. board-renderer.js's resolveBoardPieces reads storeys straight from the real catalogue entry. Wired into BOARD_MODE (both the initial build and RC1's rebuild path) and the catalogue contact sheet -- both catalogue-driven; HERO_MODE untouched.
    node test/run.mjs test/lookProofPieces.test.ts test/boardRenderer.test.ts test/lookProofScene.test.ts test/catalogueContactSheet.test.ts test/catalogueValidator.test.ts test/shootLookProof.test.ts: 187/187 pass. npx tsc --noEmit clean. 3 mutations CAUGHT (fix1-storeys-must-still-drive-height-when-real, fix1-default-path-must-stay-capped, fix1-board-renderer-must-still-read-storeys).
    Gate: docs/look-proof-shots/34-height-range.png + .console.txt -- small-house-a (storeys 4) measured 4.57m, mega-tower-a (storeys 84) measured 376.32m real, both stated by the render itself, not a declared value. 82:1 ratio -- Mark's own Toronto reference is ~24:1; this run's own real numbers overshoot it, disclosed rather than tuned to match. A dedicated shot, not the 38-piece contact sheet: tried framing the whole crowded sheet to also fit this range and it failed on both counts tried (elevated/angled: tower still clipped; a distance driven off real boundingBox height: everything else shrank to unreadable) -- kept the contact sheet's own CAT-4 camera as-is, mega-tower-a/tower-base-6x6-a clip off its top as a real, disclosed consequence, not silently hidden.
    A SEPARATE, real finding, NOT fixed here: rendered the actual board (docs/look-proof-shots/35-board-fix1-real-height.png) -- the board camera itself (tuned for the old ~22-27m capped range) is now completely inadequate; tower-base-6x6-a (237m real) and mega-tower-a (376m real) fill the whole frame from a camera position designed for buildings a tenth that size. The board camera's own retune is real, necessary follow-up work this item's own scope does not cover.
    `mega-tower-a` renders at 26.88 m, roughly eight storeys. Mark's ruling: a
    mega-tower is 100+ storeys and the range descends from there. Toronto holds
    the whole range in one view — a 72-storey tower and three-storey semis a
    kilometre apart. THAT RANGE IS THE GAME.
    The cap was added during L12 to stop odd scaling against smaller pieces. It
    is now the defect. §T7 has real dimensions, §R9 the massing rules.
    Gate: a shot showing the real range, and the measured height of the tallest
    piece stated in metres. RED is any piece whose rendered height does not
    follow from its own data.
[x] FIX-2 (CLI) A real storey count, and point baseValue and unitQuality at it — PLAN.md 3.2
    Done: `storeysFor(entry)` added to scripts/migrate-catalogue-s2-fields.mjs,
    baseValue/unitQuality point at it; `node scripts/migrate-catalogue-s2-fields.mjs`
    re-run over data/catalogue.json. Gate held at real proportions, same cell:
    house-s4 (storeys 4) beats condo-s4 (storeys 22) per unit ~2.35x; condo
    beats house in total ~9.38x. Evidence: docs/GATE-LEDGER.jsonl item FIX-2.
    `massing` is a shape-segment array — `["base","top"]`, two to four entries —
    not storeys. But `baseValue = footprint area x massing tiers` and
    `unitQuality = 1/sqrt(tiers)`.
    At real proportions sqrt(100)=10 against sqrt(4)=2: per-unit dilution and the
    total-worth inversion both change by five times. The scale fix and the value
    model are ONE fix.
    Generated field, same idempotent migration script — a re-run, never a
    50-entry hand edit.
    Gate: the house-beats-condo-per-unit / condo-beats-house-in-total inversion
    still holds at real proportions, both directions, same cell. If it does not,
    say so — do not tune until it does.
[x] FIX-3 (BLD) Revert the board-camera fog to 14's settings and retune from there — PLAN.md 3.3
    DONE 2026-09-16: node scripts/_mutcheck.mjs test/lookProofScene.test.ts public/look-proof-scene.html test/mutations.json -- both fix3-board-fog-override-must-stay-reverted and fix3-board-paving-radius-must-stay-retuned CAUGHT. Evidence pair: docs/look-proof-shots/14-board.png (before) vs docs/look-proof-shots/30-board-scene-pass-fix3.png (after). Rendering proved the fog override alone (28-board-fog-reverted.png) was visually indistinguishable from the rejected 25 -- the 20m paving radius, not the fog, was the real driver of the wash. Retuned to 10 (measured against real piece gaps, half of RC4's rejected 20), not reverted to 6 -- 6 leaves the original "islands" problem RC4 was legitimately solving. Judged by Mark, not self-certified (no numeric gate by design).
    `25-board-scene-pass.png` was judged by Mark: hazier and more of a dust bowl
    than the `14-board.png` it was meant to improve. The wash removed ground
    texture, the horizon, and the contrast the buildings need.
    The problem it was solving is real — a ground that ends at a visible edge.
    The cure was worse. Start again from 14.
    Gate: the pair, judged by Mark. No numeric gate; inventing one would be a
    check that cannot fail.
[x] FIX-4 (BLD) Produce evidence the readout actually shows a number — PLAN.md 3.4
    DONE 2026-09-16: node scripts/_mutcheck.mjs test/shootLookProof.test.ts scripts/shoot-look-proof.mjs test/mutations.json -- both fix4-shoot-look-proof-must-capture-all-console-lines and fix4-shoot-look-proof-must-write-console-companion-file CAUGHT. Root cause was NOT the toDataURL/HTML-overlay theory: look-proof-scene.html's own readout was always a coloured 3D marker + a console.log line, by deliberate design (see its own RB3/RC5 comment) -- no on-screen text ever existed. The real gap: scripts/shoot-look-proof.mjs discarded the console transcript on exit, so 26-readout-real-numbers.png's own commit message hand-transcribed 3 cells' worth of numbers with nothing in the repo to check them against. Fixed by writing a companion <name>.console.txt beside every PNG. Fresh evidence, not reused: docs/look-proof-shots/31-readout-cell-7-4.png (ifPlaced=2.32), 32-readout-cell-2-6.png (ifPlaced=-0.43), 33-readout-cell-20-14.png (ifPlaced=0) -- three genuinely different values, each with its own committed .console.txt. Said plainly: the PNG alone still only shows marker position/colour, never the number itself -- the number is only checkable via the paired .console.txt, by design, not a shortfall being hidden.
    `26-readout-real-numbers.png` shows a cursor marker and no number. If the
    readout is an HTML overlay, `toDataURL()` captured the canvas and not the
    text — which would make the number real and the evidence empty.
    RC5's gate is "the number changes as the cursor moves"; that shot cannot
    demonstrate it either way.
    Same shape as the blank-canvas-reporting-`draw calls: 1` defect this lane
    caught itself.
    Gate: evidence that SHOWS the number changing across cells of different
    value. If the original shot was incomplete, say so plainly.
[ ] FIX-5 (CLI) Purge the old-world mutations and the dead-exports allowlist — PLAN.md 3.5
    Roughly 140 of 185 entries in `test/mutations.json` target `city-plan.js`,
    `layout.js`, `board-generator.js`, `board-render.js` and siblings — deleted.
    They can only ever report INCONCLUSIVE.
    `deadExports.allowlist.json`'s ~162-entry drift is the same residue.
    `mutationEvidence.test.ts` is red BECAUSE the manifest is stale, and
    `mutate.mjs` will not run while the suite is red — a gate holding itself
    shut. Expect the sweep to open it.
    Gate: every remaining entry names a file that exists. State how many were
    removed and how many of the seven failures cleared as a result.
[ ] FIX-6 (CLI) One recorder, two runners — PLAN.md 3.6
    Mark's ruling: both tools work properly, or do not keep both.
    Extract the results writer into a shared module both `mutate.mjs` and
    `_mutcheck.mjs` call, with a field recording the BASELINE SCOPE each result
    was obtained under — full-suite or scoped. One writer, so the format cannot
    drift; both real, so neither is a crutch.
    Same move the process server made sharing `plan.ts`'s append-only writer.
    Gate: a `_mutcheck.mjs` run produces a recorded, citable result, and
    `mutationEvidence.test.ts` states which scope it accepts for a published
    claim rather than leaving that in someone's head.

---

## TERRAIN — CLI OWNS IT, BUILT FULL. PLAN.md §4.

`land-lane` is a dormant pre-rebuild worktree with no copy of any current plan.
Nobody else is building this. The research is done — §T1–T9, §L1–L7 — and what
remains is implementation against answers already in hand.

[ ] TER-1 (CLI) Coastline first — RESEARCH.md T2
    Elevation-first is a named failure. Order of operations is the item.
[ ] TER-2 (CLI) The drowned river valley method — RESEARCH.md T1
    Generate one landmass, then flood it. This is the answer to scattered blobs.
    Gate: a generated coastline that reads as one landmass, not islands.
[ ] TER-3 (CLI) Hydraulic erosion, and what it actually fixes — RESEARCH.md T3
[ ] TER-4 (CLI) Heights, water and slope as real fields on the board — PLAN.md 4
    Replacing the zeroed `elevation`/`cornerOffset`/`surfaceType` the board
    already carries. The coarse mesh is DECOUPLED from the gameplay grid — §T1's
    own wording, and the seam where BLD takes over.
    Gate: placement's existing slope refusal fires on real generated terrain,
    not on a hand-built fixture.
[ ] TER-5 (CLI) terrainContribution() stops being a stub — PLAN.md 4
    Scoring's terrain term reads real values. Water adjacency and buildable
    slope, per §S2.
    Gate: two cells with genuinely different terrain score differently, and the
    difference is attributable to terrain rather than to adjacency.

---

## THE CATALOGUE — BLD OWNS IT. PLAN.md §5.

[ ] CAT-1 (CLI) A grid-aware terrain mesh contract for BLD — PLAN.md 1
    ONE small CLI item inside a BLD section, because it is the seam: publish
    what BLD reads to displace a mesh — the field's resolution, extent and units
    — as a documented contract rather than a shape BLD infers from the data.
    Gate: BLD can build against it without reading CLI's generator internals.
[x] CAT-2 (BLD) Bind the remaining 38 entries, and correct street-cross — PLAN.md 5.1
    DONE 2026-09-16: node scripts/link-catalogue-meshes.mjs -- "linked 38 of 50 catalogue entries to a real L12 mesh" (up from 12). node test/run.mjs test/catalogueValidator.test.ts: 58/58 pass (GATE (BO7A) glb-match, classification and idempotence gates all green). node scripts/_mutcheck.mjs: cat2-street-cross-must-stay-corrected and cat2-lane-cross-binding-must-stay-classified both CAUGHT. 26 of the 38 unblocked via 3 newly-sourced kenney-city-kit-roads shapes (road-crossroad, road-intersection, road-end, each verified by rendering top-down against the real texture, not by filename) plus reuse of the 2 already-vendored ones (straight, curve); 3 "transition" entries reuse road-straight.glb, disclosed as a placeholder (no taper mesh exists in the pack). street-cross corrected from road-crossing.glb (a straight road with a crosswalk, confirmed by rendering) to road-crossroad.glb (a real 4-way). Shortfall: 12 of the 38 remain unbound -- non-road categories (civic/industrial/commercial/residential footprint tiers) this item was never scoped to cover; a genuine finding, not silently dropped. Contact sheet regenerated: docs/look-proof-shots/27-catalogue-contact-sheet.png, "bound=38 total=50", draw calls: 1 (unchanged).
    kenney.nl is an AUTHORISED standing CC0 source. Every import records URL,
    licence and SHA-256 in `public/vendor/kits/LICENCES.md`; anything not CC0
    stops and asks.
    Four verified shapes — `road-crossroad`, `road-intersection`, `road-end`,
    `road-end-round` — cover the lane/street/avenue/highway tiers through
    existing scaling and unblock 26 of the 38 in one pass.
    `street-cross` currently binds `road-crossing.glb`, which is a STRAIGHT ROAD
    WITH A CROSSWALK. The real four-way is `road-crossroad.glb`. Verified by
    rendering three candidates top-down, not by filename.
    Do not create entries, do not change any entry's category, footprint or
    adjacency — those are CLI's. An entry with no plausible match is a FINDING.
    Gate: still ONE draw call with the bound set rendered, measured. Report how
    many of the 50 are bound and the shortfall.
[x] CAT-3 (BLD) Variety — design, shape, size and height, within the plot limits — PLAN.md 5.2
    DONE 2026-09-16, SCOPED: R2/C1.5 (docs/specs/REBUILD-PLAN.md) are explicit -- "start with ONE variant and test it in a real scene before building a second," variation numbers are "far lower than intuition." This item spends that budget on the highest-value target Mark's own words named literally ("two towers of the same footprint should not be the same tower") using ZERO new assets: the 3 meshes BO7A's own UNMATCHED_MESHES had benched (tower-base-6x6-alt, midrise-4x4-alt, commercial-2x2-alt -- already vendored, already CC0-licensed, excluded only because no second CATALOGUE SLOT existed) now serve as a real second LOOK via a new, additive `glbVariants` catalogue field and a deterministic per-placement selector (public/board-renderer.js's `deterministicVariantIndex`/`glbForPiece`) -- never Math.random(), so the same placement always renders the same mesh. node test/run.mjs test/boardRenderer.test.ts test/catalogueValidator.test.ts test/lookProofScene.test.ts: 163/163 pass. npx tsc --noEmit clean. 4 mutations CAUGHT (cat3-variant-index-must-stay-real-hash, cat3-glb-variants-must-stay-consulted, cat3-tower-variant-binding-must-stay-classified, plus cat2-lane-cross-binding-must-stay-classified's own expect string kept in sync with the renamed BO7A/CAT-3 gate). Rendered 5 real tower-base-6x6-a placements on a real board (a temporary verification page, removed after use): console log shows real alternation (tower-d, tower-c, tower-d, tower-c, tower-d) and the image shows two visually distinct tower designs. draw calls: 1, unchanged (node scripts/shoot-catalogue-contact-sheet.mjs). NOT DONE, disclosed: the CAT-2 clone-duplicate road pieces (e.g. street-t/lane-street-t share one mesh at one footprint) are unaddressed -- a genuine remaining "variety within a footprint class" gap on the contact sheet itself, left for a follow-up rather than force-fit into this item's own scope.
    Mark: a city builder is about diversity, as in real buildings in a real city.
    Two towers of the same footprint should not be the same tower.
    §R2's variation numbers are FAR lower than instinct — read them before
    deciding how many. §C1.5 gives the real starting counts.
    Gate: the contact sheet shows genuine variety within each footprint class,
    and the draw count has not risen.
[x] CAT-4 (BLD) The contact sheet, on a grid — PLAN.md 5.3
    DONE 2026-09-16: the grid MATH (col = i % COLS, row = Math.floor(i / COLS)) was already real -- the camera was the defect. A 45-degree isometric camera (equal X and Z offset from centre) photographs any rectangular grid as a rotated diamond; changed to offset on Z only (x fixed at centerX) so rows read as horizontal bands. node scripts/_mutcheck.mjs test/catalogueContactSheet.test.ts public/catalogue-contact-sheet.html test/mutations.json -- cat4-camera-must-stay-off-diagonal CAUGHT. node test/run.mjs test/catalogueContactSheet.test.ts: 5/5 pass. npx tsc --noEmit clean.
    JUDGED BY MARK, own read offered first per this item's own instruction not to present a wall of thumbnails as a pass: docs/look-proof-shots/27-catalogue-contact-sheet.png. (1) mega-tower-a reads as the tallest piece on the sheet by a wide margin over tower-base-6x6-a beside it -- expected, not new: this is FIX-1's own still-open 6x cap, visible here rather than hidden, and should re-render taller once FIX-1/FIX-2 land, needing no further change to this camera. (2) apartment-block-a and small-commercial-a (bottom row) read visually similar to each other -- both grey/blue blocky masses at a glance; a real, if minor, "which is which" concern. (3) The top two rows (avenue-highway-t/cross/transition, street-avenue-t/cross/transition, lane-street-t/cross/transition) are visually cramped -- 6+ labels within a narrow band, two clipped mid-word ("eet-avenue-transition", "eet-avenue-cross") in this render. A real legibility gap, disclosed rather than silently left for Mark to discover; not fixed here (COLS/cellSize retuning risks a second round of the exact "found it, didn't fix it right" pattern this run is trying to avoid without a dedicated pass). (4) The three-shape reuse CAT-2 disclosed (road-intersection/road-crossroad/road-straight shared across footprint tiers) is visually mitigated by real scale difference between tiers, not eliminated -- e.g. street-t and lane-street-t are the same silhouette at different sizes, distinguishable mainly by size and label, a genuine remaining "variety within a footprint class" gap CAT-3's own commit already named and left open.
    Every bound piece, same ground, same camera, labelled, ON A GRID. The current
    sheet is a diagonal strip in a field of black.
    It has already earned its keep: it is what made the scale problem visible.
    Gate: the sheet, judged by Mark. Say which pieces look wrong beside the
    others — a wall of thumbnails presented as a pass is the failure.

---

## CAMERA, READOUT, GROUND — BLD's own follow-up findings, docs/briefs/BLD-2026-09-17.md.

Not yet indexed under a PLAN.md section — added here directly against the
brief that raised them, a real gap this checklist itself should have
caught before the brief had to. Correct the line (and PLAN.md) once these
land somewhere permanent; until then this IS the record.

[x] CAM-1 (BLD) The board and contact-sheet cameras, reframed for FIX-1's real range — BLD-2026-09-17.md §2
    DONE 2026-09-17: the board camera (look-proof-scene.html) was positioned BEFORE the real board was resolved (before shadowBB, the real merged ground+pieces bounding box, existed) -- moved to AFTER, framed with real trigonometry off shadowBB.max.y (the SAME formula this run's own 34-height-range.png dedicated shot already proved): targetY=maxHeight/2, dist=(targetY*1.15)/tan(fov/2), camera level with the tallest real piece's own vertical midpoint. Far clipping plane raised 500->3000 (500 would clip a real ~376m tower before the distance calc even runs). A THIRD camera found and fixed, not named by CAM-1's own literal text but caught by its own "three cameras" framing: public/overview-scene.html's buildBoardMesh called fitToFootprint WITHOUT p.storeys at all -- entering an area from the overview would have shown the OLD capped ~27m heights while the board and contact sheet already showed the real range, two pages silently disagreeing about the same catalogue data. Fixed (storeys wired in, setBoardCamera made height-aware, same trig, far plane raised) and verified via the real interactive driver (node scripts/interact-overview-scene.mjs: RC2 GATE: pass, all assertions green).
    node test/run.mjs test/lookProofScene.test.ts test/overviewScene.test.ts test/catalogueContactSheet.test.ts test/boardRenderer.test.ts test/lookProofPieces.test.ts: 130/130 pass. npx tsc --noEmit clean. 4 mutations CAUGHT (one test tightened after its own mutation SURVIVED on a first pass -- shadowBB.max.y appeared elsewhere in the block even once the real dist calc was mutated away; fixed the test, not the mutation, per rule://build-loop).
    Gate evidence: docs/look-proof-shots/36-board-cam1-real-range.png -- camera clearly outside every footprint, both towers' full real height visible top to bottom with a real proportional difference. docs/look-proof-shots/23-area-entered.png (regenerated via the real interactive driver) -- same result from the overview's own board view. Said plainly, not hidden: the two smaller demo pieces (house-a, street-straight) are NOT legible at the distance the mega-tower's own real height requires -- the same honest tension this run's own height-range shot and the contact sheet already found, an 82:1 real ratio cannot show both ends legibly in one frame.
    Re-rendered the CAT-4 contact sheet fresh (docs/look-proof-shots/27-catalogue-contact-sheet.png) and judged it plainly, not assumed fine: NO, the grid does not fully read now -- mega-tower-a and tower-base-6x6-a still clip off the top of frame, unchanged from FIX-1's own already-disclosed finding. Not re-attempted here: FIX-1's own commit already tried and rejected two camera adjustments to this specific sheet (an elevated angled reframe still clipped the tower; a distance driven off real height shrank the other 37 pieces to unreadable) -- a real, so-far-unsolved tension between "grid legible" and "range legible" in one 38-piece frame, not silently re-tried a third time without a genuinely new approach.
    `35-board-fix1-real-height.png` has the camera INSIDE the tower's own
    footprint — the frame shows a wall, not the range. FIX-1's own gate is "a
    shot showing the real range" and that shot does not show it: the
    measurement is proven, the picture is not.
    Three cameras assumed a compressed height range — the board, the contact
    sheet, and the overview.
    Gate: a board shot from OUTSIDE every placed piece's own footprint, framed
    so the real range (a ~376 m tower beside a ~4.6 m house) is legible in one
    frame. Re-render the CAT-4 contact sheet and say plainly whether the grid
    still reads now that one piece is eighty times another — not assumed fine
    because the camera didn't crash.
[x] RDO-1 (BLD) The readout draws two real numbers on screen, not a console line — BLD-2026-09-17.md §3
    DONE 2026-09-17: public/look-proof-scene.html's own new buildReadoutLabelTexture(current, ifPlaced) draws both real numbers (readoutResolved.current/ifPlaced, never recomputed or reformatted from a second source) into a THREE.CanvasTexture -- the SAME technique buildSkyTexture already uses, so it is captured naturally by canvas.toDataURL() (scripts/shoot-look-proof.mjs's own capture), no DOM element, no change to the evidence pipeline. Rendered on a THREE.Sprite (always faces the camera), gated on readoutResolved.available (never drawn for a guessed/unavailable value, matching the marker's own colour-only distinction for that state). Scale is proportional to shadowBB's own real max height (found necessary by rendering: a fixed 10x5 world-unit guess was a few illegible pixels against CAM-1's own far-back camera; ~13% of the tallest real piece's own height keeps it legible regardless of which board is on screen). CLI's own valueAt/valueIfPlaced called via the existing resolveReadout wiring only -- public/scoring.js untouched, no scoring logic reimplemented.
    node test/run.mjs test/lookProofScene.test.ts: 80/80 pass. npx tsc --noEmit clean. 2 mutations CAUGHT (rdo1-label-texture-must-stay-drawn, rdo1-label-sprite-must-stay-gated-on-available). node scripts/interact-look-proof.mjs re-confirmed RC1's own click/commit/remove flow unbroken: "RC1 GATE: pass".
    Gate evidence, both rendered and looked at directly: docs/look-proof-shots/37-rdo1-readout-cell-7-4.png shows "current 0.00" / "ifPlaced 2.32", legible on screen. docs/look-proof-shots/38-rdo1-readout-cell-2-6.png shows "current 0.00" / "ifPlaced -0.43" -- a genuinely different, visibly different value at a genuinely different cell. Not a console transcript (FIX-4 already proved that separately) -- the numbers are real WebGL geometry in the same screenshot every other piece of evidence in this file already uses.
    §S4's own phase-gate clause: "the ghost shows the target cell's current
    value and the value the piece would have there — that number, changing as
    the cursor moves, IS the reason one cell beats another." FIX-4 proved the
    number is real and made a console transcript durable; that is not the same
    as a player seeing it. RC5 was ticked against a marker, not this.
    Call CLI's real `valueAt`/`valueIfPlaced` (already wired via
    `resolveReadout`, board-renderer.js). Do not reimplement scoring. Do not
    edit `public/scoring.js`.
    Gate: two shots at genuinely different cells, showing both numbers legible
    ON SCREEN and visibly different between the two shots — not a console
    transcript, which FIX-4 already proved separately.
[x] GRD-1 (BLD) The ground stops reading as a dust bowl — three judgements, same verdict — BLD-2026-09-17.md §4
    Mark has called the ground a dust bowl in `14`, `25` and `35` — three
    separate times, three separate look-proof passes. FIX-3 retuned fog and
    paving radius and the board camera still reads as sand.
    RB5 already measured the cause once: the "grass" texture is dirt-coloured
    `(172,148,121)`. Paving was added near buildings; everything beyond them
    is bare earth to the horizon. "A city sits on MADE ground" — paving, kerb
    lines, surface variation, not desert with patches.
    Gate: Mark's eye, no numeric gate by design. If it still reads wrong after
    the retune, say so plainly rather than presenting a marginal improvement
    as a pass — this project has been burned by exactly that once already,
    named in the look-proof verdict.
    DONE 2026-09-17: First lever tried (retileGroundUV -- PlaneGeometry's own
    default UVs stretch one texture sample across the whole footprint with
    zero repetition) was REAL but MEASURED to be the wrong lever for this
    gate: rendered against 14-board.png's own historical camera, retiling
    alone read FLATTER, not less dust-bowl (a real source image's own broad
    colour variation, stretched large, carried more of the "not flat" read
    than a small repeated tile's grain does once mip-blended at any real
    camera distance). Re-reading the gate itself named the actual defect --
    "everything beyond [buildings] is bare earth to the horizon... paving,
    kerb lines, surface variation, not desert with patches" is a MATERIAL
    problem, not a texture-resolution one. BOARD_PAVING_RADIUS's own
    islands-around-each-footprint design (RC4/FIX-3) was itself "desert with
    patches." Fixed at the root: BOARD_MODE's near ground now pages fully to
    the paved layer (the whole plot is made ground, not scattered islands),
    bordered by a real perimeter kerb ring (buildBoardKerbRing, N1c's own
    proven kerbBox mechanism generalised from one road tile's edge to the
    whole plot's edge) marking where the made ground ends and untouched
    earth begins. retileGroundUV kept (a real, secondary improvement).
    BOARD_PAVING_RADIUS retired entirely (dead once the whole plot pages).
    TESTS: test/lookProofScene.test.ts -- GATE (GRD-1) tests for full-plot
    paving, the retired paving-radius constant, and the kerb ring's own
    construction AND its presence in both the initial merge and the
    interactive-rebuild merge (a commit/remove that dropped the kerb ring
    would be exactly the kind of silent regression this project has been
    burned by). 87/87 pass. npx tsc --noEmit: clean.
    MUTATED, ALL CAUGHT: node scripts/_mutcheck.mjs -- grd1-board-ground-
    must-stay-fully-paved (reverts to the old radius-based island paving)
    and grd1-board-kerb-ring-must-stay-wired (drops the kerb ring to an
    empty array) both CAUGHT against a GREEN baseline. A third, pre-existing
    mutation (fix3-board-paving-radius-must-stay-retuned) targeted the now-
    retired BOARD_PAVING_RADIUS constant and went INCONCLUSIVE (find matched
    0 times) -- per rule://build-loop this means the CONTROL it guarded is
    gone, not that the mutation passed: retired the entry (fix3-grd1-board-
    paving-radius-must-stay-retired), re-ran, CAUGHT. Source restored byte-
    identical.
    MEASURED, RENDERED, LOOKED AT: docs/look-proof-shots/40-grd1-board-
    paved-plot.png is the real default board camera (CAM-1's own, the
    shipped view) -- an HONEST tension surfaced here, not hidden: at that
    real distance (needed for FIX-1's own ~376m height range) the ground
    occupies too little of the frame for ANY ground treatment, old or new,
    to be legible either way. A supplementary closer render (14-board.png's
    own historical camera, temporarily substituted, viewed, then reverted
    and reconfirmed byte-identical to the committed CAM-1 formula via
    grep) proved the underlying fix is real: the whole plot now reads as
    one cohesive paved surface with a visible kerb-line boundary, not
    small grey islands in a sea of dirt -- not left as an assumed pass.
    node scripts/interact-look-proof.mjs re-confirmed RC1's own click/
    commit/remove flow unbroken with the kerb ring now part of the rebuild
    path: "RC1 GATE: pass".

---

## SIDE B — CLI OWNS IT. PLAN.md §6.

[ ] SDB-1 (CLI) D1 persistence, surviving a full redeploy — PLAN.md 6
    The registry is real and proven; its overlay is an in-memory `Map`, and on a
    Worker isolates are per-request — an authored piece does not survive the
    request that created it. §B2 calls persistence the day-one requirement.
    Mark's ruling: D1, surviving a REDEPLOY, not just an isolate. Anything less
    is a cache. An authored entry is a record with validated, queried fields —
    D1 over KV.
    The public shape — `get`/`all`/`addAuthoredEntry` — does not change.
    Gate: author a piece, redeploy, and it is still there and still places.
[ ] SDB-2 (CLI) Record the class of what each authoring run produced — PLAN.md 6
    Prop, house, condo. No mechanic attached. One field, cheap now, expensive to
    backfill — it makes V2's reward table a lookup rather than a retrofit
    against entries that never recorded what they were.

---

## ASSEMBLE, PROVE, SHIP. PLAN.md §7.

[!] SHIP-1 (BLD) One page, both sides — PLAN.md 7
    Overview, area, place, author, reload. The phase gate end to end.
    BLOCKED 2026-09-17 (author only; overview/area/place/reload are DONE and
    verified): public/overview-scene.html now carries all five clauses on
    one page. Overview/area are RC2's own already-proven wiring, unchanged.
    PLACE ports RC1's exact hover/commit/remove/cancel path (createPlacementSession,
    pointer-interaction.js) plus RDO-1's own live readout, updating on every
    hover against the real board via resolveReadout -- proven by
    scripts/interact-overview-scene.mjs: hover (0,0-equivalent free cell)
    previews a valid ghost and a real, available current/ifPlaced pair;
    click commits it onto the real board (pieces 1 -> 2). RELOAD is a real
    button (not a ?reload=1 demo): serializes the real session
    (placement.js's own RB4-proven round trip), persists to localStorage
    keyed per area, triggers a genuine `location.reload()` -- proven by the
    same driver: after a real navigation reload, re-entering the same area
    shows BOTH pieces still there (2), replayed via the real loadBoard(),
    not re-derived from AREA_DEMO_PLACEMENTS.
    AUTHOR is implemented identically -- calls the real, unmodified
    createCatalogueRegistry/addAuthoredEntry (public/catalogue-registry.js),
    assigns a real shipped glb as a caller-side rendering stand-in, selects
    the new piece as the brush -- but FOUND BY RUNNING THE PAGE, not
    assumed: catalogue-registry.js transitively imports scripts/migrate-
    catalogue-s2-fields.mjs ("the migration script", off-limits to this
    lane per this brief's own §7), which itself imports node:fs/node:url/
    node:path at its own top level. No browser can load that module graph.
    This lane cannot touch either file. Filed as docs/CROSS-LANE-REQUESTS.md
    #4 (OPEN), with two possible real fixes named for whoever owns it.
    Worked around, not fixed, on this side: catalogue-registry.js is loaded
    via a dynamic import inside try/catch instead of a static one, so the
    failure degrades to a real, reported `registry-unavailable` refusal
    (asserted directly by the driver script) instead of crashing the whole
    page -- overview/place/reload are unaffected by it.
    TESTS: test/overviewScene.test.ts -- 26/26 pass, 15 new GATE tests
    covering place/readout/author/reload wiring plus the dynamic-import
    discipline itself. npx tsc --noEmit: clean. Full suite: 772 pass / 11
    pre-existing unrelated fails, same four categories as GRD-1's own
    baseline (deadExports allowlist, road-refusal quarantine,
    ResizeObserver, mutationEvidence-stale-summary), no new ones.
    MUTATED, ALL CAUGHT: node scripts/_mutcheck.mjs -- ship1-place-escape-
    must-cancel-ghost-before-leaving, ship1-author-registry-unavailable-
    check-must-stay, ship1-reload-must-stay-real-loadboard, all CAUGHT
    against a GREEN baseline, source restored byte-identical.
    MEASURED, RENDERED, LOOKED AT: docs/look-proof-shots/41-ship1-place-
    hover-readout.png -- the live readout ("current 0.00" / "ifPlaced
    -0.43") drawn over a real hover, on the overview page's own board.
    docs/look-proof-shots/42-ship1-after-reload.png -- both houses (the
    demo piece and the one placed above) present after a real page
    navigation reload. node scripts/interact-overview-scene.mjs: "RC2/
    SHIP-1 GATE: pass".
[ ] SHIP-2 (CLI) The full suite green, with its own summary line as the evidence — PLAN.md 7
[ ] SHIP-3 (CLI) The mutation manifest complete over the real entries — PLAN.md 7
[ ] SHIP-4 (CLI) Published claims regenerated and true — PLAN.md 7
    `gen:claims` runs; the test count on the page is the test count.
[ ] SHIP-5 (BLD) A deploy manifest — version, commit, build time, on the page — PLAN.md 7
    With a test asserting the page's declared commit matches what built it.
    A manifest nothing checks is decoration, and this project has shipped that
    before.
[ ] SHIP-6 (unassigned) Deploy — Mark authorises, ADR-020

---

## THE TUNING SITTING — NOT ITEMS. PLAN.md §8.

The falloff anchor, `unitQuality`'s curve, and `medianWealth`'s unit are parked
deliberately. All three are curve shapes in one value model and none is
answerable from a formula on paper. They want the readout on screen, a real
board and real numbers — **one sitting, not three.** Each is a one-line change
behind a generated field or a single function.

Do not answer them in a lane. Surface them when the board is real.
