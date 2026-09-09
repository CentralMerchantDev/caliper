/**
 * U4 -- the navigation wheel. Six camera ACTIONS (orbit/pan/zoom/focus/
 * north/rewind); the four camera MODES deliberately are not here (see
 * index.html's comment above #nav-wheel) -- they stay the button row's job.
 *
 * Every segment's label and tooltip come from public/nav-bindings.js's
 * NAV_BINDINGS, not typed here, so a bound gesture and its on-screen name
 * cannot drift apart the way #nav-pad-hint's text already had (U1's audit:
 * it never mentioned pan).
 *
 * Continuous actions (orbit, pan, zoom) are click-and-drag FROM the segment,
 * the SteeringWheel convention this is built for: press the wedge, drag,
 * release. Discrete actions (focus, north, rewind) fire once on a plain
 * click. No hover is load-bearing anywhere -- the wheel opens on a tap of
 * the hub and every segment is reachable by touch, because a control that
 * reveals itself on hover does not exist on a phone.
 */
import { NAV_BINDINGS, keyboardOnlyBindings, hintText, createPoseHistory, createSettleTracker } from "./nav-bindings.js";

const ICONS = { orbit: "↻", pan: "✥", zoom: "🔍", focus: "🎯", north: "N", rewind: "↺" };
const DRAG_PX = 6; // below this, a press-release on a segment is a click, not a drag

// REAL PIE WEDGES, not six floating dots. Mark's review of the dot version:
// "segments are where they should be" and "this reads as a wheel" are
// different claims -- the property that makes a SteeringWheel legible is a
// visible disc, visible divisions between choices, and a label on each one
// BEFORE it's touched. Six equal 30deg wedges across the same -90..90deg
// half-circle the dot version used (opening rightward from the hub, away
// from the screen's left edge -- see index.html's comment above #nav-wheel
// for why a full 360deg ring does not fit there), computed once here rather
// than hand-typed as SVG path strings: six-way pie arithmetic by hand is
// exactly the kind of thing a person gets subtly wrong and a machine does
// not.
const OUTER_R = 140; // Mark: "if the labels do not fit at this radius, the
// radius is too small" -- a sizing decision, not a reason to drop labels.
const LABEL_R = 98; // inside the outer edge, where the wedge is still wide
const ORDER = ["orbit", "pan", "zoom", "focus", "north", "rewind"];
const WEDGE_SPAN = 180 / ORDER.length; // 30deg each, spanning the full half-circle

function polar(r, angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  return [r * Math.cos(a), r * Math.sin(a)];
}

/** SVG path `d` for one pie slice, from the shared centre (0,0) at radius r,
 *  boundaries a1..a2 in degrees (a2 > a1, span < 180 so the arc's own
 *  large-arc-flag stays 0). */
function wedgePath(r, a1, a2) {
  const [x1, y1] = polar(r, a1);
  const [x2, y2] = polar(r, a2);
  return `M 0 0 L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

const WEDGES = {};
ORDER.forEach((id, i) => {
  const a1 = -90 + i * WEDGE_SPAN;
  const a2 = a1 + WEDGE_SPAN;
  const mid = (a1 + a2) / 2;
  const [lx, ly] = polar(LABEL_R, mid);
  WEDGES[id] = { a1, a2, mid, path: wedgePath(OUTER_R, a1, a2), labelX: lx, labelY: ly };
});

export function createNavWheel(renderer, doc = document) {
  const root = doc.getElementById("nav-wheel");
  const hub = doc.getElementById("nav-wheel-hub");
  if (!root || !hub || !renderer) return { destroy() {} };

  const listeners = [];
  const on = (target, type, fn, opts) => {
    if (!target) return;
    target.addEventListener(type, fn, opts);
    listeners.push([target, type, fn]);
  };

  // ANCHOR THE RING TO THE HUB'S OWN LIVE POSITION, NOT A SEPARATE GUESS
  // ABOUT WHERE THE PAD IS. A first version measured #nav-compass-pad's
  // rect and positioned the wheel a fixed offset above it -- correct
  // placement (never overlapping the pad), but Mark's review of the
  // screenshot called it "a stray artefact... nothing connects it to the
  // panel it belongs to": floating above a panel is a different property
  // than belonging to it. The hub now lives IN the pad's own action row
  // (index.html), so its getBoundingClientRect() already reflects wherever
  // the pad actually renders (workbench.js can dock it anywhere) with no
  // separate measurement to go stale -- it is a normal flow child, not a
  // second thing tracking the first.
  function positionRing() {
    const r = hub.getBoundingClientRect();
    root.style.left = `${Math.round(r.left + r.width / 2)}px`;
    root.style.top = `${Math.round(r.top + r.height / 2)}px`;
  }
  positionRing();
  if (typeof ResizeObserver === "function") new ResizeObserver(positionRing).observe(hub);
  on(window, "resize", positionRing);
  // A workbench drag moves the hub (inside the pad) without resizing it,
  // which a ResizeObserver alone cannot see -- polled alongside the
  // pose-history settle tracker below rather than adding a second timer.

  let live = doc.getElementById("nav-live");
  let ownsLive = false;
  if (!live) {
    ownsLive = true;
    live = doc.createElement("div");
    live.id = "nav-live";
    live.className = "sr-only";
    live.setAttribute("aria-live", "polite");
    doc.body.appendChild(live);
  }
  function announce(msg) {
    live.textContent = msg;
  }

  function currentMode() {
    return doc.querySelector(".nav-mode-btn.active")?.dataset.navMode || "orbit";
  }

  // #nav-pad-hint generated from the same table the wheel's segments read --
  // the two cannot say different things about what a gesture does, which is
  // exactly how the old hardcoded hint went stale enough to never mention pan.
  const hintEl = doc.getElementById("nav-pad-hint");
  function refreshHint() {
    if (hintEl) hintEl.textContent = hintText(currentMode());
  }
  refreshHint();
  for (const btn of doc.querySelectorAll(".nav-mode-btn[data-nav-mode]")) {
    on(btn, "click", refreshHint);
  }

  const bindingById = new Map(NAV_BINDINGS.map((b) => [b.id, b]));
  const segEls = new Map();
  const labelEls = new Map();
  for (const seg of root.querySelectorAll(".nav-wheel-seg")) {
    const id = seg.dataset.navAction;
    const binding = bindingById.get(id);
    const w = WEDGES[id];
    if (w) seg.setAttribute("d", w.path);
    if (binding) {
      // SVG elements have no .title property; a <title> child is the SVG
      // equivalent of a native tooltip, additional to the always-visible
      // label text (which is the actual fix for "readable before touching"
      // -- the tooltip is a bonus for anyone who does hover).
      const tip = doc.createElementNS("http://www.w3.org/2000/svg", "title");
      tip.textContent = `${binding.label} -- ${binding.gestureHint}`;
      seg.appendChild(tip);
      seg.setAttribute("aria-label", binding.label);
    }
    segEls.set(id, seg);
  }
  for (const label of root.querySelectorAll(".nav-wheel-seg-label")) {
    const id = label.dataset.navAction;
    const binding = bindingById.get(id);
    const w = WEDGES[id];
    if (w) {
      label.setAttribute("x", w.labelX.toFixed(2));
      label.setAttribute("y", w.labelY.toFixed(2));
    }
    if (binding) label.textContent = `${ICONS[id] || ""} ${binding.label}`.trim();
    labelEls.set(id, label);
  }

  /* ------------------------------------------------------------ open/close */
  let open = false;
  function setOpen(v) {
    open = v;
    root.classList.toggle("open", open); // hook for any future CSS on the ring itself
    hub.setAttribute("aria-expanded", String(open));
    for (const [id, seg] of segEls) {
      seg.style.opacity = open ? "1" : "0";
      seg.style.pointerEvents = open && !seg.classList.contains("disabled") ? "auto" : "none";
      seg.style.transform = open ? "scale(1)" : "scale(0.4)";
    }
    for (const label of labelEls.values()) {
      label.style.opacity = open ? "1" : "0";
      label.style.transform = open ? "scale(1)" : "scale(0.4)";
    }
  }
  on(hub, "click", () => setOpen(!open));
  on(doc, "keydown", (e) => {
    if (e.key === "Escape" && open) setOpen(false);
  });
  on(doc, "pointerdown", (e) => {
    if (!open) return;
    // The hub is no longer inside root -- it lives in the pad's action row
    // now -- so root.contains() alone no longer recognizes a click on the
    // hub itself as "inside". Without excluding it here, clicking the hub
    // to close would fire this handler first (pointerdown precedes click),
    // closing it, and the hub's own click handler would then immediately
    // toggle it back open from the now-stale `open` value -- a real bug
    // found by tracing the event order, not by running it.
    if (e.target instanceof Node && (e.target === hub || root.contains(e.target))) return;
    setOpen(false);
  });

  /* --------------------------------------------------------- pose history */
  const history = createPoseHistory({ max: 20 });
  const rewindSeg = segEls.get("rewind");
  function refreshRewindEnabled() {
    // SVG elements have no .disabled property -- a class does the same job,
    // and setOpen() already checks it when deciding pointer-events.
    if (!rewindSeg) return;
    rewindSeg.classList.toggle("disabled", history.length === 0);
    if (open) rewindSeg.style.pointerEvents = history.length === 0 ? "none" : "auto";
  }
  refreshRewindEnabled();

  const settler = createSettleTracker({
    settleMs: 400,
    onSettle: (pose) => {
      history.push(pose);
      refreshRewindEnabled();
    },
  });
  const pollTimer = setInterval(() => {
    const pose = renderer.getPose ? renderer.getPose() : null;
    if (pose) settler.update(pose, performance.now());
    positionRing(); // a workbench drag moves the hub without resizing it
  }, 250);

  /* ------------------------------------------------------------- discrete */
  function doFocus() {
    const canvas = doc.getElementById("world-canvas") || doc.querySelector("canvas");
    const r = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
    const res = renderer.focusAtScreen?.(r.left + r.width / 2, r.top + r.height / 2);
    announce(res?.hit ? "Focused" : "Nothing there to focus on");
  }
  function doNorth() {
    const i = renderer._impl;
    if (!i || !i._orbit || typeof i._orbit.delta !== "number") return;
    const RAD = 180 / Math.PI;
    const heading = ((i._orbit.delta * RAD) % 360 + 360) % 360;
    let turn = -heading;
    while (turn > 180) turn -= 360;
    while (turn < -180) turn += 360;
    renderer.rotateCamera?.(turn / RAD);
    announce("Facing north");
  }
  function doRewind() {
    const pose = history.rewind();
    refreshRewindEnabled();
    if (!pose) {
      announce("No further history");
      return;
    }
    renderer.setPose?.(pose);
    announce("Rewound");
  }
  const DISCRETE = { focus: doFocus, north: doNorth, rewind: doRewind };

  /* ----------------------------------------------------- drag-from-segment */
  // One rule for mouse, pen and touch: pointer events, capture on the
  // segment so movement past its small hit area still tracks.
  let dragId = null;
  let dragAction = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragLastX = 0;
  let dragLastY = 0;
  let dragMoved = false;

  function onSegDown(e, action) {
    if (DISCRETE[action]) return; // discrete actions fire on click, below
    const seg = segEls.get(action);
    if (!seg) return;
    dragId = e.pointerId;
    dragAction = action;
    dragStartX = dragLastX = e.clientX;
    dragStartY = dragLastY = e.clientY;
    dragMoved = false;
    seg.classList.add("armed");
    seg.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }
  function onSegMove(e) {
    if (dragId === null || e.pointerId !== dragId) return;
    const dx = e.clientX - dragLastX;
    const dy = e.clientY - dragLastY;
    if (Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY) > DRAG_PX) dragMoved = true;
    const canvas = doc.getElementById("world-canvas") || doc.querySelector("canvas");
    const w = Math.max(1, canvas?.clientWidth || 1);
    const h = Math.max(1, canvas?.clientHeight || 1);
    if (dragAction === "orbit") {
      const RAD = 180 / Math.PI;
      renderer.rotateCamera?.((dx / w) * 3.2);
      renderer.pitchCamera?.((-dy / h) * 2.2);
    } else if (dragAction === "pan") {
      renderer.panCamera?.(dx / w, dy / h);
    } else if (dragAction === "zoom") {
      const factor = Math.pow(1.6, dy / h);
      renderer.zoomCamera?.(factor);
    }
    dragLastX = e.clientX;
    dragLastY = e.clientY;
  }
  function onSegUp(e) {
    if (dragId === null || e.pointerId !== dragId) return;
    const seg = segEls.get(dragAction);
    seg?.classList.remove("armed");
    const wasClick = !dragMoved;
    const action = dragAction;
    dragId = null;
    dragAction = null;
    if (wasClick && action === "orbit") announce("Drag the Orbit wedge to turn the camera");
    if (wasClick && action === "pan") announce("Drag the Pan wedge to pan");
    if (wasClick && action === "zoom") announce("Drag the Zoom wedge to zoom");
  }

  for (const [id, seg] of segEls) {
    if (DISCRETE[id]) {
      on(seg, "click", () => {
        if (seg.classList.contains("disabled")) return;
        DISCRETE[id]();
      });
    } else {
      on(seg, "pointerdown", (e) => onSegDown(e, id));
      on(seg, "pointermove", onSegMove);
      on(seg, "pointerup", onSegUp);
      on(seg, "pointercancel", onSegUp);
    }
  }

  /* ------------------------------------------------- keyboard-only legend */
  // The wheel IS the legend for its own six segments -- labelled, tappable,
  // no separate key to learn. It cannot carry WASD-family movement (that is
  // per-mode, not a camera action), so the "?" exists for exactly that and
  // nothing the wheel already shows.
  let legendEl = null;
  function closeLegend() {
    legendEl?.remove();
    legendEl = null;
  }
  function toggleLegend() {
    if (legendEl) {
      closeLegend();
      return;
    }
    legendEl = doc.createElement("div");
    legendEl.className = "nav-wheel-legend";
    legendEl.setAttribute("role", "note");
    const items = keyboardOnlyBindings(currentMode());
    legendEl.innerHTML =
      `<b>${currentMode()} keys</b>` +
      items.map((b) => `<div><span>${b.keyHint || b.label}</span><i>${b.gestureHint}</i></div>`).join("");
    root.appendChild(legendEl);
  }
  const legendBtn = doc.getElementById("nav-wheel-legend-btn");
  on(legendBtn, "click", (e) => {
    e.stopPropagation();
    toggleLegend();
  });
  on(doc, "pointerdown", (e) => {
    if (!legendEl) return;
    if (e.target instanceof Node && (legendEl.contains(e.target) || e.target === legendBtn)) return;
    closeLegend();
  });

  return {
    destroy() {
      clearInterval(pollTimer);
      for (const [target, type, fn] of listeners) target.removeEventListener(type, fn);
      listeners.length = 0;
      closeLegend();
      if (ownsLive) live?.remove();
    },
    _history: history, // exposed for the e2e gate only
  };
}
