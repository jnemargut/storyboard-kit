/**
 * Heads: hair (per view, so it never covers the face), faces with exaggerated storyboard expressions, and
 * comic "emanata" (?, sweat drops, anger mark, z's…) so a mood reads even in a small wide shot.
 */
import type { ReactNode } from "react";
import type { CastMember } from "../types";
import type { Mood } from "../vocab";
import type { Figure } from "./rig";
import { C, HAIR_FILL } from "./tokens";
import { Hat } from "./hats";

const ink = C.ink;
const line = (w: number) => ({ stroke: ink, strokeWidth: w, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const });

const hairColor = (cast: CastMember) => HAIR_FILL[cast.hairShade ?? (cast.age === "older" ? "grey" : "dark")];

// ------------------------------------------------------------------ hair

/** Hair drawn BEHIND the head and body (long hair, afro volume, hijab drape, ponytail). */
export function hairBack(cast: CastMember, f: Figure, hx: number, hy: number, r: number): ReactNode {
  const fill = hairColor(cast);
  const st = { fill, stroke: ink, strokeWidth: 1.8, strokeLinejoin: "round" as const };
  const d = f.view === "side" ? f.dir : 1;
  switch (cast.hair) {
    case "hijab": {
      // cloth around the head and falling over the shoulders; the face shows through in front
      return <path d={`M${hx - r - 3} ${hy + 2} A${r + 3} ${r + 3} 0 1 1 ${hx + r + 3} ${hy + 2} L${hx + r + 8} ${hy + 1.75 * r} Q${hx} ${hy + 2.05 * r} ${hx - r - 8} ${hy + 1.75 * r} Z`} fill={C.g4} stroke={ink} strokeWidth={1.9} strokeLinejoin="round" />;
    }
    case "afro": {
      // soft cloud outline: lots of small bumps, so it reads as hair rather than a helmet
      const cx = hx - (f.view === "side" ? d * 0.3 * r : 0), cy = hy - 0.28 * r, R = r * 1.45, n = 16;
      let path = "";
      for (let i = 0; i <= n; i++) {
        const a0 = (i / n) * Math.PI * 2, am = ((i - 0.5) / n) * Math.PI * 2;
        const x = cx + Math.cos(a0) * R, y = cy + Math.sin(a0) * R;
        path += i === 0 ? `M${x.toFixed(1)} ${y.toFixed(1)}` : ` Q${(cx + Math.cos(am) * R * 1.13).toFixed(1)} ${(cy + Math.sin(am) * R * 1.13).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      return <path d={path + " Z"} {...st} />;
    }
    case "curly": {
      const bumps = f.view === "side" ? [-1, -0.6, -0.15, 0.3] : [-1, -0.5, 0, 0.5, 1];
      return <g>{bumps.map((k, i) => <circle key={i} cx={hx + k * r * (f.view === "side" ? -d : 1)} cy={hy - 0.75 * r + Math.abs(k) * 0.35 * r} r={r * 0.46} {...st} />)}</g>;
    }
    case "long":
      if (f.view === "side") return <path d={`M${hx - d * 0.15 * r} ${hy} L${hx - d * 0.35 * r} ${hy + 1.45 * r} L${hx - d * 1.15 * r} ${hy + 1.35 * r} L${hx - d * r} ${hy - 0.1 * r} Z`} {...st} />;
      if (f.view === "back") return <path d={`M${hx - r} ${hy} L${hx - r - 1} ${hy + 1.55 * r} H${hx + r + 1} L${hx + r} ${hy} Z`} {...st} />;
      return <path d={`M${hx - r} ${hy - 0.2 * r} Q${hx - r - 2.5} ${hy + 1.1 * r} ${hx - r + 1} ${hy + 1.45 * r} L${hx + r - 1} ${hy + 1.45 * r} Q${hx + r + 2.5} ${hy + 1.1 * r} ${hx + r} ${hy - 0.2 * r} Z`} {...st} />;
    case "ponytail":
      if (f.view !== "side") return null; // from behind it's drawn over the head (hairFront)
      return <path d={`M${hx - d * 0.9 * r} ${hy - 0.35 * r} q${-d * 0.8 * r} ${0.3 * r} ${-d * 0.55 * r} ${1.3 * r}`} fill="none" stroke={ink} strokeWidth={6} strokeLinecap="round" />;
    default:
      return null;
  }
}

/** Hair drawn ON TOP of the head: a cap that stops at the hairline so the eyes stay clear. */
function hairFront(cast: CastMember, f: Figure, hx: number, hy: number, r: number): ReactNode {
  const fill = cast.hair === "buzz" ? C.g5 : hairColor(cast);
  const st = { fill, stroke: ink, strokeWidth: 1.8, strokeLinejoin: "round" as const };
  const R = cast.hair === "afro" ? r + 2.2 : r + 1.2;
  if (cast.hair === "bald" || cast.hair === "hijab") return null;

  if (f.view === "back") {
    return (
      <g>
        <circle cx={hx} cy={hy} r={r} {...st} />
        {cast.hair === "bun" && <circle cx={hx} cy={hy - r - 3} r={r * 0.42} {...st} />}
        {cast.hair === "ponytail" && <path d={`M${hx - 0.22 * r} ${hy + 0.35 * r} Q${hx - 0.3 * r} ${hy + 1.2 * r} ${hx} ${hy + 1.45 * r} Q${hx + 0.3 * r} ${hy + 1.2 * r} ${hx + 0.22 * r} ${hy + 0.35 * r} Z`} {...st} />}
      </g>
    );
  }

  if (f.view === "side") {
    const d = f.dir;
    const sweep = d > 0 ? 0 : 1;
    // front-top of forehead → over the top → back of head → nape → behind the ear → fringe above the eye
    const cap = `M${hx + d * 0.6 * r} ${hy - 0.78 * r} A${R} ${R} 0 0 ${sweep} ${hx - d * R} ${hy - 0.05 * r} L${hx - d * 0.82 * r} ${hy + 0.55 * r} Q${hx - d * 0.2 * r} ${hy + 0.35 * r} ${hx - d * 0.1 * r} ${hy - 0.05 * r} Q${hx + d * 0.2 * r} ${hy - 0.35 * r} ${hx + d * 0.6 * r} ${hy - 0.78 * r} Z`;
    return (
      <g>
        <path d={cap} {...st} {...(cast.hair === "afro" ? { stroke: "none" } : {})} />
        {cast.hair === "bun" && <circle cx={hx - d * 0.78 * r} cy={hy - 0.85 * r} r={r * 0.42} {...st} />}
        {cast.hair === "curly" && [0, 1, 2].map((i) => <circle key={i} cx={hx - d * (0.2 + i * 0.35) * r} cy={hy - (0.95 - i * 0.12) * r} r={r * 0.32} {...st} />)}
      </g>
    );
  }

  // front and three-quarter: shell over the top, fringe edge well above the eyes
  const o = f.angle === "three-quarter" ? -f.dir * 0.18 * r : 0; // part shifts away from the face
  const L = hx - r, Rt = hx + r;
  const fringe = cast.hair === "short"
    ? `Q${hx + o + 0.55 * r} ${hy - 0.25 * r} ${hx + o} ${hy - 0.5 * r} Q${hx + o - 0.35 * r} ${hy - 0.62 * r} ${L} ${hy - 0.08 * r}` // side-swept
    : `Q${hx + o + 0.5 * r} ${hy - 0.62 * r} ${hx + o} ${hy - 0.48 * r} Q${hx + o - 0.5 * r} ${hy - 0.62 * r} ${L} ${hy - 0.08 * r}`;
  const cap = `M${L} ${hy - 0.08 * r} A${R} ${R} 0 0 1 ${Rt} ${hy - 0.08 * r} ${fringe} Z`;
  if (cast.hair === "afro") return <path d={cap} fill={fill} stroke="none" />; // merges into the cloud behind
  if (cast.hair === "curly") {
    const bumps = [-0.7, -0.35, 0, 0.35, 0.7];
    return <g><path d={cap} {...st} />{bumps.map((k, i) => <circle key={i} cx={hx + o + k * r} cy={hy - 0.62 * r - (1 - Math.abs(k)) * 0.18 * r} r={r * 0.24} {...st} />)}</g>;
  }
  return (
    <g>
      <path d={cap} {...st} />
      {cast.hair === "bun" && <circle cx={hx + o * 0.5} cy={hy - r - 3} r={r * 0.42} {...st} />}
    </g>
  );
}

// ------------------------------------------------------------------ faces

/** Comic symbols floating near the head: they carry the mood when the face is small or turned away. */
function emanata(mood: Mood, hx: number, hy: number, r: number, side: number): ReactNode {
  const x = hx + side * (r + 5), y = hy - r * 0.9;
  const s = line(1.8);
  switch (mood) {
    case "confused":
      return <text x={x} y={y + 2} textAnchor="middle" fontFamily="Permanent Marker" fontSize={r * 1.1} fill={ink}>?</text>;
    case "surprised":
      return <path d={`M${hx - 0.7 * r} ${hy - r - 4} l-3 -6 M${hx} ${hy - r - 5} v-7 M${hx + 0.7 * r} ${hy - r - 4} l3 -6`} {...s} />;
    case "stressed":
      return <g>{[0, 1].map((i) => <path key={i} d={`M${x + i * 5 * side} ${y + i * 7} q-2.6 5 0 6.6 q2.6 -1.6 0 -6.6z`} fill={C.paper} stroke={ink} strokeWidth={1.4} />)}</g>;
    case "frustrated": // anger mark
      return <path d={`M${x - 4} ${y - 2} q3 1 4 4 M${x + 4} ${y - 2} q-3 1 -4 4 M${x - 4} ${y + 6} q3 -1 4 -4 M${x + 4} ${y + 6} q-3 -1 -4 -4`} {...s} />;
    case "tired":
      return <text x={x} y={y} fontFamily="Permanent Marker" fontSize={r * 0.7} fill={ink}>z<tspan dx={1} dy={-4} fontSize={r * 0.55}>z</tspan></text>;
    case "excited":
      return <path d={`M${x} ${y - 4} v8 M${x - 4} ${y} h8 M${x + side * 7} ${y + 6} v5 M${x + side * 4.5} ${y + 8.5} h5`} {...line(1.6)} />;
    case "relieved":
      return <path d={`M${x} ${y + 6} q${side * 4} -2 ${side * 7} 0 M${x + side} ${y + 10} q${side * 4} -2 ${side * 7} 0`} {...line(1.4)} />;
    default:
      return null;
  }
}

function frontFace(f: Figure, mood: Mood, hx: number, hy: number, r: number): ReactNode {
  const tq = f.angle === "three-quarter";
  const cx = hx + (tq ? 0.28 * r * f.dir : 0);
  const sp = (tq ? 0.3 : 0.37) * r; // half eye spacing
  const ey = hy + 0.05 * r, by = ey - 0.34 * r, my = hy + 0.5 * r, mw = 0.36 * r;
  const s = line(2);
  const dot = (x: number, big = false) => <ellipse cx={x} cy={ey} rx={big ? 2.4 : 1.5} ry={big ? 2.8 : 2} fill={big ? C.paper : ink} stroke={big ? ink : "none"} strokeWidth={1.8} />;
  let eyes: ReactNode = <>{dot(cx - sp)}{dot(cx + sp)}</>;
  let brows: string | null = null;
  let mouth: ReactNode = <path d={`M${cx - mw * 0.7} ${my} h${mw * 1.4}`} {...s} />;
  switch (mood) {
    case "happy":
      eyes = <path d={`M${cx - sp - 2.4} ${ey + 1} q2.4 -3.4 4.8 0 M${cx + sp - 2.4} ${ey + 1} q2.4 -3.4 4.8 0`} {...s} />;
      mouth = <path d={`M${cx - mw} ${my - 1} q${mw} ${0.55 * r} ${mw * 2} 0`} {...s} />;
      break;
    case "excited":
      brows = `M${cx - sp - 3} ${by - 1.5} q3 -3.5 6 0 M${cx + sp - 3} ${by - 1.5} q3 -3.5 6 0`;
      mouth = <path d={`M${cx - mw * 1.1} ${my - 1.5} q${mw * 1.1} ${0.7 * r} ${mw * 2.2} 0 z`} fill={C.g8} stroke={ink} strokeWidth={1.9} strokeLinejoin="round" />;
      break;
    case "focused":
      brows = `M${cx - sp - 3} ${by + 1.5} l6 1 M${cx + sp + 3} ${by + 1.5} l-6 1`;
      mouth = <path d={`M${cx - mw * 0.5} ${my} h${mw}`} {...s} />;
      break;
    case "confused":
      brows = `M${cx - sp - 3} ${by + 1} l6 0.5 M${cx + sp - 3} ${by - 2} q3 -3.5 6 0`;
      mouth = <path d={`M${cx - mw} ${my} q${mw * 0.5} -3 ${mw} 0 q${mw * 0.5} 3 ${mw} 0`} {...s} />;
      break;
    case "impatient":
      eyes = <>{dot(cx - sp)}{dot(cx + sp)}<path d={`M${cx - sp - 2.8} ${ey - 1} h5.6 M${cx + sp - 2.8} ${ey - 1} h5.6`} {...s} /></>;
      brows = `M${cx - sp - 3} ${by} l6 2 M${cx + sp + 3} ${by} l-6 2`;
      mouth = <path d={`M${cx - mw * 0.2} ${my} h${mw * 1.1}`} {...s} />;
      break;
    case "frustrated":
      brows = `M${cx - sp - 3.5} ${by - 2} l7 4 M${cx + sp + 3.5} ${by - 2} l-7 4`;
      mouth = <path d={`M${cx - mw} ${my + 3} q${mw} ${-0.5 * r} ${mw * 2} 0`} {...s} />;
      break;
    case "stressed":
      brows = `M${cx - sp - 3} ${by + 2} l6 -3 M${cx + sp + 3} ${by + 2} l-6 -3`;
      mouth = <path d={`M${cx - mw} ${my + 1} q${mw * 0.33} -3 ${mw * 0.66} 0 q${mw * 0.33} 3 ${mw * 0.66} 0 q${mw * 0.33} -3 ${mw * 0.66} 0`} {...s} />;
      break;
    case "sad":
      brows = `M${cx - sp - 3} ${by + 2} l6 -3 M${cx + sp + 3} ${by + 2} l-6 -3`;
      mouth = <path d={`M${cx - mw} ${my + 3} q${mw} ${-0.45 * r} ${mw * 2} 0`} {...s} />;
      eyes = <>{dot(cx - sp)}{dot(cx + sp)}<path d={`M${cx + sp} ${ey + 3} q-2 4 0 5.5 q2 -1.5 0 -5.5z`} fill={C.paper} stroke={ink} strokeWidth={1.3} /></>;
      break;
    case "surprised":
      eyes = <>{dot(cx - sp, true)}{dot(cx + sp, true)}</>;
      brows = `M${cx - sp - 3} ${by - 3} q3 -3.5 6 0 M${cx + sp - 3} ${by - 3} q3 -3.5 6 0`;
      mouth = <ellipse cx={cx} cy={my + 1} rx={2.8} ry={3.6} fill={C.g8} stroke={ink} strokeWidth={1.8} />;
      break;
    case "relieved":
      eyes = <path d={`M${cx - sp - 2.4} ${ey - 0.5} q2.4 3 4.8 0 M${cx + sp - 2.4} ${ey - 0.5} q2.4 3 4.8 0`} {...s} />;
      mouth = <path d={`M${cx - mw * 0.8} ${my} q${mw * 0.8} ${0.35 * r} ${mw * 1.6} 0`} {...s} />;
      break;
    case "tired":
      eyes = <path d={`M${cx - sp - 2.6} ${ey} h5.2 M${cx + sp - 2.6} ${ey} h5.2 M${cx - sp - 2} ${ey + 3.2} q2 1.4 4 0 M${cx + sp - 2} ${ey + 3.2} q2 1.4 4 0`} {...line(1.7)} />;
      mouth = <path d={`M${cx - mw * 0.6} ${my + 1} h${mw * 1.2}`} {...s} />;
      break;
  }
  return (
    <g>
      {eyes}
      {brows && <path d={brows} {...line(2.1)} />}
      {mouth}
      {tq && <path d={`M${cx + 0.12 * r * f.dir} ${hy + 0.12 * r} l${0.16 * r * f.dir} ${0.22 * r} l${-0.16 * r * f.dir} ${0.05 * r}`} {...line(1.5)} />}
    </g>
  );
}

function sideFace(f: Figure, mood: Mood, hx: number, hy: number, r: number): ReactNode {
  const d = f.dir;
  const ex = hx + d * 0.48 * r, ey = hy - 0.02 * r;
  const mx = hx + d * 0.66 * r, my = hy + 0.5 * r;
  const s = line(2);
  const eye = mood === "surprised"
    ? <ellipse cx={ex} cy={ey} rx={2.3} ry={2.8} fill={C.paper} stroke={ink} strokeWidth={1.8} />
    : mood === "happy" || mood === "relieved" ? <path d={`M${ex - 2.2} ${ey + (mood === "happy" ? 1 : -0.5)} q2.2 ${mood === "happy" ? -3 : 2.6} 4.4 0`} {...s} />
    : mood === "tired" || mood === "impatient" ? <path d={`M${ex - 2.2} ${ey} h4.4`} {...s} />
    : <ellipse cx={ex} cy={ey} rx={1.5} ry={2} fill={ink} />;
  const brow: Partial<Record<Mood, string>> = {
    frustrated: `M${ex - d * 3} ${ey - 5.5} l${d * 6} 3`,
    impatient: `M${ex - d * 3} ${ey - 5} l${d * 6} 1.5`,
    focused: `M${ex - d * 3} ${ey - 4.5} l${d * 6} 1`,
    stressed: `M${ex - d * 3} ${ey - 3.5} l${d * 6} -2.5`,
    sad: `M${ex - d * 3} ${ey - 3.5} l${d * 6} -2.5`,
    surprised: `M${ex - d * 3} ${ey - 6.5} q${d * 3} -3 ${d * 6} 0`,
    excited: `M${ex - d * 3} ${ey - 6} q${d * 3} -3 ${d * 6} 0`,
    confused: `M${ex - d * 3} ${ey - 6} q${d * 3} -3 ${d * 6} 0`,
  };
  const w = 0.3 * r;
  const mouths: Partial<Record<Mood, ReactNode>> = {
    happy: <path d={`M${mx - d * w} ${my - 1} q${d * w * 0.6} ${w} ${d * w * 1.2} -1`} {...s} />,
    excited: <path d={`M${mx - d * w} ${my - 1.5} q${d * w * 0.6} ${w * 1.4} ${d * w * 1.2} -1 z`} fill={C.g8} stroke={ink} strokeWidth={1.8} />,
    relieved: <path d={`M${mx - d * w} ${my} q${d * w * 0.6} ${w * 0.6} ${d * w * 1.1} 0`} {...s} />,
    sad: <path d={`M${mx - d * w} ${my + 2} q${d * w * 0.6} ${-w} ${d * w * 1.2} 1`} {...s} />,
    frustrated: <path d={`M${mx - d * w} ${my + 2} q${d * w * 0.6} ${-w} ${d * w * 1.2} 1`} {...s} />,
    stressed: <path d={`M${mx - d * w} ${my + 1} q${d * w * 0.3} -2.5 ${d * w * 0.6} 0 q${d * w * 0.3} 2.5 ${d * w * 0.6} 0`} {...s} />,
    surprised: <ellipse cx={mx} cy={my + 1} rx={2.2} ry={3} fill={C.g8} stroke={ink} strokeWidth={1.7} />,
    confused: <path d={`M${mx - d * w} ${my} q${d * w * 0.3} -2.5 ${d * w * 0.6} 0 q${d * w * 0.3} 2.5 ${d * w * 0.6} 0`} {...s} />,
  };
  return (
    <g>
      {eye}
      {brow[mood] && <path d={brow[mood]} {...line(2.1)} />}
      <path d={`M${hx + d * (r - 0.6)} ${hy - 0.2 * r} l${d * 0.3 * r} ${0.3 * r} l${-d * 0.3 * r} ${0.12 * r}`} {...line(1.8)} />
      {mouths[mood] ?? <path d={`M${mx - d * w} ${my} h${d * w * 1.1}`} {...s} />}
      {mood === "sad" && <path d={`M${ex} ${ey + 3} q-2 4 0 5.5 q2 -1.5 0 -5.5z`} fill={C.paper} stroke={ink} strokeWidth={1.3} />}
    </g>
  );
}

/** Head circle (or a face framed by a hijab), features, facial hair, hair, glasses, headphones, emanata. */
export function HeadFront({ f, cast, mood, hx, hy, r, skin }: { f: Figure; cast: CastMember; mood: Mood; hx: number; hy: number; r: number; skin: string }) {
  const acc = new Set(cast.accessories ?? []);
  const side = f.view === "side";
  const back = f.view === "back";
  const hijab = cast.hair === "hijab";
  const d = side || f.angle === "three-quarter" ? f.dir : 1;
  const fx = side ? hx + f.dir * 0.28 * r : f.angle === "three-quarter" ? hx + f.dir * 0.12 * r : hx;
  return (
    <g>
      {hijab && !back
        ? <ellipse cx={fx} cy={hy + 0.12 * r} rx={(side ? 0.62 : 0.8) * r} ry={0.9 * r} fill={skin} stroke={ink} strokeWidth={1.8} />
        : cast.hair === "afro" && !back
          ? <g><circle cx={hx} cy={hy} r={r} fill={skin} /><path d={`M${hx - r * 0.97} ${hy + r * 0.25} A${r} ${r} 0 0 0 ${hx + r * 0.97} ${hy + r * 0.25}`} {...line(2.1)} /></g>
          : !hijab && <circle cx={hx} cy={hy} r={r} fill={skin} stroke={ink} strokeWidth={2.1} />}
      {acc.has("beard") && !back && (side
        ? <path d={`M${hx - f.dir * 0.1 * r} ${hy + 0.35 * r} Q${hx + f.dir * 0.4 * r} ${hy + 1.2 * r} ${hx + f.dir * 0.85 * r} ${hy + 0.55 * r} Q${hx + f.dir * 0.4 * r} ${hy + 0.72 * r} ${hx - f.dir * 0.1 * r} ${hy + 0.35 * r} Z`} fill={hairColor(cast)} stroke={ink} strokeWidth={1.4} />
        : <path d={`M${hx - r + 1.5} ${hy + 0.25 * r} Q${hx} ${hy + r + 5} ${hx + r - 1.5} ${hy + 0.25 * r} Q${hx + 0.4 * r} ${hy + 0.85 * r} ${hx} ${hy + 0.85 * r} Q${hx - 0.4 * r} ${hy + 0.85 * r} ${hx - r + 1.5} ${hy + 0.25 * r} Z`} fill={hairColor(cast)} stroke={ink} strokeWidth={1.4} />)}
      {!back && (side ? sideFace(f, mood, hx, hy, r) : frontFace(f, mood, hx, hy, r))}
      {hairFront(cast, f, hx, hy, r)}
      {hijab && !back && <path d={`M${fx - (side ? 0.62 : 0.8) * r} ${hy - 0.05 * r} Q${fx} ${hy - 1.05 * r} ${fx + (side ? 0.62 : 0.8) * r} ${hy - 0.05 * r}`} {...line(1.4)} />}
      {acc.has("glasses") && !back && (side
        ? <g {...line(1.6)}><circle cx={hx + f.dir * 0.48 * r} cy={hy - 0.02 * r} r={0.3 * r} /><path d={`M${hx + f.dir * 0.18 * r} ${hy - 0.1 * r} h${-f.dir * 0.55 * r}`} /></g>
        : <g {...line(1.6)}>{[-1, 1].map((k) => <circle key={k} cx={hx + (f.angle === "three-quarter" ? 0.28 * r * f.dir : 0) + k * (f.angle === "three-quarter" ? 0.3 : 0.37) * r} cy={hy + 0.05 * r} r={0.3 * r} />)}</g>)}
      {acc.has("headphones") && <g><path d={`M${hx - r - 1} ${hy} Q${hx} ${hy - r - 10} ${hx + r + 1} ${hy}`} fill="none" stroke={ink} strokeWidth={2.4} /><rect x={hx - r - 4} y={hy - 4} width={5} height={9} rx={2} fill={C.g7} stroke={ink} strokeWidth={1.3} /><rect x={hx + r - 1} y={hy - 4} width={5} height={9} rx={2} fill={C.g7} stroke={ink} strokeWidth={1.3} /></g>}
      <Hat cast={cast} f={f} hx={hx} hy={hy} r={r} />
      {emanata(mood, hx, hy, r, back ? 1 : d)}
    </g>
  );
}
