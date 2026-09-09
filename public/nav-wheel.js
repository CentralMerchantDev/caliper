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

// Half-circle arc, top to bottom, opening rightward from the hub (away from
// the screen's left edge -- see index.html's comment above #nav-wheel for
// why a full 360deg ring does not fit there): 6 points across -90deg..90deg
// at 76px radius. Applied directly as inline style from setOpen() below,
// not via a CSS class -- an earlier version relied on a
// `.nav-wheel.open .nav-wheel-seg[data-nav-action="x"]` rule that a real
// browser confirmed selector-matched (Element.matches() returned true) but
// never actually painted, verified by screenshot and getComputedStyle
// together, cause not fully isolated. Setting transform/opacity directly is
// one fewer moving part between "the state is open" and "the segment is
// visibly there", and is what a screenshot could actually confirm.
const OPEN_OFFSET = {
  orbit: [0, -76],
  pan: [44.7, -61.5],
  zoom: [72.3, -23.5],
  focus: [72.3, 23.5],
  north: [44.7, 61.5],
  rewind: [0, 76],
};

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

  // POSITION FROM WHERE THE PAD ACTUALLY IS, NOT WHERE THE STYLESHEET PUTS
  // IT BY DEFAULT. public/workbench.js registers #nav-compass-pad (key:
  // "nav", home: "left") and sets its own inline left/top, which wins over
  // the CSS `left:18px; bottom:18px` the wheel's static calc() assumed --
  // found by screenshot, not by reading the CSS: the wheel landed inside the
  // pad's own footprint instead of above it, because the pad was docked near
  // the top of the screen, not the bottom-left corner the calc() assumed.
  // Same principle U1 already established for height (measure, don't
  // predict), extended to position: read the pad's live
  // getBoundingClientRect() and place the wheel just above it, wherever
  // that is, tracked continuously so a workbench drag does not strand it.
  const pad = doc.getElementById("nav-compass-pad");
  function positionWheel() {
    if (!pad) return;
    const r = pad.getBoundingClientRect();
    root.style.left = `${Math.round(r.left)}px`;
    root.style.top = `${Math.round(r.top - 22 - 12)}px`;
    root.style.bottom = "auto";
  }
  positionWheel();
  if (typeof ResizeObserver === "function" && pad) new ResizeObserver(positionWheel).observe(pad);
  on(window, "resize", positionWheel);
  // Workbench dragging moves the pad without resizing it, which a
  // ResizeObserver alone cannot see -- polled alongside the pose-history
  // settle tracker below rather than adding a second timer.

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
  for (const seg of root.querySelectorAll(".nav-wheel-seg")) {
    const id = seg.dataset.navAction;
    const binding = bindingById.get(id);
    if (binding) {
      seg.textContent = ICONS[id] || binding.label[0];
      seg.title = `${binding.label} -- ${binding.gestureHint}`;
      seg.setAttribute("aria-label", binding.label);
    }
    segEls.set(id, seg);
  }

  /* ------------------------------------------------------------ open/close */
  let open = false;
  function setOpen(v) {
    open = v;
    root.classList.toggle("open", open); // kept for the hub's hover/open background rule
    hub.setAttribute("aria-expanded", String(open));
    for (const [id, seg] of segEls) {
      const [ox, oy] = OPEN_OFFSET[id] || [0, 0];
      seg.style.opacity = open ? "1" : "0";
      seg.style.pointerEvents = open ? "auto" : "none";
      seg.style.transform = open ? `translate(${ox}px, ${oy}px) scale(1)` : "translate(0, 0) scale(0.4)";
    }
  }
  on(hub, "click", () => setOpen(!open));
  on(doc, "keydown", (e) => {
    if (e.key === "Escape" && open) setOpen(false);
  });
  on(doc, "pointerdown", (e) => {
    if (!open) return;
    if (e.target instanceof Node && root.contains(e.target)) return;
    setOpen(false);
  });

  /* --------------------------------------------------------- pose history */
  const history = createPoseHistory({ max: 20 });
  const rewindSeg = segEls.get("rewind");
  function refreshRewindEnabled() {
    if (rewindSeg) rewindSeg.disabled = history.length === 0;
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
    positionWheel(); // a workbench drag moves the pad without resizing it
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
        if (seg.disabled) return;
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
