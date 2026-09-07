# P0 — the road kit is now trustworthy

Evidence for `docs/specs/BOARD-CONVERSION-PLAN.md` PHASE P0. Every number
below has the command that produced it beside it.

## P0.1 — `verifySocketMating()` actually checks position and bearing

**Before:** the function read `kind`, `width`, `lanes` and returned `true`.
It never touched `.at` or `.bearing`, despite the file's own header
claiming it checked that sockets "face each other (bearing diff 180°)".
It would pass two pieces a kilometre apart pointing the same way.

**Fix:** `public/roadkit.js` — added `transformSocket(socket, placement)`
(local → world) and rewrote `verifySocketMating(sockA, sockB, eps)` to also
check position coincidence and bearing opposition, given two world-space
sockets.

**Gate, watched red then green** — `test/roadkit.test.ts`:
- Watched red before the fix existed: `node test/run.mjs` refused to build
  the suite at all (`No matching export in "public/roadkit.js" for import
  "transformSocket"`) — the fix genuinely didn't exist yet.
- After the fix: 4 dedicated cases —
  1. coincident + opposed sockets → passes
  2. dimensionally-compatible sockets 1000m apart → throws (position)
  3. coincident sockets facing the *same* way → throws (bearing)
  4. the exact regression named in the plan (two straights, a kilometre
     apart, pointing the same way) → throws
- Command: `node test/run.mjs` (part of `npm test`).

## P0.2 — one verifier, not two

**Before:** `public/roadkit-street-demo.js` carried its own hand-rolled
position/bearing check (`rotate`, `dirFor`, manual epsilon comparisons)
because `verifySocketMating` didn't do the job. Two implementations of
"do these mate."

**Fix:** the demo module now calls `ROADKIT.transformSocket` +
`ROADKIT.verifySocketMating` for the actual pass/fail verdict on every
join; the position/bearing numbers it also reports are diagnostics for the
HUD, not a second verifier.

**Gate:** the 7-piece chain (`straight → zebra crossing → straight → curve
→ straight → 4-way intersection → straight`) still reports zero error at
all 6 joins, through the shared function alone.
- `node scripts/shoot-roadkit-street.mjs` → `ALL JOINS VERIFIED: true`,
  every join `positionErrorM: 0`, `bearingDiffFrom180: 0`, rendered to
  `.shots/roadkit-street-demo.png` (viewed directly: curve sweeps into the
  intersection slab, crossing sits mid-straight, socket arrows line up
  head-to-tail across every seam).
- `node test/run.mjs` — `test/roadkit.test.ts`'s "P0.2" case asserts the
  same 6-for-6 through `buildDemoStreet()` directly.

## P0.3 — every piece, named, not skipped

`scripts/verify-roadkit.mjs` (new) instantiates all 30 exported piece
builders — one representative call per family, 34 instances total — and
reports, per piece: does it build, is its footprint a whole number of
cells, do its sockets sit on a cell boundary (which, for a base-centre
piece, means the local offset is a multiple of `CELL/2` = 4m — proved in
the script's own comment: an N-cell footprint's edge sits at `N*CELL/2`
from centre, always an exact multiple of `CELL/2` for any integer N).

`bridgeChain()` is excluded — it returns a chain *plan* (abutment/pier/span
references), not a single model with its own footprint/sockets.

Command: `node scripts/verify-roadkit.mjs`

**Before any P0.4 fix:** 34 checked, 31 failing at least one column (28
footprint, 5 socket — some pieces failed both).

**After P0.4 (see below):** 34 checked, 0 failing, 3 named open findings.

## P0.4 — footprints snapped outward, before/after recorded

Added `snapCellsOutward(v) = Math.ceil(v / MODULE_M) * MODULE_M` to
`roadkit.js`. Applied per the piece's own coupling between real-world
dimension and socket position:

- **Footprint-only** (socket unaffected by width — length-axis sockets
  only): `straight`, `curve`, `bridgeArch`, `bridgeCableStayed`,
  `bridgePier`, `bridgeDeckSpan`, `bridgeApproachRamp`, `bridgeSpan`,
  `causeway`, `railStraight`, `railPlatform`, `turningPocket`,
  `medianBreak`, `busBay`, `layby`, `crossing`, `rampMerge`'s and
  `rampDiverge`'s footprint (their angled socket is a separate, open
  finding — see below).
- **Dimension snapped at the source** (the same value drives a cardinal
  socket's position, so it's snapped before use, matching the pattern
  `intersection4Way` already established): `junction`, `roundabout`
  (legacy), `levelCrossing`, `gradeSeparation`. The visible pavement/deck
  geometry keeps its true real-world size in every case — only the
  *footprint reservation* and *socket position* move outward; a socket's
  declared `width`/`lanes` fields (used for dimensional mating between
  pieces of the same road class) are never altered.

| piece | footprint before | footprint after |
|---|---|---|
| road-straight (×6 classes) | e.g. 62×8m (FREEWAY) | 64×8m (8×1 cells) |
| road-curve-street-r32-a90 | 82×82m | 88×88m (11×11 cells) |
| junction-4way (legacy) | 26×26m | 32×32m (4×4 cells) |
| roundabout-r16-4arms (legacy) | 60×60m | 64×64m (8×8 cells) |
| ramp-merge-freeway-right | 76×48m | 80×48m (10×6 cells) |
| ramp-diverge-freeway-right | 76×64m | 80×64m (10×8 cells) |
| median-break-boulevard | 44×16m | 48×16m (6×2 cells) |
| turning-pocket-avenue-left | 28×32m | 32×32m (4×4 cells) |
| bus-bay-street | 21×24m | 24×24m (3×3 cells) |
| layby-avenue | 31.5×32m | 32×32m (4×4 cells) |
| crossing-zebra-street | 18×16m | 24×16m (3×2 cells) |
| level-crossing-street | 18×16m | 24×16m (3×2 cells) |
| grade-separation | 36×32m | 40×32m (5×4 cells) |
| bridge-arch-avenue-64m | 28×64m | 32×64m (4×8 cells) |
| bridge-cablestay-boulevard-160m | 61.6×160m | 64×160m (8×20 cells) |
| bridge-cablestay-avenue-120m | 39.2×120m | 40×120m (5×15 cells) |
| bridge-pier-avenue-12m | 30×6m | 32×8m (4×1 cells) |
| bridge-deck-span-32m-avenue | 28×32m | 32×32m (4×4 cells) |
| bridge-approach-ramp-6m-avenue | 28×120m | 32×120m (4×15 cells) |
| causeway-freeway-2m | 62×16m | 64×16m (8×2 cells) |
| rail-straight-1m | 4.8×8m | 8×8m (1×1 cells) |
| rail-platform-2m | 3.6×16m | 8×16m (1×2 cells) |
| rail-switch-right | 10×32m | 16×32m (2×4 cells) |
| bridge-abutment, turning-head, slip-lane, intersection-4way, intersection-3way, roundabout-modern | already whole-cell | unchanged |

**Gate:** `node scripts/verify-roadkit.mjs` → 34 pieces, **0 failing**.

## P0.4 open findings — named, not forced

Three pieces have one socket whose position is a genuine real-world
lane/track-gauge offset (a merge taper or switch diverge), not a
bounding-box edge. Forcing it onto the cell grid would mean changing
`ROAD_STANDARDS` real-world dimensions themselves, which the file's own
header says never scale:

- `rampMerge` — ramp socket at local x = ±(mainRow/2 + rampRow/2), bearing
  195°/165°.
- `rampDiverge` — same shape, bearing 15°/-15°.
- `railSwitch` — diverging-route socket at local x = ±3.2 (a
  track-gauge-derived turnout offset), bearing ±15°.

These are documented in-code at the point of definition and flagged as
`○` (not `✗`) by `verify-roadkit.mjs`, distinct from an unexplained
failure. **P0's exit gate ("every road piece... occupies whole cells") is
not fully met for these 3 sockets** — named here rather than silently
counted as done. Closing them requires either accepting a piece-specific
socket at a non-cell position (and teaching the future placement layer to
handle that) or redesigning the taper/turnout geometry itself, which
crosses toward agy's "piece geometry" ownership. Left for Mark to decide,
not decided here.

## Full suite

`npm run typecheck` — clean.
`node test/run.mjs` — 610+ pass (roadkit.test.ts's 6 new cases included),
the same 4 pre-existing failures as before this session's work, all
unrelated to `roadkit.js`: the two known-red seed pins (`planSeed.test.ts`,
`layoutGeometry`-family seed-match check), the origin-stability test
(intentionally red — Step 5, WORLD-REBALANCE-BRIEF.md), and one derived
artifact staleness check (`claimSpansAreChecked`-family) not touched by
this work. No new failures introduced.
