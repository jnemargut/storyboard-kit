// Builds the self-contained skill at skills/storyboard/ — the thing people install.
//   skills/storyboard/SKILL.md, references/*        docs (generated from src/vocab.ts)
//   skills/storyboard/scripts/storyboard.mjs        the whole engine, every dependency bundled
//   skills/storyboard/scripts/resvg.wasm            renderer (WebAssembly: any OS, no native binaries)
//   skills/storyboard/scripts/editor/               the web editor
//   skills/storyboard/assets/fonts, examples/       fonts for export, the Late Latte example
import { build } from "esbuild";
import { build as vite } from "vite";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const OUT = "skills/storyboard";
const only = process.argv[2]; // "cli" = just the script (fast iteration)

rmSync(`${OUT}/scripts/storyboard.mjs`, { force: true });
mkdirSync(`${OUT}/scripts`, { recursive: true });

await build({
  entryPoints: ["src/cli/index.ts"],
  outfile: `${OUT}/scripts/storyboard.mjs`,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  jsx: "automatic",
  minify: true,
  legalComments: "none",
  define: { "process.env.NODE_ENV": '"production"' },
  // CommonJS dependencies inside an ES module bundle still need `require` for Node built-ins.
  banner: { js: '#!/usr/bin/env node\nimport { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);' },
  logLevel: "warning",
});
cpSync("node_modules/@resvg/resvg-wasm/index_bg.wasm", `${OUT}/scripts/resvg.wasm`);
if (only === "cli") process.exit(0);

// docs, references and schema (generated from the vocabulary)
await build({ entryPoints: ["scripts/gen.ts"], outfile: "dist/gen.mjs", bundle: true, platform: "node", format: "esm", packages: "external", logLevel: "warning" });
execFileSync("node", ["dist/gen.mjs"], { stdio: "inherit" });

// fonts used by export (the editor bundles its own copies)
mkdirSync(`${OUT}/assets/fonts`, { recursive: true });
for (const f of ["PermanentMarker-Regular.ttf", "PatrickHand-Regular.ttf", "IBMPlexMono-Regular.ttf", "LICENSE-Apache-PermanentMarker.txt", "OFL-PatrickHand.txt", "OFL-IBMPlexMono.txt"])
  cpSync(`src/sketch/fonts/${f}`, `${OUT}/assets/fonts/${f}`);

// example board (+ its screen)
mkdirSync(`${OUT}/examples/screens`, { recursive: true });
const ex = JSON.parse(readFileSync("examples/late-latte.storyboard.json", "utf8"));
ex.$schema = "../references/schema.json";
writeFileSync(`${OUT}/examples/late-latte.storyboard.json`, JSON.stringify(ex, null, 2) + "\n");
cpSync("examples/screens/order-status.png", `${OUT}/examples/screens/order-status.png`);

// the editor
await vite({ configFile: "vite.config.ts", logLevel: "warn" });
cpSync("LICENSE", `${OUT}/LICENSE`);
console.log(`built ${OUT}/`);
