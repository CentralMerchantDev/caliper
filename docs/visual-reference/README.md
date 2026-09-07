# Visual reference — what "good" looks like

Nine images Mark supplied as the target. All are SimCity (2013) or
Cities: Skylines. **They are a quality bar, not a style to copy** — CALIPER is
not a SimCity clone and should not become one. What we are borrowing is density
of detail, material contrast, and the sense that a city is inhabited.

Each entry below says what to take from that image specifically. Read this
before starting any visual phase, and come back to it when judging your own
renders.

---

## ref-01 — future district, wide
Sculptural towers with real silhouettes: tapers, curves, crowns, cantilevers.
Not extruded rectangles.

**Take:** the skyline reads because buildings have *shape*. Even two or three
distinctive forms per district break up a horizon. Note the tree canopy at
ground level and the vehicles on the boulevard — the frame is never empty.

---

## ref-02 — future district, street level
The clearest demonstration of **material contrast**: white ceramic, blue glass,
green planted terraces, dark metal, all in one frame.

**Take:** the palette is doing as much work as the geometry. Compare to
CALIPER's current pastel uniformity. Also: mid-rise blocks in the background are
plain masses — they read as buildings entirely through *facade texture*, which
is Phase V1's whole argument.

---

## ref-03 — waterfront, elevated
Roads, rail and water threading between blocks. Green space is deliberate, not
leftover.

**Take:** the ground plane carries the composition. Every surface is
differentiated — road, verge, path, plaza, water, planting. Phase V4.

---

## ref-04 — Cities: Skylines box art
Included for the overall look: cranes, construction, layered depth.

**Take:** a city under construction reads as alive. Worth considering for
CALIPER, where the player is literally building.

---

## ref-05 — bridge and downtown
Classic dense downtown: varied tower heights, a landmark bridge, waterfront
edge.

**Take:** **height variation within a district.** Towers of one height read as a
bar chart. Note the podium-and-tower massing on most blocks — Phase V3.2.

---

## ref-06 — coastal city, stylised
High saturation, strong sky, clear atmospheric depth into the distance.

**Take:** the colour grade. Distant land shifts blue and hazy while the
foreground stays saturated. Cheap to do with fog and tone mapping, both already
in the renderer.

---

## ref-07 — dense street, traffic
Traffic, signage, smoke, mixed building ages, visible wear.

**Take:** **imperfection and variety**. Buildings of different ages and
conditions on one street. Everything is slightly different from its neighbour.
Phase V5.3.

---

## ref-08 — suburban aerial
**The single most instructive image here.** Almost entirely roads and low
buildings, and it still reads unmistakably as a city.

**Take:** road markings, junction geometry, driveways, sidewalks, front
setbacks, individual garden planting. This is Phase V4's acceptance target —
if a CALIPER district overhead can look like this, the ground plane is done.

---

## ref-09 — street level, mid-rise
Tram, cars, pedestrians in numbers, hoardings, signage, rooftop plant, awnings,
balconies.

**Take:** **street furniture density**. Count the distinct objects in one frame
— dozens. CALIPER's asset library currently has a median of 12 triangles per
model, so this frame is what Phase V2 is for. Also note real depth on facades:
balconies and window reveals cast shadows, which is what stops a wall reading
as a flat plane.

---

## THE HONEST GAP, MEASURED

| | CALIPER today | These images |
|---|---|---|
| Building triangles | 140–696 (LOD0), ~319 avg | 2,000–15,000 |
| Prop/asset triangles | **median 12** (a cube) | 200–2,000 |
| Facade textures | none | every surface |
| Material families | largely uniform | 6+ with real contrast |
| Street surface | kit exists, unverified on screen | fully detailed |
| Moving things | none | vehicles, people, everything |

**What CALIPER already has that these images required:** PBR materials,
directional and ambient lighting, shadow mapping, bloom, tone mapping, colour
management, LOD structure, instancing. The expensive foundation is built. The
gap is geometry, texture and life — which is the part that parallelises.

---

## HOW TO USE THESE

1. Before a phase, look at the images relevant to it (each phase in
   `docs/VISUAL-BUILD-PLAN.md` names which).
2. After a phase, render the equivalent CALIPER view and put it beside the
   reference.
3. Show Mark both. **He decides.** Do not close a visual phase on your own
   judgement or on a passing test.
