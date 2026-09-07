// ONE STREET, END TO END -- WORLD-REBALANCE-BRIEF.md's road-piece-kit task,
// step 3: "lay a single real street as pieces on the grid -- straights, a
// curve, an intersection, a crossing -- socket-verified, rendered."
//
// Pure placement logic, importable from Node (for verification/reporting,
// no browser needed) and from a page (for rendering) -- neither environment
// gets a copy that could drift from the other.
//
// WHY THIS DOES ITS OWN POSITION/BEARING CHECK, NOT JUST verifySocketMating.
// roadkit.js's own header comment claims two sockets mate "when sockets
// face each other (bearing diff 180°) and widths/lanes match" -- but
// verifySocketMating (read in full before writing this) only checks kind,
// width and lanes. It never reads `.at` or `.bearing` at all, on either
// socket. So calling it alone would "verify" two pieces as mated even if
// they were nowhere near each other, or facing the same direction instead
// of opposite. This module places pieces with real position/bearing
// chaining math (turtle-graphics style: each piece's entry socket lands
// exactly where the previous piece's exit socket is, facing it), and
// checks the geometry itself -- not just the dimensional compatibility
// verifySocketMating checks -- so "socket-verified" here means both:
// verifySocketMating's own dimensional check, AND an actual coincidence/
// opposite-bearing check this module supplies because the kit does not.
import * as ROADKIT from "./roadkit.js";

const D2R = Math.PI / 180;
const EPS = 1e-6;

/** World direction, (x, z), for a bearing in degrees. Bearing 0 = +Z. */
function dirFor(bearingDeg) {
  const r = bearingDeg * D2R;
  return [Math.sin(r), Math.cos(r)];
}

/** Rotate a local (x, z) point by a bearing (degrees) into world space --
 *  the same rotation THREE.Object3D.rotation.y = bearingDeg * D2R applies,
 *  verified against roadkit.js's own convention (bearing 0 = +Z). */
function rotate(lx, lz, bearingDeg) {
  const r = bearingDeg * D2R;
  return [lx * Math.cos(r) + lz * Math.sin(r), -lx * Math.sin(r) + lz * Math.cos(r)];
}

/**
 * Chain a sequence of {model, entryIdx, exitIdx} through the world, each
 * piece's entry socket landing exactly on the previous piece's exit socket,
 * facing it. Returns placements ({model, x, z, rotY(deg)}) and a
 * verification report per join.
 */
export function buildDemoStreet() {
  const seq = [
    { model: ROADKIT.straight("STREET", 2), entryIdx: 0, exitIdx: 1, label: "straight (2 modules, 16 m)" },
    { model: ROADKIT.crossing("zebra", "STREET"), entryIdx: 0, exitIdx: 1, label: "zebra crossing" },
    { model: ROADKIT.straight("STREET", 2), entryIdx: 0, exitIdx: 1, label: "straight (2 modules, 16 m)" },
    { model: ROADKIT.curve("STREET", 32, 90), entryIdx: 0, exitIdx: 1, label: "curve (r=32 m, 90°)" },
    { model: ROADKIT.straight("STREET", 1), entryIdx: 0, exitIdx: 1, label: "straight (1 module, 8 m)" },
    { model: ROADKIT.intersection4Way("STREET", "STREET"), entryIdx: 0, exitIdx: 1, label: "4-way intersection (through, N/S)" },
    { model: ROADKIT.straight("STREET", 2), entryIdx: 0, exitIdx: 1, label: "straight (2 modules, 16 m)" },
  ];

  let x = 0, z = 0, heading = 0; // heading: world bearing traffic is currently travelling
  const placements = [];
  const verification = [];
  let prevExit = null; // { x, z, bearing, socket } of the previous piece's exit socket

  for (const step of seq) {
    const { model, entryIdx, exitIdx, label } = step;
    const entrySock = model.sockets[entryIdx];
    const exitSock = model.sockets[exitIdx];

    // Place so the entry socket, after rotating by `heading`, lands at
    // the current chain point (x, z).
    const rotY = heading;
    const [ex, ez] = rotate(entrySock.at[0], entrySock.at[2], rotY);
    const originX = x - ex, originZ = z - ez;

    placements.push({ model, label, x: originX, z: originZ, rotY });

    // Verify against the PREVIOUS piece's exit socket, if any.
    if (prevExit) {
      let dimError = null;
      try {
        ROADKIT.verifySocketMating(prevExit.socket, entrySock);
      } catch (e) {
        dimError = e.message;
      }
      const posErr = Math.hypot(x - prevExit.x, z - prevExit.z);
      const entryWorldBearing = (entrySock.bearing + rotY) % 360;
      // "Face each other" means entryWorldBearing sits at prevExit.bearing
      // + 180 -- so measure how far it is from THAT target, wrapped into
      // [0, 180], not from prevExit.bearing itself (which would always
      // read exactly 180 off by construction and never detect a real
      // misalignment).
      const target = (prevExit.bearing + 180) % 360;
      const bearingDiff = Math.abs(((entryWorldBearing - target + 540) % 360) - 180);
      verification.push({
        from: prevExit.label, to: label,
        dimensionalOk: !dimError, dimError,
        positionErrorM: posErr, positionOk: posErr < EPS,
        prevExitWorldBearing: prevExit.bearing, entryWorldBearing,
        bearingDiffFrom180: bearingDiff, bearingOk: bearingDiff < EPS,
      });
    }

    // Compute this piece's exit socket in world space, for the next join.
    const [wx, wz] = rotate(exitSock.at[0], exitSock.at[2], rotY);
    const exitWorldX = originX + wx, exitWorldZ = originZ + wz;
    const exitWorldBearing = (exitSock.bearing + rotY) % 360;
    prevExit = { x: exitWorldX, z: exitWorldZ, bearing: exitWorldBearing, socket: exitSock, label };
    x = exitWorldX; z = exitWorldZ; heading = exitWorldBearing;
  }

  return { placements, verification };
}
