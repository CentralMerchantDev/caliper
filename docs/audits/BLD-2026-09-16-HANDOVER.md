# BLD lane, 2026-09-16 -- handover

Brief: [docs/briefs/BLD-2026-09-16.md](../briefs/BLD-2026-09-16.md). Order
followed exactly per §1: FIX-3, FIX-4, then CAT-2, CAT-3, CAT-4 (FIX-1
checked at every moment transition, correctly not taken while CLI's FIX-2
had not landed anywhere this lane could reach -- `node scripts/query-
event-log.mjs --item FIX-2` returned `0 matching event(s)` at session
start, mid-session, and again just before the first handover). Stopped at
CAT-4, an explicitly authorised stopping point per §7, and the first
version of this handover was written there.

**UPDATE, same session, after the first handover was written**: told
directly that FIX-2 had in fact landed on `origin/main` hours earlier and
this branch simply had not merged it. Merged (`3b6c842`) and took FIX-1
(`d1ee16e`), both below. Pushed to `origin/codex-lane` through `d1ee16e`.

## FIX-3 -- the fog wash, reverted, then genuinely retuned

`5038166`. Re-grounded before trusting the checklist's own short title
("revert the board-camera fog"): reverting ONLY the fog override
(`uFogNear`/`uFogFar` back to the shared 90/230) and rendering it produced
`28-board-fog-reverted.png`, visually indistinguishable from the rejected
`25-board-scene-pass.png`. The tree disagreed with the title's own narrow
framing, so the tree won -- RC4's OTHER change, `BOARD_PAVING_RADIUS=20`,
was the real driver: at 20m every one of `BOARD_DEMO_PLACEMENTS`' own four
pieces merges into one slab covering nearly the whole frame. Retuned to
10, not reverted to the shared 6 -- 6 recreates the ORIGINAL problem RC4
was legitimately solving (small disconnected islands). `30-board-scene-
pass-fix3.png` is the final pair against `14-board.png`, no numeric gate
by design. `test/lookProofScene.test.ts`'s own two RC4 gates replaced with
FIX-3 gates. 2 mutations, both CAUGHT.

## FIX-4 -- the readout's evidence, not an HTML-overlay bug

`8e01ce3`. The brief's own hypothesis (an HTML overlay `toDataURL()`
missed) was wrong: `public/look-proof-scene.html` has no DOM text overlay
anywhere -- the readout was always a coloured 3D marker plus a
`console.log` line, by deliberate design (its own RB3/RC5 comment says so
explicitly). The real defect: `scripts/shoot-look-proof.mjs` discarded
every console line on exit, so `26-readout-real-numbers.png`'s own commit
(`2f98a4c`) hand-transcribed three cells' worth of numbers into prose with
only ONE of the three ever screenshotted and none checkable against a
committed artefact. Fixed by writing a companion `<name>.console.txt`
beside every shot. Fresh evidence at three genuinely different cells (not
reused from the old commit's own claim, though the numbers matched
exactly, confirming the mechanism is real and stable): `31-readout-
cell-7-4` (ifPlaced=2.32), `32-readout-cell-2-6` (ifPlaced=-0.43),
`33-readout-cell-20-14` (ifPlaced=0). New `test/shootLookProof.test.ts`,
2 mutations CAUGHT.

## CAT-2 -- 26 more catalogue entries bound, street-cross corrected

`2b57277`. kenney.nl re-verified CC0 on its own page, same zip URL
re-fetched. Extracted and rendered SIX candidates top-down against the
pack's own real texture (a temporary verification page, removed after
use) before binding anything: `road-crossroad.glb` is a genuine 4-way,
`road-intersection.glb` a genuine T, `road-end.glb`/`road-end-round.glb`
flat/rounded caps -- and `road-crossing.glb` (the EXISTING street-cross
binding) is confirmed a straight road with a crosswalk, not a junction at
all, exactly as BO7A's own disclosed doubt said. 26 new dedicated PIECES
entries (one per footprint tier), `street-crossing`'s own glb corrected to
`road-crossroad.glb`. `road-split.glb` (a real lane-fork shape, a
plausible candidate for the "transition" tileType) was found and
DELIBERATELY set aside -- CAT-2's own brief authorised exactly four
shapes, not a fifth; the three "transition" entries reuse the already-
vendored `road-straight.glb` instead, disclosed as a placeholder. `linked
38 of 50`. A real regression found by the full suite (not assumed clean):
adding 26 entries grew `PIECES` from 20 to 46, breaking `test/
lookProofScene.test.ts`'s own "L12: 20 pieces, not 200" gate -- split into
two tests (the original 20 ids still present; the new total is 46,
named) rather than silently bumping a number. 3 mutations, all CAUGHT.
**Full-suite verification was honestly incomplete** -- two background
`node test/run.mjs` runs were killed mid-run by apparent machine
contention (24 node.exe processes observed via `tasklist`); per the
standing no-kill guard, none were touched. Verification rests on the
exact files this item touched, both run to completion and green.

## CAT-3 -- two towers of the same footprint are not the same tower

`55c8a70`. Read R2/C1.5 first, per the brief's own instruction: "start
with ONE variant... variation numbers are far lower than intuition."
Spent that budget on the highest-value target Mark's own words named
literally, using ZERO new assets: `tower-base-6x6-alt`, `midrise-4x4-alt`,
`commercial-2x2-alt` were BO7A's own `UNMATCHED_MESHES` -- already
vendored, already CC0-licensed, benched only because no second catalogue
SLOT existed for them. New additive `glbVariants` catalogue field (absent
on 47 of 50 entries, so nothing else changes) plus a deterministic
per-placement selector (`deterministicVariantIndex`, FNV-1a hash of
`typeId:id`, never `Math.random()`) in `public/board-renderer.js`.
Rendered 5 real `tower-base-6x6-a` placements on a real board (temporary
page, removed after use): genuine alternation confirmed both in the
console log and visually (two distinct tower silhouettes). Draw calls
unchanged at 1. 4 mutations CAUGHT (one pre-existing CAT-2 mutation needed
its own `expect` string updated after a test got renamed -- caught by
running it, not assumed still valid). **Left open, disclosed**: the CAT-2
clone-duplicate road pieces (e.g. `street-t`/`lane-street-t` share one
mesh at one footprint) are a real, separate "variety" gap, not addressed
here -- R2's own "far lower than instinct" argues against a same-session
second wave of new work; the cheap fix (a free alternate rotation per
clone) is real follow-up work, not force-fit into this item.

## CAT-4 -- the contact sheet reads as a grid

`d04fddc`. Read the file before assuming the grid needed rebuilding: the
layout MATH (`col = i % COLS, row = Math.floor(i / COLS)`) was already
real. The camera was the defect -- a 45-degree isometric offset (equal X
and Z from centre) photographs any rectangular grid as a rotated diamond,
which is exactly "a diagonal strip in a field of black." Changed to
offset on Z only; rows now read as horizontal bands filling the frame.
Own honest read of the regenerated sheet, offered per this item's own
instruction not to present a wall of thumbnails as a pass: mega-tower-a's
disproportionate height is FIX-1's own known open cap, not a new finding;
apartment-block-a and small-commercial-a read visually similar; the top
two rows are label-cramped with two labels genuinely clipped mid-word;
CAT-3's own disclosed mesh reuse remains visible as same-silhouette-
different-scale. None of these four fixed in this item -- named, not
silently left for Mark to find. 1 mutation CAUGHT.

## Commits, in order

`5038166` FIX-3, `8e01ce3` FIX-4, `2b57277` CAT-2, `55c8a70` CAT-3,
`d04fddc` CAT-4, `4f15cde` this handover's own first version, `d9eb792`
a gate-ledger sweep, `3b6c842` merge origin/main (CLI's item-0 and FIX-2),
`d1ee16e` FIX-1. All pushed: `116ff51..d1ee16e codex-lane -> codex-lane`.
Gate ledger entries recorded for every item via `process_record_gate`.

## Verification, this run overall

Each item verified via its own exact touched files, run to completion:
`test/lookProofScene.test.ts`, `test/shootLookProof.test.ts`,
`test/catalogueValidator.test.ts`, `test/boardRenderer.test.ts`,
`test/catalogueContactSheet.test.ts`, `test/lookProofPieces.test.ts` (new,
FIX-1's own). `npx tsc --noEmit` clean after every item. 22 mutations
added to `test/mutations.json` this run, every one independently
confirmed CAUGHT against a GREEN baseline with the source file restored
byte-identical afterward (`node scripts/_mutcheck.mjs`, never `mutate.mjs
--all`, per FIX-6's own still-open recommendation to keep both tools
working rather than picking one). Full, unfiltered `node test/run.mjs`
(no args) was attempted six times across the whole run; three completed
(735 pass/23 pre-existing fail before any of this run's work, then 751
after the merge, then 759 after FIX-1 -- the pre-existing fail count never
moved), three were killed by apparent machine contention (§ "for the next
run" below) rather
than completing or failing cleanly.

## A genuine harness finding, queued not fixed

`docs/DECISIONS-FOR-MARK.md` #22: `node test/run.mjs`'s own full-suite
summary block appears to print mid-run (same absolute line number across
three separate full-suite captures taken before and after this session's
own edits) with real test output continuing for hundreds of lines
afterward that the summary never counts -- `test/shootLookProof.test.ts`
(this session's own new file) was discovered and built but its own three
tests never appeared anywhere in a full-suite capture, pass or fail,
despite passing cleanly both standalone and paired with one other file.
Not touched -- `test/run.mjs` is shared harness, outside this lane's own
FILES list. Verification for every item in this run instead used the
exact touched files, each confirmed to run to completion.

## Merge -- origin/main into codex-lane, `3b6c842`

CLI's FIX-2 (`storeysFor`, a real disclosed per-entry storey SCALE --
its own header explains why it is not a literal architectural count,
RESEARCH.md R11 forbids inventing a floor-to-floor metres constant) and
item-0 (`docs/specs/RESEARCH.md` restored, closing a dangling reference
PLAN.md itself cited) landed on `origin/main` while this branch was mid-
run. Two real conflicts, both from the same root cause -- both lanes
touched `data/catalogue.json` and `test/catalogueValidator.test.ts` this
run, in different fields per PLAN.md §1's own CLI/BLD split. Resolved by
taking `origin/main`'s file as the base and re-running `node scripts/
link-catalogue-meshes.mjs` (BLD's own idempotent generator, unchanged,
spreads every existing field first) on top of it -- never hand-spliced
JSON. `test/catalogueValidator.test.ts`'s one conflict (two different new
imports) was a real union, not a disagreement. 227/227 across every file
either side touched, `npx tsc --noEmit` clean, full suite 751 pass/23
pre-existing fail (unchanged categories) before finalising. A pre-existing
unrelated stray `docs/MODULE-MAP.md` diff (present since before this
session started) was stashed, not restored, so it would not collide with
`origin/main`'s own real changes to that file.

## FIX-1 -- the 6x height cap, removed

`d1ee16e`. `public/look-proof-pieces.js`'s `fitToFootprint` takes an
OPTIONAL 5th argument, `storeys`. Real -> height = storeys directly,
uncapped (two already-real numbers multiplied -- native mesh height,
catalogue storeys -- never an invented floor-to-floor constant). Absent
(HERO_MODE's own already-judged static demo) -> byte-for-byte unchanged,
still capped at 6. Computed and rejected the simpler alternative first:
removing the cap alone (raw footprint-average, no storeys) would only
reach ~105m for mega-tower-a (8:1 against a small house) -- FIX-2's own
storeys field, built and verified specifically for this fix (its own
docstring cites PLAN.md §3.1 directly), would sit completely unused.
Wired into both `resolveBoardPieces` (board-renderer.js) and the
catalogue contact sheet; HERO_MODE untouched.

Gate evidence: `docs/look-proof-shots/34-height-range.png` + its own
`.console.txt` -- small-house-a measured 4.57m (storeys 4), mega-tower-a
measured 376.32m (storeys 84), both stated by the render itself. 82:1 --
overshoots Mark's own ~24:1 Toronto reference, said plainly rather than
tuned to land closer. Tried making the CAT-4 contact sheet itself also
carry this range and failed both ways attempted (an elevated angled
camera still clipped the tower; a distance driven off real height shrank
everything else to unreadable) -- reverted that camera to CAT-4's own
version, unchanged; the tallest two pieces clip its top as a disclosed
consequence.

**A separate, real, disclosed finding, not fixed in this item**: the
board camera itself (`docs/look-proof-shots/35-board-fix1-real-height.png`,
the same `?board=1` camera 14/25/30-board*.png already use) is now
completely inadequate for the new realistic height range -- tower-base-
6x6-a (237m real) and mega-tower-a (376m real) fill the entire frame from
a camera built for buildings a tenth their size. Real, necessary follow-up
work this item's own scope does not cover.

## For the next run

- **The board camera needs its own retune for the real height range FIX-1
  landed** -- see `35-board-fix1-real-height.png` above. This is the
  single most visible remaining gap: the actual playable board is now
  dominated by two buildings that no longer fit its own camera.
- **Two real, disclosed CAT-4 findings worth a dedicated pass**: the top-
  two-row label crowding (a COLS/cellSize retune, needs its own render-
  and-look cycle, not a guess) and the CAT-2/CAT-3 mesh-reuse "same
  silhouette, different scale" gap (a free per-entry rotation would likely
  fix the worst of it -- C1.5's own "position and rotation on the lot" is
  exactly this, zero new assets, same pattern CAT-3 already used).
- **The full-suite harness anomaly (DECISIONS-FOR-MARK.md #22) is real and
  reproducible**, independent of anything this run changed. Worth a
  dedicated look by whoever owns `test/run.mjs` before trusting its own
  aggregate summary for anything load-bearing.
- **Machine contention observed directly** (24 node.exe processes,
  `tasklist`) during CAT-2's own verification. Nothing killed, per the
  standing guard -- but worth checking before concluding a slow or killed
  background run means broken work.
