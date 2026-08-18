import React, { useEffect, useRef, useState, useCallback } from "react";
import { TextStyleMode } from "../types";
import {
  generateParagraphTokenSequence,
  decodeTokensToParagraphText,
} from "../engine/proceduralTextEngine";

interface VirtualScrollStreamProps {
  styleMode?: TextStyleMode;
}

const BATCH_SIZE = 40;
const INITIAL_BATCHES = 2;
const TRIGGER_DISTANCE_PX = 2500;

const SCRATCH_TOKENS = new Uint16Array(512);

export const VirtualScrollStream: React.FC<VirtualScrollStreamProps> = ({
  styleMode = TextStyleMode.CLASSIC_LOREM,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [pages, setPages] = useState<string[][]>(() => {
    const initial: string[][] = [];
    for (let b = 0; b < INITIAL_BATCHES; b++) {
      const page: string[] = [];
      for (let i = 0; i < BATCH_SIZE; i++) {
        const currentIdx = b * BATCH_SIZE + i;
        const tokenCount = generateParagraphTokenSequence(
          currentIdx,
          styleMode,
          SCRATCH_TOKENS,
        );
        page.push(
          decodeTokensToParagraphText(SCRATCH_TOKENS, tokenCount, styleMode),
        );
      }
      initial.push(page);
    }
    return initial;
  });

  const nextIndexRef = useRef<number>(BATCH_SIZE * INITIAL_BATCHES);
  const isGeneratingRef = useRef<boolean>(false);

  const generateNextChunk = useCallback(() => {
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;

    const start = nextIndexRef.current;
    const newBatch: string[] = [];

    for (let i = 0; i < BATCH_SIZE; i++) {
      const currentIdx = start + i;
      const tokenCount = generateParagraphTokenSequence(
        currentIdx,
        styleMode,
        SCRATCH_TOKENS,
      );
      newBatch.push(
        decodeTokensToParagraphText(SCRATCH_TOKENS, tokenCount, styleMode),
      );
    }

    nextIndexRef.current = start + BATCH_SIZE;
    setPages((prev) => [...prev, newBatch]);
    isGeneratingRef.current = false;
  }, [styleMode]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const remainingDistance = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (remainingDistance < TRIGGER_DISTANCE_PX) {
      generateNextChunk();
    }
  }, [generateNextChunk]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (el.scrollHeight - el.clientHeight < TRIGGER_DISTANCE_PX) {
      generateNextChunk();
    }
  }, [generateNextChunk]);

  return (
    <div
      id="infinite-text-viewport"
      ref={containerRef}
      onScroll={handleScroll}
      onDragStart={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
      className="relative w-full h-full overflow-y-auto overflow-x-hidden bg-[#2d2d2d] text-[#eeeeec] focus:outline-none"
      tabIndex={0}
      contentEditable={false}
      aria-readonly="true"
      data-locked="true"
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "rgb(76, 76, 76) rgb(45, 45, 45)",
      }}
    >
      <div
        className="max-w-3xl mx-auto px-8 py-16"
        contentEditable={false}
        aria-readonly="true"
        data-locked="true"
      >
        {pages.map((page, pageIdx) => (
          <React.Fragment key={pageIdx}>
            {page.map((text, i) => {
              const idx = pageIdx * BATCH_SIZE + i;
              return (
                <p
                  key={idx}
                  id={`p-${idx}`}
                  contentEditable={false}
                  aria-readonly="true"
                  data-locked="true"
                  className="text-lg leading-relaxed text-[#eeeeec] font-serif mb-8 text-justify antialiased select-text"
                >
                  {text}
                </p>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
