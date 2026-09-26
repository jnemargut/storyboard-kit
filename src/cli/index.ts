import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { VOCAB, SCENE_MARKS, type VocabCategory } from "../vocab";
import { validate, formatResult } from "../validate";
import { formatStoryboard } from "../json";
import { toScript } from "../script";
import { AGENTS_BLOCK, CLI } from "../skill";
import { boardToSVG, pngToPDF, svgToPNG } from "../export";
import { pageSize } from "../render";
import type { Board } from "../types";
import { dev } from "./dev";

const PKG_ROOT = fileURLToPath(new URL("../", import.meta.url));

const HELP = `storyboard: low-fi service-design storyboards your coding agent drafts and you tweak.

Usage: ${CLI} <command> [options]

  init [dir]                      Set up a project: AGENTS.md/CLAUDE.md block + agent skill (+ --example)
  vocab [category] [--grep x]     List poses, scenes (+marks), shots, moods, devices… (--json)
  validate <file> [--json]        Check a storyboard; errors include fixes
  dev <file> [--port 4321]        Open the editor; edits save to the file live (--no-open)
  export <file> [--png] [--pdf] [--svg] [--scale 2] [--out dir]
  script <file>                   Print a readable screenplay version (Markdown)
  format <file>                   Rewrite the file in canonical, diff-friendly formatting
  new <file> [--title "…"]        Create a starter storyboard

Docs for agents: the storyboard skill (installed by init) or ${CLI} vocab.`;

function args(argv: string[]) {
  const pos: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--no-")) flags[a.slice(5)] = false;
    else if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      if (v !== undefined) flags[k] = v;
      else if (argv[i + 1] && !argv[i + 1].startsWith("--") && ["grep", "port", "scale", "out", "title"].includes(k)) flags[k] = argv[++i];
      else flags[k] = true;
    } else pos.push(a);
  }
  return { pos, flags };
}

function load(file: string | undefined): { board: Board; abs: string } {
  if (!file) { console.error("Missing <file>. Example: storyboard validate journey.storyboard.json"); process.exit(2); }
  const abs = resolve(file);
  if (!existsSync(abs)) { console.error(`No such file: ${file}`); process.exit(2); }
  try { return { board: JSON.parse(readFileSync(abs, "utf8")), abs }; }
  catch (e) { console.error(`✗ ${file} is not valid JSON: ${(e as Error).message}`); process.exit(1); }
}

function upsertBlock(path: string, block: string) {
  const start = "<!-- storyboard:start -->", end = "<!-- storyboard:end -->";
  let text = existsSync(path) ? readFileSync(path, "utf8") : "";
  const re = new RegExp(`${start}[\\s\\S]*?${end}\\n?`);
  text = re.test(text) ? text.replace(re, block) : (text.trim() ? text.trimEnd() + "\n\n" : "") + block;
  writeFileSync(path, text);
}

function copyDir(src: string, dst: string) {
  mkdirSync(dst, { recursive: true });
  for (const f of ["SKILL.md", "references/vocabulary.md", "references/format.md", "references/example.md", "references/schema.json"]) {
    mkdirSync(dirname(join(dst, f)), { recursive: true });
    writeFileSync(join(dst, f), readFileSync(join(src, f)));
  }
}

export const SCHEMA_REF = "./.agents/skills/storyboard/references/schema.json";
const STARTER = (title: string): Board => ({
  $schema: SCHEMA_REF,
  schemaVersion: 1,
  title,
  persona: "Alex, first-time customer",
  cast: { alex: { skin: "tone-3", hair: "short", outfit: "hoodie" } },
  panels: [
    { id: "title", type: "title", title, subtitle: "Describe the moment before your product" },
    { id: "trigger", scene: "kitchen", shot: "wide", label: "The trigger", characters: [{ who: "alex", pose: "holding-phone", mood: "focused", device: "phone" }], bubbles: [{ type: "thought", from: "alex", text: "What's the fastest way to do this?" }] },
    { id: "using-it", scene: "kitchen", shot: "over-the-shoulder", label: "Using the product", characters: [{ who: "alex", device: "phone" }], gestures: [{ type: "tap", on: "alex" }] },
    { id: "outcome", scene: "street", shot: "medium", label: "What it meant for them", characters: [{ who: "alex", pose: "walking", mood: "relieved", angle: "side" }] },
  ],
});

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { pos, flags } = args(rest);
  switch (cmd) {
    case "vocab": {
      const cat = pos[0] as VocabCategory | "marks" | undefined;
      if (flags.json) { console.log(JSON.stringify(cat && cat !== "marks" ? VOCAB[cat] : cat === "marks" ? SCENE_MARKS : { ...VOCAB, marks: SCENE_MARKS }, null, 2)); return; }
      if (!cat && typeof flags.grep === "string") {
        const g = flags.grep.toLowerCase();
        for (const [c, list] of Object.entries(VOCAB)) for (const x of list) if ((x.id + " " + x.desc).toLowerCase().includes(g)) console.log(`${c.padEnd(12)} ${x.id.padEnd(18)} ${x.desc}`);
        for (const [sc, m] of Object.entries(SCENE_MARKS)) for (const mk of m) if (mk.includes(g)) console.log(`${"marks".padEnd(12)} ${mk.padEnd(18)} in scene ${sc}`);
        return;
      }
      if (!cat) {
        console.log("Categories:\n" + Object.entries(VOCAB).map(([k, v]) => `  ${k.padEnd(12)} ${v.map((x) => x.id).slice(0, 7).join(", ")}${v.length > 7 ? ", …" : ""}`).join("\n") + `\n  ${"marks".padEnd(12)} per-scene positions (${CLI} vocab marks)\n\nDetails: ${CLI} vocab <category> [--grep text]`);
        return;
      }
      if (cat === "marks") { for (const [s, m] of Object.entries(SCENE_MARKS)) console.log(`${s.padEnd(14)} ${m.join(", ")}`); return; }
      const list = VOCAB[cat];
      if (!list) { console.error(`Unknown category "${cat}". Try: ${Object.keys(VOCAB).join(", ")}, marks`); process.exit(2); }
      const g = typeof flags.grep === "string" ? flags.grep.toLowerCase() : "";
      for (const x of list) if (!g || (x.id + " " + x.desc).toLowerCase().includes(g)) console.log(`${x.id.padEnd(18)} ${x.desc}`);
      return;
    }
    case "validate": {
      const { board } = load(pos[0]);
      const r = validate(board);
      if (flags.json) console.log(JSON.stringify(r, null, 2));
      else console.log(formatResult(r, pos[0], Array.isArray(board.panels) ? board.panels.length : undefined));
      process.exit(r.ok ? 0 : 1);
    }
    case "format": {
      const { board, abs } = load(pos[0]);
      writeFileSync(abs, formatStoryboard(board));
      console.log(`✓ formatted ${pos[0]}`);
      return;
    }
    case "script": {
      const { board } = load(pos[0]);
      console.log(toScript(board));
      return;
    }
    case "export": {
      const { board, abs } = load(pos[0]);
      const r = validate(board);
      if (!r.ok) { console.error(formatResult(r, pos[0])); console.error("\nFix the errors above before exporting."); process.exit(1); }
      const want = { png: !!flags.png, pdf: !!flags.pdf, svg: !!flags.svg };
      if (!want.png && !want.pdf && !want.svg) want.png = true;
      const scale = Number(flags.scale ?? 2);
      const outDir = resolve(typeof flags.out === "string" ? flags.out : dirname(abs));
      mkdirSync(outDir, { recursive: true });
      const stem = basename(abs).replace(/\.storyboard\.json$|\.json$/, "");
      const svg = boardToSVG(board, abs);
      const written: string[] = [];
      if (want.png || want.pdf) {
        const png = svgToPNG(svg, scale);
        if (want.png) { writeFileSync(join(outDir, `${stem}.png`), png); written.push(`${stem}.png`); }
        if (want.pdf) { const { width, height } = pageSize(board); writeFileSync(join(outDir, `${stem}.pdf`), await pngToPDF(png, width, height)); written.push(`${stem}.pdf`); }
      }
      if (want.svg) { writeFileSync(join(outDir, `${stem}.svg`), boardToSVG(board, abs, true)); written.push(`${stem}.svg`); }
      console.log(`✓ exported ${written.map((w) => join(outDir, w)).join(", ")}`);
      return;
    }
    case "dev": {
      if (!pos[0]) { console.error("Usage: storyboard dev <file>"); process.exit(2); }
      await dev(pos[0], { port: Number(flags.port ?? 4321), open: flags.open !== false });
      return;
    }
    case "new": {
      const file = pos[0] ?? "journey.storyboard.json";
      if (existsSync(file)) { console.error(`${file} already exists.`); process.exit(1); }
      writeFileSync(file, formatStoryboard(STARTER(typeof flags.title === "string" ? flags.title : "Untitled journey")));
      console.log(`✓ created ${file}\n  next: ${CLI} dev ${file}`);
      return;
    }
    case "init": {
      const dir = resolve(pos[0] ?? ".");
      mkdirSync(dir, { recursive: true });
      upsertBlock(join(dir, "AGENTS.md"), AGENTS_BLOCK);
      upsertBlock(join(dir, "CLAUDE.md"), AGENTS_BLOCK);
      const skillSrc = join(PKG_ROOT, "skill");
      copyDir(skillSrc, join(dir, ".agents/skills/storyboard"));
      copyDir(skillSrc, join(dir, ".claude/skills/storyboard"));
      const done = ["AGENTS.md, CLAUDE.md (storyboard block)", ".agents/skills/storyboard/ (portable skill)", ".claude/skills/storyboard/ (Claude Code)"];
      if (flags.example) {
        mkdirSync(join(dir, "screens"), { recursive: true });
        writeFileSync(join(dir, "late-latte.storyboard.json"), readFileSync(join(PKG_ROOT, "examples/late-latte.storyboard.json")).toString().replace('"../schema.json"', `"${SCHEMA_REF}"`));
        writeFileSync(join(dir, "screens/order-status.png"), readFileSync(join(PKG_ROOT, "examples/screens/order-status.png")));
        done.push("late-latte.storyboard.json + screens/ (example)");
      }
      console.log(`✓ storyboard set up in ${dir}\n  ${done.join("\n  ")}\n\nNow ask your agent: "storyboard <someone> doing <something>…"`);
      return;
    }
    case undefined: case "help": case "--help": case "-h":
      console.log(HELP); return;
    default:
      console.error(`Unknown command "${cmd}".\n\n${HELP}`); process.exit(2);
  }
}

main().catch((e) => { console.error(`✗ ${(e as Error).message}`); process.exit(1); });
