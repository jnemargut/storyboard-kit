import type { ReactNode } from "react";
import type { CastMember } from "../types";
import type { Mood } from "../vocab";
import type { Figure, Pt } from "./rig";
import { C, OFFSET, OUTFIT_FILL, SKIN } from "./tokens";
import { HeadFront, hairBack } from "./head";
import { OutfitDetail } from "./outfits";

const ink = C.ink;
const ln = (a: Pt, b: Pt, w: number, color: string, key?: string) => (
  <line key={key} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={w} strokeLinecap="round" />
);
/** Ink outline + inner marker color: a limb. */
const limb = (a: Pt, b: Pt, outer: number, fill: string, key: string) => (
  <g key={key}>{ln(a, b, outer, ink)}{ln(a, b, outer - 3.6, fill)}</g>
);
const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** One tapered stretch of a limb, as a four-cornered shape: `wa` wide at a, `wb` wide at b. */
function taper(a: Pt, b: Pt, wa: number, wb: number): string {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const p = (q: Pt, w: number, k: number) => `${(q[0] + nx * w * k).toFixed(2)} ${(q[1] + ny * w * k).toFixed(2)}`;
  return `M${p(a, wa, 0.5)} L${p(b, wb, 0.5)} L${p(b, wb, -0.5)} L${p(a, wa, -0.5)} Z`;
}

/**
 * A limb with shape: thicker where it leaves the body, slimmer at the wrist or ankle, bending at each point.
 * Inked as one outline (all the ink first, then the fills on top), so no line crosses a knee or an elbow.
 */
function chain(pts: Pt[], widths: number[], fills: string[], key: string, t = 1.15) {
  const segs = pts.slice(0, -1).map((p, i) => ({ d: taper(p, pts[i + 1], widths[i], widths[i + 1]), fill: fills[Math.min(i, fills.length - 1)] }));
  return (
    <g key={key}>
      {segs.map((sg, i) => <path key={`k${i}`} d={sg.d} fill={ink} stroke={ink} strokeWidth={t * 2} strokeLinejoin="round" />)}
      {pts.map((p, i) => <circle key={`c${i}`} cx={p[0]} cy={p[1]} r={widths[i] / 2 + t} fill={ink} />)}
      {segs.map((sg, i) => <path key={`f${i}`} d={sg.d} fill={sg.fill} />)}
      {pts.map((p, i) => <circle key={`j${i}`} cx={p[0]} cy={p[1]} r={widths[i] / 2} fill={fills[Math.min(Math.max(i - 1, 0), fills.length - 1)]} />)}
    </g>
  );
}

export interface CharacterProps {
  f: Figure;
  cast: CastMember;
  mood: Mood;
  held?: ReactNode;
  /** Draw a chair under someone seated where the scene has no seat. */
  chair?: boolean;
  /** Draw the held device over both arms (a laptop lid seen from behind hides the typing hands). */
  heldFront?: boolean;
  /** Draw the held device behind the body (seen from behind, held in front of them). */
  heldBehind?: boolean;
  /** Skip one arm (e.g. over-the-shoulder shots redraw it reaching for the device). */
  hideArm?: "left" | "right";
}

/** Draws a character in local space (feet at 0,0). */
export function Character({ f, cast, mood, held, chair, hideArm, heldFront, heldBehind }: CharacterProps) {
  const j = { ...f.j };
  const skin = SKIN[cast.skin ?? "tone-2"];
  const outfit = cast.outfit ?? "jacket";
  const top = OUTFIT_FILL[outfit] ?? C.g4;
  // trousers are the darkest thing on a person, so the top and the face stand out above them
  const pants = outfit === "suit" || outfit === "uniform" ? "#2e3035" : outfit === "scrubs" ? C.g2 : outfit === "overalls" ? C.g5 : C.g8;
  const acc = new Set(cast.accessories ?? []);
  const shortSleeves = ["tee", "scrubs", "dress", "polo"].includes(outfit);
  const sleeveless = outfit === "athletic";
  // coats that hang to the knee, drawn like a skirt over the thighs
  const longCoat = outfit === "lab-coat" || outfit === "coat";
  const [hx, hy] = j.head;
  const r = f.headR;
  const side = f.view === "side";
  const w = f.torsoW;

  const legs: ReactNode[] = [];
  const lw = Math.min(w, 1.15);
  const legFill = outfit === "dress" ? skin : pants;
  const shin = outfit === "dress" || outfit === "athletic" ? skin : pants;
  // trousers taper to the ankle and stop just short of it, so a little sock or skin shows above the shoe
  const leg = (hip: Pt, kn: Pt, ft: Pt, k: string) => {
    const ankle: Pt = [ft[0], ft[1] - 5];
    const cuff = lerp(kn, ankle, 0.84);
    return shin === skin
      ? chain([hip, kn, ankle], [8.6 * lw, 6.8 * lw, 4], [legFill, skin], k)
      : <g key={k}>{chain([cuff, ankle], [3.6, 3.4], [skin], `${k}a`, 1)}{chain([hip, kn, cuff], [8.6 * lw, 7 * lw, 5.6 * lw], [pants], `${k}t`)}</g>;
  };
  legs.push(leg(j.hipL, j.knL, j.ftL, "ll"), leg(j.hipR, j.knR, j.ftR, "lr"));
  // a sneaker: white with a sole, pointing where they face from the side, toes out a little from the front
  const shoe = (p: Pt, k: string, out: number) => {
    const dirX = side ? f.dir : out * 0.35;
    const x0 = p[0] - (side ? 4.2 * f.dir : 4.8), len = side ? 13.5 : 9.6, toe = side ? f.dir : 1;
    const x1 = side ? x0 + len * toe : x0 + len;
    const [a, b] = [Math.min(x0, x1), Math.max(x0, x1)];
    const tx = dirX * 1.2;
    return (
      <g key={k}>
        <path d={`M${a + 0.6} ${p[1] - 0.4} Q${a - 0.5 + (tx < 0 ? tx : 0)} ${p[1] - 6.6} ${a + 3} ${p[1] - 6.4} L${b - 3.6} ${p[1] - 5.2} Q${b + 1 + (tx > 0 ? tx : 0)} ${p[1] - 4} ${b} ${p[1] - 0.4} Z`} fill={C.paper} stroke={ink} strokeWidth={1.7} strokeLinejoin="round" />
        <path d={`M${a + 0.4} ${p[1] - 0.2} H${b}`} stroke={ink} strokeWidth={2.2} strokeLinecap="round" />
      </g>
    );
  };

  // torso
  const neck = j.neck;
  // the top as a garment, not a box: shoulders that slope from the neck, a soft side seam, a curved hem
  let torso: string;
  const scoop = f.view === "back" ? 6 : 7.5;
  if (side) {
    const tw = 9 * w, d = f.dir;
    const [sx, sy] = j.shR; const [px, py] = j.hipR;
    const belly = cast.body === "plus" ? 1.5 : 1.02;
    torso = `M${sx - d * tw * 0.72} ${sy + 1} Q${sx - d * tw * 0.15} ${sy - 6.5} ${sx + d * tw * 0.86} ${sy + 0.5} C${sx + d * tw * 1.28} ${sy + 13} ${px + d * tw * belly} ${py - 9} ${px + d * tw * 0.94} ${py + 5.5} Q${px} ${py + 8} ${px - d * tw * 0.96} ${py + 5} C${px - d * tw * 1.14} ${py - 12} ${sx - d * tw * 1.18} ${sy + 13} ${sx - d * tw * 0.72} ${sy + 1} Z`;
  } else {
    // screen-left/right, not body-left/right: seen from behind the sides swap, and the outline must not fold over
    const [sl, sr] = j.shL[0] <= j.shR[0] ? [j.shL, j.shR] : [j.shR, j.shL];
    const [hl, hr] = j.hipL[0] <= j.hipR[0] ? [j.hipL, j.hipR] : [j.hipR, j.hipL];
    const [lx, ly] = sl; const [rx, ry] = sr;
    const belly = cast.body === "plus" ? 5 : 0;
    const hy2 = Math.max(hl[1], hr[1]);
    torso = `M${neck[0] - 4.6} ${neck[1] + 3.2} Q${lx + 1} ${ly - 4} ${lx - 2.6} ${ly + 1.5} C${lx - 4.6} ${ly + 13} ${hl[0] - 7.4 - belly} ${hy2 - 14} ${hl[0] - 7} ${hy2 + 5} Q${(hl[0] + hr[0]) / 2} ${hy2 + 8.5} ${hr[0] + 7} ${hy2 + 5} C${hr[0] + 7.4 + belly} ${hy2 - 14} ${rx + 4.6} ${ry + 13} ${rx + 2.6} ${ry + 1.5} Q${rx - 1} ${ry - 4} ${neck[0] + 4.6} ${neck[1] + 3.2} Q${neck[0]} ${neck[1] + scoop} ${neck[0] - 4.6} ${neck[1] + 3.2} Z`;
  }
  const skirt = outfit === "dress" || longCoat
    ? `M${Math.min(j.hipL[0], j.hipR[0]) - 7} ${j.hipL[1]} L${Math.max(j.hipL[0], j.hipR[0]) + 7} ${j.hipR[1]} L${Math.max(j.knL[0], j.knR[0]) + 10} ${Math.max(j.knL[1], j.knR[1]) + 2} L${Math.min(j.knL[0], j.knR[0]) - 10} ${Math.max(j.knL[1], j.knR[1]) + 2} Z`
    : null;

  // an arm with shape: a sleeve that narrows to the wrist (or stops above the elbow), and a soft mitten of a hand
  const arm = (s: Pt, e: Pt, h: Pt, k: string) => {
    const wrist = lerp(e, h, 0.86);
    const ang = (Math.atan2(h[1] - e[1], h[0] - e[0]) * 180) / Math.PI;
    const hem = lerp(s, e, 0.62);
    return (
      <g key={k}>
        {sleeveless ? chain([s, e, wrist], [5.2, 4.4, 3.4], [skin], `${k}s`)
          : shortSleeves ? <>{chain([hem, e, wrist], [4.6, 4.2, 3.4], [skin], `${k}s`)}{chain([s, hem], [6, 5.6], [top], `${k}h`)}</>
          : chain([s, e, wrist], [6, 5, 4.2], [top], `${k}s`)}
        <ellipse cx={h[0]} cy={h[1]} rx={3.7} ry={3} transform={`rotate(${ang} ${h[0]} ${h[1]})`} fill={skin} stroke={ink} strokeWidth={1.5} />
      </g>
    );
  };
  // draw the far arm first
  const farFirst = side || f.view === "back";
  // seen from the side, an arm raised above the shoulder (waving, phone to the ear) passes in front of the face
  const nearArmOverHead = side && j.hdR[1] < j.shR[1] - 4;
  // an arm hanging at the side sits a little out from the body, so it shows as a sleeve beside it
  const out = (pt: Pt, sh: Pt, k: number): Pt => [pt[0] + Math.sign(sh[0] || 1) * k, pt[1]];
  const hangsAt = (sh: Pt, el: Pt, hd: Pt) => !side && Math.abs(el[0]) >= Math.abs(sh[0]) - 0.5 && Math.abs(hd[0]) >= Math.abs(sh[0]) - 3 && hd[1] > sh[1] + 12;
  // from behind, an arm whose hand is in front of the body (crossed, holding something) just reads as hanging at the side
  const hipY = Math.max(j.hipL[1], j.hipR[1]);
  const inFront = (hd: Pt, sh: Pt) => f.view === "back" && Math.abs(hd[0]) < Math.abs(sh[0]) + 1 && hd[1] > sh[1] && hd[1] < hipY + 6;
  const len = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const down = (sh: Pt, el: Pt, hd: Pt): [Pt, Pt] => [[sh[0] + Math.sign(sh[0] || 1) * 3, sh[1] + len(sh, el)], [sh[0] + Math.sign(sh[0] || 1) * 4, Math.min(sh[1] + len(sh, el) + len(el, hd), hipY + 4)]];
  if (inFront(j.hdL, j.shL)) [j.elL, j.hdL] = down(j.shL, j.elL, j.hdL);
  if (inFront(j.hdR, j.shR)) [j.elR, j.hdR] = down(j.shR, j.elR, j.hdR);
  const hangL = hangsAt(j.shL, j.elL, j.hdL), hangR = hangsAt(j.shR, j.elR, j.hdR);
  const armL = hideArm === "left" ? null : hangL ? arm(out(j.shL, j.shL, 1.2), out(j.elL, j.shL, 2.6), out(j.hdL, j.shL, 2.8), "al") : arm(j.shL, j.elL, j.hdL, "al");
  const armR = hideArm === "right" ? null : hangR ? arm(out(j.shR, j.shR, 1.2), out(j.elR, j.shR, 2.6), out(j.hdR, j.shR, 2.8), "ar") : arm(j.shR, j.elR, j.hdR, "ar");

  const seatX = (j.hipL[0] + j.hipR[0]) / 2 + (side ? -2 * f.dir : 0);
  // clicking anywhere within a person's outline picks them, the gaps between limbs included
  const xs = [j.head[0] - r, j.head[0] + r, ...[j.shL, j.shR, j.elL, j.elR, j.hdL, j.hdR, j.knL, j.knR, j.ftL, j.ftR].map((q) => q[0])];
  const hitX = Math.min(...xs) - 3, hitW = Math.max(...xs) + 3 - hitX, hitY = Math.min(hy - r, j.hdL[1], j.hdR[1]) - 2;
  return (
    <g>
      <rect x={hitX} y={hitY} width={hitW} height={-hitY} fill="transparent" />
      {chair && !acc.has("wheelchair") && (() => {
        // a plain chair: backrest behind the back, seat under the thighs, legs to the floor
        const d = side ? f.dir : 1, back = seatX - d * 15, front = seatX + d * (side ? 19 : 15), top = hipY + 3;
        if (!side) {
          // from the front: the backrest shows behind the shoulders, the seat and four legs below
          return (
            <g>
              <path d={`M${seatX - 17} ${top} V${top - 46} q0 -5 5 -5 h24 q5 0 5 5 V${top} Z`} fill={C.g4} stroke={ink} strokeWidth={1.8} strokeLinejoin="round" />
              <path d={`M${seatX - 19} ${top} h38 v6 h-38 Z`} fill={C.g4} stroke={ink} strokeWidth={1.8} strokeLinejoin="round" />
              <path d={`M${seatX - 16} ${top + 6} V0 M${seatX + 16} ${top + 6} V0`} stroke={ink} strokeWidth={2} fill="none" strokeLinecap="round" />
            </g>
          );
        }
        return (
          <g>
            <path d={`M${back - d * 4} ${top + 4} V${top - 40} q0 -4 ${d * 4} -4 V${top + 4} Z`} fill={C.g4} stroke={ink} strokeWidth={1.8} strokeLinejoin="round" />
            <path d={`M${Math.min(back, front) - 2} ${top} H${Math.max(back, front) + 2} v6 H${Math.min(back, front) - 2} Z`} fill={C.g4} stroke={ink} strokeWidth={1.8} strokeLinejoin="round" />
            <path d={`M${back - d * 1} ${top + 6} V0 M${front - d * 2} ${top + 6} V0`} stroke={ink} strokeWidth={2} fill="none" strokeLinecap="round" />
          </g>
        );
      })()}
      {acc.has("wheelchair") && (side ? (
        <g>
          <circle cx={j.hipL[0] - 4 * f.dir} cy={-20} r={20} fill="none" stroke={ink} strokeWidth={2.4} />
          <circle cx={j.hipL[0] - 4 * f.dir} cy={-20} r={3} fill={ink} />
          <path d={`M${j.hipL[0] - 14} ${j.hipL[1] + 4} h28 M${j.hipL[0] - 12 * f.dir} ${j.hipL[1] - 30} v30`} stroke={ink} strokeWidth={2.2} fill="none" strokeLinecap="round" />
        </g>
      ) : (() => {
        // from the front or behind: a big wheel on each side (seen edge-on), the seat between them, handles at the back
        const lx = Math.min(j.hipL[0], j.hipR[0]) - 13, rx = Math.max(j.hipL[0], j.hipR[0]) + 13;
        const tq = f.angle === "three-quarter" ? 7 : 4.5;
        return (
          <g>
            {[lx, rx].map((x) => <ellipse key={x} cx={x} cy={-21} rx={tq} ry={21} fill="none" stroke={ink} strokeWidth={2.4} />)}
            <path d={`M${lx} ${hipY + 4} H${rx} M${lx + 3} -4 H${rx - 3}`} stroke={ink} strokeWidth={2.2} fill="none" strokeLinecap="round" />
            {f.view === "back" && <path d={`M${lx + 2} ${hipY + 4} V${hipY - 34} h-5 M${rx - 2} ${hipY + 4} V${hipY - 34} h5`} stroke={ink} strokeWidth={2.2} fill="none" strokeLinecap="round" />}
          </g>
        );
      })())}
      {hairBack(cast, f, hx, hy, r)}
      {heldBehind ? held : null}
      {farFirst && (side ? armL : null)}
      {legs}
      {!acc.has("wheelchair") && <>{shoe(j.ftL, "fl", -1)}{shoe(j.ftR, "fr", 1)}</>}
      {skirt && <><path d={skirt} fill={top} transform={`translate(${OFFSET.x} ${OFFSET.y})`} /><path d={skirt} fill="none" stroke={ink} strokeWidth={2} strokeLinejoin="round" /></>}
      {/* a neck, so the head sits on the body instead of floating above it */}
      {<path d={`M${hx - 2.7 + (side ? f.dir * 0.6 : 0)} ${hy + r * 0.7} L${neck[0] - 5} ${neck[1] + 8} H${neck[0] + 5} L${hx + 2.7 + (side ? f.dir * 0.6 : 0)} ${hy + r * 0.7} Z`} fill={skin} stroke={ink} strokeWidth={1.7} strokeLinejoin="round" />}
      <path d={torso} fill={top} transform={`translate(${OFFSET.x} ${OFFSET.y})`} />
      {/* hanging arms go over the loose fill and under the outline, so both show evenly beside the body */}
      {hangL ? armL : null}{hangR ? armR : null}
      {(hangL || hangR) && <path d={torso} fill={top} />}
      <path d={torso} fill="none" stroke={ink} strokeWidth={2.2} strokeLinejoin="round" />
      {outfit === "apron" && !side && f.view !== "back" && <path d={`M${j.shL[0] + 3} ${j.shL[1] + 10} h${j.shR[0] - j.shL[0] - 6} l2 ${j.hipR[1] - j.shR[1] + 8} h${-(j.shR[0] - j.shL[0] + 2)} z`} fill={C.g8} stroke={ink} strokeWidth={1.5} />}
      {outfit === "suit" && !side && f.view !== "back" && <path d={`M${neck[0] - 5} ${neck[1] + 6} l5 12 l5 -12`} fill={C.paper} stroke={ink} strokeWidth={1.3} />}
      {outfit === "hoodie" && f.view !== "back" && <path d={`M${neck[0] - 9} ${neck[1] + 4} q9 7 18 0`} fill="none" stroke={ink} strokeWidth={1.5} />}
      <OutfitDetail outfit={outfit} f={f} top={top} />
      {!["suit", "hoodie", "polo", "chef", "lab-coat", "uniform", "coat", "overalls"].includes(outfit) && false}
      {acc.has("backpack") && (side || f.view === "back"
        ? <rect x={side ? (f.dir > 0 ? j.shR[0] - 16 * w : j.shR[0] + 6 * w) : Math.min(j.shL[0], j.shR[0]) + 1} y={j.shR[1] + 2}
            width={side ? 10 * w : Math.abs(j.shR[0] - j.shL[0]) - 2} height={30} rx={4} fill={C.g5} stroke={ink} strokeWidth={1.8} />
        : <path d={`M${j.shL[0] + 3} ${j.shL[1]} v18 M${j.shR[0] - 3} ${j.shR[1]} v18`} stroke={C.g8} strokeWidth={2.4} strokeLinecap="round" />)}
      {acc.has("bag") && (() => {
        // a messenger bag resting against the upper thigh, below the hem and clear of the hand, strap across the chest
        const bx = side ? j.hipR[0] - 3 * f.dir : j.hipL[0], by = hipY + 2;
        return (
          <g>
            <path d={`M${j.shR[0]} ${j.shR[1]} L${bx} ${by}`} stroke={ink} strokeWidth={1.8} strokeLinecap="round" />
            <rect x={bx - 8} y={by} width={16} height={13} rx={2.5} fill={C.g5} stroke={ink} strokeWidth={1.7} />
            <path d={`M${bx - 8} ${by + 5} H${bx + 8}`} stroke={ink} strokeWidth={1.3} />
          </g>
        );
      })()}
      {farFirst ? (side ? (nearArmOverHead ? null : armR) : <>{hangL ? null : armL}{hangR ? null : armR}</>) : null}
      {/* head */}
      <HeadFront f={f} cast={cast} mood={mood} hx={hx} hy={hy} r={r} skin={skin} />
      {acc.has("cane") && !acc.has("wheelchair") && (j.hdL[1] > hipY - 8 && !j.seated
        ? <path d={`M${j.hdL[0]} ${j.hdL[1]} L${j.hdL[0] + 5} 0 M${j.hdL[0] - 3} ${j.hdL[1]} q3 -4 6 0`} stroke={ink} strokeWidth={2.4} fill="none" strokeLinecap="round" />
        // hand busy (waving, shrugging, seated): the cane leans against the leg
        : (() => { const cx = Math.min(j.ftL[0], j.ftR[0]) - 9; return <path d={`M${cx} 0 L${cx + 6} ${hipY + 6} q2 -6 8 -3`} stroke={ink} strokeWidth={2.4} fill="none" strokeLinecap="round" />; })())}
      {!farFirst && !hangL && <>{armL}</>}
      {heldFront || heldBehind ? null : held}
      {!farFirst && !hangR && <>{armR}</>}
      {heldFront ? held : null}
      {nearArmOverHead && armR}
      {farFirst && held && !heldBehind && <ellipse cx={j.hdR[0]} cy={j.hdR[1]} rx={3.7} ry={3} fill={skin} stroke={ink} strokeWidth={1.5} />}
    </g>
  );
}
