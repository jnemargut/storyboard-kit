---
name: storyboard
description: Draft low-fi, sketch-style service-design storyboards (comic-style panels of a person's real day with your product in it) as a storyboard.json file, validate it, and open the page-first editor. Use when the user asks for a storyboard, a customer journey comic, "show how people really use this", a day-in-the-life, or service-design panels.
---

# Storyboards for service design

You turn a designer's loose description ("Maya orders coffee ahead, it's late, she gets annoyed") into a
`*.storyboard.json` file, validate it, and open an editor where the designer tweaks it. The tool draws
everything in a low-fi marker style where **the software is the only thing in color (teal)**, so the board
shows where the product actually shows up in someone's day and where it doesn't.

## Workflow

1. **Look up the vocabulary. Don't guess.** `npx storyboardkit vocab` lists categories; `npx storyboardkit vocab poses`,
   `npx storyboardkit vocab scenes` (with marks), `npx storyboardkit vocab shots`, etc. `npx storyboardkit vocab --grep hospital` searches
   every category. If a place you need doesn't exist, pick the closest scene and say so in `label` or a `caption`.
   Full list: [references/vocabulary.md](references/vocabulary.md).
2. **Write the file**: `<name>.storyboard.json`. Shape: [references/format.md](references/format.md).
   Worked example: [references/example.md](references/example.md).
3. **Validate and fix** until clean: `npx storyboardkit validate <file>`. Errors say exactly what to change
   ("did you mean …"). Warnings are storytelling nudges; take them seriously.
   Then run `npx storyboardkit critique <file>`. It's a service-design reality check (does it start before the product?
   show a workaround? let the feeling dip?). Fix what makes the story truer, not just greener.
4. **Open the editor** in the background (it keeps running): `npx storyboardkit dev <file>`. Tell the designer the URL.
   Their tweaks save into the same file in real time.
5. **Iterate on the same file.** Re-read it before each edit, because the designer may have changed things.
   Never delete or rewrite `layout` entries (those are the designer's manual nudges) unless asked.
6. **Export** when asked: `npx storyboardkit export <file> --png` (also `--pdf`, `--svg`, `--scale 3`,
   `--pptx` for a slide per panel with speaker notes, `--html` for a share page with comment boxes).
7. **The designer may paste a pointer** like `In x.storyboard.json: panel 3 (id "in-line"): the bubble "bubble-0" …`.
   That's exactly the element to change. Use the id and path it gives.

## Craft: what makes a storyboard useful

The point is to see the product from inside the customer's life, not to illustrate a happy path.

- **Start before the product.** Panel 2 should be the trigger in real life (packing lunch, a notification,
  a problem), not the app's home screen.
- **Show the mess.** Include at least one moment of waiting, switching, confusion or a workaround (asking a
  human, a screenshot, a sticky note). These are the insights.
- **Put the unsaid in thought bubbles.** What people think but don't say ("it said 4 minutes…") is gold.
- **Vary the camera.** `wide` for context and who else is around, `over-the-shoulder` or `screen` when
  the UI matters, `close-up` for emotion. Don't use the same shot for every panel.
- **Let the product be absent sometimes.** Panels without a device are fine. That contrast is the point.
- **Use time cards** ("12 minutes later…") for gaps, and a title card first.
- **End on the outcome for the person**, not on a UI state. A callout can name the consequence
  ("Trust lost: she'll skip ordering ahead").
- 5–9 panels is typical. Keep bubbles under ~12 words.
- Build a varied, realistic cast (skin, age, body, hair, accessories such as glasses, cane, wheelchair,
  hijab) that fits the story. Don't default everyone to the same look.
- **Teal means "our product" and nothing else.** A personal call, a text to a coworker, or someone else's app
  is not the product: give that device `"product": false` (e.g. `"device": { "type": "phone", "product": false }`)
  and it's drawn grey. Phone poses (`holding-phone`, `phone-to-ear`) without a device get a grey phone
  automatically. This is how the board shows where the product helps and where people route around it.
- **Hold only what a hand holds.** `device` on a character is for phone, tablet, laptop or watch. Kiosks, car
  displays, TVs, terminals and smart speakers go in the panel's `devices` (optionally `"at"` a mark), and
  gestures point `"on"` them by id. A phone lying on a table is also a panel device, with no person needed.
- **Fill the journey lanes.** For each scene panel set `feeling` (-2 awful … 2 great) and, where people route
  around a gap, `workaround` ("asks the barista"). The designer can switch on `page.lanes` to show them, plus
  a feeling line and "Product in N of M moments".
- Crowds: people in the same pose get automatic small variations. Set `variant` (1–3) only if asked.
- A screen seen from the side (car dashboard, a TV across the room) can use `"tilt": "left"` or `"right"`.
- Leave text sizes alone. Designers set `page.textScale` and per-element `layout.scale` in the editor.
- If the designer gives you screen designs, reference them by path (`"screen": "./screens/x.png"`). The tool
  sketchifies them automatically. Otherwise leave `screen` out and a generic teal UI is drawn.
