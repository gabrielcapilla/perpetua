import React, { useState, useEffect, lazy, Suspense } from "react";
import { VirtualScrollStream } from "./components/VirtualScrollStream";
import { FpsCounter } from "./components/FpsCounter";
import { AboutDialog } from "./components/AboutDialog";
import { TextStyleMode, VisualViewMode } from "./types";

const MetroCubeStream = lazy(() =>
  import("./components/MetroCubeStream").then((m) => ({
    default: m.MetroCubeStream,
  })),
);

const KEY_TO_MODE: Partial<Record<string, VisualViewMode>> = {
  KeyM: VisualViewMode.METRO_CUBES,
  KeyT: VisualViewMode.TEXT_STREAM,
};

export default function App() {
  const [viewMode, setViewMode] = useState<VisualViewMode>(
    VisualViewMode.TEXT_STREAM,
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      const mode = KEY_TO_MODE[e.code];
      if (mode !== undefined) setViewMode(mode);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <main
      id="infinite-scroll-app"
      data-locked="true"
      contentEditable={false}
      className="relative w-screen h-screen overflow-hidden bg-[#000000] text-[#e6edf3] select-none"
    >
      <nav
        aria-label="View mode selector"
        className="fixed top-4 right-6 z-50 flex items-center p-1 rounded-md bg-[#161b22] border border-[#30363d] shadow-lg font-mono text-xs select-none"
      >
        <button
          id="mode-text-btn"
          onClick={() => setViewMode(VisualViewMode.TEXT_STREAM)}
          className={`px-3 py-1 rounded transition-colors ${
            viewMode === VisualViewMode.TEXT_STREAM
              ? "bg-[#1f6feb] text-white font-semibold shadow-sm"
              : "text-[#9198a1] hover:text-[#e6edf3]"
          }`}
          title="Switch to Endless Text Stream (Press 'T')"
        >
          T
        </button>

        <button
          id="mode-metro-btn"
          onClick={() => setViewMode(VisualViewMode.METRO_CUBES)}
          className={`px-3 py-1 rounded transition-colors ${
            viewMode === VisualViewMode.METRO_CUBES
              ? "bg-[#1f6feb] text-white font-semibold shadow-sm"
              : "text-[#9198a1] hover:text-[#e6edf3]"
          }`}
          title="Switch to Metro UI Cubes Stream (Press 'M')"
        >
          M
        </button>
      </nav>

      <section
        aria-label="Scroll stream container"
        className="w-full h-full"
        data-locked="true"
      >
        {viewMode === VisualViewMode.TEXT_STREAM ? (
          <VirtualScrollStream styleMode={TextStyleMode.CLASSIC_LOREM} />
        ) : (
          <Suspense fallback={null}>
            <MetroCubeStream />
          </Suspense>
        )}
      </section>

      <div className="fixed top-4 left-6 z-50 flex items-center gap-2">
        <AboutDialog />
        <FpsCounter />
      </div>
    </main>
  );
}
