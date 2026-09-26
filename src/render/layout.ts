import type { Board, Bubble, CastMember, CharacterInPanel, LayoutOverride, ScenePanel } from "../types";
import { HANDHELD, type DeviceType, type Mood, type Pose } from "../vocab";
import { autoVariant, figure, type Figure, type Pt } from "./rig";
import { DEVICE_DEFS, type Rect } from "./devices";
import { SCENE_DEFS } from "./scenes";
import { FLOOR_Y, PANEL_H, PANEL_W } from "./tokens";

export interface Camera { s: number; tx: number; ty: number }
export const toPanel = (c: Camera, p: Pt): Pt => [p[0] * c.s + c.tx, p[1] * c.s + c.ty];

export interface HeldPlacement {
  type: DeviceType;
  href?: string;
  product: boolean;
  /** Device transform in character-local space. */
  cx: number; cy: number; scale: number; rot: number;
}

export interface CharPlaced {
  id: string;
  who: string;
  cast: CastMember;
  fig: Figure;
  mood: Mood;
  pose: Pose;
  x: number; y: number; s: number;
  behind: boolean;
  held?: HeldPlacement;
  ov: LayoutOverride;
  /** Seated pose at a mark with no furniture: draw a stool. */
  stool: boolean;
}

export interface DevPlaced {
  id: string;
  type: DeviceType;
  href?: string;
  product: boolean;
  x: number; y: number; s: number; rot: number;
  behind: boolean;
  ov: LayoutOverride;
  tilt?: "left" | "right";
}

export interface Anchor {
  /** Head centre + radius (panel units) for characters. */
  head?: { x: number; y: number; r: number };
  screen?: Rect;
  /** The screen belongs to the product (teal) rather than a personal device (grey). */
  product?: boolean;
  box: Rect;
}

export type Special =
  | { kind: "ots"; char: CharPlaced; device?: HeldPlacement & { id: string } }
  | { kind: "screen" | "pov"; device: { id: string; type: DeviceType; href?: string; product: boolean } }
  | null;

export interface PanelLayout {
  camera: Camera;
  chars: CharPlaced[];
  devices: DevPlaced[];
  anchors: Record<string, Anchor>;
  special: Special;
}

/** Characters are drawn a little larger than the rig's native size so faces read in wide shots. */
export const CHAR_SCALE = 1.12;

const HELD_SCALE: Partial<Record<DeviceType, number>> = { phone: 0.17, tablet: 0.21, laptop: 0.3, watch: 0.13 };
const PLACED_SCALE: Partial<Record<DeviceType, number>> = {
  phone: 0.18, tablet: 0.24, laptop: 0.42, desktop: 0.5, watch: 0.3, "car-display": 0.46, tv: 0.56,
  "smart-speaker": 0.42, kiosk: 0.64, "payment-terminal": 0.36,
};

export type AssetResolver = (path: string) => string | undefined;

const ovOf = (panel: ScenePanel, id: string): LayoutOverride => panel.layout?.[id] ?? {};

export function heldDeviceOf(c: CharacterInPanel): { type: DeviceType; screen?: string; product?: boolean } | undefined {
  if (!c.device) return undefined;
  return typeof c.device === "string" ? { type: c.device } : c.device;
}

export const isHandheld = (t: DeviceType) => (HANDHELD as readonly string[]).includes(t);

/** Phone poses without a device still get a phone in hand, a personal (grey) one. Non-handheld devices are never held. */
export function effectiveDevice(c: CharacterInPanel): { type: DeviceType; screen?: string; product: boolean } | undefined {
  const d = heldDeviceOf(c);
  if (d && isHandheld(d.type)) return { ...d, product: d.product !== false };
  if (c.pose === "holding-phone" || c.pose === "phone-to-ear") return { type: "phone", product: false };
  return undefined;
}

function holdPlacement(fig: Figure, type: DeviceType, pose: string, href?: string, product = true): HeldPlacement {
  const j = fig.j;
  const sc = HELD_SCALE[type] ?? 0.2;
  if (type === "watch") {
    // on the wrist, just above the hand, with the strap running along the forearm
    // side views draw the far (left) arm behind the body, so the watch goes on the near arm there
    const [hd, el] = fig.view === "side" ? [j.hdR, j.elR] : [j.hdL, j.elL];
    const fx = el[0] - hd[0], fy = el[1] - hd[1];
    const rot = (Math.atan2(fy, fx) * 180) / Math.PI - 90;
    return { type, href, product, cx: hd[0] + fx * 0.3, cy: hd[1] + fy * 0.3, scale: sc, rot };
  }
  if (type === "laptop" || pose === "sitting-laptop") {
    const mx = (j.hdL[0] + j.hdR[0]) / 2, my = (j.hdL[1] + j.hdR[1]) / 2;
    return { type, href, product, cx: mx + (fig.view === "side" ? 6 * fig.dir : 0), cy: my + 1, scale: HELD_SCALE.laptop!, rot: 0 };
  }
  const rot = fig.view === "side" ? -18 * fig.dir : fig.view === "back" ? 4 : -8;
  const up = type === "phone" ? 6 : 8;
  return { type, href, product, cx: j.hdR[0] + (fig.view === "side" ? 2 * fig.dir : 0), cy: j.hdR[1] - up, scale: sc, rot };
}

/** Axis-aligned box of a rect after rotate(rot) scale(s) translate(cx,cy) in some parent space. */
function xformRect(r: Rect, cx: number, cy: number, s: number, rot: number): Rect {
  const a = (rot * Math.PI) / 180;
  const pts: Pt[] = [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]].map(([x, y]) => {
    const X = x * s, Y = y * s;
    return [cx + X * Math.cos(a) - Y * Math.sin(a), cy + X * Math.sin(a) + Y * Math.cos(a)];
  });
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

const clampCam = (c: Camera): Camera => ({
  s: c.s,
  tx: Math.min(0, Math.max(PANEL_W - PANEL_W * c.s, c.tx)),
  ty: Math.min(0, Math.max(PANEL_H - PANEL_H * c.s, c.ty)),
});

export function layoutPanel(board: Board, panel: ScenePanel, asset: AssetResolver): PanelLayout {
  const scene = SCENE_DEFS[panel.scene] ?? SCENE_DEFS.blank;
  const used = new Set<string>();
  const chars: CharPlaced[] = [];
  const devices: DevPlaced[] = [];
  const shot = panel.shot ?? "wide";

  // ---- characters
  const list = panel.characters ?? [];
  /** Non-handheld devices given to a character are stood beside them instead (kiosk, car display…). */
  const besides: { charId: string; type: DeviceType; screen?: string; product: boolean; x: number; dir: number; behind: boolean }[] = [];
  const autoMarks = scene.order.filter((m) => !list.some((c) => c.at === m));
  list.forEach((c) => {
    const id = c.id ?? c.who;
    const cast = board.cast[c.who] ?? {};
    let markName = c.at && scene.marks[c.at] ? c.at : undefined;
    if (!markName) markName = autoMarks.find((m) => !used.has(m)) ?? scene.order[0];
    used.add(markName);
    const mark = scene.marks[markName];
    const held = effectiveDevice(c);
    const raw = heldDeviceOf(c);
    const beside = raw && !isHandheld(raw.type) ? raw : undefined;
    let pose = c.pose ?? (held ? "holding-phone" : beside ? "pointing" : "standing");
    // a seat mark sits people down only when no pose was chosen; an explicit "standing" stands
    if (mark.seated && !c.pose) pose = pose === "holding-phone" && heldDeviceOf(c)?.type !== "phone" ? "sitting-laptop" : "sitting";
    if (panel.scene === "car" && markName === "driver-seat" && !c.pose) pose = "driving";
    const angle = c.angle ?? (pose === "walking" || pose === "driving" || mark.seated ? "side" : "three-quarter");
    const facing = c.facing ?? mark.facing ?? "right";
    const fig = figure(pose, angle, facing, cast, c.variant ?? autoVariant(`${panel.id}:${id}`));
    const heldP = held ? holdPlacement(fig, held.type, pose, held.screen ? asset(held.screen) : undefined, held.product) : undefined;
    if (heldP && pose === "sitting" && held?.type === "phone") {
      // seated with a phone: lift the phone hand to chest height
      fig.j.elR = [fig.j.shR[0] + 6 * fig.dir, fig.j.shR[1] + 18];
      fig.j.hdR = [fig.j.shR[0] + 14 * fig.dir, fig.j.shR[1] + 8];
      Object.assign(heldP, holdPlacement(fig, "phone", "holding-phone", heldP.href, heldP.product));
    }
    if (beside) besides.push({ charId: id, type: beside.type, screen: beside.screen, product: beside.product !== false, x: mark.x + 52 * fig.dir, dir: fig.dir, behind: !!mark.behind });
    chars.push({
      id, who: c.who, cast, fig, mood: c.mood ?? "neutral", pose,
      x: mark.x, y: mark.y, s: CHAR_SCALE * (mark.scale ?? 1) * fig.scale, behind: !!mark.behind,
      held: heldP, ov: ovOf(panel, id),
      stool: !!fig.j.seated && !mark.seated && panel.scene !== "car",
    });
  });

  // ---- placed devices
  const typeCount: Record<string, number> = {};
  (panel.devices ?? []).forEach((d) => {
    typeCount[d.type] = (typeCount[d.type] ?? 0) + 1;
    const id = d.id ?? (typeCount[d.type] > 1 ? `${d.type}-${typeCount[d.type]}` : d.type);
    const mark = d.at ? scene.marks[d.at] : undefined;
    const spot = mark
      ? { x: mark.x, y: mark.surface ?? mark.y, behind: mark.behind }
      : scene.spots[d.type] ?? scene.defaultSpot;
    const s = PLACED_SCALE[d.type] ?? 0.4;
    const def = DEVICE_DEFS[d.type];
    // sit on the surface: shift up by half height for things on tables
    const onSurface = mark?.surface !== undefined;
    const y = onSurface ? spot.y - (def.h * s) / 2 : spot.y;
    devices.push({ id, type: d.type, product: d.product !== false, href: d.screen ? asset(d.screen) : undefined, x: spot.x, y, s, rot: 0, behind: !!(spot as { behind?: boolean }).behind, ov: ovOf(panel, id), tilt: d.tilt });
  });
  const proxy: Record<string, string> = {};
  for (const b of besides) {
    const id = `${b.charId}.device`;
    const s = PLACED_SCALE[b.type] ?? 0.4;
    const h = DEVICE_DEFS[b.type].h * s;
    const floorStanding = b.type === "kiosk";
    devices.push({ id, type: b.type, product: b.product, href: b.screen ? asset(b.screen) : undefined, x: b.x, y: floorStanding ? FLOOR_Y - h / 2 : FLOOR_Y - 96, s, rot: 0, behind: b.behind, ov: ovOf(panel, id) });
    proxy[b.charId] = id;
  }

  // ---- camera
  const focusChar = chars.find((c) => c.id === panel.focus) ?? (panel.focus ? undefined : chars.find((c) => c.held) ?? chars[0]);
  const focusDev = devices.find((d) => d.id === panel.focus);
  let camera: Camera = { s: 1, tx: 0, ty: 0 };
  const headW = (c: CharPlaced): Pt => [c.x + c.fig.j.head[0] * c.s, c.y + c.fig.j.head[1] * c.s];
  if (shot === "medium") {
    let cx: number, cy: number, s = 1.9;
    if (focusDev) { cx = focusDev.x; cy = focusDev.y; s = 2.1; }
    else if (!panel.focus && chars.length >= 2) {
      const xs = chars.map((c) => c.x);
      cx = (Math.min(...xs) + Math.max(...xs)) / 2; cy = chars[0].y - 72;
      s = Math.min(1.9, (PANEL_W - 60) / Math.max(60, Math.max(...xs) - Math.min(...xs) + 60));
    } else if (focusChar) { cx = focusChar.x; cy = focusChar.y - 74 * focusChar.s; }
    else { cx = 200; cy = 150; }
    camera = clampCam({ s, tx: 200 - cx * s, ty: 146 - cy * s });
  } else if (shot === "close-up") {
    const s = 3.4;
    const [hx, hy] = focusChar ? headW(focusChar) : focusDev ? [focusDev.x, focusDev.y] as Pt : [200, 120] as Pt;
    camera = clampCam({ s, tx: 200 - hx * s, ty: 128 - hy * s });
  }

  // ---- designer's pan/zoom of this panel (layout["__camera"])
  const camOv = ovOf(panel, "__camera");
  if (camOv.dx || camOv.dy || camOv.scale) {
    const z = camOv.scale ?? 1;
    camera = { s: camera.s * z, tx: 200 - (200 - camera.tx) * z + (camOv.dx ?? 0), ty: 130 - (130 - camera.ty) * z + (camOv.dy ?? 0) };
  }

  // ---- special compositions
  let special: Special = null;
  if (shot === "over-the-shoulder" || shot === "screen" || shot === "pov") {
    const owner = focusChar && focusChar.held ? focusChar : chars.find((c) => c.held);
    const dev = owner?.held
      ? { id: owner.id, type: owner.held.type, href: owner.held.href, product: owner.held.product }
      : focusDev ? { id: focusDev.id, type: focusDev.type, href: focusDev.href, product: focusDev.product }
      : devices[0] ? { id: devices[0].id, type: devices[0].type, href: devices[0].href, product: devices[0].product } : undefined;
    const bgFocus = owner ?? focusChar;
    if (bgFocus) {
      const s = 2.4; const [hx, hy] = headW(bgFocus);
      camera = clampCam({ s, tx: 200 - hx * s, ty: 150 - hy * s });
    }
    if (shot === "over-the-shoulder" && (owner ?? focusChar)) {
      const who = (owner ?? focusChar)!;
      // seen from behind: honour the chosen pose (the device arm is redrawn reaching for the screen)
      const backPose: Pose = ["holding-phone", "phone-to-ear", "sitting-laptop"].includes(who.pose) ? (who.fig.j.seated ? "sitting" : "standing") : who.pose;
      const fig = figure(backPose, "back", "right", who.cast);
      special = { kind: "ots", char: { ...who, fig }, device: dev ? { ...holdPlacement(who.fig, dev.type, "holding-phone", dev.href, dev.product), id: dev.id, type: dev.type, href: dev.href } : undefined };
    } else if (dev) {
      special = { kind: shot === "pov" ? "pov" : "screen", device: dev };
    }
  }

  // ---- anchors (panel space)
  const anchors: Record<string, Anchor> = {};
  const ovShift = (ov: LayoutOverride): Pt => [ov.dx ?? 0, ov.dy ?? 0];
  if (special) {
    const place = specialGeometry(special);
    // the big device can be nudged/scaled in the editor (layout key "<id>.screen"); keep anchors in step
    const devId = special.kind === "ots" ? (special.device?.id ?? special.char.id) : special.device.id;
    const dov = ovOf(panel, `${devId}.screen`);
    const moveRect = (r: Rect | undefined): Rect | undefined => r && {
      x: place.dcx + (dov.dx ?? 0) + (r.x - place.dcx) * (dov.scale ?? 1),
      y: place.dcy + (dov.dy ?? 0) + (r.y - place.dcy) * (dov.scale ?? 1),
      w: r.w * (dov.scale ?? 1), h: r.h * (dov.scale ?? 1),
    };
    place.screen = moveRect(place.screen);
    place.devBox = moveRect(place.devBox)!;
    if (special.kind === "ots") {
      const cov = ovOf(panel, special.char.id);
      if (place.head) place.head = { ...place.head, x: place.head.x + (cov.dx ?? 0), y: place.head.y + (cov.dy ?? 0) };
      const product = special.device?.product ?? true;
      anchors[special.char.id] = { head: place.head, screen: place.screen, product, box: place.charBox! };
      if (special.device && special.device.id !== special.char.id) anchors[special.device.id] = { screen: place.screen, product, box: place.devBox };
    } else {
      anchors[special.device.id] = { screen: place.screen, product: special.device.product, box: place.devBox };
    }
    // other characters are off-camera in these shots but keep heads so bubbles still attach sensibly
    for (const c of chars) if (!anchors[c.id]) anchors[c.id] = { head: { x: 70, y: 60, r: 12 }, box: { x: 40, y: 40, w: 60, h: 60 } };
  } else {
    for (const c of chars) {
      const [dx, dy] = ovShift(c.ov);
      const k = c.s * (c.ov.scale ?? 1);
      const [hx, hy] = toPanel(camera, [c.x + c.fig.j.head[0] * k, c.y + c.fig.j.head[1] * k]);
      const top = toPanel(camera, [c.x, c.y - 128 * k]);
      const foot = toPanel(camera, [c.x, c.y]);
      const a: Anchor = {
        head: { x: hx + dx, y: hy + dy, r: c.fig.headR * k * camera.s },
        box: { x: top[0] - 26 * k * camera.s + dx, y: top[1] + dy, w: 52 * k * camera.s, h: foot[1] - top[1] },
      };
      if (c.held) {
        const def = DEVICE_DEFS[c.held.type];
        if (def.screen) {
          const hov = ovOf(panel, `${c.id}.device`);
          const hs = hov.scale ?? 1;
          const local = xformRect(def.screen, c.held.cx, c.held.cy, c.held.scale * hs, c.held.rot);
          const p0 = toPanel(camera, [c.x + local.x * k, c.y + local.y * k]);
          a.screen = { x: p0[0] + dx + (hov.dx ?? 0), y: p0[1] + dy + (hov.dy ?? 0), w: local.w * k * camera.s, h: local.h * k * camera.s };
          a.product = c.held.product;
        }
      }
      anchors[c.id] = a;
    }
    for (const d of devices) {
      const [dx, dy] = ovShift(d.ov);
      const def = DEVICE_DEFS[d.type];
      const k = d.s * (d.ov.scale ?? 1);
      const b = xformRect({ x: -def.w / 2, y: -def.h / 2, w: def.w, h: def.h }, d.x, d.y, k, d.rot + (d.ov.rotate ?? 0));
      const p0 = toPanel(camera, [b.x, b.y]);
      const a: Anchor = { box: { x: p0[0] + dx, y: p0[1] + dy, w: b.w * camera.s, h: b.h * camera.s }, product: d.product };
      if (def.screen) {
        const sr = xformRect(def.screen, d.x, d.y, k, d.rot + (d.ov.rotate ?? 0));
        const q = toPanel(camera, [sr.x, sr.y]);
        a.screen = { x: q[0] + dx, y: q[1] + dy, w: sr.w * camera.s, h: sr.h * camera.s };
      }
      anchors[d.id] = a;
    }
    for (const [charId, devId] of Object.entries(proxy)) {
      if (anchors[charId] && anchors[devId]) { anchors[charId].screen = anchors[devId].screen; anchors[charId].product = anchors[devId].product; }
    }
  }
  return { camera, chars, devices, anchors, special };
}

/** Fixed geometry for over-the-shoulder / screen / pov compositions (panel space). */
export function specialGeometry(sp: NonNullable<Special>) {
  if (sp.kind === "ots") {
    const S = 2.1;
    const hx = 104, hy = 176;
    const devType = sp.device?.type ?? "phone";
    const def = DEVICE_DEFS[devType];
    const box = { w: 170, h: 200 };
    const ds = Math.min(box.w / def.w, box.h / def.h, 1.7);
    const dcx = 272, dcy = 118;
    const screen = def.screen ? { x: dcx + def.screen.x * ds, y: dcy + def.screen.y * ds, w: def.screen.w * ds, h: def.screen.h * ds } : undefined;
    return {
      S, charX: hx - sp.char.fig.j.head[0] * S, charY: hy - sp.char.fig.j.head[1] * S,
      head: { x: hx, y: hy, r: sp.char.fig.headR * S }, charBox: { x: hx - 60, y: hy - 30, w: 120, h: 120 },
      dcx, dcy, ds, screen, devBox: { x: dcx - (def.w * ds) / 2, y: dcy - (def.h * ds) / 2, w: def.w * ds, h: def.h * ds },
    };
  }
  const def = DEVICE_DEFS[sp.device.type];
  const handheld = ["phone", "tablet", "watch"].includes(sp.device.type);
  const box = { w: sp.kind === "pov" ? 240 : 330, h: 226 };
  const ds = Math.min(box.w / def.w, box.h / def.h, handheld ? 2.1 : 3);
  const dcx = 200, dcy = sp.kind === "pov" ? 124 : 128;
  const screen = def.screen ? { x: dcx + def.screen.x * ds, y: dcy + def.screen.y * ds, w: def.screen.w * ds, h: def.screen.h * ds } : undefined;
  return { S: 1, charX: 0, charY: 0, head: undefined, charBox: undefined, dcx, dcy, ds, screen, devBox: { x: dcx - (def.w * ds) / 2, y: dcy - (def.h * ds) / 2, w: def.w * ds, h: def.h * ds } };
}

// ------------------------------------------------------------------ text + overlay placement

/** Rough glyph advance for Patrick Hand (em). Good enough for wrapping hand-lettered bubbles. */
const ADV = 0.43;
/** Permanent Marker (titles, shouts, cards) is much wider, especially in capitals. */
export const ADV_TITLE = 0.66;
export function wrap(text: string, size: number, maxW: number, adv = ADV): string[] {
  const maxChars = Math.max(6, Math.floor(maxW / (size * adv)));
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= maxChars) cur += " " + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}
export const textWidth = (s: string, size: number, adv = ADV) => s.length * size * adv;

export interface BubbleBox {
  id: string;
  bubble: Bubble;
  lines: string[];
  size: number;
  x: number; y: number; w: number; h: number;
  tail?: { to: Pt; from: Pt };
}

const overlaps = (a: Rect, b: Rect, pad = 4) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

export function captionBox(text: string, k = 1): Rect & { lines: string[]; size: number } {
  const size = 13.5 * k;
  const lines = wrap(text, size, Math.min(360, 196 * Math.max(1, k * 0.9)));
  const w = Math.max(...lines.map((l) => textWidth(l, size))) + 16;
  return { x: 7, y: 7, w, h: lines.length * size * 1.18 + 10, lines, size };
}

export function placeBubbles(panel: ScenePanel, anchors: Record<string, Anchor>, reserved: Rect[], textScale = 1): BubbleBox[] {
  const out: BubbleBox[] = [];
  const taken = [...reserved];
  (panel.bubbles ?? []).forEach((b, i) => {
    const id = b.id ?? `bubble-${i}`;
    const k = textScale * (panel.layout?.[id]?.scale ?? 1);
    const size = (b.type === "shout" ? 15.5 : 14.5) * k;
    const adv = b.type === "shout" ? 0.6 : undefined;
    const lines = wrap(b.type === "shout" ? b.text.toUpperCase() : b.text, size, (b.type === "thought" ? 124 : 140) * Math.min(1.8, Math.max(1, k * 0.85)), adv);
    const tw = Math.max(...lines.map((l) => textWidth(l, size, adv)));
    const padX = b.type === "thought" ? 16 : b.type === "shout" ? 16 : 11;
    const padY = b.type === "thought" ? 12 : b.type === "shout" ? 12 : 8;
    const w = tw + padX * 2, h = lines.length * size * 1.15 + padY * 2;
    const a = b.from ? anchors[b.from] : undefined;
    const head = a?.head ?? (a ? { x: a.box.x + a.box.w / 2, y: a.box.y, r: 4 } : undefined);
    const cands: Pt[] = [];
    if (head) {
      const gap = head.r + 16;
      cands.push(
        [head.x - w - 6, head.y - h - gap * 0.5], [head.x + 6, head.y - h - gap * 0.5],
        [head.x - w / 2, head.y - h - gap], [head.x - w - gap, head.y - h / 2], [head.x + gap, head.y - h / 2],
        [head.x - w - 6, head.y + gap * 0.3], [head.x + 6, head.y + gap * 0.3],
      );
    }
    cands.push([PANEL_W - w - 8, 8], [8, 8], [PANEL_W / 2 - w / 2, 8], [PANEL_W - w - 8, PANEL_H / 2]);
    const inside = ([x, y]: Pt) => x >= 5 && y >= 5 && x + w <= PANEL_W - 5 && y + h <= PANEL_H - 5;
    const clampP = ([x, y]: Pt): Pt => [Math.min(Math.max(5, x), PANEL_W - w - 5), Math.min(Math.max(5, y), PANEL_H - h - 5)];
    const headRect: Rect | undefined = head ? { x: head.x - head.r, y: head.y - head.r, w: head.r * 2, h: head.r * 2 } : undefined;
    let pos = cands.find((p) => inside(p) && !taken.some((t) => overlaps({ x: p[0], y: p[1], w, h }, t)) && !(headRect && overlaps({ x: p[0], y: p[1], w, h }, headRect, 2)));
    if (!pos) {
      // nothing fits cleanly: pick the clamped spot that covers the least of any face and other bubbles
      const area = (a: Rect, b: Rect) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
      const faces = Object.values(anchors).flatMap((an) => (an.head ? [{ x: an.head.x - an.head.r, y: an.head.y - an.head.r, w: an.head.r * 2, h: an.head.r * 2.4 }] : []));
      const score = (p: Pt) => { const r = { x: p[0], y: p[1], w, h }; return faces.reduce((s, f) => s + area(r, f) * 4, 0) + taken.reduce((s, t) => s + area(r, t), 0); };
      pos = cands.map(clampP).reduce((best, p) => (score(p) < score(best) ? p : best));
    }
    const ov = panel.layout?.[id] ?? {};
    const x = pos[0] + (ov.dx ?? 0), y = pos[1] + (ov.dy ?? 0);
    const box: BubbleBox = { id, bubble: b, lines, size, x, y, w, h };
    if (head) {
      const cx = x + w / 2, cy = y + h / 2;
      const ang = Math.atan2(head.y - cy, head.x - cx);
      const stop = head.r + 5;
      const to: Pt = [head.x - Math.cos(ang) * stop, head.y - Math.sin(ang) * stop];
      // edge point of the box toward the head
      const tx = Math.cos(ang), ty = Math.sin(ang);
      const k = Math.min(Math.abs((w / 2) / (tx || 1e-6)), Math.abs((h / 2) / (ty || 1e-6)));
      const from: Pt = [cx + tx * k * 0.9, cy + ty * k * 0.9];
      box.tail = { to, from };
    }
    taken.push({ x, y, w, h });
    out.push(box);
  });
  return out;
}

export interface StackItem { id: string; kind: "device" | "character" | "shape" | "image"; behind: boolean; z: number; index?: number }

/**
 * Draw order for people, devices and shapes within each scene layer (behind the scene's front props, or in front).
 * Default: devices, then images, then people, then shapes; the editor's Arrange buttons write `layout[id].z` to change it.
 */
export function stackOrder(L: PanelLayout, panel: ScenePanel): StackItem[] {
  const z = (id: string, def: number) => panel.layout?.[id]?.z ?? def;
  const items: StackItem[] = [
    ...L.devices.map((d, i) => ({ id: d.id, kind: "device" as const, behind: d.behind, z: z(d.id, i) })),
    ...(panel.images ?? []).map((im, i) => { const id = im.id ?? `image-${i}`; return { id, kind: "image" as const, behind: false, z: z(id, 50 + i), index: i }; }),
    ...L.chars.map((c, i) => ({ id: c.id, kind: "character" as const, behind: c.behind, z: z(c.id, 100 + i) })),
    ...(panel.shapes ?? []).map((s, i) => { const id = s.id ?? `shape-${i}`; return { id, kind: "shape" as const, behind: false, z: z(id, 200 + i), index: i }; }),
  ];
  return items.map((it, i) => ({ it, i })).sort((a, b) => a.it.z - b.it.z || a.i - b.i).map((x) => x.it);
}
