/**
 * Arsenal — figure-vs-figure collision response.
 *
 * Each bone is approximated by a capsule. When two figures interpenetrate we
 * compute a minimum translation vector from the overlapping capsule pairs and
 * push the figures apart along it, so dragging one mannequin into the other
 * displaces the other rather than clipping through it.
 *
 * Only root translation is corrected. Rotating the pushed figure would look
 * more physical but makes the solver oscillate badly for deeply interlocked
 * grappling positions, which are exactly the poses this app exists to draw.
 */

import { Vector3 } from "three";
import { clamp } from "@/lib/utils";
import {
  buildWorldMatrices,
  figureCapsules,
  type Capsule,
  type FigurePose,
  type Vec3,
} from "./pose";

export interface CollisionOptions {
  /** Figure id that must not move (usually the one being dragged). */
  anchoredId?: string;
  /** Solver passes. More = tighter separation, slightly more CPU. */
  iterations?: number;
  /**
   * Fraction of the overlap resolved per pass. Below 1 the solver relaxes into
   * a stable result instead of jittering between contacts.
   */
  stiffness?: number;
  /** Overlap tolerated before a contact counts, in metres. Allows soft grips. */
  slop?: number;
  /** Cap on how far a figure may be displaced in one solve, in metres. */
  maxPush?: number;
  /** Prevent figures from being pushed below the mat. */
  keepAboveGround?: boolean;
}

const DEFAULTS: Required<Omit<CollisionOptions, "anchoredId">> = {
  iterations: 6,
  stiffness: 0.5,
  slop: 0.02,
  maxPush: 0.6,
  keepAboveGround: true,
};

/* -------------------------------------------------------------------------- */
/* Segment maths                                                              */
/* -------------------------------------------------------------------------- */

const _d1 = new Vector3();
const _d2 = new Vector3();
const _r = new Vector3();
const _c1 = new Vector3();
const _c2 = new Vector3();

/**
 * Closest points between segments [p1,q1] and [p2,q2].
 * Real-Time Collision Detection, Ericson, §5.1.9.
 */
function closestPointsBetweenSegments(
  p1: Vector3,
  q1: Vector3,
  p2: Vector3,
  q2: Vector3,
  outA: Vector3,
  outB: Vector3,
) {
  _d1.subVectors(q1, p1);
  _d2.subVectors(q2, p2);
  _r.subVectors(p1, p2);

  const a = _d1.dot(_d1);
  const e = _d2.dot(_d2);
  const f = _d2.dot(_r);

  let s: number;
  let t: number;
  const EPS = 1e-8;

  if (a <= EPS && e <= EPS) {
    s = 0;
    t = 0;
  } else if (a <= EPS) {
    s = 0;
    t = clamp(f / e, 0, 1);
  } else {
    const c = _d1.dot(_r);
    if (e <= EPS) {
      t = 0;
      s = clamp(-c / a, 0, 1);
    } else {
      const b = _d1.dot(_d2);
      const denom = a * e - b * b;
      s = denom !== 0 ? clamp((b * f - c * e) / denom, 0, 1) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp(-c / a, 0, 1);
      } else if (t > 1) {
        t = 1;
        s = clamp((b - c) / a, 0, 1);
      }
    }
  }

  outA.copy(p1).addScaledVector(_d1, s);
  outB.copy(p2).addScaledVector(_d2, t);
}

/* -------------------------------------------------------------------------- */
/* Contacts                                                                   */
/* -------------------------------------------------------------------------- */

export interface Contact {
  boneA: string;
  boneB: string;
  /** Unit vector pointing from figure A toward figure B. */
  normal: Vector3;
  /** Overlap depth in metres. */
  depth: number;
  /** Midpoint of the contact, useful for debug rendering. */
  point: Vector3;
}

/** All overlapping capsule pairs between two capsule sets. */
export function findContacts(
  capsulesA: Capsule[],
  capsulesB: Capsule[],
  slop = DEFAULTS.slop,
): Contact[] {
  const contacts: Contact[] = [];

  for (const ca of capsulesA) {
    for (const cb of capsulesB) {
      closestPointsBetweenSegments(ca.a, ca.b, cb.a, cb.b, _c1, _c2);

      const delta = new Vector3().subVectors(_c2, _c1);
      let dist = delta.length();
      const minDist = ca.radius + cb.radius - slop;
      if (dist >= minDist) continue;

      // Degenerate: perfectly coincident axes. Push apart along a stable axis.
      if (dist < 1e-6) {
        delta.set(0, 0, 1);
        dist = 1e-6;
      }

      contacts.push({
        boneA: ca.bone,
        boneB: cb.bone,
        normal: delta.clone().divideScalar(dist),
        depth: minDist - dist,
        point: new Vector3().addVectors(_c1, _c2).multiplyScalar(0.5),
      });
    }
  }

  return contacts;
}

/* -------------------------------------------------------------------------- */
/* Solver                                                                     */
/* -------------------------------------------------------------------------- */

function addScaled(position: Vec3, dir: Vector3, scale: number): Vec3 {
  return [
    position[0] + dir.x * scale,
    position[1] + dir.y * scale,
    position[2] + dir.z * scale,
  ];
}

/**
 * Separate two figures. Returns new figure objects (never mutates the input)
 * so the result can be dropped straight into React state.
 */
export function resolveCollisions(
  figures: FigurePose[],
  options: CollisionOptions = {},
): { figures: FigurePose[]; contacts: Contact[]; moved: boolean } {
  const opts = { ...DEFAULTS, ...options };

  if (figures.length < 2) {
    return { figures, contacts: [], moved: false };
  }

  let a = figures[0];
  let b = figures[1];

  const aAnchored = opts.anchoredId === a.id;
  const bAnchored = opts.anchoredId === b.id;

  // Weight the correction: an anchored figure absorbs none of the displacement.
  let wA = aAnchored ? 0 : 1;
  let wB = bAnchored ? 0 : 1;
  if (wA === 0 && wB === 0) {
    wA = 0.5;
    wB = 0.5;
  }
  const total = wA + wB;
  wA /= total;
  wB /= total;

  const startA = new Vector3(...a.position);
  const startB = new Vector3(...b.position);

  let contacts: Contact[] = [];
  const push = new Vector3();

  for (let i = 0; i < opts.iterations; i++) {
    const capsA = figureCapsules(a, buildWorldMatrices(a));
    const capsB = figureCapsules(b, buildWorldMatrices(b));

    contacts = findContacts(capsA, capsB, opts.slop);
    if (contacts.length === 0) break;

    // Average the contact normals weighted by depth: deep overlaps dominate,
    // which stops a single glancing touch from throwing the figure across the mat.
    push.set(0, 0, 0);
    let depthSum = 0;
    for (const c of contacts) {
      push.addScaledVector(c.normal, c.depth);
      depthSum += c.depth;
    }
    if (depthSum < 1e-6) break;

    push.divideScalar(contacts.length).multiplyScalar(opts.stiffness);
    if (push.lengthSq() < 1e-10) break;

    // `normal` points A -> B, so B moves along it and A against it.
    if (wA > 0) a = { ...a, position: addScaled(a.position, push, -wA) };
    if (wB > 0) b = { ...b, position: addScaled(b.position, push, wB) };
  }

  // Clamp total displacement so a bad pose can never fling a figure off-screen.
  a = clampDisplacement(a, startA, opts.maxPush);
  b = clampDisplacement(b, startB, opts.maxPush);

  if (opts.keepAboveGround) {
    a = liftAboveGround(a);
    b = liftAboveGround(b);
  }

  const moved =
    !samePosition(a.position, figures[0].position) ||
    !samePosition(b.position, figures[1].position);

  return { figures: [a, ...figures.slice(1).map((f, i) => (i === 0 ? b : f))], contacts, moved };
}

function clampDisplacement(
  figure: FigurePose,
  start: Vector3,
  maxPush: number,
): FigurePose {
  const delta = new Vector3(...figure.position).sub(start);
  const len = delta.length();
  if (len <= maxPush) return figure;
  delta.multiplyScalar(maxPush / len);
  return {
    ...figure,
    position: [start.x + delta.x, start.y + delta.y, start.z + delta.z],
  };
}

function liftAboveGround(figure: FigurePose): FigurePose {
  const caps = figureCapsules(figure);
  let lowest = Infinity;
  for (const c of caps) lowest = Math.min(lowest, c.a.y - c.radius, c.b.y - c.radius);
  if (!Number.isFinite(lowest) || lowest >= -1e-4) return figure;
  return {
    ...figure,
    position: [figure.position[0], figure.position[1] - lowest, figure.position[2]],
  };
}

function samePosition(a: Vec3, b: Vec3) {
  return (
    Math.abs(a[0] - b[0]) < 1e-5 &&
    Math.abs(a[1] - b[1]) < 1e-5 &&
    Math.abs(a[2] - b[2]) < 1e-5
  );
}
