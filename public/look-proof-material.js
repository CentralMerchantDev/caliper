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
      uLightDir: { value: new THREE.Vector3(0.45, 0.78, 0.35).normalize() },
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
    },
    vertexShader: /* glsl */ `
      in float layerIndex;
      in float groundDecal;
      out vec3 vNormal;
      out vec3 vWorldPos;
      out vec2 vUv;
      out float vLayer;
      out float vGroundDecal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vUv = uv;
        vLayer = layerIndex;
        vGroundDecal = groundDecal;
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
      in vec3 vNormal;
      in vec3 vWorldPos;
      in vec2 vUv;
      in float vLayer;
      in float vGroundDecal;
      out vec4 fragColor;

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

        vec3 lit = albedo * (ambient + lightColor * lambert);

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

        fragColor = vec4(lit, 1.0);
      }
    `,
  });
  return material;
}
