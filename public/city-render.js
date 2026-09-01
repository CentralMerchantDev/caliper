// =============================================================================
// CALIPER — WORLD RENDERER
//
// Draws the plan. Owns no world data of its own: every coordinate comes from
// city-plan.js, every ground height from terrain.js, every building silhouette
// from buildings.js. That separation is the point -- the AI pipeline edits the
// PLAN, and whatever it says appears here without the renderer needing to know
// what changed.
//
// Performance budget: about thirty draw calls for a 40 km world with ~20,000
// buildings, ~64,000 building parts, 185,000 terrain vertices and 800 km of
// road. Everything repeated is instanced or merged; nothing is a loose Mesh.
// =============================================================================

import { Sky } from "./vendor/three/addons/objects/Sky.js";
import { RoundedBoxGeometry } from "./vendor/three/addons/geometries/RoundedBoxGeometry.js";
import {
  WORLD, ROADS, HIGHWAYS, BRIDGES, MARINA, PIER, BOARDWALK, SETTLEMENTS, PLOT_CLASSES,
  generateWorld, generateCityPlan, landmassPolygons, offsetPolygon,
} from "./city-plan.js";
import { LandField, makeHeightAt, groundColor, fbm, cliffiness, SNOW_LINE, TREE_LINE, WATERWAYS, waterwaySurface } from "./terrain.js";
import { createCollector, emitBuilding, HEIGHT, WALLS, ROOFS, rnd, pick } from "./buildings.js";

// -----------------------------------------------------------------------------
// Tunables. Collected here because these are the numbers that get argued about.
// -----------------------------------------------------------------------------
export const LOOK = {
  // Three-quarter light. At azimuth 152 the sun sat BEYOND the city and blew the
  // horizon out; at 232 it sat behind the camera and every face was flat. From
  // the east-north-east the near faces split into lit and shaded, and shadows
  // fall across the streets where you can see them.
  // The default views sit SOUTH-EAST of the city looking north-west, so the
  // south and east faces are the ones you see. The sun has to share that
  // quadrant or every visible face is in shade. Azimuth 152 and 108 both put it
  // beyond the city (blown horizon, blue city); 232 put it behind the camera
  // (flat, no shadows). 62 degrees is about 40 off the view axis: lit east
  // faces, shaded south faces, shadows falling where you can see them.
  sunElevation: 66,          // high enough that the sun disc stays out of frame
  sunAzimuth: 68,
  exposure: 0.78,
  // Aerial perspective, not soup. At 0.0000265 this was ~40% extinction at
  // 20 km and over 60% at the 38 km the wide views actually use -- the whole
  // world washed to pale blue and the layout became impossible to read from
  // altitude, which is exactly the distance you look at a city plan from.
  // 0.0000092 gives ~17% at 20 km and ~30% at 38 km: distance still reads,
  // the land still has colour.
  fogDensity: 0.0000092,
  fogColor: 0x8fb4cf,
  // The fine grid has to cover the whole COAST, not just the city: the headlands
  // sat on the 200 m grid, where a cliff is narrower than one cell, so they came
  // out as flat plateaux. 50 m over 40 x 14 km costs about the same as 40 m over
  // the old box and resolves every peninsula.
  coreX: 20000, coreZ0: -9000, coreZ1: 5000,
  coreStep: 50,
  outerStep: 250,
  seaLevel: 0,
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// =============================================================================
// GEOMETRY PRIMITIVES
//
// Silhouettes a box cannot make. Each is a unit shape centred on its own base so
// archetypes can position by centre and scale freely.
// =============================================================================

/** Gable roof: base 1x1, ridge along z at the top. Origin at the eaves plane. */
function prismGeometry(THREE) {
  const g = new THREE.BufferGeometry();
  const v = [
    -0.5, 0, -0.5,  0.5, 0, -0.5,  0.5, 0, 0.5,  -0.5, 0, 0.5,   // 0..3 eaves
     0.0, 1, -0.5,  0.0, 1, 0.5,                                 // 4,5 ridge
  ];
  const idx = [
    0, 4, 5, 0, 5, 3,     // west slope
    1, 2, 5, 1, 5, 4,     // east slope
    0, 1, 4,              // north gable
    3, 5, 2,              // south gable
    0, 3, 2, 0, 2, 1,     // soffit
  ];
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  g.setIndex(idx);
  // FLAT shading, via de-indexing. Indexed vertices are shared between the two
  // slopes AND the down-facing soffit, so computeVertexNormals averaged them
  // into normals pointing sideways and down -- every pitched roof in the world
  // shaded as though it faced away from the sun, and the port's sawtooth sheds
  // rendered solid black. A roof is a set of flat planes; it must not be smooth.
  const flat = g.toNonIndexed(); flat.computeVertexNormals();
  return flat;
}

/** Hipped roof: all four sides slope to a short ridge. */
function hipGeometry(THREE) {
  const g = new THREE.BufferGeometry();
  const v = [
    -0.5, 0, -0.5,  0.5, 0, -0.5,  0.5, 0, 0.5,  -0.5, 0, 0.5,
     0.0, 1, -0.22,  0.0, 1, 0.22,
  ];
  const idx = [
    0, 4, 5, 0, 5, 3,
    1, 2, 5, 1, 5, 4,
    0, 1, 4,
    3, 5, 2,
    0, 3, 2, 0, 2, 1,
  ];
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  g.setIndex(idx);
  const flat = g.toNonIndexed(); flat.computeVertexNormals();   // see prismGeometry
  return flat;
}

/** Half-cylinder lying along z: aircraft hangars, market halls. */
function barrelGeometry(THREE) {
  const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 10, 1, false, 0, Math.PI);
  g.rotateZ(-Math.PI / 2); g.rotateY(Math.PI / 2);
  g.translate(0, 0, 0);
  return g;
}

function domeGeometry(THREE) {
  const g = new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  return g;
}

// =============================================================================
// TEXTURES — all procedural, so the world has no binary dependencies
// =============================================================================

/**
 * Horizontal storey banding. Without it a box has no scale at ANY size: this
 * one texture is most of the difference between massing and architecture.
 * `bands` is chosen per height tier so a storey stays about 3.5 m whether the
 * building is 30 m or 260 m.
 */
function windowTexture(THREE, renderer, bands) {
  const w = 128, h = 1024, c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d");
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, w, h);
  const step = h / bands;
  for (let i = 0; i < bands; i++) {
    const y = i * step;
    x.fillStyle = "rgba(38,56,76,0.62)";
    x.fillRect(0, y + step * 0.22, w, step * 0.5);
    x.fillStyle = "rgba(255,255,255,0.30)";
    x.fillRect(0, y + step * 0.72, w, step * 0.10);
  }
  for (let i = 0; i < 10; i++) {                 // mullions
    x.fillStyle = "rgba(255,255,255,0.42)";
    x.fillRect(Math.round(i * w / 10), 0, 2, h);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  // Capped, not maxed. 16x anisotropy is sixteen texel fetches per fragment and
  // every tower face is a grazing angle, so the cost lands exactly where the
  // pixels are. 4x is visually indistinguishable here and roughly 4x cheaper.
  t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return t;
}

function waterNormalTexture(THREE) {
  const N = 512, c = document.createElement("canvas");
  c.width = c.height = N;
  const g = c.getContext("2d"), d = g.createImageData(N, N);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const v = Math.sin(i * 0.085) * Math.cos(j * 0.062) + Math.sin((i + j) * 0.041) * 0.75 + Math.sin(i * 0.021 - j * 0.017) * 0.5;
    const k = (i * N + j) * 4;
    d.data[k] = 128 + v * 26; d.data[k + 1] = 128 + Math.cos(i * 0.055 + j * 0.03) * 22;
    d.data[k + 2] = 255; d.data[k + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(120, 120);
  return t;
}

/** White at one edge, transparent at the other: the surf ramp across a ribbon. */
function foamTexture(THREE) {
  const c = document.createElement("canvas"); c.width = 4; c.height = 64;
  const g = c.getContext("2d");
  const grd = g.createLinearGradient(0, 0, 0, 64);
  grd.addColorStop(0.00, "rgba(255,255,255,0)");
  grd.addColorStop(0.30, "rgba(255,255,255,0.55)");
  grd.addColorStop(0.62, "rgba(255,255,255,0.92)");
  grd.addColorStop(0.86, "rgba(255,255,255,0.35)");
  grd.addColorStop(1.00, "rgba(255,255,255,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 4, 64);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// =============================================================================
// BUILD
// =============================================================================
export function buildWorld(THREE, renderer, scene) {
  const t0 = performance.now();
  const stats = {};
  // ?skip=trees,props — a bisect handle. Worth keeping: when a scene this size
  // misbehaves, being able to remove one subsystem at a time is the difference
  // between a diagnosis and a guess.
  const SKIP = new Set(
    (typeof location !== "undefined" ? new URLSearchParams(location.search).get("skip") || "" : "").split(",")
  );

  const field = new LandField(16);
  const heightAt = makeHeightAt(field);
  const plan = generateCityPlan();
  const world = generateWorld(heightAt);
  const masses = landmassPolygons(16);

  // --- settlement lookup, used for urban ground tint and centrality ---
  const SETT = [
    { id: "downtown", b: { xMin: -1470, xMax: 1400, zMin: -720, zMax: 575 }, cx: 0, cz: 40, r: 1500 },
    ...SETTLEMENTS.map((s) => ({
      id: s.id, b: s.bounds,
      cx: (s.bounds.xMin + s.bounds.xMax) / 2, cz: (s.bounds.zMin + s.bounds.zMax) / 2,
      r: Math.max(s.bounds.xMax - s.bounds.xMin, s.bounds.zMax - s.bounds.zMin) / 2,
    })),
  ];
  const settAt = (x, z) => {
    for (const s of SETT) if (x >= s.b.xMin && x <= s.b.xMax && z >= s.b.zMin && z <= s.b.zMax) return s;
    return null;
  };

  // ---------------------------------------------------------------------------
  // SKY, SUN, ATMOSPHERE
  //
  // Aerial perspective is the single biggest difference between a render that
  // looks like a model and one that looks like a landscape: distance has to cost
  // contrast and saturation. Exponential-squared fog matched to the horizon does
  // it, tuned so a 3 km city is untouched and a 15 km mountain is half sky.
  // ---------------------------------------------------------------------------
  const sky = new Sky();
  sky.scale.setScalar(WORLD.HORIZON * 6);
  const su = sky.material.uniforms;
  su.turbidity.value = 1.45;
  su.rayleigh.value = 0.88;
  su.mieCoefficient.value = 0.0022;   // the sun disc glow: at 0.0042 it blew a hole in every view it appeared in
  su.mieDirectionalG.value = 0.82;
  const phi = THREE.MathUtils.degToRad(90 - LOOK.sunElevation);
  const theta = THREE.MathUtils.degToRad(LOOK.sunAzimuth);
  const sunPos = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
  su.sunPosition.value.copy(sunPos);
  scene.add(sky);

  scene.fog = new THREE.FogExp2(LOOK.fogColor, LOOK.fogDensity);

  // Environment map from the sky itself, so glass and water reflect the actual
  // sky rather than a grey studio.
  // ---------------------------------------------------------------------------
  // ENVIRONMENT
  //
  // A small equirectangular sky painted to a canvas, convolved by PMREM. It
  // replaces a PMREM capture OF THE SKY OBJECT, which silently baked a BLACK
  // environment map: PMREMGenerator renders with a near/far of 0.1..100 and the
  // sky sphere is scaled past the far plane, so the capture saw nothing. three.js
  // then multiplied that black map into every material -- including
  // MeshBasicMaterial, which does use scene.environment -- and the entire world
  // rendered as an unlit silhouette while every light, colour and normal in the
  // scene was correct. It cost hours, so there is now a guard below.
  // ---------------------------------------------------------------------------
  function skyEquirect() {
    const w = 256, h = 128, c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0.00, "#2f79b8");     // zenith
    grd.addColorStop(0.34, "#79b2dc");
    grd.addColorStop(0.49, "#cfe2ee");     // horizon haze
    grd.addColorStop(0.51, "#a89f8a");     // just below the horizon: land haze
    grd.addColorStop(1.00, "#6d6a54");     // ground bounce
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    // a soft sun disc, so glass and water have something to catch
    const sx = ((LOOK.sunAzimuth / 360) % 1) * w;
    const sy = (0.5 - LOOK.sunElevation / 180) * h;
    const sg = g.createRadialGradient(sx, sy, 0, sx, sy, w * 0.10);
    sg.addColorStop(0, "rgba(255,248,225,1)");
    sg.addColorStop(1, "rgba(255,248,225,0)");
    g.fillStyle = sg; g.fillRect(sx - w * 0.1, sy - w * 0.1, w * 0.2, w * 0.2);
    const t = new THREE.CanvasTexture(c);
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  if (!SKIP.has("env")) {
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      const src = skyEquirect();
      const rt = pmrem.fromEquirectangular(src);
      // GUARD: an environment map is a multiplier. If it is black, everything is
      // black, and nothing else in the scene looks wrong while you hunt for it.
      // Verify it carries light before trusting it.
      let ok = true;
      try {
        const buf = new Float32Array(4);
        renderer.readRenderTargetPixels(rt, 4, 4, 1, 1, buf);
        const lum = buf[0] + buf[1] + buf[2];
        ok = Number.isFinite(lum) && lum > 0.02;
        stats.envLuminance = Number.isFinite(lum) ? +lum.toFixed(4) : "NaN";
      } catch (e) {
        stats.envReadback = "unsupported";      // cannot verify: do not risk it
        ok = false;
      }
      if (ok) { scene.environment = rt.texture; scene.environmentIntensity = 0.6; }
      src.dispose(); pmrem.dispose();
    } catch (e) {
      stats.envError = String(e && e.message).slice(0, 80);
    }
  }

  const sun = new THREE.DirectionalLight(0xfff0d0, 3.5);
  sun.position.copy(sunPos).multiplyScalar(6000);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 1.6;
  const SH = 2600;
  Object.assign(sun.shadow.camera, { left: -SH, right: SH, top: SH, bottom: -SH, near: 100, far: 16000 });
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun, sun.target);

  // A cool fill from the opposite side. One sun crushes every shaded face to
  // near-black, which is what makes a render look heavy and lifeless.
  const fill = new THREE.DirectionalLight(0x8fb8e4, 0.42);
  fill.position.set(-sunPos.x * 4000, 2200, -sunPos.z * 4000);
  scene.add(fill);
  // Ambient was carrying too much of the image. A sun of 3.1 against 1.34 of
  // ambient fill leaves almost no difference between a lit face and a shaded
  // one, which is what made the city look flat and chalky no matter what the
  // palette did.
  scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x6a6752, 0.48));

  // ---------------------------------------------------------------------------
  // TERRAIN
  //
  // Two resolutions: 40 m over the modelled core and 200 m for the rest of the
  // 40 km, with a hole in the coarse grid so they do not overlap. The core grid
  // carries a downward skirt at its border, which hides the hairline crack a
  // resolution change always leaves.
  // ---------------------------------------------------------------------------
  function terrainMesh(x0, x1, z0, z1, step, hole, skirtDepth, casts = true) {
    const nx = Math.round((x1 - x0) / step), nz = Math.round((z1 - z0) / step);
    const W = nx + 1, H = nz + 1;
    const hs = new Float32Array(W * H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) hs[j * W + i] = heightAt(x0 + i * step, z0 + j * step);

    const pos = new Float32Array(W * H * 3);
    const col = new Float32Array(W * H * 3);
    const c = new THREE.Color();
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const k = j * W + i, x = x0 + i * step, z = z0 + j * step, h = hs[k];
      pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
      const hx = hs[j * W + Math.min(W - 1, i + 1)] - hs[j * W + Math.max(0, i - 1)];
      const hz = hs[Math.min(H - 1, j + 1) * W + i] - hs[Math.max(0, j - 1) * W + i];
      const slope = Math.hypot(hx, hz) / (2 * step);
      c.setHex(groundColor(h, slope));
      // A sea cliff is bare rock whether or not the mesh happens to resolve the
      // slope: the shore profile already knows this stretch is cliffed, so use
      // that rather than inferring it from a gradient the grid may have smoothed.
      if (h > 0 && h < 110) {
        const cf = cliffiness(x, z);
        if (cf > 0.35) c.lerp(new THREE.Color(0x8b8378), Math.min(0.8, (cf - 0.35) * 1.7));
      }
      // built ground reads as ground, not lawn
      const s = h > 0 ? settAt(x, z) : null;
      if (s) c.lerp(new THREE.Color(0xc3b9a6), 0.5);
      // Two scales of variation. One fine (soil, mown grass, scrub) and one
      // broad, so a ten-kilometre hillside is not one flat green: real land
      // reads as patches of pasture, woodland and bare ground at 500 m across.
      const n = (0.82 + fbm(x, z, 240, 2) * 0.36) * (0.84 + fbm(x + 9000, z - 4000, 1500, 3) * 0.34);
      const warm = 0.90 + fbm(x - 3000, z + 6000, 2800, 2) * 0.22;
      col[k * 3] = c.r * n * warm;
      col[k * 3 + 1] = c.g * n;
      col[k * 3 + 2] = c.b * n * (1.94 - warm);
    }

    const idx = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      if (hole) {
        const cx = x0 + (i + 0.5) * step, cz = z0 + (j + 0.5) * step;
        if (cx > hole.x0 && cx < hole.x1 && cz > hole.z0 && cz < hole.z1) continue;
      }
      const a = j * W + i, b = a + 1, d2 = a + W, e = d2 + 1;
      idx.push(a, d2, b, b, d2, e);
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();

    let mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0 }));
    mesh.receiveShadow = true;
    // The COARSE grid does not cast. At 200 m a triangle is far bigger than any
    // shadow-map texel it lands in, so it self-shadows: the sea bed showed hard
    // polygonal dark patches straight through the transparent water. Its shadows
    // were worth nothing anyway -- it is mostly sea bed and distant haze.
    mesh.castShadow = casts;
    scene.add(mesh);

    if (skirtDepth) {                                   // border skirt
      const sp = [], sc = [];
      const push = (i, j) => {
        const k = j * W + i;
        sp.push(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]);
        sp.push(pos[k * 3], pos[k * 3 + 1] - skirtDepth, pos[k * 3 + 2]);
        sc.push(col[k * 3], col[k * 3 + 1], col[k * 3 + 2], col[k * 3] * 0.7, col[k * 3 + 1] * 0.7, col[k * 3 + 2] * 0.7);
      };
      const ring = [];
      for (let i = 0; i < W; i++) ring.push([i, 0]);
      for (let j = 1; j < H; j++) ring.push([W - 1, j]);
      for (let i = W - 2; i >= 0; i--) ring.push([i, H - 1]);
      for (let j = H - 2; j >= 1; j--) ring.push([0, j]);
      for (const [i, j] of ring) push(i, j);
      const si = [];
      for (let n = 0; n + 1 < ring.length; n++) {
        const a = n * 2, b = a + 1, cc = a + 2, dd = a + 3;
        si.push(a, b, cc, cc, b, dd);
      }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
      sg.setAttribute("color", new THREE.Float32BufferAttribute(sc, 3));
      sg.setIndex(si); sg.computeVertexNormals();
      const sm = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, side: THREE.DoubleSide }));
      scene.add(sm);
    }
    return W * H;
  }

  const hole = { x0: -LOOK.coreX, x1: LOOK.coreX, z0: LOOK.coreZ0, z1: LOOK.coreZ1 };
  let verts = 0;
  if (!SKIP.has("terrain")) {
    verts = terrainMesh(-30000, 30000, -33000, 10000, LOOK.outerStep, hole, 0, false);
    // The skirt only has to be as deep as the height difference a resolution change
    // can leave at the seam, which is metres, not hundreds. At 240 m it was a dark
    // wall standing in the water at the edge of the modelled core, clearly visible
    // through the transparent sea as a straight dark band across the bay.
    verts += terrainMesh(hole.x0, hole.x1, hole.z0, hole.z1, LOOK.coreStep, null, 45);
  }
  stats.terrainVerts = verts;

  // ---------------------------------------------------------------------------
  // WATER
  //
  // One transparent surface at y = 0 over the modelled sea bed. Depth then comes
  // for free and is CORRECT -- sand shows through the shallows as turquoise, the
  // shelf edge reads as a line, and the deep bay goes blue -- instead of being
  // three hand-placed rings of coloured plastic that had to be kept in register
  // with a coastline they knew nothing about.
  // ---------------------------------------------------------------------------
  // An abyss plane far under the water, well beyond the modelled sea bed. The
  // water is transparent, so where the terrain grid ENDS you were looking at the
  // sky through the ocean -- which read as a flat table with a cliff at its edge
  // on every wide shot. Two triangles close the world.
  if (!SKIP.has("water")) {
    const abyss = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD.SIZE * 6, WORLD.SIZE * 6),
      new THREE.MeshStandardMaterial({ color: 0x16334a, roughness: 1 })
    );
    abyss.rotation.x = -Math.PI / 2; abyss.position.y = -175; scene.add(abyss);
  }

  const wn = waterNormalTexture(THREE);
  const sea = SKIP.has("water") ? { position: {} } : new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.SIZE * 4, WORLD.SIZE * 4),
    new THREE.MeshStandardMaterial({
      // Opacity is the whole depth cue: at 0.80 the modelled sea bed underneath
      // was invisible and the bay was one flat blue. At 0.62 the shelf, the
      // turquoise band and the deep channel all read through it.
      color: 0x2181a6, roughness: 0.055, metalness: 0.5,
      transparent: true, opacity: 0.62, depthWrite: false,
      normalMap: wn, normalScale: new THREE.Vector2(0.42, 0.42),
    })
  );
  if (!SKIP.has("water")) {
    sea.rotation.x = -Math.PI / 2; sea.position.y = LOOK.seaLevel; sea.renderOrder = 2;
    scene.add(sea);
  }

  // Surf: a ribbon hugging every shoreline, faded across its width.
  if (!SKIP.has("water")) {
    const ftex = foamTexture(THREE);
    const pos = [], uv = [], idx = [];
    let vi = 0;
    for (const lm of masses) {
      if (lm.kind === "mainland" && lm.polygon.length > 24) { /* fall through */ }
      const inner = offsetPolygon(lm.polygon, -9);
      const outer = offsetPolygon(lm.polygon, 30);
      const n = lm.polygon.length;
      for (let i = 0; i < n; i++) {
        pos.push(inner[i][0], 0.5, inner[i][1]); uv.push(0, 0);
        pos.push(outer[i][0], 0.5, outer[i][1]); uv.push(0, 1);
      }
      for (let i = 0; i < n; i++) {
        const a = vi + i * 2, b = a + 1, c2 = vi + ((i + 1) % n) * 2, d2 = c2 + 1;
        idx.push(a, b, c2, c2, b, d2);
      }
      vi += n * 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
      map: ftex, transparent: true, depthWrite: false, opacity: 0.55, side: THREE.DoubleSide,
    }));
    m.renderOrder = 3; scene.add(m);
  }

  // ---------------------------------------------------------------------------
  // ROADS
  //
  // Roads FOLLOW THE GROUND now. They were flat planes at a fixed y, which is
  // fine on a flat plate and impossible on a hillside. Each is walked in steps,
  // sampled against the terrain, and emitted as a ribbon -- and a segment is
  // only emitted if both its ends are on dry land, which is what stops the
  // settlement grids running out over the water.
  //
  // Footways are drawn slightly BELOW the carriageway so that at every
  // intersection the road wins, instead of a pavement crossing the junction.
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // BRIDGE PROFILES
  //
  // A bridge is a road, so its deck has to be a height ALONG that road, not a
  // separate object placed nearby. For each crossing the water span is measured
  // from the terrain, then the deck is the greater of (the ground plus kerb) and
  // (a ramp between the two shores plus an arch over the water). The ends
  // therefore melt into the street grid on both sides and the middle clears the
  // shipping, which is what makes a bridge read as connecting two places rather
  // than as a deck floating between them.
  // ---------------------------------------------------------------------------
  const ARCH_RISE = { cable: 44, arch: 15, causeway: 8 };
  const bridgeProfile = new Map();
  const bridgeSpans = [];
  for (const br of BRIDGES) {
    // `at` is the fixed coordinate, `t` runs along the span. For a north-south
    // bridge that is (x = at, z = t); for an east-west one it is (x = t, z = at).
    const ew = br.axis === "ew";
    const H = (t) => (ew ? heightAt(t, br.x) : heightAt(br.x, t));
    const z0 = Math.min(br.a, br.b), z1 = Math.max(br.a, br.b);
    let w0 = null, w1 = null;
    for (let z = z0; z <= z1; z += 5) {
      if (H(z) <= 0.5) { if (w0 === null) w0 = z; w1 = z; }
    }
    const yA = H(z0) + 0.9, yB = H(z1) + 0.9;
    const rise = ARCH_RISE[br.type] || 10;
    const wm = w0 === null ? (z0 + z1) / 2 : (w0 + w1) / 2;
    const half = w0 === null ? 200 : Math.max(160, (w1 - w0) * 0.72);
    const prof = (z) => {
      const t = (z - z0) / Math.max(1, z1 - z0);
      const base = yA + (yB - yA) * t;
      const u = clamp(1 - Math.abs(z - wm) / half, 0, 1);
      const arch = rise * (u * u * (3 - 2 * u));
      return Math.max(H(z) + 0.9, base + arch);
    };
    bridgeProfile.set(br.id, prof);
    bridgeSpans.push({ br, z0, z1, w0, w1, wm, prof, rise, ew, H });
  }

  if (!SKIP.has("roads")) {
    const road = { pos: [], idx: [] }, walk = { pos: [], idx: [] }, mark = { pos: [], idx: [] };
    const inCore = (x, z) => Math.abs(x) < LOOK.coreX && z > LOOK.coreZ0 && z < LOOK.coreZ1;

    function strip(buf, x, z, ew, half, y, prev) {
      const ax = ew ? x : x - half, az = ew ? z - half : z;
      const bx = ew ? x : x + half, bz = ew ? z + half : z;
      const i0 = buf.pos.length / 3;
      buf.pos.push(ax, y, az, bx, y, bz);
      if (prev !== null) buf.idx.push(prev, prev + 1, i0, i0, prev + 1, i0 + 1);
      return i0;
    }

    function ribbon(r, half, buf, lift) {
      const ew = r.axis === "ew";
      const from = Math.min(r.from, r.to), to = Math.max(r.from, r.to);
      const core = inCore(ew ? (from + to) / 2 : r.at, ew ? r.at : (from + to) / 2);
      const prof = r.bridge ? bridgeProfile.get(r.bridge) : null;
      const step = prof ? 18 : core ? 26 : 110;
      let prev = null;
      for (let t = from; t <= to + 1e-6; t += step) {
        const x = ew ? t : r.at, z = ew ? r.at : t;
        if (prof) { prev = strip(buf, x, z, ew, half, prof(z) + lift - 0.9, prev); continue; }
        const h = heightAt(x, z);
        if (h < 0.8) { prev = null; continue; }               // do not pave the sea
        prev = strip(buf, x, z, ew, half, h + lift, prev);
      }
    }

    const allRoads = [...world.roads];
    for (const r of allRoads) {
      const spec = ROADS[r.class]; if (!spec) continue;
      const core = Math.abs(r.at) < 20000;
      ribbon(r, spec.row / 2 - spec.footway, road, 0.9);
      if (spec.footway > 0) {
        ribbon(r, spec.row / 2, walk, 0.62);
        if (spec.row >= 28 && inCore(r.axis === "ew" ? 0 : r.at, r.axis === "ew" ? r.at : 0)) {
          ribbon(r, 0.55, mark, 1.02);
        }
      }
      void core;
    }

    const mk = (buf, colour, rough, order) => {
      if (!buf.pos.length) return;
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(buf.pos, 3));
      g.setIndex(buf.idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
        color: colour, roughness: rough, metalness: 0,
        polygonOffset: true, polygonOffsetFactor: -order, polygonOffsetUnits: -order,
      }));
      m.receiveShadow = true; scene.add(m);
    };
    mk(walk, 0xbdb5a6, 0.95, 1);
    mk(road, 0x4b5058, 0.92, 2);
    mk(mark, 0xf0e4b0, 0.8, 3);
    stats.roadTris = (road.idx.length + walk.idx.length + mark.idx.length) / 3;
  }

  // ---------------------------------------------------------------------------
  // BUILDINGS
  //
  // Height is scaled by CENTRALITY: tallest at a settlement's centre, tapering
  // to its edge. A uniformly random skyline is a comb; a peak with shoulders is
  // a city, and it is the difference you read from ten kilometres away.
  // ---------------------------------------------------------------------------
  const coll = createCollector();
  if (!SKIP.has("buildings")) {
    const byClass = {};
    let placed = 0;
    for (const p of world.plots) {
      const cls = p.className;
      if (!HEIGHT[cls] || cls === "PARK") continue;
      const bw = Math.max(3, p.buildable.xMax - p.buildable.xMin);
      const bd = Math.max(3, p.buildable.zMax - p.buildable.zMin);
      const cx = (p.buildable.xMin + p.buildable.xMax) / 2;
      const cz = (p.buildable.zMin + p.buildable.zMax) / 2;

      const g = heightAt(cx, cz);
      if (g < 0.6) continue;                              // plot fell in the water
      const h0 = heightAt(p.xMin, p.zMin), h1 = heightAt(p.xMax, p.zMin);
      const h2 = heightAt(p.xMin, p.zMax), h3 = heightAt(p.xMax, p.zMax);
      const gRange = Math.max(h0, h1, h2, h3) - Math.min(h0, h1, h2, h3);

      const s = SETT.find((q) => q.id === (p.settlement || "downtown"));
      let central = 1;
      if (s) {
        const dd = Math.hypot(cx - s.cx, cz - s.cz) / (s.r || 1);
        central = 0.42 + 0.58 * Math.pow(clamp(1 - dd, 0, 1), 0.75);
      }
      const r = rnd(p.id);
      let h = HEIGHT[cls](r) * (cls === "FARM" || cls === "HANGAR" ? 1 : central);
      const cap = PLOT_CLASSES[cls] && PLOT_CLASSES[cls].maxHeight;
      if (cap) h = Math.min(h, cap);
      if (h < 4) h = 4;

      if (emitBuilding(coll, cls, p.id, cx, cz, bw, bd, h, g, gRange)) {
        placed++; byClass[cls] = (byClass[cls] || 0) + 1;
      }
    }
    stats.buildings = placed;
    stats.byClass = byClass;
  }
  stats.buildings = stats.buildings || 0;

  // --- turn the buckets into InstancedMeshes ---
  {
    // PLAIN boxes. RoundedBoxGeometry is about 120 triangles where a box is 12,
    // and at 95,000 parts that was an 11-million-triangle scene for a 5 cm bevel
    // no one can see from a street, let alone from the bay. The rounding stays
    // only on the handful of hero props where it actually catches a highlight.
    const unitBox = new THREE.BoxGeometry(1, 1, 1);
    const flatBox = new THREE.BoxGeometry(1, 1, 1);
    const prism = prismGeometry(THREE);
    const hip = hipGeometry(THREE);
    const barrel = barrelGeometry(THREE);
    const dome = domeGeometry(THREE);
    const cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
    const cone = new THREE.ConeGeometry(0.5, 1, 8);
    // A four-sided pyramid for tower crowns. A cone reads as a spire; a pyramid
    // reads as a building, and the two together stop every top being flat.
    const pyr = new THREE.ConeGeometry(0.72, 1, 4);
    pyr.rotateY(Math.PI / 4);

    const glassMat = (bands) => new THREE.MeshStandardMaterial({
      map: windowTexture(THREE, renderer, bands), roughness: 0.28, metalness: 0.32,
    });

    const SPEC = {
      wall:   { g: unitBox, m: () => new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.02 }), anchor: "centre" },
      roof:   { g: flatBox, m: () => new THREE.MeshStandardMaterial({ roughness: 0.86 }), anchor: "centre" },
      metal:  { g: flatBox, m: () => new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.55 }), anchor: "centre" },
      deck:   { g: flatBox, m: () => new THREE.MeshStandardMaterial({ roughness: 0.12, metalness: 0.3 }), anchor: "centre" },
      glassT: { g: unitBox, m: () => glassMat(56), anchor: "centre" },
      glassM: { g: unitBox, m: () => glassMat(26), anchor: "centre" },
      glassL: { g: unitBox, m: () => glassMat(12), anchor: "centre" },
      pitch:  { g: prism, m: () => new THREE.MeshStandardMaterial({ roughness: 0.88 }), anchor: "base" },
      hip:    { g: hip, m: () => new THREE.MeshStandardMaterial({ roughness: 0.88 }), anchor: "base" },
      barrel: { g: barrel, m: () => new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.35 }), anchor: "centre" },
      dome:   { g: dome, m: () => new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.25 }), anchor: "base" },
      cyl:    { g: cyl, m: () => new THREE.MeshStandardMaterial({ roughness: 0.7 }), anchor: "centre" },
      cone:   { g: cone, m: () => new THREE.MeshStandardMaterial({ roughness: 0.7 }), anchor: "centre" },
      pyr:    { g: pyr, m: () => new THREE.MeshStandardMaterial({ roughness: 0.72 }), anchor: "centre" },
    };

    const d = new THREE.Object3D(), c = new THREE.Color();
    let parts = 0, calls = 0;
    for (const key in coll.buckets) {
      const arr = coll.buckets[key], spec = SPEC[key];
      if (!spec) continue;
      const n = arr.length / 8;
      const im = new THREE.InstancedMesh(spec.g, spec.m(), n);
      im.castShadow = true; im.receiveShadow = true;
      for (let i = 0; i < n; i++) {
        const o = i * 8;
        d.position.set(arr[o], arr[o + 1], arr[o + 2]);
        d.scale.set(arr[o + 3], arr[o + 4], arr[o + 5]);
        d.rotation.set(0, arr[o + 6], 0);
        d.updateMatrix();
        im.setMatrixAt(i, d.matrix);
        im.setColorAt(i, c.setHex(arr[o + 7]));
      }
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      // A real bounding sphere over the placed instances, so a bucket that lives
      // twenty kilometres away is culled instead of being submitted every frame.
      im.computeBoundingSphere();
      scene.add(im);
      parts += n; calls++;
    }
    stats.parts = parts; stats.instancedMeshes = calls;
  }

  // ---------------------------------------------------------------------------
  // VEGETATION
  //
  // Two species and a tree line. Trees stop at 1,080 m, which is most of what
  // makes a mountain look like a mountain rather than a green cone.
  // ---------------------------------------------------------------------------
  if (!SKIP.has("trees")) {
    const spots = [];
    const occupied = (x, z) => {
      for (const p of plan.plots) if (x > p.xMin - 3 && x < p.xMax + 3 && z > p.zMin - 3 && z < p.zMax + 3) return true;
      return false;
    };
    // street trees along the downtown roads
    for (const r of plan.roads) {
      const spec = ROADS[r.class], ew = r.axis === "ew";
      // ON THE FOOTWAY, not beyond it. Planted at row/2 + 3.5 every street tree
      // stood inside the adjoining plot and was rejected as occupied, so the
      // densest part of the city had no street trees at all.
      for (let t = r.from + 20; t < r.to - 20; t += 24) for (const side of [-1, 1]) {
        const off = side * (spec.row / 2 - Math.max(2.2, spec.footway * 0.45));
        const x = ew ? t : r.at + off;
        const z = ew ? r.at + off : t;
        if (heightAt(x, z) < 2) continue;
        if (occupied(x, z)) continue;
        spots.push([x, z, 0.8 + rnd("s" + x + z) * 0.5, 0]);
      }
    }
    // THE WIDER LANDSCAPE: woods, not a sprinkle.
    //
    // This planted 26,000 trees at a uniform random density, which from any
    // distance is not countryside -- it is grain. Evenly-spaced isolated dots
    // over every green surface, exactly the noise that made the land rendering
    // look dirty.
    //
    // Real country is CLUMPED: woods, shelter belts along field edges, and open
    // ground between them. Gating placement on a low-frequency noise field
    // gives contiguous woodland with genuinely empty fields, at the same tree
    // count -- so it costs nothing and stops reading as static.
    for (let i = 0; i < 26000; i++) {
      const x = -21000 + rnd("fx" + i) * 42000, z = -23000 + rnd("fz" + i) * 20500;
      const h = heightAt(x, z);
      if (h < 3 || h > TREE_LINE) continue;
      if (settAt(x, z)) continue;

      // two scales: where the woods are, and their ragged edges
      const wood = fbm(x + 3100, z - 1700, 2300, 2);
      const edge = fbm(x - 800, z + 2600, 520, 2);
      const canopy = wood * 0.78 + edge * 0.22;

      // uplands are more wooded, and the threshold moves with height rather
      // than the density doing all the work
      const gate = h > 400 ? 0.42 : h > 60 ? 0.52 : 0.60;
      if (canopy < gate) continue;

      // inside a wood, plant densely; near its edge, thin out
      const dens = Math.min(0.95, (canopy - gate) * 3.4);
      if (rnd("fd" + i) > dens) continue;
      spots.push([x, z, 1.5 + rnd("fs" + i) * 1.9, h > 520 ? 1 : 0]);
    }
    // the barrier island and the keys: palms and scrub
    for (let i = 0; i < 3200; i++) {
      const x = -8400 + rnd("bx" + i) * 17000, z = 1800 + rnd("bz" + i) * 1700;
      const h = heightAt(x, z);
      if (h < 1.5) continue;
      if (settAt(x, z) && rnd("bk" + i) > 0.18) continue;
      spots.push([x, z, 0.9 + rnd("bs" + i) * 0.7, 0]);
    }
    // GARDEN TREES. Every settlement was a carpet of roofs with not one tree in
    // it, because the landscape pass skipped anything inside a settlement
    // boundary to avoid planting trees through buildings. Low-rise plots have
    // gardens; placing one at the rear corner of a plot puts it exactly where a
    // garden tree goes and cannot land on the street.
    for (const p of world.plots) {
      if (p.className !== "VILLA" && p.className !== "TOWNHOUSE" && p.className !== "TERRACE") continue;
      if (rnd("gt" + p.id) > 0.42) continue;
      const gx = p.xMax - Math.max(2.5, p.width * 0.16);
      const gz = p.zMax - 2.6;
      if (heightAt(gx, gz) < 1.5) continue;
      spots.push([gx, gz, 0.5 + rnd("gs" + p.id) * 0.4, 0]);
    }

    // PARK CANOPIES. Planted here rather than in the park pass so they share the
    // same instanced meshes as every other tree in the world -- a park with its
    // own tree mesh is another draw call for no reason.
    for (const b of (plan.parks || [])) {
      const cx2 = (b.xMin + b.xMax) / 2, cz2 = (b.zMin + b.zMax) / 2;
      const w2 = b.xMax - b.xMin, d2 = b.zMax - b.zMin;
      const n2 = Math.max(8, Math.round((w2 * d2) / 800));
      for (let i = 0; i < n2; i++) {
        const tx = b.xMin + 8 + rnd("pt" + b.id + i) * (w2 - 16);
        const tz = b.zMin + 8 + rnd("pu" + b.id + i) * (d2 - 16);
        if (Math.abs(tx - cx2) < 6 || Math.abs(tz - cz2) < 6) continue;   // keep the paths clear
        if (heightAt(tx, tz) < 1) continue;
        spots.push([tx, tz, 1.0 + rnd("pv" + b.id + i) * 0.7, 0]);
      }
    }

    // parks and gaps inside the city
    for (let i = 0; i < 2400; i++) {
      const x = -1500 + rnd("px" + i) * 2950, z = -760 + rnd("pz" + i) * 1400;
      if (heightAt(x, z) < 2.5) continue;
      if (occupied(x, z)) continue;
      spots.push([x, z, 1 + rnd("ps" + i) * 0.8, 0]);
    }

    const trunkG = new THREE.CylinderGeometry(0.45, 0.8, 6, 4);
    const broad = new THREE.SphereGeometry(1, 6, 4);
    const conif = new THREE.ConeGeometry(1, 2.4, 6);
    const n = spots.length;
    const tI = new THREE.InstancedMesh(trunkG, new THREE.MeshStandardMaterial({ color: 0x5f452d, roughness: 0.95 }), n);
    const bI = new THREE.InstancedMesh(broad, new THREE.MeshStandardMaterial({ roughness: 0.9 }), n);
    const cI = new THREE.InstancedMesh(conif, new THREE.MeshStandardMaterial({ roughness: 0.9 }), n);
    tI.castShadow = bI.castShadow = cI.castShadow = true;
    const d = new THREE.Object3D(), c = new THREE.Color();
    let nb = 0, nc = 0;
    spots.forEach(([x, z, s, kind], i) => {
      const y = heightAt(x, z);
      d.position.set(x, y + 3 * s, z); d.scale.setScalar(s); d.rotation.set(0, 0, 0); d.updateMatrix();
      tI.setMatrixAt(i, d.matrix);
      const tint = c.setHex(kind ? 0x38612f : 0x4f8a3e).offsetHSL(0, (rnd("h" + i) - 0.5) * 0.09, (rnd("l" + i) - 0.5) * 0.17);
      if (kind) {
        d.position.set(x, y + 6 * s + 3.4 * s, z); d.scale.set(3.4 * s, 9 * s, 3.4 * s); d.updateMatrix();
        cI.setMatrixAt(nc, d.matrix); cI.setColorAt(nc, tint); nc++;
      } else {
        d.position.set(x, y + 8.4 * s, z); d.scale.set(5.4 * s, 4.6 * s, 5.4 * s); d.updateMatrix();
        bI.setMatrixAt(nb, d.matrix); bI.setColorAt(nb, tint); nb++;
      }
    });
    bI.count = nb; cI.count = nc;
    tI.instanceMatrix.needsUpdate = bI.instanceMatrix.needsUpdate = cI.instanceMatrix.needsUpdate = true;
    if (bI.instanceColor) bI.instanceColor.needsUpdate = true;
    if (cI.instanceColor) cI.instanceColor.needsUpdate = true;
    tI.computeBoundingSphere(); bI.computeBoundingSphere(); cI.computeBoundingSphere();
    scene.add(tI, bI, cI);
    stats.trees = n;
  }
  stats.trees = stats.trees || 0;

  const api = { scene, field, heightAt, plan, world, masses, stats, sun, sunDir: sunPos.clone(), sky, sea, wn, LOOK, THREE, renderer, settAt, SETT, bridgeSpans };
  if (!SKIP.has("props")) buildProps(api);
  stats.buildMs = Math.round(performance.now() - t0);
  return api;
}

// =============================================================================
// PROPS — the things that say what a place IS
//
// A container port, an airport, marinas, causeways, traffic. Individually small;
// together they are the difference between "buildings on land" and a working
// coastal city.
// =============================================================================
function buildProps(api) {
  const { THREE, scene, heightAt, masses, stats, world, plan, settAt } = api;
  const M = (c, r = 0.85, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const RB = (w, h, d, r = 0.3) => new RoundedBoxGeometry(w, h, d, 1, r);

  // ---------------------------------------------------------------------------
  // BRIDGES
  //
  // The deck itself is the ROAD -- generated with the rest of the network from
  // the same profile, so the carriageway, footways, markings and lamps run
  // straight across and join the grid at both ends. What is built here is the
  // structure that holds it up and the edge that stops you falling off: the
  // soffit, the piers, the parapets, and the towers and stays or the arch.
  //
  // Everything is written into TWO merged buffers rather than emitted as loose
  // meshes. Built the obvious way -- one Mesh per soffit box, parapet segment,
  // pier, stay and arch segment -- ten crossings came to about three thousand
  // draw calls, and the wide views simply stopped returning frames. A bridge is
  // a few hundred boxes; boxes belong in a buffer.
  // ---------------------------------------------------------------------------
  {
    const conc = { pos: [], idx: [] }, steelB = { pos: [], idx: [] };

    /** Append a box, centred and rotated about X (pitch along the span). */
    function pushBox(buf, cx, cy, cz, w, h, l, pitch = 0) {
      const c = Math.cos(pitch), sn = Math.sin(pitch);
      const hw = w / 2, hh = h / 2, hl = l / 2;
      const base = buf.pos.length / 3;
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
        const y = sy * hh, z = sz * hl;
        buf.pos.push(cx + sx * hw, cy + y * c - z * sn, cz + y * sn + z * c);
      }
      // corners are indexed x*4 + y*2 + z
      const F = [
        [0, 1, 3, 2], [4, 6, 7, 5],       // -x, +x
        [0, 4, 5, 1], [2, 3, 7, 6],       // -y, +y
        [0, 2, 6, 4], [1, 5, 7, 3],       // -z, +z
      ];
      for (const [a, b, c2, d2] of F) {
        buf.idx.push(base + a, base + b, base + c2, base + a, base + c2, base + d2);
      }
    }

    /** Same box, laid along X instead of Z. */
    function pushBoxEW(buf, cx, cy, cz, w, h, l, pitch = 0) {
      const c = Math.cos(pitch), sn = Math.sin(pitch);
      const hw = w / 2, hh = h / 2, hl = l / 2;
      const base = buf.pos.length / 3;
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
        const y = sy * hh, x = sx * hw;
        buf.pos.push(cx + x * c - y * sn, cy + x * sn + y * c, cz + sz * hl);
      }
      const F = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];
      for (const [a, b, c2, d2] of F) buf.idx.push(base + a, base + b, base + c2, base + a, base + c2, base + d2);
    }

    for (const sp of api.bridgeSpans) {
      const { br, z0, z1, w0, w1, prof, ew, H } = sp;
      if (w0 === null) continue;                       // nothing to cross
      const spec = ROADS[br.class] || ROADS.AVENUE;
      const width = spec.row;
      const SEG = 30;
      // place(t, lateralOffset) -> [x, z] on the correct axis
      const P = (t, off = 0) => (ew ? [t, br.x + off] : [br.x + off, t]);
      const put = (buf, t, off, y, w, h, l, pitch) => {
        const [px, pz] = P(t, off);
        if (ew) pushBoxEW(buf, px, y, pz, l, h, w, pitch);
        else pushBox(buf, px, y, pz, w, h, l, pitch);
      };

      for (let z = z0; z < z1; z += SEG) {
        const zb = Math.min(z1, z + SEG);
        const yA = prof(z), yB = prof(zb), len = zb - z;
        const y = (yA + yB) / 2, cz = (z + zb) / 2;
        const pitch = -Math.atan2(yB - yA, len);
        const L = Math.hypot(len, yB - yA) * 1.04;
        put(conc, cz, 0, y - 2.0, width * 0.98, 2.6, L, pitch);                 // soffit
        for (const side of [-1, 1]) {                                            // parapets
          put(conc, cz, side * (width / 2 - 0.4), y + 0.85, 0.7, 1.5, L, pitch);
        }
      }

      // --- piers, in the water only ---
      const pierGap = br.type === "cable" ? 240 : br.type === "arch" ? 170 : 130;
      for (let z = w0 + pierGap * 0.5; z < w1; z += pierGap) {
        const bed = Math.min(-2, H(z));
        const top = prof(z) - 2.4, hgt = top - bed;
        if (hgt < 4) continue;
        put(conc, z, 0, bed + hgt / 2, width * 0.30, hgt, 9, 0);
        put(conc, z, 0, top - 1.1, width * 0.72, 2.2, 11, 0);                   // pier cap
      }

      if (br.type === "cable") {
        const span = w1 - w0;
        for (const t of [0.30, 0.70]) {
          const tz = w0 + span * t;
          const deckY = prof(tz), bed = Math.min(-4, H(tz));
          const towerH = 96, legH = deckY - bed + towerH;
          for (const side of [-1, 1]) {
            put(steelB, tz, side * (width / 2 - 2), bed + legH / 2, 5.5, legH, 6.5, 0);
          }
          put(steelB, tz, 0, deckY + towerH * 0.62, width, 4, 5, 0);            // cross beam
          for (const dir of [-1, 1]) for (let k = 1; k <= 6; k++) {
            const reach = span * 0.17 * (k / 6), az = tz + dir * reach;
            if (az < z0 || az > z1) continue;
            const dy = deckY + towerH - prof(az), L = Math.hypot(reach, dy);
            for (const side of [-1, 1]) {
              put(steelB, (tz + az) / 2, side * (width / 2 - 2),
                (deckY + towerH + prof(az)) / 2, 0.8, 0.8, L, dir * Math.atan2(reach, dy));
            }
          }
        }
      } else if (br.type === "arch") {
        const cz = (w0 + w1) / 2, halfSpan = (w1 - w0) / 2 + 40, rise = 26, N = 14;
        for (const side of [-1, 1]) for (let i = 0; i < N; i++) {
          const u0 = -1 + (2 * i) / N, u1 = -1 + (2 * (i + 1)) / N;
          const z0a = cz + u0 * halfSpan, z1a = cz + u1 * halfSpan;
          const y0 = prof(z0a) - 2 + rise * (1 - u0 * u0);
          const y1 = prof(z1a) - 2 + rise * (1 - u1 * u1);
          const dz = z1a - z0a, dy = y1 - y0, L = Math.hypot(dz, dy) * 1.08;
          put(steelB, (z0a + z1a) / 2, side * (width / 2 - 1.5), (y0 + y1) / 2,
            2.2, 2.2, L, -Math.atan2(dy, dz));
        }
      }
    }

    const emit = (buf, colour, rough, metal) => {
      if (!buf.pos.length) return 0;
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(buf.pos, 3));
      g.setIndex(buf.idx);
      const flat = g.toNonIndexed(); flat.computeVertexNormals();
      const m = new THREE.Mesh(flat, new THREE.MeshStandardMaterial({ color: colour, roughness: rough, metalness: metal }));
      m.castShadow = true; m.receiveShadow = true; scene.add(m);
      return buf.idx.length / 3;
    };
    stats.bridgeTris = emit(conc, 0xdcd6c8, 0.88, 0) + emit(steelB, 0xe4e0d6, 0.5, 0.3);
    stats.bridges = api.bridgeSpans.length;
  }

  // --- container port: the most recognisable silhouette in any working harbour
  {
    const cc = [0xd94f3d, 0x2f7fb5, 0xe0a53f, 0x3f9e6a, 0xb04a8a, 0xe8e4dc];
    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(12, 2.6, 2.6), new THREE.MeshStandardMaterial({ roughness: 0.72 }), 2200);
    const d = new THREE.Object3D(), c = new THREE.Color(); let n = 0;
    for (let x = -6800; x < -3500 && n < 2200; x += 16)
      for (let z = -3150; z < -2320 && n < 2200; z += 4) {
        if (rnd("ct" + x + z) < 0.42) continue;
        const g = heightAt(x, z); if (g < 1) continue;
        const stack = 1 + Math.floor(rnd("cs" + x + z) * 4);
        for (let k = 0; k < stack && n < 2200; k++) {
          d.position.set(x, g + 1.4 + k * 2.7, z); d.scale.set(1, 1, 1); d.updateMatrix();
          inst.setMatrixAt(n, d.matrix);
          inst.setColorAt(n, c.setHex(cc[Math.floor(rnd("cc" + x + z + k) * cc.length) % cc.length]));
          n++;
        }
      }
    inst.count = n; inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.castShadow = true; inst.computeBoundingSphere(); scene.add(inst);
    stats.containers = n;

    // Cranes go ON THE QUAY. Fixed at z = -2300 they stood in open water,
    // because the mainland coast has a bay at this end and the shoreline is
    // hundreds of metres further north here than the constant assumed. Walk
    // north until the ground comes up, then stand just inland of it.
    for (let x = -6600; x < -3600; x += 400) {
      let quayZ = null;
      for (let z = -2000; z > -3400; z -= 20) if (heightAt(x, z) > 1.5) { quayZ = z - 40; break; }
      if (quayZ === null) continue;
      const g = new THREE.Group(), gy = Math.max(2, heightAt(x, quayZ));
      for (const dx of [-24, 24]) for (const dz of [-17, 17]) {
        const leg = new THREE.Mesh(RB(3, 56, 3, 0.3), M(0xe0673a, 0.75));
        leg.position.set(dx, 28, dz); leg.castShadow = true; g.add(leg);
      }
      const beam = new THREE.Mesh(RB(136, 5, 6, 0.4), M(0xe0673a, 0.75));
      beam.position.set(26, 58, 0); beam.castShadow = true; g.add(beam);
      const house = new THREE.Mesh(RB(13, 9, 13, 0.5), M(0xf0ece2, 0.8));
      house.position.set(0, 64, 0); g.add(house);
      g.position.set(x, gy, quayZ); scene.add(g);
    }
  }

  // ---------------------------------------------------------------------------
  // STREET FURNITURE
  //
  // Bins, benches and bus shelters on the footways of the dense core. Individually
  // trivial; collectively the difference between a street and a corridor between
  // two rows of massing. Instanced, so the whole lot is three draw calls.
  // ---------------------------------------------------------------------------
  {
    const spots = { bin: [], bench: [], shelter: [] };
    for (const r of world.roads) {
      const spec = ROADS[r.class];
      if (!spec || spec.footway <= 0) continue;
      if (r.bridge || r.connector) continue;
      const ew = r.axis === "ew";
      // only in the built-up core -- furniture in open country is litter
      const step = spec.row >= 40 ? 55 : 90;
      for (let t = r.from + 30; t < r.to - 30; t += step) {
        const across = spec.row / 2 - spec.footway * 0.45;
        for (const side of [-1, 1]) {
          const x = ew ? t : r.at + side * across;
          const z = ew ? r.at + side * across : t;
          if (!settAt(x, z)) continue;
          const g = heightAt(x, z);
          if (g < 1.2) continue;
          const k = rnd(`sf${r.id}${t}${side}`);
          if (k < 0.30) spots.bin.push([x, g, z]);
          else if (k < 0.52) spots.bench.push([x, g, z, ew]);
          else if (k < 0.57 && spec.row >= 40) spots.shelter.push([x, g, z, ew]);
        }
      }
    }
    const put = (geo, mat, list, yOff, rotFromEw) => {
      if (!list.length) return 0;
      const inst = new THREE.InstancedMesh(geo, mat, list.length);
      const o = new THREE.Object3D();
      list.forEach((p, i) => {
        o.position.set(p[0], p[1] + yOff, p[2]);
        o.rotation.set(0, rotFromEw && p[3] ? Math.PI / 2 : 0, 0);
        o.scale.setScalar(1); o.updateMatrix(); inst.setMatrixAt(i, o.matrix);
      });
      inst.instanceMatrix.needsUpdate = true; inst.castShadow = true; inst.computeBoundingSphere();
      scene.add(inst);
      return list.length;
    };
    const nBin = put(new THREE.CylinderGeometry(0.32, 0.28, 1.0, 6), M(0x3f4a44, 0.7), spots.bin, 0.5, false);
    const nBench = put(new THREE.BoxGeometry(1.8, 0.45, 0.55), M(0xa9835a, 0.85), spots.bench, 0.35, true);
    const nShel = put(new THREE.BoxGeometry(3.6, 2.5, 1.4), M(0x9fc4dd, 0.25, 0.4), spots.shelter, 1.25, true);
    stats.streetFurniture = nBin + nBench + nShel;
  }

  // ---------------------------------------------------------------------------
  // THE RAILWAY
  //
  // A city this size has one, and its absence was conspicuous: a port, an
  // airport, a container terminal and no way to move any of it inland. Routed
  // along the coastal corridor a few hundred metres behind the shore, which is
  // where a coastal main line actually goes -- flat ground, serves the towns,
  // out of the way of the beach.
  //
  // Built as instanced sleepers and two continuous rails so it costs two draw
  // calls rather than one per tie.
  // ---------------------------------------------------------------------------
  {
    const RAIL_Z = -3900;
    const pts = [];
    for (let x = -17000; x <= 17000; x += 60) {
      // follow the ground, and skip anything the line could not be built on
      const h = heightAt(x, RAIL_Z);
      if (h < 2 || h > 240) { pts.push(null); continue; }
      pts.push([x, h + 0.9, RAIL_Z]);
    }
    const railM = M(0x6b6f74, 0.55, 0.55), tieM = M(0x4a4038, 0.95);
    const tieG = new THREE.BoxGeometry(3.2, 0.35, 0.42);
    const ties = [];
    for (let i = 0; i < pts.length; i += 2) if (pts[i]) ties.push(pts[i]);
    const tI = new THREE.InstancedMesh(tieG, tieM, ties.length);
    const dd = new THREE.Object3D();
    ties.forEach((p, i) => { dd.position.set(p[0], p[1], p[2]); dd.rotation.set(0, 0, 0); dd.scale.setScalar(1); dd.updateMatrix(); tI.setMatrixAt(i, dd.matrix); });
    tI.instanceMatrix.needsUpdate = true; tI.receiveShadow = true; tI.computeBoundingSphere();
    scene.add(tI);
    // the two rails, as continuous ribbons
    for (const off of [-0.72, 0.72]) {
      const pos = [], idx = [];
      let n = 0;
      for (const p of pts) {
        if (!p) continue;
        pos.push(p[0], p[1] + 0.28, p[2] + off - 0.06, p[0], p[1] + 0.28, p[2] + off + 0.06);
        n++;
      }
      for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx); g.computeVertexNormals();
      scene.add(new THREE.Mesh(g, railM));
    }
    // a few trains
    for (const [tx, cars] of [[-9000, 7], [1200, 9], [9800, 6]]) {
      const gy = Math.max(3, heightAt(tx, RAIL_Z)) + 1.9;
      for (let c = 0; c < cars; c++) {
        const cx = tx + c * 24;
        const body = new THREE.Mesh(RB(21, 3.6, 3.1, 0.7), M(c === 0 ? 0xc4453a : 0xdfe3e6, 0.5, 0.2));
        body.position.set(cx, gy, RAIL_Z); body.castShadow = true; scene.add(body);
      }
    }
    stats.railTies = ties.length;
  }

  // ---------------------------------------------------------------------------
  // THE GOLF COURSE
  //
  // Land use a city actually has and this one did not: a large piece of managed
  // open green with water, sand and no buildings. It reads instantly from the
  // air and it is the sort of thing whose absence makes a model look like a
  // model.
  // ---------------------------------------------------------------------------
  {
    const CX = -7600, CZ = -5600;
    const fair = M(0x74a84a, 0.95), rough = M(0x5c8a3c, 0.97);
    const sand = M(0xe6d8a8, 0.95), water = M(0x2f7d99, 0.2, 0.4);
    const gy = Math.max(3, heightAt(CX, CZ));
    // the rough: one big soft footprint
    const base = new THREE.Mesh(new THREE.CircleGeometry(760, 22), rough);
    base.rotation.x = -Math.PI / 2; base.position.set(CX, gy + 0.35, CZ); base.receiveShadow = true; scene.add(base);
    // fairways: nine mown strips at varied angles
    for (let i = 0; i < 9; i++) {
      const a = rnd("gf" + i) * Math.PI * 2;
      const r = 180 + rnd("gr" + i) * 420;
      const fx = CX + Math.cos(a) * r * 0.6, fz = CZ + Math.sin(a) * r * 0.6;
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(70 + rnd("gw" + i) * 40, 300 + rnd("gl" + i) * 220), fair);
      strip.rotation.x = -Math.PI / 2; strip.rotation.z = a;
      strip.position.set(fx, gy + 0.42, fz); strip.receiveShadow = true; scene.add(strip);
      // a green with a bunker beside it
      const gr = new THREE.Mesh(new THREE.CircleGeometry(26, 12), fair);
      gr.rotation.x = -Math.PI / 2; gr.position.set(fx + Math.cos(a) * 150, gy + 0.5, fz + Math.sin(a) * 150); scene.add(gr);
      const bk = new THREE.Mesh(new THREE.CircleGeometry(15, 10), sand);
      bk.rotation.x = -Math.PI / 2; bk.position.set(fx + Math.cos(a + 1) * 172, gy + 0.46, fz + Math.sin(a + 1) * 172); scene.add(bk);
    }
    // a water hazard and the clubhouse
    const pond = new THREE.Mesh(new THREE.CircleGeometry(88, 16), water);
    pond.rotation.x = -Math.PI / 2; pond.position.set(CX + 240, gy + 0.44, CZ - 180); scene.add(pond);
    const club = new THREE.Mesh(RB(62, 10, 30, 0.8), M(0xf2ece0, 0.85));
    club.position.set(CX - 520, gy + 5, CZ + 380); club.castShadow = true; scene.add(club);
    const croof = new THREE.Mesh(new THREE.ConeGeometry(44, 9, 4), M(0x8a5a3c, 0.85));
    croof.position.set(CX - 520, gy + 14, CZ + 380); croof.rotation.y = Math.PI / 4; croof.castShadow = true; scene.add(croof);
    stats.golf = 9;
  }

  // --- airport ---
  {
    const rwMat = M(0x3b4045, 0.95), mkMat = M(0xf2ead2, 0.8), apMat = M(0x555c63, 0.94);
    const ay = Math.max(6, heightAt(12100, -4600));
    for (const [rz, len] of [[-4300, 3400], [-4900, 2800]]) {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(len, 60), rwMat);
      r.rotation.x = -Math.PI / 2; r.position.set(12100, ay + 0.5, rz); r.receiveShadow = true; scene.add(r);
      for (let x = -len / 2 + 90; x < len / 2 - 90; x += 140) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(70, 3), mkMat);
        m.rotation.x = -Math.PI / 2; m.position.set(12100 + x, ay + 0.56, rz); scene.add(m);
      }
    }
    const taxi = new THREE.Mesh(new THREE.PlaneGeometry(3200, 26), apMat);
    taxi.rotation.x = -Math.PI / 2; taxi.position.set(12100, ay + 0.48, -4600); scene.add(taxi);
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(900, 420), apMat);
    apron.rotation.x = -Math.PI / 2; apron.position.set(11400, ay + 0.46, -5150); apron.receiveShadow = true; scene.add(apron);
    // the terminal: a pier with jetways, so the apron reads as an airport rather
    // than a car park with aeroplanes on it
    const term = new THREE.Mesh(RB(520, 16, 78, 1.4), M(0xe8ecef, 0.6, 0.15));
    term.position.set(11400, ay + 8, -4880); term.castShadow = term.receiveShadow = true; scene.add(term);
    const troof = new THREE.Mesh(RB(540, 2.2, 92, 0.8), M(0xb9c2c8, 0.5, 0.3));
    troof.position.set(11400, ay + 17, -4880); troof.castShadow = true; scene.add(troof);
    for (let i = 0; i < 6; i++) {
      const jx = 11180 + i * 92;
      const jet = new THREE.Mesh(RB(6, 4, 46, 0.6), M(0xd4d9dc, 0.6, 0.2));
      jet.position.set(jx, ay + 7, -4990); jet.castShadow = true; scene.add(jet);
    }
    // control tower
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(5, 7, 42, 10), M(0xeae4d6, 0.8));
    tw.position.set(11000, ay + 21, -4780); tw.castShadow = true; scene.add(tw);
    const cab = new THREE.Mesh(RB(15, 8, 15, 1.2), M(0x9fc4dd, 0.3, 0.4));
    cab.position.set(11000, ay + 45, -4780); cab.castShadow = true; scene.add(cab);
    for (let i = 0; i < 16; i++) {
      const x = 11000 + rnd("ap" + i) * 820, z = -5320 + Math.floor(rnd("aq" + i) * 3) * 110;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 42, 12), M(0xf8f8f6, 0.45, 0.25));
      body.rotation.z = Math.PI / 2; body.position.set(x, ay + 6, z); body.castShadow = true; scene.add(body);
      const wing = new THREE.Mesh(RB(9, 1.3, 40, 0.4), M(0xecebe7, 0.45, 0.25));
      wing.position.set(x, ay + 5, z); wing.castShadow = true; scene.add(wing);
      const tail = new THREE.Mesh(RB(1.2, 13, 9, 0.4), M(0xd94f3d, 0.6));
      tail.position.set(x - 18, ay + 13, z); tail.castShadow = true; scene.add(tail);
    }
  }

  // --- farm fields: a crop patchwork. Colour is what makes farmland read. ---
  {
    const crops = [0xc9b471, 0xa8bd66, 0xd9c98a, 0x8fae5c, 0xe0cf94, 0xbcae72, 0x9db85f];
    const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2);
    const belts = [[-18400, -13600, -8600, -3600], [15400, 18600, -8400, -3400]];
    const cells = [];
    for (const [x0, x1, z0, z1] of belts)
      for (let x = x0; x < x1; x += 260) for (let z = z0; z < z1; z += 200) {
        const h = heightAt(x + 130, z + 100);
        if (h < 3) continue;
        cells.push([x, z, h]);
      }
    const inst = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: 0.97 }), cells.length);
    const d = new THREE.Object3D(), c = new THREE.Color();
    cells.forEach(([x, z, h], i) => {
      d.position.set(x + 130, h + 0.4, z + 100); d.scale.set(246, 1, 186); d.updateMatrix();
      inst.setMatrixAt(i, d.matrix);
      inst.setColorAt(i, c.setHex(crops[Math.floor(rnd("cr" + x + z) * crops.length) % crops.length]));
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.receiveShadow = true; inst.computeBoundingSphere(); scene.add(inst);
    stats.fields = cells.length;
  }

  // ---------------------------------------------------------------------------
  // THE MARINA
  //
  // A real one, in the dredged basin behind the breakwater on the island's east
  // side: a stone arm sheltering the mouth, a spine pontoon with finger berths,
  // a fleet on the moorings, a fuel dock, a hardstanding, and a clubhouse on the
  // quay. The previous four "marinas" were identical pontoon rectangles dropped
  // at four coordinates with no basin, no shelter and no shore.
  // ---------------------------------------------------------------------------
  {
    const pon = M(0xe6dcc6, 0.9), hull = M(0xf8f6f0, 0.62, 0.05);
    const stone = M(0xb8b2a4, 0.95), teak = M(0xa9835a, 0.85);

    // --- the breakwater arm ---
    for (let i = 0; i < MARINA.breakwater.length - 1; i++) {
      const [ax, az] = MARINA.breakwater[i], [bx, bz] = MARINA.breakwater[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const arm = new THREE.Mesh(RB(22, 7, len * 1.06, 1.2), stone);
      arm.position.set((ax + bx) / 2, 1.4, (az + bz) / 2);
      arm.rotation.y = Math.atan2(bx - ax, bz - az);
      arm.castShadow = true; arm.receiveShadow = true; scene.add(arm);
    }
    // a light at the head of the arm
    const head = MARINA.breakwater[MARINA.breakwater.length - 1];
    const bcn = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.0, 9, 8), M(0xe8e2d4, 0.8));
    bcn.position.set(head[0], 9, head[1]); bcn.castShadow = true; scene.add(bcn);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x3fbf6a, emissive: 0x1a5a30 }));
    lamp.position.set(head[0], 14.5, head[1]); scene.add(lamp);

    // --- pontoons: a spine along the basin with fingers off it ---
    const boats = [];
    const spineLen = MARINA.r * 1.7;
    const spine = new THREE.Mesh(RB(spineLen, 1.4, 6, 0.4), pon);
    spine.position.set(MARINA.x, 1.2, MARINA.z); spine.receiveShadow = true;
    spine.castShadow = true; scene.add(spine);
    for (let i = -spineLen / 2 + 20; i <= spineLen / 2 - 20; i += 24) {
      for (const dir of [-1, 1]) {
        const fl = MARINA.r * 0.52;
        const f = new THREE.Mesh(RB(4.5, 1.3, fl, 0.35), pon);
        f.position.set(MARINA.x + i, 1.2, MARINA.z + dir * (fl / 2 + 3));
        f.receiveShadow = true; f.castShadow = true; scene.add(f);
        for (const side of [-1, 1]) for (let k = 0; k < 3; k++) {
          if (rnd("mb" + i + dir + side + k) < 0.24) continue;
          const bl = 8 + rnd("ml" + i + dir + side + k) * 9;
          boats.push([MARINA.x + i + side * 5.2, MARINA.z + dir * (10 + k * 15), bl,
                      rnd("mt" + i + dir + side + k)]);
        }
      }
    }
    // --- the fleet ---
    {
      const bg = RB(4.6, 2.6, 1, 0.7);
      const inst = new THREE.InstancedMesh(bg, hull, boats.length);
      const cg = RB(3.2, 2.0, 1, 0.5);
      const cabs = new THREE.InstancedMesh(cg, M(0xdfe6ea, 0.5, 0.1), boats.length);
      const mg = new THREE.CylinderGeometry(0.22, 0.28, 1, 5);
      const masts = new THREE.InstancedMesh(mg, M(0xf2f0ea, 0.6), boats.length);
      const d = new THREE.Object3D();
      let nm = 0;
      boats.forEach(([bx, bz, bl, t], i) => {
        d.position.set(bx, 1.7, bz); d.rotation.set(0, 0, 0); d.scale.set(1, 1, bl);
        d.updateMatrix(); inst.setMatrixAt(i, d.matrix);
        d.position.set(bx, 3.7, bz); d.scale.set(1, 1, bl * 0.34);
        d.updateMatrix(); cabs.setMatrixAt(i, d.matrix);
        if (t > 0.42) {                                  // sailing boats carry a mast
          const mh = bl * 1.5;
          d.position.set(bx, 3 + mh / 2, bz); d.scale.set(1, mh, 1);
          d.updateMatrix(); masts.setMatrixAt(nm++, d.matrix);
        }
      });
      masts.count = nm;
      inst.instanceMatrix.needsUpdate = cabs.instanceMatrix.needsUpdate = masts.instanceMatrix.needsUpdate = true;
      inst.castShadow = cabs.castShadow = masts.castShadow = true;
      inst.computeBoundingSphere(); cabs.computeBoundingSphere(); masts.computeBoundingSphere();
      scene.add(inst, cabs, masts);
      stats.marinaBoats = boats.length;
    }
    // --- the quay: clubhouse, hardstanding, fuel dock ---
    {
      const qz = MARINA.z - MARINA.r - 40, qx = MARINA.x + 30;
      const gy = Math.max(2, heightAt(qx, qz));
      const club = new THREE.Mesh(RB(58, 11, 26, 0.8), M(0xf2ece0, 0.85));
      club.position.set(qx, gy + 5.5, qz); club.castShadow = true; club.receiveShadow = true; scene.add(club);
      const roof = new THREE.Mesh(RB(62, 1.4, 30, 0.5), M(0x4d8fa6, 0.8));
      roof.position.set(qx, gy + 11.6, qz); roof.castShadow = true; scene.add(roof);
      const deck = new THREE.Mesh(RB(70, 0.6, 14, 0.3), teak);
      deck.position.set(qx, gy + 0.5, qz + 22); deck.receiveShadow = true; scene.add(deck);
      // boats out of the water on the hardstanding
      for (let i = 0; i < 9; i++) {
        const hx = qx - 90 + (i % 5) * 22, hz = qz + Math.floor(i / 5) * 18;
        const g2 = Math.max(2, heightAt(hx, hz));
        const b = new THREE.Mesh(RB(4.4, 2.4, 12, 0.7), hull);
        b.position.set(hx, g2 + 2.6, hz); b.castShadow = true; scene.add(b);
      }
    }
  }

  // --- CALIBRATION MARKERS (?markers=1) --------------------------------------
  //
  // Bright pillars at known world coordinates. Rendering them and finding them
  // in the image gives an EXACT pixel->metres mapping for a given camera, which
  // is the only way to convert a hand-drawn overlay into real geometry. Deriving
  // it from the camera maths instead would be a guess about projection, and
  // guessing about coordinates is what produced several wrong passes.
  if (typeof location !== "undefined" && new URLSearchParams(location.search).get("markers") === "1") {
    const MARKS = [[-15000, 0], [15000, 0], [0, -8000], [0, 4000], [-15000, -8000], [15000, 4000]];
    const mm = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    for (const [mx, mz] of MARKS) {
      const pin = new THREE.Mesh(new THREE.BoxGeometry(420, 900, 420), mm);
      pin.position.set(mx, 420, mz);
      scene.add(pin);
    }
    stats.markers = MARKS.length;
  }

  // ---------------------------------------------------------------------------
  // RIVERS AND CANALS
  //
  // The trough is already cut into the height field; this is the water in it.
  // Each waterway gets a ribbon following its own surface, which descends to
  // sea level at the mouth -- a single sea-level plane cannot show a river
  // 120 m up a hillside, and a river that does not run downhill is worse than
  // no river.
  // ---------------------------------------------------------------------------
  {
    // (this runs in the detail pass, where the ?skip= set is not in scope)
    let quads = 0;
    for (const w of WATERWAYS) {
      const surf = waterwaySurface(w, heightAt);
      if (surf.length < 2) continue;
      const pos = [], idx = [];
      for (let i = 0; i < surf.length; i++) {
        const a = surf[Math.max(0, i - 1)], b = surf[Math.min(surf.length - 1, i + 1)];
        let nx = -(b.z - a.z), nz = (b.x - a.x);
        const L = Math.hypot(nx, nz) || 1; nx /= L; nz /= L;
        // rivers broaden toward the mouth; canals keep one width
        const t = i / (surf.length - 1);
        const hw = w.kind === "river" ? w.halfWidth * (0.45 + 0.55 * t) : w.halfWidth;
        const p = surf[i];
        pos.push(p.x + nx * hw, p.y, p.z + nz * hw);
        pos.push(p.x - nx * hw, p.y, p.z - nz * hw);
      }
      for (let i = 0; i < surf.length - 1; i++) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        quads++;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
        color: w.kind === "river" ? 0x2f6f86 : 0x2a7d94,
        roughness: 0.12, metalness: 0.34, transparent: true, opacity: 0.92,
      }));
      mesh.receiveShadow = true;
      scene.add(mesh);
    }
    stats.waterways = WATERWAYS.length;
    stats.waterwayQuads = quads;
  }

  // ---------------------------------------------------------------------------
  // THE PLEASURE PIER
  //
  // Walks out over the water on piles, with a pavilion at the head. It is the
  // one structure on the ocean side visible from right across the bay, and the
  // reason the beachfront has a centre instead of just running past.
  // ---------------------------------------------------------------------------
  {
    const deckM = M(0xc8b48f, 0.9), pileM = M(0x6b6257, 0.95);
    const roofM = M(0xd9534a, 0.8), wallM = M(0xf4efe2, 0.85);
    const len = PIER.to - PIER.from;

    const deck = new THREE.Mesh(RB(PIER.width, 2.2, len, 0.4), deckM);
    deck.position.set(PIER.x, 6.2, (PIER.from + PIER.to) / 2);
    deck.castShadow = deck.receiveShadow = true;
    scene.add(deck);

    // piles, stopping where the deck meets the sand
    const pileG = new THREE.CylinderGeometry(PIER.pilings.radius, PIER.pilings.radius, 18, 6);
    const n = Math.floor(len / PIER.pilings.spacing);
    const piles = new THREE.InstancedMesh(pileG, pileM, n * 2);
    const d = new THREE.Object3D();
    let pi = 0;
    for (let i = 0; i < n; i++) {
      const z = PIER.from + i * PIER.pilings.spacing;
      for (const side of [-1, 1]) {
        d.position.set(PIER.x + side * (PIER.width / 2 - 2.5), -2.6, z);
        d.rotation.set(0, 0, 0); d.scale.setScalar(1); d.updateMatrix();
        piles.setMatrixAt(pi++, d.matrix);
      }
    }
    piles.count = pi;
    piles.instanceMatrix.needsUpdate = true;
    piles.castShadow = true; piles.computeBoundingSphere();
    scene.add(piles);

    // The pavilion at the seaward end.
    //
    // First attempt used a single wide cone for the roof: radius 56 on a
    // height of 11 read from the beach as a flat red disc floating over the
    // water, not a building. A roof needs to be steeper than it is wide.
    const hall = new THREE.Mesh(RB(PIER.head.w, 15, PIER.head.d, 0.8), wallM);
    hall.position.set(PIER.x, 14.6, PIER.head.z);
    hall.castShadow = hall.receiveShadow = true;
    scene.add(hall);
    // a hipped roof: four sides, taller than it is broad, with real eaves
    const roof = new THREE.Mesh(new THREE.ConeGeometry(PIER.head.w * 0.62, 22, 4), roofM);
    roof.position.set(PIER.x, 32, PIER.head.z);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    scene.add(roof);
    // a smaller hall halfway out, so the pier has something along its length
    const mid = new THREE.Mesh(RB(30, 9, 34, 0.6), wallM);
    mid.position.set(PIER.x, 11.6, PIER.from + (PIER.to - PIER.from) * 0.42);
    mid.castShadow = true;
    scene.add(mid);
    const midRoof = new THREE.Mesh(new THREE.ConeGeometry(24, 12, 4), roofM);
    midRoof.position.set(PIER.x, 22, PIER.from + (PIER.to - PIER.from) * 0.42);
    midRoof.rotation.y = Math.PI / 4;
    midRoof.castShadow = true;
    scene.add(midRoof);

    // The big wheel. A bare torus is a hoop; what makes it read is the spokes,
    // the hub and the cabins hanging off the rim.
    {
      const wx = PIER.x - 58, wy = 40, wz = PIER.head.z - 40;
      const steel = M(0xe8e4d8, 0.55, 0.35);
      for (const off of [-5, 5]) {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(28, 1.6, 6, 30), steel);
        rim.position.set(wx + off, wy, wz);
        rim.castShadow = true;
        scene.add(rim);
      }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 12, 8), steel);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(wx, wy, wz);
      scene.add(hub);
      const spokeG = new THREE.BoxGeometry(0.6, 56, 0.6);
      const spokes = new THREE.InstancedMesh(spokeG, steel, 8);
      const cabG = new THREE.BoxGeometry(4.4, 4.4, 5.2);
      const cabs = new THREE.InstancedMesh(cabG, M(0xd94f3d, 0.7), 12);
      const o = new THREE.Object3D();
      for (let i = 0; i < 8; i++) {
        o.position.set(wx, wy, wz); o.rotation.set(0, 0, (i / 8) * Math.PI);
        o.scale.setScalar(1); o.updateMatrix(); spokes.setMatrixAt(i, o.matrix);
      }
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        o.position.set(wx, wy + Math.sin(a) * 28, wz + Math.cos(a) * 28);
        o.rotation.set(0, 0, 0); o.scale.setScalar(1); o.updateMatrix();
        cabs.setMatrixAt(i, o.matrix);
      }
      spokes.instanceMatrix.needsUpdate = cabs.instanceMatrix.needsUpdate = true;
      spokes.castShadow = cabs.castShadow = true;
      spokes.computeBoundingSphere(); cabs.computeBoundingSphere();
      scene.add(spokes, cabs);
      // the legs it stands on
      for (const sx of [-16, 16]) {
        const leg = new THREE.Mesh(RB(2.2, 40, 2.2, 0.3), steel);
        leg.position.set(wx + sx, wy - 22, wz);
        leg.castShadow = true;
        scene.add(leg);
      }
    }
    stats.pier = pi;
  }

  // ---------------------------------------------------------------------------
  // THE BOARDWALK
  //
  // Runs ALONG the back of the beach rather than out into the sea -- a
  // different job from the pier. Built as a chain of segments between the
  // declared points so it follows the crescent instead of cutting across it.
  // ---------------------------------------------------------------------------
  {
    const plank = M(0xbfa578, 0.92), rail = M(0xf2ede0, 0.8);
    let segs = 0;
    for (let i = 0; i < BOARDWALK.points.length - 1; i++) {
      const [ax, az] = BOARDWALK.points[i], [bx, bz] = BOARDWALK.points[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const mx = (ax + bx) / 2, mz = (az + bz) / 2;
      const g = Math.max(1.2, heightAt(mx, mz));
      const seg = new THREE.Mesh(RB(BOARDWALK.width, 1.1, len * 1.04, 0.3), plank);
      seg.position.set(mx, g + 0.9, mz);
      seg.rotation.y = -Math.atan2(bz - az, bx - ax) + Math.PI / 2;
      seg.receiveShadow = true;
      scene.add(seg);
      // the seaward railing, so it reads as a promenade rather than a path
      const r = new THREE.Mesh(RB(0.5, 1.5, len * 1.04, 0.2), rail);
      r.position.set(mx + Math.cos(seg.rotation.y) * (BOARDWALK.width / 2), g + 2.1, mz - Math.sin(seg.rotation.y) * (BOARDWALK.width / 2));
      r.rotation.y = seg.rotation.y;
      scene.add(r);
      segs++;
    }
    stats.boardwalk = segs;
  }

  // --- shipping and sail out in the bay ---
  {
    const hull = M(0xf7f4ec, 0.7), sail = M(0xffffff, 0.6);
    const cargo = M(0x2b4b63, 0.7);
    for (let i = 0; i < 320; i++) {
      const x = -14000 + rnd("bx" + i) * 28000, z = -3200 + rnd("bz" + i) * 7200;
      if (heightAt(x, z) > -3) continue;
      const s = 0.8 + rnd("bs" + i) * 1.2;
      const b = new THREE.Mesh(RB(16 * s, 3 * s, 5 * s, 0.6), hull);
      b.position.set(x, 1.1, z); b.rotation.y = rnd("br" + i) * 6.28; b.castShadow = true; scene.add(b);
      if (rnd("bt" + i) > 0.45) {
        const m2 = new THREE.Mesh(new THREE.ConeGeometry(3.2 * s, 13 * s, 3), sail);
        m2.position.set(x, 8 * s, z); m2.rotation.y = b.rotation.y; m2.castShadow = true; scene.add(m2);
      }
    }
    for (let i = 0; i < 7; i++) {                       // container ships on the approach
      const x = -9000 + rnd("sx" + i) * 12000, z = -2600 + rnd("sz" + i) * 900;
      if (heightAt(x, z) > -6) continue;
      const b = new THREE.Mesh(RB(190, 16, 30, 1.5), cargo);
      b.position.set(x, 5, z); b.castShadow = true; scene.add(b);
      const sup = new THREE.Mesh(RB(22, 20, 26, 0.8), M(0xf0ece2, 0.8));
      sup.position.set(x - 70, 22, z); sup.castShadow = true; scene.add(sup);
    }
  }

  // ---------------------------------------------------------------------------
  // PARKS AND PLAZAS
  //
  // Blocks the plan marked as PARK, drawn as parks: mown lawn, a pond, gravel
  // paths across the diagonals, a dense canopy and benches. A city with no
  // unbuilt ground in it is a warehouse estate -- the gaps are as legible from
  // the air as the buildings, and there were none.
  // ---------------------------------------------------------------------------
  {
    const lawn = M(0x6f9c4c, 0.96), path = M(0xcfc4ad, 0.95), pond = M(0x3f86a8, 0.15, 0.4);
    const quad = new THREE.PlaneGeometry(1, 1); quad.rotateX(-Math.PI / 2);
    const lawns = [], paths = [], ponds = [], benches = [];
    for (const b of (plan.parks || [])) {
      const cx = (b.xMin + b.xMax) / 2, cz = (b.zMin + b.zMax) / 2;
      const g = heightAt(cx, cz); if (g < 1) continue;
      const w = b.xMax - b.xMin, d = b.zMax - b.zMin;
      lawns.push([cx, g + 0.30, cz, w, d]);
      // two paths across it, and a third along one edge
      paths.push([cx, g + 0.42, cz, w, 5.5]);
      paths.push([cx, g + 0.42, cz, 5.5, d]);
      if (rnd("pk" + b.id) > 0.45) {
        ponds.push([cx + (rnd("px" + b.id) - 0.5) * w * 0.3, g + 0.36,
                    cz + (rnd("pz" + b.id) - 0.5) * d * 0.3, w * 0.30, d * 0.34]);
      }
      for (let i = 0; i < 4; i++) {
        benches.push([cx + (i < 2 ? -1 : 1) * 9, g + 0.9, cz + (i % 2 ? -1 : 1) * (d * 0.22)]);
      }
    }
    const flat = (list, mat, order) => {
      if (!list.length) return;
      const im = new THREE.InstancedMesh(quad, mat, list.length);
      const d2 = new THREE.Object3D();
      list.forEach(([x, y, z, w, h], i) => {
        d2.position.set(x, y, z); d2.rotation.set(0, 0, 0); d2.scale.set(w, 1, h);
        d2.updateMatrix(); im.setMatrixAt(i, d2.matrix);
      });
      im.instanceMatrix.needsUpdate = true; im.receiveShadow = true;
      im.renderOrder = order; im.computeBoundingSphere(); scene.add(im);
    };
    flat(lawns, lawn, 0); flat(paths, path, 1); flat(ponds, pond, 2);
    if (benches.length) {
      const bg = RB(2.2, 0.5, 0.7, 0.15);
      const im = new THREE.InstancedMesh(bg, M(0x9b7d55, 0.9), benches.length);
      const d2 = new THREE.Object3D();
      benches.forEach(([x, y, z], i) => {
        d2.position.set(x, y, z); d2.rotation.set(0, rnd("bq" + i) * 3.14, 0); d2.scale.setScalar(1);
        d2.updateMatrix(); im.setMatrixAt(i, d2.matrix);
      });
      im.instanceMatrix.needsUpdate = true; im.castShadow = true; im.computeBoundingSphere(); scene.add(im);
    }
    // (planted by the vegetation pass, which runs before this one)
    stats.parks = (plan.parks || []).length;
  }

  // ---------------------------------------------------------------------------
  // LANDMARKS
  //
  // A city is not only its grain. It has things that are only there once: a
  // stadium, a station, a cathedral, a tall mast on the hill. They are what
  // people navigate by, and a skyline of nothing but commercial floorspace has
  // nothing to navigate by at all.
  // ---------------------------------------------------------------------------
  {
    const conc = M(0xdcd6c8, 0.92), steel = M(0xc8ccd0, 0.5, 0.4);

    // --- the stadium, on the north-east of the island ---
    {
      const sx = 1700, sz = 250, gy = Math.max(2, heightAt(sx, sz));
      const RX = 150, RZ = 118, N = 28;
      for (let i = 0; i < N; i++) {
        const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
        const mx = (Math.cos(a0) + Math.cos(a1)) / 2, mz = (Math.sin(a0) + Math.sin(a1)) / 2;
        const len = Math.hypot((Math.cos(a1) - Math.cos(a0)) * RX, (Math.sin(a1) - Math.sin(a0)) * RZ) * 1.15;
        const seg = new THREE.Mesh(RB(30, 34, len, 1.5), conc);
        seg.position.set(sx + mx * (RX + 8), gy + 17, sz + mz * (RZ + 8));
        seg.rotation.y = -Math.atan2(Math.sin(a1) - Math.sin(a0), (Math.cos(a1) - Math.cos(a0)) * (RX / RZ));
        seg.castShadow = true; seg.receiveShadow = true; scene.add(seg);
      }
      const pitch = new THREE.Mesh(new THREE.CircleGeometry(1, 32), M(0x4f8f42, 0.95));
      pitch.rotation.x = -Math.PI / 2; pitch.scale.set(RX * 0.82, 1, RZ * 0.82);
      pitch.position.set(sx, gy + 0.5, sz); pitch.receiveShadow = true; scene.add(pitch);
      stats.stadium = 1;
    }

    // --- the central station: a train shed with a clock tower ---
    {
      const sx = -420, sz = 60, gy = Math.max(2, heightAt(sx, sz));
      const shed = new THREE.Mesh(new THREE.CylinderGeometry(46, 46, 210, 14, 1, false, 0, Math.PI), steel);
      shed.rotation.z = Math.PI / 2; shed.position.set(sx, gy + 4, sz);
      shed.castShadow = true; scene.add(shed);
      const front = new THREE.Mesh(RB(30, 34, 220, 0.8), M(0xefe6d4, 0.85));
      front.position.set(sx - 58, gy + 17, sz); front.castShadow = true; scene.add(front);
      const tower = new THREE.Mesh(RB(20, 76, 20, 0.8), M(0xefe6d4, 0.85));
      tower.position.set(sx - 58, gy + 38, sz - 96); tower.castShadow = true; scene.add(tower);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(16, 26, 4), M(0x4f7a6a, 0.85));
      cap.rotation.y = Math.PI / 4; cap.position.set(sx - 58, gy + 89, sz - 96);
      cap.castShadow = true; scene.add(cap);
      stats.station = 1;
    }

    // --- a cathedral on the civic square ---
    {
      const sx = -100, sz = -40, gy = Math.max(2, heightAt(sx, sz));
      const nave = new THREE.Mesh(RB(34, 30, 110, 0.6), M(0xeee6d2, 0.9));
      nave.position.set(sx, gy + 15, sz); nave.castShadow = true; scene.add(nave);
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(19, 19, 112, 10, 1, false, 0, Math.PI), M(0x5e7d6c, 0.85));
      roof.rotation.z = Math.PI / 2; roof.position.set(sx, gy + 30, sz); roof.castShadow = true; scene.add(roof);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(24, 16, 10, 0, 6.283, 0, 1.57), M(0x5e7d6c, 0.6, 0.2));
      dome.position.set(sx, gy + 34, sz); dome.castShadow = true; scene.add(dome);
      for (const dz of [-46, 46]) {
        const t = new THREE.Mesh(RB(14, 74, 14, 0.5), M(0xeee6d2, 0.9));
        t.position.set(sx, gy + 37, sz + dz); t.castShadow = true; scene.add(t);
        const sp = new THREE.Mesh(new THREE.ConeGeometry(10, 30, 4), M(0x5e7d6c, 0.85));
        sp.rotation.y = Math.PI / 4; sp.position.set(sx, gy + 89, sz + dz); sp.castShadow = true; scene.add(sp);
      }
    }

    // --- a broadcast mast on the hill behind the city ---
    {
      const mx = -1400, mz = -6300, gy = heightAt(mx, mz);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 6, 180, 6), steel);
      mast.position.set(mx, gy + 90, mz); mast.castShadow = true; scene.add(mast);
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 14, 12), M(0xe8e2d4, 0.7));
      pod.position.set(mx, gy + 128, mz); pod.castShadow = true; scene.add(pod);
    }
  }

  // ---------------------------------------------------------------------------
  // CONTACT SHADOWS
  //
  // A soft dark blob under every building in the core. Real shadow maps put a
  // hard shadow on the sunlit side, but nothing darkens the ground where two
  // buildings meet, or under an overhang, and the result is buildings that look
  // stuck onto the ground rather than standing on it. This is the cheapest
  // ambient occlusion there is: one instanced quad each.
  // ---------------------------------------------------------------------------
  {
    const N = 128, c = document.createElement("canvas"); c.width = c.height = N;
    const g2 = c.getContext("2d");
    const grd = g2.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
    grd.addColorStop(0.00, "rgba(0,0,0,0.44)");
    grd.addColorStop(0.55, "rgba(0,0,0,0.20)");
    grd.addColorStop(1.00, "rgba(0,0,0,0)");
    g2.fillStyle = grd; g2.fillRect(0, 0, N, N);
    const tex = new THREE.CanvasTexture(c);
    const quad = new THREE.PlaneGeometry(1, 1); quad.rotateX(-Math.PI / 2);
    const list = [];
    for (const p of world.plots) {
      if (p.className === "PARK" || !HEIGHT[p.className]) continue;
      const cx = (p.xMin + p.xMax) / 2, cz = (p.zMin + p.zMax) / 2;
      if (Math.abs(cx) > 12000 || cz < -6500 || cz > 3600) continue;   // core only
      const h = heightAt(cx, cz); if (h < 0.8) continue;
      list.push([cx, h + 0.35, cz, (p.xMax - p.xMin) * 2.0, (p.zMax - p.zMin) * 2.0]);
    }
    const inst = new THREE.InstancedMesh(quad,
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.85 }),
      list.length);
    const d = new THREE.Object3D();
    list.forEach(([x, y, z, sx, sz], i) => {
      d.position.set(x, y, z); d.rotation.set(0, 0, 0); d.scale.set(sx, 1, sz);
      d.updateMatrix(); inst.setMatrixAt(i, d.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
    inst.renderOrder = 1; inst.computeBoundingSphere(); scene.add(inst);
    stats.contactShadows = list.length;
  }

  // ---------------------------------------------------------------------------
  // TRAFFIC
  //
  // On every road in the world, not just the twenty-seven downtown ones. Cars
  // are the cheapest possible signal that a city is inhabited rather than
  // modelled -- a road with nothing on it reads as a drawing of a road -- and at
  // this scale they cost one instanced draw call.
  // ---------------------------------------------------------------------------
  {
    const cols = [0xd94f3d, 0x2f7fb5, 0xf0ece2, 0x3b4045, 0xe0a53f, 0x6f8f5c, 0xb0b6bc,
                  0x8a4436, 0xe8e4dc, 0x556070, 0xc9a184];
    const profOf = new Map(api.bridgeSpans.map((s2) => [s2.br.id, s2.prof]));
    const list = [];
    for (const r of world.roads) {
      const spec = ROADS[r.class]; if (!spec) continue;
      const ew = r.axis === "ew";
      const from = Math.min(r.from, r.to), to = Math.max(r.from, r.to);
      // fewer cars on the far settlement grids, so the count stays sane
      const near = Math.abs(r.at) < 14000;
      // A car every 110 m is not traffic, it is punctuation: 25 vehicles spread
      // over the whole waterfront boulevard, which at any real viewing distance
      // reads as an empty road. City streets carry one every 15-25 m.
      const step = r.bridge ? 18 : near ? 15 : 90;
      const keep = r.bridge ? 0.8 : near ? 0.72 : 0.30;
      const prof = r.bridge ? profOf.get(r.bridge) : null;
      for (let t = from + 30; t < to - 30; t += step) {
        if (rnd("v" + r.id + t) > keep) continue;
        const side = rnd("vs" + r.id + t) > 0.5 ? 1 : -1;
        const off = side * (spec.row / 2 - spec.footway - 2.4);
        const x = ew ? t : r.at + off, z = ew ? r.at + off : t;
        let y;
        if (prof) y = prof(ew ? r.at : t) + 1.6;
        else { const h = heightAt(x, z); if (h < 1) continue; y = h + 1.7; }
        list.push([x, y, z, ew ? 0 : Math.PI / 2, rnd("vt" + r.id + t)]);
        if (list.length > 26000) break;
      }
      if (list.length > 26000) break;
    }
    const car = new THREE.BoxGeometry(4.4, 1.5, 2.0);
    const inst = new THREE.InstancedMesh(car, new THREE.MeshStandardMaterial({ roughness: 0.38, metalness: 0.3 }), list.length);
    const cab = new THREE.BoxGeometry(2.4, 1.1, 1.85);
    const cabs = new THREE.InstancedMesh(cab, new THREE.MeshStandardMaterial({ roughness: 0.2, metalness: 0.1, color: 0x9fb4c4 }), list.length);
    const d = new THREE.Object3D(), c = new THREE.Color();
    list.forEach(([x, y, z, ry, t], i) => {
      const truck = t > 0.86;
      d.position.set(x, y, z); d.rotation.set(0, ry, 0);
      d.scale.set(truck ? 2.3 : 1, truck ? 1.7 : 1, truck ? 1.15 : 1);
      d.updateMatrix(); inst.setMatrixAt(i, d.matrix);
      inst.setColorAt(i, c.setHex(cols[Math.floor(rnd("vc" + i) * cols.length) % cols.length]));
      d.position.set(x, y + (truck ? 1.9 : 1.2), z); d.scale.set(truck ? 1.6 : 1, 1, 1);
      d.updateMatrix(); cabs.setMatrixAt(i, d.matrix);
    });
    inst.instanceMatrix.needsUpdate = cabs.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.castShadow = true; inst.computeBoundingSphere(); cabs.computeBoundingSphere();
    scene.add(inst, cabs);
    stats.cars = list.length;
  }

  // ---------------------------------------------------------------------------
  // PEOPLE
  //
  // Specks, deliberately. At city scale a person is under a pixel, and what
  // reads is the DENSITY and the colour -- a promenade with a scatter of dots
  // along it is alive, an empty one is a drawing. They go where people actually
  // are: the footways of the core streets, the beaches, and the parks.
  // ---------------------------------------------------------------------------
  {
    const skin = [0xd94f3d, 0x2f7fb5, 0xf5f0e6, 0x3b4045, 0xe0a53f, 0x6f8f5c,
                  0xb85a8a, 0x4f7a6a, 0xe8e4dc, 0x8a6a4a];
    const list = [];
    const CORE = (x, z) => Math.abs(x) < 6500 && z > -4200 && z < 3600;
    for (const r of world.roads) {
      const spec = ROADS[r.class]; if (!spec || spec.footway <= 0) continue;
      const ew = r.axis === "ew";
      if (!CORE(ew ? 0 : r.at, ew ? r.at : 0)) continue;
      const from = Math.min(r.from, r.to), to = Math.max(r.from, r.to);
      for (let t = from + 12; t < to - 12; t += 11) {
        if (rnd("p" + r.id + t) > 0.30) continue;
        const side = rnd("ps" + r.id + t) > 0.5 ? 1 : -1;
        const off = side * (spec.row / 2 - spec.footway * 0.5);
        const x = ew ? t : r.at + off, z = ew ? r.at + off : t;
        const h = heightAt(x, z); if (h < 1) continue;
        list.push([x, h + 0.9, z]);
        if (list.length > 14000) break;
      }
      if (list.length > 14000) break;
    }
    // THE BEACHES. Scattering candidates over a bounding box put almost nobody on
    // sand -- the hit rate against a 30 m strip of a 22 km box is hopeless. Walk
    // the actual coastline instead and step inland from it, which is where people
    // on a beach are. Cliffed shore is skipped: nobody sunbathes on a cliff.
    const parasols = [];
    for (const lm of masses) {
      if (lm.kind === "mainland") continue;
      const poly = lm.polygon;
      for (let i = 0; i < poly.length; i += 2) {
        const [px, pz] = poly[i];
        if (cliffiness(px, pz) > 0.4) continue;
        const busy = rnd("beach" + lm.id + i);
        if (busy > 0.72) continue;                       // not every metre is busy
        const nx = poly[(i + 1) % poly.length][0] - px, nz = poly[(i + 1) % poly.length][1] - pz;
        const L = Math.hypot(nx, nz) || 1;
        const inx = nz / L, inz = -nx / L;                // inward-ish normal
        for (let k = 0; k < 7; k++) {
          const off = 6 + rnd("bo" + lm.id + i + k) * 40;
          const along = (rnd("ba" + lm.id + i + k) - 0.5) * 90;
          for (const sgn of [1, -1]) {
            const bx = px + inx * off * sgn + (nx / L) * along;
            const bz = pz + inz * off * sgn + (nz / L) * along;
            const h = heightAt(bx, bz);
            if (h < 0.4 || h > 3.6) continue;
            list.push([bx, h + 0.9, bz]);
            if (k === 0 && rnd("pu" + lm.id + i) > 0.55) parasols.push([bx, h, bz]);
            break;
          }
        }
        if (list.length > 22000) break;
      }
      if (list.length > 22000) break;
    }
    // --- parasols: the single most legible thing on a beach from the air ---
    if (parasols.length) {
      const pcols = [0xe8503c, 0xf2b134, 0x3f8fc4, 0xf0ece2, 0x4f9e6a, 0xe0709a];
      const top = new THREE.ConeGeometry(2.6, 1.1, 8);
      const pole = new THREE.CylinderGeometry(0.13, 0.13, 2.6, 4);
      const ti = new THREE.InstancedMesh(top, new THREE.MeshStandardMaterial({ roughness: 0.9 }), parasols.length);
      const pi = new THREE.InstancedMesh(pole, M(0xd8d2c4, 0.8), parasols.length);
      const d2 = new THREE.Object3D(), c2 = new THREE.Color();
      parasols.forEach(([x, y, z], i) => {
        d2.position.set(x, y + 1.3, z); d2.rotation.set(0, 0, 0); d2.scale.setScalar(1);
        d2.updateMatrix(); pi.setMatrixAt(i, d2.matrix);
        d2.position.set(x, y + 2.9, z); d2.updateMatrix(); ti.setMatrixAt(i, d2.matrix);
        ti.setColorAt(i, c2.setHex(pcols[Math.floor(rnd("pcx" + i) * pcols.length) % pcols.length]));
      });
      ti.instanceMatrix.needsUpdate = pi.instanceMatrix.needsUpdate = true;
      if (ti.instanceColor) ti.instanceColor.needsUpdate = true;
      ti.castShadow = pi.castShadow = true;
      ti.computeBoundingSphere(); pi.computeBoundingSphere();
      scene.add(ti, pi);
      stats.parasols = parasols.length;
    }
    const g = new THREE.BoxGeometry(0.62, 1.75, 0.62);
    const inst = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: 0.85 }), list.length);
    const d = new THREE.Object3D(), c = new THREE.Color();
    list.forEach(([x, y, z], i) => {
      d.position.set(x, y, z); d.rotation.set(0, rnd("pr" + i) * 6.28, 0);
      d.scale.set(1, 0.9 + rnd("ph" + i) * 0.22, 1);
      d.updateMatrix(); inst.setMatrixAt(i, d.matrix);
      inst.setColorAt(i, c.setHex(skin[Math.floor(rnd("pc" + i) * skin.length) % skin.length]));
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.castShadow = true; inst.computeBoundingSphere(); scene.add(inst);
    stats.people = list.length;
  }

  // --- street lighting along the downtown boulevards ---
  {
    const posts = [];
    for (const r of api.plan.roads) {
      if (ROADS[r.class].row < 18) continue;
      const ew = r.axis === "ew", spec = ROADS[r.class];
      for (let t = r.from + 24; t < r.to - 24; t += 52) for (const side of [-1, 1]) {
        const x = ew ? t : r.at + side * (spec.row / 2 - 1.4);
        const z = ew ? r.at + side * (spec.row / 2 - 1.4) : t;
        const h = heightAt(x, z); if (h < 1.2) continue;
        posts.push([x, h, z]);
      }
    }
    const pg = new THREE.CylinderGeometry(0.22, 0.3, 9, 5);
    const inst = new THREE.InstancedMesh(pg, M(0x4d545c, 0.6, 0.3), posts.length);
    const hg = new THREE.BoxGeometry(1.6, 0.5, 0.9);
    const hi = new THREE.InstancedMesh(hg, new THREE.MeshStandardMaterial({ color: 0xfff2cc, emissive: 0x2a2312 }), posts.length);
    const d = new THREE.Object3D();
    posts.forEach(([x, y, z], i) => {
      d.position.set(x, y + 4.5, z); d.rotation.set(0, 0, 0); d.scale.setScalar(1); d.updateMatrix();
      inst.setMatrixAt(i, d.matrix);
      d.position.set(x, y + 9.1, z); d.updateMatrix(); hi.setMatrixAt(i, d.matrix);
    });
    inst.instanceMatrix.needsUpdate = hi.instanceMatrix.needsUpdate = true;
    inst.castShadow = true; inst.computeBoundingSphere(); hi.computeBoundingSphere();
    scene.add(inst, hi);
    stats.lamps = posts.length;
  }
  void masses;
}
