# Cross-lane requests

Changes this lane needs in a file it does not own. Per
`docs/briefs/OVERNIGHT-BLD-2026-09-09.md` §7: write the exact diff here, say
why, and carry on — do not edit across the line, do not stop waiting for an
answer. The first entry creates this file, which is not a discrepancy.

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
