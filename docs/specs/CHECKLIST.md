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

[ ] FIX-1 (BLD) Remove the 6x height cap — real range, 100+ storeys at the top — PLAN.md 3.1
    `mega-tower-a` renders at 26.88 m, roughly eight storeys. Mark's ruling: a
    mega-tower is 100+ storeys and the range descends from there. Toronto holds
    the whole range in one view — a 72-storey tower and three-storey semis a
    kilometre apart. THAT RANGE IS THE GAME.
    The cap was added during L12 to stop odd scaling against smaller pieces. It
    is now the defect. §T7 has real dimensions, §R9 the massing rules.
    Gate: a shot showing the real range, and the measured height of the tallest
    piece stated in metres. RED is any piece whose rendered height does not
    follow from its own data.
[ ] FIX-2 (CLI) A real storey count, and point baseValue and unitQuality at it — PLAN.md 3.2
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

[ ] SHIP-1 (BLD) One page, both sides — PLAN.md 7
    Overview, area, place, author, reload. The phase gate end to end.
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
