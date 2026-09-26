import { useState } from "react";
import type { Op } from "../json";
import type { Board, CastMember, Panel, ScenePanel } from "../types";
import { isScene } from "../types";
import { ACCESSORIES, AGES, BODY, BUBBLES, DEVICES, GESTURES, HAIR, HAIR_SHADE, OUTFITS, SCENES, SKIN, ids, type DeviceType } from "../vocab";
import { Character } from "../render/character";
import { Device, DEVICE_DEFS } from "../render/devices";
import { figure } from "../render/rig";
import { insertPanelOps, newPanelId, panelIndex, type Sel } from "./model";

export type AddPayload =
  | { kind: "panel"; panel: "scene" | "title" | "time" | "text"; scene?: string }
  | { kind: "character"; who: string }
  | { kind: "bubble"; type: string }
  | { kind: "caption" }
  | { kind: "callout" }
  | { kind: "device"; type: DeviceType }
  | { kind: "gesture"; type: string };

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

function Person({ cast, w = 54 }: { cast: CastMember; w?: number }) {
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

function CastEditor({ id, m, commit }: { id: string; m: CastMember; commit: (ops: Op[]) => Promise<void> }) {
  const set = (k: keyof CastMember, v: unknown) => commit([{ path: ["cast", id, k], ...(v === "" || v === undefined ? { delete: true } : { value: v }) }]);
  const sel = (k: keyof CastMember, list: readonly { id: string }[], def: string) => (
    <label>{k === "hairShade" ? "hair colour" : k}
      <select value={(m[k] as string) ?? def} onChange={(e) => set(k, e.target.value)}>{list.map((x) => <option key={x.id}>{x.id}</option>)}</select>
    </label>
  );
  const acc = new Set(m.accessories ?? []);
  return (
    <div className="cast-card">
      <Person cast={m} w={66} />
      <div className="fields">
        <label>name<input value={m.name ?? id} onChange={(e) => set("name", e.target.value)} /></label>
        {sel("skin", SKIN, "tone-2")}{sel("hair", HAIR, "short")}{sel("hairShade", HAIR_SHADE, "dark")}
        {sel("body", BODY, "average")}{sel("age", AGES, "adult")}{sel("outfit", OUTFITS, "jacket")}
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

const TABS = ["People", "Bubbles & notes", "Devices", "Gestures", "Panels", "Cast"] as const;

export function Drawer({ board, sel, commit, setSel, flash }: {
  board: Board; sel: Sel | null; commit: (ops: Op[], label?: string) => Promise<void>; setSel: (s: Sel | null) => void; flash: (m: string) => void;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number] | null>(null);
  const [scene, setScene] = useState("coffee-shop");
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
        <span className="hint">{sel ? `Adds go to panel ${pi + 1}` : "Select a panel, or drag items onto one"}</span>
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
          {tab === "Panels" && (
            <>
              <div className="tile" style={{ cursor: "default" }}>
                <select value={scene} onChange={(e) => setScene(e.target.value)}>{ids(SCENES).map((s) => <option key={s}>{s}</option>)}</select>
                <button className="btn" style={{ marginTop: 4 }} onClick={() => add({ kind: "panel", panel: "scene", scene })}>+ Scene panel</button>
              </div>
              <Tile payload={{ kind: "panel", panel: "title" }} onAdd={add} name="Title card" />
              <Tile payload={{ kind: "panel", panel: "time" }} onAdd={add} name="Time passes" sub="'12 minutes later…'" />
              <Tile payload={{ kind: "panel", panel: "text" }} onAdd={add} name="Narration" />
            </>
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
