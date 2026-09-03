// Does the top bar still expose every control it used to?
//
// The regroup moved 24 always-visible pills into five disclosure menus. That is
// only an improvement if every control is still REACHABLE -- a bar that hides
// things it cannot reopen is worse than a cluttered one. A screenshot cannot
// answer that question, so this asks it directly: it drives the real page in a
// real browser and asserts on behaviour, not on pixels.
//
// Each check is paired where a pair is meaningful: a menu that opens must also
// close, and closing one must not close the others by accident.
//
//   node scripts/check-topbar.mjs
//
// Exit 0 = every assertion held. Exit 1 prints which one did not.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.env.ROOT || process.cwd();
const PUBLIC = path.join(ROOT, "public");

// Every control the pre-regroup bar exposed. If one of these stops being
// reachable, this list is what notices.
const CONTROLS = [
  "village-rules-trigger", "arch-drawer-trigger", "portfolio-btn", "resume-btn",
  "datum-btn", "world-clock-badge", "world-play-pause", "bm-town", "bm-forge",
  "bm-datum", "bm-docks", "bm-tower", "bm-borough", "reset-cam-btn", "tod-day",
  "tod-dusk", "tod-night", "view-3d", "view-plan", "roof-exterior",
  "roof-cutaway", "tour-toggle-btn", "grid-toggle-btn", "sound-toggle-btn",
  "drone-tour-btn", "export-render-btn", "research-paper-trigger",
  "welcome-guide-trigger", "cmd-k-trigger",
];
const MENUS = ["mark", "how", "places", "view", "more"];

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".webp": "image/webp", ".png": "image/png", ".hdr": "application/octet-stream", ".txt": "text/plain", ".css": "text/css" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(PUBLIC, url === "/" ? "/index.html" : url === "/world-source" ? "/sim-baseline.generated.js" : url);
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end("nf"); }
  res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

// The world is not under test here and building it blocks the main thread past
// any sane timeout, so the renderer is stubbed.
//
// WHAT THAT COSTS, STATED PLAINLY. This file replaces world-render-3d.js,
// world-render.js and city-render.js before the page loads, so it can say
// NOTHING about those three. A blind audit put a bare `throw` at module scope in
// the real renderer and this check stayed green. An earlier version of this
// comment claimed the opposite -- "if that ever stops being true, this check
// will start failing" -- which was false in the only direction that matters.
//
// That gap is covered by test/modulesLoad.test.ts in the node suite, which
// imports the real files. Do not re-add the claim here.
// The stub must satisfy what index.html actually IMPORTS -- { WorldRenderer,
// THREE } -- or the page's module throws on load and NOT ONE handler binds.
// The first version of this stub exported neither, which is why an earlier
// version of check 6 could never have passed: it was measuring a page whose
// buttons were inert, and would have read that as a defect in the menus.
const STUB = `
  export const THREE = new Proxy({}, { get: () => function () { return new Proxy({}, { get: () => function () {} }); } });
  const noop = () => {};
  export class WorldRenderer {
    constructor() {
      // navigate.js reads heading, pitch and range off the implementation and
      // calls focusAtScreen. A stub that lacks them would make the readout show
      // dashes and the focus gesture do nothing, and this file would read that
      // as a defect in the navigation rather than in the stub.
      this._impl = { _orbit: { delta: 0.7853981634, pitch: 0.38 }, _camDist: 480, _cityMode: true };
      this.lastFocus = null;
      this.focusAtScreen = (x, y) => {
        // The miss path is driven by a flag, not by a coordinate. The first
        // version missed when x > 1200 -- which is where the right-hand rail
        // sits, so the double-click never reached the canvas at all and the
        // check was measuring the rail rather than the miss.
        if (window.__navForceMiss) return { hit: false, reason: "nothing under the pointer" };
        this._impl._camDist = Math.max(4, this._impl._camDist * 0.45);
        this.lastFocus = { x, y, dist: this._impl._camDist };
        return { hit: true, point: { x: 10, y: 0, z: 20 }, dist: this._impl._camDist };
      };
      this.hidePivotMarker = () => { this.pivotHidden = true; };
      this.rotateCamera = (a) => { this._impl._orbit.delta += a; };
      this.zoomCamera = (f) => { this._impl._camDist *= f; };
      return new Proxy(this, { get: (t, k) => (k in t ? t[k] : (k === 'then' ? undefined : noop)) });
    }
  }
  export function buildWorld() { return { stats: {} }; }
  export function buildProps() {}
  export default {};
`;
await page.route("**/{city-render,world-render-3d,world-render}.js", (r) =>
  r.fulfill({ status: 200, contentType: "text/javascript", body: STUB }));

// A page error here means one of the files this check does NOT stub -- menus.js,
// workbench.js, navigate.js, index.html's own module -- failed to load. Those it
// does cover. Surfaced rather than swallowed, because a silent load failure is
// what made check 6 lie.
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 200)));
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "load", timeout: 120000 });
await page.waitForTimeout(2500);

const fails = [];
const ok = (name, cond, detail = "") => { lastStep = name; if (!cond) fails.push(name + (detail ? " -- " + detail : "")); };

// An uncaught Playwright timeout used to print a 40-line call log and never say
// WHICH assertion it died on. Every ok() records the last thing that passed, so
// a crash reports where it was instead of leaving it to be guessed at.
let lastStep = "startup";
process.on("uncaughtException", (e) => {
  // The failures found BEFORE the crash used to be discarded. Under one earlier
  // mutation this printed only a timeout while `fails` already held the real
  // finding -- so the crash hid the answer it had already computed.
  console.error(`CRASHED after: ${lastStep}\n  ${String(e).split("\n")[0]}`);
  if (fails.length) {
    console.error(`and ${fails.length} assertion(s) had already failed:`);
    for (const f of fails) console.error("  - " + f);
  }
  process.exit(1);
});

const expanded = (m) => page.getAttribute(`#menu-${m}`, "aria-expanded");
const panelHidden = (m) => page.evaluate((id) => document.getElementById("menupanel-" + id).hidden, m);
const openMenu = async (m) => { await page.click(`#menu-${m}`); await page.waitForTimeout(120); };

// 1. every control exists exactly once AND can actually be used.
//
// This loop used to assert presence and its comment claimed reachability. A
// blind audit proved the gap: display:none passed, and disabled passed. Both
// now fail -- except for the controls this build intentionally disables, which
// are named rather than tolerated silently.
//
// WHICH controls are disabled is NOT decided here, and this file is not
// entitled to an opinion about it. Three of them -- the 3D view, the roof
// cutaway, the flythrough -- are switched off by reportUnavailableControl()
// according to what the RENDERER reports it can do, and this harness replaces
// the renderer with a stub. So whether view-3d is disabled on the real page is
// something this check genuinely cannot determine.
//
// What it can do is pin the SET. Any control that becomes disabled, or stops
// being disabled, changes this list and is caught -- without the file pretending
// to know which state is correct. If the set changes because the product
// changed, update the baseline and say why in the commit.
const DISABLED_UNDER_STUB = ["drone-tour-btn", "roof-cutaway", "view-3d"];
const disabledNow = [];
for (const id of CONTROLS) {
  const st = await page.evaluate((i) => {
    const all = document.querySelectorAll("[id='" + i + "']");
    if (all.length !== 1) return { n: all.length };
    const el = all[0];
    const cs = getComputedStyle(el);
    // Inside a closed menu panel a control is legitimately not rendered, so
    // "hidden" here means hidden by its OWN styles, not by an ancestor popup.
    const inClosedPanel = !!el.closest(".menu-panel[hidden], .wb-grip-panel[hidden]");
    return {
      n: 1,
      disabled: !!el.disabled || el.getAttribute("aria-disabled") === "true",
      selfHidden: cs.display === "none" || cs.visibility === "hidden",
      inClosedPanel,
    };
  }, id);
  ok(`control ${id} present exactly once`, st.n === 1, `found ${st.n}`);
  if (st.n !== 1) continue;
  ok(`control ${id} is not hidden by its own styles`, st.selfHidden === false);
  if (st.disabled) disabledNow.push(id);
}
disabledNow.sort();
ok("the set of disabled controls is unchanged",
   JSON.stringify(disabledNow) === JSON.stringify([...DISABLED_UNDER_STUB].sort()),
   `now ${JSON.stringify(disabledNow)}, baseline ${JSON.stringify([...DISABLED_UNDER_STUB].sort())}`);

// 2. every menu starts closed -- the point of the regroup
for (const m of MENUS) {
  ok(`menu ${m} starts closed`, (await panelHidden(m)) === true);
  ok(`menu ${m} starts aria-expanded=false`, (await expanded(m)) === "false");
}

// 3. every menu opens, and its contents become visible (not merely un-hidden)
for (const m of MENUS) {
  await openMenu(m);
  ok(`menu ${m} opens`, (await panelHidden(m)) === false);
  ok(`menu ${m} reports expanded`, (await expanded(m)) === "true");
  const vis = await page.evaluate((id) => {
    const p = document.getElementById("menupanel-" + id);
    const items = p.querySelectorAll("button, a");
    let n = 0;
    for (const el of items) { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) n++; }
    return { total: items.length, visible: n };
  }, m);
  ok(`menu ${m} items are visible`, vis.total > 0 && vis.visible === vis.total, JSON.stringify(vis));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(80);
  ok(`menu ${m} closes on Escape`, (await panelHidden(m)) === true);
}

// 4. only one panel at a time -- opening a second must close the first
await openMenu("places");
await openMenu("view");
ok("opening a second menu closes the first", (await panelHidden("places")) === true);
ok("the second menu is open", (await panelHidden("view")) === false);

// 5. clicking the world closes the menu
await page.mouse.click(800, 700);
await page.waitForTimeout(120);
ok("outside click closes the menu", (await panelHidden("view")) === true);

// 6. a menu item still fires its own listener.
//
// The first version of this check pressed Grid, and it failed for two reasons
// that were both mine and neither a real defect: the grid handler toggles a
// CLASS, not aria-pressed, so the attribute it asserted on never moves; and it
// calls renderer3d.toggleGrid(), which this file stubs out. A control whose
// behaviour depends on the stub cannot testify about the menu.
//
// Overview can. It shows and hides the welcome card through the DOM only, so a
// change in the card's visibility is caused by the click and nothing else.
await openMenu("how");
const cardBefore = await page.isVisible("#welcome-mission-card");
await page.click("#welcome-guide-trigger");
await page.waitForTimeout(300);
const cardAfter = await page.isVisible("#welcome-mission-card");
ok("a menu item still runs its own handler", cardBefore !== cardAfter, `card visible ${cardBefore} -> ${cardAfter}`);
ok("the menu closes after an item is used", (await panelHidden("how")) === true);

// and the pair: pressing it again puts the card back, so the control is a
// toggle rather than a one-way trip through a menu the user then has to hunt for
await openMenu("how");
await page.click("#welcome-guide-trigger");
await page.waitForTimeout(300);
ok("and the same item reverses it", (await page.isVisible("#welcome-mission-card")) === cardBefore);

// 7. the trigger keeps its own accessible name (a bare caret is not a label)
for (const m of MENUS) {
  const label = (await page.textContent(`#menu-${m}`)).replace(/[▾\s]+/g, "");
  ok(`menu ${m} trigger has a text label`, label.length >= 3, `"${label}"`);
}

// 8. THE WANDERING POINTER. Mark: "make sure they are not made so that a slight
// movement takes you away or kills the drop down." So: open a menu, then move
// the pointer a long way off it -- across the gap, over the world, back again --
// and it must still be open. This is the assertion the complaint asks for.
await openMenu("places");
for (const [x, y] of [[700, 120], [400, 500], [1200, 800], [60, 60], [820, 300]]) {
  await page.mouse.move(x, y);
  await page.waitForTimeout(60);
}
ok("a menu survives the pointer wandering off it", (await panelHidden("places")) === false);
// paired: it still closes when actually told to
await page.keyboard.press("Escape");
await page.waitForTimeout(80);
ok("and still closes on Escape afterwards", (await panelHidden("places")) === true);

// 9. an item that changes a VIEW SETTING leaves the menu open, so you can
// compare Dusk against Night without reopening between each press
await openMenu("view");
await page.click("#tod-dusk");
await page.waitForTimeout(200);
ok("a settings item leaves the menu open", (await panelHidden("view")) === false);
await page.click("#tod-night");
await page.waitForTimeout(200);
ok("and a second one still leaves it open", (await panelHidden("view")) === false);
await page.keyboard.press("Escape");

// The intro card is dismissed here on purpose. Check 6 already proved it
// toggles; leaving it up would mean the docking checks below were partly
// testing the card, and a test that measures two things at once cannot say
// which one broke.
await page.click("#welcome-close-btn").catch(() => {});
await page.waitForTimeout(150);

// 10. the workbench: rails exist and every panel starts in its home rail
const HOMES = { nav: "left", inspect: "left", status: "right", build: "right" };
for (const r of ["left", "right", "top", "bottom"]) {
  ok(`rail ${r} exists`, (await page.locator(`#wb-rail-${r}`).count()) === 1);
}
for (const [key, home] of Object.entries(HOMES)) {
  const where = await page.evaluate((k) => {
    const el = document.querySelector(`[data-wb-panel="${k}"]`);
    return el ? el.parentElement.id : "MISSING";
  }, key);
  ok(`panel ${key} starts in the ${home} rail`, where === `wb-rail-${home}`, where);
}

// 11. every region is reachable from the grip menu, and the panel really moves
for (const region of ["right", "top", "bottom", "left"]) {
  await page.click('[data-wb-panel="nav"] .wb-grip-menu');
  await page.waitForTimeout(90);
  await page.click(`[data-wb-panel="nav"] .wb-grip-panel button[data-region="${region}"]`);
  await page.waitForTimeout(140);
  const where = await page.evaluate(() => document.querySelector('[data-wb-panel="nav"]').parentElement.id);
  ok(`nav can be docked ${region}`, where === `wb-rail-${region}`, where);
}
// float is not a rail, so it is checked separately: it leaves the rails entirely
await page.click('[data-wb-panel="nav"] .wb-grip-menu');
await page.waitForTimeout(90);
await page.click('[data-wb-panel="nav"] .wb-grip-panel button[data-region="float"]');
await page.waitForTimeout(140);
const floated = await page.evaluate(() => {
  const el = document.querySelector('[data-wb-panel="nav"]');
  const r = el.getBoundingClientRect();
  return { parent: el.parentElement.id, cls: el.className.includes("wb-float"),
           onScreen: r.top >= 0 && r.left >= 0 && r.top < window.innerHeight };
});
ok("nav can float free", floated.parent === "wb-float-layer" && floated.cls, JSON.stringify(floated));
ok("a floating panel stays on screen", floated.onScreen, JSON.stringify(floated));

// 12. the layout survives a reload -- otherwise "move it where you like" is a
// setting the visitor has to redo every visit
await page.reload({ waitUntil: "load" });
await page.waitForTimeout(2200);
const afterReload = await page.evaluate(() => {
  const el = document.querySelector('[data-wb-panel="nav"]');
  return el ? el.parentElement.id : "MISSING";
});
ok("the layout survives a reload", afterReload === "wb-float-layer", afterReload);

// 13. reset puts everything home again
await page.click('[data-wb-panel="nav"] .wb-grip-menu');
await page.waitForTimeout(90);
await page.click('[data-wb-panel="nav"] .wb-grip-reset');
await page.waitForTimeout(160);
for (const [key, home] of Object.entries(HOMES)) {
  const where = await page.evaluate((k) => document.querySelector(`[data-wb-panel="${k}"]`)?.parentElement.id, key);
  ok(`reset returns ${key} home`, where === `wb-rail-${home}`, where);
}

// 14. a corrupt saved layout costs the visitor their layout, never their page
await page.evaluate(() => localStorage.setItem("caliper.workbench.v1", '{"nav":{"region":"upside-down"},"build":42,"zzz":'));
await page.reload({ waitUntil: "load" });
await page.waitForTimeout(2200);
const afterCorrupt = await page.evaluate(() => ({
  nav: document.querySelector('[data-wb-panel="nav"]')?.parentElement.id,
  menusAlive: !!document.getElementById("menu-places"),
}));
ok("a corrupt saved layout falls back to the defaults", afterCorrupt.nav === "wb-rail-left", JSON.stringify(afterCorrupt));
ok("and the page still works", afterCorrupt.menusAlive === true);

// 15. the command centre hides and comes back, and keeps its own way back
await page.click("#cc-collapse");
await page.waitForTimeout(200);
const collapsed = await page.evaluate(() => {
  const cc = document.querySelector(".command-centre");
  return { cls: cc.classList.contains("is-collapsed"),
           h: Math.round(cc.getBoundingClientRect().height),
           reopenerVisible: document.getElementById("cc-collapse").getBoundingClientRect().height > 0 };
});
ok("the command centre collapses", collapsed.cls && collapsed.h < 46, JSON.stringify(collapsed));
ok("the collapsed bar keeps its own reopener", collapsed.reopenerVisible);
await page.click("#cc-collapse");
await page.waitForTimeout(200);
ok("and it comes back", (await page.evaluate(() => !document.querySelector(".command-centre").classList.contains("is-collapsed"))));

// The intro card comes BACK on every reload, and checks 12 and 14 both reload.
// It covers the middle of the frame, so the double-click below was landing on
// the card rather than the canvas -- which read as "focus does not work" when
// what actually happened is that the pointer never reached the world. Dismissed
// again here, for the same reason as before check 10.
await page.click("#welcome-close-btn").catch(() => {});
await page.waitForTimeout(150);

// 16. NAVIGATION. Mark: "it is hard to navigate through the world... pick a
// point and make it the centre of focus", and "it doesn't need the entire box
// around it".
ok("the nav panel no longer draws a box", await page.evaluate(() => {
  const cs = getComputedStyle(document.getElementById("nav-compass-pad"));
  const t = (v) => v === "none" || v === "rgba(0, 0, 0, 0)" || v === "transparent" || v === "0px";
  return t(cs.backgroundColor) && (cs.borderTopWidth === "0px") && t(cs.boxShadow);
}));

for (const id of ["nav-read-heading", "nav-read-pitch", "nav-read-dist", "nav-north-up", "nav-zoom-slider", "nav-clear-pivot"]) {
  ok(`nav control ${id} exists`, (await page.locator("#" + id).count()) === 1);
}

// the readout must report REAL numbers, not placeholders
await page.waitForTimeout(400);
const readout = await page.evaluate(() => ({
  h: document.getElementById("nav-read-heading").textContent,
  p: document.getElementById("nav-read-pitch").textContent,
  d: document.getElementById("nav-read-dist").textContent,
}));
ok("heading reads a bearing and a compass point", /^\d+° (N|NE|E|SE|S|SW|W|NW)$/.test(readout.h), readout.h);
ok("pitch reads degrees", /^-?\d+°$/.test(readout.p), readout.p);
ok("range reads a distance", /^(\d+m|\d+\.\d+km)$/.test(readout.d), readout.d);

// double-click focuses, and CLOSES THE DISTANCE -- the whole point
const before = await page.evaluate(() => window.renderer3d._impl._camDist);
await page.mouse.dblclick(600, 500);
await page.waitForTimeout(200);
const after = await page.evaluate(() => window.renderer3d._impl._camDist);
ok("double-click focuses", (await page.evaluate(() => !!window.renderer3d.lastFocus)));
// The GESTURE is what this file can testify about: the double-click reached the
// canvas and the renderer was asked to focus. Whether the range then closes is
// the renderer's arithmetic, and this harness stubs the renderer -- an earlier
// version asserted it here and the assertion could never fail, because it was
// reading the stub's own numbers back. That rule is defended by
// test/focusDistance.test.ts, against the real exported function.
ok("the stub moved, so the call carried through", after !== before, `${before} -> ${after}`);

// the paired case: a miss SAYS SO rather than doing nothing in silence
await page.evaluate(() => { window.__navForceMiss = true; });
await page.mouse.dblclick(640, 470);
await page.waitForTimeout(150);
await page.evaluate(() => { window.__navForceMiss = false; });
const flashed = await page.evaluate(() => {
  const el = document.querySelector(".nav-flash");
  return el ? el.textContent : null;
});
ok("a missed focus says so", flashed === "nothing there to focus on", String(flashed));

// north-up turns the camera toward zero rather than doing nothing
await page.evaluate(() => { window.renderer3d._impl._orbit.delta = 1.5; });
await page.click("#nav-north-up");
await page.waitForTimeout(150);
const heading = await page.evaluate(() => Math.abs(window.renderer3d._impl._orbit.delta));
ok("north-up faces north", heading < 0.01, String(heading));

// the range slider actually moves the camera
const preSlide = await page.evaluate(() => window.renderer3d._impl._camDist);
await page.evaluate(() => {
  const s = document.getElementById("nav-zoom-slider");
  s.value = "5";
  s.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.waitForTimeout(150);
const postSlide = await page.evaluate(() => window.renderer3d._impl._camDist);
ok("the range slider moves the camera", Math.abs(postSlide - preSlide) > 1, `${preSlide} -> ${postSlide}`);

// 17. DRAG. Until now nothing exercised wireDrag or zoneAt at all -- removing
// the drag wiring entirely, or making every drop zone dead, both went green,
// because every docking check went through the grip MENU. A pointer drag is the
// gesture the feature was asked for; it needs its own evidence.
await page.click('[data-wb-panel="nav"] .wb-grip-menu');
await page.waitForTimeout(90);
await page.click('[data-wb-panel="nav"] .wb-grip-panel button[data-region="left"]');
await page.waitForTimeout(160);
const grip = await page.evaluate(() => {
  const r = document.querySelector('[data-wb-panel="nav"] .wb-grip').getBoundingClientRect();
  return { x: Math.round(r.left + 30), y: Math.round(r.top + r.height / 2) };
});
await page.mouse.move(grip.x, grip.y);
await page.mouse.down();
await page.mouse.move(grip.x + 60, grip.y + 40, { steps: 4 });   // past the 5px threshold
const zonesLit = await page.evaluate(() => document.getElementById("wb-zones").classList.contains("is-active"));
ok("dragging a grip lights the drop zones", zonesLit === true);
await page.mouse.move(1560, 460, { steps: 8 });                   // into the right-hand zone
await page.waitForTimeout(120);   // pointermove -> dragTo -> class toggle is not synchronous with the move
const hot = await page.evaluate(() => document.querySelector(".wb-zone.is-hot")?.dataset.region || null);
ok("the zone under the pointer highlights", hot === "right", String(hot));
await page.mouse.up();
await page.waitForTimeout(200);
const dropped = await page.evaluate(() => document.querySelector('[data-wb-panel="nav"]').parentElement.id);
ok("dropping in a zone docks the panel there", dropped === "wb-rail-right", dropped);

// paired: a drop over open world floats it rather than snapping to an edge
const grip2 = await page.evaluate(() => {
  const r = document.querySelector('[data-wb-panel="nav"] .wb-grip').getBoundingClientRect();
  return { x: Math.round(r.left + 30), y: Math.round(r.top + r.height / 2) };
});
await page.mouse.move(grip2.x, grip2.y);
await page.mouse.down();
await page.mouse.move(760, 460, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(200);
ok("dropping away from an edge floats the panel",
   (await page.evaluate(() => document.querySelector('[data-wb-panel="nav"]').parentElement.id)) === "wb-float-layer");

// and a click on the grip that does NOT move must not be read as a drag
await page.click('[data-wb-panel="nav"] .wb-grip-menu');
await page.waitForTimeout(90);
await page.click('[data-wb-panel="nav"] .wb-grip-panel button[data-region="left"]');
await page.waitForTimeout(160);
const before17 = await page.evaluate(() => document.querySelector('[data-wb-panel="nav"]').parentElement.id);
const g3 = await page.evaluate(() => {
  const r = document.querySelector('[data-wb-panel="nav"] .wb-grip').getBoundingClientRect();
  return { x: Math.round(r.left + 30), y: Math.round(r.top + r.height / 2) };
});
await page.mouse.move(g3.x, g3.y); await page.mouse.down();
await page.mouse.move(g3.x + 2, g3.y + 2); await page.mouse.up();
await page.waitForTimeout(150);
ok("a 2px twitch on the grip is not a drag",
   (await page.evaluate(() => document.querySelector('[data-wb-panel="nav"]').parentElement.id)) === before17);

// 18. A WELL-FORMED but INVALID saved layout. The existing corrupt-layout check
// writes truncated JSON, so JSON.parse throws and readLayout returns before the
// per-field validation it claims to be about ever runs. Deleting that validation
// left the check green. This payload parses, so the field guards are the only
// thing standing between it and a crash.
await page.evaluate(() => localStorage.setItem("caliper.workbench.v1",
  JSON.stringify({ nav: { region: "upside-down" }, build: 42, status: { region: "float" }, zzz: { region: "left" } })));
await page.reload({ waitUntil: "load" });
await page.waitForTimeout(2200);
const afterBogus = await page.evaluate(() => ({
  nav: document.querySelector('[data-wb-panel="nav"]')?.parentElement.id,
  build: document.querySelector('[data-wb-panel="build"]')?.parentElement.id,
  status: document.querySelector('[data-wb-panel="status"]')?.parentElement.id,
  grips: document.querySelectorAll(".wb-grip").length,
  menusAlive: !!document.getElementById("menu-places"),
}));
ok("an unknown region falls back to the panel's home", afterBogus.nav === "wb-rail-left", JSON.stringify(afterBogus));
ok("a non-object panel entry falls back too", afterBogus.build === "wb-rail-right", JSON.stringify(afterBogus));
ok("a float with no coordinates is not treated as a float", afterBogus.status === "wb-rail-right", JSON.stringify(afterBogus));
ok("every panel still gets its grip", afterBogus.grips === 4, String(afterBogus.grips));
ok("and the page still works", afterBogus.menusAlive === true);
await page.evaluate(() => localStorage.removeItem("caliper.workbench.v1"));

// 19. KEYBOARD. A menu that can only be opened and walked with a mouse is a
// menu some visitors do not have. None of this was covered.
await page.click("#welcome-close-btn").catch(() => {});
await page.focus("#menu-places");
await page.keyboard.press("Enter");
await page.waitForTimeout(140);
ok("Enter opens a menu", (await panelHidden("places")) === false);
ok("and focus lands on the first item",
   (await page.evaluate(() => document.activeElement?.id)) === "bm-town",
   String(await page.evaluate(() => document.activeElement?.id)));
await page.keyboard.press("ArrowDown");
ok("ArrowDown moves to the next item",
   (await page.evaluate(() => document.activeElement?.id)) === "bm-forge",
   String(await page.evaluate(() => document.activeElement?.id)));
await page.keyboard.press("End");
ok("End jumps to the last item",
   (await page.evaluate(() => document.activeElement?.id)) === "reset-cam-btn",
   String(await page.evaluate(() => document.activeElement?.id)));
await page.keyboard.press("ArrowDown");
ok("and it wraps round to the first",
   (await page.evaluate(() => document.activeElement?.id)) === "bm-town");
await page.keyboard.press("Escape");
await page.waitForTimeout(100);
ok("Escape returns focus to the trigger",
   (await page.evaluate(() => document.activeElement?.id)) === "menu-places");

// 20. ESCAPE MUST NOT SWALLOW EVERYONE ELSE. The capture-phase handler used to
// stopPropagation whenever a menu was open, which silently disabled Escape for
// Tour, the command palette, modals and the grip menus.
const escapeReaches = await page.evaluate(async () => {
  let heard = 0;
  const spy = () => { heard++; };
  document.addEventListener("keydown", spy);          // bubble phase, like the others
  const r = {};
  document.getElementById("menu-view").click();
  await new Promise((s) => setTimeout(s, 120));
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await new Promise((s) => setTimeout(s, 80));
  r.whileOpen = heard;                                 // the menu consumed it: 0
  heard = 0;
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await new Promise((s) => setTimeout(s, 80));
  r.whenNothingOpen = heard;                           // must travel on: 1
  document.removeEventListener("keydown", spy);
  return r;
});
ok("Escape is consumed while a menu is open", escapeReaches.whileOpen === 0, JSON.stringify(escapeReaches));
ok("Escape reaches other handlers when nothing of ours is open",
   escapeReaches.whenNothingOpen === 1, JSON.stringify(escapeReaches));

// 21. The nav paths nothing was checking.
await page.mouse.move(700, 500);
await page.evaluate(() => { window.renderer3d.lastFocus = null; });
await page.keyboard.press("f");
await page.waitForTimeout(160);
ok("F focuses at the pointer", (await page.evaluate(() => !!window.renderer3d.lastFocus)));
// and without a pointer position it uses the centre rather than doing nothing
await page.evaluate(() => { window.renderer3d.lastFocus = null; });
await page.evaluate(() => document.getElementById("nav-clear-pivot").click());
await page.waitForTimeout(120);
ok("clear-pivot reaches the renderer", (await page.evaluate(() => window.renderer3d.pivotHidden === true)));

// distance formatting by VALUE, not by shape: the old regex accepted 480m
// rendered as "0.5km" when the km and m branches were swapped.
const fmt = await page.evaluate(async () => {
  const out = {};
  window.renderer3d._impl._camDist = 480; await new Promise((s) => setTimeout(s, 320));
  out.m = document.getElementById("nav-read-dist").textContent;
  window.renderer3d._impl._camDist = 2500; await new Promise((s) => setTimeout(s, 320));
  out.km = document.getElementById("nav-read-dist").textContent;
  return out;
});
ok("480 m reads as metres", fmt.m === "480m", fmt.m);
ok("2500 m reads as kilometres", fmt.km === "2.5km", fmt.km);

// the slider is logarithmic; at the halfway point a linear scale would put the
// camera near 23000 m, a log scale near 430 m
await page.evaluate(() => {
  const s = document.getElementById("nav-zoom-slider");
  s.value = "50"; s.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.waitForTimeout(150);
const mid = await page.evaluate(() => window.renderer3d._impl._camDist);
ok("the range slider is logarithmic, not linear", mid > 200 && mid < 1200, String(Math.round(mid)));

ok("the page loaded without a module error in an unstubbed file",
   pageErrors.length === 0, pageErrors.join(" | "));

await browser.close();
server.close();

if (fails.length) {
  console.error(`FAIL (${fails.length}):`);
  for (const f of fails) console.error("  - " + f);
  process.exit(1);
}
console.log(`top bar OK: ${CONTROLS.length} controls reachable, ${MENUS.length} menus open/close/isolate, items still fire`);
