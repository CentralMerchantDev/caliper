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
import { HDRLoader } from "./vendor/three/addons/loaders/HDRLoader.js";
import { Sky } from "./vendor/three/addons/objects/Sky.js";
import { EffectComposer } from "./vendor/three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "./vendor/three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./vendor/three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "./vendor/three/addons/postprocessing/ShaderPass.js";
import { VignetteShader } from "./vendor/three/addons/shaders/VignetteShader.js";
import { OutputPass } from "./vendor/three/addons/postprocessing/OutputPass.js";
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

// Authoritative Master City Spatial Zoning and Setback Constants
export const CITY_ZONING = {
  ROAD_CARRIAGEWAY: { zMin: 9.4, zMax: 13.8 },
  NORTH_SIDEWALK: { zMin: 8.2, zMax: 9.4 },
  SOUTH_SIDEWALK: { zMin: 13.8, zMax: 15.8 },
  SIDE_AVENUE_WEST: { xMin: -20.1, xMax: -15.9, zMin: -14.0, zMax: 13.8 },
  SIDE_AVENUE_EAST: { xMin: 15.9, xMax: 20.1, zMin: -14.0, zMax: 13.8 },
  WATERFRONT_SEAWALL: { zMin: 22.0 },
  FOUNTAIN_PIAZZA: { x: 0, z: 18.8, radius: 2.45 },
  COMPASS_PLAZA: { x: 0, z: 0, radius: 1.6 },
  ROAD_SETBACK: 0.35,      // buffer from roadway/curb
  BUILDING_SETBACK: 0.55,  // buffer from building footprints/plinths
  OBJECT_SETBACK: 0.25,    // buffer from outdoor props
  CANDIDATE_HALF_W: 0.70,  // Candidate bench/fixture half-width (1.4m W)
  CANDIDATE_HALF_D: 0.40,  // Candidate bench/fixture half-depth (0.8m D)
};

const PALETTE = {
  floor: 0xe2d9cc,
  wall: 0xf8fafc,
  ground: 0x477038,
  path: 0xded7cc,
  sandstone: 0xeae1d2,
  oceanBlue: 0x0284c7,
  oceanDeep: 0x075985,
  terracotta: 0xc2593f,
  teak: 0x854d0e,
  charcoal: 0x1e293b,
  glass: 0x93c5fd,
  yachtWhite: 0xffffff,
  palmGreen: 0x166534,
  stoneDark: 0x334155,
  stoneLight: 0x94a3b8,
  timberDark: 0x3f2212,
  timberLight: 0x9a6439,
  trimShop: 0x0284c7,
  trimWorkshop: 0x0f766e,
  woodDark: 0x4a3424,
  accent: 0xf59e0b,
  sim2: 0x0284c7,
  roofTimber: 0x854d0e,
  roofRose: 0xc2593f,
  roofSlate: 0x1e293b,
  roofTerracotta: 0xc2593f,
  riverWater: 0x0284c7,
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

function makeAsphaltTexture() {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#1e2229";
  ctx.fillRect(0, 0, size, size);
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 32;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePavingStoneTexture() {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#57534e";
  ctx.fillRect(0, 0, size, size);

  const rows = 16;
  const cols = 8;
  const rowH = size / rows;
  const colW = size / cols;
  const stoneColors = ["#e7e5e4", "#d6d3d1", "#f5f5f4", "#e2e8f0", "#cbd5e1"];

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (colW / 2);
    for (let cCol = -1; cCol < cols + 1; cCol++) {
      const x = cCol * colW + offset;
      const y = r * rowH;
      const colIdx = Math.floor(Math.random() * stoneColors.length);
      ctx.fillStyle = stoneColors[colIdx];
      ctx.fillRect(x + 2, y + 2, colW - 4, rowH - 4);
    }
  }

  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 16;
    data[i] = Math.min(255, Math.max(0, data[i] + grain));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain));
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeWaterNormalTexture() {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  // Multi-octave sinusoidal wave normal map generator
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 8;
      const v = (y / size) * Math.PI * 8;
      // Synthesize harmonic surface gradients
      const dx = Math.cos(u * 1.5 + v * 0.8) * 0.4 + Math.sin(u * 3.2 - v * 2.1) * 0.25 + Math.cos(u * 6.5 + v * 5.2) * 0.15;
      const dy = Math.sin(u * 0.8 + v * 1.5) * 0.4 + Math.cos(u * 2.1 + v * 3.2) * 0.25 + Math.sin(u * 5.2 - v * 6.5) * 0.15;

      // Convert slope (dx, dy) to RGB normal vector in tangent space [0..255]
      const nx = Math.min(255, Math.max(0, Math.round((dx * 0.5 + 0.5) * 255)));
      const ny = Math.min(255, Math.max(0, Math.round((dy * 0.5 + 0.5) * 255)));
      const nz = Math.min(255, Math.max(0, Math.round((1.0 - Math.hypot(dx, dy) * 0.2) * 255)));

      const idx = (y * size + x) * 4;
      data[idx] = nx;
      data[idx + 1] = ny;
      data[idx + 2] = nz;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
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
  if (id === "shop" || label === "shop" || label === "Tavern") return "Waterfront Espresso Bar";
  if (id === "workshop" || label === "workshop") return "Maritime Prototyping Atelier";
  if (id === "dwelling-1" || label === "dwelling-1" || label === "House 1") return "Marina Villa North";
  if (id === "dwelling-2" || label === "dwelling-2" || label === "House 2") return "Palm Terrace Villa";
  if (id === "outdoors" || label === "outdoors" || label === "Central Plaza") return "Central Civic Promenade";
  if (id === "town") return "The Central Esplanade & Paseo";
  if (id === "forge") return "The Maritime Innovation Atelier";
  if (id === "docks") return "The Waterfront Piazza & Marina";
  if (id === "watchtower") return "The Seaside Headland Rotunda";
  if (id === "residential") return "The Terraced Coastal Villas";
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

  playSuccessChime() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // High-end 3-note ascending major triad (C6 = 1046.5Hz, E6 = 1318.5Hz, G6 = 1568Hz)
      const freqs = [1046.5, 1318.5, 1567.98];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.09, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.45);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.46);
      });
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
      town: { pos: new THREE.Vector3(0, 1.8, 12.0), dist: 46, label: "The Central Civic Promenade & Dual Harbours" },
      forge: { pos: new THREE.Vector3(-28.5, 1.8, -12), dist: 18, label: "The Maritime Innovation Atelier" },
      residential: { pos: new THREE.Vector3(31, 1.5, -8), dist: 22, label: "The Coastal Terraced Villas" },
      docks: { pos: new THREE.Vector3(0, 0.4, 30), dist: 34, label: "The Grand Marina Yacht Club & Bay" },
      watchtower: { pos: new THREE.Vector3(26, 3.5, -20), dist: 22, label: "The Seaside Headland Rotunda & Beacon" },
      datum: { pos: new THREE.Vector3(12.0, 2.0, 18.5), dist: 13, delta: 0, pitch: 0.36, label: "The Datum AEC AI Pavilion (Mark Fraser, Applied AI)" },
    };

    this._diffSlateMat = stdMat({ color: 0x334155, roughness: 0.85, metalness: 0.1 });
    this._diffEmeraldMat = stdMat({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.9, roughness: 0.3 });

    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();

    this._targetLookAt = new THREE.Vector3(0, 4.0, 0.0);
    this._startLookAt = new THREE.Vector3(0, 4.0, 0.0);
    this._targetCamDist = 180;
    this._startCamDist = 180;
    this._camDist = 180;
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
    // Low-angle cinematic perspective looking south towards the marina, breakwater, skyline towers and ocean
    this._orbit = { base: Math.PI * 0.35, delta: 0, pitch: 0.32, dragging: false, startX: 0, startY: 0, startDelta: 0, startPitch: 0.32 };

    // Navigation & Street-Level Navigation Mode State
    this._navigationMode = 'orbit'; // 'orbit' | 'walk' | 'drive'
    this._streetPos = new THREE.Vector3(0, 1.75, 11.6);
    this._streetAngle = Math.PI; // Heading facing South toward marina
    this._streetPitch = 0.0;
    this._streetSpeed = 0.0;
    this._vehicleGroup = null;
    this._keysDown = new Set();
    this._pickCenterActive = false;
    this._onNavModeChange = null;

    // Load saved default camera settings if present
    this._defaultCameraSettings = {
      lookAt: { x: 0, y: 4.0, z: -5.0 },
      dist: 130,
      delta: 0,
      pitch: 0.32
    };
    try {
      const saved = localStorage.getItem('caliper_default_camera_view');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.lookAt) {
          this._defaultCameraSettings = parsed;
        }
      }
    } catch (_) {}
    this._bindOrbitControls();

    this._resize();
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(canvas);
  }

  _initScene() {
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: "high-performance" });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this._skyGradient = makeSkyGradientTexture();
    updateSkyGradient(this._skyGradient, SKY_DAY, SKY_DAY);
    scene.background = this._skyGradient.tex;
    this.scene = scene;

    // Physical Preetham Atmospheric Sky Shader (Sky.js)
    try {
      const sky = new Sky();
      sky.scale.setScalar(3200);
      scene.add(sky);
      const skyUniforms = sky.material.uniforms;
      // Tuned for crystal-clear Australian maritime atmosphere (Melbourne/Gold Coast)
      skyUniforms['turbidity'].value = 1.15;
      skyUniforms['rayleigh'].value = 2.4;
      skyUniforms['mieCoefficient'].value = 0.0003;
      skyUniforms['mieDirectionalG'].value = 0.85;
      this._skyMesh = sky;
      this._skyUniforms = skyUniforms;
    } catch (e) {
      console.warn("Sky shader init deferred:", e);
    }

    // Load 1K CC0 HDRI via PMREMGenerator for authentic PBR specular/diffuse reflections
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      this._pmremGenerator = pmrem;
      pmrem.compileEquirectangularShader();
      const hdrLoader = new HDRLoader();
      hdrLoader.load('./vendor/hdri/kloofendal_48d_partly_cloudy_1k.hdr', (texture) => {
        if (this._disposed) {
          texture.dispose();
          pmrem.dispose();
          this._pmremGenerator = null;
          return;
        }
        try {
          const envMap = pmrem.fromEquirectangular(texture).texture;
          this._hdrEnvMap = envMap;
          this.scene.environment = envMap;
        } finally {
          texture.dispose();
          pmrem.dispose();
          this._pmremGenerator = null;
        }
      }, undefined, (err) => {
        pmrem.dispose();
        this._pmremGenerator = null;
        console.warn("HDRI load deferred:", err);
      });
    } catch (e) {
      console.warn("HDRI PMREM loader init deferred:", e);
    }

    // Direct, reliable PBR lighting calibrated for Australian coastal sun
    const ambient = new THREE.AmbientLight(0xffffff, 0.42);
    scene.add(ambient);
    this.ambient = ambient;

    const hemi = new THREE.HemisphereLight(0x38bdf8, 0x475569, 0.45);
    scene.add(hemi);
    this.hemi = hemi;

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 4500);
    this.camera = camera;
    this._lookAt = new THREE.Vector3(0, 4.0, 0.0);

    // Cinematic Post-Processing Pipeline (EffectComposer + UnrealBloomPass)
    try {
      const composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);
      const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
      const h = typeof window !== 'undefined' ? window.innerHeight : 800;
      const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.10, 0.28, 0.95);
      composer.addPass(bloomPass);
      const vignettePass = new ShaderPass(VignetteShader);
      vignettePass.uniforms["offset"].value = 1.05;
      vignettePass.uniforms["darkness"].value = 0.95;
      composer.addPass(vignettePass);
      const outputPass = new OutputPass();
      composer.addPass(outputPass);
      this.composer = composer;
      this._bloomPass = bloomPass;
      this._vignettePass = vignettePass;
    } catch (e) {
      console.warn("EffectComposer postprocessing deferred:", e);
      this.composer = null;
    }

    // Warm golden-hour sun
    const sun = new THREE.DirectionalLight(0xfff5e6, 1.45);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 240;
    sun.shadow.camera.left = -90;
    sun.shadow.camera.right = 90;
    sun.shadow.camera.top = 90;
    sun.shadow.camera.bottom = -90;
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

    this._placementMeshesById = new Map();
    for (const p of placements) {
      const typeDef = this._objectTypes[p.type];
      if (!typeDef) continue;
      const pColour = p.colour || (p.overrides && p.overrides.color);
      if (p.location === "outdoors") {
        const pos = plotToWorldXZ(p.plot, centerX, centerZ);
        const mesh = this._buildPlacementInstance(typeDef, p, this.neighbourhoodGroup, pos.x, pos.z);
        this._placementMeshesById.set(p.id, { mesh, placement: p, location: p.location, type: p.type, x: pos.x, z: pos.z, colour: pColour });
      } else {
        const home = this._buildingGroupsById[p.location];
        const scale = this._buildingScaleById[p.location];
        if (!home || !scale || !typeDef.local) continue;
        const local = stationLocalXZ(typeDef.local, scale.w * BUILDING_W, scale.d * BUILDING_D);
        const mesh = this._buildPlacementInstance(typeDef, p, home, local.x, local.z);
        this._placementMeshesById.set(p.id, { mesh, placement: p, location: p.location, type: p.type, x: local.x, z: local.z, colour: pColour });
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
        { id: "workshop", text: "Maritime Atelier", pos: new THREE.Vector3(-4.2, 3.2, -4.2) },
        { id: "shop", text: "Waterfront Espresso", pos: new THREE.Vector3(4.2, 3.2, -3.8) },
        { id: "dwelling-2", text: "Palm Terrace Villa", pos: new THREE.Vector3(-4.2, 3.2, 4.2) },
        { id: "dwelling-1", text: "Marina Villa North", pos: new THREE.Vector3(4.2, 3.2, 3.8) },
        { id: "outdoors", text: "Central Esplanade", pos: new THREE.Vector3(0, 2.6, 0) },
        { id: "forge", text: "Innovation Atelier", pos: new THREE.Vector3(-26, 4.5, -12) },
        { id: "residential", text: "Coastal Villas", pos: new THREE.Vector3(26, 4.5, -8) },
        { id: "docks", text: "Marina & Yachts", pos: new THREE.Vector3(0, 3.5, 28) },
        { id: "watchtower", text: "Ocean Beacon", pos: new THREE.Vector3(0, 10.5, -42) },
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

    // 4D Animated Pedestrian NPC Citizens
    this._build4DPedestrians();

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
    this.sun.shadow.camera.left = -(halfW + 55);
    this.sun.shadow.camera.right = halfW + 55;
    this.sun.shadow.camera.top = halfD + 55;
    this.sun.shadow.camera.bottom = -(halfD + 55);
    this.sun.shadow.camera.updateProjectionMatrix();
  }

  _buildGround(buildings, centerX, centerZ, scaleFor) {
    const groundW = 800;
    const groundD = 800;
    const groundMaterialKey = surfaceMaterialKey(this._surfaces, "ground", "grass");
    const terrainGeo = new THREE.PlaneGeometry(groundW, groundD, 128, 128);
    terrainGeo.rotateX(-Math.PI / 2);
    const terrainPos = terrainGeo.attributes.position;

    // Engineered Melbourne / Vancouver coastal topography:
    // Core urban esplanade (-45 <= x <= 45, -26 <= z <= 22) is graded flat at y = 0.0m.
    // South harbour bay (z > 22 to 140) drops down to ocean bed y = -2.2m.
    // Outer peninsula & headland (z > 210 to 400) rises across the bay at y = 3.5m to 14m.
    // North CBD ridgeline (z < -36) rises smoothly to y = 8.5m.
    // East and West coastal promontories (|x| > 85) rise to natural headlands.
    for (let i = 0; i < terrainPos.count; i++) {
      const x = terrainPos.getX(i), z = terrainPos.getZ(i);

      let y = 0.0;
      if (z > 22 && z < 185 && Math.abs(x) < 280) {
        // Sheltered inner bay & marine channel
        const oceanRamp = Math.min(1, (z - 22) / 12);
        y = -2.4 * oceanRamp;
      } else if (z >= 185 && z <= 380) {
        // Distant Southern Harbour Headland & Coastal Parklands across the bay
        const southRise = Math.min(1, (z - 185) / 50);
        y = -1.2 + southRise * 8.5 + Math.sin(x * 0.03) * 1.5;
      } else if (z < -32) {
        // Northern metropolitan ridgeline overlooking the harbour
        const hillProgress = Math.min(1, (-z - 32) / 80);
        y = Math.sin(hillProgress * Math.PI * 0.5) * 8.4 + Math.cos(x * 0.02) * 2.0;
      } else if (Math.abs(x) > 75) {
        // East / West coastal cliffs framing the harbour
        const sideRise = Math.min(1, (Math.abs(x) - 75) / 90);
        y = sideRise * 6.5;
      } else {
        // Core Downtown & Waterfront Promenade Terrace
        y = 0.0;
      }

      terrainPos.setY(i, y);
    }
    terrainGeo.computeVertexNormals();

    const ground = new THREE.Mesh(
      terrainGeo,
      texturedMat(groundMaterialKey, surfaceColor(this._surfaces, "ground", PALETTE.ground), groundW, groundD, { roughness: 0.88, metalness: 0.02 }),
    );
    ground.receiveShadow = true;
    this.neighbourhoodGroup.add(ground);
    this._groundExtent = { w: groundW, d: groundD };

    // =========================================================================
    // MELBOURNE DUAL-HARBOUR TOPOGRAPHY: INNER MARINA BASIN, BRIDGES & VAST OCEAN
    // =========================================================================
    // 1. INNER HARBOUR / YARRA MARINA BASIN (Sheltered turquoise water from z = 22.0 to 65.0, width 520m)
    const innerHarbourGeo = new THREE.PlaneGeometry(560, 48);
    innerHarbourGeo.rotateX(-Math.PI / 2);
    const waterNormals = makeWaterNormalTexture();
    waterNormals.repeat.set(16, 6);
    const innerWaterMat = stdMat({
      color: 0x0284c7, // Sheltered turquoise marina water
      normalMap: waterNormals,
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughness: 0.15,
      metalness: 0.82,
      transparent: true,
      opacity: 0.92,
    });
    const innerHarbour = new THREE.Mesh(innerHarbourGeo, innerWaterMat);
    innerHarbour.position.set(0, -0.42, 44.0);
    this.neighbourhoodGroup.add(innerHarbour);
    this._innerHarbourMesh = innerHarbour;
    this._waterNormalTex = waterNormals;

    // 2. CURVED GRANITE BREAKWATER & LIGHTHOUSE SPIT (Separating Inner Marina & Outer Harbour at z = 68)
    const breakwaterGroup = new THREE.Group();
    breakwaterGroup.position.set(0, -0.3, 68.0);
    this.neighbourhoodGroup.add(breakwaterGroup);

    // West Rock Arm (x = -160 to -24)
    const breakwaterWest = new THREE.Mesh(
      new RoundedBoxGeometry(136, 2.6, 7.5, 3, 0.5),
      stdMat({ color: 0x334155, roughness: 0.94, metalness: 0.05 })
    );
    breakwaterWest.position.set(-92, 0.8, 0);
    breakwaterWest.castShadow = true; breakwaterWest.receiveShadow = true;
    breakwaterGroup.add(breakwaterWest);

    // East Rock Arm (x = 24 to 160)
    const breakwaterEast = new THREE.Mesh(
      new RoundedBoxGeometry(136, 2.6, 7.5, 3, 0.5),
      stdMat({ color: 0x334155, roughness: 0.94, metalness: 0.05 })
    );
    breakwaterEast.position.set(92, 0.8, 0);
    breakwaterEast.castShadow = true; breakwaterEast.receiveShadow = true;
    breakwaterGroup.add(breakwaterEast);

    // Navigational Harbor Entrance Navigation Beacons (flanking the 48m channel x in [-24, 24])
    [-24, 24].forEach((bx, idx) => {
      const beaconBase = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.6, 3.8, 20), stdMat({ color: PALETTE.sandstone, roughness: 0.8 }));
      beaconBase.position.set(bx, 2.2, 0);
      beaconBase.castShadow = true;
      breakwaterGroup.add(beaconBase);

      const lightColor = idx === 0 ? 0xef4444 : 0x10b981; // Port (Red) & Starboard (Green)
      const beaconLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.65, 16, 16),
        stdMat({ color: lightColor, emissive: lightColor, emissiveIntensity: 2.6 })
      );
      beaconLight.position.set(bx, 4.5, 0);
      breakwaterGroup.add(beaconLight);

      const navP = new THREE.PointLight(lightColor, 1.8, 28, 2);
      navP.position.set(bx, 4.6, 0);
      breakwaterGroup.add(navP);
      this._pointLights.push(navP);
    });

    // 3. VAST EXPANDED OUTER HARBOUR & OPEN OCEAN (z = 68 to 360, width 800m, deep oceanic blue)
    const outerWaterNormals = makeWaterNormalTexture();
    outerWaterNormals.repeat.set(24, 18);
    const outerOceanGeo = new THREE.PlaneGeometry(800, 320);
    outerOceanGeo.rotateX(-Math.PI / 2);
    const outerOceanMat = stdMat({
      color: 0x0369a1, // Deep coastal bay navy
      normalMap: outerWaterNormals,
      normalScale: new THREE.Vector2(0.65, 0.65),
      roughness: 0.10,
      metalness: 0.90,
      transparent: true,
      opacity: 0.95,
    });
    const outerOcean = new THREE.Mesh(outerOceanGeo, outerOceanMat);
    outerOcean.position.set(0, -0.48, 220);
    this.neighbourhoodGroup.add(outerOcean);
    this._outerOceanMesh = outerOcean;
    this._outerWaterNormalTex = outerWaterNormals;

    // 4. GOLDEN SAND BEACH (z = 22.0 to 25.5, continuous along the shoreline)
    const beachGeo = new THREE.PlaneGeometry(260, 4.5);
    beachGeo.rotateX(-Math.PI / 2);
    const beachMat = stdMat({ color: 0xfef3c7, roughness: 0.92 });
    const beach = new THREE.Mesh(beachGeo, beachMat);
    beach.position.set(0, 0.015, 23.8);
    beach.receiveShadow = true;
    this.neighbourhoodGroup.add(beach);

    // Granite Marina Seawall & Capping Stones along z = 22
    const seawall = new THREE.Mesh(
      new RoundedBoxGeometry(160, 1.8, 1.6, 2, 0.08),
      stdMat({ color: 0x475569, roughness: 0.92 })
    );
    seawall.position.set(0, -0.15, 22.0);
    seawall.receiveShadow = true;
    seawall.castShadow = true;
    this.neighbourhoodGroup.add(seawall);

    // Polished sandstone seawall promenade coping
    const coping = new THREE.Mesh(
      new RoundedBoxGeometry(162, 0.25, 2.0, 2, 0.06),
      stdMat({ color: PALETTE.sandstone, roughness: 0.85 })
    );
    coping.position.set(0, 0.70, 22.0);
    coping.receiveShadow = true;
    this.neighbourhoodGroup.add(coping);

    // =========================================================================
    // URBAN CITY BLOCKS & CONTINUOUS SIDEWALK NETWORK (Melbourne / Lisbon Style)
    // =========================================================================
    const urbanBlocks = new THREE.Group();
    this.neighbourhoodGroup.add(urbanBlocks);

    const paverTex = makePavingStoneTexture();
    paverTex.repeat.set(8, 4);
    const paverMat = stdMat({ map: paverTex, roughness: 0.82, metalness: 0.05 });
    const curbMat = stdMat({ color: 0x94a3b8, roughness: 0.75 });
    const setbackGardenMat = stdMat({ color: 0x2d4a22, roughness: 0.9 });

    // 1. NORTH RESIDENTIAL PARCEL BLOCK (Houses 1 & 2 at z = -4.5m)
    // Paved urban lot pad from x = -11.8 to +11.8, z = -8.6 to -1.8 (width 23.6m, depth 6.8m)
    const northLot = new THREE.Mesh(new RoundedBoxGeometry(23.6, 0.12, 6.8, 2, 0.08), paverMat);
    northLot.position.set(0, 0.06, -5.2);
    northLot.receiveShadow = true;
    urbanBlocks.add(northLot);

    // Granite curb framing the North Block
    const northCurbSouth = new THREE.Mesh(new RoundedBoxGeometry(23.8, 0.16, 0.22, 1, 0.03), curbMat);
    northCurbSouth.position.set(0, 0.08, -1.8);
    northCurbSouth.receiveShadow = true;
    urbanBlocks.add(northCurbSouth);

    // Landscaped front setbacks for Dwelling 1 and Dwelling 2
    [-6.0, 6.0].forEach(bx => {
      const frontGarden = new THREE.Mesh(new RoundedBoxGeometry(4.8, 0.08, 1.2, 1, 0.04), setbackGardenMat);
      frontGarden.position.set(bx, 0.12, -2.5);
      frontGarden.receiveShadow = true;
      urbanBlocks.add(frontGarden);

      const hedgeBorder = new THREE.Mesh(new RoundedBoxGeometry(5.0, 0.16, 0.14, 1, 0.02), stdMat({ color: PALETTE.sandstone, roughness: 0.8 }));
      hedgeBorder.position.set(bx, 0.14, -1.9);
      hedgeBorder.castShadow = true;
      urbanBlocks.add(hedgeBorder);

      const hedge = new THREE.Mesh(new RoundedBoxGeometry(4.6, 0.35, 0.35, 2, 0.08), stdMat({ color: 0x22421b, roughness: 0.85 }));
      hedge.position.set(bx, 0.30, -2.5);
      hedge.castShadow = true;
      urbanBlocks.add(hedge);
    });

    // 2. SOUTH COMMERCIAL PARCEL BLOCK (Espresso Shop & Prototyping Workshop at z = +4.5m)
    // Urban commercial lot pad from x = -11.8 to +11.8, z = 1.8 to 8.2 (width 23.6m, depth 6.4m)
    const southLot = new THREE.Mesh(new RoundedBoxGeometry(23.6, 0.12, 6.4, 2, 0.08), paverMat);
    southLot.position.set(0, 0.06, 5.0);
    southLot.receiveShadow = true;
    urbanBlocks.add(southLot);

    const southCurbNorth = new THREE.Mesh(new RoundedBoxGeometry(23.8, 0.16, 0.22, 1, 0.03), curbMat);
    southCurbNorth.position.set(0, 0.08, 1.8);
    southCurbNorth.receiveShadow = true;
    urbanBlocks.add(southCurbNorth);

    // 3. CENTRAL PEDESTRIAN MALL / PASEO (z = -1.8 to +1.8, x = -40 to +40)
    const mallTex = makePavingStoneTexture();
    mallTex.repeat.set(16, 2);
    const mallMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 3.6),
      stdMat({ map: mallTex, roughness: 0.8, metalness: 0.05 })
    );
    mallMesh.rotation.x = -Math.PI / 2;
    mallMesh.position.set(0, 0.02, 0);
    mallMesh.receiveShadow = true;
    urbanBlocks.add(mallMesh);

    // Central Esplanade Avenue (North-South spine from Headland z = -26 to Road z = 8.2)
    const esplanadeTex = makePavingStoneTexture();
    esplanadeTex.repeat.set(3, 12);
    const esplanadeNS = new THREE.Mesh(
      new THREE.PlaneGeometry(6.4, 34.2),
      stdMat({ map: esplanadeTex, roughness: 0.8, metalness: 0.05 })
    );
    esplanadeNS.rotation.x = -Math.PI / 2;
    esplanadeNS.position.set(0, 0.025, -8.9);
    esplanadeNS.receiveShadow = true;
    urbanBlocks.add(esplanadeNS);

    // Waterfront Promenade Boardwalk (East-West along the seawall z = 16.5 to 22.0)
    const promenadeEW = new THREE.Mesh(
      new THREE.PlaneGeometry(96, 5.5),
      texturedMat("wood", PALETTE.teak, 96, 5.5, { roughness: 0.75 })
    );
    promenadeEW.rotation.x = -Math.PI / 2;
    promenadeEW.position.set(0, 0.04, 19.25);
    promenadeEW.receiveShadow = true;
    this.neighbourhoodGroup.add(promenadeEW);

    // Build the expanded Mediterranean coastal districts
    this._buildValleyDistricts();

    // Paved coastal road network, crosswalks & vehicles
    this._buildRoadsAndVehicles();

    // Coastal Palm & Evergreen Landscaping
    this._buildPeripheralForests();

    // Modern Coastal Skyline Silhouette Backdrop
    this._buildCoastalSkyline();

    // Interactive Spatial Grid & Snapped Cell Solver
    this._buildGridOverlay();
  }

  _buildValleyDistricts() {
    const addBox = (parent, size, pos, color, roughness = 0.8, metalness = 0) => {
      const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 2, 0.06), stdMat({ color, roughness, metalness }));
      mesh.position.set(...pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    const addModernLamp = (parent, x, z) => {
      addBox(parent, [0.12, 2.6, 0.12], [x, 1.3, z], PALETTE.charcoal, 0.5, 0.8);
      // Cantilevered horizontal lamp head
      addBox(parent, [0.45, 0.08, 0.14], [x + 0.18, 2.56, z], PALETTE.charcoal, 0.5, 0.8);
      const lamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.04, 0.1),
        stdMat({ color: 0xffffff, emissive: 0xfff4e6, emissiveIntensity: 1.8 })
      );
      lamp.position.set(x + 0.18, 2.5, z);
      parent.add(lamp);
      const light = new THREE.PointLight(0xfff1e0, 0.85, 12, 2);
      light.position.set(x + 0.18, 2.45, z);
      light.userData.baseIntensity = 0.85;
      light.userData.isStreetLamp = true;
      parent.add(light);
      this._pointLights.push(light);
    };

    const addDatePalm = (parent, x, z, scale = 1.0) => {
      const palm = new THREE.Group();
      palm.position.set(x, 0, z);
      palm.scale.set(scale, scale, scale);

      // White architectural concrete planter cube
      addBox(palm, [1.4, 0.55, 1.4], [0, 0.28, 0], 0xf8fafc, 0.85);
      // Curved ringed trunk
      const trunkMat = stdMat({ color: 0x6e4a2d, roughness: 0.9 });
      for (let s = 0; s < 7; s++) {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.18 - s * 0.012, 0.21 - s * 0.012, 0.55, 8), trunkMat);
        seg.position.set(Math.sin(s * 0.18) * 0.15, 0.6 + s * 0.5, 0);
        seg.castShadow = true;
        palm.add(seg);
      }
      // Lush green palm fronds
      const frondMat = stdMat({ color: PALETTE.palmGreen, roughness: 0.65, side: THREE.DoubleSide });
      for (let f = 0; f < 8; f++) {
        const angle = (f / 8) * Math.PI * 2;
        const frond = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 2.6), frondMat);
        frond.position.set(Math.cos(angle) * 0.8, 4.0, Math.sin(angle) * 0.8);
        frond.rotation.y = angle;
        frond.rotation.x = 0.55;
        frond.castShadow = true;
        palm.add(frond);
      }
      parent.add(palm);
    };

    const addBistroTable = (parent, x, z, umbrellaColor = 0x0284c7) => {
      const set = new THREE.Group();
      set.position.set(x, 0, z);
      // Teak round table
      const table = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.05, 16), stdMat({ color: PALETTE.teak, roughness: 0.6 }));
      table.position.y = 0.75;
      table.castShadow = true; set.add(table);
      addBox(set, [0.08, 0.72, 0.08], [0, 0.36, 0], PALETTE.charcoal, 0.4, 0.8);
      // Canvas parasol umbrella
      const pole = addBox(set, [0.05, 2.4, 0.05], [0, 1.2, 0], PALETTE.charcoal, 0.4, 0.8);
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.65, 12), stdMat({ color: umbrellaColor, roughness: 0.7 }));
      canopy.position.y = 2.2;
      canopy.castShadow = true; set.add(canopy);
      // 2 modern chairs
      [-0.7, 0.7].forEach(cx => {
        const chair = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), stdMat({ color: PALETTE.charcoal, roughness: 0.5 }));
        chair.position.set(cx, 0.45, 0);
        set.add(chair);
        addBox(set, [0.04, 0.42, 0.04], [cx, 0.22, 0], PALETTE.charcoal);
        addBox(set, [0.42, 0.42, 0.04], [cx, 0.65, cx > 0 ? 0.2 : -0.2], PALETTE.charcoal);
      });
      parent.add(set);
    };

    // =========================================================================
    // 1. THE CENTRAL ESPLANADE & WATER FEATURE (Civic Waterfront Core)
    // =========================================================================
    const esplanade = new THREE.Group();
    this.neighbourhoodGroup.add(esplanade);

    // Sleek flush architectural Compass Rose mosaic at central crossroads [0, 0] (r = 0.92m, >1.1m clearance to all plinths)
    const compassDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.92, 0.92, 0.03, 32),
      stdMat({ color: PALETTE.sandstone, roughness: 0.65, metalness: 0.25 })
    );
    compassDisc.position.y = 0.02;
    compassDisc.receiveShadow = true;
    esplanade.add(compassDisc);

    // Bronze cardinal points inlay
    const bronzeMat = stdMat({ color: 0xb45309, roughness: 0.4, metalness: 0.8 });
    const compassPointerN = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.8), bronzeMat);
    compassPointerN.position.y = 0.035;
    esplanade.add(compassPointerN);
    const compassPointerE = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.08), bronzeMat);
    compassPointerE.position.y = 0.035;
    esplanade.add(compassPointerE);
    const centerStud = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 16), stdMat({ color: PALETTE.charcoal, roughness: 0.3, metalness: 0.7 }));
    centerStud.position.y = 0.04;
    esplanade.add(centerStud);

    // Modern Street Lamps along sidewalks and promenade (zero road clipping)
    [[-10.5, -8.5], [10.5, -8.5], [-10.5, 8.8], [10.5, 8.8], [-10.5, 14.8], [10.5, 14.8]].forEach(([lx, lz]) => addModernLamp(esplanade, lx, lz));

    // Royal Date Palms framing the pedestrian mall and waterfront promenade
    [[-9.0, 0], [9.0, 0], [0, -10.5], [-17.5, 18.5], [19.5, 18.5]].forEach(([px, pz]) => addDatePalm(esplanade, px, pz, 1.05));

    // =========================================================================
    // GRAND CIVIC FOUNTAIN PIAZZA (Waterfront Civic Plaza at [0, 18.8], ZERO Road Clipping)
    // Outer basin radius = 2.3m (diameter 4.6m), bounded strictly z in [16.5, 21.1]
    // >2.7m clearance to road curb at z = 13.8m; >5.0m clearance to cafe tables!
    // =========================================================================
    const fountainGroup = new THREE.Group();
    fountainGroup.position.set(0, 0, 18.8);

    // Tier 1: Grand polished white granite basin (radius 2.3m)
    const grandBasin = new THREE.Mesh(
      new THREE.CylinderGeometry(2.3, 2.45, 0.42, 32),
      stdMat({ color: 0xf8fafc, roughness: 0.3, metalness: 0.15 })
    );
    grandBasin.position.y = 0.21;
    grandBasin.castShadow = true; grandBasin.receiveShadow = true;
    fountainGroup.add(grandBasin);

    // Glowing aquamarine reflecting pool water
    const grandWater = new THREE.Mesh(
      new THREE.CylinderGeometry(2.15, 2.15, 0.08, 32),
      stdMat({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.45, roughness: 0.08, metalness: 0.2 })
    );
    grandWater.position.y = 0.38;
    fountainGroup.add(grandWater);

    // Tier 2: Sculpted pedestal and upper marble bowl (radius 1.2m)
    const grandPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 0.85, 16), stdMat({ color: 0xf8fafc, roughness: 0.3 }));
    grandPedestal.position.y = 0.82;
    grandPedestal.castShadow = true; fountainGroup.add(grandPedestal);

    const upperBowl = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.3, 0.28, 24), stdMat({ color: 0xf8fafc, roughness: 0.3, metalness: 0.15 }));
    upperBowl.position.y = 1.25;
    upperBowl.castShadow = true; fountainGroup.add(upperBowl);

    const upperWater = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.06, 24), stdMat({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.55 }));
    upperWater.position.y = 1.38;
    fountainGroup.add(upperWater);

    // Central architectural water plume spout
    const grandSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.2, 16), stdMat({ color: 0xffffff, roughness: 0.2 }));
    grandSpout.position.y = 1.75;
    grandSpout.castShadow = true; fountainGroup.add(grandSpout);

    esplanade.add(fountainGroup);

    // Waterfront outdoor bistro dining along the west promenade (x <= -7.5, >5m from fountain)
    addBistroTable(esplanade, -7.5, 18.5, 0x0284c7);
    addBistroTable(esplanade, -12.5, 18.5, 0x0f766e);

    // =========================================================================
    // 2. THE MARITIME INNOVATION ATELIER & STUDIO (West District, clear of West Avenue)
    // =========================================================================
    const studio = new THREE.Group();
    studio.position.set(-28.5, 0, -12);
    this.neighbourhoodGroup.add(studio);

    // Modern polished sandstone studio plinth (bounded x in [-35.0, -22.0], >1.9m from West Ave)
    addBox(studio, [13.0, 0.28, 10.5], [0, 0.14, 0], PALETTE.sandstone, 0.85);
    // Back solid wall
    addBox(studio, [12.4, 4.4, 0.35], [0, 2.2, -4.9], 0xf8fafc, 0.9);
    // Left solid wall
    addBox(studio, [0.35, 4.4, 9.8], [-6.2, 2.2, 0], 0xf8fafc, 0.9);
    // Right wall with teak vertical louvers
    addBox(studio, [0.35, 4.4, 10.4], [6.6, 2.2, 0], PALETTE.charcoal, 0.6);
    for (let l = -4; l <= 4; l += 1.2) {
      addBox(studio, [0.12, 4.0, 0.45], [6.7, 2.2, l], PALETTE.teak, 0.6);
    }
    // Front full-height glass curtain wall with black mullions
    const glassMat = stdMat({ color: PALETTE.glass, transparent: true, opacity: 0.72, roughness: 0.1, metalness: 0.3 });
    const glassWall = new THREE.Mesh(new THREE.PlaneGeometry(13.2, 4.2), glassMat);
    glassWall.position.set(0, 2.2, 5.1);
    studio.add(glassWall);
    [-4, 0, 4].forEach(colX => addBox(studio, [0.24, 4.4, 0.24], [colX, 2.2, 5.15], PALETTE.charcoal, 0.5, 0.8));

    // Modern flat cantilevered roof terrace with warm ceiling lighting
    addBox(studio, [15.2, 0.32, 12.2], [0, 4.45, 0], PALETTE.charcoal, 0.5, 0.8);
    // Teak rooftop pergola
    for (let b = -6; b <= 6; b += 2.0) {
      addBox(studio, [0.12, 0.24, 11.5], [b, 5.2, 0], PALETTE.teak, 0.6);
    }

    // -------------------------------------------------------------
    // DATUM AEC AI DESIGN PAVILION (Mark Fraser - datum.markfrasertoronto.workers.dev)
    // Displaying Ontario Building Code Part 9 Compliance & Interactive Kinetic DNA Helix
    // -------------------------------------------------------------
    const datumPavilion = new THREE.Group();
    datumPavilion.position.set(12.0, 0, 18.5);
    esplanade.add(datumPavilion);

    // Granite Display Plinth
    const plinth = new THREE.Mesh(
      new RoundedBoxGeometry(5.2, 0.82, 3.2, 2, 0.08),
      stdMat({ color: 0x1e293b, roughness: 0.35, metalness: 0.8 })
    );
    plinth.position.set(0, 0.41, 0);
    plinth.castShadow = true; plinth.receiveShadow = true;
    datumPavilion.add(plinth);

    // Glowing Neon Cyan Edge Trim
    const neonTrim = new THREE.Mesh(
      new THREE.BoxGeometry(5.24, 0.06, 3.24),
      stdMat({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 2.2 })
    );
    neonTrim.position.set(0, 0.82, 0);
    datumPavilion.add(neonTrim);
    this._emissiveAnimated.push(neonTrim.material);

    // Datum Architectural Project Holo-Cubes: 448 Elm, River Run, Birch Cottage
    const datumProjects = [
      { name: "448 Elm Road", color: 0xf59e0b, x: -1.6, w: 1.1, h: 0.95, d: 0.9 },
      { name: "River Run C", color: 0x10b981, x: 0.0, w: 1.3, h: 1.15, d: 0.95 },
      { name: "Birch Cottage 7", color: 0x06b6d4, x: 1.6, w: 1.05, h: 0.85, d: 0.85 },
    ];

    datumProjects.forEach(proj => {
      const projGroup = new THREE.Group();
      projGroup.position.set(proj.x, 0.84, 0);

      // Glass pedestal housing
      const housing = new THREE.Mesh(
        new RoundedBoxGeometry(proj.w + 0.12, proj.h + 0.1, proj.d + 0.12, 1, 0.04),
        stdMat({ color: 0x94a3b8, transparent: true, opacity: 0.32, roughness: 0.1, metalness: 0.9 })
      );
      housing.position.set(0, (proj.h + 0.1) / 2, 0);
      projGroup.add(housing);

      // Inner Architectural Model Massing (PBR Lit)
      const core = new THREE.Mesh(
        new RoundedBoxGeometry(proj.w, proj.h, proj.d, 2, 0.06),
        stdMat({ color: proj.color, roughness: 0.25, metalness: 0.35 })
      );
      core.position.set(0, proj.h / 2 + 0.05, 0);
      core.castShadow = true;
      projGroup.add(core);

      // Floor slab accent ribbons
      for (let fh = 0.25; fh < proj.h; fh += 0.3) {
        const slab = new THREE.Mesh(
          new THREE.BoxGeometry(proj.w + 0.04, 0.03, proj.d + 0.04),
          stdMat({ color: 0xffffff, roughness: 0.3, metalness: 0.7 })
        );
        slab.position.set(0, fh + 0.05, 0);
        projGroup.add(slab);
      }

      // Overhead Spotlight illuminating each Datum model
      const pSpot = new THREE.PointLight(proj.color, 0.95, 4.2, 2);
      pSpot.position.set(0, proj.h + 0.6, 0);
      projGroup.add(pSpot);

      datumPavilion.add(projGroup);
    });

    // -------------------------------------------------------------
    // Kinetic Double-Strand DNA Helix (from Datum intro-dna.html)
    // -------------------------------------------------------------
    const helixGroup = new THREE.Group();
    helixGroup.position.set(0, 3.2, 0);
    const helixRadius = 1.4;
    const helixPitch = 2.4;

    const strandMatA = stdMat({ color: 0xb0560c, emissive: 0xb0560c, emissiveIntensity: 1.2, roughness: 0.3 });
    const strandMatB = stdMat({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 1.2, roughness: 0.3 });
    const rungMat = stdMat({ color: 0x94a3b8, roughness: 0.4, metalness: 0.8 });
    const sphereGeo = new THREE.SphereGeometry(0.08, 12, 8);

    for (let r = 0; r < 24; r++) {
      const y = (r - 12) * 0.18;
      const angle = (y / helixPitch) * Math.PI * 2;
      const phB = angle + 2.32; // unequal strand phase from Datum

      const posA = new THREE.Vector3(Math.cos(angle) * helixRadius, y, Math.sin(angle) * helixRadius);
      const posB = new THREE.Vector3(Math.cos(phB) * helixRadius, y, Math.sin(phB) * helixRadius);

      // Node A
      const nodeA = new THREE.Mesh(sphereGeo, strandMatA);
      nodeA.position.copy(posA);
      helixGroup.add(nodeA);

      // Node B
      const nodeB = new THREE.Mesh(sphereGeo, strandMatB);
      nodeB.position.copy(posB);
      helixGroup.add(nodeB);

      // Connecting Base-Pair Rung
      const rungVec = new THREE.Vector3().subVectors(posB, posA);
      const rungLen = rungVec.length();
      const rungCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, rungLen, 8), rungMat);
      rungCyl.position.copy(posA).addScaledVector(rungVec, 0.5);
      rungCyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), rungVec.clone().normalize());
      helixGroup.add(rungCyl);
    }

    datumPavilion.add(helixGroup);
    this._datumHelix = helixGroup;

    // =========================================================================
    // 3. THE TERRACED COASTAL VILLAS (Lisbon / Valencia meets Sydney - East)
    // Shifted safely east to world x = 31.0: Villa Azure plinth x in [22.45, 33.55],
    // providing >2.35m clearance east of the East Side Avenue (x <= 20.1).
    // =========================================================================
    const eastQuarter = new THREE.Group();
    eastQuarter.position.set(31.0, 0, -8.0);
    this.neighbourhoodGroup.add(eastQuarter);

    // Terraced modern coastal villas with rooftop sun terraces & terracotta tile accents
    const villas = [
      { x: -3, z: 0, w: 9.5, d: 7.2, h: 4.8, label: "Villa Azure" },
      { x: 7, z: 8, w: 8.5, d: 6.8, h: 4.2, label: "Villa Palmera" },
    ];
    villas.forEach((v) => {
      const villa = new THREE.Group();
      villa.position.set(v.x, 0, v.z);
      // Clean sandstone foundation plinth
      addBox(villa, [v.w + 0.6, 0.3, v.d + 0.6], [0, 0.15, 0], PALETTE.sandstone);
      // Whitewashed stucco main body
      addBox(villa, [v.w, v.h, v.d], [0, v.h / 2 + 0.15, 0], 0xf8fafc, 0.88);
      // Modern Mediterranean terracotta peaked roof
      this._addPeakedRoof(villa, v.w + 0.8, v.d + 0.8, v.h + 0.15, PALETTE.terracotta);
      // Glass balcony with teak railing overlooking the bay
      const balc = new THREE.Mesh(new THREE.BoxGeometry(v.w * 0.7, 0.8, 0.06), glassMat);
      balc.position.set(0, v.h * 0.65, v.d / 2 + 0.05);
      villa.add(balc);
      // Modern architectural downlight
      const vLight = new THREE.PointLight(0xfff1e0, 0.75, 8, 2);
      vLight.position.set(0, v.h * 0.8, v.d / 2 + 0.5);
      villa.add(vLight);
      eastQuarter.add(villa);
    });

    // =========================================================================
    // 4. THE SOUTH MARINA PIER & LUXURY YACHT HARBOUR (Ocean Bay Waterfront)
    // =========================================================================
    const marina = new THREE.Group();
    marina.position.set(0, -0.4, 28);
    this.neighbourhoodGroup.add(marina);

    // Floating Teak Marina Boardwalk Pontoon Pier (36m wide x 12m deep)
    const pontoon = new THREE.Mesh(
      new RoundedBoxGeometry(36, 0.45, 12, 2, 0.08),
      texturedMat("wood", PALETTE.teak, 36, 12, { roughness: 0.72 })
    );
    pontoon.position.set(0, 0.22, 0);
    pontoon.receiveShadow = true;
    marina.add(pontoon);

    // Marina safety stanchions & glowing dock lights
    for (let mx = -16; mx <= 16; mx += 8) {
      addBox(marina, [0.1, 0.75, 0.1], [mx, 0.6, -5.8], PALETTE.charcoal, 0.4, 0.8);
      addBox(marina, [0.1, 0.75, 0.1], [mx, 0.6, 5.8], PALETTE.charcoal, 0.4, 0.8);
      const mLight = new THREE.PointLight(0x38bdf8, 0.65, 6, 2);
      mLight.position.set(mx, 0.8, 5.8);
      marina.add(mLight);
    }

    // SLEEK LUXURY MOTOR YACHT (Moored at the west pontoon, x: -10, z: 2)
    const motorYacht = new THREE.Group();
    motorYacht.position.set(-10, 0.2, 4);
    // Sculpted white marine hull
    const hull = new THREE.Mesh(
      new RoundedBoxGeometry(11.5, 1.5, 3.4, 2, 0.15),
      stdMat({ color: PALETTE.yachtWhite, roughness: 0.25, metalness: 0.25 })
    );
    hull.position.set(0, 0.6, 0);
    hull.castShadow = true; motorYacht.add(hull);
    // Teak aft swim platform
    const swimDeck = new THREE.Mesh(
      new RoundedBoxGeometry(1.6, 0.12, 3.2, 1, 0.04),
      stdMat({ color: PALETTE.teak, roughness: 0.6 })
    );
    swimDeck.position.set(-5.6, 0.4, 0);
    motorYacht.add(swimDeck);
    // Sleek flybridge cabin with wraparound tinted windshield
    const cabin = new THREE.Mesh(
      new RoundedBoxGeometry(5.8, 1.2, 2.6, 2, 0.12),
      stdMat({ color: PALETTE.yachtWhite, roughness: 0.25, metalness: 0.25 })
    );
    cabin.position.set(0.5, 1.7, 0);
    cabin.castShadow = true; motorYacht.add(cabin);
    const windshield = new THREE.Mesh(
      new RoundedBoxGeometry(2.4, 0.55, 2.4, 2, 0.08),
      stdMat({ color: 0x1e293b, roughness: 0.1, metalness: 0.8 })
    );
    windshield.position.set(2.4, 1.9, 0);
    motorYacht.add(windshield);
    // Radar arch
    addBox(motorYacht, [0.35, 1.4, 2.4], [-1.2, 2.4, 0], PALETTE.charcoal, 0.4, 0.8);
    marina.add(motorYacht);

    // MODERN SAILING CATAMARAN (Moored at the east pontoon, x: 10, z: 2)
    const catamaran = new THREE.Group();
    catamaran.position.set(10, 0.2, 4);
    // Twin sleek white hulls
    [-1.6, 1.6].forEach(hy => {
      const cHull = new THREE.Mesh(
        new RoundedBoxGeometry(9.5, 1.1, 1.0, 2, 0.12),
        stdMat({ color: PALETTE.yachtWhite, roughness: 0.25, metalness: 0.25 })
      );
      cHull.position.set(0, 0.45, hy);
      cHull.castShadow = true; catamaran.add(cHull);
    });
    // Bridge deck & cockpit
    const bridge = new THREE.Mesh(
      new RoundedBoxGeometry(5.2, 0.35, 2.8, 2, 0.08),
      stdMat({ color: PALETTE.yachtWhite, roughness: 0.3 })
    );
    bridge.position.set(-0.5, 0.8, 0);
    catamaran.add(bridge);
    // Carbon-black mast (10m tall)
    addBox(catamaran, [0.18, 9.6, 0.18], [0.5, 5.2, 0], PALETTE.charcoal, 0.3, 0.9);
    addBox(catamaran, [4.8, 0.12, 0.12], [-1.6, 1.6, 0], PALETTE.charcoal, 0.3, 0.9);
    marina.add(catamaran);

    // -------------------------------------------------------------
    // CRUISING YACHTS & REGATTA SAILBOATS IN THE OUTER HARBOUR BAY (z in [70, 115])
    // -------------------------------------------------------------
    this._harbourVessels = [
      { group: motorYacht, basePosY: 0.2, phase: 0.0, pitchPhase: 1.2 },
      { group: catamaran, basePosY: 0.2, phase: 1.8, pitchPhase: 2.5 }
    ];
    const outerVessels = [
      { x: -35, z: 82, rotY: 0.35, scale: 1.1, hullColor: 0x0284c7, hasSail: true },
      { x: 28, z: 96, rotY: -0.45, scale: 1.3, hullColor: 0xf8fafc, hasSail: false },
      { x: -12, z: 110, rotY: 0.15, scale: 0.95, hullColor: 0x059669, hasSail: true },
    ];
    outerVessels.forEach((v, idx) => {
      const ship = new THREE.Group();
      ship.position.set(v.x, -0.4, v.z);
      ship.rotation.y = v.rotY;
      ship.scale.set(v.scale, v.scale, v.scale);

      const sHull = new THREE.Mesh(
        new RoundedBoxGeometry(10.5, 1.4, 3.2, 2, 0.15),
        stdMat({ color: v.hullColor, roughness: 0.25, metalness: 0.3 })
      );
      sHull.position.y = 0.5;
      sHull.castShadow = true;
      ship.add(sHull);

      const sDeck = new THREE.Mesh(new RoundedBoxGeometry(9.6, 0.2, 2.8, 1, 0.05), stdMat({ color: PALETTE.teak, roughness: 0.6 }));
      sDeck.position.y = 1.1;
      ship.add(sDeck);

      if (v.hasSail) {
        // High mast with billowing white canvas sail
        addBox(ship, [0.14, 11.5, 0.14], [0.2, 6.2, 0], PALETTE.charcoal, 0.3, 0.9);
        const sailMat = stdMat({ color: 0xffffff, roughness: 0.5, side: THREE.DoubleSide });
        const sail = new THREE.Mesh(new THREE.ConeGeometry(2.4, 8.5, 3), sailMat);
        sail.position.set(0.6, 6.0, 0);
        sail.rotation.z = -Math.PI / 2;
        sail.scale.set(1.0, 0.05, 1.0);
        ship.add(sail);
      } else {
        // Luxury motor cruiser cabin
        const sCabin = new THREE.Mesh(
          new RoundedBoxGeometry(5.2, 1.3, 2.2, 2, 0.1),
          stdMat({ color: 0xf8fafc, roughness: 0.3 })
        );
        sCabin.position.set(0.5, 1.75, 0);
        ship.add(sCabin);
        const sGlass = new THREE.Mesh(new RoundedBoxGeometry(2.0, 0.6, 2.0, 2, 0.08), stdMat({ color: 0x0f172a, roughness: 0.1, metalness: 0.8 }));
        sGlass.position.set(2.2, 1.95, 0);
        ship.add(sGlass);
      }
      this.neighbourhoodGroup.add(ship);
      this._harbourVessels.push({ group: ship, basePosY: -0.4, phase: idx * 2.1 + 0.8, pitchPhase: idx * 1.5 });
    });

    // =========================================================================
    // 5. THE OCEAN HEADLAND & CONTEMPORARY COASTAL BEACON (North Cliff)
    // =========================================================================
    const headland = new THREE.Group();
    headland.position.set(0, 3.4, -42);
    this.neighbourhoodGroup.add(headland);

    // Minimalist sculptural modern coastal beacon tower
    const beaconBase = new THREE.Mesh(
      new THREE.CylinderGeometry(3.6, 4.4, 2.0, 24),
      stdMat({ color: PALETTE.sandstone, roughness: 0.85 })
    );
    beaconBase.position.y = 1.0;
    beaconBase.castShadow = true; beaconBase.receiveShadow = true;
    headland.add(beaconBase);

    // Sleek white architectural tower column
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 2.4, 12, 20),
      stdMat({ color: 0xf8fafc, roughness: 0.35, metalness: 0.15 })
    );
    tower.position.y = 7.0;
    tower.castShadow = true; headland.add(tower);

    // Cantilevered 360° glass observation platform at y = 12.5m
    const obsDeck = new THREE.Mesh(
      new THREE.CylinderGeometry(5.2, 5.2, 0.35, 32),
      stdMat({ color: PALETTE.charcoal, roughness: 0.5, metalness: 0.8 })
    );
    obsDeck.position.y = 12.8;
    obsDeck.castShadow = true; headland.add(obsDeck);

    // Glass safety balustrade
    const obsGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(5.1, 5.1, 0.9, 32, 1, true),
      glassMat
    );
    obsGlass.position.y = 13.4;
    headland.add(obsGlass);

    // High-intensity amber coastal navigation lantern
    const beaconLantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.65, 16, 12),
      stdMat({ color: 0xffaa00, emissive: 0xff8800, emissiveIntensity: 2.5 })
    );
    beaconLantern.position.y = 14.5;
    headland.add(beaconLantern);
    const beaconLight = new THREE.PointLight(0xffaa00, 1.8, 48, 2);
    beaconLight.position.copy(beaconLantern.position);
    headland.add(beaconLight);
    this._pointLights.push(beaconLight);

    // Modern aerodynamic solar shade canopy
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(5.8, 1.4, 24),
      stdMat({ color: PALETTE.charcoal, roughness: 0.4, metalness: 0.8 })
    );
    canopy.position.y = 15.8;
    canopy.castShadow = true; headland.add(canopy);

    // -------------------------------------------------------------
    // DISTRICT 6: THE GRAND MARINA YACHT CLUB PAVILION (Marina Waterfront, x: 29, z: 22)
    // Completely South of South Sidewalk (z = 15.8m) & East of East Ave (x = 20.1m)
    // -------------------------------------------------------------
    const yachtClub = new THREE.Group();
    yachtClub.position.set(29.0, 0, 18.0);
    this.neighbourhoodGroup.add(yachtClub);

    // Sandstone terrace foundation (bounded x in [22.2, 35.8], z in [18.0, 26.0])
    addBox(yachtClub, [13.5, 0.4, 8.0], [0, 0.2, 0], PALETTE.sandstone, 0.85);

    // Ground Floor: Whitewashed Mediterranean Stucco Salon
    addBox(yachtClub, [12.4, 3.2, 7.2], [0, 1.8, 0], 0xf8fafc, 0.35);

    // Curved Panoramic Glass Curtain Wall overlooking the marina
    const ycGlassMat = stdMat({ color: 0x38bdf8, transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.3 });
    const ycGlass = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 3.0, 24, 1, false, 0, Math.PI), ycGlassMat);
    ycGlass.position.set(0, 1.8, 3.6);
    yachtClub.add(ycGlass);

    // First Floor Cantilevered Nautical Teak Deck
    const ycDeck = new THREE.Mesh(new RoundedBoxGeometry(13.8, 0.28, 8.0, 1, 0.04), stdMat({ color: PALETTE.teak, roughness: 0.7 }));
    ycDeck.position.set(0, 3.5, 0);
    ycDeck.castShadow = true; ycDeck.receiveShadow = true;
    yachtClub.add(ycDeck);

    // Second Floor Lounge & Rooftop Shade Pergola
    const pergRoof = new THREE.Mesh(new RoundedBoxGeometry(8.5, 0.16, 5.5, 1, 0.04), stdMat({ color: PALETTE.charcoal, roughness: 0.4, metalness: 0.8 }));
    pergRoof.position.set(0, 5.8, -0.5);
    pergRoof.castShadow = true;
    yachtClub.add(pergRoof);

    // 4 Slim Charcoal Pergola Support Columns
    [[-3.8, -2.4], [3.8, -2.4], [-3.8, 2.0], [3.8, 2.0]].forEach(([px, pz]) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 8), stdMat({ color: PALETTE.charcoal, metalness: 0.9 }));
      col.position.set(px, 4.65, pz);
      col.castShadow = true;
      yachtClub.add(col);
    });

    // Nautical Stainless Flagpole with Maritime Pennant
    const flagpole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 6.2, 8), stdMat({ color: 0xffffff, metalness: 0.9, roughness: 0.2 }));
    flagpole.position.set(6.2, 3.1, 3.6);
    flagpole.castShadow = true;
    yachtClub.add(flagpole);
    const pennant = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.65), stdMat({ color: 0x0284c7, roughness: 0.5, side: THREE.DoubleSide }));
    pennant.position.set(6.8, 5.8, 3.6);
    yachtClub.add(pennant);

    // White Sun Loungers on the yacht club deck
    for (let l = -2.5; l <= 2.5; l += 2.5) {
      const lounger = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.25, 1.8, 1, 0.04), stdMat({ color: 0xf8fafc, roughness: 0.6 }));
      lounger.position.set(l, 3.75, 2.2);
      lounger.castShadow = true;
      yachtClub.add(lounger);
    }

    // Warm Ambient Light inside the Yacht Club
    const ycLight = new THREE.PointLight(0xffeedd, 0.8, 16, 2);
    ycLight.position.set(0, 2.2, 0);
    yachtClub.add(ycLight);
    this._pointLights.push(ycLight);
    this._contactShadow(14.0, 8.5, yachtClub);

    // -------------------------------------------------------------
    // DISTRICT 7: PROMENADE TERRACED TOWNHOUSES (Waterfront Coastal Villas, x: -29, z: 22)
    // Completely South of South Sidewalk (z = 15.8m) & West of West Ave (x = -20.1m)
    // -------------------------------------------------------------
    const townhouses = new THREE.Group();
    townhouses.position.set(-29.0, 0, 18.0);
    this.neighbourhoodGroup.add(townhouses);

    // Terrace Base (bounded x in [-36.5, -21.5], z in [18.0, 26.0])
    addBox(townhouses, [15.0, 0.4, 8.0], [0, 0.2, 0], PALETTE.sandstone, 0.85);

    // 3 Staggered Coastal Townhouses (Terracotta, Ochre, Cream)
    const thConfigs = [
      { x: -4.6, w: 4.4, h: 7.4, d: 7.2, color: 0x9a3412, roofColor: PALETTE.terracotta },
      { x: 0.0,  w: 4.4, h: 8.2, d: 7.5, color: 0xd97706, roofColor: 0x78350f },
      { x: 4.6,  w: 4.4, h: 6.8, d: 7.0, color: 0xfef3c7, roofColor: PALETTE.terracotta }
    ];

    thConfigs.forEach((cfg) => {
      addBox(townhouses, [cfg.w, cfg.h, cfg.d], [cfg.x, cfg.h / 2 + 0.4, 0], cfg.color, 0.7);

      const thRoof = new THREE.Mesh(new THREE.ConeGeometry(cfg.w * 0.72, 1.8, 4), stdMat({ color: cfg.roofColor, roughness: 0.75 }));
      thRoof.rotation.y = Math.PI / 4;
      thRoof.position.set(cfg.x, cfg.h + 1.25, 0);
      thRoof.scale.set(1.0, 1.0, cfg.d / cfg.w);
      thRoof.castShadow = true;
      townhouses.add(thRoof);

      for (let floor = 1; floor <= 2; floor++) {
        const winY = floor * 2.5 + 0.8;
        const winGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.6), stdMat({ color: 0x38bdf8, roughness: 0.2 }));
        winGlass.position.set(cfg.x, winY, cfg.d / 2 + 0.02);
        townhouses.add(winGlass);

        const balc = new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.45, 0.45, 1, 0.02), stdMat({ color: PALETTE.charcoal, roughness: 0.6 }));
        balc.position.set(cfg.x, winY - 0.6, cfg.d / 2 + 0.25);
        balc.castShadow = true;
        townhouses.add(balc);

        const flowers = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 0.35), stdMat({ color: 0xec4899, roughness: 0.7 }));
        flowers.position.set(cfg.x, winY - 0.35, cfg.d / 2 + 0.25);
        townhouses.add(flowers);
      }
    });
    this._contactShadow(15.5, 8.5, townhouses);

    // -------------------------------------------------------------
    // DISTRICT 8: MARINA BOUTIQUE HOTEL & ROOFTOP BAR (x: -28.5, z: 0.0)
    // Clear of North Sidewalk (z = 8.2m) & West of West Ave (x = -20.1m)
    // -------------------------------------------------------------
    const hotel = new THREE.Group();
    hotel.position.set(-28.5, 0, 0.0);
    this.neighbourhoodGroup.add(hotel);

    // Ground Floor: Travertine Lobby with Glass Entrance (bounded x in [-35.0, -22.0], z in [-4.8, 4.8])
    addBox(hotel, [13.0, 3.4, 9.6], [0, 1.7, 0], 0xe2e8f0, 0.4);
    // Upper Luxury Suites (Floors 2-4)
    addBox(hotel, [12.4, 7.8, 9.0], [0, 7.3, 0], 0xf1f5f9, 0.35);

    // Tinted Ribbon Windows across hotel facade
    for (let f = 1; f <= 3; f++) {
      const ribbon = new THREE.Mesh(new THREE.BoxGeometry(11.2, 1.2, 0.1), stdMat({ color: 0x0f172a, roughness: 0.2, metalness: 0.7 }));
      ribbon.position.set(0, 3.4 + f * 2.3 - 0.5, 4.55);
      hotel.add(ribbon);
    }

    // Rooftop Cocktail Pergola & Sun Deck
    const hotelPergola = new THREE.Mesh(new RoundedBoxGeometry(11.0, 0.18, 8.0, 1, 0.04), stdMat({ color: PALETTE.teak, roughness: 0.6 }));
    hotelPergola.position.set(0, 11.3, 0);
    hotelPergola.castShadow = true;
    hotel.add(hotelPergola);

    // Rooftop cocktail bar warm glow
    const barLight = new THREE.PointLight(0xf59e0b, 0.9, 14, 2);
    barLight.position.set(0, 12.0, 0);
    hotel.add(barLight);
    this._pointLights.push(barLight);
    this._contactShadow(15.0, 12.0, hotel);

    // -------------------------------------------------------------
    // DISTRICT 9: SEASIDE HEADLAND ROTUNDA (x: 26, z: -20)
    // -------------------------------------------------------------
    const rotunda = new THREE.Group();
    rotunda.position.set(26, 0, -20);
    this.neighbourhoodGroup.add(rotunda);

    const rotBase = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.9, 0.5, 24), stdMat({ color: PALETTE.sandstone, roughness: 0.85 }));
    rotBase.position.y = 0.25;
    rotBase.receiveShadow = true;
    rotunda.add(rotBase);

    for (let c = 0; c < 8; c++) {
      const angle = (c / 8) * Math.PI * 2;
      const cx = Math.cos(angle) * 3.8;
      const cz = Math.sin(angle) * 3.8;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 4.4, 12), stdMat({ color: PALETTE.sandstone, roughness: 0.8 }));
      col.position.set(cx, 2.7, cz);
      col.castShadow = true;
      rotunda.add(col);
    }

    const entablature = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 0.45, 24), stdMat({ color: PALETTE.sandstone, roughness: 0.8 }));
    entablature.position.y = 5.1;
    entablature.castShadow = true;
    rotunda.add(entablature);

    const copperDome = new THREE.Mesh(new THREE.SphereGeometry(4.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), stdMat({ color: 0x0d9488, roughness: 0.45, metalness: 0.25 }));
    copperDome.position.y = 5.3;
    copperDome.castShadow = true;
    rotunda.add(copperDome);

    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.1, 10), stdMat({ color: 0xb45309, metalness: 0.8 }));
    pedestal.position.set(0, 1.05, 2.2);
    pedestal.castShadow = true;
    rotunda.add(pedestal);

    const telescope = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.05, 0.85, 10), stdMat({ color: 0xd97706, metalness: 0.85 }));
    telescope.rotation.x = 0.35;
    telescope.position.set(0, 1.65, 2.2);
    telescope.castShadow = true;
    rotunda.add(telescope);
    this._contactShadow(10.0, 10.0, rotunda);
  }

  _buildRoadsAndVehicles() {
    const roadGroup = new THREE.Group();
    this.neighbourhoodGroup.add(roadGroup);

    const asphaltTex = makeAsphaltTexture();
    asphaltTex.repeat.set(16, 2);
    const asphaltMat = stdMat({ map: asphaltTex, roughness: 0.9, metalness: 0.1 });
    const curbMat = stdMat({ color: 0x94a3b8, roughness: 0.75 });
    const sidewalkTex = makePavingStoneTexture();
    sidewalkTex.repeat.set(18, 2);
    const sidewalkMat = stdMat({ map: sidewalkTex, roughness: 0.82 });

    // 1. NORTH SIDEWALK (along South Block from z = 8.2 to z = 9.4, width 1.2m)
    const northSidewalk = new THREE.Mesh(new THREE.PlaneGeometry(96, 1.2), sidewalkMat);
    northSidewalk.rotation.x = -Math.PI / 2;
    northSidewalk.position.set(0, 0.06, 8.8);
    northSidewalk.receiveShadow = true;
    roadGroup.add(northSidewalk);

    const curbNorth = new THREE.Mesh(new RoundedBoxGeometry(96, 0.14, 0.22, 1, 0.03), curbMat);
    curbNorth.position.set(0, 0.07, 9.4);
    curbNorth.receiveShadow = true;
    roadGroup.add(curbNorth);

    // 2. VEHICULAR ROADWAY CARRIAGEWAY (from z = 9.4 to z = 13.8, width 4.4m, x = -48 to 48)
    const roadMesh = new THREE.Mesh(new THREE.PlaneGeometry(96, 4.4), asphaltMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0.03, 11.6);
    roadMesh.receiveShadow = true;
    roadGroup.add(roadMesh);

    // Road Markings:
    const paintMat = stdMat({ color: 0xf8fafc, roughness: 0.35 });
    // Dashed white centerline at z = 11.6
    for (let dashX = -44; dashX <= 44; dashX += 4.5) {
      if (Math.abs(dashX) < 3.2) continue; // Skip zebra crossing
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.14), paintMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(dashX, 0.035, 11.6);
      dash.receiveShadow = true;
      roadGroup.add(dash);
    }

    // Solid white shoulder lines along road edges
    [-1, 1].forEach(side => {
      const shoulderLine = new THREE.Mesh(new THREE.PlaneGeometry(96, 0.12), paintMat);
      shoulderLine.rotation.x = -Math.PI / 2;
      shoulderLine.position.set(0, 0.035, 11.6 + side * 1.95);
      shoulderLine.receiveShadow = true;
      roadGroup.add(shoulderLine);
    });

    // Parallel parking bay markings
    const bayEast = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 1.9), stdMat({ color: 0x242831, roughness: 0.85 }));
    bayEast.rotation.x = -Math.PI / 2;
    bayEast.position.set(13.8, 0.032, 10.5);
    bayEast.receiveShadow = true;
    roadGroup.add(bayEast);

    const bayWest = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 1.9), stdMat({ color: 0x242831, roughness: 0.85 }));
    bayWest.rotation.x = -Math.PI / 2;
    bayWest.position.set(-13.8, 0.032, 12.7);
    bayWest.receiveShadow = true;
    roadGroup.add(bayWest);

    // Zebra pedestrian crosswalk across the roadway at x = 0 (connecting Central Esplanade to Waterfront Piazza)
    for (let s = -2.0; s <= 2.0; s += 0.6) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 4.2), paintMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(s, 0.036, 11.6);
      stripe.receiveShadow = true;
      roadGroup.add(stripe);
    }

    // 3. SOUTH SIDEWALK & TRANSIT STRIP (from z = 13.8 to z = 15.8, width 2.0m)
    const curbSouth = new THREE.Mesh(new RoundedBoxGeometry(96, 0.14, 0.22, 1, 0.03), curbMat);
    curbSouth.position.set(0, 0.07, 13.8);
    curbSouth.receiveShadow = true;
    roadGroup.add(curbSouth);

    const southSidewalk = new THREE.Mesh(new THREE.PlaneGeometry(96, 2.0), sidewalkMat);
    southSidewalk.rotation.x = -Math.PI / 2;
    southSidewalk.position.set(0, 0.06, 14.8);
    southSidewalk.receiveShadow = true;
    roadGroup.add(southSidewalk);

    // Connecting North-South Side Street Avenues (West and East)
    const sideAveWest = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 23.4), asphaltMat);
    sideAveWest.rotation.x = -Math.PI / 2;
    sideAveWest.position.set(-18.0, 0.025, -2.3);
    sideAveWest.receiveShadow = true;
    roadGroup.add(sideAveWest);

    const sideAveEast = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 23.4), asphaltMat);
    sideAveEast.rotation.x = -Math.PI / 2;
    sideAveEast.position.set(18.0, 0.025, -2.3);
    sideAveEast.receiveShadow = true;
    roadGroup.add(sideAveEast);

    // 4. Modern Coastal Vehicles
    const buildCar = (x, z, rotY, bodyColor, isConvertible = true) => {
      const car = new THREE.Group();
      car.position.set(x, 0, z);
      car.rotation.y = rotY;

      const carPaint = stdMat({ color: bodyColor, roughness: 0.25, metalness: 0.65 });
      const chromeMat = stdMat({ color: 0xffffff, roughness: 0.15, metalness: 0.95 });
      const tireMat = stdMat({ color: 0x18181b, roughness: 0.9 });
      const rimMat = stdMat({ color: 0xd4d4d8, roughness: 0.2, metalness: 0.85 });

      const chassis = new THREE.Mesh(new RoundedBoxGeometry(3.6, 0.55, 1.6, 2, 0.12), carPaint);
      chassis.position.set(0, 0.42, 0);
      chassis.castShadow = true; chassis.receiveShadow = true;
      car.add(chassis);

      const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.24, 16);
      wheelGeo.rotateZ(Math.PI / 2);
      const rimGeo = new THREE.CylinderGeometry(0.20, 0.20, 0.26, 12);
      rimGeo.rotateZ(Math.PI / 2);

      [[-1.1, -0.78], [1.1, -0.78], [-1.1, 0.78], [1.1, 0.78]].forEach(([wx, wz]) => {
        const wheel = new THREE.Mesh(wheelGeo, tireMat);
        wheel.position.set(wx, 0.32, wz);
        wheel.castShadow = true;
        car.add(wheel);
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.position.set(wx, 0.32, wz);
        car.add(rim);
      });

      if (isConvertible) {
        const leatherMat = stdMat({ color: 0x9a3412, roughness: 0.7 });
        [-0.25, 0.25].forEach((sz) => {
          const seat = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.5, 0.45, 1, 0.06), leatherMat);
          seat.position.set(-0.15, 0.65, sz);
          car.add(seat);
        });
        const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 8, 16), chromeMat);
        wheelRim.rotation.y = Math.PI / 4;
        wheelRim.position.set(0.35, 0.78, 0.25);
        car.add(wheelRim);
        const glassMat = stdMat({ color: 0x38bdf8, transparent: true, opacity: 0.65, roughness: 0.1, metalness: 0.3 });
        const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.42), glassMat);
        windshield.position.set(0.55, 0.85, 0);
        windshield.rotation.y = -Math.PI / 2;
        windshield.rotation.x = -0.38;
        car.add(windshield);
      } else {
        const glassMat = stdMat({ color: 0x0f172a, roughness: 0.15, metalness: 0.85 });
        const cabin = new THREE.Mesh(new RoundedBoxGeometry(1.9, 0.6, 1.35, 2, 0.1), glassMat);
        cabin.position.set(-0.15, 0.95, 0);
        cabin.castShadow = true;
        car.add(cabin);
        const roofSlab = new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.08, 1.25, 1, 0.04), carPaint);
        roofSlab.position.set(-0.15, 1.28, 0);
        car.add(roofSlab);
      }

      const headlightMat = stdMat({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.5 });
      const hlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.28), headlightMat);
      hlLeft.position.set(1.78, 0.48, -0.55);
      car.add(hlLeft);
      const hlRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.28), headlightMat);
      hlRight.position.set(1.78, 0.48, 0.55);
      car.add(hlRight);

      const tailMat = stdMat({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.2 });
      const tailBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.3), tailMat);
      tailBar.position.set(-1.78, 0.52, 0);
      car.add(tailBar);

      this._contactShadow(4.2, 2.2, car);
      roadGroup.add(car);
      return car;
    };

    // Vehicle 1: Riviera Blue Cabriolet in East marked bay
    buildCar(13.8, 10.5, 0, 0x0284c7, true);

    // Vehicle 2: Monaco Bordeaux Red Coupe in West marked bay
    buildCar(-13.8, 12.7, Math.PI, 0x991b1b, false);

    // Vehicle 3: Sleek Pearl White Convertible parked on West Avenue bay
    buildCar(-18.0, 2.5, -Math.PI / 2, 0xf8fafc, true);

    // 5. Modern Glass & Steel Transit Shelter at x = 8.5, z = 14.8 on South Sidewalk
    const shelter = new THREE.Group();
    shelter.position.set(8.5, 0, 14.8);
    const steelMat = stdMat({ color: 0x334155, roughness: 0.4, metalness: 0.8 });
    const shelterGlass = stdMat({ color: 0x94a3b8, transparent: true, opacity: 0.55, roughness: 0.1 });
    const backPanel = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.2, 0.06), shelterGlass);
    backPanel.position.set(0, 1.15, 0.75);
    shelter.add(backPanel);
    const canopy = new THREE.Mesh(new RoundedBoxGeometry(4.0, 0.1, 1.6, 1, 0.04), steelMat);
    canopy.position.set(0, 2.3, 0);
    canopy.castShadow = true;
    shelter.add(canopy);
    const bench = new THREE.Mesh(new RoundedBoxGeometry(2.4, 0.08, 0.42, 1, 0.02), stdMat({ color: PALETTE.teak, roughness: 0.6 }));
    bench.position.set(0, 0.45, 0.3);
    bench.castShadow = true;
    shelter.add(bench);
    roadGroup.add(shelter);
  }

  _build4DPedestrians() {
    this._pedestrians = [];
    const npcConfigs = [
      { id: 'npc_walk_1', x: -14, z: 20.0, dirX: 1, minX: -22, maxX: 22, speed: 1.1, color: 0x0284c7, type: 'walker' },
      { id: 'npc_walk_2', x: 8, z: 20.0, dirX: -1, minX: -20, maxX: 20, speed: 0.9, color: 0xf59e0b, type: 'walker' },
      { id: 'npc_walk_3', x: -4, z: 20.0, dirX: 1, minX: -18, maxX: 18, speed: 1.25, color: 0x10b981, type: 'walker' },
      { id: 'npc_walk_4', x: 1.2, z: -8, dirZ: 1, minZ: -12, maxZ: 7, speed: 1.0, color: 0xec4899, type: 'walker_ns' },
      { id: 'npc_walk_5', x: -1.2, z: 4, dirZ: -1, minZ: -10, maxZ: 7, speed: 0.85, color: 0x6366f1, type: 'walker_ns' },
      { id: 'npc_sit_1', x: -7.5, z: 18.2, color: 0xf8fafc, type: 'seated' },
      { id: 'npc_sit_2', x: -12.5, z: 18.2, color: 0x059669, type: 'seated' },
      { id: 'npc_sit_3', x: 8.5, z: 14.8, color: 0xd97706, type: 'seated' },
      { id: 'npc_dock_1', x: -6.5, z: 27.5, color: 0x1e3a8a, type: 'idle' },
      { id: 'npc_dock_2', x: 12.0, z: 27.5, color: 0x0284c7, type: 'idle' },
    ];

    for (const cfg of npcConfigs) {
      const npcGroup = new THREE.Group();
      npcGroup.position.set(cfg.x, 0, cfg.z);

      const skinMat = stdMat({ color: 0xfbcfe8, roughness: 0.8 });
      const clothesMat = stdMat({ color: cfg.color, roughness: 0.7 });
      const pantsMat = stdMat({ color: 0x334155, roughness: 0.8 });

      const torso = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.48, 0.22, 1, 0.04), clothesMat);
      torso.position.y = cfg.type === 'seated' ? 0.65 : 0.96;
      torso.castShadow = true;
      npcGroup.add(torso);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), skinMat);
      head.position.y = cfg.type === 'seated' ? 1.05 : 1.36;
      head.castShadow = true;
      npcGroup.add(head);

      if (cfg.type === 'seated') {
        const lap = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.12, 0.38, 1, 0.02), pantsMat);
        lap.position.set(0, 0.44, 0.14);
        npcGroup.add(lap);
      } else {
        const leftLeg = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.55, 0.14, 1, 0.02), pantsMat);
        leftLeg.position.set(-0.1, 0.42, 0);
        leftLeg.castShadow = true;
        npcGroup.add(leftLeg);

        const rightLeg = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.55, 0.14, 1, 0.02), pantsMat);
        rightLeg.position.set(0.1, 0.42, 0);
        rightLeg.castShadow = true;
        npcGroup.add(rightLeg);

        npcGroup.userData.leftLeg = leftLeg;
        npcGroup.userData.rightLeg = rightLeg;
      }

      this._contactShadow(0.7, 0.7, npcGroup);
      this.neighbourhoodGroup.add(npcGroup);
      this._pedestrians.push({ cfg, group: npcGroup });
    }
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
      if (t.z > 20) return; // Keep the southern ocean bay completely open
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

  _buildCoastalSkyline() {
    const skylineGroup = new THREE.Group();
    this.neighbourhoodGroup.add(skylineGroup);

    // 1. Pristine White Sand Shoreline along the bay edge (z = 22.0 to 24.0)
    const sandTex = makePavingStoneTexture();
    sandTex.repeat.set(12, 2);
    const sandMat = stdMat({ color: 0xfef3c7, roughness: 0.92 });
    const beachStrip = new THREE.Mesh(new THREE.PlaneGeometry(96, 2.8), sandMat);
    beachStrip.rotation.x = -Math.PI / 2;
    beachStrip.position.set(0, 0.015, 22.8);
    beachStrip.receiveShadow = true;
    skylineGroup.add(beachStrip);

    // Common Architectural Window Materials
    const windowGlowMat = stdMat({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.85,
      roughness: 0.25,
    });
    this._emissiveAnimated.push(windowGlowMat);

    const cyanGlassMat = stdMat({ color: 0x0284c7, roughness: 0.12, metalness: 0.92 });
    const azureGlassMat = stdMat({ color: 0x38bdf8, roughness: 0.10, metalness: 0.88 });
    const navyGlassMat = stdMat({ color: 0x0f172a, roughness: 0.15, metalness: 0.95 });
    const goldGlassMat = stdMat({ color: 0xd97706, roughness: 0.18, metalness: 0.85 });

    // -------------------------------------------------------------
    // ARCHETYPE BUILDERS (SimCity High-Density Realistic Archetypes)
    // -------------------------------------------------------------

    // Archetype 1: CYLINDRICAL DIAGRID TOWER (e.g. 30 St Mary Axe / Swiss Re)
    const buildCylindricalDiagridTower = (x, z, radius, height, name, glassMat) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);

      // Concrete podium base
      const podiumH = 4.2;
      const podium = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 1.15, radius * 1.25, podiumH, 32),
        stdMat({ color: 0xe2e8f0, roughness: 0.6, metalness: 0.1 })
      );
      podium.position.y = podiumH / 2;
      podium.castShadow = true; podium.receiveShadow = true;
      g.add(podium);

      // Curved tapered glass cylinder body
      const towerH = height - podiumH;
      const towerBody = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.72, radius, towerH, 32),
        glassMat
      );
      towerBody.position.y = podiumH + towerH / 2;
      towerBody.castShadow = true;
      g.add(towerBody);

      // Diagrid Exoskeleton Bracing (Spiral diamond structural steel cage)
      const ringCount = Math.floor(towerH / 5.5);
      for (let r = 0; r <= ringCount; r++) {
        const ringY = podiumH + r * 5.5;
        const ringRad = radius * (1 - 0.28 * (r / ringCount));
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(ringRad + 0.08, 0.12, 8, 32),
          stdMat({ color: 0xffffff, metalness: 0.9, roughness: 0.2 })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = ringY;
        g.add(ring);
      }

      // Vertical structural fins (12 around perimeter)
      for (let f = 0; f < 12; f++) {
        const angle = (f / 12) * Math.PI * 2;
        const fin = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, towerH, 0.35),
          stdMat({ color: 0xffffff, metalness: 0.85, roughness: 0.3 })
        );
        fin.position.set(Math.cos(angle) * (radius * 0.86), podiumH + towerH / 2, Math.sin(angle) * (radius * 0.86));
        fin.rotation.y = -angle;
        g.add(fin);
      }

      // Glowing Observation Skydeck Dome & Beacon
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 0.72, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        stdMat({ color: 0x38bdf8, roughness: 0.15, metalness: 0.85 })
      );
      dome.position.y = height;
      g.add(dome);

      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.25, 8.0, 8),
        stdMat({ color: 0xffffff, metalness: 0.95 })
      );
      beacon.position.y = height + 4.0;
      g.add(beacon);

      const tipLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 8),
        stdMat({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 2.5 })
      );
      tipLight.position.y = height + 8.0;
      g.add(tipLight);
      this._emissiveAnimated.push(tipLight.material);

      skylineGroup.add(g);
    };

    // Archetype 2: STEPPED CASCADE SKY-GARDEN HIGH-RISE (SimCity Green Luxury Terraces)
    const buildSteppedTerraceTower = (x, z, baseW, baseD, height, name) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);

      const tiers = [
        { h: height * 0.42, w: baseW, d: baseD, y: 0 },
        { h: height * 0.32, w: baseW * 0.78, d: baseD * 0.80, y: height * 0.42 },
        { h: height * 0.26, w: baseW * 0.54, d: baseD * 0.58, y: height * 0.74 }
      ];

      tiers.forEach((tier, idx) => {
        // Tier core (architectural white stone / concrete)
        const tierCore = new THREE.Mesh(
          new RoundedBoxGeometry(tier.w, tier.h, tier.d, 2, 0.3),
          stdMat({ color: 0xf8fafc, roughness: 0.45, metalness: 0.15 })
        );
        tierCore.position.y = tier.y + tier.h / 2;
        tierCore.castShadow = true; tierCore.receiveShadow = true;
        g.add(tierCore);

        // Reflective glass curtain panel
        const glass = new THREE.Mesh(
          new THREE.PlaneGeometry(tier.w * 0.86, tier.h * 0.88),
          cyanGlassMat
        );
        glass.position.set(0, tier.y + tier.h / 2, tier.d / 2 + 0.05);
        g.add(glass);

        // Cantilevered green terrace garden on top of tier
        if (idx < tiers.length - 1) {
          const terraceY = tier.y + tier.h;
          const greenGarden = new THREE.Mesh(
            new RoundedBoxGeometry(tier.w * 0.95, 0.35, tier.d * 0.95, 1, 0.05),
            stdMat({ color: 0x15803d, roughness: 0.85 })
          );
          greenGarden.position.y = terraceY + 0.18;
          g.add(greenGarden);

          // Glass terrace perimeter railing
          const railing = new THREE.Mesh(
            new RoundedBoxGeometry(tier.w * 0.98, 0.8, tier.d * 0.98, 1, 0.04),
            stdMat({ color: 0x38bdf8, transparent: true, opacity: 0.5, roughness: 0.1 })
          );
          railing.position.y = terraceY + 0.45;
          g.add(railing);
        }
      });

      // Rooftop Pergola and Spire
      const roofCrown = new THREE.Mesh(
        new RoundedBoxGeometry(baseW * 0.36, 1.8, baseD * 0.38, 1, 0.08),
        stdMat({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 })
      );
      roofCrown.position.y = height + 0.9;
      g.add(roofCrown);

      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.25, height * 0.22, 8),
        stdMat({ color: 0xffffff, metalness: 0.95 })
      );
      mast.position.y = height + 1.8 + (height * 0.11);
      g.add(mast);

      skylineGroup.add(g);
    };

    // Archetype 3: ELLIPTICAL TWIN TOWERS WITH SKYBRIDGE (Petronas / SimCity Signature)
    const buildTwinEllipticalTowers = (x, z, towerW, towerD, height, span, name) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);

      [-span / 2, span / 2].forEach((tx) => {
        const t = new THREE.Mesh(
          new RoundedBoxGeometry(towerW, height, towerD, 3, towerW * 0.38),
          azureGlassMat
        );
        t.position.set(tx, height / 2, 0);
        t.castShadow = true;
        g.add(t);

        // Horizontal architectural accent louvres
        for (let l = 6; l < height - 6; l += 4.5) {
          const louvre = new THREE.Mesh(
            new THREE.BoxGeometry(towerW + 0.5, 0.18, towerD + 0.5),
            stdMat({ color: 0xffffff, metalness: 0.85, roughness: 0.2 })
          );
          louvre.position.set(tx, l, 0);
          g.add(louvre);
        }

        // Tapered Spire Crown
        const crownSpire = new THREE.Mesh(
          new THREE.ConeGeometry(towerW * 0.45, 12, 16),
          stdMat({ color: 0xd4d4d8, metalness: 0.95, roughness: 0.1 })
        );
        crownSpire.position.set(tx, height + 6, 0);
        g.add(crownSpire);
      });

      // High-Altitude Glass Skybridge connecting the two towers at 60% height
      const bridgeY = height * 0.62;
      const bridge = new THREE.Mesh(
        new RoundedBoxGeometry(span - towerW * 0.6, 3.4, towerD * 0.65, 2, 0.2),
        stdMat({ color: 0x38bdf8, transparent: true, opacity: 0.75, roughness: 0.1, metalness: 0.8 })
      );
      bridge.position.set(0, bridgeY, 0);
      g.add(bridge);

      // Skybridge structural truss under-struts
      const strutL = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, span * 0.6, 8), stdMat({ color: 0xffffff, metalness: 0.9 }));
      strutL.rotation.z = Math.PI / 4;
      strutL.position.set(-span * 0.22, bridgeY - 2.0, 0);
      g.add(strutL);
      const strutR = strutL.clone();
      strutR.rotation.z = -Math.PI / 4;
      strutR.position.set(span * 0.22, bridgeY - 2.0, 0);
      g.add(strutR);

      skylineGroup.add(g);
    };

    // Archetype 4: OBSERVATION HELIPORT SKYSCRAPER (Melbourne Southbank / SimCity Corporate)
    const buildHeliportSkyscraper = (x, z, width, depth, height, name) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);

      // Hexagonal Core
      const coreGeo = new THREE.CylinderGeometry(width * 0.62, width * 0.70, height, 6);
      const core = new THREE.Mesh(coreGeo, navyGlassMat);
      core.position.y = height / 2;
      core.castShadow = true;
      g.add(core);

      // Cantilevered Circular Helipad Platform
      const padRadius = width * 0.75;
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(padRadius, padRadius, 0.8, 32),
        stdMat({ color: 0x334155, roughness: 0.85 })
      );
      pad.position.y = height + 0.4;
      pad.castShadow = true;
      g.add(pad);

      // Helipad Marking Ring & Bold 'H'
      const hMarking = new THREE.Mesh(
        new THREE.RingGeometry(padRadius * 0.45, padRadius * 0.55, 32),
        stdMat({ color: 0xfacc15, roughness: 0.4 })
      );
      hMarking.rotation.x = -Math.PI / 2;
      hMarking.position.y = height + 0.82;
      g.add(hMarking);

      // Perimeter Heliport Safety Lights (Green & Amber)
      for (let sl = 0; sl < 8; sl++) {
        const sAngle = (sl / 8) * Math.PI * 2;
        const sLight = new THREE.Mesh(
          new THREE.SphereGeometry(0.18, 8, 8),
          stdMat({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 2.2 })
        );
        sLight.position.set(Math.cos(sAngle) * (padRadius - 0.2), height + 0.9, Math.sin(sAngle) * (padRadius - 0.2));
        g.add(sLight);
        this._emissiveAnimated.push(sLight.material);
      }

      skylineGroup.add(g);
    };

    // Archetype 5: MELBOURNE EUREKA CROWN SPIRE (Faceted Crystalline Skyscraper with Gold Crown)
    const buildCrownSpireTower = (x, z, width, depth, height, name) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);

      // Slender tower shaft
      const shaft = new THREE.Mesh(
        new RoundedBoxGeometry(width, height, depth, 2, 0.4),
        cyanGlassMat
      );
      shaft.position.y = height / 2;
      shaft.castShadow = true;
      g.add(shaft);

      // Horizontal white architectural accent reveals
      for (let y = 5; y < height; y += 5.5) {
        const band = new THREE.Mesh(
          new THREE.BoxGeometry(width + 0.35, 0.22, depth + 0.35),
          stdMat({ color: 0xffffff, metalness: 0.8 })
        );
        band.position.y = y;
        g.add(band);
      }

      // 24-Carat Gold Observation Top Crown (Melbourne Eureka 88 style)
      const crownH = height * 0.18;
      const goldCrown = new THREE.Mesh(
        new RoundedBoxGeometry(width * 0.92, crownH, depth * 0.92, 1, 0.2),
        goldGlassMat
      );
      goldCrown.position.y = height + crownH / 2;
      goldCrown.castShadow = true;
      g.add(goldCrown);

      // Razor-sharp communications mast with beacon
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.35, 16, 8),
        stdMat({ color: 0xffffff, metalness: 0.95 })
      );
      mast.position.y = height + crownH + 8;
      g.add(mast);

      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 8),
        stdMat({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 3.0 })
      );
      beacon.position.y = height + crownH + 16;
      g.add(beacon);
      this._emissiveAnimated.push(beacon.material);

      skylineGroup.add(g);
    };

    // -------------------------------------------------------------
    // TOPOGRAPHICALLY ACCURATE CBD PLACEMENTS
    // (Solid Northern Ridgeline z: -38 to -68 & Coastal Promontories x: +-54 to +-78)
    // WATER CHANNEL (x in [-45, 45], z > 22) HAS ZERO BUILDINGS!
    // -------------------------------------------------------------

    // 1. Northern Skyline Ridge (Majestic backdrop overlooking the city and bay)
    buildCrownSpireTower(0, -48, 15, 14, 68, "Eureka Pinnacle");
    buildCylindricalDiagridTower(-22, -45, 7.5, 58, "Pacific Gherkin", cyanGlassMat);
    buildSteppedTerraceTower(22, -45, 16, 14, 52, "Southbank Terraces");
    buildTwinEllipticalTowers(-42, -42, 8.5, 8.5, 62, 18, "Oceanic Twin Towers");
    buildHeliportSkyscraper(42, -42, 14, 14, 56, "Metropolis Heliport");

    // Second northern tier (distant ridge towers)
    buildCylindricalDiagridTower(-12, -64, 8.0, 74, "Australis Spire", azureGlassMat);
    buildCrownSpireTower(14, -64, 16, 15, 78, "Port Phillip Horizon");
    buildSteppedTerraceTower(-36, -62, 18, 15, 66, "Victoria Summit");
    buildHeliportSkyscraper(36, -62, 15, 15, 64, "Crown Sovereign");

    // 2. West Coastal Headland Promontory (Solid ground x: -55 to -78, z: -10 to +18)
    buildCrownSpireTower(-58, 6, 13, 12, 44, "West Bay Spire");
    buildCylindricalDiagridTower(-68, -12, 7.0, 48, "Sunset Point Tower", azureGlassMat);
    buildSteppedTerraceTower(-62, 18, 12, 11, 38, "West Marina Promenade");

    // 3. East Coastal Headland Promontory (Solid ground x: 55 to 78, z: -10 to +18)
    buildHeliportSkyscraper(58, 6, 13, 13, 46, "East Bay Executive");
    buildTwinEllipticalTowers(68, -12, 7.5, 7.5, 48, 16, "Harbour Gate Twin");
    buildSteppedTerraceTower(62, 18, 12, 11, 36, "East Esplanade Residences");

    // -------------------------------------------------------------
    // 3. ELEVATED COASTAL FLYOVER HIGHWAY & ICONIC HARBOUR BRIDGES (Melbourne Bolte / West Gate)
    // Sweeping high-speed concrete viaduct and suspension bridge linking the city across the harbour
    // -------------------------------------------------------------
    const highwayGroup = new THREE.Group();
    skylineGroup.add(highwayGroup);

    const highwayDeckMat = stdMat({ color: 0x1e293b, roughness: 0.85 });
    const concretePierMat = stdMat({ color: 0x94a3b8, roughness: 0.7, metalness: 0.1 });
    const barrierMat = stdMat({ color: 0xffffff, roughness: 0.6 });
    const steelCableMat = stdMat({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.9 });

    // Primary Expressway Viaduct Deck spanning across the bay entrance (x = -180 to +180, z = 62.0, elevation y = 9.5m)
    const deckWidth = 360;
    const deckDepth = 6.4;
    const deckHeight = 0.85;
    const highwayElevation = 9.5;

    const deckMesh = new THREE.Mesh(
      new RoundedBoxGeometry(deckWidth, deckHeight, deckDepth, 3, 0.2),
      highwayDeckMat
    );
    deckMesh.position.set(0, highwayElevation, 62.0);
    deckMesh.castShadow = true; deckMesh.receiveShadow = true;
    highwayGroup.add(deckMesh);

    // Highway Lane Divider lines
    const hPaintMat = stdMat({ color: 0xfacc15, roughness: 0.35 });
    for (let hx = -172; hx <= 172; hx += 5.5) {
      const hDash = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.22), hPaintMat);
      hDash.rotation.x = -Math.PI / 2;
      hDash.position.set(hx, highwayElevation + deckHeight / 2 + 0.02, 62.0);
      highwayGroup.add(hDash);
    }

    // Concrete Viaduct Piers / Pylons (supporting the elevated expressway over the water)
    for (let px = -160; px <= 160; px += 24) {
      if (Math.abs(px) < 20) continue; // Keep main shipping channel clear
      const pier = new THREE.Mesh(
        new RoundedBoxGeometry(2.4, highwayElevation + 1.2, 4.8, 2, 0.25),
        concretePierMat
      );
      pier.position.set(px, (highwayElevation - 0.6) / 2, 62.0);
      pier.castShadow = true; pier.receiveShadow = true;
      highwayGroup.add(pier);

      // Pier crosshead support beam
      const crosshead = new THREE.Mesh(
        new RoundedBoxGeometry(3.2, 0.8, 6.2, 2, 0.15),
        concretePierMat
      );
      crosshead.position.set(px, highwayElevation - 0.45, 62.0);
      highwayGroup.add(crosshead);
    }

    // Iconic Twin Suspension Cable Towers (flanking the channel at x = -28 and +28, rising 42m high)
    [-28, 28].forEach((tx) => {
      const towerH = 38;
      const towerLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.4, towerH, 16), concretePierMat);
      towerLegL.position.set(tx, towerH / 2, 62.0 - 2.6);
      towerLegL.castShadow = true;
      highwayGroup.add(towerLegL);

      const towerLegR = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.4, towerH, 16), concretePierMat);
      towerLegR.position.set(tx, towerH / 2, 62.0 + 2.6);
      towerLegR.castShadow = true;
      highwayGroup.add(towerLegR);

      // Top Portal Strut
      const topCross = new THREE.Mesh(new RoundedBoxGeometry(2.2, 1.8, 6.4, 2, 0.2), concretePierMat);
      topCross.position.set(tx, towerH - 1.2, 62.0);
      highwayGroup.add(topCross);

      // High-tension steel stay cables radiating from tower top down to deck
      for (let c = 1; c <= 5; c++) {
        const offset = c * 9.5;
        const cableGeo = new THREE.CylinderGeometry(0.04, 0.04, Math.hypot(offset, towerH - highwayElevation), 6);
        const cableMeshL = new THREE.Mesh(cableGeo, steelCableMat);
        const angle = Math.atan2(offset, towerH - highwayElevation);
        cableMeshL.rotation.z = (tx < 0 ? 1 : -1) * angle;
        cableMeshL.position.set(tx + (tx < 0 ? -offset / 2 : offset / 2), (towerH + highwayElevation) / 2, 62.0);
        highwayGroup.add(cableMeshL);
      }
    });

    // -------------------------------------------------------------
    // 4. CENTRAL CAUSEWAY & DOWNTOWN LINK BRIDGE (Connecting City to South Peninsula)
    // Runs North-South from Waterfront z = 22m, across the inner marina to z = 185m
    // -------------------------------------------------------------
    const causewayMesh = new THREE.Mesh(
      new RoundedBoxGeometry(10.5, 1.2, 140, 3, 0.3),
      stdMat({ color: 0x334155, roughness: 0.85 })
    );
    causewayMesh.position.set(45.0, 1.8, 105.0);
    causewayMesh.receiveShadow = true; causewayMesh.castShadow = true;
    highwayGroup.add(causewayMesh);

    // Causeway Pylons
    for (let cz = 50; cz <= 165; cz += 22) {
      const cPier = new THREE.Mesh(
        new RoundedBoxGeometry(3.6, 4.2, 3.6, 2, 0.2),
        concretePierMat
      );
      cPier.position.set(45.0, 0.6, cz);
      cPier.castShadow = true; cPier.receiveShadow = true;
      highwayGroup.add(cPier);
    }

    // Causeway modern streetlights
    for (let cz = 45; cz <= 165; cz += 18) {
      [-4.6, 4.6].forEach(cx => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 4.5, 8), stdMat({ color: PALETTE.charcoal }));
        pole.position.set(45.0 + cx, 4.0, cz);
        highwayGroup.add(pole);

        const lum = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), stdMat({ color: 0xfff4e6, emissive: 0xfff4e6, emissiveIntensity: 2.2 }));
        lum.position.set(45.0 + cx + (cx > 0 ? -0.4 : 0.4), 6.2, cz);
        highwayGroup.add(lum);
      });
    }

    // -------------------------------------------------------------
    // 5. DISTANT SOUTHERN HEADLAND TOWN & PARKLAND (Across the Bay at z = 230 to 360)
    // -------------------------------------------------------------
    const southPeninsulaGroup = new THREE.Group();
    southPeninsulaGroup.position.set(0, 0, 260);
    skylineGroup.add(southPeninsulaGroup);

    // Coastal residential villas and green hills across the water
    const southVillaMat = stdMat({ color: 0xf8fafc, roughness: 0.7 });
    const southRoofMat = stdMat({ color: PALETTE.terracotta, roughness: 0.75 });
    for (let sx = -140; sx <= 140; sx += 22) {
      const sv = new THREE.Mesh(new RoundedBoxGeometry(9.5, 6.2, 8.0, 2, 0.25), southVillaMat);
      sv.position.set(sx + (sx % 7), 5.5, (sx % 13) * 3);
      sv.castShadow = true; sv.receiveShadow = true;
      southPeninsulaGroup.add(sv);

      const sr = new THREE.Mesh(new THREE.ConeGeometry(7.2, 3.2, 4), southRoofMat);
      sr.rotation.y = Math.PI / 4;
      sr.position.set(sx + (sx % 7), 10.0, (sx % 13) * 3);
      sr.castShadow = true;
      southPeninsulaGroup.add(sr);
    }

    // Modern White Guardrail Barriers with Integrated LED Glow Strips
    [-deckDepth / 2 + 0.15, deckDepth / 2 - 0.15].forEach((bz) => {
      const barrier = new THREE.Mesh(
        new RoundedBoxGeometry(deckWidth, 0.85, 0.25, 1, 0.04),
        barrierMat
      );
      barrier.position.set(0, highwayElevation + deckHeight / 2 + 0.42, 48.0 + bz);
      highwayGroup.add(barrier);

      const ledStrip = new THREE.Mesh(
        new THREE.PlaneGeometry(deckWidth, 0.08),
        stdMat({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 1.4 })
      );
      ledStrip.position.set(0, highwayElevation + deckHeight / 2 + 0.70, 48.0 + bz + (bz > 0 ? -0.14 : 0.14));
      if (bz > 0) ledStrip.rotation.y = Math.PI;
      highwayGroup.add(ledStrip);
      this._emissiveAnimated.push(ledStrip.material);
    });

    // Elevated Highway Overhead Gantry Signs & Streetlights
    [-32, 32].forEach((gx) => {
      const gantryPoleL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 4.8, 8), concretePierMat);
      gantryPoleL.position.set(gx, highwayElevation + 2.4, 48.0 - 2.8);
      highwayGroup.add(gantryPoleL);
      const gantryPoleR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 4.8, 8), concretePierMat);
      gantryPoleR.position.set(gx, highwayElevation + 2.4, 48.0 + 2.8);
      highwayGroup.add(gantryPoleR);

      const gantryBeam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 6.0), concretePierMat);
      gantryBeam.position.set(gx, highwayElevation + 4.6, 48.0);
      highwayGroup.add(gantryBeam);

      const gantrySign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.2), stdMat({ color: 0x059669, roughness: 0.4 }));
      gantrySign.position.set(gx, highwayElevation + 3.8, 48.0);
      gantrySign.rotation.y = Math.PI / 2;
      highwayGroup.add(gantrySign);
    });
  }

  _buildGridOverlay() {
    if (this._gridGroup) return;
    const gridGroup = new THREE.Group();
    gridGroup.visible = false;
    this.neighbourhoodGroup.add(gridGroup);
    this._gridGroup = gridGroup;

    // 1. Fine placement grid lines (1m intervals)
    const minorGrid = new THREE.GridHelper(84, 84, 0x38bdf8, 0x64748b);
    minorGrid.position.set(0, 0.02, 0);
    minorGrid.material.opacity = 0.28;
    minorGrid.material.transparent = true;
    minorGrid.material.depthWrite = false;
    gridGroup.add(minorGrid);

    // 2. Major building module grid lines (6m intervals matching GRID_UNIT_X = 6.0, GRID_UNIT_Z = 4.5)
    const majorGrid = new THREE.GridHelper(84, 14, 0x0284c7, 0x0284c7);
    majorGrid.position.set(0, 0.03, 0);
    majorGrid.material.opacity = 0.55;
    majorGrid.material.transparent = true;
    majorGrid.material.depthWrite = false;
    gridGroup.add(majorGrid);

    // 3. Highlighted Parcel Zones
    const parcelBounds = [
      { id: "dwelling-1", label: "Parcel (0, 0): Marina Villa North", x: -6, z: -4.5, w: 8.5, d: 6.0, color: 0x38bdf8 },
      { id: "dwelling-2", label: "Parcel (2, 0): Palm Terrace Villa", x: 6, z: -4.5, w: 8.5, d: 6.0, color: 0x38bdf8 },
      { id: "shop", label: "Parcel (0, 2): Waterfront Espresso", x: -6, z: 4.5, w: 4.7, d: 4.2, color: 0x10b981 },
      { id: "workshop", label: "Parcel (2, 2): Maritime Atelier", x: 6, z: 4.5, w: 4.7, d: 4.2, color: 0xf59e0b },
      { id: "esplanade", label: "Civic Esplanade & Promenade", x: 0, z: 14.5, w: 24.0, d: 14.0, color: 0x6366f1 },
      { id: "marina", label: "South Marina Pier & Yacht Harbour", x: 0, z: 28.0, w: 36.0, d: 12.0, color: 0x06b6d4 },
    ];

    parcelBounds.forEach((p) => {
      const box = new THREE.Box3(
        new THREE.Vector3(p.x - p.w / 2, 0.04, p.z - p.d / 2),
        new THREE.Vector3(p.x + p.w / 2, 0.08, p.z + p.d / 2)
      );
      const helper = new THREE.Box3Helper(box, p.color);
      helper.material.opacity = 0.75;
      helper.material.transparent = true;
      gridGroup.add(helper);
    });

    // 4. Snapped Cell Cursor Box (1m x 1m)
    const cursorGeo = new THREE.BoxGeometry(1.0, 0.06, 1.0);
    const cursorMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    const cursor = new THREE.Mesh(cursorGeo, cursorMat);
    cursor.position.set(0, 0.05, 0);
    cursor.visible = false;
    gridGroup.add(cursor);
    this._gridCursor = cursor;

    // Raycaster listener on canvas
    this._initGridRaycaster();
  }

  _initGridRaycaster() {
    if (typeof window === "undefined" || !this.canvas) return;
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hitPt = new THREE.Vector3();

    let rafPending = false;
    let lastClientX = 0, lastClientY = 0;
    let lastSnappedX = null, lastSnappedZ = null, lastOccupied = null;

    const processPointer = () => {
      rafPending = false;
      if (!this._gridVisible || !this._gridCursor) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = ((lastClientX - rect.left) / rect.width) * 2 - 1;
      const y = -((lastClientY - rect.top) / rect.height) * 2 + 1;
      this._mouse.set(x, y);
      this._raycaster.setFromCamera(this._mouse, this.camera);

      if (this._raycaster.ray.intersectPlane(groundPlane, hitPt)) {
        if (Math.abs(hitPt.x) <= 40 && hitPt.z >= -25 && hitPt.z <= 22) {
          const snappedX = Math.round(hitPt.x);
          const snappedZ = Math.round(hitPt.z);

            // Authoritative dynamic collision detection using full candidate AABB against CITY_ZONING
            let occupied = false;
            const world = this.nextWorld;
            const centerX = this._plotCenter ? this._plotCenter.x : 0;
            const centerZ = this._plotCenter ? this._plotCenter.z : 0;

            // Candidate placement footprint AABB (standard bench/amenity: 1.4m W x 0.8m D)
            const candHalfW = CITY_ZONING.CANDIDATE_HALF_W;
            const candHalfD = CITY_ZONING.CANDIDATE_HALF_D;
            const cMinX = snappedX - candHalfW;
            const cMaxX = snappedX + candHalfW;
            const cMinZ = snappedZ - candHalfD;
            const cMaxZ = snappedZ + candHalfD;

            // AABB vs AABB overlap with configurable setback margin
            const aabbOverlap = (minX, maxX, minZ, maxZ, setback = 0) => {
              return cMinX < (maxX + setback) && cMaxX > (minX - setback) &&
                     cMinZ < (maxZ + setback) && cMaxZ > (minZ - setback);
            };

            // Candidate AABB vs circular obstacle with setback margin
            const circleOverlap = (cx, cz, radius, setback = 0) => {
              const clampX = Math.max(cMinX, Math.min(cx, cMaxX));
              const clampZ = Math.max(cMinZ, Math.min(cz, cMaxZ));
              return Math.hypot(cx - clampX, cz - clampZ) < (radius + setback);
            };

            // 1. Check all live building footprints + plinth overhangs + building setback
            if (world && world.buildings) {
              for (const b of world.buildings) {
                const bPos = plotToWorldXZ(b.plot, centerX, centerZ);
                const scale = BUILDING_TYPE_SCALE[b.type] || BUILDING_TYPE_SCALE.dwelling;
                const halfW = (scale.w * BUILDING_W + 0.35) / 2;
                const halfD = (scale.d * BUILDING_D + 0.35) / 2;
                if (aabbOverlap(bPos.x - halfW, bPos.x + halfW, bPos.z - halfD, bPos.z + halfD, CITY_ZONING.BUILDING_SETBACK)) {
                  occupied = true;
                  break;
                }
              }
            }

            // 2. Check waterfront fountain piazza circle
            if (!occupied && circleOverlap(CITY_ZONING.FOUNTAIN_PIAZZA.x, CITY_ZONING.FOUNTAIN_PIAZZA.z, CITY_ZONING.FOUNTAIN_PIAZZA.radius, 0.25)) {
              occupied = true;
            }

            // 3. Check central compass plaza circle
            if (!occupied && circleOverlap(CITY_ZONING.COMPASS_PLAZA.x, CITY_ZONING.COMPASS_PLAZA.z, CITY_ZONING.COMPASS_PLAZA.radius, 0.20)) {
              occupied = true;
            }

            // 4. Check authoritative vehicular roadway carriageway corridor & seawall
            if (!occupied && (aabbOverlap(-48, 48, CITY_ZONING.ROAD_CARRIAGEWAY.zMin, CITY_ZONING.ROAD_CARRIAGEWAY.zMax, CITY_ZONING.ROAD_SETBACK) ||
                             cMaxZ >= CITY_ZONING.WATERFRONT_SEAWALL.zMin)) {
              occupied = true;
            }

            // 5. Check connecting side street avenues (West & East at x = +-18)
            if (!occupied && (aabbOverlap(CITY_ZONING.SIDE_AVENUE_WEST.xMin, CITY_ZONING.SIDE_AVENUE_WEST.xMax, CITY_ZONING.SIDE_AVENUE_WEST.zMin, CITY_ZONING.SIDE_AVENUE_WEST.zMax, CITY_ZONING.ROAD_SETBACK) ||
                             aabbOverlap(CITY_ZONING.SIDE_AVENUE_EAST.xMin, CITY_ZONING.SIDE_AVENUE_EAST.xMax, CITY_ZONING.SIDE_AVENUE_EAST.zMin, CITY_ZONING.SIDE_AVENUE_EAST.zMax, CITY_ZONING.ROAD_SETBACK))) {
              occupied = true;
            }

            // 6. Check static district structures with calibrated non-overlapping footprints
            if (!occupied) {
              const staticObstacles = [
                { x: 29.0, z: 18.0, hw: 6.8, hd: 4.0 },  // Yacht Club Pavilion (Marina Waterfront, z = 18.0)
                { x: -29.0, z: 18.0, hw: 7.5, hd: 4.0 }, // Terraced Townhouses (Bayview Waterfront, z = 18.0)
                { x: -28.5, z: 0.0, hw: 6.5, hd: 5.0 },  // Boutique Hotel & Rooftop Bar
                { x: -28.5, z: -12.0, hw: 7.6, hd: 8.5 },// Maritime Innovation Atelier / Studio (roof hw: 7.6, deck hd: 8.5)
                { x: 26.0, z: -20.0, hw: 4.9, hd: 4.9 }, // Seaside Headland Rotunda (centered x: 26.0, base radius: 4.9)
                { x: 28.0, z: -8.0, hw: 5.2, hd: 4.0 },  // Villa Azure (East Quarter Villa 1 at [28.0, -8.0])
                { x: 38.0, z: 0.0, hw: 4.8, hd: 3.8 },   // Villa Palmera (East Quarter Villa 2 at [38.0, 0.0])
                { x: 0, z: -32.0, hw: 6.5, hd: 6.5 },    // Ocean Beacon Headland
                { x: 8.5, z: 14.8, hw: 2.2, hd: 1.0 },   // Transit Shelter
                { x: -7.5, z: 18.5, hw: 1.6, hd: 1.6 },  // Cafe Table 1
                { x: -12.5, z: 18.5, hw: 1.6, hd: 1.6 }, // Cafe Table 2
              ];
              for (const obs of staticObstacles) {
                if (aabbOverlap(obs.x - obs.hw, obs.x + obs.hw, obs.z - obs.hd, obs.z + obs.hd, 0.2)) {
                  occupied = true;
                  break;
                }
              }
            }

            // 7. Check existing outdoor placements using actual type footprint
            if (!occupied && world && world.placements) {
              for (const p of world.placements) {
                if (p.location === "outdoors" && p.plot) {
                  const pos = plotToWorldXZ(p.plot, centerX, centerZ);
                  const typeDef = this._objectTypes?.[p.type];
                  const halfW = (typeDef?.footprint?.w || 1.4) / 2;
                  const halfD = (typeDef?.footprint?.d || 1.2) / 2;
                  if (aabbOverlap(pos.x - halfW, pos.x + halfW, pos.z - halfD, pos.z + halfD, CITY_ZONING.OBJECT_SETBACK)) {
                    occupied = true;
                    break;
                  }
                }
              }
            }

          this._gridOccupied = occupied;
          this._gridCursor.position.set(snappedX, 0.05, snappedZ);
          this._gridCursor.visible = true;

          // Update DOM and material only on state transition
          if (snappedX !== lastSnappedX || snappedZ !== lastSnappedZ || occupied !== lastOccupied) {
            lastSnappedX = snappedX;
            lastSnappedZ = snappedZ;
            lastOccupied = occupied;

            if (occupied) {
              this._gridCursor.material.color.setHex(0xef4444);
            } else {
              this._gridCursor.material.color.setHex(0x10b981);
            }

            const coordBadge = document.getElementById('grid-cell-coords');
            if (coordBadge) {
              coordBadge.style.display = 'block';
              coordBadge.innerHTML = `📐 <strong>Grid:</strong> [X: ${snappedX >= 0 ? '+' : ''}${snappedX}m, Z: ${snappedZ >= 0 ? '+' : ''}${snappedZ}m] · <span style="color:${occupied ? '#ef4444' : '#10b981'}">${occupied ? 'OCCUPIED (Clearance Buffer)' : 'CLEAR (Buildable)'}</span>`;
            }
          }
        } else {
          this._gridCursor.visible = false;
        }
      }
    };

    const onPointerMove = (e) => {
      lastClientX = e.clientX;
      lastClientY = e.clientY;
      if (!rafPending) {
        rafPending = true;
        this._gridRafId = requestAnimationFrame(processPointer);
      }
    };

    const onPointerLeave = () => {
      if (this._gridCursor) this._gridCursor.visible = false;
      const coordBadge = document.getElementById('grid-cell-coords');
      if (coordBadge) coordBadge.style.display = 'none';
      lastSnappedX = null;
      lastSnappedZ = null;
      lastOccupied = null;
    };

    const onClick = () => {
      if (!this._gridVisible || !this._gridCursor || !this._gridCursor.visible) return;
      const sx = this._gridCursor.position.x;
      const sz = this._gridCursor.position.z;

      if (this._gridOccupied) {
        const coordBadge = document.getElementById('grid-cell-coords');
        if (coordBadge) {
          coordBadge.innerHTML = `⚠️ <span style="color:#ef4444"><strong>Cell [${sx}, ${sz}] Occupied:</strong> Clearance buffer required before building.</span>`;
        }
        if (this.audio) this.audio.playDropThud();
        return;
      }

      const input = document.getElementById('bar-request-input');
      if (input) {
        input.value = `Place coastal bench at (${sx}, ${sz}) outdoors`;
        input.focus();
      }
      this.playClickSound();
    };

    this._gridPointerMove = onPointerMove;
    this._gridPointerLeave = onPointerLeave;
    this._gridClick = onClick;
    this.canvas.addEventListener('pointermove', onPointerMove);
    this.canvas.addEventListener('pointerleave', onPointerLeave);
    this.canvas.addEventListener('click', onClick);
  }

  toggleGrid(force) {
    this._gridVisible = force !== undefined ? !!force : !this._gridVisible;
    if (this._gridGroup) this._gridGroup.visible = this._gridVisible;
    if (this._gridCursor) this._gridCursor.visible = this._gridVisible;
    const badge = document.getElementById('grid-cell-coords');
    if (badge) badge.style.display = this._gridVisible ? 'block' : 'none';
    this.playClickSound();
    return this._gridVisible;
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
    // Polished modern sandstone architectural plinth
    // Plinth height = 0.28m; centered at y = 0.145m so bottom is y = +0.005m (above terrain y = 0, zero clipping)
    const plinthH = 0.28;
    const plinthY = 0.145;
    const plinthTop = plinthY + plinthH / 2; // 0.285m
    const plinth = new THREE.Mesh(
      new RoundedBoxGeometry(w + 0.35, plinthH, d + 0.35, 2, 0.08),
      stdMat({ color: PALETTE.sandstone, roughness: 0.85 })
    );
    plinth.position.y = plinthY;
    plinth.receiveShadow = true;
    group.add(plinth);

    const floorH = 0.18;
    const floorY = plinthTop + floorH / 2; // 0.375m
    const floorTop = plinthTop + floorH;   // 0.465m
    const floorMaterialKey = surfaceMaterialKey(this._surfaces, "floor", "wood");
    const floor = new THREE.Mesh(
      new RoundedBoxGeometry(w, floorH, d, 3, 0.08),
      texturedMat(floorMaterialKey, surfaceColor(this._surfaces, "floor", PALETTE.floor), w, d, { roughness: 0.82, metalness: 0.02 }),
    );
    floor.position.y = floorY;
    floor.receiveShadow = true;
    group.add(floor);

    const wallH = 2.5;
    const wallY = floorTop + wallH / 2;
    const roofBaseY = floorTop + wallH;
    const wallThick = 0.18;
    const wallMaterialKey = surfaceMaterialKey(this._surfaces, "wall", "plaster");
    // Distinct architectural facade materials for each building
    let buildingWallColor = surfaceColor(this._surfaces, "wall", PALETTE.wall);
    let buildingRoughness = 0.82;
    let buildingMetalness = 0.0;
    if (building.id === "dwelling-1") {
      buildingWallColor = 0xf1f5f9; // Crisp modern white architectural render
      buildingRoughness = 0.65;
    } else if (building.id === "dwelling-2") {
      buildingWallColor = 0xfef3c7; // Warm Mediterranean coastal ochre stucco
      buildingRoughness = 0.90;
    } else if (building.type === "shop") {
      buildingWallColor = 0x0f172a; // Chic slate charcoal storefront with brass accents
      buildingRoughness = 0.50;
      buildingMetalness = 0.20;
    } else if (building.type === "workshop") {
      buildingWallColor = 0x94a3b8; // Modern industrial brushed cast concrete
      buildingRoughness = 0.88;
      buildingMetalness = 0.08;
    }
    const wallMat = texturedMat(wallMaterialKey, buildingWallColor, (w + d) / 2, wallH, { roughness: buildingRoughness, metalness: buildingMetalness });
    const sillMat = stdMat({ color: PALETTE.charcoal, roughness: 0.6 });
    const frameMat = stdMat({ color: PALETTE.charcoal, roughness: 0.5, metalness: 0.4 });
    const windowGlowMat = stdMat({
      color: PALETTE.glass,
      emissive: 0x93c5fd,
      emissiveIntensity: 0.45,
      roughness: 0.15,
      transparent: true,
      opacity: 0.85,
    });

    // 1. Back Wall (z = -d / 2) with smooth rounded bevel
    const backWall = new THREE.Mesh(new RoundedBoxGeometry(w, wallH, wallThick, 3, 0.08), wallMat);
    backWall.position.set(0, wallY, -d / 2);
    backWall.receiveShadow = true; backWall.castShadow = true;
    group.add(backWall);

    // 2. Left Wall (x = -w / 2) with smoothly filleted window piers
    const leftWall = new THREE.Group();
    const leftSolid1 = new THREE.Mesh(new RoundedBoxGeometry(wallThick, wallH, d * 0.3, 3, 0.08), wallMat);
    leftSolid1.position.set(-w / 2, wallY, -d * 0.35);
    leftSolid1.castShadow = true; leftSolid1.receiveShadow = true;
    leftWall.add(leftSolid1);
    const leftSolid2 = new THREE.Mesh(new RoundedBoxGeometry(wallThick, wallH, d * 0.3, 3, 0.08), wallMat);
    leftSolid2.position.set(-w / 2, wallY, d * 0.35);
    leftSolid2.castShadow = true; leftSolid2.receiveShadow = true;
    leftWall.add(leftSolid2);
    const leftSill = new THREE.Mesh(new RoundedBoxGeometry(wallThick + 0.12, 0.8, d * 0.4, 2, 0.06), sillMat);
    leftSill.position.set(-w / 2, floorTop + 0.4, 0);
    leftWall.add(leftSill);
    const leftLintel = new THREE.Mesh(new RoundedBoxGeometry(wallThick + 0.12, 0.5, d * 0.4, 2, 0.06), sillMat);
    leftLintel.position.set(-w / 2, roofBaseY - 0.25, 0);
    leftWall.add(leftLintel);
    const leftGlass = new THREE.Mesh(new THREE.PlaneGeometry(d * 0.38, 1.2), windowGlowMat);
    leftGlass.position.set(-w / 2, floorTop + 1.4, 0);
    leftGlass.rotation.y = Math.PI / 2;
    leftWall.add(leftGlass);
    group.add(leftWall);

    // 3. Right Wall (x = +w / 2) with matching filleted window piers
    const rightWall = new THREE.Group();
    const rightSolid1 = new THREE.Mesh(new RoundedBoxGeometry(wallThick, wallH, d * 0.3, 3, 0.08), wallMat);
    rightSolid1.position.set(w / 2, wallY, -d * 0.35);
    rightSolid1.castShadow = true; rightSolid1.receiveShadow = true;
    rightWall.add(rightSolid1);
    const rightSolid2 = new THREE.Mesh(new RoundedBoxGeometry(wallThick, wallH, d * 0.3, 3, 0.08), wallMat);
    rightSolid2.position.set(w / 2, wallY, d * 0.35);
    rightSolid2.castShadow = true; rightSolid2.receiveShadow = true;
    rightWall.add(rightSolid2);
    const rightSill = new THREE.Mesh(new RoundedBoxGeometry(wallThick + 0.12, 0.8, d * 0.4, 2, 0.06), sillMat);
    rightSill.position.set(w / 2, floorTop + 0.4, 0);
    rightWall.add(rightSill);
    const rightLintel = new THREE.Mesh(new RoundedBoxGeometry(wallThick + 0.12, 0.5, d * 0.4, 2, 0.06), sillMat);
    rightLintel.position.set(w / 2, roofBaseY - 0.25, 0);
    rightWall.add(rightLintel);
    const rightGlass = new THREE.Mesh(new THREE.PlaneGeometry(d * 0.38, 1.2), windowGlowMat);
    rightGlass.position.set(w / 2, floorTop + 1.4, 0);
    rightGlass.rotation.y = -Math.PI / 2;
    rightWall.add(rightGlass);
    group.add(rightWall);

    // 4. Front Wall (z = d / 2) with door opening & corner glazing
    const frontWall = new THREE.Group();
    frontWall.visible = this._roofsVisible;
    const doorW = 1.35;
    const sideW = (w - doorW) / 2;

    // Left side of front wall
    const fLeft = new THREE.Mesh(new RoundedBoxGeometry(sideW, wallH, wallThick, 2, 0.05), wallMat);
    fLeft.position.set(-doorW / 2 - sideW / 2, wallY, d / 2);
    fLeft.castShadow = true; fLeft.receiveShadow = true;
    frontWall.add(fLeft);

    // Right side of front wall
    const fRight = new THREE.Mesh(new RoundedBoxGeometry(sideW, wallH, wallThick, 2, 0.05), wallMat);
    fRight.position.set(doorW / 2 + sideW / 2, wallY, d / 2);
    fRight.castShadow = true; fRight.receiveShadow = true;
    frontWall.add(fRight);

    // Door lintel
    const fLintel = new THREE.Mesh(new RoundedBoxGeometry(doorW, 0.4, wallThick, 2, 0.03), wallMat);
    fLintel.position.set(0, roofBaseY - 0.2, d / 2);
    frontWall.add(fLintel);

    // Modern glass door with black aluminum frame
    const doorGlass = new THREE.Mesh(new THREE.PlaneGeometry(doorW * 0.85, 2.05), windowGlowMat);
    doorGlass.position.set(0, floorTop + 1.05, d / 2 + 0.01);
    frontWall.add(doorGlass);
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(doorW * 0.9, 2.1, 0.04), frameMat);
    doorFrame.position.set(0, floorTop + 1.05, d / 2);
    frontWall.add(doorFrame);

    group.add(frontWall);
    this._frontFacadesByBuildingId[building.id] = frontWall;

    // Black structural corner posts
    [-w / 2, w / 2].forEach((px) => {
      [-d / 2, d / 2].forEach((pz) => {
        const post = new THREE.Mesh(new RoundedBoxGeometry(0.22, wallH + 0.1, 0.22, 1, 0.03), stdMat({ color: PALETTE.charcoal, roughness: 0.6, metalness: 0.4 }));
        post.position.set(px, wallY, pz);
        post.castShadow = true;
        group.add(post);
      });
    });

    // Distinct Architectural Archetypes based on building.id
    if (building.id === "dwelling-1") {
      // -------------------------------------------------------------
      // ARCHETYPE 1: MARINA PENTHOUSE VILLA (Stepped Luxury Modernist)
      // -------------------------------------------------------------
      const penthouseRoof = new THREE.Group();
      penthouseRoof.position.y = roofBaseY;

      // Upper master bedroom suite (cantilevered forward)
      const suiteW = w * 0.78, suiteD = d * 0.72, suiteH = 2.1;
      const suite = new THREE.Mesh(new RoundedBoxGeometry(suiteW, suiteH, suiteD, 2, 0.06), wallMat);
      suite.position.set(0, suiteH / 2, -d * 0.08);
      suite.castShadow = true; suite.receiveShadow = true;
      penthouseRoof.add(suite);

      // Floor-to-ceiling panoramic glass front
      const suiteGlass = new THREE.Mesh(new THREE.PlaneGeometry(suiteW * 0.88, suiteH * 0.78), windowGlowMat);
      suiteGlass.position.set(0, suiteH / 2, -d * 0.08 + suiteD / 2 + 0.02);
      penthouseRoof.add(suiteGlass);

      // Cantilevered rooftop terrace deck & glass railing
      const sundeck = new THREE.Mesh(new RoundedBoxGeometry(w + 0.2, 0.1, d + 0.2, 1, 0.02), stdMat({ color: PALETTE.teak, roughness: 0.55 }));
      sundeck.position.set(0, 0.05, 0);
      sundeck.receiveShadow = true;
      penthouseRoof.add(sundeck);

      // Glass balustrades around sundeck
      const balustrade = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.85, 0.04), windowGlowMat);
      balustrade.position.set(0, 0.48, d / 2);
      penthouseRoof.add(balustrade);

      // Rooftop solar array with glowing photovoltaic panels
      const solarMat = stdMat({ color: 0x0f172a, emissive: 0x0284c7, emissiveIntensity: 0.35, roughness: 0.1, metalness: 0.9 });
      for (let s = 0; s < 3; s++) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 1.1), solarMat);
        panel.position.set(-w * 0.25 + s * 1.8, suiteH + 0.12, -d * 0.08);
        panel.rotation.x = 0.18;
        penthouseRoof.add(panel);
      }

      group.add(penthouseRoof);
      this._roofsByBuildingId[building.id] = penthouseRoof;
      this._roofGroups.push(penthouseRoof);

      // Cantilevered front terrace louvers
      const louver = new THREE.Mesh(new RoundedBoxGeometry(w * 0.9, 0.08, 1.6, 1, 0.02), stdMat({ color: PALETTE.charcoal, roughness: 0.5 }));
      louver.position.set(0, roofBaseY - 0.1, d / 2 + 0.8);
      group.add(louver);

    } else if (building.id === "dwelling-2") {
      // -------------------------------------------------------------
      // ARCHETYPE 2: PALM TERRACE VILLA (Modern Mediterranean Coastal)
      // -------------------------------------------------------------
      const roof = this._addPeakedRoof(group, w, d, roofBaseY, PALETTE.terracotta);
      this._roofsByBuildingId[building.id] = roof;

      // Private teak front sundeck
      const deck = new THREE.Mesh(new RoundedBoxGeometry(w + 0.3, 0.08, 1.8, 1, 0.02), stdMat({ color: PALETTE.teak, roughness: 0.6 }));
      deck.position.set(0, plinthTop + 0.04, d / 2 + 0.9);
      deck.receiveShadow = true;
      group.add(deck);

      // Sun lounger daybed on terrace
      const loungerMat = stdMat({ color: 0xf8fafc, roughness: 0.6 });
      const lounger = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.22, 1.6, 1, 0.02), loungerMat);
      lounger.position.set(w * 0.28, plinthTop + 0.15, d / 2 + 0.9);
      lounger.castShadow = true; group.add(lounger);

      // Flowering Mediterranean bougainvillea planter
      const box = new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.22, 0.3, 1, 0.02), stdMat({ color: 0xf8fafc, roughness: 0.8 }));
      box.position.set(-w * 0.25, plinthTop + 0.15, d / 2 + 0.9);
      group.add(box);
      const floraMat = stdMat({ color: 0xf43f5e, roughness: 0.6 });
      for (let fl = 0; fl < 5; fl++) {
        const flo = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), floraMat);
        flo.position.set(-w * 0.25 - 0.5 + fl * 0.25, plinthTop + 0.32, d / 2 + 0.9);
        group.add(flo);
      }

    } else if (building.type === "shop") {
      // -------------------------------------------------------------
      // ARCHETYPE 3: WATERFRONT ESPRESSO & BOUTIQUE (Glass Pavilion)
      // -------------------------------------------------------------
      const shopRoof = new THREE.Group();
      shopRoof.position.y = roofBaseY;
      const roofSlab = new THREE.Mesh(new RoundedBoxGeometry(w + 0.8, 0.18, d + 1.2, 1, 0.03), stdMat({ color: PALETTE.charcoal, roughness: 0.5 }));
      roofSlab.position.set(0, 0.09, 0.3);
      roofSlab.castShadow = true;
      shopRoof.add(roofSlab);
      group.add(shopRoof);
      this._roofsByBuildingId[building.id] = shopRoof;
      this._roofGroups.push(shopRoof);

      // Deep Azure Linen Canvas Awning over the cafe deck
      const awning = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.4, 1.8), stdMat({ color: 0x0284c7, roughness: 0.7, side: THREE.DoubleSide }));
      awning.position.set(0, roofBaseY - 0.2, d / 2 + 0.85);
      awning.rotation.x = 0.28;
      group.add(awning);

      // Teak outdoor cafe boardwalk
      const cafeDeck = new THREE.Mesh(new RoundedBoxGeometry(w + 0.8, 0.08, 2.0, 1, 0.02), stdMat({ color: PALETTE.teak, roughness: 0.6 }));
      cafeDeck.position.set(0, plinthTop + 0.04, d / 2 + 1.0);
      cafeDeck.receiveShadow = true;
      group.add(cafeDeck);

      // Polished brass bistro table with warm glowing lantern
      const brassMat = stdMat({ color: 0xd97706, roughness: 0.25, metalness: 0.85 });
      const cafeTable = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.04, 16), brassMat);
      cafeTable.position.set(0.6, plinthTop + 0.65, d / 2 + 1.0);
      cafeTable.castShadow = true; group.add(cafeTable);
      const cafeTableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.62, 8), brassMat);
      cafeTableLeg.position.set(0.6, plinthTop + 0.32, d / 2 + 1.0);
      group.add(cafeTableLeg);

      const lanternLight = new THREE.PointLight(0xffaa33, 0.9, 6, 2);
      lanternLight.position.set(0, roofBaseY - 0.8, d / 2 + 0.6);
      lanternLight.userData.baseIntensity = 0.9;
      lanternLight.userData.isStreetLamp = true;
      group.add(lanternLight);
      this._pointLights.push(lanternLight);

    } else {
      // -------------------------------------------------------------
      // ARCHETYPE 4: MARITIME PROTOTYPING ATELIER (Modern Industrial Loft)
      // -------------------------------------------------------------
      const workshopRoof = new THREE.Group();
      workshopRoof.position.y = roofBaseY;
      const roofSlab = new THREE.Mesh(new RoundedBoxGeometry(w + 0.5, 0.2, d + 0.5, 1, 0.03), stdMat({ color: 0x334155, roughness: 0.6, metalness: 0.4 }));
      roofSlab.position.set(0, 0.1, 0);
      workshopRoof.add(roofSlab);
      // Clerestory skylight
      const skylight = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.6, d * 0.5), windowGlowMat);
      skylight.position.set(0, 0.4, 0);
      workshopRoof.add(skylight);
      group.add(workshopRoof);
      this._roofsByBuildingId[building.id] = workshopRoof;
      this._roofGroups.push(workshopRoof);
      // Vertical teak architectural louvers along the facade
      const louverMat = stdMat({ color: PALETTE.teak, roughness: 0.55 });
      for (let l = 0; l < 4; l++) {
        const slat = new THREE.Mesh(new RoundedBoxGeometry(0.06, wallH, 0.18, 1, 0.02), louverMat);
        slat.position.set(-w / 2 + 0.4 + l * 0.35, wallY, d / 2 + 0.12);
        slat.castShadow = true;
        group.add(slat);
      }

      // Outdoor yacht hull scale design model on display
      const modelHull = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.8, 8), stdMat({ color: 0xf8fafc, roughness: 0.2, metalness: 0.1 }));
      modelHull.rotation.z = Math.PI / 2;
      modelHull.position.set(w / 2 + 0.65, 0.75, 0);
      modelHull.castShadow = true; group.add(modelHull);
      const modelStand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.65, 0.8), stdMat({ color: PALETTE.charcoal, roughness: 0.5 }));
      modelStand.position.set(w / 2 + 0.65, 0.35, 0);
      group.add(modelStand);
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

    const overrideColor = placement.colour || (placement.overrides && placement.overrides.color);
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
    return group;
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
    let initialCamDist = this._camDist || 48;
    let clickStartX = 0, clickStartY = 0;

    const onDown = (e) => {
      if (this._isDroneTour) this.stopDroneTour();

      // Check if user is in "Pick Center / Pivot" mode or holding Alt key
      if (this._pickCenterActive || e.altKey) {
        this._setCenterFromPointer(e);
        this._pickCenterActive = false;
        if (this._onPickCenterDone) this._onPickCenterDone();
        return;
      }

      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size === 1) {
        this._orbit.dragging = true;
        this._orbit.startX = e.clientX;
        this._orbit.startY = e.clientY;
        clickStartX = e.clientX;
        clickStartY = e.clientY;
        this._orbit.startDelta = this._orbit.delta;
        this._orbit.startPitch = this._orbit.pitch || 0.38;
        this._streetStartAngle = this._streetAngle;
        this._streetStartPitch = this._streetPitch;
        initialPinchDist = null;
      } else if (activePointers.size === 2) {
        this._orbit.dragging = false;
        const [p1, p2] = Array.from(activePointers.values());
        initialPinchDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        initialCamDist = this._camDist || 48;
      }
    };

    const onMove = (e) => {
      if (!activePointers.has(e.pointerId)) return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size === 2 && initialPinchDist) {
        const [p1, p2] = Array.from(activePointers.values());
        const currentDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        const ratio = initialPinchDist / Math.max(1, currentDist);
        this._camDist = Math.max(5, Math.min(320, initialCamDist * ratio));
        this._targetCamDist = this._camDist;
        return;
      }

      if (this._orbit.dragging && activePointers.size === 1) {
        const dx = (e.clientX - this._orbit.startX) / Math.max(1, canvas.clientWidth);
        const dy = (e.clientY - this._orbit.startY) / Math.max(1, canvas.clientHeight);

        if (this._navigationMode === 'walk' || this._navigationMode === 'drive') {
          // In street mode, dragging looks around in first/third person
          this._streetAngle = this._streetStartAngle - dx * 2.8;
          this._streetPitch = Math.max(-0.65, Math.min(0.75, this._streetStartPitch - dy * 1.8));
        } else {
          // Standard orbit navigation
          this._orbit.delta = this._orbit.startDelta + dx * 2.2;
          // Pitch range: 0.06 rad (~3.5 deg low-angle) to 1.52 rad (~87 deg top-down)
          this._orbit.pitch = Math.max(0.06, Math.min(1.52, this._orbit.startPitch + dy * 1.3));
        }
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
        this._orbit.startPitch = this._orbit.pitch || 0.38;
        this._streetStartAngle = this._streetAngle;
        this._streetStartPitch = this._streetPitch;
        initialPinchDist = null;
      }
    };

    // Upgraded Smooth Logarithmic Wheel Zoom: max distance up to 1200m, slow and controllable 1.028x factor
    const onWheel = (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.028 : 0.973;
      this._camDist = Math.max(4, Math.min(1200, (this._camDist || 48) * zoomFactor));
      this._targetCamDist = this._camDist;
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        if (this._isDroneTour) {
          this.stopDroneTour();
          return;
        }
        if (this._navigationMode !== 'orbit') {
          this.setNavigationMode('orbit');
          return;
        }
      }

      // Track key states for Street Mode (Walk / Drive)
      this._keysDown.add(e.key.toLowerCase());

      const activeEl = document.activeElement;
      const activeTag = activeEl?.tagName?.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || activeEl?.isContentEditable || activeEl?.closest(".modal") || activeEl?.closest(".stage-log")) {
        return;
      }

      // Handle hotkeys in orbit mode
      if (this._navigationMode === 'orbit') {
        const moveStep = 2.4;
        const az = this._orbit.base + this._orbit.delta;
        const fwdX = -Math.sin(az);
        const fwdZ = -Math.cos(az);
        const rightX = Math.cos(az);
        const rightZ = -Math.sin(az);

        switch (e.key) {
          case "ArrowUp":
          case "w":
          case "W":
            this._lookAt.x += fwdX * moveStep;
            this._lookAt.z += fwdZ * moveStep;
            this._targetLookAt.copy(this._lookAt);
            e.preventDefault();
            break;
          case "ArrowDown":
          case "s":
          case "S":
            this._lookAt.x -= fwdX * moveStep;
            this._lookAt.z -= fwdZ * moveStep;
            this._targetLookAt.copy(this._lookAt);
            e.preventDefault();
            break;
          case "ArrowLeft":
          case "a":
          case "A":
            this._lookAt.x -= rightX * moveStep;
            this._lookAt.z -= rightZ * moveStep;
            this._targetLookAt.copy(this._lookAt);
            e.preventDefault();
            break;
          case "ArrowRight":
          case "d":
          case "D":
            this._lookAt.x += rightX * moveStep;
            this._lookAt.z += rightZ * moveStep;
            this._targetLookAt.copy(this._lookAt);
            e.preventDefault();
            break;
          case "q":
          case "Q":
            this._orbit.delta -= 0.12;
            e.preventDefault();
            break;
          case "e":
          case "E":
            this._orbit.delta += 0.12;
            e.preventDefault();
            break;
          case "+":
          case "=":
            this._camDist = Math.max(5, (this._camDist || 48) * 0.92);
            this._targetCamDist = this._camDist;
            e.preventDefault();
            break;
          case "-":
          case "_":
            this._camDist = Math.min(320, (this._camDist || 48) * 1.08);
            this._targetCamDist = this._camDist;
            e.preventDefault();
            break;
        }
      }
    };

    const onKeyUp = (e) => {
      this._keysDown.delete(e.key.toLowerCase());
    };

    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    this._unbindOrbit = () => {
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }

  _setCenterFromPointer(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this._mouse.set(x, y);
    this._raycaster.setFromCamera(this._mouse, this.camera);
    const intersects = this._raycaster.intersectObjects(this.neighbourhoodGroup.children, true);
    if (intersects.length > 0) {
      const hitPoint = intersects[0].point;
      this.setCenterPoint(hitPoint.x, hitPoint.y, hitPoint.z);
      this.playSuccessChime();
    }
  }

  setCenterPoint(x, y, z) {
    this._startLookAt.copy(this._lookAt);
    this._targetLookAt.set(x, Math.max(0.5, y), z);
    this._startCamDist = this._camDist || 48;
    this._targetCamDist = this._camDist || 48;
    this._cameraAnimStartTime = performance.now();
  }

  saveDefaultView() {
    const settings = {
      lookAt: { x: this._lookAt.x, y: this._lookAt.y, z: this._lookAt.z },
      dist: this._camDist || 48,
      delta: this._orbit.delta,
      pitch: this._orbit.pitch || 0.38
    };
    this._defaultCameraSettings = settings;
    try {
      localStorage.setItem('caliper_default_camera_view', JSON.stringify(settings));
    } catch (_) {}
    this.playSuccessChime();
    return settings;
  }

  setNavigationMode(mode) {
    if (this._navigationMode === mode) return;
    this._navigationMode = mode; // 'orbit' | 'walk' | 'drive'

    if (mode === 'walk') {
      // Spawn pedestrian at street level
      this._streetPos.set(this._lookAt.x, 1.75, this._lookAt.z);
      this._streetSpeed = 0;
      if (this._vehicleGroup) this._vehicleGroup.visible = false;
    } else if (mode === 'drive') {
      // Spawn sports car on vehicular roadway (z = 11.6)
      this._streetPos.set(Math.max(-40, Math.min(40, this._lookAt.x)), 0.35, 11.6);
      this._streetSpeed = 0;
      this._ensurePlayerVehicle();
      if (this._vehicleGroup) this._vehicleGroup.visible = true;
    } else {
      if (this._vehicleGroup) this._vehicleGroup.visible = false;
    }

    if (this._onNavModeChange) this._onNavModeChange(mode);
    this.playClickSound();
  }

  _ensurePlayerVehicle() {
    if (this._vehicleGroup) return;
    const vg = new THREE.Group();
    const carPaint = stdMat({ color: 0xef4444, roughness: 0.2, metalness: 0.8 }); // Red sports cabriolet
    const chassis = new THREE.Mesh(new RoundedBoxGeometry(3.8, 0.6, 1.8, 2, 0.15), carPaint);
    chassis.position.set(0, 0.45, 0);
    chassis.castShadow = true;
    vg.add(chassis);

    // Windshield & cockpit
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 1.5), stdMat({ color: 0x38bdf8, transparent: true, opacity: 0.6 }));
    glass.position.set(-0.2, 0.85, 0);
    vg.add(glass);

    // Glowing LED Headlights
    const hLightL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), stdMat({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.0 }));
    hLightL.position.set(1.9, 0.45, -0.6);
    vg.add(hLightL);
    const hLightR = hLightL.clone();
    hLightR.position.set(1.9, 0.45, 0.6);
    vg.add(hLightR);

    vg.position.copy(this._streetPos);
    this.neighbourhoodGroup.add(vg);
    this._vehicleGroup = vg;
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
      if (typeof d.delta === "number") {
        this._orbit.delta = d.delta;
      }
      if (typeof d.pitch === "number") {
        this._orbit.pitch = d.pitch;
      }
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
    if (this._navigationMode !== 'orbit') {
      this.setNavigationMode('orbit');
    }
    const def = this._defaultCameraSettings || { lookAt: { x: 0, y: 1.8, z: 12.0 }, dist: 68, delta: 0, pitch: 0.38 };
    this._startLookAt.copy(this._lookAt);
    this._targetLookAt.set(def.lookAt.x, def.lookAt.y, def.lookAt.z);
    this._startCamDist = this._camDist || def.dist;
    this._targetCamDist = def.dist;
    this._cameraAnimStartTime = performance.now();
    this._orbit.delta = def.delta || 0;
    this._orbit.pitch = def.pitch || 0.38;
    this.closeAllBuildingInteriors();
  }

  rotateCamera(deltaAngle) {
    if (this._isDroneTour) this.stopDroneTour();
    this._orbit.delta += deltaAngle;
  }

  pitchCamera(deltaPitch) {
    if (this._isDroneTour) this.stopDroneTour();
    this._orbit.pitch = Math.max(0.06, Math.min(1.52, (this._orbit.pitch || 0.38) + deltaPitch));
  }

  zoomCamera(factor) {
    if (this._isDroneTour) this.stopDroneTour();
    this._camDist = Math.max(4, Math.min(1200, (this._camDist || 48) * factor));
    this._targetCamDist = this._camDist;
  }

  setTimeOfDay(todKey) {
    if (todKey === "day") this._overrideHour = 12;
    else if (todKey === "dusk") this._overrideHour = 19.5;
    else if (todKey === "night") this._overrideHour = 1.5;
    else this._overrideHour = null;
  }

  playClickSound() {
    if (this.audio) this.audio.playClick();
  }

  playSuccessChime() {
    if (this.audio) this.audio.playSuccessChime();
  }

  playErrorBuzz() {
    if (this.audio) this.audio.playErrorBuzz();
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
    if (this.composer) {
      this.composer.setSize(w, h);
    }
  }

  destroy() {
    this._ro.disconnect();
    this._unbindOrbit();

    if (this.canvas) {
      if (this._gridPointerMove) this.canvas.removeEventListener('pointermove', this._gridPointerMove);
      if (this._gridPointerLeave) this.canvas.removeEventListener('pointerleave', this._gridPointerLeave);
      if (this._gridClick) this.canvas.removeEventListener('click', this._gridClick);
      this._gridPointerMove = null;
      this._gridPointerLeave = null;
      this._gridClick = null;
    }

    if (this._gridRafId) {
      cancelAnimationFrame(this._gridRafId);
      this._gridRafId = null;
    }

    if (this._pmremGenerator) {
      this._pmremGenerator.dispose();
      this._pmremGenerator = null;
    }

    // Comprehensive recursive GPU resource disposal
    const disposedGeos = new Set();
    const disposedMats = new Set();
    const disposedTextures = new Set();
    const TEXTURE_KEYS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'alphaMap', 'envMap', 'specularMap', 'bumpMap', 'displacementMap', 'lightMap', 'aoMap'];

    this.scene.traverse((obj) => {
      if (obj.geometry && !disposedGeos.has(obj.geometry)) {
        disposedGeos.add(obj.geometry);
        obj.geometry.dispose();
      }
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (!disposedMats.has(m)) {
            disposedMats.add(m);
            for (const k of TEXTURE_KEYS) {
              if (m[k] && typeof m[k].dispose === 'function' && !disposedTextures.has(m[k])) {
                disposedTextures.add(m[k]);
                m[k].dispose();
              }
            }
            m.dispose();
          }
        }
      }
    });

    if (this._skyMesh) {
      if (this._skyMesh.geometry) this._skyMesh.geometry.dispose();
      if (this._skyMesh.material) this._skyMesh.material.dispose();
      this._skyMesh = null;
      this._skyUniforms = null;
    }

    if (this._hdrEnvMap) {
      this._hdrEnvMap.dispose();
      this._hdrEnvMap = null;
    }

    if (this.scene) {
      this.scene.environment = null;
      this.scene.background = null;
    }

    if (this._contactTex) this._contactTex.dispose();
    if (this._skyGradient && this._skyGradient.tex) this._skyGradient.tex.dispose();
    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
    }

    this.renderer.dispose();
    this._disposed = true;
  }

  pushTick(world) {
    this.prevWorld = this.nextWorld ?? world;
    this.nextWorld = world;
    this._reconcilePlacements(world);
  }

  _reconcilePlacements(world) {
    if (!this._neighbourhoodBuilt || !world || !world.placements) return;

    // 1. Refresh object types from world state
    if (world.objectTypes) {
      this._objectTypes = Object.assign({}, this._objectTypes, world.objectTypes);
    }
    this._placementMeshesById = this._placementMeshesById || new Map();
    const centerX = this._plotCenter ? this._plotCenter.x : 0;
    const centerZ = this._plotCenter ? this._plotCenter.z : 0;

    const currentIds = new Set(world.placements.map((p) => p.id));

    // 2. Remove deleted placements and dispose their GPU resources safely
    for (const [id, record] of Array.from(this._placementMeshesById.entries())) {
      if (!currentIds.has(id)) {
        if (record.mesh && record.mesh.parent) {
          record.mesh.parent.remove(record.mesh);
        }
        record.mesh.traverse((obj) => {
          if (obj.isPointLight) {
            const idx = this._pointLights.indexOf(obj);
            if (idx !== -1) this._pointLights.splice(idx, 1);
          }
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            for (const m of mats) {
              const eIdx = this._emissiveAnimated.indexOf(m);
              if (eIdx !== -1) this._emissiveAnimated.splice(eIdx, 1);
              // CRITICAL: Never dispose the shared contact shadow texture
              const PLACEMENT_TEX_KEYS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'alphaMap'];
              for (const k of PLACEMENT_TEX_KEYS) {
                if (m[k] && m[k] !== this._contactTex && typeof m[k].dispose === 'function') {
                  m[k].dispose();
                }
              }
              m.dispose();
            }
          }
        });
        this._placementMeshesById.delete(id);
      }
    }

    // 3. Add new placements or update existing placements (move / recolor / type change)
    for (const p of world.placements) {
      let typeDef = this._objectTypes[p.type];
      if (!typeDef) {
        typeDef = {
          footprint: { w: 1.4, d: 1.2 },
          shadow: { w: 1.8, d: 1.6 },
          recipe: [
            { shape: "box", size: [1.2, 0.85, 1.0], radius: 0.06, position: [0, 0.42, 0], color: p.colour || PALETTE.accent, roughness: 0.6 }
          ]
        };
      }

      const pColour = p.colour || (p.overrides && p.overrides.color);
      let targetX = 0, targetZ = 0, targetParent = null;

      if (p.location === "outdoors") {
        const pos = plotToWorldXZ(p.plot, centerX, centerZ);
        targetX = pos.x;
        targetZ = pos.z;
        targetParent = this.neighbourhoodGroup;
      } else {
        const home = this._buildingGroupsById[p.location];
        const scale = this._buildingScaleById[p.location];
        if (!home || !scale) continue;
        const local = stationLocalXZ(typeDef.local || IDLE_LOCAL, scale.w * BUILDING_W, scale.d * BUILDING_D);
        targetX = local.x;
        targetZ = local.z;
        targetParent = home;
      }

      if (this._placementMeshesById.has(p.id)) {
        const record = this._placementMeshesById.get(p.id);

        // Defect 3: If type changed under the same ID, cleanly rebuild the instance
        if (record.type !== p.type) {
          if (record.mesh && record.mesh.parent) {
            record.mesh.parent.remove(record.mesh);
          }
          record.mesh.traverse((obj) => {
            if (obj.isPointLight) {
              const idx = this._pointLights.indexOf(obj);
              if (idx !== -1) this._pointLights.splice(idx, 1);
            }
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
              const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
              for (const m of mats) {
                const eIdx = this._emissiveAnimated.indexOf(m);
                if (eIdx !== -1) this._emissiveAnimated.splice(eIdx, 1);
                const PLACEMENT_TEX_KEYS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'alphaMap'];
                for (const k of PLACEMENT_TEX_KEYS) {
                  if (m[k] && m[k] !== this._contactTex && typeof m[k].dispose === 'function') {
                    m[k].dispose();
                  }
                }
                m.dispose();
              }
            }
          });
          const mesh = this._buildPlacementInstance(typeDef, p, targetParent, targetX, targetZ);
          this._placementMeshesById.set(p.id, {
            mesh,
            placement: p,
            location: p.location,
            type: p.type,
            x: targetX,
            z: targetZ,
            colour: pColour
          });
          continue;
        }

        // Handle move / position change
        if (Math.abs(targetX - record.x) > 0.02 || Math.abs(targetZ - record.z) > 0.02 || record.location !== p.location) {
          if (record.mesh.parent !== targetParent) {
            record.mesh.parent.remove(record.mesh);
            targetParent.add(record.mesh);
          }
          record.mesh.position.x = targetX;
          record.mesh.position.z = targetZ;
          record.x = targetX;
          record.z = targetZ;
          record.location = p.location;
        }

        // Defect 3: Handle color override addition, change, OR restoration of default archetype color
        if (pColour !== record.colour) {
          const defaultColor = typeDef.recipe?.[0]?.color ?? PALETTE.accent;
          const targetColorHex = pColour ? parseHexColor(pColour) : parseHexColor(defaultColor);
          record.mesh.traverse((obj) => {
            if (obj.material && obj.material.color && !obj.material.isMeshBasicMaterial && (obj.material.metalness || 0) < 0.5 && !obj.material.emissiveIntensity && obj !== record.mesh.userData?.shadowMesh) {
              obj.material.color.set(targetColorHex);
            }
          });
          record.colour = pColour;
        }
        record.placement = p;
      } else {
        // Add new placement
        const mesh = this._buildPlacementInstance(typeDef, p, targetParent, targetX, targetZ);
        this._placementMeshesById.set(p.id, {
          mesh,
          placement: p,
          location: p.location,
          type: p.type,
          x: targetX,
          z: targetZ,
          colour: pColour
        });
      }
    }
  }

  draw(t) {
    if (this._disposed) return;
    const w = this.nextWorld;
    if (!w) return;
    this._buildNeighbourhoodIfNeeded(w);
    if (!this._neighbourhoodBuilt) return;
    if (this.reducedMotion) t = 1;
    const prev = this.prevWorld || w;

    const currentFrameTime = performance.now();
    const deltaSec = Math.min(0.1, Math.max(0.001, (currentFrameTime - (this._lastFrameTime || currentFrameTime)) / 1000));
    this._lastFrameTime = currentFrameTime;

    // Windmill sails animation
    if (this._windmillSails && !this.reducedMotion) {
      this._windmillSails.rotation.z += 0.75 * deltaSec;
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
    if (this._skyUniforms) {
      this._skyUniforms['sunPosition'].value.set(sx, sy, sz).normalize();
      this._skyUniforms['turbidity'].value = lerp(1.15, 3.2, nightAmt);
      this._skyUniforms['rayleigh'].value = lerp(2.4, 0.7, nightAmt);
      this._skyUniforms['mieCoefficient'].value = 0.0003;
      this._skyUniforms['mieDirectionalG'].value = 0.85;
    }

    const daySunIntensity = lerp(0.42, 0.88, Math.min(1, sun.elevation));
    this.sun.intensity = lerp(0.06, daySunIntensity, sun.dayAmt);
    const sunColor = sun.warmth >= 1 ? SUN_COLOR_DAY : SUN_COLOR_WARM.clone().lerp(SUN_COLOR_DAY, sun.warmth);
    this.sun.color.copy(SUN_COLOR_NIGHT).lerp(sunColor, sun.dayAmt);

    const dayHemi = lerp(0.18, 0.32, Math.min(1, sun.elevation));
    this.hemi.intensity = lerp(0.06, dayHemi, sun.dayAmt);

    for (const light of this._pointLights) {
      const base = light.userData.baseIntensity || 0.4;
      const nightMult = light.userData.isStreetLamp ? 2.6 : 1.4;
      light.intensity = lerp(base * 0.2, base * nightMult, nightAmt);
    }
    for (const mat of this._emissiveAnimated) {
      mat.emissiveIntensity = lerp(0.4, 4.5, nightAmt);
    }

    // Crisp Australian coastal contrast without daytime haze blowout
    this.renderer.toneMappingExposure = lerp(0.78, 0.68, nightAmt);
    this.scene.environmentIntensity = lerp(0.35, 0.10, nightAmt);

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
        p.life += deltaSec;
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

    // 4D Animated Pedestrian NPCs (Boardwalk strollers, esplanade walkers, cafe guests)
    if (this._pedestrians && !this.reducedMotion) {
      const now = performance.now() / 1000;
      for (const p of this._pedestrians) {
        const { cfg, group } = p;
        if (cfg.type === 'walker') {
          cfg.x += cfg.dirX * cfg.speed * deltaSec;
          if (cfg.x > cfg.maxX) { cfg.x = cfg.maxX; cfg.dirX = -1; group.rotation.y = -Math.PI / 2; }
          else if (cfg.x < cfg.minX) { cfg.x = cfg.minX; cfg.dirX = 1; group.rotation.y = Math.PI / 2; }
          group.position.x = cfg.x;
          const phase = now * cfg.speed * 4;
          group.position.y = Math.abs(Math.sin(phase)) * 0.05;
          if (group.userData.leftLeg && group.userData.rightLeg) {
            group.userData.leftLeg.rotation.x = Math.sin(phase) * 0.35;
            group.userData.rightLeg.rotation.x = -Math.sin(phase) * 0.35;
          }
        } else if (cfg.type === 'walker_ns') {
          cfg.z += cfg.dirZ * cfg.speed * deltaSec;
          if (cfg.z > cfg.maxZ) { cfg.z = cfg.maxZ; cfg.dirZ = -1; group.rotation.y = Math.PI; }
          else if (cfg.z < cfg.minZ) { cfg.z = cfg.minZ; cfg.dirZ = 1; group.rotation.y = 0; }
          group.position.z = cfg.z;
          const phase = now * cfg.speed * 4;
          group.position.y = Math.abs(Math.sin(phase)) * 0.05;
          if (group.userData.leftLeg && group.userData.rightLeg) {
            group.userData.leftLeg.rotation.x = Math.sin(phase) * 0.35;
            group.userData.rightLeg.rotation.x = -Math.sin(phase) * 0.35;
          }
        } else if (cfg.type === 'seated') {
          group.position.y = Math.sin(now * 1.5 + cfg.x) * 0.015;
        } else if (cfg.type === 'idle') {
          group.rotation.y = Math.sin(now * 0.6 + cfg.x) * 0.25;
        }
      }
    }

    // 4D Dynamic Water & Marine Vessel Wave Bobbing
    if (!this.reducedMotion) {
      const nowSec = performance.now() / 1000;
      // Gentle harbour tide & surface shimmer
      if (this._innerHarbourMesh) {
        this._innerHarbourMesh.position.y = -0.42 + Math.sin(nowSec * 1.2) * 0.025;
      }
      if (this._outerOceanMesh) {
        this._outerOceanMesh.position.y = -0.48 + Math.sin(nowSec * 0.95 + 1.2) * 0.04;
      }
      // Dynamic surface normal drift simulating wind-driven ocean currents
      if (this._waterNormalTex) {
        this._waterNormalTex.offset.x = (nowSec * 0.015) % 1;
        this._waterNormalTex.offset.y = (nowSec * 0.022) % 1;
      }
      if (this._outerWaterNormalTex) {
        this._outerWaterNormalTex.offset.x = (nowSec * 0.028) % 1;
        this._outerWaterNormalTex.offset.y = (nowSec * 0.038) % 1;
      }
      // Realistic hydrodynamic pitch and roll for moored & sailing vessels
      if (this._harbourVessels && this._harbourVessels.length > 0) {
        this._harbourVessels.forEach(v => {
          v.group.position.y = v.basePosY + Math.sin(nowSec * 1.4 + v.phase) * 0.035;
          v.group.rotation.z = Math.sin(nowSec * 1.1 + v.pitchPhase) * 0.025;
          v.group.rotation.x = Math.cos(nowSec * 0.9 + v.pitchPhase) * 0.018;
        });
      }
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

    // Camera positioning: Drone Tour vs Orbit vs Street Level (Walk & Drive)
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
    } else if (this._navigationMode === 'walk' || this._navigationMode === 'drive') {
      // -------------------------------------------------------------
      // STREET-LEVEL FIRST/THIRD-PERSON PHYSICS & STEERING
      // -------------------------------------------------------------
      const isDrive = this._navigationMode === 'drive';
      const maxSpeed = isDrive ? 22.0 : 5.5;
      const accel = isDrive ? 18.0 : 22.0;
      const friction = isDrive ? 8.0 : 16.0;
      const turnRate = isDrive ? 2.4 : 2.8;
      const dt = deltaSec; // frame-rate independent delta seconds

      let forwardInput = 0;
      let steerInput = 0;
      if (this._keysDown.has('w') || this._keysDown.has('arrowup')) forwardInput += 1;
      if (this._keysDown.has('s') || this._keysDown.has('arrowdown')) forwardInput -= 1;
      if (this._keysDown.has('a') || this._keysDown.has('arrowleft')) steerInput += 1;
      if (this._keysDown.has('d') || this._keysDown.has('arrowright')) steerInput -= 1;

      // Sprint in walk mode with shift
      const speedMultiplier = (!isDrive && this._keysDown.has('shift')) ? 1.8 : 1.0;

      // Steering
      if (steerInput !== 0) {
        this._streetAngle += steerInput * turnRate * dt * (isDrive ? (Math.abs(this._streetSpeed) / maxSpeed + 0.25) : 1.0);
      }

      // Acceleration / Braking
      if (forwardInput !== 0) {
        this._streetSpeed += forwardInput * accel * speedMultiplier * dt;
        this._streetSpeed = Math.max(-maxSpeed * 0.4, Math.min(maxSpeed * speedMultiplier, this._streetSpeed));
      } else {
        if (this._streetSpeed > 0) this._streetSpeed = Math.max(0, this._streetSpeed - friction * dt);
        else if (this._streetSpeed < 0) this._streetSpeed = Math.min(0, this._streetSpeed + friction * dt);
      }

      // Position update
      const moveFwdX = Math.sin(this._streetAngle);
      const moveFwdZ = Math.cos(this._streetAngle);
      this._streetPos.x += moveFwdX * this._streetSpeed * dt;
      this._streetPos.z += moveFwdZ * this._streetSpeed * dt;

      // Restrict street bounds so player doesn't wander off the urban terrain
      this._streetPos.x = Math.max(-75, Math.min(75, this._streetPos.x));
      this._streetPos.z = Math.max(-65, Math.min(22.0, this._streetPos.z)); // Seawall guard at z = 22.0!

      if (isDrive) {
        // Third-person vehicle chase camera
        if (this._vehicleGroup) {
          this._vehicleGroup.position.set(this._streetPos.x, 0.25, this._streetPos.z);
          this._vehicleGroup.rotation.y = this._streetAngle - Math.PI / 2;
        }
        const camOffsetDist = 6.5;
        const camHeight = 2.4;
        this.camera.position.set(
          this._streetPos.x - moveFwdX * camOffsetDist,
          camHeight,
          this._streetPos.z - moveFwdZ * camOffsetDist
        );
        const lookTarget = new THREE.Vector3(
          this._streetPos.x + moveFwdX * 8.0,
          1.5 + this._streetPitch * 4.0,
          this._streetPos.z + moveFwdZ * 8.0
        );
        this.camera.lookAt(lookTarget);
      } else {
        // First-person walking camera at human eye height (1.75m)
        this.camera.position.set(this._streetPos.x, 1.75, this._streetPos.z);
        const lookTarget = new THREE.Vector3(
          this._streetPos.x + moveFwdX * 6.0,
          1.75 + this._streetPitch * 4.0,
          this._streetPos.z + moveFwdZ * 6.0
        );
        this.camera.lookAt(lookTarget);
      }
    } else {
      // Standard Orbit Camera
      const az = this._orbit.base + this._orbit.delta;
      const pitch = this._orbit.pitch || 0.38;
      const fit = this._cameraFit || 1;
      const currentDist = (this._camDist || 48) * fit;
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

    if (this.composer) {
      try {
        this.composer.render();
      } catch (err) {
        console.warn("EffectComposer runtime error, falling back to standard renderer:", err);
        try { this.composer.dispose(); } catch (_) {}
        this.composer = null;
        this.renderer.render(this.scene, this.camera);
      }
    } else {
      this.renderer.render(this.scene, this.camera);
    }
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

  saveDefaultView() {
    if (this._impl.saveDefaultView) return this._impl.saveDefaultView();
  }

  setCenterPoint(x, y, z) {
    if (this._impl.setCenterPoint) this._impl.setCenterPoint(x, y, z);
  }

  setNavigationMode(mode) {
    if (this._impl.setNavigationMode) this._impl.setNavigationMode(mode);
  }

  enablePickCenter(onDone) {
    if (this._impl) {
      this._impl._pickCenterActive = true;
      this._impl._onPickCenterDone = onDone;
    }
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
  toggleGrid(force) {
    return this._impl.toggleGrid ? this._impl.toggleGrid(force) : false;
  }
  toggleSound(enable) {
    return this._impl.audio ? this._impl.audio.toggleSound(enable) : false;
  }
  playClickSound() {
    if (this._impl.audio) this._impl.audio.playClick();
  }
  playSuccessChime() {
    if (this._impl.playSuccessChime) this._impl.playSuccessChime();
    else if (this._impl.audio) this._impl.audio.playSuccessChime();
  }
  playErrorBuzz() {
    if (this._impl.playErrorBuzz) this._impl.playErrorBuzz();
    else if (this._impl.audio) this._impl.audio.playErrorBuzz();
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
