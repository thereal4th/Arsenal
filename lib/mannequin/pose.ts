/**
 * Arsenal — pose model, forward kinematics, IK and serialisation.
 *
 * Everything a technique needs to be reconstructed lives in `SceneJSON`, which
 * is plain JSON: no binary blobs, no external model files. That makes poses
 * cheap to store in MongoDB, easy to diff, and trivially shareable.
 */

import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { clamp, DEG, RAD } from "@/lib/utils";
import {
  BONE_ORDER,
  BONES,
  COLLIDABLE_BONES,
  EULER_ORDER,
  type Axis,
  type BoneId,
  type IkChain,
  type Vec3,
} from "./skeleton";

// Re-exported so consumers of a pose do not need to reach into the skeleton
// module just for the coordinate tuple type.
export type { Vec3 } from "./skeleton";

export const SCENE_VERSION = 1 as const;

export type FigureRole = "ally" | "opponent";

export interface FigurePose {
  /** Stable id within the scene ("a" | "b"). */
  id: string;
  label: string;
  role: FigureRole;
  /** Root translation in metres. */
  position: Vec3;
  /** Root rotation in degrees (YXZ). */
  rotation: Vec3;
  /** Uniform scale — lets users depict size mismatches. */
  scale: number;
  /** Sparse map of bone -> euler degrees. Missing bones are at rest. */
  joints: Partial<Record<BoneId, Vec3>>;
  /** Whether the figure is frozen in place */
  frozen?: boolean;
}

export interface SceneCamera {
  position: Vec3;
  target: Vec3;
}

export interface SceneJSON {
  v: typeof SCENE_VERSION;
  figures: FigurePose[];
  camera: SceneCamera;
}

/* ========================================================================== */
/* Construction                                                               */
/* ========================================================================== */

export function makeFigure(
  id: string,
  label: string,
  role: FigureRole,
  position: Vec3 = [0, 0, 0],
  rotation: Vec3 = [0, 0, 0],
): FigurePose {
  return { id, label, role, position, rotation, scale: 1, joints: {} };
}

export function defaultCamera(): SceneCamera {
  return { position: [2.4, 1.7, 3.0], target: [0, 0.75, 0] };
}

export function emptyScene(): SceneJSON {
  return {
    v: SCENE_VERSION,
    figures: [
      makeFigure("a", "Athlete", "ally", [0, 0, 0.55], [0, 180, 0]),
      makeFigure("b", "Opponent", "opponent", [0, 0, -0.55], [0, 0, 0]),
    ],
    camera: defaultCamera(),
  };
}

export function cloneScene(scene: SceneJSON): SceneJSON {
  return JSON.parse(JSON.stringify(scene)) as SceneJSON;
}

/* ========================================================================== */
/* Joint access & limits                                                      */
/* ========================================================================== */

export function getJoint(figure: FigurePose, bone: BoneId): Vec3 {
  return figure.joints[bone] ?? [0, 0, 0];
}

/** Clamp a euler triple to the bone's configured limits. */
export function clampJoint(bone: BoneId, value: Vec3): Vec3 {
  const { limits } = BONES[bone];
  return [
    clamp(value[0], limits.x[0], limits.x[1]),
    clamp(value[1], limits.y[0], limits.y[1]),
    clamp(value[2], limits.z[0], limits.z[1]),
  ];
}

export function setJoint(
  figure: FigurePose,
  bone: BoneId,
  value: Vec3,
): FigurePose {
  return {
    ...figure,
    joints: { ...figure.joints, [bone]: clampJoint(bone, value) },
  };
}

export function setJointAxis(
  figure: FigurePose,
  bone: BoneId,
  axis: Axis,
  degrees: number,
): FigurePose {
  const next: Vec3 = [...getJoint(figure, bone)] as Vec3;
  next[axis === "x" ? 0 : axis === "y" ? 1 : 2] = degrees;
  return setJoint(figure, bone, next);
}

/* ========================================================================== */
/* Forward kinematics                                                         */
/* ========================================================================== */

const _m = new Matrix4();
const _q = new Quaternion();
const _e = new Euler();
const _v = new Vector3();
const _s = new Vector3(1, 1, 1);

export type WorldMatrices = Record<BoneId, Matrix4>;

/** Root transform (position + rotation + uniform scale) as a matrix. */
export function rootMatrix(figure: FigurePose): Matrix4 {
  _e.set(
    figure.rotation[0] * DEG,
    figure.rotation[1] * DEG,
    figure.rotation[2] * DEG,
    EULER_ORDER,
  );
  _q.setFromEuler(_e);
  _v.set(...figure.position);
  const s = figure.scale || 1;
  return new Matrix4().compose(_v, _q, new Vector3(s, s, s));
}

/**
 * Build a world matrix per bone. Bones are visited parent-first, so this is a
 * single O(n) pass with no recursion.
 */
export function buildWorldMatrices(figure: FigurePose): WorldMatrices {
  const out = {} as WorldMatrices;
  const root = rootMatrix(figure);

  for (const id of BONE_ORDER) {
    const def = BONES[id];
    const j = getJoint(figure, id);
    _e.set(j[0] * DEG, j[1] * DEG, j[2] * DEG, EULER_ORDER);
    _q.setFromEuler(_e);
    _v.set(...def.offset);
    _m.compose(_v, _q, _s);

    const parent = def.parent ? out[def.parent] : root;
    out[id] = new Matrix4().multiplyMatrices(parent, _m);
  }
  return out;
}

/** World-space position of a bone's joint (its origin). */
export function jointPosition(world: WorldMatrices, bone: BoneId): Vector3 {
  return new Vector3().setFromMatrixPosition(world[bone]);
}

/** World-space position of a bone's far end (joint + axis * length). */
export function boneTip(world: WorldMatrices, bone: BoneId): Vector3 {
  const def = BONES[bone];
  return new Vector3(
    def.axis[0] * def.length,
    def.axis[1] * def.length,
    def.axis[2] * def.length,
  ).applyMatrix4(world[bone]);
}

/* ========================================================================== */
/* Collision proxies                                                          */
/* ========================================================================== */

export interface Capsule {
  bone: BoneId;
  a: Vector3;
  b: Vector3;
  radius: number;
}

/** Capsule proxies for every collidable bone, in world space. */
export function figureCapsules(
  figure: FigurePose,
  world?: WorldMatrices,
): Capsule[] {
  const w = world ?? buildWorldMatrices(figure);
  const scale = figure.scale || 1;
  return COLLIDABLE_BONES.map((bone) => ({
    bone,
    a: jointPosition(w, bone),
    b: boneTip(w, bone),
    radius: BONES[bone].radius * scale,
  }));
}

/* ========================================================================== */
/* Two-bone IK                                                                */
/* ========================================================================== */

const axisIndex: Record<Axis, 0 | 1 | 2> = { x: 0, y: 1, z: 2 };

/**
 * Solve a two-bone chain so the effector joint reaches `target`.
 *
 * Step 1 sets the hinge (elbow / knee) via the law of cosines.
 * Step 2 swings the proximal bone so the chain points at the target.
 * Both steps respect the bone limits, so the result is always anatomically
 * plausible even if the target is unreachable.
 */
export function solveTwoBoneIK(
  figure: FigurePose,
  chain: IkChain,
  target: Vector3,
): FigurePose {
  let next = figure;
  let world = buildWorldMatrices(next);

  const root = jointPosition(world, chain.upper);
  const mid = jointPosition(world, chain.lower);
  const end = jointPosition(world, chain.effector);

  const l1 = root.distanceTo(mid);
  const l2 = mid.distanceTo(end);
  if (l1 < 1e-5 || l2 < 1e-5) return figure;

  // --- 1. hinge angle -------------------------------------------------------
  const maxReach = (l1 + l2) * 0.999;
  const minReach = Math.abs(l1 - l2) * 1.001;
  const dist = clamp(root.distanceTo(target), minReach, maxReach);

  const cosInterior = clamp(
    (l1 * l1 + l2 * l2 - dist * dist) / (2 * l1 * l2),
    -1,
    1,
  );
  const bendDeg = (Math.PI - Math.acos(cosInterior)) * RAD;

  const hinge: Vec3 = [...getJoint(next, chain.lower)] as Vec3;
  hinge[axisIndex[chain.hingeAxis]] = chain.hingeSign * bendDeg;
  next = setJoint(next, chain.lower, hinge);

  // --- 2. aim the proximal bone --------------------------------------------
  world = buildWorldMatrices(next);
  const newRoot = jointPosition(world, chain.upper);
  const newEnd = jointPosition(world, chain.effector);

  const from = newEnd.clone().sub(newRoot);
  const to = target.clone().sub(newRoot);
  if (from.lengthSq() < 1e-8 || to.lengthSq() < 1e-8) return next;

  const delta = new Quaternion().setFromUnitVectors(
    from.normalize(),
    to.normalize(),
  );

  const upperDef = BONES[chain.upper];
  const parentWorld = upperDef.parent
    ? world[upperDef.parent]
    : rootMatrix(next);
  const parentQuat = new Quaternion().setFromRotationMatrix(parentWorld);

  const currentLocal = new Quaternion().setFromEuler(
    eulerFromDegrees(getJoint(next, chain.upper)),
  );
  const currentWorld = parentQuat.clone().multiply(currentLocal);
  const targetWorld = delta.multiply(currentWorld);
  const targetLocal = parentQuat.clone().invert().multiply(targetWorld);

  const euler = new Euler().setFromQuaternion(targetLocal, EULER_ORDER);
  return setJoint(next, chain.upper, [
    euler.x * RAD,
    euler.y * RAD,
    euler.z * RAD,
  ]);
}

function eulerFromDegrees(v: Vec3) {
  return new Euler(v[0] * DEG, v[1] * DEG, v[2] * DEG, EULER_ORDER);
}

/* ========================================================================== */
/* Pose utilities                                                             */
/* ========================================================================== */

/** Mirror a pose left <-> right. Handy for building both sides of a technique. */
export function mirrorFigure(figure: FigurePose): FigurePose {
  const joints: Partial<Record<BoneId, Vec3>> = {};
  for (const id of BONE_ORDER) {
    const def = BONES[id];
    const source = def.mirror ?? id;
    const v = getJoint(figure, source);
    // Mirroring across the YZ plane negates yaw and roll, preserves pitch.
    joints[id] = clampJoint(id, [v[0], -v[1], -v[2]]);
  }
  return {
    ...figure,
    position: [-figure.position[0], figure.position[1], figure.position[2]],
    rotation: [figure.rotation[0], -figure.rotation[1], -figure.rotation[2]],
    joints,
  };
}

/** Lowest world-space point of the figure, used to keep it on the mat. */
export function figureFloorOffset(figure: FigurePose): number {
  const capsules = figureCapsules(figure);
  let lowest = Infinity;
  for (const c of capsules) {
    lowest = Math.min(lowest, c.a.y - c.radius, c.b.y - c.radius);
  }
  return Number.isFinite(lowest) ? lowest : 0;
}

/** Drop / lift a figure so its lowest point rests on y = 0. */
export function groundFigure(figure: FigurePose): FigurePose {
  const offset = figureFloorOffset(figure);
  if (Math.abs(offset) < 1e-4) return figure;
  return {
    ...figure,
    position: [
      figure.position[0],
      figure.position[1] - offset,
      figure.position[2],
    ],
  };
}

/* ========================================================================== */
/* Validation                                                                 */
/* ========================================================================== */

const isVec3 = (v: unknown): v is Vec3 =>
  Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === "number" && Number.isFinite(n));

/**
 * Defensive parse for scene JSON arriving from the database or a shared link.
 * Unknown bones are dropped and every angle is clamped, so a malformed or
 * hostile payload can never produce a broken render.
 */
export function parseScene(input: unknown): SceneJSON | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<SceneJSON>;
  if (!Array.isArray(raw.figures) || raw.figures.length === 0) return null;

  const figures: FigurePose[] = raw.figures.slice(0, 2).map((f, i) => {
    const joints: Partial<Record<BoneId, Vec3>> = {};
    const src = (f?.joints ?? {}) as Record<string, unknown>;
    for (const key of Object.keys(src)) {
      if (!(key in BONES)) continue;
      const value = src[key];
      if (!isVec3(value)) continue;
      joints[key as BoneId] = clampJoint(key as BoneId, value);
    }
    return {
      id: typeof f?.id === "string" ? f.id : i === 0 ? "a" : "b",
      label: typeof f?.label === "string" ? f.label.slice(0, 40) : `Figure ${i + 1}`,
      role: f?.role === "opponent" ? "opponent" : "ally",
      position: isVec3(f?.position) ? f.position : [0, 0, 0],
      rotation: isVec3(f?.rotation) ? f.rotation : [0, 0, 0],
      scale: typeof f?.scale === "number" ? clamp(f.scale, 0.7, 1.4) : 1,
      joints,
      frozen: typeof f?.frozen === "boolean" ? f.frozen : false,
    };
  });

  const cam = raw.camera;
  return {
    v: SCENE_VERSION,
    figures,
    camera: {
      position: isVec3(cam?.position) ? cam.position : defaultCamera().position,
      target: isVec3(cam?.target) ? cam.target : defaultCamera().target,
    },
  };
}
