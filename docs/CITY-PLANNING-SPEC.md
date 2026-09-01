# City planning spec — the rules this world is generated from

Every number here is sourced. Where a figure could not be found in a primary
document it is marked **[unsourced]** and must not be quietly turned into a
constant — the point of this document is that the generator stops inventing
plausible numbers.

Where two authorities genuinely disagree, both are given. That is a real
disagreement in the profession, not an error to resolve by picking one.

---

## 0. How to read this

Three kinds of number appear in the generator, and confusing them is what caused
most of the defects this rebuild exists to fix:

| Kind | Scales with `WORLD_SCALE`? | Examples |
| --- | --- | --- |
| **Landform metres** | yes | coastline, terrain height, hills, sea depth |
| **Built metres** | **no** | lane width, block size, runway length, berth depth |
| **Dimensionless** | never needs to | gradients, ratios, densities, coverage |

A runway is 3,400 m because that is what a wide-body needs to get airborne. It
does not get shorter because the island did.

---

## 1. Streets

### 1.1 Cross-section — right-of-way by class

| Class | ROW (m) | Lanes | Footway each side | Source |
| --- | --- | --- | --- | --- |
| Local / residential street | 17.7 | 2 @ 3.2 | 3.51 (streetside) | ITE/CNU C-4 |
| Avenue | 25.9 | 4 @ 3.2 | 4.42 | ITE/CNU C-4 |
| Boulevard (minimum multiway) | 31.7 | 4 @ 3.05 | 2.74 | ITE/CNU |
| Boulevard (desirable urban centre) | 45.4 | 4 @ 3.35 | 6.55 | ITE/CNU Table 8.1 |
| Urban freeway (4-lane deck) | ~25 | 4 @ 3.6 | **0** | AASHTO Exhibit 8-9 |

**Footway share of ROW falls monotonically with class:** ~40% of a residential
street, 30–35% of an avenue, 17–29% of a boulevard, 0% of a freeway. Parking
occupies 13–24% where present. Medians appear only at boulevard class and above,
at 12–19%.

> **AASHTO says no such thing as a standard ROW by class.** Its position is that
> ROW "should be sufficient to accommodate the ultimate planned roadway". ROW
> width is set by municipal ordinance. Anything presented as "the standard ROW
> for a collector" is local, not national.

**Lane width — a live professional disagreement, encode as a doctrine switch:**

- AASHTO: 3.0–3.6 m; 3.6 m "most desirable" on high-speed principal arterials.
- NACTO: 3.05 m appropriate in urban areas; lanes **over 3.35 m "should not be
  used"**. Lanes over 3.3–3.4 m are associated with 33% higher impact speeds.

Parking lane 2.1 m residential / 2.4 m commercial. Footway absolute minimum
1.2 m (PROWAG, legally binding in the US), 2.4 m or greater in commercial areas.

### 1.2 Network spacing

| Context | Arterial spacing | Source |
| --- | --- | --- |
| Dense urban core | **≤ 400 m** | ITE/CNU Ch. 3 |
| Urban | **≤ 800 m** | ITE/CNU |
| Conventional suburban | up to 1,600 m, only with 6-lane facilities | ITE/CNU |

Collector continuity: typically 1.6–3.2 km in length.

**No standard figure exists for freeway-to-freeway spacing.** [unsourced] Do not
invent one.

### 1.3 Blocks — and the mistake this world currently makes

**Recommended:**

| Metric | Figure | Source |
| --- | --- | --- |
| Desirable block length | **61–122 m** | ITE/CNU (stated twice) |
| Desirable in dense cores | 61–91 m, not exceeding 122 m | ITE/CNU Ch. 3 |
| **Acceptable ceiling** | **183 m** block length | ITE/CNU |
| Max average intersection spacing | **201 m** | ITE/CNU |
| Desirable intersection spacing | < 122 m | ITE/CNU |
| LEED v4 ND prerequisite | ≥ 54 intersections/km² ⇒ ~136 m pitch | USGBC |

**Measured real cities, in metres:**

| City | Block | Street ROW | Grid pitch |
| --- | --- | --- | --- |
| Portland OR | 61 × 61 | 18.29 | 79.25 |
| Manhattan | 61 × 186–280 | 18.29 / 30.48 avenues | 79.25 N–S |
| Barcelona Eixample | 113 × 113, corners chamfered 15 m | 20 (also 30, 60) | 133.3 |
| Kyoto (Heian-kyō) | 120 × 120 | 12 minor | 132 |
| **Melbourne Hoddle** | **201 × 201**, but sub-blocks **~95.6 m deep** after the little street | 30.18 major, **10.06 "little streets"** | 231 |
| Salt Lake City | 201 × 201 | 40.23 | 241.4 |
| Chicago residential | 100.6 × 201.2 + central alley | — | — |

**Intersection spacing by era** — the single most useful knob:

| Fabric | Mean spacing |
| --- | --- |
| Medina (Fez, Sfax) | 10 m |
| European medieval (Toledo) | 40 m |
| Paris, Melbourne, Hong Kong | 150 m |
| Modernist (Brasília, Ville Contemporaine) | 400 m |

> ### ⚠️ WHAT THIS WORLD GETS WRONG
>
> `GRID.AVENUE_SPACING = 230`, `STREET_SPACING = 170`, commented "Melbourne
> Hoddle Grid calibration".
>
> **It took Melbourne's block dimension but not Melbourne's little streets.**
> Melbourne's 201 m block is subdivided by 10.06 m lanes into sub-blocks about
> 95.6 m deep — that subdivision is where its walkable grain comes from. Without
> it, a 201 m block is just a superblock.
>
> At 230 m the current grid exceeds the ITE acceptable ceiling (183 m) *and* the
> maximum average intersection spacing (201 m). It is closer to Brasília than to
> Melbourne.
>
> **Fix:** either drop the pitch to 120–170 m, or keep 230 m and add the little
> streets. The second is more faithful to the stated intent and produces a more
> interesting city.

**A genuine counter-finding, worth keeping as a knob rather than a rule:**
Sevtsuk & Kalvo measured pedestrian accessibility against block length and found
it **parabolic, not monotonic** — there is an optimum and smaller is not always
better. Their optima cluster at **150–240 m**. Portland's 61 m blocks are 8.6%
*below* their own achievable optimum. This is in genuine tension with ITE's
61–122 m: ITE optimises crossing frequency, Sevtsuk optimises reachable frontage.

### 1.4 Gradient — by class, not one number

AASHTO Green Book, urban:

| Class | Level | Rolling | Mountainous |
| --- | --- | --- | --- |
| **Local residential** | **< 15%** | — | — |
| Local commercial / industrial | < 8% (desirably < 5%) | — | — |
| Urban collector | 9% @30 → 7% @100 km/h | 12% → 8% | 14% → 10% |
| Urban arterial | 8% @50 → 5% @100 km/h | 9% → 6% | 11% → 8% |
| Freeway | 4% @80 → 3% @130 km/h | 5% → 4% | 6% → 5% |

- Freeways: **+1%** permitted in mountainous or ROW-constrained urban areas.
- Collectors: **+2%** for lengths under 150 m.
- **Minimum grade for drainage on a curbed street: 0.3%.**
- Intersection approach legs **≤ 5%**; ≤ 2% where ice and snow occur.
- Where sidewalks exist, AASHTO recommends **max 5%** on urban collectors for
  accessibility.

**What real hill cities actually reach:** Baldwin St, Dunedin **34.8%**
(Guinness); Canton Ave, Pittsburgh **37%**; San Francisco Filbert St **31.5%**
(official city figure), with ten SF blocks over 30%; steepest SF *bus* route
**23.1%**. No sourced figure found for Wellington or Lisbon streets — Lisbon's
13.5% is its **tram**, not a street. [unsourced]

**Footways — PROWAG, legally binding:** running grade ≤ 5%, **except it may match
the adjacent street grade where the street exceeds 5%** (this exception is what
makes San Francisco legal). Cross slope ≤ 2.1%.

**Carriageway cross-slope / camber:** 1.5–2% normal crown; 1.5–3% urban
arterial. Superelevation 4–12%, capped 6–8% where ice and snow occur.

> ### ⚠️ WHAT THIS WORLD GETS WRONG
>
> `SLOPE.ROAD_MAX = 0.13` is a **single global limit applied to every class**.
> Against the table above it is roughly right for a local street, far too
> permissive for an arterial (8%), and three times too permissive for a freeway
> (4%).
>
> The grading table in `grade.js` already varies by class (FREEWAY 0.04,
> AVENUE 0.07, STREET 0.09) and happens to land close to the standards. But
> *placement* still uses the single 0.13, so the two disagree: a road can be
> placed on ground its own alignment then has to fight.

### 1.5 Vertical curves

Profile is straight grades joined by parabolic vertical curves. **L = K · A**,
where A is the algebraic grade difference in percent.

| Design speed | K crest | K sag |
| --- | --- | --- |
| 30 km/h | 2 | 6 |
| 50 km/h | 7 | 13 |
| 80 km/h | 26 | — |
| 100 km/h | 52 | — |

Minimum length regardless: **L = 0.6 × V** metres (V in km/h). **Drainage
maximum: K ≤ 51** on curbed sections, or water ponds — the one criterion that is
a maximum. Many engineers accept a grade break of **A ≈ 1% or less** with no
curve at all.

**The most useful single rule:** a 50 km/h street with a 6% grade change needs
42 m of vertical curve; a 100 km/h arterial with the same change needs 312 m.
Roughly **7:1** between local and arterial.

### 1.6 Intersections

- **Corner radii:** urban standard **3.0–4.6 m**; some cities use 0.6 m; radii
  over 4.6 m "should be the exception" (NACTO). Vehicle-oriented 9.1–22.9 m.
- **Angle:** streets should meet near 90°; avoid angles below **60°**.
- **Conflict points:** three-leg **9**, four-leg **32**. A T carries ~28% of the
  conflict load of a crossroads.
- Avoid more than four approaches.
- Cul-de-sac turning radius ≥ 10 m residential, 15 m commercial.

---

## 2. Ports

### 2.1 Depth — what actually sets the site

| Quantity | Rule | Source |
| --- | --- | --- |
| **Berth depth** | draught **+ 0.5 to 1.0 m** | PIANC 121 §2.1.2.7–8 |
| Inner channel, ≤10 kn, no waves | **1.10 × draught** | PIANC 121 Table 2.2 |
| Outer channel, low swell | 1.15–1.2 × draught | " |
| Outer channel, heavy swell (Hs > 2 m) | **1.3–1.4 × draught** | " |
| Bottom correction | mud +0; sand/clay +0.4–0.5 m; **rock/coral +0.6–1.0 m** | " |

**Design ships:** Panamax 12.0 m draught / 275 m berth; Post-Panamax 8,000 TEU
13.0 m / 325 m; Neo-Panamax 12,500 TEU **15.2 m / 370 m**; ULCV 24,000 TEU
400 m LOA, ~16 m draught, **450 m berth**. Capesize bulker 18 m. Suezmax 24 m.

Real built depths: London Gateway 17 m alongside; Deurganckdok 17 m at MLW;
Maasvlakte 2 a 20 m port.

### 2.2 Quay length and back-up land

- **Berth length ≈ LOA + 50 m.** (The widely-quoted UNCTAD "1.1 × LOA + 15 m"
  could not be verified from a primary source. [unsourced])
- **Median container terminal worldwide (n = 331 measured): ~1,000 m of berth** —
  three Panamax or two Post-Panamax simultaneously.
- **Median terminal surface 55 ha**, container yard **27 ha (52%)**, perimeter
  ~4,000 m.
- **Width : length ratio ≈ 0.50 — terminals are twice as long as they are deep.**
- 80% of terminals are under 40 ha; a distinct "mega" tier sits above 120 ha.
- **Back-up depth 350–750 m, median ~500 m**; land ≈ 0.035–0.075 ha per metre of
  quay. *(Derived arithmetic from published pairs, not a published standard.)*

Stacking density: straddle carrier 500–700 TEU/ha; RTG up to 1,000; rail-mounted
gantry up to ~2,000.

### 2.3 Manoeuvring water

| Quantity | Rule |
| --- | --- |
| **Turning basin diameter** | **≥ 2 × LOA** (3 × LOA without tugs) |
| **Harbour entrance width** | **≥ 1 × LOA** — so a casualty cannot strand across it |
| Stopping length, tug-assisted from 4 kn | 1.5–2 × LOA |
| Anchorage radius | LOA + 5 × depth + 30 m |

For a 400 m ULCV: **800 m turning basin**, 400 m entrance.

### 2.4 What makes a good harbour

No source gives a numeric rubric. [unsourced] But the PIANC penalty structure
inverts into one — each bad attribute has a measurable cost:

- **Exposure:** depth factor rises from 1.15 T (Hs < 1 m) to **1.4 T** (Hs > 2 m).
  A swell-exposed approach costs ~25% more dredged depth, plus 0.5–1.0 × beam of
  extra channel width.
- **Tidal range:** extra width required above ~4 m combined with strong currents.
- **Cross-current:** >0.5 kn adds 0.4–1.0 beam of width; PIANC advises
  *realigning the channel* rather than designing for ~2.0 kn.
- **Bed material:** rock/coral costs +0.6–1.0 m of depth and doubles net UKC.

### 2.5 Cranes

Rail gauge **30.48 m (100 ft)** is near-universal, because a common gauge lets
used cranes be resold port to port. Outreach: Panamax 38 m / 13 containers
across; Post-Panamax 45 m / 16; Super-Post-Panamax 53 m / 19; Megamax >53 m / 20+.

**Crane spacing along a quay: not found in any standard.** [unsourced] What is
defensible: the portal is ~27–30 m wide so parked cranes cannot be closer, and
terminals assign 3–5 cranes to a 350–450 m berth ⇒ ~80–130 m per crane in
service. Treat as inference.

---

## 3. Airports

### 3.1 Classification

ICAO Annex 14 Table 1-1. **Code 4 = reference field length ≥ 1,800 m.** Code
letter by wingspan: C 24–36 m, D 36–52 m, **E 52–65 m**, F 65–80 m.

Runway length corrections (Doc 9157 Pt 1 §3.5): **+7% per 300 m of elevation**;
**+1% per °C above ISA**. Over 35% total correction requires a specific study.

Narrow-body at sea level: ~1,700 m (short sector) to ~3,000 m (MTOW, max range,
hot day). A 2,200–2,600 m runway serves most narrow-body operations.

**Wide-body runway length at sea level could not be obtained from a primary
source** — Boeing's ACAP data is raster charts only. [unsourced] What *is*
sourced: any wide-body is code 4 and code letter E or F.

### 3.2 Geometry

| Parameter | Code 4 |
| --- | --- |
| Runway width | **45 m** |
| Overall longitudinal slope | **≤ 1%** |
| Any portion | ≤ 1.25%, **≤ 0.8% in first and last quarter** |
| Slope change | ≤ 1.5% |
| Vertical curve radius | ≥ 30,000 m |
| **Transverse slope** | **1.5%** (code letter C–F) |

**Parallel runway separation (ICAO §3.1.11–12), centreline to centreline:**

- Non-instrument simultaneous: **210 m**
- **Independent** parallel approaches: **1,035 m**
- Dependent parallel approaches: 915 m
- Independent parallel departures / segregated: **760 m**
- FAA: ~1,524 m if a terminal sits between the runways

### 3.3 Protected land

- **Runway strip:** 60 m beyond each end; **140 m each side** for a code-4
  instrument runway ⇒ a cleared strip **280 m wide × (length + 120 m)**.
- **RESA:** ≥ 90 m beyond the strip, **240 m recommended**.
- **Approach surface:** starts 60 m from threshold, inner edge 175–200 m,
  diverging 10% each side, **4,500 m long at 3.33%** ⇒ final width ~1,075 m.
- **Horizontal surface: radius 10,750 m at 90 m height.**
- **Take-off climb surface: 10,000 m long, final width 1,800 m, 2% slope.**
- US 14 CFR 77.19 precision approach: **15.24 km** long, flaring to 4.88 km.

### 3.4 Site area and distance from the city

| Tier | Area |
| --- | --- |
| Small regional, single runway | 200–400 ha |
| Mid-size, 2 runways | 560–1,600 ha |
| Large hub | 1,900–3,300 ha |
| Greenfield mega | 7,000–13,800 ha (Denver 13,759 ha) |

Median ~614–655 ha per runway across 23 airports. **Standards-derived airside
minimum: ~179 ha per code-4 runway** before any taxiway, apron or terminal.

**Distance from centre: median ≈ 25 km**, in two clear populations — legacy
airports the city grew around at **5–16 km** (Dubai 4.7, Schiphol 9, Frankfurt
12, Atlanta 16), and post-1970 greenfield replacements at **25–60 km** (CDG 25,
Denver 38.6, Narita 60).

**There is no "minimum km from housing" rule anywhere.** The distance is an
emergent product of four measurable envelopes:

1. **Noise.** Heathrow's site is 12.27 km²; its day 57 dB contour is **102.5 km²**
   and its night 48 dB contour **111.5 km²** — 8–9× the airport polygon.
   US: residential land is **not compatible at DNL 65 dB**.
2. **Obstacle limitation** — a *disc*, not a strip: 10.75–15 km radius ⇒ ~707 km².
3. **Wildlife separation** (FAA AC 150/5200-33C): 5,000 ft piston / **10,000 ft
   turbine** to any hazardous attractant; 5 miles to protect approach airspace;
   statutory **6 miles** to a municipal landfill. 78% of strikes occur below
   1,000 ft AGL.
4. **Land assembly cost.** Heathrow NW runway: £17.6 bn, 783 houses demolished.

---

## 4. Railways

### 4.1 Gradient

| Mode | Typical | Maximum | Source |
| --- | --- | --- | --- |
| Heavy freight | 1.0–1.5% | ~2.2% (N. American standard grade) | trade press |
| Conventional passenger | ≤ 1.25% | 2.5–3.5% | California HSR TM 2.1.2 |
| **High-speed, passenger-dedicated** | 1.25–2.5% | **3.5%**, with 10 km moving average ≤ 2.5% and continuous run ≤ 6 km | **EU TSI §4.2.3.3** |
| Metro | ≤ 3% | 4.0% | MDOT |
| Light rail / tram | 3.5–4% | 6.0% absolute | Denver RTD |
| **Platform tracks** | — | **0.25%** where vehicles are attached/detached | EU TSI |

**There is no single authoritative "maximum gradient for an adhesion railway."**
[unsourced] The 3.5% TSI figure is a passenger-dedicated limit with an envelope
condition, not a general ceiling. Real extremes: Lisbon tram 13.5% (Guinness,
steepest adhesion in the world); Sheffield Supertram 10%; Saluda Grade 4.7%
(steepest US Class I mainline); Lickey Incline 2.65% needed dedicated bankers.

**Encode:** ≤1% unremarkable freight main; 1–2% needs helpers; 2.5–3.5% steep and
passenger-only; >3.5% beyond adhesion practice.

### 4.2 Curves and formation

- **Minimum horizontal radius, new lines: 150 m** (EU TSI §4.2.3.4).
- **Minimum vertical curve radius: 500 m** main track.
- Derived design radii (R = 11.8 V² / (D + I), D = 160, I = 100):
  80 km/h → 290 m; **120 km/h → 655 m**; 160 → 1,160 m; 200 → 1,815 m.
- **Track centre distance:** 3.80 m (≤200 km/h) → 4.50 m (>300 km/h). No free
  primary figure exists for ≤160 km/h standard gauge — the TSI defers to a
  paywalled CEN standard. [unsourced]
- **Formation width: single ≈ 7 m, double ≈ 12–13 m.** *(Indian Railways sources
  conflict: 12.15 vs 12.85 vs 10.82 m for double BG. Flagged.)*

### 4.3 Freight corridors and terminals

EU TEN-T core network (Reg. 1315/2013 Art. 39): **≥22.5 t axle load, 100 km/h,
740 m train length**, full electrification, ERTMS.

- Ports over **2 M tonnes/yr** must be rail-connected.
- Intermodal terminal qualifies at **800,000 t/yr** non-bulk.
- Real: London Gateway has **25 km of double track on site** and handles 750 m
  trains inside the ISPS fence. CFL Bettembourg is a **33 ha** terminal in a
  ~100 ha logistics zone, with 700 m platform tracks.
- Marshalling yards: Maschen **7,000 × 700 m (280 ha)**; Bailey Yard
  **13 km × 3.2 km (1,150 ha)**.

---

## 5. Where the three sit, relative to the city and each other

### 5.1 The port migrates downstream; the city keeps the old site

Bird's **Anyport** model: (1) port adjacent to the city centre; (2) expansion
downstream toward deeper draught, with rail integrated into the terminals;
(3) specialisation — dedicated container piers, and the original central sites
reconvert to waterfront parks and housing.

| Migration | Distance |
| --- | --- |
| London Bridge → Royal Albert Dock | 18 km |
| London Bridge → Tilbury | 40 km |
| Central London → London Gateway | 48 km |
| Rotterdam port extent | 40 km long × 10 km wide |
| Hamburg | deliberately **110 km upstream** |

The causal sentence: *"proximity to the centre of London became less important
than access to deep water, unrestricted sites, and reduction in time spent
travelling up the winding Thames."*

Encodable taxonomy: **migration** (old site stays open) vs **relocation**;
**continuous** (adjacent) vs **discontinuous** (a bridge away). River and delta
ports expand **downstream**; coastal ports expand **laterally**.

### 5.2 Why port, heavy industry and rail cluster

- **Draught is the binding constraint and few sites have it.** Steel, ore,
  refining and grain must sit *at the quay* — the alternative is transhipping the
  world's cheapest cargo.
- **Modal capacity ratio:** truck 25 t, rail car 110 t, barge 1,750 t ⇒ 1 barge ≈
  16 rail cars ≈ 70 trucks.
- **The port generates a land-transport load the city cannot absorb.** A single
  20,000 TEU call requires ~1,120 trucks + 14 trains + 12 barges — "an
  uninterrupted queue of 30 km."

Counter-pattern worth encoding: **Yangshan has no direct rail connection at all.**
Not every deepwater port gets on-dock rail.

### 5.3 The airport obeys the opposite logic

The port is **pinned by bathymetry** and drags rail and heavy industry to it.
The airport is pinned by nothing except flat, cheap, obstacle-free,
noise-tolerant land, and is *repelled* from the city by the four envelopes in
§3.4. That is why airports sit at a median ~25 km while ports either stay at
5–15 km or run 30–90 km to deep water.

---

## 6. Placement rules, distilled

- **Port:** coastline maximising natural depth ≥ 1.1 × design draught, Hs < 1 m at
  the approach. Require ≥ 2 LOA turning basin, ≥ 1 LOA entrance, ~3 km straight
  approach inside shelter. Claim 0.035–0.075 ha of back-up land per metre of
  quay, 350–750 m deep, long axis along the shore at 2:1.
- **Heavy industry and marshalling yards:** attach to the port polygon on the
  landward side, along the rail corridor.
- **Rail freight corridor:** gradient ≤ 1%, radius ≥ 655 m at 120 km/h, formation
  12–13 m double track, terminal tracks ≥ 740 m.
- **Airport:** flattest available polygon **20–40 km out**, ≥ 179 ha of airside
  envelope per runway, aligned to prevailing wind, 15 km obstacle-free approach
  fan each end, no landfill within 6 miles.
- **Blocks:** pitch 120–170 m, or 200+ m subdivided by little streets. Not 230 m
  undivided.
- **Arterials:** ≤ 400 m apart in the core, ≤ 800 m in the wider urban area.
- **Gradients:** per class — freeway 4%, arterial 8%, local street 15%.

---

## 7. Two figures that circulate widely and are wrong

- **Barcelona's "50 m" street class.** Sources give 20 / 30 / **60** m.
- **SmartCode's "1,600 ft T6 block perimeter."** v9.2 Table 14c is **2,000 ft**.

And one attribution: **Jane Jacobs gives no number.** *Death and Life* Ch. 9 is
entirely qualitative; the "800-foot" figure attributed to her is commentators
describing the Manhattan grid she was reacting to.
