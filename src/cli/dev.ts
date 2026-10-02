import { createServer } from "node:http";
import { croppedImage, isCrop } from "../sketch/bake";
import { existsSync, mkdirSync, readFileSync, statSync, watch, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { applyOps, formatStoryboard, type Op } from "../sketch/json";
import { embedMeta } from "../sketch/pngmeta";
import { eventHub, listenFree, openBrowser, readBody, safePathUnder, sendJSON, serveStatic, TYPES } from "../sketch/server";
import { validate } from "../validate";
import { bakeScreen, boardToSVG, cacheDirFor, panelPNGs, pngToPDF, svgToPNG, toPPTX, toShareHTML } from "../export";
import { pageSize } from "../render";
import type { Board } from "../types";

const EDITOR_DIR = fileURLToPath(new URL("./editor/", import.meta.url));
export interface DevOptions { port: number; open: boolean }

export async function dev(file: string, o: DevOptions) {
  const abs = resolve(file);
  const base = dirname(abs);
  const cache = cacheDirFor(abs);
  if (!existsSync(abs)) throw new Error(`No such file: ${file}. Create it first (see \`storyboard vocab\` and the skill).`);
  if (!existsSync(join(EDITOR_DIR, "index.html"))) throw new Error("Editor build missing. Run `npm run build` in the storyboardkit package.");

  let lastWritten = "";
  let version = 0;
  const events = eventHub();
  const read = (): Board => JSON.parse(readFileSync(abs, "utf8"));
  const write = (b: Board) => {
    lastWritten = formatStoryboard(b);
    writeFileSync(abs, lastWritten);
    version++;
  };
  const broadcast = events.broadcast;

  // Agent (or anyone) edited the file: tell the editor to reload.
  let t: NodeJS.Timeout | undefined;
  watch(abs, () => {
    clearTimeout(t);
    t = setTimeout(() => {
      let text = "";
      try { text = readFileSync(abs, "utf8"); } catch { return; }
      if (text === lastWritten) return;
      try { JSON.parse(text); } catch { broadcast({ type: "invalid", message: "The file isn't valid JSON right now (still being written?)." }); return; }
      version++;
      broadcast({ type: "change", version, source: "file" });
    }, 120);
  });

  // A Wireframe Kit screen next to the board changed: bump so the editor re-fetches (and re-renders) it.
  let tw: NodeJS.Timeout | undefined;
  try {
    watch(base, (_e, name) => {
      if (!name || !/\.wireframe\.json$/.test(String(name))) return;
      clearTimeout(tw);
      tw = setTimeout(() => { version++; broadcast({ type: "change", version, source: "file" }); }, 200);
    });
  } catch { /* directory watching unsupported: edits still show on reload */ }

  const body = readBody;
  const json = sendJSON;
  const safePath = (p: string) => safePathUnder(base, p);

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    // Writes require a custom header: browsers can't send it cross-site without a CORS preflight we never grant.
    if (req.method !== "GET" && req.headers["x-storyboard"] !== "1") { res.writeHead(403); return res.end("forbidden"); }
    try {
      if (url.pathname === "/api/board" && req.method === "GET") {
        const board = read();
        return json(res, 200, { board, version, file: basename(abs), result: validate(board) });
      }
      if (url.pathname === "/api/board" && req.method === "PATCH") {
        const { ops } = JSON.parse((await body(req)).toString()) as { ops: Op[] };
        const next = applyOps(read(), ops);
        write(next);
        broadcast({ type: "change", version, source: "editor" });
        return json(res, 200, { board: next, version, result: validate(next) });
      }
      if (url.pathname === "/api/board" && req.method === "PUT") {
        const next = JSON.parse((await body(req)).toString()) as Board;
        write(next);
        broadcast({ type: "change", version, source: "editor" });
        return json(res, 200, { board: next, version, result: validate(next) });
      }
      if (url.pathname === "/api/events") {
        return events.attach(req, res, { type: "hello", version });
      }
      if (url.pathname.startsWith("/baked/")) {
        const p = safePath(url.pathname.slice("/baked/".length));
        if (!p || !existsSync(p.replace(/#.*$/, ""))) { res.writeHead(404); return res.end(); }
        const c = url.searchParams.get("crop")?.split(",").map(Number);
        const crop = isCrop(c) ? c : undefined;
        if (url.searchParams.get("raw") === "1") { const pic = croppedImage(p, cache, crop); res.writeHead(200, { "content-type": pic.mime, "cache-control": "no-cache" }); return res.end(pic.buf); }
        const png = bakeScreen(p, cache, Number(url.searchParams.get("r") ?? 1), url.searchParams.get("mode") === "grey" ? "grey" : "teal", crop);
        res.writeHead(200, { "content-type": "image/png", "cache-control": "no-cache" });
        return res.end(png);
      }
      if (url.pathname.startsWith("/files/")) {
        const p = safePath(url.pathname.slice("/files/".length));
        if (!p || !existsSync(p) || !statSync(p).isFile()) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { "content-type": TYPES[extname(p).toLowerCase()] ?? "application/octet-stream" });
        return res.end(readFileSync(p));
      }
      if (url.pathname === "/api/upload" && req.method === "POST") {
        const raw = (url.searchParams.get("name") ?? "screen.png").toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
        const ext = [".png", ".jpg", ".jpeg", ".webp"].includes(extname(raw)) ? "" : ".png";
        const dir = join(base, url.searchParams.get("dir") === "images" ? "images" : "screens");
        mkdirSync(dir, { recursive: true });
        let name = raw + ext, i = 2;
        while (existsSync(join(dir, name))) name = `${basename(raw, extname(raw))}-${i++}${extname(raw) || ext}`;
        writeFileSync(join(dir, name), await body(req));
        return json(res, 200, { path: "./" + relative(base, join(dir, name)).split(sep).join("/") });
      }
      if (url.pathname === "/api/panel.png") {
        // one panel as a PNG, for copying a frame into other tools (Figma, Slack, a doc, a Flowchart Kit board…)
        const board = read();
        const i = board.panels.findIndex((p) => p.id === url.searchParams.get("id"));
        if (i < 0) { res.writeHead(404); return res.end(); }
        // tagged with where it came from, so pasting it into Flowchart Kit makes a live card, not a flat picture
        const png = embedMeta(panelPNGs(board, abs, Math.min(4, Math.max(1, Number(url.searchParams.get("scale") ?? 2))))[i], "storyboard-kit", { file: basename(abs), panel: board.panels[i].id });
        res.writeHead(200, { "content-type": "image/png", "cache-control": "no-cache" });
        return res.end(png);
      }
      if (url.pathname === "/api/export") {
        const fmt = url.searchParams.get("format") ?? "png";
        const scale = Number(url.searchParams.get("scale") ?? 2);
        const board = read();
        const stem = basename(abs).replace(/\.storyboard\.json$|\.json$/, "");
        if (fmt === "pptx") {
          res.writeHead(200, { "content-type": "application/vnd.openxmlformats-officedocument.presentationml.presentation", "content-disposition": `attachment; filename="${stem}.pptx"` });
          return res.end(await toPPTX(board, abs));
        }
        if (fmt === "html") {
          res.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-disposition": `attachment; filename="${stem}.html"` });
          return res.end(toShareHTML(board, abs));
        }
        if (fmt === "svg") {
          res.writeHead(200, { "content-type": "image/svg+xml", "content-disposition": `attachment; filename="${stem}.svg"` });
          return res.end(boardToSVG(board, abs, true));
        }
        const png = svgToPNG(boardToSVG(board, abs), scale);
        if (fmt === "pdf") {
          const { width, height } = pageSize(board);
          const pdf = await pngToPDF(png, width, height);
          res.writeHead(200, { "content-type": "application/pdf", "content-disposition": `attachment; filename="${stem}.pdf"` });
          return res.end(Buffer.from(pdf));
        }
        res.writeHead(200, { "content-type": "image/png", "content-disposition": `attachment; filename="${stem}.png"` });
        return res.end(png);
      }
      if (serveStatic(EDITOR_DIR, url.pathname, res)) return;
      res.writeHead(404); res.end("not found");
    } catch (e) {
      json(res, 500, { error: (e as Error).message });
    }
  });

  const port = await listenFree(server, o.port);
  const link = `http://localhost:${port}/`;
  console.log(`storyboard editor → ${link}\n  editing ${relative(process.cwd(), abs)} (changes save to the file; agent edits reload live)\n  Ctrl+C to stop`);
  if (o.open) openBrowser(link);
}
