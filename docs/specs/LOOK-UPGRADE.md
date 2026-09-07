# Getting to the reference quality

**Mark's target, 2026-09-06: the mix.** Not a whole world of twisting future
towers, and not a whole world of ordinary blocks. Both, together, the way the
reference screenshots actually are. Method is his to delegate — *"the outcome is
more important to me than the how"* — and the method chosen is the **modular
kitbash**.

---

## THE MIX IS A DESIGN AXIS, NOT A FINISH AXIS

**Corrected 2026-09-06, after `LIBRARY-STRUCTURE.md`.** An earlier version of
this file said the mix was already expressible through the six quality tiers —
`showstopper`/`luxury` for sculptural buildings, `mid`/`midlow` for ordinary
fabric. **That was wrong, and `LIBRARY-STRUCTURE.md` supersedes it**, in two
ways:

- The six tiers are being **retired down to four**, so those names will not
  exist.
- More importantly, tiers are a **finish** axis — material, trim, detail
  density. A `midlow` art-deco skyscraper is still an art-deco skyscraper. You
  cannot get a plain block out of a sculptural design by lowering its finish.

**The mix is carried by DESIGN**, which is a separate axis:

| | What it is |
|---|---|
| Sculptural designs | Twisting shafts, cantilevers, ring cutouts, roof gardens, skybridges. Landmarks. **Rare by design.** |
| Ordinary designs | Simple masses carried by facade texture and material — exactly what the reference screenshots' background blocks are. **The overwhelming majority.** |

Each of those exists at all four finishes. Finish says how well it is made;
design says what shape it is.

**Rarity is what makes a landmark read as one.** A city where every tower twists
reads as noise. The reference images work because three or four sculptural forms
sit among a hundred plain ones — and the plain ones are plain by *design*, not
by being cheap versions of something ornate.

Which designs are rare is a **seeding** decision, and seeding belongs to the
layout lane, not here.

---

## STAGE 1 — LIGHT AND MATERIAL. CHEAP, AND MOST OF THE DIFFERENCE.

**Do this before any geometry work.** These items add no triangles and are
measured in hours. Until they land, nobody knows how much of the perceived gap
is actually silhouette.

### 1.1 The environment map is reflecting a painted canvas

`city-render.js:526`:

```js
if (ok) { scene.environment = rt.texture; scene.environmentIntensity = 0.6; }
```

The texture behind it is, per the file's own comment at line 425, *"a small
equirectangular sky painted to a canvas, convolved by PMREM."*

Meanwhile `world-render-3d.js` imports `HDRLoader` and uses a **vendored Poly
Haven HDRI** — a real captured sky, already in this repository, used by a
different renderer.

**Feed the city render the real HDRI.** This is a swap, not a build, and it is
probably the largest single visual jump available in the project.

### 1.2 FIRST, CHECK `ok` IS TRUE

That assignment sits behind `if (ok)`, and the surrounding comments record it
silently failing **twice**: PMREM baking a black environment map (line 425–430),
and `readRenderTargetPixels` returning zeros on a half-float target so `lum` was
0 and `ok` was false (line 501–504).

**Probe it before changing anything.** If `scene.environment` is currently unset,
that is the finding, and 1.1 becomes even more valuable. If a check has failed
open twice in the same twenty lines, assume nothing about the third time.

### 1.3 Glass that deserves the reflection

Curtain wall wants roughness ~0.05, metalness ~0.9. The atlas already separates
`wall` from `roof` — the roof fix in `ab3589b` built that plumbing. **Add
`glass` as a third tag** and the mechanism is already there.

Structural mullions matter more than they sound: an unbroken glass plane reads
as plastic. A window-frame grid in the normal map costs nothing.

### 1.4 Emissive at night

Bloom, tone mapping and colour management are already in the renderer. V1
already generates an emissive map. Lit window grids, signage and beacons are
largely a matter of switching it on and choosing intensity.

### 1.5 SSAO or GTAO

Contact shadows where balconies, overhangs and street furniture meet. This one
has real frame cost — measure it, and it comes after 1.1–1.4 so its cost is
judged against a scene that already looks right.

**Stage 1 exit:** the same six cameras, before and after, plus one night render.
Mark judges. **No geometry work starts until he has seen this**, because how much
silhouette work is needed is a question that cannot be answered until light and
material are right.

---

## STAGE 2 — THE KITBASH

**Why this and not a GLB/Blender pipeline.** `buildings.js` already composes
buildings from tagged primitive parts — 252 primitive calls, `tag: "wall"`,
`tag: "roof"`. A kit of parts *is* that system with better parts. It keeps the
per-instance variation a fixed imported mesh cannot give, it keeps everything
generated rather than sourced (Mark's own earlier decision), and it needs no
external service or paid asset tool.

### 2.1 The kit

Roughly sixty parts, each authored once and reused everywhere:

- **Podiums** — retail colonnade, entrance plaza, waterfront base, parking deck
- **Shafts** — twisted glass, fluted Art Deco rib, curved eco-terrace,
  cylindrical core, straight curtain wall
- **Crowns** — ziggurat, sunburst arch, solar dish, dome lantern, plain parapet
- **Roof features** — helipad, pool, sky garden, plant room, aerial array
- **Connectors** — straight and curved skybridges with struts

**Every part is sized in whole cells** per `PLACEMENT-CONTRACT.md`. A shaft is
N cells square. That is what lets the assembler mix parts without measuring
anything.

### 2.2 The assembler

Given a plot's free space and the tier being seeded, choose a podium, a shaft, a
crown and roof features that share a socket size, and stack them. Deterministic
from the seed, so the world stays pinned.

### 2.3 Sculptural forms need curves, not boxes

`THREE.Shape` + `ExtrudeGeometry` with `bevelEnabled`, `LatheGeometry`, and
shapes swept along a `CurvePath` for twists. This is where the near-band
triangle budget goes, and it goes to `showstopper` and `luxury` first.

**Stage 2 exit:** one showstopper tower, one ordinary mid-rise, rendered side by
side and in a street together. Mark judges before the kit is applied in bulk.

---

## WHAT IS NOT BEING DONE, AND WHY

**No GLB import pipeline, no Blender dependency, no AI 3D generation service.**
agy proposed these as the top-rated path. They reverse a decision Mark already
made — he built 2,400 models procedurally *because* he judged building better
than sourcing — and the named tools are paid external services, against the
standing zero-spend rule. If the kitbash proves insufficient after Stage 2, that
is the moment to revisit it, with evidence.

**Skybridges are Stage 2's last item, not its first.** They need two towers whose
heights and positions are known to each other, which is a placement problem, not
a modelling one, and it touches the layout lane.
