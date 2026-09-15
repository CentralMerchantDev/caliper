# BLD lane, autonomous run, 2026-09-11 -- handover

Brief: [docs/briefs/BLD-2026-09-11-autonomous.md](../briefs/BLD-2026-09-11-autonomous.md).
Worked in order, per its own checklist (`docs/briefs/BLD-2026-09-11-autonomous.md`
section 10). Stopped at the declared stopping point (section 11): item 6
explicitly skipped on the memory reading, then item 12's fallback list
picked up and worked to the extent the same memory constraint allows.

## Item 0 -- brief committed, server currency confirmed

`process_get_rule('lane-brief')` returned the rule (status: active, decided
2026-09-11) before anything else ran -- the process-mcp server is current,
so every other rule reference in the brief was trustworthy. Committed
`3f6cbfe`.

## Item 1 -- pushed

`codex-lane` pushed to `origin/codex-lane`, per the brief's own explicit
authorisation (R6, PART 4) -- 103 commits ahead at push time (the whole
`b1-land` merge plus this session's own work). Confirmed via
`git log origin/codex-lane` showing the pushed commit. `main` was never
touched.

## Item 2 -- F1 ticked

`docs/specs/COMPLETION-PLAN.md` PART 2's F1 ticked with the command that
produced 16: `node test/run.mjs facadeVariants.test.ts` -> 16/16 pass,
GATE reads 16 distinct materials (was 4 pre-merge). Not re-worked, per the
brief's own instruction -- re-confirmed, not re-measured from scratch.
Commit `81c535d`.

## Item 3 -- the two priority rawSourceScan.test.ts exclusions

Both closed, in the order named:

1. **generatedClaimsAreCurrent.test.ts** (`568b88c`) -- `spanText()` matched
   a claim span's raw HTML with no `<!-- -->` stripping. Added
   `stripHtmlComments()` to `test/stripSourceComments.ts`; wrapped `INDEX`'s
   read. A blind review of my first plan caught that my first draft's
   synthetic test never exercised the real wired path -- rewritten to prove
   the vulnerability on raw text, prove the fix, and add a static
   source-guard proving the real `INDEX` construction is actually wired
   through the strip (not just tested in isolation). Watched RED: the
   static guard failed before the fix. Gate ledger:
   `rawSourceScan-generatedClaimsAreCurrent`.

2. **reachability.test.ts** (`28e1331`) -- `isRedirectStub()` matched raw
   HTML for `location.replace(`/refresh with no stripping -- the dangerous
   direction per this file's own header (the worst defect ever found in
   this repo was an orphaned page nothing threw on). Split into
   `isRedirectStubText` (pure) + `isRedirectStub` (file wrapper). Watched
   RED by temporarily reverting the strip to a no-op and re-running -- both
   new vulnerability tests failed as expected. A blind review confirmed no
   other `public/*.html` file contains either pattern anywhere, including
   inside comments, and that `stripSourceComments`'s known `//`-inside-
   a-string limitation cannot touch `plan-preview.html`'s real mechanisms.
   Gate ledger: `rawSourceScan-reachability`.

## Item 4 -- the three lower-risk exclusions

Order chosen from each entry's own recorded reason (residual real risk
first, self-declared lowest priority last):

1. **thinkingDisabledOnEveryCall.test.ts** (`90a7bf5`) --
   `findMessagesCreateCallsWithoutThinking()` matched `thinking\s*:` against
   a call's raw argument text. Fixed by stripping the whole `source` once
   at the top of the function (offset-preserving, so every existing
   `matchAll`/`slice` call keeps working). A blind review independently
   re-read every one of the 8 real call sites this scan covers (7 in
   `src/claude.ts` plus `scripts/supervised-generate.mjs`'s one) and
   confirmed none relies on a comment today. Watched RED directly. Gate
   ledger: `rawSourceScan-thinkingDisabled`.

2. **workerFirstRouting.test.ts** (`9c338ff`) -- `extractWorkerRoutes()`
   matched `url.pathname === "..."` against `src/index.ts`'s raw text. This
   entry's own prior text had already judged the direction "likely safe"
   but left it unverified -- this closed that hedge outright rather than
   leaving it standing. A blind review confirmed all 26 real routes in
   `src/index.ts` are unaffected (26 before, 26 after the fix). Gate
   ledger: `rawSourceScan-workerFirstRouting`.

3. **rendererStatic.test.ts** (`bc5a117`) -- the
   `new THREE.WebGLRenderer(`/`logarithmicDepthBuffer: true` check is a
   COUNT comparison, not presence/absence -- a comment anywhere in the file
   could inflate the flagged count without inflating the construction
   count, masking a real second renderer that lost its real flag. Extracted
   `countRendererLogDepthGap()`, wired the REAL per-file check to call it
   (not duplicate the logic inline -- this session's own item-3a lesson
   about "computed but never wired" applied to itself), and added a static
   GATE test proving that wiring holds. A blind review confirmed the real
   counts in both files (1 construction, 1 flag each) are real code,
   unaffected by stripping. Gate ledger: `rawSourceScan-rendererStatic`.

With this, `test/rawSourceScan.test.ts`'s `REVIEWED_EXCLUSIONS` list
contains only genuinely safe-direction or comment-immune (AST/tokenizer/
data-only) entries, plus the two world-domain ones item 5 covers below --
this session's whole comment-vulnerability sweep is closed.

## Item 5 -- the two world-domain exclusions

Both determined to be **this lane's own gate to fix**, not a cross-lane
request -- every check either targets is validated against real, live
world-source code today; the gap in both cases is purely that a FUTURE
regression could hide behind a comment, and closing it requires editing
only the TEST file's own source read, never `board-generator.js` or
`terrain.js` themselves. A blind review independently confirmed this
classification for both files before implementation. Commit `332c214`,
gate ledger `rawSourceScan-boardGenerator-terrainLandmassOwnership`:

1. **boardGenerator.test.ts** -- `halfRoadFor(`/`roadWidthFor(` presence
   checks (the risky two of its four checks; the other two, ROAD_WIDTH/
   HALF_ROAD absence, were already the safe direction). Wrapped `src` in
   `stripSourceComments()`. `14/15` after the fix -- the one failure is the
   pre-existing, already-queued B2.5 CPU-time gate decision
   (`caliper-bld #3`), unrelated.
2. **terrainLandmassOwnership.test.ts** -- the `export function
   landmassPolygonsDesign(` presence check. Wrapped `TERRAIN_SRC` (a
   module-level const shared by both this test and the low-risk
   import-clause check) in `stripSourceComments()` at its single definition
   site. `5/5` after the fix.

## Item 6 -- K7.1, the atlas gap

**Memory checked first, per the brief's own instruction.** Three readings,
roughly a minute apart: **3.82 GB, 3.63 GB, 3.63 GB** free of 15.71 GB
total -- recovered substantially from the 0.65 GB reading on 2026-09-10
(the full post-merge suite and both lanes' earlier work have since
finished), but still **below this project's own standing 4 GB floor for
any render**, consistently enforced across every prior session
(`docs/LESSONS.md`, `docs/audits/K6-BUILDINGS.md`, multiple
`OVERNIGHT-BLD-*`/`OVERNIGHT-2026-09-10.md` entries all cite the same 4 GB
line). No concurrent `wrangler dev`/`test/run.mjs`/mutation process was
found running (checked via `Win32_Process` before concluding memory alone
was the constraint, not contention this lane was adding to).

Per the brief's own item 6 text ("if it is still near 0.65 GB, say so with
the number and skip to section 12 -- do not rediscover the same wall a
third time"): the number is stated above, the wall is not 0.65 GB anymore
but is still a real wall, and `scripts/shoot.mjs` was **not** run. K7.1
remains code-verified, not visually verified -- unchanged from
`docs/pending-commits/k7-1-trim-atlas-patch.txt`'s own honest accounting.

## Section 12 fallback -- item 1 (B6, the touch-action gap)

Per section 12's own text, item 1's real-viewport gate also needs a
browser, which the same memory constraint blocks -- but its own text
explicitly permits a source-level trace of the touch-action gap in that
case, recorded rather than invented. Re-confirmed, not fixed (this gap was
already found and reported, never fixed, per
`docs/audits/U4-NAV-WHEEL.md`'s own line 233-236):

- `public/index.html:101-105` -- the CSS rule for `#world-canvas,
  #world-canvas-2d` sets `width`/`height`/`display` and nothing else. No
  `touch-action` property at all, so it defaults to `auto`.
- `public/world-render-3d.js:6376-6380` -- the 3D renderer wires real
  `pointerdown`/`pointermove`/`pointerup`/`pointercancel`/`wheel` handlers
  directly to the canvas for camera pan/rotate/zoom. These compete with the
  browser's own default touch gesture handling (page scroll, pinch-zoom)
  whenever `touch-action` is left at its default.
- Contrast with two places in the same file that DO set it correctly:
  `.btn-build` (`touch-action: manipulation`, line 1086) and `.wb-grip`
  (`touch-action: none`, line 1301, the workbench panel's own drag handle).
  The world canvas -- the one surface with the most gesture-sensitive input
  of anything on the page -- is the one place this was never set.

Not fixed this run: the gate is explicit ("measured on a real viewport,
never a stylesheet substring") and a real viewport needs the same browser
this memory constraint blocks. Recorded here as confirmed-still-open,
current line numbers, rather than left as a stale claim from a prior
session's line numbers.

## Stopping point

Per section 11: item 6 was explicitly skipped on the memory reading, and
section 12's first fallback item was worked to the extent the same
constraint allows (a real source-level finding, not a closed gate).
Stopping here rather than attempting sections 12 items 2-3 (the wedge-wheel
screenshot and U1's panelOverlap re-watch both also need a live browser;
the K6-BUILDINGS.md re-read is available but, given the amount of verified
work already landed this run across items 0-5, this is the honest place to
write up and stop rather than open a new, larger thread this close to the
declared stopping point).

## What is still open, named rather than left implicit

- K7.1's visual verification (blocked on memory, as it was on 2026-09-10).
- B6/the touch-action gap on `#world-canvas` -- traced again, still not
  fixed, still needs a real viewport to verify a fix against (a one-line
  CSS change is easy to propose; verifying it does not itself break drag-
  to-pan on the canvas, or interact badly with `.wb-grip`'s own
  `touch-action: none`, needs the same browser this run could not use).
- Section 12 items 2 and 3 (wedge-wheel screenshot, K6-BUILDINGS.md re-read)
  not started this run.
- Every decision already sitting in the queue before this run started
  (`process_pending_decisions`, 11 open across caliper/caliper-bld) is
  unchanged -- none of them blocked this run's own checklist, so none were
  acted on.
