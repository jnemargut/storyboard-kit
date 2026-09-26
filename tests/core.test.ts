import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validate, suggest } from "../src/validate";
import { applyOps, formatStoryboard } from "../src/json";
import { renderBoardSVG } from "../src/render";
import { SCENE_DEFS } from "../src/render/scenes";
import { POSE_DEFS } from "../src/render/rig";
import { SCENE_MARKS, SCENES, POSES, MOODS, SHOTS, DEVICES, ANGLES, ids } from "../src/vocab";
import { toScript } from "../src/script";
import { bakeScreen, imageSize } from "../src/export";
import { buildSchema } from "../src/schema";
import type { Board } from "../src/types";

const example: Board = JSON.parse(readFileSync("examples/late-latte.storyboard.json", "utf8"));
const asset = () => undefined;

describe("vocabulary stays in sync with the renderer", () => {
  it("every scene has a drawing and exactly the documented marks", () => {
    for (const s of ids(SCENES)) {
      expect(SCENE_DEFS[s as keyof typeof SCENE_DEFS], s).toBeDefined();
      expect(Object.keys(SCENE_DEFS[s as keyof typeof SCENE_DEFS].marks).sort(), s).toEqual([...SCENE_MARKS[s]].sort());
    }
  });
  it("every pose has front and side joints", () => {
    for (const p of ids(POSES)) {
      const def = POSE_DEFS[p as keyof typeof POSE_DEFS];
      expect(def?.front && def?.side, p).toBeTruthy();
    }
  });
  it("schema enums come from the vocabulary", () => {
    const s = JSON.stringify(buildSchema());
    for (const id of [...ids(SCENES), ...ids(POSES), ...ids(MOODS)]) expect(s).toContain(`"${id}"`);
  });
});

describe("validate", () => {
  it("accepts the example", () => {
    const r = validate(example);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });
  it("suggests the closest vocabulary word", () => {
    expect(suggest("frustated", ids(MOODS))).toBe("frustrated");
    expect(suggest("coffeeshop", ids(SCENES))).toBe("coffee-shop");
    expect(suggest("zzzzzz", ids(MOODS))).toBeUndefined();
  });
  it("catches unknown cast, bad refs, duplicate ids and typos with fix-it hints", () => {
    const bad = structuredClone(example) as unknown as Record<string, any>;
    bad.panels[1].characters[0].who = "mayaa";
    bad.panels[1].characters[0].mood = "frustated";
    bad.panels[2].id = bad.panels[1].id;
    bad.panels[3].bubbles[0].from = "nobody";
    const r = validate(bad);
    expect(r.ok).toBe(false);
    const msgs = r.errors.map((e) => `${e.path} ${e.message} ${e.hint ?? ""}`).join("\n");
    expect(msgs).toContain('Did you mean "maya"');
    expect(msgs).toContain('Did you mean "frustrated"');
    expect(msgs).toContain("Duplicate panel id");
    expect(msgs).toContain('"nobody" isn\'t in this panel');
  });
  it("nudges toward messier, more honest stories", () => {
    const happy: Board = {
      schemaVersion: 1, title: "Happy path", cast: { a: {} },
      panels: [1, 2, 3, 4].map((i) => ({ id: `p${i}`, scene: "office" as const, characters: [{ who: "a", device: "phone" as const }] })),
    };
    const w = validate(happy).warnings.map((x) => x.message).join(" ");
    expect(w).toContain("product appears in every scene panel");
    expect(w).toContain("No thought bubbles");
    expect(w).toContain("same shot");
  });
});

describe("agent-eval regressions", () => {
  const base = (panel: Record<string, unknown>, cast: Board["cast"] = { p: {} }): Board =>
    ({ schemaVersion: 1, title: "t", cast, panels: [{ id: "a", scene: "street", ...panel }] }) as unknown as Board;
  it("hints the real field name for kebab/camel mix-ups", () => {
    const r = validate({ schemaVersion: 1, title: "t", cast: { p: { "hair-shade": "grey" } }, panels: [{ id: "a", type: "text", text: "x" }] });
    expect(r.errors[0].hint).toContain('"hairShade"');
  });
  it("gestures on someone without a device are an error", () => {
    const r = validate(base({ characters: [{ who: "p" }], gestures: [{ type: "typing", on: "p" }] }));
    expect(r.errors.map((e) => e.message).join()).toContain("isn't holding a device");
  });
  it("phone poses imply a personal phone, so gestures on them are fine", () => {
    expect(validate(base({ characters: [{ who: "p", pose: "phone-to-ear" }], gestures: [{ type: "tap", on: "p" }] })).ok).toBe(true);
  });
  it("personal devices (product: false) are grey and don't count as the product", () => {
    const personal = base({ characters: [{ who: "p", device: { type: "phone", product: false } }] });
    const svg = renderBoardSVG(personal, { asset });
    expect(svg).not.toContain("#8fd6dc");
    expect(svg).not.toContain("where the product shows up");
    const ours = renderBoardSVG(base({ characters: [{ who: "p", device: "phone" }] }), { asset });
    expect(ours).toContain("#8fd6dc");
  });
  it("an empty-handed phone pose still gets a (grey) phone", () => {
    const svg = renderBoardSVG(base({ characters: [{ who: "p", pose: "phone-to-ear" }] }), { asset });
    expect(svg).toContain('data-drop="char:p"');
    expect(svg).not.toContain("#8fd6dc");
  });
});

describe("json: diff-friendly writes", () => {
  it("formatting is stable (idempotent)", () => {
    const once = formatStoryboard(example);
    expect(formatStoryboard(JSON.parse(once))).toBe(once);
  });
  it("a nudge changes only a few lines", () => {
    const before = formatStoryboard(example).split("\n");
    const after = formatStoryboard(applyOps(example, [{ path: ["panels", 3, "layout", "maya", "dx"], value: -12 }])).split("\n");
    const pool = [...before];
    const added = after.filter((l) => { const i = pool.indexOf(l); if (i >= 0) { pool.splice(i, 1); return false; } return true; });
    expect(added.length).toBeLessThanOrEqual(3); // e.g. the panel line gains a small "layout" line
    expect(pool.length).toBeLessThanOrEqual(3);
  });
  it("keeps text containing JSON-ish characters intact", () => {
    const b = applyOps(example, [{ path: ["panels", 3, "bubbles", 0, "text"], value: 'She said "a": {b}, ok' }]);
    expect(JSON.parse(formatStoryboard(b)).panels[3].bubbles[0].text).toBe('She said "a": {b}, ok');
  });
  it("applyOps inserts, deletes and prunes empty layout objects", () => {
    let b = applyOps(example, [{ path: ["panels", 3, "layout", "maya", "dx"], value: 5 }]);
    b = applyOps(b, [{ path: ["panels", 3, "layout", "maya", "dx"], delete: true }]);
    expect(b.panels[3].layout).toBeUndefined();
    b = applyOps(b, [{ path: ["panels", 1], value: { id: "new", type: "text", text: "x" }, insert: true }]);
    expect(b.panels[1].id).toBe("new");
    expect(b.panels.length).toBe(example.panels.length + 1);
    expect(example.panels[1].id).toBe("order-ahead"); // input untouched
  });
});

describe("renderer", () => {
  it("renders every panel with ids the editor can select", () => {
    const svg = renderBoardSVG(example, { asset });
    expect(svg).not.toMatch(/NaN|undefined|Infinity/);
    for (const p of example.panels) expect(svg).toContain(`data-panel="${p.id}"`);
    expect(svg).toContain('data-el="maya"');
    expect(svg).toContain('data-el="bubble-0"');
    expect(svg).toContain('data-el="caption"');
  });
  it("renders every scene × shot × pose × angle without NaN", () => {
    for (const scene of ids(SCENES)) for (const shot of ids(SHOTS)) {
      const b: Board = {
        schemaVersion: 1, title: "t", cast: { a: { hair: "hijab", accessories: ["glasses"] }, b: { age: "older", accessories: ["wheelchair", "cane"] } },
        panels: [{ id: "p", scene: scene as never, shot: shot as never, characters: [{ who: "a", device: "phone", mood: "stressed" }, { who: "b", pose: "waving" }], devices: [{ type: "tv" }], bubbles: [{ type: "thought", from: "a", text: "hello there" }], gestures: [{ type: "swipe", on: "a", direction: "up" }] }],
      };
      expect(renderBoardSVG(b, { asset }), `${scene}/${shot}`).not.toMatch(/NaN|Infinity/);
    }
    for (const pose of ids(POSES)) for (const angle of ids(ANGLES)) for (const device of ids(DEVICES)) {
      const b: Board = { schemaVersion: 1, title: "t", cast: { a: {} }, panels: [{ id: "p", scene: "blank", characters: [{ who: "a", pose: pose as never, angle: angle as never, device: device as never }] }] };
      expect(renderBoardSVG(b, { asset }), `${pose}/${angle}/${device}`).not.toMatch(/NaN|Infinity/);
    }
  });
  it("layout overrides move elements", () => {
    const moved = applyOps(example, [{ path: ["panels", 3, "layout", "sam", "dx"], value: 30 }]);
    expect(renderBoardSVG(moved, { asset })).not.toBe(renderBoardSVG(example, { asset }));
  });
});

describe("script + screens", () => {
  it("prints a readable screenplay", () => {
    const s = toScript(example);
    expect(s).toContain("# The Late Latte");
    expect(s).toContain("COFFEE SHOP, OVER THE SHOULDER");
    expect(s).toContain("> **Maya (thinks):** It said 4 min.");
  });
  it("bakes uploaded screens to teal duotone and caches them", () => {
    const cache = mkdtempSync(join(tmpdir(), "sb-cache-"));
    const png = bakeScreen("examples/screens/order-status.png", cache);
    expect(imageSize(png)).toBeDefined();
    expect(bakeScreen("examples/screens/order-status.png", cache).equals(png)).toBe(true);
  });
});
