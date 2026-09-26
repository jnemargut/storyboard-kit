import { build } from "esbuild";

const shared = {
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  jsx: "automatic",
  packages: "external",
  logLevel: "warning",
};

await build({ ...shared, entryPoints: ["src/cli/index.ts"], outfile: "dist/cli.js", banner: { js: "#!/usr/bin/env node" } });
await build({ ...shared, entryPoints: ["scripts/gen.ts"], outfile: "dist/gen.js" });
