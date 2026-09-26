# storyboard.json format

```jsonc
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
        "device": { "type": "phone", "screen": "./screens/order-status.png" }  // product: false = personal device, grey
      }],
      "devices": [{ "id": "menu", "type": "kiosk", "at": "queue" }],   // devices placed in the scene
      "bubbles": [{ "type": "thought", "from": "maya", "text": "It said 4 minutes…" }],
      "gestures": [{ "type": "tap", "on": "maya", "at": [0.5, 0.8] }], // on = character (their device) or device id
      "callouts": [{ "text": "Status never updates", "target": "maya" }],
      "sign": "Corner Deli",                // optional: this panel's store name; false = blank sign (default: page.brand)
      "images": [{ "src": "./images/receipt.jpg", "x": 300, "y": 120, "w": 90 }], // any picture; grey sketch unless "sketch": false
      "shapes": [{ "type": "rect", "points": [[300, 150], [360, 200]], "fill": "light" }], // props the library lacks
      "notes": "From interview P4",          // not drawn
      "layout": { "maya": { "dx": -12 } }    // written by the editor. Leave it alone.
    },
    { "id": "later", "type": "time", "text": "12 minutes later…", "icon": "clock" },
    { "id": "aside", "type": "text", "text": "She never opened the app again." }
  ]
}
```

Rules: every `who` must be in `cast`; `from`, `on`, `target` and `focus` refer to a character id (`who`, or
`id` if you gave one) or a device `id` (defaults to its type) **in the same panel**. Scene panels need `scene`.
Positions are automatic; don't add coordinates. The exceptions are `shapes` (box, oval, line, arrow, freehand
`path`) and `images` (centre `x`, `y`, box `w`, `h`), which use panel units: 400 wide, 260 tall, origin
top-left, floor at about y 234.
