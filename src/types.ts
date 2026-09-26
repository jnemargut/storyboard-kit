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
  /** 1–3: small natural variations of the pose so a crowd doesn't look cloned. Auto if omitted. */
  variant?: number;
}

export interface SceneDevice {
  id?: string;
  type: DeviceType;
  at?: string;
  screen?: string;
  product?: boolean;
  /** Turned away from the viewer (e.g. a dashboard screen seen from the side). */
  tilt?: "left" | "right";
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
  /** Journey lane: how the person feels here, -2 (awful) … 2 (great). Defaults from the main character's mood. */
  feeling?: number;
  /** Journey lane: what they do to get around a gap ("asks the barista", "screenshots the code"). */
  workaround?: string;
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
  /**
   * columns: panels across. textScale: multiplies every text size (default 1).
   * lanes: show service-design lanes (feeling, product, workaround) under each panel.
   * brand: your company's name/logo on storefronts and signs in the scenes.
   */
  page?: { columns?: number; textScale?: number; lanes?: boolean; brand?: { name?: string; logo?: string } };
  cast: Record<string, CastMember>;
  panels: Panel[];
  notes?: string;
}

export const isScene = (p: Panel): p is ScenePanel => p.type === undefined || p.type === "scene";
