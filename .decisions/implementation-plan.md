# Implementation Plan: Storyboarding Tool

## What We're Building
A CLI-first, open-source storyboarding tool for UX and service designers. A designer describes a customer's real-life journey in prose to their coding agent (Claude Code, Codex, Cursor…). The agent writes a validated storyboard file and opens a local, page-first editor. Boards are drawn in a low-fi **Marker Comp** style where **the software is the only thing in color**, so the team can see where the product actually shows up in someone's day. Designers tweak anything, the agent keeps iterating on the same file, and boards export to PNG, PDF or SVG.

**See it: [.decisions/preview.html](preview.html).** The Living Preview is the visual spec.

## Build Status: v0.1 (2026-09-25)

**Built and verified:** typecheck clean · 21 unit tests (including a render matrix of every scene × shot and pose × angle × device) · 12-step end-to-end editor test in Chrome · a cold agent eval.

- **CLI** (`storyboard-cli`): `init`, `vocab` (with global `--grep`), `validate` (fix-it hints plus service-design nudges), `dev`, `export` (PNG/PDF/SVG via resvg, no browser), `script`, `format`, `new`.
- **Renderer**: one JSON → SVG React renderer shared by the editor and export. 13 scenes with layered drawing and named marks · 6 shots, including composed over-the-shoulder, screen and POV · 11 poses × 4 angles on a 2D rig · 12 moods · a cast built from parts (4 skin tones, 9 hair styles, 4 builds, 3 ages, 8 outfits, 7 accessories including wheelchair, cane, hijab and backpack) · 10 devices with screen rectangles · 4 bubble types with tails aimed at the head · captions, callouts, title, time and narration cards · 9 gestures.
- **Editor**: page-first. Click to select, contextual toolbar, drag and resize, inline text editing, "+ Add" drawer (click or drag-and-drop), cast editor, drop-to-upload screens (teal duotone bake), undo/redo, layout picker, export menu, live two-way sync.
- **Agent layer**: an AGENTS.md/CLAUDE.md block plus a portable SKILL.md with vocabulary, format, example and schema, all generated from `src/vocab.ts`.

**Deviations from this plan (and why):**
- **Single npm package, not a pnpm monorepo:** pnpm wasn't available, and one package is simpler to `npx`.
- **Screens are baked with resvg on the dev server, not a browser canvas:** same filter and same pixels, and it also works for screens an agent references by path.
- **Perspective:** v1 fits screens to axis-aligned or rotated devices. True four-corner homography warp for angled screens isn't built yet.
- **Rig assets:** the character parts are drawn procedurally in code (hand-tuned paths on the rig), not from a commissioned illustration kit. This is the tripwire to watch (pre-mortem #1).
- **Added from the agent eval:** a `product: false` flag for devices (personal calls and texts render grey, not teal), implied phones for phone poses, gesture-needs-a-screen validation, hospital and school scenes, and a backpack accessory.

**Agent eval** (a fresh agent using only the installed docs, with the prompt "Priya, ER nurse, shift-swap during school drop-off"): a valid 10-panel board in 2 validate runs, with a strong service-design arc (the app helps in panels 3–4, then workarounds). Its doc and rendering complaints were all fixed and regression-tested.

**Next up:** homography for angled screens · a richer hand-drawn part kit (more hair and outfits, hands) · a multi-agent eval (Codex, Cursor) · a small MCP endpoint on the dev server if live "change panel 3" edits are wanted · npm publish.

## Decisions Made
| # | Decision | Choice | Confidence | Reversibility |
|---|---|---|---|---|
| 1 | Storyboard file format | Story-first JSON + JSON Schema, sparse `layout` overrides | Strong pick | 🚪 One-way |
| 2 | Art style | Marker Comp: fineliner + 3 cool greys, **product = teal only** | Lean | 🔁 Two-way |
| 3 | Characters, scenes, devices | Modular hand-drawn parts (4 angles) on a 2D pose rig; scene and device SVG libraries with metadata | Lean | 🚪 One-way |
| 4 | Rendering engine | React + SVG art layer, separate overlay for handles | Strong pick | 🚪 One-way |
| 5 | Agent integration | Layered: CLI + AGENTS.md/CLAUDE.md block + portable SKILL.md | Strong pick | 🚪 One-way |
| 6 | Editor layout | Page-first, edit in place (contextual toolbar, "+ Add" drawer) | Lean | 🔁 Two-way |
| 7 | Uploaded screens | Baked teal duotone PNG + stored device screen quads (auto-fit, perspective) | Strong pick | 🔁 Two-way |
| 8 | Round-trip & export | Live two-way sync (file watch + targeted autosave) + `storyboard export` via resvg | Strong pick | 🚪 One-way |

Design tokens: [.decisions/tokens.css](tokens.css) · [.decisions/tokens.json](tokens.json)

## Implementation Steps

### 1. Project Setup
- [ ] Monorepo (pnpm): `packages/schema`, `packages/cli`, `packages/renderer`, `packages/editor`, `packages/assets`, `packages/skill`
- [ ] `packages/schema`: JSON Schema v1 (panels, cast, scenes + marks, shots, poses, moods, devices, bubbles, gestures, time and title cards, sparse `layout`) with `schemaVersion` + migrations (decision 1)
- [ ] Import `.decisions/tokens.css` into renderer + editor; bundle Permanent Marker, Patrick Hand, Work Sans and IBM Plex Mono locally (needed for resvg)
- [ ] Vite + React for the editor; Node CLI published as `storyboard` on npm

### 2. Core Structure
- [ ] **CLI** (decisions 5, 8): `init`, `vocab [poses|shots|scenes|devices…] [--grep] [--json]`, `validate` (semantic errors with "did you mean" suggestions), `dev`, `export --png --pdf --svg [--scale 2]`, `script` (read-only Markdown screenplay view, the mitigation from decision 1)
- [ ] `storyboard init` writes an 8-line AGENTS.md + CLAUDE.md block and installs `.agents/skills/storyboard/`. **Generate both from the schema** so they can't drift
- [ ] **Renderer** (decision 4): pure function JSON → SVG, shared by the editor and export. One wobble filter per panel group, marker fills offset by `--marker-offset-*`
- [ ] **Editor** (decision 6): page-first canvas, selection overlay (react-moveable or custom), contextual toolbar, "+ Add" drawer, layout picker (2×2, 3×2, 1×4, 1×6), zoom-to-panel, undo/redo
- [ ] **Sync** (decision 8): dev server watches the file and pushes changes over websocket. Editor writes targeted JSON edits (debounced about 500 ms). v1 = last-write-wins per field; conflict prompt deferred behind a tripwire

### 3. Key Features
- [ ] **Asset pipeline** (decision 3): part kit spec (heads × hair, torsos × outfits, arms, legs, hands; front, ¾, side, back) with pivot points; rig solver for named poses (`holding-phone`, `typing`, `driving`, `walking`, `sitting`, `over-the-shoulder`…). **Start from Open Peeps–style front parts, cut into rig parts from day one**
- [ ] Diversity in the part kit: skin tones, ages, body shapes, hijab, wheelchair, cane, glasses, hearing aid
- [ ] Scene library with layers and named marks (home/kitchen, office/desk, car/driver-seat, coffee-shop/counter, transit, bed/night…); shots crop and scale layers (wide, medium, close, over-the-shoulder, POV, device-focus)
- [ ] Device library with screen quads + grip points: phone, laptop, tablet, watch, car infotainment, TV, kiosk, smart speaker
- [ ] **Bubbles** drawn by code: speech, thought, whisper, shout, caption box, narration, callout. **Tails auto-aim at the speaker's head anchor** (your feedback from decision 2)
- [ ] Cards: title, "time passes", location, chapter
- [ ] Gestures in teal: tap (ripples), double-tap, swipe, long-press, cursor + click, typing, notification wiggle, vibration marks
- [ ] **Uploaded screens** (decision 7): drop PNG/JPG → canvas bake (grayscale → 4-tone teal posterize → faint ink edges → 1–1.5px wobble) → saved next to the original; roughness slider; cover + top-aligned fit; corner handles; CSS matrix3d live preview; homography pre-warp at export
- [ ] **Skill content**: storytelling craft (show the moment before the app, include the workaround panel, vary shots, end on the outcome not the UI), the vocabulary as reference files, and 3 worked examples

### 4. Polish & Launch
- [ ] Agent eval suite: 20 prose prompts × Claude Code / Codex / Cursor → pass = validates on first or second try + a human rubric for "tells a real-life story"
- [ ] Export parity tests: editor screenshot vs resvg PNG (pixel diff threshold)
- [ ] Performance: 12-panel board drags at 60fps on an M1 laptop; filter off during drag
- [ ] Example gallery (5 journeys: order-ahead, car-to-phone handoff, healthcare portal, bill pay, smart-home onboarding)
- [ ] `npx storyboard init` quickstart + README GIF; publish to npm + skills registry

## Assumptions & Tripwires
| Assumption | Revisit if... | Affects |
|---|---|---|
| The agent writes almost all of the file | Designers regularly hand-edit JSON | 1: add a Markdown authoring layer |
| Boards travel into decks and Slack | Boards are mostly used live in crits | 2: consider Graphite (rougher) |
| Someone can draw about 160 Marker Comp parts | Art production stalls | 3: ship front + ¾ only, side and back later |
| Rigged poses can look natural | User tests call poses stiff or broken | 3: hand-tuned pose presets only |
| Tool stays free and open source | It becomes internal or commercial | 4: reconsider tldraw |
| Boards stay under about 500 parts | Drag drops below 60fps | 4: canvas art layer, keep SVG export |
| AGENTS.md pointer gets the skill used | Evals show agents skip the skill | 5: inline key craft rules in AGENTS.md |
| Live edits via file are enough | Users want "change panel 3" while editing | 5: small MCP endpoint on the dev server |
| C's minimal chrome suffices | Boards skew happy-path, no workaround panels | 6: add journey lanes (Feeling / Product / Workaround) as a toggle |
| Teal screens don't overpower faces | Feedback says screens steal focus | 7: lower default saturation |
| Same-field edits are rare | Users report lost edits | 8: build the keep-mine / take-theirs prompt |

## Pre-Mortem
It's 6 months after launch and this failed. The three most likely reasons:

1. **The characters looked bad.** The 2D rig produced stiff, broken-elbow people, so designers screenshotted Open Peeps instead. *Early warning:* in the first 10 user tests, people swap characters for "a better one" more than they re-pose them. Invest in hand-tuned pose presets before free joint dragging.
2. **Agents produced valid but lifeless boards**: all wide shots, happy path, no mess. The tool became a comic maker, not a service-design tool. *Early warning:* eval boards rarely include workaround, waiting or context-switch panels. Strengthen the skill's craft rules and consider promoting journey lanes.
3. **The editor ate the roadmap.** Selection, sync and export edge cases consumed months, and the asset library stayed thin. *Early warning:* by week 6, the part kit has fewer than 40 parts. Timebox editor basics to 4 weeks and ship with last-write-wins.

## Low-Confidence Picks Worth Revisiting
- **Decision 2, Marker Comp (lean):** Graphite was the lower-fi contender. Settle it by showing 5 designers the same board in both and asking which one they'd critique more freely.
- **Decision 3, parts on a rig (lean):** Settle it with a 2-week spike: rig one character in 6 poses. If it looks stiff, fall back to a curated pose library built from the same parts.
- **Decision 6, page-first (lean):** Journey lanes pushed the service-design thesis harder. Settle it by checking whether boards made in v1 include workaround and emotion moments without prompting.

## Decision History
[.decisions/index.html](index.html) lists all decisions · [.decisions/preview.html](preview.html) shows the composite mockup.
