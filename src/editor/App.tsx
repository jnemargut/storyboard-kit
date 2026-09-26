import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { applyOps, type Op } from "../json";
import { BoardSVG, pageSize } from "../render/board";
import type { Board, LayoutOverride, ScenePanel } from "../types";
import { isScene } from "../types";
import type { Result } from "../validate";
import { api, assetUrl } from "./api";
import { Drawer, applyAdd, type AddPayload } from "./Drawer";
import { heldScreenOps, layoutOps, locate, panelIndex, type Kind, type Sel } from "./model";
import { Toolbar } from "./Toolbar";

interface Box { x: number; y: number; w: number; h: number }
type Drag = { mode: "move" | "resize"; sx: number; sy: number; ov: LayoutOverride; size: number; moved: boolean; sel: Sel };

const TEXT_KINDS: Kind[] = ["bubble", "caption", "text", "callout"];
const SCALABLE: Kind[] = ["character", "device"];

export function App() {
  const [board, setBoard] = useState<Board | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [file, setFile] = useState("");
  const [sel, setSel] = useState<Sel | null>(null);
  const [draft, setDraft] = useState<Op[] | null>(null);
  const [past, setPast] = useState<Board[]>([]);
  const [future, setFuture] = useState<Board[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [bust, setBust] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [editing, setEditing] = useState<{ sel: Sel; field: string; value: string; box: Box } | null>(null);
  const [dropping, setDropping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const svgWrap = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const boardRef = useRef<Board | null>(null);
  boardRef.current = board;

  const flash = useCallback((m: string) => { setToast(m); window.setTimeout(() => setToast(null), 2200); }, []);

  const reload = useCallback(async (why?: string) => {
    try {
      const r = await api.load();
      setBoard(r.board); setResult(r.result); setFile(r.file ?? "");
      setBust((b) => b + 1);
      setError(null);
      if (why) flash(why);
    } catch (e) { setError((e as Error).message); }
  }, [flash]);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    const es = new EventSource("/api/events");
    es.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.type === "change" && msg.source === "file") void reload("Updated from the file (agent edit)");
      if (msg.type === "invalid") flash(msg.message);
    };
    return () => es.close();
  }, [reload, flash]);

  const commit = useCallback(async (ops: Op[], label?: string) => {
    const cur = boardRef.current;
    if (!cur || ops.length === 0) return;
    setPast((p) => [...p.slice(-80), cur]);
    setFuture([]);
    setBoard(applyOps(cur, ops));
    try {
      const r = await api.patch(ops);
      setBoard(r.board); setResult(r.result);
      if (label) flash(label);
    } catch (e) { flash(`Save failed: ${(e as Error).message}`); void reload(); }
  }, [flash, reload]);

  const replaceAll = useCallback(async (next: Board) => {
    setBoard(next);
    try { const r = await api.put(next); setBoard(r.board); setResult(r.result); } catch (e) { flash(`Save failed: ${(e as Error).message}`); }
  }, [flash]);

  const undo = useCallback(() => {
    if (!past.length || !board) return;
    const prev = past[past.length - 1];
    setPast(past.slice(0, -1)); setFuture([board, ...future]);
    void replaceAll(prev);
  }, [past, future, board, replaceAll]);
  const redo = useCallback(() => {
    if (!future.length || !board) return;
    const [next, ...rest] = future;
    setFuture(rest); setPast([...past, board]);
    void replaceAll(next);
  }, [past, future, board, replaceAll]);

  const shown = useMemo(() => (board && draft ? applyOps(board, draft) : board), [board, draft]);
  const size = shown ? pageSize(shown) : { width: 1, height: 1 };
  const opts = useMemo(() => ({ asset: assetUrl(bust), wobble: !draft }), [bust, draft]);

  // ------------------------------------------------------------ selection geometry
  const measure = useCallback((s: Sel | null): Box | null => {
    const wrap = svgWrap.current;
    if (!s || !wrap) return null;
    const pq = `g[data-panel="${CSS.escape(s.panel)}"]`;
    const nodes = s.kind === "panel" ? Array.from(wrap.querySelectorAll(`${pq} > rect[data-el="__panel"]`)) : Array.from(wrap.querySelectorAll(`${pq} [data-el="${CSS.escape(s.el)}"]`));
    if (!nodes.length) return null;
    const base = wrap.getBoundingClientRect();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of nodes) {
      const r = n.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
    }
    if (!isFinite(x0)) return null;
    // clamp to the panel so off-camera parts don't balloon the box
    const panelEl = wrap.querySelector(`${pq} > rect[data-el="__panel"]`);
    if (panelEl && s.kind !== "panel") {
      const pr = panelEl.getBoundingClientRect();
      x0 = Math.max(x0, pr.left); y0 = Math.max(y0, pr.top); x1 = Math.min(x1, pr.right); y1 = Math.min(y1, pr.bottom);
    }
    return { x: x0 - base.left, y: y0 - base.top, w: x1 - x0, h: y1 - y0 };
  }, []);

  useLayoutEffect(() => { setBox(measure(sel)); }, [sel, shown, measure]);
  useEffect(() => {
    const on = () => setBox(measure(sel));
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, [sel, measure]);

  const k = () => (svgWrap.current ? svgWrap.current.getBoundingClientRect().width / size.width : 1);
  const ovOf = (b: Board, s: Sel): LayoutOverride => b.panels[panelIndex(b, s.panel)]?.layout?.[s.el] ?? {};

  // ------------------------------------------------------------ pointer: select / move / resize
  const onPointerDown = (e: React.PointerEvent) => {
    if (!board || editing) return;
    const t = e.target as Element;
    if ((t as HTMLElement).classList?.contains("handle") && sel) {
      drag.current = { mode: "resize", sx: e.clientX, sy: e.clientY, ov: ovOf(board, sel), size: (box?.w ?? 50) + (box?.h ?? 50), moved: false, sel };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    const pn = t.closest("[data-panel]") as SVGElement | null;
    if (!pn) { setSel(null); return; }
    const en = t.closest("[data-el]") as SVGElement | null;
    const el = en?.dataset.el;
    const next: Sel = !el || el === "__panel" ? { panel: pn.dataset.panel!, el: "__panel", kind: "panel" } : { panel: pn.dataset.panel!, el, kind: (en!.dataset.kind ?? "character") as Kind };
    setSel(next);
    if (next.kind !== "panel") {
      drag.current = { mode: "move", sx: e.clientX, sy: e.clientY, ov: ovOf(board, next), size: 0, moved: false, sel: next };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !board) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 3) return;
    d.moved = true;
    const pi = panelIndex(board, d.sel.panel);
    if (d.mode === "move") {
      const s = k();
      setDraft(layoutOps(pi, d.sel.el, { dx: Math.round((d.ov.dx ?? 0) + dx / s), dy: Math.round((d.ov.dy ?? 0) + dy / s) }));
    } else {
      const f = Math.max(0.3, Math.min(4, (d.ov.scale ?? 1) * (1 + (dx + dy) / Math.max(40, d.size))));
      setDraft(layoutOps(pi, d.sel.el, { scale: Math.round(f * 100) / 100 }));
    }
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.moved && draft) { const ops = draft; setDraft(null); void commit(ops); }
    else setDraft(null);
  };

  // ------------------------------------------------------------ inline text editing
  const textField = (b: Board, s: Sel): { field: string; value: string } | null => {
    const p = b.panels[panelIndex(b, s.panel)];
    if (!p) return null;
    if (s.kind === "caption" && isScene(p)) return { field: "caption", value: p.caption ?? "" };
    if (s.kind === "text") {
      const f = s.el === "subtitle" ? "subtitle" : s.el === "title" ? "title" : "text";
      return { field: f, value: String((p as unknown as Record<string, unknown>)[f] ?? "") };
    }
    const loc = locate(p, s.el);
    if (loc && (loc.key === "bubbles" || loc.key === "callouts")) {
      return { field: "text", value: ((p as ScenePanel)[loc.key]![loc.index] as { text: string }).text };
    }
    return null;
  };
  const startEdit = (s: Sel) => {
    if (!board || !box) return;
    const f = textField(board, s);
    if (f) setEditing({ sel: s, field: f.field, value: f.value, box });
  };
  const finishEdit = (save: boolean) => {
    if (!editing || !board) return setEditing(null);
    const { sel: s, field, value } = editing;
    setEditing(null);
    if (!save) return;
    const pi = panelIndex(board, s.panel);
    const p = board.panels[pi];
    const loc = locate(p, s.el);
    const path = loc ? ["panels", pi, loc.key, loc.index, field] : ["panels", pi, field];
    void commit([{ path, value: value.trim() }]);
  };

  // ------------------------------------------------------------ keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (e.key === "Escape") { setSel(null); return; }
      if (!sel || !board) return;
      if (e.key === "Enter" && TEXT_KINDS.includes(sel.kind)) { e.preventDefault(); startEdit(sel); return; }
      const step = e.shiftKey ? 10 : 2;
      const arrows: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (arrows[e.key] && sel.kind !== "panel") {
        e.preventDefault();
        const ov = ovOf(board, sel);
        void commit(layoutOps(panelIndex(board, sel.panel), sel.el, { dx: (ov.dx ?? 0) + arrows[e.key][0], dy: (ov.dy ?? 0) + arrows[e.key][1] }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ------------------------------------------------------------ drop: images onto devices, drawer items onto panels
  const uploadTo = async (f: File, target: Sel) => {
    if (!board) return;
    const { path } = await api.upload(f);
    let ops = heldScreenOps(board, target, path);
    if (!ops.length) {
      const pi = panelIndex(board, target.panel);
      const p = board.panels[pi];
      if (!isScene(p)) return flash("Drop screens onto a device or a person holding one.");
      ops = [{ path: ["panels", pi, "devices", (p.devices ?? []).length], value: { type: "phone", screen: path } }];
    }
    setBust((b) => b + 1);
    await commit(ops, "Screen added (sketchified in teal)");
  };
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDropping(false);
    if (!board) return;
    const hit = document.elementFromPoint(e.clientX, e.clientY);
    const pn = hit?.closest("[data-panel]") as SVGElement | null;
    const img = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"));
    if (img) {
      if (!pn) return flash("Drop the image onto a panel.");
      const dn = hit?.closest("[data-drop]") as SVGElement | null;
      let target: Sel = { panel: pn.dataset.panel!, el: "__panel", kind: "panel" };
      if (dn) { const [kind, id] = dn.dataset.drop!.split(":"); target = { panel: pn.dataset.panel!, el: id, kind: kind === "char" ? "character" : "device" }; }
      else { const en = hit?.closest("[data-el]") as SVGElement | null; if (en && en.dataset.kind === "character") target = { panel: pn.dataset.panel!, el: en.dataset.el!, kind: "character" }; }
      try { await uploadTo(img, target); } catch (err) { flash(`Upload failed: ${(err as Error).message}`); }
      return;
    }
    const raw = e.dataTransfer.getData("application/x-storyboard");
    if (raw) {
      const payload = JSON.parse(raw) as AddPayload;
      const pi = pn ? panelIndex(board, pn.dataset.panel!) : board.panels.length - 1;
      const res = applyAdd(board, payload, pi, sel);
      if (typeof res === "string") return flash(res);
      await commit(res.ops, res.label);
      if (res.select) setSel(res.select);
    }
  };

  if (error && !board) return <div style={{ padding: 40 }}>Couldn't load the storyboard: {error}</div>;
  if (!board || !shown) return <div style={{ padding: 40, fontFamily: "Patrick Hand", fontSize: 22 }}>Loading storyboard…</div>;

  const nErr = result?.errors.length ?? 0, nWarn = result?.warnings.length ?? 0;
  const deskW = Math.min(size.width, 2400);

  return (
    <div className="app">
      <TopBar file={file} nErr={nErr} nWarn={nWarn} result={result} canUndo={past.length > 0} canRedo={future.length > 0} undo={undo} redo={redo}
        board={board} commit={commit} />
      <div className={`desk${dropping ? " dropping" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDropping(true); }} onDragLeave={() => setDropping(false)} onDrop={onDrop}>
        <div className="desk-inner" style={{ width: deskW, maxWidth: "100%" }}>
          <div ref={svgWrap} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
            onDoubleClick={() => sel && TEXT_KINDS.includes(sel.kind) && startEdit(sel)} style={{ position: "relative" }}>
            <BoardSVG board={shown} opts={opts} />
            {box && sel && (
              <div className={`sel-box${sel.kind === "panel" ? " panel" : ""}`} style={{ left: box.x - 3, top: box.y - 3, width: box.w + 6, height: box.h + 6 }}>
                {SCALABLE.includes(sel.kind) && <div className="handle" title="Drag to resize" />}
              </div>
            )}
          </div>
          {box && sel && !draft && !editing && (
            <Toolbar board={board} sel={sel} box={box} commit={commit} setSel={setSel} startEdit={() => startEdit(sel)}
              upload={(f) => uploadTo(f, sel).catch((err) => flash(`Upload failed: ${(err as Error).message}`))} />
          )}
          {editing && (
            <textarea className="inline-edit" autoFocus value={editing.value}
              style={{ left: editing.box.x - 4, top: editing.box.y - 4, width: Math.max(180, editing.box.w + 8), height: Math.max(56, editing.box.h + 8) }}
              onChange={(e) => setEditing({ ...editing, value: e.target.value })}
              onBlur={() => finishEdit(true)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); finishEdit(true); } if (e.key === "Escape") finishEdit(false); }} />
          )}
        </div>
        {!sel && <div className="empty-hint">Click anything to edit · drag to move · drop a screen image onto a phone</div>}
      </div>
      <Drawer board={board} sel={sel} commit={commit} setSel={setSel} flash={flash} />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function TopBar(props: {
  file: string; nErr: number; nWarn: number; result: Result | null; canUndo: boolean; canRedo: boolean; undo: () => void; redo: () => void;
  board: Board; commit: (ops: Op[], label?: string) => Promise<void>;
}) {
  const [menu, setMenu] = useState<null | "export" | "layout" | "issues">(null);
  const { nErr, nWarn, result } = props;
  const status = nErr ? `${nErr} error${nErr > 1 ? "s" : ""}` : nWarn ? `${nWarn} suggestion${nWarn > 1 ? "s" : ""}` : "Saved to file · valid";
  const toggle = (m: typeof menu) => setMenu(menu === m ? null : m);
  return (
    <div className="top" onMouseLeave={() => setMenu(null)}>
      <span className="brand">Storyboard</span>
      <span className="file">{props.file}</span>
      <span className="spacer" />
      <div className="menu">
        <button className={`btn ghost status ${nErr ? "err" : nWarn ? "warn" : "ok"}`} onClick={() => toggle("issues")}>{status}</button>
        {menu === "issues" && result && (nErr + nWarn > 0) && (
          <div className="menu-list issues">
            <ul>{[...result.errors.map((x) => ({ ...x, e: true })), ...result.warnings.map((x) => ({ ...x, e: false }))].map((x, i) => (
              <li key={i}><b>{x.e ? "Error" : "Tip"}</b> <code>{x.path.replace("$.", "")}</code> {x.message}{x.hint && <><br />{x.hint}</>}</li>
            ))}</ul>
          </div>
        )}
      </div>
      <button className="btn" onClick={props.undo} disabled={!props.canUndo} title="Undo (Cmd+Z)">Undo</button>
      <button className="btn" onClick={props.redo} disabled={!props.canRedo} title="Redo (Shift+Cmd+Z)">Redo</button>
      <div className="menu">
        <button className="btn" onClick={() => toggle("layout")}>Layout: {props.board.page?.columns ? `${props.board.page.columns} across` : "auto"}</button>
        {menu === "layout" && (
          <div className="menu-list">
            {[0, 1, 2, 3, 4, 5, 6].map((n) => (
              <button key={n} onClick={() => { setMenu(null); void props.commit(n ? [{ path: ["page", "columns"], value: n }] : [{ path: ["page"], delete: true }]); }}>
                {n ? `${n} across` : "Auto"}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="menu">
        <button className="btn dark" onClick={() => toggle("export")}>Export</button>
        {menu === "export" && (
          <div className="menu-list">
            <a href="/api/export?format=png&scale=2" download>PNG (2x)</a>
            <a href="/api/export?format=png&scale=3" download>PNG (3x, print)</a>
            <a href="/api/export?format=pdf" download>PDF</a>
            <a href="/api/export?format=svg" download>SVG</a>
          </div>
        )}
      </div>
    </div>
  );
}
