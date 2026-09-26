import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Board } from "../types";
import { BoardSVG, type BoardOptions } from "./board";

export { BoardSVG, pageSize, panelOrigin, columnsFor } from "./board";
export type { BoardOptions } from "./board";

/** Render a board to a standalone SVG string (for export and tests). */
export function renderBoardSVG(board: Board, opts: BoardOptions): string {
  return renderToStaticMarkup(createElement(BoardSVG, { board, opts }));
}
