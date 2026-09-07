// =============================================================================
// CALIPER — MODEL RETRIEVAL GOLDEN BENCHMARK (Phase R1.4)
//
// 50 hand-authored query-to-expected-model pairs written BEFORE tuning.
// Tests natural language intent resolution across buildings, vehicles, infrastructure.
//
// Metrics evaluated:
//   - Precision@1: Top-1 candidate matches expected targets
//   - Precision@5: At least 1 expected target in top-5
//   - Recall@10: Expected targets retrieved within top-10
// =============================================================================

export interface GoldenPair {
  query: string;
  expected: string[]; // List of acceptable target designs / asset IDs
  category?: string;
  description: string;
}

export const GOLDEN_SET: GoldenPair[] = [
  // 1. Mark's original prompt
  {
    query: "30 ft eco friendly tower",
    expected: ["vertical-forest", "solar-spire", "greenpod-office", "stepgarden-walkup"],
    description: "Mark's original failing prompt for an eco-friendly tower"
  },
  {
    query: "art deco skyscraper",
    expected: ["art-deco-skyscraper"],
    description: "1920s Art Deco architectural skyscraper"
  },
  {
    query: "small corner shop",
    expected: ["corner-bodega-flat", "artisan-workshop"],
    description: "Small ground-floor retail shop / bodega"
  },
  {
    query: "alpine mountain chalet",
    expected: ["alpine-chalet"],
    description: "Alpine chalet with sloped wooden roof"
  },
  {
    query: "penthouse with rooftop helipad",
    expected: ["cantilever-penthouse", "wave-tower"],
    description: "Luxury penthouse tower featuring a cantilever helipad"
  },
  {
    query: "data center server facility",
    expected: ["data-center-cube", "industrial-warehouse-hub"],
    description: "Industrial tech server data center"
  },
  {
    query: "shipping container modular home",
    expected: ["shipping-container-living"],
    description: "Prefabricated shipping container residential unit"
  },
  {
    query: "brutalist concrete civic complex",
    expected: ["brutalist-complex"],
    description: "Heavy ribbed concrete brutalist institutional complex"
  },
  {
    query: "twisted helical glass tower",
    expected: ["helix-terrace", "wave-tower"],
    description: "Parametric spiral twisted residential tower"
  },
  {
    query: "diamond diagrid steel skyscraper",
    expected: ["diagrid-tower"],
    description: "Diagrid lattice exoskeleton glass highrise"
  },
  {
    query: "biophilic green townhouse",
    expected: ["biophilic-townhouse", "modern-loft-row", "row-brownstone"],
    description: "Urban townhouse with green living facade"
  },
  {
    query: "biotech research laboratory",
    expected: ["biotech-laboratory", "greenpod-office"],
    description: "Commercial research and laboratory building"
  },
  {
    query: "origami folded cultural center",
    expected: ["origami-cultural-center", "crystalline-pavilion"],
    description: "Sculptural geometric origami museum/pavilion"
  },
  {
    query: "neoclassical estate mansion with portico",
    expected: ["neoclassic-mansion", "gothic-revival-manor"],
    description: "Grand classical columns and portico mansion"
  },
  {
    query: "geodesic dome eco residence",
    expected: ["geodetic-eco-home", "parametric-residence"],
    description: "Circular dome ecological home"
  },
  {
    query: "gothic revival manor house",
    expected: ["gothic-revival-manor", "neoclassic-mansion"],
    description: "Gothic finials and gabled stone manor"
  },
  {
    query: "micro apartment studio tower",
    expected: ["micro-apartment-tower", "modular-timber-flat"],
    description: "High-density micro studio residential highrise"
  },
  {
    query: "twin towers with connecting skybridge",
    expected: ["skybridge-complex", "waterfall-atrium"],
    description: "Dual tower complex linked by skybridge connectors"
  },
  {
    query: "hyperboloid corporate global headquarters",
    expected: ["hyperboloid-hq"],
    description: "Iconic curved hyperboloid corporate HQ skyscraper"
  },
  {
    query: "waterfront wave tower with atrium",
    expected: ["wave-tower", "waterfall-atrium"],
    description: "Undulating maritime waterfront highrise"
  },
  {
    query: "industrial logistics warehouse hub",
    expected: ["industrial-warehouse-hub", "data-center-cube"],
    description: "Large footprint distribution warehouse"
  },
  {
    query: "suburban craftsman bungalow home",
    expected: ["craftsman-bungalow", "suburban-split-level", "midcentury-ranch"],
    description: "Single-family suburban craftsman home"
  },
  {
    query: "midcentury modern ranch house",
    expected: ["midcentury-ranch", "suburban-split-level"],
    description: "Horizontal low-profile midcentury residential ranch"
  },
  {
    query: "step garden terraced walkup apartments",
    expected: ["stepgarden-walkup", "terraced-courtyard-block"],
    description: "Terraced residential walk-up with rooftop gardens"
  },
  {
    query: "modular timber flat",
    expected: ["modular-timber-flat", "micro-apartment-tower"],
    description: "Mass-timber modular residential block"
  },
  {
    query: "historic brownstone rowhouse",
    expected: ["row-brownstone", "modern-loft-row", "biophilic-townhouse"],
    description: "Classic urban brick/stone brownstone row"
  },
  {
    query: "kinetic responsive facade office tower",
    expected: ["kinetic-facade-tower", "greenpod-office"],
    description: "Tower featuring dynamic solar-shading kinetic facade"
  },
  {
    query: "shard glass crystal biotower",
    expected: ["shard-biotower", "crystalline-pavilion"],
    description: "Tapering crystalline glass spire biotower"
  },
  {
    query: "glass crystalline pavilion cultural hall",
    expected: ["crystalline-pavilion", "origami-cultural-center", "canopy-hub"],
    description: "Transparent faceted glass public pavilion"
  },
  {
    query: "cantilevered cube residential villa",
    expected: ["floating-cube-residence", "cantilever-penthouse"],
    description: "Modernist cantilevered geometric block home"
  },
  {
    query: "canopy hub civic transit shelter",
    expected: ["canopy-hub", "crystalline-pavilion", "fur-f1-bus-stop-shelter"],
    description: "Wide open canopy public hub"
  },
  {
    query: "fighter jet supersonic interceptor",
    category: "aviation",
    expected: ["av-f1-advanced-fighter-jet", "av-f2-advanced-fighter-jet", "av-f3-advanced-fighter-jet", "av-f4-advanced-fighter-jet", "av-f1-supersonic-passenger-jet"],
    description: "Military fighter jet aircraft"
  },
  {
    query: "passenger ferry maritime boat",
    category: "maritime",
    expected: ["mar-f1-passenger-ferry-single-deck", "mar-f1-open-deck-ferry", "mar-f1-roll-on-roll-off-ferry"],
    description: "Water transit passenger ferry vessel"
  },
  {
    query: "pedestrian footbridge crossing",
    category: "bridges",
    expected: ["brg-f1-pedestrian-flat-bridge", "brg-f1-pedestrian-spiral-ramp", "brg-f1-stepped-canal-footbridge", "brg-f1-suspension-footbridge"],
    description: "Walkway footbridge over water or roadway"
  },
  {
    query: "park bench public seating",
    category: "furniture",
    expected: ["fur-f1-curved-park-bench", "fur-f1-tree-surround-bench", "fur-f1-stone-amphitheater-seat"],
    description: "Street furniture park bench"
  },
  {
    query: "deciduous oak tree vegetation",
    category: "vegetation",
    expected: ["veg-f1-ancient-oak", "veg-f1-european-beech", "veg-f1-horse-chestnut"],
    description: "Mature shade tree landscaping asset"
  },
  {
    query: "electric city transit bus",
    category: "vehicles",
    expected: ["veh-f1-city-transit-bus", "veh-f1-electric-articulated-bus", "veh-f1-double-decker-tour-bus"],
    description: "Urban public transit bus vehicle"
  },
  {
    query: "modern ribbon villa",
    expected: ["ribbon-villa"],
    description: "Streamlined modern ribbon villa"
  },
  {
    query: "suburban split level house",
    expected: ["suburban-split-level", "midcentury-ranch", "craftsman-bungalow"],
    description: "Multi-level suburban family residence"
  },
  {
    query: "terraced courtyard apartment block",
    expected: ["terraced-courtyard-block", "stepgarden-walkup"],
    description: "Enclosed courtyard multi-family apartments"
  },
  {
    query: "artisan workshop craft studio",
    expected: ["artisan-workshop", "corner-bodega-flat"],
    description: "Small commercial workshop craft space"
  },
  {
    query: "parametric residence aerofoil",
    expected: ["parametric-residence"],
    description: "Aerodynamic parametric sculpted residence"
  },
  {
    query: "high-rise vertical forest with lush trees",
    expected: ["vertical-forest"],
    description: "Tower integrated with living trees and balconies"
  },
  {
    query: "solar spire renewable energy tower",
    expected: ["solar-spire"],
    description: "Solar panel covered skyscraper tower"
  },
  {
    query: "curved eco office with terraces",
    expected: ["greenpod-office", "vertical-forest"],
    description: "Commercial office with curved green terraces"
  },
  {
    query: "cargo container modular home",
    expected: ["shipping-container-living"],
    description: "Upcycled container modular dwelling"
  },
  {
    query: "modern luxury glass skyscraper",
    expected: ["art-deco-skyscraper", "diagrid-tower", "hyperboloid-hq", "shard-biotower", "cantilever-penthouse", "wave-tower"],
    description: "Contemporary glass skyscraper highrise"
  },
  {
    query: "compact micro apartment housing",
    expected: ["micro-apartment-tower", "modular-timber-flat"],
    description: "High-density studio apartment tower"
  },
  {
    query: "waterfront luxury hotel tower",
    expected: ["waterfall-atrium", "wave-tower", "cantilever-penthouse"],
    description: "Waterfront hospitality tower"
  },
  {
    query: "single family suburban home with yard",
    expected: ["craftsman-bungalow", "midcentury-ranch", "suburban-split-level"],
    description: "Low-rise single family home"
  }
];
