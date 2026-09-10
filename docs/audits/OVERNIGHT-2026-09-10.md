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

---

## RUN 7 — stopped before starting, on the memory floor, exactly as briefed

A follow-up brief asked for `scatterBenches`/`scatterStreetFurniture` (named
precisely by RUN 6's own handover above — the plan itself did not need
re-deriving). Before any work: `git status`/`git log --oneline -5` confirmed
the tree clean at `4d47861`, matching RUN 6's own last entry exactly — no
re-derivation needed there either.

**Free memory checked first, per the brief's own explicit instruction**
("check free memory and apply `docs/OVERNIGHT-RUN.md`'s own floor... do not
run the full suite to find out"):

```
Get-CimInstance Win32_OperatingSystem -> FreePhysicalMemory
Free: 1.77 GB / Total: 15.71 GB
```

**1.77 GB, against this project's own standing 4 GB floor**
(`docs/OVERNIGHT-RUN.md`: *"Memory below 4 GB: do code-only work and check
again. Do not kill processes."*). This session's own brief was more direct
still — *"if you are under it, say so and stop."* Followed literally: no
plan written, no subagent dispatched, no test run, no file touched other
than this one. `scatterStreetLamps` was not even opened this run (RUN 6
already read it in full and the plan doesn't need re-reading the source to
be written correctly — but writing the actual test/mutation would mean
running `node test/run.mjs`/`_mutcheck.mjs`, both real memory pressure on a
host already under a quarter of its own stated floor).

**No process killed, per the brief's own instruction.** Nothing was started
that would need one — there is no PID to record.

**What this is not:** not a finding that the plan is wrong, not a finding
that `scatterStreetLamps` doesn't match the description, not new information
about the code. Purely an environment condition, checked first as asked,
before spending any of it.

### The next step, unchanged from RUN 6, still costing zero re-derivation

Build `scatterBenches`/`scatterStreetFurniture` in `public/board-render.js`,
mirroring `scatterStreetLamps`'s own real, tested shape — piece-type filter,
`everyNth`/`maxX` bounds, shape-aware positioning off the piece's own
`foot.w`/`foot.d` (not a blind copy of a single-axis offset — that file's
own header names the exact mistake a naive port would make). `propModel`'s
manifest already carries the two aliases needed
(`MODELS["bench"] = MODELS["bench-slat"]`, `MODELS["bin"] = MODELS["bin-round"]`
in `public/prop-models.js`) — confirmed by RUN 6, not re-checked this run
since nothing changed. Plan in writing first (what changes, why, the test,
the mutation), blind subagent review before implementing, test-first
(watch red, then green), mutate and confirm the mutation is caught by the
test that names it, commit. Does not depend on either open B4 decision
(#5 roadkit width, #6 typology selector) — purely additive prop-scattering.

**Before attempting it: re-check free memory.** If still under 4 GB, this
is not a blocker that clears itself by waiting inside the same session —
per `docs/OVERNIGHT-RUN.md`'s own distinction, this is exactly the kind of
condition a later run should re-check fresh, not a permanent stop.

---

## RUN 8 — `scatterStreetFurniture`, memory floor re-checked, brief's own
   correction applied

A follow-up brief corrected RUN 7's own reading of the memory floor: it
governs the FULL suite (the 26 km world build in `cityWorld.test.ts`/
`regressionGate.test.ts`), not targeted runs — work the item and run only
the files the change touches, name which were and were not run. Re-checked
first: **2.12 GB free of 15.71 GB** — still under 4 GB, but per this
correction, not a reason to stop for a code-only item with a light,
targeted test.

**State verified fresh, not re-derived:** `git status` clean, `HEAD` at
`6eaf5de` (RUN 7's own commit), at-or-after `4d47861` as the brief asked.

**A real process finding, worth naming on its own:** `$env:TEMP\COMMIT_MSG.txt`
is a path shared across concurrent lane sessions on this machine — found
because another lane's own commit message (a BLD-lane props survey, not
this session's work) was sitting in that file when this run started,
placed there by a tool-modification notice between turns. Not this
session's file to have written, and not touched as anyone else's content —
overwritten fresh with this run's own message immediately before its own
commit, and re-checked (`head -3`) right before running `git commit` to
catch a possible second collision. Worth a standing note for any future
session using this same pattern: **never trust this file's existing
content is yours; always overwrite it fresh, and verify again right before
committing.**

**Read `scatterStreetLamps` in full, fresh, per the brief's own explicit
instruction** (not from memory of RUN 6's own earlier reading). Confirmed
directly, not assumed: `public/props.js:4588-4589` carries
`MODELS["bench"]=MODELS["bench-slat"]` / `MODELS["bin"]=MODELS["bin-round"]`,
and `grep propModel\( public/board-render.js` still found only `"tree"` and
`"lampPost"` before this run's own change. The brief was right about the
code.

**Planned in writing, blind-reviewed by a fresh subagent before any code.**
Two real, substantive findings, both fixed before writing anything:

1. **The plan's own draft would have failed its own gate.** A single
   `propModel(id, seed)` call fed by a variable `id` cannot satisfy the
   literal-string static reachability regex this project already uses for
   `lampPost` (`/propModel\(\s*["']lampPost["']/`) — the source text would
   never contain `propModel("bench"` as a literal substring. Fixed to two
   literal calls, selected by `if`/`else`, before implementing — the review
   caught what would otherwise have been an unwritable or always-red gate,
   the "a mutation that doesn't apply reads as a pass" trap this project's
   own `CLAUDE.md` names explicitly, one level up (a GATE that could never
   have matched, not a mutation).
2. **The single most consequential finding, in the reviewer's own words:**
   copying `scatterStreetLamps`'s positioning technique verbatim (position
   only, never rotation) is correct for a roughly-symmetric lamp post but
   wrong for a bench. A bench's real footprint (`public/prop-manifest.js`'s
   `PROPS.bench`: `w:1.8, d:0.55`) is strongly asymmetric. On a real
   east/west-oriented road span — the OTHER real orientation
   `board-generator.js`'s roads take, which `scatterStreetLamps`'s own
   existing test never exercises (its one long-span test is north/south
   only) — an unrotated bench would sit with its own 1.8 m length running
   ACROSS the road, not along it. Fixed: the placed group now rotates 90°
   around Y on that orientation, derived by hand (Three.js's own Y-rotation
   matrix: local X → world Z, local Z → world −X at θ=π/2) and verified
   correct on the first implementation attempt, not by trial and error.

**Watched red first, for the right reason:** `node test/run.mjs
test/boardRender.test.ts` failed to BUILD (`No matching export ... for
import "scatterStreetFurniture"`) before the function existed.

**Implemented, matching the reviewed plan exactly, plus one more gap the
review named** (the position test only ever exercising the first-placed
item's own footprint, never the second's) — closed with a dedicated test
that derives its own expected offset from `propModel("bin", ...)` directly,
not a hand-computed magic number, so a footprint-reuse bug can't hide
inside a loose numeric tolerance.

**Measured:** `node test/run.mjs test/boardRender.test.ts` — **25/25 pass**
(7 new tests: alternation across both real ids; north/south
position+rotation; east/west position+ROTATION; the second item's own real
footprint used for its own offset; `maxItems`; non-road pieces ignored; the
static reachability gate for both literal calls). `npx tsc --noEmit` clean.
**Deliberately not run this session, named rather than silently skipped:**
the full suite, `test/cityWorld.test.ts`, `test/regressionGate.test.ts`, any
Playwright/`e2e/` spec — all real memory pressure this session's own 2.12 GB
reading does not have headroom for, per the brief's own corrected floor
guidance (full suite only, not targeted runs).

**Mutated, both CAUGHT, both entries in `test/mutations.json`:** forcing the
alternation to always resolve `"bench"` is caught by the dedicated
alternation test. Disabling the rotation (`itemGroup.rotation.y = 0`
unconditionally) is caught by the dedicated east/west-orientation test's
own `rotation.y` assertion — confirmed directly that the SAME test's
position-only assertions do NOT catch this mutation (position math is
unaffected by rotation), so rotation genuinely needed its own, separate
assertion, which is what "confirm red in the test that names it, not merely
somewhere in the suite" (this session's own brief) means in practice, not
just in principle.

**Ticked, committed:** `docs/specs/COMPLETION-PLAN.md`'s B4 line gained this
step's own evidence — still `[!]`: roadkit/typology (decisions #5/#6) and a
third manifest alias (`busShelter`, same pattern, not attempted) remain
open. Commit `9525be6`.

### Guards checked

No merge, no deploy, no push — `main` untouched throughout, never switched
to. Nothing deleted. No process started that would need a PID recorded — the
mutation checks and targeted test run are the only processes this run
spawned, all completed and exited normally. Zero API spend,
`CALIPER_ALLOW_SPEND` never set — nothing in this change touches a
provider. `git commit -F "$env:TEMP\COMMIT_MSG.txt"` with explicit
`git add` paths, never `git add -A`, matching the brief's own PowerShell
constraint (no heredocs, no `&&` — every command run as its own call).

### What this run did not do, named rather than assumed clean

- The full suite, `cityWorld.test.ts`, `regressionGate.test.ts`, and any
  `e2e/` Playwright spec were not run this session — memory-floor exception
  applied per the brief's own corrected guidance, but this means nothing
  this session touched was re-verified against the FULL suite's own,
  broader picture (e.g., whether `test/deadExports.test.ts` — which the
  blind review flagged as a plausible risk if an import were forgotten —
  actually stayed green; the two literal `propModel` calls and the new
  export ARE both genuinely reachable per this run's own targeted checks,
  so this is a low-probability gap, but it is a real, named one, not a
  silent assumption).
- `busShelter` (the manifest's third plain alias, same pattern) was not
  wired — a natural, decision-free next increment, same shape as this one,
  not attempted to keep this step small per `docs/BUILD-LOOP.md`'s own
  "smallest change" principle.
- The visual result was not looked at (`scripts/shoot.mjs` was not run,
  same memory-pressure reasoning as RUN 7). What is verified is the real
  positioning/rotation math, unit-tested against real footprints; what is
  not verified is whether anyone has looked at a screenshot of a bench.

### Next step, named precisely

`busShelter` (`public/props.js`'s third plain alias,
`MODELS["busShelter"]=MODELS["bus-shelter"]`) is the natural next
decision-free B4 increment, identical shape to this one — plan, blind
review, test-first, mutate, commit. Beyond that, B4's remaining real scope
is unchanged from RUN 6's own naming: roadkit/typology (decisions #5/#6,
genuinely Mark's call) and B3's larger remaining scope (switching picking
over, sun/sky extraction).

---

## RUN 9 — `scatterBusShelters`, the manifest's fourth plain alias

Follow-up brief: `busShelter`, same decision-free pattern, mirror
`scatterStreetFurniture` (commit `9525be6`), carry both prior findings
forward. Commit-message path also changed this run: `$env:TEMP\
COMMIT_MSG_b1-land.txt` (lane-specific, replacing the shared path a prior
run found another lane's own message sitting in).

**State verified fresh:** `git status` clean, `HEAD` at `66e0a52`, at-or-
after as required. Free memory **2.64 GB** — under the 4 GB floor, per this
run's own brief that means code-only work with targeted tests, not a stop.

**Brief verified accurate before planning, not assumed:** `public/props.js:4590`,
`MODELS["busShelter"] = MODELS["bus-shelter"]`; footprint `w:3.6, d:1.4`
(`public/prop-manifest.js`) — even more asymmetric than the bench's
`1.8×0.55`; `grep propModel\( public/board-render.js` confirmed nothing
called it before this run.

**Planned in writing, both prior findings carried forward deliberately**
(literal-string `propModel` calls; rotation with its own assertion, not
inferred from position). **Blind subagent review, fresh, before any code**:
confirmed every factual claim in the plan against the real files, found the
approach sound, and named three things:

1. **A wording nit** — `busShelter` is the manifest's FOURTH plain alias,
   not third (`tree` is a VARIED generator, not a plain one; `lampPost`/
   `bench`/`bin` were the first three). Cosmetic, fixed in prose.
2. **Real, already-tracked drift, not this step's fault**:
   `test/testCount.generated.json` will be stale by another +6 tests.
   Regenerating it needs a full suite run — this session's own 2.64 GB
   floor blocks that. Already named via `docs/DECISIONS-FOR-MARK.md` #9;
   not a new problem, not attempted here for the same memory reason RUN 8
   didn't attempt it either.
3. **Real, pre-existing design gap, not introduced here**: the `scatter*`
   functions have no cross-function placement-collision check — lamps,
   furniture, and now shelters can coincide on the same sampled road piece.
   The reviewer traced this to exactly the shape `public/prop-manifest.js`'s
   own header names as the ORIGINAL motivation for the real footprint/
   registry system these `scatter*` functions bypass entirely. Named, not
   fixed — real, separate design work against `board.js`'s own placement
   system, not a small step.

**Watched red first:** `node test/run.mjs test/boardRender.test.ts` failed
to BUILD (`No matching export ... for import "scatterBusShelters"`) before
the function existed.

**Implemented, mirroring `scatterStreetFurniture` exactly** (one manifest
id, no alternation needed) — same shape-aware positioning/rotation
technique, wired into the same `?board=1`-gated block.

**Measured:** `node test/run.mjs test/boardRender.test.ts` — **31/31 pass**
(6 new tests). `npx tsc --noEmit` clean. **Deliberately not run, named
rather than silently skipped:** full suite, `cityWorld.test.ts`,
`regressionGate.test.ts`, any `e2e/` spec — same memory-floor reasoning as
RUN 8.

**Mutated, both CAUGHT — and a real mutation-spec bug found and fixed
during testing itself, not by the review:**

1. Swapping the resolved id to `propModel("bin", ...)` — caught by the
   dedicated real-id test. The reviewer predicted this would ALSO trip the
   static reachability gate (the literal `"busShelter"` substring
   disappears too) — confirmed directly; `_mutcheck.mjs`'s own
   named-failure check (`r.failed.some(n => n.includes(m.expect))`)
   correctly still reports CAUGHT, since the expected test only needs to be
   AMONG the failures, not the sole one.
2. Disabling the rotation — **a first attempt at this mutation was itself
   wrong.** Its `find` string was scoped by TRAILING context (the start of
   the next function's own docblock comment), intended to uniquely target
   `scatterBusShelters`'s own rotation line. But `scatterBusShelters`'s
   docblock immediately follows `scatterStreetFurniture` in the file, so
   that trailing context actually matched `scatterStreetFurniture`'s own
   ending instead — the mutation silently landed on the WRONG function and
   broke the WRONG test. **Reported honestly as `INCONCLUSIVE` by
   `_mutcheck.mjs` itself** (not a false `CAUGHT`) — this is the tool
   working exactly as designed: `named = r.failed.some(n =>
   n.includes(m.expect))` requires the SPECIFIC named test to be among the
   failures, and it wasn't. Diagnosed, fixed by re-scoping the `find`
   string with LEADING context unique to `scatterBusShelters`'s own body
   (its own material colour constant, `0x557799`) — caught correctly on the
   second attempt. Both entries in `test/mutations.json`, the mutation-spec
   bug and its fix named in the CAUGHT entry's own `note` field, not
   hidden.

**Ticked, committed:** `docs/specs/COMPLETION-PLAN.md`'s B4 line gained this
step's own evidence — still `[!]`. Commit `a9ceed2`.

### The manifest checked in full, per the brief's own instruction not to assume there's always another one

`public/props.js`'s own `MODELS[...]=` alias table read completely (not
just the "furniture" section): five plain aliases total — `bench`, `bin`,
`busShelter`, `lampPost`, `railTie`. Four are now wired. **`railTie` is the
last, but is NOT confirmed to be the same decision-free pattern** —
`public/city-render.js` (the OLD render path) already references it
(`stats.railTies = ties.length`), and per a separate lane's own props
survey (found this session via the shared-then-lane-specific commit-message
temp file, and independently re-confirmed here by reading the actual
source rather than taken on trust from that survey alone): rail ties render
as a continuous strip mesh in the old world, an architectural choice, not
the "nothing scatters this yet" gap bench/bin/busShelter all were. Porting
that to the board path is real, separate design work — not a blind mirror
of this step's own approach.

### Guards checked

No merge, no deploy, no push — `main` untouched. Nothing deleted. No
process killed — none started that needed one. Zero API spend,
`CALIPER_ALLOW_SPEND` never set. `git commit -F
"$env:TEMP\COMMIT_MSG_b1-land.txt"` (the new lane-specific path), content
verified (`head -3`) immediately before every commit call, `git add` with
explicit paths only, PowerShell throughout — no heredocs, no `&&`.

### Next step, named precisely, not assumed to exist

**No more free, decision-free `scatter*` increments remain in the plain-
alias manifest.** The next real B4 work is one of: (a) `railTie` — needs its
own investigation of what the old world's continuous-strip treatment
actually does before any plan can be written, not a mirror of this
session's own pattern; (b) roadkit/typology, decisions #5/#6, genuinely
Mark's call; (c) the cross-function placement-collision gap this run's own
blind review named (§ above) — real, separate design work against
`board.js`'s own reservation system; (d) B3's larger remaining scope
(switching picking over, sun/sky extraction), unchanged from RUN 6.
Whoever picks this up next should not assume "find another manifest alias
and mirror the pattern" is still available — this run checked, and it
isn't.
