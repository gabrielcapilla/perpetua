import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  CUBE_FIELD_INDEX,
  CUBE_FIELD_PACKED_META,
  CUBE_FIELD_SEED,
  CUBE_FIELD_VALUE,
  CUBE_STRIDE_WORDS,
} from "../types";
import {
  cubeSpan,
  extendRowBreaks,
  generateCubeBuffer,
  METRO_COLOR_CLASSES,
  METRO_LABELS,
} from "../engine/cubeEngine";
import {
  LAYOUT_END,
  LAYOUT_FIELD_COUNT,
  LAYOUT_START,
  computeCubeWindow,
} from "../engine/virtualizationEngine";

interface MetroCubeStreamProps {
  onScroll?: () => void;
}

const BATCH_SIZE = 60;
const INITIAL_BATCHES = 2;
const INITIAL_TOTAL = BATCH_SIZE * INITIAL_BATCHES;
const TRIGGER_DISTANCE_PX = 2500;
const ROW_HEIGHT_PX = 152;
const PAD_Y_PX = 32;
const OVERSCAN_ROWS = 2;

const COLS_FOR_WIDTH = (width: number): number => {
  if (width >= 1024) return 6;
  if (width >= 768) return 4;
  if (width >= 640) return 3;
  return 2;
};
const GRID_COLS_CLASSES: readonly string[] = Object.freeze([
  "",
  "",
  "grid-cols-2",
  "grid-cols-3",
  "grid-cols-4",
  "",
  "grid-cols-6",
]);

const SCRATCH_LAYOUT = new Float64Array(LAYOUT_FIELD_COUNT);
const MAX_WINDOW_CUBES = 512;
const SCRATCH_WINDOW_POOL: readonly Uint32Array[] = [
  new Uint32Array(MAX_WINDOW_CUBES * CUBE_STRIDE_WORDS),
  new Uint32Array(MAX_WINDOW_CUBES * CUBE_STRIDE_WORDS),
];
let scratchWindowToggle = 0;

interface RowWindow {
  start: number;
  end: number;
}

export const MetroCubeStream: React.FC<MetroCubeStreamProps> = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rowBreaksRef = useRef<number[] | null>(null);
  if (rowBreaksRef.current === null) {
    rowBreaksRef.current = [0];
    extendRowBreaks(rowBreaksRef.current, 0, INITIAL_TOTAL, 6);
  }
  const totalRef = useRef<number>(INITIAL_TOTAL);
  const colsRef = useRef<number>(6);
  const isGeneratingRef = useRef<boolean>(false);
  const [win, setWin] = useState<RowWindow>({ start: 0, end: 0 });
  const [cubes, setCubes] = useState<Uint32Array>(() => {
    const buf = SCRATCH_WINDOW_POOL[scratchWindowToggle];
    scratchWindowToggle ^= 1;
    generateCubeBuffer(0, INITIAL_TOTAL, buf);
    return buf;
  });
  const [gaps, setGaps] = useState(() => ({
    top: PAD_Y_PX,
    bottom:
      (rowBreaksRef.current as number[]).length * ROW_HEIGHT_PX + PAD_Y_PX,
  }));
  const winRef = useRef<RowWindow>(win);

  const computeGaps = useCallback(
    (from: number, to: number): { top: number; bottom: number } => {
      const totalRows = (rowBreaksRef.current as number[]).length;
      return {
        top: from * ROW_HEIGHT_PX + PAD_Y_PX,
        bottom: (totalRows - to) * ROW_HEIGHT_PX + PAD_Y_PX,
      };
    },
    [],
  );

  const decodeRowRange = useCallback(
    (fromRow: number, toRow: number): Uint32Array => {
      const breaks = rowBreaksRef.current as number[];
      const firstCube = breaks[fromRow];
      const lastCube = toRow < breaks.length ? breaks[toRow] : totalRef.current;
      const count = lastCube - firstCube;
      if (count > MAX_WINDOW_CUBES) {
        const buf = new Uint32Array(count * CUBE_STRIDE_WORDS);
        generateCubeBuffer(firstCube, count, buf);
        return buf;
      }
      const buf = SCRATCH_WINDOW_POOL[scratchWindowToggle];
      scratchWindowToggle ^= 1;
      generateCubeBuffer(firstCube, count, buf);
      return buf;
    },
    [],
  );

  const recomputeWindow = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const totalRows = (rowBreaksRef.current as number[]).length;
    if (totalRows <= 0) return;

    const current = winRef.current;
    computeCubeWindow(
      el.scrollTop,
      el.clientHeight,
      totalRows,
      ROW_HEIGHT_PX,
      PAD_Y_PX,
      OVERSCAN_ROWS,
      SCRATCH_LAYOUT,
    );

    const start = SCRATCH_LAYOUT[LAYOUT_START];
    const end = SCRATCH_LAYOUT[LAYOUT_END];
    if (start === current.start && end === current.end) return;

    const next = { start, end };
    winRef.current = next;
    setWin(next);
    setCubes(decodeRowRange(start, end));
    setGaps(computeGaps(start, end));
  }, [decodeRowRange, computeGaps]);

  const generateNextChunk = useCallback(() => {
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;

    const start = totalRef.current;
    totalRef.current = start + BATCH_SIZE;
    extendRowBreaks(
      rowBreaksRef.current as number[],
      start,
      start + BATCH_SIZE,
      colsRef.current,
    );
    setGaps(computeGaps(winRef.current.start, winRef.current.end));
    isGeneratingRef.current = false;
  }, [computeGaps]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const remainingDistance = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (remainingDistance < TRIGGER_DISTANCE_PX) {
      generateNextChunk();
    }
    recomputeWindow();
  }, [generateNextChunk, recomputeWindow]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (el.scrollHeight - el.clientHeight < TRIGGER_DISTANCE_PX) {
      generateNextChunk();
    }
    recomputeWindow();

    const breaks = rowBreaksRef.current as number[];
    const observer = new ResizeObserver(() => {
      const cols = COLS_FOR_WIDTH(el.clientWidth);
      if (cols !== colsRef.current) {
        colsRef.current = cols;
        breaks.length = 0;
        breaks.push(0);
        extendRowBreaks(breaks, 0, totalRef.current, cols);
      }
      recomputeWindow();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [generateNextChunk, recomputeWindow]);

  const breaks = rowBreaksRef.current as number[];
  const firstCube = win.start < breaks.length ? breaks[win.start] : 0;
  const visibleRows = Math.max(1, win.end - win.start);
  const gridCols = GRID_COLS_CLASSES[colsRef.current] || "grid-cols-2";

  return (
    <div
      id="infinite-metro-viewport"
      ref={containerRef}
      onScroll={handleScroll}
      onDragStart={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
      className="relative w-full h-full overflow-y-auto overflow-x-hidden bg-[#000000] text-[#e6edf3] focus:outline-none select-none"
      tabIndex={0}
      contentEditable={false}
      
      data-locked="true"
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "rgb(48, 54, 61) rgb(0, 0, 0)",
      }}
    >
      <div
        className="max-w-6xl mx-auto p-8"
        contentEditable={false}
        
        data-locked="true"
      >
        <div style={{ height: gaps.top }} aria-hidden="true" />
        <div className="flex flex-col gap-3" data-locked="true">
          {Array.from({ length: visibleRows }, (_, k) => {
            const rowIdx = win.start + k;
            if (rowIdx >= breaks.length) return null;
            const rowStartSlot =
              (breaks[rowIdx] - firstCube) * CUBE_STRIDE_WORDS;
            const rowEndCube =
              rowIdx + 1 < breaks.length
                ? breaks[rowIdx + 1]
                : totalRef.current;
            const rowEndSlot = (rowEndCube - firstCube) * CUBE_STRIDE_WORDS;
            return (
              <div
                key={breaks[rowIdx]}
                className={`grid ${gridCols} gap-3 auto-rows-[140px]`}
                contentEditable={false}
                
                data-locked="true"
              >
                {(() => {
                  let rowCol = 0;
                  const rowCubes: React.ReactNode[] = [];
                  for (
                    let slot = rowStartSlot;
                    slot < rowEndSlot;
                    slot += CUBE_STRIDE_WORDS
                  ) {
                    const seed = cubes[slot + CUBE_FIELD_SEED];
                    const value = cubes[slot + CUBE_FIELD_VALUE];
                    const packedMeta = cubes[slot + CUBE_FIELD_PACKED_META];
                    const idx = cubes[slot + CUBE_FIELD_INDEX];

                    const colorIdx = packedMeta & 0xff;
                    const labelIdx = (packedMeta >>> 16) & 0xff;
                    const span = cubeSpan(idx, rowCol, colsRef.current);
                    rowCol += span;

                    rowCubes.push(
                      <div
                        key={idx}
                        id={`metro-cube-${idx}`}
                        contentEditable={false}
                        
                        data-locked="true"
                        className={`relative p-3.5 flex flex-col justify-between transition-transform duration-100 active:scale-[0.98] cursor-default select-none shadow-sm ${
                          span === 2 ? "col-span-2" : "col-span-1"
                        } ${METRO_COLOR_CLASSES[colorIdx]}`}
                      >
                        <div
                          className="flex items-center justify-between text-[11px] font-mono tracking-wider opacity-85"
                          contentEditable={false}
                          data-locked="true"
                        >
                          <span>#{idx}</span>
                          <span>
                            0x
                            {seed
                              .toString(16)
                              .toUpperCase()
                              .padStart(8, "0")
                              .slice(0, 4)}
                          </span>
                        </div>

                        <div
                          className="my-auto"
                          contentEditable={false}
                          data-locked="true"
                        >
                          <span className="text-2xl sm:text-3xl font-light font-sans tracking-tight">
                            {value}
                          </span>
                        </div>

                        <div
                          className="text-[10px] font-mono font-semibold tracking-wider uppercase opacity-90 truncate"
                          contentEditable={false}
                          data-locked="true"
                        >
                          {METRO_LABELS[labelIdx]}
                        </div>
                      </div>,
                    );
                  }
                  return rowCubes;
                })()}
              </div>
            );
          })}
        </div>
        <div style={{ height: gaps.bottom }} aria-hidden="true" />
      </div>
    </div>
  );
};
