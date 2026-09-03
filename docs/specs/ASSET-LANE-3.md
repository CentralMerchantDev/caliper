# CALIPER — ASSET LIBRARY LANE, BRIEF 3

This replaces earlier briefs. Read `docs/WORLD-RULES.md` first; where it and this
differ, the document wins.

## 0. START HERE

```
cd C:\Code\sandbox-spike-assets
git merge main
```

**You are behind main.** Your last report said 506 node tests; main is at 584.
You have been building against a stale picture of the world for at least 78
tests' worth of change. Merge before you write anything, and if the merge
conflicts in a file you do not own, take main's side.

## 1. WHAT YOU ACTUALLY DELIVERED — measured, not reported

Counted from your working copy, not from your summary:

```
public/props.js      1371 lines   26 model declarations
public/roadkit.js    1060 lines   12 families + 3 verify helpers
public/buildings.js   774 lines
public/vendor/kits/   LICENCES.md only — 0 imported asset files
```

The 26 models, in full:

```
beacon  bench-backless  bench-slat  bike-rack  bin-post  bin-round  boat
bollard  bus-shelter  cafe-table  car  container  hydrant  jetty
lamp-pedestrian  lamp-street  mailbox  mooring  parasol  person  planter
quay-wall  rail-tie  sign  tree  windsock
```

The contract work is good and it is the hard part: base-centre origins, three
LODs with declared triangle counts, dimensions read from `prop-manifest.js`
rather than restated, bounding boxes asserted against declarations. Keep all of
it. What follows is not a criticism of that; it is what the numbers say is left.

## 2. THE THREE THINGS THAT ARE WRONG

### 2.1 NOTHING IMPORTS EITHER LIBRARY

```
files under public/ or src/ importing props.js or roadkit.js:  0
```

`prop-manifest.js` mentions them, and it is the world lane's file. Otherwise the
only thing that ever asks these modules a question is a self-test written by the
author of the modules. That is the same finding an audit made about the land
layer two weeks ago, and it is the finding that subsumes the rest: a subsystem
with no second consumer has no independent source of disagreement, so its
guarantees are untested no matter how green the suite is.

**Fix it first, before adding a single new model.** Build
`public/kit-contact-sheet.html` — a page that instantiates *every* declared model
and every road family at LOD0, LOD1 and LOD2, on a plain ground plane, labelled,
with its declared footprint drawn as a wire rectangle underneath it. That page is
a second consumer, it is how you and Mark judge the library by eye, and the
footprint rectangle makes a lying declaration visible instead of theoretical.

### 2.2 THE CATEGORIES MARK NAMED HAVE ONE MODEL EACH

He asked for "trees, airplanes, boats, cars, trucks and all else that is needed
for a city, and the people as well". Against the world's own counts:

| thing  | world needs | you have | ratio |
|--------|-------------|----------|-------|
| tree   | 13,838      | 1        | 1:13,838 |
| person | 21,229      | 1        | 1:21,229 |
| car    | 26,001      | 1        | 1:26,001 |
| truck / van / bus / artic | — | 0 | — |
| aircraft | —         | 0 (a windsock is not an aircraft) | — |
| boat   | —           | 1 + a container | — |

Brief 2 §8 said variation must come from **combination, not from N distinct
models**, and that is still the rule — but one model combined with nothing is
just one model. 26,001 identical cars is the exact failure the rule exists to
prevent, arrived at from the other direction.

So: parameterised **families**, each generating variants from arguments.

- `tree(species, age, season)` — broadleaf, conifer, palm, street-pruned; trunk
  height, canopy radius and branch count as functions of age, so a young and an
  old tree of one species are not the same mesh scaled.
- `person(build, pose, palette)` — a handful of builds, a handful of poses
  (standing, walking mid-stride ×2, seated, leaning), colour families for
  clothing. At LOD1 and LOD2 a person is a silhouette; almost all of the 21,229
  are never seen closer than that, so spend the triangles on LOD0 only.
- `vehicle(class, variant, palette)` — car (hatch, saloon, estate, SUV), taxi,
  van, box truck, artic tractor + trailer, bus, tram, emergency, motorcycle,
  bicycle. One body-shell generator parameterised by wheelbase, roofline and
  bonnet length will carry most of it.
- `vessel(class)` — dinghy, launch, yacht, fishing boat, ferry, tug, container
  ship. Hull as a lofted section; superstructure as blocks.
- `aircraft(class)` — light single, business jet, narrowbody airliner,
  helicopter. Wing, fuselage and empennage parameterised by span and length.

Declare the variant count each family can produce and prove it: render the full
matrix onto the contact sheet.

### 2.3 A BRIDGE IS STILL NOT A CONNECTION

Mark, specifically: *"bridges that you can pick two points of land and they will
connect automatically."*

You built `bridgeArch`, `bridgeCableStayed` and `causeway` — three fixed models.
That is the vocabulary, not the verb. What is missing:

```js
bridgeSpan(a, b, { class: "AVENUE", clearance: 12 })
```

- `a` and `b` are points on land. The function measures the gap, samples the
  ground profile between them, and **chooses the type from the span**: beam under
  ~40 m, arch to ~120 m, cable-stayed beyond, causeway where the water is shallow
  enough to found on.
- It sites piers on that profile — never in the navigation channel, never on a
  slope steeper than the abutment can take — and returns how many it used.
- It emits **road sockets at both ends** matching the class, so a bridge is a
  road piece and not an exception.
- It **refuses**, with a reason, when the span is longer than the chosen type can
  carry or the ground at either end cannot take an abutment. A generator that
  always succeeds is not modelling anything.

Same verb for the road network: `connect(a, b, class)` that lays straights,
curves and junctions between two points is the difference between a kit and a
tool. If that is too much for one pass, do `bridgeSpan` and say so.

## 3. THE PROP LONG TAIL, WHICH IS STILL MOSTLY UNBUILT

From brief 2 §6, still missing: traffic lights, street and traffic signage
variants, utility cabinets, manhole covers, gratings, market stalls, playground
equipment, fountains, statues, flagpoles, fences, gates, hedges, garden walls,
garden furniture, awnings, shopfronts, shutters, balconies, AC units, roof plant,
chimneys, aerials, dishes, solar panels, and the whole airport set beyond the
windsock — runway with centreline and threshold markings, taxiway, apron stand,
jet bridge, blast fence, approach lighting.

These are the ones where **importing beats building**, because repetition is
invisible and expected on a bin or a bollard.

## 4. OPEN SOURCE — WHAT TO USE, AND THE HONEST POSITION

`public/vendor/kits/LICENCES.md` records Kenney, Quaternius and KayKit. **No
files from any of them are present.** Right now that document describes packs
that are not in the repo, which is a licence record for nothing. Either import
from them or cut the entries down to what is actually there — a provenance file
that overstates is worse than none, and this repo goes to employers.

Kenney, Quaternius and KayKit are the right shortlist; all three publish under
CC0, which permits commercial use with no attribution required (we record it
anyway). Two more worth a look for the long tail in §3: **OpenGameArt** and
**Poly Haven / 3D Model Haven**, both CC0 — Poly Haven is already where this
repo's HDRI and textures came from.

**Verify the licence on the specific asset at the moment you download it**, not
from a site's general reputation. Aggregators mix licences per item. If an asset
does not state CC0 (or an equally unrestricted public-domain dedication) on its
own page, skip it and build the model. Record per pack in `LICENCES.md`: name,
source URL, licence as stated on the page, and date retrieved.

My honest read: for a portfolio piece the hand-built parameterised path is the
stronger story, and it is what you have already done well. Import for the boring
tail so your time goes into the families in §2.2 and the connector in §2.3.

## 5. ABOUT YOUR UMAA AUDIT

You audited your own work and graded it PASS / A. The protocol's first
requirement is that the auditor does not know the intent — knowing it is what
stops you looking. A self-audit can find bugs; it cannot produce a grade.

Two specifics:

- **Both "mutations" are the same mutation.** Shrinking a declared footprint and
  watching the bounding-box check fail, done twice, is one control tested twice.
  It tells you nothing about sockets, LOD triangle counts, `standsOn`,
  `clearance`, base-centre origin, or the manifest being the single source of
  dimensions. Mutate each of those separately.
- **The roadkit evidence does not match its claim.** You report mutating
  `road-straight-street-1m` to width 10, and quote the failure as
  `road-straight-freeway-1m LOD0 width 62.000 exceeds allowed width 10 m`. Those
  are different pieces. Either the mutation landed somewhere other than where you
  meant, or the message is wrong. Find out which — an inconsistency between a
  mutation and its evidence is exactly the kind of thing that makes a green
  result meaningless.

Report what you **measured**. "163,410 parts in 14 draw calls" is a measurement
of the hand-placed city the world lane is deleting; it is not a measurement of
your library.

## 6. ORDER OF WORK

1. `git merge main`.
2. `kit-contact-sheet.html` — the second consumer. Nothing new until this exists.
3. `bridgeSpan(a, b, opts)`, with refusals.
4. Families: tree, person, vehicle, vessel, aircraft. Render the full matrix.
5. The §3 long tail, imported where §4 says import.
6. Reconcile `LICENCES.md` with what is on disk.
7. Per-control mutations, one control at a time, each verified as landed before
   the result is read.

## 7. HOW WORK IS ACCEPTED — unchanged

`npm test` green and `npx tsc --noEmit` clean before every commit. A green suite
is not evidence a control works. Nothing is deleted — move it to
`_TO-DELETE/<reason>/`. Commit to `assets-lane`; never merge to main yourself.

Report what you built, what you measured, and what you did not get to. An honest
gap written down beats a claim that everything is done.
