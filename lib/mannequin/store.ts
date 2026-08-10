"use client";

import { create } from "zustand";
import type { Vector3 } from "three";
import { resolveCollisions } from "@/lib/mannequin/collision";
import {
  cloneScene,
  groundFigure,
  mirrorFigure,
  setJoint,
  setJointAxis,
  solveTwoBoneIK,
  type FigurePose,
  type SceneJSON,
  type Vec3,
} from "@/lib/mannequin/pose";
import { startingScene } from "@/lib/mannequin/presets";
import { BONES, IK_BY_EFFECTOR, type Axis, type BoneId } from "@/lib/mannequin/skeleton";

export type GizmoMode = "rotate" | "translate" | "off";
export type ControlMode = "simple" | "advanced";

interface EditorState {
  scene: SceneJSON;

  /** Index into `scene.figures`. */
  activeFigure: number;
  selectedBone: BoneId | null;
  hoveredBone: BoneId | null;

  gizmoMode: GizmoMode;
  controlMode: ControlMode;
  /** When true the gizmo drives the whole figure instead of a single joint. */
  moveWholeFigure: boolean;

  collisionsEnabled: boolean;
  symmetry: boolean;
  showHandles: boolean;
  showGrid: boolean;
  dimInactiveFigure: boolean;
  /** Suppresses OrbitControls while a gizmo or IK handle is being dragged. */
  isDragging: boolean;

  /** Name of the preset the scene was loaded from, for the save dialog. */
  loadedPresetName: string | null;
  loadedPresetIsDefault: boolean;
  dirty: boolean;

  past: SceneJSON[];
  future: SceneJSON[];
}

interface EditorActions {
  loadScene: (scene: SceneJSON, meta?: { name?: string; isDefault?: boolean }) => void;
  commit: () => void;

  setActiveFigure: (index: number) => void;
  selectBone: (bone: BoneId | null) => void;
  hoverBone: (bone: BoneId | null) => void;

  setJointAngle: (bone: BoneId, axis: Axis, degrees: number) => void;
  setJointAngles: (bone: BoneId, value: Vec3) => void;
  resetBone: (bone: BoneId) => void;
  resetFigurePose: () => void;
  mirrorActiveFigure: () => void;

  setFigureTransform: (position?: Vec3, rotation?: Vec3) => void;
  setFigureScale: (scale: number) => void;
  groundActiveFigure: () => void;

  dragIk: (effector: BoneId, target: Vector3) => void;

  setGizmoMode: (mode: GizmoMode) => void;
  setControlMode: (mode: ControlMode) => void;
  setMoveWholeFigure: (value: boolean) => void;
  toggleFigureFrozen: (index: number) => void; //index represents an individual mannequin for lookups to toggle freeze state, can be 0 or 1.
  toggle: (key: "collisionsEnabled" | "symmetry" | "showHandles" | "showGrid" | "dimInactiveFigure") => void;
  setDragging: (value: boolean) => void;

  setCamera: (position: Vec3, target: Vec3) => void;

  undo: () => void;
  redo: () => void;
}

const HISTORY_LIMIT = 50;

/** Apply the collision solver, holding the figure the user is editing still. */
function settle(scene: SceneJSON, anchoredIndex: number, enabled: boolean): SceneJSON {
  if (!enabled || scene.figures.length < 2) return scene;
  const { figures } = resolveCollisions(scene.figures, {
    anchoredId: scene.figures[anchoredIndex]?.id,
  });
  return { ...scene, figures };
}

function updateFigure(
  state: EditorState,
  updater: (figure: FigurePose) => FigurePose,
): Partial<EditorState> {
  const index = state.activeFigure;
  const figures = state.scene.figures.map((f, i) => (i === index ? updater(f) : f));
  const next = settle({ ...state.scene, figures }, index, state.collisionsEnabled);
  return { scene: next, dirty: true };
}

export const useEditor = create<EditorState & EditorActions>((set, get) => ({
  scene: startingScene(),
  activeFigure: 0,
  selectedBone: null,
  hoveredBone: null,

  gizmoMode: "rotate",
  controlMode: "simple",
  moveWholeFigure: false,

  collisionsEnabled: true,
  symmetry: false,
  showHandles: true,
  showGrid: true,
  dimInactiveFigure: true,
  isDragging: false,

  loadedPresetName: null,
  loadedPresetIsDefault: false,
  dirty: false,

  past: [],
  future: [],

  /* ----------------------------------------------------------------- scene */

  loadScene: (scene, meta) =>
    set((state) => ({
      past: [...state.past, state.scene].slice(-HISTORY_LIMIT),
      future: [],
      scene: cloneScene(scene),
      selectedBone: null,
      loadedPresetName: meta?.name ?? null,
      loadedPresetIsDefault: meta?.isDefault ?? false,
      dirty: false,
    })),

  /**
   * Push the current scene onto the undo stack. Called at the *start* of a
   * gesture (pointer down, slider commit) rather than on every frame, so a
   * single drag is one undo step instead of hundreds.
   */
  commit: () =>
    set((state) => ({
      past: [...state.past, cloneScene(state.scene)].slice(-HISTORY_LIMIT),
      future: [],
    })),

  /* ------------------------------------------------------------- selection */

  setActiveFigure: (index) => set({ activeFigure: index, selectedBone: null }),
  selectBone: (bone) => set({ selectedBone: bone }),
  hoverBone: (bone) => set({ hoveredBone: bone }),

  /* ----------------------------------------------------------------- joints */

  setJointAngle: (bone, axis, degrees) =>
    set((state) =>
      updateFigure(state, (figure) => {
        let next = setJointAxis(figure, bone, axis, degrees);
        const twin = BONES[bone].mirror;
        if (state.symmetry && twin) {
          // Yaw and roll invert across the body's midline; pitch does not.
          const sign = axis === "x" ? 1 : -1;
          next = setJointAxis(next, twin, axis, degrees * sign);
        }
        return next;
      }),
    ),

  setJointAngles: (bone, value) =>
    set((state) =>
      updateFigure(state, (figure) => {
        let next = setJoint(figure, bone, value);
        const twin = BONES[bone].mirror;
        if (state.symmetry && twin) {
          next = setJoint(next, twin, [value[0], -value[1], -value[2]]);
        }
        return next;
      }),
    ),

  resetBone: (bone) => {
    get().commit();
    set((state) =>
      updateFigure(state, (figure) => {
        const joints = { ...figure.joints };
        delete joints[bone];
        const twin = BONES[bone].mirror;
        if (state.symmetry && twin) delete joints[twin];
        return { ...figure, joints };
      }),
    );
  },

  resetFigurePose: () => {
    get().commit();
    set((state) => updateFigure(state, (figure) => groundFigure({ ...figure, joints: {} })));
  },

  mirrorActiveFigure: () => {
    get().commit();
    set((state) => updateFigure(state, (figure) => groundFigure(mirrorFigure(figure))));
  },

  /* -------------------------------------------------------------- transform */

  setFigureTransform: (position, rotation) =>
    set((state) =>
      updateFigure(state, (figure) => ({
        ...figure,
        position: position ?? figure.position,
        rotation: rotation ?? figure.rotation,
      })),
    ),

  setFigureScale: (scale) =>
    set((state) => updateFigure(state, (figure) => ({ ...figure, scale }))),

  groundActiveFigure: () => {
    get().commit();
    set((state) => updateFigure(state, groundFigure));
  },

  /* --------------------------------------------------------------------- IK */

  dragIk: (effector, target) => {
    const chain = IK_BY_EFFECTOR[effector];
    if (!chain) return;
    set((state) => updateFigure(state, (figure) => solveTwoBoneIK(figure, chain, target)));
  },

  /* ------------------------------------------------------------------ modes */

  setGizmoMode: (gizmoMode) => set({ gizmoMode }),
  setControlMode: (controlMode) => set({ controlMode }),
  setMoveWholeFigure: (moveWholeFigure) => set({ moveWholeFigure }),

  toggleFigureFrozen: (index) => {
    get().commit(); // save undo state before changing
    set((state) => {
      const figures = state.scene.figures.map((f, i) => 
        i === index? {...f, frozen: !f.frozen} : f
      );

      //settle and resolve potential collisions
      const next = settle({...state.scene, figures}, state.activeFigure, state.collisionsEnabled);
      return {scene: next, dirty: true}
    })

  },

  toggle: (key) => set((state) => ({ [key]: !state[key] }) as Partial<EditorState>),
  setDragging: (isDragging) => set({ isDragging }),

  setCamera: (position, target) =>
    set((state) => ({ scene: { ...state.scene, camera: { position, target } } })),

  /* ---------------------------------------------------------------- history */

  undo: () =>
    set((state) => {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return {
        scene: previous,
        past: state.past.slice(0, -1),
        future: [cloneScene(state.scene), ...state.future].slice(0, HISTORY_LIMIT),
        dirty: true,
      };
    }),

  redo: () =>
    set((state) => {
      const next = state.future[0];
      if (!next) return state;
      return {
        scene: next,
        past: [...state.past, cloneScene(state.scene)].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
        dirty: true,
      };
    }),
}));

/** Convenience selector for the figure currently being edited. */
export const useActiveFigure = () =>
  useEditor((state) => state.scene.figures[state.activeFigure]);
