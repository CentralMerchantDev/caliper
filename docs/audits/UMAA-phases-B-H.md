# Blind audit — Phases B through H (world persistence, drawing, agent path, quests, regions, guardrails, close-out)

Scope as given: `public/world-store.js`, `public/apply-layers.js`,
`public/instance-groups.js`, `public/model-registry.js`,
`public/resolve-models.js`, `public/selection.js`, `public/describe-request.js`,
`public/generate-request.js`, `public/stage-artefact.js`,
`public/apply-and-persist.js`, `public/undo.js`, `public/change-quest.js`,
`public/quest.js` (E2 edit), `public/grid.js` (F1/F2 edit), `public/world.js`
(F1 edit), `public/layout-fits.js` (H1 survivor fix), `src/controlLayer.ts`
(unedited — G1's claim), the H1 harness tooling
(`scripts/mutate.mjs`/`mutate-resume.mjs`/`_mutresolve.mjs`/
`_mutresolve-run.mjs`), `test/mutations.json`, `test/.mutate-results.json`,
and every new/changed test file named for these. Commits read via `git show`,
not commit-message framing: `04b8b2a` A4, `0a0c4b4` B1, `4746300` B2,
`ba2a47e` C1, `0631606` C2, `8708c90` D1, `f634259` D2, `3162627` D4,
`304c340` D6, `e6dd319` D7, `0248a2e` D8, `66d84c6` E2, `23c8ca4` F1+F2,
`af5349b` G1, `f5fe797` G2, `77b4a4d` H1 harness fix, `5a7ed93` H1 complete,
`0e8f961` H2, `1164f29` H3, `946f8f1` H4.

Auditor was blind to intent going in beyond what Phase 0's required grounding
docs disclose. No conversation history from any earlier session was available.

**Methodological note, disclosed rather than hidden:** this worktree has
tracked files only — `node_modules` is absent, so `npm test`, `npx tsc
--noEmit` and `scripts/_mutcheck.mjs` cannot run here directly, the exact trap
`AUDIT-PROTOCOL.md` §7's 2026-09-03 entry already names. All command
execution below (`npm test`, `tsc`, the eight independent mutation re-runs)
was run against the sibling checkout `C:\Code\sandbox-spike`, confirmed
first to be at the **identical commit** (`946f8f1`) as this worktree, and
confirmed by content diff (CRLF-normalised — the two checkouts differ only in
line-ending representation, not content: `diff <(tr -d '\r' <file>) <(tr -d
'\r' <worktree-file>)` was empty for every file spot-checked) to hold
byte-identical source outside of two already-documented, pre-existing dirty
files (`public/asset-registry.js`, `public/tier-models.js` — the flagged
assets-lane contamination, unrelated to this scope) and gitignored artefacts
(`test/.mutate-results.json`, `test/.built/`, `test/.mutresolve.json`) that
exist in the sibling checkout but — worth recording as its own small finding
— are genuinely **absent from this worktree**, meaning a fresh audit spawned
directly into a from-scratch worktree with no sibling to fall back on would
have had no `.mutate-results.json` to check at all. All source-code findings
below are grounded in the actual committed content this worktree holds; only
the *execution* happened one directory over, verified identical first. See
the new §7 entry appended to `AUDIT-PROTOCOL.md` in this worktree.

---

## Findings

### FINDING 1 — HIGH — CLAUDE.md's own verification instructions are stale by 297 tests

**Where:** `CLAUDE.md:72` (project root, "How to verify" section).

**What's wrong:** The line reads `npm test # 571 node tests + 12 worker
tests`. Measured today, on a clean-except-for-the-known-contamination tree:

```
npm test
# ... ℹ tests 868  ℹ pass 868  ℹ fail 0
#  Test Files  1 passed (1)   Tests  12 passed (12)   (worker suite)
```

```
node scripts/gen-test-count.mjs
# wrote test/testCount.generated.json: 868 node tests (0 fail), 12 worker tests (0 fail)
# public/index.html already agreed with the measurement
```

868 node tests, not 571 — stale by 297 tests (52%). The worker-test figure
(12) is still correct. `public/index.html`'s own generated claim is NOT stale
— `test/publicClaims.test.ts` pins it and the generator confirms zero drift —
so the defect is specifically in `CLAUDE.md`, the document that describes
itself as overriding all default behaviour and as what "everything below
exists to protect."

**Why it matters:** This is exactly the failure class §2.1 of
`AUDIT-PROTOCOL.md` asks to be caught first: a claim in the project's own
governing document that is not true of the code. It is also self-referential
in an uncomfortable way — the project's central thesis is "a system that only
says yes when yes is true," and the file stating how to verify that claim is
itself unverified against the thing it tells the reader to run.

---

### FINDING 2 — MEDIUM — the Phase-A blind audit the brief assumed exists is not present in this worktree; what IS present covers different files entirely

**Where:** `docs/audits/` (whole directory).

**What's wrong:** The audit brief names `docs/audits/UMAA-phase-A.md` as a
prior audit of A1–A4 (seed, terrain, plan, districts, world instance) to be
verified rather than re-done. It does not exist. The only file in
`docs/audits/` is `UMAA-world-lane.md`, dated 2026-09-03, and its own stated
scope is `public/prop-models.js`, `public/props.js`, `public/city-render.js`,
`public/city-plan.js`, `public/sky.js`, `public/world-render-3d.js` — an
entirely different diff (props/sky/apron), not A1–A4.

`docs/WORLD-BUILD-LOG.md` (H4, this session's own account) says: *"The Phase A
blind audit that DID run (a separate, fresh, no-history agent) found three
real issues worth carrying into that [B-G] pass: seed not reaching
`terrain.js`'s exported `cliffiness`/`edgeFalloff`/`reliefAt`... `hash01`
(noise.js) has no seed parameter... `createWorld()` costs 2.3–2.7s per call
with no memoization."* That audit's own report artifact is not in this
worktree, so its claims (which files it actually read, whether the three
findings above were fixed, dismissed, or simply carried forward as noted)
could not be independently checked against a document — only against the
current code, which is what this report does for the memoization claim (see
Finding 5) and the `hash01`/`terrain.js` claims (not in this audit's scope;
recorded as not covered).

**Why it matters:** An audit that is claimed to have happened and to have
found specific things, with no artifact a later auditor can read, is
functionally the same evidentiary gap as an audit that did not happen —
`docs/AUDIT-PROTOCOL.md` §7's own standing complaint ("nobody audits the
auditor... taken on trust") applies here one level earlier: nobody can even
re-read the auditor's own report, because it is not in the tree it claims to
have audited.

---

### FINDING 3 — LOW/MEDIUM — `grid.js`'s `closeRegion` on the "whole world is open" sentinel (`open === null`) is untested

**Where:** `public/grid.js:207-215` (`closeRegion`), `test/regions.test.ts`
(whole file).

**What's wrong:** `closeRegion` has two refusal branches: `open === null`
("the whole world is already open, not region-tracked") and "no open region
named X". `test/regions.test.ts` exercises the second branch
(`"closing an unknown region name is refused"`, line 57) but never the first.
Every `regions.test.ts` call to `closeRegion` is against a grid built with
`createGrid({ openRegions: [] })` or `createGrid({ openRegions: [...] })` —
never against `createGrid()` (bare) or `createWorld({ seed })` (whose default
`regions: null` produces exactly the `open === null` grid). Confirmed by
direct search:

```
grep -n "closeRegion" test/regions.test.ts
# 51:  grid.closeRegion("downtown");
# 59:  const result = grid.closeRegion("no-such-region");
```

Neither call is against a null-regions grid. Reading the code, the branch
looks correct (`return { ok: false, reason: ... }`, not a throw or a silent
no-op), but per `AUDIT-PROTOCOL.md` §6, a green suite here is not evidence
this specific branch works — nothing currently disagrees with it because
nothing exercises it. This is precisely the scenario the audit brief itself
named as worth checking ("does it interact correctly with `open === null`,
the whole-world-is-open sentinel") and the gap was real.

**Why it matters:** `createWorld()`'s own default (`regions: null`) is the
MORE common shape a real caller would hit first — a world built with no
explicit regions argument, which is every world built today (nothing wires
`createWorld({ regions })` from a live call site yet). If a future caller
called `world.grid.closeRegion(name)` on a default-regions world expecting
either a no-op or an error and got the other, there is no test that would
have caught a regression either way.

---

### FINDING 4 — LOW — two different functions are both named `worldFromJSON`, one in scope, one a dependency of everything in scope but not itself in the named file list

**Where:** `public/world.js:73-77` and `public/world-model.js:267-271`.

**What's wrong:** `world.js`'s `worldFromJSON(json)` returns a full world —
`createWorld({ seed, layers })`, i.e. `{ seed, plan, land, layers, grid,
resolve, toJSON }` with the layer model nested under `.layers`.
`world-model.js`'s `worldFromJSON(json)` returns `createWorldModel({ seed,
layers })` directly — the layer model itself, with `.add`/`.remove`/`.resolve`
etc. as TOP-LEVEL methods, no `.layers` property, no `.plan`/`.land`/`.grid`.

Checked every import site in the repo:

```
grep -rn "worldFromJSON" public/*.js test/*.ts | grep -v "public/world.js:\|public/world-model.js:"
# test/applyAndPersist.test.ts, test/undo.test.ts, test/world.test.ts,
# test/worldStore.test.ts -- all import from "../public/world.js" (correct)
# test/worldModel.test.ts -- imports from world-model.js directly (its own,
#   pre-existing test, correctly using the matching function)
```

No current caller imports the wrong one. `world-model.js` is not in the
audit's named file list, but every Phase B–D file that touches persistence
(`world-store.js`, `apply-and-persist.js`, `undo.js`) depends on it — this is
the "blast radius wider than the list" case the brief asked to be named.

**Why it matters:** This is the same defect *class* (not instance) as the
`hash2`/districts-copy bugs A2b/A3 found and fixed — "two things that must
agree, named the same, kept apart, drifting" — except here it is two function
identities rather than two data tables. Today the risk is a loud crash
(`.layers.add is not a function`) rather than silent corruption if someone
imports the wrong path, which is a real mitigating factor; still worth
renaming one of the two before a third caller is added under time pressure
and picks the nearer import.

---

### FINDING 5 — MEDIUM (performance, confirms a standing concern) — `createWorld()`'s ~2.4s cost, previously flagged with no memoization, now has ~17 new paying call sites, all in the test suite

**Where:** `public/world.js:44` (`createWorld`), and its callers across
`test/applyLayers.test.ts` (5), `test/instanceGroups.test.ts` (3),
`test/applyAndPersist.test.ts` (3), `test/questCompletion.test.ts` (2),
`test/regions.test.ts` (2), `test/undo.test.ts` (1), `test/worldStore.test.ts`
(1) — 17 new call sites across Phase B–H's own new test files (not counting
`test/world.test.ts`'s 5, which pre-date this scope at A4).

**Measured:**

```
node -e '
import("./public/world.js").then(async ({createWorld}) => {
  for (let i=0;i<3;i++) { const s=Date.now(); createWorld({seed:"perf-test-"+i}); console.log(i, Date.now()-s, "ms"); }
});'
# 0 : 2514 ms
# 1 : 2401 ms
# 2 : 2459 ms
```

This matches the Phase-A audit's reported 2.3–2.7s exactly (see Finding 2 —
that figure could not be re-verified against its own report, but IS
independently reproduced here against the current code, unchanged). Two
individual tests make the cost visible directly in the suite's own timing
output:

```
✔ mutating one world's district bounds does not reach another world's, or the spec (3466.8991ms)
✔ a saved world reloads with its layers intact (5496.2573ms)
```

`worldStore.test.ts`'s "a saved world reloads..." test calls `createWorld`
once and `worldFromJSON` (→ `createWorld` again) once — two calls, ~5s,
matching the 5496ms measured almost exactly.

**Why it matters:** Nothing in Phases B–H wired `createWorld()` into a
repeated production code path (confirmed — see "checked and found clean"
below, `city-render.js` still calls bare `generateWorld(heightAt)`), so this
is NOT a live-user-facing regression today. But the brief's own question —
"has anything in Phases B-H made new callers that would call it repeatedly"
— is answered yes, concretely, in the test suite: 17 new unmemoized calls at
~2.4s each is a meaningful fraction of the measured 131.9s total node-test
runtime, and it is exactly the kind of accumulation that turns into a real
problem the day something DOES call `createWorld()` per-request or per-frame,
which several Phase D/E/F mechanisms (selection, describe, quests, regions)
are structurally one wiring step away from doing.

---

## What was checked and found clean

**Mutation controls — 8 independently re-run, spanning phases B/C/D/E/F/G,
not just trusted from `test/.mutate-results.json`:**

```
node scripts/_mutcheck.mjs test/applyLayers.test.ts public/apply-layers.js test/mutations.json
# baseline: GREEN / CAUGHT apply-layers-resolves-only-touched / restored: byte identical

node scripts/_mutcheck.mjs test/instanceGroups.test.ts public/instance-groups.js test/mutations.json
# baseline: GREEN / CAUGHT override-leaves-its-instance-group / restored: byte identical

node scripts/_mutcheck.mjs test/modelRegistry.test.ts public/resolve-models.js test/mutations.json
# baseline: GREEN / CAUGHT resolve-models-refuses-unknown-id / restored: byte identical

node scripts/_mutcheck.mjs test/undo.test.ts public/undo.js test/mutations.json
# baseline: GREEN / CAUGHT undo-persists-the-removal / restored: byte identical

node scripts/_mutcheck.mjs test/regions.test.ts public/grid.js test/mutations.json
# baseline: GREEN / CAUGHT locked-region-refuses-with-a-reason-not-bare-false / restored: byte identical

node scripts/_mutcheck.mjs test/questCompletion.test.ts public/change-quest.js test/mutations.json
# baseline: GREEN / CAUGHT quest-completes-on-a-real-edit-not-a-flag / restored: byte identical

node scripts/_mutcheck.mjs test/controlLimitsAreLive.test.ts src/controlLayer.ts test/mutations.json
# baseline: GREEN / CAUGHT checkInputGuard-reads-control-limits-not-a-literal / restored: byte identical

node scripts/_mutcheck.mjs test/worldStore.test.ts public/world-store.js test/mutations.json
# baseline: GREEN / CAUGHT world-store-reports-corrupt-json / restored: byte identical
```

`git status --short` and `git diff --stat` after all eight runs showed only
the pre-existing, pre-flagged `public/asset-registry.js` /
`public/tier-models.js` contamination — nothing else touched.

**The manifest and the results file agree exactly, cross-checked
programmatically, not by eye:**

```
node -e 'const mutations=require("./test/mutations.json").mutations, results=require("./test/.mutate-results.json").results;
const mIds=new Set(mutations.map(m=>m.id)), rIds=new Set(results.map(r=>r.id));
console.log("mutations.json:",mutations.length,"results:",results.length);
console.log("only in mutations.json:", [...mIds].filter(x=>!rIds.has(x)));
console.log("only in results:", [...rIds].filter(x=>!mIds.has(x)));'
# mutations.json: 53  results: 53
# only in mutations.json: []
# only in results: []
```

Both 53, exact 1:1 id match either direction. Consistent with the "53/53
CAUGHT, zero SURVIVED, zero INCONCLUSIVE" claim and with the incident
narrative's claim that the 22-results reconstruction after the process
collision was not re-guessed — a fabricated reconstruction that missed or
duplicated an id would show up here as an orphan on one side, and none exists.
Reducing the results file's own `status` field: `{"CAUGHT":53}` — no SURVIVED,
no INCONCLUSIVE entries remain, matching H1's claim.

**G1's claims, verified independently rather than trusted from the commit:**

```
grep -rn "from [\"']\.\./src\|require(.*src/" public/*.js | grep -v vendor
# (no output — zero hits)
```
`public/*.js` genuinely never imports from `src/*.ts`, confirming G1's stated
reason for leaving "scope (one object)" Undone.

```
grep -n "MAX_FIX_ATTEMPTS\|MAX_REVIEW_ROUNDS" src/*.ts | grep -v controlLayer.ts
# src/changePipeline.ts:898:  return state.attemptsUsed < CONTROL_LIMITS.MAX_FIX_ATTEMPTS;
# src/changePipeline.ts:909:  return round >= CONTROL_LIMITS.MAX_REVIEW_ROUNDS;
```
Both ops limits genuinely read from the single `CONTROL_LIMITS` object, not a
hard-coded literal at the call site — extends G1's own two spot-checks
(`FREE_FORM_MAX_LENGTH`, `CIRCUIT_FAILURE_THRESHOLD`) to two more fields the
ledger names as covered by "one limits object."

**The "live rendering integration is Undone" claim — independently confirmed,
not just trusted:**

```
grep -n "createWorld(\|generateWorld(" public/city-render.js
# public/city-render.js:238:  const world = generateWorld(heightAt);
```
`city-render.js` genuinely still builds its scene from the bare, unseeded
`generateWorld(heightAt)`, not `createWorld({ seed, layers })` — C1/C2/D7's
mechanism is real and mutation-tested but genuinely not wired into anything a
player would see, exactly as `docs/WORLD-BUILD-LOG.md` states.

**Logic review, read (not just mutation-tested) against the specific
questions the brief asked:**

- `public/instance-groups.js`'s `partitionForInstancing`: a removed placement
  (`p.removed`) is `continue`d before either push — genuinely dropped from
  both `instanced` and `overridden`, never leaking into either. Confirmed by
  reading and by the independent CAUGHT re-run above.
- `public/resolve-models.js`'s `resolveOverrideModels`: the only path to
  `resolved.push({ ...p, model })` is through `registry.get(modelId)`
  returning truthy, and `registry.get` (`model-registry.js`) only ever holds
  entries that passed `register()`'s `verdict.ok === true` gate — there is no
  second path (no default fallback object, no bypass) by which an unverified
  model reaches a resolved placement. Confirmed by reading and by the
  independent CAUGHT re-run above.
- `public/grid.js`'s `closeRegion`: handles both `open === null` and "name not
  currently open" as explicit refusals with reasons (never a bare `false`,
  never a silent no-op) — correct on inspection; see Finding 3 for the
  untested branch.

**Tests reviewed for "cannot fail" / reimplementation / composition-plumbing
patterns (per the brief's specific concern about
apply-and-persist/undo/generate-request):** all three call the real production
functions end-to-end rather than re-deriving the property under test.
Specific mechanisms found genuine, not vacuous:
- `test/applyLayers.test.ts`'s "resolve is called exactly once" test
  monkey-patches the REAL `world.resolve` to count invocations rather than
  inferring call count from output shape — a re-resolve-everything mutation
  would still produce a visually correct result (confirmed: this is the exact
  mutation `apply-layers-resolves-only-touched` encodes, and it was
  independently reproduced CAUGHT above), so only the counting test can catch
  it, and it does.
- `test/applyAndPersist.test.ts`'s "never inlining the source" test asserts
  against a literal marker string in the actual `source` argument passed into
  a realistic call, not against a function that was simply never given the
  source to leak in the first place.
- `test/undo.test.ts`'s "the undo survives a reload" test round-trips through
  a real `memoryAdapter`-backed store and `worldFromJSON`, not just the
  in-memory `world` object the removal happened on.
- `test/generateRequest.test.ts` never calls a model; every "response" is a
  hand-written source string, and `evaluate`/`THREE` are real (not stubbed to
  agree with anything) — a small fake `THREE.BoxGeometry` that computes a
  real bounding box from real constructor arguments, so the verdict genuinely
  depends on what the source string builds.

`npm test`: **868 node tests, 0 fail; 12 worker tests, 0 fail.**
`npx tsc --noEmit`: clean, zero output.

---

## What was not covered, and why

- **`public/terrain.js`'s `cliffiness`/`edgeFalloff`/`reliefAt` seed-reach
  claim and `noise.js`'s `hash01` seed-invariance claim**, both attributed to
  the missing Phase-A audit report (Finding 2). Out of this audit's named
  scope (Phase A, not B–H) and not re-derived here.
- **`indexedDBAdapter`** (`public/world-store.js`) — genuinely unrunnable in
  this sandbox (no IndexedDB in Node), same limitation the code's own comment
  states. Read for structural soundness only (promisifies real IndexedDB
  calls correctly on inspection); not exercised.
- **Live browser/DOM wiring, click handlers, textarea submission, an actual
  model call under the pipeline's spend gates** — none of this exists yet
  (see "checked and found clean" above), so there was nothing to audit beyond
  confirming the absence is real and honestly reported, which was done.
- **`scripts/mutate.mjs`'s `--all` full-suite path** was not independently
  re-run end to end (would cost the ~2 hours the ledger itself says this
  environment cannot grant in one sitting); the SCOPED method
  (`_mutcheck.mjs`) it was replaced by for H1 was independently exercised
  eight times instead, per the ledger's own stated preference for future
  sessions.
- **`scripts/_mutresolve.mjs` / `scripts/_mutresolve-run.mjs`** were read for
  structure but not run against a live batch — the 53 entries are already
  fully resolved in this tree, so there was no pending/ambiguous batch left to
  drive them against.
- **The exact mechanics of the two-processes-racing incident** (H1) —
  verified indirectly: the commit sequence (`77b4a4d` harness fix, then
  `5a7ed93` "H1 complete... one survivor fixed") exists in that order in
  `git log`, and the current tree is clean with all 53 results consistent —
  but the incident itself, being historical (a race between two now-finished
  processes), left no artifact in this worktree that could independently
  confirm the specific claim about which two files were caught dirty
  mid-collision or the exact terminal output used to reconstruct 22 results.
  Taken on trust, flagged as such rather than silently verified.
- **Divisions untouched by this diff** (per `UMAA-CALIPER.md`'s table):
  visual design system, editorial narrative, most of FinOps (no new spend
  paths in this scope), observability beyond what G1 touches.
- **`public/asset-registry.js` / `public/tier-models.js`** — confirmed still
  dirty with the documented assets-lane contamination (37,920 / 157,340 line
  diff by `git diff --stat`), exactly as `docs/WORLD-BUILD-PLAN.md` PART 0
  states; not this lane's work to resolve, not touched.

---

## The 4-State Horizon

Judged only for divisions Phases B–H actually touch.

| # | Division | Done | Undone | Could | Should |
|---|---|---|---|---|---|
| 1 | Technical architecture | Layer model (seed + ordered layers) proven end to end: persistence (B1), touched-only apply (B2), instance-group partitioning (C1), verified-only model registry (C2), the full D1→D8 agent path as standalone mechanisms, quests keyed to real edits (E2), regions that load AND unload (F1/F2), one live-read limits object (G1) — 8 of the 53 mutation controls independently re-verified CAUGHT here, all consistent with the recorded 53/53 | The mechanism is real and none of it is wired into the running app — `city-render.js` still builds from bare `generateWorld(heightAt)`, confirmed by direct grep, not by trusting the doc | Wire `createWorld({seed,layers})` into `city-render.js` behind a feature flag, prove one visible override end to end via `scripts/shoot-app.mjs` | This is the single highest-value next step; every mechanism it would exercise is already tested in isolation |
| 1 (DX) | Governing documentation accuracy | `test/publicClaims.test.ts` keeps the PAGE honest mechanically | `CLAUDE.md` itself — the document instructing how to verify the project — is stale by 297 tests (Finding 1), with nothing mechanically pinning it the way the page is pinned | Add `CLAUDE.md`'s test-count line to what `gen-test-count.mjs` or `publicClaims.test.ts` checks, or point it at the generated JSON instead of a hand-typed number | Do this; it is the same fix already applied to the page, just not to the file that tells a reader how to check the page |
| 4 | Frontend performance | Nothing in Phases B–H touches the renderer's actual draw path | `createWorld()`'s ~2.4s/call, unmemoized, now has 17 new test-suite call sites (Finding 5) — confined to test time today, not production, because nothing production calls it repeatedly yet | Memoize `createWorld` per seed (a `Map`, cleared explicitly in tests that need independence — several already rely on TWO independent instances of the same seed, so this needs care, not just a blanket cache) | Do it before D7's live wiring lands, not after — a per-request `createWorld()` call in a Worker is the failure mode this is one step from becoming |
| 12 | Developer experience | Mutation harness survived a real process collision mid-run and recovered with a reconstructed, internally-consistent 53-entry record (cross-checked here against the manifest, exact match); the scoped `_mutcheck.mjs` method is fast enough to be re-run per-PR (measured: each of the 8 independent re-runs above completed in well under a minute) | An audit report the build log cites as having already run (Phase A) is not present in this worktree to be checked (Finding 2) | Commit audit reports to the same `docs/audits/` path they claim, every time, so "the audit already covered this" is a re-readable claim rather than a remembered one | Treat a missing audit artifact the same as a missing test: the claim it supports is unverifiable until it exists |
| 9 (proxy: honesty of the guardrails story) | Guardrails as dials (G1/G2) | G1's "one limits object, read live" independently reverified on two additional fields beyond its own two named ones (`MAX_FIX_ATTEMPTS`, `MAX_REVIEW_ROUNDS`); G2 honestly BLOCKED with a stated, checkable reason (no business numbers, no selection mechanism) rather than fabricated | "Scope (one object)" — a limit on how many addresses one layer/request may touch — has no enforcement point because `public/*.js` never imports `src/*.ts` (confirmed true by direct grep, not assumed) | Nothing changes until `public/*.js` and `src/*.ts` actually need to talk to each other (D7's live wiring), at which point this becomes buildable | Leave G2 blocked; do not fabricate the missing numbers under time pressure, which is exactly the shape the project's own audit protocol exists to catch |

---

## Tree state

**This worktree** (`C:\Code\sandbox-spike\.claude\worktrees\agent-a752b27fe63f9a19f`,
branch `main`, HEAD `946f8f1`):

```
git status --short
```
```
?? docs/audits/UMAA-phases-B-H.md
```
Only this report itself is new. Nothing else in this worktree was touched —
no mutation ran here (node_modules is absent; see the methodological note
above), so there was nothing here to restore.

**The sibling checkout** (`C:\Code\sandbox-spike`, same branch, same HEAD
`946f8f1`), where all command execution actually happened:

```
git status --short
```
```
 M public/asset-registry.js
 M public/tier-models.js
```
Both are the pre-existing, pre-flagged `assets-lane` contamination documented
in `docs/WORLD-BUILD-PLAN.md` PART 0 and `docs/WORLD-BUILD-LOG.md` — present
before this audit began and untouched by it (confirmed: identical two-line
`git status --short` before the first command run and after the last). Every
mutation performed during this audit (eight independent `_mutcheck.mjs` runs)
restored its target file byte-identical, each verified individually
(`restored: byte identical`) and the tree re-checked with `git status
--short` / `git diff --stat` after all eight completed.
