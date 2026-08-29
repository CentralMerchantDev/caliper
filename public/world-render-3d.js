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
import { HDRLoader } from "./vendor/three/addons/loaders/HDRLoader.js";
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

// Same idea, for the `material` string next to that colour (world.surfaces'
// { material, color } shape -- the same shape every OBJECT_TYPES recipe
// part already uses for its own material name).
function surfaceMaterialKey(surfaces, key, fallback) {
  const m = surfaces && surfaces[key] && surfaces[key].material;
  return m || fallback;
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

// POLISH.md item 5: CC0 Poly Haven textures (vendor/textures/*/LICENSE.txt
// records source, author, and the MD5 of each original download) for the
// four surfaces that are large enough flat planes for a tiled photographed
// texture to read as an upgrade over a flat colour -- ground, path, floor,
// wall. Keyed by the `material` string world.surfaces already carries next
// to each surface's colour (src/simBaseline.ts), the same field every
// OBJECT_TYPES recipe part already declares -- so a surface (or, in the
// future, an object type) that names an EXISTING material key here picks
// this up automatically, with no renderer change. A material name with no
// entry below (or an object type's own small furniture parts, which stay
// flat-coloured -- a tiled texture on a 0.05m drawer pull is wasted detail,
// not an upgrade) just keeps using stdMat()'s flat colour, exactly as
// before this pass.
// CC0 Poly Haven textures driven from the surface registry (no GLTF model packs; primitive recipes maintained)
const MATERIAL_TEXTURES = {
  wood: { normal: true, roughness: true, repeatMeters: 2.0 },
  plaster: { normal: true, roughness: true, repeatMeters: 2.4 },
  grass: { repeatMeters: 3.2 },
  gravel: { repeatMeters: 2.8 },
};
const _textureLoader = new THREE.TextureLoader();
/** Loads one tiled texture and attaches it to `material[slot]` only once the
 * image has actually arrived, via TextureLoader's own onLoad callback --
 * never the texture object load() returns synchronously. Assigning a
 * still-loading texture straight into a material that's already in the
 * render loop (this scene's first frame renders within a tick of world
 * data arriving, well before a same-origin fetch can round-trip) is what
 * was producing "Texture marked for update but no image data found":
 * something in that path bumps the texture's internal version before its
 * image is set, and once bumped it never gets corrected, so it re-warns on
 * every frame after. Setting it only inside onLoad (image guaranteed
 * present) plus a material.needsUpdate afterward (forces the one shader
 * recompile a newly-added map needs) sidesteps that regardless of the
 * precise internal cause. Until then the material keeps its flat stdMat()
 * colour -- a one-frame flash before the texture pops in, not a blank one. */
function attachTiledTexture(material, slot, materialKey, filename, isColorData, repeatX, repeatY) {
  _textureLoader.load(`./vendor/textures/${materialKey}/${filename}`, (t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (isColorData) t.colorSpace = THREE.SRGBColorSpace; // diffuse only -- normal/roughness stay linear data
    t.repeat.set(repeatX, repeatY);
    material[slot] = t;
    if (slot === "roughnessMap") material.roughness = 1; // let the map drive it; base value becomes a multiplier three.js applies against it
    material.needsUpdate = true;
  });
}
/** Textured variant of stdMat() for a real-world w x d plane, tinted by the
 * surface's own colour (so a `surfaces[key].color` override in world data
 * still does something -- it multiplies the photographed texture instead of
 * replacing it outright). Falls back to a flat stdMat() for any material
 * key with no entry in MATERIAL_TEXTURES. */
function texturedMat(materialKey, color, w, d, extraOpts) {
  const spec = MATERIAL_TEXTURES[materialKey];
  const material = stdMat({ color, ...extraOpts });
  if (!spec) return material;
  const repeatX = Math.max(1, Math.round(w / spec.repeatMeters));
  const repeatY = Math.max(1, Math.round(d / spec.repeatMeters));
  attachTiledTexture(material, "map", materialKey, "diffuse.webp", true, repeatX, repeatY);
  if (spec.normal) attachTiledTexture(material, "normalMap", materialKey, "normal.webp", false, repeatX, repeatY);
  if (spec.roughness) attachTiledTexture(material, "roughnessMap", materialKey, "roughness.webp", false, repeatX, repeatY);
  return material;
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

function makeThoughtBubbleTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.beginPath();
  ctx.arc(64, 64, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.font = "44px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("💭", 64, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

class AudioSynth {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.ambientGain = null;
    this.filter = null;
    this.noiseNode = null;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
  }

  toggleSound(enable) {
    this.enabled = enable !== undefined ? enable : !this.enabled;
    if (this.enabled) {
      this.init();
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      this.startAmbient();
      if (this.ambientGain && this.ctx) {
        this.ambientGain.gain.setTargetAtTime(0.025, this.ctx.currentTime, 0.1);
      }
    } else {
      if (this.ambientGain && this.ctx) {
        this.ambientGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      }
    }
    return this.enabled;
  }

  playClick() {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.004);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.004);
    } catch (_) {}
  }

  playDropThud() {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(65, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (_) {}
  }

  playErrorBuzz() {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(120, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, this.ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.18);
    } catch (_) {}
  }

  startAmbient() {
    if (!this.ctx || this.noiseNode) return;
    try {
      const bufferSize = 2 * this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      this.noiseNode = this.ctx.createBufferSource();
      this.noiseNode.buffer = noiseBuffer;
      this.noiseNode.loop = true;

      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = "lowpass";
      this.filter.frequency.value = 220;

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(this.enabled ? 0.025 : 0, this.ctx.currentTime);

      this.noiseNode.connect(this.filter);
      this.filter.connect(this.ambientGain);
      this.ambientGain.connect(this.ctx.destination);
      this.noiseNode.start();
    } catch (_) {}
  }

  updateAmbient(nightAmt) {
    if (!this.ctx || !this.filter || !this.enabled) return;
    try {
      const targetFreq = lerp(220, 750, nightAmt);
      this.filter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
    } catch (_) {}
  }
}

class Renderer3D {
  constructor(canvas, { reducedMotion = false, onInspect = null } = {}) {
    this.canvas = canvas;
    this.reducedMotion = reducedMotion;
    this.onInspect = onInspect;
    this.prevWorld = null;
    this.nextWorld = null;
    this._simMeshes = [];
    this._buildingGroupsById = {};
    this._buildingsById = {};
    this._buildingScaleById = {};
    this._objectTypes = {};
    this._emissiveAnimated = [];
    this._neighbourhoodBuilt = false;
    this._disposed = false;

    this.audio = new AudioSynth();
    this.spatialDiff = false;

    this._smokeParticles = [];
    this._smokeEmitters = [
      new THREE.Vector3(-4.2, 2.5, -4.2),
      new THREE.Vector3(4.2, 2.5, -3.8),
    ];

    this._fireflies = [];
    this._dustParticles = [];
    this._collisionBoxes = [];
    this._thoughtBubbles = [];

    this._isDroneTour = false;
    this._tourStartTime = 0;
    this._tourDuration = 20000;

    this._camCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 2.2, 10),
      new THREE.Vector3(-6, 5.5, 3),
      new THREE.Vector3(4, 2.8, 5),
      new THREE.Vector3(9, 11, 11),
    ], true);

    this._lookCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(-4, 1.2, -4),
      new THREE.Vector3(3, 0.8, -2),
      new THREE.Vector3(0, 0.5, 0),
    ], true);

    this._diffSlateMat = stdMat({ color: 0x334155, roughness: 0.85, metalness: 0.1 });
    this._diffEmeraldMat = stdMat({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.9, roughness: 0.3 });

    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();

    this._targetLookAt = new THREE.Vector3(0, 0.9, 0);
    this._startLookAt = new THREE.Vector3(0, 0.9, 0);
    this._targetCamDist = 14;
    this._startCamDist = 14;
    this._camDist = 14;
    this._cameraAnimStartTime = 0;
    this._cameraAnimDuration = 600;

    this._overrideHour = null;
    this._currentHour = 12;
    this._dropAnimItems = [];
    this._knownPlacementKeys = new Set();

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
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this._skyGradient = makeSkyGradientTexture();
    updateSkyGradient(this._skyGradient, SKY_DAY, SKY_DAY);
    scene.background = this._skyGradient.tex;
    this.scene = scene;

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    new HDRLoader().load(
      "./vendor/hdri/kloofendal_48d_partly_cloudy_1k.hdr",
      (hdrTexture) => {
        const envMap = pmrem.fromEquirectangular(hdrTexture).texture;
        hdrTexture.dispose();
        pmrem.dispose();
        if (this._disposed) {
          envMap.dispose();
          return;
        }
        scene.environment = envMap;
      },
      undefined,
      () => {
        pmrem.dispose();
      },
    );

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

    const hemi = new THREE.HemisphereLight(0x8a99ad, 0x6e5a47, 0.35);
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

    const fireflyGeo = new THREE.SphereGeometry(0.06, 8, 8);
    this._fireflies = [];
    for (let i = 0; i < 18; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xa3e635, transparent: true, opacity: 0 });
      const mesh = new THREE.Mesh(fireflyGeo, mat);
      const basePos = new THREE.Vector3(
        (Math.random() - 0.5) * 14,
        0.4 + Math.random() * 1.5,
        (Math.random() - 0.5) * 14
      );
      mesh.position.copy(basePos);
      scene.add(mesh);
      this._fireflies.push({ mesh, basePos, phase: Math.random() * Math.PI * 2 });
    }

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
    if (!this._thoughtBubbles || this._thoughtBubbles.length === 0) {
      this._thoughtBubbles = [];
      const bubbleTex = makeThoughtBubbleTexture();
      const bubbleMat = new THREE.SpriteMaterial({ map: bubbleTex, transparent: true, opacity: 0.9, depthTest: false });
      const positions = [
        { id: "workshop", pos: new THREE.Vector3(-4.2, 3.2, -4.2) },
        { id: "shop", pos: new THREE.Vector3(4.2, 3.2, -3.8) },
        { id: "dwelling-2", pos: new THREE.Vector3(-4.2, 3.2, 4.2) },
        { id: "dwelling-1", pos: new THREE.Vector3(4.2, 3.2, 3.8) },
      ];
      positions.forEach(({ id, pos }) => {
        const sprite = new THREE.Sprite(bubbleMat);
        sprite.position.copy(pos);
        sprite.scale.set(0.9, 0.9, 0.9);
        sprite.userData = { isThoughtBubble: true, parcelId: id, basePosY: pos.y, phase: Math.random() * Math.PI * 2 };
        this.scene.add(sprite);
        this._thoughtBubbles.push(sprite);
      });
    }
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
    const groundMaterialKey = surfaceMaterialKey(this._surfaces, "ground", "grass");
    const ground = new THREE.Mesh(
      new RoundedBoxGeometry(groundW, 0.25, groundD, 3, 0.15),
      texturedMat(groundMaterialKey, surfaceColor(this._surfaces, "ground", PALETTE.ground), groundW, groundD, { roughness: 0.95, metalness: 0.0 }),
    );
    ground.position.y = -0.2;
    ground.receiveShadow = true;
    this.neighbourhoodGroup.add(ground);
    this._groundExtent = { w: groundW, d: groundD };

    // Simple cross-shaped path through the central plaza, connecting every
    // building's side of the grid -- not routed building-to-building
    // individually (that's real pathfinding for a later run), just an
    // honest "there is open, walkable ground here" cue.
    const pathMaterialKey = surfaceMaterialKey(this._surfaces, "path", "gravel");
    const pathColor = surfaceColor(this._surfaces, "path", PALETTE.path);
    // Two separate materials, not one shared between both arms: they're
    // different real-world sizes (the N-S arm is as long as the plaza is
    // deep, the E-W arm as long as it's wide), so a shared tiling repeat
    // would stretch whichever arm doesn't match the size it was computed
    // from.
    const pathNS = new THREE.Mesh(new THREE.PlaneGeometry(2.4, groundD - 1), texturedMat(pathMaterialKey, pathColor, 2.4, groundD - 1, { roughness: 0.9 }));
    pathNS.rotation.x = -Math.PI / 2;
    pathNS.position.y = -0.06;
    pathNS.receiveShadow = true;
    this.neighbourhoodGroup.add(pathNS);
    const pathEW = new THREE.Mesh(new THREE.PlaneGeometry(groundW - 1, 2.4), texturedMat(pathMaterialKey, pathColor, groundW - 1, 2.4, { roughness: 0.9 }));
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
    const floorMaterialKey = surfaceMaterialKey(this._surfaces, "floor", "wood");
    const floor = new THREE.Mesh(
      new RoundedBoxGeometry(w, 0.3, d, 3, 0.12),
      texturedMat(floorMaterialKey, surfaceColor(this._surfaces, "floor", PALETTE.floor), w, d, { roughness: 0.86, metalness: 0.02 }),
    );
    floor.position.y = -0.15;
    floor.receiveShadow = true;
    group.add(floor);

    // Both walls share one material: they're close enough in length (w vs
    // d, the same building's own two footprint dimensions) that one tiling
    // repeat reads fine on both, unlike the path's much more different N-S
    // vs E-W arm lengths above.
    const wallMaterialKey = surfaceMaterialKey(this._surfaces, "wall", "plaster");
    const wallMat = texturedMat(wallMaterialKey, surfaceColor(this._surfaces, "wall", PALETTE.wall), (w + d) / 2, 2.3, { roughness: 0.85, metalness: 0.0 });
    const backWall = new THREE.Mesh(new RoundedBoxGeometry(w, 2.3, 0.14, 2, 0.05), wallMat);
    backWall.position.set(0, 1.0, -d / 2);
    backWall.receiveShadow = true;
    group.add(backWall);
    const leftWall = new THREE.Mesh(new RoundedBoxGeometry(0.14, 2.3, d, 2, 0.05), wallMat);
    leftWall.position.set(-w / 2, 1.0, 0);
    leftWall.receiveShadow = true;
    group.add(leftWall);

    // Roof eave overhangs along wall tops
    const eaveMat = stdMat({ color: 0x5c4b39, roughness: 0.85 });
    const backEave = new THREE.Mesh(new RoundedBoxGeometry(w + 0.3, 0.1, 0.28, 1, 0.02), eaveMat);
    backEave.position.set(0, 2.2, -d / 2);
    backEave.castShadow = true;
    group.add(backEave);
    const leftEave = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.1, d + 0.3, 1, 0.02), eaveMat);
    leftEave.position.set(-w / 2, 2.2, 0);
    leftEave.castShadow = true;
    group.add(leftEave);

    // Inset window sills and framed window panes with warm emissive tint (#ffaa33)
    const sillMat = stdMat({ color: 0x8c7a65, roughness: 0.85 });
    const frameMat = stdMat({ color: 0x4a3b2c, roughness: 0.85 });
    const windowGlowMat = stdMat({
      color: 0xffaa33,
      emissive: 0xffaa33,
      emissiveIntensity: 0.25,
      roughness: 0.4,
      transparent: true,
      opacity: 0.85,
    });

    // Back wall window + sill
    const backSill = new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.06, 0.22, 1, 0.02), sillMat);
    backSill.position.set(0, 1.0, -d / 2 + 0.1);
    backSill.castShadow = true;
    group.add(backSill);
    const backFrame = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.9, 0.06, 1, 0.02), frameMat);
    backFrame.position.set(0, 1.45, -d / 2 + 0.04);
    group.add(backFrame);
    const windowPane = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.75), windowGlowMat);
    windowPane.position.set(0, 1.45, -d / 2 + 0.08);
    group.add(windowPane);

    // Left wall window + sill for shop/workshop/dwelling
    const leftSill = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.06, 1.0, 1, 0.02), sillMat);
    leftSill.position.set(-w / 2 + 0.1, 1.0, 0);
    leftSill.castShadow = true;
    group.add(leftSill);
    const leftFrame = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.9, 0.9, 1, 0.02), frameMat);
    leftFrame.position.set(-w / 2 + 0.04, 1.45, 0);
    group.add(leftFrame);
    const sidePane = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75), windowGlowMat);
    sidePane.rotation.y = Math.PI / 2;
    sidePane.position.set(-w / 2 + 0.08, 1.45, 0);
    group.add(sidePane);

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
    const key = `${placement.location}_${placement.type}_${localX.toFixed(2)}_${localZ.toFixed(2)}`;
    const isNew = !this._knownPlacementKeys.has(key);
    this._knownPlacementKeys.add(key);

    const group = new THREE.Group();
    group.userData.isNewPlacement = isNew;
    if (isNew && this._neighbourhoodBuilt && !this.reducedMotion) {
      group.position.set(localX, 1.0, localZ);
      this._dropAnimItems.push({ group, startY: 1.0, targetY: 0, startTime: performance.now(), duration: 200 });
      this._triggerDustRing(localX, localZ, parent);
      this.audio.playDropThud();
    } else {
      group.position.set(localX, 0, localZ);
    }
    parent.add(group);

    const shadow = typeDef.shadow || { w: 1.2, d: 0.9 };
    this._contactShadow(shadow.w, shadow.d, group);

    const overrideColor = placement.overrides && placement.overrides.color;
    for (const part of typeDef.recipe || []) {
      const geo = this._geometryForPart(part);
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

  _triggerDustRing(x, z, parent) {
    const dustGeo = new THREE.SphereGeometry(0.04, 6, 6);
    const num = 16;
    for (let i = 0; i < num; i++) {
      const angle = (i / num) * Math.PI * 2;
      const dirX = Math.cos(angle);
      const dirZ = Math.sin(angle);
      const mat = new THREE.MeshBasicMaterial({ color: 0xc2b280, transparent: true, opacity: 0.6 });
      const mesh = new THREE.Mesh(dustGeo, mat);
      mesh.position.set(x, 0.03, z);
      parent.add(mesh);
      this._dustParticles.push({
        mesh,
        dirX,
        dirZ,
        originX: x,
        originZ: z,
        startTime: performance.now(),
        duration: 300,
        parent,
      });
    }
  }

  toggleSpatialDiff(enable) {
    this.spatialDiff = enable !== undefined ? enable : !this.spatialDiff;
    if (!this.neighbourhoodGroup) return this.spatialDiff;

    this.neighbourhoodGroup.traverse((child) => {
      if (child.isMesh) {
        if (!child.userData.origMat) {
          child.userData.origMat = child.material;
        }
        if (this.spatialDiff) {
          let parentGroup = child;
          let isNew = false;
          while (parentGroup && parentGroup !== this.neighbourhoodGroup) {
            if (parentGroup.userData && parentGroup.userData.isNewPlacement) {
              isNew = true;
              break;
            }
            parentGroup = parentGroup.parent;
          }
          child.material = isNew ? this._diffEmeraldMat : this._diffSlateMat;
        } else {
          child.material = child.userData.origMat;
        }
      }
    });
    return this.spatialDiff;
  }

  startDroneTour() {
    this._isDroneTour = true;
    this._tourStartTime = performance.now();
    const topBar = document.getElementById("letterbox-top");
    const botBar = document.getElementById("letterbox-bottom");
    if (topBar) topBar.classList.add("active");
    if (botBar) botBar.classList.add("active");
  }

  stopDroneTour() {
    if (!this._isDroneTour) return;
    this._isDroneTour = false;
    const topBar = document.getElementById("letterbox-top");
    const botBar = document.getElementById("letterbox-bottom");
    if (topBar) topBar.classList.remove("active");
    if (botBar) botBar.classList.remove("active");
    this.resetView();
  }

  showCollisionBox(targetLocation = "outdoors", boxSize = { w: 4, d: 3, h: 2.2 }) {
    let cx = 0, cz = 0;
    if (targetLocation && targetLocation !== "outdoors" && this._buildingsById[targetLocation]) {
      const b = this._buildingsById[targetLocation];
      const pos = plotToWorldXZ(b.plot, this._plotCenter.x, this._plotCenter.z);
      cx = pos.x;
      cz = pos.z;
    } else {
      cx = 0;
      cz = 0;
    }

    const geo = new THREE.BoxGeometry(boxSize.w, boxSize.h, boxSize.d);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cx, boxSize.h / 2 + 0.05, cz);
    this.scene.add(mesh);

    this._collisionBoxes.push({
      mesh,
      startTime: performance.now(),
      duration: 2000,
    });

    this.audio.playErrorBuzz();
  }

  _bindOrbitControls() {
    const canvas = this.canvas;
    let clickStartX = 0, clickStartY = 0;
    const onDown = (e) => {
      if (this._isDroneTour) {
        this.stopDroneTour();
      }
      this._orbit.dragging = true;
      this._orbit.startX = e.clientX;
      clickStartX = e.clientX;
      clickStartY = e.clientY;
      this._orbit.startDelta = this._orbit.delta;
    };
    const onMove = (e) => {
      if (!this._orbit.dragging) return;
      const dx = (e.clientX - this._orbit.startX) / Math.max(1, canvas.clientWidth);
      this._orbit.delta = Math.max(-0.45, Math.min(0.45, this._orbit.startDelta + dx * 1.6));
    };
    const onUp = (e) => {
      if (this._orbit.dragging) {
        const dist = Math.hypot(e.clientX - clickStartX, e.clientY - clickStartY);
        if (dist < 6) {
          this._inspectClick(e);
        }
      }
      this._orbit.dragging = false;
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape" && this._isDroneTour) {
        this.stopDroneTour();
      }
    };
    canvas.style.touchAction = "pan-y";
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKeyDown);
    this._unbindOrbit = () => {
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKeyDown);
    };
  }

  _inspectClick(e) {
    if (!this.nextWorld || !this.onInspect) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this._mouse.set(x, y);
    this._raycaster.setFromCamera(this._mouse, this.camera);

    if (this._thoughtBubbles && this._thoughtBubbles.length > 0) {
      const bubbleHits = this._raycaster.intersectObjects(this._thoughtBubbles);
      if (bubbleHits.length > 0) {
        const hitBubble = bubbleHits[0].object;
        if (hitBubble.userData && hitBubble.userData.parcelId) {
          const parcelId = hitBubble.userData.parcelId;
          const bGroup = this._buildingGroupsById[parcelId];
          const b = (this.nextWorld.buildings || []).find((item) => item.id === parcelId);
          const bPlacements = (this.nextWorld.placements || []).filter((p) => p.location === parcelId).map((p) => p.type);
          const bSims = (this.nextWorld.sims || []).filter((s) => s.home === parcelId).map((s) => s.id);
          this.focusParcel(parcelId);
          this.onInspect({
            parcelId,
            label: b ? b.label : (bGroup ? bGroup.userData.label : parcelId),
            type: b ? b.type : "dwelling",
            occupants: bSims.length ? bSims.join(", ") : "None assigned",
            contents: bPlacements.length ? bPlacements.join(", ") : "Standard fixtures",
          });
          return;
        }
      }
    }

    const intersects = this._raycaster.intersectObjects(this.neighbourhoodGroup.children, true);
    if (intersects.length === 0) return;

    let hitObj = intersects[0].object;
    let bId = null;

    while (hitObj && hitObj !== this.neighbourhoodGroup) {
      for (const id in this._buildingGroupsById) {
        if (this._buildingGroupsById[id] === hitObj) {
          bId = id;
          break;
        }
      }
      if (bId) break;
      hitObj = hitObj.parent;
    }

    const world = this.nextWorld;
    const buildings = world.buildings || [];
    const placements = world.placements || [];
    const sims = world.sims || [];

    if (bId) {
      const b = buildings.find((item) => item.id === bId);
      const bPlacements = placements.filter((p) => p.location === bId).map((p) => p.type);
      const bSims = sims.filter((s) => s.home === bId).map((s) => s.id);
      this.focusParcel(bId);
      this.onInspect({
        parcelId: bId,
        label: b ? b.label : bId,
        type: b ? b.type : "dwelling",
        occupants: bSims.length ? bSims.join(", ") : "None assigned",
        contents: bPlacements.length ? bPlacements.join(", ") : "Standard fixtures",
      });
    } else {
      const outdoorPlacements = placements.filter((p) => p.location === "outdoors").map((p) => p.type);
      this.resetView();
      this.onInspect({
        parcelId: "outdoors",
        label: "Central Plaza",
        type: "outdoor plot",
        occupants: "Active sims roaming",
        contents: outdoorPlacements.length ? outdoorPlacements.join(", ") : "Trees, lamps, bench, planter",
      });
    }
  }

  focusOn(targetVec3, dist = 10.5) {
    this._startLookAt.copy(this._lookAt);
    this._targetLookAt.copy(targetVec3);
    this._startCamDist = this._camDist || 14;
    this._targetCamDist = dist;
    this._cameraAnimStartTime = performance.now();
  }

  focusParcel(parcelId) {
    if (parcelId === "outdoors" || !parcelId) {
      this.resetView();
      return;
    }
    const group = this._buildingGroupsById[parcelId];
    if (group) {
      const pos = group.position.clone();
      pos.y = 0.9;
      this.focusOn(pos, 10.2);
    } else {
      this.resetView();
    }
  }

  focusPreset(presetText) {
    const text = String(presetText).toLowerCase();
    if (text.includes("tavern") || text.includes("table")) {
      this.focusParcel("shop");
    } else if (text.includes("stable") || text.includes("trough")) {
      this.focusParcel("dwelling-2");
    } else if (text.includes("workshop") || text.includes("canopy")) {
      this.focusParcel("workshop");
    } else {
      this.focusParcel("dwelling-1");
    }
  }

  resetView() {
    this._startLookAt.copy(this._lookAt);
    this._targetLookAt.set(0, 0.9, 0);
    this._startCamDist = this._camDist || 14;
    this._targetCamDist = 14;
    this._cameraAnimStartTime = performance.now();
    this._orbit.delta = 0;
  }

  setTimeOfDay(todKey) {
    if (todKey === "day") this._overrideHour = 12;
    else if (todKey === "dusk") this._overrideHour = 19.5;
    else if (todKey === "night") this._overrideHour = 2;
    else this._overrideHour = null;
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

    // -- Camera lerp --
    if (this._cameraAnimStartTime > 0 && !this.reducedMotion) {
      const elapsed = performance.now() - this._cameraAnimStartTime;
      const progress = Math.min(1, elapsed / this._cameraAnimDuration);
      const ease = 1 - Math.pow(1 - progress, 3);
      this._lookAt.lerpVectors(this._startLookAt, this._targetLookAt, ease);
      this._camDist = lerp(this._startCamDist, this._targetCamDist, ease);
      if (progress >= 1) this._cameraAnimStartTime = 0;
    }

    // -- Item drop animation --
    if (this._dropAnimItems.length > 0 && !this.reducedMotion) {
      const now = performance.now();
      this._dropAnimItems = this._dropAnimItems.filter((item) => {
        const elapsed = now - item.startTime;
        const progress = Math.min(1, elapsed / item.duration);
        const ease = 1 - Math.pow(1 - progress, 2);
        item.group.position.y = lerp(item.startY, item.targetY, ease);
        return progress < 1;
      });
    }

    // -- Time of day calculation --
    const simHour = (prev.tick + t) % 24;
    const targetHour = this._overrideHour !== null ? this._overrideHour : simHour;
    if (Math.abs(this._currentHour - targetHour) > 0.05) {
      this._currentHour = lerp(this._currentHour, targetHour, 0.08);
    } else {
      this._currentHour = targetHour;
    }
    const sun = sunFor(this._currentHour);

    // -- lighting for this hour --
    const dist = Math.max(20, (this._camDist || 14) * 1.4);
    const sx = Math.cos(sun.azimuth) * Math.cos(sun.elevation) * dist;
    const sy = Math.max(0.6, Math.sin(sun.elevation) * dist);
    const sz = Math.sin(sun.azimuth) * Math.cos(sun.elevation) * dist;
    this.sun.position.set(sx + this._lookAt.x, sy, sz + this._lookAt.z);
    this.sun.target.position.copy(this._lookAt);

    const nightAmt = 1 - sun.dayAmt;
    const daySunIntensity = lerp(0.5, 0.95, Math.min(1, sun.elevation));
    this.sun.intensity = lerp(0.08, daySunIntensity, sun.dayAmt);
    const sunColor = sun.warmth >= 1 ? SUN_COLOR_DAY : SUN_COLOR_WARM.clone().lerp(SUN_COLOR_DAY, sun.warmth);
    this.sun.color.copy(SUN_COLOR_NIGHT).lerp(sunColor, sun.dayAmt);

    const dayHemi = lerp(0.2, 0.32, Math.min(1, sun.elevation));
    this.hemi.intensity = lerp(0.07, dayHemi, sun.dayAmt);

    for (const light of this._pointLights) {
      const base = light.userData.baseIntensity || 0.3;
      const nightMult = light.userData.isStreetLamp ? 2.6 : 1.3;
      light.intensity = lerp(base * 0.2, base * nightMult, nightAmt);
    }
    for (const mat of this._emissiveAnimated) {
      mat.emissiveIntensity = lerp(0.3, 4.5, nightAmt);
    }

    this.renderer.toneMappingExposure = lerp(1.05, 0.72, nightAmt);
    this.scene.environmentIntensity = lerp(1.3, 0.18, nightAmt);

    const daySky = SKY_DUSK.clone().lerp(SKY_DAY, sun.warmth);
    const sky = SKY_NIGHT.clone().lerp(daySky, sun.dayAmt);
    const horizon = sky.clone().lerp(SKY_HORIZON, lerp(0.35, 0.62, sun.dayAmt));
    this.audio.updateAmbient(nightAmt);
    if (this.spatialDiff && this._diffEmeraldMat) {
      this._diffEmeraldMat.emissiveIntensity = 0.7 + Math.sin(performance.now() / 200) * 0.35;
    }

    // -- Smoke Particles Update --
    if (!this.reducedMotion && this._neighbourhoodBuilt) {
      const nowSec = performance.now() / 1000;
      if (this._smokeParticles.length < 28 && Math.random() < 0.35) {
        const emitterPos = this._smokeEmitters[Math.floor(Math.random() * this._smokeEmitters.length)];
        const smokeGeo = new THREE.SphereGeometry(0.12, 8, 8);
        const smokeMat = new THREE.MeshBasicMaterial({ color: 0xd6d6d6, transparent: true, opacity: 0.35, depthWrite: false });
        const mesh = new THREE.Mesh(smokeGeo, smokeMat);
        mesh.position.copy(emitterPos);
        this.scene.add(mesh);
        this._smokeParticles.push({
          mesh,
          origin: emitterPos.clone(),
          life: 0,
          maxLife: 2.5,
          phase: Math.random() * Math.PI * 2,
        });
      }
      this._smokeParticles = this._smokeParticles.filter((p) => {
        p.life += 0.016;
        const progress = p.life / p.maxLife;
        if (progress >= 1) {
          this.scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
          return false;
        }
        p.mesh.position.y = p.origin.y + progress * 1.5;
        p.mesh.position.x = p.origin.x + Math.sin(nowSec * 2 + p.phase) * 0.15 * progress;
        p.mesh.position.z = p.origin.z + Math.cos(nowSec * 1.5 + p.phase) * 0.1 * progress;
        const scale = lerp(1.0, 3.2, progress);
        p.mesh.scale.set(scale, scale, scale);
        p.mesh.material.opacity = lerp(0.35, 0, progress);
        return true;
      });
    }

    // -- Fireflies Update --
    if (this._fireflies && this._fireflies.length > 0) {
      const nowSec = performance.now() / 1000;
      const targetOpacity = nightAmt > 0.2 ? lerp(0, 0.9, (nightAmt - 0.2) / 0.8) : 0;
      this._fireflies.forEach((f) => {
        f.mesh.position.x = f.basePos.x + Math.sin(nowSec * 1.4 + f.phase) * 0.4;
        f.mesh.position.y = f.basePos.y + Math.sin(nowSec * 2.2 + f.phase * 1.5) * 0.25;
        f.mesh.position.z = f.basePos.z + Math.cos(nowSec * 1.6 + f.phase) * 0.4;
        f.mesh.material.opacity = lerp(f.mesh.material.opacity, targetOpacity, 0.05);
      });
    }

    // -- Dust Particles Update --
    if (this._dustParticles && this._dustParticles.length > 0) {
      const nowMs = performance.now();
      this._dustParticles = this._dustParticles.filter((p) => {
        const elapsed = nowMs - p.startTime;
        const progress = Math.min(1, elapsed / p.duration);
        if (progress >= 1) {
          p.parent.remove(p.mesh);
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
          return false;
        }
        const dist = lerp(0.05, 0.9, progress);
        p.mesh.position.x = p.originX + p.dirX * dist;
        p.mesh.position.z = p.originZ + p.dirZ * dist;
        p.mesh.material.opacity = lerp(0.6, 0, progress);
        return true;
      });
    }

    // -- Thought Bubbles Bobbing --
    if (this._thoughtBubbles && this._thoughtBubbles.length > 0) {
      const nowSec = performance.now() / 1000;
      this._thoughtBubbles.forEach((tb) => {
        tb.position.y = tb.userData.basePosY + Math.sin(nowSec * 2.2 + tb.userData.phase) * 0.08;
      });
    }

    // -- Collision Boxes Fade --
    if (this._collisionBoxes && this._collisionBoxes.length > 0) {
      const nowMs = performance.now();
      this._collisionBoxes = this._collisionBoxes.filter((cb) => {
        const elapsed = nowMs - cb.startTime;
        const progress = Math.min(1, elapsed / cb.duration);
        if (progress >= 1) {
          this.scene.remove(cb.mesh);
          cb.mesh.geometry.dispose();
          cb.mesh.material.dispose();
          return false;
        }
        cb.mesh.material.opacity = lerp(0.85, 0, progress);
        return true;
      });
    }

    // -- composed camera: target centered, lerped zoom & position or Drone Tour --
    if (this._isDroneTour && !this.reducedMotion) {
      const elapsed = performance.now() - this._tourStartTime;
      const u = Math.min(1, elapsed / this._tourDuration);
      if (u >= 1) {
        this.stopDroneTour();
      } else {
        const camPos = this._camCurve.getPointAt(u);
        const lookPos = this._lookCurve.getPointAt(u);
        this.camera.position.copy(camPos);
        this.camera.lookAt(lookPos);
      }
    } else {
      const az = this._orbit.base + this._orbit.delta;
      const fit = this._cameraFit || 1;
      const currentDist = (this._camDist || 14) * fit;
      const currentH = ((this._camDist || 14) * 8 / 14) * fit;
      this.camera.position.set(
        this._lookAt.x + Math.sin(az) * currentDist,
        this._lookAt.y + currentH,
        this._lookAt.z + Math.cos(az) * currentDist
      );
      this.camera.lookAt(this._lookAt);
    }

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
  focusParcel(parcelId) {
    if (this._impl.focusParcel) this._impl.focusParcel(parcelId);
  }
  focusPreset(presetText) {
    if (this._impl.focusPreset) this._impl.focusPreset(presetText);
  }
  resetView() {
    if (this._impl.resetView) this._impl.resetView();
  }
  setTimeOfDay(todKey) {
    if (this._impl.setTimeOfDay) this._impl.setTimeOfDay(todKey);
  }
  startDroneTour() {
    if (this._impl.startDroneTour) this._impl.startDroneTour();
  }
  stopDroneTour() {
    if (this._impl.stopDroneTour) this._impl.stopDroneTour();
  }
  toggleSpatialDiff(enable) {
    return this._impl.toggleSpatialDiff ? this._impl.toggleSpatialDiff(enable) : false;
  }
  toggleSound(enable) {
    return this._impl.audio ? this._impl.audio.toggleSound(enable) : false;
  }
  playClickSound() {
    if (this._impl.audio) this._impl.audio.playClick();
  }
  playDropThudSound() {
    if (this._impl.audio) this._impl.audio.playDropThud();
  }
  showCollisionBox(targetLocation, boxSize) {
    if (this._impl.showCollisionBox) this._impl.showCollisionBox(targetLocation, boxSize);
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
