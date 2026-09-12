# Autonomous run 2 handover — CLI lane, 2026-09-11

Brief: `docs/briefs/CLI-2026-09-11-autonomous-2.md`, committed `c3396ef`.
Written and updated as work progresses, per §14, so a crash costs one step.

## Item 0 — done

`process_get_rule('lane-brief')` returned the current rule; server confirmed
current. Brief committed (`c3396ef`).

## Item 1 — done, committed `4e260e0`

Full per-test verdict for all 37 old-world tests B2.8 deferred, produced by
RUNNING every file, not inferring from the import chain alone (the brief's
own stated failure mode). Findings, in full:
`docs/specs/B2.8-DEFERRAL-RECHECK-2026-09-11.md`. Summary:

- **36 of 37 still blocked** — every file imports `city-plan.js`/
  `layout.js`/`instance-groups.js`/`road-network.js`/`world-registry.js`
  (never `board-generator.js`), and each one's REAL current failure was
  captured directly: a known pre-existing incident (71.8% of plots in
  water), a real `TypeError`, a 0.711 m socket-mating precision bug, three
  stale-pin drifts (52→48 components, 17,586→45,522 plots, 1,380→419 road
  entries), several terrain/placement disagreements.
- **1 of 37 (`isolate.test.ts`) is NOT blocked by B2.8's own reasoning** —
  it already runs against real, wired `board-generator.js` data (from B3's
  picking work) and fails for an unrelated, small, test-methodology bug.
  This was at risk of being folded into "still blocked" unexamined —
  exactly the failure mode the brief's own gate warned against.
- **A correction to the brief's own premise, named per `rule://escape-
  clause`**: the brief's stated reason to re-check (`ROAD_WIDTH`'s
  retirement) does not bear on any of these 37 tests — `ca413a0`'s own
  commit message names the four deciding imports as blocked on kit/
  typology wiring, a different "B4" than this run's board-render
  instancing. Not load-bearing for the deliverable (each verdict stands on
  its own, confirmed by running the file), so the run continued.
- A separate pattern surfaced beyond what item 1 asked for: `planSeed`/
  `layout`/`instanceGroups` tests all point at the SAME fact — the old
  pipeline's own plot/placement output has drifted sharply from its own
  historical pins, for reasons this read-only item did not trace.

Nothing built or re-pinned this item, per the brief's explicit instruction.

## Item 2 — the main body — IN PROGRESS

### Ground-check, before touching anything

`public/board-render.js:57-58` confirmed exactly as the brief described:
a new `MeshStandardMaterial` and a new `Mesh` per piece. The file's own
line-95 comment naming "world-render-3d.js's `partitionForInstancing`" was
WRONG — that function actually lives in `public/instance-groups.js`,
consumed by `public/city-render.js` — corrected in the file's own header
rather than carried forward silently.

**The picking-risk correction (the most important finding of this item):**
the brief names the risk as "a raycast returns an instanceId, not a child
mesh object." Ground-checked directly against `world-render-3d.js`'s real
pick handler (~line 6952-6959): it does NOT read `instanceId` or mesh
identity for board pieces at all. It raycasts, takes the intersection's
world-space point, and calls `pieceAtPoint(board, x, z)` — `board-load.js`'s
own independent grid-index lookup. `mesh.userData.pieceId` is set but never
read anywhere else (confirmed by a repo-wide grep). So the real risk is
whether a raycast against a *shared* InstancedMesh still lands at the
*correct* piece's own world position — a different, and in one sense
smaller, risk than the brief assumed, though still a real one requiring a
real test (built and watched red before the fix — see below).

### 2a + 2b — done, committed together (`266957b`)

Committed together rather than as two separate commits: 2b's grouping
rewrite built directly on 2a's material cache inside the same function, in
one continuous working sequence — splitting them after landing would mean
reconstructing fictional intermediate history. Named rather than silently
presented as two commits, since the brief's own §11 speaks of 2a/2b/2c as
individually trackable.

- **2a**: `meshForPiece()` takes an optional `materialCache`; `buildBoardScene()`
  builds one per call so every piece sharing a colour shares one material
  instance.
- **2b**: `buildBoardScene()` groups by `(pieceType, foot.w, foot.d,
  levels-if-building)` and builds one `InstancedMesh` per group. Measured
  directly against the committed board: **21,007 pieces collapse into 16
  groups** (9 road foot dims, 5 building foot/levels combos, 0 bridge
  pieces exist in the committed board today).
- **`test/boardPicking.test.ts`** (new): exercises the REAL production pick
  path (real `buildBoardScene()` output, a real `THREE.Raycaster`, the real
  `pieceAtPoint()`) against a fixture that deliberately shares more than
  one piece per InstancedMesh group, and confirms every piece resolves
  correctly — not merely "a" piece.
- **Watched red twice**, properly: all 6 new/rewritten tests against pre-2b
  code (exactly those 6 failed, nothing else); then a real code mutation
  (the per-instance loop reading the group's sample piece instead of the
  actual piece) turned exactly the position, bridge-height, and picking
  tests red, reverted, confirmed byte-identical.
- **One mutation shape tried and rejected, named in the test's own
  comment**: post-hoc swapping which instance slot holds which piece's
  transform is invisible to this test, because two same-group instances
  share identical geometry — the resulting scene is pixel-identical. This
  independently confirms the picking ground-check above rather than
  exposing a test gap.
- An existing B3 gate's own contract necessarily changed ("exactly one
  mesh per piece" is the literal regression 2b fixes) — replaced with the
  equivalent invariant for the new architecture (every piece drawn exactly
  once, summed across `InstancedMesh.count`, in a small number of groups).
- **Verification**: `npx tsc --noEmit` clean. `node test/run.mjs
  test/boardRender.test.ts test/boardPicking.test.ts` — 36/36 green,
  repeated after every edit. Full suite: two consecutive attempts were
  stopped by an external process governor before completing (954 and 698
  lines respectively — not killed by this run). **Both partial runs reached
  and passed every board-related test**; the only two failures seen in
  either are pre-existing and already self-documented as such in their own
  titles (B2.5's CPU-ceiling measurement, decision #7's named-RED gate) —
  neither touches `board-render.js` or anything it depends on. Read as
  sufficient to proceed, not as a substitute for a full green run Mark
  should still expect to see eventually. Named explicitly, not silently
  assumed.
- Gate recorded: `process_record_gate`, item `B4-2a-2b`.

Subagent budget used: 2 of 3 (plan review for 2a, plan review for 2b — the
2b review found a real, then-fixed gap: my own 2a test would have broken
silently under 2b's grouping, and was not mentioned in my original plan).

### 2c — done, committed `fc56d36` (plus a ledger fix, `e0e4cf6`)

Instanced the four prop scatter functions (`scatterTrees`,
`scatterStreetLamps`, `scatterStreetFurniture`, `scatterBusShelters`) via
one shared `buildInstancedPropGroup()` helper. `"tree"` is confirmed a
VARIED family (12 discrete species×age variants, no further randomness —
read `tree()`'s own body directly); the other three are non-VARIED plain
aliases. No picking risk for props (confirmed: never in `board.js`'s own
spatial index, never read by the pick handler).

**The blind review (3rd and last subagent slot) found two real bugs before
any of this was implemented, neither named in the original plan:**
1. All four functions' own cap check (`maxTrees` etc.) and
   `scatterStreetFurniture`'s bench/bin alternation read
   `group.children.length` — which stays zero for the whole loop once
   items are instanced at the end rather than added inside the loop.
   Implemented as originally planned, every function would have become
   UNBOUNDED and street furniture would place nothing but benches, ever.
   Fixed: each function reads its own local `items.length` instead.
2. Two `console.log` diagnostics (`world-render-3d.js:1888`,
   `city.html:230`) read `.children.length` on these exact groups to
   report placed-item counts — now the small InstancedMesh-group count.
   Fixed to read a new `group.userData.itemCount`.

**Watched red three times, for three distinct real bug shapes:**
- All 20 new/rewritten tests, against pre-2c code — exactly those 20 red.
- The review's own cap/alternation bug, reproduced — caught by exactly
  the tests naming it.
- The shared helper's per-instance position, mutated (2b's own proven
  mutation shape) — caught by **nothing** on the first attempt, because
  every existing position test used a single-item fixture (the group's
  first item IS the only item, so the mutation is invisible). A new test
  (two lamps sharing one InstancedMesh group — `lampPost` is non-VARIED,
  so any two lamps share a group) was added, watched red against this
  exact mutation, confirmed it is the only test that catches it, reverted,
  confirmed green. This is the mutation-proof step doing exactly its job —
  catching a hollow suite before it shipped, not after.

**Verification**: `npx tsc --noEmit` clean. `node test/run.mjs
test/boardRender.test.ts test/boardPicking.test.ts` — 39/39 green. Full
suite completed this time (not killed): 1230 tests, 1167 pass, **47** fail
— one more than `R3-RED-RECONCILIATION.md`'s documented 46. Checked
directly, not waved off: the extra failure is `test/cullingRatio.test.ts`'s
own test, which that document never names (grepped, zero hits) despite it
being independently confirmed already-failing THIS SESSION, before any
board-render.js work, by the R3.5 remeasurement earlier tonight (51.25%
culling). A real, pre-existing gap in that document's own count, not a
regression from this work. Every board/prop/picking test in the full run
passed; the other 46 failures all match the R3 catalogue or Item 1's own
B2.8 findings.

Gate recorded: `process_record_gate`, item `B4-2c`. (One process mistake,
corrected and named rather than hidden: the gate was recorded before the
commit existed, leaving `"commit":"pending"` in the ledger where every
other entry carries a real hash — fixed in a follow-up commit, `e0e4cf6`.)

Subagent budget used: 3 of 3 (2a, 2b, 2c plan reviews). All three found
real, load-bearing issues before implementation.

### Item 2's own gate — measured, `6a88d7e`

`test/regressionGate.test.ts`'s exact method replicated with `&board=1`
added, run three times on a confirmed-quiet box (16% CPU, zero
render/test/mutation contention), against today's baseline
(4,584/6,129/870 draw calls, 51.25% culling, both failing):

| | Street level | Downtown skyline | The harbour |
|---|---|---|---|
| draw calls | **283** | **502** | **289** |
| triangles | 377,088 | 478,299 | 605,241 |

Zero spread across three runs, `window.__boardPieceCount` confirmed 21,007
every time.

**DRAW-CALL GATE NOW PASSES on all three views, with a large margin**
(283/502/289 against <=900). Real and dramatic — matches the measured
21,007→16 InstancedMesh-group collapse.

**CULLING RATIO GATE GOT WORSE, NOT BETTER: 78.84% (was 51.25%), against
the same <40% ceiling.** Reported plainly, not folded into the draw-call
win. Working hypothesis, named as a hypothesis and not confirmed by
tracing Three.js's own source this session: `InstancedMesh` frustum-culls
as ONE object against its own overall bounding volume — a `pieceType`
group scattered across the whole board is rarely culled at all once any
part of it is in view, so every instance renders regardless of whether
it's actually in frame. Consistent with the data: street level's own
triangle count nearly TRIPLED (141,764 → 377,088) even as its draw calls
collapsed. A likely fix (spatial chunking in addition to today's
pieceType/foot/levels grouping — the same idea B3's own prior art already
used for buildings) is named but NOT attempted — real, materially bigger,
unplanned work, Mark's to prioritise, not this run's to start unasked.

**R3.5 does NOT tick.** One real gate passes with a large margin; the
other regressed. Full write-up: `docs/specs/COMPLETION-PLAN.md`'s own
R3.5 section, second re-measurement entry.

## What is unverified, stated plainly

- The culling-ratio regression's root cause (InstancedMesh's own
  whole-object frustum culling) is a working hypothesis consistent with
  the measured data, not confirmed by reading Three.js's own culling
  implementation.
- Whether spatial-chunked instancing (the named likely fix) would
  actually restore the culling ratio without reintroducing a large
  draw-call count was not tested — untried, not merely unverified.
- `docs/DECISIONS-FOR-MARK.md`'s own #2 characterization of
  `isolate.test.ts` is now stale (item 1's finding) — not yet corrected in
  that document itself, only in the new B2.8 recheck doc.
- `R3-RED-RECONCILIATION.md`'s own 46-failure count has a real, now-named
  gap (`cullingRatio.test.ts` never appears in it) — not corrected in that
  document itself this run, only noted here and in the B4-2c gate record.

## Stopping point reached

Per §11: item 2 (2a, 2b, and 2c) is committed. This is the declared
stopping point. No §12 fallback item (C2's allowlist, C1's remaining
mutations, C3) was started.
