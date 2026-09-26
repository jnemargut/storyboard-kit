// End-to-end smoke test of the real editor: `npm run build && node tests/e2e.mjs`
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

const server = spawn("node", ["dist/cli.js", "dev", file, "--no-open", "--port", "4400"], { stdio: ["ignore", "pipe", "inherit"] });
await new Promise((ok) => server.stdout.on("data", (d) => String(d).includes("localhost") && ok()));
const url = "http://localhost:4400/";

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
  await page.locator('[data-lane="asks"]').click();
  await page.locator('.ctx select[aria-label^="How they feel"]').selectOption("-2");
  await sleep(400);
  check(read().panels[6].feeling === -2, "feeling is editable from the panel toolbar");

  // poses tab: select a person, click a pose
  await page.locator('g[data-panel="commute"] [data-el="maya"]').first().click();
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
  await sleep(500);
  check(read().panels.length === n0 + 1 && read().panels[6].id === "later-2", "copy/paste duplicates a panel with a fresh id");

  // zoom to panel
  await page.getByRole("button", { name: "Zoom to panel" }).click();
  await sleep(300);
  check((await page.getByRole("button", { name: /^Zoom: \d+%/ }).count()) === 1, "Zoom to panel zooms the editor");
  await page.screenshot({ path: `${shots}/e2e-4-zoomed.png` });
  await page.getByRole("button", { name: /^Zoom:/ }).click();
  await page.getByRole("button", { name: "Fit to window" }).click();

  await page.mouse.click(5, 990);
  await page.screenshot({ path: `${shots}/e2e-3-after.png` });

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
