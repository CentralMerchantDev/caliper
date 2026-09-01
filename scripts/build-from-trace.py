# =============================================================================
# BUILD THE WORLD FROM THE TRACED LAYOUT
#
# Emits the land masses, settlements and bridges for city-plan.js directly from
# the polygons traced out of Mark's drawing.
#
# Everything here is DERIVED. The whole history of this build says that is the
# only thing that works: every time a coastline, a settlement rectangle or a
# bridge anchor was typed in by hand against a shape nobody re-measured, it
# drifted -- the barrier's downtown ended up declared in the lagoon, 19 of 40
# bridge ends met no road, and settlement grids were laid across open water.
# Deriving them from the actual polygons means they cannot disagree with the
# land, because the land is where they come from.
# =============================================================================
import json, sys, math

REGIONS = json.load(open(sys.argv[1]))

# name, kind, base height -- largest first, matching the traced order
SPEC = [
    ("barrier",        "Ocean Barrier Island", "beach-strip", 9),
    ("downtown",       "Downtown Island",      "city",        10),
    ("fairlight-isle", "Fairlight Island",     "island",      9),
    ("kingsley-isle",  "Kingsley Island",      "island",      9),
    ("cormorant-isle", "Cormorant Island",     "island",      9),
    ("westbay-isle",   "Westbay Island",       "island",      8),
    ("bayview-isle",   "Bayview Island",       "island",      9),
    ("heron-isle",     "Heron Island",         "island",      8),
    ("redcliff-isle",  "Redcliff Island",      "island",      8),
    ("gull-isle",      "Gull Island",          "island",      7),
]

def area(pts):
    a = 0.0
    for i in range(len(pts)):
        ax, az = pts[i]; bx, bz = pts[(i + 1) % len(pts)]
        a += ax * bz - bx * az
    return abs(a / 2)

def centroid(pts):
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))

# --- land masses -----------------------------------------------------------
land_lines = []
meta = []
for (iid, name, kind, base), r in zip(SPEC, REGIONS):
    pts = r["points"]
    km2 = area(pts) / 1e6
    b = r["bounds"]
    meta.append(dict(id=iid, name=name, kind=kind, km2=km2, bounds=b, pts=pts))
    if iid == "downtown":
        # downtown takes its outline from COAST, like the rest of the plan expects
        land_lines.append(f'''  {{
    id: "downtown", name: "Downtown Island", kind: "city", baseHeight: {base},
    // outline supplied from COAST -- traced from the drawn layout, {km2:.1f} km2
  }},''')
        continue
    rows = []
    for i in range(0, len(pts), 4):
        rows.append("      " + ", ".join(f"[{x}, {z}]" for x, z in pts[i:i+4]) + ",")
    land_lines.append(f'''  {{
    // {km2:.1f} km2, traced from the drawn layout
    id: "{iid}", name: "{name}", kind: "{kind}", baseHeight: {base},
    points: [
{chr(10).join(rows)}
    ],
  }},''')

# --- COAST (downtown's outline) --------------------------------------------
dt = next(m for m in meta if m["id"] == "downtown")
coast_rows = []
for i in range(0, len(dt["pts"]), 4):
    coast_rows.append("  " + ", ".join(f"[{x}, {z}]" for x, z in dt["pts"][i:i+4]) + ",")

# --- settlements: derived from each island's own box ------------------------
# Big islands get a dense core plus a shore band; small ones get one village.
sett = []
for m in meta:
    if m["kind"] == "beach-strip":
        continue                              # the barrier is banded separately
    x0, x1, z0, z1 = m["bounds"]
    w, d = x1 - x0, z1 - z0
    # 14% left every island's grid stopping well short of its own shore, so the
    # bridges landing there met no road. Roads are clipped to land downstream
    # anyway, so the grid can safely reach much closer to the coast.
    ins = min(w, d) * 0.05                    # keep the grid just off the beach
    sx0, sx1 = round(x0 + ins), round(x1 - ins)
    sz0, sz1 = round(z0 + ins), round(z1 - ins)
    if sx1 - sx0 < 400 or sz1 - sz0 < 400:
        continue
    cx, cz = (sx0 + sx1) // 2, (sz0 + sz1) // 2
    cw, cd = (sx1 - sx0) // 3, (sz1 - sz0) // 3
    if m["id"] == "downtown":
        continue                              # downtown has its own district plan
    if m["km2"] >= 4.0:
        core_cls = "TOWER" if m["km2"] >= 7 else "MIDRISE"
        sett.append(f'''  {{ id:"{m['id']}-core", name:"{m['name'].split()[0]}", landmass:"{m['id']}",
    bounds:{{xMin:{cx-cw},xMax:{cx+cw},zMin:{cz-cd},zMax:{cz+cd}}}, av:185, st:146, cls:"{core_cls}",
    core:0.66, edge:0.42 }},''')
        sett.append(f'''  {{ id:"{m['id']}-shore", name:"{m['name'].split()[0]} Shore", landmass:"{m['id']}",
    bounds:{{xMin:{sx0},xMax:{sx1},zMin:{sz0},zMax:{sz1}}}, av:148, st:117, cls:"TOWNHOUSE",
    exclude:{{xMin:{cx-cw},xMax:{cx+cw},zMin:{cz-cd},zMax:{cz+cd}}} }},''')
    else:
        sett.append(f'''  {{ id:"{m['id']}-vlg", name:"{m['name'].split()[0]}", landmass:"{m['id']}",
    bounds:{{xMin:{sx0},xMax:{sx1},zMin:{sz0},zMax:{sz1}}}, av:135, st:106, cls:"VILLA",
    core:0.55, edge:0.35 }},''')

out = {
    "landmasses": "\n".join(land_lines),
    "coast": "\n".join(coast_rows),
    "settlements": "\n".join(sett),
    "meta": [{k: m[k] for k in ("id", "name", "kind", "km2", "bounds")} for m in meta],
}
json.dump(out, open(sys.argv[2], "w"), indent=1)
print(f"generated {len(meta)} land masses, {len(sett)} settlements")
for m in meta:
    print(f"  {m['id']:16} {m['km2']:7.1f} km2   x {m['bounds'][0]:>7}..{m['bounds'][1]:<7} z {m['bounds'][2]:>6}..{m['bounds'][3]}")
