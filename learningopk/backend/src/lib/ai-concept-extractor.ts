/**
 * Lightweight concept extraction module for AI tutor memory.
 *
 * Parses AI responses and user messages to extract discussed concepts
 * and detect signals for weak/strong topic classification.
 *
 * Uses keyword matching only (no separate AI call) for performance.
 */

// ─── Concept Dictionary ─────────────────────────────────────────────
// Common Pakistani 9th/10th grade curriculum terms, organized by subject area.

const MATH_CONCEPTS = [
  "algebra", "quadratic equations", "linear equations", "simultaneous equations",
  "matrices", "determinants", "polynomials", "factoring", "factorization",
  "logarithms", "logarithm", "exponents", "indices", "surds",
  "trigonometry", "trigonometric", "pythagorean theorem", "sine", "cosine", "tangent",
  "geometry", "congruence", "similarity", "circles", "triangles", "parallel lines",
  "coordinate geometry", "distance formula", "midpoint", "slope",
  "sets", "subsets", "union", "intersection", "venn diagram",
  "sequences", "arithmetic progression", "geometric progression", "series",
  "calculus", "differentiation", "integration", "limits",
  "probability", "statistics", "mean", "median", "mode", "standard deviation",
  "ratio", "proportion", "percentage", "profit and loss",
  "mensuration", "area", "volume", "surface area",
  "number system", "real numbers", "rational numbers", "irrational numbers",
  "functions", "domain", "range", "inverse function",
  "variation", "direct variation", "inverse variation"
];

const PHYSICS_CONCEPTS = [
  "kinematics", "motion", "velocity", "acceleration", "displacement", "speed",
  "newton's laws", "force", "friction", "momentum", "impulse", "inertia",
  "gravitation", "gravitational force", "free fall", "weight",
  "work", "energy", "power", "kinetic energy", "potential energy",
  "simple machines", "lever", "pulley", "inclined plane",
  "waves", "sound", "light", "reflection", "refraction", "diffraction",
  "electrostatics", "electric charge", "coulomb's law", "electric field",
  "current electricity", "ohm's law", "resistance", "circuits", "voltage",
  "magnetism", "magnetic field", "electromagnetic induction",
  "heat", "temperature", "thermal expansion", "specific heat",
  "pressure", "atmospheric pressure", "hydraulics",
  "nuclear physics", "radioactivity", "atomic structure",
  "optics", "lenses", "mirrors", "focal length"
];

const CHEMISTRY_CONCEPTS = [
  "periodic table", "elements", "compounds", "mixtures",
  "atomic structure", "electron configuration", "isotopes", "atomic number",
  "chemical bonding", "ionic bond", "covalent bond", "metallic bond",
  "chemical equations", "balancing equations", "stoichiometry",
  "acids", "bases", "salts", "ph", "neutralization",
  "oxidation", "reduction", "redox reactions",
  "electrochemistry", "electrolysis", "electroplating",
  "organic chemistry", "hydrocarbons", "functional groups",
  "states of matter", "gas laws", "boyle's law", "charles's law",
  "solutions", "concentration", "solubility", "molarity",
  "metals", "non-metals", "metalloids", "reactivity series",
  "environmental chemistry", "pollution", "greenhouse effect"
];

const BIOLOGY_CONCEPTS = [
  "cell biology", "cell structure", "cell membrane", "nucleus", "mitochondria",
  "photosynthesis", "respiration", "cellular respiration",
  "genetics", "dna", "chromosomes", "genes", "heredity", "mendel",
  "evolution", "natural selection", "adaptation",
  "ecology", "ecosystem", "food chain", "biodiversity",
  "human body", "digestive system", "respiratory system", "circulatory system",
  "nervous system", "endocrine system", "excretory system",
  "reproduction", "mitosis", "meiosis",
  "classification", "taxonomy", "kingdoms",
  "enzymes", "proteins", "carbohydrates", "lipids",
  "microorganisms", "bacteria", "viruses", "fungi",
  "plant biology", "transpiration", "osmosis", "diffusion"
];

const ALL_CONCEPTS: string[] = [
  ...MATH_CONCEPTS,
  ...PHYSICS_CONCEPTS,
  ...CHEMISTRY_CONCEPTS,
  ...BIOLOGY_CONCEPTS
];

// ─── Weak Topic Signal Patterns ─────────────────────────────────────

const WEAK_SIGNAL_PATTERNS: RegExp[] = [
  /i don'?t understand (.+)/i,
  /i'?m confused about (.+)/i,
  /help (?:me )?with (.+)/i,
  /i'?m struggling with (.+)/i,
  /i can'?t (?:figure out|solve|understand|get) (.+)/i,
  /what (?:is|are|does) (.+)\??/i,
  /explain (.+?)(?:\s+(?:to me|please|again))?$/i,
  /i don'?t (?:know|get) (?:how to|what) (.+)/i,
  /having trouble with (.+)/i,
  /(?:still )?(?:confused|stuck) (?:on|with|about) (.+)/i
];

// ─── Strong Topic Signal Patterns ───────────────────────────────────

const STRONG_SIGNAL_PATTERNS: RegExp[] = [
  /i (?:understand|got it|get it)(?: now)?/i,
  /(?:that |this )?makes sense(?: now)?/i,
  /oh,? i see/i,
  /thanks?,? (?:i|that) (?:understand|get it|makes sense)/i,
  /now i (?:understand|get it|know)/i
];

// ─── Extraction Functions ───────────────────────────────────────────

/**
 * Extract concepts mentioned in a text by matching against the curriculum dictionary.
 */
export function extractConcepts(text: string): string[] {
  const lowerText = text.toLowerCase();
  const found: string[] = [];

  for (const concept of ALL_CONCEPTS) {
    if (lowerText.includes(concept)) {
      found.push(concept);
    }
  }

  // Deduplicate (in case of overlapping terms)
  return [...new Set(found)];
}

/**
 * Detect if a user message signals they're struggling with a topic.
 * Returns the extracted topic phrases (raw — may need further matching to concepts).
 */
export function detectWeakSignals(userMessage: string): string[] {
  const weakPhrases: string[] = [];

  for (const pattern of WEAK_SIGNAL_PATTERNS) {
    const match = pattern.exec(userMessage);
    if (match?.[1]) {
      weakPhrases.push(match[1].trim().toLowerCase());
    }
  }

  return weakPhrases;
}

/**
 * Detect if a user message signals understanding (strong topic signal).
 */
export function detectStrongSignal(userMessage: string): boolean {
  return STRONG_SIGNAL_PATTERNS.some((pattern) => pattern.test(userMessage));
}

/**
 * Match weak signal phrases against the concept dictionary to find actual curriculum concepts.
 */
export function matchPhraseToConcepts(phrase: string): string[] {
  const lowerPhrase = phrase.toLowerCase();
  const matched: string[] = [];

  for (const concept of ALL_CONCEPTS) {
    if (lowerPhrase.includes(concept) || concept.includes(lowerPhrase)) {
      matched.push(concept);
    }
  }

  return matched;
}

export type ConceptExtractionResult = {
  /** Concepts found in the conversation text (both user and AI messages). */
  conceptsDiscussed: string[];
  /** Topics the user appears to struggle with (from user message signals). */
  weakTopicCandidates: string[];
  /** Whether the user signaled understanding (potential to promote from weak → strong). */
  hasStrongSignal: boolean;
};

/**
 * Full concept extraction pipeline for a single AI chat turn.
 *
 * @param userMessage - The user's message text
 * @param assistantResponse - The AI's response text
 */
export function extractConversationConcepts(
  userMessage: string,
  assistantResponse: string
): ConceptExtractionResult {
  // 1. Extract concepts mentioned in both messages
  const userConcepts = extractConcepts(userMessage);
  const assistantConcepts = extractConcepts(assistantResponse);
  const conceptsDiscussed = [...new Set([...userConcepts, ...assistantConcepts])];

  // 2. Detect weak signals from user message
  const weakPhrases = detectWeakSignals(userMessage);
  const weakTopicCandidates: string[] = [];

  for (const phrase of weakPhrases) {
    const matchedConcepts = matchPhraseToConcepts(phrase);
    if (matchedConcepts.length > 0) {
      weakTopicCandidates.push(...matchedConcepts);
    } else {
      // If no exact concept match, use the phrase itself (trimmed)
      const cleanPhrase = phrase.replace(/[^a-z0-9\s'-]/g, "").trim();
      if (cleanPhrase.length > 2 && cleanPhrase.length < 100) {
        weakTopicCandidates.push(cleanPhrase);
      }
    }
  }

  // 3. Detect strong signal
  const hasStrongSignal = detectStrongSignal(userMessage);

  return {
    conceptsDiscussed,
    weakTopicCandidates: [...new Set(weakTopicCandidates)],
    hasStrongSignal
  };
}
