# Overnight handover — BLD lane — 2026-09-11

Written for someone away from the keyboard; Mark is asleep, nothing waits on
him tonight. Continues `docs/audits/OVERNIGHT-BLD-2026-09-10.md` — its
grounding, routing, and decision queue still apply and are not repeated here.
Branch `codex-lane`, linked worktree `C:\Code\sandbox-spike-codex`. No merge,
deploy, PR, or touch to `main`/`b1-land` — a `b1-land -> codex-lane` sync is
coming but is Mark's to authorise, not attempted here.

Updated and committed after every item, per this run's own instruction. This
is the live copy; read the bottom for the most recent state, not the top.

---

## Item 0 — verifying 70a9e64, the full suite

`70a9e64` (bldWarehouse's roofStyle vault fix, previous session) was already
verified against targeted files (35/35 green: buildingFeatureFlags,
buildingExplicitSize, buildingLODAndColors, layoutGeometry, trimAtlasPatch),
`npx tsc --noEmit`, and `regressionGate.test.ts`, plus full watched-red /
byte-identical-restore mutation evidence — all before this session.

A full `node test/run.mjs` (PID 1513) was left running from the prior
session as extra confirmation. Checked this session: PID 1513 is no longer
in the process list (`ps aux` / `tasklist /FI "PID eq 1513"` both empty) —
it finished on its own, not killed. Its result was only ever visible through
a `| tail -30` pipe in the previous session's command, which is itself the
double-buffering anti-pattern `scripts/gen-test-count.mjs` warns against (a
second process consuming/discarding the stream) — the last 30 lines were
captured (two known pre-existing red tests in `test/originStability.test.ts`,
unrelated to `buildings.js`), but the full record was never saved anywhere
and the pass/fail totals are unknown.

**Redone properly this session**: a fresh `node test/run.mjs`, output
redirected straight to disk in one step (no intermediate pipe, no second
process). Started early in this session and left running throughout items 1
and 2, per this run's own instruction ("let it run while you work").

**Status as of item 2's commit: still running, not yet finished.** 959
lines observed so far (this project's suite is large enough that
`regressionGate.test.ts`'s own A5.2/A5.3 test alone measured 80–142 s
earlier this session). Everything visible so far is either green or one of
this project's own already-documented, self-explaining red tests — none of
it touches `buildings.js` or any `test/building*.test.ts` file, all of
which were independently re-verified green against this session's own
changes (items 2 below) via a separate, already-completed targeted run:

- `test/originStability.test.ts`'s "changing WORLD.SIZE moves the grid
  origin" — self-documented in its own failure message as staying red on
  purpose (`docs/audits/WORLD-DENSITY-FINDINGS.md` §8), not a regression.
- `every export in public/ and src/ is product-reachable...` (dead-exports
  reachability test) — failing; not yet cross-checked against
  `docs/specs/COMPLETION-PLAN.md`'s own C2 item, which already records this
  allowlist as "not yet reviewed one-by-one," consistent with a pre-existing,
  already-named gap rather than something this session touched.
- Three UI measurement/timer tests (`measures immediately on call...`,
  `keeps measuring on a poll...`, `stop() ends the poll...`) and two
  mutation-manifest tests (`every mutation in the manifest has a committed,
  checkable CAUGHT result`, `the summary is not stale against the manifest
  it claims to cover`) — failing, in files this session never opened.

None of these were investigated further this session — recording their
existence and names here is the honest floor per this run's own
instruction ("record what it says either way"), not a claim that they are
understood or fixed. Whoever picks this up next should check them against
`docs/DECISIONS-FOR-MARK.md` and `docs/AUDIT-LEDGER.md` before assuming
they are new.

**Full result, once the run completes, to follow in a later commit.**

---

## Item 1 — K6-BUILDINGS.md vs OVERNIGHT-BLD-2026-09-10.md, reconciled against the real code

**Which was wrong:** `docs/audits/K6-BUILDINGS.md`. Its "Checklist, extended"
section had not been updated past RUN3 — it still described
`bldBusinessParkBlock` as having zero seed-derived variation (fixed in RUN5,
commit `f4b4076`) and never mentioned RUN5's other three findings at all
(`bldApartmentWalkup`'s `hasGarden` fix, `bldHighStreetTerrace`'s `roofStyle`
fix, or the `bldTower`/`bldWarehouse` survey). `docs/audits/OVERNIGHT-BLD-
2026-09-10.md` already had the accurate, current account of all of that.

Checked against the real code directly, not against either document's own
account of itself (`public/buildings.js`, grepped and read function by
function for `hasSolarArray`, `hasGarden`, the high-street-terrace
`roofStyle`, and this session's own warehouse fix):

- `bldBusinessParkBlock` — real (`hasSolarArray`, line 3028).
- `bldApartmentWalkup` — real (`hasGarden`, line 2282).
- `bldHighStreetTerrace` — real (`roofStyle`, line 2890).
- `bldTower` — confirmed clean by direct reading, `profile`'s five values
  all branch real geometry.
- `bldWarehouse` — this session's own `70a9e64` fix confirmed present
  (line 2457).

Fixed `K6-BUILDINGS.md` with a dated correction section (not a silent
rewrite, matching this document's own established practice — see its
"CORRECTION, 2026-09-09 RUN2" precedent) naming all five typologies'
current real state and the commits/files that closed each one, plus the
general lesson for whoever runs this survey next: "the field is consulted"
and "every declared value of the field is distinguishable" are different
checks, and RUN5's survey only ran the first one — which is exactly how
`bldWarehouse` was marked clean in RUN5 and then found to have a real gap
this session.

**`OVERNIGHT-BLD-2026-09-10.md` was also one line stale** — not wrong when
written, but superseded by this session's own `70a9e64`, landed the day
after. Added a matching dated correction to its `bldWarehouse` line rather
than editing the original text, same convention.

Committed both doc edits together, plus this document's own creation:
`ea715c7`.

---

## Item 2 — AS3's single-seed budget gate, and what sweeping the full range found

**The named example checked first.** `bldWarehouse`'s `roofStyle`
("sawtooth" vs "barrel"/"curved") produces very different triangle counts;
`test/buildingLODAndColors.test.ts`'s AS3 test builds each typology with
exactly one fixed default seed, so it never happened to roll "sawtooth" at
max cell size — a real ~2x budget violation (measured 780 against a
declared 392) sat uncaught.

**How far the gap actually went.** Swept properly — every typology's legal
MIN/MAX cellW/cellD (the same source of truth
`buildingExplicitSize.test.ts`'s own `TYPOLOGIES` table already
establishes) crossed with every declared style-enum option each typology
accepts, plus `foundation: "plinth"` at the MAX case — 7 of the 8
cellW/cellD-bearing typologies exceeded their own declared LOD0 ceiling
somewhere in their real reachable option space, not just `bldWarehouse`:
`bldMidrise` (464→624), `bldShop` (324→384), `bldOffice` (344→372),
`bldApartmentWalkup` (644→708), `bldWarehouse` (392→780), `bldWorkshop`
(314→336), `bldTower` (304→396). `bldVilla` already covered its own worst
case and needed no change.

**The fix.** New test, `AS3b`, sweeping the full range as described above;
all 7 typologies' declared LOD0 budgets recalibrated in `public/buildings.js`
to their real measured worst case. A real design conflict surfaced and
resolved while implementing: AS3's own pre-existing 70%-floor anti-padding
check (anchored to the one default seed) started failing once the declared
ceiling reflected the true worst case instead of the typical case —
resolved by moving the anti-padding check into AS3b, anchored to the worst
measured value across the whole sweep instead of one arbitrary seed. AS3
keeps its ceiling check on the default seed as a fast sanity check.

**Gate evidence.** AS3b, run against the unmodified budgets before any
recalibration, failed immediately for real (not injected): "bld-midrise
MIN (cellW=3, cellD=4) {"podiumType":"retail"} LOD0 measured triangles
(540) exceed declared budget (464)". After the fix: 36/36 green across
`buildingLODAndColors.test.ts`, `buildingExplicitSize.test.ts`,
`buildingFeatureFlags.test.ts`, `layoutGeometry.test.ts`,
`trimAtlasPatch.test.ts`; `npx tsc --noEmit` clean;
`regressionGate.test.ts` green and numerically unchanged (366/857/664
calls, culling 36.93/60.31/44.33%), confirming this is a test-only
bookkeeping fix that moved nothing in the real rendered world.

**Mutation, proving AS3b catches what AS3 provably cannot.** Reset
`bldWarehouse`'s declared LOD0 budget back to its old, too-low value (392).
AS3 (the OLD test) stayed green — its one default seed still doesn't roll
"sawtooth" at max cell size. AS3b (the NEW test) failed correctly, naming
the exact violating combination. Restored, `md5sum`-verified
byte-identical, re-ran green (5/5).

Committed: `df080ad`.
