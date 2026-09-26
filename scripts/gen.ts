/** Regenerates schema.json and the agent skill from the vocabulary so they never drift. Run via `npm run gen`. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { buildSchema } from "../src/schema";
import { FORMAT_MD, SKILL_MD, exampleMd, vocabularyMd } from "../src/skill";

const schema = JSON.stringify(buildSchema(), null, 2) + "\n";
writeFileSync("schema.json", schema);
mkdirSync("skill/references", { recursive: true });
writeFileSync("skill/SKILL.md", SKILL_MD);
writeFileSync("skill/references/vocabulary.md", vocabularyMd());
writeFileSync("skill/references/format.md", FORMAT_MD);
writeFileSync("skill/references/schema.json", schema);
writeFileSync("skill/references/example.md", exampleMd(readFileSync("tests/fixtures/late-latte.storyboard.json", "utf8").replaceAll("../../examples/screens/", "./screens/")));
console.log("wrote schema.json and skill/");
