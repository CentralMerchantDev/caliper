// Photograph the PAGE CHROME -- the command centre, the rails, the panels.
//
// scripts/shoot.mjs photographs the WORLD, through the real renderer, and takes
// about 30 seconds a view. This does the opposite job: it stubs the renderer out
// so the page paints immediately, and captures the interface drawn over it.
//
// The two are not interchangeable and neither replaces the other. Anything about
// the camera, the terrain or the pivot marker needs shoot.mjs and a real frame;
// this file cannot see any of it, and a screenshot from here is not evidence
// about the world.
//
//   node scripts/shoot-ui.mjs                        -> .shots/ui.png
//   OPEN=menu-view node scripts/shoot-ui.mjs         -> with that menu open
//   DISMISS=1 node scripts/shoot-ui.mjs              -> intro card closed first
//   NAME=nav OUT=.shots node scripts/shoot-ui.mjs
//
// It exists because judging a layout change by deploying it is a slow loop with
// a human in the middle of it, and the loop is what this project is about.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.env.ROOT || process.cwd();
const PUBLIC = path.join(ROOT, "public");
const OUT = process.env.OUT || path.join(ROOT, ".shots");
const NAME = process.env.NAME || "ui";
fs.mkdirSync(OUT, { recursive: true });

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

// The same stub the top-bar check uses, and for the same reason: it has to
// satisfy what index.html imports, or the page's module throws on load and the
// screenshot shows an interface with nothing wired to it.
const STUB = `
  export const THREE = new Proxy({}, { get: () => function () { return new Proxy({}, { get: () => function () {} }); } });
  const noop = () => {};
  export class WorldRenderer {
    constructor() {
      this._impl = { _orbit: { delta: 2.24, pitch: 0.41 }, _camDist: 1840, _cityMode: true };
      this.focusAtScreen = () => ({ hit: true, point: { x: 1, y: 0, z: 2 }, dist: 800 });
      this.hidePivotMarker = noop; this.rotateCamera = noop; this.zoomCamera = noop;
      return new Proxy(this, { get: (t, k) => (k in t ? t[k] : (k === 'then' ? undefined : noop)) });
    }
  }
  export function buildWorld() { return { stats: {} }; }
  export function buildProps() {}
  export default {};
`;

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({
  viewport: { width: Number(process.env.W || 1600), height: Number(process.env.H || 900) },
});
const errs = [];
page.on("pageerror", (e) => errs.push(String(e).slice(0, 160)));
await page.route("**/{city-render,world-render-3d,world-render}.js", (r) =>
  r.fulfill({ status: 200, contentType: "text/javascript", body: STUB }));
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "load", timeout: 120000 });
await page.waitForTimeout(Number(process.env.WAIT || 2500));

// A flat wash where the world would be. Not a render -- just enough tone that
// contrast against the chrome can be judged rather than guessed at.
await page.addStyleTag({ content: "canvas{background:linear-gradient(#9fb8c9,#c8d4d8 55%,#7f8f7a)!important}" });

if (process.env.DISMISS) await page.click("#welcome-close-btn").catch(() => {});
if (process.env.OPEN) { await page.click("#" + process.env.OPEN).catch(() => {}); await page.waitForTimeout(350); }

const out = path.join(OUT, NAME + ".png");
await page.screenshot({ path: out });
console.log("shot ->", out);
if (errs.length) console.log("PAGE ERRORS:", [...new Set(errs)].slice(0, 5).join(" | "));
await browser.close();
server.close();
