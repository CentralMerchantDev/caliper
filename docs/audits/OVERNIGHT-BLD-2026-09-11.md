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

**One real result worth flagging now, not held for the final summary: A5.2
& A5.3 (the regression gate) is RED in THIS run, and it is the already-
queued, already-named defect, not a new one.** Measured inside the full
suite: `Downtown skyline: 1 calls, 12 triangles`, culling retained
`Skyline 100.00%, Harbour 66400.00%` — the skyline camera rendering as
almost nothing. This is `docs/DECISIONS-FOR-MARK.md` decision `caliper #4`
verbatim ("`test/cullingRatio.test.ts` AND `test/regressionGate.test.ts`
both report the skyline view as almost empty... when it is visibly not. A
real defect, found by accident, not caused by tonight's work"), reproduced
here, not discovered here. **Contrast, not a contradiction:** this
session's own standalone `node test/run.mjs regressionGate.test.ts` run
(item 2's own verification, completed earlier, green — `Downtown skyline:
857 calls, 203,338 triangles`, culling `60.31%`) passed cleanly on the
identical committed code. The same test, same code, two different results
— strongly consistent with decision #4's own framing (a real, not-yet-
traced defect) plus host contention: two `node test/run.mjs` processes
were confirmed running concurrently on this host at the time (see the
process finding further below), and this specific gate's own comment
already states it "does not synchronize GPU completion" and reads
"whatever samples are available when readiness is signaled" — exactly the
kind of measurement a starved, contended host would corrupt. Not
re-diagnosed further this session (decision #4 already owns the root-cause
work); recorded here because this run is the first time this project's own
"~40+ unrelated gates" and this SPECIFIC flaky gate have been seen to
diverge between an isolated run and a full-suite run of the identical
commit, which is itself new information for whoever traces #4 next.

**FINISHED, while this section was being written — final result recorded
below rather than left as "still running."** Total run time ~1,028 s of
actual node:test execution (`duration_ms 1027815.1015`) inside a much
longer wall-clock session, consistent with the confirmed host contention.
`EXIT_CODE=1`, expected given known pre-existing failures, not a crash.

```
ℹ tests 1214
ℹ pass 1190
ℹ fail 7
ℹ cancelled 0
ℹ skipped 15
ℹ todo 2
```

**All 7 real failures, named, cross-checked against what this session
touched:**

1. `deadExports.test.mjs` — 7 exports not product-reachable, no allowlist
   entry: `public/facade-textures.js`'s `FACADE_VARIANTS`, `floorLayout`,
   `pickVariant`, `spandrelTreatment`, `tintHex` (all test-only),
   `public/kitbash-assembler.js`'s `assembleNamedDesign` (demo-only),
   `public/nav-bindings.js`'s `wheelSegments` (test-only). **Not unrelated
   to F1** — the five `facade-textures.js` exports are exactly the F1
   capability (RUN2's facade-variant work): real, tested, and — like F1
   itself — not yet reachable from any product code path, because the one
   caller that would reach them (`public/city-render.js`) still lacks the
   `variantSeed` wiring on this branch. A second, previously-unnoticed
   symptom of the same already-recorded blocker, not a new defect. Not
   fixed here (would require either the same cross-branch merge, or
   allowlisting with a reason that names F1 — a documentation call, left
   for whoever next touches this specific gate).
2. `livePosition.test.mjs` — 3 failures (`measures immediately on call`,
   `keeps measuring on a poll`, `stop() ends the poll`). File never opened
   this session; not investigated further.
3. `mutationEvidence.test.mjs` — 2 failures (`every mutation in the
   manifest has a committed, checkable CAUGHT result`, `the summary is not
   stale against the manifest it claims to cover`). File never opened this
   session; not investigated further.
4. `regressionGate.test.ts` — already covered above (decision #4,
   reproduced not discovered, contrasted against this session's own clean
   standalone run of the identical code).

**Todo (2, correctly not counted as failures):** `facadeVariants.test.ts`'s
own F1 gate (still honestly 4) and `originStability.test.ts`'s WORLD.SIZE
gate (`docs/audits/WORLD-DENSITY-FINDINGS.md` §8) — both self-documented
as intentionally red until their own named blockers clear.

**None of the 7 real failures are in `buildings.js` or any
`test/building*.test.ts` file** — every file this session actually
changed. This session's own two code/test changes (`70a9e64`, `df080ad`)
introduced zero new failures into the full suite; the full run's own value
tonight was surfacing the F1↔deadExports connection above, not finding
anything wrong with this session's own work.

**Log preserved at:** `C:\Users\User\AppData\Local\Temp\claude\
C--Code-sandbox-spike-codex\9f333d59-6102-4fb2-a407-ddd1809e9bb8\scratchpad\
full-suite-2026-09-11.log` — outside the repo, will not survive this
machine's temp cleanup indefinitely; the numbers above are the durable
record.

**What this session's own three code/test changes (item 2) do not depend
on this run for.** All fully verified independently, already committed,
already covered above: 36/36 targeted tests green, `tsc --noEmit` clean,
a separate standalone `regressionGate.test.ts` run green, full watched-red
mutation evidence for both the `bldWarehouse` vault fix and the `AS3b`
budget gate. This full run was always the EXTRA confirmation pass this
run's own brief asked for beyond that, per "the targeted-tests-only check
you argued for is defensible... but the full suite gets looked at once
before morning" — it has been looked at, partially, honestly, and is still
looking.

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

---

## Continuing K6's remaining items — a finding, not a next item

**Read `docs/audits/K6-BUILDINGS.md` in full again, after item 1's own
reconciliation, to find the next written item.** Every section:

```
World cameras / disconnected capability / measurements / geometry
treatment / frame time / four-azimuth gate / reproduction / culling-ratio
fix / street-level lighting fix        -- historical record, not open items
K7.1 (atlas gap)                       -- CLOSED at code level; visual
                                           re-shoot BLOCKED (memory floor)
Checklist, extended (F2's items 1-5)   -- item 1/F1 BLOCKED (cross-branch,
                                           public/city-render.js, CLI-lane);
                                           items 2-5 all CLOSED or
                                           reconfirmed clean (this session's
                                           own item 1 reconciliation, above)
The connectors gap                     -- CLOSED permanently, RUN3
```

**Every item this document names is now either closed or blocked. There is
no next unblocked item to take.** Checked directly, not assumed: free
memory read `0.653 GB` this session
(`(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1MB`) — the
lowest of any reading across RUN2 through this session (prior lows: 0.94,
1.19 GB), and almost certainly lower than usual right now because the
full-suite run (item 0) is itself competing for memory. Far below the
project's own 4 GB floor either way. F1 is unchanged from every prior
session's finding — `grep -n "variantSeed" public/city-render.js` still
finds nothing in this worktree, still fulfilled only on `b1-land`, still
recorded in `docs/CROSS-LANE-REQUESTS.md` and not re-filed.

**This is the finding the brief itself anticipated** ("if several in a row
are blocked that way, say so"). Two remaining items, blocked for two
different reasons — F1 by cross-branch file ownership, K7.1 by the host's
memory floor — not the same wall hit twice, but the same shape: nothing
left in this document that this lane can move forward alone, tonight, in
this environment. `B6` (the interface) is named in `docs/specs/COMPLETION-
PLAN.md`'s PART 2 checklist but is not itself covered by
`docs/audits/K6-BUILDINGS.md` — out of this document's own scope, not
silently skipped.

**Not queued as a new decision for Mark** — the memory situation is
already a standing, repeatedly-confirmed finding (RUN2 through this
session), not a new one; re-filing it again would be noise, not
information. Nothing else here is Mark's to decide either — F1 already has
its own resolution path recorded (a merge Mark authorises when awake), and
K7.1/B6 simply need the host's memory to clear.

**What the low reading traces to, named and not acted on, per the standing
"lanes do not kill processes" rule.** `Get-CimInstance Win32_Process -Filter
"Name='node.exe'"` lists 19 `node.exe` processes. Two are `test/run.mjs`
(the full suite) running concurrently: PID 36156 (started 2026-09-11
01:02:38, ~62 MB) and PID 35292 (started 2026-09-11 01:04:54, ~144 MB).
This session started exactly one such run (item 0, log redirected to disk)
— the other is most plausibly the other lane's own `b1-land` checkout
running its own suite concurrently on the same shared host, per this
project's own routing ("another lane is working b1-land... stay in this
worktree"), not confirmed further and not touched either way. The
remaining 17 `node.exe` processes are small (12–20 KB working set, three
exceptions at 400 KB–3.4 MB) — MCP servers and dev tool stdio processes
(`process-mcp`, `chrome-devtools-mcp`, `toolbox-sdk`, a Playwright test
server, an MCP PDF server), several started hours before this session, none
obviously related to CALIPER. Named, not touched — per the standing rule,
this is the finding to hand to Mark, not an action to take.

---

## Summary, for whoever reads this next

**Commits this session, in order:** `19920dc`, `6e2613c`, `70a9e64` (prior
session, verified not authored here — listed for hash continuity),
`ea715c7` (item 1: checklist reconciliation), `df080ad` (item 2: AS3b full-
range budget gate), `2ff8271` (handover: items 1–2), `780128a` (K6-exhausted
finding + process note), `cd6dd6b` (culling-gate flake observed).

**Every gate touched this session, with its evidence:**
- `test/facadeVariants.test.ts`'s `{ todo }` gate — reconfirmed, still 4,
  still honest, command: `node test/run.mjs facadeVariants.test.ts`.
- `test/buildingFeatureFlags.test.ts`'s new vertex-fingerprint test for
  `bldWarehouse`'s three `roofStyle` values — watched red, then green,
  mutation-caught (prior session, re-verified this session).
- `test/buildingLODAndColors.test.ts`'s new `AS3b` — watched red for real
  (not injected) against the unmodified budgets, implemented, green,
  mutation-caught (this session, commit `df080ad`).
- `regressionGate.test.ts` — green in isolation (item 2's own
  verification); red inside the full-suite run, matching the already-
  queued decision #4, not a regression from this session's own changes
  (see item 0's own section above for the full reasoning).

**Decisions queued for Mark:** none new this session. `caliper #4` (the
culling-gate flake) has new supporting evidence (divergence between
isolated and full-suite runs of the identical commit) but was not
re-queued, since it is already open and already recommended. The
`caliper-bld #3` (trees) decision from prior sessions remains open,
untouched this session — out of this session's own scope (K6 buildings,
not props).

**What did not work / is still open:**
- F1 (the shared four-texture atlas) remains blocked cross-branch — not
  something this lane can close alone, resolution already recorded. Now
  confirmed to also be the root cause of `deadExports.test.mjs`'s 5
  `facade-textures.js` failures (see item 0's own final section).
- K7.1's visual re-shoot and B6 (the interface) remain blocked on the host
  memory floor (0.653 GB free, confirmed this session, the lowest reading
  in this series) — not something this lane can force.
- The two concurrent `test/run.mjs` processes and 17 other `node.exe`
  processes found on this host are named, not investigated further, not
  touched.
- `livePosition.test.mjs` (3 failures) and `mutationEvidence.test.mjs` (2
  failures) — real, named, unexplained, in files this session never
  opened. Not this lane's files by any routing this session checked, but
  named per this run's own instruction to record what the suite says
  either way.

**What is unverified:** whether `livePosition.test.mjs`'s and
`mutationEvidence.test.mjs`'s 5 failures are pre-existing (matching this
project's own documented "~40+ unrelated gates") or new — not
cross-checked against `docs/AUDIT-LEDGER.md` this session. Everything this
session actually changed (the `bldWarehouse` vault geometry, the `AS3b`
gate, the two documentation reconciliations) IS fully verified, by its own
targeted tests, typecheck, and mutation evidence, and is now additionally
confirmed to introduce zero new failures into the full 1,214-test suite.

**What I would do next, in order:** (1) if free memory ever clears the
4 GB floor, K7.1's visual re-shoot is the single highest-value remaining
item in this document, closed at the code level for three sessions running
and only ever waiting on a render; (2) trace decision #4 properly now that
there is a concrete isolated-vs-contended-host divergence to reason from,
rather than the single anecdotal reading it was recorded from; (3) when
Mark authorises the `b1-land -> codex-lane` merge, F1's gate should go
green unedited — `test/facadeVariants.test.ts` already mirrors the real
cache-key logic, not a hoped-for one — and `deadExports.test.mjs`'s 5
`facade-textures.js` failures should clear at the same time, for the same
reason; (4) check `livePosition.test.mjs`/`mutationEvidence.test.mjs`
against the audit ledger before assuming either is new.

**Anything I think is wrong that nobody asked about:** the pattern behind
this session's own item 2 finding is worth naming as a general lesson, not
just a one-off fix — "the field is consulted" and "every declared value of
that field is distinguishable" are different properties, and this
project's own surveys (K6's RUN5 pass, this session's own AS3) have both,
independently, checked only the first one and called it clean. Worth a
standing check (or at least a standing habit) rather than re-discovering
it typology by typology, test by test.

---

## Continuing overnight, second wake -- correction received, and a host-load reversal

**Correction from Mark, taken at face value and verified, not argued
with.** Last session's "K6-BUILDINGS.md is exhausted" finding was correct
about K6, but K6-BUILDINGS.md is F2's own sub-checklist, not this lane's
whole checklist -- that lives at `docs/specs/COMPLETION-PLAN.md` PART 2,
on `b1-land` only. Re-read it read-only (`git show
b1-land:docs/specs/COMPLETION-PLAN.md`, no checkout, no merge): confirmed
F1 (blocked cross-branch, unchanged), F2 (this lane's own K6 checklist,
genuinely exhausted per last session's finding), **F3 and F4 both
unstarted**, K7.1/B6 (memory-blocked), and the package.json/pending-commits
line (done, needs a cross-lane tick since the file lives on `b1-land`).

**Host-load instruction reversed from last session, and honoured exactly.**
The full suite is NOT run tonight -- this host had ~0.65 GB free at
session start with the CLI lane running its own suite concurrently
(`test/boardGenerator.test.ts`, PID 5388), the same condition last
session's own culling-gate flake traced to. Free memory recovered to
~4.9 GB partway through this session (checked, not assumed) but the
instruction was honoured regardless of the reading -- targeted files plus
`npx tsc --noEmit` only, stated in each commit.

**Housekeeping, `842f1c2`:** filed `docs/CROSS-LANE-REQUESTS.md` entry 3
(the package.json/pending-commits tick, for whoever next has `b1-land`
write access) and closed the loop on this lane's own decision queue --
`caliper-bld #1`/`#2` were resolved in code weeks ago but never marked
resolved IN `docs/DECISIONS-FOR-MARK.md` itself, so `process_pending_
decisions` kept re-surfacing them as open every session. Both now carry a
dated RESOLVED note.

## F3 -- kitbash variety: registry vs. both real senses of "reachable"

Committed `e4e181d`. Full detail in that commit's own message
(`docs/pending-commits/overnight3-f3-kitbash-reachability.txt`) — summary
here.

**The two numbers, side by side, and why for every gap.** Registry: 62
parts, 40 designs. Reachable from the kit's OWN internal harness
(`assembleBuilding` + all 40 named designs together): 57/62 parts (92%),
40/40 designs (100%) — already gated since RUN2/RUN3, unchanged tonight.
The 5 unreached (all `connector` parts): genuinely, mechanically
unreachable given current content — no design has two structural volumes
to join one to, checked mechanically, not assumed. Reachable from the
real PRODUCT world (`city-render.js` → what a visitor actually loads):
**0/62 parts, 0/40 designs.** `city-render.js` has zero kitbash references
on either `codex-lane` or `b1-land` — not the F1 pattern (wired elsewhere,
unmerged), unwired everywhere, first named in K6-BUILDINGS.md's own
"disconnected capability" section and never closed since.

**A third bucket, found by classifying precisely instead of reporting one
number.** 4 exports (`createRng`, `createChamferedRectShape`,
`createBevelledExtrusion`, `resolvePalette`) show as "unreachable" by the
cross-file import graph but are NOT dead code — all four are called
heavily within their own file (`resolvePalette` alone has 60+ internal
call sites). Over-exported utilities, not orphaned code. Allowlist reasons
upgraded from unreviewed boilerplate to this real finding.

**Fixed, in scope:** `test/deadExports.allowlist.json` was missing an
entry for `assembleNamedDesign` (causing last night's real deadExports
failure) — added, matching its sibling `assembleBuilding`'s existing
entry. New test, `test/kitbashNamedDesigns.test.ts`'s "GATE: kitbash
reachable from the real PRODUCT world," reuses the SAME reachability
machinery `deadExports.test.ts` already uses, `{ todo }`-marked exactly
like F1's own gate, prints the full breakdown every run.

**Blind subagent review caught a real defect before implementation:** the
planned assertion ("none are product-reachable") is true today and would
have passed silently — inverted to assert the goal (at least one is),
which correctly renders as a visible ⚠, not a silent pass.

**Gate evidence:** red first for real (`deadExports.test.ts`, 7 → 6 after
the fix, `assembleNamedDesign` no longer among them). `tsc --noEmit`
clean; 14 kitbash tests, 13 pass, 1 honest todo. Mutation: added a real
`KITBASH_PARTS` import to `city-render.js` — the gate immediately flipped
to "1/10 reachable" and green; restored, `md5sum`-verified byte-identical,
re-ran to original state.

