# The world build — what was built, what was measured, what is still open

Written 2026-09-04 at the close of `docs/WORLD-BUILD-PLAN.md` PART 7. Every
box in the ledger is `[x]` with evidence or `[!]` with a reason — this is the
narrative account of that run: what got built, what the numbers actually are,
what was deliberately not done, and the two incidents worth remembering so
they are not repeated.

---

## What was built

**Phase A — the world becomes a value.** A1 and A2 (seed the noise, seed the
terrain) existed before this run started; A2b threaded the seed the rest of
the way through `city-plan.js`'s four `fbm` calls, and along the way found a
root-cause bug: `hash2` mixed a seed via `Math.imul(seed, …)`, and `Math.imul`
coerces with `ToInt32` — a string seed silently became `0`, colliding with the
default seed. Fixed once, in `hash2` itself, not patched per call site. A3
made `DISTRICTS`/`SETTLEMENTS`/`BRIDGES`/`GRID` a frozen spec each world
derives its own copy from, and found a real shallow-copy bug in the same
motion: `generateWorld`'s returned `districts` shared one `bounds` object
across every world instance. A4 tied plan, land and layers to one seed in
`public/world.js`.

**Phase B — it persists.** B1 (`public/world-store.js`) is one
adapter-agnostic store over four adapters (memory, localStorage, KV,
IndexedDB — the last one real but unverifiable in this sandbox), whose actual
point is that a corrupt stored record is *reported*, never silently returned
as a fresh empty world. B2 (`public/apply-layers.js`) resolves only
`world.touched()`, never every placement — proven by counting `resolve()`
calls, not just checking the output looks right.

**Phase C — it draws**, at the mechanism level. C1
(`public/instance-groups.js`) partitions layered placements so an overridden
one leaves its shared InstancedMesh group, proven against ~19,800 real
placements, not a fixture. C2 (`public/model-registry.js`,
`public/resolve-models.js`) registers only forge-verified models and refuses
an unknown id by name, never a default shape. Neither is wired into
`city-render.js` yet — named as Undone below, not silently skipped.

**Phase D — the agent's path into the world.** D1 (`public/selection.js`)
and D2 (`public/describe-request.js`) are thin, tested wrappers with no DOM
wiring. D4 (`public/generate-request.js`) builds the prompt from D3's
measured constraints and verifies a response against those same constraints,
never anything the response itself claims — with the explicit discipline
that **no model is called anywhere, including in the tests**. D6
(`public/stage-artefact.js`) shapes what a stage event would carry without
touching the live 2,000-line `src/changePipeline.ts`. D7
(`public/apply-and-persist.js`) is the join: a verified model becomes a
layer referencing its model *by id*, proven by asserting the serialised
layer never contains the source string, not by a function that was simply
never given the source to leak. D8 (`public/undo.js`) proves undo survives a
reload, which is the property isolation-level proof at the model layer
cannot show.

**Phase E — quests.** E1 existed already. E2 extended `questState` with a
`changed` field sourced from the live layer model's own `touched()`, and
`public/change-quest.js`'s check reads only that — proven both by a passing
case and by grepping the check's own source for the word "flag", which does
not appear.

**Phase F — regions.** `public/grid.js` gained `closeRegion` (only `open`
existed before); `public/world.js` gained a `regions` parameter wiring
`createGrid` to the world instance, default-preserving today's whole-world-
open behaviour exactly.

**Phase G — guardrails as dials.** G1 found `src/controlLayer.ts`'s
`CONTROL_LIMITS` already satisfied the property asked for — nothing in `src/`
needed to change, only a behavioural proof that every gate reads it live
(monkey-patch the real constant, watch the real gate's behaviour move) rather
than a hard-coded copy. G2 is `[!]` BLOCKED: a genuine second profile needs
authorised business numbers and a real selection mechanism, neither of which
exists tonight, and fabricating either would have been the exact
"true-by-construction" shape this project's own audit protocol warns against.

**Phase H — close-out.** H1: 53 of 53 mutation controls CAUGHT, zero
SURVIVED, zero INCONCLUSIVE — see the incidents below for how that number was
actually reached. H2: every page claim verified true today. H3: PART 0's
ground truth re-measured, and a pre-existing staleness (from before this
session) found and corrected rather than propagated.

---

## What was measured

All commands re-runnable; see `docs/WORLD-BUILD-PLAN.md` PART 0 for the full
table with each command listed beside its figure.

| Fact | Value |
|---|---|
| Suite | 868 node tests / 81 files (0 fail), 12 worker tests (0 fail) |
| Mutation controls | 53, all finds unique, 53/53 CAUGHT |
| World | 2,291 blocks, 19,874 plots, 19,725 placed (99.3%), 149 refused |
| Draw | 480 InstancedMeshes, 1,451,912 triangles, 0 overhangs, 0 misdeclared footprints |
| Scene | `sceneChildren: 1015`, app OK, no page errors |
| City summary | zero diff on regeneration |

`npx tsc --noEmit` is clean as of every commit tonight. `node
scripts/shoot-app.mjs` and `node scripts/shoot.mjs` both ran clean; the
apron/apron-fix visual state from before this session was unaffected, since
nothing in PART 7 touches terrain or plan geometry beyond seeding it.

---

## What is still not verified, named rather than hidden

**Live rendering integration.** C1, C2, D1, D2, D4, D6, D7 and D8 are all
built and tested as standalone, composable mechanisms — the same
build-the-mechanism-defer-the-wiring pattern repeated deliberately across the
whole night, matching how B1/A4 were built before anything used them either.
None of it is wired into the running app: `city-render.js` still builds its
scene from a bare `generateWorld(heightAt)`, not `createWorld({ seed,
layers })`; there is no click handler calling `selection.pick`; no textarea
calling `makeDescribeRequest`; no route that calls a model and runs D4's
`verifyGeneratedGeometry` against a real response. This is materially larger
than any single ledger line — real DOM wiring, a real model call under the
pipeline's existing spend gates and AST scanners — and deserves its own plan
rather than being squeezed into tonight's evidence by generous
interpretation. **This is the single biggest thing left to do before any of
tonight's work is visible to a player.**

**The Windows visual check named in C1/C2's original ledger text** ("one
building visibly different, everything else unchanged") has nothing to check
yet, for the same reason: the mechanism exists, the live path to exercise it
does not.

**G2 (demo profile vs builder profile)** is `[!]` BLOCKED on two things only
Mark can supply: real numbers for a builder tier's spend caps, and a decision
about what selects between profiles at runtime.

**Scope (one object)**, a limit on how many addresses one layer/request may
touch, does not exist anywhere and has no enforcement point to attach to —
`public/*.js` never imports from `src/*.ts` today. Named at G1 rather than
built as an unenforced, untested constant.

**`public/asset-registry.js` and `public/tier-models.js`** carry an
uncommitted, unrelated change from the parallel `assets-lane` (2,400 → 4,800
models) for the entirety of tonight's session. Flagged before the first
commit, excluded from every commit since, never touched. This is not this
session's work to resolve — it belongs to `agy`'s lane.

**The comprehensive blind audit** covering Phases B through G (deferred from
each phase boundary to one consolidated pass, per instruction mid-session) has
not run yet. The Phase A blind audit that DID run (a separate, fresh,
no-history agent) found three real issues worth carrying into that pass:
seed not reaching `terrain.js`'s exported `cliffiness`/`edgeFalloff`/
`reliefAt` (only `makeHeightAt` reads `field.seed`); `hash01` (noise.js) has
no seed parameter, so most PARK/CIVIC placement and settlement wobble is
seed-invariant; and `createWorld()` costs 2.3–2.7s per call with no
memoization across calls, which matters once something calls it often.

---

## Two incidents worth remembering

**A pre-existing staleness, not introduced tonight.** PART 0's opening
figures (781 tests, 32 controls, 20,624 plots) were already wrong before this
session's build work began — stale relative to a `main`-branch fix
(`627e599`, "row plots tile") that landed earlier and was never reflected
back into the plan document. Found and corrected at H3, and noted in place so
the difference is not mistakenly attributed to anything PART 7 built.

**Two processes raced the same tree, briefly, and were caught.** Mid-fix on
H1's mutation harness, an earlier `mutate.mjs --all --resume` background run
was wrongly assumed dead from an ambiguous status read, and a second,
unrelated invocation was started against the same tree while the first was
still alive. Caught by `public/ground.js` turning up dirty with a mutation
nobody had knowingly applied; both processes were confirmed running and
stopped (`TaskStop` returned success for both — genuine confirmation, not an
assumption), both partially-mutated files were restored and verified by hash
before anything else touched the tree, and the 22 results the live process
had already proved before the collision were reconstructed from this
session's own recorded terminal output — exact id/status pairs, not
re-guessed. `git status`/`tsc --noEmit`/`npm test` were all re-verified clean
before the next commit. This is the second time tonight the project's own
"one agent per checkout" rule has mattered, applied here to two background
*processes* rather than two Claude sessions — the rule is about anything
touching the same tree concurrently, not specifically about which tool is
doing the touching.

---

## The lesson `docs/AUDIT-PROTOCOL.md` and `docs/BUILD-LOOP.md` should carry forward

`scripts/mutate.mjs --all` is a release check sized for a runtime this
environment cannot grant in one sitting (52+ mutations × a ~100–200s full
suite run is over an hour of unbroken execution, against an environment that
reaps long-running commands). Making it resumable (`--resume`, a results file
written after every mutation) made it *survivable* but not *fast enough to
finish*. What actually finished it was switching to `scripts/_mutcheck.mjs`
scoped to each mutation's own guarding test file — seconds per row instead of
minutes — driven over a batch by `scripts/_mutresolve.mjs` (which resolves
each mutation's `expect` string to the one test file that contains it, and
refuses to guess when it's ambiguous) and `scripts/_mutresolve-run.mjs`. The
trade-off — a scoped run cannot see a mutation break something unexpected
elsewhere — is closed cheaply by one final `node test/run.mjs`, run once,
clean and unmutated, after every row is recorded. For any future session
proving a mutation suite this size: start with the scoped method, not
`--all`.
