/**
 * Position one element relative to another's ACTUAL rendered rect, tracked
 * continuously -- not a fixed offset computed once and assumed to still be
 * true.
 *
 * Written the first time for U1 (public/index.html's `.inspect-card`, which
 * assumed `#nav-compass-pad` always sits at its CSS-default bottom-left
 * corner) and a second time for U4 (the nav wheel's ring, which first
 * assumed the same thing about the pad, then -- once the hub moved inside
 * the pad's own action row -- needed the identical "measure continuously"
 * treatment anchored to the hub instead). Two copies of the same fix is
 * this project's own failure pattern E aimed at itself: a capability
 * written twice because the first copy was not found or not extracted.
 * This is the extraction, so a third caller does not write it again.
 *
 * Why polling in ADDITION to ResizeObserver: public/workbench.js can drag a
 * registered panel anywhere on screen without resizing it, which
 * ResizeObserver cannot see (it fires on size changes, not position
 * changes). A short poll is the only mechanism that catches a plain move.
 */
export function trackLiveRect(el, onMeasure, { pollMs = 250 } = {}) {
  if (!el || typeof onMeasure !== "function") return { stop() {} };

  function measure() {
    onMeasure(el.getBoundingClientRect());
  }
  measure();

  const cleanups = [];
  if (typeof ResizeObserver === "function") {
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    cleanups.push(() => ro.disconnect());
  }
  if (typeof window !== "undefined") {
    window.addEventListener("resize", measure);
    cleanups.push(() => window.removeEventListener("resize", measure));
  }
  const timer = setInterval(measure, pollMs);
  cleanups.push(() => clearInterval(timer));

  return {
    stop() {
      for (const fn of cleanups) fn();
    },
  };
}
