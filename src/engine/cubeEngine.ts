import {
  CUBE_FIELD_INDEX,
  CUBE_FIELD_PACKED_META,
  CUBE_FIELD_SEED,
  CUBE_FIELD_VALUE,
  CUBE_STRIDE_WORDS,
} from "../types";
import { xorShift32 } from "./proceduralTextEngine";

export const METRO_COLOR_CLASSES: readonly string[] = Object.freeze([
  "bg-[#3e8ae5] text-white",
  "bg-[#353535] text-[#eeeeec] border border-[#4c4c4c]",
  "bg-[#26ab62] text-white",
  "bg-[#f57900] text-white",
  "bg-[#323232] text-[#eeeeec] border border-[#4c4c4c]",
  "bg-[#277ce2] text-white",
  "bg-[#e6333b] text-white",
  "bg-[#4c4c4c] text-[#eeeeec] border border-[#5a5a5a]",
]);

export const METRO_LABELS: readonly string[] = Object.freeze([
  "SYSTEM_BLOCK",
  "BUFFER_NODE",
  "HEAP_SECTOR",
  "CACHE_LINE",
  "THREAD_POOL",
  "EVENT_LOOP",
  "MMU_PAGING",
  "DMA_PIPE",
  "SOCKET_CHUNK",
  "FRAME_SYNC",
  "VECTOR_ARRAY",
  "CONTIGUOUS_MEM",
]);

export function generateCubeBuffer(
  startIndex: number,
  count: number,
  targetBuffer: Uint32Array,
): void {
  const colorCount = METRO_COLOR_CLASSES.length;
  const labelCount = METRO_LABELS.length;

  for (let i = 0; i < count; i++) {
    const idx = startIndex + i;
    const baseOffset = i * CUBE_STRIDE_WORDS;

    let seed = (idx ^ 0x9e3779b9) >>> 0;
    seed = xorShift32(seed);

    const colorIdx = seed % colorCount;
    const isWide = (seed & 0x07) === 0 ? 1 : 0;
    const labelIdx = (seed >>> 8) % labelCount;
    const value = (seed >>> 16) % 10000;

    const packedMeta = colorIdx | (isWide << 8) | (labelIdx << 16);

    targetBuffer[baseOffset + CUBE_FIELD_SEED] = seed;
    targetBuffer[baseOffset + CUBE_FIELD_VALUE] = value;
    targetBuffer[baseOffset + CUBE_FIELD_PACKED_META] = packedMeta;
    targetBuffer[baseOffset + CUBE_FIELD_INDEX] = idx;
  }
}

export function isCubeWide(index: number): boolean {
  return (xorShift32((index ^ 0x9e3779b9) >>> 0) & 0x07) === 0;
}

export function cubeSpan(index: number, col: number, cols: number): number {
  return col % 2 === 1 || col + 2 > cols || !isCubeWide(index) ? 1 : 2;
}

export function extendRowBreaks(
  rowBreaks: number[],
  fromCube: number,
  toCube: number,
  cols: number,
): void {
  let last = rowBreaks.length > 0 ? rowBreaks[rowBreaks.length - 1] : 0;
  let col = 0;
  for (let i = last; i < toCube; i++) {
    let width = cubeSpan(i, col, cols);
    if (col + width > cols) {
      if (i >= fromCube) rowBreaks.push(i);
      last = i;
      col = 0;
      width = cubeSpan(i, col, cols);
    }
    col += width;
  }
}
