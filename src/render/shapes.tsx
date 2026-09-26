/** Designer-drawn shapes: boxes, ovals, lines, arrows and freehand, for anything the vocabulary lacks. */
import type { LayoutOverride, Shape } from "../types";
import type { Rect } from "./devices";
import { C, FONT } from "./tokens";

const SHAPE_FILL: Record<string, string> = { none: "none", light: C.g2, mid: C.g4, dark: C.g7 };

/** Bounding box of a shape's points, for centring scale and rotate. */
export function shapeBox(s: Pick<Shape, "points">): Rect {
  const xs = s.points.map((p) => p[0]), ys = s.points.map((p) => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** Freehand points → a smooth path through their midpoints. */
function smooth(pts: [number, number][]): string {
  if (pts.length < 3) return `M${pts.map((p) => p.join(" ")).join(" L")}`;
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q${pts[i][0]} ${pts[i][1]} ${mx} ${my}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${last[0]} ${last[1]}`;
}

/** One shape in marker style: ink outline, grey fill, round ends. */
export function ShapeMark({ s }: { s: Shape }) {
  if (s.type === "text") {
    // hand-lettered, centred on its point; a clear box behind makes it easy to grab
    const [x, y] = s.points[0];
    const lines = (s.text ?? "").split("\n");
    const size = 16, lh = size * 1.2;
    const w = Math.max(24, ...lines.map((l) => l.length * size * 0.45)), h = lines.length * lh;
    const top = y - h / 2 + size * 0.85;
    return (
      <g>
        <rect x={x - w / 2 - 4} y={y - h / 2 - 3} width={w + 8} height={h + 6} fill="transparent" />
        <text textAnchor="middle" fontFamily={FONT.hand} fontSize={size} fill={C.ink} stroke={C.paper} strokeWidth={3.5} strokeLinejoin="round" paintOrder="stroke">
          {lines.map((l, i) => <tspan key={i} x={x} y={top + i * lh}>{l || "\u00a0"}</tspan>)}
        </text>
      </g>
    );
  }
  const [a, b] = s.points;
  const fill = SHAPE_FILL[s.fill ?? "none"] ?? "none";
  // closed shapes stay clickable inside even when unfilled
  const area = fill === "none" ? "transparent" : fill;
  const stroke = { stroke: C.ink, strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const hit = (d: string) => <path d={d} fill="none" stroke="transparent" strokeWidth={14} />;
  if (s.type === "rect" || s.type === "ellipse") {
    const r = shapeBox({ points: [a, b] });
    return s.type === "rect"
      ? <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={2} fill={area} {...stroke} />
      : <ellipse cx={r.x + r.w / 2} cy={r.y + r.h / 2} rx={r.w / 2} ry={r.h / 2} fill={area} {...stroke} />;
  }
  if (s.type === "line" || s.type === "arrow") {
    const d = `M${a[0]} ${a[1]} L${b[0]} ${b[1]}`;
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), k = 12;
    const head = s.type === "arrow"
      ? ` M${b[0] - k * Math.cos(ang - 0.45)} ${b[1] - k * Math.sin(ang - 0.45)} L${b[0]} ${b[1]} L${b[0] - k * Math.cos(ang + 0.45)} ${b[1] - k * Math.sin(ang + 0.45)}`
      : "";
    return <g>{hit(d)}<path d={d + head} fill="none" {...stroke} /></g>;
  }
  const d = smooth(s.points);
  return <g>{hit(d)}<path d={d} fill={fill} {...stroke} /></g>;
}

export const shapeId = (s: Shape, i: number) => s.id ?? `shape-${i}`;

/** Transform for a shape's layout override: move, then scale and rotate around its own centre. */
export function shapeTransform(s: Shape, ov: LayoutOverride): string {
  const r = shapeBox(s);
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  return `translate(${(ov.dx ?? 0) + cx} ${(ov.dy ?? 0) + cy}) rotate(${ov.rotate ?? 0}) scale(${ov.scale ?? 1}) translate(${-cx} ${-cy})`;
}
