import type { Board } from "../types";
import { PanelArt, panelHasProduct, type RenderOptions } from "./panel";
import { C, FONT, PANEL_H, PANEL_W } from "./tokens";
import { wrap } from "./layout";

export const PAGE = { margin: 44, gapX: 28, gapY: 50, header: 96, footer: 56 };

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
    height: PAGE.header + rows * (PANEL_H + PAGE.gapY) + PAGE.footer,
  };
}

export function panelOrigin(board: Board, i: number): [number, number] {
  const cols = columnsFor(board);
  return [PAGE.margin + (i % cols) * (PANEL_W + PAGE.gapX), PAGE.header + Math.floor(i / cols) * (PANEL_H + PAGE.gapY)];
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
}

/** The whole storyboard page as one SVG. Same component for the editor and the exporter. */
export function BoardSVG({ board, opts }: { board: Board; opts: BoardOptions }) {
  const { width, height } = pageSize(board);
  const sub = [board.persona && `Persona: ${board.persona}`, board.subtitle].filter(Boolean).join(" · ");
  const anyProduct = board.panels.some(panelHasProduct);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`} width={width} height={height} data-board>
      <defs>
        {WOBBLE_FILTER}
        {opts.fontCss && <style>{opts.fontCss}</style>}
      </defs>
      <rect width={width} height={height} fill={C.paper} />
      <text x={PAGE.margin} y={54} fontFamily={FONT.title} fontSize={32} fill={C.ink} data-el="__title">{board.title}</text>
      {sub && <text x={PAGE.margin} y={80} fontFamily={FONT.hand} fontSize={18} fill={C.g8}>{sub}</text>}
      {board.panels.map((p, i) => {
        const [x, y] = panelOrigin(board, i);
        const label = wrap(`${i + 1}${p.label ? ` · ${p.label}` : ""}`, 14.5, PANEL_W)[0];
        return (
          <g key={p.id} transform={`translate(${x} ${y})`}>
            <PanelArt board={board} panel={p} opts={opts} />
            {!opts.bare && <text x={2} y={PANEL_H + 21} fontFamily={FONT.hand} fontSize={14.5} fill={C.g8}>{label}</text>}
          </g>
        );
      })}
      {anyProduct && (
        <g transform={`translate(${PAGE.margin} ${height - PAGE.footer + 18})`}>
          <rect x={0} y={0} width={16} height={16} fill={C.teal} stroke={C.ink} strokeWidth={1.6} />
          <text x={26} y={13} fontFamily={FONT.hand} fontSize={16} fill={C.g8}>= where the product shows up in {board.persona ? board.persona.split(",")[0] + "'s" : "their"} day</text>
        </g>
      )}
    </svg>
  );
}
