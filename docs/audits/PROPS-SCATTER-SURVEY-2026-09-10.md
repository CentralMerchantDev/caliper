# Props/scatter/layout/materials survey — 2026-09-10, `codex-lane`

A fresh pass looking for the "computed but never wired" defect class (a
value rolled from the seed, reported, consulted by nothing) and its
sibling (a subsystem with no seed-derived variation at all) **outside**
`docs/audits/K6-BUILDINGS.md`'s buildings checklist — the only remaining
code-only route named by `docs/audits/OVERNIGHT-BLD-2026-09-10.md`'s own
handover. Per the brief for this pass: findings only, fixed only where
(a) genuinely wired-but-ignored, (b) decision-free, and (c) inside scope a
document already names. Nothing found this pass clears all three at once
— see "Why nothing was fixed" at the end.

---

## What was surveyed

- `public/prop-models.js`, `public/prop-manifest.js`, `public/props.js` —
  read in full (the manifest/library/join for street furniture, lighting,
  vegetation, vehicles, people).
- `public/city-render.js` — read (not edited; CLI-lane-owned, confirmed
  again this pass by grep: every prior handover back to RUN2 names it so)
  for every place it actually places and draws a prop, to compare against
  what the manifest/library declare is available.
- `public/layout.js` — grepped for the same seed-then-discard shape
  (`const x = rnd(...)` never read again). None found.
- `public/facade-textures.js` — grepped the same way. None found beyond
  the already-known, already-filed F1 gap (`docs/CROSS-LANE-REQUESTS.md`
  §1), which this pass does not re-open.

---

## Finding 1 — street lighting: a complete, tested, unused model

**Where.** `public/city-render.js`, the "street lighting along the
downtown boulevards" block (currently around line 4359–4411). It builds
every one of the world's lamp posts from two hand-inlined primitives —
`new THREE.CylinderGeometry(0.22, 0.3, 9, 5)` for the post, `new
THREE.BoxGeometry(1.6, 0.5, 0.9)` for the head — the exact literal
dimensions `public/prop-manifest.js`'s own `PROPS.lampPost` entry already
records as *provenance for a shape that's supposed to be superseded*.

Meanwhile `public/props.js` defines `"lamp-street"` (`manifestKey:
"lampPost"`, correctly aliased at the foot of the file —
`MODELS["lampPost"] = MODELS["lamp-street"]` — and reachable through
`propModel`/`propGeometry` in `prop-models.js`, which `test/propModels.test.ts`
exercises): a real seven-part model (pedestal, collar, lower mast, upper
mast, a curved arm, a luminaire head, a visor) at 248 LOD0 triangles, with
real LOD1 (32 tris) and LOD2 (12 tris) fallbacks already defined. This is
not a stub — it is a complete, working, already-tested capability.
`propGeometry("lampPost", ...)` is never called anywhere in
`city-render.js` (checked by grepping every `propGeometry(` call site in
that file: only `"bin"`, `"bench"`, and `"busShelter"` are called — the
three props `prop-models.js`'s own header comment names as the ones
already fixed for exactly this bug: *"a bench was a BoxGeometry... so the
library was merged and the world drew none of it"*). Lamp posts are the
one street-furniture category that bug was never closed for.

**What it costs in real terms.** `prop-manifest.js`'s own header comment
(written when the manifest was built, describing a measurement taken
directly inside the renderer) states **2,407 lamp posts** in the real
world. `city-render.js:4410` sets `stats.lamps = posts.length` from the
exact same placement array this block draws from, so that figure is the
live count as of whenever it was written, not an estimate. A fresh
re-measurement would need the full render pipeline (the same
`SwiftShader`/browser-class path K7.1's re-shoot needs) — memory-gated
this session the same way K7.1 is (1.41 GB free at survey start, the same
reading BUILD-LOOP's own STEP 0 orientation took), so it was not
re-derived and this document says so rather than presenting the older
number as freshly measured. 2,407 identical, undetailed lamp posts is a
larger real-world count than any single building typology this lane has
fixed this week (`bld-highstreet-terrace` was 318).

**Wired-but-ignored, or missing capability?** Wired-but-ignored. The
capability exists, is complete, and is reachable by name — it is not a
design decision waiting to be made, it is a call that was never added
when `bin`/`bench`/`busShelter` were.

**One real wrinkle, named rather than hidden.** `props.js`'s
`mergeGeometries` (used by `lamp-street`'s `createGeometry`) merges
position/normal/index only — it does not carry per-part colour or a tag
system the way `buildings.js`'s `{geo, tag}` parts array does. Today's
inline version renders the post and head with two different materials
(`postMat`, a dark grey, and `headMat`, an emissive warm-yellow glow that
is what makes a lamp read as lit at night). A direct swap to
`propGeometry("lampPost", ...)` would merge post, arm, head and visor into
one geometry with one implied material, **losing the emissive glow**
unless whoever applies this either (a) accepts a single-material lamp, or
(b) extends `lamp-street`'s definition to expose the luminaire head as a
separate geometry (the same `{geo, tag}` idiom `buildings.js` already
uses) so the caller can keep two materials. This is why this finding is
filed as a cross-lane request with the wrinkle stated, not as a drop-in
diff presented as risk-free — see `docs/CROSS-LANE-REQUESTS.md` §2.

---

## Finding 2 — trees: two parallel systems, the richer one never reached

**Where.** `public/city-render.js`'s tree-planting block (currently
around line 2201–2460, the largest single prop-scatter system in the
file: street trees, wide-landscape woods, barrier-island palms, per-plot
garden trees, park canopies, and in-city parks, all feeding one shared
instancing pass). Every tree in the world is one of exactly **two**
hand-built shapes — a sphere-canopy "broad" tree and a cone "conif" tree
(`kind ? conifer-cone : broad-sphere`, `city-render.js`'s own comment
calls this "Two species") — built from inline `SphereGeometry`/
`ConeGeometry`/`CylinderGeometry` at three LOD levels, with real per-tree
scale variation (`s = 1.5 + rnd(...) * 1.9` etc., genuinely wired) and a
real per-tree colour tint (`offsetHSL` on a per-instance random), but no
shape/species diversity beyond the binary split, and no age class at all.

`prop-models.js`'s `VARIED.tree` (read in Finding 1's context above)
defines **12 real variants** — 4 species (broadleaf, conifer, palm,
cypress) × 3 age classes (sapling, mature, ancient) — reachable through
`propModel("tree", seed)` / `propGeometry("tree", THREE, {seed})`, the
same mechanism this session already confirmed works for `bin`/`bench`/
`busShelter`. `city-render.js` never calls `propModel(` or imports
anything from `prop-models.js` for trees at all (grepped for both;
neither appears) — this is not a partially-wired flag, it is a
completely separate, independently-built tree system that predates or
was never joined to the library one.

**What it costs in real terms.** The block's own loop bounds, read
directly from the source, are candidate counts (upper bounds before
height/occupancy/density filtering, not a final placed total — stated
honestly as such): 26,000 in the wide-landscape woods pass, 3,200 on the
barrier island, 2,400 in in-city parks, plus street trees (one candidate
per 24 m of every road edge) and garden trees (up to 42% of every
low-rise villa/townhouse/terrace plot — of which `K6-BUILDINGS.md`
independently measured 14,439, the sum of villa+terrace+townhouse
placements). Even accounting for filtering, this is very likely the
single largest prop count in the world by a wide margin — larger than
lamp posts, larger than any building typology. `K6-BUILDINGS.md`'s own
Downtown-close/Downtown-skyline verdict already names **"bright repeated
trees"** as an existing, unsolved visual defect (top of that document);
this survey traces that complaint to an actual, specific cause for the
first time — two shapes standing in for what the library already builds
as twelve.

**Wired-but-ignored, or missing capability?** Genuinely mixed, and worth
being precise about rather than picking whichever answer is easier to
act on:
- The underlying *library capability* (12 tree variants) is real,
  complete, and already reachable by name — the same as the lamp post.
- But *threading it through* is not a one-line call swap the way
  bin/bench/busShelter/lampPost are. The tree system's instancing is
  built around exactly two shared `InstancedMesh` pools per LOD (one for
  "broad," one for "conif"), sized once from a pre-counted `nb`/`nc`. Real
  variety (12 shapes instead of 2) means either twelve `InstancedMesh`
  pools per chunk per LOD instead of two — a real draw-call and memory
  cost multiplier across tens of thousands of instances, on the same
  world this session's own K6-BUILDINGS.md frame-time table shows is
  already **not** cleanly under its 16.7 ms budget at two of three
  reference cameras — or a different instancing strategy entirely. Which
  tradeoff is acceptable is a real design decision, not a wiring bug.

This is why Finding 2 is filed as a decision for Mark
(`docs/DECISIONS-FOR-MARK.md` §3) rather than attempted as a fix, even
though part of it (the capability existing, unused) is the same shape as
Finding 1.

---

## What was checked and found clean (negative results, stated plainly)

- `public/props.js`'s `bin`/`bench`/`busShelter` models: correctly wired
  through `propGeometry` in `city-render.js` (lines 3013–3015, 3868–3869).
  These are each still a single fixed model with no seed-derived variant
  — but that is `prop-models.js`'s own named, reasoned scoping decision
  (its header comment: *"Adding an entry is a decision that one fixed
  model is not good enough for how many of them the world places at
  once"* — tree/car/person got that decision, bin/bench/busShelter did
  not). Not a bug to fix; folded into Finding 2's framing rather than
  reported as a third separate item, since it is the identical
  missing-capability shape at a smaller scale (11,135 combined
  bin+bench+busShelter placements, per the same historical count cited in
  Finding 1, against 2 species of tree covering a much larger count).
- `public/city-render.js`'s container yard: uses its own inline box
  geometry (not `props.js`'s library, which has no `container` entry at
  all — this was never meant to route through the prop library, a
  different, simpler category), **but does have real per-instance colour
  variation** (`cc[Math.floor(rnd("cc"+x+z+k) * cc.length) % cc.length]`,
  read directly) — genuinely wired, not this defect. Not touched.
- Rail ties: `PROPS.railTie` and `MODELS["rail-tie"]` exist in the
  manifest/library, but the actual rendered railway (`city-render.js`,
  the rail block ending at `stats.railTies = ties.length`) draws the
  track as a continuous procedural strip mesh, not discrete tie props —
  an architectural choice (a strip is cheaper and looks right for a
  linear feature) that was not investigated further this pass; named
  rather than silently assumed fine, but not treated as this defect
  either, since there is no computed-and-discarded value to point at.
- `public/layout.js`: no `rnd(...)`-then-discarded pattern found at all
  (grepped for the shape). Nothing to report.
- `public/facade-textures.js`: no additional instance of the pattern
  beyond the already-filed, already-blocked F1 gap. Nothing new.

---

## Why nothing was fixed this pass

Both real findings require a change inside `public/city-render.js`, which
is CLI-lane-owned — confirmed again this pass, not merely assumed, the
same file every prior handover back to RUN2 has named as out of this
lane's scope to edit directly (`docs/CROSS-LANE-REQUESTS.md`'s existing
entry, the F1 gap, is the identical shape of constraint). Guard (c) — "
inside scope a document already names" — is not met by either finding,
regardless of how decision-free (Finding 1) or how real (Finding 2) the
underlying gap is. Per this run's own instruction not to invent scope:
both are recorded and routed to the correct channel (cross-lane request;
decision queue) rather than attempted.
