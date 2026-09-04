// =============================================================================
// CALIPER — THE FORGE
//
// A player says "give that boat pink polka dots and an alligator at the wheel."
// A model writes the CODE that builds it. This file is what decides whether
// that code is allowed near the world.
//
// WHY CODE AND NOT A FORM
//
// There is already a safe path: a closed vocabulary of ops where a new object
// is described as a list of boxes and spheres with hand-computed coordinates.
// It cannot be escaped from, which is its virtue, and it has two costs that
// together defeat the point of the project:
//
//   IT IS NOT CODING. The agent fills in a schema. A visitor who looks closely
//   sees that the "coding agent" never wrote code, and the whole claim goes
//   with it.
//
//   IT FIGHTS THE MODEL. Thirty polka dots is thirty JSON objects and two
//   hundred hand-computed numbers, spatially reasoned blind, with 22
//   validation guardrails where one violation rejects the whole edit
//   atomically. As code it is a three-line loop. The schema forces the model
//   into its weakest modality and then charges for the repair rounds.
//
// So the artefact here is source: a function that returns geometry. That is not
// a new contract -- it is the one `buildings.js` already uses. Every model in
// the asset lane is `createGeometry: () => BufferGeometry`. A generated model
// is the same shape, which means the checks that already verify 480 hand-built
// variants verify a generated one without being changed.
//
// WHAT THIS FILE IS FOR
//
// Nothing here trusts the code. `verifyModelSource` runs it and MEASURES what
// came back, because the whole thesis is that a claim is worth having only when
// something checked it. A model that says it built a boat and returns nothing,
// or returns something twice the size of its plot, or takes a second to build,
// is refused with the number that refused it.
//
// WHAT IT DELIBERATELY DOES NOT DO
//
// It does not evaluate anything itself. The `evaluate` function is injected by
// the caller: a Dynamic Worker isolate in production, a local one in tests.
// This module never decides where untrusted code runs -- it only decides
// whether what came back is acceptable, which is a separate question and the
// one it can answer honestly.
// =============================================================================

/**
 * What a generated model must satisfy.
 *
 * Every number is here rather than inline so a caller can widen them for a
 * paying player and tighten them for a public demo WITHOUT touching the checks.
 * That is the guardrail-as-a-dial the whole design depends on: the limits move,
 * the verification does not.
 */
export const FORGE_LIMITS = Object.freeze({
  /** Longest the source may be. A model that needs more than this is not
   *  building one object, and the cost of reviewing it stops being bounded. */
  MAX_SOURCE_CHARS: 20000,
  /** LOD0 triangles for a single object. The whole 20,472-building city is
   *  1.45 M triangles across 480 variants; one player-made object costing more
   *  than a thousandth of the city is not a detail, it is a scene. */
  MAX_TRIANGLES: 4000,
  /** Longest a build may take. A generated builder runs when the world builds,
   *  so a slow one is a frame drop the player blames on the game. */
  MAX_BUILD_MS: 250,
  /** How far past its declared footprint the geometry may reach. Chimneys and
   *  door canopies legitimately project a little; a boat twice its plot does
   *  not. Same 0.6 m tolerance the asset-lane check already uses, so the two
   *  cannot disagree. */
  FOOTPRINT_TOLERANCE_M: 0.6,
});

/**
 * Things a generated builder may never mention.
 *
 * NOT A SECURITY BOUNDARY, AND IT MUST NOT BE MISTAKEN FOR ONE. The real
 * boundary is the isolate the code runs in and the AST scanners in
 * src/worldEdit.ts, which are tested against a corpus of dozens of evasions.
 * This is a fast, cheap, obviously-incomplete first pass whose only job is to
 * refuse the boring cases before paying to run them.
 *
 * Saying that plainly matters: a denylist that is described as protection is
 * worse than no denylist, because it invites someone to rely on it.
 */
export const FORBIDDEN_TOKENS = Object.freeze([
  "document", "window", "globalThis", "self", "frames",
  "fetch", "XMLHttpRequest", "WebSocket", "importScripts",
  "eval", "Function(", "require(", "import(",
  "localStorage", "sessionStorage", "indexedDB",
  "process", "child_process",
]);

/** A cheap pre-scan. Returns the first forbidden token, or null. */
export function scanSource(source) {
  if (typeof source !== "string") return "the model source is not a string";
  if (!source.trim()) return "the model source is empty";
  if (source.length > FORGE_LIMITS.MAX_SOURCE_CHARS) {
    return `the model source is ${source.length} characters, over the ${FORGE_LIMITS.MAX_SOURCE_CHARS} limit`;
  }
  for (const token of FORBIDDEN_TOKENS) {
    if (source.includes(token)) return `the model source mentions "${token}", which a geometry builder has no use for`;
  }
  return null;
}

/**
 * Verify a generated model builder.
 *
 * @param source    the builder's source: a function body returning geometry
 * @param declared  { w, d } -- the footprint the object claims, in metres
 * @param evaluate  (source) => builder. Injected. In production this is a
 *                  Dynamic Worker isolate; in tests, a local evaluator. This
 *                  module never chooses where untrusted code runs.
 * @param THREE     the real three.js, so the geometry measured is the geometry
 *                  that will be drawn rather than a stand-in for it.
 *
 * Returns a verdict that is ALWAYS explicit about which check refused it and
 * with what number. "It did not work" is not an answer a repair loop can use.
 */
export function verifyModelSource(source, declared, evaluate, THREE) {
  const started = Date.now();
  const fail = (stage, reason, extra = {}) => ({ ok: false, stage, reason, ...extra });

  const scanned = scanSource(source);
  if (scanned) return fail("scan", scanned);

  if (!declared || !(declared.w > 0) || !(declared.d > 0)) {
    return fail("declaration", "a model must declare a footprint with a real width and depth");
  }

  let builder;
  try {
    builder = evaluate(source);
  } catch (e) {
    return fail("compile", `the source did not compile: ${e && e.message ? e.message : String(e)}`);
  }
  if (typeof builder !== "function") {
    return fail("compile", `the source produced ${typeof builder}, not a function that builds geometry`);
  }

  let geometry;
  const buildStarted = Date.now();
  try {
    geometry = builder(THREE);
  } catch (e) {
    return fail("build", `the builder threw: ${e && e.message ? e.message : String(e)}`);
  }
  const buildMs = Date.now() - buildStarted;

  // IT HAS TO HAVE BUILT SOMETHING. A builder returning null, or an object
  // that is not geometry, is the most likely shape of a wrong answer and the
  // easiest to mistake for an empty-but-valid model.
  if (!geometry || !geometry.attributes || !geometry.attributes.position) {
    return fail("build", "the builder returned no geometry");
  }
  const vertices = geometry.attributes.position.count;
  if (vertices === 0) return fail("build", "the builder returned geometry with no vertices");

  const triangles = (geometry.index ? geometry.index.count : vertices) / 3;
  if (triangles > FORGE_LIMITS.MAX_TRIANGLES) {
    return fail("budget", `${Math.round(triangles)} triangles, over the ${FORGE_LIMITS.MAX_TRIANGLES} limit`, { triangles });
  }
  if (buildMs > FORGE_LIMITS.MAX_BUILD_MS) {
    return fail("budget", `took ${buildMs} ms to build, over the ${FORGE_LIMITS.MAX_BUILD_MS} ms limit`, { buildMs });
  }

  // DOES IT FIT WHAT IT SAYS IT IS? Every placement check downstream reads the
  // DECLARATION, so geometry larger than its declaration is a thing that
  // reserves one piece of ground and occupies another. This is the same check,
  // with the same tolerance, that found bld-tower drawing 11.81 m past its own
  // declared depth.
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  const drawnW = bb.max.x - bb.min.x;
  const drawnD = bb.max.z - bb.min.z;
  const tol = FORGE_LIMITS.FOOTPRINT_TOLERANCE_M;
  if (drawnW > declared.w + tol || drawnD > declared.d + tol) {
    return fail(
      "footprint",
      `declares ${declared.w}x${declared.d} m and draws ${drawnW.toFixed(1)}x${drawnD.toFixed(1)} m`,
      { drawn: { w: drawnW, d: drawnD } },
    );
  }

  // IT MUST BUILD THE SAME THING TWICE. A builder reading Math.random, or the
  // clock, produces a world that is different on every reload -- so the thing
  // that was reviewed and approved is not the thing the player gets, and no
  // screenshot of it means anything.
  let second;
  try {
    second = builder(THREE);
  } catch (e) {
    return fail("determinism", `the builder threw on its second call: ${e && e.message ? e.message : String(e)}`);
  }
  const secondCount = second && second.attributes && second.attributes.position
    ? second.attributes.position.count
    : -1;
  if (secondCount !== vertices) {
    return fail("determinism", `built ${vertices} vertices then ${secondCount} -- it is not deterministic`);
  }
  second.dispose && second.dispose();

  return {
    ok: true,
    stage: null,
    reason: null,
    measured: {
      vertices,
      triangles,
      buildMs,
      drawn: { w: drawnW, d: drawnD },
      declared: { w: declared.w, d: declared.d },
      totalMs: Date.now() - started,
    },
    geometry,
  };
}

/**
 * A one-line summary a player can read, and a repair loop can act on.
 *
 * The stage matters as much as the reason: "footprint" tells the model to
 * shrink what it built, "budget" tells it to simplify, "compile" tells it to
 * fix syntax. A single undifferentiated failure string makes every repair a
 * guess, which is the difference between a loop that converges and one that
 * wanders.
 */
export function describeVerdict(verdict) {
  if (!verdict) return "no verdict";
  if (verdict.ok) {
    const m = verdict.measured;
    return `built ${Math.round(m.triangles)} triangles in ${m.buildMs} ms, ` +
      `${m.drawn.w.toFixed(1)}x${m.drawn.d.toFixed(1)} m inside a declared ${m.declared.w}x${m.declared.d} m`;
  }
  return `refused at ${verdict.stage}: ${verdict.reason}`;
}
