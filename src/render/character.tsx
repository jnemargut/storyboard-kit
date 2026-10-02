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
  const j = f.j;
  const skin = SKIN[cast.skin ?? "tone-2"];
  const outfit = cast.outfit ?? "jacket";
  const top = OUTFIT_FILL[outfit] ?? C.g4;
  const pants = outfit === "suit" || outfit === "uniform" ? C.g8 : outfit === "scrubs" ? C.g2 : outfit === "overalls" ? C.g5 : C.g7;
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
  const legW = 9 * Math.min(w, 1.15);
  const legFill = outfit === "dress" ? skin : pants;
  const shin = outfit === "dress" || outfit === "athletic" ? skin : pants;
  legs.push(limb(j.hipL, j.knL, legW, legFill, "tl"), limb(j.knL, j.ftL, legW - 1, shin, "sl"));
  legs.push(limb(j.hipR, j.knR, legW, legFill, "tr"), limb(j.knR, j.ftR, legW - 1, shin, "sr"));
  const shoe = (p: Pt, k: string) => <ellipse key={k} cx={p[0] + (side ? 3 * f.dir : 0)} cy={p[1] - 1.5} rx={side ? 6.5 : 5} ry={3} fill={ink} />;

  // torso
  const neck = j.neck;
  let torso: string;
  if (side) {
    const tw = 9 * w;
    const [sx, sy] = j.shR; const [px, py] = j.hipR;
    torso = `M${sx - tw * 0.8} ${sy - 3} Q${sx} ${sy - 7} ${sx + tw} ${sy - 1} L${px + tw * (cast.body === "plus" ? 1.4 : 1)} ${py + 4} L${px - tw} ${py + 4} Z`;
  } else {
    // screen-left/right, not body-left/right: seen from behind the sides swap, and the outline must not fold over
    const [sl, sr] = j.shL[0] <= j.shR[0] ? [j.shL, j.shR] : [j.shR, j.shL];
    const [hl, hr] = j.hipL[0] <= j.hipR[0] ? [j.hipL, j.hipR] : [j.hipR, j.hipL];
    const [lx, ly] = sl; const [rx, ry] = sr;
    const belly = cast.body === "plus" ? 5 : 0;
    torso = `M${lx - 5} ${ly - 1} Q${(lx + rx) / 2} ${ly - 5} ${rx + 5} ${ry - 1} Q${hr[0] + 7 + belly} ${(ry + hr[1]) / 2} ${hr[0] + 6} ${hr[1] + 4} L${hl[0] - 6} ${hl[1] + 4} Q${hl[0] - 7 - belly} ${(ly + hl[1]) / 2} ${lx - 5} ${ly - 1} Z`;
  }
  const skirt = outfit === "dress" || longCoat
    ? `M${Math.min(j.hipL[0], j.hipR[0]) - 7} ${j.hipL[1]} L${Math.max(j.hipL[0], j.hipR[0]) + 7} ${j.hipR[1]} L${Math.max(j.knL[0], j.knR[0]) + 10} ${Math.max(j.knL[1], j.knR[1]) + 2} L${Math.min(j.knL[0], j.knR[0]) - 10} ${Math.max(j.knL[1], j.knR[1]) + 2} Z`
    : null;

  const arm = (s: Pt, e: Pt, h: Pt, k: string) => (
    <g key={k}>
      {ln(s, e, 8.5, ink)}{ln(e, h, 7.5, ink)}
      {ln(s, e, 4.9, sleeveless ? skin : top)}{ln(e, h, 3.9, shortSleeves || sleeveless ? skin : top)}
      {shortSleeves && ln(e, mid(e, s), 4.9, top)}
      <circle cx={h[0]} cy={h[1]} r={3.4} fill={skin} stroke={ink} strokeWidth={1.4} />
    </g>
  );
  // draw the far arm first
  const farFirst = side || f.view === "back";
  // seen from the side, an arm raised above the shoulder (waving, phone to the ear) passes in front of the face
  const nearArmOverHead = side && j.hdR[1] < j.shR[1] - 4;
  const armL = hideArm === "left" ? null : arm(j.shL, j.elL, j.hdL, "al");
  const armR = hideArm === "right" ? null : arm(j.shR, j.elR, j.hdR, "ar");

  const hipY = Math.max(j.hipL[1], j.hipR[1]);
  const inFront = (hd: Pt, sh: Pt) => f.view === "back" && Math.abs(hd[0]) < Math.abs(sh[0]) + 1 && hd[1] > sh[1] && hd[1] < hipY + 6;
  const backHidden = { l: inFront(j.hdL, j.shL), r: inFront(j.hdR, j.shR) };
  const seatX = (j.hipL[0] + j.hipR[0]) / 2 + (side ? -2 * f.dir : 0);
  return (
    <g>
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
      {/* from behind, an arm whose hand is in front of the body (crossed, holding something) is mostly hidden by it */}
      {backHidden.l ? armL : null}{backHidden.r ? armR : null}
      {farFirst && (side ? armL : null)}
      {legs}
      {!acc.has("wheelchair") && <>{shoe(j.ftL, "fl")}{shoe(j.ftR, "fr")}</>}
      {skirt && <><path d={skirt} fill={top} transform={`translate(${OFFSET.x} ${OFFSET.y})`} /><path d={skirt} fill="none" stroke={ink} strokeWidth={2} strokeLinejoin="round" /></>}
      <path d={torso} fill={top} transform={`translate(${OFFSET.x} ${OFFSET.y})`} />
      <path d={torso} fill="none" stroke={ink} strokeWidth={2.1} strokeLinejoin="round" />
      {outfit === "apron" && !side && f.view !== "back" && <path d={`M${j.shL[0] + 3} ${j.shL[1] + 10} h${j.shR[0] - j.shL[0] - 6} l2 ${j.hipR[1] - j.shR[1] + 8} h${-(j.shR[0] - j.shL[0] + 2)} z`} fill={C.g8} stroke={ink} strokeWidth={1.5} />}
      {outfit === "suit" && !side && f.view !== "back" && <path d={`M${neck[0] - 5} ${neck[1] + 6} l5 12 l5 -12`} fill={C.paper} stroke={ink} strokeWidth={1.3} />}
      {outfit === "hoodie" && f.view !== "back" && <path d={`M${neck[0] - 9} ${neck[1] + 4} q9 7 18 0`} fill="none" stroke={ink} strokeWidth={1.5} />}
      <OutfitDetail outfit={outfit} f={f} top={top} />
      {!["suit", "hoodie", "polo", "chef", "lab-coat", "uniform", "coat", "overalls"].includes(outfit) && !side && f.view !== "back" && <path d={`M${neck[0] - 4} ${neck[1] + 5} q4 4 8 0`} fill="none" stroke={ink} strokeWidth={1.3} />}
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
      {farFirst ? (side ? (nearArmOverHead ? null : armR) : <>{backHidden.l ? null : armL}{backHidden.r ? null : armR}</>) : null}
      {/* head */}
      <HeadFront f={f} cast={cast} mood={mood} hx={hx} hy={hy} r={r} skin={skin} />
      {acc.has("cane") && !acc.has("wheelchair") && (j.hdL[1] > hipY - 8 && !j.seated
        ? <path d={`M${j.hdL[0]} ${j.hdL[1]} L${j.hdL[0] + 5} 0 M${j.hdL[0] - 3} ${j.hdL[1]} q3 -4 6 0`} stroke={ink} strokeWidth={2.4} fill="none" strokeLinecap="round" />
        // hand busy (waving, shrugging, seated): the cane leans against the leg
        : (() => { const cx = Math.min(j.ftL[0], j.ftR[0]) - 9; return <path d={`M${cx} 0 L${cx + 6} ${hipY + 6} q2 -6 8 -3`} stroke={ink} strokeWidth={2.4} fill="none" strokeLinecap="round" />; })())}
      {!farFirst && <>{armL}</>}
      {heldFront || heldBehind ? null : held}
      {!farFirst && <>{armR}</>}
      {heldFront ? held : null}
      {nearArmOverHead && armR}
      {farFirst && held && !heldBehind && <circle cx={j.hdR[0]} cy={j.hdR[1]} r={3.4} fill={skin} stroke={ink} strokeWidth={1.4} />}
    </g>
  );
}
