# Autonomous run 3 handover — CLI lane, 2026-09-11

Brief: `docs/briefs/CLI-2026-09-11-autonomous-3.md`, committed `fecbbc9`.
Written and updated as work progresses, per §14.

## Item 0 — done

Brief committed (`fecbbc9`). Read critically as instructed ("assume this
one has an error too"): found one. The brief says the culling-ratio gate
"was written for a world of per-piece meshes." Checked against git
history: `test/regressionGate.test.ts` was introduced 2026-09-07
(`d48455b`), by which point `city-render.js` already had 35 `InstancedMesh`
call sites with its own spatial chunking. `board.js`/`board-render.js`
didn't exist yet. Not load-bearing against the plan (spatial chunking is
still the right fix, and this makes it MORE clearly so — proven, existing
practice in this codebase, not a novel technique) — named per
`rule://escape-clause`, run proceeded.

## Item 1 — done, committed `e11f633`

Written analysis, no code touched:
`docs/specs/CULLING-RATIO-GATE-ANALYSIS-2026-09-11.md`. The property named:
a narrow-view camera must not make the GPU do the same work as a wide
establishing shot. Measured (not just reasoned) that the current 78.84%
reading reflects a REAL defect (street's own triangle count grew MORE in
absolute terms than skyline's did when the board went from un-instanced to
whole-board-instanced — exactly the signature an always-in-frustum group
produces) delivered through a partly artefactual mechanism (a shared,
camera-independent floor now sitting under both sides of the ratio).
Conclusion: fix the real problem (spatial chunking) now; do not invent a
replacement numeric threshold; worth waiting for the BLD lane's
off-loopback server to SOURCE a real number later, not worth waiting to do
the structural fix.

## Item 2 — done, committed `bff1cce`

Spatial chunking: every real board piece already carries its own
`boundaryId` (12 real settled boundaries) — ground-checked directly rather
than assumed, matching the brief's own suggestion exactly. `chunkIdFor()`
extends both `groupKeyFor()` (board pieces) and `buildInstancedPropGroup`'s
own key (props) as a pure refinement (can only split groups, never wrongly
merge). `computeBoundingSphere()` added explicitly per group (previously
never called in this file). Measured directly: 21,007 pieces → 50 groups
(was 16); props → 46 groups total across all four scatter functions (was
~16).

**Blind review (1st of 3 subagent slots) found real issues before
implementing, all fixed:**
- My own ground-check arithmetic was wrong (40 vs the correct 50, using my
  own stated formula) — an internal inconsistency, caught before any code
  was written.
- An existing 2b gate test's `<= 50` ceiling and "measured 16" comment
  would land at the exact edge with zero margin under this change —
  updated to `<= 120` with the real "measured 50" figure.
- My own `computeBoundingSphere()` justification overclaimed — three.js
  already computes it lazily via `Frustum.intersectsObject` (confirmed
  directly against the vendored build), so this isn't fixing a live,
  observable bug; reworded to state that honestly.
- Props-side fragmentation was an unmeasured risk — measured directly
  against the real board before deciding to include props in the fix
  (16/9/14/7 groups, modest, not the "100-200 per function" that could
  have resulted).

**Picking verified through the real path, not reasoned about:**
`test/boardPicking.test.ts`'s fixture now includes two buildings that
would have shared one group under 2b's own key alone but sit in different
real boundaries — the existing "resolves to the correct piece" test covers
them with no new logic needed, and passes both before and after (picking
never depended on grouping, confirmed rather than assumed).

**Watched red three times, for three distinct mechanisms:** all 5 new
tests against pre-chunking code; `groupKeyFor`'s own chunk component
dropped (caught by exactly the 2 board-piece tests); `buildInstancedPropGroup`'s
own chunk component dropped, a separate implementation (caught by exactly
the props test); `computeBoundingSphere()` removed (caught by exactly the
radius test). Each reverted and confirmed byte-identical after.

**Verification**: `npx tsc --noEmit` clean. `node test/run.mjs
test/boardRender.test.ts test/boardPicking.test.ts` — 45/45 green.

**Deferred, named rather than skipped silently**: the full node suite and
the render-based gate measurement (draw calls, culling ratio, triangles
per camera) were NOT run before this commit. The BLD lane's `wrangler dev`
was live throughout (confirmed via `Get-CimInstance`, PIDs recorded, none
killed), including a second instance bound off loopback
(`--ip 10.88.111.5...`) that landed mid-session — exactly the brief's own
§13 prediction. Both are resource-heavy and contention-sensitive by this
project's own prior experience (decision #4's documented flakiness under
load); deferred until the box is confirmed quiet rather than run and
hoped for the best.

Subagent budget used: 1 of 3.

## Next step, precisely

Re-check host contention. Once clear: run the full suite, then the same
three-view render replication used for the prior gate measurement
(`&board=1`), report three numbers (draw calls, culling ratio, triangles
per camera) honestly against today's baseline (283/502/289 draw calls,
78.84% culling) — no threshold tuned toward. Per item 3: if both gates
pass, say so loudly and stop; do not tick R3.5 or change the default
render (needs two screenshots, Mark's call).
