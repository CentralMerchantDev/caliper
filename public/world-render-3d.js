// CALIPER world renderer, v4 (FOUNDATION.md item 1): draws whatever is in
// world.placements, using world.objectTypes -- it never names an individual
// object type. Same design language (warm paper, ink, the accent) and the
// same public contract as before -- constructor(canvas, {reducedMotion}),
// pushTick(world), draw(t), destroy(), plus the .nextWorld/.reducedMotion
// instance fields the visual-check harness pokes directly -- so callers
// needed zero changes beyond what they already have.
//
// Vendored, not CDN-loaded: this is a real deployed demo, not a sandboxed
// snippet, and a live show-and-tell shouldn't depend on a third-party CDN
// being up. three.js core + the handful of addons used here live under
// ./vendor/three/, resolved through the import map in index.html/world.html.
//
// Sim logic is untouched -- this file only ever reads world JSON
// (tick/money/sims[].needs/lastAction/home, buildings[], placements[],
// objectTypes, surfaces), the same shape src/simBaseline.ts's tick()
// returns. What to draw comes entirely from world.placements + the type
// registry in world.objectTypes, read at runtime -- adding a placement of
// an EXISTING type, or a whole new registry entry (a geometry recipe built
// from the primitive shapes _buildFromRecipe already knows how to draw:
// box, cylinder, sphere, icosahedron), needs zero changes to this file.
// The 2D renderer (./world-render.js) is this file's WebGL-unavailable
// fallback, reading the exact same placements/objectTypes data.
import * as THREE from "three";
import { RoomEnvironment } from "./vendor/three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "./vendor/three/addons/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "./vendor/three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "./vendor/three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./vendor/three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "./vendor/three/addons/postprocessing/ShaderPass.js";
import { VignetteShader } from "./vendor/three/addons/shaders/VignetteShader.js";
import { OutputPass } from "./vendor/three/addons/postprocessing/OutputPass.js";
import { WorldRenderer as WorldRenderer2D } from "./world-render.js";

// A dwelling's own interior footprint -- close to the old single room's
// 11x7.5, shrunk slightly so two of them plus a path fit on one grid axis.
// FOUNDATION.md item 4: every building is open-topped and built from the
// same shell now, dwelling-sized or smaller (BUILDING_TYPE_SCALE below).
// Exported (SHIP.md item 3): test/placementLayout.test.ts computes the same
// world-space building/prop rects this file does, from these same
// constants, to check every outdoor placement's plot position against
// every real building footprint -- no separate, driftable copy of the
// geometry.
export const BUILDING_W = 8.5;
export const BUILDING_D = 6.0;
// FOUNDATION.md item 4: "every building open-topped in the same way." All
// four building types share one shell constructor now; this is the only
// per-type difference left -- footprint scale, not roof-or-not.
export const BUILDING_TYPE_SCALE = {
  dwelling: { w: 1, d: 1 },
  shop: { w: 0.55, d: 0.7 },
  workshop: { w: 0.55, d: 0.7 },
};
// Half-spacing between plot steps (plots are 0/2 today; the formula below
// is generic over whatever plot values the real world data contains).
export const GRID_UNIT_X = 6.0;
export const GRID_UNIT_Z = 4.5;

// CITY.md item 2: "everything currently sits in the top third of the
// range, which is why it looks washed out." Floor/wall/ground darkened
// ~24% from the UPGRADE.md values (path only ~16%, so it still reads as
// lighter than the ground either side of it) -- contrast comes from
// letting the point lights below create brightness against these,
// instead of starting everything pre-lit.
// Fallbacks only, used when a world state predates a given surface (an
// in-flight run resumed across a deploy) -- surfaceColor() below always
// prefers the real data. Everything else that used to live in a bigger
// PALETTE (furniture woods, fabrics, metals...) is now inline in each
// object type's own recipe in src/simBaseline.ts, since that data is what
// actually needs to be addressable and editable, not a renderer constant.
const PALETTE = {
  floor: 0x9c7a52,
  wall: 0xb8ad93,
  ground: 0x6f6656,
  path: 0xbfb49c,
  trimShop: 0x9a5a3c,
  trimWorkshop: 0x5c6b5a,
  woodDark: 0x6a4526, // sign posts only -- a structural neutral, not tied to any surface
  accent: 0xb0560c, // sim 1
  sim2: 0x3d6b63, // sim 2 -- deliberately not the same hue as any registry colour, so a sim never reads as camouflaged against its own furniture
};

// FINAL.md item 4 / FOUNDATION.md item 1: surfaces are real, addressable
// world data (world.surfaces, src/simBaseline.ts's initialWorld()) -- this
// reads straight from it instead of a renderer constant owning the only
// copy. Falls back to PALETTE only for a world state that predates a given
// key, never silently on a genuinely present-but-different value.
function surfaceColor(surfaces, key, fallback) {
  const c = surfaces && surfaces[key] && surfaces[key].color;
  return c || fallback;
}

// FOUNDATION.md item 1: which registry type provides a given sim action --
// derived from world.objectTypes at runtime (every type with a `station`
// whose action matches), never a static imported list. A sim with no
// matching action (idle) stands at a fixed centre point local to its
// building; there is no "idle station" object to place there.
const IDLE_LOCAL = { x: 0.5, y: 0.5 };
function stationTypeFor(action, objectTypes) {
  for (const key in objectTypes) {
    const t = objectTypes[key];
    if (t.station && t.station.action === action) return t;
  }
  return null;
}
function localForAction(action, objectTypes) {
  const t = stationTypeFor(action, objectTypes);
  return t && t.local ? t.local : IDLE_LOCAL;
}

// A grid plot {x,y} (whatever units the real world data uses) -> world (x,z).
// Recentres the whole neighbourhood around the origin regardless of the
// actual plot values, so the layout stays centred even if a future world
// adds a building at a plot this file has never seen.
function plotToWorldXZ(plot, centerX, centerZ) {
  return { x: (plot.x - centerX) * GRID_UNIT_X, z: (plot.y - centerZ) * GRID_UNIT_Z };
}

// A station's 0..1 local layout -> local (x,z) within its own building's
// footprint (footprint size passed in -- dwellings and shop/workshop no
// longer share one fixed size, FOUNDATION.md item 4).
function stationLocalXZ(local, w, d) {
  return { x: (local.x - 0.5) * w, z: (local.y - 0.5) * d };
}

// A sim's stand position is offset from its station's centre, toward the
// building's middle -- standing exactly AT a station's centre (fine in the
// old top-down 2D view) puts a character behind tall furniture like the
// fridge or shower stall in this 3D one, hiding it from the camera entirely.
const STAND_OFFSET = {
  sleep: { x: 0.07, y: 0.1 },
  eat: { x: -0.09, y: 0.09 },
  shower: { x: -0.09, y: -0.09 },
  work: { x: 0.05, y: -0.09 },
  play: { x: 0, y: 0 },
  call: { x: 0.07, y: 0 },
  idle: { x: 0, y: 0 },
};
function standLocalXZ(action, objectTypes, w, d) {
  const local = localForAction(action, objectTypes);
  const off = STAND_OFFSET[action] || STAND_OFFSET.idle;
  return { x: (local.x + off.x - 0.5) * w, z: (local.y + off.y - 0.5) * d };
}

// Sun elevation/azimuth/colour across the 24h clock. FINAL.md item 6:
// "transitions between times of day must be smooth and continuous, never
// stepped." At the old fast tick rate a hard isDay boolean's snap at
// exactly hour 6/20 resolved within about a second, unnoticeable -- at the
// new, much longer tick length it read as a visible pop at every sunrise
// and sunset. dayAmt replaces that boolean with a continuous 1 (full day)
// -> 0 (full night) ramp spread across a 2-hour twilight window straddling
// each threshold; every place that used to branch on isDay now blends by
// dayAmt instead, so nothing in the draw loop below steps.
function sunFor(hour) {
  const rampHalf = 1; // hours of twilight ramp on each side of dawn (6) and dusk (20)
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const dawnRamp = clamp01((hour - 6 + rampHalf) / (2 * rampHalf));
  const duskRamp = clamp01((20 - hour + rampHalf) / (2 * rampHalf));
  const dayAmt = Math.min(dawnRamp, duskRamp);
  const isDay = dayAmt >= 0.5; // kept for any caller that only ever wanted a simple boolean
  const dayFrac = Math.min(1, Math.max(0, ((hour - 6 + 24) % 24) / 14));
  const dayElevation = Math.sin(dayFrac * Math.PI) * 1.05 + 0.05;
  const elevation = lerp(0.03, dayElevation, dayAmt);
  const azimuth = (((hour - 6 + 24) % 24) / 24) * Math.PI * 2;
  const dayWarmth = hour < 9 ? (hour - 6) / 3 : hour < 17 ? 1 : 1 - (hour - 17) / 3;
  const warmth = Math.max(0, dayWarmth) * dayAmt;
  return { isDay, dayAmt, elevation, azimuth, warmth };
}

const SUN_COLOR_WARM = new THREE.Color(0xff9d5c);
const SUN_COLOR_DAY = new THREE.Color(0xfff4e0);
const SUN_COLOR_NIGHT = new THREE.Color(0x5b6ea8);
const SKY_DAY = new THREE.Color(0xf3ead6);
const SKY_DUSK = new THREE.Color(0xe7c9a0);
const SKY_NIGHT = new THREE.Color(0x2b3350);
const SKY_HORIZON = new THREE.Color(0xfdf3df);

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Every material goes through here so the room environment's IBL
// contribution stays tame by default everywhere.
function stdMat(opts) {
  return new THREE.MeshStandardMaterial({ envMapIntensity: 0.15, ...opts });
}

/** A vertical two-stop gradient, redrawn in place every frame as the sky
 * colours shift with the clock -- cheap (a handful of pixels) and it's what
 * turns a flat single-colour background into an actual sense of a horizon.
 * LAST.md item 5: "the 3d and graphics are still kind of weak" -- a flat
 * background behind a fixed 3/4 shot with a lot of open sky was a big part
 * of why the scene read as plain no matter how the ground-level materials
 * varied. */
function makeSkyGradientTexture() {
  const w = 4, h = 128;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { canvas: c, ctx: c.getContext("2d"), tex };
}

function updateSkyGradient(sky, topColor, horizonColor) {
  const { canvas, ctx, tex } = sky;
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, `#${topColor.getHexString()}`);
  g.addColorStop(1, `#${horizonColor.getHexString()}`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  tex.needsUpdate = true;
}

/** A soft radial-gradient disc, reused (scaled per-instance) as a cheap
 * stand-in for ambient occlusion at every object-ground contact point. */
function makeContactShadowTexture() {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(20,14,8,0.55)");
  g.addColorStop(0.7, "rgba(20,14,8,0.22)");
  g.addColorStop(1, "rgba(20,14,8,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.premultiplyAlpha = true;
  return tex;
}

class Renderer3D {
  constructor(canvas, { reducedMotion = false } = {}) {
    this.canvas = canvas;
    this.reducedMotion = reducedMotion;
    this.prevWorld = null;
    this.nextWorld = null;
    this._simMeshes = [];
    this._buildingGroupsById = {};
    this._buildingsById = {};
    this._buildingScaleById = {};
    this._objectTypes = {};
    // Materials that ramp brighter at night (a light source's own bulb, an
    // object type's recipe part flagged emissiveAnimated -- FOUNDATION.md
    // item 1) -- tracked generically instead of hunting the scene graph
    // for a hardcoded "lampBulb" userData key by name.
    this._emissiveAnimated = [];
    this._neighbourhoodBuilt = false;
    this._disposed = false;

    this._initScene();
    this._orbit = { base: 0.62, delta: 0, dragging: false, startX: 0, startDelta: 0 };
    this._bindOrbitControls();

    this._resize();
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(canvas);
  }

  _initScene() {
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: "high-performance" });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85; // overwritten every draw() call; matches the new day-end value for the first frame before that runs
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this._skyGradient = makeSkyGradientTexture();
    updateSkyGradient(this._skyGradient, SKY_DAY, SKY_DAY);
    scene.background = this._skyGradient.tex;
    this.scene = scene;

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 90);
    this.camera = camera;
    this._lookAt = new THREE.Vector3(0, 0.9, 0);

    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 46;
    sun.shadow.bias = -0.0018;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);
    scene.add(sun.target);
    this.sun = sun;

    const hemi = new THREE.HemisphereLight(0xf6ecd8, 0x3a3226, 0.3);
    scene.add(hemi);
    this.hemi = hemi;

    // CITY.md item 2: real point lights, one per lamp post and one per
    // dwelling (standing in for light spilling from inside, since the
    // world doesn't model windows as distinct objects to attach one to).
    // None cast shadows -- the sun already does, and a handful of
    // shadow-casting point lights on top of it is real GPU cost this
    // scene doesn't need for what it buys visually. Populated once the
    // neighbourhood itself is built (_buildNeighbourhoodIfNeeded), since
    // building/outdoor-object positions aren't known until then.
    this._pointLights = [];

    this._contactTex = makeContactShadowTexture();

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.12, 0.3, 0.96);
    composer.addPass(bloom);
    this._bloom = bloom;
    const vignette = new ShaderPass(VignetteShader);
    vignette.uniforms.offset.value = 0.92;
    vignette.uniforms.darkness.value = 1.05;
    composer.addPass(vignette);
    composer.addPass(new OutputPass());
    this.composer = composer;

    this.neighbourhoodGroup = new THREE.Group();
    scene.add(this.neighbourhoodGroup);
  }

  _contactShadow(w, d, parent, y = 0.006) {
    const geo = new THREE.PlaneGeometry(w, d);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ map: this._contactTex, transparent: true, depthWrite: false, blending: THREE.MultiplyBlending, premultipliedAlpha: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = y;
    parent.add(mesh);
    return mesh;
  }

  /** Reads world.buildings/placements/objectTypes the first time real world
   * data arrives and builds the whole neighbourhood from it. Only ever runs
   * once per world shape -- the layout is static for a given source (a
   * shipped change reloads the page via bootWorld(), which constructs a
   * fresh renderer anyway). FOUNDATION.md item 1: this method and
   * everything it calls draws from world.placements + world.objectTypes
   * generically -- it never names an individual placement or type. */
  _buildNeighbourhoodIfNeeded(world) {
    if (this._neighbourhoodBuilt) return;
    const buildings = world.buildings || [];
    const placements = world.placements || [];
    this._surfaces = world.surfaces || {};
    this._objectTypes = world.objectTypes || {};
    if (buildings.length === 0) return; // nothing to build yet

    const scaleFor = (type) => BUILDING_TYPE_SCALE[type] || BUILDING_TYPE_SCALE.dwelling;

    const xs = buildings.map((b) => b.plot.x), ys = buildings.map((b) => b.plot.y);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerZ = (Math.min(...ys) + Math.max(...ys)) / 2;
    this._plotCenter = { x: centerX, z: centerZ };

    this._buildGround(buildings, centerX, centerZ, scaleFor);

    for (const b of buildings) {
      const pos = plotToWorldXZ(b.plot, centerX, centerZ);
      const group = new THREE.Group();
      group.position.set(pos.x, 0, pos.z);
      this.neighbourhoodGroup.add(group);
      this._buildingGroupsById[b.id] = group;
      this._buildingsById[b.id] = b;
      const scale = scaleFor(b.type);
      this._buildingScaleById[b.id] = scale;
      this._buildBuildingShell(group, b, scale.w * BUILDING_W, scale.d * BUILDING_D);
    }

    for (const p of placements) {
      const typeDef = this._objectTypes[p.type];
      if (!typeDef) continue; // a placement naming an unknown type -- nothing to draw, not a crash
      if (p.location === "outdoors") {
        const pos = plotToWorldXZ(p.plot, centerX, centerZ);
        this._buildPlacementInstance(typeDef, p, this.neighbourhoodGroup, pos.x, pos.z);
      } else {
        const home = this._buildingGroupsById[p.location];
        const scale = this._buildingScaleById[p.location];
        if (!home || !scale || !typeDef.local) continue; // a station-shaped placement with nowhere to stand -- skip, don't throw
        const local = stationLocalXZ(typeDef.local, scale.w * BUILDING_W, scale.d * BUILDING_D);
        this._buildPlacementInstance(typeDef, p, home, local.x, local.z);
      }
    }

    this._neighbourhoodBuilt = true;
    this._fitCamera(buildings, centerX, centerZ, scaleFor);
  }

  _fitCamera(buildings, centerX, centerZ, scaleFor) {
    const xs = buildings.map((b) => Math.abs((b.plot.x - centerX) * GRID_UNIT_X) + (scaleFor(b.type).w * BUILDING_W) / 2);
    const zs = buildings.map((b) => Math.abs((b.plot.y - centerZ) * GRID_UNIT_Z) + (scaleFor(b.type).d * BUILDING_D) / 2);
    const halfW = Math.max(...xs, BUILDING_W / 2);
    const halfD = Math.max(...zs, BUILDING_D / 2);
    const radius = Math.sqrt(halfW * halfW + halfD * halfD);
    this._camDist = radius * 1.7 + 6;
    this._camH = radius * 0.95 + 3;
    this.sun.shadow.camera.left = -(halfW + 3);
    this.sun.shadow.camera.right = halfW + 3;
    this.sun.shadow.camera.top = halfD + 3;
    this.sun.shadow.camera.bottom = -(halfD + 3);
  }

  _buildGround(buildings, centerX, centerZ, scaleFor) {
    const xs = buildings.map((b) => Math.abs((b.plot.x - centerX) * GRID_UNIT_X) + (scaleFor(b.type).w * BUILDING_W) / 2);
    const zs = buildings.map((b) => Math.abs((b.plot.y - centerZ) * GRID_UNIT_Z) + (scaleFor(b.type).d * BUILDING_D) / 2);
    const groundW = Math.max(...xs) * 2 + 5;
    const groundD = Math.max(...zs) * 2 + 5;
    const ground = new THREE.Mesh(
      new RoundedBoxGeometry(groundW, 0.25, groundD, 3, 0.15),
      stdMat({ color: surfaceColor(this._surfaces, "ground", PALETTE.ground), roughness: 0.95, metalness: 0.0 }),
    );
    ground.position.y = -0.2;
    ground.receiveShadow = true;
    this.neighbourhoodGroup.add(ground);
    this._groundExtent = { w: groundW, d: groundD };

    // Simple cross-shaped path through the central plaza, connecting every
    // building's side of the grid -- not routed building-to-building
    // individually (that's real pathfinding for a later run), just an
    // honest "there is open, walkable ground here" cue.
    const pathMat = stdMat({ color: surfaceColor(this._surfaces, "path", PALETTE.path), roughness: 0.9 });
    const pathNS = new THREE.Mesh(new THREE.PlaneGeometry(2.4, groundD - 1), pathMat);
    pathNS.rotation.x = -Math.PI / 2;
    pathNS.position.y = -0.06;
    pathNS.receiveShadow = true;
    this.neighbourhoodGroup.add(pathNS);
    const pathEW = new THREE.Mesh(new THREE.PlaneGeometry(groundW - 1, 2.4), pathMat);
    pathEW.rotation.x = -Math.PI / 2;
    pathEW.position.y = -0.06;
    pathEW.receiveShadow = true;
    this.neighbourhoodGroup.add(pathEW);
  }

  /** FOUNDATION.md item 4: one shell, every building type, open-topped --
   * floor and two walls (back + left), no roof, whatever the building's
   * own footprint size is. "Two of four buildings were open-topped and two
   * were not -- it reads as a bug because it is one." A shop and a
   * workshop used to be a sealed box with a roof plane; now they are built
   * exactly like a dwelling, just smaller, so the whole neighbourhood
   * reads as one consistent build view. */
  _buildBuildingShell(group, building, w, d) {
    const floor = new THREE.Mesh(
      new RoundedBoxGeometry(w, 0.3, d, 3, 0.12),
      stdMat({ color: surfaceColor(this._surfaces, "floor", PALETTE.floor), roughness: 0.86, metalness: 0.02 }),
    );
    floor.position.y = -0.15;
    floor.receiveShadow = true;
    group.add(floor);

    const wallMat = stdMat({ color: surfaceColor(this._surfaces, "wall", PALETTE.wall), roughness: 0.92, metalness: 0.0 });
    const backWall = new THREE.Mesh(new RoundedBoxGeometry(w, 2.3, 0.14, 2, 0.05), wallMat);
    backWall.position.set(0, 1.0, -d / 2);
    backWall.receiveShadow = true;
    group.add(backWall);
    const leftWall = new THREE.Mesh(new RoundedBoxGeometry(0.14, 2.3, d, 2, 0.05), wallMat);
    leftWall.position.set(-w / 2, 1.0, 0);
    leftWall.receiveShadow = true;
    group.add(leftWall);

    // Trim colour distinguishes shop/workshop from across the plot even
    // with no interior happening yet; dwellings get a plain wood-tone sign
    // (there's no per-dwelling accent in world.surfaces, and none is
    // needed -- the two houses are already told apart by their sims).
    const trimKey = building.type === "workshop" ? "trimWorkshop" : building.type === "shop" ? "trimShop" : null;
    const trimColor = trimKey ? surfaceColor(this._surfaces, trimKey, PALETTE[trimKey]) : 0x8a5a34;
    this._buildSignPost(group, building.label, w / 2 + 0.3, d / 2 - 0.3, trimColor);

    // Every building gets one interior light now (FOUNDATION.md item 4:
    // shop/workshop are no longer dark boxes with nothing lighting them at
    // night, now that they're open-topped like everything else), scaled to
    // its own footprint.
    const interiorLight = new THREE.PointLight(0xffb066, 0.25, w * 0.9, 2);
    interiorLight.position.set(0, 1.9, 0);
    interiorLight.userData.baseIntensity = 0.25;
    group.add(interiorLight);
    this._pointLights.push(interiorLight);
  }

  _buildSignPost(group, label, x, z, plankColor) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 8), stdMat({ color: PALETTE.woodDark, roughness: 0.7 }));
    post.position.set(x, 0.45, z);
    post.castShadow = true;
    group.add(post);
    const plank = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.22, 0.04, 1, 0.03), stdMat({ color: plankColor, roughness: 0.6 }));
    plank.position.set(x, 0.78, z);
    plank.castShadow = true;
    group.add(plank);
  }

  /** One shape primitive from a recipe part -- box, cylinder, sphere, or
   * icosahedron, the same small set every object type in the registry is
   * built from (FOUNDATION.md item 1: "geometry recipe from primitives").
   * Adding a new object type never needs a new case here as long as its
   * recipe uses these four; it only needs a new registry entry. */
  _geometryForPart(part) {
    switch (part.shape) {
      case "box": {
        const [w, h, d] = part.size;
        const r = part.radius ?? Math.min(0.08, Math.min(w, h, d) * 0.2);
        return new RoundedBoxGeometry(w, h, d, 2, r);
      }
      case "cylinder": {
        const [rt, rb, h] = part.size;
        return new THREE.CylinderGeometry(rt, rb, h, part.segments || 12);
      }
      case "sphere": {
        const [r] = part.size;
        const [ws, hs] = Array.isArray(part.segments) ? part.segments : [part.segments || 12, part.segments || 10];
        return new THREE.SphereGeometry(r, ws, hs);
      }
      case "icosahedron": {
        const [r, detail] = part.size;
        return new THREE.IcosahedronGeometry(r, detail || 0);
      }
      default:
        return new THREE.BoxGeometry(0.2, 0.2, 0.2); // an unknown shape name -- draw SOMETHING rather than throw, so one bad recipe part doesn't blank the whole scene
    }
  }

  /** Builds one placement (a station inside a building, or an outdoor prop)
   * from its type's recipe -- the one function every object in the world
   * is drawn through now, regardless of type. `parent` is already
   * positioned at the building's origin (or the neighbourhood root for
   * outdoors); localX/localZ is this placement's own position within it. */
  _buildPlacementInstance(typeDef, placement, parent, localX, localZ) {
    const group = new THREE.Group();
    group.position.set(localX, 0, localZ);
    parent.add(group);

    const shadow = typeDef.shadow || { w: 1.2, d: 0.9 };
    this._contactShadow(shadow.w, shadow.d, group);

    const overrideColor = placement.overrides && placement.overrides.color;
    for (const part of typeDef.recipe || []) {
      const geo = this._geometryForPart(part);
      // A colour override recolours the object's own material parts (wood,
      // fabric, ceramic...) but not fixed metal fixtures or a light's own
      // emissive glow -- "make the benches blue" should not turn a fridge's
      // steel handle blue, or a lamp's bulb any colour but its own light.
      const recolorable = overrideColor && !(part.metalness >= 0.3) && !part.emissive;
      const mat = stdMat({
        color: recolorable ? overrideColor : part.color,
        roughness: part.roughness ?? 0.7,
        metalness: part.metalness ?? 0,
        emissive: part.emissive,
        emissiveIntensity: part.emissiveIntensity,
        transparent: part.transparent,
        opacity: part.opacity,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...(part.position || [0, 0, 0]));
      if (part.rotation) mesh.rotation.set(...part.rotation);
      if (part.scale) mesh.scale.set(...part.scale);
      mesh.castShadow = part.castShadow !== false;
      mesh.receiveShadow = true;
      group.add(mesh);
      if (part.emissiveAnimated) this._emissiveAnimated.push(mesh.material);
    }

    if (typeDef.light) {
      const l = typeDef.light;
      const light = new THREE.PointLight(l.color, l.baseIntensity, l.distance, l.decay);
      light.position.set(...(l.position || [0, 1, 0]));
      light.userData.baseIntensity = l.baseIntensity;
      light.userData.isStreetLamp = !!l.isStreetLamp;
      group.add(light);
      this._pointLights.push(light);
    }
  }

  _bindOrbitControls() {
    const canvas = this.canvas;
    const onDown = (e) => {
      this._orbit.dragging = true;
      this._orbit.startX = e.clientX;
      this._orbit.startDelta = this._orbit.delta;
    };
    const onMove = (e) => {
      if (!this._orbit.dragging) return;
      const dx = (e.clientX - this._orbit.startX) / Math.max(1, canvas.clientWidth);
      this._orbit.delta = Math.max(-0.45, Math.min(0.45, this._orbit.startDelta + dx * 1.6));
    };
    const onUp = () => {
      this._orbit.dragging = false;
    };
    canvas.style.touchAction = "pan-y";
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    this._unbindOrbit = () => {
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }

  _resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this._bloom.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // _fitCamera's camDist/camH are tuned once against the scene radius,
    // not the container shape. Vertical FOV is fixed, so horizontal FOV
    // shrinks with the aspect ratio -- on a narrow mobile container (near
    // square, or taller than wide) that shrunk horizontal FOV crops the
    // neighbourhood's sides that a wider desktop container had room for.
    // Dollying the camera out (same angle, further back) for aspects
    // narrower than the ratio the framing already fits restores the full
    // plot to view without ever tightening the shot on wide screens.
    const REFERENCE_ASPECT = 1.35;
    const aspect = w / h;
    this._cameraFit = aspect < REFERENCE_ASPECT ? REFERENCE_ASPECT / aspect : 1;
  }

  destroy() {
    this._ro.disconnect();
    this._unbindOrbit();
    this.composer.dispose();
    this.renderer.dispose();
    this._disposed = true;
  }

  pushTick(world) {
    this.prevWorld = this.nextWorld ?? world;
    this.nextWorld = world;
  }

  draw(t) {
    if (this._disposed) return;
    const w = this.nextWorld;
    if (!w) return;
    this._buildNeighbourhoodIfNeeded(w);
    if (!this._neighbourhoodBuilt) return; // no buildings yet -- nothing to draw
    if (this.reducedMotion) t = 1;
    const prev = this.prevWorld || w;
    // FINAL.md item 6: interpolated, not snapped to the new tick the
    // instant it lands. sunFor() is continuous in hour (no discrete
    // lookups), so blending prev.tick -> prev.tick+1 by the same t used
    // for sim positions makes the sky/lamps move smoothly across the
    // whole tick instead of jumping once per tick -- the difference that
    // matters once a tick is several seconds long, not sub-second.
    const hour = (prev.tick + t) % 24;
    const sun = sunFor(hour);

    // -- lighting for this hour --
    const dist = Math.max(20, (this._camDist || 14) * 1.4);
    const sx = Math.cos(sun.azimuth) * Math.cos(sun.elevation) * dist;
    const sy = Math.max(0.6, Math.sin(sun.elevation) * dist);
    const sz = Math.sin(sun.azimuth) * Math.cos(sun.elevation) * dist;
    this.sun.position.set(sx, sy, sz);
    this.sun.target.position.set(0, 0.5, 0);
    // FINAL.md item 6: nightAmt now comes from sunFor()'s continuous
    // dayAmt, not a hard isDay boolean -- every lerp below that reads
    // nightAmt (point lights, lamp emissive, exposure, environmentIntensity)
    // was already written to blend smoothly; the only thing that used to
    // make it step was this single line snapping between 0 and 1 exactly
    // at hour 6 and hour 20.
    const nightAmt = 1 - sun.dayAmt;
    // FINAL.md item 5: "too dark both day and at night" -- the previous
    // pass overcorrected chasing the muddy-night note and pulled the day
    // end down with it. Raised both ends together, day more than night, so
    // day is the strongest frame in the cycle again while night keeps the
    // contrast already achieved (below) instead of flattening it out.
    const daySunIntensity = lerp(0.5, 0.95, Math.min(1, sun.elevation));
    this.sun.intensity = lerp(0.08, daySunIntensity, sun.dayAmt);
    const sunColor = sun.warmth >= 1 ? SUN_COLOR_DAY : SUN_COLOR_WARM.clone().lerp(SUN_COLOR_DAY, sun.warmth);
    this.sun.color.copy(SUN_COLOR_NIGHT).lerp(sunColor, sun.dayAmt);
    // Night's ambient floor raised off nearly zero -- "a person should see
    // the whole neighbourhood, with the lamp pools as the warm accents
    // rather than the only light. Not black, not brown." Still well below
    // day, so the point lights below still read as the thing carrying the
    // scene, not the only source of visibility.
    const dayHemi = lerp(0.2, 0.32, Math.min(1, sun.elevation));
    this.hemi.intensity = lerp(0.07, dayHemi, sun.dayAmt);
    // CITY.md item 2/3: "at night the point lights carry the scene and the
    // sun is gone." Street lamps get a stronger night curve than interior
    // lights -- they're the thing meant to read as a warm pool against a
    // dark ground, not just a faint indoor glow.
    for (const light of this._pointLights) {
      const base = light.userData.baseIntensity || 0.3;
      const nightMult = light.userData.isStreetLamp ? 2.6 : 1.3;
      light.intensity = lerp(base * 0.2, base * nightMult, nightAmt);
    }
    // Emissive materials on the light sources themselves: a lamp bulb
    // barely glows in daylight, but reads as a genuinely bright object at
    // night -- not just a pool of light on the ground beneath it. Tracked
    // generically (any recipe part flagged emissiveAnimated, any type) in
    // _emissiveAnimated, not a hunt through the scene graph for one
    // hardcoded object name.
    for (const mat of this._emissiveAnimated) {
      mat.emissiveIntensity = lerp(0.3, 4.5, nightAmt);
    }
    // Exposure raised at both ends (FINAL.md item 5) -- day was
    // underexposed at 0.62, reading dim rather than "clearly daylight,
    // everything legible" for what should be the strongest frame in the
    // cycle. Night rises with it, proportionally, so the day/night
    // difference achieved in the previous pass holds rather than flattens:
    // night is still the darker end, just no longer near-black.
    this.renderer.toneMappingExposure = lerp(0.85, 0.58, nightAmt);
    // The RoomEnvironment IBL contributes a constant ambient floor
    // regardless of sun position. Scene-level environmentIntensity
    // multiplies every material's own envMapIntensity globally. Day raised
    // for a warmer, brighter first impression; night raised further off
    // its near-zero floor so the neighbourhood reads as a whole scene
    // again, not just the lamp-lit patches around each point light.
    this.scene.environmentIntensity = lerp(1.3, 0.18, nightAmt);

    const daySky = SKY_DUSK.clone().lerp(SKY_DAY, sun.warmth);
    const sky = SKY_NIGHT.clone().lerp(daySky, sun.dayAmt);
    // A paler, warmer band near the horizon than directly overhead -- the
    // simple atmospheric-haze cue that turns a flat fill into a sense of
    // distance behind the neighbourhood. Stronger by day (a bright haze
    // line) than by night (still present, just a faint lift off the deep
    // night blue rather than a bright band).
    const horizon = sky.clone().lerp(SKY_HORIZON, lerp(0.35, 0.62, sun.dayAmt));
    updateSkyGradient(this._skyGradient, sky, horizon);

    // -- composed camera: fixed 3/4 shot of the whole plot, small user-driven orbit only --
    const az = this._orbit.base + this._orbit.delta;
    const fit = this._cameraFit || 1;
    const camDist = (this._camDist || 14) * fit, camH = (this._camH || 8) * fit;
    this.camera.position.set(Math.sin(az) * camDist, camH, Math.cos(az) * camDist);
    this.camera.lookAt(this._lookAt);

    // -- sims: interpolate between stations within their own home building --
    const sims = w.sims || [];
    sims.forEach((sim, i) => {
      const home = this._buildingsById[sim.home];
      const homeScale = this._buildingScaleById[sim.home];
      if (!home || !homeScale) return; // sim has no known home building yet -- nothing to place
      const buildingPos = plotToWorldXZ(home.plot, this._plotCenter.x, this._plotCenter.z);
      const prevSim = (prev.sims || [])[i] || sim;
      const bw = homeScale.w * BUILDING_W, bd = homeScale.d * BUILDING_D;
      const fromLocal = standLocalXZ(prevSim.lastAction || "idle", this._objectTypes, bw, bd);
      const toLocal = standLocalXZ(sim.lastAction || "idle", this._objectTypes, bw, bd);
      let mesh = this._simMeshes[i];
      if (!mesh) mesh = this._simMeshes[i] = this._buildSim(i);
      mesh.position.x = buildingPos.x + lerp(fromLocal.x, toLocal.x, t);
      mesh.position.z = buildingPos.z + lerp(fromLocal.z, toLocal.z, t);
      const bob = this.reducedMotion ? 0 : Math.sin(t * Math.PI) * 0.05;
      mesh.position.y = bob;
      const criticalNeed = sim.needs && Object.entries(sim.needs).find(([, v]) => v < 30);
      mesh.userData.ring.visible = !!criticalNeed;
      if (criticalNeed && !this.reducedMotion) {
        const pulse = 1 + Math.sin(performance.now() / 260) * 0.06;
        mesh.userData.ring.scale.set(pulse, 1, pulse);
      }
    });

    this.composer.render();
  }

  _buildSim(index) {
    // Sized up ~1.8x from the single-room version, verified empirically:
    // placed an oversized bright-red marker at a sim's exact computed
    // world position and confirmed the position math was already correct
    // (it showed up exactly at the desk, right where "work" should put
    // it) -- the capsule itself was just too small to read once the camera
    // pulled back roughly 2.9x further to frame the whole neighbourhood
    // instead of one room. Legibility of "there is a person here" wins
    // over strict human-scale proportion at this zoomed-out a shot.
    const color = index === 0 ? PALETTE.accent : PALETTE.sim2;
    const group = new THREE.Group();
    const mat = stdMat({ color, roughness: 0.55, metalness: 0.05 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.29, 0.5, 4, 10), mat);
    body.position.y = 0.58;
    body.castShadow = true;
    group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), mat);
    head.position.y = 1.15;
    head.castShadow = true;
    group.add(head);
    this._contactShadow(1.4, 1.4, group, 0.008);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.58, 0.72, 32),
      new THREE.MeshBasicMaterial({ color: PALETTE.accent, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    ring.visible = false;
    group.add(ring);
    group.userData.ring = ring;
    this.neighbourhoodGroup.add(group);
    return group;
  }
}

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}

/** Public entry point: real 3D when WebGL is available, the existing 2D
 * plan-view renderer otherwise. Same constructor/pushTick/draw/destroy
 * contract either way, so callers never branch on which one they got. */
export class WorldRenderer {
  constructor(canvas, opts = {}) {
    this._impl = webglAvailable() ? new Renderer3D(canvas, opts) : new WorldRenderer2D(canvas, opts);
  }
  pushTick(world) {
    this._impl.pushTick(world);
  }
  draw(t) {
    this._impl.draw(t);
  }
  destroy() {
    this._impl.destroy();
  }
  get nextWorld() {
    return this._impl.nextWorld;
  }
  get reducedMotion() {
    return this._impl.reducedMotion;
  }
  set reducedMotion(v) {
    this._impl.reducedMotion = v;
  }
}
