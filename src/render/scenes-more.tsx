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
