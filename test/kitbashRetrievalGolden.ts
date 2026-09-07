// =============================================================================
// CALIPER — KITBASH VOCABULARY RETRIEVAL GOLDEN SET (Phase R2.2)
//
// 35 Hand-authored query -> expected kitbash part pairs covering the 62 parts.
// Evaluated with nDCG@10, P@1, P@5, and R@10.
// =============================================================================

export interface KitbashGoldenPair {
  id: string;
  query: string;
  category: "podium" | "shaft" | "crown" | "roof" | "connector" | "fabric";
  expected: string[];
  description: string;
}

export const KITBASH_HELD_OUT_SET: KitbashGoldenPair[] = [
  // ---------------------------------------------------------------------------
  // 1. Podiums
  // ---------------------------------------------------------------------------
  {
    id: "kb-01",
    query: "grand classical colonnade with fluted stone pillars",
    category: "podium",
    expected: ["podium-retail-colonnade", "podium-arcade-terrace"],
    description: "Retail colonnade podium with classical pillars",
  },
  {
    id: "kb-02",
    query: "stepped entrance terrace with grand monumental portal",
    category: "podium",
    expected: ["podium-entrance-plaza", "podium-civic-steps"],
    description: "Entrance plaza podium with stepped portal",
  },
  {
    id: "kb-03",
    query: "ventilated parking structure with louvred openings",
    category: "podium",
    expected: ["podium-parking-deck"],
    description: "Multi-level parking deck podium with louvres",
  },
  {
    id: "kb-04",
    query: "pedestrian arcade terrace with streetfront overhang",
    category: "podium",
    expected: ["podium-arcade-terrace"],
    description: "Classical arcade terrace podium",
  },
  {
    id: "kb-05",
    query: "civic portico steps with monumental neoclassical facade",
    category: "podium",
    expected: ["podium-civic-steps"],
    description: "Civic steps portico podium",
  },
  {
    id: "kb-06",
    query: "recessed glass atrium lobby with deep setback",
    category: "podium",
    expected: ["podium-recessed-lobby"],
    description: "Recessed glass atrium podium",
  },
  {
    id: "kb-07",
    query: "waterfront promenade base with maritime stone plinth",
    category: "podium",
    expected: ["podium-waterfront-base"],
    description: "Waterfront promenade base podium",
  },
  {
    id: "kb-08",
    query: "stepped landscaped garden terrace base",
    category: "podium",
    expected: ["podium-stepped-garden"],
    description: "Stepped garden terrace podium",
  },

  // ---------------------------------------------------------------------------
  // 2. Shafts
  // ---------------------------------------------------------------------------
  {
    id: "kb-09",
    query: "glazed curtain wall facade with vertical mullions",
    category: "shaft",
    expected: ["shaft-curtain-wall-straight"],
    description: "Straight glass curtain wall tower shaft",
  },
  {
    id: "kb-10",
    query: "biophilic curved eco planter terraces with integrated greenery",
    category: "shaft",
    expected: ["shaft-curved-eco-terrace"],
    description: "Curved eco terrace tower shaft",
  },
  {
    id: "kb-11",
    query: "art deco fluted stone pilaster piers with vertical rhythm",
    category: "shaft",
    expected: ["shaft-fluted-artdeco"],
    description: "Art deco fluted shaft",
  },
  {
    id: "kb-12",
    query: "structural diagrid diamond lattice exoskeleton with triangular bracing",
    category: "shaft",
    expected: ["shaft-diamond-lattice"],
    description: "Diagrid diamond lattice shaft",
  },
  {
    id: "kb-13",
    query: "twisting helical glass tower envelope",
    category: "shaft",
    expected: ["shaft-twisted-glass"],
    description: "Twisted glass helical shaft",
  },
  {
    id: "kb-14",
    query: "cylindrical curved glass office drum core",
    category: "shaft",
    expected: ["shaft-cylindrical-core"],
    description: "Cylindrical drum shaft",
  },
  {
    id: "kb-15",
    query: "triangular prism tower with sharp chamfered prow",
    category: "shaft",
    expected: ["shaft-triangular-prism"],
    description: "Triangular prism tower shaft",
  },
  {
    id: "kb-16",
    query: "cantilevered floating sky cubes with alternating shifted box volumes",
    category: "shaft",
    expected: ["shaft-cantilever-boxes"],
    description: "Cantilever shifted boxes shaft",
  },
  {
    id: "kb-17",
    query: "raw concrete brutalist heavy vertical ribs",
    category: "shaft",
    expected: ["shaft-brutalist-ribs"],
    description: "Brutalist concrete ribs shaft",
  },
  {
    id: "kb-18",
    query: "aerodynamic elliptical curved aerofoil tower facade",
    category: "shaft",
    expected: ["shaft-elliptical-aerofoil"],
    description: "Elliptical aerofoil shaft",
  },
  {
    id: "kb-19",
    query: "residential apartment tower with cantilevered balconies",
    category: "shaft",
    expected: ["shaft-balconied-residential"],
    description: "Balconied residential shaft",
  },
  {
    id: "kb-20",
    query: "twin slender towers linked by central glass atrium spine",
    category: "shaft",
    expected: ["shaft-twin-atrium"],
    description: "Twin atrium tower shaft",
  },
  {
    id: "kb-21",
    query: "telescoping stepped setback stack volume",
    category: "shaft",
    expected: ["shaft-setback-stack"],
    description: "Telescoping setback stack shaft",
  },
  {
    id: "kb-22",
    query: "octagonal faceted crystalline tower shaft",
    category: "shaft",
    expected: ["shaft-octagonal-tower"],
    description: "Octagonal faceted shaft",
  },

  // ---------------------------------------------------------------------------
  // 3. Crowns
  // ---------------------------------------------------------------------------
  {
    id: "kb-23",
    query: "stepped ziggurat lantern crown with illuminated pinnacle",
    category: "crown",
    expected: ["crown-ziggurat-lantern"],
    description: "Ziggurat lantern crown",
  },
  {
    id: "kb-24",
    query: "sunburst arched vaulted art deco crown",
    category: "crown",
    expected: ["crown-sunburst-arch"],
    description: "Sunburst vaulted crown",
  },
  {
    id: "kb-25",
    query: "cantilevered rooftop flight deck helipad landing zone",
    category: "crown",
    expected: ["crown-helipad-cantilever"],
    description: "Cantilever flight deck crown",
  },
  {
    id: "kb-26",
    query: "panoramic geodesic glass dome cupola lantern",
    category: "crown",
    expected: ["crown-dome-lantern"],
    description: "Geodesic dome cupola crown",
  },
  {
    id: "kb-27",
    query: "tapered architectural needle spire finial",
    category: "crown",
    expected: ["crown-tapered-spire"],
    description: "Tapered spire crown",
  },
  {
    id: "kb-28",
    query: "faceted apex glass sky pyramid crown",
    category: "crown",
    expected: ["crown-sky-pyramid"],
    description: "Glass apex pyramid crown",
  },
  {
    id: "kb-29",
    query: "slanted crystalline faceted angular roof",
    category: "crown",
    expected: ["crown-slanted-crystal"],
    description: "Slanted crystalline roof crown",
  },
  {
    id: "kb-30",
    query: "parabolic solar energy collector dish crown",
    category: "crown",
    expected: ["crown-solar-dish"],
    description: "Parabolic solar dish crown",
  },

  // ---------------------------------------------------------------------------
  // 4. Roof Features, Connectors & Fabric
  // ---------------------------------------------------------------------------
  {
    id: "kb-31",
    query: "rooftop sky infinity pool with perimeter water edge",
    category: "roof",
    expected: ["roof-infinity-pool"],
    description: "Rooftop infinity swimming pool feature",
  },
  {
    id: "kb-32",
    query: "telecommunications transmitter aerial mast antenna with beacon",
    category: "roof",
    expected: ["roof-aerial-antenna-array"],
    description: "Telecom aerial antenna array mast",
  },
  {
    id: "kb-33",
    query: "rooftop solar photovoltaic panel canopy array",
    category: "roof",
    expected: ["roof-solar-panel-canopy"],
    description: "Solar PV canopy roof feature",
  },
  {
    id: "kb-34",
    query: "enclosed double-deck aerial skybridge walkway link",
    category: "connector",
    expected: ["connector-skybridge-straight-double"],
    description: "Double-deck aerial skybridge connector",
  },
  {
    id: "kb-35",
    query: "residential townhouse with projecting canted bay windows",
    category: "fabric",
    expected: ["fabric-townhouse-bay-front"],
    description: "Townhouse bay window low rise fabric",
  },
];
