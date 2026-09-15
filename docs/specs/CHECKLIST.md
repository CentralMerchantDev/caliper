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

[x] TER-1 (CLI) Coastline first — RESEARCH.md T2
    Elevation-first is a named failure. Order of operations is the item.
    Done: public/terrain-field.js's isWater IS heightAt(x,z) <= 0, never a
    second boundary — structurally cannot disagree with elevation.
[x] TER-2 (CLI) The drowned river valley method — RESEARCH.md T1
    Generate one landmass, then flood it. This is the answer to scattered blobs.
    Gate: a generated coastline that reads as one landmass, not islands.
    Done: one noise-warped dome, a 14-seed dendritic drainage network carved
    by steepest descent, a disclosed SEA_LEVEL_RISE_M flood. Pre-flood
    landmass connectivity verified directly (largest component > 60% of
    dry land at a real sampled resolution).
[x] TER-3 (CLI) Hydraulic erosion, and what it actually fixes — RESEARCH.md T3
    Done: a 2,200-droplet pass over the pre-flood landform. Verified
    directly: sampled points show both real erosion and real deposition
    against the pre-erosion landform.
    Built fresh, per Mark's ruling on decision #22 (public/terrain.js
    retired, not wired) — see docs/DECISIONS-FOR-MARK.md #22.
[x] TER-4 (CLI) Heights, water and slope as real fields on the board — PLAN.md 4
    Replacing the zeroed `elevation`/`cornerOffset`/`surfaceType` the board
    already carries. The coarse mesh is DECOUPLED from the gameplay grid — §T1's
    own wording, and the seam where BLD takes over.
    Gate: placement's existing slope refusal fires on real generated terrain,
    not on a hand-built fixture.
    Done: public/terrain-populate.js's populateTerrain(board, field, {origin})
    samples terrain-field.js at each cell's real world position. SURFACE.WATER
    added; setSurfaceType added (the setter C2.2 anticipated, never built).
    Gate proven: searched the real field for a footprint whose slope exceeds
    tolerance, found one, evaluatePlacement refused it with reason "slope".
[x] TER-5 (CLI) terrainContribution() stops being a stub — PLAN.md 4
    Scoring's terrain term reads real values. Water adjacency and buildable
    slope, per §S2.
    Gate: two cells with genuinely different terrain score differently, and the
    difference is attributable to terrain rather than to adjacency.
    Done: water-adjacency bonus (within 2 cells of real generated water) and
    a slope penalty (max relief to an in-bounds neighbour), both disclosed
    placeholders per §S2's own precedent. Gate proven on a real generated
    coastal board with zero pieces placed (value() reduces to exactly
    terrainContribution()).

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

## THE CAMERA AND THE HAZE — BLD OWNS THIS. Added 2026-09-15.

CAM-1 was judged by Mark and **failed**. `36-board-cam1-real-range.png` fits
376 m into frame and loses everything else: two flat slabs against a gradient,
no texture, no windows, no detail. The gate asked for "both fully in frame with
the relative height reading" — it got that, and it was the wrong gate. **One
camera cannot serve a 4.5 m house and a 376 m tower.**

[ ] CAM-2 (BLD) The eye-level camera — Mark's own design, 2026-09-15
    His words: *"like an eye view — an expanded eye view, not exactly what you
    would see but more — that allows you to look up so you can see the building
    above you, just like in real life. Most of the time you're looking forward
    and you can only see what's in your eye line. As you spin around you can
    look up. And when you pan out, that's where you'll see the height."*
    So: eye level by default, looking forward, free to look up. Height is
    revealed by pulling back and up, NOT by fitting a tower into one frame.
    **A building that leaves the top of frame reads as TALLER than one that
    fits.** Real city photographs almost never contain a whole tower. Cropping
    is the tool; this is why 36 felt wrong.
    This also settles the height-compression question Mark raised and then
    answered himself — no squashing, multiple cameras instead. Compressing would
    break the value model, because `storeys` is what `baseValue` and
    `unitQuality` read: a tower that looks 30 storeys and scores 100 is the
    render-and-rule-disagreeing defect, by design.
    Gate: two shots from the SAME scene — eye level with the tower leaving frame,
    and pulled back with the skyline visible. Judged by Mark, with §5.5's five
    lines. RED is a single camera trying to do both jobs.
[ ] CAM-3 (BLD) The haze — the fog's NEAR PLANE, not its density or colour — PLAN.md 3.3
    Mark, on `30-board-scene-pass-fix3.png`: *"the buildings are extremely hazy,
    the details have been lost... the clarity in the image has disappeared
    because of something overlaid... a gauze."*
    **Three retunes have adjusted density and colour and none touched it, which
    is the evidence the lever is elsewhere.** In `30` the mid-rise's window bands
    are milky and the tower's edges are soft, while the GROUND texture at the
    bottom of frame is sharp and grainy — objects over-hazed, ground
    under-blended, the opposite of how distance haze behaves.
    That points at the fog's near plane starting far too close: geometry twenty
    metres away is being blended toward fog colour as if it were two hundred
    metres out. Detail is not blurred, it is **washed** — contrast lost, not
    focus.
    **That is a hypothesis from reading one image, not a measurement.** Verify it
    before changing anything; if the near plane is not the cause, say so and
    report what is.
    Gate: the pair, judged by Mark, §5.5's five lines. The question is clarity on
    the buildings, not whether the ground looks like a city — that is GRD-1,
    already landed and separately judged.
[ ] CAM-4 (BLD) The contact sheet clips its two tallest pieces — PLAN.md 5.3
    Pre-existing, confirmed still present after CAM-1, named in BLD's own
    handover rather than left for Mark to find. Now that heights are real it will
    only get worse.

---

## THE RULE-CONSULTATION AUDIT — PLAN.md §6B. Added 2026-09-15.

**The project's central claim is that it checks its own work, and that check has
a hole.** Nothing verifies a lane CONSULTED the rules — only that its output was
right. The lanes had the process server connected for days without calling it and
nobody knew until Mark asked and the source was read by hand.

[ ] AUD-1 (MCP) Record rule consultation, and audit against it — PLAN.md 6B.1
    **Repository: `C:\Code\process-mcp`, not this one.** Needs its own terminal.
    `process_at` and `process_get_rule` already know which moment was asked about
    and which rules were returned. They discard it. Record it the way gates are
    recorded.
    Then report, per run: which moments were consulted, which were not, and any
    item ticked without its rules ever being read. Cross-check ticked /
    gate-recorded / rules-consulted so a tick with two of three is visible.
    Composes `process_at`, `process_record_gate`, `process_reconcile_plan` and
    the event log. NOT a new system — `rule://reference-not-copy`.
    Gate: a run that skips a moment is REPORTED as having skipped it. Prove it by
    doing a run that deliberately skips one, not by asserting the report works.
[ ] AUD-2 (BLD) Side B's grounding is recorded and shown — PLAN.md 6B.2 and 6.3
    The loop grounds itself in the game's rules before planning. That grounding
    is recorded and VISIBLE — the same discipline pointed at a player, and the
    same thing as 6.3's visible-process requirement seen from the other end.

---

## SIDE B — PLAN.md §6. Rewritten 2026-09-15: two ways in, public, capped.

[x] SDB-3 (CLI) Extract the three formulas to a browser-safe module — PLAN.md 6.5
    **This unblocks SHIP-1's author clause, which is currently `[!]`.**
    `catalogue-registry.js` transitively imports `scripts/migrate-catalogue-s2-fields.mjs`,
    a Node script that reads the filesystem, so no browser can load it. Move
    `storeysFor`, `baseValueFor` and `unitQualityFor` into a plain module both
    the build script and the browser import.
    One source of truth is the RIGHT design — the defect is the coupling to a
    filesystem-reading file, not the sharing. Do not duplicate the formulas.
    Roughly an hour. Filed by BLD as `docs/CROSS-LANE-REQUESTS.md` #4.
    Gate: the page loads and an authored piece places, in a real browser.
    Done: `public/catalogue-formulas.js` (storeysFor/baseValueFor/unitQualityFor/
    adjacencyFor/migrateEntry/AMENITY_CIVIC_TYPE_IDS, zero imports).
    `scripts/migrate-catalogue-s2-fields.mjs` now imports from it and
    re-exports, so its own existing importers see no shape change.
    `public/catalogue-registry.js` imports the formulas from the new module,
    not the Node script — its import graph no longer reaches `node:fs`.
    Gate proven two ways: `test/catalogueRegistryBrowserSafe.test.ts`
    (esbuild `platform:"browser"` bundle succeeds, zero `node:*` built-ins) and
    `test/catalogueRegistryBrowserRoundtrip.test.ts` (a REAL headless Chromium,
    serving `public/` over http, imports the real modules, authors a piece and
    places it — the literal gate). Both mutation-proven: reverting the import
    to the old Node-script coupling breaks the browser bundle AND makes the
    real Chromium page 404 on `scripts/migrate-catalogue-s2-fields.mjs` and
    never set its result — reverted after confirming CAUGHT.
[ ] SDB-4 (BLD) The guided form — PLAN.md 6.1
    Pick a slot; it says what fits — footprint, category, what the rules allow.
    You fill what it cannot infer. It produces a valid catalogue entry through
    the EXISTING registry and validator. No agent, no spend, always available.
    **It is also the control**: if form-authored and loop-authored pieces come
    out comparable, the loop is doing real work.
    Gate: a piece authored through the form places and scores identically to a
    shipped one — the same proof the registry already makes, driven by a person.
[ ] SDB-5 (CLI) The loop — Worker, agent, caps, rate limits, fallback — PLAN.md 6.2 and 6.4
    Browser to Cloudflare Worker to agent to the game's own tools. The Worker is
    the boundary that keeps the method private and where the guards live.
    PUBLIC, not gated — Mark's ruling. A recorded session proves only that a
    session can be recorded; the claim is about unanticipated input.
    Three guards, all required:
      - a hard spend cap per account;
      - GRACEFUL DEGRADATION when the budget is gone — the visitor gets the form
        and an honest message, never a broken page;
      - rate limits per session and per IP. A spend cap protects the bill; it
        does NOT stop one script burning the budget before anyone real arrives.
    **No model is trained or built.** Orchestration is the skill on show.
    Gate: the loop runs end to end for a real request; the budget-exhausted path
    is exercised deliberately and lands on the form, not an error.
[ ] SDB-6 (BLD) The process on screen — PLAN.md 6.3
    **The highest-value item in Side B for what this project is for.**
    A reviewer behind a Worker sees a game. What makes them see an engineer is
    watching the loop work: the plan, the questions as they are asked, the
    verification and its result, and an honest report when something could not
    be done.
    They do NOT see rule text, prompts, or tool calls.
    Gate: a person who has never seen this project can watch one authoring run
    and describe what the system did and why they should trust it.

---

## SIDE B — PERSISTENCE. CLI OWNS IT. PLAN.md §6C.

[x] SDB-1 (CLI) D1 persistence, surviving a full redeploy — PLAN.md 6
    The registry is real and proven; its overlay is an in-memory `Map`, and on a
    Worker isolates are per-request — an authored piece does not survive the
    request that created it. §B2 calls persistence the day-one requirement.
    Mark's ruling: D1, surviving a REDEPLOY, not just an isolate. Anything less
    is a cache. An authored entry is a record with validated, queried fields —
    D1 over KV.
    The public shape — `get`/`all`/`addAuthoredEntry` — does not change.
    Gate: author a piece, redeploy, and it is still there and still places.
    Done: `migrations/0001_create_authored_pieces.sql` (one column per field
    addAuthoredEntry already builds — footprint/terrainMask/massing/adjacency
    as JSON text, everything else a real column). `wrangler.jsonc` gains a
    `d1_databases` binding (`database_id` deliberately omitted — automatic
    provisioning on a real deploy; local test runs use Miniflare's own SQLite
    simulation, no cloud resource touched, no auth required). `createCatalogueRegistry(baseCatalogue, { db } = {})`:
    omitting `db` is the exact prior synchronous, in-memory path, byte-for-byte
    (every existing test unchanged); passing a D1 binding makes
    `get`/`all`/`addAuthoredEntry` async and read/write `authored_pieces`
    directly on every call — no cache layer, so nothing to go stale.
    Gate proven literally: `test/catalogueRegistryD1.workers.test.ts`, running
    under `@cloudflare/vitest-pool-workers` (real workerd + Miniflare D1),
    authors a piece on ONE registry instance, then builds a SECOND, wholly
    independent instance against the SAME D1 binding — simulating a fresh
    isolate after a redeploy — and confirms the piece is still there (`.get`,
    `.all`) AND still places on a board built from it. Mutation-proven: skipped
    the `INSERT` in `addAuthoredEntry` and watched 3 of 6 gate tests fail
    (entry absent on the second instance, board refuses to place it, the
    collision-refusal test finds nothing to collide with) — reverted after
    confirming CAUGHT.
    Along the way: `scripts/migrate-catalogue-s2-fields.mjs`'s `repoRoot()`
    walk used to run at module-import time, which crashed on import inside
    workerd (no walkable `CLAUDE.md`). Made lazy (computed only inside `main()`,
    the only place that ever reads it) — see also SDB-3, which removes this
    module from `catalogue-registry.js`'s import graph entirely.
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
