/**
 * Navigating a 26 km world without getting lost.
 *
 * Mark: "it is hard to navigate through the world... you should be able to pick
 * a point and make it the centre of focus so that you orbit around that point,
 * you can even get down to street level."
 *
 * Three things were making it hard, and none of them was the camera maths.
 *
 * 1. SETTING THE PIVOT WAS HIDDEN AND SILENT. It was Alt-click, an undocumented
 *    modifier, or a button that put you in a mode so a later click would count.
 *    Neither drew anything, so you could not see what you were orbiting, and
 *    when the ray missed, nothing happened and nothing said why.
 * 2. FOCUS DID NOT CLOSE THE DISTANCE. setCenterPoint moved the centre and kept
 *    the camera where it was, so "focus on that" left you exactly as far away
 *    as before. Street level was a separate manual scroll.
 * 3. YOU COULD NOT SEE WHERE YOU WERE POINTED. No heading, no pitch, no range.
 *    Every correction was a guess, and a guess in a world this size is a
 *    minute of scrolling.
 *
 * So: double-click anything to focus it, the pivot is drawn, each focus halves
 * the range so repeated double-clicks walk you down to the street, and the
 * readout says which way you are facing and how far out you are.
 *
 * The renderer owns the camera. This file owns the gestures and the numbers.
 */

const RAD = 180 / Math.PI;

export function createNavigation(renderer, doc = document) {
  if (!renderer) return { destroy() {} };
  const canvas = doc.getElementById("world-canvas") || doc.querySelector("canvas");
  const $ = (id) => doc.getElementById(id);

  /* ------------------------------------------------------ focus by pointer -- */

  /**
   * A miss has to be visible.
   *
   * The old path returned nothing when the ray hit nothing, which is
   * indistinguishable from a broken feature. This says so, briefly, where the
   * pointer is -- so "I missed" and "it does not work" stop looking the same.
   */
  function flash(message, clientX, clientY) {
    const el = doc.createElement("div");
    el.className = "nav-flash";
    el.textContent = message;
    el.style.left = `${clientX}px`;
    el.style.top = `${clientY}px`;
    doc.body.appendChild(el);
    setTimeout(() => el.remove(), 1400);
  }

  function focusAt(clientX, clientY) {
    const r = renderer.focusAtScreen?.(clientX, clientY);
    if (!r) return;
    if (!r.hit) {
      flash(r.reason === "nothing under the pointer" ? "nothing there to focus on" : r.reason, clientX, clientY);
      return;
    }
    announce(`Focused at ${Math.round(r.point.x)}, ${Math.round(r.point.z)} — range ${fmtDist(r.dist)}`);
  }

  if (canvas) {
    canvas.addEventListener("dblclick", (e) => {
      e.preventDefault();
      focusAt(e.clientX, e.clientY);
    });
    // F focuses whatever the pointer is over, which is the keyboard equivalent
    // and the convention in every 3D tool this borrows from.
    let lastX = 0, lastY = 0;
    canvas.addEventListener("pointermove", (e) => { lastX = e.clientX; lastY = e.clientY; }, { passive: true });
    doc.addEventListener("keydown", (e) => {
      if (e.key !== "f" && e.key !== "F") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (!lastX && !lastY) return;
      focusAt(lastX, lastY);
    });
  }

  $("nav-clear-pivot")?.addEventListener("click", () => {
    renderer.hidePivotMarker?.();
    announce("Orbit marker cleared");
  });

  /* --------------------------------------------------------------- north up -- */

  $("nav-north-up")?.addEventListener("click", () => {
    // Expressed as a rotation TO zero rather than a set, so it goes through the
    // renderer's existing rotate path and animates like every other turn.
    const heading = readHeadingDeg();
    if (heading === null) return;
    let turn = -heading;
    while (turn > 180) turn -= 360;
    while (turn < -180) turn += 360;
    renderer.rotateCamera?.(turn / RAD);
    announce("Facing north");
  });

  /* ------------------------------------------------------------ range slider -- */

  const slider = $("nav-zoom-slider");
  if (slider) {
    // The slider is logarithmic. The range runs from about 4 m to tens of
    // kilometres; on a linear scale the first 99% of the track would be "very
    // far away" and street level would be one unusable pixel at the end.
    let selfMove = false;
    slider.addEventListener("input", () => {
      selfMove = true;
      const t = Number(slider.value) / 100;
      const min = 4, max = maxRange();
      const want = min * Math.pow(max / min, t);
      const now = readDist();
      if (now && want > 0) renderer.zoomCamera?.(want / now);
      setTimeout(() => { selfMove = false; }, 60);
    });
    // Keep the handle honest when the camera moves by scroll, pinch or focus --
    // a control that lies about the current value is worse than no control.
    setInterval(() => {
      if (selfMove) return;
      const now = readDist();
      if (!now) return;
      const min = 4, max = maxRange();
      const t = Math.log(Math.max(min, now) / min) / Math.log(max / min);
      slider.value = String(Math.round(Math.min(1, Math.max(0, t)) * 100));
    }, 400);
  }

  /* ---------------------------------------------------------------- readout -- */

  const readHeading = $("nav-read-heading");
  const readPitch = $("nav-read-pitch");
  const readDistEl = $("nav-read-dist");

  function impl() { return renderer._impl || null; }
  function readHeadingDeg() {
    const i = impl();
    if (!i || !i._orbit || typeof i._orbit.delta !== "number") return null;
    return ((i._orbit.delta * RAD) % 360 + 360) % 360;
  }
  function readPitchDeg() {
    const i = impl();
    if (!i || !i._orbit || typeof i._orbit.pitch !== "number") return null;
    return i._orbit.pitch * RAD;
  }
  function readDist() {
    const i = impl();
    return i && typeof i._camDist === "number" ? i._camDist : null;
  }
  function maxRange() {
    const i = impl();
    return i && i._cityMode ? 46000 : 3600;
  }
  function fmtDist(m) {
    if (m == null) return "—";
    return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
  }
  const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

  function tick() {
    const h = readHeadingDeg();
    if (readHeading) {
      readHeading.textContent = h === null ? "—" : `${Math.round(h)}° ${COMPASS[Math.round(h / 45) % 8]}`;
    }
    const p = readPitchDeg();
    if (readPitch) readPitch.textContent = p === null ? "—" : `${Math.round(p)}°`;
    if (readDistEl) readDistEl.textContent = fmtDist(readDist());
  }
  // 4 Hz. The readout is for orientation, not for animation, and polling it on
  // every frame would put string formatting in the render loop for no gain.
  const timer = setInterval(tick, 250);
  tick();

  /* ------------------------------------------------------------- announcing -- */

  let live = doc.getElementById("nav-live");
  if (!live) {
    live = doc.createElement("div");
    live.id = "nav-live";
    live.className = "sr-only";
    live.setAttribute("aria-live", "polite");
    doc.body.appendChild(live);
  }
  function announce(msg) { live.textContent = msg; }

  return {
    destroy() { clearInterval(timer); },
    focusAt,
  };
}
