# PHASE 1 REBUILD LANE — HANDOVER, 2026-09-13

Branch `rebuild`, cut from `b1-land` at `46f0ec9`. Stopping point reached per
`docs/briefs/PHASE-1-rebuild.md` §11: **item 5 is committed.** Item 6 not
attempted — the depth item 1's own correction and item 3's research both
required left no budget for it this run, and it is explicitly optional
("only if budget remains").

## What is done, item by item

**Item 0 — branch and brief.** `rebuild` cut from `b1-land`; `b1-land`
confirmed unmoved and its tracked tree clean (it is 24 commits ahead of
origin from prior autonomous runs — normal, not a defect, noted rather than
treated as a blocker). `docs/briefs/PHASE-1-rebuild.md` and
`docs/specs/REBUILD-PLAN.md` committed together, since the brief's own first
line points at the plan and the plan was itself sitting uncommitted.

**Item 1 — the site inventory and quarantine.** Came back far narrower than
the brief's own four-file candidate list assumed. Full story in
`docs/specs/PHASE1-SITE-INVENTORY.md` and decision queue #11
(`docs/DECISIONS-FOR-MARK.md`): a blind plan review found `city-render.js`
(and `layout.js`/`instance-groups.js`/`layout-fits.js`, which only it
depends on) is reached from the LIVE `public/index.html` via a dynamic
`import()` this project's own module-graph tool cannot see — not a dead demo
path. `city-plan.js` is separately load-bearing for the same live page.
**Only `public/road-network.js`** — checked for both static and dynamic
importers — was safe to quarantine. Done, with a corrected `.gitignore` (the
quarantine ledger was silently unignored-but-invisible before this run, the
identical bug another lane had already found and fixed independently on a
different branch) and a lesson opened (`dynamic-import-blind-spot`,
`docs/LESSONS-LEDGER.jsonl`) naming the tool gap itself as a standing risk
beyond this one instance.

**Item 2 — retire the tests that only describe the dead world.** Scoped down
to match item 1's real result: the four tests whose entire subject was
`road-network.js` (`roadNetwork.test.ts`, `bridgePieces.test.ts`,
`collectorLocalNetwork.test.ts`, `connectivityBridges.test.ts`), each named
individually with which of its own test cases it covers and why, in
`_TO-DELETE/LEDGER.jsonl`. The ~33 remaining old-world-adjacent tests were
**not** touched — they describe code that is still live, and retiring them
now would be retiring coverage, not clearing dead weight.

**Item 3 — verify the three suspect numbers.** All three checked against the
primary source directly (`pdftotext -layout`, since WebFetch's own HTML
converter could not parse any of the three PDFs). All three came back
**wrong in the plan as written**, not merely unsourced:
- Boeing 2019 Table 1 — the plan's six-metric table was the Asia/Oceania
  region's 20 rows read as the paper's 100-city global range. Corrected
  ranges and the grid-vs-organic bands (Table 2's own regional means, plus
  the paper's named exemplars for the two metrics Table 2 does not
  aggregate) are in `REBUILD-PLAN.md` L1/T4.
- Marshall et al. 2016 — Manhattan's existing block is **256 × 60 m**, not
  80 × 274. The review's suspicion was right. G1's 274→272 rounding note is
  removed as unnecessary (256 is already exactly 64 modules), not just
  re-confirmed.
- Portland Title 33 — the old URL 404s, confirmed directly. The current code
  (Title 33.610 Table 610-2, 6/30/22, post-Residential-Infill) gives five
  real per-zone figures in feet, not one blanket metre figure; R5 (36 ft ×
  50 ft) is used as this document's anchor, with the other four shown
  alongside so nothing is hidden.

**Item 4 — split VISION.md out.** Done per CORRECTIONS C-11: multi-city
unlocking/city-health gating and the token-economy/uploads/charitable-giving
material moved verbatim to `docs/specs/VISION.md`, one-line pointers left in
`REBUILD-PLAN.md`, C-11 itself marked DONE.

**Item 5 — the catalogue as data, plus its validator.** `data/catalogue.json`
(50 entries: 21 buildings, one per C1.1 "carries" use; 29 road tiles, matching
C1.3's own "roughly 30" estimate). `public/catalogue-validator.js`, six
rules, each proven load-bearing by disabling it and watching its own tests
go red before restoring it — done by hand for all six, not merely written
and trusted. `test/catalogueValidator.test.ts`, 25 tests, all green.
`test/deadExports.allowlist.json` updated with real reasons for the five
new, not-yet-product-wired exports.

## What is still open

- **Item 6** (visual references) — not started, optional.
- **Decision queue #11** — whether a standalone audit of the dynamic-import
  blind spot happens as a Phase 1 addendum or waits for Phase 2. Recorded,
  not blocking.
- **REBUILD-PLAN 1.6** ("close the decision queue", decisions #3–#9) is named
  in `REBUILD-PLAN.md`'s own Phase 1 section but was never in this lane
  brief's own checklist (§10, items 0–6) — not attempted, per
  `rule://queue-exhaustion`'s "never invent work." Flagged here so a future
  session does not assume it was covered.
- **Two long-running background processes from this session may still be
  alive** and were not killed, per the brief's own GUARDS ("never kill a
  process; record PIDs"): a full `npm test` invocation (task id
  `bxglni45j` in this session's transcript) that never produced output in
  over an hour and is presumed hung on something outside this lane's edits
  (possibly host contention, a documented recurring issue in this project's
  own history) — treat any node process still running under this working
  directory with caution before starting a new full-suite run; and a second,
  shorter `gen-test-count.mjs` re-run (`b0pw7q1pg`) kicked off near this
  handover's own writing, likely still finishing normally.
- **A pre-existing, unrelated 43-test red count** (confirmed via
  `node scripts/gen-test-count.mjs`, `test/testCount.generated.json`) is
  present on this branch from before this session — none of it is new, none
  of it is this lane's four retired files, and it is already the subject of
  standing decisions (#3, #4, #7, #9, #10) this lane's own checklist did not
  ask it to resolve.

## Commits this run, in order

`6fb8221` item 0 · `c0aa30f` + `b914423` + `57897e6` item 1 · `acfefda`
item 2 · `529ccb4` item 3 · `d9a85e9` item 4 · `3c0dbbf` item 5.

## Verification commands, for the next session to re-run rather than trust

```
npm run typecheck
node test/run.mjs catalogueValidator.test.ts deadExports.test.ts terrainLandmassOwnership.test.ts
node scripts/gen-test-count.mjs
```
