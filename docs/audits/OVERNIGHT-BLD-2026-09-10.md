# Overnight handover — BLD lane — 2026-09-10

Written for someone away from the keyboard. Continues
`docs/audits/RUN4-BLD-2026-09-09.md` — its grounding, routing, and decision
queue still apply and are not repeated here. Branch `codex-lane`, working
tree `C:\Code\sandbox-spike-codex`. No merge, deploy, PR, or touch to `main`.

---

## Correction to this run's own brief, before anything else

Two load-bearing errors in the brief, checked directly rather than assumed,
per this project's own "if the brief is wrong, say so" instruction.

1. **`docs/specs/COMPLETION-PLAN.md` does not exist anywhere in this
   repository.** `Glob "docs/specs/COMPLETION-PLAN.md"` and
   `Glob "**/*COMPLETION-PLAN*"` both found nothing. The brief's item labels
   (F1–F4, K7.1, B6) do exist, but in a different place: the RUN2/RUN3/RUN4
   handover-and-brief series under `docs/audits/` and `docs/briefs/`, and
   `docs/audits/K6-BUILDINGS.md`'s own checklist. Used those as the real
   ledger instead.
2. **The `process_at`, `process_record_gate`, and `process_quarantine`
   tools the brief calls for do not exist in this session's toolset.**
   Only four `mcp__process__*` tools were actually available
   (`process_get_rule`, `process_list_rules`, `process_pending_decisions`,
   `process_cross_vendor_review`), and `process_list_rules` returned "the
   rule store is empty" — `process_get_rule("build-loop")` confirmed the
   same (no rule with that id, no rules at all). Fell back to the on-disk
   equivalents this project already has and names as canonical:
   `docs/BUILD-LOOP.md` for the step procedure, `docs/OVERNIGHT-RUN.md` for
   stopping authority and the decision queue, and this document plus commit
   messages (`git commit -F`) for gate/quarantine records in place of the
   missing tools. `process_pending_decisions` was still called, per the
   brief's own instruction to check it before treating anything as
   blocked — it returned 5 open decisions, none touching this lane's F/K/B
   items (3 are land-lane roads/typologies/egress questions, 2 are
   CALIPER-BLD questions already answered in `docs/audits/OVERNIGHT-BLD-
   2026-09-09.md` — the `package.json` `allowScripts` block and the
   `docs/pending-commits/*.txt` files — both already investigated and
   found to be pre-existing, non-blocking, and outside this lane's own
   commits).

Neither error changed what could actually be built tonight — the real
ledger was findable by reading the files CLAUDE.md itself already points
at — so this is recorded as a finding, not a stop.

---

## Checklist, as it stands

```
[!] F1  Facade texture variety -- reconfirmed BLOCKED, cross-lane, 4th
        consecutive run finding no `variantSeed` in this worktree's
        public/city-render.js. Same root cause RUN4 already diagnosed:
        landed on b1-land, structurally invisible from codex-lane until
        merge. Not re-filed; docs/CROSS-LANE-REQUESTS.md already covers it.
[x] F2  The rest of the K6 checklist, in K6's own priority order -- terrace/
        townhouse/villa/midrise items reconfirmed CLOSED/SUPERSEDED (villa()
        read to its end for the first time this run: no further computed-
        but-ungated defect found). bldBusinessParkBlock's zero-variation gap
        (the one remaining named, open leaf) closed for real.
                                                    commit: f4b4076
[x] F2b Survey completed for the 4 typologies the checklist never
        individually checked (tower, warehouse, high-street terrace,
        apartment walk-up). Tower and warehouse clean. Apartment walk-up's
        hasGarden was the same computed-but-unconsulted defect a second
        time -- closed.                                  commit: c3bd9de
[x] F2c High-street terrace's zero-structural-variation gap (1.86% of
        placements, the highest-value item left in F2) -- closed with a
        real roofStyle option (mansard/parapet), not just named.
                                                    commit: (this commit)
[x] F3  Kitbash variety -- reconfirmed CLOSED, unchanged. 8/8 real tests
        green (kitbashNamedDesigns/RecipeMap/Parts/Retrieval), 3 correctly
        skipped (zero API spend).                        (a check)
[x] F4  Comment-strip sweep as a category -- reconfirmed CLOSED, unchanged
        (docs/LESSONS.md's own STATUS CLOSED entry). 9/9 real tests green
        (stripSourceComments + pickSelection).            (a check)
[!] K7.1 Atlas gap -- still closed at the code level (prior runs), visual
        re-shoot still BLOCKED. Memory read 0.94 and 1.19 GB free this run,
        both far below the 4 GB floor.
[!] B6  The interface (U2 mobile grounding, wedge-wheel screenshot, U1
        re-watch) -- BLOCKED, same memory reason as K7.1.
```

---

## F1 — reconfirmed, unchanged

`grep -n "variantSeed" public/city-render.js` — 0 matches, same as RUN2,
RUN3, and RUN4. `docs/CROSS-LANE-REQUESTS.md`'s existing entry already
diagnoses this correctly (fulfilled on `b1-land`, structurally invisible
from a per-branch checkout until merge) — this run adds nothing new to
that finding except a fourth confirmation that it has not changed. Not
re-filed, per that document's own instruction. `test/facadeVariants.test.ts`'s
`{ todo }` gate stays marked, honestly — the real count in this worktree is
still 4.

## F2 — the real remaining work, closed

Read `bldVilla` in full for the first time (previous passes had only read
as far as its roof-form switch, per K6-BUILDINGS.md's own note). No
further computed-but-ungated defect found — every flag in the function
(`corner`, `foundation`, `roofStyle`, `hasPorch`, `garageType`, `hasBay`,
`hasDormers`, `hasChimney`) already branches real geometry, matching
RUN2's fix. This closes that checklist note as reconfirmed-clean, not
newly-fixed.

Re-read `bldTownhouse` in full: the checklist's item 3 ("no door/path
distinct from the garage box") does not apply to the real function — it
already has a stoop, railings, door, and pediment at LOD0 (lines
1661–1677), and K6-BUILDINGS.md's own later correction already flagged
that item 3's framing described the *dead*, superseded `townhouse()`, not
this one. No action needed; confirmed rather than re-fixed.

The one remaining real, open, named gap: `bldBusinessParkBlock` (14 of
17,108 placements, 0.08% share) had zero seed-derived variation of any
kind — `wallCol`/`roofCol` were hardcoded constants, `seed` was unused in
the function body, and it accepted no `options` at all, unlike every
sibling typology. Fixed: seed-derived wall/roof colour selection (matching
this file's own established idiom) and a real `hasSolarArray` flag gating
the existing roof solar-panel box. Full detail, the red-first gate, three
independent watched-red mutations, and the measured triangle/colour counts
are in `docs/pending-commits/run5-f2-business-park-variation.txt`
(committed with this handover). Scope stated honestly there too: this is
colour plus one ~12-tri box, not parity with the deeper structural fixes
already done for the four dominant typologies.

**Before implementing, a fresh subagent with no other context reviewed the
plan** (per this run's brief). It confirmed the plan was grounded in the
real code and found one real defect before any code was written: the
planned colour-variation test used OR across wall/roof, which would not
catch a single half-wired colour channel — exactly this project's own
named failure class ("computed but never consulted"). Fixed to two
independent AND-based assertions, then verified by mutating each colour
channel separately and confirming each mutation is caught by name, not by
accident.

## F2b — the checklist's own survey, actually finished

The K6-BUILDINGS.md checklist's RUN2 survey ("does the computed-but-
ungated defect recur in the remaining 8 typologies?") only ever checked
`bldShop` and `bldOffice` in full, plus `bldWorkshop` (found and fixed in
RUN3) and `bldBusinessParkBlock` (found and fixed above, this run) —
`bldTower`, `bldWarehouse`, `bldHighStreetTerrace`, and
`bldApartmentWalkup` were never individually read for this defect. Read
all four in full this run:

- `bldTower`: `params: { cellW, cellD, storeys, profile }` — `profile`'s
  five values (stepped/tapered/slab/crown/straight) all branch genuinely
  different shaft or crown geometry. Clean.
- `bldWarehouse`: `params: { cellW, cellD, roofStyle }` — `roofStyle`'s
  sawtooth/default branch is real; `cellW`/`cellD` set the footprint. An
  `r4` is rolled and never used, but it never reaches `params`, so it is
  dead code, not this defect (nothing claims it varies anything). Clean;
  not touched.
- `bldHighStreetTerrace`: no `params` field at all, no optional flags of
  any kind — only wall/roof colour varies by seed. Not this defect (there
  is no computed-but-ignored value to find), but a real, separate gap:
  1.86% of placements (318 buildings), the highest share of anything below
  the four dominant typologies, with zero structural variation. Initially
  named rather than fixed in this section — closed properly later the same
  run once F2b's other items were done; see F2c below.
- `bldApartmentWalkup`: `hasGarden = r6 > 0.3` computed and put in
  `params`, never referenced by any of the three LOD builders. The same
  defect, a second real instance this run. Fixed: options-overridable,
  gates a real ground-level garden bed + hedge at the building's rear
  (not the front, which a blind plan review correctly flagged as already
  congested with the stair core for ~70% of seeds). Full detail, the
  red-first gate, the watched-red mutation, and measured triangle counts
  are in `docs/pending-commits/run5-f2-apartment-walkup-garden.txt`.

## F2c — high-street terrace's roofStyle, closed properly

Rather than leave the gap above as a named-only finding, closed it the
same run: a real, options-overridable `roofStyle` (mansard/parapet),
reusing the exact flat-parapet+coping idiom already proven elsewhere in
this file. A second blind plan review (fresh subagent) caught four real
gaps before any code was written — a test-values ordering bug that would
have failed the new test immediately rather than only under mutation
(parapet has fewer triangles than mansard, not more, so the CASES
`values` tuple had to be `["parapet", "mansard"]`), a missing
`roofStyle`-dependent `roofH`/`totalH` (every sibling already varies
these; the first draft of this plan did not), the missing `params` field,
and a comment in `test/buildingExplicitSize.test.ts` that this change
makes false ("one option set is genuinely all there is to cover"). All
four folded in before writing code. Full detail, the red-first gate, the
watched-red mutation, and measured triangle/height counts are in
`docs/pending-commits/run5-f2-highstreet-terrace-roofstyle.txt`. Stated
plainly there too: this changes the roof shape of ~40% of the 318
*existing* placements, not only new ones, since the seed roll already
existed and was previously discarded — the intended effect, not a side
effect.

## F3 / F4 — reconfirmed, unchanged

Targeted test runs only (see "What did not work," below, for why not the
full suite): `node test/run.mjs kitbashNamedDesigns.test.ts
kitbashRecipeMap.test.ts kitbashParts.test.ts kitbashRetrieval.test.ts
stripSourceComments.test.ts pickSelection.test.ts` — 17 real passes, 0
failures, 3 correctly skipped (`CALIPER_ALLOW_SPEND` unset, as required).
Both items were already closed by prior runs (F3: RUN2/RUN3's connector
work; F4: `docs/LESSONS.md`'s own dated STATUS CLOSED entry) — this run
adds a fresh green confirmation, not new work.

## K7.1 / B6 — still blocked, memory read twice

`(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1MB` — 0.94
GB free at session start, 1.19 GB free later in the session, both far
below this project's own 4 GB floor and below every reading in RUN2–RUN4.
No browser-dependent work was attempted, per the standing rule that a
single reading near the floor is not treated as clearing it, let alone one
this far below it. No process was inspected or killed this run — the
memory-accumulation finding from RUN4's continuation session already
covers that ground and nothing here adds to it.

---

## What did not work

The full 1087-test suite (`node test/run.mjs`, per BUILD-LOOP's own STEP 0
orientation command) was started at session start and then deliberately
stopped before completion: with free memory at 0.94 GB, running the full
suite matched this project's own documented OOM risk ("a full 1087-test
run... documented elsewhere as OOM-risking at module scope," recorded
after the 2.47–3.99 GB range in `docs/audits/OVERNIGHT-BLD-2026-09-09.md`)
at a memory level meaningfully below every prior reading that already
triggered that caution. Targeted test files (the ones this run's actual
changes and reconfirmations touch) were run instead, matching the pattern
every prior run in this lane already established for the same reason.

A second, smaller instance of the same risk, worth naming precisely: a
final broader confirmation pass (`buildingFeatureFlags`, `buildingExplicitSize`,
`buildingLODAndColors`, `layoutGeometry`, plus `cityWorld.test.ts` and
`regressionGate.test.ts` — the two files that build the real 26 km,
17,108-building world) was started after all three fixes were committed,
purely as extra confirmation beyond what each fix's own targeted run
already covered. Free memory, checked mid-run, had dropped from 1.80 GB to
0.76 GB while it was still executing — stopped immediately rather than let
it finish, per the same standing rule. Not a regression signal about the
three commits: each was already verified green against the specific files
its own change touches (including `layoutGeometry.test.ts`, which does
exercise the real placement pipeline), before this extra pass was
attempted. Named so the next reader does not read the missing
`cityWorld`/`regressionGate` confirmation as skipped carelessly.

---

## Decisions queued for Mark

None new this run. The two open CALIPER-BLD decisions in the process
queue (`package.json`'s `allowScripts` block; the untracked
`docs/pending-commits/*.txt` files) were both already investigated and
recorded as non-blocking in `docs/audits/OVERNIGHT-BLD-2026-09-09.md` —
re-confirmed present and unchanged, not re-investigated from scratch.

---

## What is honestly still open

F1, K7.1's visual re-shoot, and B6 (U2, wedge-wheel, U1) — all blocked for
reasons outside this lane's control (a cross-branch merge; the host's
memory floor), each reconfirmed rather than newly discovered. No further
code-only work is queued that has not already been done, reconfirmed, or
correctly, honestly deferred. Business park's fix was deliberately kept
small (per its own 0.08% share) rather than padded into a bigger change to
have more to report.

**What to do next, and why.** Check free memory first, the same way every
run in this series has. The moment it clears: K7.1's visual re-shoot first
(closed at the code level for two runs now, purely waiting on a render),
then B6's U2 mobile grounding (unattempted across four runs, the item Mark
raises most often). If F1 has landed by then (check `grep -n "variantSeed"
public/city-render.js` fresh, since a merge is the only thing that changes
that answer), item 2's own facade street-level check — does 16 variants
actually read as variety at real camera distance — is worth doing before
any further facade-texture work of any kind.

If the floor stays down and more code-only work is wanted: every named
leaf item in F2's checklist is now closed or reconfirmed clean (F2b/F2c
above). What remains in F2 is item 1 itself — the shared four-texture
atlas — which is F1's own blocker and cannot be reached from this lane
without the cross-branch merge. Next code-only work would need a fresh
pass looking beyond K6-BUILDINGS.md's existing checklist (F3/F4 are
closed; K7.1/B6 need a browser) rather than more items within it.
