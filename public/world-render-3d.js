// CALIPER 3D World Renderer — Expansive 150m Zelda / SimCity Living Valley Kingdom
//
// 150m rolling green valley terrain with elevation knolls, southern winding river,
// stone-arch bridge, wooden footbridge, peripheral pine & oak forests, and 5 distinct
// architectural districts:
// 1. The Town Square & Market (cobblestone plaza, ornate stone well, canopy stalls, barrels, lanterns)
// 2. The Crafting Quarter (Blacksmith forge, smoking stone chimney, outdoor anvil, timber framing)
// 3. The Residential Borough (Cottages: Cottage Rose, Timber Lodge, The Herbalist with peaked gables, shutters, flower boxes)
// 4. The Riverfront & Docks (wooden boardwalk, fishing pier, moored skiff boat, dockside cargo)
// 5. The Hilltop Watchtower & Farmlands (Northern stone watchtower, animated windmill, fenced golden wheat fields)
//
// Plus roof toggle system (toggleRoofs(visible)), warm golden-hour lighting with PCF contact shadows,
// Day/Dusk/Night atmosphere cycle, and smooth orbital camera with district bookmarks.

import * as THREE from "three";
import { RoundedBoxGeometry } from "./vendor/three/addons/geometries/RoundedBoxGeometry.js";
import { WorldRenderer as WorldRenderer2D } from "./world-render.js";

// Building footprint constants exported for test/placementLayout.test.ts
export const BUILDING_W = 8.5;
export const BUILDING_D = 6.0;
export const BUILDING_TYPE_SCALE = {
  dwelling: { w: 1, d: 1 },
  shop: { w: 0.55, d: 0.7 },
  workshop: { w: 0.55, d: 0.7 },
};
export const GRID_UNIT_X = 6.0;
export const GRID_UNIT_Z = 4.5;

const PALETTE = {
  floor: 0x9c7a52,
  wall: 0xb8ad93,
  ground: 0x5a7d42,
  path: 0xbfb49c,
  stoneDark: 0x52525b,
  stoneLight: 0x948b7d,
  timberDark: 0x451a03,
  timberLight: 0x78350f,
  trimShop: 0x9a5a3c,
  trimWorkshop: 0x5c6b5a,
  woodDark: 0x6a4526,
  accent: 0xb0560c,
  sim2: 0x3d6b63,
  roofTimber: 0x6b3f24,
  roofRose: 0x9f3d4d,
  riverWater: 0x22a6e0,
  wheat: 0xd4a342,
};

function surfaceColor(surfaces, key, fallback) {
  const c = surfaces && surfaces[key] && surfaces[key].color;
  return c || fallback;
}

function surfaceMaterialKey(surfaces, key, fallback) {
  const m = surfaces && surfaces[key] && surfaces[key].material;
  return m || fallback;
}

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

function plotToWorldXZ(plot, centerX, centerZ) {
  return { x: (plot.x - centerX) * GRID_UNIT_X, z: (plot.y - centerZ) * GRID_UNIT_Z };
}

function stationLocalXZ(local, w, d) {
  return { x: (local.x - 0.5) * w, z: (local.y - 0.5) * d };
}

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

function sunFor(hour) {
  const rampHalf = 1.2;
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const dawnRamp = clamp01((hour - 5.5 + rampHalf) / (2 * rampHalf));
  const duskRamp = clamp01((20.5 - hour + rampHalf) / (2 * rampHalf));
  const dayAmt = Math.min(dawnRamp, duskRamp);
  const isDay = dayAmt >= 0.5;
  const dayFrac = Math.min(1, Math.max(0, ((hour - 5.5 + 24) % 24) / 15));
  const dayElevation = Math.sin(dayFrac * Math.PI) * 1.1 + 0.08;
  const elevation = lerp(0.04, dayElevation, dayAmt);
  const azimuth = (((hour - 5.5 + 24) % 24) / 24) * Math.PI * 2;
  const dayWarmth = hour < 9 ? (hour - 5.5) / 3.5 : hour < 17.5 ? 1 : 1 - (hour - 17.5) / 3;
  const warmth = Math.max(0, dayWarmth) * dayAmt;
  return { isDay, dayAmt, elevation, azimuth, warmth };
}

const SUN_COLOR_WARM = new THREE.Color(0xffaa5e);
const SUN_COLOR_DAY = new THREE.Color(0xfff5e6);
const SUN_COLOR_NIGHT = new THREE.Color(0x6073a8);
const SKY_DAY = new THREE.Color(0xe6f2ff);
const SKY_DUSK = new THREE.Color(0xf5b584);
const SKY_NIGHT = new THREE.Color(0x131a33);
const SKY_HORIZON = new THREE.Color(0xffeed9);

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function stdMat(opts) {
  return new THREE.MeshStandardMaterial({ envMapIntensity: 0.22, ...opts });
}

const MATERIAL_TEXTURES = {
  wood: { normal: true, roughness: true, repeatMeters: 2.0 },
  plaster: { normal: true, roughness: true, repeatMeters: 2.4 },
  grass: { repeatMeters: 3.2 },
  gravel: { repeatMeters: 2.8 },
};
const _textureLoader = new THREE.TextureLoader();

function attachTiledTexture(material, slot, materialKey, filename, isColorData, repeatX, repeatY) {
  _textureLoader.load(`./vendor/textures/${materialKey}/${filename}`, (t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (isColorData) t.colorSpace = THREE.SRGBColorSpace;
    t.repeat.set(repeatX, repeatY);
    material[slot] = t;
    if (slot === "roughnessMap") material.roughness = 1;
    material.needsUpdate = true;
  });
}

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

function makeContactShadowTexture() {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(18,12,6,0.6)");
  g.addColorStop(0.7, "rgba(18,12,6,0.22)");
  g.addColorStop(1, "rgba(18,12,6,0)");
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
  ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
  ctx.beginPath();
  ctx.arc(64, 64, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
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

function getGroundedBuildingLabel(id, label) {
  if (id === "shop" || label === "shop" || label === "Tavern") return "The Tavern";
  if (id === "workshop" || label === "workshop") return "The Workshop";
  if (id === "dwelling-1" || label === "dwelling-1" || label === "House 1") return "House 1";
  if (id === "dwelling-2" || label === "dwelling-2" || label === "House 2") return "House 2";
  if (id === "outdoors" || label === "outdoors" || label === "Central Plaza") return "The Village Plaza";
  if (id === "town") return "The Town Square & Market";
  if (id === "forge") return "The Crafting Quarter (Forge)";
  if (id === "docks") return "The Riverfront & Docks";
  if (id === "watchtower") return "The Hilltop Watchtower & Windmill";
  if (id === "residential") return "The Residential Borough (Cottages)";
  return label || id;
}

function makeTextLabelTexture(text, bgColor = "rgba(15, 23, 42, 0.88)", textColor = "#f8fafc") {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext("2d");
  ctx.fillStyle = bgColor;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(6, 6, 244, 52, 10);
  } else {
    ctx.rect(6, 6, 244, 52);
  }
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = textColor;
  ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 32);
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
      osc.frequency.setValueAtTime(70, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(32, this.ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
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
    this._floatingLabels = [];
    this._roofGroups = [];
    this._roofsVisible = true;
    this._pointLights = [];

    this._isDroneTour = false;
    this._tourStartTime = 0;
    this._tourDuration = 22000;

    // Cinematic curve flying past all 5 districts of the 150m valley
    this._camCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 18, 52),      // Overview over south valley river
      new THREE.Vector3(-28, 10, 18),    // Glide toward Town Square & Market
      new THREE.Vector3(-36, 12, -18),   // Blacksmith Crafting Quarter
      new THREE.Vector3(-12, 24, -58),   // Ascent to Hilltop Watchtower & Farmlands
      new THREE.Vector3(26, 16, -42),    // Windmill & Wheat fields
      new THREE.Vector3(38, 11, 4),      // Residential Borough Cottages
      new THREE.Vector3(12, 7, 44),      // Riverfront Docks & Skiff
      new THREE.Vector3(0, 18, 52),      // Loop back
    ], true);

    this._lookCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 2, 0),        // Town center
      new THREE.Vector3(0, 1.5, 0),      // Market well
      new THREE.Vector3(-25, 2, -14),    // Forge
      new THREE.Vector3(0, 6, -42),      // Watchtower
      new THREE.Vector3(14, 4, -42),     // Windmill
      new THREE.Vector3(24, 2, 2),       // Cottages
      new THREE.Vector3(2, 1, 34),       // Docks
      new THREE.Vector3(0, 2, 0),        // Town
    ], true);

    this._districtTargets = {
      town: { pos: new THREE.Vector3(0, 1.2, 0), dist: 16, label: "The Town Square & Market" },
      forge: { pos: new THREE.Vector3(-25, 1.8, -14), dist: 15, label: "The Crafting Quarter (Forge)" },
      residential: { pos: new THREE.Vector3(24, 1.5, 4), dist: 18, label: "The Residential Borough (Cottages)" },
      docks: { pos: new THREE.Vector3(2, 1.2, 34), dist: 16, label: "The Riverfront & Docks" },
      watchtower: { pos: new THREE.Vector3(2, 5.0, -42), dist: 24, label: "The Hilltop Watchtower & Farmlands" },
    };

    this._diffSlateMat = stdMat({ color: 0x334155, roughness: 0.85, metalness: 0.1 });
    this._diffEmeraldMat = stdMat({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.9, roughness: 0.3 });

    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();

    this._targetLookAt = new THREE.Vector3(0, 0.9, 0);
    this._startLookAt = new THREE.Vector3(0, 0.9, 0);
    this._targetCamDist = 18;
    this._startCamDist = 18;
    this._camDist = 18;
    this._cameraAnimStartTime = 0;
    this._cameraAnimDuration = 650;

    this._overrideHour = null;
    this._currentHour = 12;
    this._dropAnimItems = [];
    this._knownPlacementKeys = new Set();
    this._roofsByBuildingId = {};
    this._frontFacadesByBuildingId = {};
    this._openedBuildingId = null;

    this._initScene();
    this._orbit = { base: 0.62, delta: 0, pitch: 0.58, dragging: false, startX: 0, startY: 0, startDelta: 0, startPitch: 0.58 };
    this._bindOrbitControls();

    this._resize();
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(canvas);
  }

  _initScene() {
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: "high-performance" });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this._skyGradient = makeSkyGradientTexture();
    updateSkyGradient(this._skyGradient, SKY_DAY, SKY_DAY);
    scene.background = this._skyGradient.tex;
    this.scene = scene;

    // Direct, reliable PBR lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    this.ambient = ambient;

    const hemi = new THREE.HemisphereLight(0xbfdbfe, 0x64748b, 0.65);
    scene.add(hemi);
    this.hemi = hemi;

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 350);
    this.camera = camera;
    this._lookAt = new THREE.Vector3(0, 0.9, 0);

    // Warm golden-hour sun
    const sun = new THREE.DirectionalLight(0xfff5e6, 1.45);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 240;
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    sun.shadow.bias = -0.0012;
    sun.shadow.normalBias = 0.025;
    scene.add(sun);
    scene.add(sun.target);
    this.sun = sun;

    this._contactTex = makeContactShadowTexture();

    // Ambient evening fireflies
    const fireflyGeo = new THREE.SphereGeometry(0.08, 8, 8);
    this._fireflies = [];
    for (let i = 0; i < 28; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xbbf246, transparent: true, opacity: 0 });
      const mesh = new THREE.Mesh(fireflyGeo, mat);
      const basePos = new THREE.Vector3(
        (Math.random() - 0.5) * 60,
        0.4 + Math.random() * 2.2,
        (Math.random() - 0.5) * 60
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
    const mat = new THREE.MeshBasicMaterial({
      map: this._contactTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.MultiplyBlending,
      premultipliedAlpha: true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = y;
    parent.add(mesh);
    return mesh;
  }

  _buildNeighbourhoodIfNeeded(world) {
    if (this._neighbourhoodBuilt) return;
    const buildings = world.buildings || [];
    const placements = world.placements || [];
    this._surfaces = world.surfaces || {};
    this._objectTypes = world.objectTypes || {};
    if (buildings.length === 0) return;

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
      if (!typeDef) continue;
      if (p.location === "outdoors") {
        const pos = plotToWorldXZ(p.plot, centerX, centerZ);
        this._buildPlacementInstance(typeDef, p, this.neighbourhoodGroup, pos.x, pos.z);
      } else {
        const home = this._buildingGroupsById[p.location];
        const scale = this._buildingScaleById[p.location];
        if (!home || !scale || !typeDef.local) continue;
        const local = stationLocalXZ(typeDef.local, scale.w * BUILDING_W, scale.d * BUILDING_D);
        this._buildPlacementInstance(typeDef, p, home, local.x, local.z);
      }
    }

    this._neighbourhoodBuilt = true;

    // Thought bubbles
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

    // Floating district/building labels
    if (!this._floatingLabels || this._floatingLabels.length === 0) {
      this._floatingLabels = [];
      const labelConfigs = [
        { id: "workshop", text: "The Workshop", pos: new THREE.Vector3(-4.2, 2.65, -4.2) },
        { id: "shop", text: "The Tavern", pos: new THREE.Vector3(4.2, 2.65, -3.8) },
        { id: "dwelling-2", text: "House 2", pos: new THREE.Vector3(-4.2, 2.65, 4.2) },
        { id: "dwelling-1", text: "House 1", pos: new THREE.Vector3(4.2, 2.65, 3.8) },
        { id: "outdoors", text: "The Town Square", pos: new THREE.Vector3(0, 2.3, 0) },
        { id: "forge", text: "Crafting Quarter", pos: new THREE.Vector3(-25, 4.5, -14) },
        { id: "residential", text: "Residential Borough", pos: new THREE.Vector3(24, 4.2, 2) },
        { id: "docks", text: "Riverfront Docks", pos: new THREE.Vector3(2, 3.2, 34) },
        { id: "watchtower", text: "Hilltop Watchtower", pos: new THREE.Vector3(2, 9.5, -42) },
      ];
      labelConfigs.forEach(({ id, text, pos }) => {
        const tex = makeTextLabelTexture(text);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.88, depthTest: false });
        const sprite = new THREE.Sprite(mat);
        sprite.position.copy(pos);
        sprite.scale.set(2.2, 0.55, 1);
        sprite.userData = { isFloatingLabel: true, parcelId: id, basePosY: pos.y };
        this.scene.add(sprite);
        this._floatingLabels.push(sprite);
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
    this.sun.shadow.camera.left = -(halfW + 28);
    this.sun.shadow.camera.right = halfW + 28;
    this.sun.shadow.camera.top = halfD + 28;
    this.sun.shadow.camera.bottom = -(halfD + 28);
  }

  _buildGround(buildings, centerX, centerZ, scaleFor) {
    const groundW = 150;
    const groundD = 150;
    const groundMaterialKey = surfaceMaterialKey(this._surfaces, "ground", "grass");
    const terrainGeo = new THREE.PlaneGeometry(groundW, groundD, 64, 64);
    terrainGeo.rotateX(-Math.PI / 2);
    const terrainPos = terrainGeo.attributes.position;

    // Organic rolling green valley with northern ridge and southern riverbed
    for (let i = 0; i < terrainPos.count; i++) {
      const x = terrainPos.getX(i), z = terrainPos.getZ(i);
      const dist = Math.sqrt(x * x + z * z);
      const edgeRise = Math.pow(Math.max(Math.abs(x), Math.abs(z)) / 75, 2.2) * 5.8;

      // Northern ridge rise (for watchtower and windmill)
      const northRidge = z < -20 ? Math.sin(Math.min(1, (-z - 20) / 45) * Math.PI) * 3.6 : 0;

      // Southern river channel depression
      const riverDist = Math.abs(z - (34 + Math.sin(x * 0.08) * 4));
      const riverDip = riverDist < 8 ? (1 - riverDist / 8) * -0.9 : 0;

      // Center town square leveling
      const centerFlat = dist < 22 ? Math.max(0, 1 - dist / 22) : 0;
      const roll = (Math.sin(x * 0.075) * 0.75 + Math.cos(z * 0.065) * 0.65 + Math.sin((x + z) * 0.038) * 0.5) * (1 - centerFlat * 0.9);

      const y = edgeRise + northRidge + riverDip + roll - 0.35;
      terrainPos.setY(i, y);
    }
    terrainGeo.computeVertexNormals();

    const ground = new THREE.Mesh(
      terrainGeo,
      texturedMat(groundMaterialKey, surfaceColor(this._surfaces, "ground", PALETTE.ground), groundW, groundD, { roughness: 0.92, metalness: 0.02 }),
    );
    ground.receiveShadow = true;
    this.neighbourhoodGroup.add(ground);
    this._groundExtent = { w: groundW, d: groundD };

    // Cobblestone & Gravel Pathways connecting the districts
    const pathMaterialKey = surfaceMaterialKey(this._surfaces, "path", "gravel");
    const pathColor = surfaceColor(this._surfaces, "path", PALETTE.path);

    // North-South main thoroughfare (Plaza to Northern Ridge & Southern Docks)
    const pathNS = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 84), texturedMat(pathMaterialKey, pathColor, 3.0, 84, { roughness: 0.88 }));
    pathNS.rotation.x = -Math.PI / 2;
    pathNS.position.set(0, -0.04, -4);
    pathNS.receiveShadow = true;
    this.neighbourhoodGroup.add(pathNS);

    // East-West main thoroughfare (Forge to Residential Borough)
    const pathEW = new THREE.Mesh(new THREE.PlaneGeometry(62, 3.0), texturedMat(pathMaterialKey, pathColor, 62, 3.0, { roughness: 0.88 }));
    pathEW.rotation.x = -Math.PI / 2;
    pathEW.position.set(0, -0.04, 0);
    pathEW.receiveShadow = true;
    this.neighbourhoodGroup.add(pathEW);

    // Build the 5 distinct living districts
    this._buildValleyDistricts();

    // Dense peripheral Pine & Oak forests and boulders
    this._buildPeripheralForests();
  }

  _buildValleyDistricts() {
    const addBox = (parent, size, pos, color, roughness = 0.8) => {
      const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 2, 0.06), stdMat({ color, roughness }));
      mesh.position.set(...pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    const addLantern = (parent, x, z) => {
      addBox(parent, [0.14, 2.4, 0.14], [x, 1.2, z], 0x1f2937);
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 10, 8),
        stdMat({ color: 0xffd166, emissive: 0xffaa2b, emissiveIntensity: 1.3 })
      );
      lamp.position.set(x, 2.45, z);
      parent.add(lamp);
      const light = new THREE.PointLight(0xffaa33, 0.9, 11, 2);
      light.position.copy(lamp.position);
      light.userData.baseIntensity = 0.9;
      light.userData.isStreetLamp = true;
      parent.add(light);
      this._pointLights.push(light);
    };

    // =========================================================================
    // 1. THE TOWN SQUARE & MARKET
    // =========================================================================
    const town = new THREE.Group();
    this.neighbourhoodGroup.add(town);

    // Cobblestone circular plaza
    const plaza = new THREE.Mesh(
      new THREE.CylinderGeometry(12.5, 12.5, 0.14, 48),
      stdMat({ color: PALETTE.stoneLight, roughness: 0.94 })
    );
    plaza.position.y = -0.02;
    plaza.receiveShadow = true;
    town.add(plaza);

    // Ornate central stone well with gabled timber roof and bucket
    const wellGroup = new THREE.Group();
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.5, 0.75, 24), stdMat({ color: 0x57534e, roughness: 0.92 }));
    basin.position.y = 0.38;
    basin.castShadow = true;
    basin.receiveShadow = true;
    wellGroup.add(basin);

    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(1.85, 1.85, 0.08, 24),
      stdMat({ color: 0x22a6e0, emissive: 0x0c5d86, emissiveIntensity: 0.3, roughness: 0.12 })
    );
    water.position.y = 0.74;
    wellGroup.add(water);

    // Well timber posts & roof
    [-1.5, 1.5].forEach((px) => {
      addBox(wellGroup, [0.18, 2.2, 0.18], [px, 1.4, 0], PALETTE.timberLight);
    });
    addBox(wellGroup, [3.2, 0.16, 0.18], [0, 2.45, 0], PALETTE.timberDark);
    this._addPeakedRoof(wellGroup, 3.6, 2.6, 2.45, PALETTE.roofTimber);
    town.add(wellGroup);

    // Market stalls with colorful fabric canopies
    const stalls = [
      { x: -7.5, z: -6.5, canopyColor: 0xd97706, label: "Fruit & Bakery" },
      { x: 7.5, z: -6.5, canopyColor: 0x0284c7, label: "Pottery & Cloth" },
      { x: -7.5, z: 6.5, canopyColor: 0x16a34a, label: "Herbs & Vegetables" },
      { x: 7.5, z: 6.5, canopyColor: 0x9333ea, label: "Spices & Trinkets" },
    ];
    stalls.forEach((s) => {
      const stall = new THREE.Group();
      stall.position.set(s.x, 0, s.z);
      // Table & counters
      addBox(stall, [3.6, 0.9, 1.6], [0, 0.45, 0], 0x78350f);
      // Stall canopy posts
      addBox(stall, [0.14, 2.3, 0.14], [-1.6, 1.15, -0.7], 0x451a03);
      addBox(stall, [0.14, 2.3, 0.14], [1.6, 1.15, -0.7], 0x451a03);
      addBox(stall, [0.14, 1.9, 0.14], [-1.6, 0.95, 0.7], 0x451a03);
      addBox(stall, [0.14, 1.9, 0.14], [1.6, 0.95, 0.7], 0x451a03);
      // Slanted fabric awning
      const awning = new THREE.Mesh(
        new RoundedBoxGeometry(3.9, 0.12, 2.2, 2, 0.04),
        stdMat({ color: s.canopyColor, roughness: 0.65 })
      );
      awning.position.set(0, 2.2, 0);
      awning.rotation.x = 0.22;
      awning.castShadow = true;
      stall.add(awning);
      // Produce barrels & crates
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.7, 12), stdMat({ color: 0x6e4a2d, roughness: 0.8 }));
      barrel.position.set(1.9, 0.35, 0.8);
      barrel.castShadow = true;
      stall.add(barrel);
      town.add(stall);
    });

    // Town Square Lampposts
    [[-10.5, 0], [10.5, 0], [0, -10.5], [0, 10.5]].forEach(([lx, lz]) => addLantern(town, lx, lz));

    // =========================================================================
    // 2. THE CRAFTING QUARTER (Blacksmith Forge)
    // =========================================================================
    const forge = new THREE.Group();
    forge.position.set(-25, 0, -14);
    this.neighbourhoodGroup.add(forge);

    // Stone forge yard plinth
    addBox(forge, [11, 0.3, 9], [0, 0, 0], 0x57534e);
    // Timber framing & walls (complete 4 sides with covered archway)
    addBox(forge, [8.0, 4.2, 0.35], [0, 2.1, -3.8], 0x78350f);
    addBox(forge, [0.35, 4.2, 7.6], [-3.8, 2.1, 0], 0x78350f);
    addBox(forge, [0.35, 4.2, 7.6], [3.8, 2.1, 0], 0x78350f);
    addBox(forge, [2.4, 4.2, 0.35], [-2.7, 2.1, 3.8], 0x78350f);
    addBox(forge, [2.4, 4.2, 0.35], [2.7, 2.1, 3.8], 0x78350f);
    addBox(forge, [3.0, 1.0, 0.35], [0, 3.7, 3.8], PALETTE.timberDark);
    this._addPeakedRoof(forge, 8.8, 8.8, 4.1, PALETTE.roofTimber);

    // Tall smoking stone chimney stack
    addBox(forge, [1.4, 7.5, 1.4], [-2.8, 3.75, -2.8], 0x3f3f46, 0.95);
    this._smokeEmitters.push(new THREE.Vector3(-27.8, 7.6, -16.8));

    // Hot glowing coal hearth
    const hearth = addBox(forge, [2.4, 1.1, 1.8], [-1.8, 0.55, 0], 0x27272a);
    const coals = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 1.1),
      stdMat({ color: 0xff4500, emissive: 0xff3b00, emissiveIntensity: 2.2, roughness: 0.3 })
    );
    coals.rotation.x = -Math.PI / 2;
    coals.position.set(-1.8, 1.12, 0);
    forge.add(coals);
    this._emissiveAnimated.push(coals.material);

    const forgeLight = new THREE.PointLight(0xff5500, 1.2, 7, 2);
    forgeLight.position.set(-1.8, 1.6, 0);
    forgeLight.userData.baseIntensity = 1.2;
    forge.add(forgeLight);
    this._pointLights.push(forgeLight);

    // Heavy iron anvil on timber block
    addBox(forge, [0.75, 0.65, 0.75], [2.2, 0.32, 1], PALETTE.timberDark);
    const anvil = new THREE.Mesh(
      new RoundedBoxGeometry(1.2, 0.55, 0.5, 2, 0.05),
      stdMat({ color: 0x1e293b, roughness: 0.35, metalness: 0.85 })
    );
    anvil.position.set(2.2, 0.88, 1);
    anvil.castShadow = true;
    forge.add(anvil);

    // Water quenching tub & weapon rack
    const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.7, 12), stdMat({ color: 0x451a03, roughness: 0.8 }));
    tub.position.set(0.6, 0.35, 2.2);
    tub.castShadow = true;
    forge.add(tub);

    // =========================================================================
    // 3. THE RESIDENTIAL BOROUGH (Cottages)
    // =========================================================================
    const cottages = [
      { x: 21, z: -4, label: "Cottage Rose", wallColor: 0x9f3d4d, roofColor: PALETTE.roofRose, chimneySmoke: true },
      { x: 28, z: 6, label: "Timber Lodge", wallColor: 0x78350f, roofColor: PALETTE.roofTimber, chimneySmoke: true },
      { x: 18, z: 13, label: "The Herbalist", wallColor: 0x4d7c0f, roofColor: 0x5c3d24, chimneySmoke: false },
    ];
    cottages.forEach((c) => {
      const cottage = new THREE.Group();
      cottage.position.set(c.x, 0, c.z);
      // Stone foundation plinth
      addBox(cottage, [8.4, 0.35, 6.4], [0, -0.15, 0], 0x57534e);
      // Main walls
      addBox(cottage, [8.0, 4.2, 6.0], [0, 2.0, 0], c.wallColor);
      // Peaked gabled roof with authentic overhang
      this._addPeakedRoof(cottage, 8.8, 6.8, 4.1, c.roofColor);
      // Stone chimney
      addBox(cottage, [0.85, 5.8, 0.85], [3.2, 2.9, -2.2], 0x475569);
      if (c.chimneySmoke) {
        this._smokeEmitters.push(new THREE.Vector3(c.x + 3.2, 5.9, c.z - 2.2));
      }
      // Wooden flower boxes under windows & colorful blossoms
      const fb = addBox(cottage, [1.6, 0.22, 0.25], [0, 1.2, 3.12], 0x451a03);
      const flowerMat = stdMat({ color: 0xf43f5e, roughness: 0.6 });
      const flowers = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), flowerMat);
      flowers.position.set(-0.4, 1.35, 3.12);
      cottage.add(flowers);
      const flowers2 = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), stdMat({ color: 0xfbbf24, roughness: 0.6 }));
      flowers2.position.set(0.4, 1.35, 3.12);
      cottage.add(flowers2);

      // Window glow panes
      const pane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 1.0),
        stdMat({ color: 0xffd166, emissive: 0xff9900, emissiveIntensity: 0.35, transparent: true, opacity: 0.85 })
      );
      pane.position.set(0, 1.8, 3.02);
      cottage.add(pane);

      // Porch deck & bench
      addBox(cottage, [2.4, 0.12, 1.2], [0, -0.05, 3.6], 0x78350f);
      addBox(cottage, [1.4, 0.45, 0.4], [0, 0.22, 3.6], 0x451a03);

      this.neighbourhoodGroup.add(cottage);
    });

    // =========================================================================
    // 4. THE RIVERFRONT & DOCKS
    // =========================================================================
    // Organic CatmullRom river flowing through the southern valley
    const riverCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-75, -0.4, 38),
      new THREE.Vector3(-45, -0.2, 32),
      new THREE.Vector3(-15, -0.3, 36),
      new THREE.Vector3(15, -0.3, 30),
      new THREE.Vector3(45, -0.2, 36),
      new THREE.Vector3(75, -0.4, 38),
    ]);
    const riverGeo = new THREE.TubeGeometry(riverCurve, 90, 3.8, 12, false);
    const riverMat = stdMat({
      color: PALETTE.riverWater,
      emissive: 0x0c5d86,
      emissiveIntensity: 0.3,
      roughness: 0.1,
      metalness: 0.18,
      transparent: true,
      opacity: 0.88,
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.receiveShadow = true;
    this.neighbourhoodGroup.add(river);

    // Wooden Boardwalk & Pier at x: 2, z: 34
    const docks = new THREE.Group();
    docks.position.set(2, 0, 34);
    for (let i = 0; i < 8; i++) {
      addBox(docks, [1.8, 0.22, 8.5], [(i - 3.5) * 1.75, 0.38, 0], 0x78350f);
    }
    // Pier extending into river
    addBox(docks, [4.2, 0.22, 14], [9.2, 0.34, 2.5], 0x5c3d24);

    // Moored wooden skiff boat
    const skiffGroup = new THREE.Group();
    skiffGroup.position.set(13.5, 0.38, 5.0);
    const skiffHull = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 1.4, 5.6, 12, 1, false, 0, Math.PI),
      stdMat({ color: 0x451a03, roughness: 0.78 })
    );
    skiffHull.rotation.z = Math.PI / 2;
    skiffGroup.add(skiffHull);
    addBox(skiffGroup, [0.1, 0.08, 4.6], [0, 0.3, 0], 0x78350f);
    addBox(skiffGroup, [1.1, 0.08, 0.45], [0, 0.2, 0], 0x78350f);
    docks.add(skiffGroup);

    // Cargo barrels & fishing crates
    for (let b = 0; b < 3; b++) {
      const cBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.65, 10), stdMat({ color: 0x6e4a2d, roughness: 0.8 }));
      cBarrel.position.set(-4 + b * 0.7, 0.7, -2);
      cBarrel.castShadow = true;
      docks.add(cBarrel);
    }
    this.neighbourhoodGroup.add(docks);

    // Stone-Arch Bridge (West bridge over river, x: -22)
    const stoneBridge = new THREE.Group();
    stoneBridge.position.set(-22, 0.85, 34);
    addBox(stoneBridge, [11, 0.8, 6.5], [0, 0, 0], PALETTE.stoneLight);
    addBox(stoneBridge, [11, 0.55, 0.35], [0, 0.65, -3.1], PALETTE.stoneDark);
    addBox(stoneBridge, [11, 0.55, 0.35], [0, 0.65, 3.1], PALETTE.stoneDark);
    this.neighbourhoodGroup.add(stoneBridge);

    // Wooden Footbridge (East bridge over river, x: 24)
    const timberBridge = new THREE.Group();
    timberBridge.position.set(24, 0.75, 33);
    for (let i = 0; i < 10; i++) {
      addBox(timberBridge, [1.1, 0.24, 7.5], [(i - 4.5) * 1.05, 0, 0], 0x78350f);
    }
    addBox(timberBridge, [10.5, 0.16, 0.16], [0, 0.7, -3.6], 0x451a03);
    addBox(timberBridge, [10.5, 0.16, 0.16], [0, 0.7, 3.6], 0x451a03);
    this.neighbourhoodGroup.add(timberBridge);

    // =========================================================================
    // 5. THE HILLTOP WATCHTOWER & FARMLANDS
    // =========================================================================
    const ridge = new THREE.Group();
    ridge.position.set(0, 2.5, -42);

    // Stone Watchtower with battlements
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(4.4, 5.5, 14, 20),
      stdMat({ color: PALETTE.stoneDark, roughness: 0.95 })
    );
    tower.position.y = 7.0;
    tower.castShadow = true;
    tower.receiveShadow = true;
    ridge.add(tower);

    // Watchtower battlements / platform
    addBox(ridge, [10.8, 0.8, 10.8], [0, 14.2, 0], 0x3f3f46);
    for (let c = 0; c < 4; c++) {
      const angle = (c * Math.PI) / 2;
      const bx = Math.cos(angle) * 5.0, bz = Math.sin(angle) * 5.0;
      addBox(ridge, [1.8, 0.8, 1.8], [bx, 14.8, bz], 0x52525b);
    }
    this.neighbourhoodGroup.add(ridge);

    // Windmill beside watchtower with animated rotating sails
    const mill = new THREE.Group();
    mill.position.set(15, 1.2, -43);
    const millBody = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 3.8, 9.8, 16),
      stdMat({ color: 0xd4c29d, roughness: 0.9 })
    );
    millBody.position.y = 4.9;
    millBody.castShadow = true;
    mill.add(millBody);
    this._addPeakedRoof(mill, 7.5, 7.5, 9.6, PALETTE.roofTimber);

    // 4-blade rotating windmill sails
    const sailsHub = new THREE.Group();
    sailsHub.position.set(0, 6.8, 3.4);
    for (let i = 0; i < 4; i++) {
      const bladeArm = new THREE.Group();
      bladeArm.rotation.z = (i * Math.PI) / 2;
      addBox(bladeArm, [0.45, 7.6, 0.16], [0, 3.5, 0], 0x6e4528);
      // Canvas sail cloth
      const sailCloth = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 5.5),
        stdMat({ color: 0xf8fafc, roughness: 0.7, side: THREE.DoubleSide })
      );
      sailCloth.position.set(0.7, 3.8, 0.05);
      bladeArm.add(sailCloth);
      sailsHub.add(bladeArm);
    }
    mill.add(sailsHub);
    this._windmillSails = sailsHub;
    this.neighbourhoodGroup.add(mill);

    // Fenced golden wheat fields
    const wheatMat = stdMat({ color: PALETTE.wheat, roughness: 0.9 });
    [-18, -10, 6, 24].forEach((wx) => {
      for (let wz = -56; wz < -47; wz += 1.4) {
        const crop = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.95, 0.38), wheatMat);
        crop.position.set(wx + (wz % 2) * 0.4, 1.2, wz);
        crop.castShadow = true;
        this.neighbourhoodGroup.add(crop);
      }
    });
    // Split-rail wooden fences
    addBox(this.neighbourhoodGroup, [18, 0.7, 0.14], [-12, 1.2, -46], 0x78350f);
    addBox(this.neighbourhoodGroup, [18, 0.7, 0.14], [16, 1.2, -46], 0x78350f);
  }

  _buildPeripheralForests() {
    const pineMat1 = stdMat({ color: 0x14532d, roughness: 0.85 });
    const pineMat2 = stdMat({ color: 0x166534, roughness: 0.85 });
    const oakMat = stdMat({ color: 0x15803d, roughness: 0.8 });
    const trunkMat = stdMat({ color: 0x451a03, roughness: 0.9 });
    const rockMat = stdMat({ color: 0x64748b, roughness: 0.95 });

    // Perimeter tree distribution
    const forestTrees = [];
    for (let i = 0; i < 72; i++) {
      const angle = (i / 72) * Math.PI * 2;
      const rad = 54 + ((i * 13) % 18);
      const x = Math.cos(angle) * rad + ((i * 7) % 5) - 2.5;
      const z = Math.sin(angle) * rad + ((i * 11) % 5) - 2.5;
      forestTrees.push({ x, z, isOak: i % 3 === 0, scale: 0.85 + (i % 5) * 0.15 });
    }

    forestTrees.forEach((t) => {
      const tree = new THREE.Group();
      tree.position.set(t.x, 0, t.z);
      tree.scale.set(t.scale, t.scale, t.scale);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.9, 8), trunkMat);
      trunk.position.y = 0.45;
      trunk.castShadow = true;
      tree.add(trunk);

      if (t.isOak) {
        // Lush rounded oak canopy
        const foliage = new THREE.Mesh(new THREE.IcosahedronGeometry(1.65, 1), oakMat);
        foliage.position.y = 1.9;
        foliage.castShadow = true;
        tree.add(foliage);
      } else {
        // Multi-tier pine tree
        const f1 = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.2, 8), pineMat1);
        f1.position.y = 1.5;
        f1.castShadow = true;
        tree.add(f1);
        const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.8, 8), pineMat2);
        f2.position.y = 2.4;
        f2.castShadow = true;
        tree.add(f2);
      }
      this.neighbourhoodGroup.add(tree);
    });

    // Scattered hillside boulders
    for (let r = 0; r < 20; r++) {
      const angle = (r / 20) * Math.PI * 2;
      const rDist = 42 + ((r * 9) % 24);
      const rx = Math.cos(angle) * rDist;
      const rz = Math.sin(angle) * rDist;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.75 + (r % 3) * 0.4, 0),
        rockMat
      );
      rock.position.set(rx, 0.3, rz);
      rock.rotation.set(r * 0.4, r * 0.7, r * 0.2);
      rock.castShadow = true;
      this.neighbourhoodGroup.add(rock);
    }
  }

  _addPeakedRoof(parent, w, d, y, color) {
    const roof = new THREE.Group();
    roof.visible = this._roofsVisible;
    const mat = stdMat({ color, roughness: 0.82 });

    const peakHeight = Math.max(1.35, Math.min(2.8, w * 0.38));
    const halfW = w / 2 + 0.32;
    const slopeAngle = Math.atan2(peakHeight, halfW);
    const slopeLen = Math.hypot(peakHeight, halfW) + 0.22;
    const depthWithOverhang = d + 0.75;

    // Pitch panels: -side * slopeAngle ensures a peaked /\ roof shape
    [-1, 1].forEach((side) => {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(slopeLen, 0.2, depthWithOverhang), mat);
      panel.position.set(side * (halfW * 0.5), y + peakHeight * 0.5, 0);
      panel.rotation.z = -side * slopeAngle;
      panel.castShadow = true;
      roof.add(panel);
    });

    // Solid timber ridge cap running along the peak
    const ridge = new THREE.Mesh(
      new RoundedBoxGeometry(0.26, 0.18, depthWithOverhang + 0.06, 1, 0.04),
      stdMat({ color: PALETTE.timberDark, roughness: 0.85 })
    );
    ridge.position.set(0, y + peakHeight + 0.04, 0);
    ridge.castShadow = true;
    roof.add(ridge);

    // Front and back timber gable infill
    const gableMat = stdMat({ color: PALETTE.timberDark, roughness: 0.85, side: THREE.DoubleSide });
    [-1, 1].forEach((gz) => {
      const gableGeo = new THREE.BufferGeometry();
      const zPos = gz * (d / 2 + 0.02);
      const vertices = new Float32Array([
        -halfW, y, zPos,
        halfW, y, zPos,
        0, y + peakHeight, zPos,
      ]);
      gableGeo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
      gableGeo.computeVertexNormals();
      const gableMesh = new THREE.Mesh(gableGeo, gableMat);
      gableMesh.castShadow = true;
      roof.add(gableMesh);
    });

    parent.add(roof);
    this._roofGroups.push(roof);
    return roof;
  }

  toggleRoofs(visible) {
    if (visible === undefined) {
      this._roofsVisible = !this._roofsVisible;
    } else {
      this._roofsVisible = !!visible;
    }
    for (const roof of this._roofGroups) {
      roof.visible = this._roofsVisible;
    }
    for (const id in this._frontFacadesByBuildingId) {
      const front = this._frontFacadesByBuildingId[id];
      if (front) front.visible = this._roofsVisible;
    }
    this._openedBuildingId = null;
    return this._roofsVisible;
  }

  openBuildingInterior(buildingId) {
    this._openedBuildingId = buildingId;
    for (const id in this._roofsByBuildingId) {
      const roof = this._roofsByBuildingId[id];
      const front = this._frontFacadesByBuildingId[id];
      if (id === buildingId) {
        if (roof) roof.visible = false;
        if (front) front.visible = false;
      } else {
        if (roof) roof.visible = this._roofsVisible;
        if (front) front.visible = this._roofsVisible;
      }
    }
  }

  closeAllBuildingInteriors() {
    this._openedBuildingId = null;
    for (const id in this._roofsByBuildingId) {
      const roof = this._roofsByBuildingId[id];
      const front = this._frontFacadesByBuildingId[id];
      if (roof) roof.visible = this._roofsVisible;
      if (front) front.visible = this._roofsVisible;
    }
  }

  _buildBuildingShell(group, building, w, d) {
    const plinth = new THREE.Mesh(
      new RoundedBoxGeometry(w + 0.25, 0.35, d + 0.25, 2, 0.08),
      stdMat({ color: PALETTE.stoneDark, roughness: 0.9 })
    );
    plinth.position.y = -0.32;
    plinth.receiveShadow = true;
    group.add(plinth);

    const floorMaterialKey = surfaceMaterialKey(this._surfaces, "floor", "wood");
    const floor = new THREE.Mesh(
      new RoundedBoxGeometry(w, 0.3, d, 3, 0.12),
      texturedMat(floorMaterialKey, surfaceColor(this._surfaces, "floor", PALETTE.floor), w, d, { roughness: 0.86, metalness: 0.02 }),
    );
    floor.position.y = -0.15;
    floor.receiveShadow = true;
    group.add(floor);

    const wallH = 2.4;
    const wallY = wallH / 2 - 0.15;
    const wallThick = 0.18;
    const wallMaterialKey = surfaceMaterialKey(this._surfaces, "wall", "plaster");
    const wallMat = texturedMat(wallMaterialKey, surfaceColor(this._surfaces, "wall", PALETTE.wall), (w + d) / 2, wallH, { roughness: 0.85, metalness: 0.0 });
    const sillMat = stdMat({ color: 0x8c7a65, roughness: 0.85 });
    const frameMat = stdMat({ color: 0x4a3b2c, roughness: 0.85 });
    const windowGlowMat = stdMat({
      color: 0xffaa33,
      emissive: 0xffaa33,
      emissiveIntensity: 0.35,
      roughness: 0.4,
      transparent: true,
      opacity: 0.85,
    });

    // 1. Back Wall (z = -d / 2)
    const backWall = new THREE.Mesh(new RoundedBoxGeometry(w, wallH, wallThick, 2, 0.05), wallMat);
    backWall.position.set(0, wallY, -d / 2);
    backWall.receiveShadow = true; backWall.castShadow = true;
    group.add(backWall);

    // Back Window
    const backSill = new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.06, 0.22, 1, 0.02), sillMat);
    backSill.position.set(0, 1.0, -d / 2 + 0.1);
    backSill.castShadow = true; group.add(backSill);
    const backFrame = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.9, 0.06, 1, 0.02), frameMat);
    backFrame.position.set(0, 1.45, -d / 2 + 0.04);
    group.add(backFrame);
    const windowPane = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.75), windowGlowMat);
    windowPane.position.set(0, 1.45, -d / 2 + 0.08);
    group.add(windowPane);

    // 2. Left Wall (x = -w / 2)
    const leftWall = new THREE.Mesh(new RoundedBoxGeometry(wallThick, wallH, d, 2, 0.05), wallMat);
    leftWall.position.set(-w / 2, wallY, 0);
    leftWall.receiveShadow = true; leftWall.castShadow = true;
    group.add(leftWall);

    // Left Window
    const leftSill = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.06, 1.0, 1, 0.02), sillMat);
    leftSill.position.set(-w / 2 + 0.1, 1.0, 0);
    leftSill.castShadow = true; group.add(leftSill);
    const leftFrame = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.9, 0.9, 1, 0.02), frameMat);
    leftFrame.position.set(-w / 2 + 0.04, 1.45, 0);
    group.add(leftFrame);
    const sidePane = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75), windowGlowMat);
    sidePane.rotation.y = Math.PI / 2;
    sidePane.position.set(-w / 2 + 0.08, 1.45, 0);
    group.add(sidePane);

    // 3. Right Wall (x = +w / 2)
    const rightWall = new THREE.Mesh(new RoundedBoxGeometry(wallThick, wallH, d, 2, 0.05), wallMat);
    rightWall.position.set(w / 2, wallY, 0);
    rightWall.receiveShadow = true; rightWall.castShadow = true;
    group.add(rightWall);

    // Right Window
    const rightFrame = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.9, 0.9, 1, 0.02), frameMat);
    rightFrame.position.set(w / 2 - 0.04, 1.45, 0);
    group.add(rightFrame);
    const rightPane = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75), windowGlowMat);
    rightPane.rotation.y = -Math.PI / 2;
    rightPane.position.set(w / 2 - 0.08, 1.45, 0);
    group.add(rightPane);

    // 4. Front Facade Group (Opens to reveal interior floor plan when inspected!)
    const frontFacade = new THREE.Group();
    frontFacade.visible = this._roofsVisible;
    const doorW = Math.min(1.4, w * 0.32);
    const doorH = 1.95;
    const sideW = (w - doorW) / 2;

    const frontLeft = new THREE.Mesh(new RoundedBoxGeometry(sideW, wallH, wallThick, 2, 0.05), wallMat);
    frontLeft.position.set(-(w / 2 - sideW / 2), wallY, d / 2);
    frontLeft.receiveShadow = true; frontLeft.castShadow = true;
    frontFacade.add(frontLeft);

    const frontRight = new THREE.Mesh(new RoundedBoxGeometry(sideW, wallH, wallThick, 2, 0.05), wallMat);
    frontRight.position.set(w / 2 - sideW / 2, wallY, d / 2);
    frontRight.receiveShadow = true; frontRight.castShadow = true;
    frontFacade.add(frontRight);

    const lintelH = wallH - doorH;
    const lintel = new THREE.Mesh(new RoundedBoxGeometry(doorW + 0.1, lintelH, wallThick + 0.04, 1, 0.02), stdMat({ color: PALETTE.timberDark, roughness: 0.85 }));
    lintel.position.set(0, doorH + lintelH / 2 - 0.15, d / 2);
    lintel.castShadow = true;
    frontFacade.add(lintel);

    const doorMat = stdMat({ color: PALETTE.woodDark, roughness: 0.75 });
    const doorLeaf = new THREE.Mesh(new RoundedBoxGeometry(doorW * 0.85, doorH * 0.96, 0.06, 1, 0.02), doorMat);
    doorLeaf.position.set(-doorW * 0.18, doorH / 2 - 0.15, d / 2 + 0.05);
    doorLeaf.rotation.y = -0.28;
    doorLeaf.castShadow = true;
    frontFacade.add(doorLeaf);

    group.add(frontFacade);
    this._frontFacadesByBuildingId[building.id] = frontFacade;

    // 5. Corner Timber Posts (4 Corners)
    [-w / 2, w / 2].forEach((px) => {
      [-d / 2, d / 2].forEach((pz) => {
        const post = new THREE.Mesh(new RoundedBoxGeometry(0.22, wallH + 0.1, 0.22, 1, 0.03), stdMat({ color: PALETTE.timberDark, roughness: 0.85 }));
        post.position.set(px, wallY, pz);
        post.castShadow = true;
        group.add(post);
      });
    });

    // 6. Peaked Gabled Roof on this building!
    const roofColor = building.type === "workshop" ? PALETTE.roofSlate : building.type === "shop" ? PALETTE.roofTerracotta : PALETTE.roofTimber;
    const roof = this._addPeakedRoof(group, w, d, wallH - 0.15, roofColor);
    this._roofsByBuildingId[building.id] = roof;

    if (building.type === "shop") {
      const deck = new THREE.Mesh(
        new RoundedBoxGeometry(w + 0.4, 0.08, 1.4, 1, 0.02),
        stdMat({ color: 0x78350f, roughness: 0.8 })
      );
      deck.position.set(0, -0.04, d / 2 + 0.7);
      deck.receiveShadow = true;
      group.add(deck);

      const barrel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.55, 10), stdMat({ color: 0x6e4a2d, roughness: 0.7 }));
      barrel1.position.set(w / 2 - 0.3, 0.25, d / 2 + 0.5);
      barrel1.castShadow = true;
      group.add(barrel1);
      const barrel2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.5, 10), stdMat({ color: 0x5c3d2e, roughness: 0.7 }));
      barrel2.position.set(w / 2 - 0.7, 0.23, d / 2 + 0.5);
      barrel2.castShadow = true;
      group.add(barrel2);

      const lanternLight = new THREE.PointLight(0xffaa33, 0.8, 4, 2);
      lanternLight.position.set(0, 1.8, d / 2 + 0.4);
      lanternLight.userData.baseIntensity = 0.8;
      lanternLight.userData.isStreetLamp = true;
      group.add(lanternLight);
      this._pointLights.push(lanternLight);
    } else if (building.type === "workshop") {
      const chimney = new THREE.Mesh(
        new RoundedBoxGeometry(0.75, 3.4, 0.75, 1, 0.05),
        stdMat({ color: PALETTE.stoneDark, roughness: 0.9 })
      );
      chimney.position.set(-w / 2 + 0.4, 1.7, -d / 2 + 0.4);
      chimney.castShadow = true;
      group.add(chimney);

      const anvil = new THREE.Mesh(
        new RoundedBoxGeometry(0.38, 0.4, 0.24, 1, 0.02),
        stdMat({ color: 0x334155, roughness: 0.4, metalness: 0.8 })
      );
      anvil.position.set(w / 2 + 0.45, 0.2, 0);
      anvil.castShadow = true;
      group.add(anvil);
    } else {
      const flowerBox = new THREE.Mesh(
        new RoundedBoxGeometry(1.0, 0.14, 0.18, 1, 0.02),
        stdMat({ color: 0x78350f, roughness: 0.8 })
      );
      flowerBox.position.set(0, 0.92, -d / 2 + 0.16);
      group.add(flowerBox);

      const flowers = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 6, 6),
        stdMat({ color: 0xef4444, roughness: 0.6 })
      );
      flowers.position.set(-0.2, 1.04, -d / 2 + 0.16);
      group.add(flowers);
      const flowers2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 6, 6),
        stdMat({ color: 0xf59e0b, roughness: 0.6 })
      );
      flowers2.position.set(0.2, 1.04, -d / 2 + 0.16);
      group.add(flowers2);
    }

    const trimKey = building.type === "workshop" ? "trimWorkshop" : building.type === "shop" ? "trimShop" : null;
    const trimColor = trimKey ? surfaceColor(this._surfaces, trimKey, PALETTE[trimKey]) : 0x8a5a34;
    this._buildSignPost(group, building.label, w / 2 + 0.3, d / 2 - 0.3, trimColor);

    const isHouseOne = building.id === "dwelling-1";
    const interiorLight = new THREE.PointLight(isHouseOne ? 0xffaa44 : 0xffb066, isHouseOne ? 0.8 : 0.4, isHouseOne ? 7 : w * 1.1, 2);
    interiorLight.position.set(0, 1.9, 0);
    interiorLight.userData.baseIntensity = isHouseOne ? 0.8 : 0.25;
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
        return new THREE.BoxGeometry(0.2, 0.2, 0.2);
    }
  }

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
    const activePointers = new Map();
    let initialPinchDist = null;
    let initialCamDist = this._camDist || 18;
    let clickStartX = 0, clickStartY = 0;

    const onDown = (e) => {
      if (this._isDroneTour) this.stopDroneTour();
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size === 1) {
        this._orbit.dragging = true;
        this._orbit.startX = e.clientX;
        this._orbit.startY = e.clientY;
        clickStartX = e.clientX;
        clickStartY = e.clientY;
        this._orbit.startDelta = this._orbit.delta;
        this._orbit.startPitch = this._orbit.pitch || 0.58;
        initialPinchDist = null;
      } else if (activePointers.size === 2) {
        this._orbit.dragging = false;
        const [p1, p2] = Array.from(activePointers.values());
        initialPinchDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        initialCamDist = this._camDist || 18;
      }
    };

    const onMove = (e) => {
      if (!activePointers.has(e.pointerId)) return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size === 2 && initialPinchDist) {
        const [p1, p2] = Array.from(activePointers.values());
        const currentDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        const ratio = initialPinchDist / Math.max(1, currentDist);
        this._camDist = Math.max(7, Math.min(140, initialCamDist * ratio));
        this._targetCamDist = this._camDist;
        return;
      }

      if (this._orbit.dragging && activePointers.size === 1) {
        const dx = (e.clientX - this._orbit.startX) / Math.max(1, canvas.clientWidth);
        const dy = (e.clientY - this._orbit.startY) / Math.max(1, canvas.clientHeight);
        this._orbit.delta = this._orbit.startDelta + dx * 2.2;
        this._orbit.pitch = Math.max(0.12, Math.min(1.35, this._orbit.startPitch + dy * 1.2));
      }
    };

    const onUp = (e) => {
      activePointers.delete(e.pointerId);
      if (this._orbit.dragging) {
        const dist = Math.hypot(e.clientX - clickStartX, e.clientY - clickStartY);
        if (dist < 6) {
          this._inspectClick(e);
        }
      }
      if (activePointers.size === 0) {
        this._orbit.dragging = false;
        initialPinchDist = null;
      } else if (activePointers.size === 1) {
        const remaining = Array.from(activePointers.values())[0];
        this._orbit.dragging = true;
        this._orbit.startX = remaining.x;
        this._orbit.startY = remaining.y;
        this._orbit.startDelta = this._orbit.delta;
        this._orbit.startPitch = this._orbit.pitch || 0.58;
        initialPinchDist = null;
      }
    };

    const onWheel = (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      this._camDist = Math.max(7, Math.min(140, (this._camDist || 18) * zoomFactor));
      this._targetCamDist = this._camDist;
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape" && this._isDroneTour) {
        this.stopDroneTour();
      }
    };

    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);

    this._unbindOrbit = () => {
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("wheel", onWheel);
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

    const clickTargets = [];
    if (this._thoughtBubbles) clickTargets.push(...this._thoughtBubbles);
    if (this._floatingLabels) clickTargets.push(...this._floatingLabels);

    if (clickTargets.length > 0) {
      const spriteHits = this._raycaster.intersectObjects(clickTargets);
      if (spriteHits.length > 0) {
        const hitSprite = spriteHits[0].object;
        if (hitSprite.userData && hitSprite.userData.parcelId) {
          const parcelId = hitSprite.userData.parcelId;
          if (this._districtTargets[parcelId]) {
            this.focusDistrict(parcelId);
            return;
          }
          if (parcelId === "outdoors") {
            const outdoorPlacements = (this.nextWorld.placements || []).filter((p) => p.location === "outdoors").map((p) => p.type);
            this.focusDistrict("town");
            this.onInspect({
              parcelId: "outdoors",
              label: "The Town Square & Market",
              type: "central plaza",
              occupants: "Althea, Master Vane, Elora, Rowan (Roaming)",
              contents: outdoorPlacements.length ? outdoorPlacements.join(", ") : "Well, market stalls, trees, lanterns",
            });
            return;
          }
          const bGroup = this._buildingGroupsById[parcelId];
          const b = (this.nextWorld.buildings || []).find((item) => item.id === parcelId);
          const bPlacements = (this.nextWorld.placements || []).filter((p) => p.location === parcelId).map((p) => p.type);
          const bSims = (this.nextWorld.sims || []).filter((s) => s.home === parcelId).map((s) => s.id);
          this.focusParcel(parcelId);
          this.onInspect({
            parcelId,
            label: getGroundedBuildingLabel(parcelId, b ? b.label : (bGroup ? bGroup.userData.label : parcelId)),
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
        label: getGroundedBuildingLabel(bId, b ? b.label : bId),
        type: b ? b.type : "dwelling",
        occupants: bSims.length ? bSims.join(", ") : "None assigned",
        contents: bPlacements.length ? bPlacements.join(", ") : "Standard fixtures",
      });
    } else {
      // Check hit position to see if a specific district was clicked
      const hitPoint = intersects[0].point;
      let targetDistrict = "outdoors";
      let label = "The Town Square & Market";

      if (hitPoint.z > 22) {
        targetDistrict = "docks";
        label = "The Riverfront & Docks";
        this.focusDistrict("docks");
      } else if (hitPoint.z < -28) {
        targetDistrict = "watchtower";
        label = "The Hilltop Watchtower & Farmlands";
        this.focusDistrict("watchtower");
      } else if (hitPoint.x < -16) {
        targetDistrict = "forge";
        label = "The Crafting Quarter (Forge)";
        this.focusDistrict("forge");
      } else if (hitPoint.x > 14) {
        targetDistrict = "residential";
        label = "The Residential Borough (Cottages)";
        this.focusDistrict("residential");
      } else {
        targetDistrict = "town";
        label = "The Town Square & Market";
        this.focusDistrict("town");
      }

      const outdoorPlacements = placements.filter((p) => p.location === "outdoors").map((p) => p.type);
      this.onInspect({
        parcelId: targetDistrict,
        label,
        type: "district",
        occupants: "Althea, Master Vane, Elora, Rowan (Roaming)",
        contents: outdoorPlacements.length ? outdoorPlacements.join(", ") : "District architecture & props",
      });
    }
  }

  focusOn(targetVec3, dist = 14) {
    this._startLookAt.copy(this._lookAt);
    this._targetLookAt.copy(targetVec3);
    this._startCamDist = this._camDist || 18;
    this._targetCamDist = dist;
    this._cameraAnimStartTime = performance.now();
  }

  focusDistrict(districtName) {
    this.closeAllBuildingInteriors();
    const d = this._districtTargets[districtName];
    if (d) {
      this.focusOn(d.pos, d.dist);
      if (this.onInspect) {
        this.onInspect({
          parcelId: districtName,
          label: d.label,
          type: "district",
          occupants: "Althea, Master Vane, Elora, Rowan (Roaming)",
          contents: "District architecture, props & landscaping",
        });
      }
    } else {
      this.resetView();
    }
  }

  focusParcel(parcelId) {
    if (this._districtTargets[parcelId]) {
      this.closeAllBuildingInteriors();
      this.focusDistrict(parcelId);
      return;
    }
    if (parcelId === "outdoors" || !parcelId) {
      this.closeAllBuildingInteriors();
      this.focusDistrict("town");
      return;
    }
    const group = this._buildingGroupsById[parcelId];
    if (group) {
      const pos = group.position.clone();
      pos.y = 1.0;
      this.focusOn(pos, 10.5);
      // Reveal the interior floor plan of this building!
      this.openBuildingInterior(parcelId);
    } else {
      this.resetView();
    }
  }

  focusPreset(presetText) {
    const text = String(presetText).toLowerCase();
    if (text.includes("tavern") || text.includes("table")) {
      this.focusParcel("shop");
    } else if (text.includes("forge") || text.includes("workshop") || text.includes("anvil")) {
      this.focusDistrict("forge");
    } else if (text.includes("dock") || text.includes("pier") || text.includes("boat") || text.includes("river") || text.includes("skiff")) {
      this.focusDistrict("docks");
    } else if (text.includes("watchtower") || text.includes("tower") || text.includes("windmill") || text.includes("wheat")) {
      this.focusDistrict("watchtower");
    } else if (text.includes("cottage") || text.includes("house") || text.includes("borough")) {
      this.focusDistrict("residential");
    } else {
      this.focusDistrict("town");
    }
  }

  resetView() {
    this._startLookAt.copy(this._lookAt);
    this._targetLookAt.set(0, 0.9, 0);
    this._startCamDist = this._camDist || 18;
    this._targetCamDist = 18;
    this._cameraAnimStartTime = performance.now();
    this._orbit.delta = 0;
    this._orbit.pitch = 0.58;
    this.closeAllBuildingInteriors();
  }

  rotateCamera(deltaAngle) {
    if (this._isDroneTour) this.stopDroneTour();
    this._orbit.delta += deltaAngle;
  }

  pitchCamera(deltaPitch) {
    if (this._isDroneTour) this.stopDroneTour();
    this._orbit.pitch = Math.max(0.12, Math.min(1.35, (this._orbit.pitch || 0.58) + deltaPitch));
  }

  zoomCamera(factor) {
    if (this._isDroneTour) this.stopDroneTour();
    this._camDist = Math.max(7, Math.min(140, (this._camDist || 18) * factor));
    this._targetCamDist = this._camDist;
  }

  setTimeOfDay(todKey) {
    if (todKey === "day") this._overrideHour = 12;
    else if (todKey === "dusk") this._overrideHour = 19.5;
    else if (todKey === "night") this._overrideHour = 1.5;
    else this._overrideHour = null;
  }

  _resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    const REFERENCE_ASPECT = 1.35;
    const aspect = w / h;
    this._cameraFit = aspect < REFERENCE_ASPECT ? REFERENCE_ASPECT / aspect : 1;
  }

  destroy() {
    this._ro.disconnect();
    this._unbindOrbit();
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
    if (!this._neighbourhoodBuilt) return;
    if (this.reducedMotion) t = 1;
    const prev = this.prevWorld || w;

    // Windmill sails animation
    if (this._windmillSails && !this.reducedMotion) {
      this._windmillSails.rotation.z += 0.012;
    }

    // Camera interpolation
    if (this._cameraAnimStartTime > 0 && !this.reducedMotion) {
      const elapsed = performance.now() - this._cameraAnimStartTime;
      const progress = Math.min(1, elapsed / this._cameraAnimDuration);
      const ease = 1 - Math.pow(1 - progress, 3);
      this._lookAt.lerpVectors(this._startLookAt, this._targetLookAt, ease);
      this._camDist = lerp(this._startCamDist, this._targetCamDist, ease);
      if (progress >= 1) this._cameraAnimStartTime = 0;
    }

    // Item drop animation
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

    // Time of day calculation
    const simHour = (prev.tick + t) % 24;
    const targetHour = this._overrideHour !== null ? this._overrideHour : simHour;
    if (Math.abs(this._currentHour - targetHour) > 0.05) {
      this._currentHour = lerp(this._currentHour, targetHour, 0.08);
    } else {
      this._currentHour = targetHour;
    }
    const sun = sunFor(this._currentHour);

    // Sun position & lighting
    const dist = Math.max(30, (this._camDist || 18) * 1.5);
    const sx = Math.cos(sun.azimuth) * Math.cos(sun.elevation) * dist;
    const sy = Math.max(0.6, Math.sin(sun.elevation) * dist);
    const sz = Math.sin(sun.azimuth) * Math.cos(sun.elevation) * dist;
    this.sun.position.set(sx + this._lookAt.x, sy, sz + this._lookAt.z);
    this.sun.target.position.copy(this._lookAt);

    const nightAmt = 1 - sun.dayAmt;
    const daySunIntensity = lerp(0.55, 1.25, Math.min(1, sun.elevation));
    this.sun.intensity = lerp(0.08, daySunIntensity, sun.dayAmt);
    const sunColor = sun.warmth >= 1 ? SUN_COLOR_DAY : SUN_COLOR_WARM.clone().lerp(SUN_COLOR_DAY, sun.warmth);
    this.sun.color.copy(SUN_COLOR_NIGHT).lerp(sunColor, sun.dayAmt);

    const dayHemi = lerp(0.2, 0.35, Math.min(1, sun.elevation));
    this.hemi.intensity = lerp(0.08, dayHemi, sun.dayAmt);

    for (const light of this._pointLights) {
      const base = light.userData.baseIntensity || 0.4;
      const nightMult = light.userData.isStreetLamp ? 2.6 : 1.4;
      light.intensity = lerp(base * 0.2, base * nightMult, nightAmt);
    }
    for (const mat of this._emissiveAnimated) {
      mat.emissiveIntensity = lerp(0.4, 4.5, nightAmt);
    }

    this.renderer.toneMappingExposure = lerp(1.08, 0.76, nightAmt);
    this.scene.environmentIntensity = lerp(1.3, 0.2, nightAmt);

    const daySky = SKY_DUSK.clone().lerp(SKY_DAY, sun.warmth);
    const sky = SKY_NIGHT.clone().lerp(daySky, sun.dayAmt);
    const horizon = sky.clone().lerp(SKY_HORIZON, lerp(0.35, 0.65, sun.dayAmt));
    updateSkyGradient(this._skyGradient, sky, horizon);
    this.audio.updateAmbient(nightAmt);

    if (this.spatialDiff && this._diffEmeraldMat) {
      this._diffEmeraldMat.emissiveIntensity = 0.7 + Math.sin(performance.now() / 200) * 0.35;
    }

    // Smoke particles update
    if (!this.reducedMotion && this._neighbourhoodBuilt) {
      const nowSec = performance.now() / 1000;
      if (this._smokeParticles.length < 32 && Math.random() < 0.4) {
        const emitterPos = this._smokeEmitters[Math.floor(Math.random() * this._smokeEmitters.length)];
        const smokeGeo = new THREE.SphereGeometry(0.14, 8, 8);
        const smokeMat = new THREE.MeshBasicMaterial({ color: 0xd6d6d6, transparent: true, opacity: 0.38, depthWrite: false });
        const mesh = new THREE.Mesh(smokeGeo, smokeMat);
        mesh.position.copy(emitterPos);
        this.scene.add(mesh);
        this._smokeParticles.push({
          mesh,
          origin: emitterPos.clone(),
          life: 0,
          maxLife: 2.8,
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
        p.mesh.position.y = p.origin.y + progress * 2.0;
        p.mesh.position.x = p.origin.x + Math.sin(nowSec * 2 + p.phase) * 0.22 * progress;
        p.mesh.position.z = p.origin.z + Math.cos(nowSec * 1.5 + p.phase) * 0.15 * progress;
        const scale = lerp(1.0, 3.6, progress);
        p.mesh.scale.set(scale, scale, scale);
        p.mesh.material.opacity = lerp(0.38, 0, progress);
        return true;
      });
    }

    // Fireflies update
    if (this._fireflies && this._fireflies.length > 0) {
      const nowSec = performance.now() / 1000;
      const targetOpacity = nightAmt > 0.18 ? lerp(0, 0.9, (nightAmt - 0.18) / 0.82) : 0;
      this._fireflies.forEach((f) => {
        f.mesh.position.x = f.basePos.x + Math.sin(nowSec * 1.4 + f.phase) * 0.5;
        f.mesh.position.y = f.basePos.y + Math.sin(nowSec * 2.2 + f.phase * 1.5) * 0.3;
        f.mesh.position.z = f.basePos.z + Math.cos(nowSec * 1.6 + f.phase) * 0.5;
        f.mesh.material.opacity = lerp(f.mesh.material.opacity, targetOpacity, 0.05);
      });
    }

    // Dust particles update
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

    // Thought bubbles bobbing
    if (this._thoughtBubbles && this._thoughtBubbles.length > 0) {
      const nowSec = performance.now() / 1000;
      this._thoughtBubbles.forEach((tb) => {
        tb.position.y = tb.userData.basePosY + Math.sin(nowSec * 2.2 + tb.userData.phase) * 0.08;
      });
    }

    // Collision boxes fade
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

    // Camera positioning: Drone Tour vs Orbit Camera
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
      const pitch = this._orbit.pitch || 0.58;
      const fit = this._cameraFit || 1;
      const currentDist = (this._camDist || 18) * fit;
      const camY = Math.sin(pitch) * currentDist * 0.95;
      const camXZDist = Math.cos(pitch) * currentDist;

      this.camera.position.set(
        this._lookAt.x + Math.sin(az) * camXZDist,
        this._lookAt.y + Math.max(1.8, camY),
        this._lookAt.z + Math.cos(az) * camXZDist
      );
      this.camera.lookAt(this._lookAt);
    }

    // Sims interpolation
    const sims = w.sims || [];
    sims.forEach((sim, i) => {
      const home = this._buildingsById[sim.home];
      const homeScale = this._buildingScaleById[sim.home];
      if (!home || !homeScale) return;
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

    this.renderer.render(this.scene, this.camera);
  }

  _buildSim(index) {
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

export class WorldRenderer {
  constructor(canvas, opts = {}) {
    try {
      this._impl = webglAvailable() ? new Renderer3D(canvas, opts) : new WorldRenderer2D(canvas, opts);
    } catch (err) {
      console.warn("Renderer3D failed, falling back to WorldRenderer2D:", err);
      this._impl = new WorldRenderer2D(canvas, opts);
    }
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
  focusDistrict(districtName) {
    if (this._impl.focusDistrict) this._impl.focusDistrict(districtName);
  }
  focusPreset(presetText) {
    if (this._impl.focusPreset) this._impl.focusPreset(presetText);
  }
  resetView() {
    if (this._impl.resetView) this._impl.resetView();
  }
  rotateCamera(angle) {
    if (this._impl.rotateCamera) this._impl.rotateCamera(angle);
  }
  pitchCamera(angle) {
    if (this._impl.pitchCamera) this._impl.pitchCamera(angle);
  }
  zoomCamera(factor) {
    if (this._impl.zoomCamera) this._impl.zoomCamera(factor);
  }
  setTimeOfDay(todKey) {
    if (this._impl.setTimeOfDay) this._impl.setTimeOfDay(todKey);
  }
  toggleRoofs(visible) {
    return this._impl.toggleRoofs ? this._impl.toggleRoofs(visible) : true;
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
  openBuildingInterior(buildingId) {
    if (this._impl.openBuildingInterior) this._impl.openBuildingInterior(buildingId);
  }
  closeAllBuildingInteriors() {
    if (this._impl.closeAllBuildingInteriors) this._impl.closeAllBuildingInteriors();
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

export function renderWorld(canvas, world, opts = {}) {
  const renderer = new WorldRenderer(canvas, opts);
  renderer.pushTick(world);
  renderer.draw(1);
  return renderer;
}
