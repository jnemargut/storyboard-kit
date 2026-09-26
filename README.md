# storyboardkit

An agent skill for low-fi, sketch-style service-design storyboards. You describe a customer's day to your
coding agent (Claude Code, Codex…) in plain words. The skill has it draft the storyboard, and you tweak it in a
page-first editor. When you're happy, export images, a slide deck, or a share page people can comment on.

Everything is drawn in a marker-comp style where **the software is the only thing in color (teal)**. A board
shows how small, how late, and how patchy your product's part in someone's day really is. The header says it
outright: *"Product in 3 of 8 moments."*

![The Late Latte: an 8-panel example storyboard](docs/late-latte.png)

## Install

The skill is one self-contained folder, [`skills/storyboard/`](skills/storyboard). It needs Node.js 18+ and
nothing else: no npm install, no native binaries.

**Claude Code** (all your projects):

```bash
git clone <this repo> storyboardkit
node storyboardkit/skills/storyboard/scripts/storyboard.mjs install          # → ~/.claude/skills/storyboard
```

- **Codex:** add `--codex` (also copies to `~/.codex/skills/storyboard`).
- **One project only:** run `install --project` inside it. That installs to `.claude/skills/` and
  `.agents/skills/`, and adds a pointer to `AGENTS.md` for agents that don't load skills on their own.
- **By hand:** copy the `skills/storyboard` folder into your agent's skills folder.

Restart your agent after installing.

## Use it

Just ask your agent:

> Storyboard Priya, an ER nurse, getting a shift-swap request while dropping her kid at school. The app logs
> her out, so she calls a coworker instead. Show where our scheduling app helps and where it doesn't.

The agent looks up the vocabulary, writes `priya.storyboard.json`, validates and critiques it, then opens the
editor. Keep going in plain words: *"make it messier"*, *"run a critique and fix what it finds"*, *"turn on
journey lanes"*, *"export slides for my crit"*.

## The service-design layer

- **Teal means the product, and nothing else.** Personal calls, texts and other companies' apps are grey.
- **Journey lanes** (top bar) put a strip under every panel: how the person *feels* (−2…2), whether the product
  is there, and their *workaround*. A feeling line runs across the bottom of the page.
- **Critique** is a reality check. It flags happy paths: the story starts inside the app, the product is in
  every moment, there's no workaround, the feeling line is flat, or the story ends on a screen.

## The editor

- **Click** anything to get its toolbar. The main controls come first, and the rest are under **More**.
  **Ask agent** copies a precise pointer ("panel 5, the bubble `bubble-0`…") to paste into your agent.
- **Drag** to move and use the corner handle to resize, including text. Drag an already selected panel's
  background to pan its camera. **Text** A-/A+ sizes all text, and **Zoom** or **Zoom to panel** helps with detail.
- **Double-click** any text to edit it, including the title, the persona line and panel labels.
- **Devices:** phones, tablets, laptops and watches can be held. Click the device itself to move it, switch it
  between *Our product* and *Personal*, or **Put down** into the scene. Kiosks, car displays and TVs stand in
  the scene.
- **Drop a screen image** (PNG/JPG from Figma) onto a device. It's sketchified into teal and fitted.
- **+ Add:** people, poses, bubbles, captions, callouts, devices, gestures, and scene thumbnails. **Cast**
  edits skin tone, hair, body, age, outfit and accessories.
- **Copy/paste** (Cmd+C / Cmd+V) panels, people, bubbles and devices, including between boards.
- **Brand** puts your company name or logo on shop signs, in grey.
- **Export:** PNG, PDF, SVG, **slides** (PPTX, one panel per slide with speaker notes), and a **share page**
  (one HTML file with a comment box per panel).

Your edits save into the same JSON file within a second, and the agent's edits reload live without losing yours.

## The engine (for agents, or for running it yourself)

`sb` = `node <skill folder>/scripts/storyboard.mjs`

| Command | What it does |
|---|---|
| `sb vocab [category] [--grep x]` | Scenes (with marks), shots, poses, moods, devices, bubbles, gestures, cast options |
| `sb validate <file>` | Errors with fix-it hints ("did you mean `frustrated`?") plus storytelling suggestions |
| `sb critique <file>` | The service-design reality check, with a revision request for the agent |
| `sb dev [file]` | The editor, with live two-way sync (no file = the last one) |
| `sb export <file> [--png] [--pdf] [--svg] [--pptx] [--html] [--scale 2]` | Headless export |
| `sb draft "<what happens>"` | Hand a brief to your installed Claude Code / Codex CLI, then open the editor |
| `sb init [--example]` · `sb script <file>` · `sb format <file>` · `sb install` | Starter boards, a screenplay view, canonical formatting, installing |

**What's included:** 23 scenes · 6 shots (wide, medium, close-up, over-the-shoulder, screen, POV) · 11 poses ×
4 angles × 3 variations · 12 moods · 10 devices · 4 bubble types · captions and callouts · title, time-passes and
narration cards · 9 gestures · a cast built from parts: 4 skin tones, 9 hair styles, 4 builds, 3 ages,
8 outfits and 7 accessories.

![Cast and pose gallery](docs/gallery.png)

## Developing

```bash
npm install
npm run build        # → skills/storyboard/ (bundled engine, WebAssembly renderer, editor, generated docs)
npm test             # unit tests, incl. a render matrix of every scene × shot and pose × angle × device
npm run e2e          # drives the real editor in Chrome from the built skill
```

`src/vocab.ts` is the single source of truth: the schema, the validator, `vocab`, the skill's reference files
and the renderer all read it. `skills/storyboard/` is generated, so edit `src/` and rebuild. It's committed so
the repo can be installed straight from a clone. The design decisions are in [.decisions/](.decisions/index.html).

MIT licensed. Fonts: Permanent Marker (Apache 2.0), Patrick Hand, Work Sans, IBM Plex Mono (SIL OFL).
