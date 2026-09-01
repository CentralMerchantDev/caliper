// =============================================================================
// WHERE THE BIG THINGS GO, AS DATA
//
// WHY THIS FILE EXISTS
//
// Every large feature in this world used to be placed by typing a coordinate
// into the renderer. 42 of them, all inside one function. The trouble with a
// literal is that it cannot look wrong: (1700, 250) is just a number, equally
// plausible over a hill or over the harbour. So nothing looked wrong, and all of
// this was true at once and had been for the life of the build:
//
//   * the stadium stood at -7.0 m and the cathedral at -4.1 m -- in the water
//   * the container port sat 40 m up a HILLSIDE, its dredged basin inert,
//     because dredging only cuts water and there was no water under it
//   * a 3,400 m runway was drawn as a flat plane at ONE sampled height, over
//     ground that varies by 42 m along its length
//   * a jetway kept an unscaled coordinate through a world rescale and ended up
//     1.7 km from its own terminal, because nothing related the two
//
// None of these were found by the code that caused them. They were found by
// asking the ground, once, on purpose.
//
// THE CHANGE
//
// A feature no longer states where it is. It states WHAT IT NEEDS, and the land
// answers. "The container port needs 500 m of quay with 8 m of water alongside
// and buildable ground behind it" is a claim that can be checked, can survive
// the world changing size, and can FAIL HONESTLY -- which is the important part.
// If there is nowhere to put something, this reports that and the renderer
// builds nothing, instead of putting a stadium in the sea.
//
// This module knows nothing about THREE, meshes or materials. That is deliberate:
// placement is a question about the world and is tested without a renderer, while
// geometry stays in the renderer where it belongs. The old arrangement fused the
// two, which is why a placement bug could only be found by looking at a picture.
// =============================================================================

import { findSite, findFlattestSite, findQuay, findCorridor } from "./land-use.js";
import { WORLD_SCALE } from "./world-scale.js";

/** Design-space coordinate to world. Manifests are written in the drawn world. */
const w = (v) => v * WORLD_SCALE;

/**
 * THE MANIFEST.
 *
 * `want` is where the thing was drawn -- a preference, not an instruction.
 * `need` is what the ground has to provide. Sizes are BUILT metres and do not
 * scale: a runway is 3,400 m of tarmac on any size of island.
 */
export const FEATURES = [
  {
    id: "airport",
    name: "International Airport",
    want: () => ({ x: w(12100), z: w(-4750) }),
    // No site in this world is flat enough for a runway -- the flattest dry
    // 3.4 km run anywhere varies by 11.3 m. Real airports answer that with
    // earthworks, so this asks for the FLATTEST available and grades a platform.
    need: { kind: "flattest", w: 3600, d: 1200, radius: 2500, step: 150, grade: 200 },
    limit: { range: 60 },   // past this it is a quarry, not a platform
  },
  {
    id: "containerPort",
    name: "Container Terminal",
    want: () => ({ x: w(-5077), z: w(-1846) }),
    need: { kind: "quay", length: 500, minDepth: 8, reach: 180, radius: 1500 },
  },
  {
    id: "railway",
    name: "Coast Railway",
    want: () => ({ x: 0, z: w(-3900) }),
    need: { kind: "corridor", axis: "ew", from: w(-17000), to: w(17000), search: 1800 },
    limit: { onLand: 0.85 },
  },
  {
    id: "golf",
    name: "Golf Links",
    want: () => ({ x: w(-7600), z: w(-5600) }),
    need: { kind: "site", w: 1520, d: 1520, radius: 3000, step: 120 },
  },
  {
    id: "stadium",
    name: "Stadium",
    want: () => ({ x: w(1700), z: w(250) }),
    need: { kind: "site", w: 320, d: 250, radius: 1500, step: 40 },
  },
  {
    id: "station",
    name: "Central Station",
    want: () => ({ x: w(-420), z: w(60) }),
    need: { kind: "site", w: 240, d: 120, radius: 1500, step: 40 },
  },
  {
    id: "cathedral",
    name: "Cathedral",
    want: () => ({ x: w(-100), z: w(-40) }),
    need: { kind: "site", w: 120, d: 60, radius: 1200, step: 40 },
  },
  {
    id: "mast",
    name: "Broadcast Mast",
    want: () => ({ x: w(-1400), z: w(-6300) }),
    // A mast wants height, not flatness -- it is on a hill on purpose.
    need: { kind: "site", w: 40, d: 40, radius: 2000, step: 80 },
  },
  {
    id: "farmWest",
    name: "West Farms",
    want: () => ({ x: w(-16000), z: w(-6100) }),
    need: { kind: "site", w: 2400, d: 2400, radius: 4000, step: 200 },
  },
  {
    id: "farmEast",
    name: "East Farms",
    want: () => ({ x: w(17000), z: w(-5900) }),
    need: { kind: "site", w: 1600, d: 2400, radius: 4000, step: 200 },
  },
];

/**
 * Resolve every feature against the land.
 *
 * @returns {{sites: Object, report: Array}}
 *   `sites[id]` is the resolved placement, or absent if it could not be placed.
 *   `report` has one entry per feature, including the failures -- a feature that
 *   cannot be placed is a fact about the world worth being able to see, not
 *   something to swallow.
 */
export function placeFeatures(heightAt) {
  const sites = {};
  const report = [];

  for (const f of FEATURES) {
    const want = f.want();
    let site = null;
    let why = null;

    switch (f.need.kind) {
      case "flattest":
        site = findFlattestSite(heightAt, want, f.need);
        break;
      case "quay":
        site = findQuay(heightAt, want, f.need);
        break;
      case "corridor":
        site = findCorridor(heightAt, want, f.need);
        break;
      default:
        site = findSite(heightAt, want, f.need);
    }

    if (!site) why = "no site satisfies the requirement";

    // Limits are separate from the search on purpose. The search finds the best
    // available; the limit decides whether the best available is good enough.
    // Folding them together would lose the distinction between "nowhere" and
    // "nowhere good", and those want different answers.
    if (site && f.limit) {
      if (f.limit.range !== undefined && site.range > f.limit.range) {
        why = `needs ${site.range.toFixed(0)} m of earthworks, limit ${f.limit.range} m`;
        site = null;
      }
      if (site && f.limit.onLand !== undefined && site.onLand < f.limit.onLand) {
        why = `only ${(100 * site.onLand).toFixed(0)}% on land, needs ${100 * f.limit.onLand}%`;
        site = null;
      }
    }

    if (site) sites[f.id] = site;
    report.push({
      id: f.id,
      name: f.name,
      placed: !!site,
      moved: site ? Math.round(site.moved || 0) : null,
      why,
    });
  }

  return { sites, report };
}
