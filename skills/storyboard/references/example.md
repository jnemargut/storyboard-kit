# Worked example

Prompt: *"Storyboard Marcus ordering coffee ahead. The app says 4 minutes, it takes 20, he ends up asking the barista and is late for his train."*

```json
{
  "schemaVersion": 1,
  "title": "The Late Latte",
  "persona": "Maya, busy commuter",
  "subtitle": "Journey: mobile order-ahead",
  "cast": {
    "maya": { "name": "Maya", "skin": "tone-2", "hair": "bun", "outfit": "jacket", "accessories": ["bag"] },
    "leo": { "name": "Leo", "skin": "tone-2", "hair": "curly", "age": "child", "outfit": "hoodie" },
    "sam": { "name": "Sam", "skin": "tone-4", "hair": "afro", "outfit": "apron", "accessories": ["beard"] }
  },
  "panels": [
    { "id": "title", "type": "title", "title": "The Late Latte", "subtitle": "Maya · Tuesday · ordered ahead, 4 min ETA" },
    {
      "id": "order-ahead", "scene": "kitchen", "shot": "wide", "label": "Orders while packing lunch",
      "caption": "7:58 · Packing Leo's lunch, ordering ahead.",
      "characters": [
        { "who": "maya", "pose": "holding-phone", "mood": "focused", "at": "counter", "facing": "left", "device": { "type": "phone", "screen": "./screens/order-status.png" } },
        { "who": "leo", "pose": "waving", "mood": "excited", "at": "fridge", "facing": "right" }
      ],
      "bubbles": [{ "type": "speech", "from": "leo", "text": "Mom! Where's my other shoe?" }],
      "gestures": [{ "type": "tap", "on": "maya" }]
    },
    {
      "id": "walking", "scene": "street", "shot": "medium", "label": "Confirmation on the way",
      "characters": [{ "who": "maya", "pose": "walking", "mood": "happy", "angle": "side", "facing": "right", "device": "phone" }],
      "bubbles": [{ "type": "thought", "from": "maya", "text": "Ready at 8:14. Perfect." }],
      "gestures": [{ "type": "notification", "on": "maya" }]
    },
    {
      "id": "in-line", "scene": "coffee-shop", "shot": "wide", "label": "In line anyway",
      "caption": "8:14 · In line anyway. Is my order even started?",
      "characters": [
        { "who": "maya", "pose": "holding-phone", "mood": "impatient", "at": "counter", "device": "phone" },
        { "who": "sam", "pose": "standing", "mood": "focused", "at": "barista" }
      ],
      "bubbles": [{ "type": "speech", "from": "sam", "text": "Name for the order?" }]
    },
    {
      "id": "checks-app", "scene": "coffee-shop", "shot": "over-the-shoulder", "label": "The app still says 4 min",
      "characters": [{ "who": "maya", "pose": "holding-phone", "mood": "frustrated", "device": { "type": "phone", "screen": "./screens/order-status.png" } }],
      "bubbles": [{ "type": "thought", "from": "maya", "text": "It said 4 min. That was 12 min ago…" }],
      "gestures": [{ "type": "tap", "on": "maya", "at": [0.5, 0.8] }]
    },
    { "id": "later", "type": "time", "text": "12 minutes later…", "icon": "clock", "label": "Still waiting" },
    {
      "id": "asks", "scene": "coffee-shop", "shot": "close-up", "label": "The workaround: ask a human",
      "characters": [{ "who": "maya", "pose": "standing", "mood": "stressed", "at": "counter" }],
      "bubbles": [{ "type": "speech", "from": "maya", "text": "Sorry, is order 214 ready?" }]
    },
    {
      "id": "commute", "scene": "transit", "shot": "wide", "label": "Late for the 8:40",
      "characters": [{ "who": "maya", "pose": "sitting", "mood": "tired", "at": "seat", "device": "phone" }],
      "bubbles": [{ "type": "thought", "from": "maya", "text": "Next time I'll just stand in line." }],
      "callouts": [{ "text": "Trust lost: she'll skip ordering ahead next time", "target": "maya" }]
    }
  ]
}
```

Why it works: it starts in real life (packing lunch, a kid interrupting), shows the product in teal only
where it's actually used, uses thought bubbles for the unsaid, includes the workaround (asking a human),
uses a time card for the wait, and ends on the consequence for the person.
