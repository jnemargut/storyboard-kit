import type {
  Accessory, Age, Angle, Body, BubbleType, DeviceType, GestureType, Hair, HairShade, Mood, Outfit, Pose,
  SceneId, Shot, Skin, TimeIcon,
} from "./vocab";

export const SCHEMA_VERSION = 1;

export interface CastMember {
  name?: string;
  skin?: Skin;
  hair?: Hair;
  hairShade?: HairShade;
  body?: Body;
  outfit?: Outfit;
  age?: Age;
  accessories?: Accessory[];
}

/** Sparse manual adjustments written by the editor, keyed by element id. Units are panel units (400 × 260). */
export interface LayoutOverride {
  dx?: number;
  dy?: number;
  scale?: number;
  rotate?: number;
  hidden?: boolean;
}

export interface HeldDevice {
  type: DeviceType;
  screen?: string;
  /** false = not the product (a personal call, a text): drawn grey instead of teal. Default true. */
  product?: boolean;
}

export interface CharacterInPanel {
  who: string;
  id?: string;
  pose?: Pose;
  mood?: Mood;
  angle?: Angle;
  facing?: "left" | "right";
  at?: string;
  device?: HeldDevice | DeviceType;
}

export interface SceneDevice {
  id?: string;
  type: DeviceType;
  at?: string;
  screen?: string;
  product?: boolean;
}

export interface Bubble {
  id?: string;
  type: BubbleType;
  from?: string;
  text: string;
}

export interface Gesture {
  id?: string;
  type: GestureType;
  /** Element the gesture happens on: a character id (their held device) or a scene device id. */
  on?: string;
  /** Point on the screen, 0–1 from the top-left. */
  at?: [number, number];
  direction?: "left" | "right" | "up" | "down";
}

export interface Callout {
  id?: string;
  text: string;
  target?: string;
}

interface PanelBase {
  id: string;
  label?: string;
  notes?: string;
  layout?: Record<string, LayoutOverride>;
}

export interface ScenePanel extends PanelBase {
  type?: "scene";
  scene: SceneId;
  shot?: Shot;
  focus?: string;
  characters?: CharacterInPanel[];
  devices?: SceneDevice[];
  bubbles?: Bubble[];
  caption?: string;
  callouts?: Callout[];
  gestures?: Gesture[];
}

export interface TitlePanel extends PanelBase {
  type: "title";
  title: string;
  subtitle?: string;
}

export interface TimePanel extends PanelBase {
  type: "time";
  text: string;
  icon?: TimeIcon;
}

export interface TextPanel extends PanelBase {
  type: "text";
  text: string;
}

export type Panel = ScenePanel | TitlePanel | TimePanel | TextPanel;

export interface Board {
  $schema?: string;
  schemaVersion: number;
  title: string;
  subtitle?: string;
  persona?: string;
  page?: { columns?: number };
  cast: Record<string, CastMember>;
  panels: Panel[];
  notes?: string;
}

export const isScene = (p: Panel): p is ScenePanel => p.type === undefined || p.type === "scene";
