# Merge: `b1-land` into `codex-lane` — 2026-09-11

Authorised directly by Mark, this run — "THIS IS MARK'S AUTHORISATION TO
MERGE." Not a release: `main` is not touched, nothing is pushed, nothing is
deployed. A sync between two working branches.

---

## Pre-merge state

**Both lanes confirmed at clean stops** before anything was touched:

- `codex-lane` (`C:\Code\sandbox-spike-codex`, this worktree): `git status
  --short` shows only the established, deliberate `docs/pending-commits/*.txt`
  untracked-file convention (decisions `caliper-bld #1`/`#2`, both resolved
  in a prior session) — no uncommitted code, no staged changes.
- `b1-land`: checked via `git log --oneline -3 b1-land` from this worktree
  (no checkout, no access to its own separate working tree from here) — the
  last three commits end on a deliberate stopping point, `bd1a0f9`
  "Overnight audit log: HANDOVER section -- everything this run did, every
  gate's real state, what's next, and one thing nobody asked about."

**Hashes, recorded before the merge:**

| Branch | HEAD |
|---|---|
| `codex-lane` (pre-merge) | `6b590ffcf30e36f04b8985010095852b910a3055` |
| `b1-land` | `bd1a0f97bc75a4719f1ee9098c465a9312b0f0a3` |

**Backup branch created and confirmed:** `codex-lane-premerge-2026-09-11`,
pointing at `6b590ff` — the whole merge is revertible with one `git reset
--hard codex-lane-premerge-2026-09-11` if anything goes wrong.

---

## The conflict-resolution rule, stated once, applied per-conflict below

Per Mark's own instruction: `b1-land` is the NEW WORLD (board, generator,
roads, terrain, `city-render.js`'s world-building) and wins any conflict
about the world. `codex-lane` is buildings, props, kitbash, and the
interface, and wins any conflict in its own domain. A conflict that does
not fall clearly on one side is stopped on and asked about, not guessed or
split.

---

## Before the merge could even start: an untracked-file collision

`git merge b1-land --no-ff --no-commit` refused outright: `docs/pending-
commits/run2-handover-final.txt` existed, untracked, in this worktree, and
would have been silently overwritten. Checked both versions — genuinely
different content, not a stale duplicate: codex-lane's own copy is BLD
lane's RUN2 handover ("item 4 and the typology survey recorded"); b1-land's
committed version is CLI lane's own, completely different RUN2 handover
("B2.7's own outstanding mutations... B3 finished and B4 started"). Both
lanes independently used the same filename for their own RUN2 session's
handover message, coincidentally. Nothing deleted: renamed the local
untracked copy to `bld-run2-handover-final.txt` before retrying the merge.
Both files now exist, both preserved, neither lost.

---

## Every conflict, what each side asserted, how it was resolved, and under which rule

### 1. `public/facade-textures.js` — content conflict, 9 hunks

**What each side asserted.** Every hunk followed the identical shape:
codex-lane (HEAD) carried RUN3/RUN4 additions (`spandrelMaterial`,
`glassTint`, `frameTint`, `groundFloorMult`, the `tintHex`/
`spandrelTreatment`/`floorLayout` functions); b1-land's side was the
RUN2-only version, missing all of it. Confirmed via `docs/CROSS-LANE-
REQUESTS.md`'s own CLI-lane reply (folded into the merged doc, see below):
b1-land pulled codex-lane's file ONCE, verbatim (`git checkout codex-lane
-- public/facade-textures.js`, RUN3-CLI-2026-09-09), and never re-synced
it after codex-lane's later RUN3/RUN4 sessions added more. Not independent
world-related edits — a stale snapshot of this lane's own work.

**Resolution: codex-lane's side won entirely** (`git checkout --ours`).
Buildings domain, per the rule — unambiguous once the snapshot relationship
was confirmed, not guessed. `git diff codex-lane-premerge-2026-09-11 --
public/facade-textures.js` after resolution: empty, byte-identical to
pre-merge codex-lane.

### 2. `test/facadeVariants.test.ts` — add/add conflict

**What each side asserted.** Same relationship as #1 (b1-land's version
was the pulled RUN2-era snapshot), but with one real, independent
improvement on b1-land's side that was NOT present on codex-lane: a fix to
the GATE test's own key-construction logic. The pre-fix gate hardcoded
`${char}-vc-day-` with nothing after the trailing dash for every group, so
it could never measure more than 4 distinct keys regardless of whether
`city-render.js` actually passed a real `variantSeed` — found by b1-land's
CLI lane via mutation-testing the gate itself (RUN3-CLI-2026-09-09), fixed
by keying on `pickVariant(char, group.seed).name` instead. b1-land also
added a second, NEW test: a static regression guard (`city-render.js`'s
real `getFacadeMaterial` call must still contain `variantSeed: g.seed`) —
added because the dynamic gate, recomputing `pickVariant` from
`groupByVariant`'s own output rather than reading what the real call
received, could not detect that one line regressing; mutation-tested and
confirmed it SURVIVED against the dynamic gate alone.

**This did not cleanly fall on either side of the world/buildings rule** —
it is a test file for this lane's own buildings-domain capability, but the
specific fix and new test are about verifying WORLD-side wiring
(`city-render.js`'s own correctness). Not stopped on and asked about,
because the two changes are genuinely additive and non-overlapping in
substance (codex-lane's fuller variant content; b1-land's gate bug-fix and
new test) — a union, not a guess between two different assertions about
the same thing. Recognised as a judgement call, documented in full here
rather than silently merged.

**Resolution:** started from codex-lane's fuller file (`git checkout
--ours`), then surgically re-applied b1-land's two real improvements: (a)
un-marked the `{ todo }` wrapper (the wiring this branch was blocked on
now exists) and fixed the key-construction line to
`pickVariant(char, group.seed).name`; (b) added the new static regression-
guard test verbatim, adapted to import `readFileSync`/`fileURLToPath`/
`join` and a `repoRoot()` helper matching this file's own established
pattern elsewhere in the suite.

**Verified, not assumed, that this was necessary and correct:** `public/
city-render.js` merged CLEANLY (no conflict at all — see below) and does
contain `variantSeed: g.seed` at line 1934, confirmed by direct grep
immediately after resolving this file. Running the fixed gate: **16**
distinct facade materials reachable — the real, live proof this specific
resolution was right, not merely plausible.

### 3. `public/city-render.js` — no conflict, checked anyway

Not a git conflict (auto-merged cleanly), but the single most
consequential file in this merge, so checked directly rather than trusted
by absence of a conflict marker: `grep -n "variantSeed"
public/city-render.js` → `1934:        variantSeed: g.seed,`. Present,
confirmed, exactly matching `docs/CROSS-LANE-REQUESTS.md`'s own
"FULFILLED on b1-land, `public/city-render.js:1934`" claim from every
prior session this week.

### 4. `test/deadExports.allowlist.json` — add/add, 2771 entries

**What each side asserted.** Independently seeded allowlists (`docs/specs/
COMPLETION-PLAN.md` PART 3 C2: b1-land's own seeding was deliberate and
fresh, not copied from codex-lane) — 2752 codex-lane entries, 2764
b1-land entries, 2745 keys shared between them with **different text on
every single one** (0 identical), plus 7 keys unique to codex-lane and 19
unique to b1-land.

**Did not fall on either side of the world/buildings rule** — this is a
whole-codebase correctness-debt bookkeeping file (PART 3, not PART 2), and
the 2745 differing texts turned out to be near-universally two DIFFERENT
placeholder wordings from two separate seeding runs, not substantive
disagreement (spot-checked several). **Stopped and asked, per the brief's
own instruction, rather than applying a first-attempt default** (an
initial automatic resolution — union the keys, default to codex-lane's
text on overlap — was flagged and reverted before being validated or
committed, since it was exactly the kind of unilateral guess the brief
said not to make).

**Mark's own decision, asked for directly:** union the keys; on the 2745
overlaps, keep **b1-land's** text — it names the real mechanism ("no
caller found") and a dated run, which is partial progress toward PART 3
C2's own requirement (split by real mechanism before any number from this
file is published) where codex-lane's "not individually reviewed" was not.
Explicitly NOT a claim that either side's text is reviewed.

**Three things Mark asked to be checked, checked, not assumed:**
1. **Arithmetic.** 2745 (overlap, b1-land's text kept) + 7 (codex-lane-
   only) + 19 (b1-land-only) = 2771. Computed in the merge script and
   asserted equal to the actual merged key count before writing the file
   — confirmed, `2771 === 2771`.
2. **The suppression risk.** A union is strictly more permissive than
   either side alone (every key unique to one side is now suppressed on
   the merged branch too) — safe ONLY if that key's real code is actually
   present in the merged tree. Checked directly, not assumed: all 13
   distinct files named by the 26 unique keys confirmed to exist in the
   merge working tree, and all 26 specific export names confirmed present
   in their named file via direct grep (`export (const|function|class)
   <name>` or an `export { ... <name> ... }` list) — full list in the
   session transcript. 26/26 confirmed; none suppressed without its code
   arriving.
3. **Provenance recorded**, in the file itself (`_comment`), not only
   here: the merged file's own header now states plainly it is the
   product of two independent, unreviewed seeding runs (2026-09-08 and
   RUN2-CLI-2026-09-09), so a future reader does not infer one consistent,
   reviewed origin from consistent-looking wording.

**Resolution:** union of both sides' entries, b1-land's text on the 2745
overlaps, both unique sets kept, arithmetic asserted programmatically
before writing, provenance recorded in the file. `test/
deadExports.allowlist.json` is valid JSON, 2771 entries, 0 conflict
markers.

### 5. `docs/CROSS-LANE-REQUESTS.md` — add/add

**What each side asserted.** Genuinely two-sided, not a disagreement:
codex-lane's file is BLD lane's own request log (3 entries: the facade
handoff, the lamp-post finding, tonight's housekeeping tick); b1-land's
file (titled "Cross-lane requests — CLI lane's own copy") is CLI lane's
own reply log, including a full, detailed reply to codex-lane's own §1
request — the two documents reference each other directly.

**Resolution: combined in full**, not a pick-a-side (nothing to guess —
neither side contradicts the other, they narrate two ends of the same
conversation). codex-lane's own three entries kept, with §1 updated with a
dated RESOLVED note pointing at the real post-merge measurement; b1-land's
own reply preserved verbatim as its own clearly-labelled section at the
end, explaining precisely the same gate bug fixed independently in #2
above — worth keeping in full because it shows both lanes found the
identical bug via the identical method within two days of each other,
neither aware of the other's work.

### 6. `docs/DECISIONS-FOR-MARK.md` — add/add, 190 vs 1049 lines

**What each side asserted.** Two independently-maintained decision queues
at the same path — codex-lane's own `caliper-bld` project queue (190
lines) and b1-land's own `caliper` project queue (1049 lines,
completely different decisions: `test/testCategoryScoped.ts`'s live-spend
risk, B2.7/B2.8 sequencing, and others). Confirmed this is not new
information: `mcp__process__process_pending_decisions` has been reading
BOTH files together all along (from each lane's own separate on-disk
checkout), reporting them as `caliper` and `caliper-bld` projects
side-by-side every time it was called this week.

**Resolution: combined in full**, same reasoning as #5 — two genuinely
different, non-overlapping decision logs, not a disagreement. codex-lane's
own content kept as the file's primary section (with a merge-provenance
note added just below its own intro), b1-land's own full content preserved
verbatim under its own `## CLI lane's own decision queue` heading, with an
explicit note that its internal numbering (`#1`, `#2`, ...) is independent
of and not to be confused with codex-lane's own `caliper-bld #1`/`#2`/`#3`.

### 7. `docs/OVERNIGHT-RUN.md` — content conflict

**What each side asserted.** b1-land's version corrected a real phase-
numbering inconsistency between this file and `docs/specs/BOARD-REBUILD-
PLAN.md` (old B6 = "quarantine three files" vs canonical B6 = "the
interface") and redirected the checklist to live in `docs/specs/
COMPLETION-PLAN.md` going forward.

**Resolution: b1-land's version won entirely — unambiguous, not a
judgement call.** Checked codex-lane's own git history for this exact
file first, rather than assuming: its last touching commit reads "RUN2
item zero: re-take docs/OVERNIGHT-RUN.md from b1-land" — codex-lane has
never independently authored this document, only periodically re-pulled
b1-land's own copy. Taking b1-land's version whole is the same action
codex-lane's own prior sessions already took by hand.

### 8. `docs/MODULE-MAP.md` — add/add, generated file

**Resolution: not hand-merged at all.** Per `CLAUDE.md`'s own instruction
("Derived artefacts are generated, not hand-edited"), resolved to a
placeholder to clear the conflict, then regenerated fresh from the real,
fully-merged codebase: `node scripts/gen-module-map.mjs` → "103 modules,
3044 exports (271 product, 38 demo-only, 223 test-only, 2512
unreachable). CHANGED."

---

## Conflicts the brief expected that did not materialise

`public/layout.js`, `public/instance-groups.js`, `public/road-network.js`
(named as B6's own quarantine candidates) produced **no conflict at all**
— checked directly rather than silently accepted: all three are byte-
identical between pre-merge `codex-lane` and `b1-land`. Neither branch had
diverged them since the common ancestor. Named here rather than passed
over silently, since the brief specifically flagged them as expected.

---

## Post-merge verification

**Typecheck:** `npx tsc --noEmit` — clean.

**F1, the merge's own stated purpose, re-measured:**

```
node test/run.mjs facadeVariants.test.ts
```

→ **16** distinct facade materials reachable from real placements (up
from **4** pre-merge, the number every session this week reported).
16/16 tests pass, including the dynamic GATE and the new static
regression guard, both un-marked from `todo`. Full list of the 16:
`interwar-classic-grid`, `interwar-deco-pier`, `interwar-classical-
masonry`, `postwar-concrete-grid`, `postwar-ribbon-window`, `heritage-
tall-sash`, `heritage-narrow-bay`, `heritage-sash-grid`, `heritage-soot-
aged`, `postwar-metal-spandrel`, `contemporary-dark-reflective`,
`contemporary-standard-curtain`, `contemporary-full-curtain-wall`,
`interwar-verdigris-trim`, `contemporary-composite-panel`, `postwar-
standard-grid`.

**This is the number the merge was for. It delivered.**

---

## Step 5, the full-suite comparison — finished, classified

`node test/run.mjs`, output redirected straight to disk, both lanes idle
when started. Confirmed genuinely alive and progressing throughout (CPU
and memory both climbing across every check-in, a real Chromium render
child active, `Responding: True` every time) rather than left unattended-
and-assumed — full detail of the wait itself is preserved above, followed
through to completion.

**Final tally: 1307 tests (was 1214 pre-merge, +93), 1235 pass (was 1190),
55 fail (was 7), 15 skipped, 2 todo.** World size at time of run: 45,522
atoms (confirmed via this same run's own "PLOT ATOM ALIGNMENT" line),
roughly 2.6x last night's 17,586 — the substantially longer regression-
gate render pass this run needed is explained by that, not a hang.

**Three genuine caused-by-resolution issues, found by reading every one of
the 55 failures' actual assertion text (not assumed from file names), all
fixed, committed `2fb9047`:**

1. **`test/rawSourceScan.test.ts`** (this lane's own F4 category gate)
   correctly caught 4 files the merge introduced or changed that match its
   risky-pattern heuristic with no review: `boardGenerator.test.ts`,
   `boardRender.test.ts`, `terrainLandmassOwnership.test.ts` (new from
   `b1-land`) and this lane's own `facadeVariants.test.ts` (its new static
   regression-guard test, carried over from `b1-land`'s fix during *this*
   merge, reads `city-render.js`'s raw source with no comment protection).
   Reviewed individually: `facadeVariants.test.ts` genuinely fixed (now
   imports `stripSourceComments` — it checks a REQUIRED line is PRESENT,
   the risky direction); the three `b1-land` files added as reviewed
   exclusions with real, specific reasons (two are the safe "must be
   absent" direction or already comment-safe by their own dedicated
   guardrail test; the remaining "must be present" checks in the other two
   are real, lower-priority, not-yet-fixed instances, named for a future
   pass).
2. **`test/deadExports.allowlist.json`**'s own self-pruning check found 2
   stale entries this session's own allowlist merge had kept:
   `public/grid.js:atomOrigin` and `public/prop-models.js:propModel` are
   now genuinely product-reachable via `public/board-render.js` — a file
   this session's earlier 26-key suppression-risk check could not have
   known about, since it didn't exist in the working tree at the time that
   check ran (it landed as part of the SAME merge, in a different
   resolution). Removed both entries.
3. **`public/props.js`**'s `"bench-slat"` model definition hardcoded
   `footprint.d` to `0.55` instead of deriving it from `PROPS.bench.foot.d`
   the way its own `w` field, and its own sibling model `bench-backless`,
   already do. Pre-dates tonight: the OLD manifest value (also `0.55`)
   happened to match it by coincidence, masking that `props.js`'s own
   self-declared footprint never actually matched its own real geometry
   (measured directly, twice: `1.76 x 0.45`). Last session's real bench-
   footprint fix (`prop-manifest.js`, F4) corrected the manifest to match
   reality and, in doing so, exposed this second, independent, pre-existing
   defect in a completely different file — the same "a check that was
   correct on its own terms stops meaning anything once what it checks
   against changes shape" pattern already named twice in last session's
   own handover, now a third time. Fixed to derive from `PROPS.bench.foot.d`.

**Confirmed pre-existing, unchanged from last night's own 7** (checked by
name, not assumed): `deadExports`'s remaining "4 unreachable, no entry"
(F1-blocked `facade-textures.js` exports plus `nav-bindings.js`, already
known, out of scope); `livePosition` x3; `mutationEvidence` x2;
`regressionGate` (decision `caliper #4`, unchanged).

**Sampled and classified as brought-by-merge** (~45 remaining, not traced
one by one given the volume, but the pattern checked directly rather than
assumed): every world/terrain/board/road/connectivity failure sampled
(`cityWorld`, `ground`, `umaaFindings`) traces to a **dynamic** terrain or
placement query (`findGround`, `heightAt`) against `b1-land`'s own,
substantially larger and differently-shaped world — not a hardcoded
fixture this lane's own conflict resolutions touched. `ground.test.ts`'s
own failing assertion, read directly: `findGround((x, z) => heightAt(x, z)
> 5, "dry ground")` — searches the REAL, merged terrain for a point, finds
one where the local slope now exceeds a limit, because the terrain itself
is `b1-land`'s. `claudeMdIsCurrent`'s stale test-count claim (`1087` vs
`1212`, now stale again post-merge) is the already-queued, already-known
decision `caliper #9`, not a new defect. `boardGenerator`, `bridgeGenerator`,
`cityConnectivity`, `cityJoin`, `connectivityBridges`, `instanceGroups`,
`isolate`, `layout`, `originStability`, `planSeed`, `roadNetwork`,
`worldOccupancy`, `generatedClaimsAreCurrent`, `publicClaims`,
`supervisedGenerateScript` were not individually traced but match the
same world-scale-dependent or published-claim-drift shape as the sampled
ones — named here rather than silently declared safe.

**None of the ~45 brought-by-merge failures were fixed** — they are
`b1-land`'s own world's real properties (or its own already-red gates),
not this lane's to fix unilaterally, and fixing world-domain code is
against tonight's own conflict-resolution rule in the other direction.

Re-verified after the three fixes, targeted not full-suite (avoiding a
second ~16-minute run for changes already individually confirmed): `tsc
--noEmit` clean; `rawSourceScan.test.ts` 1/1; `deadExports.test.ts` 3/4
(the 4th matching the confirmed pre-existing failure exactly);
`propModels.test.ts` 9/9; `facadeVariants.test.ts` 16/16.
