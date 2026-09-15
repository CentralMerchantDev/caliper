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
[ ] FIX-3 (BLD) Revert the board-camera fog to 14's settings and retune from there — PLAN.md 3.3
    `25-board-scene-pass.png` was judged by Mark: hazier and more of a dust bowl
    than the `14-board.png` it was meant to improve. The wash removed ground
    texture, the horizon, and the contrast the buildings need.
    The problem it was solving is real — a ground that ends at a visible edge.
    The cure was worse. Start again from 14.
    Gate: the pair, judged by Mark. No numeric gate; inventing one would be a
    check that cannot fail.
[ ] FIX-4 (BLD) Produce evidence the readout actually shows a number — PLAN.md 3.4
    `26-readout-real-numbers.png` shows a cursor marker and no number. If the
    readout is an HTML overlay, `toDataURL()` captured the canvas and not the
    text — which would make the number real and the evidence empty.
    RC5's gate is "the number changes as the cursor moves"; that shot cannot
    demonstrate it either way.
    Same shape as the blank-canvas-reporting-`draw calls: 1` defect this lane
    caught itself.
    Gate: evidence that SHOWS the number changing across cells of different
    value. If the original shot was incomplete, say so plainly.
[x] FIX-5 (CLI) Purge the old-world mutations and the dead-exports allowlist — PLAN.md 3.5
    Re-grounded: the brief's "~140 of 185" / "~162-entry" figures were stale
    (prior sessions had already cleared most of the residue). Real counts:
    55 of 193 mutations.json entries and 61 of 2,763 allowlist entries
    targeted deleted/renamed exports. Both purged; every remaining mutation
    entry names a file that exists. 2 tests cleared (11 failing -> 9):
    the stale-allowlist test, and expected-red's B2.5 guardrail (its own
    target, test/boardGenerator.test.ts, was itself quarantined).
    Roughly 140 of 185 entries in `test/mutations.json` target `city-plan.js`,
    `layout.js`, `board-generator.js`, `board-render.js` and siblings — deleted.
    They can only ever report INCONCLUSIVE.
    `deadExports.allowlist.json`'s ~162-entry drift is the same residue.
    `mutationEvidence.test.ts` is red BECAUSE the manifest is stale, and
    `mutate.mjs` will not run while the suite is red — a gate holding itself
    shut. Expect the sweep to open it.
    Gate: every remaining entry names a file that exists. State how many were
    removed and how many of the seven failures cleared as a result.
[x] FIX-6 (CLI) One recorder, two runners — PLAN.md 3.6
    Mark's ruling: both tools work properly, or do not keep both.
    Extract the results writer into a shared module both `mutate.mjs` and
    `_mutcheck.mjs` call, with a field recording the BASELINE SCOPE each result
    was obtained under — full-suite or scoped. One writer, so the format cannot
    drift; both real, so neither is a crutch.
    Same move the process server made sharing `plan.ts`'s append-only writer.
    Gate: a `_mutcheck.mjs` run produces a recorded, citable result, and
    `mutationEvidence.test.ts` states which scope it accepts for a published
    claim rather than leaving that in someone's head.
    Done: `scripts/mutate-results.mjs` (loadResults/saveResults/recordResult,
    upsert by id) shared by both tools; both stamp `baselineScope`
    ("full-suite" / "scoped:<testFile>"). Real `_mutcheck.mjs` run recorded
    2 CAUGHT rows into test/.mutate-results.json — confirmed on disk, not
    just console output. `mutationEvidence.test.ts` states explicitly (both
    scopes accepted for CAUGHT; no third, undocumented scope shape ever).
    3 failures cleared this item (9 -> 8): the summary-staleness test now
    passes on a freshly regenerated `mutationSummary.generated.json`.
    Still red, disclosed rather than silently left: "every mutation has a
    CAUGHT result" — 50 of 138 manifest ids have never been run under any
    scope; running them all needs the whole suite green first (mutate.mjs
    refuses otherwise) and is SHIP-3's job, not this one's.

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

[x] CAT-1 (CLI) A grid-aware terrain mesh contract for BLD — PLAN.md 1
    ONE small CLI item inside a BLD section, because it is the seam: publish
    what BLD reads to displace a mesh — the field's resolution, extent and units
    — as a documented contract rather than a shape BLD infers from the data.
    Gate: BLD can build against it without reading CLI's generator internals.
    Done: docs/specs/CAT-1-TERRAIN-MESH-CONTRACT.md. heightAt/isWater/slopeAt
    are a pure function of (seed, worldX, worldZ) -- sea level 0, y-up metres,
    the 4 m module BLD's own board-renderer.js already uses -- so BLD samples
    at whatever density its own mesh needs, decoupled from the gameplay grid.
    Backed by public/terrain-field.js (TER-1/2/3, committed alongside).
[ ] CAT-2 (BLD) Bind the remaining 38 entries, and correct street-cross — PLAN.md 5.1
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
[ ] CAT-3 (BLD) Variety — design, shape, size and height, within the plot limits — PLAN.md 5.2
    Mark: a city builder is about diversity, as in real buildings in a real city.
    Two towers of the same footprint should not be the same tower.
    §R2's variation numbers are FAR lower than instinct — read them before
    deciding how many. §C1.5 gives the real starting counts.
    Gate: the contact sheet shows genuine variety within each footprint class,
    and the draw count has not risen.
[ ] CAT-4 (BLD) The contact sheet, on a grid — PLAN.md 5.3
    Every bound piece, same ground, same camera, labelled, ON A GRID. The current
    sheet is a diagonal strip in a field of black.
    It has already earned its keep: it is what made the scale problem visible.
    Gate: the sheet, judged by Mark. Say which pieces look wrong beside the
    others — a wall of thumbnails presented as a pass is the failure.

---

## THE REAL RANGE, ON SCREEN — BLD OWNS THIS. Added 2026-09-16.

FIX-1 made the heights real — 376.32 m against 4.57 m, an 82:1 range, measured
and rendered. **But `35-board-fix1-real-height.png` puts the camera inside the
tower's footprint.** You cannot see the building, you cannot see the range, and
FIX-1's own gate — *"a shot showing the real range"* — is not met by it. The
measurement is met; the picture is not.

A camera framed for eight-storey buildings cannot frame 82:1. That is this
section.

[ ] CAM-1 (BLD) A camera that frames the real range — PLAN.md 3.1
    The board camera, the contact sheet's camera, and the overview's all assumed
    a compressed height range. All three now under-frame.
    Gate: one shot in which `mega-tower-a` and `small-house-a` are BOTH fully in
    frame and their relative height reads correctly, with both measured heights
    stated. RED is any framing where the tallest piece leaves the frame or the
    shortest becomes indistinguishable from the ground.
    CAT-4's contact sheet was judged on the OLD heights — re-render it and say
    whether the grid still reads now that the range is real.
[ ] RDO-1 (BLD) The readout on screen, not in a console line — PLAN.md 7, §S4
    FIX-4 proved the number is real and captured it durably. **It is not
    visible.** The readout today is a coloured octahedron marker plus a
    `console.log` — confirmed by reading `look-proof-scene.html`. §S4 asks for
    something else entirely: *"the ghost shows the target cell's current value
    and the value the piece would have there. That number, changing as the
    cursor moves, IS the reason one cell beats another."*
    A console line is not something a player sees, so the phase gate's "sees why
    that cell was worth choosing" is NOT met, and RC5 was ticked on a marker.
    That is the hub's miss, not the lane's — the item was written loosely and
    then the missing number was blamed on a capture bug.
    Draw both numbers near the cursor. **Call CLI's `valueAt` and
    `valueIfPlaced`. Do not reimplement scoring. Do not edit
    `public/scoring.js`.**
    Gate: a shot showing both numbers legibly on screen, and a second shot at a
    genuinely different cell showing them changed. Not a console transcript —
    that is what FIX-4 already proved. RED is a number that does not move when
    the board has not changed, or one that does not change when it has.
[ ] GRD-1 (BLD) The ground at the board camera — PLAN.md 3.3
    Mark has now judged the ground a dust bowl in THREE separate shots — `14`,
    `25` and `35`. FIX-3 retuned the fog and the paving radius and the board
    camera still reads as sand.
    RB5 already measured the cause once: the "grass" texture is dirt-coloured
    `(172,148,121)`. Paving was added near buildings; the rest of the board is
    still bare earth to the horizon.
    A city sits on made ground — paving, kerb lines, surface variation — not on
    desert with paving patches.
    Gate: the pair, judged by Mark. No numeric gate; inventing one would be a
    check that cannot fail. Say plainly whether it still reads as a dust bowl.

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
