/**
 * Play mode: the board as a slideshow for a crit. One panel at a time, as big as the screen allows, with the
 * step name, a strip of every step (teal where the product shows up), and optional speaker notes.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Board } from "../types";
import { isScene } from "../types";
import { feelingOf, stepName, WOBBLE_FILTER } from "../render/board";
import { PanelArt, panelHasProduct, type RenderOptions } from "../render/panel";

const FEEL = ["awful", "bad", "okay", "good", "great"];

export function Present({ board, opts, start, onExit }: { board: Board; opts: RenderOptions; start: number; onExit: (at: number) => void }) {
  const n = board.panels.length;
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
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(k)) { e.preventDefault(); go(i + 1); }
      else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(k)) { e.preventDefault(); go(i - 1); }
      else if (k === "Home") { e.preventDefault(); go(0); }
      else if (k === "End") { e.preventDefault(); go(n - 1); }
      else if (k === "Escape") { e.preventDefault(); exit(); }
      else if (k.toLowerCase() === "n") setNotes((v) => !v);
      else if (k.toLowerCase() === "f") {
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
        else void root.current?.requestFullscreen?.().catch(() => {});
      }
      else if (/^[1-9]$/.test(k)) go(Number(k) - 1);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [i, n, go, exit]);

  // leaving fullscreen with the browser's own Esc should not also leave play mode; nothing to do there
  const p = board.panels[i];
  const name = stepName(p);
  const feel = isScene(p) ? feelingOf(p) : undefined;
  const speaker = [
    isScene(p) && p.workaround ? `Workaround: ${p.workaround}` : "",
    feel !== undefined ? `Feels ${FEEL[feel + 2]}` : "",
    p.notes ?? "",
  ].filter(Boolean);

  return (
    <div ref={root} className="present" role="dialog" aria-label={`Play mode: ${board.title}`}>
      <div className="present-top">
        <span className="present-title">{board.title}</span>
        <span className="present-count">{i + 1} / {n}</span>
        <span className="spacer" />
        <button onClick={() => setNotes(!notes)} aria-pressed={notes} title="Speaker notes (N)">{notes ? "Hide notes" : "Notes"}</button>
        <button onClick={() => (document.fullscreenElement ? void document.exitFullscreen() : void root.current?.requestFullscreen?.())} title="Full screen (F)">Full screen</button>
        <button onClick={exit} title="Back to editing (Esc)">Exit</button>
      </div>

      <div className="present-stage">
        <button className="present-nav prev" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Previous step">‹</button>
        <figure key={p.id} className={`present-slide${dir > 0 ? " from-right" : dir < 0 ? " from-left" : ""}`}>
          <svg viewBox="-6 -6 412 272" className="present-panel" role="img" aria-label={name ? `Step ${i + 1}: ${name}` : `Step ${i + 1}`}>
            <defs>
              {WOBBLE_FILTER}
              <filter id="sb-gray"><feColorMatrix type="saturate" values="0" /></filter>
            </defs>
            <PanelArt board={board} panel={p} opts={opts} />
          </svg>
          <figcaption>
            <span className="present-step">{i + 1}</span>
            {name && <span className="present-name">{name}</span>}
          </figcaption>
          {notes && (
            <div className="present-notes">
              {speaker.length ? speaker.map((s, k) => <p key={k}>{s}</p>) : <p className="muted">No notes for this step. Add some in the file's "notes" field.</p>}
            </div>
          )}
        </figure>
        <button className="present-nav next" onClick={() => go(i + 1)} disabled={i === n - 1} aria-label="Next step">›</button>
      </div>

      <nav className="present-strip" aria-label="Steps">
        {board.panels.map((q, k) => (
          <button key={q.id} className={`${k === i ? "on" : ""}${isScene(q) && panelHasProduct(q) ? " product" : ""}${!isScene(q) ? " card" : ""}`}
            onClick={() => go(k)} title={`${k + 1}${stepName(q) ? ` · ${stepName(q)}` : ""}`} aria-current={k === i ? "step" : undefined}>
            <span className="tick" />
            <span className="lbl">{k + 1}</span>
          </button>
        ))}
      </nav>
      <div className="present-help">← → to step · N notes · F full screen · Esc to exit</div>
    </div>
  );
}
