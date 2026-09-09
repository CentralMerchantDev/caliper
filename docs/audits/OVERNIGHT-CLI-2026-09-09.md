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
