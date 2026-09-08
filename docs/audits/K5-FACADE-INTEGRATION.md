# K5 facade integration

## The visual comparison

Open these beside one another:

- current district: `.shots/kitbash-district-mix.png`
- named reference: `C:\Code\sandbox-spike\.shots\kitbash-tower-air.png`
- complete catalogue: `.shots/kitbash-contact-sheet.png`

The district is materially better than commit `770267a`: ordinary buildings
now show windows, mullions, spandrels, masonry colour, and per-window tonal
variation on every elevation, while their real cornices, bands, setbacks, and
parapets remain. It does not yet match the tower reference. The standard
district page has a dark solid background, grid ground, a different camera,
and no environment map; the repository contains no script that produced the
tower image. The two existing kitbash shoot scripts preserve their established
camera and lighting, but therefore cannot reproduce the tower frame exactly.
Calling this a like-for-like shot would repeat the defect that prompted K5.5.

My visual judgment is that the fabric now reads as buildings rather than blank
blocks, but the result does not pass the stronger test of naming all four
similar types without labels. The walk-up's balconies and the slab's deep
front recess are clear. The low and middle masonry blocks remain too closely
related at district scale. The atlas is also visibly repetitive on the largest
towers. This is an improvement, not a claim that the taste problem is solved.

## What the existing facade system offered

`facade-textures.js` supplies four architectural families: heritage, interwar,
postwar, and contemporary. `generateFacadeAtlas()` deterministically creates
diffuse, roughness, metalness, normal, and emissive textures. Its eight-by-eight
facade grid includes window frames, mullions, spandrels, sills, recessed-edge
normals, and deterministic lit-window variation, plus reserved plain roof and
curtain-glass patches. `getFacadeMaterial(character, options)` accepts vertex
colour, wall colour, and night options and caches a `MeshStandardMaterial`.
`city-render.js` selects the building character and calls it with those three
options.

The eight fabric parts now use heritage, interwar, postwar, or contemporary
according to type. The material is assigned to all four vertical sides of each
facade box; horizontal caps use a plain material so windows do not cross roofs.
The assembler preserves explicit part materials. It also applies the shared
facade system to wall and curtain-glass surfaces of assembled standard and
landmark buildings. An initial attempt applied it only to landmark walls; the
district render showed that glass-tagged tower shafts stayed flat black, so the
glass surface was brought through the same system as a contemporary curtain
facade.

## Geometry retained and removed

Retained: separate bases, recessed shafts, top bands, string courses,
cornices, four-sided parapet upstands, townhouse bays, the slab's single deep
recess, and walk-up balcony slabs and rails. These provide real silhouette and
self-shadowing that a texture cannot.

Removed: the repeated shallow glass boxes and projecting piers that rebuilt
individual windows on the front elevation. The atlas now supplies those
windows consistently on four elevations. The mansard's discrete dormer glazing
remains because it belongs to separately modelled dormers rather than the
repeated flat-wall window system.

## Four-azimuth self-shadow control

The persistent control now renders each fabric part at 45, 135, 225, and 315
degrees and compares shadow-disabled and shadow-enabled pixels. The material is
recompiled after shadow maps are enabled; omitting that step was the defect in
the first K1 probe. Any zero-pixel direction fails the run.

Red, using the flat geometry immediately before commit `770267a`:

| Part | 45 degrees | 135 degrees | 225 degrees | 315 degrees |
|---|---:|---:|---:|---:|
| masonry low | 567 | 567 | 567 | 567 |
| masonry middle | **0** | **0** | **0** | **0** |
| punched slab | **0** | **0** | **0** | **0** |
| retail ground | 425 | **0** | **0** | 423 |
| flat parapet | **0** | **0** | **0** | **0** |
| mansard | 87 | 87 | 87 | 87 |
| townhouse | 1,077 | **0** | **0** | 1,312 |
| walk-up | **0** | **0** | **0** | **0** |

The run ended with `FOUR-AZIMUTH SELF-SHADOW GATE FAILED` and named all zero
directions.

Green, current geometry:

| Part | 45 degrees | 135 degrees | 225 degrees | 315 degrees |
|---|---:|---:|---:|---:|
| masonry low | 195 | 77 | 41 | 105 |
| masonry middle | 108 | 60 | 46 | 101 |
| punched slab | 107 | 78 | 38 | 152 |
| retail ground | 175 | 59 | 20 | 77 |
| flat parapet | 108 | 110 | 108 | 110 |
| mansard | 340 | 272 | 270 | 266 |
| townhouse | 126 | 33 | 46 | 523 |
| walk-up | 194 | 74 | 64 | 220 |

All 32 directions contain measured self-shadow pixels. This establishes real
depth only. A textured facade can pass this control and still look wrong; the
control was never sufficient, and the district image against the named tower
reference remains the visual judgment.

## Triangle distribution and budget

Across the same deterministic 100 assembled buildings:

| Pass | LOD0 average | LOD1 average | LOD2 average | LOD2 maximum |
|---|---:|---:|---:|---:|
| K1-K4 | 452 | 220 | 54 | 104 |
| K5 | 441 | 210 | 54 | 104 |

The atlas replaced repeated modelled openings, so the near and middle averages
fell. These are observations, not ceilings. The only sourced ceiling is frame
time at 16.7 ms or 33.3 ms from display refresh. This lane cannot measure the
integrated renderer without changing `city-render.js`, so it makes no frame-
time claim and substitutes no triangle proxy.

## Protocol findings

`docs/AUDIT-PROTOCOL.md` now records candidate failure pattern E: before
building a capability, search for an existing repository capability and record
why it is not reused. The board, prop placement, shared embankment, and facade
atlas misses are its four examples.

The protocol also now applies Rule Zero to the bar itself. An unsourced scope
or size ceiling is a fabrication, and work judged by eye requires a named
reference under comparable presentation. Commit `770267a` followed its brief
and its measurable control, yet moved the visual result backwards because the
brief imposed an unsupported fabric-only scope and supplied no named visual
reference. That reviewer-authored constraint was not evidence.

The quarantined `scripts/shoot-kitbash-fabric.mjs` is retained intact under
`_TO-DELETE/non-comparable-kitbash-fabric-shooter/`. It is not maintained as a
second view because its private camera made results incomparable.
