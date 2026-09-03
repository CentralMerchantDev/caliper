# CALIPER — ASSET LANE STANDING CHARTER

This replaces numbered briefs. It is everything the asset lane needs to work
unattended for days: what the library is for, what "done" means, the whole
remaining backlog in priority order, and the rules that make a report worth
reading. Work down it. Do not wait between blocks.

---

## 0. WHAT THIS LIBRARY IS FOR — and the thing it is missing

CALIPER is a world you can change by asking. The land already knows what it is:
every point answers what stands there, what may stand there, how much room it
has, and what it refuses. That half is built and tested.

The other half is **the things that stand on it**. The world lane will shortly
strip every hand-placed building out of the city and re-lay the whole thing from
rules — density anchored at the coast and downtown and fanning outward, a road
hierarchy with purpose, zoning by use, deliberate unbuilt parkland, and variety
inside every block. That re-lay can only place what this library contains.

**So here is the gap, measured in `public/asset-registry.js` today:**

    111 registered assets, across 13 categories:
      airport 8, aviation 4, boundary 6, civic 12, facade 5, furniture 27,
      ground 3, maritime 12, people 3, roads 10, roof 8, vegetation 5, vehicles 8

    ORDINARY BUILDINGS: ZERO.

Twelve civic landmarks — cathedral, terminus, opera, courthouse, university,
theatre and so on — and then nothing. No house. No terrace. No townhouse. No
apartment block. No tower. No shop, no office, no warehouse, no workshop.

`docs/CITY-PLANNING-SPEC.md` §8 states the mix this world generates:

    VILLA 49%   TERRACE 24%   TOWNHOUSE 14%   MIDRISE 8.5%   TOWER 0.4%

That is **99% of every building in the city**, and the library has none of them.
The renderer builds them inline, from a handful of extruded boxes with a roof
colour, which is why the client's exact words are: *"the whole sectors with
nothing but the same buildings is not good"* and *"they look like they were laid
out without any thought."* Half of that is layout, and the world lane owns it.
The other half is that there are only a few buildings to lay out.

Nobody put buildings in a brief, so the last report said there was nothing left
to build. There is a great deal left to build. It is Section 2, and it is the
largest and most valuable work this lane has ever been given.

---

## 1. THE CONTRACT EVERY ASSET MUST MEET — non-negotiable

Read `docs/WORLD-RULES.md` §3.2 and §4 before starting, and re-read §4 whenever
you add a new family. In short:

- **The 8 m CELL is the module.** Divisions to 0.5 m. A LEVEL is 4 m — one
  storey. Every footprint is expressible in whole cells; every height in whole
  levels. `test/place.test.ts` has a test named "model sizes are expressible in
  whole cells, which is what the asset lane builds to". It is the gate.
- **A model declares, and the declaration is checked against its geometry.**
  `footprint {w,d}`, `height`, `clearance`, `standsOn`, `sockets`, `origin`.
  A declared height that does not match the built geometry is a defect, and
  `test/propManifest.test.ts` already fails on it for props.
- **Three LODs.** LOD0 near, LOD1 mid, LOD2 far. Detail is added to LOD0 only.
- **Origin at the footprint centre, on the ground plane**, y = 0 at the base,
  unless the thing digs in — then declare the depth.
- **Nothing is deleted.** Move it to `_TO-DELETE/<reason>/`.

---

## 2. BUILDINGS — the main work

Ten typologies. Each is a **parameterised generator**, not a fixed mesh, because
a city needs hundreds of each and no two neighbours may be identical. Take the
same approach that produced the 116 distinct prop variants: declare the axes,
generate the combinations, fingerprint the geometry, prove they differ.

For each typology below, build a generator over the stated axes and register it.

| # | id | footprint (cells) | storeys | the axes it varies over |
|---|----|----|----|----|
| 1 | `bld-villa` | 2×2 to 4×4 | 1–2 | roof (gable, hip, mansard, flat), porch, garage (attached/detached/none), bay window, dormers, chimney, wall material |
| 2 | `bld-terrace` | 1×3, **repeating unit** | 2–3 | party-wall unit repeated N times; door position, window rhythm, parapet vs pitched, basement area, string course |
| 3 | `bld-townhouse` | 2×3 | 3–4 | stoop height, cornice, bay projection, roof deck, brick vs render |
| 4 | `bld-midrise` | 3×4 to 6×8 | 4–8 | podium (retail/blank/recessed), facade grid rhythm, balcony pattern, corner treatment, crown/parapet, setback above N storeys |
| 5 | `bld-tower` | 4×4 to 8×8 | 12–40 | podium, shaft profile (straight, stepped, tapered), curtain wall vs punched window, crown, roof plant, setbacks |
| 6 | `bld-shop` | 2×2 to 4×3 | 1–3 | shopfront width, awning, signage band, upper-floor residential, corner unit |
| 7 | `bld-office` | 4×6 to 8×10 | 3–10 | entrance canopy, glazing ratio, floor banding, service core bulge, plant screen |
| 8 | `bld-warehouse` | 6×10 to 12×20 | 1 | roof (sawtooth, barrel, flat), loading bays 1–6, roller doors, clerestory, gantry |
| 9 | `bld-workshop` | 3×4 to 5×6 | 1–2 | yard wall, chimney/flue, mezzanine windows, roller door |
| 10 | `bld-apartment-walkup` | 3×5 | 3–4 | stair core position, gallery access vs internal, balcony rhythm, ground-floor garden |

**Three rules that decide whether this is worth building at all:**

1. **VARIETY IS THE POINT.** The named complaint is that a whole sector reads as
   one building. So the test that matters is not "does a villa exist" — it is
   *"generate 200 villas with 200 different seeds; how many distinct geometry
   fingerprints come back?"* Write that test. Report the number. If 200 seeds
   give you 12 shapes, the generator is not finished, and say so.
2. **SILHOUETTE FIRST, THEN DETAIL.** A city is read from 500 m before it is
   read from 5 m. Roof shape, massing, height and setback do almost all the
   work. A beautifully modelled door on a box is worth nothing at the distance
   these are usually seen. Spend the triangles on the outline.
3. **MATERIAL AND COLOUR ARE PART OF THE MODEL.** Declare a palette per
   typology, seeded per instance, and keep the palettes distinguishable between
   typologies — a terrace row should not read as a warehouse row.

Register each with a realistic `count` (villa is in the tens of thousands, tower
in the tens) so the triangle budget stays honest.

---

## 3. CIRCULATION — the parts of a road network that are not straight road

`roadkit.js` has 18 families. The world lane needs the *joints*, because a road
network is mostly joints. Build, as modules that snap on the 8 m cell with
declared connection sockets:

- **Intersections**: 4-way and 3-way, at every pairing of the road classes in
  `WORLD-RULES.md` §3.1 (FREEWAY 62 m ROW, BOULEVARD 44, AVENUE 28, STREET 18,
  LANE 10, ALLEY 6). Include the corner radius, the crossing markings, the
  kerb return, the tactile paving at each corner, and the stop line.
- **Roundabouts** — small (single lane) and large (two lane), with splitter
  islands and give-way markings.
- **On-ramps and off-ramps** — the client drew these himself. Diverge and merge
  tapers, a gore area, and the ramp terminal onto an arterial.
- **Slip lanes, turning pockets, median breaks, bus bays, laybys.**
- **Crossings**: signalised, zebra, raised table, refuge island.
- **Junction of unlike classes** — where an ALLEY meets a BOULEVARD the ROW is
  44 vs 6 and the geometry has to resolve it. Say what your rule is.
- **Rail**: level crossing, points/switch, platform module, bridge over road,
  road over rail.
- **Bridge kit** the client asked for by name: *"bridges that you can pick two
  points of land and they will connect automatically."* Build the pieces —
  abutment, pier, deck span in 3 or 4 lengths, approach ramp, parapet — with
  sockets that chain, so the world lane can span an arbitrary gap by laying a
  run of them. Declare the maximum unsupported span and refuse beyond it.

---

## 4. THE REST OF THE CITY

Everything below is a real gap. Build in this order.

- **People, properly.** Three builds × three poses is nine, and a city needs a
  crowd that does not look cloned. Add: age range, seated/leaning/carrying/
  pushing/cycling/running, luggage, prams, dogs, hi-vis workers, cyclists on
  bikes as one unit. Clothing colour seeded per instance.
- **Vehicles in service.** Delivery van with roller door open, refuse truck,
  street sweeper, tow truck, taxi rank, parked-car row as a single instanced
  module, car with doors/boot open, trailer, caravan, tractor.
- **Street trees by season and by street type.** Avenue tree (tall, clear
  trunk), street tree in a pit with a guard, hedge row, planter, verge grass,
  wildflower strip, tree in leaf / bare / autumn.
- **Parks that look like parks** — the client named this specifically:
  *"parks looking like parks with features and path and such, ponds and such."*
  Path modules (straight, curve, junction), pond edge, bandstand, playground
  set, sports pitch markings, tennis court, allotment, bench-and-bin cluster,
  drinking fountain, park gate, ornamental bed, statue plinth.
- **Waterfront.** Slipway, jetty finger, pontoon, harbour steps, crane, capstan,
  lifebuoy stand, breakwater block, beach hut, lifeguard tower, groyne.
- **Rooftops from above.** This world is seen from the air more than from the
  street. Roof clutter is disproportionately valuable: lift overrun, plant
  enclosure, ducting run, roof access hatch, walkway grating, safety rail,
  skylight bank, roof terrace, green roof, satellite farm, water tank.
- **Night.** Every emissive surface: lit window sheets per typology, shopfront
  glow, street-lamp cone, headlight/tail-light, illuminated sign, harbour light,
  aircraft beacon. Declare which LODs carry emission.
- **Industrial and infrastructure.** Silo, tank farm, cooling tower, substation,
  pylon, chimney stack, conveyor, container stack, gantry crane, pipe rack.

---

## 5. HOW TO WORK, AND HOW TO REPORT

You are running unattended. Everything below exists because a report has already
described a control that was not in the repository.

**Pick your own order within a section, but do the sections in order.** Section 2
is worth more than everything else combined; do not start Section 4 while any
building typology is unbuilt.

**Before every commit:** `npm test` green, `npx tsc --noEmit` clean. Commit to
`assets-lane` only. **Never merge to main.** Nothing deleted —
`_TO-DELETE/<reason>/`.

**A green suite is not evidence a control works.** For every check you write,
mutate the thing it guards, **confirm the mutation actually landed in the file
before reading the result**, and record the outcome. A mutation that did not
apply is INCONCLUSIVE, never a pass. Record survivors; a survivor is the most
useful line in any report.

**Never report a file, a command, a count or an error message you have not
verified is in the repository.** If you are about to quote a failure, re-run it
and paste what it printed. A report describing a control that does not exist is
worse than one saying "I did not get to this": the second costs a run, the first
costs trust in every other line of the same report.

**Each report says, in this order:** what you MEASURED (numbers, with the command
that produced them); what you mutated and what survived; what you did NOT get to
and why; and anything you now believe is wrong with an earlier report of your
own. That last one is not a formality — go back and check.

**When you finish a section, do not stop.** Photograph it (`shoot-library`,
`shoot-kit`), write the report to `docs/specs/ASSET-LANE-REPORT-<n>.md`, commit,
and start the next section. Stop only when Section 5 has nothing left, or when
you are genuinely blocked on a decision that is not yours — and if that happens,
name the decision precisely and carry on with something else meanwhile.
