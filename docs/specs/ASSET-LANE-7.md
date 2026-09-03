# CALIPER — ASSET LIBRARY LANE, BRIEF 7

## 0. THE AUDIT IN BRIEF 6 IS THE BEST WORK THIS LANE HAS PRODUCED

Not the library — though the library is right, and per-item bounding-box framing
with one shared context blitting into card canvases is exactly the correct
answer. The best work is the **list of 36 defects you wrote about your own
models**.

Compare it to brief 5's audit, which said roof clutter gave "crisp silhouette
breaks" and vehicles were "instantly recognizable", while Mark opened the same
page and could not find a model. This time: *"sphere on a pole (lollipop tree)"*,
*"looks like an abstract pawn rather than an articulated human figure"*, *"flat
cruciform with no wing sweep, no turbofan engine pods"*, *"container stacks are
single massive monolithic boxes rather than individual 40ft container modules"*.

That is a person looking at their own work and reporting what is there. It is
harder than building the models and it is worth more, because it is the thing
that tells you what to build next. Keep doing exactly that.

**This brief is the work list you wrote.** It is long on purpose.

## 1. THE PRINCIPLE: THE IDENTIFYING FEATURE COMES FIRST

Your 36 findings share a small number of root causes, and reading them that way
turns 36 jobs into four:

1. **A flat slab where there should be depth** — signs, shutters, awnings,
   gratings, garden walls, road ribbons.
2. **A solid where there should be an aperture** — drain gratings with no slots,
   iron gates with no pickets, shopfronts with no recess, market halls with no
   glazing.
3. **A primitive standing in for a silhouette** — the lollipop tree, the pawn
   person, the two-stacked-boxes van.
4. **The one feature that names the thing, missing** — a taxi with no roof sign,
   an airliner with no engine pods, a level crossing with no barrier arms, a
   container ship whose containers are one box.

Cause 4 is the cheapest and it buys the most. **For every model, name the single
feature that makes someone say what it is, and add that before any other
refinement.** A taxi is a sedan plus a roof sign. An airliner is a fuselage plus
swept wings plus two engine pods. A level crossing is a road plus two red-and-
white barriers. None of those cost many triangles and each one converts an
unidentifiable box into a recognisable object.

Do cause 4 across the whole library FIRST, then 3, then 2, then 1. That order is
deliberate: it maximises how much of the library reads correctly per hour spent,
and it means if this run is cut short the library is still better everywhere
rather than excellent in one category and untouched in eleven.

## 2. THE THREE THAT MATTER MOST, BY A LARGE MARGIN

Your own audit names these as the worst-reading, and the world places them more
than everything else combined:

| family | instances | your verdict |
|---|---|---|
| people | 21,229 | "an abstract pawn" |
| vehicles | 26,001 | "two stacked boxes" |
| trees | 13,838 | "sphere on a pole" |

**61,000 of the objects in this world are the three things you rated worst.**
Whatever else this run does, these three have to move.

- **person** — separate the limbs. Shoulders, arms held away from the torso, a
  stride stance in the walking pose, and a head-to-body ratio that differs
  between adult and child. At the distance most of them are seen, the silhouette
  is everything and the face is nothing.
- **vehicle** — a windscreen rake, wheel arches with the wheels set into them, a
  bumper shelf, a grille recess. Then the per-class identifier: taxi roof sign,
  emergency light bar, artic tractor/trailer articulation gap.
- **tree** — bifurcating primary branches and a canopy built from two or three
  overlapping clumps rather than one sphere. Palm gets individual arching
  fronds; cypress gets tiered columnar foliage.

## 3. THE TRIANGLE BUDGET IS THE CONSTRAINT, AND IT BINDS HARDEST HERE

Detail goes on **LOD0 only**. LOD1 and LOD2 stay where they are, and their
declared counts must not move.

That is not a style note. 21,229 people at LOD0 is the single largest instance
count in the world, and if LOD0 grows from 40 triangles to 400 that is eight
million triangles for pedestrians alone. The declared per-level counts and the
assertion that real geometry matches them are what keep this honest — do not
relax either. If a model genuinely needs more LOD0 than its budget allows, say
so with the number and the reason, and leave it.

State, in your report, the LOD0 triangle count before and after for every model
you touch. A silhouette fix that quietly triples the scene is not a fix.

## 4. THE FULL LIST, FROM YOUR OWN AUDIT

Work it in the order of §1. Every item below is yours, quoted or summarised.

**Roof** — aerial: lattice and guy wires, dipole array. solar-panel: cell grid
division, frame mounting. satellite-dish: parabolic curvature, feed horn struts.

**Furniture** — sign-warning: border embossing, face depth, rear brackets.
utility-cabinet: louvred vents, door seams, latch. traffic-light: cowl hoods
over each lens *(identifying feature — do this one first)*.

**Ground** — manhole: cast-iron tread pattern, pry notches. drain-grating: actual
open slots *(an aperture, not a texture)*. paving-tactile: build it; the blister
grid is the whole point of the object.

**Facade** — awning: scallop valance, sidewall brackets. shutters: angled louvre
slats, hinges. shopfront: transom bar, recessed entry, kickplate, fascia depth.

**Boundary** — hedge: ragged top silhouette, clumped foliage. wall-garden:
projecting coping cap, bonding. gate-iron: open pickets *(aperture — first)*.

**Vegetation, People, Vehicles** — see §2.

**Maritime** — rowboat: gunwale lip, thwarts, oarlocks. sailboat: boom and a
triangular sail *(identifying — first)*. container-ship: individual 40 ft
container modules, not one block *(identifying — first)*.

**Aviation** — light-single: propeller disc, dihedral, gear struts. airliner:
swept wings, two turbofan pods, swept fin *(identifying — first)*. jet-bridge:
accordion bellows, wheeled bogie.

**Roads** — road-straight: kerb bevel, gutter, sidewalk line. roundabout: central
island mound, splitter islands. level-crossing: barrier arms and flashing lights
*(identifying — first)*.

**Civic** — art-gallery: clerestory slits, entrance canopy, material contrast.
courthouse: column fluting, stylobate steps. market-hall: exposed truss framing,
glazed gable lunettes.

## 5. THEN AUDIT AGAIN, THE SAME WAY

Re-shoot the library plates and write the three worst-reading items per category
again. The list should be different from brief 6's and it should be shorter. If
an item appears on both lists unchanged, say so plainly — that is a fix that did
not work, and it is worth more than a fix that did.

## HOW WORK IS ACCEPTED — unchanged

`npm test` green and `npx tsc --noEmit` clean before every commit. A green suite
is not evidence a control works; mutate one control at a time, confirm each
mutation landed before reading its result, and record any that survive. Nothing
is deleted — move it to `_TO-DELETE/<reason>/`. Commit to `assets-lane`; never
merge to main yourself.

Report what you MEASURED — including LOD0 triangle counts before and after — and
what you did not get to.
