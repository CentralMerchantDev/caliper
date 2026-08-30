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
      const rawW = part.size[0] * scaleX;
      const rawD = part.size[2] * scaleZ;
      const rotY = (part.rotation && typeof part.rotation[1] === "number") ? part.rotation[1] : 0;
      // Rotated bounding box in the X-Z plane: |w * cos(θ)| + |d * sin(θ)|
      const effW = Math.abs(rawW * Math.cos(rotY)) + Math.abs(rawD * Math.sin(rotY));
      const effD = Math.abs(rawW * Math.sin(rotY)) + Math.abs(rawD * Math.cos(rotY));
      partHalfW = effW / 2;
      partHalfD = effD / 2;
    } else if (part.shape === "cylinder") {
      // Cylinder size is [radiusTop, radiusBottom, height]
      const r = Math.max(part.size[0], part.size[1]) * Math.max(scaleX, scaleZ);
      partHalfW = r;
      partHalfD = r;
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
