/**
 * Arsenal — built-in position library.
 *
 * Every preset is authored as plain joint angles and then run through the
 * collision solver, which seats the top figure on the bottom one automatically.
 * That means we only hand-author rotations and rough placement; contact and
 * ground height are derived, so the presets stay physically consistent.
 *
 * Default presets are immutable: `saveAs` on a default always creates a new
 * user preset rather than overwriting the original.
 */

import { resolveCollisions } from "./collision";
import {
  cloneScene,
  defaultCamera,
  groundFigure,
  makeFigure,
  SCENE_VERSION,
  type FigurePose,
  type SceneJSON,
  type Vec3,
} from "./pose";
import type { BoneId } from "./skeleton";

export type PresetCategory =
  | "Standing"
  | "Guard"
  | "Top control"
  | "Back"
  | "Submission"
  | "Scramble";

export const PRESET_CATEGORIES: PresetCategory[] = [
  "Standing",
  "Guard",
  "Top control",
  "Back",
  "Submission",
  "Scramble",
];

export interface PresetDefinition {
  slug: string;
  name: string;
  category: PresetCategory;
  description: string;
  scene: SceneJSON;
}

type Joints = Partial<Record<BoneId, Vec3>>;

/* -------------------------------------------------------------------------- */
/* Reusable joint fragments                                                   */
/* -------------------------------------------------------------------------- */

/** Arms relaxed at the sides. */
const ARMS_DOWN: Joints = {
  upperArmL: [0, -8, -72],
  forearmL: [0, -18, 0],
  upperArmR: [0, 8, 72],
  forearmR: [0, 18, 0],
};

/** Hands up, elbows tight — striking guard. */
const ARMS_HIGH_GUARD: Joints = {
  clavicleL: [0, 0, 8],
  upperArmL: [0, -46, -58],
  forearmL: [0, -120, 0],
  handL: [0, 0, -20],
  clavicleR: [0, 0, -8],
  upperArmR: [0, 46, 58],
  forearmR: [0, 120, 0],
  handR: [0, 0, 20],
};

/** Arms extended forward, e.g. framing or posting. */
const ARMS_FORWARD: Joints = {
  upperArmL: [0, -78, -62],
  forearmL: [0, -22, 0],
  upperArmR: [0, 78, 62],
  forearmR: [0, 22, 0],
};

/** Both knees on the mat, hips low. */
const KNEELING: Joints = {
  thighL: [-10, 4, 7],
  shinL: [142, 0, 0],
  footL: [-30, 0, 0],
  thighR: [-10, -4, -7],
  shinR: [142, 0, 0],
  footR: [-30, 0, 0],
};

/** Combat base — one knee up, one knee down. */
const COMBAT_BASE: Joints = {
  thighL: [-88, 6, 12],
  shinL: [92, 0, 0],
  footL: [-14, 0, 0],
  thighR: [-12, -4, -8],
  shinR: [140, 0, 0],
  footR: [-32, 0, 0],
};

/** Athletic standing stance, weight slightly forward. */
const STANCE: Joints = {
  spine: [6, 0, 0],
  chest: [5, 0, 0],
  neck: [-8, 0, 0],
  thighL: [-18, 6, 7],
  shinL: [26, 0, 0],
  thighR: [-10, -6, -7],
  shinR: [20, 0, 0],
};

/** Legs wrapped and crossed — closed guard. */
const CLOSED_GUARD_LEGS: Joints = {
  thighL: [-104, 10, 20],
  shinL: [118, 0, 0],
  footL: [-16, 0, 0],
  thighR: [-104, -10, -20],
  shinR: [118, 0, 0],
  footR: [-16, 0, 0],
};

/** Knees high and apart — open / butterfly style guard. */
const OPEN_GUARD_LEGS: Joints = {
  thighL: [-96, 14, 34],
  shinL: [86, 0, 0],
  thighR: [-96, -14, -34],
  shinR: [86, 0, 0],
};

/** Legs flat, hips extended — bottom of a pin. */
const LEGS_FLAT: Joints = {
  thighL: [-12, 4, 9],
  shinL: [26, 0, 0],
  thighR: [-12, -4, -9],
  shinR: [26, 0, 0],
};

/** All fours — turtle / base. */
const TURTLE_LEGS: Joints = {
  thighL: [-96, 4, 9],
  shinL: [138, 0, 0],
  thighR: [-96, -4, -9],
  shinR: [138, 0, 0],
};

/* -------------------------------------------------------------------------- */
/* Orientation helpers                                                        */
/* -------------------------------------------------------------------------- */

/** Standing, facing +Z by default. */
const UPRIGHT: Vec3 = [0, 0, 0];
/** Lying on the back: head toward -Z, chest toward the sky. */
const SUPINE: Vec3 = [-90, 0, 0];
/** Lying face down: head toward -Z, chest toward the mat. */
const PRONE: Vec3 = [90, 0, 0];
/** Torso horizontal but upright-ish, as when sprawled or in turtle. */
const HORIZONTAL: Vec3 = [-72, 0, 0];

function figure(
  id: "a" | "b",
  label: string,
  role: "ally" | "opponent",
  position: Vec3,
  rotation: Vec3,
  joints: Joints[],
): FigurePose {
  return {
    ...makeFigure(id, label, role, position, rotation),
    joints: Object.assign({}, ...joints) as Joints,
  };
}

/**
 * Ground both figures, then let the collision solver seat the top one on the
 * bottom one. Grounding first matters: the solver can only ever push bodies
 * apart, so starting the top figure resting on the mat and letting contact
 * lift it is what stops presets from floating. Authored Y offsets are
 * intentionally ignored here.
 */
function seat(bottom: FigurePose, top: FigurePose, camera = defaultCamera()): SceneJSON {
  const grounded = groundFigure(bottom);
  const { figures } = resolveCollisions([grounded, groundFigure(top)], {
    anchoredId: grounded.id,
    iterations: 18,
    stiffness: 0.6,
    slop: 0.005,
    maxPush: 1.2,
  });
  return { v: SCENE_VERSION, figures, camera };
}

/** Both figures stand independently — no seating required. */
function pair(a: FigurePose, b: FigurePose, camera = defaultCamera()): SceneJSON {
  return {
    v: SCENE_VERSION,
    figures: [groundFigure(a), groundFigure(b)],
    camera,
  };
}

// Framing is deliberately tight — at 38° FOV a wider orbit leaves the figures
// as small silhouettes in a lot of empty mat.
const CAM_SIDE = { position: [2.7, 1.3, 0.2] as Vec3, target: [0, 0.5, 0] as Vec3 };
const CAM_ANGLE = { position: [2.3, 1.7, 2.1] as Vec3, target: [0, 0.55, 0] as Vec3 };
const CAM_STAND = { position: [2.4, 1.6, 2.9] as Vec3, target: [0, 1.0, 0] as Vec3 };
const CAM_LOW = { position: [2.5, 0.95, 1.7] as Vec3, target: [0, 0.4, 0] as Vec3 };

/* -------------------------------------------------------------------------- */
/* The library                                                                */
/* -------------------------------------------------------------------------- */

function buildPresets(): PresetDefinition[] {
  return [
    /* ------------------------------------------------------------ Standing */
    {
      slug: "neutral-standing",
      name: "Neutral standing",
      category: "Standing",
      description:
        "Blank slate. Two figures facing each other at range — the starting point for building any standing sequence.",
      scene: pair(
        figure("a", "Athlete", "ally", [0, 0, 0.95], [0, 180, 0], [ARMS_DOWN]),
        figure("b", "Opponent", "opponent", [0, 0, -0.95], UPRIGHT, [ARMS_DOWN]),
        CAM_STAND,
      ),
    },
    {
      slug: "striking-stance",
      name: "Striking stance",
      category: "Standing",
      description:
        "Orthodox stance at kicking range, hands at the temples, lead shoulder rolled forward.",
      scene: pair(
        figure("a", "Athlete", "ally", [0.12, 0, 0.82], [0, 168, 0], [
          STANCE,
          ARMS_HIGH_GUARD,
        ]),
        figure("b", "Opponent", "opponent", [-0.12, 0, -0.82], [0, 12, 0], [
          STANCE,
          ARMS_HIGH_GUARD,
        ]),
        CAM_STAND,
      ),
    },
    {
      slug: "collar-tie-clinch",
      name: "Collar tie clinch",
      category: "Standing",
      description:
        "Double collar tie / Thai plum. Elbows pinched, opponent's posture broken forward.",
      scene: pair(
        figure("a", "Athlete", "ally", [0, 0, 0.42], [0, 180, 0], [
          STANCE,
          {
            spine: [10, 0, 0],
            upperArmL: [0, -84, -18],
            forearmL: [0, -128, 0],
            upperArmR: [0, 84, 18],
            forearmR: [0, 128, 0],
          },
        ]),
        figure("b", "Opponent", "opponent", [0, 0, -0.42], UPRIGHT, [
          STANCE,
          {
            spine: [28, 0, 0],
            chest: [18, 0, 0],
            neck: [-24, 0, 0],
            upperArmL: [0, -70, -46],
            forearmL: [0, -96, 0],
            upperArmR: [0, 70, 46],
            forearmR: [0, 96, 0],
          },
        ]),
        CAM_STAND,
      ),
    },

    /* --------------------------------------------------------------- Guard */
    {
      slug: "closed-guard",
      name: "Closed guard",
      category: "Guard",
      description:
        "Bottom player's ankles crossed behind the opponent's back, top player postured in combat base.",
      scene: seat(
        figure("a", "Athlete", "ally", [0, 0.15, 1.02], SUPINE, [
          CLOSED_GUARD_LEGS,
          {
            spine: [-14, 0, 0],
            chest: [-10, 0, 0],
            neck: [26, 0, 0],
            upperArmL: [0, -56, -34],
            forearmL: [0, -104, 0],
            upperArmR: [0, 56, 34],
            forearmR: [0, 104, 0],
          },
        ]),
        figure("b", "Opponent", "opponent", [0, 0.5, 0.46], [0, 180, 0], [
          COMBAT_BASE,
          ARMS_FORWARD,
          { spine: [12, 0, 0] },
        ]),
        CAM_ANGLE,
      ),
    },
    {
      slug: "open-guard",
      name: "Open guard",
      category: "Guard",
      description:
        "Feet on the hips, knees framing. The hub position for every guard entry.",
      scene: seat(
        figure("a", "Athlete", "ally", [0, 0.15, 1.02], SUPINE, [
          OPEN_GUARD_LEGS,
          {
            spine: [-18, 0, 0],
            chest: [-12, 0, 0],
            neck: [30, 0, 0],
            upperArmL: [0, -62, -30],
            forearmL: [0, -92, 0],
            upperArmR: [0, 62, 30],
            forearmR: [0, 92, 0],
          },
        ]),
        figure("b", "Opponent", "opponent", [0, 0.62, 0.62], [0, 180, 0], [
          COMBAT_BASE,
          ARMS_FORWARD,
        ]),
        CAM_ANGLE,
      ),
    },
    {
      slug: "half-guard",
      name: "Half guard",
      category: "Guard",
      description:
        "Bottom player traps one leg, top player flattens out and hunts the underhook.",
      scene: seat(
        figure("a", "Athlete", "ally", [0.1, 0.15, 1.02], [-90, 0, 24], [
          {
            thighL: [-84, 16, 26],
            shinL: [104, 0, 0],
            thighR: [-24, -6, -12],
            shinR: [40, 0, 0],
            spine: [-10, 14, 0],
            neck: [24, 0, 0],
            upperArmL: [0, -70, -30],
            forearmL: [0, -112, 0],
            upperArmR: [0, 44, 40],
            forearmR: [0, 88, 0],
          },
        ]),
        figure("b", "Opponent", "opponent", [-0.14, 0.62, 0.3], [-64, 176, 0], [
          {
            thighL: [-52, 8, 24],
            shinL: [96, 0, 0],
            thighR: [-16, -6, -16],
            shinR: [56, 0, 0],
            upperArmL: [0, -58, -52],
            forearmL: [0, -46, 0],
            upperArmR: [0, 58, 52],
            forearmR: [0, 46, 0],
          },
        ]),
        CAM_LOW,
      ),
    },
    {
      slug: "butterfly-guard",
      name: "Butterfly guard",
      category: "Guard",
      description:
        "Seated, hooks inside the thighs, underhook on one side — built for elevating and sweeping.",
      scene: seat(
        figure("a", "Athlete", "ally", [0, 0.15, 0.72], [-58, 0, 0], [
          {
            thighL: [-92, 18, 40],
            shinL: [104, 0, 0],
            thighR: [-92, -18, -40],
            shinR: [104, 0, 0],
            spine: [-16, 0, 0],
            upperArmL: [0, -74, -34],
            forearmL: [0, -104, 0],
            upperArmR: [0, 74, 34],
            forearmR: [0, 104, 0],
          },
        ]),
        figure("b", "Opponent", "opponent", [0, 0.5, -0.18], [0, 180, 0], [
          KNEELING,
          ARMS_FORWARD,
          { spine: [16, 0, 0] },
        ]),
        CAM_ANGLE,
      ),
    },

    /* ---------------------------------------------------------- Top control */
    {
      slug: "mount",
      name: "Mount",
      category: "Top control",
      description:
        "Knees pinched to the armpits, hips heavy, bottom player flat and framing.",
      scene: seat(
        figure("a", "Opponent", "opponent", [0, 0.15, 1.02], SUPINE, [
          LEGS_FLAT,
          {
            neck: [26, 0, 0],
            upperArmL: [0, -60, -30],
            forearmL: [0, -108, 0],
            upperArmR: [0, 60, 30],
            forearmR: [0, 108, 0],
          },
        ]),
        figure("b", "Athlete", "ally", [0, 0.72, 0.42], [0, 180, 0], [
          {
            thighL: [-96, 10, 30],
            shinL: [136, 0, 0],
            footL: [-24, 0, 0],
            thighR: [-96, -10, -30],
            shinR: [136, 0, 0],
            footR: [-24, 0, 0],
            spine: [8, 0, 0],
            upperArmL: [0, -66, -46],
            forearmL: [0, -58, 0],
            upperArmR: [0, 66, 46],
            forearmR: [0, 58, 0],
          },
        ]),
        CAM_ANGLE,
      ),
    },
    {
      slug: "side-control",
      name: "Side control",
      category: "Top control",
      description:
        "Cross-face and underhook, chest to chest, hips low and perpendicular.",
      scene: seat(
        figure("a", "Opponent", "opponent", [0, 0.15, 1.02], SUPINE, [
          LEGS_FLAT,
          {
            neck: [22, 26, 0],
            upperArmL: [0, -46, -22],
            forearmL: [0, -86, 0],
            upperArmR: [0, 46, 22],
            forearmR: [0, 86, 0],
          },
        ]),
        figure("b", "Athlete", "ally", [0.78, 0.5, 0.18], [-58, 264, 0], [
          {
            thighL: [-34, 10, 30],
            shinL: [92, 0, 0],
            thighR: [-20, -10, -26],
            shinR: [72, 0, 0],
            upperArmL: [0, -70, -50],
            forearmL: [0, -84, 0],
            upperArmR: [0, 70, 50],
            forearmR: [0, 84, 0],
          },
        ]),
        CAM_ANGLE,
      ),
    },
    {
      slug: "knee-on-belly",
      name: "Knee on belly",
      category: "Top control",
      description:
        "Shin across the sternum, posted leg wide, posture tall for maximum pressure and mobility.",
      scene: seat(
        figure("a", "Opponent", "opponent", [0, 0.15, 1.02], SUPINE, [
          LEGS_FLAT,
          {
            neck: [24, -18, 0],
            upperArmL: [0, -52, -30],
            forearmL: [0, -96, 0],
            upperArmR: [0, 52, 30],
            forearmR: [0, 96, 0],
          },
        ]),
        figure("b", "Athlete", "ally", [0.5, 0.86, 0.2], [0, 250, 0], [
          {
            thighL: [-104, 8, 22],
            shinL: [128, 0, 0],
            thighR: [-26, -14, -42],
            shinR: [34, 0, 0],
            spine: [-6, 0, 0],
            chest: [-8, 0, 0],
            upperArmL: [0, -30, -34],
            forearmL: [0, -52, 0],
            upperArmR: [0, 30, 34],
            forearmR: [0, 52, 0],
          },
        ]),
        CAM_ANGLE,
      ),
    },
    {
      slug: "north-south",
      name: "North-south",
      category: "Top control",
      description:
        "Chest on chest, hips over the head, arms wrapping the far side for the kimura or choke.",
      scene: seat(
        figure("a", "Opponent", "opponent", [0, 0.15, 1.02], SUPINE, [
          LEGS_FLAT,
          {
            upperArmL: [0, -30, -30],
            forearmL: [0, -70, 0],
            upperArmR: [0, 30, 30],
            forearmR: [0, 70, 0],
          },
        ]),
        figure("b", "Athlete", "ally", [0, 0.5, -0.6], [-64, 0, 0], [
          {
            thighL: [-30, 10, 34],
            shinL: [84, 0, 0],
            thighR: [-30, -10, -34],
            shinR: [84, 0, 0],
            upperArmL: [0, -74, -44],
            forearmL: [0, -78, 0],
            upperArmR: [0, 74, 44],
            forearmR: [0, 78, 0],
          },
        ]),
        CAM_SIDE,
      ),
    },

    /* ----------------------------------------------------------------- Back */
    {
      slug: "back-control",
      name: "Back control",
      category: "Back",
      description:
        "Both hooks in, seat belt grip, chest glued to the upper back.",
      scene: seat(
        figure("a", "Opponent", "opponent", [0, 0.15, 0.62], [-52, 0, 0], [
          {
            thighL: [-70, 10, 18],
            shinL: [64, 0, 0],
            thighR: [-70, -10, -18],
            shinR: [64, 0, 0],
            spine: [-8, 0, 0],
            upperArmL: [0, -50, -46],
            forearmL: [0, -96, 0],
            upperArmR: [0, 50, 46],
            forearmR: [0, 96, 0],
          },
        ]),
        figure("b", "Athlete", "ally", [0, 0.3, -0.28], [-52, 0, 0], [
          {
            thighL: [-96, 22, 40],
            shinL: [72, 0, 0],
            thighR: [-96, -22, -40],
            shinR: [72, 0, 0],
            upperArmL: [0, -96, -30],
            forearmL: [0, -128, 0],
            upperArmR: [0, 62, 44],
            forearmR: [0, 118, 0],
          },
        ]),
        CAM_ANGLE,
      ),
    },
    {
      slug: "rear-naked-choke",
      name: "Rear naked choke",
      category: "Submission",
      description:
        "Choking arm under the chin, second hand behind the head, chest expanded.",
      scene: seat(
        figure("a", "Opponent", "opponent", [0, 0.15, 0.62], [-52, 0, 0], [
          {
            thighL: [-70, 10, 18],
            shinL: [64, 0, 0],
            thighR: [-70, -10, -18],
            shinR: [64, 0, 0],
            neck: [-14, 0, 0],
            upperArmL: [0, -34, -54],
            forearmL: [0, -118, 0],
            upperArmR: [0, 34, 54],
            forearmR: [0, 118, 0],
          },
        ]),
        figure("b", "Athlete", "ally", [0, 0.3, -0.28], [-52, 0, 0], [
          {
            thighL: [-96, 22, 40],
            shinL: [72, 0, 0],
            thighR: [-96, -22, -40],
            shinR: [72, 0, 0],
            neck: [-10, 0, 0],
            upperArmL: [0, -118, -8],
            forearmL: [0, -142, 0],
            upperArmR: [0, 34, 74],
            forearmR: [0, 138, 0],
          },
        ]),
        CAM_ANGLE,
      ),
    },

    /* ---------------------------------------------------------- Submission */
    {
      slug: "armbar-from-guard",
      name: "Armbar from guard",
      category: "Submission",
      description:
        "Hips perpendicular, one leg over the face, the trapped arm extended thumb-up.",
      scene: seat(
        figure("a", "Athlete", "ally", [0.1, 0.15, 1.0], [-90, 0, 40], [
          {
            thighL: [-120, 10, 30],
            shinL: [30, 0, 0],
            thighR: [-96, -14, -34],
            shinR: [44, 0, 0],
            spine: [-12, 10, 0],
            upperArmL: [0, -90, -20],
            forearmL: [0, -132, 0],
            upperArmR: [0, 90, 20],
            forearmR: [0, 132, 0],
          },
        ]),
        figure("b", "Opponent", "opponent", [-0.24, 0.44, 0.34], [-40, 186, 0], [
          {
            thighL: [-40, 10, 26],
            shinL: [104, 0, 0],
            thighR: [-40, -10, -26],
            shinR: [104, 0, 0],
            upperArmL: [0, -14, -18],
            forearmL: [0, -8, 0],
            upperArmR: [0, 64, 54],
            forearmR: [0, 74, 0],
          },
        ]),
        CAM_ANGLE,
      ),
    },
    {
      slug: "triangle-choke",
      name: "Triangle choke",
      category: "Submission",
      description:
        "Shin across the neck, own ankle in the knee pit, opponent's arm trapped across the throat.",
      scene: seat(
        figure("a", "Athlete", "ally", [0, 0.15, 1.0], [-90, 0, 16], [
          {
            thighL: [-128, 20, 34],
            shinL: [104, 0, 0],
            thighR: [-108, -16, -28],
            shinR: [126, 0, 0],
            spine: [-24, 6, 0],
            neck: [34, 0, 0],
            upperArmL: [0, -84, -26],
            forearmL: [0, -138, 0],
            upperArmR: [0, 84, 26],
            forearmR: [0, 138, 0],
          },
        ]),
        figure("b", "Opponent", "opponent", [0.06, 0.5, 0.36], [-42, 184, 0], [
          {
            thighL: [-38, 8, 26],
            shinL: [110, 0, 0],
            thighR: [-38, -8, -26],
            shinR: [110, 0, 0],
            neck: [16, 0, 0],
            upperArmL: [0, -34, -30],
            forearmL: [0, -96, 0],
            upperArmR: [0, 46, 62],
            forearmR: [0, 40, 0],
          },
        ]),
        CAM_ANGLE,
      ),
    },
    {
      slug: "kimura-from-side",
      name: "Kimura from side control",
      category: "Submission",
      description:
        "Figure-four on the wrist and tricep, elbow lifted off the mat, hips blocking the roll.",
      scene: seat(
        figure("a", "Opponent", "opponent", [0, 0.15, 1.02], SUPINE, [
          LEGS_FLAT,
          {
            neck: [20, 22, 0],
            upperArmL: [0, -110, -6],
            forearmL: [0, -118, 0],
            upperArmR: [0, 40, 26],
            forearmR: [0, 82, 0],
          },
        ]),
        figure("b", "Athlete", "ally", [0.72, 0.5, 0.3], [-56, 252, 0], [
          {
            thighL: [-36, 10, 32],
            shinL: [90, 0, 0],
            thighR: [-22, -10, -28],
            shinR: [76, 0, 0],
            upperArmL: [0, -104, -28],
            forearmL: [0, -126, 0],
            upperArmR: [0, 84, 34],
            forearmR: [0, 124, 0],
          },
        ]),
        CAM_ANGLE,
      ),
    },
    {
      slug: "guillotine",
      name: "Guillotine",
      category: "Submission",
      description:
        "High-elbow guillotine from the front headlock, opponent's head trapped under the armpit.",
      scene: seat(
        figure("a", "Opponent", "opponent", [0, 0.15, -0.05], HORIZONTAL, [
          TURTLE_LEGS,
          {
            neck: [-30, 0, 0],
            upperArmL: [0, -60, -66],
            forearmL: [0, -18, 0],
            upperArmR: [0, 60, 66],
            forearmR: [0, 18, 0],
          },
        ]),
        figure("b", "Athlete", "ally", [0, 0.4, -0.66], [0, 0, 0], [
          COMBAT_BASE,
          {
            spine: [16, 0, 0],
            upperArmL: [0, -108, -18],
            forearmL: [0, -140, 0],
            upperArmR: [0, 96, 26],
            forearmR: [0, 136, 0],
          },
        ]),
        CAM_LOW,
      ),
    },

    /* ------------------------------------------------------------- Scramble */
    {
      slug: "turtle-front-headlock",
      name: "Turtle & front headlock",
      category: "Scramble",
      description:
        "Defensive turtle with the attacker chest-down on the back of the head, hunting the choke or the back.",
      scene: seat(
        figure("a", "Opponent", "opponent", [0, 0.15, 0], HORIZONTAL, [
          TURTLE_LEGS,
          {
            neck: [-26, 0, 0],
            upperArmL: [0, -58, -70],
            forearmL: [0, -20, 0],
            upperArmR: [0, 58, 70],
            forearmR: [0, 20, 0],
          },
        ]),
        figure("b", "Athlete", "ally", [0.1, 0.62, -0.72], [-44, 12, 0], [
          {
            thighL: [-50, 10, 26],
            shinL: [96, 0, 0],
            thighR: [-30, -10, -22],
            shinR: [78, 0, 0],
            upperArmL: [0, -96, -30],
            forearmL: [0, -130, 0],
            upperArmR: [0, 82, 38],
            forearmR: [0, 120, 0],
          },
        ]),
        CAM_LOW,
      ),
    },
    {
      slug: "sprawl",
      name: "Sprawl",
      category: "Scramble",
      description:
        "Hips dropped on the shot, legs kicked back, forearm crossface driving the head down.",
      scene: seat(
        figure("a", "Opponent", "opponent", [0, 0.15, -0.1], [58, 0, 0], [
          {
            thighL: [-98, 8, 16],
            shinL: [96, 0, 0],
            thighR: [-56, -8, -14],
            shinR: [64, 0, 0],
            neck: [-34, 0, 0],
            upperArmL: [0, -86, -50],
            forearmL: [0, -34, 0],
            upperArmR: [0, 86, 50],
            forearmR: [0, 34, 0],
          },
        ]),
        figure("b", "Athlete", "ally", [0, 0.66, -0.78], [72, 180, 0], [
          {
            thighL: [-6, 8, 14],
            shinL: [18, 0, 0],
            thighR: [-6, -8, -14],
            shinR: [18, 0, 0],
            spine: [-16, 0, 0],
            neck: [-20, 0, 0],
            upperArmL: [0, -92, -34],
            forearmL: [0, -110, 0],
            upperArmR: [0, 92, 34],
            forearmR: [0, 110, 0],
          },
        ]),
        CAM_LOW,
      ),
    },
    {
      slug: "double-leg-finish",
      name: "Double leg finish",
      category: "Scramble",
      description:
        "Head to the ribs, both legs captured, driving through the far hip on the level change.",
      scene: pair(
        figure("a", "Athlete", "ally", [0, 0, -0.34], [0, 4, 0], [
          {
            thighL: [-96, 8, 16],
            shinL: [116, 0, 0],
            thighR: [-40, -8, -18],
            shinR: [72, 0, 0],
            spine: [34, 0, 0],
            chest: [22, 0, 0],
            neck: [-18, 26, 0],
            upperArmL: [0, -104, -22],
            forearmL: [0, -132, 0],
            upperArmR: [0, 104, 22],
            forearmR: [0, 132, 0],
          },
        ]),
        figure("b", "Opponent", "opponent", [0, 0, 0.28], [0, 180, 0], [
          {
            thighL: [-24, 8, 12],
            shinL: [44, 0, 0],
            thighR: [-12, -8, -12],
            shinR: [26, 0, 0],
            spine: [18, 0, 0],
            upperArmL: [0, -66, -54],
            forearmL: [0, -70, 0],
            upperArmR: [0, 66, 54],
            forearmR: [0, 70, 0],
          },
        ]),
        CAM_LOW,
      ),
    },
    {
      slug: "ground-and-pound",
      name: "Ground and pound",
      category: "Scramble",
      description:
        "Postured up in mount, one hand pinning the head, the other cocked back to strike.",
      scene: seat(
        figure("a", "Opponent", "opponent", [0, 0.15, 1.02], SUPINE, [
          LEGS_FLAT,
          {
            neck: [28, -14, 0],
            upperArmL: [0, -40, -34],
            forearmL: [0, -110, 0],
            upperArmR: [0, 40, 34],
            forearmR: [0, 110, 0],
          },
        ]),
        figure("b", "Athlete", "ally", [0, 0.74, 0.4], [0, 180, 0], [
          {
            thighL: [-98, 10, 32],
            shinL: [134, 0, 0],
            thighR: [-98, -10, -32],
            shinR: [134, 0, 0],
            spine: [-8, 0, 0],
            chest: [-6, 12, 0],
            upperArmL: [0, -76, -50],
            forearmL: [0, -40, 0],
            upperArmR: [0, 118, 40],
            forearmR: [0, 128, 0],
          },
        ]),
        CAM_ANGLE,
      ),
    },
    {
      slug: "arms-posted",
      name: "Technical stand-up",
      category: "Scramble",
      description:
        "Posted on one hand and the opposite foot, free hand framing — the safe way back to the feet.",
      scene: pair(
        figure("a", "Athlete", "ally", [0, 0, 0.4], [-40, 200, 0], [
          {
            thighL: [-108, 10, 22],
            shinL: [122, 0, 0],
            thighR: [-46, -10, -20],
            shinR: [40, 0, 0],
            spine: [-14, 0, 0],
            upperArmL: [0, -30, -84],
            forearmL: [0, -10, 0],
            upperArmR: [0, 92, 40],
            forearmR: [0, 96, 0],
          },
        ]),
        figure("b", "Opponent", "opponent", [0, 0, -0.85], UPRIGHT, [
          STANCE,
          ARMS_HIGH_GUARD,
        ]),
        CAM_LOW,
      ),
    },
  ];
}

/** Frozen at module load; consumers always receive a deep copy. */
const PRESETS = buildPresets();

export const DEFAULT_PRESETS: readonly PresetDefinition[] = PRESETS;

export const DEFAULT_PRESET_SLUGS = new Set(PRESETS.map((p) => p.slug));

export function isDefaultPreset(slug: string) {
  return DEFAULT_PRESET_SLUGS.has(slug);
}

export function getDefaultPreset(slug: string): PresetDefinition | undefined {
  return PRESETS.find((p) => p.slug === slug);
}

/** Deep copy so the caller can never mutate the shared default library. */
export function loadDefaultScene(slug: string): SceneJSON | null {
  const preset = getDefaultPreset(slug);
  return preset ? cloneScene(preset.scene) : null;
}

export function startingScene(): SceneJSON {
  return cloneScene(PRESETS[0].scene);
}

/** Presets grouped for the editor's preset picker. */
export function presetsByCategory() {
  return PRESET_CATEGORIES.map((category) => ({
    category,
    presets: PRESETS.filter((p) => p.category === category),
  })).filter((g) => g.presets.length > 0);
}
