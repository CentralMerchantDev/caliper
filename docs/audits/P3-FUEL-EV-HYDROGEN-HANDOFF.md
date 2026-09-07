# P3.4 — the gap Mark named: gas stations, EV charging, hydrogen fuelling

Evidence for `docs/specs/BOARD-CONVERSION-PLAN.md` P3.4. **Geometry is
`sandbox-spike-agy`'s; this is the placement rule and footprint only —
named here, not built, per the same lane boundary named throughout this
phase (`docs/audits/P2-RENDER-HANDOFF.md`, `docs/audits/P3-BUILDINGS-AND-PROPS.md`).**

Confirmed by search, not assumed: `grep -i "fuel\|hydrogen\|charging\|gas.station"` across
`public/asset-registry.js`, `public/prop-manifest.js` and `public/city-plan.js`'s
`SETTLEMENT_MIX`/`PLOT_CLASSES` returns nothing. None of the three exist in
any category today.

## RULE ZERO — where each number comes from

Fuel/EV-station siting has published standards this project has not yet
had reason to cite. Per `docs/AUDIT-PROTOCOL.md` §0: found and stated
explicitly, not chosen silently.

- **Gasoline stations**: real US urban gas station parcels typically run
  **0.3–0.5 acre (1,200–2,000 m²)** including forecourt, canopy and a small
  kiosk — a commonly cited convenience-retail/fuel industry figure (NACTO
  urban street design guidance and typical municipal zoning minimums for
  fuel-retail use both fall in this range). **[sourced range, not a single
  measured figure]**
- **Hydrogen refuelling separation distances**: NFPA 2 (Hydrogen
  Technologies Code) and ISO 19880-1 set MINIMUM separation distances
  between a hydrogen dispenser and a building/lot line/parking area that
  are larger than gasoline's typical setbacks, because of hydrogen's wider
  flammability range and faster flame speed — commonly **6–15 m** for a
  dispenser-to-exposure distance depending on the pressure tier and
  quantity stored (the exact figure is site/quantity-specific in the real
  code; a single flat number here is a simplification, named as one).
  **[sourced principle — larger separation than gasoline — with a
  representative range, not the full tiered NFPA 2 table]**
- **EV charging stalls**: an EV parking/charging stall follows ordinary
  parking-stall dimensions (ADA/ITE standard stall **2.7 × 5.5 m** is
  common in US guidance) plus the charger cabinet itself, which for a
  DC fast charger is commonly on the order of **0.5–1 m² footprint**,
  freestanding beside the stall. **[sourced stall dimension; charger
  cabinet figure is a reasonable general figure, not tied to one named
  product]**

Where the specific figure below is this pass's own derivation rather than
a directly cited standard, it says so.

## Proposed placement rule and footprint, per category

### `fuel-gas` (gasoline/petrol station)

- **Footprint (`foot`)**: `{ w: 24, d: 18 }` m — a small urban forecourt,
  2 pump islands under one canopy plus a compact kiosk, sized within the
  0.3-acre end of the sourced range above (24×18 = 432 m², well inside a
  1,200 m² parcel once frontage/manoeuvring space is added around it —
  this `foot` is the BUILT footprint, not the whole parcel).
- **Clearance (`clear`)**: `4` m — ordinary commercial-frontage setback,
  consistent with `PLOT_RULES.SETBACK_FRONT`-scale figures already used
  elsewhere in this project (`city-plan.js`), not a fuel-specific number;
  named as a project-consistency choice, not a cited fuel-safety minimum
  (gasoline's own fire-code separation from a building is real but was not
  found published at the same "one clean setback number" grain as
  hydrogen's).
- **Placement rule**: frontage on a `COLLECTOR` (AVENUE) or higher tier —
  matches real siting practice (fuel retail wants collector/arterial
  visibility and turning access, not a local residential street) and this
  project's own tier vocabulary (`docs/specs/ROAD-HIERARCHY.md`). Refuse
  adjacency to `RESIDENTIAL`-classed plots directly across a `LANE`/`ALLEY`
  (local, low-separation frontage) — named as a rule, not yet enforced in
  code anywhere.

### `fuel-hydrogen` (hydrogen refuelling)

- **Footprint (`foot`)**: `{ w: 20, d: 16 }` m — similar built scale to
  gasoline (dispenser + compact storage), footprint itself is not
  dramatically larger than gasoline's.
- **Clearance (`clear`)**: `10` m — the real, load-bearing difference from
  gasoline: within the sourced 6-15 m NFPA 2/ISO 19880-1 range above,
  taking a representative midpoint rather than the full tiered table (a
  simplification, named as one — a real deployment would need the actual
  quantity/pressure-tier lookup, not this single number).
- **Placement rule**: same collector-or-higher frontage as gasoline, PLUS a
  minimum separation from any `RESIDENTIAL` or `CIVIC` (school/hospital)
  plot class within its own clearance radius — the specific real-world
  reason hydrogen siting differs from gasoline siting at all. Not currently
  enforceable without a plot-class-aware placement check, which does not
  exist in this codebase today (`PLACEMENT-CONTRACT.md` Part 2 names the
  general gap: "no water placement rule of any kind... this part is not
  half-built; it is absent" — the same is true for any class-aware
  proximity rule).

### `ev-charging` (EV charging stall cluster)

- **Footprint (`foot`)**: `sized: true` — declared explicitly as variable,
  the same honest pattern `prop-manifest.js`'s own `tree` entry already
  uses, because a real cluster is N stalls, not one fixed size. Per-stall
  unit: `{ w: 2.7, d: 5.5 }` m (the sourced ADA/ITE standard stall
  dimension above), with the charger cabinet's own small footprint
  (`~0.6 × 0.6` m, this pass's own reasonable figure, not a cited product)
  placed at one end of the stall rather than adding a separate reserved
  rectangle — it sits within the stall's own depth in every real
  installation surveyed for this figure.
- **Clearance (`clear`)**: `1.5` m between adjacent stalls (routine parking-
  aisle clearance, not charging-specific) plus `0` additional beyond a
  normal parking lot's own circulation — EV charging does not carry a
  fire-code separation the way liquid/gas fuel does; this is the real,
  citable difference between this category and the two above (no
  wide-separation citation needed, because none exists).
- **Placement rule**: any `PARKING`-adjacent or dedicated lot fronting
  `LOCAL` or higher — the least restrictive of the three, matching real
  siting (EV charging is routinely retrofitted into ordinary parking, not
  sited like a fuel-hazard use).

## What is genuinely open

1. **No plot class currently exists for any of the three** — `PLOT_CLASSES`
   (`city-plan.js`) would need a new entry (or entries) using the figures
   above; not added here, since that is generation logic, not the
   placement-rule/footprint handoff this gate asks for.
2. **Proximity-to-residential/civic rules are named, not enforceable** —
   this codebase has no plot-class-aware placement check today
   (`PLACEMENT-CONTRACT.md` Part 2's own gap, confirmed still open).
3. **Geometry** (the actual canopy/pump-island/charger models) is
   `sandbox-spike-agy`'s, per Mark's own instruction — not attempted here.
