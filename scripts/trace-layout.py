# =============================================================================
# TRACE THE DRAWN LAYOUT
#
# Converts Mark's hand-drawn coastlines into world-coordinate polygons.
#
# Why this exists: several passes were spent interpreting the drawing by eye and
# getting it wrong -- islands too small, in the wrong place, the wrong number of
# them. Eyeballing a hand drawing against a 3D render is not a measurement, and
# every time it was treated as one the result was a confident wrong answer.
#
# This is the measurement. The pen strokes are isolated by colour, the closed
# loops they form are filled, the resulting regions are traced, and each contour
# is mapped to metres through an affine solved from six calibration markers
# rendered at known world coordinates (max residual 130 m over 46 km).
# =============================================================================
import sys, json
sys.setrecursionlimit(50000)
from collections import deque
import numpy as np
from PIL import Image

SRC = sys.argv[1]
OUT = sys.argv[2]

# affine from the marker fit: world = M @ [px, py, 1]
MX = (27.2103, 0.1270, -22313.0)
MZ = (-0.0222, 27.5696, -11686.0)
to_world = lambda px, py: (MX[0]*px + MX[1]*py + MX[2], MZ[0]*px + MZ[1]*py + MZ[2])

im = Image.open(SRC).convert("RGB")
a = np.asarray(im).astype(np.int16)
R, G, B = a[..., 0], a[..., 1], a[..., 2]
sat = a.max(2) - a.min(2)

# COASTLINES ONLY. Red and orange are coastlines (islands and mainland); the
# pink/magenta highways and the black X marks must not be traced as land.
coast = (R > 120) & (R - G > 55) & (R - B > 60) & (sat > 70)
pinkish = (B > 130) & (R > 150) & (B - G > 40)
coast &= ~pinkish
print(f"coastline pixels: {int(coast.sum())}")

# Close the gaps a hand-drawn line always has, or the fill leaks out of every
# island and the whole bay comes back as one region.
def dilate(m, k):
    out = m.copy()
    for _ in range(k):
        nxt = out.copy()
        nxt[1:, :] |= out[:-1, :]; nxt[:-1, :] |= out[1:, :]
        nxt[:, 1:] |= out[:, :-1]; nxt[:, :-1] |= out[:, 1:]
        out = nxt
    return out

closed = dilate(coast, 6)

# Flood from the frame edge: anything the outside cannot reach, and that is not
# itself ink, is enclosed by a drawn coastline -- i.e. land.
H, W = closed.shape
outside = np.zeros_like(closed)
q = deque()
for x in range(W):
    for y in (0, H - 1):
        if not closed[y, x] and not outside[y, x]: outside[y, x] = True; q.append((y, x))
for y in range(H):
    for x in (0, W - 1):
        if not closed[y, x] and not outside[y, x]: outside[y, x] = True; q.append((y, x))
while q:
    y, x = q.popleft()
    for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
        ny, nx = y+dy, x+dx
        if 0 <= ny < H and 0 <= nx < W and not closed[ny, nx] and not outside[ny, nx]:
            outside[ny, nx] = True; q.append((ny, nx))

land = ~outside & ~closed
print(f"enclosed land pixels: {int(land.sum())} ({land.mean()*100:.1f}% of frame)")

# label the regions
lab = np.zeros(land.shape, np.int32)
regions = []
n = 0
ys, xs = np.nonzero(land)
for y0, x0 in zip(ys, xs):
    if lab[y0, x0]: continue
    n += 1; q = deque([(y0, x0)]); lab[y0, x0] = n; pts = []
    while q:
        y, x = q.popleft(); pts.append((y, x))
        for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny, nx = y+dy, x+dx
            if 0 <= ny < H and 0 <= nx < W and land[ny, nx] and not lab[ny, nx]:
                lab[ny, nx] = n; q.append((ny, nx))
    regions.append((len(pts), n, pts))
regions.sort(reverse=True)
print(f"regions: {len(regions)}")

def trace(mask):
    """Moore-neighbour boundary trace of one region; returns pixel ring."""
    ys, xs = np.nonzero(mask)
    sy, sx = ys.min(), xs[ys == ys.min()].min()
    nb = [(-1,0),(-1,1),(0,1),(1,1),(1,0),(1,-1),(0,-1),(-1,-1)]
    ring = [(sy, sx)]; cur = (sy, sx); bdir = 6
    for _ in range(200000):
        found = False
        for k in range(8):
            d = (bdir + 1 + k) % 8
            ny, nx = cur[0] + nb[d][0], cur[1] + nb[d][1]
            if 0 <= ny < mask.shape[0] and 0 <= nx < mask.shape[1] and mask[ny, nx]:
                bdir = (d + 4) % 8; cur = (ny, nx); ring.append(cur); found = True; break
        if not found: break
        if cur == (sy, sx) and len(ring) > 3: break
    return ring

def resample(ring, n=46):
    """Even resampling of a CLOSED ring.

    Douglas-Peucker was the obvious choice and it was wrong here: on a closed
    ring the first and last point are the same, so the baseline it measures
    against has zero length, every perpendicular distance is zero, and it
    returns two points for every island. Even arc-length sampling has no such
    degenerate case and keeps the shape a coastline needs -- it is splined
    downstream anyway.
    """
    if len(ring) <= n: return ring
    d = [0.0]
    for i in range(1, len(ring)):
        d.append(d[-1] + float(np.hypot(ring[i][0] - ring[i-1][0], ring[i][1] - ring[i-1][1])))
    total = d[-1] or 1.0
    out, j = [], 0
    for k in range(n):
        target = total * k / n
        while j < len(d) - 1 and d[j] < target: j += 1
        out.append(ring[j])
    return out

MIN_PX = 900          # ignore specks
out = []
for size, idx, _pts in regions:
    if size < MIN_PX: continue
    ring = trace(lab == idx)
    ring = [(float(x), float(y)) for (y, x) in ring]
    simp = resample(ring, 46)
    world = [[round(v) for v in to_world(px, py)] for px, py in simp]
    x0 = min(p[0] for p in world); x1 = max(p[0] for p in world)
    z0 = min(p[1] for p in world); z1 = max(p[1] for p in world)
    area = 0.0
    for i in range(len(world)):
        ax, az = world[i]; bx, bz = world[(i + 1) % len(world)]
        area += ax * bz - bx * az
    out.append({
        "px_area": size, "km2": round(abs(area / 2) / 1e6, 2),
        "bounds": [x0, x1, z0, z1], "points": world,
    })

out.sort(key=lambda r: -r["km2"])
print(f"\ntraced {len(out)} land regions:")
for r in out:
    b = r["bounds"]
    print(f"  {r['km2']:8.2f} km²   x {b[0]:>7}..{b[1]:<7}  z {b[2]:>7}..{b[3]:<7}  {len(r['points'])} pts")
json.dump(out, open(OUT, "w"), indent=1)
print(f"\nwrote {OUT}")
