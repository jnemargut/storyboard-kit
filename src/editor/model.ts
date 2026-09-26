/** Editor actions → field-level ops (see src/json.ts). Paths are resolved against the current board at send time. */
import type { Op } from "../json";
import type { Board, Bubble, CharacterInPanel, Gesture, LayoutOverride, Panel, ScenePanel, SceneDevice } from "../types";
import { isScene } from "../types";
import type { DeviceType } from "../vocab";

export type Kind = "panel" | "character" | "device" | "bubble" | "caption" | "gesture" | "callout" | "text";
export interface Sel { panel: string; el: string; kind: Kind }

export const panelIndex = (b: Board, id: string) => b.panels.findIndex((p) => p.id === id);

type ArrKey = "characters" | "devices" | "bubbles" | "gestures" | "callouts";

/** Map a rendered element id back to the JSON array + index it came from. */
export function locate(p: Panel, el: string): { key: ArrKey; index: number } | undefined {
  if (!isScene(p)) return undefined;
  const base = el.endsWith(".screen") ? el.slice(0, -".screen".length) : el;
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
