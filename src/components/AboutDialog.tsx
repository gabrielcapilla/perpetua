import React, { useEffect, useState } from "react";

const AUTHOR_NAME = "Gabriel Capilla";
const REPO_URL = "https://github.com/gabrielcapilla/perpetua";
const REPO_LABEL = "github.com/gabrielcapilla/perpetua";
const WEBSITE_URL = "https://gabrielcapilla.github.io";
const WEBSITE_LABEL = "gabrielcapilla.github.io";
const TAGLINE =
  "Procedurally generated infinite scroll streams for high-precision mouse-scrolling testing.";

export const AboutDialog: React.FC = () => {
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        id="about-btn"
        onClick={() => setOpen(true)}
        data-locked="true"
        contentEditable={false}
        
        aria-label="About Perpetua"
        title="About Perpetua"
        className="flex items-center justify-center w-7 h-7 rounded-md bg-[#161b22] hover:bg-[#21262d] active:scale-95 transition-all duration-150 border border-[#30363d] shadow-lg font-mono text-sm text-[#9198a1] hover:text-[#e6edf3] select-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1f6feb]"
      >
        ?
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="About Perpetua"
          className="fixed inset-0 z-[60]"
          data-locked="true"
          contentEditable={false}
        >
          <div
            className="absolute inset-0 bg-black/50"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] rounded-md bg-[#161b22] border border-[#30363d] shadow-xl p-5 font-mono text-xs text-[#e6edf3]">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold tracking-wider uppercase text-[11px]">
                About
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="px-1 rounded text-[#9198a1] hover:text-[#e6edf3] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1f6feb]"
              >
                ×
              </button>
            </div>
            <dl className="space-y-2.5">
              <div>
                <dt className="text-[#9198a1] uppercase tracking-wider text-[10px]">
                  Author
                </dt>
                <dd className="mt-0.5">{AUTHOR_NAME}</dd>
              </div>
              <div>
                <dt className="text-[#9198a1] uppercase tracking-wider text-[10px]">
                  Description
                </dt>
                <dd className="mt-0.5 leading-relaxed">{TAGLINE}</dd>
              </div>
              <div>
                <dt className="text-[#9198a1] uppercase tracking-wider text-[10px]">
                  Repository
                </dt>
                <dd className="mt-0.5">
                  <a
                    href={REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#4493f8] hover:underline"
                  >
                    {REPO_LABEL}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-[#9198a1] uppercase tracking-wider text-[10px]">
                  Website
                </dt>
                <dd className="mt-0.5">
                  <a
                    href={WEBSITE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#4493f8] hover:underline"
                  >
                    {WEBSITE_LABEL}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </>
  );
};