# The World Rules

**What this is.** The land, and the rules for what may stand on it. Not a city.
No layout, no placement, no objects. This is the ground that models get laid
onto, plus the contract every model has to satisfy to be layable.

**Who it is for.** Two lanes build against this document.

- The **land lane** builds the ground and implements every query below.
- The **asset lane** builds models to these dimensions and with these
  connection points. If a model does not satisfy the contract, the land cannot
  place it.

**What it is not.** It is not a building code and the world does not enforce
compliance against it. Real planning practice is used to *justify* the numbers
so the world is well-founded rather than arbitrary — the reasoning is written
next to each one — but they are design decisions, not statutes.

---

## 1. The land

The land is the only thing that exists before models. It is:

- a height field, continuous, with a real underside — bedrock at −175 m and a
  floor, so the world is a solid mass with water sitting in its hollows rather
  than a mask over nothing;
- water, which is the same surface continuing below zero;
- and nothing else.

### 1.1 What the land must be able to answer

Every question below is asked at a point or over a rectangle. These are the
whole interface between the land and anything that wants to stand on it.

| Question | Returns |
|---|---|
| `heightAt(x, z)` | ground height, metres |
| `slopeAt(x, z)` | gradient, dimensionless |
| `materialAt(x, z)` | rock / soil / sand / seabed |
| `waterAt(x, z)` | none, or `{ kind: sea \| river \| canal, depth }` |
| `surfaceAt(x, z)` | the ground type — see §2 |
| `whatIsAt(x, y, z, t)` | what occupies this point, at this height, at this time |
| `canPlace(footprint, rules)` | yes, or **no with a reason** |
| `findGround(need)` | somewhere that satisfies `need`, or nothing |

`canPlace` returning a *reason* is the load-bearing part. "No" is not an
answer — "no, 4.2 m of that footprint is in a carriageway" is.

### 1.2 The world is a volume, not a surface

The land is not a skin. It has depth below and air above, and both are
addressable — because "what is at this point" has to have an answer at any
height, not only at ground level.

**Below ground** — strata, in metres of depth from the surface:

| Depth | Layer |
|---|---|
| 0–2 m | topsoil |
| 2–8 m | subsoil |
| 8–25 m | clay and gravel |
| 25–70 m | weathered rock |
| below 70 m | bedrock, down to −175 m |

This is why a cut or a cliff shows geology instead of a darkened copy of the
grass above it, and it is what a foundation, a basement, a tunnel or a cutting
is dug *into*. Rock below the surface is solid: you cannot build inside a hill
any more than you can build inside a building.

**Above ground** — bands, in metres above local terrain:

| Height | Band | What it governs |
|---|---|---|
| 0–2 m | pedestrian | furniture, walls, anything a person meets |
| 2–12 m | street | vehicles, awnings, signs, low buildings |
| 12–60 m | building | most of the built envelope |
| 60–200 m | tower | high buildings, cranes, masts |
| 200 m+ | sky | flight paths, weather, nothing built |

Air is occupiable. A bridge deck holds air at 2–55 m and the water beneath it
stays navigable; a lamp head occupies air a bench may stand under. That is why
`whatIsAt` takes a `y` and why reservations carry a height range rather than
only a footprint.

### 1.3 The point system

Every point in the world has an address, and the address exists before anything
is put there. Nothing is *in* the points yet — they are laid out so that when
things do arrive, each one can be traced, tracked, found, moved and removed.

An address is `(x, y, z, t)` in world metres and world time. From it the land
can always answer: what the ground is, what is below, what is above, what
occupies it now, what occupied it before, and what is allowed there.

Two consequences worth stating, because both have already cost this project:

- **Built metres never scale.** A sidewalk is 3 m wide, a bench 1.8 m long, in
  a world of any size. Only landform metres scale by `WORLD_SCALE`. Mixing the
  two silently destroyed a working port once.
- **One thing owns each fact.** A dimension is written down in exactly one
  place and read from there. A size restated in a second file is a defect with
  a delay fuse, not a convenience.

### 1.4 Time

Every reservation carries `since` and `until`. The land is asked what was there
at time `t`, not only what is there now. This is what makes the world editable
rather than generated once: removing a thing is closing its interval, not
erasing it.

---

## 2. The land forbids; it does not assign

**The land holds no zoning and no plan.** Any dry ground could become a road, a
house, a park, or stay empty. The land has no opinion about which, and a world
whose ground is pre-assigned cannot be built in by anyone.

What the land does is two things:

1. **Refuse the few things it genuinely knows are impossible.** Open water will
   not carry something that stands on the ground — it will carry a bridge, a
   pier or a hull. A cliff face carries nothing with a footprint. A foreshore
   carries nothing permanent. These are facts about terrain, not policy.
2. **Report what is already there**, so the thing already there can say what it
   will carry.

### 2.1 The rule travels with the object, not with the earth

A sidewalk is not a permission the land granted. It is something somebody built,
and having been built it accepts people, lamps, hydrants and signs, and refuses
cars. Put a carriageway on that same ground instead and it now accepts cars and
refuses lamps. Same square metre, opposite answers, decided by what stands on it.

| Once built, this… | …carries |
|---|---|
| `OPEN` (unbuilt land) | **anything** — the land is unassigned |
| `CARRIAGEWAY` | vehicles, rail vehicles, markings |
| `SIDEWALK` | pedestrians, furniture, lamps, signs, vegetation |
| `VERGE` | vegetation, lamps, signs, furniture |
| `PARKING` | vehicles |
| `TRACK` | rail vehicles |
| `PLOT` | buildings, structures, furniture, vegetation |
| `PARK` | pedestrians, furniture, vegetation, structures, lamps, signs |
| `FARM` | structures, vegetation |
| `BEACH` | pedestrians, furniture, vegetation |
| `WATER` | vessels |
| `ROCK` | nothing |

`OPEN` accepting anything is the entry that makes the world buildable. If it
carried a list instead, every new kind of object would need the land amended
before it could be placed anywhere at all.

A road is still not one surface: a `BOULEVARD` is a carriageway with a verge, a
sidewalk and parking on each side, and those carry different things. That
decomposition is what lets a lamp be on the sidewalk and never in a lane — and
it is why a reservation carries an explicit `surface`, not just a kind.

### 2.2 Size decides, and it is most of the question

A parcel too small will not take a road. A house-sized plot will not take a
tower. Something that fits is still refused where it would hang over the edge.

This is the check that was missing everywhere in this project's history, and its
absence produced: a stadium standing at −7.0 m in the water; an airport apron
overhanging its own vetted platform by 110 m with a row of aircraft beyond it;
389 plots inside feature footprints; and 328 promoted arterials whose blocks
were set back for a narrower road than the one built. Four different-looking
bugs, one question nobody asked — *is there actually room.*

---

## 3. Dimensional standards

These are the sizes the asset lane builds to. They are real-world metres and
**never scale** — a sidewalk is the same width in any size of world. Only
landform metres scale.

### 3.1 Road classes

Right-of-way is the total width including everything.

| Class | ROW | Lanes | Sidewalk | Parking | Tram |
|---|---|---|---|---|---|
| `FREEWAY` | 62 m | 6 | — | — | — |
| `RAMP` | 14 m | 1 | — | — | — |
| `BOULEVARD` | 44 m | 4 | 6.0 m | yes | yes |
| `AVENUE` | 28 m | 2 | 4.0 m | yes | — |
| `STREET` | 18 m | 2 | 3.0 m | — | — |
| `LANE` | 10 m | 1 | 1.5 m | — | — |
| `ALLEY` | 6 m | 1 | — | — | — |

A lane is 3.0–3.7 m of running surface depending on class; the rest of the ROW
is sidewalk, verge and parking. The asset lane decomposes each class into those
strips so the ground types in §2 fall out of the model rather than being painted
on afterwards.

### 3.2 The module length

**Roads are tiled from modules, so there is a module length: 8 m.**

Every road piece is a whole number of modules long. 8 m divides cleanly into the
block and spacing figures below, it is short enough to follow a curve without
visible faceting, and it is long enough that a kilometre of street is 125
instances rather than a thousand.

Everything that tiles — road, sidewalk, rail, quay, fence, sea wall — uses this
module. Anything that does not tile does not need it.

### 3.3 Blocks and spacing

| Figure | Value | Why |
|---|---|---|
| Desirable block length | 61–122 m | ITE / CNU guidance |
| Block length ceiling | 183 m | ITE / CNU acceptable maximum |
| Max average intersection spacing | 201 m | anything beyond reads as a superblock |
| Arterial spacing | ~800 m | standard hierarchy in developed areas |

Any grid gap wider than the ceiling is subdivided by a `LANE`. This is
Melbourne's pattern — its blocks are ~201 m but every one is split by a "little
street" of about 10 m, which is where its walkable grain comes from. A 201 m
block *without* its little street is not Melbourne, it is a superblock.

### 3.4 Setbacks and frontage

A block edge is set back from the road by **the half-width of the road on that
edge** — not by a constant. Roads are promoted in a hierarchy, so neighbouring
edges of the same block are frequently different widths. Getting this wrong puts
buildings in carriageways and is invisible until something asks the ground.

---

## 4. The model contract

A model that does not do all of this cannot be placed.

### 4.1 Every model declares

```
id, kind ("hard" | "soft")
footprint { w, d }      ground occupancy, metres, before rotation
sweep     { w, d }      widest extent at any height, when it differs
height                  metres
clearance               free ground needed around the footprint
origin: "base-centre"   (0,0,0) is the centre of the footprint at ground level
standsOn: [...]         which ground types from §2 it may stand on
lod: [ LOD0, LOD1, LOD2 ]
```

`footprint` and `sweep` are separate because they answer different questions. A
lamp post is 0.6 m where it meets the pavement and 1.6 m wide at the head, 9 m
up. A bench under that head is what real streets look like; a bench through the
post is not. One number cannot say both.

### 4.2 Things that tile or join also declare sockets

```
sockets: [ { at: [x,y,z], bearing: deg, width: m, lanes: n, kind } ]
```

`bearing` is the direction traffic *leaves* the piece; 0 is +Z, clockwise. Two
pieces mate when their sockets face each other and their widths and lane counts
match. Without sockets nothing can be snapped, moved, or swapped — which is the
whole point of models over drawn geometry.

### 4.3 Levels of detail

Three levels, always. The world holds tens of thousands of objects and a browser
will not draw them all in full detail:

- **LOD0** full detail, street level
- **LOD1** simplified, roughly a quarter of LOD0's triangles
- **LOD2** silhouette and colour only, seen from the air

A model with only LOD0 cannot be used.

---

## 5. How a thing gets placed

The sequence, in full. Nothing skips a step.

1. **Ask for ground.** `findGround(need)` or a specific position.
2. **Check the surface.** Is `surfaceAt` in the model's `standsOn`?
3. **Check the fit.** Does the footprint plus clearance fit, at this slope,
   without overhanging into a surface it may not stand on?
4. **Check occupancy.** Does `whatIsAt` already hold something here, at this
   height, at this time?
5. **Place, or refuse with a reason.** A refusal is a fact about the world and
   is counted and reported, never swallowed.
6. **Reserve.** The placed object goes into the registry with `since`/`until`,
   so the next thing to ask gets a true answer.

Steps 2–4 are three different questions and conflating them is how objects end
up inside each other. Deciding and recording are also different jobs: a prop
standing on a sidewalk is legitimately *inside* the road's rectangle, and asking
one question when you meant the other refuses the whole street.

---

## 6. What this makes possible

Because the land answers, and every model declares:

- a user can **add** a road, and the pieces snap because sockets match;
- a user can **move** or **remove** anything, because everything is registered
  with an interval rather than baked into geometry;
- a user can **replace** a model with a better one, because placement depends on
  the declaration and not on the mesh;
- nothing lands on top of anything else, because step 4 is not optional;
- and the city can be **laid out once, from rules**, rather than hand-placed and
  then corrected forever.
