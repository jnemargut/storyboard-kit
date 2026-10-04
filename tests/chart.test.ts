/** Sketchy charts (shared with Wireframe Kit and Flowchart Kit): reading numbers, writing them, drawing every kind. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CHART_KINDS, SketchChart, chartRows, chartText, formatValue, parseChartText, parseNumber } from "../src/sketch/chart";

const draw = (spec: Parameters<typeof SketchChart>[0]["spec"], w = 360, h = 220) => renderToStaticMarkup(createElement("svg", null, createElement(SketchChart, { spec, x: 0, y: 0, w, h })));

describe("chart data", () => {
  it("reads pairs, objects and label/value records, skipping what isn't a number", () => {
    expect(chartRows([["Browse", 1200], ["Cart", "640"], ["Bad", "lots"], ["Paid", 210]])).toEqual([["Browse", 1200], ["Cart", 640], ["Paid", 210]]);
    expect(chartRows({ Yes: 8, No: 4 })).toEqual([["Yes", 8], ["No", 4]]);
    expect(chartRows([{ label: "A", value: 3 }])).toEqual([["A", 3]]);
    expect(chartRows(undefined)).toEqual([]);
    expect(chartRows("nope")).toEqual([]);
  });

  it("parses numbers the way people write them", () => {
    expect(parseNumber("1,200")).toBe(1200);
    expect(parseNumber("$4.50")).toBe(4.5);
    expect(parseNumber("45%")).toBe(45);
    expect(parseNumber("-3")).toBe(-3);
    expect(parseNumber("12 people")).toBeUndefined();
    expect(parseNumber("")).toBeUndefined();
  });

  it("parses typed or pasted rows: commas, tabs, colons, thousands and a title line", () => {
    expect(parseChartText("Browse, 1200\nCart, 640\nPaid: 210").rows).toEqual([["Browse", 1200], ["Cart", 640], ["Paid", 210]]);
    const sheet = parseChartText("Step\tPeople\nBrowse\t1,200\nCart\t640\n");
    expect(sheet.title).toBe("Step");
    expect(sheet.rows).toEqual([["Browse", 1200], ["Cart", 640]]);
    expect(parseChartText("Hello, world, 12").rows).toEqual([["Hello, world", 12]]);
    expect(parseChartText("Mon 4\nTue 7").rows).toEqual([["Mon", 4], ["Tue", 7]]);
    expect(parseChartText("Yes, 60%\nNo, 40%").unit).toBe("%");
    expect(parseChartText("Rent, $1,200\nFood, $400").unit).toBe("$");
    expect(parseChartText("just some words").rows).toEqual([]);
  });

  it("round-trips through the editor's text box", () => {
    const rows = [["Browse", 1200], ["Cart, again", 640]] as [string, number][];
    expect(parseChartText(chartText(rows)).rows).toEqual(rows);
  });

  it("writes numbers short and with their unit", () => {
    expect(formatValue(1200)).toBe("1,200");
    expect(formatValue(12400)).toBe("12.4K");
    expect(formatValue(2_500_000)).toBe("2.5M");
    expect(formatValue(45, "%")).toBe("45%");
    expect(formatValue(4.5, "$")).toBe("$4.5");
    expect(formatValue(-20, "$")).toBe("-$20");
    expect(formatValue(12, "people")).toBe("12 people");
    expect(formatValue(0.456)).toBe("0.46");
  });
});

describe("drawing", () => {
  const data = [["Browse", 1200], ["Cart", 640], ["Checkout", 410], ["Paid", 210]];
  it.each(CHART_KINDS)("%s draws every label and no broken numbers", (kind) => {
    const svg = draw({ kind, data, highlight: "Cart", unit: "people" });
    expect(svg).not.toMatch(/NaN|Infinity|undefined/);
    for (const l of ["Browse", "Cart", "Checkout", "Paid"]) expect(svg).toContain(l);
  });

  it("writes the numbers on the chart, and hides them when asked", () => {
    expect(draw({ kind: "bar", data })).toContain("1,200");
    expect(draw({ kind: "bar", data, values: false })).not.toContain("1,200");
  });

  it("a word unit goes on one number under bars and on a line; symbols go on every number", () => {
    const week = [["Mon", 42], ["Tue", 38], ["Wed", 51]];
    const bars = draw({ kind: "bar", data: week, unit: "orders" });
    expect(bars.match(/ orders</g)?.length).toBe(1);
    expect(bars).toContain("51 orders");
    expect(draw({ kind: "bar", data: week, unit: "orders", highlight: "Tue" })).toContain("38 orders");
    expect(draw({ kind: "bar", data: week, unit: "%" }).match(/%</g)?.length).toBe(3);
    expect(draw({ kind: "hbar", data: week, unit: "orders" }).match(/ orders</g)?.length).toBe(3);
  });

  it("a funnel shows each step's share of the first", () => {
    const svg = draw({ kind: "funnel", data });
    expect(svg).toContain("53%");
    expect(svg).toContain("18%");
  });

  it("a pie shows shares and a donut its total", () => {
    expect(draw({ kind: "pie", data: { Yes: 3, No: 1 } })).toContain("75%");
    expect(draw({ kind: "donut", data: { Yes: 3, No: 1 } })).toContain(">4<");
  });

  it("the accent color goes on what's called out", () => {
    const svg = draw({ kind: "bar", data, highlight: ["paid"], color: "#7a3cb5" });
    expect(svg.match(/#7a3cb5/g)?.length).toBe(1);
  });

  it("copes with odd data: empty, one row, negatives, all zeros, many rows, long labels", () => {
    expect(draw({ kind: "bar", data: [] })).toContain("Add some numbers");
    for (const kind of CHART_KINDS) {
      for (const d of [[["Only", 5]], [["Up", 5], ["Down", -3]], [["A", 0], ["B", 0]], Array.from({ length: 40 }, (_, i) => [`Day ${i}`, i * 3]), [["A really very long label that goes on and on", 4], ["B", 2]]]) {
        const svg = draw({ kind, data: d }, 300, 180);
        expect(svg, `${kind} ${JSON.stringify(d).slice(0, 40)}`).not.toMatch(/NaN|Infinity/);
      }
    }
  });
});
