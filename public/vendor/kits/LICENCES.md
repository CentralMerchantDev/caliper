# Third-Party 3D Assets & Licences

## Current status: three CC0 packs, 20 pieces, imported 2026-09-14

`public/props.js`, `public/roadkit.js` and `public/buildings.js` remain
100% in-tree procedural geometry -- unrelated to this record. What follows
began with the first actual import into this directory, for
`docs/briefs/BLD-2026-09-14-look-proof.md` (REBUILD-PLAN.md C1.6): prove
the shared-material look on five real, sourced pieces before building a
two-hundred-piece catalogue to a look nobody has tested. Extended
2026-09-14 (`docs/briefs/OVERNIGHT-BLD-2026-09-14.md`, item L12) to a
realistic piece count, per R2/C1.5's own instruction to start far lower
than instinct says -- 20, not 200.

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
  - **Added for L12 (2026-09-14):** `building-sample-house-a.glb` -- sha256
    `28fae63b748ee8610174092c1d648a2b913a0c5f1ba07426656571766c69b415`;
    `building-sample-house-c.glb` -- sha256
    `66e3c287792b84559af4c1de4cd42ca7ca3230c0a4f0bade5a92c42a3ef31f95`;
    `building-sample-tower-a.glb` -- sha256
    `e44adf48cbde19f84d579fbd492664e4b39e39f96cad234bbd6d5758f83f89a6`;
    `building-sample-tower-c.glb` -- sha256
    `46c3f2133649fb92b5fb70768f8e409fb560797375be9453de8154d69e63b8f8`.
    Same pack, same zip, same colormap.png as above -- re-verified CC0 on
    the same page, not re-downloaded.

### Kenney — City Kit (Roads)

- **Source:** https://kenney.nl/assets/city-kit-roads
- **Licence as stated on the page:** "Creative Commons CC0" ("CC0 licensed!")
- **Retrieved:** 2026-09-14, from
  `https://kenney.nl/media/pages/assets/city-kit-roads/74288c9459-1787042796/kenney_city-kit-roads.zip`
- **Files kept** (`public/vendor/kits/kenney-city-kit-roads/`):
  - `road-straight.glb` -- sha256 `f8f744fb6fc96dedd5ad1f763b550166f2624a3757bf36b4b39969d2e7cacac5`
  - `Textures/colormap.png` -- sha256 `a48e2962661ae44368ffddf3054f80ed8491d082b757dcc3011184cd9a98b185`
  - **Added for L12 (2026-09-14):** `road-bend.glb` -- sha256
    `9752f63448c8e7a3d30ca2e0e1bb6784c5adb72b56a2b05667be8d546c1674bc`;
    `road-crossing.glb` -- sha256
    `eb8575335f77da513add4a5277a7b60cad4886c07966f024b15cf55e5966cde3`;
    `light-square.glb` -- sha256
    `6230d136c8883d7f9bc1b86f0309077e452e26e5e1e587ef1b77abef3c5f047c`;
    `electricity-pole.glb` -- sha256
    `08c9b924e297eaa46bbd79ac09795c045848a4e38a72b2ce4f973517f840c2d3`;
    `dumpster.glb` -- sha256
    `c60ebecc23487c38b5e0750856a3b50744d2ea12b3c83ad03d537e5a4670777a`.
    Same pack, same zip, same colormap.png as above.

### Kenney — City Kit (Commercial)

- **Source:** https://kenney.nl/assets/city-kit-commercial
- **Licence as stated on the page:** "Creative Commons CC0" ("CC0 licensed!")
- **Retrieved:** 2026-09-14, from
  `https://kenney.nl/media/pages/assets/city-kit-commercial/a742d900eb-1753115042/kenney_city-kit-commercial_2.1.zip`
- **Files kept** (`public/vendor/kits/kenney-city-kit-commercial/`), added
  for L12 -- the THIRD real texture layer, proving the array-texture
  mechanism scales past two, not just two packs merged repeatedly:
  - `building-a.glb` -- sha256 `5cf220f90ee3f21e7abe38055ca409a48aa8ef1d5ffab6e2deb99e5a5e1ed5e0`
  - `building-e.glb` -- sha256 `edbe5b49858a3c83e72d3cf496129c06082ef3a3d6005769f8883138e275b456`
  - `building-f.glb` -- sha256 `633a25f7fb3ccf98e304a885a36ed900aecee5bde7ecd554729dec753cceea78`
  - `building-j.glb` -- sha256 `eedc2690cda345b62351f03a218a817a6ad59f399c12e064ca5ff37333d059f5`
  - `building-skyscraper-b.glb` -- sha256 `3a383e8a0a8819023d30b2aee1c6f40fa6bc28990227a306a86e531f36c6b8d5`
    (fills C1.1's 8x8 "mega tower" footprint class -- none of L1-L11's five
    pieces reached that class)
  - `detail-awning.glb` -- sha256 `386978daf81dc11ac601638f19a41918a391ff882a8c518ae5a3215a1bed4d8a`
  - `detail-parasol-a.glb` -- sha256 `70e636bea8dc67c3bfd19b163333e824356118458c8c401017322ec43c10a7f7`
  - `Textures/colormap.png` -- sha256 `191bec3889aaaca5018380038fecc129ebb5c2182879a099b7b538b3fa050b5d`

All three packs' full zip archives are NOT committed -- only the specific
files the 20 pieces need. `_TO-DELETE/` is not involved; nothing here
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


