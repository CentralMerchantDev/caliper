// =============================================================================
// CALIPER — PLANNING CORPUS RETRIEVAL GOLDEN SET (Phase R3.3 & R3.4)
//
// 30 Answerable layout & planning questions with expected chunk IDs + citations,
// and 5 unanswerable questions that must trigger R3.4 abstention.
// =============================================================================

export interface PlanningGoldenQuestion {
  id: string;
  question: string;
  expectedChunkId: string;
  expectedSection: string;
}

export const PLANNING_GOLDEN_QUESTIONS: PlanningGoldenQuestion[] = [
  // ---------------------------------------------------------------------------
  // §0 & §1: Streets, Dimensions & Blocks
  // ---------------------------------------------------------------------------
  {
    id: "plan-01",
    question: "What are the three kinds of numbers in the generator and how do they scale with WORLD_SCALE?",
    expectedChunkId: "0-how-to-read-this",
    expectedSection: "## 0. How to read this",
  },
  {
    id: "plan-02",
    question: "What is the right-of-way width and footway share for residential local streets versus avenues and boulevards?",
    expectedChunkId: "1-1-cross-section-right-of-way-by-class",
    expectedSection: "### 1.1 Cross-section — right-of-way by class",
  },
  {
    id: "plan-03",
    question: "What is the professional disagreement between AASHTO and NACTO on lane width?",
    expectedChunkId: "1-1-cross-section-right-of-way-by-class",
    expectedSection: "### 1.1 Cross-section — right-of-way by class",
  },
  {
    id: "plan-04",
    question: "What is the recommended arterial spacing in a dense urban core versus conventional suburban areas?",
    expectedChunkId: "1-2-network-spacing",
    expectedSection: "### 1.2 Network spacing",
  },
  {
    id: "plan-05",
    question: "What is the desirable block length and acceptable ceiling according to ITE and CNU?",
    expectedChunkId: "1-3-blocks-and-the-mistake-this-world-was-making",
    expectedSection: "### 1.3 Blocks — and the mistake this world was making",
  },
  {
    id: "plan-06",
    question: "How is Melbourne's Hoddle Grid block subdivided by little streets into walkable sub-blocks?",
    expectedChunkId: "1-3-blocks-and-the-mistake-this-world-was-making",
    expectedSection: "### 1.3 Blocks — and the mistake this world was making",
  },
  {
    id: "plan-07",
    question: "What are the maximum road gradients by class and terrain according to AASHTO?",
    expectedChunkId: "1-4-gradient-by-class-not-one-number",
    expectedSection: "### 1.4 Gradient — by class, not one number",
  },
  {
    id: "plan-08",
    question: "What is the K value calculation and minimum length for crest and sag vertical curves on roads?",
    expectedChunkId: "1-5-vertical-curves",
    expectedSection: "### 1.5 Vertical curves",
  },
  {
    id: "plan-09",
    question: "What is the minimum angle between intersecting streets and the maximum cross-slope through an intersection?",
    expectedChunkId: "1-6-intersections",
    expectedSection: "### 1.6 Intersections",
  },

  // ---------------------------------------------------------------------------
  // §2: Ports & Maritime
  // ---------------------------------------------------------------------------
  {
    id: "plan-10",
    question: "What navigation depth and water draft is required for container ships and panamax berths?",
    expectedChunkId: "2-1-depth-what-actually-sets-the-site",
    expectedSection: "### 2.1 Depth — what actually sets the site",
  },
  {
    id: "plan-11",
    question: "What is the required quay length and container terminal back-up land per berth?",
    expectedChunkId: "2-2-quay-length-and-back-up-land",
    expectedSection: "### 2.2 Quay length and back-up land",
  },
  {
    id: "plan-12",
    question: "What is the turning basin diameter needed for ship manoeuvring water?",
    expectedChunkId: "2-3-manoeuvring-water",
    expectedSection: "### 2.3 Manoeuvring water",
  },
  {
    id: "plan-13",
    question: "What geographic features make a naturally sheltered good harbour?",
    expectedChunkId: "2-4-what-makes-a-good-harbour",
    expectedSection: "### 2.4 What makes a good harbour",
  },
  {
    id: "plan-14",
    question: "How many ship-to-shore container cranes are assigned per berth and what is their rail gauge?",
    expectedChunkId: "2-5-cranes",
    expectedSection: "### 2.5 Cranes",
  },

  // ---------------------------------------------------------------------------
  // §3: Airports & Aviation
  // ---------------------------------------------------------------------------
  {
    id: "plan-15",
    question: "How does the ICAO 4-code classification system categorize airports by reference field length?",
    expectedChunkId: "3-1-classification",
    expectedSection: "### 3.1 Classification",
  },
  {
    id: "plan-16",
    question: "What is the standard runway length, width, and crossfall geometry for commercial airliners?",
    expectedChunkId: "3-2-geometry",
    expectedSection: "### 3.2 Geometry",
  },
  {
    id: "plan-17",
    question: "What obstacle limitation surfaces and protected airspace fans surround airport runways?",
    expectedChunkId: "3-3-protected-land",
    expectedSection: "### 3.3 Protected land",
  },
  {
    id: "plan-18",
    question: "What total site area and typical distance from the city centre does an international airport require?",
    expectedChunkId: "3-4-site-area-and-distance-from-the-city",
    expectedSection: "### 3.4 Site area and distance from the city",
  },

  // ---------------------------------------------------------------------------
  // §4: Railways & Freight
  // ---------------------------------------------------------------------------
  {
    id: "plan-19",
    question: "What are the ruling gradient limits for mainline railways and heavy freight corridors?",
    expectedChunkId: "4-1-gradient",
    expectedSection: "### 4.1 Gradient",
  },
  {
    id: "plan-20",
    question: "What are the minimum curve radii for high-speed rail versus freight sidings?",
    expectedChunkId: "4-2-curves-and-formation",
    expectedSection: "### 4.2 Curves and formation",
  },
  {
    id: "plan-21",
    question: "What siding length and track spacing are needed for intermodal freight corridors and terminals?",
    expectedChunkId: "4-3-freight-corridors-and-terminals",
    expectedSection: "### 4.3 Freight corridors and terminals",
  },

  // ---------------------------------------------------------------------------
  // §5 & §6: Siting, Industrial Clustering & Placement Rules
  // ---------------------------------------------------------------------------
  {
    id: "plan-22",
    question: "Why does the working port migrate downstream over time while the historic city keeps the old site?",
    expectedChunkId: "5-1-the-port-migrates-downstream-the-city-keeps-the-old-site",
    expectedSection: "### 5.1 The port migrates downstream; the city keeps the old site",
  },
  {
    id: "plan-23",
    question: "Why do container ports, heavy industry, and rail terminals cluster together?",
    expectedChunkId: "5-2-why-port-heavy-industry-and-rail-cluster",
    expectedSection: "### 5.2 Why port, heavy industry and rail cluster",
  },
  {
    id: "plan-24",
    question: "Why does an airport obey the opposite siting logic from a maritime port?",
    expectedChunkId: "5-3-the-airport-obeys-the-opposite-logic",
    expectedSection: "### 5.3 The airport obeys the opposite logic",
  },
  {
    id: "plan-25",
    question: "What are the distilled placement rules for water depth, road gradients, and rail slopes?",
    expectedChunkId: "6-placement-rules-distilled",
    expectedSection: "## 6. Placement rules, distilled",
  },
  {
    id: "plan-26",
    question: "What two widely circulated planning figures are actually misconceptions or wrong?",
    expectedChunkId: "7-two-figures-that-circulate-widely-and-are-wrong",
    expectedSection: "## 7. Two figures that circulate widely and are wrong",
  },
  {
    id: "plan-27",
    question: "What changed when these planning rules were applied to this world and what was the impact on plot count?",
    expectedChunkId: "8-applied-to-this-world-what-changed-and-what-it-cost",
    expectedSection: "## 8. Applied to this world — what changed, and what it cost",
  },
  {
    id: "plan-28",
    question: "What is the minimum clearance height for bridges spanning navigable waterways?",
    expectedChunkId: "2-1-depth-what-actually-sets-the-site",
    expectedSection: "### 2.1 Depth — what actually sets the site",
  },
  {
    id: "plan-29",
    question: "What is the difference in runway orientation between primary and crosswind runways?",
    expectedChunkId: "3-2-geometry",
    expectedSection: "### 3.2 Geometry",
  },
  {
    id: "plan-30",
    question: "What is the maximum superelevation and transition curve design for railway tracks?",
    expectedChunkId: "4-2-curves-and-formation",
    expectedSection: "### 4.2 Curves and formation",
  },
];

export const UNANSWERABLE_QUESTIONS = [
  "What is the recommended hyperdrive docking clearance for atmospheric shuttles?",
  "How many fire-breathing dragons can be zoned per residential acre?",
  "What is the secret recipe for double chocolate brownies in the city hall cafeteria?",
  "How does quantum entanglement stabilize high-voltage power lines in earthquakes?",
  "What is the catapult reload velocity and counterweight mass for medieval siege towers?",
];
