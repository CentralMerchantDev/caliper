// ONE STREET, END TO END -- WORLD-REBALANCE-BRIEF.md's road-piece-kit task,
// step 3: "lay a single real street as pieces on the grid -- straights, a
// curve, an intersection, a crossing -- socket-verified, rendered."
//
// Pure placement logic, importable from Node (for verification/reporting,
// no browser needed) and from a page (for rendering) -- neither environment
// gets a copy that could drift from the other.
//
// P0.2 (BOARD-CONVERSION-PLAN.md): this used to carry its own duplicate
// position/bearing mating check, because verifySocketMating() didn't do one
// -- it only checked kind/width/lanes despite its header claiming otherwise
// (see roadkit.js). That gap is now fixed there (transformSocket() +
// verifySocketMating() do the full check, in world space), so this module
// no longer needs a second implementation of "do these mate". Two
// implementations of the same check is the two-sources-of-truth pattern
// that has cost this project the skyline, the tiers and the clearance
// already -- one verifier, used here and by whatever places pieces later.
import * as ROADKIT from "./roadkit.js";

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
  let prevExitWorld = null; // previous piece's exit socket, already in world space; { label, ...socket }

  for (const step of seq) {
    const { model, entryIdx, exitIdx, label } = step;
    const entrySock = model.sockets[entryIdx];
    const exitSock = model.sockets[exitIdx];
    const rotY = heading;

    // Solve for the origin that puts the entry socket, once rotated by
    // rotY, at the current chain point (x, z): rotate the local socket
    // about a placement of (0,0) to get the offset, then subtract it.
    const rotatedOnly = ROADKIT.transformSocket(entrySock, { x: 0, z: 0, rotationDeg: rotY });
    const originX = x - rotatedOnly.at[0], originZ = z - rotatedOnly.at[2];

    placements.push({ model, label, x: originX, z: originZ, rotY });

    const entryWorld = ROADKIT.transformSocket(entrySock, { x: originX, z: originZ, rotationDeg: rotY });

    // Verify against the PREVIOUS piece's exit socket, if any -- through
    // the one shared verifier (roadkit.js's verifySocketMating), not a
    // second implementation of the same check.
    if (prevExitWorld) {
      let error = null;
      try {
        ROADKIT.verifySocketMating(prevExitWorld, entryWorld);
      } catch (e) {
        error = e.message;
      }
      // Diagnostics for the HUD only -- not a second pass/fail verdict.
      // Pass/fail above comes solely from verifySocketMating.
      const positionErrorM = Math.hypot(entryWorld.at[0] - prevExitWorld.at[0], entryWorld.at[2] - prevExitWorld.at[2]);
      const target = ((prevExitWorld.bearing + 180) % 360 + 360) % 360;
      const bearingDiffFrom180 = Math.abs(((entryWorld.bearing - target + 540) % 360) - 180);
      verification.push({
        from: prevExitWorld.label, to: label,
        ok: !error, error,
        positionErrorM, bearingDiffFrom180,
      });
    }

    // Compute this piece's exit socket in world space, for the next join.
    const exitWorld = ROADKIT.transformSocket(exitSock, { x: originX, z: originZ, rotationDeg: rotY });
    prevExitWorld = { ...exitWorld, label };
    x = exitWorld.at[0]; z = exitWorld.at[2]; heading = exitWorld.bearing;
  }

  return { placements, verification };
}
