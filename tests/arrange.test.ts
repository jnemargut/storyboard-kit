/** Bring to front / send to back, including across the scene's furniture (a table, a counter). */
import { describe, expect, it } from "vitest";
import { arrangeOps } from "../src/editor/model";
import { renderBoardSVG } from "../src/render";
import { applyOps } from "../src/sketch/json";
import { validate } from "../src/validate";
import type { Board } from "../src/types";

const asset = () => undefined;
const board = {
  schemaVersion: 1,
  title: "Layers",
  cast: { a: { skin: "tone-2", hair: "long" }, b: { skin: "tone-4", hair: "short" } },
  panels: [{
    id: "p", scene: "coworking",
    characters: [{ who: "a", at: "table-left" }, { who: "b", at: "standing" }],
    devices: [{ type: "laptop" }],
  }],
} as unknown as Board;

/** Where an element first appears in the SVG: later = drawn on top. */
const at = (svg: string, el: string) => svg.indexOf(`data-el="${el}"`);
const sel = (el: string, kind: "character" | "device") => ({ panel: "p", el, kind });

describe("arrange", () => {
  it("brings someone seated behind a table in front of the laptop on it", () => {
    const before = renderBoardSVG(board, { asset });
    expect(at(before, "a")).toBeLessThan(at(before, "laptop"));
    const ops = arrangeOps(board, sel("a", "character"), "front");
    expect(ops).toBeDefined();
    const next = applyOps(board, ops!);
    const after = renderBoardSVG(next, { asset });
    expect(at(after, "a")).toBeGreaterThan(at(after, "laptop"));
    expect(validate(next).errors).toEqual([]);
  });

  it("forward from the top of the back layer also crosses the furniture", () => {
    expect(arrangeOps(board, sel("a", "character"), "forward")).toBeDefined();
  });

  it("sends a device behind the furniture, and back again", () => {
    const ops = arrangeOps(board, sel("laptop", "device"), "back")!;
    const next = applyOps(board, ops);
    expect(next.panels[0].layout?.laptop?.layer).toBe("back");
    const again = arrangeOps(next, sel("laptop", "device"), "front")!;
    expect(applyOps(next, again).panels[0].layout?.laptop?.layer).toBe("front");
  });

  it("says nothing changed only when it really can't move", () => {
    const front = applyOps(board, arrangeOps(board, sel("b", "character"), "front") ?? []);
    expect(arrangeOps(front, sel("b", "character"), "front")).toBeUndefined();
  });
});
