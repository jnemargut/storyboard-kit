import { findUndrawable, undrawableHint } from "./sketch/glyphs";
import { isHex } from "./sketch/tokens";
import {
  ACCESSORIES, AGES, ANGLES, BODY, BUBBLES, DEVICES, DIRECTIONS, FACING, GESTURES, HAIR, HAIR_SHADE, HATS, MOODS,
  OUTFITS, PANEL_TYPES, POSES, SCENES, SCENE_MARKS, MARKER_COLORS, SHAPE_FILLS, SHAPE_WEIGHTS, SHAPES, SHOTS, SKIN, TIME_ICONS, ids, type Entry,
} from "./vocab";
import { isCrop } from "./sketch/crop";
import { SCHEMA_VERSION } from "./types";
import { HANDHELD } from "./vocab";

import { distance, suggest, formatIssues, type Issue, type Result } from "./sketch/suggest";
export { distance, suggest, type Issue, type Result };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

export function validate(input: unknown): Result {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const err = (path: string, message: string, hint?: string) => errors.push({ path, message, hint });
  const warn = (path: string, message: string, hint?: string) => warnings.push({ path, message, hint });

  const oneOf = (path: string, value: unknown, list: readonly Entry[] | readonly string[], what: string) => {
    if (value === undefined) return;
    const opts = (list as readonly (Entry | string)[]).map((x) => (typeof x === "string" ? x : x.id));
    if (typeof value !== "string" || !opts.includes(value)) {
      const s = typeof value === "string" ? suggest(value, opts) : undefined;
      err(path, `"${String(value)}" isn't ${/^[aeiou]/.test(what) ? "an" : "a"} ${what}.`, s ? `Did you mean "${s}"?` : `Run \`storyboard vocab ${what}s\` to see options: ${opts.slice(0, 8).join(", ")}${opts.length > 8 ? ", …" : ""}`);
    }
  };
  const str = (path: string, v: unknown, required = false) => {
    if (v === undefined) { if (required) err(path, "is required."); return; }
    if (typeof v !== "string") err(path, "must be a string.");
  };
  const known = (path: string, obj: Obj, allowed: string[]) => {
    for (const k of Object.keys(obj)) {
      if (!allowed.includes(k)) {
        const s = suggest(k, allowed);
        err(`${path}.${k}`, `Unknown field "${k}".`, s ? `Did you mean "${s}"?` : `Allowed: ${allowed.join(", ")}`);
      }
    }
  };

  if (!isObj(input)) {
    err("$", "The storyboard must be a JSON object.");
    return { ok: false, errors, warnings };
  }
  const b = input;
  known("$", b, ["$schema", "schemaVersion", "title", "subtitle", "persona", "notes", "page", "cast", "scenes", "panels"]);

  /** Simple drawn shapes: used by panels and by custom scenes. */
  const checkShapes = (path: string, list: unknown) => {
    const shapes = list ?? [];
    if (!Array.isArray(shapes)) { err(path, "must be an array."); return; }
    shapes.forEach((s, j) => {
      const sp = `${path}[${j}]`;
      if (!isObj(s)) { err(sp, "must be an object."); return; }
      known(sp, s, ["id", "type", "points", "fill", "text", "color", "weight", "size"]);
      if (s.color !== "none" && !isHex(s.color)) oneOf(`${sp}.color`, s.color, MARKER_COLORS, "color");
      oneOf(`${sp}.weight`, s.weight, SHAPE_WEIGHTS, "weight");
      if (s.size !== undefined && !["s", "m", "l", "xl"].includes(String(s.size))) err(`${sp}.size`, `"${String(s.size)}" isn't a text size.`, "Use s, m, l or xl.");
      oneOf(`${sp}.type`, s.type, SHAPES, "shape");
      if (s.type === undefined) err(`${sp}.type`, "is required.", `One of: ${ids(SHAPES).join(", ")}`);
      oneOf(`${sp}.fill`, s.fill, SHAPE_FILLS, "shape-fill");
      const pts = s.points;
      const isText = s.type === "text";
      if (!Array.isArray(pts) || pts.length < (isText ? 1 : 2) || pts.some((q) => !Array.isArray(q) || q.length !== 2 || q.some((n) => typeof n !== "number" || !Number.isFinite(n))))
        err(`${sp}.points`, isText ? "must be one [x, y] point: where the text is centered (panel units, 400 wide, 260 tall)." : "must be at least two [x, y] points in panel units (400 wide, 260 tall).", isText ? "e.g. [[200, 40]]" : "e.g. [[40, 120], [120, 200]]");
      if (isText) str(`${sp}.text`, s.text, true);
    });
  };

  // ---- the board's own scenes
  const customMarks: Record<string, string[]> = {};
  if (b.scenes !== undefined) {
    if (!isObj(b.scenes)) err("$.scenes", "must be an object keyed by scene id.", 'e.g. { "laundromat": { "base": "store", "shapes": [...], "marks": { "machine": { "x": 120 } } } }');
    else for (const [id, sc] of Object.entries(b.scenes)) {
      const sp = `$.scenes.${id}`;
      if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) err(sp, "Scene ids are lowercase words joined by dashes.", 'e.g. "laundromat" or "pharmacy-counter"');
      if ((ids(SCENES) as string[]).includes(id)) err(sp, `"${id}" is already a built-in scene.`, "Pick a new id, or use the built-in one as this scene's base.");
      if (!isObj(sc)) { err(sp, "must be an object."); continue; }
      known(sp, sc, ["name", "base", "shapes", "front", "marks", "sign"]);
      str(`${sp}.name`, sc.name);
      oneOf(`${sp}.base`, sc.base, SCENES, "scene");
      checkShapes(`${sp}.shapes`, sc.shapes);
      checkShapes(`${sp}.front`, sc.front);
      if (sc.marks !== undefined) {
        if (!isObj(sc.marks)) err(`${sp}.marks`, "must be an object of named spots.", 'e.g. { "counter": { "x": 220, "facing": "left" } }');
        else for (const [mk, m] of Object.entries(sc.marks)) {
          const mp = `${sp}.marks.${mk}`;
          if (!isObj(m)) { err(mp, "must be an object like { \"x\": 200 }."); continue; }
          known(mp, m, ["x", "y", "facing", "seated", "behind", "scale"]);
          if (typeof m.x !== "number" || m.x < 0 || m.x > 400) err(`${mp}.x`, "is required: 0 (left) to 400 (right).");
          if (m.y !== undefined && (typeof m.y !== "number" || m.y < 60 || m.y > 260)) err(`${mp}.y`, "is where their feet go: 60 to 260 (floor is 234).");
          oneOf(`${mp}.facing`, m.facing, FACING, "facing");
        }
      }
      if (sc.sign !== undefined && (!isObj(sc.sign) || ["x", "y", "w", "h"].some((k) => typeof (sc.sign as Record<string, unknown>)[k] !== "number")))
        err(`${sp}.sign`, 'must be a box: { "x": 20, "y": 20, "w": 120, "h": 22 }.');
      const base = typeof sc.base === "string" ? SCENE_MARKS[sc.base] : undefined;
      customMarks[id] = isObj(sc.marks) && Object.keys(sc.marks).length ? Object.keys(sc.marks) : base ?? SCENE_MARKS.blank;
    }
  }
  if (b.schemaVersion !== SCHEMA_VERSION) err("$.schemaVersion", `must be ${SCHEMA_VERSION}.`, `Add "schemaVersion": ${SCHEMA_VERSION}`);
  str("$.title", b.title, true);
  str("$.subtitle", b.subtitle);
  str("$.persona", b.persona);

  // cast
  const castIds: string[] = [];
  if (!isObj(b.cast)) err("$.cast", "must be an object of cast members keyed by id.", 'e.g. "cast": { "maya": { "hair": "bun" } }');
  else {
    for (const [id, m] of Object.entries(b.cast)) {
      castIds.push(id);
      const p = `$.cast.${id}`;
      if (!isObj(m)) { err(p, "must be an object."); continue; }
      known(p, m, ["name", "skin", "hair", "hairShade", "hat", "body", "outfit", "age", "accessories"]);
      oneOf(`${p}.skin`, m.skin, SKIN, "skin");
      oneOf(`${p}.hair`, m.hair, HAIR, "hair");
      oneOf(`${p}.hairShade`, m.hairShade, HAIR_SHADE, "hair-shade");
      oneOf(`${p}.hat`, m.hat, HATS, "hat");
      oneOf(`${p}.body`, m.body, BODY, "body");
      oneOf(`${p}.outfit`, m.outfit, OUTFITS, "outfit");
      oneOf(`${p}.age`, m.age, AGES, "age");
      if (m.accessories !== undefined) {
        if (!Array.isArray(m.accessories)) err(`${p}.accessories`, "must be an array.");
        else m.accessories.forEach((a, i) => oneOf(`${p}.accessories[${i}]`, a, ACCESSORIES, "accessorie"));
      }
    }
  }

  if (b.page !== undefined) {
    if (!isObj(b.page)) err("$.page", "must be an object.");
    else {
      known("$.page", b.page, ["columns", "textScale", "lanes", "brand", "legend"]);
      const lg = (b.page as Record<string, unknown>).legend;
      if (lg !== undefined && lg !== false && !(isObj(lg) && Object.keys(lg).every((k) => (k === "product" || k === "cast") && typeof lg[k] === "boolean")))
        err("$.page.legend", 'must be false, or { "product": true|false, "cast": true|false }.', 'e.g. "legend": { "cast": true } or "legend": false');
      if (b.page.lanes !== undefined && typeof b.page.lanes !== "boolean") err("$.page.lanes", "must be true or false.");
      if (b.page.brand !== undefined) {
        if (!isObj(b.page.brand)) err("$.page.brand", "must be an object like { \"name\": \"Acme\" }.");
        else { known("$.page.brand", b.page.brand, ["name", "logo"]); str("$.page.brand.name", b.page.brand.name); str("$.page.brand.logo", b.page.brand.logo); }
      }
      const c = b.page.columns;
      if (c !== undefined && (typeof c !== "number" || !Number.isInteger(c) || c < 1 || c > 6)) err("$.page.columns", "must be an integer from 1 to 6.");
      const t = b.page.textScale;
      if (t !== undefined && (typeof t !== "number" || t < 0.5 || t > 2.5)) err("$.page.textScale", "must be a number from 0.5 to 2.5 (1 = default).");
    }
  }

  if (!Array.isArray(b.panels) || b.panels.length === 0) {
    err("$.panels", "must be a non-empty array.");
    return { ok: errors.length === 0, errors, warnings };
  }

  const panelIds = new Set<string>();
  let sceneCount = 0;
  let productMoments = 0;
  let thoughtCount = 0;
  const shots = new Set<string>();

  b.panels.forEach((raw, i) => {
    const p = `$.panels[${i}]`;
    if (!isObj(raw)) { err(p, "must be an object."); return; }
    const type = (raw.type ?? "scene") as string;
    oneOf(`${p}.type`, raw.type, PANEL_TYPES, "panel-type");
    if (typeof raw.id !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(raw.id)) err(`${p}.id`, "must be a lowercase id like \"p1\" or \"order-late\".");
    else if (panelIds.has(raw.id)) err(`${p}.id`, `Duplicate panel id "${raw.id}".`, "Panel ids must be unique.");
    else panelIds.add(raw.id);
    str(`${p}.label`, raw.label);
    str(`${p}.notes`, raw.notes);
    const common = ["id", "type", "label", "notes", "layout", "markup"];
    const markup = raw.markup ?? [];
    if (!Array.isArray(markup)) err(`${p}.markup`, "must be an array of strokes.");
    else markup.forEach((m, j) => {
      const mp = `${p}.markup[${j}]`;
      if (!isObj(m)) { err(mp, "must be an object."); return; }
      known(mp, m, ["points", "color"]);
      if (!Array.isArray(m.points) || m.points.length < 2) err(`${mp}.points`, "must be at least two [x, y] points.");
      if (!isHex(m.color)) oneOf(`${mp}.color`, m.color, MARKER_COLORS, "color");
    });

    if (type === "title") {
      known(p, raw, [...common, "title", "subtitle"]);
      str(`${p}.title`, raw.title, true);
      return;
    }
    if (type === "time") {
      known(p, raw, [...common, "text", "icon"]);
      str(`${p}.text`, raw.text, true);
      oneOf(`${p}.icon`, raw.icon, TIME_ICONS, "time-icon");
      return;
    }
    if (type === "text") {
      known(p, raw, [...common, "text"]);
      str(`${p}.text`, raw.text, true);
      return;
    }
    if (type !== "scene") return;

    sceneCount++;
    known(p, raw, [...common, "scene", "shot", "focus", "characters", "devices", "bubbles", "caption", "callouts", "gestures", "shapes", "images", "sign", "feeling", "workaround"]);
    if (raw.sign !== undefined && raw.sign !== false && typeof raw.sign !== "string") err(`${p}.sign`, "must be a store name, or false for a blank sign.");
    if (raw.feeling !== undefined && (typeof raw.feeling !== "number" || !Number.isInteger(raw.feeling) || raw.feeling < -2 || raw.feeling > 2))
      err(`${p}.feeling`, "must be an integer from -2 (awful) to 2 (great).");
    str(`${p}.workaround`, raw.workaround);
    if (raw.scene === undefined) err(`${p}.scene`, "is required for scene panels.", `One of: ${ids(SCENES).join(", ")}`);
    else if (!(typeof raw.scene === "string" && customMarks[raw.scene])) {
      const sceneIds = [...ids(SCENES), ...Object.keys(customMarks)];
      if (typeof raw.scene !== "string" || !sceneIds.includes(raw.scene)) {
        const s = typeof raw.scene === "string" ? suggest(raw.scene, sceneIds) : undefined;
        err(`${p}.scene`, `"${String(raw.scene)}" is not a scene.`, s ? `Did you mean "${s}"? Or draw it yourself: add it to the board's "scenes" (see custom-scenes.md).` : `Built-in: ${ids(SCENES).slice(0, 8).join(", ")}, … Or draw your own in the board's "scenes" (see custom-scenes.md).`);
      }
    }
    oneOf(`${p}.shot`, raw.shot, SHOTS, "shot");
    if (typeof raw.shot === "string") shots.add(raw.shot);
    else shots.add("wide");
    str(`${p}.caption`, raw.caption);
    const marks = SCENE_MARKS[raw.scene as string] ?? customMarks[raw.scene as string];
    const checkMark = (path: string, v: unknown) => {
      if (!marks) return; // scene itself is wrong; that error is enough
      if (typeof v !== "string" || !marks.includes(v)) {
        const s = typeof v === "string" ? suggest(v, marks) : undefined;
        err(path, `"${String(v)}" is not a mark in the ${String(raw.scene)} scene.`, s ? `Did you mean "${s}"?` : `Marks in ${String(raw.scene)}: ${marks.join(", ")}`);
      }
    };
    const localIds = new Set<string>();
    let hasProduct = false;
    let hasAnyDevice = false;
    const withDevice = new Set<string>();

    const chars = raw.characters ?? [];
    if (!Array.isArray(chars)) err(`${p}.characters`, "must be an array.");
    else chars.forEach((c, j) => {
      const cp = `${p}.characters[${j}]`;
      if (!isObj(c)) { err(cp, "must be an object."); return; }
      known(cp, c, ["who", "id", "pose", "mood", "angle", "facing", "at", "device", "variant"]);
      if (c.variant !== undefined && (typeof c.variant !== "number" || ![1, 2, 3].includes(c.variant))) err(`${cp}.variant`, "must be 1, 2 or 3.");
      if (typeof c.who !== "string") err(`${cp}.who`, "is required: a key from cast.");
      else if (!castIds.includes(c.who)) {
        const s = suggest(c.who, castIds);
        err(`${cp}.who`, `"${c.who}" isn't in cast.`, s ? `Did you mean "${s}"? Or add it to "cast".` : `Add "${c.who}" to "cast" first.`);
      }
      localIds.add((c.id ?? c.who) as string);
      oneOf(`${cp}.pose`, c.pose, POSES, "pose");
      oneOf(`${cp}.mood`, c.mood, MOODS, "mood");
      oneOf(`${cp}.angle`, c.angle, ANGLES, "angle");
      oneOf(`${cp}.facing`, c.facing, FACING, "facing");
      if (c.at !== undefined) checkMark(`${cp}.at`, c.at);
      if (c.device !== undefined || c.pose === "holding-phone" || c.pose === "phone-to-ear") withDevice.add((c.id ?? c.who) as string);
      if (c.device !== undefined) {
        hasAnyDevice = true;
        if (!(isObj(c.device) && c.device.product === false)) hasProduct = true;
        if (typeof c.device === "string") {
          oneOf(`${cp}.device`, c.device, DEVICES, "device");
          if ((ids(DEVICES) as string[]).includes(c.device) && !(HANDHELD as readonly string[]).includes(c.device))
            err(`${cp}.device`, `A ${c.device} can't be held.`, `Only ${HANDHELD.join(", ")} go in a hand. Put it in the scene: "devices": [{ "type": "${c.device}" }] (optionally "at" a mark), and point gestures "on" it.`);
        }
        else if (isObj(c.device)) {
          known(`${cp}.device`, c.device, ["type", "screen", "product", "crop"]);
          if ((c.device as Record<string, unknown>).crop !== undefined && !isCrop((c.device as Record<string, unknown>).crop)) err(`${cp}.device.crop`, "must be [left, top, right, bottom], fractions from 0 to 1.", "e.g. [0, 0.1, 1, 0.6]");
          oneOf(`${cp}.device.type`, c.device.type, DEVICES, "device");
          if (typeof c.device.type === "string" && !(HANDHELD as readonly string[]).includes(c.device.type))
            err(`${cp}.device`, `A ${c.device.type} can't be held.`, `Only ${HANDHELD.join(", ")} go in a hand. Put it in the scene: "devices": [{ "type": "${c.device.type}" }] (optionally "at" a mark), and point gestures "on" it.`);
          str(`${cp}.device.screen`, c.device.screen);
        } else err(`${cp}.device`, "must be a device name or { type, screen }.");
      }
    });

    const devs = raw.devices ?? [];
    if (!Array.isArray(devs)) err(`${p}.devices`, "must be an array.");
    else devs.forEach((d, j) => {
      const dp = `${p}.devices[${j}]`;
      if (!isObj(d)) { err(dp, "must be an object."); return; }
      known(dp, d, ["id", "type", "at", "screen", "product", "tilt", "crop"]);
      if (d.crop !== undefined && !isCrop(d.crop)) err(`${dp}.crop`, "must be [left, top, right, bottom], fractions from 0 to 1.", "e.g. [0, 0.1, 1, 0.6]");
      oneOf(`${dp}.tilt`, d.tilt, ["left", "right"], "tilt");
      oneOf(`${dp}.type`, d.type, DEVICES, "device");
      if (d.type === undefined) err(`${dp}.type`, "is required.");
      if (d.at !== undefined) checkMark(`${dp}.at`, d.at);
      localIds.add((d.id ?? d.type) as string);
      withDevice.add((d.id ?? d.type) as string);
      hasAnyDevice = true;
      if (d.product !== false) hasProduct = true;
    });

    const bubbles = raw.bubbles ?? [];
    if (!Array.isArray(bubbles)) err(`${p}.bubbles`, "must be an array.");
    else bubbles.forEach((bb, j) => {
      const bp = `${p}.bubbles[${j}]`;
      if (!isObj(bb)) { err(bp, "must be an object."); return; }
      known(bp, bb, ["id", "type", "from", "text"]);
      oneOf(`${bp}.type`, bb.type, BUBBLES, "bubble");
      if (bb.type === undefined) err(`${bp}.type`, "is required.", `One of: ${ids(BUBBLES).join(", ")}`);
      if (bb.type === "thought") thoughtCount++;
      str(`${bp}.text`, bb.text, true);
      if (typeof bb.text === "string" && bb.text.length > 90) warn(`${bp}.text`, "Long bubble text gets cramped.", "Keep bubbles under ~12 words; move detail to notes.");
      if (bb.from !== undefined && !localIds.has(bb.from as string)) {
        const s = suggest(String(bb.from), [...localIds]);
        err(`${bp}.from`, `"${String(bb.from)}" isn't in this panel.`, s ? `Did you mean "${s}"?` : "Use the id of a character or device in this panel.");
      }
    });

    const gestures = raw.gestures ?? [];
    if (!Array.isArray(gestures)) err(`${p}.gestures`, "must be an array.");
    else gestures.forEach((g, j) => {
      const gp = `${p}.gestures[${j}]`;
      if (!isObj(g)) { err(gp, "must be an object."); return; }
      known(gp, g, ["id", "type", "on", "at", "direction", "angle"]);
      if (g.angle !== undefined && (typeof g.angle !== "number" || !isFinite(g.angle))) err(`${gp}.angle`, "must be a number of degrees (0 = right, 90 = down).");
      oneOf(`${gp}.type`, g.type, GESTURES, "gesture");
      oneOf(`${gp}.direction`, g.direction, DIRECTIONS, "direction");
      if (g.on !== undefined && !localIds.has(g.on as string)) {
        const s = suggest(String(g.on), [...localIds]);
        err(`${gp}.on`, `"${String(g.on)}" isn't in this panel.`, s ? `Did you mean "${s}"?` : "Use a character id (their held device) or a device id.");
      }
      if (typeof g.on === "string" && localIds.has(g.on) && !withDevice.has(g.on))
        err(`${gp}.on`, `"${g.on}" isn't holding a device, and gestures happen on a screen.`, `Give ${g.on} a device (e.g. "device": "phone") or point "on" at a device in this panel.`);
      if (g.on === undefined && !hasAnyDevice && withDevice.size === 0)
        err(`${gp}`, "A gesture needs a screen, but this panel has no device.", "Add a device to a character or the scene.");
      if (g.at !== undefined && (!Array.isArray(g.at) || g.at.length !== 2 || g.at.some((n) => typeof n !== "number" || n < 0 || n > 1)))
        err(`${gp}.at`, "must be [x, y] with values from 0 to 1 (position on the screen).");
    });

    const callouts = raw.callouts ?? [];
    if (!Array.isArray(callouts)) err(`${p}.callouts`, "must be an array.");
    else callouts.forEach((c, j) => {
      const cp = `${p}.callouts[${j}]`;
      if (!isObj(c)) { err(cp, "must be an object."); return; }
      known(cp, c, ["id", "text", "target"]);
      str(`${cp}.text`, c.text, true);
      if (c.target !== undefined && !localIds.has(c.target as string)) err(`${cp}.target`, `"${String(c.target)}" isn't in this panel.`);
    });

    checkShapes(`${p}.shapes`, raw.shapes);

    const images = raw.images ?? [];
    if (!Array.isArray(images)) err(`${p}.images`, "must be an array.");
    else images.forEach((im, j) => {
      const ip = `${p}.images[${j}]`;
      if (!isObj(im)) { err(ip, "must be an object."); return; }
      known(ip, im, ["id", "src", "x", "y", "w", "h", "sketch", "crop", "mirror", "turn"]);
      if (im.mirror !== undefined && typeof im.mirror !== "boolean") err(`${ip}.mirror`, "must be true or false.");
      if (im.turn !== undefined && ![0, 90, 180, 270].includes(im.turn as number)) err(`${ip}.turn`, "must be 0, 90, 180 or 270 (clockwise).");
      if (im.crop !== undefined && !isCrop(im.crop)) err(`${ip}.crop`, "must be [left, top, right, bottom], fractions from 0 to 1.", "e.g. [0, 0.1, 1, 0.6]");
      str(`${ip}.src`, im.src, true);
      for (const k of ["x", "y", "w", "h"]) if (im[k] !== undefined && (typeof im[k] !== "number" || !Number.isFinite(im[k] as number))) err(`${ip}.${k}`, "must be a number in panel units (400 wide, 260 tall).");
      for (const k of ["w", "h"]) if (typeof im[k] === "number" && (im[k] as number) <= 0) err(`${ip}.${k}`, "must be greater than 0.");
      if (im.sketch !== undefined && typeof im.sketch !== "boolean") err(`${ip}.sketch`, "must be true or false.");
    });

    if (raw.focus !== undefined && !localIds.has(raw.focus as string)) {
      const s = suggest(String(raw.focus), [...localIds]);
      err(`${p}.focus`, `"${String(raw.focus)}" isn't in this panel.`, s ? `Did you mean "${s}"?` : undefined);
    }
    if ((raw.shot === "over-the-shoulder" || raw.shot === "screen" || raw.shot === "pov") && !hasAnyDevice)
      warn(`${p}.shot`, `A "${String(raw.shot)}" shot needs a device to look at.`, "Give the focus character a device, e.g. \"device\": { \"type\": \"phone\" }.");
    if (hasProduct) productMoments++;
  });

  // Service-design craft nudges: warnings, never errors.
  if (sceneCount >= 3 && productMoments === sceneCount)
    warn("$.panels", "The product appears in every scene panel.", "Real journeys have gaps. Add a moment before or after the product: the trigger, the wait, the workaround.");
  const unnamed = (b.panels as unknown[]).filter((q) => isObj(q) && (q.type === undefined || q.type === "scene") && !(typeof q.label === "string" && q.label.trim())).length;
  if (sceneCount >= 3 && unnamed > 0)
    warn("$.panels", `${unnamed} scene panel${unnamed > 1 ? "s have" : " has"} no step name.`, "Give each a short `label` (\"Checks the app\"). It names the step under the panel and on the journey chart.");
  if (sceneCount >= 3 && thoughtCount === 0)
    warn("$.panels", "No thought bubbles.", "What the person thinks but doesn't say is often the insight. Add one where they're frustrated or unsure.");
  if (sceneCount >= 4 && shots.size === 1)
    warn("$.panels", `Every panel uses the same shot (${[...shots][0]}).`, "Mix wide (context), close-up (emotion) and over-the-shoulder (the screen).");
  for (const u of findUndrawable(b)) { const h = undrawableHint(u.chars); warn(u.path, h.message, h.hint); }

  return { ok: errors.length === 0, errors, warnings };
}

export function formatResult(r: Result, file: string, panels?: number): string {
  return formatIssues(r, file, panels !== undefined ? `${panels} panels` : undefined);
}

export { DIRECTIONS };
