/**
 * 2D pose rig. Poses are joint positions for a ~112-unit-tall adult, feet at (0, 0), y up is negative.
 * "front" joints are used for front, three-quarter and back views; "side" joints face right.
 */
import type { Angle, Pose } from "../vocab";
import type { CastMember } from "../types";

export type Pt = [number, number];
export interface Joints {
  head: Pt; neck: Pt;
  shL: Pt; shR: Pt; hipL: Pt; hipR: Pt;
  elL: Pt; hdL: Pt; elR: Pt; hdR: Pt;
  knL: Pt; ftL: Pt; knR: Pt; ftR: Pt;
  seated?: boolean;
}

type PoseDef = { front: Joints; side: Joints };

const STAND_F: Joints = {
  head: [0, -112], neck: [0, -98], shL: [-12, -92], shR: [12, -92], hipL: [-7, -52], hipR: [7, -52],
  elL: [-16, -71], hdL: [-15, -50], elR: [16, -71], hdR: [15, -50],
  knL: [-7, -27], ftL: [-8, 0], knR: [7, -27], ftR: [9, 0],
};
const STAND_S: Joints = {
  head: [2, -112], neck: [0, -98], shL: [0, -92], shR: [0, -92], hipL: [0, -52], hipR: [0, -52],
  elL: [-2, -71], hdL: [-1, -50], elR: [2, -71], hdR: [3, -50],
  knL: [0, -27], ftL: [0, 0], knR: [1, -27], ftR: [3, 0],
};
const SIT_F: Joints = {
  head: [0, -100], neck: [0, -86], shL: [-12, -80], shR: [12, -80], hipL: [-8, -44], hipR: [8, -44],
  elL: [-16, -60], hdL: [-8, -46], elR: [16, -60], hdR: [8, -46],
  knL: [-10, -40], ftL: [-10, 0], knR: [10, -40], ftR: [10, 0], seated: true,
};
const SIT_S: Joints = {
  head: [2, -100], neck: [0, -86], shL: [0, -81], shR: [0, -81], hipL: [0, -44], hipR: [0, -44],
  elL: [3, -62], hdL: [18, -48], elR: [5, -62], hdR: [20, -47],
  knL: [25, -44], ftL: [27, 0], knR: [26, -43], ftR: [30, 0], seated: true,
};

const with_ = (b: Joints, o: Partial<Joints>): Joints => ({ ...b, ...o });

export const POSE_DEFS: Record<Pose, PoseDef> = {
  standing: { front: STAND_F, side: STAND_S },
  "holding-phone": {
    front: with_(STAND_F, { head: [0, -111], elR: [17, -72], hdR: [5, -80] }),
    side: with_(STAND_S, { head: [4, -110], elR: [6, -72], hdR: [16, -82] }),
  },
  "phone-to-ear": {
    front: with_(STAND_F, { elR: [21, -90], hdR: [11, -108] }),
    side: with_(STAND_S, { elR: [10, -86], hdR: [3, -106] }),
  },
  walking: {
    front: with_(STAND_F, { elL: [-17, -71], hdL: [-13, -52], elR: [17, -71], hdR: [19, -53], knL: [-8, -27], ftL: [-10, -2], knR: [8, -26], ftR: [10, 0] }),
    side: with_(STAND_S, { elL: [-8, -72], hdL: [-13, -54], elR: [8, -72], hdR: [15, -56], knL: [-7, -27], ftL: [-16, 0], knR: [9, -27], ftR: [17, 0] }),
  },
  sitting: { front: SIT_F, side: SIT_S },
  "sitting-laptop": {
    front: with_(SIT_F, { elL: [-17, -62], hdL: [-7, -58], elR: [17, -62], hdR: [7, -58] }),
    side: with_(SIT_S, { elL: [10, -65], hdL: [30, -61], elR: [11, -64], hdR: [31, -60] }),
  },
  driving: {
    front: with_(SIT_F, { elL: [-18, -66], hdL: [-10, -74], elR: [18, -66], hdR: [10, -74] }),
    side: with_(SIT_S, { head: [-2, -101], neck: [-4, -87], shL: [-4, -82], shR: [-4, -82], hipL: [-6, -44], hipR: [-6, -44],
      elL: [11, -66], hdL: [27, -77], elR: [12, -68], hdR: [28, -79], knL: [22, -48], ftL: [42, -12], knR: [23, -47], ftR: [44, -12] }),
  },
  waving: {
    front: with_(STAND_F, { elR: [25, -100], hdR: [29, -124] }),
    side: with_(STAND_S, { elR: [6, -102], hdR: [11, -125] }),
  },
  pointing: {
    front: with_(STAND_F, { elR: [27, -86], hdR: [44, -90] }),
    side: with_(STAND_S, { elR: [15, -88], hdR: [33, -92] }),
  },
  shrugging: {
    front: with_(STAND_F, { head: [0, -111], elL: [-22, -74], hdL: [-31, -84], elR: [22, -74], hdR: [31, -84] }),
    side: with_(STAND_S, { elL: [2, -74], hdL: [12, -84], elR: [4, -74], hdR: [15, -85] }),
  },
  "arms-crossed": {
    front: with_(STAND_F, { elL: [-15, -70], hdL: [8, -76], elR: [15, -70], hdR: [-8, -78] }),
    side: with_(STAND_S, { elL: [6, -72], hdL: [8, -78], elR: [7, -71], hdR: [9, -79] }),
  },
};

export interface Figure {
  j: Joints;
  headR: number;
  view: "front" | "side" | "back";
  angle: Angle;
  /** +1 facing right, -1 facing left (side/3q only). */
  dir: 1 | -1;
  torsoW: number;
  scale: number;
}

const BODY_W: Record<string, number> = { slim: 0.86, average: 1, broad: 1.18, plus: 1.28 };

/** Resolve a character's joints in its local space (feet at 0,0), applying view, facing, body and age. */
const add = (p: Pt, d: Pt): Pt => [p[0] + d[0], p[1] + d[1]];

/** Small natural variations so several people in one pose don't look cloned. 0 = none. */
function vary(j: Joints, pose: Pose, side: boolean, v: number) {
  if (!v || j.seated) return;
  const freeLeft = ["standing", "holding-phone", "phone-to-ear", "waving", "pointing"].includes(pose);
  const standingLegs = pose !== "walking";
  if (v === 1) {
    j.head = add(j.head, [1.6, 0.6]);
    if (freeLeft) { j.elL = add(j.elL, side ? [-3, 1] : [-5, 2]); j.hdL = side ? add(j.hdL, [-2, -3]) : [j.hipL[0] - 7, j.hipL[1] - 3]; } // hand on hip
  } else if (v === 2) {
    j.head = add(j.head, [-1.4, 0.8]);
    if (standingLegs) { j.knL = add(j.knL, [side ? 3 : 2, 0]); j.ftL = add(j.ftL, [side ? 5 : -3, 0]); j.hipL = add(j.hipL, [0, 1.5]); } // weight on one leg
    if (freeLeft) { j.elL = add(j.elL, [1, 0]); j.hdL = add(j.hdL, [2, -5]); } // hand in pocket
  } else if (v === 3) {
    if (standingLegs) { j.ftL = add(j.ftL, [side ? -6 : -5, 0]); j.ftR = add(j.ftR, [side ? 4 : 5, 0]); } // wider stance
    if (freeLeft) { j.elL = add(j.elL, [-2, -2]); j.hdL = add(j.hdL, [4, -10]); } // arm across, holding strap
  }
}

/** Stable 1–3 from a string, so the same person keeps the same variation in a panel. */
export const autoVariant = (key: string) => ([...key].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % 3) + 1;

export function figure(pose: Pose, angle: Angle, facing: "left" | "right", cast: CastMember, variant = 0): Figure {
  const wheelchair = cast.accessories?.includes("wheelchair");
  let p: Pose = pose;
  if (wheelchair && !POSE_DEFS[p].front.seated) p = p === "holding-phone" || p === "phone-to-ear" ? p : "sitting";
  const def = POSE_DEFS[p] ?? POSE_DEFS.standing;
  const side = angle === "side";
  let j: Joints = structuredClone(side ? def.side : def.front);
  if (wheelchair && !j.seated) {
    // seated arms-only variants of phone poses
    const base = structuredClone(side ? SIT_S : SIT_F);
    const src = side ? def.side : def.front;
    const lift = 12;
    j = { ...base, elR: [src.elR[0], src.elR[1] + lift], hdR: [src.hdR[0], src.hdR[1] + lift] };
  }
  vary(j, p, side, variant);
  const dir: 1 | -1 = facing === "left" ? -1 : 1;
  const w = BODY_W[cast.body ?? "average"] ?? 1;
  const mapX = (pt: Pt): Pt => [pt[0] * (side ? 1 : w) * (angle === "three-quarter" ? 0.88 : 1), pt[1]];
  const keys = Object.keys(j).filter((k) => k !== "seated") as (keyof Omit<Joints, "seated">)[];
  for (const k of keys) j[k] = mapX(j[k]);
  if (side || angle === "three-quarter") for (const k of keys) j[k] = [j[k][0] * dir, j[k][1]];
  if (angle === "back") for (const k of keys) j[k] = [-j[k][0], j[k][1]];
  if (cast.age === "older") { j.head = [j.head[0] + 3 * dir, j.head[1] + 2]; j.neck = [j.neck[0] + 2 * dir, j.neck[1] + 1]; }
  const scale = cast.age === "child" ? 0.66 : 1;
  const headR = cast.age === "child" ? 14.5 : 12.5;
  return {
    j, headR, dir, angle, scale,
    view: side ? "side" : angle === "back" ? "back" : "front",
    torsoW: w,
  };
}

/** Where the primary (right) hand holds things, in local space. */
export const handPoint = (f: Figure): Pt => f.j.hdR;
