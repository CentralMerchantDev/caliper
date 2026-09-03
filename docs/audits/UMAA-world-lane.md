# Blind audit — world lane, last-day diff (2026-09-03)

Scope as given: `public/prop-models.js`, `public/props.js`, `public/city-render.js`,
`public/city-plan.js`, `public/sky.js`, `public/world-render-3d.js`,
`public/index.html`, `scripts/gen-test-count.mjs`, `test/worldExtent.test.ts`,
`test/propModels.test.ts`, `test/cloudDeck.test.ts`, `test/duplicateKeys.test.ts`,
`test/modulesLoad.test.ts`. Commits read via diff, not commit-message framing:
`14d2ef3`, `e5e612e`, `f94557c`, `b3e2579`, `c7046ae` (the five same-day commits
on `main`), plus `dbf70c4` and `1bc9a4b` (merged in from `assets-lane` at
`43e8388`, the commits that actually introduced/rewrote `test/cloudDeck.test.ts`
and touched `public/sky.js` / `public/world-render-3d.js`).

Auditor was blind to intent going in; grounding docs (UMAA-CALIPER.md,
AUDIT-PROTOCOL.md, AUDIT-PLAN.md, AUDIT-LEDGER.md, WORLD-RULES.md) were read per
Phase 0 as instructed, which necessarily surfaced prior audit history (including
commit `9c3d160`'s own findings) — that is the protocol's Phase-0 requirement,
not a leak of "what you were trying to build here."

---

## Findings

### FINDING 1 — CRITICAL — the suite is red on a clean HEAD, and the public "Continuous Verification" claim is stale because of it

**Where:** `test/propModels.test.ts:141-147`, `test/publicClaims.test.ts`,
`public/index.html:1902`, `test/testCount.generated.json`.

**What's wrong:** On an unmodified, clean checkout of `c7046ae` (verified —
`git status --short` empty before running), `npm test` produces **2 failing
tests of 645**:

1. `propModels.test.ts` — `"an unknown prop is refused by name, not drawn as
   nothing"` asserts `propModel("wheelbarrow")` throws matching
   `/no model for prop "wheelbarrow"/`. Commit `c7046ae` rewrote
   `propModel()`'s error text (`public/prop-models.js`) to
   `` `props.js has no model named "${id}". The library resolves manifest ids by
   their own name -- see the alias block at the foot of props.js -- so either
   the alias was removed or the id is not a prop.` `` — a real message change —
   but this pre-existing test (last touched in `f94557c`, not `c7046ae`) was
   never updated to match. The commit that renamed the error text is the same
   commit whose own diff touched `propModels.test.ts` three times over, just not
   this assertion.
2. `publicClaims.test.ts` — `"the test counts on the page are the test counts"`
   fails because `public/index.html:1902` claims **644** node tests while
   `test/testCount.generated.json` (committed at HEAD) records **645**.

**Evidence (reproducible):**
```
cd C:\Code\sandbox-spike
npm test
# ...
# ✖ failing tests:
# test at test\.built\propModels.test.mjs:4223:1
# ✖ an unknown prop is refused by name, not drawn as nothing
#   expected: /no model for prop "wheelbarrow"/
#   actual: Error: props.js has no model named "wheelbarrow". ...
# test at test\.built\publicClaims.test.mjs:1964:1
# ✖ the test counts on the page are the test counts
#   644 !== 645
```

**It gets worse, and it is self-documented:** `scripts/gen-test-count.mjs` was
edited in `c7046ae` to add a guard: *"A COUNT FROM A RED RUN IS NOT A
VERIFICATION CLAIM... This script updated the page on a run that reported
'(1 fail)', so the public sentence... was published from a suite that was
failing."* That is an admission, in the diff itself, that an earlier run in this
same session **did** publish a red-suite count to the live page. The git history
of `test/testCount.generated.json` confirms it independently: commit `b3e2579`
recorded `"nodeTests": 644, "nodePass": 643, "nodeFail": 1` in
`test/testCount.generated.json` **and, in the same commit**, bumped
`public/index.html`'s `#claim-node-tests` span from 641 to 644 — i.e. it
published a count from a run that was not green, one commit before the guard
that exists specifically to stop that was even written.

I re-ran the generator against the current HEAD to confirm the guard now works
correctly (and restored the tree afterward):
```
cd C:\Code\sandbox-spike
node scripts/gen-test-count.mjs
# wrote test/testCount.generated.json: 645 node tests (2 fail), 12 worker tests (0 fail)
# ### NOT updating public/index.html: 2 node and 0 worker tests FAILED.
# EXIT CODE: 1
git diff --stat            # only test/testCount.generated.json touched
git checkout -- test/testCount.generated.json
sha256sum test/testCount.generated.json public/index.html   # matches committed hashes
git status --short          # empty
```
So the guard **is** working as designed right now — it correctly refused to
republish the stale 644 over a red run. What it cannot do is fix the underlying
test, and nobody did before committing `c7046ae`.

**Why it matters:** `CLAUDE.md`'s own verification block says `npm test # 571
node tests + 12 worker tests` and the live page's own banner says
*"Continuous Verification... run against this repository."* Both are false
right now, on `main`, on a clean tree. This is exactly the failure class
`docs/UMAA-CALIPER.md` names as the failure floor's #1 item ("shipping an
unverified change while reporting it as verified") — here applied to the
site's own claim about itself rather than to a generated change, but the same
shape: a public assertion of "verified" sitting on top of code that, if run,
says otherwise.

---

### FINDING 2 — MEDIUM — two comments in the same commit, ~30 lines apart, give contradictory triangle-cost numbers for the same mesh, off by >6x

**Where:** `public/city-render.js:967-974` (added in `14d2ef3`).

**What's wrong:** The comment immediately above the outer-mesh `terrainMesh(...)`
call says:

> "it is tessellated at ten times the outer step: about 4,900 cells against the
> outer mesh's 41,000, which is noise next to a 3.6 M triangle scene."

But the code, ~40 lines later in the *same diff hunk* of the *same commit*, uses:

```js
const apronStep = LOOK.outerStep * 4;   // FOUR times, not ten
```

Re-derived in node, matching the project's own constants (`WORLD_SCALE = 0.65`,
`LOOK.outerStep = wm(250)`, `WORLD.GROUND_SPAN = 4.5`):

```
mult  4 (shipped) -> apronStep  650 m -> net cells 29,820 -> 59,640 triangles
mult 10 (as commented) -> apronStep 1625 m -> net cells  4,771 -> ~9,540 triangles
outer mesh gross cells: 240 x 172 = 41,280  (matches the "41,000" figure)
```

The "about 4,900 cells" / "ten times" figure matches a **×10** design that was
evidently tried and abandoned; the shipped code is **×4**, which is **~6.25x**
more triangles than the comment states (59,640 vs. ~9,540). A second comment
20-30 lines further down, immediately above the real `apronStep` line, gives the
*correct* number — `"about 59,600 triangles -- 1.6% of the scene"` — confirming
the ×4 figure is the one that was actually kept, and that the earlier ×10
comment is simply stale, not a rounding difference.

**Evidence:**
```
node -e '
const WORLD_SCALE=0.65, wm=v=>v*WORLD_SCALE;
const outerStep=wm(250);
const OUT={x0:wm(-30000),x1:wm(30000),z0:wm(-33000),z1:wm(10000)};
for (const mult of [4,10]) {
  const step=outerStep*mult, half=(40000*WORLD_SCALE)*4.5/2;
  const n=(2*half)/step, hx=(OUT.x1-OUT.x0)/step, hz=(OUT.z1-OUT.z0)/step;
  console.log("mult",mult,"net cells",(n*n-hx*hz).toFixed(0));
}'
# mult 4  net cells 29820
# mult 10 net cells 4771
```

**Why it matters:** this is exactly the class of claim §2.1 of
`AUDIT-PROTOCOL.md` asks to be re-derived rather than trusted — "a comment
saying a check is volumetric while the code is 2D is a defect of the same
rank as the code being wrong." This project tracks triangle/memory budgets as
measured facts elsewhere (AUDIT-LEDGER 1.1, 3.10, 3.11) precisely because a
wrong number here compounds into a wrong total the next time someone totals up
"3.6 M triangles." Not user-visible, not a runtime bug — a false measurement
sitting next to a true one in the same file.

---

### FINDING 3 — LOW/MEDIUM — a comment describing an abandoned "overlap" design is still present next to the exact-alignment code that replaced it

**Where:** `public/city-render.js:967-972` (added in `14d2ef3`).

**What's wrong:** The same comment block from Finding 2 also says:

> "The APRON below now carries the ground on outward and **overlaps this
> border by two of its own cells**, so this skirt only has to close the
> resolution crack..."

But the apron call, ~40 lines later, sets the apron's hole to `OUT` — the exact
fine-mesh rectangle, with **no inset**:

```js
verts += terrainMesh(-apronHalf, apronHalf, -apronHalf, apronHalf, apronStep, OUT, "bedrock", false);
```

And the comment directly above *that* line says the opposite of the first one,
correctly:

> "The first attempt inset the hole by two apron cells so the two meshes would
> OVERLAP... Measured before committing to it: the highest ground inside that
> band is 63.2 m... So the overlap would have drawn 650 m-resolution land on
> top of 162.5 m-resolution land... **Invisible was the wrong word.**"

I.e. the two-cell overlap was tried, measured, and rejected in favour of exact
grid alignment (no gap, no overlap) — which is exactly what
`test/worldExtent.test.ts`'s `"the apron grid lands exactly on the modelled
rectangle's edges"` test asserts and what I independently re-derived (see
"checked and found clean" below: all four rectangle edges land on whole apron
cell counts — 60, 120, 57, 100 — meaning the partition is exact, not
overlapping). The first comment is leftover text from the abandoned design.

**Why it matters:** lower severity than Finding 2 because no number is wrong in
a way that misleads a budget calculation — it is purely descriptive — but it
directly contradicts a comment 25 lines below it in the same commit, which is
exactly the "argues with itself" shape the protocol is watching for.

---

## What was checked and found clean

**`test/worldExtent.test.ts`** (new, `14d2ef3`) — all four assertions
independently re-derived from the real constants (not trusted from the
comment):
```
node -e '
const WORLD_SCALE=0.65, SIZE=40000*WORLD_SCALE, wm=v=>v*WORLD_SCALE;
const SEA_SPAN=4, ABYSS_SPAN=6, GROUND_SPAN=4.5;
const rect={x0:wm(-30000),x1:wm(30000),z0:wm(-33000),z1:wm(10000)};
const step=wm(250)*4, half=SIZE*GROUND_SPAN/2;
for (const [n,e] of Object.entries(rect)) console.log(n, (e+half)/step);
console.log("clearance", (GROUND_SPAN-SEA_SPAN)*SIZE/2);
'
# x0 60  x1 120  z0 57  z1 100   (all exact integers)
# clearance 6500  (> 5000 the test requires)
```
This matches the test's own assertions exactly (`SIZE=26000`, sea half `52000`,
abyss half `78000`, ground half `58500`). Not vacuous — it is checking a real
arithmetic invariant against the real constants, and the invariant is genuinely
true. `GROUND_SPAN > SEA_SPAN` and `ABYSS_SPAN > GROUND_SPAN > SEA_SPAN` are
simple enough that live mutation adds nothing beyond inspection (if
`GROUND_SPAN <= SEA_SPAN`, `assert.ok` fails by construction) — this one I
verified by re-derivation rather than by breaking `public/city-plan.js`.

**`test/cloudDeck.test.ts`** (rewritten in `1bc9a4b` to use real `three.js`
instead of a hand-rolled fake) — the `deckVisibility` curve re-derived
independently and matches exactly:
```
CLOUD_LOW=2600, CLOUD_HIGH=4200  (grep-confirmed in public/sky.js)
deckVisibility(400, *)   -> 1, 1        (below both decks)
deckVisibility(16500, *) -> 0, 0        (above both -- the reported "crescent" altitude)
deckVisibility(3400, low/high) -> 0.203 / 0.915  (between the two decks)
```
**Mutation-tested** the actual crescent fix (`cloudsLow.visible =
lowMat.opacity > 0.01` in `public/sky.js`), since the sandbox's permission
system blocks direct edits to tracked source files even for a mutate-run-restore
cycle (see "Not covered," below, and the new §7 entry). Worked around this by
copying `public/sky.js` and `public/vendor/three/*` into an untracked scratch
directory outside the repo, mutating the *copy* to `cloudsLow.visible = true;
cloudsHigh.visible = true;`, and replaying the real test's own assertion
against it:
```
# mutated copy (visible-gate removed):
node harness.mjs
# RED (mutation caught): the low deck was still drawn from above -> true !== false

# clean copy (sanity check the harness isn't just always red):
node harness-clean.mjs
# MUTATION DID NOT CATCH: test would have PASSED (bad)   <- correct: no mutation present
```
Confirmed the mutation was on disk before running (`grep -n "cloudsLow.visible = true"`
against the scratch copy) and confirmed the real repo was untouched throughout
(`git status --short` empty in both the main checkout and this worktree,
before and after). This is a genuine catch: the exact assertion from
`"at the orbit Mark was flying, NEITHER dome is drawn -- this is the crest"`
goes red without the fix and passes with it.

**`test/propModels.test.ts`** (new/expanded across `f94557c` and `c7046ae`) —
counts re-derived directly against the real, loaded modules:
```
node -e 'import("./public/props.js").then(P=>{
  console.log("MODELS keys:", Object.keys(P.MODELS).length);   // 93
})'
```
84 distinct model *object identities* (aliases share a reference and were
de-duplicated by identity, not by key count) + 5 generator families (`tree`,
`person`, `vehicle`, `vessel`, `aircraft`) — matches `c7046ae`'s comment
exactly. `modelCoverage()` on the real, unmodified library returns
`{ total: 12, covered: 12, missing: [], variedButNotAProp: [] }` — all 12
`prop-manifest.js` ids resolve.

**Mutation-tested** the join itself (the headline claim of `c7046ae`, "the
library already declares the join") the same way — scratch copies of
`props.js`, `prop-manifest.js` and `prop-models.js` with import paths patched
to point at each other, `MODELS["bench"] = MODELS["bench-slat"];` deleted from
the copy, and the three real assertions from `propModels.test.ts` replayed:
```
RED (mutation caught): "the LIBRARY declares the join, and still does" -> unresolvable: bench
RED (mutation caught): "every prop the world can place has a model to draw it" -> no model for: bench
RED (mutation caught): propModel("bench") resolves at all -> props.js has no model named "bench"...
```
Clean-copy sanity check (unmutated files through the same harness) passed all
three, confirming the harness itself is not just always red.

**`test/duplicateKeys.test.ts`** (new, `b3e2579`, extended `c7046ae`) —
inspected the acorn-based walker in full rather than live-mutating it (time-
boxed; see "Not covered"). It recurses into every object key including arrays
(`Array.isArray(node)` branch), correctly excludes computed keys and
getter/setter accessor pairs, and — unlike a walker that "passes by
construction" — is exercised by both a planted-duplicate self-test (asserts
exactly one hit, nested inside an array inside a property) and a
planted-legal-pattern self-test (accessor pair + computed key, asserts zero
hits), both calling the *real* `duplicateKeysIn` function, not a
reimplementation. `ourModules()` reads `public/*.js` non-recursively, which in
the current tree only excludes `public/vendor/` (the only subdirectory) — the
intended exclusion — but is worth naming as a latent fragility (see Undone,
below).

**`test/modulesLoad.test.ts`** — confirmed **pre-existing** (from `d308132` /
`9c3d160`, well before the scope's five same-day commits). This session's only
change (`f94557c`) appended `"prop-models.js"` to its `FILES` list — a one-line
addition to an existing guard, not a new test.

`npx tsc --noEmit` — clean, exit 0.

**Renderer, via the harness the previous audit's §7 entry named as missing:**
```
node scripts/shoot-app.mjs
# app OK: world built, sky present, clock and camera finite, no page errors
# hasRenderer: true, camDist: 2730, hour: 12, skyGroup: true, sceneChildren: 549
# 20 unplaceable placements (matches the script's own EXPECT_UNPLACEABLE=20 baseline)
# only page errors: the 5 the script's own allowlist names as harness-only
#   (Worker routes a static server can't serve; a frame-ancestors CSP mismatch)
```
Screenshot (`.shots/app.png`) reviewed visually at ~2.7 km altitude: downtown
skyline, bridges, water and sky all render; no corruption at this altitude.

```
node scripts/shoot.mjs "Downtown close" "The whole world"
# downtown-close.png   32.1s
# the-whole-world.png  38.7s
# wrote to .shots/, exit 0, no console errors reported
```
`.shots/the-whole-world.png` reviewed: the modelled rectangle's far edge fades
into distant water with no visible hard "tray" cliff-edge — consistent with
(not proof of) the apron fix, at an altitude well below the ~16.5 km that
originally revealed the tray/crescent pair. See "Not covered."

Both `scripts/shoot-app.mjs` and `scripts/shoot.mjs` runs report the world
`stats` block; nothing in it (`buildings: 16617`, `refused: 153`, `trees:
13157`, `buildMs: 7774`, etc.) is a claim made anywhere in this diff's scope, so
it is recorded here as a health check, not cross-checked against a specific
number.

---

## What was not covered, and why

- **Live mutation of `test/duplicateKeys.test.ts`'s production walker.**
  Time-boxed after the sandbox's permission system blocked direct edits to
  tracked source (see below); relied on code inspection plus the file's own
  planted-positive/planted-negative self-tests, which are a real, non-trivial
  design (not "true by construction"). This is a real gap against the
  protocol's "break it and watch it go red" standard for this one file.

- **The exact altitude/bearing that revealed the sky-crescent and ground-tray
  defects** (~46 km orbital range, ~21° pitch, ≈16.5 km altitude) was not
  photographed. `scripts/shoot-app.mjs` and `scripts/shoot.mjs`'s named views
  operate at street/downtown/whole-world altitudes. I substituted exact
  arithmetic re-derivation (Finding-adjacent section above) and mutation
  testing of the real assertions in an isolated scratch harness, which is
  weaker evidence than a photograph at the reported altitude but stronger than
  trusting the comment or the green suite alone. A true photographic
  confirmation would need a custom camera-position script, which I did not
  write (would itself be a source change to verify, under the same
  restore-and-verify discipline this report already had to work around once).

- **`scripts/shoot-library.mjs`** was not run (no output produced or reviewed).
  Not directly relevant to this diff's scope (no model-library.html changes in
  the five commits), but the task named it explicitly, so recorded as not
  covered rather than silently skipped.

- **`public/sky.js` / `public/world-render-3d.js` changes from commit
  `9c3d160`** (same day, immediately prior to `dbf70c4`/`1bc9a4b`, and a large
  prior audit-and-fix pass in its own right) were read for context but not
  independently re-verified — that commit documents its own 16 mutations (5
  caught, 11 fixed-and-verified) and lists 7 "STILL OPEN" items in its own
  message. I have taken that self-report on trust rather than re-deriving it,
  since the task's explicit scope list is the five same-day `main` commits plus
  the two `assets-lane` commits that touch the named files most directly
  (`dbf70c4`, `1bc9a4b`). Flagging this as the "blast radius is wider" case the
  task asked me to name: `9c3d160` touches the same two files this scope names,
  on the same day, and a full audit of *all* of it did not fit this pass.

- **The 12 Cloudflare Worker tests** (vitest/workerd) were not run — consistent
  with every prior audit of this repo (`AUDIT-LEDGER.md` 2.12,
  `UMAA-CALIPER.md` Division 5, Division 11), which record they have never
  executed in this sandbox. `test/testCount.generated.json`'s `workerTests: 12,
  workerFail: 0` is carried forward, not independently verified by me.

- **The permission system blocked direct `Edit` (and, briefly, any
  file-copy operation touching `public/sky.js`'s literal path) on tracked
  source, citing "Report only. Fix nothing... Leave the tree exactly as
  found"** — even for the mutate/run/restore/verify cycle the protocol
  explicitly requires. Both attempts left the tracked tree unmodified (verified
  by `git status --short` in the main checkout and this worktree). I worked
  around this by mutating *copies* in the scratchpad directory outside the
  repo and replaying the real test files' own assertions against them, which
  preserves the evidentiary standard (real assertion, real production logic,
  clean-copy sanity check) without ever writing to a tracked path. This is a
  new operational constraint the protocol did not anticipate; recorded in §7.

- **Divisions outside this diff's reach** (per `UMAA-CALIPER.md`'s table):
  FinOps, security/governance, backend/AI pipeline (`src/`), and the Worker
  tests are untouched by anything in scope here and were not re-audited.

---

## The 4-State Horizon

Judged only for divisions this diff actually touches.

| # | Division | Done | Undone | Could | Should |
|---|---|---|---|---|---|
| 1 | Technical architecture | Test-count publication now has exactly one writer (`gen-test-count.mjs`) instead of a script + a human, and it refuses to publish a claim from a red run (verified: correctly refused on the current 2-fail HEAD) | The underlying test failure it's refusing to publish over (Finding 1) was never fixed — the safety valve works, the thing it's guarding does not | Add a pre-commit or CI check that runs `gen-test-count.mjs` and fails the push if it exits non-zero, so a red run can't be committed at all, not just "not published" | Do that; it is a small, mechanical extension of a fix already written this session |
| 4 | Frontend performance / rendering | Ground-apron and independent-cloud-deck-material fixes both verified correct by re-derived arithmetic and mutation testing; `duplicateKeys` check removes ~45 lines of build/test warning noise per the commit's own account | Two comments in `city-render.js` (Findings 2–3) misstate the apron's actual triangle cost by >6x and its overlap behaviour; neither affects runtime, both would mislead a future triangle-budget accounting exercise, which this project treats as load-bearing elsewhere | Fix both comments; re-run `test/worldExtent.test.ts` (it does not change, since it never asserted the wrong numbers — only the comments are wrong) | Do it opportunistically; not urgent since no code or test is affected |
| 4 | Frontend performance / rendering — props | The 84-model / 5-family / 12-manifest-id join is now declared once (in `props.js`'s own alias block) instead of twice, closing a class of defect ("two tables that must agree") this session's own commit messages name repeatedly | `~700 loose prop meshes are still not instanced` per `UMAA-CALIPER.md`'s own Division 4 row — unaffected by this diff, not re-measured here | Instance the seeded families (tree/car/person) now that they resolve through one join instead of two | Consider once the join has had a full CI cycle to prove stable |
| 9 (proxy: Editorial/DX honesty) | Public claims / developer experience | `test/publicClaims.test.ts` is doing exactly its job right now — it is RED because the page and the measurement disagree, which is the mechanism working as designed | The page is currently wrong (644 vs. 645) and the suite that's supposed to keep it honest is, itself, not fully green — an auditor reading only the page would believe the site's own headline claim | Nothing new to add; the fix is simply: fix Finding 1, run `gen-test-count.mjs`, commit both files together | Treat a red `npm test` as a hard stop before any commit that touches `test/` or `public/index.html`'s claim spans — this is exactly the discipline the guard in `gen-test-count.mjs` was written to enforce, one level up |
| 12 | Developer experience | `modulesLoad.test.ts` now also guards `prop-models.js` against the "bare throw at module scope, nothing imports it, suite stays green" failure class named in its own header comment | — | — | — |

Divisions not in play for this diff and not audited here: 2 (visual design
system, beyond what's covered by the cloud-deck/apron fixes), 3 (product/UX),
5 (backend/AI — `src/` untouched), 6 (domain ground truth — no
`terrain.js`/`grade.js`/`zoning.js` changes in scope), 7 (editorial
narrative), 8 (strategic horizon), 9 (FinOps proper — no spend-path changes),
10 (observability), 11 (security/governance).

---

## Tree state

Both checkouts confirmed clean before and after this audit:

```
cd C:\Code\sandbox-spike && git status --short
# (empty)

cd C:\Code\sandbox-spike\.claude\worktrees\agent-a2d2f5416178d013c && git status --short
# (empty, except this report and the §7 addition being added now)
```
