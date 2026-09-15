// SDB-1 (PLAN.md §6) -- D1 persistence for Side B's registry overlay,
// surviving a full redeploy, not just an isolate. Mark's ruling: "D1,
// surviving a full redeploy, not just an isolate. Anything less is a cache."
//
// CHECKLIST.md's own gate, literal: "author a piece, redeploy, and it is
// still there and still places." A `.workers.test.ts` file cannot actually
// redeploy anything -- what it CAN do, and what this test does, is the part
// that makes "survives a redeploy" true or false: construct a SECOND,
// independent registry instance against the SAME D1 binding (no shared
// in-memory state whatsoever between the two `createCatalogueRegistry`
// calls) and confirm the second instance sees what the first one wrote.
// That is exactly the property an in-memory Map does not have and a durable
// store does -- the isolate that authored the piece is gone by the time the
// second registry is built; only D1 connects them.
import { env } from "cloudflare:test";
import { describe, expect, it, beforeEach } from "vitest";
import { createAreaBoard } from "../public/area-board.js";
import { createCatalogueRegistry, UNIQUENESS_MULTIPLIER } from "../public/catalogue-registry.js";

const BASE_CATALOGUE = {
  "house-a": { id: "house-a", category: "residential", footprint: [1, 1], rotatable: true, terrainMask: ["land"], pivot: "corner", massing: ["base"], baseValue: 1, adjacency: { residential: -2, commercial: 2 }, unitQuality: 1 },
};

function goodAuthoredFields(overrides: Record<string, unknown> = {}) {
  return {
    id: "authored-house-d1",
    footprint: [1, 1],
    category: "residential",
    rotatable: true,
    terrainMask: ["land"],
    massing: ["base"],
    author: "player-42",
    verifiedBy: "build-pipeline-v1",
    createdAt: "2026-09-15T00:00:00Z",
    sourceRef: "req-abc123",
    authoredClass: "house",
    ...overrides,
  };
}

beforeEach(async () => {
  // Each test's own isolated slate -- D1 storage in the test pool persists
  // ACROSS tests in the same file (it is the same simulated database), and
  // this suite's whole point is authored-piece survival, so leftover rows
  // from a previous test would silently make every test after the first
  // one meaningless.
  await env.CATALOGUE_DB.prepare("DELETE FROM authored_pieces").run();
});

describe("D1-backed catalogue registry (SDB-1)", () => {
  it("GATE (SDB-1): a piece authored on one registry instance is visible on a SECOND, independent instance built against the same D1 binding -- the redeploy gate", async () => {
    const first = createCatalogueRegistry(BASE_CATALOGUE, { db: env.CATALOGUE_DB });
    const result = await first.addAuthoredEntry(goodAuthoredFields());
    expect(result.ok, JSON.stringify((result as { errors?: unknown }).errors)).toBe(true);

    // A FRESH registry -- no reference to `first`, no shared closure state,
    // nothing but the same D1 binding -- simulating a new Worker isolate
    // after a redeploy reading from the same durable store.
    const second = createCatalogueRegistry(BASE_CATALOGUE, { db: env.CATALOGUE_DB });
    const entry = await second.get("authored-house-d1");
    expect(entry).toBeTruthy();
    expect((entry as { author: string }).author).toBe("player-42");
    expect((entry as { baseValue: number }).baseValue).toBe(1 * UNIQUENESS_MULTIPLIER);
    // SDB-2: authoredClass round-trips through the real D1 row (entryToRow's
    // authored_class column, rowToEntry's authoredClass field) -- not just
    // held in a JS closure the in-memory path never had to prove either way.
    expect((entry as { authoredClass: string }).authoredClass).toBe("house");

    const all = await second.all();
    expect(all["authored-house-d1"]).toEqual(entry);
    expect(all["house-a"]).toEqual(BASE_CATALOGUE["house-a"]);
  });

  it("GATE (SDB-1): the piece still PLACES on a board built from the second instance's catalogue -- persistence that cannot be used is not the gate", async () => {
    const first = createCatalogueRegistry(BASE_CATALOGUE, { db: env.CATALOGUE_DB });
    await first.addAuthoredEntry(goodAuthoredFields());

    const second = createCatalogueRegistry(BASE_CATALOGUE, { db: env.CATALOGUE_DB });
    const catalogue = await second.all();
    const board = createAreaBoard({ width: 10, height: 10, catalogue });
    const placed = board.place("authored-house-d1", { x: 0, y: 0 }, 0, { id: 1 });
    expect(placed.ok, JSON.stringify(placed)).toBe(true);
  });

  it("a collision against an existing D1 row is refused, not overwritten", async () => {
    const registry = createCatalogueRegistry(BASE_CATALOGUE, { db: env.CATALOGUE_DB });
    const firstResult = await registry.addAuthoredEntry(goodAuthoredFields());
    expect(firstResult.ok).toBe(true);
    const second = await registry.addAuthoredEntry(goodAuthoredFields({ author: "player-99" }));
    expect(second.ok).toBe(false);
    expect((second as { errors: Array<{ rule: string }> }).errors.some((e) => e.rule === "no-collision")).toBe(true);
    // Unaltered by the refused attempt.
    const entry = await registry.get("authored-house-d1");
    expect((entry as { author: string }).author).toBe("player-42");
  });

  it("a collision against the SHIPPED catalogue is refused without ever touching D1", async () => {
    const registry = createCatalogueRegistry(BASE_CATALOGUE, { db: env.CATALOGUE_DB });
    const result = await registry.addAuthoredEntry(goodAuthoredFields({ id: "house-a" }));
    expect(result.ok).toBe(false);
    expect((result as { errors: Array<{ rule: string }> }).errors.some((e) => e.rule === "no-collision")).toBe(true);
  });

  it("a schema-invalid entry is refused and never reaches D1 -- get() afterward finds nothing", async () => {
    const registry = createCatalogueRegistry(BASE_CATALOGUE, { db: env.CATALOGUE_DB });
    const result = await registry.addAuthoredEntry(goodAuthoredFields({ footprint: [5, 5] }));
    expect(result.ok).toBe(false);
    const entry = await registry.get("authored-house-d1");
    expect(entry).toBeUndefined();
  });

  it(".all() with no authored pieces yet returns exactly the base catalogue", async () => {
    const registry = createCatalogueRegistry(BASE_CATALOGUE, { db: env.CATALOGUE_DB });
    const all = await registry.all();
    expect(all).toEqual(BASE_CATALOGUE);
  });
});
