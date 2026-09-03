// =============================================================================
// CALIPER — ASSET REGISTRY
//
// Source of truth for what the world needs vs what exists.
// Sourcing rule:
//   - count in thousands -> "code" (shared geometry / InstancedMesh)
//   - seen close and count < 20 -> hand-built or CC0 import
//   - everything else -> "code", cheapest reasonable version
// =============================================================================

/**
 * @typedef {Object} AssetEntry
 * @property {string} id
 * @property {"roof"|"furniture"|"facade"|"boundary"|"ground"|"vegetation"|"people"|"vehicles"|"maritime"|"aviation"|"airport"|"roads"|"civic"|"buildings"|"parks"|"industrial"} category
 * @property {"built"|"planned"|"generator"|"skipped"} status
 * @property {"code"|"import"} source
 * @property {"close"|"mid"|"far"} seenAs
 * @property {number} count Estimated instances across the 26 km world
 * @property {"showstopper"|"signature"|"standard"|"generic"} [tier] Asset visual quality and landmark tier
 * @property {string} [generator] Generator function name if produced by a family
 * @property {string} [note] Design or sourcing rationale
 */

/** @type {AssetEntry[]} */
export const ASSET_REGISTRY = [
  // --- 1. ROOF CLUTTER (18,758 Roofs - Skyline Silhouette) ---
  { id: "roof-plant", category: "roof", status: "generator", source: "code", seenAs: "far", count: 4200, generator: "roofClutter('plant', size)", note: "Commercial HVAC chillers and air handling units" },
  { id: "chimney", category: "roof", status: "generator", source: "code", seenAs: "mid", count: 12500, generator: "roofClutter('chimney', size)", note: "Residential brick stacks and terracotta pots" },
  { id: "aerial", category: "roof", status: "generator", source: "code", seenAs: "mid", count: 8600, generator: "roofClutter('aerial', size)", note: "VHF/UHF communication aerials and rooftop masts" },
  { id: "satellite-dish", category: "roof", status: "generator", source: "code", seenAs: "mid", count: 6400, generator: "roofClutter('dish', size)", note: "Parabolic satellite transceivers" },
  { id: "solar-panel", category: "roof", status: "generator", source: "code", seenAs: "far", count: 9800, generator: "roofClutter('solar', size)", note: "Photovoltaic panel arrays" },
  { id: "ac-unit", category: "roof", status: "generator", source: "code", seenAs: "close", count: 14000, generator: "roofClutter('ac', size)", note: "Wall and rooftop split condensing units" },
  { id: "water-tower-roof", category: "roof", status: "built", source: "code", seenAs: "far", count: 850, note: "Rooftop wooden/steel water storage tanks" },
  { id: "elevator-overrun", category: "roof", status: "built", source: "code", seenAs: "far", count: 3200, note: "Lift motor room roof structures" },

  // --- 2. STREET FURNITURE & CIVIC DETAILS ---
  { id: "bench-slat", category: "furniture", status: "generator", source: "code", seenAs: "close", count: 2400, generator: "streetFurniture('bench', 'slat')", note: "Standard slatted public bench" },
  { id: "bench-backless", category: "furniture", status: "generator", source: "code", seenAs: "close", count: 1200, generator: "streetFurniture('bench', 'backless')", note: "Plaza backless bench" },
  { id: "bin-round", category: "furniture", status: "generator", source: "code", seenAs: "close", count: 3100, generator: "streetFurniture('bin', 'round')", note: "Cylindrical litter receptacle" },
  { id: "bin-post", category: "furniture", status: "generator", source: "code", seenAs: "close", count: 1800, generator: "streetFurniture('bin', 'post')", note: "Post-mounted public litter bin" },
  { id: "bus-shelter", category: "furniture", status: "generator", source: "code", seenAs: "close", count: 650, generator: "streetFurniture('shelter', 'standard')", note: "Glazed transit shelter with seating" },
  { id: "lamp-street", category: "furniture", status: "generator", source: "code", seenAs: "mid", count: 5200, generator: "streetFurniture('lamp', 'street')", note: "Arched highway and street luminaire" },
  { id: "lamp-pedestrian", category: "furniture", status: "generator", source: "code", seenAs: "close", count: 3800, generator: "streetFurniture('lamp', 'pedestrian')", note: "Ornate sidewalk lantern column" },
  { id: "traffic-light", category: "furniture", status: "generator", source: "code", seenAs: "close", count: 1100, generator: "streetFurniture('traffic-light', 'standard')", note: "Intersection signal mast" },
  { id: "sign-warning", category: "furniture", status: "generator", source: "code", seenAs: "close", count: 1800, generator: "streetFurniture('sign', 'warning')", note: "Triangular highway warning sign" },
  { id: "sign-wayfinding", category: "furniture", status: "generator", source: "code", seenAs: "close", count: 950, generator: "streetFurniture('sign', 'wayfinding')", note: "Pedestrian fingerpost navigation" },
  { id: "utility-cabinet-telecom", category: "furniture", status: "generator", source: "code", seenAs: "close", count: 1400, generator: "streetFurniture('cabinet', 'telecom')", note: "Telecom fiber distribution hub" },
  { id: "utility-cabinet-power", category: "furniture", status: "generator", source: "code", seenAs: "close", count: 900, generator: "streetFurniture('cabinet', 'power')", note: "Electrical substation kiosk" },
  { id: "market-stall", category: "furniture", status: "generator", source: "code", seenAs: "close", count: 240, generator: "streetFurniture('market-stall', 'canopy')", note: "Market square retail stall" },
  { id: "playground-slide", category: "furniture", status: "generator", source: "code", seenAs: "close", count: 180, generator: "streetFurniture('playground', 'slide')", note: "Park playground chute" },
  { id: "playground-swings", category: "furniture", status: "generator", source: "code", seenAs: "close", count: 180, generator: "streetFurniture('playground', 'swings')", note: "Park playground A-frame swings" },
  { id: "fountain", category: "furniture", status: "generator", source: "code", seenAs: "mid", count: 75, generator: "streetFurniture('civic', 'fountain')", note: "Tiered civic stone fountain" },
  { id: "statue", category: "furniture", status: "generator", source: "code", seenAs: "close", count: 45, generator: "streetFurniture('civic', 'statue')", note: "Memorial bronze statue on stone plinth" },
  { id: "flagpole", category: "furniture", status: "generator", source: "code", seenAs: "mid", count: 320, generator: "streetFurniture('civic', 'flagpole')", note: "Civic flagpole with banner" },
  { id: "mailbox", category: "furniture", status: "generator", source: "code", seenAs: "close", count: 1600, generator: "streetFurniture('mailbox', 'standard')", note: "Postal collection box" },
  { id: "hydrant", category: "furniture", status: "generator", source: "code", seenAs: "close", count: 2200, generator: "streetFurniture('hydrant', 'standard')", note: "Fire hydrant pillar" },
  { id: "bollard", category: "furniture", status: "generator", source: "code", seenAs: "close", count: 6400, generator: "streetFurniture('bollard', 'standard')", note: "Cast iron security bollard" },
  { id: "planter", category: "furniture", status: "generator", source: "code", seenAs: "close", count: 1900, generator: "streetFurniture('planter', 'concrete')", note: "Concrete street planter box" },
  { id: "bike-rack", category: "furniture", status: "generator", source: "code", seenAs: "close", count: 1100, generator: "streetFurniture('bike-rack', 'hoop')", note: "Inverted-U bicycle parking hoop" },
  { id: "cafe-table", category: "furniture", status: "generator", source: "code", seenAs: "close", count: 850, generator: "streetFurniture('cafe-table', 'round')", note: "Sidewalk cafe table and chairs" },
  { id: "parasol", category: "furniture", status: "generator", source: "code", seenAs: "close", count: 700, generator: "streetFurniture('parasol', 'hex')", note: "Outdoor dining parasol" },
  { id: "kiosk-newspaper", category: "furniture", status: "built", source: "code", seenAs: "close", count: 120, note: "Street newspaper and tobacco kiosk" },
  { id: "public-toilet", category: "furniture", status: "built", source: "code", seenAs: "close", count: 80, note: "Automated public convenience pod" },

  // --- 3. GROUND DETAILS ---
  { id: "manhole", category: "ground", status: "generator", source: "code", seenAs: "close", count: 7800, generator: "groundFurniture('manhole')", note: "Cast iron drainage manhole cover" },
  { id: "drain-grating", category: "ground", status: "generator", source: "code", seenAs: "close", count: 9200, generator: "groundFurniture('grate')", note: "Gutter stormwater drainage grating" },
  { id: "paving-tactile", category: "ground", status: "built", source: "code", seenAs: "close", count: 4500, generator: "groundFurniture('tactile')", note: "Pedestrian blister paving crossing slabs" },

  // --- 4. FACADE ELEMENTS ---
  { id: "awning", category: "facade", status: "generator", source: "code", seenAs: "close", count: 3200, generator: "facade('awning', width)", note: "Fabric retail shop awning" },
  { id: "shopfront", category: "facade", status: "generator", source: "code", seenAs: "close", count: 2800, generator: "facade('shopfront', width)", note: "Glazed ground-floor commercial shopfront" },
  { id: "shutters", category: "facade", status: "generator", source: "code", seenAs: "mid", count: 8900, generator: "facade('shutters', width)", note: "External window louvre shutters" },
  { id: "balcony", category: "facade", status: "generator", source: "code", seenAs: "mid", count: 6400, generator: "facade('balcony', width)", note: "Cantilevered apartment balcony with balustrade" },
  { id: "fire-escape", category: "facade", status: "built", source: "code", seenAs: "mid", count: 450, note: "External steel fire escape stairs" },

  // --- 5. BOUNDARIES & WALLS ---
  { id: "fence-iron", category: "boundary", status: "generator", source: "code", seenAs: "close", count: 4800, generator: "boundary('fence-iron', length)", note: "Spear-topped wrought iron railing" },
  { id: "fence-picket", category: "boundary", status: "generator", source: "code", seenAs: "close", count: 6200, generator: "boundary('fence-picket', length)", note: "Residential timber picket fence" },
  { id: "gate-iron", category: "boundary", status: "generator", source: "code", seenAs: "close", count: 1800, generator: "boundary('gate-iron', length)", note: "Double swing garden gate" },
  { id: "hedge", category: "boundary", status: "generator", source: "code", seenAs: "mid", count: 8400, generator: "boundary('hedge', length)", note: "Formal trimmed evergreen hedge" },
  { id: "wall-garden", category: "boundary", status: "generator", source: "code", seenAs: "close", count: 5600, generator: "boundary('wall-garden', length)", note: "Coursed brick boundary wall" },
  { id: "wall-retaining", category: "boundary", status: "built", source: "code", seenAs: "mid", count: 1200, note: "Concrete gravity retaining wall" },

  // --- 6. VEGETATION (4 Species x 3 Ages) ---
  { id: "tree-broadleaf", category: "vegetation", status: "generator", source: "code", seenAs: "mid", count: 14000, generator: "tree('broadleaf', age)", note: "Deciduous shade tree" },
  { id: "tree-conifer", category: "vegetation", status: "generator", source: "code", seenAs: "mid", count: 9000, generator: "tree('conifer', age)", note: "Pine and evergreen conifer" },
  { id: "tree-palm", category: "vegetation", status: "generator", source: "code", seenAs: "mid", count: 4200, generator: "tree('palm', age)", note: "Coastal date palm" },
  { id: "tree-cypress", category: "vegetation", status: "generator", source: "code", seenAs: "mid", count: 3600, generator: "tree('cypress', age)", note: "Columnar Mediterranean cypress" },
  { id: "bush-flowering", category: "vegetation", status: "built", source: "code", seenAs: "close", count: 5000, note: "Park shrubbery and flower beds" },

  // --- 7. PEOPLE (3 Builds x 3 Poses) ---
  { id: "person-adult", category: "people", status: "generator", source: "code", seenAs: "close", count: 4800, generator: "person('adult', pose, style)", note: "Pedestrian adult resident" },
  { id: "person-child", category: "people", status: "generator", source: "code", seenAs: "close", count: 1200, generator: "person('child', pose, style)", note: "Child / youth" },
  { id: "person-tall", category: "people", status: "generator", source: "code", seenAs: "close", count: 800, generator: "person('tall', pose, style)", note: "Tall adult" },

  // --- 8. VEHICLES (10 Classes) ---
  { id: "vehicle-car", category: "vehicles", status: "generator", source: "code", seenAs: "mid", count: 6200, generator: "vehicle('car', type)", note: "Sedan and SUV consumer automobiles" },
  { id: "vehicle-van", category: "vehicles", status: "generator", source: "code", seenAs: "mid", count: 1400, generator: "vehicle('van', type)", note: "Commercial delivery van" },
  { id: "vehicle-bus", category: "vehicles", status: "generator", source: "code", seenAs: "far", count: 450, generator: "vehicle('bus', type)", note: "Public transit municipal bus" },
  { id: "vehicle-truck", category: "vehicles", status: "generator", source: "code", seenAs: "far", count: 720, generator: "vehicle('truck', type)", note: "Box and flatbed heavy goods trucks" },
  { id: "vehicle-taxi", category: "vehicles", status: "generator", source: "code", seenAs: "mid", count: 680, generator: "vehicle('taxi', type)", note: "City taxi cab" },
  { id: "vehicle-emergency", category: "vehicles", status: "generator", source: "code", seenAs: "mid", count: 120, generator: "vehicle('emergency', type)", note: "Ambulance and fire rescue" },
  { id: "vehicle-bicycle", category: "vehicles", status: "generator", source: "code", seenAs: "close", count: 1800, generator: "vehicle('bicycle', type)", note: "Commuter bicycle" },
  { id: "vehicle-motorcycle", category: "vehicles", status: "generator", source: "code", seenAs: "close", count: 540, generator: "vehicle('motorcycle', type)", note: "Motorcycle and scooter" },

  // --- 9. MARITIME INFRASTRUCTURE & VESSELS ---
  { id: "vessel-rowboat", category: "maritime", status: "generator", source: "code", seenAs: "close", count: 80, generator: "vessel('rowboat')", note: "Small recreational dinghy" },
  { id: "vessel-sailboat", category: "maritime", status: "generator", source: "code", seenAs: "mid", count: 120, generator: "vessel('sailboat')", note: "Single-masted yacht with sails" },
  { id: "vessel-yacht", category: "maritime", status: "generator", source: "code", seenAs: "mid", count: 65, generator: "vessel('yacht')", note: "Cabin cruiser motor yacht" },
  { id: "vessel-ferry", category: "maritime", status: "generator", source: "code", seenAs: "far", count: 18, generator: "vessel('ferry')", note: "Double-ended passenger ferry" },
  { id: "vessel-container-ship", category: "maritime", status: "generator", source: "code", seenAs: "far", count: 8, generator: "vessel('container-ship')", note: "Cargo vessel with container stacks" },
  { id: "vessel-tug", category: "maritime", status: "generator", source: "code", seenAs: "mid", count: 14, generator: "vessel('tug')", note: "Harbour towing tugboat" },
  { id: "quay-wall", category: "maritime", status: "built", source: "code", seenAs: "mid", count: 850, note: "Hard stone harbour retaining quay" },
  { id: "jetty", category: "maritime", status: "built", source: "code", seenAs: "mid", count: 95, note: "Timber pile landing jetty" },
  { id: "mooring", category: "maritime", status: "built", source: "code", seenAs: "close", count: 420, note: "Harbour cast mooring bollard" },
  { id: "beacon", category: "maritime", status: "built", source: "code", seenAs: "far", count: 24, note: "Harbour navigational light beacon" },
  { id: "buoy-navigation", category: "maritime", status: "built", source: "code", seenAs: "mid", count: 40, note: "Channel marker floating buoy" },
  { id: "dry-dock", category: "maritime", status: "built", source: "code", seenAs: "far", count: 6, note: "Masonry graving dock basin with caisson gate" },

  // --- 10. AIRPORT SET & AVIATION ---
  { id: "runway-module", category: "airport", status: "built", source: "code", seenAs: "far", count: 64, note: "45m runway segment with centerline markings" },
  { id: "taxiway-module", category: "airport", status: "built", source: "code", seenAs: "far", count: 80, note: "23m taxiway segment with guidance line" },
  { id: "apron-stand", category: "airport", status: "built", source: "code", seenAs: "far", count: 28, note: "Aircraft parking stand with stop bars" },
  { id: "jet-bridge", category: "airport", status: "built", source: "code", seenAs: "mid", count: 24, note: "Articulated passenger boarding bridge" },
  { id: "blast-fence", category: "airport", status: "built", source: "code", seenAs: "mid", count: 45, note: "Jet blast deflector screen" },
  { id: "approach-lighting", category: "airport", status: "built", source: "code", seenAs: "far", count: 32, note: "Elevated ALS approach lighting stanchions" },
  { id: "windsock", category: "airport", status: "built", source: "code", seenAs: "close", count: 12, note: "Airfield windsock" },
  { id: "radar-tower", category: "airport", status: "built", source: "code", seenAs: "far", count: 4, note: "Rotating airport surveillance radar" },
  { id: "aircraft-light-single", category: "aviation", status: "generator", source: "code", seenAs: "mid", count: 40, generator: "aircraft('light-single')", note: "Single-engine Cessna propeller aircraft" },
  { id: "aircraft-airliner-twin", category: "aviation", status: "generator", source: "code", seenAs: "far", count: 25, generator: "aircraft('airliner-twin')", note: "Narrow-body twin-jet passenger airliner" },
  { id: "aircraft-regional-jet", category: "aviation", status: "generator", source: "code", seenAs: "far", count: 18, generator: "aircraft('regional-jet')", note: "Regional commuter airliner" },
  { id: "aircraft-helicopter", category: "aviation", status: "generator", source: "code", seenAs: "mid", count: 12, generator: "aircraft('helicopter')", note: "Civil transport helicopter" },

  // --- 11. ROADS & RAIL (Modular Kit) ---
  { id: "road-straight", category: "roads", status: "generator", source: "code", seenAs: "mid", count: 8400, generator: "straight(class, modules)", note: "Straight road modules (Freeway to Alley)" },
  { id: "road-curve", category: "roads", status: "generator", source: "code", seenAs: "mid", count: 3200, generator: "curve(class, radius, arc)", note: "Curved road segments" },
  { id: "road-junction", category: "roads", status: "generator", source: "code", seenAs: "mid", count: 2400, generator: "junction(branches)", note: "Multi-way street intersections" },
  { id: "road-roundabout", category: "roads", status: "generator", source: "code", seenAs: "mid", count: 180, generator: "roundabout(arms, radius)", note: "Civic traffic circular junctions" },
  { id: "road-ramp-merge", category: "roads", status: "generator", source: "code", seenAs: "mid", count: 140, generator: "rampMerge(class, side)", note: "Freeway slip road merges" },
  { id: "road-level-crossing", category: "roads", status: "generator", source: "code", seenAs: "close", count: 48, generator: "levelCrossing(class)", note: "Rail-road grade crossing" },
  { id: "road-turning-head", category: "roads", status: "generator", source: "code", seenAs: "close", count: 380, generator: "turningHead(class, type)", note: "Cul-de-sac turnaround bulb" },
  { id: "bridge-span", category: "roads", status: "generator", source: "code", seenAs: "far", count: 35, generator: "bridgeSpan(a, b, opts)", note: "Dynamic bridge engine (beam, arch, cablestay, causeway)" },
  { id: "rail-straight", category: "roads", status: "generator", source: "code", seenAs: "mid", count: 1800, generator: "railStraight(modules)", note: "Dual steel rail track with ties & ballast" },
  { id: "rail-platform", category: "roads", status: "generator", source: "code", seenAs: "close", count: 65, generator: "railPlatform(modules)", note: "Station passenger platform" },

  // --- 12. CIVIC BUILDINGS (12 Landmark Silhouette Typologies) ---
  { id: "civic-capitol", category: "civic", status: "built", source: "code", seenAs: "far", count: 4, note: "Town Hall / Capitol: portico, drum, dome and lantern" },
  { id: "civic-cathedral", category: "civic", status: "built", source: "code", seenAs: "far", count: 6, note: "Cathedral: Latin cross basilica, nave, transepts, twin western towers" },
  { id: "civic-station", category: "civic", status: "built", source: "code", seenAs: "far", count: 8, note: "Grand Terminus: headhouse, colossal barrel shed, campanile clock tower" },
  { id: "civic-library", category: "civic", status: "built", source: "code", seenAs: "far", count: 12, note: "National Library / Museum: peristyle colonnade, rotunda dome" },
  { id: "civic-opera", category: "civic", status: "built", source: "code", seenAs: "far", count: 4, note: "Opera House: tiered shell, glass foyer podium, rear stage fly tower" },
  { id: "civic-courthouse", category: "civic", status: "built", source: "code", seenAs: "far", count: 6, note: "Courthouse / Palace of Justice: rusticated base, hexastyle portico, pediment" },
  { id: "civic-hospital", category: "civic", status: "built", source: "code", seenAs: "far", count: 8, note: "General Hospital: emergency ramp, ward blocks, helipad pavilion" },
  { id: "civic-university", category: "civic", status: "built", source: "code", seenAs: "far", count: 6, note: "University Hall: quadrangles, cloister arches, collegiate gothic tower" },
  { id: "civic-theatre", category: "civic", status: "built", source: "code", seenAs: "mid", count: 10, note: "Civic Playhouse: marquee entrance, arched proscenium massing" },
  { id: "civic-art-gallery", category: "civic", status: "built", source: "code", seenAs: "far", count: 6, note: "Modern Art Pavilion: sculpted cantilevers, skylight roof sheds" },
  { id: "civic-market-hall", category: "civic", status: "built", source: "code", seenAs: "mid", count: 8, note: "Historic Market Hall: iron/brick arcades with raised clerestory" },
  { id: "civic-stadium", category: "civic", status: "built", source: "code", seenAs: "far", count: 2, note: "Municipal Stadium: tiered oval bowl with cantilevered canopy trusses" },

  // --- 13. ORDINARY BUILDINGS (10 Parameterised Typologies - Section 2) ---
  { id: "bld-villa", category: "buildings", status: "generator", source: "code", seenAs: "far", count: 9500, generator: "bldVilla(seed)", note: "Detached 1-2 storey villa: gabled/hipped/mansard roof, porch, garage, bay, dormers, chimney" },
  { id: "bld-terrace", category: "buildings", status: "generator", source: "code", seenAs: "far", count: 4600, generator: "bldTerrace(seed)", note: "Repeating 2-3 storey terrace row: party-wall chimney stacks, stoops, lightwells, string courses" },
  { id: "bld-townhouse", category: "buildings", status: "generator", source: "code", seenAs: "far", count: 2700, generator: "bldTownhouse(seed)", note: "Urban 3-4 storey townhouse: grand stoop, projecting bay, cornice, rooftop pergola, outrigger" },
  { id: "bld-midrise", category: "buildings", status: "generator", source: "code", seenAs: "far", count: 1600, generator: "bldMidrise(seed)", note: "Commercial/residential 4-8 storey midrise: retail podium, setback tower, balconies, lift overrun" },
  { id: "bld-tower", category: "buildings", status: "generator", source: "code", seenAs: "far", count: 80, generator: "bldTower(seed)", note: "Downtown 12-40 storey skyscraper: podium, stepped/tapered/slab/crown profiles, mechanical penthouse" },
  { id: "bld-shop", category: "buildings", status: "generator", source: "code", seenAs: "mid", count: 800, generator: "bldShop(seed)", note: "High street 1-3 storey shop: glazed shopfront, signage band, canvas awning, corner splay" },
  { id: "bld-office", category: "buildings", status: "generator", source: "code", seenAs: "far", count: 400, generator: "bldOffice(seed)", note: "Corporate 3-10 storey office: ribbon glazing spandrels, entrance canopy, service core, plant screen" },
  { id: "bld-warehouse", category: "buildings", status: "generator", source: "code", seenAs: "far", count: 250, generator: "bldWarehouse(seed)", note: "Industrial 1-storey logistics warehouse: sawtooth/barrel vault roof, 2-6 loading dock bays" },
  { id: "bld-workshop", category: "buildings", status: "generator", source: "code", seenAs: "mid", count: 350, generator: "bldWorkshop(seed)", note: "Light industrial 1-2 storey workshop: yard wall, industrial exhaust flue, roller door" },
  { id: "bld-apartment-walkup", category: "buildings", status: "generator", source: "code", seenAs: "far", count: 600, generator: "bldApartmentWalkup(seed)", note: "Multi-family 3-4 storey walkup: central/dual stair cores, exterior balconies, garden terraces" },


  // --- SECTION 3: CIRCULATION JOINTS & BRIDGE KIT ---
  { id: "road-intersection-4way", category: "roads", status: "generator", source: "code", seenAs: "mid", count: 3200, generator: "intersection4Way(classNS, classEW)", note: "4-way intersection across all 6 road classes with kerb returns, tactile pads & zebra markings" },
  { id: "road-intersection-3way", category: "roads", status: "generator", source: "code", seenAs: "mid", count: 4800, generator: "intersection3Way(classMain, classBranch, bearing)", note: "3-way T-junction with continuous main carriageway and flared kerb radii" },
  { id: "road-roundabout-modern", category: "roads", status: "generator", source: "code", seenAs: "mid", count: 240, generator: "roundaboutModern(lanes, roadClass, arms)", note: "1-lane & 2-lane circular junctions with truck apron and splitter islands" },
  { id: "road-ramp-diverge", category: "roads", status: "generator", source: "code", seenAs: "mid", count: 180, generator: "rampDiverge(freewayClass, side)", note: "Freeway off-ramp diverge taper with painted chevron gore island" },
  { id: "road-slip-lane", category: "roads", status: "generator", source: "code", seenAs: "mid", count: 320, generator: "slipLane(mainClass, crossClass)", note: "Channelized corner right-turn bypass with triangular refuge island" },
  { id: "road-turning-pocket", category: "roads", status: "generator", source: "code", seenAs: "mid", count: 650, generator: "turningPocket(roadClass, side)", note: "Median-recessed protected turning pocket" },
  { id: "road-median-break", category: "roads", status: "generator", source: "code", seenAs: "mid", count: 400, generator: "medianBreak(roadClass)", note: "Median crossover opening for U-turns and emergency access" },
  { id: "road-bus-bay", category: "roads", status: "generator", source: "code", seenAs: "close", count: 750, generator: "busBay(roadClass)", note: "Indented curbside bus pull-in bay with transit shelter footprint" },
  { id: "road-layby", category: "roads", status: "generator", source: "code", seenAs: "mid", count: 180, generator: "layby(roadClass)", note: "Highway emergency layby / rest stop shoulder widening" },
  { id: "road-crossing-signalised", category: "roads", status: "generator", source: "code", seenAs: "close", count: 1200, generator: "crossing('signalised', roadClass)", note: "Pedestrian signal mast crossing with push buttons and zebra ladder" },
  { id: "road-crossing-zebra", category: "roads", status: "generator", source: "code", seenAs: "close", count: 2800, generator: "crossing('zebra', roadClass)", note: "Zebra crossing with Belisha beacons and tactile paving ramps" },
  { id: "road-crossing-raised-table", category: "roads", status: "generator", source: "code", seenAs: "close", count: 950, generator: "crossing('raised-table', roadClass)", note: "Raised speed table plateau with ramped shark-teeth markings" },
  { id: "road-crossing-refuge", category: "roads", status: "generator", source: "code", seenAs: "close", count: 1400, generator: "crossing('refuge-island', roadClass)", note: "Two-stage crossing with central refuge sanctuary and bollards" },
  { id: "rail-switch", category: "roads", status: "generator", source: "code", seenAs: "mid", count: 140, generator: "railSwitch(side)", note: "Railway turnout points switch with motor mechanism box" },
  { id: "grade-separation-rail-over-road", category: "roads", status: "generator", source: "code", seenAs: "far", count: 85, generator: "gradeSeparation('rail-over-road', roadClass)", note: "Rail bridge spanning arterial road with 5.5m clearance" },
  { id: "grade-separation-road-over-rail", category: "roads", status: "generator", source: "code", seenAs: "far", count: 65, generator: "gradeSeparation('road-over-rail', roadClass)", note: "Road overpass spanning railway corridor with 5.5m clearance" },
  { id: "bridge-abutment", category: "roads", status: "generator", source: "code", seenAs: "mid", count: 70, generator: "bridgeAbutment(roadClass, elevation)", note: "Reinforced concrete bank abutment with wing walls and bearing seats" },
  { id: "bridge-pier", category: "roads", status: "generator", source: "code", seenAs: "far", count: 180, generator: "bridgePier(height, roadClass)", note: "Reinforced concrete pier column with crosshead cap" },
  { id: "bridge-deck-span", category: "roads", status: "generator", source: "code", seenAs: "far", count: 250, generator: "bridgeDeckSpan(length, roadClass)", note: "Modular girder deck span in standard lengths (16, 32, 48, 64m)" },
  { id: "bridge-approach-ramp", category: "roads", status: "generator", source: "code", seenAs: "far", count: 70, generator: "bridgeApproachRamp(elevation, roadClass)", note: "5% grade approach embankment ramp" },


  // --- SECTION 4: THE REST OF THE CITY ---
  { id: "person-action-cyclist", category: "people", status: "generator", source: "code", seenAs: "close", count: 850, generator: "personInAction('cyclist')", note: "Cyclist rider on road bike as unified module" },
  { id: "person-action-worker", category: "people", status: "generator", source: "code", seenAs: "close", count: 420, generator: "personInAction('worker')", note: "Construction municipal worker in hi-vis vest and hardhat" },
  { id: "person-action-pram", category: "people", status: "generator", source: "code", seenAs: "close", count: 320, generator: "personInAction('pram')", note: "Adult resident pushing pram / stroller" },
  { id: "person-action-jogger", category: "people", status: "generator", source: "code", seenAs: "close", count: 650, generator: "personInAction('jogger')", note: "Runner in stride" },
  { id: "vehicle-service-refuse", category: "vehicles", status: "generator", source: "code", seenAs: "mid", count: 180, generator: "vehicleService('refuse-truck')", note: "Heavy refuse compactor truck" },
  { id: "vehicle-service-sweeper", category: "vehicles", status: "generator", source: "code", seenAs: "close", count: 120, generator: "vehicleService('sweeper')", note: "Municipal street sweeper with disc brushes" },
  { id: "vehicle-service-tow", category: "vehicles", status: "generator", source: "code", seenAs: "mid", count: 85, generator: "vehicleService('tow-truck')", note: "Flatbed recovery tow truck with crane boom" },
  { id: "vehicle-service-tractor", category: "vehicles", status: "generator", source: "code", seenAs: "mid", count: 95, generator: "vehicleService('tractor')", note: "Utility tractor with front loader bucket" },
  { id: "tree-street-avenue-summer", category: "vegetation", status: "generator", source: "code", seenAs: "mid", count: 4200, generator: "streetTreeSeasonal('summer', 'avenue')", note: "Avenue tree in pit with metal guard cage (summer foliage)" },
  { id: "tree-street-avenue-winter", category: "vegetation", status: "generator", source: "code", seenAs: "mid", count: 1800, generator: "streetTreeSeasonal('winter', 'avenue')", note: "Avenue street tree with bare winter branches" },
  { id: "park-feature-bandstand", category: "parks", status: "generator", source: "code", seenAs: "mid", count: 18, generator: "parkFeature('bandstand')", note: "Victorian octagonal bandstand with iron pillars and zinc cupola" },
  { id: "park-feature-duck-pond", category: "parks", status: "generator", source: "code", seenAs: "mid", count: 24, generator: "parkFeature('duck-pond')", note: "Ornamental park duck pond with stone rim" },
  { id: "park-feature-sports-pitch", category: "parks", status: "generator", source: "code", seenAs: "far", count: 32, generator: "parkFeature('sports-pitch')", note: "Marked football/soccer pitch with goalposts" },
  { id: "park-feature-tennis-court", category: "parks", status: "generator", source: "code", seenAs: "mid", count: 45, generator: "parkFeature('tennis-court')", note: "Tennis court with perimeter chainlink fence and center net" },
  { id: "park-feature-gate", category: "parks", status: "generator", source: "code", seenAs: "close", count: 65, generator: "parkFeature('park-gate')", note: "Park entrance iron gates with stone piers" },
  { id: "waterfront-crane", category: "maritime", status: "generator", source: "code", seenAs: "far", count: 12, generator: "waterfrontModule('dockside-crane')", note: "Dockside portal crane with lattice jib" },
  { id: "waterfront-beach-huts", category: "maritime", status: "generator", source: "code", seenAs: "mid", count: 40, generator: "waterfrontModule('beach-huts')", note: "Row of 4 colourful timber beach huts" },
  { id: "waterfront-slipway", category: "maritime", status: "generator", source: "code", seenAs: "mid", count: 22, generator: "waterfrontModule('slipway')", note: "Concrete inclined boat slipway with winch house" },
  { id: "waterfront-lifeguard", category: "maritime", status: "generator", source: "code", seenAs: "close", count: 16, generator: "waterfrontModule('lifeguard-tower')", note: "Coastal lifeguard lookout station on timber stilts" },
  { id: "industrial-pylon", category: "industrial", status: "generator", source: "code", seenAs: "far", count: 120, generator: "industrialInfrastructure('pylon')", note: "High-voltage steel lattice transmission pylon with 3 crossarms" },
  { id: "industrial-silo", category: "industrial", status: "generator", source: "code", seenAs: "far", count: 85, generator: "industrialInfrastructure('silo')", note: "Grain/cement storage silo cylinder with conical roof" },
  { id: "industrial-tank-farm", category: "industrial", status: "generator", source: "code", seenAs: "far", count: 35, generator: "industrialInfrastructure('tank-farm')", note: "Petrochemical tank farm with 4 storage tanks and containment bund" },
  { id: "industrial-substation", category: "industrial", status: "generator", source: "code", seenAs: "mid", count: 45, generator: "industrialInfrastructure('substation')", note: "Electrical substation distribution transformer with insulator bushings" },
  { id: "industrial-pipe-rack", category: "industrial", status: "generator", source: "code", seenAs: "far", count: 160, generator: "industrialInfrastructure('pipe-rack')", note: "Industrial multi-pipe process rack trestle spanning 24m" },


  // --- SHOWSTOPPERS: HERO LANDMARKS & ICONIC MODELS ---
  { id: "bld-artdeco-spire", category: "buildings", tier: "showstopper", status: "generator", source: "code", seenAs: "far", count: 8, generator: "bldArtDecoSpire()", note: "Showstopper: 168m Art Deco skyscraper with stepped crown setbacks and gilded needle spire" },
  { id: "bld-grand-chateau", category: "buildings", tier: "showstopper", status: "generator", source: "code", seenAs: "far", count: 14, generator: "bldGrandChateau()", note: "Showstopper: 40x32m French Renaissance grand chateau palace with twin pavilions and copper dormers" },
  { id: "bld-cascading-terraces", category: "buildings", tier: "showstopper", status: "generator", source: "code", seenAs: "far", count: 22, generator: "bldCascadingTerraces()", note: "Showstopper: 32x48m cascading waterfront luxury residence with stepped cantilevered glass terraces" },
  { id: "civic-grand-cathedral", category: "civic", tier: "showstopper", status: "generator", source: "code", seenAs: "far", count: 2, generator: "civicGrandCathedral()", note: "Showstopper: 64x120m Gothic cathedral with 88m needle spire, twin west towers, and flying buttresses" },
  { id: "civic-grand-terminus", category: "civic", tier: "showstopper", status: "generator", source: "code", seenAs: "far", count: 3, generator: "civicGrandTerminus()", note: "Showstopper: 80x160m Beaux-Arts railway terminal with 42m arched glass barrel train-shed and clock tower" },
  { id: "vehicle-bullet-train", category: "vehicles", tier: "showstopper", status: "generator", source: "code", seenAs: "mid", count: 28, generator: "vehicleBulletTrain()", note: "Showstopper: 72m 3-car high-speed streamlined bullet train with aerodynamic needle nose and roof pantograph" },
  { id: "vessel-superyacht", category: "maritime", tier: "showstopper", status: "generator", source: "code", seenAs: "far", count: 12, generator: "vesselSuperyacht()", note: "Showstopper: 54m tri-deck ultra-luxury superyacht with bow helipad, swimming pool, and radar arch" },
  { id: "park-palm-house", category: "parks", tier: "showstopper", status: "generator", source: "code", seenAs: "far", count: 6, generator: "parkBotanicalPalmHouse()", note: "Showstopper: 32x64m Victorian crystal palace botanical glasshouse with 24m ribbed central dome" },
  { id: "park-observation-wheel", category: "parks", tier: "showstopper", status: "generator", source: "code", seenAs: "far", count: 4, generator: "parkObservationWheel()", note: "Showstopper: 68m giant observation ferris wheel with dual A-frame legs and perimeter capsule ring" },
  { id: "bridge-cable-stayed-pylon", category: "roads", tier: "showstopper", status: "generator", source: "code", seenAs: "far", count: 8, generator: "bridgeCableStayedTower()", note: "Showstopper: 96m soaring diamond A-frame cable-stayed bridge pylon tower with fan of 8 stay cables" },


  // --- PART TWO: PLOT BOUNDARY KIT & URBAN AMENITIES ---
  { id: "boundary-front-wall", category: "boundary", tier: "standard", status: "generator", source: "code", seenAs: "close", count: 8500, generator: "boundaryFrontWall(length)", note: "Low brick/stone front property wall with coping" },
  { id: "boundary-gate", category: "boundary", tier: "standard", status: "generator", source: "code", seenAs: "close", count: 8500, generator: "boundaryGate(width)", note: "Front garden pedestrian swinging gate" },
  { id: "boundary-driveway", category: "boundary", tier: "standard", status: "generator", source: "code", seenAs: "mid", count: 6200, generator: "boundaryDriveway(length)", note: "Block-paved vehicle access driveway apron" },
  { id: "boundary-path", category: "boundary", tier: "standard", status: "generator", source: "code", seenAs: "close", count: 8500, generator: "boundaryPath(length)", note: "Flagstone entrance path from gate to door" },
  { id: "boundary-bin-store", category: "boundary", tier: "standard", status: "built", source: "code", seenAs: "close", count: 7400, generator: "boundaryBinStore()", note: "Timber slatted wheelie bin enclosure" },
  { id: "boundary-side-return", category: "boundary", tier: "standard", status: "generator", source: "code", seenAs: "close", count: 4200, generator: "boundarySideReturn(width)", note: "Side alley passage gate and return wall" },
  { id: "parked-cars-kerbside", category: "vehicles", tier: "signature", status: "generator", source: "code", seenAs: "mid", count: 2400, generator: "parkedCarRow('kerbside', count)", note: "Single instanced module of 3 kerbside parked cars" },
  { id: "parked-cars-echelon", category: "vehicles", tier: "signature", status: "generator", source: "code", seenAs: "mid", count: 1200, generator: "parkedCarRow('echelon', count)", note: "Single instanced module of 4 echelon parking stalls" },
  { id: "parked-cars-bay", category: "vehicles", tier: "signature", status: "generator", source: "code", seenAs: "mid", count: 1800, generator: "parkedCarRow('bay', count)", note: "Single instanced module of 4 perpendicular parking bays" },
  { id: "garden-shed", category: "furniture", tier: "standard", status: "generator", source: "code", seenAs: "mid", count: 5600, generator: "gardenFeature('shed')", note: "Timber garden storage shed" },
  { id: "garden-greenhouse", category: "furniture", tier: "standard", status: "generator", source: "code", seenAs: "mid", count: 2800, generator: "gardenFeature('greenhouse')", note: "Glass greenhouse garden feature" },
  { id: "garden-trampoline", category: "furniture", tier: "standard", status: "generator", source: "code", seenAs: "mid", count: 3200, generator: "gardenFeature('trampoline')", note: "Backyard trampoline with safety net" },
  { id: "garden-washing-line", category: "furniture", tier: "standard", status: "generator", source: "code", seenAs: "close", count: 4800, generator: "gardenFeature('washing-line')", note: "Rotary washing line with arms" },
  { id: "garden-patio-set", category: "furniture", tier: "standard", status: "generator", source: "code", seenAs: "close", count: 5200, generator: "gardenFeature('patio-set')", note: "Patio table and 4 chairs dining set" },
  { id: "bld-highstreet-terrace", category: "buildings", tier: "signature", status: "generator", source: "code", seenAs: "far", count: 850, generator: "bldHighStreetTerrace(seed, options)", note: "High-street chaining terrace with ground retail and upper flats" },
  { id: "bld-business-park", category: "buildings", tier: "signature", status: "generator", source: "code", seenAs: "far", count: 320, generator: "bldBusinessParkBlock(seed, options)", note: "Business park commercial block with brise-soleil louvers" },

];

/**
 * Summary breakdown of registry items by status and category.
 */
export function registrySummary() {
  let built = 0;
  let planned = 0;
  let skipped = 0;
  let generator = 0;
  const byCategory = {};

  for (const entry of ASSET_REGISTRY) {
    if (entry.status === "built") built++;
    else if (entry.status === "generator") { generator++; built++; }
    else if (entry.status === "planned") planned++;
    else if (entry.status === "skipped") skipped++;

    if (!byCategory[entry.category]) {
      byCategory[entry.category] = { built: 0, planned: 0, skipped: 0, generator: 0, total: 0 };
    }
    const cat = byCategory[entry.category];
    cat.total++;
    if (entry.status === "built") cat.built++;
    else if (entry.status === "generator") { cat.generator++; cat.built++; }
    else if (entry.status === "planned") cat.planned++;
    else if (entry.status === "skipped") cat.skipped++;
  }

  return {
    totalItems: ASSET_REGISTRY.length,
    built,
    generators: generator,
    planned,
    skipped,
    byCategory,
  };
}

if (typeof process !== "undefined" && process.argv[1] && process.argv[1].replace(/\\/g, "/").includes("asset-registry.js")) {
  const summary = registrySummary();
  console.log("CALIPER ASSET REGISTRY SUMMARY:");
  console.log("  Total Registered: " + summary.totalItems);
  console.log("  Built / Generators: " + summary.built);
  console.log("  Planned (Gaps): " + summary.planned);
  console.log("  Skipped: " + summary.skipped);
  console.log("\nBy Category:");
  for (const [cat, data] of Object.entries(summary.byCategory)) {
    console.log("  - " + cat.padEnd(12) + ": " + data.built + " built (" + data.generator + " gen), " + data.planned + " planned");
  }
}
