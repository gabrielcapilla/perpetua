import { readFileSync, writeFileSync, unlinkSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dist = join(process.cwd(), "dist");
const htmlPath = join(dist, "index.html");
let html = readFileSync(htmlPath, "utf8");
const cssFiles = readdirSync(join(dist, "assets")).filter((f) =>
  f.endsWith(".css"),
);
if (cssFiles.length !== 1) {
  console.error(`inline-css: expected exactly 1 css asset, got ${cssFiles.length}`);
  process.exit(1);
}
const css = readFileSync(join(dist, "assets", cssFiles[0]), "utf8");
const linkRe = new RegExp(
  `<link[^>]*rel="stylesheet"[^>]*href="/assets/${cssFiles[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>`,
);
if (!linkRe.test(html)) {
  console.error("inline-css: stylesheet link not found in index.html");
  process.exit(1);
}
html = html.replace(linkRe, `<style>${css}</style>`);
writeFileSync(htmlPath, html);
unlinkSync(join(dist, "assets", cssFiles[0]));
console.log(`inline-css: inlined ${cssFiles[0]} (${css.length} bytes)`);