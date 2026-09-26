import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync, watch, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { applyOps, formatStoryboard, type Op } from "../json";
import { validate } from "../validate";
import { bakeScreen, boardToSVG, cacheDirFor, pngToPDF, svgToPNG, toPPTX, toShareHTML } from "../export";
import { pageSize } from "../render";
import type { Board } from "../types";

const EDITOR_DIR = fileURLToPath(new URL("./editor/", import.meta.url));
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ttf": "font/ttf", ".json": "application/json",
};

export interface DevOptions { port: number; open: boolean }

export async function dev(file: string, o: DevOptions) {
  const abs = resolve(file);
  const base = dirname(abs);
  const cache = cacheDirFor(abs);
  if (!existsSync(abs)) throw new Error(`No such file: ${file}. Create it first (see \`storyboard vocab\` and the skill).`);
  if (!existsSync(join(EDITOR_DIR, "index.html"))) throw new Error("Editor build missing. Run `npm run build` in the storyboardkit package.");

  let lastWritten = "";
  let version = 0;
  const clients = new Set<ServerResponse>();
  const read = (): Board => JSON.parse(readFileSync(abs, "utf8"));
  const write = (b: Board) => {
    lastWritten = formatStoryboard(b);
    writeFileSync(abs, lastWritten);
    version++;
  };
  const broadcast = (msg: object) => { for (const c of clients) c.write(`data: ${JSON.stringify(msg)}\n\n`); };

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

  const body = (req: IncomingMessage): Promise<Buffer> => new Promise((ok, fail) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c)); req.on("end", () => ok(Buffer.concat(chunks))); req.on("error", fail);
  });
  const json = (res: ServerResponse, code: number, obj: unknown) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
  const safePath = (p: string) => {
    const full = normalize(resolve(base, decodeURIComponent(p)));
    return full.startsWith(base + sep) || full === base ? full : undefined;
  };

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
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
        res.write(`data: ${JSON.stringify({ type: "hello", version })}\n\n`);
        clients.add(res);
        req.on("close", () => clients.delete(res));
        return;
      }
      if (url.pathname.startsWith("/baked/")) {
        const p = safePath(url.pathname.slice("/baked/".length));
        if (!p || !existsSync(p)) { res.writeHead(404); return res.end(); }
        const png = bakeScreen(p, cache, Number(url.searchParams.get("r") ?? 1));
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
        const dir = join(base, "screens");
        mkdirSync(dir, { recursive: true });
        let name = raw + ext, i = 2;
        while (existsSync(join(dir, name))) name = `${basename(raw, extname(raw))}-${i++}${extname(raw) || ext}`;
        writeFileSync(join(dir, name), await body(req));
        return json(res, 200, { path: "./" + relative(base, join(dir, name)).split(sep).join("/") });
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
      // static editor
      const rel = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      const p = normalize(join(EDITOR_DIR, rel));
      if (p.startsWith(EDITOR_DIR) && existsSync(p) && statSync(p).isFile()) {
        res.writeHead(200, { "content-type": TYPES[extname(p)] ?? "application/octet-stream" });
        return res.end(readFileSync(p));
      }
      res.writeHead(404); res.end("not found");
    } catch (e) {
      json(res, 500, { error: (e as Error).message });
    }
  });

  const port = await new Promise<number>((ok, fail) => {
    const tryPort = (n: number) => {
      server.once("error", (err: NodeJS.ErrnoException) => (err.code === "EADDRINUSE" && n < o.port + 20 ? tryPort(n + 1) : fail(err)));
      server.listen(n, "127.0.0.1", () => ok(n));
    };
    tryPort(o.port);
  });
  const link = `http://localhost:${port}/`;
  console.log(`storyboard editor → ${link}\n  editing ${relative(process.cwd(), abs)} (changes save to the file; agent edits reload live)\n  Ctrl+C to stop`);
  if (o.open) {
    const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
    const args = process.platform === "win32" ? ["/c", "start", link] : [link];
    spawn(cmd, args, { stdio: "ignore", detached: true }).unref();
  }
}
