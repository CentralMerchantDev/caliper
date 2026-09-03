/**
 * Menus that do not punish a wobbly hand.
 *
 * Mark: "make sure they are not made so that a slight movement takes you away
 * or kills the drop down -- that is super annoying."
 *
 * He is describing hover menus, and the reason they feel like that is that they
 * close on mouseleave. Every pixel of dead space between a trigger and its panel
 * is then a trapdoor, and the diagonal you naturally travel to reach the third
 * item crosses it. So:
 *
 *   1. These open on CLICK and close only on a deliberate act -- clicking the
 *      trigger again, clicking outside, or Escape. Moving the pointer away,
 *      however far, does nothing at all.
 *   2. The gap between trigger and panel is bridged by a hit area, so even
 *      hover-driven behaviour (the menubar switching in 3) cannot fall through
 *      the crack.
 *   3. Once one menu is open, sliding along the bar to a neighbour switches to
 *      it -- the thing a menubar is expected to do -- but only after 110ms of
 *      intent, so a pointer merely crossing on its way somewhere else does not
 *      flip through every menu.
 *   4. An item that CHANGES A VIEW SETTING leaves the menu open. Day, Dusk,
 *      Night, 2D, 3D, roof, grid, audio: you are comparing, and closing the menu
 *      after each press means reopening it to try the next one. An item that
 *      NAVIGATES or opens something closes the menu, because staying would be
 *      the annoyance instead.
 *
 * Keyboard throughout: Enter or Space to open, arrows to move, Home and End,
 * Escape to close and return focus to the trigger.
 */

/**
 * ONE Escape, ONE dismissal, and everybody else still gets a turn.
 *
 * The first version of this file listened for Escape on document in the CAPTURE
 * phase and called stopPropagation whenever a menu was open. That does far more
 * than the comment claimed: capture runs before every bubble listener, so while
 * any menu was open Escape stopped exiting Tour, stopped closing the command
 * palette, stopped dismissing modals, and stopped closing the workbench grip
 * menus. A blind audit measured it -- two popups open, one Escape, only one
 * closed, and the other four consumers never heard the key at all.
 *
 * So layers register here instead. Escape closes the topmost open layer and
 * only then stops the event; when nothing of ours is open the key travels on
 * untouched and Tour, the palette and the modals behave exactly as they did.
 */
const dismissers = [];

/** register(fn) -> fn() returns true if it had something open and closed it. */
export function registerDismisser(fn) {
  dismissers.push(fn);
  return () => {
    const i = dismissers.indexOf(fn);
    if (i >= 0) dismissers.splice(i, 1);
  };
}

let escapeBound = false;
function bindEscapeOnce(doc) {
  if (escapeBound) return;
  escapeBound = true;
  doc.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    // Last registered is the most recently opened layer, so it is asked first.
    for (let i = dismissers.length - 1; i >= 0; i--) {
      if (dismissers[i]()) {
        e.stopPropagation();
        return;
      }
    }
    // Nothing of ours was open. Do NOT swallow it.
  }, true);
}

/** Items that are settings, not destinations. These leave the menu open. */
const KEEP_OPEN = new Set([
  "tod-day", "tod-dusk", "tod-night",
  "view-3d", "view-plan",
  "roof-exterior", "roof-cutaway",
  "grid-toggle-btn", "sound-toggle-btn",
]);

const SWITCH_INTENT_MS = 110;

export function createMenus(doc = document) {
  const menus = Array.from(doc.querySelectorAll(".menu[data-menu]"));
  if (!menus.length) return { closeAll() {} };

  const panelOf = (m) => m.querySelector(".menu-panel");
  const trigOf = (m) => m.querySelector(".menu-trigger");
  const isOpen = (m) => !panelOf(m).hidden;
  const itemsOf = (m) => Array.from(panelOf(m).querySelectorAll("button, a")).filter((el) => !el.disabled);

  let switchTimer = null;
  const cancelSwitch = () => { clearTimeout(switchTimer); switchTimer = null; };

  function close(m) {
    panelOf(m).hidden = true;
    trigOf(m).setAttribute("aria-expanded", "false");
    m.classList.remove("is-open");
  }
  function closeAll(except = null) {
    for (const m of menus) if (m !== except && isOpen(m)) close(m);
  }
  function open(m, { focusFirst = false } = {}) {
    closeAll(m);
    panelOf(m).hidden = false;
    trigOf(m).setAttribute("aria-expanded", "true");
    m.classList.add("is-open");
    reflow(m);
    if (focusFirst) itemsOf(m)[0]?.focus();
  }

  /**
   * Keep the panel inside the window.
   *
   * The bar is centred and the rightmost menus open near the edge, so a
   * left-aligned panel can hang off it. Measured and flipped rather than
   * guessed at with a media query, because the width that overflows depends on
   * the panel's contents, not on the viewport alone.
   */
  function reflow(m) {
    const p = panelOf(m);
    p.classList.remove("align-right");
    const r = p.getBoundingClientRect();
    if (r.right > window.innerWidth - 8) p.classList.add("align-right");
  }

  for (const m of menus) {
    const trig = trigOf(m);
    const panel = panelOf(m);

    trig.addEventListener("click", (e) => {
      e.stopPropagation();
      cancelSwitch();
      if (isOpen(m)) close(m); else open(m);
    });

    // Menubar switching, with intent. Only fires while some menu is ALREADY
    // open -- hovering the bar when everything is closed opens nothing, which
    // is the behaviour that makes hover menus feel like a minefield.
    trig.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "touch") return;
      if (isOpen(m)) return;
      if (!menus.some(isOpen)) return;
      cancelSwitch();
      switchTimer = setTimeout(() => open(m), SWITCH_INTENT_MS);
    });
    trig.addEventListener("pointerleave", cancelSwitch);
    // Entering the open panel cancels a pending switch: the pointer has
    // arrived where it was going.
    panel.addEventListener("pointerenter", cancelSwitch);

    panel.addEventListener("click", (e) => {
      const item = e.target.closest("button, a");
      if (!item) return;
      if (KEEP_OPEN.has(item.id)) { reflow(m); return; }
      // After, not before: the item's own listener is bound elsewhere and has
      // to see this click first.
      setTimeout(() => close(m), 0);
    });

    trig.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(m, { focusFirst: true });
      }
    });

    panel.addEventListener("keydown", (e) => {
      const items = itemsOf(m);
      const i = items.indexOf(doc.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
      else if (e.key === "Home") { e.preventDefault(); items[0]?.focus(); }
      else if (e.key === "End") { e.preventDefault(); items[items.length - 1]?.focus(); }
      else if (e.key === "Tab") { close(m); }
    });
  }

  // Pointerdown, not click: a menu that waits for the full click cycle stays up
  // through a drag that started outside it, which reads as unresponsive.
  doc.addEventListener("pointerdown", (e) => {
    if (!e.target.closest(".menu[data-menu]")) { cancelSwitch(); closeAll(); }
  });

  bindEscapeOnce(doc);
  registerDismisser(() => {
    const open_ = menus.filter(isOpen);
    if (!open_.length) return false;
    cancelSwitch();
    for (const m of open_) { close(m); trigOf(m).focus(); }
    return true;
  });

  window.addEventListener("resize", () => { for (const m of menus) if (isOpen(m)) reflow(m); });

  return { closeAll, isAnyOpen: () => menus.some(isOpen) };
}

/**
 * The command centre's own show/hide.
 *
 * Mark: "something more of a command center that you can hide would be better."
 * Collapsed it keeps the identity, the palette key and the way back, because a
 * bar that hides its own reopener is a bar you have to reload to recover.
 */
export function createCommandCentre(doc = document, menus = null) {
  const bar = doc.querySelector(".command-centre");
  const btn = doc.getElementById("cc-collapse");
  if (!bar || !btn) return { toggle() {} };
  const KEY = "caliper.commandcentre.collapsed";

  const apply = (collapsed) => {
    bar.classList.toggle("is-collapsed", collapsed);
    btn.setAttribute("aria-expanded", String(!collapsed));
    btn.setAttribute("title", collapsed ? "Show the command centre (H)" : "Hide the command centre (H)");
    btn.textContent = collapsed ? "▾" : "▴";
  };

  let start = false;
  try { start = localStorage.getItem(KEY) === "1"; } catch { /* storage blocked */ }
  apply(start);

  const toggle = () => {
    const next = !bar.classList.contains("is-collapsed");
    apply(next);
    try { localStorage.setItem(KEY, next ? "1" : "0"); } catch { /* see above */ }
  };
  btn.addEventListener("click", toggle);

  doc.addEventListener("keydown", (e) => {
    if (e.key !== "h" && e.key !== "H") return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    // Not while typing: the build box is a text input and H is a letter.
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    // Collapsing the bar hides the command menus with display:none, which left
    // a panel "open" in the module's own bookkeeping and aria-expanded="true"
    // on a trigger nobody could see. Close them first, so the state the module
    // reports and the state on screen are the same one.
    menus?.closeAll?.();
    toggle();
  });

  return { toggle };
}
