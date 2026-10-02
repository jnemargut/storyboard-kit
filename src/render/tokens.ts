/** Marker Comp lives in src/sketch (shared with Wireframe Kit). Product/software is the ONLY thing drawn in teal. */
import { C } from "../sketch/tokens";
export { C, MARKER, STROKE, OFFSET, FONT } from "../sketch/tokens";

export const SKIN: Record<string, string> = { "tone-1": "#fbfaf7", "tone-2": "#e4e6e8", "tone-3": "#b9bec4", "tone-4": "#8d949a" };
export const HAIR_FILL: Record<string, string> = { dark: "#3c4147", light: "#d0d4d8", grey: "#b9bec4" };
export const OUTFIT_FILL: Record<string, string> = {
  jacket: C.g4, tee: C.g2, hoodie: C.g5, sweater: C.g4, suit: C.g7, dress: C.g5, scrubs: C.g2, apron: C.g7,
  polo: C.g2, uniform: C.g7, "hi-vis": C.g2, "lab-coat": C.paper, chef: C.paper, overalls: C.g1, coat: C.g5, athletic: C.g2,
};

export const PANEL_W = 400;
export const PANEL_H = 260;
export const FLOOR_Y = 234;
