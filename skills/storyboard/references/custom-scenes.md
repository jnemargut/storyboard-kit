# Drawing your own scenes

The built-in scenes won't cover every place (a laundromat, a pharmacy counter, a warehouse dock). When the place
matters to the story, draw it. A board's own scenes live in `scenes` at the top level, keyed by id, and any panel
can use one with `"scene": "<id>"`.

## 1. Start one

(If the board file doesn't exist yet, `scene new` creates a starter board first.)

```bash
sb scene new laundromat my.storyboard.json               # from scratch
sb scene new pharmacy my.storyboard.json --base store     # on top of a built-in scene
```

## 2. Draw it

Everything is in **panel units: 400 wide, 260 tall, origin top-left, floor at y 234**. People are about 120 tall
and stand with their feet on the floor. The back wall usually ends around y 150 (a thin grey line there helps).

```jsonc
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
```

Shapes: `rect` and `ellipse` (two opposite corners), `line` and `arrow` (two ends), `path` (any number of
points, freehand), `text` (one centre point plus `text`). `fill`: none, light, mid, dark. `color`: ink (default),
grey, red, blue, green, yellow. Keep scenes in greys: teal belongs to the product only.

Sizes to plan around (panel units):
- A standing adult's head is around y 100 to 130; seated, around y 135 to 160. Feet are on the floor (y 234).
- A `front` shape that hides legs (a counter, a car door, a wall with a window) should run all the way down to
  y 240 or more, or feet peek out underneath.
- Wide shots show the whole scene; medium shots crop in around the people (the preview shows both). Keep signs
  and key props inside x 40 to 360 and y 40 to 200 so they survive the crop.
- Over-the-shoulder, screen and POV shots are about the device: the scene is only a faded background there. Use
  wide or medium to show the place.

Tips that make scenes read well:
- Stand furniture on the floor: its bottom edge at y 234.
- Put tall things (shelves, machines) at the sides, and leave the middle 120 to 300 clear-ish for people.
- Keep big shapes below y 60 or above y 110 near marks, so heads (around y 100 to 130) stay visible.
- Two to four props that say "this place" beat twenty details. A labelled sign (text shape) does a lot.
- A mark with `"behind": true` stands behind the `front` shapes (a clerk behind a counter).

## 3. Look at it, then fix it

```bash
sb scene my.storyboard.json laundromat
```

That writes `my.scenes.png`: each scene as a wide shot with a 50-unit grid, the floor line and a sample person at
every mark (labelled underneath), next to the same scene as a medium shot so you can see how it crops. **Open
the image and look at it.** Check props sit on the floor, people stand where they should, nothing covers a head
and no feet poke out below a counter. Adjust the numbers and preview again. Then use it in panels and `sb validate` as usual.

The designer can also make scenes in the editor: draw on a panel, then **Save as scene…** in the panel's toolbar.
