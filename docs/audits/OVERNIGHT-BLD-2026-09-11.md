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
process), running now in the background. Result recorded below once it
completes — see "Item 0, continued" further down this document.

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

Committed both doc edits together: <!-- commit hash filled in after commit -->
