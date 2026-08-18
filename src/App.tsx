import React, { useState, useEffect } from "react";
import { VirtualScrollStream } from "./components/VirtualScrollStream";
import { MetroCubeStream } from "./components/MetroCubeStream";
import { FpsCounter } from "./components/FpsCounter";
import { TextStyleMode, VisualViewMode } from "./types";

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
      if (e.key === "m" || e.key === "M") {
        setViewMode((prev) =>
          prev === VisualViewMode.TEXT_STREAM
            ? VisualViewMode.METRO_CUBES
            : VisualViewMode.TEXT_STREAM,
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <main
      id="infinite-scroll-app"
      data-locked="true"
      contentEditable={false}
      className="relative w-screen h-screen overflow-hidden bg-[#2d2d2d] text-[#eeeeec] select-none"
    >
      <nav
        aria-label="View mode selector"
        className="fixed top-4 right-6 z-50 flex items-center p-1 rounded-md bg-[#353535]/90 backdrop-blur-sm border border-[#4c4c4c] shadow-lg font-mono text-xs select-none"
      >
        <button
          id="mode-text-btn"
          onClick={() => setViewMode(VisualViewMode.TEXT_STREAM)}
          className={`px-3 py-1 rounded transition-colors ${
            viewMode === VisualViewMode.TEXT_STREAM
              ? "bg-[#3e8ae5] text-white font-semibold shadow-sm"
              : "text-[#919190] hover:text-[#eeeeec]"
          }`}
          title="Switch to Endless Text Stream"
        >
          T
        </button>

        <button
          id="mode-metro-btn"
          onClick={() => setViewMode(VisualViewMode.METRO_CUBES)}
          className={`px-3 py-1 rounded transition-colors ${
            viewMode === VisualViewMode.METRO_CUBES
              ? "bg-[#3e8ae5] text-white font-semibold shadow-sm"
              : "text-[#919190] hover:text-[#eeeeec]"
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
          <MetroCubeStream />
        )}
      </section>

      <FpsCounter />
    </main>
  );
}
