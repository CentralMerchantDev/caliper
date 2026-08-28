// CALIPER world renderer, v2 (UPGRADE.md): a stylised 3D scene instead of the
// architectural plan view. Same design language (warm paper, ink, the
// accent) and the same public contract as the 2D renderer it replaces --
// constructor(canvas, {reducedMotion}), pushTick(world), draw(t), destroy(),
// plus the .nextWorld/.reducedMotion instance fields the visual-check
// harness (world-render.test.html) pokes directly -- so callers (index.html,
// world.html) needed zero changes beyond the import path.
//
// Vendored, not CDN-loaded: this is a real deployed demo, not a sandboxed
// snippet, and a live show-and-tell shouldn't depend on a third-party CDN
// being up. three.js core + the handful of addons used here live under
// ./vendor/three/, resolved through the import map in index.html/world.html.
//
// Sim logic is untouched -- this file only ever reads world JSON
// (tick/money/sims[].needs/lastAction), the same shape src/simBaseline.ts's
// tick() returns. STATIONS (positions + which action maps to which
// furniture) is imported from the 2D renderer so the two files can never
// silently disagree about the room layout, and the 2D renderer itself
// becomes this file's WebGL-unavailable fallback -- "a good static image
// of the scene" is, concretely, the fully-working 2D plan view, not a
// bespoke screenshot.
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

const ROOM_W = 11; // x extent, world units
const ROOM_D = 7.5; // z extent

const PALETTE = {
  floor: 0xdccdaf,
  wall: 0xd9c9a6,
  wood: 0x8a5a34,
  woodDark: 0x6a4526,
  metal: 0xcfd2d6,
  fabricBed: 0xd8c9a8,
  fabricRug: 0xb0560c,
  ceramic: 0xf3efe6,
  accent: 0xb0560c, // sim 1
  sim2: 0x3d6b63, // sim 2
};

function stationFor(action) {
  for (const key in STATIONS) if (STATIONS[key].action === action) return STATIONS[key];
  return STATIONS.center;
}

// World-relative 0..1 layout -> 3D room coordinates (x, z), y is up.
function toWorldXZ(s) {
  return { x: (s.x - 0.5) * ROOM_W, z: (s.y - 0.5) * ROOM_D };
}

// A sim's stand position is offset from its station's centre, toward the
// room's middle -- standing exactly AT a station's centre (fine in the old
// top-down 2D view) puts a character behind tall furniture like the fridge
// or shower stall in this 3D one, hiding it from the camera entirely.
const STAND_OFFSET = {
  sleep: { x: 0.07, y: 0.1 },
  eat: { x: -0.09, y: 0.09 },
  shower: { x: -0.09, y: -0.09 },
  work: { x: 0.05, y: -0.09 },
  play: { x: 0, y: 0 },
  call: { x: 0.07, y: 0 },
  idle: { x: 0, y: 0 },
};
function standWorldXZ(s) {
  const off = STAND_OFFSET[s.action] || STAND_OFFSET.idle;
  return { x: (s.x + off.x - 0.5) * ROOM_W, z: (s.y + off.y - 0.5) * ROOM_D };
}

// Sun elevation/azimuth/colour across the 24h clock -- same shape as the 2D
// renderer's sunFor(), re-derived here for 3D (elevation as radians above
// the horizon rather than a 0..1 altitude used for a 2D shadow length).
function sunFor(hour) {
  const isDay = hour >= 6 && hour < 20;
  const dayFrac = Math.min(1, Math.max(0, ((hour - 6 + 24) % 24) / 14));
  const elevation = isDay ? Math.sin(dayFrac * Math.PI) * 1.05 + 0.05 : 0.03;
  const azimuth = (((hour - 6 + 24) % 24) / 24) * Math.PI * 2;
  // 0 = warm ember (dawn/dusk), 1 = neutral daylight.
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
// contribution (otherwise very strong -- RoomEnvironment is built to look
// right at envMapIntensity 1, which reads blown-out layered on top of the
// direct sun/hemi/room lights below) stays tame by default everywhere.
function stdMat(opts) {
  return new THREE.MeshStandardMaterial({ envMapIntensity: 0.15, ...opts });
}

/** A soft radial-gradient disc, reused (scaled per-instance) as a cheap
 * stand-in for ambient occlusion at every object-floor contact point --
 * "cheap, enormous payoff" per UPGRADE.md, without a full SSAO pass. */
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
    this._disposed = false;

    this._initScene();
    this._buildRoom();
    this._orbit = { base: 0.62, delta: 0, dragging: false, startX: 0, startDelta: 0 };
    this._bindOrbitControls();

    this._resize();
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(canvas);
  }

  _initScene() {
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: "high-performance" });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.6;
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

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    this.camera = camera;
    this._lookAt = new THREE.Vector3(0, 1.1, 0);

    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -ROOM_W * 0.65;
    sun.shadow.camera.right = ROOM_W * 0.65;
    sun.shadow.camera.top = ROOM_D * 0.65;
    sun.shadow.camera.bottom = -ROOM_D * 0.65;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 30;
    sun.shadow.bias = -0.0018;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);
    scene.add(sun.target);
    this.sun = sun;

    const hemi = new THREE.HemisphereLight(0xf6ecd8, 0x3a3226, 0.3);
    scene.add(hemi);
    this.hemi = hemi;

    // A small, always-on warm interior glow so night reads as a cosy room,
    // not a blackout -- the palette rule carried over from the 2D renderer.
    const roomGlow = new THREE.PointLight(0xffb066, 0.25, 9, 2);
    roomGlow.position.set(0, 2.0, 0);
    scene.add(roomGlow);
    this.roomGlow = roomGlow;

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

  _buildRoom() {
    const g = new THREE.Group();
    this.scene.add(g);
    this.roomGroup = g;

    const floor = new THREE.Mesh(
      new RoundedBoxGeometry(ROOM_W, 0.3, ROOM_D, 3, 0.12),
      stdMat({ color: PALETTE.floor, roughness: 0.86, metalness: 0.02 }),
    );
    floor.position.y = -0.15;
    floor.receiveShadow = true;
    g.add(floor);

    const wallMat = stdMat({ color: PALETTE.wall, roughness: 0.92, metalness: 0.0 });
    const backWall = new THREE.Mesh(new RoundedBoxGeometry(ROOM_W, 2.3, 0.14, 2, 0.05), wallMat);
    backWall.position.set(0, 1.0, -ROOM_D / 2);
    backWall.receiveShadow = true;
    g.add(backWall);
    const leftWall = new THREE.Mesh(new RoundedBoxGeometry(0.14, 2.3, ROOM_D, 2, 0.05), wallMat);
    leftWall.position.set(-ROOM_W / 2, 1.0, 0);
    leftWall.receiveShadow = true;
    g.add(leftWall);

    for (const key in STATIONS) {
      const s = STATIONS[key];
      if (s.label === null) continue;
      this._buildStation(s);
    }
  }

  _buildStation(s) {
    const { x, z } = toWorldXZ(s);
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    this.roomGroup.add(group);

    const shadowSize = { sleep: 2.4, eat: 1.1, shower: 1.6, work: 2.0, play: 2.4, call: 1.4 }[s.action] || 1.2;
    this._contactShadow(shadowSize, shadowSize * 0.75, group);

    const set = (mesh, cast = true) => {
      mesh.castShadow = cast;
      mesh.receiveShadow = true;
      group.add(mesh);
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
    if (this.reducedMotion) t = 1;
    const prev = this.prevWorld || w;
    const hour = w.tick % 24;
    const sun = sunFor(hour);

    // -- lighting for this hour --
    const dist = 14;
    const sx = Math.cos(sun.azimuth) * Math.cos(sun.elevation) * dist;
    const sy = Math.max(0.6, Math.sin(sun.elevation) * dist);
    const sz = Math.sin(sun.azimuth) * Math.cos(sun.elevation) * dist;
    this.sun.position.set(sx, sy, sz);
    this.sun.target.position.set(0, 0.5, 0);
    const nightAmt = sun.isDay ? 0 : 1;
    this.sun.intensity = sun.isDay ? lerp(0.4, 0.85, Math.min(1, sun.elevation)) : 0.05;
    const sunColor = sun.warmth >= 1 ? SUN_COLOR_DAY : SUN_COLOR_WARM.clone().lerp(SUN_COLOR_DAY, sun.warmth);
    this.sun.color.copy(sun.isDay ? sunColor : SUN_COLOR_NIGHT);
    this.hemi.intensity = lerp(0.1, 0.22, sun.isDay ? Math.min(1, sun.elevation) : 0);
    this.roomGlow.intensity = lerp(0.1, 0.3, nightAmt);

    const sky = sun.isDay ? SKY_DUSK.clone().lerp(SKY_DAY, sun.warmth) : SKY_NIGHT;
    this.scene.background = sky.clone();

    // -- composed camera: fixed 3/4 shot, small user-driven orbit only --
    const az = this._orbit.base + this._orbit.delta;
    const camDist = 9.6, camH = 6.6;
    this.camera.position.set(Math.sin(az) * camDist, camH, Math.cos(az) * camDist);
    this.camera.lookAt(this._lookAt);

    // -- sims: interpolate between stations, small walk bob mid-transition --
    const sims = w.sims || [];
    sims.forEach((sim, i) => {
      const prevSim = (prev.sims || [])[i] || sim;
      const from = standWorldXZ(this._stationForSim(prevSim));
      const to = standWorldXZ(this._stationForSim(sim));
      let mesh = this._simMeshes[i];
      if (!mesh) mesh = this._simMeshes[i] = this._buildSim(i);
      mesh.position.x = lerp(from.x, to.x, t);
      mesh.position.z = lerp(from.z, to.z, t);
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
    const color = index === 0 ? PALETTE.accent : PALETTE.sim2;
    const group = new THREE.Group();
    const mat = stdMat({ color, roughness: 0.55, metalness: 0.05 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.28, 4, 10), mat);
    body.position.y = 0.32;
    body.castShadow = true;
    group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 12), mat);
    head.position.y = 0.64;
    head.castShadow = true;
    group.add(head);
    this._contactShadow(0.8, 0.8, group, 0.008);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.32, 0.4, 32),
      new THREE.MeshBasicMaterial({ color: PALETTE.accent, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    ring.visible = false;
    group.add(ring);
    group.userData.ring = ring;
    this.roomGroup.add(group);
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
