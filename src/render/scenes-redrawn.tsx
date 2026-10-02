/**
 * Redrawn scenes (v2): car, parking, school, gym, airport. More recognizable silhouettes, props that sit on
 * the floor, and front layers that overlap people the way the real place would (a car door hides legs).
 */
import type { SceneDef } from "./scenes";
import { Sh } from "./scenes";
import { C, FLOOR_Y } from "./tokens";

const ink = C.ink;
const rect = (x: number, y: number, w: number, h: number) => `M${x} ${y} h${w} v${h} h${-w} Z`;
const L = ({ d, sw = 1.5, color = ink }: { d: string; sw?: number; color?: string }) => (
  <path d={d} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
);
const T = ({ x, y, s, children, fill = ink }: { x: number; y: number; s: number; children: string; fill?: string }) => (
  <text x={x} y={y} textAnchor="middle" fontFamily="Permanent Marker" fontSize={s} fill={fill}>{children}</text>
);

/** Side-view hatchback, facing left. `x` = rear bumper, wheels on `y`. */
function Car({ x, y }: { x: number; y: number }) {
  const body = `M${x + 236} ${y - 6} Q${x + 240} ${y - 34} ${x + 218} ${y - 40} L${x + 186} ${y - 44} Q${x + 166} ${y - 74} ${x + 136} ${y - 78} L${x + 78} ${y - 78} Q${x + 52} ${y - 76} ${x + 36} ${y - 48} L${x + 12} ${y - 42} Q${x - 2} ${y - 38} ${x} ${y - 6} Z`;
  return (
    <g>
      <Sh d={body} fill={C.g4} sw={2.2} />
      <Sh d={`M${x + 46} ${y - 48} Q${x + 60} ${y - 70} ${x + 80} ${y - 71} L${x + 104} ${y - 71} L${x + 104} ${y - 48} Z`} fill={C.paper} />
      <Sh d={`M${x + 112} ${y - 71} L${x + 134} ${y - 71} Q${x + 158} ${y - 68} ${x + 174} ${y - 46} L${x + 112} ${y - 46} Z`} fill={C.paper} />
      <L d={`M${x + 108} ${y - 46} V${y - 12} M${x + 60} ${y - 32} h12 M${x + 124} ${y - 32} h12 M${x + 8} ${y - 26} h10 M${x + 226} ${y - 26} h-10`} sw={1.6} />
      {[x + 52, x + 190].map((cx) => (
        <g key={cx}><circle cx={cx} cy={y - 6} r={17} fill={C.g8} stroke={ink} strokeWidth={2.2} /><circle cx={cx} cy={y - 6} r={7} fill={C.g4} stroke={ink} strokeWidth={1.6} /></g>
      ))}
    </g>
  );
}

export const REDRAWN_SCENES: Record<string, SceneDef> = {
  // ---------------------------------------------------------------- inside a car, seen through the side windows
  car: {
    // a car seen from the side, out on the road, with the people visible through its windows
    back: () => (
      <g>
        {/* the world going by: hills, trees, the road */}
        <path d="M0 150 Q90 118 190 140 Q290 160 400 128 V234 H0 Z" fill={C.g1} />
        <L d="M0 150 Q90 118 190 140 Q290 160 400 128" sw={1.2} color={C.g5} />
        {[30, 372].map((x) => <g key={x}><L d={`M${x} 160 V130`} sw={2} color={C.g5} /><circle cx={x} cy={118} r={16} fill={C.g2} stroke={C.g5} strokeWidth={1.3} /></g>)}
        {/* inside the car: seat backs and headrests seen through the glass */}
        <path d="M58 150 L78 76 Q84 66 100 66 H300 L352 150 Z" fill={C.g1} />
        <Sh d="M226 150 V112 Q226 102 236 102 H242 Q250 102 250 112 V150 Z" fill={C.g7} />
        <Sh d="M228 96 Q228 86 238 86 H242 Q248 86 248 96 V104 H228 Z" fill={C.g7} />
        <Sh d="M110 150 V114 Q110 104 120 104 H126 Q134 104 134 114 V150 Z" fill={C.g7} />
        <Sh d="M112 98 Q112 88 122 88 H126 Q132 88 132 98 V106 H112 Z" fill={C.g7} />
      </g>
    ),
    front: () => (
      <g>
        {/* body below the windows hides everyone from the chest down */}
        <Sh d="M12 214 Q10 172 30 160 L58 150 H352 Q384 156 392 180 V214 Q392 222 384 222 H12 Z" fill={C.g4} sw={2.4} />
        {/* roof, pillars and window frames */}
        <path d="M58 150 L78 76 Q84 66 100 66 H300 L352 150" fill="none" stroke={ink} strokeWidth={2.6} strokeLinejoin="round" />
        <Sh d="M172 66 H186 L184 150 H170 Z" fill={C.g4} sw={1.8} />
        <Sh d="M58 150 L78 76 L90 76 L74 150 Z" fill={C.g4} sw={1.6} />
        {/* steering wheel, seen edge-on in front of the driver, and the dash under the windshield */}
        <Sh d="M300 150 L318 132 Q330 128 340 136 L352 150 Z" fill={C.g7} sw={1.6} />
        <ellipse cx={278} cy={128} rx={5} ry={17} transform="rotate(-18 278 128)" fill="none" stroke={ink} strokeWidth={3} />
        <L d="M281 134 L300 146" sw={3} />
        {/* doors, handles, mirror, lights */}
        <L d="M186 152 V216 M300 152 Q304 186 300 216" sw={1.6} />
        <L d="M144 170 h18 M262 170 h18" sw={2.6} />
        <Sh d="M340 144 l14 -4 v10 h-12 Z" fill={C.g5} sw={1.5} />
        <Sh d="M378 176 q10 2 12 12 h-12 Z" fill={C.paper} sw={1.4} />
        <Sh d="M14 180 h10 v14 h-10 Z" fill={C.g7} sw={1.3} />
        {/* wheels on the road, and a little speed */}
        {[92, 314].map((x) => <g key={x}><circle cx={x} cy={220} r={21} fill={C.g8} stroke={ink} strokeWidth={2.4} /><circle cx={x} cy={220} r={8} fill={C.g4} stroke={ink} strokeWidth={1.6} /></g>)}
        <L d="M0 240 H400" sw={2} />
        <L d="M-6 190 h-14 M-4 204 h-22" sw={1.6} color={C.g5} />
      </g>
    ),
    marks: {
      "driver-seat": { x: 250, y: 196, facing: "right", seated: true, behind: true, scale: 0.86 },
      "passenger-seat": { x: 134, y: 196, facing: "right", seated: true, behind: true, scale: 0.84 },
      dashboard: { x: 322, y: 140 },
    },
    order: ["driver-seat", "passenger-seat"],
    spots: { "car-display": { x: 318, y: 136, behind: true, scale: 0.24 }, phone: { x: 318, y: 138, behind: true, scale: 0.12 } },
    defaultSpot: { x: 324, y: 128 },
  },

  // ---------------------------------------------------------------- parking garage with an EV charger
  parking: {
    back: () => (
      <g>
        <Sh d={rect(0, 0, 400, 24)} fill={C.g4} />
        <L d="M0 24 H400 M60 0 V24 M160 0 V24 M260 0 V24 M360 0 V24" sw={1.6} />
        <L d="M0 196 H400" sw={1.2} color={C.g5} />
        {/* pillar with level sign and hazard stripes */}
        <Sh d={rect(262, 24, 28, 172)} fill={C.g2} />
        <L d="M262 180 l12 -12 M270 196 l20 -20 M282 196 l8 -8" sw={1.6} />
        <circle cx={276} cy={70} r={12} fill={C.paper} stroke={ink} strokeWidth={1.8} />
        <T x={276} y={76} s={15}>P2</T>
        {/* bay lines on the floor */}
        <L d="M8 234 L22 196 M246 234 L240 196" sw={2} color={C.g5} />
        <Car x={10} y={228} />
        {/* EV charger: post, screen housing, holstered plug, coiled cable */}
        <Sh d="M318 234 V120 Q318 108 330 108 H352 Q364 108 364 120 V234 Z" fill={C.g2} />
        <Sh d={rect(326, 120, 30, 36)} fill={C.g5} />
        <L d="M328 170 h26 M341 170 v8" sw={1.6} />
        <Sh d="M364 176 h10 v16 h-10 Z" fill={C.g7} />
        <L d="M374 186 q24 10 12 30 q-8 12 4 18" sw={2.6} />
        <circle cx={341} cy={96} r={7} fill={C.paper} stroke={ink} strokeWidth={1.6} /><L d="M338 92 l4 4 l-2 0 l3 5" sw={1.4} />
      </g>
    ),
    marks: {
      "car-door": { x: 214, y: FLOOR_Y, facing: "left" },
      charger: { x: 296, y: FLOOR_Y, facing: "right" },
      walkway: { x: 386, y: FLOOR_Y, facing: "left" },
    },
    order: ["charger", "car-door", "walkway"],
    spots: { "payment-terminal": { x: 341, y: 138 }, kiosk: { x: 341, y: 164 }, phone: { x: 341, y: 138 } },
    defaultSpot: { x: 341, y: 138 },
    sign: { x: 70, y: 38, w: 150, h: 18 },
  },

  // ---------------------------------------------------------------- school entrance
  school: {
    back: () => (
      <g>
        {/* flagpole */}
        <L d="M128 234 V26" sw={2.6} /><Sh d="M130 28 h30 l-5 9 l5 9 h-30 Z" fill={C.g4} />
        {/* building: roofline, walls, window grid, entrance */}
        <Sh d={rect(160, 44, 240, 190)} fill={C.g1} />
        <Sh d={rect(152, 34, 248, 12)} fill={C.g5} />
        {[[180, 64], [220, 64], [340, 64], [372, 64], [180, 134], [220, 134], [340, 134], [372, 134]].map(([x, y]) => (
          <g key={`${x}${y}`}><Sh d={rect(x, y, 26, 34)} fill={C.paper} /><L d={`M${x + 13} ${y} V${y + 34} M${x} ${y + 17} H${x + 26}`} sw={1.1} /></g>
        ))}
        <Sh d={rect(254, 58, 76, 22)} fill={C.paper} />
        <T x={292} y={75} s={15}>SCHOOL</T>
        <Sh d={rect(264, 132, 56, 88)} fill={C.g5} />
        <L d="M292 132 V220 M270 142 h16 v26 h-16 Z M298 142 h16 v26 h-16 Z" sw={1.3} />
        <Sh d={rect(258, 220, 68, 7)} fill={C.g4} /><Sh d={rect(250, 227, 84, 7)} fill={C.g4} />
        {/* hedges along the wall */}
        <path d="M160 234 Q162 214 178 214 Q184 202 198 208 Q212 200 224 212 Q240 210 240 234 Z" fill={C.g4} stroke={ink} strokeWidth={1.8} />
        <path d="M344 234 Q344 214 360 214 Q368 204 380 210 Q396 206 400 218 L400 234 Z" fill={C.g4} stroke={ink} strokeWidth={1.8} />
        {/* fence with an open gate gap */}
        {Array.from({ length: 11 }, (_, i) => <L key={i} d={`M${6 + i * 10} 234 V${i % 2 ? 188 : 184}`} sw={1.8} />)}
        <L d="M0 194 H112 M0 222 H112" sw={2} />
        <L d="M112 234 V178 M146 234 V178" sw={3} />
      </g>
    ),
    marks: {
      sidewalk: { x: 70, y: FLOOR_Y, facing: "right" },
      gate: { x: 132, y: FLOOR_Y, facing: "right" },
      door: { x: 292, y: FLOOR_Y, facing: "left" },
    },
    order: ["gate", "sidewalk", "door"],
    spots: { kiosk: { x: 214, y: 164 } },
    defaultSpot: { x: 214, y: 164 },
  },

  // ---------------------------------------------------------------- gym
  gym: {
    back: () => (
      <g>
        <Sh d={rect(0, 0, 400, 16)} fill={C.g5} />
        <T x={62} y={46} s={20}>GYM</T>
        {/* mirror wall */}
        <Sh d={rect(18, 84, 176, 96)} fill={C.paper} />
        <L d="M40 96 l34 70 M100 92 l40 80 M156 96 l26 54" sw={1} color={C.g4} />
        <L d="M0 196 H400" sw={1.2} color={C.g5} />
        {/* weights rack with dumbbells */}
        <L d="M218 234 V132 M282 234 V132 M218 160 H282 M218 190 H282 M218 220 H282" sw={2.4} />
        {[152, 182, 212].map((y) => [232, 262].map((x) => (
          <g key={`${x}${y}`}><L d={`M${x - 8} ${y} h16`} sw={2.4} /><rect x={x - 12} y={y - 5} width={5} height={10} rx={1} fill={C.g8} stroke={ink} strokeWidth={1.2} /><rect x={x + 7} y={y - 5} width={5} height={10} rx={1} fill={C.g8} stroke={ink} strokeWidth={1.2} /></g>
        )))}
        {/* treadmill, facing left: console post at the front */}
        <Sh d="M298 218 L394 206 Q400 206 400 212 L400 222 L298 230 Q292 230 292 224 Z" fill={C.g7} />
        <L d="M300 218 L394 206" sw={1.4} color={C.g2} />
        <L d="M306 218 L318 128 M318 128 L366 146" sw={3.4} />
        <Sh d={rect(302, 116, 30, 16)} fill={C.g4} />
        {/* bench */}
        <Sh d={rect(78, 190, 122, 10)} fill={C.g5} />
        <L d="M92 200 V234 M186 200 V234" sw={2.8} />
        {/* kettlebell + mat */}
        <path d="M30 234 a11 11 0 1 1 22 0 Z" fill={C.g8} stroke={ink} strokeWidth={1.8} /><path d="M35 222 q6 -12 12 0" fill="none" stroke={ink} strokeWidth={2.4} />
      </g>
    ),
    marks: {
      treadmill: { x: 350, y: 214, facing: "left" },
      bench: { x: 138, y: FLOOR_Y, facing: "right", seated: true },
      floor: { x: 60, y: FLOOR_Y, facing: "right" },
      mirror: { x: 196, y: FLOOR_Y, facing: "left" },
    },
    order: ["floor", "treadmill", "bench", "mirror"],
    spots: { tv: { x: 250, y: 60 }, kiosk: { x: 200, y: 164 }, phone: { x: 118, y: 185 }, tablet: { x: 318, y: 124 } },
    defaultSpot: { x: 250, y: 60 },
    sign: { x: 20, y: 26, w: 84, h: 26 },
  },

  // ---------------------------------------------------------------- airport check-in + gate
  airport: {
    back: () => (
      <g>
        {/* big window onto the apron, with a plane */}
        <Sh d={rect(8, 22, 222, 112)} fill={C.paper} />
        <L d="M82 22 V134 M156 22 V134 M8 116 H230" sw={1.4} />
        <path d="M24 100 Q24 90 40 88 L186 84 Q204 84 212 94 Q206 102 186 104 L40 106 Q24 106 24 100 Z" fill={C.g2} stroke={ink} strokeWidth={1.8} />
        <path d="M34 90 L22 64 L34 64 L56 89 Z M106 96 L78 120 L96 120 L130 97 Z" fill={C.g4} stroke={ink} strokeWidth={1.6} />
        {[70, 86, 102, 118, 134, 150, 166].map((x) => <circle key={x} cx={x} cy={92} r={1.6} fill={ink} />)}
        {/* departures board */}
        <Sh d={rect(246, 20, 146, 64)} fill={C.g8} />
        <T x={319} y={36} s={11} fill={C.paper}>DEPARTURES</T>
        {[48, 58, 68, 78].map((y) => <L key={y} d={`M254 ${y} h56 M318 ${y} h30 M356 ${y} h28`} sw={1.3} color={C.paper} />)}
        {/* row of gate seats */}
        {[18, 64, 110].map((x) => <g key={x}><Sh d={`M${x} 196 V160 Q${x} 152 ${x + 8} 152 H${x + 32} Q${x + 40} 152 ${x + 40} 160 V196 Z`} fill={C.g5} /></g>)}
        <Sh d={rect(14, 188, 142, 12)} fill={C.g7} />
        <L d="M24 200 V234 M146 200 V234 M24 234 h122" sw={2.2} />
      </g>
    ),
    front: () => (
      <g>
        <Sh d={rect(284, 170, 116, 64)} fill={C.g2} />
        <L d="M284 184 H400" sw={1.2} />
        <T x={342} y={214} s={13}>CHECK-IN</T>
        <Sh d={rect(262, 214, 22, 20)} fill={C.g5} /><L d="M262 214 h22" sw={2} />
      </g>
    ),
    marks: {
      "check-in": { x: 254, y: FLOOR_Y, facing: "right" },
      agent: { x: 346, y: FLOOR_Y, facing: "left", behind: true, surface: 170 },
      "gate-seat": { x: 84, y: FLOOR_Y, facing: "right", seated: true },
      window: { x: 204, y: FLOOR_Y, facing: "left" },
    },
    order: ["check-in", "agent", "gate-seat", "window"],
    spots: { kiosk: { x: 190, y: 164 }, tv: { x: 319, y: 52 }, phone: { x: 360, y: 164 }, "payment-terminal": { x: 312, y: 161 } },
    defaultSpot: { x: 190, y: 164 },
    sign: { x: 294, y: 196, w: 96, h: 24 },
  },
};
