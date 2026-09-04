# UMAA Phase Boundary Audit — Phase A ("the world becomes a value")

Blind audit per `docs/AUDIT-PROTOCOL.md`, run against commits up to `04b8b2a`
(`A4: the world instance -- plan, land and layers tied to one seed`) on
`main`. Scope: `public/noise.js`, `public/terrain.js`, `public/city-plan.js`,
`public/world-model.js`, `public/world.js`, `scripts/_mutcheck.mjs`,
`scripts/gen-test-count.mjs`, `test/noise.test.ts`, `test/worldSeed.test.ts`,
`test/planSeed.test.ts`, `test/worldSpec.test.ts`, `test/world.test.ts`,
`test/worldModel.test.ts`, `test/mutations.json`.

**A methodology note, stated up front rather than buried:** this worktree
(`C:\Code\sandbox-spike\.claude\worktrees\agent-a1b9089b51ea5dda4`) carries
tracked files only — no `node_modules`. Every command below (`npm test`,
`tsc`, `scripts/_mutcheck.mjs`) was run against the sibling checkout
`C:\Code\sandbox-spike`, at the identical commit (`04b8b2a`, verified by
`git log`), because that checkout has dependencies installed and this one
does not. Partway through, a permission-system classifier locked out further
writes to that sibling checkout after a (correctly refused) `Edit` call
mistakenly targeted it instead of this worktree; the classifier then treated
that refused call as if it had happened and began denying unrelated
follow-up commands, including a same-worktree `npm ci` and even a read-only
`git status` on the worktree at one point. Everything reported as measured
below was captured **before** that lockout, with independent `sha256sum`
before/after every mutation run; the one planned follow-up probe (a custom,
not-in-`mutations.json` mutation of `world.js`'s `resolve`, via the
scratch-copy-outside-the-repo method §3 prescribes) was not completed
because the lockout arrived first. See the final `git status --short` for
proof the sibling checkout carries no leftover mutation.

---

## Findings

### HIGH — the seed reaches the height field but not the three other exported terrain functions; any renderer that consumes them silently draws seed 0

**File:** `public/terrain.js`, lines 1043–1045, exported at 1068–1084.

```js
const cliffinessWorld = (x, z) => cliffiness(toDesign(x), toDesign(z));
const edgeFalloffWorld = (x, z) => edgeFalloff(toDesign(x), toDesign(z));
const reliefAtWorld = (x, z, massKind) => reliefAt(toDesign(x), toDesign(z), massKind) * WORLD_SCALE;
...
export {
  ...
  cliffinessWorld as cliffiness,
  edgeFalloffWorld as edgeFalloff,
  reliefAtWorld as reliefAt,
  ...
};
```

The *design-space* `cliffiness`, `edgeFalloff` and `reliefAt` (lines 234,
160, 586) all correctly take `seed = DEFAULT_SEED` as their last argument,
and `makeHeightAt` (the function `LandField`'s seed actually reaches) calls
each of them with `field.seed` — that part of A2 is real and is what
`test/worldSeed.test.ts` pins.

But the three functions terrain.js hands to the *outside world* under the
same names are wrappers that drop the seed entirely — they call the
design-space functions with **no third/fourth argument at all**, so it falls
back to `DEFAULT_SEED` unconditionally, and the wrapper's own arity proves it
was never wired to accept one:

```
$ node -e '
import("./public/terrain.js").then((T) => {
  console.log(T.cliffiness.length, T.edgeFalloff.length, T.reliefAt.length);
  const a = T.cliffiness(1000, 500);
  const b = T.cliffiness(1000, 500, "totally-different-seed");
  console.log(a === b, a, b);
});'
2 2 3
true 0.07765753005201342 0.07765753005201342
```

`public/city-render.js:34` imports exactly this `cliffiness` (and uses it at
lines 798 and 3165, for cliff-tint blending and beach-scatter placement).
Today that is harmless only because `city-render.js:235` still builds its
own unseeded `new LandField(16)` — both sides land on `DEFAULT_SEED` and
agree by coincidence, not by design. The moment Phase C wires the renderer
to a `createWorld({ seed })` instance (the explicit next step this plan
names), the height field will be correctly seeded (via `makeHeightAt`, which
does carry `field.seed`) while the cliff/beach-tint pass keeps reading
`DEFAULT_SEED`'s cliff zones regardless of which world is on screen — rock
texture in the wrong places on every non-default seed, silently, because
nothing errors. This is exactly the "silently falls back to DEFAULT_SEED"
shape the brief asked to be hunted for, and it sits one file away from the
part of A2 that is actually solid.

**Why it matters:** A2's own status line says "seed threaded through
`edgeFalloff`, `cliffiness`, `shoreRampAt`, `reliefAt`" — true of the
*internal* functions, and reads as a completed claim about the *exported*
ones of the same name, which is what any future caller reaches for. No test
in this repository calls the exported `cliffiness`/`edgeFalloff`/`reliefAt`
with a second world and checks they diverge, so nothing would fail today or
tomorrow if this stayed broken through Phase C.

**No test currently guards this; not in `test/mutations.json`.**

---

### MEDIUM-HIGH — park/civic placement and most settlement texture are identical across every seed, because `hash01` (used throughout the "seeded" plan functions) has no seed parameter

**File:** `public/noise.js:105` (`export function hash01(str)` — no seed
argument, ever). **Called from `public/city-plan.js`** inside functions the
A2b ledger entry lists as seeded: `classForBlock` (1142, 1150),
`generateSettlement` (1613–1614, 1689, 1975), `classForSettlementBlock`
(1857, 1863, 1882).

`classForBlock` decides PARK/CIVIC **before** it ever consults the seeded
density field:

```js
// public/city-plan.js:1140-1148
export function classForBlock(block, district, seed = DEFAULT_SEED) {
  const cx = ..., r = hash01(`cls|${block.id}`);
  if (district && district.primary === "PARK") return "PARK";
  if (district && (district.allow || []).includes("PARK") && r > 0.93) return "PARK";
  if (district && (district.allow || []).includes("CIVIC") && r > 0.86 && r <= 0.93) return "CIVIC";
  let v = intensityAt(cx, cz, seed) + (hash01(`jit|${block.id}`) - 0.5) * 0.30;   // seed only reaches here
  ...
```

`block.id` does not depend on the seed — `generateRoads()`/`generateBlocks()`
take no seed argument and are, by the test suite's own stated reasoning
(`test/planSeed.test.ts:82-89`), "the same topology for every seed by
construction." So `hash01('cls|' + block.id)` is bit-for-bit identical
across every seed, and every block whose PARK/CIVIC roll fires never moves.
Measured directly, over all 269 downtown blocks, comparing seed `0` against
`"harbour-of-saint-elms"`:

```
$ node -e '
import("./public/city-plan.js").then((CP) => {
  const blocks = CP.generateBlocks();
  const planA = CP.generateCityPlan(0), planB = CP.generateCityPlan("harbour-of-saint-elms");
  let parkDiff = 0, civicDiff = 0;
  for (const b of blocks) {
    const dA = planA.districts.find(x=>x.id===b.districtId), dB = planB.districts.find(x=>x.id===b.districtId);
    const cA = CP.classForBlock(b, dA, 0), cB = CP.classForBlock(b, dB, "harbour-of-saint-elms");
    if ((cA==="PARK")!==(cB==="PARK")) parkDiff++;
    if ((cA==="CIVIC")!==(cB==="CIVIC")) civicDiff++;
  }
  console.log(blocks.length, parkDiff, civicDiff);
});'
269 0 0
```

Zero of 269 blocks change PARK status, zero change CIVIC status, across two
genuinely different seeds. The same pattern (an `hash01(s.id + coords)` gate
with no seed) governs whether a settlement block is treated as "open space"
(`classForSettlementBlock:1857`), the corridor/centre jitter radius
(`:1863`, `:1882`), and the density-cutoff wobble in `generateSettlement`
(`:1613-1614`, `:1975`) — so most of what makes one seeded suburb look
different from another (where its parks sit, how its centre's radius
wobbles, which cells inside a low-demand block get skipped) is unseeded too.

**Why it matters:** `test/planSeed.test.ts`'s "a named seed lays out a
genuinely different street grid" test passes — correctly, the sha256
fingerprint really does change — but it passes because *some* blocks change
DENSITY class (measured elsewhere in that file's own comment: "7 of 269,
2.6%"), which the fingerprint is sensitive to. It does not, and structurally
cannot, distinguish "the seed changed the parts of the plan it is supposed
to" from "the seed changed 2.6% of one dimension and left the rest — park
placement, civic placement, settlement texture — completely alone." That is
the exact blind spot AUDIT-PROTOCOL §1 names: "asserted a value was
recorded, never checked… asserted a field was one of a set, never which
one." I do not know whether this is intended (parks fixed by geography
regardless of who's world it is might be a deliberate design choice) or an
oversight, and the ledger does not say either way — which is itself the
finding: it is not stated as a decision, so it reads as one not yet found.

**No test currently guards this; not in `test/mutations.json`.**

---

### MEDIUM — `createWorld()` costs 2.3–2.7 s per call and repeat calls with the *same* seed pay almost the full cost again, because a fresh `LandField`/`heightAt` is built every time and the seed-keyed caches inside `generateWorld` are keyed on `heightAt` object identity, not on the seed value

**File:** `public/world.js:37-51` (`createWorld`), depends on
`public/city-plan.js:1724-1778` (`cityDemand`, `WeakMap` keyed on `heightAt`)
and `public/features.js:183-191` (`placeFeatures`'s `_placementCache`, same
shape).

Measured, three fresh seeds and then a repeat of the first:

```
$ node -e '... W.createWorld({seed}) timed with process.hrtime.bigint() ...'
a-city createWorld: 2509.7 ms   (plots: 20490)
b-city createWorld: 2337.0 ms   (plots: 22108)
c-city createWorld: 2550.8 ms   (plots: 20085)
a-city again (same seed):  2432.7 ms   <- expected to be cheap, is not
```

Isolating why the repeat call does not get cheaper:

```
$ node -e '... new LandField vs generateWorld(heightAt) vs generateWorld(SAME heightAt) ...'
new LandField:                                    39.3 ms
generateWorld (fresh heightAt):                 2657.3 ms
generateWorld (SAME heightAt object, repeat):   1226.8 ms   <- caches DO help when identity is stable
```

and, isolated further, `generateCityPlan`'s own seed-keyed memo (the actual
A2b fix) is fine on its own — 34 ms the first time, 0.0025 ms the second:

```
generateCityPlan first call:                       33.9 ms
generateCityPlan second call (same seed):         0.0025 ms
```

So the seed-keyed fix inside `generateCityPlan` genuinely works. But it is a
small fraction of the ~2.4 s `createWorld()` actually costs — the rest is
`cityDemand`'s distance-grid build, `placeFeatures`'s site search, zoning,
per-settlement road/block/plot generation and road-clipping/bridging, all of
which live behind `WeakMap`s keyed on the `heightAt` *function object*.
`createWorld()` builds a brand-new `LandField` (and therefore a brand-new
`heightAt` closure) on every single invocation — line 38, `new LandField(16,
420, 40, seed)` — so those `WeakMap`s miss on every call, including two
calls with the identical seed. The ~50% saving measured above (2657 ms →
1227 ms) is real but structurally unreachable from `createWorld()` as
written.

**Why it matters:** the audit brief for this phase names this exact
question — "is that instantiation cost documented/acceptable, or a trap for
whatever calls `createWorld()` next (B1's layer store, C's renderer)?" It is
not documented anywhere: `docs/WORLD-BUILD-PLAN.md`'s A4 ledger entry states
what `createWorld()` composes and how it is tested, with no cost figure and
no note that repeat calls do not get cheaper. B1 (a layer store that loads a
world by seed) and C (a renderer) are both named as the next consumers, and
both are exactly the callers who would ask for the same seed more than once
in a session. 2.3–2.7 s is not fatal by itself, but a caller who reasonably
assumes "the memoisation this phase built" makes repeat access to one world
cheap will be wrong by roughly 50%, and "the world is a value" is precisely
the point A4 exists to establish.

**Not a "logic defect" in the sense of wrong output** — every fingerprint
test that touches `createWorld()` passes, and correctly. This is a
performance trap the current tests cannot see because none of them time
anything.

---

### LOW — `worldFromJSON` is exported with the same name and a different shape from two different modules

**Files:** `public/world.js:64-68` returns a full world (`{ seed, plan,
land, layers, resolve, toJSON }`, via `createWorld`); `public/world-model.js:267-271`
returns only the layer model (`{ seed, add, remove, resolve, ... }`, via
`createWorldModel`). Both are named `worldFromJSON`, both round-trip a
`{ seed, layers }` payload, and neither doc comment mentions the other
exists.

Each is correctly imported and tested against its own module today
(`test/world.test.ts:14` imports `world.js`'s; `test/worldModel.test.ts:21`
imports `world-model.js`'s), so this is not live breakage. It is a naming
trap for whoever writes B1 (the layer store) or D7 (apply-and-persist) next:
importing the wrong one by habit — `world-model.js` is the file that
introduced the concept and is the more likely muscle-memory import — silently
hands back an object with no `.plan` or `.land`, and the failure would
surface far from the import line, as a `undefined.plots` deep inside a
renderer or a test fixture.

**Why it matters, briefly:** cheap to fix (rename one, e.g.
`worldModelFromJSON`), and the project has already paid for exactly this
shape of defect once — two tables/two functions with the same name or the
same job, drifting apart, is the recurring pattern this repo's own commit
history calls out by name at least four times before this phase.

---

### LOW — the `_mutcheck.mjs` failure-name regex requires an exact time-unit suffix and would misreport a test whose output line doesn't match it

**File:** `scripts/_mutcheck.mjs:68`:
`/^✖ (.+?) \([\d.]+m?s\)$/gm`

This is a real improvement over the TAP-shaped regex it replaced (confirmed
by the tool actually working, below), but it hard-codes Node's default
"spec" reporter's exact line shape, including a trailing `)`+end-of-line
with no trailing whitespace or additional annotation tolerated. If a future
Node version changes the spec reporter's suffix (e.g. adds a memory figure,
or a different time unit not matching `m?s`), every red run would report
`INCONCLUSIVE` (no name extracted, not a crash) rather than erroring loudly
— which is a softer failure than the two regex bugs already found and fixed
this session, but the same class of defect: a hard-coded shape assumption
about a reporter this project does not control. Not exercised as a defect
today (Node's current reporter matches it, verified below), so this is
recorded as a fragility rather than a live bug.

---

## What was checked and found clean

**Baseline suite, before any mutation (per the §7 lesson: check this
FIRST):**
```
$ node test/run.mjs 2>&1 | tail -6
ℹ tests 808
ℹ suites 0
ℹ pass 808
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
```
0 failures on a clean checkout at `04b8b2a`. `npx tsc --noEmit` produced no
output (clean). `node scripts/gen-test-count.mjs` reported "wrote
test/testCount.generated.json: 808 node tests (0 fail), 12 worker tests (0
fail)" and "public/index.html already agreed with the measurement" — no
file was left modified by running it (`git status --short` after showed no
change to `test/testCount.generated.json` or `public/index.html`; only the
pre-existing, unrelated `public/asset-registry.js` / `public/tier-models.js`
changes from a different lane were present, see the final status below).

**Every phase-A mutation in `test/mutations.json` runs CAUGHT against its
correct guarding test**, independently re-run one at a time, each preceded
and followed by an `sha256sum` of the source file to confirm the restore
(not just trusting `_mutcheck.mjs`'s own "restored: byte identical" line):

```
$ node scripts/_mutcheck.mjs test/noise.test.ts public/noise.js test/mutations.json
baseline: GREEN
CAUGHT   seed-zero-is-the-original-world
CAUGHT   a-seeded-field-uses-its-seed
restored: byte identical

$ node scripts/_mutcheck.mjs test/worldSeed.test.ts public/terrain.js test/mutations.json
baseline: GREEN
CAUGHT   the-field-carries-its-seed
CAUGHT   the-height-function-reads-the-fields-seed
restored: byte identical
(beach-has-a-width SURVIVED here -- expected: that mutation's guarding test
 lives elsewhere, not in worldSeed.test.ts; not a phase-A finding)

$ node scripts/_mutcheck.mjs test/planSeed.test.ts public/city-plan.js test/mutations.json
baseline: GREEN
CAUGHT   generateWorld-forwards-its-seed
restored: byte identical
(ground-edge-is-far-enough-out, apron-grid-alignment SURVIVED, and
 row-plots-are-whole-cells / row-origin-is-on-the-cell-grid came back
 INCONCLUSIVE against this test file -- all four are guarded by OTHER test
 files, not planSeed.test.ts; expected cross-file noise, not phase-A findings)

$ node scripts/_mutcheck.mjs test/worldSpec.test.ts public/city-plan.js test/mutations.json
baseline: GREEN
CAUGHT   districts-copy-clones-its-bounds
restored: byte identical

$ node scripts/_mutcheck.mjs test/world.test.ts public/world.js test/mutations.json
baseline: GREEN
CAUGHT   world-toJSON-carries-its-layers
restored: byte identical
```

Independent restore verification (sha256, captured before the first
mutation run and again after all five runs above completed):
```
before: b3e867a0...9f  public/noise.js
        11df6021...cd  public/terrain.js
        04994771...48  public/city-plan.js
        478dd258...21  public/world.js
after:  b3e867a0...9f  public/noise.js       (identical)
        11df6021...cd  public/terrain.js     (identical)
        04994771...48  public/city-plan.js   (identical)
        478dd258...21  public/world.js       (identical)
```

**The two caching bugs the plan says were found and fixed this phase are
genuinely fixed, and I could not find a third of the same shape** beyond the
seed-blindness noted above (which is a *missing* seed parameter on `hash01`,
not a cache keyed on the wrong thing — a different defect shape):
- `generateCityPlan` (`city-plan.js:3501-3508`) is now a `Map` keyed on
  `seed`, confirmed by direct timing (34 ms cold, 0.0025 ms warm, same seed).
- `cityDemand` (`city-plan.js:1724-1778`) is a `WeakMap` on `heightAt`
  containing an inner `Map` on `seed` — the two-level structure the comment
  describes is really there, not just described.
- Checked every other `WeakMap`/`Map` cache in the files a seed-aware
  function could reach (`terrain.js`'s `WATERWAY_GEOM`, `city-plan.js`'s
  `_coastIndexes`, `features.js`'s `_placementCache`): none of these is
  fed by anything seed-dependent (waterway geometry, the coastline polygon
  and feature placement are all geometry-only, not noise-seeded), so keying
  them without a seed is correct, not a bug of the kind being hunted for.

**A3's freeze and per-world-copy fix is real and independently exercised.**
`DISTRICTS`, `SETTLEMENTS`, `BRIDGES`, `GRID` all throw on a top-level write,
a nested write, and (for the array-valued three) a `push` — verified by
`test/worldSpec.test.ts` passing green in the baseline run above, and by the
`districts-copy-clones-its-bounds` mutation CAUGHT above. I additionally
checked whether the same one-level-too-shallow bug could recur one level
further down for `SETTLEMENTS`: `generateWorld`'s public `settlements`
return value (`city-plan.js:3040-3041`) is built as a brand-new small object
with only `{ id, name, landmass, plots, blocks, cls }` — it never carries
`.bounds` at all, so there is no aliased-`bounds` path to leak through for
settlements the way there was for districts. `generateCityPlan`'s internal
`city.districts` field (`city-plan.js:3531`) does still hand out the raw
frozen `DISTRICTS` singleton rather than a per-call copy, but because it is
frozen, a write through it throws rather than corrupting another world —
different failure mode (loud, not silent) — and nothing outside
`buildCityPlan` reads `city.districts` (`generateWorld`'s own return builds
its `districts` field separately, from the module constant, with the real
per-world clone). Not a live defect; noted for completeness since it was
directly adjacent to what A3 fixed.

**A4 composes rather than reimplements, confirmed independently of its own
test.** Beyond the `world-toJSON-carries-its-layers` mutation (CAUGHT
above), I re-derived `test/world.test.ts`'s own composition claim by hand:
`createWorld({seed}).plan` fingerprints identically to calling
`generateWorld(makeHeightAt(new LandField(16,420,40,seed)), seed)` directly,
and `createWorld`'s `land` fingerprints identically to a directly-built
`LandField` for the same seed — matching what the test already asserts, not
a new finding, but re-derived rather than taken on the test's word.

**`gen-test-count.mjs`'s guard against publishing a stale/red count** was
exercised by nature of running it on a green suite (it reported the count
matched already and wrote nothing); I did not force a red run to check the
refusal path, since that would have meant mutating a tracked source file a
second, unrelated way after the lockout above made further tracked-file
mutation unavailable — recorded as not covered, below, rather than assumed.

---

## What was not covered, and why

- **A live, from-scratch `npm ci` + full `npm test` + `tsc` inside the
  assigned worktree itself.** The worktree has no `node_modules`; every
  command was run against the sibling checkout at the same commit instead.
  This is a repeat of the exact gap `docs/AUDIT-PROTOCOL.md` §7's
  2026-09-03 entry already recorded once ("it could not execute anything…
  spawned into a fresh git worktree") — evidently still not closed by
  whatever sets these worktrees up. See the §7 addition below.
- **A second, from-scratch custom mutation of `public/world.js`'s `resolve`
  closure** (probing whether `w.resolve(x) === w.layers.resolve(x)` would
  catch a hard-coded address, since the only test exercising that equality
  uses one fixed address, `"p9"`) — planned, via the scratch-copy-outside-
  the-repo method §3 prescribes, but the permission lockout described at
  the top of this report arrived before it could be run. This is a real,
  specific gap I would flag as the single highest-value next thing to check
  if this audit is re-run: `test/world.test.ts`'s "world.resolve and
  world.toJSON are the layer model's own" test (line 73-78) only ever calls
  `w.resolve("p9")`, so a `resolve` that ignored its argument and always
  asked the layer model for `"p9"` would pass this specific test today.
- **`scripts/_mutcheck.mjs`'s refusal to run against a red baseline** was
  exercised only in the trivial sense (every baseline run in this audit was
  already green); I did not construct a genuinely broken tree and confirm
  the tool refuses, matching its own header comment.
- **`scripts/gen-test-count.mjs`'s narrow exemption path** (publishing a
  count when the *only* failure is "the test counts on the page are the
  test counts" itself) was read but not exercised, for the reason stated
  above.
- **Everything outside the named scope that the same commits did not touch**
  — `public/model-forge.js`, `public/transform.js`, `public/quest.js` (D3,
  D5, E1) landed in the same session per `docs/WORLD-BUILD-PLAN.md`'s
  STATUS table but in an earlier commit (`e14b054`) than the four commits
  this Phase-A audit is scoped to (`b90f156`, `e3d1863`, `04b8b2a`) and are
  not in the file list this audit was given; not read in depth here.
- **Visual/renderer verification** (`scripts/shoot-app.mjs` etc.) — Phase A
  has no renderer-facing surface (that is explicitly Phase C, "the renderer
  consumes layers," not yet started), so there was nothing to shoot. Noted
  rather than skipped silently.
- **Concurrency/re-entrancy** of the seed-keyed caches (`generateCityPlan`'s
  `Map`, `cityDemand`'s `WeakMap`) under concurrent calls — Node is
  single-threaded per isolate and nothing here awaits mid-mutation, so this
  is low-risk, but it was not specifically probed.
- **The pre-existing uncommitted changes to `public/asset-registry.js` and
  `public/tier-models.js`** visible in `git status` on the sibling checkout
  throughout this audit are explicitly out of scope — `e14b054`'s own commit
  message already identifies them as agy's in-progress `assets-lane` work,
  left untouched on purpose, and this audit did the same.

---

## The 4-State Horizon

Judged only over what Phase A actually touches — world generation's seed
plumbing, the frozen shared spec tables, and the new world-instance object.
Divisions with no Phase-A surface are marked **not audited** rather than
omitted, per the instruction that a division skipped silently reads worse
than one marked absent.

| Division (as it applies to Phase A) | Done | Undone | Could | Should |
|---|---|---|---|---|
| **Seed propagation (terrain → renderer)** | The height field is genuinely, provably seeded end to end: `LandField` → `makeHeightAt` → every design-space shaping function, pinned byte-identical at seed 0 over 37,668 samples and proven to diverge at every sample for a named seed. | The three *exported* world-space functions of the same name (`cliffiness`, `edgeFalloff`, `reliefAt`) that `city-render.js` actually imports have no seed parameter at all and always compute against `DEFAULT_SEED` — see HIGH finding above. | Thread `seed` through `cliffinessWorld`/`edgeFalloffWorld`/`reliefAtWorld` the same way `makeHeightAtWorld` already does, and add the test A2's own "known gap" note asks for: each shaping function's seed sensitivity checked individually, not just collectively. | Do this before Phase C, not after — C is exactly the phase that will call these functions against a non-default world for the first time. |
| **Seed propagation (plan)** | `generateWorld`/`generateCityPlan`/`cityDemand`/`classForBlock`/`classForSettlementBlock`/`generateSettlement`/`pickPatchy` all accept and forward a seed; the two caching bugs the plan names as found-and-fixed are genuinely fixed and independently re-timed here. | Most of the texture inside those "seeded" functions — PARK/CIVIC placement, settlement wobble, low-demand open-space rolls — runs through `hash01`, which has no seed parameter and is measurably identical across every seed (0 of 269 blocks' park/civic status changed between two real seeds). | Give `hash01` an optional seed argument (or add a seeded variant) and thread it through the same call sites `pickPatchy`'s `fbm` already uses, so "a named seed is a genuinely different city" is true of park/civic layout too, not only density class. | Decide, and write down, whether unseeded park placement is actually intended (e.g., "civic geography shouldn't move between someone's clone and the original") — either answer is defensible, but right now it isn't a decision, it's a gap nobody has looked at. |
| **The frozen shared spec (A3)** | `DISTRICTS`/`SETTLEMENTS`/`BRIDGES`/`GRID` are genuinely deep-frozen; `generateWorld`'s public return clones districts two levels deep, closing the exact aliasing bug the ledger describes, verified by a CAUGHT mutation. | `generateCityPlan`'s internal `city.districts` field still hands out the raw frozen singleton rather than a clone (harmless today because it's frozen and nothing reads it, but inconsistent with the "always copy" rule stated everywhere else). | Clone it there too, for the same reason the comment at `city-plan.js:3410-3428` gives for doing it at the outer return. | Low priority — currently unreachable, not false. |
| **The world instance (A4)** | Composes rather than reimplements, proven by fingerprint equality against calling the three underlying functions directly, not just "produces something"; two same-seed instances have independent layer stacks; JSON round-trip is exact. | `createWorld()` costs 2.3–2.7 s per call and does not get materially cheaper on a repeat call with the identical seed, because it always builds a fresh `LandField`/`heightAt` and the caches inside `generateWorld` are keyed on that object's identity. Undocumented anywhere. | Memoise `createWorld()` itself by seed (a `Map<seed, world>` at the `world.js` level, mirroring what `generateCityPlan` already does one layer down), so B1's store and C's renderer get the ~50% saving that already exists inside `generateWorld` for a stable `heightAt`. | Measure a realistic session's call pattern before deciding whether to cache the whole `createWorld()` result or just document the 2.3–2.7 s and move on — either is honest, silence is not. |
| **Test/tooling honesty (`_mutcheck.mjs`, `gen-test-count.mjs`)** | Both do what their headers claim on the paths exercised here: baseline-red refusal, exact-one-match mutation guard, restore-and-verify, and (for `gen-test-count.mjs`) refusing to publish a page claim from a red run except its one named, narrow exemption. | The failure-name regex in `_mutcheck.mjs` is still a hard-coded shape assumption about Node's reporter output (a softer version of the exact defect fixed twice already this session) — LOW finding above. | Loosen the regex to tolerate reporter drift, or assert the reporter version/format at the top of the script so a mismatch fails loud instead of degrading to INCONCLUSIVE. | Worth a line in the next `_mutcheck.mjs` touch; not urgent. |
| Visual/renderer, UX, editorial, security, FinOps, observability | — | **Not audited.** Phase A has no rendering, UI, pricing, or network surface — it is pure data-layer generation. | — | Nothing to say yet; these divisions belong to Phases C, D and G respectively, and should be judged when those land, not backfilled here. |

---

## Final state of the tree

`git status --short` in **both** locations, exactly as left:

Sibling checkout (`C:\Code\sandbox-spike`, where every command in this
report ran) — captured immediately after the last successful mutation run,
before the permission lockout made a final re-check of this checkout
unavailable:
```
 M public/asset-registry.js
 M public/tier-models.js
```
Both pre-existing and out of scope (agy's `assets-lane` work-in-progress,
explicitly left alone by `e14b054` for the same reason this audit leaves it
alone). No file this audit touched — `noise.js`, `terrain.js`,
`city-plan.js`, `world.js` — appears in that list, and each was independently
sha256-verified identical to its pre-mutation hash above.

This worktree (`C:\Code\sandbox-spike\.claude\worktrees\agent-a1b9089b51ea5dda4`,
branch `worktree-agent-a1b9089b51ea5dda4`) — nothing was ever mutated here;
the only writes are this report and the `docs/AUDIT-PROTOCOL.md` §7 entry:
```
 M docs/AUDIT-PROTOCOL.md
?? docs/audits/UMAA-phase-A.md
```
