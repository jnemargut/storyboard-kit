import type { ReactNode } from "react";
import { richLines } from "../sketch/rich";
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
    // work from the bubble's own center and outline, so the tail always leaves the actual edge
    const cx = x + w / 2, cy = y + h / 2;
    const [tx, ty] = tail.to;
    const dist = Math.hypot(tx - cx, ty - cy) || 1;
    const ux = (tx - cx) / dist, uy = (ty - cy) / dist;
    if (type === "thought") {
      // the cloud is an ellipse with bumps: start just outside it and keep the dots close together
      const edge = 1 / Math.sqrt((ux * ux) / ((w / 2) ** 2) + (uy * uy) / ((h / 2) ** 2)) * 1.1;
      const room = Math.max(12, Math.min(dist - edge - 6, 44));
      const dots = [0.12, 0.5, 0.85].map((t, i) => {
        const d = edge + 5 + room * t;
        return <circle key={i} cx={cx + ux * d} cy={cy + uy * d} r={[4.2, 3, 2][i]} fill={fill} stroke={ink} strokeWidth={1.8} />;
      });
      return <g>{dots}</g>;
    }
    // speech, shout, whisper: the wedge starts well inside the body (drawn on top), so it joins at any angle
    const boxEdge = Math.min(Math.abs(w / 2 / (ux || 1e-6)), Math.abs(h / 2 / (uy || 1e-6)));
    const fx = cx + ux * boxEdge * 0.5, fy = cy + uy * boxEdge * 0.5;
    const ang = Math.atan2(ty - fy, tx - fx) + Math.PI / 2;
    const bw = Math.min(15, Math.max(8, Math.hypot(tx - fx, ty - fy) * 0.07)); // longer tails get a wider base so they read as a wedge
    const p1: Pt = [fx + Math.cos(ang) * bw, fy + Math.sin(ang) * bw];
    const p2: Pt = [fx - Math.cos(ang) * bw, fy - Math.sin(ang) * bw];
    const d = `M${p1[0]} ${p1[1]} Q${(p1[0] + tx) / 2} ${(p1[1] + ty) / 2} ${tx} ${ty} Q${(p2[0] + tx) / 2 + 2} ${(p2[1] + ty) / 2} ${p2[0]} ${p2[1]} Z`;
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
      {richLines(shout ? b.bubble.text.toUpperCase() : b.bubble.text, b.lines.map((l) => (shout ? l.toUpperCase() : l)), ink, b.size).map((l, i) => <tspan key={i} x={b.x + b.w / 2} y={top + i * lh}>{l}</tspan>)}
    </text>
  );
}

export function CaptionShape({ r }: { r: Rect }) {
  return <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={C.caption} stroke={ink} strokeWidth={1.8} />;
}

export function CaptionText({ r, lines, size, src }: { r: Rect; lines: string[]; size: number; src?: string }) {
  return (
    <text fontFamily={FONT.hand} fontSize={size} fill={ink}>
      {(src ? richLines(src, lines, ink, size) : lines).map((l, i) => <tspan key={i} x={r.x + 8} y={r.y + 5 + size * 0.9 + i * size * 1.18}>{l}</tspan>)}
    </text>
  );
}

/** Callout: an annotation from the designer (not the character), boxed with a leader line. */
export const DIR_ANGLE: Record<string, number> = { right: 0, down: 90, left: 180, up: 270 };

/** Callout box + leader line. The pointer dot is its own element (`pointId`) so it can be dragged anywhere. */
export function Callout({ r, lines, size, to, pointId, src }: { r: Rect; lines: string[]; size: number; to?: Pt; pointId?: string; src?: string }) {
  let lead: ReactNode = null;
  if (to) {
    const inside = to[0] >= r.x && to[0] <= r.x + r.w;
    const cx = Math.min(Math.max(to[0], r.x), r.x + r.w);
    const cy = to[1] < r.y ? r.y : to[1] > r.y + r.h ? r.y + r.h : inside ? r.y + r.h : to[1];
    const ex = inside || to[1] < r.y || to[1] > r.y + r.h ? cx : to[0] < r.x ? r.x : r.x + r.w;
    lead = (
      <g>
        <path d={`M${ex} ${cy} L${to[0]} ${to[1]}`} stroke={ink} strokeWidth={1.4} strokeDasharray="3 3" />
        <g data-el={pointId} data-kind="point"><circle cx={to[0]} cy={to[1]} r={8} fill="transparent" /><circle cx={to[0]} cy={to[1]} r={3} fill={ink} /></g>
      </g>
    );
  }
  return (
    <g>
      {lead}
      <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={C.paper} stroke={ink} strokeWidth={1.5} />
      <path d={`M${r.x} ${r.y + r.h + 2.5} h${r.w} M${r.x + r.w + 2.5} ${r.y + 2} v${r.h}`} stroke={ink} strokeWidth={1.2} opacity={0.5} />
      <text fontFamily={FONT.hand} fontSize={size} fill={ink}>
        {(src ? richLines(src, lines, ink, size) : lines).map((l, i) => <tspan key={i} x={r.x + 6} y={r.y + 4 + size * 0.9 + i * size * 1.15}>{l}</tspan>)}
      </text>
    </g>
  );
}

/** Gesture marks are software interactions, so they're teal. */
/**
 * Gesture marks show what the person DOES, so they're orange (never teal: teal is the product), with a white
 * halo underneath so they stay visible on teal screens and busy scenes.
 */
export function GestureMark({ g, screen }: { g: Gesture; screen?: Rect; product?: boolean }) {
  return <g>{gestureShapes(g, screen, C.paper, 3.2)}{gestureShapes(g, screen, C.action, 0)}</g>;
}

function gestureShapes(g: Gesture, screen: Rect | undefined, t: string, halo: number) {
  const sr = screen ?? { x: 180, y: 110, w: 40, h: 60 };
  const [ax, ay] = g.at ?? (g.type === "swipe" ? [0.5, 0.5] : g.type === "cursor" || g.type === "click" ? [0.6, 0.45] : [0.5, 0.74]);
  const x = sr.x + sr.w * ax, y = sr.y + sr.h * ay;
  const r = Math.max(4, Math.min(16, sr.w * 0.14));
  const sw = Math.max(2, Math.min(3.4, r / 3.6)) + halo;
  const common = { stroke: t, strokeWidth: sw, fill: "none", strokeLinecap: "round" as const };
  switch (g.type) {
    case "tap":
      return <g><circle cx={x} cy={y} r={r * 0.45} {...common} /><circle cx={x} cy={y} r={r} {...common} opacity={0.6} /></g>;
    case "double-tap":
      return <g><circle cx={x} cy={y} r={r * 0.45} {...common} /><circle cx={x} cy={y} r={r} {...common} /><circle cx={x} cy={y} r={r * 1.5} {...common} opacity={0.5} /><text x={x + r * 1.7} y={y - r} fontFamily={FONT.hand} fontSize={Math.max(9, r)} fill={t}>×2</text></g>;
    case "long-press":
      return <g><circle cx={x} cy={y} r={r * 0.5} fill={t} opacity={0.35} /><circle cx={x} cy={y} r={r * 1.1} {...common} strokeDasharray={`${r * 0.8} ${r * 0.4}`} /></g>;
    case "swipe": {
      // any direction: `angle` in degrees (0 = right, 90 = down), else the named direction
      const deg = g.angle ?? DIR_ANGLE[g.direction ?? "left"];
      const dx = Math.cos((deg * Math.PI) / 180), dy = Math.sin((deg * Math.PI) / 180);
      const len = (Math.abs(dx) * sr.w + Math.abs(dy) * sr.h) * 0.55;
      const x0 = x - (dx * len) / 2, y0 = y - (dy * len) / 2, x1 = x + (dx * len) / 2, y1 = y + (dy * len) / 2;
      const hx = -dx * r * 0.7, hy = -dy * r * 0.7;
      return <g><circle cx={x0} cy={y0} r={r * 0.4} fill={t} /><path d={`M${x0} ${y0} L${x1} ${y1}`} {...common} /><path d={`M${x1 + hx - dy * r * 0.6} ${y1 + hy + dx * r * 0.6} L${x1} ${y1} L${x1 + hx + dy * r * 0.6} ${y1 + hy - dx * r * 0.6}`} {...common} /></g>;
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
