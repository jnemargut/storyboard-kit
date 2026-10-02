/** Everything you can click in the editor can be deleted, and deleting it makes it go away. */
import { describe, expect, it } from "vitest";
import { deleteOps, type Kind } from "../src/editor/model";
import { renderBoardSVG } from "../src/render";
import { applyOps } from "../src/sketch/json";
import { validate } from "../src/validate";
import type { Board } from "../src/types";

const asset = () => undefined;

const board: Board = {
  schemaVersion: 1,
  title: "Delete everything",
  cast: {
    a: { name: "Ana", skin: "tone-2", hair: "long" },
    b: { name: "Ben", skin: "tone-4", hair: "short" },
    c: { name: "Cy", skin: "tone-1", hair: "curly" },
    d: { name: "Di", skin: "tone-3", hair: "bun" },
  },
  panels: [
    { id: "title", type: "title", title: "A title", subtitle: "A subtitle" },
    { id: "later", type: "time", text: "Later…", icon: "clock", label: "Waiting" },
    {
      id: "busy", scene: "coffee-shop", label: "Busy", workaround: "asks the barista", caption: "A caption",
      characters: [
        { who: "a", pose: "holding-phone" }, // a phone that comes from the pose alone
        { who: "b", pose: "holding-phone", device: "phone" }, // a listed phone and a phone pose
        { who: "c", device: "laptop", pose: "sitting-laptop" },
        { who: "d", pose: "phone-to-ear" },
      ],
      devices: [{ type: "kiosk" }, { type: "payment-terminal" }],
      bubbles: [{ from: "a", text: "Hmm", type: "thought" }],
      gestures: [{ type: "tap", on: "kiosk" }, { type: "swipe", on: "b" }],
      callouts: [{ text: "Pain point", target: "a" }],
      shapes: [{ type: "rect", points: [[20, 20], [60, 50]] }, { type: "text", points: [[200, 40]], text: "Sign" }],
    },
  ],
} as unknown as Board;

/** Every clickable element in each panel, as the editor would select it. */
function clickables(svg: string): { panel: string; el: string; kind: Kind }[] {
  const out: { panel: string; el: string; kind: Kind }[] = [];
  const parts = svg.split(/<g data-panel="/).slice(1);
  for (const part of parts) {
    const panel = part.slice(0, part.indexOf('"'));
    for (const m of part.matchAll(/data-el="([^"]+)" data-kind="([^"]+)"/g)) {
      if (m[1] === "__panel" || m[2] === "header" || m[2] === "point") continue;
      if (!out.some((o) => o.panel === panel && o.el === m[1])) out.push({ panel, el: m[1], kind: m[2] as Kind });
    }
  }
  return out;
}

/** How many times this element is drawn in that panel. */
const countIn = (svg: string, panel: string, el: string) => {
  const part = svg.split(/<g data-panel="/).find((p) => p.startsWith(`${panel}"`)) ?? "";
  return part.split(`data-el="${el}"`).length - 1;
};

const countKind = (svg: string, panel: string, kind: string) => {
  const part = svg.split(/<g data-panel="/).find((p) => p.startsWith(`${panel}"`)) ?? "";
  return new Set([...part.matchAll(new RegExp(`data-el="([^"]+)" data-kind="${kind}"`, "g"))].map((m) => m[1])).size;
};

describe("delete", () => {
  const svg = renderBoardSVG(board, { asset });
  const all = clickables(svg);

  it("finds the things to click", () => {
    expect(all.length).toBeGreaterThan(15);
  });

  for (const sel of all) {
    it(`removes ${sel.kind} "${sel.el}" in ${sel.panel}`, () => {
      const d = deleteOps(board, sel);
      expect(d, "Delete does nothing").toBeDefined();
      const next = applyOps(board, d!.ops);
      const after = renderBoardSVG(next, { asset });
      // numbered ids (shape-0, bubble-1…) shift down after a delete, so count that kind instead
      const numbered = /-\d+$/.test(sel.el);
      const n = (s: string) => (numbered ? countKind(s, sel.panel, sel.kind) : countIn(s, sel.panel, sel.el));
      if (sel.kind === "text") expect(after, "still drawn after Delete").not.toBe(svg);
      else expect(n(after), "still drawn after Delete").toBeLessThan(n(svg));
      expect(validate(next).errors, "the file is still valid").toEqual([]);
    });
  }
});
