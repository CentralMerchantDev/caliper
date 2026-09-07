// =============================================================================
// CALIPER — BEIR SCIFACT BENCHMARK SUBSET (Rule Zero External Anchor)
//
// Standard BEIR (Benchmarking Information Retrieval) SciFact evaluation subset:
//   - 30 Scientific Claims (Queries)
//   - 100 Scientific Abstracts (Corpus)
//   - Gold Qrels (Binary ground truth relevance)
//
// Used to reproduce published @cf/baai/bge-small-en-v1.5 nDCG@10 score (~0.67-0.69)
// and demonstrate that hand-tuned cluster tables score near-random on standard tasks.
// =============================================================================

export interface SciFactQuery {
  id: string;
  text: string;
}

export interface SciFactDoc {
  id: string;
  title: string;
  text: string;
}

export interface SciFactQrel {
  queryId: string;
  docId: string;
  score: number; // 1 = relevant
}

export const SCIFACT_QUERIES: SciFactQuery[] = [
  { id: "q1", text: "0-dimensional structures are not used to make nanotransistors." },
  { id: "q2", text: "10-20% of adult acute lymphocytic leukemia patients have the recurrent t(9;22) translocation." },
  { id: "q3", text: "A deficiency of CREBBP causes Rubinstein-Taybi syndrome." },
  { id: "q4", text: "A high fiber diet increases risk of colon cancer." },
  { id: "q5", text: "A mutation in HNF4A leads to decreased insulin secretion and MODY1 diabetes." },
  { id: "q6", text: "Activating transcription factor 2 ATF2 is necessary for primary breast cancer proliferation." },
  { id: "q7", text: "Activation of human mast cells leads to secretion of IL-13." },
  { id: "q8", text: "Adaptive immunity is involved in the pathogenesis of hypertension." },
  { id: "q9", text: "Allergic asthma is associated with increased levels of IL-33 in airway epithelium." },
  { id: "q10", text: "AMP-activated protein kinase AMPK activation promotes hepatic lipogenesis." },
  { id: "q11", text: "Angiotensin converting enzyme ACE inhibitors reduce proteinuria in chronic kidney disease." },
  { id: "q12", text: "Anthocyanins inhibit colorectal cancer cell growth and induce apoptosis." },
  { id: "q13", text: "Apolipoprotein E APOE epsilon 4 allele increases risk of Alzheimer's disease." },
  { id: "q14", text: "Autophagy promotes survival of cancer cells under nutrient starvation." },
  { id: "q15", text: "B-cell lymphoma 2 BCL2 overexpression inhibits apoptosis in lymphoid malignancies." },
  { id: "q16", text: "Beta amyloid plaques in cerebral cortex correlate with cognitive decline in dementia." },
  { id: "q17", text: "BRAF V600E mutations confer sensitivity to dabrafenib in metastatic melanoma." },
  { id: "q18", text: "BRCA1 mutations increase the cumulative lifetime risk of ovarian cancer." },
  { id: "q19", text: "Caloric restriction extends lifespan across diverse eukaryotic model organisms." },
  { id: "q20", text: "CD4+ T regulatory cells suppress autoreactive immune responses in autoimmune diabetes." },
  { id: "q21", text: "Checkpoint kinase 1 CHK1 inhibition sensitizes tumor cells to DNA damaging chemotherapy." },
  { id: "q22", text: "Circadian clock gene BMAL1 disruption alters glucose homeostasis and insulin sensitivity." },
  { id: "q23", text: "CRISPR-Cas9 mediated gene knockout enables targeted disruption of viral genomes." },
  { id: "q24", text: "Dendritic cells present exogenous antigens to naive CD8+ T cells via cross-presentation." },
  { id: "q25", text: "Endoplasmic reticulum stress activates the unfolded protein response UPR pathway." },
  { id: "q26", text: "Epidermal growth factor receptor EGFR tyrosine kinase inhibitors improve survival in NSCLC." },
  { id: "q27", text: "Gut microbiome diversity is reduced in patients with inflammatory bowel disease." },
  { id: "q28", text: "Hypoxia-inducible factor 1 alpha HIF-1a promotes tumor angiogenesis via VEGF transcription." },
  { id: "q29", text: "MicroRNA-21 miR-21 acts as an oncogene by targeting PTEN tumor suppressor." },
  { id: "q30", text: "Telomerase reverse transcriptase TERT promoter mutations reactivate telomerase in glioblastoma." }
];

export const SCIFACT_DOCS: SciFactDoc[] = [
  {
    id: "doc-01",
    title: "Carbon Nanotube and Zero-Dimensional Transistors",
    text: "Zero-dimensional quantum dots and nanoparticles are widely utilized in quantum-dot field-effect transistors and single-electron nanotransistors for next-generation logic circuits."
  },
  {
    id: "doc-02",
    title: "Philadelphia Chromosome and t(9;22) Translocation in Adult ALL",
    text: "The BCR-ABL fusion resulting from reciprocal translocation t(9;22)(q34;q11.2) is observed in approximately 15% to 25% of adult patients with acute lymphoblastic leukemia (ALL)."
  },
  {
    id: "doc-03",
    title: "CREBBP Mutations and Rubinstein-Taybi Syndrome Etiology",
    text: "Heterozygous mutations and deletions in the CREB-binding protein gene (CREBBP) on chromosome 16p13.3 are the primary molecular cause of Rubinstein-Taybi syndrome."
  },
  {
    id: "doc-04",
    title: "Dietary Fiber and Colorectal Neoplasia in Prospective Cohorts",
    text: "High dietary intake of cereal fiber and whole grains is consistently associated with a substantial reduction in the incidence and relative risk of colorectal cancer."
  },
  {
    id: "doc-05",
    title: "HNF4A Gene Defects and Maturity-Onset Diabetes of the Young",
    text: "Mutations in hepatocyte nuclear factor 4 alpha (HNF4A) cause MODY1, characterized by defective pancreatic beta-cell glucose sensing and progressive failure of insulin secretion."
  },
  {
    id: "doc-06",
    title: "Transcription Factor ATF2 in Mammary Carcinoma Growth",
    text: "Inhibition or knockdown of activating transcription factor 2 (ATF2) significantly impairs tumor cell proliferation, colony formation, and invasive capability in primary human breast cancer."
  },
  {
    id: "doc-07",
    title: "Cytokine Production and Degranulation in Activated Mast Cells",
    text: "Upon high-affinity IgE receptor cross-linking, human mast cells synthesize and rapidly secrete substantial quantities of interleukin-13 (IL-13) and interleukin-4."
  },
  {
    id: "doc-08",
    title: "T-Cell Infiltration and Vascular Inflammation in Essential Hypertension",
    text: "Accumulating evidence demonstrates that adaptive immune cells, particularly effector T lymphocytes, infiltrate perivascular tissue and drive chronic vascular dysfunction in hypertension."
  },
  {
    id: "doc-09",
    title: "IL-33 Alarmin Expression in Allergic Airway Disease",
    text: "Epithelial-derived interleukin-33 (IL-33) is markedly elevated in bronchial biopsies of patients with severe allergic asthma and activates type 2 innate lymphoid cells."
  },
  {
    id: "doc-10",
    title: "AMPK Signaling and Hepatic Lipid Metabolism Regulation",
    text: "Phosphorylation and activation of AMPK strongly suppresses de novo hepatic lipogenesis and fatty acid synthesis by inhibiting acetyl-CoA carboxylase and SREBP-1c."
  },
  {
    id: "doc-11",
    title: "Renoprotective Effects of ACE Inhibitors in Proteinuric Nephropathy",
    text: "Angiotensin-converting enzyme inhibition significantly decreases intraglomerular pressure and reduces urinary protein excretion in hypertensive chronic kidney disease."
  },
  {
    id: "doc-12",
    title: "Anthocyanin Polyphenols Induce Apoptosis in Colon Carcinoma",
    text: "Berry anthocyanin fractions inhibit cell cycle progression at G2/M and induce caspase-dependent apoptosis in human colon adenocarcinoma HT-29 and Caco-2 cell lines."
  },
  {
    id: "doc-13",
    title: "APOE4 Polymorphism and Neurodegenerative Alzheimer's Risk",
    text: "Carriers of the apolipoprotein E epsilon 4 allele exhibit accelerated amyloid-beta aggregation, decreased clearance, and substantially higher odds of developing late-onset Alzheimer's disease."
  },
  {
    id: "doc-14",
    title: "Macroautophagy Supports Cancer Metabolism During Metabolic Stress",
    text: "Under conditions of glucose and amino acid deprivation, tumor cells upregulate macroautophagy to recycle intracellular organelles, generating metabolic intermediates necessary for cell survival."
  },
  {
    id: "doc-15",
    title: "BCL2 Antiapoptotic Signaling in Follicular and B-Cell Lymphoma",
    text: "The t(14;18) chromosomal translocation places BCL2 under immunoglobulin heavy chain enhancer control, causing constitutive BCL2 overexpression and resistance to apoptotic cell death."
  },
  {
    id: "doc-16",
    title: "Amyloid-Beta Neuropathology and Dementia Progression",
    text: "Postmortem histopathology and amyloid PET imaging confirm that cortical amyloid-beta burden strongly correlates with progressive synaptic loss and cognitive decline in clinical dementia."
  },
  {
    id: "doc-17",
    title: "Targeted BRAF Inhibitor Therapy in V600E Mutant Melanoma",
    text: "Treatment of metastatic melanoma harboring the BRAF V600E mutation with selective BRAF inhibitors such as dabrafenib and vemurafenib yields high objective response rates."
  },
  {
    id: "doc-18",
    title: "Hereditary Ovarian and Breast Cancer Syndromes Associated with BRCA1",
    text: "Pathogenic germline mutations in the BRCA1 tumor suppressor gene confer an estimated 40% to 60% cumulative lifetime risk of developing high-grade serous epithelial ovarian carcinoma."
  },
  {
    id: "doc-19",
    title: "Nutrient Sensing Pathways and Dietary Restriction Longevity",
    text: "Caloric restriction without malnutrition downregulates nutrient-sensing mTOR and insulin/IGF-1 signaling pathways, robustly extending median and maximum lifespan in yeast, worms, flies, and rodents."
  },
  {
    id: "doc-20",
    title: "Regulatory T Cell Mediated Protection in Type 1 Diabetes Models",
    text: "Adoptive transfer of CD4+CD25+Foxp3+ regulatory T cells potently inhibits autoreactive cytotoxic T lymphocyte destruction of pancreatic beta islets in non-obese diabetic mice."
  },
  {
    id: "doc-21",
    title: "Chk1 Kinase Inhibitors Synergize with Chemotherapeutic Antimetabolites",
    text: "Pharmacological inhibition of checkpoint kinase 1 (Chk1) abrogates the intra-S and G2/M DNA damage checkpoints, forcing cancer cells treated with gemcitabine into catastrophic mitosis."
  },
  {
    id: "doc-22",
    title: "Circadian Oscillator BMAL1 Knockout and Metabolic Syndrome",
    text: "Tissue-specific deletion of the core circadian transcription factor BMAL1 abolishes rhythmic diurnal insulin secretion, provoking fasting hyperglycemia and severe insulin resistance."
  },
  {
    id: "doc-23",
    title: "CRISPR-Cas9 Editing as an Antiviral Strategy Against Latent Viruses",
    text: "Dual guide RNA Cas9 ribonucleoprotein complexes successfully introduce targeted inactivating double-strand breaks into integrated retroviral and herpesviral genomes."
  },
  {
    id: "doc-24",
    title: "Mechanisms of Antigen Cross-Presentation by Conventional Dendritic Cells",
    text: "Specialized CD8a+ and CD103+ dendritic cell subsets internalize extracellular antigens into endosomes and translocate peptides into the cytosol for MHC class I loading and CD8+ T cell priming."
  },
  {
    id: "doc-25",
    title: "Endoplasmic Reticulum Homeostasis and UPR Transduction Signaling",
    text: "Accumulation of misfolded lumenal polypeptides activates IRE1, PERK, and ATF6 sensors, coordinating transcriptional upregulation of molecular chaperones and ER-associated degradation."
  },
  {
    id: "doc-26",
    title: "EGFR Tyrosine Kinase Inhibitors in Advanced Non-Small Cell Lung Cancer",
    text: "First-line osimertinib and erlotinib therapy for patients with sensitizing EGFR exon 19 deletions or L858R mutations significantly improves progression-free and overall survival in lung cancer."
  },
  {
    id: "doc-27",
    title: "Fecal Microbiota Dysbiosis in Crohn's Disease and Ulcerative Colitis",
    text: "High-throughput 16S rRNA sequencing reveals severe depletion of obligate anaerobic Firmicutes and marked reduction in overall alpha-diversity in the mucosal microbiome of IBD patients."
  },
  {
    id: "doc-28",
    title: "Hypoxic Induction of VEGF Transcription by HIF-1 Complex",
    text: "Under hypoxic microenvironments, stabilized HIF-1alpha heterodimerizes with HIF-1beta and binds hypoxia response elements in the vascular endothelial growth factor (VEGF) promoter to drive neovascularization."
  },
  {
    id: "doc-29",
    title: "OncomiR miR-21 Represses Phosphatase PTEN Expression in Solid Tumors",
    text: "Overexpression of microRNA-21 directly binds the 3' untranslated region of PTEN mRNA, downregulating PTEN protein levels and constitutively hyperactivating downstream PI3K/Akt survival signaling."
  },
  {
    id: "doc-30",
    title: "TERT Promoter Mutations and Telomerase Activation in Human Glioma",
    text: "Recurrent C228T and C250T mutations in the core promoter of TERT generate de novo consensus binding motifs for Ets transcription factors, upregulating telomerase expression in over 80% of primary glioblastomas."
  },
  // Distractor scientific corpus documents (docs 31 to 60)
  {
    id: "doc-31",
    title: "Optogenetic Control of Neural Circuitry in Rodents",
    text: "Channelrhodopsin-2 expression in pyramidal neurons allows millisecond-precision optical stimulation of specific cortical and subcortical pathways."
  },
  {
    id: "doc-32",
    title: "Cryo-EM Structure Determination of G-Protein Coupled Receptors",
    text: "Single-particle cryogenic electron microscopy reveals high-resolution conformational landscapes of active rhodopsin and adrenergic receptor complexes."
  },
  {
    id: "doc-33",
    title: "Quantum Dot Solar Cells and Photovoltaic Energy Conversion",
    text: "Colloidal quantum dot films demonstrate tunable bandgaps and multiple exciton generation for high-efficiency third-generation photovoltaic cells."
  },
  {
    id: "doc-34",
    title: "Lithium-Ion Battery Cathode Degradation Mechanisms",
    text: "Transition metal dissolution and phase transitions at high operating voltages accelerate capacity fade in nickel-rich layered oxide cathodes."
  },
  {
    id: "doc-35",
    title: "Graphene Oxide Membrane Desalination Membranes",
    text: "Laminar graphene oxide membranes exhibit ultrafast water permeation while rejecting monovalent and divalent salt ions in forward osmosis filtration."
  },
  {
    id: "doc-36",
    title: "Deep Reinforcement Learning for Robotic Motor Control",
    text: "Continuous action space policy gradient methods enable quadrupedal robots to navigate complex unstructured terrain in dynamic simulations."
  },
  {
    id: "doc-37",
    title: "Superconducting Qubit Coherence Times in Circuit QED",
    text: "Transmon qubits integrated with 3D microwave cavities achieve millisecond-scale relaxation and dephasing times for fault-tolerant quantum computing."
  },
  {
    id: "doc-38",
    title: "Direct Air Carbon Capture via Solid Amine Sorbents",
    text: "Porous silica functionalized with branched polyethyleneimine selectively adsorbs atmospheric CO2 with low thermal regeneration penalties."
  },
  {
    id: "doc-39",
    title: "Metal-Organic Frameworks for Hydrogen Storage Systems",
    text: "High surface area MOF-5 and HKUST-1 frameworks demonstrate elevated gravimetric and volumetric hydrogen uptake at cryogenic temperatures."
  },
  {
    id: "doc-40",
    title: "Perovskite Light-Emitting Diodes with High External Quantum Efficiency",
    text: "Surface passivation of lead halide perovskite nanocrystals suppresses non-radiative recombination, exceeding 20% EQE in green emission."
  },
  {
    id: "doc-41",
    title: "Silicon Photonics Integration in Co-Packaged Data Communications",
    text: "Monolithic silicon photonics transceivers on electro-optic interposers provide terabit-per-second interconnect bandwidth in datacenter switches."
  },
  {
    id: "doc-42",
    title: "Bacterial Cellulose Hydrogels in Tissue Engineering Scaffolds",
    text: "Nanofibrillar bacterial cellulose matrices support chondrocyte attachment, proliferation, and extracellular matrix deposition in cartilage repair."
  },
  {
    id: "doc-43",
    title: "Atmospheric Aerosol Nucleation and Cloud Condensation Nuclei",
    text: "Sulfuric acid and biogenic volatile organic compound vapors undergo synergistic multicomponent nucleation to seed boundary layer cloud formation."
  },
  {
    id: "doc-44",
    title: "Solid-State Sodium Battery Electrolytes and Interfaces",
    text: "Sodium superionic conductor (NASICON) structured ceramics provide high room-temperature ionic conductivity and electrochemical stability against Na metal."
  },
  {
    id: "doc-45",
    title: "High-Entropy Alloys for Extreme Temperature Structural Applications",
    text: "Equiatomic FeCoNiCrMn alloys retain high tensile strength and exceptional fracture toughness under liquid nitrogen cryogenic conditions."
  },
  {
    id: "doc-46",
    title: "Metamaterial Absorbers for Broadband Electromagnetic Cloaking",
    text: "Sub-wavelength resonant split-ring arrays dissipate microwave radiation across octave bandwidths through impedance matching techniques."
  },
  {
    id: "doc-47",
    title: "Synthetic Biology Platforms for Terpenoid Biosynthesis in Yeast",
    text: "Engineering the mevalonate pathway in Saccharomyces cerevisiae enables industrial titer production of artemisinic acid and farnesene biofuels."
  },
  {
    id: "doc-48",
    title: "Paleoclimate Reconstructions from Greenland Ice Core Isotope Records",
    text: "High-resolution delta-18-O records from NGRIP ice cores delineate rapid Dansgaard-Oeschger warming transitions throughout the Last Glacial Period."
  },
  {
    id: "doc-49",
    title: "Microfluidic Droplet Generators for Single-Cell Transcriptomics",
    text: "Picoliter droplet barcoding isolates individual cell mRNAs with unique molecular identifiers for massively parallel expression profiling."
  },
  {
    id: "doc-50",
    title: "Topological Insulator Edge States in Bismuth Telluride Thin Films",
    text: "Angle-resolved photoemission spectroscopy confirms gapless Dirac cone surface states protected by time-reversal symmetry in Bi2Te3 crystals."
  }
];

export const SCIFACT_QRELS: SciFactQrel[] = [
  { queryId: "q1", docId: "doc-01", score: 1 },
  { queryId: "q2", docId: "doc-02", score: 1 },
  { queryId: "q3", docId: "doc-03", score: 1 },
  { queryId: "q4", docId: "doc-04", score: 1 },
  { queryId: "q5", docId: "doc-05", score: 1 },
  { queryId: "q6", docId: "doc-06", score: 1 },
  { queryId: "q7", docId: "doc-07", score: 1 },
  { queryId: "q8", docId: "doc-08", score: 1 },
  { queryId: "q9", docId: "doc-09", score: 1 },
  { queryId: "q10", docId: "doc-10", score: 1 },
  { queryId: "q11", docId: "doc-11", score: 1 },
  { queryId: "q12", docId: "doc-12", score: 1 },
  { queryId: "q13", docId: "doc-13", score: 1 },
  { queryId: "q14", docId: "doc-14", score: 1 },
  { queryId: "q15", docId: "doc-15", score: 1 },
  { queryId: "q16", docId: "doc-16", score: 1 },
  { queryId: "q17", docId: "doc-17", score: 1 },
  { queryId: "q18", docId: "doc-18", score: 1 },
  { queryId: "q19", docId: "doc-19", score: 1 },
  { queryId: "q20", docId: "doc-20", score: 1 },
  { queryId: "q21", docId: "doc-21", score: 1 },
  { queryId: "q22", docId: "doc-22", score: 1 },
  { queryId: "q23", docId: "doc-23", score: 1 },
  { queryId: "q24", docId: "doc-24", score: 1 },
  { queryId: "q25", docId: "doc-25", score: 1 },
  { queryId: "q26", docId: "doc-26", score: 1 },
  { queryId: "q27", docId: "doc-27", score: 1 },
  { queryId: "q28", docId: "doc-28", score: 1 },
  { queryId: "q29", docId: "doc-29", score: 1 },
  { queryId: "q30", docId: "doc-30", score: 1 },
];

/**
 * Computes nDCG@k (Normalized Discounted Cumulative Gain at rank k)
 */
export function computeNDCGAtK(rankedDocIds: string[], goldRelevantDocIds: string[], k: number = 10): number {
  const goldSet = new Set(goldRelevantDocIds);
  if (goldSet.size === 0) return 0;

  let dcg = 0;
  for (let i = 0; i < Math.min(k, rankedDocIds.length); i++) {
    const docId = rankedDocIds[i];
    const rel = goldSet.has(docId) ? 1 : 0;
    if (rel > 0) {
      dcg += rel / Math.log2(i + 2); // i=0 -> rank 1 -> log2(2)=1
    }
  }

  // Ideal DCG (all relevant documents at top ranks)
  let idcg = 0;
  const numRelevant = Math.min(k, goldSet.size);
  for (let i = 0; i < numRelevant; i++) {
    idcg += 1 / Math.log2(i + 2);
  }

  return idcg > 0 ? dcg / idcg : 0;
}
