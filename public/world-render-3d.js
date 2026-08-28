// CALIPER world renderer, v3 (CITY.md item 1): a neighbourhood of buildings
// on a grid instead of a single room. Same design language (warm paper,
// ink, the accent) and the same public contract as before --
// constructor(canvas, {reducedMotion}), pushTick(world), draw(t), destroy(),
// plus the .nextWorld/.reducedMotion instance fields the visual-check
// harness pokes directly -- so callers needed zero changes beyond what
// they already have.
//
// Vendored, not CDN-loaded: this is a real deployed demo, not a sandboxed
// snippet, and a live show-and-tell shouldn't depend on a third-party CDN
// being up. three.js core + the handful of addons used here live under
// ./vendor/three/, resolved through the import map in index.html/world.html.
//
// Sim logic is untouched -- this file only ever reads world JSON
// (tick/money/sims[].needs/lastAction/home, buildings[], outdoorObjects[]),
// the same shape src/simBaseline.ts's tick() returns. What to draw comes
// from the real world.buildings/outdoorObjects arrays read at runtime, not
// a hand-written layout -- a change that adds a fifth building or a new
// outdoor object type draws here without this file needing to know about
// it in advance (new outdoor object TYPES still need a case in
// _buildOutdoorObject, same as a new station type would; the COUNT and
// PLOT LAYOUT of buildings/objects never does). STATIONS (which action
// maps to which piece of dwelling furniture) is imported from the 2D
// renderer so the two files can never silently disagree, and the 2D
// renderer itself becomes this file's WebGL-unavailable fallback.
import * as THREE from "three";
import { RoomEnvironment } from "./vendor/three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "./vendor/three/addons/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "./vendor/three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "./vendor/three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./vendor/three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "./vendor/three/addons/postprocessing/ShaderPass.js";
import { VignetteShader } from "./vendor/three/addons/shaders/VignetteShader.js";
import { OutputPass } from "./vendor/three/addons/postprocessing/OutputPass.js";
import { STATIONS, WorldRenderer as WorldRenderer2D } from "./world-render.js";

// A dwelling's own interior footprint -- close to the old single room's
// 11x7.5, shrunk slightly so two of them plus a path fit on one grid axis.
const BUILDING_W = 8.5;
const BUILDING_D = 6.0;
// Half-spacing between plot steps (plots are 0/2 today; the formula below
// is generic over whatever plot values the real world data contains).
const GRID_UNIT_X = 6.0;
const GRID_UNIT_Z = 4.5;

// CITY.md item 2: "everything currently sits in the top third of the
// range, which is why it looks washed out." Floor/wall/ground darkened
// ~24% from the UPGRADE.md values (path only ~16%, so it still reads as
// lighter than the ground either side of it) -- contrast comes from
// letting the point lights below create brightness against these,
// instead of starting everything pre-lit.
const PALETTE = {
  floor: 0xa79c85,
  wall: 0xa5997e,
  wood: 0x8a5a34,
  woodDark: 0x6a4526,
  metal: 0xcfd2d6,
  fabricBed: 0xd8c9a8,
  fabricRug: 0xc97a3d, // deliberately NOT PALETTE.accent -- sim1 uses that exact colour, and a same-colour sim standing on its own rug read as camouflaged, invisible
  ceramic: 0xf3efe6,
  accent: 0xb0560c, // sim 1
  sim2: 0x3d6b63, // sim 2
  ground: 0x6f6656, // deepened again -- night was reading as one flat brown value, not dark with warm pools
  path: 0xbfb49c,
  roofShop: 0x9a5a3c,
  roofWorkshop: 0x5c6b5a,
  leaf: 0x4f6b47,
};

// FINAL.md item 4: surfaces are real, addressable world data now
// (world.surfaces, src/simBaseline.ts's initialWorld()) -- this reads
// straight from it instead of the PALETTE constants above owning the only
// copy. Falls back to the PALETTE default only for a world state that
// predates this field (an in-flight run resumed across a deploy), never
// silently on a genuinely present-but-different value.
function surfaceColor(surfaces, key, fallback) {
  const c = surfaces && surfaces[key] && surfaces[key].color;
  return c || fallback;
}

function stationFor(action) {
  for (const key in STATIONS) if (STATIONS[key].action === action) return STATIONS[key];
  return STATIONS.center;
}

// A grid plot {x,y} (whatever units the real world data uses) -> world (x,z).
// Recentres the whole neighbourhood around the origin regardless of the
// actual plot values, so the layout stays centred even if a future world
// adds a building at a plot this file has never seen.
function plotToWorldXZ(plot, centerX, centerZ) {
  return { x: (plot.x - centerX) * GRID_UNIT_X, z: (plot.y - centerZ) * GRID_UNIT_Z };
}

// A station's 0..1 layout -> local (x,z) within its own building's footprint.
function stationLocalXZ(s) {
  return { x: (s.x - 0.5) * BUILDING_W, z: (s.y - 0.5) * BUILDING_D };
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
function standLocalXZ(s) {
  const off = STAND_OFFSET[s.action] || STAND_OFFSET.idle;
  return { x: (s.x + off.x - 0.5) * BUILDING_W, z: (s.y + off.y - 0.5) * BUILDING_D };
}

// Sun elevation/azimuth/colour across the 24h clock.
function sunFor(hour) {
  const isDay = hour >= 6 && hour < 20;
  const dayFrac = Math.min(1, Math.max(0, ((hour - 6 + 24) % 24) / 14));
  const elevation = isDay ? Math.sin(dayFrac * Math.PI) * 1.05 + 0.05 : 0.03;
  const azimuth = (((hour - 6 + 24) % 24) / 24) * Math.PI * 2;
  let warmth;
  if (!isDay) warmth = 0;
  else if (hour < 9) warmth = (hour - 6) / 3;
  else if (hour < 17) warmth = 1;
  else warmth = Math.max(0, 1 - (hour - 17) / 3);
  return { isDay, elevation, azimuth, warmth };
}

const SUN_COLOR_WARM = new THREE.Color(0xff9d5c);
const SUN_COLOR_DAY = new THREE.Color(0xfff4e0);
const SUN_COLOR_NIGHT = new THREE.Color(0x5b6ea8);
const SKY_DAY = new THREE.Color(0xf3ead6);
const SKY_DUSK = new THREE.Color(0xe7c9a0);
const SKY_NIGHT = new THREE.Color(0x2b3350);

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Every material goes through here so the room environment's IBL
// contribution stays tame by default everywhere.
function stdMat(opts) {
  return new THREE.MeshStandardMaterial({ envMapIntensity: 0.15, ...opts });
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
    scene.background = SKY_DAY.clone();
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

  /** Reads world.buildings/outdoorObjects the first time real world data
   * arrives and builds the whole neighbourhood from it. Only ever runs
   * once per world shape -- buildings/outdoor objects are static for a
   * given source (a shipped change that adds one would reload the page
   * via bootWorld(), which constructs a fresh renderer anyway). */
  _buildNeighbourhoodIfNeeded(world) {
    if (this._neighbourhoodBuilt) return;
    const buildings = world.buildings || [];
    const outdoorObjects = world.outdoorObjects || [];
    this._surfaces = world.surfaces || {};
    if (buildings.length === 0) return; // nothing to build yet

    const xs = buildings.map((b) => b.plot.x), ys = buildings.map((b) => b.plot.y);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerZ = (Math.min(...ys) + Math.max(...ys)) / 2;
    this._plotCenter = { x: centerX, z: centerZ };

    this._buildGround(buildings, outdoorObjects, centerX, centerZ);

    for (const b of buildings) {
      const pos = plotToWorldXZ(b.plot, centerX, centerZ);
      const group = new THREE.Group();
      group.position.set(pos.x, 0, pos.z);
      this.neighbourhoodGroup.add(group);
      this._buildingGroupsById[b.id] = group;
      this._buildingsById[b.id] = b;
      if (b.type === "dwelling") this._buildDwelling(group, b);
      else this._buildSimpleBuilding(group, b);
    }

    for (const o of outdoorObjects) {
      const pos = plotToWorldXZ(o.plot, centerX, centerZ);
      this._buildOutdoorObject(o, pos);
    }

    this._neighbourhoodBuilt = true;
    this._fitCamera(buildings, centerX, centerZ);
  }

  _fitCamera(buildings, centerX, centerZ) {
    const xs = buildings.map((b) => Math.abs((b.plot.x - centerX) * GRID_UNIT_X) + BUILDING_W / 2);
    const zs = buildings.map((b) => Math.abs((b.plot.y - centerZ) * GRID_UNIT_Z) + BUILDING_D / 2);
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

  _buildGround(buildings, outdoorObjects, centerX, centerZ) {
    const xs = buildings.map((b) => Math.abs((b.plot.x - centerX) * GRID_UNIT_X) + BUILDING_W / 2);
    const zs = buildings.map((b) => Math.abs((b.plot.y - centerZ) * GRID_UNIT_Z) + BUILDING_D / 2);
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

  _buildDwelling(group, building) {
    const floor = new THREE.Mesh(
      new RoundedBoxGeometry(BUILDING_W, 0.3, BUILDING_D, 3, 0.12),
      stdMat({ color: surfaceColor(this._surfaces, "floor", PALETTE.floor), roughness: 0.86, metalness: 0.02 }),
    );
    floor.position.y = -0.15;
    floor.receiveShadow = true;
    group.add(floor);

    const wallMat = stdMat({ color: PALETTE.wall, roughness: 0.92, metalness: 0.0 });
    const backWall = new THREE.Mesh(new RoundedBoxGeometry(BUILDING_W, 2.3, 0.14, 2, 0.05), wallMat);
    backWall.position.set(0, 1.0, -BUILDING_D / 2);
    backWall.receiveShadow = true;
    group.add(backWall);
    const leftWall = new THREE.Mesh(new RoundedBoxGeometry(0.14, 2.3, BUILDING_D, 2, 0.05), wallMat);
    leftWall.position.set(-BUILDING_W / 2, 1.0, 0);
    leftWall.receiveShadow = true;
    group.add(leftWall);

    // A small label plank by the entrance so the building reads as
    // labelled ("House 1"), not just a shape -- matches building.label.
    this._buildSignPost(group, building.label, BUILDING_W / 2 + 0.3, BUILDING_D / 2 - 0.3, PALETTE.wood);

    const interiorLight = new THREE.PointLight(0xffb066, 0.25, BUILDING_W * 0.9, 2);
    interiorLight.position.set(0, 1.9, 0);
    interiorLight.userData.baseIntensity = 0.25;
    group.add(interiorLight);
    this._pointLights.push(interiorLight);

    const stationsToBuild = building.stations && building.stations.length ? building.stations : [];
    for (const key in STATIONS) {
      const s = STATIONS[key];
      if (s.label === null) continue;
      if (!stationsToBuild.includes(key)) continue;
      this._buildStation(group, s);
    }
  }

  /** shop/workshop: a real, drawn structure with no interior stations --
   * honest about that rather than padded out with fake furniture. Smaller
   * enclosed volume with a distinguishing roof colour per type, plus a
   * sign post, so the two read as different buildings from across the
   * plot even though neither has anything happening inside yet. */
  _buildSimpleBuilding(group, building) {
    const w = BUILDING_W * 0.55, d = BUILDING_D * 0.7, h = 1.7;
    const roofColor =
      building.type === "workshop"
        ? surfaceColor(this._surfaces, "roofWorkshop", PALETTE.roofWorkshop)
        : surfaceColor(this._surfaces, "roofShop", PALETTE.roofShop);
    const shell = new THREE.Mesh(
      new RoundedBoxGeometry(w, h, d, 2, 0.08),
      stdMat({ color: PALETTE.wall, roughness: 0.88 }),
    );
    shell.position.y = h / 2;
    shell.castShadow = true;
    shell.receiveShadow = true;
    group.add(shell);
    const roof = new THREE.Mesh(
      new RoundedBoxGeometry(w + 0.35, 0.22, d + 0.35, 2, 0.06),
      stdMat({ color: roofColor, roughness: 0.7 }),
    );
    roof.position.y = h + 0.11;
    roof.castShadow = true;
    group.add(roof);
    this._contactShadow(w + 0.8, d + 0.8, group, 0.006);
    this._buildSignPost(group, building.label, w / 2 + 0.4, d / 2 + 0.5, roofColor);
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

  _buildStation(group, s) {
    const local = stationLocalXZ(s);
    const stGroup = new THREE.Group();
    stGroup.position.set(local.x, 0, local.z);
    group.add(stGroup);

    const shadowSize = { sleep: 2.4, eat: 1.1, shower: 1.6, work: 2.0, play: 2.4, call: 1.4 }[s.action] || 1.2;
    this._contactShadow(shadowSize, shadowSize * 0.75, stGroup);

    const set = (mesh, cast = true) => {
      mesh.castShadow = cast;
      mesh.receiveShadow = true;
      stGroup.add(mesh);
      return mesh;
    };

    switch (s.action) {
      case "sleep": {
        const mattress = new THREE.Mesh(new RoundedBoxGeometry(1.9, 0.32, 1.05, 2, 0.1), stdMat({ color: PALETTE.fabricBed, roughness: 0.85 }));
        mattress.position.y = 0.2;
        set(mattress);
        const headboard = new THREE.Mesh(new RoundedBoxGeometry(1.9, 0.55, 0.1, 2, 0.05), stdMat({ color: PALETTE.wood, roughness: 0.6 }));
        headboard.position.set(0, 0.42, -0.52);
        set(headboard);
        const pillow = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.14, 0.35, 2, 0.06), stdMat({ color: 0xfbf5e8, roughness: 0.9 }));
        pillow.position.set(-0.55, 0.42, -0.3);
        set(pillow);
        break;
      }
      case "eat": {
        const body = new THREE.Mesh(new RoundedBoxGeometry(0.75, 1.55, 0.72, 2, 0.08), stdMat({ color: PALETTE.metal, roughness: 0.35, metalness: 0.55 }));
        body.position.y = 0.78;
        set(body);
        const seam = new THREE.Mesh(new RoundedBoxGeometry(0.77, 0.03, 0.74, 1, 0.01), stdMat({ color: 0x9aa0a8, roughness: 0.4, metalness: 0.5 }));
        seam.position.y = 1.0;
        set(seam, false);
        const handle = new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.5, 0.05, 1, 0.02), stdMat({ color: 0x4a4d52, roughness: 0.3, metalness: 0.6 }));
        handle.position.set(0.32, 1.1, 0.35);
        set(handle, false);
        break;
      }
      case "shower": {
        const wallMat = stdMat({ color: PALETTE.ceramic, roughness: 0.5, metalness: 0.05, transparent: true, opacity: 0.88 });
        const back = new THREE.Mesh(new RoundedBoxGeometry(1.05, 1.9, 0.06, 1, 0.02), wallMat);
        back.position.set(0, 0.95, -0.5);
        set(back);
        const side = new THREE.Mesh(new RoundedBoxGeometry(0.06, 1.9, 1.0, 1, 0.02), wallMat);
        side.position.set(-0.5, 0.95, 0);
        set(side);
        const head = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 12), stdMat({ color: PALETTE.metal, roughness: 0.3, metalness: 0.7 }));
        head.rotation.z = Math.PI / 2;
        head.position.set(0, 1.7, -0.35);
        set(head);
        break;
      }
      case "work": {
        const top = new THREE.Mesh(new RoundedBoxGeometry(1.55, 0.07, 0.75, 2, 0.03), stdMat({ color: PALETTE.wood, roughness: 0.55 }));
        top.position.y = 0.74;
        set(top);
        for (const [lx, lz] of [[-0.68, -0.3], [0.68, -0.3], [-0.68, 0.3], [0.68, 0.3]]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.74, 8), stdMat({ color: PALETTE.woodDark, roughness: 0.6 }));
          leg.position.set(lx, 0.37, lz);
          set(leg);
        }
        const monitor = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.34, 0.04, 1, 0.03), stdMat({ color: 0x2a2622, roughness: 0.4, emissive: 0x3a4a5c, emissiveIntensity: 0.4 }));
        monitor.position.set(0, 1.0, -0.28);
        set(monitor);
        break;
      }
      case "play": {
        const rug = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.05, 28), stdMat({ color: PALETTE.fabricRug, roughness: 0.95 }));
        rug.position.y = 0.025;
        set(rug);
        break;
      }
      case "call": {
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.06, 24), stdMat({ color: PALETTE.wood, roughness: 0.55 }));
        top.position.y = 0.62;
        set(top);
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.6, 10), stdMat({ color: PALETTE.woodDark, roughness: 0.6 }));
        leg.position.y = 0.31;
        set(leg);
        const seat = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.08, 0.42, 1, 0.04), stdMat({ color: PALETTE.sim2, roughness: 0.8 }));
        seat.position.set(0.85, 0.42, 0);
        set(seat);
        const seatLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 8), stdMat({ color: PALETTE.woodDark, roughness: 0.6 }));
        seatLeg.position.set(0.85, 0.21, 0);
        set(seatLeg);
        break;
      }
    }
  }

  _buildOutdoorObject(o, pos) {
    const group = new THREE.Group();
    group.position.set(pos.x, 0, pos.z);
    this.neighbourhoodGroup.add(group);
    const set = (mesh, cast = true) => {
      mesh.castShadow = cast;
      mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };
    switch (o.type) {
      case "bench": {
        this._contactShadow(1.2, 0.6, group);
        const seat = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.06, 0.34, 1, 0.02), stdMat({ color: PALETTE.wood, roughness: 0.65 }));
        seat.position.y = 0.42;
        set(seat);
        const back = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.32, 0.05, 1, 0.02), stdMat({ color: PALETTE.wood, roughness: 0.65 }));
        back.position.set(0, 0.6, -0.15);
        set(back);
        for (const lx of [-0.42, 0.42]) {
          const leg = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.42, 0.3, 1, 0.02), stdMat({ color: PALETTE.woodDark, roughness: 0.7 }));
          leg.position.set(lx, 0.21, 0);
          set(leg);
        }
        break;
      }
      case "tree": {
        this._contactShadow(1.8, 1.8, group);
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 1.1, 8), stdMat({ color: PALETTE.woodDark, roughness: 0.85 }));
        trunk.position.y = 0.55;
        set(trunk);
        const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 1), stdMat({ color: PALETTE.leaf, roughness: 0.85 }));
        canopy.position.y = 1.35;
        canopy.scale.set(1, 0.85, 1);
        set(canopy);
        break;
      }
      case "lampPost": {
        this._contactShadow(0.7, 0.7, group);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.7, 8), stdMat({ color: 0x3a3a3a, roughness: 0.5, metalness: 0.4 }));
        pole.position.y = 0.85;
        set(pole);
        const lamp = new THREE.Mesh(
          new THREE.SphereGeometry(0.11, 12, 10),
          stdMat({ color: 0xffe9bf, roughness: 0.4, emissive: 0xffb066, emissiveIntensity: 0.6 }),
        );
        lamp.position.y = 1.72;
        set(lamp, false);
        group.userData.lampBulb = lamp;
        const lampLight = new THREE.PointLight(0xffb066, 0.7, 5.5, 2.2);
        lampLight.position.y = 1.72;
        lampLight.userData.baseIntensity = 0.7;
        lampLight.userData.isStreetLamp = true; // gets a stronger night curve than interior lights, below
        group.add(lampLight);
        this._pointLights.push(lampLight);
        group.userData.lampLight = lampLight;
        break;
      }
      case "planter": {
        this._contactShadow(0.6, 0.6, group);
        const box = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.32, 0.5, 1, 0.04), stdMat({ color: PALETTE.woodDark, roughness: 0.75 }));
        box.position.y = 0.16;
        set(box);
        const tuft = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 0)); tuft.material = stdMat({ color: PALETTE.leaf, roughness: 0.9 });
        tuft.position.y = 0.44;
        tuft.scale.set(1, 0.7, 1);
        set(tuft);
        break;
      }
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

  _stationForSim(sim) {
    return stationFor(sim.lastAction || "idle");
  }

  draw(t) {
    if (this._disposed) return;
    const w = this.nextWorld;
    if (!w) return;
    this._buildNeighbourhoodIfNeeded(w);
    if (!this._neighbourhoodBuilt) return; // no buildings yet -- nothing to draw
    if (this.reducedMotion) t = 1;
    const prev = this.prevWorld || w;
    const hour = w.tick % 24;
    const sun = sunFor(hour);

    // -- lighting for this hour --
    const dist = Math.max(20, (this._camDist || 14) * 1.4);
    const sx = Math.cos(sun.azimuth) * Math.cos(sun.elevation) * dist;
    const sy = Math.max(0.6, Math.sin(sun.elevation) * dist);
    const sz = Math.sin(sun.azimuth) * Math.cos(sun.elevation) * dist;
    this.sun.position.set(sx, sy, sz);
    this.sun.target.position.set(0, 0.5, 0);
    const nightAmt = sun.isDay ? 0 : 1;
    // FINAL.md item 5: "too dark both day and at night" -- the previous
    // pass overcorrected chasing the muddy-night note and pulled the day
    // end down with it. Raised both ends together, day more than night, so
    // day is the strongest frame in the cycle again while night keeps the
    // contrast already achieved (below) instead of flattening it out.
    this.sun.intensity = sun.isDay ? lerp(0.5, 0.95, Math.min(1, sun.elevation)) : 0.08;
    const sunColor = sun.warmth >= 1 ? SUN_COLOR_DAY : SUN_COLOR_WARM.clone().lerp(SUN_COLOR_DAY, sun.warmth);
    this.sun.color.copy(sun.isDay ? sunColor : SUN_COLOR_NIGHT);
    // Night's ambient floor raised off nearly zero -- "a person should see
    // the whole neighbourhood, with the lamp pools as the warm accents
    // rather than the only light. Not black, not brown." Still well below
    // day, so the point lights below still read as the thing carrying the
    // scene, not the only source of visibility.
    this.hemi.intensity = sun.isDay ? lerp(0.2, 0.32, Math.min(1, sun.elevation)) : 0.07;
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
    // night -- not just a pool of light on the ground beneath it.
    for (const building of this.neighbourhoodGroup.children) {
      if (building.userData && building.userData.lampBulb) {
        building.userData.lampBulb.material.emissiveIntensity = lerp(0.3, 4.5, nightAmt);
      }
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

    const sky = sun.isDay ? SKY_DUSK.clone().lerp(SKY_DAY, sun.warmth) : SKY_NIGHT;
    this.scene.background = sky.clone();

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
      if (!home) return; // sim has no known home building yet -- nothing to place
      const buildingPos = plotToWorldXZ(home.plot, this._plotCenter.x, this._plotCenter.z);
      const prevSim = (prev.sims || [])[i] || sim;
      const fromLocal = standLocalXZ(this._stationForSim(prevSim));
      const toLocal = standLocalXZ(this._stationForSim(sim));
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

export { STATIONS, sunFor };
