// FOUNDATION-2 (the "emit the change, not the file" brief): implement and
// fix used to ask a model to regenerate the ENTIRE ~16KB source for every
// change, even a one-line placements append -- measured at 79-143s for
// implement and never completing within 300s for fix. The registry +
// placement list (FOUNDATION.md item 1) already expresses most real
// requests as data; this file is what lets implement/fix actually SAY
// that instead of paying full-file-rewrite cost for it every time.
//
// A WorldEdit is a small, closed vocabulary of operations -- add a type,
// add a placement, override a placement, change a surface field -- each
// one exactly matching a request class FOUNDATION.md item 5 already proved
// the architecture supports. validateWorldEdit checks every op against the
// REAL current world (evaluated from the real source, never trusted from
// a model's claim) before anything is applied; a single invalid op rejects
// the WHOLE edit, atomically -- never a partial application. applyWorldEdit
// then splices the result into the original source text via the sentinel
// markers in simBaseline.ts, so chooseAction/applyAction/tick and every
// other line are byte-identical to before, never re-generated, never
// touched by a model at all for this path.

export interface RecipePart {
  shape: "box" | "cylinder" | "sphere" | "icosahedron";
  size: number[];
  position: number[];
  rotation?: number[];
  scale?: number[];
  radius?: number;
  segments?: number | number[];
  color: string;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  emissiveAnimated?: boolean;
  transparent?: boolean;
  opacity?: number;
  castShadow?: boolean;
}

export interface ObjectTypeDefinition {
  material: string;
  footprint: { w: number; d: number };
  shadow?: { w: number; d: number };
  local?: { x: number; y: number } | null;
  station: { action: string; label: string } | null;
  emitsLight?: boolean;
  light?: { color: string; distance: number; decay: number; baseIntensity: number; isStreetLamp?: boolean; position: number[] };
  recipe: RecipePart[];
}

export interface Placement {
  id: string;
  type: string;
  location: string;
  plot?: { x: number; y: number };
  overrides?: { color?: string };
}

export type WorldEditOp =
  | { op: "addObjectType"; key: string; definition: ObjectTypeDefinition }
  | { op: "addPlacement"; placement: Placement }
  | { op: "overridePlacement"; placementId: string; overrides: { color?: string; plot?: { x: number; y: number } } }
  | { op: "setSurfaceField"; surfaceKey: string; field: "material" | "color"; value: string };

export interface WorldEdit {
  ops: WorldEditOp[];
}

export interface LiveWorld {
  buildings: { id: string; type: string; label: string; plot: { x: number; y: number } }[];
  placements: Placement[];
  objectTypes: Record<string, ObjectTypeDefinition>;
  surfaces: Record<string, { material: string; color: string }>;
}

// The structured-output shape sent to the API's json_schema forcing --
// mirrors CRITERION_SCHEMA/GROUNDING_SCHEMA's own pattern in this project:
// closed vocabulary, no free-form "value" field, nothing a model can smuggle
// arbitrary code or fields through.
export const WORLD_EDIT_SCHEMA = {
  type: "object",
  properties: {
    ops: {
      type: "array",
      items: {
        type: "object",
        properties: {
          op: { type: "string", enum: ["addObjectType", "addPlacement", "overridePlacement", "setSurfaceField"] },
          key: { type: ["string", "null"], description: "addObjectType only -- the new type's registry key." },
          definitionJson: { type: ["string", "null"], description: "addObjectType only -- JSON-encoded ObjectTypeDefinition." },
          placementJson: { type: ["string", "null"], description: "addPlacement only -- JSON-encoded Placement." },
          placementId: { type: ["string", "null"], description: "overridePlacement only -- an existing placement's id." },
          overridesJson: { type: ["string", "null"], description: "overridePlacement only -- JSON-encoded { color?, plot?: {x,y} }. Also how you reposition an existing placement." },
          surfaceKey: { type: ["string", "null"], description: "setSurfaceField only." },
          // LAST.md item 1: enum combined with a nullable type array
          // (type: ["string","null"]) is rejected by Anthropic's
          // structured-output validator -- "Enum value 'material' does
          // not match declared type '['string','null']'" -- regardless of
          // what the enum contains. anyOf keeps the same "string, one of
          // these two values, or null" meaning without ever pairing enum
          // with a type array. This exact defect was found and fixed once
          // already in this build (a different schema); see
          // test/schemaAudit.test.ts for the guardrail that's supposed to
          // stop it recurring a third time.
          field: { anyOf: [{ type: "string", enum: ["material", "color"] }, { type: "null" }], description: "setSurfaceField only." },
          value: { type: ["string", "null"], description: "setSurfaceField only." },
        },
        required: ["op", "key", "definitionJson", "placementJson", "placementId", "overridesJson", "surfaceKey", "field", "value"],
        additionalProperties: false,
      },
    },
  },
  required: ["ops"],
  additionalProperties: false,
};

/** Raw wire shape (JSON-string-encoded sub-objects, same reason
 * claude.ts's plan criteria use argsJson: a JSON Schema can force an object
 * to be a syntactically valid string, never a semantically valid nested
 * object of unknown shape). Converts to the real WorldEditOp union,
 * throwing with a specific reason on any parse failure -- the caller
 * decides whether to retry, same validate-before-consume discipline as
 * parseCriteria. */
export function parseRawWorldEdit(raw: { ops: unknown[] }): WorldEdit {
  const ops: WorldEditOp[] = raw.ops.map((rawOp, i) => {
    const o = rawOp as Record<string, unknown>;
    if (typeof o.op !== "string") throw new Error(`op[${i}]: "op" is missing`);
    switch (o.op) {
      case "addObjectType": {
        if (typeof o.key !== "string" || !o.key) throw new Error(`op[${i}] addObjectType: "key" is missing`);
        if (typeof o.definitionJson !== "string") throw new Error(`op[${i}] addObjectType: "definitionJson" is missing`);
        let definition: ObjectTypeDefinition;
        try {
          definition = JSON.parse(o.definitionJson);
        } catch (e) {
          throw new Error(`op[${i}] addObjectType: definitionJson is not valid JSON (${String(e)})`);
        }
        return { op: "addObjectType", key: o.key, definition };
      }
      case "addPlacement": {
        if (typeof o.placementJson !== "string") throw new Error(`op[${i}] addPlacement: "placementJson" is missing`);
        let placement: Placement;
        try {
          placement = JSON.parse(o.placementJson);
        } catch (e) {
          throw new Error(`op[${i}] addPlacement: placementJson is not valid JSON (${String(e)})`);
        }
        return { op: "addPlacement", placement };
      }
      case "overridePlacement": {
        if (typeof o.placementId !== "string" || !o.placementId) throw new Error(`op[${i}] overridePlacement: "placementId" is missing`);
        if (typeof o.overridesJson !== "string") throw new Error(`op[${i}] overridePlacement: "overridesJson" is missing`);
        let overrides: { color?: string; plot?: { x: number; y: number } };
        try {
          overrides = JSON.parse(o.overridesJson);
        } catch (e) {
          throw new Error(`op[${i}] overridePlacement: overridesJson is not valid JSON (${String(e)})`);
        }
        return { op: "overridePlacement", placementId: o.placementId, overrides };
      }
      case "setSurfaceField": {
        if (typeof o.surfaceKey !== "string" || !o.surfaceKey) throw new Error(`op[${i}] setSurfaceField: "surfaceKey" is missing`);
        if (o.field !== "material" && o.field !== "color") throw new Error(`op[${i}] setSurfaceField: "field" must be "material" or "color"`);
        if (typeof o.value !== "string" || !o.value) throw new Error(`op[${i}] setSurfaceField: "value" is missing`);
        return { op: "setSurfaceField", surfaceKey: o.surfaceKey, field: o.field, value: o.value };
      }
      default:
        throw new Error(`op[${i}]: unknown op "${o.op}"`);
    }
  });
  return { ops };
}

import JSON5 from "json5";
import { parse } from "acorn";

const DATA_BLOCKS = ["BUILDINGS", "OBJECT_TYPES", "PLACEMENTS", "SURFACES"] as const;

function blockBounds(source: string, name: string): { contentStart: number; contentEnd: number } {
  const begin = `/*@DATA:${name}:BEGIN*/`;
  const end = `/*@DATA:${name}:END*/`;
  const beginIdx = source.indexOf(begin);
  const endIdx = source.indexOf(end);
  const duplicateBegin = beginIdx !== -1 && source.indexOf(begin, beginIdx + begin.length) !== -1;
  const duplicateEnd = endIdx !== -1 && source.indexOf(end, endIdx + end.length) !== -1;
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx || duplicateBegin || duplicateEnd) {
    throw new Error(`sentinel markers for ${name} not found in source -- cannot read or serialize world data`);
  }
  return { contentStart: beginIdx + begin.length, contentEnd: endIdx };
}

function readDataBlock(source: string, name: (typeof DATA_BLOCKS)[number]): unknown {
  const { contentStart, contentEnd } = blockBounds(source, name);
  try {
    return JSON5.parse(source.slice(contentStart, contentEnd));
  } catch (e) {
    throw new Error(`world data block ${name} is malformed: ${String((e as Error)?.message ?? e)}`);
  }
}

/** Deserializes only the four inert data blocks. It never executes source. */
export function readWorldData(source: string): LiveWorld {
  const world = {
    buildings: readDataBlock(source, "BUILDINGS") as LiveWorld["buildings"],
    objectTypes: readDataBlock(source, "OBJECT_TYPES") as LiveWorld["objectTypes"],
    placements: readDataBlock(source, "PLACEMENTS") as LiveWorld["placements"],
    surfaces: readDataBlock(source, "SURFACES") as LiveWorld["surfaces"],
  };
  const error = validateWorldDataShape(world);
  if (error) throw new Error(`world data is invalid: ${error}`);
  return world;
}

const KNOWN_SHAPES = new Set(["box", "cylinder", "sphere", "icosahedron"]);
const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;

function isNumberArray(v: unknown): v is number[] {
  return Array.isArray(v) && v.every((n) => typeof n === "number" && Number.isFinite(n));
}

/** Fail-closed: every field either matches the known shape exactly, or the
 * whole part is rejected. No "looks close enough" -- the renderer's own
 * geometry dispatch (world-render-3d.js's _geometryForPart, world-
 * render.js's SYMBOL_DRAWERS/generic fallback) reads these fields
 * directly; a malformed one reaches a live renderer, not just this
 * validator, if it slips through. */
function validateRecipePart(part: unknown, where: string): string | null {
  if (typeof part !== "object" || part === null) return `${where}: not an object`;
  const p = part as Record<string, unknown>;
  if (typeof p.shape !== "string" || !KNOWN_SHAPES.has(p.shape)) return `${where}: shape must be one of ${[...KNOWN_SHAPES].join(", ")}`;
  if (!isNumberArray(p.size) || p.size.length === 0) return `${where}: size must be a non-empty array of numbers`;

  // Strict shape-specific size arity and bounds checks
  for (let i = 0; i < p.size.length; i++) {
    const num = p.size[i];
    // Detail level (second arg of icosahedron) can be 0 or positive integer
    const isDetailArg = p.shape === "icosahedron" && i === 1;
    if (!Number.isFinite(num) || (isDetailArg ? num < 0 : num <= 0) || num > 60) {
      return `${where}: size numbers must be positive (or non-negative detail) and <= 60m`;
    }
  }
  if (p.shape === "box" && p.size.length !== 3) return `${where}: box size must be [w, h, d] (3 numbers)`;
  if (p.shape === "cylinder" && p.size.length !== 3) return `${where}: cylinder size must be [rTop, rBottom, height] (3 numbers)`;
  if (p.shape === "sphere" && p.size.length !== 1) return `${where}: sphere size must be [radius] (1 number)`;
  if (p.shape === "icosahedron" && p.size.length !== 2) return `${where}: icosahedron size must be [radius, detail] (2 numbers)`;

  if (!isNumberArray(p.position) || p.position.length !== 3) return `${where}: position must be [x,y,z]`;
  for (const pos of p.position) {
    if (!Number.isFinite(pos) || Math.abs(pos) > 100) return `${where}: position values must be finite and within [-100, 100]`;
  }

  if (typeof p.color !== "string" || !HEX_COLOR.test(p.color)) return `${where}: color must be a "#hex" string`;
  if (p.rotation !== undefined) {
    if (!isNumberArray(p.rotation) || p.rotation.length !== 3) return `${where}: rotation, if present, must be [x,y,z]`;
    for (const rot of p.rotation) {
      if (!Number.isFinite(rot) || Math.abs(rot) > 100) return `${where}: rotation values must be finite numbers`;
    }
  }
  if (p.scale !== undefined) {
    if (!isNumberArray(p.scale) || p.scale.length !== 3) return `${where}: scale, if present, must be [x,y,z]`;
    for (const sc of p.scale) {
      if (!Number.isFinite(sc) || sc <= 0 || sc > 20) return `${where}: scale values must be positive finite numbers <= 20`;
    }
  }
  if (p.radius !== undefined && (typeof p.radius !== "number" || !Number.isFinite(p.radius) || p.radius < 0 || p.radius > 20)) {
    return `${where}: radius, if present, must be a finite number between 0 and 20`;
  }
  if (p.segments !== undefined) {
    if (typeof p.segments === "number") {
      if (!Number.isInteger(p.segments) || p.segments < 3 || p.segments > 64) return `${where}: segments must be an integer between 3 and 64`;
    } else if (isNumberArray(p.segments)) {
      if (p.segments.length !== 2 || !p.segments.every(s => Number.isInteger(s) && s >= 3 && s <= 64)) return `${where}: segments array must be [int, int] between 3 and 64`;
    } else {
      return `${where}: segments, if present, must be a number or [number,number]`;
    }
  }
  if (p.roughness !== undefined && (typeof p.roughness !== "number" || !Number.isFinite(p.roughness) || p.roughness < 0 || p.roughness > 1)) {
    return `${where}: roughness, if present, must be a number in [0.0, 1.0]`;
  }
  if (p.metalness !== undefined && (typeof p.metalness !== "number" || !Number.isFinite(p.metalness) || p.metalness < 0 || p.metalness > 1)) {
    return `${where}: metalness, if present, must be a number in [0.0, 1.0]`;
  }
  if (p.emissive !== undefined && (typeof p.emissive !== "string" || !HEX_COLOR.test(p.emissive))) return `${where}: emissive, if present, must be a "#hex" string`;
  if (p.emissiveIntensity !== undefined && (typeof p.emissiveIntensity !== "number" || !Number.isFinite(p.emissiveIntensity) || p.emissiveIntensity < 0 || p.emissiveIntensity > 20)) {
    return `${where}: emissiveIntensity, if present, must be a finite number between 0 and 20`;
  }
  if (p.emissiveAnimated !== undefined && typeof p.emissiveAnimated !== "boolean") return `${where}: emissiveAnimated, if present, must be a boolean`;
  if (p.transparent !== undefined && typeof p.transparent !== "boolean") return `${where}: transparent, if present, must be a boolean`;
  if (p.opacity !== undefined && (typeof p.opacity !== "number" || !Number.isFinite(p.opacity) || p.opacity < 0 || p.opacity > 1)) {
    return `${where}: opacity, if present, must be a number in [0.0, 1.0]`;
  }
  if (p.castShadow !== undefined && typeof p.castShadow !== "boolean") return `${where}: castShadow, if present, must be a boolean`;
  const KNOWN_KEYS = new Set(["shape", "size", "position", "rotation", "scale", "radius", "segments", "color", "roughness", "metalness", "emissive", "emissiveIntensity", "emissiveAnimated", "transparent", "opacity", "castShadow"]);
  const smuggled = Object.keys(p).find((k) => !KNOWN_KEYS.has(k));
  if (smuggled) return `${where}: unknown field "${smuggled}" -- not part of the recipe-part shape`;
  return null;
}

const FORBIDDEN_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const VALID_STATION_ACTIONS = new Set(["idle", "eat", "sleep", "shower", "play", "call", "work"]);

function validateObjectTypeDefinition(def: unknown, where: string): string | null {
  if (typeof def !== "object" || def === null) return `${where}: not an object`;
  const d = def as Record<string, unknown>;
  const allowedKeys = new Set(["material", "footprint", "shadow", "local", "station", "emitsLight", "light", "recipe"]);
  const unknownKey = Object.keys(d).find((key) => !allowedKeys.has(key));
  if (unknownKey) return `${where}: unknown field "${unknownKey}"`;
  if (typeof d.material !== "string" || !d.material) return `${where}: material is required`;
  if (typeof d.footprint !== "object" || d.footprint === null || Object.keys(d.footprint).some((key) => key !== "w" && key !== "d") ||
      typeof (d.footprint as any).w !== "number" || !Number.isFinite((d.footprint as any).w) || (d.footprint as any).w <= 0 || (d.footprint as any).w > 30 ||
      typeof (d.footprint as any).d !== "number" || !Number.isFinite((d.footprint as any).d) || (d.footprint as any).d <= 0 || (d.footprint as any).d > 30) {
    return `${where}: footprint must be { w: number, d: number } with positive finite dimensions <= 30m`;
  }
  if (d.station !== null) {
    if (typeof d.station !== "object" || typeof (d.station as any)?.action !== "string" || typeof (d.station as any)?.label !== "string") {
      return `${where}: station must be null or { action: string, label: string }`;
    }
    const labelStr = (d.station as any).label.trim();
    if (!labelStr || labelStr.length > 60) {
      return `${where}: station.label must be non-empty and at most 60 characters`;
    }
    const actionStr = (d.station as any).action;
    if (!VALID_STATION_ACTIONS.has(actionStr)) {
      return `${where}: station.action "${actionStr}" is not a recognized simulation action (${[...VALID_STATION_ACTIONS].join(", ")})`;
    }
  }
  if (!Array.isArray(d.recipe) || d.recipe.length === 0 || d.recipe.length > 25) {
    return `${where}: recipe must be a non-empty array with at most 25 parts`;
  }
  // Verify recipe parts and compute actual local X/Z geometry envelope
  let minGeoX = Infinity, maxGeoX = -Infinity;
  let minGeoZ = Infinity, maxGeoZ = -Infinity;

  for (let i = 0; i < d.recipe.length; i++) {
    const part = d.recipe[i] as any;
    const err = validateRecipePart(part, `${where}.recipe[${i}]`);
    if (err) return err;

    // Calculate part local X/Z bounding extent
    const posX = part.position[0];
    const posZ = part.position[2];
    const scaleX = part.scale ? part.scale[0] : 1;
    const scaleZ = part.scale ? part.scale[2] : 1;

    let partHalfW = 0.5;
    let partHalfD = 0.5;

    if (part.shape === "box") {
      const hx = (part.size[0] * scaleX) / 2;
      const hy = (part.size[1] * (part.scale ? part.scale[1] : 1)) / 2;
      const hz = (part.size[2] * scaleZ) / 2;
      const rx = (part.rotation && typeof part.rotation[0] === "number") ? part.rotation[0] : 0;
      const ry = (part.rotation && typeof part.rotation[1] === "number") ? part.rotation[1] : 0;
      const rz = (part.rotation && typeof part.rotation[2] === "number") ? part.rotation[2] : 0;

      // Full 3D Euler XYZ rotation matrix transformation across all 8 corners
      const cx = Math.cos(rx), sx = Math.sin(rx);
      const cy = Math.cos(ry), sy = Math.sin(ry);
      const cz = Math.cos(rz), sz = Math.sin(rz);

      // Rotation matrix elements (Euler XYZ order)
      const m00 = cy * cz;
      const m01 = -cy * sz;
      const m02 = sy;
      const m20 = sx * sz - cx * cz * sy;
      const m21 = sx * cz + cx * sy * sz;
      const m22 = cx * cy;

      let maxCornerX = 0;
      let maxCornerZ = 0;
      for (const sx_ of [-1, 1]) {
        for (const sy_ of [-1, 1]) {
          for (const sz_ of [-1, 1]) {
            const x = sx_ * hx;
            const y = sy_ * hy;
            const z = sz_ * hz;
            const tx = m00 * x + m01 * y + m02 * z;
            const tz = m20 * x + m21 * y + m22 * z;
            maxCornerX = Math.max(maxCornerX, Math.abs(tx));
            maxCornerZ = Math.max(maxCornerZ, Math.abs(tz));
          }
        }
      }
      partHalfW = maxCornerX;
      partHalfD = maxCornerZ;
    } else if (part.shape === "cylinder") {
      // Cylinder size is [radiusTop, radiusBottom, height]
      const r = Math.max(part.size[0], part.size[1]) * Math.max(scaleX, scaleZ);
      const halfH = (part.size[2] * (part.scale ? part.scale[1] : 1)) / 2;
      const rx = (part.rotation && typeof part.rotation[0] === "number") ? part.rotation[0] : 0;
      const ry = (part.rotation && typeof part.rotation[1] === "number") ? part.rotation[1] : 0;
      const rz = (part.rotation && typeof part.rotation[2] === "number") ? part.rotation[2] : 0;

      // Full 3D rotation of cylinder central axis vector (0, 1, 0)
      const cx = Math.cos(rx), sx = Math.sin(rx);
      const cy = Math.cos(ry), sy = Math.sin(ry);
      const cz = Math.cos(rz), sz = Math.sin(rz);

      // Rotation matrix Euler XYZ
      const m01 = -cy * sz;
      const m21 = sx * cz + cx * sy * sz;

      // Axis components along world X and Z
      const ax = m01;
      const az = m21;

      // Planar projection of cylinder with axis vector (ax, ay, az) and radius r:
      // axial contribution: |ax| * halfH, radial disc projection: r * sqrt(1 - ax^2)
      const axialX = Math.abs(ax) * halfH;
      const radialX = r * Math.sqrt(Math.max(0, 1 - ax * ax));
      const axialZ = Math.abs(az) * halfH;
      const radialZ = r * Math.sqrt(Math.max(0, 1 - az * az));

      partHalfW = axialX + radialX;
      partHalfD = axialZ + radialZ;
    } else if (part.shape === "sphere" || part.shape === "icosahedron") {
      const r = part.size[0] * Math.max(scaleX, scaleZ);
      partHalfW = r;
      partHalfD = r;
    }

    minGeoX = Math.min(minGeoX, posX - partHalfW);
    maxGeoX = Math.max(maxGeoX, posX + partHalfW);
    minGeoZ = Math.min(minGeoZ, posZ - partHalfD);
    maxGeoZ = Math.max(maxGeoZ, posZ + partHalfD);
  }

  // Strict Footprint Containment Verification:
  // Declared footprint centered at origin [-w/2, w/2] and [-d/2, d/2] must strictly enclose all primitive parts
  const declaredW = (d.footprint as any).w;
  const declaredD = (d.footprint as any).d;
  const TOLERANCE = 0.08; // 8cm floating-point precision tolerance

  // Both the bounding box span and distance from center must fit within declared footprint
  const maxSpanX = Math.max(Math.abs(minGeoX), Math.abs(maxGeoX)) * 2;
  const maxSpanZ = Math.max(Math.abs(minGeoZ), Math.abs(maxGeoZ)) * 2;

  if (maxSpanX > (declaredW + TOLERANCE) || maxSpanZ > (declaredD + TOLERANCE)) {
    return `${where}: declared footprint (${declaredW.toFixed(1)}m x ${declaredD.toFixed(1)}m) does not enclose recipe geometry envelope (${maxSpanX.toFixed(1)}m x ${maxSpanZ.toFixed(1)}m) -- footprint must cover actual visual geometry`;
  }
  if (d.shadow !== undefined) {
    if (typeof d.shadow !== "object" || d.shadow === null || typeof (d.shadow as any).w !== "number" || typeof (d.shadow as any).d !== "number") {
      return `${where}: shadow, if present, must be { w: positive finite number, d: positive finite number }`;
    }
    const sw = (d.shadow as any).w;
    const sd = (d.shadow as any).d;
    if (!Number.isFinite(sw) || sw <= 0 || sw > 40 || !Number.isFinite(sd) || sd <= 0 || sd > 40) {
      return `${where}: shadow dimensions must be positive finite numbers <= 40m`;
    }
  }
  if (d.local !== undefined && d.local !== null) {
    if (typeof d.local !== "object" || typeof (d.local as any).x !== "number" || typeof (d.local as any).y !== "number") {
      return `${where}: local, if present, must be null or { x: number, y: number }`;
    }
    const lx = (d.local as any).x;
    const ly = (d.local as any).y;
    if (!Number.isFinite(lx) || lx < 0 || lx > 1 || !Number.isFinite(ly) || ly < 0 || ly > 1) {
      return `${where}: local coordinate fractions must be finite numbers in [0.0, 1.0]`;
    }
  }
  if (d.emitsLight !== undefined && typeof d.emitsLight !== "boolean") return `${where}: emitsLight, if present, must be a boolean`;
  if (d.light !== undefined) {
    const l = d.light as Record<string, unknown>;
    if (typeof l !== "object" || l === null || typeof l.color !== "string" || !HEX_COLOR.test(l.color) || typeof l.distance !== "number" || typeof l.decay !== "number" || typeof l.baseIntensity !== "number" || !isNumberArray(l.position) || l.position.length !== 3) {
      return `${where}: light, if present, must be { color: "#hex", distance: number, decay: number, baseIntensity: number, position: [x,y,z] }`;
    }
    if (!Number.isFinite(l.distance) || (l.distance as number) <= 0 || (l.distance as number) > 50) {
      return `${where}: light.distance must be a positive finite number <= 50m`;
    }
    if (!Number.isFinite(l.decay) || (l.decay as number) < 0 || (l.decay as number) > 10) {
      return `${where}: light.decay must be a non-negative finite number <= 10`;
    }
    if (!Number.isFinite(l.baseIntensity) || (l.baseIntensity as number) < 0 || (l.baseIntensity as number) > 20) {
      return `${where}: light.baseIntensity must be a non-negative finite number <= 20`;
    }
    for (const p of l.position as number[]) {
      if (!Number.isFinite(p) || Math.abs(p) > 20) return `${where}: light.position coordinates must be finite and within [-20, 20]`;
    }
  }
  return null;
}

const PARCEL_MIN = 0;
const PARCEL_MAX = 2;
const BUILDING_W = 8.5;
const BUILDING_D = 6.0;
const GRID_UNIT_X = 6.0;
const GRID_UNIT_Z = 4.5;
const BUILDING_TYPE_SCALE: Record<string, { w: number; d: number }> = {
  dwelling: { w: 1, d: 1 },
  shop: { w: 0.55, d: 0.7 },
  workshop: { w: 0.55, d: 0.7 },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, allowed: string[], where: string): string | null {
  const unknown = Object.keys(value).find((key) => !allowed.includes(key));
  return unknown ? `${where}: unknown field "${unknown}"` : null;
}

function validPlot(value: unknown): value is { x: number; y: number } {
  return isRecord(value) && Object.keys(value).every((key) => key === "x" || key === "y") &&
    typeof value.x === "number" && Number.isFinite(value.x) && typeof value.y === "number" && Number.isFinite(value.y);
}

function plotInParcel(plot: { x: number; y: number }): boolean {
  return plot.x >= PARCEL_MIN && plot.x <= PARCEL_MAX && plot.y >= PARCEL_MIN && plot.y <= PARCEL_MAX;
}

interface Rect { id: string; x: number; z: number; w: number; d: number }
function overlaps(a: Rect, b: Rect): boolean {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.z - b.z) < (a.d + b.d) / 2;
}

function validateOutdoorLayout(world: LiveWorld, placements = world.placements): string | null {
  const buildingRects: Rect[] = world.buildings.map((building) => {
    const scale = BUILDING_TYPE_SCALE[building.type];
    return { id: building.id, x: building.plot.x * GRID_UNIT_X, z: building.plot.y * GRID_UNIT_Z, w: scale.w * BUILDING_W, d: scale.d * BUILDING_D };
  });
  for (let i = 0; i < buildingRects.length; i++) {
    for (let j = i + 1; j < buildingRects.length; j++) {
      if (overlaps(buildingRects[i], buildingRects[j])) return `buildings "${buildingRects[i].id}" and "${buildingRects[j].id}" collide`;
    }
  }
  const outdoorRects: Rect[] = [];
  for (const placement of placements) {
    if (placement.location !== "outdoors") continue;
    if (!placement.plot || !plotInParcel(placement.plot)) return `placement "${placement.id}" is outside parcel bounds ${PARCEL_MIN}..${PARCEL_MAX}`;
    const footprint = world.objectTypes[placement.type]?.footprint;
    if (!footprint) return `placement "${placement.id}" has no valid type footprint`;
    const rect = { id: placement.id, x: placement.plot.x * GRID_UNIT_X, z: placement.plot.y * GRID_UNIT_Z, w: footprint.w, d: footprint.d };
    const building = buildingRects.find((candidate) => overlaps(rect, candidate));
    if (building) return `placement "${placement.id}" collides with building "${building.id}"`;
    const other = outdoorRects.find((candidate) => overlaps(rect, candidate));
    if (other) return `placements "${placement.id}" and "${other.id}" collide`;
    outdoorRects.push(rect);
  }
  return null;
}

function validateWorldDataShape(world: LiveWorld): string | null {
  if (!Array.isArray(world.buildings) || world.buildings.length === 0) return "BUILDINGS must be a non-empty array";
  if (!isRecord(world.objectTypes) || Object.keys(world.objectTypes).length === 0) return "OBJECT_TYPES must be a non-empty object";
  if (!Array.isArray(world.placements)) return "PLACEMENTS must be an array";
  if (!isRecord(world.surfaces) || Object.keys(world.surfaces).length === 0) return "SURFACES must be a non-empty object";

  const buildingIds = new Set<string>();
  for (let i = 0; i < world.buildings.length; i++) {
    const building = world.buildings[i] as unknown;
    if (!isRecord(building)) return `BUILDINGS[${i}] must be an object`;
    const extra = exactKeys(building, ["id", "type", "label", "plot"], `BUILDINGS[${i}]`);
    if (extra) return extra;
    if (typeof building.id !== "string" || !building.id) return `BUILDINGS[${i}].id is required`;
    if (buildingIds.has(building.id)) return `BUILDINGS has duplicate id "${building.id}"`;
    if (typeof building.type !== "string" || !BUILDING_TYPE_SCALE[building.type]) return `BUILDINGS[${i}].type is unknown`;
    if (typeof building.label !== "string" || !building.label) return `BUILDINGS[${i}].label is required`;
    if (!validPlot(building.plot) || !plotInParcel(building.plot)) return `BUILDINGS[${i}].plot must be within parcel bounds ${PARCEL_MIN}..${PARCEL_MAX}`;
    buildingIds.add(building.id);
  }
  for (const [key, definition] of Object.entries(world.objectTypes)) {
    const error = validateObjectTypeDefinition(definition, `OBJECT_TYPES.${key}`);
    if (error) return error;
  }
  const placementIds = new Set<string>();
  for (let i = 0; i < world.placements.length; i++) {
    const placement = world.placements[i] as unknown;
    if (!isRecord(placement)) return `PLACEMENTS[${i}] must be an object`;
    const extra = exactKeys(placement, ["id", "type", "location", "plot", "overrides"], `PLACEMENTS[${i}]`);
    if (extra) return extra;
    if (typeof placement.id !== "string" || !placement.id || placementIds.has(placement.id)) return `PLACEMENTS[${i}].id is missing or duplicate`;
    if (typeof placement.type !== "string" || !world.objectTypes[placement.type]) return `PLACEMENTS[${i}].type does not exist`;
    if (typeof placement.location !== "string" || (placement.location !== "outdoors" && !buildingIds.has(placement.location))) return `PLACEMENTS[${i}].location is invalid`;
    if (placement.location === "outdoors" && !validPlot(placement.plot)) return `PLACEMENTS[${i}].plot is required for outdoors`;
    if (placement.plot !== undefined && !validPlot(placement.plot)) return `PLACEMENTS[${i}].plot is malformed`;
    if (placement.overrides !== undefined) {
      if (!isRecord(placement.overrides) || exactKeys(placement.overrides, ["color"], `PLACEMENTS[${i}].overrides`)) return `PLACEMENTS[${i}].overrides is malformed`;
      if (placement.overrides.color !== undefined && (typeof placement.overrides.color !== "string" || !HEX_COLOR.test(placement.overrides.color))) return `PLACEMENTS[${i}].overrides.color is invalid`;
    }
    placementIds.add(placement.id);
  }
  for (const [key, surface] of Object.entries(world.surfaces)) {
    if (!isRecord(surface) || exactKeys(surface, ["material", "color"], `SURFACES.${key}`) || typeof surface.material !== "string" || !surface.material || typeof surface.color !== "string" || !HEX_COLOR.test(surface.color)) {
      return `SURFACES.${key} must be exactly { material, color: "#hex" }`;
    }
  }
  return validateOutdoorLayout(world);
}

/** Every op checked against the REAL current world (never a model's claim
 * about it), accumulating state across ops within the same edit so
 * "addObjectType then addPlacement of that type" validates correctly in
 * one edit -- but nothing is actually applied here; see applyWorldEdit. */
export function validateWorldEdit(world: LiveWorld, edit: WorldEdit): { valid: true } | { valid: false; reason: string } {
  if (!Array.isArray(edit.ops) || edit.ops.length === 0) return { valid: false, reason: "edit has no ops" };
  if (edit.ops.length > 50) return { valid: false, reason: "edit has too many ops -- maximum allowed is 50 ops per batch" };

  const objectTypeKeys = new Set(Object.keys(world.objectTypes));
  const objectTypes = { ...world.objectTypes };
  const placementIds = new Set(world.placements.map((p) => p.id));
  const placements: Placement[] = world.placements.map((placement) => ({ ...placement, plot: placement.plot && { ...placement.plot }, overrides: placement.overrides && { ...placement.overrides } }));
  const buildingIds = new Set(world.buildings.map((b) => b.id));
  const surfaceKeys = new Set(Object.keys(world.surfaces));

  for (let i = 0; i < edit.ops.length; i++) {
    const op = edit.ops[i];
    switch (op.op) {
      case "addObjectType": {
        if (!op.key) return { valid: false, reason: `op[${i}] addObjectType: key is empty` };
        if (FORBIDDEN_OBJECT_KEYS.has(op.key) || op.key.includes("proto") || op.key.length > 50) {
          return { valid: false, reason: `op[${i}] addObjectType: key "${op.key}" is not a safe identifier` };
        }
        if (objectTypeKeys.has(op.key)) return { valid: false, reason: `op[${i}] addObjectType: type "${op.key}" already exists -- use overridePlacement or setSurfaceField to change an existing thing, not addObjectType` };
        const err = validateObjectTypeDefinition(op.definition, `op[${i}] addObjectType.definition`);
        if (err) return { valid: false, reason: err };
        objectTypeKeys.add(op.key);
        objectTypes[op.key] = op.definition;
        break;
      }
      case "addPlacement": {
        const p = op.placement;
        if (!p || typeof p.id !== "string" || !p.id) return { valid: false, reason: `op[${i}] addPlacement: placement.id is missing` };
        if (FORBIDDEN_OBJECT_KEYS.has(p.id) || p.id.length > 50) return { valid: false, reason: `op[${i}] addPlacement: placement id is not a safe identifier` };
        if (placementIds.has(p.id)) return { valid: false, reason: `op[${i}] addPlacement: placement id "${p.id}" already exists` };
        if (typeof p.type !== "string" || !objectTypeKeys.has(p.type)) return { valid: false, reason: `op[${i}] addPlacement: type "${p.type}" does not exist in the registry -- known types: ${[...objectTypeKeys].join(", ")}` };
        if (typeof p.location !== "string" || !p.location) return { valid: false, reason: `op[${i}] addPlacement: placement.location is missing` };
        if (p.location !== "outdoors" && !buildingIds.has(p.location)) return { valid: false, reason: `op[${i}] addPlacement: location "${p.location}" is not "outdoors" or a real building id -- known buildings: ${[...buildingIds].join(", ")}` };
        if (p.location === "outdoors") {
          if (!p.plot || typeof p.plot.x !== "number" || typeof p.plot.y !== "number") return { valid: false, reason: `op[${i}] addPlacement: an outdoor placement needs plot: { x: number, y: number }` };
        }
        if (p.overrides !== undefined) {
          const keys = Object.keys(p.overrides);
          const badKey = keys.find((k) => k !== "color");
          if (badKey) return { valid: false, reason: `op[${i}] addPlacement: overrides has unsupported field "${badKey}" -- only color is supported` };
          if (p.overrides.color !== undefined && !HEX_COLOR.test(p.overrides.color)) return { valid: false, reason: `op[${i}] addPlacement: overrides.color must be a "#hex" string` };
        }
        const prospective = [...placements, p];
        const layoutError = validateOutdoorLayout({ ...world, objectTypes }, prospective);
        if (layoutError) return { valid: false, reason: `op[${i}] addPlacement: ${layoutError}` };
        placements.push(p);
        placementIds.add(p.id);
        break;
      }
      case "overridePlacement": {
        if (!placementIds.has(op.placementId)) return { valid: false, reason: `op[${i}] overridePlacement: placement id "${op.placementId}" does not exist` };
        const keys = Object.keys(op.overrides ?? {});
        if (keys.length === 0) return { valid: false, reason: `op[${i}] overridePlacement: overrides is empty` };
        // FOUNDATION-2 re-measurement found this the hard way: a real fix
        // call, asked to correct a placement's position, naturally tried
        // addPlacement again with the same id (correctly rejected as a
        // duplicate) because there was no way to express "reposition" --
        // plot is a property of a placement the same way colour is, so it
        // belongs in overridePlacement too, not a new op.
        const badKey = keys.find((k) => k !== "color" && k !== "plot");
        if (badKey) return { valid: false, reason: `op[${i}] overridePlacement: overrides has unsupported field "${badKey}" -- only color and plot are supported` };
        if (op.overrides.color !== undefined && !HEX_COLOR.test(op.overrides.color)) return { valid: false, reason: `op[${i}] overridePlacement: overrides.color must be a "#hex" string` };
        if (op.overrides.plot !== undefined && (typeof op.overrides.plot.x !== "number" || typeof op.overrides.plot.y !== "number")) {
          return { valid: false, reason: `op[${i}] overridePlacement: overrides.plot must be { x: number, y: number }` };
        }
        if (op.overrides.plot !== undefined) {
          const placementIndex = placements.findIndex((placement) => placement.id === op.placementId);
          if (placements[placementIndex].location !== "outdoors") return { valid: false, reason: `op[${i}] overridePlacement: only an outdoor placement can have plot overridden` };
          const prospective = placements.map((placement, index) => index === placementIndex ? { ...placement, plot: op.overrides.plot } : placement);
          const layoutError = validateOutdoorLayout({ ...world, objectTypes }, prospective);
          if (layoutError) return { valid: false, reason: `op[${i}] overridePlacement: ${layoutError}` };
          placements[placementIndex] = prospective[placementIndex];
        }
        break;
      }
      case "setSurfaceField": {
        if (!surfaceKeys.has(op.surfaceKey)) return { valid: false, reason: `op[${i}] setSurfaceField: surface "${op.surfaceKey}" does not exist -- known surfaces: ${[...surfaceKeys].join(", ")}` };
        if (op.field !== "material" && op.field !== "color") return { valid: false, reason: `op[${i}] setSurfaceField: field must be "material" or "color"` };
        if (op.field === "color" && !HEX_COLOR.test(op.value)) return { valid: false, reason: `op[${i}] setSurfaceField: value must be a "#hex" string when field is "color"` };
        // A 500,000-CHARACTER MATERIAL WAS ACCEPTED.
      //
      // The only check here was that the value existed. An audit set a material
      // to half a megabyte: accepted, and it grew the world source by 504,634
      // characters -- which is then re-sent as INPUT to plan, implement, fix,
      // review and QA on every subsequent run (~125k tokens each), served at
      // /world-source, and written to DO storage, which caps values at 128 KiB
      // so the publish would fail closed only AFTER the spend.
      //
      // A material name is a word. 120 characters is generous for one.
      if (op.field === "material" && typeof op.value === "string" && op.value.length > 120) {
        return { valid: false, reason: `REFUSED -- material value is ${op.value.length} characters; a material name is a word, not a document` };
      }
      if (op.field === "material" && !op.value) return { valid: false, reason: `op[${i}] setSurfaceField: value is empty` };
        break;
      }
      default:
        return { valid: false, reason: `op[${i}]: unknown op` };
    }
  }
  return { valid: true };
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function serializeBlock(source: string, name: (typeof DATA_BLOCKS)[number], value: unknown): string {
  const begin = `/*@DATA:${name}:BEGIN*/`;
  const end = `/*@DATA:${name}:END*/`;
  // blockBounds supplies the strict missing/duplicate/order checks first.
  // The regex then replaces the WHOLE marked block, preserving only the
  // two markers. No character from the old payload can survive.
  blockBounds(source, name);
  const pattern = new RegExp(`${escapeRegExp(begin)}[\\s\\S]*?${escapeRegExp(end)}`, "g");
  let replacements = 0;
  const serialized = JSON.stringify(value, null, 2);
  const next = source.replace(pattern, () => {
    replacements++;
    return `${begin}${serialized}${end}`;
  });
  if (replacements !== 1) throw new Error(`sentinel block ${name} could not be serialized exactly once`);
  return next;
}

/** Applies a VALIDATED edit to the real current source, returning the new
 * source text with only the affected data block(s) changed -- everything
 * else, including chooseAction/applyAction/tick, is untouched, because
 * this never regenerates them; it splices JSON.stringify output (JSON is
 * valid JS object-literal syntax) into the exact sentinel-marked region.
 * Throws if the edit doesn't validate -- callers must not call this
 * without having validated first (see runValidatedWorldEdit below for the
 * combined, safe entry point). */
export function applyWorldEdit(currentSource: string, edit: WorldEdit): string {
  const world = readWorldData(currentSource);
  const validation = validateWorldEdit(world, edit);
  if (!validation.valid) throw new Error(`invalid world edit: ${validation.reason}`);

  const objectTypes = { ...world.objectTypes };
  const placements = [...world.placements];
  const surfaces = { ...world.surfaces };

  for (const op of edit.ops) {
    if (op.op === "addObjectType") {
      objectTypes[op.key] = op.definition;
    } else if (op.op === "addPlacement") {
      placements.push(op.placement);
    } else if (op.op === "overridePlacement") {
      const idx = placements.findIndex((p) => p.id === op.placementId);
      // plot replaces the placement's own top-level field (that's the
      // shape every renderer already reads for position); colour merges
      // into .overrides (that's the shape every renderer already reads
      // for a colour override). Two different destinations for one op,
      // both matching the data shape that already exists -- no renderer
      // change needed for either.
      const { color, plot } = op.overrides;
      placements[idx] = {
        ...placements[idx],
        ...(plot !== undefined ? { plot } : {}),
        ...(color !== undefined ? { overrides: { ...placements[idx].overrides, color } } : {}),
      };
    } else if (op.op === "setSurfaceField") {
      surfaces[op.surfaceKey] = { ...surfaces[op.surfaceKey], [op.field]: op.value };
    }
  }

  let next = currentSource;
  // Serialize the complete data model, including unchanged BUILDINGS, so
  // every sentinel payload has one canonical shape and no stale source
  // fragments can remain between its markers.
  next = serializeBlock(next, "BUILDINGS", world.buildings);
  next = serializeBlock(next, "OBJECT_TYPES", objectTypes);
  next = serializeBlock(next, "PLACEMENTS", placements);
  next = serializeBlock(next, "SURFACES", surfaces);
  // Fail closed on serializer bugs before the source can reach verification.
  readWorldData(next);
  return next;
}

/** Combined validate-then-apply, the one real entry point callers should
 * use -- never split into "validate, then separately trust apply", the
 * same discipline as every other validate-before-consume step in this
 * project. Returns the reason on rejection instead of throwing, since a
 * rejected edit is an expected, reportable outcome for the fix stage to
 * react to, not a program error. */
export function runValidatedWorldEdit(currentSource: string, edit: WorldEdit): { ok: true; source: string } | { ok: false; reason: string } {
  try {
    const world = readWorldData(currentSource);
    const validation = validateWorldEdit(world, edit);
    if (!validation.valid) return { ok: false, reason: validation.reason };
    return { ok: true, source: applyWorldEdit(currentSource, edit) };
  } catch (e) {
    return { ok: false, reason: String((e as Error)?.message ?? e) };
  }
}

/** Whether a change request is even PLAUSIBLY expressible as a WorldEdit --
 * cheap, deterministic, no model call, read by the plan stage to decide
 * (and declare) which implementation path a request will take. This is
 * necessary but not sufficient: it checks the WORLD has the right shape
 * for data-edit changes to exist at all (sentinel markers present); the
 * actual DECISION of which path a specific request needs is the plan
 * model's judgement call, informed by this. */
export function worldEditPathAvailable(source: string): boolean {
  return DATA_BLOCKS.every((name) => source.includes(`/*@DATA:${name}:BEGIN*/`) && source.includes(`/*@DATA:${name}:END*/`));
}

// =============================================================================
// WORLD INTEGRITY — checks that look at the WORLD, not at the sim functions
//
// The nine regression cases all call tick/chooseAction/applyAction. Those are
// pure functions over needs and money: they do not read objectTypes, buildings,
// placements or surfaces, and they pass identically whether or not a data edit
// did anything at all. Combined with decideStillFailing deliberately allowing a
// plan to propose zero criteria, that left a real hole -- a data-edit run could
// report "shipped, verified" when nothing in the verification had looked at the
// data it changed. For a system whose entire claim is that it only says yes when
// yes is true, that is the wrong hole to have.
//
// These checks are deterministic, need no sandbox and cost nothing. They are
// appended to the REGRESSION results, not the criteria, because decideStillFailing
// treats an empty regression array as "verification did not happen" and any
// failing regression entry as failing -- which is exactly the weight they should
// carry. They are derived by DIFFING the world data before and after, so they
// check what actually changed rather than what the model said it would change.
// =============================================================================

export interface IntegrityResult {
  name: string;
  pass: boolean;
  expected?: unknown;
  actual?: unknown;
  error?: string;
}
// stripLiterals lived here: a hand-rolled scanner that blanked strings,
// comments and regexes so a brace counter could be trusted. It was the
// foundation of four defeated versions of topLevelSideEffects -- most
// memorably because it could not tell a regex from a division, so one
// `const RE = /[{]/;` unbalanced the counter and switched the whole check off
// in silence. acorn does this correctly and it is no longer needed.

/**
 * Does this source contain any TOP-LEVEL executable statement?
 *
 * This matters because the shipped world source is served at /world-source and
 * dynamically import()ed as a module by four public pages. For a source edit,
 * that text is a whole file a model wrote. The sandbox cannot catch a payload
 * aimed at the browser -- there is no DOM in a Dynamic Worker, so
 * `if (typeof document !== "undefined") { ... }` runs nowhere during
 * verification and everywhere afterwards.
 *
 * The world is meant to be declarations and nothing else: four functions, the
 * data blocks, and one export statement. Anything that EXECUTES at module load
 * is therefore both unnecessary and the exact shape an injected payload takes,
 * so it is refused rather than reasoned about.
 */
/**
 * REFERENCES TO A BROWSER, ANYWHERE IN THE MODULE.
 *
 * topLevelSideEffects deliberately does not look inside function bodies -- a
 * function is defined at module load and called later, so its body is not a
 * module-load side effect. That is correct for the question it asks, and it
 * leaves a hole for a different one.
 *
 * The world's exported functions are imported AND CALLED by the public pages. A
 * payload does not need to run at module load; it only needs to be in tick().
 * An audit put this inside the body:
 *
 *     if (typeof document !== "undefined" && !globalThis.__done) {
 *       globalThis.__done = 1; document.title = "PWNED";
 *       navigator.sendBeacon("/collect", document.cookie);
 *     }
 *
 * and every server-side check passed: topLevelSideEffects returned [], the
 * integrity checks passed, and 0 of 9 regressions failed -- because the sandbox
 * runs in a Worker isolate with no DOM, so the guard branch is dead there and
 * live in every visitor's browser. The tests cannot see it by construction.
 *
 * So this is a static question, not a runtime one. The world is a pure
 * simulation of needs, money and time. It has no legitimate reason to mention a
 * document, a network, or a way to build new code from a string -- at any depth.
 * Naming them is the finding.
 */
const BROWSER_AND_ESCAPE_GLOBALS = new Set([
  // the DOM and the page
  "document", "window", "navigator", "location", "history", "screen", "parent", "top", "opener",
  "localStorage", "sessionStorage", "indexedDB", "caches", "crypto",
  // anything that leaves the machine
  "fetch", "XMLHttpRequest", "WebSocket", "EventSource", "sendBeacon", "importScripts",
  // anything that turns data into code
  "eval", "Function", "WebAssembly",
  // the escape hatches out of a module
  "globalThis", "self", "process", "require",
]);

export function browserOnlyReferences(source: string): string[] {
  let program: AcornProgram;
  try {
    program = parse(source, { ecmaVersion: 2022, sourceType: "module" }) as unknown as AcornProgram;
  } catch (err) {
    return [`source does not parse: ${String((err as Error)?.message ?? err).slice(0, 120)}`];
  }

  const found = new Map<string, string>();
  const near = (node: { start: number; end: number }) =>
    source.slice(node.start, Math.min(node.end, node.start + 90)).replace(/\s+/g, " ").trim();

  // Names the module itself binds are not the globals we are looking for.
  const bound = new Set<string>();
  const collectBindings = (node: any) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "VariableDeclarator" && node.id?.type === "Identifier") bound.add(node.id.name);
    if ((node.type === "FunctionDeclaration" || node.type === "FunctionExpression"
      || node.type === "ArrowFunctionExpression") && node.id?.type === "Identifier") bound.add(node.id.name);
    for (const p of node.params ?? []) if (p?.type === "Identifier") bound.add(p.name);
    for (const k of Object.keys(node)) {
      const v = (node as any)[k];
      if (Array.isArray(v)) v.forEach(collectBindings);
      else if (v && typeof v === "object" && typeof v.type === "string") collectBindings(v);
    }
  };
  collectBindings(program);

  const walk = (node: any, parent: any) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "Identifier" && BROWSER_AND_ESCAPE_GLOBALS.has(node.name) && !bound.has(node.name)) {
      // `x.document` is a property, not the global; `document.x` is the global.
      const isProperty = parent?.type === "MemberExpression" && parent.property === node && !parent.computed;
      const isKey = parent?.type === "Property" && parent.key === node && !parent.computed;
      if (!isProperty && !isKey) found.set(node.name, near(parent ?? node));
    }
    for (const k of Object.keys(node)) {
      if (k === "start" || k === "end" || k === "loc") continue;
      const v = (node as any)[k];
      if (Array.isArray(v)) v.forEach((c) => walk(c, node));
      else if (v && typeof v === "object" && typeof v.type === "string") walk(v, node);
    }
  };
  walk(program, null);

  return [...found.entries()].map(([name, ctx]) => `${name} referenced: ${ctx}`);
}

export function topLevelSideEffects(source: string): string[] {
  // PARSED, NOT PATTERN-MATCHED.
  //
  // Four rounds of this check were written as a hand-rolled tokenizer, and an
  // audit defeated every one of them -- each fix aimed at the single payload
  // just demonstrated, each leaving the same idea spelled differently. The
  // scoreboard, all reproduced by running the shipped code:
  //
  //   1. a declaration keyword was enough      -> `const _x = fetch(...)`
  //   2. only the LINE PREFIX was examined     -> `function f(){} evil()`
  //   3. the fix covered `function` and not    -> `const _a = () => {}; evil()`
  //      `const`, and skipped the depth counter,
  //      so ordinary multi-line arrows were REJECTED
  //   4. splitting on statements missed commas -> `const a = () => {}, b = evil()`
  //      and a regex after `)` still unbalanced the counter, and semicolon-free
  //      source was never split at all
  //
  // Each round I fixed the instance and kept the approach. The approach was the
  // bug: deciding what JavaScript DOES by looking at its characters is a
  // parser, and a parser written by accident is one that is wrong in ways
  // nobody has enumerated yet.
  //
  // So it parses now. acorn is 560 KB, has no dependencies, and bundles into a
  // Worker. What runs at module load is exactly the top level of the Program
  // body, which the AST states outright, and the rule below is a list of node
  // types rather than a set of regexes hoping to approximate one. Ordinary code
  // is no longer at risk of being rejected either -- an object literal whose
  // values are arrows is obviously fine to a parser and was a false positive to
  // every version of the tokenizer, including on this repo's own buildings.js.
  let program: AcornProgram;
  try {
    program = parse(source, { ecmaVersion: 2022, sourceType: "module" }) as unknown as AcornProgram;
  } catch (err) {
    // Source that does not parse is not "clean". It cannot be shipped either
    // way, and reporting it as having no side effects would be a yes that isn't
    // true.
    return [`source does not parse: ${String((err as Error)?.message ?? err).slice(0, 120)}`];
  }

  const offenders: string[] = [];
  const near = (node: { start: number; end: number }) =>
    source.slice(node.start, Math.min(node.end, node.start + 90)).replace(/\s+/g, " ").trim();

  /** Can evaluating this expression run anything at module load? */
  const isInert = (node: AcornNode | null | undefined): boolean => {
    if (!node) return true;                                   // `let x;`
    switch (node.type) {
      // A function is DEFINED here and CALLED later. Its body does not run at
      // module load, so its body is not examined -- this is what every
      // tokenizer version got wrong in one direction or the other.
      case "ArrowFunctionExpression":
      case "FunctionExpression":
      case "ClassExpression":
        return node.type !== "ClassExpression" || !hasStaticBlock(node);
      case "Literal":
      case "Identifier":
        return true;
      case "TemplateLiteral":
        return (node.expressions ?? []).every(isInert);
      case "ArrayExpression":
        return (node.elements ?? []).every((e: AcornNode | null) => e === null || isInert(e));
      case "ObjectExpression":
        return (node.properties ?? []).every((prop: AcornNode) =>
          prop.type === "Property" && !prop.computed && isInert(prop.value));
      case "UnaryExpression":
        return node.operator !== "delete" && isInert(node.argument);
      case "BinaryExpression":
        return isInert(node.left) && isInert(node.right);
      case "ConditionalExpression":
        return isInert(node.test) && isInert(node.consequent) && isInert(node.alternate);
      default:
        // CallExpression, NewExpression, AssignmentExpression, AwaitExpression,
        // TaggedTemplateExpression, MemberExpression (a getter can run), and
        // anything a future edition adds. Unknown means no.
        return false;
    }
  };

  const hasStaticBlock = (node: AcornNode): boolean =>
    (node.body?.body ?? []).some((el: AcornNode) => el.type === "StaticBlock");

  const checkStatement = (node: AcornNode): void => {
    switch (node.type) {
      case "FunctionDeclaration":
      case "EmptyStatement":
        return;
      case "ClassDeclaration":
        // A class static initialiser block runs at definition time.
        if (hasStaticBlock(node)) offenders.push(near(node));
        return;
      case "VariableDeclaration":
        // EVERY declarator, not just the first. `const a = () => {}, b = evil()`
        // was clean for a whole round because the first one was a function.
        for (const d of node.declarations ?? []) {
          if (!isInert(d.init)) offenders.push(near(d));
        }
        return;
      case "ExportNamedDeclaration":
      case "ExportDefaultDeclaration":
        if (node.declaration) checkStatement(node.declaration);
        return;                                    // `export { a }` re-exports, runs nothing
      case "ImportDeclaration":
        // The world is self-contained; a top-level import is a remote fetch.
        offenders.push(near(node));
        return;
      default:
        offenders.push(near(node));                // expression statements, loops, await, labels
    }
  };

  for (const node of program.body) checkStatement(node);
  return offenders;
}

/** The slice of acorn's AST this file needs. acorn ships no types of its own. */
type AcornNode = {
  type: string;
  start: number;
  end: number;
  [key: string]: unknown;
} & Record<string, any>;
type AcornProgram = { body: AcornNode[] };

export function worldIntegrityChecks(before: string, after: string, dataEditExpected: boolean): IntegrityResult[] {
  const out: IntegrityResult[] = [];

  let a: LiveWorld;
  try {
    a = readWorldData(after);
  } catch (e) {
    // A source edit is never validated against the data blocks the way a data
    // edit is, so a rewrite that mangles them reaches here and must fail loudly.
    return [{
      name: "the changed world still parses as a world",
      pass: false,
      error: String((e as Error)?.message ?? e),
      expected: "the four data blocks parse",
    }];
  }
  let b: LiveWorld | null = null;
  try { b = readWorldData(before); } catch { b = null; }

  out.push({ name: "the changed world still parses as a world", pass: true, expected: "the four data blocks parse", actual: "parsed" });

  // 0. nothing executes at module load
  //
  // The strongest check available for the fact that this text becomes a
  // <script type=module> in a visitor's browser. A world is declarations; a
  // payload is a statement.
  // Two different questions, both asked. topLevelSideEffects covers what runs
  // when the module loads; browserOnlyReferences covers what a function body
  // could do when the VISITOR'S BROWSER calls it, which the sandbox cannot see
  // because it has no DOM.
  const sideEffects = [...topLevelSideEffects(after), ...browserOnlyReferences(after)];
  out.push({
    name: "the world runs nothing at module load",
    pass: sideEffects.length === 0,
    expected: "only declarations at the top level",
    actual: sideEffects.length === 0 ? "declarations only" : `${sideEffects.length} top-level statement(s): ${sideEffects.slice(0, 3).join(" | ")}`,
  });

  // 1. the change is observable at all
  if (dataEditExpected) {
    const changed = b !== null && JSON.stringify(dataOf(a)) !== JSON.stringify(dataOf(b));
    out.push({
      name: "the data edit actually changed the world data",
      pass: changed,
      expected: "objectTypes/buildings/placements/surfaces differ from the source this run started from",
      actual: changed ? "changed" : "byte-identical -- the edit applied cleanly and did nothing",
    });
  } else {
    const changed = after !== before;
    out.push({
      name: "the change actually changed the source",
      pass: changed,
      expected: "the candidate source differs from the source this run started from",
      actual: changed ? "changed" : "identical",
    });
  }

  // 2. nothing was silently deleted. None of the four edit ops can delete
  //    anything, so any disappearance is a regression -- and on the source-edit
  //    path, where a model rewrites the file, it is the likeliest one.
  if (b) {
    const lost: string[] = [];
    for (const k of Object.keys(b.objectTypes)) if (!(k in a.objectTypes)) lost.push(`objectType "${k}"`);
    for (const k of Object.keys(b.surfaces)) if (!(k in a.surfaces)) lost.push(`surface "${k}"`);
    const aIds = new Set(a.placements.map((p) => p.id));
    for (const p of b.placements) if (!aIds.has(p.id)) lost.push(`placement "${p.id}"`);
    const aB = new Set(a.buildings.map((x) => x.id));
    for (const x of b.buildings) if (!aB.has(x.id)) lost.push(`building "${x.id}"`);
    out.push({
      name: "nothing that existed before was deleted",
      pass: lost.length === 0,
      expected: "no object type, surface, placement or building disappears",
      actual: lost.length ? lost.slice(0, 8).join(", ") + (lost.length > 8 ? ` (+${lost.length - 8} more)` : "") : "nothing lost",
    });
  }

  // 3. referential integrity: every placement points at a type that exists and
  //    a home that exists. A registry entry the renderer cannot resolve draws
  //    nothing, silently -- the visitor is told yes and sees no change.
  const badType = a.placements.filter((p) => !(p.type in a.objectTypes)).map((p) => `${p.id}:${p.type}`);
  out.push({
    name: "every placement references an object type that exists",
    pass: badType.length === 0,
    expected: "placement.type is a key of objectTypes",
    actual: badType.length ? badType.slice(0, 8).join(", ") : "all resolve",
  });

  const buildingIds = new Set(a.buildings.map((x) => x.id));
  const badHome = a.placements
    .filter((p) => p.location !== "outdoors" && !buildingIds.has(p.location))
    .map((p) => `${p.id}@${p.location}`);
  out.push({
    name: "every placement stands somewhere that exists",
    pass: badHome.length === 0,
    expected: 'placement.location is "outdoors" or a real building id',
    actual: badHome.length ? badHome.slice(0, 8).join(", ") : "all resolve",
  });

  // 4. outdoor placements carry the coordinates the renderer needs
  const badPlot = a.placements
    .filter((p) => p.location === "outdoors")
    .filter((p) => !p.plot || typeof p.plot.x !== "number" || typeof p.plot.y !== "number")
    .map((p) => p.id);
  out.push({
    name: "every outdoor placement has real coordinates",
    pass: badPlot.length === 0,
    expected: "location 'outdoors' implies numeric plot {x, y}",
    actual: badPlot.length ? badPlot.slice(0, 8).join(", ") : "all have coordinates",
  });

  // 5. ids are unique. A duplicate id makes one of the two unaddressable by any
  //    later override op, so a subsequent edit would silently hit the wrong one.
  const seen = new Set<string>(), dupes: string[] = [];
  for (const p of a.placements) { if (seen.has(p.id)) dupes.push(p.id); seen.add(p.id); }
  out.push({
    name: "placement ids are unique",
    pass: dupes.length === 0,
    expected: "no two placements share an id",
    actual: dupes.length ? [...new Set(dupes)].join(", ") : "unique",
  });

  return out;
}

function dataOf(w: LiveWorld) {
  return { objectTypes: w.objectTypes, buildings: w.buildings, placements: w.placements, surfaces: w.surfaces };
}
