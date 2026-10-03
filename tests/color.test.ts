/** Any color: drawings and sharpie marks take a hex next to the marker names. */
import { describe, expect, it } from "vitest";
import { renderBoardSVG } from "../src/render";
import { isHex, markerHex, normHex } from "../src/sketch/tokens";
import { validate } from "../src/validate";
import type { Board } from "../src/types";

const asset = () => undefined;
const board = (color: string) => ({
  schemaVersion: 1, title: "c", cast: {},
  panels: [{ id: "p", scene: "blank", shapes: [{ type: "rect", points: [[20, 20], [120, 90]], color, fill: "light" }] }],
}) as unknown as Board;

describe("any color", () => {
  it("knows a hex when it sees one", () => {
    expect(isHex("#e8b04b")).toBe(true);
    expect(isHex("#ABC")).toBe(true);
    expect(isHex("e8b04b")).toBe(false);
    expect(isHex("#e8b04")).toBe(false);
    expect(normHex("#ABC")).toBe("#aabbcc");
    expect(markerHex("red")).toBe("#d9363e");
    expect(markerHex("#E8B04B")).toBe("#e8b04b");
  });
  it("a drawing in any hex validates and draws in that color", () => {
    expect(validate(board("#E8B04B")).errors).toEqual([]);
    expect(renderBoardSVG(board("#E8B04B"), { asset }).toLowerCase()).toContain("#e8b04b");
  });
  it("rejects a color that's neither a marker name nor a hex", () => {
    expect(validate(board("honey")).errors.length).toBeGreaterThan(0);
  });
});
