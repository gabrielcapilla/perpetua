import {
  PARA_METRIC_BUFFER_SIZE,
  PARA_METRIC_SEED,
  PARA_METRIC_SENTENCE_COUNT,
  PARA_METRIC_WORD_COUNT,
  TextStyleMode,
} from "../types";

export const VOCABULARY_LOREM: readonly string[] = Object.freeze([
  "lorem",
  "ipsum",
  "dolor",
  "sit",
  "amet",
  "consectetur",
  "adipiscing",
  "elit",
  "sed",
  "do",
  "eiusmod",
  "tempor",
  "incididunt",
  "ut",
  "labore",
  "et",
  "dolore",
  "magna",
  "aliqua",
  "enim",
  "ad",
  "minim",
  "veniam",
  "quis",
  "nostrud",
  "exercitation",
  "ullamco",
  "laboris",
  "nisi",
  "aliquip",
  "ex",
  "ea",
  "commodo",
  "consequat",
  "duis",
  "aute",
  "irure",
  "in",
  "reprehenderit",
  "voluptate",
  "velit",
  "esse",
  "cillum",
  "eu",
  "fugiat",
  "nulla",
  "pariatur",
  "excepteur",
  "sint",
  "occaecat",
  "cupidatat",
  "non",
  "proident",
  "sunt",
  "culpa",
  "qui",
  "officia",
  "deserunt",
  "mollit",
  "anim",
  "id",
  "est",
  "laborum",
  "augue",
  "mauris",
  "cursus",
  "mattis",
  "molestie",
  "iaculis",
  "urna",
  "faucibus",
  "ornare",
  "arcu",
  "odio",
  "viverra",
  "varius",
  "consequat",
  "pharetra",
  "fermentum",
  "accumsan",
  "pretium",
  "viverra",
  "suspendisse",
  "potenti",
  "vulputate",
  "sollicitudin",
  "ligula",
  "massa",
]);

export const VOCABULARY_PHYSICS: readonly string[] = Object.freeze([
  "quantum",
  "tensor",
  "entropy",
  "hamiltonian",
  "lagrangian",
  "vector",
  "manifold",
  "eigenvalue",
  "trajectory",
  "photon",
  "wavefunction",
  "spin",
  "coherence",
  "metric",
  "gravitational",
  "singularity",
  "continuum",
  "supersymmetry",
  "fermion",
  "boson",
  "relativistic",
  "lorentz",
  "flux",
  "fluctuation",
  "thermodynamic",
  "phase-space",
  "angular",
  "momentum",
  "superposition",
  "entanglement",
  "gauge",
  "symmetry",
  "invariant",
  "propagator",
  "perturbation",
  "asymptotic",
  "divergence",
  "renormalization",
  "field",
  "topology",
  "curvature",
  "geodesic",
  "spacetime",
  "stochastic",
  "operator",
  "hilbert",
]);

export const VOCABULARY_KERNEL: readonly string[] = Object.freeze([
  "0x7ffe",
  "PAGE_FAULT",
  "V8_HOT_LOOP",
  "REGISTER_RAX",
  "CACHE_L1",
  "MEM_OFFSET",
  "MMU_TRANSLATION",
  "TLB_HIT",
  "INTR_VECTOR_0x20",
  "SCHED_YIELD",
  "SPINLOCK_ACQUIRE",
  "ATOMIC_CAS",
  "DMA_CHANNEL_4",
  "RING_BUFFER_HEAD",
  "PREFETCH_T0",
  "BARRIER_FULL",
  "SOCKET_RX_BURST",
  "ZERO_ALLOC",
  "MONOMORPHIC_IC",
  "HIDDEN_CLASS_STABLE",
  "FLAT_SOA",
  "TYPED_ARRAY_MAPPED",
  "ALIGN_64_BYTE",
  "NUMERIC_PRNG_XOR",
  "FRAME_TICK_HZ",
]);

export const VOCABULARY_PHILOSOPHY: readonly string[] = Object.freeze([
  "epistemic",
  "dialectic",
  "phenomenology",
  "ontology",
  "teleological",
  "hermeneutic",
  "transcendental",
  "categorical",
  "imperative",
  "existential",
  "noumenon",
  "praxis",
  "hegemony",
  "rationalism",
  "empiricism",
  "determinism",
  "consciousness",
  "qualia",
  "synthetic",
  "a-priori",
  "axiom",
  "postulate",
  "syllogism",
  "zeitgeist",
  "paradigm",
]);

export const LINE_HEIGHT_PX = 29.25;
export const AVG_CHARS_PER_WORD = 6.1;
export const PARA_BOTTOM_MARGIN_PX = 32;

const SCRATCH_METRICS = new Uint32Array(PARA_METRIC_BUFFER_SIZE);

export const VOCAB_BY_MODE: readonly (readonly string[])[] = Object.freeze([
  VOCABULARY_LOREM,
  VOCABULARY_PHYSICS,
  VOCABULARY_KERNEL,
  VOCABULARY_PHILOSOPHY,
]);

const TOKEN_INDEX_CAPACITY = 1 << 10;
for (const vocab of VOCAB_BY_MODE) {
  if (vocab.length === 0 || vocab.length > TOKEN_INDEX_CAPACITY) {
    throw new Error("vocabulary outside 10-bit token field capacity");
  }
}

export function estimateParagraphHeight(
  paraIndex: number,
  charsPerLine: number,
): number {
  computeParagraphMetrics(paraIndex, SCRATCH_METRICS);
  const words = SCRATCH_METRICS[PARA_METRIC_WORD_COUNT];
  const lines = Math.ceil((words * AVG_CHARS_PER_WORD) / charsPerLine);
  return lines * LINE_HEIGHT_PX + PARA_BOTTOM_MARGIN_PX;
}

export function xorShift32(seed: number): number {
  let x = seed >>> 0;
  x = (x ^ (x << 13)) >>> 0;
  x = (x ^ (x >>> 17)) >>> 0;
  x = (x ^ (x << 5)) >>> 0;
  return x >>> 0;
}

export function computeParagraphMetrics(
  paraIndex: number,
  outBuffer: Uint32Array,
): void {
  if (outBuffer.length < PARA_METRIC_BUFFER_SIZE) {
    throw new RangeError("metrics buffer smaller than PARA_METRIC_BUFFER_SIZE");
  }
  let h = (paraIndex ^ 0xdeadbeef) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;

  outBuffer[PARA_METRIC_SEED] = h;
  outBuffer[PARA_METRIC_WORD_COUNT] = 40 + ((h >>> 8) % 70);

  const sentenceTarget = 7 + (h % 10);
  const sentenceCount = Math.ceil(
    outBuffer[PARA_METRIC_WORD_COUNT] / sentenceTarget,
  );
  outBuffer[PARA_METRIC_SENTENCE_COUNT] = sentenceCount;
}

export function generateParagraphTokenSequence(
  paraIndex: number,
  styleMode: TextStyleMode,
  targetTokenBuffer: Uint16Array,
): number {
  computeParagraphMetrics(paraIndex, SCRATCH_METRICS);

  let prng = SCRATCH_METRICS[PARA_METRIC_SEED];
  const wordCount = SCRATCH_METRICS[PARA_METRIC_WORD_COUNT];
  const vocabLength = VOCAB_BY_MODE[styleMode].length;

  if (targetTokenBuffer.length < wordCount) {
    throw new RangeError(
      "token buffer smaller than paragraph wordCount (silent truncation is impossible)",
    );
  }

  let tokensWritten = 0;
  let wordsInCurrentSentence = 0;
  const sentenceTarget = 7 + (prng % 10);

  for (let i = 0; i < wordCount; i++) {
    prng = xorShift32(prng);
    const tokenIndex = (prng % vocabLength) & 0x03ff;

    const isSentenceStart = wordsInCurrentSentence === 0;
    const nextWords = wordsInCurrentSentence + 1;
    const isSentenceEnd = nextWords >= sentenceTarget || i === wordCount - 1;
    const isComma = !isSentenceEnd && nextWords > 3 && (prng & 0x07) === 0;

    const flags =
      (isSentenceStart ? 0x0400 : 0) |
      (isSentenceEnd ? 0x1000 : 0) |
      (isComma ? 0x0800 : 0);

    targetTokenBuffer[tokensWritten++] = tokenIndex | flags;
    wordsInCurrentSentence = isSentenceEnd ? 0 : nextWords;
  }

  return tokensWritten;
}

export function decodeTokensToParagraphText(
  tokenBuffer: Uint16Array,
  tokenCount: number,
  styleMode: TextStyleMode,
): string {
  const vocab = VOCAB_BY_MODE[styleMode];
  let result = "";

  for (let i = 0; i < tokenCount; i++) {
    const raw = tokenBuffer[i];
    const vocabIdx = raw & 0x03ff;
    const isCapitalize = (raw & 0x0400) !== 0;
    const hasComma = (raw & 0x0800) !== 0;
    const hasPeriod = (raw & 0x1000) !== 0;

    let word = vocab[vocabIdx % vocab.length] || "lorem";
    if (isCapitalize && word.length > 0) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }

    if (i > 0) result += " ";
    result += word;

    if (hasComma) result += ",";
    if (hasPeriod) result += ".";
  }

  return result;
}
