import { plainText } from "../sketch/rich";
import type { Board, Bubble, CastMember, CharacterInPanel, LayoutOverride, ScenePanel } from "../types";
import { HANDHELD, type DeviceType, type Mood, type Pose } from "../vocab";
import { autoVariant, figure, type Figure, type Pt } from "./rig";
import { DEVICE_DEFS, type Rect, baseOf } from "./devices";
import { resolveScene } from "./scenes";
import { FLOOR_Y, PANEL_H, PANEL_W } from "./tokens";

export interface Camera { s: number; tx: number; ty: number }
export const toPanel = (c: Camera, p: Pt): Pt => [p[0] * c.s + c.tx, p[1] * c.s + c.ty];

export interface HeldPlacement {
  type: DeviceType;
  href?: string;
  product: boolean;
  /** Device transform in character-local space. */
  cx: number; cy: number; scale: number; rot: number;
  /** Which side of the device we see: its screen points at the person holding it, not at the viewer. */
  face?: "screen" | "back" | "side";
  /** Mirror it (an edge-on device held by someone facing left). */
  flip?: boolean;
  /** Drawn in front of both arms (a laptop's lid hides the hands typing behind it). */
  front?: boolean;
  /** Drawn behind the body: seen from behind, held in front of them, so it only peeks out at the side. */
  behind?: boolean;
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
  /** Seated somewhere the scene draws no seat: draw a chair under them. */
  chair: boolean;
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
  /** Turned toward whoever uses it (see Device's face); flip = they're on its right. */
  face?: "screen" | "back" | "side" | "turned";
  flip?: boolean;
}

export interface Anchor {
  /** Head center + radius (panel units) for characters. */
  head?: { x: number; y: number; r: number };
  screen?: Rect;
  /** The screen belongs to the product (teal) rather than a personal device (gray). */
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

/** How far a spot may be off its surface and still snap onto it (further than that is a scene bug: see tests/scenes.test.ts). */
export const SNAP = 14;

/**
 * Where a device placed at a scene spot actually goes: its bottom resting on the nearest surface just below
 * (a mark's tabletop, one of the scene's \`surfaces\`, or the floor). Wall-mounted spots stay put.
 * Returns the device's center y, and the surface it landed on (undefined = nothing near enough).
 */
export function restingY(scene: { marks: Record<string, { surface?: number }>; surfaces?: number[] }, type: DeviceType, spot: { y: number; scale?: number; wall?: boolean }): { y: number; on?: number } {
  const b = baseOf(type) * (spot.scale ?? PLACED_SCALE[type] ?? 0.4);
  if (spot.wall) return { y: spot.y, on: spot.y + b };
  const bottom = spot.y + b;
  const tops = [FLOOR_Y, ...Object.values(scene.marks).map((m) => m.surface).filter((v): v is number => typeof v === "number"), ...(scene.surfaces ?? [])];
  const near = tops.map((t) => ({ t, d: Math.abs(t - bottom) })).filter((x) => x.d <= SNAP).sort((a, b) => a.d - b.d)[0];
  return near ? { y: near.t - b, on: near.t } : { y: spot.y };
}

const ovOf = (panel: ScenePanel, id: string): LayoutOverride => panel.layout?.[id] ?? {};

export function heldDeviceOf(c: CharacterInPanel): { type: DeviceType; screen?: string; product?: boolean } | undefined {
  if (!c.device) return undefined;
  return typeof c.device === "string" ? { type: c.device } : c.device;
}

export const isHandheld = (t: DeviceType) => (HANDHELD as readonly string[]).includes(t);

/** Phone poses without a device still get a phone in hand, a personal (gray) one. Non-handheld devices are never held. */
export function effectiveDevice(c: CharacterInPanel): { type: DeviceType; screen?: string; product: boolean } | undefined {
  const d = heldDeviceOf(c);
  if (d && isHandheld(d.type)) return { ...d, product: d.product !== false };
  if (c.pose === "holding-phone" || c.pose === "phone-to-ear") return { type: "phone", product: false };
  return undefined;
}

/** The screen faces its person: from behind we see it, from the side edge-on, from the front its back. */
const faceFor = (fig: Figure): NonNullable<HeldPlacement["face"]> => (fig.view === "back" ? "screen" : fig.view === "side" ? "side" : "back");

function holdPlacement(fig: Figure, type: DeviceType, pose: string, href?: string, product = true, table?: number): HeldPlacement {
  const p = placeHeld(fig, type, pose, href, product, table);
  if (type === "watch") return p;
  const face = p.face ?? faceFor(fig);
  // from behind, something held close in front of the body is hidden by it (a raised or outstretched hand isn't)
  const j = fig.j, close = Math.abs(j.hdR[0]) < 20 && j.hdR[1] > j.head[1] + 6;
  return { ...p, face, flip: face === "side" && fig.dir < 0, front: face === "back" && type === "laptop", behind: fig.view === "back" && close };
}

function placeHeld(fig: Figure, type: DeviceType, pose: string, href: string | undefined, product: boolean, table?: number): HeldPlacement {
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
    const ls = HELD_SCALE.laptop!;
    if (table !== undefined && j.seated) {
      // at a table: the laptop stands on the table top in front of them, and their hands go to its keyboard
      const side = fig.view === "side";
      const cx = side ? j.hipR[0] + 40 * fig.dir : 0;
      const cy = table - 8 * ls;
      const kx = side ? cx - 6 * fig.dir : cx, ky = table - 3;
      if (side) {
        j.hdR = [kx, ky]; j.hdL = [kx - 4 * fig.dir, ky + 1];
        j.elR = [(j.shR[0] + kx) / 2 - 2 * fig.dir, (j.shR[1] + ky) / 2 + 9]; j.elL = [(j.shL[0] + kx) / 2 - 5 * fig.dir, (j.shL[1] + ky) / 2 + 10];
      } else {
        j.hdL = [kx - 10, ky]; j.hdR = [kx + 10, ky];
        j.elL = [j.shL[0] - 6, (j.shL[1] + ky) / 2 + 4]; j.elR = [j.shR[0] + 6, (j.shR[1] + ky) / 2 + 4];
      }
      return { type, href, product, cx, cy, scale: ls, rot: 0 };
    }
    if (fig.view === "side" && j.seated) {
      // seen from the side, a seated person's laptop rests on their lap, between hip and knee
      const lapX = (j.hipR[0] + j.knR[0]) / 2 + 4 * fig.dir, lapY = Math.min(j.hipR[1], j.knR[1]) - 1;
      const h = DEVICE_DEFS.laptop.h * HELD_SCALE.laptop!;
      return { type, href, product, cx: lapX, cy: lapY - h * 0.42, scale: HELD_SCALE.laptop!, rot: 0 };
    }
    return { type, href, product, cx: mx + (fig.view === "side" ? 6 * fig.dir : 0), cy: my + 1, scale: HELD_SCALE.laptop!, rot: 0 };
  }
  // from the side a tablet tips back toward the face, like someone reading it
  // carried down at the side (hand below the waist): it hangs from the hand
  if (j.hdR[1] > j.hipR[1] - 6 && (type === "phone" || type === "tablet")) {
    const h = DEVICE_DEFS[type].h * sc;
    return { type, href, product, cx: j.hdR[0] + (fig.view === "side" ? 3 * fig.dir : 2), cy: j.hdR[1] + h * 0.3, scale: sc, rot: 0, face: fig.view === "side" ? "back" : "side" };
  }
  const atChest = j.hdR[1] > j.shR[1] - 4;
  // from the side, held at chest height, it tips away from the face (screen up toward the eyes) and its lower
  // end sits in the hand, so it never hovers
  if (fig.view === "side" && atChest && (type === "tablet" || type === "phone")) {
    const tilt = (type === "tablet" ? 30 : 16) * fig.dir, a = (tilt * Math.PI) / 180;
    const half = (DEVICE_DEFS[type].h * sc) / 2, grip = half * 0.72;
    return { type, href, product, cx: j.hdR[0] + Math.sin(a) * grip + 1 * fig.dir, cy: j.hdR[1] - Math.cos(a) * grip, scale: sc, rot: tilt };
  }
  // facing us (or turned a little), a tablet is held low on the chest in both hands, clear of the face
  if (fig.view !== "side" && fig.view !== "back" && type === "tablet" && atChest && Math.abs(j.hdR[0]) < 24) {
    const cx = (j.shL[0] + j.shR[0]) / 2 + 1, cy = j.shR[1] + 27;
    const half = (DEVICE_DEFS.tablet.h * sc) / 2;
    j.hdL = [cx - 11, cy + half - 3]; j.hdR = [cx + 11, cy + half - 3];
    j.elL = [j.shL[0] - 5, j.shL[1] + 21]; j.elR = [j.shR[0] + 5, j.shR[1] + 21];
    return { type, href, product, cx, cy, scale: sc, rot: -3 };
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

/** Behind the scene's furniture? The place decides, unless the designer moved it to the other layer. */
const behindOf = (panel: ScenePanel, id: string, def: boolean) => { const l = panel.layout?.[id]?.layer; return l ? l === "back" : def; };

export function layoutPanel(board: Board, panel: ScenePanel, asset: AssetResolver): PanelLayout {
  const scene = resolveScene(board, panel.scene);
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
    // only a phone goes to the ear: someone "on a call" with a tablet or laptop is looking at it instead
    if (pose === "phone-to-ear" && held && held.type !== "phone" && held.type !== "watch") pose = "holding-phone";
    // a seat mark sits people down only when no pose was chosen; an explicit "standing" stands
    if (mark.seated && !c.pose) pose = pose === "holding-phone" && heldDeviceOf(c)?.type === "laptop" ? "sitting-laptop" : "sitting";
    if (panel.scene === "car" && markName === "driver-seat" && !c.pose) pose = "driving";
    // sitting reads best in profile (from the front a seated body looks like a crouch)
    const sits = pose === "sitting" || pose === "sitting-laptop" || pose === "driving";
    const angle = c.angle ?? mark.angle ?? (pose === "walking" || sits || mark.seated ? "side" : "three-quarter");
    const facing = c.facing ?? mark.facing ?? "right";
    const fig = figure(pose, angle, facing, cast, c.variant ?? autoVariant(`${panel.id}:${id}`));
    // a table top in front of a seated person (in the figure's own units), for a laptop to stand on
    const k0 = CHAR_SCALE * (mark.scale ?? 1) * fig.scale;
    const table = mark.surface !== undefined && mark.behind && fig.j.seated ? (mark.surface - mark.y) / k0 : undefined;
    const heldP = held ? holdPlacement(fig, held.type, pose, held.screen ? asset(held.screen) : undefined, held.product, table) : undefined;
    if (heldP && pose === "sitting" && (held?.type === "phone" || held?.type === "tablet")) {
      // seated with a phone or tablet: lift the hand to chest height; from the side it's out in front of them,
      // from the front or behind it's in front of the chest (not out to one side)
      const tab = held.type === "tablet";
      if (fig.view === "side") {
        fig.j.elR = [fig.j.shR[0] + 6 * fig.dir, fig.j.shR[1] + 18];
        fig.j.hdR = [fig.j.shR[0] + (tab ? 18 : 14) * fig.dir, fig.j.shR[1] + (tab ? 14 : 8)];
      } else {
        const k = Math.sign(fig.j.shR[0]) || 1; // from behind, left and right swap on screen
        fig.j.elR = [fig.j.shR[0] + 5 * k, fig.j.shR[1] + 20];
        fig.j.hdR = [fig.j.shR[0] - 6 * k, fig.j.shR[1] + (tab ? 22 : 16)];
      }
      Object.assign(heldP, holdPlacement(fig, held.type, "holding-phone", heldP.href, heldP.product));
    }
    if (heldP && held?.type === "laptop" && !fig.j.seated) {
      // standing with a laptop: held open in front of them on both hands, whatever the pose's arms were doing
      const j = fig.j, y = j.hipR[1] - 12;
      if (fig.view === "side") {
        j.hdR = [j.shR[0] + 20 * fig.dir, y]; j.hdL = [j.shL[0] + 12 * fig.dir, y + 1];
        j.elR = [j.shR[0] + 4 * fig.dir, y - 14]; j.elL = [j.shL[0] - 1 * fig.dir, y - 13];
      } else {
        const kl = Math.sign(j.shL[0]) || -1, kr = Math.sign(j.shR[0]) || 1; // from behind, left and right swap on screen
        j.hdL = [15 * kl, y]; j.hdR = [15 * kr, y];
        j.elL = [j.shL[0] + 6 * kl, y - 14]; j.elR = [j.shR[0] + 6 * kr, y - 14];
      }
      Object.assign(heldP, holdPlacement(fig, "laptop", "holding-phone", heldP.href, heldP.product));
    }
    if (beside) besides.push({ charId: id, type: beside.type, screen: beside.screen, product: beside.product !== false, x: mark.x + 52 * fig.dir, dir: fig.dir, behind: !!mark.behind });
    chars.push({
      id, who: c.who, cast, fig, mood: c.mood ?? "neutral", pose,
      x: mark.x, y: mark.y, s: CHAR_SCALE * (mark.scale ?? 1) * fig.scale, behind: behindOf(panel, id, !!mark.behind),
      held: heldP, ov: ovOf(panel, id),
      chair: !!fig.j.seated && (!mark.seated || !!mark.chair) && panel.scene !== "car",
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
    // a scene spot can size the device to fit (a small screen in a car dash)
    const s = (spot as { scale?: number }).scale ?? PLACED_SCALE[d.type] ?? 0.4;
    const def = DEVICE_DEFS[d.type];
    // sit on the surface: shift up by half height for things on tables
    const onSurface = mark?.surface !== undefined;
    // at a spot with no tabletop: a kiosk stands on the floor; anything smaller sits at hand height, not in the floor
    const h = def.h * s;
    // a mark up in the air (a wall screen's place) is the device's center; a mark on the floor means "near this spot"
    const y = onSurface ? spot.y - baseOf(d.type) * s : mark ? (mark.y < FLOOR_Y - 1 ? mark.y : d.type === "kiosk" ? FLOOR_Y - h / 2 : FLOOR_Y - 96) : restingY(scene, d.type, { ...spot, scale: s }).y;
    devices.push({ id, type: d.type, product: d.product !== false, href: d.screen ? asset(d.screen) : undefined, x: spot.x, y, s, rot: 0, behind: behindOf(panel, id, !!(spot as { behind?: boolean }).behind), ov: ovOf(panel, id), tilt: d.tilt });
  });
  const proxy: Record<string, string> = {};
  for (const b of besides) {
    const id = `${b.charId}.device`;
    const s = PLACED_SCALE[b.type] ?? 0.4;
    const h = DEVICE_DEFS[b.type].h * s;
    const floorStanding = b.type === "kiosk";
    devices.push({ id, type: b.type, product: b.product, href: b.screen ? asset(b.screen) : undefined, x: b.x, y: floorStanding ? FLOOR_Y - h / 2 : FLOOR_Y - 96, s, rot: 0, behind: behindOf(panel, id, b.behind), ov: ovOf(panel, id) });
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

  // a device someone is tapping or swiping, or one showing a real screen design, turns its screen to us (the
  // storyboard cheat) unless we see them in profile: the gesture and the design are the point of the panel
  for (const ch of chars) {
    if (ch.held?.face !== "back") continue;
    const touched = (panel.gestures ?? []).some((g) => g.on === ch.id);
    if (touched || ch.held.href) Object.assign(ch.held, { face: "screen", front: false });
  }

  // a screen standing on a desk turns toward the person sitting or standing at it (a laptop goes side-on, a
  // monitor or tablet three-quarters), unless the designer tilted it, someone's tapping it, or it shows a real design
  for (const d of devices) {
    if (d.tilt || d.href || !["desktop", "laptop", "tablet"].includes(d.type)) continue;
    if ((panel.gestures ?? []).some((g) => g.on === d.id)) continue;
    const user = chars
      .filter((c) => c.fig.view !== "back" && Math.abs(d.x - c.x) > 14 && Math.abs(d.x - c.x) < 150 && Math.sign(d.x - c.x) === c.fig.dir)
      .sort((a, b) => Math.abs(d.x - a.x) - Math.abs(d.x - b.x))[0];
    if (!user || user.fig.view === "front") continue;
    d.face = d.type === "laptop" ? "side" : "turned";
    d.flip = user.x > d.x;
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
      special = { kind: "ots", char: { ...who, fig }, device: dev ? { ...holdPlacement(who.fig, dev.type, "holding-phone", dev.href, dev.product), face: "screen", flip: false, front: false, id: dev.id, type: dev.type, href: dev.href } : undefined };
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
    // the camera sits just behind them: the back of the head and a shoulder fill the lower left, cut off by the
    // frame, and the screen is in front of them. Held things are up at chest height; laptops and monitors stand
    // on a desk with the hands on the keys.
    const devType = sp.device?.type ?? "phone";
    const def = DEVICE_DEFS[devType];
    const held = ["phone", "tablet", "watch"].includes(devType);
    const R = 42, hx = 112;
    // at a desk they sit a little higher in the frame, so the keys are below the shoulders and the arms reach down
    const hy = held ? 170 : 150;
    const S = R / sp.char.fig.headR;
    // the desk's far edge; a laptop's hinge sits just in front of it, a monitor's stand on it
    const deskTop = held ? undefined : 206;
    let ds: number, dcx: number, dcy: number;
    // a held phone or tablet is just past the near shoulder, its lower corner tucked behind it
    if (held) { ds = Math.min((devType === "tablet" ? 160 : 136) / def.h, 140 / def.w); dcx = devType === "tablet" ? 236 : 222; dcy = devType === "tablet" ? 150 : 158; }
    else if (devType === "laptop") { ds = 1.2; dcx = 262; dcy = deskTop! + 4 + 2 * ds; }
    else if (devType === "desktop") { ds = 1.25; dcx = 268; dcy = deskTop! - 4 - 56 * ds; }
    else { ds = Math.min(190 / def.w, 170 / def.h); dcx = 268; dcy = 112; }
    const screen = def.screen ? { x: dcx + def.screen.x * ds, y: dcy + def.screen.y * ds, w: def.screen.w * ds, h: def.screen.h * ds } : undefined;
    return {
      S, charX: hx - sp.char.fig.j.head[0] * S, charY: hy - sp.char.fig.j.head[1] * S, deskTop,
      head: { x: hx, y: hy, r: R }, charBox: { x: hx - 80, y: hy - R, w: 200, h: PANEL_H - hy + R },
      dcx, dcy, ds, screen, devBox: { x: dcx - (def.w * ds) / 2, y: dcy - (def.h * ds) / 2, w: def.w * ds, h: def.h * ds },
    };
  }
  const def = DEVICE_DEFS[sp.device.type];
  const handheld = ["phone", "tablet", "watch"].includes(sp.device.type);
  const box = { w: sp.kind === "pov" ? 240 : 330, h: 226 };
  const ds = Math.min(box.w / def.w, box.h / def.h, handheld ? 2.1 : 3);
  const dcx = 200, dcy = sp.kind === "pov" ? 124 : 128;
  const screen = def.screen ? { x: dcx + def.screen.x * ds, y: dcy + def.screen.y * ds, w: def.screen.w * ds, h: def.screen.h * ds } : undefined;
  return { S: 1, charX: 0, charY: 0, deskTop: undefined as number | undefined, head: undefined, charBox: undefined, dcx, dcy, ds, screen, devBox: { x: dcx - (def.w * ds) / 2, y: dcy - (def.h * ds) / 2, w: def.w * ds, h: def.h * ds } };
}

// ------------------------------------------------------------------ text + overlay placement

/** Rough glyph advance for Patrick Hand (em). Good enough for wrapping hand-lettered bubbles. */
const ADV = 0.43;
/** Permanent Marker (titles, shouts, cards) is much wider, especially in capitals. */
export const ADV_TITLE = 0.66;
/** Word wrap by estimated width. Measures the plain words: **bold** and *italic* markers take no room. */
export function wrap(src: string, size: number, maxW: number, adv = ADV): string[] {
  const text = plainText(src);
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
  // every face in the panel, with room above for hair, buns and hats: bubbles never sit on anyone's face
  const faces: Rect[] = Object.values(anchors).flatMap((an) => (an.head ? [{ x: an.head.x - an.head.r * 1.3, y: an.head.y - an.head.r * 1.75, w: an.head.r * 2.6, h: an.head.r * 3 }] : []));
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
    if (head) {
      // a little further out, for tall hair and crowded panels
      const far = head.r * 1.9 + 14;
      cands.push([head.x - w - far, head.y - h - 4], [head.x + far, head.y - h - 4], [head.x - w / 2, head.y - h - far - 6]);
    }
    cands.push([PANEL_W - w - 8, 8], [8, 8], [PANEL_W / 2 - w / 2, 8], [PANEL_W - w - 8, PANEL_H / 2], [8, PANEL_H / 2]);
    const inside = ([x, y]: Pt) => x >= 5 && y >= 5 && x + w <= PANEL_W - 5 && y + h <= PANEL_H - 5;
    const clampP = ([x, y]: Pt): Pt => [Math.min(Math.max(5, x), PANEL_W - w - 5), Math.min(Math.max(5, y), PANEL_H - h - 5)];
    // the tail runs from the bubble to the speaker's head; it shouldn't cut across anyone else's face on the way
    const own = head ? faces.find((f) => head.x >= f.x && head.x <= f.x + f.w && head.y >= f.y && head.y <= f.y + f.h) : undefined;
    const tailClear = (p: Pt) => {
      if (!head) return true;
      const cx = p[0] + w / 2, cy = p[1] + h / 2;
      for (let t = 0.05; t < 0.95; t += 0.05) {
        const x = cx + (head.x - cx) * t, y = cy + (head.y - cy) * t;
        if (faces.some((f) => f !== own && x > f.x && x < f.x + f.w && y > f.y && y < f.y + f.h)) return false;
      }
      return true;
    };
    let pos = cands.find((p) => inside(p) && !taken.some((t) => overlaps({ x: p[0], y: p[1], w, h }, t)) && !faces.some((f) => overlaps({ x: p[0], y: p[1], w, h }, f, 2)) && tailClear(p));
    if (!pos) {
      // nothing fits cleanly: pick the clamped spot that covers the least of any face and other bubbles
      const area = (a: Rect, b: Rect) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
      const score = (p: Pt) => { const r = { x: p[0], y: p[1], w, h }; return faces.reduce((s, f) => s + area(r, f) * 4, 0) + taken.reduce((s, t) => s + area(r, t), 0) + (tailClear(p) ? 0 : 400); };
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
