// =============================================================================
// THE LIVE QUARTER
//
// This is the only place the city and the change pipeline meet, and it exists
// because without it the site tells a lie by omission.
//
// The city is forty kilometres of procedural coastline. The world the pipeline
// edits is a four-building hamlet on a twelve-by-nine metre parcel. Those are
// two different things, and a visitor who asks for a change, is told "shipped",
// and then looks at the city would see nothing -- because the change landed in
// a world the city never drew. A system whose whole claim is that it only says
// yes when yes is true cannot have that seam in it.
//
// So the hamlet is a REAL PLACE in the city. Cormorant Key, out at the western
// end of the chain. Every building, prop and colour drawn here comes from the
// live world data served by /world-source -- nothing on this island is invented
// by the renderer. Ship a change and it appears here, at true metres, in the
// same world you were already flying over.
//
// Two things this deliberately does NOT do:
//
//   1. It does not rebuild either renderer. world-render-3d.js remains the
//      app's close-up renderer and is untouched; this is a second, much
//      smaller view of the same data at city scale.
//   2. It does not silently substitute the baseline. If /world-source cannot
//      be reached it falls back to the baked file and reports stale:true, so
//      the caller can say so out loud. Quietly drawing yesterday's world under
//      today's label is the precise failure this project refuses.
// =============================================================================

// terrain.js exports makeHeightAt(field), NOT a bare heightAt -- importing the
// latter is a module-level error that takes the WHOLE PAGE down, which is what
// it was doing. The city renderer already builds one and returns it on its api
// object, so the fix is to use that rather than construct a second LandField
// (a spatial hash over 40 km) for one small island.

/** Where the pipeline's world physically is. Cormorant Key's centroid. */
export const QUARTER = {
  id: "live-quarter",
  name: "Cormorant Island",
  // The archipelago rebuild renamed and reshaped this island; the old id
  // "cormorant-key" no longer exists and the old anchor would have put the
  // hamlet in open water. Taken from the current polygon's centroid.
  landmass: "cormorant-isle",
  // Centroid of the cormorant-isle polygon in city-plan.js -- a 6 km2 island,
  // so a 12 x 9 m hamlet sits well inside it with no clearance question.
  x: -13605,
  z: -245,
  // The parcel runs 0..2 in plot units; world-render-3d.js's GRID_UNIT_X/Z are
  // 6.0 and 4.5 metres. Same numbers here so the two renderers agree about how
  // big the place is. If these ever drift, the same world is two sizes.
  unitX: 6.0,
  unitZ: 4.5,
};

/** BUILDING_TYPE_SCALE x BUILDING_W/D from world-render-3d.js, in metres. */
const BUILDING_W = 8.5;
const BUILDING_D = 6.0;
const TYPE_SCALE = {
  dwelling: { w: 1.0, d: 1.0, h: 6.5 },
  shop: { w: 1.15, d: 1.0, h: 7.5 },
  workshop: { w: 1.1, d: 1.15, h: 6.0 },
};

/**
 * Fetch the world the pipeline is actually serving.
 *
 * /world-source is the coordinator's current source: the baseline plus every
 * change that has shipped. sim-baseline.generated.js is the build-time copy and
 * is only correct when nothing has shipped yet, so it is the fallback and the
 * caller is told when it was used.
 */
export async function loadLiveWorld() {
  try {
    const mod = await import(`/world-source?t=${Date.now()}`);
    return { world: mod.initialWorld(), stale: false, source: "/world-source" };
  } catch (err) {
    console.warn("[live-quarter] /world-source unavailable, drawing the baked baseline:", err);
    const mod = await import("./sim-baseline.generated.js");
    return { world: mod.initialWorld(), stale: true, source: "sim-baseline.generated.js", error: String(err) };
  }
}

const hex = (s, fallback) => {
  // Surface colours are visitor-editable data, so they are not trusted to be
  // well formed. A bad colour must not take the island's geometry down with it.
  if (typeof s !== "string") return fallback;
  const m = /^#?([0-9a-fA-F]{6})$/.exec(s.trim());
  return m ? parseInt(m[1], 16) : fallback;
};

/**
 * Draw the live world onto its island.
 *
 * Returns a summary of what was drawn, which the caller can show, and which the
 * verification harness can assert on -- "the renderer drew four buildings and
 * six props" is checkable in a way that "it looked fine" is not.
 */
export function buildLiveQuarter(THREE, scene, world, heightAt) {
  const group = new THREE.Group();
  group.name = "live-quarter";

  const surfaces = world.surfaces || {};
  const ground = hex(surfaces.ground?.color, 0x6f6656);
  const path = hex(surfaces.path?.color, 0xbfb49c);
  const wall = hex(surfaces.wall?.color, 0xb8ad93);
  const trimShop = hex(surfaces.trimShop?.color, 0x9a5a3c);
  const trimWork = hex(surfaces.trimWorkshop?.color, 0x5c6b5a);

  // The parcel's extent in metres, with a margin of garden around it.
  const PW = 2 * QUARTER.unitX + BUILDING_W * 1.2;
  const PD = 2 * QUARTER.unitZ + BUILDING_D * 1.2;
  const baseY = heightAt(QUARTER.x, QUARTER.z);

  // Local origin: plot (0,0) sits at the parcel's north-west corner, so the
  // hamlet is centred on the island rather than hanging off the anchor point.
  const ox = QUARTER.x - PW / 2 + BUILDING_W * 0.6;
  const oz = QUARTER.z - PD / 2 + BUILDING_D * 0.6;
  const at = (plot) => [ox + plot.x * QUARTER.unitX, oz + plot.y * QUARTER.unitZ];

  const mat = (color, roughness = 0.9, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });

  // --- the ground it stands on ---------------------------------------------
  const pad = new THREE.Mesh(new THREE.BoxGeometry(PW + 14, 0.6, PD + 14), mat(ground, 1));
  pad.position.set(QUARTER.x, baseY + 0.3, QUARTER.z);
  pad.receiveShadow = true;
  group.add(pad);

  const lane = new THREE.Mesh(new THREE.BoxGeometry(PW + 2, 0.16, 3.2), mat(path, 1));
  lane.position.set(QUARTER.x, baseY + 0.68, QUARTER.z);
  lane.receiveShadow = true;
  group.add(lane);

  // --- the buildings, exactly as the data lists them ------------------------
  let drawnBuildings = 0;
  for (const b of world.buildings || []) {
    const s = TYPE_SCALE[b.type];
    // An unknown type is drawn as nothing rather than as a guess. The pipeline's
    // own validation rejects unknown types upstream; if one reaches here the
    // honest render is an absence, not an invented box.
    if (!s) continue;
    const [x, z] = at(b.plot);
    const w = s.w * BUILDING_W;
    const d = s.d * BUILDING_D;

    const body = new THREE.Mesh(new THREE.BoxGeometry(w, s.h, d), mat(wall, 0.92));
    body.position.set(x, baseY + 0.6 + s.h / 2, z);
    body.castShadow = body.receiveShadow = true;
    group.add(body);

    // A pitched roof, tinted by the trim surface for the two non-houses so the
    // shop and the workshop are legible from the air as different buildings.
    const roofColor = b.type === "shop" ? trimShop : b.type === "workshop" ? trimWork : 0x7a5c46;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.72, 2.6, 4), mat(roofColor, 0.88));
    roof.position.set(x, baseY + 0.6 + s.h + 1.3, z);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);
    drawnBuildings++;
  }

  // --- the outdoor props ----------------------------------------------------
  const types = world.objectTypes || {};
  let drawnProps = 0;
  for (const p of world.placements || []) {
    if (p.location !== "outdoors" || !p.plot) continue;
    const fp = types[p.type]?.footprint;
    if (!fp) continue;
    const [x, z] = at(p.plot);
    const y = baseY + 0.6;
    let mesh = null;

    if (p.type === "tree") {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 2.4, 6), mat(0x5f452d, 0.95));
      trunk.position.set(x, y + 1.2, z);
      const crown = new THREE.Mesh(new THREE.SphereGeometry(Math.max(fp.w, fp.d) * 0.62, 8, 6), mat(0x4f8a3e, 0.95));
      crown.position.set(x, y + 3.1, z);
      crown.castShadow = true;
      group.add(trunk, crown);
      drawnProps++;
      continue;
    }
    if (p.type === "lampPost") {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 3.4, 6), mat(0x4d545c, 0.6, 0.3));
      post.position.set(x, y + 1.7, z);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xfff2cc, emissive: 0x2a2312 }));
      head.position.set(x, y + 3.5, z);
      group.add(post, head);
      drawnProps++;
      continue;
    }
    if (p.type === "bench") mesh = new THREE.Mesh(new THREE.BoxGeometry(fp.w, 0.45, fp.d), mat(0xa9835a, 0.85));
    else if (p.type === "planter") mesh = new THREE.Mesh(new THREE.BoxGeometry(fp.w, 0.6, fp.d), mat(trimWork, 0.9));
    else mesh = new THREE.Mesh(new THREE.BoxGeometry(fp.w, 0.5, fp.d), mat(path, 0.9));

    mesh.position.set(x, y + 0.3, z);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    drawnProps++;
  }

  scene.add(group);

  return {
    group,
    buildings: drawnBuildings,
    props: drawnProps,
    // The camera target a "fly to the live quarter" view should use. Given here
    // rather than in the viewer so there is one definition of where this is.
    focus: { x: QUARTER.x, y: baseY + 6, z: QUARTER.z },
  };
}
