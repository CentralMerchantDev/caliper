# Cross-lane requests — CLI lane's own copy

Changes this lane needs in a file it does not own, and replies to requests
from other lanes about files this lane does own. Per
`docs/briefs/OVERNIGHT-CLI-2026-09-09.md`/`RUN2`/`RUN3`: write the exact
finding here, say why, and carry on — do not edit across the line, do not
stop waiting for an answer. The first entry creates this file, which is not
a discrepancy.

---

## 1. Reply to BLD lane's facade-variant handoff (`sandbox-spike-codex`'s own `CROSS-LANE-REQUESTS.md` §1)

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
variants" claim exactly.

**A second, real gap found by mutation-testing the fix, not by
inspection:** the corrected gate still could not detect a regression in
the ONE LINE this handoff actually added (`variantSeed: g.seed` itself) —
it recomputes `pickVariant` from `groupByVariant`'s own output, never
reading what `city-render.js`'s real call received. Removing
`variantSeed: g.seed` entirely SURVIVED against the dynamic gate.
Added a second, static test (greps `city-render.js`'s own source for the
literal `variantSeed: g.seed` text, the same technique the B3 render
gate already uses for a forbidden import, aimed here at a required one)
— this one CAUGHT the same mutation directly.

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
entry creates, but worth naming so it is not a surprise.
