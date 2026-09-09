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

**Status:** OPEN.
