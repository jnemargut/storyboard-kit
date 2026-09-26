/** Hats, drawn over the hair. Head centre (hx, hy), radius r; side views put brims and visors on the facing side. */
import type { CastMember } from "../types";
import type { Figure } from "./rig";
import { C, OFFSET } from "./tokens";

const ink = C.ink;

/** Marker fill slightly off an ink outline, like the rest of the drawing. */
const Mk = ({ d, fill, sw = 1.8 }: { d: string; fill: string; sw?: number }) => (
  <>
    <path d={d} fill={fill} transform={`translate(${OFFSET.x * 0.6} ${OFFSET.y * 0.6})`} />
    <path d={d} fill="none" stroke={ink} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
  </>
);

/** Dome over the top of the head from `y0` (sides) up to `top`, `ex` wider than the head. */
const dome = (hx: number, y0: number, top: number, r: number, ex = 1.5) =>
  `M${hx - r - ex} ${y0} C${hx - r - ex} ${top - 0.1 * r} ${hx + r + ex} ${top - 0.1 * r} ${hx + r + ex} ${y0} Z`;

export function Hat({ cast, f, hx, hy, r }: { cast: CastMember; f: Figure; hx: number; hy: number; r: number }) {
  if (!cast.hat) return null;
  const side = f.view === "side";
  const back = f.view === "back";
  const dir = f.dir;
  // three-quarter views turn the brim a little toward the facing side
  const lean = side ? dir : f.angle === "three-quarter" && !back ? dir * 0.35 : 0;
  // big hair sits the hat a little higher
  const lift = cast.hair === "afro" ? 0.35 * r : cast.hair === "curly" ? 0.12 * r : 0;
  const y = hy - lift;

  switch (cast.hat) {
    case "cap": {
      const base = y - 0.22 * r;
      const brim = back ? "" : side
        ? `M${hx + dir * (r - 1)} ${base} Q${hx + dir * 1.55 * r} ${base - 0.05 * r} ${hx + dir * 1.8 * r} ${base + 0.22 * r} L${hx + dir * (r - 1)} ${base + 0.14 * r} Z`
        : `M${hx - 0.9 * r + lean * 0.5 * r} ${base} Q${hx + lean * 0.5 * r} ${base + 0.55 * r} ${hx + 0.9 * r + lean * 0.5 * r} ${base} Z`;
      return (
        <g>
          <Mk d={dome(hx, base, y - 1.12 * r, r)} fill={C.g5} />
          {brim && <Mk d={brim} fill={C.g7} sw={1.6} />}
          <circle cx={hx} cy={y - 1.02 * r} r={1.3} fill={ink} />
          {back && <path d={`M${hx - 0.35 * r} ${base - 0.02 * r} q${0.35 * r} -${0.3 * r} ${0.7 * r} 0`} fill={C.paper} stroke={ink} strokeWidth={1.3} />}
        </g>
      );
    }
    case "beanie": {
      const base = y - 0.12 * r;
      return (
        <g>
          <Mk d={dome(hx, base, y - 1.32 * r, r, 1)} fill={C.g5} />
          <Mk d={`M${hx - r - 2} ${base - 0.34 * r} h${2 * r + 4} v${0.36 * r} h${-(2 * r + 4)} Z`} fill={C.g7} sw={1.6} />
          {[-0.5, 0, 0.5].map((k) => <path key={k} d={`M${hx + k * r} ${base - 0.3 * r} v${0.28 * r}`} stroke={ink} strokeWidth={1} />)}
          <circle cx={hx} cy={y - 1.3 * r} r={0.24 * r} fill={C.g2} stroke={ink} strokeWidth={1.5} />
        </g>
      );
    }
    case "hard-hat": {
      const base = y - 0.24 * r;
      const front = side ? dir * 0.5 * r : lean * 0.2 * r;
      return (
        <g>
          <Mk d={dome(hx, base, y - 1.3 * r, r, 2)} fill={C.g2} />
          <Mk d={`M${hx - 1.3 * r + Math.min(0, front)} ${base - 1} h${2.6 * r + Math.abs(front)} v3.2 h${-(2.6 * r + Math.abs(front))} Z`} fill={C.g2} sw={1.6} />
          <path d={`M${hx + lean * 0.3 * r} ${y - 1.18 * r} Q${hx + lean * 0.5 * r} ${y - 0.7 * r} ${hx + lean * 0.4 * r} ${base - 1}`} fill="none" stroke={ink} strokeWidth={1.4} />
        </g>
      );
    }
    case "chef-hat": {
      const band = y - 0.55 * r;
      const puff = `M${hx - 0.8 * r} ${band - 0.4 * r} Q${hx - 1.25 * r} ${band - 1.3 * r} ${hx - 0.45 * r} ${band - 1.35 * r} Q${hx - 0.3 * r} ${band - 1.95 * r} ${hx + 0.25 * r} ${band - 1.55 * r} Q${hx + 0.9 * r} ${band - 1.8 * r} ${hx + 0.85 * r} ${band - 1.1 * r} Q${hx + 1.25 * r} ${band - 0.8 * r} ${hx + 0.8 * r} ${band - 0.4 * r} Z`;
      return (
        <g>
          <Mk d={puff} fill={C.paper} />
          <Mk d={`M${hx - 0.85 * r} ${band - 0.42 * r} h${1.7 * r} l${0.08 * r} ${0.5 * r} h${-1.86 * r} Z`} fill={C.paper} sw={1.6} />
          <path d={`M${hx - 0.2 * r} ${band - 0.45 * r} q${-0.1 * r} ${-0.4 * r} 0 ${-0.75 * r} M${hx + 0.35 * r} ${band - 0.45 * r} q${0.1 * r} ${-0.4 * r} 0 ${-0.7 * r}`} fill="none" stroke={ink} strokeWidth={1} />
        </g>
      );
    }
    case "uniform-cap": {
      const base = y - 0.4 * r;
      const crown = `M${hx - 0.95 * r} ${base} L${hx - 1.2 * r} ${y - 1.18 * r} Q${hx} ${y - 1.4 * r} ${hx + 1.2 * r} ${y - 1.18 * r} L${hx + 0.95 * r} ${base} Z`;
      const visor = back ? "" : side
        ? `M${hx + dir * 0.8 * r} ${base} L${hx + dir * 1.5 * r} ${base + 0.25 * r} L${hx + dir * 0.8 * r} ${base + 0.18 * r} Z`
        : `M${hx - 0.8 * r + lean * 0.4 * r} ${base} Q${hx + lean * 0.4 * r} ${base + 0.5 * r} ${hx + 0.8 * r + lean * 0.4 * r} ${base} Z`;
      return (
        <g>
          <Mk d={crown} fill={C.g8} />
          <path d={`M${hx - 0.97 * r} ${base - 0.22 * r} h${1.94 * r}`} stroke={C.g2} strokeWidth={1.6} />
          {visor && <Mk d={visor} fill={ink} sw={1.4} />}
          {!back && !side && <path d={`M${hx + lean * 0.3 * r} ${base - 0.72 * r} l${0.16 * r} ${0.14 * r} l${-0.16 * r} ${0.2 * r} l${-0.16 * r} ${-0.2 * r} Z`} fill={C.g2} stroke={ink} strokeWidth={1} />}
        </g>
      );
    }
    case "sun-hat": {
      const base = y - 0.4 * r;
      return (
        <g>
          <Mk d={dome(hx, base, y - 1.35 * r, r, -0.5)} fill={C.g2} />
          <Mk d={`M${hx - 1.85 * r} ${base} Q${hx} ${base - (side ? 0.18 : 0.3) * r} ${hx + 1.85 * r} ${base} Q${hx} ${base + (side ? 0.3 : 0.5) * r} ${hx - 1.85 * r} ${base} Z`} fill={C.g2} sw={1.6} />
          <path d={`M${hx - r + 1} ${base - 0.18 * r} Q${hx} ${base - 0.3 * r} ${hx + r - 1} ${base - 0.18 * r}`} fill="none" stroke={C.g8} strokeWidth={2.4} />
        </g>
      );
    }
    case "surgical-cap": {
      const base = y - 0.3 * r;
      const tie = hx - (side ? dir : 1) * (r + 0.5);
      return (
        <g>
          <Mk d={dome(hx, base, y - 1.18 * r, r, 1)} fill={C.g2} />
          {(side || back) && <path d={`M${tie} ${base - 0.1 * r} l${-(side ? dir : 1) * 0.35 * r} ${0.45 * r} M${tie} ${base - 0.1 * r} l${-(side ? dir : 1) * 0.1 * r} ${0.55 * r}`} stroke={ink} strokeWidth={1.4} strokeLinecap="round" />}
          <path d={`M${hx - 0.5 * r} ${base - 0.5 * r} l2 2 M${hx + 0.3 * r} ${base - 0.75 * r} l2 2 M${hx - 0.1 * r} ${base - 0.3 * r} l2 2`} stroke={ink} strokeWidth={1} />
        </g>
      );
    }
    default:
      return null;
  }
}
