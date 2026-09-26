/** Regenerates schema.json and the agent skill from the vocabulary so they never drift. Run via `npm run gen`. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { buildSchema } from "../src/schema";
import { FORMAT_MD, SKILL_MD, exampleMd, vocabularyMd } from "../src/skill";

const schema = JSON.stringify(buildSchema(), null, 2) + "\n";
const OUT = "skills/storyboard";
mkdirSync(`${OUT}/references`, { recursive: true });
writeFileSync(`${OUT}/SKILL.md`, SKILL_MD);
writeFileSync(`${OUT}/references/vocabulary.md`, vocabularyMd());
writeFileSync(`${OUT}/references/format.md`, FORMAT_MD);
writeFileSync(`${OUT}/references/schema.json`, schema);
writeFileSync(`${OUT}/references/example.md`, exampleMd(readFileSync("tests/fixtures/late-latte.storyboard.json", "utf8").replaceAll("../../examples/screens/", "./screens/")));
console.log(`wrote ${OUT}/SKILL.md + references/`);
