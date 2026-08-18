import {
  xorShift32,
  computeParagraphMetrics,
  generateParagraphTokenSequence,
  decodeTokensToParagraphText,
} from "../src/engine/proceduralTextEngine";
import {
  generateCubeBuffer,
  extendRowBreaks,
  isCubeWide,
  cubeSpan,
} from "../src/engine/cubeEngine";
import {
  CUBE_STRIDE_WORDS,
  CUBE_FIELD_SEED,
  CUBE_FIELD_VALUE,
  CUBE_FIELD_PACKED_META,
  CUBE_FIELD_INDEX,
  TextStyleMode,
} from "../src/types";
import {
  LAYOUT_END,
  LAYOUT_FIELD_COUNT,
  LAYOUT_FIRST_VISIBLE,
  LAYOUT_START,
  LAYOUT_START_OFFSET,
  computeCubeWindow,
  computeTextWindow,
  estimateCharsPerLine,
  sumHeights,
} from "../src/engine/virtualizationEngine";

const gc: () => void = (globalThis as { gc?: () => void }).gc ?? (() => {});

function bench(name: string, iters: number, fn: () => void): void {
  for (let i = 0; i < Math.min(iters, 10000); i++) fn();
  const samples: number[] = [];
  for (let s = 0; s < 3; s++) {
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < iters; i++) fn();
    const t1 = process.hrtime.bigint();
    samples.push(Number(t1 - t0) / 1e6);
  }
  samples.sort((a, b) => a - b);
  const ms = samples[0];
  const opsPerSec = (iters / ms) * 1000;
  console.log(
    `${name.padEnd(52)} ${String(iters).padStart(9)} iters  ${ms.toFixed(1).padStart(8)} ms  ${Math.round(opsPerSec).toLocaleString("en-US").padStart(12)} ops/s`,
  );
}

function allocDelta(name: string, fn: () => void): void {
  gc();
  const before = process.memoryUsage().heapUsed;
  fn();
  gc();
  const after = process.memoryUsage().heapUsed;
  const delta = (after - before) / 1024;
  console.log(
    `${name.padEnd(52)} heap delta after GC: ${delta.toFixed(1).padStart(8)} KB`,
  );
}

const DERIVE_FIELD_VALUE = 0;
const DERIVE_FIELD_COLOR = 1;
const DERIVE_FIELD_LABEL = 2;
const DERIVE_FIELD_SPAN = 3;
const DERIVE_FIELD_HEX_LOW = 4;
const DERIVE_FIELD_COUNT = 5;

function deriveCubeMetrics(
  buffer: Uint32Array,
  count: number,
  out: Uint32Array,
): void {
  for (let i = 0; i < count; i++) {
    const offset = i * CUBE_STRIDE_WORDS;
    const seed = buffer[offset + CUBE_FIELD_SEED];
    const value = buffer[offset + CUBE_FIELD_VALUE];
    const packedMeta = buffer[offset + CUBE_FIELD_PACKED_META];
    const idx = buffer[offset + CUBE_FIELD_INDEX];
    const o = i * DERIVE_FIELD_COUNT;
    out[o + DERIVE_FIELD_VALUE] = value;
    out[o + DERIVE_FIELD_COLOR] = packedMeta & 0xff;
    out[o + DERIVE_FIELD_LABEL] = (packedMeta >>> 16) & 0xff;
    out[o + DERIVE_FIELD_SPAN] = cubeSpan(idx, 0, 6);
    out[o + DERIVE_FIELD_HEX_LOW] = seed & 0xffff;
  }
}

const scratchTokens = new Uint16Array(512);
const scratchMetrics = new Uint32Array(20);
const scratchCubes = new Uint32Array(60 * CUBE_STRIDE_WORDS);
const scratchDerived = new Uint32Array(60 * DERIVE_FIELD_COUNT);
const scratchLayout = new Float64Array(LAYOUT_FIELD_COUNT);

const synthHeights: number[] = [];
{
  let rng = 424242;
  for (let i = 0; i < 5000; i++) {
    rng = xorShift32(rng);
    synthHeights.push(120 + (rng % 480));
  }
}

const tokenCount = generateParagraphTokenSequence(
  12345,
  TextStyleMode.CLASSIC_LOREM,
  scratchTokens,
);
const sampleText = decodeTokensToParagraphText(
  scratchTokens,
  tokenCount,
  TextStyleMode.CLASSIC_LOREM,
);

if (!process.argv.includes("--profile-heavy")) {
  console.log("=== ENGINE THROUGHPUT (best of 3, V8 JIT-warmed) ===");
  bench("xorShift32", 10_000_000, () => xorShift32(0x9e3779b9));
  bench("computeParagraphMetrics", 2_000_000, () =>
    computeParagraphMetrics(42, scratchMetrics),
  );
  for (const mode of [
    TextStyleMode.CLASSIC_LOREM,
    TextStyleMode.SCIENTIFIC_PHYSICS,
    TextStyleMode.BINARY_KERNEL_LOG,
    TextStyleMode.PHILOSOPHICAL_ESSAY,
  ]) {
    bench(`generateParagraphTokenSequence mode=${mode}`, 500_000, () =>
      generateParagraphTokenSequence(12345, mode, scratchTokens),
    );
  }
  bench("generateCubeBuffer batch=60", 500_000, () =>
    generateCubeBuffer(1000, 60, scratchCubes),
  );

  console.log(
    `sample paragraph: ${sampleText.length} chars, ${tokenCount} tokens`,
  );

  bench("decodeTokensToParagraphText", 200_000, () =>
    decodeTokensToParagraphText(
      scratchTokens,
      tokenCount,
      TextStyleMode.CLASSIC_LOREM,
    ),
  );
  bench("deriveCubeMetrics batch=60 (numeric window path)", 200_000, () =>
    deriveCubeMetrics(scratchCubes, 60, scratchDerived),
  );
  bench(
    "computeTextWindow window=24/overscan=6 (incremental hint)",
    500_000,
    () => {
      computeTextWindow(
        sumHeights(synthHeights, 0, 1000) + 100,
        64,
        synthHeights,
        5000,
        24,
        6,
        1000,
        sumHeights(synthHeights, 0, 1000),
        scratchLayout,
      );
    },
  );
  bench("computeCubeWindow rows=90/rowHeight=152 (O(1))", 5_000_000, () =>
    computeCubeWindow(123456, 760, 90, 152, 32, 2, scratchLayout),
  );
}

if (process.argv.includes("--alloc")) {
  console.log(
    "\n=== ALLOCATION PROFILE (--expose-gc, heapUsed after forced GC) ===",
  );
  allocDelta("xorShift32 x10M", () => {
    for (let i = 0; i < 10_000_000; i++) xorShift32(i);
  });
  allocDelta("computeParagraphMetrics x2M", () => {
    for (let i = 0; i < 2_000_000; i++)
      computeParagraphMetrics(i, scratchMetrics);
  });
  allocDelta("generateParagraphTokenSequence x500k", () => {
    for (let i = 0; i < 500_000; i++)
      generateParagraphTokenSequence(
        i,
        TextStyleMode.CLASSIC_LOREM,
        scratchTokens,
      );
  });
  allocDelta("generateCubeBuffer x500k", () => {
    for (let i = 0; i < 500_000; i++) generateCubeBuffer(i, 60, scratchCubes);
  });
  allocDelta("decodeTokensToParagraphText x200k", () => {
    for (let i = 0; i < 200_000; i++)
      decodeTokensToParagraphText(
        scratchTokens,
        tokenCount,
        TextStyleMode.CLASSIC_LOREM,
      );
  });
  allocDelta("deriveCubeMetrics x200k (numeric)", () => {
    for (let i = 0; i < 200_000; i++)
      deriveCubeMetrics(scratchCubes, 60, scratchDerived);
  });
}

if (process.argv.includes("--session")) {
  console.log(
    "\n=== LONG-SESSION MEMORY SIMULATION (unbounded list baseline) ===",
  );
  const paragraphs: string[] = [];
  const BATCH = 40;
  const BATCHES = 2000;
  const growth: number[] = [];
  for (let b = 0; b < BATCHES; b++) {
    for (let i = 0; i < BATCH; i++) {
      const n = generateParagraphTokenSequence(
        b * BATCH + i,
        TextStyleMode.CLASSIC_LOREM,
        scratchTokens,
      );
      paragraphs.push(
        decodeTokensToParagraphText(
          scratchTokens,
          n,
          TextStyleMode.CLASSIC_LOREM,
        ),
      );
    }
    if ((b + 1) % 200 === 0) {
      gc();
      growth.push(process.memoryUsage().heapUsed / (1024 * 1024));
    }
  }
  gc();
  const totalMb = process.memoryUsage().heapUsed / (1024 * 1024);
  console.log(
    `paragraphs held: ${paragraphs.length} (${BATCHES} batches of ${BATCH})`,
  );
  console.log(
    `heap after GC: ${totalMb.toFixed(1)} MB -> ~${((totalMb / paragraphs.length) * 1000).toFixed(1)} KB/paragraph`,
  );
  console.log(
    `growth samples every 200 batches (MB): ${growth.map((s) => s.toFixed(1)).join(", ")}`,
  );

  const cubeBlock = new Uint32Array(BATCHES * 60 * CUBE_STRIDE_WORDS);
  const deriveBlock = new Uint32Array(BATCHES * 60 * DERIVE_FIELD_COUNT);
  for (let b = 0; b < BATCHES; b++) {
    generateCubeBuffer(
      b * 60,
      60,
      cubeBlock.subarray(b * 60 * CUBE_STRIDE_WORDS),
    );
  }
  deriveCubeMetrics(cubeBlock, BATCHES * 60, deriveBlock);
  gc();
  const cubeMb = process.memoryUsage().heapUsed / (1024 * 1024);
  console.log(
    `cubes held: ${BATCHES * 60} (flat Uint32Array block, ${((BATCHES * 60 * CUBE_STRIDE_WORDS * 4) / 1024 / 1024).toFixed(2)} MB)`,
  );
  console.log(`heap after GC (text + cubes): ${cubeMb.toFixed(1)} MB`);
}

if (process.argv.includes("--verify")) {
  console.log("\n=== DETERMINISM / LAYOUT INVARIANTS ===");
  let checked = 0;
  for (let i = 0; i < 5000; i++) {
    const buf = new Uint32Array(CUBE_STRIDE_WORDS);
    generateCubeBuffer(i, 1, buf);
    const packed = buf[CUBE_FIELD_PACKED_META];
    const wide = ((packed >>> 8) & 0xff) === 1;
    if (wide !== isCubeWide(i)) throw new Error(`isCubeWide mismatch at ${i}`);
    checked++;
  }
  console.log(
    `isCubeWide consistent with generateCubeBuffer across ${checked} indices`,
  );
  for (const cols of [2, 3, 4, 6]) {
    const full: number[] = [0];
    extendRowBreaks(full, 0, 10000, cols);
    const incremental: number[] = [0];
    for (let chunk = 0; chunk < 10000; chunk += 600) {
      extendRowBreaks(incremental, chunk, Math.min(chunk + 600, 10000), cols);
    }
    if (
      full.length !== incremental.length ||
      full.some((v, k) => v !== incremental[k])
    ) {
      throw new Error(`row-break mismatch (full vs incremental) cols=${cols}`);
    }
    for (let r = 0; r + 1 < full.length; r++) {
      if (full[r] >= full[r + 1])
        throw new Error(`non-monotonic breaks at row ${r}`);
      let col = 0;
      for (let c = full[r]; c < full[r + 1]; c++) {
        const w = cubeSpan(c, col, cols);
        if (col + w > cols)
          throw new Error(`row overflow cols=${cols} cube=${c}`);
        col += w;
      }
      if (col !== cols)
        throw new Error(`row ${r} not full (holes) cols=${cols} sum=${col}`);
    }
    let col = 0;
    for (let c = full[full.length - 1]; c < 10000; c++) {
      const w = cubeSpan(c, col, cols);
      if (col + w > cols)
        throw new Error(`last-row overflow cols=${cols} cube=${c}`);
      col += w;
    }
    console.log(
      `cols=${cols}: ${full.length} rows over 10000 cubes, breaks monotonic, no overflow, no holes`,
    );
  }
  let maxTokens = 0;
  for (let i = 0; i < 1_000_000; i++) {
    const n = generateParagraphTokenSequence(
      i,
      TextStyleMode.CLASSIC_LOREM,
      scratchTokens,
    );
    if (n > maxTokens) maxTokens = n;
  }
  console.log(
    `max tokens observed across 1M paragraphs (scratch capacity 512): ${maxTokens}`,
  );

  console.log("\n--- VIRTUALIZATION INVARIANTS ---");
  {
    const total = 500;
    const heights: number[] = [];
    let rng = 0x5eed0000 | 12345;
    for (let i = 0; i < total; i++) {
      rng = xorShift32(rng);
      heights.push(120 + (rng % 480));
    }
    const windowSize = 24;
    const overscan = 6;
    const padY = 64;
    const totalHeight = sumHeights(heights, 0, total);
    let fromStart = 0;
    let fromOffset = 0;
    for (let s = 0; s <= 500; s++) {
      const scrollTop = (s * 1913) % (totalHeight + padY + 100);
      computeTextWindow(
        scrollTop,
        padY,
        heights,
        total,
        windowSize,
        overscan,
        fromStart,
        fromOffset,
        scratchLayout,
      );
      const start = scratchLayout[LAYOUT_START];
      const end = scratchLayout[LAYOUT_END];
      const firstVisible = scratchLayout[LAYOUT_FIRST_VISIBLE];
      const startOffset = scratchLayout[LAYOUT_START_OFFSET];
      if (startOffset !== sumHeights(heights, 0, start)) {
        throw new Error(
          `text window startOffset drift at scrollTop=${scrollTop}`,
        );
      }
      if (start !== Math.max(0, firstVisible - overscan)) {
        throw new Error(`text window start mismatch at scrollTop=${scrollTop}`);
      }
      if (end !== Math.min(total, start + windowSize)) {
        throw new Error(`text window end mismatch at scrollTop=${scrollTop}`);
      }
      const pos = Math.min(Math.max(scrollTop - padY, 0), totalHeight - 1);
      let expect = 0;
      let acc = 0;
      while (expect + 1 < total && acc + heights[expect] <= pos) {
        acc += heights[expect];
        expect++;
      }
      if (firstVisible !== expect) {
        throw new Error(
          `text window firstVisible mismatch at scrollTop=${scrollTop}`,
        );
      }
      const fresh = new Float64Array(LAYOUT_FIELD_COUNT);
      computeTextWindow(
        scrollTop,
        padY,
        heights,
        total,
        windowSize,
        overscan,
        0,
        0,
        fresh,
      );
      if (fresh[LAYOUT_START] !== start || fresh[LAYOUT_END] !== end) {
        throw new Error(
          `incremental walk diverged from fresh walk at scrollTop=${scrollTop}`,
        );
      }
      fromStart = start;
      fromOffset = startOffset;
    }
    computeTextWindow(
      0,
      padY,
      heights,
      0,
      windowSize,
      overscan,
      0,
      0,
      scratchLayout,
    );
    if (scratchLayout[LAYOUT_END] !== 0)
      throw new Error("text window empty-total guard");
    console.log(
      `text window: 501 scroll positions, incremental walk == fresh walk, no anchor drift`,
    );

    const mid = 250;
    computeTextWindow(
      mid * 100,
      padY,
      heights,
      total,
      windowSize,
      overscan,
      0,
      0,
      scratchLayout,
    );
    let hintStart = scratchLayout[LAYOUT_START];
    let hintOffset = scratchLayout[LAYOUT_START_OFFSET];
    for (
      let i = hintStart + 2;
      i < Math.min(total, hintStart + windowSize);
      i += 3
    ) {
      heights[i] = Math.round(heights[i] * 1.6);
    }
    for (let k = 0; k < 5; k++) {
      computeTextWindow(
        mid * 100,
        padY,
        heights,
        total,
        windowSize,
        overscan,
        hintStart,
        hintOffset,
        scratchLayout,
      );
      if (
        scratchLayout[LAYOUT_START_OFFSET] !==
        sumHeights(heights, 0, scratchLayout[LAYOUT_START])
      ) {
        throw new Error(
          "startOffset drift after in-window measurement correction",
        );
      }
      hintStart = scratchLayout[LAYOUT_START];
      hintOffset = scratchLayout[LAYOUT_START_OFFSET];
    }
    console.log(
      "text window: stable below-window positions after in-window measurement corrections",
    );
  }
  {
    const rowCount = 90;
    const rowHeight = 152;
    const padY = 32;
    const overscan = 2;
    const viewportHeight = 760;
    const visibleRows = Math.max(1, Math.ceil(viewportHeight / rowHeight));
    for (let s = 0; s < 300; s++) {
      const scrollTop = (s * 997) % (rowCount * rowHeight + padY + 500);
      computeCubeWindow(
        scrollTop,
        viewportHeight,
        rowCount,
        rowHeight,
        padY,
        overscan,
        scratchLayout,
      );
      const start = scratchLayout[LAYOUT_START];
      const end = scratchLayout[LAYOUT_END];
      const row = scratchLayout[LAYOUT_FIRST_VISIBLE];
      const startOffset = scratchLayout[LAYOUT_START_OFFSET];
      const expectRow = Math.min(
        Math.max(Math.floor((scrollTop - padY) / rowHeight), 0),
        rowCount - 1,
      );
      if (row !== expectRow)
        throw new Error(`cube row mismatch at scrollTop=${scrollTop}`);
      if (start !== Math.max(0, row - overscan))
        throw new Error(`cube start mismatch at scrollTop=${scrollTop}`);
      if (end !== Math.min(rowCount, start + visibleRows + overscan * 2)) {
        throw new Error(`cube end mismatch at scrollTop=${scrollTop}`);
      }
      if (startOffset !== start * rowHeight)
        throw new Error(`cube startOffset mismatch at scrollTop=${scrollTop}`);
      if (!(start <= row && row < end))
        throw new Error(
          `cube window excludes visible row at scrollTop=${scrollTop}`,
        );
    }
    computeCubeWindow(
      0,
      viewportHeight,
      0,
      rowHeight,
      padY,
      overscan,
      scratchLayout,
    );
    if (scratchLayout[LAYOUT_END] !== 0)
      throw new Error("cube window empty-total guard");
    console.log(
      `cube window: 300 scroll positions, clamped rows, exact startOffset, visible row in window`,
    );
  }
  {
    let prev = 0;
    for (const w of [240, 320, 480, 640, 768, 900, 1200, 1920]) {
      const cpl = estimateCharsPerLine(w);
      if (cpl < 24)
        throw new Error(`chars-per-line below minimum at width=${w}`);
      if (cpl < prev)
        throw new Error(`chars-per-line not monotonic at width=${w}`);
      prev = cpl;
    }
    console.log(
      `estimateCharsPerLine: monotonic across widths 240..1920, min 24`,
    );
  }
  console.log("verify: OK");
}

if (process.argv.includes("--profile-heavy")) {
  console.log("=== PROFILE-HEAVY DECODE WORKLOAD ===");
  const tokenCount = generateParagraphTokenSequence(
    5,
    TextStyleMode.CLASSIC_LOREM,
    scratchTokens,
  );
  generateCubeBuffer(0, 60, scratchCubes);
  for (let i = 0; i < 200_000; i++) {
    decodeTokensToParagraphText(
      scratchTokens,
      tokenCount,
      TextStyleMode.CLASSIC_LOREM,
    );
    generateParagraphTokenSequence(
      i,
      TextStyleMode.CLASSIC_LOREM,
      scratchTokens,
    );
  }
  for (let i = 0; i < 200_000; i++) {
    deriveCubeMetrics(scratchCubes, 60, scratchDerived);
  }
  console.log("profile-heavy done");
}
