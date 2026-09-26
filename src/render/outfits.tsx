/** Profession details drawn over the torso: collars, badges, vest stripes, bibs, buttons. */
import type { Figure, Pt } from "./rig";
import { C } from "./tokens";

const ink = C.ink;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Left/right edge of the torso outline at fraction `t` from the shoulders (0) to the hips (1). */
function torsoSpan(f: Figure, t: number): [number, number, number] {
  const j = f.j;
  const side = f.view === "side";
  const tw = 9 * f.torsoW;
  const [shA, shB] = side ? [j.shR[0] - tw * 0.8, j.shR[0] + tw] : [Math.min(j.shL[0], j.shR[0]) - 5, Math.max(j.shL[0], j.shR[0]) + 5];
  const [hpA, hpB] = side ? [j.hipR[0] - tw, j.hipR[0] + tw] : [Math.min(j.hipL[0], j.hipR[0]) - 6, Math.max(j.hipL[0], j.hipR[0]) + 6];
  const y = lerp(Math.min(j.shL[1], j.shR[1]), Math.max(j.hipL[1], j.hipR[1]) + 4, t);
  return [lerp(shA, hpA, t) + 1.5, lerp(shB, hpB, t) - 1.5, y];
}

const dot = (p: Pt, k: string, r = 1.2) => <circle key={k} cx={p[0]} cy={p[1]} r={r} fill={ink} />;

export function OutfitDetail({ outfit, f }: { outfit: string; f: Figure; top: string }) {
  const j = f.j;
  const side = f.view === "side";
  const back = f.view === "back";
  const front = !side && !back;
  const [nx, ny] = j.neck;
  const shY = Math.min(j.shL[1], j.shR[1]);
  const hipY = Math.max(j.hipL[1], j.hipR[1]);
  const kneeY = Math.max(j.knL[1], j.knR[1]);
  // the person's own left side, as the viewer sees it, shifts with three-quarter turns
  const cx = front && f.angle === "three-quarter" ? nx + f.dir * 2 : nx;
  const half = Math.abs(j.shR[0] - j.shL[0]) / 2 || 8;
  const stroke = { stroke: ink, strokeWidth: 1.3, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (outfit) {
    case "polo":
      return front ? (
        <g>
          <path d={`M${cx - 6} ${ny + 3} L${cx - 1} ${ny + 9} L${cx} ${ny + 4} M${cx + 6} ${ny + 3} L${cx + 1} ${ny + 9} L${cx} ${ny + 4}`} fill={C.paper} stroke={ink} strokeWidth={1.2} strokeLinejoin="round" />
          <path d={`M${cx} ${ny + 8} v8`} {...stroke} />
          {dot([cx + 1.8, ny + 11], "b1")}{dot([cx + 1.8, ny + 15], "b2")}
        </g>
      ) : null;
    case "uniform":
      return (
        <g>
          {!back && <path d={`M${j.shL[0] - 3} ${j.shL[1] + 1} h7 M${j.shR[0] - 4} ${j.shR[1] + 1} h7`} stroke={C.g2} strokeWidth={2.4} strokeLinecap="round" />}
          {front && (
            <>
              <path d={`M${cx - 5} ${ny + 4} l5 6 l5 -6`} fill={C.g5} stroke={ink} strokeWidth={1.2} />
              <path d={`M${cx - 1.4} ${ny + 10} h2.8 l1 ${Math.max(8, (hipY - ny) * 0.55)} l-2.4 3 l-2.4 -3 Z`} fill={ink} />
              <path d={`M${cx + half * 0.5} ${ny + 10} l3 -1.5 l3 1.5 v4 l-3 2.5 l-3 -2.5 Z`} fill={C.g2} stroke={ink} strokeWidth={1} />
              <path d={`M${cx - half * 0.5 - 6} ${ny + 11} h7 v5 h-7 Z`} {...stroke} strokeWidth={1} />
            </>
          )}
        </g>
      );
    case "hi-vis": {
      const band = (t: number, k: string) => {
        const [a, b, y] = torsoSpan(f, t);
        return <path key={k} d={`M${a} ${y - 2} H${b} V${y + 2.2} H${a} Z`} fill={C.paper} stroke={ink} strokeWidth={1.1} />;
      };
      return (
        <g>
          {band(0.48, "b1")}{band(0.78, "b2")}
          {front && <path d={`M${cx} ${ny + 5} V${hipY + 3}`} {...stroke} />}
          {front && <path d={`M${cx - 5} ${ny + 3} L${cx} ${ny + 12} L${cx + 5} ${ny + 3}`} {...stroke} />}
        </g>
      );
    }
    case "lab-coat":
      return front ? (
        <g>
          <path d={`M${cx - 3} ${ny + 5} L${cx - 2} ${hipY + 2} H${cx + 2} L${cx + 3} ${ny + 5} Z`} fill={C.g4} />
          <path d={`M${cx - 7} ${ny + 3} L${cx - 2} ${ny + 16} V${kneeY} M${cx + 7} ${ny + 3} L${cx + 2} ${ny + 16} V${kneeY}`} {...stroke} />
          <path d={`M${cx - half * 0.45 - 6} ${shY + 12} h7 v6 h-7 Z M${cx - half * 0.45 - 4} ${shY + 12} v-4`} {...stroke} strokeWidth={1.1} />
        </g>
      ) : side ? <path d={`M${j.hipR[0] + f.dir * 6} ${hipY - 6} h${f.dir * -6} v5`} {...stroke} /> : null;
    case "chef":
      return front ? (
        <g>
          <path d={`M${cx - 6} ${ny + 4} h12`} stroke={ink} strokeWidth={1.4} />
          {[0.3, 0.55, 0.8].flatMap((t) => { const y = lerp(shY, hipY, t); return [dot([cx - 3.5, y], `l${t}`, 1.4), dot([cx + 3.5, y], `r${t}`, 1.4)]; })}
        </g>
      ) : null;
    case "overalls": {
      const bibTop = lerp(shY, hipY, 0.38);
      const bw = half * 0.62;
      if (side) return <path d={`M${j.shR[0]} ${j.shR[1] + 1} L${j.hipR[0] + f.dir * 3} ${hipY}`} stroke={C.g8} strokeWidth={2.4} strokeLinecap="round" />;
      if (back) return <path d={`M${j.shL[0]} ${j.shL[1] + 1} L${j.hipR[0]} ${hipY} M${j.shR[0]} ${j.shR[1] + 1} L${j.hipL[0]} ${hipY}`} stroke={C.g8} strokeWidth={2.4} strokeLinecap="round" />;
      return (
        <g>
          <path d={`M${cx - bw} ${bibTop} H${cx + bw} L${cx + bw + 2} ${hipY + 4} H${cx - bw - 2} Z`} fill={C.g5} stroke={ink} strokeWidth={1.5} strokeLinejoin="round" />
          <path d={`M${cx - bw + 1} ${bibTop} L${j.shL[0] + (j.shL[0] < cx ? 3 : -3)} ${j.shL[1] + 1} M${cx + bw - 1} ${bibTop} L${j.shR[0] + (j.shR[0] < cx ? 3 : -3)} ${j.shR[1] + 1}`} stroke={C.g8} strokeWidth={2.4} strokeLinecap="round" />
          <path d={`M${cx - bw * 0.5} ${bibTop + 5} h${bw} v5 h${-bw} Z`} {...stroke} strokeWidth={1} />
          {dot([cx - bw + 2, bibTop + 2], "l", 1.3)}{dot([cx + bw - 2, bibTop + 2], "r", 1.3)}
        </g>
      );
    }
    case "coat":
      return front ? (
        <g>
          <path d={`M${cx - 7} ${ny + 2} L${cx - 1} ${ny + 12} L${cx + 7} ${ny + 2}`} fill={C.g7} stroke={ink} strokeWidth={1.3} strokeLinejoin="round" />
          <path d={`M${cx + 1} ${ny + 10} V${kneeY}`} {...stroke} />
          {[0.35, 0.65, 0.95].map((t) => dot([cx + 4, lerp(ny + 10, hipY, t)], `b${t}`, 1.4))}
        </g>
      ) : null;
    case "athletic":
      return front ? <path d={`M${cx - 6} ${ny + 2} Q${cx} ${ny + 12} ${cx + 6} ${ny + 2}`} {...stroke} /> : null;
    default:
      return null;
  }
}
