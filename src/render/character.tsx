import type { ReactNode } from "react";
import type { CastMember } from "../types";
import type { Mood } from "../vocab";
import type { Figure, Pt } from "./rig";
import { C, HAIR_FILL, OFFSET, OUTFIT_FILL, SKIN } from "./tokens";

const ink = C.ink;
const ln = (a: Pt, b: Pt, w: number, color: string, key?: string) => (
  <line key={key} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={w} strokeLinecap="round" />
);
/** Ink outline + inner marker colour: a limb. */
const limb = (a: Pt, b: Pt, outer: number, fill: string, key: string) => (
  <g key={key}>{ln(a, b, outer, ink)}{ln(a, b, outer - 3.6, fill)}</g>
);
const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

function face(f: Figure, mood: Mood, hx: number, hy: number, r: number): ReactNode {
  if (f.view === "back") return null;
  const s = { stroke: ink, strokeWidth: 1.5, fill: "none", strokeLinecap: "round" as const };
  if (f.view === "side") {
    const d = f.dir;
    const ex = hx + 5 * d, ey = hy - 1;
    const mx = hx + 7 * d, my = hy + 6;
    const mouth: Record<string, string> = {
      happy: `M${mx - 3 * d} ${my} q${2 * d} 2 ${4 * d} 0`, excited: `M${mx - 3 * d} ${my - 1} q${2 * d} 4 ${4 * d} 0 z`,
      surprised: "", sad: `M${mx - 3 * d} ${my + 1} q${2 * d} -2 ${4 * d} 0`, frustrated: `M${mx - 3 * d} ${my + 1} q${2 * d} -2 ${4 * d} 0`,
      stressed: `M${mx - 3 * d} ${my + 1} q${2 * d} -2 ${4 * d} 0`, relieved: `M${mx - 3 * d} ${my} q${2 * d} 1.5 ${4 * d} 0`,
    };
    const eye = mood === "relieved" || mood === "tired" ? <path d={`M${ex - 1.5} ${ey} h3`} {...s} /> : <path d={`M${ex} ${ey - 1} v2`} {...s} />;
    const brow = ["frustrated", "stressed", "impatient", "focused"].includes(mood)
      ? <path d={`M${ex - 3 * d} ${ey - 5} l${5 * d} 2`} {...s} />
      : ["surprised", "excited", "confused", "sad"].includes(mood) ? <path d={`M${ex - 3 * d} ${ey - 6} q${3 * d} -2 ${5 * d} 0`} {...s} /> : null;
    return (
      <g>
        {eye}{brow}
        <path d={`M${hx + r * d - 0.5 * d} ${hy - 2} l${3.5 * d} 4 l${-3.5 * d} 1.5`} {...s} />
        {mood === "surprised" ? <circle cx={mx} cy={my} r={1.8} {...s} /> : <path d={mouth[mood] ?? `M${mx - 2.5 * d} ${my} h${4 * d}`} {...s} />}
        {mood === "stressed" && <path d={`M${hx - 6 * d} ${hy - 8} q-2 4 0 5 q2 -1 0 -5z`} fill={C.paper} stroke={ink} strokeWidth={1.1} />}
      </g>
    );
  }
  const shift = f.angle === "three-quarter" ? 3.5 * f.dir : 0;
  const cx = hx + shift, sp = f.angle === "three-quarter" ? 3.4 : 4.2;
  const ey = hy + 0.5, my = hy + 6.5;
  let eyes: ReactNode;
  switch (mood) {
    case "surprised": eyes = <><circle cx={cx - sp} cy={ey} r={1.6} {...s} /><circle cx={cx + sp} cy={ey} r={1.6} {...s} /></>; break;
    case "relieved": eyes = <><path d={`M${cx - sp - 1.8} ${ey} q1.8 1.8 3.6 0`} {...s} /><path d={`M${cx + sp - 1.8} ${ey} q1.8 1.8 3.6 0`} {...s} /></>; break;
    case "tired": case "impatient": eyes = <><path d={`M${cx - sp - 1.6} ${ey + 0.5} h3.2`} {...s} /><path d={`M${cx + sp - 1.6} ${ey + 0.5} h3.2`} {...s} /></>; break;
    default: eyes = <><path d={`M${cx - sp} ${ey - 1} v2`} {...s} /><path d={`M${cx + sp} ${ey - 1} v2`} {...s} /></>;
  }
  const by = ey - 4.5;
  const brows: Record<string, string> = {
    frustrated: `M${cx - sp - 2} ${by - 1} l3.5 1.6 M${cx + sp + 2} ${by - 1} l-3.5 1.6`,
    stressed: `M${cx - sp - 2} ${by - 1} l3.5 1.6 M${cx + sp + 2} ${by - 1} l-3.5 1.6`,
    impatient: `M${cx - sp - 2} ${by} h3.5 M${cx + sp - 1.5} ${by + 0.6} l3.5 -1`,
    focused: `M${cx - sp - 2} ${by + 0.5} h3.8 M${cx + sp - 1.8} ${by + 0.5} h3.8`,
    sad: `M${cx - sp - 2} ${by + 0.6} l3.5 -1.6 M${cx + sp + 2} ${by + 0.6} l-3.5 -1.6`,
    surprised: `M${cx - sp - 2} ${by - 2} q2 -2 4 0 M${cx + sp - 2} ${by - 2} q2 -2 4 0`,
    excited: `M${cx - sp - 2} ${by - 1.5} q2 -2 4 0 M${cx + sp - 2} ${by - 1.5} q2 -2 4 0`,
    confused: `M${cx - sp - 2} ${by + 0.5} h3.6 M${cx + sp - 2} ${by - 2} q2 -2 4 0`,
  };
  const mouths: Record<string, ReactNode> = {
    happy: <path d={`M${cx - 3.5} ${my - 0.5} q3.5 3 7 0`} {...s} />,
    excited: <path d={`M${cx - 4} ${my - 1} q4 6 8 0 z`} {...s} fill={C.paper} />,
    relieved: <path d={`M${cx - 3} ${my} q3 2 6 0`} {...s} />,
    sad: <path d={`M${cx - 3.5} ${my + 1.5} q3.5 -3 7 0`} {...s} />,
    frustrated: <path d={`M${cx - 3.5} ${my + 1.5} q3.5 -3 7 0`} {...s} />,
    stressed: <path d={`M${cx - 3.5} ${my + 1} q1.2 -1.5 2.4 0 q1.2 1.5 2.4 0 q1.2 -1.5 2.4 0`} {...s} />,
    confused: <path d={`M${cx - 3.5} ${my} q1.7 -1.6 3.5 0 q1.7 1.6 3.5 0`} {...s} />,
    surprised: <ellipse cx={cx} cy={my + 0.5} rx={2} ry={2.6} {...s} />,
    focused: <path d={`M${cx - 2} ${my} h4`} {...s} />,
  };
  return (
    <g>
      {eyes}
      {brows[mood] && <path d={brows[mood]} {...s} />}
      {mouths[mood] ?? <path d={`M${cx - 3} ${my} h6`} {...s} />}
      {f.angle === "three-quarter" && <path d={`M${cx + 1.5 * f.dir} ${hy + 1} l${1.5 * f.dir} 2.6 l${-1.5 * f.dir} 0.6`} {...s} strokeWidth={1.2} />}
      {mood === "stressed" && <path d={`M${hx + 9} ${hy - 7} q-2 4 0 5 q2 -1 0 -5z`} fill={C.paper} stroke={ink} strokeWidth={1.1} />}
      {mood === "tired" && <path d={`M${cx - sp - 1.5} ${ey + 2.6} q1.5 1 3 0 M${cx + sp - 1.5} ${ey + 2.6} q1.5 1 3 0`} {...s} strokeWidth={0.9} />}
    </g>
  );
}

function hairBack(cast: CastMember, f: Figure, hx: number, hy: number, r: number): ReactNode {
  const fill = HAIR_FILL[cast.hairShade ?? (cast.age === "older" ? "grey" : "dark")];
  const st = { fill, stroke: ink, strokeWidth: 1.8, strokeLinejoin: "round" as const };
  switch (cast.hair) {
    case "long": return <path d={`M${hx - r - 1} ${hy - 2} Q${hx - r - 3} ${hy + 16} ${hx - r + 2} ${hy + 20} L${hx + r - 2} ${hy + 20} Q${hx + r + 3} ${hy + 16} ${hx + r + 1} ${hy - 2} Z`} {...st} />;
    case "afro": return <circle cx={hx} cy={hy - 3} r={r * 1.5} {...st} />;
    case "curly": return <g>{[-1, -0.5, 0, 0.5, 1].map((k, i) => <circle key={i} cx={hx + k * r} cy={hy - r * 0.7 + Math.abs(k) * 4} r={r * 0.5} {...st} />)}</g>;
    case "hijab": return <path d={`M${hx - r - 3} ${hy} Q${hx - r - 4} ${hy - r - 5} ${hx} ${hy - r - 4} Q${hx + r + 4} ${hy - r - 5} ${hx + r + 3} ${hy} L${hx + r + 5} ${hy + 18} L${hx - r - 5} ${hy + 18} Z`} fill={C.g4} stroke={ink} strokeWidth={1.8} />;
    case "ponytail": return f.view === "side" ? <path d={`M${hx - r * f.dir} ${hy - 4} q${-9 * f.dir} 4 ${-6 * f.dir} 16`} fill="none" stroke={ink} strokeWidth={4.5} strokeLinecap="round" /> : null;
    default: return null;
  }
}

function hairFront(cast: CastMember, f: Figure, hx: number, hy: number, r: number): ReactNode {
  const fill = HAIR_FILL[cast.hairShade ?? (cast.age === "older" ? "grey" : "dark")];
  const st = { fill, stroke: ink, strokeWidth: 1.8, strokeLinejoin: "round" as const };
  const d = f.view === "side" ? f.dir : 1;
  if (f.view === "back") {
    if (cast.hair === "bald") return null;
    if (cast.hair === "hijab") return <circle cx={hx} cy={hy} r={r + 2} fill={C.g4} stroke={ink} strokeWidth={1.8} />;
    return <g><circle cx={hx} cy={hy} r={r} {...st} />{cast.hair === "bun" && <circle cx={hx} cy={hy - r - 3} r={5.5} {...st} />}{cast.hair === "ponytail" && <path d={`M${hx} ${hy + 2} v12`} stroke={ink} strokeWidth={4.5} strokeLinecap="round" />}</g>;
  }
  const cap = `M${hx - r} ${hy - 1} Q${hx - r} ${hy - r - 3} ${hx} ${hy - r} Q${hx + r} ${hy - r - 2} ${hx + r} ${hy - 2} Q${hx + 2 * d} ${hy - 8} ${hx - r} ${hy - 1} Z`;
  switch (cast.hair) {
    case "bald": return null;
    case "hijab": return <path d={`M${hx - r - 1} ${hy + 4} Q${hx - r - 2} ${hy - r - 2} ${hx} ${hy - r - 1} Q${hx + r + 2} ${hy - r - 2} ${hx + r + 1} ${hy + 4} Q${hx + r - 3} ${hy - r + 5} ${hx} ${hy - r + 4} Q${hx - r + 3} ${hy - r + 5} ${hx - r - 1} ${hy + 4} Z`} fill={C.g4} stroke={ink} strokeWidth={1.8} />;
    case "buzz": return <path d={cap} fill={C.g5} stroke={ink} strokeWidth={1.4} />;
    case "afro": case "curly": return <path d={`M${hx - r} ${hy - 3} Q${hx} ${hy - r - 6} ${hx + r} ${hy - 3} Q${hx} ${hy - 9} ${hx - r} ${hy - 3} Z`} {...st} />;
    case "bun": return <g><path d={cap} {...st} /><circle cx={hx - (r - 2) * (f.view === "side" ? d : 1)} cy={hy - r + 1} r={5.5} {...st} /></g>;
    case "short": return <path d={`M${hx - r - 1} ${hy + 3} Q${hx - r - 3} ${hy - r - 4} ${hx + 2} ${hy - r - 1} Q${hx + r + 3} ${hy - r} ${hx + r + 1} ${hy + 3} L${hx + r - 3} ${hy - 4} Q${hx} ${hy - 7} ${hx - r + 3} ${hy - 4} Z`} {...st} />;
    default: return <path d={cap} {...st} />;
  }
}

export interface CharacterProps {
  f: Figure;
  cast: CastMember;
  mood: Mood;
  held?: ReactNode;
  /** Draw a simple stool when seated somewhere without furniture. */
  stool?: boolean;
  /** Skip one arm (e.g. over-the-shoulder shots redraw it reaching for the device). */
  hideArm?: "left" | "right";
}

/** Draws a character in local space (feet at 0,0). */
export function Character({ f, cast, mood, held, stool, hideArm }: CharacterProps) {
  const j = f.j;
  const skin = SKIN[cast.skin ?? "tone-2"];
  const outfit = cast.outfit ?? "jacket";
  const top = OUTFIT_FILL[outfit] ?? C.g4;
  const pants = outfit === "suit" ? C.g8 : outfit === "scrubs" ? C.g2 : C.g7;
  const acc = new Set(cast.accessories ?? []);
  const shortSleeves = outfit === "tee" || outfit === "scrubs" || outfit === "dress";
  const [hx, hy] = j.head;
  const r = f.headR;
  const side = f.view === "side";
  const w = f.torsoW;

  const legs: ReactNode[] = [];
  const legW = 9 * Math.min(w, 1.15);
  const legFill = outfit === "dress" ? skin : pants;
  legs.push(limb(j.hipL, j.knL, legW, legFill, "tl"), limb(j.knL, j.ftL, legW - 1, outfit === "dress" ? skin : pants, "sl"));
  legs.push(limb(j.hipR, j.knR, legW, legFill, "tr"), limb(j.knR, j.ftR, legW - 1, outfit === "dress" ? skin : pants, "sr"));
  const shoe = (p: Pt, k: string) => <ellipse key={k} cx={p[0] + (side ? 3 * f.dir : 0)} cy={p[1] - 1.5} rx={side ? 6.5 : 5} ry={3} fill={ink} />;

  // torso
  const neck = j.neck;
  let torso: string;
  if (side) {
    const tw = 9 * w;
    const [sx, sy] = j.shR; const [px, py] = j.hipR;
    torso = `M${sx - tw * 0.8} ${sy - 3} Q${sx} ${sy - 7} ${sx + tw} ${sy - 1} L${px + tw * (cast.body === "plus" ? 1.4 : 1)} ${py + 4} L${px - tw} ${py + 4} Z`;
  } else {
    const [lx, ly] = j.shL; const [rx, ry] = j.shR;
    const belly = cast.body === "plus" ? 5 : 0;
    torso = `M${lx - 5} ${ly - 1} Q${(lx + rx) / 2} ${ly - 5} ${rx + 5} ${ry - 1} Q${j.hipR[0] + 7 + belly} ${(ry + j.hipR[1]) / 2} ${j.hipR[0] + 6} ${j.hipR[1] + 4} L${j.hipL[0] - 6} ${j.hipL[1] + 4} Q${j.hipL[0] - 7 - belly} ${(ly + j.hipL[1]) / 2} ${lx - 5} ${ly - 1} Z`;
  }
  const skirt = outfit === "dress"
    ? `M${Math.min(j.hipL[0], j.hipR[0]) - 7} ${j.hipL[1]} L${Math.max(j.hipL[0], j.hipR[0]) + 7} ${j.hipR[1]} L${Math.max(j.knL[0], j.knR[0]) + 10} ${Math.max(j.knL[1], j.knR[1]) + 2} L${Math.min(j.knL[0], j.knR[0]) - 10} ${Math.max(j.knL[1], j.knR[1]) + 2} Z`
    : null;

  const arm = (s: Pt, e: Pt, h: Pt, k: string) => (
    <g key={k}>
      {ln(s, e, 8.5, ink)}{ln(e, h, 7.5, ink)}
      {ln(s, e, 4.9, top)}{ln(e, h, 3.9, shortSleeves ? skin : top)}
      {shortSleeves && ln(e, mid(e, s), 4.9, top)}
      <circle cx={h[0]} cy={h[1]} r={3.4} fill={skin} stroke={ink} strokeWidth={1.4} />
    </g>
  );
  // draw the far arm first
  const farFirst = side || f.view === "back";
  const armL = hideArm === "left" ? null : arm(j.shL, j.elL, j.hdL, "al");
  const armR = hideArm === "right" ? null : arm(j.shR, j.elR, j.hdR, "ar");

  const hipY = Math.max(j.hipL[1], j.hipR[1]);
  const seatX = (j.hipL[0] + j.hipR[0]) / 2 + (side ? -2 * f.dir : 0);
  return (
    <g>
      {stool && !acc.has("wheelchair") && (
        <g>
          <path d={`M${seatX - 15} ${hipY + 4} h30 v5 h-30 Z`} fill={C.g4} stroke={ink} strokeWidth={1.8} />
          <path d={`M${seatX - 11} ${hipY + 9} L${seatX - 14} 0 M${seatX + 11} ${hipY + 9} L${seatX + 14} 0 M${seatX - 12} ${hipY / 2} h24`} stroke={ink} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        </g>
      )}
      {acc.has("wheelchair") && (
        <g>
          <circle cx={j.hipL[0] + (side ? -4 * f.dir : 0)} cy={-20} r={20} fill="none" stroke={ink} strokeWidth={2.4} />
          <circle cx={j.hipL[0] + (side ? -4 * f.dir : 0)} cy={-20} r={3} fill={ink} />
          <path d={`M${j.hipL[0] - 14} ${j.hipL[1] + 4} h28 M${j.hipL[0] + (side ? -12 * f.dir : 0)} ${j.hipL[1] - 30} v30`} stroke={ink} strokeWidth={2.2} fill="none" strokeLinecap="round" />
        </g>
      )}
      {hairBack(cast, f, hx, hy, r)}
      {farFirst && (side ? armL : null)}
      {legs}
      {!acc.has("wheelchair") && <>{shoe(j.ftL, "fl")}{shoe(j.ftR, "fr")}</>}
      {skirt && <><path d={skirt} fill={top} transform={`translate(${OFFSET.x} ${OFFSET.y})`} /><path d={skirt} fill="none" stroke={ink} strokeWidth={2} strokeLinejoin="round" /></>}
      <path d={torso} fill={top} transform={`translate(${OFFSET.x} ${OFFSET.y})`} />
      <path d={torso} fill="none" stroke={ink} strokeWidth={2.1} strokeLinejoin="round" />
      {outfit === "apron" && !side && f.view !== "back" && <path d={`M${j.shL[0] + 3} ${j.shL[1] + 10} h${j.shR[0] - j.shL[0] - 6} l2 ${j.hipR[1] - j.shR[1] + 8} h${-(j.shR[0] - j.shL[0] + 2)} z`} fill={C.g8} stroke={ink} strokeWidth={1.5} />}
      {outfit === "suit" && !side && f.view !== "back" && <path d={`M${neck[0] - 5} ${neck[1] + 6} l5 12 l5 -12`} fill={C.paper} stroke={ink} strokeWidth={1.3} />}
      {outfit === "hoodie" && f.view !== "back" && <path d={`M${neck[0] - 9} ${neck[1] + 4} q9 7 18 0`} fill="none" stroke={ink} strokeWidth={1.5} />}
      {outfit !== "suit" && outfit !== "hoodie" && !side && f.view !== "back" && <path d={`M${neck[0] - 4} ${neck[1] + 5} q4 4 8 0`} fill="none" stroke={ink} strokeWidth={1.3} />}
      {acc.has("backpack") && (side || f.view === "back"
        ? <rect x={side ? (f.dir > 0 ? j.shR[0] - 16 * w : j.shR[0] + 6 * w) : Math.min(j.shL[0], j.shR[0]) + 1} y={j.shR[1] + 2}
            width={side ? 10 * w : Math.abs(j.shR[0] - j.shL[0]) - 2} height={30} rx={4} fill={C.g5} stroke={ink} strokeWidth={1.8} />
        : <path d={`M${j.shL[0] + 3} ${j.shL[1]} v18 M${j.shR[0] - 3} ${j.shR[1]} v18`} stroke={C.g8} strokeWidth={2.4} strokeLinecap="round" />)}
      {acc.has("bag") && <g><path d={`M${j.shR[0]} ${j.shR[1]} L${j.hipL[0] - 4} ${j.hipL[1] + 2}`} stroke={ink} strokeWidth={1.6} /><rect x={j.hipL[0] - 12} y={j.hipL[1] - 4} width={12} height={10} rx={2} fill={C.g5} stroke={ink} strokeWidth={1.6} /></g>}
      {farFirst ? (side ? armR : <>{armL}{armR}</>) : null}
      {/* head */}
      <circle cx={hx} cy={hy} r={r} fill={skin} stroke={ink} strokeWidth={2.1} />
      {acc.has("beard") && f.view !== "back" && <path d={side ? `M${hx - 2 * f.dir} ${hy + 5} Q${hx + 5 * f.dir} ${hy + r + 4} ${hx + (r - 2) * f.dir} ${hy + 7} Q${hx + 4 * f.dir} ${hy + 9} ${hx - 2 * f.dir} ${hy + 5} Z` : `M${hx - r + 1.5} ${hy + 3} Q${hx} ${hy + r + 6} ${hx + r - 1.5} ${hy + 3} Q${hx + 5} ${hy + 10.5} ${hx} ${hy + 10.5} Q${hx - 5} ${hy + 10.5} ${hx - r + 1.5} ${hy + 3} Z`} fill={HAIR_FILL[cast.hairShade ?? "dark"]} stroke={ink} strokeWidth={1.4} />}
      {face(f, mood, hx, hy, r)}
      {hairFront(cast, f, hx, hy, r)}
      {acc.has("glasses") && f.view !== "back" && (side
        ? <g fill="none" stroke={ink} strokeWidth={1.4}><circle cx={hx + 6 * f.dir} cy={hy - 0.5} r={3} /><path d={`M${hx + 3 * f.dir} ${hy - 1} h${-6 * f.dir}`} /></g>
        : <g fill="none" stroke={ink} strokeWidth={1.4}><circle cx={hx - 4 + (f.angle === "three-quarter" ? 3 * f.dir : 0)} cy={hy + 0.5} r={3.2} /><circle cx={hx + 4 + (f.angle === "three-quarter" ? 3 * f.dir : 0)} cy={hy + 0.5} r={3.2} /></g>)}
      {acc.has("headphones") && <g><path d={`M${hx - r - 1} ${hy} Q${hx} ${hy - r - 10} ${hx + r + 1} ${hy}`} fill="none" stroke={ink} strokeWidth={2.4} /><rect x={hx - r - 4} y={hy - 4} width={5} height={9} rx={2} fill={C.g7} stroke={ink} strokeWidth={1.3} /><rect x={hx + r - 1} y={hy - 4} width={5} height={9} rx={2} fill={C.g7} stroke={ink} strokeWidth={1.3} /></g>}
      {acc.has("cane") && <path d={`M${j.hdL[0]} ${j.hdL[1]} L${j.hdL[0] + 5} 0 M${j.hdL[0] - 3} ${j.hdL[1]} q3 -4 6 0`} stroke={ink} strokeWidth={2.4} fill="none" strokeLinecap="round" />}
      {!farFirst && <>{armL}</>}
      {held}
      {!farFirst && <>{armR}</>}
      {farFirst && held && <circle cx={j.hdR[0]} cy={j.hdR[1]} r={3.4} fill={skin} stroke={ink} strokeWidth={1.4} />}
    </g>
  );
}
