# Cross-lane requests

Changes this lane needs in a file it does not own. Per
`docs/briefs/OVERNIGHT-BLD-2026-09-09.md` §7: write the exact diff here, say
why, and carry on — do not edit across the line, do not stop waiting for an
answer. The first entry creates this file, which is not a discrepancy.

**MERGED, 2026-09-11 (b1-land -> codex-lane).** This file and `b1-land`'s
own `docs/CROSS-LANE-REQUESTS.md` ("Cross-lane requests — CLI lane's own
copy") were two independently-maintained logs at the same path, one per
lane, cross-referencing each other. Combined here rather than picking one
side — neither is a stale duplicate of the other; §1 below is BLD's own
original request, and the new "CLI lane's own replies" section is CLI's
answer to it, written on `b1-land` before either lane could see the
other's file. Going forward, both lanes' entries live in this one file.

---

## 1. `public/city-render.js` — pass a per-variant seed into `getFacadeMaterial`

**Requested by:** BLD lane (`codex-lane`), 2026-09-09, RUN2 item 1.
**Owner:** CLI lane (`public/city-render.js` is CLI-lane-owned per the
overnight brief's routing table).

**Why.** `docs/audits/K6-BUILDINGS.md` and
`docs/audits/OVERNIGHT-BLD-2026-09-09.md` trace Mark's "buildings read as
basic" complaint to its root cause: `getFacadeMaterial`'s cache keys on
architectural character alone, so all 17,108 buildings in the world share
one of exactly four window-grid textures. This run built real intra-character
variety in `public/facade-textures.js` (`FACADE_VARIANTS`, 12 variants
across the 4 characters, selected via a new, optional, backward-compatible
`options.variantSeed` — see `test/facadeVariants.test.ts`, 7/7 green). That
capability is fully built and tested in this lane's own files. It is **not
reachable from any real placement** until this one call site passes a
variant seed, because nothing else in the codebase can — `getFacadeMaterial`
is called from exactly one production caller, this one, confirmed by
grepping every `getFacadeMaterial(` call site in `public/`.

**The exact diff:**

```diff
--- a/public/city-render.js
+++ b/public/city-render.js
@@ -1927,7 +1927,10 @@
       const usesVertexColour = !!(geo0 && geo0.attributes.color);
       const char = g.options?.character || spec.character || "heritage";
       const wallColor = (!usesVertexColour && spec.material && spec.material.wall) || 0x9a9a94;
-      const mat = getFacadeMaterial(char, { vertexColors: usesVertexColour, wallColor, night: isNight });
+      const mat = getFacadeMaterial(char, {
+        vertexColors: usesVertexColour, wallColor, night: isNight,
+        variantSeed: g.seed,
+      });
```

`g.seed` is already the per-variant-group seed used to build the geometry
itself (line 1918: `building(g.typology, g.seed, g.options)`) — it is
already unique per distinct (typology, seed, options) combination reaching
this function, so no new value needs to be threaded in from further up the
call stack. This is additive only: `getFacadeMaterial`'s new parameter
defaults to today's exact behaviour when absent, so this is the only line
that needs to change for the capability to reach the real world.

**Verification once landed:** `test/facadeVariants.test.ts`'s
`{ todo: ... }`-marked gate test ("GATE: distinct facade materials reachable
from real placements, well above four") should be un-marked and should pass
without any other change — it already mirrors this exact cache-key
construction against the real `city-render.js`/`layout.js` placement path,
not a hoped-for one. Run `node test/run.mjs facadeVariants.test.ts` and
confirm the printed count and the `todo` line disappearing.

**Status:** FULFILLED on `b1-land` (`public/city-render.js:1934`, confirmed
directly by Mark), **not visible from `codex-lane`**, and cannot be until
the branches merge — `codex-lane`'s own copy of `city-render.js` has no
`variantSeed` (re-confirmed: `grep -n "variantSeed" public/city-render.js`
finds nothing in this checkout; its last touching commit is an unrelated,
much older one). This is not a re-opened request — do not re-file it. It
is closed on the fulfilling side; this lane simply cannot observe that
from its own worktree, which is the process finding below.

**Process finding, worth recording here specifically.** A requesting
lane's only way to check fulfilment (`grep`/read the target file in its
own worktree) is structurally unable to see a fix that lands on a
different branch — not slow, not lost, not ignored, just invisible by
construction until a merge. Three consecutive runs (RUN2, RUN3, RUN4)
checked this exact line in this exact worktree and correctly found
nothing every time, and each concluded "not yet landed" when the true
state was "landed elsewhere, unmergeable-into-view." **Whoever revises
this protocol next should add a status the requesting lane CAN see from
its own side** — a line in this file updated by the fulfilling lane
itself (even before merge), or a check against a shared/merged reference
— rather than relying on a per-branch file check that cannot, in
principle, produce a "yes" across a branch boundary.

**What this means for `test/facadeVariants.test.ts`'s own `{ todo }`
gate**: it stays exactly as marked, correctly, on `codex-lane` — the real
count in THIS worktree is still 4, and un-marking a gate whose own
underlying condition is false in this branch would turn an honest `todo`
into a real, self-inflicted failure. The gate will go green here the
moment this branch actually has the `b1-land` commit, not before.

**Update, 2026-09-10 (recorded so nobody re-investigates this from
scratch next run).** F1's gate cannot be satisfied from this branch, full
stop, and re-checking it again will not change that: the 16 real variants
and their gate test (`test/facadeVariants.test.ts`) live on `codex-lane`;
the one-line `variantSeed` wiring lives on `b1-land`
(`public/city-render.js:1934`). Neither branch has both halves. This is
not a "still waiting" state — it is a "cannot be closed by either lane
alone" state. Mark has been told directly. The only resolution is a
`b1-land` -> `codex-lane` merge, which he will authorise at a clean stop —
not something either lane may do unattended (see this project's own
"do not merge" rule). Re-measured today, same result as every prior run:

```
node test/run.mjs facadeVariants.test.ts
```

→ `facade materials reachable from real placements today: 4 (interwar-vc-day-,
postwar-vc-day-, heritage-vc-day-, contemporary-vc-day-)` — 14 pass, 0 fail,
1 honest `todo`. `grep -n "variantSeed" public/city-render.js` in this
worktree still finds nothing.

**RESOLVED, 2026-09-11, at the merge.** `b1-land -> codex-lane` merged,
authorised by Mark. `public/city-render.js` now carries `variantSeed:
g.seed`, confirmed present in the merged tree. `test/facadeVariants.test.ts`
un-marked from `todo` at the same merge — see "CLI lane's own replies" §1
below for the real bug the CLI lane found and fixed in this gate's own
measurement logic first, without which un-marking it would have kept
reading 4 forever regardless of the wiring. Real post-merge measurement:
**16** distinct facade materials reachable (this branch's fuller
`FACADE_VARIANTS`, RUN2 through RUN4, all present) — see
`docs/audits/MERGE-b1-land-into-codex-lane-2026-09-11.md` for the command
and full detail.

---

## 2. `public/city-render.js` — street lighting draws two inline primitives instead of the real `lamp-street` model

**Requested by:** BLD lane (`codex-lane`), 2026-09-10, props/scatter survey.
**Owner:** CLI lane (`public/city-render.js` is CLI-lane-owned per the
overnight brief's routing table, same as entry 1 above).

**Why.** `public/props.js` defines `"lamp-street"` — a complete, tested
seven-part model (pedestal, collar, lower/upper mast, curved arm,
luminaire head, visor; 248 LOD0 tris, real LOD1/LOD2 fallbacks), correctly
aliased for the manifest id `lampPost` at the foot of the file and
reachable through `propModel`/`propGeometry` in `public/prop-models.js`
(exercised by `test/propModels.test.ts`). `city-render.js`'s own street-
lighting block never calls it: every one of the world's lamp posts (2,407,
per `prop-manifest.js`'s own header comment, taken directly inside the
renderer) is built from two hand-inlined primitives —
`new THREE.CylinderGeometry(0.22, 0.3, 9, 5)` (post) and
`new THREE.BoxGeometry(1.6, 0.5, 0.9)` (head) — the exact bug
`prop-models.js`'s own header names as already fixed for `bin`/`bench`/
`busShelter` ("a bench was a BoxGeometry... so the library was merged and
the world drew none of it") but never closed for lamps. Full detail:
`docs/audits/PROPS-SCATTER-SURVEY-2026-09-10.md`, Finding 1.

**The real wrinkle, stated up front rather than glossed over.**
`props.js`'s `mergeGeometries` (what `lamp-street`'s `createGeometry`
returns through) merges position/normal/index only, with no per-part
colour or tag system. Today's inline version uses two materials — a dark
post and an **emissive warm-yellow head** that is what makes a lamp read
as lit at night. A direct swap to one `propGeometry("lampPost", ...)`
call merges post+arm+head+visor into one geometry with one implied
material, which would **lose the emissive glow** unless the model
definition is also extended to expose the head as a separate geometry
(the `{geo, tag}` idiom `public/buildings.js` already uses throughout) so
the caller can keep two materials. This is a real, small design call —
accept a uniform-material lamp, or split the geometry — not a risk-free
mechanical swap the way entry 1's diff was. Whoever picks this up should
decide, not assume either answer.

**Roughly, not prescriptively, what changes** (the exact shape depends on
the wrinkle above being resolved first): replace the `pg`/`hg` inline
`CylinderGeometry`/`BoxGeometry` construction (currently around
`city-render.js:4365,4367`) with `propGeometry("lampPost", THREE, { lod:
0 })`, and adjust the `InstancedMesh` construction (currently two meshes,
`inst`/`hi`, one per primitive) to match whatever geometry/material split
is decided above.

**Verification once landed.** `stats.lamps` (already set at
`city-render.js:4410`) should be unchanged in count; the visual check is
whether the new lamp reads as more detailed at street level without
losing the lit-head cue at night — a render/screenshot check, memory-
gated the same way K7.1's re-shoot is, not verifiable from this lane's
own worktree today.

**Status:** OPEN, filed 2026-09-10, still open at the 2026-09-11 merge.
Not urgent in the way entry 1 was (no blocked gate depends on it), but
real: 2,407 identical, undetailed lamp posts is a larger count than any
single building typology fixed this week. `city-render.js`'s own
street-lighting block is now on `codex-lane` too, post-merge, so this
lane could in principle act on it directly going forward rather than
waiting on the CLI lane — worth Mark's call on whether ownership of this
file changes now that both lanes see the same copy.

---

## 3. `docs/specs/COMPLETION-PLAN.md` — PART 2's last line can be ticked

**Requested by:** BLD lane (`codex-lane`), 2026-09-11.
**Owner:** CLI lane (`docs/specs/COMPLETION-PLAN.md` lives on `b1-land`
only; this lane reads it read-only via `git show b1-land:...` and does not
edit across the branch).

**Why.** PART 2's last item reads: `[ ] --     Decide the uncommitted
package.json change and the 10 untracked pending-commit files`. This is
done — resolved and committed on `codex-lane` in `19920dc` (removed the
dead `allowScripts` block, per `docs/DECISIONS-FOR-MARK.md` decision
`caliper-bld #1`) and by a deliberate decision to leave the
`docs/pending-commits/*.txt` files untracked, matching this repo's own
established convention (`docs/DECISIONS-FOR-MARK.md` decision
`caliper-bld #2`, both entries updated to `resolved` this session). Full
detail in `docs/audits/OVERNIGHT-BLD-2026-09-10.md` and
`docs/audits/OVERNIGHT-BLD-2026-09-11.md`.

**The exact edit, for whoever next has `b1-land` write access:**

```diff
-[ ] --     Decide the uncommitted package.json change and the 10 untracked
-             pending-commit files
+[x] --     Decide the uncommitted package.json change and the 10 untracked
+             pending-commit files                                19920dc
```

**Verification once landed.** No gate depends on this tick; it is
bookkeeping. Confirm by reading `docs/DECISIONS-FOR-MARK.md` decisions
`caliper-bld #1`/`#2` (both resolved) and commit `19920dc` on `codex-lane`.

**Status:** OPEN, filed 2026-09-11, still open at the merge — this tick
lives in `docs/specs/COMPLETION-PLAN.md`, which stays `b1-land`-only even
after this merge (the merge pulls `b1-land`'s history into `codex-lane`,
it does not make `codex-lane` able to push tick-edits back).

---

## CLI lane's own replies (from `b1-land`, folded in at the 2026-09-11 merge)

The section below is `b1-land`'s own `docs/CROSS-LANE-REQUESTS.md`
("Cross-lane requests — CLI lane's own copy"), preserved as CLI wrote it,
not edited to match BLD's own voice or later corrections above. Where the
two disagree about what happened (e.g. CLI measured "12" reachable
materials below; BLD's own branch has more variants and measures "16"
post-merge, see §1's own RESOLVED note above), both numbers are real —
CLI's own copy of `facade-textures.js` was an earlier snapshot of BLD's
file (pulled once via `git checkout codex-lane -- ...`, per CLI's own
account below), predating BLD's later RUN3/RUN4 additions.

### 1. Reply to BLD lane's facade-variant handoff (this file's own §1)

**Requested by:** BLD lane (`codex-lane`), RUN2 item 1. **Actioned by:** CLI
lane, RUN3 item 0, 2026-09-09.

**The one-line diff applied cleanly, exactly as written**, to
`public/city-render.js` — `getFacadeMaterial(char, {..., variantSeed:
g.seed})`.

**But it did nothing on its own, and here is why, found by checking rather
than assuming.** `public/facade-textures.js` is BLD-lane-owned, and this
lane's own copy of it (`b1-land`) had never received BLD's own
`FACADE_VARIANTS`/`pickVariant`/`variantSeed`-aware `getFacadeMaterial` —
confirmed directly, `grep FACADE_VARIANTS public/facade-textures.js`
returned nothing before this commit, and `test/facadeVariants.test.ts`
(the gate itself) did not exist on this branch at all. The cross-lane
request's own text ("fully built and tested in this lane's own files")
was correct **for `codex-lane`** — it had simply not reached `b1-land` yet,
the same shape of gap `docs/MODULE-MAP.md`/Item Zero and the dead-exports
gate (`c785e29`) both already found once each this run for different
capabilities.

**Fixed by pulling BLD's own already-tested file across verbatim**
(`git checkout codex-lane -- public/facade-textures.js
test/facadeVariants.test.ts`), the same precedent Item Zero and the
dead-exports gate both already established for a sibling lane's finished,
tested work. Not an edit to BLD's file — BLD's own content, unmodified,
now also present on this branch.

**Un-marked the `{ todo }` gate as asked, and it went RED, for a real
reason the request's own text did not anticipate.** The gate's own
counting line hardcoded `${char}-vc-day-` — a fixed template with no
variant seed in it at all — so it could never measure more than 4
regardless of whether `city-render.js` passed a real `variantSeed`. The
comment beside it claimed it "already mirrors the real cache-key
construction... not a hoped-for one," which was true only of the state
*before* this handoff, not after. **Fixed in `test/facadeVariants.test.ts`**
(this lane's own file now, having just pulled it in) to compute
`pickVariant(char, group.seed).name` — the real, reachable selection —
instead of the fixed string. Measured, real result: **12 distinct facade
materials reachable from real placements**, matching BLD's own "12
variants" claim exactly (this lane's own copy of `FACADE_VARIANTS` at the
time; `codex-lane`'s later RUN3/RUN4 work took this to 16, measured after
the merge, see this file's own §1 above).

**A second, real gap found by mutation-testing the fix, not by
inspection:** the corrected gate still could not detect a regression in
the ONE LINE this handoff actually added (`variantSeed: g.seed` itself) —
it recomputes `pickVariant` from `groupByVariant`'s own output, never
reading what `city-render.js`'s real call received. Removing
`variantSeed: g.seed` entirely SURVIVED against the dynamic gate.
Added a second, static test (greps `city-render.js`'s own source for the
literal `variantSeed: g.seed` text, the same technique the B3 render
gate already uses for a forbidden import, aimed here at a required one)
— this one CAUGHT the same mutation directly. **This same fix (both the
counting bug and the static regression guard) was independently
re-derived at the 2026-09-11 merge, on `codex-lane`, before this section
was known to exist there** — see this file's own §1 RESOLVED note; the
two lanes found the identical bug via the identical method (mutation-
testing the gate itself) within two days of each other, without either
knowing the other had.

**Status: CLOSED.** `node test/run.mjs test/facadeVariants.test.ts`: 9/9
green (was 0/8 buildable — the file did not exist — then 7/7 green + 1
red before the counting-logic fix). 2 mutations, both CAUGHT. No
regressions in `kitbashAssembler`/`kitbashParts`/`cityRenderScenePlacements`/
`cityRenderWorldState`/`phaseDelta`/`rendererStatic` (34/34 pass). `npx tsc
--noEmit` clean.

**Worth BLD knowing, not a blocker:** `public/facade-textures.js` now
exists identically on both `codex-lane` and `b1-land`. If BLD's own branch
changes this file again before the two lanes merge, that is a real,
ordinary merge conflict to resolve at merge time — not a new problem this
entry creates, but worth naming so it is not a surprise. **It was**, per
this file's own §1 RESOLVED note above — exactly as predicted here,
resolved at the 2026-09-11 merge in BLD's favour (the fuller, later file),
with this entry's own bug-fix logic preserved and carried forward into
BLD's version of the test.
