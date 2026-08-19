# Perpetua

A high-precision scroll testing application: two procedurally generated infinite streams — lorem-style text and metro cubes — plus a live FPS/frame-time widget. Built for in-depth mouse-scrolling testing.

Live preview: <https://perpetua.edgeone.dev/>

## Tech stack

- React 19 + TypeScript
- Vite 6
- Tailwind CSS v4
- `motion` (layout animation), `lucide-react` (icons)

## Getting started

```bash
npm install
npm run dev        # Vite dev server on port 3000 (host 0.0.0.0)
```

```bash
npm run build      # production build → dist/
npm run preview    # preview the production build
```

## Commands

| Command                 | What it does                                                  |
| ----------------------- | ------------------------------------------------------------- |
| `npm run dev`           | Dev server on port 3000                                       |
| `npm run lint`          | Typecheck (`tsc --noEmit`)                                    |
| `npm run build`         | Production build → `dist/`                                    |
| `npm run preview`       | Preview the build                                             |
| `npm run clean`         | Remove `dist/`                                                |
| `npm run bench` | Throughput benchmarks |
| `npm run bench:verify` | Determinism + layout invariant checks |
| `npm run bench:golden` | Byte-identity gate: SHA-256 of engine outputs vs committed hash |
| `npm run bench:alloc` | Allocation and memory baselines |
| `npm run bench:profile` | V8 `--cpu-prof`/`--trace-gc` workload → `/tmp/perpetua-prof/` |

Benchmark harness lives in `benchmarks/perf.ts`; numbers and methodology in `PERF.md`.

## Design

The two streams run on **data-oriented engines**: zero-allocation hot loops over preallocated typed-array scratch buffers, with control flow resolved through lookup tables (LUTs) or arithmetic predicates rather than branch statements. Strings (colors, labels, hex) exist only at the JSX boundary.

- **Text stream** — append-only. Paragraphs stay in the DOM and the browser lays them out naturally; generation triggers on a `remainingDistance < 2500px` check and appends 40 paragraphs synchronously, so it is structurally unable to stall.
- **Cube stream** — virtualized. Only a viewport window of rows is in the DOM, stored as one contiguous `Uint32Array` (no per-cube objects). Layout is sequential row-major packing — a cube is rendered wide only when it cannot leave an empty trailing cell, so every row fills exactly `cols` columns with no holes.

## Source layout

| File                                     | Role                                                                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `src/App.tsx`                            | App shell, mode switching, palette                                                                                          |
| `src/types.ts`                           | Shared enums, wire-format constants, `APP_BUILD`                                                                            |
| `src/engine/proceduralTextEngine.ts`     | Token-sequence generation (branchless kernel), metrics derivation, token→text decoding                                      |
| `src/engine/cubeEngine.ts`               | Cube generation and span/row-break math                                                                                     |
| `src/engine/virtualizationEngine.ts`     | Pure numeric window math (`computeTextWindow` / `computeCubeWindow`) writing a caller-provided `Float64Array` layout record |
| `src/components/VirtualScrollStream.tsx` | Append-only text stream                                                                                                     |
| `src/components/MetroCubeStream.tsx`     | Virtualized cube stream                                                                                                     |
| `src/components/FpsCounter.tsx`          | FPS / frame-time widget                                                                                                     |

## Wire formats

- **Token**: vocab index in the low 10 bits; flags `0x0400` capitalize, `0x0800` comma, `0x1000` period.
- **Cube**: stride of 4 words — seed, value, packedMeta, index.

## License

MIT — see [LICENSE](LICENSE).
