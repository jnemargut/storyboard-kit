import type { Op } from "../json";
import type { Board } from "../types";
import type { Result } from "../validate";

export interface Loaded { board: Board; version: number; file?: string; result: Result }

const H = { "content-type": "application/json", "x-storyboard": "1" };

async function ok<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error((await r.text()) || r.statusText);
  return r.json() as Promise<T>;
}

export const api = {
  load: () => fetch("/api/board").then((r) => ok<Loaded>(r)),
  patch: (ops: Op[]) => fetch("/api/board", { method: "PATCH", headers: H, body: JSON.stringify({ ops }) }).then((r) => ok<Loaded>(r)),
  put: (board: Board) => fetch("/api/board", { method: "PUT", headers: H, body: JSON.stringify(board) }).then((r) => ok<Loaded>(r)),
  upload: (file: File, dir: "screens" | "images" = "screens") =>
    fetch(`/api/upload?name=${encodeURIComponent(file.name)}&dir=${dir}`, { method: "POST", headers: { "x-storyboard": "1" }, body: file }).then((r) => ok<{ path: string }>(r)),
};

export const assetUrl = (bust: number) => (p: string) => `/baked/${p.replace(/^\.\//, "").split("/").map(encodeURIComponent).join("/")}?v=${bust}`;
