# CALIPER — ASSET LIBRARY LANE, BRIEF 8

Brief 7 landed well. The three that matter moved: the pawn became a figure with
separated limbs and a stride, the lollipop became a canopy of overlapping clumps,
the stacked boxes gained a raked screen and inset wheels. LOD0 counts were
reported before and after for every model touched, LOD1 and LOD2 were left alone,
and the second audit named different, smaller faults than the first. That is the
loop working.

This run is longer. Four blocks, in order.

## BLOCK A — FINISH YOUR OWN LIST

Brief 7's second audit named these and they are still open. Same rule as before:
the identifying feature first, detail on LOD0 only, declared counts enforced.

**People** — `person-tall` is the adult scaled; give it a longer stride and
narrower shoulders rather than a uniform multiplier. Hands are stubs; a mitten
is enough at this distance, but it should not be a sphere.

**Vehicles** — `vehicle-van` rear cargo doors as a seam and handle. `vehicle-bus`
window pillars with recessed glazing. `vehicle-truck` side mirrors — small,
cheap, and they are the thing that says "truck" in a silhouette.

**Trees** — `tree-conifer` needle skirts rather than smooth cones.
`tree-cypress` a jagged rather than a clean profile. Build `bush-flowering`.

**Roof** — build `water-tower-roof` and `elevator-overrun`. Both are silhouette
items on 18,758 roofs and both are currently gaps.

**Ground** — `manhole` keyhole notch. Deepen the grating recess.

**Aviation** — `aircraft-light-single` landing gear struts.
`aircraft-regional-jet` winglets. `blast-fence` actual perforations.

**Maritime** — `tug` tyre fenders (the identifying feature of a tug).
`quay-wall` bollard insets. Build `dry-dock`.

## BLOCK B — THE NINE REMAINING PLANNED GAPS

`asset-registry.js` reports 101 built and 9 planned. Close them, or move any you
judge not worth building to `status: "skipped"` with the reason written in the
`note` field. A gap that is never going to be built should say so rather than sit
on the list forever making the number look worse than it is.

## BLOCK C — VARIANT COVERAGE IS A CLAIM, SO TEST IT

`roofClutter(kind, size)` claims 6 x 3 = 18 variants. `streetFurniture` claims 17
kinds. `tree(species, age)` claims 5 x 3. Those are claims about ARGUMENTS. Prove
they are claims about GEOMETRY:

For every family, generate every declared variant and assert that no two produce
identical geometry — compare vertex counts and bounding boxes, and fail if a pair
matches exactly. Your own brief-7 audit caught `person-tall` as "the adult
scaled" and `vehicle-taxi` as "identical silhouette to sedan"; a coverage test
would have caught both without anyone looking.

Then mutate it: make one variant return another and confirm the test goes red.

## BLOCK D — THE LIBRARY EARNS ITS KEEP

Three things, all small, all high value:

1. **A triangle budget column.** Each card shows its LOD0/1/2 counts, and the
   header shows the total the world would pay: `sum(count x LOD0)` across the
   registry. That number is the single most useful fact about this library and
   nothing currently reports it.

2. **Sort by cost.** Let the grid sort by `count x LOD0 triangles` descending,
   so the most expensive thing in the world is the first card. That is where
   optimisation effort belongs and right now it takes arithmetic to find it.

3. **A "what changed" plate.** `scripts/shoot-library.mjs` already captures
   plates. Keep the previous run's PNGs under `.shots/library/prev/` and, after
   re-shooting, report which categories changed. A visual diff is how a
   regression in a model gets noticed before Mark does.

## A NOTE ON WHAT THIS LANE IS NOW GOOD AT

The audits are the reason this is working. Brief 5's self-report said everything
read well; Mark opened the page and could not see a model. Brief 6's named 36
concrete faults. Brief 7's named different, smaller ones. The trajectory is what
matters — each audit should make the next list shorter and more specific.

Keep writing the bad news first. It is the most valuable thing you produce.

## HOW WORK IS ACCEPTED — unchanged

`npm test` green and `npx tsc --noEmit` clean before every commit. A green suite
is not evidence a control works; mutate one control at a time, confirm each
mutation landed before reading its result, and record any that survive. Nothing
is deleted — move it to `_TO-DELETE/<reason>/`. Commit to `assets-lane`; never
merge to main yourself.

Report what you MEASURED — LOD0 counts before and after, the world-total triangle
figure from Block D, and the variant-coverage results — and what you did not get
to.
