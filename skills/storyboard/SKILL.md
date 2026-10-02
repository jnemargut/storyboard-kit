---
name: storyboard
description: Draft low-fi, sketch-style service-design storyboards (comic-style panels of a person's real day with your product in it) as a storyboard.json file, validate it, and open the page-first editor. Use when the user asks for a storyboard, a customer journey comic, "show how people really use this", a day-in-the-life, or service-design panels.
---

# Storyboards for service design

You turn a designer's loose description ("Marcus orders coffee ahead, it's late, he gets annoyed") into a
`*.storyboard.json` file, validate it, and open an editor where the designer tweaks it. The tool draws
everything in a low-fi marker style where **the software is the only thing in color (teal)**, so the board
shows where the product actually shows up in someone's day and where it doesn't.

## Running the tool

Everything runs through one bundled script in this skill's folder (it needs Node.js 18+ and nothing else):

```bash
node "${CLAUDE_SKILL_DIR}/scripts/storyboard.mjs" <command>
```

`${CLAUDE_SKILL_DIR}` is the folder this SKILL.md is in. If your agent doesn't fill it in, use that folder's
path. **Below, `sb` is short for that whole command.**

## Workflow

1. **Look up the vocabulary. Don't guess.** `sb vocab` lists categories; `sb vocab poses`,
   `sb vocab scenes` (with marks), `sb vocab shots`, etc. `sb vocab --grep hospital` searches
   every category. **If a place you need doesn't exist, draw it**: add it to the board's `scenes` from simple
   shapes (or on top of the closest built-in scene) and preview it with `sb scene <file>`, which renders the
   scene with a coordinate grid and its marks so you can look at it and fix it. Recipe:
   [references/custom-scenes.md](references/custom-scenes.md). Only fall back to the closest built-in scene when
   the place doesn't matter to the story.
   A missing prop (a parcel, a sign, a queue barrier) can be a few `shapes`; the designer can redraw it in the editor.
   A `"text"` shape writes free words anywhere on a panel (a sign's wording, "9 people ahead"):
   `{ "type": "text", "points": [[200, 40]], "text": "9 people ahead" }`.
   If the designer hands you a picture that isn't a screen (a photo, a product, a found image), put it in the
   panel's `images`. It's sketchified in grays to match; `"sketch": false` shows it as-is.
   Full list: [references/vocabulary.md](references/vocabulary.md).
2. **Write the file**: `<name>.storyboard.json` (`sb new <file>` makes a starter). Shape: [references/format.md](references/format.md).
   Worked example: [references/example.md](references/example.md).
3. **Validate and fix** until clean: `sb validate <file>`. Errors say exactly what to change
   ("did you mean …"). Warnings are storytelling nudges; take them seriously.
   Then run `sb critique <file>`. It's a service-design reality check (does it start before the product?
   show a workaround? let the feeling dip?). Fix what makes the story truer, not just greener.
4. **Open the editor** in the background (it keeps running): `sb dev <file>`. Tell the designer the URL.
   Their tweaks save into the same file in real time.
5. **Iterate on the same file.** Re-read it before each edit, because the designer may have changed things.
   Never delete or rewrite `layout` entries (those are the designer's manual nudges) unless asked.
6. **Export** when asked: `sb export <file> --png` (also `--pdf`, `--svg`, `--scale 3`,
   `--pptx` for a slide per panel with speaker notes, `--html` for a share page with comment boxes).
7. **The designer may paste a pointer** like `In x.storyboard.json: panel 3 (id "in-line"): the bubble "bubble-0" …`.
   That's exactly the element to change. Use the id and path it gives.
8. **On a Flowchart Kit board**, a card can point at this board (`"ref": "./x.storyboard.json"`) or one panel
   (`"./x.storyboard.json#in-line"`). `sb render <file>[#panel]` writes the PNG it shows; Flowchart Kit
   runs it for you when the board changes.

## Craft: what makes a storyboard useful

The point is to see the product from inside the customer's life, not to illustrate a happy path.

- **Start before the product.** Panel 2 should be the trigger in real life (packing lunch, a notification,
  a problem), not the app's home screen.
- **Show the mess.** Include at least one moment of waiting, switching, confusion or a workaround (asking a
  human, a screenshot, a sticky note). These are the insights.
- **Put the unsaid in thought bubbles.** What people think but don't say ("it said 4 minutes…") is gold.
- **Vary the camera.** `wide` for context and who else is around, `over-the-shoulder` or `screen` when
  the UI matters, `close-up` for emotion. Don't use the same shot for every panel.
- **Name the places.** `page.brand` puts your product's name on storefronts and signs. When the story moves
  between businesses (a competitor, the corner shop, the bank), set `"sign"` on those panels to their name,
  or `"sign": false` for a blank sign.
- **Let the product be absent sometimes.** Panels without a device are fine. That contrast is the point.
- **Use time cards** ("12 minutes later…") for gaps, and a title card first.
- **End on the outcome for the person**, not on a UI state. A callout can name the consequence
  ("Trust lost: he'll skip ordering ahead").
- 5–9 panels is typical. Keep bubbles under ~12 words.
- Text anywhere (bubbles, captions, callouts, labels, cards) can use `**bold**`, `*italic*`,
  `__underline__` and `~~struck out~~`: bold the word someone stresses, strike the ETA that turned out wrong.
  Designers get Cmd+B, Cmd+I and Cmd+U in the editor. A picture can be cropped with `"crop": [left, top, right, bottom]`
  (fractions of the picture).
- Build a varied, realistic cast (skin, age, body, hair, accessories such as glasses, cane, wheelchair,
  hijab) that fits the story. Don't default everyone to the same look. Dress staff for their job: `outfit`
  (`uniform`, `hi-vis`, `lab-coat`, `chef`, `scrubs`, `apron`, `overalls`…) and `hat` (`sb vocab hats`).
- **Teal means "our product" and nothing else.** A personal call, a text to a coworker, or someone else's app
  is not the product: give that device `"product": false` (e.g. `"device": { "type": "phone", "product": false }`)
  and it's drawn gray. Phone poses (`holding-phone`, `phone-to-ear`) without a device get a gray phone
  automatically. This is how the board shows where the product helps and where people route around it.
- Gestures (tap, swipe, click…) are drawn **orange**: what the person does. Teal stays reserved for the product.
- **Hold only what a hand holds.** `device` on a character is for phone, tablet, laptop or watch. Kiosks, car
  displays, TVs, terminals and smart speakers go in the panel's `devices` (optionally `"at"` a mark), and
  gestures point `"on"` them by id. A phone lying on a table is also a panel device, with no person needed.
- **Name every step.** Give each scene panel a short `label` ("Checks the app", "Asks the barista"). It shows
  under the panel and names the points on the journey chart, which is meaningless without them.
- **Fill the journey lanes.** For each scene panel set `feeling` (-2 awful … 2 great) and, where people route
  around a gap, `workaround` ("asks the barista"). The designer can switch on `page.lanes` to show them, plus
  a feeling line across the whole journey, with teal marking the steps where the product shows up.
- Crowds: people in the same pose get automatic small variations. Set `variant` (1–3) only if asked.
- A screen seen from the side (car dashboard, a TV across the room) can use `"tilt": "left"` or `"right"`.
- Leave text sizes alone. Designers set `page.textScale` and per-element `layout.scale` in the editor.
- If the designer gives you screen designs, reference them by path (`"screen": "./screens/x.png"`). The tool
  sketchifies them automatically. Otherwise leave `screen` out and a generic teal UI is drawn.
- **Wireframe Kit screens** work too: `"screen": "./checkout.wireframe.json#pay"` shows that screen of a
  wireframe (no `#screen` = its start screen), in teal like any product screen. If Wireframe Kit is installed it
  re-renders the screen whenever the wireframe changes; otherwise it uses the PNG rendered next to the file
  (`checkout.pay.png`). When the designer wants real screens and there are none yet, sketching them with the
  `/wireframe` skill first makes the storyboard much more concrete.
