import { createHash } from "node:crypto";
import {
  VOCAB_BY_MODE,
  computeParagraphMetrics,
  decodeTokensToParagraphText,
  generateParagraphTokenSequence,
} from "../src/engine/proceduralTextEngine";
import { cubeSpan, extendRowBreaks } from "../src/engine/cubeEngine";
import { estimateCharsPerLine } from "../src/engine/virtualizationEngine";
import {
  PARA_METRIC_BUFFER_SIZE,
  PARA_METRIC_SEED,
  PARA_METRIC_SENTENCE_COUNT,
  PARA_METRIC_WORD_COUNT,
  TextStyleMode,
} from "../src/types";

const GOLDEN_HASH = "db5fc37fb604a88afdd1e22a4fb7f4ca48486f0169b2ae07b1c1bc22025a649c";

const sha = createHash("sha256");
const u32 = new DataView(new ArrayBuffer(4));
const feedU32 = (v: number): void => {
  u32.setUint32(0, v, true);
  sha.update(new Uint8Array(u32.buffer));
};
const feedBytes = (b: Uint8Array): void => {
  feedU32(b.byteLength);
  sha.update(b);
};

const SCRATCH_TOKENS = new Uint16Array(512);
const SCRATCH_METRICS = new Uint32Array(PARA_METRIC_BUFFER_SIZE);

const PARAS = 2000;
for (let m = 0; m < 4; m++) {
  for (let i = 0; i < PARAS; i++) {
    const n = generateParagraphTokenSequence(
      i,
      m as TextStyleMode,
      SCRATCH_TOKENS,
    );
    feedU32(n);
    sha.update(new Uint8Array(SCRATCH_TOKENS.buffer, 0, n * 2));
    feedBytes(
      Buffer.from(
        decodeTokensToParagraphText(SCRATCH_TOKENS, n, m as TextStyleMode),
        "utf8",
      ),
    );
  }
}

const METRICS_N = 100000;
for (let i = 0; i < METRICS_N; i++) {
  computeParagraphMetrics(i, SCRATCH_METRICS);
  feedU32(SCRATCH_METRICS[PARA_METRIC_SEED]);
  feedU32(SCRATCH_METRICS[PARA_METRIC_WORD_COUNT]);
  feedU32(SCRATCH_METRICS[PARA_METRIC_SENTENCE_COUNT]);
}

const SPAN_COLS = [2, 3, 4, 6] as const;
for (const cols of SPAN_COLS) {
  const breaks: number[] = [0];
  extendRowBreaks(breaks, 0, 10000, cols);
  feedU32(breaks.length);
  for (let i = 0; i < 10000; i++) {
    sha.update(new Uint8Array([cubeSpan(i, i % cols, cols)]));
  }
}

for (const vocab of VOCAB_BY_MODE) feedU32(vocab.length);
for (let w = 240; w <= 1920; w += 137) feedU32(estimateCharsPerLine(w));

const digest = sha.digest("hex");
if (process.argv.includes("--print-hash")) {
  console.log(digest);
} else if (digest !== GOLDEN_HASH) {
  console.error(`golden: MISMATCH expected ${GOLDEN_HASH} got ${digest}`);
  process.exit(1);
} else {
  console.log(`golden: OK ${digest}`);
}