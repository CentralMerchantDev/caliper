# REBUILD CHECKLIST — the machine-readable index into REBUILD-PLAN.md

**`docs/specs/REBUILD-PLAN.md` governs. This file does not.** Every line below is
a pointer at a section of that document, not a restatement of it. Where a line
and its section disagree, **the section wins and the line is a defect** — report
it, correct the line, say so in the handover.

**One exception, and it is explicit:** `docs/specs/SCORING-MODEL-2026-09-14.md`
carries Mark's 2026-09-14 decisions and **supersedes §S2's housing sentence**.
Where that document and §S2 disagree, it wins. Folding it into REBUILD-PLAN.md as
a Correction is item A1.

## WHY THIS FILE EXISTS

`process_next_item` parses the `[x] ID text` checklist form. Checked 2026-09-14
against `src/plan.ts`'s own regex: `BOARD-CONVERSION-PLAN.md` parses 25 items,
`COMPLETION-PLAN.md` 35, `AGY-OVERNIGHT-PLAN.md` 23, `RETRIEVAL-PLAN.md` 14,
`BOARD-REBUILD-PLAN.md` 4 — and `REBUILD-PLAN.md`, the only one that governs,
parses **zero**. It is prose throughout.

The server's behaviour is correct — `rule://queue-exhaustion`: an unparseable
plan is a PROBLEM, never an exhausted one. What was missing was an index. This is
that index, and nothing more.

## HOW IT IS USED

Both lanes read this one file. **It is byte-identical in both worktrees**
(`C:\Code\sandbox-spike` and `C:\Code\sandbox-spike-codex`) on purpose: two
checklists for one plan is the copy problem this process exists to kill. If a
merge reports a conflict here, the two sides should be identical — take either
and check.

Ownership is marked in each line, and each lane passes the **other** lane's ids
as `skip_ids` to `process_next_item`. `allRemainingSkipped` then distinguishes
"this lane is blocked" from "the plan is finished" — opposite responses.

**Tick an item only when its gate is green AND the commit exists**, and record the
evidence with `process_record_gate`. A tick is a claim.

## STATUS MARKS

`[x]` done · `[!]` partial · `[~]` in flight · `[ ]` open.

---

## RECONCILIATION

[ ] R0 (CLI) Back-fill gate records for BO1-BO3 from the world-layer commits — §none, this file
    Source them from `docs/specs/STATE-2026-09-14.md` and the commits it names,
    not from memory. If the evidence for one cannot be found, mark that item `[!]`
    rather than inventing a record.

---

## BUILD ORDER — LANDED

[x] BO1 (CLI) The world layer: areas, state, overview, transition, addressing, camera-relative origin — REBUILD-PLAN.md W1-W6
    `public/area.js`, `public/world-layer.js`. Merged to main at 3d8c90a.
[x] BO2 (CLI) The area board: grid, occupancy index, terrain fields, data only — REBUILD-PLAN.md C2.1
    `public/area-board.js`. Typed-array board, footprint via `occupiedRect()`.
[x] BO3 (CLI) Placement, Tier 1, on one area — REBUILD-PLAN.md C2.2 and C2.5
    `public/placement.js`. Ghost, inert-on-invalid commit, cancel, remove.

---

## BUILD ORDER — STEP 4, THE LOOK ON FIVE PIECES. DONE 2026-09-14.

[x] L1 (BLD) Five pieces sourced from the CC0 packs, correct footprints, correct pivot — REBUILD-PLAN.md C1.6 and G1
    99e0a8c. Kenney Modular Buildings + Kenney City Kit Roads.
[x] L2 (BLD) The texture-normalisation script, offline, committed and runnable — REBUILD-PLAN.md C1.6
    99e0a8c. `scripts/normalise-kit-textures.mjs`.
[x] L3 (BLD) One shared material, DataArrayTexture with a per-instance layer index — REBUILD-PLAN.md C1.6 as corrected by C-7
    99e0a8c. ONE draw call, 1270 triangles, both packs' albedos intact.
    Two GPU-only defects CAUGHT first: a missing `glslVersion: THREE.GLSL3` —
    symptom a blank white canvas, zero console errors, draw calls: 1, green on
    every measure available without a GPU while drawing nothing — and a missing
    `preserveDrawingBuffer`.
[x] L4 (BLD) Half Lambert, SQUARED — REBUILD-PLAN.md R1
    1ceab13. `docs/look-proof-shots/02-half-lambert-squared.png`.
[x] L5 (BLD) Warm-to-cool terminator — REBUILD-PLAN.md R1
    fb1fe97. `03-warm-cool-terminator.png`. Subtle in this camera's framing.
[x] L6 (BLD) Rim separation: a Fresnel-masked lobe modulated by N.up — REBUILD-PLAN.md R1
    368f0a9. `04-rim-separation.png`. Also subtle in this framing.
[x] L7 (BLD) Contact darkening where objects meet ground — REBUILD-PLAN.md R1
    82f3d85. `05-contact-darkening.png`.
[x] L8 (BLD) A value split between horizontal and vertical surfaces — REBUILD-PLAN.md R1
    76c7c9d. `06-value-split.png`.
[x] L9 (BLD) One join treated properly, before and after — REBUILD-PLAN.md R8
    638b0e3. `07-join-decal.png`. Escalated tier 1 to tier 2 ground decal.
[x] L10 (BLD) THE VERDICT — REBUILD-PLAN.md R1 and A5
    a06edae. `docs/audits/BLD-2026-09-14-LOOK-PROOF-VERDICT.md`.
    NO, it does not read as a blockout — with the caveat that matters more than
    the verdict: the sourced CC0 meshes did more of that work than the lighting
    mechanisms, and the join did more visible work than all five combined.
    That points the catalogue phase at ASSET SOURCING, not at shading.

---

## THE LOOK AT SCALE — BLD OWNS THIS. NONE OF IT TOUCHES data/catalogue.json.

The verdict says meshes moved the needle more than shading. This is that thread
pulled, and it is deliberately fenced off from the file CLI is working in.

[x] L11 (BLD) Cast shadows, as a sixth mechanism, before and after — REBUILD-PLAN.md R1, gap
    08dc08f. `08-cast-shadows.png`. Self-contained shadow map (an orthographic
    camera sized to the scene's real bounding box, a DepthTexture, PCF sampled
    in the custom shader) rather than three.js's own light/shadow system, which
    assumes a material this ShaderMaterial deliberately does not use.
    Measured, not estimated: 1024x1024x4 bytes = 4.00 MiB (fixed, independent
    of piece count); shadow-pass render ~8.5-9.1ms, main-pass ~5.5-6.8ms
    (performance.now(), SwiftShader). The 4 MiB cost does not scale with piece
    count; the render-time cost scales with triangle count the same way the
    main pass already does — re-measured directly once L12 lands, not assumed.
[x] L12 (BLD) The proof scene at a realistic piece count — REBUILD-PLAN.md C1.5 and R2
    312fb7d. `09-piece-count-20.png`. 20 pieces (Firewatch's 23 trees, Caravan
    SandWitch's 39 total props -- same order, not 200), a THIRD real CC0 pack
    (Kenney City Kit Commercial), 6 of C1.1's 8 footprint classes including
    8x8. Gate held: draw calls: 1 (unchanged from 4 pieces), triangles 1270 ->
    32355. Real bug found by rendering, not inspection: the mega-tower's
    height scaled linearly with its footprint (~87 m) before being capped at
    6x, matching the smaller pieces' own working scale.
[x] I1 (BLD) Octahedral impostors: pre-render one piece, colour, normal and depth — REBUILD-PLAN.md 8 of the revised order
    b7f5e82. `docs/look-proof-shots/impostor-bake/`. 8x8=64-angle hemi-octahedral
    bake (proof scale; production precedent per the Godot-Octahedral-Impostors
    baker README is 16x16=256), colour+normal+depth per angle. Measured: 4.00 MiB
    per atlas uncompressed (12.00 MiB total); real on-disk PNG bytes 1.08 MiB
    total. Academic precursor (INRIA hal-00650120, CiteSeerX 10.1.1.90.6202) was
    bot-blocked at every mirror tried -- named, not silently substituted.
    Depth atlas has real RGBADepthPacking banding under SwiftShader, reported
    honestly, does not block the texture-memory deliverable.
[x] I2 (BLD) The overview's massing bake — REBUILD-PLAN.md W4
    3f8d54e (shared PIECES module) + 7f6633f (the bake).
    `docs/look-proof-shots/10-overview-massing.png`. Real per-piece heights
    measured from each piece's own loaded geometry, not guessed from footprint
    class. 242 triangles vs L12's own 32355 at full detail -- a 99.25%
    reduction, still 1 draw call. Does not implement re-bake-on-leave-area:
    no area system exists on this branch to leave (BO1 is on origin/main /
    origin/world-layer, not merged into codex-lane as of this run).

---

## BUILD ORDER — STEP 5, SCORING. CLI OWNS THIS.

Governed by `docs/specs/SCORING-MODEL-2026-09-14.md`, which supersedes §S2's
housing sentence and resolves DECISIONS-FOR-MARK #12.

[x] S0 (CLI) Catalogue migration: baseValue and adjacency on all 50 entries — REBUILD-PLAN.md S2
    0f04ecf on branch `scoring`, cut from main after world-layer merged at
    3d8c90a. Validator rules 7 and 8, 9 assertions watched red, 34/34 green,
    tsc clean, 3/3 mutations CAUGHT. Fields GENERATED by one idempotent script
    from a single category table, not hand-typed — closing a typo risk the blind
    review flagged, since 222 hand-typed pairs would have been uncatchable by an
    open-ended validator.
[ ] A1 (CLI) Re-run the migration under Mark's model, and fold it into the plan — SCORING-MODEL-2026-09-14.md §4
    THE CLEARANCE ITEM. BLD's BO7A is gated on this landing and being pushed.
    Three changes to `scripts/migrate-catalogue-s2-fields.mjs`'s table:
    commercial, civic and landmark gain real POSITIVE adjacency to residential
    (they were `{}`, which switched the primary driver of value off in the data);
    residential becomes DILUTIVE on residential and positive on commercial;
    industrial and road unchanged.
    RESOLVE THE SUBSTATION PROBLEM FIRST: `substation-a` is category `civic`,
    so a flat civic bonus makes a substation raise nearby housing, which is
    wrong. Either `civic` splits or amenity entries key on `typeId` — §S2
    permits both. Record which you chose and why.
    Then fold SCORING-MODEL-2026-09-14.md into REBUILD-PLAN.md as a Correction.
    NOTE: REBUILD-PLAN.md had an uncommitted diff as of 2026-09-14 that the BLD
    run deliberately did not commit. Check before editing; do not clobber it.
    Gate: validator green on all 50, and a test asserting no civic entry gives
    a positive residential bonus unless it is a real amenity.
[ ] S1 (CLI) value(cell) stateless, Chebyshev R = 3, and baseValue is NOT in it — REBUILD-PLAN.md S1 + SCORING-MODEL §3.1
    `terrainContribution(cell) + sum of contribution(piece, cell)` within R.
    NON-RECURSIVE: computed from WHAT PIECES ARE within R, never from
    neighbours' computed values. SCORING-MODEL §5 decided this — recursion
    either iterates to a fixed point or goes order-dependent, and
    order-dependent fails S1's own gate outright.
    No tick, no clock. If it needs one it is out of scope.
    Gate: the same arrangement scores identically however it was reached — A
    then B, B then A, or loaded from a save. RED is any path dependence.
[ ] S2 (CLI) Falloff is a negative exponential, NOT linear — REBUILD-PLAN.md T9, Clark
    Steep immediately outside the piece, then a long flat tail. A linear
    gradient reads as wrong to a player who could not say why.
    Gate: a test that FAILS on a linear ramp and passes on the exponential.
    Name the curve's parameters and where they came from.
[ ] S3 (CLI) Recompute the dirty set only — REBUILD-PLAN.md S3
    Never the whole board, never per frame.
    Gate: a mutation widening the dirty set to the whole board must be CAUGHT,
    so the test asserts WHICH cells recomputed. An assertion on the result
    alone cannot see this.
[ ] S4 (CLI) valueAt, valueIfPlaced, and the two worths — SCORING-MODEL §3.2 and §3.3
    `valueAt(cell)` is desirability per unit area — pure location, the ghost
    readout. On a VACANT cell it is terrain-only: nothing occupies the cell to
    receive an adjacency bonus. That resolution is DECISIONS #12 point 4 and is
    already written into the validator's header.
    `valueIfPlaced(typeId, cell, rotation)` supplies the candidate's own
    category and is where adjacency applies.
    Then the two worths Mark's model needs:
    `perUnitWorth = value(cell) x unitQuality(type)` and
    `totalWorth = perUnitWorth x units(type)`, where units is the existing
    footprint area x massing tiers.
    This is what reconciles a house beating a condo PER UNIT while a condo
    building beats a house IN TOTAL. It is the point of the whole model.
    Gate: `valueIfPlaced` leaves the board byte-identical — RED is any mutation
    escaping a speculative call — AND a test asserting the house/condo
    inversion holds in both directions on the same cell.
[ ] S5 (CLI) The on-screen readout — REBUILD-PLAN.md S4. Was blocked; a surface now EXISTS.
    BLD built `public/look-proof-scene.html` on codex-lane. That is a real
    render surface, so this is no longer structurally blocked — but it is on
    ANOTHER BRANCH. Do not reach across. Confirm what has merged before
    starting, and if it has not, say so and leave this open.
    The ghost shows the cell's current value and the value the piece would have
    there; that number, changing as the cursor moves, IS the reason one cell
    beats another.
[ ] S6 (CLI) Developed value sits on top, unchanged in mechanism — REBUILD-PLAN.md S5 and V3
    Read S5 and V3 and confirm the mechanism is genuinely unchanged rather than
    assumed so.
[ ] S7 (CLI) Write up the two parked systems as plan sections, do not build them — SCORING-MODEL §5 and §6
    Second-order lift (a neighbourhood's reputation raising itself beyond the
    sum of its parts — needs a fixed-point solve) and the BUILD COST layer
    (land near the centre costing more because there is less of it and because
    what is already built constrains what can go on it).
    Both are Mark's, both are real, neither is built tonight. Losing them is
    the failure mode this item exists to prevent.

---

## BUILD ORDER — STEP 6, TERRAIN. CLI'S OVERFLOW.

[ ] T1 (CLI) Heights, water and slope constraints as fields on the board — REBUILD-PLAN.md T1-T3
    Coarse mesh with heightmap displacement, DECOUPLED from the gameplay grid.
    Coastline FIRST — elevation-first is a named failure.
[ ] T2 (CLI) The drowned river valley method: generate one landmass, then flood it — REBUILD-PLAN.md T1
    The answer to "scattered blobs".
[ ] T3 (CLI) Hydraulic erosion, and what it actually fixes — REBUILD-PLAN.md T3

---

## GATED — BLD, AND ONLY AFTER A1 HAS LANDED AND BEEN PUSHED

[ ] BO7A (BLD) Catalogue entries for L12's new meshes — REBUILD-PLAN.md C1
    BLOCKED until CLI's A1 is on origin. Until then the catalogue's schema and
    its category table are both in flux, and entries written against the old
    table would be written wrong.
    CHECK, do not assume: fetch and confirm A1's commit exists on origin before
    starting. If it does not, this stays blocked — go to I1/I2 instead and say
    in the handover that you checked and it was not there. A lane that waits is
    stalled; a lane that checks and moves on is working.
    Never edit `data/catalogue.json` before that check passes.

---

## BUILD ORDER — LATER. NEITHER LANE STARTS THESE WITHOUT SAYING SO FIRST.

[ ] BO9 (unassigned) The generator, LAST, emitting through the same place() the player calls — REBUILD-PLAN.md 9 of the revised order
[ ] BO10 (unassigned) Side B, pointed at the new board — REBUILD-PLAN.md B1-B3
[ ] BO11 (unassigned) Progression: tasks, goals, NPCs — REBUILD-PLAN.md 11 of the revised order

---

## THE PHASE GATE, UNCHANGED

A person opens the page, sees a world worth looking at, picks an area, places a
building, **sees why that cell was worth choosing**, and it is still there on
reload.
