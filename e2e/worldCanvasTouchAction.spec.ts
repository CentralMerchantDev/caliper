// B6 -- the touch-action gap on #world-canvas, found (docs/audits/
// U4-NAV-WHEEL.md) from reading public/index.html's CSS alone: no
// `touch-action` property on `#world-canvas, #world-canvas-2d`, default
// `auto`. That trace was never wrong about the CSS -- it was incomplete
// about the RUNTIME. Measured here on a real viewport instead: when
// Renderer3D constructs successfully, world-render-3d.js's own
// `_bindOrbitControls()` (public/world-render-3d.js:6373) already sets
// `canvas.style.touchAction = "none"` inline, which wins the cascade over
// any stylesheet rule. There was no defect to fix -- what was missing was
// a gate, since nothing protected that fact from regressing, and nothing
// would have caught the equally real mistake of copying `touch-action:
// none` onto `#world-canvas-2d` too (which has ZERO pointer/wheel/gesture
// listeners of its own anywhere in this codebase -- a passive 2D draw
// surface -- so disabling native touch there removes the visitor's only
// way to interact with it, with nothing supplied to replace it).
//
// COMMENT-IMMUNE BY CONSTRUCTION. A regex over public/index.html's raw CSS
// text (`touch-action:\s*none`) is exactly the test/rawSourceScan.test.ts
// defect shape this lane spent 2026-09-11 eliminating: a comment
// mentioning the rule, with the real rule absent, satisfies it. A real
// browser's getComputedStyle() cannot be fooled this way -- a CSS/JS
// comment has zero effect on what is actually applied, which is why this
// is measured on a live page, not the stylesheet's own text.
import { test, expect } from "@playwright/test";

test("world-canvas disables default touch gestures when the 3D renderer is live, so its own pointer-driven pan/rotate/zoom is not fought by the browser", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(1500);
  const touchAction = await page.evaluate(() => {
    const c = document.getElementById("world-canvas");
    return c ? getComputedStyle(c).touchAction : null;
  });
  expect(touchAction).toBe("none");
});

test("world-canvas-2d has no gesture JS of its own, so it must stay at the browser default -- disabling native touch there would remove the visitor's only way to interact with it", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(1500);
  const touchAction = await page.evaluate(() => {
    const c = document.getElementById("world-canvas-2d");
    return c ? getComputedStyle(c).touchAction : null;
  });
  expect(touchAction).toBe("auto");
});
