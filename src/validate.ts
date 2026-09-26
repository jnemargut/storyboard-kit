import {
  ACCESSORIES, AGES, ANGLES, BODY, BUBBLES, DEVICES, DIRECTIONS, FACING, GESTURES, HAIR, HAIR_SHADE, MOODS,
  OUTFITS, PANEL_TYPES, POSES, SCENES, SCENE_MARKS, SHOTS, SKIN, TIME_ICONS, ids, type Entry,
} from "./vocab";
import { SCHEMA_VERSION } from "./types";

export interface Issue {
  path: string;
  message: string;
  hint?: string;
}

export interface Result {
  ok: boolean;
  errors: Issue[];
  warnings: Issue[];
}

export function distance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

const norm = (x: string) => x.toLowerCase().replace(/[-_\s]/g, "");

export function suggest(value: string, options: readonly string[]): string | undefined {
  let best: string | undefined;
  let bestD = Infinity;
  for (const o of options) {
    const d = norm(o) === norm(value) ? 0 : o.includes(value) || value.includes(o) ? 1.5 : distance(value, o);
    if (d < bestD) { bestD = d; best = o; }
  }
  return bestD <= Math.max(2, Math.floor(value.length / 3)) ? best : undefined;
}

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
      err(path, `"${String(value)}" is not a ${what}.`, s ? `Did you mean "${s}"?` : `Run \`storyboard vocab ${what}s\` to see options: ${opts.slice(0, 8).join(", ")}${opts.length > 8 ? ", …" : ""}`);
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
  known("$", b, ["$schema", "schemaVersion", "title", "subtitle", "persona", "notes", "page", "cast", "panels"]);
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
      known(p, m, ["name", "skin", "hair", "hairShade", "body", "outfit", "age", "accessories"]);
      oneOf(`${p}.skin`, m.skin, SKIN, "skin");
      oneOf(`${p}.hair`, m.hair, HAIR, "hair");
      oneOf(`${p}.hairShade`, m.hairShade, HAIR_SHADE, "hair-shade");
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
      known("$.page", b.page, ["columns"]);
      const c = b.page.columns;
      if (c !== undefined && (typeof c !== "number" || !Number.isInteger(c) || c < 1 || c > 6)) err("$.page.columns", "must be an integer from 1 to 6.");
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
    const common = ["id", "type", "label", "notes", "layout"];

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
    known(p, raw, [...common, "scene", "shot", "focus", "characters", "devices", "bubbles", "caption", "callouts", "gestures"]);
    if (raw.scene === undefined) err(`${p}.scene`, "is required for scene panels.", `One of: ${ids(SCENES).join(", ")}`);
    oneOf(`${p}.scene`, raw.scene, SCENES, "scene");
    oneOf(`${p}.shot`, raw.shot, SHOTS, "shot");
    if (typeof raw.shot === "string") shots.add(raw.shot);
    else shots.add("wide");
    str(`${p}.caption`, raw.caption);
    const marks = SCENE_MARKS[raw.scene as string];
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
      known(cp, c, ["who", "id", "pose", "mood", "angle", "facing", "at", "device"]);
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
        if (typeof c.device === "string") oneOf(`${cp}.device`, c.device, DEVICES, "device");
        else if (isObj(c.device)) {
          known(`${cp}.device`, c.device, ["type", "screen", "product"]);
          oneOf(`${cp}.device.type`, c.device.type, DEVICES, "device");
          str(`${cp}.device.screen`, c.device.screen);
        } else err(`${cp}.device`, "must be a device name or { type, screen }.");
      }
    });

    const devs = raw.devices ?? [];
    if (!Array.isArray(devs)) err(`${p}.devices`, "must be an array.");
    else devs.forEach((d, j) => {
      const dp = `${p}.devices[${j}]`;
      if (!isObj(d)) { err(dp, "must be an object."); return; }
      known(dp, d, ["id", "type", "at", "screen", "product"]);
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
      known(gp, g, ["id", "type", "on", "at", "direction"]);
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
  if (sceneCount >= 3 && thoughtCount === 0)
    warn("$.panels", "No thought bubbles.", "What the person thinks but doesn't say is often the insight. Add one where they're frustrated or unsure.");
  if (sceneCount >= 4 && shots.size === 1)
    warn("$.panels", `Every panel uses the same shot (${[...shots][0]}).`, "Mix wide (context), close-up (emotion) and over-the-shoulder (the screen).");

  return { ok: errors.length === 0, errors, warnings };
}

export function formatResult(r: Result, file: string, panels?: number): string {
  const lines: string[] = [];
  for (const e of r.errors) lines.push(`✗ ${e.path}: ${e.message}${e.hint ? `\n    → ${e.hint}` : ""}`);
  for (const w of r.warnings) lines.push(`! ${w.path}: ${w.message}${w.hint ? `\n    → ${w.hint}` : ""}`);
  if (r.ok) lines.unshift(`✓ ${file} is valid${panels !== undefined ? ` (${panels} panels)` : ""}${r.warnings.length ? `, ${r.warnings.length} suggestion(s)` : ""}`);
  else lines.unshift(`✗ ${file}: ${r.errors.length} error(s)`);
  return lines.join("\n");
}

export { DIRECTIONS };
