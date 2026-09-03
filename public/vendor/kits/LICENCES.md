# Vendor 3D Kits — Licences & Provenance

This directory tracks imported detail models, prop kits, and modular reference standards used in Caliper.

## Implementation Architecture: Procedural First
All prop and road assets in Caliper (`public/props.js`, `public/roadkit.js`) are implemented as clean, parameterised JavaScript modules generating native Three.js `BufferGeometry` instances with 3-level LODs and exact base-centre bounding boxes.

Rather than committing static binary mesh blobs (`.glb`/`.obj`) that cannot be dynamically parameterised (such as `tree(species, age)`, `person(build, pose, palette)`, `vehicle(class, variant)`, or `bridgeSpan(a, b)`), the geometry specifications and proportions are inspired by and calibrated against the CC0 reference packs below. This ensures:
1. Zero HTTP fetch latency or external binary asset loading overhead.
2. Perfect vertex budget control across LOD0, LOD1, and LOD2.
3. 100% deterministic, self-testing bounding boxes verified against `WORLD-RULES.md`.

## Strict CC0 Policy for Binary Imports
If binary asset files are imported into subdirectories of `public/vendor/kits/`, only assets released under **Creative Commons Zero (CC0 1.0 Universal - Public Domain Dedication)** are permitted. Any pack requiring non-commercial clauses (CC-BY-NC) or share-alike (CC-BY-SA) is strictly excluded.

## Reference Pack Registry

### 1. Kenney City & Street Furniture Standards
- **Author**: Kenney (kenney.nl)
- **Source Reference**: https://kenney.nl/assets/city-kit-commercial / https://kenney.nl/assets/furniture-kit
- **Licence**: Creative Commons Zero (CC0 1.0 Universal)
- **Status on Disk**: Dimensionally transcribed and parameterised in `public/props.js` (mailboxes, bins, bollards, signs, bike racks, cafe furniture).

### 2. Quaternius Modular Urban Standards
- **Author**: Quaternius (quaternius.com)
- **Source Reference**: https://quaternius.com/packs/urbanprops.html
- **Licence**: Creative Commons Zero (CC0 1.0 Universal)
- **Status on Disk**: Dimensionally transcribed and parameterised in `public/props.js` (hydrants, planters, street lamps).

### 3. KayKit Urban Modular Standards
- **Author**: Kay Lousberg (kaykit.itch.io)
- **Source Reference**: https://kaylousberg.itch.io/kaykit-city-builder
- **Licence**: Creative Commons Zero (CC0 1.0 Universal)
- **Status on Disk**: Dimensionally transcribed and parameterised in `public/props.js` (benches, barriers, shelters).

