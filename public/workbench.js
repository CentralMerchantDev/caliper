/**
 * The workbench: where the panels live, and who decides.
 *
 * Before this, every panel was pinned by hand. .nav-pad sat at bottom:18px
 * left:18px, .dock-wrapper at bottom:16px right:18px, and .status-card cleared
 * the dock by reading --dock-h, a custom property republished by a
 * ResizeObserver, so that two bottom-right panels would not sit on each other.
 * The welcome card cleared the top bar the same way, through --topbar-bottom.
 *
 * That is stacking done with ARITHMETIC. Every new panel adds another measured
 * variable and another calc() that has to be kept in sync by hand, and the
 * failure is silent -- panels overlap, and nothing says so.
 *
 * A rail does the same job with layout. Panels are children of a flex column;
 * the column stacks them, and there is no number to keep in sync. The measured
 * properties are still published, because the rules that read them still apply
 * to any panel a visitor has torn off into free-form -- but for a docked panel
 * they are simply not consulted.
 *
 * And it is the visitor's call. Left, right, top, bottom, or floating loose:
 * drag a panel's grip, or use its menu if a mouse drag is not available. The
 * choice is remembered.
 *
 * THIS FILE MOVES NODES, IT DOES NOT REBUILD THEM. The page binds dozens of
 * listeners by id from an inline module. A re-created panel is a dead panel, so
 * every panel here is the original element, relocated. If this module fails to
 * load at all, the panels keep the fixed positions the stylesheet gives them
 * and the page still works -- degraded to what it was, not broken.
 */

const REGIONS = ["left", "right", "top", "bottom", "float"];
const STORE_KEY = "caliper.workbench.v1";

/** The panels that can be moved, in the order a rail should stack them. */
const PANELS = [
  { key: "nav", sel: "#nav-compass-pad", label: "Navigation", home: "left" },
  { key: "inspect", sel: "#parcel-inspect-card", label: "Inspector", home: "left" },
  { key: "status", sel: "#floating-status-card", label: "Pipeline", home: "right" },
  { key: "build", sel: "#director-dock", label: "Build", home: "right" },
];

/* ---------------------------------------------------------------- storage -- */

/**
 * A saved layout is untrusted input like any other.
 *
 * It comes from localStorage, which means it may have been written by an older
 * version of this file, hand-edited, or truncated by a full disk. A bad value
 * must cost the visitor their layout, never their page -- so every field is
 * checked against what this version actually understands, and anything that
 * fails simply falls back to the default rather than throwing.
 */
function readLayout() {
  let raw;
  try {
    raw = localStorage.getItem(STORE_KEY);
  } catch {
    return {}; // storage disabled (private mode, blocked cookies) is not an error
  }
  if (!raw) return {};
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const clean = {};
  for (const p of PANELS) {
    const v = parsed[p.key];
    if (!v || typeof v !== "object") continue;
    if (!REGIONS.includes(v.region)) continue;
    const entry = { region: v.region };
    if (v.region === "float") {
      // A float position off-screen is a panel the visitor cannot reach. Numbers
      // only, and clamped on apply rather than trusted here.
      if (Number.isFinite(v.x) && Number.isFinite(v.y)) { entry.x = v.x; entry.y = v.y; }
      else continue; // a float with no usable position is not a float
    }
    clean[p.key] = entry;
  }
  return clean;
}

function writeLayout(layout) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(layout));
  } catch {
    /* Storage full or blocked. The layout still applies for this session; it
       just will not survive a reload. Not worth interrupting anyone over. */
  }
}

/* ------------------------------------------------------------------ rails -- */

function buildRails(root) {
  const layer = document.createElement("div");
  layer.className = "wb-layer";
  layer.id = "wb-layer";
  const rails = {};
  for (const r of ["top", "left", "right", "bottom"]) {
    const el = document.createElement("div");
    el.className = `wb-rail wb-rail-${r}`;
    el.id = `wb-rail-${r}`;
    el.dataset.region = r;
    rails[r] = el;
    layer.appendChild(el);
  }
  const floatLayer = document.createElement("div");
  floatLayer.className = "wb-float-layer";
  floatLayer.id = "wb-float-layer";
  rails.float = floatLayer;
  layer.appendChild(floatLayer);

  // Drop zones only exist during a drag; built once, shown on demand.
  const zones = document.createElement("div");
  zones.className = "wb-zones";
  zones.id = "wb-zones";
  for (const r of ["top", "left", "right", "bottom"]) {
    const z = document.createElement("div");
    z.className = `wb-zone wb-zone-${r}`;
    z.dataset.region = r;
    z.innerHTML = `<span>${r}</span>`;
    zones.appendChild(z);
  }
  layer.appendChild(zones);

  root.appendChild(layer);
  return { rails, zones };
}

/* ------------------------------------------------------------------ grips -- */

function addChrome(el, panel, api) {
  const bar = document.createElement("div");
  bar.className = "wb-grip";
  bar.innerHTML = `
    <span class="wb-grip-dots" aria-hidden="true"></span>
    <span class="wb-grip-label">${panel.label}</span>
    <button type="button" class="wb-grip-menu" aria-haspopup="true" aria-expanded="false"
            title="Move ${panel.label}" aria-label="Move ${panel.label}">⋮</button>
    <div class="wb-grip-panel" role="menu" hidden></div>`;
  const menuBtn = bar.querySelector(".wb-grip-menu");
  const menuPanel = bar.querySelector(".wb-grip-panel");

  // Every move available from the keyboard and from a touchscreen, not only
  // from a mouse drag. A control that exists solely as a drag is a control some
  // visitors do not have.
  for (const r of REGIONS) {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "menuitem");
    b.dataset.region = r;
    b.textContent = r === "float" ? "Float free" : `Dock ${r}`;
    b.addEventListener("click", () => {
      api.move(panel.key, r);
      closeGrip();
      menuBtn.focus();
    });
    menuPanel.appendChild(b);
  }
  const reset = document.createElement("button");
  reset.type = "button";
  reset.setAttribute("role", "menuitem");
  reset.className = "wb-grip-reset";
  reset.textContent = "Reset all panels";
  reset.addEventListener("click", () => { api.resetAll(); closeGrip(); });
  menuPanel.appendChild(reset);

  function closeGrip() { menuPanel.hidden = true; menuBtn.setAttribute("aria-expanded", "false"); }
  function openGrip() {
    api.closeAllGrips();
    menuPanel.hidden = false;
    menuBtn.setAttribute("aria-expanded", "true");
    menuPanel.querySelector("button")?.focus();
  }
  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (menuPanel.hidden) openGrip(); else closeGrip();
  });
  el.__wbCloseGrip = closeGrip;

  // Do not say the panel's name twice. Navigation already prints NAVIGATION in
  // its own header; a grip that repeats it is chrome about chrome. Where the
  // panel titles itself, the grip keeps the drag dots and the move menu and
  // drops the label -- the affordance without the noise.
  if (el.querySelector(".nav-pad-title, .status-card-title, .inspect-card-title, [data-panel-title]")) {
    bar.querySelector(".wb-grip-label").textContent = "";
    bar.classList.add("wb-grip-quiet");
  }
  el.insertBefore(bar, el.firstChild);
  return bar;
}

/* ------------------------------------------------------------------- drag -- */

function wireDrag(el, bar, panel, api) {
  let dragging = false;
  let startX = 0, startY = 0, offX = 0, offY = 0, pid = null;

  bar.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".wb-grip-menu, .wb-grip-panel")) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;
    pid = e.pointerId;
    startX = e.clientX; startY = e.clientY;
    const r = el.getBoundingClientRect();
    offX = e.clientX - r.left; offY = e.clientY - r.top;
    bar.setPointerCapture(pid);
  });

  bar.addEventListener("pointermove", (e) => {
    if (pid === null || e.pointerId !== pid) return;
    // A 5px threshold, so a click on the grip is not read as a drag. Below it
    // nothing has happened yet and the panel has not moved.
    if (!dragging && Math.hypot(e.clientX - startX, e.clientY - startY) < 5) return;
    if (!dragging) { dragging = true; api.beginDrag(panel.key, el); }
    api.dragTo(el, e.clientX - offX, e.clientY - offY, e.clientX, e.clientY);
  });

  const finish = (e) => {
    if (pid === null || (e && e.pointerId !== pid)) return;
    try { bar.releasePointerCapture(pid); } catch { /* already released */ }
    pid = null;
    if (!dragging) return;
    dragging = false;
    api.endDrag(panel.key, el, e ? e.clientX : 0, e ? e.clientY : 0);
  };
  bar.addEventListener("pointerup", finish);
  // A cancelled pointer -- the OS taking over, a touch turning into a scroll --
  // must not leave a panel stuck mid-drag with the drop zones still lit.
  bar.addEventListener("pointercancel", finish);
}

/* ----------------------------------------------------------------- public -- */

export function createWorkbench(doc = document) {
  const host = doc.getElementById("viewport-container")?.parentElement || doc.body;
  const { rails, zones } = buildRails(host);
  const layout = readLayout();
  const registry = new Map();

  const api = {
    closeAllGrips() {
      for (const { el } of registry.values()) el.__wbCloseGrip?.();
    },
    move(key, region) {
      const rec = registry.get(key);
      if (!rec || !REGIONS.includes(region)) return;
      place(rec, region);
      persist();
    },
    resetAll() {
      for (const rec of registry.values()) place(rec, rec.panel.home);
      try { localStorage.removeItem(STORE_KEY); } catch { /* see writeLayout */ }
    },
    beginDrag(key, el) {
      zones.classList.add("is-active");
      el.classList.add("is-dragging");
      // Lifted out of the rail so the rail's flex layout stops governing it and
      // the remaining panels close the gap immediately, which is the feedback
      // that says "this one is coming out".
      rails.float.appendChild(el);
      el.classList.remove("wb-docked");
      el.classList.add("wb-float");
    },
    dragTo(el, x, y, px, py) {
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      const hit = zoneAt(px, py);
      for (const z of zones.children) z.classList.toggle("is-hot", z.dataset.region === hit);
    },
    endDrag(key, el, px, py) {
      zones.classList.remove("is-active");
      el.classList.remove("is-dragging");
      for (const z of zones.children) z.classList.remove("is-hot");
      const region = zoneAt(px, py) || "float";
      const rec = registry.get(key);
      place(rec, region, region === "float" ? clampFloat(el) : null);
      persist();
    },
  };

  /** Which edge band, if any, the pointer is over. Null means open water. */
  function zoneAt(x, y) {
    const w = window.innerWidth, h = window.innerHeight;
    const band = Math.min(150, Math.max(80, Math.round(Math.min(w, h) * 0.14)));
    // Corners are ambiguous; the nearer edge wins rather than whichever test
    // happens to run first.
    const d = { left: x, right: w - x, top: y, bottom: h - y };
    let best = null, bestD = Infinity;
    for (const r of ["left", "right", "top", "bottom"]) {
      if (d[r] <= band && d[r] < bestD) { best = r; bestD = d[r]; }
    }
    return best;
  }

  /**
   * A float must stay REACHABLE, which is stricter than staying on screen.
   *
   * Clamping to the viewport alone let a panel settle under the command centre,
   * where it is perfectly visible in a screenshot and completely unclickable --
   * the bar is above it and eats the pointer. The top of the free area is the
   * bar's own measured bottom edge, not zero.
   */
  function clampFloat(el) {
    const r = el.getBoundingClientRect();
    const pad = 8, gripRoom = 40;
    const barBottom = document.querySelector(".top-bar-wrapper")?.getBoundingClientRect().bottom || 0;
    const minY = Math.ceil(barBottom) + pad;
    const x = Math.min(Math.max(pad, r.left), window.innerWidth - Math.max(gripRoom, r.width * 0.4));
    const y = Math.min(Math.max(minY, r.top), Math.max(minY, window.innerHeight - gripRoom));
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    return { x, y };
  }

  function place(rec, region, floatPos) {
    const { el, panel } = rec;
    el.classList.remove("wb-float", "wb-docked");
    el.style.left = ""; el.style.top = "";
    if (region === "float") {
      el.classList.add("wb-float");
      rails.float.appendChild(el);
      const pos = floatPos || rec.floatPos || defaultFloatFor(el);
      el.style.left = `${pos.x}px`;
      el.style.top = `${pos.y}px`;
      // Clamp on every placement, not only on load. A float positioned from a
      // menu never went through a drag, so nothing else would check it.
      rec.floatPos = clampFloat(el);
    } else {
      el.classList.add("wb-docked");
      // Insert in the declared PANELS order so a rail's stacking is stable no
      // matter what order panels were dropped into it.
      const rail = rails[region];
      const mine = PANELS.findIndex((p) => p.key === panel.key);
      let before = null;
      for (const child of rail.children) {
        const k = child.dataset.wbPanel;
        if (k && PANELS.findIndex((p) => p.key === k) > mine) { before = child; break; }
      }
      rail.insertBefore(el, before);
    }
    rec.region = region;
    el.dataset.wbRegion = region;
    for (const b of el.querySelectorAll(".wb-grip-panel button[data-region]")) {
      b.setAttribute("aria-current", b.dataset.region === region ? "true" : "false");
    }
  }

  function defaultFloatFor(el) {
    const r = el.getBoundingClientRect();
    return { x: Math.max(16, (window.innerWidth - r.width) / 2), y: 120 };
  }

  function persist() {
    const out = {};
    for (const [key, rec] of registry) {
      out[key] = rec.region === "float"
        ? { region: "float", x: rec.floatPos?.x ?? 0, y: rec.floatPos?.y ?? 0 }
        : { region: rec.region };
    }
    writeLayout(out);
  }

  for (const panel of PANELS) {
    const el = doc.querySelector(panel.sel);
    if (!el) continue; // a panel that is not on this page is not an error
    el.dataset.wbPanel = panel.key;
    const rec = { el, panel, region: panel.home, floatPos: null };
    registry.set(panel.key, rec);
    const bar = addChrome(el, panel, api);
    wireDrag(el, bar, panel, api);
    const saved = layout[panel.key];
    if (saved?.region === "float") rec.floatPos = { x: saved.x, y: saved.y };
    place(rec, saved?.region || panel.home);
    if (rec.region === "float") clampFloat(el);
  }

  doc.addEventListener("click", (e) => {
    if (!e.target.closest(".wb-grip")) api.closeAllGrips();
  });
  doc.addEventListener("keydown", (e) => {
    if (e.key === "Escape") api.closeAllGrips();
  });
  // A window that shrinks can strand a float off-screen; re-clamp rather than
  // leave a panel the visitor cannot grab.
  window.addEventListener("resize", () => {
    for (const rec of registry.values()) {
      if (rec.region === "float") rec.floatPos = clampFloat(rec.el);
    }
  });

  return api;
}
