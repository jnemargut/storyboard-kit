import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { applyOps, type Op } from "../json";
import { BoardSVG, pageSize, panelOrigin } from "../render/board";
import type { Board, LayoutOverride, ScenePanel, Shape } from "../types";
import type { ShapeType } from "../vocab";
import { isScene } from "../types";
import type { Result } from "../validate";
import { api, assetUrl } from "./api";
import { Drawer, applyAdd, type AddPayload } from "./Drawer";
import { arrangeOps, deleteOps, heldScreenOps, layoutOps, locate, panelIndex, pasteOps, clipFor, ARRANGEABLE, type Arrange, type Clip, type Kind, type Sel } from "./model";
import { Toolbar } from "./Toolbar";

interface Box { x: number; y: number; w: number; h: number }
type Drag =
  | { mode: "move" | "resize"; sx: number; sy: number; ov: LayoutOverride; size: number; moved: boolean; sel: Sel }
  | { mode: "draw"; pi: number; pid: string; shape: Shape; index: number; moved: boolean }
  | { mode: "rotate"; cx: number; cy: number; a0: number; ov: LayoutOverride; moved: boolean; sel: Sel };

const TEXT_KINDS: Kind[] = ["bubble", "caption", "text", "callout", "header", "label", "workaround"];
const ROTATABLE: Kind[] = ["character", "device", "shape", "image"];
const SCALABLE: Kind[] = ["character", "device", "bubble", "caption", "callout", "text", "shape", "image"];

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
  const [zoom, setZoom] = useState<"fit" | number>("fit");
  /** Active drawing tool from the drawer's Draw tab; null = normal select/move. */
  const [tool, setTool] = useState<ShapeType | null>(null);
  // picking a drawing tool drops the selection, so its toolbar can't sit on top of where you draw
  useEffect(() => { if (tool) { setSel(null); (document.activeElement as HTMLElement | null)?.blur?.(); } }, [tool]);
  /** Whether newly added pictures get the grey marker sketch (remembered per browser). */
  const [sketchNew, setSketchNewState] = useState(() => { try { return localStorage.getItem("sb-sketch-new") !== "0"; } catch { return true; } });
  const setSketchNew = (v: boolean) => { setSketchNewState(v); try { localStorage.setItem("sb-sketch-new", v ? "1" : "0"); } catch { /* per-browser nicety only */ } };
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
  const opts = useMemo(() => ({ asset: assetUrl(bust), raw: (p: string) => `/files/${p.replace(/^\.\//, "")}?v=${bust}`, sketch: (p: string) => `${assetUrl(bust)(p)}&mode=grey`, wobble: !draft, editing: true }), [bust, draft]);

  // ------------------------------------------------------------ selection geometry
  const measure = useCallback((s: Sel | null): Box | null => {
    const wrap = svgWrap.current;
    if (!s || !wrap) return null;
    if (s.kind === "header" || s.kind === "label" || s.kind === "workaround") {
      const node = wrap.querySelector(s.kind === "header" ? `[data-header="${s.el}"]` : s.kind === "label" ? `[data-label="${CSS.escape(s.panel)}"]` : `[data-lane-workaround="${CSS.escape(s.panel)}"]`);
      if (!node) return null;
      const r = node.getBoundingClientRect(), base = wrap.getBoundingClientRect();
      return { x: r.left - base.left, y: r.top - base.top, w: Math.max(r.width, 120), h: Math.max(r.height, 16) };
    }
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
  /** Pointer → coordinates inside panel `pi` (400 × 260 units). */
  const panelPoint = (e: { clientX: number; clientY: number }, b: Board, pi: number): [number, number] => {
    const r = svgWrap.current!.getBoundingClientRect(), s = k();
    const [ox, oy] = panelOrigin(b, pi);
    return [Math.round((e.clientX - r.left) / s - ox), Math.round((e.clientY - r.top) / s - oy)];
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (!board || editing) return;
    const t = e.target as Element;
    if (tool) {
      const pn = t.closest("[data-panel]") as SVGElement | null;
      const pi = pn ? panelIndex(board, pn.dataset.panel!) : -1;
      const p = board.panels[pi];
      if (!p || !isScene(p)) { flash("Draw on a scene panel."); return; }
      const pt = panelPoint(e, board, pi);
      drag.current = { mode: "draw", pi, pid: p.id, shape: { type: tool, points: [pt, pt] }, index: (p.shapes ?? []).length, moved: false };
      setSel(null);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    if ((t as HTMLElement).classList?.contains("rot-handle") && sel && box) {
      const r = svgWrap.current!.getBoundingClientRect();
      const cx = r.left + box.x + box.w / 2, cy = r.top + box.y + box.h / 2;
      drag.current = { mode: "rotate", cx, cy, a0: Math.atan2(e.clientY - cy, e.clientX - cx), ov: ovOf(board, sel), moved: false, sel };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    if ((t as HTMLElement).classList?.contains("handle") && sel) {
      drag.current = { mode: "resize", sx: e.clientX, sy: e.clientY, ov: ovOf(board, sel), size: (box?.w ?? 50) + (box?.h ?? 50), moved: false, sel };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    const hn = t.closest("[data-header]") as SVGElement | null;
    if (hn) { if (hn.dataset.header !== "stats") setSel({ panel: "__board", el: hn.dataset.header!, kind: "header" }); return; }
    const lane = t.closest("[data-lane]") as SVGElement | null;
    if (lane) {
      const pid = lane.dataset.lane!, pi = panelIndex(board, pid);
      const feel = t.closest("[data-lane-feel]") as SVGElement | null;
      if (feel) {
        const v = Number(feel.dataset.laneFeel);
        const cur = (board.panels[pi] as ScenePanel).feeling;
        void commit(cur === v ? [{ path: ["panels", pi, "feeling"], delete: true }] : [{ path: ["panels", pi, "feeling"], value: v }], `Feels ${["awful", "bad", "okay", "good", "great"][v + 2]}`);
        setSel({ panel: pid, el: "__panel", kind: "panel" });
        return;
      }
      if (t.closest("[data-lane-workaround]")) {
        const s: Sel = { panel: pid, el: "__workaround", kind: "workaround" };
        const b = measure(s), f = textField(board, s);
        setSel(s);
        // open after the browser finishes its own mousedown focus handling, or the new textarea blurs at once
        if (b && f) window.setTimeout(() => setEditing({ sel: s, field: f.field, value: f.value, box: b }), 0);
        return;
      }
      if (t.closest("[data-lane-product]")) flash("Teal = a device showing the product in this panel. Mark a device as Personal to turn it off.");
      setSel({ panel: pid, el: "__panel", kind: "panel" });
      return;
    }
    const ln = t.closest("[data-label]") as SVGElement | null;
    if (ln) { setSel({ panel: ln.dataset.label!, el: "__label", kind: "label" }); return; }
    const pn = t.closest("[data-panel]") as SVGElement | null;
    if (!pn) { setSel(null); return; }
    const en = t.closest("[data-el]") as SVGElement | null;
    const el = en?.dataset.el;
    const next: Sel = !el || el === "__panel" ? { panel: pn.dataset.panel!, el: "__panel", kind: "panel" } : { panel: pn.dataset.panel!, el, kind: (en!.dataset.kind ?? "character") as Kind };
    // dragging the background of an already-selected scene panel pans its camera
    if (next.kind === "panel" && sel?.kind === "panel" && sel.panel === next.panel && isScene(board.panels[panelIndex(board, next.panel)])) {
      const cam = { ...next, el: "__camera" };
      drag.current = { mode: "move", sx: e.clientX, sy: e.clientY, ov: ovOf(board, cam), size: 0, moved: false, sel: cam };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    setSel(next);
    if (next.kind !== "panel") {
      drag.current = { mode: "move", sx: e.clientX, sy: e.clientY, ov: ovOf(board, next), size: 0, moved: false, sel: next };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !board) return;
    if (d.mode === "draw") {
      const pt = panelPoint(e, board, d.pi);
      const pts = d.shape.points;
      if (d.shape.type === "path") { const last = pts[pts.length - 1]; if (Math.hypot(pt[0] - last[0], pt[1] - last[1]) >= 3) pts.push(pt); }
      else pts[1] = pt;
      d.moved = true;
      setDraft([{ path: ["panels", d.pi, "shapes", d.index], value: { ...d.shape, points: [...pts] } }]);
      return;
    }
    if (d.mode === "rotate") {
      const a = Math.atan2(e.clientY - d.cy, e.clientX - d.cx);
      let deg = (d.ov.rotate ?? 0) + ((a - d.a0) * 180) / Math.PI;
      deg = e.shiftKey ? Math.round(deg / 15) * 15 : Math.round(deg);
      deg = ((deg % 360) + 540) % 360 - 180; // keep it in -180..180
      d.moved = true;
      setDraft(layoutOps(panelIndex(board, d.sel.panel), d.sel.el, { rotate: deg }));
      return;
    }
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
    if (d?.mode === "draw") {
      setDraft(null);
      const [a, b] = d.shape.points;
      const tiny = d.shape.type === "path" ? d.shape.points.length < 3 : Math.hypot(b[0] - a[0], b[1] - a[1]) < 6;
      if (tiny) return;
      const closed = d.shape.type === "rect" || d.shape.type === "ellipse";
      const shape: Shape = { type: d.shape.type, points: d.shape.points, ...(closed ? { fill: "light" as const } : {}) };
      const id = `shape-${d.index}`;
      void commit([{ path: ["panels", d.pi, "shapes", d.index], value: shape }], "Shape added").then(() => {
        if (d.shape.type !== "path") { setTool(null); setSel({ panel: d.pid, el: id, kind: "shape" }); }
      });
      return;
    }
    if (d?.moved && draft) { const ops = draft; setDraft(null); void commit(ops); }
    else setDraft(null);
  };

  // ------------------------------------------------------------ inline text editing
  const textField = (b: Board, s: Sel): { field: string; value: string } | null => {
    if (s.kind === "header") return s.el === "title" ? { field: "title", value: b.title } : { field: "persona", value: b.persona ?? "" };
    const p = b.panels[panelIndex(b, s.panel)];
    if (s.kind === "label") return p ? { field: "label", value: p.label ?? "" } : null;
    if (s.kind === "workaround") return p && isScene(p) ? { field: "workaround", value: p.workaround ?? "" } : null;
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
  const startEdit = (s: Sel, field?: string) => {
    if (!board || !box) return;
    const f = field === "subtitle" ? { field, value: board.subtitle ?? "" } : textField(board, s);
    if (f) setEditing({ sel: s, field: f.field, value: f.value, box });
  };
  const finishEdit = (save: boolean) => {
    if (!editing || !board) return setEditing(null);
    const { sel: s, field, value } = editing;
    setEditing(null);
    if (!save) return;
    if (s.kind === "header") {
      if (field === "title" && !value.trim()) return;
      return void commit([value.trim() ? { path: [field], value: value.trim() } : { path: [field], delete: true }]);
    }
    const pi = panelIndex(board, s.panel);
    if (s.kind === "label" || s.kind === "workaround") return void commit([value.trim() ? { path: ["panels", pi, field], value: value.trim() } : { path: ["panels", pi, field], delete: true }]);
    const p = board.panels[pi];
    const loc = locate(p, s.el);
    const path = loc ? ["panels", pi, loc.key, loc.index, field] : ["panels", pi, field];
    void commit([{ path, value: value.trim() }]);
  };

  // ------------------------------------------------------------ copy / paste (system clipboard, works across boards)
  /** Last thing copied in this tab, so the Paste button works even when the browser won't let a page read the clipboard. */
  const lastClip = useRef<Clip | null>(null);
  const pasteClip = (clip: unknown) => {
    if (!board) return false;
    const res = pasteOps(board, clip, sel);
    if (!res) return false;
    if (typeof res === "string") { flash(res); return true; }
    void commit(res.ops, res.label).then(() => res.select && setSel(res.select));
    return true;
  };
  const actions = {
    copy: async () => {
      if (!board || !sel) return;
      const clip = clipFor(board, sel);
      if (!clip) return flash("This can't be copied.");
      lastClip.current = clip;
      try { await navigator.clipboard.writeText(JSON.stringify(clip)); } catch { /* the in-tab copy still works */ }
      flash(`Copied ${clip.kind}. Cmd+V pastes into the selected panel.`);
    },
    paste: async () => {
      let clip: unknown = lastClip.current;
      try { clip = JSON.parse(await navigator.clipboard.readText()); } catch { /* fall back to the in-tab copy */ }
      if (!pasteClip(clip) && !(clip !== lastClip.current && pasteClip(lastClip.current))) flash("Nothing to paste. Copy something first.");
    },
    duplicate: () => {
      if (!board || !sel) return;
      const clip = clipFor(board, sel);
      if (!clip) return flash("This can't be duplicated.");
      pasteClip(clip);
    },
    arrange: (to: Arrange) => {
      if (!board || !sel) return;
      const ops = arrangeOps(board, sel, to);
      if (!ops) return flash(to === "front" || to === "forward" ? "Already in front." : "Already at the back.");
      void commit(ops, { front: "Brought to front", forward: "Brought forward", backward: "Sent backward", back: "Sent to back" }[to]);
    },
  };
  useEffect(() => {
    const typing = () => ["INPUT", "TEXTAREA", "SELECT"].includes((document.activeElement as HTMLElement)?.tagName);
    const onCopy = (e: ClipboardEvent) => {
      if (typing() || !board || !sel) return;
      const clip = clipFor(board, sel);
      if (!clip) return;
      lastClip.current = clip;
      e.clipboardData?.setData("text/plain", JSON.stringify(clip));
      e.preventDefault();
      flash(`Copied ${clip.kind}. Paste it into any panel or board.`);
    };
    const onPaste = (e: ClipboardEvent) => {
      if (typing() || !board) return;
      let clip: unknown;
      try { clip = JSON.parse(e.clipboardData?.getData("text/plain") ?? ""); } catch { return; }
      if (pasteClip(clip)) e.preventDefault();
    };
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    return () => { document.removeEventListener("copy", onCopy); document.removeEventListener("paste", onPaste); };
  });

  // ------------------------------------------------------------ keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (e.key === "Escape") { setSel(null); setTool(null); return; }
      if (!sel || !board) return;
      if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); actions.duplicate(); return; }
      if (mod && (e.code === "BracketRight" || e.code === "BracketLeft") && ARRANGEABLE.includes(sel.kind)) {
        e.preventDefault();
        const up = e.code === "BracketRight";
        actions.arrange(e.shiftKey ? (up ? "front" : "back") : up ? "forward" : "backward");
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const d = deleteOps(board, sel);
        if (!d) return;
        e.preventDefault();
        void commit(d.ops, "Deleted. Cmd+Z to undo");
        if (!d.keepSelection) setSel(null);
        return;
      }
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
  /** Put any picture into a scene panel, fitted to a sensible size at `at` (panel units) or the middle. */
  const addImage = async (f: File, panelId?: string, at?: [number, number]) => {
    if (!board) return;
    const pid = panelId ?? (sel && isScene(board.panels[panelIndex(board, sel.panel)]) ? sel.panel : [...board.panels].reverse().find(isScene)?.id);
    const pi = pid ? panelIndex(board, pid) : -1;
    const p = board.panels[pi];
    if (!p || !isScene(p)) return flash("Add a scene panel first, then drop the picture onto it.");
    let nat = { w: 4, h: 3 };
    try { const bmp = await createImageBitmap(f); nat = { w: bmp.width, h: bmp.height }; bmp.close(); } catch { /* keep 4:3 */ }
    const k = Math.min(150 / nat.w, 110 / nat.h);
    const { path } = await api.upload(f, "images");
    const index = (p.images ?? []).length;
    const item = { src: path, x: Math.round(at?.[0] ?? 200), y: Math.round(at?.[1] ?? 130), w: Math.round(nat.w * k), h: Math.round(nat.h * k), ...(sketchNew ? {} : { sketch: false }) };
    setBust((b) => b + 1);
    await commit([{ path: ["panels", pi, "images", index], value: item }], sketchNew ? "Picture added, sketchified. Toggle it in the toolbar." : "Picture added as-is");
    setSel({ panel: p.id, el: `image-${index}`, kind: "image" });
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
      try {
        // onto a device or someone holding one: it's their screen. Anywhere else: a picture in the scene.
        const pi = panelIndex(board, target.panel);
        if (target.kind === "panel" || !heldScreenOps(board, target, "x").length) {
          if (!isScene(board.panels[pi])) return flash("Drop pictures onto a scene panel.");
          await addImage(img, target.panel, panelPoint(e, board, pi));
        } else await uploadTo(img, target);
      } catch (err) { flash(`Upload failed: ${(err as Error).message}`); }
      return;
    }
    const raw = e.dataTransfer.getData("application/x-storyboard");
    if (raw) {
      const payload = JSON.parse(raw) as AddPayload;
      if (payload.kind === "pose") {
        const cn = hit?.closest('[data-kind="character"]') as SVGElement | null;
        if (!cn || !pn) return flash("Drop the pose onto a person.");
        const target: Sel = { panel: pn.dataset.panel!, el: cn.dataset.el!, kind: "character" };
        const res = applyAdd(board, payload, panelIndex(board, target.panel), target);
        if (typeof res === "string") return flash(res);
        await commit(res.ops, res.label);
        return setSel(target);
      }
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
  const deskW = zoom === "fit" ? Math.min(size.width, 2400) : size.width * zoom;
  const zoomToPanel = (pid: string) => {
    const desk = svgWrap.current?.closest(".desk") as HTMLElement | null;
    if (!desk) return;
    setZoom(Math.max(0.5, Math.min(4, ((desk.clientWidth - 80) * 0.95) / 400)));
    requestAnimationFrame(() => requestAnimationFrame(() => svgWrap.current?.querySelector(`g[data-panel="${CSS.escape(pid)}"]`)?.scrollIntoView({ block: "center", inline: "center" })));
  };

  return (
    <div className="app">
      <TopBar file={file} nErr={nErr} nWarn={nWarn} result={result} canUndo={past.length > 0} canRedo={future.length > 0} undo={undo} redo={redo}
        board={board} commit={commit} zoom={zoom} setZoom={setZoom} flash={flash} bumpAssets={() => setBust((b) => b + 1)} />
      <div className={`desk${dropping ? " dropping" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDropping(true); }} onDragLeave={() => setDropping(false)} onDrop={onDrop}>
        <div className="desk-inner" style={{ width: deskW, maxWidth: zoom === "fit" ? "100%" : undefined }}>
          <div ref={svgWrap} className={tool ? "drawing" : undefined} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
            onDoubleClick={() => sel && TEXT_KINDS.includes(sel.kind) && startEdit(sel)} style={{ position: "relative" }}>
            <BoardSVG board={shown} opts={opts} />
            {box && sel && (
              <div className={`sel-box${sel.kind === "panel" ? " panel" : ""}`} style={{ left: box.x - 3, top: box.y - 3, width: box.w + 6, height: box.h + 6 }}>
                {SCALABLE.includes(sel.kind) && <div className="handle" title="Drag to resize" />}
                {ROTATABLE.includes(sel.kind) && <div className="rot-handle" title="Drag to rotate (hold Shift to snap to 15°)" />}
              </div>
            )}
          </div>
          {box && sel && !draft && !editing && (
            <Toolbar key={`${sel.panel}/${sel.el}`} board={board} file={file} flash={flash} zoomToPanel={zoomToPanel} sel={sel} box={box} commit={commit} setSel={setSel} startEdit={(field?: string) => startEdit(sel, field)}
              upload={(f) => uploadTo(f, sel).catch((err) => flash(`Upload failed: ${(err as Error).message}`))} actions={actions} />
          )}
          {editing && (
            <textarea className="inline-edit" autoFocus value={editing.value}
              style={{ left: editing.box.x - 4, top: editing.box.y - 4, width: Math.max(180, editing.box.w + 8), height: Math.max(56, editing.box.h + 8) }}
              onChange={(e) => setEditing({ ...editing, value: e.target.value })}
              onBlur={() => finishEdit(true)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); finishEdit(true); } if (e.key === "Escape") finishEdit(false); }} />
          )}
        </div>
      </div>
      <Drawer board={board} sel={sel} commit={commit} setSel={setSel} flash={flash} tool={tool} setTool={setTool}
        addImage={(f) => addImage(f).catch((err) => flash(`Upload failed: ${(err as Error).message}`))} sketchNew={sketchNew} setSketchNew={setSketchNew} />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function TopBar(props: {
  file: string; nErr: number; nWarn: number; result: Result | null; canUndo: boolean; canRedo: boolean; undo: () => void; redo: () => void;
  board: Board; commit: (ops: Op[], label?: string) => Promise<void>;
  zoom: "fit" | number; setZoom: (z: "fit" | number) => void; flash: (m: string) => void; bumpAssets: () => void;
}) {
  const [menu, setMenu] = useState<null | "export" | "layout" | "issues" | "view" | "brand">(null);
  const lanes = !!props.board.page?.lanes;
  const brand = props.board.page?.brand ?? {};
  const setBrand = (k: "name" | "logo", v: string | undefined) => props.commit([v ? { path: ["page", "brand", k], value: v } : { path: ["page", "brand", k], delete: true }]);
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
      <TextSize board={props.board} commit={props.commit} />
      <button className="btn" onClick={props.undo} disabled={!props.canUndo} title="Undo (Cmd+Z)">Undo</button>
      <button className="btn" onClick={props.redo} disabled={!props.canRedo} title="Redo (Shift+Cmd+Z)">Redo</button>
      <button className={`btn${lanes ? " on" : ""}`} onClick={() => props.commit(lanes ? [{ path: ["page", "lanes"], delete: true }] : [{ path: ["page", "lanes"], value: true }], lanes ? "Journey lanes hidden" : "Journey lanes on: feeling, product, workaround")}
        title="Show service-design lanes under each panel: how they feel, whether the product is there, and their workaround">Journey lanes</button>
      <div className="menu">
        <button className="btn" onClick={() => toggle("brand")} title="Your company's name/logo on storefronts and signs">Brand</button>
        {menu === "brand" && (
          <div className="menu-list form">
            <label>Name on signs<input defaultValue={brand.name ?? ""} placeholder="e.g. Brewly" onBlur={(e) => void setBrand("name", e.target.value.trim() || undefined)} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} /></label>
            <label>Logo<input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              try { const { path } = await api.upload(f); await setBrand("logo", path); props.bumpAssets(); } catch (err) { props.flash(`Upload failed: ${(err as Error).message}`); }
            }} /></label>
            {brand.logo && <button onClick={() => void setBrand("logo", undefined)}>Remove logo</button>}
            <p className="fine">Shown in grey on shop signs, so teal stays reserved for the product.</p>
          </div>
        )}
      </div>
      <div className="menu">
        <button className="btn" onClick={() => toggle("view")}>Zoom: {props.zoom === "fit" ? "fit" : `${Math.round(props.zoom * 100)}%`}</button>
        {menu === "view" && (
          <div className="menu-list">
            {(["fit", 1, 1.5, 2] as const).map((z) => <button key={String(z)} onClick={() => { setMenu(null); props.setZoom(z); }}>{z === "fit" ? "Fit to window" : `${z * 100}%`}</button>)}
          </div>
        )}
      </div>
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
            <a href="/api/export?format=pptx" download>Slides (PPTX, a panel per slide)</a>
            <a href="/api/export?format=html" download>Share page (HTML with comment boxes)</a>
          </div>
        )}
      </div>
    </div>
  );
}

function TextSize({ board, commit }: { board: Board; commit: (ops: Op[], label?: string) => Promise<void> }) {
  const cur = board.page?.textScale ?? 1;
  const set = (v: number) => {
    const n = Math.round(Math.min(2.2, Math.max(0.7, v)) * 10) / 10;
    void commit(n === 1 ? [{ path: ["page", "textScale"], delete: true }] : [{ path: ["page", "textScale"], value: n }]);
  };
  return (
    <span className="textsize" title="Text size for the whole board (bubbles, captions, labels, titles). Resize one element with its corner handle.">
      <span className="ts-label">Text</span>
      <button className="btn" onClick={() => set(cur - 0.1)} disabled={cur <= 0.7} aria-label="Smaller text">A-</button>
      <span className="ts-val">{Math.round(cur * 100)}%</span>
      <button className="btn" onClick={() => set(cur + 0.1)} disabled={cur >= 2.2} aria-label="Larger text">A+</button>
    </span>
  );
}
