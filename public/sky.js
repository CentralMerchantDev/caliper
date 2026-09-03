/**
 * The city's sky: clouds, stars and a moon that are actually in the scene.
 *
 * Mark: "it's still really hazy... it's like you're in a foggy atmosphere. No
 * crispness or cleanness or colour, it's really bland. I think we need to create
 * a sky backdrop that emulates a real world sky that rotates around, clouds and
 * such in that sky rather than a sea of free floating objects, because the
 * clouds that are in there look weird. And then you can have moon and stars."
 *
 * WHAT WAS ACTUALLY WRONG, because it is not what it looks like.
 *
 * The day/night code is complete and correct. Every frame it positions the moon,
 * sets the moon light's intensity from how dark it is, fades the starfield in,
 * and drifts the cloud clusters across the sky. All of that runs right now.
 *
 * It runs against objects that are not in the scene. `_buildCityBase` removes
 * the village's sky mesh, starfield, cloud group, moon mesh and moon light --
 * correctly, because they are sized for a village -- and never puts a city-sized
 * replacement back. The properties still hold the references, so every guard
 * passes and every update lands on an orphan. The sky has been empty and the
 * code animating it has been running the whole time.
 *
 * So this is not new behaviour. It is the other half of a swap that was only
 * ever done halfway.
 *
 * WHY THE CLOUDS LOOKED WRONG. The village's were eighteen clusters of blobs at
 * y = 160-250 m wrapping at +/-850 m. Downtown towers reach 220 m and the world
 * is 26 km across, so they sat AMONG the buildings rather than above them -- a
 * sea of free-floating objects, exactly as described. Clouds here are a layer:
 * two large domes carrying a procedural cloud texture, rotating slowly at 2.6 km
 * and 4.2 km. They are sky, not scenery, and they cannot be flown into.
 *
 * COST: FOUR draw calls -- stars, moon, and the two cloud domes SEPARATELY.
 *
 * This said three, on the reasoning that the domes "share one material and one
 * geometry, so they instance to one". Sharing geometry and material does not
 * instance anything in three.js; they are two Meshes at different scales and
 * rotations and each costs a draw. An audit caught it. The scene budget is
 * fourteen and this takes it to eighteen, which is the number to hold against.
 */

/** How far out the sky sits. Everything here is beyond the far terrain. */
const STAR_RADIUS = 46000;
const MOON_DISTANCE = 38000;
const CLOUD_LOW = 2600;
const CLOUD_HIGH = 4200;

/**
 * A soft cloud texture, drawn once to a canvas.
 *
 * Procedural rather than a file: it is one 512x512 canvas instead of a network
 * fetch, it tiles by construction, and its density can be tuned here rather than
 * in an image editor. Blobs are drawn with radial gradients so they have no hard
 * edge -- a hard-edged cloud is the thing that reads as an object rather than as
 * weather.
 */
function makeCloudTexture(THREE, { blobs = 220, seed = 7 } = {}) {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = S; c.height = S;
  const g = c.getContext("2d");
  g.clearRect(0, 0, S, S);

  // A tiny deterministic PRNG, so the sky is the same on every load. A sky that
  // reshuffles on refresh makes two screenshots incomparable.
  let s = seed >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };

  for (let i = 0; i < blobs; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = 26 + rnd() * 78;
    // Measured, not guessed: at 0.05-0.13 alpha, tiled 3x3, multiplied by a
    // material opacity of 0.42, the clouds were present in the scene -- the
    // probe confirmed two visible domes -- and invisible in the render. White
    // at a few percent alpha over a pale blue sky is nothing.
    const a = 0.18 + rnd() * 0.30;
    // Drawn nine times, wrapped, so a blob crossing an edge appears on the
    // opposite one and the texture tiles without a visible seam.
    for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S], [S, S], [-S, -S], [S, -S], [-S, S]]) {
      const grd = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      grd.addColorStop(0, `rgba(255,255,255,${a})`);
      grd.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grd;
      g.beginPath();
      g.arc(x + ox, y + oy, r, 0, Math.PI * 2);
      g.fill();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  // 1.6, not 3: at three repeats over a 20 km dome each blob subtended almost
  // nothing. Fewer, larger repeats read as weather rather than as noise.
  tex.repeat.set(1.6, 1.6);
  tex.colorSpace = THREE.SRGBColorSpace ?? tex.colorSpace;
  return tex;
}

/**
 * Build the city's sky and return a handle that the draw loop updates.
 *
 * Nothing here reads the clock or decides what time it is. The renderer already
 * computes the hour, the sun direction and how dark it is; passing those in
 * keeps ONE source for the time of day rather than a second one that can drift
 * out of step with the first.
 */
export function createCitySky(THREE, scene, opts = {}) {
  const group = new THREE.Group();
  group.name = "city-sky";
  // renderOrder and depthWrite:false keep the sky behind the world regardless of
  // its enormous radius -- without it the star sphere z-fights the far mountains.
  group.renderOrder = -1;
  scene.add(group);

  /* ---------------------------------------------------------------- stars -- */

  const starCount = opts.stars ?? 2600;
  const starPos = new Float32Array(starCount * 3);
  let ss = 20250903 >>> 0;
  const srnd = () => { ss = (ss * 1664525 + 1013904223) >>> 0; return ss / 4294967296; };
  for (let i = 0; i < starCount; i++) {
    // Uniform on a sphere: acos of a uniform gives even density. Using a raw
    // uniform for phi instead clusters everything at the poles, which reads as
    // two bright patches directly overhead and underfoot.
    const u = srnd() * 2 - 1;
    const phi = Math.acos(u);
    const theta = srnd() * Math.PI * 2;
    const r = STAR_RADIUS;
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = Math.abs(r * Math.cos(phi));   // sky only, never below the horizon
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  // NO `size` ATTRIBUTE. PointsMaterial does not read one -- its vertex shader is
  // `gl_PointSize = size` against a UNIFORM, and `attribute float size` appears
  // zero times in the vendored three build. Per-star sizes were being generated
  // and uploaded, 2,600 floats of them, and every star rendered at the uniform
  // 120 regardless. Varying star size needs a ShaderMaterial; until it is worth
  // one, the honest thing is not to pretend.
  const starMat = new THREE.PointsMaterial({
    color: 0xdce6ff, size: 120, sizeAttenuation: true,
    transparent: true, opacity: 0, depthWrite: false, fog: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  group.add(stars);

  /* ----------------------------------------------------------------- moon -- */

  const moonMat = new THREE.MeshBasicMaterial({
    color: 0xf4f1e4, transparent: true, opacity: 0, depthWrite: false, fog: false,
  });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), moonMat);
  moon.scale.setScalar(opts.moonRadius ?? 900);
  moon.frustumCulled = false;
  group.add(moon);

  /* --------------------------------------------------------------- clouds -- */



  const cloudTex = makeCloudTexture(THREE, { blobs: opts.cloudBlobs ?? 220 });
  const newCloudMat = () => new THREE.MeshBasicMaterial({
    map: cloudTex, transparent: true, opacity: 0.0,
    depthWrite: false, side: THREE.BackSide, fog: false,
  });
  // BackSide on a sphere means the texture is on the INSIDE, so it reads as a
  // ceiling from underneath at any position in a 26 km world. A plane would only
  // look right from directly below its centre.
  //
  // A CEILING ONLY WORKS FROM UNDERNEATH, AND NOTHING ENFORCED THAT.
  //
  // Mark, from a 46 km orbit: "there are odd white crest shapes when I zoom out".
  // He is looking at these two domes from ABOVE. A BackSide hemisphere seen from
  // outside culls its near face and draws the inside of its far rim, which is
  // exactly a white crescent hanging in the sky -- two domes, two crests. The
  // comment directly above states the assumption ("from underneath") and every
  // shot that judged this sky was taken at city level, so the assumption was
  // never once tested against the view that breaks it.
  //
  // A cloud deck is a real altitude, so the honest fix is to treat it as one:
  // full strength below the deck, gone above it. Each deck therefore needs its
  // OWN material -- sharing one meant the low deck could not fade out while the
  // high deck was still overhead, and you would have crossed 2.6 km and had the
  // whole sky blink at once.
  const cloudGeo = new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const lowMat = newCloudMat();
  const highMat = newCloudMat();
  const cloudsLow = new THREE.Mesh(cloudGeo, lowMat);
  cloudsLow.scale.set(CLOUD_LOW * 8, CLOUD_LOW, CLOUD_LOW * 8);
  cloudsLow.frustumCulled = false;
  const cloudsHigh = new THREE.Mesh(cloudGeo, highMat);
  cloudsHigh.scale.set(CLOUD_HIGH * 9, CLOUD_HIGH, CLOUD_HIGH * 9);
  cloudsHigh.rotation.y = 1.1;
  cloudsHigh.frustumCulled = false;
  group.add(cloudsLow, cloudsHigh);

  /**
   * How much of a deck at `deckY` is still legible from altitude `camY`.
   *
   * 1 well below the deck, 0 well above it, with the crossover spread over the
   * deck's own height so it is a climb through weather rather than a switch.
   * Exported (as `deckVisibility` below) so a test can assert the curve instead
   * of asserting that a material exists.
   */
  const deckVisibility = (camY, deckY) => {
    if (!Number.isFinite(camY)) return 1;      // no camera given: behave as before
    const fadeFrom = deckY * 0.75;             // starts thinning just under the deck
    const fadeTo = deckY * 1.45;               // fully gone above it
    if (camY <= fadeFrom) return 1;
    if (camY >= fadeTo) return 0;
    return 1 - (camY - fadeFrom) / (fadeTo - fadeFrom);
  };

  const sunDir = new THREE.Vector3();

  return {
    group, stars, moon, cloudsLow, cloudsHigh, deckVisibility,
    CLOUD_LOW, CLOUD_HIGH,

    /**
     * @param sun      normalised sun direction (the same vector the sky shader gets)
     * @param nightAmt 0 in full day, 1 at full night
     * @param dt       seconds since the last frame
     * @param centre   where the camera is looking, so the dome travels with it
     * @param camY     camera altitude, so a deck you have climbed above stops
     *                 being drawn as a crescent above the horizon
     */
    update(sun, nightAmt, dt, centre, camY) {
      // The whole sky follows the view. In a 26 km world a dome fixed at the
      // origin is behind you by the time you reach the far headland.
      if (centre) group.position.set(centre.x, 0, centre.z);

      starMat.opacity = Math.max(0, (nightAmt - 0.25) * 1.33);
      stars.visible = starMat.opacity > 0.01;
      stars.rotation.y += (dt || 0) * 0.0009;

      if (sun) {
        sunDir.copy(sun).normalize();
        moon.position.set(
          -sunDir.x * MOON_DISTANCE,
          Math.max(2000, -sunDir.y * MOON_DISTANCE),
          -sunDir.z * MOON_DISTANCE,
        );
      }
      moonMat.opacity = Math.max(0, (nightAmt - 0.15) * 1.2);
      moon.visible = moonMat.opacity > 0.01;

      // Clouds thin out at night rather than vanishing: an empty night sky over
      // a lit city reads as a missing layer, not as clear weather.
      const base = 0.78 - nightAmt * 0.42;
      lowMat.opacity = base * deckVisibility(camY, CLOUD_LOW);
      highMat.opacity = base * deckVisibility(camY, CLOUD_HIGH);
      // visible=false, not merely opacity 0: a transparent BackSide dome at zero
      // opacity is still sorted, still submitted, and still a draw call.
      cloudsLow.visible = lowMat.opacity > 0.01;
      cloudsHigh.visible = highMat.opacity > 0.01;
      cloudsLow.rotation.y += (dt || 0) * 0.0022;
      cloudsHigh.rotation.y -= (dt || 0) * 0.0013;

      const warm = 1 - nightAmt;
      lowMat.color.setRGB(0.62 + 0.38 * warm, 0.64 + 0.34 * warm, 0.70 + 0.30 * warm);
      highMat.color.copy(lowMat.color);
    },

    dispose() {
      group.removeFromParent();
      starGeo.dispose(); starMat.dispose();
      moon.geometry.dispose(); moonMat.dispose();
      cloudGeo.dispose(); lowMat.dispose(); highMat.dispose(); cloudTex.dispose();
    },
  };
}
