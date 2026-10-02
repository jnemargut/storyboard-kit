import {
  ACCESSORIES, AGES, ANGLES, BODY, BUBBLES, DEVICES, DIRECTIONS, FACING, GESTURES, HAIR, HAIR_SHADE, HATS, MOODS,
  OUTFITS, POSES, SCENES, MARKER_COLORS, SHAPE_FILLS, SHAPE_WEIGHTS, SHAPES, SHOTS, SKIN, TIME_ICONS, ids, type Entry,
} from "./vocab";

const oneOf = (list: readonly Entry[]) => ({ enum: ids(list), description: list.map((x) => `${x.id}: ${x.desc}`).join("\n") });

const layoutOverride = {
  type: "object",
  description: "Manual nudges written by the editor. Leave these alone unless asked to reset a layout.",
  additionalProperties: {
    type: "object",
    additionalProperties: false,
    properties: {
      dx: { type: "number" }, dy: { type: "number" }, scale: { type: "number", exclusiveMinimum: 0 },
      rotate: { type: "number" }, hidden: { type: "boolean" }, z: { type: "number" },
    },
  },
};

const base = {
  id: { type: "string", pattern: "^[a-z0-9][a-z0-9-]*$", description: "Stable panel id, e.g. p1 or order-late." },
  label: { type: "string", description: "Short caption under the panel (optional)." },
  notes: { type: "string", description: "Designer/research notes. Not drawn." },
  layout: layoutOverride,
  markup: {
    type: "array", description: "Sharpie strokes drawn over the panel in play mode (crit markup). Written by the editor.",
    items: { type: "object", required: ["points"], additionalProperties: false, properties: { points: { type: "array", minItems: 2, items: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 } }, color: { enum: ["ink", "grey", "red", "blue", "green", "yellow"] } } },
  },
};

const device = { type: "string", ...oneOf(DEVICES) };

const shapeItem = {
  type: "object", required: ["type", "points"], additionalProperties: false,
  properties: {
    id: { type: "string" }, type: oneOf(SHAPES), fill: oneOf(SHAPE_FILLS),
    points: { type: "array", minItems: 1, items: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 } },
    text: { type: "string", description: "The words, for a text shape." },
    color: { anyOf: [oneOf(MARKER_COLORS), { const: "none", description: "No outline." }] },
    weight: oneOf(SHAPE_WEIGHTS),
    size: { enum: ["s", "m", "l", "xl"], description: "Text size for a text shape." },
  },
};

export function buildSchema() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "Storyboard",
    description: "A low-fi service-design storyboard. Describe what happens; the renderer decides where things go.",
    type: "object",
    required: ["schemaVersion", "title", "cast", "panels"],
    additionalProperties: false,
    properties: {
      $schema: { type: "string" },
      schemaVersion: { const: 1 },
      title: { type: "string" },
      subtitle: { type: "string" },
      persona: { type: "string", description: "Who this is about, e.g. 'Maya, busy commuter'." },
      notes: { type: "string" },
      page: { type: "object", additionalProperties: false, properties: { columns: { type: "integer", minimum: 1, maximum: 6 }, textScale: { type: "number", minimum: 0.5, maximum: 2.5, description: "Multiplies all text sizes (1 = default). Designers usually set this in the editor." }, lanes: { type: "boolean", description: "Show journey lanes (feeling, product, workaround) under each panel." }, brand: { type: "object", additionalProperties: false, properties: { name: { type: "string", description: "Shown on storefronts/signs." }, logo: { type: "string", description: "Path to a logo image." } } } } },
      cast: {
        type: "object",
        description: "Everyone who appears, keyed by id (lowercase).",
        additionalProperties: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string" },
            skin: oneOf(SKIN), hair: oneOf(HAIR), hairShade: oneOf(HAIR_SHADE), hat: oneOf(HATS), body: oneOf(BODY),
            outfit: oneOf(OUTFITS), age: oneOf(AGES),
            accessories: { type: "array", items: oneOf(ACCESSORIES), uniqueItems: true },
          },
        },
      },
      scenes: {
        type: "object",
        description: "Places this board draws itself, keyed by scene id, for when no built-in scene fits. Panel units: 400 wide, 260 tall, floor at y 234.",
        additionalProperties: {
          type: "object", additionalProperties: false,
          properties: {
            name: { type: "string" },
            base: { ...oneOf(SCENES), description: "Optional built-in scene to draw on top of." },
            shapes: { type: "array", items: shapeItem, description: "Drawn behind people." },
            front: { type: "array", items: shapeItem, description: "Drawn in front of people (a counter they stand behind)." },
            marks: {
              type: "object", description: "Named spots where people stand.",
              additionalProperties: { type: "object", required: ["x"], additionalProperties: false, properties: { x: { type: "number", minimum: 0, maximum: 400 }, y: { type: "number" }, facing: { enum: ["left", "right"] }, seated: { type: "boolean" }, behind: { type: "boolean" }, scale: { type: "number" } } },
            },
            sign: { type: "object", required: ["x", "y", "w", "h"], properties: { x: { type: "number" }, y: { type: "number" }, w: { type: "number" }, h: { type: "number" } } },
          },
        },
      },
      panels: {
        type: "array",
        minItems: 1,
        items: {
          oneOf: [
            {
              type: "object",
              required: ["id", "type", "title"],
              additionalProperties: false,
              properties: { ...base, type: { const: "title" }, title: { type: "string" }, subtitle: { type: "string" } },
            },
            {
              type: "object",
              required: ["id", "type", "text"],
              additionalProperties: false,
              properties: { ...base, type: { const: "time" }, text: { type: "string" }, icon: oneOf(TIME_ICONS) },
            },
            {
              type: "object",
              required: ["id", "type", "text"],
              additionalProperties: false,
              properties: { ...base, type: { const: "text" }, text: { type: "string" } },
            },
            {
              type: "object",
              required: ["id", "scene"],
              additionalProperties: false,
              properties: {
                ...base,
                type: { const: "scene" },
                scene: { type: "string", description: `A built-in scene (${ids(SCENES).join(", ")}) or the id of one of the board's own "scenes".` },
                shot: oneOf(SHOTS),
                focus: { type: "string", description: "Id of the character or device the camera frames." },
                caption: { type: "string", description: "Narration box in the top-left corner." },
                feeling: { type: "integer", minimum: -2, maximum: 2, description: "Journey lane: -2 awful … 2 great. Omit to derive from the main character's mood." },
                workaround: { type: "string", description: "Journey lane: what they do to route around a gap (e.g. 'asks the barista')." },
                characters: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["who"],
                    additionalProperties: false,
                    properties: {
                      who: { type: "string", description: "Key from `cast`." },
                      id: { type: "string" },
                      pose: oneOf(POSES), mood: oneOf(MOODS), angle: oneOf(ANGLES),
                      facing: { enum: [...FACING] },
                      at: { type: "string", description: "A mark in the scene (see `storyboard vocab marks`)." },
                      variant: { type: "integer", minimum: 1, maximum: 3, description: "Pose variation 1–3 (auto if omitted)." },
                      device: {
                        description: "Device in their hands: phone, tablet, laptop or watch only. Kiosks, car displays, TVs etc. go in the panel's `devices`.",
                        oneOf: [device, { type: "object", required: ["type"], additionalProperties: false, properties: { type: device, screen: { type: "string" }, product: { type: "boolean", description: "false = not the product (personal call/text, someone else's app): drawn gray, not teal. Default true." } } }],
                      },
                    },
                  },
                },
                devices: {
                  type: "array",
                  items: {
                    type: "object", required: ["type"], additionalProperties: false,
                    properties: { id: { type: "string" }, type: device, at: { type: "string" }, tilt: { enum: ["left", "right"], description: "Screen turned away from the viewer." }, screen: { type: "string", description: "Path to a screen image, relative to the storyboard file." }, product: { type: "boolean", description: "false = not the product (personal call/text, someone else's app): drawn gray, not teal. Default true." } },
                  },
                },
                bubbles: {
                  type: "array",
                  items: {
                    type: "object", required: ["type", "text"], additionalProperties: false,
                    properties: { id: { type: "string" }, type: oneOf(BUBBLES), from: { type: "string" }, text: { type: "string" } },
                  },
                },
                callouts: {
                  type: "array",
                  items: { type: "object", required: ["text"], additionalProperties: false, properties: { id: { type: "string" }, text: { type: "string" }, target: { type: "string" } } },
                },
                sign: { oneOf: [{ type: "string" }, { const: false }], description: "Name on this panel's storefront or sign, e.g. another store. Overrides page.brand; false = blank sign." },
                images: {
                  type: "array",
                  description: "Any picture placed in the scene. Sketchified in grays unless sketch is false. Panel units, 400 x 260.",
                  items: {
                    type: "object", required: ["src"], additionalProperties: false,
                    properties: {
                      id: { type: "string" }, src: { type: "string", description: "Path relative to the storyboard file." },
                      x: { type: "number" }, y: { type: "number" }, w: { type: "number", exclusiveMinimum: 0 }, h: { type: "number", exclusiveMinimum: 0 },
                      sketch: { type: "boolean", description: "false = show the image as-is. Default true." },
                      crop: { type: "array", items: { type: "number", minimum: 0, maximum: 1 }, minItems: 4, maxItems: 4, description: "Show only part of the picture: [left, top, right, bottom] as fractions." },
                    },
                  },
                },
                shapes: {
                  type: "array",
                  description: "Simple drawn shapes for anything the vocabulary lacks. Panel coordinates, 400 wide x 260 tall.",
                  items: shapeItem,
                },
                gestures: {
                  type: "array",
                  items: {
                    type: "object", required: ["type"], additionalProperties: false,
                    properties: {
                      id: { type: "string" }, type: oneOf(GESTURES), on: { type: "string" },
                      at: { type: "array", items: { type: "number", minimum: 0, maximum: 1 }, minItems: 2, maxItems: 2 },
                      direction: { enum: [...DIRECTIONS] },
                      angle: { type: "number", description: "Swipe direction in degrees, 0 = right, 90 = down (overrides direction)." },
                    },
                  },
                },
              },
            },
          ],
        },
      },
    },
  };
}
