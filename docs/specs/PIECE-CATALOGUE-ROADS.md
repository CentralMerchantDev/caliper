# PIECE CATALOGUE — ROADS

Status, updated 2026-09-11 (overnight, b1-land): **§§1-8 (the footprint/type
catalogue itself) remain a proposal, awaiting Mark's approval** — nothing in
them beyond §9 is built. **§9 (retiring `ROAD_WIDTH`) is DONE** — all six
steps built, tested, mutation-verified and committed; see
`docs/DECISIONS-FOR-MARK.md` #5's own closing note for the commit list and
the real, measured numbers. Originally drafted 2026-09-11 from Mark's spoken
brief, `rule://standard-piece-sizes` ("Not yet decided: the catalogue itself
— how many sizes, and what they are") and a direct read of
`public/roadkit.js` and `public/board-generator.js`.

Roads only. Buildings, props and materials get the same treatment afterwards —
the point of doing roads first is that they block B4, and that the pattern
settled here is then repeated rather than re-argued.

---

## 1. TWO CATALOGUES, NOT ONE

The brief bundles two things that pull in opposite directions, and separating
them is most of the work:

- **Footprints — the set of distinct slot dimensions. Kept SMALL.** A large
  footprint set is exactly what `rule://standard-piece-sizes` exists to prevent:
  *"that'll make it really difficult to lay out the board."*
- **Types — the distinct pieces within a class: lane configurations, surfaces,
  furniture, aesthetics. Kept LARGE**, Mark's 20–30 per class. Once every piece
  snaps, variety is free.

So: roughly seven road footprints carrying thirty-odd road types. Thirty road
types is coherent. Thirty road widths is the chaos the rule forbids.

---

## 2. THE MODULE — 2 METRES

**Every road footprint is an even number of metres. Proposed module: 2 m.**

This is not invented. It is already true of every road class in the repository.
Read directly from `public/roadkit.js`'s `ROAD_STANDARDS`:

| Class | `row` (m) | Module multiple |
|---|---|---|
| `ALLEY` | 6 | 3 |
| `LANE` | 10 | 5 |
| `RAMP` | 14 | 7 |
| `STREET` | 18 | 9 |
| `AVENUE` | 28 | 14 |
| `BOULEVARD` | 44 | 22 |
| `FREEWAY` | 62 | 31 |

All seven are multiples of 2. The board's own grid atom is already 1 m
(`board-generator.js:84`, *"atoms (metres)"*), so a 2 m module is two atoms —
no re-basing of the coordinate system, and origin stability is untouched.

This matches published modular-kit practice, where every piece is an integer
multiple of one snap unit so pieces tile without gaps or overlaps.

**And it identifies the real defect.** `board-generator.js:84` sets
`ROAD_WIDTH = 9` — *"one local-street width for every road, P1 of this
generator."* **Nine is the only odd width anywhere in the system.** It is not
that roadkit is missing a 9 m class; it is that the board has a single width at
all, and that the one it picked cannot tile with anything else. See §6.

---

## 3. THE FOOTPRINT SET

**Proposal: keep the seven that exist. Add none yet.**

They already span alley to freeway, each carries a real, sourced cross-section
(`FREEWAY.kerbRadiusReason` cites the AASHTO / Austroads WB-15 design vehicle),
and each is defined as `strips` of `verge` / `carriageway` / `sidewalk` — which
is `rule://standard-piece-sizes`'s *"a road piece is lanes plus sidewalk in one
piece"*, already built.

Adding widths is cheap later and expensive to reverse once the board is
generated against them. Seven is enough to carry the type list in §4.

---

## 4. THE TYPE CATALOGUE

Mark's spoken list, mapped onto the footprints above. **A type is a variant on a
footprint, never a new width.**

| Type | Footprint | Status |
|---|---|---|
| Laneway | `ALLEY` 6 | built |
| One-lane local, sidewalks both sides | `LANE` 10 | built |
| Regular two-lane, sidewalks both sides | `STREET` 18 | built |
| Four-lane, two each way, sidewalks | `AVENUE` 28 | built |
| Partitioned two-lane (central median) | `BOULEVARD` 44 | built |
| Partitioned one-lane | `LANE` / `STREET` | **missing** |
| Highway, 6 lane | `FREEWAY` 62 | built |
| Highway, 2 / 4 / 8 / 10 lane | needs `lanes` variants | **missing** |
| On-ramp / off-ramp | `RAMP` 14 | built, with interchange sockets |
| Dirt road | any, surface variant | **missing** |
| Tram line | any, `hasTram` flag exists | flag built, geometry **missing** |
| Bridge (arch, cable-stayed) | `AVENUE` / `BOULEVARD` | built |
| Level crossing | `STREET` | built |
| Turning head / cul-de-sac bulb | `STREET` | built |
| Walking path | **not a road** — own class | **missing** |
| Subway | **not a surface piece** — own layer | **missing** |

Variety within a type — surface wear, markings, kerb treatment, street furniture,
lighting, planting — multiplies on top of this and does not change a footprint.
That is where the 20–30 per class comes from, and none of it touches layout.

---

## 5. JUNCTIONS — MIXED-CLASS BY CONSTRUCTION, ALREADY BUILT

**An earlier draft of this document proposed that junctions be same-class only,
with width changes forced into a dedicated transition tile between junctions.
That was wrong and has been withdrawn.** It is recorded here rather than deleted
because the reason it was wrong is the useful part.

Mark's objection, 2026-09-11: a four-lane road necking down to two lanes before
a junction and back to four after *"doesn't make sense"*, the transition tiles
consume grid cells that then cannot be built on, and the thing actually wanted
is *"two lanes in the one, four lanes on the other."*

**`public/roadkit.js`'s `junction()` already does exactly that.** Read directly,
lines 335–366:

- It takes **`arms = [{ class, bearing }]`** — a class **per arm**. The
  `STREET`-on-all-four default is a default, not a constraint.
- The square is sized to the widest arm:
  `totalBoxSize = maxRow + maxKerbRadius * 2`.
- **Each arm keeps its own width and lane count** — each socket carries
  `width: std.row` and `lanes: std.lanes` from *that arm's* standard.
- The piece id is generated from the arm mix
  (`junction-4way-street-street-avenue-lane`), so junction types are enumerated
  **by construction**, not hand-authored. Mark's *"the more junction types you
  have, the better you can lay it out"* costs nothing to satisfy: they already
  all exist.

**And the combinatorial fear that motivated the withdrawn rule was unfounded.**
Junction squares land on the 2 m module automatically, for every arm mix:
`maxKerbRadius * 2` is even whatever the radius, every `row` is even (§2), and
even plus even is even. No enumeration, no constraint, no exception. Checked
against the real values — `FREEWAY` 62 + 15×2 = 92, `BOULEVARD` 44 + 12×2 = 68,
`RAMP` 14 + 12×2 = 38.

So the withdrawn rule would have replaced a working, more capable mechanism with
a weaker one — the project's own Failure pattern E.

**Transitions are not deleted, but they are demoted:** a transition piece is a
legitimate *optional* type for a road genuinely narrowing mid-block, between
junctions. It is never required, and it is never the way a junction handles
mixed arms.

Current state, read from `roadkit.js`:

- `junction(arms)` — mixed-class, per-arm, square sized to the widest arm. Built.
- A second four-arm builder defaulting to `AVENUE` arms. Built.
- Ramp and interchange socket geometry, with a comment recording that a socket
  offset was corrected against `ROAD_STANDARDS` itself rather than an assumed
  grid. Built.
- **No roundabout builder exists.**
- **No signalised-junction variant exists** — junction geometry is built,
  signals are not.
- **No mid-block transition piece exists** — optional, per above, not blocking.

---

## 6. WHAT THIS MEANS FOR DECISION 5

Decision 5 asked: add a 9 m roadkit class, change `ROAD_WIDTH` to 10, or accept
a 1 m mismatch. **All three accept the premise that the board has one road
width. That premise is the defect.**

`rule://standard-piece-sizes` already settles the parts that made the original
question feel expensive:

- *"Widths need not match real-world dimensions"* — so no cross-section has to be
  researched into existence to justify a 9 m class.
- *"Regeneration is accepted. Coverage and density numbers get re-taken when the
  catalogue changes. That cost was accepted explicitly."* — so the argument
  against changing the board's widths, which was the whole basis of the original
  recommendation, does not hold.

**Proposed replacement for decision 5:** retire `ROAD_WIDTH` as a single
constant. The board generator places **typed** road pieces whose widths come from
`ROAD_STANDARDS`, defaulting to `STREET` where the current code assumes one
width. Regenerate, and re-take the coverage and density numbers as the rule
already accepts.

This is a larger change than any of the three original options, and it is the
one that stops the question recurring.

---

## 7. WHAT THIS DOES NOT DECIDE

- **The building catalogue.** Same treatment, separate document, after roads.
- **Which types get built first.** This is the catalogue, not the sequence.
- **The variety count per type.** Mark's 20–30 is a target for the variety layer,
  not a commitment that all seven footprints need thirty variants each.
- **Whether the existing board is regenerated now or at B5.** Timing is Mark's.

---

## 8. OPEN FOR MARK

1. **Is the 2 m module right**, or should it be 1 m (every width, not just even
   ones) — 1 m is more permissive and slightly weaker as a guarantee.
2. **Seven footprints, or does the partitioned one-lane road need its own
   width** rather than sharing `LANE` or `STREET`?
3. **Junction squares are large, and the largest are very large.** A `FREEWAY`
   junction is 92 m square by the formula in §5, against settlement blocks
   measured in tens of metres. Is an at-grade 92 m square acceptable on the
   board, or should freeway-class junctions always be grade-separated
   interchanges instead — which `roadkit.js` already has ramp and socket
   geometry for? This is a real design question, not a gap to fill in.

---

## 9. THE RETIREMENT — REMAINING STEPS

Plan only, drafted 2026-09-11 (b1-land, attended). **Step 1 is done** —
`public/board-generator.js` stamps `roadClass: "STREET"` on every road piece
`placeRoadGraph()` places (commit `f01a324`); `ROAD_WIDTH`/`HALF_ROAD` are
still live and unchanged, so no piece's actual footprint has moved yet.
None of what follows is built. It is scoped narrower than the full type
catalogue in §§3–5: it retires the one constant, using the single class
step 1 already committed to (`STREET`), uniformly. Per-tier or per-type road
variety (§8's own open questions) is later work this plan does not require
answered — see the end of this section for exactly why it doesn't block.

### Known, currently RED: a real regression from Step 1's own commit, found by this plan's blind review, left unfixed on purpose

`test/boardLoad.test.ts`'s "B2.6 gate: the committed `board.generated.json`
matches the seed it claims -- no drift between the artefact and the
generator" is failing RIGHT NOW, on this branch, as a direct and entire
consequence of Step 1's commit (`f01a324`): that commit added `roadClass`
to every piece a fresh `generateBoard()` call produces, but did not
regenerate the COMMITTED `public/board.generated.json`, which still holds
the old, pre-`roadClass` pieces. The gate's own `assert.deepEqual(persisted
.pieces, fresh.pieces, ...)` now fails on every road piece — confirmed
directly this session (`NODE_OPTIONS="--max-old-space-size=8192" node
test/run.mjs test/boardLoad.test.ts`): `loaded board's own copy of
"road-s-downtown-25658" does not match the fresh one`, diffing exactly the
new `roadClass: 'STREET'` field.

**This was missed before commit** — the step's own verification only ran
`test/boardGenerator.test.ts` (the file the new test lives in), not the
full suite, so this gate's own file was never exercised before `f01a324`
landed. It was caught afterward, by the fresh-agent blind review this
session's own instructions required for this plan document, not by this
session's own pre-commit verification — which is itself worth recording
plainly rather than smoothing over, per this project's own standard of
proof.

**Not fixed here.** The fix is `node scripts/gen-board.mjs` (equivalently
`npm run gen:board`), regenerating the committed artefact so it once again
matches the generator — a real build step, and this session's own
instructions are explicit: plan only, build nothing. Running it was
attempted and was correctly refused by this session's own permission
boundary. Left named and red, exactly the discipline this project applies
to every other honest gap (`docs/DECISIONS-FOR-MARK.md`'s own convention
throughout): **whoever executes Step 1's regeneration should run this
command FIRST, before Step 2, independent of and before the rest of this
plan** — it is not part of the ROAD_WIDTH retirement's own scope (no
geometry changes), it is closing a drift Step 1's own metadata rollout
opened and left open.

### Step 2 — geometry reads its own class's width, not the module constant

**What changes:** `public/board-generator.js`.
- Add `import { ROAD_STANDARDS } from "./roadkit.js";` (not currently
  imported here — only the test file and `public/road-network.js` import it
  today; `road-network.js` is checked directly to be a legacy module in the
  old `city-plan.js` pipeline, reachable only from its own tests per
  `test/deadExports.allowlist.json`, unrelated to `board-generator.js`, so
  this is a genuinely new import for this file, not one already indirectly
  present).
- Replace the two module-level constants `ROAD_WIDTH`/`HALF_ROAD` (lines
  84–85) with a small lookup, e.g. `function halfRoadFor(roadClass) {
  return Math.floor((ROAD_STANDARDS[roadClass] || ROAD_STANDARDS.STREET).row
  / 2); }` — the `|| ROAD_STANDARDS.STREET` fallback matches `roadkit.js`'s
  own existing convention, the same one Step 1's own commit already named
  (`public/board-generator.js`'s own comment above `ROAD_CLASS_DEFAULT`,
  lines 86–92: `"STREET" matches roadkit.js's own fallback`), not a new one
  invented for this step.
- Update every one of the three piece-construction sites in
  `placeRoadGraph()` (currently lines 274–301: the junction-node piece, the
  north/south span, the east/west span) to size `foot`/`cell` from the
  piece's own `roadClass` instead of the module constants.
- Update the block-carving loop inside `generateBoard()` (currently lines
  567–568: `iMin: i + HALF_ROAD + 1, iMax: i + rule.blockAtoms - HALF_ROAD`,
  and the matching `jMin`/`jMax` line) the same way — this is a SECOND site
  reading `HALF_ROAD`, not part of `placeRoadGraph()`, and missing it would
  leave block interiors carved against the old 9 m assumption while the
  roads themselves are 18 m, the exact "reached some of the sites, not all"
  failure step 1's own test (`decision-5 step 1`) was written to catch for
  the metadata rollout — this step needs the geometry-level sibling of that
  same check (see Test, below).
- Because every piece's `roadClass` is uniformly `STREET` (step 1's own
  default, unchanged by this step), `ROAD_STANDARDS.STREET.row` (18 m)
  replaces `ROAD_WIDTH` (9 m) everywhere, uniformly. **This doubles every
  road's width.** That is a real, visible, load-bearing consequence of
  decision 5's own resolution text ("defaulting to STREET where the current
  code assumes one width") — named here so it is not discovered as a
  surprise once the coverage gate (below) goes red.

**Test:** a geometry-level sibling of step 1's own metadata test — every
road piece's narrow-axis `foot` dimension equals
`ROAD_STANDARDS[piece.roadClass].row`, checked against the piece's own real
`rotation` (matching `test/boardRender.test.ts`'s own w/d-by-rotation
convention), for every road piece, not a sample — and a second assertion
that a block's own carved interior (`test/boardGenerator.test.ts` can read
this from real placed building pieces' `cell` ranges) never overlaps the
half-width strip around its boundary, catching a site that still reads the
old constant.

**Mutation:** revert one of the four sites above (e.g. the block-carving
`iMin`/`iMax` line) to the literal `HALF_ROAD` while the other three read
`halfRoadFor()` — must turn the new geometry test red, proving the test
checks every site and not just the first one edited.

**Expected, honest, immediate consequence:** `test/boardGenerator.test.ts`'s
existing **"B2 gate: coverage is measured INSIDE each settlement boundary,
20-40%"** gate goes RED the moment this step lands, before Step 3 retunes
anything — built area (`w*d` for every building+road piece) roughly doubles
for the road term while boundary area is unchanged. This is the SAME
red-then-retuned pattern already on record in this file's own header
comment (`CLEAR=2` measured 38.5–46.5%, `CLEAR=3` + a plotAtoms nudge
brought it to 24.0–39.0%) — expected, not a regression, and not to be
worked around by loosening the assertion.

### Step 3 — re-tune block/plot sizing back into the coverage band

**What changes:** `public/board-generator.js`'s `SETTLEMENT_TABLE` (lines
59–82) — `blockAtoms`/`plotAtoms` per tier — and/or `CLEAR` (line 102),
using the same measure-then-tune loop already on record for the `CLEAR`
history above. The doubled half-road width (§ Step 2) eats roughly twice
the margin off each block's interior
(`blockAtoms - 2*halfRoadFor(roadClass) - 1`, from the carving line cited
above) than the old `ROAD_WIDTH=9` did, and it eats it from every tier at
once, not just the tightest one — `city` (`blockAtoms: 57`) is the
narrowest today and the most likely to need a real number change, not just
`mainland`'s looser 80.

**Test:** the same existing coverage/density gates step 2 turned red —
`test/boardGenerator.test.ts`'s 20–40% coverage gate and the "settled land
totals 20–40 km²" gate (**checked directly: this second gate is NOT
actually at risk** — it sums settlement *boundary* polygon area
(`islandBoundary`/`mainlandBoundary`, lines 187–225), computed from the
coastline inset alone, with no dependency on road width or on pieces placed
inside it; named here so it is not mistaken for a third red gate). No new
test needed for this step — retuning is the fix for the gate Step 2 already
turns red, the same relationship `CLEAR`'s own history already has to that
gate.

**Mutation:** not a new control — re-run the existing coverage gate as the
"mutation" check: reverting the retuned numbers to their step-2-red values
must reproduce the same red for the same reason (out-of-band on the same
tiers), proving the fix is the retune and not an accidental, unrelated
change.

**Cost, ESTIMATED (not measured this session — no retuning has been
attempted):** each retune-and-check cycle is one real `generateBoard()`
call. Based on the one precedent already on record (`CLEAR` 2→3 plus one
tier's `plotAtoms` nudge, at least 2–3 real measured passes before the band
held on every tier), expect on the order of **3–6 iterations** across the 9
settled, non-`oneHouse` tiers — roughly 3–6× the per-call cost measured
below, plus the time to read each result and choose the next number by
hand; not a number to treat as precise.

### Step 4 — retire `bridge-generator.js`'s own separate `ROAD_WIDTH`

**What changes:** `public/bridge-generator.js` line 57 —
`const ROAD_WIDTH = 9; // matches board-generator.js's own ROAD_WIDTH -- one
bridge deck lane width` — and its four use sites, all in the BRIDGE piece's
own geometry (lines 203, 205, 208, 210 — checked directly by grep, four
occurrences, not three). **Dock geometry is NOT affected**: docks use a
hardcoded `foot: { w: 4, d: 4 }` (checked directly, `public/
bridge-generator.js`'s dock construction) and never read `ROAD_WIDTH` at
all — only bridge decks do, so this step's scope is bridges only, not
"bridge/dock decks" as an earlier draft of this line said. **Found while
writing this plan, not previously named anywhere:** this is a SECOND,
independent copy of the same number, in a different file, that step 2 above
does not touch — the exact "a declared value repeated in a second place"
pattern `docs/BUILD-LOOP.md`'s own STEP 8 already names as a standing
failure mode (there, for a pinned hash; here, for a width). Left alone, a
bridge built after Step 2 would be a 9 m deck meeting an 18 m road — a
real, visible seam at every bridge crossing, not a test failure: **no
existing test pins this file's `ROAD_WIDTH`** (checked directly —
`test/bridgeGenerator.test.ts` has no assertion on deck width), so this
would fail silently, by absence, exactly the failure shape
`docs/AUDIT-PROTOCOL.md` names elsewhere. Sizing should read the same
`roadClass` the crossing's own boundary uses (currently uniformly
`STREET`, same as Step 2), via the same `halfRoadFor`-style lookup —
whether that is a shared helper or a second, identically-sourced one is an
implementation choice, not a design decision, since both files already read
`ROAD_STANDARDS`-shaped data independently.

**Test:** a new gate — for every bridge/dock piece in a generated crossing
set, its deck width equals the `STREET` class's own `row`, i.e. it agrees
with the road pieces it connects to, not a piece-type-local assumption.

**Mutation:** revert the fix (bridge-generator.js's own `ROAD_WIDTH` back to
a hardcoded `9`) — must turn the new agreement test red.

### Step 5 — regenerate the committed board and re-verify

**What changes:** run `node scripts/gen-board.mjs` (equivalently `npm run
gen:board`) to overwrite `public/board.generated.json` against the retuned
generator, once Steps 2–4 are green. No hand-editing of the committed file.

**Re-check, not re-pin, these — loose bounds on the real committed asset,
read directly, not assumed to still hold:**
- `test/boardRender.test.ts` — "B3 gate: buildBoardScene produces exactly
  one mesh per real piece in the committed board.generated.json" —
  `pieces.length > 30000`.
- `test/bridgeGenerator.test.ts` — the equivalent `pieces.length > 30000`
  check, and `boundaryIds.length === 12` (this second one is NOT at risk —
  boundary count comes from `settlementBoundaries()`/terrain landmasses, the
  same computation Step 3 confirmed is independent of road width).
- **Added on blind review, missed in the first draft of this list:**
  `test/bridgeGenerator.test.ts`'s own already-red, named gate
  (`docs/DECISIONS-FOR-MARK.md` #7 — "every one of the 12 settled boundaries
  has at least one real crossing piece") is occupancy-sensitive:
  `scripts/gen-board.mjs` places crossings onto the SAME board instance
  `generateBoard()` already filled with roads and buildings, so widening
  roads (Step 2) and retuning block/plot sizing (Step 3) both change
  occupancy right up to every boundary's own edge — exactly what this
  gate's outcome depends on. Regeneration under this plan could change
  which boundaries lack egress, for better or worse, without anything else
  in this plan flagging it. Re-check it explicitly, and report the result
  (still 3 short / a different number / fixed) rather than assuming Step 5
  leaves it exactly as found.
- **Confirmed NOT gates at all, so NOT expected to move, and named here so
  a future session does not go looking for a defect that isn't one:**
  `test/worldSeed.test.ts`'s `PRE_SEED` terrain fingerprint (roads do not
  touch `heightAt`); `test/planSeed.test.ts`, `test/roadsFollowDensity.test.ts`,
  and the `buildingsPlaced: 17,108` / `"17,108 buildings"` claim
  (`test/generatedClaimsAreCurrent.test.ts`, `test/publicClaims.test.ts`,
  `public/index.html`) — all of these read `public/city-plan.js`'s
  `generateWorld()`, the older, separate layout pipeline
  `scripts/gen-city-summary.mjs` summarises, not `board-generator.js`'s B2
  pipeline this retirement touches. Confirmed by reading
  `scripts/gen-city-summary.mjs` directly: it imports `city-plan.js`, never
  `board-generator.js`.
- `test/boardGenerator.test.ts`'s own `decision-5 step 1` test (this
  session's own addition) — its `classesUsed` assertion stays `["STREET"]`
  and stays GREEN through this whole retirement, because every step above
  keeps every piece's `roadClass` uniformly `STREET`; it does not need
  editing unless a later, separate piece of work (not this retirement)
  introduces a second class.

**Also required, per `CLAUDE.md`'s own verification discipline:**
`node scripts/shoot.mjs "Downtown close"` (or an equivalent close-in shot)
after regeneration — a visual check that road width doubling reads as
intended and that Step 4's crossing fix actually closed the seam, not just
asserted it closed. Never claim this by test output alone.

**Cost, MEASURED this session (2026-09-11, this host):**
- `generateBoard({useSampling:true})` alone: **39.6–39.8 s**, three
  consecutive runs (`node test/run.mjs test/boardGenerator.test.ts`, the
  B2.5 timing line each run) — consistent with `scripts/gen-board.mjs`'s
  own header comment, which separately documents **40–113 s depending on
  this host's own memory pressure** (that wider range is THEIR measurement,
  quoted, not re-verified to its top end this session).
- The full suite (`npm test` = `tsc --noEmit && node test/run.mjs &&
  vitest run`), attempted once this session, did **not complete**: it
  crashed with a JavaScript heap out-of-memory fatal error **185 s into
  `node test/run.mjs` alone** (3 m 9 s real time before the crash, node
  process still inside the node-test phase, `vitest` never reached). This
  is a real, measured fact about this host's current memory pressure, not a
  permanent property of the suite — but it is a real cost/risk for Step 3's
  own iterative retune loop: **the scoped run this session already used
  successfully throughout** (`node test/run.mjs test/boardGenerator.test.ts`,
  ~40 s, no crash across three consecutive runs) is the safer per-iteration
  check during retuning; reserve a full `npm test` for immediately before
  the final commit of each step, not for every retune attempt, and expect
  it may need retrying if this host's memory pressure recurs.
- B2.7 crossings placement and the JSON serialise/gzip step
  (`scripts/gen-board.mjs`'s own remaining console.log lines) were **not
  separately measured this session** — small relative to the ~40–113 s
  generation cost per the same script's own prior output shape, but that is
  an inference from the script's structure, not a timed number, and is
  named as such rather than stated as measured.

### Step 6 — close the record

**What changes:** `docs/DECISIONS-FOR-MARK.md` #5 gets a closing note (real
coverage numbers from Step 3, the regeneration command and date from Step
5) superseding its current "step one only" line; this document's own
status line (currently "proposal, untracked, awaiting Mark's approval")
updates to reflect what was actually built, not just proposed.

### Why the order is this and not another

1. **Geometry before tuning (Step 2 before Step 3), not the reverse.**
   Tuning numbers that are about to be invalidated by a width change wastes
   the retune; the coverage gate has to be honestly red for the real reason
   before it is worth chasing green again.
2. **`bridge-generator.js` (Step 4) placed after Step 2/3, but weaker than
   it looks — corrected on blind review.** An earlier draft of this line
   argued Step 4 had to wait because Step 3's retune might change "which
   class or width is live." That is not actually true under this plan's own
   scope (§ "Why this does not need §8 answered first," below): every piece
   stays `STREET` throughout, Step 3 only retunes `blockAtoms`/`plotAtoms`/
   `CLEAR`, and `ROAD_STANDARDS.STREET.row` is already fixed today. Step 4
   does not depend on Step 2 or 3 landing first. Doing it last is still
   reasonable housekeeping (one bridge-width fix instead of interleaving it
   with the board-generator.js edits), but the causal justification is
   removed rather than repeated here inaccurately.
3. **Regeneration (Step 5) only after every source-level step is green,
   never before.** `scripts/gen-board.mjs` is a pure function of the
   generator's own current code — regenerating against unfinished geometry
   or an untuned board would commit a board that has to be regenerated
   again, doubling the ~40–113 s cost and, worse, leaving a real,
   visible-if-anyone-looks intermediate state in the committed asset.
4. **The record (Step 6) last, not alongside.** `DECISIONS-FOR-MARK.md`'s
   own convention throughout this file is to record what was ACTUALLY done,
   not what was planned — writing the closing note before Step 5's real
   numbers exist would repeat the exact "declared value reported as though
   measured" pattern `docs/BUILD-LOOP.md` STEP 7 warns against.

### Why this does not need §8 answered first

None of Steps 2–6 above add a second road footprint or a second road type —
every piece stays `STREET`, the class step 1 already committed to. §8's
three questions (module size, the partitioned one-lane road's own width,
freeway junction grade separation) only become load-bearing once a SECOND
class enters rotation, which is out of scope for retiring the constant.
They remain open, and remain Mark's call, for whatever step introduces
road variety next.

**A caution for whoever plans that next step, not for this one:** because
this retirement widens every road to `STREET`'s 18 m uniformly, the
`blockAtoms` numbers Step 3 lands on will likely be tuned tight around an
18 m road. A later step that introduces a narrower class (e.g. `ALLEY`, 6
m) into some tiers would change the interior-carving arithmetic again,
`blockAtoms - 2*halfRoadFor(roadClass) - 1` swinging the other way — worth
re-measuring then, not assuming Step 3's numbers still hold.

### A b1-land → codex-lane sync merge is coming

Noted for whoever executes this plan, not acted on here: once this lane
next stops clean, a sync merge to `codex-lane` is expected so that F1's
facade gate becomes measurable. Nothing above assumes `b1-land` stays
isolated indefinitely — Step 5's regeneration and Step 6's record should
both be written so they read correctly to a session working from
`codex-lane` after that merge, not only from `b1-land`.
