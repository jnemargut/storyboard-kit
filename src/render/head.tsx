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
      // a rounded crown that stops at the ears (not a mane under the chin), with soft scallops only along the top
      const side = f.view === "side";
      const cx = hx - (side ? d * 0.28 * r : 0), cy = hy - 0.38 * r;
      const rx = r * (side ? 1.22 : 1.34), ry = r * 1.18;
      const a0 = (158 * Math.PI) / 180, a1 = (382 * Math.PI) / 180, n = 11;
      const pt = (a: number, k = 1) => [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k].map((v) => v.toFixed(1)).join(" ");
      let path = `M${pt(a0)}`;
      for (let i = 1; i <= n; i++) {
        const a = a0 + ((a1 - a0) * i) / n, am = a0 + ((a1 - a0) * (i - 0.5)) / n;
        path += ` Q${pt(am, 1.09)} ${pt(a)}`;
      }
      // tuck back in under the crown; the face covers this part
      path += ` Q${cx + 0.2 * rx} ${hy + 0.55 * r} ${cx} ${hy + 0.45 * r} Q${cx - 0.2 * rx} ${hy + 0.55 * r} ${pt(a0)} Z`;
      return <path d={path} {...st} />;
    }
    case "curly": {
      // curls sit on the crown; the outermost stay above the ears so they don't read as earmuffs or buns
      const bumps = f.view === "side" ? [-1, -0.6, -0.15, 0.3] : [-0.85, -0.42, 0, 0.42, 0.85];
      const side = f.view === "side";
      return <g>{bumps.map((k, i) => <circle key={i} cx={hx + k * r * (side ? -d : 1)} cy={hy - (side ? 0.75 : 0.8) * r + Math.abs(k) * (side ? 0.35 : 0.3) * r} r={r * (side ? 0.46 : 0.42)} {...st} />)}</g>;
    }
    case "long":
      if (f.view === "side") return <path d={`M${hx - d * 0.15 * r} ${hy} L${hx - d * 0.35 * r} ${hy + 1.45 * r} L${hx - d * 1.15 * r} ${hy + 1.35 * r} L${hx - d * r} ${hy - 0.1 * r} Z`} {...st} />;
      if (f.view === "back") return <path d={`M${hx - r} ${hy} L${hx - r - 1} ${hy + 1.55 * r} H${hx + r + 1} L${hx + r} ${hy} Z`} {...st} />;
      return <path d={`M${hx - r} ${hy - 0.2 * r} Q${hx - r - 2.5} ${hy + 1.1 * r} ${hx - r + 1} ${hy + 1.45 * r} L${hx + r - 1} ${hy + 1.45 * r} Q${hx + r + 2.5} ${hy + 1.1 * r} ${hx + r} ${hy - 0.2 * r} Z`} {...st} />;
    case "ponytail":
      if (f.view === "front" && f.angle === "three-quarter") {
        // turned a little: the tail peeks out behind the head on the far side
        const k = -f.dir;
        return <path d={`M${hx + k * 0.7 * r} ${hy - 0.45 * r} Q${hx + k * 1.45 * r} ${hy + 0.1 * r} ${hx + k * 1.1 * r} ${hy + 1.0 * r} Q${hx + k * 1.0 * r} ${hy + 0.2 * r} ${hx + k * 0.6 * r} ${hy - 0.1 * r} Z`} {...st} />;
      }
      if (f.view !== "side") return null; // from behind it's drawn over the head (hairFront)
      return <path d={`M${hx - d * 0.9 * r} ${hy - 0.35 * r} q${-d * 0.8 * r} ${0.3 * r} ${-d * 0.55 * r} ${1.3 * r}`} fill="none" stroke={ink} strokeWidth={6} strokeLinecap="round" />;
    default:
      return null;
  }
}

/** Hair drawn ON TOP of the head: a cap that stops at the hairline so the eyes stay clear. */
function hairFront(cast: CastMember, f: Figure, hx: number, hy: number, r: number): ReactNode {
  const fill = hairColor(cast);
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
    // hairline: forehead → temple → sideburn → behind the ear → nape, so the face and ear stay clear
    const cap = `M${hx + d * 0.62 * r} ${hy - 0.8 * r} A${R} ${R} 0 0 ${sweep} ${hx - d * R} ${hy + 0.05 * r} L${hx - d * 0.78 * r} ${hy + 0.58 * r} Q${hx - d * 0.42 * r} ${hy + 0.32 * r} ${hx - d * 0.34 * r} ${hy + 0.02 * r} L${hx - d * 0.1 * r} ${hy - 0.38 * r} Q${hx + d * 0.22 * r} ${hy - 0.52 * r} ${hx + d * 0.62 * r} ${hy - 0.8 * r} Z`;
    const ear = !["long", "afro"].includes(cast.hair ?? "short") && <path d={`M${hx - d * 0.12 * r} ${hy - 0.12 * r} q${-d * 0.3 * r} ${-0.04 * r} ${-d * 0.28 * r} ${0.22 * r} q${d * 0.02 * r} ${0.22 * r} ${d * 0.24 * r} ${0.2 * r}`} fill="none" stroke={ink} strokeWidth={1.5} strokeLinecap="round" />;
    return (
      <g>
        <path d={cap} {...st} {...(cast.hair === "afro" ? { stroke: "none" } : {})} />
        {ear}
        {cast.hair === "bun" && <circle cx={hx - d * 0.78 * r} cy={hy - 0.85 * r} r={r * 0.42} {...st} />}
        {cast.hair === "curly" && [0, 1, 2].map((i) => <circle key={i} cx={hx - d * (0.2 + i * 0.35) * r} cy={hy - (0.95 - i * 0.12) * r} r={r * 0.32} {...st} />)}
      </g>
    );
  }

  // front and three-quarter: shell over the top, fringe edge well above the eyes
  const o = f.angle === "three-quarter" ? -f.dir * 0.18 * r : 0; // part shifts away from the face
  const L = hx - r, Rt = hx + r;
  // short hair stops at the temples so the sides of the face show; longer styles come down past the ears
  const sideY = cast.hair === "short" || cast.hair === "buzz" ? hy - 0.2 * r : hy - 0.08 * r;
  // the cap hugs the head: an arc around the head's own centre, from temple to temple
  const sx = Math.sqrt(Math.max(0, R * R - (hy - sideY) ** 2));
  const fringe = cast.hair === "short"
    ? `Q${hx + o + 0.4 * r} ${hy - 0.66 * r} ${hx + o - 0.08 * r} ${hy - 0.6 * r} Q${hx + o - 0.55 * r} ${hy - 0.56 * r} ${hx - sx} ${sideY}` // soft side part
    : `Q${hx + o + 0.5 * r} ${hy - 0.62 * r} ${hx + o} ${hy - 0.48 * r} Q${hx + o - 0.5 * r} ${hy - 0.62 * r} ${L} ${hy - 0.08 * r}`;
  const cap = `M${hx - sx} ${sideY} A${R} ${R} 0 0 1 ${hx + sx} ${sideY} ${fringe} Z`;
  // the afro's cap is a half-circle over the whole crown, so no forehead band shows; it merges into the cloud behind
  if (cast.hair === "afro") {
    const k = r + 1.5; // centred on the face and a touch bigger, so no sliver of forehead shows above it
    return <path d={`M${hx - k} ${hy} A${k} ${k} 0 0 1 ${hx + k} ${hy} L${Rt} ${hy - 0.08 * r} ${fringe} Z`} fill={fill} stroke="none" />;
  }
  if (cast.hair === "curly") {
    const bumps = [-0.7, -0.35, 0, 0.35, 0.7];
    return <g><path d={cap} {...st} />{bumps.map((k, i) => <circle key={i} cx={hx + o + k * r} cy={hy - 0.62 * r - (1 - Math.abs(k)) * 0.18 * r} r={r * 0.24} {...st} />)}</g>;
  }
  return (
    <g>
      <path d={cap} {...st} {...(sideY !== hy - 0.08 * r ? { strokeWidth: 1.3 } : {})} />
      {cast.hair === "bun" && <circle cx={hx + o * 0.5} cy={hy - r - 3} r={r * 0.42} {...st} />}
    </g>
  );
}

// ------------------------------------------------------------------ faces

/** Comic symbols floating near the head: they carry the mood when the face is small or turned away. */
/**
 * How far hair, hats and headphones reach past the bare head (as multiples of r): `side` horizontally,
 * `top` above the centre. Mood marks go outside this so they never sit on a bun, a brim or a chef's hat.
 */
export function headExtent(cast: CastMember, f: Figure): { side: number; top: number } {
  const sideView = f.view === "side";
  let side = 1, top = 1;
  const grow = (sd: number, tp: number) => { side = Math.max(side, sd); top = Math.max(top, tp); };
  switch (cast.hair) {
    case "afro": grow(1.42, 1.62); break;
    case "curly": grow(sideView ? 1.2 : 1.5, 1.25); break;
    case "bun": grow(1.1, 1.9); break;
    case "long": grow(1.2, 1.1); break;
    case "hijab": grow(1.25, 1.25); break;
  }
  if ((cast.accessories ?? []).includes("headphones")) grow(1.35, 1.8);
  const lift = cast.hair === "afro" ? 0.35 : cast.hair === "bun" || cast.hair === "curly" ? 0.12 : 0;
  switch (cast.hat) {
    case "cap": grow(sideView ? 2 : 1.15, 1.15 + lift); break;
    case "beanie": grow(1.15, 1.6 + lift); break;
    case "hard-hat": grow(sideView ? 2.05 : 1.35, 1.35 + lift); break;
    case "chef-hat": grow(1.3, 2.55 + lift); break;
    case "uniform-cap": grow(sideView ? 1.55 : 1.25, 1.45 + lift); break;
    case "sun-hat": grow(1.9, 1.4 + lift); break;
    case "surgical-cap": grow(1.1, 1.25 + lift); break;
  }
  return { side, top };
}

function emanata(mood: Mood, hx: number, hy: number, r: number, side: number, ext = { side: 1, top: 1 }): ReactNode {
  const x = hx + side * (r * ext.side + 5), y = hy - r * 0.9;
  const s = line(1.8);
  switch (mood) {
    case "confused":
      return <text x={x} y={y + 2} textAnchor="middle" fontFamily="Permanent Marker" fontSize={r * 1.1} fill={ink}>?</text>;
    case "surprised":
      // three little burst strokes beside the head (not above it, where close-ups crop them)
      return <path d={`M${x - side * 2} ${y - 2} l${side * 4} -6 M${x + side * 1} ${y + 5} h${side * 8} M${x - side * 1} ${y + 12} l${side * 5} 5`} {...s} />;
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

/** Sideburns running into a full chin that frames the mouth, plus a moustache. Drawn under the face features. */
function Beard({ f, hx, hy, r, fill }: { f: Figure; hx: number; hy: number; r: number; fill: string }) {
  // no outline of its own: an inked edge all round turns a beard into a chin strap; the jaw line underneath is enough
  const st = { fill, stroke: "none" };
  const jaw = { fill: "none", stroke: ink, strokeWidth: 2, strokeLinecap: "round" as const };
  if (f.view === "side") {
    const d = f.dir, mx = hx + d * 0.66 * r;
    return (
      <g>
        <path d={`M${hx - d * 0.3 * r} ${hy + 0.3 * r} Q${hx - d * 0.2 * r} ${hy + 0.9 * r} ${hx + d * 0.45 * r} ${hy + 1.1 * r} Q${hx + d * 0.8 * r} ${hy + 1.04 * r} ${hx + d * 0.84 * r} ${hy + 0.72 * r} Q${hx + d * 0.55 * r} ${hy + 0.8 * r} ${hx + d * 0.42 * r} ${hy + 0.58 * r} Q${hx + d * 0.1 * r} ${hy + 0.5 * r} ${hx - d * 0.08 * r} ${hy + 0.3 * r} Z`} {...st} />
        <path d={`M${hx - d * 0.3 * r} ${hy + 0.3 * r} Q${hx - d * 0.2 * r} ${hy + 0.9 * r} ${hx + d * 0.45 * r} ${hy + 1.1 * r} Q${hx + d * 0.8 * r} ${hy + 1.04 * r} ${hx + d * 0.84 * r} ${hy + 0.72 * r}`} {...jaw} />
        <path d={`M${mx - d * 0.2 * r} ${hy + 0.4 * r} Q${mx} ${hy + 0.28 * r} ${mx + d * 0.18 * r} ${hy + 0.4 * r} Q${mx} ${hy + 0.36 * r} ${mx - d * 0.2 * r} ${hy + 0.4 * r} Z`} {...st} />
      </g>
    );
  }
  const o = f.angle === "three-quarter" ? 0.22 * r * f.dir : 0; // the mouth shifts toward the facing side
  const cx = hx + o;
  return (
    <g>
      <path d={`M${hx - 0.93 * r} ${hy + 0.3 * r} Q${cx - 0.6 * r} ${hy + 0.7 * r} ${cx - 0.32 * r} ${hy + 0.73 * r} Q${cx} ${hy + 0.88 * r} ${cx + 0.32 * r} ${hy + 0.73 * r} Q${cx + 0.6 * r} ${hy + 0.7 * r} ${hx + 0.93 * r} ${hy + 0.3 * r} Q${hx + r + 0.5} ${hy + 1.02 * r} ${cx} ${hy + 1.22 * r} Q${hx - r - 0.5} ${hy + 1.02 * r} ${hx - 0.93 * r} ${hy + 0.3 * r} Z`} {...st} />
      <path d={`M${cx - 0.34 * r} ${hy + 0.44 * r} Q${cx} ${hy + 0.22 * r} ${cx + 0.34 * r} ${hy + 0.44 * r} Q${cx} ${hy + 0.36 * r} ${cx - 0.34 * r} ${hy + 0.44 * r} Z`} {...st} />
      <path d={`M${hx - 0.93 * r} ${hy + 0.3 * r} Q${hx - r - 0.5} ${hy + 1.02 * r} ${cx} ${hy + 1.22 * r} Q${hx + r + 0.5} ${hy + 1.02 * r} ${hx + 0.93 * r} ${hy + 0.3 * r}`} {...jaw} />
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
      {acc.has("beard") && !back && <Beard f={f} hx={hx} hy={hy} r={r} fill={hairColor(cast)} />}
      {!back && (side ? sideFace(f, mood, hx, hy, r) : frontFace(f, mood, hx, hy, r))}
      {hairFront(cast, f, hx, hy, r)}
      {hijab && !back && <path d={`M${fx - (side ? 0.62 : 0.8) * r} ${hy - 0.05 * r} Q${fx} ${hy - 1.05 * r} ${fx + (side ? 0.62 : 0.8) * r} ${hy - 0.05 * r}`} {...line(1.4)} />}
      {acc.has("glasses") && !back && (side
        ? <g {...line(1.6)}><circle cx={hx + f.dir * 0.48 * r} cy={hy - 0.02 * r} r={0.3 * r} /><path d={`M${hx + f.dir * 0.18 * r} ${hy - 0.1 * r} h${-f.dir * 0.55 * r}`} /></g>
        : <g {...line(1.6)}>{[-1, 1].map((k) => <circle key={k} cx={hx + (f.angle === "three-quarter" ? 0.28 * r * f.dir : 0) + k * (f.angle === "three-quarter" ? 0.3 : 0.37) * r} cy={hy + 0.05 * r} r={0.3 * r} />)}</g>)}
      {acc.has("headphones") && <g><path d={`M${hx - r - 1} ${hy} Q${hx} ${hy - r - 10} ${hx + r + 1} ${hy}`} fill="none" stroke={ink} strokeWidth={2.4} /><rect x={hx - r - 4} y={hy - 4} width={5} height={9} rx={2} fill={C.g7} stroke={ink} strokeWidth={1.3} /><rect x={hx + r - 1} y={hy - 4} width={5} height={9} rx={2} fill={C.g7} stroke={ink} strokeWidth={1.3} /></g>}
      <Hat cast={cast} f={f} hx={hx} hy={hy} r={r} />
      {emanata(mood, hx, hy, r, back ? 1 : d, headExtent(cast, f))}
    </g>
  );
}
