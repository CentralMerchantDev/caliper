// P4.1: PICK -- a click resolves to the REAL board.js record (id, kind,
// grid address, footprint), not a renderer-local approximation. Driven
// through the real page (window.__p4PickAt, mirroring
// e2e/applyPersistUndo.spec.ts's __i6ApplyTestLayer pattern) so this proves
// the real running world's _boardPieces map -- built once from the SAME
// placements city-render.js actually drew (city.scenePlacements) -- agrees
// with board-adapter.js's own piece ids, not a second, hand-rolled id
// scheme that happens to look right.
import { test, expect, type Page } from "@playwright/test";

async function realBuiltPlotCentre(page: Page): Promise<{ x: number; z: number; plotId: string }> {
  return await page.evaluate(() => {
    const city = (window as any).renderer3d._impl._city;
    // A plot with a real buildable rect -- board-adapter.js's own
    // buildingPieces() skip condition (see public/board-adapter.js) -- so
    // the pick is guaranteed to land on something with a board piece,
    // not silently miss.
    const plot = city.world.plots.find((p: any) => p.buildable && p.buildable.xMax > p.buildable.xMin && p.buildable.zMax > p.buildable.zMin);
    if (!plot) throw new Error("no real buildable plot found in the live world");
    return {
      x: (plot.buildable.xMin + plot.buildable.xMax) / 2,
      z: (plot.buildable.zMin + plot.buildable.zMax) / 2,
      plotId: plot.id,
    };
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("#director-dock");
  // buildWorld() runs asynchronously after #director-dock is already in the
  // DOM (applyPersistUndo.spec.ts's own city.world reads happen to run late
  // enough not to need this; this suite's first read does not), so wait for
  // the real city instance to actually be there before touching it.
  await page.waitForFunction(() => {
    const impl = (window as any).renderer3d && (window as any).renderer3d._impl;
    return !!(impl && impl._city && impl._city.world);
  }, null, { timeout: 30000 });
});

test("picking a real building's plot centre resolves to its real board.js piece", async ({ page }) => {
  const { x, z, plotId } = await realBuiltPlotCentre(page);
  const result = await page.evaluate(({ x, z }) => (window as any).__p4PickAt(x, z), { x, z });

  expect(result.addr, "the spatial index did not resolve a real plot's own buildable centre to onPlot at all").not.toBeNull();
  expect(result.addr.onPlot).toBe(true);
  expect(result.addr.plotId).toBe(plotId);

  // The board piece may legitimately be null (a plot findQuay/layout.js
  // itself refused to build on) -- but for a real, non-trivial world most
  // buildable plots ARE built, so assert the piece when present rather
  // than requiring it (a hard requirement here would be exactly the kind
  // of assertion that cannot fail honestly Mark's own exit note warns
  // about) and separately assert AT LEAST ONE of several sampled plots
  // does resolve, so the whole mechanism is proven live, not just "did
  // not throw".
  if (result.piece) {
    expect(result.piece.id).toBe(`bld-${plotId}`);
    expect(typeof result.piece.pieceType).toBe("string");
    expect(result.piece.cell).toHaveProperty("i");
    expect(result.piece.cell).toHaveProperty("j");
    expect(result.piece.cell).toHaveProperty("k");
    expect(result.piece.foot.w).toBeGreaterThan(0);
    expect(result.piece.foot.d).toBeGreaterThan(0);
  }
});

test("picking open ground (far from any plot) resolves to no board piece", async ({ page }) => {
  // Deep in the sea/abyss, per terrain.js's own conventions -- guaranteed
  // off every plot in this world.
  const result = await page.evaluate(() => (window as any).__p4PickAt(0, -30000));
  expect(result.piece, "open ground far from any plot must not resolve to a board piece").toBeNull();
});

test("at least one of several real buildable plots resolves to a real board piece, proving the mechanism end to end", async ({ page }) => {
  const plots = await page.evaluate(() => {
    const city = (window as any).renderer3d._impl._city;
    return city.world.plots
      .filter((p: any) => p.buildable && p.buildable.xMax > p.buildable.xMin && p.buildable.zMax > p.buildable.zMin)
      .slice(0, 25)
      .map((p: any) => ({ x: (p.buildable.xMin + p.buildable.xMax) / 2, z: (p.buildable.zMin + p.buildable.zMax) / 2, plotId: p.id }));
  });
  expect(plots.length).toBeGreaterThan(0);

  let foundPiece = false;
  for (const p of plots) {
    const result = await page.evaluate(({ x, z }) => (window as any).__p4PickAt(x, z), { x: p.x, z: p.z });
    if (result.piece) {
      expect(result.piece.id).toBe(`bld-${p.plotId}`);
      foundPiece = true;
      break;
    }
  }
  expect(foundPiece, "none of 25 real buildable plots resolved to a board piece -- the pick-to-board wiring is not actually working").toBe(true);
});
