// THE SHARED MATERIAL — one DataArrayTexture, one shader, every pack's own
// albedo kept intact. C1.6 corrected 2026-09-14: do not remap UVs onto a
// palette atlas (that destroys road markings, window panes, signage); load
// every pack's own texture as a layer of one array texture, select the
// layer with a per-vertex attribute, and replace only the LIGHTING
// EQUATION. docs/briefs/BLD-2026-09-14-look-proof.md checklist 4.1/4.2.
//
// Mechanisms are gated behind boolean uniforms so each one lands as its own
// commit with a real, additive diff to this file, not a flag flip on code
// that was already there.
import * as THREE from "three";

// Shared with look-proof-scene.html's own shadow-map light camera -- one
// source of truth for the light direction, so the shadow the ground
// receives always agrees with the shading that already reads this same
// direction. Points TOWARD the light (surface-to-light convention, N.L).
export const LIGHT_DIR = new THREE.Vector3(0.45, 0.78, 0.35).normalize();

export function createLookProofMaterial(arrayTexture) {
  const material = new THREE.ShaderMaterial({
    // sampler2DArray and texture(sampler2DArray, vec3) do not exist in
    // GLSL ES 1.00 (WebGL1) -- both require GLSL ES 3.00, which three.js
    // only emits when glslVersion is explicitly set. Without this the
    // shader fails to compile and the mesh renders as nothing, silently
    // (found the hard way: draw calls: 1, triangles: 1270, zero console
    // errors, a blank white canvas -- 'green but wrong').
    glslVersion: THREE.GLSL3,
    uniforms: {
      uArrayTex: { value: arrayTexture },
      uLightDir: { value: LIGHT_DIR.clone() },
      uLightColor: { value: new THREE.Color(1.0, 0.96, 0.88) },
      uAmbientColor: { value: new THREE.Color(0.28, 0.30, 0.34) },
      // Mechanism toggles, each false until its own commit turns it on.
      // 4.2, mechanism 1 of 4 (R1): Half Lambert, SQUARED -- turned on here.
      uHalfLambertSquared: { value: true },
      // 4.2, mechanism 2 of 4 (R1): warm->cool terminator -- turned on here.
      uWarmCoolTerminator: { value: true },
      // 4.2, mechanism 3 of 4 (R1): rim separation -- turned on here.
      uRimSeparation: { value: true },
      // 4.2, mechanism 4 of 4 (R1): contact darkening -- turned on here.
      uContactDarkening: { value: true },
      // The fifth mechanism, sourced separately from R1 -- turned on here.
      uValueSplit: { value: true },
      // 4.3 -- the one join, tier 2 (a ground decal sized to the
      // footprint). Turned on here, its own commit.
      uJoinDecal: { value: true },
      // L11 -- cast shadows, a sixth mechanism, not one of R1's own four
      // (R1 lists exactly four; this is the gap the look-proof verdict
      // named: nothing in 01-07 throws a shadow onto anything). Turned on
      // here, its own commit. uShadowMap/uLightViewProjectionMatrix are
      // filled in per-frame by look-proof-scene.html's own shadow pass,
      // not at material-construction time -- the light camera's matrix
      // is not known until the scene's real bounding box is.
      uCastShadows: { value: true },
      uShadowMap: { value: null },
      uLightViewProjectionMatrix: { value: new THREE.Matrix4() },
      // N1b -- "a ground that reads as continuing past the frame rather
      // than stopping at a visible edge" (docs/briefs/BLD-2026-09-15.md).
      // THREE's own built-in fog (material.fog = true) only auto-injects
      // into materials that include its standard fog_fragment chunk; this
      // ShaderMaterial has never opted into that system (C1.6: "replace
      // only the lighting equation"), so fog is implemented directly here
      // instead -- a manual distance fade toward the sky's own horizon
      // colour, not three.js's built-in mechanism.
      //
      // Retuned twice, both times by measuring the actual render, not by
      // guessing: (45,110) left the ground's hard edge clearly visible;
      // (20,65) hid the edge but fogged the buildings themselves out too,
      // because at HERO_MODE's camera the buildings (~40-90 units out) and
      // the THEN-current ground's own far edge (~78-112 units out)
      // occupied overlapping distance bands -- no single linear range
      // could tell them apart. Fixed the actual cause instead of fog
      // alone: look-proof-scene.html's own N1b comment adds a much larger
      // far-ground plane, which moves the ground's real edge from ~110
      // units out to ~280+. uFogNear now starts just past every building
      // in HERO_MODE (~90) so the subject stays clear; uFogFar ends within
      // the enlarged ground, not at its edge, so what actually disappears
      // into the sky colour is fog fading out ground that is still there,
      // not a visible boundary.
      uFogColor: { value: new THREE.Color(0xf2ddb8) },
      uFogNear: { value: 90 },
      uFogFar: { value: 230 },
    },
    vertexShader: /* glsl */ `
      in float layerIndex;
      in float groundDecal;
      uniform mat4 uLightViewProjectionMatrix;
      out vec3 vNormal;
      out vec3 vWorldPos;
      out vec2 vUv;
      out float vLayer;
      out float vGroundDecal;
      out vec4 vShadowCoord;
      void main() {
        // World-space normal, NOT three.js's own built-in normalMatrix
        // (equals getNormalMatrix(modelViewMatrix), VIEW space). Found by
        // a blind audit: uLightDir, cameraPosition and N.y are all read
        // as world-space quantities everywhere below, so a view-space
        // normal silently rotates the effective lighting with the camera
        // on every frame -- invisible in a single still render (each shot
        // is one fixed camera, so the mismatch reads as some light
        // direction, just not the one LIGHT_DIR actually names) and never
        // caught without a second, independent check of the math. This
        // mesh's own modelMatrix is always identity (every real transform
        // is baked into vertex data by fitToFootprint before merging), so
        // mat3(modelMatrix) is identity and this is exactly equivalent to
        // using the raw normal attribute directly -- written this way so
        // it stays correct if a future scene ever gives this mesh a real
        // transform.
        vNormal = normalize(mat3(modelMatrix) * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vUv = uv;
        vLayer = layerIndex;
        vGroundDecal = groundDecal;
        vShadowCoord = uLightViewProjectionMatrix * worldPos;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      precision highp sampler2DArray;
      uniform sampler2DArray uArrayTex;
      uniform vec3 uLightDir;
      uniform vec3 uLightColor;
      uniform vec3 uAmbientColor;
      uniform bool uHalfLambertSquared;
      uniform bool uWarmCoolTerminator;
      uniform bool uRimSeparation;
      uniform bool uContactDarkening;
      uniform bool uValueSplit;
      uniform bool uJoinDecal;
      uniform bool uCastShadows;
      uniform sampler2D uShadowMap;
      uniform vec3 uFogColor;
      uniform float uFogNear;
      uniform float uFogFar;
      in vec3 vNormal;
      in vec3 vWorldPos;
      in vec2 vUv;
      in float vLayer;
      in float vGroundDecal;
      in vec4 vShadowCoord;
      out vec4 fragColor;

      // A small, self-contained shadow-map lookup -- not three.js's own
      // built-in lights/shadow chunk system, which assumes a material
      // built around its standard light-loop structure this ShaderMaterial
      // deliberately does not use (C1.6: "replace only the lighting
      // equation"). Percentage-closer filtering over a 3x3 kernel, a
      // depth bias tuned against this scene's own shadow-map texel size to
      // avoid acne without letting shadows detach from their casters.
      float sampleShadow(vec4 shadowCoord) {
        vec3 proj = shadowCoord.xyz / shadowCoord.w;
        proj = proj * 0.5 + 0.5;
        if (proj.x < 0.0 || proj.x > 1.0 || proj.y < 0.0 || proj.y > 1.0 || proj.z > 1.0) return 1.0;
        float bias = 0.0015;
        float shadow = 0.0;
        vec2 texel = 1.0 / vec2(textureSize(uShadowMap, 0));
        for (int x = -1; x <= 1; x++) {
          for (int y = -1; y <= 1; y++) {
            float depth = texture(uShadowMap, proj.xy + vec2(float(x), float(y)) * texel).r;
            shadow += (proj.z - bias > depth) ? 0.4 : 1.0;
          }
        }
        return shadow / 9.0;
      }

      void main() {
        vec3 albedo = texture(uArrayTex, vec3(vUv, vLayer)).rgb;
        vec3 N = normalize(vNormal);
        float NdotL = dot(N, uLightDir);

        float lambert;
        if (uHalfLambertSquared) {
          // R1, corrected 2026-09-14: scale by 0.5, bias by 0.5, THEN
          // SQUARE -- (0.5*(N.L)+0.5)^2, not the un-squared term this
          // document's own text says the paper's slides state explicitly.
          float half_ = 0.5 * NdotL + 0.5;
          lambert = half_ * half_;
        } else {
          lambert = max(NdotL, 0.0);
        }

        vec3 lightColor = uLightColor;
        vec3 ambient = uAmbientColor;
        if (uWarmCoolTerminator) {
          // Shadows shift warm->cool, never to black; saturation rises at
          // the terminator. Drive both from the SAME lambert term so the
          // shift and the lit colour agree on where the terminator is.
          vec3 cool = vec3(0.42, 0.52, 0.68);
          vec3 warmLit = uLightColor * vec3(1.06, 1.0, 0.9);
          float terminator = 1.0 - smoothstep(0.0, 0.55, lambert);
          ambient = mix(uAmbientColor, cool, terminator * 0.85);
          lightColor = mix(warmLit, uLightColor, smoothstep(0.15, 0.6, lambert));
        }

        // Cast shadows reduce DIRECT light only, never ambient -- a
        // fragment in shadow still reads the sky/bounce term, consistent
        // with the warm-cool terminator's own "never to black" rule
        // rather than fighting it.
        float shadowFactor = uCastShadows ? sampleShadow(vShadowCoord) : 1.0;
        vec3 lit = albedo * (ambient + lightColor * lambert * shadowFactor);

        if (uRimSeparation) {
          // Rim HIGHLIGHTS, not dark outlines -- a Fresnel-masked lobe,
          // modulated by N.up so it reads strongest on vertical faces
          // catching sky light, not on roofs already lit from above.
          vec3 V = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
          float upMask = clamp(1.0 - abs(N.y), 0.0, 1.0);
          vec3 rimColor = vec3(0.75, 0.85, 1.0);
          lit += rimColor * fresnel * upMask * 0.35;
        }

        if (uContactDarkening) {
          // Ambient-bounce approximation: darken toward the ground plane.
          // Cheap stand-in for baked AO -- no second geometry pass, just
          // world-space height falling off over ~1.2 m, R8's "critical to
          // truly grounding" objects.
          float heightFalloff = clamp(vWorldPos.y / 1.2, 0.0, 1.0);
          float groundDarken = mix(0.45, 1.0, heightFalloff);
          lit *= groundDarken;
        }

        if (uValueSplit) {
          // A value split between horizontal and vertical surfaces so
          // walls do not merge into the floor -- sourced separately from
          // R1's own four, per the brief's fifth mechanism.
          float horizontalness = clamp(N.y, 0.0, 1.0);
          lit *= mix(1.0, 1.12, horizontalness);
        }

        if (uJoinDecal) {
          // R8, tier 2: "cover the intersection" with a ground decal sized
          // to the footprint, baked per-vertex at build time
          // (addGroundDecalAttribute in look-proof-scene.html). vGroundDecal
          // is 0 everywhere except the ring immediately around a building's
          // own base, where it rises to 1 at the wall and falls off over
          // DECAL_RADIUS -- escalated past tier 1 (uContactDarkening, which
          // only darkens each piece's OWN low vertices, never the ground)
          // because tier 1 alone still read as the building resting on top
          // of the ground rather than meeting it, confirmed by looking at
          // the actual render, not assumed.
          lit *= mix(1.0, 0.5, vGroundDecal);
        }

        // N1b -- fade toward the sky's own horizon colour with distance,
        // so the ground's real edge (still a finite plane -- nothing in
        // WebGL is actually infinite) is hidden inside the fog before the
        // camera ever reaches it, rather than ending abruptly in frame.
        float camDist = length(vWorldPos - cameraPosition);
        float fogFactor = clamp((camDist - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
        lit = mix(lit, uFogColor, fogFactor);

        fragColor = vec4(lit, 1.0);
      }
    `,
  });
  return material;
}
