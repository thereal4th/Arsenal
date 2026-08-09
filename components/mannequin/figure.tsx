"use client";

import { memo, useMemo } from "react";
import { Quaternion, Vector3, type Group } from "three";
import { DEG } from "@/lib/utils";
import { getJoint, type FigurePose } from "@/lib/mannequin/pose";
import {
  BONES,
  CHILDREN,
  EULER_ORDER,
  type BoneId,
} from "@/lib/mannequin/skeleton";

/* -------------------------------------------------------------------------- */
/* Precomputed limb geometry                                                  */
/* -------------------------------------------------------------------------- */

const UP = new Vector3(0, 1, 0);

/**
 * Capsule geometry is authored along +Y, so each bone needs a fixed rotation
 * that swings +Y onto its own axis. Computed once at module load.
 */
const LIMB = Object.fromEntries(
  (Object.keys(BONES) as BoneId[]).map((id) => {
    const def = BONES[id];
    const axis = new Vector3(...def.axis).normalize();
    const quaternion = new Quaternion().setFromUnitVectors(UP, axis);
    const cylinder = Math.max(def.length - def.radius * 2, 0.02);
    return [
      id,
      {
        quaternion: quaternion.toArray() as [number, number, number, number],
        midpoint: axis.clone().multiplyScalar(def.length / 2).toArray() as [
          number,
          number,
          number,
        ],
        cylinder,
      },
    ];
  }),
) as Record<
  BoneId,
  { quaternion: [number, number, number, number]; midpoint: [number, number, number]; cylinder: number }
>;

/* -------------------------------------------------------------------------- */
/* Palette                                                                    */
/* -------------------------------------------------------------------------- */

export const ROLE_COLORS = {
  ally: { limb: "#9fb0c6", joint: "#e2e8f0", rim: "#22d3ee" },
  opponent: { limb: "#a8453f", joint: "#f0a8a4", rim: "#dc2626" },
} as const;

/* -------------------------------------------------------------------------- */
/* Bone node                                                                  */
/* -------------------------------------------------------------------------- */

export interface FigureInteraction {
  selectedBone: BoneId | null;
  hoveredBone: BoneId | null;
  onSelectBone?: (bone: BoneId) => void;
  onHoverBone?: (bone: BoneId | null) => void;
  /** Registers the live Object3D for each bone so gizmos can attach to it. */
  registerBone?: (bone: BoneId, object: Group | null) => void;
  showHandles: boolean;
}

interface BoneNodeProps extends FigureInteraction {
  bone: BoneId;
  figure: FigurePose;
  dimmed: boolean;
}

function BoneNode({
  bone,
  figure,
  dimmed,
  selectedBone,
  hoveredBone,
  onSelectBone,
  onHoverBone,
  registerBone,
  showHandles,
}: BoneNodeProps) {
  const def = BONES[bone];
  const limb = LIMB[bone];
  const joint = getJoint(figure, bone);
  const palette = ROLE_COLORS[figure.role];

  const isSelected = selectedBone === bone;
  const isHovered = hoveredBone === bone;

  return (
    <group
      ref={(node) => {
        registerBone?.(bone, node);
        return () => registerBone?.(bone, null);
      }}
      position={def.offset}
      rotation={[joint[0] * DEG, joint[1] * DEG, joint[2] * DEG, EULER_ORDER]}
    >
      {/* Limb */}
      <mesh
        quaternion={limb.quaternion}
        position={limb.midpoint}
        castShadow
        receiveShadow
        onClick={(event) => {
          event.stopPropagation();
          onSelectBone?.(bone);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          onHoverBone?.(bone);
        }}
        onPointerOut={() => onHoverBone?.(null)}
      >
        <capsuleGeometry args={[def.radius, limb.cylinder, 4, 14]} />
        <meshStandardMaterial
          key={dimmed ? "dimmed" : "opaque"}
          color={isSelected ? palette.rim : palette.limb}
          roughness={0.62}
          metalness={0.08}
          emissive={isSelected ? palette.rim : isHovered ? palette.limb : "#000000"}
          emissiveIntensity={isSelected ? 0.35 : isHovered ? 0.18 : 0}
          transparent={dimmed}
          opacity={dimmed ? 0.28 : 1}
        />
      </mesh>

      {/* Joint handle */}
      {showHandles && (
        <mesh
          onClick={(event) => {
            event.stopPropagation();
            onSelectBone?.(bone);
          }}
          onPointerOver={(event) => {
            event.stopPropagation();
            onHoverBone?.(bone);
          }}
          onPointerOut={() => onHoverBone?.(null)}
          scale={isSelected ? 1.5 : isHovered ? 1.25 : 1}
          renderOrder={2}
        >
          <sphereGeometry args={[0.026, 12, 12]} />
          <meshBasicMaterial
            color={isSelected ? "#ffffff" : isHovered ? palette.rim : palette.joint}
            transparent
            opacity={isSelected ? 1 : 0.75}
            depthTest={false}
          />
        </mesh>
      )}

      {CHILDREN[bone].map((child) => (
        <BoneNode
          key={child}
          bone={child}
          figure={figure}
          dimmed={dimmed}
          selectedBone={selectedBone}
          hoveredBone={hoveredBone}
          onSelectBone={onSelectBone}
          onHoverBone={onHoverBone}
          registerBone={registerBone}
          showHandles={showHandles}
        />
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Figure                                                                     */
/* -------------------------------------------------------------------------- */

interface FigureProps extends Partial<FigureInteraction> {
  figure: FigurePose;
  /** Fades the figure back when the other one is being edited. */
  dimmed?: boolean;
  /** Registers the root group so the translate gizmo can move the whole figure. */
  registerRoot?: (object: Group | null) => void;
}

export const Figure = memo(function Figure({
  figure,
  dimmed = false,
  selectedBone = null,
  hoveredBone = null,
  onSelectBone,
  onHoverBone,
  registerBone,
  registerRoot,
  showHandles = false,
}: FigureProps) {
  const rotation = useMemo(
    () =>
      [
        figure.rotation[0] * DEG,
        figure.rotation[1] * DEG,
        figure.rotation[2] * DEG,
        EULER_ORDER,
      ] as const,
    [figure.rotation],
  );

  return (
    <group
      ref={(node) => {
        registerRoot?.(node);
        return () => registerRoot?.(null);
      }}
      position={figure.position}
      rotation={rotation as unknown as [number, number, number]}
      scale={figure.scale || 1}
    >
      <BoneNode
        bone="hips"
        figure={figure}
        dimmed={dimmed}
        selectedBone={selectedBone}
        hoveredBone={hoveredBone}
        onSelectBone={onSelectBone}
        onHoverBone={onHoverBone}
        registerBone={registerBone}
        showHandles={showHandles}
      />
    </group>
  );
});
