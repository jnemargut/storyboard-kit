/**
 * Play mode: the board as a slideshow for a crit. One panel at a time, as big as the screen allows, with the
 * step name, a strip of every step, and optional speaker notes.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Op } from "../sketch/json";
import type { Board } from "../types";
import type { MarkerColor } from "../vocab";
import { smooth } from "../render/shapes";
import { MARKER } from "../render/tokens";
import { markerHex } from "../sketch/tokens";
import { Swatches } from "./Swatches";
import { isScene } from "../types";
import { feelingOf, stepName, WOBBLE_FILTER } from "../render/board";
import { PanelArt, type RenderOptions } from "../render/panel";

const FEEL = ["awful", "bad", "okay", "good", "great"];

type Tool = "pen" | "eraser" | null;

export function Present({ board, opts, start, onExit, commit, undo }: {
  board: Board; opts: RenderOptions; start: number; onExit: (at: number) => void;
  commit: (ops: Op[], label?: string) => Promise<void>; undo: () => void;
}) {
  const n = board.panels.length;
  const [tool, setTool] = useState<Tool>(null);
  const [color, setColor] = useState<MarkerColor>("red");
  const [picking, setPicking] = useState(false);
  const [live, setLive] = useState<[number, number][] | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const drawing = useRef<{ pts: [number, number][]; erasing: boolean; erased: Set<number> } | null>(null);
  const [i, setI] = useState(Math.min(Math.max(0, start), n - 1));
  const [notes, setNotes] = useState(false);
  const [dir, setDir] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  const go = useCallback((to: number) => {
    setI((cur) => {
      const next = Math.min(Math.max(0, to), n - 1);
      setDir(Math.sign(next - cur));
      return next;
    });
  }, [n]);
  const exit = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    onExit(i);
  }, [i, onExit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      // typing speaker notes: only Esc (leave the box) is ours
      if ((e.target as HTMLElement).tagName === "TEXTAREA") { if (k === "Escape") (e.target as HTMLElement).blur(); return; }
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(k)) { e.preventDefault(); go(i + 1); }
      else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(k)) { e.preventDefault(); go(i - 1); }
      else if (k === "Home") { e.preventDefault(); go(0); }
      else if (k === "End") { e.preventDefault(); go(n - 1); }
      else if (k === "Escape") { e.preventDefault(); if (tool) setTool(null); else exit(); }
      else if ((e.metaKey || e.ctrlKey) && k.toLowerCase() === "z") { e.preventDefault(); undo(); }
      else if (k.toLowerCase() === "d") setTool((t) => (t === "pen" ? null : "pen"));
      else if (k.toLowerCase() === "e") setTool((t) => (t === "eraser" ? null : "eraser"));
      else if (k.toLowerCase() === "n") setNotes((v) => !v);
      else if (k.toLowerCase() === "f") {
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
        else void root.current?.requestFullscreen?.().catch(() => {});
      }
      else if (/^[1-9]$/.test(k)) go(Number(k) - 1);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [i, n, go, exit, tool, undo]);

  // ------------------------------------------------------------ sharpie
  const toPanel = (e: React.PointerEvent): [number, number] => {
    const m = svg.current!.getScreenCTM()!.inverse();
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    return [Math.round(pt.x * 10) / 10, Math.round(pt.y * 10) / 10];
  };
  // strokes touched during one drag are faded at once and deleted together on release (indices stay valid)
  const eraseAt = (x: number, y: number) => {
    const hit = document.elementFromPoint(x, y)?.closest("[data-mk]") as SVGElement | null;
    if (!hit || !drawing.current) return;
    drawing.current.erased.add(Number(hit.dataset.mk));
    hit.style.opacity = "0.15";
  };
  const onDown = (e: React.PointerEvent) => {
    if (!tool) return;
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    if (tool === "eraser") { drawing.current = { pts: [], erasing: true, erased: new Set() }; eraseAt(e.clientX, e.clientY); return; }
    drawing.current = { pts: [toPanel(e)], erasing: false, erased: new Set() };
    setLive(drawing.current.pts);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drawing.current;
    if (!d) return;
    if (d.erasing) { eraseAt(e.clientX, e.clientY); return; }
    const p = toPanel(e), last = d.pts[d.pts.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= 2) { d.pts.push(p); setLive([...d.pts]); }
  };
  const onUp = () => {
    const d = drawing.current;
    drawing.current = null;
    setLive(null);
    if (d?.erasing) {
      const idx = [...d.erased].sort((a, b) => b - a);
      if (idx.length) void commit(idx.map((k) => ({ path: ["panels", i, "markup", k], delete: true })), idx.length > 1 ? `${idx.length} strokes erased` : "Stroke erased");
      return;
    }
    if (!d || d.pts.length < 2) return;
    const count = board.panels[i].markup?.length ?? 0;
    void commit([{ path: ["panels", i, "markup", count], value: { points: d.pts, ...(color !== "red" ? { color } : {}) } }]);
  };
  const clearSlide = () => { if (board.panels[i].markup?.length) void commit([{ path: ["panels", i, "markup"], delete: true }], "Markup cleared from this step"); };
  const clearAll = () => {
    const ops: Op[] = board.panels.flatMap((q, k) => (q.markup?.length ? [{ path: ["panels", k, "markup"], delete: true } as Op] : []));
    if (ops.length && window.confirm("Clear the markup on every step?")) void commit(ops, "All markup cleared");
  };
  const anyMarkup = board.panels.some((q) => q.markup?.length);

  // leaving fullscreen with the browser's own Esc should not also leave play mode; nothing to do there
  const p = board.panels[i];
  const name = stepName(p);
  const feel = isScene(p) ? feelingOf(p) : undefined;
  const context = [
    isScene(p) && p.workaround ? `Workaround: ${p.workaround}` : "",
    feel !== undefined ? `Feels ${FEEL[feel + 2]}` : "",
  ].filter(Boolean).join(" · ");
  const saveNotes = (v: string) => {
    if (v.trim() === (p.notes ?? "").trim()) return;
    void commit([v.trim() ? { path: ["panels", i, "notes"], value: v.trim() } : { path: ["panels", i, "notes"], delete: true }], "Notes saved");
  };

  return (
    <div ref={root} className={`present${tool ? ` ${tool}` : ""}`} role="dialog" aria-label={`Play mode: ${board.title}`}>
      <div className="present-top">
        <span className="present-title">{board.title}</span>
        <span className="present-count">{i + 1} / {n}</span>
        <span className="spacer" />
        <div className="present-tools" role="group" aria-label="Markup">
          <button className={tool === "pen" ? "on" : ""} aria-pressed={tool === "pen"} onClick={() => setTool(tool === "pen" ? null : "pen")} title="Sharpie: draw over the step (D)">Sharpie</button>
          <span className="pen-color">
            <button className="pen-dot" style={{ background: markerHex(color) }} onClick={() => setPicking(!picking)} aria-expanded={picking} aria-label={`Sharpie color: ${color}`} title="Sharpie color" />
            {picking && <span className="pen-pop"><Swatches value={color} onChange={(c) => { setColor(c); setTool("pen"); setPicking(false); }} label="Sharpie color" /></span>}
          </span>
          <button className={tool === "eraser" ? "on" : ""} aria-pressed={tool === "eraser"} onClick={() => setTool(tool === "eraser" ? null : "eraser")} title="Eraser: click or drag over strokes (E)">Eraser</button>
          <button onClick={clearSlide} disabled={!board.panels[i].markup?.length} title="Remove all markup from this step">Clear step</button>
          <button onClick={clearAll} disabled={!anyMarkup} title="Remove markup from every step">Clear all</button>
        </div>
        <button onClick={() => setNotes(!notes)} aria-pressed={notes} title="Speaker notes (N)">{notes ? "Hide notes" : "Notes"}</button>
        <button onClick={() => (document.fullscreenElement ? void document.exitFullscreen() : void root.current?.requestFullscreen?.())} title="Full screen (F)">Full screen</button>
        <button onClick={exit} title="Back to editing (Esc)">Exit</button>
      </div>

      <div className="present-stage">
        <button className="present-nav prev" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Previous step">‹</button>
        <figure key={p.id} className={`present-slide${dir > 0 ? " from-right" : dir < 0 ? " from-left" : ""}`}>
          <svg ref={svg} viewBox="-6 -6 412 272" className="present-panel" role="img" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} aria-label={name ? `Step ${i + 1}: ${name}` : `Step ${i + 1}`}>
            <defs>
              {WOBBLE_FILTER}
              <filter id="sb-gray"><feColorMatrix type="saturate" values="0" /></filter>
            </defs>
            <PanelArt board={board} panel={p} opts={{ ...opts, showMarkup: true, markupHit: tool === "eraser" }} />
            {live && live.length > 1 && <path d={smooth(live)} fill="none" stroke={markerHex(color)} strokeWidth={color === "yellow" ? 12 : 4.5} strokeOpacity={color === "yellow" ? 0.55 : 0.92} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />}
          </svg>
          <figcaption>
            <span className="present-step">{i + 1}</span>
            {name && <span className="present-name">{name}</span>}
          </figcaption>
          {notes && (
            <div className="present-notes">
              {context && <p className="muted">{context}</p>}
              <textarea key={p.id} defaultValue={p.notes ?? ""} placeholder="Speaker notes for this step…" rows={3}
                onBlur={(e) => saveNotes(e.target.value)} aria-label={`Speaker notes for step ${i + 1}`} />
            </div>
          )}
        </figure>
        <button className="present-nav next" onClick={() => go(i + 1)} disabled={i === n - 1} aria-label="Next step">›</button>
      </div>

      <nav className="present-strip" aria-label="Steps">
        {board.panels.map((q, k) => (
          <button key={q.id} className={`${k === i ? "on" : ""}${!isScene(q) ? " card" : ""}`}
            onClick={() => go(k)} title={`${k + 1}${stepName(q) ? ` · ${stepName(q)}` : ""}`} aria-current={k === i ? "step" : undefined}>
            <span className="tick" />
            <span className="lbl">{k + 1}</span>
          </button>
        ))}
      </nav>
      <div className="present-help">← → to step · D sharpie · E eraser · N notes · F full screen · Esc to exit</div>
    </div>
  );
}
