# Blind audit — I5 (the request path), Phase L (the assets merge), J4 (claim registry)

Scope as given: `public/run-generate-request.js`, `public/model-caller.js`,
`scripts/supervised-generate.mjs`, `test/runGenerateRequest.test.ts`,
`test/modelCaller.test.ts`, `test/supervisedGenerateScript.test.ts` (commit
`947c644`, "I5"); the merge commit `238bdff` ("Phase L: the assets merge") and
its two parents (`947c644` on `main`, `76c8bdb` the tip of `assets-lane`),
specifically the hand-resolved conflicts in `test/mutations.json`,
`docs/WORLD-BUILD-PLAN.md` and `scripts/mutate.mjs`, plus `public/buildings.js`
and `test/buildingLODAndColors.test.ts` the merge carries; commit `693d909`
("Phase L: L1, L3, L4"); commit `3a46db2` ("J4"), specifically
`test/claimSpansAreChecked.test.ts`. `public/city-render.js`
(`buildWorldState`/`buildScenePlacements`), `public/world-render-3d.js`
(selection wiring) and `public/index.html` (the describe box) were touched
lightly, as instructed, since I5 depends on them directly and they were
already audited in an earlier pass.

Auditor was blind to intent going in beyond what was in the task brief and
`docs/UMAA-CALIPER.md`'s required grounding. `docs/WORLD-BUILD-PLAN.md`'s own
account of these phases was deliberately not read until after independent
conclusions were formed; the comparison against it is noted at the end of each
section below.

**Methodological note, disclosed rather than hidden:** the assigned worktree
carries tracked files only — `node_modules` is absent, so `npm test`, `npx tsc
--noEmit` and `scripts/_mutcheck.mjs` cannot run there directly, the exact trap
`AUDIT-PROTOCOL.md` §7 names repeatedly. All command execution below ran
against the sibling checkout `C:\Code\sandbox-spike`, confirmed first to be at
the **identical commit** (`3a46db2`) as the worktree's `HEAD`, and confirmed
by `sha256sum` (not merely a raw diff, and not assumed from the matching hash
alone) to hold **byte-identical** content for every file in scope
(`public/run-generate-request.js`, `public/model-caller.js`,
`scripts/supervised-generate.mjs`, all three new/changed test files,
`test/mutations.json`, `public/buildings.js`, `public/model-forge.js`) — zero
differences, not even CRLF/LF noise, so no CRLF-normalisation step was needed
this time. The sibling checkout does carry two pre-existing, already-flagged,
unrelated dirty files (`public/asset-registry.js`, `public/tier-models.js` —
agy's uncommitted asset-registry growth, named in every commit message in this
batch as excluded and untouched) — outside this scope and left alone.

Baseline, run first, unmutated: `npm test` → **899 node tests, 899 pass, 0
fail**; Vitest worker suite → **12 passed**. `npx tsc --noEmit` → clean, no
output. Both match `CLAUDE.md`'s own verification line and
`test/testCount.generated.json` exactly — no staleness found here (a stale
"872" figure appeared in a snapshot of `CLAUDE.md` handed to this auditor at
the start of the session; the actual file on disk at `3a46db2` reads "899",
correct — recorded so the discrepancy is not silently attributed to the
codebase).

---

## Findings

### FINDING 1 — HIGH — the one path that executes a real model's response runs it unsandboxed, in the same process as the API key, and the denylist meant to catch that is trivially bypassed

**Where:** `scripts/supervised-generate.mjs:117` (`evaluate`), reaching
`public/model-forge.js:121-137` (`verifyModelSource`) and its `scanSource`
denylist at `public/model-forge.js:86-104`.

**What's wrong:** `verifyModelSource`'s own JSDoc (`public/model-forge.js:112-114`,
pre-existing, not edited by this batch) states the contract plainly:

> `evaluate` … Injected. **In production this is a Dynamic Worker isolate**; in
> tests, a local evaluator. This module never chooses where untrusted code
> runs.

`scripts/supervised-generate.mjs` is the first and only code in this entire
codebase that pairs a **real** `ANTHROPIC_API_KEY` with a **real** model
response and actually calls `verifyModelSource` on it (every other call site —
`test/runGenerateRequest.test.ts`, `test/generateRequest.test.ts` — uses safe,
hand-written stub sources). Its `evaluate` (`scripts/supervised-generate.mjs:117`)
is:

```js
const evaluate = (src) => new Function(`"use strict"; return (${src});`)();
```

This is not a Dynamic Worker isolate. It is the plain Node `Function`
constructor, executing in the same OS process, with the same environment, as
the script that just read `process.env.ANTHROPIC_API_KEY`. The only thing
standing between an arbitrary model response and that process is
`scanSource`'s `FORBIDDEN_TOKENS` substring denylist (`document`, `window`,
`globalThis`, `fetch`, `process`, etc.) — which the same file's own comment
says out loud is not a real boundary: *"a denylist that is described as
protection is worse than no denylist, because it invites someone to rely on
it."* Nothing in `scripts/supervised-generate.mjs`, its header, the I5 commit
message, or `docs/WORLD-BUILD-PLAN.md`'s I5 entry says this substitution (real
key + unsandboxed eval, in place of the documented Dynamic Worker isolate) was
made — the extensive "four independent safety layers" writeup in all three
places is entirely about *whether* to call the model, never about what the
model's own answer is then allowed to do.

**Evidence — measured, not asserted.** A standalone script
(`denylist_bypass_test.mjs`, run from the scratchpad, touching nothing
tracked) reproduces `FORBIDDEN_TOKENS`/`scanSource` and
`supervised-generate.mjs`'s `evaluate` verbatim, then builds a "geometry
builder" source string using a standard JS unicode-escape identifier
(`process`, which V8 resolves to the identifier `process` at parse time
but which never contains the literal substring `"process"` for `.includes()`
to catch):

```
RAW SOURCE TEXT SENT TO scanSource():
(T) => { const p = process; const secret = p.env.ANTHROPIC_API_KEY; return { attributes:{position:{count:3}}, computeBoundingBox(){this.boundingBox={min:{x:0,z:0},max:{x:1,z:1}};}, __leak: secret }; }

Contains literal substring 'process'? false
scanSource() verdict (null means: PASSES, not blocked): null

EXECUTED past the denylist. Exfiltrated value: sk-demo-secret-DO-NOT-LEAK
```

The same technique defeats the `fetch`/`XMLHttpRequest` tokens identically
(`fetch(...)`), so the exfiltration does not even require a second,
separate run to read the leaked value out of band — it can be sent over the
network the instant `builder(THREE)` executes inside `verifyModelSource`
(`public/model-forge.js:145`), before the geometry is ever checked against the
footprint, and regardless of whether the verdict that follows is `ok: true` or
`ok: false`.

**Why it matters:** this is `docs/UMAA-CALIPER.md`'s Failure Floor item 3,
"sandbox escape — model-authored code reaching the Worker's environment,
secrets, or another visitor's run" — realised, not hypothetical, against the
exact script whose entire stated purpose is to spend real money "on purpose,
run by Mark's own hand," and against the exact credential (`ANTHROPIC_API_KEY`)
that purpose requires being present. It is also `AUDIT-PROTOCOL.md` §2.1's
top-priority category: a comment (`model-forge.js`'s own docstring) making a
claim about production behaviour ("a Dynamic Worker isolate") that is not true
of the one concrete production caller that exists.

**Why this is HIGH and not CRITICAL:** three real containments keep this from
the worst case. (1) `scripts/supervised-generate.mjs` is never reachable from
the live page — confirmed by grep, nothing in `public/index.html` or any other
browser-loaded file imports it, matching this batch's own repeated claim that
I5 is "built and stub-proven, never called." (2) Triggering it requires Mark's
own deliberate, informed sequence of actions (a valid key, `--confirm`, typing
`y` at the terminal prompt) — there is no accidental-invocation path (see
Finding 2 area, checked separately and found clean). (3) The blast radius
today is Mark's own local shell and its environment, not a shared multi-tenant
Worker or another visitor's run. But the attacker here is not "an accidental
bug" — it is the content of the model's own response, and the moment any part
of this pipeline's future work lets outside text reach the prompt the model is
asked to satisfy (which is the entire eventual point of the project), this
same unsandboxed `evaluate` becomes a live prompt-injection-to-secret-theft
chain, not merely a local footgun.

**Compared against `docs/WORLD-BUILD-PLAN.md`'s own account (read after,** as
instructed): the I5 entry (lines ~1154-1252) describes the four spend-safety
layers in detail and states "no model was called by this session, at any
point," which is true and separately verified below — but says nothing about
what a *real* model response is allowed to do once obtained, and does not
mention the Dynamic Worker isolate gap at all. This is a genuine omission,
not a misstatement — the document does not claim the eval path is safe, it
simply never raises the question.

---

### FINDING 2 — MEDIUM — J4's claim registry check is a substring match against the whole checker file, so a comment mentioning an id (with no real assertion) satisfies it

**Where:** `test/claimSpansAreChecked.test.ts:59` —
`const unchecked = ids.filter((id) => !CLAIMS_TEST_SRC.includes(id));`

**What's wrong:** the check does not verify that a claim id is *asserted*
anywhere — only that the literal id string appears somewhere in
`test/publicClaims.test.ts`'s raw source text. A dead comment, a `// TODO:
check claim-foo later` left by a developer in a hurry, or the id appearing
inside an unrelated string, all satisfy `.includes()` identically to a real
`spanText(html, "claim-foo")` assertion.

**Evidence — measured, not asserted:**

```
id only appears in a dead comment with no real assertion.
Does the J4 registry check consider it checked? true
```

(reproduced the exact same `.includes()` logic against a one-line fake source
string `"// TODO: verify claim-fake-model-count later, not implemented yet\n"`
— result: `true`, i.e. "checked," with zero real verification present.)

**Why it matters:** J4's own commit message names the exact failure mode it
exists to close — "a developer adds a new figure, follows the id convention,
and never adds the check, because writing the number felt like the whole
job." A developer who is *aware* of the convention enough to leave a
half-finished TODO comment naming the id (a very plausible real-world
scenario — more plausible than adding the id with zero mention anywhere) would
pass this guard with no real check in place, which is precisely the outcome
the guard is supposed to prevent. This does not make the guard worthless — it
still catches the "added and never mentioned at all" case, which is likely the
more common one — but the guarantee is narrower than "a claim span with no
matching reference fails here" reads, because "matching reference" is not
required to be a check.

**Severity reasoning:** MEDIUM rather than HIGH because the current, real
claim registry (4 ids: `claim-node-tests`, `claim-worker-tests`,
`city-stat-buildings`, `city-stat-settlements`) is genuinely, fully checked
today — this is a structural weakness in the guard against *future* drift, not
a live defect in the page's current claims. The commit's own docstring is
honest about the mechanism ("a registry check, not a number check … must be
*referenced*, by its id"), which is technically accurate; the finding is that
"referenced" is weaker than a reader would assume from the surrounding prose
("or the build fails, by id, before anyone has to notice a number drifted"),
and neither the commit message nor `docs/WORLD-BUILD-PLAN.md`'s J4 entry names
this specific weakness.

**Compared against `docs/WORLD-BUILD-PLAN.md`'s J4 entry (read after):** it
repeats the same "must be named somewhere in `test/publicClaims.test.ts`'s own
source" language, i.e. it accurately describes what the code does — it does
not overclaim that a real assertion is enforced. It also does not disclose the
comment-only loophole. Read generously, this is accurate-but-incomplete rather
than oversold.

---

### FINDING 3 — LOW — the J4 registry check only scans `public/index.html`; the sibling test it backstops also scans `public/city.html`

**Where:** `test/claimSpansAreChecked.test.ts:42` reads only
`public/index.html`. `test/publicClaims.test.ts:56-57` (pre-existing) reads
**both** `public/index.html` and `public/city.html`.

**What's wrong:** if a future `id="claim-*"` / `id="city-stat-*"` span is
added to `public/city.html` — the exact file `publicClaims.test.ts` already
treats as in-scope for numeric claims — J4's structural registry guard would
never see it, silently. Confirmed today, `public/city.html` carries zero
`claim-*`/`city-stat-*` spans (`grep` returned nothing), so this is not a live
gap; it is a scope mismatch between a check and the thing it is meant to keep
honest.

**Why it matters/severity:** LOW today because there is nothing on
`city.html` for it to miss yet, and the file is otherwise structurally
identical in spirit to Finding 2 (a coverage gap rather than a live false
claim). Worth fixing cheaply (read both files, the same way
`publicClaims.test.ts` already does) before it becomes Finding 2's twin on a
second page.

---

## What was checked and found clean

**I5's headline claims — both true, verified by reading and by mutation:**

- *"A refused transform never reaches the caller."* Read directly:
  `public/run-generate-request.js:36-47` returns before referencing `caller`
  at all when `prompt.ok` is false; the comment at line 40-41 matches the
  code exactly. Mutation `runGenerateRequest-never-calls-caller-on-a-refused-prompt`
  re-run independently: `baseline: GREEN`, `CAUGHT`, `restored: byte
  identical`.
- *"`productionModelCaller` cannot spend money."* Read directly:
  `public/model-caller.js:24-29` throws immediately, no `fetch`, no import of
  anything network-capable. Mutation `productionModelCaller-refuses-rather-than-calling`
  re-run independently: `CAUGHT`, byte-identical restore.
- Grepped the entire `public/` tree and `public/index.html` for any import of
  `run-generate-request.js` or `model-caller.js`: only test files, the script,
  and docs reference them. **Confirmed: nothing in the live app wires I5 in.**
- The response `verifyGeneratedGeometry` checks is the caller's real return
  value, not a discarded/fabricated one. Mutation
  `runGenerateRequest-verifies-what-the-caller-actually-returned` re-run
  independently: `CAUGHT`.

**`scripts/supervised-generate.mjs`'s documented safety chain, apart from
Finding 1's separate concern about what a real response is then allowed to
do:**

- Order of refusals verified by reading (`supervised-generate.mjs:78-90`): no
  API key → exit before anything else; missing `--confirm` → exit before
  argument validation; missing required args → exit before touching the
  world. No path skips an earlier check to reach a later one.
- `--yes` is an **explicitly documented** bypass of the terminal `y/N` step
  (the script's own header says "unless `--yes` is also passed"), not a
  hidden one. Combined with the fact that reaching it at all requires a real
  key, `--confirm`, and all four required arguments, there is no accidental
  or non-interactive-by-surprise invocation path — every route to a real spend
  requires multiple, explicit, separately-named flags.
- `--w`/`--d` parsed with `Number(...)`; an invalid value produces `NaN`,
  which is falsy, so the existing `!args.w`/`!args.d` usage check already
  catches non-numeric input — no separate `NaN` bug.
- Mutations `supervised-generate-refuses-without-api-key` and
  `supervised-generate-refuses-before-printing-a-prompt-for-a-refused-transform`
  both re-run independently: `CAUGHT`, byte-identical restore.
- Ran the script for real with a fabricated key against the shipped test
  fixtures (`--address block--1349-760-p0 --text "a giant stadium" --w 500
  --d 500 --seed default --confirm`), matching `test/supervisedGenerateScript.test.ts`'s
  own case: refuses cleanly before printing any prompt, exit code 1, exactly
  as claimed.

**Phase L merge — arithmetic re-derived independently from git history, not
taken from the commit message:**

- `git show 947c644:test/mutations.json` (main) → 71 ids, 71 unique.
- `git show 76c8bdba...:test/mutations.json` (assets-lane tip) → 56 ids, 56
  unique.
- `git show 238bdff:test/mutations.json` (merged) → 75 ids, 75 unique.
- `comm -23` of both parents' sorted id lists against the merged list: **empty
  both times** — zero ids missing from either side. The "71/56/75, zero
  missing, all unique" claim in the merge commit message is exactly
  reproducible, not merely arithmetically plausible.
- Both hand-resolved same-id conflicts
  (`sizer-and-renderer-share-one-seed`, `districts-copy-clones-its-bounds`)
  read from all three versions (main/assets-lane/merged): the merged version
  is byte-identical to main's version in both cases (assets-lane's edits
  targeted since-refactored code shapes that no longer exist in the real
  source). Confirmed the merged `find` string in both entries matches the
  **current** `public/city-plan.js`/`public/layout-fits.js` exactly via
  `grep`. Both re-run independently against their real guarding tests:
  `sizer-and-renderer-share-one-seed` → CAUGHT (`test/layoutGeometry.test.ts`);
  `districts-copy-clones-its-bounds` → CAUGHT (`test/worldSpec.test.ts`).
- All four AS1-AS4 building mutations re-run against the real, merged
  `public/buildings.js`: `as1-vertex-colors-distinguish-wall-and-roof`,
  `as2-bld-tower-footprint-bounds`,
  `as3-declared-lod-triangle-counts-match-geometry`,
  `as4-lod1-distinct-from-lod2` — **all four CAUGHT**, confirming the merge
  did not corrupt agy's own tested work (deliberately not re-auditing AS1-AS4
  itself, per instruction).
- `docs/WORLD-BUILD-PLAN.md`'s merge diff read directly (`git show 238bdff --
  docs/WORLD-BUILD-PLAN.md`): PART 0 keeps main's re-measured table with an
  honest merge note about assets-lane's stale copy; the AS1-AS4 ledger keeps
  assets-lane's completed `[x]` entries over main's unstarted placeholders;
  Phase H-M keeps main's real history whole. Matches the commit message's
  description of each resolution exactly.

**Phase L (L1/L3/L4) — every specific number re-measured live, not trusted
from the commit message:**

- `node scripts/check-layout-geometry.mjs` (re-run fresh): `153,060 triangles
  across 480 distinct geometries`, `6,886,892 triangles drawn for the whole
  city`, `480 InstancedMeshes`, `19725` placed, `149` refused, `19874` plots —
  **matches the commit's claimed figures exactly, digit for digit.**
- `node scripts/gen-city-summary.mjs` (re-run fresh): `git status --short
  src/citySummary.generated.ts` → empty. Zero diff, as claimed.
- `node scripts/shoot-app.mjs` (re-run fresh): reports exactly the same five
  pre-existing, harness-only page errors named in the commit (`REQFAIL`/404s
  against `datum.markfrasertoronto.workers.dev` and the local dev-server
  routes, plus one CSP frame-ancestors console message) — "app OK: world
  built, sky present, clock and camera finite, no page errors" beyond those
  five.
- `node scripts/shoot.mjs "Downtown close"` (re-run fresh): produced
  `.shots/downtown-close.png`, viewed directly. Buildings across the skyline
  visibly show distinct darker roof caps against lighter walls (e.g. the
  gray/near-black flat roofs on white/tan-walled midrises, terracotta roofs on
  the townhouse rows) — confirms AS1's vertex-colour claim in a real rendered
  frame, not merely asserted from a geometry-attribute check. No visible
  overhangs or distorted geometry.

**J4 — the one new test, re-run independently:**

- Mutation `claim-span-added-without-a-check-is-caught`: `baseline: GREEN`,
  `CAUGHT`, `restored: byte identical`.
- Independent sweep of `public/index.html`'s visible-text numeric tokens
  performed to spot-check the commit's "nothing else numeric and drift-prone"
  claim; the remaining tokens are consistent with the commit's own
  description (CSS/slider values, the fixed historical-report figures, the
  `18 Yrs AEC` bio line) — no contradiction found, though this was a
  lighter-weight spot-check than a full line-by-line reclassification of all
  114 tokens.

**I1-I4, lightly touched as instructed (not deep-audited — already covered by
an earlier pass):**

- `buildWorldState`'s own mutation (`buildWorldState-forwards-its-seed`)
  re-run against `test/cityRenderWorldState.test.ts`: CAUGHT, byte-identical
  restore.
- I5's own third test (`test/runGenerateRequest.test.ts`'s "end to end"
  case) independently exercises `buildWorldState`, `buildScenePlacements` and
  the selection/describe wiring's underlying data path against a **real**
  generated plot, not a fixture, and this test passed in the full green
  suite run above — corroborating, without a separate deep pass, that I1-I4's
  mechanisms genuinely support what I5 is built on top of.

---

## What was not covered, and why

- **Deep re-audit of I1-I4** (`public/city-render.js`'s full breadth,
  `public/world-render-3d.js`'s selection wiring beyond what I5 exercises,
  `public/index.html`'s describe box UI) — explicitly out of scope per
  instruction; already covered by an earlier pass.
- **Phases A-H** and **the assets-lane content that predates the merge**
  (agy's own AS1-AS4 authorship, LOD authoring choices, the historical
  `b84989b` tautology fix described in the ledger) — explicitly out of scope;
  only the merge's *integrity* (nothing lost, nothing corrupted) was checked,
  not the quality of the pre-existing work it carries.
- **Whether Finding 1's unsandboxed-eval gap also exists, or is closed
  differently, on the eventual live Worker path (`src/*.ts`).** I5 confirms
  that path does not exist yet ("`public/*.js` never imports from `src/*.ts`"
  — G1's finding, unchanged), so there is nothing live to check there; this
  audit only establishes that the *one caller that exists today* has the gap,
  not what a future Worker-side implementation will do.
- **A full line-by-line reclassification of all 114 numeric tokens** found in
  the independent sweep of `index.html`'s visible text — spot-checked against
  the commit's own categorisation and found consistent, but not individually
  re-derived one by one against `citySummary.generated.ts` the way
  `test/publicClaims.test.ts` itself does.
- **J1-J3** — correctly named as not attempted in the J4 commit itself
  ("out of scope per this session's own instruction"); this audit did not
  independently re-check that framing, since it is a scoping decision stated
  plainly rather than a claim of completed work.
- **Nobody has audited this audit.** Per `AUDIT-PROTOCOL.md` §7's standing
  note, this report's own "found clean" list — in particular the eight
  independent mutation re-runs — has not been re-run a third time by a
  separate party.

---

## The 4-State Horizon, scoped to what was audited here

| Area | Done | Undone | Could | Should |
|---|---|---|---|---|
| I5 request path composition | `assessTransform → buildGeometryPrompt → injected caller → verifyGeneratedGeometry` composed and mutation-proven; money guard and outcome-fidelity both CAUGHT; nothing in the live app wires it in | The one real caller that exists (`scripts/supervised-generate.mjs`) executes model output with `new Function`, not the Dynamic Worker isolate the module's own contract calls for (Finding 1) | Route the supervised script's `evaluate` through an actual isolated runtime (`vm` module at minimum, a real Worker/subprocess ideally) before the next live model call | Do this before K1-K4 (the security phase this plan already schedules) rather than after, since Finding 1 is exactly the class of defect that phase exists to catch |
| Spend-safety layers (key / `--confirm` / args / y-n) | All four verified independently, real order, no accidental-invocation path, `--yes` bypass explicitly documented | Nothing found | — | Nothing |
| Phase L merge mechanics | 71/56/75 id arithmetic re-derived exactly; both conflict resolutions verified to match current source, not stale targets; AS1-AS4 re-verified intact post-merge; every L1/L3/L4 number re-measured live and matched | — | — | Nothing found wrong; this is the cleanest section of the batch |
| J4 claim registry | Catches the "id added, never mentioned anywhere" case; today's 4 real claims are fully, correctly checked | Catches an id only by substring presence, not by real assertion (Finding 2); scans `index.html` only, not `city.html` like its sibling test (Finding 3) | Require the id to appear inside an actual `spanText(...)`/assertion call, not just the file's raw text; scan both HTML files | Fix Finding 3 now (cheap, one more `readFileSync`); Finding 2 is worth a short follow-up before the registry is relied on under real development pressure |

---

## Answers to the four specific checks requested

1. **"A refused transform never reaches the model caller" / "`productionModelCaller` cannot spend money."** Both **true**, verified by direct code reading and by independent mutation re-runs (byte-identical restores confirmed). The supervised script's safety chain's four *documented* layers have no gap in the sense asked (no accidental invocation, no flag combination that skips a check silently) — but seePoint 1 below for a gap **outside** that specific chain.
2. **Phase L merge arithmetic (71/56/75, zero missing, all unique).** Re-derived independently from git history against both parents — **exactly reproducible**, not merely plausible.
3. **`test/claimSpansAreChecked.test.ts`'s guarantee.** **Narrower than the prose suggests**: it is a substring-presence check, not an assertion-presence check (Finding 2), and it only scans one of the two HTML files its sibling test covers (Finding 3). The ledger's own wording is technically accurate but does not disclose either weakness.
4. **Mutations re-run for real.** Eight independent re-runs across this batch (I5: 5 of 5 CAUGHT; Phase L conflict-resolution controls: 2 of 2 CAUGHT; Phase L AS1-AS4: 4 of 4 CAUGHT; J4: 1 of 1 CAUGHT — 12 total, all CAUGHT, all restores byte-identical), against a baseline confirmed GREEN each time.
5. **Environment.** The assigned worktree had no `node_modules`. Used the sibling checkout `C:\Code\sandbox-spike`, confirmed at the identical commit (`3a46db2`) and byte-identical (`sha256sum`, not just a hash-of-commit assumption) for every in-scope file before trusting anything run there.

Separately, and not one of the four requested checks but found during the
verification of check 1: **Finding 1**, the unsandboxed `evaluate` in the one
real model-calling script, is the highest-severity result of this pass.
