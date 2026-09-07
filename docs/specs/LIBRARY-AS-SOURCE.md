# The model library becomes the world's building stock

**Mark's decision, 2026-09-06.** This supersedes PHASE V3 in
`docs/VISUAL-BUILD-PLAN.md` as written. V3 assumed enriching the twelve
procedural typologies in `buildings.js`. It is now: **wire the library in, then
enrich the library.**

---

## THE FINDING THAT PROMPTED IT

Mark asked why there are only four facades when he built a library of thousands
of models across quality tiers and design styles. The answer, measured:

**The library is real.** `public/asset-registry.js` holds **2,400 entries, ten
categories at exactly 240 each** — `bld-`, `civic-`, `veh-`, `veg-`, `road-`,
`mar-`, `fur-`, `brg-`, `bnd-`, `av-`. Six quality tiers. Named by style:
"Highend: Art Deco Skyscraper", "Alpine Chalet", "Biophilic Townhouse". Geometry
lives in `public/tier-models.js`, one function per model, LOD0/1/2 each.

**Every entry already declares its own footprint:**

```js
'bld-highend-art-deco-skyscraper': {
  tier: 'highend', category: 'buildings',
  footprint: { w: 36.75, d: 36.75, h: 136.5 },
}
```

That is precisely the "a model declares what it needs" model of
`PLACEMENT-CONTRACT.md`, already built, before the contract was written.

**But the world does not use it.** `city-render.js:1542` calls
`building(g.typology, g.seed, g.options)` — `buildings.js`, twelve procedural
typologies with four character variants. **Those four characters are the "four
facades."** They are a different axis entirely from the library's tiers and
styles.

**And the library is unreachable.** Its only route into the world is a player
`replace` override. `city-render.js:1611`, in its own words:

> The registry starts empty every build — nothing generates and registers a real
> model yet (I5), so every "replace" is refused today, correctly and safely, not
> silently.

So **nothing in the 2,400-model library can currently appear in the world at
all.** A known gap, tracked as I5. It refuses honestly rather than substituting a
box, which is right — but it was never surfaced, and the world has been built
from twelve typologies while the library sat unread.

**The models are massing, not finished buildings.** The Art Deco Skyscraper:

```js
b1 = BoxGeometry(33.075, 40.95, 33.075)            // base
b2 = BoxGeometry(27.5625, 61.425, 27.5625)         // setback shaft
b3 = CylinderGeometry(9.1875, 12.8625, 34.125, 8)  // crown
tris: 56
```

That is a correct Art Deco massing — base, setback, crown, in convincing
proportion. Right shape language, wrong level of finish. 56 triangles is roughly
where the props sat before V2 lifted them.

---

## WHY THIS IS THE RIGHT CALL

Mark's visual verdict on V2 was *"a consistent repetition, like the world's most
boring subdivision."* The arithmetic behind that: **four facade atlases across
19,725 buildings**, plus `bldTownhouse` hardcoded to 16 × 24 m so all 5,342
townhouses are identically sized.

Tinting instances treats the symptom. **240 building models plus 240 civic
models, across six tiers and many named styles, is a different order of variety
than twelve typologies times four characters** — and it is work already done.

It also converges with the placement contract rather than fighting it. Library
entries already declare footprints. Snap those to whole cells and model
selection becomes *"which models fit the space available here"* — exactly Mark's
rule that a plot is space, not a slot.

---

## THE WORK, SEQUENCED TO AVOID A LANE COLLISION

The CLI lane is live in `layout.js` and `city-plan.js` for the rebalance.
**Steps 1–3 are entirely inside agy's own files and can start now. Step 4 needs
`layout.js` and waits for the rebalance to land.**

### Step 1 — MAKE THE LIBRARY REACHABLE (agy, `city-render.js`)

Populate the registry at build time from `tier-models.js` instead of leaving it
empty. This alone closes I5 and makes every `replace` override work — meaning a
player, or the AI change pipeline, can place a library building in the world for
the first time.

**This is the highest-value step in the document and the smallest.** Do it
first, on its own, and commit it on its own.

Verify by driving it: issue a real `replace` naming a library model id and see
the building appear. A registry that has never resolved a real id is not known
to work.

### Step 2 — CELL-ALIGN THE LIBRARY FOOTPRINTS (agy, `tier-models.js`)

`{ w: 36.75, d: 36.75 }` is 4.59 cells. Under `PLACEMENT-CONTRACT.md` Part 1 a
footprint is whole cells, so the library needs snapping — which changes model
dimensions, and is therefore a real change to geometry, not a metadata edit.

**Snap outward, never inward.** A model shrunk to fit loses its proportions; a
model grown to the next whole cell keeps them and simply needs more room. Record
before/after dimensions for every model changed.

Add `clear` — the free space required around the foot — while here. It does not
exist yet for any building. `prop-manifest.js` carries the concept for small
objects; follow that precedent. **Propose the values, do not decide them.**

### Step 3 — ENRICH THE LIBRARY (agy, `tier-models.js`)

The `bld-` and `civic-` entries, 480 models, from ~56 triangles to the near-band
budget of 1,500–3,000. Same treatment V2 gave the props, and V2 proved agy can
do it: 1,506 lines, measured, committed, visibly different on screen.

Priority by what is seen: the tiers and styles that would populate a downtown
first, ordinary housing next, the rare and exotic last.

**Budgets still bind.** 12M drawn, 200,000 distinct, 60 fps at 1440p. 480 models
at 3,000 triangles is 1.44M distinct — over the 200,000 ceiling, so **the
distinct-geometry budget will need a written, justified raise**, or the
enrichment happens only at LOD0 with LOD1/2 held cheap. Decide it explicitly and
say which; do not raise a budget quietly.

### Step 4 — WORLD GENERATION DRAWS FROM THE LIBRARY (CLI lane, `layout.js`)

**Blocked until the rebalance lands. Do not start it.**

Today `layout.js` maps a plot to one of twelve typologies. It becomes: given the
free space at this location, which library models fit — `foot + clear` inside
the available cells — and which of those suits the district being seeded.

That is the placement contract's own rule applied to world generation, and it is
where building types legitimately live: a seeding decision, never a property of
the ground.

---

## WHAT HAPPENS TO `buildings.js`

**Nothing is deleted.** The twelve procedural typologies keep working and keep
generating the world until step 4 lands, and probably afterwards too —
procedural generation gives per-instance variation that a fixed model cannot,
and the two can coexist: library models for character and landmarks, procedural
for the ordinary fabric that fills a street.

That is a decision for after step 4, made by looking at both on screen. It is
not being made here.
