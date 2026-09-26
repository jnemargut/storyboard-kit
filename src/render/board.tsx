import type { Board, Panel } from "../types";
import { isScene } from "../types";
import { PanelArt, panelHasProduct, type RenderOptions } from "./panel";
import { C, FONT, PANEL_H, PANEL_W } from "./tokens";
import { wrap } from "./layout";

export const PAGE = { margin: 44, gapX: 28, gapY: 50, header: 96, footer: 56 };
const ts = (b: Board) => b.page?.textScale ?? 1;
/** Header and label space grow with the board's text size. */
export const LANE_H = 50;
const geo = (b: Board) => ({ header: 50 + 46 * ts(b), gapY: 30 + 22 * ts(b) + (b.page?.lanes ? LANE_H : 0), journey: b.page?.lanes ? 120 : 0 });

const MOOD_FEEL: Record<string, number> = {
  happy: 2, excited: 2, relieved: 1, neutral: 0, focused: 0, surprised: 0,
  confused: -1, impatient: -1, tired: -1, frustrated: -2, stressed: -2, sad: -2,
};
/** -2…2. Explicit `feeling`, else the focus (or first) character's mood. Undefined for cards. */
export function feelingOf(p: Panel): number | undefined {
  if (!isScene(p)) return undefined;
  if (typeof p.feeling === "number") return p.feeling;
  const c = (p.characters ?? []).find((x) => (x.id ?? x.who) === p.focus) ?? p.characters?.[0];
  return c ? MOOD_FEEL[c.mood ?? "neutral"] ?? 0 : undefined;
}

function LaneStrip({ p, k }: { p: Panel; k: number }) {
  if (!isScene(p)) return null;
  const f = feelingOf(p);
  const product = panelHasProduct(p);
  const size = 12.5 * Math.min(k, 1.4);
  return (
    <g data-lane={p.id} transform={`translate(0 ${PANEL_H + 8})`}>
      <rect x={0} y={0} width={PANEL_W} height={LANE_H - 12} fill={C.g1} stroke={C.g4} strokeWidth={1} />
      <text x={8} y={24} fontFamily={FONT.hand} fontSize={size} fill={C.g8}>feels</text>
      {[-2, -1, 0, 1, 2].map((v, i) => (
        <circle key={v} cx={52 + i * 17} cy={19} r={v === f ? 6.5 : 4} fill={v === f ? C.ink : "none"} stroke={C.ink} strokeWidth={v === f ? 2 : 1.2} />
      ))}
      <path d="M40 10 q3 -3 6 0 M136 8 q3 3 6 0" stroke={C.ink} strokeWidth={1.2} fill="none" />
      <rect x={158} y={11} width={16} height={16} fill={product ? C.teal : "none"} stroke={C.ink} strokeWidth={1.6} strokeDasharray={product ? undefined : "3 2"} />
      <text x={180} y={24} fontFamily={FONT.hand} fontSize={size} fill={C.g8}>{product ? "product" : "no product"}</text>
      {p.workaround && (
        <g>
          <rect x={250} y={5} width={144} height={28} fill={C.caption} stroke={C.ink} strokeWidth={1.3} transform="rotate(-1.5 322 19)" />
          <text x={256} y={23} fontFamily={FONT.hand} fontSize={Math.min(size, 12)} fill={C.ink}>{wrap(p.workaround, 12, 136)[0]}{wrap(p.workaround, 12, 136).length > 1 ? "…" : ""}</text>
        </g>
      )}
    </g>
  );
}

/** Whole-journey summary under the grid: feeling line over product squares, one column per panel. */
function Journey({ board, y, width }: { board: Board; y: number; width: number }) {
  const n = board.panels.length;
  const x0 = PAGE.margin + 70, span = width - PAGE.margin * 2 - 90;
  const cx = (i: number) => x0 + (n === 1 ? span / 2 : (span * i) / (n - 1));
  const fy = (f: number) => y + 40 - f * 13;
  const pts = board.panels.map((p, i) => ({ i, f: feelingOf(p) })).filter((q) => q.f !== undefined) as { i: number; f: number }[];
  return (
    <g data-journey>
      <text x={PAGE.margin} y={y + 44} fontFamily={FONT.hand} fontSize={15} fill={C.g8}>feeling</text>
      <text x={PAGE.margin} y={y + 92} fontFamily={FONT.hand} fontSize={15} fill={C.g8}>product</text>
      <line x1={x0 - 10} y1={fy(0)} x2={x0 + span + 10} y2={fy(0)} stroke={C.g4} strokeDasharray="4 4" />
      {pts.length > 1 && <polyline points={pts.map((q) => `${cx(q.i)},${fy(q.f)}`).join(" ")} fill="none" stroke={C.ink} strokeWidth={2.4} strokeLinejoin="round" filter="url(#sb-wobble)" />}
      {pts.map((q) => <circle key={q.i} cx={cx(q.i)} cy={fy(q.f)} r={4.5} fill={C.ink} />)}
      {board.panels.map((p, i) => (
        <g key={p.id}>
          {isScene(p)
            ? <rect x={cx(i) - 9} y={y + 78} width={18} height={18} fill={panelHasProduct(p) ? C.teal : "none"} stroke={C.ink} strokeWidth={1.6} strokeDasharray={panelHasProduct(p) ? undefined : "3 2"} />
            : <text x={cx(i)} y={y + 92} textAnchor="middle" fontFamily={FONT.hand} fontSize={13} fill={C.g5}>{p.type === "time" ? "…" : "·"}</text>}
          <text x={cx(i)} y={y + 112} textAnchor="middle" fontFamily={FONT.hand} fontSize={12} fill={C.g5}>{i + 1}</text>
        </g>
      ))}
    </g>
  );
}

/** "Product in 3 of 7 moments": the service-design headline. */
export function productShare(board: Board) {
  const scenes = board.panels.filter(isScene);
  return { withProduct: scenes.filter(panelHasProduct).length, moments: scenes.length };
}

export function columnsFor(board: Board): number {
  const n = board.panels.length;
  if (board.page?.columns) return board.page.columns;
  if (n <= 3) return n;
  if (n === 4) return 2;
  if (n <= 6) return 3;
  return n % 4 === 0 || n > 9 ? 4 : 3;
}

export function pageSize(board: Board) {
  const cols = columnsFor(board);
  const rows = Math.ceil(board.panels.length / cols);
  return {
    cols, rows,
    width: PAGE.margin * 2 + cols * PANEL_W + (cols - 1) * PAGE.gapX,
    height: geo(board).header + rows * (PANEL_H + geo(board).gapY) + geo(board).journey + PAGE.footer,
  };
}

export function panelOrigin(board: Board, i: number): [number, number] {
  const cols = columnsFor(board);
  const g = geo(board);
  return [PAGE.margin + (i % cols) * (PANEL_W + PAGE.gapX), g.header + Math.floor(i / cols) * (PANEL_H + g.gapY)];
}

export const WOBBLE_FILTER = (
  <filter id="sb-wobble" x="-2%" y="-2%" width="104%" height="104%">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={7} result="n" />
    <feDisplacementMap in="SourceGraphic" in2="n" scale={1.6} xChannelSelector="R" yChannelSelector="G" />
  </filter>
);

export interface BoardOptions extends RenderOptions {
  /** Extra <style> for the browser (font-face). Omit for resvg, which loads fonts itself. */
  fontCss?: string;
  /** Hide per-panel captions under the grid. */
  bare?: boolean;
  /** Editor mode: show placeholders for empty editable text. */
  editing?: boolean;
}

/** The whole storyboard page as one SVG. Same component for the editor and the exporter. */
export function BoardSVG({ board, opts }: { board: Board; opts: BoardOptions }) {
  const { width, height } = pageSize(board);
  const sub = [board.persona && `Persona: ${board.persona}`, board.subtitle].filter(Boolean).join(" · ");
  const anyProduct = board.panels.some(panelHasProduct);
  const k = ts(board);
  const share = productShare(board);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`} width={width} height={height} data-board>
      <defs>
        {WOBBLE_FILTER}
        <filter id="sb-gray"><feColorMatrix type="saturate" values="0" /></filter>
        {opts.fontCss && <style>{opts.fontCss}</style>}
      </defs>
      <rect width={width} height={height} fill={C.paper} />
      <g data-header="title"><text x={PAGE.margin} y={20 + 34 * k} fontFamily={FONT.title} fontSize={32 * k} fill={C.ink}>{board.title}</text></g>
      <g data-header="meta"><text x={PAGE.margin} y={20 + 62 * k} fontFamily={FONT.hand} fontSize={18 * k} fill={sub ? C.g8 : C.g4}>{sub || (opts.editing ? "+ persona / subtitle" : "")}</text></g>
      {board.panels.map((p, i) => {
        const [x, y] = panelOrigin(board, i);
        const label = wrap(`${i + 1}${p.label ? ` · ${p.label}` : ""}`, 15.5 * k, PANEL_W)[0];
        return (
          <g key={p.id} transform={`translate(${x} ${y})`}>
            <PanelArt board={board} panel={p} opts={opts} />
            {board.page?.lanes && <LaneStrip p={p} k={k} />}
            {!opts.bare && <g data-label={p.id}><text x={2} y={PANEL_H + 6 + 16 * k + (board.page?.lanes ? LANE_H : 0)} fontFamily={FONT.hand} fontSize={15.5 * k} fill={C.g8}>{label}</text></g>}
          </g>
        );
      })}
      {share.moments > 0 && (
        <g data-header="stats">
          <text x={width - PAGE.margin} y={20 + 34 * k} textAnchor="end" fontFamily={FONT.hand} fontSize={20 * Math.min(k, 1.4)} fill={C.ink}>
            Product in <tspan fill={C.tealDark} fontWeight="bold">{share.withProduct} of {share.moments}</tspan> moments
          </text>
        </g>
      )}
      {board.page?.lanes && <Journey board={board} y={height - PAGE.footer - geo(board).journey} width={width} />}
      {anyProduct && (
        <g transform={`translate(${PAGE.margin} ${height - PAGE.footer + 18})`}>
          <rect x={0} y={0} width={16} height={16} fill={C.teal} stroke={C.ink} strokeWidth={1.6} />
          <text x={26} y={13} fontFamily={FONT.hand} fontSize={16 * Math.min(k, 1.3)} fill={C.g8}>= where the product shows up in {board.persona ? board.persona.split(",")[0] + "'s" : "their"} day</text>
        </g>
      )}
    </svg>
  );
}
