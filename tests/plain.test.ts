/** Plain words (shared with Wireframe Kit and Flowchart Kit): the guide every skill includes, and the checker. */
import { describe, expect, it } from "vitest";
import { plainIssues, plainWordsMd } from "../src/sketch/plain";

describe("plain words", () => {
  it("leaves plain writing alone", () => {
    for (const s of [
      "People don't mind late returns.",
      "When the order is late, people ask the barista",
      "The PM says people return things late. We don't know how often.",
      "Show the real queue, not a timer",
      "Late for the 8:40",
      "Is \"4 min\" ever true at 8am?",
      "",
    ]) expect(plainIssues(s, "title"), s).toEqual([]);
  });

  it("catches a semicolon, a dash and a colon bolting ideas together", () => {
    expect(plainIssues("Owners shrug at late; hidden damage is what stops them lending", "title").join()).toMatch(/semicolon/);
    expect(plainIssues("The fee is late — and it misses the damage", "title").join()).toMatch(/dash/);
    expect(plainIssues("Try first: check the tool at handover", "title").join()).toMatch(/colon/);
    // a quote's lead-in and a time are fine, and notes can use a colon
    expect(plainIssues("PM: \"people never return stuff on time\"", "description")).toEqual([]);
    expect(plainIssues("Idea: the app asks for it back", "note")).toEqual([]);
  });

  it("offers the plainer word", () => {
    expect(plainIssues("Surface the real queue to reduce friction").join(" ")).toMatch(/show/);
    expect(plainIssues("Surface the real queue to reduce friction").join(" ")).toMatch(/hard part/);
    expect(plainIssues("The ask rests on one claim").join()).toMatch(/depends on/);
    expect(plainIssues("We leverage the queue").join()).toMatch(/"leverage" has a plainer word: use/);
    expect(plainIssues("The top pain points").join()).toMatch(/problem/);
    // ordinary uses of the same letters are fine
    expect(plainIssues("Wipe the surface of the counter")).toEqual([]);
    expect(plainIssues("She unlocks her phone")).toEqual([]);
  });

  it("keeps titles and descriptions short", () => {
    expect(plainIssues("This is a title that goes on for quite a lot longer than anybody would want to read at a glance", "title").join()).toMatch(/hard to take in/);
    expect(plainIssues("One. Two. Three. Four. Five.", "description").join()).toMatch(/paragraph/);
    expect(plainIssues("One short sentence. And another.", "description")).toEqual([]);
  });

  it("ignores bold and italic marks", () => {
    expect(plainIssues("**People** don't *mind* late returns", "title")).toEqual([]);
  });

  it("the guide names what's being written and shows before and after", () => {
    const md = plainWordsMd("titles, stickies and notes");
    expect(md).toContain("titles, stickies and notes");
    expect(md).toContain("| Instead of | Write |");
    expect(md).not.toMatch(/—/);
  });
});
