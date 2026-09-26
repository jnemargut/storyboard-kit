import { SCENE_MARKS, VOCAB, type Entry } from "./vocab";

export const CLI = "npx storyboard-cli";

export const SKILL_MD = `---
name: storyboard
description: Draft low-fi, sketch-style service-design storyboards (comic-style panels of a person's real day with your product in it) as a storyboard.json file, validate it, and open the page-first editor. Use when the user asks for a storyboard, a customer journey comic, "show how people really use this", a day-in-the-life, or service-design panels.
---

# Storyboards for service design

You turn a designer's loose description ("Maya orders coffee ahead, it's late, she gets annoyed") into a
\`*.storyboard.json\` file, validate it, and open an editor where the designer tweaks it. The tool draws
everything in a low-fi marker style where **the software is the only thing in color (teal)**, so the board
shows where the product actually shows up in someone's day and where it doesn't.

## Workflow

1. **Look up the vocabulary. Don't guess.** \`${CLI} vocab\` lists categories; \`${CLI} vocab poses\`,
   \`${CLI} vocab scenes\` (with marks), \`${CLI} vocab shots\`, etc. \`${CLI} vocab --grep hospital\` searches
   every category. If a place you need doesn't exist, pick the closest scene and say so in \`label\` or a \`caption\`.
   Full list: [references/vocabulary.md](references/vocabulary.md).
2. **Write the file**: \`<name>.storyboard.json\`. Shape: [references/format.md](references/format.md).
   Worked example: [references/example.md](references/example.md).
3. **Validate and fix** until clean: \`${CLI} validate <file>\`. Errors say exactly what to change
   ("did you mean …"). Warnings are storytelling nudges; take them seriously.
4. **Open the editor** in the background (it keeps running): \`${CLI} dev <file>\`. Tell the designer the URL.
   Their tweaks save into the same file in real time.
5. **Iterate on the same file.** Re-read it before each edit, because the designer may have changed things.
   Never delete or rewrite \`layout\` entries (those are the designer's manual nudges) unless asked.
6. **Export** when asked: \`${CLI} export <file> --png\` (also \`--pdf\`, \`--svg\`, \`--scale 3\`).

## Craft: what makes a storyboard useful

The point is to see the product from inside the customer's life, not to illustrate a happy path.

- **Start before the product.** Panel 2 should be the trigger in real life (packing lunch, a notification,
  a problem), not the app's home screen.
- **Show the mess.** Include at least one moment of waiting, switching, confusion or a workaround (asking a
  human, a screenshot, a sticky note). These are the insights.
- **Put the unsaid in thought bubbles.** What people think but don't say ("it said 4 minutes…") is gold.
- **Vary the camera.** \`wide\` for context and who else is around, \`over-the-shoulder\` or \`screen\` when
  the UI matters, \`close-up\` for emotion. Don't use the same shot for every panel.
- **Let the product be absent sometimes.** Panels without a device are fine. That contrast is the point.
- **Use time cards** ("12 minutes later…") for gaps, and a title card first.
- **End on the outcome for the person**, not on a UI state. A callout can name the consequence
  ("Trust lost: she'll skip ordering ahead").
- 5–9 panels is typical. Keep bubbles under ~12 words.
- Build a varied, realistic cast (skin, age, body, hair, accessories such as glasses, cane, wheelchair,
  hijab) that fits the story. Don't default everyone to the same look.
- **Teal means "our product" and nothing else.** A personal call, a text to a coworker, or someone else's app
  is not the product: give that device \`"product": false\` (e.g. \`"device": { "type": "phone", "product": false }\`)
  and it's drawn grey. Phone poses (\`holding-phone\`, \`phone-to-ear\`) without a device get a grey phone
  automatically. This is how the board shows where the product helps and where people route around it.
- If the designer gives you screen designs, reference them by path (\`"screen": "./screens/x.png"\`). The tool
  sketchifies them automatically. Otherwise leave \`screen\` out and a generic teal UI is drawn.
`;

function table(list: readonly Entry[], marks = false): string {
  return list.map((x) => `- \`${x.id}\`: ${x.desc}${marks && SCENE_MARKS[x.id] ? ` Marks: ${SCENE_MARKS[x.id].map((m) => `\`${m}\``).join(", ")}.` : ""}`).join("\n");
}

const FIELD: Record<string, string> = {
  scenes: "panel `scene`", shots: "panel `shot`", poses: "character `pose`", moods: "character `mood`", angles: "character `angle`",
  devices: "`device` / `devices[].type`", bubbles: "`bubbles[].type`", gestures: "`gestures[].type`", skin: "cast `skin`", hair: "cast `hair`",
  "hair-shade": "cast `hairShade`", body: "cast `body`", outfits: "cast `outfit`", ages: "cast `age`", accessories: "cast `accessories` (array)",
  "time-icons": "time panel `icon`", "panel-types": "panel `type`",
};

export function vocabularyMd(): string {
  const parts = ["# Storyboard vocabulary", "", `Generated from the tool. Query live with \`${CLI} vocab <category> [--grep text]\`.`, ""];
  for (const [cat, list] of Object.entries(VOCAB)) {
    parts.push(`## ${cat}`, "", `Field: ${FIELD[cat] ?? cat}`, "", table(list, cat === "scenes"), "");
  }
  return parts.join("\n");
}

export const FORMAT_MD = `# storyboard.json format

\`\`\`jsonc
{
  "schemaVersion": 1,
  "title": "The Late Latte",
  "persona": "Maya, busy commuter",          // optional; shows under the title
  "subtitle": "Journey: mobile order-ahead",  // optional
  "page": { "columns": 4 },                   // optional; auto by panel count
  "cast": {                                   // everyone who appears, keyed by id
    "maya": { "skin": "tone-2", "hair": "bun", "hairShade": "dark", "outfit": "jacket", "accessories": ["bag"] }
  },
  "panels": [
    { "id": "title", "type": "title", "title": "The Late Latte", "subtitle": "Tuesday, 7:58am" },
    {
      "id": "checks-app",                    // unique, lowercase
      "scene": "coffee-shop",                // see: vocab scenes
      "shot": "over-the-shoulder",           // wide | medium | close-up | over-the-shoulder | screen | pov
      "focus": "maya",                       // optional: who/what the camera frames
      "label": "The app still says 4 min",   // optional caption under the panel
      "caption": "8:14 · In line anyway.",    // optional narration box inside the panel
      "characters": [{
        "who": "maya", "pose": "holding-phone", "mood": "frustrated",
        "angle": "three-quarter", "facing": "right", "at": "counter",   // at = a scene mark
        "device": { "type": "phone", "screen": "./screens/order-status.png" }  // product: false = personal device, grey
      }],
      "devices": [{ "id": "menu", "type": "kiosk", "at": "queue" }],   // devices placed in the scene
      "bubbles": [{ "type": "thought", "from": "maya", "text": "It said 4 minutes…" }],
      "gestures": [{ "type": "tap", "on": "maya", "at": [0.5, 0.8] }], // on = character (their device) or device id
      "callouts": [{ "text": "Status never updates", "target": "maya" }],
      "notes": "From interview P4",          // not drawn
      "layout": { "maya": { "dx": -12 } }    // written by the editor. Leave it alone.
    },
    { "id": "later", "type": "time", "text": "12 minutes later…", "icon": "clock" },
    { "id": "aside", "type": "text", "text": "She never opened the app again." }
  ]
}
\`\`\`

Rules: every \`who\` must be in \`cast\`; \`from\`, \`on\`, \`target\` and \`focus\` refer to a character id (\`who\`, or
\`id\` if you gave one) or a device \`id\` (defaults to its type) **in the same panel**. Scene panels need \`scene\`.
Positions are automatic; don't add coordinates.
`;

export function exampleMd(exampleJson: string): string {
  exampleJson = exampleJson.replace(/^\s*"\$schema": .*\n/m, "");
  return `# Worked example

Prompt: *"Storyboard Maya ordering coffee ahead. The app says 4 minutes, it takes 20, she ends up asking the barista and is late for her train."*

\`\`\`json
${exampleJson.trim()}
\`\`\`

Why it works: it starts in real life (packing lunch, a kid interrupting), shows the product in teal only
where it's actually used, uses thought bubbles for the unsaid, includes the workaround (asking a human),
uses a time card for the wait, and ends on the consequence for the person.
`;
}

export const AGENTS_BLOCK = `<!-- storyboard:start -->
## Storyboards (storyboard-cli)

For storyboards, customer-journey comics or day-in-the-life panels, use the \`storyboard\` skill
(\`.agents/skills/storyboard/SKILL.md\`; in Claude Code, the storyboard skill) and this CLI:

- \`${CLI} vocab [category] [--grep x]\` looks up poses, scenes, shots, devices and moods. Don't invent values.
- Write \`<name>.storyboard.json\`, then run \`${CLI} validate <file>\` and fix every error.
- \`${CLI} dev <file>\` opens the editor (run it in the background). The designer's edits save into the same file:
  re-read before editing, and keep \`layout\` entries.
- \`${CLI} export <file> --png\` exports images.
<!-- storyboard:end -->
`;
