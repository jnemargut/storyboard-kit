import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Board } from "../types";
import { BoardSVG, pageSize, panelOrigin, type BoardOptions } from "./board";
import { PANEL_H, PANEL_W } from "./tokens";

export { BoardSVG, pageSize, panelOrigin, columnsFor, feelingOf, productShare } from "./board";
export type { BoardOptions } from "./board";

/** Render a board to a standalone SVG string (for export and tests). */
export function renderBoardSVG(board: Board, opts: BoardOptions): string {
  return renderToStaticMarkup(createElement(BoardSVG, { board, opts }));
}

/** Where panel `index` sits on the board page, with a small margin (for cropping panel images). */
export function panelRect(board: Board, index: number, margin = 6) {
  const [x, y] = panelOrigin(board, index);
  return { x: x - margin, y: y - margin, w: PANEL_W + margin * 2, h: PANEL_H + margin * 2 };
}
