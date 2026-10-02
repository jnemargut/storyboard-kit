import type {
  Accessory, Age, Angle, Body, BubbleType, DeviceType, GestureType, Hair, HairShade, Hat, Mood, Outfit, Pose,
  MarkerColor, SceneId, ShapeFill, ShapeType, Shot, Skin, TimeIcon,
} from "./vocab";

export const SCHEMA_VERSION = 1;

export interface CastMember {
  name?: string;
  skin?: Skin;
  hair?: Hair;
  hairShade?: HairShade;
  body?: Body;
  outfit?: Outfit;
  hat?: Hat;
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
  /** Layer order among people, devices and shapes (higher = in front). Set by the editor's Arrange buttons. */
  z?: number;
}

export interface HeldDevice {
  type: DeviceType;
  screen?: string;
  /** false = not the product (a personal call, a text): drawn gray instead of teal. Default true. */
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
  /** Swipe direction in degrees (0 = right, 90 = down). Overrides `direction`. */
  angle?: number;
}

export interface Callout {
  id?: string;
  text: string;
  target?: string;
}

/** A simple drawn shape, for anything the vocabulary doesn't have. Panel coordinates: 400 wide × 260 tall. */
export interface Shape {
  id?: string;
  type: ShapeType;
  points: [number, number][];
  fill?: ShapeFill;
  /** The words, for a "text" shape. */
  text?: string;
  /** Marker color; default ink. "none" leaves the outline off (a white box covering something up). */
  color?: MarkerColor | "none";
  /** Line weight: thin, normal (default), thick. */
  weight?: "thin" | "normal" | "thick";
  /** Text size for a "text" shape: s, m (default), l, xl. */
  size?: "s" | "m" | "l" | "xl";
}

/** Any picture placed in a scene (a found photo, a product shot, a prop). Sketchified in grays unless `sketch: false`. */
export interface SceneImage {
  id?: string;
  /** Path relative to the storyboard file. */
  src: string;
  /** Center, in panel units (400 × 260). Default: the middle of the panel. */
  x?: number;
  y?: number;
  /** Box the image fits inside, in panel units. Default 120 × 90. */
  w?: number;
  h?: number;
  /** false = show the image as-is. Default true (gray marker sketch). */
  sketch?: boolean;
  /** Show only part of the picture: [left, top, right, bottom] as fractions (the editor's Crop button writes it). */
  crop?: [number, number, number, number];
}

/** A sharpie stroke drawn over a panel while presenting (crit markup). Panel units. */
export interface MarkupStroke {
  points: [number, number][];
  color?: MarkerColor;
}

interface PanelBase {
  id: string;
  label?: string;
  notes?: string;
  /** Crit markup from play mode. Kept until someone clears it. */
  markup?: MarkupStroke[];
  layout?: Record<string, LayoutOverride>;
}

export interface ScenePanel extends PanelBase {
  type?: "scene";
  /** A built-in scene, or the id of one of the board's own `scenes`. */
  scene: SceneId | (string & {});
  shot?: Shot;
  focus?: string;
  characters?: CharacterInPanel[];
  devices?: SceneDevice[];
  bubbles?: Bubble[];
  caption?: string;
  callouts?: Callout[];
  gestures?: Gesture[];
  shapes?: Shape[];
  images?: SceneImage[];
  /** Journey lane: how the person feels here, -2 (awful) … 2 (great). Defaults from the main character's mood. */
  feeling?: number;
  /** Name on this panel's storefront/sign. Overrides the board brand; false = a blank sign (someone else's shop). */
  sign?: string | false;
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
  /** Places the board draws for itself, when none of the built-in scenes fit. Keyed by scene id. */
  scenes?: Record<string, CustomScene>;
  panels: Panel[];
  notes?: string;
}

/** Where a person stands in a custom scene. Panel units: 400 wide, 260 tall, floor at y 234. */
export interface CustomMark {
  x: number;
  y?: number;
  facing?: "left" | "right";
  seated?: boolean;
  /** Stand behind the scene's `front` shapes (behind a counter, a desk). */
  behind?: boolean;
  scale?: number;
}

/**
 * A scene an agent (or designer) draws from simple shapes, optionally on top of a built-in scene.
 * `shapes` go behind people, `front` shapes in front of them (a counter people stand behind).
 */
export interface CustomScene {
  name?: string;
  base?: SceneId;
  shapes?: Shape[];
  front?: Shape[];
  marks?: Record<string, CustomMark>;
  /** Where a storefront name goes. */
  sign?: { x: number; y: number; w: number; h: number };
}

export const isScene = (p: Panel): p is ScenePanel => p.type === undefined || p.type === "scene";
