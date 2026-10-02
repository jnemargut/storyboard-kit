/**
 * The bridge to Wireframe Kit. A panel's screen can be "./app.wireframe.json#checkout". Storyboard Kit never
 * draws wireframes itself: Wireframe Kit renders each screen to a PNG next to the file
 * (app.checkout.png, with the source embedded), and we bake that like any other screen image.
 * If Wireframe Kit is installed and the PNG is stale, we ask it to re-render first; if not, the cached
 * PNG still works on any machine.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const isWireframeRef = (p: string) => /\.wireframe\.json(#[^/]*)?$/.test(p);

export function splitRef(ref: string): { file: string; screen?: string } {
  const i = ref.indexOf("#");
  return i < 0 ? { file: ref } : { file: ref.slice(0, i), screen: ref.slice(i + 1) || undefined };
}

/** Which screen a reference means: the #fragment, else the file's start screen, else its first. */
export function screenOf(absFile: string, screen?: string): string | undefined {
  if (screen) return screen;
  try {
    const doc = JSON.parse(readFileSync(absFile, "utf8"));
    return doc.start ?? Object.keys(doc.screens ?? {})[0];
  } catch { return undefined; }
}

/** Where Wireframe Kit writes a screen's PNG: next to the file, "<name>.<screen>.png". */
export const pngFor = (absFile: string, screen: string) =>
  join(dirname(absFile), `${basename(absFile).replace(/\.wireframe\.json$/, "")}.${screen}.png`);

/** The installed Wireframe Kit script, if any. */
export function wireframeKit(): string | undefined {
  const here = (() => { try { return fileURLToPath(new URL("../../wireframe/scripts/wireframe.mjs", import.meta.url)); } catch { return ""; } })();
  const home = homedir();
  const candidates = [
    process.env.WIREFRAME_KIT,
    here,
    join(home, ".claude/skills/wireframe/scripts/wireframe.mjs"),
    join(home, ".codex/skills/wireframe/scripts/wireframe.mjs"),
    join(home, ".agents/skills/wireframe/scripts/wireframe.mjs"),
  ];
  return candidates.find((c): c is string => !!c && existsSync(c));
}

/** The PNG for a wireframe reference (absolute path, may carry #screen), re-rendered first if stale. */
export function wireframePNG(absRef: string): string | undefined {
  const { file, screen: frag } = splitRef(absRef);
  if (!existsSync(file)) return undefined;
  const screen = screenOf(file, frag);
  if (!screen) return undefined;
  const png = pngFor(file, screen);
  const stale = !existsSync(png) || statSync(png).mtimeMs < statSync(file).mtimeMs;
  const wf = stale ? wireframeKit() : undefined;
  if (wf) {
    try { execFileSync(process.execPath, [wf, "render", `${file}#${screen}`, "--quiet"], { stdio: "ignore", timeout: 30000 }); } catch { /* keep the cached PNG */ }
  }
  return existsSync(png) ? png : undefined;
}
