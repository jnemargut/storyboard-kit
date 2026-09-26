# storyboard-cli

Low-fi, sketch-style storyboards for service designers. You describe a customer's day to your coding agent
(Claude Code, Codex, Cursor…), it drafts a storyboard, and you tweak it in a page-first editor. When you're
happy, export PNG, PDF or SVG.

Everything is drawn in a marker-comp style where **the software is the only thing in color (teal)**. A board
shows how small, how late, and how patchy your product's part in someone's day really is.

![The Late Latte: an 8-panel example storyboard](docs/late-latte.png)

## Quick start

```bash
npx storyboard-cli init --example      # AGENTS.md/CLAUDE.md block + agent skill + an example board
npx storyboard-cli dev late-latte.storyboard.json
```

Then ask your agent something like:

> Storyboard Priya, an ER nurse, getting a shift-swap request while dropping her kid at school. The app logs
> her out, so she calls a coworker instead. Show where our scheduling app helps and where it doesn't.

The agent looks up the vocabulary, writes `priya.storyboard.json`, validates it, and opens the editor.

## The editor

- **Click** anything: a panel, person, device, bubble, caption, gesture or callout. A toolbar appears with what
  you can change (shot, scene, pose, mood, angle, flip, device, bubble type, who's speaking…).
- **Drag** to move and use the corner handle to resize. Arrow keys nudge (Shift for bigger steps).
- **Double-click** text to edit it in place.
- **Drop a screen image** (PNG/JPG from Figma) onto a phone, laptop, TV or anyone holding a device. It's
  sketchified into the teal product palette and fitted to the screen, top-aligned.
- **+ Add** opens people, bubbles, captions, callouts, devices, gestures and panels (title / time passes /
  narration). Click to add to the selected panel, or drag onto any panel. **Cast** edits skin tone, hair,
  body, age, outfit and accessories (glasses, cane, wheelchair, hijab, headphones…).
- **Undo/redo** (Cmd+Z / Shift+Cmd+Z), a layout picker (panels across), and **Export** (PNG 2x/3x, PDF, SVG).

Your edits save into the same JSON file within a second, as small field-level changes, so git diffs stay
readable. When the agent edits the file, the editor reloads live and keeps your manual nudges.

## CLI

| Command | What it does |
|---|---|
| `init [dir] [--example]` | Adds the storyboard block to AGENTS.md and CLAUDE.md and installs the skill in `.agents/skills/` and `.claude/skills/` |
| `vocab [category] [--grep x] [--json]` | Scenes (with marks), shots, poses, moods, angles, devices, bubbles, gestures, cast options |
| `validate <file> [--json]` | Errors with fix-it hints ("did you mean `frustrated`?") plus storytelling suggestions |
| `dev <file> [--port] [--no-open]` | The editor, with live two-way sync to the file |
| `export <file> [--png] [--pdf] [--svg] [--scale 2] [--out dir]` | Headless export (no browser needed), so agents can attach boards to PRs |
| `script <file>` | A readable screenplay version in Markdown |
| `format <file>` | Canonical, diff-friendly formatting |
| `new <file>` | A starter board |

## The file

A storyboard is JSON that describes what happens, not where pixels go. See
[skill/references/format.md](skill/references/format.md) and the [example](examples/late-latte.storyboard.json).
Positions are automatic: characters stand on named marks in a scene (`counter`, `driver-seat`, `sofa`…), and
bubbles place themselves with tails aimed at the speaker's head. The only coordinates in the file are the
editor's sparse `layout` overrides.

**What's included:** 11 scenes · 6 shots (wide, medium, close-up, over-the-shoulder, screen, POV) · 11 poses ×
4 angles · 12 moods · 10 devices · speech, thought, shout and whisper bubbles · captions and callouts · title,
time-passes and narration cards · 9 gestures (tap, swipe, cursor, notification…) · a cast built from parts:
4 skin tones, 9 hair styles, 4 builds, 3 ages, 8 outfits and 6 accessories.

![Cast and pose gallery](docs/gallery.png)

## Development

```bash
npm install
npm run build        # CLI (esbuild) + schema.json + skill/ (generated from src/vocab.ts) + editor (Vite)
npm test             # unit tests (vitest), incl. a render matrix of every scene × shot and pose × angle × device
node tests/e2e.mjs   # drives the real editor in Chrome: select, drag, edit, agent-edit reload, upload, undo, export
```

`src/vocab.ts` is the single source of truth. The JSON Schema, the validator, `vocab`, the skill's reference
files and the renderer all read it. Don't hand-edit `schema.json` or `skill/`; run `npm run gen`.

Architecture: `src/render/` is one pure JSON → SVG renderer (React) shared by the editor and the exporter. The
editor adds an overlay for selection and handles. Export uses resvg with bundled fonts. The design decisions
behind all of this are in [.decisions/](.decisions/index.html).

Fonts: Permanent Marker (Apache 2.0), Patrick Hand, Work Sans, IBM Plex Mono (SIL OFL). Licenses are in
`assets/fonts/`.
