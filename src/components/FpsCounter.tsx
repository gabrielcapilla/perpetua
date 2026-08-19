import React, { useEffect, useRef, useState } from "react";
import { APP_BUILD } from "../types";

export const FpsCounter: React.FC = () => {
  const [isFolded, setIsFolded] = useState<boolean>(true);

  const [fpsData, setFpsData] = useState<{
    fps: number | null;
    frameTime: number | null;
    live: boolean;
  }>({
    fps: null,
    frameTime: null,
    live: false,
  });

  const FRAME_BUFFER_SIZE = 60;
  const frameTimesRef = useRef<Float32Array | null>(null);
  if (frameTimesRef.current === null) {
    frameTimesRef.current = new Float32Array(FRAME_BUFFER_SIZE);
  }
  const frameHeadRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const frameSumRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(performance.now());
  const lastDisplayUpdateRef = useRef<number>(performance.now());
  const rafIdRef = useRef<number>(0);

  useEffect(() => {
    const loop = (timestamp: number) => {
      const delta = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;

      if (delta > 0) {
        const buf = frameTimesRef.current as Float32Array;
        const head = frameHeadRef.current;
        const capped = delta < 500 ? delta : 500;
        if (frameCountRef.current >= FRAME_BUFFER_SIZE) {
          frameSumRef.current -= buf[head];
        } else {
          frameCountRef.current++;
        }
        buf[head] = capped;
        frameSumRef.current += capped;
        frameHeadRef.current = (head + 1) % FRAME_BUFFER_SIZE;
      }

      if (timestamp - lastDisplayUpdateRef.current >= 250) {
        const count = frameCountRef.current;
        if (count > 0) {
          const avgDelta = frameSumRef.current / count;
          const currentFps = Math.round(1000 / avgDelta);
          setFpsData({
            fps: currentFps,
            frameTime: Number(avgDelta.toFixed(2)),
            live: true,
          });
        }
        lastDisplayUpdateRef.current = timestamp;
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return (
    <button
      type="button"
      id="fps-reader-widget"
      onClick={() => setIsFolded((prev) => !prev)}
      data-locked="true"
      contentEditable={false}
      
      aria-expanded={!isFolded}
      aria-label="Toggle FPS and Frame Time display"
      title={
        fpsData.live
          ? `FPS ${fpsData.fps} · ${fpsData.frameTime} ms · build ${APP_BUILD}`
          : `Click to unfold FPS monitor (measuring…) · build ${APP_BUILD}`
      }
      className="flex items-center justify-center rounded-md bg-[#161b22] hover:bg-[#21262d] active:scale-95 transition-all duration-150 border border-[#30363d] shadow-lg font-mono text-xs select-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1f6feb]"
    >
      {isFolded ? (
        <span className="px-2.5 py-1.5 text-[#9198a1] hover:text-[#e6edf3] font-semibold text-[11px] tracking-wider uppercase">
          FPS
        </span>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div className="flex items-baseline gap-1">
            <span className="font-semibold text-[#e6edf3] min-w-[24px] text-right">
              {fpsData.live ? fpsData.fps : "–"}
            </span>
            <span className="text-[#9198a1] text-[11px]">FPS</span>
          </div>

          <div className="h-3 w-[1px] bg-[#30363d]" />

          <div className="text-[#9198a1] text-[11px]">
            <span className="text-[#e6edf3] font-medium">
              {fpsData.live ? fpsData.frameTime : "–"}
            </span>
            <span>ms</span>
          </div>
        </div>
      )}
    </button>
  );
};
