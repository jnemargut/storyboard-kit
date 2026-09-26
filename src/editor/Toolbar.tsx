import { useLayoutEffect, useRef, useState } from "react";
import type { Op } from "../json";
import type { Board, CharacterInPanel, Panel, ScenePanel } from "../types";
import { isScene } from "../types";
import { ANGLES, BUBBLES, DEVICES, DIRECTIONS, GESTURES, MOODS, POSES, SCENES, SHOTS, TIME_ICONS, ids } from "../vocab";
import { heldDeviceOf } from "../render/layout";
import { locate, movePanelOps, newPanelId, panelIndex, removeOps, resetLayoutOps, setFieldOps, insertPanelOps, type Sel } from "./model";

interface Props {
  board: Board;
  sel: Sel;
  box: { x: number; y: number; w: number; h: number };
  commit: (ops: Op[], label?: string) => Promise<void>;
  setSel: (s: Sel | null) => void;
  startEdit: () => void;
  upload: (f: File) => void;
}

function Pick({ value, options, onChange, title }: { value: string; options: string[]; onChange: (v: string) => void; title: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} title={title}>
      {!options.includes(value) && <option value={value}>{value || "–"}</option>}
      {options.map((o) => <option key={o} value={o}>{o || "(none)"}</option>)}
    </select>
  );
}

const panelTargets = (p: Panel) => (isScene(p) ? [...(p.characters ?? []).map((c) => c.id ?? c.who), ...(p.devices ?? []).map((d) => d.id ?? d.type)] : []);

export function Toolbar({ board, sel, box, commit, setSel, startEdit, upload }: Props) {
  const file = useRef<HTMLInputElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState(box.x);
  // keep the toolbar inside the board: shift left when it would overflow the right edge
  useLayoutEffect(() => {
    const el = bar.current, host = el?.parentElement;
    if (!el || !host) return;
    setLeft(Math.max(0, Math.min(box.x, host.clientWidth - el.offsetWidth - 4)));
  });
  const pi = panelIndex(board, sel.panel);
  const panel = board.panels[pi];
  if (!panel) return null;
  const set = (field: string, value: unknown) => commit(setFieldOps(board, sel, field, value));
  const sep = <span className="sep" />;
  const reset = panel.layout?.[sel.el] ? <button onClick={() => commit(resetLayoutOps(pi, sel.el), "Position reset")} title="Undo manual moves for this element">Reset</button> : null;
  const remove = <button onClick={() => { void commit(removeOps(board, sel)); setSel(null); }} title="Delete">Delete</button>;
  const editText = <button onClick={startEdit} title="Or double-click the text">Edit text</button>;
  const labelBtn = <button onClick={() => { const v = window.prompt("Label under the panel", panel.label ?? ""); if (v !== null) void set("label", v); }}>Label</button>;
  const screenBtn = (
    <>
      <button className="teal" onClick={() => file.current?.click()} title="Put your own design on this screen">Screen…</button>
      <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
    </>
  );
  const top = box.y > 44 ? box.y - 40 : box.y + box.h + 10;
  let body: React.ReactNode = null;

  if (sel.kind === "panel") {
    const move = (d: number) => commit(movePanelOps(board, pi, pi + d));
    const dup = () => {
      const copy = structuredClone(panel);
      copy.id = newPanelId(board, panel.id);
      void commit(insertPanelOps(pi + 1, copy), "Panel duplicated");
    };
    const kind = isScene(panel) ? `Panel ${pi + 1}` : panel.type === "title" ? "Title card" : panel.type === "time" ? "Time card" : "Narration";
    body = (
      <>
        <span className="kind">{kind}</span>
        {isScene(panel) && (
          <>
            <Pick title="Scene" value={panel.scene} options={ids(SCENES)} onChange={(v) => set("scene", v)} />
            <Pick title="Camera shot" value={panel.shot ?? "wide"} options={ids(SHOTS)} onChange={(v) => set("shot", v)} />
            {panelTargets(panel).length > 1 && <Pick title="Camera focus" value={panel.focus ?? ""} options={["", ...panelTargets(panel)]} onChange={(v) => set("focus", v || undefined)} />}
            {!panel.caption && <button onClick={() => set("caption", "Caption")}>+ Caption</button>}
          </>
        )}
        {panel.type === "time" && <Pick title="Icon" value={panel.icon ?? "clock"} options={ids(TIME_ICONS)} onChange={(v) => set("icon", v)} />}
        {labelBtn}
        {sep}
        <button onClick={() => move(-1)} disabled={pi === 0} title="Move earlier">Earlier</button>
        <button onClick={() => move(1)} disabled={pi === board.panels.length - 1} title="Move later">Later</button>
        <button onClick={dup}>Duplicate</button>
        {panel.layout && <button onClick={() => commit([{ path: ["panels", pi, "layout"], delete: true }], "All manual moves in this panel reset")}>Reset moves</button>}
        {remove}
      </>
    );
  } else if (isScene(panel) && (sel.kind === "character" || (sel.kind === "device" && locate(panel, sel.el)?.key === "characters"))) {
    const loc = locate(panel, sel.el)!;
    const c = panel.characters![loc.index] as CharacterInPanel;
    const held = heldDeviceOf(c);
    const setDevice = (v: string) => commit([{ path: ["panels", pi, "characters", loc.index, "device"], ...(v ? { value: held?.screen ? { type: v, screen: held.screen } : v } : { delete: true }) }]);
    body = (
      <>
        <Pick title="Who" value={c.who} options={Object.keys(board.cast)} onChange={(v) => commit([{ path: ["panels", pi, "characters", loc.index, "who"], value: v }])} />
        <Pick title="Pose" value={c.pose ?? "standing"} options={ids(POSES)} onChange={(v) => set("pose", v)} />
        <Pick title="Mood" value={c.mood ?? "neutral"} options={ids(MOODS)} onChange={(v) => set("mood", v)} />
        <Pick title="Angle" value={c.angle ?? "three-quarter"} options={ids(ANGLES)} onChange={(v) => set("angle", v)} />
        <button onClick={() => set("facing", (c.facing ?? "right") === "right" ? "left" : "right")} title="Flip left/right">Flip</button>
        {sep}
        <Pick title="Device in hand" value={held?.type ?? ""} options={["", ...ids(DEVICES)]} onChange={setDevice} />
        {held && screenBtn}
        {sep}{reset}{remove}
      </>
    );
  } else if (sel.kind === "device" && isScene(panel)) {
    const loc = locate(panel, sel.el);
    const d = loc?.key === "devices" ? panel.devices![loc.index] : undefined;
    body = <>{d && <Pick title="Device" value={d.type} options={ids(DEVICES)} onChange={(v) => set("type", v)} />}{screenBtn}{sep}{reset}{d && remove}</>;
  } else if (sel.kind === "bubble" && isScene(panel)) {
    const loc = locate(panel, sel.el);
    const b = loc ? panel.bubbles![loc.index] : undefined;
    if (!b) return null;
    body = (
      <>
        <Pick title="Bubble type" value={b.type} options={ids(BUBBLES)} onChange={(v) => set("type", v)} />
        <Pick title="Who's speaking" value={b.from ?? ""} options={["", ...panelTargets(panel)]} onChange={(v) => set("from", v || undefined)} />
        {editText}{sep}{reset}{remove}
      </>
    );
  } else if (sel.kind === "gesture" && isScene(panel)) {
    const loc = locate(panel, sel.el);
    const g = loc ? panel.gestures![loc.index] : undefined;
    if (!g) return null;
    body = (
      <>
        <Pick title="Gesture" value={g.type} options={ids(GESTURES)} onChange={(v) => set("type", v)} />
        {g.type === "swipe" && <Pick title="Direction" value={g.direction ?? "left"} options={[...DIRECTIONS]} onChange={(v) => set("direction", v)} />}
        <Pick title="On whose screen" value={g.on ?? ""} options={["", ...panelTargets(panel)]} onChange={(v) => set("on", v || undefined)} />
        {sep}{reset}{remove}
      </>
    );
  } else if (sel.kind === "callout" && isScene(panel)) {
    const loc = locate(panel, sel.el);
    const co = loc ? panel.callouts![loc.index] : undefined;
    body = (
      <>
        <span className="kind">Callout</span>
        {co && <Pick title="Points at" value={co.target ?? ""} options={["", ...panelTargets(panel as ScenePanel)]} onChange={(v) => set("target", v || undefined)} />}
        {editText}{sep}{reset}{remove}
      </>
    );
  } else if (sel.kind === "caption" || sel.kind === "text") {
    body = <><span className="kind">{sel.kind === "caption" ? "Caption" : "Text"}</span>{editText}{reset}{sel.kind === "caption" && remove}</>;
  }

  return <div ref={bar} className="ctx" style={{ left, top }} onPointerDown={(e) => e.stopPropagation()}>{body}</div>;
}
