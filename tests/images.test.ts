/** Pictures: mirror and turn (applied after any crop), and cropping a device's screen. */
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { imageSize, orientBytes } from "../src/sketch/bake";
import { normTurn, splitFix, withCrop, withOrient } from "../src/sketch/crop";
import { initRenderer } from "../src/sketch/resvg";
import { validate } from "../src/validate";
import type { Board } from "../src/types";

const PNG = readFileSync("examples/screens/order-status.png");

describe("mirror and turn", () => {
  beforeAll(async () => { await initRenderer(); });

  it("rides along on a picture's path with its crop, and comes back out", () => {
    const p = withOrient(withCrop("./a.png", [0, 0.1, 1, 0.9]), { mirror: true, turn: 90 });
    expect(p).toBe("./a.png|crop=0,0.1,1,0.9|mirror|turn=90");
    expect(splitFix(p)).toEqual({ path: "./a.png", crop: [0, 0.1, 1, 0.9], orient: { mirror: true, turn: 90 } });
    expect(splitFix("./a.png")).toEqual({ path: "./a.png", crop: undefined, orient: undefined });
    expect(normTurn(-90)).toBe(270);
    expect(normTurn(450)).toBe(90);
  });

  it("a quarter turn swaps width and height; mirroring keeps them", () => {
    const s = imageSize(PNG)!;
    const turned = imageSize(orientBytes(PNG, "image/png", { turn: 90 }).buf)!;
    expect(turned).toEqual({ w: s.h, h: s.w });
    const flipped = imageSize(orientBytes(PNG, "image/png", { mirror: true }).buf)!;
    expect(flipped).toEqual(s);
    expect(orientBytes(PNG, "image/png", {}).buf).toBe(PNG);
  });

  it("panel pictures take mirror and turn; screens take a crop", () => {
    const b = {
      schemaVersion: 1, title: "pics", cast: { a: {} },
      panels: [{
        id: "p", scene: "kitchen",
        characters: [{ who: "a", device: { type: "phone", screen: "./screens/order-status.png", crop: [0, 0, 1, 0.5] } }],
        devices: [{ type: "tablet", screen: "./screens/order-status.png", crop: [0, 0.2, 1, 0.8] }],
        images: [{ src: "./screens/order-status.png", mirror: true, turn: 180 }],
      }],
    } as unknown as Board;
    expect(validate(b).errors).toEqual([]);
    const bad = JSON.parse(JSON.stringify(b));
    bad.panels[0].images[0].turn = 45;
    expect(validate(bad).errors.map((e) => e.path).join()).toMatch(/turn/);
  });
});
