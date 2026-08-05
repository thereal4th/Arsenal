"use client";

import { useState } from "react";
import { ChevronDown, FlipHorizontal2, Move3d, RotateCcw, Anchor } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge, SectionLabel } from "@/components/ui/surface";
import {
  BONES,
  GROUP_LABELS,
  GROUP_ORDER,
  type Axis,
  type BoneGroup,
  type BoneId,
} from "@/lib/mannequin/skeleton";
import { getJoint } from "@/lib/mannequin/pose";
import { useEditor } from "@/lib/mannequin/store";

const AXES: Axis[] = ["x", "y", "z"];

/* -------------------------------------------------------------------------- */

function GroupSection({
  group,
  bones,
  expanded,
  onToggle,
}: {
  group: BoneGroup;
  bones: BoneId[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const selectedBone = useEditor((s) => s.selectedBone);
  const selectBone = useEditor((s) => s.selectBone);
  const hoverBone = useEditor((s) => s.hoverBone);
  const figure = useEditor((s) => s.scene.figures[s.activeFigure]);

  const posedCount = bones.filter((b) => {
    const j = getJoint(figure, b);
    return j[0] !== 0 || j[1] !== 0 || j[2] !== 0;
  }).length;

  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={cn(
          "flex w-full items-center justify-between gap-2 px-3 py-2.5",
          "text-left transition-colors hover:bg-[var(--bg-elev-2)]",
        )}
      >
        <span className="flex items-center gap-2 text-[0.8125rem] font-medium text-[var(--fg)]">
          {GROUP_LABELS[group]}
          {posedCount > 0 && (
            <span className="font-mono text-[0.625rem] text-[var(--accent)]">
              {posedCount}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-[var(--fg-subtle)] transition-transform duration-200",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {expanded && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-3">
          {bones.map((bone) => (
            <button
              key={bone}
              type="button"
              onClick={() => selectBone(bone)}
              onMouseEnter={() => hoverBone(bone)}
              onMouseLeave={() => hoverBone(null)}
              className={cn(
                "rounded-[6px] border px-2 py-1 text-[0.6875rem] transition-colors duration-150",
                selectedBone === bone
                  ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--fg)]"
                  : "border-[var(--border)] bg-[var(--bg-inset)] text-[var(--fg-muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]",
              )}
            >
              {BONES[bone].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function SelectedJointControls() {
  const selectedBone = useEditor((s) => s.selectedBone);
  const controlMode = useEditor((s) => s.controlMode);
  const figure = useEditor((s) => s.scene.figures[s.activeFigure]);
  const setJointAngle = useEditor((s) => s.setJointAngle);
  const resetBone = useEditor((s) => s.resetBone);
  const commit = useEditor((s) => s.commit);

  if (!selectedBone) {
    return (
      <div className="px-3 py-6 text-center">
        <p className="text-[0.8125rem] text-[var(--fg-muted)]">
          Select a joint in the viewport or from the list above.
        </p>
        <p className="mt-1 text-xs text-[var(--fg-subtle)]">
          Or drag a cyan hand / foot marker to pose the whole limb at once.
        </p>
      </div>
    );
  }

  const def = BONES[selectedBone];
  const value = getJoint(figure, selectedBone);
  const axes = controlMode === "simple" ? def.primaryAxes : AXES;

  return (
    <div className="space-y-3 px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[0.8125rem] font-medium text-[var(--fg)]">{def.label}</p>
          <p className="font-mono text-[0.625rem] text-[var(--fg-subtle)]">
            {selectedBone}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => resetBone(selectedBone)}
          title="Reset this joint"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Reset
        </Button>
      </div>

      {/* One undo entry per gesture: checkpoint when the drag starts, not per frame. */}
      <div className="space-y-3" onPointerDown={commit}>
        {axes.map((axis) => {
          const index = axis === "x" ? 0 : axis === "y" ? 1 : 2;
          const [min, max] = def.limits[axis];
          return (
            <Slider
              key={axis}
              label={def.axisLabels[axis]}
              value={value[index]}
              min={min}
              max={max}
              onChange={(next) => setJointAngle(selectedBone, axis, next)}
            />
          );
        })}
      </div>

      {controlMode === "simple" && def.primaryAxes.length < 3 && (
        <p className="text-[0.6875rem] leading-snug text-[var(--fg-subtle)]">
          Switch to Advanced for the remaining {3 - def.primaryAxes.length} axis
          {3 - def.primaryAxes.length > 1 ? "es" : ""} on this joint.
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function FigureTransform() {
  const figure = useEditor((s) => s.scene.figures[s.activeFigure]);
  const setFigureTransform = useEditor((s) => s.setFigureTransform);
  const setFigureScale = useEditor((s) => s.setFigureScale);
  const groundActiveFigure = useEditor((s) => s.groundActiveFigure);
  const mirrorActiveFigure = useEditor((s) => s.mirrorActiveFigure);

  return (
    <div className="space-y-3 px-3 py-3">
      <Slider
        label="Slide left / right"
        value={figure.position[0]}
        min={-5}
        max={5}
        step={0.01}
        unit="m"
        onChange={(x) =>
          setFigureTransform([x, figure.position[1], figure.position[2]], undefined)
        }
      />
      <Slider
        label="Slide forward / back"
        value={figure.position[2]}
        min={-5}
        max={5}
        step={0.01}
        unit="m"
        onChange={(z) =>
          setFigureTransform([figure.position[0], figure.position[1], z], undefined)
        }
      />
      <Slider
        label="Rotate on the mat"
        value={figure.rotation[1]}
        min={-180}
        max={180}
        onChange={(y) =>
          setFigureTransform(undefined, [figure.rotation[0], y, figure.rotation[2]])
        }
      />
      <Slider
        label="Lean forward / back"
        value={figure.rotation[0]}
        min={-180}
        max={180}
        onChange={(x) =>
          setFigureTransform(undefined, [x, figure.rotation[1], figure.rotation[2]])
        }
      />
      <Slider
        label="Roll side to side"
        value={figure.rotation[2]}
        min={-180}
        max={180}
        onChange={(z) =>
          setFigureTransform(undefined, [figure.rotation[0], figure.rotation[1], z])
        }
      />
      <Slider
        label="Body size"
        value={figure.scale}
        min={0.7}
        max={1.4}
        step={0.01}
        unit="x"
        resetValue={1}
        onChange={setFigureScale}
      />

      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" className="flex-1" onClick={groundActiveFigure}>
          <Anchor className="size-3.5" aria-hidden />
          Drop to mat
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={mirrorActiveFigure}>
          <FlipHorizontal2 className="size-3.5" aria-hidden />
          Mirror
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function JointPanel() {
  const scene = useEditor((s) => s.scene);
  const activeFigure = useEditor((s) => s.activeFigure);
  const setActiveFigure = useEditor((s) => s.setActiveFigure);
  const controlMode = useEditor((s) => s.controlMode);
  const setControlMode = useEditor((s) => s.setControlMode);
  const symmetry = useEditor((s) => s.symmetry);
  const toggle = useEditor((s) => s.toggle);
  const moveWholeFigure = useEditor((s) => s.moveWholeFigure);
  const setMoveWholeFigure = useEditor((s) => s.setMoveWholeFigure);
  const resetFigurePose = useEditor((s) => s.resetFigurePose);

  const [expanded, setExpanded] = useState<BoneGroup | null>("core");

  const bonesByGroup = GROUP_ORDER.map((group) => ({
    group,
    bones: (Object.keys(BONES) as BoneId[]).filter((b) => BONES[b].group === group),
  }));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Figure switcher */}
      <div className="shrink-0 border-b border-[var(--border)] p-3">
        <SectionLabel className="mb-2">Editing</SectionLabel>
        <div
          role="tablist"
          aria-label="Select figure"
          className="grid grid-cols-2 gap-1 rounded-[8px] bg-[var(--bg-inset)] p-1"
        >
          {scene.figures.map((figure, index) => (
            <button
              key={figure.id}
              role="tab"
              aria-selected={activeFigure === index}
              onClick={() => setActiveFigure(index)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-[6px] px-2 py-1.5",
                "text-[0.8125rem] transition-colors duration-200",
                activeFigure === index
                  ? "bg-[var(--bg-elev-3)] text-[var(--fg)]"
                  : "text-[var(--fg-muted)] hover:text-[var(--fg)]",
              )}
            >
              <span
                className="size-2 rounded-full"
                style={{
                  backgroundColor: figure.role === "ally" ? "#9fb0c6" : "#a8453f",
                }}
                aria-hidden
              />
              {figure.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <div
            role="tablist"
            aria-label="Control detail"
            className="flex rounded-[6px] bg-[var(--bg-inset)] p-0.5"
          >
            {(["simple", "advanced"] as const).map((mode) => (
              <button
                key={mode}
                role="tab"
                aria-selected={controlMode === mode}
                onClick={() => setControlMode(mode)}
                className={cn(
                  "rounded-[4px] px-2 py-1 text-[0.6875rem] capitalize transition-colors",
                  controlMode === mode
                    ? "bg-[var(--bg-elev-3)] text-[var(--fg)]"
                    : "text-[var(--fg-subtle)] hover:text-[var(--fg)]",
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => toggle("symmetry")}
            aria-pressed={symmetry}
            title="Mirror joint edits to the opposite limb"
            className={cn(
              "rounded-[6px] border px-2 py-1 text-[0.6875rem] transition-colors",
              symmetry
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--fg-subtle)] hover:text-[var(--fg)]",
            )}
          >
            Symmetry
          </button>

          <button
            type="button"
            onClick={() => setMoveWholeFigure(!moveWholeFigure)}
            aria-pressed={moveWholeFigure}
            title="Move and rotate the whole figure"
            className={cn(
              "inline-flex items-center gap-1 rounded-[6px] border px-2 py-1 text-[0.6875rem] transition-colors",
              moveWholeFigure
                ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[#ff8080]"
                : "border-[var(--border)] text-[var(--fg-subtle)] hover:text-[var(--fg)]",
            )}
          >
            <Move3d className="size-3" aria-hidden />
            Whole body
          </button>
        </div>
      </div>

      {/* Scrolling body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-[var(--border)]">
          <div className="flex items-center justify-between px-3 pt-3">
            <SectionLabel>Joint</SectionLabel>
            <Badge tone="accent">{controlMode}</Badge>
          </div>
          <SelectedJointControls />
        </div>

        <div className="border-b border-[var(--border)]">
          <SectionLabel className="px-3 pt-3">Joints by region</SectionLabel>
          <div className="mt-1">
            {bonesByGroup.map(({ group, bones }) => (
              <GroupSection
                key={group}
                group={group}
                bones={bones}
                expanded={expanded === group}
                onToggle={() => setExpanded(expanded === group ? null : group)}
              />
            ))}
          </div>
        </div>

        <div>
          <SectionLabel className="px-3 pt-3">Figure placement</SectionLabel>
          <FigureTransform />
        </div>

        <div className="p-3">
          <Button
            variant="danger"
            size="sm"
            className="w-full"
            onClick={resetFigurePose}
          >
            Reset this figure to neutral
          </Button>
        </div>
      </div>
    </div>
  );
}
