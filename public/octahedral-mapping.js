// Shared between public/impostor-bake-scene.html (the real bake) and
// test/impostorBake.test.ts (which verifies the guaranteed-non-negative-y
// property numerically) -- so the test checks the REAL function, not its
// own second copy of the same formula. A duplicated copy is exactly how
// the bug this file exists to fix (y = 1 - |u| - |v| going negative at
// the square's own corners) could drift out of sync with whatever the
// test believed it was checking.
export function hemiOctahedralDirection(u, v) {
  // u, v in [-1, 1]. FOUND WRONG BY A BLIND AUDIT: the un-folded formula
  // y = 1 - |u| - |v| only stays non-negative inside the diamond
  // |u|+|v| <= 1 -- the four CORNERS of the square domain (e.g. u=v=1
  // gives y=-1) produced directions on the LOWER hemisphere, so 40 of the
  // 64 angles in the committed bake looked at the piece from below,
  // contradicting this file's own "hemisphere, never below" intent. The
  // standard fix (the same fold used by full-sphere octahedral encodings,
  // e.g. Godot/Unity impostor bakers' own shaders) reflects the
  // negative-y excess back into x/z, keeping the mapping continuous and
  // area-reasonable across the WHOLE square while guaranteeing y >= 0
  // everywhere.
  let x = u, z = v;
  let y = 1.0 - Math.abs(x) - Math.abs(z);
  if (y < 0) {
    const oldX = x;
    x = (1.0 - Math.abs(z)) * Math.sign(oldX);
    z = (1.0 - Math.abs(oldX)) * Math.sign(z);
    y = -y;
  }
  const len = Math.sqrt(x * x + y * y + z * z);
  return [x / len, y / len, z / len];
}
