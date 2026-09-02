// NIGHT.md item 1: floating-panel overlaps (nav pad over the district card,
// the street HUD colliding with the top bar, ...) have recurred repeatedly
// because the panels that clear each other were positioned with hardcoded
// pixel offsets that go stale the moment the panel being cleared grows a row
// of content. "A test is the only thing that will stop it" -- and it has to
// measure REAL rendered geometry (getBoundingClientRect against a real CSS
// box model), not a hand-rolled reimplementation of the layout math that can
// drift from the real CSS same as the bug it's meant to catch. Node's test
// runner has no DOM (see test/run.mjs's own comment on why the rest of this
// suite is esbuild+node, not a browser), so this lives in Playwright,
// separate from `npm test` -- see playwright.config.ts.
import { test, expect, type Page } from "@playwright/test";

type Rect = { top: number; left: number; right: number; bottom: number };

const PANEL_SELECTORS: Record<string, string> = {
  topBar: ".top-bar-wrapper",
  navPad: "#nav-compass-pad",
  streetHud: "#street-level-hud",
  inspectCard: "#parcel-inspect-card",
  statusCard: "#floating-status-card",
  // OMITTED, AND THE PAIR IT WOULD HAVE CAUGHT SHIPPED. The welcome card and
  // the status card were anchored to the same `--topbar-bottom + 10px` on
  // mobile, both full width, both visible on load -- so the status card covered
  // the first thing a visitor reads. This suite could not see it, because the
  // most important panel on the page was not in the list.
  welcomeCard: "#welcome-mission-card",
  dock: "#director-dock",
};

async function visiblePanelRects(page: Page): Promise<Record<string, Rect>> {
  return await page.evaluate((sel) => {
    const out: Record<string, Rect> = {};
    for (const [name, selector] of Object.entries(sel)) {
      const el = document.querySelector(selector);
      if (!el) continue;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      out[name] = { top: r.top, left: r.left, right: r.right, bottom: r.bottom };
    }
    return out;
  }, PANEL_SELECTORS);
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function findOverlaps(rects: Record<string, Rect>): string[] {
  const names = Object.keys(rects);
  const found: string[] = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      if (overlaps(rects[names[i]], rects[names[j]])) found.push(`${names[i]} <-> ${names[j]}`);
    }
  }
  return found;
}

function assertNoOverlap(rects: Record<string, Rect>, label: string) {
  const found = findOverlaps(rects);
  expect(found, `${label}: overlapping panels found -- ${JSON.stringify(rects)}`).toEqual([]);
}

test("guardrail: the overlap check actually fires on a planted collision, not just passing by construction", () => {
  const a: Rect = { top: 0, left: 0, right: 100, bottom: 100 };
  const bOverlapping: Rect = { top: 50, left: 50, right: 150, bottom: 150 };
  const cClear: Rect = { top: 200, left: 200, right: 300, bottom: 300 };
  expect(overlaps(a, bOverlapping)).toBe(true);
  expect(overlaps(a, cClear)).toBe(false);
  expect(findOverlaps({ a, b: bOverlapping })).toEqual(["a <-> b"]);
  expect(findOverlaps({ a, c: cClear })).toEqual([]);
});

// THIS USED TO CLOSE THE PANEL IT WAS SUPPOSED TO BE TESTING.
//
// It clicked every element whose text is "✕", which includes the welcome card's
// own close button. So the card was gone before a single assertion ran, and the
// suite could not have caught it overlapping anything -- a check that removes
// its own subject and then reports no problem.
//
// Panels under test are exempt now. Everything else still gets dismissed,
// because the point of this helper is to clear incidental overlays, not to
// clear the thing being measured.
const KEEP_OPEN = new Set(["welcome-close-btn"]);

async function dismissOverlays(page: Page) {
  await page.evaluate((keep) => {
    document.querySelectorAll("*").forEach((el) => {
      if (keep.includes(el.id)) return;
      if (el.closest("#welcome-mission-card")) return;
      if (el.textContent && el.textContent.trim() === "✕") (el as HTMLElement).click();
    });
  }, [...KEEP_OPEN]);
}

// The district/NPC inspect card and the pipeline status card are both
// data-driven (need a real click target in the 3D scene, or a real pipeline
// run, respectively) -- forcing them open directly is the same technique
// the rest of this suite uses for "does the renderer draw a given state
// without throwing" checks; it exercises the same CSS the real open path
// does, without depending on a fragile pixel-perfect 3D click or spending
// a real model call (this repo runs zero-API-spend checks elsewhere too).
async function openInspectCard(page: Page) {
  await page.evaluate(() => {
    document.getElementById("inspect-parcel-id")!.textContent = "DISTRICT";
    (document.getElementById("parcel-inspect-card") as HTMLElement).style.display = "block";
    document.body.classList.add("inspecting-mobile");
  });
}
async function closeInspectCard(page: Page) {
  await page.evaluate(() => {
    (document.getElementById("parcel-inspect-card") as HTMLElement).style.display = "none";
    document.body.classList.remove("inspecting-mobile");
  });
}
async function openStatusCard(page: Page) {
  await page.evaluate(() => {
    (document.getElementById("floating-status-card") as HTMLElement).style.display = "block";
  });
}
async function closeStatusCard(page: Page) {
  await page.evaluate(() => {
    (document.getElementById("floating-status-card") as HTMLElement).style.display = "none";
  });
}

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 375, height: 812 },
];

for (const viewport of VIEWPORTS) {
  test.describe(`panel overlap sweep @ ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test.beforeEach(async ({ page }) => {
      await page.goto("/");
      await page.waitForSelector("#director-dock");
      await dismissOverlays(page);
    });

    test("baseline: nothing open", async ({ page }) => {
      assertNoOverlap(await visiblePanelRects(page), "baseline");
    });

    for (const mode of ["orbit", "walk", "drive", "fly"]) {
      test(`mode=${mode}: nothing else open`, async ({ page }) => {
        await page.click(`#btn-mode-${mode}`);
        await page.waitForTimeout(150);
        assertNoOverlap(await visiblePanelRects(page), `mode=${mode}`);
      });

      test(`mode=${mode}: district card open`, async ({ page }) => {
        await page.click(`#btn-mode-${mode}`);
        await openInspectCard(page);
        await page.waitForTimeout(150);
        assertNoOverlap(await visiblePanelRects(page), `mode=${mode}, inspect card open`);
        await closeInspectCard(page);
      });

      test(`mode=${mode}: status card open`, async ({ page }) => {
        await page.click(`#btn-mode-${mode}`);
        await openStatusCard(page);
        await page.waitForTimeout(150);
        assertNoOverlap(await visiblePanelRects(page), `mode=${mode}, status card open`);
        await closeStatusCard(page);
      });

      test(`mode=${mode}: district card AND status card open`, async ({ page }) => {
        await page.click(`#btn-mode-${mode}`);
        await openInspectCard(page);
        await openStatusCard(page);
        await page.waitForTimeout(150);
        assertNoOverlap(await visiblePanelRects(page), `mode=${mode}, both open`);
      });
    }
  });
}
