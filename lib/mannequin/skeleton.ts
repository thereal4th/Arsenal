/**
 * Arsenal — mannequin skeleton definition.
 *
 * The rig is fully declarative so that a pose is nothing more than a map of
 * bone id -> euler angles (degrees). That keeps every pose trivially
 * serialisable to JSON, diffable, and safe to store in MongoDB.
 *
 * Conventions
 * -----------
 * - Units are metres. Y is up. The figure faces +Z.
 * - `offset` is the rest translation from the parent joint.
 * - `length` / `axis` describe the capsule drawn from this joint.
 * - Euler rotations use the "YXZ" order everywhere (least gimbal lock for
 *   shoulders and hips, which are the joints users manipulate most).
 * - Angles in JSON are DEGREES. They are converted to radians at render time.
 */

export const EULER_ORDER = "YXZ" as const;

export type BoneId =
  | "hips"
  | "spine"
  | "chest"
  | "neck"
  | "head"
  | "clavicleL"
  | "upperArmL"
  | "forearmL"
  | "handL"
  | "clavicleR"
  | "upperArmR"
  | "forearmR"
  | "handR"
  | "thighL"
  | "shinL"
  | "footL"
  | "thighR"
  | "shinR"
  | "footR";

export type BoneGroup = "core" | "head" | "armL" | "armR" | "legL" | "legR";

export type Axis = "x" | "y" | "z";

export type Vec3 = [number, number, number];

export interface BoneDef {
  id: BoneId;
  label: string;
  parent: BoneId | null;
  group: BoneGroup;
  /** Rest translation from the parent joint, in metres. */
  offset: Vec3;
  /** Length of the capsule drawn from this joint. 0 = no limb geometry. */
  length: number;
  /** Local-space unit direction the limb extends along. */
  axis: Vec3;
  /** Capsule radius. */
  radius: number;
  /** Per-axis rotation limits, in degrees. */
  limits: Record<Axis, [number, number]>;
  /** Axes surfaced in "Simple" control mode — the anatomically useful ones. */
  primaryAxes: Axis[];
  /** Human-readable meaning of each axis for this joint. */
  axisLabels: Record<Axis, string>;
  /** Opposite-side bone, used by the mirror tools. */
  mirror?: BoneId;
  /** Included in collision capsules. Tiny bones are skipped for performance. */
  collidable: boolean;
}

const HIP_HEIGHT = 1.0;

export const BONES: Record<BoneId, BoneDef> = {
  hips: {
    id: "hips",
    label: "Hips",
    parent: null,
    group: "core",
    offset: [0, HIP_HEIGHT, 0],
    length: 0.1,
    axis: [0, 1, 0],
    radius: 0.135,
    limits: { x: [-60, 60], y: [-90, 90], z: [-50, 50] },
    primaryAxes: ["x", "y", "z"],
    axisLabels: { x: "Tilt fwd/back", y: "Twist", z: "Tilt side" },
    collidable: true,
  },
  spine: {
    id: "spine",
    label: "Lower spine",
    parent: "hips",
    group: "core",
    offset: [0, 0.1, 0],
    length: 0.16,
    axis: [0, 1, 0],
    radius: 0.118,
    limits: { x: [-40, 50], y: [-35, 35], z: [-32, 32] },
    primaryAxes: ["x", "y"],
    axisLabels: { x: "Bend fwd/back", y: "Twist", z: "Side bend" },
    collidable: true,
  },
  chest: {
    id: "chest",
    label: "Chest",
    parent: "spine",
    group: "core",
    offset: [0, 0.16, 0],
    length: 0.2,
    axis: [0, 1, 0],
    radius: 0.135,
    limits: { x: [-30, 45], y: [-40, 40], z: [-30, 30] },
    primaryAxes: ["x", "y"],
    axisLabels: { x: "Bend fwd/back", y: "Twist", z: "Side bend" },
    collidable: true,
  },
  neck: {
    id: "neck",
    label: "Neck",
    parent: "chest",
    group: "head",
    offset: [0, 0.2, 0],
    length: 0.08,
    axis: [0, 1, 0],
    radius: 0.048,
    limits: { x: [-45, 35], y: [-50, 50], z: [-32, 32] },
    primaryAxes: ["x", "y"],
    axisLabels: { x: "Nod", y: "Turn", z: "Tilt" },
    collidable: true,
  },
  head: {
    id: "head",
    label: "Head",
    parent: "neck",
    group: "head",
    offset: [0, 0.08, 0],
    length: 0.13,
    axis: [0, 1, 0],
    radius: 0.098,
    limits: { x: [-25, 25], y: [-35, 35], z: [-22, 22] },
    primaryAxes: ["x", "y"],
    axisLabels: { x: "Nod", y: "Turn", z: "Tilt" },
    collidable: true,
  },

  /* ---------------------------------------------------------------- left arm */
  clavicleL: {
    id: "clavicleL",
    label: "L clavicle",
    parent: "chest",
    group: "armL",
    offset: [0.045, 0.165, 0],
    length: 0.11,
    axis: [1, 0, 0],
    radius: 0.046,
    limits: { x: [-20, 20], y: [-28, 28], z: [-28, 42] },
    primaryAxes: ["z", "y"],
    axisLabels: { x: "Roll", y: "Protract", z: "Shrug" },
    mirror: "clavicleR",
    collidable: true,
  },
  upperArmL: {
    id: "upperArmL",
    label: "L upper arm",
    parent: "clavicleL",
    group: "armL",
    offset: [0.11, 0, 0],
    length: 0.29,
    axis: [1, 0, 0],
    radius: 0.054,
    limits: { x: [-180, 180], y: [-110, 110], z: [-170, 70] },
    primaryAxes: ["z", "y", "x"],
    axisLabels: { x: "Twist", y: "Swing fwd/back", z: "Raise/lower" },
    mirror: "upperArmR",
    collidable: true,
  },
  forearmL: {
    id: "forearmL",
    label: "L forearm",
    parent: "upperArmL",
    group: "armL",
    offset: [0.29, 0, 0],
    length: 0.26,
    axis: [1, 0, 0],
    radius: 0.043,
    limits: { x: [-90, 90], y: [-150, 5], z: [-12, 12] },
    primaryAxes: ["y", "x"],
    axisLabels: { x: "Pronate", y: "Elbow bend", z: "Deviation" },
    mirror: "forearmR",
    collidable: true,
  },
  handL: {
    id: "handL",
    label: "L hand",
    parent: "forearmL",
    group: "armL",
    offset: [0.26, 0, 0],
    length: 0.1,
    axis: [1, 0, 0],
    radius: 0.037,
    limits: { x: [-45, 45], y: [-35, 35], z: [-75, 75] },
    primaryAxes: ["z", "y"],
    axisLabels: { x: "Roll", y: "Deviate", z: "Flex/extend" },
    mirror: "handR",
    collidable: false,
  },

  /* --------------------------------------------------------------- right arm */
  clavicleR: {
    id: "clavicleR",
    label: "R clavicle",
    parent: "chest",
    group: "armR",
    offset: [-0.045, 0.165, 0],
    length: 0.11,
    axis: [-1, 0, 0],
    radius: 0.046,
    limits: { x: [-20, 20], y: [-28, 28], z: [-42, 28] },
    primaryAxes: ["z", "y"],
    axisLabels: { x: "Roll", y: "Protract", z: "Shrug" },
    mirror: "clavicleL",
    collidable: true,
  },
  upperArmR: {
    id: "upperArmR",
    label: "R upper arm",
    parent: "clavicleR",
    group: "armR",
    offset: [-0.11, 0, 0],
    length: 0.29,
    axis: [-1, 0, 0],
    radius: 0.054,
    limits: { x: [-180, 180], y: [-110, 110], z: [-70, 170] },
    primaryAxes: ["z", "y", "x"],
    axisLabels: { x: "Twist", y: "Swing fwd/back", z: "Raise/lower" },
    mirror: "upperArmL",
    collidable: true,
  },
  forearmR: {
    id: "forearmR",
    label: "R forearm",
    parent: "upperArmR",
    group: "armR",
    offset: [-0.29, 0, 0],
    length: 0.26,
    axis: [-1, 0, 0],
    radius: 0.043,
    limits: { x: [-90, 90], y: [-5, 150], z: [-12, 12] },
    primaryAxes: ["y", "x"],
    axisLabels: { x: "Pronate", y: "Elbow bend", z: "Deviation" },
    mirror: "forearmL",
    collidable: true,
  },
  handR: {
    id: "handR",
    label: "R hand",
    parent: "forearmR",
    group: "armR",
    offset: [-0.26, 0, 0],
    length: 0.1,
    axis: [-1, 0, 0],
    radius: 0.037,
    limits: { x: [-45, 45], y: [-35, 35], z: [-75, 75] },
    primaryAxes: ["z", "y"],
    axisLabels: { x: "Roll", y: "Deviate", z: "Flex/extend" },
    mirror: "handL",
    collidable: false,
  },

  /* ---------------------------------------------------------------- left leg */
  thighL: {
    id: "thighL",
    label: "L thigh",
    parent: "hips",
    group: "legL",
    offset: [0.095, -0.06, 0],
    length: 0.46,
    axis: [0, -1, 0],
    radius: 0.078,
    limits: { x: [-150, 40], y: [-50, 50], z: [-55, 65] },
    primaryAxes: ["x", "z", "y"],
    axisLabels: { x: "Hip flex/extend", y: "Rotate", z: "Abduct/adduct" },
    mirror: "thighR",
    collidable: true,
  },
  shinL: {
    id: "shinL",
    label: "L shin",
    parent: "thighL",
    group: "legL",
    offset: [0, -0.46, 0],
    length: 0.43,
    axis: [0, -1, 0],
    radius: 0.06,
    limits: { x: [0, 155], y: [-20, 20], z: [-10, 10] },
    primaryAxes: ["x"],
    axisLabels: { x: "Knee bend", y: "Rotate", z: "Deviation" },
    mirror: "shinR",
    collidable: true,
  },
  footL: {
    id: "footL",
    label: "L foot",
    parent: "shinL",
    group: "legL",
    offset: [0, -0.43, 0],
    length: 0.17,
    axis: [0, 0, 1],
    radius: 0.047,
    limits: { x: [-50, 40], y: [-28, 28], z: [-22, 22] },
    primaryAxes: ["x", "y"],
    axisLabels: { x: "Point/flex", y: "Rotate", z: "Roll" },
    mirror: "footR",
    collidable: false,
  },

  /* --------------------------------------------------------------- right leg */
  thighR: {
    id: "thighR",
    label: "R thigh",
    parent: "hips",
    group: "legR",
    offset: [-0.095, -0.06, 0],
    length: 0.46,
    axis: [0, -1, 0],
    radius: 0.078,
    limits: { x: [-150, 40], y: [-50, 50], z: [-65, 55] },
    primaryAxes: ["x", "z", "y"],
    axisLabels: { x: "Hip flex/extend", y: "Rotate", z: "Abduct/adduct" },
    mirror: "thighL",
    collidable: true,
  },
  shinR: {
    id: "shinR",
    label: "R shin",
    parent: "thighR",
    group: "legR",
    offset: [0, -0.46, 0],
    length: 0.43,
    axis: [0, -1, 0],
    radius: 0.06,
    limits: { x: [0, 155], y: [-20, 20], z: [-10, 10] },
    primaryAxes: ["x"],
    axisLabels: { x: "Knee bend", y: "Rotate", z: "Deviation" },
    mirror: "shinL",
    collidable: true,
  },
  footR: {
    id: "footR",
    label: "R foot",
    parent: "shinR",
    group: "legR",
    offset: [0, -0.43, 0],
    length: 0.17,
    axis: [0, 0, 1],
    radius: 0.047,
    limits: { x: [-50, 40], y: [-28, 28], z: [-22, 22] },
    primaryAxes: ["x", "y"],
    axisLabels: { x: "Point/flex", y: "Rotate", z: "Roll" },
    mirror: "footL",
    collidable: false,
  },
};

export const BONE_IDS = Object.keys(BONES) as BoneId[];

/** Parents always precede children — safe for a single-pass world transform build. */
export const BONE_ORDER: BoneId[] = (() => {
  const out: BoneId[] = [];
  const visit = (id: BoneId) => {
    const def = BONES[id];
    if (def.parent && !out.includes(def.parent)) visit(def.parent);
    if (!out.includes(id)) out.push(id);
  };
  BONE_IDS.forEach(visit);
  return out;
})();

export const CHILDREN: Record<BoneId, BoneId[]> = BONE_IDS.reduce(
  (acc, id) => {
    const parent = BONES[id].parent;
    if (parent) acc[parent].push(id);
    return acc;
  },
  Object.fromEntries(BONE_IDS.map((id) => [id, [] as BoneId[]])) as Record<
    BoneId,
    BoneId[]
  >,
);

export const GROUP_LABELS: Record<BoneGroup, string> = {
  core: "Torso",
  head: "Head & neck",
  armL: "Left arm",
  armR: "Right arm",
  legL: "Left leg",
  legR: "Right leg",
};

export const GROUP_ORDER: BoneGroup[] = [
  "core",
  "head",
  "armL",
  "armR",
  "legL",
  "legR",
];

/** IK chains: dragging the effector solves the two bones above it. */
export interface IkChain {
  effector: BoneId;
  /** Distal bone (e.g. forearm) — the "lower" segment. */
  lower: BoneId;
  /** Proximal bone (e.g. upper arm) — the "upper" segment. */
  upper: BoneId;
  /** Axis of the hinge joint on `lower`, and its bend sign. */
  hingeAxis: Axis;
  hingeSign: 1 | -1;
  label: string;
}

export const IK_CHAINS: IkChain[] = [
  {
    effector: "handL",
    lower: "forearmL",
    upper: "upperArmL",
    hingeAxis: "y",
    hingeSign: -1,
    label: "Left hand",
  },
  {
    effector: "handR",
    lower: "forearmR",
    upper: "upperArmR",
    hingeAxis: "y",
    hingeSign: 1,
    label: "Right hand",
  },
  {
    effector: "footL",
    lower: "shinL",
    upper: "thighL",
    hingeAxis: "x",
    hingeSign: 1,
    label: "Left foot",
  },
  {
    effector: "footR",
    lower: "shinR",
    upper: "thighR",
    hingeAxis: "x",
    hingeSign: 1,
    label: "Right foot",
  },
];

export const IK_BY_EFFECTOR = Object.fromEntries(
  IK_CHAINS.map((c) => [c.effector, c]),
) as Record<string, IkChain | undefined>;

/** Bones whose capsules take part in figure-vs-figure collision. */
export const COLLIDABLE_BONES = BONE_IDS.filter((id) => BONES[id].collidable);
