/** Editor actions → field-level ops (see src/json.ts). Paths are resolved against the current board at send time. */
import type { Op } from "../json";
import type { Board, Bubble, CharacterInPanel, Gesture, LayoutOverride, Panel, ScenePanel, SceneDevice } from "../types";
import { isScene } from "../types";
import type { DeviceType } from "../vocab";

export type Kind = "panel" | "character" | "device" | "bubble" | "caption" | "gesture" | "callout" | "text" | "header" | "label";
export interface Sel { panel: string; el: string; kind: Kind }

export const panelIndex = (b: Board, id: string) => b.panels.findIndex((p) => p.id === id);

type ArrKey = "characters" | "devices" | "bubbles" | "gestures" | "callouts";

/** Map a rendered element id back to the JSON array + index it came from. */
export function locate(p: Panel, el: string): { key: ArrKey; index: number } | undefined {
  if (!isScene(p)) return undefined;
  const base = el.replace(/\.(screen|device)$/, "");
  const ci = (p.characters ?? []).findIndex((c) => (c.id ?? c.who) === base);
  if (ci >= 0) return { key: "characters", index: ci };
  const counts: Record<string, number> = {};
  const di = (p.devices ?? []).findIndex((d) => {
    counts[d.type] = (counts[d.type] ?? 0) + 1;
    return (d.id ?? (counts[d.type] > 1 ? `${d.type}-${counts[d.type]}` : d.type)) === base;
  });
  if (di >= 0) return { key: "devices", index: di };
  const m = /^(bubble|gesture|callout)-(\d+)$/.exec(el);
  const byId = (arr: { id?: string }[] | undefined) => (arr ?? []).findIndex((x) => x.id === el);
  for (const [key, arr] of [["bubbles", p.bubbles], ["gestures", p.gestures], ["callouts", p.callouts]] as const) {
    const i = byId(arr);
    if (i >= 0) return { key, index: i };
  }
  if (m) return { key: `${m[1]}s` as ArrKey, index: Number(m[2]) };
  return undefined;
}

export const layoutOps = (pi: number, el: string, patch: LayoutOverride): Op[] =>
  Object.entries(patch).map(([k, v]) => ({ path: ["panels", pi, "layout", el, k], value: v }));

export const resetLayoutOps = (pi: number, el: string): Op[] => [{ path: ["panels", pi, "layout", el], delete: true }];

export function setFieldOps(b: Board, sel: Sel, field: string, value: unknown): Op[] {
  const pi = panelIndex(b, sel.panel);
  const p = b.panels[pi];
  if (sel.kind === "panel" || sel.kind === "caption" || sel.kind === "text") {
    return [value === undefined || value === "" ? { path: ["panels", pi, field], delete: true } : { path: ["panels", pi, field], value }];
  }
  const loc = locate(p, sel.el);
  if (!loc) return [];
  return [value === undefined || value === "" ? { path: ["panels", pi, loc.key, loc.index, field], delete: true } : { path: ["panels", pi, loc.key, loc.index, field], value }];
}

export function removeOps(b: Board, sel: Sel): Op[] {
  const pi = panelIndex(b, sel.panel);
  const p = b.panels[pi];
  if (sel.kind === "panel") return [{ path: ["panels", pi], delete: true }];
  if (sel.kind === "caption") return [{ path: ["panels", pi, "caption"], delete: true }, ...resetLayoutOps(pi, "caption")];
  const loc = locate(p, sel.el);
  if (!loc) return [];
  return [...resetLayoutOps(pi, sel.el), { path: ["panels", pi, loc.key, loc.index], delete: true }];
}

export function addToPanelOps(b: Board, pi: number, what: { key: ArrKey; item: CharacterInPanel | Bubble | Gesture | SceneDevice | { text: string } }): Op[] {
  const p = b.panels[pi] as ScenePanel;
  const len = ((p as unknown as Record<string, unknown[]>)[what.key] ?? []).length;
  return [{ path: ["panels", pi, what.key, len], value: what.item }];
}

export function newPanelId(b: Board, base: string): string {
  const ids = new Set(b.panels.map((p) => p.id));
  if (!ids.has(base)) return base;
  let i = 2;
  while (ids.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

export function insertPanelOps(at: number, panel: Panel): Op[] {
  return [{ path: ["panels", at], value: panel, insert: true }];
}

export function movePanelOps(b: Board, from: number, to: number): Op[] {
  if (to < 0 || to >= b.panels.length) return [];
  const p = b.panels[from];
  return [{ path: ["panels", from], delete: true }, { path: ["panels", to], value: p, insert: true }];
}

export function heldScreenOps(b: Board, sel: Sel, screenPath: string): Op[] {
  const pi = panelIndex(b, sel.panel);
  const loc = locate(b.panels[pi], sel.el);
  if (!loc) return [];
  if (loc.key === "devices") return [{ path: ["panels", pi, "devices", loc.index, "screen"], value: screenPath }];
  if (loc.key === "characters") {
    const c = (b.panels[pi] as ScenePanel).characters![loc.index];
    const dev = typeof c.device === "string" ? c.device : c.device?.type ?? ("phone" as DeviceType);
    return [{ path: ["panels", pi, "characters", loc.index, "device"], value: { type: dev, screen: screenPath } }];
  }
  return [];
}

/** Take a held device out of someone's hand and place it in the scene. */
export function putDownOps(b: Board, sel: Sel): Op[] {
  const pi = panelIndex(b, sel.panel);
  const p = b.panels[pi] as ScenePanel;
  const loc = locate(p, sel.el);
  if (!loc || loc.key !== "characters") return [];
  const c = p.characters![loc.index];
  const d = typeof c.device === "string" ? { type: c.device } : c.device;
  if (!d) return [];
  return [
    { path: ["panels", pi, "characters", loc.index, "device"], delete: true },
    { path: ["panels", pi, "layout", `${c.id ?? c.who}.device`], delete: true },
    { path: ["panels", pi, "devices", (p.devices ?? []).length], value: { ...d } },
  ];
}

/** Hand a placed (handheld) device to a character in the same panel. */
export function handToOps(b: Board, sel: Sel, charId: string): Op[] {
  const pi = panelIndex(b, sel.panel);
  const p = b.panels[pi] as ScenePanel;
  const loc = locate(p, sel.el);
  const ci = (p.characters ?? []).findIndex((c) => (c.id ?? c.who) === charId);
  if (!loc || loc.key !== "devices" || ci < 0) return [];
  const { id: _id, at: _at, ...d } = p.devices![loc.index];
  return [
    { path: ["panels", pi, "characters", ci, "device"], value: d.screen || d.product === false ? d : d.type },
    ...resetLayoutOps(pi, sel.el),
    { path: ["panels", pi, "devices", loc.index], delete: true },
  ];
}

// ------------------------------------------------------------ clipboard
export type Clip =
  | { storyboardClip: 1; kind: "panel"; panel: Panel; cast: Board["cast"] }
  | { storyboardClip: 1; kind: "character"; item: ScenePanel["characters"] extends (infer T)[] | undefined ? T : never; cast: Board["cast"] }
  | { storyboardClip: 1; kind: "bubble" | "device" | "gesture" | "callout"; item: unknown };

/** What gets copied for the current selection (with any cast members it needs). */
export function clipFor(b: Board, sel: Sel): Clip | undefined {
  const pi = panelIndex(b, sel.panel);
  const p = b.panels[pi];
  if (!p) return undefined;
  if (sel.kind === "panel") {
    const who = isScene(p) ? (p.characters ?? []).map((c) => c.who) : [];
    return { storyboardClip: 1, kind: "panel", panel: p, cast: Object.fromEntries(who.map((w) => [w, b.cast[w] ?? {}])) };
  }
  const loc = locate(p, sel.el);
  if (!loc || !isScene(p)) return undefined;
  const item = (p[loc.key] as unknown[])[loc.index];
  if (loc.key === "characters") {
    const c = item as NonNullable<ScenePanel["characters"]>[number];
    return { storyboardClip: 1, kind: "character", item: c, cast: { [c.who]: b.cast[c.who] ?? {} } };
  }
  const kind = ({ devices: "device", bubbles: "bubble", gestures: "gesture", callouts: "callout" } as const)[loc.key as "devices" | "bubbles" | "gestures" | "callouts"];
  return kind ? { storyboardClip: 1, kind, item } : undefined;
}

/** Ops to paste a clip next to / into the current selection. Undefined = not a storyboard clip. */
export function pasteOps(b: Board, raw: unknown, sel: Sel | null): { ops: Op[]; label: string; select?: Sel } | string | undefined {
  if (!raw || typeof raw !== "object" || (raw as { storyboardClip?: number }).storyboardClip !== 1) return undefined;
  const clip = raw as Clip;
  const ops: Op[] = [];
  const addCast = (cast: Board["cast"]) => {
    for (const [id, m] of Object.entries(cast)) if (!b.cast[id]) ops.push({ path: ["cast", id], value: m });
  };
  const pi = sel ? panelIndex(b, sel.panel) : -1;
  if (clip.kind === "panel") {
    addCast(clip.cast);
    const panel = structuredClone(clip.panel);
    panel.id = newPanelId(b, panel.id);
    const at = pi >= 0 ? pi + 1 : b.panels.length;
    ops.push(...insertPanelOps(at, panel));
    return { ops, label: "Panel pasted", select: { panel: panel.id, el: "__panel", kind: "panel" } };
  }
  const p = b.panels[pi];
  if (!p || !isScene(p)) return "Select a scene panel to paste into.";
  const ids = new Set((p.characters ?? []).map((c) => c.id ?? c.who));
  if (clip.kind === "character") {
    addCast(clip.cast);
    const c = structuredClone(clip.item);
    delete c.at;
    let id = c.id ?? c.who;
    if (ids.has(id)) { let n = 2; while (ids.has(`${c.who}-${n}`)) n++; id = `${c.who}-${n}`; c.id = id; }
    ops.push({ path: ["panels", pi, "characters", (p.characters ?? []).length], value: c });
    return { ops, label: "Person pasted", select: { panel: p.id, el: id, kind: "character" } };
  }
  const key = ({ device: "devices", bubble: "bubbles", gesture: "gestures", callout: "callouts" } as const)[clip.kind];
  const item = structuredClone(clip.item) as Record<string, unknown>;
  for (const ref of ["from", "on", "target"]) if (typeof item[ref] === "string" && !ids.has(item[ref] as string) && !(p.devices ?? []).some((d) => (d.id ?? d.type) === item[ref])) delete item[ref];
  delete item.id;
  ops.push({ path: ["panels", pi, key, ((p as unknown as Record<string, unknown[]>)[key] ?? []).length], value: item });
  return { ops, label: `${clip.kind} pasted` };
}
