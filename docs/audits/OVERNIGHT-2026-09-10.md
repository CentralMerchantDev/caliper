# OVERNIGHT 2026-09-10 — the run did not build. Read the first section first.

Written 2026-09-10, ~07:20–07:45 EDT, by the scheduled Cowork run.

**Nothing was built, nothing was committed, and one thing was broken. The
breakage is small, it is named exactly below, and it takes about ten seconds to
undo — but until it is undone, `git` will refuse every write in this
repository, including yours.**

Which rule route was used, as the brief asks: the process MCP server's tools
(`process_at`, `process_next_item`, `process_get_rule`,
`process_pending_decisions`) were **not available** in this session. The rules
were read directly from `C:\Code\process-mcp\packs\core\*.md` — `build-loop.md`,
`standard-of-proof.md`, `queue-exhaustion.md`, `stopping-authority.md`,
`decision-queue.md`, `escape-clause.md`, `commit-discipline.md`,
`quarantine.md`.

---

## 1. FIX THIS FIRST — two files this run left behind and could not remove

Run these two lines in PowerShell, in any terminal:

```powershell
Remove-Item 'C:\Code\sandbox-spike\.git\index.lock'
Remove-Item 'C:\Code\sandbox-spike\.writetest'
```

Then `git status` in `C:\Code\sandbox-spike` should be clean except for this
file, and normal work resumes. Nothing else was touched.

- **`.git\index.lock`** — a zero-byte stale lock. It is what blocks `git`.
  Created by a `git status` that this run issued; `git` then could not unlink
  it, because of the cause in section 2. This matches `rule://quarantine`
  Tier 1 class `git-lock` exactly: no `git` process is running, the file is
  older than two minutes, and `git status` succeeds once it is gone. It is
  purge-eligible under the rule; this run simply had no way to purge it.
- **`.writetest`** — a zero-byte file this run created deliberately, as the
  probe that discovered the problem. It is **not** covered by `.gitignore`, so
  it shows as untracked in your `git status` until removed.

Both are safe to delete outright. Neither has any content.

---

## 2. WHY THE RUN STOPPED — the brief's premise does not hold in this environment

This is a `rule://escape-clause` stop, and by that rule's own materiality test:
a lane that carried on here would produce work that has to be thrown away,
because none of it could be committed.

**The finding, proved rather than inferred:**

The only shell available to this session is a Linux sandbox that reaches
`C:\Code` through a mount. That mount permits **create** and **write** but
**not unlink**. Every attempt to remove a file returns
`Operation not permitted` — including files this session had just created
itself.

`git` needs unlink for every lock file it takes. So:

| Probe | Result |
|---|---|
| `touch .writetest` then `rm .writetest` in the repository | create OK, `rm` → `Operation not permitted` |
| `mv .writetest` out of the repository | fails — `mv` needs unlink of the source |
| First `git commit` in a throwaway repository on the same mount | **succeeds**, but warns it cannot unlink `.git/HEAD.lock` |
| Second `git commit` in that same repository | `fatal: cannot lock ref 'HEAD' ... File exists` — permanently jammed |
| `git add` in a repository with a pre-existing `index.lock` | `fatal: Unable to create ... index.lock: File exists` |
| `git add package.json` in `sandbox-spike` (an unmodified tracked file, so a no-op if it worked) | same fatal — **this repository is currently jammed** |

The consequence is that **a repository on this mount can accept exactly one
commit and then jams forever.** The brief's own hard requirement — *"Commit at
every step, not at the end. A crash must cost one step, not the night"* — cannot
be satisfied even once, let alone at every step. Continuing would have meant
either building work that could never be committed, or jamming the repository on commit one
and building the rest of the night on top of a repository nobody could write to.

A second, independent confirmation that this task was configured for a
different environment: the brief specifies PowerShell, and correctly so —
`rule://commit-discipline` says the shell is PowerShell. **This session has no
PowerShell.** It has a Linux sandbox and Windows file read/write tools, and
nothing that can run a `Remove-Item`.

**One recovery route was tried and refused.** The session has a tool that
requests permission to enable deletes (`allow_cowork_file_delete`). It was
called against `.git\index.lock` and was **declined automatically, because a
scheduled run has nobody available to approve it.** That is the single change
that would make future runs of this task viable from this environment — see
section 6.

---

## 3. WHAT WAS VERIFIED ANYWAY — read-only, and it found something new

Reads work fine on this mount. Tests run: `test/run.mjs` bundles with esbuild,
and the Linux esbuild binary is present in `node_modules`. So the run spent its
remaining effort on evidence rather than on building.

**Zero API spend. `CALIPER_ALLOW_SPEND` was never set.** Only two test files
were run, both by explicit filename, neither of which touches a provider.
`test/run.mjs`'s own discovery was read first to confirm it cannot pick up
anything else when given an argument.

### 3.1 NEW, and not in the plan or the decision queue: a published number has drifted

```
node test/run.mjs publicClaims.test.ts    →  7 tests, 6 pass, 1 FAIL
not ok 5 - the test counts on the page are the test counts
  page says 1087, generated record says 1194
  -- run node scripts/gen-test-count.mjs
```

`docs/specs/COMPLETION-PLAN.md` ticks **C4** `[x]`, on the strength of the
mutation-evidence surface being reconciled. That tick is now at least
incomplete: a different published-claims gate, on the same surface family, is
**red right now on `b1-land`**. The page and the generated record disagree by
107 tests.

This is exactly the failure condition 3 of "WHAT FINISHED MEANS" is written to
catch — *"Every published number is generated from the thing it describes, and a
gate fails when they drift"* — and the gate did its job. It is not a new defect
introduced by anything; it is drift that had not been looked at.

**Not fixed, deliberately.** The fix the test itself names
(`node scripts/gen-test-count.mjs`) rewrites a tracked file. In a repository
where `git` cannot write, a modification to a tracked file cannot be committed
**and cannot be reverted either** — `git checkout --` needs the same index lock.
That is the "continuing would destroy work" condition. **No tracked file was
touched by this run.**

**Which of the two numbers is correct is UNVERIFIED.** Establishing that means
running all 143 test files, which this run did not do. All that is known is
that the two recorded numbers disagree and the gate is honestly red.

### 3.2 Decision #7's gate — confirmed red, exactly as documented

```
node test/run.mjs bridgeGenerator.test.ts  →  13 tests, 12 pass, 1 FAIL
missing egress on: resort-isle, farm-isle, quarry-isle
```

Word for word what `docs/DECISIONS-FOR-MARK.md` #7 says it is. The gate is real,
it is watched red on purpose, and it still names the same three leaf boundaries.
Nothing about it has rotted.

### 3.3 The committed board asset — ground-checked against RUN 5's own claim

Read straight from `public/board.generated.json`, not from a summary:

```
pieceCount field: 35381      pieces array length: 35381      boundaries: 12
by pieceType:  road 17,728   building 17,637   dock 16   bridge 0
```

RUN 5's commit message (`257f843`) claims 17,728 roads, 17,637 buildings and
16 dock pieces. **Correct to the digit.** Zero bridges is the correct
behaviour decision #7 describes, not a defect. The `pieceCount` field agrees
with the actual array length, so that particular self-declared number is not
drifting.

One caution for whoever reads this next: an ad-hoc attempt in this run to
attribute each dock to a boundary via a `boundaryId` field produced nonsense —
dock pieces carry no `boundaryId`. The **test** is the authority on which
boundaries have egress, and it says three do not. Do not re-derive that from the
asset by hand without reading how `bridgeGenerator.test.ts` attributes them.

---

## 4. WHAT WAS NOT DONE

Everything. No plan item was started. In plan order, the position the run would
have taken had it been able to build:

- **B2.7** — blocked on decision #7, which is open and unanswered. Per the
  brief, skip and take the next written item.
- **B2.8** — blocked on B4 by its own note.
- **B3** — the first item that was actually available. Its plan line still says
  *"Visual result UNVERIFIED ... do this first next session"*, but commit
  `6a9874e` states that line is **stale** and that the visual was verified in
  `18007b8`. That contradiction was noted and **not resolved** — resolving it
  means editing `COMPLETION-PLAN.md`, a tracked file, which section 2 forbids
  here. It is the first thing to settle next session.

No blind subagent review was run, because there was no plan to review — the
build never started.

---

## 5. DECISIONS QUEUED THIS RUN

**One, and it is deliberately recorded here rather than appended to
`docs/DECISIONS-FOR-MARK.md`.** That file is tracked. Appending to it in a
repository where `git` cannot write would leave a modification that can be
neither committed nor reverted. Please transcribe this into the queue once the
lock is cleared — `rule://decision-queue` is right that a queue nobody reads is
not a queue, and this entry is one file away from being invisible.

### #8. Should this scheduled task keep running from Cowork at all?

**The question:** the CALIPER overnight brief assumes a shell that can run
`git commit` and PowerShell. The Cowork scheduled run has neither. Should the
task be repointed, adapted, or narrowed?

**Options:**

1. **Repoint the schedule at the Claude Code CLI**, which is where every prior
   RUN 1–5 executed and where PowerShell and a normal filesystem are available.
   The brief then works exactly as written, unchanged.
2. **Approve file deletion for the Cowork sandbox** so the mount permits
   unlink. This is a one-time approval; after it, `git` behaves normally and
   this brief becomes executable here. It cannot be granted mid-run, because a
   scheduled run has nobody to approve it — it has to be granted in advance.
3. **Narrow this scheduled task to read-only verification** — run gates, read
   the plan, ground-check published numbers, write a report — and leave all
   building to the CLI lanes. This run demonstrates that the read-only half
   works well and found a real defect (section 3.1) in a few minutes.

**Recommendation: option 1, with option 3 as a genuinely useful addition rather
than a consolation.** The overnight brief is a *building* brief and it belongs
in the environment that can build. But a short, cheap, read-only claims-and-gates
sweep is worth having on a schedule regardless — it is what caught the 1087
against 1194 drift this morning, and it would have caught it on any morning.
Option 2 is real and would work, but it widens what an unattended run can delete
on the whole mount, which is a larger permission than this task needs.

**What was done in the meantime:** nothing was built; the run stopped, verified
what it could read-only, and wrote this.

**Reversibility:** all three are trivially reversible — a schedule setting, a
permission toggle, or an edit to this task's own brief. Nothing in the
repository depends on the choice.

---

## 6. WHAT I WOULD DO NEXT, IN ORDER

1. Delete the two files in section 1. Ten seconds, and it unblocks everything.
2. Decide #8 above, so tomorrow's scheduled run does not repeat this morning.
3. Run `node scripts/gen-test-count.mjs`, confirm which of 1087 and 1194 is
   real, and re-run `publicClaims.test.ts` until test 5 is green. This is C4
   work, it is cheap, and C4 is on the minimum sendable cut.
4. Settle the B3 contradiction in section 4 — either the plan line is stale and
   should be corrected, or `18007b8` did not verify what the handover says it
   did. One of the two documents is wrong and both are being read as true.
5. Then take B3 through the build loop properly, in an environment that can
   commit.

---

## 7. THINGS THAT LOOK WRONG THAT NOBODY ASKED ABOUT

- **`C4` is ticked `[x]` while a published-claims gate is red.** The tick is
  accurate about the surface it names (mutation evidence) and misleading about
  the item as a whole. `COMPLETION-PLAN.md`'s own rule is that a tick means the
  gate is green and the commit exists — read strictly, C4 should be `[!]` with
  the test-count surface named as the open part.
- **The plan disagrees with a commit message about B3, and both are in the
  repository.** Section 4. A stale ledger line that a later commit already
  corrected is precisely what `build-loop.md` STEP 1 says to fix on sight; two
  runs have now read past it.
- **Nothing in the repository records which environment a lane is running in.**
  This run got several steps into orientation before discovering that its shell
  could not commit. A three-line preflight — can this shell delete a file it
  just created, and does `git` survive two commits in a scratch repository —
  would have found it in the first minute rather than the twentieth. That check
  is worth putting at the top of the overnight brief for every environment, not
  just this one.
- **`git status` is not a read-only command**, which is worth knowing given how
  freely every brief here calls it. It refreshes and rewrites the index, and on
  a filesystem that cannot unlink, that single call is what jammed this
  repository. A lane that only ever ran `git log` and `git diff` would have
  left no trace at all.

---

## 8. UNVERIFIED — named rather than assumed

- Which of 1087 and 1194 is the true test count. Only the disagreement is known.
- The full suite's red/green picture. Two test files out of 143 were run.
- Whether `test/cullingRatio.test.ts` and `test/regressionGate.test.ts`
  (decision #4) still fail. Not run — they need a browser, and this sandbox has
  no verified Playwright path.
- B3's visual result, one way or the other. Not looked at; `scripts/shoot.mjs`
  was not run.
- Whether anything else in the repository was already dirty before this run.
  The first `git status` of the session returned a clean tree, which is the one
  reading taken before the lock existed, and it is trusted for that reason.

---

## 9. COMMIT HASHES

**None.** No commit was made by this run, in this repository or anywhere else.
The last commit on `b1-land` is `257f843`, unchanged, exactly as this run found
it. This file is untracked and will need adding by hand once section 1 is done.

---

## RUN 6 — Claude Code CLI lane, autonomous, continuing from this file

Written 2026-09-10, same day, later, from the environment §5 option 1 above
recommended (PowerShell + a normal filesystem — this repeats after every item,
per the brief's own instruction, so a crash costs one item, not the run).

**The stale lock and probe file this file's §1 asked to have removed did not
exist on this checkout** — confirmed directly (`ls .git/index.lock`,
`ls .writetest` both "No such file or directory"; `git status` and `git fsck
--connectivity-only` both clean). Either they were specific to the other
session's own mount and never reached this disk, or something else cleared
them. Not a live blocker here. `git commit` works normally in this
environment, confirming §5's own option 1 recommendation.

**One tooling note, matching this file's own §2 finding in spirit:** the
brief given to this run also named tools (`process_at`, `process_next_item`,
`process_pending_decisions`, `process_record_gate`, `process_quarantine`) and
resource URIs (`rule://build-loop`, `rule://decision-queue`,
`rule://stopping-authority`) that do not exist in this session's own
toolset — checked directly via a tool search before assuming otherwise. Used
the real, file-based equivalents instead: `docs/BUILD-LOOP.md`,
`docs/DECISIONS-FOR-MARK.md`, `docs/OVERNIGHT-RUN.md`'s "WHEN YOU MAY STOP"
section, `docs/QUARANTINE-POLICY.md`. Named per the brief's own instruction
("if this brief is wrong about the code, say so"), not treated as a reason
to stop, since the underlying, real mechanisms all exist and were used.

### Item: transcribe this file's own orphaned decision, plus one this session found

`docs/DECISIONS-FOR-MARK.md` #8 (this file's §5, transcribed) and #9 (a new
finding: `scripts/gen-test-count.mjs`'s own page-update exemption is
deliberately narrow and cannot fire while ~40+ already-tracked red gates
exist — full detail there). Commit `bb51ecd`.

### Item: the B3 plan-line contradiction (this file's §4/§7, and the brief's item 2) — settled by looking

Read commit `18007b8`'s full message directly and confirmed
`.shots/downtown-close.png` exists on disk (`2026-09-09 15:32`). The commit
DID run `scripts/shoot.mjs` (with `SHOOT_BOARD=1`) and DID look at a real
screenshot — reported honestly as an imperfect, additive overlay, which is
exactly B3's own stated scope, not a failure to verify. **`COMPLETION-PLAN.md`
was the stale document, not the commit message.** Corrected in place; B3's
own exit condition (`city-render.js` quarantined) is unchanged and still not
met — only the "visual UNVERIFIED" clause was wrong. Commit `bb51ecd`
(bundled with the decisions transcription above — both are orientation
fixes, no code touched, same commit).

### Item: the red published test count (the brief's item 1)

`node test/run.mjs test/publicClaims.test.ts` reproduced the exact red the
brief named: `page says 1087, generated record says 1194`. Investigated
`scripts/gen-test-count.mjs`'s own page-update logic directly (not assumed)
before attempting a fix — found the narrow exemption described in Decision
#9 above, which means neither "regenerate the record" nor "run the script
again" can legitimately turn this test green while dozens of other,
already-decided red gates exist. **Recorded as Decision #9 rather than
forced.** A fresh, complete `node test/run.mjs` run was started
(`full-suite-final.log`) to get an honest, current record regardless —
in progress as this entry is written; result and the C4 tick correction
follow in the next entry once it completes. (Two prior sessions today
already spent real wall-clock on this exact measurement — RUN 5's own
handover has the detail — so this is not the first attempt, but the record
needs to be current, not reused, since `test/boardLoad.test.ts` changed
since the last complete run.)

### Item: scoping B3's real next increment

Per `docs/BUILD-LOOP.md` STEP 2 ("plan the step, in writing, before touching
code") and the brief's own instruction to have a subagent with no memory of
the reasoning review the plan before implementing: dispatched a blind
Explore agent to map exactly what currently depends on `city-render.js`, what
`world-render-3d.js`'s picking/spatial-index/sun-sky actually read today, and
what the smallest real, well-scoped increment toward the board-only path
would be — rather than attempting the whole multi-week migration
`docs/specs/BOARD-REBUILD-PLAN.md` itself describes as still fully open
("picking/spatial-index/sun-sky not yet rebuilt against the board"). Result
pending; the actual STEP 2 plan (what changes, why, the test, the mutation)
and its own blind review will follow once that mapping returns — this entry
records the intent and the reasoning before the fact, per this file's own
established practice of writing WHY before WHAT.

### Still open, as of this entry

### Item: B3's mapping came back — a real, small, well-scoped next step found

The blind Explore agent's report (verbatim findings kept, not paraphrased,
in the session transcript this handover is written from): exactly two
product files import `city-render.js` (`world-render-3d.js:1722`,
`city.html:93`), and the only live export used is `buildWorld`. Both call it
**unconditionally** on every page load — nothing is gated on whether to
build the old world at all, only on whether to *additionally* draw the real
board on top (`?board=1`). Picking, the spatial index, and sun/sky all read
`city-render.js`'s own return value today, confirmed by direct citation
(`world-render-3d.js:1877-1913`), not the real board.

**The one finding that matters most:** `_buildCityBase` already calls
`fetchBoard(city.heightAt)` — the real, generated board, complete with its
own `whereIs`/`inCells` spatial-query methods (`board.js:378-401`) — but only
under `?board=1`, and only to draw it. The `board` object itself is a local
variable, never retained past that block; its query methods are fetched and
discarded. Sun/sky has no such shortcut — it is genuinely new, separate work
(`createCitySky` is already portable, but its call site and the `sun`/`sky`
objects are still built inside `city-render.js`'s own `buildWorld`).

**The step planned, per BUILD-LOOP STEP 2, in writing, before any code:**
retain the fetched board (`this._boardData = boardData`, one line, inside
the EXISTING `?board=1`-gated block — no change to when/whether the board is
fetched), add a pure `pieceAtPoint(board, x, z, k)` function to
`public/board-load.js` (atom-convert the point, query `board.inCells`), and
wire the pick handler to additionally resolve the real board piece at a
click, when board data is loaded, as a NEW field on the existing `onInspect`
payload — every existing field, and the entire path when `?board=1` is
absent, untouched. Full plan written to
`C:\Users\User\...\scratchpad\b3-step-plan.md` (session-local, not
committed — the plan text itself is preserved in this commit's own message
instead, per this project's convention that plans live in commit messages
or `docs/specs/`, not scratch files).

**Given, cold, to a fresh subagent with no knowledge of this reasoning**,
per the brief's own instruction — asked to verify every factual claim
against the real files and find problems, not to confirm the plan is good.
Result pending as this entry is written; folded in and the implementation
proceeds through BUILD-LOOP STEPS 3-9 once it returns, in the next entry.

### Item: the test count, resolved — regenerated honestly, page left alone, C4 corrected

The complete run finished: **1,194 tests, 1,130 pass, 48 fail, 15 skipped,
1 todo** (`node test/run.mjs`, full log this run's own working set).
`node scripts/gen-test-count.mjs --node-log <that run>` regenerated
`test/testCount.generated.json`. **Decision #9's prediction confirmed
empirically, not just reasoned about:** the tool's own refusal message
named all 48 failing titles and declined to touch `public/index.html` —
the count-claim exemption cannot fire while 47 OTHER real, already-tracked
gates are red (B2.5, decisions #3-#7, cullingRatio, regressionGate, several
road-network/waterway/airport gates, and this run's own new Decision #7
gate). The page's own "1087" claim is left exactly as it was — forcing it
to "1194" by hand would be the exact "green-looking evidence manufactured,
not measured" pattern `gen-test-count.mjs`'s own header exists to prevent.

`docs/specs/COMPLETION-PLAN.md`'s C4 tick moved `[x]` → `[!]`: the mutation-
evidence surface it names is still correctly reconciled and untouched, but a
different published-number surface in the plan's own "every published number
is generated" family is red, so C4 as a whole cannot honestly stay ticked.
Commit `e7ab89b`.

**48, not the 43 this run predicted before measuring** (45 before the
`boardLoad.test.ts` fix, minus 2 for that fix, plus 1 for this run's own new
Decision #7 gate). The extra 4 are not new defects — checked directly, by
name, against the failing list: `CLAUDE.md's verification line names the
real test counts`, `P4.6: no published generated claim is stale`, and its
own synthetic sibling are the SAME root staleness (the test count) surfacing
on three more surfaces this run had not separately counted before measuring
— C4's own "every published number... on all four surfaces, not just the
one" condition, restated by the numbers themselves. Not a new finding beyond
what Decision #9 already names; recorded here so the arithmetic is not left
looking wrong without an explanation.

### Item: B3's step — blind review folded in, implemented, test-first, watched red then green

The blind review of `scratchpad/b3-step-plan.md` came back with no false
claims about the code (every file/line/signature check held) and four real,
fixable gaps, folded in before writing anything:

1. **The plan's mutation would not reliably be caught** — its own example
   piece used a SQUARE footprint (`20×20`), so an i/j-swap mutation could
   coincidentally still land inside a symmetric footprint. Fixed: every test
   piece below uses an asymmetric footprint (`w:20, d:8`, matching the
   road-span shape already used elsewhere in this codebase) with an offset
   whose i and j components differ, so a swap provably queries outside the
   real footprint.
2. **The plan's "existing fields, unchanged" claim omitted a real one** — a
   `board` field already exists on the same `onInspect` payload, itself
   derived from the OLD `board-adapter.js` path. Named explicitly in the new
   code's own comment (`realBoardPiece` is NOT the same source as `board`)
   so a future reader is not confused between the two.
3. **An untested edge case** (a piece placed only above ground level, `k >
   0`, is not found by the default query) — named in `pieceAtPoint`'s own
   doc comment as an explicit, out-of-scope limitation, not silently
   assumed away and not tested (nothing today handles this case either, so
   it is not a regression).
4. **A robustness gap** — the new `pieceAtPoint` call sits inside a
   try/catch now, matching this exact method's own established convention
   three lines above it (`fetchBoard`'s own try/catch, "a fetch failure
   must not break city mode entirely").

**Watched red first, for the right reason:** `node test/run.mjs
test/boardLoad.test.ts` failed to BUILD (`No matching export ... for import
"pieceAtPoint"`) before the function existed — the same standing rule every
other gate file in this project uses.

**Implemented:** `pieceAtPoint(board, x, z, k=0)` in `public/board-load.js`
(atom-convert via `grid.js`'s `atomOf`, query `board.js`'s own `inCells`).
`world-render-3d.js` retains the already-fetched real board
(`this._boardData = boardData`, inside the EXISTING `?board=1` gate — no
change to when/whether it is fetched) and the city-mode pick handler
additionally resolves the real piece at a click, added as a new
`realBoardPiece` field on the existing `onInspect` payload. Every existing
field, and the entire code path when `?board=1` is absent, is untouched —
`this._boardData` stays `undefined` on an ordinary page load, so the new
branch is never reached.

**Verified:** `node test/run.mjs test/boardLoad.test.ts test/pickSelection.test.ts`
— 10/10 pass (4 new `pieceAtPoint` tests, including the two the blind review
specifically asked for: an asymmetric-offset resolution and an off-by-one-atom
edge miss; 1 new static wiring gate confirming `world-render-3d.js` actually
calls it). `npx tsc --noEmit` clean.

**Mutation:** `node scripts/_mutcheck.mjs test/boardLoad.test.ts
public/board-load.js <spec>` against the i/j-swap mutation the blind review's
own concern was about — result in the next entry, in progress as this one is
written.

**Mutation, measured:** `node scripts/_mutcheck.mjs test/boardLoad.test.ts
public/board-load.js <spec>` — baseline GREEN, `CAUGHT
piece-at-point-does-not-swap-i-j`, file restored byte-identical. Permanent
entry added to `test/mutations.json`.

**Guards checked (BUILD-LOOP STEP 8):** nothing deleted; zero API spend
(`CALIPER_ALLOW_SPEND` never set); `src/` untouched; `tick`/`chooseAction`/
`applyAction` untouched; no aesthetic/CSS change. `e2e/pickBoardRecord.spec.ts`
— read directly, not assumed — tests a separate, hand-mirrored test-only
function (`window.__p4PickAt`, `public/index.html:2682`) that does not call
`pieceAtPoint` or reference `this._boardData` at all, so this step cannot
have broken it; not re-run this session (a full Playwright spin-up for a
function this change provably does not touch) — named rather than silently
skipped. Could not identify a specific file matching CLAUDE.md's literal
"nine regression checks" phrase in this repository (grepped for it directly;
the phrase appears in several docs but never resolves to a named list of
nine here) — named as a real gap in this guard-check rather than assumed
satisfied, since the phrase itself could not be traced to a concrete target.

**Ticked, committed:** `docs/specs/COMPLETION-PLAN.md`'s B3 line gained this
step's own evidence (still `[!]` — this is one connection, not the switch,
and not the exit condition). Commit `5592f24`.

**What remains of B3's real scope, unchanged by this step, named plainly:**
picking is connected to the board, not switched to it (the old `addr`/
`districtId`/`className` shape every other `onInspect` field still depends
on has no board-only equivalent); sun/sky has no board-based path at all
(new, separate work, not started); `fetchBoard()` is still only called
under `?board=1` (querying the board on every load, not just drawing it, is
a separate later increment). None of this is hidden or claimed done.

### Item: this file itself, finally tracked

The scheduled Cowork run that started this file could not `git add` it (§1
of this file — no unlink permission, `git` jammed). Added and committed in
this environment, where `git` works normally, closing that loose end rather
than leaving it float as an untracked file indefinitely.

### Per BUILD-LOOP STEP 11 — looping, not stopping

A finished step is not a finishing line. Continuing: re-reading
`docs/specs/COMPLETION-PLAN.md` fresh (not trusting this document's own
summary of it) to find the next most valuable item in written order,
skipping anything blocked by an open, undecided decision, per the brief's
own instruction. Recorded in the next entry, not assumed from memory.

### The next item, found — a real, well-scoped, DECISION-FREE B4 increment

Re-read `COMPLETION-PLAN.md` fresh, in written order, skipping anything
blocked by an open decision per the brief's own instruction:

- **B2.7** — its own gate (Decision #7) is open and unanswered. Skipped, per
  the brief's own instruction, not because it is unimportant.
- **B2.8** — blocked on B4 by its own note in the plan. Skipped.
- **B3** — just took a real step (above). The next real increment (switching
  picking over, not just connecting it, or extracting sun/sky) is
  genuinely larger, structurally different work per this session's own
  blind mapping — not a small step to start cold at the end of a long run.
- **B4** — checked `public/prop-models.js`'s own manifest directly (not
  assumed): `MODELS["bench"] = MODELS["bench-slat"]` and
  `MODELS["bin"] = MODELS["bin-round"]` are real, existing plain-alias
  props — the EXACT same non-`VARIED` resolution path `lampPost` already
  uses (`board-render.js`'s own `scatterStreetLamps`, live and tested).
  Neither `bench` nor `bin` is scattered by anything yet
  (`grep propModel\( public/board-render.js` — only `"tree"` and
  `"lampPost"`). **This does not depend on either open B4 decision**
  (#5 roadkit width, #6 typology selector) — it is additive prop-scattering
  by the already-proven pattern, not roads or buildings.

**This is the concrete next step for whoever picks this back up — named
precisely so it costs zero re-derivation:** a `scatterBenches` (or combined
`scatterStreetFurniture`) function in `public/board-render.js`, mirroring
`scatterStreetLamps`'s own real, tested shape (piece-type filter, `everyNth`/
`maxX` bounds, shape-aware positioning off the piece's own `foot.w`/`foot.d`
— not copied blindly; `scatterStreetLamps`'s own header names the exact
single-axis mistake a naive port would make), wired into `_buildCityBase`
the same way `scatterTrees`/`scatterStreetLamps` already are, test-first,
blind-reviewed before implementing (per the brief's own standing
instruction), mutation-tested, following `docs/BUILD-LOOP.md` exactly as
this session's own B3 step did.

### Stopping here — condition 4, not a finished plan

Per `docs/OVERNIGHT-RUN.md`'s own "WHEN YOU MAY STOP": not because
`COMPLETION-PLAN.md` is fully green (it is not, and finding the bench/bin
step above is not a stopping condition on its own), and not because a phase
ended. This session has run a full orientation, resolved two concrete
brief items end to end (the stale B3 plan line; the red test-count gate,
including empirically confirming why it cannot be forced green), taken one
complete, blind-reviewed, test-first, mutation-tested B3 build-loop step,
transcribed one orphaned decision and recorded one new one, and found the
next real, unblocked, precisely-scoped step. Four full-suite runs (one
~23 minutes, this session's own final one included) and three subagent
dispatches (one Explore mapping, two blind reviews) were run across this
session. Continuing into a SECOND full build-loop cycle (plan → blind
review → test-first → implement → mutate → measure → commit) risks starting
real, uncommitted work this session cannot see through to a clean stopping
point — worse than stopping here, with everything so far committed and the
next step named precisely enough that it costs nothing to pick up cold.

**Nothing here is a claim that the work is done.** `docs/specs/
COMPLETION-PLAN.md` still has B2.7, B2.8, B3 (mostly), B4 (mostly), B5, B7
open or partial, exactly as it did before this session, minus the two items
this session actually closed and the one step it actually took. Read the
ledger, not this sentence, before believing otherwise.

### Commits this session, in order

`bb51ecd` (decisions #8/#9 transcribed/recorded, B3 plan-line corrected),
`e7ab89b` (test count regenerated honestly, C4 tick corrected), `5592f24`
(B3's pieceAtPoint step, full build-loop cycle), `7f05938` (this file
tracked). Working tree confirmed clean after each. No merge, no deploy, no
push, `main` untouched throughout — matching the brief's own hard guards.

### Still open, for the next session

- **B4's next increment**: `scatterBenches`/`scatterStreetFurniture`,
  scoped precisely above — zero re-derivation needed.
- **B3's larger remaining scope**: switching picking over (not just
  connecting it) and extracting sun/sky from `city-render.js`'s own
  `buildWorld()` — both structurally larger, named as separate work by this
  session's own blind mapping, not started.
- **Decisions #3, #4, #5, #6, #7, #9** — genuinely open, Mark's call, not
  blocking other work (per the brief's own "skip and take the next written
  item" instruction, already applied this session).
- **Decision #8** (should the Cowork schedule keep pointing at this brief)
  — a scheduling question, not this session's to resolve either.
