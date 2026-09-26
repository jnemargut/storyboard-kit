import type { ReactNode } from "react";
import type { Gesture } from "../types";
import type { Rect } from "./devices";
import type { BubbleBox } from "./layout";
import type { Pt } from "./rig";
import { C, FONT } from "./tokens";

const ink = C.ink;

function cloudPath(x: number, y: number, w: number, h: number): string {
  const cx = x + w / 2, cy = y + h / 2, rx = w / 2, ry = h / 2;
  const n = Math.max(8, Math.round((w + h) / 22));
  let d = "";
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * ry;
    if (i === 0) { d += `M${px.toFixed(1)} ${py.toFixed(1)}`; continue; }
    const pa = ((i - 0.5) / n) * Math.PI * 2;
    const bulge = 1.22;
    d += ` Q${(cx + Math.cos(pa) * rx * bulge).toFixed(1)} ${(cy + Math.sin(pa) * ry * bulge).toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)}`;
  }
  return d + " Z";
}

function spikyPath(x: number, y: number, w: number, h: number): string {
  const cx = x + w / 2, cy = y + h / 2, rx = w / 2 + 4, ry = h / 2 + 4;
  const n = 18;
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2;
    const k = i % 2 ? 0.82 : 1.08;
    pts.push(`${(cx + Math.cos(a) * rx * k).toFixed(1)} ${(cy + Math.sin(a) * ry * k).toFixed(1)}`);
  }
  return `M${pts.join(" L")} Z`;
}

/** Bubble outline (drawn in the wobbly layer). */
export function BubbleShape({ b }: { b: BubbleBox }) {
  const { x, y, w, h, tail } = b;
  const type = b.bubble.type;
  const fill = C.paper;
  const tailEl = (): ReactNode => {
    if (!tail) return null;
    if (type === "thought") {
      const [fx, fy] = tail.from, [tx, ty] = tail.to;
      const dots = [0.35, 0.62, 0.86].map((t, i) => (
        <circle key={i} cx={fx + (tx - fx) * t} cy={fy + (ty - fy) * t} r={[4.2, 3, 2][i]} fill={fill} stroke={ink} strokeWidth={1.8} />
      ));
      return <g>{dots}</g>;
    }
    const [fx, fy] = tail.from, [tx, ty] = tail.to;
    const ang = Math.atan2(ty - fy, tx - fx) + Math.PI / 2;
    const bw = 7;
    const p1: Pt = [fx + Math.cos(ang) * bw, fy + Math.sin(ang) * bw];
    const p2: Pt = [fx - Math.cos(ang) * bw, fy - Math.sin(ang) * bw];
    const d = `M${p1[0]} ${p1[1]} Q${(p1[0] + tx) / 2} ${(p1[1] + ty) / 2} ${tx} ${ty} Q${(p2[0] + tx) / 2 + 2} ${(p2[1] + ty) / 2} ${p2[0]} ${p2[1]}`;
    return <path d={d} fill={fill} stroke={ink} strokeWidth={2} strokeDasharray={type === "whisper" ? "4 3" : undefined} strokeLinejoin="round" />;
  };
  let body: ReactNode;
  if (type === "thought") body = <path d={cloudPath(x, y, w, h)} fill={fill} stroke={ink} strokeWidth={2} strokeLinejoin="round" />;
  else if (type === "shout") body = <path d={spikyPath(x, y, w, h)} fill={fill} stroke={ink} strokeWidth={2.2} strokeLinejoin="round" />;
  else body = <rect x={x} y={y} width={w} height={h} rx={Math.min(16, h / 2)} fill={fill} stroke={ink} strokeWidth={2} strokeDasharray={type === "whisper" ? "5 4" : undefined} />;
  // tail under the body for speech so the join is clean
  return type === "thought" ? <g>{body}{tailEl()}</g> : <g>{tailEl()}{body}</g>;
}

export function BubbleText({ b }: { b: BubbleBox }) {
  const lh = b.size * 1.15;
  const top = b.y + b.h / 2 - ((b.lines.length - 1) * lh) / 2 + b.size * 0.34;
  const shout = b.bubble.type === "shout";
  return (
    <text fontFamily={shout ? FONT.title : FONT.hand} fontSize={shout ? b.size - 1.5 : b.size} fill={ink} textAnchor="middle" fontStyle={b.bubble.type === "whisper" ? "italic" : undefined}>
      {b.lines.map((l, i) => <tspan key={i} x={b.x + b.w / 2} y={top + i * lh}>{shout ? l.toUpperCase() : l}</tspan>)}
    </text>
  );
}

export function CaptionShape({ r }: { r: Rect }) {
  return <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={C.caption} stroke={ink} strokeWidth={1.8} />;
}

export function CaptionText({ r, lines, size }: { r: Rect; lines: string[]; size: number }) {
  return (
    <text fontFamily={FONT.hand} fontSize={size} fill={ink}>
      {lines.map((l, i) => <tspan key={i} x={r.x + 8} y={r.y + 5 + size * 0.9 + i * size * 1.18}>{l}</tspan>)}
    </text>
  );
}

/** Callout: an annotation from the designer (not the character), boxed with a leader line. */
export function Callout({ r, lines, size, to }: { r: Rect; lines: string[]; size: number; to?: Pt }) {
  let lead: ReactNode = null;
  if (to) {
    const cx = Math.min(Math.max(to[0], r.x), r.x + r.w), cy = to[1] < r.y ? r.y : r.y + r.h;
    lead = <g><path d={`M${cx} ${cy} L${to[0]} ${to[1]}`} stroke={ink} strokeWidth={1.4} strokeDasharray="3 3" /><circle cx={to[0]} cy={to[1]} r={2.6} fill={ink} /></g>;
  }
  return (
    <g>
      {lead}
      <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={C.paper} stroke={ink} strokeWidth={1.5} />
      <path d={`M${r.x} ${r.y + r.h + 2.5} h${r.w} M${r.x + r.w + 2.5} ${r.y + 2} v${r.h}`} stroke={ink} strokeWidth={1.2} opacity={0.5} />
      <text fontFamily={FONT.hand} fontSize={size} fill={ink}>
        {lines.map((l, i) => <tspan key={i} x={r.x + 6} y={r.y + 4 + size * 0.9 + i * size * 1.15}>{l}</tspan>)}
      </text>
    </g>
  );
}

/** Gesture marks are software interactions, so they're teal. */
export function GestureMark({ g, screen, product = true }: { g: Gesture; screen?: Rect; product?: boolean }) {
  const t = product ? C.teal : C.g8;
  const sr = screen ?? { x: 180, y: 110, w: 40, h: 60 };
  const [ax, ay] = g.at ?? (g.type === "swipe" ? [0.5, 0.5] : g.type === "cursor" || g.type === "click" ? [0.6, 0.45] : [0.5, 0.74]);
  const x = sr.x + sr.w * ax, y = sr.y + sr.h * ay;
  const r = Math.max(4, Math.min(16, sr.w * 0.14));
  const sw = Math.max(1.6, Math.min(3, r / 4));
  const common = { stroke: t, strokeWidth: sw, fill: "none", strokeLinecap: "round" as const };
  switch (g.type) {
    case "tap":
      return <g><circle cx={x} cy={y} r={r * 0.45} {...common} /><circle cx={x} cy={y} r={r} {...common} opacity={0.6} /><path d={`M${x - r * 1.5} ${y - r * 1.2} l${-r * 0.5} ${-r * 0.5} M${x} ${y - r * 1.5} v${-r * 0.7} M${x + r * 1.5} ${y - r * 1.2} l${r * 0.5} ${-r * 0.5}`} {...common} /></g>;
    case "double-tap":
      return <g><circle cx={x} cy={y} r={r * 0.45} {...common} /><circle cx={x} cy={y} r={r} {...common} /><circle cx={x} cy={y} r={r * 1.5} {...common} opacity={0.5} /><text x={x + r * 1.7} y={y - r} fontFamily={FONT.hand} fontSize={Math.max(9, r)} fill={t}>×2</text></g>;
    case "long-press":
      return <g><circle cx={x} cy={y} r={r * 0.5} fill={t} opacity={0.35} /><circle cx={x} cy={y} r={r * 1.1} {...common} strokeDasharray={`${r * 0.8} ${r * 0.4}`} /></g>;
    case "swipe": {
      const dir = g.direction ?? "left";
      const len = (dir === "left" || dir === "right" ? sr.w : sr.h) * 0.55;
      const [dx, dy] = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir];
      const x0 = x - (dx * len) / 2, y0 = y - (dy * len) / 2, x1 = x + (dx * len) / 2, y1 = y + (dy * len) / 2;
      const hx = -dx * r * 0.7, hy = -dy * r * 0.7;
      return <g><circle cx={x0} cy={y0} r={r * 0.4} fill={t} /><path d={`M${x0} ${y0} L${x1} ${y1}`} {...common} /><path d={`M${x1 + hx - dy * r * 0.6} ${y1 + hy - dx * r * 0.6} L${x1} ${y1} L${x1 + hx + dy * r * 0.6} ${y1 + hy + dx * r * 0.6}`} {...common} /></g>;
    }
    case "cursor": case "click": {
      const k = Math.max(0.5, r / 9);
      const cur = `M${x} ${y} l0 ${16 * k} l${4 * k} ${-4 * k} l${3 * k} ${7 * k} l${3 * k} ${-1.5 * k} l${-3 * k} ${-7 * k} l${6 * k} 0 Z`;
      return <g><path d={cur} fill={C.paper} stroke={t} strokeWidth={sw} strokeLinejoin="round" />{g.type === "click" && <path d={`M${x - 3 * k} ${y - 3 * k} l${-4 * k} ${-4 * k} M${x} ${y - 5 * k} v${-5 * k} M${x - 5 * k} ${y} h${-5 * k}`} {...common} />}</g>;
    }
    case "typing": {
      const by = sr.y + sr.h + r * 0.8;
      return <g>{[0, 1, 2, 3].map((i) => <path key={i} d={`M${sr.x + sr.w * (0.2 + i * 0.2)} ${by} l${-r * 0.3} ${r * 0.8}`} {...common} />)}</g>;
    }
    case "notification": {
      const cx = sr.x + sr.w / 2, cy = sr.y + sr.h / 2, hw = sr.w / 2 + r * 0.9, hh = sr.h / 2;
      return (
        <g>
          <path d={`M${cx - hw} ${cy - hh * 0.4} q${-r * 0.5} ${hh * 0.4} 0 ${hh * 0.8} M${cx - hw - r * 0.7} ${cy - hh * 0.55} q${-r * 0.6} ${hh * 0.55} 0 ${hh * 1.1}`} {...common} />
          <path d={`M${cx + hw} ${cy - hh * 0.4} q${r * 0.5} ${hh * 0.4} 0 ${hh * 0.8} M${cx + hw + r * 0.7} ${cy - hh * 0.55} q${r * 0.6} ${hh * 0.55} 0 ${hh * 1.1}`} {...common} />
          <circle cx={sr.x + sr.w} cy={sr.y} r={Math.max(3, r * 0.45)} fill={t} stroke={ink} strokeWidth={1} />
        </g>
      );
    }
    case "voice": {
      const cx = sr.x + sr.w / 2, cy = sr.y;
      return <g>{[1, 1.8, 2.6].map((k, i) => <path key={i} d={`M${cx - r * k} ${cy - r * k * 0.5} Q${cx} ${cy - r * k * 1.4} ${cx + r * k} ${cy - r * k * 0.5}`} {...common} opacity={1 - i * 0.25} />)}</g>;
    }
    default:
      return null;
  }
}
