# Third-Party 3D Assets & Licences

## Current Status: 100% In-Tree Procedural Geometry

**No third-party mesh files, binary assets, or external 3D packs are used in this codebase.**

All 3D geometry in Caliper (`public/props.js`, `public/roadkit.js`, and `public/buildings.js`) is authored directly in-tree as procedural JavaScript modules producing native Three.js `BufferGeometry` structures. Dimensions for standard urban models are derived from `public/prop-manifest.js` (owned by the world lane).

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


