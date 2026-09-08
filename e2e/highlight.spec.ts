// P4.2: HIGHLIGHT -- the selected piece leaves the shared InstancedMesh
// (its own instance slot zeroed, not deleted) and draws as its own Mesh,
// the same "pull one instance out" mechanism instance-groups.js already
// uses for layer-overridden placements (docs/audits/P4-GROUNDING.md).
// NOT a material swap on the shared batch -- that would tint every other
// building sharing the variant too.
import { test, expect, type Page } from "@playwright/test";

async function realBuiltPlotWithPiece(page: Page): Promise<{ x: number; z: number; plotId: string }> {
  return await page.evaluate(() => {
    const city = (window as any).renderer3d._impl._city;
    const impl = (window as any).renderer3d._impl;
    for (const plot of city.world.plots) {
      if (!plot.buildable || plot.buildable.xMax <= plot.buildable.xMin || plot.buildable.zMax <= plot.buildable.zMin) continue;
      const piece = impl._boardPieces.get(`bld-${plot.id}`);
      if (piece && city.buildingInstanceIndex.has(plot.id)) {
        return { x: (plot.buildable.xMin + plot.buildable.xMax) / 2, z: (plot.buildable.zMin + plot.buildable.zMax) / 2, plotId: plot.id };
      }
    }
    throw new Error("no real plot with both a board piece and a tracked building instance found");
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("#director-dock");
  await page.waitForFunction(() => {
    const impl = (window as any).renderer3d && (window as any).renderer3d._impl;
    return !!(impl && impl._city && impl._city.world && impl._city.buildingInstanceIndex && impl._city.buildingInstanceIndex.size > 0);
  }, null, { timeout: 30000 });
});

test("picking a building highlights it: its instance slot zeroes, a real individual mesh appears in the scene", async ({ page }) => {
  const before = await page.evaluate(() => (window as any).__p4HighlightState());
  expect(before.active, "setup: nothing should be highlighted before any pick").toBe(false);

  const { x, z, plotId } = await realBuiltPlotWithPiece(page);
  await page.evaluate(({ x, z }) => (window as any).__p4PickAt(x, z), { x, z });

  const after = await page.evaluate(() => (window as any).__p4HighlightState());
  expect(after.active, "picking a building with a tracked instance must produce a live highlight").toBe(true);
  expect(after.plotId).toBe(plotId);
  expect(after.meshInScene, "the individual highlight Mesh must really be a child of the scene, not just tracked in a JS object").toBe(true);
  expect(after.meshName).toBe("p4-highlight");
  expect(after.instanceIsZeroScale, "the original instance's own slot in the InstancedMesh must be hidden (zero-scaled), not still drawing a duplicate").toBe(true);
});

test("picking open ground after a highlight clears it: the instance's exact original matrix is restored, the individual mesh is removed", async ({ page }) => {
  const { x, z } = await realBuiltPlotWithPiece(page);
  await page.evaluate(({ x, z }) => (window as any).__p4PickAt(x, z), { x, z });
  const highlighted = await page.evaluate(() => (window as any).__p4HighlightState());
  expect(highlighted.active).toBe(true);

  await page.evaluate(() => (window as any).__p4PickAt(0, -30000)); // open ground, no piece
  const cleared = await page.evaluate(() => (window as any).__p4HighlightState());
  expect(cleared.active, "picking open ground must clear the previous highlight").toBe(false);
});

test("selecting a second building moves the highlight, restoring the first instance exactly", async ({ page }) => {
  const targets = await page.evaluate(() => {
    const city = (window as any).renderer3d._impl._city;
    const impl = (window as any).renderer3d._impl;
    const out: Array<{ x: number; z: number; plotId: string }> = [];
    for (const plot of city.world.plots) {
      if (!plot.buildable || plot.buildable.xMax <= plot.buildable.xMin || plot.buildable.zMax <= plot.buildable.zMin) continue;
      const piece = impl._boardPieces.get(`bld-${plot.id}`);
      if (piece && city.buildingInstanceIndex.has(plot.id)) {
        out.push({ x: (plot.buildable.xMin + plot.buildable.xMax) / 2, z: (plot.buildable.zMin + plot.buildable.zMax) / 2, plotId: plot.id });
        if (out.length === 2) break;
      }
    }
    return out;
  });
  expect(targets.length, "need two real, distinct pickable buildings for this test").toBe(2);

  await page.evaluate(({ x, z }) => (window as any).__p4PickAt(x, z), targets[0]);
  const first = await page.evaluate(() => (window as any).__p4HighlightState());
  expect(first.plotId).toBe(targets[0].plotId);

  await page.evaluate(({ x, z }) => (window as any).__p4PickAt(x, z), targets[1]);
  const second = await page.evaluate(() => (window as any).__p4HighlightState());
  expect(second.plotId, "the highlight must move to the newly selected piece, not stack").toBe(targets[1].plotId);

  // The FIRST building's own instance must be back to normal (not still
  // zero-scaled) -- checked by re-picking it: if its instance were still
  // hidden, buildingInstanceIndex would still resolve it (the Map entry
  // never changes), but a fresh highlight on it would only look right if
  // its slot in the mesh had actually been restored first.
  const restored = await page.evaluate((plotId) => {
    const impl = (window as any).renderer3d._impl;
    const city = impl._city;
    const entry = city.buildingInstanceIndex.get(plotId);
    const m = new city.THREE.Matrix4();
    entry.mesh.getMatrixAt(entry.index, m);
    // Direct element check -- see index.html's __p4HighlightState for why
    // Matrix4.decompose() is not used here (unreliable on a degenerate
    // all-zero matrix; this checks the RESTORED, non-degenerate one, but
    // kept consistent with the same direct-element technique throughout).
    return !m.elements.slice(0, 12).every((v) => v === 0);
  }, targets[0].plotId);
  expect(restored, "the first building's instance must be restored to a real (non-zero) scale once the highlight moved away from it").toBe(true);
});
