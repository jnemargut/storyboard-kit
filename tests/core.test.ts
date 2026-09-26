import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { validate, suggest } from "../src/validate";
import { applyOps, formatStoryboard } from "../src/json";
import { renderBoardSVG } from "../src/render";
import { SCENE_DEFS } from "../src/render/scenes";
import { POSE_DEFS } from "../src/render/rig";
import { SCENE_MARKS, SCENES, POSES, MOODS, SHOTS, DEVICES, ANGLES, OUTFITS, HATS, ids } from "../src/vocab";
import { toScript } from "../src/script";
import { bakeScreen, boardToSVG, imageSize, initRenderer, svgToPNG } from "../src/export";

beforeAll(() => initRenderer());
import { buildSchema } from "../src/schema";
import { critique } from "../src/critique";
import { productShare, feelingOf } from "../src/render";
import { arrangeOps, clipFor, deleteOps, pasteOps, swapWhoOps } from "../src/editor/model";
import type { Board, ScenePanel } from "../src/types";
import { layoutPanel } from "../src/render/layout";

const example: Board = JSON.parse(readFileSync("tests/fixtures/late-latte.storyboard.json", "utf8"));
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

describe("devices: held vs placed", () => {
  const b = (chars: unknown[], extra: Record<string, unknown> = {}): Board =>
    ({ schemaVersion: 1, title: "t", cast: { p: {} }, panels: [{ id: "a", scene: "coffee-shop", characters: chars, ...extra }] }) as unknown as Board;
  it("only handheld devices can be held", () => {
    const r = validate(b([{ who: "p", device: "kiosk" }]));
    expect(r.errors[0].message).toContain("can't be held");
    expect(r.errors[0].hint).toContain('"devices"');
  });
  it("a non-handheld device given to someone is drawn beside them, and gestures land on it", () => {
    const svg = renderBoardSVG(b([{ who: "p", device: "kiosk" }], { gestures: [{ type: "tap", on: "p" }] }), { asset });
    expect(svg).toContain('data-el="p.device"');
    expect(svg).toContain('data-el="gesture-0"');
  });
  it("held devices are separately selectable and movable", () => {
    const moved = applyOps(b([{ who: "p", device: "phone" }]), [{ path: ["panels", 0, "layout", "p.device", "dx"], value: 20 }]);
    const svg = renderBoardSVG(moved, { asset });
    expect(svg).toContain('data-el="p.device"');
    expect(svg).not.toBe(renderBoardSVG(b([{ who: "p", device: "phone" }]), { asset }));
  });
  it("a phone on its own (no person) in a screen shot has no hands", () => {
    const svg = renderBoardSVG(b([], { shot: "screen", devices: [{ type: "phone" }] }), { asset });
    expect(svg).not.toContain('data-kind="character"');
  });
});

describe("text size", () => {
  it("page.textScale and per-element scale grow the text", () => {
    const base: Board = JSON.parse(JSON.stringify(example));
    const big = applyOps(base, [{ path: ["page", "textScale"], value: 1.5 }, { path: ["panels", 3, "layout", "bubble-0", "scale"], value: 1.4 }]);
    const size = (svg: string) => Math.max(...[...svg.matchAll(/font-size="([\d.]+)"/g)].map((m) => Number(m[1])));
    expect(size(renderBoardSVG(big, { asset }))).toBeGreaterThan(size(renderBoardSVG(base, { asset })));
    expect(validate(big).ok).toBe(true);
  });
});

describe("service-design layer", () => {
  it("counts product moments", () => {
    expect(productShare(example)).toEqual({ withProduct: 5, moments: 6 });
    const svg = renderBoardSVG(example, { asset });
    expect(svg).toContain("Product in");
  });
  it("journey lanes render per panel plus a journey summary", () => {
    const b = applyOps(example, [{ path: ["page", "lanes"], value: true }, { path: ["panels", 6, "workaround"], value: "asks the barista" }]);
    const svg = renderBoardSVG(b, { asset });
    expect(svg).toContain('data-lane="asks"');
    expect(svg).toContain("data-journey");
    expect(svg).toContain("asks the barista");
    expect(validate(b).ok).toBe(true);
  });
  it("feeling comes from the field, else the main character's mood", () => {
    expect(feelingOf(example.panels[4])).toBe(-2); // frustrated
    expect(feelingOf({ ...example.panels[4], feeling: 1 } as never)).toBe(1);
    expect(feelingOf(example.panels[0])).toBeUndefined();
  });
  it("critique flags happy paths and praises honest ones", () => {
    const happy: Board = {
      schemaVersion: 1, title: "Happy", persona: "Ana, shopper", cast: { a: {} },
      panels: [1, 2, 3, 4].map((i) => ({ id: `p${i}`, scene: "store" as const, characters: [{ who: "a", device: "phone" as const, mood: "happy" as const }] })),
    };
    const ids = critique(happy).findings.map((f) => f.id);
    expect(ids).toEqual(expect.arrayContaining(["trigger", "always-on", "workaround", "happy-path", "unsaid", "camera", "alone"]));
    const honest = critique(example);
    expect(honest.strengths.length).toBeGreaterThan(1);
    expect(honest.findings.map((f) => f.id)).not.toContain("always-on");
  });
});

describe("art + scene options", () => {
  it("pose variants change the drawing but not the pose", () => {
    const one = (v: number) => renderBoardSVG({ schemaVersion: 1, title: "t", cast: { a: {} }, panels: [{ id: "p", scene: "blank", characters: [{ who: "a", variant: v }] }] }, { asset });
    expect(one(1)).not.toBe(one(2));
    expect(one(2)).not.toBe(one(3));
  });
  it("brand name appears on scene signage", () => {
    const b = applyOps(example, [{ path: ["page", "brand"], value: { name: "Brewly" } }]);
    expect(renderBoardSVG(b, { asset })).toContain("Brewly");
    expect(validate(b).ok).toBe(true);
  });
  it("panel camera pan/zoom and device tilt change the render", () => {
    const base: Board = { schemaVersion: 1, title: "t", cast: { a: {} }, panels: [{ id: "p", scene: "car", characters: [{ who: "a" }], devices: [{ type: "car-display" }] }] };
    const panned = applyOps(base, [{ path: ["panels", 0, "layout", "__camera"], value: { dx: 30, scale: 1.4 } }]);
    const tilted = applyOps(base, [{ path: ["panels", 0, "devices", 0, "tilt"], value: "left" }]);
    const r = renderBoardSVG(base, { asset });
    expect(renderBoardSVG(panned, { asset })).not.toBe(r);
    expect(renderBoardSVG(tilted, { asset })).toContain("skewY");
  });
});

describe("editor: swapping who someone is", () => {
  it("moves bubbles, gestures, focus and layout nudges to the new person", () => {
    const b = applyOps(example, [{ path: ["panels", 4, "layout", "maya.screen"], value: { dx: 5 } }]);
    const next = applyOps(b, swapWhoOps(b, { panel: "checks-app", el: "maya", kind: "character" }, "leo"));
    const p = next.panels[4] as never as { bubbles: { from: string }[]; gestures: { on: string }[]; layout: Record<string, unknown> };
    expect(p.bubbles[0].from).toBe("leo");
    expect(p.gestures[0].on).toBe("leo");
    expect(p.layout["leo.screen"]).toEqual({ dx: 5 });
    expect(p.layout["maya.screen"]).toBeUndefined();
    expect(validate(next).ok).toBe(true);
  });
});

describe("clipboard", () => {
  it("copies a person with their cast entry and pastes into another board", () => {
    const clip = clipFor(example, { panel: "in-line", el: "sam", kind: "character" })!;
    const other: Board = { schemaVersion: 1, title: "Other", cast: {}, panels: [{ id: "x", scene: "office" }] };
    const res = pasteOps(other, JSON.parse(JSON.stringify(clip)), { panel: "x", el: "__panel", kind: "panel" });
    if (!res || typeof res === "string") throw new Error(String(res));
    const next = applyOps(other, res.ops);
    expect(next.cast.sam).toBeDefined();
    expect((next.panels[0] as never as { characters: { who: string }[] }).characters[0].who).toBe("sam");
    expect(validate(next).ok).toBe(true);
  });
  it("pastes a panel with a fresh id", () => {
    const clip = clipFor(example, { panel: "in-line", el: "__panel", kind: "panel" })!;
    const res = pasteOps(example, clip, { panel: "in-line", el: "__panel", kind: "panel" });
    if (!res || typeof res === "string") throw new Error(String(res));
    const next = applyOps(example, res.ops);
    expect(next.panels[4].id).toBe("in-line-2");
    expect(validate(next).ok).toBe(true);
  });
  it("ignores clipboard text that isn't a storyboard clip", () => {
    expect(pasteOps(example, { hello: 1 }, null)).toBeUndefined();
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

describe("export robustness", () => {
  it("renders narrow (1-across) boards with zoomed cameras and big shots without crashing the renderer", () => {
    const b = applyOps(example, [
      { path: ["page"], value: { columns: 1, lanes: true } },
      { path: ["panels", 3, "layout", "__camera"], value: { scale: 2.5, dx: -120 } },
    ]);
    const png = svgToPNG(boardToSVG(b, "tests/fixtures/late-latte.storyboard.json"), 1.5);
    expect(imageSize(png)?.w).toBeGreaterThan(500);
  });
});

describe("outfits and hats", () => {
  it("every outfit × hat renders from every angle without NaN, and validates", () => {
    const cast: Board["cast"] = {};
    ids(OUTFITS).forEach((o, i) => { cast[`o${i}`] = { outfit: o as never, hat: ids(HATS)[i % HATS.length] as never, hair: i % 2 ? "afro" : "long" }; });
    const panels = ids(ANGLES).flatMap((angle) => Object.keys(cast).map((who) => ({ id: `${angle}-${who}`, scene: "blank" as const, characters: [{ who, angle: angle as never }] })));
    const b: Board = { schemaVersion: 1, title: "Outfits", cast, panels };
    expect(validate(b).errors).toEqual([]);
    expect(renderBoardSVG(b, { asset })).not.toContain("NaN");
    const bad = validate({ ...b, cast: { x: { hat: "helmet" } }, panels: [] }).errors;
    expect(bad.some((e) => e.path === "$.cast.x.hat")).toBe(true);
  });
});

describe("layers and signs", () => {
  const two: Board = {
    schemaVersion: 1, title: "Layers", cast: { a: {}, b: {} },
    panels: [{ id: "p", scene: "blank", characters: [{ who: "a" }, { who: "b" }], devices: [{ type: "watch" }], shapes: [{ type: "rect", points: [[0, 0], [20, 20]] }] }],
  };
  const order = (b: Board) => [...renderBoardSVG(b, { asset }).matchAll(/data-el="(a|b|watch|shape-0)"/g)].map((m) => m[1]);
  it("draws devices, then people, then shapes by default", () => {
    expect(order(two)).toEqual(["watch", "a", "b", "shape-0"]);
  });
  it("arrange writes one z and changes draw order", () => {
    const sel = { panel: "p", el: "watch", kind: "device" as const };
    const front = arrangeOps(two, sel, "front")!;
    expect(front).toHaveLength(1);
    expect(order(applyOps(two, front) as Board)).toEqual(["a", "b", "shape-0", "watch"]);
    const fwd = applyOps(two, arrangeOps(two, sel, "forward")!) as Board;
    expect(order(fwd)).toEqual(["a", "watch", "b", "shape-0"]);
    expect(arrangeOps(two, sel, "back")).toBeUndefined();
  });
  it("a panel's sign overrides the board brand, or blanks it", () => {
    const b: Board = { schemaVersion: 1, title: "Shops", cast: {}, page: { brand: { name: "Brewly" } },
      panels: [{ id: "a", scene: "coffee-shop" }, { id: "b", scene: "coffee-shop", sign: "Corner Deli" }, { id: "c", scene: "coffee-shop", sign: false }] };
    expect(validate(b).errors).toEqual([]);
    const svg = renderBoardSVG(b, { asset });
    expect(svg.match(/BREWLY|Brewly/g)?.length).toBe(1);
    expect(svg).toMatch(/CORNER DELI|Corner Deli/);
    expect(validate({ ...b, panels: [{ id: "x", scene: "coffee-shop", sign: 3 as never }] }).errors[0].path).toBe("$.panels[0].sign");
  });
});

describe("step names", () => {
  it("name the points on the journey chart, and unnamed steps get a nudge", () => {
    const b: Board = { schemaVersion: 1, title: "Steps", cast: { a: {} }, page: { lanes: true }, panels: [
      { id: "one", scene: "kitchen", label: "Orders ahead", characters: [{ who: "a" }] },
      { id: "wait", type: "time", text: "12 minutes later…" },
      { id: "two", scene: "coffee-shop", characters: [{ who: "a" }] },
      { id: "three", scene: "street", label: "Gives up", characters: [{ who: "a" }] },
    ] };
    const svg = renderBoardSVG(b, { asset });
    const journey = svg.slice(svg.indexOf("data-journey"));
    expect(journey).toContain("Orders ahead");
    expect(journey).toContain("12 minutes later");
    expect(journey).toContain("Gives up");
    expect(validate(b).warnings.some((w) => w.message.includes("1 scene panel has no step name"))).toBe(true);
  });
});

describe("poses on seats", () => {
  it("a seat mark sits people down by default, but an explicit standing pose stands", () => {
    const b: Board = { schemaVersion: 1, title: "Seats", cast: { a: {} }, panels: [
      { id: "auto", scene: "airport", characters: [{ who: "a", at: "gate-seat" }] },
      { id: "stand", scene: "airport", characters: [{ who: "a", at: "gate-seat", pose: "standing" }] },
    ] };
    const pose = (i: number) => layoutPanel(b, b.panels[i] as ScenePanel, asset).chars[0].pose;
    expect(pose(0)).toBe("sitting");
    expect(pose(1)).toBe("standing");
  });
});

describe("pictures in scenes", () => {
  it("validates, renders sketchified by default and as-is when sketch is false", () => {
    const b: Board = { schemaVersion: 1, title: "Pics", cast: {}, panels: [{ id: "p", scene: "blank", images: [{ src: "./a.png", x: 100, y: 80, w: 90, h: 60 }, { src: "./b.png", sketch: false }] }] };
    expect(validate(b).errors).toEqual([]);
    const svg = renderBoardSVG(b, { asset: (p) => `teal:${p}`, sketch: (p) => `grey:${p}`, raw: (p) => `raw:${p}` });
    expect(svg).toContain('data-el="image-0" data-kind="image"');
    expect(svg).toContain('href="grey:./a.png"');
    expect(svg).toContain('href="raw:./b.png"');
    expect(svg).not.toContain("teal:");
    expect(validate({ ...b, panels: [{ id: "p", scene: "blank", images: [{ src: "./a.png", w: -1, sketch: "yes" as never }] }] }).errors.map((e) => e.path))
      .toEqual(["$.panels[0].images[0].w", "$.panels[0].images[0].sketch"]);
  });
});

describe("shapes (free drawing)", () => {
  const withShapes = (shapes: unknown[]): Board => {
    const b = structuredClone(example);
    (b.panels[1] as unknown as { shapes: unknown[] }).shapes = shapes;
    return b;
  };
  it("validates shapes and suggests fixes", () => {
    expect(validate(withShapes([{ type: "rect", points: [[10, 10], [60, 50]], fill: "mid" }, { type: "path", points: [[0, 0], [5, 9], [12, 4]] }])).errors).toEqual([]);
    const bad = validate(withShapes([{ type: "rectangle", points: [[10, 10]] }, { type: "line", points: [[0, 0], [1, 2]], fill: "grey" }])).errors;
    expect(bad.find((e) => e.path.endsWith("shapes[0].type"))?.hint).toContain('"rect"');
    expect(bad.some((e) => e.path.endsWith("shapes[0].points"))).toBe(true);
    expect(bad.some((e) => e.path.endsWith("shapes[1].fill"))).toBe(true);
  });
  it("renders selectable shapes and deletes them with their layout", () => {
    const b = withShapes([{ type: "ellipse", points: [[10, 10], [60, 50]] }, { type: "arrow", points: [[0, 0], [80, 40]] }]);
    b.panels[1].layout = { ...b.panels[1].layout, "shape-1": { dx: 5, rotate: 30 } };
    const svg = renderBoardSVG(b, { asset });
    expect(svg).toContain('data-el="shape-0" data-kind="shape"');
    expect(svg).toContain('data-el="shape-1" data-kind="shape"');
    expect(svg).not.toContain("NaN");
    const d = deleteOps(b, { panel: b.panels[1].id, el: "shape-1", kind: "shape" })!;
    const after = applyOps(b, d.ops) as Board;
    expect((after.panels[1] as { shapes?: unknown[] }).shapes).toHaveLength(1);
    expect(after.panels[1].layout?.["shape-1"]).toBeUndefined();
  });
  it("free text: one point plus words, rendered and validated", () => {
    const b = withShapes([{ type: "text", points: [[200, 40]], text: "Queue: 9 people\nnobody moving" }]);
    expect(validate(b).errors).toEqual([]);
    const svg = renderBoardSVG(b, { asset });
    expect(svg).toContain("Queue: 9 people");
    expect(svg).toContain("nobody moving");
    const bad = validate(withShapes([{ type: "text", points: [[200, 40]] }, { type: "rect", points: [[1, 1]] }])).errors.map((e) => e.path);
    expect(bad.some((p) => p.endsWith("shapes[0].text"))).toBe(true);
    expect(bad.some((p) => p.endsWith("shapes[1].points"))).toBe(true);
  });
  it("copies and pastes a shape, offset so it's visible", () => {
    const b = withShapes([{ type: "rect", points: [[10, 10], [60, 50]] }]);
    const sel = { panel: b.panels[1].id, el: "shape-0", kind: "shape" as const };
    const r = pasteOps(b, clipFor(b, sel), sel);
    if (!r || typeof r === "string") throw new Error("paste failed");
    expect(r.ops[0].value).toEqual({ type: "rect", points: [[22, 22], [72, 62]] });
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
