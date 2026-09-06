// I6: apply, persist, undo, LIVE -- driven through the real page, not the
// module. test/runGenerateRequest.test.ts already proved this exact chain
// (applyAndPersist -> store.save -> store.load -> a fresh world sees the
// layer) at the module level, against a plain createWorld() instance. This
// is the same proof against the real browser: a real page, a real
// browserAdapter() (IndexedDB/localStorage), and a real reload -- so a bug
// specific to the browser storage path, or to wiring the persisted state
// back into the live renderer's own instance on load, cannot hide behind a
// passing module-level test the way it did for D8's own undo persistence
// gap (see undo.js's header comment).
import { test, expect, type Page } from "@playwright/test";

async function realPlotId(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const city = (window as any).renderer3d._impl._city;
    const plot = city.world.plots.find((p: any) => p.className !== "PARK");
    if (!plot) throw new Error("no real plot found in the live world to target");
    return plot.id;
  });
}

async function layerIds(page: Page): Promise<string[]> {
  return await page.evaluate(() => (window as any).__i6LayerIds());
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("#director-dock");
  // Each test gets a clean slate -- otherwise a layer applied by one test
  // would still be there (correctly!) when the next one starts, since this
  // is testing REAL persistence across reloads.
  await page.evaluate(async () => {
    const ids = (window as any).__i6LayerIds();
    for (const id of ids) await (window as any).__i6UndoTestLayer(id);
  });
});

test("a layer applied through the real page is present after a real reload", async ({ page }) => {
  const address = await realPlotId(page);
  const layerId = `i6-e2e-${Date.now()}`;

  const applied = await page.evaluate(
    async ({ address, layerId }) => (window as any).__i6ApplyTestLayer({
      address, source: "(T) => new T.BoxGeometry(2.5, 3, 2.5)",
      verdict: { ok: true }, modelId: `${layerId}-model`, layerId, author: "e2e-test",
    }),
    { address, layerId },
  );
  expect(applied.ok, JSON.stringify(applied)).toBe(true);
  expect(await layerIds(page)).toContain(layerId);

  // THE ACTUAL PROOF: a real page.reload(), not re-reading the same
  // in-memory instance that just wrote it -- the exact gap D8's own undo
  // test was written to close for undo; this closes it for apply too.
  await page.reload();
  await page.waitForSelector("#director-dock");
  expect(await layerIds(page), "the applied layer did not survive a real page reload").toContain(layerId);
});

test("undoing a layer through the real page removes it, and the removal survives a reload", async ({ page }) => {
  const address = await realPlotId(page);
  const layerId = `i6-e2e-undo-${Date.now()}`;

  await page.evaluate(
    async ({ address, layerId }) => (window as any).__i6ApplyTestLayer({
      address, source: "(T) => new T.BoxGeometry(2.5, 3, 2.5)",
      verdict: { ok: true }, modelId: `${layerId}-model`, layerId, author: "e2e-test",
    }),
    { address, layerId },
  );
  expect(await layerIds(page)).toContain(layerId);

  const undone = await page.evaluate((id) => (window as any).__i6UndoTestLayer(id), layerId);
  expect(undone.ok, JSON.stringify(undone)).toBe(true);
  expect(await layerIds(page)).not.toContain(layerId);

  // Not just gone from the same in-memory session -- gone after a reload,
  // which is the only way to tell "removed" apart from "removed until the
  // next page load brings it straight back" (undo.js's own header names
  // this exact failure mode as the reason it always re-persists).
  await page.reload();
  await page.waitForSelector("#director-dock");
  expect(await layerIds(page), "the undone layer came back after a real page reload").not.toContain(layerId);
});
