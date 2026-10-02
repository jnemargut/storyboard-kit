/**
 * Everyday places (v3): the front door, a pharmacy counter, a doctor's exam room, a warehouse, a train platform,
 * inside an elevator, and a restaurant table for four. Same conventions as scenes-work.tsx: every top that holds
 * a device is a real surface (tests/scenes.test.ts checks nothing floats), seats are at FLOOR_Y - 44, and the far
 * side of the room is drawn lighter so people in front read first.
 */
import type { SceneDef } from "./scenes";
import { Sh } from "./scenes";
import { Clock, Plant } from "./scene-decor";
import { C, FLOOR_Y } from "./tokens";

const ink = C.ink;
const rect = (x: number, y: number, w: number, h: number) => `M${x} ${y} h${w} v${h} h${-w} Z`;
const L = ({ d, sw = 1.5, color = ink }: { d: string; sw?: number; color?: string }) => (
  <path d={d} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
);
const T = ({ x, y, s, children, fill = ink }: { x: number; y: number; s: number; children: string; fill?: string }) => (
  <text x={x} y={y} textAnchor="middle" fontFamily="Permanent Marker" fontSize={s} fill={fill}>{children}</text>
);
const SEAT = FLOOR_Y - 44;

/** A side-view chair; `dir` is the way the sitter faces. */
function Chair({ x, dir, fill = C.g4 }: { x: number; dir: 1 | -1; fill?: string }) {
  return (
    <g>
      <Sh d={`M${x - 16 * dir} ${SEAT} V${SEAT - 52} h${-6 * dir} V${SEAT + 4} Z`} fill={fill} />
      <Sh d={rect(Math.min(x - 16 * dir, x + 14 * dir), SEAT, 30, 5)} fill={fill} sw={1.6} />
      <L d={`M${x - 13 * dir} ${SEAT + 5} V${FLOOR_Y} M${x + 11 * dir} ${SEAT + 5} V${FLOOR_Y}`} sw={2.2} />
    </g>
  );
}

/** A cardboard box: top at `top`, sitting on `base`. */
function Box({ x, w, top, base = FLOOR_Y, fill = C.g4 }: { x: number; w: number; top: number; base?: number; fill?: string }) {
  return (
    <g>
      <Sh d={rect(x, top, w, base - top)} fill={fill} sw={1.6} />
      <L d={`M${x + w / 2 - 4} ${top} v${Math.min(10, (base - top) / 2)} M${x + w / 2 + 4} ${top} v${Math.min(10, (base - top) / 2)}`} sw={1.1} color={C.g7} />
    </g>
  );
}

// device sizes as placed in a scene (layout.ts PLACED_SCALE × DEVICE_DEFS), to sit things on tops exactly
const H = { desktop: 60, laptop: 40.32, tablet: 36, phone: 20.16, terminal: 23.04, tv: 64.96, kiosk: 128 };
const on = (top: number, h: number) => top - h / 2;

export const PLACE_SCENES: Record<string, SceneDef> = {
  // ---------------------------------------------------------------- the front door: a porch, a parcel, the doorbell
  "front-door": {
    back: () => (
      <g>
        {/* siding */}
        <Sh d={rect(0, 10, 400, FLOOR_Y - 22)} fill={C.g1} sw={1.2} />
        {Array.from({ length: 11 }, (_, i) => <L key={i} d={`M0 ${28 + i * 18} H400`} sw={0.9} color={C.g4} />)}
        {/* the door, with its frame, a little window and a handle */}
        <Sh d={rect(150, 66, 84, FLOOR_Y - 66)} fill={C.paper} sw={2.4} />
        <Sh d={rect(158, 74, 68, FLOOR_Y - 74)} fill={C.g4} />
        <Sh d={rect(176, 86, 32, 26)} fill={C.paper} sw={1.4} /><L d="M192 86 v26 M176 99 h32" sw={1.1} />
        <L d="M168 120 h44 M168 160 h44" sw={1.1} color={C.g7} />
        <circle cx={216} cy={162} r={3.2} fill={C.g2} stroke={ink} strokeWidth={1.4} />
        {/* doorbell and house number */}
        <Sh d={rect(244, 146, 9, 15)} fill={C.g2} sw={1.3} /><circle cx={248.5} cy={155} r={2} fill={ink} />
        <Sh d={rect(244, 100, 26, 18)} fill={C.paper} sw={1.3} /><T x={257} y={114} s={11}>42</T>
        {/* a porch light and a window to the side */}
        <L d="M128 92 h8" sw={2} /><Sh d="M124 92 h16 l-3 16 h-10 Z" fill={C.caption} sw={1.4} />
        <Sh d={rect(292, 60, 84, 70)} fill={C.paper} /><L d="M334 60 V130 M292 95 H376" sw={1.5} />
        <Sh d={rect(288, 130, 92, 6)} fill={C.g2} sw={1.4} />
        <Plant x={46} y={FLOOR_Y} s={1.2} />
      </g>
    ),
    front: () => (
      <g>
        {/* the porch boards and a mat */}
        <Sh d={rect(0, FLOOR_Y, 400, 8)} fill={C.g4} sw={1.6} />
        <Sh d="M156 233 h72 l6 5 h-84 Z" fill={C.g5} sw={1.3} />
        {/* the parcel left by the door */}
        <Box x={252} w={44} top={204} />
        <Sh d={rect(258, 210, 20, 10)} fill={C.paper} sw={1} />
      </g>
    ),
    marks: {
      doorway: { x: 192, y: FLOOR_Y, facing: "right", behind: true },
      porch: { x: 320, y: FLOOR_Y, facing: "left" },
      path: { x: 380, y: FLOOR_Y, facing: "left" },
      parcel: { x: 106, y: FLOOR_Y, facing: "right" },
    },
    order: ["porch", "doorway", "path", "parcel"],
    spots: {
      phone: { x: 274, y: on(204, H.phone) },
      tablet: { x: 274, y: on(204, H.tablet) },
    },
    surfaces: [204],
    defaultSpot: { x: 274, y: on(204, H.phone) },
  },

  // ---------------------------------------------------------------- a pharmacy: pickup counter, shelves of boxes behind
  pharmacy: {
    back: () => (
      <g>
        {/* shelves stocked with boxes and bottles, behind the counter */}
        <Sh d={rect(170, 20, 226, 150)} fill={C.g1} sw={1.6} />
        {[62, 104, 146].map((y) => <L key={y} d={`M170 ${y} H396`} sw={2.2} />)}
        {[62, 104, 146].map((y, r) => Array.from({ length: 9 }, (_, i) => {
          const x = 176 + i * 24;
          const h = 14 + ((i * 5 + r * 3) % 4) * 5;
          return i % 3 === 1
            ? <Sh key={`${y}-${i}`} d={`M${x + 4} ${y} v${-h + 4} q0 -4 4 -4 h4 q4 0 4 4 v${h - 4} Z`} fill={C.paper} sw={1.1} />
            : <Sh key={`${y}-${i}`} d={rect(x, y - h, 18, h)} fill={[C.g2, C.g4, C.paper][(i + r) % 3]} sw={1.1} />;
        }))}
        {/* a cross sign and the waiting line rope */}
        <Sh d="M60 34 h14 v14 h14 v14 h-14 v14 h-14 v-14 h-14 v-14 h14 Z" fill={C.g2} />
        <L d="M28 196 V234 M120 196 V234" sw={2.4} /><path d="M28 198 Q74 214 120 198" fill="none" stroke={C.g5} strokeWidth={2.4} />
        <Sh d={rect(22, 230, 12, 4)} fill={C.g7} sw={1.2} /><Sh d={rect(114, 230, 12, 4)} fill={C.g7} sw={1.2} />
      </g>
    ),
    front: () => (
      <g>
        <Sh d={rect(170, 168, 222, FLOOR_Y - 168 + 2)} fill={C.g2} />
        <Sh d={rect(162, 160, 238, 9)} fill={C.g4} />
        <L d="M170 198 H392" sw={1.2} />
        {/* a paper bag waiting for pickup */}
        <Sh d="M330 160 v-22 h28 v22 Z" fill={C.paper} sw={1.4} /><L d="M336 138 l3 -4 h16 l3 4" sw={1.2} />
      </g>
    ),
    marks: {
      counter: { x: 140, y: FLOOR_Y, facing: "right" },
      pharmacist: { x: 286, y: FLOOR_Y, facing: "left", behind: true, surface: 160 },
      queue: { x: 70, y: FLOOR_Y, facing: "right" },
      shelves: { x: 380, y: FLOOR_Y, facing: "left", behind: true },
    },
    order: ["counter", "pharmacist", "queue", "shelves"],
    spots: {
      "payment-terminal": { x: 196, y: on(160, H.terminal) },
      tablet: { x: 214, y: on(160, H.tablet) },
      phone: { x: 214, y: on(160, H.phone) },
      desktop: { x: 248, y: on(160, H.desktop), behind: true },
      kiosk: { x: 26, y: on(FLOOR_Y, H.kiosk) },
    },
    sign: { x: 200, y: 0, w: 170, h: 18 },
    defaultSpot: { x: 196, y: on(160, H.terminal) },
  },

  // ---------------------------------------------------------------- a doctor's exam room: exam table, a desk with the computer
  "exam-room": {
    back: () => (
      <g>
        {/* a chart on the wall, the hand sanitizer, a cabinet */}
        <Sh d={rect(30, 34, 74, 56)} fill={C.paper} />
        <path d="M44 74 q8 -26 16 -2 q4 -16 10 -4 q6 -18 14 4" fill="none" stroke={C.g5} strokeWidth={1.4} />
        <T x={67} y={50} s={8} fill={C.g7}>HEART</T>
        <Sh d={rect(130, 70, 14, 26)} fill={C.g2} sw={1.4} /><L d="M137 70 v-5 h5" sw={1.6} />
        <Clock x={230} y={50} />
        <Sh d={rect(278, 30, 110, 56)} fill={C.g2} /><L d="M333 30 V86 M326 58 v8 M340 58 v8" sw={1.4} />
        {/* the doctor's rolling stool */}
        <Sh d={rect(218, SEAT, 34, 7)} fill={C.g5} sw={1.6} />
        <L d={`M235 ${SEAT + 7} V${FLOOR_Y - 8} M220 ${FLOOR_Y - 3} L235 ${FLOOR_Y - 8} L250 ${FLOOR_Y - 3}`} sw={2.2} />
      </g>
    ),
    front: () => (
      <g>
        {/* exam table with its paper roll, and a step for the feet */}
        <Sh d={rect(36, 166, 132, 12)} fill={C.g4} />
        <Sh d="M40 166 h120 v-4 h-120 Z" fill={C.paper} sw={1.1} />
        <Sh d="M36 166 l-8 -28 h16 l8 28 Z" fill={C.g4} sw={1.6} />
        <Sh d={rect(48, 178, 108, FLOOR_Y - 178)} fill={C.g2} />
        <L d="M48 200 H156 M100 200 v34" sw={1.2} />
        <Sh d={rect(150, 212, 44, 22)} fill={C.g5} sw={1.6} />
        {/* the desk along the right wall */}
        <Sh d={rect(290, 172, 106, 8)} fill={C.g4} />
        <Sh d={rect(344, 180, 48, FLOOR_Y - 180)} fill={C.g2} /><L d="M344 200 h48 M362 190 h12 M362 214 h12" sw={1.3} />
        <L d="M298 180 V234" sw={2.4} />
      </g>
    ),
    marks: {
      "exam-table": { x: 116, y: 212, facing: "right", seated: true },
      doctor: { x: 236, y: FLOOR_Y, facing: "left", seated: true },
      standing: { x: 260, y: FLOOR_Y, facing: "left" },
      door: { x: 380, y: FLOOR_Y, facing: "left" },
    },
    order: ["exam-table", "doctor", "standing", "door"],
    spots: {
      desktop: { x: 330, y: on(172, H.desktop) },
      laptop: { x: 330, y: on(172, H.laptop) },
      tablet: { x: 316, y: on(172, H.tablet) },
      phone: { x: 316, y: on(172, H.phone) },
    },
    surfaces: [172],
    defaultSpot: { x: 330, y: on(172, H.desktop) },
  },

  // ---------------------------------------------------------------- a warehouse: tall racks, a pallet, the packing table
  warehouse: {
    back: () => (
      <g>
        {/* the racks: uprights, beams and boxes, lighter as they go back */}
        {[[10, 150], [176, 104]].map(([x0, w]) => (
          <g key={x0}>
            <L d={`M${x0} 10 V${FLOOR_Y} M${x0 + w} 10 V${FLOOR_Y}`} sw={2.6} />
            {[64, 128, 192].map((y) => <Sh key={y} d={rect(x0, y, w, 5)} fill={C.g5} sw={1.4} />)}
            {[64, 128, 192, FLOOR_Y].map((y, r) => Array.from({ length: Math.floor(w / 34) }, (_, i) => {
              const h = 26 + ((i + r) % 3) * 8;
              return <Box key={`${y}-${i}`} x={x0 + 6 + i * 34} w={28} top={y - h} base={y} fill={(i + r) % 2 ? C.g2 : C.g4} />;
            }))}
          </g>
        ))}
        {/* aisle marker and the overhead light */}
        <Sh d={rect(130, 0, 30, 18)} fill={C.caption} sw={1.4} /><T x={145} y={14} s={11}>B4</T>
        <L d="M330 0 v18" sw={1.2} /><Sh d="M314 18 h32 l-6 10 h-20 Z" fill={C.g2} sw={1.3} />
      </g>
    ),
    front: () => (
      <g>
        {/* the packing table with tape and a box half-packed */}
        <Sh d={rect(300, 176, 96, 8)} fill={C.g4} />
        <L d="M308 184 V234 M388 184 V234 M308 214 H388" sw={2.4} />
        <Box x={346} w={40} top={150} base={176} />
        <circle cx={330} cy={170} r={6} fill={C.g2} stroke={ink} strokeWidth={1.4} />
        {/* a pallet of boxes in the aisle */}
        <Sh d={rect(134, 226, 60, 8)} fill={C.g5} sw={1.5} />
        <Box x={138} w={26} top={196} base={226} /><Box x={164} w={26} top={204} base={226} fill={C.g2} />
        <L d={`M0 ${FLOOR_Y + 2} H400`} sw={1} color={C.g4} />
      </g>
    ),
    marks: {
      aisle: { x: 106, y: FLOOR_Y, facing: "right" },
      rack: { x: 228, y: FLOOR_Y, facing: "left" },
      packing: { x: 290, y: FLOOR_Y, facing: "right" },
      dock: { x: 30, y: FLOOR_Y, facing: "right" },
    },
    order: ["aisle", "packing", "rack", "dock"],
    spots: {
      tablet: { x: 330, y: on(176, H.tablet) },
      phone: { x: 324, y: on(176, H.phone) },
      laptop: { x: 326, y: on(176, H.laptop) },
      desktop: { x: 326, y: on(176, H.desktop) },
      kiosk: { x: 270, y: on(FLOOR_Y, H.kiosk) },
    },
    surfaces: [176],
    defaultSpot: { x: 330, y: on(176, H.tablet) },
  },

  // ---------------------------------------------------------------- a train platform: the train waiting, a departures board, a bench
  "train-platform": {
    back: () => (
      <g>
        {/* the train's side, doors open in the middle */}
        <Sh d={rect(-4, 40, 300, 162)} fill={C.g2} />
        <L d="M-4 60 H296" sw={1.4} />
        {[14, 214].map((x) => <g key={x}><Sh d={rect(x, 76, 60, 40)} fill={C.paper} sw={1.6} /><L d={`M${x + 30} 76 v40`} sw={1.2} /></g>)}
        <Sh d={rect(104, 70, 80, 132)} fill={C.g4} />
        <Sh d={rect(112, 78, 64, 124)} fill={C.g1} sw={1.4} />
        <Sh d={rect(-4, 194, 300, 8)} fill={C.caption} sw={1.4} />
        {/* the platform's canopy pillar and a departures board */}
        <Sh d={rect(300, 0, 10, FLOOR_Y)} fill={C.g4} />
        <Sh d={rect(300, 24, 92, 44)} fill={C.g7} />
        <L d="M308 38 h40 M308 48 h52 M308 58 h34" sw={1.6} color={C.g2} />
        {/* the yellow line along the platform edge */}
        <L d={`M0 ${FLOOR_Y - 14} H296`} sw={3} color={C.caption} />
      </g>
    ),
    front: () => (
      <g>
        {/* a bench on the platform */}
        <Sh d={rect(318, SEAT, 78, 7)} fill={C.g4} />
        <Sh d={rect(318, SEAT - 30, 78, 6)} fill={C.g4} sw={1.6} />
        <L d={`M326 ${SEAT + 7} V${FLOOR_Y} M388 ${SEAT + 7} V${FLOOR_Y} M330 ${SEAT - 24} V${SEAT} M384 ${SEAT - 24} V${SEAT}`} sw={2.2} />
      </g>
    ),
    marks: {
      platform: { x: 210, y: FLOOR_Y, facing: "left" },
      doors: { x: 144, y: FLOOR_Y, facing: "right" },
      bench: { x: 352, y: FLOOR_Y, facing: "left", seated: true },
      edge: { x: 50, y: FLOOR_Y, facing: "right" },
    },
    order: ["platform", "bench", "doors", "edge"],
    spots: {
      tv: { x: 346, y: 46, wall: true, scale: 0.5 },
      kiosk: { x: 270, y: on(FLOOR_Y, H.kiosk) },
      phone: { x: 376, y: on(SEAT, H.phone) },
    },
    surfaces: [SEAT],
    sign: { x: 104, y: 44, w: 80, h: 14 },
    defaultSpot: { x: 270, y: on(FLOOR_Y, H.kiosk) },
  },

  // ---------------------------------------------------------------- inside an elevator: back wall, handrail, the button panel
  elevator: {
    back: () => (
      <g>
        {/* the car: back wall panels and a handrail; side walls in perspective */}
        <Sh d={rect(70, 14, 260, FLOOR_Y - 14)} fill={C.g1} />
        <L d="M156 14 V234 M244 14 V234" sw={1.1} color={C.g4} />
        <path d="M0 0 L70 14 V234 L0 252 Z" fill={C.g2} stroke={ink} strokeWidth={1.8} />
        <path d="M400 0 L330 14 V234 L400 252 Z" fill={C.g2} stroke={ink} strokeWidth={1.8} />
        <L d="M82 150 H318" sw={3} />
        <L d="M90 150 v8 M310 150 v8" sw={2} />
        {/* a mirror strip and the ceiling light */}
        <Sh d={rect(86, 30, 50, 100)} fill={C.paper} sw={1.4} /><L d="M96 50 l14 -12 M98 70 l26 -22" sw={1} color={C.g4} />
        <Sh d={rect(150, 0, 100, 8)} fill={C.paper} sw={1.4} />
        {/* the button panel and floor display on the right side wall */}
        <path d="M352 70 L380 64 V170 L352 172 Z" fill={C.g4} stroke={ink} strokeWidth={1.6} />
        {[84, 100, 116, 132, 148].map((y) => <g key={y}><circle cx={361} cy={y} r={3.4} fill={C.paper} stroke={ink} strokeWidth={1.1} /><circle cx={372} cy={y - 1} r={3.4} fill={C.paper} stroke={ink} strokeWidth={1.1} /></g>)}
        <path d="M350 40 L382 34 V54 L350 58 Z" fill={C.g7} stroke={ink} strokeWidth={1.4} />
        <text x={366} y={52} textAnchor="middle" fontFamily="Permanent Marker" fontSize={11} fill={C.caption}>12</text>
      </g>
    ),
    front: () => <L d={`M0 ${FLOOR_Y + 8} L70 ${FLOOR_Y} H330 L400 ${FLOOR_Y + 8}`} sw={1.4} color={C.g5} />,
    marks: {
      left: { x: 120, y: FLOOR_Y, facing: "right" },
      center: { x: 200, y: FLOOR_Y, facing: "right" },
      right: { x: 280, y: FLOOR_Y, facing: "left" },
      panel: { x: 330, y: FLOOR_Y, facing: "right" },
    },
    order: ["left", "right", "center", "panel"],
    spots: {
      tablet: { x: 200, y: 84, wall: true },
      tv: { x: 200, y: 82, wall: true, scale: 0.6 },
    },
    defaultSpot: { x: 200, y: 84 },
  },

  // ---------------------------------------------------------------- a restaurant table for four: two at the ends, two behind
  "restaurant-group": {
    back: () => (
      <g>
        {/* a framed print, wall lamps, and a booth bench along the back */}
        <Sh d={rect(160, 30, 80, 56)} fill={C.paper} /><path d="M168 78 q16 -30 32 -6 q10 -14 32 6" fill={C.g1} stroke={C.g5} strokeWidth={1.2} />
        {[110, 290].map((x) => <g key={x}><L d={`M${x} 60 v10`} sw={1.6} /><Sh d={`M${x - 10} 60 q10 -16 20 0 Z`} fill={C.caption} sw={1.3} /></g>)}
        <Sh d={rect(94, 120, 212, 70)} fill={C.g5} />
        <Sh d={rect(94, SEAT, 212, 10)} fill={C.g4} />
        <L d={`M100 ${SEAT + 10} V${FLOOR_Y} M300 ${SEAT + 10} V${FLOOR_Y}`} sw={2.2} />
        <Chair x={60} dir={1} /><Chair x={340} dir={-1} />
        <Plant x={18} y={FLOOR_Y} s={1.1} />
      </g>
    ),
    front: () => (
      <g>
        <Sh d={rect(86, 180, 228, 8)} fill={C.g4} />
        <L d="M110 188 V234 M290 188 V234" sw={2.6} />
        {/* plates, glasses and a shared dish */}
        {[132, 268].map((x) => <ellipse key={x} cx={x} cy={178} rx={15} ry={3} fill={C.paper} stroke={ink} strokeWidth={1.3} />)}
        <Sh d="M188 180 q12 -16 24 0 Z" fill={C.g2} sw={1.4} />
        {[160, 240].map((x) => <Sh key={x} d={`M${x - 4} 180 l-1 -14 h10 l-1 14 Z`} fill={C.paper} sw={1.2} />)}
      </g>
    ),
    marks: {
      "end-left": { x: 60, y: FLOOR_Y, facing: "right", seated: true, behind: true, surface: 180 },
      "end-right": { x: 340, y: FLOOR_Y, facing: "left", seated: true, behind: true, surface: 180 },
      "back-left": { x: 160, y: FLOOR_Y, facing: "right", seated: true, behind: true, surface: 180, angle: "front" },
      "back-right": { x: 240, y: FLOOR_Y, facing: "left", seated: true, behind: true, surface: 180, angle: "front" },
      waiter: { x: 384, y: FLOOR_Y, facing: "left" },
    },
    order: ["end-left", "end-right", "back-left", "back-right", "waiter"],
    spots: {
      phone: { x: 214, y: on(180, H.phone) },
      tablet: { x: 214, y: on(180, H.tablet) },
      "payment-terminal": { x: 290, y: on(180, H.terminal) },
    },
    sign: { x: 160, y: 96, w: 80, h: 16 },
    defaultSpot: { x: 214, y: on(180, H.phone) },
  },
};
