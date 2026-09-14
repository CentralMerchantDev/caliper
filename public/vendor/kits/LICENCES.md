# Third-Party 3D Assets & Licences

## Current status: two CC0 packs, five files, imported 2026-09-14

`public/props.js`, `public/roadkit.js` and `public/buildings.js` remain
100% in-tree procedural geometry -- unrelated to this record. What follows
is the first actual import into this directory, for
`docs/briefs/BLD-2026-09-14-look-proof.md` (REBUILD-PLAN.md C1.6): prove
the shared-material look on five real, sourced pieces before building a
two-hundred-piece catalogue to a look nobody has tested.

Licence verified on each pack's own page at the moment of download (not
from site-wide reputation), per this file's own §"Policy for Future
Imports" below.

### Kenney — Modular Buildings

- **Source:** https://kenney.nl/assets/modular-buildings
- **Licence as stated on the page:** "Creative Commons CC0" ("CC0 licensed!")
- **Retrieved:** 2026-09-14, from
  `https://kenney.nl/media/pages/assets/modular-buildings/3253b4219a-1707397411/kenney_modular-buildings.zip`
- **Files kept** (`public/vendor/kits/kenney-modular-buildings/`), each a
  native GLB mesh scaled to fit a catalogue footprint per the brief's own
  instruction ("if a pack mesh does not match a catalogue footprint, scale
  it to fit rather than changing the footprint") -- these are pack SAMPLE
  pieces, authored at a 2 m preview scale, not built-to-footprint originals:
  - `building-sample-house-b.glb` -- sha256 `6c00dc5fcd4552dbad0ef5850265a7741ed20b943929df0a9cd2bdef92e34228`
  - `building-sample-tower-b.glb` -- sha256 `b7360904ab4a6e26098b4ae6f761a6a98022c851faf04ea7760a0ef11328c704`
  - `building-sample-tower-d.glb` -- sha256 `7d9604a6890872e785da67135faf498ea27ad538f4dc2cceae45d761f3e9e8b7`
  - `Textures/colormap.png` -- sha256 `66fd49be148f32e88f6c8cace67120250d1943a7856601158ad0ff24651db0b0`
    (one shared texture atlas for the whole pack, per Kenney's own export
    convention -- every mesh above samples this one file)

### Kenney — City Kit (Roads)

- **Source:** https://kenney.nl/assets/city-kit-roads
- **Licence as stated on the page:** "Creative Commons CC0" ("CC0 licensed!")
- **Retrieved:** 2026-09-14, from
  `https://kenney.nl/media/pages/assets/city-kit-roads/74288c9459-1787042796/kenney_city-kit-roads.zip`
- **Files kept** (`public/vendor/kits/kenney-city-kit-roads/`):
  - `road-straight.glb` -- sha256 `f8f744fb6fc96dedd5ad1f763b550166f2624a3757bf36b4b39969d2e7cacac5`
  - `Textures/colormap.png` -- sha256 `a48e2962661ae44368ffddf3054f80ed8491d082b757dcc3011184cd9a98b185`

Both packs' full zip archives are NOT committed -- only the specific files
these five pieces need. `_TO-DELETE/` is not involved; nothing here
replaces or removes prior content.

## Policy for Future Imports

If binary asset files (e.g. `.glb`, `.gltf`, `.obj`) are imported into subdirectories under `public/vendor/kits/` in the future, the following rules apply:

1. **Strict CC0 Only**: Only assets dedicated to the public domain under **Creative Commons Zero (CC0 1.0 Universal)** or equivalent unconditional public domain terms will be accepted.
2. **Per-Asset Verification**: The licence must be verified on the specific asset page at download time (aggregators often mix licences across packs).
3. **Provenance Logging**: Every imported pack must record:
   - Asset pack name and author
   - Source URL
   - Exact licence text/link as stated on author's page
   - Date retrieved and SHA-256 / file inventory
4. **No Ambiguity**: Any model with non-commercial (CC-BY-NC), share-alike (CC-BY-SA), attribution-only (CC-BY), or proprietary licensing must not be committed to this repository; it must be built via parameterised code instead.


