/** Marker Comp tokens (mirrors .decisions/tokens.json). Product/software is the ONLY thing drawn in teal. */
export const C = {
  ink: "#1c1c1e",
  paper: "#fbfaf7",
  g1: "#e4e6e8",
  g2: "#d7dade",
  g4: "#b9bec4",
  g5: "#959ba2",
  g7: "#6f777f",
  g8: "#4d535a",
  teal: "#0e9aa7",
  tealDark: "#0b7f8a",
  tealTint: "#8fd6dc",
  caption: "#fff6bf",
  /** Gestures/interactions: what the person does. Orange so it reads on top of teal screens. */
  action: "#e8590c",
} as const;

export const SKIN: Record<string, string> = { "tone-1": "#fbfaf7", "tone-2": "#e4e6e8", "tone-3": "#b9bec4", "tone-4": "#8d949a" };
export const HAIR_FILL: Record<string, string> = { dark: "#3c4147", light: "#d0d4d8", grey: "#b9bec4" };
export const OUTFIT_FILL: Record<string, string> = {
  jacket: C.g4, tee: C.g2, hoodie: C.g5, sweater: C.g4, suit: C.g7, dress: C.g5, scrubs: C.g2, apron: C.g7,
  polo: C.g2, uniform: C.g7, "hi-vis": C.g2, "lab-coat": C.paper, chef: C.paper, overalls: C.g1, coat: C.g5, athletic: C.g2,
};

export const STROKE = { line: 2.1, detail: 1.3, panel: 2.6 };
/** Marker fills sit slightly off the ink line, like real markers. */
export const OFFSET = { x: 2.2, y: 1.8 };

export const FONT = {
  title: "Permanent Marker",
  hand: "Patrick Hand",
};

export const PANEL_W = 400;
export const PANEL_H = 260;
export const FLOOR_Y = 234;
