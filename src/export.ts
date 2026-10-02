import { existsSync, readFileSync } from "node:fs";
import { plainText } from "./sketch/rich";
import { dirname, extname, join, resolve } from "node:path";
import { initRenderer, renderPNG } from "./sketch/resvg";
import { bakeImage, MIME, type BakeMode } from "./sketch/bake";
import { drawingFonts, FONT_DIR, fontFaceCss as inlineFonts } from "./sketch/fonts";
import { isWireframeRef, wireframePNG } from "./wireframes";

export { initRenderer };
import { PDFDocument } from "pdf-lib";
import type { Board } from "./types";
import { pageSize, panelRect, renderBoardSVG } from "./render";
import { isScene } from "./types";
import { toScript } from "./script";

export { imageSize, duotoneSVG, type BakeMode } from "./sketch/bake";
export { FONT_DIR };

/**
 * A screen in a storyboard: an image file, or a Wireframe Kit screen ("./app.wireframe.json#checkout"),
 * which resolves to the PNG Wireframe Kit renders next to it. Baked to the teal duotone and cached.
 */
export function bakeScreen(absPath: string, cacheDir: string, roughness = 1, mode: BakeMode = "teal"): Buffer {
  const img = isWireframeRef(absPath) ? wireframePNG(absPath) : absPath;
  if (!img) throw new Error(`No rendered wireframe for ${absPath}`);
  return isWireframeRef(absPath) ? bakeImage(img, cacheDir, 0.4, mode === "teal" ? "wire" : mode) : bakeImage(img, cacheDir, roughness, mode);
}

export const cacheDirFor = (boardFile: string) => join(dirname(resolve(boardFile)), ".storyboard-cache");

/** Asset resolver for export: every screen becomes an inline, baked PNG data URI. */
export function exportAssetResolver(boardFile: string, mode: BakeMode = "teal") {
  const base = dirname(resolve(boardFile));
  const cache = cacheDirFor(boardFile);
  const memo = new Map<string, string | undefined>();
  return (p: string) => {
    if (memo.has(p)) return memo.get(p);
    const abs = resolve(base, p);
    let uri: string | undefined;
    if (existsSync(abs.replace(/#.*$/, ""))) {
      try { uri = `data:image/png;base64,${bakeScreen(abs, cache, 1, mode).toString("base64")}`; } catch { uri = undefined; }
    }
    memo.set(p, uri);
    return uri;
  };
}

export function fontFaceCss(embed: boolean): string {
  return embed ? inlineFonts() : "";
}

/** Unprocessed images (brand logos) as data URIs. */
export function rawAssetResolver(boardFile: string) {
  const base = dirname(resolve(boardFile));
  return (p: string) => {
    const abs = resolve(base, p);
    if (!existsSync(abs)) return undefined;
    return `data:${MIME[extname(abs).toLowerCase()] ?? "image/png"};base64,${readFileSync(abs).toString("base64")}`;
  };
}

export function boardToSVG(board: Board, boardFile: string, embedFonts = false, extra: { guides?: boolean } = {}): string {
  return renderBoardSVG(board, { ...extra, asset: exportAssetResolver(boardFile), sketch: exportAssetResolver(boardFile, "grey"), raw: rawAssetResolver(boardFile), fontCss: embedFonts ? fontFaceCss(true) : undefined });
}

/**
 * Each panel as its own PNG. We render the whole board once and crop, because rendering a panel on a
 * small canvas trips a resvg filter bug when art reaches past the edge (displacement_map size assert).
 */
const panelMemo = new Map<string, Buffer[]>();
export function panelPNGs(board: Board, boardFile: string, scale = 3): Buffer[] {
  const key = `${boardFile}:${scale}:${JSON.stringify(board)}`;
  const hit = panelMemo.get(key);
  if (hit) return hit;
  const out = cropPanels(board, boardFile, scale);
  panelMemo.clear();
  panelMemo.set(key, out);
  return out;
}

function cropPanels(board: Board, boardFile: string, scale: number): Buffer[] {
  const full = svgToPNG(boardToSVG(board, boardFile), scale).toString("base64");
  const { width, height } = pageSize(board);
  return board.panels.map((_, i) => {
    const r = panelRect(board, i);
    const crop = `<svg xmlns="http://www.w3.org/2000/svg" width="${r.w * scale}" height="${r.h * scale}"><image href="data:image/png;base64,${full}" x="${-r.x * scale}" y="${-r.y * scale}" width="${width * scale}" height="${height * scale}"/></svg>`;
    return renderPNG(crop);
  });
}

/** What's said in a panel, as plain lines (speaker notes, share page, alt text). */
function transcript(board: Board, i: number): string[] {
  return rawTranscript(board, i).map(plainText);
}
function rawTranscript(board: Board, i: number): string[] {
  const p = board.panels[i];
  const name = (id: string) => board.cast[id]?.name ?? id;
  if (p.type === "title") return [p.title, p.subtitle ?? ""].filter(Boolean);
  if (p.type === "time" || p.type === "text") return [p.text];
  if (!isScene(p)) return [];
  const out: string[] = [];
  if (p.caption) out.push(p.caption);
  for (const b of p.bubbles ?? []) out.push(`${b.from ? name(b.from) : "Voice"}${b.type === "thought" ? " (thinks)" : ""}: ${b.text}`);
  for (const c of p.callouts ?? []) out.push(`Note: ${c.text}`);
  if (p.workaround) out.push(`Workaround: ${p.workaround}`);
  return out;
}

/** One slide per panel, with the transcript and notes as speaker notes. */
export async function toPPTX(board: Board, boardFile: string): Promise<Buffer> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = board.title;
  const pngs = panelPNGs(board, boardFile, 3);
  const cover = pptx.addSlide();
  cover.background = { color: "FBFAF7" };
  cover.addText(board.title, { x: 0.7, y: 2.4, w: 12, h: 1.2, fontFace: "Permanent Marker", fontSize: 44, color: "1C1C1E" });
  const meta = [board.persona && `Persona: ${board.persona}`, board.subtitle].filter(Boolean).join("  ·  ");
  cover.addText(meta, { x: 0.7, y: 3.6, w: 12, h: 0.6, fontFace: "Patrick Hand", fontSize: 20, color: "4D535A" });
  board.panels.forEach((p, i) => {
    const slide = pptx.addSlide();
    slide.background = { color: "FBFAF7" };
    slide.addText(`${i + 1}${p.label ? ` · ${p.label}` : ""}`, { x: 0.5, y: 0.25, w: 12.3, h: 0.6, fontFace: "Patrick Hand", fontSize: 22, color: "4D535A" });
    const w = 11.2, h = (w * 272) / 412;
    slide.addImage({ data: `data:image/png;base64,${pngs[i].toString("base64")}`, x: (13.33 - w) / 2, y: 0.95, w, h, altText: transcript(board, i).join(" / ") || p.label || `Panel ${i + 1}` });
    slide.addNotes([...transcript(board, i), p.notes ? `Notes: ${p.notes}` : ""].filter(Boolean).join("\n"));
  });
  return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** A single self-contained HTML file to share: panels, transcript, and a comment box per panel (saved in the viewer's browser, copyable as Markdown). */
export function toShareHTML(board: Board, boardFile: string): string {
  const pngs = panelPNGs(board, boardFile, 3);
  const face = (f: string, file: string) => `@font-face{font-family:"${f}";src:url(data:font/ttf;base64,${readFileSync(join(FONT_DIR, file)).toString("base64")})}`;
  const key = `storyboard-comments:${board.title}`;
  const cards = board.panels.map((p, i) => `
  <article class="card" id="${esc(p.id)}">
    <img src="data:image/png;base64,${pngs[i].toString("base64")}" alt="${esc(transcript(board, i).join(" / ") || `Panel ${i + 1}`)}">
    <h2>${i + 1}${p.label ? ` · ${esc(p.label)}` : ""}</h2>
    ${p.notes ? `<p class="notes">${esc(p.notes)}</p>` : ""}
    <label>Your comment on panel ${i + 1}<textarea data-panel="${esc(p.id)}" rows="2" placeholder="What's missing or wrong in this moment?"></textarea></label>
  </article>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(board.title)}</title>
<style>${face("Permanent Marker", "PermanentMarker-Regular.ttf")}${face("Patrick Hand", "PatrickHand-Regular.ttf")}
:root{--paper:#fbfaf7;--ink:#1c1c1e;--grey:#4d535a;--line:#b9bec4;--teal:#0b7f8a}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--paper:#1c1c1e;--ink:#f1f1ef;--grey:#b9bec4;--line:#4d535a;--teal:#8fd6dc}}
body{margin:0;background:var(--paper);color:var(--ink);font-family:"Patrick Hand",cursive;font-size:18px}
header{padding:24px 16px 8px;max-width:1100px;margin:0 auto}
h1{font-family:"Permanent Marker",cursive;font-weight:400;font-size:clamp(28px,5vw,44px);margin:0}
.meta{color:var(--grey);margin:6px 0 0}.share{color:var(--teal)}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:24px;padding:16px;max-width:1100px;margin:0 auto}
.card img{width:100%;height:auto;display:block;background:#fbfaf7}
.card h2{font-size:18px;font-weight:400;color:var(--grey);margin:6px 0}
.notes{font-size:15px;color:var(--grey);margin:0 0 6px}
label{display:block;font-size:14px;color:var(--grey)}
textarea{display:block;width:100%;box-sizing:border-box;margin-top:4px;font:inherit;font-size:16px;color:var(--ink);background:transparent;border:1.5px solid var(--line);padding:6px}
footer{max-width:1100px;margin:0 auto;padding:8px 16px 40px}
button{font:inherit;font-size:16px;background:var(--ink);color:var(--paper);border:0;padding:8px 14px;cursor:pointer}
.ok{margin-left:10px;color:var(--teal)}
</style></head><body>
<header><h1>${esc(board.title)}</h1><p class="meta">${esc([board.persona && `Persona: ${board.persona}`, board.subtitle].filter(Boolean).join(" · "))}</p></header>
<main>${cards}</main>
<footer><button id="copy">Copy my comments</button><span class="ok" id="ok" hidden>Copied as Markdown. Paste them back to the designer.</span></footer>
<script>
const KEY=${JSON.stringify(key)};let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||"{}")}catch{}
document.querySelectorAll("textarea").forEach(t=>{t.value=saved[t.dataset.panel]||"";t.addEventListener("input",()=>{saved[t.dataset.panel]=t.value;try{localStorage.setItem(KEY,JSON.stringify(saved))}catch{}})});
document.getElementById("copy").onclick=async()=>{const md=[...document.querySelectorAll("textarea")].filter(t=>t.value.trim()).map(t=>"- **"+t.closest(".card").querySelector("h2").textContent+"**: "+t.value.trim()).join("\n");try{await navigator.clipboard.writeText(md||"(no comments)");document.getElementById("ok").hidden=false}catch{alert(md)}};
</script>
<!-- screenplay: ${esc(toScript(board)).replace(/--/g, "- -")} -->
</body></html>`;
}

export function svgToPNG(svg: string, scale = 2): Buffer {
  return renderPNG(svg, { scale, fonts: drawingFonts() });
}

export async function pngToPDF(png: Buffer, widthPx: number, heightPx: number): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const img = await pdf.embedPng(png);
  const w = widthPx * 0.75, h = heightPx * 0.75;
  const page = pdf.addPage([w, h]);
  page.drawImage(img, { x: 0, y: 0, width: w, height: h });
  pdf.setTitle("Storyboard");
  return pdf.save();
}
