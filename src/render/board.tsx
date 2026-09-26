import type { Board, Panel } from "../types";
import { isScene } from "../types";
import { PanelArt, panelHasProduct, type RenderOptions } from "./panel";
import { C, FONT, PANEL_H, PANEL_W } from "./tokens";
import { ADV_TITLE, textWidth, wrap } from "./layout";

export const PAGE = { margin: 44, gapX: 28, gapY: 50, header: 96, footer: 56 };
const ts = (b: Board) => b.page?.textScale ?? 1;
/** Header and label space grow with the board's text size. */
export const LANE_H = 50;
const geo = (b: Board) => ({ header: headerLayout(b).height, gapY: 30 + 22 * ts(b) + (b.page?.lanes ? LANE_H : 0), journey: b.page?.lanes ? 150 : 0 });

const pageWidth = (b: Board) => { const c = columnsFor(b); return PAGE.margin * 2 + c * PANEL_W + (c - 1) * PAGE.gapX; };
const metaText = (b: Board) => [b.persona && `Persona: ${b.persona}`, b.subtitle].filter(Boolean).join(" · ");
const shareText = (b: Board) => { const s = productShare(b); return s.moments ? `Product in ${s.withProduct} of ${s.moments} moments` : ""; };

/**
 * The page header adapts to the page width (a 1-across board is narrow): the title shrinks and wraps, the
 * persona line wraps, and the product count moves under the title when it doesn't fit beside it.
 */
export function headerLayout(b: Board) {
  const k = ts(b);
  const avail = pageWidth(b) - PAGE.margin * 2;
  const statsSize = 20 * Math.min(k, 1.4);
  const statsW = shareText(b) ? textWidth(shareText(b), statsSize) + 10 : 0;
  let titleSize = 32 * k;
  const fits = (sz: number, room: number) => textWidth(b.title, sz, ADV_TITLE) <= room;
  const beside = statsW > 0 && fits(titleSize, avail - statsW - 20);
  while (!fits(titleSize, beside ? avail - statsW - 20 : avail) && titleSize > 20 * k) titleSize -= 1;
  const titleLines = wrap(b.title, titleSize, beside ? avail - statsW - 20 : avail, ADV_TITLE);
  const metaSize = 18 * k;
  const metaLines = metaText(b) ? wrap(metaText(b), metaSize, avail) : [""];
  const titleTop = 20 + titleSize * 1.05;
  const titleH = titleLines.length * titleSize * 1.1;
  const metaTop = 20 + titleH + metaSize * 1.2;
  const statsTop = beside ? titleTop : metaTop + (metaLines.length - 1) * metaSize * 1.2 + statsSize * 1.4;
  const bottom = (beside || !statsW ? metaTop + (metaLines.length - 1) * metaSize * 1.2 : statsTop) + 22;
  return { k, titleSize, titleLines, titleTop, metaSize, metaLines, metaTop, statsSize, statsTop, beside, height: Math.max(bottom, 50 + 46 * k) };
}

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

const FEEL_WORD: Record<number, string> = { [-2]: "awful", [-1]: "bad", 0: "okay", 1: "good", 2: "great" };

/** Tiny face used as the ends of the feeling scale (sad on the left, happy on the right). */
const MiniFace = ({ x, y, happy }: { x: number; y: number; happy: boolean }) => (
  <g>
    <circle cx={x} cy={y} r={7} fill={C.paper} stroke={C.ink} strokeWidth={1.5} />
    <circle cx={x - 2.4} cy={y - 1.5} r={0.9} fill={C.ink} /><circle cx={x + 2.4} cy={y - 1.5} r={0.9} fill={C.ink} />
    <path d={happy ? `M${x - 3} ${y + 1.5} q3 3 6 0` : `M${x - 3} ${y + 3.5} q3 -3 6 0`} fill="none" stroke={C.ink} strokeWidth={1.4} strokeLinecap="round" />
  </g>
);

function LaneStrip({ p, k, editing }: { p: Panel; k: number; editing?: boolean }) {
  if (!isScene(p)) return null;
  const f = feelingOf(p);
  const product = panelHasProduct(p);
  const size = 12.5 * Math.min(k, 1.4);
  const dotX = (i: number) => 32 + i * 17;
  return (
    <g data-lane={p.id} transform={`translate(0 ${PANEL_H + 8})`}>
      <rect x={0} y={0} width={PANEL_W} height={LANE_H - 12} fill={C.g1} stroke={C.g4} strokeWidth={1} />
      <MiniFace x={13} y={19} happy={false} />
      {[-2, -1, 0, 1, 2].map((v, i) => (
        <g key={v} data-lane-feel={v} style={editing ? { cursor: "pointer" } : undefined}>
          <circle cx={dotX(i)} cy={19} r={9} fill="transparent" />
          <circle cx={dotX(i)} cy={19} r={v === f ? 6.5 : 3.8} fill={v === f ? C.ink : C.paper} stroke={C.ink} strokeWidth={v === f ? 2 : 1.3} />
        </g>
      ))}
      <MiniFace x={dotX(4) + 16} y={19} happy />
      <text x={dotX(4) + 28} y={24} fontFamily={FONT.hand} fontSize={size} fill={C.g8}>{f === undefined ? "" : FEEL_WORD[f]}</text>
      <g data-lane-product={p.id}>
        <rect x={176} y={11} width={16} height={16} fill={product ? C.teal : "none"} stroke={C.ink} strokeWidth={1.6} strokeDasharray={product ? undefined : "3 2"} />
        <text x={197} y={24} fontFamily={FONT.hand} fontSize={size} fill={C.g8}>{product ? "product" : "no product"}</text>
      </g>
      {(p.workaround || editing) && (
        <g data-lane-workaround={p.id} style={editing ? { cursor: "text" } : undefined}>
          <rect x={258} y={5} width={136} height={28} fill={p.workaround ? C.caption : "transparent"} stroke={p.workaround ? C.ink : C.g5} strokeWidth={1.3} strokeDasharray={p.workaround ? undefined : "4 3"} transform="rotate(-1.5 326 19)" />
          <text x={264} y={23} fontFamily={FONT.hand} fontSize={Math.min(size, 12)} fill={p.workaround ? C.ink : C.g5}>{p.workaround ? `${wrap(p.workaround, 12, 128)[0]}${wrap(p.workaround, 12, 128).length > 1 ? "…" : ""}` : "+ workaround"}</text>
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
  const gap = n === 1 ? span : span / (n - 1);
  const pts = board.panels.map((p, i) => ({ i, f: feelingOf(p) })).filter((q) => q.f !== undefined) as { i: number; f: number }[];
  return (
    <g data-journey>
      <text x={PAGE.margin} y={y + 44} fontFamily={FONT.hand} fontSize={15} fill={C.g8}>feeling</text>
      <text x={PAGE.margin} y={y + 92} fontFamily={FONT.hand} fontSize={15} fill={C.g8}>product</text>
      <line x1={x0 - 10} y1={fy(0)} x2={x0 + span + 10} y2={fy(0)} stroke={C.g4} strokeDasharray="4 4" />
      {pts.length > 1 && <polyline points={pts.map((q) => `${cx(q.i)},${fy(q.f)}`).join(" ")} fill="none" stroke={C.ink} strokeWidth={2.4} strokeLinejoin="round" filter="url(#sb-wobble-page)" />}
      {pts.map((q) => <circle key={q.i} cx={cx(q.i)} cy={fy(q.f)} r={4.5} fill={C.ink} />)}
      {board.panels.map((p, i) => (
        <g key={p.id}>
          {isScene(p)
            ? <rect x={cx(i) - 9} y={y + 78} width={18} height={18} fill={panelHasProduct(p) ? C.teal : "none"} stroke={C.ink} strokeWidth={1.6} strokeDasharray={panelHasProduct(p) ? undefined : "3 2"} />
            : <text x={cx(i)} y={y + 92} textAnchor="middle" fontFamily={FONT.hand} fontSize={13} fill={C.g5}>{p.type === "time" ? "…" : "·"}</text>}
          <text x={cx(i)} y={y + 112} textAnchor="middle" fontFamily={FONT.hand} fontSize={12} fill={C.g5}>{i + 1}</text>
          {/* the step's name, so the line reads as a journey rather than a squiggle */}
          {stepName(p) && (() => {
            const lines = wrap(stepName(p)!, 13, Math.max(60, gap - 10));
            const shown = lines.length > 2 ? [lines[0], `${lines[1]}…`] : lines;
            return <text textAnchor="middle" fontFamily={FONT.hand} fontSize={13} fill={C.g8}>{shown.map((l, k) => <tspan key={k} x={cx(i)} y={y + 127 + k * 14}>{l}</tspan>)}</text>;
          })()}
        </g>
      ))}
    </g>
  );
}

/** What a step is called on the journey chart: its label, or a time card's own text. */
export function stepName(p: Panel): string | undefined {
  if (p.label) return p.label;
  if (p.type === "time") return p.text;
  return undefined;
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

/**
 * The marker wobble. Its region is pinned to the panel (panel units, userSpaceOnUse) rather than the
 * artwork's bounding box: zoomed cameras and big over-the-shoulder shots put art far off the page, and a
 * filter region hanging off the canvas crashes resvg. A page-space twin serves things drawn on the page.
 */
export const WOBBLE_FILTER = (
  <>
    <filter id="sb-wobble" filterUnits="userSpaceOnUse" x={-8} y={-8} width={PANEL_W + 16} height={PANEL_H + 16}>
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={7} result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale={1.6} xChannelSelector="R" yChannelSelector="G" />
    </filter>
    <filter id="sb-wobble-page" x="-2%" y="-10%" width="104%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={7} result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale={1.6} xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </>
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
  const anyGesture = board.panels.some((p) => isScene(p) && (p.gestures?.length ?? 0) > 0);
  const k = ts(board);
  const share = productShare(board);
  const hd = headerLayout(board);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`} width={width} height={height} data-board>
      <defs>
        {WOBBLE_FILTER}
        <filter id="sb-gray"><feColorMatrix type="saturate" values="0" /></filter>
        {opts.fontCss && <style>{opts.fontCss}</style>}
      </defs>
      <rect width={width} height={height} fill={C.paper} />
      <g data-header="title"><text fontFamily={FONT.title} fontSize={hd.titleSize} fill={C.ink}>{hd.titleLines.map((l, i) => <tspan key={i} x={PAGE.margin} y={hd.titleTop + i * hd.titleSize * 1.1}>{l}</tspan>)}</text></g>
      <g data-header="meta"><text fontFamily={FONT.hand} fontSize={hd.metaSize} fill={sub ? C.g8 : C.g4}>{sub ? hd.metaLines.map((l, i) => <tspan key={i} x={PAGE.margin} y={hd.metaTop + i * hd.metaSize * 1.2}>{l}</tspan>) : <tspan x={PAGE.margin} y={hd.metaTop}>{opts.editing ? "+ persona / subtitle" : ""}</tspan>}</text></g>
      {board.panels.map((p, i) => {
        const [x, y] = panelOrigin(board, i);
        const label = wrap(`${i + 1}${p.label ? ` · ${p.label}` : opts.editing ? " · + name this step" : ""}`, 15.5 * k, PANEL_W)[0];
        return (
          <g key={p.id} transform={`translate(${x} ${y})`}>
            <PanelArt board={board} panel={p} opts={opts} />
            {board.page?.lanes && <LaneStrip p={p} k={k} editing={opts.editing} />}
            {!opts.bare && <g data-label={p.id}><text x={2} y={PANEL_H + 6 + 16 * k + (board.page?.lanes ? LANE_H : 0)} fontFamily={FONT.hand} fontSize={15.5 * k} fill={p.label || !opts.editing ? C.g8 : C.g4}>{label}</text></g>}
          </g>
        );
      })}
      {share.moments > 0 && !opts.guides && (
        <g data-header="stats">
          <text x={hd.beside ? width - PAGE.margin : PAGE.margin} y={hd.statsTop} textAnchor={hd.beside ? "end" : "start"} fontFamily={FONT.hand} fontSize={hd.statsSize} fill={C.ink}>
            Product in <tspan fill={C.tealDark} fontWeight="bold">{share.withProduct} of {share.moments}</tspan> moments
          </text>
        </g>
      )}
      {board.page?.lanes && <Journey board={board} y={height - PAGE.footer - geo(board).journey} width={width} />}
      {anyProduct && (
        <g transform={`translate(${PAGE.margin} ${height - PAGE.footer + 18})`}>
          <rect x={0} y={0} width={16} height={16} fill={C.teal} stroke={C.ink} strokeWidth={1.6} />
          <text x={26} y={13} fontFamily={FONT.hand} fontSize={16 * Math.min(k, 1.3)} fill={C.g8}>= where the product shows up in {board.persona ? board.persona.split(",")[0] + "'s" : "their"} day</text>
          {anyGesture && <g transform="translate(420 0)"><circle cx={8} cy={8} r={6} fill="none" stroke={C.paper} strokeWidth={5} /><circle cx={8} cy={8} r={6} fill="none" stroke={C.action} strokeWidth={2.4} /><text x={24} y={13} fontFamily={FONT.hand} fontSize={16 * Math.min(k, 1.3)} fill={C.g8}>= what they do (tap, swipe, click)</text></g>}
        </g>
      )}
    </svg>
  );
}
