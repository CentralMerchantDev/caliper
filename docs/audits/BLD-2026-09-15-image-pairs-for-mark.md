# Five pending before/after pairs, gathered for one sitting

CP3, `docs/specs/REBUILD-CHECKLIST.md`, THE CATALOGUE PROPER. Five real
before/after pairs have been sitting in `docs/look-proof-shots/` waiting
on a verdict, spread across three separate runs. Nothing here was
re-rendered or re-tuned to produce this document — every image already
existed; this only gathers and reads them.

All five share one lineage of the same fixed HERO camera (the one
`08-cast-shadows.png` used), except RC4, which is the board camera.

---

## N1a — a sky

**Before:** `docs/look-proof-shots/08-cast-shadows.png`
**After:** `docs/look-proof-shots/11-sky.png`

**What changed:** `scene.background` went from a flat `0x0b1016` to a
real vertical gradient (deep cool blue at the zenith, fading to warm
cream at the horizon).

**Honest read:** a clear, substantial improvement. 08 reads as four
objects floating in a black void with a hard-edged ground; 11 reads as a
place with a sky above it. This is the single most legible change of the
five pairs — nothing about it is subtle. One thing it does NOT fix,
visible in 11 itself: the ground still ends in a visible line where it
meets the sky, close to the camera. That is N1b's own problem, not this
item's to solve.

---

## N1b — a ground that does not end

**Before:** `docs/look-proof-shots/11-sky.png`
**After:** `docs/look-proof-shots/12-ground.png`

**What changed:** a second, much larger (400×400m), coarsely-subdivided
far-ground plane extends solid ground well past the near ground's own
edge and past the buildings; fog (added to the shared material) fades it
into the sky's own horizon colour before it ever visibly stops.

**Honest read:** also a clear improvement, and it fixes exactly the
problem N1a's own after-shot still had. In 11 the ground's own edge is a
hard, close, visible line against the sky; in 12 that line is gone --
the ground fades into the horizon instead of stopping. Less dramatic
than N1a (there is no void to remove this time, only an edge to hide),
but real and visible side by side.

---

## N1c — something at street level

**Before:** `docs/look-proof-shots/12-ground.png`
**After:** `docs/look-proof-shots/13-street-level.png`

**What changed:** kerbs framing the road tile's own four edges, a paved
path bridging the gap between the road and the house, and one prop
(a small green dumpster) near the tower.

**Honest read:** the most subtle of the three N1 items, and this pair
shows exactly why the L10 verdict already said meshes and joins do more
visible work than shading-level detail. The dumpster is the one
unambiguous, easy-to-spot addition. The kerb and path geometry is real
(confirmed in the code and by the item's own commit history — draw
calls stayed at 2, triangles rose 12198→12414) but genuinely hard to
pick out at this camera's own distance and exposure without already
knowing where to look. Not a wasted item — R8's "cover the intersection"
logic is sound and reusable — but on THIS evidence alone it reads as a
minor refinement, not a second N1a.

---

## RB5 — the ground stops reading as desert

**Before:** `docs/look-proof-shots/13-street-level.png`
**After:** `docs/look-proof-shots/21-ground-material.png`

**What changed:** a second, more neutral ground texture (CC0 gravel,
already vendored) assigned per-vertex within a paving radius of every
real footprint; the fog colour and the sky's own horizon stop retuned
together so the seamless fade N1b built still holds.

**Honest read:** a real, clearly visible change, and the strongest of
the five pairs after N1a. 13 is uniformly warm dirt/sand under all four
pieces; 21 shows a continuous grey paved area connecting them. This is
the pair that most directly answers Mark's own "buildings in a dust
bowl" complaint that started this whole thread. The fog/sky retune
inside the same pair is real but far more subtle than the paving change
-- present, not the headline.

---

## RC4 — the board camera's own scene pass

**Before:** `docs/look-proof-shots/14-board.png`
**After:** `docs/look-proof-shots/25-board-scene-pass.png`

**What changed:** the SAME paving mechanism RB5 built, given its own
wider radius for this much more distant, more overhead board camera (20m
vs RB5's 6m for the hero camera); the fog range retuned separately for
this camera's own real measured distances (~134-212m to the ground's own
near/far corners, vs the hero camera's ~40-90m).

**Honest read:** another clear, substantial improvement, and arguably
the most important of the five for the actual playable board (this is
the camera a person actually plays from, not the hero composition). 14
shows four small grey patches directly under each piece in an otherwise
uniform dust field -- exactly RB5's own "before" problem, just at a
different camera's own scale where a 6m radius barely registers. 25
shows one continuous paved plaza connecting all four demo pieces. The
fog retune's own contribution is harder to isolate from the paving
change in this particular pair (unlike RB5's own before/after, where
paving and fog were both changed but the paving alone would have made
most of the visible difference) -- both were changed together and both
plausibly matter, but the paving radius is doing the visible work here
too.

---

## Overall pattern across all five

The two paving-radius changes (RB5, RC4) read as the strongest,
clearest improvements — both are direct fixes to the same "dust bowl"
complaint, at two different camera scales. N1a is close behind (removes
an outright void, not just improves a material). N1b is a real but
quieter fix (an edge disappears rather than a whole void). N1c is the
weakest of the five on this evidence alone — real, working code, but the
least visible change, consistent with L10's own verdict that meshes and
joins carry more of a scene's read than incremental shading refinement.

None of the five looks like a regression. No re-rendering or re-tuning
was done to produce this document, per CP3's own instruction.
