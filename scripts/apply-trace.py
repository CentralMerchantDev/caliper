import io, json, re, sys

gen = json.load(open("/tmp/gen.json"))
p = "public/city-plan.js"
s = io.open(p, encoding="utf-8").read()

def block(start_marker, s):
    """Return (start_index, end_index) of `export const NAME = [ ... ];`"""
    i = s.index(start_marker)
    j = s.index("\n];", i) + 3
    return i, j

# ---- LANDMASSES ------------------------------------------------------------
i, j = block("export const LANDMASSES = [", s)
mainland = re.search(r'  \{\n    id: "mainland".*?\n  \},\n', s[i:j], re.S)
assert mainland, "mainland block not found"
head = '''export const LANDMASSES = [
  // ===========================================================================
  // TRACED FROM THE DRAWN LAYOUT
  //
  // These outlines are not authored: they are Mark's pen strokes, isolated by
  // colour, filled, contour-traced and mapped to metres through an affine
  // solved from six calibration pillars rendered at known world coordinates
  // (max residual 130 m over 46 km).
  //
  // Several passes were spent interpreting the drawing by eye and getting it
  // wrong every time -- islands too small, too few, in the wrong place. The
  // difference between those passes and this one is that this is a measurement.
  // ===========================================================================
'''
s = s[:i] + head + gen["landmasses"] + "\n" + mainland.group(0) + "];" + s[j:]

# ---- COAST (downtown's outline) -------------------------------------------
i, j = block("export const COAST = [", s)
s = s[:i] + ("export const COAST = [\n"
             "  // Downtown island, traced from the drawn layout. ISLAND, the district\n"
             "  // fractions and the whole block grid derive from this, so the city plan\n"
             "  // follows the drawing automatically rather than being re-fitted by hand.\n"
             + gen["coast"] + "\n];") + s[j:]

# ---- SETTLEMENTS -----------------------------------------------------------
i, j = block("export const SETTLEMENTS = [", s)
keep = []
for m in re.finditer(r'  \{ id:"([a-z0-9-]+)".*?\n(?:[^\n]*\n)*?(?=  \{ id:"|\];)', s[i:j]):
    sid = m.group(1)
    # keep everything that lives on the mainland; islands are regenerated
    if any(k in sid for k in ("suburb", "farm", "hillside", "port", "airport", "harbour", "beach")):
        keep.append(m.group(0).rstrip("\n"))
s = s[:i] + ("export const SETTLEMENTS = [\n"
             "  // Island settlements are DERIVED from each island's own polygon (see\n"
             "  // scripts/build-from-trace.py). Hand-written rectangles are what put\n"
             "  // Ocean City's downtown in the lagoon and generated street grids across\n"
             "  // open water; a settlement that comes from the land cannot miss it.\n"
             + gen["settlements"] + "\n\n  // --- mainland, unchanged ---\n"
             + "\n".join(keep) + "\n];") + s[j:]

io.open(p, "w", encoding="utf-8").write(s)
print("applied traced geography")
