# OVERNIGHT HANDOVER — CLI LANE — 2026-09-09

Written for someone who was asleep. Follows `docs/briefs/OVERNIGHT-CLI-2026-09-09.md`
§11's required contents, in that order.

---

## 0. The escape clause result, first, because it matters most

The brief's own ground-check (§4) was checked against the repository
before any work started, per its own instruction ("if any of this is
wrong, say so and stop"). **All four claims held**, with one small,
worth-naming gap: item 2 states "1,141 tests: 1,084 passing, 41 failing,
1 todo" — that arithmetic sums to 1,126, not 1,141. The real
`node test/run.mjs` summary line is `tests 1141 / pass 1084 / fail 41 /
cancelled 0 / skipped 15 / todo 1` — every individual number the brief
quoted is correct, it simply never mentioned `skipped: 15`, which
accounts for the difference. Not a reason to stop; recorded because the
brief's own template (`docs/LANE-BRIEF-TEMPLATE.md`) asks for exactly
this kind of check. Item 3 (the 41 decompose as the stated table) was
verified test-by-test against the real failing-tests list and matches
**exactly**, including the individual per-file counts. Item 1 (B2.6 at
`27cca18`, gates green) confirmed directly. Item 4 (`test/testCategoryScoped.ts`
untracked) confirmed, and further determined it is a real Workers-AI-
spending script, never auto-run by the harness (queued as Decision #1).

---

## 1. The checklist as it stands, with commit hashes

```
[x] B2.6  Persist the board          gate: boardLoad.test.ts 3/3 green  commit: 27cca18 (pre-session)
[!] B2.7  Bridges and boat routes    PLANNED, BLIND-REVIEWED, CORRECTED -- not implemented.  commit: 95cf588
[!] B2.8  Re-pin the old-world tests CATEGORIZED (38/38) -- not re-pinned, deferred on purpose.  commit: 76e8d61
[ ] B3    The render path            not started
[ ] B4    Kits wire by construction  not started
[ ] B5    The visual pass            not started
[ ] B6    Quarantine the three files not started
[ ] B7    Farmland, range, greenery  not started
```

**Off-checklist, load-bearing work done tonight:**

| Item | Commit | State |
|---|---|---|
| Item Zero — fresh `docs/MODULE-MAP.md` | `adf3362` | Done. 98 modules, 3013 exports, spot-checked against b1-land-only files. |
| B2.7 plan + blind review + correction | `95cf588` | Plan corrected; implementation is next session's first task. |
| DECISIONS-FOR-MARK.md created | `95cf588`, `73f84b6` | 2 decisions queued (below). |
| mutationEvidence pair | `73f84b6` | 98→109 of 119 CAUGHT, 10 honestly blocked and named. |
| A new Candidate-pattern-F entry, `AUDIT-PROTOCOL.md` §7 | `73f84b6` | Recorded per CLAUDE.md's own instruction. |
| B2.8 categorization | `76e8d61` | All 38 confirmed old-world-geometry-dependent; 4 of them freshly investigated by a blind subagent tonight, not just carried over. |
| `docs/OVERNIGHT-RUN.md` checklist ticked with evidence | `ed14abd` | This section's own source. |

---

## 2. What was started and left incomplete, and exactly where

**B2.7 (bridges and boat routes) — planned and corrected, zero code
written.** The plan in `docs/specs/BOARD-REBUILD-PLAN.md` (search for
"B2.7") is BUILD-LOOP Step 2 only. Steps 3-9 (test-first, implement,
verify, mutate, measure, guard-check, commit) have not started. The
corrected plan's own concrete next actions, in order:

1. Write `test/bridgeGenerator.test.ts` (or similar) FIRST, red, against
   a nonexistent generator function — the plan's own "Connectivity" gate,
   restated as a real assertion over `board-generator.js`'s 12 settled
   boundaries.
2. Implement the nearest-gap/MST/redundant-edge algorithm (adapted from
   `scripts/gen-bridges.mjs`, NOT copied verbatim — it reads the OLD
   `plan.landmassPolygons`, the new version must read
   `settlementBoundaries()`), classifying each edge at the REAL 800 m
   buildable ceiling (not the OLD world's 9000 m "plausible" cutoff —
   see the plan's own correction, and why the difference matters: only
   1 of 66 real gaps between the 12 settled boundaries is inside 800 m,
   measured fresh tonight).
3. Write the `bridgeSpan`-socket-to-`board.js`-piece conversion — new
   code, confirmed nothing existing does this (`buildBridgePieces` in
   `road-network.js` converts to a DIFFERENT, non-`board.js` shape).
4. Write the dock-piece + `routeTo`/`routeId` field convention for boat
   routes — also new, kept inside the board per Standing Gate 5.
5. Each gate line in the plan already names its own mutation — use them.

**B2.8 — categorized, not re-pinned, on purpose.** Do not start re-pinning
any of the 38 until B2.7 is green end to end — the plan's own sequencing
rule, restated and still correct: re-pinning now would mean doing it
twice.

**mutationEvidence — 10 of 21 still not run**, for two distinct, fully
documented reasons (§4 below). Neither is "not started"; both are
genuinely blocked pending a decision or a manual timing run.

---

## 3. Every gate, green or red, with its number

| Gate | Number | Source |
|---|---|---|
| `node test/run.mjs`, full suite | 1,141 tests: 1,084 pass / 41 fail / 1 todo / 15 skipped | measured tonight, `node test/run.mjs` (background run, real exit code 1 captured explicitly in the log, not trusted from the pipe wrapper) |
| `npx tsc --noEmit` | clean, exit 0 | measured tonight |
| `test/mutationEvidence.test.ts` | was 2 failing, now 1 failing | measured before and after tonight's regeneration |
| Mutation manifest | was 98/119 CAUGHT (stale, dated 2026-09-06), now 109/119 CAUGHT, 10 honestly NEVER RUN | measured tonight, `test/mutationSummary.generated.json` |
| B2.5's own CPU-time gate | still honestly red (~42.2 s vs. 30,000 ms ceiling), unchanged, correctly left alone | measured tonight, in the same full-suite run |
| Real gap distribution, 12 settled boundaries | 66 pairs measured; 1 ≤ 800 m (the real buildable ceiling); 42 ≤ 9,000 m (the old, wrong-question cutoff) | measured tonight, ad hoc script against `board-generator.js`'s real `settlementBoundaries()` |
| `docs/MODULE-MAP.md` | 98 modules, 3,013 exports (255 product / 37 demo-only / 206 test-only / 2,515 unreachable) | measured tonight, `node scripts/gen-module-map.mjs` |

---

## 4. Every decision queued, in one list

Full detail in `docs/DECISIONS-FOR-MARK.md`. Summary:

1. **`test/testCategoryScoped.ts`** — untracked, spends real Workers AI
   money if run directly, but never auto-run by the harness. Recommend
   moving it to a clearly-labelled experiments path; did nothing in the
   meantime.
2. **The mutation harness cannot verify anything in
   `board-generator.js`/`board.js`/`isolate.js`/`world-render-3d.js`'s
   isolate-scoped half while their test files carry an honestly-red
   gate** (a second instance of Candidate pattern F). Recommend leaving
   both controls exactly as they are until Mark chooses between
   converting B2.5's gate to `{ todo }` (reuses an existing, working
   fix, but changes how the gate reads) or teaching the mutation harness
   an explicit expected-red allowlist (more code, same presentation).
   Left both blocked and named for tonight.

---

## 5. Everything that did not work, and what it suggested

- **`scripts/mutate.mjs --all` (the documented `npm run mutate` command)
  cannot run at all right now** — its own baseline check runs the WHOLE
  suite and refuses on any failure; with 41 known, mostly-expected
  failures present, it would refuse outright. This is why every mutation
  tonight ran through `scripts/_mutcheck.mjs` (the per-file tool) instead
  — consistent with how the existing 98 entries were verified (their own
  `method` fields all say `_mutcheck.mjs`, not `mutate.mjs --all`).
  Suggests: `npm run mutate` is not currently a usable command for anyone
  picking this repo up cold, and nothing tells them so until they try it
  and it refuses.
- **The first B2.7 plan draft had four real defects**, found by a blind
  subagent review that cost about nine minutes and far less than
  building the wrong thing would have: a threshold that answered the
  wrong question (9,000 m vs. the real 800 m buildable ceiling), a false
  "no hits" grep claim, a mischaracterized function (`bridgeChain` does
  not compose real pieces), and an unflagged violation of this project's
  own "no world state outside the board" standing gate. Suggests: the
  blind-review-before-implementing step this brief mandates is
  earning its keep exactly as intended — worth continuing for B3 onward,
  not something to skip once the pattern feels familiar.
- **Two mutation manifest entries had a paraphrased, non-matching
  `expect` field** (`b2-0-worldaliasing-*`), invisible until someone
  actually tried to re-run them — they had been "verified by hand" once
  and never mechanically re-confirmed since. Suggests: a manifest entry
  whose `expect` field was never proven to match a real title by the
  tool itself (only eyeballed by a human) is a real, if narrow, class of
  drift risk worth a standing check (append to `test/mutations.json`'s
  own review checklist: does `expect` literally appear in the test
  file's own title strings, not just describe the property).

---

## 6. Everything that could not be verified

- **B2.5's own gate timing** was not re-measured tonight (the full suite
  run reported ~42.2 s against the 30,000 ms ceiling, consistent with the
  plan's own documented 35-291 s range on this host under memory
  pressure, but no separate paired-comparison run was done to re-confirm
  the ~2.7× sampled-vs-exhaustive ratio).
- **`b2-5-ground-verified-opt-in-is-load-bearing`** and
  **`b2-5-sampled-ground-perimeter-is-load-bearing`** — neither could be
  mechanically or manually re-verified tonight. Both require a real,
  paired `generateBoard()` timing run (40-170+ s each, twice, same
  process) which this session judged not worth the memory risk while
  free memory sat at the 4 GB floor for most of the night (measured:
  2.85-4.3 GB free throughout, fluctuating, per `Get-CimInstance
  Win32_OperatingSystem`).
- **The vitest worker-test suite** (12 tests, per `CLAUDE.md`'s own "how
  to verify") was never run tonight — `npm test`'s own third stage
  (`vitest run`) was skipped in favour of running `node test/run.mjs`
  directly for speed and clearer output capture. Not claimed as green;
  not claimed as red. Genuinely unknown for tonight's session.

---

## 7. What to do next, and why

1. **Implement B2.7** (§2 above has the concrete next actions) — it is
   the one item blocking B2.8's actual re-pinning and, per
   `docs/specs/BOARD-REBUILD-PLAN.md`'s own sequencing, everything after
   B2.8.
2. **Resolve Decision #2** (the mutation-harness deadlock) before
   attempting any more mutation work in `board-generator.js`/`board.js`/
   `isolate.js` — nine mutations are waiting on it, and starting new
   work in those files without resolving it just adds more blocked
   entries to the pile.
3. **Run the two hand-timed mutations** once memory allows a clean,
   paired `generateBoard()` comparison — this closes the mutationEvidence
   gap to 119/119 minus only the 9 still blocked by Decision #2.
4. Consider fixing `npm run mutate`'s own documented-but-unusable state
   (§5 above) — either by noting in its own `--help`/error message that
   `_mutcheck.mjs` is the real per-file tool while the suite carries
   known failures, or by teaching it to accept a partial-file scope the
   way `_mutcheck.mjs` already does.

---

## 8. Anything I think is wrong that nobody asked about

- **`CLAUDE.md`'s own "current work" pointer, `docs/WORLD-BUILD-PLAN.md`,
  is stale for this branch.** It describes an entirely different phase
  of work (quests, regions, the agent's path into the world, Phase M
  "SHIP") that predates the B1/B2 board rebuild and is not what `b1-land`
  is actually building tonight or lately — `docs/specs/BOARD-REBUILD-PLAN.md`
  is the real governing document now, and the brief itself correctly
  pointed there instead. Worth a small `CLAUDE.md` fix (repoint "the
  current work" at the right file) so the next cold read doesn't spend
  time in the wrong document the way a first read of this session
  nearly did.
- **`docs/specs/BOARD-REBUILD-PLAN.md`'s own B2.0 section states "34
  tests" for its old-world-pin catalogue, but its own listed per-file
  breakdown sums to 32**, and the section doesn't reconcile the two
  numbers anywhere. Left as written (per `docs/BUILD-LOOP.md` Step 1 —
  the tree wins, correct forward, don't rewrite history), but flagged in
  both the B2.7 and B2.8 sections added tonight so a future reader isn't
  the one to discover the mismatch cold.

---

## RUN 2 — implementing what RUN 1 only planned

`docs/briefs/RUN2-CLI-2026-09-09.md`, following `docs/OVERNIGHT-RUN.md`'s
new "WHEN YOU MAY STOP" section (a finished plan is not a stopping
condition). Updated as this run progresses, not only at the end.

### B2.7 — implemented, tested, mutated, real

`public/bridge-generator.js` (new) + `test/bridgeGenerator.test.ts` (new,
11 tests, watched red on the missing module first). Adapts
`scripts/gen-bridges.mjs`'s own nearest-gap/MST/redundant-edge algorithm to
the real 12 settled boundaries, classifying each edge at `roadkit.js`'s own
real 800 m buildable ceiling (not the old world's 9,000 m). Bridge pieces
convert `bridgeSpan()`'s real socket geometry into `board.js` pieces; boat
routes are a pair of `"dock"` pieces per boundary, carrying `routeTo`/
`routeId` fields ON the piece itself (inside the board, per Standing
Gate 5), not a separate table.

**A real defect found and fixed during implementation, not by review**:
the plan's own anchor-walk design (a single fixed cross-axis coordinate,
mirroring `gen-bridges.mjs` literally) failed 10 of 11 real edges outright
— measured directly, "no dry anchor on both boundaries" for every boat
route — because a small cottage island's own footprint often never
crosses the fixed line two distant boundaries' midpoint produces. Fixed
by switching to a radial walk (away from the other boundary's own near
point, along the real 2D direction between them, not locked to one axis)
— re-measured: 11/11 edges now realize as real pieces (1 bridge, 10 boat
routes / 20 docks), 0 refused.

**Mutation-tested, 4 controls, all CAUGHT for real** (`test/mutations.json`):
the 800 m classification threshold, the correct-boundary anchor check,
dock id uniqueness, and the bridge-refusal-to-boat fallback. The fallback
mutation SURVIVED on its first attempt — the real archipelago's one
bridge candidate never fails, so the code path was never exercised by any
existing test — fixed by adding a deterministic test that pre-occupies
the real bridge's own exact footprint on a fresh board, forcing a genuine
`board.place()` refusal and confirming the fallback actually fires. The
dock-id mutation was CAUGHT by two DIFFERENT tests than the one first
named in its own `expect` field — `board.js`'s own duplicate-id refusal
silently absorbs the collision before the dedicated "no duplicate ids"
test ever sees one — recorded as its own finding, the same shape as RUN
1's `worldAliasing` `expect`-string lesson.

Guard check: `node test/run.mjs test/worldSeed.test.ts test/board.test.ts
test/boardGenerator.test.ts` — 29 of 30 pass, the one failure is B2.5's
own pre-existing, unrelated CPU-time gate. `npx tsc --noEmit` clean.
**Commit: `501f0a9`.**

### Mid-run: Mark reordered the brief, live

`docs/briefs/RUN2-CLI-2026-09-09.md` was edited mid-session (confirmed via
`git diff` on a routine status check, not announced) to insert B3 (the
render path) as item 0, ahead of everything else: *"Everything below this
line waits until the world can be seen."* Reordered work to match
immediately — B2.7 was already complete and committed, so it was not
re-opened; the mutation-harness/B2.8/published-claim items already
underway were paused, not abandoned, and resumed after B3 reached a real,
committed state.

### B3 — the render path: built, tested, wired live; visual result unverified

`public/board-render.js` (new, commit `6dcfda3`): one mesh per real
`board.js` piece, position/size from the piece's own `cell`/`foot`/
`levels` (`grid.js`'s `atomOrigin`/`heightOf`), coloured by `pieceType`.
Deliberately minimal — a box per piece, matching this run's own "draw
board pieces and nothing else" scope; real facades/kit geometry is B4's
job. `test/boardRender.test.ts` (7 tests): a static import-scan gate
("reads nothing but the board" — no `city-plan.js`/`layout.js`/
`city-render.js`), verified against the REAL committed
`board.generated.json` (35,365 pieces, one mesh each), and position/size
assertions against real `atomOrigin`/`heightOf` output. 2 mutations,
both CAUGHT.

Wired into the live page, commit `bac86b0`: `public/world-render-3d.js`'s
`_buildCityBase` (already async) now also `await fetchBoard(...)`s the
real board and draws it via `buildBoardScene`, ADDITIVELY — `buildWorld()`
(the old plot/road path) still runs too, since replacing it outright
would also mean rebuilding picking, the spatial index, and sun/sky in
the same pass, which this run's own "partial credit" scope did not ask
for tonight. 70 of 70 tests exercising `world-render-3d.js` directly
still pass, including the static reference/declaration-order checks that
would have caught a syntax error in the edit.

**Left honestly unverified: the actual visual result.** Free memory sat
at 1.6–3.1 GB for this entire stretch (measured repeatedly via
`Get-CimInstance Win32_OperatingSystem`), below this project's own 4 GB
floor throughout — `scripts/shoot.mjs` (Playwright + headless Chromium)
was judged too much additional memory pressure to risk on top of that,
so it was not run. What is unit-verified (real positions/sizes from real
data) is not the same claim as "someone looked at a screenshot" —
CLAUDE.md's own distinction, kept rather than blurred. **Next session's
first move should be `node scripts/shoot.mjs` the moment memory allows.**

Also named, not yet done: `public/board.generated.json` (committed,
35,365 pieces) predates B2.7 and has zero bridges/docks yet.
`scripts/gen-board.mjs` was updated to include them (commit `6dcfda3`)
but re-running it (~40–170 s, itself memory-hungry) was deferred for the
same reason as the shoot.mjs render.

### The mutation-harness deadlock — Option 2 (the allowlist), decided and implemented

Per `docs/DECISIONS-FOR-MARK.md` #2, Mark's own instruction in RUN2:
"take the allowlist." `scripts/expected-red.mjs` (new): a named,
documented `Map` of test titles expected to stay red — one entry today,
B2.5's own CPU-time gate title, copied verbatim from
`test/boardGenerator.test.ts` and asserted to match it by a dedicated
test (`test/expectedRed.test.ts`, 5 tests). Wired into both
`scripts/_mutcheck.mjs` and `scripts/mutate.mjs`'s own baseline checks —
one list, read by both, so they cannot drift into two answers to the
same question. 2 mutations, both CAUGHT (one on a corrected `expect`
string — the THIRD time tonight the same "expect must name the test
that actually goes red" lesson recurred; see `AUDIT-PROTOCOL.md` §7).

Confirmed working: `test/boardGenerator.test.ts`'s own baseline, which
`_mutcheck.mjs` refused outright before this fix ("baseline: RED...
refusing to score mutations against a red baseline"), is being re-run
against the allowlist as this section is written (a multi-minute
operation — each of the file's remaining mutations re-runs the whole
file, and that file's own B2.5 case calls the ~40–170 s `generateBoard()`
each time). Result to follow in this same section once it returns.

The `isolate.test.ts`-side 5 mutations are correctly NOT unblocked by
this fix — that file's red is an old-world pin (B2.8's job), not a
permanent gate like B2.5's, and adding it to the allowlist would misuse
a mechanism meant for genuinely-permanent conditions.

### The published claim — fixed

`README.md`'s "98 deliberate defects injected, all 98 caught" was false
(and unchecked by anything — confirmed directly: no test file read
`README.md` at all). `src/generatedClaimChecks.ts` gained
`mutationClaimMismatch` (the same pure-function pattern every other
generated claim on this page already uses), wired into
`test/generatedClaimsAreCurrent.test.ts`'s own unified gate. `README.md`'s
sentence rewritten to name all three real numbers (injected/caught/never
run) instead of one collapsed "all N caught" that cannot express partial
coverage honestly. 1 mutation, CAUGHT. The exact numbers in the sentence
will need one more sync once the in-flight `boardGenerator.test.ts`
mutation run above returns and B2.8 unblocks the `isolate.test.ts`-side
5 — tracked, not forgotten.

**Later the same run**, a second real gap in this same claim was found
and closed: `mutationClaimMismatch`'s own arithmetic had the identical
shape as the "1,141 tests" gap this run's own ground-check found in the
overnight brief — `caught + neverRun` does not have to equal the
manifest total (a SURVIVED or INCONCLUSIVE result is neither), and this
run genuinely produced one (below). Fixed: `README.md`'s sentence and
the check itself now name all four numbers — injected, caught,
never-run, and survived-or-inconclusive — so a fourth state can never
again silently vanish from the claim. 1 more mutation, CAUGHT.

### B2.7's own outstanding mutations — the allowlist confirmed working, plus a real SURVIVED found

The long-running `_mutcheck.mjs test/boardGenerator.test.ts public/board-
generator.js` run (started while the allowlist fix above was being
verified) finished. Its own baseline reported GREEN — confirming the
allowlist genuinely unblocks the deadlock on real, previously-refusing
data, not just in a synthetic test. Of its 3 mutations:

- Two (`b2-settlement-table-wooded-exclusion-real`,
  `b2-mainland-boundary-inland-direction-real`) went INCONCLUSIVE —
  **the fourth occurrence tonight** of the same "manifest `expect` field
  is a paraphrase of the title, not a copy of it" lesson
  (`AUDIT-PROTOCOL.md` §7). Both fixed in `test/mutations.json`.
  **Not yet re-run to confirm CAUGHT** — each run of this file costs
  tens of minutes on this host (the mutated `wooded: settled: true`
  case alone added enough new settlement work that this single run took
  roughly 45 minutes for 3 mutations) — named as real, bounded,
  understood remaining work, not a gap in understanding of what is
  wrong.
- One (`b2-5-sampled-ground-perimeter-is-load-bearing`) genuinely
  **SURVIVED** — confirmed directly, not just inferred from its own
  manifest note, that no `node:test` assertion exists for this control
  at all; it was always a manual, statistical (`verifySampling`)
  comparison. Recorded honestly as SURVIVED in
  `test/mutationSummary.generated.json`, not hidden as NEVER RUN or
  miscounted as CAUGHT.

Current real state: **119 of 129 CAUGHT, 1 SURVIVED, 9 NEVER RUN**.
Still not run at all: `b2-6-no-live-route-generates-the-board` (self-
mutation against the same expensive file), `b2-5-ground-verified-opt-
in-is-load-bearing` (needs the same manual paired-timing procedure as
the SURVIVED one above), and the 5 `isolate.test.ts`-scoped mutations
(correctly blocked on B2.8/B4, not this allowlist).

### B2.8 — a real correction to this run's own sequencing assumption

Before attempting any re-pin, checked the 38's own real import lines
rather than trusting RUN2's own "re-pin now that B2.7 has landed"
instruction. It does not hold for most of them:
`test/instanceGroups.test.ts`, `test/layout.test.ts` and
`test/roadNetwork.test.ts` import `partitionForInstancing`/`planCity`/
`generateWorld`/`buildArterialNetwork` directly from
`public/instance-groups.js`, `public/layout.js`, `public/city-plan.js`
and `public/road-network.js` — none of which has a `board-generator.js`
equivalent yet. Those four files are themselves scheduled for
quarantine in **B6**; their real replacements are **B4's** job, not yet
fully built. B2.7 alone unblocks only the crossing/bridge-shaped
failures, and those are **already superseded** by
`test/bridgeGenerator.test.ts`'s own real coverage. **Re-sequenced,
written into `docs/specs/BOARD-REBUILD-PLAN.md` directly**: the
remaining ~30 of the 38 move to after B4, not directly after B2.7 — the
plan's own phase order already had B4 after B2.8; the DEPENDENCY was
not previously stated in writing. It is now. Commit `ca413a0`.

### B3 finished, B4 started for real — Mark's mid-run reorder, followed

Mid-session, `docs/briefs/RUN2-CLI-2026-09-09.md` was edited live (found
via a routine `git status`/`git diff`, not announced) to insert B3 as
item 0: *"Everything below this line waits until the world can be
seen."* Work reordered immediately.

**B3 — done, commits `6dcfda3` (module) and `bac86b0` (wired live).**
`public/board-render.js`: one mesh per real `board.js` piece, position/
size from the piece's own `cell`/`foot`/`levels`. Wired into
`public/world-render-3d.js`'s `_buildCityBase` (already async — one
more `await fetchBoard()` needed no new architecture). **Additive, not
a replacement, named as a real scoping choice**: `buildWorld()` (the
old plot/road path) still runs too — replacing it outright would also
mean rebuilding picking, the spatial index, and sun/sky in the same
pass. **Visual result left honestly unverified**: free memory sat at
1.6–3.1 GB this entire session (below the 4 GB floor throughout,
repeatedly measured) — `scripts/shoot.mjs` (Playwright + headless
Chromium) was judged too much additional memory risk and was never run.
What is verified is real positions/sizes from real data, unit-tested;
what is not verified is whether anyone has looked at a screenshot.
**This is the single most important thing to do first next session.**

**B4 — started for real, one complete slice landed, commits `c785e29`
(the gate) and `547b721` (the wiring).** RUN2's own B4 gate
("the dead-export check... it must list propModel today") assumed a
control that did not exist on this branch — confirmed directly, neither
`test/deadExports.test.ts` nor its allowlist existed here. Pulled the
generic test file from `codex-lane` (same pattern as Item Zero: the
*logic* travels, the *data* does not) and seeded a fresh
`test/deadExports.allowlist.json` for b1-land's own real classification
(2,762 entries, auto-generated with real per-entry reasons). Confirmed
`propModel` listed as test-only, exactly as the brief claimed. Then
built `scatterTrees()` (`public/board-render.js`) — a real,
deliberately-bounded call to `propModel("tree", ...)`, wired live —
and watched the SAME gate genuinely go red ("propModel -- now product-
reachable... remove this line") before removing the now-stale allowlist
entry. **This is the gate working exactly as designed, watched red for
a real reason.**

**B4's remaining, explicit scope**: roads from `roadkit`, full
building typology/character selection from `buildings.js`'s own 12
typologies, and props from the manifest beyond this one tree call.
Buildings are currently still drawn as plain boxes by `board-render.js`
(B3's own scope, unchanged) — the highest-value next step for B4.

### What did not work, named plainly

- **`npm run mutate` (the documented `--all` command) still cannot run**
  against this branch's own known-red state — every mutation run
  tonight went through the per-file `_mutcheck.mjs` instead, matching
  the existing 98 (now 119) entries' own precedent.
- **The fixed-cross-axis anchor walk in the first B2.7 implementation
  attempt failed 10 of 11 real edges outright** before being replaced
  with a radial walk — a real, measured failure during BUILD-LOOP Step
  4 (implement), not found by review.
- **The `_mutcheck.mjs` run against `test/boardGenerator.test.ts` took
  roughly 45 minutes for 3 mutations** — `generateBoard()`'s own cost
  scales with how much land ends up settled, and the `wooded: settled:
  true` mutation genuinely adds a lot of it. Worth knowing before
  scheduling more work against this specific file.
- **The allowlist seeding script's `via` values leak this host's own
  absolute path** (`C:\Code\sandbox-spike\...`) into a committed file —
  cosmetic, not a correctness gap, but a clone on a different machine
  would seed differently-formatted entries. Named, not fixed, in
  `scripts/lib/module-graph.mjs`'s own `via` reporting.

### What to do next, in order, and why

1. **`node scripts/shoot.mjs`** the moment memory allows — the single
   biggest unverified claim standing.
2. **Regenerate `public/board.generated.json`** (`npm run gen:board`) —
   it still predates B2.7 and has zero bridges/docks. `scripts/gen-
   board.mjs` was already updated to include them.
3. **Re-run the 2 fixed-`expect` mutations** to confirm real CAUGHT
   (`b2-settlement-table-wooded-exclusion-real`,
   `b2-mainland-boundary-inland-direction-real`), plus
   `b2-6-no-live-route-generates-the-board`.
4. **Continue B4**: roads from `roadkit`, buildings from the real 12
   typologies, more of the props manifest.
5. **Then B2.8's remaining ~30**, now that B4 exists to re-pin against.
6. **Then B6** (quarantine `city-plan.js`/`city-render.js`/`layout.js`/
   `board-adapter.js`), **B7**, and the two still-blocked-on-B2.8
   mutation clusters.

Every item above is a decision or a measurement, not a question —
nothing here should cost a stopping point on its own.

---

## RUN 3 — the cross-lane handoff, the visual window, and closing C1 for real

`docs/briefs/RUN3-CLI-2026-09-09.md`. Grounded against RUN 2's own
commits and this document before starting, per the brief's own
instruction.

### Item 0 — the facade handoff (49854d9)

The brief's own "three lines" claim was half right: the one-line diff
(`variantSeed: g.seed` into `city-render.js`'s real `getFacadeMaterial`
call) applied cleanly, but b1-land had NO `FACADE_VARIANTS`/
`pickVariant`/variant-aware `getFacadeMaterial` at all — pulled
`public/facade-textures.js` and `test/facadeVariants.test.ts` verbatim
from codex-lane, then found and fixed two real bugs in the pulled test
itself (an un-removed `{ todo }` gate; counting logic hardcoded to one
template string regardless of seed). Result: 12 distinct facade
materials genuinely reachable from a real placement, confirmed, not 4.

### Item 1 — the visual window, taken early (18007b8)

`scripts/shoot.mjs` renders `public/city.html`, which has its OWN
bootstrap — calls `buildWorld()` directly, never touches
`world-render-3d.js`'s `WorldRenderer`. B3/B4's own work (RUN 2) had
literally never been exercised by this project's own visual-
verification tool. Wired identical `fetchBoard`/`buildBoardScene`/
`scatterTrees` calls into `city.html`; confirmed 35,365 real pieces and
400 real trees drawn, zero errors. The resulting screenshot
(`.shots/downtown-close.png`) showed exactly what an additive,
un-styled overlay looks like: correctly positioned grey/blue board
boxes visibly interpenetrating the old world's own detailed buildings —
reported plainly, a bad render honestly reported being a result.
Drawing all ~35,000 un-instanced pieces also measurably broke two
standing performance gates (culling ratio, draw calls) — fixed by
gating board-drawing behind an explicit `?board=1`, off by default, in
both real bootstraps; reconfirmed both gates green with the flag off.
**The window closes there** — per the brief's own instruction to record
when, so BLD's own code-only work could resume.

### Item 8 — the C5 decision, recorded not resolved (f99d149)

B2.5's CPU-time gate compares an offline build step (B2.6 already moved
generation off the live request path) against a live-request ceiling
that no longer applies to it. The real replacement gate this item asks
for already exists (B2.6's own static `src/` scan). Left the gate
exactly as found — converting it to `{ todo }` would contradict Mark's
own RUN2-recorded reasoning against exactly that; inventing a new
threshold has no source. Decision #3 in `docs/DECISIONS-FOR-MARK.md`.

### Item 6 — C2, the dead-exports allowlist split by mechanism (87ee76b)

`docs/audits/C2-DEAD-EXPORTS-BREAKDOWN.md` + `scripts/analyze-dead-
exports-breakdown.mjs`. Confirmed first that no raw allowlist count
(2,761) appears on any public surface. Found one real, individually
traced example of the classifier's own blind spot (a same-file dispatch
table the import-graph walker cannot see): `public/buildings.js`'s
`bldHighStreetTerrace`/`bldBusinessParkBlock`, sitting in `building()`'s
own typology map, `building()` itself confirmed product-reachable.
Mechanical split: product 0, demo-only 37, test-only 210, unreachable
735, data-reachable CANDIDATE 1,779 (an upper bound, named as such, not
a confirmed count). A real off-by-one in the tool itself
(`allOccurrences - declCount > 1` excluded the very example that
motivated writing it) found and fixed before trusting the output.

### Item 5 — C1 to a real, verified state (a8f5e14)

The brief: the one SURVIVED mutation was confirmed real (no `node:test`
assertion existed for it) and needed a decision — write the missing
control, or record why it cannot be written. Wrote it, and its sibling
(the brief only named one of the two mutations in the same state).
Both `b2-5-ground-verified-opt-in-is-load-bearing` (`public/board.js` —
a heightAt call-counting control, replacing a hand-timed wall-clock
measurement) and `b2-5-sampled-ground-perimeter-is-load-bearing`
(`public/board-generator.js` — a synthetic-heightAt control isolating
the west/east perimeter scan specifically) are now real, automated,
CAUGHT controls. `sampledGroundOk` exported for the second (was
private); a resulting dead-exports check run surfaced 2 MORE pre-
existing allowlist gaps (`facade-textures.js`'s `FACADE_VARIANTS`/
`pickVariant`, missed since Item 0's pull), fixed alongside. A real
incident during this work: a 300 s shell timeout killed a mutation run
mid-mutation and left `board-generator.js` mutated on disk — caught by
re-reading the file before trusting anything else, fixed by hand,
verified byte-identical against the lock's own recorded hash. **The
README's own "1 survived or inconclusive" sentence was NOT updated** —
`scripts/mutate.mjs`'s whole-suite baseline (the only path that
regenerates the evidence README is pinned against) is itself blocked by
Item 2's own finding below, so the sentence now understates real
progress rather than overstates it. Named in Decision #4's addendum,
not silently left.

### Item 2 — B4, a second real prop wired, roads and building typologies scoped but not attempted (a8f5e14)

`scatterStreetLamps()`: a real second manifest id (`lampPost`, the
plain-alias path, not `VARIED`'s seeded-generator path `tree` already
used) along real road pieces, test-first, mutation-tested, gated
identically to Item 1's board layer. **Investigated, and deliberately
did not attempt, the brief's other two B4 asks:**

- Roads from `roadkit` — board-generator.js's roads are a fixed 9 m;
  roadkit's own closest class (LANE) is 10 m, no exact match. A real,
  undecided design question (extend roadkit with a matching class, or
  change generation), not solved unilaterally.
- Building typologies from the kit — `buildings.js`'s own typology
  functions size themselves internally; two of twelve
  (`bldHighStreetTerrace`, `bldBusinessParkBlock`) have hard-coded
  footprints with NO override at all, checked in source. A naive wiring
  would silently overhang the plot for those two — the exact defect
  `layout.js`'s own `typologyFor`/`fits` mechanism exists to prevent. A
  safe port needs an equivalent fits-safe selection, built and tested
  for the new pipeline, which is real, separate, multi-step work.

**A real, pre-existing standing-gate defect found while verifying this
item, unrelated to it:** `test/cullingRatio.test.ts` AND
`test/regressionGate.test.ts` both report the "Downtown skyline" view as
reading near-zero triangles/draw-calls when a real `shoot.mjs` render of
the identical view shows a full, correct city. Confirmed via `git
stash` against the last real commit that this predates everything in
this run. Load-sensitive (worse when run alongside other heavy
processes) — consistent with a `renderer.info` reset race rather than a
one-off fluke, but the exact mechanism was not fully traced. Full
writeup, working theory, and options in `docs/DECISIONS-FOR-MARK.md` #4.
**This is why roads-from-roadkit was not attempted either** — perf-
sensitive board work cannot be reliably verified while the perf gates
themselves are reporting numbers that do not match the pixels.

### Items 3, 4, 7 — correctly still blocked

All three depend on B4 being genuinely green (Item 3's quarantine, Item
4's B2.8 re-pin, Item 7's countryside per the plan's own "no phase
starts before the previous gate is green"). B4 remains real but partial
— attempting any of these now would be building on a foundation this
run already found reasons not to trust yet, not a missed opportunity.

### What to do next, in order, and why

1. **Decide docs/DECISIONS-FOR-MARK.md #4** — is the culling-ratio/
   regressionGate telemetry bug worth root-causing now, or queued? It
   blocks both roads-from-roadkit (perf cannot be verified) and a real
   `mutate.mjs --all` run (README's own claim cannot be regenerated).
2. **Decide the roadkit road-width mismatch** (extend roadkit with a
   9 m class, or change `ROAD_WIDTH`) — the real blocker on B4's
   roads-from-roadkit slice.
3. **Design a fits-safe typology selection for the new pipeline** —
   the real blocker on B4's buildings-from-the-kit slice; `layout.js`'s
   own mechanism is the reference, not the reusable code (it is being
   quarantined).
4. **Once B4 is actually green**, Items 3, 4, 7 unblock in that order.

Every item above is a decision or a measurement, not a question —
nothing here should cost a stopping point on its own.
