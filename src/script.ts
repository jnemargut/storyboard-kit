import type { Board } from "./types";
import { isScene } from "./types";
import { heldDeviceOf } from "./render/layout";

/** Read-only screenplay view of a storyboard, for reading in PRs and docs (the mitigation from decision 1). */
export function toScript(b: Board): string {
  const name = (who: string) => b.cast[who]?.name ?? who.charAt(0).toUpperCase() + who.slice(1);
  const out: string[] = [`# ${b.title}`, ""];
  const meta = [b.persona && `Persona: ${b.persona}`, b.subtitle].filter(Boolean).join(" · ");
  if (meta) out.push(`*${meta}*`, "");
  b.panels.forEach((p, i) => {
    const n = i + 1;
    if (p.type === "title") { out.push(`## ${n} · TITLE: ${p.title}${p.subtitle ? `: ${p.subtitle}` : ""}`, ""); return; }
    if (p.type === "time") { out.push(`## ${n} · ${p.text.toUpperCase()}`, ""); return; }
    if (p.type === "text") { out.push(`## ${n} · NARRATION`, "", p.text, ""); return; }
    if (!isScene(p)) return;
    out.push(`## ${n} · ${p.scene.replace(/-/g, " ").toUpperCase()}, ${(p.shot ?? "wide").replace(/-/g, " ").toUpperCase()}${p.label ? ` · ${p.label}` : ""}`, "");
    if (p.caption) out.push(`*${p.caption}*`, "");
    for (const c of p.characters ?? []) {
      const dev = heldDeviceOf(c);
      const bits = [c.mood, c.pose?.replace(/-/g, " ")].filter(Boolean).join(", ");
      out.push(`${name(c.who)}${bits ? ` (${bits})` : ""}${c.at ? (c.at === "barista" || c.at === "cashier" ? " behind the counter" : ` at the ${c.at.replace(/-/g, " ")}`) : ""}${dev ? `, with a **${dev.type}**${dev.screen ? ` showing \`${dev.screen}\`` : ""}` : ""}.`);
    }
    for (const d of p.devices ?? []) out.push(`A **${d.type}**${d.at ? ` at the ${d.at}` : ""}${d.screen ? ` showing \`${d.screen}\`` : ""}.`);
    for (const g of p.gestures ?? []) out.push(`*${g.type}${g.direction ? ` ${g.direction}` : ""}${g.on ? ` on ${name(g.on)}'s screen` : ""}*`);
    if ((p.bubbles ?? []).length) out.push("");
    for (const bb of p.bubbles ?? []) {
      const who = bb.from ? name(bb.from) : "Voice";
      const verb = { speech: "", thought: " (thinks)", shout: " (shouts)", whisper: " (whispers)" }[bb.type];
      out.push(`> **${who}${verb}:** ${bb.text}`);
    }
    for (const co of p.callouts ?? []) out.push("", `📌 ${co.text}`);
    if (p.notes) out.push("", `_Notes: ${p.notes}_`);
    out.push("");
  });
  return out.join("\n");
}
