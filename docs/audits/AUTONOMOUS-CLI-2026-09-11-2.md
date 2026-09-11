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

### 2c — next

Instance the props: `scatterTrees`/`scatterStreetLamps`/
`scatterStreetFurniture`/`scatterBusShelters` (lines ~156, ~230+ in the
current file) have the same per-item-mesh defect. Same fix shape, same
BUILD-LOOP discipline. Last subagent budget slot (3 of 3) reserved for
this step's blind review.

### Item 2's own gate — not yet run

`test/regressionGate.test.ts` with the board drawn un-gated (`&board=1`),
compared against today's already-recorded baseline (4,584/6,129/870 draw
calls, 51.25% culling, both gates failing — `COMPLETION-PLAN.md`'s R3.5).
Will run after 2c, per the brief's own framing (the whole board, all prop
types, is what a real visitor's render actually draws).

## What is unverified, stated plainly

- The full node suite has not completed in this run (see above) — two
  honest partial runs, not one full clean run.
- Item 2's own performance gate (draw calls, culling ratio) has not been
  measured yet — 2a/2b alone should help a great deal given the 21,007→16
  group collapse, but the brief's own instruction is to measure the WHOLE
  of item 2 (2a+2b+2c) before reporting, not partial credit from 2a/2b
  alone. No number is claimed here.
- `docs/DECISIONS-FOR-MARK.md`'s own #2 characterization of `isolate.test.ts`
  is now stale (item 1's finding) — not yet corrected in that document
  itself, only in the new B2.8 recheck doc. Worth doing, not done.

## Next step, precisely

2c (instance the props), same BUILD-LOOP discipline, then item 2's
regressionGate measurement, then §11's stopping point (commit or honestly
report 2c, then stop — do not start §12's fallback items).
