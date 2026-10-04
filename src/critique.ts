/**
 * `storyboard critique`: a service-design reality check. Heuristics, not AI: it points at happy-path
 * storytelling and hands the designer (or their agent) concrete revision requests.
 */
import { plainIssues } from "./sketch/plain";
import type { Board, ScenePanel } from "./types";
import { isScene } from "./types";
import { feelingOf, productShare } from "./render";
import { panelHasProduct } from "./render/panel";

export interface Finding { id: string; title: string; why: string; ask: string }

const PERSONAL = /\b(ask|call|text|screenshot|note|paper|write|walk|wait|queue|line|colleague|coworker|human|barista|staff|friend)\b/i;

export function critique(b: Board): { findings: Finding[]; share: { withProduct: number; moments: number }; strengths: string[] } {
  const scenes = b.panels.filter(isScene) as ScenePanel[];
  const share = productShare(b);
  const f: Finding[] = [];
  const strengths: string[] = [];
  const who = b.persona?.split(",")[0] ?? "the person";
  if (scenes.length === 0) return { findings: [{ id: "empty", title: "No scene panels yet", why: "Cards alone don't show a life.", ask: `Add 5–8 scene panels showing ${who}'s day around the product.` }], share, strengths };

  if (panelHasProduct(scenes[0])) {
    f.push({ id: "trigger", title: "The story starts inside the product", why: "Real journeys start with a need or an interruption, not an app screen.", ask: `Add a first scene before ${who} touches the product: what triggered the need, where are they, what else is going on?` });
  } else strengths.push("Starts in real life, before the product shows up.");

  if (share.withProduct === share.moments && share.moments >= 3) {
    f.push({ id: "always-on", title: "The product is in every moment", why: "That's a feature tour, not a day. What happens around the product (the trigger, the wait, the aftermath) is where the insights are.", ask: `Add at least two moments without the product: waiting, switching to something else, or dealing with the outcome.` });
  } else if (share.moments >= 3) strengths.push("Some moments happen without the product, so you can see the rest of the day around it.");

  const hasWait = b.panels.some((p) => p.type === "time");
  const workaroundish = scenes.some((p) => p.workaround || (p.bubbles ?? []).some((x) => PERSONAL.test(x.text)) || (p.devices ?? []).some((d) => d.product === false) || (p.characters ?? []).some((c) => typeof c.device === "object" && c.device.product === false));
  if (!workaroundish) f.push({ id: "workaround", title: "No workaround", why: "People route around gaps: asking someone, calling, screenshotting, writing it down. Leaving that out hides the real cost.", ask: `Where does the product fail ${who}? Add a panel showing the workaround, with "workaround" filled in and any personal device marked "product": false.` });
  else strengths.push("Shows a workaround: how people route around the product.");
  if (!hasWait && scenes.length >= 4) f.push({ id: "time", title: "Time doesn't pass", why: "Waiting and gaps are part of the experience and often the pain.", ask: `Add a time card ("12 minutes later…") where ${who} waits or comes back later.` });

  const feels = scenes.map(feelingOf).filter((x): x is number => x !== undefined);
  if (feels.length >= 3 && new Set(feels).size === 1) f.push({ id: "flat", title: "The feeling never changes", why: "A flat line reads as a demo. Real journeys have dips.", ask: `Give each panel a "feeling" (-2…2) and let at least one moment dip below zero, with a mood and a thought bubble to match.` });
  if (feels.length >= 3 && Math.min(...feels) >= 1) f.push({ id: "happy-path", title: "Everyone is happy the whole time", why: "If nothing goes wrong, the board can't show where to improve.", ask: `Show the moment it goes wrong for ${who}: a confusing screen, a delay, a missing piece of information.` });
  if (feels.length >= 3 && Math.min(...feels) < 0) strengths.push("The feeling line dips, so the pain points are visible.");

  const thoughts = scenes.reduce((n, p) => n + (p.bubbles ?? []).filter((x) => x.type === "thought").length, 0);
  if (thoughts === 0) f.push({ id: "unsaid", title: "Nothing unsaid", why: "What people think but don't say is often the insight.", ask: `Add thought bubbles where ${who} is unsure, annoyed or relieved.` });

  const shots = new Set(scenes.map((p) => p.shot ?? "wide"));
  if (scenes.length >= 4 && shots.size === 1) f.push({ id: "camera", title: `Every panel is ${[...shots][0]}`, why: "Wide shots show context, close-ups show emotion, and over-the-shoulder shows the screen.", ask: "Vary the shots: one wide for context, a close-up at the emotional low point, over-the-shoulder where the UI matters." });

  const others = new Set(scenes.flatMap((p) => (p.characters ?? []).map((c) => c.who)));
  if (others.size <= 1 && scenes.length >= 3) f.push({ id: "alone", title: `${who} is always alone`, why: "Services involve other people: staff, family, colleagues. They're often the workaround.", ask: "Who else is involved? Add them where they help, get in the way, or pick up the slack." });

  const last = scenes[scenes.length - 1];
  if (last && ["screen", "pov", "over-the-shoulder"].includes(last.shot ?? "")) f.push({ id: "ending", title: "It ends on a screen", why: "The outcome that matters is what happens to the person, not the UI state.", ask: `End on ${who}'s outcome: are they on time, relieved, still annoyed, or planning to avoid the product next time?` });

  // plain words: labels, captions and callouts should read like a person talking (bubbles are people talking already)
  const stiff: string[] = [];
  const check = (text: string | undefined, kind: "title" | "note") => { const issues = plainIssues(text ?? "", kind); if (issues.length && stiff.length < 4) stiff.push(`"${text}" (${issues[0].replace(/\.$/, "")})`); };
  check(b.title, "title");
  for (const p of scenes) { check(p.label, "title"); check(p.caption, "note"); check(p.workaround, "note"); for (const c of p.callouts ?? []) check(c.text, "note"); }
  if (stiff.length) f.push({ id: "plain", title: "Some of the words read like a slide, not a person talking", why: `For example ${stiff[0]}.`, ask: `Rewrite these the way you'd say them to a teammate, in whole plain sentences: ${stiff.join("; ")}.` });

  return { findings: f, share, strengths };
}

export function formatCritique(b: Board, file: string): string {
  const { findings, share, strengths } = critique(b);
  void share;
  const out = [`Reality check: ${b.title}`, ""];
  if (strengths.length) out.push("Working:", ...strengths.map((s) => `  + ${s}`), "");
  if (!findings.length) { out.push("Nothing obvious to fix. This reads like a real day. Ask a teammate to poke holes in it."); return out.join("\n"); }
  out.push("Worth changing:", ...findings.map((x) => `  - ${x.title}. ${x.why}`), "");
  out.push("Paste this to your agent:", "", `  Revise ${file} as a reality check:`, ...findings.map((x) => `  - ${x.ask}`), `  Keep the designer's "layout" entries. Validate when done.`);
  return out.join("\n");
}
