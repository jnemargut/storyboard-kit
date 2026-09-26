import { useLayoutEffect, useRef, useState } from "react";
import type { Op } from "../json";
import type { Board, CharacterInPanel, Panel, ScenePanel } from "../types";
import { isScene } from "../types";
import { ANGLES, BUBBLES, DEVICES, DIRECTIONS, GESTURES, HANDHELD, MOODS, POSES, SCENES, SHOTS, TIME_ICONS, ids } from "../vocab";
import { heldDeviceOf } from "../render/layout";
import { feelingOf } from "../render/board";
import { handToOps, putDownOps, locate, movePanelOps, newPanelId, panelIndex, removeOps, resetLayoutOps, setFieldOps, insertPanelOps, layoutOps, type Sel } from "./model";

interface Props {
  board: Board;
  file: string;
  sel: Sel;
  box: { x: number; y: number; w: number; h: number };
  commit: (ops: Op[], label?: string) => Promise<void>;
  setSel: (s: Sel | null) => void;
  startEdit: (field?: string) => void;
  upload: (f: File) => void;
  flash: (m: string) => void;
  zoomToPanel: (panelId: string) => void;
}

function Pick({ value, options, onChange, title, labels }: { value: string; options: string[]; onChange: (v: string) => void; title: string; labels?: Record<string, string> }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} title={title} aria-label={title}>
      {!options.includes(value) && <option value={value}>{value || "–"}</option>}
      {options.map((o) => <option key={o} value={o}>{labels?.[o] ?? (o || "(none)")}</option>)}
    </select>
  );
}

const panelTargets = (p: Panel) => (isScene(p) ? [...(p.characters ?? []).map((c) => c.id ?? c.who), ...(p.devices ?? []).map((d) => d.id ?? d.type)] : []);
const FEEL_LABELS: Record<string, string> = { "-2": "feels awful", "-1": "feels bad", "0": "feels okay", "1": "feels good", "2": "feels great", "": "feeling: from mood" };

/** A precise pointer to the selection, to paste into a coding agent ("change this one"). */
function agentRef(board: Board, file: string, sel: Sel): string {
  if (sel.kind === "header") return `In ${file}: the board ${sel.el === "title" ? `title ("${board.title}")` : "persona/subtitle line"}.`;
  const pi = panelIndex(board, sel.panel);
  const p = board.panels[pi];
  const where = `In ${file}: panel ${pi + 1} (id "${sel.panel}"${p?.label ? `, "${p.label}"` : ""})`;
  if (sel.kind === "panel") return `${where}.`;
  if (sel.kind === "label") return `${where}, its label.`;
  const loc = p && locate(p, sel.el);
  const item = loc && isScene(p) ? (p[loc.key] as unknown[])[loc.index] : undefined;
  const text = item && typeof item === "object" && "text" in item ? ` saying "${(item as { text: string }).text}"` : "";
  const path = loc ? ` (panels[${pi}].${loc.key}[${loc.index}])` : "";
  return `${where}: the ${sel.kind} "${sel.el}"${text}${path}.`;
}

export function Toolbar({ board, file, sel, box, commit, setSel, startEdit, upload, flash, zoomToPanel }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState(box.x);
  const [open, setOpen] = useState(false);
  // keep the toolbar inside the board: shift left when it would overflow the right edge
  useLayoutEffect(() => {
    const el = bar.current, host = el?.parentElement;
    if (!el || !host) return;
    setLeft(Math.max(0, Math.min(box.x, host.clientWidth - el.offsetWidth - 4)));
  });
  const top = box.y > 44 ? box.y - 40 : box.y + box.h + 10;
  const ask = (
    <button onClick={async () => {
      try { await navigator.clipboard.writeText(agentRef(board, file, sel) + " "); flash("Copied a pointer to this. Paste it into your agent and say what to change."); }
      catch { window.prompt("Copy this into your agent:", agentRef(board, file, sel)); }
    }} title="Copy a precise reference to this element for your coding agent">Ask agent</button>
  );
  const render = (main: React.ReactNode, more?: React.ReactNode) => (
    <>
      <div ref={bar} className="ctx" style={{ left, top }} onPointerDown={(e) => e.stopPropagation()}>
        {main}
        {more && <button onClick={() => setOpen(!open)} aria-expanded={open} title="More options">{open ? "Less" : "More"}</button>}
        <span className="sep" />{ask}
      </div>
      {more && open && <div className="ctx-more" style={{ left, top: top + 34 }} onPointerDown={(e) => e.stopPropagation()}>{more}</div>}
    </>
  );

  if (sel.kind === "header") {
    return render(sel.el === "title"
      ? <><span className="kind">Board title</span><button onClick={() => startEdit()}>Edit title</button></>
      : <><span className="kind">Under the title</span><button onClick={() => startEdit()}>Edit persona</button><button onClick={() => startEdit("subtitle")}>Edit subtitle</button></>);
  }
  const pi = panelIndex(board, sel.panel);
  const panel = board.panels[pi];
  if (!panel) return null;
  if (sel.kind === "label") {
    return render(<><span className="kind">Panel {pi + 1} label</span><button onClick={() => startEdit()}>Edit label</button>{panel.label && <button onClick={() => commit([{ path: ["panels", pi, "label"], delete: true }])}>Remove</button>}</>);
  }
  const special = isScene(panel) && ["over-the-shoulder", "screen", "pov"].includes(panel.shot ?? "");
  const set = (field: string, value: unknown) => commit(setFieldOps(board, sel, field, value));
  const sep = <span className="sep" />;
  const reset = panel.layout?.[sel.el] ? <button onClick={() => commit(resetLayoutOps(pi, sel.el), "Position reset")} title="Undo manual moves for this element">Reset position</button> : null;
  const remove = <button onClick={() => { void commit(removeOps(board, sel)); setSel(null); }} title="Delete">Delete</button>;
  const editText = <button onClick={() => startEdit()} title="Or double-click the text. Drag the corner handle to change its size.">Edit text</button>;
  const screenBtn = (
    <>
      <button className="teal" onClick={() => input.current?.click()} title="Put your own design on this screen">Screen…</button>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
    </>
  );

  if (sel.kind === "panel") {
    const move = (d: number) => commit(movePanelOps(board, pi, pi + d));
    const dup = () => {
      const copy = structuredClone(panel);
      copy.id = newPanelId(board, panel.id);
      void commit(insertPanelOps(pi + 1, copy), "Panel duplicated");
    };
    const kind = isScene(panel) ? `Panel ${pi + 1}` : panel.type === "title" ? "Title card" : panel.type === "time" ? "Time card" : "Narration";
    const cam = panel.layout?.__camera ?? {};
    const zoomCam = (f: number) => commit(layoutOps(pi, "__camera", { scale: Math.round(Math.min(4, Math.max(0.5, (cam.scale ?? 1) * f)) * 100) / 100 }));
    const lanes = !!board.page?.lanes && isScene(panel);
    const main = (
      <>
        <span className="kind">{kind}</span>
        {isScene(panel) && <Pick title="Scene" value={panel.scene} options={ids(SCENES)} onChange={(v) => set("scene", v)} />}
        {isScene(panel) && <Pick title="Camera shot" value={panel.shot ?? "wide"} options={ids(SHOTS)} onChange={(v) => set("shot", v)} />}
        {panel.type === "time" && <Pick title="Icon" value={panel.icon ?? "clock"} options={ids(TIME_ICONS)} onChange={(v) => set("icon", v)} />}
        {lanes && isScene(panel) && <Pick title="How they feel in this moment (journey lane)" value={panel.feeling === undefined ? "" : String(panel.feeling)} options={["", "-2", "-1", "0", "1", "2"]} labels={FEEL_LABELS} onChange={(v) => set("feeling", v === "" ? undefined : Number(v))} />}
        {lanes && isScene(panel) && <button onClick={() => { const v = window.prompt("Their workaround in this moment (journey lane)", panel.workaround ?? ""); if (v !== null) void set("workaround", v.trim() || undefined); }}>{panel.workaround ? "Edit workaround" : "+ Workaround"}</button>}
        <button onClick={() => zoomToPanel(panel.id)} title="Zoom the editor in on this panel">Zoom to panel</button>
      </>
    );
    const more = (
      <>
        {isScene(panel) && panelTargets(panel).length > 1 && <Pick title="Camera focus" value={panel.focus ?? ""} options={["", ...panelTargets(panel)]} labels={{ "": "focus: auto" }} onChange={(v) => set("focus", v || undefined)} />}
        {isScene(panel) && <><button onClick={() => zoomCam(1 / 1.15)} title="Camera zoom out (drag the panel background to pan)">Camera −</button><button onClick={() => zoomCam(1.15)} title="Camera zoom in (drag the panel background to pan)">Camera +</button></>}
        {isScene(panel) && (cam.dx || cam.dy || cam.scale) && <button onClick={() => commit(resetLayoutOps(pi, "__camera"), "Camera reset")}>Reset camera</button>}
        {isScene(panel) && !panel.caption && <button onClick={() => set("caption", "Caption")}>+ Caption</button>}
        <button onClick={() => { const v = window.prompt("Label under the panel", panel.label ?? ""); if (v !== null) void set("label", v.trim() || undefined); }}>Label</button>
        {sep}
        <button onClick={() => move(-1)} disabled={pi === 0} title="Move earlier">Earlier</button>
        <button onClick={() => move(1)} disabled={pi === board.panels.length - 1} title="Move later">Later</button>
        <button onClick={dup}>Duplicate</button>
        {panel.layout && <button onClick={() => commit([{ path: ["panels", pi, "layout"], delete: true }], "All manual moves in this panel reset")}>Reset all moves</button>}
        {remove}
        {isScene(panel) && !lanes && <span className="kind">{feelingOf(panel) !== undefined ? `feels ${feelingOf(panel)! > 0 ? "good" : feelingOf(panel)! < 0 ? "bad" : "okay"}` : ""}</span>}
      </>
    );
    return render(main, more);
  }

  if (isScene(panel) && sel.kind === "device" && locate(panel, sel.el)?.key === "characters") {
    // a device in someone's hand (or standing beside them)
    const loc = locate(panel, sel.el)!;
    const c = panel.characters![loc.index] as CharacterInPanel;
    const held = heldDeviceOf(c);
    const handheld = held && (HANDHELD as readonly string[]).includes(held.type);
    const product = held?.product !== false;
    const setHeld = (patch: Record<string, unknown>) => {
      const next = { ...(typeof c.device === "string" ? { type: c.device } : c.device), ...patch };
      const simple = !("screen" in next && next.screen) && next.product !== false;
      return commit([{ path: ["panels", pi, "characters", loc.index, "device"], value: simple ? next.type : next }]);
    };
    return render(
      <>
        <span className="kind">{c.who}'s</span>
        <Pick title="Device" value={held?.type ?? "phone"} options={handheld ? [...HANDHELD] : ids(DEVICES)} onChange={(v) => setHeld({ type: v })} />
        <button onClick={() => setHeld({ product: product ? false : undefined })} title="Teal = our product. Grey = a personal device or someone else's app.">{product ? "Our product" : "Personal"}</button>
        {screenBtn}
        <button onClick={() => commit(putDownOps(board, sel), "Put down in the scene")} title="Detach it from the person and place it in the scene">Put down</button>
      </>,
      reset ?? undefined,
    );
  }

  if (isScene(panel) && sel.kind === "character") {
    const loc = locate(panel, sel.el)!;
    const c = panel.characters![loc.index] as CharacterInPanel;
    const held = heldDeviceOf(c);
    const setDevice = (v: string) => commit([{ path: ["panels", pi, "characters", loc.index, "device"], ...(v ? { value: held?.screen ? { type: v, screen: held.screen } : v } : { delete: true }) }]);
    return render(
      <>
        <Pick title="Pose" value={c.pose ?? "standing"} options={ids(POSES)} onChange={(v) => set("pose", v)} />
        <Pick title="Mood" value={c.mood ?? "neutral"} options={ids(MOODS)} onChange={(v) => set("mood", v)} />
        {!special && <button onClick={() => set("facing", (c.facing ?? "right") === "right" ? "left" : "right")} title="Flip left/right">Flip</button>}
        <Pick title="Device in hand (click the device itself to move, resize or put it down)" value={held?.type ?? ""} options={["", ...HANDHELD]} labels={{ "": "no device" }} onChange={setDevice} />
        {held && screenBtn}
      </>,
      <>
        <Pick title="Who" value={c.who} options={Object.keys(board.cast)} onChange={(v) => commit([{ path: ["panels", pi, "characters", loc.index, "who"], value: v }])} />
        {special
          ? <span className="kind" title="This camera shot always shows the person from behind or leaves them off-screen. Change the panel's shot to pick an angle.">angle: set by shot</span>
          : <Pick title="Angle" value={c.angle ?? "three-quarter"} options={ids(ANGLES)} onChange={(v) => set("angle", v)} />}
        <Pick title="Pose variation" value={c.variant ? String(c.variant) : ""} options={["", "1", "2", "3"]} labels={{ "": "variation: auto", "1": "variation 1", "2": "variation 2", "3": "variation 3" }} onChange={(v) => set("variant", v ? Number(v) : undefined)} />
        {sep}{reset}{remove}
      </>,
    );
  }

  if (sel.kind === "device" && isScene(panel)) {
    const loc = locate(panel, sel.el);
    const d = loc?.key === "devices" ? panel.devices![loc.index] : undefined;
    const people = (panel.characters ?? []).map((c) => c.id ?? c.who);
    const canHold = d && (HANDHELD as readonly string[]).includes(d.type) && people.length > 0;
    return render(
      <>
        {d && <Pick title="Device" value={d.type} options={ids(DEVICES)} onChange={(v) => set("type", v)} />}
        {d && <button onClick={() => set("product", d.product === false ? undefined : false)} title="Teal = our product. Grey = a personal device or someone else's app.">{d.product === false ? "Personal" : "Our product"}</button>}
        {screenBtn}
        {canHold && <Pick title="Hand it to someone" value="" options={["", ...people]} labels={{ "": "hand to…" }} onChange={(v) => v && commit(handToOps(board, sel, v), `Handed to ${v}`)} />}
      </>,
      <>
        {d && <Pick title="Turn the screen away from the viewer" value={d.tilt ?? ""} options={["", "left", "right"]} labels={{ "": "tilt: none", left: "tilt left", right: "tilt right" }} onChange={(v) => set("tilt", v || undefined)} />}
        {reset}{d && remove}
      </>,
    );
  }

  if (sel.kind === "bubble" && isScene(panel)) {
    const loc = locate(panel, sel.el);
    const b = loc ? panel.bubbles![loc.index] : undefined;
    if (!b) return null;
    return render(
      <>
        <Pick title="Bubble type" value={b.type} options={ids(BUBBLES)} onChange={(v) => set("type", v)} />
        <Pick title="Who's speaking" value={b.from ?? ""} options={["", ...panelTargets(panel)]} labels={{ "": "no speaker" }} onChange={(v) => set("from", v || undefined)} />
        {editText}
      </>,
      <>{reset}{remove}</>,
    );
  }

  if (sel.kind === "gesture" && isScene(panel)) {
    const loc = locate(panel, sel.el);
    const g = loc ? panel.gestures![loc.index] : undefined;
    if (!g) return null;
    return render(
      <>
        <Pick title="Gesture" value={g.type} options={ids(GESTURES)} onChange={(v) => set("type", v)} />
        {g.type === "swipe" && <Pick title="Direction" value={g.direction ?? "left"} options={[...DIRECTIONS]} onChange={(v) => set("direction", v)} />}
        <Pick title="On whose screen" value={g.on ?? ""} options={["", ...panelTargets(panel)]} labels={{ "": "first screen" }} onChange={(v) => set("on", v || undefined)} />
      </>,
      <>{reset}{remove}</>,
    );
  }

  if (sel.kind === "callout" && isScene(panel)) {
    const loc = locate(panel, sel.el);
    const co = loc ? panel.callouts![loc.index] : undefined;
    return render(
      <>
        <span className="kind">Callout</span>
        {co && <Pick title="Points at" value={co.target ?? ""} options={["", ...panelTargets(panel as ScenePanel)]} labels={{ "": "points at nothing" }} onChange={(v) => set("target", v || undefined)} />}
        {editText}
      </>,
      <>{reset}{remove}</>,
    );
  }

  if (sel.kind === "caption" || sel.kind === "text") {
    return render(<><span className="kind">{sel.kind === "caption" ? "Caption" : "Text"}</span>{editText}</>, reset || sel.kind === "caption" ? <>{reset}{sel.kind === "caption" && remove}</> : undefined);
  }
  return null;
}
