import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { PDFDocument } from "pdf-lib";
import type { Board } from "./types";
import { renderBoardSVG } from "./render";

export const FONT_DIR = fileURLToPath(new URL("../assets/fonts/", import.meta.url));
export const FONT_FILES = ["PermanentMarker-Regular.ttf", "PatrickHand-Regular.ttf"].map((f) => join(FONT_DIR, f));

const MIME: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };

/** Width/height of a PNG or JPEG without decoding it. */
export function imageSize(buf: Buffer): { w: number; h: number } | undefined {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      i += 2 + len;
    }
  }
  return undefined;
}

/**
 * The teal duotone "sketchify" pass from decision 7: grayscale → 4 teal tones → faint ink edges → slight wobble.
 * Runs once per screen and is cached, so the editor and export always show the same pixels.
 */
export function duotoneSVG(dataUri: string, w: number, h: number, roughness = 1): string {
  const k = w / 180;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<filter id="d" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
<feColorMatrix type="saturate" values="0" result="g"/>
<feComponentTransfer in="g" result="post"><feFuncR type="discrete" tableValues="0.11 0.05 0.56 0.98"/><feFuncG type="discrete" tableValues="0.11 0.60 0.84 0.98"/><feFuncB type="discrete" tableValues="0.12 0.65 0.86 0.97"/></feComponentTransfer>
<feConvolveMatrix in="g" order="3" kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" preserveAlpha="true" result="e"/>
<feColorMatrix in="e" type="matrix" values="0 0 0 0 0.11  0 0 0 0 0.11  0 0 0 0 0.12  0.3 0.3 0.3 0 0" result="lines"/>
<feMerge result="m"><feMergeNode in="post"/><feMergeNode in="lines"/></feMerge>
<feTurbulence type="fractalNoise" baseFrequency="${(0.04 / k).toFixed(4)}" numOctaves="2" seed="7" result="n"/>
<feDisplacementMap in="m" in2="n" scale="${(1.1 * k * roughness).toFixed(2)}"/>
</filter>
<rect width="100%" height="100%" fill="#fbfaf7"/>
<image href="${dataUri}" width="${w}" height="${h}" filter="url(#d)"/>
</svg>`;
}

const MAX_BAKE_W = 720;

/** Bake (or fetch from cache) the teal duotone version of a screen image. Returns PNG bytes. */
export function bakeScreen(absPath: string, cacheDir: string, roughness = 1): Buffer {
  const st = statSync(absPath);
  const key = createHash("sha1").update(`${absPath}:${st.mtimeMs}:${st.size}:${roughness}:v1`).digest("hex").slice(0, 12);
  const out = join(cacheDir, `${basename(absPath, extname(absPath))}-${key}.png`);
  if (existsSync(out)) return readFileSync(out);
  const buf = readFileSync(absPath);
  const size = imageSize(buf) ?? { w: 390, h: 844 };
  const scale = Math.min(1, MAX_BAKE_W / size.w);
  const w = Math.round(size.w * scale), h = Math.round(size.h * scale);
  const mime = MIME[extname(absPath).toLowerCase()] ?? "image/png";
  const svg = duotoneSVG(`data:${mime};base64,${buf.toString("base64")}`, w, h, roughness);
  const png = new Resvg(svg, { fitTo: { mode: "original" } }).render().asPng();
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(out, png);
  return png;
}

export const cacheDirFor = (boardFile: string) => join(dirname(resolve(boardFile)), ".storyboard-cache");

/** Asset resolver for export: every screen becomes an inline, baked PNG data URI. */
export function exportAssetResolver(boardFile: string) {
  const base = dirname(resolve(boardFile));
  const cache = cacheDirFor(boardFile);
  const memo = new Map<string, string | undefined>();
  return (p: string) => {
    if (memo.has(p)) return memo.get(p);
    const abs = resolve(base, p);
    let uri: string | undefined;
    if (existsSync(abs)) {
      try { uri = `data:image/png;base64,${bakeScreen(abs, cache).toString("base64")}`; } catch { uri = undefined; }
    }
    memo.set(p, uri);
    return uri;
  };
}

export function fontFaceCss(embed: boolean): string {
  const face = (family: string, file: string) =>
    `@font-face{font-family:"${family}";src:url(data:font/ttf;base64,${readFileSync(join(FONT_DIR, file)).toString("base64")}) format("truetype");}`;
  return embed ? face("Permanent Marker", "PermanentMarker-Regular.ttf") + face("Patrick Hand", "PatrickHand-Regular.ttf") : "";
}

export function boardToSVG(board: Board, boardFile: string, embedFonts = false): string {
  return renderBoardSVG(board, { asset: exportAssetResolver(boardFile), fontCss: embedFonts ? fontFaceCss(true) : undefined });
}

export function svgToPNG(svg: string, scale = 2): Buffer {
  const r = new Resvg(svg, {
    fitTo: { mode: "zoom", value: scale },
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: "Patrick Hand" },
    imageRendering: 0,
  });
  return r.render().asPng();
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
