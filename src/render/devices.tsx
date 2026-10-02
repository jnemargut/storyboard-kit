import type { ReactNode } from "react";
import type { DeviceType } from "../vocab";
import { C, OFFSET } from "./tokens";

export interface Rect { x: number; y: number; w: number; h: number }

interface DeviceDef {
  /** Natural size in device units; origin is the device center. */
  w: number;
  h: number;
  screen: Rect | null;
  body: (props: { outline: boolean }) => ReactNode;
  /** How far below the origin the base is, when the drawing isn't centered (a laptop: lid up, base at the bottom). */
  base?: number;
}

const ink = C.ink;
const body = (el: (fill: string, stroke: string, sw: number) => ReactNode) => ({ outline }: { outline: boolean }) =>
  outline ? el("none", ink, 2.4) : <g transform={`translate(${OFFSET.x} ${OFFSET.y})`}>{el(C.g7, "none", 0)}</g>;

export const DEVICE_DEFS: Record<DeviceType, DeviceDef> = {
  phone: {
    w: 60, h: 112, screen: { x: -25, y: -46, w: 50, h: 90 },
    body: body((f, s, sw) => <rect x={-30} y={-56} width={60} height={112} rx={10} fill={f} stroke={s} strokeWidth={sw} />),
  },
  tablet: {
    w: 110, h: 150, screen: { x: -48, y: -66, w: 96, h: 132 },
    body: body((f, s, sw) => <rect x={-55} y={-75} width={110} height={150} rx={10} fill={f} stroke={s} strokeWidth={sw} />),
  },
  laptop: {
    w: 150, h: 96, base: 8, screen: { x: -54, y: -80, w: 108, h: 70 },
    body: body((f, s, sw) => <g><rect x={-62} y={-88} width={124} height={86} rx={6} fill={f} stroke={s} strokeWidth={sw} /><path d="M-75 -2 L75 -2 L68 8 L-68 8 Z" fill={f === "none" ? "none" : C.g4} stroke={s} strokeWidth={sw} strokeLinejoin="round" /></g>),
  },
  desktop: {
    w: 134, h: 120, screen: { x: -60, y: -52, w: 120, h: 76 },
    body: body((f, s, sw) => <g><rect x={-67} y={-59} width={134} height={90} rx={5} fill={f} stroke={s} strokeWidth={sw} /><path d="M-8 31 L-10 52 M8 31 L10 52 M-30 56 H30" stroke={s === "none" ? C.g7 : s} strokeWidth={sw || 4} fill="none" strokeLinecap="round" /></g>),
  },
  watch: {
    w: 36, h: 80, screen: { x: -13, y: -16, w: 26, h: 32 },
    body: body((f, s, sw) => <g><path d="M-11 -20 L-9 -40 H9 L11 -20 M-11 20 L-9 40 H9 L11 20" fill={f === "none" ? "none" : C.g4} stroke={s} strokeWidth={sw} /><rect x={-18} y={-22} width={36} height={44} rx={10} fill={f} stroke={s} strokeWidth={sw} /></g>),
  },
  "car-display": {
    w: 112, h: 72, screen: { x: -50, y: -30, w: 100, h: 60 },
    body: body((f, s, sw) => <rect x={-56} y={-36} width={112} height={72} rx={7} fill={f} stroke={s} strokeWidth={sw} />),
  },
  tv: {
    w: 176, h: 116, screen: { x: -82, y: -50, w: 164, h: 92 },
    body: body((f, s, sw) => <g><rect x={-88} y={-56} width={176} height={104} rx={4} fill={f} stroke={s} strokeWidth={sw} /><path d="M-40 48 L-48 60 M40 48 L48 60" stroke={s === "none" ? C.g7 : s} strokeWidth={sw || 3} strokeLinecap="round" /></g>),
  },
  "smart-speaker": {
    w: 40, h: 58, screen: { x: -16, y: -29, w: 32, h: 5 },
    body: body((f, s, sw) => <g><path d="M-20 -24 Q-20 -30 0 -30 Q20 -30 20 -24 V24 Q20 29 0 29 Q-20 29 -20 24 Z" fill={f} stroke={s} strokeWidth={sw} />{s !== "none" && <path d="M-18 -8 H18 M-18 0 H18 M-18 8 H18" stroke={C.g5} strokeWidth={1} />}</g>),
  },
  kiosk: {
    w: 80, h: 200, screen: { x: -32, y: -94, w: 64, h: 86 },
    body: body((f, s, sw) => <g><rect x={-40} y={-100} width={80} height={100} rx={6} fill={f} stroke={s} strokeWidth={sw} /><path d="M-12 0 V92 M12 0 V92 M-30 98 H30" stroke={s === "none" ? C.g7 : s} strokeWidth={sw || 4} fill="none" /></g>),
  },
  "payment-terminal": {
    w: 42, h: 64, screen: { x: -15, y: -26, w: 30, h: 20 },
    body: body((f, s, sw) => <g><rect x={-21} y={-32} width={42} height={64} rx={7} fill={f} stroke={s} strokeWidth={sw} />{s !== "none" && [0, 1, 2].map((r) => [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={-13 + c * 10} y={2 + r * 9} width={6} height={5} rx={1} fill="none" stroke={ink} strokeWidth={1} />))}</g>),
  },
};

/** Distance from a device's origin down to what it stands on, in device units. */
export const baseOf = (type: DeviceType) => DEVICE_DEFS[type].base ?? DEVICE_DEFS[type].h / 2;

/** Generic teal UI sketch for screens without an uploaded image. */
function genericUI(s: Rect, product = true): ReactNode {
  const lines = [];
  const rows = Math.max(1, Math.floor(s.h / 16));
  for (let i = 0; i < Math.min(rows, 5); i++) {
    const y = s.y + 10 + i * (s.h / (rows + 1));
    lines.push(<line key={i} x1={s.x + s.w * 0.12} y1={y} x2={s.x + s.w * (i % 2 ? 0.62 : 0.84)} y2={y} stroke={product ? C.tealDark : C.g5} strokeWidth={Math.max(1.2, s.h / 40)} strokeLinecap="round" />);
  }
  if (s.h > 30) lines.push(<rect key="btn" x={s.x + s.w * 0.14} y={s.y + s.h * 0.78} width={s.w * 0.72} height={Math.max(4, s.h * 0.1)} rx={Math.max(2, s.h * 0.05)} fill={product ? C.teal : C.g4} />);
  return lines;
}

export interface DeviceProps {
  type: DeviceType;
  /** Uploaded screen image href (already baked to teal duotone by the host). */
  href?: string;
  clipId: string;
  /** false = someone's personal device, not the product: drawn gray instead of teal. */
  product?: boolean;
  /**
   * Which side we see. "screen" faces us. "back": the person faces us, so we see the back (teal-tinted when it's
   * the product). "side": seen edge-on from the side, the screen a sliver facing the person (who is on the left;
   * mirror with scale(-1 1) for someone facing left).
   */
  face?: "screen" | "back" | "side" | "turned";
}

/**
 * A monitor or tablet turned three-quarters toward someone on its left: the near (right) edge is taller than the far
 * one, so the screen visibly faces them while its teal still shows. Mirror with scale(-1 1) for someone on the right.
 */
function DeviceTurned({ type, product }: { type: DeviceType; product: boolean }) {
  const def = DEVICE_DEFS[type];
  const s = def.screen!;
  const k = 0.68; // foreshortened width
  const L = s.x * k - 6, R = (s.x + s.w) * k + 6, T = s.y - 7, B = s.y + s.h + 7, d = (B - T) * 0.09; // far edge shrinks by d top and bottom
  const outer = `M${L} ${T + d} L${R} ${T} L${R} ${B} L${L} ${B - d} Z`;
  const iL = L + 7, iR = R - 6, iT = T + 7, iB = B - 7, id = (iB - iT) * 0.09;
  const inner = `M${iL} ${iT + id} L${iR} ${iT} L${iR} ${iB} L${iL} ${iB - id} Z`;
  const rows = [0.2, 0.36, 0.52].map((f, i) => {
    const y0 = iT + id + (iB - iT - 2 * id) * f, y1 = iT + (iB - iT) * f;
    return <path key={i} d={`M${iL + 8} ${y0} L${iL + (iR - iL) * (i % 2 ? 0.6 : 0.85)} ${y0 + (y1 - y0) * (i % 2 ? 0.6 : 0.85)}`} stroke={product ? C.tealDark : C.g5} strokeWidth={2.4} strokeLinecap="round" />;
  });
  const by = iT + id * 0.25 + (iB - iT) * 0.78;
  return (
    <g>
      <g transform={`translate(${OFFSET.x} ${OFFSET.y})`}><path d={outer} fill={C.g7} /></g>
      <path d={outer} fill={C.g7} stroke={ink} strokeWidth={2.4} strokeLinejoin="round" />
      <path d={inner} fill={product ? C.tealTint : C.g1} stroke={ink} strokeWidth={1.4} strokeLinejoin="round" />
      {rows}
      <path d={`M${iL + 10} ${by + 2} L${iR - 12} ${by - 2}`} stroke={product ? C.teal : C.g4} strokeWidth={7} strokeLinecap="round" />
      {type === "desktop" && <path d="M-2 31 L-4 52 M10 31 L12 52 M-24 56 H30" stroke={ink} strokeWidth={4} fill="none" strokeLinecap="round" />}
    </g>
  );
}

/** A held device seen from behind: its back, tinted when it's the product, with a camera or a logo. */
function DeviceBack({ type, product }: { type: DeviceType; product: boolean }) {
  const def = DEVICE_DEFS[type];
  const B = def.body;
  const tint = product ? C.tealTint : C.g2;
  const mark = product ? C.teal : C.g5;
  if (type === "laptop") {
    // the lid's back hides the keyboard; only the front lip of the base shows under it
    return (
      <g>
        <g transform={`translate(${OFFSET.x} ${OFFSET.y})`}><rect x={-62} y={-88} width={124} height={86} rx={6} fill={C.g7} /></g>
        <rect x={-62} y={-88} width={124} height={86} rx={6} fill={tint} stroke={ink} strokeWidth={2.4} />
        <circle cx={0} cy={-46} r={9} fill={mark} stroke={ink} strokeWidth={1.4} />
        <path d="M-70 -2 H70 L66 6 H-66 Z" fill={C.g4} stroke={ink} strokeWidth={2.2} strokeLinejoin="round" />
      </g>
    );
  }
  return (
    <g>
      <B outline={false} />
      {(type === "phone" || type === "tablet") && (
        <g>
          <rect x={-def.w / 2 + 3} y={-def.h / 2 + 3} width={def.w - 6} height={def.h - 6} rx={8} fill={tint} />
          <circle cx={-def.w / 2 + 14} cy={-def.h / 2 + 14} r={6} fill={C.g7} stroke={ink} strokeWidth={1.4} />
          <circle cx={0} cy={0} r={def.w * 0.12} fill={mark} stroke={ink} strokeWidth={1.2} />
        </g>
      )}
      <B outline />
    </g>
  );
}

/** A held device seen edge-on from the side, its screen facing left (toward the person). */
function DeviceSide({ type, product }: { type: DeviceType; product: boolean }) {
  const glow = product ? C.teal : C.g4;
  if (type === "laptop") {
    // base flat on the lap or table, lid open and leaning away, screen facing back toward the person
    return (
      <g>
        <path d="M-66 -1 L 66 -1 L 62 8 L -62 8 Z" fill={C.g4} stroke={ink} strokeWidth={2.4} strokeLinejoin="round" />
        <path d="M58 -1 L76 -88 L86 -86 L68 -1 Z" fill={C.g7} stroke={ink} strokeWidth={2.4} strokeLinejoin="round" />
        <path d="M60 -6 L76 -82" stroke={glow} strokeWidth={6} strokeLinecap="round" />
        <path d="M-50 -1 h80" stroke={C.g5} strokeWidth={3} strokeLinecap="round" />
      </g>
    );
  }
  const def = DEVICE_DEFS[type];
  const t = type === "tablet" ? 14 : 12;
  return (
    <g>
      <rect x={-t / 2} y={-def.h / 2} width={t} height={def.h} rx={t / 2} fill={C.g7} stroke={ink} strokeWidth={2.4} />
      <path d={`M${-t / 2 - 1} ${-def.h / 2 + 10} V${def.h / 2 - 10}`} stroke={glow} strokeWidth={6} strokeLinecap="round" />
    </g>
  );
}

/** Draws a device centered at the origin in device units. Wrap in a transform to place/scale it. */
export function Device({ type, href, clipId, product = true, face = "screen" }: DeviceProps) {
  if (face === "back" && ["laptop", "phone", "tablet"].includes(type)) return <DeviceBack type={type} product={product} />;
  if (face === "side" && ["laptop", "phone", "tablet"].includes(type)) return <DeviceSide type={type} product={product} />;
  if (face === "turned" && (type === "desktop" || type === "tablet")) return <DeviceTurned type={type} product={product} />;
  const def = DEVICE_DEFS[type];
  const s = def.screen;
  const B = def.body;
  return (
    <g>
      <B outline={false} />
      {s && type !== "smart-speaker" && (
        <>
          <clipPath id={clipId}><rect x={s.x} y={s.y} width={s.w} height={s.h} rx={2} /></clipPath>
          <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={2} fill={product ? C.tealTint : C.g1} />
          {href
            ? <image href={href} x={s.x} y={s.y} width={s.w} height={s.h} preserveAspectRatio="xMidYMin slice" clipPath={`url(#${clipId})`} opacity={product ? 1 : 0.35} />
            : <g clipPath={`url(#${clipId})`}>{genericUI(s, product)}</g>}
          <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={2} fill="none" stroke={ink} strokeWidth={1.4} />
        </>
      )}
      {type === "smart-speaker" && s && <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={2.5} fill={product ? C.teal : C.g4} stroke={ink} strokeWidth={1} />}
      <B outline />
    </g>
  );
}
