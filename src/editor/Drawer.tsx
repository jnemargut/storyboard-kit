import { useRef, useState } from "react";
import type { Op } from "../json";
import type { Board, CastMember, Panel, ScenePanel } from "../types";
import { isScene } from "../types";
import { ACCESSORIES, AGES, BODY, BUBBLES, DEVICES, GESTURES, HAIR, HAIR_SHADE, HATS, OUTFITS, POSES, SCENES, SKIN, ids, type DeviceType, type Pose, type SceneId, type ShapeType, type MarkerColor } from "../vocab";
import { SceneBack, SceneFront } from "../render/scenes";
import { Character } from "../render/character";
import { Device, DEVICE_DEFS } from "../render/devices";
import { figure } from "../render/rig";
import { PanelArt } from "../render/panel";
import { ShapeMark } from "../render/shapes";
import { Swatches } from "./Swatches";
import { insertPanelOps, newPanelId, panelIndex, type Sel } from "./model";

export type AddPayload =
  | { kind: "panel"; panel: "scene" | "title" | "time" | "text"; scene?: string }
  | { kind: "character"; who: string }
  | { kind: "bubble"; type: string }
  | { kind: "caption" }
  | { kind: "callout" }
  | { kind: "device"; type: DeviceType }
  | { kind: "gesture"; type: string }
  | { kind: "pose"; pose: string };

type AddResult = { ops: Op[]; label?: string; select?: Sel } | string;

/** Turn an "add" (click or drop) into ops against panel `pi`. Returns an error message string if it can't apply. */
export function applyAdd(board: Board, a: AddPayload, pi: number, sel: Sel | null): AddResult {
  if (a.kind === "panel") {
    const at = Math.min(board.panels.length, Math.max(0, pi + 1));
    const base = a.panel === "scene" ? (a.scene ?? "scene") : a.panel;
    const id = newPanelId(board, base);
    const firstCast = Object.keys(board.cast)[0];
    const panel: Panel =
      a.panel === "title" ? { id, type: "title", title: board.title }
      : a.panel === "time" ? { id, type: "time", text: "Later…", icon: "clock" }
      : a.panel === "text" ? { id, type: "text", text: "What happened next…" }
      : { id, scene: (a.scene ?? "blank") as ScenePanel["scene"], shot: "wide", characters: firstCast ? [{ who: firstCast, mood: "neutral" }] : [] };
    return { ops: insertPanelOps(at, panel), label: "Panel added", select: { panel: id, el: "__panel", kind: "panel" } };
  }
  const p = board.panels[pi];
  if (!p || !isScene(p)) return "Select or drop onto a scene panel first.";
  const chars = p.characters ?? [];
  const charIds = chars.map((c) => c.id ?? c.who);
  const selHere = sel && sel.panel === p.id ? sel : null;
  const selChar = selHere && charIds.includes(selHere.el) ? selHere.el : undefined;
  const push = (key: string, item: unknown): Op => ({ path: ["panels", pi, key, ((p as unknown as Record<string, unknown[]>)[key] ?? []).length], value: item });

  switch (a.kind) {
    case "pose": {
      if (!selChar) return "Select a person first, or drop the pose onto one.";
      return { ops: [{ path: ["panels", pi, "characters", charIds.indexOf(selChar), "pose"], value: a.pose }], label: `Pose: ${a.pose}` };
    }
    case "character": {
      const taken = charIds.includes(a.who);
      const item = taken ? { who: a.who, id: `${a.who}-${charIds.length + 1}` } : { who: a.who };
      return { ops: [push("characters", { ...item, pose: "standing", mood: "neutral" })], label: `${board.cast[a.who]?.name ?? a.who} added`, select: { panel: p.id, el: item.id ?? a.who, kind: "character" } };
    }
    case "bubble": {
      const from = selChar ?? charIds[0];
      const i = (p.bubbles ?? []).length;
      return { ops: [push("bubbles", { type: a.type, ...(from ? { from } : {}), text: a.type === "thought" ? "Hmm…" : "…" })], select: { panel: p.id, el: `bubble-${i}`, kind: "bubble" } };
    }
    case "caption":
      return p.caption ? "This panel already has a caption." : { ops: [{ path: ["panels", pi, "caption"], value: "Caption" }], select: { panel: p.id, el: "caption", kind: "caption" } };
    case "callout": {
      const i = (p.callouts ?? []).length;
      return { ops: [push("callouts", { text: "Why this matters", ...(selChar ?? charIds[0] ? { target: selChar ?? charIds[0] } : {}) })], select: { panel: p.id, el: `callout-${i}`, kind: "callout" } };
    }
    case "device": {
      if (selChar && ["phone", "tablet", "laptop", "watch"].includes(a.type)) {
        const ci = charIds.indexOf(selChar);
        return { ops: [{ path: ["panels", pi, "characters", ci, "device"], value: a.type }], label: `Gave ${selChar} a ${a.type}` };
      }
      return { ops: [push("devices", { type: a.type })], label: `${a.type} added` };
    }
    case "gesture": {
      const on = selChar ?? chars.find((c) => c.device)?.id ?? chars.find((c) => c.device)?.who ?? (p.devices?.[0]?.id ?? p.devices?.[0]?.type);
      if (!on) return "Add a device first (a gesture happens on a screen).";
      return { ops: [push("gestures", { type: a.type, on })], label: `${a.type} added` };
    }
  }
}

function Tile({ payload, onAdd, children, name, sub, teal }: { payload: AddPayload; onAdd: (p: AddPayload) => void; children?: React.ReactNode; name: string; sub?: string; teal?: boolean }) {
  return (
    <div className={`tile${teal ? " teal" : ""}`} draggable onDragStart={(e) => { e.dataTransfer.setData("application/x-storyboard", JSON.stringify(payload)); e.dataTransfer.effectAllowed = "copy"; }}
      onClick={() => onAdd(payload)} title="Click to add to the selected panel, or drag onto any panel">
      {children}
      <span className="t-name">{name}</span>
      {sub && <span className="t-sub">{sub}</span>}
    </div>
  );
}

/** Same-size panel tile: thumbnail + name. Click adds after the selected panel; drag drops anywhere. */
function PanelTile({ payload, onAdd, name, children }: { payload: AddPayload; onAdd: (p: AddPayload) => void; name: string; children: React.ReactNode }) {
  return (
    <div className="thumb" draggable title="Click to add a panel after the selected one, or drag onto the board"
      onDragStart={(e) => { e.dataTransfer.setData("application/x-storyboard", JSON.stringify(payload)); e.dataTransfer.effectAllowed = "copy"; }}
      onClick={() => onAdd(payload)}>
      {children}<span>{name}</span>
    </div>
  );
}

function Person({ cast, w = 76 }: { cast: CastMember; w?: number }) {
  const f = figure("standing", "front", "right", cast);
  return (
    <svg width={w} height={w * 1.25} viewBox="-34 -138 68 146">
      <Character f={f} cast={cast} mood="happy" />
    </svg>
  );
}

function DeviceIcon({ type }: { type: DeviceType }) {
  const d = DEVICE_DEFS[type];
  const pad = 8;
  return (
    <svg width={52} height={44} viewBox={`${-d.w / 2 - pad} ${-d.h / 2 - pad} ${d.w + pad * 2} ${d.h + pad * 2}`} preserveAspectRatio="xMidYMid meet">
      <Device type={type} clipId={`drawer-${type}`} />
    </svg>
  );
}

export function CastEditor({ id, m, commit }: { id: string; m: CastMember; commit: (ops: Op[]) => Promise<void> }) {
  const set = (k: keyof CastMember, v: unknown) => commit([{ path: ["cast", id, k], ...(v === "" || v === undefined ? { delete: true } : { value: v }) }]);
  const sel = (k: keyof CastMember, list: readonly { id: string }[], def: string) => (
    <label>{k === "hairShade" ? "hair colour" : k}
      <select value={(m[k] as string) ?? def} onChange={(e) => set(k, e.target.value)}>{list.map((x) => <option key={x.id} value={x.id}>{x.id || "none"}</option>)}</select>
    </label>
  );
  const acc = new Set(m.accessories ?? []);
  return (
    <div className="cast-card">
      <Person cast={m} w={92} />
      <div className="fields">
        <label>name<input value={m.name ?? id} onChange={(e) => set("name", e.target.value)} /></label>
        {sel("skin", SKIN, "tone-2")}{sel("hair", HAIR, "short")}{sel("hairShade", HAIR_SHADE, "dark")}
        {sel("body", BODY, "average")}{sel("age", AGES, "adult")}{sel("outfit", OUTFITS, "jacket")}{sel("hat", [{ id: "" }, ...HATS], "")}
        <div className="acc">
          {ids(ACCESSORIES).map((a) => (
            <label key={a}><input type="checkbox" checked={acc.has(a as never)} onChange={(e) => {
              const next = new Set(acc); if (e.target.checked) next.add(a as never); else next.delete(a as never);
              void set("accessories", next.size ? [...next] : undefined);
            }} />{a}</label>
          ))}
        </div>
      </div>
    </div>
  );
}

function SceneThumb({ id }: { id: SceneId }) {
  return (
    <svg width={116} height={75} viewBox="0 0 400 260" style={{ background: "#fbfaf7" }}>
      <SceneBack id={id} /><SceneFront id={id} />
      <rect x={1} y={1} width={398} height={258} fill="none" stroke="#1c1c1e" strokeWidth={4} />
    </svg>
  );
}

const CARD_SAMPLES: Record<"title" | "time" | "text", Panel> = {
  title: { id: "thumb-title", type: "title", title: "Story title", subtitle: "Who, where, when" },
  time: { id: "thumb-time", type: "time", text: "12 minutes later…", icon: "clock" },
  text: { id: "thumb-text", type: "text", text: "What happened next…" },
};

function CardThumb({ kind, board }: { kind: "title" | "time" | "text"; board: Board }) {
  return (
    <svg width={116} height={75} viewBox="0 0 400 260" style={{ background: "#fbfaf7" }}>
      <PanelArt board={board} panel={CARD_SAMPLES[kind]} opts={{ asset: () => "", wobble: false }} />
    </svg>
  );
}

const DRAW_TOOLS: { id: ShapeType; name: string; sub: string; sample: [number, number][] }[] = [
  { id: "rect", name: "Box", sub: "drag a corner to corner", sample: [[8, 10], [48, 38]] },
  { id: "ellipse", name: "Oval", sub: "drag a corner to corner", sample: [[8, 8], [48, 40]] },
  { id: "line", name: "Line", sub: "drag end to end", sample: [[8, 38], [48, 10]] },
  { id: "arrow", name: "Arrow", sub: "drag tail to tip", sample: [[8, 38], [48, 10]] },
  { id: "path", name: "Pen", sub: "sketch freehand; Esc to stop", sample: [[6, 30], [14, 14], [24, 30], [34, 12], [44, 26], [50, 18]] },
  { id: "text", name: "Text", sub: "click a panel, then type", sample: [[28, 26]] },
];

function PoseThumb({ pose, cast }: { pose: Pose; cast: CastMember }) {
  const f = figure(pose, pose === "walking" || pose === "driving" ? "side" : "three-quarter", "right", cast);
  return (
    <svg width={56} height={72} viewBox="-40 -136 80 144">
      <Character f={f} cast={cast} mood="neutral" stool={!!f.j.seated} />
    </svg>
  );
}

const TABS = ["People", "Poses", "Bubbles & notes", "Devices", "Gestures", "Draw & images", "Panels", "Cast"] as const;

export function Drawer({ board, sel, commit, setSel, flash, tool, setTool, addImage, sketchNew, setSketchNew, drawColor, setDrawColor }: {
  board: Board; sel: Sel | null; commit: (ops: Op[], label?: string) => Promise<void>; setSel: (s: Sel | null) => void; flash: (m: string) => void;
  tool: ShapeType | null; setTool: (t: ShapeType | null) => void;
  addImage: (f: File) => void; sketchNew: boolean; setSketchNew: (v: boolean) => void;
  drawColor: MarkerColor; setDrawColor: (c: MarkerColor) => void;
}) {
  const imgInput = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<(typeof TABS)[number] | null>(null);
  const pi = sel ? panelIndex(board, sel.panel) : board.panels.length - 1;
  const add = (a: AddPayload) => {
    const res = applyAdd(board, a, pi, sel);
    if (typeof res === "string") return flash(res);
    void commit(res.ops, res.label).then(() => res.select && setSel(res.select));
  };
  const newPerson = () => {
    let n = Object.keys(board.cast).length + 1, id = `person-${n}`;
    while (board.cast[id]) id = `person-${++n}`;
    void commit([{ path: ["cast", id], value: { name: `Person ${n}`, skin: "tone-3", hair: "short" } }], "New person added to the cast");
  };

  return (
    <div className="drawer">
      <div className="drawer-bar">
        <button className="btn dark" onClick={() => setTab(tab ? null : "People")}>{tab ? "Close" : "+ Add"}</button>
        <div className="tabs">{TABS.map((t) => <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t}</button>)}</div>
        <span className="spacer" />
        <span className="hint">{tool ? `Drawing: ${DRAW_TOOLS.find((t) => t.id === tool)?.name}. Drag on a scene panel · Esc to stop` : sel ? `Adds go to panel ${pi + 1}` : "Click anything to edit · drag to move · drop a screen image onto a phone"}</span>
      </div>
      {tab && (
        <div className="drawer-body">
          {tab === "People" && Object.entries(board.cast).map(([id, m]) => (
            <Tile key={id} payload={{ kind: "character", who: id }} onAdd={add} name={m.name ?? id}><Person cast={m} /></Tile>
          ))}
          {tab === "People" && <button className="btn" onClick={newPerson}>+ New person</button>}
          {tab === "Bubbles & notes" && (
            <>
              {ids(BUBBLES).map((b) => <Tile key={b} payload={{ kind: "bubble", type: b }} onAdd={add} name={b} sub="from the selected person" />)}
              <Tile payload={{ kind: "caption" }} onAdd={add} name="caption" sub="narration box" />
              <Tile payload={{ kind: "callout" }} onAdd={add} name="callout" sub="designer's note + pointer" />
            </>
          )}
          {tab === "Devices" && ids(DEVICES).map((d) => (
            <Tile key={d} payload={{ kind: "device", type: d as DeviceType }} onAdd={add} name={d} sub={["phone", "tablet", "laptop", "watch"].includes(d) ? "hand it to the selected person" : "place in the scene"} teal><DeviceIcon type={d as DeviceType} /></Tile>
          ))}
          {tab === "Gestures" && ids(GESTURES).map((g) => <Tile key={g} payload={{ kind: "gesture", type: g }} onAdd={add} name={g} sub="on a screen" teal />)}
          {tab === "Poses" && (
            <div className="thumbs">
              {ids(POSES).map((p) => {
                const who = sel && sel.kind === "character" ? (board.panels[pi] as ScenePanel)?.characters?.find((c) => (c.id ?? c.who) === sel.el)?.who : undefined;
                return <Tile key={p} payload={{ kind: "pose", pose: p }} onAdd={add} name={p}><PoseThumb pose={p as Pose} cast={(who && board.cast[who]) || {}} /></Tile>;
              })}
              <span className="hint">Select a person, then click a pose, or drag it onto anyone.</span>
            </div>
          )}
          {tab === "Draw & images" && (
            <>
              <button className="tile tool" onClick={() => imgInput.current?.click()} title="Add any picture to the selected scene panel. You can also drag an image file straight onto a panel.">
                <svg width={56} height={48} viewBox="0 0 56 48"><rect x={6} y={8} width={44} height={32} rx={2} fill="#e4e6e8" stroke="#1c1c1e" strokeWidth={2} /><path d="M10 36 L22 22 L30 30 L36 25 L46 36 Z" fill="#8d949a" stroke="#1c1c1e" strokeWidth={1.5} strokeLinejoin="round" /><circle cx={38} cy={16} r={4} fill="#fbfaf7" stroke="#1c1c1e" strokeWidth={1.5} /></svg>
                <span className="t-name">Picture…</span><span className="t-sub">or drag a file onto a panel</span>
              </button>
              <input ref={imgInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) addImage(f); e.target.value = ""; }} />
              <label className="check" title="Sketchify turns pictures into grey marker drawings so they sit in the storyboard style. Change any picture later from its toolbar.">
                <input type="checkbox" checked={sketchNew} onChange={(e) => setSketchNew(e.target.checked)} /> Sketchify new pictures
              </label>
              <span className="sep-v" />
              {DRAW_TOOLS.map((t) => (
                <button key={t.id} className={`tile tool${tool === t.id ? " on" : ""}`} aria-pressed={tool === t.id}
                  onClick={() => setTool(tool === t.id ? null : t.id)} title={`${t.name}: ${t.sub}`}>
                  <svg width={56} height={48} viewBox="0 0 56 48"><ShapeMark s={{ type: t.id, points: t.sample, fill: t.id === "rect" || t.id === "ellipse" ? "light" : undefined, text: t.id === "text" ? "Aa" : undefined, color: drawColor === "ink" ? undefined : drawColor }} /></svg>
                  <span className="t-name">{t.name}</span><span className="t-sub">{t.sub}</span>
                </button>
              ))}
              <label className="check swatch-row">Colour <Swatches value={drawColor} onChange={setDrawColor} /></label>
              <span className="hint">For anything the library doesn't have. Pick a tool, then drag on a scene panel. Select a shape to change its fill, rotate or delete it.</span>
            </>
          )}
          {tab === "Panels" && (
            <div className="sections">
              <section>
                <h3>Scenes</h3>
                <div className="thumbs">
                  {ids(SCENES).map((sc) => (
                    <PanelTile key={sc} payload={{ kind: "panel", panel: "scene", scene: sc }} onAdd={add} name={sc}><SceneThumb id={sc as SceneId} /></PanelTile>
                  ))}
                </div>
              </section>
              <section>
                <h3>Special panels</h3>
                <div className="thumbs">
                  <PanelTile payload={{ kind: "panel", panel: "title" }} onAdd={add} name="Title card"><CardThumb kind="title" board={board} /></PanelTile>
                  <PanelTile payload={{ kind: "panel", panel: "time" }} onAdd={add} name="Time passes"><CardThumb kind="time" board={board} /></PanelTile>
                  <PanelTile payload={{ kind: "panel", panel: "text" }} onAdd={add} name="Narration"><CardThumb kind="text" board={board} /></PanelTile>
                </div>
              </section>
            </div>
          )}
          {tab === "Cast" && (
            <>
              {Object.entries(board.cast).map(([id, m]) => <CastEditor key={id} id={id} m={m} commit={commit} />)}
              <button className="btn" onClick={newPerson}>+ New person</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
