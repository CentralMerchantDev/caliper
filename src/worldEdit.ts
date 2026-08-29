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

interface LiveWorld {
  buildings: { id: string; type: string; label: string; plot: { x: number; y: number } }[];
  placements: Placement[];
  objectTypes: Record<string, ObjectTypeDefinition>;
  surfaces: Record<string, { material: string; color: string }>;
}

function loadLiveWorld(source: string): LiveWorld {
  const factory = new Function(`${source}\nreturn { initialWorld };`) as () => { initialWorld: () => LiveWorld };
  return factory().initialWorld();
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
  if (!isNumberArray(p.position) || p.position.length !== 3) return `${where}: position must be [x,y,z]`;
  if (typeof p.color !== "string" || !HEX_COLOR.test(p.color)) return `${where}: color must be a "#hex" string`;
  if (p.rotation !== undefined && (!isNumberArray(p.rotation) || p.rotation.length !== 3)) return `${where}: rotation, if present, must be [x,y,z]`;
  if (p.scale !== undefined && (!isNumberArray(p.scale) || p.scale.length !== 3)) return `${where}: scale, if present, must be [x,y,z]`;
  if (p.radius !== undefined && typeof p.radius !== "number") return `${where}: radius, if present, must be a number`;
  if (p.segments !== undefined && typeof p.segments !== "number" && !isNumberArray(p.segments)) return `${where}: segments, if present, must be a number or [number,number]`;
  if (p.roughness !== undefined && typeof p.roughness !== "number") return `${where}: roughness, if present, must be a number`;
  if (p.metalness !== undefined && typeof p.metalness !== "number") return `${where}: metalness, if present, must be a number`;
  if (p.emissive !== undefined && (typeof p.emissive !== "string" || !HEX_COLOR.test(p.emissive))) return `${where}: emissive, if present, must be a "#hex" string`;
  if (p.emissiveIntensity !== undefined && typeof p.emissiveIntensity !== "number") return `${where}: emissiveIntensity, if present, must be a number`;
  if (p.emissiveAnimated !== undefined && typeof p.emissiveAnimated !== "boolean") return `${where}: emissiveAnimated, if present, must be a boolean`;
  if (p.transparent !== undefined && typeof p.transparent !== "boolean") return `${where}: transparent, if present, must be a boolean`;
  if (p.opacity !== undefined && typeof p.opacity !== "number") return `${where}: opacity, if present, must be a number`;
  if (p.castShadow !== undefined && typeof p.castShadow !== "boolean") return `${where}: castShadow, if present, must be a boolean`;
  const KNOWN_KEYS = new Set(["shape", "size", "position", "rotation", "scale", "radius", "segments", "color", "roughness", "metalness", "emissive", "emissiveIntensity", "emissiveAnimated", "transparent", "opacity", "castShadow"]);
  const smuggled = Object.keys(p).find((k) => !KNOWN_KEYS.has(k));
  if (smuggled) return `${where}: unknown field "${smuggled}" -- not part of the recipe-part shape`;
  return null;
}

function validateObjectTypeDefinition(def: unknown, where: string): string | null {
  if (typeof def !== "object" || def === null) return `${where}: not an object`;
  const d = def as Record<string, unknown>;
  if (typeof d.material !== "string" || !d.material) return `${where}: material is required`;
  if (typeof d.footprint !== "object" || d.footprint === null || typeof (d.footprint as any).w !== "number" || typeof (d.footprint as any).d !== "number") {
    return `${where}: footprint must be { w: number, d: number }`;
  }
  if (d.station !== null) {
    if (typeof d.station !== "object" || typeof (d.station as any)?.action !== "string" || typeof (d.station as any)?.label !== "string") {
      return `${where}: station must be null or { action: string, label: string }`;
    }
  }
  if (!Array.isArray(d.recipe) || d.recipe.length === 0) return `${where}: recipe must be a non-empty array`;
  for (let i = 0; i < d.recipe.length; i++) {
    const err = validateRecipePart(d.recipe[i], `${where}.recipe[${i}]`);
    if (err) return err;
  }
  if (d.shadow !== undefined && (typeof d.shadow !== "object" || d.shadow === null || typeof (d.shadow as any).w !== "number" || typeof (d.shadow as any).d !== "number")) {
    return `${where}: shadow, if present, must be { w: number, d: number }`;
  }
  if (d.local !== undefined && d.local !== null && (typeof d.local !== "object" || typeof (d.local as any).x !== "number" || typeof (d.local as any).y !== "number")) {
    return `${where}: local, if present, must be null or { x: number, y: number }`;
  }
  if (d.emitsLight !== undefined && typeof d.emitsLight !== "boolean") return `${where}: emitsLight, if present, must be a boolean`;
  if (d.light !== undefined) {
    const l = d.light as Record<string, unknown>;
    if (typeof l !== "object" || l === null || typeof l.color !== "string" || typeof l.distance !== "number" || typeof l.decay !== "number" || typeof l.baseIntensity !== "number" || !isNumberArray(l.position)) {
      return `${where}: light, if present, must be { color, distance, decay, baseIntensity, position: [x,y,z] }`;
    }
  }
  return null;
}

/** Every op checked against the REAL current world (never a model's claim
 * about it), accumulating state across ops within the same edit so
 * "addObjectType then addPlacement of that type" validates correctly in
 * one edit -- but nothing is actually applied here; see applyWorldEdit. */
export function validateWorldEdit(world: LiveWorld, edit: WorldEdit): { valid: true } | { valid: false; reason: string } {
  if (edit.ops.length === 0) return { valid: false, reason: "edit has no ops" };

  const objectTypeKeys = new Set(Object.keys(world.objectTypes));
  const placementIds = new Set(world.placements.map((p) => p.id));
  const buildingIds = new Set(world.buildings.map((b) => b.id));
  const surfaceKeys = new Set(Object.keys(world.surfaces));

  for (let i = 0; i < edit.ops.length; i++) {
    const op = edit.ops[i];
    switch (op.op) {
      case "addObjectType": {
        if (!op.key) return { valid: false, reason: `op[${i}] addObjectType: key is empty` };
        if (objectTypeKeys.has(op.key)) return { valid: false, reason: `op[${i}] addObjectType: type "${op.key}" already exists -- use overridePlacement or setSurfaceField to change an existing thing, not addObjectType` };
        const err = validateObjectTypeDefinition(op.definition, `op[${i}] addObjectType.definition`);
        if (err) return { valid: false, reason: err };
        objectTypeKeys.add(op.key);
        break;
      }
      case "addPlacement": {
        const p = op.placement;
        if (!p || typeof p.id !== "string" || !p.id) return { valid: false, reason: `op[${i}] addPlacement: placement.id is missing` };
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

function spliceBlock(source: string, name: string, replacement: string): string {
  const begin = `/*@DATA:${name}:BEGIN*/`;
  const end = `/*@DATA:${name}:END*/`;
  const beginIdx = source.indexOf(begin);
  const endIdx = source.indexOf(end);
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
    throw new Error(`internal error: sentinel markers for ${name} not found in source -- cannot apply a structured edit to this source`);
  }
  const before = source.slice(0, beginIdx + begin.length);
  const after = source.slice(endIdx);
  return before + replacement + after;
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
  const world = loadLiveWorld(currentSource);
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
  next = spliceBlock(next, "OBJECT_TYPES", JSON.stringify(objectTypes, null, 2));
  next = spliceBlock(next, "PLACEMENTS", JSON.stringify(placements, null, 2));
  next = spliceBlock(next, "SURFACES", JSON.stringify(surfaces, null, 2));
  return next;
}

/** Combined validate-then-apply, the one real entry point callers should
 * use -- never split into "validate, then separately trust apply", the
 * same discipline as every other validate-before-consume step in this
 * project. Returns the reason on rejection instead of throwing, since a
 * rejected edit is an expected, reportable outcome for the fix stage to
 * react to, not a program error. */
export function runValidatedWorldEdit(currentSource: string, edit: WorldEdit): { ok: true; source: string } | { ok: false; reason: string } {
  const world = loadLiveWorld(currentSource);
  const validation = validateWorldEdit(world, edit);
  if (!validation.valid) return { ok: false, reason: validation.reason };
  try {
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
  return source.includes("/*@DATA:OBJECT_TYPES:BEGIN*/") && source.includes("/*@DATA:PLACEMENTS:BEGIN*/") && source.includes("/*@DATA:SURFACES:BEGIN*/");
}
