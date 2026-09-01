# =============================================================================
# TRACE THE MAINLAND SHORE
#
# The islands came from the filled ORANGE loops. The mainland is different: its
# coast is an OPEN curve drawn in red, running from the bottom-left, up and
# across the top, and back down to the bottom-right. There is no loop to fill,
# so it is traced as a path instead.
#
# Red and orange separate cleanly by green channel -- inside the ink, red sits
# at G~27 and orange at G~85, with nothing between. That is a measurement, not
# a guessed threshold.
# =============================================================================
import sys, json
import numpy as np
from PIL import Image

SRC, OUT = sys.argv[1], sys.argv[2]

MX = (27.2103, 0.1270, -22313.0)
MZ = (-0.0222, 27.5696, -11686.0)
to_world = lambda px, py: (MX[0]*px + MX[1]*py + MX[2], MZ[0]*px + MZ[1]*py + MZ[2])

a = np.asarray(Image.open(SRC).convert("RGB")).astype(np.int16)
R, G, B = a[..., 0], a[..., 1], a[..., 2]
sat = a.max(2) - a.min(2)
ink = (R > 120) & (R - B > 60) & (sat > 70)
pink = (B > 130) & (R > 150) & (B - G > 40)
red = ink & ~pink & (G < 50)
print(f"red pixels: {int(red.sum())}")

ys, xs = np.nonzero(red)
pts = np.stack([xs, ys], 1).astype(float)

# Thin the cloud to a manageable set of nodes on a coarse grid, keeping one
# representative per cell so the walk below is not dominated by line thickness.
CELL = 9
seen = {}
for x, y in pts:
    k = (int(x // CELL), int(y // CELL))
    seen.setdefault(k, []).append((x, y))
nodes = np.array([np.mean(v, 0) for v in seen.values()])
print(f"nodes after thinning: {len(nodes)}")

# Greedy nearest-neighbour walk from the left-most node. The red line is one
# long open stroke, so ordering by "always step to the nearest node not yet
# used" recovers the path; a break longer than the jump limit ends it.
start = int(np.argmin(nodes[:, 0]))
used = np.zeros(len(nodes), bool)
order = [start]; used[start] = True
JUMP = 130.0
while True:
    cur = nodes[order[-1]]
    d = np.hypot(nodes[:, 0] - cur[0], nodes[:, 1] - cur[1])
    d[used] = np.inf
    j = int(np.argmin(d))
    if not np.isfinite(d[j]) or d[j] > JUMP:
        break
    order.append(j); used[j] = True
path = nodes[order]
print(f"path length: {len(path)} nodes, {int(used.sum())}/{len(nodes)} used")

# resample evenly so the spline downstream gets well-spaced control points
seg = np.hypot(np.diff(path[:, 0]), np.diff(path[:, 1]))
cum = np.concatenate([[0], np.cumsum(seg)])
N = 52
targets = np.linspace(0, cum[-1], N)
resampled = np.stack([np.interp(targets, cum, path[:, 0]), np.interp(targets, cum, path[:, 1])], 1)

world = [[round(v) for v in to_world(px, py)] for px, py in resampled]
# make sure it runs west to east, which is what the mainland polygon expects
if world[0][0] > world[-1][0]:
    world.reverse()

print(f"\nmainland shore, {len(world)} points:")
print(f"  x {min(p[0] for p in world)}..{max(p[0] for p in world)}"
      f"   z {min(p[1] for p in world)}..{max(p[1] for p in world)}")
json.dump(world, open(OUT, "w"))
print(f"wrote {OUT}")
