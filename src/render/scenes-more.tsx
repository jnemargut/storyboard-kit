/** More everyday scenes. Same conventions as scenes.tsx: 400×260 panel, floor at FLOOR_Y, marker fills + ink. */
import type { SceneDef } from "./scenes";
import { Sh } from "./scenes";
import { C, FLOOR_Y } from "./tokens";

const ink = C.ink;
const rect = (x: number, y: number, w: number, h: number) => `M${x} ${y} h${w} v${h} h${-w} Z`;
const L = ({ d, sw = 1.5, color = ink }: { d: string; sw?: number; color?: string }) => (
  <path d={d} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
);
/** Simple side-view chair; `dir` is the way the sitter faces. */
const chair = (x: number, dir: 1 | -1, fill: string = C.g4) => (
  <g key={`chair-${x}`}>
    <Sh d={`M${x - 14 * dir} 234 V${FLOOR_Y - 44} M${x - 14 * dir} ${FLOOR_Y - 44} H${x + 12 * dir} M${x + 12 * dir} ${FLOOR_Y - 44} V234`} fill="none" sw={2.2} />
    <Sh d={`M${x - 16 * dir} ${FLOOR_Y - 44} V${FLOOR_Y - 96} h${-6 * dir} V${FLOOR_Y - 40} Z`} fill={fill} />
  </g>
);
const table = (x0: number, x1: number, top: number) => (
  <g><Sh d={rect(x0, top, x1 - x0, 8)} fill={C.g4} /><L d={`M${x0 + 8} ${top + 8} V234 M${x1 - 8} ${top + 8} V234`} sw={2.4} /></g>
);

export const MORE_SCENES: Record<string, SceneDef> = {
  airport: {
    back: () => (
      <g>
        <Sh d={rect(12, 30, 170, 84)} fill={C.paper} />
        <path d="M60 78 l50 -10 l30 -18 l8 3 l-20 20 l34 -4 l6 -8 l6 1 l-4 12 l-60 12 Z" fill={C.g4} stroke={ink} strokeWidth={1.6} />
        <Sh d={rect(210, 26, 120, 56)} fill={C.g8} />
        {[38, 50, 62, 74].map((y) => <L key={y} d={`M220 ${y} h60 M290 ${y} h30`} sw={1.6} color={C.paper} />)}
        <Sh d="M30 234 V200 H150 V234" fill={C.g5} /><Sh d="M30 200 V176 Q30 168 38 168 H142 Q150 168 150 176 V200 Z" fill={C.g4} />
        <L d="M70 168 V200 M110 168 V200" sw={1.4} />
      </g>
    ),
    front: () => <g><Sh d={rect(282, 172, 118, 62)} fill={C.g2} /><L d="M282 186 H400" sw={1.2} /></g>,
    marks: {
      "gate-seat": { x: 92, y: FLOOR_Y, facing: "right", seated: true, behind: true },
      "check-in": { x: 250, y: FLOOR_Y, facing: "right" },
      window: { x: 186, y: FLOOR_Y, facing: "left" },
      agent: { x: 346, y: FLOOR_Y, facing: "left", behind: true, surface: 172 },
    },
    order: ["check-in", "agent", "gate-seat", "window"],
    spots: { kiosk: { x: 206, y: 164 }, tv: { x: 270, y: 54 }, phone: { x: 310, y: 166 }, "payment-terminal": { x: 300, y: 161 } },
    defaultSpot: { x: 206, y: 164 },
    sign: { x: 214, y: 4, w: 112, h: 18 },
  },
  restaurant: {
    back: () => (
      <g>
        <Sh d={rect(150, 30, 100, 76)} fill={C.paper} /><L d="M200 30 V106 M150 68 H250" sw={1.4} />
        <L d="M200 0 V18 M104 0 v24 M296 0 v24" sw={1.3} />
        <Sh d="M188 30 Q200 16 212 30 Z" fill={C.g4} /><Sh d="M92 36 Q104 20 116 36 Z" fill={C.g4} /><Sh d="M284 36 Q296 20 308 36 Z" fill={C.g4} />
        {chair(128, 1)}{chair(272, -1)}
      </g>
    ),
    front: () => <g>{table(146, 254, 180)}<path d="M186 180 q6 -14 12 0 M206 176 h14 v4 h-14 z" fill={C.paper} stroke={ink} strokeWidth={1.4} /></g>,
    marks: {
      "table-left": { x: 128, y: FLOOR_Y, facing: "right", seated: true, behind: true, surface: 180 },
      "table-right": { x: 272, y: FLOOR_Y, facing: "left", seated: true, behind: true, surface: 180 },
      waiter: { x: 330, y: FLOOR_Y, facing: "left" },
      door: { x: 40, y: FLOOR_Y, facing: "right" },
    },
    order: ["table-left", "table-right", "waiter", "door"],
    spots: { phone: { x: 170, y: 175 }, "payment-terminal": { x: 232, y: 161 }, tablet: { x: 170, y: 170 } },
    defaultSpot: { x: 170, y: 175 },
    sign: { x: 150, y: 110, w: 100, h: 16 },
  },
  gym: {
    back: () => (
      <g>
        <Sh d={rect(20, 30, 180, 150)} fill={C.g1} /><L d="M40 50 l40 110 M110 40 l50 120" sw={1} color={C.g5} />
        <L d="M260 234 V120 M244 120 h32 M252 150 h16 M252 180 h16 M252 210 h16" sw={2.4} />
        {[150, 180, 210].map((y) => <g key={y}><circle cx={250} cy={y} r={6} fill={C.g7} stroke={ink} strokeWidth={1.4} /><circle cx={270} cy={y} r={6} fill={C.g7} stroke={ink} strokeWidth={1.4} /></g>)}
        <Sh d="M300 234 L318 196 H392 L396 234" fill={C.g5} /><L d="M318 196 L330 150 M330 150 h24" sw={3} />
      </g>
    ),
    front: () => <g><Sh d={rect(96, 206, 110, 10)} fill={C.g4} /><L d="M110 216 V234 M192 216 V234" sw={2.4} /></g>,
    marks: {
      treadmill: { x: 352, y: 214, facing: "left" },
      bench: { x: 150, y: FLOOR_Y, facing: "right", seated: true, behind: true },
      floor: { x: 60, y: FLOOR_Y, facing: "right" },
      mirror: { x: 216, y: FLOOR_Y, facing: "left" },
    },
    order: ["floor", "treadmill", "bench", "mirror"],
    spots: { tv: { x: 110, y: 70 }, kiosk: { x: 228, y: 164 }, phone: { x: 190, y: 202 } },
    defaultSpot: { x: 110, y: 70 },
    sign: { x: 24, y: 6, w: 172, h: 20 },
  },
  clinic: {
    back: () => (
      <g>
        <Sh d={rect(236, 40, 150, 70)} fill={C.paper} /><L d="M236 60 H386" sw={1.2} />
        <text x={311} y={55} textAnchor="middle" fontFamily="Patrick Hand" fontSize={12} fill={ink}>RECEPTION</text>
        <Sh d={rect(40, 44, 40, 48)} fill={C.g1} /><L d="M60 56 v24 M48 68 h24" sw={3} color={C.g7} />
        {[40, 90, 140].map((x) => <g key={x}><Sh d={`M${x} 234 V194 H${x + 40} V234`} fill="none" /><Sh d={`M${x} 194 V150 H${x + 40} V194 Z`} fill={C.g4} /></g>)}
      </g>
    ),
    front: () => <g><Sh d={rect(236, 170, 164, 64)} fill={C.g2} /><L d="M236 184 H400" sw={1.2} /></g>,
    marks: {
      waiting: { x: 110, y: FLOOR_Y, facing: "right", seated: true },
      reception: { x: 212, y: FLOOR_Y, facing: "right" },
      receptionist: { x: 320, y: FLOOR_Y, facing: "left", behind: true, surface: 170 },
      door: { x: 20, y: FLOOR_Y, facing: "right" },
    },
    order: ["waiting", "reception", "receptionist", "door"],
    spots: { kiosk: { x: 196, y: 164 }, tablet: { x: 260, y: 158 }, tv: { x: 130, y: 90 }, "payment-terminal": { x: 262, y: 159 } },
    defaultSpot: { x: 196, y: 164 },
    sign: { x: 238, y: 42, w: 146, h: 17 },
  },
  parking: {
    back: () => (
      <g>
        <L d="M0 40 H400" sw={2.4} /><Sh d={rect(170, 40, 22, 194)} fill={C.g2} />
        <Sh d="M20 234 V196 Q24 170 56 166 L84 142 Q96 134 120 134 H176 Q196 134 206 150 L218 168 Q246 172 250 196 V234 Z" fill={C.g4} />
        <Sh d="M92 146 H138 V168 H80 Z" fill={C.paper} /><Sh d="M146 146 H190 L206 168 H146 Z" fill={C.paper} />
        <circle cx={70} cy={232} r={18} fill={C.g8} stroke={ink} strokeWidth={2.2} /><circle cx={206} cy={232} r={18} fill={C.g8} stroke={ink} strokeWidth={2.2} />
        <Sh d={rect(330, 110, 40, 124)} fill={C.g2} /><L d="M338 124 h24 v28 h-24 Z M350 170 q24 10 8 40" sw={2} />
        <L d="M270 250 L284 234 M390 250 L376 234" sw={2} />
      </g>
    ),
    marks: {
      "car-door": { x: 262, y: FLOOR_Y, facing: "left" },
      charger: { x: 306, y: FLOOR_Y, facing: "right" },
      walkway: { x: 130, y: FLOOR_Y + 8, facing: "right", scale: 1 },
    },
    order: ["car-door", "charger", "walkway"],
    spots: { kiosk: { x: 284, y: 164 }, "payment-terminal": { x: 350, y: 138 } },
    defaultSpot: { x: 350, y: 138 },
    sign: { x: 20, y: 48, w: 140, h: 18 },
  },
  "bus-stop": {
    back: () => (
      <g>
        <Sh d="M100 234 V60 H320 V234" fill={C.g1} /><Sh d="M92 60 H328 L318 44 H102 Z" fill={C.g5} />
        <Sh d={rect(250, 80, 56, 90)} fill={C.paper} /><L d="M258 94 h40 M258 106 h30 M258 118 h36 M258 130 h24" sw={1.3} />
        <Sh d="M120 196 H236 V204 H120 Z" fill={C.g4} /><L d="M130 204 V234 M226 204 V234" sw={2.2} />
        <L d="M360 234 V50" sw={2.6} /><Sh d="M344 50 h32 v24 h-32 Z" fill={C.paper} />
        <text x={360} y={67} textAnchor="middle" fontFamily="Permanent Marker" fontSize={13} fill={ink}>BUS</text>
        <L d="M0 246 H400" sw={1.6} />
      </g>
    ),
    marks: {
      bench: { x: 178, y: FLOOR_Y, facing: "right", seated: true },
      shelter: { x: 290, y: FLOOR_Y, facing: "left" },
      curb: { x: 380, y: FLOOR_Y, facing: "left" },
      sidewalk: { x: 50, y: FLOOR_Y, facing: "right" },
    },
    order: ["bench", "shelter", "sidewalk", "curb"],
    spots: { tv: { x: 180, y: 90 }, kiosk: { x: 70, y: 164 } },
    defaultSpot: { x: 180, y: 90 },
  },
  park: {
    back: () => (
      <g>
        <path d="M20 90 Q10 50 50 44 Q64 16 96 34 Q130 30 126 70 Q140 100 100 108 Q60 118 20 90 Z" fill={C.g4} stroke={ink} strokeWidth={2} />
        <L d="M72 108 V234 M86 108 V234" sw={2.4} />
        <path d="M300 70 Q290 36 326 30 Q346 10 370 30 Q400 36 392 72 Q396 96 360 98 Q320 104 300 70 Z" fill={C.g2} stroke={ink} strokeWidth={2} />
        <L d="M346 98 V234" sw={3} />
        <Sh d="M150 204 H270 V210 H150 Z" fill={C.g5} /><Sh d="M150 204 V176 H270 V204" fill="none" /><L d="M150 186 H270 M150 196 H270 M160 210 V234 M260 210 V234" sw={1.6} />
        <L d="M0 244 Q200 232 400 244" sw={1.4} color={C.g5} />
      </g>
    ),
    marks: {
      bench: { x: 210, y: FLOOR_Y, facing: "right", seated: true },
      path: { x: 290, y: FLOOR_Y, facing: "left" },
      tree: { x: 120, y: FLOOR_Y, facing: "right" },
    },
    order: ["bench", "path", "tree"],
    spots: {},
    defaultSpot: { x: 300, y: 160 },
  },
  "home-office": {
    back: () => (
      <g>
        <Sh d={rect(40, 36, 110, 90)} fill={C.paper} /><L d="M95 36 V126 M40 81 H150" sw={1.3} />
        <Sh d={rect(300, 30, 86, 204)} fill={C.g2} />
        {[70, 120, 170].map((y) => <L key={y} d={`M300 ${y} H386`} sw={1.6} />)}
        {[308, 318, 330, 346, 358].map((x, i) => <rect key={x} x={x} y={42 + (i % 2) * 4} width={8} height={24 - (i % 2) * 4} fill={i % 2 ? C.g5 : C.g4} stroke={ink} strokeWidth={1} />)}
        <path d="M322 164 q6 -14 12 0 z" fill={C.g5} stroke={ink} strokeWidth={1.2} />
        <Sh d="M126 234 V164 Q126 150 138 150 H146 V234" fill={C.g5} />
      </g>
    ),
    front: () => <g>{table(136, 290, 176)}<path d="M252 176 v-12 h10 v12 M262 168 q6 0 6 4 q0 4 -6 4" fill={C.paper} stroke={ink} strokeWidth={1.3} /></g>,
    marks: {
      "desk-chair": { x: 150, y: FLOOR_Y, facing: "right", seated: true, behind: true, surface: 176 },
      bookshelf: { x: 276, y: FLOOR_Y, facing: "right" },
      door: { x: 30, y: FLOOR_Y, facing: "right" },
    },
    order: ["desk-chair", "bookshelf", "door"],
    spots: { laptop: { x: 212, y: 172 }, desktop: { x: 216, y: 116 }, phone: { x: 236, y: 171 }, "smart-speaker": { x: 280, y: 164 }, tablet: { x: 236, y: 166 } },
    defaultSpot: { x: 212, y: 172 },
  },
  hotel: {
    back: () => (
      <g>
        <Sh d={rect(250, 36, 120, 60)} fill={C.g1} />
        {[0, 1, 2, 3, 4].map((i) => <L key={i} d={`M${262 + i * 24} 50 v10 m-4 0 h8`} sw={1.4} />)}
        <Sh d={rect(20, 60, 64, 174)} fill={C.g5} /><L d="M52 60 V234 M40 120 v10 M64 120 v10" sw={1.4} />
        <Sh d="M110 234 V200 H160 V234" fill={C.g4} /><Sh d={rect(116, 170, 38, 30)} fill={C.g7} /><L d="M104 234 V150 M166 234 V150 M104 150 H166" sw={2} />
      </g>
    ),
    front: () => <g><Sh d={rect(232, 170, 168, 64)} fill={C.g2} /><L d="M232 184 H400" sw={1.2} /><path d="M270 170 q8 -12 16 0 z M278 158 v-2" fill={C.g4} stroke={ink} strokeWidth={1.4} /></g>,
    marks: {
      desk: { x: 208, y: FLOOR_Y, facing: "right" },
      clerk: { x: 330, y: FLOOR_Y, facing: "left", behind: true, surface: 170 },
      lobby: { x: 130, y: FLOOR_Y, facing: "right" },
      elevator: { x: 52, y: FLOOR_Y, facing: "right" },
    },
    order: ["desk", "clerk", "lobby", "elevator"],
    spots: { kiosk: { x: 190, y: 164 }, tablet: { x: 356, y: 158 }, "payment-terminal": { x: 360, y: 159 } },
    defaultSpot: { x: 190, y: 164 },
    sign: { x: 250, y: 14, w: 120, h: 18 },
  },
  classroom: {
    back: () => (
      <g>
        <Sh d={rect(60, 30, 200, 96)} fill={C.g8} />
        <L d="M80 56 h60 M80 74 l30 20 l30 -26 M170 60 h60 M170 80 h40" sw={1.8} color={C.paper} />
        <L d="M60 130 H260" sw={2.4} />
        <Sh d={rect(300, 40, 50, 60)} fill={C.paper} /><circle cx={325} cy={70} r={18} fill="none" stroke={ink} strokeWidth={1.6} />
      </g>
    ),
    front: () => <g>{table(120, 220, 188)}{table(260, 360, 196)}</g>,
    marks: {
      desk: { x: 130, y: FLOOR_Y, facing: "right", seated: true, behind: true, surface: 188 },
      "back-row": { x: 272, y: FLOOR_Y, facing: "right", seated: true, behind: true, surface: 196, scale: 0.96 },
      teacher: { x: 30, y: FLOOR_Y, facing: "right" },
      board: { x: 90, y: FLOOR_Y, facing: "left" },
    },
    order: ["desk", "teacher", "back-row", "board"],
    spots: { tv: { x: 160, y: 78 }, laptop: { x: 186, y: 184 }, tablet: { x: 190, y: 178 }, phone: { x: 196, y: 183 } },
    defaultSpot: { x: 160, y: 78 },
  },
};
