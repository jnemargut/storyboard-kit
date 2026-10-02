/**
 * Work scenes (v3): the office, the home office and the meeting room redrawn, plus an open-plan office, a break
 * room, an office reception and a coworking space. Every desk and table has a real top that devices rest on
 * (tests/scenes.test.ts checks nothing floats), chairs and desks sit on the floor, and the far side of the room
 * is drawn lighter so people in front read first.
 */
import type { SceneDef } from "./scenes";
import { Sh } from "./scenes";
import { Clock, Mug, Plant } from "./scene-decor";
import { C, FLOOR_Y } from "./tokens";

const ink = C.ink;
const rect = (x: number, y: number, w: number, h: number) => `M${x} ${y} h${w} v${h} h${-w} Z`;
const L = ({ d, sw = 1.5, color = ink }: { d: string; sw?: number; color?: string }) => (
  <path d={d} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
);
const T = ({ x, y, s, children, fill = ink }: { x: number; y: number; s: number; children: string; fill?: string }) => (
  <text x={x} y={y} textAnchor="middle" fontFamily="Permanent Marker" fontSize={s} fill={fill}>{children}</text>
);

/** A desk: top at `top` from x0 to x1, legs to the floor, optional drawer pedestal at the right end. */
function Desk({ x0, x1, top, drawers = true, fill = C.g4 }: { x0: number; x1: number; top: number; drawers?: boolean; fill?: string }) {
  return (
    <g>
      <Sh d={rect(x0, top, x1 - x0, 8)} fill={fill} />
      <L d={`M${x0 + 8} ${top + 8} V${FLOOR_Y} M${drawers ? x1 - 52 : x1 - 8} ${top + 8} V${drawers ? top + 8 : FLOOR_Y}`} sw={2.4} />
      {drawers ? (
        <g>
          <Sh d={rect(x1 - 50, top + 8, 46, FLOOR_Y - top - 8)} fill={C.g2} />
          {[0, 1, 2].map((i) => {
            const y = top + 8 + ((FLOOR_Y - top - 8) / 3) * i;
            return <g key={i}><L d={`M${x1 - 50} ${y} h46`} sw={1.2} /><L d={`M${x1 - 33} ${y + 9} h12`} sw={1.8} /></g>;
          })}
        </g>
      ) : null}
    </g>
  );
}

/** An office chair seen from the side: seat back, gas stem, five-star base on the floor. Facing right. */
function OfficeChair({ x, seat = 196, back = true }: { x: number; seat?: number; back?: boolean }) {
  return (
    <g>
      {back ? <Sh d={`M${x - 20} ${seat} V${seat - 44} Q${x - 20} ${seat - 54} ${x - 10} ${seat - 54} H${x - 6} Q${x + 2} ${seat - 54} ${x} ${seat - 44} V${seat}`} fill={C.g5} /> : null}
      <L d={`M${x - 4} ${seat + 4} V${FLOOR_Y - 8} M${x - 22} ${FLOOR_Y - 4} L${x - 4} ${FLOOR_Y - 9} L${x + 14} ${FLOOR_Y - 4}`} sw={2.2} />
      {[x - 22, x - 4, x + 14].map((cx) => <circle key={cx} cx={cx} cy={FLOOR_Y - 2.5} r={2.6} fill={C.g7} stroke={ink} strokeWidth={1.2} />)}
    </g>
  );
}

/** A keyboard lying on a desk top. */
const Keyboard = ({ x, top }: { x: number; top: number }) => <Sh d={`M${x} ${top} l4 -5 h34 l4 5 Z`} fill={C.paper} sw={1.3} />;

/** A city seen through a window: rooftops below a sky line. */
function Skyline({ x0, x1, base }: { x0: number; x1: number; base: number }) {
  const blocks: [number, number][] = [];
  for (let x = x0 + 4, i = 0; x < x1 - 6; i++) { const w = 14 + ((i * 7) % 12); blocks.push([x, 18 + ((i * 13) % 30)]); x += w + 3; }
  return <g>{blocks.map(([x, h], i) => <rect key={i} x={x} y={base - h} width={Math.min(14 + ((i * 7) % 12), x1 - 4 - x)} height={h} fill={i % 2 ? C.g2 : C.g1} stroke={C.g5} strokeWidth={1} />)}</g>;
}

/** A window with mullions and the city outside. */
function CityWindow({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <Sh d={rect(x, y, w, h)} fill={C.paper} />
      <Skyline x0={x} x1={x + w} base={y + h - 2} />
      <L d={`M${x + w / 3} ${y} V${y + h} M${x + (2 * w) / 3} ${y} V${y + h}`} sw={1.6} />
      <Sh d={rect(x - 4, y + h, w + 8, 5)} fill={C.g2} sw={1.4} />
    </g>
  );
}

/** Ceiling light panels along the top edge. */
const CeilingLights = ({ xs }: { xs: number[] }) => <g>{xs.map((x) => <Sh key={x} d={rect(x, 0, 64, 6)} fill={C.paper} sw={1.4} />)}</g>;

/** A sticky note pinned to a wall or a divider. */
const Note = ({ x, y }: { x: number; y: number }) => <Sh d={rect(x, y, 11, 11)} fill={C.caption} sw={1.1} />;

/** A flat-screen monitor with its stand, standing on a desk top (gray: someone else's, not the product). */
function Monitor({ x, top, w = 44, h = 30 }: { x: number; top: number; w?: number; h?: number }) {
  return (
    <g>
      <Sh d={rect(x - w / 2, top - h - 9, w, h)} fill={C.g7} sw={1.6} />
      <rect x={x - w / 2 + 3} y={top - h - 6} width={w - 6} height={h - 6} fill={C.g2} stroke="none" />
      <L d={`M${x - w / 2 + 7} ${top - h + 1} h${w * 0.45} M${x - w / 2 + 7} ${top - h + 7} h${w * 0.3}`} sw={1.2} color={C.g5} />
      <L d={`M${x} ${top - 9} V${top - 2} M${x - 8} ${top} h16`} sw={2} />
    </g>
  );
}

// device sizes as placed in a scene (layout.ts PLACED_SCALE × DEVICE_DEFS), to sit things on tops exactly
const H = { desktop: 60, laptop: 40.32, tablet: 36, phone: 20.16, speaker: 0, terminal: 23.04, tv: 64.96, kiosk: 128 };
const on = (top: number, h: number) => top - h / 2;

export const WORK_SCENES: Record<string, SceneDef> = {
  // ---------------------------------------------------------------- a desk in an office: cubicle divider, the city outside
  office: {
    back: () => (
      <g>
        <CeilingLights xs={[70, 250]} />
        <Sh d={rect(8, 92, 40, 142)} fill={C.g1} /><circle cx={40} cy={166} r={2.2} fill={ink} />
        <CityWindow x={62} y={34} w={130} h={84} />
        {/* the next row over, further back: a lighter divider with two monitors peeking over */}
        <Sh d={rect(62, 150, 124, FLOOR_Y - 150)} fill={C.g1} sw={1.4} />
        <Monitor x={92} top={150} w={30} h={20} /><Monitor x={150} top={150} w={30} h={20} />
        {/* this desk's divider: fabric, with notes and a calendar pinned on */}
        <Sh d={rect(206, 112, 190, 64)} fill={C.g2} />
        <L d="M206 120 H396" sw={1} color={C.g5} />
        <Note x={226} y={128} /><Note x={240} y={134} /><Note x={360} y={126} />
        <Sh d={rect(328, 124, 24, 22)} fill={C.paper} sw={1.2} /><L d="M328 130 h24 M334 136 h3 M340 136 h3 M346 136 h3 M334 141 h3 M340 141 h3" sw={1} />
        <OfficeChair x={236} />
      </g>
    ),
    front: () => (
      <g>
        <Desk x0={206} x1={396} top={176} />
        <Keyboard x={270} top={176} />
        <Mug x={326} y={176} />
        <Sh d={rect(304, 171, 18, 5)} fill={C.paper} sw={1.1} />
        <L d="M386 176 v-24 l-10 -10" sw={2} /><Sh d="M366 136 l13 -5 l4 9 Z" fill={C.g5} sw={1.4} />
        <Plant x={196} y={FLOOR_Y} s={0.8} />
      </g>
    ),
    marks: {
      chair: { x: 236, y: FLOOR_Y, facing: "right", seated: true, behind: true, surface: 176 },
      desk: { x: 176, y: FLOOR_Y, facing: "right" },
      window: { x: 120, y: FLOOR_Y, facing: "right" },
      door: { x: 28, y: FLOOR_Y, facing: "right" },
    },
    order: ["chair", "desk", "window", "door"],
    spots: {
      desktop: { x: 296, y: on(176, H.desktop) },
      laptop: { x: 292, y: on(176, H.laptop) },
      phone: { x: 352, y: on(176, H.phone) },
      tablet: { x: 350, y: on(176, H.tablet) },
      "smart-speaker": { x: 370, y: 166 },
    },
    defaultSpot: { x: 296, y: on(176, H.desktop) },
  },

  // ---------------------------------------------------------------- working from home: a desk by the window, shelves, a cabinet
  "home-office": {
    back: () => (
      <g>
        <Sh d={rect(6, 92, 40, 142)} fill={C.g1} /><circle cx={38} cy={166} r={2.2} fill={ink} />
        {/* a window onto the garden, with a curtain */}
        <Sh d={rect(64, 34, 106, 90)} fill={C.paper} />
        <path d="M70 120 Q92 92 112 120 M108 120 Q128 86 152 120" fill={C.g1} stroke={C.g5} strokeWidth={1.2} />
        <circle cx={140} cy={56} r={9} fill={C.g1} stroke={C.g5} strokeWidth={1.2} />
        <L d="M117 34 V124 M64 79 H170" sw={1.5} />
        <Sh d="M60 28 h22 q-6 50 2 100 h-24 Z" fill={C.g2} />
        <Sh d={rect(60, 124, 114, 5)} fill={C.g2} sw={1.4} />
        {/* floating shelves with books, a frame and a plant */}
        <L d="M232 70 H350 M232 112 H350" sw={2.4} />
        {[238, 248, 258, 270].map((x, i) => <Sh key={x} d={rect(x, 70 - [26, 22, 28, 18][i], 9, [26, 22, 28, 18][i])} fill={[C.g4, C.g5, C.g2, C.g7][i]} sw={1.1} />)}
        <Sh d="M286 70 l14 -26 l7 3 l-12 23 Z" fill={C.g4} sw={1.1} />
        <Sh d={rect(316, 46, 24, 24)} fill={C.paper} sw={1.3} /><L d="M320 64 q6 -10 10 -4 q3 -6 6 4" sw={1} />
        <Plant x={258} y={112} s={0.55} />
        <Sh d={rect(292, 92, 22, 20)} fill={C.paper} sw={1.2} />
        <OfficeChair x={212} />
      </g>
    ),
    front: () => (
      <g>
        <Desk x0={186} x1={330} top={176} drawers={false} fill={C.g2} />
        <Sh d={rect(186, 184, 144, 10)} fill={C.g2} sw={1.4} />
        <L d="M250 189 h16" sw={1.8} />
        <Mug x={308} y={176} />
        <L d="M320 176 v-22 l-10 -9" sw={2} /><Sh d="M300 140 l12 -4 l4 9 Z" fill={C.g5} sw={1.4} />
        {/* a low cabinet with a plant on top */}
        <Sh d={rect(344, 170, 50, 64)} fill={C.g4} /><L d="M369 170 V234 M362 200 v8 M376 200 v8" sw={1.4} />
        <Plant x={370} y={170} s={0.75} />
        <ellipse cx={240} cy={238} rx={96} ry={5} fill={C.g2} stroke={ink} strokeWidth={1.3} />
      </g>
    ),
    marks: {
      "desk-chair": { x: 212, y: FLOOR_Y, facing: "right", seated: true, behind: true, surface: 176 },
      bookshelf: { x: 296, y: FLOOR_Y, facing: "left" },
      door: { x: 26, y: FLOOR_Y, facing: "right" },
    },
    order: ["desk-chair", "bookshelf", "door"],
    spots: {
      laptop: { x: 266, y: on(176, H.laptop) },
      desktop: { x: 270, y: on(176, H.desktop) },
      phone: { x: 290, y: on(176, H.phone) },
      tablet: { x: 288, y: on(176, H.tablet) },
      "smart-speaker": { x: 354, y: 160 },
    },
    surfaces: [170],
    defaultSpot: { x: 266, y: on(176, H.laptop) },
  },

  // ---------------------------------------------------------------- a meeting room: long table, whiteboard, a screen on the wall
  "meeting-room": {
    back: () => (
      <g>
        <L d="M180 0 v20 M260 0 v20" sw={1.2} />
        <Sh d="M168 20 h24 l-4 8 h-16 Z" fill={C.g2} sw={1.3} /><Sh d="M248 20 h24 l-4 8 h-16 Z" fill={C.g2} sw={1.3} />
        {/* whiteboard with a sketch on it and a marker tray */}
        <Sh d={rect(16, 40, 104, 76)} fill={C.paper} />
        <L d="M28 58 h30 M28 70 h22 M66 60 l12 12 l14 -18 M30 96 h20 l8 -8 h22" sw={1.4} />
        {[[94, 46], [106, 46], [94, 58]].map(([x, y]) => <Note key={`${x}${y}`} x={x} y={y} />)}
        <Sh d={rect(30, 116, 76, 4)} fill={C.g4} sw={1.2} />
        {/* the screen on the wall: dark until the product shows up on it */}
        <Sh d={rect(250, 48, 100, 62)} fill={C.g7} />
        <L d="M300 110 v8 M290 118 h20" sw={2} />
        <Clock x={376} y={40} r={10} />
        {/* chair backs on the far side of the table */}
        {[150, 192, 234, 276].map((x) => <Sh key={x} d={`M${x - 12} 182 v-28 q0 -8 8 -8 h8 q8 0 8 8 v28 Z`} fill={C.g4} sw={1.5} />)}
      </g>
    ),
    front: () => (
      <g>
        <Sh d="M120 182 H330 L322 194 H128 Z" fill={C.g4} />
        <L d="M144 194 V234 M306 194 V234" sw={2.6} />
        <Sh d="M218 182 q12 -6 24 0 Z" fill={C.g7} sw={1.2} />
        <Mug x={178} y={182} steam={false} /><Mug x={286} y={182} steam={false} />
        <Sh d={rect(250, 178, 18, 4)} fill={C.paper} sw={1} />
        <Plant x={384} y={FLOOR_Y} s={1} />
      </g>
    ),
    marks: {
      "table-left": { x: 112, y: FLOOR_Y, facing: "right", seated: true, behind: true, surface: 182 },
      "table-right": { x: 338, y: FLOOR_Y, facing: "left", seated: true, behind: true, surface: 182 },
      whiteboard: { x: 44, y: FLOOR_Y, facing: "right" },
      screen: { x: 300, y: 79 },
    },
    order: ["table-left", "table-right", "whiteboard"],
    spots: {
      tv: { x: 300, y: 79, wall: true, scale: 0.56 },
      laptop: { x: 196, y: on(182, H.laptop) },
      phone: { x: 262, y: on(182, H.phone) },
      tablet: { x: 262, y: on(182, H.tablet) },
      "smart-speaker": { x: 230, y: 172 },
    },
    defaultSpot: { x: 300, y: 79 },
  },

  // ---------------------------------------------------------------- open-plan office: two desks in a row, coworkers' monitors behind
  "open-office": {
    back: () => (
      <g>
        <CeilingLights xs={[40, 168, 296]} />
        <CityWindow x={24} y={30} w={352} h={66} />
        {/* the far row: a long light divider with monitors over it */}
        <Sh d={rect(20, 128, 360, FLOOR_Y - 128)} fill={C.g1} sw={1.4} />
        {[60, 120, 190, 260, 330].map((x) => <Monitor key={x} x={x} top={128} w={28} h={18} />)}
        <OfficeChair x={58} />
        <OfficeChair x={238} />
      </g>
    ),
    front: () => (
      <g>
        <Desk x0={30} x1={186} top={184} drawers={false} />
        <Desk x0={210} x1={386} top={184} />
        {/* the second desk has someone's monitor on it already */}
        <Monitor x={334} top={184} />
        <Keyboard x={96} top={184} /><Keyboard x={276} top={184} />
        <Mug x={164} y={184} />
        <Plant x={198} y={FLOOR_Y} s={0.9} />
      </g>
    ),
    marks: {
      desk: { x: 58, y: FLOOR_Y, facing: "right", seated: true, behind: true, surface: 184 },
      "desk-2": { x: 238, y: FLOOR_Y, facing: "right", seated: true, behind: true, surface: 184 },
      aisle: { x: 202, y: FLOOR_Y, facing: "left" },
      window: { x: 380, y: FLOOR_Y, facing: "left" },
    },
    order: ["desk", "desk-2", "aisle", "window"],
    spots: {
      desktop: { x: 126, y: on(184, H.desktop) },
      laptop: { x: 124, y: on(184, H.laptop) },
      phone: { x: 158, y: on(184, H.phone) },
      tablet: { x: 150, y: on(184, H.tablet) },
    },
    defaultSpot: { x: 126, y: on(184, H.desktop) },
  },

  // ---------------------------------------------------------------- the office break room: coffee machine, fridge, a high table
  "break-room": {
    back: () => (
      <g>
        {/* cupboards over a counter, a coffee machine, a microwave */}
        <Sh d={rect(150, 30, 160, 46)} fill={C.g2} /><L d="M190 30 V76 M230 30 V76 M270 30 V76" sw={1.3} />
        {[182, 222, 262, 302].map((x) => <L key={x} d={`M${x} 64 v6`} sw={1.8} />)}
        <Sh d={rect(170, 128, 30, 38)} fill={C.g7} /><Sh d={rect(178, 152, 14, 8)} fill={C.g4} sw={1.1} /><L d="M174 136 h22" sw={1.2} color={C.g4} />
        <Sh d={rect(230, 140, 50, 26)} fill={C.g4} /><Sh d={rect(236, 145, 30, 16)} fill={C.g2} sw={1.1} /><L d="M272 146 v10" sw={1.4} />
        {/* the fridge and a notice board */}
        <Sh d={rect(326, 60, 60, 174)} fill={C.g1} /><L d="M326 120 H386 M376 72 v28 M376 132 v34" sw={1.5} />
        <Sh d={rect(30, 44, 80, 56)} fill={C.g4} />
        <Sh d={rect(38, 52, 22, 16)} fill={C.paper} sw={1.1} /><Sh d={rect(66, 50, 16, 20)} fill={C.paper} sw={1.1} /><Note x={88} y={56} /><Sh d={rect(44, 74, 30, 18)} fill={C.paper} sw={1.1} />
        <Clock x={130} y={50} r={10} />
      </g>
    ),
    front: () => (
      <g>
        <Sh d={rect(150, 166, 176, 68)} fill={C.g2} /><L d="M150 180 H326 M208 180 V234 M266 180 V234" sw={1.2} />
        <Mug x={214} y={166} />
        {/* a high table with a stool */}
        <Sh d={rect(30, 168, 86, 7)} fill={C.g4} /><L d="M73 175 V234 M58 234 h30" sw={2.4} />
        <Sh d={rect(18, 196, 26, 6)} fill={C.g5} sw={1.4} /><L d="M31 202 V234" sw={2} />
      </g>
    ),
    marks: {
      counter: { x: 136, y: FLOOR_Y, facing: "right" },
      coffee: { x: 186, y: FLOOR_Y, facing: "right" },
      table: { x: 30, y: FLOOR_Y, facing: "right", seated: true, surface: 168 },
      fridge: { x: 304, y: FLOOR_Y, facing: "right" },
    },
    order: ["counter", "table", "coffee", "fridge"],
    spots: {
      phone: { x: 96, y: on(168, H.phone) },
      tablet: { x: 92, y: on(168, H.tablet) },
      laptop: { x: 90, y: on(168, H.laptop) },
      "payment-terminal": { x: 296, y: on(166, H.terminal) },
    },
    surfaces: [166],
    defaultSpot: { x: 96, y: on(168, H.phone) },
  },

  // ---------------------------------------------------------------- an office reception: front desk with the company name, visitor gates
  reception: {
    back: () => (
      <g>
        <CeilingLights xs={[60, 280]} />
        {/* the company sign on the wall behind the desk */}
        <Sh d={rect(228, 46, 148, 34)} fill={C.paper} />
        {/* a sofa for visitors and a plant */}
        <Sh d="M20 234 V196 Q20 186 30 186 H110 Q120 186 120 196 V234" fill={C.g4} />
        <L d="M24 210 H116" sw={1.6} />
        <Sh d={rect(14, 200, 12, 34)} fill={C.g4} /><Sh d={rect(114, 200, 12, 34)} fill={C.g4} />
        <Plant x={140} y={FLOOR_Y} s={1.1} />
        {/* glass gates to the offices */}
        <Sh d={rect(160, 168, 8, 66)} fill={C.g5} sw={1.4} /><Sh d={rect(196, 168, 8, 66)} fill={C.g5} sw={1.4} />
        <Sh d={rect(168, 178, 28, 34)} fill={C.g1} sw={1.2} />
        <Sh d={rect(160, 164, 8, 6)} fill={C.g7} sw={1} />
      </g>
    ),
    front: () => (
      <g>
        <Sh d="M226 170 H390 V234 H226 Z" fill={C.g2} />
        <Sh d={rect(220, 162, 176, 10)} fill={C.g4} />
        <L d="M226 196 H390" sw={1.2} />
      </g>
    ),
    marks: {
      desk: { x: 210, y: FLOOR_Y, facing: "right" },
      receptionist: { x: 330, y: FLOOR_Y, facing: "left", behind: true, surface: 162 },
      waiting: { x: 70, y: FLOOR_Y, facing: "right", seated: true },
      gates: { x: 182, y: FLOOR_Y, facing: "right" },
    },
    order: ["desk", "receptionist", "waiting", "gates"],
    spots: {
      tablet: { x: 248, y: on(162, H.tablet) },
      kiosk: { x: 150, y: on(FLOOR_Y, H.kiosk) },
      "payment-terminal": { x: 248, y: on(162, H.terminal) },
      phone: { x: 250, y: on(162, H.phone) },
      desktop: { x: 300, y: on(162, H.desktop), behind: true },
    },
    sign: { x: 232, y: 50, w: 140, h: 26 },
    defaultSpot: { x: 248, y: on(162, H.tablet) },
  },

  // ---------------------------------------------------------------- a coworking space: shared table, pendant lights, a phone booth
  coworking: {
    back: () => (
      <g>
        {/* brick wall */}
        <Sh d={rect(0, 20, 290, 130)} fill={C.g1} sw={1.2} />
        {Array.from({ length: 8 }, (_, r) => <L key={r} d={`M0 ${36 + r * 16} H290`} sw={0.9} color={C.g4} />)}
        {Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, (_, c) => <L key={`${r}-${c}`} d={`M${(c * 40 + (r % 2) * 20) % 290} ${20 + r * 16} v16`} sw={0.9} color={C.g4} />))}
        {[90, 200].map((x) => <g key={x}><L d={`M${x} 0 v40`} sw={1.2} /><Sh d={`M${x - 14} 52 q14 -22 28 0 Z`} fill={C.g5} sw={1.4} /></g>)}
        {/* a phone booth to take calls in */}
        <Sh d={rect(306, 40, 84, 194)} fill={C.g2} />
        <Sh d={rect(316, 56, 64, 110)} fill={C.paper} sw={1.4} /><L d="M372 104 v14" sw={2} />
        <T x={348} y={190} s={9} fill={C.g7}>CALLS</T>
        <Plant x={20} y={FLOOR_Y} s={1.1} />
      </g>
    ),
    front: () => (
      <g>
        <Sh d="M60 180 H284 L276 192 H68 Z" fill={C.g2} />
        <L d="M84 192 V234 M260 192 V234" sw={2.6} />
        <Mug x={110} y={180} /><Sh d={rect(150, 176, 22, 4)} fill={C.paper} sw={1} />
      </g>
    ),
    marks: {
      "table-left": { x: 52, y: FLOOR_Y, facing: "right", seated: true, behind: true, surface: 180 },
      "table-right": { x: 292, y: FLOOR_Y, facing: "left", seated: true, behind: true, surface: 180 },
      booth: { x: 348, y: FLOOR_Y, facing: "left" },
      standing: { x: 172, y: FLOOR_Y, facing: "right" },
    },
    order: ["table-left", "table-right", "standing", "booth"],
    spots: {
      laptop: { x: 128, y: on(180, H.laptop) },
      phone: { x: 220, y: on(180, H.phone) },
      tablet: { x: 216, y: on(180, H.tablet) },
      desktop: { x: 132, y: on(180, H.desktop) },
    },
    defaultSpot: { x: 128, y: on(180, H.laptop) },
  },
};

