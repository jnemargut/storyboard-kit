/**
 * Extra detail for the original scenes: the props that make a place recognisable at a glance (a menu board and
 * cups, a hob and a fruit bowl, a crosswalk). Drawn behind people, kept off the wall band where heads appear, and
 * never moving a mark, so existing boards look the same except richer.
 */
import type { ReactNode } from "react";
import { C, OFFSET } from "./tokens";

const ink = C.ink;
const rect = (x: number, y: number, w: number, h: number) => `M${x} ${y} h${w} v${h} h${-w} Z`;
/** Marker shape: offset grey fill + ink outline. */
const Sh = ({ d, fill = C.g2, sw = 1.8 }: { d: string; fill?: string; sw?: number }) => (
  <g>
    {fill !== "none" && <path d={d} fill={fill} transform={`translate(${OFFSET.x * 0.7} ${OFFSET.y * 0.7})`} />}
    <path d={d} fill="none" stroke={ink} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
  </g>
);
const L = ({ d, sw = 1.4, color = ink }: { d: string; sw?: number; color?: string }) => (
  <path d={d} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
);
const T = ({ x, y, s, children, fill = ink }: { x: number; y: number; s: number; children: string; fill?: string }) => (
  <text x={x} y={y} textAnchor="middle" fontFamily="Permanent Marker" fontSize={s} fill={fill}>{children}</text>
);
/** A little potted plant standing on y. */
const Plant = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-7 -30 Q-16 -44 -12 -56 Q-4 -46 -3 -30 M0 -30 Q2 -52 10 -60 Q12 -44 4 -30 M5 -30 Q16 -38 20 -48 Q20 -34 8 -28" fill={C.g5} stroke={ink} strokeWidth={1.5} strokeLinejoin="round" />
    <Sh d="M-10 -30 h20 l-3 30 h-14 Z" fill={C.g4} />
  </g>
);
/** A mug with a wisp of steam, sitting on y. */
const Mug = ({ x, y, steam = true }: { x: number; y: number; steam?: boolean }) => (
  <g>
    <Sh d={rect(x - 5, y - 9, 10, 9)} fill={C.paper} sw={1.4} />
    <L d={`M${x + 5} ${y - 7} q4 0 4 3 q0 3 -4 3`} sw={1.3} />
    {steam && <L d={`M${x - 2} ${y - 12} q-2 -4 0 -7 M${x + 2} ${y - 12} q2 -4 0 -7`} sw={1} color={C.g5} />}
  </g>
);
/** A wall clock. */
const Clock = ({ x, y, r = 11 }: { x: number; y: number; r?: number }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill={C.paper} stroke={ink} strokeWidth={1.8} />
    <L d={`M${x} ${y} V${y - r * 0.62} M${x} ${y} L${x + r * 0.45} ${y + r * 0.2}`} sw={1.5} />
  </g>
);
/** A framed picture. */
const Frame = ({ x, y, w, h, kind = "hills" }: { x: number; y: number; w: number; h: number; kind?: "hills" | "sun" | "lines" }) => (
  <g>
    <Sh d={rect(x, y, w, h)} fill={C.paper} sw={1.6} />
    {kind === "hills" && <L d={`M${x + 3} ${y + h - 4} Q${x + w * 0.3} ${y + h * 0.35} ${x + w * 0.55} ${y + h - 6} Q${x + w * 0.75} ${y + h * 0.5} ${x + w - 3} ${y + h - 5}`} sw={1.2} />}
    {kind === "sun" && <circle cx={x + w / 2} cy={y + h / 2} r={Math.min(w, h) * 0.22} fill={C.g2} stroke={ink} strokeWidth={1.2} />}
    {kind === "lines" && <L d={`M${x + 4} ${y + h * 0.35} h${w - 8} M${x + 4} ${y + h * 0.6} h${w * 0.6}`} sw={1.1} />}
  </g>
);

export const SCENE_DECOR: Record<string, () => ReactNode> = {
  "coffee-shop": () => (
    <g>
      {/* wall shelf of mugs and beans */}
      <L d="M110 76 H214" sw={2.2} />
      {[118, 134, 150].map((x) => <Mug key={x} x={x} y={76} steam={false} />)}
      <Sh d="M170 76 v-16 q7 -5 14 0 v16 Z" fill={C.g5} sw={1.4} /><Sh d="M190 76 v-13 q6 -4 12 0 v13 Z" fill={C.g4} sw={1.4} />
      {/* espresso machine on the back counter, cups stacked by the till */}
      <Sh d={rect(356, 140, 40, 36)} fill={C.g5} /><L d="M364 176 v-8 M388 176 v-8 M360 150 h32" sw={1.4} />
      <Sh d="M248 176 l2 -18 h10 l2 18 Z" fill={C.paper} sw={1.3} /><L d="M249 170 h12 M250 164 h10" sw={1} />
      {/* a coffee on the table */}
      <Mug x={96} y={186} />
      {/* chalk specials by the door */}
      <Sh d={rect(64, 40, 34, 44)} fill={C.g8} /><L d="M70 52 h20 M70 60 h14 M70 68 h18" sw={1.2} color={C.paper} />
    </g>
  ),
  kitchen: () => (
    <g>
      {/* hob, hood and a pot */}
      <L d="M330 170 h52" sw={2.4} />
      <ellipse cx={342} cy={169} rx={7} ry={2} fill={C.g7} /><ellipse cx={368} cy={169} rx={7} ry={2} fill={C.g7} />
      <Sh d="M358 168 v-12 h22 v12 Z" fill={C.g5} /><L d="M355 158 h4 M379 158 h4" sw={1.6} />
      <Sh d="M326 78 h60 l-10 22 h-40 Z" fill={C.g4} />
      {/* kettle and knife block at the other end */}
      <Sh d="M262 170 q0 -16 12 -16 q12 0 12 16 Z" fill={C.g4} /><L d="M286 160 q6 2 4 8" sw={1.4} />
      <Sh d="M298 170 l4 -18 h10 l-2 18 Z" fill={C.g7} sw={1.3} />
      {/* fruit bowl on the table, magnets and a drawing on the fridge, a plant on the sill */}
      {/* fruit bowl sitting on the table top (x 168–218, y 186) */}
      <circle cx={200} cy={180} r={4} fill={C.g4} stroke={ink} strokeWidth={1.2} /><circle cx={208} cy={179} r={4.5} fill={C.g5} stroke={ink} strokeWidth={1.2} /><circle cx={214} cy={181} r={3.5} fill={C.g2} stroke={ink} strokeWidth={1.2} />
      <Sh d="M194 184 q13 9 26 0 Z" fill={C.paper} sw={1.4} />
      <Sh d={rect(26, 112, 20, 16)} fill={C.paper} sw={1.2} /><L d="M29 124 l5 -7 l4 4 l5 -6" sw={1} />
      <circle cx={56} cy={120} r={2.4} fill={C.g7} /><circle cx={30} cy={146} r={2.4} fill={C.g5} />
      <Plant x={172} y={100} s={0.55} />
    </g>
  ),
  "living-room": () => (
    <g>
      {/* window with curtains */}
      <Sh d={rect(236, 26, 60, 70)} fill={C.g1} /><L d="M266 26 v70 M236 61 h60" sw={1.2} />
      <Sh d="M228 22 q8 40 0 80 h10 q-4 -40 0 -80 Z" fill={C.g4} sw={1.4} /><Sh d="M304 22 q-8 40 0 80 h-10 q4 -40 0 -80 Z" fill={C.g4} sw={1.4} />
      <L d="M224 22 H308" sw={2} />
      {/* cushions, a throw, a rug and a side table with a mug */}
      <Sh d="M108 170 q10 -18 26 -8 l-4 12 Z" fill={C.g2} sw={1.4} /><Sh d="M236 170 q12 -16 26 -4 l-8 10 Z" fill={C.g5} sw={1.4} />
      <ellipse cx={186} cy={238} rx={96} ry={6} fill={C.g2} stroke={ink} strokeWidth={1.4} />
      <Sh d={rect(290, 196, 26, 4)} fill={C.g5} sw={1.4} /><L d="M296 200 V234 M310 200 V234" sw={1.6} />
      <Mug x={303} y={196} />
      <Plant x={388} y={234} s={0.9} />
    </g>
  ),
  bedroom: () => (
    <g>
      {/* pillow, blanket fold, slippers, a clock on the nightstand, a shelf with books */}
      <Sh d="M296 188 q14 -12 26 -2 l-2 10 h-22 Z" fill={C.paper} sw={1.4} />
      <L d="M170 204 q60 -8 130 0" sw={1.3} />
      <Sh d="M168 234 q2 -6 10 -6 q8 0 8 6 Z" fill={C.g4} sw={1.2} /><Sh d="M190 234 q2 -6 10 -6 q8 0 8 6 Z" fill={C.g4} sw={1.2} />
      <Sh d={rect(342, 180, 14, 12)} fill={C.g8} sw={1.2} /><L d="M345 186 h8" sw={1} color={C.paper} />
      <L d="M200 58 H270" sw={2.2} />
      {[204, 212, 220, 229].map((x, i) => <Sh key={x} d={rect(x, 58 - [22, 18, 24, 16][i], 7, [22, 18, 24, 16][i])} fill={[C.g4, C.g5, C.g2, C.g7][i]} sw={1.2} />)}
      <Frame x={244} y={30} w={22} h={24} kind="sun" />
      <ellipse cx={250} cy={239} rx={70} ry={5} fill={C.g2} stroke={ink} strokeWidth={1.3} />
    </g>
  ),
  office: () => (
    <g>
      {/* door, clock, cork board, desk lamp, papers and a mug */}
      <Sh d={rect(158, 92, 44, 142)} fill={C.g1} /><circle cx={194} cy={166} r={2.2} fill={ink} />
      <Clock x={180} y={48} />
      <Sh d={rect(222, 30, 62, 42)} fill={C.g4} />
      <Sh d={rect(228, 36, 14, 12)} fill={C.paper} sw={1.1} /><Sh d={rect(248, 40, 14, 12)} fill={C.paper} sw={1.1} /><Sh d={rect(266, 34, 12, 12)} fill={C.paper} sw={1.1} /><Sh d={rect(236, 54, 16, 12)} fill={C.paper} sw={1.1} />
      <L d="M382 174 v-28 l-12 -10" sw={2} /><Sh d="M362 132 l14 -6 l4 10 Z" fill={C.g5} sw={1.4} />
      <Sh d="M246 174 l2 -6 h22 l2 6 Z" fill={C.paper} sw={1.2} /><L d="M250 170 h18" sw={1} />
      <Mug x={296} y={174} />
    </g>
  ),
  "meeting-room": () => (
    <g>
      {/* chair backs along the far side, water and cups on the table, sticky notes, a window, a plant */}
      {[150, 190, 230, 270].map((x) => <Sh key={x} d={`M${x - 11} 180 v-26 q0 -7 7 -7 h8 q7 0 7 7 v26 Z`} fill={C.g5} sw={1.5} />)}
      <Sh d="M196 176 v-14 q4 -4 8 0 v14 Z" fill={C.g1} sw={1.2} />
      <Sh d={rect(222, 170, 8, 6)} fill={C.paper} sw={1.1} /><Sh d={rect(252, 170, 8, 6)} fill={C.paper} sw={1.1} />
      {[[92, 44], [104, 44], [92, 58], [108, 60]].map(([x, y]) => <Sh key={`${x}${y}`} d={rect(x, y, 10, 10)} fill={C.caption} sw={1.1} />)}
      <Sh d={rect(146, 24, 100, 58)} fill={C.g1} /><L d="M196 24 v58 M146 53 h100" sw={1.2} />
      <Clock x={356} y={34} r={10} />
      <Plant x={388} y={234} s={1} />
    </g>
  ),
  street: () => (
    <g>
      {/* a tree, a hydrant, a bin and a crosswalk (the skyline is in SCENE_UNDER) */}
      <L d="M232 234 V180" sw={3} /><Sh d="M212 184 q-10 -20 6 -30 q2 -16 20 -12 q18 -6 22 12 q14 12 0 28 q-4 10 -22 6 q-20 6 -26 -4 Z" fill={C.g4} />
      <Sh d="M270 234 v-18 q0 -6 6 -6 q6 0 6 6 v18 Z" fill={C.g5} sw={1.4} /><L d="M268 222 h16" sw={1.4} />
      <Sh d="M178 234 l2 -24 h16 l2 24 Z" fill={C.g5} sw={1.4} />
      {[334, 348, 362, 376, 390].map((x) => <path key={x} d={rect(x, 238, 8, 18)} fill={C.paper} stroke={C.g5} strokeWidth={1} />)}
    </g>
  ),
  transit: () => (
    <g>
      {/* grab pole and straps, a route map, an ad, and the floor strip */}
      <L d="M240 22 V234" sw={3.2} />
      <L d="M0 22 H400" sw={2} />
      {[60, 100, 140, 180, 290].map((x) => <g key={x}><L d={`M${x} 22 v16`} sw={1.3} /><circle cx={x} cy={43} r={5} fill="none" stroke={ink} strokeWidth={1.6} /></g>)}
      <Sh d={rect(20, 104, 134, 14)} fill={C.paper} sw={1.4} />
      <L d="M28 111 H146" sw={1.6} />{[34, 64, 94, 124, 142].map((x, i) => <circle key={x} cx={x} cy={111} r={2.8} fill={i === 2 ? ink : C.paper} stroke={ink} strokeWidth={1.2} />)}
      <L d="M0 234 H400" sw={2} /><L d="M0 238 H400" sw={1} color={C.g5} />
    </g>
  ),
  store: () => (
    <g>
      {/* aisle sign, hanging sale sign, register, a basket, price tags */}
      <Sh d={rect(40, 54, 74, 16)} fill={C.paper} sw={1.4} /><T x={77} y={66} s={10}>AISLE 3</T>
      <L d="M20 70 V84 M134 70 V84" sw={1} color={C.g5} />
      <L d="M252 0 v30 M312 0 v30" sw={1.1} />
      <Sh d={rect(244, 30, 76, 22)} fill={C.caption} sw={1.5} /><T x={282} y={46} s={12}>SALE</T>
      <Sh d="M276 176 v-16 h30 v16 Z" fill={C.g5} /><Sh d="M280 160 l4 -10 h20 l2 10 Z" fill={C.g4} sw={1.3} />
      <Sh d="M140 234 l-4 -20 h36 l-4 20 Z" fill={C.g2} sw={1.5} /><L d="M144 214 q10 -12 20 0" sw={1.6} /><L d="M146 222 h26 M147 228 h24" sw={1} />
      {[24, 58, 92, 126].map((x) => <path key={x} d={rect(x, 130, 10, 4)} fill={C.caption} stroke={ink} strokeWidth={0.8} />)}
    </g>
  ),
  hospital: () => (
    <g>
      {/* monitor with a heartbeat above the bed, a window, a chart, a clock, and a sign at the station */}
      <Sh d={rect(170, 52, 50, 34)} fill={C.g8} /><L d="M174 72 h10 l4 -10 l5 18 l4 -12 l3 4 h16" sw={1.4} color={C.paper} />
      <L d="M195 86 v10" sw={1.4} />
      <Sh d={rect(96, 28, 54, 50)} fill={C.g1} /><L d="M96 40 h54 M96 52 h54 M96 64 h54" sw={1} color={C.g5} />
      <Sh d={rect(226, 198, 10, 14)} fill={C.paper} sw={1.2} /><L d="M228 203 h6 M228 207 h5" sw={0.9} />
      <Clock x={250} y={40} r={10} />
      <Sh d={rect(292, 150, 30, 10)} fill={C.paper} sw={1.3} />
      <Sh d={rect(280, 40, 106, 20)} fill={C.paper} sw={1.4} /><T x={333} y={55} s={11}>NURSES</T>
    </g>
  ),
  restaurant: () => (
    <g>
      {/* door, specials board, framed art, place settings and a plant */}
      <Sh d={rect(14, 90, 48, 144)} fill={C.g1} /><L d="M22 102 h32 v44 h-32 Z" sw={1.2} /><circle cx={54} cy={172} r={2.2} fill={ink} />
      <Sh d={rect(300, 30, 70, 56)} fill={C.g8} /><T x={335} y={46} s={10} fill={C.paper}>SPECIALS</T><L d="M308 58 h40 M308 68 h30 M308 78 h44" sw={1.1} color={C.paper} />
      <Frame x={70} y={40} w={34} h={28} kind="hills" /><Frame x={262} y={40} w={24} h={30} kind="sun" />
      <ellipse cx={186} cy={172} rx={8} ry={2.4} fill={C.paper} stroke={ink} strokeWidth={1.2} /><ellipse cx={214} cy={172} rx={8} ry={2.4} fill={C.paper} stroke={ink} strokeWidth={1.2} />
      <L d="M200 172 v-10 M196 162 q4 -6 8 0" sw={1.3} />
      <Plant x={386} y={234} s={0.95} />
    </g>
  ),
  clinic: () => (
    <g>
      {/* door, a poster, a clock, a "now serving" display, magazines and a plant */}
      <Sh d={rect(0, 90, 34, 144)} fill={C.g1} /><circle cx={27} cy={166} r={2.2} fill={ink} />
      <Sh d={rect(112, 28, 44, 56)} fill={C.paper} sw={1.5} /><circle cx={134} cy={46} r={8} fill={C.g2} stroke={ink} strokeWidth={1.2} /><L d="M120 64 h28 M120 72 h20" sw={1.1} />
      <Clock x={196} y={44} r={10} />
      <Sh d={rect(330, 68, 56, 22)} fill={C.g8} /><T x={358} y={84} s={11} fill={C.paper}>NOW 24</T>
      <Sh d={rect(40, 224, 30, 10)} fill={C.g4} sw={1.2} /><L d="M44 224 l4 -8 h16 l2 8" sw={1.2} />
      <Plant x={198} y={234} s={0.85} />
    </g>
  ),
  "bus-stop": () => (
    <g>
      {/* a bin, a timetable, route numbers and road markings (the skyline is in SCENE_UNDER) */}
      <Sh d="M20 234 l2 -26 h18 l2 26 Z" fill={C.g5} sw={1.4} /><L d="M24 216 h14" sw={1} />
      <Sh d={rect(352, 94, 26, 34)} fill={C.paper} sw={1.3} /><L d="M356 102 h18 M356 110 h14 M356 118 h16" sw={1} />
      <T x={365} y={90} s={9}>12 · 40</T>
      <L d="M0 250 h30 M60 250 h30 M120 250 h30 M180 250 h30 M240 250 h30 M300 250 h30 M360 250 h30" sw={2} color={C.g5} />
    </g>
  ),
  park: () => (
    <g>
      {/* bushes, a lamp, a bin, flowers and a couple of birds (the hills are in SCENE_UNDER) */}
      <Sh d="M20 234 q-4 -24 16 -24 q6 -14 22 -6 q18 -4 16 16 q4 14 -6 14 Z" fill={C.g4} />
      <Sh d="M312 234 q-2 -18 14 -18 q8 -10 20 -2 q14 2 10 20 Z" fill={C.g4} />
      <L d="M356 234 V150" sw={2.2} /><Sh d="M348 146 h16 l-3 -10 h-10 Z" fill={C.g2} sw={1.4} />
      <Sh d="M168 234 l2 -22 h14 l2 22 Z" fill={C.g5} sw={1.4} />
      {[70, 80, 290, 300].map((x, i) => <g key={x}><L d={`M${x} 234 v-8`} sw={1.2} /><circle cx={x} cy={224} r={2.8} fill={[C.g2, C.paper, C.paper, C.g2][i]} stroke={ink} strokeWidth={1} /></g>)}
      <L d="M240 52 q5 -5 10 0 q5 -5 10 0 M272 38 q4 -4 8 0 q4 -4 8 0" sw={1.4} />
    </g>
  ),
  "home-office": () => (
    <g>
      {/* plant on the sill, pinned notes, a desk lamp, headphones, a rug and a framed photo */}
      <Plant x={126} y={110} s={0.6} />
      {[[168, 34], [184, 40], [200, 32], [176, 56], [196, 54]].map(([x, y]) => <Sh key={`${x}${y}`} d={rect(x, y, 13, 13)} fill={C.caption} sw={1.1} />)}
      <L d="M252 174 v-26 l12 -12" sw={2} /><Sh d="M262 132 l12 2 l-4 10 Z" fill={C.g5} sw={1.4} />
      <path d="M176 172 q0 -12 10 -12 q10 0 10 12" fill="none" stroke={ink} strokeWidth={2} /><Sh d={rect(173, 168, 6, 7)} fill={C.g7} sw={1} /><Sh d={rect(193, 168, 6, 7)} fill={C.g7} sw={1} />
      <ellipse cx={200} cy={238} rx={90} ry={5} fill={C.g2} stroke={ink} strokeWidth={1.3} />
    </g>
  ),
  hotel: () => (
    <g>
      {/* elevator floor dial, a chandelier, a potted plant, a rolling suitcase and a rug */}
      <Sh d="M34 56 a20 20 0 0 1 40 0 Z" fill={C.paper} sw={1.4} /><L d="M54 56 l10 -12" sw={1.4} />
      <L d="M200 0 v18" sw={1.2} /><Sh d="M180 18 h40 l-6 12 h-28 Z" fill={C.g2} sw={1.4} />
      {[186, 200, 214].map((x) => <circle key={x} cx={x} cy={34} r={2.4} fill={C.caption} stroke={ink} strokeWidth={1} />)}
      <Plant x={220} y={234} s={1} />
      <Sh d={rect(178, 196, 22, 34)} fill={C.g4} sw={1.5} /><L d="M184 196 V180 M194 196 V180 M184 180 H194 M178 212 h22" sw={1.5} />
      <circle cx={182} cy={232} r={2} fill={ink} /><circle cx={196} cy={232} r={2} fill={ink} />
      <ellipse cx={130} cy={239} rx={60} ry={5} fill={C.g2} stroke={ink} strokeWidth={1.3} />
    </g>
  ),
  classroom: () => (
    <g>
      {/* alphabet strip, a globe and books on a shelf, posters, a teacher's desk and backpacks */}
      <Sh d={rect(60, 10, 200, 14)} fill={C.paper} sw={1.3} />
      <text x={160} y={21} textAnchor="middle" fontFamily="Patrick Hand" fontSize={11} fill={ink} letterSpacing={3}>Aa Bb Cc Dd Ee Ff Gg</text>
      <Sh d={rect(356, 150, 40, 84)} fill={C.g2} /><L d="M356 180 h40 M356 208 h40" sw={1.3} />
      {[360, 367, 374, 382].map((x, i) => <Sh key={x} d={rect(x, 180 - [20, 16, 22, 18][i], 6, [20, 16, 22, 18][i])} fill={[C.g4, C.g5, C.g7, C.g2][i]} sw={1} />)}
      <circle cx={376} cy={138} r={10} fill={C.g1} stroke={ink} strokeWidth={1.5} /><L d="M366 138 h20 M376 128 q-6 10 0 20" sw={1} /><L d="M376 148 v2" sw={2} />
      <Frame x={296} y={92} w={32} h={38} kind="lines" />
      <Sh d="M110 234 q-2 -16 10 -18 q12 2 10 18 Z" fill={C.g5} sw={1.4} />
      <Sh d="M250 234 q-2 -14 9 -16 q11 2 9 16 Z" fill={C.g4} sw={1.4} />
    </g>
  ),
};

/** Distant things drawn behind the scene itself (skylines), so the scene's own props overlap them. */
export const SCENE_UNDER: Record<string, () => ReactNode> = {
  street: () => (
    <g>
      <path d="M180 150 V78 h26 v-14 h22 v36 h18 V56 h30 v44 h20 v-28 h24 v28 h24 v50 Z" fill={C.g1} stroke={C.g5} strokeWidth={1.3} />
      {[190, 256, 262, 312].map((x) => <L key={x} d={`M${x} 92 h6 M${x} 104 h6 M${x} 116 h6`} sw={1} color={C.g5} />)}
    </g>
  ),
  park: () => (
    <g>
      <path d="M0 176 Q80 140 170 170 Q250 196 320 158 Q370 136 400 150 V234 H0 Z" fill={C.g1} stroke="none" />
      <L d="M0 176 Q80 140 170 170 Q250 196 320 158 Q370 136 400 150" sw={1.3} color={C.g5} />
    </g>
  ),
  "bus-stop": () => <path d="M0 150 V100 h24 v-20 h30 v34 h22 V92 h28 v58 Z" fill={C.g1} stroke={C.g5} strokeWidth={1.3} />,
};
