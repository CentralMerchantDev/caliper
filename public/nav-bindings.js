/**
 * The single source of truth for what a camera gesture is called and how you
 * trigger it. The wheel's segment labels, #nav-pad-hint's text and the
 * keyboard-only legend all render from this table -- so adding or renaming a
 * gesture updates all three, and the three quietly disagreeing (which is
 * exactly how #nav-pad-hint went stale enough to never mention pan) becomes
 * structurally impossible rather than a discipline problem.
 *
 * `segment: true` means it appears as a wheel wedge. `segment: false` means
 * it is a keyboard-only binding the wheel cannot carry (WASD-family movement,
 * which is per-mode and has no single camera-action equivalent) -- those are
 * the ones the "?" legend exists for. If every binding could be a wedge,
 * there would be no legend left to keep.
 */
export const NAV_BINDINGS = [
  { id: "orbit", label: "Orbit", segment: true, keyHint: null, gestureHint: "drag to orbit" },
  { id: "pan", label: "Pan", segment: true, keyHint: null, gestureHint: "mid-drag/shift-drag to pan" },
  { id: "zoom", label: "Zoom", segment: true, keyHint: null, gestureHint: "scroll to zoom" },
  { id: "focus", label: "Focus", segment: true, keyHint: "F", gestureHint: "dbl-click or F to focus" },
  { id: "north", label: "North", segment: true, keyHint: "N", gestureHint: "N to face north" },
  { id: "rewind", label: "Rewind", segment: true, keyHint: null, gestureHint: "wheel to rewind" },
  { id: "walk-move", label: "Move", segment: false, keyHint: "WASD", gestureHint: "WASD, Shift to sprint", modes: ["walk"] },
  { id: "drive-move", label: "Drive", segment: false, keyHint: "WASD", gestureHint: "WASD", modes: ["drive"] },
  { id: "fly-move", label: "Fly", segment: false, keyHint: "WASD + Q/E", gestureHint: "WASD, Q/E to elevate", modes: ["fly"] },
];

export function wheelSegments() {
  return NAV_BINDINGS.filter((b) => b.segment);
}

/** Bindings the wheel cannot carry for the given mode -- what the "?" legend shows. */
export function keyboardOnlyBindings(mode) {
  return NAV_BINDINGS.filter((b) => !b.segment && (!b.modes || b.modes.includes(mode)));
}

/** #nav-pad-hint's text, generated rather than hand-maintained. */
export function hintText(mode) {
  const parts = wheelSegments().map((b) => b.gestureHint);
  for (const b of keyboardOnlyBindings(mode)) parts.push(b.gestureHint);
  return parts.join(" · ");
}

/**
 * A linear "go back one step" history, ~20 entries, browser-back style --
 * not a branching undo tree. Rewinding must not itself push a pose, or the
 * stack can never be escaped: pop a pose, apply it to the camera, the
 * settle-tracker below notices the camera moved and pushes what it thinks is
 * a new position -- which is the position just rewound to, right back on top
 * of the stack it was just popped off of. Net effect: the button appears to
 * do nothing after the first click. `skipNextPush` swallows exactly that one
 * push and no other -- push() during ordinary navigation is unaffected.
 */
export function createPoseHistory({ max = 20 } = {}) {
  const stack = [];
  let skipNextPush = false;
  return {
    push(pose) {
      if (skipNextPush) {
        skipNextPush = false;
        return;
      }
      stack.push(pose);
      if (stack.length > max) stack.shift();
    },
    rewind() {
      if (stack.length === 0) return null;
      skipNextPush = true;
      return stack.pop();
    },
    get length() {
      return stack.length;
    },
  };
}

function posesEqual(a, b, eps = 1e-6) {
  if (!a || !b) return a === b;
  return (
    Math.abs(a.lookAtX - b.lookAtX) < eps &&
    Math.abs(a.lookAtZ - b.lookAtZ) < eps &&
    Math.abs(a.delta - b.delta) < eps &&
    Math.abs(a.pitch - b.pitch) < eps &&
    Math.abs(a.camDist - b.camDist) < eps
  );
}

/**
 * A camera move "settles" when the pose stops changing for `settleMs` after
 * it last changed. At that point, onSettle is called with the pose as it was
 * immediately BEFORE this run of changes began -- one continuous drag, pan or
 * zoom is one history entry, not one per polled frame, the same way a paint
 * program's undo treats one brush stroke as one step. Fed by explicit
 * `update(pose, now)` calls rather than reading the clock itself, so it can
 * be driven by fake timestamps in a test without a real timer or a renderer.
 */
export function createSettleTracker({ settleMs = 400, onSettle }) {
  let lastPose = null;
  let poseBeforeChange = null;
  let lastChangeAt = null;
  let pending = false;
  return {
    update(pose, now) {
      if (lastPose === null) {
        lastPose = pose;
        poseBeforeChange = pose;
        return;
      }
      if (!posesEqual(pose, lastPose)) {
        if (!pending) poseBeforeChange = lastPose;
        pending = true;
        lastChangeAt = now;
        lastPose = pose;
      } else if (pending && now - lastChangeAt >= settleMs) {
        onSettle(poseBeforeChange);
        pending = false;
      }
    },
  };
}
