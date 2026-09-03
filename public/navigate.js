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
  // A missing canvas disables EVERY pointer gesture in this file -- double-click
  // to focus, F, the touch double-tap -- while the readout, the shortcuts and
  // the slider all carry on working. That combination is indistinguishable from
  // "the gesture is broken", and it cost several rounds of chasing the wrong
  // thing. It is recorded and it complains.
  const canvas = doc.getElementById("world-canvas") || doc.querySelector("canvas");
  if (!canvas) console.error("navigation: no canvas found -- pointer gestures are disabled");
  if (typeof window !== "undefined") window.__navGestures = { canvas: !!canvas, canvasId: canvas?.id ?? null };
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
    // Counted, because every INDIRECT signal for "did this run" turned out to be
    // ambiguous: the marker does not move when you re-focus the same point, and
    // the target range does not change when the camera has not finished
    // animating. Four rounds were spent misreading those. This is unambiguous.
    if (typeof window !== "undefined" && window.__navGestures) {
      window.__navGestures.focusCalls = (window.__navGestures.focusCalls || 0) + 1;
      window.__navGestures.lastAt = [clientX, clientY];
    }
    const r = renderer.focusAtScreen?.(clientX, clientY);
    if (!r) return;
    if (!r.hit) {
      flash(r.reason === "nothing under the pointer" ? "nothing there to focus on" : r.reason, clientX, clientY);
      return;
    }
    announce(`Focused at ${Math.round(r.point.x)}, ${Math.round(r.point.z)} — range ${fmtDist(r.dist)}`);
  }

  if (canvas) {
    // ONE POINTER RULE FOR MOUSE, PEN AND TOUCH.
    //
    // Honest history, because the comment that stood here was false. It said the
    // dblclick event "did nothing at all on the real page". It works, and it had
    // been working the whole time. I concluded otherwise from three signals that
    // are all ambiguous: the pivot marker does not MOVE when you re-focus the
    // same point; the camera looks at the origin, so centre-ish clicks resolve
    // there every time; and the target range does not change while the previous
    // focus animation is still running. Counting focusAt calls directly settled
    // it in one run -- the count was already non-zero before the test that was
    // supposedly proving the gesture dead.
    //
    // This is kept on its own merits, NOT as a fix for a bug that was not there.
    // A touchscreen produces no dblclick, so the previous code needed a second,
    // separate double-tap path for it. Counting pointerups is one rule for every
    // input, with the distance test that stops a quick pan reading as a double.
    // Bound on the document and filtered by target, so it cannot be orphaned if
    // the canvas element is ever replaced.
    const DOUBLE_MS = 340, DOUBLE_PX = 24;
    let lastUp = 0, lastUpX = 0, lastUpY = 0;
    doc.addEventListener("pointerup", (e) => {
      if (!(e.target instanceof Element) || e.target.tagName !== "CANVAS") return;
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const now = performance.now();
      const near = Math.hypot(e.clientX - lastUpX, e.clientY - lastUpY) < DOUBLE_PX;
      if (now - lastUp < DOUBLE_MS && near) {
        lastUp = 0;
        focusAt(e.clientX, e.clientY);
        return;
      }
      lastUp = now; lastUpX = e.clientX; lastUpY = e.clientY;
    });
    // The browser event too, where it does fire -- harmless if both arrive,
    // because the second call re-focuses the same point.
    doc.addEventListener("dblclick", (e) => {
      if (e.target instanceof Element && e.target.tagName === "CANVAS") e.preventDefault();
    });

    // F focuses whatever the pointer is over.
    //
    // It used to return early when no pointermove had been seen, which made the
    // "keyboard equivalent" require a mouse first -- so for a keyboard-only
    // visitor it did nothing at all, silently. With no pointer position yet, the
    // centre of the view is the honest reading of "whatever I am looking at".
    let lastX = null, lastY = null;
    doc.addEventListener("pointermove", (e) => {
      if (e.target instanceof Element && e.target.tagName === "CANVAS") { lastX = e.clientX; lastY = e.clientY; }
    }, { passive: true });
    doc.addEventListener("keydown", (e) => {
      if (e.key !== "f" && e.key !== "F") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const r = canvas.getBoundingClientRect();
      focusAt(lastX ?? (r.left + r.width / 2), lastY ?? (r.top + r.height / 2));
    });
  }

  // The button's tooltip says "Face north (N)". It said that before anything
  // was bound to N, which is an advertised control that does not exist.
  doc.addEventListener("keydown", (e) => {
    if (e.key !== "n" && e.key !== "N") return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    $("nav-north-up")?.click();
  });

  $("nav-clear-pivot")?.addEventListener("click", (e) => {
    // The 2D fallback renderer defines no hidePivotMarker, and the facade
    // guards the call -- so on that path the button did nothing and still
    // announced success. Report what actually happened.
    if (typeof renderer.hidePivotMarker !== "function") {
      flash("no orbit marker in this view", e.clientX || 20, e.clientY || 20);
      return;
    }
    renderer.hidePivotMarker();
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

  let sliderTimer = null;
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
    sliderTimer = setInterval(() => {
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
    // Both intervals. destroy() used to clear only the readout timer and leave
    // the slider's 400ms poll running, so the teardown the API advertised was
    // half a teardown.
    destroy() { clearInterval(timer); clearInterval(sliderTimer); },
    focusAt,
  };
}
