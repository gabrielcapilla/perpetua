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

  const DIAG_WINDOW_MS = 5000;
  const DIAG_BUCKET_MS = 1000;
  let diagRaw: number[] | null = [];
  let diagStart = 0;
  let diagBucketStart = 0;
  let diagBucketFrames = 0;
  let diagBuckets: number[] = [];

  useEffect(() => {
    const loop = (timestamp: number) => {
      const delta = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;

      if (diagRaw) {
        if (diagRaw.length < 20) diagRaw.push(delta);
        if (diagStart === 0) {
          diagStart = timestamp;
          diagBucketStart = timestamp;
        }
        diagBucketFrames++;
        if (timestamp - diagBucketStart >= DIAG_BUCKET_MS) {
          diagBuckets.push(diagBucketFrames);
          diagBucketFrames = 0;
          diagBucketStart = timestamp;
        }
        if (timestamp - diagStart >= DIAG_WINDOW_MS) {
          diagBuckets.push(diagBucketFrames);
          console.log(
            `[fps-diag] ua="${navigator.userAgent}" vis=${document.visibilityState} ` +
              `first20(ms)=[${diagRaw.map((d) => d.toFixed(1)).join(", ")}] ` +
              `framesPerSec=[${diagBuckets.join(", ")}]`,
          );
          diagRaw = null;
        }
      }

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
      aria-readonly="true"
      aria-expanded={!isFolded}
      aria-label="Toggle FPS and Frame Time display"
      title={
        fpsData.live
          ? `FPS ${fpsData.fps} · ${fpsData.frameTime} ms · build ${APP_BUILD}`
          : `Click to unfold FPS monitor (measuring…) · build ${APP_BUILD}`
      }
      className="fixed bottom-4 right-6 z-50 flex items-center justify-center rounded-md bg-[#353535]/90 hover:bg-[#3d3d3d] active:scale-95 transition-all duration-150 backdrop-blur-sm border border-[#4c4c4c] shadow-lg font-mono text-xs select-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#3e8ae5]"
    >
      {isFolded ? (
        <span className="px-2.5 py-1 text-[#919190] hover:text-[#eeeeec] font-semibold text-[11px] tracking-wider uppercase">
          FPS
        </span>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-[#eeeeec] min-w-[24px] text-right">
              {fpsData.live ? fpsData.fps : "–"}
            </span>
            <span className="text-[#919190] text-[11px]">FPS</span>
          </div>

          <div className="h-3 w-[1px] bg-[#4c4c4c]" />

          <div className="text-[#919190] text-[11px]">
            <span className="text-[#eeeeec] font-medium">
              {fpsData.live ? fpsData.frameTime : "–"}
            </span>
            <span>ms</span>
          </div>
        </div>
      )}
    </button>
  );
};
