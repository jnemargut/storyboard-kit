import { plainWordsMd } from "./sketch/plain";
import { SCENE_MARKS, VOCAB, type Entry } from "./vocab";

/** Shorthand used throughout the docs for "run this skill's bundled script". Defined at the top of SKILL.md. */
export const CLI = "sb";

export const SKILL_MD = `---
name: storyboard
description: Draft low-fi, sketch-style service-design storyboards (comic-style panels of a person's real day with your product in it) as a storyboard.json file, validate it, and open the page-first editor. Use when the user asks for a storyboard, a customer journey comic, "show how people really use this", a day-in-the-life, or service-design panels.
---

# Storyboards for service design

You turn a designer's loose description ("Marcus orders coffee ahead, it's late, he gets annoyed") into a
\`*.storyboard.json\` file, validate it, and open an editor where the designer tweaks it. The tool draws
everything in a low-fi marker style where **the software is the only thing in color (teal)**, so the board
shows where the product actually shows up in someone's day and where it doesn't.

## Running the tool

Everything runs through one bundled script in this skill's folder (it needs Node.js 18+ and nothing else):

\`\`\`bash
node "\${CLAUDE_SKILL_DIR}/scripts/storyboard.mjs" <command>
\`\`\`

\`\${CLAUDE_SKILL_DIR}\` is the folder this SKILL.md is in. If your agent doesn't fill it in, use that folder's
path. **Below, \`sb\` is short for that whole command.**

## Workflow

1. **Look up the vocabulary. Don't guess.** \`${CLI} vocab\` lists categories; \`${CLI} vocab poses\`,
   \`${CLI} vocab scenes\` (with marks), \`${CLI} vocab shots\`, etc. \`${CLI} vocab --grep hospital\` searches
   every category. **If a place you need doesn't exist, draw it**: add it to the board's \`scenes\` from simple
   shapes (or on top of the closest built-in scene) and preview it with \`${CLI} scene <file>\`, which renders the
   scene with a coordinate grid and its marks so you can look at it and fix it. Recipe:
   [references/custom-scenes.md](references/custom-scenes.md). Only fall back to the closest built-in scene when
   the place doesn't matter to the story.
   A missing prop (a parcel, a sign, a queue barrier) can be a few \`shapes\`; the designer can redraw it in the editor.
   A \`"text"\` shape writes free words anywhere on a panel (a sign's wording, "9 people ahead"):
   \`{ "type": "text", "points": [[200, 40]], "text": "9 people ahead" }\`.
   If the designer hands you a picture that isn't a screen (a photo, a product, a found image), put it in the
   panel's \`images\`. It's sketchified in grays to match; \`"sketch": false\` shows it as-is.
   Full list: [references/vocabulary.md](references/vocabulary.md).
2. **Write the file**: \`<name>.storyboard.json\` (\`${CLI} new <file>\` makes a starter). Shape: [references/format.md](references/format.md).
   Worked example: [references/example.md](references/example.md).
3. **Validate and fix** until clean: \`${CLI} validate <file>\`. Errors say exactly what to change
   ("did you mean …"). Warnings are storytelling nudges; take them seriously.
   Then run \`${CLI} critique <file>\`. It's a service-design reality check (does it start before the product?
   show a workaround? let the feeling dip?). Fix what makes the story truer, not just greener.
4. **Open the editor** in the background (it keeps running): \`${CLI} dev <file>\`. Tell the designer the URL.
   Their tweaks save into the same file in real time.
5. **Iterate on the same file.** Re-read it before each edit, because the designer may have changed things.
   Never delete or rewrite \`layout\` entries (those are the designer's manual nudges) unless asked.
6. **Export** when asked: \`${CLI} export <file> --png\` (also \`--pdf\`, \`--svg\`, \`--scale 3\`,
   \`--pptx\` for a slide per panel with speaker notes, \`--html\` for a share page with comment boxes).
7. **The designer may paste a pointer** like \`In x.storyboard.json: panel 3 (id "in-line"): the bubble "bubble-0" …\`.
   That's exactly the element to change. Use the id and path it gives.
8. **On a Flowchart Kit board**, a card can point at this board (\`"ref": "./x.storyboard.json"\`) or one panel
   (\`"./x.storyboard.json#in-line"\`). \`${CLI} render <file>[#panel]\` writes the PNG it shows; Flowchart Kit
   runs it for you when the board changes.

${plainWordsMd("panel labels, captions, callouts, time cards, workarounds and notes")}
What people say in bubbles is different: write it the way that person would really say or think it.

## Craft: what makes a storyboard useful

The point is to see the product from inside the customer's life, not to illustrate a happy path.

- **Start before the product.** Panel 2 should be the trigger in real life (packing lunch, a notification,
  a problem), not the app's home screen.
- **Show the mess.** Include at least one moment of waiting, switching, confusion or a workaround (asking a
  human, a screenshot, a sticky note). These are the insights.
- **Put the unsaid in thought bubbles.** What people think but don't say ("it said 4 minutes…") is gold.
- **Vary the camera.** \`wide\` for context and who else is around, \`over-the-shoulder\` or \`screen\` when
  the UI matters, \`close-up\` for emotion. Don't use the same shot for every panel.
- **Name the places.** \`page.brand\` puts your product's name on storefronts and signs. When the story moves
  between businesses (a competitor, the corner shop, the bank), set \`"sign"\` on those panels to their name,
  or \`"sign": false\` for a blank sign.
- **Let the product be absent sometimes.** Panels without a device are fine. That contrast is the point.
- **Use time cards** ("12 minutes later…") for gaps, and a title card first.
- **End on the outcome for the person**, not on a UI state. A callout can name the consequence
  ("After this, he stops ordering ahead").
- 5–9 panels is typical. Keep bubbles under ~12 words.
- Text anywhere (bubbles, captions, callouts, labels, cards) can use \`**bold**\`, \`*italic*\`,
  \`__underline__\` and \`~~struck out~~\`: bold the word someone stresses, strike the ETA that turned out wrong.
  Designers get Cmd+B, Cmd+I and Cmd+U in the editor. A picture can be cropped with \`"crop": [left, top, right, bottom]\`
  (fractions of the picture).
- Build a varied, realistic cast (skin, age, body, hair, accessories such as glasses, cane, wheelchair,
  hijab) that fits the story. Don't default everyone to the same look. Dress staff for their job: \`outfit\`
  (\`uniform\`, \`hi-vis\`, \`lab-coat\`, \`chef\`, \`scrubs\`, \`apron\`, \`overalls\`…) and \`hat\` (\`sb vocab hats\`).
- **Teal means "our product" and nothing else.** A personal call, a text to a coworker, or someone else's app
  is not the product: give that device \`"product": false\` (e.g. \`"device": { "type": "phone", "product": false }\`)
  and it's drawn gray. Phone poses (\`holding-phone\`, \`phone-to-ear\`) without a device get a gray phone
  automatically. This is how the board shows where the product helps and where people route around it.
- Gestures (tap, swipe, click…) are drawn **orange**: what the person does. Teal stays reserved for the product.
- **Hold only what a hand holds.** \`device\` on a character is for phone, tablet, laptop or watch. Kiosks, car
  displays, TVs, terminals and smart speakers go in the panel's \`devices\` (optionally \`"at"\` a mark), and
  gestures point \`"on"\` them by id. A phone lying on a table is also a panel device, with no person needed.
- **Name every step.** Give each scene panel a short \`label\` ("Checks the app", "Asks the barista"). It shows
  under the panel and names the points on the journey chart, which is meaningless without them.
- **Fill the journey lanes.** For each scene panel set \`feeling\` (-2 awful … 2 great) and, where people route
  around a gap, \`workaround\` ("asks the barista"). The designer can switch on \`page.lanes\` to show them, plus
  a feeling line across the whole journey, with teal marking the steps where the product shows up.
- **Around a table**, people at the ends sit in profile and people across the table face you (marks like
  \`table-back\`, \`back-left\`). To turn anyone seated toward the viewer, give them \`"angle": "front"\`. Chairs
  are drawn for you wherever the scene has none.
- Crowds: people in the same pose get automatic small variations. Set \`variant\` (1–3) only if asked.
- A screen seen from the side (car dashboard, a TV across the room) can use \`"tilt": "left"\` or \`"right"\`.
- **Give everyone a \`name\`** in \`cast\`. When two or more people appear, a who's-who row (face and name) shows
  under the board. \`page.legend\` switches the keys: \`{ "product": false }\` hides the teal/orange key,
  \`{ "cast": false }\` hides the faces, \`false\` hides both. Leave it alone unless the designer asks.
- Leave text sizes alone. Designers set \`page.textScale\` and per-element \`layout.scale\` in the editor.
- If the designer gives you screen designs, reference them by path (\`"screen": "./screens/x.png"\`). The tool
  sketchifies them automatically. Otherwise leave \`screen\` out and a generic teal UI is drawn.
- **Wireframe Kit screens** work too: \`"screen": "./checkout.wireframe.json#pay"\` shows that screen of a
  wireframe (no \`#screen\` = its start screen), in teal like any product screen. If Wireframe Kit is installed it
  re-renders the screen whenever the wireframe changes; otherwise it uses the PNG rendered next to the file
  (\`checkout.pay.png\`). When the designer wants real screens and there are none yet, sketching them with the
  \`/wireframe\` skill first makes the storyboard much more concrete.
`;

function table(list: readonly Entry[], marks = false): string {
  return list.map((x) => `- \`${x.id}\`: ${x.desc}${marks && SCENE_MARKS[x.id] ? ` Marks: ${SCENE_MARKS[x.id].map((m) => `\`${m}\``).join(", ")}.` : ""}`).join("\n");
}

const FIELD: Record<string, string> = {
  scenes: "panel `scene`", shots: "panel `shot`", poses: "character `pose`", moods: "character `mood`", angles: "character `angle`",
  devices: "`device` / `devices[].type`", bubbles: "`bubbles[].type`", gestures: "`gestures[].type`", skin: "cast `skin`", hair: "cast `hair`",
  "hair-shade": "cast `hairShade`", body: "cast `body`", outfits: "cast `outfit`", hats: "cast `hat`", ages: "cast `age`", accessories: "cast `accessories` (array)",
  "time-icons": "time panel `icon`", "panel-types": "panel `type`", shapes: "`shapes[].type`", "shape-fills": "`shapes[].fill`", colors: "`shapes[].color`",
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
  "page": { "columns": 4, "brand": { "name": "Brewly" } }, // optional; brand = your product's name on shop signs
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
      "label": "The app still says 4 min",   // the step's name: under the panel and on the journey chart
      "caption": "8:14 · In line anyway.",    // optional narration box inside the panel
      "feeling": -1,                          // journey lane: -2 awful … 2 great
      "workaround": "asks the barista",       // journey lane: how they route around a gap
      "characters": [{
        "who": "maya", "pose": "holding-phone", "mood": "frustrated",
        "angle": "three-quarter", "facing": "right", "at": "counter",   // at = a scene mark
        "device": { "type": "phone", "screen": "./screens/order-status.png" }  // or "./app.wireframe.json#status"; product: false = gray
      }],
      "devices": [{ "id": "menu", "type": "kiosk", "at": "queue" }],   // devices placed in the scene
      "bubbles": [{ "type": "thought", "from": "maya", "text": "It said 4 minutes…" }],
      "gestures": [{ "type": "tap", "on": "maya", "at": [0.5, 0.8] }], // on = character (their device) or device id
      "callouts": [{ "text": "Status never updates", "target": "maya" }],
      "sign": "Corner Deli",                // optional: this panel's store name; false = blank sign (default: page.brand)
      "images": [{ "src": "./images/receipt.jpg", "x": 300, "y": 120, "w": 90 }], // any picture; gray sketch unless "sketch": false
      "shapes": [{ "type": "rect", "points": [[300, 150], [360, 200]], "fill": "light" }], // props the library lacks
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
Positions are automatic; don't add coordinates. The exceptions are \`shapes\` (box, oval, line, arrow, freehand
\`path\`) and \`images\` (center \`x\`, \`y\`, box \`w\`, \`h\`), which use panel units: 400 wide, 260 tall, origin
top-left, floor at about y 234.
`;

export function exampleMd(exampleJson: string): string {
  exampleJson = exampleJson.replace(/^\s*"\$schema": .*\n/m, "");
  return `# Worked example

Prompt: *"Storyboard Marcus ordering coffee ahead. The app says 4 minutes, it takes 20, he ends up asking the barista and is late for his train."*

\`\`\`json
${exampleJson.trim()}
\`\`\`

Why it works: it starts in real life (packing lunch, a kid interrupting), shows the product in teal only
where it's actually used, uses thought bubbles for the unsaid, includes the workaround (asking a human),
uses a time card for the wait, and ends on the consequence for the person.
`;
}

/** Pointer for AGENTS.md, for agents that don't discover skills on their own. */
export const agentsBlock = (skillDir: string) => `<!-- storyboard:start -->
## Storyboards (storyboardkit skill)

For storyboards, customer-journey comics or day-in-the-life panels, read \`${skillDir}/SKILL.md\` and follow it.
\`sb\` there means: \`node ${skillDir}/scripts/storyboard.mjs\`.

- \`${CLI} vocab [category] [--grep x]\` looks up poses, scenes, shots, devices and moods. Don't invent values.
- Write \`<name>.storyboard.json\`, then run \`${CLI} validate <file>\` and fix every error.
- \`${CLI} dev <file>\` opens the editor (run it in the background). The designer's edits save into the same file:
  re-read before editing, and keep \`layout\` entries.
- \`${CLI} export <file> --png\` exports images.
<!-- storyboard:end -->
`;

export const CUSTOM_SCENES_MD = `# Drawing your own scenes

The built-in scenes won't cover every place (a laundromat, a pharmacy counter, a warehouse dock). When the place
matters to the story, draw it. A board's own scenes live in \`scenes\` at the top level, keyed by id, and any panel
can use one with \`"scene": "<id>"\`.

## 1. Start one

(If the board file doesn't exist yet, \`scene new\` creates a starter board first.)

\`\`\`bash
${CLI} scene new laundromat my.storyboard.json               # from scratch
${CLI} scene new pharmacy my.storyboard.json --base store     # on top of a built-in scene
\`\`\`

## 2. Draw it

Everything is in **panel units: 400 wide, 260 tall, origin top-left, floor at y 234**. People are about 120 tall
and stand with their feet on the floor. The back wall usually ends around y 150 (a thin gray line there helps).

\`\`\`jsonc
"scenes": {
  "laundromat": {
    "name": "Laundromat",
    "base": "store",                 // optional: a built-in scene to draw on top of
    "shapes": [                      // drawn behind people
      { "type": "line", "points": [[0, 150], [400, 150]], "color": "grey" },      // where wall meets floor
      { "type": "rect", "points": [[20, 150], [80, 234]], "fill": "light" },       // a washer, standing on the floor
      { "type": "ellipse", "points": [[32, 168], [68, 204]], "fill": "mid" },       // its door
      { "type": "text", "points": [[315, 66]], "text": "COINS ONLY" }              // wording on a sign
    ],
    "front": [                       // drawn in front of people (they stand behind it)
      { "type": "rect", "points": [[240, 190], [400, 234]], "fill": "light" }      // folding table
    ],
    "marks": {                       // named spots where people stand
      "washers": { "x": 210, "facing": "left" },
      "folding": { "x": 300, "facing": "left", "behind": true },
      "bench":   { "x": 120, "seated": true }
    },
    "sign": { "x": 150, "y": 20, "w": 90, "h": 20 }   // optional: where the brand / store name goes
  }
}
\`\`\`

Shapes: \`rect\` and \`ellipse\` (two opposite corners), \`line\` and \`arrow\` (two ends), \`path\` (any number of
points, freehand), \`text\` (one center point plus \`text\`). \`fill\`: none, light, mid, dark. \`color\`: ink (default),
gray, red, blue, green, yellow. Keep scenes in grays: teal belongs to the product only.

Sizes to plan around (panel units):
- A standing adult's head is around y 100 to 130; seated, around y 135 to 160. Feet are on the floor (y 234).
- A \`front\` shape that hides legs (a counter, a car door, a wall with a window) should run all the way down to
  y 240 or more, or feet peek out underneath.
- Wide shots show the whole scene; medium shots crop in around the people (the preview shows both). Keep signs
  and key props inside x 40 to 360 and y 40 to 200 so they survive the crop.
- Over-the-shoulder, screen and POV shots are about the device: the scene is only a faded background there. Use
  wide or medium to show the place.

Tips that make scenes read well:
- Stand furniture on the floor: its bottom edge at y 234.
- Put tall things (shelves, machines) at the sides, and leave the middle 120 to 300 clear-ish for people.
- Keep big shapes below y 60 or above y 110 near marks, so heads (around y 100 to 130) stay visible.
- Two to four props that say "this place" beat twenty details. A labeled sign (text shape) does a lot.
- A mark with \`"behind": true\` stands behind the \`front\` shapes (a clerk behind a counter).

## 3. Look at it, then fix it

\`\`\`bash
${CLI} scene my.storyboard.json laundromat
\`\`\`

That writes \`my.scenes.png\`: each scene as a wide shot with a 50-unit grid, the floor line and a sample person at
every mark (labeled underneath), next to the same scene as a medium shot so you can see how it crops. **Open
the image and look at it.** Check props sit on the floor, people stand where they should, nothing covers a head
and no feet poke out below a counter. Adjust the numbers and preview again. Then use it in panels and \`${CLI} validate\` as usual.

The designer can also make scenes in the editor: draw on a panel, then **Save as scene…** in the panel's toolbar.
`;
