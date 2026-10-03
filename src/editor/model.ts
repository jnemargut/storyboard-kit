/** Editor actions → field-level ops (see src/json.ts). Paths are resolved against the current board at send time. */
import type { Op } from "../sketch/json";
import type { Board, Bubble, CharacterInPanel, Gesture, LayoutOverride, Panel, ScenePanel, SceneDevice } from "../types";
import { isScene } from "../types";
import type { DeviceType } from "../vocab";
import { layoutPanel, stackOrder } from "../render/layout";

export type Kind = "panel" | "character" | "device" | "bubble" | "caption" | "gesture" | "callout" | "text" | "header" | "label" | "workaround" | "point" | "shape" | "image";
export interface Sel { panel: string; el: string; kind: Kind }

export const panelIndex = (b: Board, id: string) => b.panels.findIndex((p) => p.id === id);

type ArrKey = "characters" | "devices" | "bubbles" | "gestures" | "callouts" | "shapes" | "images";

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
  const m = /^(bubble|gesture|callout|shape|image)-(\d+)$/.exec(el);
  const byId = (arr: { id?: string }[] | undefined) => (arr ?? []).findIndex((x) => x.id === el);
  for (const [key, arr] of [["bubbles", p.bubbles], ["gestures", p.gestures], ["callouts", p.callouts], ["shapes", p.shapes], ["images", p.images]] as const) {
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
  return [...resetLayoutOps(pi, sel.el), ...dependentOps(p as ScenePanel, pi, loc, sel.el), { path: ["panels", pi, loc.key, loc.index], delete: true }];
}

/**
 * When a person or a device goes, so does what points at them: that person's bubbles, gestures on them or on
 * the device, and callout arrows aimed at them (the callout stays, without its arrow). Keeps the file valid.
 */
function dependentOps(p: ScenePanel, pi: number, loc: { key: ArrKey; index: number }, el: string): Op[] {
  if (loc.key !== "characters" && loc.key !== "devices") return [];
  const id = el.replace(/\.(device|screen)$/, "");
  const ops: Op[] = [];
  const drop = (key: "bubbles" | "gestures", hit: (x: Record<string, unknown>) => boolean) => {
    const arr = (p[key] ?? []) as unknown as Record<string, unknown>[];
    for (let i = arr.length - 1; i >= 0; i--) if (hit(arr[i])) ops.push({ path: ["panels", pi, key, i], delete: true });
  };
  if (loc.key === "characters") drop("bubbles", (b) => b.from === id);
  drop("gestures", (g) => g.on === id);
  (p.callouts ?? []).forEach((c, i) => { if (c.target === id) ops.push({ path: ["panels", pi, "callouts", i, "target"], delete: true }); });
  return ops;
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
  | { storyboardClip: 1; kind: "bubble" | "device" | "gesture" | "callout" | "shape" | "image"; item: unknown };

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
  const kind = ({ devices: "device", bubbles: "bubble", gestures: "gesture", callouts: "callout", shapes: "shape", images: "image" } as const)[loc.key as "devices" | "bubbles" | "gestures" | "callouts" | "shapes" | "images"];
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
  const key = ({ device: "devices", bubble: "bubbles", gesture: "gestures", callout: "callouts", shape: "shapes", image: "images" } as const)[clip.kind];
  const item = structuredClone(clip.item) as Record<string, unknown>;
  for (const ref of ["from", "on", "target"]) if (typeof item[ref] === "string" && !ids.has(item[ref] as string) && !(p.devices ?? []).some((d) => (d.id ?? d.type) === item[ref])) delete item[ref];
  delete item.id;
  if (clip.kind === "image") { item.x = ((item.x as number | undefined) ?? 200) + 12; item.y = ((item.y as number | undefined) ?? 130) + 12; }
  if (clip.kind === "shape" && Array.isArray(item.points)) item.points = (item.points as [number, number][]).map(([x, y]) => [x + 12, y + 12]); // offset so the copy is visible
  const at = ((p as unknown as Record<string, unknown[]>)[key] ?? []).length;
  ops.push({ path: ["panels", pi, key, at], value: item });
  // what you pasted ends up selected (devices are named by type, so they keep the panel)
  const select: Sel = clip.kind === "device" ? { panel: p.id, el: "__panel", kind: "panel" } : { panel: p.id, el: `${clip.kind}-${at}`, kind: clip.kind as Kind };
  return { ops, label: `${clip.kind} pasted`, select };
}

/**
 * Swap who a character is. Their id changes with them, so every reference in the panel (bubbles, gestures,
 * callouts, focus, and the designer's layout nudges) moves to the new id instead of dangling.
 */
export function swapWhoOps(b: Board, sel: Sel, newWho: string): Op[] {
  const pi = panelIndex(b, sel.panel);
  const p = b.panels[pi] as ScenePanel;
  const loc = locate(p, sel.el);
  if (!loc || loc.key !== "characters") return [];
  const c = p.characters![loc.index];
  if (c.id) return [{ path: ["panels", pi, "characters", loc.index, "who"], value: newWho }]; // explicit id: nothing else changes
  const oldId = c.who;
  const taken = new Set((p.characters ?? []).map((x) => x.id ?? x.who));
  const newId = taken.has(newWho) ? `${newWho}-2` : newWho;
  const ops: Op[] = [{ path: ["panels", pi, "characters", loc.index, "who"], value: newWho }];
  if (newId !== newWho) ops.push({ path: ["panels", pi, "characters", loc.index, "id"], value: newId });
  const fix = (key: "bubbles" | "gestures" | "callouts", field: string) =>
    (p[key] ?? []).forEach((x, i) => { if ((x as unknown as Record<string, unknown>)[field] === oldId) ops.push({ path: ["panels", pi, key, i, field], value: newId }); });
  fix("bubbles", "from"); fix("gestures", "on"); fix("callouts", "target");
  if (p.focus === oldId) ops.push({ path: ["panels", pi, "focus"], value: newId });
  for (const [k, v] of Object.entries(p.layout ?? {})) {
    const m = /^([^.]+)(\..+)?$/.exec(k);
    if (m && m[1] === oldId) ops.push({ path: ["panels", pi, "layout", k], delete: true }, { path: ["panels", pi, "layout", `${newId}${m[2] ?? ""}`], value: v });
  }
  return ops;
}

/**
 * What the Delete key removes for the current selection. A held device goes (not its holder); a callout's
 * pointer goes (not the callout); the board title stays (it's required). Undefined = nothing to delete.
 */
export function deleteOps(b: Board, sel: Sel): { ops: Op[]; keepSelection?: boolean } | undefined {
  if (sel.kind === "header") return undefined;
  const pi = panelIndex(b, sel.panel);
  const p = b.panels[pi];
  if (!p) return undefined;
  if (sel.kind === "label") return p.label ? { ops: [{ path: ["panels", pi, "label"], delete: true }] } : undefined;
  if (sel.kind === "workaround") return isScene(p) && p.workaround ? { ops: [{ path: ["panels", pi, "workaround"], delete: true }] } : undefined;
  if (sel.kind === "point") {
    const cid = sel.el.replace(/\.point$/, "");
    const loc = locate(p, cid);
    const ops: Op[] = [{ path: ["panels", pi, "layout", sel.el], delete: true }];
    if (loc?.key === "callouts") ops.push({ path: ["panels", pi, "callouts", loc.index, "target"], delete: true });
    return { ops };
  }
  // a title or time card's words: the subtitle and icon go; the main line is emptied (the card stays)
  if (sel.kind === "text" && (p.type === "title" || p.type === "time")) {
    const key = sel.el === "title" ? "title" : sel.el === "text" ? "text" : sel.el;
    if (key === "subtitle") return p.type === "title" && p.subtitle ? { ops: [{ path: ["panels", pi, key], delete: true }, ...resetLayoutOps(pi, sel.el)] } : undefined;
    // a time card always draws an icon (a clock by default), so deleting it hides it
    if (key === "icon") return { ops: [...resetLayoutOps(pi, "icon"), { path: ["panels", pi, "layout", "icon", "hidden"], value: true }] };
    if (key === "title" || key === "text") return { ops: [{ path: ["panels", pi, key], value: "" }] };
    return undefined;
  }
  if (/\.(device|screen)$/.test(sel.el)) {
    const loc = locate(p, sel.el);
    if (loc?.key === "characters") {
      // a phone pose draws a phone even with no device listed, so the pose goes too (back to standing, or sitting at a seat)
      const c = (p as ScenePanel).characters![loc.index];
      const phonePose = c.pose === "holding-phone" || c.pose === "phone-to-ear";
      // taps and swipes on that device go with it
      const gs = ((p as ScenePanel).gestures ?? []).map((g, i) => (g.on === c.id || g.on === c.who ? i : -1)).filter((i) => i >= 0).reverse();
      return { ops: [
        ...gs.map((i): Op => ({ path: ["panels", pi, "gestures", i], delete: true })),
        { path: ["panels", pi, "characters", loc.index, "device"], delete: true },
        ...(phonePose ? [{ path: ["panels", pi, "characters", loc.index, "pose"], delete: true }] : []),
        ...resetLayoutOps(pi, sel.el),
      ] };
    }
    if (loc?.key === "devices") return { ops: removeOps(b, { ...sel, el: sel.el.replace(/\.(device|screen)$/, "") }) };
    return undefined;
  }
  const ops = removeOps(b, sel);
  return ops.length ? { ops } : undefined;
}

// ------------------------------------------------------------ arrange (layer order)
export type Arrange = "front" | "forward" | "backward" | "back";
export const ARRANGEABLE: Kind[] = ["character", "device", "shape", "image"];

/**
 * Ops to move the selection up or down the layer order among people, devices and shapes in its panel.
 * Writes only the moved element's `layout.z`. A held device moves with its holder. Undefined = already there.
 */
export function arrangeOps(b: Board, sel: Sel, to: Arrange): Op[] | undefined {
  const pi = panelIndex(b, sel.panel);
  const p = b.panels[pi];
  if (!p || !isScene(p)) return undefined;
  const id = sel.el.replace(/\.(device|screen)$/, "");
  const all = stackOrder(layoutPanel(b, p, () => undefined), p);
  const me = all.find((it) => it.id === id);
  if (!me) return undefined;
  const zOp = (z: number): Op => ({ path: ["panels", pi, "layout", id, "z"], value: Math.round(z * 1000) / 1000 });
  const group = all.filter((it) => it.behind === me.behind);
  const i = group.indexOf(me);
  const zs = group.map((it) => it.z);
  const up = to === "front" || to === "forward";
  const atEdge = up ? i === group.length - 1 : i === 0;
  // "to front" means in front of everything, furniture included (and "to back" behind it)
  const crosses = (me.kind === "character" || me.kind === "device") && me.behind === up;
  const allTheWay = crosses && ((to === "front" && me.behind) || (to === "back" && !me.behind));
  if (atEdge || allTheWay) {
    // already the top (or bottom) of its layer: people and devices can cross the scene's furniture (a seated
    // person behind a table comes in front of it and of the laptop on it; a device goes behind the counter)
    if (!crosses) return undefined;
    const other = all.filter((it) => it.behind !== me.behind).map((it) => it.z);
    const z = !other.length ? 0 : to === "front" ? Math.max(...other) + 1 : to === "back" ? Math.min(...other) - 1 : up ? Math.min(...other) - 1 : Math.max(...other) + 1;
    return [{ path: ["panels", pi, "layout", id, "layer"], value: up ? "front" : "back" }, zOp(z)];
  }
  let z: number;
  if (to === "front") z = Math.max(...zs) + 1;
  else if (to === "back") z = Math.min(...zs) - 1;
  else if (to === "forward") z = i + 2 < group.length ? (zs[i + 1] + zs[i + 2]) / 2 : zs[i + 1] + 1;
  else z = i - 2 >= 0 ? (zs[i - 1] + zs[i - 2]) / 2 : zs[i - 1] - 1;
  return [zOp(z)];
}
