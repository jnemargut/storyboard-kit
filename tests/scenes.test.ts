/** Scene sanity: nothing floats, every mark is on the panel, and the vocabulary matches what's drawn. */
import { describe, expect, it } from "vitest";
import { restingY, SNAP } from "../src/render/layout";
import { SCENE_DEFS } from "../src/render/scenes";
import { FLOOR_Y, PANEL_W } from "../src/render/tokens";
import { SCENE_MARKS, SCENES } from "../src/vocab";


describe("scenes", () => {
  for (const { id } of SCENES) {
    const s = SCENE_DEFS[id as keyof typeof SCENE_DEFS];
    describe(id, () => {
      it("is drawn and has its marks", () => {
        expect(s, id).toBeDefined();
        expect(Object.keys(s.marks).sort()).toEqual([...SCENE_MARKS[id]].sort());
        for (const k of s.order) expect(s.marks[k], `${id}.${k}`).toBeDefined();
      });
      it("keeps every mark on the panel and on the floor (or a seat)", () => {
        for (const [k, m] of Object.entries(s.marks)) {
          if (k === "screen" || k === "dashboard") continue; // places for wall or dash screens, not people
          expect(m.x, `${id}.${k}.x`).toBeGreaterThanOrEqual(0);
          expect(m.x, `${id}.${k}.x`).toBeLessThanOrEqual(PANEL_W);
          expect(m.y, `${id}.${k}.y`).toBeLessThanOrEqual(FLOOR_Y + 1);
        }
      });
      it("never leaves a device floating", () => {
        const bad: string[] = [];
        for (const [type, spot] of Object.entries(s.spots)) {
          if (!spot) continue;
          const r = restingY(s, type as never, spot);
          if (r.on === undefined) bad.push(`${type} at y ${spot.y}`);
        }
        expect(bad, `${id}: nothing to rest on for ${bad.join("; ")}. Move the spot onto a surface (within ${SNAP}px), add that surface to "surfaces", or mark it "wall".`).toEqual([]);
      });
    });
  }
});
