export const LAYOUT_START = 0;
export const LAYOUT_END = 1;
export const LAYOUT_FIRST_VISIBLE = 2;
export const LAYOUT_START_OFFSET = 3;
export const LAYOUT_FIELD_COUNT = 4;

const MAX_CONTENT_WIDTH_PX = 768;
const H_PAD_PX = 64;
const AVG_GLYPH_WIDTH_PX = 8.8;
const MIN_CHARS_PER_LINE = 24;

export function estimateCharsPerLine(containerWidth: number): number {
  const contentWidth =
    Math.min(containerWidth, MAX_CONTENT_WIDTH_PX) - H_PAD_PX;
  return Math.max(
    MIN_CHARS_PER_LINE,
    Math.floor(contentWidth / AVG_GLYPH_WIDTH_PX),
  );
}

export function sumHeights(
  heights: number[],
  from: number,
  to: number,
): number {
  let sum = 0;
  for (let i = from; i < to; i++) sum += heights[i];
  return sum;
}

export function computeTextWindow(
  scrollTop: number,
  padY: number,
  heights: number[],
  total: number,
  windowSize: number,
  overscan: number,
  fromStart: number,
  fromStartOffset: number,
  out: Float64Array,
): void {
  if (total <= 0) {
    out[LAYOUT_START] = 0;
    out[LAYOUT_END] = 0;
    out[LAYOUT_FIRST_VISIBLE] = 0;
    out[LAYOUT_START_OFFSET] = 0;
    return;
  }

  let pos = scrollTop - padY;
  if (pos < 0) pos = 0;

  let i = Math.max(0, Math.min(fromStart, total - 1));
  let off = fromStartOffset;
  if (off > pos) {
    while (i > 0 && off > pos) {
      i--;
      off -= heights[i];
    }
  } else {
    while (i + 1 < total && off + heights[i] <= pos) {
      off += heights[i];
      i++;
    }
  }

  let startOffset = off;
  const start = Math.max(0, i - overscan);
  for (let j = start; j < i; j++) startOffset -= heights[j];
  const end = Math.min(total, start + windowSize);

  out[LAYOUT_START] = start;
  out[LAYOUT_END] = end;
  out[LAYOUT_FIRST_VISIBLE] = i;
  out[LAYOUT_START_OFFSET] = startOffset;
}

export function computeCubeWindow(
  scrollTop: number,
  viewportHeight: number,
  rowCount: number,
  rowHeightPx: number,
  padY: number,
  overscanRows: number,
  out: Float64Array,
): void {
  if (rowCount <= 0) {
    out[LAYOUT_START] = 0;
    out[LAYOUT_END] = 0;
    out[LAYOUT_FIRST_VISIBLE] = 0;
    out[LAYOUT_START_OFFSET] = 0;
    return;
  }

  let row = Math.floor((scrollTop - padY) / rowHeightPx);
  if (row < 0) row = 0;
  if (row >= rowCount) row = rowCount - 1;

  const visibleRows = Math.max(1, Math.ceil(viewportHeight / rowHeightPx));
  const start = Math.max(0, row - overscanRows);
  const end = Math.min(rowCount, start + visibleRows + overscanRows * 2);

  out[LAYOUT_START] = start;
  out[LAYOUT_END] = end;
  out[LAYOUT_FIRST_VISIBLE] = row;
  out[LAYOUT_START_OFFSET] = start * rowHeightPx;
}
