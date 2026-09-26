import type { ReactNode } from "react";
import type { DeviceType, SceneId } from "../vocab";
import { C, FLOOR_Y, OFFSET } from "./tokens";
import { MORE_SCENES } from "./scenes-more";

export interface Mark {
  x: number;
  y: number;
  facing?: "left" | "right";
  seated?: boolean;
  /** Drawn behind the scene's front layer (e.g. behind a counter). */
  behind?: boolean;
  /** Top surface (tables/counters) where small devices sit. */
  surface?: number;
  scale?: number;
}

export interface SceneDef {
  back: () => ReactNode;
  front?: () => ReactNode;
  marks: Record<string, Mark>;
  /** Where characters go, in order, when `at` isn't given. */
  order: string[];
  /** Natural spot per device type when a placed device has no `at`. */
  spots: Partial<Record<DeviceType, { x: number; y: number; behind?: boolean }>>;
  defaultSpot: { x: number; y: number };
  /** Where the brand name/logo goes (storefronts, signs). */
  sign?: { x: number; y: number; w: number; h: number };
}

const ink = C.ink;
/** Marker shape: offset grey fill + ink outline. */
export function Sh({ d, fill = C.g2, sw = 2.1 }: { d: string; fill?: string; sw?: number }) {
  return (
    <g>
      {fill !== "none" && <path d={d} fill={fill} transform={`translate(${OFFSET.x} ${OFFSET.y})`} />}
      <path d={d} fill="none" stroke={ink} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
    </g>
  );
}
const rect = (x: number, y: number, w: number, h: number) => `M${x} ${y} h${w} v${h} h${-w} Z`;
const L = ({ d, sw = 1.5, color = ink }: { d: string; sw?: number; color?: string }) => (
  <path d={d} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
);
const floor = <L d={`M0 ${FLOOR_Y} H400`} sw={2.1} />;

const BASE_SCENES: Record<string, SceneDef> = {
  "coffee-shop": {
    back: () => (
      <g>
        <L d="M0 150 H400" sw={1.1} color={C.g5} />
        <Sh d={rect(250, 20, 124, 46)} fill={C.g2} />
        <L d="M262 34 h44 M262 43 h58 M262 52 h36 M332 34 h28 M334 43 h26" sw={1.6} />
        <L d="M120 0 v18 M200 0 v18" sw={1.3} />
        <Sh d="M110 30 Q120 14 130 30 Z" fill={C.g4} /><Sh d="M190 30 Q200 14 210 30 Z" fill={C.g4} />
        <Sh d={rect(12, 92, 44, 142)} fill={C.g1} />
        <L d={`M20 104 h28 v48 h-28 Z M48 170 v10`} sw={1.3} />
        <Sh d="M62 186 h44" fill="none" sw={2.4} /><L d="M84 186 V232 M72 234 h24" sw={2.1} />
      </g>
    ),
    front: () => (
      <g>
        <Sh d={rect(300, 146, 48, 30)} fill={C.g7} /><L d="M312 176 v-6 M336 176 v-6" sw={1.6} />
        <Sh d={rect(240, 176, 168, 58)} fill={C.g2} />
        <L d="M240 192 H400" sw={1.2} />
      </g>
    ),
    marks: {
      counter: { x: 208, y: FLOOR_Y, facing: "right" },
      queue: { x: 158, y: FLOOR_Y, facing: "right" },
      table: { x: 118, y: FLOOR_Y, facing: "left", surface: 186 },
      door: { x: 34, y: FLOOR_Y, facing: "right" },
      barista: { x: 330, y: FLOOR_Y, facing: "left", behind: true },
    },
    order: ["counter", "barista", "queue", "table", "door"],
    spots: { "payment-terminal": { x: 262, y: 164 }, kiosk: { x: 170, y: 164 }, phone: { x: 84, y: 181 }, tablet: { x: 84, y: 178 } },
    defaultSpot: { x: 84, y: 176 },
    sign: { x: 262, y: 70, w: 100, h: 20 },
  },
  kitchen: {
    back: () => (
      <g>
        <Sh d={rect(18, 70, 54, 164)} fill={C.g1} /><L d="M18 130 H72 M64 84 v24 M64 140 v30" sw={1.4} />
        <Sh d={rect(106, 36, 84, 70)} fill={C.paper} /><L d="M148 36 V106 M106 71 H190" sw={1.4} />
        <Sh d={rect(236, 26, 150, 52)} fill={C.g2} /><L d="M286 26 V78 M336 26 V78" sw={1.3} />
      </g>
    ),
    front: () => (
      <g>
        <Sh d={rect(250, 170, 150, 64)} fill={C.g2} /><L d="M250 184 H400 M300 184 V234 M350 184 V234" sw={1.2} />
        <Sh d="M168 186 h50" fill="none" sw={2.4} /><L d="M193 186 V232 M181 234 h24" sw={2.1} />
      </g>
    ),
    marks: {
      counter: { x: 232, y: FLOOR_Y, facing: "right" },
      fridge: { x: 96, y: FLOOR_Y, facing: "left" },
      table: { x: 150, y: FLOOR_Y, facing: "right", seated: true, surface: 186 },
    },
    order: ["counter", "table", "fridge"],
    spots: { phone: { x: 200, y: 181 }, tablet: { x: 200, y: 172 }, "smart-speaker": { x: 330, y: 158 }, laptop: { x: 196, y: 184 } },
    defaultSpot: { x: 320, y: 160 },
  },
  "living-room": {
    back: () => (
      <g>
        <Sh d={rect(160, 40, 56, 40)} fill={C.g1} /><L d="M170 70 l12 -14 l10 8 l14 -12" sw={1.3} />
        <L d="M40 234 V70 M40 70 h-14 l-6 22 h40 l-6 -22 Z" sw={2} />
        <Sh d="M100 234 V160 Q100 146 116 146 H254 Q270 146 270 160 V234" fill={C.g4} />
        <L d="M104 196 H266" sw={1.6} />
      </g>
    ),
    front: () => (
      <g>
        <Sh d={rect(92, 178, 22, 56)} fill={C.g4} /><Sh d={rect(256, 178, 22, 56)} fill={C.g4} />
      </g>
    ),
    marks: {
      sofa: { x: 185, y: FLOOR_Y, facing: "right", seated: true, behind: true },
      floor: { x: 320, y: FLOOR_Y, facing: "left" },
      tv: { x: 336, y: 96 },
    },
    order: ["sofa", "floor"],
    spots: { tv: { x: 336, y: 96 }, "smart-speaker": { x: 380, y: 210 }, phone: { x: 150, y: 190 } },
    defaultSpot: { x: 336, y: 96 },
  },
  bedroom: {
    back: () => (
      <g>
        <Sh d={rect(28, 36, 84, 80)} fill={C.g7} /><L d="M70 36 V116 M28 76 H112" sw={1.4} color={C.paper} />
        <path d="M92 52 a8 8 0 1 0 6 14 a6 6 0 1 1 -6 -14z" fill={C.paper} />
        <Sh d={rect(320, 118, 14, 116)} fill={C.g5} />
        <Sh d="M150 234 V190 H330 V234" fill={C.g2} />
        <Sh d="M150 196 Q240 176 322 196 V214 H150 Z" fill={C.g4} />
        <Sh d={rect(340, 186, 46, 48)} fill={C.g5} />
        <L d="M362 186 V164 M350 164 h24 l-5 -14 h-14 Z" sw={1.8} />
      </g>
    ),
    marks: {
      bed: { x: 210, y: FLOOR_Y, facing: "right", seated: true, behind: false },
      nightstand: { x: 362, y: FLOOR_Y, surface: 186 },
      door: { x: 70, y: FLOOR_Y, facing: "right" },
    },
    order: ["bed", "door"],
    spots: { phone: { x: 356, y: 181 }, "smart-speaker": { x: 372, y: 170 }, tablet: { x: 350, y: 178 } },
    defaultSpot: { x: 356, y: 181 },
  },
  office: {
    back: () => (
      <g>
        <Sh d={rect(50, 36, 96, 92)} fill={C.paper} /><L d="M50 50 H146 M50 64 H146 M50 78 H146 M50 92 H146 M50 106 H146" sw={1} />
        <Sh d="M14 234 L20 200 H44 L50 234 Z" fill={C.g5} /><L d="M32 200 q-14 -20 -4 -40 M32 200 q10 -24 20 -30 M32 200 q-2 -30 6 -50" sw={2} />
        <Sh d="M226 234 V164 Q226 150 238 150 H244 V234" fill={C.g5} />
      </g>
    ),
    front: () => (
      <g>
        <Sh d={rect(236, 176, 158, 10)} fill={C.g4} /><L d="M246 186 V234 M384 186 V234" sw={2.4} />
      </g>
    ),
    marks: {
      chair: { x: 250, y: FLOOR_Y, facing: "right", seated: true, behind: true, surface: 176 },
      desk: { x: 330, y: FLOOR_Y, surface: 176 },
      window: { x: 110, y: FLOOR_Y, facing: "right" },
      door: { x: 180, y: FLOOR_Y, facing: "right" },
    },
    order: ["chair", "window", "door"],
    spots: { desktop: { x: 326, y: 116 }, laptop: { x: 320, y: 172 }, phone: { x: 370, y: 171 }, tablet: { x: 366, y: 166 } },
    defaultSpot: { x: 326, y: 116 },
  },
  "meeting-room": {
    back: () => (
      <g>
        <Sh d={rect(20, 46, 112, 82)} fill={C.paper} /><L d="M34 64 h40 M34 76 l20 10 l20 -14 M86 96 h32" sw={1.4} />
      </g>
    ),
    front: () => (
      <g>
        <Sh d={rect(120, 180, 190, 12)} fill={C.g4} /><L d="M140 192 V234 M290 192 V234" sw={2.4} />
      </g>
    ),
    marks: {
      "table-left": { x: 120, y: FLOOR_Y, facing: "right", seated: true, behind: true, surface: 180 },
      "table-right": { x: 318, y: FLOOR_Y, facing: "left", seated: true, behind: true, surface: 180 },
      whiteboard: { x: 76, y: FLOOR_Y, facing: "right" },
      screen: { x: 300, y: 80 },
    },
    order: ["table-left", "table-right", "whiteboard"],
    spots: { tv: { x: 300, y: 80 }, laptop: { x: 200, y: 176 }, phone: { x: 230, y: 175 }, "smart-speaker": { x: 214, y: 166 } },
    defaultSpot: { x: 300, y: 80 },
  },
  car: {
    back: () => (
      <g>
        <L d="M0 36 Q200 10 330 40 L400 110" sw={2.4} />
        <Sh d="M60 50 Q180 28 300 50 L340 104 H70 Z" fill={C.g1} />
        <Sh d="M268 118 Q330 104 400 116 V180 H280 Z" fill={C.g5} />
        <Sh d="M186 234 V196 H252 V234" fill={C.g4} />
        <Sh d="M180 206 V116 Q180 104 192 104 H200 Q210 104 210 116 V206 Z" fill={C.g4} />
        <Sh d="M80 206 V122 Q80 110 92 110 H100 Q110 110 110 122 V206 Z" fill={C.g4} />
      </g>
    ),
    front: () => (
      <g>
        <ellipse cx={262} cy={150} rx={6} ry={21} transform="rotate(-20 262 150)" fill="none" stroke={ink} strokeWidth={3} />
        <L d="M266 164 L282 176" sw={3} />
      </g>
    ),
    marks: {
      "driver-seat": { x: 214, y: FLOOR_Y, facing: "right", seated: true, behind: true },
      "passenger-seat": { x: 114, y: FLOOR_Y, facing: "right", seated: true, behind: true, scale: 0.94 },
      dashboard: { x: 340, y: 130 },
    },
    order: ["driver-seat", "passenger-seat"],
    spots: { "car-display": { x: 340, y: 132 }, phone: { x: 318, y: 112 } },
    defaultSpot: { x: 340, y: 132 },
  },
  street: {
    back: () => (
      <g>
        <Sh d={rect(10, 44, 160, 190)} fill={C.g1} />
        <Sh d="M4 44 H176 L166 70 H14 Z" fill={C.g4} /><L d="M34 44 L30 70 M62 44 L60 70 M90 44 V70 M118 44 L120 70 M146 44 L150 70" sw={1.2} />
        <Sh d={rect(24, 92, 78, 76)} fill={C.paper} /><Sh d={rect(118, 104, 38, 130)} fill={C.g5} />
        <L d="M292 234 V60 M292 60 q18 -2 24 12" sw={2.6} /><Sh d="M306 72 h20 l-4 10 h-12 Z" fill={C.g4} />
        <L d={`M0 ${FLOOR_Y} H400`} sw={2.1} /><L d="M0 246 H400" sw={1.6} />
        <L d="M330 252 h14 M354 252 h14 M378 252 h14" sw={3} />
      </g>
    ),
    marks: {
      sidewalk: { x: 210, y: FLOOR_Y, facing: "right" },
      storefront: { x: 90, y: FLOOR_Y, facing: "right" },
      curb: { x: 300, y: FLOOR_Y, facing: "left" },
      crossing: { x: 360, y: FLOOR_Y, facing: "left" },
    },
    order: ["sidewalk", "curb", "storefront", "crossing"],
    spots: { kiosk: { x: 250, y: 164 } },
    defaultSpot: { x: 250, y: 164 },
    sign: { x: 24, y: 74, w: 132, h: 16 },
  },
  transit: {
    back: () => (
      <g>
        {[20, 100, 180].map((x) => <Sh key={x} d={rect(x, 50, 64, 56)} fill={C.g1} />)}
        <L d="M0 36 H400" sw={2} /><L d="M20 24 h260" sw={1.6} />
        {[60, 140, 220].map((x) => <L key={x} d={`M${x} 24 v10 m-5 0 h10 v8 h-10 z`} sw={1.2} />)}
        <Sh d="M70 234 V196 H232 V234" fill={C.g4} /><Sh d="M70 196 V132 Q70 124 78 124 H224 Q232 124 232 132 V196 Z" fill={C.g5} />
        <L d="M282 36 V234" sw={3.4} />
        <Sh d={rect(318, 50, 72, 184)} fill={C.g2} /><L d="M354 50 V234 M326 70 h20 v60 h-20 Z M362 70 h20 v60 h-20 Z" sw={1.4} />
      </g>
    ),
    marks: {
      seat: { x: 150, y: FLOOR_Y, facing: "right", seated: true },
      standing: { x: 262, y: FLOOR_Y, facing: "right" },
      door: { x: 354, y: FLOOR_Y, facing: "left" },
    },
    order: ["seat", "standing", "door"],
    spots: {},
    defaultSpot: { x: 300, y: 160 },
  },
  store: {
    back: () => (
      <g>
        <Sh d={rect(10, 50, 140, 184)} fill={C.g1} />
        {[80, 122, 164, 206].map((y) => <L key={y} d={`M10 ${y} H150`} sw={1.6} />)}
        {[80, 122, 164].map((y) => [20, 44, 70, 96, 120].map((x) => <rect key={`${x}${y}`} x={x} y={y + 12} width={16} height={28} rx={2} fill={C.g4} stroke={ink} strokeWidth={1.2} />))}
        <Sh d={rect(352, 60, 42, 174)} fill={C.paper} /><L d="M373 60 V234" sw={1.4} />
      </g>
    ),
    front: () => (
      <g>
        <Sh d={rect(206, 176, 128, 58)} fill={C.g2} /><L d="M206 190 H334" sw={1.2} />
      </g>
    ),
    marks: {
      checkout: { x: 184, y: FLOOR_Y, facing: "right" },
      cashier: { x: 300, y: FLOOR_Y, facing: "left", behind: true },
      aisle: { x: 90, y: FLOOR_Y, facing: "right" },
      entrance: { x: 374, y: FLOOR_Y, facing: "left" },
    },
    order: ["checkout", "cashier", "aisle", "entrance"],
    spots: { "payment-terminal": { x: 232, y: 165 }, kiosk: { x: 250, y: 164 } },
    defaultSpot: { x: 232, y: 165 },
    sign: { x: 170, y: 24, w: 170, h: 24 },
  },
  hospital: {
    back: () => (
      <g>
        <L d="M0 26 H240" sw={1.6} />
        {[20, 34, 48, 62].map((x) => <L key={x} d={`M${x} 26 v${x % 28 ? 150 : 158}`} sw={1} color={C.g5} />)}
        <Sh d="M14 26 Q30 110 20 190 L70 190 Q60 110 76 26 Z" fill={C.g1} />
        <L d="M112 234 V96 M104 96 h16 M112 110 l-10 16" sw={2} /><Sh d="M100 100 h14 v20 h-14 Z" fill={C.g1} />
        <Sh d="M130 234 V140 M130 150 H230 M230 234 V176" fill="none" sw={2.4} />
        <Sh d="M130 176 H236 V194 H130 Z" fill={C.g2} /><Sh d="M134 160 Q150 150 168 160 V176 H134 Z" fill={C.paper} />
        <L d="M136 194 v6 M226 194 v6" sw={2.2} /><path d="M140 232 a4 4 0 1 0 0.1 0 M222 232 a4 4 0 1 0 0.1 0" fill="none" stroke={C.ink} strokeWidth={2} />
      </g>
    ),
    front: () => (
      <g>
        <Sh d={rect(272, 172, 128, 62)} fill={C.g2} /><L d="M272 186 H400" sw={1.2} />
        <Sh d={rect(262, 164, 138, 10)} fill={C.g4} />
      </g>
    ),
    marks: {
      bed: { x: 180, y: FLOOR_Y, facing: "left", seated: true, behind: true },
      bedside: { x: 238, y: FLOOR_Y, facing: "left" },
      corridor: { x: 88, y: FLOOR_Y, facing: "right" },
      station: { x: 336, y: FLOOR_Y, facing: "left", behind: true, surface: 164 },
    },
    order: ["bedside", "bed", "station", "corridor"],
    spots: { desktop: { x: 350, y: 110, behind: true }, tablet: { x: 300, y: 150 }, phone: { x: 290, y: 158 } },
    defaultSpot: { x: 350, y: 110 },
  },
  school: {
    back: () => (
      <g>
        <Sh d={rect(186, 40, 214, 194)} fill={C.g1} />
        <Sh d={rect(236, 52, 128, 30)} fill={C.paper} />
        <text x={300} y={74} textAnchor="middle" fontFamily="Permanent Marker" fontSize={18} fill={C.ink}>SCHOOL</text>
        {[200, 380].map((x) => <Sh key={x} d={rect(x - 12, 100, 24, 38)} fill={C.paper} />)}
        <Sh d={rect(270, 132, 60, 102)} fill={C.g5} /><L d="M300 132 V234" sw={1.6} />
        {Array.from({ length: 16 }, (_, i) => <L key={i} d={`M${6 + i * 10} 234 V${i % 2 ? 176 : 172}`} sw={1.8} />)}
        <L d="M0 186 H164 M0 214 H164" sw={2} />
        <L d="M164 234 V160 M186 234 V160" sw={3} />
      </g>
    ),
    marks: {
      sidewalk: { x: 96, y: FLOOR_Y, facing: "right" },
      gate: { x: 176, y: FLOOR_Y, facing: "right" },
      door: { x: 300, y: FLOOR_Y, facing: "left" },
    },
    order: ["gate", "sidewalk", "door"],
    spots: { kiosk: { x: 230, y: 164 } },
    defaultSpot: { x: 230, y: 164 },
  },
  blank: {
    back: () => floor,
    marks: {
      left: { x: 110, y: FLOOR_Y, facing: "right" },
      center: { x: 200, y: FLOOR_Y, facing: "right" },
      right: { x: 290, y: FLOOR_Y, facing: "left" },
    },
    order: ["center", "right", "left"],
    spots: {},
    defaultSpot: { x: 300, y: 150 },
  },
};

export const SCENE_DEFS = { ...BASE_SCENES, ...MORE_SCENES } as Record<SceneId, SceneDef>;

export interface Brand { name?: string; logoHref?: string }

function Sign({ r, brand }: { r: { x: number; y: number; w: number; h: number }; brand: Brand }) {
  const logoW = brand.logoHref ? r.h - 4 : 0;
  const name = brand.name ?? "";
  const size = Math.min(r.h * 0.72, ((r.w - logoW - 10) / Math.max(1, name.length)) * 1.45);
  return (
    <g data-sign>
      <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={C.paper} stroke={C.ink} strokeWidth={1.8} />
      {brand.logoHref && <image href={brand.logoHref} x={r.x + 3} y={r.y + 2} width={logoW} height={r.h - 4} preserveAspectRatio="xMidYMid meet" filter="url(#sb-gray)" />}
      {name && <text x={r.x + logoW + (r.w - logoW) / 2 + (logoW ? 2 : 0)} y={r.y + r.h / 2 + size * 0.36} textAnchor="middle" fontFamily="Permanent Marker" fontSize={size} fill={C.ink}>{name}</text>}
    </g>
  );
}

export function SceneBack({ id, brand }: { id: SceneId; brand?: Brand }) {
  const s = SCENE_DEFS[id];
  return <g>{s.back()}{id !== "blank" && id !== "street" && floor}{brand && (brand.name || brand.logoHref) && s.sign && <Sign r={s.sign} brand={brand} />}</g>;
}

export function SceneFront({ id }: { id: SceneId }) {
  const f = SCENE_DEFS[id].front;
  return f ? <g>{f()}</g> : null;
}
