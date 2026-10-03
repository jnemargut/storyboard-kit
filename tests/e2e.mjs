// End-to-end smoke test of the real editor, run from the built skill: `npm run build && npm run e2e`
// Drives the dev server with system Chrome and checks that edits land in the JSON file.
import { spawn } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const dir = mkdtempSync(join(tmpdir(), "sb-e2e-"));
cpSync("examples/screens", join(dir, "screens"), { recursive: true });
const file = join(dir, "late-latte.storyboard.json");
writeFileSync(file, readFileSync("tests/fixtures/late-latte.storyboard.json", "utf8").replaceAll("../../examples/screens/", "./screens/"));
const read = () => JSON.parse(readFileSync(file, "utf8"));
const shots = process.env.SHOTS ?? ".scratch";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? "PASS" : "FAIL"} ${msg}`); if (!ok) failures++; };

const server = spawn("node", ["skills/storyboard/scripts/storyboard.mjs", "dev", file, "--no-open", "--port", "4400"], { stdio: ["ignore", "pipe", "inherit"] });
// the dev server moves to the next free port if 4400 is taken, so read the address it actually chose
const url = await new Promise((ok) => server.stdout.on("data", (d) => { const m = /http:\/\/localhost:\d+\//.exec(String(d)); if (m) ok(m[0]); }));

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 }, permissions: ["clipboard-read", "clipboard-write"] });
const page = await ctx.newPage();
try {
  await page.goto(url);
  await page.waitForSelector("svg[data-board]");
  await sleep(600);
  await page.screenshot({ path: `${shots}/e2e-1-loaded.png` });
  check(await page.locator('g[data-panel="checks-app"] image').count() > 0, "uploaded screen renders (baked) in over-the-shoulder panel");

  // drag Maya in panel 4
  const maya = page.locator('g[data-panel="in-line"] [data-el="maya"]').first();
  const b = await maya.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 - 40, b.y + b.height * 0.6, { steps: 6 });
  await page.mouse.up();
  await sleep(500);
  const ov = read().panels[3].layout?.maya;
  check(ov && ov.dx < 0, `drag writes a sparse layout override (dx=${ov?.dx})`);
  await page.screenshot({ path: `${shots}/e2e-2-selected.png` });
  check(await page.locator(".ctx").isVisible(), "contextual toolbar appears for the selected person");

  // change mood via toolbar
  await page.locator('.ctx select[title="Mood"]').selectOption("confused");
  await sleep(400);
  check(read().panels[3].characters[0].mood === "confused", "toolbar mood change saves to file");

  // inline text edit on a bubble
  const bubble = page.locator('g[data-panel="asks"] [data-el="bubble-0"]').last();
  await bubble.click();
  await bubble.dblclick();
  await page.locator("textarea.inline-edit").fill("Hi, is 214 ready? I have a train.");
  await page.keyboard.press("Enter");
  await sleep(400);
  check(read().panels[6].bubbles[0].text === "Hi, is 214 ready? I have a train.", "inline bubble edit saves to file");

  // simulated agent edit → live reload, designer's nudge kept
  const doc = read();
  doc.panels[3].bubbles[0].text = "Name for the order, please?";
  writeFileSync(file, JSON.stringify(doc, null, 2));
  await sleep(1200);
  check(((await page.locator('g[data-panel="in-line"]').textContent()) ?? "").includes("please?"), "agent edit to the file reloads live in the editor");
  check(read().panels[3].layout?.maya?.dx === ov.dx, "designer's nudge survives the agent edit");

  // add a person from the drawer to the selected panel
  await page.locator('g[data-panel="walking"] rect[data-el="__panel"]').click({ position: { x: 12, y: 12 }, force: true });
  await page.getByRole("button", { name: "+ Add" }).click();
  await page.locator(".tile", { hasText: "Leo" }).click();
  await sleep(400);
  check(read().panels[2].characters.some((c) => c.who === "leo"), "drawer adds a cast member to the selected panel");

  // upload a screen onto Maya's phone in the walking panel
  await page.locator('g[data-panel="walking"] [data-el="maya"]').first().click();
  await page.locator('.ctx input[type="file"]').setInputFiles("examples/screens/order-status.png");
  await sleep(1200);
  const dev = read().panels[2].characters[0].device;
  check(typeof dev === "object" && dev.screen?.startsWith("./screens/"), `upload puts the screen on the held phone (${JSON.stringify(dev)})`);

  // undo the upload
  await page.keyboard.press("Meta+z");
  await sleep(600);
  check(read().panels[2].characters[0].device === "phone", "undo reverts the file");

  // board-wide text size
  await page.getByRole("button", { name: "Larger text" }).click();
  await sleep(400);
  check(read().page?.textScale === 1.1, `text size control writes page.textScale (${read().page?.textScale})`);

  // edit the board title (header outside the panels)
  await page.locator('[data-header="title"]').dblclick();
  await page.locator("textarea.inline-edit").fill("The Very Late Latte");
  await page.keyboard.press("Enter");
  await sleep(400);
  check(read().title === "The Very Late Latte", "board title is editable in place");

  // held phone is its own selectable thing: move it, then put it down
  const phone = page.locator('g[data-panel="in-line"] [data-el="maya.device"]');
  const pb = await phone.boundingBox();
  await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
  await page.mouse.down();
  await page.mouse.move(pb.x + pb.width / 2 + 25, pb.y + pb.height / 2, { steps: 5 });
  await page.mouse.up();
  await sleep(400);
  check((read().panels[3].layout?.["maya.device"]?.dx ?? 0) > 0, "held phone can be moved on its own");
  await page.getByRole("button", { name: "Put down" }).click();
  await sleep(400);
  const p4 = read().panels[3];
  check(!p4.characters[0].device && p4.devices?.[0]?.type === "phone", "Put down moves the phone from her hand into the scene");

  // journey lanes + feeling
  await page.getByRole("button", { name: "Journey lanes" }).click();
  await sleep(400);
  check(read().page?.lanes === true && (await page.locator("[data-journey]").count()) === 1, "Journey lanes toggle shows lanes and the journey summary");
  await page.locator('[data-lane="asks"] [data-lane-feel="-2"]').click();
  await sleep(400);
  check(read().panels[6].feeling === -2, "clicking a dot in the lane sets the feeling");
  await page.locator('[data-lane-workaround="asks"]').click();
  await page.locator("textarea.inline-edit").fill("asks the barista");
  await page.keyboard.press("Enter");
  await sleep(400);
  check(read().panels[6].workaround === "asks the barista", "clicking the lane's workaround note edits it inline");

  // poses tab: select a person, click a pose
  { const m = page.locator('g[data-panel="commute"] [data-el="maya"]').first(); const mb = await m.boundingBox(); await page.mouse.click(mb.x + mb.width / 2, mb.y + mb.height * 0.12); }
  await page.getByRole("button", { name: "Poses" }).click();
  await page.locator(".tile", { hasText: "phone-to-ear" }).click();
  await sleep(400);
  check(read().panels[7].characters[0].pose === "phone-to-ear", "Poses tab applies a pose to the selected person");

  // ask agent copies a precise pointer
  await page.getByRole("button", { name: "Ask agent" }).click();
  await sleep(200);
  const ref = await page.evaluate(() => navigator.clipboard.readText());
  check(ref.includes('panel 8 (id "commute"') && ref.includes("maya"), `Ask agent copies a pointer (${ref.slice(0, 60)}…)`);

  // copy + paste a panel (clipboard events)
  await page.locator('g[data-panel="later"] rect[data-el="__panel"]').click({ position: { x: 12, y: 12 }, force: true });
  const n0 = read().panels.length;
  await page.evaluate(() => {
    const dt = new DataTransfer();
    document.dispatchEvent(new ClipboardEvent("copy", { clipboardData: dt, bubbles: true }));
    document.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true }));
  });
  // copying a panel also renders its PNG on the server, which can hold up the save for a moment
  for (let t = 0; t < 40 && read().panels.length === n0; t++) await sleep(150);
  check(read().panels.length === n0 + 1 && read().panels[6].id === "later-2", "copy/paste duplicates a panel with a fresh id");

  // copying a panel puts a real PNG on the system clipboard (for Figma, Slack…) plus the storyboard clip
  await page.locator('g[data-panel="walking"] rect[data-el="__panel"]').click({ position: { x: 12, y: 12 }, force: true });
  await page.keyboard.press("Meta+c");
  for (let t = 0; t < 40; t++) {
    if ((await page.evaluate(async () => (await navigator.clipboard.read()).flatMap((i) => i.types))).includes("image/png")) break;
    await sleep(150);
  }
  const clipInfo = await page.evaluate(async () => {
    const items = await navigator.clipboard.read();
    const types = items.flatMap((i) => i.types);
    const png = items.find((i) => i.types.includes("image/png"));
    const blob = png ? await png.getType("image/png") : null;
    const head = blob ? Array.from(new Uint8Array(await blob.slice(0, 4).arrayBuffer())) : [];
    return { types, size: blob?.size ?? 0, isPng: head.join(",") === "137,80,78,71" };
  });
  check(clipInfo.isPng && clipInfo.size > 5000 && clipInfo.types.includes("web application/x-storyboard"), `copied panel is a PNG image on the clipboard, with the storyboard clip alongside (${clipInfo.types.join(", ")})`);
  // pasting that image back into the editor makes an editable panel, not a picture
  const n1 = read().panels.length;
  await page.evaluate(async () => {
    const item = (await navigator.clipboard.read()).find((i) => i.types.includes("image/png"));
    const blob = await item.getType("image/png");
    const dt = new DataTransfer();
    dt.items.add(new File([blob], "image.png", { type: "image/png" }));
    document.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true }));
  });
  for (let t = 0; t < 40 && read().panels.length === n1; t++) await sleep(150);
  const afterPaste = read();
  const pasted = afterPaste.panels.find((p) => p.id.startsWith("walking-"));
  check(afterPaste.panels.length === n1 + 1 && pasted && !(pasted.images ?? []).length, "pasting a copied panel back in makes a real panel, not an image");
  await page.mouse.click(5, 990);
  await page.keyboard.press("Meta+z"); // take the pasted panel back out so later checks see the original layout
  for (let t = 0; t < 40 && read().panels.length !== n1; t++) await sleep(150);
  await page.locator('g[data-panel="later-2"] rect[data-el="__panel"]').click({ position: { x: 12, y: 12 }, force: true });

  // zoom to panel
  await page.getByRole("button", { name: "Zoom to panel" }).click();
  await sleep(300);
  check((await page.getByRole("button", { name: /^Zoom: \d+%/ }).count()) === 1, "Zoom to panel zooms the editor");
  await page.screenshot({ path: `${shots}/e2e-4-zoomed.png` });
  await page.getByRole("button", { name: /^Zoom:/ }).click();
  await page.getByRole("button", { name: "Fit to window" }).click();

  // Delete key removes the selection (and undo brings it back)
  await page.locator('g[data-panel="walking"] [data-el="bubble-0"]').last().click();
  await page.keyboard.press("Delete");
  await sleep(400);
  check(!(read().panels[2].bubbles ?? []).length, "Delete key removes the selected bubble");
  await page.keyboard.press("Meta+z");
  await sleep(500);
  check((read().panels[2].bubbles ?? []).length === 1, "undo restores it");

  // callout pointer: drag the dot somewhere else
  const dot = page.locator('g[data-panel="commute"] [data-el="callout-0.point"]');
  await dot.scrollIntoViewIfNeeded();
  const db = await dot.boundingBox();
  await page.mouse.move(db.x + db.width / 2, db.y + db.height / 2);
  await page.mouse.down();
  await page.mouse.move(db.x + db.width / 2 - 30, db.y + db.height / 2 + 10, { steps: 5 });
  await page.mouse.up();
  await sleep(400);
  check((read().panels.find((p) => p.id === "commute").layout?.["callout-0.point"]?.dx ?? 0) < 0, "callout pointer dot drags freely");

  // a person's look, right from their toolbar
  { const m = page.locator('g[data-panel="in-line"] [data-el="sam"]').first(); const mb = await m.boundingBox(); await page.mouse.click(mb.x + mb.width / 2, mb.y + mb.height * 0.12); }
  await page.getByRole("button", { name: "Look…" }).click();
  await page.locator(".ctx-look select").nth(1).selectOption("bun");
  await sleep(400);
  check(read().cast.sam.hair === "bun", "Look… edits the person everywhere");

  // naming a step: clicking an unnamed panel's label goes straight to typing
  await page.mouse.click(5, 990);
  const lab = page.locator('[data-label="title"]');
  await lab.scrollIntoViewIfNeeded();
  await lab.click();
  await page.locator("textarea.inline-edit").waitFor();
  await page.locator("textarea.inline-edit").fill("Meet Maya");
  await page.keyboard.press("Enter");
  await sleep(400);
  check(read().panels[0].label === "Meet Maya", "clicking an unnamed step lets you name it");

  await page.mouse.click(5, 990);

  // Draw tab: drag a box onto a scene panel
  await page.locator(".tabs button", { hasText: "Draw" }).click();
  await page.getByRole("button", { name: /^Box/ }).click();
  const pr = page.locator('g[data-panel="in-line"] > rect[data-el="__panel"]');
  await pr.scrollIntoViewIfNeeded();
  const drawBox = await pr.boundingBox();
  await page.mouse.move(drawBox.x + drawBox.width * 0.05, drawBox.y + drawBox.height * 0.1);
  await page.mouse.down();
  await page.mouse.move(drawBox.x + drawBox.width * 0.2, drawBox.y + drawBox.height * 0.3, { steps: 5 });
  await page.mouse.up();
  await sleep(500);
  const shp = read().panels[3].shapes ?? [];
  check(shp.length === 1 && shp[0].type === "rect" && shp[0].points[1][0] > shp[0].points[0][0], "Draw tab: dragging draws a box into the panel");
  await page.locator(".drawer-body input[type=file]").setInputFiles("examples/screens/order-status.png");
  await sleep(1200);
  const pics = read().panels[3].images ?? [];
  check(pics.length === 1 && pics[0].src.startsWith("./images/") && pics[0].sketch === undefined, "Picture… adds a sketchified image to the selected panel");
  check(await page.locator('g[data-panel="in-line"] [data-kind="image"] image').count() === 1, "the picture renders in the editor");
  // free text: pick Text, click a panel, type
  await page.locator(".tabs button", { hasText: "Draw" }).click();
  await page.getByRole("button", { name: /^Text/ }).click();
  await page.mouse.click(drawBox.x + drawBox.width * 0.5, drawBox.y + drawBox.height * 0.12);
  await page.locator("textarea.inline-edit").waitFor();
  await page.keyboard.type("Queue: 9 people");
  await page.keyboard.press("Enter");
  await sleep(400);
  const txt = (read().panels[3].shapes ?? []).find((s) => s.type === "text");
  check(txt?.text === "Queue: 9 people" && txt.points.length === 1, "Text tool: click a panel and type free text");
  await page.getByRole("button", { name: "Close" }).click();

  // arrange, rotate and duplicate the selected person with the keyboard / handle
  const maya2 = page.locator('g[data-panel="in-line"] [data-el="maya"]').first();
  const mb = await maya2.boundingBox();
  await page.mouse.click(mb.x + mb.width / 2, mb.y + mb.height * 0.55);
  await page.keyboard.press("Meta+Shift+BracketRight");
  await sleep(400);
  check((read().panels[3].layout?.maya?.z ?? 0) > 200, "Cmd+Shift+] brings the person in front of the drawn box");
  const rh = await page.locator(".rot-handle").boundingBox();
  await page.mouse.move(rh.x + 6, rh.y + 6);
  await page.mouse.down();
  await page.mouse.move(rh.x + 6, rh.y + 60, { steps: 6 });
  await page.mouse.up();
  await sleep(400);
  check(Math.abs(read().panels[3].layout?.maya?.rotate ?? 0) > 5, `rotate handle rotates (rotate=${read().panels[3].layout?.maya?.rotate})`);
  const nChars = read().panels[3].characters.length;
  await page.keyboard.press("Meta+d");
  await sleep(400);
  check(read().panels[3].characters.length === nChars + 1, "Cmd+D duplicates the person");

  // the same checklist for a selected drawing in every kit (Wireframe and Flowchart run it too):
  // any hex color, line thickness, duplicate, layer, cut and paste, undo and redo, delete
  {
    const HEX = "#7a3cb5";
    const mine = () => (read().panels[3].shapes ?? []).filter((s) => s.type === "rect" && s.color === HEX);
    // Storyboard layers by layout z, the other kits by list order
    const order = () => JSON.stringify([read().panels[3].shapes, read().panels[3].layout]);
    const until = async (fn, ms = 5000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await fn()) return true; } catch { /* mid-save */ } await sleep(80); } return false; };
    await page.keyboard.press("Escape");
    await page.locator(".tabs button", { hasText: "Draw" }).click();
    // Storyboard's Draw tab shows the colors and thicknesses in a row instead of a pop-up
    await page.locator(".drawer-body .swatch-row").getByRole("button", { name: /any color/i }).click();
    await page.getByLabel("Hex color").fill(HEX);
    await page.getByLabel("Hex color").press("Enter");
    await page.getByRole("button", { name: "thick line", exact: true }).click();
    await page.keyboard.press("r");
    const pb = await page.locator('g[data-panel="in-line"] > rect[data-el="__panel"]').boundingBox();
    await page.mouse.move(pb.x + pb.width * 0.6, pb.y + pb.height * 0.1); await page.mouse.down();
    await page.mouse.move(pb.x + pb.width * 0.8, pb.y + pb.height * 0.3, { steps: 5 }); await page.mouse.up();
    check(await until(() => mine().length === 1 && mine()[0].weight === "thick"), `checklist: a box drawn in any hex color with a thick line ${JSON.stringify(read().panels[3].shapes)}`);
    await page.keyboard.press("v");
    await page.keyboard.press("Meta+d");
    check(await until(() => mine().length === 2), "checklist: Cmd+D duplicates the drawing");
    const before = order();
    await page.keyboard.press("Meta+Shift+BracketLeft");
    check(await until(() => order() !== before), "checklist: Cmd+Shift+[ sends it to the back");
    const cutShape = (read().panels[3].shapes ?? []).filter((x) => x.type === "rect" && x.color === HEX)[0];
    await page.keyboard.press("Meta+x");
    check(await until(() => mine().length === 1), "checklist: Cmd+X cuts it");
    await page.mouse.move(pb.x + pb.width * 0.5, pb.y + pb.height * 0.5);
    await page.keyboard.press("Meta+v");
    // this rides the real system clipboard, which anything else on the Mac can touch: one retry
    if (!(await until(() => mine().length === 2, 5000)) && mine().length === 1) {
      await page.evaluate((item) => navigator.clipboard.writeText(JSON.stringify({ storyboardClip: 1, kind: "shape", item })), cutShape);
      await page.keyboard.press("Meta+v");
    }
    check(await until(() => mine().length === 2), "checklist: Cmd+V pastes it back as a drawing");
    await page.keyboard.press("Meta+z");
    check(await until(() => mine().length === 1), "checklist: undo");
    await page.keyboard.press("Meta+Shift+z");
    check(await until(() => mine().length === 2), "checklist: redo");
    await page.keyboard.press("Delete");
    check(await until(() => mine().length === 1), "checklist: Delete removes it");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Close" }).click().catch(() => {});
  }

  // play mode: step through with the keyboard, notes, and back out to the same panel
  await page.mouse.click(5, 990);
  await page.getByRole("button", { name: "▶ Play" }).click();
  await page.locator(".present").waitFor();
  check((await page.locator(".present-count").textContent()) === `1 / ${read().panels.length}`, "Play starts at step 1");
  check((await page.evaluate(() => getComputedStyle(document.querySelector(".present")).cursor)).startsWith("url("), "play mode uses the big pointer");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  check((await page.locator(".present-count").textContent()).startsWith("3 /"), "arrow keys step through the board");
  check((await page.locator(".present-name").textContent()) === read().panels[2].label, "each step shows its name");
  const before = JSON.stringify(read());
  await page.keyboard.press("n");
  check(await page.locator(".present-notes").isVisible(), "N shows speaker notes");
  await sleep(500);
  await page.screenshot({ path: `${shots}/e2e-5-play.png` });
  await page.keyboard.press("Escape");
  await sleep(300);
  check(!(await page.locator(".present").count()) && JSON.stringify(read()) === before, "Esc leaves play mode without changing the file");
  // the sharpie: draw over a step, it saves, survives leaving play mode, and can be erased or cleared
  await page.getByRole("button", { name: "▶ Play" }).click();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("d");
  const slide = await page.locator(".present-panel").boundingBox();
  const sx = slide.x + slide.width * 0.3, sy = slide.y + slide.height * 0.4;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let k = 1; k <= 8; k++) await page.mouse.move(sx + k * 25, sy + Math.sin(k) * 20);
  await page.mouse.up();
  await sleep(400);
  check((read().panels[1].markup ?? []).length === 1, "sharpie strokes save to the step");
  await page.keyboard.press("Escape"); // puts the pen down
  await page.keyboard.press("Escape"); // leaves play mode
  await sleep(300);
  check((read().panels[1].markup ?? []).length === 1 && (await page.locator('[data-markup]').count()) === 0, "markup is kept in the file but hidden outside play mode");
  await page.getByRole("button", { name: "▶ Play" }).click();
  await page.keyboard.press("ArrowRight");
  check((await page.locator(".present [data-markup]").count()) > 0, "markup shows again in play mode");
  // speaker notes are editable, and typing doesn't trigger shortcuts
  await page.keyboard.press("n");
  await page.locator(".present-notes textarea").fill("Pause here: ask the room when they last trusted an ETA");
  await page.locator(".present-count").click();
  await sleep(400);
  check(read().panels[1].notes === "Pause here: ask the room when they last trusted an ETA" && (await page.locator(".present-count").textContent()).startsWith("2 /"), "speaker notes edit and save from play mode");
  await page.keyboard.press("n");
  await page.keyboard.press("e");
  await page.mouse.move(sx + 25, sy + 17);
  await page.mouse.down();
  await page.mouse.move(sx + 100, sy + 15, { steps: 8 });
  await page.mouse.up();
  await sleep(400);
  check(!(read().panels[1].markup ?? []).length, "the eraser removes a stroke");
  await page.keyboard.press("d");
  await page.mouse.move(sx, sy); await page.mouse.down(); await page.mouse.move(sx + 80, sy + 30, { steps: 5 }); await page.mouse.up();
  await sleep(300);
  await page.getByRole("button", { name: "Clear step" }).click();
  await sleep(300);
  check(!(read().panels[1].markup ?? []).length, "Clear step removes this step's markup");
  await page.keyboard.press("Escape"); await page.keyboard.press("Escape");

  const lastPanel = page.locator(`g[data-panel="${read().panels.at(-1).id}"] > rect[data-el="__panel"]`);
  await lastPanel.scrollIntoViewIfNeeded();
  const lb = await lastPanel.boundingBox();
  await page.mouse.click(lb.x + 6, lb.y + lb.height * 0.3);
  await page.getByRole("button", { name: "▶ From here" }).click();
  check((await page.locator(".present-count").textContent()) === `${read().panels.length} / ${read().panels.length}`, "Play from here starts at the selected panel");
  await page.keyboard.press("Escape");

  await page.mouse.click(5, 990);
  await page.screenshot({ path: `${shots}/e2e-3-after.png` });

  // turn a panel's drawings into a reusable scene
  await page.mouse.click(5, 990);
  const ip = page.locator('g[data-panel="in-line"] > rect[data-el="__panel"]');
  await ip.scrollIntoViewIfNeeded();
  const ib = await ip.boundingBox();
  await page.mouse.click(ib.x + 4, ib.y + ib.height - 4);
  await page.getByRole("button", { name: "More" }).first().click();
  page.once("dialog", (d) => d.accept("Busy counter"));
  await page.getByRole("button", { name: "Save as scene…" }).click();
  await sleep(500);
  const bs = read();
  check(bs.scenes?.["busy-counter"]?.shapes?.length > 0 && bs.panels[3].scene === "busy-counter" && !bs.panels[3].shapes, "Save as scene turns a panel's drawings into a reusable scene");
  check((await page.locator('g[data-panel="in-line"] [data-kind="character"]').count()) > 0, "the panel still renders with its people on the new scene");

  const res = await page.request.get(`${url}api/export?format=png&scale=1`);
  check(res.ok() && (await res.body()).length > 10000, "export endpoint returns a PNG");
  const bad = await page.request.patch(`${url}api/board`, { data: { ops: [] } });
  check(bad.status() === 403, "write without the x-storyboard header is refused");
} finally {
  await browser.close();
  server.kill();
}
console.log(failures ? `\n${failures} check(s) failed` : "\nall e2e checks passed");
process.exit(failures ? 1 : 0);
