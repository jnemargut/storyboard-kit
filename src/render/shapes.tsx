/** Designer-drawn shapes: boxes, ovals, lines, arrows and freehand. The drawing lives in the shared sketch kit. */
import type { LayoutOverride, Shape } from "../types";
import { shapeTransform as sketchTransform } from "../sketch/shapes";

export { ShapeMark, shapeBox, smooth, shapeId } from "../sketch/shapes";

/** Transform for a shape's layout override: move, then scale and rotate around its own center. */
export const shapeTransform = (s: Shape, ov: LayoutOverride): string => sketchTransform(s, ov);
