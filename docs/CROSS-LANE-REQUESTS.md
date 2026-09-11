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

**Update, 2026-09-10 (recorded so nobody re-investigates this from
scratch next run).** F1's gate cannot be satisfied from this branch, full
stop, and re-checking it again will not change that: the 16 real variants
and their gate test (`test/facadeVariants.test.ts`) live on `codex-lane`;
the one-line `variantSeed` wiring lives on `b1-land`
(`public/city-render.js:1934`). Neither branch has both halves. This is
not a "still waiting" state — it is a "cannot be closed by either lane
alone" state. Mark has been told directly. The only resolution is a
`b1-land` -> `codex-lane` merge, which he will authorise at a clean stop —
not something either lane may do unattended (see this project's own
"do not merge" rule). Re-measured today, same result as every prior run:

```
node test/run.mjs facadeVariants.test.ts
```

→ `facade materials reachable from real placements today: 4 (interwar-vc-day-,
postwar-vc-day-, heritage-vc-day-, contemporary-vc-day-)` — 14 pass, 0 fail,
1 honest `todo`. `grep -n "variantSeed" public/city-render.js` in this
worktree still finds nothing.

---

## 2. `public/city-render.js` — street lighting draws two inline primitives instead of the real `lamp-street` model

**Requested by:** BLD lane (`codex-lane`), 2026-09-10, props/scatter survey.
**Owner:** CLI lane (`public/city-render.js` is CLI-lane-owned per the
overnight brief's routing table, same as entry 1 above).

**Why.** `public/props.js` defines `"lamp-street"` — a complete, tested
seven-part model (pedestal, collar, lower/upper mast, curved arm,
luminaire head, visor; 248 LOD0 tris, real LOD1/LOD2 fallbacks), correctly
aliased for the manifest id `lampPost` at the foot of the file and
reachable through `propModel`/`propGeometry` in `public/prop-models.js`
(exercised by `test/propModels.test.ts`). `city-render.js`'s own street-
lighting block never calls it: every one of the world's lamp posts (2,407,
per `prop-manifest.js`'s own header comment, taken directly inside the
renderer) is built from two hand-inlined primitives —
`new THREE.CylinderGeometry(0.22, 0.3, 9, 5)` (post) and
`new THREE.BoxGeometry(1.6, 0.5, 0.9)` (head) — the exact bug
`prop-models.js`'s own header names as already fixed for `bin`/`bench`/
`busShelter` ("a bench was a BoxGeometry... so the library was merged and
the world drew none of it") but never closed for lamps. Full detail:
`docs/audits/PROPS-SCATTER-SURVEY-2026-09-10.md`, Finding 1.

**The real wrinkle, stated up front rather than glossed over.**
`props.js`'s `mergeGeometries` (what `lamp-street`'s `createGeometry`
returns through) merges position/normal/index only, with no per-part
colour or tag system. Today's inline version uses two materials — a dark
post and an **emissive warm-yellow head** that is what makes a lamp read
as lit at night. A direct swap to one `propGeometry("lampPost", ...)`
call merges post+arm+head+visor into one geometry with one implied
material, which would **lose the emissive glow** unless the model
definition is also extended to expose the head as a separate geometry
(the `{geo, tag}` idiom `public/buildings.js` already uses throughout) so
the caller can keep two materials. This is a real, small design call —
accept a uniform-material lamp, or split the geometry — not a risk-free
mechanical swap the way entry 1's diff was. Whoever picks this up should
decide, not assume either answer.

**Roughly, not prescriptively, what changes** (the exact shape depends on
the wrinkle above being resolved first): replace the `pg`/`hg` inline
`CylinderGeometry`/`BoxGeometry` construction (currently around
`city-render.js:4365,4367`) with `propGeometry("lampPost", THREE, { lod:
0 })`, and adjust the `InstancedMesh` construction (currently two meshes,
`inst`/`hi`, one per primitive) to match whatever geometry/material split
is decided above.

**Verification once landed.** `stats.lamps` (already set at
`city-render.js:4410`) should be unchanged in count; the visual check is
whether the new lamp reads as more detailed at street level without
losing the lit-head cue at night — a render/screenshot check, memory-
gated the same way K7.1's re-shoot is, not verifiable from this lane's
own worktree today.

**Status:** OPEN, filed this run. Not urgent in the way entry 1 is (no
blocked gate depends on it), but real: 2,407 identical, undetailed lamp
posts is a larger count than any single building typology fixed this
week.
