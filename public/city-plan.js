// =============================================================================
// CALIPER — CITY PLAN
//
// The world as DATA. Nothing here draws anything.
//
// Why this file exists
// --------------------
// The world used to be six thousand lines of hand-placed geometry: every road,
// kerb, seawall and building carried its own hardcoded coordinate. Nothing could
// reason about it, so every change was a hand edit, the numbers drifted apart by
// metres, and a visitor asking to "make that lot bigger" was impossible to serve.
//
// Here the city is a plan: terrain bands, a road network, blocks, and plots with
// real minimum and maximum sizes. The renderer draws whatever the plan says. The
// AI pipeline edits the plan, not the renderer. That is what makes "remove part
// of this road so the lot can take a tower" or "bridge across to a new suburb"
// tractable -- they are edits to a few numbers, verifiable before anything is
// drawn.
//
// Units are metres throughout. +z is south (seaward), -z is north (inland),
// +x is east. Ground datum y = 0.
// =============================================================================

import { fbm, hash01, clamp, smoother } from "./noise.js";
import { roadAllowedAt, buildAllowedAt, driveableRun, slopeAt, SLOPE, makeDemand } from "./land-use.js";

// -----------------------------------------------------------------------------
// 1. WORLD EXTENTS
//
// The old world was 2400 x 2400 with a built area of roughly 150 x 45m -- a
// tabletop model with an ocean painted around it. The downtown island alone is
// now larger than that entire previous world.
// -----------------------------------------------------------------------------
export const WORLD = {
  SIZE: 40000,         // 40 km square. The previous 9.6 km world was smaller
  HORIZON: 52000,      // than Biscayne Bay is WIDE (13 km) -- a square of a
};                     // world, not a world.

// =============================================================================
// LAND MASSES
//
// A coastal city is never one shape in an empty sea. Every reference we worked
// from is an INTERLOCK of land and water: Miami is a barrier island, a lagoon, a
// bay and a mainland; Vancouver is a peninsula, an inlet and a mountain wall;
// Hong Kong is an island, a harbour and a mainland; Malé is a single island
// built edge to edge. The world is now made of several land masses with real
// water between them.
//
// Real distances used to size the gaps:
//   Miami Beach barrier island   15 km long x 1-2 km wide
//   Biscayne Bay                 56 km long, up to 13 km wide
//   Venetian Causeway crossing   4.5 km
//   Victoria Harbour (Hong Kong) ~1.5 km across at its narrowest
//   Downtown Vancouver           3.7 km2
//
// Each mass is a set of control points, smoothed by the same Catmull-Rom used
// for the downtown island. Coordinates are metres; +z is south (seaward).
// =============================================================================
export const LANDMASSES = [
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
  {
    // 108.3 km2, traced from the drawn layout
    id: "barrier", name: "Ocean Barrier Island", kind: "beach-strip", baseHeight: 9,
    points: [
      [-6497, 1617], [-4916, 2278], [-3470, 3048], [-2267, 4288],
      [-1364, 5473], [240, 5086], [1794, 5718], [3480, 5552],
      [4699, 4365], [6004, 4088], [7692, 4308], [9212, 3534],
      [10734, 3064], [11871, 1906], [13451, 2263], [14977, 2675],
      [16261, 3804], [16484, 4934], [16627, 6533], [15651, 7306],
      [14021, 7804], [12307, 7750], [10564, 7531], [8934, 8056],
      [7165, 8030], [5503, 7590], [3789, 7509], [2020, 7565],
      [305, 7319], [-1142, 6355], [-2203, 6356], [-784, 7264],
      [-2419, 6714], [-4108, 6412], [-5655, 7103], [-7368, 7352],
      [-9110, 7326], [-10177, 5976], [-11866, 5730], [-13413, 6420],
      [-14641, 5815], [-13667, 4573], [-12419, 3745], [-10898, 3192],
      [-9291, 3522], [-7963, 2418],
    ],
  },
  {
    id: "downtown", name: "Downtown Island", kind: "city", baseHeight: 10,
    // outline supplied from COAST -- traced from the drawn layout, 15.0 km2
  },
  {
    // 7.3 km2, traced from the drawn layout
    id: "fairlight-isle", name: "Fairlight Island", kind: "island", baseHeight: 9,
    points: [
      [6367, 118], [6639, 228], [6912, 283], [7211, 338],
      [7484, 393], [7783, 420], [8083, 475], [8355, 530],
      [8654, 557], [8954, 529], [9225, 447], [9497, 364],
      [9769, 336], [10068, 363], [10287, 528], [10233, 721],
      [9934, 777], [9690, 915], [9473, 1136], [9420, 1411],
      [9231, 1577], [8931, 1632], [8687, 1770], [8471, 1991],
      [8226, 2102], [7927, 2129], [7627, 2074], [7355, 1992],
      [7056, 1992], [6784, 2075], [6512, 2213], [6268, 2296],
      [6050, 2269], [5859, 2048], [5613, 1856], [5341, 1828],
      [5041, 1801], [5176, 1580], [5311, 1360], [5283, 1056],
      [5118, 808], [5117, 505], [5252, 312], [5524, 229],
      [5823, 174], [6122, 146],
    ],
  },
  {
    // 4.8 km2, traced from the drawn layout
    id: "kingsley-isle", name: "Kingsley Island", kind: "island", baseHeight: 9,
    points: [
      [-5011, -672], [-4766, -645], [-4521, -645], [-4276, -618],
      [-4058, -563], [-3867, -453], [-3676, -342], [-3485, -205],
      [-3321, -67], [-3347, 181], [-3455, 374], [-3590, 567],
      [-3589, 788], [-3479, 981], [-3397, 1201], [-3368, 1449],
      [-3531, 1560], [-3722, 1450], [-3940, 1422], [-4158, 1312],
      [-4349, 1230], [-4567, 1147], [-4731, 1009], [-4814, 789],
      [-5005, 596], [-5169, 486], [-5414, 486], [-5631, 514],
      [-5876, 542], [-6094, 487], [-6285, 404], [-6530, 349],
      [-6721, 267], [-6939, 156], [-7130, 74], [-7212, -147],
      [-7268, -367], [-7050, -422], [-6833, -423], [-6588, -423],
      [-6370, -451], [-6153, -506], [-5908, -534], [-5691, -589],
      [-5473, -617], [-5228, -644],
    ],
  },
  {
    // 4.2 km2, traced from the drawn layout
    id: "cormorant-isle", name: "Cormorant Island", kind: "island", baseHeight: 9,
    points: [
      [-14534, -664], [-14344, -637], [-14126, -637], [-14098, -472],
      [-14097, -279], [-14124, -86], [-14150, 80], [-14149, 245],
      [-14148, 438], [-14066, 603], [-13929, 741], [-13765, 879],
      [-13629, 1017], [-13546, 1182], [-13518, 1347], [-13545, 1568],
      [-13598, 1733], [-13734, 1899], [-13842, 2037], [-13923, 2175],
      [-14058, 2313], [-14193, 2478], [-14356, 2533], [-14520, 2506],
      [-14684, 2396], [-14820, 2286], [-14903, 2093], [-14958, 1927],
      [-15040, 1735], [-15177, 1597], [-15314, 1487], [-15477, 1404],
      [-15587, 1266], [-15615, 1073], [-15561, 908], [-15480, 715],
      [-15400, 549], [-15346, 384], [-15320, 191], [-15348, -2],
      [-15403, -168], [-15349, -361], [-15241, -498], [-15078, -554],
      [-14888, -609], [-14698, -637],
    ],
  },
  {
    // 4.1 km2, traced from the drawn layout
    id: "westbay-isle", name: "Westbay Island", kind: "island", baseHeight: 8,
    points: [
      [-10812, -1743], [-10594, -1715], [-10376, -1716], [-10185, -1661],
      [-9994, -1523], [-9830, -1385], [-9694, -1247], [-9530, -1082],
      [-9366, -944], [-9202, -834], [-9011, -752], [-8820, -669],
      [-8629, -587], [-8466, -504], [-8356, -311], [-8246, -146],
      [-8110, 20], [-8081, 240], [-8080, 461], [-8079, 681],
      [-8215, 792], [-8433, 819], [-8623, 819], [-8841, 820],
      [-9032, 737], [-9114, 572], [-9278, 406], [-9469, 379],
      [-9686, 379], [-9849, 379], [-10067, 352], [-10258, 297],
      [-10340, 132], [-10396, -89], [-10424, -282], [-10534, -447],
      [-10507, -613], [-10617, -806], [-10781, -971], [-10945, -1081],
      [-11108, -1191], [-11299, -1274], [-11490, -1356], [-11327, -1494],
      [-11192, -1605], [-11002, -1687],
    ],
  },
  {
    // 3.1 km2, traced from the drawn layout
    id: "bayview-isle", name: "Bayview Island", kind: "island", baseHeight: 9,
    points: [
      [919, -1118], [1164, -1118], [1355, -1036], [1518, -926],
      [1682, -788], [1873, -705], [2064, -623], [2282, -595],
      [2500, -596], [2717, -651], [2935, -679], [3125, -706],
      [3342, -762], [3560, -790], [3778, -790], [3995, -762],
      [4105, -625], [4160, -432], [4161, -266], [4080, -101],
      [3890, 37], [3755, 175], [3592, 341], [3402, 286],
      [3211, 231], [3020, 148], [2802, 93], [2611, 38],
      [2394, 11], [2176, -16], [1958, -16], [1740, 11],
      [1523, 39], [1332, 12], [1141, -71], [978, -208],
      [814, -374], [650, -539], [486, -622], [268, -594],
      [78, -483], [23, -649], [186, -759], [376, -897],
      [539, -1008], [729, -1090],
    ],
  },
  {
    // 2.4 km2, traced from the drawn layout
    id: "heron-isle", name: "Heron Island", kind: "island", baseHeight: 8,
    points: [
      [-12138, -336], [-12029, -198], [-11974, -88], [-11973, 78],
      [-11891, 216], [-11891, 326], [-11781, 436], [-11672, 436],
      [-11617, 546], [-11562, 684], [-11480, 794], [-11398, 932],
      [-11370, 1097], [-11342, 1235], [-11314, 1401], [-11368, 1539],
      [-11476, 1676], [-11612, 1704], [-11748, 1815], [-11856, 1925],
      [-11883, 2063], [-11909, 2228], [-12045, 2173], [-12182, 2063],
      [-12291, 1980], [-12373, 1843], [-12456, 1705], [-12511, 1567],
      [-12511, 1429], [-12485, 1264], [-12431, 1126], [-12486, 988],
      [-12595, 878], [-12732, 740], [-12841, 630], [-12951, 547],
      [-13087, 465], [-13169, 327], [-13088, 189], [-13035, 51],
      [-12953, -32], [-12817, -4], [-12654, -32], [-12491, -87],
      [-12383, -170], [-12274, -280],
    ],
  },
  {
    // 1.3 km2, traced from the drawn layout
    id: "redcliff-isle", name: "Redcliff Island", kind: "island", baseHeight: 8,
    points: [
      [14558, 415], [14722, 414], [14858, 442], [14994, 497],
      [15104, 607], [15186, 690], [15295, 772], [15377, 910],
      [15459, 1020], [15514, 1131], [15596, 1241], [15678, 1379],
      [15734, 1516], [15816, 1599], [15952, 1627], [16061, 1654],
      [16170, 1764], [16279, 1847], [16388, 1902], [16498, 2012],
      [16498, 2150], [16499, 2288], [16472, 2426], [16391, 2508],
      [16255, 2536], [16146, 2453], [16091, 2343], [16009, 2233],
      [15900, 2123], [15790, 2040], [15681, 1958], [15572, 1875],
      [15463, 1792], [15353, 1682], [15298, 1572], [15216, 1462],
      [15107, 1352], [14998, 1269], [14888, 1159], [14779, 1076],
      [14643, 993], [14533, 911], [14424, 828], [14397, 718],
      [14369, 580], [14450, 442],
    ],
  },
  {
    // 0.6 km2, traced from the drawn layout
    id: "gull-isle", name: "Gull Island", kind: "island", baseHeight: 7,
    points: [
      [-1935, -454], [-1799, -454], [-1690, -454], [-1581, -427],
      [-1472, -427], [-1363, -400], [-1255, -400], [-1119, -400],
      [-1010, -372], [-928, -400], [-819, -400], [-710, -372],
      [-601, -373], [-492, -345], [-383, -318], [-274, -290],
      [-193, -235], [-219, -125], [-273, -14], [-327, 41],
      [-436, 68], [-545, 69], [-654, 69], [-763, 69],
      [-872, 41], [-954, -41], [-1035, -97], [-1117, -152],
      [-1227, -234], [-1308, -262], [-1444, -262], [-1553, -262],
      [-1662, -261], [-1771, -234], [-1880, -206], [-1988, -178],
      [-2070, -178], [-2206, -206], [-2288, -233], [-2370, -288],
      [-2479, -343], [-2479, -426], [-2370, -399], [-2261, -426],
      [-2153, -426], [-2017, -427],
    ],
  },
  {
    id: "mainland", name: "Mainland Coast", kind: "mainland", baseHeight: 14,
    // TRACED, like the islands. This shoreline is Mark's red line: an OPEN curve
    // isolated from the orange by green channel (red sits at G~27, orange at
    // G~85, nothing between), walked into a path and mapped to metres by the
    // same affine as the islands.
    //
    // It is a proper embayment -- two arms reaching ~7 km south, one either
    // side, so the archipelago lies INSIDE the coast rather than in front of
    // it. My hand-drawn version of this had the arms less than half as long,
    // which is why the mainland never matched the drawing.
    //
    // coastCount is the shoreline length; the two points after it are the far
    // north corners, deliberately NOT splined (a spline through 30 km corners
    // overshoots and swallows the world).
    coastCount: 52,
    points: [
      [-22142, 1602], [-21852, 2730], [-21822, 3999], [-21115, 4957],
      [-20506, 6001], [-19658, 6781], [-18564, 6832], [-17881, 5900],
      [-17483, 4806], [-16418, 4414], [-16255, 3279], [-16419, 2057],
      [-16542, 795], [-16571, -361], [-15878, -1353], [-14811, -1551],
      [-13756, -1494], [-12562, -1667], [-11460, -2253], [-10394, -2885],
      [-9398, -2314], [-8252, -2239], [-7136, -2423], [-6089, -1848],
      [-4985, -1925], [-3806, -1676], [-2670, -1346], [-1506, -1658],
      [-422, -2193], [772, -2326], [1945, -2101], [3077, -1581],
      [4248, -1313], [5434, -1065], [6660, -887], [7766, -473],
      [9019, -478], [10212, -697], [11396, -978], [12573, -1225],
      [13696, -1280], [14774, -1218], [15889, -773], [16936, -162],
      [17652, 840], [17901, 1993], [18071, 3245], [18645, 4350],
      [19257, 5311], [19944, 6228], [20805, 6969], [21921, 7429],
      [ 31500, -34500], [-31500, -34500],
    ],
  },

];

// =============================================================================
// BRIDGES
//
// Every crossing in the world. Each is a north-south line at a given x with an
// anchor on land at BOTH ends; the span over water is found from the terrain
// rather than hardcoded, so a bridge cannot drift off its own shoreline when a
// coast is reshaped -- which is exactly how eight gantry cranes ended up
// standing in open water.
//
// A bridge is also a ROAD: it is added to the road network, so the carriageway,
// the footways, the markings, the street lamps and the traffic all run across it
// and join the grid at each end. The previous causeways were free-standing decks
// that met no road at either end and served nothing.
//
//   type "cable"    cable-stayed, towers and stays -- the two harbour crossings
//   type "arch"     a single arched span, for the short bay-island links
//   type "causeway" a low pier-and-deck run, for the long shallow crossings
// =============================================================================
// =============================================================================
// THE CROSSINGS
//
// Derived, not authored: the shortest gap between each pair of land masses, a
// minimum spanning tree over those gaps so nothing is stranded, and a few
// redundant short crossings so the network is a grid rather than a chain.
// Anchors are walked inland until the ground is genuinely dry.
//
// The hand-written list this replaces had 19 of its 40 ends meeting no road,
// and one span with both ends on the same island. A crossing derived from the
// gap it crosses cannot be in the wrong place.
// =============================================================================
export const BRIDGES = [
  { id: "bayview-gull", axis: "ew", x: -373, a: 900, b: -765, type: "arch", class: "AVENUE" },
  { id: "bayview-mainland", x: 3970, a: -711, b: -1701, type: "cable", class: "AVENUE" },
  { id: "downtown-bayview", x: 1341, a: 761, b: -42, type: "causeway", class: "AVENUE" },
  { id: "westbay-mainland", x: -11384, a: -1410, b: -2361, type: "arch", class: "AVENUE" },
  { id: "cormorant-heron", axis: "ew", x: 707, a: -14082, b: -12674, type: "cable", class: "AVENUE" },
  { id: "barrier-redcliff", x: 15910, a: 3424, b: 2098, type: "causeway", class: "AVENUE" },
  { id: "cormorant-mainland", x: -14125, a: 652, b: -1552, type: "arch", class: "AVENUE" },
  { id: "fairlight-mainland", x: 7827, a: 518, b: -526, type: "cable", class: "AVENUE" },
  { id: "kingsley-gull", axis: "ew", x: -206, a: -3588, b: -2136, type: "causeway", class: "AVENUE" },
  { id: "barrier-downtown", x: 194, a: 5124, b: 3939, type: "arch", class: "AVENUE" },
  { id: "downtown-gull", x: -775, a: 899, b: 41, type: "cable", class: "AVENUE" },
  { id: "kingsley-westbay", axis: "ew", x: -125, a: -7133, b: -8276, type: "causeway", class: "AVENUE" },
  { id: "downtown-fairlight", axis: "ew", x: 1650, a: 3169, b: 5168, type: "arch", class: "AVENUE" },
  { id: "barrier-kingsley", x: -6121, a: 1726, b: 414, type: "cable", class: "AVENUE" },
  { id: "barrier-heron", x: -11680, a: 3429, b: 1710, type: "causeway", class: "AVENUE" },
  // Found by scanning for the narrowest strait between the outer island's north
  // shore and the chain's south shore; the spanning tree could not anchor these.
  { id: "downtown-barrier", x: 200, a: 3925, b: 5125, type: "causeway", class: "BOULEVARD" },
  { id: "fairlight-barrier", x: 6200, a: 2275, b: 4150, type: "cable", class: "BOULEVARD" },
  // THE EAST INLET CAUSEWAY.
  //
  // A 2.35 km inlet cuts the eastern mainland off from the rest of the coast.
  // The path router correctly refused to build a ROAD across it -- a road that
  // is 60% water is not a road -- and going around means a long detour the
  // search would not take. So it gets what a real city would build there: a
  // causeway. Measured at the narrowest point of the inlet, anchors walked
  // inland to proper ground.
  { id: "east-inlet", axis: "ew", x: -1200, a: 12100, b: 15060, type: "causeway", class: "BOULEVARD" },
  // REDCLIFF'S SECOND CROSSING.
  //
  // Redcliff hung off a single link to the outer island, so anything that broke
  // that one link took the whole village off the network. Every island in a
  // real archipelago that matters has more than one way on. Measured: 1,475 m
  // to the mainland's eastern arm at z 2050, the narrowest strait between them.
  { id: "redcliff-mainland-e", axis: "ew", x: 2050, a: 16425, b: 18050, type: "cable", class: "AVENUE" },
];

// Kept as an alias so nothing that imported the old name breaks.
export const CAUSEWAYS = BRIDGES;

// -----------------------------------------------------------------------------
// 2. TERRAIN BANDS — south (seaward) to north (inland)
//
// One source of truth for where land, water and city are. Every piece of
// geometry derives its position from these; nothing carries its own z.
// -----------------------------------------------------------------------------
export const BANDS = {
  OPEN_OCEAN_Z:      4800,   // deep water to the horizon
  OUTER_BAY_Z:       3400,   // outer bay, shipping, sailing
  HARBOUR_Z_MIN:   -2100,    // mainland shore / bay north edge
  MAINLAND_Z:      -2100,    // mainland shore, suburbs, then mountains
  MOUNTAIN_Z:     -14000,    // alpine range
  MAINLAND_X_HALF:  4800,    // mainland/coast width before open water
};

// =============================================================================
// COASTLINE
//
// The island was a rectangle, which is the single thing that made the whole
// masterplan read as a diagram rather than a place. Real waterfront cities are
// shaped by their water, so the coast is designed here as explicit control
// points and smoothed with a Catmull-Rom spline: designable point by point,
// still pure data, still testable.
//
// Proportions checked against real places rather than invented:
//   Melbourne Hoddle Grid  1.61 x 0.80 km, 201m blocks, 30m streets
//   Downtown Vancouver     3.7 km2 peninsula, water both sides, mountains behind
//   Key Biscayne           8 km long x 1.6-3.2 km wide barrier island
//   Biscayne Bay           56 km long, up to 13 km wide -- the WATER dominates
//
// The old island was 1.6 x 1.0 km (1.59 km2), roughly Melbourne's CBD but only
// 43% of downtown Vancouver, and it sat in an ocean that did nothing. It is now
// 2.8 x 1.6 km with a real harbour bite, a headland, a marina inlet and a long
// ocean beach -- and the bay around it is scaled like Biscayne Bay.
//
// Points run clockwise starting at the south-west. +z is seaward (south).
// =============================================================================
export const COAST = [
  // Downtown island, traced from the drawn layout. ISLAND, the district
  // fractions and the whole block grid derive from this, so the city plan
  // follows the drawing automatically rather than being re-fitted by hand.
  [737, 646], [1172, 674], [1581, 784], [1664, 1087],
  [1937, 1417], [2346, 1555], [2754, 1472], [3079, 1196],
  [3433, 1113], [3814, 1278], [4088, 1526], [3706, 1416],
  [3326, 1582], [3001, 1858], [3057, 2216], [3438, 2354],
  [3846, 2298], [3929, 2656], [4039, 2877], [3632, 3015],
  [3306, 3263], [2981, 3567], [2711, 3870], [2330, 3953],
  [1922, 4009], [1487, 4009], [1106, 4037], [698, 4010],
  [289, 3983], [-119, 3955], [-555, 3901], [-909, 3736],
  [-1237, 3433], [-1538, 3102], [-1648, 2716], [-1705, 2303],
  [-1951, 1944], [-2252, 1614], [-2172, 1255], [-1956, 897],
  [-1548, 841], [-1113, 868], [-786, 841], [-378, 951],
  [31, 1033], [411, 867],
];

/**
 * The island's own bounding box, DERIVED from the coastline.
 *
 * These used to be five hardcoded numbers in BANDS, and every district, the
 * street-grid origin and the waterfront boulevard were written against them by
 * hand. Changing the island by a metre meant changing all of them by hand and
 * finding out later which one had been missed. Now the island can be any shape
 * and everything that depends on its size follows.
 */
function coastBounds() {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [x, z] of COAST) {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (z < z0) z0 = z; if (z > z1) z1 = z;
  }
  return { xMin: x0, xMax: x1, zMin: z0, zMax: z1, width: x1 - x0, depth: z1 - z0 };
}

export const ISLAND = coastBounds();

/**
 * The marina basin: sheltered water inside the drowned inlet on the east side,
 * behind a breakwater that narrows its mouth. Declared here so the renderer, the
 * boat placement and any future edit all agree where it is.
 */
export const MARINA = {
  x: 2020, z: 200,             // centre of the basin, in the east-shore inlet
  r: 220,                      // usable radius
  mouth: { x: 2300, z: 330 },  // where it opens to the sea
  breakwater: [
    [2680, 810], [2520, 620], [2400, 430],       // the arm that shelters it
  ],
};

/**
 * THE HARBOUR. The working basin cut into the north shore: quays, cranes, the
 * ferry terminal. Declared so the renderer, the dredging and the plan all agree.
 */
export const HARBOUR = { x: 820, z: -430, r: 560 };

/**
 * THE PLEASURE PIER and THE BOARDWALK.
 *
 * A metro beach city has both, and they do different jobs. The pier walks you
 * out OVER the water -- it is the thing you see from three kilometres away and
 * the reason the ocean frontage has a middle. The boardwalk runs ALONG the
 * back of the beach, parallel to the surf, and is what makes the beachfront a
 * place rather than a strip of sand behind hotels.
 *
 * Both sit on the barrier island's ocean side at its deepest point, which is
 * where the crescent bows furthest out and where Ocean City's towers stand
 * behind them. Coordinates are taken from the island's measured envelope --
 * the ocean shore runs near z 4250 at x 500 -- rather than picked by eye,
 * because picking barrier coordinates by eye is precisely how the island's
 * downtown ended up declared in the lagoon.
 */
export const PIER = {
  x: 500,             // the middle of the crescent's bow
  from: 4180,         // starts just behind the surf line, on the sand
  to: 4760,           // and walks 580 m out over the water
  width: 26,
  // the pavilion at the seaward end -- the thing the pier is FOR
  head: { z: 4700, w: 78, d: 96 },
  pilings: { spacing: 22, radius: 1.5 },
};

export const BOARDWALK = {
  // Follows the ocean shore rather than cutting a straight line across it. Each
  // point is on the barrier's seaward edge, set back onto dry sand.
  width: 22,
  points: [
    [-4200, 3320], [-3400, 3600], [-2500, 3830], [-1500, 3960],
    [-500, 4030], [500, 4055], [1500, 4005], [2500, 3930],
    [3500, 3755], [4300, 3520],
  ],
};

/** Catmull-Rom through ANY closed set of control points. */
export function splinePolygon(p, samplesPerSegment = 10) {
  const n = p.length;
  const out = [];
  const at = (i) => p[((i % n) + n) % n];
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  return out;
}

/** Twice the signed area. Negative here means the same winding as COAST. */
export function signedArea2(poly) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  }
  return a;
}

/**
 * Catmull-Rom through an OPEN run of points -- the ends are held, not wrapped.
 * Used for the mainland's shoreline, which is a curve with two ends rather than
 * a closed loop; the closing corners thirty kilometres north are appended raw.
 */
export function splineOpen(p, samplesPerSegment = 10) {
  const out = [];
  const at = (i) => p[Math.max(0, Math.min(p.length - 1, i))];
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(p[p.length - 1].slice());
  return out;
}

/** Every land mass as a smoothed polygon, ready to draw or to test against. */
export function landmassPolygons(samplesPerSegment = 10) {
  return LANDMASSES.map((lm) => {
    // The mainland's SHORELINE is splined; its closing corners are not. A spline
    // through 30 km corners overshoots by hundreds of metres and swallowed the
    // island, but leaving the shoreline unsplined gave a coast made of straight
    // facets. `coastCount` is the split.
    let polygon;
    if (lm.kind === "mainland") {
      const n = lm.coastCount || lm.points.length;
      polygon = [...splineOpen(lm.points.slice(0, n), samplesPerSegment), ...lm.points.slice(n).map((q) => q.slice())];
    } else {
      polygon = splinePolygon(lm.id === "downtown" ? COAST : lm.points, samplesPerSegment);
    }
    // NORMALISE WINDING. The masses were authored by hand at different times and
    // wound both ways -- the barrier island ran opposite to the downtown island.
    // offsetPolygon derives its outward normal from the winding, so on half the
    // world the surf ribbon was offset INWARD, across the beach. Everything
    // downstream may now assume one direction.
    if (signedArea2(polygon) > 0) polygon.reverse();
    return { ...lm, polygon };
  });
}

/** Catmull-Rom through the control points -- a smooth, closed, natural coast. */
export function coastlinePolygon(samplesPerSegment = 10) {
  const p = COAST;
  const n = p.length;
  const out = [];
  const at = (i) => p[((i % n) + n) % n];
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  return out;
}

const _coastCache = coastlinePolygon(12);

/** Is (x, z) on land? Standard ray-crossing test against the smoothed coast. */
export function isOnLand(x, z, poly = _coastCache) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Offset a closed polygon outward (or inward, with a negative distance) by a
 * TRUE uniform distance, along each vertex's angle bisector.
 *
 * The renderer previously drew the beach and the shallows by SCALING the
 * coastline, which offsets from the origin, not from the edge: measured on the
 * real coast that gave a beach 26 m wide amidships and 82 m at the ends, a 3.1:1
 * error. This is 1.0:1 by construction.
 */
export function offsetPolygon(poly, d) {
  const n = poly.length, out = [];
  for (let i = 0; i < n; i++) {
    const p = poly[(i - 1 + n) % n], c = poly[i], q = poly[(i + 1) % n];
    // outward unit normals of the two adjacent edges (clockwise winding)
    let n1x = c[1] - p[1], n1z = -(c[0] - p[0]);
    let n2x = q[1] - c[1], n2z = -(q[0] - c[0]);
    const l1 = Math.hypot(n1x, n1z) || 1, l2 = Math.hypot(n2x, n2z) || 1;
    n1x /= l1; n1z /= l1; n2x /= l2; n2z /= l2;
    let bx = n1x + n2x, bz = n1z + n2z;
    const bl = Math.hypot(bx, bz);
    if (bl < 1e-9) { out.push([c[0] + n1x * d, c[1] + n1z * d]); continue; }
    bx /= bl; bz /= bl;
    // scale along the bisector so the perpendicular distance to each edge is d
    const cosHalf = Math.max(0.25, bx * n1x + bz * n1z);
    out.push([c[0] + bx * (d / cosHalf), c[1] + bz * (d / cosHalf)]);
  }
  return out;
}

/** Shortest distance from (x, z) to the coast. Negative offshore. */
export function distanceToCoast(x, z, poly = _coastCache) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    const dx = xj - xi, dz = zj - zi;
    const len2 = dx * dx + dz * dz || 1;
    let t = ((x - xi) * dx + (z - zi) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = xi + t * dx, pz = zi + t * dz;
    const d = Math.hypot(x - px, z - pz);
    if (d < best) best = d;
  }
  return isOnLand(x, z, poly) ? best : -best;
}

/**
 * Every corner of a rectangle must be inland of the shoreline margin. Takes the
 * polygon so each settlement clips to ITS OWN land mass, not the downtown island.
 */
export function rectIsBuildable(xMin, xMax, zMin, zMax, margin = 0, poly = _coastCache) {
  return (
    distanceToCoast(xMin, zMin, poly) > margin &&
    distanceToCoast(xMax, zMin, poly) > margin &&
    distanceToCoast(xMin, zMax, poly) > margin &&
    distanceToCoast(xMax, zMax, poly) > margin
  );
}

// -----------------------------------------------------------------------------
// 3. ROAD HIERARCHY
//
// Right-of-way widths are the full corridor: carriageway + parking + kerbs +
// footways. Blocks are what is left between them, so changing a width here
// re-sizes every block and plot that touches it -- which is exactly the edit
// "narrow this street to grow the lot" needs to be.
// -----------------------------------------------------------------------------
export const ROADS = {
  // A limited-access road, wider than anything else and with no parking and no
  // footway -- you do not walk on it, which is what makes it read as a freeway
  // from the air rather than as a very wide street.
  FREEWAY:   { row: 62, lanes: 6, tram: false, parking: false, footway: 0   },
  RAMP:      { row: 14, lanes: 1, tram: false, parking: false, footway: 0   },
  BOULEVARD: { row: 44, lanes: 4, tram: true,  parking: true,  footway: 6.0 },
  AVENUE:    { row: 28, lanes: 2, tram: false, parking: true,  footway: 4.0 },
  STREET:    { row: 18, lanes: 2, tram: false, parking: false, footway: 3.0 },
  LANE:      { row: 10, lanes: 1, tram: false, parking: false, footway: 1.5 },
  ALLEY:     {  row: 6, lanes: 1, tram: false, parking: false, footway: 0   },
};

// -----------------------------------------------------------------------------
// 4. BLOCK GRID
//
// Spacing is centre-to-centre of the rights-of-way. A block's buildable
// interior is the spacing minus half a ROW on each side.
// -----------------------------------------------------------------------------
export const SHORE_MARGIN = 26;   // metres of foreshore kept clear of buildings

export const GRID = {
  AVENUE_SPACING: 230,   // 200m block + 30m street, Melbourne Hoddle Grid calibration
  STREET_SPACING: 170,   // east-west roads
  // derived, so the grid always starts at the island's own corner
  get ORIGIN_X() { return ISLAND.xMin; },
  get ORIGIN_Z() { return ISLAND.zMin; },
};

// -----------------------------------------------------------------------------
// 5. PLOT SIZE CLASSES
//
// Real minimums and maximums, so a block can carry a heritage terrace of narrow
// lots or a single tower podium, and the pipeline has a legal range to work
// inside when a visitor asks to merge or split.
// -----------------------------------------------------------------------------
export const PLOT_CLASSES = {
  TERRACE:   { minW: 8,   maxW: 16,  minD: 22, maxD: 34,  maxHeight:  18 },
  TOWNHOUSE: { minW: 14,  maxW: 26,  minD: 26, maxD: 40,  maxHeight:  24 },
  MIDRISE:   { minW: 26,  maxW: 52,  minD: 32, maxD: 60,  maxHeight:  55 },
  TOWER:     { minW: 45,  maxW: 90,  minD: 45, maxD: 90,  maxHeight: 220 },
  CIVIC:     { minW: 60,  maxW: 180, minD: 50, maxD: 110, maxHeight:  70 },
  PARK:      { minW: 40,  maxW: 200, minD: 40, maxD: 130, maxHeight:   0 },
  // --- beyond the downtown island ---
  RESORT:    { minW: 34,  maxW: 78,  minD: 34, maxD: 70,  maxHeight:  70 },  // beach hotels
  VILLA:     { minW: 18,  maxW: 34,  minD: 22, maxD: 40,  maxHeight:  14 },  // low coastal housing
  WAREHOUSE: { minW: 55,  maxW: 150, minD: 40, maxD: 95,  maxHeight:  22 },  // port sheds
  FARM:      { minW: 160, maxW: 460, minD: 120, maxD: 340, maxHeight:  11 }, // fields + barns
  HANGAR:    { minW: 90,  maxW: 220, minD: 70, maxD: 150, maxHeight:  26 },  // airport
};

export const PLOT_RULES = {
  MIN_ANY_W: 8,      // nothing narrower than a heritage shopfront
  MIN_ANY_D: 22,
  SETBACK_FRONT: 3,  // from the right-of-way
  SETBACK_SIDE: 0,   // party walls allowed -- this is a city, not a subdivision
  SETBACK_REAR: 4,   // service / light well
  MAX_MERGE: 6,      // most adjacent plots that may be merged into one lot
};

// -----------------------------------------------------------------------------
// 6. DISTRICTS
//
// Each names a rectangle of the island and the plot classes allowed inside it.
// A district is the unit a visitor talks about: "put a park in the civic
// quarter", "add towers along the waterfront".
// -----------------------------------------------------------------------------
// `primary` is the class a block in this district is subdivided into by default.
// It is declared, never inferred -- inferring "the largest allowed class" gave a
// Heritage Quarter made of mid-rise blocks and an island where the narrowest lot
// was 43m, i.e. no fine grain anywhere.
/**
 * Districts are declared as FRACTIONS of the island's bounding box, not as
 * absolute rectangles.
 *
 * They used to be nine hardcoded rectangles written against a 2.9 x 1.3 km
 * island. Every time the coast moved, each one had to be re-derived by hand, and
 * twice a gap opened between two of them that generated no blocks at all -- the
 * island had a bite out of it and nothing said so. Fractions cover [0,1] by
 * construction, so the partition is complete whatever shape the island is.
 *
 * `primary` is the class a block here is subdivided into by default. It is
 * declared, never inferred: inferring "the largest allowed class" gave a
 * Heritage Quarter made of mid-rise and an island whose narrowest lot was 43 m.
 */
const DISTRICT_SPEC = [
  // --- the north shore and the working harbour ---
  { id: "port", bias: -0.06,       name: "Harbour & Port",       f: [0.00, 0.30, 0.00, 0.24], primary: "MIDRISE",
    allow: ["MIDRISE", "CIVIC", "PARK"], character: "ferry terminal, boatyards, working harbour edge" },
  { id: "harbourside", bias: 0.1, name: "Harbourside",         f: [0.30, 0.70, 0.00, 0.24], primary: "MIDRISE",
    allow: ["MIDRISE", "TOWER", "CIVIC"], character: "quays, warehouses converted to lofts, fish market" },
  { id: "north-quarter", bias: -0.07, name: "North Quarter",     f: [0.70, 1.00, 0.00, 0.24], primary: "TOWNHOUSE",
    allow: ["TOWNHOUSE", "TERRACE", "MIDRISE", "PARK"], character: "quiet streets above the harbour" },
  // --- the civic belt ---
  { id: "heritage-n", bias: -0.03, name: "Old Town",             f: [0.00, 0.18, 0.24, 0.44], primary: "TERRACE",
    allow: ["TERRACE", "TOWNHOUSE"], character: "the oldest streets, narrow lots, arcaded shopfronts" },
  { id: "parkland", bias: 0.0,   name: "City Park",            f: [0.18, 0.30, 0.24, 0.44], primary: "PARK",
    allow: ["PARK"], character: "the big park: lawns, water, avenues of trees" },
  { id: "civic", bias: 0.02,      name: "Civic Quarter",        f: [0.30, 0.70, 0.24, 0.44], primary: "CIVIC",
    allow: ["CIVIC", "PARK", "MIDRISE"], character: "city hall, hospital, museum, civic square" },
  { id: "residential", bias: -0.08, name: "Residential Borough", f: [0.70, 1.00, 0.24, 0.44], primary: "TOWNHOUSE",
    allow: ["TOWNHOUSE", "TERRACE", "MIDRISE", "PARK"], character: "terraced housing, courtyard blocks" },
  // --- the core ---
  { id: "heritage", bias: -0.02,   name: "Heritage Quarter",     f: [0.00, 0.17, 0.44, 0.78], primary: "TERRACE",
    allow: ["TERRACE", "TOWNHOUSE", "MIDRISE"], character: "1880s-1920s brick and sandstone" },
  { id: "westside", bias: 0.04,   name: "Westside",             f: [0.17, 0.30, 0.44, 0.78], primary: "MIDRISE",
    allow: ["MIDRISE", "TOWNHOUSE", "PARK"], character: "mid-rise between the old town and the core" },
  { id: "downtown", bias: 0.22,   name: "Downtown Core",        f: [0.30, 0.70, 0.44, 0.78], primary: "TOWER",
    allow: ["TOWER", "MIDRISE", "CIVIC"], character: "curtain-wall towers, podium retail, sky gardens" },
  { id: "eastside", bias: 0.06,   name: "Eastside Mixed",       f: [0.70, 1.00, 0.44, 0.78], primary: "MIDRISE",
    allow: ["MIDRISE", "TOWNHOUSE", "TERRACE", "PARK"], character: "courtyard housing over ground-floor retail" },
  // --- toward the sea ---
  { id: "midtown", bias: 0.08,    name: "Midtown",              f: [0.00, 1.00, 0.78, 0.90], primary: "MIDRISE",
    allow: ["MIDRISE", "TOWER", "CIVIC", "PARK"], character: "mid-rise between the core and the beach" },
  { id: "waterfront", bias: 0.14, name: "Waterfront & Promenade", f: [0.00, 1.00, 0.90, 1.00], primary: "MIDRISE",
    allow: ["MIDRISE", "TOWER", "PARK", "CIVIC"], character: "hotels, dining pavilions, condos, public realm" },
];

export const DISTRICTS = DISTRICT_SPEC.map((d) => ({
  ...d,
  bounds: {
    xMin: ISLAND.xMin + d.f[0] * ISLAND.width,
    xMax: ISLAND.xMin + d.f[1] * ISLAND.width,
    zMin: ISLAND.zMin + d.f[2] * ISLAND.depth,
    zMax: ISLAND.zMin + d.f[3] * ISLAND.depth,
  },
}));

// Suburbs sit on the mainland across the inner harbour, reachable by bridge.
// They exist so the world continues past the island and so "bridge across to a
// new suburb" is a real, buildable request.
export const SUBURBS = [
  { id: "north-shore", name: "North Shore",  bounds: { xMin: -900, xMax: -200, zMin: -1500, zMax: -900 }, density: "low"  },
  { id: "hillside",    name: "Hillside Terraces", bounds: { xMin: -200, xMax: 600, zMin: -1700, zMax: -1000 }, density: "low" },
  { id: "east-point",  name: "East Point",   bounds: { xMin:  900, xMax: 1700, zMin: -1200, zMax: -500 }, density: "mid"  },
];

// (The real crossings are BRIDGES, declared with the land masses above. This is
// where a second, older, unused declaration of the same name used to sit.)

// =============================================================================
// GENERATOR — turns the plan above into concrete roads, blocks and plots.
//
// Pure: same input, same output, no randomness, no THREE, no DOM. That makes it
// testable in Node and verifiable before a single triangle is drawn.
// =============================================================================

// =============================================================================
// LAND VALUE — how the city actually fills in
//
// A district used to be a rectangle, and every block inside it was cut into the
// same plot class. That is why the city read as blocks of uniform stuff with
// hard seams between them: a wall of towers stopping dead against a field of
// identical houses, along a line no real city has.
//
// Real cities are a CONTINUOUS FIELD. Land value peaks at the centre and at a
// few sub-centres, is bid up along the arterials and the waterfront, and falls
// off with distance -- and the transition is never clean, because at any given
// value some owners build tall and some do not. So density is sampled from a
// field and then JITTERED per block, which mixes the classes at every boundary:
// towers with mid-rise between them, mid-rise thinning into terraces, terraces
// giving way to houses, and the odd tall thing out on its own where somebody
// paid too much for a site.
//
// Districts still exist -- they name the place, set its character and forbid
// what does not belong -- but they no longer dictate the class of every block.
// =============================================================================

/** Where the city is most valuable. Ellipses in island-fraction coordinates. */
export const CENTRES = [
  { fx: 0.50, fz: 0.60, rx: 0.26, rz: 0.20, peak: 1.00 },   // the CBD
  { fx: 0.78, fz: 0.52, rx: 0.16, rz: 0.16, peak: 0.72 },   // eastside cluster
  { fx: 0.22, fz: 0.34, rx: 0.14, rz: 0.14, peak: 0.62 },   // old-town cluster
  { fx: 0.44, fz: 0.16, rx: 0.15, rz: 0.11, peak: 0.58 },   // harbourside
  { fx: 0.62, fz: 0.90, rx: 0.20, rz: 0.09, peak: 0.66 },   // the beachfront strip
];

/**
 * 0..1 land value at a point on the island. Pure and deterministic.
 */
export function intensityAt(x, z) {
  const fx = (x - ISLAND.xMin) / ISLAND.width;
  const fz = (z - ISLAND.zMin) / ISLAND.depth;

  let v = 0;
  for (const c of CENTRES) {
    const d = Math.hypot((fx - c.fx) / c.rx, (fz - c.fz) / c.rz);
    if (d >= 1) continue;
    const t = smoother(1 - d);
    v = Math.max(v, c.peak * t);
  }

  // the waterfront premium: a band of high value along the south shore, which
  // is why every coastal city has a wall of towers on its beach road
  const shore = smoother(clamp((fz - 0.80) / 0.14, 0, 1)) * 0.42;
  v = Math.max(v, shore * (0.55 + 0.45 * smoother(clamp(1 - Math.abs(fx - 0.5) / 0.55, 0, 1))));

  // grain: nobody builds to exactly the value of their land
  v *= 0.80 + 0.40 * fbm(x, z, 620, 3);
  v += (fbm(x + 5000, z - 3000, 1900, 2) - 0.5) * 0.16;
  return clamp(v, 0, 1);
}

/**
 * Density ladder, sparsest first, with the land value at which each takes over.
 *
 * Equal bins put TOWER at v >= 0.8, which almost nothing reached: the whole
 * island came out with thirty towers in it. Land value is not linear in built
 * form -- the step from a house to a terrace is a small one and the step from
 * mid-rise to a tower is a large one, so the thresholds are not evenly spaced.
 */
export const DENSITY_LADDER = ["VILLA", "TOWNHOUSE", "TERRACE", "MIDRISE", "TOWER"];
const DENSITY_AT = [0.00, 0.11, 0.26, 0.45, 0.63];

function classForValue(v) {
  let out = DENSITY_LADDER[0];
  for (let i = 0; i < DENSITY_AT.length; i++) if (v >= DENSITY_AT[i]) out = DENSITY_LADDER[i];
  return out;
}

/**
 * The class for one block: the field, plus a per-block jitter, snapped to what
 * the district allows. The jitter is what mixes classes at a boundary instead
 * of drawing a line through the city.
 */
export function classForBlock(block, district) {
  const cx = (block.xMin + block.xMax) / 2, cz = (block.zMin + block.zMax) / 2;
  const r = hash01(`cls|${block.id}`);

  // parks and civic buildings are placed FIRST, because a city that is only
  // ever as dense as its land value has no lungs and no institutions
  if (district && district.primary === "PARK") return "PARK";
  if (district && (district.allow || []).includes("PARK") && r > 0.93) return "PARK";
  if (district && (district.allow || []).includes("CIVIC") && r > 0.86 && r <= 0.93) return "CIVIC";

  let v = intensityAt(cx, cz) + (hash01(`jit|${block.id}`) - 0.5) * 0.30;
  if (district && typeof district.bias === "number") v += district.bias;
  v = clamp(v, 0, 0.999);

  const want = classForValue(v);
  const allow = (district && district.allow) || DENSITY_LADDER;
  if (allow.includes(want)) return want;
  // walk outward along the ladder to the nearest class this district permits
  const i = DENSITY_LADDER.indexOf(want);
  for (let k = 1; k < DENSITY_LADDER.length; k++) {
    const lo = DENSITY_LADDER[i - k], hi = DENSITY_LADDER[i + k];
    if (hi && allow.includes(hi)) return hi;
    if (lo && allow.includes(lo)) return lo;
  }
  return (district && district.primary) || "TOWNHOUSE";
}

function districtAt(x, z) {
  for (const d of DISTRICTS) {
    const b = d.bounds;
    if (x >= b.xMin && x < b.xMax && z >= b.zMin && z < b.zMax) return d;
  }
  return null;
}

/** Road centrelines across the island, with their class. */
export function generateRoads() {
  const roads = [];
  // The waterfront boulevard runs along the island's south edge.
  roads.push({
    id: "boulevard-waterfront", axis: "ew", class: "BOULEVARD",
    at: ISLAND.zMax - ROADS.BOULEVARD.row / 2,
    from: ISLAND.xMin, to: ISLAND.xMax,
  });
  // North-south avenues.
  for (let x = GRID.ORIGIN_X; x <= ISLAND.xMax; x += GRID.AVENUE_SPACING) {
    roads.push({ id: `avenue-x${x}`, axis: "ns", class: "AVENUE", at: x, from: ISLAND.zMin, to: ISLAND.zMax });
  }
  // East-west streets, stopping short of the boulevard.
  const lastStreetZ = ISLAND.zMax - ROADS.BOULEVARD.row;
  for (let z = GRID.ORIGIN_Z; z < lastStreetZ; z += GRID.STREET_SPACING) {
    roads.push({ id: `street-z${z}`, axis: "ew", class: "STREET", at: z, from: ISLAND.xMin, to: ISLAND.xMax });
  }
  return roads;
}

/** Buildable blocks: the land between the rights-of-way. */
export function generateBlocks() {
  const blocks = [];
  const avHalf = ROADS.AVENUE.row / 2;
  const stHalf = ROADS.STREET.row / 2;
  const lastStreetZ = ISLAND.zMax - ROADS.BOULEVARD.row;

  for (let x = GRID.ORIGIN_X; x < ISLAND.xMax; x += GRID.AVENUE_SPACING) {
    for (let z = GRID.ORIGIN_Z; z < lastStreetZ; z += GRID.STREET_SPACING) {
      const xMin = x + avHalf;
      const xMax = x + GRID.AVENUE_SPACING - avHalf;
      const zMin = z + stHalf;
      // The last row runs up to the boulevard rather than to another street.
      const nextZ = z + GRID.STREET_SPACING;
      const zMax = (nextZ >= lastStreetZ ? lastStreetZ : nextZ) - stHalf;
      if (xMax - xMin < PLOT_RULES.MIN_ANY_W || zMax - zMin < PLOT_RULES.MIN_ANY_D) continue;
      // The island is a coastline, not a rectangle: a block only exists if the
      // whole of it is inland of the shore, with a margin for the sea wall and
      // the foreshore walk.
      if (!rectIsBuildable(xMin, xMax, zMin, zMax, SHORE_MARGIN)) continue;

      const cx = (xMin + xMax) / 2, cz = (zMin + zMax) / 2;
      const d = districtAt(cx, cz);
      if (!d) continue;
      blocks.push({
        id: `block-${x}-${z}`, districtId: d.id,
        xMin, xMax, zMin, zMax,
        width: xMax - xMin, depth: zMax - zMin,
      });
    }
  }
  return blocks;
}

/**
 * Subdivide a block into plots of a given class, front-to-street.
 * Widths are distributed evenly within the class's legal range.
 */
export function subdivideBlock(block, className) {
  const cls = PLOT_CLASSES[className];
  if (!cls) throw new Error(`unknown plot class: ${className}`);
  const usableD = Math.min(block.depth, cls.maxD);
  if (usableD < cls.minD) return [];

  // Choose a count that keeps every plot inside [minW, maxW].
  const maxCount = Math.floor(block.width / cls.minW);
  const minCount = Math.ceil(block.width / cls.maxW);
  if (maxCount < 1 || minCount > maxCount) return [];
  const count = Math.max(1, Math.min(maxCount, Math.max(minCount, Math.round(block.width / ((cls.minW + cls.maxW) / 2)))));
  const w = block.width / count;
  if (w < cls.minW - 1e-9 || w > cls.maxW + 1e-9) return [];

  // TWO ROWS, back to back, when the block is deep enough to carry them.
  //
  // A single row fronting zMin left the rest of the block empty: a 152 m deep
  // block carrying 60 m of mid-rise had 90 m of dead ground behind it, which
  // from street level read as a city of buildings standing in a field. Real
  // blocks are built from both streets and meet along a rear boundary, and that
  // is also where the service lane goes.
  const rows = [{ front: block.zMin, dir: 1 }];
  if (block.depth >= 2 * cls.minD + 8) {
    const rowD = Math.min(cls.maxD, (block.depth - 6) / 2);
    if (rowD >= cls.minD) {
      rows.length = 0;
      rows.push({ front: block.zMin, dir: 1, depth: rowD });
      rows.push({ front: block.zMax - rowD, dir: -1, depth: rowD });
    }
  }

  const plots = [];
  rows.forEach((row, r) => {
    const dep = row.depth || usableD;
    for (let i = 0; i < count; i++) {
      const xMin = block.xMin + i * w;
      const zMin = row.front;
      plots.push({
        id: `${block.id}-p${i}${r ? "b" : ""}`, blockId: block.id, districtId: block.districtId,
        className,
        xMin, xMax: xMin + w,
        zMin, zMax: zMin + dep,
        width: w, depth: dep,
        maxHeight: cls.maxHeight,
        // The front setback is taken from whichever street the row faces.
        buildable: {
          xMin: xMin + PLOT_RULES.SETBACK_SIDE,
          xMax: xMin + w - PLOT_RULES.SETBACK_SIDE,
          zMin: zMin + (row.dir === 1 ? PLOT_RULES.SETBACK_FRONT : PLOT_RULES.SETBACK_REAR),
          zMax: zMin + dep - (row.dir === 1 ? PLOT_RULES.SETBACK_REAR : PLOT_RULES.SETBACK_FRONT),
        },
        occupant: null,   // set when a building is placed
      });
    }
  });
  return plots;
}

/** The class a district declares for itself. */
function defaultClassFor(districtId) {
  const d = DISTRICTS.find((x) => x.id === districtId);
  return (d && d.primary) || "MIDRISE";
}

// =============================================================================
// THE REST OF THE WORLD
//
// One engine, driven by data, for every settlement outside the downtown island:
// the resort strip on the barrier island, the mainland's towns and suburbs, the
// working port, the airport, the farm belt, and the island villages. Each is a
// rectangle of land, a road spacing, and a plot class -- so a new town is six
// lines of data, not a new code path.
// =============================================================================
export const SETTLEMENTS = [
  // Island settlements are DERIVED from each island's own polygon.
  { id:"fairlight-isle-core", name:"Fairlight", landmass:"fairlight-isle",
    bounds:{xMin:5988,xMax:9340,zMin:554,zMax:1860}, av:185, st:146, cls:"TOWER",
    core:0.66, edge:0.42 },
  { id:"fairlight-isle-shore", name:"Fairlight Shore", landmass:"fairlight-isle",
    bounds:{xMin:5150,xMax:10178,zMin:227,zMax:2187}, av:148, st:117, cls:"TOWNHOUSE",
    exclude:{xMin:5988,xMax:9340,zMin:554,zMax:1860} },
  { id:"kingsley-isle-core", name:"Kingsley", landmass:"kingsley-isle",
    bounds:{xMin:-6536,xMax:-4054,zMin:-225,zMax:1113}, av:185, st:146, cls:"MIDRISE",
    core:0.66, edge:0.42 },
  { id:"kingsley-isle-shore", name:"Kingsley Shore", landmass:"kingsley-isle",
    bounds:{xMin:-7156,xMax:-3433,zMin:-560,zMax:1448}, av:148, st:117, cls:"TOWNHOUSE",
    exclude:{xMin:-6536,xMax:-4054,zMin:-225,zMax:1113} },
  { id:"cormorant-isle-core", name:"Cormorant", landmass:"cormorant-isle",
    bounds:{xMin:-15196,xMax:-13938,zMin:-61,zMax:1929}, av:185, st:146, cls:"MIDRISE",
    core:0.66, edge:0.42 },
  { id:"cormorant-isle-shore", name:"Cormorant Shore", landmass:"cormorant-isle",
    bounds:{xMin:-15510,xMax:-13623,zMin:-559,zMax:2428}, av:148, st:117, cls:"TOWNHOUSE",
    exclude:{xMin:-15196,xMax:-13938,zMin:-61,zMax:1929} },
  { id:"westbay-isle-core", name:"Westbay", landmass:"westbay-isle",
    bounds:{xMin:-10836,xMax:-8734,zMin:-1231,zMax:307}, av:185, st:146, cls:"MIDRISE",
    core:0.66, edge:0.42 },
  { id:"westbay-isle-shore", name:"Westbay Shore", landmass:"westbay-isle",
    bounds:{xMin:-11362,xMax:-8207,zMin:-1615,zMax:692}, av:148, st:117, cls:"TOWNHOUSE",
    exclude:{xMin:-10836,xMax:-8734,zMin:-1231,zMax:307} },
  { id:"bayview-isle-vlg", name:"Bayview", landmass:"bayview-isle",
    bounds:{xMin:96,xMax:4088,zMin:-1045,zMax:268}, av:135, st:106, cls:"VILLA",
    core:0.55, edge:0.35 },
  { id:"heron-isle-vlg", name:"Heron", landmass:"heron-isle",
    bounds:{xMin:-13076,xMax:-11407,zMin:-243,zMax:2135}, av:135, st:106, cls:"VILLA",
    core:0.55, edge:0.35 },
  { id:"redcliff-isle-vlg", name:"Redcliff", landmass:"redcliff-isle",
    bounds:{xMin:14475,xMax:16393,zMin:520,zMax:2430}, av:135, st:106, cls:"VILLA",
    core:0.55, edge:0.35 },
  { id:"gull-isle-vlg", name:"Gull", landmass:"gull-isle",
    bounds:{xMin:-2453,xMax:-219,zMin:-428,zMax:43}, av:135, st:106, cls:"VILLA",
    core:0.55, edge:0.35 },

  // --- MAINLAND, DERIVED FROM THE TRACED SHORE ---
  //
  // These were the last hand-written rectangles in the world, still typed
  // against a coastline that had since moved ~2 km south -- which is why five
  // bridges arrived at nothing and the network was in pieces. Each band is now
  // laid inland of the shore it belongs to, and its character comes from where
  // it sits: farmland at the ends, villas, townhouses, mid-rise shoulders, and
  // a tower core where the bay is deepest.
  { id:"coastal-0", name:"West Farms", landmass:"mainland",
    bounds:{xMin:-18000,xMax:-15400,zMin:-4506,zMax:-486}, av:420, st:330, cls:"FARM",
    core:0.4, edge:0.18 },
  { id:"coastal-1", name:"West Farms", landmass:"mainland",
    bounds:{xMin:-15400,xMax:-12800,zMin:-5722,zMax:-1702}, av:420, st:330, cls:"FARM",
    core:0.4, edge:0.18 },
  { id:"coastal-2", name:"Fernwood", landmass:"mainland",
    bounds:{xMin:-12800,xMax:-10200,zMin:-6468,zMax:-2448}, av:150, st:118, cls:"VILLA",
    core:0.48, edge:0.24 },
  { id:"coastal-3", name:"Marchmont", landmass:"mainland",
    bounds:{xMin:-10200,xMax:-7600,zMin:-6476,zMax:-2456}, av:165, st:130, cls:"TOWNHOUSE",
    core:0.55, edge:0.32 },
  { id:"coastal-4", name:"Marchmont", landmass:"mainland",
    bounds:{xMin:-7600,xMax:-5000,zMin:-6335,zMax:-2315}, av:165, st:130, cls:"TOWNHOUSE",
    core:0.55, edge:0.32 },
  { id:"coastal-5", name:"Westgate", landmass:"mainland",
    bounds:{xMin:-5000,xMax:-2400,zMin:-5849,zMax:-1829}, av:195, st:152, cls:"MIDRISE",
    core:0.62, edge:0.42 },
  { id:"coastal-6", name:"Harbour City", landmass:"mainland",
    bounds:{xMin:-2400,xMax:200,zMin:-6125,zMax:-2105}, av:210, st:165, cls:"TOWER",
    core:0.7, edge:0.5 },
  { id:"coastal-7", name:"Harbour City", landmass:"mainland",
    bounds:{xMin:200,xMax:2800,zMin:-6413,zMax:-2393}, av:210, st:165, cls:"TOWER",
    core:0.7, edge:0.5 },
  { id:"coastal-8", name:"Stonebridge", landmass:"mainland",
    bounds:{xMin:5400,xMax:8000,zMin:-1608,zMax:-988}, av:165, st:130, cls:"TOWNHOUSE",
    core:0.55, edge:0.32 },
  { id:"coastal-9", name:"Ridgeway", landmass:"mainland",
    bounds:{xMin:10600,xMax:13200,zMin:-5301,zMax:-1281}, av:150, st:118, cls:"VILLA",
    core:0.48, edge:0.24 },
  { id:"coastal-10", name:"East Farms", landmass:"mainland",
    bounds:{xMin:13200,xMax:15800,zMin:-5449,zMax:-1429}, av:420, st:330, cls:"FARM",
    core:0.4, edge:0.18 },
  { id:"coastal-11", name:"East Farms", landmass:"mainland",
    bounds:{xMin:15800,xMax:18400,zMin:-4232,zMax:-212}, av:420, st:330, cls:"FARM",
    core:0.4, edge:0.18 },

  // --- kept: placed against real features, not the coastline ---
  { id:"port",          name:"Working Port", landmass:"mainland",
    bounds:{xMin:-7000,xMax:-3400,zMin:-3300,zMax:-2100}, av:300, st:220, cls:"WAREHOUSE",
    core:0.9, edge:0.85 },
  { id:"airport",       name:"International Airport", landmass:"mainland",
    bounds:{xMin:9800,xMax:14400,zMin:-5600,zMax:-3300}, av:460, st:340, cls:"HANGAR",
    core:0.9, edge:0.85 },
];

/** Highways and arterials tying the whole world together. */
// =============================================================================
// THE FREEWAY NETWORK
//
// Drawn to the alignment Mark marked on the map: one east-west spine running
// the length of the chain, north-south connectors dropping from the mainland
// onto the islands, and links out to the west and east ends.
//
// A freeway is not just a wide road. What makes it legible is that you cannot
// get on it wherever you like: it meets the ordinary network only at
// interchanges, and each interchange is a pair of ramps. Without those it reads
// as a runway laid across the city, which is exactly what the previous
// "highways" looked like -- AVENUE-class lines with every cross street running
// straight into them.
//
// `beach-spine` used to be declared at a single z for 16 km across a crescent
// island, so nearly two thirds of it was in the lagoon and it rendered as four
// disconnected stubs with two 4.5 km holes. It is now three segments that each
// sit on land.
// =============================================================================
export const FREEWAYS = [
  // the east-west spine, in segments that follow the land
  { id:"spine-w",   axis:"ew", at:-2620,  from:-17600, to:-12300, ramps:[-16400,-14200,-13000] },
  { id:"spine-c",   axis:"ew", at:-2620,  from:-11400, to:  6200, ramps:[-9200,-6800,-3600,-2100,0,2100,4600] },
  { id:"spine-e",   axis:"ew", at:-2620,  from:  7000, to: 17200, ramps:[8600,11000,13400,15800] },
  // north-south connectors, dropping from the mainland onto the chain
  { id:"conn-w",    axis:"ns", at:-6800,  from:-5200,  to:-2300,  ramps:[-4600,-3400] },
  { id:"conn-cw",   axis:"ns", at:-2100,  from:-5000,  to:-2200,  ramps:[-4400,-3200] },
  { id:"conn-c",    axis:"ns", at:  0,    from:-5000,  to:-2260,  ramps:[-4400,-3200] },
  { id:"conn-ce",   axis:"ns", at: 2100,  from:-5000,  to:-2300,  ramps:[-4400,-3200] },
  { id:"conn-e",    axis:"ns", at: 4600,  from:-5200,  to:-2300,  ramps:[-4600,-3400] },
  // the inland bypass, north of the coast road
  { id:"bypass",    axis:"ew", at:-5200,  from:-14000, to: 14000, ramps:[-10200,-6800,-2100,0,2100,5600,12000] },
];

/**
 * Build the on and off ramps for every freeway.
 *
 * Each interchange is a pair of short parallel slip roads either side of the
 * carriageway, offset far enough to read as separate pavement. They are what
 * turn a wide line into a road with entrances.
 */
export function generateRamps() {
  const out = [];
  const OFF = 46;        // lateral offset of the slip road from the centreline
  const LEN = 210;       // how far the slip road runs alongside
  for (const f of FREEWAYS) {
    for (const at of f.ramps || []) {
      if (at < Math.min(f.from, f.to) + 120 || at > Math.max(f.from, f.to) - 120) continue;
      for (const side of [-1, 1]) {
        // the slip road, parallel to the freeway
        out.push({ id:`ramp-${f.id}-${at}-${side > 0 ? "n" : "s"}`, axis:f.axis, class:"RAMP",
                   at:f.at + side * OFF, from:at - LEN / 2, to:at + LEN / 2,
                   settlement:"freeway", ramp:true, rampFor:f.id });
        // The connector across to the surface street it feeds.
        //
        // This was 86 m long -- shorter than clipRoadToLand's 110 m minimum run
        // -- so EVERY link in the world was silently deleted as too short, and
        // the slip roads were left attached to nothing. 26 freeway and ramp
        // segments crossed no other road at all: a motorway with no way on or
        // off it. It now reaches far enough to actually meet the local grid,
        // which is both the fix and the point of a ramp.
        out.push({ id:`ramp-${f.id}-${at}-${side > 0 ? "n" : "s"}-link`, axis:f.axis === "ew" ? "ns" : "ew", class:"RAMP",
                   at:at + LEN / 2, from:Math.min(f.at - side * 40, f.at + side * REACH), to:Math.max(f.at - side * 40, f.at + side * REACH),
                   settlement:"freeway", ramp:true, rampFor:f.id });
      }
    }
  }
  return out;
}

export const HIGHWAYS = [
  { id:"coast-hwy",  axis:"ew", at:-2620,  from:-18000, to: 18000, class:"BOULEVARD" },
  { id:"inland-hwy", axis:"ew", at:-5200,  from:-16000, to: 16000, class:"AVENUE"    },
  { id:"west-spur",  axis:"ns", at:-10200, from:-8000,  to:-2300,  class:"AVENUE"    },
  { id:"north-spur", axis:"ns", at: 5600,  from:-7800,  to:-2300,  class:"AVENUE"    },
  { id:"port-spur",  axis:"ns", at:-5200,  from:-5600,  to:-2200,  class:"AVENUE"    },
  { id:"airport-rd", axis:"ns", at: 12000, from:-5800,  to:-2500,  class:"AVENUE"    },
  // THE WEST AND EAST LINKS.
  //
  // Without these the whole western corridor -- the coast highway, the west
  // freeway spine, the Cormorant bridge and the key itself -- was a 28-road
  // island: a long east-west corridor with nothing running north to meet the
  // inland highway or the farm grid. You could drive the length of it and never
  // join the city. Every arterial has to hand its traffic to something.
  { id:"west-link",  axis:"ns", at:-14060, from:-5300,  to:-2560,  class:"BOULEVARD" },
  { id:"east-link",  axis:"ns", at: 14200, from:-5300,  to:-2560,  class:"AVENUE"    },
  // Three segments that each sit on the crescent, replacing one straight line
  // that spent two thirds of its length in the lagoon.
  { id:"beach-spine-w", axis:"ew", at: 1750, from:-7600, to:-4200, class:"BOULEVARD" },
  { id:"beach-spine-c", axis:"ew", at: 3450, from:-3400, to: 2600, class:"BOULEVARD" },
  { id:"beach-spine-e", axis:"ew", at: 2100, from: 4200, to: 7600, class:"BOULEVARD" },
];

/**
 * How likely a block at (x, z) is to be built at all.
 *
 * Settlements used to fill their bounding rectangle edge to edge at 100%
 * density, so from altitude the region read as a zoning map: hard-edged
 * rectangles of housing dropped on green. Real towns are dense in the middle and
 * thin out into countryside, and their edges are ragged. This is the whole
 * difference between a diagram and a place at regional scale.
 */
function settlementDensity(s, x, z) {
  const b = s.bounds;
  const cx = (b.xMin + b.xMax) / 2, cz = (b.zMin + b.zMax) / 2;
  const hx = Math.max(1, (b.xMax - b.xMin) / 2), hz = Math.max(1, (b.zMax - b.zMin) / 2);
  // elliptical distance from the centre, 0 at the middle, 1 at the boundary
  const t = Math.hypot((x - cx) / hx, (z - cz) / hz);
  // The old defaults (core 0.58, edge 0.42) left 42% of blocks built right up
  // to the boundary, so every mainland settlement read from altitude as a solid
  // RECTANGLE of housing dropped on green -- the single most artificial thing
  // in the wide views, and visible in every contact sheet. A real town's edge is
  // sparse and ragged long before it stops.
  const core = s.core === undefined ? 0.40 : s.core;   // fully built out to here
  const edge = s.edge === undefined ? 0.06 : s.edge;   // density at the boundary
  if (t <= core) return 1;
  const k = Math.min(1, (t - core) / (1 - core));
  // ragged, not a clean gradient: a little low-frequency noise on the boundary
  // Two scales of raggedness rather than one, so the edge frays in clumps the
  // size of a few blocks AND in patches the size of a neighbourhood.
  const wobble = 0.62 + hash01(`${s.id}|${Math.round(x / 300)}|${Math.round(z / 300)}`) * 0.55
                      + hash01(`${s.id}|f|${Math.round(x / 90)}|${Math.round(z / 90)}`) * 0.30;
  return Math.max(0, (1 - k * k * (1 - edge) - k * (1 - edge) * 0.35) * wobble);
}

// =============================================================================
// LAND USE
//
// Every settlement used to be subdivided with a single class: `subdivideBlock(
// blk, s.cls)`. One line, and it is the entire reason whole sectors of this city
// read as one building repeated a thousand times -- because that is exactly what
// they were. Ocean City was TOWER everywhere, West Point was VILLA everywhere.
// No amount of render work fixes that; it is a planning defect, not a graphics
// one.
//
// Real cities are not uniform because land use follows the road hierarchy.
// Commercial development runs in CORRIDORS along the arterials and around
// centres, not in blobs, and it steps down into the residential fabric behind
// it. That is the single most legible pattern on any zoning map, and it is the
// one thing this plan did not have. (Arterial spacing here follows the usual
// planning rule of thumb: an arterial about every 800 m in developed areas, a
// collector every 400.)
//
// So a block's class now comes from three things:
//   1. is it fronting an arterial            -> the corridor mix (taller, mixed)
//   2. is it near one of the neighbourhood centres -> the centre mix
//   3. otherwise                             -> the body mix, chosen by a
//      LOCALITY-CORRELATED field so you get a street of terraces and then a
//      street of villas, rather than salt-and-pepper noise
//
// s.cls stops being "the building here" and becomes "the kind of place this is".
// =============================================================================

const SETTLEMENT_MIX = {
  // corridor: what fronts the arterial. centre: the local high street.
  // body: the fabric behind, listed with repeats to weight the mix.
  VILLA:     { corridor: ["TOWNHOUSE", "MIDRISE", "TERRACE"], centre: ["TERRACE", "MIDRISE", "TOWNHOUSE"],
               body: ["VILLA", "VILLA", "VILLA", "TOWNHOUSE", "TERRACE", "PARK"] },
  TOWNHOUSE: { corridor: ["MIDRISE", "TERRACE", "TOWNHOUSE"], centre: ["MIDRISE", "TERRACE"],
               body: ["TOWNHOUSE", "TOWNHOUSE", "TERRACE", "VILLA", "MIDRISE", "PARK"] },
  TERRACE:   { corridor: ["MIDRISE", "TERRACE"], centre: ["MIDRISE", "TERRACE", "CIVIC"],
               body: ["TERRACE", "TERRACE", "TOWNHOUSE", "MIDRISE", "PARK"] },
  MIDRISE:   { corridor: ["TOWER", "MIDRISE"], centre: ["TOWER", "MIDRISE", "CIVIC"],
               body: ["MIDRISE", "MIDRISE", "TOWNHOUSE", "TERRACE", "PARK"] },
  TOWER:     { corridor: ["TOWER", "TOWER", "MIDRISE"], centre: ["TOWER", "CIVIC"],
               body: ["TOWER", "MIDRISE", "MIDRISE", "TOWNHOUSE", "PARK"] },
  RESORT:    { corridor: ["RESORT", "MIDRISE"], centre: ["MIDRISE", "RESORT", "CIVIC"],
               body: ["RESORT", "RESORT", "MIDRISE", "VILLA", "PARK"] },
  // Working land is genuinely more uniform than housing, but not perfectly so.
  WAREHOUSE: { corridor: ["WAREHOUSE", "MIDRISE"], centre: ["MIDRISE", "WAREHOUSE"],
               body: ["WAREHOUSE", "WAREHOUSE", "WAREHOUSE", "MIDRISE"] },
  FARM:      { corridor: ["FARM", "VILLA"], centre: ["VILLA", "TERRACE"],
               body: ["FARM", "FARM", "FARM", "FARM", "VILLA"] },
  HANGAR:    { corridor: ["HANGAR", "WAREHOUSE"], centre: ["WAREHOUSE"],
               body: ["HANGAR", "HANGAR", "WAREHOUSE"] },
};

/** Arterials, for corridor purposes: the roads a shop wants to be on. */
const CORRIDOR_CLASSES = new Set(["BOULEVARD", "AVENUE"]);

/**
 * The neighbourhood centres of one settlement.
 *
 * A neighbourhood has a middle -- a few blocks of shops, a square, somewhere
 * taller than its surroundings. Without them a suburb is an undifferentiated
 * mat, which is the other half of why these places read as wallpaper.
 */
function settlementCentres(s) {
  const b = s.bounds;
  const w = b.xMax - b.xMin, d = b.zMax - b.zMin;
  // roughly one centre per 1.6 km of the longer dimension, at least one
  const n = Math.max(1, Math.round(Math.max(w, d) / 1600));
  const out = [];
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    // jittered off the centreline so they do not form a straight row
    const j = hash01(`${s.id}|c|${i}`) - 0.5;
    out.push(w >= d
      ? { x: b.xMin + u * w, z: (b.zMin + b.zMax) / 2 + j * d * 0.5 }
      : { x: (b.xMin + b.xMax) / 2 + j * w * 0.5, z: b.zMin + u * d });
  }
  return out;
}

// =============================================================================
// DEMAND -- where the city is dense, and why
//
// Density was a noise field plus a per-settlement class. That is why a villa
// suburb was villas everywhere and a tower district towers everywhere: nothing
// in the model knew that land near the water is worth more than land behind it,
// or that ground around a bridgehead is worth more than ground two kilometres
// past it.
//
// Real value has reasons, and they are the ones anyone would name: the WATER
// (waterfront is the most sought-after land there is), the CORES (downtown and
// each island's centre), and the CONNECTIONS (bridgeheads -- density is highest
// around them and fans out lighter with distance). Build from those three and
// the map stops being uniform without a single block being hand-placed.
// =============================================================================
let _demand = null;
export function cityDemand(heightAt) {
  if (_demand) return _demand;

  const cores = [{ x: 900, z: 2300, weight: 1.0, radius: 3400 }];
  for (const st of SETTLEMENTS) {
    if (!/-core$/.test(st.id)) continue;
    cores.push({
      x: (st.bounds.xMin + st.bounds.xMax) / 2,
      z: (st.bounds.zMin + st.bounds.zMax) / 2,
      weight: st.cls === "TOWER" ? 0.86 : 0.7,
      radius: 2200,
    });
  }
  const gateways = [];
  for (const b of BRIDGES) {
    const ew = b.axis === "ew";
    for (const e of [b.a, b.b]) gateways.push({ x: ew ? e : b.x, z: ew ? b.x : e, weight: 0.62, radius: 1500 });
  }

  // Distance to water, on a coarse cached grid. Doing it per plot would be
  // O(plots x coastline) and this is asked tens of thousands of times.
  const CELL = 200, X0 = -24000, Z0 = -14000, NX = 240, NZ = 140;
  const wet = new Uint8Array(NX * NZ);
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
    wet[j * NX + i] = heightAt(X0 + i * CELL, Z0 + j * CELL) < 0 ? 1 : 0;
  }
  const distToWater = (x, z) => {
    const ci = Math.round((x - X0) / CELL), cj = Math.round((z - Z0) / CELL);
    for (let r = 0; r <= 8; r++) {
      for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const i = ci + di, j = cj + dj;
        if (i < 0 || j < 0 || i >= NX || j >= NZ) continue;
        if (wet[j * NX + i]) return r * CELL;
      }
    }
    return 9 * CELL;
  };

  _demand = makeDemand({ cores, gateways, distToWater, noise: (x, z) => fbm(x + 900, z - 400, 2200, 2) });
  return _demand;
}

/**
 * Pick from a weighted list using a smooth field, so choices come in patches
 * rather than as salt-and-pepper noise.
 *
 * The normalisation is measured, not assumed. fbm here does NOT return a
 * uniform 0..1 -- sampled over 20,000 points its 10th and 90th percentiles are
 * 0.28 and 0.72, so mapping the raw value onto the list crushed almost every
 * choice into the middle two entries. The visible symptom was villa districts
 * containing no villas at all: the index for VILLA existed, covered 40% of the
 * theoretical range, and was never reached on the narrow strips of land these
 * settlements actually occupy. Stretching the real range onto 0..1 fixes it.
 */
function pickPatchy(list, x, z, salt, scale) {
  const band = fbm(x + salt * 733, z - salt * 517, scale, 2);
  const t = clamp((band - 0.28) / 0.44, 0, 0.9999);
  return list[Math.floor(t * list.length)];
}

/**
 * What to build on one block of a settlement.
 * Returns a class name from PLOT_CLASSES, or "PARK".
 */
/** Density ladder for the demand model, densest first. Named apart from the
 *  island's own DENSITY_LADDER, which is a different list for a different job. */
const DEMAND_LADDER = ["TOWER", "MIDRISE", "TERRACE", "TOWNHOUSE", "VILLA", "FARM"];
const DEMAND_FOR = { TOWER: 0.80, MIDRISE: 0.60, TERRACE: 0.44, TOWNHOUSE: 0.30, VILLA: 0.16, FARM: 0.0 };

export function classForSettlementBlock(s, blk, corridorRoads, centres, demandAt = null) {
  const mix = SETTLEMENT_MIX[s.cls] || SETTLEMENT_MIX.TOWNHOUSE;
  const cx = (blk.xMin + blk.xMax) / 2, cz = (blk.zMin + blk.zMax) / 2;

  // DEMAND FIRST.
  //
  // What can stand here is a question about the land (the settlement's mix);
  // what SHOULD is a question about value. Density now falls away from the
  // cores, the bridgeheads and the water instead of being uniform inside a
  // rectangle -- so a suburb has a dense middle near its centre and thins as it
  // goes inland, which is what a suburb looks like.
  if (demandAt) {
    const d = demandAt(cx, cz);
    const allowed = new Set([...(mix.corridor || []), ...(mix.centre || []), ...(mix.body || [])]);

    // Low demand on good ground is OPEN SPACE, not the smallest house. Cities
    // have parks, playing fields and land nobody has built on, and a model that
    // fills every buildable metre reads as a diagram.
    if (d < 0.13 && hash01(`${s.id}|open|${Math.round(cx / 130)}|${Math.round(cz / 130)}`) < 0.55) return "PARK";

    for (const cls of DEMAND_LADDER) {
      if (!allowed.has(cls)) continue;
      if (d >= DEMAND_FOR[cls]) {
        // a little jitter so the density contours are not visible bands
        const j = (hash01(`${s.id}|j|${Math.round(cx / 90)}|${Math.round(cz / 90)}`) - 0.5) * 0.1;
        if (d + j >= DEMAND_FOR[cls]) return cls;
      }
    }
  }

  // 1. fronting an arterial?
  for (const r of corridorRoads) {
    const ew = r.axis === "ew";
    const along = ew ? cx : cz, across = ew ? cz : cx;
    if (along < Math.min(r.from, r.to) - 40 || along > Math.max(r.from, r.to) + 40) continue;
    if (Math.abs(across - r.at) <= CORRIDOR_DEPTH) {
      return pickPatchy(mix.corridor, cx, cz, 3, 380);
    }
  }

  // 2. near a centre? (with a soft edge so the centre does not end on a line)
  for (const c of centres) {
    const t = Math.hypot(cx - c.x, cz - c.z);
    if (t < CENTRE_RADIUS * (0.7 + hash01(`${s.id}|r|${Math.round(cx / 200)}|${Math.round(cz / 200)}`) * 0.6)) {
      return pickPatchy(mix.centre, cx, cz, 7, 300);
    }
  }

  // 3. the fabric
  return pickPatchy(mix.body, cx, cz, 11, 460);
}

/** How deep from an arterial's centreline the commercial frontage runs. */
const CORRIDOR_DEPTH = 68;
/** How far a neighbourhood centre's influence reaches. */
const CENTRE_RADIUS = 300;

/** Build one settlement's roads, blocks and plots, clipped to its land mass. */
export function generateSettlement(s, polyByLandmass, demandAt = null) {
  const poly = polyByLandmass[s.landmass];
  const avHalf = ROADS.AVENUE.row / 2, stHalf = ROADS.STREET.row / 2;
  const roads = [], blocks = [], plots = [];
  const b = s.bounds;

  // A ROAD HIERARCHY, not one mesh.
  //
  // Every road here used to be an AVENUE or a STREET at a fixed spacing, which
  // is a grid with no hierarchy: nothing was more important than anything else,
  // so nothing had a reason to be where it was. Real networks step -- an arterial
  // roughly every 800 m, a collector every 400, locals between -- and land use
  // follows that step. Promoting every fourth avenue to a BOULEVARD is what gives
  // the corridor logic below something to run along.
  const nAv = Math.max(1, Math.round(s.av ? (b.xMax - b.xMin) / s.av : 1));
  let ai = 0;
  for (let x = b.xMin; x <= b.xMax; x += s.av, ai++) {
    const spacingUp = Math.max(1, Math.round(800 / s.av));       // ~800 m -> arterial
    const arterial = ai % spacingUp === 0;
    roads.push({ id:`${s.id}-av${x}`, axis:"ns", class: arterial ? "BOULEVARD" : "AVENUE",
                 at:x, from:b.zMin, to:b.zMax, settlement:s.id, arterial });
  }
  let si = 0;
  for (let z = b.zMin; z <= b.zMax; z += s.st, si++) {
    const spacingUp = Math.max(1, Math.round(800 / s.st));
    const arterial = si % spacingUp === 0;
    roads.push({ id:`${s.id}-st${z}`, axis:"ew", class: arterial ? "AVENUE" : "STREET",
                 at:z, from:b.xMin, to:b.xMax, settlement:s.id, arterial });
  }
  void nAv;

  const corridorRoads = roads.filter((r) => CORRIDOR_CLASSES.has(r.class));
  const centres = settlementCentres(s);

  for (let x = b.xMin; x < b.xMax - s.av * 0.5; x += s.av) {
    for (let z = b.zMin; z < b.zMax - s.st * 0.5; z += s.st) {
      const xMin = x + avHalf, xMax = x + s.av - avHalf;
      const zMin = z + stHalf, zMax = z + s.st - stHalf;
      if (xMax - xMin < 10 || zMax - zMin < 10) continue;
      if (!rectIsBuildable(xMin, xMax, zMin, zMax, SHORE_MARGIN, poly)) continue;
      // A settlement may carve a hole for another that sits inside it -- a town
      // centre inside its own shore village -- so no ground is built twice.
      if (s.exclude && xMax > s.exclude.xMin && xMin < s.exclude.xMax &&
          zMax > s.exclude.zMin && zMin < s.exclude.zMax) continue;
      if (hash01(`${s.id}|d|${x}|${z}`) > settlementDensity(s, (xMin + xMax) / 2, (zMin + zMax) / 2)) continue;
      const blk = { id:`${s.id}-b${x}-${z}`, districtId:s.id, settlement:s.id,
                    xMin, xMax, zMin, zMax, width:xMax-xMin, depth:zMax-zMin };

      // What kind of block this is, from the corridor/centre/fabric rule rather
      // than from one class for the whole settlement.
      const want = classForSettlementBlock(s, blk, corridorRoads, centres, demandAt);
      if (want === "PARK") { blk.kind = "park"; blk.cls = "PARK"; blocks.push(blk); continue; }

      // A block may be too small for the class the field picked -- a corridor
      // tower will not fit on a villa-sized block. Fall back down the mix rather
      // than forcing it, and only then to the settlement's own class, so a block
      // is never simply lost.
      let out = [], used = null;
      for (const cls of [want, ...(SETTLEMENT_MIX[s.cls]?.body || []), s.cls]) {
        if (!cls || cls === "PARK") continue;
        out = subdivideBlock(blk, cls);
        if (out.length) { used = cls; break; }
      }
      if (!out.length) continue;
      blk.cls = used;
      blocks.push(blk);
      plots.push(...out.map(p => ({ ...p, settlement:s.id })));
    }
  }
  // ROADS MUST GO WHERE THE TOWN IS.
  //
  // Every road was emitted across the settlement's whole declared rectangle and
  // then clipped only to LAND. Blocks, meanwhile, thin out toward the edges and
  // stop. So each settlement drew a complete, hard-edged rectangular grid of
  // streets over empty countryside -- which is exactly what reads from altitude
  // as "a zoning diagram dropped on green", and no amount of fraying the
  // BUILDING density could fix it, because the rectangle you can see was made
  // of pavement, not houses.
  //
  // A street exists to reach buildings. So each one is trimmed to the extent of
  // the blocks it actually serves, and a street that serves none is not built.
  const HALF = Math.max(s.av, s.st);
  const served = [];
  for (const r of roads) {
    const ew = r.axis === "ew";
    let lo = Infinity, hi = -Infinity;
    for (const b of blocks) {
      const across = ew ? (b.zMin + b.zMax) / 2 : (b.xMin + b.xMax) / 2;
      if (Math.abs(across - r.at) > HALF) continue;
      const a0 = ew ? b.xMin : b.zMin, a1 = ew ? b.xMax : b.zMax;
      if (a0 < lo) lo = a0;
      if (a1 > hi) hi = a1;
    }
    if (lo === Infinity) continue;                  // serves nothing: not a road
    // a short tail past the last block, so the grid does not stop dead on a
    // building line -- real edges trail off
    const tail = Math.min(s.av, s.st) * 0.6;
    served.push({ ...r, from: Math.max(r.from, lo - tail), to: Math.min(r.to, hi + tail) });
  }

  return { roads: served, blocks, plots };
}

// =============================================================================
// THE JOIN STEP
//
// This exists because of a measurement, and the measurement was humbling.
//
// Bridges, the island grid, each settlement grid and the highways were four
// independent coordinate authorities: hand-typed literals, ISLAND.xMin + k*230,
// bounds.xMin + k*av, and more hand-typed literals. Nothing ever compared them.
// Whether a bridge came ashore INTO a street or merely NEAR one was therefore a
// coincidence, with probability about 2*tolerance/spacing per end -- roughly one
// in five on a 200 m grid.
//
// Measured on the plan before this step: 7 of 40 bridge ends had a collinear
// road, 24 were offset by more than 20 m, and 9 had no joint of any kind. Two
// bridges landed in open countryside with no road within half a kilometre. That
// is not thirty-three typos to go and fix by hand; it is one missing rule, and
// fixing the instances would have left the next coastline edit to re-roll them
// all -- the offsets are derived from ISLAND.xMin, so they change whenever a
// coast control point moves.
//
// So the rule: a bridge BUILDS ITS OWN APPROACH. For each end we walk inland
// along the bridge's own axis until we meet a road that actually crosses us on
// dry ground, and lay the approach between the two. The approach is collinear
// with the bridge because it is generated from the bridge's centreline, and it
// reaches a real street because that is the thing we searched for. Contact stops
// being a coincidence and becomes a construction.
//
// This is also just how it is done in the world: you do not move a city's street
// grid to meet a bridge, you build the approach road.
// =============================================================================

/** Longest approach we are willing to build before calling the bridge misplaced. */
const APPROACH_MAX = 1400;
/** How far sideways a dog-leg will reach for a parallel road when nothing crosses. */
const LINK_MAX = 3200;
/** How far inland the first leg of a dog-leg runs before it turns. */
const LEG_IN = 140;
/** How far a ramp's connector reaches from the freeway to find a street. */
const REACH = 420;

/**
 * Where a road is actually paved.
 *
 * The renderer drops any road sample whose ground is below 0.8 m, so a road's
 * drawn end is decided by the terrain, not by its declared from/to. Anything
 * reasoning about connection has to use the same test the renderer uses or it
 * is reasoning about a road that is not there.
 */
function pavedAt(heightAt, x, z) {
  return heightAt(x, z) >= 0.8;
}

/**
 * Split a declared road into the runs of it that are actually on land.
 *
 * Before this, roads were declared across a settlement's whole bounding
 * rectangle with no land test at all -- only blocks were tested. The result was
 * 101 roads paved on a land mass they did not belong to (Ocean City's grid lying
 * across the downtown island's beach, up to 3.5 km of it), 39 roads entirely
 * under water, and 717 declared endpoints in the sea. Clipping here means a road
 * ends where its land ends, which is also what stops roads running into water.
 */
// 20 m, not 40: a street is ~20 m wide, so sampling coarser than that steps
// over the bank it is not allowed to climb.
function clipRoadToLand(road, heightAt, step = 20, minRun = 110) {
  const ew = road.axis === "ew";
  const out = [];
  let runStart = null, last = null;
  for (let t = road.from; t <= road.to + step * 0.5; t += step) {
    const tt = Math.min(t, road.to);
    const x = ew ? tt : road.at, z = ew ? road.at : tt;
    // A road needs more than dry ground: it has to be driveable. Being dry was
    // the only test before, so streets ran across beaches, up 40-degree banks
    // and off cliff tops -- all of it "land", none of it a street. Bridges and
    // their approaches are exempt: a deck is engineered to cross exactly the
    // ground an ordinary street cannot.
    const on = (road.bridge || road.approachFor)
      ? pavedAt(heightAt, x, z)
      : roadAllowedAt(heightAt, x, z).ok;
    if (on && runStart === null) runStart = tt;
    if (!on && runStart !== null) {
      if (last - runStart >= minRun) out.push([runStart, last]);
      runStart = null;
    }
    if (on) last = tt;
  }
  if (runStart !== null && last - runStart >= minRun) out.push([runStart, last]);

  if (out.length === 0) return [];
  // Return the RUN, not the original road. This used to hand back the original
  // whenever the good run "roughly" covered it, which let up to a step's worth
  // of disallowed ground survive at each end -- 30 road samples were still
  // sitting on cliffs and beaches purely because of this shortcut.
  if (out.length === 1 && out[0][0] <= road.from + 1 && out[0][1] >= road.to - 1) return [road];
  return out.map(([from, to], i) => ({ ...road, id: `${road.id}${out.length > 1 ? `#${i}` : ""}`, from, to }));
}

/**
 * Build the approach road for every bridge end.
 *
 * Returns { approaches, unserved } -- unserved is the list of ends where no
 * crossing road was found within APPROACH_MAX. That list is reported rather than
 * swallowed: a bridge to nowhere should fail a test, not quietly exist.
 */
export function generateBridgeApproaches(roads, heightAt) {
  const approaches = [], unserved = [];

  for (const br of BRIDGES) {
    const ew = br.axis === "ew";
    const at = br.x;                       // z for an ew bridge, x for a ns one
    const mid = (br.a + br.b) / 2;
    // Roads that cross this bridge's centreline: opposite axis, and their span
    // must actually contain our line.
    const crossing = roads.filter((r) => {
      if ((r.axis === "ew") === ew) return false;
      if (r.bridge) return false;          // a bridge is not an approach's target
      return Math.min(r.from, r.to) <= at && Math.max(r.from, r.to) >= at;
    });

    for (const end of [br.a, br.b]) {
      const dir = Math.sign(end - mid) || 1;    // inland, away from the span

      // EVERY end gets a landing street, not only the ends that found nothing.
      //
      // An approach that reaches a road makes the bridge reachable in principle;
      // it does not make the bridge reachable from the TOWN, because the town's
      // grid may run parallel to the approach and never cross it. Six
      // settlements were stranded exactly that way -- their bridges were served,
      // their streets were fine, and there was no turn between them.
      //
      // A short cross-street at the anchor costs almost nothing and guarantees
      // the deck ties into whatever grid is there. Clipped to land like any
      // other road, so it cannot run out to sea.
      approaches.push({
        id: `landing-${br.id}-${end}`, axis: ew ? "ns" : "ew", class: br.class,
        // 1400 m, not 620: a landing has to actually reach the town's grid,
        // and on the outer islands the nearest street is further from the
        // shore than a short stub can span. Clipped to land, so on a narrow
        // island it simply comes out shorter.
        at: end, from: at - 1400, to: at + 1400,
        settlement: "approach", approachFor: br.id, landing: true,
        joins: "(landing street)",
      });
      let best = null;
      for (const r of crossing) {
        const along = (r.at - end) * dir;       // how far inland this road sits
        // Negative means the street sits just BEHIND the anchor -- the deck
        // overshot the last cross street by a few metres. That is a junction,
        // not a gap, so it counts; three ends were failing purely on this sign.
        if (along < -160 || along > APPROACH_MAX) continue;
        // It only counts if the crossing point is on dry ground -- a road that
        // is declared across our line but paved nowhere near it joins nothing.
        const cx = ew ? at : r.at, cz = ew ? r.at : at;
        if (!pavedAt(heightAt, cx, cz)) continue;
        if (!best || along < best.along) best = { along, road: r };
      }

      if (best) {
        if (best.along <= 25) continue;         // already meets a street: nothing to build
        approaches.push({
          id: `approach-${br.id}-${end}`, axis: br.axis || "ns", class: br.class,
          at, from: Math.min(end, best.road.at), to: Math.max(end, best.road.at),
          settlement: "approach", approachFor: br.id, joins: best.road.id,
        });
        continue;
      }

      // --- nothing crosses us: the dog-leg ---------------------------------
      //
      // Several bridges come ashore in open countryside, where no settlement
      // grid exists and so no road crosses their line at any distance. A
      // straight approach has nothing to reach. What a real road does here is
      // run inland a little and then turn to meet the nearest highway, so that
      // is what we build: two legs, and the corner is a junction like any other.
      let alt = null;
      for (const r of roads) {
        if (r.bridge || r.approachFor) continue;
        const parallel = (r.axis === "ew") === ew;
        if (!parallel) continue;
        // r runs the same way we do, offset sideways by |r.at - at|.
        const side = r.at - at;
        if (Math.abs(side) > LINK_MAX) continue;
        // Meet it a short way inland, at a point where both roads are on land.
        const t = end + dir * LEG_IN;
        if (Math.min(r.from, r.to) > t || Math.max(r.from, r.to) < t) continue;
        // The WHOLE turn has to be on land, not just its two ends. Checking only
        // the endpoints let one leg cross open water between them -- caught by
        // the "no road is paved mostly over water" test, which is exactly the
        // kind of thing a test is for: I would not have looked there.
        let dry = true;
        for (let u = 0; u <= 1.0001; u += 0.05) {
          const c = at + (r.at - at) * u;
          if (!pavedAt(heightAt, ew ? t : c, ew ? c : t)) { dry = false; break; }
        }
        if (!dry) continue;
        if (!alt || Math.abs(side) < Math.abs(alt.side)) alt = { side, road: r, t };
      }

      if (!alt) {
        // (the landing street above already serves this end)
        // A LANDING STREET.
        //
        // Nothing crosses this end and nothing runs parallel near it, so there
        // is no existing road to join. Rather than record it as unserved and
        // leave a bridge arriving at nothing, build the street it lands on --
        // which is what actually happens: you do not put a bridge somewhere and
        // hope a road is there, you build the approach and its landing.
        //
        // Perpendicular to the deck, centred on the anchor, and long enough to
        // reach the settlement grid inland of it. It is clipped to land like
        // every other road, so it cannot run out to sea.
        const LANDING = 620;
        approaches.push({
          id: `landing-${br.id}-${end}`, axis: ew ? "ns" : "ew", class: br.class,
          at: end, from: at - LANDING, to: at + LANDING,
          settlement: "approach", approachFor: br.id, landing: true,
          joins: "(landing street)",
        });
        continue;
      }

      // leg 1: inland along the bridge's own axis, so it still leaves the deck straight
      approaches.push({
        id: `approach-${br.id}-${end}`, axis: br.axis || "ns", class: br.class,
        at, from: Math.min(end, alt.t), to: Math.max(end, alt.t),
        settlement: "approach", approachFor: br.id, joins: `${alt.road.id} (via dog-leg)`,
      });
      // leg 2: the turn, across to the road that is actually there
      approaches.push({
        id: `approach-${br.id}-${end}-leg`, axis: ew ? "ns" : "ew", class: br.class,
        at: alt.t, from: Math.min(at, alt.road.at), to: Math.max(at, alt.road.at),
        settlement: "approach", approachFor: br.id, joins: alt.road.id,
      });
    }
  }
  return { approaches, unserved };
}

// =============================================================================
// SETTLEMENTS THAT FOLLOW THEIR ISLAND
//
// The barrier island is a crescent 21 km long that bows from z 500 at its west
// tip up to z 4275 in the middle and back down to z 500 in the east. Its seven
// settlements were declared as straight rectangles with fixed z ranges -- and
// `beach-core`, the island's entire downtown, was declared at z 1400..2560,
// which is open lagoon everywhere except the far western tip.
//
// The result was an island with no city on it: beach-core generated ZERO plots,
// its street grid was clipped away as water, and the two bridges that land there
// had nothing to connect to. Nothing reported this, because a settlement that
// builds nothing looks exactly like a settlement that has not been built yet.
//
// This is the same defect as the bridges, in a different costume: coordinates
// declared by hand against a shape nobody compared them to. The fix is the same
// in kind -- derive the bands FROM the land. Each slice takes its z range from
// the island's own polygon, so the settlements bend with the crescent and cannot
// be laid in the sea.
// =============================================================================

/** The polygon's north and south edge at a given x, or null if x misses it. */
function massSpanAtX(poly, x) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < poly.length; i++) {
    const [ax, az] = poly[i], [bx, bz] = poly[(i + 1) % poly.length];
    if ((ax <= x && bx > x) || (bx <= x && ax > x)) {
      const t = (x - ax) / (bx - ax);
      const z = az + t * (bz - az);
      if (z < lo) lo = z;
      if (z > hi) hi = z;
    }
  }
  return hi > lo ? { lo, hi } : null;
}

/**
 * THE BARRIER SPINE -- the one road that makes the island a place.
 *
 * A barrier city is 21 km long and one road wide in the way that matters: Ocean
 * Drive, Collins, the Lido's lungomare. Without it the island is a row of
 * unrelated resorts, and measurably so -- a connectivity check found the two
 * ends of this island in their OWN components, unreachable from the city, with
 * only 90.7% of the network drivable.
 *
 * The island is a crescent, so a single axis-aligned road cannot follow it. This
 * builds a staircase instead: one east-west run per slice at that slice's own
 * mid-line, and a short north-south jog joining each run to the next. Every
 * segment is derived from the island's polygon, so the spine bends with the land
 * and each settlement's grid crosses it.
 */
function barrierSpine(poly) {
  const out = [];
  const STEP = 1200;
  let prev = null;
  for (let x = -10800; x < 10800; x += STEP) {
    const a = massSpanAtX(poly, x + 4), b = massSpanAtX(poly, x + STEP - 4);
    if (!a || !b) { prev = null; continue; }
    const lo = Math.max(a.lo, b.lo), hi = Math.min(a.hi, b.hi);
    if (hi - lo < 220) { prev = null; continue; }
    // sit on the lagoon side of centre: that is the city side, and it keeps the
    // spine off the beach
    const mid = lo + (hi - lo) * 0.42;
    // Runs OVERLAP their neighbours by a little. Butting them end to end left
    // the jog sitting just outside the previous run's span, so the staircase
    // never actually met itself and the island stayed in three pieces -- a
    // 6-metre bookkeeping error that read as "you cannot drive down the island".
    out.push({ id:`spine-${x}`, axis:"ew", class:"BOULEVARD", at:mid,
               from:x - 30, to:x + STEP + 30, settlement:"barrier-spine", spine:true });
    // the jog that joins this run to the previous one, ON the shared boundary
    if (prev !== null && Math.abs(mid - prev) > 4) {
      out.push({ id:`spine-jog-${x}`, axis:"ns", class:"BOULEVARD", at:x,
                 from:Math.min(mid, prev) - 20, to:Math.max(mid, prev) + 20,
                 settlement:"barrier-spine", spine:true });
    }
    prev = mid;
  }
  return out;
}

/**
 * THE COAST ROAD.
 *
 * Follows the mainland shoreline as a staircase of segments, the same technique
 * as the barrier spine. Two reasons it has to exist. First, every real coast
 * has one -- it is the road the towns hang off. Second, the mainland ends of
 * the bridges land on the shore, and the settlement grids sit inland of it, so
 * without a road ON the coast those crossings arrive at nothing.
 *
 * Set back from the water by COAST_SETBACK so it sits on dry ground rather than
 * on the beach the shore ramp puts at the waterline.
 */
const COAST_SETBACK = 260;

export function coastRoad(mainlandPoly, heightAt) {
  // The shoreline is NOT a function of x -- the two arms run north-south -- so a
  // staircase of east-west runs cannot follow it. The first attempt did exactly
  // that and produced 265 disconnected stubs and 153 components. This walks the
  // polyline and picks each segment's AXIS from the direction the coast is
  // actually going, joining consecutive runs with a jog at their shared corner.
  const shore = mainlandPoly.filter(([, z]) => z > -20000);
  if (shore.length < 4) return [];

  // Sample the shore at a coarse step so segments are streets, not stubs.
  const STEP = 900;
  const nodes = [];
  let acc = 0;
  for (let i = 1; i < shore.length; i++) {
    acc += Math.hypot(shore[i][0] - shore[i - 1][0], shore[i][1] - shore[i - 1][1]);
    if (acc >= STEP || i === shore.length - 1) { nodes.push(shore[i]); acc = 0; }
  }
  if (nodes.length < 2) return [];

  const out = [];
  let prev = null;
  for (let i = 0; i < nodes.length - 1; i++) {
    const [ax, az] = nodes[i], [bx, bz] = nodes[i + 1];
    const dx = bx - ax, dz = bz - az;
    const ew = Math.abs(dx) >= Math.abs(dz);

    // set the road back INLAND from the water: inland is the side away from the
    // bay, which for this coast is smaller z on the north shore and away from
    // the centre on the arms.
    const nx = ew ? 0 : -Math.sign(dz || 1);
    const nz = ew ? -Math.sign(1) : 0;
    const at = Math.round(ew ? (az + bz) / 2 + nz * COAST_SETBACK : (ax + bx) / 2 + nx * COAST_SETBACK);
    const from = Math.round(Math.min(ew ? ax : az, ew ? bx : bz)) - 60;
    const to = Math.round(Math.max(ew ? ax : az, ew ? bx : bz)) + 60;
    if (to - from < 200) continue;

    const midA = ew ? (from + to) / 2 : at;
    const midB = ew ? at : (from + to) / 2;
    if (heightAt && heightAt(midA, midB) < 1.0) { prev = null; continue; }

    out.push({ id: `coast-rd-${i}`, axis: ew ? "ew" : "ns", class: "BOULEVARD",
               at, from, to, settlement: "coast-road", coastRoad: true });

    // join to the previous run at their shared corner
    if (prev && prev.axis !== (ew ? "ew" : "ns")) {
      const jogAt = ew ? from + 80 : at;
      const lo = Math.min(prev.at, at), hi = Math.max(prev.at, at);
      if (hi - lo > 10) {
        out.push({ id: `coast-rd-jog-${i}`, axis: ew ? "ns" : "ew", class: "BOULEVARD",
                   at: ew ? at : from + 80, from: lo - 30, to: hi + 30,
                   settlement: "coast-road", coastRoad: true });
      }
      void jogAt;
    }
    prev = { axis: ew ? "ew" : "ns", at, from, to };
  }
  return out;
}

/**
 * Build the barrier island's settlements as slices that follow its shape.
 *
 * Along the crescent: villas at the two tips, mid-rise shoulders, and in the
 * middle the second downtown -- the big one. Across it: the lagoon half is the
 * city side, the ocean half is the beachfront. That cross-section is what makes
 * a barrier city legible from the air; it is Miami Beach's, and it is the
 * reference Mark has been describing throughout.
 */
function barrierSettlements(poly) {
  const out = [];
  const STEP = 1200;
  const INSET = 90;              // keep the grid off the beach and the seawall
  for (let x = -10800; x < 10800; x += STEP) {
    const a = massSpanAtX(poly, x + 4), b = massSpanAtX(poly, x + STEP - 4);
    if (!a || !b) continue;
    const lo = Math.max(a.lo, b.lo) + INSET;
    const hi = Math.min(a.hi, b.hi) - INSET;
    if (hi - lo < 220) continue;                    // too thin to be a place

    const centre = Math.abs(x + STEP / 2);
    const mid = (lo + hi) / 2;
    const tag = `${x < 0 ? "w" : "e"}${Math.abs(Math.round(x / 100))}`;

    if (centre > 7400) {
      // the tips: low, loose, one band across the whole width
      out.push({ id:`beach-${tag}-villas`, name:"The Points", landmass:"barrier",
                 bounds:{ xMin:x, xMax:x+STEP, zMin:lo, zMax:hi }, av:150, st:120, cls:"VILLA",
                 core:0.4, edge:0.5 });
      continue;
    }

    const core = centre <= 4200;                    // the downtown stretch
    // lagoon side: the city. ocean side: the beachfront.
    out.push({ id:`beach-${tag}-city`, name: core ? "Ocean City" : "The Shore", landmass:"barrier",
               bounds:{ xMin:x, xMax:x+STEP, zMin:lo, zMax:mid }, av:190, st:150,
               cls: core ? "TOWER" : "MIDRISE", core: core ? 0.85 : 0.6, edge: core ? 0.8 : 0.5 });
    out.push({ id:`beach-${tag}-front`, name:"Beachfront", landmass:"barrier",
               bounds:{ xMin:x, xMax:x+STEP, zMin:mid, zMax:hi }, av:190, st:150,
               cls:"RESORT", core: core ? 0.8 : 0.55, edge: core ? 0.72 : 0.45 });
  }
  return out;
}

/**
 * CONNECT WHAT THE RULES CUT OFF.
 *
 * Making roads obey the land is correct and it strands places: a grid clipped
 * to driveable ground breaks into islands of pavement, and a town with no way
 * out is worse than a town on a slightly awkward street.
 *
 * A real city answers this by ENGINEERING A ROUTE -- the road goes around the
 * hill, along the contour, and joins the next one. So: find each cut-off group,
 * find the nearest road in the main network, and lay an L between them along
 * ground that is actually driveable. If neither leg of the L works, try the
 * other order, then give up and leave it visible to the test rather than
 * pretending.
 */
function connectStranded(roads, heightAt) {
  const parent = roads.map((_, i) => i);
  const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
  const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
  const paved = (x, z) => heightAt(x, z) >= 0.8;

  // INDEXED, not all-pairs.
  //
  // This compared every road against every other -- ~1.9 M pairs at n=1952 --
  // and it is called again after each connector is added, so the world build
  // spent most of its time here. Roads are axis-aligned, so a crossing can only
  // happen between an ew road and a ns road whose `at` falls inside the other's
  // span. Sorting each axis by `at` and binary-searching the range turns the
  // inner loop from "every road" into "the handful that can possibly touch".
  const ewIdx = [], nsIdx = [];
  roads.forEach((r, i) => (r.axis === "ew" ? ewIdx : nsIdx).push(i));
  ewIdx.sort((a, b) => roads[a].at - roads[b].at);
  nsIdx.sort((a, b) => roads[a].at - roads[b].at);
  const lowerBound = (idx, v) => {
    let lo = 0, hi = idx.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (roads[idx[m]].at < v) lo = m + 1; else hi = m; }
    return lo;
  };

  const link = () => {
    // perpendicular crossings
    for (const i of nsIdx) {
      const r = roads[i];
      const lo = Math.min(r.from, r.to) - 20, hi = Math.max(r.from, r.to) + 20;
      for (let k = lowerBound(ewIdx, lo); k < ewIdx.length && roads[ewIdx[k]].at <= hi; k++) {
        const j = ewIdx[k], t = roads[j];
        const cx = r.at, cz = t.at;
        if (cx < Math.min(t.from, t.to) - 20 || cx > Math.max(t.from, t.to) + 20) continue;
        if (!r.bridge && !t.bridge && !paved(cx, cz)) continue;
        union(i, j);
      }
    }
    // collinear overlaps, within each axis, only against near neighbours
    for (const idx of [ewIdx, nsIdx]) {
      for (let a = 0; a < idx.length; a++) {
        const r = roads[idx[a]];
        for (let b = a + 1; b < idx.length && roads[idx[b]].at - r.at <= 10; b++) {
          const t = roads[idx[b]];
          if (Math.max(r.from, r.to) < Math.min(t.from, t.to) - 60) continue;
          if (Math.max(t.from, t.to) < Math.min(r.from, r.to) - 60) continue;
          union(idx[a], idx[b]);
        }
      }
    }
  };
  link();

  const groups = new Map();
  roads.forEach((r, i) => {
    const k = find(i);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(i);
  });
  const sorted = [...groups.values()].sort((a, b) => b.length - a.length);
  if (sorted.length < 2) return [];
  // Target ANY larger group, not only the biggest.
  //
  // Redcliff's village could not reach "the main network" because the only
  // route ran through its own bridge -- and the bridge was in a small group of
  // its own, so linking to it did not count. Chaining through a neighbour is
  // how a road network actually grows, and the fixed-point loop above then
  // merges the chain into the whole.
  const mainIdx = new Set(sorted[0]);

  const mid = (r) => {
    const t = (r.from + r.to) / 2;
    return r.axis === "ew" ? [t, r.at] : [r.at, t];
  };
  // A road may cross a RIVER -- on a bridge, which is what a bridge is for. It
  // may not cross a cliff, a bank it cannot climb, or open sea. The eastern
  // mainland was cut off from the rest of the world by its own river until this
  // distinction existed: the connector could find a perfect route and rejected
  // it because 60 m of it was water.
  const MAX_SPAN = 420;
  const legOk = (axis, at, from, to) => {
    if (Math.abs(to - from) < 40) return true;
    const lo = Math.min(from, to), hi = Math.max(from, to);
    let wet = 0;
    for (let t = lo; t <= hi; t += 25) {
      const x = axis === "ew" ? t : at, z = axis === "ew" ? at : t;
      const a = roadAllowedAt(heightAt, x, z);
      if (a.ok) { wet = 0; continue; }
      if (a.reason === "water") { wet += 25; if (wet > MAX_SPAN) return false; continue; }
      return false;                                  // cliff, beach or too steep
    }
    return true;
  };

  const added = [];
  let n = 0;
  for (const g of sorted.slice(1)) {
    // only bother connecting groups that carry a settlement
    const named = g.map((i) => roads[i]).find((r) => r.settlement &&
      !["bridge", "approach", "coast-road", "freeway"].includes(r.settlement));
    if (!named) continue;

    // TARGET THE MAIN NETWORK ONLY.
    //
    // Allowing a group to link to any LARGER group was tried and measured
    // worse -- 6 stranded instead of 2 -- because routes then chained toward
    // whichever neighbour happened to be nearby rather than toward the city.
    // Aiming at the main network is what makes a link worth building.
    let best = null;
    for (const i of g) {
      const [ax, az] = mid(roads[i]);
      for (const j of mainIdx) {
        const [bx, bz] = mid(roads[j]);
        const d = Math.hypot(ax - bx, az - bz);
        if (d > 12000) continue;  // the eastern group's nearest neighbour is far
        if (!best || d < best.d) best = { d, ax, az, bx, bz };
      }
    }
    if (!best) { if (typeof process !== "undefined" && process.env.DEBUG_LINK) console.error(`  no candidate for ${named.settlement} (group ${g.length})`); continue; }

    // an L: along x then along z, or along z then along x -- whichever is
    // driveable the whole way
    // A PATH SEARCH, not an L.
    //
    // L-shapes could not express a route around an obstacle: the eastern
    // mainland sits behind a 2.5 km inlet with a perfectly good dry route around
    // its head, and an L between two points cannot go around anything. Five
    // towns stayed cut off because of the shape of the router, not the shape of
    // the land.
    //
    // This is A* over a coarse grid of driveable ground. Water is passable at a
    // price and only in short spans -- that is a bridge, and bridges are
    // expensive, which is exactly the trade-off a road engineer makes.
    const STEP = 140;
    const key = (i, j) => `${i},${j}`;
    const gx = (i) => best.ax + i * STEP, gz = (j) => best.az + j * STEP;
    let ti = Math.round((best.bx - best.ax) / STEP), tj = Math.round((best.bz - best.az) / STEP);
    const RANGE = 90;          // 90 * 140 m = 12.6 km of search room
    const cost = (i, j) => {
      if (Math.abs(i) > RANGE || Math.abs(j) > RANGE) return Infinity;
      const a = roadAllowedAt(heightAt, gx(i), gz(j));
      if (a.ok) return 1;
      // A bridge is EXPENSIVE. At a cost of 9 the search happily swam: it found
      // routes that were mostly open water, because 9 was cheaper than going
      // the long way round. At 70 it crosses water only where a real engineer
      // would -- a narrow strait with no alternative.
      if (a.reason === "too steep" && a.slope < 0.30) return 4;   // a cutting: dearer than flat
      if (a.reason === "water") return 70;
      return Infinity;                           // cliff, beach, unclimbable bank
    };
    // SNAP BOTH ENDS TO PASSABLE GROUND.
    //
    // The search started at a road's midpoint and aimed at another, without
    // ever asking whether those cells were passable. A road midpoint sampled on
    // a 140 m grid lands on a beach or a bank often enough that the search was
    // boxed in from the first step -- "no path over 718 m" across ground that
    // is walkable the whole way. Both ends now slide to the nearest cell a road
    // could actually occupy.
    const snap = (i0, j0) => {
      for (let r = 0; r <= 6; r++) {
        for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          if (isFinite(cost(i0 + di, j0 + dj))) return [i0 + di, j0 + dj];
        }
      }
      return null;
    };
    const startCell = snap(0, 0);
    const goalCell = snap(ti, tj);
    if (!startCell || !goalCell) {
      if (typeof process !== "undefined" && process.env.DEBUG_LINK) console.error(`  no passable end for ${named.settlement}`);
      continue;
    }
    const [si, sj] = startCell;
    [ti, tj] = goalCell;

    const h2 = (i, j) => Math.abs(i - ti) + Math.abs(j - tj);
    // A BINARY HEAP, not sort-then-shift.
    //
    // This sorted the ENTIRE open list on every iteration and then shift()ed
    // the front -- an O(n log n) sort plus an O(n) shift, up to 60,000 times,
    // on a list that grows to thousands. It was the single biggest cost in a
    // 2.5 s world build that runs on the main thread before first paint.
    // A heap makes both operations O(log n) and changes nothing about the
    // route that comes out.
    const heap = [{ i: si, j: sj, g: 0, f: h2(si, sj) }];
    const hPush = (n2) => {
      heap.push(n2);
      let c = heap.length - 1;
      while (c > 0) {
        const p2 = (c - 1) >> 1;
        if (heap[p2].f <= heap[c].f) break;
        [heap[p2], heap[c]] = [heap[c], heap[p2]];
        c = p2;
      }
    };
    const hPop = () => {
      const top = heap[0], last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let c = 0;
        for (;;) {
          const l = c * 2 + 1, r = l + 1;
          let m2 = c;
          if (l < heap.length && heap[l].f < heap[m2].f) m2 = l;
          if (r < heap.length && heap[r].f < heap[m2].f) m2 = r;
          if (m2 === c) break;
          [heap[m2], heap[c]] = [heap[c], heap[m2]];
          c = m2;
        }
      }
      return top;
    };
    const open = heap;
    const came = new Map(), gScore = new Map([[key(si, sj), 0]]);
    let found = false;
    for (let guard = 0; guard < 24000 && open.length; guard++) {
      const cur = hPop();
      if (cur.i === ti && cur.j === tj) { found = true; break; }
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = cur.i + di, nj = cur.j + dj;
        const c = cost(ni, nj);
        if (!isFinite(c)) continue;
        const ng = cur.g + c;
        const k = key(ni, nj);
        if (gScore.has(k) && gScore.get(k) <= ng) continue;
        gScore.set(k, ng);
        came.set(k, key(cur.i, cur.j));
        hPush({ i: ni, j: nj, g: ng, f: ng + h2(ni, nj) });
      }
    }
    if (!found) { if (typeof process !== "undefined" && process.env.DEBUG_LINK) console.error(`  no path for ${named.settlement} over ${Math.round(best.d)} m`); continue; }

    // Walk the path back and collapse it into axis-aligned runs.
    //
    // Straightforward version: step along the path, and every time the
    // direction changes, close the run. The first attempt tried to do this in
    // one pass with a lookahead and emitted segments that did not join, which
    // made connectivity WORSE than the L-router it replaced -- 9 stranded
    // instead of 5. A route is only a route if its pieces touch.
    // Walk the came-from chain, with a visited set and a cap. The relaxation
    // rule makes it acyclic, but this was the one loop in the file with no
    // guard sitting next to one with a 60,000-iteration guard -- and "it cannot
    // cycle" is an argument, not a bound.
    const path = [];
    const walked = new Set();
    let k = key(ti, tj);
    while (k && !walked.has(k) && path.length < 20000) {
      walked.add(k);
      const [i, j] = k.split(",").map(Number);
      path.push([i, j]);
      k = came.get(k);
    }
    path.reverse();
    if (path.length < 2) continue;

    const pending = [];
    const emit = (a, b) => {
      const ew = a[1] === b[1];
      const at = Math.round(ew ? gz(a[1]) : gx(a[0]));
      const f = Math.round(ew ? Math.min(gx(a[0]), gx(b[0])) : Math.min(gz(a[1]), gz(b[1])));
      const t = Math.round(ew ? Math.max(gx(a[0]), gx(b[0])) : Math.max(gz(a[1]), gz(b[1])));
      if (t - f < 20) return;
      // overlap the ends by half a step so consecutive runs genuinely meet
      pending.push({ id: `link-${n}-${pending.length}`, axis: ew ? "ew" : "ns", class: "AVENUE",
                     at, from: f - STEP / 2, to: t + STEP / 2, settlement: "link", connector: true });
    };

    let anchor = path[0];
    let dir = null;
    for (let q = 1; q < path.length; q++) {
      const d = [path[q][0] - path[q - 1][0], path[q][1] - path[q - 1][1]];
      const dk = `${d[0]},${d[1]}`;
      if (dir === null) { dir = dk; continue; }
      if (dk !== dir) { emit(anchor, path[q - 1]); anchor = path[q - 1]; dir = dk; }
    }
    emit(anchor, path[path.length - 1]);

    // Refuse the whole route if any leg of it is mostly water. A connector is a
    // road; a road that is 60% sea is not a road, and building one to satisfy a
    // connectivity metric would be exactly the kind of technically-passing lie
    // this project exists to refuse.
    // VALIDATE THE LEGS AT FINE RESOLUTION.
    //
    // A* samples the ground every 140 m; the emitted run is continuous. Ground
    // between two passable cells can be a cliff or a bank, and 54 connector
    // samples were sitting on exactly that -- the search was right about the
    // cells it looked at and wrong about the road between them. Water is still
    // allowed in short spans (that is a bridge); rock and unclimbable banks are
    // not allowed at all.
    const wetLeg = pending.find((r) => {
      const ew = r.axis === "ew";
      let wet = 0, tot = 0, run = 0;
      for (let t = r.from; t <= r.to; t += 15) {
        tot++;
        const a = roadAllowedAt(heightAt, ew ? t : r.at, ew ? r.at : t);
        if (a.ok) { run = 0; continue; }
        // An engineered road may CUT through a moderate bank -- that is what a
        // cutting and an embankment are, and refusing them left only 7 of 59
        // routes standing. It may not cross a cliff, and it may not run on a
        // beach: the foreshore is public and a street on sand is the single
        // most obviously wrong thing in a coastal city.
        if (a.reason === "too steep" && a.slope < 0.30) continue;
        if (a.reason !== "water") return true;      // cliff, beach, or a real bank
        wet++; run += 15;
        if (run > 420) return true;                  // longer than a bridge here
      }
      return tot > 0 && wet / tot > 0.4;
    });
    if (wetLeg) { if (typeof process !== "undefined" && process.env.DEBUG_LINK) console.error(`  route for ${named.settlement} refused: leg mostly water`); continue; }
    added.push(...pending);
    n++;
  }
  return added;
}

/**
 * THE WHOLE WORLD: the downtown island plus every other settlement, the
 * highway network, and the land masses they sit on.
 *
 * `heightAt` is optional only so that callers who want the raw declared plan
 * (tests of the data itself) can still get it. Pass it and the world comes back
 * joined and clipped -- which is the version the renderer must draw.
 */
/**
 * A cached height function for the plan's own use.
 *
 * The plan asks "how high is it here" about two and a half million times while
 * it builds -- every road sampled every 20 m, and every one of those samples
 * costs FIVE calls because the slope test needs four neighbours. At 4.3 us a
 * call that is most of a ten-second world build, and the build runs on the main
 * thread before first paint.
 *
 * The terrain is smooth at 12 m, so a lazily-filled grid at that spacing gives
 * the same answers for these tests at a fraction of the cost. The renderer and
 * the tests still use the exact function -- this is only for the generator's
 * own bulk queries.
 */
function cachedHeight(heightAt, cell = 12) {
  const X0 = -34000, Z0 = -38000, NX = 5700, NZ = 4200;
  const grid = new Float32Array(NX * NZ).fill(NaN);
  return function cachedHeightAt(x, z) {
    const i = ((x - X0) / cell) | 0, j = ((z - Z0) / cell) | 0;
    if (i < 0 || j < 0 || i >= NX || j >= NZ) return heightAt(x, z);
    const k = j * NX + i;
    const v = grid[k];
    if (v === v) return v;                       // NaN-check without isNaN
    const h = heightAt(X0 + i * cell, Z0 + j * cell);
    grid[k] = h;
    return h;
  };
}

export function generateWorld(rawHeightAt = null) {
  // everything below uses the cached height for bulk queries
  const heightAt = rawHeightAt ? cachedHeight(rawHeightAt) : null;
  const masses = landmassPolygons(16);
  const polyBy = Object.fromEntries(masses.map(m => [m.id, m.polygon]));

  const demandAt = heightAt ? cityDemand(heightAt) : null;
  const city = generateCityPlan();
  const roads  = [
    ...city.roads.map(r => ({ ...r, settlement:"downtown" })),
    ...HIGHWAYS,
    ...FREEWAYS.map(f => ({ id:`fwy-${f.id}`, axis:f.axis, class:"FREEWAY", at:f.at, from:f.from, to:f.to, settlement:"freeway", freeway:true })),
    ...generateRamps(),
  ];
  const blocks = [...city.blocks.map(b => ({ ...b, settlement:"downtown" }))];
  const plots  = [...city.plots.map(p => ({ ...p, settlement:"downtown" }))];

  const settlements = [{ id:"downtown", name:"Downtown", landmass:"downtown",
                         plots:city.plots.length, blocks:city.blocks.length }];
  // The barrier's bands are generated from its own polygon rather than declared,
  // so they bend with the crescent instead of being laid across the lagoon.
  const settlementList = [
    ...SETTLEMENTS.filter((s) => s.landmass !== "barrier"),
    ...barrierSettlements(polyBy.barrier),
  ];
  // the spine goes in with the highways, not as a settlement, because it is a
  // through route rather than something serving one place
  roads.push(...barrierSpine(polyBy.barrier));
  if (heightAt) roads.push(...coastRoad(polyBy.mainland, heightAt));
  for (const s of settlementList) {
    const out = generateSettlement(s, polyBy, demandAt);
    roads.push(...out.roads); blocks.push(...out.blocks); plots.push(...out.plots);
    settlements.push({ id:s.id, name:s.name, landmass:s.landmass,
                       plots:out.plots.length, blocks:out.blocks.length, cls:s.cls });
  }

  // BRIDGES ARE ROADS. Adding them to the network is what makes them connect to
  // anything: the carriageway, footways, markings, lamps and traffic are all
  // generated from the road list, so a bridge that is not in it is a deck
  // floating between two places that have never heard of it.
  for (const br of BRIDGES) {
    roads.push({
      id: `bridge-${br.id}`, axis: br.axis || "ns", class: br.class, at: br.x,
      from: Math.min(br.a, br.b), to: Math.max(br.a, br.b),
      settlement: "bridge", bridge: br.id, bridgeType: br.type,
    });
  }

  // --- clip, then join -----------------------------------------------------
  //
  // Order matters. Clipping first means the approach search is looking at where
  // roads REALLY are, so an approach can never be declared to join a road that
  // turns out to be under water. Joining first would let a bridge "connect" to a
  // road that clipping then deletes, which is the same lie in a new place.
  let out = roads;
  let unserved = [];
  if (heightAt) {
    const clipped = [];
    for (const r of roads) {
      if (r.bridge) { clipped.push(r); continue; }   // a bridge is meant to be over water
      clipped.push(...clipRoadToLand(r, heightAt));
    }
    const joined = generateBridgeApproaches(clipped, heightAt);
    // Landings are ordinary roads and must be clipped like ordinary roads --
    // unclipped, a cross-street at the anchor runs straight out to sea. The
    // approaches themselves are deliberately NOT clipped: they are short by
    // construction and clipping's 110 m minimum run would delete them, which is
    // exactly how every ramp connector in the world got silently removed once.
    const landings = joined.approaches.filter((r) => r.landing);
    const rest = joined.approaches.filter((r) => !r.landing);
    const clippedLandings = [];
    for (const r of landings) clippedLandings.push(...clipRoadToLand(r, heightAt, 40, 90));
    out = [...clipped, ...rest, ...clippedLandings];
    // And finally engineer routes to anything the land rules cut off. Run it
    // more than once: connecting one group changes which group is "the main
    // network" for the next, and a single pass leaves anything that could only
    // have reached the world THROUGH a newly-connected group still stranded.
    for (let pass = 0; pass < 4; pass++) {
      const links = connectStranded(out, heightAt);
      if (links.length === 0) break;
      out = [...out, ...links];
    }

    // RE-CHECK AGAINST THE FINISHED WORLD.
    //
    // The approach search runs before any approach exists, so an end that ends
    // up served by a DIFFERENT bridge's approach was still being reported as
    // unserved. That is a report describing an intermediate state rather than
    // the world it is attached to -- stale rather than false, but a world that
    // misdescribes itself is exactly the thing this project refuses. Filter the
    // list against the roads that actually exist at the end.
    unserved = joined.unserved.filter((u) => {
      const br = BRIDGES.find((b) => b.id === u.bridge);
      if (!br) return true;
      const ew = br.axis === "ew";
      const mid = (br.a + br.b) / 2;
      const dir = Math.sign(u.end - mid) || 1;
      // a landing street built FOR this bridge serves it by construction
      if (out.some((r) => r.approachFor === u.bridge && r.landing && Math.abs(r.at - u.end) < 40)) return false;
      return !out.some((r) => {
        if ((r.axis === "ew") === ew || r.bridge) return false;
        if (Math.min(r.from, r.to) > u.at || Math.max(r.from, r.to) < u.at) return false;
        const along = (r.at - u.end) * dir;
        if (along < -160 || along > 60) return false;
        return pavedAt(heightAt, ew ? u.at : r.at, ew ? r.at : u.at);
      });
    });
  }

  // ONE PIECE OF GROUND, ONE PLOT.
  //
  // Settlements are laid out independently and their bounds can overlap -- an
  // island's core and its shore ring are meant to, and that is fine as long as
  // the PLOTS do not collide. Two of them did: `port` was laid over `coastal-4`
  // and `cormorant-isle-shore` over `coastal-0`, putting 593 plots on ground
  // another settlement had already claimed. Buildings on those plots intersect
  // each other in 3D.
  //
  // Nothing caught it. The existing tests check that land masses do not overlap
  // and that placements do not overlap, but nothing checked plot against plot,
  // so a settlement could be built straight through another one.
  //
  // Found by building the spatial index: the moment "which plot is at this
  // point" became answerable, 35 plot centres answered with a DIFFERENT plot's
  // id, which is only possible if they share ground.
  //
  // Resolved at plot level rather than by moving settlement bounds, so the
  // legitimate core/shore pairs are untouched -- they only lose a plot where
  // one genuinely collides. First plot wins, and the order is deterministic, so
  // the world stays reproducible.
  const keptPlots = [];
  {
    const CELL = 400;
    const grid = new Map();
    const key = (cx, cz) => cx + "," + cz;
    for (const pl of plots) {
      const c0 = Math.floor(pl.xMin / CELL), c1 = Math.floor(pl.xMax / CELL);
      const r0 = Math.floor(pl.zMin / CELL), r1 = Math.floor(pl.zMax / CELL);
      let clash = false;
      for (let cx = c0; cx <= c1 && !clash; cx++) {
        for (let cz = r0; cz <= r1 && !clash; cz++) {
          const bucket = grid.get(key(cx, cz));
          if (!bucket) continue;
          for (const other of bucket) {
            // ONLY ACROSS SETTLEMENTS.
            //
            // The first version of this dropped ANY overlapping plot and took
            // 4,087 of them -- 13% of the city -- to fix 99. Measuring what was
            // actually being deleted showed 3,988 were same-block siblings from
            // subdivideBlock, which is a separate question (reported below, not
            // silently resolved by deletion).
            //
            // The defect this fixes is one settlement laid over another. Two
            // plots in the same settlement overlapping is a subdivision issue
            // and deleting one does not fix it, it just hides it.
            if (other.settlement === pl.settlement) continue;
            // touching edges is not overlapping -- adjacent plots share a line
            if (pl.xMax <= other.xMin || pl.xMin >= other.xMax) continue;
            if (pl.zMax <= other.zMin || pl.zMin >= other.zMax) continue;
            clash = true;
            break;
          }
        }
      }
      if (clash) continue;
      keptPlots.push(pl);
      for (let cx = c0; cx <= c1; cx++) {
        for (let cz = r0; cz <= r1; cz++) {
          const k = key(cx, cz);
          let bucket = grid.get(k);
          if (!bucket) grid.set(k, (bucket = []));
          bucket.push(pl);
        }
      }
    }
  }

  return { world:WORLD, masses, roads: out, blocks, plots: keptPlots, settlements,
           districts:DISTRICTS, bridges:BRIDGES, causeways:BRIDGES, highways:HIGHWAYS,
           unservedBridgeEnds: unserved,
           plotsDroppedForOverlap: plots.length - keptPlots.length,
           /** Plots that MEANINGFULLY overlap another in the same settlement.
            *
            * The epsilon is not decoration. Adjacent plots share an edge, and
            * `xMin + i*w + w` differs from `xMin + (i+1)*w` in the last bits of
            * a double -- so an exact test reports 4,024 "overlapping" pairs
            * whose largest intersection is 3.6 PICOMETRES. Measuring without a
            * tolerance turned floating-point dust into a 26%-of-the-city alarm,
            * which I raised before checking the magnitude.
            *
            * A centimetre is well below anything that matters here and well
            * above anything a double can invent. Reported rather than deleted:
            * if real overlaps ever appear, removing one of the pair hides the
            * subdivision bug instead of fixing it. */
           plotsOverlappingWithinSettlement: (() => {
             const CELL2 = 400, g2 = new Map(), k2 = (a3, b3) => a3 + "," + b3;
             for (const pl of keptPlots) {
               for (let cx = Math.floor(pl.xMin / CELL2); cx <= Math.floor(pl.xMax / CELL2); cx++) {
                 for (let cz = Math.floor(pl.zMin / CELL2); cz <= Math.floor(pl.zMax / CELL2); cz++) {
                   const kk = k2(cx, cz);
                   let bk = g2.get(kk);
                   if (!bk) g2.set(kk, (bk = []));
                   bk.push(pl);
                 }
               }
             }
             const bad = new Set();
             for (const [, bucket] of g2) {
               for (let i = 0; i < bucket.length; i++) {
                 for (let j = i + 1; j < bucket.length; j++) {
                   const a4 = bucket[i], b4 = bucket[j];
                   const EPS = 0.01;                  // 1 cm
                   if (a4.xMax - b4.xMin <= EPS || b4.xMax - a4.xMin <= EPS) continue;
                   if (a4.zMax - b4.zMin <= EPS || b4.zMax - a4.zMin <= EPS) continue;
                   bad.add(a4.id); bad.add(b4.id);
                 }
               }
             }
             return bad.size;
           })() };
}

/** The whole plan: roads, blocks and plots, ready to draw or to edit. */
export function generateCityPlan() {
  const roads = generateRoads();
  const blocks = generateBlocks();
  const plots = [];
  const parks = [];
  for (const b of blocks) {
    const d = DISTRICTS.find((x) => x.id === b.districtId);
    const want = classForBlock(b, d);
    if (want === "PARK") { parks.push({ ...b, kind: "park" }); continue; }
    // the field's choice first, then anything else the district allows that the
    // block can legally carry -- never a class the district forbids
    const candidates = [want, ...((d && d.allow) || []), d && d.primary].filter(
      (c, i, a) => c && c !== "PARK" && a.indexOf(c) === i
    );
    let out = [];
    for (const cls of candidates) {
      out = subdivideBlock(b, cls);
      if (out.length) break;
    }
    plots.push(...out);
  }
  return { world: WORLD, bands: BANDS, island: ISLAND, roads, blocks, plots, parks, districts: DISTRICTS, suburbs: SUBURBS, bridges: BRIDGES };
}
