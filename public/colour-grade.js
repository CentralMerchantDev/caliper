/**
 * The colour grade -- ONE copy, because there were two and only one was used.
 *
 * Named colour-grade.js, not grade.js. grade.js already exists and is about
 * ROAD grading -- engineered built surfaces -- and four files import it. It was
 * briefly overwritten by this one, which is a good argument for reading a
 * directory before naming a file in it.
 *
 * Mark, looking at the deployed page: "it's still really hazy... it's like
 * you're in a foggy atmosphere. No crispness or cleanness or colour, it's really
 * bland." And then, correctly, after the time-of-day theory failed: "I don't
 * think that is it, I think it is the camera settings, as it seems like a blur
 * effect."
 *
 * It was neither fog nor blur. It was this pass, and its absence.
 *
 * city.html ran it as the last step of its composer. index.html -- the actual
 * application -- has a composer too, carrying a single bloom pass at strength
 * 0.02, and no grade at all. So the page a visitor opens rendered with 30% less
 * saturation, no contrast curve, no highlight roll-off and no warm/cool
 * separation than the one every screenshot came from.
 *
 * AND THAT IS THE PART WORTH RECORDING. scripts/shoot.mjs renders city.html.
 * Every image used to judge how this world looks came through this grade, and
 * the product never did. The measuring instrument was flattering the thing it
 * measured, and it went unnoticed because both pictures were of the same city.
 *
 * So the grade lives in one file now and both pages import it. Two copies of a
 * look is how a look drifts; one copy cannot.
 */

/**
 * @param {(name: string, dflt: number) => number} [num]
 *   Optional URL-knob reader, so city.html keeps its ?sat= / ?con= / ?warm=
 *   overrides for tuning. Without it the tuned defaults are used, which is what
 *   the application wants: the values below are the ones that were arrived at
 *   against this scene, not placeholders.
 */
export function makeGradeShader(num) {
  const knob = typeof num === "function" ? num : (_n, d) => d;
  return {
    uniforms: {
      tDiffuse: { value: null },
      saturation: { value: knob("sat", 1.30) },
      contrast: { value: knob("con", 1.13) },
      warmth: { value: knob("warm", 0.030) },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float saturation, contrast, warmth;
      varying vec2 vUv;
      void main(){
        vec4 t = texture2D(tDiffuse, vUv);
        vec3 c = t.rgb;
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(vec3(l), c, saturation);
        // S-curve about mid grey, so shadows deepen and highlights stay
        c = clamp((c - 0.5) * contrast + 0.5, 0.0, 1.0);
        c = c * c * (3.0 - 2.0 * c) * 0.18 + c * 0.82;
        // HIGHLIGHT ROLL-OFF. The contrast curve pushes the sky and the specular
        // glint on the water straight to white, and a blown horizon is the first
        // thing that reads as "render" rather than "place". Everything above 0.86
        // is compressed rather than clipped.
        //
        // Measured, because the comment here used to say "into the last 0.14" and
        // it is the last 0.058: 0.86 stays 0.860, 0.90 becomes 0.880, 0.95 becomes
        // 0.901, and 1.0 becomes 0.918. The consequence is real and worth knowing
        // -- nothing this application renders reaches pure white.
        vec3 hi = step(vec3(0.86), c);
        c = mix(c, 0.86 + (1.0 - exp(-(c - 0.86) * 4.0)) * 0.135, hi);
        // warm the light, cool the dark: separates sunlit from shaded faces
        c.r += warmth * l;  c.b += warmth * (1.0 - l);
        gl_FragColor = vec4(clamp(c, 0.0, 1.0), t.a);
      }`,
  };
}
