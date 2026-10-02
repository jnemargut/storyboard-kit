import { describe, expect, it } from "vitest";
import { parseRich, plainText, styleLines, toggleMark } from "../src/sketch/rich";

describe("rich text", () => {
  it("parses bold, italic and strikethrough", () => {
    expect(parseRich("a **bold** *it* _also_ ~~gone~~ b")).toEqual([
      { text: "a " }, { text: "bold", b: true }, { text: " " }, { text: "it", i: true }, { text: " " }, { text: "also", i: true }, { text: " " }, { text: "gone", s: true }, { text: " b" },
    ]);
  });
  it("nests", () => expect(parseRich("**bold *and italic***")).toEqual([{ text: "bold ", b: true }, { text: "and italic", b: true, i: true }]));
  it("leaves stray markers, math and snake_case alone", () => {
    expect(plainText("2 * 3 * 4")).toBe("2 * 3 * 4");
    expect(plainText("order_ahead_flow")).toBe("order_ahead_flow");
    expect(plainText("a ** b")).toBe("a ** b");
    expect(plainText("*unclosed")).toBe("*unclosed");
    expect(plainText("\\*not italic\\*")).toBe("*not italic*");
  });
  it("puts styles back on wrapped lines", () => {
    const lines = styleLines("Ask the **barista** about *it*", ["Ask the barista", "about it"]);
    expect(lines[0]).toEqual([{ text: "Ask the " }, { text: "barista", b: true }]);
    expect(lines[1]).toEqual([{ text: "about " }, { text: "it", i: true }]);
  });
  it("toggles markers around a selection, keeping spaces outside", () => {
    expect(toggleMark("say hi there", 4, 7, "**").value).toBe("say **hi** there");
    expect(toggleMark("say **hi** there", 6, 8, "**").value).toBe("say hi there");
    expect(toggleMark("a b", 1, 3, "*").value).toBe("a *b*");
  });
});
