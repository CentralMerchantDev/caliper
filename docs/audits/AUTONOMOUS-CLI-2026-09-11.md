# AUTONOMOUS RUN — 2026-09-11, b1-land, CLI

Working from `docs/briefs/CLI-2026-09-11-autonomous.md` (committed `335fd82`,
checklist item 0). Autonomous mode, per `rule://stopping-authority`: bounded,
declared stopping point at item 5 committed (brief §11), not "keep going as
long as you can." Written and committed after every item, so a crash costs
one step, not the run.

**Item 0.** Process server confirmed current — `process_get_rule('lane-brief')`
returned the active rule (v1, decided 2026-09-11), not empty, so this session
is working from the current rules. Brief committed: `335fd82`.

---

## Item 1 — land the R3.5 plan correction, push b1-land

**Landed:** `2aea5c6`. Checked the diff against PART 1's own existing B3
line before committing, not taken on faith — the two perf-gate numbers
R3.5 cites (culling 65.8% vs <40%, 7,851 draw calls vs <=900) match B3's
own record exactly. `git log origin/b1-land..HEAD` was empty of any
inconsistency between the edit and PART 1's own record.

**A caveat recorded, not chased, per its own materiality:** those two
numbers are a historical, one-off measurement — neither
`test/cullingRatio.test.ts` nor `test/regressionGate.test.ts` tests the
`board=1` path at all (confirmed by grep), so nothing re-measures them
automatically. Re-ran both standing gates against the board this lane
regenerated earlier tonight (21,007 pieces, was 35,365): both GREEN for
the default board-OFF path (culling 31.90%, well under 40%; 285/484/271
draw calls, well under 900) — consistent with R3.5's own premise, not
contradicting it. Whether the specific 65.8%/7,851 figures still hold
with `board=1` on, against today's differently-shaped board, is
unmeasured. That re-investigation is this run's own §12 item 4 (fallback
list), not item 1's job — named, not silently assumed still accurate.

**Pushed:** `git push origin b1-land` — `edc476d..2aea5c6`. Gate:
`git log origin/b1-land -1` shows `2aea5c6`, matching local HEAD. Recorded
via `process_record_gate` (item `R3.5-plan-correction-and-push`).

---

## Item 2 — decision #10, the mutate.mjs regex bug

**Answered the brief's own key question first, from the artefact, not
assumed:** all 124 entries in `test/.mutate-results.json` carry
`"method": "_mutcheck.mjs ..."` — zero used `scripts/mutate.mjs` itself.
No already-published mutation evidence was ever at risk from this bug.

**Blind review before implementing found the bug was bigger than
recorded:** `mutate.mjs` has the identical flaw in TWO places (the
`rawFailing`/`failing` list used for both the baseline-red check AND
per-mutation CAUGHT/SURVIVED scoring, AND the separate `all` list used
for the stale-`expect`-reference check), and an independent THIRD copy
lives in `scripts/gen-test-count.mjs`, corrupting its own diagnostic
failure text. Also found: two real, currently-existing test titles
(`test/fail-open.test.ts`) already have the exact shape that triggers
this — not currently referenced by any mutation's `expect`, so nothing
has silently mis-scored yet, but the risk was live, not hypothetical.

**Fixed:** new `scripts/extract-test-titles.mjs` — one shared, exported,
tested extraction function, anchored on the TRAILING duration (not the
first digit-parenthetical). All three buggy call sites, plus
`_mutcheck.mjs`'s own already-correct one, now import and call it —
eliminating the duplication that let three copies silently drift apart.

**Test-first:** `test/extractTestTitles.test.ts`, six tests including one
that spawns a REAL, disposable `node --test` run and parses its own real
captured output — not only hand-written fixtures, per this project's own
prior lesson about that exact shortcut.

**Verified, regression-checked:** `npx tsc --noEmit` clean; 21/21 across
the new test plus `expectedRed`/`mutateResume`/`mutateLock`/
`claimSpansAreChecked`; re-ran `_mutcheck.mjs` against
`board-generator.js`'s own six existing mutations post-swap — all six
still CAUGHT, confirming the refactor didn't regress `_mutcheck.mjs`'s
own already-working, already-trusted behavior.

**Mutated, CAUGHT:** `decision-10-extract-test-titles-anchors-on-trailing-duration`
— reverting to the buggy pattern correctly turns 4 of 6 tests red, each
on the truncation defect specifically.

**Landed:** `a69027a`. Decision #10 updated: question 1 (already-taken
results) RESOLVED; question 2 (a lighter-weight evidence path) remains
open, unaffected by this fix.

---

## Item 3 — C1's two never-re-run mutations

`b2-settlement-table-wooded-exclusion-real` and
`b2-mainland-boundary-inland-direction-real` had never been recorded
through any tool — confirmed absent from `test/.mutate-results.json` —
only "verified by hand" per their own prior notes.

**Re-run:** `node scripts/_mutcheck.mjs test/boardGenerator.test.ts
public/board-generator.js test/mutations.json` — baseline GREEN, both
CAUGHT, restored byte-identical.

**Does decision #10's fix change their scoring? No — checked directly,
not assumed.** Neither mutation's own `expect` string contains a
parenthetical-with-a-digit (the shape the bug required), and
`_mutcheck.mjs`'s own extraction was already correct before tonight's
fix — the bug lived only in `mutate.mjs` and `gen-test-count.mjs`.

**Landed:** `da0e139`. Both entries' `note` fields updated to record the
real re-run and this scoring answer, replacing the stale "verified by
hand" framing.

---
